/* =========================================================================
 * content.js — Upbit 페이지에서 엔진 + 어댑터 + UI를 연결
 * -------------------------------------------------------------------------
 * 핵심 흐름:
 *   1. chrome.storage.local에서 온보딩 페르소나/행동 상태/표시 옵션 로드
 *   2. 주문 가격·금액 입력 중에도 사전 평가 후 주문창 아래 배너 표시
 *   3. 사용자가 선택하면 팝업형 브레이크도 사용 가능(기본은 배너만)
 *   4. 기능 보기용 매수 버튼은 실제 주문 없이 로컬 상태에 commit 저장
 * ========================================================================= */

const STORE_KEY = 'mIrror.state.v1';
const PERSONA_KEY = 'mIrror.persona.v1';
const ONBOARDING_RESULT_KEY = 'mIrror.onboardingResult.v1';
const SURVEY_ANSWERS_KEY = 'mIrror.surveyAnswers.v1';
const VOLBASE_KEY = 'mIrror.volBaseline.v1';
const BREAK_POPUP_KEY = 'mIrror.breakPopupOptIn';
const LEGACY_COOLDOWN_KEY = 'mIrror.cooldownOptIn';
const LOCAL_EVENTS_KEY = 'mIrror.localTradeEvents.v1';

let engine = null;
let lastEval = null;
let lastIntentSide = 'buy';
let breakPopupOptIn = false; // false: 주문창 아래 배너만. true: 팝업형 재확인도 사용.
let cooldownOptIn = false;   // 구버전 호환용. 새 UI에서는 노출하지 않음.
let demoEngine = null;
let onboardedPersonaId = null;
let currentOnboardingResult = null;
let storageListenerBound = false;
let inlineTimer = null;
let inlineBusy = false;
let inlinePendingSide = null;
let storageReloadTimer = null;
let inlinePinned = null;

function makeInlineSignature() {
  const demo = readDemoInputs?.() || {};
  return [
    pageSymbol?.() || '',
    Math.round(Number(demo.priceKRW) || 0),
    Math.round(Number(demo.amount) || 0),
    lastIntentSide || 'buy',
  ].join('|');
}
function clearInlinePin() {
  inlinePinned = null;
}
function pinInlineBanner(trade, result, meta = {}) {
  inlinePinned = { trade, result, meta: { ...meta, pinned: true }, signature: makeInlineSignature() };
  renderInlineBanner(trade, result, inlinePinned.meta);
}
function isInlinePinStillCurrent() {
  return !!inlinePinned && inlinePinned.signature === makeInlineSignature();
}

const DEMO_PERSONA_ID = 'balanced_rebalancer';
const DEFAULT_PRICE_KRW = { BTC:100100000, ETH:5040000, SOL:248000, XRP:865, ADA:951, NEAR:10580, AVAX:58000, DOGE:210 };

// 시계: 평소엔 실시간. 디버그 패널이 오프셋을 더해 가상 시간으로 조작 가능.
let __clockOffsetMs = 0;
function nowFn() { return Date.now() + __clockOffsetMs; }

function storageGet(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}
function storageSet(obj) {
  return new Promise(resolve => chrome.storage.local.set(obj, resolve));
}
function storageRemove(keys) {
  return new Promise(resolve => chrome.storage.local.remove(keys, resolve));
}
function save(state) {
  return storageSet({ [STORE_KEY]: state });
}

async function load() {
  const data = await storageGet([
    STORE_KEY,
    PERSONA_KEY,
    ONBOARDING_RESULT_KEY,
    VOLBASE_KEY,
    BREAK_POPUP_KEY,
    LEGACY_COOLDOWN_KEY,
  ]);
  onboardedPersonaId = data[PERSONA_KEY] || null;
  currentOnboardingResult = data[ONBOARDING_RESULT_KEY] || null;
  breakPopupOptIn = !!data[BREAK_POPUP_KEY];
  cooldownOptIn = false; // 구버전 쿨다운은 더 이상 적용하지 않는다.
  return {
    state: data[STORE_KEY] || null,
    persona: onboardedPersonaId,
    onboardingResult: data[ONBOARDING_RESULT_KEY] || null,
    volBaseline: data[VOLBASE_KEY] || null,
  };
}

async function boot() {
  const loaded = await load();
  _volBaseline = loaded.volBaseline;

  injectCardRoot();
  injectUpbitDemoOrderButtons();
  injectInlineRoot();
  bindStorageListener();

  const effectivePersona = loaded.persona || DEMO_PERSONA_ID;
  engine = new MirrorEngine(loaded.state, effectivePersona, nowFn, { onboardingResult: loaded.onboardingResult });

  if (!loaded.persona && !sessionStorage.getItem('mIrror.onboardingHintShown')) {
    sessionStorage.setItem('mIrror.onboardingHintShown', '1');
    showToast('mIrror: 온보딩 전에는 기능 보기용 기본 기준선으로만 표시됩니다. 확장 아이콘에서 설문을 저장하면 즉시 반영됩니다.');
  }

  rehookButtons();
  exposeDebugHooks();
  scheduleInlineEvaluate('buy');

  UpbitAdapter.observe(() => {
    injectUpbitDemoOrderButtons();
    injectInlineRoot();
    rehookButtons();
  });
}

