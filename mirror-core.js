/* =========================================================================
 * AI Mirror — Core Engine (buffer edition)
 * -------------------------------------------------------------------------
 * 철학: 예측하지 않는다 · 추천하지 않는다 · 막지 않는다 · 단정하지 않는다.
 *       사용자의 "지금 거래"가 "사용자 자신의 평소 분포"에서 얼마나
 *       벗어났는지만 보여준다.
 *
 * 저장 정책:
 *   - 원본 거래내역(주문 원장)은 저장하지 않는다.
 *   - regime별 고정 크기 롤링 버퍼(최근 N건의 "행동 feature"만) + 요약 통계량.
 *   - 버퍼는 무한히 쌓이지 않고 FIFO로 순환한다(오래된 건 자동 삭제).
 *   - 외부 전송 없음. chrome.storage.local 에만 둔다.
 *
 * 이 파일은 프레임워크 비의존(순수 JS)이라 content script에 그대로 이식 가능.
 * 페르소나 값/임계치는 팀에서 데이터로 채울 자리 → CONFIG 로 분리.
 * ========================================================================= */

const ONE_DAY = 24 * 60 * 60 * 1000;

/* ----------------------------------------------------------------------- *
 * CONFIG — 팀이 데이터로 채우거나 튜닝할 영역
 * ----------------------------------------------------------------------- */
const CONFIG = {
  // 고정 크기 롤링 버퍼: regime별로 최대 이만큼만 보관 (무한 누적 아님)
  BUFFER_SIZE_PER_REGIME: 24,

  // 페르소나 prior의 "가상 표본 무게". 실거래가 이만큼 쌓이면 50:50.
  // 분산 계열(MAD)은 표본 적을 때 과소추정 위험 → prior를 더 무겁게.
  K_LOCATION: 12,   // median 등 위치 통계
  K_SPREAD: 20,     // MAD 등 산포 통계 (더 보수적)

  // 시간 decay: feature별로 반감기를 다르게 (대화에서 합의한 표)
  HALF_LIFE_DAYS: {
    amount: 75,        // 투자 성향: 안정적 → 길게
    holdDays: 75,
    tradeFrequency: 18, // 빈도 급변은 빨리 반영
    hourOfDay: 120,    // 생활 패턴: 잘 안 변함
  },

  // 오래 쉬었다가 돌아온 사용자 → 신뢰도 자동 하향
  STALE_HALF_LIFE_DAYS: 60,   // 마지막 거래 후 이 일수마다 recency가 절반
  OBSERVE_ONLY_TRADE_COUNT: 5, // 유효표본 이만큼 미만이면 개입 없이 관찰만

  // 자산군별 시장 임계치 (코인 특성: 자산군마다 변동성 차이가 큼)
  MARKET_THRESHOLDS: {
    // 업로드된 온보딩/데모 JSON은 +8% 급등, -7% 급락을 주요 트리거로 둔다.
    major: { changeAlert: 7,  volumeRatioAlert: 2.3 }, // BTC, ETH
    alt:   { changeAlert: 8,  volumeRatioAlert: 2.4 },
    micro: { changeAlert: 12, volumeRatioAlert: 3.0 }, // 잡코인
  },

  // 개입 임계 (Deviation Score 0~100). Delay(강제차단) 없음.
  INTERVENTION: {
    noticeFrom: 45,   // 이 미만은 UI 미노출(평소 거래)
    reflectFrom: 70,  // 한 번 더 보게 하는 재확인 단계 (강제 아님)
  },

  // 피드백 루프(자기왜곡) 감지: 개입 직후 거래가 일관되게 위축되면
  // 개입 민감도를 자동으로 낮춰 "거울이 대상을 바꾸는" 현상을 완화.
  CHILL_EFFECT: {
    lookback: 4,          // 개입 직후 몇 건을 볼지
    shrinkRatio: 0.7,     // 평균적으로 평소의 70% 미만으로 줄면
    sensitivityFloor: 0.6 // 민감도를 이 배율까지 낮춤
  },
};

/* ----------------------------------------------------------------------- *
 * 페르소나 prior 템플릿
 * ----------------------------------------------------------------------- *
 * 업로드된 persona_seed_dataset.json의 6개 페르소나와 baselineTargets,
 * sampleTrades를 사용해 cold-start prior를 만든다. 데이터 파일이 로드되지
 * 않은 테스트 환경에서는 아래 fallback만 사용한다.
 * ----------------------------------------------------------------------- */
