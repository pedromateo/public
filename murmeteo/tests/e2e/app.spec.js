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

  test('Badges condicionales: se renderizan correctamente todos los tipos de aviso con datos simulados', async ({ page }) => {
    // Generar un pronóstico simulado para mañana garantizando todas las condiciones de aviso:
    // frío (8°C), lluvia (3.5 mm), calor (35°C), viento sostenido (25 km/h) y rachas (45 km/h)
    const tomorrow = new Date(Date.now() + 86400000);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}T00:00:00`;

    const mockForecast = [{
      nombre: 'Murcia',
      elaborado: `${dateStr.split('T')[0]}T08:00:00`,
      prediccion: {
        dia: [{
          fecha: dateStr,
          temperatura: [
            { periodo: '08', value: '8' },
            { periodo: '12', value: '25' },
            { periodo: '14', value: '35' },
            { periodo: '16', value: '22' },
            { periodo: '18', value: '21' }
          ],
          sensTermica: [{ periodo: '12', value: '25' }],
          humedadRelativa: [{ periodo: '12', value: '50' }],
          estadoCielo: [
            { periodo: '08', descripcion: 'Despejado', value: '11' },
            { periodo: '12', descripcion: 'Lluvia', value: '43' },
            { periodo: '14', descripcion: 'Despejado', value: '11' },
            { periodo: '16', descripcion: 'Despejado', value: '11' },
            { periodo: '18', descripcion: 'Despejado', value: '11' }
          ],
          precipitacion: [
            { periodo: '12', value: '3.5' }
          ],
          vientoAndRachaMax: [
            { direccion: ['NO'], velocidad: ['25'], periodo: '16' },
            { direccion: ['SO'], velocidad: ['15'], periodo: '18' },
            { value: '45', periodo: '18' }
          ]
        }]
      }
    }];

    // Interceptar llamadas a ficheros de previsión (tanto rotativos en forecasts/ como forecast.json)
    await page.route(/.*forecast.*\.json.*/, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify(mockForecast)
      });
    });

    await page.goto('/');
    await expect(page.locator('#data-container')).toBeVisible();

    // 1. Badge de frío (<= 9°C)
    const coldBadges = page.locator('#hourly-list .badge.cold-badge');
    await expect(coldBadges.first()).toBeVisible();
    await expect(coldBadges.first().locator('.badge-icon svg')).toBeVisible();

    // 2. Badge de calor (>= 30°C)
    const heatBadges = page.locator('#hourly-list .badge.heat-badge');
    await expect(heatBadges.first()).toBeVisible();
    await expect(heatBadges.first().locator('.badge-icon svg')).toBeVisible();

    // 3. Badge de lluvia (>= 0.1 mm) con texto formateado
    const rainBadges = page.locator('#hourly-list .badge.rain-badge');
    await expect(rainBadges.first()).toBeVisible();
    await expect(rainBadges.first().locator('.badge-icon svg')).toBeVisible();
    await expect(rainBadges.first().locator('.badge-text')).toHaveText('3.5 mm');

    // 4. Badges de viento: sostenido y por rachas
    const windBadges = page.locator('#hourly-list .badge.wind-badge');
    await expect(windBadges).toHaveCount(2);

    // Viento sostenido (25 km/h)
    const sustainedWind = windBadges.nth(0);
    await expect(sustainedWind.locator('.badge-icon svg')).toBeVisible();
    await expect(sustainedWind.locator('.badge-text')).toHaveText('25 km/h');

    // Viento por racha (racha 45 km/h con viento base 15 km/h)
    const gustWind = windBadges.nth(1);
    await expect(gustWind.locator('.badge-icon svg')).toBeVisible();
    await expect(gustWind.locator('.badge-text')).toHaveText('Rachas 45 km/h');
    await expect(gustWind).toHaveAttribute('title', 'Viento sostenido: 15 km/h, Rachas: 45 km/h');

    // 5. Ningún badge debe mostrar "undefined", "null" o "NaN"
    const allTexts = await page.locator('#hourly-list .badge-text').allTextContents();
    for (const txt of allTexts) {
      expect(txt).not.toContain('undefined');
      expect(txt).not.toContain('null');
      expect(txt).not.toContain('NaN');
    }
  });

  test('Integración con datos reales: si existen avisos meteorológicos, están correctamente formateados', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#data-container')).toBeVisible();

    // Con datos meteorológicos reales, los avisos son condicionales según el tiempo real en Murcia.
    // Si hay avisos activos, validamos que su estructura y textos sean consistentes.
    const allBadges = page.locator('#hourly-list .badge');
    const totalBadges = await allBadges.count();

    if (totalBadges > 0) {
      // Validar badges de viento si los hay
      const windBadges = page.locator('#hourly-list .badge.wind-badge');
      const windCount = await windBadges.count();
      for (let i = 0; i < windCount; i++) {
        const badge = windBadges.nth(i);
        await expect(badge.locator('.badge-icon svg')).toBeVisible();
        await expect(badge.locator('.badge-text')).toHaveText(/(Rachas\s+)?\d+\s*km\/h/);
      }

      // Validar badges de lluvia si los hay
      const rainBadges = page.locator('#hourly-list .badge.rain-badge');
      const rainCount = await rainBadges.count();
      for (let i = 0; i < rainCount; i++) {
        const badge = rainBadges.nth(i);
        await expect(badge.locator('.badge-icon svg')).toBeVisible();
        await expect(badge.locator('.badge-text')).toHaveText(/\d+(\.\d+)?\s*mm/);
      }

      // Ningún badge debe mostrar texto "undefined", "null" o "NaN"
      const allTexts = await page.locator('#hourly-list .badge-text').allTextContents();
      for (const txt of allTexts) {
        expect(txt).not.toContain('undefined');
        expect(txt).not.toContain('null');
        expect(txt).not.toContain('NaN');
      }
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
