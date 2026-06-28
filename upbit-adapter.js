/* =========================================================================
 * Upbit Adapter — 페이지에서 "이미 화면에 렌더된 숫자"만 읽는 격리 계층
 * -------------------------------------------------------------------------
 * 원칙:
 *   - API 키·세션·로그인 정보를 절대 만지지 않는다.
 *   - 주문 원장(체결 내역 원본)을 긁지 않는다. 지금 입력 중인 한 건의
 *     스냅샷(종목/가격/금액/매수매도)과, 화면에 표시된 시세만 읽는다.
 *   - 자동 입력·자동 클릭을 하지 않는다. 버튼을 누르는 건 항상 사용자.
 * ========================================================================= */

const SELECTORS = {
  orderPane: '[class*="orderbook"], [class*="OrderForm"], [class*="order_form"], #order_form, form',
  amountInput: 'input[name*="amount"], input[id*="amount"], input[class*="amount"], input[placeholder*="금액"], input[aria-label*="금액"]',
  priceInput: 'input[name*="price"], input[id*="price"], input[class*="price"], input[placeholder*="가격"], input[aria-label*="가격"], input[placeholder*="주문가"], input[aria-label*="주문가"]',
  quantityInput: 'input[name*="volume"], input[name*="quantity"], input[id*="volume"], input[id*="quantity"], input[class*="volume"], input[class*="quantity"], input[placeholder*="수량"], input[aria-label*="수량"]',
  buyButton: 'button[class*="buy"], .ord_btn_buy, button[aria-label*="매수"], button',
  sellButton: 'button[class*="sell"], .ord_btn_sell, button[aria-label*="매도"], button',
  symbolLabel: '[class*="coin_code"], [class*="symbol"], [class*="market"]',
  changeRate: '[class*="change_rate"], [class*="changeRate"], [class*="change"]',
  volume24h: '[class*="acc_trade_volume"], [class*="trade_volume"], [class*="volume"]',
  currentPrice: '[class*="trade_price"], [class*="current_price"], [class*="price"]',
};

