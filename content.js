/* =========================================================================
 * content.js — Upbit 페이지에서 엔진 + 어댑터 + UI를 연결
 * -------------------------------------------------------------------------
 * 흐름:
 *   1. chrome.storage.local 에서 상태/페르소나 로드 (없으면 온보딩 안내)
 *   2. 주문 버튼에 비강제 후킹 → 사용자가 매수/매도에 포커스하면
 *      현재 폼 스냅샷 + 화면 시세로 evaluate()
 *   3. 점수/단계에 따라 거울 카드 렌더 (silent면 아무것도 안 띄움)
 *   4. 사용자가 실제로 거래를 확정하면 commitTrade() 후 저장
 *
 * 거래 확정 시점은 Upbit 자체 동작이라 직접 알기 어렵다 → MVP는
 * "거울에서 진행 클릭"을 확정 신호로 쓰고, 추후 주문 성공 토스트/네트워크
 * 신호를 어댑터에서 감지하도록 확장.
 * ========================================================================= */

const STORE_KEY = 'aiMirror.state.v1';
const PERSONA_KEY = 'aiMirror.persona.v1';
const VOLBASE_KEY = 'aiMirror.volBaseline.v1';

let engine = null;
let lastEval = null;
let lastIntentSide = 'buy';
let cooldownOptIn = false; // 사용자가 설정에서 스스로 켜는 셀프 쿨다운(기본 off)

// 시계: 평소엔 실시간. 디버그 패널이 오프셋을 더해 가상 시간으로 조작 가능.
let __clockOffsetMs = 0;
function nowFn() { return Date.now() + __clockOffsetMs; }

function load() {
  return new Promise(res => {
    chrome.storage.local.get([STORE_KEY, PERSONA_KEY, VOLBASE_KEY, 'aiMirror.cooldownOptIn'], data => {
      const persona = data[PERSONA_KEY] || null;
      const state = data[STORE_KEY] || null;
      cooldownOptIn = !!data['aiMirror.cooldownOptIn'];
      res({ state, persona, volBaseline: data[VOLBASE_KEY] || null });
    });
  });
}
function save(state) {
  chrome.storage.local.set({ [STORE_KEY]: state });
}

async function boot() {
  let { state, persona, volBaseline } = await load();
  _volBaseline = volBaseline;
  const debugOn =
    new URLSearchParams(location.search).get('aimDebug') === '1' ||
    localStorage.getItem('aimDebug') === '1';

  if (!persona) {
    if (debugOn) {
      persona = 'balanced_rebalancer'; // 디버그 시 온보딩 없이 기본 페르소나로 진행
    } else {
      // 온보딩(12문항)을 아직 안 했으면 팝업으로 유도하고 조용히 종료
      showToast('AI Mirror: 처음이시군요. 확장 아이콘을 눌러 12문항 온보딩을 마치면 시작됩니다.');
      return;
    }
  }
  engine = new MirrorEngine(state, persona, nowFn);

  injectCardRoot();
  rehookButtons();
  UpbitAdapter.observe(rehookButtons);

  exposeDebugHooks(); // 디버그가 꺼져 있어도 훅만 노출(패널이 없으면 무영향)
}

/* ----- 디버그 패널이 어댑터를 우회해 엔진을 구동할 수 있게 훅 노출 ----- */
function exposeDebugHooks() {
  window.__aimDebugHooks = {
    ready: true,
    getClock: () => nowFn(),
    advanceDays: (d) => { __clockOffsetMs += d * 24 * 60 * 60 * 1000; },
    // 모의 trade를 직접 평가 + 카드 렌더. 결과 객체를 패널에 반환.
    injectTrade: (trade) => {
      const r = engine.evaluate(trade);
      lastEval = { trade, result: r };
      if (r.stage === 'silent') { hideCard(); }
      else { renderCard(r); }
      return r;
    },
    // revenge 타이밍 검증용: 직전 손실을 엔진 상태에 심는다.
    seedLastResult: (pct, hoursAgo) => {
      engine.state.lastResult = { pct, ts: nowFn() - hoursAgo * 3.6e6 };
    },
    inspect: () => engine.inspect(),
    resetEngine: () => { engine.reset(engine.state.personaId); save(engine.state); },
    // 특정 시장 상황의 버퍼를 평소 거래로 빠르게 채운다(관찰모드 탈출용).
    warmupRegime: (changePct, volumeRatio, count = 8) => {
      for (let i = 0; i < count; i++) {
        const t = { symbol: 'ETH', amount: engine.state.persona.amount.m, side: 'buy',
          intendedHoldDays: engine.state.persona.holdDays.m, changePct, volumeRatio, resultPct: null };
        const r = engine.evaluate(t);
        engine.commitTrade(t, r);
        __clockOffsetMs += 2 * 24 * 60 * 60 * 1000; // 2일 간격
      }
      save(engine.state);
    },
  };
}

function rehookButtons() {
  UpbitAdapter.hookOrderButtons(side => {
    lastIntentSide = side;
    evaluateNow(side);
  });
}

function evaluateNow(side) {
  const amount = UpbitAdapter.readOrderAmount();
  if (!amount) return; // 금액 입력 전이면 평가하지 않음

  const symbol = UpbitAdapter.readSymbol();
  const changePct = UpbitAdapter.readChangePct();
  const volumeRatio = UpbitAdapter.readVolumeRatio(getVolBaseline());

  const trade = { symbol, amount, side, intendedHoldDays: null, changePct, volumeRatio, resultPct: null };
  const r = engine.evaluate(trade);
  lastEval = { trade, result: r };

  if (r.stage === 'silent') { hideCard(); return; } // 평소 거래 = 무개입
  renderCard(r);
}

