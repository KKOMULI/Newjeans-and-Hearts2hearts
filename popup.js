/* =========================================================================
 * popup.js — 편한 1회 주문금액 + onboarding_question_scoring.json 기반 12문항 온보딩
 * -------------------------------------------------------------------------
 * 온보딩 결과는 확정 성격이 아니라, 실제 거래 데이터가 쌓이기 전까지 쓰는
 * 낮은 신뢰도의 초기 행동 가설이다. 사용자가 직접 입력한 편한 1회 주문
 * 금액은 synthetic seed 금액보다 우선한다.
 * ========================================================================= */

const STORE_KEY = 'mIrror.state.v1';
const PERSONA_KEY = 'mIrror.persona.v1';
const ONBOARDING_RESULT_KEY = 'mIrror.onboardingResult.v1';
const SURVEY_ANSWERS_KEY = 'mIrror.surveyAnswers.v1';
const USER_BASELINE_KEY = 'mIrror.userBaselinePrefs.v1';
const BREAK_POPUP_KEY = 'mIrror.breakPopupOptIn';

const ONBOARDING = globalThis.MIRROR_ONBOARDING_SCORING;
const PERSONA_SEED = globalThis.MIRROR_PERSONA_SEED_DATASET;

if (!ONBOARDING || !Array.isArray(ONBOARDING.questions)) {
  throw new Error('mIrror onboarding data was not loaded. Check mirror-data.js.');
}

