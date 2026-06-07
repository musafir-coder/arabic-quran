// ===== RESET PROGRESS =====
function resetProgress() {
  if (!confirm('Сбросить весь прогресс? Это нельзя отменить.')) return;
  state.progress = {};
  state.streak = 0;
  state.todaySessions = { s1: false, s2: false, s3: false };
  state.dayComplete = false;
  saveState();
  syncToFirebase();
  location.reload();
}

// ===== THEME =====
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-toggle').textContent = isDark ? '☀️ Светлая тема' : '🌙 Тёмная тема';
}
function applyTheme() {
  const saved = localStorage.getItem('theme');
  const btn = document.getElementById('theme-toggle');
  if (saved === 'dark') {
    document.body.classList.add('dark');
    if (btn) btn.textContent = '☀️ Светлая тема';
  } else {
    if (btn) btn.textContent = '🌙 Тёмная тема';
  }
}

// ===== STATE =====
let state = {
  progress: {},       // { wordId: { interval, nextReview, reps, easeFactor } }
  streak: 0,
  lastStudyDate: null,
  todaySessions: { s1: false, s2: false, s3: false },
  dayComplete: false,
};

// ===== FLASHCARD STATE =====
let fc = {
  queue: [],
  current: 0,
  flipped: false,
  timerInterval: null,
  seconds: 15 * 60,
  sessionDone: false,
  doneCount: 0,
};

// ===== QUIZ STATE =====
let qz = {
  words: [],
  current: 0,
  score: 0,
  answered: false,
};

// ===== TIMER STATE =====
let timers = {
  islands: { interval: null, seconds: 15 * 60, running: false },
  listen: { interval: null, seconds: 15 * 60, running: false },
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  loadState();
  checkStreak();
  initFirebase();
  checkName();
  initNav();
  initDashboard();
  initWordList();
  initMobileMenu();
  showPage('dashboard');
});

// ===== LOCAL STORAGE =====
function saveState() {
  localStorage.setItem('arabic_quran_state', JSON.stringify(state));
}
function loadState() {
  const raw = localStorage.getItem('arabic_quran_state');
  if (raw) {
    try { state = { ...state, ...JSON.parse(raw) }; } catch(e) {}
  }
}

// ===== STREAK =====
function checkStreak() {
  const today = new Date().toDateString();
  if (state.lastStudyDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (state.lastStudyDate === yesterday) {
    // streak continues
  } else if (state.lastStudyDate && state.lastStudyDate !== yesterday) {
    state.streak = 0; // broken
  }
  // Reset today's sessions if new day
  if (state.lastStudyDate !== today) {
    state.todaySessions = { s1: false, s2: false, s3: false };
    state.dayComplete = false;
  }
}

// ===== NAVIGATION =====
function initNav() {
  document.querySelectorAll('.nav-link, .bnav-item').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      navigate(page);
      closeMobileMenu();
    });
  });
}

function navigate(page) {
  showPage(page);
  if (page === 'flashcards') initFlashcards();
  if (page === 'quiz') startQuiz();
  if (page === 'lesson') initLesson();
  if (page === 'words') renderWordList();
  if (page === 'leaderboard') buildLeaderboard();
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link, .bnav-item').forEach(l => l.classList.remove('active'));

  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  document.querySelectorAll(`[data-page="${page}"]`).forEach(l => l.classList.add('active'));

  window.scrollTo(0, 0);
}

// ===== MOBILE MENU =====
function initMobileMenu() {
  const btn = document.getElementById('menu-btn');
  if (btn) btn.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}
function closeMobileMenu() {
  document.getElementById('sidebar').classList.remove('open');
}

// ===== DASHBOARD =====
function initDashboard() {
  // Date
  const d = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const el = document.getElementById('today-date');
  if (el) el.textContent = d.toLocaleDateString('ru-RU', opts);

  // Stats
  updateStats();
  updateSessionCards();

  // Word of the day
  renderWordOfDay();

  // Progress bar
  updateProgressBar();
}

function updateStats() {
  const learned = Object.keys(state.progress).length;
  const today = new Date().toDateString();
  const due = WORDS.filter(w => {
    const p = state.progress[w.id];
    if (!p) return true;
    return new Date(p.nextReview) <= new Date();
  }).length;

  setText('stat-learned', learned);
  setText('stat-streak', state.streak);
  setText('stat-due', Math.min(due, WORDS.length));
  setText('stat-total', WORDS.length);
  setText('streak-count', state.streak);
  setText('streak-mobile', state.streak);
}

