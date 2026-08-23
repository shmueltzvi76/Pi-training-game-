// Pi Training Game - Complete Application Logic
// ============================================

// ---- STATE ----
let gameState = {
  mode: null,
  position: 0,
  startDigit: 1,
  correct: 0,
  incorrect: 0,
  lives: 3,
  maxLives: 3,
  timeLimit: 10,
  hintCount: 3,
  timer: null,
  timerValue: 0,
  isActive: false,
  trail: [],
};

let viewerState = {
  page: 0,
  digitsPerPage: 200,
  format: 1,
  zoom: 1,
  searchHighlights: [],
};

let settings = {
  dailyGoal: 10,
  vibrate: true,
  sound: true,
  theme: 'dark',
};

let stats = {
  sessions: [],
  totalCorrect: 0,
  totalIncorrect: 0,
  bestStreak: 0,
  todayDigits: 0,
  lastPlayDate: null,
  dayStreak: 0,
};

// ---- STORAGE ----
function saveData() {
  try {
    localStorage.setItem('pi_settings', JSON.stringify(settings));
    localStorage.setItem('pi_stats', JSON.stringify(stats));
  } catch (e) { /* storage full or unavailable */ }
}

function loadData() {
  try {
    const s = localStorage.getItem('pi_settings');
    if (s) settings = { ...settings, ...JSON.parse(s) };
    const st = localStorage.getItem('pi_stats');
    if (st) stats = { ...stats, ...JSON.parse(st) };
  } catch (e) { /* parse error */ }
}

function saveSetting(key, value) {
  settings[key] = value;
  saveData();
}

// ---- NAVIGATION ----
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + screenId);
  if (target) {
    target.classList.add('active');
    if (screenId === 'home') updateHomeScreen();
    if (screenId === 'viewer') renderViewer();
    if (screenId === 'statistics') renderStatistics();
    if (screenId === 'settings') loadSettingsUI();
  }
}

// ---- HOME SCREEN ----
function updateHomeScreen() {
  const today = new Date().toDateString();
  if (stats.lastPlayDate !== today) {
    if (stats.lastPlayDate) {
      const lastDate = new Date(stats.lastPlayDate);
      const diff = Math.floor((new Date() - lastDate) / 86400000);
      if (diff > 1) stats.dayStreak = 0;
    }
    stats.todayDigits = 0;
  }
  document.getElementById('home-mastered').textContent = stats.bestStreak;
  document.getElementById('home-streak').textContent = stats.dayStreak;
  const totalAnswers = stats.totalCorrect + stats.totalIncorrect;
  const accuracy = totalAnswers > 0 ? Math.round((stats.totalCorrect / totalAnswers) * 100) : 0;
  document.getElementById('home-best').textContent = accuracy + '%';

  const goalPct = Math.min(100, (stats.todayDigits / settings.dailyGoal) * 100);
  document.getElementById('goal-fill').style.width = goalPct + '%';
  document.getElementById('goal-text').textContent =
    stats.todayDigits + '/' + settings.dailyGoal + ' ספרות';
}

// ---- SETUP HELPERS ----
function adjustSetting(inputId, delta) {
  const input = document.getElementById(inputId);
  let val = parseInt(input.value) || 1;
  val = Math.max(1, Math.min(10000, val + delta));
  input.value = val;
}

function setHint(btn, count) {
  btn.closest('.chip-row').querySelectorAll('.chip').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  gameState.hintCount = count;
}

function setLives(btn, count) {
  btn.closest('.chip-row').querySelectorAll('.chip').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  gameState.maxLives = count;
}

function setTime(btn, seconds) {
  btn.closest('.chip-row').querySelectorAll('.chip').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  gameState.timeLimit = seconds;
}

// ---- GAME START ----
function startTraining() {
  const start = parseInt(document.getElementById('train-start').value) || 1;
  gameState = {
    ...gameState,
    mode: 'training',
    position: start - 1,
    startDigit: start,
    correct: 0,
    incorrect: 0,
    lives: 0,
    maxLives: 0,
    isActive: true,
    trail: [],
  };
  document.getElementById('game-mode-label').textContent = 'אימון';
  document.getElementById('lives-display').style.display = 'none';
  document.getElementById('timer-display').style.display = 'none';
  updateGameUI();
  showScreen('game');
}

