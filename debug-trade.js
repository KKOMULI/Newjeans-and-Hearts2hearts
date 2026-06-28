/* Standalone mock trading window for mIrror debugging. */
(function(){
  'use strict';

  const STORE_KEY = 'mIrror.state.v1';
  const PERSONA_KEY = 'mIrror.persona.v1';
  const ONBOARDING_RESULT_KEY = 'mIrror.onboardingResult.v1';
  const DEBUG_STORE_KEY = 'mIrror.debugTrade.state.v1';
  const DEBUG_PERSONA_KEY = 'mIrror.debugTrade.persona.v1';
  const DEBUG_USE_PROD_KEY = 'mIrror.debugTrade.useProductionState';
  const DEBUG_CLOCK_KEY = 'mIrror.debugTrade.clockOffsetMs';
  const DEFAULT_PERSONA = 'balanced_rebalancer';
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const BASE_PRICE = { BTC:100100000, ETH:5040000, SOL:248000, XRP:865, ADA:951, NEAR:10580, AVAX:58000, DOGE:210, XYZ:1240 };

  let engine;
  let personaId = DEFAULT_PERSONA;
  let useProduction = false;
  let clockOffset = 0;
  let side = 'buy';
  let lastTrade = null;
  let lastEval = null;
  let lastScenario = null;
  let scenarioMap = new Map();
  let currentOnboardingResult = null;
  let applying = false;

  const $ = (id) => document.getElementById(id);
  const hasChromeStorage = () => typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  const now = () => Date.now() + clockOffset;
  const stateKey = () => useProduction ? STORE_KEY : DEBUG_STORE_KEY;
  const personaKey = () => useProduction ? PERSONA_KEY : DEBUG_PERSONA_KEY;
  const round = (n, d = 1) => Math.round((Number(n) || 0) * Math.pow(10, d)) / Math.pow(10, d);
  const krw = (n) => '₩' + Math.round(Number(n) || 0).toLocaleString('ko-KR');

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (hasChromeStorage()) return chrome.storage.local.get(keys, resolve);
      const out = {};
      keys.forEach((k) => {
        const raw = localStorage.getItem(k);
        if (raw != null) {
          try { out[k] = JSON.parse(raw); } catch { out[k] = raw; }
        }
      });
      resolve(out);
    });
  }
  function storageSet(obj) {
    return new Promise((resolve) => {
      if (hasChromeStorage()) return chrome.storage.local.set(obj, resolve);
      Object.entries(obj).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
      resolve();
    });
  }
  function storageRemove(keys) {
    return new Promise((resolve) => {
      if (hasChromeStorage()) return chrome.storage.local.remove(keys, resolve);
      keys.forEach((k) => localStorage.removeItem(k));
      resolve();
    });
  }

  function coin(v) {
    return String(v || '').replace(/^KRW-?/i, '').replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'ETH';
  }
  function personaName(id) {
    return globalThis.MIRROR_PERSONA_SEED_DATASET?.personas?.find(p => p.personaId === id)?.personaNameKo || id;
  }
  function seedPersona(id) {
    return globalThis.MIRROR_PERSONA_SEED_DATASET?.personas?.find(p => p.personaId === id) || null;
  }
  function volRatio(snapshot) {
    const pct = Number(snapshot?.volumeChangeRatePct || 0);
    return Math.max(0.1, 1 + pct / 100);
  }
  function expectedStage(level) {
    if (!level || level === 'none') return 'silent';
    if (level === 'notice' || level === 'explain_reflect') return 'notice';
    if (level === 'reflect_delay') return 'reflect';
    return level;
  }

  async function loadState() {
    const data = await storageGet([STORE_KEY, PERSONA_KEY, ONBOARDING_RESULT_KEY, DEBUG_STORE_KEY, DEBUG_PERSONA_KEY, DEBUG_USE_PROD_KEY, DEBUG_CLOCK_KEY]);
    useProduction = !!data[DEBUG_USE_PROD_KEY];
    clockOffset = Number(data[DEBUG_CLOCK_KEY] || 0);
    const wantedPersona = useProduction ? (data[PERSONA_KEY] || data[DEBUG_PERSONA_KEY] || DEFAULT_PERSONA) : (data[DEBUG_PERSONA_KEY] || data[PERSONA_KEY] || DEFAULT_PERSONA);
    const loadedState = useProduction ? data[STORE_KEY] : data[DEBUG_STORE_KEY];
    currentOnboardingResult = data[ONBOARDING_RESULT_KEY] || null;
    const opts = useProduction ? { onboardingResult: currentOnboardingResult } : {};
    engine = new MirrorEngine(loadedState || null, wantedPersona, now, opts);
    personaId = engine.state.personaId || wantedPersona;
  }
  async function saveState() {
    await storageSet({ [stateKey()]: engine.inspect(), [personaKey()]: personaId, [DEBUG_CLOCK_KEY]: clockOffset });
  }

  function fillPersonas() {
    const sel = $('personaSelect');
    sel.innerHTML = '';
    Object.keys(PERSONA_PRIORS || {}).forEach((id) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${personaName(id)} · ${id}`;
      sel.appendChild(opt);
    });
    sel.value = personaId;
  }
  function fillScenarios() {
    const sel = $('scenarioSelect');
    sel.innerHTML = '<option value="">직접 입력</option>';
    scenarioMap = new Map();

    const personaScenarios = seedPersona(personaId)?.demoCurrentOrders || [];
    if (personaScenarios.length) {
      const group = document.createElement('optgroup');
      group.label = `현재 페르소나 · ${personaName(personaId)}`;
      personaScenarios.forEach((s, i) => addScenario(group, `persona:${i}`, s, 'persona_seed_dataset'));
      sel.appendChild(group);
    }
    const demoScenarios = globalThis.MIRROR_DEMO_SEED_USER_A?.demoTriggerScenarios || [];
    if (demoScenarios.length) {
      const group = document.createElement('optgroup');
      group.label = 'user_a 트리거 시나리오';
      demoScenarios.forEach((s, i) => addScenario(group, `demo:${i}`, s, 'demo_seed_user_a'));
      sel.appendChild(group);
    }
  }
  function addScenario(group, key, scenario, source) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = scenario.title || scenario.scenarioId || key;
    group.appendChild(opt);
    scenarioMap.set(key, { scenario, source });
  }

  function setSide(next) {
    side = next === 'sell' ? 'sell' : 'buy';
    $('sideBox').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.side === side));
  }
  function lossPctForScenario(s) {
    const ctx = s?.recentContext || {};
    const order = s?.currentOrder || {};
    const lossKRW = Number(ctx.lastLossKRW ?? order.lastLossKRW ?? 0);
    const tradeId = ctx.lastRealizedLossTradeId;
    const lossTrade = (globalThis.MIRROR_DEMO_SEED_USER_A?.historicalTrades || []).find(t => t.tradeId === tradeId);
    if (lossTrade && Number(lossTrade.orderAmountKRW)) return round(lossKRW / Number(lossTrade.orderAmountKRW) * 100, 1);
    if (lossKRW && Number(order.orderAmountKRW)) return round(lossKRW / Number(order.orderAmountKRW) * 100, 1);
    return -6.2;
  }
  function lossMinutesForScenario(s) {
    return Number(s?.recentContext?.minutesSinceLoss ?? s?.currentOrder?.minutesSinceLoss ?? 19);
  }
  async function seedLoss(lossPct, minutes, persist = true) {
    engine.state.lastResult = { pct: Number(lossPct) || -6.2, ts: now() - (Number(minutes) || 19) * 60 * 1000 };
    if (persist) await saveState();
    log(`직전 손실 주입: ${engine.state.lastResult.pct}% / ${Number(minutes) || 19}분 전`);
  }

  function applyScenario(key) {
    const entry = scenarioMap.get(key);
    if (!entry) { lastScenario = null; return; }
    applying = true;
    lastScenario = entry.scenario;
    const order = lastScenario.currentOrder || {};
    const snap = lastScenario.marketSnapshot || {};
    const sym = coin(order.coin);
    if (!$('symbolInput').querySelector(`option[value="${sym}"]`)) {
      const opt = document.createElement('option'); opt.value = sym; opt.textContent = sym; $('symbolInput').appendChild(opt);
    }
    $('symbolInput').value = sym;
    $('orderTypeInput').value = order.orderType === 'limit' ? 'limit' : 'market';
    $('amountInput').value = Number(order.orderAmountKRW || 0);
    const scenarioPrice = Number(order.priceKRW || 0) || Math.round((BASE_PRICE[sym] || BASE_PRICE.XYZ) * (1 + Number(snap.shortTermChangeRatePct || 0) / 100));
    $('priceInput').value = scenarioPrice;
    $('holdInput').value = order.side === 'sell' ? 3 : 1;
    $('changeInput').value = round(Number(snap.shortTermChangeRatePct || 0), 1);
    $('volumeInput').value = round(volRatio(snap), 2);
    $('sellRatioInput').value = order.estimatedPositionSellRatio ?? '';
    $('resultInput').value = '';
    setSide(order.side || 'buy');
    if (lastScenario.recentContext || order.minutesSinceLoss || order.lastLossKRW) {
      const lp = lossPctForScenario(lastScenario);
      const lm = lossMinutesForScenario(lastScenario);
      $('lossPctInput').value = lp;
      $('lossMinutesInput').value = lm;
      seedLoss(lp, lm, true);
    }
    applying = false;
    renderMarket();
    placeholder(`프리셋 로딩됨: ${lastScenario.title || lastScenario.scenarioId}\n“거울 검토 실행”을 눌러 현재 엔진으로 다시 계산하세요.`);
  }

  function readTrade() {
    const resultRaw = $('resultInput').value.trim();
    const sellRatioRaw = $('sellRatioInput').value.trim();
    return {
      symbol: coin($('symbolInput').value),
      amount: Math.max(0, Number($('amountInput').value) || 0),
      priceKRW: Math.max(0, Number($('priceInput').value) || 0) || null,
      side,
      intendedHoldDays: $('holdInput').value === '' ? null : Math.max(0, Number($('holdInput').value) || 0),
      changePct: Number($('changeInput').value) || 0,
      volumeRatio: Math.max(0.1, Number($('volumeInput').value) || 1),
      resultPct: resultRaw === '' ? null : Number(resultRaw),
      orderType: $('orderTypeInput').value,
      quantity: (Math.max(0, Number($('priceInput').value) || 0) && Math.max(0, Number($('amountInput').value) || 0)) ? Math.max(0, Number($('amountInput').value) || 0) / Math.max(0, Number($('priceInput').value) || 0) : null,
      estimatedPositionSellRatio: sellRatioRaw === '' ? null : Number(sellRatioRaw),
    };
  }

  function renderStatus() {
    $('modeLabel').textContent = useProduction ? '실제 확장 저장소 모드' : '디버그 저장소 모드';
    $('clockLabel').textContent = '가상시계 ' + new Date(now()).toLocaleString('ko-KR');
    $('useProductionState').checked = useProduction;
    $('personaSelect').value = personaId;
  }
  function renderMarket() {
    const t = readTrade();
    const m = engine.marketState(t.symbol, t.changePct, t.volumeRatio);
    const price = t.priceKRW || ((BASE_PRICE[t.symbol] || BASE_PRICE.XYZ) * (1 + t.changePct / 100));
    $('marketSymbol').textContent = `KRW-${t.symbol}`;
    $('marketPrice').textContent = krw(price);
    $('marketChange').textContent = `${t.changePct > 0 ? '+' : ''}${round(t.changePct, 1)}%`;
    $('marketChange').className = t.changePct > 0 ? 'up' : t.changePct < 0 ? 'down' : 'flat';
    $('marketRegime').textContent = ({ calm:'평온(calm)', surge:'급등(surge)', crash:'급락(crash)', volatile:'변동(volatile)' })[m.regime] || m.regime;
    $('marketVolume').textContent = `${round(t.volumeRatio, 2)}x`;
    $('marketIntensity').textContent = `${Math.round(m.intensity)}/100`;
    drawChart(t, price);
    drawBook(price);
  }
  function drawChart(t, lastPrice) {
    const W = 540, H = 260, pad = 18, n = 18;
    const total = t.changePct / 100;
    const base = lastPrice / Math.max(0.2, 1 + total);
    const candles = [];
    for (let i = 0; i < n; i++) {
      const a = i / n, b = (i + 1) / n;
      const w0 = Math.sin(i * 1.55 + t.volumeRatio) * 0.006 * Math.min(3, t.volumeRatio);
      const w1 = Math.sin((i + 1) * 1.55 + t.volumeRatio) * 0.006 * Math.min(3, t.volumeRatio);
      const open = base * (1 + total * a + w0);
      const close = base * (1 + total * b + w1);
      const spread = Math.abs(close - open) + base * 0.006 * Math.min(4, t.volumeRatio);
      candles.push({ open, close, high: Math.max(open, close) + spread * .55, low: Math.min(open, close) - spread * .55 });
    }
    const min = Math.min(...candles.map(c => c.low)), max = Math.max(...candles.map(c => c.high));
    const y = (v) => H - pad - ((v - min) / Math.max(1, max - min)) * (H - pad * 2);
    const cw = (W - pad * 2) / n;
    let html = '';
    for (let i = 0; i < 5; i++) {
      const yy = pad + i * (H - pad * 2) / 4;
      html += `<line x1="${pad}" y1="${yy}" x2="${W-pad}" y2="${yy}" stroke="#252B35"/>`;
    }
    candles.forEach((c, i) => {
      const x = pad + i * cw + cw / 2;
      const color = c.close >= c.open ? '#7C9A6E' : '#BC6B62';
      const top = y(Math.max(c.open, c.close)), bottom = y(Math.min(c.open, c.close));
      html += `<line x1="${x}" y1="${y(c.high)}" x2="${x}" y2="${y(c.low)}" stroke="${color}" stroke-width="1.4"/>`;
      html += `<rect x="${x-cw*.28}" y="${top}" width="${cw*.56}" height="${Math.max(2,bottom-top)}" rx="2" fill="${color}"/>`;
    });
    $('chart').innerHTML = html;
  }
  function drawBook(price) {
    const unit = Math.max(1, price * 0.0015);
    const asks = [], bids = [];
    for (let i = 5; i >= 1; i--) asks.push({ p: price + unit * i, q: (i * .42).toFixed(3) });
    for (let i = 1; i <= 5; i++) bids.push({ p: price - unit * i, q: (i * .38).toFixed(3) });
    $('asks').innerHTML = asks.map(x => `<div class="book-row"><span class="down">${krw(x.p)}</span><span>${x.q}</span></div>`).join('');
    $('bids').innerHTML = bids.map(x => `<div class="book-row"><span class="up">${krw(x.p)}</span><span>${x.q}</span></div>`).join('');
  }

  function placeholder(text) {
    $('resultPanel').className = 'empty';
    $('resultPanel').textContent = text;
    $('commitBtn').disabled = true;
  }
  function stageLabel(stage) {
    return ({ silent:'무개입', notice:'Notice', reflect:'Reflect', observe:'관찰 모드' })[stage] || stage;
  }
  function stageSummary(r) {
    if (r.observeOnly || r.stage === 'observe') return '데이터가 부족해 개입 없이 관찰 모드만 표시합니다.';
    if (r.stage === 'silent') return '평소 기준선과 크게 다르지 않아 실제 확장에서는 카드를 띄우지 않습니다.';
    if (r.stage === 'notice') return '평소와 다른 점을 설명하는 Notice 카드가 뜹니다.';
    if (r.stage === 'reflect') return '근거 확인과 한 번 더 생각하기 단계가 뜹니다.';
    return '현재 주문을 사용자 기준선과 비교했습니다.';
  }
  function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function renderResult(r, t, committed = false) {
    const reasons = r.reasons?.length ? r.reasons.map(x => `<li>${esc(x.text)}</li>`).join('') : '<li>점수에 반영된 이탈 근거가 없습니다.</li>';
    const chips = r.biases?.length ? r.biases.map(b => `<span class="chip">${esc(b.name)}</span>`).join('') : '<span class="chip">편향 후보 없음</span>';
    const exp = lastScenario?.expectedAnalysis;
    const compare = exp ? `<div class="compare"><div><b>프리셋 기대값</b>점수 ${exp.deviationScore ?? '—'} · 단계 ${expectedStage(exp.interventionLevel)}</div><div><b>현재 엔진 계산값</b>점수 ${r.score} · 단계 ${r.stage}</div></div>` : '';
    $('resultPanel').className = '';
    $('resultPanel').innerHTML = `<div class="result-card"><div class="score-top"><div class="gauge" style="--score:${r.score}"><b>${r.score}</b></div><div><div class="stage">${stageLabel(r.stage)}</div><div class="summary">${stageSummary(r)}<br>신뢰도 ${r.confidence} · regime ${r.market.regime} · effN ${round(r.baseline.effN, 2)}</div></div></div><ul class="reasons">${reasons}</ul><div class="chips">${chips}</div>${compare}</div><div class="result-card"><div class="stage">입력 주문</div><div class="summary">${t.side === 'buy' ? '매수' : '매도'} · KRW-${t.symbol} · ${krw(t.amount)} · ${t.priceKRW ? krw(t.priceKRW) + ' 기준 · ' : ''}${t.orderType === 'limit' ? '지정가' : '시장가'} · 변동률 ${t.changePct > 0 ? '+' : ''}${round(t.changePct, 1)}% · 거래량 ${round(t.volumeRatio, 2)}x</div></div>${committed ? '<p class="note">이 주문은 체결된 것으로 가정되어 선택한 저장소의 행동 버퍼에 반영됐습니다.</p>' : ''}`;
    $('commitBtn').disabled = false;
  }

  function evaluate() {
    const t = readTrade();
    if (!t.amount) return placeholder('주문 금액을 입력해야 검토할 수 있습니다.');
    const r = engine.evaluate(t);
    lastTrade = t;
    lastEval = r;
    renderMarket();
    renderResult(r, t, false);
    log(`검토 실행: ${t.side} KRW-${t.symbol} ${krw(t.amount)} -> score=${r.score}, stage=${r.stage}, confidence=${r.confidence}`);
  }
  async function commit() {
    if (!lastTrade || !lastEval) evaluate();
    if (!lastTrade || !lastEval) return;
    engine.commitTrade(lastTrade, lastEval);
    await saveState();
    renderResult(lastEval, lastTrade, true);
    renderStatus();
    $('commitBtn').disabled = true;
    log(`체결 가정 저장: ${lastTrade.side} KRW-${lastTrade.symbol} ${krw(lastTrade.amount)} / resultPct=${lastTrade.resultPct ?? '없음'}`);
  }
  async function warmup(changePct, volumeRatio, label) {
    const p = engine.state?.persona || PERSONA_PRIORS[personaId] || PERSONA_PRIORS[DEFAULT_PERSONA];
    const coins = p.preferredCoins?.length ? p.preferredCoins : ['KRW-ETH'];
    for (let i = 0; i < 8; i++) {
      const t = { symbol: coin(coins[i % coins.length]), amount: Math.round(p.amount.m), side:'buy', intendedHoldDays:p.holdDays.m, changePct, volumeRatio, resultPct:null };
      const r = engine.evaluate(t);
      engine.commitTrade(t, r);
      clockOffset += 2 * ONE_DAY;
    }
    await saveState();
    renderStatus();
    renderMarket();
    log(`${label} regime 워밍업 8건 저장 완료`);
  }
  async function resetState() {
    if (useProduction && !confirm('실제 확장 저장소(mIrror.state.v1)를 초기화합니다. 계속할까요?')) return;
    if (useProduction && !currentOnboardingResult) {
      const d = await storageGet([ONBOARDING_RESULT_KEY]);
      currentOnboardingResult = d[ONBOARDING_RESULT_KEY] || null;
    }
    engine = new MirrorEngine(null, personaId, now, useProduction ? { onboardingResult: currentOnboardingResult } : {});
    await storageRemove([stateKey()]);
    await saveState();
    lastTrade = null;
    lastEval = null;
    placeholder('엔진 상태를 초기화했습니다. 새 주문을 검토하세요.');
    renderStatus();
    renderMarket();
    log('엔진 상태 초기화 완료');
  }
  async function changePersona(next) {
    if (useProduction && !confirm('실제 확장 저장소의 페르소나와 행동 기준선을 새로 시작합니다. 계속할까요?')) {
      $('personaSelect').value = personaId;
      return;
    }
    personaId = next in PERSONA_PRIORS ? next : DEFAULT_PERSONA;
    if (useProduction && !currentOnboardingResult) {
      const d = await storageGet([ONBOARDING_RESULT_KEY]);
      currentOnboardingResult = d[ONBOARDING_RESULT_KEY] || null;
    }
    engine = new MirrorEngine(null, personaId, now, useProduction ? { onboardingResult: currentOnboardingResult } : {});
    await saveState();
    fillScenarios();
    renderStatus();
    renderMarket();
    placeholder(`${personaName(personaId)} 기준선으로 디버그 엔진을 새로 시작했습니다.`);
    log(`페르소나 변경: ${personaName(personaId)} (${personaId})`);
  }
  async function switchMode(checked) {
    if (checked && !confirm('실제 확장 저장소에 테스트 commit이 반영될 수 있습니다. 계속할까요?')) {
      $('useProductionState').checked = false;
      return;
    }
    useProduction = checked;
    await storageSet({ [DEBUG_USE_PROD_KEY]: useProduction });
    await loadState();
    fillPersonas();
    fillScenarios();
    renderStatus();
    renderMarket();
    placeholder(useProduction ? '실제 확장 저장소 모드입니다.' : '디버그 저장소 모드입니다. 실제 기준선은 건드리지 않습니다.');
    log(`저장소 모드 변경: ${useProduction ? '실제 확장 저장소' : '디버그 저장소'}`);
  }
  function inspect() {
    const st = engine.inspect();
    const regimes = Object.entries(st.regimes || {}).map(([k, v]) => `${k}: buffer=${v.buffer?.length || 0}/${CONFIG.BUFFER_SIZE_PER_REGIME}, effN=${round(v.effN, 2)}, seed=${v.syntheticSeedCount || 0}`).join('\n');
    log(`persona=${st.personaId}\nseedSource=${st.seedSource || '—'}\nregimes:\n${regimes || '(없음)'}\nfreq.ewma=${round(st.freq?.ewma, 2)}\nlastResult=${st.lastResult ? JSON.stringify(st.lastResult) : '없음'}`);
  }
  function markCustom() {
    if (!applying) {
      lastScenario = null;
      $('scenarioSelect').value = '';
    }
    renderMarket();
  }
  function log(msg) {
    const el = $('log');
    const ts = new Date(now()).toLocaleTimeString('ko-KR');
    el.textContent = `[${ts}] ${msg}\n` + (el.textContent || '');
  }

  function bind() {
    $('useProductionState').addEventListener('change', e => switchMode(e.target.checked));
    $('personaSelect').addEventListener('change', e => changePersona(e.target.value));
    $('scenarioSelect').addEventListener('change', e => applyScenario(e.target.value));
    $('sideBox').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { setSide(b.dataset.side); markCustom(); }));
    ['symbolInput','orderTypeInput','amountInput','priceInput','holdInput','changeInput','volumeInput','resultInput','sellRatioInput'].forEach(id => {
      $(id).addEventListener('input', markCustom);
      $(id).addEventListener('change', markCustom);
    });
    $('seedLossBtn').addEventListener('click', () => seedLoss(Number($('lossPctInput').value), Number($('lossMinutesInput').value), true));
    $('evaluateBtn').addEventListener('click', evaluate);
    $('commitBtn').addEventListener('click', commit);
    $('warmCalmBtn').addEventListener('click', () => warmup(0.6, 1.0, '평온'));
    $('warmSurgeBtn').addEventListener('click', () => warmup(16, 3.6, '급등'));
    $('warmCrashBtn').addEventListener('click', () => warmup(-12, 4.0, '급락'));
    $('advanceDayBtn').addEventListener('click', async () => { clockOffset += ONE_DAY; await saveState(); renderStatus(); log('가상시계 +1일'); });
    $('advance180Btn').addEventListener('click', async () => { clockOffset += 180 * ONE_DAY; await saveState(); renderStatus(); log('가상시계 +180일'); });
    $('resetBtn').addEventListener('click', resetState);
    $('inspectBtn').addEventListener('click', inspect);
    $('clearLogBtn').addEventListener('click', () => { $('log').textContent = '로그를 지웠습니다.'; });
  }

  async function init() {
    await loadState();
    fillPersonas();
    fillScenarios();
    bind();
    renderStatus();
    renderMarket();
    placeholder('모의 주문을 입력하고 “거울 검토 실행”을 누르세요.');
    log(`디버그 매매창 준비 완료 · ${personaName(personaId)} · ${useProduction ? '실제 저장소' : '디버그 저장소'} 모드`);
  }
  document.addEventListener('DOMContentLoaded', init);
})();
