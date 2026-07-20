'use strict';
/* ==========================================================================
   MATH RUSH — APP.JS
   ========================================================================== */

/* ============================== CONFIG ============================== */
const CONFIG = {
  STORAGE_KEY: 'mathRushData',
  RECENT_QUESTIONS_LIMIT: 5,
  SPRINT_DURATION: 60,
  MYRECORD_DURATION: 60,
  CONTRARRELOJ_START: 30,
  CONTRARRELOJ_CORRECT_BONUS: 2,
  CONTRARRELOJ_WRONG_PENALTY: 2,
  PRECISION_TARGET_QUESTIONS: 20,
  FEEDBACK_DELAY_MS: 650,
  FEEDBACK_DELAY_FAST_MS: 450,

  DIFFICULTIES: [
    { id: 'easy', label: 'Fácil' },
    { id: 'medium', label: 'Medio' },
    { id: 'hard', label: 'Difícil' },
    { id: 'expert', label: 'Experto' },
  ],
  CATEGORIES: [
    { id: 'addition', label: 'Sumas' },
    { id: 'subtraction', label: 'Restas' },
    { id: 'multiplication', label: 'Multiplicaciones' },
    { id: 'division', label: 'Divisiones' },
    { id: 'mixed', label: 'Mixto' },
  ],
  MODES: [
    { id: 'sprint', icon: '⚡', name: 'Sprint 60s', desc: 'Resuelve todas las operaciones que puedas en 60 segundos.', timed: true },
    { id: 'precision', icon: '🎯', name: 'Precisión', desc: 'Resuelve 20 operaciones cometiendo la menor cantidad de errores posible.', timed: false },
    { id: 'contrarreloj', icon: '⏱️', name: 'Contrarreloj', desc: 'Cada respuesta correcta te da más tiempo.', timed: true },
    { id: 'myrecord', icon: '🏆', name: 'Mi Récord', desc: 'Compite contra tu mejor resultado anterior.', timed: true },
    { id: 'training', icon: '🧠', name: 'Entrenamiento', desc: 'Practica sin cronómetro y mejora tus habilidades.', timed: false },
  ],
  DIFFICULTY_RANGES: {
    easy:   { addMin: 1,  addMax: 20,  multMax: 5,  divDivisorMax: 5,  divQuotientMax: 10 },
    medium: { addMin: 1,  addMax: 100, multMax: 10, divDivisorMax: 10, divQuotientMax: 12 },
    hard:   { addMin: 10, addMax: 200, multMax: 12, divDivisorMax: 12, divQuotientMax: 12 },
    expert: { addMin: 20, addMax: 300, multMax: 13, divDivisorMax: 13, divQuotientMax: 15 },
  },
  DAILY_STAGES: [
    { key: 'warmup', label: 'Calentamiento', icon: '🔥', durationSec: 120, category: 'mixed' },
    { key: 'speed', label: 'Velocidad', icon: '⚡', durationSec: 180, category: 'mixed' },
    { key: 'precision', label: 'Precisión', icon: '🎯', durationSec: 120, category: 'mixed' },
    { key: 'weak', label: 'Área débil', icon: '🧠', durationSec: 120, category: 'mixed', focusWeak: true },
    { key: 'final', label: 'Desafío final', icon: '🏆', durationSec: 60, category: 'mixed' },
  ],
  LEVEL_BASE_WIDTH: 200,
  LEVEL_WIDTH_STEP: 100,
};

/* ============================== STATE ============================== */
const appState = {
  currentView: 'dashboard',
  previousView: 'dashboard',
  selectedMode: 'sprint',
  selectedCategory: 'mixed',
  selectedDifficulty: 'medium',
  session: null,
  onboardingStep: 0,
  audioCtx: null,
};

let mathRushData = null;

/* ============================== STORAGE ============================== */
function defaultData() {
  return {
    player: { name: '', age: null, onboarded: false },
    xp: 0,
    records: {
      sprintBest: 0,
      precisionBestAccuracy: 0,
      bestCombo: 0,
      fastestAnswer: null,
      maxSessionXP: 0,
      maxStreak: 0,
    },
    streak: { current: 0, lastDate: null },
    skills: {
      addition: { correct: 0, total: 0, timeSum: 0 },
      subtraction: { correct: 0, total: 0, timeSum: 0 },
      multiplication: { correct: 0, total: 0, timeSum: 0 },
      division: { correct: 0, total: 0, timeSum: 0 },
    },
    weakOperations: {},
    history: [],
    settings: {
      duration: 10,
      initialDifficulty: 'medium',
      sound: true,
      animations: true,
      theme: 'light',
    },
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    const base = defaultData();
    return {
      ...base,
      ...parsed,
      player: { ...base.player, ...(parsed.player || {}) },
      records: { ...base.records, ...(parsed.records || {}) },
      streak: { ...base.streak, ...(parsed.streak || {}) },
      skills: { ...base.skills, ...(parsed.skills || {}) },
      weakOperations: parsed.weakOperations || {},
      history: parsed.history || [],
      settings: { ...base.settings, ...(parsed.settings || {}) },
    };
  } catch (e) {
    console.warn('Math Rush: no se pudieron leer los datos guardados, se reinicia.', e);
    return defaultData();
  }
}

function saveData() {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(mathRushData));
  } catch (e) {
    console.warn('Math Rush: no se pudieron guardar los datos.', e);
  }
}

/* ============================== QUESTION ENGINE ============================== */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateAddition(difficulty) {
  const r = CONFIG.DIFFICULTY_RANGES[difficulty];
  const a = randInt(r.addMin, r.addMax);
  const b = randInt(r.addMin, r.addMax);
  return { a, b, op: '+', opKey: 'addition', answer: a + b, text: `${a} + ${b}` };
}

function generateSubtraction(difficulty) {
  const r = CONFIG.DIFFICULTY_RANGES[difficulty];
  let a = randInt(r.addMin, r.addMax);
  let b = randInt(r.addMin, r.addMax);
  if (b > a) [a, b] = [b, a];
  return { a, b, op: '-', opKey: 'subtraction', answer: a - b, text: `${a} - ${b}` };
}

function generateMultiplication(difficulty) {
  const r = CONFIG.DIFFICULTY_RANGES[difficulty];
  const a = randInt(1, r.multMax);
  const b = randInt(1, r.multMax);
  return { a, b, op: '×', opKey: 'multiplication', answer: a * b, text: `${a} × ${b}` };
}

function generateDivision(difficulty) {
  const r = CONFIG.DIFFICULTY_RANGES[difficulty];
  const divisor = randInt(2, r.divDivisorMax);
  const quotient = randInt(2, r.divQuotientMax);
  const dividend = divisor * quotient;
  return { a: dividend, b: divisor, op: '÷', opKey: 'division', answer: quotient, text: `${dividend} ÷ ${divisor}` };
}