function startChallenge() {
  const start = parseInt(document.getElementById('challenge-start').value) || 1;
  gameState = {
    ...gameState,
    mode: 'challenge',
    position: start - 1,
    startDigit: start,
    correct: 0,
    incorrect: 0,
    lives: gameState.maxLives,
    isActive: true,
    trail: [],
  };
  document.getElementById('game-mode-label').textContent = 'אתגר';

  if (gameState.maxLives > 0) {
    document.getElementById('lives-display').style.display = 'block';
    updateLives();
  } else {
    document.getElementById('lives-display').style.display = 'none';
  }

  if (gameState.timeLimit > 0) {
    document.getElementById('timer-display').style.display = 'block';
    startTimer();
  } else {
    document.getElementById('timer-display').style.display = 'none';
  }

  updateGameUI();
  showScreen('game');
}

function retryGame() {
  if (gameState.mode === 'training') {
    document.getElementById('train-start').value = gameState.startDigit;
    startTraining();
  } else {
    document.getElementById('challenge-start').value = gameState.startDigit;
    startChallenge();
  }
}

// ---- GAME LOGIC ----
function updateGameUI() {
  document.getElementById('game-position').textContent = 'ספרה ' + (gameState.position + 1);
  document.getElementById('correct-count').textContent = gameState.correct;
  document.getElementById('incorrect-count').textContent = gameState.incorrect;
  document.getElementById('current-input').textContent = '?';
  document.getElementById('current-input').className = 'input-box';

  // Update trail
  const trailEl = document.getElementById('digits-trail');
  const trailHTML = gameState.trail.map(t =>
    `<span class="${t.correct ? 'correct' : 'incorrect'}">${t.digit}</span>`
  ).join('');
  trailEl.innerHTML = trailHTML;
  trailEl.scrollTop = trailEl.scrollHeight;

  // Update hints
  updateHints();

  // Update progress
  const progress = ((gameState.position - gameState.startDigit + 1) / TOTAL_DIGITS) * 100;
  document.getElementById('game-progress-fill').style.width = Math.min(progress, 100) + '%';
}

function updateHints() {
  const hintEl = document.getElementById('hint-digits');
  if (gameState.hintCount === 0 || gameState.mode === 'challenge') {
    hintEl.textContent = '';
    return;
  }
  const start = gameState.position;
  const hints = [];
  for (let i = 0; i < gameState.hintCount && start + i < TOTAL_DIGITS; i++) {
    hints.push(PI_DIGITS[start + i]);
  }
  hintEl.textContent = hints.join(' ');
}

function updateLives() {
  const hearts = [];
  for (let i = 0; i < gameState.maxLives; i++) {
    hearts.push(i < gameState.lives ? '&#10084;' : '&#9825;');
  }
  document.getElementById('lives-display').innerHTML = hearts.join(' ');
}

function pressDigit(digit) {
  if (!gameState.isActive) return;
  if (gameState.position >= TOTAL_DIGITS) {
    endGame();
    return;
  }

  const expected = parseInt(PI_DIGITS[gameState.position]);
  const inputEl = document.getElementById('current-input');
  const feedbackEl = document.getElementById('game-feedback');

  inputEl.textContent = digit;

  if (digit === expected) {
    // Correct
    gameState.correct++;
    gameState.trail.push({ digit: digit, correct: true });
    inputEl.className = 'input-box correct';
    feedbackEl.textContent = 'נכון!';
    feedbackEl.className = 'feedback correct';

    if (settings.vibrate && navigator.vibrate) navigator.vibrate(30);

    gameState.position++;
    stats.todayDigits++;

    if (gameState.timeLimit > 0) resetTimer();

    setTimeout(() => {
      if (gameState.isActive) updateGameUI();
    }, 200);
  } else {
    // Incorrect
    gameState.incorrect++;
    gameState.trail.push({ digit: digit, correct: false });
    inputEl.className = 'input-box incorrect';
    feedbackEl.textContent = 'שגוי! הספרה הנכונה: ' + expected;
    feedbackEl.className = 'feedback incorrect';

    if (settings.vibrate && navigator.vibrate) navigator.vibrate([50, 50, 50]);

    if (gameState.mode === 'challenge' && gameState.maxLives > 0) {
      gameState.lives--;
      updateLives();
      if (gameState.lives <= 0) {
        setTimeout(() => endGame(), 600);
        return;
      }
    }

    if (gameState.mode === 'training') {
      gameState.position++;
    } else {
      gameState.position++;
    }

    if (gameState.timeLimit > 0) resetTimer();

    setTimeout(() => {
      if (gameState.isActive) updateGameUI();
    }, 500);
  }
}

