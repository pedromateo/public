const { test, expect } = require('@playwright/test');

test.describe('Loop Station PWA', () => {
  test('Flujo principal: desde configuración hasta looper', async ({ page }) => {
    await page.goto('/');

    // 1. Vista Inicial
    const startBtn = page.locator('#start-session-btn');
    await expect(startBtn).toBeVisible();

    // Comprobar valores por defecto
    const bpmDisplay = page.locator('#bpm-display');
    await expect(bpmDisplay).toHaveText('120');

    // 2. Iniciar Sesión (Simula aceptar micrófono)
    await startBtn.click();

    // 3. Verificar que aparece la vista de Looper
    const viewLooper = page.locator('#view-looper');
    await expect(viewLooper).toBeVisible();

    // El visualizador de beats debería tener 2 filas (compases) y 8 puntos en total (4/4 * 2 compases)
    const barRows = page.locator('#beat-visualizer > div');
    await expect(barRows).toHaveCount(2);

    const beats = page.locator('[id^="beat-dot-"]');
    await expect(beats).toHaveCount(8);
  });

  test('Configuración de 4 compases muestra 4 líneas de compás con 16 puntos visibles', async ({ page }) => {
    await page.goto('/');

    // Seleccionar 4 compases
    await page.selectOption('#bars-length', '4');
    await page.locator('#start-session-btn').click();

    // 4 líneas/filas de compás
    const barRows = page.locator('#beat-visualizer > div');
    await expect(barRows).toHaveCount(4);

    const beats = page.locator('[id^="beat-dot-"]');
    await expect(beats).toHaveCount(16);
    
    // Todos los puntos deben ser visibles
    for (let i = 0; i < 16; i++) {
      await expect(beats.nth(i)).toBeVisible();
    }
  });

  test('Metrónomo Toggle', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-session-btn').click();

    const metronomeBtn = page.locator('#metronome-btn');
    // Inicialmente encendido
    await expect(metronomeBtn).toContainText('ON');
    
    // Apagar
    await metronomeBtn.click();
    await expect(metronomeBtn).toContainText('OFF');
  });

  test('Grabar Pista: estados ESPERA (naranja) y GRABANDO (verde)', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-session-btn').click();

    const recordBtn = page.locator('#record-btn');
    const recordText = page.locator('#record-text');
    
    await recordBtn.click();
    
    // Debe cambiar a "ESPERA" y clase amber/naranja
    await expect(recordText).toHaveText('ESPERA');
    await expect(recordBtn).toHaveClass(/bg-amber-500/);
    
    // Al empezar el nuevo ciclo, debe pasar a "GRABANDO" y clase emerald/verde
    await expect(recordText).toHaveText('GRABANDO', { timeout: 10000 });
    await expect(recordBtn).toHaveClass(/bg-emerald-500/);
    
    // Y finalmente completar la pista y volver al estado inicial con la pista creada
    await page.waitForSelector('.track-item', { timeout: 20000 });
    
    const trackName = page.locator('.track-item .track-name');
    await expect(trackName).toHaveText('Pista 1');
    await expect(recordText).toHaveText('GRABAR');
    await expect(recordBtn).toHaveClass(/bg-red-600/);
  });

  test('Control de pista: silenciar (mute) y eliminar (delete)', async ({ page }) => {
    await page.goto('/');
    await page.locator('#start-session-btn').click();

    // Grabar una pista
    await page.locator('#record-btn').click();
    await page.waitForSelector('.track-item', { timeout: 20000 });

    const track = page.locator('.track-item').first();
    const muteBtn = track.locator('.mute-btn');
    
    // Probar mute (debe adquirir clase opacity-50)
    await muteBtn.click();
    await expect(track).toHaveClass(/opacity-50/);
    
    // Probar unmute (se elimina opacity-50)
    await muteBtn.click();
    await expect(track).not.toHaveClass(/opacity-50/);

    // Probar borrar pista
    const deleteBtn = track.locator('.delete-btn');
    await deleteBtn.click();
    await expect(page.locator('.track-item')).toHaveCount(0);
  });
});