function updateProgressBar() {
  const learned = Object.keys(state.progress).filter(id => {
    const p = state.progress[id];
    return p && p.reps >= 3;
  }).length;
  const pct = Math.min(100, Math.round((learned / 1000) * 100));
  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = pct + '%';
  setText('progress-learned-num', learned);
  setText('progress-pct', pct + '%');
  setText('phase1-pct', pct + '%');
  const phase1 = document.getElementById('phase1-fill');
  if (phase1) phase1.style.width = Math.min(100, (learned / 250) * 100) + '%';
}

function updateSessionCards() {
  if (state.todaySessions.s1) {
    setClass('sess-1', 'done', true);
    setText('s1-status', '✓ Завершено');
  }
  if (state.todaySessions.s2) {
    setClass('sess-2', 'done', true);
    setText('s2-status', '✓ Завершено');
  }
  if (state.todaySessions.s3) {
    setClass('sess-3', 'done', true);
    setText('s3-status', '✓ Завершено');
  }
}

function renderWordOfDay() {
  const dayIndex = Math.floor(Date.now() / 86400000) % WORDS.length;
  const w = WORDS[dayIndex];
  if (!w) return;
  setText('wod-arabic', w.arabic);
  setText('wod-trans', w.trans);
  setText('wod-ru', w.ru);
  setText('wod-example', w.example);
  setText('wod-example-ru', w.ex_ru);
  setText('wod-source', w.source);
}

// ===== LESSON =====
function initLesson() {
  const preview = document.getElementById('lesson-words-preview');
  if (!preview) return;
  preview.innerHTML = '';
  const words = getDueWords(8);
  words.forEach(w => {
    const chip = document.createElement('div');
    chip.className = 'lesson-word-chip';
    chip.textContent = w.arabic;
    chip.title = w.ru;
    preview.appendChild(chip);
  });
}

function getDueWords(count = 20) {
  const today = new Date();
  const due = WORDS.filter(w => {
    const p = state.progress[w.id];
    if (!p) return true;
    return new Date(p.nextReview) <= today;
  });
  // Mix: new words first, then due for review
  const newWords = due.filter(w => !state.progress[w.id]);
  const review = due.filter(w => state.progress[w.id]);
  return [...newWords, ...review].slice(0, count);
}

// ===== FLASHCARDS =====
function initFlashcards() {
  fc.queue = getDueWords(20);
  if (fc.queue.length === 0) {
    fc.queue = WORDS.slice(0, 20); // fallback
  }
  fc.current = 0;
  fc.flipped = false;
  fc.sessionDone = false;
  fc.doneCount = 0;
  fc.seconds = 15 * 60;

  hide('fc-done');
  show('flashcard-wrap');
  hideRatingBtns();

  renderCard();
  startFCTimer();
}

function renderCard() {
  const w = fc.queue[fc.current];
  if (!w) { showFCDone(); return; }

  const card = document.getElementById('flashcard');
  if (card) card.classList.remove('flipped');
  fc.flipped = false;

  hideRatingBtns();
  setText('card-cat', w.cat);
  setText('card-arabic', w.arabic);
  setText('card-source', w.source);
  setText('card-trans', w.trans);
  setText('card-ru', w.ru);
  setText('card-example-ar', w.example);
  setText('card-example-ru', w.ex_ru);
  const memoEl = document.getElementById('card-memo');
  if (memoEl) {
    memoEl.textContent = w.memo || '';
    memoEl.style.display = w.memo ? 'block' : 'none';
  }
  setText('fc-counter', `${fc.current + 1} / ${fc.queue.length}`);
}

function flipCard() {
  if (fc.sessionDone) return;
  const card = document.getElementById('flashcard');
  if (!card) return;
  if (!fc.flipped) {
    card.classList.add('flipped');
    fc.flipped = true;
    showRatingBtns();
  }
}

