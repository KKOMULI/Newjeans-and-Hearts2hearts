/* =========================================================================
 * mIrror — background API proxy
 * -------------------------------------------------------------------------
 * Content scripts run inside the Upbit page origin, so direct calls from
 * content.js/upbit-risk.js to https://api.upbit.com may be blocked by CORS.
 * This service worker performs a small, allow-listed public API request from
 * the extension origin and returns only parsed JSON to the content script.
 * ========================================================================= */

const MIRROR_UPBIT_MARKET_ALL_URL = 'https://api.upbit.com/v1/market/all?is_details=true';
const MIRROR_UPBIT_MARKET_ALL_FALLBACK_URL = 'https://api.upbit.com/v1/market/all?isDetails=true';
const MIRROR_UPBIT_CACHE_TTL_MS = 5 * 60 * 1000;
const MIRROR_UPBIT_FETCH_TIMEOUT_MS = 4500;

let mirrorUpbitMarketAllCache = null;
let mirrorUpbitMarketAllCachedAt = 0;
let mirrorUpbitMarketAllInflight = null;

function mirrorIsMarketEventDetailed(rows) {
  if (!Array.isArray(rows) || !rows.length) return false;
  return rows.some(row => row && (row.market_event || row.market_warning || row.caution));
}

async function mirrorFetchJsonWithTimeout(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MIRROR_UPBIT_FETCH_TIMEOUT_MS);
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

async function mirrorLoadUpbitMarketAll() {
  const now = Date.now();
  if (mirrorUpbitMarketAllCache && now - mirrorUpbitMarketAllCachedAt < MIRROR_UPBIT_CACHE_TTL_MS) {
    return mirrorUpbitMarketAllCache;
  }
  if (mirrorUpbitMarketAllInflight) return mirrorUpbitMarketAllInflight;

  mirrorUpbitMarketAllInflight = (async () => {
    let rows = await mirrorFetchJsonWithTimeout(MIRROR_UPBIT_MARKET_ALL_URL);

    // Keep compatibility with older wrappers/docs that used isDetails.
    if (!mirrorIsMarketEventDetailed(rows)) {
      try {
        const fallbackRows = await mirrorFetchJsonWithTimeout(MIRROR_UPBIT_MARKET_ALL_FALLBACK_URL);
        if (Array.isArray(fallbackRows) && fallbackRows.length) rows = fallbackRows;
      } catch (_) {
        // The primary response is still usable for the market list.
      }
    }

    mirrorUpbitMarketAllCache = Array.isArray(rows) ? rows : [];
    mirrorUpbitMarketAllCachedAt = Date.now();
    mirrorUpbitMarketAllInflight = null;
    return mirrorUpbitMarketAllCache;
  })().catch(err => {
    mirrorUpbitMarketAllInflight = null;
    throw err;
  });

  return mirrorUpbitMarketAllInflight;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'MIRROR_UPBIT_MARKET_ALL') return false;

  // Do not proxy arbitrary URLs from a content script. This handler supports
  // only the one public Upbit market-event endpoint needed by mIrror.
  mirrorLoadUpbitMarketAll()
    .then(rows => sendResponse({ ok: true, rows, cachedAt: mirrorUpbitMarketAllCachedAt }))
    .catch(err => sendResponse({ ok: false, error: err?.message || 'unknown' }));

  return true;
});