const QUESTIONS = ONBOARDING.questions;
const answers = new Array(QUESTIONS.length).fill(null);
const root = document.getElementById('survey');
const amountInput = document.getElementById('comfortAmount');
const amountChips = document.getElementById('amountChips');
const baselinePreview = document.getElementById('baselinePreview');

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
function parseKRWInput(v) {
  const n = Number(String(v || '').replace(/,/g, '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
function formatKRW(n) {
  const value = Math.round(Number(n) || 0);
  if (!value) return '—';
  if (value >= 100000000) return `${round2(value / 100000000)}억 원`;
  if (value >= 10000) return `${Math.round(value / 10000).toLocaleString('ko-KR')}만 원`;
  return `${value.toLocaleString('ko-KR')}원`;
}
function readAmountPreference() {
  const typical = parseKRWInput(amountInput?.value);
  if (!typical) return null;

  // MAD가 너무 작으면 약간의 입력 차이에도 경고가 과하게 뜬다.
  // typical 100만 원이면 금액 이탈 경고 시작점은 대략 160만 원이다.
  const mad = Math.max(
    Math.round(typical * 0.4),
    Math.min(100000, Math.round(typical * 0.5)),
    10000
  );
  const alertAbove = Math.round(typical + mad * 1.5);
  return {
    source: 'user_onboarding_amount',
    typicalOrderAmountKRW: typical,
    amountMadKRW: mad,
    alertAboveKRW: alertAbove,
    labelKo: `약 ${formatKRW(typical)}`,
    noteKo: '사용자가 직접 입력한 편한 1회 주문금액이 synthetic seed 주문금액보다 우선합니다.',
  };
}
function updateAmountPreview() {
  if (!baselinePreview) return;
  const pref = readAmountPreference();
  amountChips?.querySelectorAll('button').forEach(b => {
    b.classList.toggle('on', Number(b.dataset.amount) === pref?.typicalOrderAmountKRW);
  });
  baselinePreview.style.display = 'block';
  if (!pref) {
    baselinePreview.textContent = '금액을 입력하면 seed의 합성 주문금액보다 이 값을 우선 기준으로 씁니다.';
    return;
  }
  baselinePreview.textContent = `초기 기준 주문금액 ${formatKRW(pref.typicalOrderAmountKRW)} · 대략 ${formatKRW(pref.alertAboveKRW)} 이상부터 금액 이탈을 강하게 봅니다.`;
}
function refreshSaveState() {
  const allAnswered = answers.every(a => a !== null);
  const hasAmount = !!readAmountPreference();
  document.getElementById('saveBtn').disabled = !(allAnswered && hasAmount);
}
function storageGet(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}
function storageSet(obj) {
  return new Promise(resolve => chrome.storage.local.set(obj, resolve));
}
function storageRemove(keys) {
  return new Promise(resolve => chrome.storage.local.remove(keys, resolve));
}

function createQuestion(item, qi) {
  const div = document.createElement('div');
  div.className = 'q';
  div.dataset.questionId = item.questionId;
  const visualHint = item.visualSpec?.uiHint
    ? `<div class="hint">${item.visualSpec.uiHint}</div>`
    : '';
  div.innerHTML = `<p>${qi + 1}. ${item.promptKo}</p>${visualHint}<div class="opts"></div>`;

  const opts = div.querySelector('.opts');
  item.options.forEach((opt) => {
    const b = document.createElement('button');
    b.textContent = opt.labelKo;
    b.title = opt.note || opt.labelKo;
    b.dataset.optionId = opt.optionId;
    b.onclick = () => selectOption(qi, opt.optionId, true);
    opts.appendChild(b);
  });
  root.appendChild(div);
}

function selectOption(qi, optionId, userInitiated = false) {
  const item = QUESTIONS[qi];
  const opt = item.options.find(x => x.optionId === optionId);
  if (!opt) return;
  const q = root.querySelector(`[data-question-id="${item.questionId}"]`);
  q?.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.optionId === optionId));
  answers[qi] = { question: item, option: opt };
  refreshSaveState();
  if (userInitiated) document.getElementById('doneMsg').style.display = 'none';
  updatePreview();
}

QUESTIONS.forEach(createQuestion);

amountInput?.addEventListener('input', () => {
  const raw = parseKRWInput(amountInput.value);
  if (raw) amountInput.value = raw.toLocaleString('ko-KR');
  updateAmountPreview();
  refreshSaveState();
  updatePreview();
  document.getElementById('doneMsg').style.display = 'none';
});
amountChips?.querySelectorAll('button').forEach((button) => {
  button.addEventListener('click', () => {
    const amount = Number(button.dataset.amount || 0);
    if (amountInput && amount > 0) amountInput.value = amount.toLocaleString('ko-KR');
    updateAmountPreview();
    refreshSaveState();
    updatePreview();
    document.getElementById('doneMsg').style.display = 'none';
  });
});
updateAmountPreview();
refreshSaveState();

function calculateOnboardingResult(selectedAnswers, amountPreference = readAmountPreference()) {
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
  const seedTargets = seedPersona?.baselineTargets || null;
  const adjustedTargets = seedTargets ? { ...seedTargets } : null;
  if (adjustedTargets && amountPreference?.typicalOrderAmountKRW) {
    adjustedTargets.averageOrderAmountKRW = amountPreference.typicalOrderAmountKRW;
    adjustedTargets.amountMadKRW = amountPreference.amountMadKRW;
    adjustedTargets.amountAlertAboveKRW = amountPreference.alertAboveKRW;
    adjustedTargets.amountSource = amountPreference.source;
  }

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
    initialBaseline: amountPreference || null,
    baselineTargets: adjustedTargets,
    baselineTargetsFromSeed: seedTargets,
    selectedAnswers: selectedAnswers.map(entry => ({
      questionId: entry.question.questionId,
      optionId: entry.option.optionId,
      labelKo: entry.option.labelKo,
    })),
    resultMessageKo: `현재 응답 기준으로는 ${personaNameKo}에 가장 가깝고, 편한 1회 주문금액은 ${amountPreference ? formatKRW(amountPreference.typicalOrderAmountKRW) : '미입력'}으로 저장됩니다. 실제 거래 데이터가 쌓이면 이 프로필은 자동으로 조정됩니다.`,
    savedAt: Date.now(),
  };
}

function updatePreview() {
  const preview = document.getElementById('preview');
  const completed = answers.filter(Boolean).length;
  const pref = readAmountPreference();
  if (completed < QUESTIONS.length || !pref) {
    preview.style.display = completed || pref ? 'block' : 'none';
    const amountPart = pref ? `기준 주문금액 ${formatKRW(pref.typicalOrderAmountKRW)} 입력됨` : '편한 주문금액 미입력';
    preview.textContent = `${completed}/${QUESTIONS.length}문항 선택됨 · ${amountPart}`;
    return;
  }
  const result = calculateOnboardingResult(answers, pref);
  preview.style.display = 'block';
  preview.textContent = `${result.personaNameKo} · 기준 주문금액 ${formatKRW(pref.typicalOrderAmountKRW)} · 온보딩 신뢰도 ${Math.round(result.onboardingConfidence * 100)}%`;
}