// ---- TIMER ----
function startTimer() {
  gameState.timerValue = gameState.timeLimit;
  document.getElementById('timer-value').textContent = gameState.timerValue;
  document.getElementById('timer-display').className = 'timer';

  if (gameState.timer) clearInterval(gameState.timer);
  gameState.timer = setInterval(() => {
    gameState.timerValue--;
    document.getElementById('timer-value').textContent = gameState.timerValue;

    if (gameState.timerValue <= 3) {
      document.getElementById('timer-display').className = 'timer danger';
    } else if (gameState.timerValue <= 5) {
      document.getElementById('timer-display').className = 'timer warning';
    }

    if (gameState.timerValue <= 0) {
      // Time's up - count as wrong
      const expected = parseInt(PI_DIGITS[gameState.position]);
      gameState.incorrect++;
      gameState.trail.push({ digit: '?', correct: false });

      const feedbackEl = document.getElementById('game-feedback');
      feedbackEl.textContent = 'אזל הזמן! הספרה: ' + expected;
      feedbackEl.className = 'feedback incorrect';

      if (gameState.maxLives > 0) {
        gameState.lives--;
        updateLives();
        if (gameState.lives <= 0) {
          clearInterval(gameState.timer);
          setTimeout(() => endGame(), 600);
          return;
        }
      }

      gameState.position++;
      resetTimer();
      setTimeout(() => {
        if (gameState.isActive) updateGameUI();
      }, 400);
    }
  }, 1000);
}

function resetTimer() {
  gameState.timerValue = gameState.timeLimit;
  document.getElementById('timer-value').textContent = gameState.timerValue;
  document.getElementById('timer-display').className = 'timer';
}

function endGame() {
  gameState.isActive = false;
  if (gameState.timer) clearInterval(gameState.timer);

  const total = gameState.correct + gameState.incorrect;
  const accuracy = total > 0 ? Math.round((gameState.correct / total) * 100) : 0;

  // Update best streak
  if (gameState.correct > stats.bestStreak) {
    stats.bestStreak = gameState.correct;
  }

  // Update day streak
  const today = new Date().toDateString();
  if (stats.lastPlayDate !== today) {
    if (stats.lastPlayDate) {
      const last = new Date(stats.lastPlayDate);
      const diff = Math.floor((new Date() - last) / 86400000);
      if (diff === 1) stats.dayStreak++;
      else if (diff > 1) stats.dayStreak = 1;
    } else {
      stats.dayStreak = 1;
    }
  }
  stats.lastPlayDate = today;

  // Save session
  const session = {
    id: Date.now(),
    mode: gameState.mode,
    startDigit: gameState.startDigit,
    correct: gameState.correct,
    incorrect: gameState.incorrect,
    accuracy: accuracy,
    reachedDigit: gameState.position,
    date: new Date().toISOString(),
  };
  stats.sessions.unshift(session);
  if (stats.sessions.length > 100) stats.sessions = stats.sessions.slice(0, 100);
  stats.totalCorrect += gameState.correct;
  stats.totalIncorrect += gameState.incorrect;
  saveData();

  // Show game over
  document.getElementById('gameover-icon').innerHTML =
    accuracy >= 80 ? '&#127942;' : accuracy >= 50 ? '&#11088;' : '&#128170;';
  document.getElementById('gameover-title').textContent =
    accuracy >= 80 ? 'מצוין!' : accuracy >= 50 ? 'לא רע!' : 'המשך לתרגל!';
  document.getElementById('go-correct').textContent = gameState.correct;
  document.getElementById('go-incorrect').textContent = gameState.incorrect;
  document.getElementById('go-accuracy').textContent = accuracy + '%';
  document.getElementById('go-reached').textContent = gameState.position;
  showScreen('gameover');
}