function rateCard(rating) {
  const w = fc.queue[fc.current];
  if (!w) return;

  // SRS (simplified SM-2)
  const p = state.progress[w.id] || { interval: 1, reps: 0, easeFactor: 2.5 };
  let { interval, reps, easeFactor } = p;

  if (rating === 'again') {
    interval = 1; reps = 0;
  } else if (rating === 'hard') {
    interval = Math.max(1, Math.round(interval * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
    reps++;
  } else if (rating === 'good') {
    interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(interval * easeFactor);
    reps++;
  } else if (rating === 'easy') {
    interval = reps === 0 ? 4 : Math.round(interval * easeFactor * 1.3);
    easeFactor = Math.min(3.0, easeFactor + 0.15);
    reps++;
  }

  const nextReview = new Date(Date.now() + interval * 86400000).toISOString();
  state.progress[w.id] = { interval, reps, easeFactor, nextReview, lastRating: rating };
  saveState();
  syncToFirebase();

  if (rating !== 'again') {
    fc.doneCount++;
    fc.current++;
  } else {
    // Move to end of queue
    fc.queue.push(fc.queue.splice(fc.current, 1)[0]);
  }

  if (fc.current >= fc.queue.length || fc.current >= 20) {
    showFCDone();
  } else {
    renderCard();
  }

  updateStats();
  updateProgressBar();
}

function showFCDone() {
  fc.sessionDone = true;
  hide('flashcard-wrap');
  hide('rating-btns');
  const done = document.getElementById('fc-done');
  if (done) done.style.display = 'block';
  setText('done-count', fc.doneCount);
  markSession('s1');
  clearInterval(fc.timerInterval);
}

function showRatingBtns() {
  const rb = document.getElementById('rating-btns');
  if (rb) rb.style.display = 'flex';
}
function hideRatingBtns() {
  const rb = document.getElementById('rating-btns');
  if (rb) rb.style.display = 'none';
}

function startFCTimer() {
  clearInterval(fc.timerInterval);
  fc.seconds = 15 * 60;
  fc.timerInterval = setInterval(() => {
    fc.seconds--;
    const m = String(Math.floor(fc.seconds / 60)).padStart(2, '0');
    const s = String(fc.seconds % 60).padStart(2, '0');
    setText('fc-session-time', `⏱ ${m}:${s}`);
    if (fc.seconds <= 0) {
      clearInterval(fc.timerInterval);
      showFCDone();
    }
  }, 1000);
}

// ===== WORD LIST =====
let activeCategory = 'all';

function initWordList() {
  buildCategoryFilters();
}

function buildCategoryFilters() {
  const container = document.getElementById('cat-filters');
  if (!container) return;
  const cats = getCategories();
  container.innerHTML = `<button class="cat-btn active" onclick="filterByCategory('all', this)">Все</button>`;
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = cat;
    btn.onclick = function() { filterByCategory(cat, this); };
    container.appendChild(btn);
  });
}

function filterByCategory(cat, btn) {
  activeCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderWordList();
}

function filterWords() {
  renderWordList();
}

function renderWordList() {
  const table = document.getElementById('words-table');
  if (!table) return;
  const query = (document.getElementById('word-search')?.value || '').toLowerCase();

  const filtered = WORDS.filter(w => {
    const matchCat = activeCategory === 'all' || w.cat === activeCategory;
    const matchQ = !query || w.arabic.includes(query) || w.ru.toLowerCase().includes(query) || w.trans.toLowerCase().includes(query);
    return matchCat && matchQ;
  });

  table.innerHTML = filtered.map(w => {
    const p = state.progress[w.id];
    const known = p && p.reps >= 3;
    return `<div class="word-row ${known ? 'known' : ''}" onclick="openWordDetail(${w.id})">
      <div class="wr-arabic">${w.arabic}</div>
      <div class="wr-trans">${w.trans}</div>
      <div class="wr-ru">${w.ru}</div>
      <div class="wr-cat">${w.cat}</div>
    </div>`;
  }).join('');

  if (filtered.length === 0) {
    table.innerHTML = '<div style="text-align:center;padding:32px;color:#8896b3;">Ничего не найдено</div>';
  }
}