function isVisible(el) {
  if (!el || el.disabled || el.type === 'hidden') return false;
  const rect = el.getBoundingClientRect?.();
  if (!rect) return true;
  const style = getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

function parseNumeric(value) {
  const text = String(value ?? '')
    .replace(/[,\s]/g, '')
    .replace(/[₩원KRW]/gi, '');
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function inputMeta(el) {
  if (!el) return '';
  const label = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
  const parent = el.closest('label, div, li, section, article, form');
  return normalizeText([
    el.name,
    el.id,
    el.className,
    el.placeholder,
    el.getAttribute('aria-label'),
    label?.textContent,
    parent?.textContent,
  ].join(' '));
}

function allVisibleInputs() {
  return Array.from(document.querySelectorAll('input')).filter(isVisible);
}

function readInputValue(el) {
  if (!el) return null;
  return parseNumeric(el.value || el.getAttribute('value') || el.textContent || '');
}

function findInputByKeywords(required, blocked = []) {
  const req = required.map(normalizeText);
  const ban = blocked.map(normalizeText);
  const inputs = allVisibleInputs();
  const scored = inputs.map((el, idx) => {
    const meta = inputMeta(el);
    const blockedHit = ban.some(k => k && meta.includes(k));
    if (blockedHit) return null;
    const score = req.reduce((s, k) => s + (k && meta.includes(k) ? 1 : 0), 0);
    if (score <= 0) return null;
    return { el, score, idx };
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.idx - b.idx);
  return scored[0]?.el || null;
}

function buttonMatchesSide(btn, side) {
  if (!isVisible(btn) || btn.dataset?.mirrorDemoBuy || btn.dataset?.aimDemoBuy) return false;
  const text = normalizeText([btn.textContent, btn.getAttribute('aria-label'), btn.className, btn.id].join(' '));
  if (side === 'buy') return text.includes('매수') || text.includes('buy');
  if (side === 'sell') return text.includes('매도') || text.includes('sell');
  return false;
}

const UpbitAdapter = {
  /** 현재 종목 심볼 (예: 'BTC'). 마켓 표기 'KRW-BTC' → 'BTC'. */
  readSymbol() {
    const code = new URLSearchParams(location.search).get('code') || '';
    let raw = '';
    const codeMatch = code.match(/CRIX\.UPBIT\.KRW-([A-Z0-9]+)/i) || code.match(/KRW[-.]?([A-Z0-9]+)/i);
    if (codeMatch) raw = codeMatch[1];
    if (!raw) {
      const el = Array.from(document.querySelectorAll(SELECTORS.symbolLabel)).find(isVisible);
      raw = el ? el.textContent.trim() : '';
    }
    if (!raw) raw = location.pathname.split('/').pop() || '';
    raw = raw.replace(/KRW-?/i, '').replace(/^CRIXUPBIT/i, '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return raw || 'UNKNOWN';
  },

  /** 24h 변동률(%) — 화면 표시값 파싱. 실패 시 0. */
  readChangePct() {
    const nodes = Array.from(document.querySelectorAll(SELECTORS.changeRate)).filter(isVisible);
    const el = nodes.find(x => /%/.test(x.textContent || '')) || nodes[0];
    if (!el) return 0;
    const raw = el.textContent || '';
    const n = parseNumeric(raw);
    let v = n == null ? 0 : n;
    if (/down|minus|fall|하락|−|-/.test(String(el.className) + raw) && v > 0) v = -v;
    return v;
  },

  /** 거래량 "평소 대비 비율". 절대 거래량만 보이면 로컬 EWMA 기준선과 비교. */
  readVolumeRatio(volumeBaseline) {
    const el = Array.from(document.querySelectorAll(SELECTORS.volume24h)).find(isVisible);
    const vol = el ? parseNumeric(el.textContent) : null;
    if (vol == null || !volumeBaseline) return 1.0;
    return Math.max(0.1, vol / volumeBaseline);
  },

  /** 현재가. 실패하면 null. */
  readCurrentPrice() {
    const direct = Array.from(document.querySelectorAll(SELECTORS.currentPrice))
      .filter(el => isVisible(el) && el.id !== 'mirrorDemoPrice')
      .map(el => parseNumeric(el.textContent))
      .find(v => v != null && v > 0);
    if (direct != null) return direct;

    const own = document.getElementById('mirrorDemoPrice');
    return readInputValue(own);
  },

  /** 지금 주문 폼에 입력된 지정가/매수가. 비어있으면 null. */
  readOrderPrice() {
    const direct = Array.from(document.querySelectorAll(SELECTORS.priceInput))
      .find(el => isVisible(el) && el.id !== 'mirrorDemoPrice');
    const directVal = readInputValue(direct);
    if (directVal != null) return directVal;

    const labelled = findInputByKeywords(['가격', '주문가', '매수가', '매도가', 'price'], ['금액', '총액', '수량', 'amount', 'quantity', 'volume']);
    const labelledVal = labelled?.id === 'mirrorDemoPrice' ? null : readInputValue(labelled);
    if (labelledVal != null) return labelledVal;

    const own = document.getElementById('mirrorDemoPrice');
    return readInputValue(own);
  },

  /** 지금 주문 폼에 입력된 수량. 비어있으면 null. */
  readOrderQuantity() {
    const direct = Array.from(document.querySelectorAll(SELECTORS.quantityInput)).find(isVisible);
    const directVal = readInputValue(direct);
    if (directVal != null) return directVal;

    const labelled = findInputByKeywords(['수량', 'quantity', 'volume'], ['가격', '주문가', '금액', '총액', 'amount', 'price']);
    return readInputValue(labelled);
  },

  /** 지금 주문 폼에 입력된 금액(원). 비어있으면 가격×수량으로 추정. */
  readOrderAmount() {
    const direct = Array.from(document.querySelectorAll(SELECTORS.amountInput))
      .find(el => isVisible(el) && el.id !== 'mirrorDemoAmount');
    const directVal = readInputValue(direct);
    if (directVal != null) return directVal;

    const labelled = findInputByKeywords(['주문금액', '매수금액', '매도금액', '총액', 'amount', 'krw'], ['가격', '주문가', '수량', 'price', 'quantity', 'volume']);
    const labelledVal = labelled?.id === 'mirrorDemoAmount' ? null : readInputValue(labelled);
    if (labelledVal != null) return labelledVal;

    const price = this.readOrderPrice();
    const qty = this.readOrderQuantity();
    if (price != null && qty != null) return price * qty;

    const own = document.getElementById('mirrorDemoAmount');
    return readInputValue(own);
  },

  readOrderSnapshot(side = 'buy') {
    const priceKRW = this.readOrderPrice() || this.readCurrentPrice();
    const quantity = this.readOrderQuantity();
    const amount = this.readOrderAmount();
    return {
      side,
      symbol: this.readSymbol(),
      priceKRW: priceKRW ?? null,
      quantity: quantity ?? (amount && priceKRW ? amount / priceKRW : null),
      amount: amount ?? (priceKRW && quantity ? priceKRW * quantity : null),
      orderType: priceKRW ? 'limit' : 'market',
    };
  },

  /** 매수/매도 버튼에 "확정 직전" 관찰 후킹. 원래 동작은 막지 않는다. */
  hookOrderButtons(onIntent) {
    const wire = (side) => {
      Array.from(document.querySelectorAll('button')).forEach(btn => {
        if (!buttonMatchesSide(btn, side) || btn.dataset.mirrorHooked) return;
        btn.dataset.mirrorHooked = '1';
        btn.addEventListener('focus', () => onIntent(side), true);
        btn.addEventListener('mouseenter', () => onIntent(side), true);
        btn.addEventListener('click', () => onIntent(side), true);
      });
    };
    wire('buy');
    wire('sell');
  },

  /** 가격/금액 입력 중 사전 경고 배너를 갱신하기 위한 후킹. */
  hookOrderInputs(onInput) {
    const wire = (el) => {
      if (!el || el.dataset.mirrorInputHooked) return;
      el.dataset.mirrorInputHooked = '1';
      ['input', 'change', 'keyup', 'paste'].forEach(evt => {
        el.addEventListener(evt, () => onInput(this.readOrderSnapshot('buy')), true);
      });
    };
    allVisibleInputs().forEach(wire);
    wire(document.getElementById('mirrorDemoPrice'));
    wire(document.getElementById('mirrorDemoAmount'));
  },

  /** 배너를 주문 폼 아래에 붙이기 위한 mount 탐색. */
  findOrderPanel() {
    const direct = Array.from(document.querySelectorAll(SELECTORS.orderPane)).find(el => {
      if (!isVisible(el)) return false;
      const text = normalizeText(el.textContent || '');
      return text.includes('매수') || text.includes('매도') || text.includes('주문') || el.querySelector('input');
    });
    if (direct) return direct;

    const amount = document.getElementById('mirrorDemoAmount') ||
      findInputByKeywords(['금액', 'amount', 'krw'], ['가격', '수량']);
    const panel = amount?.closest('form, section, article, [class*="order"], [class*="trade"], div');
    return panel && isVisible(panel) ? panel : null;
  },

  /** SPA DOM 교체 대비. */
  observe(rehook) {
    const obs = new MutationObserver(() => rehook());
    obs.observe(document.body, { childList: true, subtree: true });
    return obs;
  },
};

if (typeof module !== 'undefined') module.exports = { UpbitAdapter, SELECTORS };
