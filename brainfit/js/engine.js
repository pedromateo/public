import { TOTAL_LEVELS, CONFIG, TYPES, TEXTS } from "./data.js";
import { Games } from "./games.js";

export const State = {
  diffKey: null,
  idx: 0,
  score: 0,
  levels: [],
  timeLeft: 0,
  isLocked: false
};

export const Engine = {
  mainTimer: null,
  cleanups: [],
  
  initSession(diffKey) {
    State.diffKey = diffKey;
    State.idx = 0;
    State.score = 0;
    State.levels = [...TYPES].sort(() => Math.random() - 0.5);
    this.nextLevel();
  },

  nextLevel() {
    this.clearAll();
    if (State.idx >= TOTAL_LEVELS) {
      this.renderEndScreen();
      return;
    }
    State.isLocked = false;
    State.timeLeft = CONFIG[State.diffKey].time;
    
    this.renderHeader();
    const gameType = State.levels[State.idx];
    const gameArea = document.getElementById('game-area');
    gameArea.innerHTML = '';
    
    Games[gameType](gameArea);
    this.startMainTimer();
  },

  startMainTimer() {
    this.updateUI();
    this.mainTimer = setInterval(() => {
      State.timeLeft -= 100;
      if (State.timeLeft <= 0) {
        State.timeLeft = 0;
        this.updateUI();
        this.handleTimeout();
      } else {
        this.updateUI();
      }
    }, 100);
  },

  updateUI() {
    const bar = document.getElementById('timer-bar');
    const txt = document.getElementById('timer-seconds');
    if (bar && txt) {
      const total = CONFIG[State.diffKey].time;
      const pct = Math.max(0, (State.timeLeft / total) * 100);
      bar.style.width = pct + '%';
      bar.className = 'timer-bar ' + (pct < 30 ? 'danger' : (pct < 60 ? 'warning' : ''));
      txt.innerText = Math.ceil(State.timeLeft / 1000) + 's';
    }
  },

  addCleanup(fn) { this.cleanups.push(fn); },

  clearAll() {
    if (this.mainTimer) clearInterval(this.mainTimer);
    this.cleanups.forEach(fn => fn());
    this.cleanups = [];
  },

  handleTimeout() {
    if (State.isLocked) return;
    State.isLocked = true;
    this.clearAll();
    this.showFeedback(TEXTS.timeout, false);
    setTimeout(() => { State.idx++; this.nextLevel(); }, 900);
  },

  success() {
    if (State.isLocked) return;
    State.isLocked = true;
    this.clearAll();

    const totalTime = CONFIG[State.diffKey].time;
    const timeUsed = totalTime - State.timeLeft;
    const isFast = timeUsed < (totalTime / 2);

    State.score += isFast ? 20 : 10;
    document.getElementById('score-val').innerText = State.score;

    this.showFeedback(isFast ? TEXTS.successFast : TEXTS.successNorm, true);

    if (isFast) {
      this.showBonus(() => { State.idx++; this.nextLevel(); });
    } else {
      setTimeout(() => { State.idx++; this.nextLevel(); }, 600);
    }
  },

  fail(msg) {
    if (State.isLocked) return;
    State.isLocked = true;
    this.clearAll();
    this.showFeedback(msg || TEXTS.failDefault, false);
    setTimeout(() => { State.idx++; this.nextLevel(); }, 900);
  },

  showFeedback(text, isOk) {
    const fb = document.getElementById('feedback');
    if (fb) {
      fb.className = 'feedback text-center ' + (isOk ? 'ok' : 'fail');
      fb.innerText = text;
    }
  },

  showBonus(cb) {
    const halfSec = CONFIG[State.diffKey].time / 2000;
    const overlay = document.createElement('div');
    overlay.className = 'bonus-overlay';
    overlay.innerHTML = `
      <div class="bonus-modal">
        <div style="font-size:46px;margin-bottom:6px;">⚡🍬</div>
        <h1 class="bonus-title">${TEXTS.bonusTitle}</h1>
        <div class="bonus-subtitle">${TEXTS.bonusSubtitle}</div>
        <p class="bonus-desc">${TEXTS.bonusDesc.replace('{seconds}', halfSec)}</p>
      </div>`;
    document.body.appendChild(overlay);
    setTimeout(() => { overlay.remove(); cb(); }, 1800);
  },

  renderMenu() {
    this.clearAll();
    document.getElementById('screen-container').innerHTML = `
      <div class="card c">
        <div style="font-size:64px;margin-bottom:8px;text-shadow: 0 10px 15px rgba(0,0,0,0.1);">🧠🍭</div>
        <h1 style="font-size:32px;margin:0 0 8px 0;color:#831843;font-weight:900;">${TEXTS.title}</h1>
        <p style="font-size:18px;color:#9d174d;margin:0 0 24px 0;font-weight:800;">${TEXTS.subtitle}</p>
        <div>
          <button class="diff-btn diff-easy" onclick="Engine.initSession('easy')">
            <span style="font-weight:900;">${TEXTS.menuEasy}</span>
            <span class="diff-badge">16s</span>
          </button>
          <button class="diff-btn diff-medium" onclick="Engine.initSession('medium')">
            <span style="font-weight:900;">${TEXTS.menuMedium}</span>
            <span class="diff-badge">12s</span>
          </button>
          <button class="diff-btn diff-hard" onclick="Engine.initSession('hard')">
            <span style="font-weight:900;">${TEXTS.menuHard}</span>
            <span class="diff-badge">8s</span>
          </button>
        </div>
      </div>`;
  },

  renderHeader() {
    const diff = CONFIG[State.diffKey];
    document.getElementById('screen-container').innerHTML = `
      <div id="header">
        <div class="top-bar">
          <div class="level-info">${TEXTS.levelLabel} ${State.idx + 1} / ${TOTAL_LEVELS} 
            <span style="font-size:12px;background:#fce7f3;color:#be185d;padding:4px 10px;border-radius:12px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.05);">${diff.name}</span> 
            <span id="timer-seconds" style="margin-left:6px;color:#9d174d;font-weight:900;"></span>
          </div>
          <div class="score-badge">⭐ <span id="score-val">${State.score}</span></div>
        </div>
        <div class="timer-container"><div id="timer-bar" class="timer-bar"></div></div>
      </div>
      <div class="card" id="game-card">
        <div id="game-area" style="flex-grow:1; display:flex; flex-direction:column; justify-content:center;"></div>
        <div id="feedback" class="feedback"></div>
      </div>
      <div class="text-center mt-4">
        <button class="reset-btn" onclick="Engine.renderMenu()">${TEXTS.btnBack}</button>
      </div>`;
  },

  renderEndScreen() {
    const maxPts = TOTAL_LEVELS * 20;
    const currentDiff = State.diffKey;
    let nextDiff = null;
    if (currentDiff === 'easy') nextDiff = 'medium';
    else if (currentDiff === 'medium') nextDiff = 'hard';

    let endTitle = "";
    let endIcon = "🏆";
    let endMsg = "";
    let actionBtnHTML = "";

    if (State.score === maxPts) {
      if (currentDiff === 'hard') {
        endIcon = "👑🔥";
        endTitle = TEXTS.endPerfectHardTitle;
        endMsg = TEXTS.endPerfectHardMsg.replace('{score}', State.score).replace('{max}', maxPts);
        actionBtnHTML = `<button class="mb-2 btn-red" onclick="Engine.initSession('hard')">${TEXTS.btnPerfectHard}</button>`;
      } else {
        const nextName = CONFIG[nextDiff].name;
        endIcon = "🌟🥇";
        endTitle = TEXTS.endPerfectNextTitle;
        endMsg = TEXTS.endPerfectNextMsg.replace('{score}', State.score).replace('{diff}', CONFIG[currentDiff].name).replace('{nextDiff}', nextName);
        actionBtnHTML = `<button class="mb-2 btn-green" onclick="Engine.initSession('${nextDiff}')">${TEXTS.btnPerfectNext.replace('{nextDiff}', nextName)}</button>`;
      }
    } 
    else if (State.score >= maxPts * 0.8) {
      endIcon = "🥈⚡";
      endTitle = TEXTS.endNearPerfectTitle;
      if (currentDiff === 'hard') {
        endMsg = TEXTS.endNearPerfectHardMsg;
      } else {
        const nextName = CONFIG[nextDiff].name;
        endMsg = TEXTS.endNearPerfectMsg.replace('{nextDiff}', nextName);
      }
      actionBtnHTML = `<button class="mb-2" onclick="Engine.initSession('${currentDiff}')">${TEXTS.btnTryMax}</button>`;
    } 
    else {
      endIcon = "💪🎯";
      endTitle = TEXTS.endGoodTrainingTitle;
      endMsg = TEXTS.endGoodTrainingMsg.replace('{levels}', TOTAL_LEVELS).replace('{diff}', CONFIG[currentDiff].name);
      actionBtnHTML = `<button class="mb-2" onclick="Engine.initSession('${currentDiff}')">${TEXTS.btnRepeatLevel}</button>`;
    }

    document.getElementById('screen-container').innerHTML = `
      <div class="card c">
        <div style="font-size:64px;margin-bottom:10px;">${endIcon}</div>
        <h2 style="font-size:28px;color:#be185d;margin:0 0 10px 0;font-weight:900;">${endTitle}</h2>
        <p style="font-size:18px;color:#831843;margin-bottom:18px;line-height:1.4;font-weight:600;">${endMsg}</p>
        
        <div style="background:#fdf2f8;border:4px solid #fbcfe8;border-radius:24px;padding:18px;margin-bottom:24px;box-shadow:inset 0 4px 6px rgba(0,0,0,0.05);">
          <div style="font-size:16px;color:#9d174d;font-weight:800;">${TEXTS.finalScoreTitle}</div>
          <div style="font-size:52px;font-weight:900;color:#db2777;margin:6px 0;">${State.score} <span style="font-size:22px;font-weight:900;color:#f472b6;">/ ${maxPts}</span></div>
        </div>

        ${actionBtnHTML}
        <button class="btn-neutral" onclick="Engine.renderMenu()">${TEXTS.btnChangeDiff}</button>
      </div>`;
  }
};

if (typeof window !== 'undefined') {
  window.Engine = Engine;
  window.State = State;
}