function bindStorageListener() {
  if (storageListenerBound || !chrome.storage?.onChanged) return;
  storageListenerBound = true;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    const keys = Object.keys(changes);
    const relevant = [STORE_KEY, PERSONA_KEY, ONBOARDING_RESULT_KEY, VOLBASE_KEY, BREAK_POPUP_KEY, LEGACY_COOLDOWN_KEY];
    if (!keys.some(k => relevant.includes(k))) return;
    clearTimeout(storageReloadTimer);
    storageReloadTimer = setTimeout(async () => {
      const loaded = await load();
      _volBaseline = loaded.volBaseline;
      const effectivePersona = loaded.persona || DEMO_PERSONA_ID;
      engine = new MirrorEngine(loaded.state, effectivePersona, nowFn, { onboardingResult: loaded.onboardingResult });
      demoEngine = null;
      rehookButtons();
      if (isInlinePinStillCurrent()) {
        renderInlineBanner(inlinePinned.trade, inlinePinned.result, inlinePinned.meta);
      } else {
        scheduleInlineEvaluate(lastIntentSide || 'buy');
      }
    }, 50);
  });
}

/* ----- 디버그 패널이 어댑터를 우회해 엔진을 구동할 수 있게 훅 노출 ----- */
function exposeDebugHooks() {
  window.__aimDebugHooks = {
    ready: true,
    getClock: () => nowFn(),
    advanceDays: (d) => { __clockOffsetMs += d * 24 * 60 * 60 * 1000; },
    injectTrade: (trade) => {
      const r = engine.evaluate(trade);
      lastEval = { trade, result: r };
      if (r.stage === 'silent') { hideCard(); }
      else { renderCard(r, { source: 'debug' }); }
      return r;
    },
    seedLastResult: (pct, hoursAgo) => {
      engine.state.lastResult = { pct, ts: nowFn() - hoursAgo * 3.6e6 };
      save(engine.state);
    },
    inspect: () => engine.inspect(),
    resetEngine: () => { clearInlinePin(); engine.reset(engine.state.personaId); save(engine.state); scheduleInlineEvaluate('buy'); },
    warmupRegime: (changePct, volumeRatio, count = 8) => {
      for (let i = 0; i < count; i++) {
        const t = { symbol: 'ETH', amount: engine.state.persona.amount.m, side: 'buy',
          intendedHoldDays: engine.state.persona.holdDays.m, changePct, volumeRatio, resultPct: null };
        const r = engine.evaluate(t);
        engine.commitTrade(t, r);
        __clockOffsetMs += 2 * 24 * 60 * 60 * 1000;
      }
      save(engine.state);
    },
  };
}

function rehookButtons() {
  if (!engine) return;
  UpbitAdapter.hookOrderButtons(side => {
    lastIntentSide = side;
    evaluateNow(side, { trigger: 'orderButton' });
  });
  if (typeof UpbitAdapter.hookOrderInputs === 'function') {
    UpbitAdapter.hookOrderInputs(() => {
      clearInlinePin();
      scheduleInlineEvaluate('buy');
    });
  }
}