// ---- DIGITS VIEWER ----
function renderViewer() {
  const grid = document.getElementById('digits-grid');
  const perPage = viewerState.digitsPerPage;
  const start = viewerState.page * perPage;
  const end = Math.min(start + perPage, TOTAL_DIGITS);
  const fmt = viewerState.format;

  const sizes = [16, 18, 22, 28, 34];
  const sizeIdx = Math.max(0, Math.min(sizes.length - 1, viewerState.zoom));
  grid.style.fontSize = sizes[sizeIdx] + 'px';

  let html = '';
  let lineDigits = sizeIdx >= 3 ? 10 : (fmt >= 10 ? 10 : 20);

  for (let i = start; i < end; i++) {
    // Row marker at start of each line
    if ((i - start) % lineDigits === 0) {
      if (i !== start) html += '<br>';
      html += `<span class="row-marker">${i + 1}</span>`;
    }

    // Group separator
    if (fmt > 1 && (i - start) % fmt === 0 && (i - start) % lineDigits !== 0) {
      html += ' ';
    }

    // Check if this digit is highlighted
    const isHighlighted = viewerState.searchHighlights.some(
      h => i >= h.start && i < h.start + h.length
    );

    if (isHighlighted) {
      html += `<span class="digit highlight">${PI_DIGITS[i]}</span>`;
    } else {
      html += `<span class="digit">${PI_DIGITS[i]}</span>`;
    }
  }

  grid.innerHTML = html;

  // Update page info
  const totalPages = Math.ceil(TOTAL_DIGITS / perPage);
  document.getElementById('viewer-page-info').textContent =
    `עמוד ${viewerState.page + 1} / ${totalPages}`;
  document.getElementById('viewer-range').textContent =
    `ספרות ${start + 1} – ${end} מתוך ${TOTAL_DIGITS.toLocaleString()}`;
  document.getElementById('zoom-level').textContent = 'x' + (viewerState.zoom + 1);
}

function viewerPage(delta) {
  const totalPages = Math.ceil(TOTAL_DIGITS / viewerState.digitsPerPage);
  viewerState.page = Math.max(0, Math.min(totalPages - 1, viewerState.page + delta));
  renderViewer();
}

function viewerZoom(delta) {
  viewerState.zoom = Math.max(0, Math.min(4, viewerState.zoom + delta));
  renderViewer();
}

function setFormat(btn, fmt) {
  document.querySelectorAll('.fc').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  viewerState.format = fmt;
  renderViewer();
}

function jumpToDigit() {
  const val = parseInt(document.getElementById('jump-to').value);
  if (val >= 1 && val <= TOTAL_DIGITS) {
    viewerState.page = Math.floor((val - 1) / viewerState.digitsPerPage);
    renderViewer();
  }
}

// ---- SEARCH ----
function toggleSearch() {
  document.getElementById('search-bar').classList.toggle('hidden');
}

function toggleAdvancedSearch() {
  document.getElementById('advanced-search').classList.toggle('hidden');
}

