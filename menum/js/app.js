// MenuM — app.js: Coordinador principal de la PWA

let currentFilteredDishes = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Cargar base de datos JSON de recetas
    await loadRecipesData();

    // 2. Inicializar tema claro / oscuro (Pixel 8a status bar sync)
    initTheme();

    // 3. Inicializar modal de preparación de receta
    initRecipeModal();

    // 4. Inicializar filtros y modal selector
    initFilters(() => {
      applyFilters();
    });

    // 5. Inicializar ruleta y sorteo
    initRoulette(() => currentFilteredDishes);

    // 6. Primera aplicación de filtros y renderizado
    applyFilters();

    // 7. Registro del Service Worker Network-First
    registerServiceWorker();

  } catch (err) {
    console.error('Error al inicializar MenuM:', err);
    const container = document.getElementById('dishes-container');
    if (container) {
      container.innerHTML = `
        <div class="py-12 text-center text-rose-500 font-bold text-sm">
          No se pudieron cargar las recetas. Por favor, recarga la página.
        </div>
      `;
    }
  }
});

function applyFilters() {
  currentFilteredDishes = DISHES_DATA.filter(dish => {
    // 1. Filtro por Categoría
    if (filters.categories.size > 0 && !filters.categories.has(dish.category)) {
      return false;
    }
    // 2. Filtro Que lleve... (Obligatorio contener TODOS)
    for (const req of filters.mustHave) {
      if (!dish.ingredients.includes(req)) {
        return false;
      }
    }
    // 3. Filtro Evitar... (Descartar si contiene ALGUNO)
    for (const avoid of filters.mustAvoid) {
      if (dish.ingredients.includes(avoid)) {
        return false;
      }
    }
    return true;
  });

  renderDishesList(currentFilteredDishes);
}

function renderDishesList(dishes) {
  const container = document.getElementById('dishes-container');
  const emptyState = document.getElementById('empty-state');
  const countLabel = document.getElementById('dishes-count-label');

  if (!container) return;

  // Actualizar etiqueta de contador
  if (countLabel) {
    countLabel.textContent = `Platos sugeridos (${dishes.length} de ${DISHES_DATA.length})`;
  }

  // Comprobar estado vacío
  if (dishes.length === 0) {
    container.innerHTML = "";
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  container.innerHTML = "";

  dishes.forEach(dish => {
    const meta = CATEGORY_META[dish.category] || { emoji: "🍽️", badge: "bg-orange-50 text-orange-700 border-orange-200/60" };
    const card = document.createElement('div');
    card.id = `dish-${dish.id}`;
    card.className = "dish-card group bg-white dark:bg-[#161618] rounded-2xl p-4 border border-slate-200/70 dark:border-zinc-800 shadow-xs hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-all cursor-pointer select-none active:scale-[0.99]";

    card.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="space-y-1.5 flex-1 min-w-0">
          <span class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${meta.badge}">
            <span>${meta.emoji}</span>
            <span>${dish.category}</span>
          </span>
          <h3 class="text-base font-bold text-slate-900 dark:text-zinc-100 leading-snug">
            ${dish.name}
          </h3>
        </div>
        <button type="button" class="btn-open-recipe w-9 h-9 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20" title="Ver preparación">
          <i data-lucide="chef-hat" class="w-4 h-4 stroke-[2.2]"></i>
        </button>
      </div>

      <!-- Ingredientes -->
      <div class="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
        <div class="flex items-center justify-between mb-2">
          <p class="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Ingredientes (${dish.ingredients.length})
          </p>
          <span class="text-[11px] font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-0.5">
            Ver receta <i data-lucide="chevron-right" class="w-3 h-3"></i>
          </span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${dish.ingredients.map(ing => {
            const isMustHave = filters.mustHave.has(ing);
            return `
              <span class="text-xs font-medium px-2.5 py-0.5 rounded-lg capitalize border ${
                isMustHave
                  ? 'bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300 font-bold'
                  : 'bg-slate-50 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-300 border-slate-200/60 dark:border-zinc-700/60'
              }">
                ${ing}
              </span>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Clic en toda la tarjeta o en el botón para abrir modal de preparación
    card.addEventListener('click', () => {
      openRecipeModal(dish);
    });

    container.appendChild(card);
  });

  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('Service Worker MenuM registrado con éxito:', reg.scope);
        })
        .catch(err => {
          console.warn('Fallo al registrar Service Worker:', err);
        });
    });
  }
}