function generateMixed(difficulty) {
  const generators = [generateAddition, generateSubtraction, generateMultiplication, generateDivision];
  const fn = generators[randInt(0, generators.length - 1)];
  return fn(difficulty);
}

const GENERATORS = {
  addition: generateAddition,
  subtraction: generateSubtraction,
  multiplication: generateMultiplication,
  division: generateDivision,
  mixed: generateMixed,
};

function operationWeightKey(q) {
  return `${q.opKey}:${q.a}${q.op}${q.b}`;
}

function generateQuestion(category, difficulty, recentTexts, focusWeak) {
  let q = null;
  const useWeak = (focusWeak || Math.random() < 0.3) && pickWeakQuestion(category, difficulty);
  if (useWeak) {
    q = useWeak;
  } else {
    const fn = GENERATORS[category] || generateMixed;
    q = fn(difficulty);
  }
  let attempts = 0;
  while (recentTexts.includes(q.text) && attempts < 8) {
    const fn = GENERATORS[category] || generateMixed;
    q = fn(difficulty);
    attempts++;
  }
  registerQuestionWeight(q);
  return q;
}

/* ============================== ADAPTIVE ENGINE ============================== */
function registerQuestionWeight(q) {
  const key = operationWeightKey(q);
  if (!mathRushData.weakOperations[key]) {
    mathRushData.weakOperations[key] = {
      text: q.text, opKey: q.opKey, weight: 1, total: 0, wrong: 0, timeSum: 0,
    };
  }
}

function pickWeakQuestion(category, difficulty) {
  const entries = Object.values(mathRushData.weakOperations).filter(e => {
    if (e.total < 1) return false;
    if (category !== 'mixed' && e.opKey !== category) return false;
    return e.weight > 1.1;
  });
  if (!entries.length) return null;
  entries.sort((x, y) => y.weight - x.weight);
  const pool = entries.slice(0, 8);
  const chosen = pool[randInt(0, pool.length - 1)];
  const m = chosen.text.match(/^(-?\d+)\s*([+\-×÷])\s*(-?\d+)$/);
  if (!m) return null;
  const a = parseInt(m[1], 10), op = m[2], b = parseInt(m[3], 10);
  let answer;
  if (op === '+') answer = a + b;
  else if (op === '-') answer = a - b;
  else if (op === '×') answer = a * b;
  else answer = a / b;
  if (!Number.isInteger(answer)) return null;
  return { a, b, op, opKey: chosen.opKey, answer, text: chosen.text };
}

function updateWeight(q, wasCorrect, elapsedSec) {
  const key = operationWeightKey(q);
  const entry = mathRushData.weakOperations[key];
  if (!entry) return;
  entry.total += 1;
  entry.timeSum += elapsedSec;
  if (!wasCorrect) {
    entry.wrong += 1;
    entry.weight = Math.min(5, entry.weight * 1.5);
  } else if (elapsedSec > 4) {
    entry.weight = Math.min(5, entry.weight * 1.15);
  } else {
    entry.weight = Math.max(0.2, entry.weight * 0.85);
  }
}

function updateSkill(opKey, wasCorrect, elapsedSec) {
  const skill = mathRushData.skills[opKey];
  if (!skill) return;
  skill.total += 1;
  if (wasCorrect) skill.correct += 1;
  skill.timeSum += elapsedSec;
}

function skillAccuracy(opKey) {
  const s = mathRushData.skills[opKey];
  if (!s || s.total === 0) return null;
  return Math.round((s.correct / s.total) * 100);
}

/* ============================== SCORING ============================== */
function comboMultiplier(combo) {
  return 1 + Math.min(combo, 10) * 0.1;
}

function computeAnswerScore(wasCorrect, elapsedSec, comboBeforeAnswer) {
  if (!wasCorrect) return 0;
  let base = 100;
  if (elapsedSec < 1.5) base += 50;
  else if (elapsedSec < 3) base += 25;
  return Math.round(base * comboMultiplier(comboBeforeAnswer));
}

/* ============================== XP SYSTEM ============================== */
function computeAnswerXP(wasCorrect, elapsedSec, comboAfterAnswer) {
  if (!wasCorrect) return 0;
  let xp = 10;
  if (elapsedSec < 3) xp += 5;
  if (elapsedSec < 1.5) xp += 10;
  if (comboAfterAnswer > 0 && comboAfterAnswer % 5 === 0) xp += 15;
  return xp;
}

function levelWidth(level) {
  return CONFIG.LEVEL_BASE_WIDTH + CONFIG.LEVEL_WIDTH_STEP * (level - 1);
}

function computeLevelInfo(xp) {
  let level = 1;
  let floor = 0;
  let width = levelWidth(level);
  let guard = 0;
  while (xp >= floor + width && guard < 500) {
    floor += width;
    level += 1;
    width = levelWidth(level);
    guard++;
  }
  const into = xp - floor;
  const pct = Math.min(100, Math.round((into / width) * 100));
  return { level, xpIntoLevel: into, xpForNextLevel: width - into, levelWidth: width, pct };
}

/* ============================== STREAK SYSTEM ============================== */
function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

function updateStreakOnSession() {
  const today = dateKey(new Date());
  const last = mathRushData.streak.lastDate;
  if (last === today) return;
  if (!last) {
    mathRushData.streak.current = 1;
  } else {
    const lastDate = new Date(last + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');
    const diffDays = Math.round((todayDate - lastDate) / 86400000);
    if (diffDays === 1) mathRushData.streak.current += 1;
    else if (diffDays > 1) mathRushData.streak.current = 1;
  }
  mathRushData.streak.lastDate = today;
  if (mathRushData.streak.current > mathRushData.records.maxStreak) {
    mathRushData.records.maxStreak = mathRushData.streak.current;
  }
}

/* ============================== STATISTICS ============================== */
function weeklyAccuracy() {
  const weekAgo = Date.now() - 7 * 86400000;
  const recent = mathRushData.history.filter(h => h.timestamp >= weekAgo);
  if (!recent.length) return null;
  const totalCorrect = recent.reduce((s, h) => s + h.correct, 0);
  const totalQ = recent.reduce((s, h) => s + h.totalQuestions, 0);
  if (!totalQ) return null;
  return Math.round((totalCorrect / totalQ) * 100);
}

function last7DaysSpeed() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push(dateKey(d));
  }
  return days.map(day => {
    const sessions = mathRushData.history.filter(h => h.date === day);
    if (!sessions.length) return null;
    const avg = sessions.reduce((s, h) => s + h.avgTime, 0) / sessions.length;
    return Math.round(avg * 10) / 10;
  });
}

