const { test, expect } = require('@playwright/test');

test.describe('MurMeteo PWA - Pruebas E2E', () => {

  test('Carga inicial: la aplicación carga correctamente y oculta el loader sin bloquearse', async ({ page }) => {
    // Escuchar errores de consola no capturados
    const consoleErrors = [];
    page.on('pageerror', err => consoleErrors.push(err.message));

    await page.goto('/');

    // 1. El contenedor de datos debe hacerse visible
    const dataContainer = page.locator('#data-container');
    await expect(dataContainer).toBeVisible({ timeout: 10000 });

    // 2. El loader debe ocultarse
    const loader = page.locator('#main-loader');
    await expect(loader).toBeHidden();

    // 3. El overlay de error crítico NO debe estar activo
    const errorOverlay = page.locator('#error-overlay');
    await expect(errorOverlay).not.toHaveClass(/active/);

    // 4. No deben producirse errores de JavaScript durante la carga
    expect(consoleErrors).toEqual([]);
  });

  test('Cabecera y logo: muestra el título y el estado de actualización', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#data-container')).toBeVisible();

    // Título y logo
    const titleText = page.locator('#header-title-text');
    await expect(titleText).toHaveText('MurMeteo');

    const logo = page.locator('.header-logo');
    await expect(logo).toBeVisible();

    // Badge con la hora de actualización del pronóstico
    const headerBadge = page.locator('#header-badge');
    await expect(headerBadge).toBeVisible();
    await expect(headerBadge).toHaveText(/Act\.\s+\d{2}:\d{2}/);
  });

  test('Tarjeta principal (Top Card): muestra temperatura, viento, mín/máx y orto/ocaso', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#data-container')).toBeVisible();

    // Temperatura actual
    const topTemp = page.locator('#top-temp');
    await expect(topTemp).toBeVisible();
    await expect(topTemp).toHaveText(/\d+°/);

    // Descripción del tiempo
    const topDesc = page.locator('#top-desc');
    await expect(topDesc).toBeVisible();
    const descText = await topDesc.textContent();
    expect(descText && descText.trim().length > 0).toBeTruthy();

    // Viento actual
    const topWind = page.locator('#top-wind');
    await expect(topWind).toBeVisible();
    await expect(topWind).toHaveText(/\d+\s+km\/h/);

    // Temperaturas mínima y máxima
    const topMinMax = page.locator('#top-minmax');
    await expect(topMinMax).toBeVisible();
    await expect(topMinMax).toHaveText(/\d+°\s*\/\s*\d+°/);

    // Orto y ocaso
    const topSun = page.locator('#top-sun');
    await expect(topSun).toBeVisible();
    await expect(topSun).toHaveText(/\d{2}:\d{2}\s*\/\s*\d{2}:\d{2}/);
  });

  test('Lista horaria: renderiza filas con indicador "Ahora" y formato correcto', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#data-container')).toBeVisible();

    const hourRows = page.locator('#hourly-list .hour-row');
    await expect(hourRows.first()).toBeVisible();
    const rowCount = await hourRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(12);

    // La primera fila corresponde a la hora actual en curso
    const firstRow = hourRows.first();
    await expect(firstRow).toHaveClass(/is-now/);

    const nowLabel = firstRow.locator('.now-label');
    await expect(nowLabel).toBeVisible();
    await expect(nowLabel).toHaveText('Ahora');

    // Cada fila debe mostrar hora y temperatura válida
    const firstTime = await firstRow.locator('.time-text').textContent();
    expect(firstTime).toMatch(/\d{2}:00/);

    const firstTemp = await firstRow.locator('.hour-temp').textContent();
    expect(firstTemp).toMatch(/-?\d+°/);
  });

  test('Badges condicionales: se muestran los avisos de viento, lluvia y calor con datos reales', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#data-container')).toBeVisible();

    // Verificar que existen badges en la lista
    const allBadges = page.locator('#hourly-list .badge');
    const totalBadges = await allBadges.count();
    expect(totalBadges).toBeGreaterThan(0);

    // Badges de viento (con los umbrales >= 20 km/h o rachas >= 25 km/h)
    const windBadges = page.locator('#hourly-list .badge.wind-badge');
    const windCount = await windBadges.count();
    expect(windCount).toBeGreaterThan(0);

    // Cada badge de viento debe tener su icono y texto con formato "{speed} km/h"
    for (let i = 0; i < Math.min(windCount, 5); i++) {
      const badge = windBadges.nth(i);
      await expect(badge.locator('.badge-icon svg')).toBeVisible();
      await expect(badge.locator('.badge-text')).toHaveText(/\d+\s+km\/h/);
    }

    // Ningún badge debe mostrar texto "undefined", "null" o "NaN"
    const allTexts = await page.locator('#hourly-list .badge-text').allTextContents();
    for (const txt of allTexts) {
      expect(txt).not.toContain('undefined');
      expect(txt).not.toContain('null');
      expect(txt).not.toContain('NaN');
    }
  });

  test('Modal de instalación: abre y cierra correctamente', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#data-container')).toBeVisible();

    const infoBtn = page.locator('#btn-info');
    const modal = page.locator('#info-modal');

    // Inicialmente el modal no está visible
    await expect(modal).not.toHaveClass(/active/);

    // Abrir modal
    await infoBtn.click();
    await expect(modal).toHaveClass(/active/);

    // Cerrar con botón "Entendido"
    const okBtn = page.locator('#modal-btn-ok');
    await okBtn.click();
    await expect(modal).not.toHaveClass(/active/);
  });

});
