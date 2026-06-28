/* =========================================================================
 * mIrror — Upbit external risk provider
 * -------------------------------------------------------------------------
 * Purpose:
 *   Fetch public Upbit market-event fields and convert them into a neutral
 *   asset-risk signal that MirrorEngine can compare with the user's persona.
 *
 * Important boundaries:
 *   - This does not predict price movement.
 *   - This does not recommend or block trades.
 *   - Official Upbit market-event flags are kept separate from our derived
 *     volatility grade so the UI can say exactly which part came from API data.
 * ========================================================================= */

(function () {
  const MARKET_ALL_URL = 'https://api.upbit.com/v1/market/all?is_details=true';
  const MARKET_ALL_FALLBACK_URL = 'https://api.upbit.com/v1/market/all?isDetails=true';
  const CACHE_TTL_MS = 5 * 60 * 1000;
  const FETCH_TIMEOUT_MS = 4500;

  const CAUTION_TYPE_LABELS_KO = {
    PRICE_FLUCTUATIONS: '가격 급등락 경보',
    TRADING_VOLUME_SOARING: '거래량 급등 경보',
    DEPOSIT_AMOUNT_SOARING: '입금량 급등 경보',
    GLOBAL_PRICE_DIFFERENCES: '가격 차이 경보',
    CONCENTRATION_OF_SMALL_ACCOUNTS: '소수 계정 집중 경보',
  };

  const LEVEL_RANK = { normal: 0, caution: 1, warning: 2, danger: 3 };
  const LEVEL_LABEL_KO = {
    normal: '보통',
    caution: '주의',
    warning: '경고',
    danger: '위험',
  };

  let cachedMarketMap = null;
  let cachedAt = 0;
  let inflight = null;

  function normalizeMarket(symbolOrMarket) {
    const s = String(symbolOrMarket || '').trim().toUpperCase();
    if (!s) return 'KRW-BTC';
    if (/^(KRW|BTC|USDT)-[A-Z0-9]+$/.test(s)) return s;
    const codeMatch = s.match(/CRIX\.UPBIT\.KRW-([A-Z0-9]+)/);
    if (codeMatch) return `KRW-${codeMatch[1]}`;
    const cleaned = s.replace(/^KRW[-.]?/i, '').replace(/[^A-Z0-9]/g, '');
    return `KRW-${cleaned || 'BTC'}`;
  }

  function symbolFromMarket(market) {
    return String(market || '').replace(/^KRW-?/i, '').replace(/[^A-Z0-9]/g, '').toUpperCase() || 'UNKNOWN';
  }

  function canUseExtensionRuntime() {
    return !!(globalThis.chrome && chrome.runtime && chrome.runtime.id && typeof chrome.runtime.sendMessage === 'function');
  }

  function fetchMarketAllViaBackground() {
    if (!canUseExtensionRuntime()) return Promise.reject(new Error('extension runtime unavailable'));
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error('background API timeout'));
      }, FETCH_TIMEOUT_MS + 1200);

      try {
        chrome.runtime.sendMessage({ type: 'MIRROR_UPBIT_MARKET_ALL' }, response => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);

          const lastError = chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message || 'background message failed'));
            return;
          }
          if (!response || response.ok !== true) {
            reject(new Error(response?.error || 'background API failed'));
            return;
          }
          resolve(response.rows || []);
        });
      } catch (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      }
    });
  }

  async function fetchJsonWithTimeout(url) {
    // In content scripts, direct fetch uses the page origin and is blocked when
    // api.upbit.com does not return Access-Control-Allow-Origin for upbit.com.
    // Ask the extension service worker to fetch the allow-listed public API.
    if (url === MARKET_ALL_URL || url === MARKET_ALL_FALLBACK_URL) {
      if (canUseExtensionRuntime()) {
        return await fetchMarketAllViaBackground();
      }
      // Keep direct fetch only for non-extension contexts such as local Node tests.
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'omit',
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`Upbit API ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function toMarketMap(rows) {
    const map = {};
    if (!Array.isArray(rows)) return map;
    rows.forEach(row => {
      if (!row || !row.market) return;
      map[String(row.market).toUpperCase()] = row;
    });
    return map;
  }

  async function loadMarketMap() {
    const now = Date.now();
    if (cachedMarketMap && now - cachedAt < CACHE_TTL_MS) return cachedMarketMap;
    if (inflight) return inflight;

    inflight = (async () => {
      let rows = await fetchJsonWithTimeout(MARKET_ALL_URL);
      let map = toMarketMap(rows);

      // Some examples and older wrappers use isDetails. Keep a harmless fallback
      // in case a local proxy or API version ignores is_details.
      const sample = Object.values(map)[0];
      if (sample && !sample.market_event && !sample.market_warning) {
        try {
          rows = await fetchJsonWithTimeout(MARKET_ALL_FALLBACK_URL);
          map = toMarketMap(rows);
        } catch (_) {
          // Keep the first successful response.
        }
      }

      cachedMarketMap = map;
      cachedAt = Date.now();
      inflight = null;
      return cachedMarketMap;
    })().catch(err => {
      inflight = null;
      throw err;
    });

    return inflight;
  }

  function cautionTypesFromInfo(info) {
    const event = info?.market_event || {};
    const caution = event.caution || info?.caution || {};
    if (Array.isArray(caution)) return caution.map(String).filter(Boolean);
    if (typeof caution === 'string') return caution && caution !== 'NONE' ? [caution] : [];
    if (caution && typeof caution === 'object') {
      return Object.entries(caution)
        .filter(([, value]) => value === true || value === 'true' || value === 1)
        .map(([key]) => key);
    }
    return [];
  }

  function hasInvestmentWarning(info) {
    const event = info?.market_event || {};
    if (event.warning === true || event.warning === 'true' || event.warning === 1) return true;
    // Global / older field compatibility.
    const legacy = String(info?.market_warning || '').toUpperCase();
    return legacy === 'CAUTION' || legacy === 'WARNING';
  }

  function derivedLevel(snapshot) {
    const changePct = Number(snapshot?.changePct ?? snapshot?.shortTermChangeRatePct ?? 0);
    const volumeRatio = Number(snapshot?.volumeRatio ?? 1);
    const absChange = Math.abs(Number.isFinite(changePct) ? changePct : 0);
    const vol = Number.isFinite(volumeRatio) ? volumeRatio : 1;

    if (absChange >= 12 || vol >= 4.0) return 'danger';
    if (absChange >= 8 || vol >= 2.8) return 'warning';
    if (absChange >= 5 || vol >= 2.0) return 'caution';
    return 'normal';
  }

  function maxLevel(a, b) {
    return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;
  }

  function buildOfficialBadges(investmentWarning, cautionTypes) {
    const badges = [];
    if (investmentWarning) {
      badges.push({
        code: 'MARKET_EVENT_WARNING',
        labelKo: '유의 종목',
        sourceField: 'market_event.warning',
      });
    }
    cautionTypes.forEach(code => {
      badges.push({
        code,
        labelKo: CAUTION_TYPE_LABELS_KO[code] || code,
        sourceField: `market_event.caution.${code}`,
      });
    });
    return badges;
  }

  function buildRisk(market, info, snapshot, apiStatus) {
    const cautionTypes = cautionTypesFromInfo(info);
    const investmentWarning = hasInvestmentWarning(info);
    const officialBadges = buildOfficialBadges(investmentWarning, cautionTypes);
    const officialBadgeLabelsKo = officialBadges.map(b => b.labelKo);
    const officialLevel = investmentWarning ? 'danger' : (cautionTypes.length ? 'warning' : 'normal');
    const localLevel = derivedLevel(snapshot);
    const combinedLevel = maxLevel(officialLevel, localLevel);

    const reasons = [];
    if (investmentWarning) {
      reasons.push('업비트 딱지: 유의 종목으로 표시되어 있습니다.');
    }
    if (cautionTypes.length) {
      const labels = officialBadges
        .filter(b => b.sourceField.startsWith('market_event.caution'))
        .map(b => b.labelKo)
        .join(', ');
      reasons.push(`업비트 딱지: ${labels}.`);
    }
    if (localLevel !== 'normal') {
      const changePct = Number(snapshot?.changePct ?? 0);
      const volumeRatio = Number(snapshot?.volumeRatio ?? 1);
      reasons.push(`현재 화면 기준 변동성 신호: 24h ${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}%, 거래량 ${volumeRatio.toFixed(1)}x.`);
    }

    return {
      market,
      symbol: symbolFromMarket(market),
      apiStatus,
      fetchedAt: Date.now(),
      official: {
        investmentWarning,
        cautionTypes,
        cautionLabelsKo: cautionTypes.map(t => CAUTION_TYPE_LABELS_KO[t] || t),
        badges: officialBadges,
        badgeLabelsKo: officialBadgeLabelsKo,
        hasBadge: officialBadges.length > 0,
        summaryKo: officialBadgeLabelsKo.join(', '),
        level: officialLevel,
        labelKo: LEVEL_LABEL_KO[officialLevel],
      },
      derived: {
        level: localLevel,
        labelKo: LEVEL_LABEL_KO[localLevel],
      },
      combinedLevel,
      combinedLabelKo: LEVEL_LABEL_KO[combinedLevel],
      score: LEVEL_RANK[combinedLevel] * 25,
      reasons,
      source: 'upbit_public_market_event',
    };
  }

  async function getRiskForSymbol(symbolOrMarket, snapshot = {}) {
    const market = normalizeMarket(symbolOrMarket);
    try {
      const map = await loadMarketMap();
      return buildRisk(market, map[market] || null, snapshot, map[market] ? 'ok' : 'market_not_found');
    } catch (err) {
      return buildRisk(market, null, snapshot, `failed: ${err?.message || 'unknown'}`);
    }
  }

  function officialSummaryKo(risk) {
    if (!risk) return '';
    const labels = risk.official?.badgeLabelsKo || risk.official?.badges?.map(b => b.labelKo) || [];
    return labels.filter(Boolean).join(', ');
  }

  function hasOfficialBadge(risk) {
    return !!officialSummaryKo(risk);
  }

  function summarizeKo(risk) {
    return officialSummaryKo(risk);
  }

  globalThis.UpbitRiskProvider = {
    getRiskForSymbol,
    summarizeKo,
    officialSummaryKo,
    hasOfficialBadge,
    normalizeMarket,
    labels: { CAUTION_TYPE_LABELS_KO, LEVEL_LABEL_KO },
    _internal: { loadMarketMap, buildRisk, derivedLevel, buildOfficialBadges },
  };

  if (typeof module !== 'undefined') {
    module.exports = globalThis.UpbitRiskProvider;
  }
})();
