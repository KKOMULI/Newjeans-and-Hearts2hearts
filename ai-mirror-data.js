/* Auto-generated from uploaded AI Mirror JSON seed files. */
(function(){
  globalThis.AI_MIRROR_ONBOARDING_SCORING = {
  "schemaVersion": "0.1",
  "project": "AI Mirror - Onboarding Question Scoring",
  "createdAt": "2026-06-28T15:30:00+09:00",
  "purpose": "온보딩 답변을 초기 행동 기준선, 대표 페르소나, 숨은 편향 민감도 점수로 변환하기 위한 MVP 점수표",
  "principle": "온보딩 결과는 확정 성격이 아니라 실제 거래 데이터가 쌓이기 전까지 사용하는 낮은 신뢰도의 초기 행동 가설이다.",
  "axes": {
    "orderSize": [
      "small_split",
      "medium_size",
      "concentrated"
    ],
    "tradeFrequency": [
      "low_frequency",
      "regular",
      "high_frequency"
    ],
    "holdingPeriod": [
      "short_term",
      "mid_term",
      "long_term"
    ],
    "preferredAssets": [
      "btc_eth_focused",
      "alt_diversified",
      "new_asset_explorer"
    ],
    "marketReaction": [
      "wait_and_observe",
      "trend_following",
      "countertrend_entry"
    ],
    "pnlReaction": [
      "wait_after_loss",
      "reenter_after_loss",
      "recovery_trading"
    ]
  },
  "axisLabelsKo": {
    "orderSize": {
      "small_split": "소액 분할형",
      "medium_size": "중간 규모형",
      "concentrated": "집중 매수형"
    },
    "tradeFrequency": {
      "low_frequency": "저빈도",
      "regular": "규칙적",
      "high_frequency": "고빈도"
    },
    "holdingPeriod": {
      "short_term": "단기형",
      "mid_term": "중기형",
      "long_term": "장기형"
    },
    "preferredAssets": {
      "btc_eth_focused": "BTC/ETH 중심",
      "alt_diversified": "알트 분산형",
      "new_asset_explorer": "신규 종목 탐색형"
    },
    "marketReaction": {
      "wait_and_observe": "관망형",
      "trend_following": "추세 추종형",
      "countertrend_entry": "역추세 진입형"
    },
    "pnlReaction": {
      "wait_after_loss": "대기형",
      "reenter_after_loss": "재진입형",
      "recovery_trading": "복구 매매형"
    }
  },
  "sensitivitySignals": {
    "fomo": "급등/신규 종목/놓칠 것 같은 상황에 반응하는 민감도",
    "panicSelling": "급락/손실 구간에서 대량 매도로 반응할 가능성",
    "overconfidence": "수익 또는 확신 이후 주문 규모를 크게 늘릴 가능성",
    "recoveryTrading": "손실 직후 만회를 목적으로 더 빠르게 또는 더 크게 재진입할 가능성",
    "lossAversion": "손실 상황을 크게 의식하거나 손실 회피 행동으로 이어질 가능성"
  },
  "personaPrototypes": {
    "stable_accumulator": {
      "nameKo": "안정 적립형",
      "axisProfile": {
        "orderSize": "small_split",
        "tradeFrequency": "low_frequency",
        "holdingPeriod": "long_term",
        "preferredAssets": "btc_eth_focused",
        "marketReaction": "wait_and_observe",
        "pnlReaction": "wait_after_loss"
      }
    },
    "balanced_rebalancer": {
      "nameKo": "균형 조정형",
      "axisProfile": {
        "orderSize": "medium_size",
        "tradeFrequency": "regular",
        "holdingPeriod": "mid_term",
        "preferredAssets": "btc_eth_focused",
        "marketReaction": "wait_and_observe",
        "pnlReaction": "wait_after_loss"
      }
    },
    "cautious_explorer": {
      "nameKo": "신중 탐색형",
      "axisProfile": {
        "orderSize": "small_split",
        "tradeFrequency": "regular",
        "holdingPeriod": "mid_term",
        "preferredAssets": "alt_diversified",
        "marketReaction": "wait_and_observe",
        "pnlReaction": "wait_after_loss"
      }
    },
    "trend_responder": {
      "nameKo": "추세 반응형",
      "axisProfile": {
        "orderSize": "medium_size",
        "tradeFrequency": "regular",
        "holdingPeriod": "short_term",
        "preferredAssets": "alt_diversified",
        "marketReaction": "trend_following",
        "pnlReaction": "reenter_after_loss"
      }
    },
    "volatility_responder": {
      "nameKo": "변동성 대응형",
      "axisProfile": {
        "orderSize": "medium_size",
        "tradeFrequency": "high_frequency",
        "holdingPeriod": "short_term",
        "preferredAssets": "alt_diversified",
        "marketReaction": "trend_following",
        "pnlReaction": "reenter_after_loss"
      }
    },
    "recovery_sensitive": {
      "nameKo": "복구 민감형",
      "axisProfile": {
        "orderSize": "concentrated",
        "tradeFrequency": "high_frequency",
        "holdingPeriod": "short_term",
        "preferredAssets": "alt_diversified",
        "marketReaction": "trend_following",
        "pnlReaction": "recovery_trading"
      }
    }
  },
  "scoringRules": {
    "axisWinner": "각 축의 하위 라벨 점수를 합산한 뒤 가장 높은 라벨을 선택한다.",
    "axisTie": "동점이면 mixed로 표시하고 해당 축 confidence를 낮춘다. MVP에서는 추가 질문 없이 대표 페르소나 거리 계산에 낮은 가중치로 반영한다.",
    "axisConfidence": "topScore / sum(axisScores). 점수가 없으면 0으로 둔다.",
    "sensitivityNormalization": "각 민감도 점수는 합산 후 0~1 범위로 cap한다.",
    "personaMatch": "사용자 축 결과와 personaPrototypes의 축 결과를 비교해 일치한 축의 weight를 합산한다. 축 confidence가 낮으면 해당 축 기여도도 낮아진다.",
    "personaWeights": {
      "orderSize": 0.18,
      "tradeFrequency": 0.14,
      "holdingPeriod": 0.16,
      "preferredAssets": 0.16,
      "marketReaction": 0.18,
      "pnlReaction": 0.18
    }
  },
  "questions": [
    {
      "questionId": "Q1",
      "type": "survey",
      "titleKo": "주문 규모",
      "promptKo": "처음 투자한다면 한 번에 어느 정도 투자하는 것이 가장 편할 것 같나요?",
      "visualSpec": null,
      "options": [
        {
          "optionId": "Q1_A",
          "labelKo": "조금씩 나눠서 투자한다",
          "axisScores": {
            "orderSize": {
              "small_split": 2
            }
          },
          "sensitivityScores": {},
          "note": "초기 기준선을 작은 주문 단위로 둔다."
        },
        {
          "optionId": "Q1_B",
          "labelKo": "상황에 따라 적당한 금액으로 투자한다",
          "axisScores": {
            "orderSize": {
              "medium_size": 2
            }
          },
          "sensitivityScores": {},
          "note": "중간 규모 주문 기준선에 가깝다."
        },
        {
          "optionId": "Q1_C",
          "labelKo": "확신이 있다면 한 번에 크게 투자한다",
          "axisScores": {
            "orderSize": {
              "concentrated": 2
            }
          },
          "sensitivityScores": {
            "overconfidence": 0.1
          },
          "note": "집중 주문 기준선과 과신 민감도를 약하게 올린다."
        }
      ],
      "primaryAxes": [
        "orderSize"
      ],
      "secondarySignals": [
        "overconfidence"
      ]
    },
    {
      "questionId": "Q2",
      "type": "survey",
      "titleKo": "거래 빈도",
      "promptKo": "투자를 시작한다면 얼마나 자주 확인하거나 거래할 것 같나요?",
      "visualSpec": null,
      "options": [
        {
          "optionId": "Q2_A",
          "labelKo": "일주일에 1~2번 정도",
          "axisScores": {
            "tradeFrequency": {
              "low_frequency": 2
            }
          },
          "sensitivityScores": {},
          "note": "저빈도 기준선."
        },
        {
          "optionId": "Q2_B",
          "labelKo": "하루에 1번 정도",
          "axisScores": {
            "tradeFrequency": {
              "regular": 2
            }
          },
          "sensitivityScores": {},
          "note": "규칙적 확인 기준선."
        },
        {
          "optionId": "Q2_C",
          "labelKo": "하루에도 여러 번 확인한다",
          "axisScores": {
            "tradeFrequency": {
              "high_frequency": 2
            }
          },
          "sensitivityScores": {
            "overconfidence": 0.06,
            "fomo": 0.08
          },
          "note": "고빈도 기준선. 시장 자극에 노출되는 시간이 길다."
        }
      ],
      "primaryAxes": [
        "tradeFrequency"
      ],
      "secondarySignals": [
        "fomo",
        "overconfidence"
      ]
    },
    {
      "questionId": "Q3",
      "type": "survey",
      "titleKo": "보유 기간",
      "promptKo": "매수 후 가격이 오르거나 내려도 보통 어느 기간까지 지켜볼 수 있을 것 같나요?",
      "visualSpec": null,
      "options": [
        {
          "optionId": "Q3_A",
          "labelKo": "하루 이내에 판단하고 싶다",
          "axisScores": {
            "tradeFrequency": {
              "high_frequency": 1
            },
            "holdingPeriod": {
              "short_term": 2
            }
          },
          "sensitivityScores": {},
          "note": "단기 보유와 빠른 확인 리듬."
        },
        {
          "optionId": "Q3_B",
          "labelKo": "며칠에서 몇 주 정도는 지켜본다",
          "axisScores": {
            "tradeFrequency": {
              "regular": 1
            },
            "holdingPeriod": {
              "mid_term": 2
            }
          },
          "sensitivityScores": {},
          "note": "중기 보유 기준선."
        },
        {
          "optionId": "Q3_C",
          "labelKo": "한 달 이상도 기다릴 수 있다",
          "axisScores": {
            "tradeFrequency": {
              "low_frequency": 1
            },
            "holdingPeriod": {
              "long_term": 2
            }
          },
          "sensitivityScores": {},
          "note": "장기 보유 기준선."
        }
      ],
      "primaryAxes": [
        "holdingPeriod",
        "tradeFrequency"
      ],
      "secondarySignals": []
    },
    {
      "questionId": "Q4",
      "type": "survey",
      "titleKo": "선호 자산",
      "promptKo": "처음 투자한다면 어떤 코인부터 관심이 갈 것 같나요?",
      "visualSpec": null,
      "options": [
        {
          "optionId": "Q4_A",
          "labelKo": "BTC나 ETH처럼 대표 코인부터 본다",
          "axisScores": {
            "preferredAssets": {
              "btc_eth_focused": 2
            }
          },
          "sensitivityScores": {},
          "note": "대표 자산 중심."
        },
        {
          "optionId": "Q4_B",
          "labelKo": "유명한 알트코인도 함께 살펴본다",
          "axisScores": {
            "preferredAssets": {
              "alt_diversified": 2
            }
          },
          "sensitivityScores": {},
          "note": "알트 분산 탐색."
        },
        {
          "optionId": "Q4_C",
          "labelKo": "새로 뜨는 코인이나 이슈 종목도 본다",
          "axisScores": {
            "preferredAssets": {
              "new_asset_explorer": 2
            }
          },
          "sensitivityScores": {
            "fomo": 0.15
          },
          "note": "신규 종목 탐색 기준선과 FOMO 민감도."
        }
      ],
      "primaryAxes": [
        "preferredAssets"
      ],
      "secondarySignals": [
        "fomo"
      ]
    },
    {
      "questionId": "Q5",
      "type": "survey",
      "titleKo": "손익 후 반응",
      "promptKo": "투자금이 10% 줄었다면 가장 가까운 행동은 무엇인가요?",
      "visualSpec": null,
      "options": [
        {
          "optionId": "Q5_A",
          "labelKo": "잠시 쉬고 다시 본다",
          "axisScores": {
            "marketReaction": {
              "wait_and_observe": 1
            },
            "pnlReaction": {
              "wait_after_loss": 2
            }
          },
          "sensitivityScores": {},
          "note": "손실 후 대기 기준선."
        },
        {
          "optionId": "Q5_B",
          "labelKo": "왜 줄었는지 확인하고 계획을 다시 본다",
          "axisScores": {
            "marketReaction": {
              "wait_and_observe": 1
            },
            "pnlReaction": {
              "wait_after_loss": 1,
              "reenter_after_loss": 1
            }
          },
          "sensitivityScores": {},
          "note": "대기와 계획 재진입 사이."
        },
        {
          "optionId": "Q5_C",
          "labelKo": "빨리 만회할 기회를 찾고 싶다",
          "axisScores": {
            "tradeFrequency": {
              "high_frequency": 1
            },
            "pnlReaction": {
              "recovery_trading": 2
            }
          },
          "sensitivityScores": {
            "overconfidence": 0.1,
            "recoveryTrading": 0.35
          },
          "note": "복구 매매 민감도를 강하게 올린다."
        }
      ],
      "primaryAxes": [
        "pnlReaction",
        "marketReaction"
      ],
      "secondarySignals": [
        "recoveryTrading",
        "overconfidence"
      ]
    },
    {
      "questionId": "Q6",
      "type": "survey",
      "titleKo": "수익 후 주문 규모",
      "promptKo": "수익이 났다면 다음 거래는 어떻게 할 가능성이 높나요?",
      "visualSpec": null,
      "options": [
        {
          "optionId": "Q6_A",
          "labelKo": "같은 규모를 유지한다",
          "axisScores": {
            "orderSize": {
              "small_split": 1,
              "medium_size": 1
            },
            "pnlReaction": {
              "wait_after_loss": 1
            }
          },
          "sensitivityScores": {},
          "note": "수익 이후에도 주문 규모를 크게 바꾸지 않는다."
        },
        {
          "optionId": "Q6_B",
          "labelKo": "조금만 늘려본다",
          "axisScores": {
            "orderSize": {
              "medium_size": 2
            },
            "pnlReaction": {
              "reenter_after_loss": 1
            }
          },
          "sensitivityScores": {
            "overconfidence": 0.15
          },
          "note": "주문 규모 증가와 재진입 성향을 약하게 반영한다."
        },
        {
          "optionId": "Q6_C",
          "labelKo": "자신감이 생겨 더 크게 투자한다",
          "axisScores": {
            "orderSize": {
              "concentrated": 2
            },
            "pnlReaction": {
              "reenter_after_loss": 1
            }
          },
          "sensitivityScores": {
            "overconfidence": 0.35,
            "fomo": 0.1
          },
          "note": "과신 민감도를 강하게 올린다. 복구 매매형과는 분리한다."
        }
      ],
      "primaryAxes": [
        "orderSize"
      ],
      "secondarySignals": [
        "overconfidence",
        "fomo"
      ]
    },
    {
      "questionId": "Q7",
      "type": "chart_single",
      "titleKo": "급등 캔들 반응",
      "promptKo": "15분 동안 +8% 상승하고 거래량이 크게 늘어난 차트를 보면 어떤 행동에 가장 가깝나요?",
      "visualSpec": {
        "chartType": "candlestick",
        "scenario": "15m_sharp_rise",
        "changePct": 8,
        "volumeSpike": "high",
        "uiHint": "긴 양봉과 거래량 급증 막대를 함께 표시"
      },
      "options": [
        {
          "optionId": "Q7_A",
          "labelKo": "일단 관망한다",
          "axisScores": {
            "marketReaction": {
              "wait_and_observe": 2
            }
          },
          "sensitivityScores": {},
          "note": "급등 상황에서도 관망."
        },
        {
          "optionId": "Q7_B",
          "labelKo": "소액만 들어가 본다",
          "axisScores": {
            "orderSize": {
              "small_split": 1
            },
            "marketReaction": {
              "trend_following": 1
            }
          },
          "sensitivityScores": {
            "fomo": 0.15
          },
          "note": "추세 추종 성향은 있으나 주문 규모는 작다."
        },
        {
          "optionId": "Q7_C",
          "labelKo": "더 오르기 전에 바로 매수한다",
          "axisScores": {
            "orderSize": {
              "concentrated": 1,
              "medium_size": 1
            },
            "preferredAssets": {
              "new_asset_explorer": 1
            },
            "marketReaction": {
              "trend_following": 2
            }
          },
          "sensitivityScores": {
            "overconfidence": 0.1,
            "fomo": 0.35
          },
          "note": "FOMO 민감도를 강하게 올린다."
        }
      ],
      "primaryAxes": [
        "marketReaction",
        "orderSize"
      ],
      "secondarySignals": [
        "fomo",
        "overconfidence"
      ]
    },
    {
      "questionId": "Q8",
      "type": "chart_single",
      "titleKo": "급락 캔들 반응",
      "promptKo": "30분 동안 -7% 하락하고 거래량이 급증한 차트를 이미 보유 중이라면 어떻게 할 가능성이 높나요?",
      "visualSpec": {
        "chartType": "candlestick",
        "scenario": "30m_sharp_drop",
        "changePct": -7,
        "volumeSpike": "high",
        "uiHint": "긴 음봉과 거래량 급증 막대를 함께 표시"
      },
      "options": [
        {
          "optionId": "Q8_A",
          "labelKo": "바로 판단하지 않고 기다린다",
          "axisScores": {
            "pnlReaction": {
              "wait_after_loss": 1
            },
            "marketReaction": {
              "wait_and_observe": 2
            }
          },
          "sensitivityScores": {},
          "note": "급락 상황에서도 관망."
        },
        {
          "optionId": "Q8_B",
          "labelKo": "과하게 빠졌다면 추가 매수 기회를 본다",
          "axisScores": {
            "orderSize": {
              "small_split": 1
            },
            "marketReaction": {
              "countertrend_entry": 2
            }
          },
          "sensitivityScores": {
            "lossAversion": 0.08
          },
          "note": "역추세 진입형 기준선."
        },
        {
          "optionId": "Q8_C",
          "labelKo": "손실을 줄이기 위해 대부분 매도한다",
          "axisScores": {
            "tradeFrequency": {
              "high_frequency": 1
            }
          },
          "sensitivityScores": {
            "panicSelling": 0.35,
            "lossAversion": 0.18
          },
          "note": "축 라벨보다는 Panic Selling 민감도에 반영한다."
        }
      ],
      "primaryAxes": [
        "marketReaction"
      ],
      "secondarySignals": [
        "panicSelling",
        "lossAversion"
      ]
    },
    {
      "questionId": "Q9",
      "type": "chart_compare",
      "titleKo": "BTC와 알트 선택",
      "promptKo": "완만하게 오르는 BTC 차트와 급등락이 큰 알트코인 차트 중 어디에 더 관심이 가나요?",
      "visualSpec": {
        "chartType": "comparison",
        "left": "BTC_slow_uptrend",
        "right": "alt_high_volatility",
        "uiHint": "왼쪽 안정 상승, 오른쪽 큰 변동성 차트"
      },
      "options": [
        {
          "optionId": "Q9_A",
          "labelKo": "BTC 쪽이 더 편하다",
          "axisScores": {
            "marketReaction": {
              "wait_and_observe": 1
            },
            "preferredAssets": {
              "btc_eth_focused": 2
            }
          },
          "sensitivityScores": {},
          "note": "대표 자산 중심."
        },
        {
          "optionId": "Q9_B",
          "labelKo": "알트코인을 소액으로만 확인해본다",
          "axisScores": {
            "orderSize": {
              "small_split": 1
            },
            "preferredAssets": {
              "alt_diversified": 2
            }
          },
          "sensitivityScores": {
            "fomo": 0.08
          },
          "note": "신중한 알트 탐색."
        },
        {
          "optionId": "Q9_C",
          "labelKo": "변동성이 큰 알트코인에 적극 진입하고 싶다",
          "axisScores": {
            "orderSize": {
              "medium_size": 1
            },
            "preferredAssets": {
              "new_asset_explorer": 2
            },
            "marketReaction": {
              "trend_following": 1
            }
          },
          "sensitivityScores": {
            "overconfidence": 0.12,
            "fomo": 0.25
          },
          "note": "신규 종목과 추세 반응을 함께 반영."
        }
      ],
      "primaryAxes": [
        "preferredAssets",
        "marketReaction"
      ],
      "secondarySignals": [
        "fomo",
        "overconfidence"
      ]
    },
    {
      "questionId": "Q10",
      "type": "chart_context",
      "titleKo": "손실 후 반등",
      "promptKo": "손절한 코인이 20분 뒤 다시 반등하는 모습을 보면 어떤 행동에 가장 가깝나요?",
      "visualSpec": {
        "chartType": "contextual_candlestick",
        "scenario": "loss_then_rebound",
        "uiHint": "손절 지점과 이후 반등 캔들을 표시"
      },
      "options": [
        {
          "optionId": "Q10_A",
          "labelKo": "오늘은 쉬고 다시 본다",
          "axisScores": {
            "marketReaction": {
              "wait_and_observe": 1
            },
            "pnlReaction": {
              "wait_after_loss": 2
            }
          },
          "sensitivityScores": {},
          "note": "손실 후 대기."
        },
        {
          "optionId": "Q10_B",
          "labelKo": "원래 계획이 맞다면 소액만 재진입한다",
          "axisScores": {
            "orderSize": {
              "small_split": 1
            },
            "pnlReaction": {
              "reenter_after_loss": 2
            }
          },
          "sensitivityScores": {
            "recoveryTrading": 0.1
          },
          "note": "계획 기반 재진입."
        },
        {
          "optionId": "Q10_C",
          "labelKo": "손실을 만회하기 위해 더 크게 들어간다",
          "axisScores": {
            "pnlReaction": {
              "recovery_trading": 2
            },
            "orderSize": {
              "concentrated": 1
            },
            "tradeFrequency": {
              "high_frequency": 1
            }
          },
          "sensitivityScores": {
            "overconfidence": 0.12,
            "recoveryTrading": 0.4
          },
          "note": "복구 매매형의 핵심 신호."
        }
      ],
      "primaryAxes": [
        "pnlReaction",
        "orderSize"
      ],
      "secondarySignals": [
        "recoveryTrading",
        "overconfidence"
      ]
    },
    {
      "questionId": "Q11",
      "type": "chart_context",
      "titleKo": "수익 후 재진입",
      "promptKo": "+6% 수익을 실현했는데 같은 코인이 계속 상승한다면 다음 행동은 무엇에 가깝나요?",
      "visualSpec": {
        "chartType": "contextual_candlestick",
        "scenario": "profit_then_continued_rise",
        "uiHint": "익절 지점과 이후 상승 캔들을 표시"
      },
      "options": [
        {
          "optionId": "Q11_A",
          "labelKo": "수익을 확정하고 오늘은 마무리한다",
          "axisScores": {
            "tradeFrequency": {
              "low_frequency": 1
            },
            "marketReaction": {
              "wait_and_observe": 1
            }
          },
          "sensitivityScores": {},
          "note": "수익 후 관망."
        },
        {
          "optionId": "Q11_B",
          "labelKo": "같은 규모로 다시 기회를 본다",
          "axisScores": {
            "orderSize": {
              "medium_size": 1
            },
            "pnlReaction": {
              "reenter_after_loss": 1
            },
            "marketReaction": {
              "trend_following": 1
            }
          },
          "sensitivityScores": {
            "overconfidence": 0.12
          },
          "note": "재진입 성향과 추세 추종을 약하게 반영."
        },
        {
          "optionId": "Q11_C",
          "labelKo": "더 큰 금액으로 다시 들어간다",
          "axisScores": {
            "orderSize": {
              "concentrated": 2
            },
            "tradeFrequency": {
              "high_frequency": 1
            },
            "marketReaction": {
              "trend_following": 1
            }
          },
          "sensitivityScores": {
            "overconfidence": 0.4,
            "fomo": 0.15
          },
          "note": "과신 민감도의 핵심 신호. 복구 매매와 분리한다."
        }
      ],
      "primaryAxes": [
        "orderSize",
        "marketReaction"
      ],
      "secondarySignals": [
        "overconfidence",
        "fomo"
      ]
    },
    {
      "questionId": "Q12",
      "type": "chart_compare",
      "titleKo": "차트 시간대 선호",
      "promptKo": "투자 판단을 할 때 어떤 차트가 가장 편하게 느껴지나요?",
      "visualSpec": {
        "chartType": "timeframe_comparison",
        "options": [
          "1h",
          "1d",
          "1w"
        ],
        "uiHint": "같은 코인의 1시간봉, 일봉, 주봉을 나란히 표시"
      },
      "options": [
        {
          "optionId": "Q12_A",
          "labelKo": "1시간봉처럼 짧은 흐름",
          "axisScores": {
            "tradeFrequency": {
              "high_frequency": 1
            },
            "holdingPeriod": {
              "short_term": 2
            }
          },
          "sensitivityScores": {},
          "note": "단기 보유와 빠른 대응."
        },
        {
          "optionId": "Q12_B",
          "labelKo": "일봉처럼 며칠 단위 흐름",
          "axisScores": {
            "tradeFrequency": {
              "regular": 1
            },
            "holdingPeriod": {
              "mid_term": 2
            }
          },
          "sensitivityScores": {},
          "note": "중기 보유."
        },
        {
          "optionId": "Q12_C",
          "labelKo": "주봉처럼 긴 흐름",
          "axisScores": {
            "tradeFrequency": {
              "low_frequency": 1
            },
            "holdingPeriod": {
              "long_term": 2
            }
          },
          "sensitivityScores": {},
          "note": "장기 보유."
        }
      ],
      "primaryAxes": [
        "holdingPeriod",
        "tradeFrequency"
      ],
      "secondarySignals": []
    }
  ],
  "outputContract": {
    "personaId": "stable_accumulator | balanced_rebalancer | cautious_explorer | trend_responder | volatility_responder | recovery_sensitive",
    "personaNameKo": "대표 페르소나 이름",
    "axisProfile": {
      "orderSize": "label",
      "tradeFrequency": "label",
      "holdingPeriod": "label",
      "preferredAssets": "label",
      "marketReaction": "label",
      "pnlReaction": "label"
    },
    "axisConfidence": {
      "orderSize": 0,
      "tradeFrequency": 0,
      "holdingPeriod": 0,
      "preferredAssets": 0,
      "marketReaction": 0,
      "pnlReaction": 0
    },
    "sensitivity": {
      "fomo": 0,
      "panicSelling": 0,
      "overconfidence": 0,
      "recoveryTrading": 0,
      "lossAversion": 0
    },
    "onboardingConfidence": 0,
    "resultMessageKo": "현재 응답 기준으로는 ...에 가장 가깝습니다. 실제 거래 데이터가 쌓이면 이 프로필은 자동으로 조정됩니다."
  }
};
  globalThis.AI_MIRROR_PERSONA_SEED_DATASET = {
  "schemaVersion": "0.2",
  "project": "AI Mirror - Persona Seed Dataset",
  "createdAt": "2026-06-28T13:58:00+09:00",
  "purpose": "신규 유저 온보딩에서 선택된 초기 투자 성향 가설을 시스템 기준선으로 적용하기 위한 합성 샘플 거래 데이터",
  "warning": "이 데이터는 실제 사용자 과거 거래가 아니라 cold start 완화를 위한 synthetic seed다. 실제 거래 데이터와의 반영 비율 조정은 전체 시스템의 반감기 정책에서 별도 처리한다.",
  "personaAxes": {
    "orderSize": [
      "소액 분할형",
      "중간 규모형",
      "집중 매수형"
    ],
    "tradeFrequency": [
      "저빈도",
      "규칙적",
      "고빈도"
    ],
    "holdingPeriod": [
      "단기형",
      "중기형",
      "장기형"
    ],
    "preferredAssets": [
      "BTC/ETH 중심",
      "알트 분산형",
      "신규 종목 탐색형"
    ],
    "marketReaction": [
      "관망형",
      "추세 추종형",
      "역추세 진입형"
    ],
    "pnlReaction": [
      "대기형",
      "재진입형",
      "복구 매매형"
    ]
  },
  "personas": [
    {
      "personaId": "stable_accumulator",
      "personaNameKo": "안정 적립형",
      "personaRole": "초기 온보딩에서 안정적인 장기 보유 리듬을 선호한다고 응답한 사용자에게 적용하는 낮은 신뢰도의 기준선",
      "source": "synthetic_persona_seed",
      "initialConfidence": 0.45,
      "axisProfile": {
        "orderSize": "소액 분할형",
        "tradeFrequency": "저빈도",
        "holdingPeriod": "장기형",
        "preferredAssets": "BTC/ETH 중심",
        "marketReaction": "관망형",
        "pnlReaction": "대기형"
      },
      "baselineTargets": {
        "averageOrderAmountKRW": 280000,
        "weeklyTradeCount": 1.2,
        "averageHoldingPeriodHours": 520,
        "preferredCoins": [
          "KRW-BTC",
          "KRW-ETH"
        ],
        "lossRetradeWithinOneHourRatio": 0.05,
        "buyAfterSharpRiseRatio": 0.03,
        "sellAfterSharpDropRatio": 0.04
      },
      "sampleTrades": [
        {
          "tradeId": "SA001",
          "timestamp": "2026-05-01T09:20:00+09:00",
          "coin": "KRW-BTC",
          "side": "buy",
          "orderAmountKRW": 260000,
          "priceKRW": 92800000,
          "quantity": 0.00280172,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.6,
            "volatilityPct": 1.5,
            "volumeChangeRatePct": 8,
            "state": "normal"
          },
          "scenarioTag": "baseline_buy"
        },
        {
          "tradeId": "SA002",
          "timestamp": "2026-05-08T09:34:00+09:00",
          "coin": "KRW-ETH",
          "side": "buy",
          "orderAmountKRW": 230000,
          "priceKRW": 4820000,
          "quantity": 0.04771784,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": "-0.5",
            "volatilityPct": 1.7,
            "volumeChangeRatePct": 10,
            "state": "normal"
          },
          "scenarioTag": "baseline_buy"
        },
        {
          "tradeId": "SA003",
          "timestamp": "2026-05-15T21:12:00+09:00",
          "coin": "KRW-BTC",
          "side": "buy",
          "orderAmountKRW": 300000,
          "priceKRW": 94400000,
          "quantity": 0.00317797,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.4,
            "volatilityPct": 1.3,
            "volumeChangeRatePct": 7.2,
            "state": "normal"
          },
          "scenarioTag": "baseline_buy"
        },
        {
          "tradeId": "SA004",
          "timestamp": "2026-05-22T09:41:00+09:00",
          "coin": "KRW-ETH",
          "side": "buy",
          "orderAmountKRW": 250000,
          "priceKRW": 4960000,
          "quantity": 0.05040323,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.8,
            "volatilityPct": 1.6,
            "volumeChangeRatePct": 9.5,
            "state": "normal"
          },
          "scenarioTag": "baseline_buy"
        },
        {
          "tradeId": "SA005",
          "timestamp": "2026-05-29T10:05:00+09:00",
          "coin": "KRW-BTC",
          "side": "buy",
          "orderAmountKRW": 320000,
          "priceKRW": 96800000,
          "quantity": 0.00330579,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": "-0.3",
            "volatilityPct": 1.4,
            "volumeChangeRatePct": 6.8,
            "state": "normal"
          },
          "scenarioTag": "baseline_buy"
        },
        {
          "tradeId": "SA006",
          "timestamp": "2026-06-05T09:18:00+09:00",
          "coin": "KRW-ETH",
          "side": "buy",
          "orderAmountKRW": 240000,
          "priceKRW": 5110000,
          "quantity": 0.04696673,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.7,
            "volatilityPct": 1.5,
            "volumeChangeRatePct": 9,
            "state": "normal"
          },
          "scenarioTag": "baseline_buy"
        },
        {
          "tradeId": "SA007",
          "timestamp": "2026-06-12T09:52:00+09:00",
          "coin": "KRW-BTC",
          "side": "buy",
          "orderAmountKRW": 310000,
          "priceKRW": 98900000,
          "quantity": 0.00313448,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.5,
            "volatilityPct": 1.4,
            "volumeChangeRatePct": 8.4,
            "state": "normal"
          },
          "scenarioTag": "baseline_buy"
        },
        {
          "tradeId": "SA008",
          "timestamp": "2026-06-19T21:07:00+09:00",
          "coin": "KRW-ETH",
          "side": "buy",
          "orderAmountKRW": 270000,
          "priceKRW": 5180000,
          "quantity": 0.05212355,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": "-0.6",
            "volatilityPct": 1.8,
            "volumeChangeRatePct": 12.2,
            "state": "normal"
          },
          "scenarioTag": "baseline_buy"
        },
        {
          "tradeId": "SA009",
          "timestamp": "2026-06-22T10:10:00+09:00",
          "coin": "KRW-ETH",
          "side": "sell",
          "orderAmountKRW": 245000,
          "priceKRW": 5040000,
          "quantity": 0.04861111,
          "realizedPnlKRW": "-9000",
          "holdingPeriodHours": 360,
          "marketCondition": {
            "shortTermChangeRatePct": "-2.1",
            "volatilityPct": 2.6,
            "volumeChangeRatePct": 35,
            "state": "normal_drop"
          },
          "scenarioTag": "small_loss_wait"
        },
        {
          "tradeId": "SA010",
          "timestamp": "2026-06-26T09:29:00+09:00",
          "coin": "KRW-BTC",
          "side": "sell",
          "orderAmountKRW": 338000,
          "priceKRW": 100100000,
          "quantity": 0.00337662,
          "realizedPnlKRW": 18000,
          "holdingPeriodHours": 570,
          "marketCondition": {
            "shortTermChangeRatePct": 1.2,
            "volatilityPct": 1.6,
            "volumeChangeRatePct": 14,
            "state": "normal"
          },
          "scenarioTag": "baseline_sell"
        }
      ],
      "demoCurrentOrders": [
        {
          "scenarioId": "SA_NORMAL_001",
          "title": "평소 리듬에 가까운 BTC 소액 매수",
          "currentOrder": {
            "timestamp": "2026-06-28T09:30:00+09:00",
            "coin": "KRW-BTC",
            "side": "buy",
            "orderAmountKRW": 280000,
            "orderType": "limit"
          },
          "marketSnapshot": {
            "shortTermChangeRatePct": 0.4,
            "volatilityPct": 1.3,
            "volumeChangeRatePct": 7,
            "state": "normal"
          },
          "expectedAnalysis": {
            "deviationScore": 18,
            "interventionLevel": "none",
            "biasCandidates": [
              {
                "type": "None",
                "confidence": 0.32,
                "evidence": [
                  "평균 주문 금액과 유사합니다.",
                  "평소 선호 자산인 BTC 거래입니다."
                ]
              }
            ]
          }
        },
        {
          "scenarioId": "SA_TRIGGER_001",
          "title": "평소보다 큰 낯선 알트코인 급등 추격 매수",
          "currentOrder": {
            "timestamp": "2026-06-28T14:20:00+09:00",
            "coin": "KRW-SOL",
            "side": "buy",
            "orderAmountKRW": 1100000,
            "orderType": "market"
          },
          "marketSnapshot": {
            "shortTermChangeRatePct": 8.4,
            "volatilityPct": 6,
            "volumeChangeRatePct": 230,
            "state": "sharp_rise"
          },
          "expectedAnalysis": {
            "deviationScore": 88,
            "interventionLevel": "reflect_delay",
            "biasCandidates": [
              {
                "type": "FOMO",
                "confidence": 0.78,
                "evidence": [
                  "평소 주문 금액보다 약 4배 큽니다.",
                  "최근 기준선에서 자주 보이지 않던 자산입니다.",
                  "단기 급등과 거래량 급증이 동시에 관찰됩니다."
                ]
              }
            ]
          }
        }
      ]
    },
    {
      "personaId": "balanced_rebalancer",
      "personaNameKo": "균형 조정형",
      "personaRole": "정기적으로 포트폴리오 비중을 맞추는 사용자를 위한 초기 기준선",
      "source": "synthetic_persona_seed",
      "initialConfidence": 0.45,
      "axisProfile": {
        "orderSize": "중간 규모형",
        "tradeFrequency": "규칙적",
        "holdingPeriod": "중기형",
        "preferredAssets": "BTC/ETH 중심",
        "marketReaction": "관망형",
        "pnlReaction": "대기형"
      },
      "baselineTargets": {
        "averageOrderAmountKRW": 480000,
        "weeklyTradeCount": 3,
        "averageHoldingPeriodHours": 180,
        "preferredCoins": [
          "KRW-BTC",
          "KRW-ETH",
          "KRW-SOL"
        ],
        "lossRetradeWithinOneHourRatio": 0.08,
        "buyAfterSharpRiseRatio": 0.1,
        "sellAfterSharpDropRatio": 0.1
      },
      "sampleTrades": [
        {
          "tradeId": "BR001",
          "timestamp": "2026-05-01T10:10:00+09:00",
          "coin": "KRW-BTC",
          "side": "buy",
          "orderAmountKRW": 520000,
          "priceKRW": 92800000,
          "quantity": 0.00560345,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.6,
            "volatilityPct": 1.5,
            "volumeChangeRatePct": 8,
            "state": "normal"
          },
          "scenarioTag": "rebalance_buy"
        },
        {
          "tradeId": "BR002",
          "timestamp": "2026-05-03T20:45:00+09:00",
          "coin": "KRW-ETH",
          "side": "buy",
          "orderAmountKRW": 460000,
          "priceKRW": 4820000,
          "quantity": 0.09543568,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": "-0.3",
            "volatilityPct": 1.6,
            "volumeChangeRatePct": 9,
            "state": "normal"
          },
          "scenarioTag": "rebalance_buy"
        },
        {
          "tradeId": "BR003",
          "timestamp": "2026-05-08T10:20:00+09:00",
          "coin": "KRW-BTC",
          "side": "sell",
          "orderAmountKRW": 545000,
          "priceKRW": 95100000,
          "quantity": 0.00573081,
          "realizedPnlKRW": 25000,
          "holdingPeriodHours": 168,
          "marketCondition": {
            "shortTermChangeRatePct": 1.4,
            "volatilityPct": 1.8,
            "volumeChangeRatePct": 16,
            "state": "normal"
          },
          "scenarioTag": "rebalance_sell"
        },
        {
          "tradeId": "BR004",
          "timestamp": "2026-05-10T21:15:00+09:00",
          "coin": "KRW-ETH",
          "side": "buy",
          "orderAmountKRW": 430000,
          "priceKRW": 4885000,
          "quantity": 0.08802456,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.2,
            "volatilityPct": 1.3,
            "volumeChangeRatePct": 6,
            "state": "normal"
          },
          "scenarioTag": "rebalance_buy"
        },
        {
          "tradeId": "BR005",
          "timestamp": "2026-05-15T09:48:00+09:00",
          "coin": "KRW-SOL",
          "side": "buy",
          "orderAmountKRW": 390000,
          "priceKRW": 221000,
          "quantity": 1.76470588,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 2.1,
            "volatilityPct": 2.4,
            "volumeChangeRatePct": 32,
            "state": "mild_rise"
          },
          "scenarioTag": "rebalance_alt"
        },
        {
          "tradeId": "BR006",
          "timestamp": "2026-05-18T20:30:00+09:00",
          "coin": "KRW-ETH",
          "side": "sell",
          "orderAmountKRW": 452000,
          "priceKRW": 5020000,
          "quantity": 0.09003984,
          "realizedPnlKRW": 16000,
          "holdingPeriodHours": 192,
          "marketCondition": {
            "shortTermChangeRatePct": 1.3,
            "volatilityPct": 1.7,
            "volumeChangeRatePct": 15,
            "state": "normal"
          },
          "scenarioTag": "rebalance_sell"
        },
        {
          "tradeId": "BR007",
          "timestamp": "2026-05-24T10:05:00+09:00",
          "coin": "KRW-BTC",
          "side": "buy",
          "orderAmountKRW": 500000,
          "priceKRW": 96800000,
          "quantity": 0.00516529,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": "-0.5",
            "volatilityPct": 1.5,
            "volumeChangeRatePct": 8,
            "state": "normal"
          },
          "scenarioTag": "rebalance_buy"
        },
        {
          "tradeId": "BR008",
          "timestamp": "2026-05-29T21:00:00+09:00",
          "coin": "KRW-SOL",
          "side": "sell",
          "orderAmountKRW": 405000,
          "priceKRW": 230000,
          "quantity": 1.76086957,
          "realizedPnlKRW": 15000,
          "holdingPeriodHours": 336,
          "marketCondition": {
            "shortTermChangeRatePct": 1.9,
            "volatilityPct": 2.2,
            "volumeChangeRatePct": 28,
            "state": "normal"
          },
          "scenarioTag": "rebalance_sell"
        },
        {
          "tradeId": "BR009",
          "timestamp": "2026-06-03T09:40:00+09:00",
          "coin": "KRW-ETH",
          "side": "buy",
          "orderAmountKRW": 470000,
          "priceKRW": 5110000,
          "quantity": 0.09197652,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.8,
            "volatilityPct": 1.4,
            "volumeChangeRatePct": 9,
            "state": "normal"
          },
          "scenarioTag": "rebalance_buy"
        },
        {
          "tradeId": "BR010",
          "timestamp": "2026-06-07T20:20:00+09:00",
          "coin": "KRW-BTC",
          "side": "sell",
          "orderAmountKRW": 515000,
          "priceKRW": 98200000,
          "quantity": 0.0052444,
          "realizedPnlKRW": 18000,
          "holdingPeriodHours": 240,
          "marketCondition": {
            "shortTermChangeRatePct": 1.1,
            "volatilityPct": 1.6,
            "volumeChangeRatePct": 12,
            "state": "normal"
          },
          "scenarioTag": "rebalance_sell"
        },
        {
          "tradeId": "BR011",
          "timestamp": "2026-06-14T10:35:00+09:00",
          "coin": "KRW-ETH",
          "side": "sell",
          "orderAmountKRW": 444000,
          "priceKRW": 5040000,
          "quantity": 0.08809524,
          "realizedPnlKRW": "-12000",
          "holdingPeriodHours": 264,
          "marketCondition": {
            "shortTermChangeRatePct": "-1.8",
            "volatilityPct": 2,
            "volumeChangeRatePct": 20,
            "state": "normal_drop"
          },
          "scenarioTag": "small_loss_wait"
        },
        {
          "tradeId": "BR012",
          "timestamp": "2026-06-20T21:30:00+09:00",
          "coin": "KRW-BTC",
          "side": "buy",
          "orderAmountKRW": 490000,
          "priceKRW": 99700000,
          "quantity": 0.00491474,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.4,
            "volatilityPct": 1.3,
            "volumeChangeRatePct": 6.2,
            "state": "normal"
          },
          "scenarioTag": "rebalance_buy"
        }
      ],
      "demoCurrentOrders": [
        {
          "scenarioId": "BR_NORMAL_001",
          "title": "정기 리밸런싱에 가까운 ETH 매수",
          "currentOrder": {
            "timestamp": "2026-06-28T20:40:00+09:00",
            "coin": "KRW-ETH",
            "side": "buy",
            "orderAmountKRW": 460000,
            "orderType": "limit"
          },
          "marketSnapshot": {
            "shortTermChangeRatePct": 0.5,
            "volatilityPct": 1.4,
            "volumeChangeRatePct": 8,
            "state": "normal"
          },
          "expectedAnalysis": {
            "deviationScore": 22,
            "interventionLevel": "none",
            "biasCandidates": [
              {
                "type": "None",
                "confidence": 0.32,
                "evidence": [
                  "정상 주문 범위와 유사합니다.",
                  "최근 거래 리듬과 비슷한 시간대입니다."
                ]
              }
            ]
          }
        },
        {
          "scenarioId": "BR_TRIGGER_001",
          "title": "균형 조정 리듬을 벗어난 단기 급락 대량 매도",
          "currentOrder": {
            "timestamp": "2026-06-28T10:18:00+09:00",
            "coin": "KRW-BTC",
            "side": "sell",
            "orderAmountKRW": 1800000,
            "orderType": "market",
            "estimatedPositionSellRatio": 0.78
          },
          "marketSnapshot": {
            "shortTermChangeRatePct": "-7.2",
            "volatilityPct": 6.8,
            "volumeChangeRatePct": 210,
            "state": "sharp_drop"
          },
          "expectedAnalysis": {
            "deviationScore": 79,
            "interventionLevel": "explain_reflect",
            "biasCandidates": [
              {
                "type": "Panic Selling",
                "confidence": 0.64,
                "evidence": [
                  "평소 리밸런싱 매도 금액보다 큽니다.",
                  "단기 급락과 높은 변동성이 관찰됩니다.",
                  "보유량의 상당 부분을 한 번에 매도하려는 주문입니다."
                ]
              }
            ]
          }
        }
      ]
    },
    {
      "personaId": "cautious_explorer",
      "personaNameKo": "신중 탐색형",
      "personaRole": "소액으로 여러 자산을 탐색하지만 손실 이후에는 대기하는 사용자 기준선",
      "source": "synthetic_persona_seed",
      "initialConfidence": 0.45,
      "axisProfile": {
        "orderSize": "소액 분할형",
        "tradeFrequency": "규칙적",
        "holdingPeriod": "중기형",
        "preferredAssets": "알트 분산형",
        "marketReaction": "관망형",
        "pnlReaction": "대기형"
      },
      "baselineTargets": {
        "averageOrderAmountKRW": 190000,
        "weeklyTradeCount": 2.5,
        "averageHoldingPeriodHours": 150,
        "preferredCoins": [
          "KRW-BTC",
          "KRW-ETH",
          "KRW-SOL",
          "KRW-ADA",
          "KRW-XRP"
        ],
        "lossRetradeWithinOneHourRatio": 0.03,
        "buyAfterSharpRiseRatio": 0.08,
        "sellAfterSharpDropRatio": 0.07
      },
      "sampleTrades": [
        {
          "tradeId": "CE001",
          "timestamp": "2026-05-01T21:10:00+09:00",
          "coin": "KRW-BTC",
          "side": "buy",
          "orderAmountKRW": 210000,
          "priceKRW": 92800000,
          "quantity": 0.00226293,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.6,
            "volatilityPct": 1.5,
            "volumeChangeRatePct": 8,
            "state": "normal"
          },
          "scenarioTag": "small_explore"
        },
        {
          "tradeId": "CE002",
          "timestamp": "2026-05-04T20:24:00+09:00",
          "coin": "KRW-ADA",
          "side": "buy",
          "orderAmountKRW": 160000,
          "priceKRW": 890,
          "quantity": 179.7752809,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 1.8,
            "volatilityPct": 2.3,
            "volumeChangeRatePct": 28,
            "state": "mild_rise"
          },
          "scenarioTag": "small_alt_explore"
        },
        {
          "tradeId": "CE003",
          "timestamp": "2026-05-08T09:50:00+09:00",
          "coin": "KRW-ETH",
          "side": "buy",
          "orderAmountKRW": 200000,
          "priceKRW": 4970000,
          "quantity": 0.04024145,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.7,
            "volatilityPct": 1.5,
            "volumeChangeRatePct": 9,
            "state": "normal"
          },
          "scenarioTag": "small_explore"
        },
        {
          "tradeId": "CE004",
          "timestamp": "2026-05-12T20:40:00+09:00",
          "coin": "KRW-ADA",
          "side": "sell",
          "orderAmountKRW": 171000,
          "priceKRW": 951,
          "quantity": 179.81072555,
          "realizedPnlKRW": 11000,
          "holdingPeriodHours": 190,
          "marketCondition": {
            "shortTermChangeRatePct": 1.4,
            "volatilityPct": 1.9,
            "volumeChangeRatePct": 18,
            "state": "normal"
          },
          "scenarioTag": "small_profit"
        },
        {
          "tradeId": "CE005",
          "timestamp": "2026-05-16T10:18:00+09:00",
          "coin": "KRW-XRP",
          "side": "buy",
          "orderAmountKRW": 150000,
          "priceKRW": 820,
          "quantity": 182.92682927,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 2.2,
            "volatilityPct": 2.6,
            "volumeChangeRatePct": 36,
            "state": "mild_rise"
          },
          "scenarioTag": "small_alt_explore"
        },
        {
          "tradeId": "CE006",
          "timestamp": "2026-05-22T21:05:00+09:00",
          "coin": "KRW-XRP",
          "side": "sell",
          "orderAmountKRW": 142000,
          "priceKRW": 776,
          "quantity": 182.98969072,
          "realizedPnlKRW": "-8000",
          "holdingPeriodHours": 150,
          "marketCondition": {
            "shortTermChangeRatePct": "-2.4",
            "volatilityPct": 2.7,
            "volumeChangeRatePct": 34,
            "state": "normal_drop"
          },
          "scenarioTag": "small_loss_wait"
        },
        {
          "tradeId": "CE007",
          "timestamp": "2026-05-27T20:22:00+09:00",
          "coin": "KRW-SOL",
          "side": "buy",
          "orderAmountKRW": 180000,
          "priceKRW": 225000,
          "quantity": 0.8,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.9,
            "volatilityPct": 2,
            "volumeChangeRatePct": 15,
            "state": "normal"
          },
          "scenarioTag": "small_alt_explore"
        },
        {
          "tradeId": "CE008",
          "timestamp": "2026-06-01T09:46:00+09:00",
          "coin": "KRW-BTC",
          "side": "buy",
          "orderAmountKRW": 220000,
          "priceKRW": 96800000,
          "quantity": 0.00227273,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": "-0.3",
            "volatilityPct": 1.4,
            "volumeChangeRatePct": 7,
            "state": "normal"
          },
          "scenarioTag": "small_explore"
        },
        {
          "tradeId": "CE009",
          "timestamp": "2026-06-06T21:30:00+09:00",
          "coin": "KRW-SOL",
          "side": "sell",
          "orderAmountKRW": 187000,
          "priceKRW": 234000,
          "quantity": 0.7991453,
          "realizedPnlKRW": 7000,
          "holdingPeriodHours": 242,
          "marketCondition": {
            "shortTermChangeRatePct": 1.2,
            "volatilityPct": 2.1,
            "volumeChangeRatePct": 20,
            "state": "normal"
          },
          "scenarioTag": "small_profit"
        },
        {
          "tradeId": "CE010",
          "timestamp": "2026-06-11T20:12:00+09:00",
          "coin": "KRW-ETH",
          "side": "buy",
          "orderAmountKRW": 190000,
          "priceKRW": 5180000,
          "quantity": 0.03667954,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.5,
            "volatilityPct": 1.4,
            "volumeChangeRatePct": 8,
            "state": "normal"
          },
          "scenarioTag": "small_explore"
        },
        {
          "tradeId": "CE011",
          "timestamp": "2026-06-16T10:40:00+09:00",
          "coin": "KRW-ADA",
          "side": "buy",
          "orderAmountKRW": 170000,
          "priceKRW": 910,
          "quantity": 186.81318681,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 1.1,
            "volatilityPct": 1.8,
            "volumeChangeRatePct": 16,
            "state": "normal"
          },
          "scenarioTag": "small_alt_explore"
        },
        {
          "tradeId": "CE012",
          "timestamp": "2026-06-24T20:55:00+09:00",
          "coin": "KRW-BTC",
          "side": "sell",
          "orderAmountKRW": 229000,
          "priceKRW": 100100000,
          "quantity": 0.00228771,
          "realizedPnlKRW": 9000,
          "holdingPeriodHours": 552,
          "marketCondition": {
            "shortTermChangeRatePct": 0.9,
            "volatilityPct": 1.5,
            "volumeChangeRatePct": 12,
            "state": "normal"
          },
          "scenarioTag": "small_profit"
        }
      ],
      "demoCurrentOrders": [
        {
          "scenarioId": "CE_NORMAL_001",
          "title": "소액 알트 탐색에 가까운 ADA 매수",
          "currentOrder": {
            "timestamp": "2026-06-28T20:30:00+09:00",
            "coin": "KRW-ADA",
            "side": "buy",
            "orderAmountKRW": 180000,
            "orderType": "limit"
          },
          "marketSnapshot": {
            "shortTermChangeRatePct": 1.2,
            "volatilityPct": 2,
            "volumeChangeRatePct": 18,
            "state": "normal"
          },
          "expectedAnalysis": {
            "deviationScore": 26,
            "interventionLevel": "none",
            "biasCandidates": [
              {
                "type": "None",
                "confidence": 0.32,
                "evidence": [
                  "평소 소액 탐색 주문 범위 안에 있습니다.",
                  "최근에도 비슷한 규모의 알트코인 탐색 거래가 있었습니다."
                ]
              }
            ]
          }
        },
        {
          "scenarioId": "CE_TRIGGER_001",
          "title": "신중 탐색 기준선을 벗어난 급등 코인 대량 매수",
          "currentOrder": {
            "timestamp": "2026-06-28T13:50:00+09:00",
            "coin": "KRW-NEAR",
            "side": "buy",
            "orderAmountKRW": 850000,
            "orderType": "market"
          },
          "marketSnapshot": {
            "shortTermChangeRatePct": 9,
            "volatilityPct": 6.4,
            "volumeChangeRatePct": 260,
            "state": "sharp_rise"
          },
          "expectedAnalysis": {
            "deviationScore": 86,
            "interventionLevel": "reflect_delay",
            "biasCandidates": [
              {
                "type": "FOMO",
                "confidence": 0.78,
                "evidence": [
                  "평소 소액 주문 범위보다 크게 벗어납니다.",
                  "최근 데이터에 없는 신규 자산입니다.",
                  "단기 급등과 거래량 급증이 동시에 관찰됩니다."
                ]
              }
            ]
          }
        }
      ]
    },
    {
      "personaId": "trend_responder",
      "personaNameKo": "추세 반응형",
      "personaRole": "상승 신호에 반응하고 짧은 보유 후 차익 실현을 시도하는 사용자 기준선",
      "source": "synthetic_persona_seed",
      "initialConfidence": 0.45,
      "axisProfile": {
        "orderSize": "중간 규모형",
        "tradeFrequency": "규칙적",
        "holdingPeriod": "단기형",
        "preferredAssets": "알트 분산형",
        "marketReaction": "추세 추종형",
        "pnlReaction": "재진입형"
      },
      "baselineTargets": {
        "averageOrderAmountKRW": 650000,
        "weeklyTradeCount": 4.2,
        "averageHoldingPeriodHours": 32,
        "preferredCoins": [
          "KRW-BTC",
          "KRW-ETH",
          "KRW-SOL",
          "KRW-AVAX",
          "KRW-NEAR"
        ],
        "lossRetradeWithinOneHourRatio": 0.16,
        "buyAfterSharpRiseRatio": 0.42,
        "sellAfterSharpDropRatio": 0.18
      },
      "sampleTrades": [
        {
          "tradeId": "OS001",
          "timestamp": "2026-05-01T13:15:00+09:00",
          "coin": "KRW-SOL",
          "side": "buy",
          "orderAmountKRW": 620000,
          "priceKRW": 218000,
          "quantity": 2.8440367,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 4.8,
            "volatilityPct": 3.8,
            "volumeChangeRatePct": 95,
            "state": "strong_rise"
          },
          "scenarioTag": "uptrend_entry"
        },
        {
          "tradeId": "OS002",
          "timestamp": "2026-05-02T10:05:00+09:00",
          "coin": "KRW-SOL",
          "side": "sell",
          "orderAmountKRW": 661000,
          "priceKRW": 232000,
          "quantity": 2.84913793,
          "realizedPnlKRW": 41000,
          "holdingPeriodHours": 21,
          "marketCondition": {
            "shortTermChangeRatePct": 3.2,
            "volatilityPct": 3.4,
            "volumeChangeRatePct": 80,
            "state": "strong_rise"
          },
          "scenarioTag": "quick_profit"
        },
        {
          "tradeId": "OS003",
          "timestamp": "2026-05-04T14:20:00+09:00",
          "coin": "KRW-AVAX",
          "side": "buy",
          "orderAmountKRW": 580000,
          "priceKRW": 58000,
          "quantity": 10,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 5.1,
            "volatilityPct": 4.2,
            "volumeChangeRatePct": 110,
            "state": "strong_rise"
          },
          "scenarioTag": "uptrend_entry"
        },
        {
          "tradeId": "OS004",
          "timestamp": "2026-05-05T09:35:00+09:00",
          "coin": "KRW-AVAX",
          "side": "sell",
          "orderAmountKRW": 552000,
          "priceKRW": 55200,
          "quantity": 10,
          "realizedPnlKRW": "-28000",
          "holdingPeriodHours": 19,
          "marketCondition": {
            "shortTermChangeRatePct": "-2.8",
            "volatilityPct": 4.6,
            "volumeChangeRatePct": 100,
            "state": "normal_drop"
          },
          "scenarioTag": "fast_cut_loss"
        },
        {
          "tradeId": "OS005",
          "timestamp": "2026-05-08T13:00:00+09:00",
          "coin": "KRW-ETH",
          "side": "buy",
          "orderAmountKRW": 680000,
          "priceKRW": 4970000,
          "quantity": 0.13682093,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 3.9,
            "volatilityPct": 3,
            "volumeChangeRatePct": 70,
            "state": "strong_rise"
          },
          "scenarioTag": "uptrend_entry"
        },
        {
          "tradeId": "OS006",
          "timestamp": "2026-05-09T12:10:00+09:00",
          "coin": "KRW-ETH",
          "side": "sell",
          "orderAmountKRW": 714000,
          "priceKRW": 5220000,
          "quantity": 0.13678161,
          "realizedPnlKRW": 34000,
          "holdingPeriodHours": 23,
          "marketCondition": {
            "shortTermChangeRatePct": 2.6,
            "volatilityPct": 2.8,
            "volumeChangeRatePct": 56,
            "state": "strong_rise"
          },
          "scenarioTag": "quick_profit"
        },
        {
          "tradeId": "OS007",
          "timestamp": "2026-05-13T14:45:00+09:00",
          "coin": "KRW-NEAR",
          "side": "buy",
          "orderAmountKRW": 640000,
          "priceKRW": 9800,
          "quantity": 65.30612245,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 6.5,
            "volatilityPct": 5.2,
            "volumeChangeRatePct": 160,
            "state": "sharp_rise"
          },
          "scenarioTag": "uptrend_entry"
        },
        {
          "tradeId": "OS008",
          "timestamp": "2026-05-14T10:05:00+09:00",
          "coin": "KRW-NEAR",
          "side": "sell",
          "orderAmountKRW": 691000,
          "priceKRW": 10580,
          "quantity": 65.31190926,
          "realizedPnlKRW": 51000,
          "holdingPeriodHours": 20,
          "marketCondition": {
            "shortTermChangeRatePct": 4,
            "volatilityPct": 4.9,
            "volumeChangeRatePct": 130,
            "state": "strong_rise"
          },
          "scenarioTag": "quick_profit"
        },
        {
          "tradeId": "OS009",
          "timestamp": "2026-05-20T15:00:00+09:00",
          "coin": "KRW-BTC",
          "side": "buy",
          "orderAmountKRW": 700000,
          "priceKRW": 97400000,
          "quantity": 0.00718686,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 3.5,
            "volatilityPct": 2.9,
            "volumeChangeRatePct": 66,
            "state": "strong_rise"
          },
          "scenarioTag": "uptrend_entry"
        },
        {
          "tradeId": "OS010",
          "timestamp": "2026-05-22T09:30:00+09:00",
          "coin": "KRW-BTC",
          "side": "sell",
          "orderAmountKRW": 721000,
          "priceKRW": 100100000,
          "quantity": 0.0072028,
          "realizedPnlKRW": 21000,
          "holdingPeriodHours": 42,
          "marketCondition": {
            "shortTermChangeRatePct": 1.8,
            "volatilityPct": 2,
            "volumeChangeRatePct": 25,
            "state": "normal"
          },
          "scenarioTag": "quick_profit"
        },
        {
          "tradeId": "OS011",
          "timestamp": "2026-06-03T13:22:00+09:00",
          "coin": "KRW-SOL",
          "side": "buy",
          "orderAmountKRW": 760000,
          "priceKRW": 248000,
          "quantity": 3.06451613,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 6.8,
            "volatilityPct": 5.6,
            "volumeChangeRatePct": 180,
            "state": "sharp_rise"
          },
          "scenarioTag": "uptrend_entry"
        },
        {
          "tradeId": "OS012",
          "timestamp": "2026-06-04T10:15:00+09:00",
          "coin": "KRW-SOL",
          "side": "sell",
          "orderAmountKRW": 713000,
          "priceKRW": 232500,
          "quantity": 3.06666667,
          "realizedPnlKRW": "-47000",
          "holdingPeriodHours": 21,
          "marketCondition": {
            "shortTermChangeRatePct": "-3.9",
            "volatilityPct": 5.8,
            "volumeChangeRatePct": 160,
            "state": "sharp_drop"
          },
          "scenarioTag": "fast_cut_loss"
        }
      ],
      "demoCurrentOrders": [
        {
          "scenarioId": "OS_NORMAL_001",
          "title": "평소 패턴에 가까운 상승장 단기 진입",
          "currentOrder": {
            "timestamp": "2026-06-28T13:25:00+09:00",
            "coin": "KRW-SOL",
            "side": "buy",
            "orderAmountKRW": 670000,
            "orderType": "market"
          },
          "marketSnapshot": {
            "shortTermChangeRatePct": 4.5,
            "volatilityPct": 4,
            "volumeChangeRatePct": 120,
            "state": "strong_rise"
          },
          "expectedAnalysis": {
            "deviationScore": 38,
            "interventionLevel": "none",
            "biasCandidates": [
              {
                "type": "None",
                "confidence": 0.32,
                "evidence": [
                  "상승 반응형 거래가 평소에도 관찰됩니다.",
                  "주문 금액이 기준선과 크게 다르지 않습니다."
                ]
              }
            ]
          }
        },
        {
          "scenarioId": "OS_TRIGGER_001",
          "title": "추세 반응형 기준선도 넘어서는 과대 확신성 대형 주문",
          "currentOrder": {
            "timestamp": "2026-06-28T13:44:00+09:00",
            "coin": "KRW-NEAR",
            "side": "buy",
            "orderAmountKRW": 2100000,
            "orderType": "market"
          },
          "marketSnapshot": {
            "shortTermChangeRatePct": 10.2,
            "volatilityPct": 7.1,
            "volumeChangeRatePct": 310,
            "state": "sharp_rise"
          },
          "expectedAnalysis": {
            "deviationScore": 82,
            "interventionLevel": "reflect_delay",
            "biasCandidates": [
              {
                "type": "Overconfidence",
                "confidence": 0.78,
                "evidence": [
                  "평소에도 상승장 진입이 있으나 이번 주문 규모는 기준선보다 큽니다.",
                  "최근 수익 이후 주문 규모가 급격히 커진 조건과 유사합니다.",
                  "시장 변동성과 거래량이 높습니다."
                ]
              }
            ]
          }
        }
      ]
    },
    {
      "personaId": "volatility_responder",
      "personaNameKo": "변동성 대응형",
      "personaRole": "짧은 간격으로 시장 변동에 대응하는 고빈도 단기 거래 기준선",
      "source": "synthetic_persona_seed",
      "initialConfidence": 0.45,
      "axisProfile": {
        "orderSize": "중간 규모형",
        "tradeFrequency": "고빈도",
        "holdingPeriod": "단기형",
        "preferredAssets": "알트 분산형",
        "marketReaction": "추세 추종형",
        "pnlReaction": "재진입형"
      },
      "baselineTargets": {
        "averageOrderAmountKRW": 320000,
        "weeklyTradeCount": 9.5,
        "averageHoldingPeriodHours": 7,
        "preferredCoins": [
          "KRW-BTC",
          "KRW-ETH",
          "KRW-XRP",
          "KRW-SOL",
          "KRW-ADA"
        ],
        "lossRetradeWithinOneHourRatio": 0.22,
        "buyAfterSharpRiseRatio": 0.35,
        "sellAfterSharpDropRatio": 0.34
      },
      "sampleTrades": [
        {
          "tradeId": "RR001",
          "timestamp": "2026-06-01T09:10:00+09:00",
          "coin": "KRW-XRP",
          "side": "buy",
          "orderAmountKRW": 280000,
          "priceKRW": 820,
          "quantity": 341.46341463,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 3.5,
            "volatilityPct": 3.6,
            "volumeChangeRatePct": 80,
            "state": "strong_rise"
          },
          "scenarioTag": "fast_entry"
        },
        {
          "tradeId": "RR002",
          "timestamp": "2026-06-01T13:25:00+09:00",
          "coin": "KRW-XRP",
          "side": "sell",
          "orderAmountKRW": 291000,
          "priceKRW": 852,
          "quantity": 341.54929577,
          "realizedPnlKRW": 11000,
          "holdingPeriodHours": 4,
          "marketCondition": {
            "shortTermChangeRatePct": 2.2,
            "volatilityPct": 3.2,
            "volumeChangeRatePct": 60,
            "state": "normal"
          },
          "scenarioTag": "fast_exit"
        },
        {
          "tradeId": "RR003",
          "timestamp": "2026-06-03T10:05:00+09:00",
          "coin": "KRW-SOL",
          "side": "buy",
          "orderAmountKRW": 330000,
          "priceKRW": 231000,
          "quantity": 1.42857143,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 4.2,
            "volatilityPct": 4,
            "volumeChangeRatePct": 100,
            "state": "strong_rise"
          },
          "scenarioTag": "fast_entry"
        },
        {
          "tradeId": "RR004",
          "timestamp": "2026-06-03T18:40:00+09:00",
          "coin": "KRW-SOL",
          "side": "sell",
          "orderAmountKRW": 318000,
          "priceKRW": 222500,
          "quantity": 1.42921348,
          "realizedPnlKRW": "-12000",
          "holdingPeriodHours": 9,
          "marketCondition": {
            "shortTermChangeRatePct": "-2.1",
            "volatilityPct": 4.3,
            "volumeChangeRatePct": 98,
            "state": "normal_drop"
          },
          "scenarioTag": "fast_exit_loss"
        },
        {
          "tradeId": "RR005",
          "timestamp": "2026-06-05T09:45:00+09:00",
          "coin": "KRW-ADA",
          "side": "buy",
          "orderAmountKRW": 260000,
          "priceKRW": 910,
          "quantity": 285.71428571,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 2.8,
            "volatilityPct": 3.1,
            "volumeChangeRatePct": 70,
            "state": "mild_rise"
          },
          "scenarioTag": "fast_entry"
        },
        {
          "tradeId": "RR006",
          "timestamp": "2026-06-05T15:20:00+09:00",
          "coin": "KRW-ADA",
          "side": "sell",
          "orderAmountKRW": 269000,
          "priceKRW": 942,
          "quantity": 285.5626327,
          "realizedPnlKRW": 9000,
          "holdingPeriodHours": 6,
          "marketCondition": {
            "shortTermChangeRatePct": 1.5,
            "volatilityPct": 2.8,
            "volumeChangeRatePct": 45,
            "state": "normal"
          },
          "scenarioTag": "fast_exit"
        },
        {
          "tradeId": "RR007",
          "timestamp": "2026-06-08T10:30:00+09:00",
          "coin": "KRW-BTC",
          "side": "buy",
          "orderAmountKRW": 380000,
          "priceKRW": 98900000,
          "quantity": 0.00384226,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 2.4,
            "volatilityPct": 2.5,
            "volumeChangeRatePct": 45,
            "state": "mild_rise"
          },
          "scenarioTag": "fast_entry"
        },
        {
          "tradeId": "RR008",
          "timestamp": "2026-06-08T16:05:00+09:00",
          "coin": "KRW-BTC",
          "side": "sell",
          "orderAmountKRW": 386000,
          "priceKRW": 100500000,
          "quantity": 0.0038408,
          "realizedPnlKRW": 6000,
          "holdingPeriodHours": 6,
          "marketCondition": {
            "shortTermChangeRatePct": 1.1,
            "volatilityPct": 1.9,
            "volumeChangeRatePct": 22,
            "state": "normal"
          },
          "scenarioTag": "fast_exit"
        },
        {
          "tradeId": "RR009",
          "timestamp": "2026-06-12T09:22:00+09:00",
          "coin": "KRW-ETH",
          "side": "buy",
          "orderAmountKRW": 350000,
          "priceKRW": 5180000,
          "quantity": 0.06756757,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": "-2.2",
            "volatilityPct": 3.5,
            "volumeChangeRatePct": 70,
            "state": "normal_drop"
          },
          "scenarioTag": "volatility_entry"
        },
        {
          "tradeId": "RR010",
          "timestamp": "2026-06-12T12:55:00+09:00",
          "coin": "KRW-ETH",
          "side": "sell",
          "orderAmountKRW": 343000,
          "priceKRW": 5070000,
          "quantity": 0.06765286,
          "realizedPnlKRW": "-7000",
          "holdingPeriodHours": 4,
          "marketCondition": {
            "shortTermChangeRatePct": "-1.6",
            "volatilityPct": 3.2,
            "volumeChangeRatePct": 65,
            "state": "normal_drop"
          },
          "scenarioTag": "fast_exit_loss"
        },
        {
          "tradeId": "RR011",
          "timestamp": "2026-06-16T11:15:00+09:00",
          "coin": "KRW-SOL",
          "side": "buy",
          "orderAmountKRW": 410000,
          "priceKRW": 248000,
          "quantity": 1.65322581,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 5.5,
            "volatilityPct": 5.1,
            "volumeChangeRatePct": 150,
            "state": "sharp_rise"
          },
          "scenarioTag": "fast_entry"
        },
        {
          "tradeId": "RR012",
          "timestamp": "2026-06-16T17:00:00+09:00",
          "coin": "KRW-SOL",
          "side": "sell",
          "orderAmountKRW": 428000,
          "priceKRW": 259000,
          "quantity": 1.65250965,
          "realizedPnlKRW": 18000,
          "holdingPeriodHours": 6,
          "marketCondition": {
            "shortTermChangeRatePct": 2.6,
            "volatilityPct": 4.4,
            "volumeChangeRatePct": 120,
            "state": "strong_rise"
          },
          "scenarioTag": "fast_exit"
        }
      ],
      "demoCurrentOrders": [
        {
          "scenarioId": "RR_NORMAL_001",
          "title": "변동성 대응형 기준선에 가까운 당일 매매",
          "currentOrder": {
            "timestamp": "2026-06-28T11:15:00+09:00",
            "coin": "KRW-XRP",
            "side": "buy",
            "orderAmountKRW": 340000,
            "orderType": "market"
          },
          "marketSnapshot": {
            "shortTermChangeRatePct": 3.2,
            "volatilityPct": 3.6,
            "volumeChangeRatePct": 85,
            "state": "strong_rise"
          },
          "expectedAnalysis": {
            "deviationScore": 35,
            "interventionLevel": "none",
            "biasCandidates": [
              {
                "type": "None",
                "confidence": 0.32,
                "evidence": [
                  "짧은 대응 거래가 평소에도 자주 관찰됩니다.",
                  "주문 금액이 기준선과 크게 다르지 않습니다."
                ]
              }
            ]
          }
        },
        {
          "scenarioId": "RR_TRIGGER_001",
          "title": "고빈도 사용자에게도 과도한 연속 대형 주문",
          "currentOrder": {
            "timestamp": "2026-06-28T11:43:00+09:00",
            "coin": "KRW-SOL",
            "side": "buy",
            "orderAmountKRW": 1300000,
            "orderType": "market",
            "sameDayOrderCount": 8
          },
          "marketSnapshot": {
            "shortTermChangeRatePct": 7.4,
            "volatilityPct": 6.5,
            "volumeChangeRatePct": 250,
            "state": "sharp_rise"
          },
          "expectedAnalysis": {
            "deviationScore": 83,
            "interventionLevel": "reflect_delay",
            "biasCandidates": [
              {
                "type": "Overconfidence",
                "confidence": 0.78,
                "evidence": [
                  "오늘 거래 횟수가 평소 고빈도 기준선보다도 높습니다.",
                  "주문 금액이 평소보다 크게 큽니다.",
                  "급등장과 높은 변동성이 동시에 관찰됩니다."
                ]
              }
            ]
          }
        }
      ]
    },
    {
      "personaId": "recovery_sensitive",
      "personaNameKo": "복구 민감형",
      "personaRole": "손실 이후 짧은 시간 안에 재진입하거나 주문 규모가 커지는 경향을 가진 사용자 기준선",
      "source": "synthetic_persona_seed",
      "initialConfidence": 0.45,
      "axisProfile": {
        "orderSize": "집중 매수형",
        "tradeFrequency": "고빈도",
        "holdingPeriod": "단기형",
        "preferredAssets": "알트 분산형",
        "marketReaction": "추세 추종형",
        "pnlReaction": "복구 매매형"
      },
      "baselineTargets": {
        "averageOrderAmountKRW": 520000,
        "weeklyTradeCount": 5.5,
        "averageHoldingPeriodHours": 28,
        "preferredCoins": [
          "KRW-BTC",
          "KRW-ETH",
          "KRW-XRP",
          "KRW-SOL"
        ],
        "lossRetradeWithinOneHourRatio": 0.55,
        "buyAfterSharpRiseRatio": 0.3,
        "sellAfterSharpDropRatio": 0.28
      },
      "sampleTrades": [
        {
          "tradeId": "RC001",
          "timestamp": "2026-05-03T10:00:00+09:00",
          "coin": "KRW-ETH",
          "side": "buy",
          "orderAmountKRW": 420000,
          "priceKRW": 4820000,
          "quantity": 0.08713693,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 1.2,
            "volatilityPct": 2,
            "volumeChangeRatePct": 20,
            "state": "normal"
          },
          "scenarioTag": "baseline_entry"
        },
        {
          "tradeId": "RC002",
          "timestamp": "2026-05-04T09:15:00+09:00",
          "coin": "KRW-ETH",
          "side": "sell",
          "orderAmountKRW": 398000,
          "priceKRW": 4560000,
          "quantity": 0.0872807,
          "realizedPnlKRW": "-22000",
          "holdingPeriodHours": 23,
          "marketCondition": {
            "shortTermChangeRatePct": "-2.9",
            "volatilityPct": 3.4,
            "volumeChangeRatePct": 65,
            "state": "normal_drop"
          },
          "scenarioTag": "loss_exit"
        },
        {
          "tradeId": "RC003",
          "timestamp": "2026-05-04T09:42:00+09:00",
          "coin": "KRW-XRP",
          "side": "buy",
          "orderAmountKRW": 760000,
          "priceKRW": 840,
          "quantity": 904.76190476,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 4.8,
            "volatilityPct": 4.6,
            "volumeChangeRatePct": 130,
            "state": "strong_rise"
          },
          "scenarioTag": "loss_reentry_larger"
        },
        {
          "tradeId": "RC004",
          "timestamp": "2026-05-04T16:20:00+09:00",
          "coin": "KRW-XRP",
          "side": "sell",
          "orderAmountKRW": 789000,
          "priceKRW": 872,
          "quantity": 904.81651376,
          "realizedPnlKRW": 29000,
          "holdingPeriodHours": 7,
          "marketCondition": {
            "shortTermChangeRatePct": 2.1,
            "volatilityPct": 3.8,
            "volumeChangeRatePct": 90,
            "state": "normal"
          },
          "scenarioTag": "recovery_profit"
        },
        {
          "tradeId": "RC005",
          "timestamp": "2026-05-10T21:30:00+09:00",
          "coin": "KRW-BTC",
          "side": "buy",
          "orderAmountKRW": 480000,
          "priceKRW": 95100000,
          "quantity": 0.00504732,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 0.8,
            "volatilityPct": 1.8,
            "volumeChangeRatePct": 15,
            "state": "normal"
          },
          "scenarioTag": "baseline_entry"
        },
        {
          "tradeId": "RC006",
          "timestamp": "2026-05-12T10:10:00+09:00",
          "coin": "KRW-BTC",
          "side": "sell",
          "orderAmountKRW": 462000,
          "priceKRW": 91600000,
          "quantity": 0.00504367,
          "realizedPnlKRW": "-18000",
          "holdingPeriodHours": 37,
          "marketCondition": {
            "shortTermChangeRatePct": "-2.4",
            "volatilityPct": 3,
            "volumeChangeRatePct": 55,
            "state": "normal_drop"
          },
          "scenarioTag": "loss_exit"
        },
        {
          "tradeId": "RC007",
          "timestamp": "2026-05-12T10:35:00+09:00",
          "coin": "KRW-SOL",
          "side": "buy",
          "orderAmountKRW": 890000,
          "priceKRW": 225000,
          "quantity": 3.95555556,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 5.2,
            "volatilityPct": 4.9,
            "volumeChangeRatePct": 145,
            "state": "sharp_rise"
          },
          "scenarioTag": "loss_reentry_larger"
        },
        {
          "tradeId": "RC008",
          "timestamp": "2026-05-13T09:20:00+09:00",
          "coin": "KRW-SOL",
          "side": "sell",
          "orderAmountKRW": 845000,
          "priceKRW": 213500,
          "quantity": 3.95784543,
          "realizedPnlKRW": "-45000",
          "holdingPeriodHours": 23,
          "marketCondition": {
            "shortTermChangeRatePct": "-3.7",
            "volatilityPct": 5.3,
            "volumeChangeRatePct": 150,
            "state": "sharp_drop"
          },
          "scenarioTag": "second_loss"
        },
        {
          "tradeId": "RC009",
          "timestamp": "2026-05-18T14:05:00+09:00",
          "coin": "KRW-ETH",
          "side": "buy",
          "orderAmountKRW": 390000,
          "priceKRW": 5020000,
          "quantity": 0.07768924,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 1,
            "volatilityPct": 1.9,
            "volumeChangeRatePct": 18,
            "state": "normal"
          },
          "scenarioTag": "baseline_entry"
        },
        {
          "tradeId": "RC010",
          "timestamp": "2026-05-20T11:10:00+09:00",
          "coin": "KRW-ETH",
          "side": "sell",
          "orderAmountKRW": 426000,
          "priceKRW": 5480000,
          "quantity": 0.07773723,
          "realizedPnlKRW": 36000,
          "holdingPeriodHours": 45,
          "marketCondition": {
            "shortTermChangeRatePct": 2.2,
            "volatilityPct": 2.4,
            "volumeChangeRatePct": 40,
            "state": "strong_rise"
          },
          "scenarioTag": "profit_exit"
        },
        {
          "tradeId": "RC011",
          "timestamp": "2026-06-01T13:30:00+09:00",
          "coin": "KRW-XRP",
          "side": "buy",
          "orderAmountKRW": 650000,
          "priceKRW": 860,
          "quantity": 755.81395349,
          "realizedPnlKRW": null,
          "holdingPeriodHours": null,
          "marketCondition": {
            "shortTermChangeRatePct": 4.2,
            "volatilityPct": 4,
            "volumeChangeRatePct": 120,
            "state": "strong_rise"
          },
          "scenarioTag": "uptrend_entry"
        },
        {
          "tradeId": "RC012",
          "timestamp": "2026-06-02T09:30:00+09:00",
          "coin": "KRW-XRP",
          "side": "sell",
          "orderAmountKRW": 618000,
          "priceKRW": 818,
          "quantity": 755.50122249,
          "realizedPnlKRW": "-32000",
          "holdingPeriodHours": 20,
          "marketCondition": {
            "shortTermChangeRatePct": "-3.2",
            "volatilityPct": 4.7,
            "volumeChangeRatePct": 135,
            "state": "normal_drop"
          },
          "scenarioTag": "loss_exit"
        }
      ],
      "demoCurrentOrders": [
        {
          "scenarioId": "RC_NORMAL_001",
          "title": "복구 민감형 기준선 안의 중간 규모 재진입",
          "currentOrder": {
            "timestamp": "2026-06-28T10:40:00+09:00",
            "coin": "KRW-XRP",
            "side": "buy",
            "orderAmountKRW": 620000,
            "orderType": "market",
            "minutesSinceLoss": 55
          },
          "marketSnapshot": {
            "shortTermChangeRatePct": 3.8,
            "volatilityPct": 4,
            "volumeChangeRatePct": 100,
            "state": "strong_rise"
          },
          "expectedAnalysis": {
            "deviationScore": 52,
            "interventionLevel": "notice",
            "biasCandidates": [
              {
                "type": "Revenge Trading",
                "confidence": 0.32,
                "evidence": [
                  "손실 이후 재진입이 기준선에서도 일부 관찰됩니다.",
                  "주문 금액은 기준선 범위에 가깝습니다."
                ]
              }
            ]
          }
        },
        {
          "scenarioId": "RC_TRIGGER_001",
          "title": "손실 직후 기준선보다 더 큰 금액으로 재진입",
          "currentOrder": {
            "timestamp": "2026-06-28T10:27:00+09:00",
            "coin": "KRW-SOL",
            "side": "buy",
            "orderAmountKRW": 1800000,
            "orderType": "market",
            "minutesSinceLoss": 12,
            "lastLossKRW": -260000
          },
          "marketSnapshot": {
            "shortTermChangeRatePct": 6.2,
            "volatilityPct": 5.7,
            "volumeChangeRatePct": 190,
            "state": "sharp_rise"
          },
          "expectedAnalysis": {
            "deviationScore": 86,
            "interventionLevel": "reflect_delay",
            "biasCandidates": [
              {
                "type": "Revenge Trading",
                "confidence": 0.78,
                "evidence": [
                  "손실 거래 이후 12분 만에 재주문이 입력되었습니다.",
                  "이 페르소나 기준선보다도 주문 금액이 큽니다.",
                  "급등장 조건과 손실 만회성 재진입 조건이 함께 관찰됩니다."
                ]
              }
            ]
          }
        }
      ]
    }
  ],
  "uiContractHint": {
    "personaId": "selected persona id",
    "baselineConfidence": "starts low and decays as real trade data accumulates",
    "sampleTrades": "used only to initialize behavioral baseline, not shown as actual user history",
    "demoCurrentOrders": "used to test none, notice, explain_reflect, reflect_delay interventions"
  }
};
  globalThis.AI_MIRROR_DEMO_SEED_USER_A = {
  "schemaVersion": "0.1",
  "project": "AI Mirror - Upbit Extension Prototype",
  "principle": "This system does not predict markets or recommend trades. It compares the current order with the user's historical behavior pattern.",
  "user": {
    "userId": "user_a",
    "profilePolicy": "derived_from_historical_trades",
    "lookbackDays": 60,
    "note": "No persona is assigned manually. Labels are inferred from trading behavior."
  },
  "labelAxes": [
    {
      "axis": "order_size",
      "labels": [
        "small_split",
        "medium_size",
        "concentrated"
      ],
      "features": [
        "averageOrderAmountKRW",
        "medianOrderAmountKRW",
        "p90OrderAmountKRW",
        "maxToMedianRatio"
      ]
    },
    {
      "axis": "trade_frequency",
      "labels": [
        "low_frequency",
        "regular",
        "high_frequency"
      ],
      "features": [
        "weeklyTradeCount",
        "sameDayTradeCount",
        "medianIntervalHours"
      ]
    },
    {
      "axis": "holding_period",
      "labels": [
        "short_term",
        "mid_term",
        "long_term"
      ],
      "features": [
        "averageHoldingPeriodHours",
        "medianHoldingPeriodHours"
      ]
    },
    {
      "axis": "preferred_assets",
      "labels": [
        "btc_eth_focused",
        "alt_diversified",
        "new_asset_explorer"
      ],
      "features": [
        "topTwoAssetAmountShare",
        "newAssetTradeRatio",
        "uniqueCoinCount"
      ]
    },
    {
      "axis": "market_reactivity",
      "labels": [
        "wait_and_observe",
        "trend_following",
        "countertrend_entry"
      ],
      "features": [
        "sharpMoveObservationRatio",
        "trendFollowingEntryRatio",
        "countertrendEntryRatio"
      ]
    },
    {
      "axis": "pnl_reactivity",
      "labels": [
        "wait_after_loss",
        "reenter_after_loss",
        "recovery_trading"
      ],
      "features": [
        "retradeWithinOneHourAfterLossRatio",
        "orderAmountChangeAfterLoss",
        "recoveryTradeAfterLossRatio"
      ]
    }
  ],
  "historicalTrades": [
    {
      "tradeId": "T001",
      "timestamp": "2026-05-01T09:18:00+09:00",
      "coin": "KRW-BTC",
      "side": "buy",
      "orderAmountKRW": 320000,
      "priceKRW": 92800000,
      "quantity": 0.003448,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 0.8,
        "volatilityPct": 1.7,
        "volumeChangeRatePct": 14.0,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T002",
      "timestamp": "2026-05-03T21:10:00+09:00",
      "coin": "KRW-ETH",
      "side": "buy",
      "orderAmountKRW": 280000,
      "priceKRW": 4820000,
      "quantity": 0.058091,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": -0.4,
        "volatilityPct": 1.5,
        "volumeChangeRatePct": 8.5,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T003",
      "timestamp": "2026-05-05T10:42:00+09:00",
      "coin": "KRW-BTC",
      "side": "buy",
      "orderAmountKRW": 360000,
      "priceKRW": 93650000,
      "quantity": 0.003844,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 1.1,
        "volatilityPct": 1.9,
        "volumeChangeRatePct": 18.2,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T004",
      "timestamp": "2026-05-08T20:35:00+09:00",
      "coin": "KRW-ETH",
      "side": "sell",
      "orderAmountKRW": 304000,
      "priceKRW": 4970000,
      "quantity": 0.061167,
      "realizedPnlKRW": 24000,
      "holdingPeriodHours": 118,
      "marketCondition": {
        "shortTermChangeRatePct": 1.7,
        "volatilityPct": 2.0,
        "volumeChangeRatePct": 22.0,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T005",
      "timestamp": "2026-05-10T09:51:00+09:00",
      "coin": "KRW-BTC",
      "side": "sell",
      "orderAmountKRW": 386000,
      "priceKRW": 95100000,
      "quantity": 0.004059,
      "realizedPnlKRW": 26000,
      "holdingPeriodHours": 214,
      "marketCondition": {
        "shortTermChangeRatePct": 2.2,
        "volatilityPct": 2.4,
        "volumeChangeRatePct": 30.5,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T006",
      "timestamp": "2026-05-12T22:14:00+09:00",
      "coin": "KRW-BTC",
      "side": "buy",
      "orderAmountKRW": 340000,
      "priceKRW": 94400000,
      "quantity": 0.003602,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": -0.9,
        "volatilityPct": 1.8,
        "volumeChangeRatePct": 11.3,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T007",
      "timestamp": "2026-05-14T10:05:00+09:00",
      "coin": "KRW-ETH",
      "side": "buy",
      "orderAmountKRW": 300000,
      "priceKRW": 4885000,
      "quantity": 0.061413,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 0.3,
        "volatilityPct": 1.4,
        "volumeChangeRatePct": 7.4,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T008",
      "timestamp": "2026-05-17T20:46:00+09:00",
      "coin": "KRW-BTC",
      "side": "buy",
      "orderAmountKRW": 390000,
      "priceKRW": 96200000,
      "quantity": 0.004054,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 1.4,
        "volatilityPct": 1.9,
        "volumeChangeRatePct": 16.8,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T009",
      "timestamp": "2026-05-20T09:27:00+09:00",
      "coin": "KRW-ETH",
      "side": "sell",
      "orderAmountKRW": 318000,
      "priceKRW": 5020000,
      "quantity": 0.063347,
      "realizedPnlKRW": 18000,
      "holdingPeriodHours": 145,
      "marketCondition": {
        "shortTermChangeRatePct": 1.8,
        "volatilityPct": 2.1,
        "volumeChangeRatePct": 24.0,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T010",
      "timestamp": "2026-05-22T21:33:00+09:00",
      "coin": "KRW-BTC",
      "side": "sell",
      "orderAmountKRW": 365000,
      "priceKRW": 97400000,
      "quantity": 0.003748,
      "realizedPnlKRW": 31000,
      "holdingPeriodHours": 238,
      "marketCondition": {
        "shortTermChangeRatePct": 1.6,
        "volatilityPct": 1.8,
        "volumeChangeRatePct": 19.2,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T011",
      "timestamp": "2026-05-24T10:20:00+09:00",
      "coin": "KRW-XRP",
      "side": "buy",
      "orderAmountKRW": 260000,
      "priceKRW": 820,
      "quantity": 317.073171,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 2.5,
        "volatilityPct": 2.6,
        "volumeChangeRatePct": 38.0,
        "state": "mild_rise"
      },
      "scenarioTag": "normal_alt_small"
    },
    {
      "tradeId": "T012",
      "timestamp": "2026-05-27T20:09:00+09:00",
      "coin": "KRW-XRP",
      "side": "sell",
      "orderAmountKRW": 252000,
      "priceKRW": 794,
      "quantity": 317.380353,
      "realizedPnlKRW": -8000,
      "holdingPeriodHours": 82,
      "marketCondition": {
        "shortTermChangeRatePct": -1.9,
        "volatilityPct": 2.5,
        "volumeChangeRatePct": 28.0,
        "state": "normal_drop"
      },
      "scenarioTag": "normal_loss"
    },
    {
      "tradeId": "T013",
      "timestamp": "2026-05-29T09:44:00+09:00",
      "coin": "KRW-BTC",
      "side": "buy",
      "orderAmountKRW": 330000,
      "priceKRW": 96800000,
      "quantity": 0.003409,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": -0.2,
        "volatilityPct": 1.2,
        "volumeChangeRatePct": 5.8,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T014",
      "timestamp": "2026-06-01T21:22:00+09:00",
      "coin": "KRW-ETH",
      "side": "buy",
      "orderAmountKRW": 310000,
      "priceKRW": 5110000,
      "quantity": 0.060665,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 0.6,
        "volatilityPct": 1.6,
        "volumeChangeRatePct": 9.1,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T015",
      "timestamp": "2026-06-04T10:31:00+09:00",
      "coin": "KRW-BTC",
      "side": "sell",
      "orderAmountKRW": 344000,
      "priceKRW": 98200000,
      "quantity": 0.003503,
      "realizedPnlKRW": 14000,
      "holdingPeriodHours": 147,
      "marketCondition": {
        "shortTermChangeRatePct": 1.2,
        "volatilityPct": 1.7,
        "volumeChangeRatePct": 15.6,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T016",
      "timestamp": "2026-06-06T20:58:00+09:00",
      "coin": "KRW-ETH",
      "side": "sell",
      "orderAmountKRW": 298000,
      "priceKRW": 5040000,
      "quantity": 0.059127,
      "realizedPnlKRW": -12000,
      "holdingPeriodHours": 122,
      "marketCondition": {
        "shortTermChangeRatePct": -1.4,
        "volatilityPct": 2.0,
        "volumeChangeRatePct": 20.5,
        "state": "normal_drop"
      },
      "scenarioTag": "normal_loss"
    },
    {
      "tradeId": "T017",
      "timestamp": "2026-06-08T09:25:00+09:00",
      "coin": "KRW-BTC",
      "side": "buy",
      "orderAmountKRW": 370000,
      "priceKRW": 98900000,
      "quantity": 0.003741,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 0.9,
        "volatilityPct": 1.5,
        "volumeChangeRatePct": 12.8,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T018",
      "timestamp": "2026-06-10T21:40:00+09:00",
      "coin": "KRW-BTC",
      "side": "sell",
      "orderAmountKRW": 382000,
      "priceKRW": 100100000,
      "quantity": 0.003816,
      "realizedPnlKRW": 12000,
      "holdingPeriodHours": 58,
      "marketCondition": {
        "shortTermChangeRatePct": 1.0,
        "volatilityPct": 1.6,
        "volumeChangeRatePct": 13.2,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T019",
      "timestamp": "2026-06-12T10:02:00+09:00",
      "coin": "KRW-ETH",
      "side": "buy",
      "orderAmountKRW": 350000,
      "priceKRW": 5180000,
      "quantity": 0.067568,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 0.7,
        "volatilityPct": 1.4,
        "volumeChangeRatePct": 10.3,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T020",
      "timestamp": "2026-06-14T20:16:00+09:00",
      "coin": "KRW-ADA",
      "side": "buy",
      "orderAmountKRW": 290000,
      "priceKRW": 910,
      "quantity": 318.681319,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 2.1,
        "volatilityPct": 2.3,
        "volumeChangeRatePct": 34.0,
        "state": "mild_rise"
      },
      "scenarioTag": "normal_alt_small"
    },
    {
      "tradeId": "T021",
      "timestamp": "2026-06-16T09:36:00+09:00",
      "coin": "KRW-ETH",
      "side": "sell",
      "orderAmountKRW": 362000,
      "priceKRW": 5300000,
      "quantity": 0.068302,
      "realizedPnlKRW": 12000,
      "holdingPeriodHours": 93,
      "marketCondition": {
        "shortTermChangeRatePct": 1.5,
        "volatilityPct": 1.9,
        "volumeChangeRatePct": 18.9,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T022",
      "timestamp": "2026-06-18T13:42:00+09:00",
      "coin": "KRW-SOL",
      "side": "buy",
      "orderAmountKRW": 980000,
      "priceKRW": 248000,
      "quantity": 3.951613,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 7.2,
        "volatilityPct": 5.8,
        "volumeChangeRatePct": 185.0,
        "state": "sharp_rise"
      },
      "scenarioTag": "fomo_candidate"
    },
    {
      "tradeId": "T023",
      "timestamp": "2026-06-18T14:28:00+09:00",
      "coin": "KRW-SOL",
      "side": "buy",
      "orderAmountKRW": 720000,
      "priceKRW": 256000,
      "quantity": 2.8125,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 9.1,
        "volatilityPct": 6.4,
        "volumeChangeRatePct": 230.0,
        "state": "sharp_rise"
      },
      "scenarioTag": "fomo_candidate"
    },
    {
      "tradeId": "T024",
      "timestamp": "2026-06-19T09:18:00+09:00",
      "coin": "KRW-SOL",
      "side": "sell",
      "orderAmountKRW": 1580000,
      "priceKRW": 238000,
      "quantity": 6.638655,
      "realizedPnlKRW": -120000,
      "holdingPeriodHours": 19,
      "marketCondition": {
        "shortTermChangeRatePct": -4.2,
        "volatilityPct": 5.9,
        "volumeChangeRatePct": 160.0,
        "state": "sharp_drop"
      },
      "scenarioTag": "fomo_after_loss"
    },
    {
      "tradeId": "T025",
      "timestamp": "2026-06-20T20:51:00+09:00",
      "coin": "KRW-BTC",
      "side": "buy",
      "orderAmountKRW": 340000,
      "priceKRW": 99700000,
      "quantity": 0.00341,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 0.4,
        "volatilityPct": 1.3,
        "volumeChangeRatePct": 6.2,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T026",
      "timestamp": "2026-06-22T10:12:00+09:00",
      "coin": "KRW-ETH",
      "side": "sell",
      "orderAmountKRW": 1460000,
      "priceKRW": 4710000,
      "quantity": 0.309979,
      "realizedPnlKRW": -210000,
      "holdingPeriodHours": 241,
      "marketCondition": {
        "shortTermChangeRatePct": -7.4,
        "volatilityPct": 6.8,
        "volumeChangeRatePct": 210.0,
        "state": "sharp_drop"
      },
      "scenarioTag": "panic_selling_candidate"
    },
    {
      "tradeId": "T027",
      "timestamp": "2026-06-22T10:31:00+09:00",
      "coin": "KRW-XRP",
      "side": "buy",
      "orderAmountKRW": 1250000,
      "priceKRW": 865,
      "quantity": 1445.086705,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 4.9,
        "volatilityPct": 5.2,
        "volumeChangeRatePct": 145.0,
        "state": "sharp_rise"
      },
      "scenarioTag": "revenge_trading_candidate"
    },
    {
      "tradeId": "T028",
      "timestamp": "2026-06-22T11:05:00+09:00",
      "coin": "KRW-XRP",
      "side": "sell",
      "orderAmountKRW": 1180000,
      "priceKRW": 817,
      "quantity": 1444.308445,
      "realizedPnlKRW": -70000,
      "holdingPeriodHours": 1,
      "marketCondition": {
        "shortTermChangeRatePct": -3.8,
        "volatilityPct": 6.0,
        "volumeChangeRatePct": 170.0,
        "state": "sharp_drop"
      },
      "scenarioTag": "revenge_trading_loss"
    },
    {
      "tradeId": "T029",
      "timestamp": "2026-06-24T21:19:00+09:00",
      "coin": "KRW-BTC",
      "side": "buy",
      "orderAmountKRW": 360000,
      "priceKRW": 100500000,
      "quantity": 0.003582,
      "realizedPnlKRW": null,
      "holdingPeriodHours": null,
      "marketCondition": {
        "shortTermChangeRatePct": 0.8,
        "volatilityPct": 1.6,
        "volumeChangeRatePct": 12.0,
        "state": "normal"
      },
      "scenarioTag": "normal"
    },
    {
      "tradeId": "T030",
      "timestamp": "2026-06-26T10:26:00+09:00",
      "coin": "KRW-ADA",
      "side": "sell",
      "orderAmountKRW": 303000,
      "priceKRW": 951,
      "quantity": 318.611987,
      "realizedPnlKRW": 13000,
      "holdingPeriodHours": 282,
      "marketCondition": {
        "shortTermChangeRatePct": 1.9,
        "volatilityPct": 2.1,
        "volumeChangeRatePct": 26.0,
        "state": "normal"
      },
      "scenarioTag": "normal_alt_small"
    }
  ],
  "expectedDerivedProfile": {
    "profileLabels": [
      {
        "axis": "order_size",
        "label": "small_split_with_occasional_spikes",
        "confidence": 0.78,
        "evidence": [
          "Most normal trades are between 260,000 and 390,000 KRW.",
          "A few trades above 900,000 KRW appear during sharp market moves."
        ]
      },
      {
        "axis": "preferred_assets",
        "label": "btc_eth_focused",
        "confidence": 0.82,
        "evidence": [
          "BTC and ETH account for the majority of normal trades.",
          "Altcoin trades are less frequent and usually smaller except during anomaly scenarios."
        ]
      },
      {
        "axis": "holding_period",
        "label": "mid_term",
        "confidence": 0.71,
        "evidence": [
          "Most realized normal trades are held for multiple days.",
          "Very short holding periods mainly appear during anomaly scenarios."
        ]
      },
      {
        "axis": "pnl_reactivity",
        "label": "mostly_wait_after_loss_but_recovery_trade_pattern_observed",
        "confidence": 0.67,
        "evidence": [
          "Normal small losses are not immediately followed by larger re-entry orders.",
          "On 2026-06-22, a large loss is followed by a larger re-entry within 19 minutes."
        ]
      }
    ]
  },
  "demoTriggerScenarios": [
    {
      "scenarioId": "S001_current_fomo",
      "title": "FOMO 가능성: 급등 중인 낯선 코인 대량 매수",
      "currentOrder": {
        "timestamp": "2026-06-28T14:20:00+09:00",
        "coin": "KRW-SOL",
        "side": "buy",
        "orderAmountKRW": 1200000,
        "orderType": "market"
      },
      "marketSnapshot": {
        "shortTermChangeRatePct": 8.2,
        "volatilityPct": 6.1,
        "volumeChangeRatePct": 240.0,
        "state": "sharp_rise"
      },
      "expectedAnalysis": {
        "deviationScore": 84,
        "interventionLevel": "reflect_delay",
        "biasCandidates": [
          {
            "type": "FOMO",
            "confidence": 0.76,
            "evidence": [
              "The coin rose 8.2% in the short term.",
              "The order amount is more than 3 times the user's normal order range.",
              "SOL is not a frequent asset in the user's normal trading pattern."
            ]
          }
        ]
      }
    },
    {
      "scenarioId": "S002_current_panic_selling",
      "title": "Panic Selling 가능성: 급락장에서 보유 ETH 대량 매도",
      "currentOrder": {
        "timestamp": "2026-06-28T10:18:00+09:00",
        "coin": "KRW-ETH",
        "side": "sell",
        "orderAmountKRW": 1500000,
        "orderType": "market",
        "estimatedPositionSellRatio": 0.82
      },
      "marketSnapshot": {
        "shortTermChangeRatePct": -7.8,
        "volatilityPct": 7.0,
        "volumeChangeRatePct": 220.0,
        "state": "sharp_drop"
      },
      "expectedAnalysis": {
        "deviationScore": 81,
        "interventionLevel": "reflect_delay",
        "biasCandidates": [
          {
            "type": "Panic Selling",
            "confidence": 0.73,
            "evidence": [
              "ETH fell 7.8% in the short term.",
              "The order attempts to sell most of the estimated position.",
              "The order amount is much larger than the user's normal sell size."
            ]
          }
        ]
      }
    },
    {
      "scenarioId": "S003_current_revenge_trading",
      "title": "Revenge Trading 가능성: 손실 직후 더 큰 금액으로 재진입",
      "recentContext": {
        "lastRealizedLossTradeId": "T026",
        "minutesSinceLoss": 19,
        "lastLossKRW": -210000
      },
      "currentOrder": {
        "timestamp": "2026-06-22T10:31:00+09:00",
        "coin": "KRW-XRP",
        "side": "buy",
        "orderAmountKRW": 1250000,
        "orderType": "market"
      },
      "marketSnapshot": {
        "shortTermChangeRatePct": 4.9,
        "volatilityPct": 5.2,
        "volumeChangeRatePct": 145.0,
        "state": "sharp_rise"
      },
      "expectedAnalysis": {
        "deviationScore": 88,
        "interventionLevel": "reflect_delay",
        "biasCandidates": [
          {
            "type": "Revenge Trading",
            "confidence": 0.81,
            "evidence": [
              "A realized loss occurred 19 minutes before the current order.",
              "The current order amount is far above the user's normal order range.",
              "The order follows a short interval that is unusual for the user's normal pattern."
            ]
          }
        ]
      }
    }
  ],
  "uiResultContract": {
    "deviationScore": 0,
    "interventionLevel": "none | notice | explain_reflect | reflect_delay",
    "summary": "Short neutral observation for the user.",
    "biasCandidates": [
      {
        "type": "FOMO | Panic Selling | Revenge Trading | Overconfidence | Loss Aversion",
        "confidence": 0.0,
        "evidence": [
          "Objective evidence sentence 1",
          "Objective evidence sentence 2"
        ]
      }
    ],
    "reflectQuestion": "이번 거래를 하려는 이유에 가장 가까운 것은 무엇인가요?",
    "reflectOptions": [
      "계획했던 거래입니다.",
      "가격 움직임을 보고 결정했습니다.",
      "최근 손실을 만회하고 싶었습니다.",
      "뉴스나 주변 반응을 보고 결정했습니다."
    ]
  }
};
})();
