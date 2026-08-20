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
  });
});
