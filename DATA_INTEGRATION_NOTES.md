# AI Mirror JSON data integration notes

반영한 업로드 JSON

- `data/onboarding_question_scoring.json`: 12문항 온보딩 설문, 축별 점수, 민감도 점수, 페르소나 매칭 규칙
- `data/persona_seed_dataset.json`: 6개 페르소나의 cold-start baselineTargets, synthetic sampleTrades, demoCurrentOrders
- `data/demo_seed_user_a.json`: 디버그 패널용 user_a historicalTrades 및 FOMO/Panic/Revenge trigger scenario

주요 변경 사항

1. `ai-mirror-data.js`를 추가해 세 JSON을 확장 프로그램에서 바로 쓸 수 있는 전역 seed 데이터로 로드합니다.
2. `popup.js`의 기존 5문항 임의 설문을 `onboarding_question_scoring.json` 기반 12문항 설문으로 교체했습니다.
3. 온보딩 저장 시 `personaId`, 축별 프로필, 축별 confidence, 편향 민감도, 선택 답변을 `chrome.storage.local`에 저장합니다.
4. `mirror-core.js`의 A~E 임의 prior를 `persona_seed_dataset.json`의 6개 페르소나 baseline으로 교체했습니다.
5. `persona_seed_dataset.json`의 `sampleTrades`는 실제 사용자 거래 내역으로 표시하지 않고 cold-start용 행동 feature buffer로만 낮은 신뢰도로 반영합니다.
6. `mirror-debug.js`의 FOMO/Panic/Revenge 프리셋을 `demo_seed_user_a.json`의 trigger scenario 값으로 교체했습니다.
7. `manifest.json`에 `ai-mirror-data.js` 로딩 순서를 추가하고 원본 JSON을 `data/*.json`으로 패키징했습니다.
8. `debug-trade.html`, `debug-trade.js`, `debug-trade.css`를 추가해 실제 거래소 주문 없이 독립형 모의 매매창에서 `MirrorEngine.evaluate()`와 `commitTrade()` 흐름을 검증할 수 있게 했습니다.
9. 팝업에 “디버깅용 모의 매매창 열기” 버튼을 추가했습니다. 기본은 `aiMirror.debugTrade.*` 별도 저장소를 사용하므로 실제 행동 기준선을 오염시키지 않습니다.

주의

- 이 프로젝트는 계속 시장 예측/매매 추천을 하지 않고, 현재 주문이 사용자의 기준선과 얼마나 다른지만 보여주는 구조입니다.
- synthetic seed는 cold-start 완화용이며 실제 거래가 쌓이면 `commitTrade()`를 통해 점점 사용자의 로컬 행동 데이터가 우선됩니다.
- 디버그 매매창에서 “실제 확장 저장소에 반영”을 켜면 production state에 테스트 commit이 저장됩니다. 기본값은 꺼짐입니다.
