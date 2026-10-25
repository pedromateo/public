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

  test('Barra de navegación y cambio de vistas', async ({ page }) => {
    await page.goto('/');

    // 1. Navegar a Respirar
    await page.locator('button[data-tab="breathe"]').click();
    await expect(page.locator('h2')).toContainText('Respiración Guiada');

    // Verificar que los 4 protocolos están presentes
    const protocolButtons = page.locator('.btn-select-protocol');
    await expect(protocolButtons).toHaveCount(4);

    // 2. Navegar a Temporizador
    await page.locator('button[data-tab="timer"]').click();
    await expect(page.locator('h2')).toContainText('Temporizador Zen');

    // Verificar presets incluyendo las nuevas opciones de 10m, 12m y 15m
    const presetButtons = page.locator('.btn-timer-preset');
    await expect(presetButtons).toHaveCount(7);
    await expect(page.locator('button[data-sec="720"]')).toBeVisible();
    await expect(page.locator('button[data-sec="900"]')).toBeVisible();

    // 3. Navegar a Aprender
    await page.locator('button[data-tab="learn"]').click();
    await expect(page.locator('h2')).toContainText('Aprender sin Mitos');
    await expect(page.getByText('Dra. Amishi Jha', { exact: false }).first()).toBeVisible();

    // 4. Navegar a Hábitos
    await page.locator('button[data-tab="habits"]').click();
    await expect(page.locator('h2')).toContainText('Mi Práctica & Progreso');
    await expect(page.locator('text=Días Racha')).toBeVisible();
  });

  test('Visualizador de Respiración: Iniciar y Pausar', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[data-tab="breathe"]').click();

    const startBtn = page.locator('#btn-toggle-breath-run');
    await expect(startBtn).toContainText('Comenzar');

    await startBtn.click();
    await expect(startBtn).toContainText('Pausar');

    await page.waitForTimeout(300);
    await startBtn.click();
    await expect(startBtn).toContainText('Comenzar');
  });

  test('Temporizador Zen: Iniciar sesión de 1 min y pantalla completa', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[data-tab="timer"]').click();

    // Seleccionar 1 min
    await page.locator('button[data-sec="60"]').click();

    // Iniciar sesión
    const startSessionBtn = page.locator('#btn-start-timer-session');
    await expect(startSessionBtn).toContainText('1 min');
    await startSessionBtn.click();

    // Debe mostrar la vista inmersiva
    await expect(page.locator('text=Meditación en curso')).toBeVisible();
    await expect(page.locator('#btn-toggle-pause')).toBeVisible();

    // Probar alternar visibilidad del reloj
    const toggleClockBtn = page.locator('#btn-toggle-clock');
    await toggleClockBtn.click();
    await expect(page.getByText('Presencia', { exact: true })).toBeVisible();

    // Salir de la sesión con botón cerrar
    await page.locator('#btn-cancel-timer').click();
    await expect(page.locator('h2')).toContainText('Temporizador Zen');
  });

  test('Protocolo S.T.O.P. Modal (60s)', async ({ page }) => {
    await page.goto('/');

    // Abrir modal S.T.O.P.
    await page.locator('#btn-start-stop-protocol').click();
    const stopModal = page.locator('#stop-modal');
    await expect(stopModal).toBeVisible();

    // Debe mostrar paso S (Stop)
    await expect(stopModal.getByText('STOP', { exact: true })).toBeVisible();
    await expect(stopModal.locator('text=Para lo que estás haciendo')).toBeVisible();

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

    // Abrir modal de anclajes
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

  test('Ajustes de Sonido Modal', async ({ page }) => {
    await page.goto('/');

    // Abrir modal de ajustes de sonido
    await page.locator('#header-settings-btn').click();
    const soundModal = page.locator('#sound-modal');
    await expect(soundModal).toBeVisible();

    // Seleccionar Campana Zen
    const zenBtn = page.locator('.btn-select-bell[data-tone="zen"]');
    await zenBtn.click();

    // Cerrar modal
    await page.locator('#btn-close-sound-modal').click();
    await expect(soundModal).toBeHidden();
  });
});