function overallStats() {
  const totalOps = Object.values(mathRushData.skills).reduce((s, sk) => s + sk.total, 0);
  const totalCorrect = Object.values(mathRushData.skills).reduce((s, sk) => s + sk.correct, 0);
  const timeSum = Object.values(mathRushData.skills).reduce((s, sk) => s + sk.timeSum, 0);
  const avgSpeed = totalOps ? (timeSum / totalOps) : null;
  const accuracy = totalOps ? Math.round((totalCorrect / totalOps) * 100) : null;
  return {
    avgSpeed, accuracy, sessions: mathRushData.history.length, totalOps,
    bestRecord: mathRushData.records.sprintBest, streak: mathRushData.streak.current,
  };
}

function weakOperationsList() {
  return Object.values(mathRushData.weakOperations)
    .filter(e => e.total >= 2 && e.wrong > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)
    .map(e => ({
      text: e.text,
      avgTime: Math.round((e.timeSum / e.total) * 10) / 10,
      errorPct: Math.round((e.wrong / e.total) * 100),
    }));
}

/* ============================== GAME ENGINE ============================== */
function isTimedMode(mode) {
  return mode === 'sprint' || mode === 'contrarreloj' || mode === 'myrecord' || mode === 'daily';
}

function startSession(mode, category, difficulty, opts) {
  opts = opts || {};
  clearGameTimer();
  const session = {
    mode, category, difficulty,
    isDaily: mode === 'daily',
    dailyStageIndex: 0,
    timeLeft: mode === 'contrarreloj' ? CONFIG.CONTRARRELOJ_START
             : mode === 'sprint' || mode === 'myrecord' ? CONFIG.SPRINT_DURATION
             : mode === 'daily' ? CONFIG.DAILY_STAGES[0].durationSec
             : 0,
    initialTime: mode === 'contrarreloj' ? CONFIG.CONTRARRELOJ_START
             : mode === 'sprint' || mode === 'myrecord' ? CONFIG.SPRINT_DURATION
             : mode === 'daily' ? CONFIG.DAILY_STAGES[0].durationSec : 0,
    paused: false,
    answering: false,
    score: 0,
    combo: 0,
    maxCombo: 0,
    correct: 0,
    incorrect: 0,
    xpEarned: 0,
    currentQuestion: null,
    questionStartTime: 0,
    recentTexts: [],
    answerTimes: [],
    startedAt: Date.now(),
  };
  appState.session = session;
  document.body.classList.add('in-game');
  navigateTo('game');
  renderGameChrome();
  loadNextQuestion();
  if (isTimedMode(mode)) startGameTimer();
}

function clearGameTimer() {
  if (appState.gameTimerId) {
    clearInterval(appState.gameTimerId);
    appState.gameTimerId = null;
  }
}

function startGameTimer() {
  clearGameTimer();
  appState.gameTimerId = setInterval(() => {
    const s = appState.session;
    if (!s || s.paused) return;
    s.timeLeft -= 1;
    if (s.timeLeft <= 0) {
      s.timeLeft = 0;
      updateGameHUD();
      if (s.isDaily) {
        advanceDailyStage();
      } else {
        endSession(true);
      }
      return;
    }
    updateGameHUD();
  }, 1000);
}

function advanceDailyStage() {
  const s = appState.session;
  const nextIndex = s.dailyStageIndex + 1;
  if (nextIndex >= CONFIG.DAILY_STAGES.length) {
    endSession(true);
    return;
  }
  s.dailyStageIndex = nextIndex;
  const stage = CONFIG.DAILY_STAGES[nextIndex];
  s.timeLeft = stage.durationSec;
  s.initialTime = stage.durationSec;
  s.category = stage.category;
  showStageTransition(stage, nextIndex);
}

function showStageTransition(stage, index) {
  const overlay = document.getElementById('stageOverlay');
  document.getElementById('stageOverlayTitle').textContent = `${stage.icon} ${stage.label}`;
  document.getElementById('stageOverlaySub').textContent = `Etapa ${index + 1} de ${CONFIG.DAILY_STAGES.length}`;
  overlay.classList.remove('hidden');
  const s = appState.session;
  s.paused = true;
  setTimeout(() => {
    overlay.classList.add('hidden');
    s.paused = false;
    updateGameHUD();
    loadNextQuestion();
  }, 1600);
}

function loadNextQuestion() {
  const s = appState.session;
  if (!s) return;
  if (s.mode === 'precision' && s.correct + s.incorrect >= CONFIG.PRECISION_TARGET_QUESTIONS) {
    endSession(true);
    return;
  }
  const stage = s.isDaily ? CONFIG.DAILY_STAGES[s.dailyStageIndex] : null;
  const focusWeak = stage ? !!stage.focusWeak : false;
  const q = generateQuestion(s.category, s.difficulty, s.recentTexts, focusWeak);
  s.currentQuestion = q;
  s.recentTexts.push(q.text);
  if (s.recentTexts.length > CONFIG.RECENT_QUESTIONS_LIMIT) s.recentTexts.shift();
  s.questionStartTime = performance.now();
  s.answering = false;
  const qEl = document.getElementById('questionText');
  qEl.textContent = q.text;
  qEl.classList.remove('question-in');
  void qEl.offsetWidth;
  qEl.classList.add('question-in');
  const input = document.getElementById('answerInput');
  input.value = '';
  focusAnswerInput();
  updateGameHUD();
}

function focusAnswerInput() {
  const input = document.getElementById('answerInput');
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;
  input.focus({ preventScroll: true });
}

function submitAnswer() {
  const s = appState.session;
  if (!s || s.answering || s.paused || !s.currentQuestion) return;
  const input = document.getElementById('answerInput');
  const raw = input.value.trim();
  if (raw === '' || raw === '-') return;
  const value = parseInt(raw, 10);
  if (Number.isNaN(value)) return;

  s.answering = true;
  const elapsedMs = performance.now() - s.questionStartTime;
  const elapsedSec = elapsedMs / 1000;
  const wasCorrect = value === s.currentQuestion.answer;
  const comboBefore = s.combo;

  if (wasCorrect) {
    s.correct += 1;
    s.combo += 1;
    if (s.combo > s.maxCombo) s.maxCombo = s.combo;
  } else {
    s.incorrect += 1;
    s.combo = 0;
  }

  const points = computeAnswerScore(wasCorrect, elapsedSec, comboBefore);
  s.score += points;
  const xp = computeAnswerXP(wasCorrect, elapsedSec, s.combo);
  s.xpEarned += xp;
  s.answerTimes.push(elapsedSec);

  updateWeight(s.currentQuestion, wasCorrect, elapsedSec);
  updateSkill(s.currentQuestion.opKey, wasCorrect, elapsedSec);

  if (s.mode === 'contrarreloj') {
    s.timeLeft += wasCorrect ? CONFIG.CONTRARRELOJ_CORRECT_BONUS : -CONFIG.CONTRARRELOJ_WRONG_PENALTY;
    if (s.timeLeft < 0) s.timeLeft = 0;
  }

  playSound(wasCorrect ? 'correct' : 'incorrect');
  showFeedback(wasCorrect, elapsedSec, s.currentQuestion.answer);
  updateGameHUD();

  const delay = elapsedSec < 1.5 ? CONFIG.FEEDBACK_DELAY_FAST_MS : CONFIG.FEEDBACK_DELAY_MS;
  setTimeout(() => {
    const cur = appState.session;
    if (!cur) return;
    if (cur.mode === 'contrarreloj' && cur.timeLeft <= 0) {
      endSession(true);
      return;
    }
    loadNextQuestion();
  }, delay);
}