const DEFAULT_PERSONA_ID = 'balanced_rebalancer';

function _seedNumber(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function _seedMedian(arr) {
  const xs = arr.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}
function _seedMad(arr) {
  const med = _seedMedian(arr);
  if (med == null) return null;
  const dev = arr.map(x => Math.abs(Number(x) - med)).filter(Number.isFinite);
  const m = _seedMedian(dev);
  return m == null ? null : m * 1.4826;
}
function _coinSymbol(coin) {
  return String(coin || '').replace(/^KRW-?/i, '').replace(/[^A-Z0-9]/gi, '').toUpperCase() || 'UNKNOWN';
}
function _volumeChangePctToRatio(value) {
  const pct = _seedNumber(value, 0);
  return Math.max(0.1, 1 + pct / 100);
}
function _buildPersonaPriorsFromSeed(seed) {
  const personas = seed?.personas;
  if (!Array.isArray(personas) || !personas.length) return null;
  const out = {};
  personas.forEach(p => {
    const trades = Array.isArray(p.sampleTrades) ? p.sampleTrades : [];
    const amounts = trades.map(t => _seedNumber(t.orderAmountKRW)).filter(Number.isFinite);
    const holds = trades
      .map(t => _seedNumber(t.holdingPeriodHours))
      .filter(Number.isFinite)
      .map(h => h / 24);
    const targets = p.baselineTargets || {};
    const avgAmount = _seedNumber(targets.averageOrderAmountKRW, _seedMedian(amounts) || 480000);
    const amountMad = Math.max(
      _seedMad(amounts) || avgAmount * 0.35,
      avgAmount * 0.15,
      10000
    );
    const holdMed = Math.max(
      _seedNumber(targets.averageHoldingPeriodHours, null) != null
        ? _seedNumber(targets.averageHoldingPeriodHours) / 24
        : (_seedMedian(holds) || 7),
      0.25
    );
    const holdMad = Math.max(_seedMad(holds) || holdMed * 0.5, 0.25);
    out[p.personaId] = {
      amount: { m: avgAmount, mad: amountMad },
      holdDays: { m: holdMed, mad: holdMad },
      tradeFrequency: _seedNumber(targets.weeklyTradeCount, 2),
      preferredCoins: targets.preferredCoins || [],
      axisProfile: p.axisProfile || {},
      initialConfidence: _seedNumber(p.initialConfidence, 0.45),
      source: p.source || 'synthetic_persona_seed',
      sampleTrades: trades,
      demoCurrentOrders: Array.isArray(p.demoCurrentOrders) ? p.demoCurrentOrders : [],
      personaNameKo: p.personaNameKo || p.personaId,
    };
  });
  return out;
}

const FALLBACK_PERSONA_PRIORS = {
  stable_accumulator:     { amount: {m: 280000, mad:  90000}, holdDays: {m: 21.7, mad: 10}, tradeFrequency: 1.2, initialConfidence: 0.45, sampleTrades: [] },
  balanced_rebalancer:   { amount: {m: 480000, mad: 160000}, holdDays: {m:  7.5, mad:  4}, tradeFrequency: 3.0, initialConfidence: 0.45, sampleTrades: [] },
  cautious_explorer:     { amount: {m: 190000, mad:  60000}, holdDays: {m:  6.3, mad:  4}, tradeFrequency: 2.5, initialConfidence: 0.45, sampleTrades: [] },
  trend_responder:       { amount: {m: 650000, mad: 220000}, holdDays: {m:  1.3, mad:  1}, tradeFrequency: 4.2, initialConfidence: 0.45, sampleTrades: [] },
  volatility_responder:  { amount: {m: 320000, mad: 120000}, holdDays: {m:  0.3, mad: .5}, tradeFrequency: 9.5, initialConfidence: 0.45, sampleTrades: [] },
  recovery_sensitive:    { amount: {m: 520000, mad: 250000}, holdDays: {m:  1.2, mad:  1}, tradeFrequency: 5.5, initialConfidence: 0.45, sampleTrades: [] },
};

const PERSONA_PRIORS = _buildPersonaPriorsFromSeed(globalThis.AI_MIRROR_PERSONA_SEED_DATASET) || FALLBACK_PERSONA_PRIORS;

/* ----------------------------------------------------------------------- *
 * 유틸: robust statistics
 * ----------------------------------------------------------------------- */
function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
// MAD = median(|x - median(x)|), 정규분포 환산 계수 1.4826
function mad(arr) {
  const med = median(arr);
  if (med == null) return null;
  const dev = arr.map(x => Math.abs(x - med));
  const m = median(dev);
  return m == null ? null : m * 1.4826;
}
// Robust z-score: (x - median) / MAD. MAD가 0이면 안전 처리.
function robustZ(x, med, madVal) {
  if (med == null || madVal == null || madVal === 0) return 0;
  return (x - med) / madVal;
}
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

/* ----------------------------------------------------------------------- *
 * 자산군 분류 (Upbit 마켓 기준의 단순 룰; 팀에서 정교화 가능)
 * ----------------------------------------------------------------------- */
function classifyAsset(symbol) {
  const majors = ['BTC', 'ETH'];
  if (majors.includes(symbol)) return 'major';
  // 시가총액/거래대금 데이터가 붙으면 micro 분리. MVP는 alt로 통합.
  return 'alt';
}

/* ======================================================================= *
 * MirrorEngine
 * ======================================================================= */
class MirrorEngine {
  /**
   * @param {object} state  chrome.storage.local 에서 로드한 영속 상태 (없으면 null)
   * @param {string} personaId  온보딩 설문으로 정해진 페르소나
   * @param {function} now  () => epoch ms (테스트 주입용)
   */
  constructor(state, personaId, now = () => Date.now()) {
    this.now = now;
    if (state && state.personaId && PERSONA_PRIORS[state.personaId]) {
      this.state = state;
      this._normalizeState();
    } else {
      this.state = this._initState(personaId);
    }
  }

  _normalizeState() {
    const resolvedId = this.state.personaId in PERSONA_PRIORS ? this.state.personaId : DEFAULT_PERSONA_ID;
    this.state.personaId = resolvedId;
    this.state.persona = PERSONA_PRIORS[resolvedId];
    this.state.regimes = this.state.regimes || {};
    this.state.freq = this.state.freq || {
      ewma: this.state.persona.tradeFrequency,
      effN: 0,
      lastTs: null,
      halfLife: CONFIG.HALF_LIFE_DAYS.tradeFrequency,
    };
    this.state.hourHist = Array.isArray(this.state.hourHist) ? this.state.hourHist : new Array(24).fill(0);
    this.state.interventionLog = Array.isArray(this.state.interventionLog) ? this.state.interventionLog : [];
    this.state.createdAt = this.state.createdAt || this.now();
  }

  _initState(personaId) {
    const resolvedId = personaId in PERSONA_PRIORS ? personaId : DEFAULT_PERSONA_ID;
    const persona = PERSONA_PRIORS[resolvedId] || PERSONA_PRIORS[DEFAULT_PERSONA_ID];
    const state = {
      personaId: resolvedId,
      persona, // prior 보관 (실거래가 적을 때 blend에 사용)
      seedSource: persona.source || 'synthetic_persona_seed',
      // regime별로 분리된 버퍼 + 거래빈도 EWMA. regime 혼합 방지.
      regimes: {},   // { calm:{buffer:[],...}, surge:{...}, ... }
      // 거래 빈도는 regime 무관 전역(생활 리듬) → 별도
      freq: { ewma: persona.tradeFrequency, effN: 0, lastTs: null, halfLife: CONFIG.HALF_LIFE_DAYS.tradeFrequency },
      hourHist: new Array(24).fill(0), // 시간대 분포(가벼운 카운터)
      lastResult: null, // { pct, ts } — 최근 1건만 (revenge 탐지용)
      interventionLog: [], // 최근 개입 시점들(피드백 루프 감지용, 짧게)
      createdAt: this.now(),
    };
    this._applySyntheticSeed(state, persona);
    return state;
  }

  _createRegime() {
    return {
      buffer: [],   // [{ amount, holdDays, ts, synthetic? }] FIFO, 최대 BUFFER_SIZE_PER_REGIME
      effN: 0,      // 유효 표본 크기(시간 decay 반영)
      lastTs: null,
      syntheticSeedCount: 0,
      seededFromPersona: false,
    };
  }

  _ensureRegimeInState(state, regimeKey) {
    if (!state.regimes[regimeKey]) state.regimes[regimeKey] = this._createRegime();
    return state.regimes[regimeKey];
  }

  _regime(regimeKey) {
    return this._ensureRegimeInState(this.state, regimeKey);
  }

  _applySyntheticSeed(state, persona) {
    const sampleTrades = Array.isArray(persona.sampleTrades) ? persona.sampleTrades : [];
    if (!sampleTrades.length) return;

    sampleTrades.forEach(t => {
      const amount = _seedNumber(t.orderAmountKRW, null);
      if (!Number.isFinite(amount)) return;
      const symbol = _coinSymbol(t.coin);
      const mc = t.marketCondition || {};
      const changePct = _seedNumber(mc.shortTermChangeRatePct, 0);
      const volumeRatio = _volumeChangePctToRatio(mc.volumeChangeRatePct);
      const market = this.marketState(symbol, changePct, volumeRatio);
      const reg = this._ensureRegimeInState(state, market.regime);
      const ts = Date.parse(t.timestamp) || this.now();
      const holdHours = _seedNumber(t.holdingPeriodHours, null);
      reg.buffer.push({
        amount,
        holdDays: Number.isFinite(holdHours) ? holdHours / 24 : null,
        ts,
        synthetic: true,
        scenarioTag: t.scenarioTag || null,
      });
      if (reg.buffer.length > CONFIG.BUFFER_SIZE_PER_REGIME) reg.buffer.shift();
      reg.syntheticSeedCount = (reg.syntheticSeedCount || 0) + 1;
      reg.lastTs = reg.lastTs == null ? ts : Math.max(reg.lastTs, ts);
      reg.seededFromPersona = true;
    });

    const total = Object.values(state.regimes).reduce((sum, reg) => sum + (reg.syntheticSeedCount || 0), 0);
    if (!total) return;
    const initialConfidence = clamp(_seedNumber(persona.initialConfidence, 0.45), 0.05, 0.75);
    const targetEffN = CONFIG.K_LOCATION * initialConfidence / Math.max(0.05, 1 - initialConfidence);
    Object.values(state.regimes).forEach(reg => {
      if (!reg.syntheticSeedCount) return;
      reg.effN = round2(Math.max(1, targetEffN * (reg.syntheticSeedCount / total)));
    });
    state.syntheticSeed = {
      source: persona.source || 'synthetic_persona_seed',
      initialConfidence,
      sampleTradeCount: sampleTrades.length,
      note: 'sampleTrades are stored only as behavioral features for cold-start, not as actual user history.',
    };
  }

  /* --------------------------------------------------------------------- *
   * baseline 산출: 페르소나 prior + (해당 regime의) 버퍼를 blend
   * --------------------------------------------------------------------- */
  _baseline(regimeKey) {
    const persona = this.state.persona;
    const reg = this._regime(regimeKey);

    // 버퍼에서 시간가중 적용한 robust 통계
    const amounts = reg.buffer.map(b => b.amount);
    const holds   = reg.buffer.map(b => b.holdDays).filter(v => v != null);

    const obsAmtMed = median(amounts);
    const obsAmtMad = mad(amounts);
    const obsHoldMed = median(holds);
    const obsHoldMad = mad(holds);

    const n = reg.effN; // 유효표본

    // credibility blending: (k*prior + n*obs) / (k+n)
    const blend = (priorV, obsV, k) =>
      obsV == null ? priorV : (k * priorV + n * obsV) / (k + n);

    return {
      regimeKey,
      effN: n,
      amount: {
        med: blend(persona.amount.m,   obsAmtMed,  CONFIG.K_LOCATION),
        mad: blend(persona.amount.mad, obsAmtMad,  CONFIG.K_SPREAD),
      },
      holdDays: {
        med: blend(persona.holdDays.m,   obsHoldMed, CONFIG.K_LOCATION),
        mad: blend(persona.holdDays.mad, obsHoldMad, CONFIG.K_SPREAD),
      },
      freq: this.state.freq.ewma,
    };
  }

  /* --------------------------------------------------------------------- *
   * 신뢰도: 유효표본 + 최근성(staleness) 결합.
   * cold-start와 "오래 쉬었다 복귀"를 같은 메커니즘으로 처리.
   * --------------------------------------------------------------------- */
  _confidence(regimeKey) {
    const reg = this._regime(regimeKey);
    const n = reg.effN;
    const priorConf = this.state.syntheticSeed?.initialConfidence ?? this.state.persona?.initialConfidence ?? 0;
    const sampleConf = n > 0 ? n / (n + CONFIG.K_LOCATION) : priorConf; // 0~1

    let recency = 1;
    if (reg.lastTs != null) {
      const days = (this.now() - reg.lastTs) / ONE_DAY;
      recency = Math.pow(0.5, days / CONFIG.STALE_HALF_LIFE_DAYS);
    }
    return clamp(sampleConf * recency, 0, 1);
  }

  /* --------------------------------------------------------------------- *
   * 시장 상태: 페이지에서 읽은 값(변동률/거래량비)을 자산군 임계로 해석
   * regime 키도 여기서 결정 (버퍼 분리 기준).
   * --------------------------------------------------------------------- */
  marketState(symbol, changePct, volumeRatio) {
    const cls = classifyAsset(symbol);
    const th = CONFIG.MARKET_THRESHOLDS[cls];
    const up = changePct >= th.changeAlert;
    const down = changePct <= -th.changeAlert;
    const volSpike = volumeRatio >= th.volumeRatioAlert;

    let regime = 'calm';
    if (up) regime = 'surge';
    else if (down) regime = 'crash';
    else if (volSpike || Math.abs(changePct) >= th.changeAlert * 0.6) regime = 'volatile';

    const intensity = clamp(
      Math.abs(changePct) / th.changeAlert * 50 + (volumeRatio - 1) / (th.volumeRatioAlert - 1) * 50,
      0, 100
    );
    return { assetClass: cls, regime, intensity, up, down, volSpike, changePct, volumeRatio };
  }

  /* --------------------------------------------------------------------- *
   * Deviation Score — "위험"이 아니라 "평소와의 거리"
   * 신뢰도와 피드백-루프 보정을 곱해 false positive(과잉개입)를 억제.
   * --------------------------------------------------------------------- */
  evaluate(trade) {
    // trade: { symbol, amount, side('buy'|'sell'), intendedHoldDays, changePct, volumeRatio }
    const market = this.marketState(trade.symbol, trade.changePct, trade.volumeRatio);
    const base = this._baseline(market.regime);
    const conf = this._confidence(market.regime);

    const reasons = [];
    let raw = 0;

    // (1) 금액 이탈 (robust z)
    const zAmt = robustZ(trade.amount, base.amount.med, base.amount.mad);
    if (zAmt >= 1.5) {
      const pts = clamp(zAmt * 10, 0, 45);
      raw += pts;
      const ratio = base.amount.med ? (trade.amount / base.amount.med) : 1;
      reasons.push({
        feature: 'amount',
        text: `이 주문 금액은 ${market.regime} 상황에서의 평소 중앙값(약 ${won(base.amount.med)})의 ${ratio.toFixed(1)}배입니다.`,
        z: round1(zAmt),
      });
    }

    // (2) 보유 의도 이탈 (평소보다 훨씬 짧게 들려는 의도 등)
    if (trade.intendedHoldDays != null) {
      const zHold = robustZ(trade.intendedHoldDays, base.holdDays.med, base.holdDays.mad);
      if (zHold <= -1.5) {
        raw += clamp(Math.abs(zHold) * 8, 0, 20);
        reasons.push({
          feature: 'holdDays',
          text: `평소 ${market.regime} 거래의 보유 기간 중앙값은 약 ${Math.round(base.holdDays.med)}일인데, 이번엔 ${trade.intendedHoldDays}일을 의도하고 있습니다.`,
          z: round1(zHold),
        });
      }
    }

    // (3) 시장 강도 (감정을 흔드는 환경인지)
    if (market.intensity >= 50) {
      raw += clamp((market.intensity - 45) * 0.45, 0, 25);
      reasons.push({
        feature: 'market',
        text: `현재 ${trade.symbol}은(는) 24시간 ${signed(trade.changePct)}% 변동, 거래량 평소의 ${trade.volumeRatio.toFixed(1)}배입니다.`,
      });
    }

    // (4) 선호 기준선에서 벗어난 자산 진입
    const preferred = this.state.persona?.preferredCoins || [];
    if (trade.side === 'buy' && preferred.length) {
      const normalizedCoin = `KRW-${String(trade.symbol || '').toUpperCase()}`;
      if (!preferred.includes(normalizedCoin)) {
        raw += 12;
        reasons.push({
          feature: 'asset',
          text: `${trade.symbol}은(는) 이 초기 기준선의 주요 선호 자산 목록에 자주 등장하지 않습니다.`,
        });
      }
    }

    // (5) 직전 손실 직후 재진입 (revenge timing — 단정 아님, 타이밍 사실만)
    const lr = this.state.lastResult;
    if (lr && lr.pct < 0) {
      const hrs = (this.now() - lr.ts) / (60 * 60 * 1000);
      if (hrs <= 6) {
        raw += 22;
        reasons.push({
          feature: 'timing',
          text: `직전 거래에서 ${signed(lr.pct)}% 손실 뒤 ${hrs.toFixed(1)}시간 만의 거래입니다.`,
        });
      }
    }

    // Deviation Score는 거리 자체를 보여주고, confidence는 별도 표시한다.
    // cold-start seed는 낮은 신뢰도로 시작하지만, 점수 자체를 0으로 누르지는 않는다.
    const chill = this._chillFactor();
    let score = Math.round(raw * chill);
    score = clamp(score, 0, 100);

    const biases = this._detectBiases(trade, market, base);

    // 개입 단계 결정 (강제 Delay 없음)
    let stage = 'silent';
    const hasSyntheticBaseline = !!this.state.syntheticSeed;
    if (!hasSyntheticBaseline && base && this._regime(market.regime).effN < CONFIG.OBSERVE_ONLY_TRADE_COUNT && reasons.length) {
      stage = 'observe'; // 데이터 부족 → 개입 대신 투명 고지
    } else if (score >= CONFIG.INTERVENTION.reflectFrom) {
      stage = 'reflect';
    } else if (score >= CONFIG.INTERVENTION.noticeFrom) {
      stage = 'notice';
    }

    return {
      score, stage, confidence: round2(conf),
      chillFactor: round2(chill),
      market, baseline: base, reasons, biases,
      observeOnly: stage === 'observe',
    };
  }

  /* --------------------------------------------------------------------- *
   * 행동 편향 탐지 — 단정 금지. "가능성 + 근거"만.
   * --------------------------------------------------------------------- */
  _detectBiases(trade, market, base) {
    const out = [];
    const ratio = base.amount.med ? trade.amount / base.amount.med : 1;

    if (trade.side === 'buy' && market.up && ratio >= 1.2) {
      out.push({ name: 'FOMO 가능성',
        evidence: `급등(${signed(trade.changePct)}%) 국면에서 평소보다 큰 금액(${ratio.toFixed(1)}배)의 매수입니다.` });
    }
    const lr = this.state.lastResult;
    if (lr && lr.pct < 0) {
      const hrs = (this.now() - lr.ts) / 3.6e6;
      if (hrs <= 6 && ratio >= 1.1) {
        out.push({ name: '복구 매매(Revenge) 가능성',
          evidence: `직전 손실(${signed(lr.pct)}%) 후 ${hrs.toFixed(1)}시간 내, 평소보다 큰 금액의 재진입입니다.` });
      }
    }
    if (trade.side === 'sell' && market.down) {
      out.push({ name: '패닉 셀 가능성',
        evidence: `24시간 ${signed(trade.changePct)}% 하락 국면에서의 매도입니다.` });
    }
    if (this.state.freq.ewma > 0 && trade._recentBurst && trade._recentBurst > this.state.freq.ewma * 1.8) {
      out.push({ name: '과신(Overconfidence) 가능성',
        evidence: `최근 거래 빈도가 평소(주 ${this.state.freq.ewma.toFixed(1)}회)보다 뚜렷이 높습니다.` });
    }
    return out;
  }

  /* --------------------------------------------------------------------- *
   * 피드백 루프(자기왜곡) 보정:
   * 개입 직후 거래가 일관되게 위축되면 개입 민감도를 낮춘다.
   * "거울이 대상을 바꾸는" observer effect 완화 장치.
   * --------------------------------------------------------------------- */
  _chillFactor() {
    const log = this.state.interventionLog;
    if (log.length < CONFIG.CHILL_EFFECT.lookback) return 1;
    const recent = log.slice(-CONFIG.CHILL_EFFECT.lookback);
    // 개입 직후 거래 금액들이 평소 대비 얼마나 작아졌는지
    const shrinks = recent.map(e => e.postRatio).filter(v => v != null);
    if (shrinks.length < CONFIG.CHILL_EFFECT.lookback) return 1;
    const avg = shrinks.reduce((a, b) => a + b, 0) / shrinks.length;
    if (avg < CONFIG.CHILL_EFFECT.shrinkRatio) {
      return CONFIG.CHILL_EFFECT.sensitivityFloor; // 위축 감지 → 민감도 하향
    }
    return 1;
  }

  /* --------------------------------------------------------------------- *
   * 거래 확정 후 호출 — 버퍼/통계량을 시간 decay와 함께 갱신.
   * 원본은 저장하지 않고 feature만, regime별 고정 버퍼에 FIFO push.
   * --------------------------------------------------------------------- */
  commitTrade(trade, evalResult) {
    const ts = this.now();
    const regimeKey = evalResult.market.regime;
    const reg = this._regime(regimeKey);

    // 유효표본 decay 갱신
    if (reg.lastTs != null) {
      const days = (ts - reg.lastTs) / ONE_DAY;
      const decay = Math.pow(0.5, days / CONFIG.HALF_LIFE_DAYS.amount);
      reg.effN = reg.effN * decay + 1;
    } else {
      reg.effN = 1;
    }
    reg.lastTs = ts;

    // 고정 크기 롤링 버퍼 (FIFO)
    reg.buffer.push({
      amount: trade.amount,
      holdDays: trade.intendedHoldDays ?? null,
      ts,
    });
    if (reg.buffer.length > CONFIG.BUFFER_SIZE_PER_REGIME) {
      reg.buffer.shift(); // 오래된 것 자동 삭제
    }

    // 거래빈도 EWMA (regime 무관)
    const f = this.state.freq;
    if (f.lastTs != null) {
      const days = (ts - f.lastTs) / ONE_DAY;
      const instFreq = 7 / Math.max(days, 0.04); // 이번 간격 기준 주당 환산
      const alpha = 1 - Math.pow(0.5, days / f.halfLife);
      f.ewma = f.ewma * (1 - alpha) + instFreq * alpha;
      f.effN = f.effN * Math.pow(0.5, days / f.halfLife) + 1;
    } else {
      f.effN = 1;
    }
    f.lastTs = ts;

    // 시간대 히스토그램
    const hour = new Date(ts).getHours();
    this.state.hourHist[hour] += 1;

    // 최근 손익(있으면) — 다음 거래의 revenge 타이밍 판단용
    if (trade.resultPct != null) {
      this.state.lastResult = { pct: trade.resultPct, ts };
    }

    // 개입 로그 (피드백 루프 감지용): 이번 거래가 개입을 받았다면 기록.
    // postRatio 는 다음 거래 commit 때 직전 개입 항목에 채워진다.
    if (evalResult.stage === 'notice' || evalResult.stage === 'reflect') {
      this.state.interventionLog.push({ ts, atRatio: this._ratioVsBaseline(trade, regimeKey), postRatio: null });
    } else {
      // 직전 개입 항목의 후속 거래 비율을 채워 위축 여부 추적
      const open = [...this.state.interventionLog].reverse().find(e => e.postRatio == null);
      if (open) open.postRatio = this._ratioVsBaseline(trade, regimeKey);
    }
    // 로그는 짧게 유지
    if (this.state.interventionLog.length > 20) {
      this.state.interventionLog = this.state.interventionLog.slice(-20);
    }

    return this.state; // 호출측이 chrome.storage.local.set 으로 영속화
  }

  _ratioVsBaseline(trade, regimeKey) {
    const base = this._baseline(regimeKey);
    return base.amount.med ? trade.amount / base.amount.med : 1;
  }

  /* 사용자 권리: 전체 초기화 (삭제권). */
  reset(personaId) {
    this.state = this._initState(personaId || this.state.personaId);
    return this.state;
  }

  /* 사용자 권리: 열람 — 무엇을 들고 있는지 그대로 보여줌 (투명성). */
  inspect() {
    return JSON.parse(JSON.stringify(this.state));
  }
}

/* ----------------------------------------------------------------------- *
 * format helpers
 * ----------------------------------------------------------------------- */
function won(n) {
  if (n == null) return '—';
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '억';
  if (n >= 1e4) return Math.round(n / 1e4) + '만';
  return Math.round(n).toLocaleString();
}
function signed(n) { return (n > 0 ? '+' : '') + (Math.round(n * 10) / 10); }
function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }

/* export (Chrome content script에서는 그냥 전역 사용, Node 데모에서는 module) */
if (typeof module !== 'undefined') {
  module.exports = { MirrorEngine, CONFIG, PERSONA_PRIORS, classifyAsset, won };
}
