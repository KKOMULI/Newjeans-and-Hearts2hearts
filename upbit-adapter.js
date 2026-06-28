/* =========================================================================
 * Upbit Adapter — 페이지에서 "이미 화면에 렌더된 숫자"만 읽는 격리 계층
 * -------------------------------------------------------------------------
 * 원칙:
 *   - API 키·세션·로그인 정보를 절대 만지지 않는다.
 *   - 주문 원장(체결 내역 원본)을 긁지 않는다. 지금 입력 중인 한 건의
 *     스냅샷(종목/금액/매수매도)과, 화면에 표시된 시세(변동률/거래량)만 읽는다.
 *   - 자동 입력·자동 클릭을 하지 않는다. 버튼을 누르는 건 항상 사용자.
 *
 * 아래 SELECTORS는 실제 Upbit DOM에 맞춰 팀이 확정해야 하는 placeholder.
 * DOM 구조가 바뀌어도 이 파일만 고치면 되도록 읽기를 한 곳에 모았다.
 * ========================================================================= */

const SELECTORS = {
  // 주문 폼 영역
  orderPane: '[class*="orderbook"], [class*="OrderForm"], #order_form',
  amountInput: 'input[name*="amount"], input[class*="amount"]',
  buyButton: 'button[class*="buy"], .ord_btn_buy',
  sellButton: 'button[class*="sell"], .ord_btn_sell',
  // 시세 영역 (이미 화면에 있는 값)
  symbolLabel: '[class*="coin_code"], [class*="symbol"]',
  changeRate: '[class*="change_rate"], [class*="changeRate"]',
  // 거래량(평소 대비 비율은 직접 계산 불가 → 표시값 또는 24h 거래량/평균 추정)
  volume24h: '[class*="acc_trade_volume"], [class*="volume"]',
};

const UpbitAdapter = {
  /** 현재 종목 심볼 (예: 'BTC'). 마켓 표기 'KRW-BTC' → 'BTC'. */
  readSymbol() {
    const el = document.querySelector(SELECTORS.symbolLabel);
    let raw = el ? el.textContent.trim() : (location.pathname.split('/').pop() || '');
    raw = raw.replace(/KRW-?/i, '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return raw || 'UNKNOWN';
  },

  /** 24h 변동률(%) — 화면 표시값 파싱. 실패 시 0. */
  readChangePct() {
    const el = document.querySelector(SELECTORS.changeRate);
    if (!el) return 0;
    const m = el.textContent.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
    let v = m ? parseFloat(m[0]) : 0;
    // 하락 표기가 색/기호로만 구분되는 경우 보정
    if (/down|minus|하락|−/.test(el.className + el.textContent) && v > 0) v = -v;
    return v;
  },

  /**
   * 거래량 "평소 대비 비율". Upbit 화면엔 절대 거래량만 있어
   * 평균 대비 비율은 직접 못 구한다 → 자체 EWMA로 기준선을 들고 비율 산출.
   * (이 EWMA도 chrome.storage.local 안에서만 유지)
   */
  readVolumeRatio(volumeBaseline) {
    const el = document.querySelector(SELECTORS.volume24h);
    const m = el ? el.textContent.replace(/,/g, '').match(/[\d.]+/) : null;
    const vol = m ? parseFloat(m[0]) : null;
    if (vol == null || !volumeBaseline) return 1.0;
    return Math.max(0.1, vol / volumeBaseline);
  },

  /** 지금 주문 폼에 입력된 금액(원). 비어있으면 null. */
  readOrderAmount() {
    const el = document.querySelector(SELECTORS.amountInput);
    if (!el) return null;
    const v = parseFloat((el.value || '').replace(/,/g, ''));
    return isNaN(v) ? null : v;
  },

  /**
   * 매수/매도 버튼에 "확정 직전" 후킹을 건다.
   * 클릭을 가로채 거울을 띄우되, 거래 자체는 절대 막거나 대신 누르지 않는다.
   * onPreOrder(side) 콜백이 false를 반환해도 원래 동작은 그대로 진행됨(비강제).
   */
  hookOrderButtons(onIntent) {
    const wire = (sel, side) => {
      document.querySelectorAll(sel).forEach(btn => {
        if (btn.dataset.mirrorHooked) return;
        btn.dataset.mirrorHooked = '1';
        // capture 단계에서 '관찰'만. preventDefault/stopPropagation 안 함 = 비강제.
        btn.addEventListener('focus', () => onIntent(side), true);
        btn.addEventListener('mouseenter', () => onIntent(side), true);
      });
    };
    wire(SELECTORS.buyButton, 'buy');
    wire(SELECTORS.sellButton, 'sell');
  },

  /** DOM이 SPA로 갈아끼워질 때를 대비한 재후킹 옵저버. */
  observe(rehook) {
    const obs = new MutationObserver(() => rehook());
    obs.observe(document.body, { childList: true, subtree: true });
    return obs;
  },
};

if (typeof module !== 'undefined') module.exports = { UpbitAdapter, SELECTORS };