function searchDigits() {
  const query = document.getElementById('search-input').value.trim();
  const resultsEl = document.getElementById('search-results');
  viewerState.searchHighlights = [];

  if (!query) {
    resultsEl.innerHTML = '';
    renderViewer();
    return;
  }

  const reverse = document.getElementById('search-reverse').checked;
  const searchStr = reverse ? query.split('').reverse().join('') : query;

  const results = [];
  let searchIn = PI_DIGITS;
  let pos = searchIn.indexOf(searchStr);

  while (pos !== -1 && results.length < 50) {
    results.push(pos);
    viewerState.searchHighlights.push({ start: pos, length: searchStr.length });
    pos = searchIn.indexOf(searchStr, pos + 1);
  }

  if (results.length > 0) {
    let html = `<div>נמצאו ${results.length} תוצאות${results.length >= 50 ? '+' : ''}:</div>`;
    results.slice(0, 20).forEach(pos => {
      const context = PI_DIGITS.substring(Math.max(0, pos - 3), pos + searchStr.length + 3);
      html += `<div class="result-item" onclick="goToSearchResult(${pos})">`;
      html += `ספרה ${pos + 1}: ...${context}...`;
      html += `</div>`;
    });
    resultsEl.innerHTML = html;

    // Jump to first result
    goToSearchResult(results[0]);
  } else {
    resultsEl.innerHTML = `<div>לא נמצאו תוצאות${reverse ? ' (חיפוש הפוך)' : ''}</div>`;
    renderViewer();
  }
}

function goToSearchResult(pos) {
  viewerState.page = Math.floor(pos / viewerState.digitsPerPage);
  renderViewer();
}

function searchSequences() {
  const ascending = document.getElementById('search-ascending').checked;
  const descending = document.getElementById('search-descending').checked;
  const repeating = document.getElementById('search-repeating').checked;
  const palindrome = document.getElementById('search-palindrome').checked;
  const minLen = parseInt(document.getElementById('search-min-length').value) || 3;

  const resultsEl = document.getElementById('search-results');
  viewerState.searchHighlights = [];
  const results = [];

  for (let i = 0; i < TOTAL_DIGITS && results.length < 50; i++) {
    // Ascending sequences
    if (ascending) {
      let len = 1;
      while (i + len < TOTAL_DIGITS &&
             parseInt(PI_DIGITS[i + len]) === parseInt(PI_DIGITS[i + len - 1]) + 1) {
        len++;
      }
      if (len >= minLen) {
        const seq = PI_DIGITS.substring(i, i + len);
        results.push({ pos: i, len, type: 'עולה', seq });
        viewerState.searchHighlights.push({ start: i, length: len });
      }
    }

    // Descending sequences
    if (descending) {
      let len = 1;
      while (i + len < TOTAL_DIGITS &&
             parseInt(PI_DIGITS[i + len]) === parseInt(PI_DIGITS[i + len - 1]) - 1) {
        len++;
      }
      if (len >= minLen) {
        const seq = PI_DIGITS.substring(i, i + len);
        results.push({ pos: i, len, type: 'יורד', seq });
        viewerState.searchHighlights.push({ start: i, length: len });
      }
    }

    // Repeating digits
    if (repeating) {
      let len = 1;
      while (i + len < TOTAL_DIGITS && PI_DIGITS[i + len] === PI_DIGITS[i]) {
        len++;
      }
      if (len >= minLen) {
        const seq = PI_DIGITS.substring(i, i + len);
        results.push({ pos: i, len, type: 'חוזר', seq });
        viewerState.searchHighlights.push({ start: i, length: len });
      }
    }

    // Palindromes
    if (palindrome) {
      for (let pLen = minLen; pLen <= 10 && i + pLen <= TOTAL_DIGITS; pLen++) {
        const sub = PI_DIGITS.substring(i, i + pLen);
        const rev = sub.split('').reverse().join('');
        if (sub === rev && pLen >= minLen) {
          results.push({ pos: i, len: pLen, type: 'פלינדרום', seq: sub });
          viewerState.searchHighlights.push({ start: i, length: pLen });
          break;
        }
      }
    }
  }

  if (results.length > 0) {
    let html = `<div>נמצאו ${results.length} תוצאות:</div>`;
    results.slice(0, 30).forEach(r => {
      html += `<div class="result-item" onclick="goToSearchResult(${r.pos})">`;
      html += `[${r.type}] ספרה ${r.pos + 1}: ${r.seq}`;
      html += `</div>`;
    });
    resultsEl.innerHTML = html;
    if (results.length > 0) goToSearchResult(results[0].pos);
  } else {
    resultsEl.innerHTML = '<div>לא נמצאו סדרות</div>';
  }

  renderViewer();
}

