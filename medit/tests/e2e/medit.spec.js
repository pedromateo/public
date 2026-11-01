const { test, expect } = require('@playwright/test');

test.describe('Medit PWA — E2E Tests', () => {
  test('Carga inicial y elementos de cabecera', async ({ page }) => {
    await page.goto('/');

    // Comprobar título y marca
    await expect(page).toHaveTitle(/Medit — Micro-Mindfulness & Neuro-Reset/);
    const headerTitle = page.locator('header h1');
    await expect(headerTitle).toHaveText('Medit');

    // Botones de cabecera
    await expect(page.locator('#header-streak')).toBeVisible();
    await expect(page.locator('#header-sound-btn')).toBeVisible();
    await expect(page.locator('#header-settings-btn')).toBeVisible();
  });

  test('Barra de navegación y cambio de vistas (3 Pestañas)', async ({ page }) => {
    await page.goto('/');

    // 1. Navegar a Biblioteca
    await page.locator('button[data-tab="library"]').click();
    await expect(page.locator('h2').first()).toContainText('Biblioteca de Técnicas');

    // Subpestaña Respiración: 4 protocolos
    await page.locator('button[data-subtab="breathe"]').click();
    const protocolButtons = page.locator('.btn-select-protocol');
    await expect(protocolButtons).toHaveCount(4);

    // Subpestaña Temporizador: Presets incluyendo 10m, 12m y 15m
    await page.locator('button[data-subtab="timer"]').click();
    const presetButtons = page.locator('.btn-timer-preset');
    await expect(presetButtons).toHaveCount(7);
    await expect(page.locator('button[data-sec="720"]')).toBeVisible();
    await expect(page.locator('button[data-sec="900"]')).toBeVisible();

    // Subpestaña Neurociencia: comprobar artículos y guía de qué sentir o buscar
    await page.locator('button[data-subtab="science"]').click();
    await expect(page.getByText('Dra. Amishi Jha', { exact: false }).first()).toBeVisible();

    // Desplegar Nivel 1 y verificar bloque de qué sentir o buscar
    const firstArticleHeader = page.locator('.article-header').first();
    await firstArticleHeader.click();
    await expect(page.locator('text=Qué debes sentir o buscar en este ejercicio').first()).toBeVisible();
    await expect(page.locator('text=El chispazo del "darse cuenta"')).toBeVisible();

    // 2. Navegar a Progreso
    await page.locator('button[data-tab="progress"]').click();
    await expect(page.locator('h2')).toContainText('Mi Práctica & Progreso');
    await expect(page.locator('text=Días Racha')).toBeVisible();

    // 3. Volver a Inicio
    await page.locator('button[data-tab="home"]').click();
    await expect(page.locator('h3').first()).toContainText('¿Cuánto tiempo tienes para ti ahora?');
  });

  test('Selector de Tiempo en Home y Tarjeta de Confirmación', async ({ page }) => {
    await page.goto('/');

    // Pulsar opción de 2 min
    await page.locator('button[data-time-sec="120"]').click();

    // Comprobar que se abre la tarjeta de confirmación
    const confirmModal = page.locator('#time-confirm-modal');
    await expect(confirmModal).toBeVisible();
    await expect(confirmModal.locator('text=Suspiro Fisiológico')).toBeVisible();
    await expect(confirmModal.locator('text=Locución por voz')).toBeVisible();

    // Alternar nivel de voz desde la tarjeta
    await page.locator('#btn-confirm-cycle-voice').click();
    await expect(confirmModal.locator('text=Guía Mínima')).toBeVisible();

    // Cerrar modal
    await page.locator('#btn-close-confirm-modal').click();
    await expect(confirmModal).toBeHidden();
  });

  test('Visualizador de Respiración: Iniciar, Pausar y Control de Voz', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[data-tab="library"]').click();
    await page.locator('button[data-subtab="breathe"]').click();

    // Botón de control de voz visible
    const voiceBtn = page.locator('#btn-toggle-breath-voice');
    await expect(voiceBtn).toBeVisible();

    const startBtn = page.locator('#btn-toggle-breath-run');
    await expect(startBtn).toContainText('Comenzar');

    const secondsLocator = page.locator('#breath-seconds-text');
    await expect(secondsLocator).toHaveText('2.5s');

    await startBtn.click();
    await expect(startBtn).toContainText('Pausar');

    // Comprobar que los segundos van bajando en tiempo real
    await expect(async () => {
      const text = await secondsLocator.innerText();
      const val = parseFloat(text.replace('s', ''));
      expect(val).toBeLessThan(2.5);
    }).toPass({ timeout: 3000 });

    await startBtn.click();
    await expect(startBtn).toContainText('Comenzar');
  });

  test('Temporizador Zen: Iniciar sesión de 1 min y pantalla completa con voz', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[data-tab="library"]').click();
    await page.locator('button[data-subtab="timer"]').click();

    // Seleccionar 1 min
    await page.locator('button[data-sec="60"]').click();

    // Iniciar sesión
    const startSessionBtn = page.locator('#btn-start-timer-session');
    await expect(startSessionBtn).toContainText('1 min');
    await startSessionBtn.click();

    // Debe mostrar la vista inmersiva con controles de voz y reloj
    await expect(page.locator('text=Meditación en curso')).toBeVisible();
    await expect(page.locator('#btn-toggle-voice-timer')).toBeVisible();
    await expect(page.locator('#btn-toggle-pause')).toBeVisible();

    const countdownLocator = page.locator('#timer-countdown-text');
    await expect(countdownLocator).toHaveText('1:00');

    // Comprobar que los segundos van bajando en el temporizador
    await expect(countdownLocator).not.toHaveText('1:00', { timeout: 3000 });

    // Probar alternar visibilidad del reloj
    const toggleClockBtn = page.locator('#btn-toggle-clock');
    await toggleClockBtn.click();
    await expect(page.getByText('Presencia', { exact: true })).toBeVisible();

    // Salir de la sesión con botón cerrar
    await page.locator('#btn-cancel-timer').click();
    await expect(page.locator('h2').first()).toContainText('Biblioteca de Técnicas');
  });

  test('Temporizador Zen desde Home: la cuenta atrás de segundos va bajando', async ({ page }) => {
    await page.goto('/');

    // Pulsar opción de 5 min (300s)
    await page.locator('button[data-time-sec="300"]').click();
    await page.locator('#btn-start-confirmed-session').click();

    await expect(page.locator('text=Meditación en curso')).toBeVisible();
    const countdownLocator = page.locator('#timer-countdown-text');
    await expect(countdownLocator).toHaveText('5:00');

    // Verificar que los segundos bajan
    await expect(countdownLocator).not.toHaveText('5:00', { timeout: 3000 });

    // Cancelar y comprobar que regresa limpiamente
    await page.locator('#btn-cancel-timer').click();
    await expect(page.locator('h3').first()).toContainText('¿Cuánto tiempo tienes para ti ahora?');
  });

  test('Protocolo S.T.O.P. Modal (60s) desde selector de 1 min con descenso de segundos', async ({ page }) => {
    await page.goto('/');

    // Pulsar 1 min en la Home
    await page.locator('button[data-time-sec="60"]').click();
    await page.locator('#btn-start-confirmed-session').click();

    const stopModal = page.locator('#stop-modal');
    await expect(stopModal).toBeVisible();

    // Debe mostrar paso S (Stop) y el contador
    await expect(stopModal.getByText('STOP', { exact: true })).toBeVisible();
    await expect(stopModal.locator('text=Para lo que estás haciendo')).toBeVisible();

    const secondsLocator = page.locator('#stop-seconds-text');
    await expect(secondsLocator).toHaveText('15s');

    // Verificar que los segundos bajan
    await expect(secondsLocator).not.toHaveText('15s', { timeout: 3000 });

    // Avanzar paso a paso
    await page.locator('#btn-stop-modal-next').click(); // T
    await expect(stopModal.locator('text=TAKE A BREATH')).toBeVisible();

    await page.locator('#btn-stop-modal-next').click(); // O
    await expect(stopModal.locator('text=OBSERVE')).toBeVisible();

    await page.locator('#btn-stop-modal-next').click(); // P
    await expect(stopModal.locator('text=PROCEED')).toBeVisible();

    // Completar
    await page.locator('#btn-stop-modal-next').click();
    await expect(stopModal.locator('text=¡Pausa S.T.O.P. Completada!')).toBeVisible();

    // Cerrar
    await page.locator('#btn-close-stop-done').click();
    await expect(stopModal).toBeHidden();
  });

  test('Selector de Anclaje Diario (Habit Stacking)', async ({ page }) => {
    await page.goto('/');

    // Abrir modal de anclajes desde la Home
    await page.locator('#btn-open-anchor-modal').click();
    const anchorModal = page.locator('#anchor-modal');
    await expect(anchorModal).toBeVisible();

    // Seleccionar café de la mañana
    const coffeeAnchor = page.locator('.btn-select-anchor[data-id="morning-coffee"]');
    await coffeeAnchor.click();

    // Modal debe cerrarse y mostrar el nuevo anclaje en la tarjeta
    await expect(anchorModal).toBeHidden();
    await expect(page.locator('#btn-open-anchor-modal').locator('text=El Café / Té de la Mañana')).toBeVisible();
  });

  test('Ajustes de Sonido y Locución Modal', async ({ page }) => {
    await page.goto('/');

    // Abrir modal de ajustes
    await page.locator('#header-settings-btn').click();
    const soundModal = page.locator('#sound-modal');
    await expect(soundModal).toBeVisible();

    // Seleccionar nivel de voz
    const voiceMinimalBtn = page.locator('.btn-select-voice-level[data-voice-level="minimal"]');
    await voiceMinimalBtn.click();

    // Seleccionar Campana Zen
    const zenBtn = page.locator('.btn-select-bell[data-tone="zen"]');
    await zenBtn.click();

    // Cerrar modal
    await page.locator('#btn-close-sound-modal').click();
    await expect(soundModal).toBeHidden();
  });

  test('Screen Wake Lock: se solicita al iniciar un ejercicio y se libera al pausar/cancelar', async ({ page }) => {
    // Simular Screen Wake Lock API
    await page.addInitScript(() => {
      window.__wakeLockRequests = 0;
      window.__wakeLockReleases = 0;
      const fakeSentinel = {
        released: false,
        release: async () => {
          fakeSentinel.released = true;
          window.__wakeLockReleases++;
          if (fakeSentinel.onrelease) fakeSentinel.onrelease();
        },
        addEventListener: (event, cb) => {
          if (event === 'release') fakeSentinel.onrelease = cb;
        }
      };

      Object.defineProperty(navigator, 'wakeLock', {
        value: {
          request: async (type) => {
            if (type === 'screen') {
              window.__wakeLockRequests++;
              fakeSentinel.released = false;
              return fakeSentinel;
            }
          }
        },
        configurable: true
      });
    });

    await page.goto('/');

    // 1. Iniciar temporizador desde biblioteca
    await page.locator('button[data-tab="library"]').click();
    await page.locator('button[data-subtab="timer"]').click();
    await page.locator('button[data-sec="60"]').click();
    await page.locator('#btn-start-timer-session').click();

    // Debe haber solicitado Wake Lock
    await expect(async () => {
      const requests = await page.evaluate(() => window.__wakeLockRequests);
      expect(requests).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 2000 });

    // Cancelar la sesión
    await page.locator('#btn-cancel-timer').click();

    // Debe haber liberado Wake Lock
    await expect(async () => {
      const releases = await page.evaluate(() => window.__wakeLockReleases);
      expect(releases).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 2000 });
  });

  test('Locuciones de fases: versión completa en nivel permisivo y resumen con nombre de fase en nivel restrictivo', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      const player = window.voicePlayer;
      const played = [];
      const origPlay = player.play.bind(player);
      player.play = (key, cat) => {
        played.push({ key, cat, level: player.level });
      };

      // 1. Nivel más permisivo ('balanced')
      player.setLevel('balanced');
      player.playPhase(0); // Fase 1
      player.playPhase(4); // Fase 5

      // 2. Nivel más restrictivo ('minimal')
      player.setLevel('minimal');
      player.playPhase(0); // Fase 1
      player.playPhase(4); // Fase 5

      // 3. Silencio ('none')
      player.setLevel('none');
      player.playPhase(0);

      player.play = origPlay;
      return played;
    });

    expect(result).toEqual([
      { key: 'zen_fase1_full', cat: 'phase', level: 'balanced' },
      { key: 'zen_fase5_full', cat: 'phase', level: 'balanced' },
      { key: 'zen_fase1_short', cat: 'phase', level: 'minimal' },
      { key: 'zen_fase5_short', cat: 'phase', level: 'minimal' }
    ]);
  });
});