function showFeedback(wasCorrect, elapsedSec, correctAnswer) {
  const toast = document.getElementById('feedbackToast');
  let msg = '';
  if (wasCorrect) {
    toast.className = 'feedback-toast correct';
    if (elapsedSec < 1.2) msg = '🔥 ¡Increíble!';
    else if (elapsedSec < 2.5) msg = '⚡ ¡Rápido!';
    else msg = '✓ ¡Correcto!';
  } else {
    toast.className = 'feedback-toast incorrect';
    msg = `✗ Casi — la respuesta era ${correctAnswer}`;
  }
  toast.textContent = msg;
  toast.classList.remove('hidden');
  const comboBadge = document.getElementById('comboBadge');
  const s = appState.session;
  if (wasCorrect && s.combo >= 3) {
    comboBadge.textContent = s.combo >= 10 ? '🚀 ¡IMPARABLE!' : `🔥 Combo ×${s.combo}`;
    comboBadge.classList.remove('hidden');
  } else {
    comboBadge.classList.add('hidden');
  }
  setTimeout(() => toast.classList.add('hidden'), CONFIG.FEEDBACK_DELAY_MS - 80);
}

function updateGameHUD() {
  const s = appState.session;
  if (!s) return;
  const modeConf = CONFIG.MODES.find(m => m.id === s.mode);
  document.getElementById('hudCorrect').textContent = s.correct;
  document.getElementById('hudScore').textContent = s.score.toLocaleString('es');

  const timeEl = document.getElementById('hudTime');
  const fill = document.getElementById('timeBarFill');
  if (isTimedMode(s.mode)) {
    timeEl.textContent = `${s.timeLeft}s`;
    const pct = s.initialTime ? Math.max(0, Math.min(100, (s.timeLeft / s.initialTime) * 100)) : 100;
    fill.style.width = pct + '%';
    fill.classList.toggle('low', s.timeLeft <= 10);
  } else if (s.mode === 'precision') {
    const answered = s.correct + s.incorrect;
    timeEl.textContent = `${answered}/${CONFIG.PRECISION_TARGET_QUESTIONS}`;
    fill.style.width = Math.round((answered / CONFIG.PRECISION_TARGET_QUESTIONS) * 100) + '%';
    fill.classList.remove('low');
  } else {
    timeEl.textContent = '∞';
    fill.style.width = '100%';
    fill.classList.remove('low');
  }

  const dailyLabel = document.getElementById('dailyStageLabel');
  if (s.isDaily) {
    dailyLabel.textContent = `${CONFIG.DAILY_STAGES[s.dailyStageIndex].icon} Paso ${s.dailyStageIndex + 1} de ${CONFIG.DAILY_STAGES.length}`;
    dailyLabel.classList.remove('hidden');
  } else {
    dailyLabel.classList.add('hidden');
  }

  const compare = document.getElementById('recordCompare');
  if (s.mode === 'myrecord') {
    document.getElementById('compareRecord').textContent = mathRushData.records.sprintBest;
    document.getElementById('compareToday').textContent = s.correct;
    compare.classList.remove('hidden');
  } else {
    compare.classList.add('hidden');
  }
}

function renderGameChrome() {
  const s = appState.session;
  const modeConf = CONFIG.MODES.find(m => m.id === s.mode) || { icon: '⚡', name: 'Entrenamiento' };
  document.getElementById('gameModeLabel').textContent = s.isDaily ? '📅 Entrenamiento diario' : `${modeConf.icon} ${modeConf.name}`;
  document.getElementById('gamePauseBtn').classList.toggle('hidden', !isTimedMode(s.mode));
  document.getElementById('comboBadge').classList.add('hidden');
  document.getElementById('feedbackToast').classList.add('hidden');
  updateGameHUD();
}

function endSession(save) {
  clearGameTimer();
  const s = appState.session;
  document.body.classList.remove('in-game');
  if (!s) { navigateTo('dashboard'); return; }

  if (!save) {
    appState.session = null;
    navigateTo('dashboard');
    return;
  }

  const totalQuestions = s.correct + s.incorrect;
  const accuracy = totalQuestions ? Math.round((s.correct / totalQuestions) * 100) : 0;
  const avgTime = s.answerTimes.length ? s.answerTimes.reduce((a, b) => a + b, 0) / s.answerTimes.length : 0;
  const bestTime = s.answerTimes.length ? Math.min(...s.answerTimes) : 0;
  const worstTime = s.answerTimes.length ? Math.max(...s.answerTimes) : 0;
  const durationSec = Math.round((Date.now() - s.startedAt) / 1000);

  let newRecord = false;
  let prevRecordValue = 0;

  if (s.mode === 'sprint' || s.mode === 'myrecord') {
    prevRecordValue = mathRushData.records.sprintBest;
    if (s.correct > mathRushData.records.sprintBest) {
      mathRushData.records.sprintBest = s.correct;
      newRecord = true;
    }
  } else if (s.mode === 'precision') {
    prevRecordValue = mathRushData.records.precisionBestAccuracy;
    if (accuracy > mathRushData.records.precisionBestAccuracy) {
      mathRushData.records.precisionBestAccuracy = accuracy;
      newRecord = true;
    }
  }
  if (s.maxCombo > mathRushData.records.bestCombo) mathRushData.records.bestCombo = s.maxCombo;
  if (bestTime > 0 && (mathRushData.records.fastestAnswer === null || bestTime < mathRushData.records.fastestAnswer)) {
    mathRushData.records.fastestAnswer = Math.round(bestTime * 10) / 10;
  }
  if (s.xpEarned > mathRushData.records.maxSessionXP) mathRushData.records.maxSessionXP = s.xpEarned;

  mathRushData.xp += s.isDaily ? s.xpEarned + 500 : s.xpEarned;
  updateStreakOnSession();
  saveData_HistoryEntry(s, { totalQuestions, accuracy, avgTime, bestTime, worstTime, durationSec });
  saveData();

  appState.lastResult = {
    s, totalQuestions, accuracy, avgTime, bestTime, worstTime, newRecord, prevRecordValue,
    dailyBonus: s.isDaily ? 500 : 0,
  };
  appState.session = null;
  renderResults(appState.lastResult);
  navigateTo('results');
  if (newRecord) {
    playSound('record');
    launchConfetti();
  }
}