/* ----- 거울 카드 UI ----- */
function injectCardRoot() {
  if (document.getElementById('aiMirrorRoot')) return;
  const root = document.createElement('div');
  root.id = 'aiMirrorRoot';
  document.body.appendChild(root);
}
function hideCard() {
  const root = document.getElementById('aiMirrorRoot');
  if (root) root.innerHTML = '';
}
function gaugeSVG(score) {
  const r = 32, c = 2 * Math.PI * r, p = score / 100;
  const col = score >= 75 ? '#CC8A45' : score >= 55 ? '#C9A24B' : '#6F8FA6';
  return `<svg viewBox="0 0 76 76" class="aim-gauge"><circle cx="38" cy="38" r="${r}" fill="none" stroke="#2F333C" stroke-width="6"/>
    <circle cx="38" cy="38" r="${r}" fill="none" stroke="${col}" stroke-width="6"
    stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" stroke-linecap="round"/></svg>`;
}
function renderCard(r) {
  const root = document.getElementById('aiMirrorRoot');
  if (r.observeOnly) {
    root.innerHTML = `<div class="aim-card">
      <div class="aim-stage">관찰 모드 · Observe</div>
      <div class="aim-desc">이 시장 상황(${r.market.regime})의 거래 데이터가 아직 적습니다(유효표본 ${r.baseline.effN.toFixed(1)}건). 초기값과 함께 보고 있어 비교 신뢰도가 낮아, 개입하지 않고 관찰만 합니다.</div>
      <button class="aim-btn ghost" id="aimOk">확인</button></div>`;
    document.getElementById('aimOk').onclick = hideCard;
    return;
  }
  const biasChips = r.biases.map(b => `<span class="aim-chip">${b.name}</span>`).join('');
  const reasons = r.reasons.map(x => `<li>${x.text}</li>`).join('');
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
      : `<button class="aim-btn ghost" id="aimOk">확인</button>`}
    <div class="aim-note">거래를 막지 않습니다. 닫으면 그대로 진행됩니다.</div>
  </div>`;
  if (isReflect) document.getElementById('aimNext').onclick = renderReflect;
  else document.getElementById('aimOk').onclick = () => commit();
}
function renderReflect() {
  const root = document.getElementById('aiMirrorRoot');
  const r = lastEval.result;
  const opts = ['사전에 계획했던 진입/청산', '새로운 정보·분석에 근거', '시장 분위기 따라 즉흥 판단', '직전 손실을 만회하고 싶어서', '잘 모르겠음 — 이미 결정함'];
  root.innerHTML = `<div class="aim-card">
    <div class="aim-stage">2 / 2 · Reflect</div>
    <div class="aim-desc">${r.biases.length
      ? `위 데이터는 ${r.biases.map(b => b.name.replace(' 가능성', '')).join(', ')}와 닮은 과거 패턴입니다. 사실인지는 본인만 압니다.`
      : '이번 거래는 평소 분포와 꽤 다른 조건입니다.'}</div>
    <div class="aim-desc" style="margin-top:8px">이 거래를 하려는 이유에 가장 가까운 것을 골라주세요.</div>
    <div class="aim-ro">${opts.map((o, i) => `<button data-i="${i}">${o}</button>`).join('')}</div>
    ${cooldownOptIn && r.score >= 80
      ? `<div class="aim-cd" id="aimCd">10</div><button class="aim-btn primary" id="aimDone" disabled>잠시 후 진행</button>`
      : `<button class="aim-btn primary" id="aimDone" disabled>거래 진행</button>`}
    <div class="aim-note">시간 지연은 없습니다(셀프 쿨다운을 켠 경우 제외). 한 번 더 보게 할 뿐입니다.</div>
  </div>`;
  let chosen = null;
  root.querySelectorAll('.aim-ro button').forEach(b => b.onclick = () => {
    root.querySelectorAll('.aim-ro button').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel'); chosen = b.textContent;
    if (!cooldownOptIn || r.score < 80) document.getElementById('aimDone').disabled = false;
  });
  // 사용자가 스스로 켠 셀프 쿨다운만 카운트다운 (서비스 강제 아님)
  if (cooldownOptIn && r.score >= 80) {
    let s = 10; const cd = document.getElementById('aimCd'), done = document.getElementById('aimDone');
    const t = setInterval(() => { s--; if (cd) cd.textContent = s;
      if (s <= 0) { clearInterval(t); done.disabled = false; done.textContent = '거래 진행'; } }, 1000);
  }
  document.getElementById('aimDone').onclick = () => commit(chosen);
}

function commit(reason) {
  hideCard();
  if (!engine || !lastEval) return;
  // resultPct 등은 실제 체결 결과 연동 전까지 null. 보유의도는 폼에서 못 읽으면 null.
  const newState = engine.commitTrade(lastEval.trade, lastEval.result);
  save(newState);
  updateVolBaseline(lastEval.trade.volumeRatio); // 거래량 기준선도 천천히 갱신
  if (reason) {/* reason은 리포트 화면에서만 사용 — 로컬에만, 외부 전송 없음 */ }
}

/* ----- 거래량 기준선(EWMA), 로컬 보관 ----- */
let _volBaseline = null;
function getVolBaseline() { return _volBaseline; }
function updateVolBaseline() {
  const el = document.querySelector('[class*="acc_trade_volume"], [class*="volume"]');
  const m = el ? el.textContent.replace(/,/g, '').match(/[\d.]+/) : null;
  const vol = m ? parseFloat(m[0]) : null;
  if (vol == null) return;
  _volBaseline = _volBaseline == null ? vol : _volBaseline * 0.9 + vol * 0.1;
  chrome.storage.local.set({ [VOLBASE_KEY]: _volBaseline });
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'aim-toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 6000);
}

boot();
