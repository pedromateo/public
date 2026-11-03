const { test, expect } = require('@playwright/test');

test.describe('MenuM PWA — Tests E2E y Ergonomía Pixel 8a', () => {

  test('1. Carga inicial, título, branding y metadatos PWA', async ({ page }) => {
    await page.goto('/');

    // Comprobar título del documento y cabecera
    await expect(page).toHaveTitle(/MenuM — Menú Familiar/);
    const headerTitle = page.locator('header h1');
    await expect(headerTitle).toHaveText('MenuM');

    // Metadatos PWA en <head>
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', 'manifest.json');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', /#121214|#FDFBF7/);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', 'icons/favicon.svg');

    // Botones de cabecera con dimensiones táctiles mínimas (44px)
    const themeBtn = page.locator('#theme-toggle-btn');
    const randomBtn = page.locator('#random-btn');
    await expect(themeBtn).toBeVisible();
    await expect(randomBtn).toBeVisible();

    const themeBox = await themeBtn.boundingBox();
    expect(themeBox.width).toBeGreaterThanOrEqual(44);
    expect(themeBox.height).toBeGreaterThanOrEqual(44);
  });

  test('2. Carga completa de recetas desde data/recipes.json', async ({ page }) => {
    await page.goto('/');

    // Esperar a que se rendericen las tarjetas de platos
    const cards = page.locator('.dish-card');
    await expect(cards).toHaveCount(23);

    // Comprobar la etiqueta del contador
    const countLabel = page.locator('#dishes-count-label');
    await expect(countLabel).toHaveText('Platos sugeridos (23 de 23)');

    // Verificar primera tarjeta
    const firstCard = cards.first();
    await expect(firstCard.locator('h3')).toBeVisible();
    await expect(firstCard.locator('.btn-open-recipe')).toBeVisible();
  });

  test('3. Modal de preparación rápida al hacer clic en una receta', async ({ page }) => {
    await page.goto('/');

    const firstCard = page.locator('.dish-card').first();
    const dishTitle = await firstCard.locator('h3').textContent();

    // Clic en la tarjeta para abrir modal de preparación
    await firstCard.click();

    const recipeModal = page.locator('#recipe-modal');
    await expect(recipeModal).toBeVisible();

    // Comprobar título en el modal
    const modalTitle = page.locator('#recipe-modal-title');
    await expect(modalTitle).toHaveText(dishTitle.trim());

    // Comprobar que existen pasos numerados
    const steps = page.locator('#recipe-modal-steps li');
    const countSteps = await steps.count();
    expect(countSteps).toBeGreaterThanOrEqual(3);

    // Comprobar enlaces a fuentes web externas
    const sourceLinks = page.locator('#recipe-modal-sources a');
    const countSources = await sourceLinks.count();
    expect(countSources).toBeGreaterThanOrEqual(2);
    await expect(sourceLinks.first()).toHaveAttribute('target', '_blank');

    // Cerrar modal pulsando en el botón inferior "¡Entendido, a cocinar!"
    const closeBtn = page.locator('#recipe-modal-bottom-close');
    await closeBtn.click();
    await expect(recipeModal).toBeHidden();
  });

  test('4. Modal de filtros combinados: Categoría, Que lleve, Evitar y búsqueda', async ({ page }) => {
    await page.goto('/');

    // 4.1 Filtrar por Categoría: "Pastas, pizzas y arroces"
    await page.locator('#btn-open-categories').click();
    const filterModal = page.locator('#bottom-sheet');
    await expect(filterModal).toBeVisible();

    // Seleccionar la categoría
    const pastaCat = page.locator('#sheet-list label', { hasText: 'Pastas, pizzas y arroces' });
    await pastaCat.click();

    // Cerrar modal de filtro
    await page.locator('#sheet-apply-filter').click();
    await expect(filterModal).toBeHidden();

    // Comprobar que la lista se ha filtrado
    const pastaCards = page.locator('.dish-card');
    const pastaCount = await pastaCards.count();
    expect(pastaCount).toBe(4);

    // Comprobar que el botón de limpiar filtros está visible
    const clearBtn = page.locator('#clear-filters-btn');
    await expect(clearBtn).toBeVisible();

    // 4.2 Probar buscador dentro del modal de filtro "Que lleve"
    await page.locator('#btn-open-must-have').click();
    await expect(filterModal).toBeVisible();

    const searchInput = page.locator('#sheet-search');
    await searchInput.fill('huevo');
    const searchResults = page.locator('#sheet-list label');
    await expect(searchResults).toHaveCount(1);
    await searchResults.first().click();

    await page.locator('#sheet-apply-filter').click();
    await expect(filterModal).toBeHidden();

    // 4.3 Limpiar todos los filtros
    await clearBtn.click();
    await expect(page.locator('.dish-card')).toHaveCount(23);
    await expect(clearBtn).toBeHidden();
  });

  test('5. Sorteo aleatorio (Ruleta), banner spotlight y botón de preparación', async ({ page }) => {
    await page.goto('/');

    const randomBtn = page.locator('#random-btn');
    await randomBtn.click();

    // El banner spotlight debe ser visible
    const spotlight = page.locator('#random-spotlight');
    await expect(spotlight).toBeVisible();

    // Esperar a que la ruleta finalice (más de 1.5s)
    await page.waitForTimeout(1600);

    const winnerNameEl = page.locator('#spotlight-dish-name');
    const winnerName = await winnerNameEl.textContent();
    expect(winnerName.length).toBeGreaterThan(3);

    // Debe existir una tarjeta ganadora con clase .winner-card
    const winnerCard = page.locator('.winner-card');
    await expect(winnerCard).toBeVisible();

    // El botón "Ver cómo preparar" del banner debe abrir el modal de preparación
    const viewPrepBtn = page.locator('#spotlight-view-recipe-btn');
    await viewPrepBtn.click();

    const recipeModal = page.locator('#recipe-modal');
    await expect(recipeModal).toBeVisible();
    await expect(page.locator('#recipe-modal-title')).toHaveText(winnerName.trim());

    // Cerrar modal
    await page.locator('#recipe-modal-close-btn').click();
    await expect(recipeModal).toBeHidden();

    // Cerrar el banner spotlight
    await page.locator('#close-spotlight-btn').click();
    await expect(spotlight).toBeHidden();
  });

  test('6. Alternancia de modo oscuro / claro y persistencia', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    const themeBtn = page.locator('#theme-toggle-btn');

    const wasDark = await html.evaluate(el => el.classList.contains('dark'));
    await themeBtn.click();

    if (wasDark) {
      await expect(html).not.toHaveClass(/dark/);
    } else {
      await expect(html).toHaveClass(/dark/);
    }

    // Comprobar persistencia en localStorage
    const savedTheme = await page.evaluate(() => localStorage.getItem('menum_theme_pref'));
    expect(savedTheme).toBe(wasDark ? 'light' : 'dark');
  });

  test('7. Adaptación móvil Pixel 8a (ancho 412px sin scroll horizontal)', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/');

    // Comprobar que scrollWidth no excede clientWidth del body
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Comprobar que los botones de filtro se distribuyen correctamente
    const filterPills = page.locator('.filter-pill');
    await expect(filterPills).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const box = await filterPills.nth(i).boundingBox();
      expect(box.width).toBeGreaterThan(80);
    }
  });

  test('8. Registro de Service Worker PWA', async ({ page }) => {
    await page.goto('/');

    // Verificar que el Service Worker se registra sin error
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return reg !== undefined;
    });

    expect(swRegistered).toBe(true);
  });

});
