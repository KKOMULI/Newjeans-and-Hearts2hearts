# mIrror JSON data integration notes

반영한 업로드 JSON

- `data/onboarding_question_scoring.json`: 12문항 온보딩 설문, 축별 점수, 민감도 점수, 페르소나 매칭 규칙
- `data/persona_seed_dataset.json`: 6개 페르소나의 cold-start baselineTargets, synthetic sampleTrades, demoCurrentOrders
- `data/demo_seed_user_a.json`: 디버그 패널용 user_a historicalTrades 및 FOMO/Panic/Revenge trigger scenario

주요 변경 사항

1. `mirror-data.js`를 추가해 세 JSON을 확장 프로그램에서 바로 쓸 수 있는 전역 seed 데이터로 로드합니다.
2. `popup.js`의 기존 5문항 임의 설문을 `onboarding_question_scoring.json` 기반 12문항 설문으로 교체했습니다.
3. 온보딩 저장 시 `personaId`, 축별 프로필, 축별 confidence, 편향 민감도, 선택 답변을 `chrome.storage.local`에 저장합니다.
4. `mirror-core.js`의 A~E 임의 prior를 `persona_seed_dataset.json`의 6개 페르소나 baseline으로 교체했습니다.
5. `persona_seed_dataset.json`의 `sampleTrades`는 실제 사용자 거래 내역으로 표시하지 않고 cold-start용 행동 feature buffer로만 낮은 신뢰도로 반영합니다.
6. `mirror-debug.js`의 FOMO/Panic/Revenge 프리셋을 `demo_seed_user_a.json`의 trigger scenario 값으로 교체했습니다.
7. `manifest.json`에 `mirror-data.js` 로딩 순서를 추가하고 원본 JSON을 `data/*.json`으로 패키징했습니다.
8. `debug-trade.html`, `debug-trade.js`, `debug-trade.css`를 추가해 실제 거래소 주문 없이 독립형 모의 매매창에서 `MirrorEngine.evaluate()`와 `commitTrade()` 흐름을 검증할 수 있게 했습니다.
9. 팝업에 “디버깅용 모의 매매창 열기” 버튼을 추가했습니다. 기본은 `mIrror.debugTrade.*` 별도 저장소를 사용하므로 실제 행동 기준선을 오염시키지 않습니다.
10. Upbit `market_event.warning`/`market_event.caution` 값이 있을 때만 모달에 “업비트 딱지” 행을 표시합니다. 딱지가 없으면 해당 행과 “없음” 문구를 표시하지 않습니다.

주의

- 이 프로젝트는 계속 시장 예측/매매 추천을 하지 않고, 현재 주문이 사용자의 기준선과 얼마나 다른지만 보여주는 구조입니다.
- synthetic seed는 cold-start 완화용이며 실제 거래가 쌓이면 `commitTrade()`를 통해 점점 사용자의 로컬 행동 데이터가 우선됩니다.
- 디버그 매매창에서 “실제 확장 저장소에 반영”을 켜면 production state에 테스트 commit이 저장됩니다. 기본값은 꺼짐입니다.

## 2026-06-28 CORS 수정

Upbit 페이지에 삽입되는 content script에서 `https://api.upbit.com/v1/market/all?is_details=true`를 직접 호출하면 페이지 origin(`https://www.upbit.com`) 기준 CORS 정책에 막힐 수 있습니다. 이를 피하기 위해 `background.js` service worker를 추가했고, content script의 `upbit-risk.js`는 `chrome.runtime.sendMessage({ type: 'MIRROR_UPBIT_MARKET_ALL' })`로 background에 조회를 위임합니다.

보안상 content script가 임의 URL을 넘기지 못하게 했고, background는 mIrror가 필요한 Upbit public market-event endpoint만 호출합니다.


## 0.1.5 보강

`upbit-risk.js`가 extension runtime 안에서 background 요청에 실패하더라도 content script에서 `api.upbit.com` 직접 fetch를 재시도하지 않도록 수정했습니다. 따라서 Upbit 페이지 콘솔에 같은 CORS 오류를 다시 만들지 않고, API 실패 시에는 딱지 행을 숨기고 기존 화면 기반 변동성 판단만 남깁니다.

## 0.1.7 보강

팝업 온보딩 시작 부분에 “편한 1회 주문금액” 질문을 추가했습니다. 이 값은 성향 라벨이 아니라 `initialBaseline.typicalOrderAmountKRW`로 저장되어 `MirrorEngine`의 주문 금액 중앙값 prior를 직접 덮어씁니다. 예를 들어 사용자가 100만 원대를 기준으로 입력하면 synthetic seed의 안정 적립형 28만 원 기준보다 사용자 입력값을 우선하고, 60만 원 주문은 금액 이탈만으로 경고하지 않습니다.

사용자 입력 금액이 있는 경우 cold-start용 synthetic sampleTrades의 금액 샘플은 주문금액 baseline 계산에서 제외합니다. 보유기간, 선호 자산, 시장 반응 같은 나머지 seed feature는 그대로 낮은 신뢰도로 사용합니다.

## 0.1.7 보강

팝업 온보딩 맨 위에 `편한 1회 주문금액` 입력을 추가했습니다. 사용자가 입력한 금액은 `mIrror.userBaselinePrefs.v1`과 `mIrror.onboardingResult.v1.initialBaseline`에 저장되고, `MirrorEngine`은 이 값을 synthetic persona seed의 평균 주문금액보다 우선합니다.

사용자 입력 금액이 있으면 synthetic sampleTrades의 금액 샘플은 amount 기준선 계산에서 제외합니다. 예를 들어 안정 적립형 seed의 28만 원 기준선이 남아 있더라도, 사용자가 100만 원을 편한 주문금액으로 입력했다면 60만 원 매수는 금액 이탈로 보지 않습니다. 실제 commit이 쌓이면 사용자 입력 기준선과 실제 로컬 거래 feature가 blend됩니다.
