import { TOTAL_LEVELS, CONFIG, TYPES, TEXTS } from "./data.js";
import { Games } from "./games.js";
import { RankingService } from "./ranking.js";

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

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

  vibrate(pattern = 12) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(pattern); } catch (_) {}
    }
  },

  isMuted() {
    return localStorage.getItem('brainfit_sound_muted') === 'true';
  },

  toggleSound() {
    const muted = !this.isMuted();
    localStorage.setItem('brainfit_sound_muted', muted ? 'true' : 'false');
    this.updateSoundBtn();
    if (!muted) {
      this.playTap();
    }
  },

  updateSoundBtn() {
    const btn = document.getElementById('sound-toggle');
    if (btn) {
      const muted = this.isMuted();
      const soundOnSVG = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#db2777" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 0 #be185d);"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#fbcfe8"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
      const soundOffSVG = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#be185d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 0 #9d174d);"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#fbcfe8" opacity="0.6"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
      btn.innerHTML = muted ? soundOffSVG : soundOnSVG;
      btn.setAttribute('title', muted ? 'Activar sonido' : 'Desactivar sonido');
      btn.setAttribute('aria-label', muted ? 'Activar sonido' : 'Desactivar sonido');
    }
  },

  playTap() {
    if (this.isMuted()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch (_) {}
  },

  playSuccess() {
    if (this.isMuted()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const notes = [587.33, 880];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + i * 0.06;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.04, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.14);
      });
    } catch (_) {}
  },

  playBonus() {
    if (this.isMuted()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + i * 0.07;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.05, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.18);
      });
    } catch (_) {}
  },

  handleTimeout() {
    if (State.isLocked) return;
    State.isLocked = true;
    this.vibrate([60, 40, 60]);
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

    this.vibrate(isFast ? [20, 30, 20, 30, 30] : [15, 30, 15]);
    this.showFeedback(isFast ? TEXTS.successFast : TEXTS.successNorm, true);

    if (isFast) {
      this.showBonus(() => { State.idx++; this.nextLevel(); });
    } else {
      this.playSuccess();
      setTimeout(() => { State.idx++; this.nextLevel(); }, 600);
    }
  },

  fail(msg) {
    if (State.isLocked) return;
    State.isLocked = true;
    this.vibrate([60, 40, 60]);
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
    this.playBonus();
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
    this.updateSoundBtn();
    document.getElementById('screen-container').innerHTML = `
      <div class="card c">
        <div style="font-size:64px;margin-bottom:8px;text-shadow: 0 10px 15px rgba(0,0,0,0.1);">🧠🍭</div>
        <h1 style="font-size:32px;margin:0 0 8px 0;color:#831843;font-weight:900;">${TEXTS.title}</h1>
        <p style="font-size:18px;color:#9d174d;margin:0 0 24px 0;font-weight:800;">${TEXTS.subtitle}</p>
        <div>
          <button class="diff-btn diff-easy" onclick="Engine.initSession('easy')">
            <span style="font-weight:900;">${TEXTS.menuEasy}</span>
            <span class="diff-badge">${CONFIG.easy.time / 1000}s</span>
          </button>
          <button class="diff-btn diff-medium" onclick="Engine.initSession('medium')">
            <span style="font-weight:900;">${TEXTS.menuMedium}</span>
            <span class="diff-badge">${CONFIG.medium.time / 1000}s</span>
          </button>
          <button class="diff-btn diff-hard" onclick="Engine.initSession('hard')">
            <span style="font-weight:900;">${TEXTS.menuHard}</span>
            <span class="diff-badge">${CONFIG.hard.time / 1000}s</span>
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

    const percentage = maxPts > 0 ? Math.round((State.score / maxPts) * 100) : 0;

    if (State.score === maxPts) {
      if (currentDiff === 'hard') {
        endIcon = "👑🔥";
        endTitle = TEXTS.endPerfectHardTitle;
        endMsg = TEXTS.endPerfectHardMsg.replace('{score}', State.score).replace('{max}', maxPts).replace('{pct}', percentage);
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
        endMsg = TEXTS.endNearPerfectMsg.replace('{diff}', CONFIG[currentDiff].name).replace('{nextDiff}', nextName);
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
          <div style="font-size:52px;font-weight:900;color:#db2777;margin:6px 0;">${percentage}%</div>
        </div>

        ${actionBtnHTML}
        <button class="btn-neutral" onclick="Engine.renderMenu()">${TEXTS.btnChangeDiff}</button>
        <div style="margin-top:20px; padding-top:20px; border-top:2px dashed #fbcfe8;">
          <button class="btn-ranking" onclick="Engine.showRankingFlow()" style="background:#db2777; color:white; font-size:18px; padding:12px 24px; border-radius:16px; border:none; box-shadow:0 6px 0 #9d174d; font-weight:800; cursor:pointer; width:100%; transition:all 0.2s;">🏆 Ver Ranking Global</button>
        </div>
      </div>`;
  },

  async showRankingFlow() {
    try {
      // 1. Mostrar estado de carga
      document.getElementById('screen-container').innerHTML = `
        <div class="card c">
          <div style="font-size:64px;margin-bottom:10px;" class="spin">⏳</div>
          <h2 style="font-size:24px;color:#be185d;margin:0;font-weight:900;">Conectando...</h2>
        </div>`;
      
      // 2. Iniciar sesión con Google
      const user = await RankingService.login();
      
      // 3. Mostrar guardando...
      document.getElementById('screen-container').innerHTML = `
        <div class="card c">
          <div style="font-size:64px;margin-bottom:10px;" class="pulse">💾</div>
          <h2 style="font-size:24px;color:#be185d;margin:0;font-weight:900;">Guardando tu puntuación...</h2>
        </div>`;

      // 4. Guardar puntuación
      await RankingService.saveScore(user, State.diffKey, State.score);
      
      // 5. Iniciar carrusel
      this.renderRankingCarousel();
    } catch (e) {
      console.error(e);
      document.getElementById('screen-container').innerHTML = `
        <div class="card c">
          <div style="font-size:64px;margin-bottom:10px;">❌</div>
          <h2 style="font-size:24px;color:#be185d;margin:0 0 10px 0;font-weight:900;">Error de conexión</h2>
          <p style="font-size:16px;color:#831843;">No se pudo acceder al ranking.</p>
          <button class="reset-btn mt-4" onclick="Engine.renderEndScreen()">Volver</button>
        </div>`;
    }
  },

  async renderRankingCarousel() {
    this.clearAll();
    const difficulties = ['easy', 'medium', 'hard'];
    let currentIdx = 0;
    
    const drawRanking = async () => {
      const diff = difficulties[currentIdx];
      const diffConfig = CONFIG[diff];
      
      const badgeStyles = {
        easy: "background: linear-gradient(to bottom, #34d399, #059669); box-shadow: 0 3px 0 #047857;",
        medium: "background: linear-gradient(to bottom, #c084fc, #7e22ce); box-shadow: 0 3px 0 #6b21a8;",
        hard: "background: linear-gradient(to bottom, #fb7185, #e11d48); box-shadow: 0 3px 0 #be123c;"
      };

      document.getElementById('screen-container').innerHTML = `
        <div class="card c" style="padding:16px;">
          <div style="text-align:center; margin-bottom:14px;">
            <div style="font-size:26px;font-weight:900;color:#831843;margin-bottom:6px;">🏆 Ranking Global</div>
            <div style="display:inline-block; font-size:18px; color:white; padding:6px 18px; border-radius:14px; font-weight:900; ${badgeStyles[diff] || ''} text-shadow:1px 1px 2px rgba(0,0,0,0.2);">
              Nivel ${diffConfig.name}
            </div>
          </div>
          <div id="ranking-list" style="min-height:350px; display:flex; flex-direction:column; justify-content:center;">
             <div style="text-align:center; font-size:40px;" class="spin">⏳</div>
          </div>
          <button class="reset-btn" style="margin-top:16px; width:100%;" onclick="Engine.renderMenu()">Jugar de nuevo</button>
        </div>`;

      const topScores = await RankingService.getTopScores(diff);
      const listContainer = document.getElementById('ranking-list');
      
      if (!listContainer) return;

      if (topScores.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center;color:#9d174d;font-weight:700;">Aún no hay puntuaciones en este nivel. ¡Sé el primero!</div>`;
      } else {
        let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
        topScores.forEach((s, idx) => {
          let medal = '';
          if (idx === 0) medal = '🥇';
          else if (idx === 1) medal = '🥈';
          else if (idx === 2) medal = '🥉';
          else medal = `${idx + 1}º`;

          html += `
            <div style="display:flex;align-items:center;background:#fdf2f8;border:2px solid #fbcfe8;border-radius:12px;padding:8px 12px;">
              <div style="width:30px;font-weight:900;color:#be185d;">${medal}</div>
              <img src="${s.photoUrl || 'assets/icon.svg'}" style="width:36px;height:36px;border-radius:50%;border:2px solid #f9a8d4;margin-right:12px;object-fit:cover;" onerror="this.src='assets/icon.svg'">
              <div style="flex-grow:1;text-align:left;font-weight:800;color:#831843;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.name}</div>
              <div style="font-weight:900;color:#db2777;font-size:18px;">${s.score}</div>
            </div>
          `;
        });
        html += '</div>';
        listContainer.innerHTML = html;
      }
      
      currentIdx = (currentIdx + 1) % difficulties.length;
    };

    await drawRanking();
    this.mainTimer = setInterval(drawRanking, 5000);
  }
};

if (typeof window !== 'undefined') {
  window.Engine = Engine;
  window.State = State;

  let unlocked = false;
  let lastTapTime = 0;

  const unlockAudioAndVibrate = () => {
    if (unlocked) return;
    unlocked = true;
    
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') {
      try { ctx.resume(); } catch (_) {}
    }
    
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(1); } catch (_) {}
    }
    
    if (ctx) {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);
        osc.stop(ctx.currentTime + 0.001);
      } catch (_) {}
    }
  };

  const handleTap = (e) => {
    unlockAudioAndVibrate();
    
    const isInteractive = e.target.closest('button, #game-area, .card, [onclick]');
    if (isInteractive) {
      const now = Date.now();
      if (now - lastTapTime > 50) {
        lastTapTime = now;
        Engine.vibrate(10);
        Engine.playTap();
      }
    }
  };

  window.addEventListener('pointerdown', handleTap, { passive: false });

  window.addEventListener('DOMContentLoaded', () => {
    Engine.updateSoundBtn();
  });
}