async function buildTradeFromPage(side = 'buy') {
  const snap = UpbitAdapter.readOrderSnapshot ? UpbitAdapter.readOrderSnapshot(side) : {};
  const amount = Number(snap.amount || UpbitAdapter.readOrderAmount?.() || 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const symbol = snap.symbol || UpbitAdapter.readSymbol();
  const changePct = UpbitAdapter.readChangePct();
  const volumeRatio = UpbitAdapter.readVolumeRatio(getVolBaseline());
  const priceKRW = Number(snap.priceKRW || 0) || null;

  const trade = {
    symbol,
    amount,
    side,
    intendedHoldDays: null,
    changePct,
    volumeRatio,
    resultPct: null,
    priceKRW,
    quantity: snap.quantity || (priceKRW ? amount / priceKRW : null),
    orderType: snap.orderType || (priceKRW ? 'limit' : 'market'),
    _source: document.activeElement?.closest?.('.aim-demo-order-controls') ? 'demo_input' : 'upbit_order_form',
  };
  return enrichTradeWithAssetRisk(trade);
}

async function evaluateNow(side = 'buy', opts = {}) {
  if (!engine) return null;
  if (opts.trigger === 'input' && isInlinePinStillCurrent()) {
    renderInlineBanner(inlinePinned.trade, inlinePinned.result, inlinePinned.meta);
    return { trade: inlinePinned.trade, result: inlinePinned.result, pinned: true };
  }
  const trade = await buildTradeFromPage(side);
  if (!trade) {
    if (opts.trigger === 'input') renderInlineEmpty();
    return null;
  }
  const r = engine.evaluate(trade);
  lastEval = { trade, result: r, trigger: opts.trigger || 'manual' };

  renderInlineBanner(trade, r, { trigger: opts.trigger || 'manual' });
  if (opts.trigger === 'orderButton' && breakPopupOptIn && r.stage !== 'silent') {
    renderCard(r, { source: 'orderButton' });
  }
  return { trade, result: r };
}

function scheduleInlineEvaluate(side = 'buy') {
  inlinePendingSide = side;
  clearTimeout(inlineTimer);
  inlineTimer = setTimeout(async () => {
    if (inlineBusy) return;
    inlineBusy = true;
    try {
      await evaluateNow(inlinePendingSide || 'buy', { trigger: 'input' });
    } finally {
      inlineBusy = false;
    }
  }, 260);
}

/* ----- 거울 카드 UI ----- */
function injectCardRoot() {
  if (document.getElementById('mirrorRoot')) return;
  const root = document.createElement('div');
  root.id = 'mirrorRoot';
  document.body.appendChild(root);
}
function hideCard() {
  const root = document.getElementById('mirrorRoot');
  if (root) root.innerHTML = '';
}
function gaugeSVG(score) {
  const r = 32, c = 2 * Math.PI * r, p = score / 100;
  const col = score >= 75 ? '#CC8A45' : score >= 55 ? '#C9A24B' : '#6F8FA6';
  return `<svg viewBox="0 0 76 76" class="aim-gauge"><circle cx="38" cy="38" r="${r}" fill="none" stroke="#2F333C" stroke-width="6"/>
    <circle cx="38" cy="38" r="${r}" fill="none" stroke="${col}" stroke-width="6"
    stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" stroke-linecap="round"/></svg>`;
}
function renderCard(r, meta = {}) {
  const root = document.getElementById('mirrorRoot');
  if (r.observeOnly) {
    root.innerHTML = `<div class="aim-card">
      <div class="aim-stage">관찰 모드 · Observe</div>
      <div class="aim-desc">이 시장 상황(${escapeHtml(r.market.regime)})의 거래 데이터가 아직 적습니다. 초기값과 함께 보고 있어 비교 신뢰도가 낮아, 개입하지 않고 관찰만 합니다.</div>
      <button class="aim-btn ghost" id="aimOk">확인</button></div>`;
    document.getElementById('aimOk').onclick = hideCard;
    return;
  }
  const biasChips = r.biases.map(b => `<span class="aim-chip">${escapeHtml(b.name)}</span>`).join('');
  const reasons = r.reasons.map(x => `<li>${escapeHtml(x.text)}</li>`).join('');
  const isReflect = r.stage === 'reflect';
  root.innerHTML = `<div class="aim-card">
    <div class="aim-stage">${isReflect ? '1 / 2' : ''} Notice · Explain</div>
    <div class="aim-row">
      <div class="aim-gauge-wrap">${gaugeSVG(r.score)}<span class="aim-score">${r.score}</span></div>
      <div class="aim-desc">평소의 나와의 거리. 신뢰도 ${r.confidence}.<br>0에 가까울수록 평소와 비슷합니다.</div>
    </div>
    <ul class="aim-ev">${reasons}</ul>
    ${biasChips ? `<div class="aim-chips">${biasChips}</div>` : ''}
    ${isReflect
      ? `<button class="aim-btn ghost" id="aimNext">근거 확인 — 다음</button>`
      : `<button class="aim-btn ghost" id="aimOk">확인하고 저장</button>`}
    <div class="aim-note">이 팝업은 옵션에서 켠 경우에만 뜹니다. 끄면 주문창 아래 경고 배너만 표시됩니다.</div>
  </div>`;
  if (isReflect) document.getElementById('aimNext').onclick = () => renderReflect(meta);
  else document.getElementById('aimOk').onclick = () => commit('notice_ack');
}
function renderReflect(meta = {}) {
  const root = document.getElementById('mirrorRoot');
  const r = lastEval.result;
  const opts = ['사전에 계획했던 진입/청산', '새로운 정보·분석에 근거', '시장 분위기 따라 즉흥 판단', '직전 손실을 만회하고 싶어서', '잘 모르겠음 — 이미 결정함'];
  root.innerHTML = `<div class="aim-card">
    <div class="aim-stage">2 / 2 · Reflect</div>
    <div class="aim-desc">${r.biases.length
      ? `위 데이터는 ${escapeHtml(r.biases.map(b => b.name.replace(' 가능성', '')).join(', '))}와 닮은 과거 패턴입니다. 사실인지는 본인만 압니다.`
      : '이번 거래는 평소 분포와 꽤 다른 조건입니다.'}</div>
    <div class="aim-desc" style="margin-top:8px">이 거래를 하려는 이유에 가장 가까운 것을 골라주세요.</div>
    <div class="aim-ro">${opts.map((o, i) => `<button data-i="${i}">${escapeHtml(o)}</button>`).join('')}</div>
    ${cooldownOptIn && r.score >= 80
      ? `<div class="aim-cd" id="aimCd">10</div><button class="aim-btn primary" id="aimDone" disabled>잠시 후 저장</button>`
      : `<button class="aim-btn primary" id="aimDone" disabled>확인하고 저장</button>`}
    <div class="aim-note">저장은 로컬 기능 검증용입니다. 실제 Upbit 주문을 대신 누르지 않습니다.</div>
  </div>`;
  let chosen = null;
  root.querySelectorAll('.aim-ro button').forEach(b => b.onclick = () => {
    root.querySelectorAll('.aim-ro button').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel'); chosen = b.textContent;
    if (!cooldownOptIn || r.score < 80) document.getElementById('aimDone').disabled = false;
  });
  if (cooldownOptIn && r.score >= 80) {
    let s = 10; const cd = document.getElementById('aimCd'), done = document.getElementById('aimDone');
    const t = setInterval(() => { s--; if (cd) cd.textContent = s;
      if (s <= 0) { clearInterval(t); done.disabled = false; done.textContent = '확인하고 저장'; } }, 1000);
  }
  document.getElementById('aimDone').onclick = () => commit(chosen || meta.source || 'reflect_ack');
}

async function commit(reason) {
  hideCard();
  if (!engine || !lastEval) return;
  const newState = engine.commitTrade(lastEval.trade, lastEval.result);
  await save(newState);
  await appendTradeEvent(lastEval.trade, lastEval.result, { kind: 'confirm_card', reason });
  updateVolBaseline(lastEval.trade.volumeRatio);
  renderInlineBanner(lastEval.trade, lastEval.result, { saved: true });
}

/* ----- 주문창 아래 사전 경고 배너 ----- */
function injectInlineRoot() {
  let root = document.getElementById('mirrorInlineRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'mirrorInlineRoot';
    root.dataset.mirrorInlineRoot = '1';
  }

  const panel = UpbitAdapter.findOrderPanel?.();
  const demoControls = document.querySelector('.aim-demo-order-controls');
  if (panel && root.parentElement !== panel) {
    panel.appendChild(root);
  } else if (!panel && demoControls && root.parentElement !== demoControls.parentElement) {
    demoControls.parentElement.appendChild(root);
  } else if (!root.parentElement) {
    document.body.appendChild(root);
  }
}
function renderInlineEmpty() {
  if (isInlinePinStillCurrent()) {
    renderInlineBanner(inlinePinned.trade, inlinePinned.result, inlinePinned.meta);
    return;
  }
  const root = document.getElementById('mirrorInlineRoot');
  if (root) root.innerHTML = '';
}
function renderInlineBanner(trade, result, meta = {}) {
  injectInlineRoot();
  const root = document.getElementById('mirrorInlineRoot');
  if (!root) return;
  if (!meta.pinned && isInlinePinStillCurrent()) {
    renderInlineBanner(inlinePinned.trade, inlinePinned.result, inlinePinned.meta);
    return;
  }
  const upbitBadges = upbitBadgeSummaryKo(trade.assetRisk);
  const shouldShow = result.stage !== 'silent' || !!upbitBadges || meta.saved || meta.pinned;
  if (!shouldShow) {
    root.innerHTML = '';
    return;
  }

  const tone = result.stage === 'reflect' ? 'danger' : result.stage === 'notice' ? 'warn' : 'info';
  const priceText = trade.priceKRW ? ` · 매수가 ${fmtKrw(trade.priceKRW)}` : '';
  const badgeLine = upbitBadges ? `<div class="aim-inline-row"><span>업비트 딱지</span><b>${escapeHtml(upbitBadges)}</b></div>` : '';
  const reasons = evidenceItems(trade, result).slice(0, 4).map(x => `<li>${escapeHtml(x)}</li>`).join('');
  const savedLine = meta.pinned
    ? `<div class="aim-inline-saved">${meta.saved ? '방금 입력값을 로컬 행동 버퍼와 이벤트 로그에 저장했습니다. ' : ''}버튼 클릭 결과입니다. 매수가나 금액을 바꾸거나 닫기 전까지 이 배너를 유지합니다.</div>`
    : meta.saved
      ? `<div class="aim-inline-saved">방금 입력값을 로컬 행동 버퍼와 이벤트 로그에 저장했습니다.</div>`
      : '';
  const popupAction = breakPopupOptIn && result.stage !== 'silent'
    ? `<button type="button" class="aim-inline-action" id="mirrorInlineOpenPopup">팝업으로 근거 보기</button>`
    : `<span class="aim-inline-mode">경고 배너만 표시 중</span>`;
  const closeAction = meta.pinned ? `<button type="button" class="aim-inline-action" id="mirrorInlineClear">닫기</button>` : '';
  const action = `${popupAction}${closeAction}`;

  root.innerHTML = `<div class="aim-inline-banner ${tone}">
    <div class="aim-inline-head">
      <strong>mIrror 사전 경고</strong>
      <span>${stageKo(result.stage)} · 점수 ${result.score}</span>
    </div>
    <div class="aim-inline-row"><span>입력 주문</span><b>${escapeHtml(trade.symbol)} 매수 · ${fmtKrw(trade.amount)}${priceText}</b></div>
    <div class="aim-inline-row"><span>시장</span><b>24h ${trade.changePct > 0 ? '+' : ''}${Number(trade.changePct).toFixed(1)}% · 거래량 ${Number(trade.volumeRatio).toFixed(1)}x</b></div>
    ${badgeLine}
    <ul class="aim-inline-reasons">${reasons}</ul>
    ${savedLine}
    <div class="aim-inline-foot">${action}</div>
  </div>`;

  const open = document.getElementById('mirrorInlineOpenPopup');
  if (open) open.onclick = () => {
    lastEval = { trade, result, trigger: 'inlinePopup' };
    renderCard(result, { source: 'inlinePopup' });
  };
  const clear = document.getElementById('mirrorInlineClear');
  if (clear) clear.onclick = () => {
    clearInlinePin();
    root.innerHTML = '';
  };
}

/* ----- 거래량 기준선(EWMA), 로컬 보관 ----- */
let _volBaseline = null;
function getVolBaseline() { return _volBaseline; }
function updateVolBaseline() {
  const el = document.querySelector('[class*="acc_trade_volume"], [class*="trade_volume"], [class*="volume"]');
  const m = el ? el.textContent.replace(/,/g, '').match(/[\d.]+/) : null;
  const vol = m ? parseFloat(m[0]) : null;
  if (vol == null) return;
  _volBaseline = _volBaseline == null ? vol : _volBaseline * 0.9 + vol * 0.1;
  chrome.storage.local.set({ [VOLBASE_KEY]: _volBaseline });
}

/* ----- Upbit 헤더 기능 보기용 버튼 + 가격/금액 입력 ----- */
function isExchangePage() {
  return /\/exchange/i.test(location.pathname) || /CRIX\.UPBIT\./i.test(location.search);
}
function findDemoButtonSlot() {
  const exact = document.querySelector('.css-krb64w');
  if (exact) return exact;
  const candidates = Array.from(document.querySelectorAll('div')).filter(el => {
    const text = (el.textContent || '').replace(/\s+/g, '');
    const links = el.querySelectorAll('a,button').length;
    const rect = el.getBoundingClientRect();
    return text.includes('회원가입') && text.includes('로그인') && links <= 6 && rect.width > 80;
  });
  return candidates[0] || null;
}
function injectUpbitDemoOrderButtons() {
  if (!isExchangePage()) return;
  const slot = findDemoButtonSlot();
  if (!slot || slot.querySelector('[data-mirror-demo-controls="1"]')) return;

  const wrap = document.createElement('div');
  wrap.className = 'aim-demo-order-controls';
  wrap.dataset.mirrorDemoControls = '1';
  wrap.innerHTML = `
    <label class="aim-demo-field"><span>매수가</span><input id="mirrorDemoPrice" inputmode="numeric" autocomplete="off"></label>
    <label class="aim-demo-field"><span>금액</span><input id="mirrorDemoAmount" inputmode="numeric" autocomplete="off"></label>
    <div>
    <button type="button" class="aim-demo-buy" data-aim-demo-buy="normal">매수</button>
    <button type="button" class="aim-demo-buy warn" data-aim-demo-buy="warning">매수(경고)</button>
    </div>
  `;

  Array.from(slot.children).forEach(child => {
    if (child.dataset && child.dataset.mirrorDemoControls) return;
    child.dataset.mirrorHiddenByDemo = '1';
    child.style.display = 'none';
  });
  slot.prepend(wrap);
  slot.classList.add('aim-demo-slot');

  applyDemoDefaults();
  wrap.querySelector('[data-aim-demo-buy="normal"]').addEventListener('click', onDemoNormalBuy, true);
  wrap.querySelector('[data-aim-demo-buy="warning"]').addEventListener('click', onDemoWarningBuy, true);
  ['mirrorDemoPrice', 'mirrorDemoAmount'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => { clearInlinePin(); scheduleInlineEvaluate('buy'); }, true);
    el.addEventListener('change', () => { clearInlinePin(); scheduleInlineEvaluate('buy'); }, true);
  });
}
function applyDemoDefaults() {
  const symbol = pageSymbol();
  const priceInput = document.getElementById('mirrorDemoPrice');
  const amountInput = document.getElementById('mirrorDemoAmount');
  const price = UpbitAdapter.readCurrentPrice?.() || DEFAULT_PRICE_KRW[symbol] || 100000;
  const baseAmount = engine?.state?.persona?.amount?.m || PERSONA_PRIORS?.[DEMO_PERSONA_ID]?.amount?.m || 480000;
  if (priceInput && !priceInput.value) priceInput.value = Math.round(price).toLocaleString('ko-KR');
  if (amountInput && !amountInput.value) amountInput.value = Math.round(baseAmount).toLocaleString('ko-KR');
}
function stopDemoEvent(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.stopImmediatePropagation) e.stopImmediatePropagation();
}
async function onDemoNormalBuy(e) {
  stopDemoEvent(e);
  const trade = await buildDemoTradeWithRisk('normal');
  const result = getActiveEngineForDemo().evaluate(trade);
  clearInlinePin();
  await commitDemoTrade(trade, result, { kind: 'demo_normal_buy' });
  renderDemoNormalNotice(trade, result, true);
  pinInlineBanner(trade, result, { saved: true });
}
async function onDemoWarningBuy(e) {
  stopDemoEvent(e);
  const trade = await buildDemoTradeWithRisk('warning');
  const result = getActiveEngineForDemo().evaluate(trade);
  lastEval = { trade, result, trigger: 'demo_warning_buy' };
  clearInlinePin();
  pinInlineBanner(trade, result, { trigger: 'demo_warning_buy' });

  if (breakPopupOptIn) {
    renderDemoWarningModal(trade, result);
    return;
  }
  await commitDemoTrade(trade, result, { kind: 'demo_warning_buy', reason: 'warning_banner_only' });
  pinInlineBanner(trade, result, { saved: true });
  showToast('mIrror: 데모 매수 입력값을 저장했습니다. 팝업 브레이크 없이 배너만 표시하는 모드입니다.');
}
function getActiveEngineForDemo() {
  if (engine) return engine;
  return getDemoEngine();
}
function getDemoEngine() {
  if (demoEngine) return demoEngine;
  const personaId = engine?.state?.personaId || localStorage.getItem('mIrror.lastDemoPersona') || DEMO_PERSONA_ID;
  demoEngine = new MirrorEngine(null, personaId, nowFn, { onboardingResult: currentOnboardingResult });
  return demoEngine;
}
function pageSymbol() {
  const fromAdapter = UpbitAdapter.readSymbol && UpbitAdapter.readSymbol();
  if (fromAdapter && fromAdapter !== 'UNKNOWN' && fromAdapter !== 'EXCHANGE') return fromAdapter;
  const code = new URLSearchParams(location.search).get('code') || '';
  const m = code.match(/KRW[-.]?([A-Z0-9]+)/i);
  return m ? m[1].toUpperCase() : 'BTC';
}
function demoScenario() {
  const list = globalThis.MIRROR_DEMO_SEED_USER_A?.demoTriggerScenarios || [];
  return list.find(s => s.scenarioId === 'S001_current_fomo') || list[0] || null;
}
async function buildDemoTradeWithRisk(mode) {
  const trade = buildDemoTrade(mode);
  return enrichTradeWithAssetRisk(trade);
}
async function enrichTradeWithAssetRisk(trade) {
  const provider = globalThis.UpbitRiskProvider;
  if (!provider || typeof provider.getRiskForSymbol !== 'function') return trade;
  try {
    trade.assetRisk = await provider.getRiskForSymbol(trade.symbol, {
      changePct: Number(trade.changePct) || 0,
      volumeRatio: Number(trade.volumeRatio) || 1,
    });
  } catch (err) {
    trade.assetRisk = null;
  }
  return trade;
}
function readDemoInputs() {
  const price = parseKRWInput(document.getElementById('mirrorDemoPrice')?.value);
  const amount = parseKRWInput(document.getElementById('mirrorDemoAmount')?.value);
  return { priceKRW: price, amount };
}
function parseKRWInput(v) {
  const n = Number(String(v || '').replace(/,/g, '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}
function buildDemoTrade(mode) {
  const scenario = demoScenario();
  const currentOrder = scenario?.currentOrder || {};
  const marketSnapshot = scenario?.marketSnapshot || {};
  const demo = readDemoInputs();
  const realAmount = UpbitAdapter.readOrderAmount ? UpbitAdapter.readOrderAmount() : null;
  const realChange = UpbitAdapter.readChangePct ? UpbitAdapter.readChangePct() : 0;
  const realVolume = UpbitAdapter.readVolumeRatio ? UpbitAdapter.readVolumeRatio(getVolBaseline()) : 1;
  const symbol = pageSymbol() || _demoCoin(currentOrder.coin);
  const priceKRW = demo.priceKRW || UpbitAdapter.readCurrentPrice?.() || DEFAULT_PRICE_KRW[symbol] || null;

  if (mode === 'normal') {
    const baseAmount = getActiveEngineForDemo().state?.persona?.amount?.m || 480000;
    const amount = demo.amount || realAmount || Math.round(baseAmount);
    return {
      symbol,
      amount,
      side: 'buy',
      intendedHoldDays: null,
      changePct: Number.isFinite(realChange) && Math.abs(realChange) > 0.1 ? realChange : 0.4,
      volumeRatio: Number.isFinite(realVolume) && realVolume > 0.1 ? realVolume : 1.1,
      resultPct: null,
      priceKRW,
      quantity: priceKRW ? amount / priceKRW : null,
      orderType: priceKRW ? 'limit' : 'market',
      _demoMode: 'normal',
      _source: demo.amount || demo.priceKRW ? 'demo_input' : (realAmount ? 'current_form' : 'persona_baseline'),
    };
  }

  const amount = demo.amount || realAmount || Number(currentOrder.orderAmountKRW || 1200000);
  return {
    symbol,
    amount,
    side: 'buy',
    intendedHoldDays: null,
    changePct: Number.isFinite(realChange) && Math.abs(realChange) >= 3 ? realChange : Number(marketSnapshot.shortTermChangeRatePct || 8.2),
    volumeRatio: Number.isFinite(realVolume) && realVolume >= 2 ? realVolume : Math.max(1, 1 + Number(marketSnapshot.volumeChangeRatePct || 240) / 100),
    resultPct: null,
    priceKRW,
    quantity: priceKRW ? amount / priceKRW : null,
    orderType: priceKRW ? 'limit' : 'market',
    _demoMode: 'warning',
    _source: demo.amount || demo.priceKRW ? 'demo_input_plus_warning_market' : (realAmount ? 'current_form_plus_demo_market' : 'demo_seed_user_a'),
    _scenarioTitle: scenario?.title || 'FOMO 가능성: 급등 중 대량 매수',
  };
}
function _demoCoin(coin) {
  return String(coin || 'KRW-BTC').replace(/^KRW-?/i, '').replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'BTC';
}

async function commitDemoTrade(trade, result, meta = {}) {
  const target = getActiveEngineForDemo();
  target.commitTrade(trade, result);
  engine = target;
  await save(target.state);
  await appendTradeEvent(trade, result, meta);
  updateVolBaseline(trade.volumeRatio);
}
async function appendTradeEvent(trade, result, meta = {}) {
  const data = await storageGet([LOCAL_EVENTS_KEY]);
  const prev = Array.isArray(data[LOCAL_EVENTS_KEY]) ? data[LOCAL_EVENTS_KEY] : [];
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: nowFn(),
    kind: meta.kind || 'local_commit',
    reason: meta.reason || null,
    personaId: engine?.state?.personaId || DEMO_PERSONA_ID,
    onboarded: !!onboardedPersonaId,
    trade: {
      symbol: trade.symbol,
      side: trade.side,
      amount: Math.round(Number(trade.amount) || 0),
      priceKRW: trade.priceKRW ? Math.round(Number(trade.priceKRW)) : null,
      quantity: trade.quantity || null,
      orderType: trade.orderType || null,
      changePct: Number(trade.changePct) || 0,
      volumeRatio: Number(trade.volumeRatio) || 1,
      source: trade._source || null,
    },
    result: {
      score: result.score,
      stage: result.stage,
      confidence: result.confidence,
      regime: result.market?.regime,
      biases: (result.biases || []).map(b => b.name),
      upbitBadges: upbitBadgeSummaryKo(trade.assetRisk),
    },
  };
  await storageSet({ [LOCAL_EVENTS_KEY]: [event, ...prev].slice(0, 30) });
}

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}
function fmtKrw(n) {
  return Math.round(Number(n) || 0).toLocaleString('ko-KR') + '원';
}
function sourceKo(source) {
  if (source === 'demo_input') return '데모 가격/금액 입력값';
  if (source === 'demo_input_plus_warning_market') return '데모 가격/금액 + 경고 시장상황';
  if (source === 'current_form') return '현재 주문 입력값';
  if (source === 'current_form_plus_demo_market') return '현재 주문 금액 + 데모 시장상황';
  if (source === 'persona_baseline') return '페르소나 기준선 데모값';
  if (source === 'upbit_order_form') return 'Upbit 주문창 입력값';
  return '데모 seed 시나리오';
}
function stageKo(stage) {
  if (stage === 'reflect') return '한 번 더 생각하기';
  if (stage === 'notice') return '주의 알림';
  if (stage === 'observe') return '관찰 모드';
  return '추가 알림 없음';
}
function evidenceItems(trade, result) {
  const out = [];
  (trade.assetRisk?.reasons || []).forEach(x => out.push(x));
  (result.reasons || []).forEach(r => out.push(r.text));
  (result.biases || []).forEach(b => out.push(b.evidence || b.name));
  if (!out.length) out.push('이번 주문은 현재 기준선과 크게 다르지 않습니다. 실제 주문은 발생하지 않습니다.');
  return Array.from(new Set(out)).slice(0, 7);
}
function upbitBadgeSummaryKo(risk) {
  if (globalThis.UpbitRiskProvider?.officialSummaryKo) return globalThis.UpbitRiskProvider.officialSummaryKo(risk);
  const labels = risk?.official?.badgeLabelsKo || risk?.official?.badges?.map(b => b.labelKo) || [];
  if (labels.length) return labels.filter(Boolean).join(', ');
  if (risk?.official?.investmentWarning) return '유의 종목';
  if (risk?.official?.cautionLabelsKo?.length) return risk.official.cautionLabelsKo.join(', ');
  return '';
}

function renderDemoNormalNotice(trade, result, saved = false) {
  const root = document.getElementById('mirrorRoot');
  const upbitBadges = upbitBadgeSummaryKo(trade.assetRisk);
  const upbitBadgeSentence = upbitBadges ? ` 업비트 딱지는 <b>${escapeHtml(upbitBadges)}</b>입니다.` : '';
  const priceSentence = trade.priceKRW ? ` 지정가 ${fmtKrw(trade.priceKRW)} 기준입니다.` : '';
  root.innerHTML = `<div class="aim-card aim-demo-card">
    <div class="aim-stage">Demo Buy</div>
    <div class="aim-demo-title">기능 보기용 매수 버튼입니다.</div>
    <div class="aim-desc">실제 Upbit 주문은 전송하지 않았습니다. 현재 스냅샷은 ${escapeHtml(trade.symbol)} · ${fmtKrw(trade.amount)} 매수이며, 판정은 <b>${stageKo(result.stage)}</b>입니다.${priceSentence}${upbitBadgeSentence} 데이터 출처는 <b>${sourceKo(trade._source)}</b>입니다.</div>
    ${saved ? '<div class="aim-inline-saved">입력값이 로컬 행동 버퍼와 이벤트 로그에 저장되었습니다.</div>' : ''}
    <button class="aim-btn ghost" id="aimDemoClose">확인</button>
    <div class="aim-note">진짜 거래 버튼을 대신 누르지 않으며, API 키·세션·주문 원장도 읽지 않습니다.</div>
  </div>`;
  document.getElementById('aimDemoClose').onclick = hideCard;
}
function renderDemoWarningModal(trade, result) {
  const root = document.getElementById('mirrorRoot');
  const items = evidenceItems(trade, result).map(x => `<li>${escapeHtml(x)}</li>`).join('');
  const bias = (result.biases || []).map(b => b.name).join(', ') || '평소와 다른 주문 가능성';
  const upbitBadges = upbitBadgeSummaryKo(trade.assetRisk);
  const upbitBadgeRow = upbitBadges ? `<div><span>업비트 딱지</span><b>${escapeHtml(upbitBadges)}</b></div>` : '';
  const priceRow = trade.priceKRW ? `<div><span>매수가</span><b>${fmtKrw(trade.priceKRW)}</b></div>` : '';
  const basisTitle = upbitBadges ? '실제 근거 · 업비트 딱지 + 페르소나 기준선' : '실제 근거 · 시장상황 + 페르소나 기준선';
  root.innerHTML = `<div class="aim-demo-modal-backdrop" role="presentation">
    <section class="aim-demo-modal" role="dialog" aria-modal="true" aria-labelledby="aimDemoTitle">
      <div class="aim-demo-modal-head">
        <div><div class="aim-stage">mIrror · 기능 보기</div><h2 id="aimDemoTitle">매수 전 근거 확인</h2></div>
        <button type="button" class="aim-demo-x" id="aimDemoX" aria-label="닫기">×</button>
      </div>
      <div class="aim-demo-summary">
        <div><span>주문</span><b>${escapeHtml(trade.symbol)} 매수 · ${fmtKrw(trade.amount)}</b></div>
        ${priceRow}
        <div><span>시장</span><b>24h ${trade.changePct > 0 ? '+' : ''}${Number(trade.changePct).toFixed(1)}% · 거래량 ${Number(trade.volumeRatio).toFixed(1)}x</b></div>
        ${upbitBadgeRow}
        <div><span>판정</span><b>${stageKo(result.stage)} · ${escapeHtml(bias)}</b></div>
        <div><span>데이터</span><b>${sourceKo(trade._source)}</b></div>
      </div>
      <div class="aim-demo-section"><h3>${basisTitle}</h3><ul class="aim-ev aim-demo-evidence">${items}</ul></div>
      <div class="aim-demo-section">
        <h3>한 번 더 생각하기</h3>
        <p class="aim-desc">이 매수를 하려는 가장 가까운 이유를 고른 뒤, 근거 확인 체크를 해야 다음 버튼이 활성화됩니다.</p>
        <div class="aim-ro aim-demo-reasons" id="aimDemoReasons">
          <button type="button">사전에 정한 계획에 따른 매수입니다.</button>
          <button type="button">새로운 정보나 분석 근거가 있습니다.</button>
          <button type="button">가격이 더 오를까 봐 놓치기 싫었습니다.</button>
          <button type="button">최근 손실을 만회하고 싶었습니다.</button>
        </div>
        <label class="aim-demo-check"><input type="checkbox" id="aimDemoChecked"> 위 근거를 확인했고, 충동 주문이 아닌지 다시 생각했습니다.</label>
      </div>
      <div class="aim-demo-actions">
        <button type="button" class="aim-btn ghost" id="aimDemoCancel">취소</button>
        <button type="button" class="aim-btn primary" id="aimDemoProceed" disabled>그래도 매수 진행 · 데모 저장</button>
      </div>
      <div class="aim-note">이 창은 옵션에서 팝업 브레이크를 켰을 때만 뜹니다. 버튼을 눌러도 실제 주문, 자동 클릭, 외부 전송은 발생하지 않습니다.</div>
    </section>
  </div>`;

  let selectedReason = '';
  const checkbox = document.getElementById('aimDemoChecked');
  const proceed = document.getElementById('aimDemoProceed');
  const refresh = () => { proceed.disabled = !(selectedReason && checkbox.checked); };
  root.querySelectorAll('#aimDemoReasons button').forEach(btn => {
    btn.onclick = () => {
      root.querySelectorAll('#aimDemoReasons button').forEach(x => x.classList.remove('sel'));
      btn.classList.add('sel');
      selectedReason = btn.textContent;
      refresh();
    };
  });
  checkbox.onchange = refresh;
  document.getElementById('aimDemoX').onclick = hideCard;
  document.getElementById('aimDemoCancel').onclick = hideCard;
  proceed.onclick = async () => {
    await commitDemoTrade(trade, result, { kind: 'demo_warning_buy', reason: selectedReason });
    root.innerHTML = `<div class="aim-card aim-demo-card">
      <div class="aim-stage">Demo Saved</div>
      <div class="aim-demo-title">데모 매수 입력값을 저장했습니다.</div>
      <div class="aim-desc">실제 주문은 전송하지 않았습니다. 구현 확인용으로만 “근거 확인 → 한 번 더 생각하기 → 로컬 저장” 단계를 수행했습니다.</div>
      <button class="aim-btn ghost" id="aimDemoDoneClose">닫기</button>
    </div>`;
    pinInlineBanner(trade, result, { saved: true });
    document.getElementById('aimDemoDoneClose').onclick = hideCard;
  };
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'aim-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 6000);
}

boot();