function saveData_HistoryEntry(s, stats) {
  mathRushData.history.push({
    timestamp: Date.now(),
    date: dateKey(new Date()),
    mode: s.mode,
    category: s.category,
    difficulty: s.difficulty,
    duration: stats.durationSec,
    totalQuestions: stats.totalQuestions,
    correct: s.correct,
    incorrect: s.incorrect,
    accuracy: stats.accuracy,
    avgTime: Math.round(stats.avgTime * 10) / 10,
    bestTime: Math.round(stats.bestTime * 10) / 10,
    worstTime: Math.round(stats.worstTime * 10) / 10,
    bestCombo: s.maxCombo,
    score: s.score,
    xpEarned: s.xpEarned,
  });
  if (mathRushData.history.length > 200) mathRushData.history.shift();
}

/* ============================== SOUND ============================== */
function getAudioCtx() {
  if (!appState.audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    appState.audioCtx = new Ctx();
  }
  return appState.audioCtx;
}

function playSound(kind) {
  if (!mathRushData.settings.sound) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const now = ctx.currentTime;
  const patterns = {
    correct: [[660, 0, 0.09], [880, 0.09, 0.11]],
    incorrect: [[220, 0, 0.16]],
    record: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.2]],
    levelup: [[440, 0, 0.09], [554, 0.09, 0.09], [659, 0.18, 0.16]],
  };
  const seq = patterns[kind] || patterns.correct;
  seq.forEach(([freq, start, dur]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.18, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.02);
  });
}

/* ============================== CONFETTI ============================== */
function launchConfetti() {
  if (!mathRushData.settings.animations) return;
  const layer = document.getElementById('confettiLayer');
  const colors = ['#2563EB', '#7C3AED', '#22C55E', '#FACC15', '#F97316'];
  for (let i = 0; i < 40; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[randInt(0, colors.length - 1)];
    piece.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
    piece.style.animationDelay = (Math.random() * 0.4) + 's';
    layer.appendChild(piece);
    setTimeout(() => piece.remove(), 3200);
  }
}

function showToast(msg) {
  const layer = document.getElementById('toastLayer');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  layer.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

/* ============================== UI RENDERING ============================== */
function renderDashboard() {
  const name = mathRushData.player.name || 'campeón';
  document.getElementById('greetingName').textContent = `¡Hola, ${name}! 👋`;
  const info = computeLevelInfo(mathRushData.xp);
  document.getElementById('chipStreak').textContent = mathRushData.streak.current;
  document.getElementById('chipLevel').textContent = info.level;
  const wAcc = weeklyAccuracy();
  document.getElementById('chipAccuracy').textContent = wAcc === null ? '--' : wAcc + '%';

  document.getElementById('heroStreak').textContent = `${mathRushData.streak.current} días`;
  document.getElementById('heroLevel').textContent = info.level;
  document.getElementById('heroXP').textContent = mathRushData.xp.toLocaleString('es');
  document.getElementById('heroAccuracy').textContent = wAcc === null ? '--%' : wAcc + '%';
  document.getElementById('headerXP').textContent = `⚡ ${mathRushData.xp.toLocaleString('es')} XP`;

  const best = mathRushData.records.sprintBest;
  if (best > 0) {
    document.getElementById('recordText').textContent = `${best} respuestas correctas en 60 segundos`;
    document.getElementById('recordSubText').textContent = '¿Puedes superarlo?';
  } else {
    document.getElementById('recordText').textContent = 'Aún no tienes récord';
    document.getElementById('recordSubText').textContent = '¡Crea tu primer récord!';
  }

  const grid = document.getElementById('modeGrid');
  grid.innerHTML = '';
  CONFIG.MODES.forEach(m => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'mode-card';
    card.setAttribute('aria-label', m.name);
    card.innerHTML = `<div class="mode-icon">${m.icon}</div><div class="mode-name">${m.name}</div><div class="mode-desc">${m.desc}</div>`;
    card.addEventListener('click', () => openSetup(m.id));
    grid.appendChild(card);
  });
}

function openSetup(modeId) {
  appState.selectedMode = modeId;
  const modeConf = CONFIG.MODES.find(m => m.id === modeId);
  document.getElementById('setupModeTitle').textContent = `${modeConf.icon} ${modeConf.name}`;
  document.getElementById('setupModeDesc').textContent = modeConf.desc;

  const catGroup = document.getElementById('categoryGroup');
  catGroup.innerHTML = '';
  CONFIG.CATEGORIES.forEach(c => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'pill' + (c.id === appState.selectedCategory ? ' selected' : '');
    pill.textContent = c.label;
    pill.setAttribute('role', 'radio');
    pill.setAttribute('aria-checked', c.id === appState.selectedCategory ? 'true' : 'false');
    pill.addEventListener('click', () => {
      appState.selectedCategory = c.id;
      [...catGroup.children].forEach(ch => { ch.classList.remove('selected'); ch.setAttribute('aria-checked', 'false'); });
      pill.classList.add('selected');
      pill.setAttribute('aria-checked', 'true');
    });
    catGroup.appendChild(pill);
  });

  const diffGroup = document.getElementById('difficultyGroup');
  diffGroup.innerHTML = '';
  CONFIG.DIFFICULTIES.forEach(d => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'pill' + (d.id === appState.selectedDifficulty ? ' selected' : '');
    pill.textContent = d.label;
    pill.setAttribute('role', 'radio');
    pill.setAttribute('aria-checked', d.id === appState.selectedDifficulty ? 'true' : 'false');
    pill.addEventListener('click', () => {
      appState.selectedDifficulty = d.id;
      [...diffGroup.children].forEach(ch => { ch.classList.remove('selected'); ch.setAttribute('aria-checked', 'false'); });
      pill.classList.add('selected');
      pill.setAttribute('aria-checked', 'true');
    });
    diffGroup.appendChild(pill);
  });

  navigateTo('setup');
}

function renderResults(result) {
  const { s, totalQuestions, accuracy, avgTime, bestTime, worstTime, newRecord, prevRecordValue, dailyBonus } = result;
  document.getElementById('resultsTitle').textContent = s.isDaily ? '🏆 ¡Entrenamiento diario completado!' : '🏆 ¡Buen trabajo!';
  document.getElementById('resultsScore').textContent = s.score.toLocaleString('es');
  document.getElementById('resCorrect').textContent = s.correct;
  document.getElementById('resIncorrect').textContent = s.incorrect;
  document.getElementById('resAccuracy').textContent = accuracy + '%';
  document.getElementById('resAvgTime').textContent = (Math.round(avgTime * 10) / 10) + 's';
  document.getElementById('resBestCombo').textContent = '×' + s.maxCombo;
  document.getElementById('resXP').textContent = '+' + (s.xpEarned + dailyBonus);

  const compareBox = document.getElementById('resultsCompare');
  if (s.mode === 'sprint' || s.mode === 'myrecord' || s.mode === 'precision') {
    compareBox.classList.remove('hidden');
    document.getElementById('resToday').textContent = s.mode === 'precision' ? accuracy + '%' : s.correct;
    document.getElementById('resPrevRecord').textContent = s.mode === 'precision' ? prevRecordValue + '%' : prevRecordValue;
  } else {
    compareBox.classList.add('hidden');
  }

  document.getElementById('newRecordBanner').classList.toggle('hidden', !newRecord);

  const tip = document.getElementById('pedagogyTip');
  if (accuracy < 80 && totalQuestions >= 5) {
    tip.textContent = 'Vamos a bajar un poco la velocidad y concentrarnos en responder correctamente.';
    tip.classList.remove('hidden');
  } else if (accuracy > 90 && totalQuestions >= 5) {
    tip.textContent = '¡Excelente precisión! Ahora intenta responder un poco más rápido.';
    tip.classList.remove('hidden');
  } else {
    tip.classList.add('hidden');
  }
}

