import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RankingService } from '../js/ranking.js';
import { Engine, State } from '../js/engine.js';
import { auth } from '../js/firebase-config.js';

describe('Ranking and Login Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    document.body.innerHTML = '<div id="screen-container"></div>';
    Engine.initSession('easy');
    State.score = 70;
  });

  it('formats Google user correctly taking only the first name', () => {
    const rawUser = {
      uid: 'google_12345',
      displayName: 'Pedro Mateo Lopez',
      photoURL: 'https://example.com/pedro.jpg'
    };
    const formatted = RankingService.formatUser(rawUser);
    expect(formatted.uid).toBe('google_12345');
    expect(formatted.name).toBe('Pedro');
    expect(formatted.photoUrl).toBe('https://example.com/pedro.jpg');
    expect(formatted.isGuest).toBe(false);
  });

  it('creates and persists a guest user when submitting with an alias', () => {
    const guest = RankingService.createGuestUser('SuperPlayer');
    expect(guest.name).toBe('SuperPlayer');
    expect(guest.isGuest).toBe(true);
    expect(guest.uid).toContain('guest_');
    expect(guest.photoUrl).toContain('SuperPlayer');

    const stored = JSON.parse(localStorage.getItem('brainfit_guest_user'));
    expect(stored.name).toBe('SuperPlayer');
    expect(stored.uid).toBe(guest.uid);
  });

  it('handles auth/popup-blocked error and displays redirection and alias options', async () => {
    // Simulate popup-blocked error from RankingService.login
    vi.spyOn(RankingService, 'login').mockRejectedValueOnce({
      code: 'auth/popup-blocked',
      message: 'Popup was blocked'
    });

    await Engine.submitWithGoogle();

    const container = document.getElementById('screen-container');
    expect(container.innerHTML).toContain('Ventana emergente bloqueada');
    expect(container.innerHTML).toContain('Probar inicio con redirección');
    expect(container.innerHTML).toContain('player-alias-input');
    expect(container.innerHTML).toContain('Guardar con este nombre');
  });

  it('handles auth/unauthorized-domain error and explains domain issue with alias fallback', async () => {
    vi.spyOn(RankingService, 'login').mockRejectedValueOnce({
      code: 'auth/unauthorized-domain',
      message: 'Domain unauthorized'
    });

    await Engine.submitWithGoogle();

    const container = document.getElementById('screen-container');
    expect(container.innerHTML).toContain('Dominio no autorizado en Firebase');
    expect(container.innerHTML).toContain('player-alias-input');
  });

  it('handles auth/popup-closed-by-user gracefully without blocking the player', async () => {
    vi.spyOn(RankingService, 'login').mockRejectedValueOnce({
      code: 'auth/popup-closed-by-user',
      message: 'User cancelled popup'
    });

    await Engine.submitWithGoogle();

    const container = document.getElementById('screen-container');
    expect(container.innerHTML).toContain('Inicio cancelado');
    expect(container.innerHTML).toContain('Has cerrado la ventana de inicio');
  });

  it('reuses active Google user session without re-opening login options', async () => {
    const mockUser = { uid: 'u123', displayName: 'Elena Gomez', photoURL: 'https://pic.jpg' };
    auth.currentUser = mockUser;

    const saveScoreSpy = vi.spyOn(RankingService, 'saveScore').mockResolvedValueOnce();
    const renderCarouselSpy = vi.spyOn(Engine, 'renderRankingCarousel').mockImplementation(() => {});

    await Engine.showRankingFlow();

    expect(saveScoreSpy).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'u123', name: 'Elena' }),
      'easy',
      70
    );
    expect(renderCarouselSpy).toHaveBeenCalled();

    auth.currentUser = null;
  });

  it('allows full score submission with alias and renders ranking carousel', async () => {
    const saveScoreSpy = vi.spyOn(RankingService, 'saveScore').mockResolvedValueOnce();
    const renderCarouselSpy = vi.spyOn(Engine, 'renderRankingCarousel').mockImplementation(() => {});

    await Engine.submitWithAlias('Campeón');

    expect(saveScoreSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Campeón', isGuest: true }),
      'easy',
      70
    );
    expect(renderCarouselSpy).toHaveBeenCalled();
    expect(localStorage.getItem('brainfit_last_alias')).toBe('Campeón');
  });
});
