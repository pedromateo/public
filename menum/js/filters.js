// MenuM — filters.js: Gestión de filtros y bottom-sheet selector

const filters = {
  categories: new Set(),
  mustHave: new Set(),
  mustAvoid: new Set()
};

let currentSheetType = null; // 'categories' | 'mustHave' | 'mustAvoid'
let activeSheetSearch = "";
let onFiltersChangedCallback = null;

function initFilters(onFiltersChanged) {
  onFiltersChangedCallback = onFiltersChanged;

  const btnCategories = document.getElementById('btn-open-categories');
  const btnMustHave = document.getElementById('btn-open-must-have');
  const btnMustAvoid = document.getElementById('btn-open-must-avoid');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');

  if (btnCategories) {
    btnCategories.addEventListener('click', () => openFilterSheet('categories'));
  }
  if (btnMustHave) {
    btnMustHave.addEventListener('click', () => openFilterSheet('mustHave'));
  }
  if (btnMustAvoid) {
    btnMustAvoid.addEventListener('click', () => openFilterSheet('mustAvoid'));
  }
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      filters.categories.clear();
      filters.mustHave.clear();
      filters.mustAvoid.clear();
      updatePillCounters();
      if (onFiltersChangedCallback) onFiltersChangedCallback();
      if (navigator.vibrate) navigator.vibrate(25);
    });
  }

  // Eventos del modal selector
  const sheetCloseBtn = document.getElementById('sheet-close-btn');
  const sheetBackdrop = document.getElementById('sheet-backdrop');
  const sheetApplyBtn = document.getElementById('sheet-apply-filter');
  const sheetResetBtn = document.getElementById('sheet-reset-filter');
  const sheetSearchInput = document.getElementById('sheet-search');
  const sheetSearchClear = document.getElementById('sheet-search-clear');

  if (sheetCloseBtn) sheetCloseBtn.addEventListener('click', closeFilterSheet);
  if (sheetBackdrop) sheetBackdrop.addEventListener('click', closeFilterSheet);
  if (sheetApplyBtn) sheetApplyBtn.addEventListener('click', closeFilterSheet);
  if (sheetResetBtn) {
    sheetResetBtn.addEventListener('click', () => {
      if (currentSheetType) {
        filters[currentSheetType].clear();
        renderFilterSheetList();
        updatePillCounters();
        if (onFiltersChangedCallback) onFiltersChangedCallback();
      }
    });
  }

  if (sheetSearchInput) {
    sheetSearchInput.addEventListener('input', (e) => {
      activeSheetSearch = e.target.value.toLowerCase().trim();
      if (sheetSearchClear) {
        sheetSearchClear.classList.toggle('hidden', activeSheetSearch === '');
      }
      renderFilterSheetList();
    });
  }

  if (sheetSearchClear) {
    sheetSearchClear.addEventListener('click', () => {
      if (sheetSearchInput) sheetSearchInput.value = '';
      activeSheetSearch = '';
      sheetSearchClear.classList.add('hidden');
      renderFilterSheetList();
      if (sheetSearchInput) sheetSearchInput.focus();
    });
  }
}