function renderProgress() {
  const stats = overallStats();
  const cards = document.getElementById('progressCards');
  const items = [
    { label: 'Velocidad promedio', value: stats.avgSpeed !== null ? Math.round(stats.avgSpeed * 10) / 10 + 's' : '--' },
    { label: 'Precisión', value: stats.accuracy !== null ? stats.accuracy + '%' : '--' },
    { label: 'Sesiones', value: stats.sessions },
    { label: 'Total operaciones', value: stats.totalOps },
    { label: 'Mejor récord', value: stats.bestRecord > 0 ? stats.bestRecord : '--' },
    { label: 'Racha actual', value: stats.streak + ' días' },
  ];
  cards.innerHTML = items.map(i => `<div class="progress-stat"><div class="p-label">${i.label}</div><div class="p-value">${i.value}</div></div>`).join('');

  renderSpeedChart(last7DaysSpeed());
  renderSkills();
}

function renderSpeedChart(values) {
  const svg = document.getElementById('speedChart');
  const W = 320, H = 140, PAD = 20;
  const valid = values.map((v, i) => ({ v, i })).filter(o => o.v !== null);
  if (!valid.length) {
    svg.innerHTML = `<text x="${W/2}" y="${H/2}" text-anchor="middle" fill="var(--text-muted)" font-size="13">Todavía no hay datos suficientes</text>`;
    return;
  }
  const maxV = Math.max(...valid.map(o => o.v), 1);
  const minV = 0;
  const stepX = (W - PAD * 2) / 6;
  const points = values.map((v, i) => {
    const x = PAD + stepX * i;
    if (v === null) return null;
    const y = H - PAD - ((v - minV) / (maxV - minV || 1)) * (H - PAD * 2);
    return { x, y, v };
  });
  const pathPoints = points.filter(p => p !== null);
  const path = pathPoints.map((p, idx) => (idx === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const dots = pathPoints.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--blue)" />`).join('');
  const gradientId = 'speedGradient';
  svg.innerHTML = `
    <defs>
      <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2563EB" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#2563EB" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path d="${path} L${pathPoints[pathPoints.length-1].x},${H-PAD} L${pathPoints[0].x},${H-PAD} Z" fill="url(#${gradientId})" stroke="none" />
    <path d="${path}" fill="none" stroke="#2563EB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
    ${dots}
  `;
}

function renderSkills() {
  const list = document.getElementById('skillsList');
  const labels = { addition: 'Suma', subtraction: 'Resta', multiplication: 'Multiplicación', division: 'División' };
  const rows = Object.keys(labels).map(key => {
    const acc = skillAccuracy(key);
    const pct = acc === null ? 0 : acc;
    return { key, label: labels[key], pct, acc };
  });
  list.innerHTML = rows.map(r => `
    <div class="skill-row">
      <div class="skill-head"><span>${r.label}</span><span>${r.acc === null ? '--' : r.acc + '%'}</span></div>
      <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${r.pct}%"></div></div>
    </div>
  `).join('');

  const withData = rows.filter(r => r.acc !== null);
  const recommendCard = document.getElementById('recommendCard');
  if (withData.length) {
    const weakest = withData.reduce((a, b) => (a.pct < b.pct ? a : b));
    document.getElementById('recommendText').textContent = `💡 Te recomendamos practicar ${weakest.label.toLowerCase()}s`;
    recommendCard.classList.remove('hidden');
    recommendCard.dataset.category = weakest.key === 'addition' ? 'addition' : weakest.key;
  } else {
    recommendCard.classList.add('hidden');
  }

  const weakOps = weakOperationsList();
  const weakList = document.getElementById('weakOpsList');
  const weakEmpty = document.getElementById('weakOpsEmpty');
  const trainBtn = document.getElementById('trainWeakBtn');
  if (weakOps.length) {
    weakEmpty.classList.add('hidden');
    weakList.innerHTML = weakOps.map(o => `<li><span>${o.text}</span><span class="op-meta">${o.avgTime}s · ${o.errorPct}% error</span></li>`).join('');
    trainBtn.classList.remove('hidden');
  } else {
    weakEmpty.classList.remove('hidden');
    weakList.innerHTML = '';
    trainBtn.classList.add('hidden');
  }
}

function renderRecords() {
  const r = mathRushData.records;
  const tiles = [
    { icon: '⚡', label: 'Sprint 60s', value: r.sprintBest > 0 ? r.sprintBest + ' correctas' : '--' },
    { icon: '🎯', label: 'Precisión', value: r.precisionBestAccuracy > 0 ? r.precisionBestAccuracy + '%' : '--' },
    { icon: '🔥', label: 'Mejor combo', value: r.bestCombo > 0 ? '×' + r.bestCombo : '--' },
    { icon: '⏱️', label: 'Respuesta más rápida', value: r.fastestAnswer !== null ? r.fastestAnswer + 's' : '--' },
    { icon: '⭐', label: 'Mayor XP en sesión', value: r.maxSessionXP > 0 ? r.maxSessionXP + ' XP' : '--' },
    { icon: '📅', label: 'Mayor racha', value: r.maxStreak > 0 ? r.maxStreak + ' días' : '--' },
  ];
  document.getElementById('recordsGrid').innerHTML = tiles.map(t => `
    <div class="record-tile">
      <div class="r-icon">${t.icon}</div>
      <div class="r-value">${t.value}</div>
      <div class="r-label">${t.label}</div>
    </div>
  `).join('');
}

function renderSettings() {
  document.getElementById('settingName').value = mathRushData.player.name || '';
  document.getElementById('settingAge').value = mathRushData.player.age || '';

  const durationGroup = document.getElementById('durationGroup');
  durationGroup.innerHTML = '';
  [5, 10, 15, 20].forEach(min => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'pill' + (mathRushData.settings.duration === min ? ' selected' : '');
    pill.textContent = min + ' min';
    pill.addEventListener('click', () => {
      mathRushData.settings.duration = min;
      saveData();
      renderSettings();
    });
    durationGroup.appendChild(pill);
  });

  const diffGroup = document.getElementById('initialDifficultyGroup');
  diffGroup.innerHTML = '';
  [{ id: 'easy', label: 'Fácil' }, { id: 'medium', label: 'Medio' }, { id: 'hard', label: 'Difícil' }].forEach(d => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'pill' + (mathRushData.settings.initialDifficulty === d.id ? ' selected' : '');
    pill.textContent = d.label;
    pill.addEventListener('click', () => {
      mathRushData.settings.initialDifficulty = d.id;
      appState.selectedDifficulty = d.id;
      saveData();
      renderSettings();
    });
    diffGroup.appendChild(pill);
  });

  setSwitch('soundToggle', mathRushData.settings.sound);
  setSwitch('animToggle', mathRushData.settings.animations);
  setSwitch('darkToggle', mathRushData.settings.theme === 'dark');
}

