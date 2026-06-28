/* =========================================================================
 * popup.js — onboarding_question_scoring.json 기반 12문항 온보딩
 * -------------------------------------------------------------------------
 * 업로드된 JSON의 questions/scoringRules/personaPrototypes를 그대로 사용한다.
 * 결과는 확정 성격이 아니라 실제 거래 데이터가 쌓이기 전까지 쓰는 낮은
 * 신뢰도의 초기 행동 가설로 저장된다.
 * ========================================================================= */

const STORE_KEY = 'aiMirror.state.v1';
const PERSONA_KEY = 'aiMirror.persona.v1';
const ONBOARDING_RESULT_KEY = 'aiMirror.onboardingResult.v1';
const SURVEY_ANSWERS_KEY = 'aiMirror.surveyAnswers.v1';

const ONBOARDING = globalThis.AI_MIRROR_ONBOARDING_SCORING;
const PERSONA_SEED = globalThis.AI_MIRROR_PERSONA_SEED_DATASET;

if (!ONBOARDING || !Array.isArray(ONBOARDING.questions)) {
  throw new Error('AI Mirror onboarding data was not loaded. Check ai-mirror-data.js.');
}

const QUESTIONS = ONBOARDING.questions;
const answers = new Array(QUESTIONS.length).fill(null);
const root = document.getElementById('survey');

function axisLabel(axis, label) {
  return ONBOARDING.axisLabelsKo?.[axis]?.[label] || label;
}