async function saveOnboarding() {
  const pref = readAmountPreference();
  if (!pref || answers.some(a => a === null)) return;
  const result = calculateOnboardingResult(answers, pref);
  await storageSet({
    [PERSONA_KEY]: result.personaId,
    [ONBOARDING_RESULT_KEY]: result,
    [SURVEY_ANSWERS_KEY]: result.selectedAnswers,
    [USER_BASELINE_KEY]: result.initialBaseline,
  });
  // 새 온보딩 기준선이 과거 데모/이전 페르소나 상태와 섞이지 않도록 엔진 상태만 재초기화한다.
  await storageRemove([STORE_KEY]);
  const done = document.getElementById('doneMsg');
  done.textContent = `${result.personaNameKo} · ${formatKRW(pref.typicalOrderAmountKRW)} 기준선으로 저장됐습니다. 열려 있는 Upbit 탭에도 즉시 반영됩니다.`;
  done.style.display = 'block';
}

document.getElementById('saveBtn').onclick = saveOnboarding;

const breakPopup = document.getElementById('breakPopup');
storageGet([BREAK_POPUP_KEY]).then(d => { breakPopup.checked = !!d[BREAK_POPUP_KEY]; });
breakPopup.onchange = () => storageSet({ [BREAK_POPUP_KEY]: breakPopup.checked });

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

function resetSurveyUi() {
  answers.fill(null);
  if (amountInput) amountInput.value = '';
  updateAmountPreview();
  root.querySelectorAll('.opts button').forEach(b => b.classList.remove('on'));
  refreshSaveState();
  document.getElementById('preview').style.display = 'none';
  document.getElementById('doneMsg').style.display = 'none';
}

document.getElementById('resetBtn').onclick = async () => {
  const all = await storageGet(null);
  const keys = Object.keys(all).filter(k => k.startsWith('mIrror.') || k.startsWith('aiMirror.'));
  if (keys.length) await storageRemove(keys);
  resetSurveyUi();
  breakPopup.checked = false;
  const dump = document.getElementById('dump');
  dump.style.display = 'block';
  dump.textContent = keys.length
    ? `초기화 완료: ${keys.length}개 로컬 키를 삭제했습니다. 열린 Upbit 탭의 기준선도 기본 데모 상태로 다시 로드됩니다.`
    : '삭제할 로컬 데이터가 없었습니다.';
};

async function restoreSavedAnswers() {
  const data = await storageGet([SURVEY_ANSWERS_KEY, ONBOARDING_RESULT_KEY, USER_BASELINE_KEY]);
  const savedBaseline = data[ONBOARDING_RESULT_KEY]?.initialBaseline || data[USER_BASELINE_KEY];
  if (savedBaseline?.typicalOrderAmountKRW && amountInput) {
    amountInput.value = Number(savedBaseline.typicalOrderAmountKRW).toLocaleString('ko-KR');
    updateAmountPreview();
  }
  const saved = Array.isArray(data[SURVEY_ANSWERS_KEY]) ? data[SURVEY_ANSWERS_KEY] : [];
  saved.forEach(item => {
    const qi = QUESTIONS.findIndex(q => q.questionId === item.questionId);
    if (qi >= 0) selectOption(qi, item.optionId, false);
  });
  const result = data[ONBOARDING_RESULT_KEY];
  if (result?.personaNameKo) {
    const done = document.getElementById('doneMsg');
    const amountText = result.initialBaseline?.typicalOrderAmountKRW
      ? ` · ${formatKRW(result.initialBaseline.typicalOrderAmountKRW)}`
      : '';
    done.textContent = `현재 저장된 기준선: ${result.personaNameKo}${amountText}`;
    done.style.display = 'block';
  }
  refreshSaveState();
  updatePreview();
}
restoreSavedAnswers();