function setSwitch(id, on) {
  const el = document.getElementById(id);
  el.setAttribute('aria-checked', on ? 'true' : 'false');
}

function renderParents() {
  const weekAgo = Date.now() - 7 * 86400000;
  const recent = mathRushData.history.filter(h => h.timestamp >= weekAgo);
  const sessions = recent.length;
  const timeMin = Math.round(recent.reduce((s, h) => s + h.duration, 0) / 60);
  const ops = recent.reduce((s, h) => s + h.totalQuestions, 0);
  const totalCorrect = recent.reduce((s, h) => s + h.correct, 0);
  const accuracy = ops ? Math.round((totalCorrect / ops) * 100) : 0;

  const half = Math.ceil(recent.length / 2) || 1;
  const firstHalf = recent.slice(0, half);
  const secondHalf = recent.slice(half);
  const avg = arr => arr.length ? arr.reduce((s, h) => s + h.avgTime, 0) / arr.length : null;
  const speedStart = avg(firstHalf);
  const speedEnd = avg(secondHalf) ?? speedStart;

  let improvement = '--';
  if (speedStart && speedEnd && speedStart > 0) {
    const pct = Math.round(((speedStart - speedEnd) / speedStart) * 100);
    improvement = (pct >= 0 ? '+' : '') + pct + '%';
  }

  const skillLabels = { addition: 'Sumas', subtraction: 'Restas', multiplication: 'Multiplicaciones', division: 'Divisiones' };
  const skillEntries = Object.keys(skillLabels).map(k => ({ key: k, acc: skillAccuracy(k) })).filter(e => e.acc !== null);
  let strong = '--', weak = '--';
  if (skillEntries.length) {
    strong = skillLabels[skillEntries.reduce((a, b) => (a.acc > b.acc ? a : b)).key];
    weak = skillLabels[skillEntries.reduce((a, b) => (a.acc < b.acc ? a : b)).key];
  }

  const items = [
    { label: 'Sesiones', value: sessions },
    { label: 'Tiempo entrenado', value: timeMin + ' min' },
    { label: 'Operaciones', value: ops },
    { label: 'Precisión', value: accuracy + '%' },
    { label: 'Velocidad', value: speedStart && speedEnd ? `${Math.round(speedStart*10)/10}s → ${Math.round(speedEnd*10)/10}s` : '--' },
    { label: 'Mejora', value: improvement },
  ];
  document.getElementById('parentsGrid').innerHTML = items.map(i => `<div class="progress-stat"><div class="p-label">${i.label}</div><div class="p-value">${i.value}</div></div>`).join('');

  const msg = sessions
    ? `Esta semana practicó ${sessions} sesiones. Su punto fuerte son las ${strong.toLowerCase()} y le recomendamos seguir reforzando las ${weak.toLowerCase()}.`
    : 'Todavía no hay sesiones esta semana. ¡Anímalo a completar su entrenamiento diario!';
  document.getElementById('parentsMessage').textContent = msg;
}

/* ============================== NAVIGATION ============================== */
const NAV_VIEWS = ['dashboard', 'setup', 'game', 'results', 'progress', 'records', 'settings', 'parents'];

function navigateTo(view) {
  if (appState.session && appState.currentView === 'game' && view !== 'game') {
    requestExitConfirmation(() => actuallyNavigate(view));
    return;
  }
  actuallyNavigate(view);
}

function actuallyNavigate(view) {
  appState.previousView = appState.currentView;
  appState.currentView = view;
  NAV_VIEWS.forEach(v => {
    document.getElementById('view-' + v).classList.toggle('active', v === view);
  });
  document.querySelectorAll('.nav-item, .bn-item').forEach(btn => {
    const target = btn.dataset.view;
    const isVisible = target === view || (view === 'setup' && target === 'setup');
    btn.classList.toggle('active', target === view);
  });

  if (view === 'dashboard') renderDashboard();
  else if (view === 'progress') renderProgress();
  else if (view === 'records') renderRecords();
  else if (view === 'settings') renderSettings();
  else if (view === 'parents') renderParents();

  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}

function requestExitConfirmation(onConfirm) {
  const overlay = document.getElementById('exitOverlay');
  const s = appState.session;
  const title = document.getElementById('exitTitle');
  const sub = document.getElementById('exitSubtitle');
  if (s && s.isDaily) {
    title.textContent = '¿Quieres abandonar el entrenamiento diario?';
  } else {
    title.textContent = '¿Quieres abandonar el entrenamiento?';
  }
  sub.textContent = 'El progreso de esta sesión no se guardará.';
  overlay.classList.remove('hidden');
  if (s) s.paused = true;

  const cancelBtn = document.getElementById('exitCancelBtn');
  const confirmBtn = document.getElementById('exitConfirmBtn');
  const cleanup = () => {
    overlay.classList.add('hidden');
    cancelBtn.removeEventListener('click', onCancel);
    confirmBtn.removeEventListener('click', onOk);
  };
  const onCancel = () => {
    if (appState.session) appState.session.paused = false;
    cleanup();
  };
  const onOk = () => {
    clearGameTimer();
    appState.session = null;
    document.body.classList.remove('in-game');
    cleanup();
    onConfirm();
  };
  cancelBtn.addEventListener('click', onCancel);
  confirmBtn.addEventListener('click', onOk);
}