function personaName(personaId) {
  return ONBOARDING.personaPrototypes?.[personaId]?.nameKo ||
    PERSONA_SEED?.personas?.find(p => p.personaId === personaId)?.personaNameKo ||
    personaId;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function createQuestion(item, qi) {
  const div = document.createElement('div');
  div.className = 'q';
  const visualHint = item.visualSpec?.uiHint
    ? `<div class="hint">${item.visualSpec.uiHint}</div>`
    : '';
  div.innerHTML = `<p>${qi + 1}. ${item.promptKo}</p>${visualHint}<div class="opts"></div>`;

  const opts = div.querySelector('.opts');
  item.options.forEach((opt) => {
    const b = document.createElement('button');
    b.textContent = opt.labelKo;
    b.title = opt.note || opt.labelKo;
    b.onclick = () => {
      opts.querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      answers[qi] = { question: item, option: opt };
      document.getElementById('saveBtn').disabled = answers.some(a => a === null);
      updatePreview();
    };
    opts.appendChild(b);
  });
  root.appendChild(div);
}

QUESTIONS.forEach(createQuestion);

function calculateOnboardingResult(selectedAnswers) {
  const axes = ONBOARDING.axes || {};
  const sensitivitySignals = ONBOARDING.sensitivitySignals || {};
  const axisScores = {};
  const axisProfile = {};
  const axisConfidence = {};
  const sensitivity = {};

  Object.entries(axes).forEach(([axis, labels]) => {
    axisScores[axis] = {};
    labels.forEach(label => { axisScores[axis][label] = 0; });
  });
  Object.keys(sensitivitySignals).forEach(key => { sensitivity[key] = 0; });

  selectedAnswers.forEach(entry => {
    if (!entry?.option) return;
    Object.entries(entry.option.axisScores || {}).forEach(([axis, scores]) => {
      if (!axisScores[axis]) axisScores[axis] = {};
      Object.entries(scores || {}).forEach(([label, value]) => {
        axisScores[axis][label] = (axisScores[axis][label] || 0) + Number(value || 0);
      });
    });
    Object.entries(entry.option.sensitivityScores || {}).forEach(([key, value]) => {
      sensitivity[key] = Math.min(1, (sensitivity[key] || 0) + Number(value || 0));
    });
  });

  Object.entries(axisScores).forEach(([axis, scores]) => {
    const entries = Object.entries(scores);
    const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
    if (total <= 0) {
      axisProfile[axis] = 'mixed';
      axisConfidence[axis] = 0;
      return;
    }
    const maxScore = Math.max(...entries.map(([, value]) => Number(value || 0)));
    const winners = entries.filter(([, value]) => Number(value || 0) === maxScore).map(([label]) => label);
    axisProfile[axis] = winners.length === 1 ? winners[0] : 'mixed';
    const tiePenalty = winners.length === 1 ? 1 : 0.5;
    axisConfidence[axis] = round2((maxScore / total) * tiePenalty);
  });

  const weights = ONBOARDING.scoringRules?.personaWeights || {};
  let bestPersonaId = 'balanced_rebalancer';
  let bestScore = -1;
  const matchScores = {};

  Object.entries(ONBOARDING.personaPrototypes || {}).forEach(([personaId, proto]) => {
    let score = 0;
    Object.entries(weights).forEach(([axis, weight]) => {
      const userLabel = axisProfile[axis];
      const protoLabel = proto.axisProfile?.[axis];
      if (userLabel && userLabel !== 'mixed' && userLabel === protoLabel) {
        score += Number(weight || 0) * (axisConfidence[axis] || 0);
      }
    });
    matchScores[personaId] = round2(score);
    if (score > bestScore) {
      bestScore = score;
      bestPersonaId = personaId;
    }
  });

  const seedPersona = PERSONA_SEED?.personas?.find(p => p.personaId === bestPersonaId);
  const personaNameKo = personaName(bestPersonaId);
  const avgAxisConfidence = Object.values(axisConfidence).reduce((a, b) => a + b, 0) /
    Math.max(1, Object.keys(axisConfidence).length);
  const onboardingConfidence = round2(Math.min(0.95, Math.max(bestScore, avgAxisConfidence * 0.65)));

  return {
    schemaVersion: ONBOARDING.schemaVersion,
    personaId: bestPersonaId,
    personaNameKo,
    axisProfile,
    axisProfileKo: Object.fromEntries(
      Object.entries(axisProfile).map(([axis, label]) => [axis, label === 'mixed' ? '혼합형' : axisLabel(axis, label)])
    ),
    axisConfidence,
    sensitivity: Object.fromEntries(Object.entries(sensitivity).map(([k, v]) => [k, round2(v)])),
    onboardingConfidence,
    personaMatchScores: matchScores,
    baselineTargets: seedPersona?.baselineTargets || null,
    selectedAnswers: selectedAnswers.map(entry => ({
      questionId: entry.question.questionId,
      optionId: entry.option.optionId,
      labelKo: entry.option.labelKo,
    })),
    resultMessageKo: `현재 응답 기준으로는 ${personaNameKo}에 가장 가깝습니다. 실제 거래 데이터가 쌓이면 이 프로필은 자동으로 조정됩니다.`,
  };
}

function updatePreview() {
  const preview = document.getElementById('preview');
  const completed = answers.filter(Boolean).length;
  if (completed < QUESTIONS.length) {
    preview.style.display = completed ? 'block' : 'none';
    preview.textContent = `${completed}/${QUESTIONS.length}문항 선택됨`;
    return;
  }
  const result = calculateOnboardingResult(answers);
  preview.style.display = 'block';
  preview.textContent = `${result.personaNameKo} · 온보딩 신뢰도 ${Math.round(result.onboardingConfidence * 100)}%`;
}

document.getElementById('saveBtn').onclick = () => {
  const result = calculateOnboardingResult(answers);
  chrome.storage.local.set({
    [PERSONA_KEY]: result.personaId,
    [ONBOARDING_RESULT_KEY]: result,
    [SURVEY_ANSWERS_KEY]: result.selectedAnswers,
  }, () => {
    // 새 온보딩 결과가 기존 행동 버퍼와 섞이지 않도록 엔진 상태는 재초기화한다.
    chrome.storage.local.remove([STORE_KEY], () => {
      const done = document.getElementById('doneMsg');
      done.textContent = `${result.personaNameKo} 기준선으로 저장됐습니다. Upbit 거래 페이지에서 작동합니다.`;
      done.style.display = 'block';
    });
  });
};

const cd = document.getElementById('cooldown');
chrome.storage.local.get('aiMirror.cooldownOptIn', d => cd.checked = !!d['aiMirror.cooldownOptIn']);
cd.onchange = () => chrome.storage.local.set({ 'aiMirror.cooldownOptIn': cd.checked });

const openDebugTradeBtn = document.getElementById('openDebugTradeBtn');
if (openDebugTradeBtn) {
  openDebugTradeBtn.onclick = () => {
    const url = chrome.runtime.getURL('debug-trade.html');
    window.open(url, '_blank', 'noopener');
  };
}

document.getElementById('inspectBtn').onclick = () => {
  chrome.storage.local.get(null, all => {
    const dump = document.getElementById('dump');
    dump.style.display = 'block';
    dump.textContent = JSON.stringify(all, null, 2);
  });
};

document.getElementById('resetBtn').onclick = () => {
  chrome.storage.local.remove([STORE_KEY, 'aiMirror.volBaseline.v1', ONBOARDING_RESULT_KEY, SURVEY_ANSWERS_KEY, PERSONA_KEY], () => {
    const dump = document.getElementById('dump');
    dump.style.display = 'block';
    dump.textContent = '온보딩 결과, 행동 데이터(버퍼·통계), 거래량 기준선이 모두 삭제되었습니다.';
    document.getElementById('doneMsg').style.display = 'none';
  });
};
