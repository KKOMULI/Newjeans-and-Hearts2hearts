/* =========================================================================
 * mirror-debug.js — 모의 거래 주입 디버그 패널
 * -------------------------------------------------------------------------
 * 실제 Upbit 거래 없이 엔진/거울을 검증하기 위한 개발용 도구.
 * 어댑터(페이지 DOM 읽기)를 우회하고, 직접 만든 trade 객체를
 * engine.evaluate() → renderCard() 로 흘려보낸다.
 *
 * 활성화 방법 (둘 중 하나):
 *   1) URL 뒤에 ?aimDebug=1 을 붙인다.
 *   2) 콘솔에서  localStorage.setItem('aimDebug','1')  후 새로고침.
 * 끄기: localStorage.removeItem('aimDebug') 또는 패널의 "닫기".
 *
 * content.js 에서 window.__aimDebugHooks 로 내부 함수를 노출받아 쓴다.
 * 디버그가 꺼져 있으면 이 파일은 아무것도 하지 않는다(프로덕션 무영향).
 * ========================================================================= */

(function () {
  const enabled =
    new URLSearchParams(location.search).get('aimDebug') === '1' ||
    localStorage.getItem('aimDebug') === '1';
  if (!enabled) return;

  // content.js 가 준비될 때까지 대기 (훅 노출 시점 동기화)
  const wait = setInterval(() => {
    if (window.__aimDebugHooks && window.__aimDebugHooks.ready) {
      clearInterval(wait);
      buildPanel(window.__aimDebugHooks);
    }
  }, 200);

  function buildPanel(hooks) {
    const wrap = document.createElement('div');
    wrap.id = 'aimDebugPanel';
    wrap.innerHTML = `
      <style>
        #aimDebugPanel{position:fixed;left:16px;top:16px;z-index:2147483600;width:300px;
          background:#0F1115;border:1px solid #3A3F4A;border-radius:6px;
          font-family:-apple-system,Inter,Arial,sans-serif;color:#E9E5DD;
          box-shadow:0 10px 40px rgba(0,0,0,.5);font-size:12px;}
        #aimDebugPanel .hd{display:flex;justify-content:space-between;align-items:center;
          padding:10px 12px;border-bottom:1px solid #2A2E37;}
        #aimDebugPanel .hd b{font-size:12px;letter-spacing:.04em;}
        #aimDebugPanel .hd .x{cursor:pointer;color:#9A958C;font-size:14px;}
        #aimDebugPanel .bd{padding:12px;max-height:78vh;overflow:auto;}
        #aimDebugPanel label{display:block;margin-bottom:9px;}
        #aimDebugPanel label span{display:block;color:#9A958C;margin-bottom:3px;font-size:11px;}
        #aimDebugPanel input,#aimDebugPanel select{width:100%;background:#1C1F26;
          border:1px solid #2F333C;color:#E9E5DD;padding:6px 7px;border-radius:3px;font-size:12px;}
        #aimDebugPanel .row{display:flex;gap:7px;}
        #aimDebugPanel .row>*{flex:1;}
        #aimDebugPanel .seg{display:flex;gap:5px;margin-bottom:9px;}
        #aimDebugPanel .seg button{flex:1;background:#1C1F26;border:1px solid #2F333C;
          color:#9A958C;padding:6px 0;border-radius:3px;cursor:pointer;font-size:11.5px;}
        #aimDebugPanel .seg button.on{border-color:#6F8FA6;color:#E9E5DD;background:#202830;}
        #aimDebugPanel .fire{width:100%;background:#CC8A45;color:#14161B;border:none;
          padding:9px 0;border-radius:3px;font-weight:600;cursor:pointer;margin-top:4px;}
        #aimDebugPanel .util{display:flex;gap:6px;margin-top:8px;}
        #aimDebugPanel .util button{flex:1;background:transparent;border:1px solid #2F333C;
          color:#9A958C;padding:7px 0;border-radius:3px;cursor:pointer;font-size:11px;}
        #aimDebugPanel .preset{margin-bottom:10px;}
        #aimDebugPanel .out{margin-top:10px;background:#1C1F26;border:1px solid #2F333C;
          border-radius:3px;padding:8px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;
          color:#B7B2A8;white-space:pre-wrap;max-height:160px;overflow:auto;}
        #aimDebugPanel .clk{font-family:'IBM Plex Mono',monospace;color:#6F8FA6;font-size:11px;margin-bottom:8px;}
      </style>
      <div class="hd"><b>🪞 AI Mirror · 디버그</b><span class="x" id="aimDbgClose">✕</span></div>
      <div class="bd">
        <div class="clk" id="aimDbgClock"></div>

        <label class="preset"><span>시나리오 프리셋</span>
          <select id="aimDbgPreset">
            <option value="">— 직접 입력 —</option>
            <option value="normal">평소 거래 (개입 없어야)</option>
            <option value="fomo">급등장 4배 매수 (FOMO)</option>
            <option value="panic">급락장 매도 (패닉셀)</option>
            <option value="revenge">손실 직후 재진입 (복구매매)</option>
            <option value="coldstart">데이터 부족 (관찰 모드)</option>
          </select>
        </label>

        <div class="row">
          <label><span>종목</span>
            <select id="aimDbgSym"><option>BTC</option><option selected>ETH</option><option>SOL</option><option>XRP</option><option>ADA</option><option>NEAR</option><option>AVAX</option><option>DOGE</option><option value="XYZ">잡코인</option></select>
          </label>
          <label><span>금액(만원)</span><input type="number" id="aimDbgAmt" value="200"></label>
        </div>

        <div class="seg" id="aimDbgSide">
          <button data-v="buy" class="on">매수</button>
          <button data-v="sell">매도</button>
        </div>

        <div class="row">
          <label><span>보유의도(일)</span><input type="number" id="aimDbgHold" value="14"></label>
          <label><span>직전손익(%)</span><input type="number" id="aimDbgResult" placeholder="없음"></label>
        </div>

        <label><span>시장 상태</span></label>
        <div class="seg" id="aimDbgMkt">
          <button data-c="0.6" data-v="1.0" class="on">평온</button>
          <button data-c="16" data-v="3.6">급등</button>
          <button data-c="-12" data-v="4.0">급락</button>
          <button data-c="5" data-v="2.6">변동</button>
        </div>

        <button class="fire" id="aimDbgFire">▶ 모의 거래 검토</button>

        <label style="margin-top:8px"><span>현재 시장 regime 버퍼 채우기 (관찰모드 탈출)</span></label>
        <div class="util">
          <button id="aimDbgWarmCalm">평온×8</button>
          <button id="aimDbgWarmSurge">급등×8</button>
          <button id="aimDbgWarmCrash">급락×8</button>
        </div>

        <div class="util">
          <button id="aimDbgAdvDay">시계 +1일</button>
          <button id="aimDbgAdv6m">+6개월</button>
        </div>
        <div class="util">
          <button id="aimDbgInspect">상태 보기</button>
          <button id="aimDbgReset">엔진 초기화</button>
        </div>

        <div class="out" id="aimDbgOut">준비됨. 프리셋을 고르거나 값을 입력한 뒤 "모의 거래 검토"를 누르세요.</div>
      </div>`;
    document.body.appendChild(wrap);

    // --- 상태 ---
    let side = 'buy', mktC = 0.6, mktV = 1.0;

    const $ = id => document.getElementById(id);
    const out = msg => { $('aimDbgOut').textContent = msg; };

    function refreshClock() {
      $('aimDbgClock').textContent = '🕐 가상시계: ' + new Date(hooks.getClock()).toLocaleString('ko-KR');
    }
    refreshClock();

    // 세그먼트 토글
    wrap.querySelectorAll('#aimDbgSide button').forEach(b => b.onclick = () => {
      wrap.querySelectorAll('#aimDbgSide button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); side = b.dataset.v;
    });
    wrap.querySelectorAll('#aimDbgMkt button').forEach(b => b.onclick = () => {
      wrap.querySelectorAll('#aimDbgMkt button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); mktC = +b.dataset.c; mktV = +b.dataset.v;
    });

    // 프리셋 — demo_seed_user_a.json의 trigger scenario를 우선 사용한다.
    function symFromCoin(coin) {
      return String(coin || '').replace(/^KRW-?/i, '').replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'ETH';
    }
    function volRatioFromSnapshot(snapshot) {
      const pct = Number(snapshot?.volumeChangeRatePct || 0);
      return Math.max(0.1, 1 + pct / 100);
    }
    function findDemoScenario(keyword) {
      const scenarios = globalThis.AI_MIRROR_DEMO_SEED_USER_A?.demoTriggerScenarios || [];
      return scenarios.find(s => String(s.scenarioId || '').includes(keyword));
    }
    function lossPctForScenario(scenario) {
      const ctx = scenario?.recentContext || {};
      const lossTradeId = ctx.lastRealizedLossTradeId;
      const lossKRW = Number(ctx.lastLossKRW || 0);
      const trades = globalThis.AI_MIRROR_DEMO_SEED_USER_A?.historicalTrades || [];
      const lossTrade = trades.find(t => t.tradeId === lossTradeId);
      if (lossTrade && Number(lossTrade.orderAmountKRW)) {
        return Math.round((lossKRW / Number(lossTrade.orderAmountKRW)) * 1000) / 10;
      }
      return -6.2;
    }
    function presetFromScenario(scenario, fallback) {
      if (!scenario) return fallback;
      const order = scenario.currentOrder || {};
      const snapshot = scenario.marketSnapshot || {};
      return {
        sym: symFromCoin(order.coin),
        amt: Math.round(Number(order.orderAmountKRW || 0) / 10000),
        side: order.side || fallback.side,
        hold: fallback.hold,
        result: fallback.result,
        c: Number(snapshot.shortTermChangeRatePct || 0),
        v: volRatioFromSnapshot(snapshot),
        lossPct: lossPctForScenario(scenario),
        hoursSinceLoss: Number(scenario.recentContext?.minutesSinceLoss || 120) / 60,
        title: scenario.title || '',
      };
    }

    const PRESETS = {
      normal:   { sym:'ETH', amt:46, side:'buy',  hold:7,  result:'', c:0.5,  v:1.08, title:'정기 리밸런싱에 가까운 ETH 매수' },
      fomo:     presetFromScenario(findDemoScenario('fomo'),    { sym:'SOL', amt:120, side:'buy',  hold:2,  result:'', c:8.2,  v:3.4 }),
      panic:    presetFromScenario(findDemoScenario('panic'),   { sym:'ETH', amt:150, side:'sell', hold:7,  result:'', c:-7.8, v:3.2 }),
      revenge:  presetFromScenario(findDemoScenario('revenge'), { sym:'XRP', amt:125, side:'buy',  hold:1,  result:'', c:4.9,  v:2.45 }),
      coldstart:{ sym:'DOGE',amt:85, side:'buy',  hold:1,  result:'', c:9,    v:3.6, title:'데이터 부족 관찰 모드' },
    };
    $('aimDbgPreset').onchange = e => {
      const p = PRESETS[e.target.value]; if (!p) return;
      $('aimDbgSym').value = p.sym; $('aimDbgAmt').value = p.amt;
      $('aimDbgHold').value = p.hold; $('aimDbgResult').value = p.result;
      side = p.side; mktC = p.c; mktV = p.v;
      wrap.querySelectorAll('#aimDbgSide button').forEach(x =>
        x.classList.toggle('on', x.dataset.v === side));
      wrap.querySelectorAll('#aimDbgMkt button').forEach(x =>
        x.classList.toggle('on', +x.dataset.c === mktC && +x.dataset.v === mktV));
      // revenge 프리셋: 직전 손실을 엔진에 먼저 심어줘야 타이밍이 성립
      if (e.target.value === 'revenge') {
        hooks.seedLastResult(p.lossPct || -6.2, p.hoursSinceLoss || 2);
        out('demo_seed_user_a 기반 revenge 프리셋: 직전 손실(' + (p.lossPct || -6.2) + '%, ' + ((p.hoursSinceLoss || 2) * 60).toFixed(0) + '분 전)을 엔진에 주입했습니다. 이제 검토를 누르세요.');
      } else {
        out('프리셋 "' + (p.title || e.target.value) + '" 로딩됨. "모의 거래 검토"를 누르세요.');
      }
    };

    // --- 모의 거래 발사 ---
    $('aimDbgFire').onclick = () => {
      const resultRaw = $('aimDbgResult').value;
      const trade = {
        symbol: $('aimDbgSym').value,
        amount: (+$('aimDbgAmt').value || 0) * 10000,
        side,
        intendedHoldDays: +$('aimDbgHold').value || null,
        changePct: mktC,
        volumeRatio: mktV,
        resultPct: resultRaw === '' ? null : +resultRaw,
      };
      const r = hooks.injectTrade(trade); // content.js가 evaluate+renderCard 수행, 결과 반환
      out(
        `regime=${r.market.regime}  score=${r.score}  stage=${r.stage}\n` +
        `confidence=${r.confidence}  chill=${r.chillFactor}\n` +
        `effN(this regime)=${r.baseline.effN.toFixed(2)}\n` +
        `― 근거 ―\n` + (r.reasons.length ? r.reasons.map(x => '· ' + x.text).join('\n') : '(없음)') +
        (r.biases.length ? '\n― 편향신호 ―\n' + r.biases.map(b => '⚑ ' + b.name).join('\n') : '') +
        `\n\n※ 거울 카드에서 확인/진행을 눌러야 commit 되어 버퍼에 반영됩니다.`
      );
    };

    // --- 시계 조작 ---
    $('aimDbgAdvDay').onclick = () => { hooks.advanceDays(1); refreshClock(); out('시계 +1일'); };
    $('aimDbgAdv6m').onclick  = () => { hooks.advanceDays(180); refreshClock(); out('시계 +180일 (신뢰도 하향 확인용)'); };

    // --- regime 워밍업 (관찰모드 탈출) ---
    $('aimDbgWarmCalm').onclick  = () => { hooks.warmupRegime(0.6, 1.0, 8); refreshClock(); out('평온 regime 버퍼 8건 채움. 이제 평온장 큰 거래로 개입을 볼 수 있습니다.'); };
    $('aimDbgWarmSurge').onclick = () => { hooks.warmupRegime(16, 3.6, 8); refreshClock(); out('급등 regime 버퍼 8건 채움. 이제 급등장 거래에서 관찰모드를 벗어납니다.'); };
    $('aimDbgWarmCrash').onclick = () => { hooks.warmupRegime(-12, 4.0, 8); refreshClock(); out('급락 regime 버퍼 8건 채움.'); };

    // --- 상태/초기화 ---
    $('aimDbgInspect').onclick = () => {
      const st = hooks.inspect();
      const regimes = Object.entries(st.regimes || {})
        .map(([k, v]) => `  ${k}: 버퍼 ${v.buffer.length}/24, effN ${v.effN.toFixed(2)}`).join('\n');
      out(`persona=${st.personaId}\nregimes:\n${regimes || '  (없음)'}\nfreq.ewma=${st.freq.ewma.toFixed(2)}\nstate JSON ≈ ${JSON.stringify(st).length}B`);
    };
    $('aimDbgReset').onclick = () => { hooks.resetEngine(); refreshClock(); out('엔진 초기화됨 (버퍼·통계 삭제, 페르소나 유지).'); };

    $('aimDbgClose').onclick = () => { localStorage.removeItem('aimDebug'); wrap.remove(); };

    out('디버그 패널 준비됨. 실제 Upbit 거래 없이 거울을 검증할 수 있습니다.');
  }
})();
