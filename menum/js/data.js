// MenuM — data.js: Cargador y gestor del catálogo de recetas JSON

let CATEGORY_META = {};
let DISHES_DATA = [];
let ALL_CATEGORIES = [];
let ALL_INGREDIENTS = [];

/**
 * Carga el archivo data/recipes.json y genera los índices de búsqueda.
 */
async function loadRecipesData() {
  try {
    const response = await fetch('./data/recipes.json', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Error HTTP al cargar recetas: ${response.status}`);
    }
    const data = await response.json();
    CATEGORY_META = data.categories || {};
    DISHES_DATA = data.recipes || [];

    // Derivar listado único de categorías ordenadas en español
    ALL_CATEGORIES = Object.keys(CATEGORY_META).length > 0
      ? Object.keys(CATEGORY_META)
      : [...new Set(DISHES_DATA.map(d => d.category))];
    ALL_CATEGORIES.sort((a, b) => a.localeCompare(b, 'es'));

    // Derivar listado único de ingredientes ordenados en español
    ALL_INGREDIENTS = [...new Set(DISHES_DATA.flatMap(d => d.ingredients || []))];
    ALL_INGREDIENTS.sort((a, b) => a.localeCompare(b, 'es'));

    return { CATEGORY_META, DISHES_DATA, ALL_CATEGORIES, ALL_INGREDIENTS };
  } catch (err) {
    console.error('Error cargando data/recipes.json:', err);
    throw err;
  }
}
