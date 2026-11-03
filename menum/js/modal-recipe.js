// MenuM — modal-recipe.js: Modal de preparación rápida y fuentes reales

let currentActiveRecipe = null;

function initRecipeModal() {
  const backdrop = document.getElementById('recipe-modal-backdrop');
  const closeBtn = document.getElementById('recipe-modal-close-btn');
  const bottomCloseBtn = document.getElementById('recipe-modal-bottom-close');

  if (backdrop) {
    backdrop.addEventListener('click', closeRecipeModal);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closeRecipeModal);
  }
  if (bottomCloseBtn) {
    bottomCloseBtn.addEventListener('click', closeRecipeModal);
  }

  // Cerrar con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeRecipeModal();
  });
}

function openRecipeModal(recipe) {
  if (!recipe) return;
  currentActiveRecipe = recipe;

  const modal = document.getElementById('recipe-modal');
  const backdrop = document.getElementById('recipe-modal-backdrop');
  const titleEl = document.getElementById('recipe-modal-title');
  const catEl = document.getElementById('recipe-modal-category');
  const familyNoteWrap = document.getElementById('recipe-modal-family-note-wrap');
  const familyNoteEl = document.getElementById('recipe-modal-family-note');
  const ingredientsEl = document.getElementById('recipe-modal-ingredients');
  const stepsEl = document.getElementById('recipe-modal-steps');
  const sourcesWrap = document.getElementById('recipe-modal-sources-wrap');
  const sourcesEl = document.getElementById('recipe-modal-sources');

  if (!modal || !backdrop) return;

  const meta = CATEGORY_META[recipe.category] || { emoji: "🍽️", badge: "bg-slate-100 text-slate-800" };

  // 1. Título y categoría
  if (titleEl) titleEl.textContent = recipe.name;
  if (catEl) {
    catEl.innerHTML = `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${meta.badge}">
        <span>${meta.emoji}</span>
        <span>${recipe.category}</span>
      </span>
    `;
  }

  // 2. Nota o consejo familiar
  if (familyNoteWrap && familyNoteEl) {
    if (recipe.familyNote) {
      familyNoteEl.textContent = recipe.familyNote;
      familyNoteWrap.classList.remove('hidden');
    } else {
      familyNoteWrap.classList.add('hidden');
    }
  }

  // 3. Ingredientes principales
  if (ingredientsEl) {
    ingredientsEl.innerHTML = (recipe.ingredients || []).map(ing => `
      <span class="text-xs font-semibold px-2.5 py-1 rounded-xl capitalize bg-slate-100 dark:bg-zinc-800/80 text-slate-700 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-700/80">
        ${ing}
      </span>
    `).join('');
  }

  // 4. Pasos de preparación rápida
  if (stepsEl) {
    const steps = recipe.steps && recipe.steps.length > 0
      ? recipe.steps
      : ["Preparar los ingredientes frescos y cocinar a fuego suave hasta que estén en su punto."];

    stepsEl.innerHTML = steps.map((step, idx) => `
      <li class="flex items-start gap-3">
        <span class="w-6 h-6 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 dark:bg-orange-950/60 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-orange-500/30">
          ${idx + 1}
        </span>
        <p class="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed font-medium">
          ${step}
        </p>
      </li>
    `).join('');
  }

  // 5. Fuentes y recetas completas en internet
  if (sourcesWrap && sourcesEl) {
    if (recipe.sources && recipe.sources.length > 0) {
      sourcesEl.innerHTML = recipe.sources.map(src => `
        <a href="${src.url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200/70 dark:border-orange-800/60 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-all active:scale-95">
          <span>${src.name}</span>
          <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
        </a>
      `).join('');
      sourcesWrap.classList.remove('hidden');
    } else {
      sourcesWrap.classList.add('hidden');
    }
  }

  // Mostrar modal y backdrop
  backdrop.classList.remove('hidden');
  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    backdrop.classList.remove('opacity-0');
    backdrop.classList.add('opacity-100');
    modal.classList.remove('translate-y-full');
    modal.classList.add('translate-y-0');
  });

  if (navigator.vibrate) navigator.vibrate(30);
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

function closeRecipeModal() {
  const modal = document.getElementById('recipe-modal');
  const backdrop = document.getElementById('recipe-modal-backdrop');
  if (!modal || !backdrop) return;

  modal.classList.remove('translate-y-0');
  modal.classList.add('translate-y-full');
  backdrop.classList.remove('opacity-100');
  backdrop.classList.add('opacity-0');

  setTimeout(() => {
    modal.classList.add('hidden');
    backdrop.classList.add('hidden');
    currentActiveRecipe = null;
  }, 280);
}
