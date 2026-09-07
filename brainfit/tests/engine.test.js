import { describe, it, expect, beforeEach } from 'vitest';
import { State, Engine } from '../js/engine.js';
import { CONFIG, TOTAL_LEVELS } from '../js/data.js';

describe('Brain-Fit 3000 Engine', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="screen-container"></div><div id="game-area"></div><div id="timer-bar"></div><div id="timer-seconds"></div><div id="score-val"></div><div id="feedback"></div>';
  });

  it('initializes session correctly', () => {
    Engine.initSession('easy');
    expect(State.diffKey).toBe('easy');
    expect(State.idx).toBe(0);
    expect(State.score).toBe(0);
    expect(State.levels.length).toBe(TOTAL_LEVELS);
    expect(State.timeLeft).toBe(CONFIG.easy.time);
  });

  it('calculates score correctly on success (fast)', () => {
    Engine.initSession('medium');
    const initialScore = State.score;
    // Simulate fast answer by leaving time > 50%
    State.timeLeft = CONFIG.medium.time - 100; 
    
    // Engine.success() sets isLocked, increments score, shows feedback
    Engine.success();
    expect(State.score).toBe(initialScore + 20);
    expect(State.isLocked).toBe(true);
  });

  it('calculates score correctly on success (slow)', () => {
    Engine.initSession('hard');
    const initialScore = State.score;
    // Simulate slow answer by leaving time < 50%
    State.timeLeft = (CONFIG.hard.time / 2) - 100; 
    
    Engine.success();
    expect(State.score).toBe(initialScore + 10);
  });

  it('exposes Engine to global window for HTML inline onclick handlers', () => {
    expect(window.Engine).toBeDefined();
    expect(typeof window.Engine.initSession).toBe('function');
    expect(typeof window.Engine.renderMenu).toBe('function');
  });

  it('renders configured btnRepeatLevel text on end screen without hardcoded icon', () => {
    Engine.initSession('easy');
    State.score = 50; // trigger good training
    Engine.renderEndScreen();
    const container = document.getElementById('screen-container');
    expect(container.innerHTML).toContain('Repetir nivel');
    expect(container.innerHTML).not.toContain('🔄 Repetir nivel');
  });

  it('configures balanceDelayMs correctly for each difficulty level', () => {
    expect(CONFIG.easy.balanceDelayMs).toBe(2000);
    expect(CONFIG.medium.balanceDelayMs).toBe(1000);
    expect(CONFIG.hard.balanceDelayMs).toBe(500);
  });

  it('renders difficulty name in bold on end screen summary', () => {
    Engine.initSession('easy');
    State.score = 50;
    Engine.renderEndScreen();
    const container = document.getElementById('screen-container');
    expect(container.innerHTML).toContain('<strong>Fácil</strong>');
    expect(container.innerHTML).toContain('Subir puntuación al Ranking');
  });

  it('renders score submission options with Google and alias form', () => {
    Engine.initSession('easy');
    State.score = 50;
    Engine.renderScoreSubmissionOptions();
    const container = document.getElementById('screen-container');
    expect(container.innerHTML).toContain('Subir al Ranking Global');
    expect(container.innerHTML).toContain('Subir con Google');
    expect(container.innerHTML).toContain('player-alias-input');
    expect(container.innerHTML).toContain('Guardar con este nombre');
    expect(container.innerHTML).toContain('Ver ranking sin guardar');
  });

  it('renders descriptive error notification when errorInfo is passed to renderScoreSubmissionOptions', () => {
    Engine.initSession('medium');
    State.score = 80;
    Engine.renderScoreSubmissionOptions({
      title: 'Ventana emergente bloqueada',
      message: 'El navegador ha bloqueado la ventana.',
      showRedirect: true
    });
    const container = document.getElementById('screen-container');
    expect(container.innerHTML).toContain('Ventana emergente bloqueada');
    expect(container.innerHTML).toContain('El navegador ha bloqueado la ventana.');
    expect(container.innerHTML).toContain('Probar inicio con redirección');
  });

  it('saves score with alias using RankingService', async () => {
    Engine.initSession('easy');
    State.score = 120;
    await Engine.submitWithAlias('Gamer123');
    const savedUser = JSON.parse(localStorage.getItem('brainfit_guest_user'));
    expect(savedUser.name).toBe('Gamer123');
    expect(savedUser.isGuest).toBe(true);
    expect(localStorage.getItem('brainfit_last_alias')).toBe('Gamer123');
  });
});
