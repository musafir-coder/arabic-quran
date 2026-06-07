// ===== FIREBASE SYNC =====
let _db = null;

function initFirebase() {
  try {
    const cfg = typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG : null;
    if (!cfg || cfg.apiKey === 'YOUR_API_KEY') return;
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    _db = firebase.database();
  } catch(e) {
    console.warn('Firebase init:', e.message);
  }
}

function _userSlug() {
  const name = localStorage.getItem('arabic_user_name') || '';
  return name.trim().toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-zа-яёa-z0-9_]/gi, '') || null;
}

function syncToFirebase() {
  if (!_db) return;
  const slug = _userSlug();
  if (!slug) return;
  _db.ref('aq/users/' + slug).set({
    name: localStorage.getItem('arabic_user_name'),
    words: Object.keys(state.progress || {}).length,
    streak: state.streak || 0,
    day: new Date().toISOString().split('T')[0]
  });
}

function loadLeaderboard(cb) {
  if (!_db) { cb(null); return; }
  _db.ref('aq/users').once('value', snap => {
    const data = snap.val() || {};
    cb(Object.values(data).sort((a, b) => b.words - a.words));
  });
}

// ===== NAME MODAL =====
function checkName() {
  if (!localStorage.getItem('arabic_user_name')) {
    document.getElementById('name-overlay').style.display = 'flex';
  }
}

function submitName() {
  const input = document.getElementById('name-input');
  const name = (input.value || '').trim();
  if (!name) { input.focus(); return; }
  localStorage.setItem('arabic_user_name', name);
  document.getElementById('name-overlay').style.display = 'none';
  syncToFirebase();
}

// ===== LEADERBOARD =====
function buildLeaderboard() {
  const list = document.getElementById('lb-list');
  if (!list) return;
  const myName = localStorage.getItem('arabic_user_name') || '';
  list.innerHTML = '<div class="lb-loading">Загрузка...</div>';

  loadLeaderboard(users => {
    if (!users) {
      list.innerHTML = '<div class="lb-empty">Сначала настрой Firebase — вставь свой config в firebase-config.js</div>';
      return;
    }
    if (!users.length) {
      list.innerHTML = '<div class="lb-empty">Пока никого нет — начни заниматься!</div>';
      return;
    }
    const medals = ['🥇', '🥈', '🥉'];
    list.innerHTML = users.map((u, i) => {
      const isMe = u.name === myName;
      const bar = Math.min(100, Math.round(u.words / 10));
      return `<div class="lb-row${isMe ? ' lb-me' : ''}">
        <div class="lb-rank">${medals[i] || (i + 1)}</div>
        <div class="lb-avatar">${(u.name || '?').charAt(0).toUpperCase()}</div>
        <div class="lb-info">
          <div class="lb-name">${u.name}${isMe ? ' <span class="lb-you">ты</span>' : ''}</div>
          <div class="lb-bar-wrap"><div class="lb-bar" style="width:${bar}%"></div></div>
          <div class="lb-sub">🔥 ${u.streak || 0} дн · последний раз ${u.day || '—'}</div>
        </div>
        <div class="lb-score">${u.words}<span class="lb-score-label"> сл.</span></div>
      </div>`;
    }).join('');
  });
}