function openFilterSheet(type) {
  currentSheetType = type;
  activeSheetSearch = "";

  const sheet = document.getElementById('bottom-sheet');
  const backdrop = document.getElementById('sheet-backdrop');
  const title = document.getElementById('sheet-title');
  const subtitle = document.getElementById('sheet-subtitle');
  const searchInput = document.getElementById('sheet-search');
  const searchClear = document.getElementById('sheet-search-clear');

  if (!sheet || !backdrop) return;

  if (searchInput) searchInput.value = "";
  if (searchClear) searchClear.classList.add('hidden');

  if (type === 'categories') {
    if (title) title.textContent = "Filtrar por Categoría";
    if (subtitle) subtitle.textContent = "Selecciona una o varias categorías";
    if (searchInput) searchInput.placeholder = "Buscar categoría...";
  } else if (type === 'mustHave') {
    if (title) title.textContent = "Que lleve... (Obligatorios)";
    if (subtitle) subtitle.textContent = "Muestra platos que contengan TODOS los seleccionados";
    if (searchInput) searchInput.placeholder = "Buscar ingrediente a incluir...";
  } else if (type === 'mustAvoid') {
    if (title) title.textContent = "Evitar... (Exclusiones)";
    if (subtitle) subtitle.textContent = "Descarta platos que contengan estos ingredientes";
    if (searchInput) searchInput.placeholder = "Buscar ingrediente a descartar...";
  }

  renderFilterSheetList();

  backdrop.classList.remove('hidden');
  sheet.classList.remove('hidden');
  requestAnimationFrame(() => {
    backdrop.classList.remove('opacity-0');
    backdrop.classList.add('opacity-100');
    sheet.classList.remove('translate-y-full');
    sheet.classList.add('translate-y-0');
  });

  if (navigator.vibrate) navigator.vibrate(25);
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

function closeFilterSheet() {
  const sheet = document.getElementById('bottom-sheet');
  const backdrop = document.getElementById('sheet-backdrop');
  if (!sheet || !backdrop) return;

  sheet.classList.remove('translate-y-0');
  sheet.classList.add('translate-y-full');
  backdrop.classList.remove('opacity-100');
  backdrop.classList.add('opacity-0');

  setTimeout(() => {
    sheet.classList.add('hidden');
    backdrop.classList.add('hidden');
    currentSheetType = null;
  }, 280);
}

function renderFilterSheetList() {
  const listContainer = document.getElementById('sheet-list');
  if (!listContainer || !currentSheetType) return;

  const items = currentSheetType === 'categories' ? ALL_CATEGORIES : ALL_INGREDIENTS;
  const filtered = activeSheetSearch
    ? items.filter(i => i.toLowerCase().includes(activeSheetSearch))
    : items;

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="py-10 text-center">
        <p class="text-sm font-semibold text-slate-400 dark:text-zinc-500">No se encontraron resultados</p>
      </div>
    `;
    return;
  }

  const selectedSet = filters[currentSheetType];
  listContainer.innerHTML = "";

  filtered.forEach(item => {
    const isChecked = selectedSet.has(item);
    const prefixEmoji = currentSheetType === 'categories' && CATEGORY_META[item]
      ? `${CATEGORY_META[item].emoji} `
      : '';

    const label = document.createElement('label');
    label.className = `flex items-center justify-between py-3.5 px-3.5 rounded-2xl cursor-pointer transition-all active:scale-[0.98] select-none border mb-1.5 ${
      isChecked 
        ? 'bg-orange-500/10 border-orange-500/40 text-orange-950 dark:text-orange-200 shadow-xs' 
        : 'bg-white dark:bg-zinc-800/70 border-slate-200/70 dark:border-zinc-700/60 hover:bg-slate-50 dark:hover:bg-zinc-800'
    }`;

    label.innerHTML = `
      <span class="text-sm capitalize font-semibold ${isChecked ? 'text-orange-700 dark:text-orange-300 font-bold' : 'text-slate-700 dark:text-zinc-200'}">
        ${prefixEmoji}${item}
      </span>
      <div class="w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
        isChecked 
          ? 'bg-orange-600 text-white shadow-xs' 
          : 'border-2 border-slate-300 dark:border-zinc-600 bg-transparent'
      }">
        ${isChecked ? '<i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>' : ''}
      </div>
    `;

    label.addEventListener('click', (e) => {
      e.preventDefault();
      if (selectedSet.has(item)) {
        selectedSet.delete(item);
      } else {
        selectedSet.add(item);
      }
      renderFilterSheetList();
      updatePillCounters();
      if (onFiltersChangedCallback) onFiltersChangedCallback();
      if (navigator.vibrate) navigator.vibrate(18);
    });

    listContainer.appendChild(label);
  });

  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

function updatePillCounters() {
  const updateBtn = (id, count, activeClass) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const labelSpan = btn.querySelector('.pill-label');
    const badge = btn.querySelector('.filter-badge');

    if (count > 0) {
      btn.className = `filter-pill py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 border ${activeClass}`;
      if (!badge) {
        const b = document.createElement('span');
        b.className = 'filter-badge ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-extrabold bg-white/25 text-white';
        b.textContent = count;
        btn.appendChild(b);
      } else {
        badge.textContent = count;
      }
    } else {
      btn.className = "filter-pill py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-all active:scale-95 border bg-slate-100/90 hover:bg-slate-200/70 text-slate-700 border-slate-200/80 dark:bg-zinc-800/90 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700/70";
      if (badge) badge.remove();
    }
  };

  updateBtn('btn-open-categories', filters.categories.size, 'bg-orange-600 text-white border-orange-700 shadow-xs shadow-orange-500/20');
  updateBtn('btn-open-must-have', filters.mustHave.size, 'bg-orange-600 text-white border-orange-700 shadow-xs shadow-orange-500/20');
  updateBtn('btn-open-must-avoid', filters.mustAvoid.size, 'bg-rose-500 text-white border-rose-600 shadow-xs shadow-rose-500/20');

  const totalActive = filters.categories.size + filters.mustHave.size + filters.mustAvoid.size;
  const clearBtn = document.getElementById('clear-filters-btn');
  if (clearBtn) {
    clearBtn.classList.toggle('hidden', totalActive === 0);
  }
}