function openWordDetail(id) {
  const w = WORDS.find(x => x.id === id);
  if (!w) return;
  // Simple modal
  const existing = document.getElementById('word-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'word-modal';
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;`;
  modal.innerHTML = `
    <div style="background:#1a2035;border:1px solid #2a3550;border-radius:14px;padding:36px;max-width:480px;width:100%;position:relative;">
      <button onclick="document.getElementById('word-modal').remove()" style="position:absolute;top:12px;right:16px;background:none;border:none;color:#8896b3;font-size:1.4rem;cursor:pointer;">×</button>
      <div style="font-size:0.7rem;font-weight:600;color:#c9a84c;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">${w.cat}</div>
      <div style="font-family:'Amiri',serif;font-size:3.5rem;color:#c9a84c;direction:rtl;text-align:center;margin-bottom:8px;">${w.arabic}</div>
      <div style="text-align:center;color:#8896b3;font-style:italic;margin-bottom:4px;">${w.trans}</div>
      <div style="text-align:center;font-size:1.4rem;font-weight:600;margin-bottom:20px;">${w.ru}</div>
      <div style="background:#111827;border-radius:8px;padding:16px;margin-bottom:12px;">
        <div style="font-family:'Amiri',serif;font-size:1.3rem;direction:rtl;text-align:right;color:#e8c96a;margin-bottom:6px;">${w.example}</div>
        <div style="font-size:0.82rem;color:#8896b3;">${w.ex_ru}</div>
      </div>
      <div style="font-size:0.75rem;color:#c9a84c;text-align:right;">${w.source}</div>
      ${w.freq > 0 ? `<div style="font-size:0.72rem;color:#4a5568;margin-top:8px;">Встречается в Коране: ~${w.freq} раз</div>` : ''}
    </div>
  `;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  document.body.appendChild(modal);
}

// ===== QUIZ =====
function startQuiz() {
  const learned = Object.keys(state.progress);
  let pool;
  if (learned.length >= 8) {
    const learnedWords = WORDS.filter(w => state.progress[w.id]);
    pool = shuffle(learnedWords).slice(0, 10);
  } else {
    pool = shuffle(WORDS).slice(0, 10);
  }

  qz.words = pool;
  qz.current = 0;
  qz.score = 0;
  qz.answered = false;

  hide('quiz-end');
  show('quiz-wrap');
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const w = qz.words[qz.current];
  if (!w) { showQuizEnd(); return; }
  qz.answered = false;

  setText('quiz-q-num', qz.current + 1);
  setText('quiz-total', qz.words.length);
  setText('quiz-word', w.arabic);
  hide('quiz-result');

  // 4 options: correct + 3 random wrong
  const wrong = shuffle(WORDS.filter(x => x.id !== w.id)).slice(0, 3);
  const opts = shuffle([w, ...wrong]);

  const container = document.getElementById('quiz-options');
  if (!container) return;
  container.innerHTML = opts.map(o =>
    `<button class="quiz-opt" onclick="checkAnswer(${o.id}, ${w.id})">${o.ru}</button>`
  ).join('');
}

function checkAnswer(chosenId, correctId) {
  if (qz.answered) return;
  qz.answered = true;

  const opts = document.querySelectorAll('.quiz-opt');
  opts.forEach(btn => {
    btn.disabled = true;
    // Find which word this button represents by text
    const wordForBtn = WORDS.find(w => w.ru === btn.textContent);
    if (wordForBtn) {
      if (wordForBtn.id === correctId) btn.classList.add('correct');
      else if (wordForBtn.id === chosenId && chosenId !== correctId) btn.classList.add('wrong');
    }
  });

  const correct = chosenId === correctId;
  if (correct) qz.score++;

  const result = document.getElementById('quiz-result');
  if (result) {
    result.style.display = 'block';
    result.textContent = correct ? '✓ Правильно!' : `✗ Правильный ответ: ${WORDS.find(w => w.id === correctId)?.ru}`;
    result.style.color = correct ? '#3aaa74' : '#ef4444';
  }

  setTimeout(() => {
    qz.current++;
    if (qz.current >= qz.words.length) {
      showQuizEnd();
    } else {
      renderQuizQuestion();
    }
  }, 1400);
}

function showQuizEnd() {
  hide('quiz-wrap');
  show('quiz-end');
  setText('quiz-score', qz.score);
  setText('quiz-out-of', qz.words.length);
}

// ===== LANGUAGE ISLANDS =====
let islands = [];

function loadIslands() {
  const raw = localStorage.getItem('arabic_islands');
  if (raw) {
    try { islands = JSON.parse(raw); } catch(e) { islands = []; }
  }
}

function saveIslands() {
  localStorage.setItem('arabic_islands', JSON.stringify(islands));
}

function addIsland() {
  loadIslands();
  const ru = document.getElementById('island-ru')?.value.trim();
  const ar = document.getElementById('island-ar')?.value.trim();
  if (!ru && !ar) return;

  islands.push({ id: Date.now(), ru: ru || '', ar: ar || '' });
  saveIslands();
  renderIslands();

  const ruEl = document.getElementById('island-ru');
  const arEl = document.getElementById('island-ar');
  if (ruEl) ruEl.value = '';
  if (arEl) arEl.value = '';
}

function fillIsland(ru, ar) {
  const ruEl = document.getElementById('island-ru');
  const arEl = document.getElementById('island-ar');
  if (ruEl) ruEl.value = ru;
  if (arEl) arEl.value = ar;
  ruEl?.focus();
}

function deleteIsland(id) {
  loadIslands();
  islands = islands.filter(i => i.id !== id);
  saveIslands();
  renderIslands();
}

function renderIslands() {
  loadIslands();
  const list = document.getElementById('islands-list');
  if (!list) return;
  if (islands.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:#4a5568;font-size:0.85rem;">Пока нет предложений. Добавь первое! ↑</div>';
    return;
  }
  list.innerHTML = islands.map(i =>
    `<div class="island-item">
      <div class="island-item-ru">${escHtml(i.ru)}</div>
      <div class="island-item-ar">${escHtml(i.ar)}</div>
      <button class="btn-del" onclick="deleteIsland(${i.id})" title="Удалить">×</button>
    </div>`
  ).join('');
}

// ===== TIMERS =====
function toggleIslandTimer() {
  const t = timers.islands;
  if (t.running) {
    clearInterval(t.interval);
    t.running = false;
    const btn = document.getElementById('island-timer-btn');
    if (btn) { btn.classList.remove('running'); btn.textContent = '▶ Запустить таймер 15 мин'; }
  } else {
    t.seconds = 15 * 60;
    t.running = true;
    const btn = document.getElementById('island-timer-btn');
    if (btn) { btn.classList.add('running'); btn.textContent = '⏸ Остановить'; }
    t.interval = setInterval(() => {
      t.seconds--;
      const m = String(Math.floor(t.seconds / 60)).padStart(2, '0');
      const s = String(t.seconds % 60).padStart(2, '0');
      setText('island-timer', `${m}:${s}`);
      const el = document.getElementById('island-timer');
      if (el) el.classList.toggle('urgent', t.seconds <= 60);
      if (t.seconds <= 0) {
        clearInterval(t.interval);
        t.running = false;
        markSession('s3');
        const complete = document.getElementById('islands-complete');
        if (complete) complete.style.display = 'block';
      }
    }, 1000);
  }
}


function toggleListenTimer() {
  const t = timers.listen;
  if (t.running) {
    clearInterval(t.interval);
    t.running = false;
    const btn = document.getElementById('listen-timer-btn');
    if (btn) { btn.classList.remove('running'); btn.textContent = '▶ Запустить таймер 15 мин'; }
  } else {
    t.seconds = 15 * 60;
    t.running = true;
    const btn = document.getElementById('listen-timer-btn');
    if (btn) { btn.classList.add('running'); btn.textContent = '⏸ Остановить'; }
    t.interval = setInterval(() => {
      t.seconds--;
      const m = String(Math.floor(t.seconds / 60)).padStart(2, '0');
      const s = String(t.seconds % 60).padStart(2, '0');
      setText('listen-timer', `${m}:${s}`);
      const el = document.getElementById('listen-timer');
      if (el) el.classList.toggle('urgent', t.seconds <= 60);
      if (t.seconds <= 0) {
        clearInterval(t.interval);
        t.running = false;
        markListenDone();
      }
    }, 1000);
  }
}

let overlayTimer = null;
let overlaySeconds = 0;
function stopOverlayTimer() {
  clearInterval(overlayTimer);
  document.getElementById('timer-overlay').style.display = 'none';
}

// ===== SESSION TRACKING =====
function markSession(key) {
  state.todaySessions[key] = true;
  state.lastStudyDate = new Date().toDateString();
  saveState();
  updateSessionCards();
  checkAllSessionsDone();
}

function markListenDone() {
  markSession('s2');
  navigate('islands');
}

function markDayComplete() {
  state.streak++;
  state.dayComplete = true;
  saveState();
  updateStats();
  navigate('dashboard');
}

function checkAllSessionsDone() {
  const { s1, s2, s3 } = state.todaySessions;
  if (s1 && s2 && s3 && !state.dayComplete) {
    setTimeout(() => {
      if (confirm('🎉 Ты прошёл все 45 минут! Записать сегодняшний день?')) {
        markDayComplete();
      }
    }, 300);
  }
}

// ===== PAGE INIT HOOKS =====
// Islands page needs to render when visited
const origShowPage = showPage;
function showPageWithHooks(page) {
  origShowPage(page);
  if (page === 'islands') {
    renderIslands();
    const comp = document.getElementById('islands-complete');
    if (comp) comp.style.display = state.todaySessions.s3 ? 'block' : 'none';
  }
  if (page === 'dashboard') {
    initDashboard();
  }
}

// Override navigate
function navigate(page) {
  showPageWithHooks(page);
  if (page === 'flashcards') initFlashcards();
  if (page === 'quiz') startQuiz();
  if (page === 'lesson') initLesson();
  if (page === 'words') { buildCategoryFilters(); renderWordList(); }
  if (page === 'leaderboard') buildLeaderboard();
}

// ===== UTILITIES =====
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function show(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
function setClass(id, cls, add) {
  const el = document.getElementById(id);
  if (el) el.classList[add ? 'add' : 'remove'](cls);
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