// ---- STATISTICS ----
function renderStatistics() {
  const totalGames = stats.sessions.length;
  const totalAnswers = stats.totalCorrect + stats.totalIncorrect;
  const accuracy = totalAnswers > 0
    ? Math.round((stats.totalCorrect / totalAnswers) * 100) : 0;

  document.getElementById('stat-total-correct').textContent = stats.totalCorrect;
  document.getElementById('stat-accuracy').textContent = accuracy + '%';
  document.getElementById('stat-best-streak').textContent = stats.bestStreak;
  document.getElementById('stat-sessions').textContent = totalGames;

  const listEl = document.getElementById('history-list');
  if (stats.sessions.length === 0) {
    listEl.innerHTML = '<p class="empty-state">אין עדיין משחקים. התחל לשחק!</p>';
    return;
  }

  let html = '';
  stats.sessions.slice(0, 30).forEach(s => {
    const date = new Date(s.date);
    const dateStr = date.toLocaleDateString('he-IL');
    const modeClass = s.mode === 'training' ? 'training' : 'challenge';
    const modeLabel = s.mode === 'training' ? 'אימון' : 'אתגר';

    html += `<div class="history-item">
      <div>
        <div class="history-mode ${modeClass}">${modeLabel}</div>
        <div class="history-detail">${dateStr} | ספרות ${s.startDigit}-${s.reachedDigit}</div>
      </div>
      <div class="history-score">${s.correct}/${s.correct + s.incorrect} (${s.accuracy}%)</div>
    </div>`;
  });
  listEl.innerHTML = html;
}

function clearStats() {
  if (confirm('האם למחוק את כל ההיסטוריה?')) {
    stats = {
      sessions: [],
      totalCorrect: 0,
      totalIncorrect: 0,
      bestStreak: 0,
      todayDigits: 0,
      lastPlayDate: null,
      dayStreak: 0,
    };
    saveData();
    renderStatistics();
  }
}

// ---- SETTINGS ----
function loadSettingsUI() {
  document.getElementById('setting-daily-goal').value = settings.dailyGoal;
  document.getElementById('setting-vibrate').checked = settings.vibrate;
  document.getElementById('setting-sound').checked = settings.sound;
}

function exportData() {
  const data = {
    version: 1,
    exportDate: new Date().toISOString(),
    stats: { ...stats },
    settings: { ...settings },
    bestScore: localStorage.getItem('pi-best') || '0',
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pi-game-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.version || !data.stats || !data.settings) {
          alert('קובץ גיבוי לא תקין');
          return;
        }
        Object.assign(stats, data.stats);
        Object.assign(settings, data.settings);
        if (data.bestScore) localStorage.setItem('pi-best', data.bestScore);
        saveData();
        loadSettingsUI();
        updateHomeScreen();
        alert('הנתונים שוחזרו בהצלחה!');
      } catch {
        alert('שגיאה בקריאת הקובץ');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ---- KEYBOARD SUPPORT ----
document.addEventListener('keydown', (e) => {
  if (!gameState.isActive) return;
  const screen = document.getElementById('screen-game');
  if (!screen.classList.contains('active')) return;

  const key = e.key;
  if (key >= '0' && key <= '9') {
    pressDigit(parseInt(key));
    e.preventDefault();
  }
});

// ---- PWA / MANIFEST ----
function createManifest() {
  const manifest = {
    name: 'Pi Training Game',
    short_name: 'Pi Game',
    start_url: '.',
    display: 'standalone',
    background_color: '#0a0a1a',
    theme_color: '#0a0a1a',
    orientation: 'portrait',
    icons: [],
  };

  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.querySelector('link[rel="manifest"]');
  if (link) link.href = url;
}

// ---- INIT ----
function init() {
  loadData();
  createManifest();
  updateHomeScreen();
}

document.addEventListener('DOMContentLoaded', init);
