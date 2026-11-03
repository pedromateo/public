// MenuM — roulette.js: Sorteo aleatorio, ruleta y banner spotlight

let isSpinning = false;
let lastWinnerId = null;
let currentWinnerDish = null;

function initRoulette(getEligibleDishes) {
  const randomBtn = document.getElementById('random-btn');
  const closeSpotlightBtn = document.getElementById('close-spotlight-btn');
  const viewRecipeBtn = document.getElementById('spotlight-view-recipe-btn');
  const spotlight = document.getElementById('random-spotlight');

  if (closeSpotlightBtn) {
    closeSpotlightBtn.addEventListener('click', () => {
      if (spotlight) spotlight.classList.add('hidden');
      document.querySelectorAll('.dish-card').forEach(c => c.classList.remove('winner-card'));
      currentWinnerDish = null;
    });
  }

  if (viewRecipeBtn) {
    viewRecipeBtn.addEventListener('click', () => {
      if (currentWinnerDish && typeof openRecipeModal === 'function') {
        openRecipeModal(currentWinnerDish);
      }
    });
  }

  if (randomBtn) {
    randomBtn.addEventListener('click', () => {
      const eligible = getEligibleDishes ? getEligibleDishes() : [];
      if (isSpinning || eligible.length === 0) return;

      runRoulette(eligible);
    });
  }
}

function runRoulette(dishes) {
  isSpinning = true;
  const shuffleWrap = document.getElementById('shuffle-icon-wrap');
  const spotlight = document.getElementById('random-spotlight');
  const statusIcon = document.getElementById('spotlight-status-icon');
  const statusText = document.getElementById('spotlight-status-text');
  const nameEl = document.getElementById('spotlight-dish-name');
  const catEl = document.getElementById('spotlight-dish-cat');
  const ingsEl = document.getElementById('spotlight-ingredients');

  if (shuffleWrap) shuffleWrap.classList.add('animate-shuffle');
  if (navigator.vibrate) navigator.vibrate(35);

  if (spotlight) spotlight.classList.remove('hidden');
  if (statusIcon) statusIcon.textContent = "🎰";
  if (statusText) statusText.textContent = "Eligiendo menú para hoy...";
  if (ingsEl) ingsEl.innerHTML = "";
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Si solo hay 1 plato disponible, seleccionarlo directamente
  if (dishes.length === 1) {
    finishRoulette(dishes[0]);
    return;
  }

  let step = 0;
  const totalSteps = 14;

  const interval = setInterval(() => {
    const preview = dishes[Math.floor(Math.random() * dishes.length)];
    const meta = CATEGORY_META[preview.category] || { emoji: "🍽️" };
    if (nameEl) nameEl.textContent = preview.name;
    if (catEl) catEl.textContent = `${meta.emoji} ${preview.category}`;

    step++;
    if (step >= totalSteps) {
      clearInterval(interval);

      // Evitar repetir consecutivamente el mismo plato si hay más de 1 opción
      let pool = dishes;
      if (pool.length > 1 && lastWinnerId !== null) {
        pool = pool.filter(d => d.id !== lastWinnerId);
      }
      const winner = pool[Math.floor(Math.random() * pool.length)];
      finishRoulette(winner);
    }
  }, 75);
}

function finishRoulette(winner) {
  lastWinnerId = winner.id;
  currentWinnerDish = winner;
  isSpinning = false;

  const shuffleWrap = document.getElementById('shuffle-icon-wrap');
  if (shuffleWrap) shuffleWrap.classList.remove('animate-shuffle');

  const statusIcon = document.getElementById('spotlight-status-icon');
  const statusText = document.getElementById('spotlight-status-text');
  const nameEl = document.getElementById('spotlight-dish-name');
  const catEl = document.getElementById('spotlight-dish-cat');
  const ingsEl = document.getElementById('spotlight-ingredients');

  const meta = CATEGORY_META[winner.category] || { emoji: "🍽️" };
  if (statusIcon) statusIcon.textContent = "✨";
  if (statusText) statusText.textContent = "¡Menú familiar sugerido!";
  if (nameEl) nameEl.textContent = winner.name;
  if (catEl) catEl.textContent = `${meta.emoji} ${winner.category}`;

  if (ingsEl) {
    ingsEl.innerHTML = (winner.ingredients || []).map(ing => `
      <span class="text-xs font-bold bg-white/20 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-lg capitalize">
        ${ing}
      </span>
    `).join('');
  }

  // Resaltar tarjeta en la lista inferior
  document.querySelectorAll('.dish-card').forEach(c => c.classList.remove('winner-card'));
  const cardEl = document.getElementById(`dish-${winner.id}`);
  if (cardEl) {
    cardEl.classList.add('winner-card');
  }

  if (navigator.vibrate) navigator.vibrate([40, 50, 70]);
}