/* ============================== EVENT HANDLERS ============================== */
function bindEvents() {
  document.querySelectorAll('.nav-item, .bn-item').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });
  document.querySelectorAll('.link-back').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.view));
  });

  document.getElementById('startDailyBtn').addEventListener('click', () => {
    startSession('daily', 'mixed', mathRushData.settings.initialDifficulty || 'medium');
  });
  document.getElementById('challengeRecordBtn').addEventListener('click', () => {
    startSession('myrecord', 'mixed', mathRushData.settings.initialDifficulty || 'medium');
  });

  document.getElementById('setupStartBtn').addEventListener('click', () => {
    startSession(appState.selectedMode, appState.selectedCategory, appState.selectedDifficulty);
  });

  document.getElementById('gameExitBtn').addEventListener('click', () => {
    requestExitConfirmation(() => actuallyNavigate('dashboard'));
  });
  document.getElementById('gamePauseBtn').addEventListener('click', togglePause);
  document.getElementById('resumeBtn').addEventListener('click', togglePause);
  document.getElementById('pauseExitBtn').addEventListener('click', () => {
    document.getElementById('pauseOverlay').classList.add('hidden');
    requestExitConfirmation(() => actuallyNavigate('dashboard'));
  });

  document.getElementById('answerForm').addEventListener('submit', e => {
    e.preventDefault();
    submitAnswer();
  });

  document.getElementById('numpad').addEventListener('click', e => {
    const btn = e.target.closest('button[data-key]');
    if (!btn) return;
    const key = btn.dataset.key;
    const input = document.getElementById('answerInput');
    if (key === 'back') input.value = input.value.slice(0, -1);
    else if (key === 'ok') submitAnswer();
    else input.value += key;
    if (key !== 'ok') focusAnswerInputForce();
  });

  document.addEventListener('keydown', e => {
    if (appState.currentView !== 'game') return;
    if (e.key === 'Escape') {
      const pauseOverlay = document.getElementById('pauseOverlay');
      if (!pauseOverlay.classList.contains('hidden')) return;
      const s = appState.session;
      if (s && isTimedMode(s.mode) && !s.paused) togglePause();
      else requestExitConfirmation(() => actuallyNavigate('dashboard'));
    }
  });

  document.getElementById('resultsRetryBtn').addEventListener('click', () => {
    const last = appState.lastResult;
    if (!last) { navigateTo('dashboard'); return; }
    startSession(last.s.mode, last.s.category, last.s.difficulty);
  });
  document.getElementById('resultsHomeBtn').addEventListener('click', () => navigateTo('dashboard'));

  document.getElementById('recommendBtn').addEventListener('click', () => {
    const cat = document.getElementById('recommendCard').dataset.category || 'mixed';
    appState.selectedCategory = cat;
    openSetup('training');
  });
  document.getElementById('trainWeakBtn').addEventListener('click', () => {
    appState.selectedCategory = 'mixed';
    openSetup('training');
  });

  document.getElementById('openParentsBtn').addEventListener('click', () => navigateTo('parents'));
  document.getElementById('openParentsBtn2').addEventListener('click', () => navigateTo('parents'));

  document.getElementById('settingName').addEventListener('change', e => {
    mathRushData.player.name = e.target.value.trim();
    saveData();
  });
  document.getElementById('settingAge').addEventListener('change', e => {
    const v = parseInt(e.target.value, 10);
    mathRushData.player.age = Number.isNaN(v) ? null : v;
    saveData();
  });

  document.getElementById('soundToggle').addEventListener('click', () => {
    mathRushData.settings.sound = !mathRushData.settings.sound;
    setSwitch('soundToggle', mathRushData.settings.sound);
    saveData();
  });
  document.getElementById('animToggle').addEventListener('click', () => {
    mathRushData.settings.animations = !mathRushData.settings.animations;
    setSwitch('animToggle', mathRushData.settings.animations);
    document.body.classList.toggle('no-animations', !mathRushData.settings.animations);
    saveData();
  });
  document.getElementById('darkToggle').addEventListener('click', () => {
    const on = mathRushData.settings.theme !== 'dark';
    mathRushData.settings.theme = on ? 'dark' : 'light';
    applyTheme();
    setSwitch('darkToggle', on);
    saveData();
  });
  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    document.getElementById('darkToggle').click();
  });

  document.getElementById('replayOnboardingBtn').addEventListener('click', () => {
    startOnboarding();
  });

  document.getElementById('clearDataBtn').addEventListener('click', () => {
    if (confirm('¿Seguro que quieres borrar todos tus datos de Math Rush? Esta acción no se puede deshacer.')) {
      localStorage.removeItem(CONFIG.STORAGE_KEY);
      mathRushData = defaultData();
      saveData();
      applyTheme();
      navigateTo('dashboard');
      showToast('Datos borrados');
    }
  });
}

let lastInputTapAt = 0;
function focusAnswerInputForce() {
  const input = document.getElementById('answerInput');
  input.focus({ preventScroll: true });
}

function togglePause() {
  const s = appState.session;
  if (!s) return;
  s.paused = !s.paused;
  const overlay = document.getElementById('pauseOverlay');
  overlay.classList.toggle('hidden', !s.paused);
  if (!s.paused) focusAnswerInput();
}

/* ============================== ONBOARDING ============================== */
function startOnboarding() {
  appState.onboardingStep = 0;
  document.getElementById('onboarding').classList.remove('hidden');
  document.getElementById('onboardingName').value = mathRushData.player.name || '';
  renderOnboardingStep();
}

function renderOnboardingStep() {
  const slides = document.querySelectorAll('.ob-slide');
  slides.forEach((s, i) => s.classList.toggle('active', i === appState.onboardingStep));
  const dotsWrap = document.getElementById('onboardingDots');
  dotsWrap.innerHTML = '';
  slides.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === appState.onboardingStep) dot.classList.add('active');
    dotsWrap.appendChild(dot);
  });
  document.getElementById('obBack').style.visibility = appState.onboardingStep === 0 ? 'hidden' : 'visible';
  document.getElementById('obNext').textContent = appState.onboardingStep === slides.length - 1 ? 'COMENZAR' : 'Siguiente';
  if (appState.onboardingStep === slides.length - 1) {
    document.getElementById('onboardingName').focus();
  }
}

function finishOnboarding() {
  const nameInput = document.getElementById('onboardingName');
  const name = nameInput.value.trim() || 'campeón';
  mathRushData.player.name = name;
  mathRushData.player.onboarded = true;
  saveData();
  document.getElementById('onboarding').classList.add('hidden');
  navigateTo('dashboard');
}

function bindOnboardingEvents() {
  document.getElementById('obNext').addEventListener('click', () => {
    const slides = document.querySelectorAll('.ob-slide');
    if (appState.onboardingStep === slides.length - 1) {
      finishOnboarding();
    } else {
      appState.onboardingStep++;
      renderOnboardingStep();
    }
  });
  document.getElementById('obBack').addEventListener('click', () => {
    if (appState.onboardingStep > 0) {
      appState.onboardingStep--;
      renderOnboardingStep();
    }
  });
  document.getElementById('onboardingName').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); finishOnboarding(); }
  });
}

/* ============================== INITIALIZATION ============================== */
function applyTheme() {
  const theme = mathRushData.settings.theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggleBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
  document.body.classList.toggle('no-animations', !mathRushData.settings.animations);
}

function init() {
  mathRushData = loadData();
  appState.selectedDifficulty = mathRushData.settings.initialDifficulty || 'medium';
  applyTheme();
  bindEvents();
  bindOnboardingEvents();
  actuallyNavigate('dashboard');

  if (!mathRushData.player.onboarded) {
    startOnboarding();
  }
}

document.addEventListener('DOMContentLoaded', init);
