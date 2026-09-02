let config = null;
let aemetService = null;
let currentData = null;
let lastRefreshTime = 0;

// Pull-to-refresh state
let touchStartY = 0;
let touchCurrentY = 0;
let isPulling = false;
const PULL_THRESHOLD = 65;

const elements = {
  loader: document.getElementById('main-loader'),
  dataContainer: document.getElementById('data-container'),
  errorOverlay: document.getElementById('error-overlay'),
  offlineBanner: document.getElementById('offline-banner'),
  btnRetry: document.getElementById('btn-retry'),
  headerBadge: document.getElementById('header-badge'),
  hourlyList: document.getElementById('hourly-list'),
  
  // Top card
  topLocation: document.getElementById('top-location'),
  topTemp: document.getElementById('top-temp'),
  topDesc: document.getElementById('top-desc'),
  topWind: document.getElementById('top-wind'),
  topMinMax: document.getElementById('top-minmax'),
  topSun: document.getElementById('top-sun'),
  
  // PWA
  pwaPrompt: document.getElementById('pwa-prompt'),
  pwaBtn: document.getElementById('pwa-btn'),
  
  // Pull to refresh
  ptrContainer: document.getElementById('ptr-container'),
  ptrIcon: document.getElementById('ptr-icon'),
  ptrText: document.getElementById('ptr-text')
};

async function loadConfig() {
  try {
    const res = await fetch('./config.json', { cache: 'no-store' });
    config = await res.json();
    return true;
  } catch (err) {
    console.error("Error loading config:", err);
    return false;
  }
}

async function initApp() {
  if (!config) {
    const loaded = await loadConfig();
    if (!loaded) return;
    aemetService = new window.AemetService(config);
    setupUIFromConfig();
  }
  
  elements.errorOverlay.classList.remove('active');
  
  // Don't show loader if pulling to refresh
  if (!document.getElementById('ptr-icon').classList.contains('spin')) {
    elements.loader.style.display = 'flex';
    elements.dataContainer.style.display = 'none';
  }
  
  try {
    const data = await aemetService.getForecast();
    currentData = data;
    lastRefreshTime = Date.now();
    
    // Save to local storage for offline fallback
    localStorage.setItem('murmeteo_cache', JSON.stringify({
      timestamp: lastRefreshTime,
      data: currentData
    }));
    
    renderApp(data, false);
  } catch (err) {
    console.warn("API Error, trying cache...", err);
    const cachedStr = localStorage.getItem('murmeteo_cache');
    if (cachedStr) {
      const cached = JSON.parse(cachedStr);
      renderApp(cached.data, true);
    } else {
      showCriticalError();
    }
  } finally {
    resetPullIndicator();
    elements.loader.style.display = 'none';
    elements.dataContainer.style.display = 'block';
  }
}

function setupUIFromConfig() {
  const titleTextEl = document.getElementById('header-title-text');
  if (titleTextEl) {
    titleTextEl.textContent = config.ui.app_title;
  } else {
    document.getElementById('header-title').textContent = config.ui.app_title;
  }
  elements.topLocation.innerHTML = config.ui.location_label;
  document.getElementById('error-title').textContent = config.ui.error_overlay.title;
  document.getElementById('error-desc').textContent = config.ui.error_overlay.message;
  elements.btnRetry.textContent = config.ui.error_overlay.retry_button;
  document.getElementById('pwa-text').textContent = config.ui.pwa_prompt.message;
  elements.pwaBtn.textContent = config.ui.pwa_prompt.button;
  elements.offlineBanner.textContent = config.ui.offline_warning;
}

function showCriticalError() {
  elements.errorOverlay.classList.add('active');
  elements.loader.style.display = 'none';
  elements.dataContainer.style.display = 'none';
}

function renderApp(data, isOffline) {
  if (isOffline) {
    elements.offlineBanner.classList.add('active');
    elements.headerBadge.textContent = "Offline";
    elements.headerBadge.style.background = "#fef3c7";
    elements.headerBadge.style.color = "#92400e";
  } else {
    elements.offlineBanner.classList.remove('active');
    
    // Format time
    const d = new Date();
    const timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    elements.headerBadge.textContent = "Act. " + timeStr;
    elements.headerBadge.style.background = "#dbeafe";
    elements.headerBadge.style.color = "#1e40af";
  }
  
  // Render Top Card
  elements.topTemp.textContent = `${data.current.temp}°`;
  elements.topDesc.textContent = `${data.current.desc}`;
  elements.topWind.innerHTML = `<svg viewBox='0 0 24 24' width='16' height='16' stroke='currentColor' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round' style='vertical-align: text-bottom;'><path d='M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2'></path></svg> ${data.current.wind} km/h`;
  elements.topMinMax.innerHTML = `<svg viewBox='0 0 24 24' width='16' height='16' stroke='currentColor' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round' style='vertical-align: text-bottom;'><path d='M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z'></path></svg> ${data.current.temp_min}° / ${data.current.temp_max}°`;
  if (elements.topSun) {
    elements.topSun.innerHTML = `<svg viewBox='0 0 24 24' width='16' height='16' stroke='currentColor' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round' style='vertical-align: text-bottom;'><path d='M17 18a5 5 0 0 0-10 0'></path><line x1='12' y1='2' x2='12' y2='9'></line><line x1='4.22' y1='10.22' x2='5.64' y2='11.64'></line><line x1='1' y1='18' x2='3' y2='18'></line><line x1='21' y1='18' x2='23' y2='18'></line><line x1='18.36' y1='11.64' x2='19.78' y2='10.22'></line><line x1='23' y1='22' x2='1' y2='22'></line><polyline points='8 6 12 2 16 6'></polyline></svg> ${data.current.orto || '--:--'} / ${data.current.ocaso || '--:--'}`;
  }
  
  // Render Hourly List
  elements.hourlyList.innerHTML = '';
  
  let currentDay = -1;
  const now = new Date();
  
  data.hourly.forEach((hourData, index) => {
    // Parse date from data or construct if mock
    const itemDate = new Date(hourData.date);
    const day = itemDate.getDate();
    
    // Add day separator if day changes
    if (currentDay !== -1 && day !== currentDay) {
      const sep = document.createElement('div');
      sep.className = 'day-separator';
      
      const isTomorrow = (day === now.getDate() + 1);
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayName = days[itemDate.getDay()];
      
      sep.textContent = isTomorrow ? `Mañana - ${dayName} ${day}` : `${dayName} ${day}`;
      elements.hourlyList.appendChild(sep);
    }
    currentDay = day;
    
    // Check if it is current hour
    const isNow = index === 0;
    
    const row = document.createElement('div');
    row.className = 'hour-row' + (isNow ? ' is-now' : '');
    
    let timeLabel = hourData.hour.toString().padStart(2, '0') + ':00';
    
    let leftHtml = `
      <div class="hour-left">
        <div class="hour-time">
          <span class="time-text">${timeLabel}</span>
          ${isNow ? `<span class="now-label">${config.ui.now_badge}</span>` : ''}
        </div>
        <div class="hour-icon">${hourData.icon}</div>
        <div class="hour-temp">${hourData.temp}°</div>
      </div>
    `;
    
    // Evaluate thresholds
    let badges = [];
    const tConfig = config.thresholds;
    
    if (hourData.temp >= tConfig.heat.min_temp_c) {
      badges.push(`<span class="badge ${tConfig.heat.badge_class}"><span class="badge-icon">${tConfig.heat.icon}</span></span>`);
    } else if (hourData.temp <= tConfig.cold.max_temp_c) {
      badges.push(`<span class="badge ${tConfig.cold.badge_class}"><span class="badge-icon">${tConfig.cold.icon}</span></span>`);
    }
    
    if (hourData.precip >= tConfig.rain.min_precip_mm) {
      const lbl = tConfig.rain.label_format.replace('{precip}', hourData.precip);
      badges.push(`<span class="badge ${tConfig.rain.badge_class}"><span class="badge-icon">${tConfig.rain.icon}</span><span class="badge-text">${lbl}</span></span>`);
    }
    
    if (hourData.windSpeed >= tConfig.wind.min_speed_kmh || hourData.windGust >= tConfig.wind.min_gust_kmh) {
      const lbl = tConfig.wind.label_format.replace('{speed}', hourData.windSpeed);
      badges.push(`<span class="badge ${tConfig.wind.badge_class}"><span class="badge-icon">${tConfig.wind.icon}</span><span class="badge-text">${lbl}</span></span>`);
    }
    
    let rightHtml = `
      <div class="hour-right">
        ${badges.join('')}
      </div>
    `;
    
    row.innerHTML = leftHtml + rightHtml;
    elements.hourlyList.appendChild(row);
  });
}

// Pull to refresh logic
window.addEventListener('touchstart', (e) => {
  if (window.scrollY === 0) {
    touchStartY = e.touches[0].clientY;
    isPulling = true;
  }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!isPulling || window.scrollY > 0) return;
  touchCurrentY = e.touches[0].clientY;
  const distance = Math.max(0, touchCurrentY - touchStartY);
  if (distance > 0) {
    const pullHeight = Math.min(distance * 0.45, 80);
    elements.ptrContainer.style.height = `${pullHeight}px`;
    elements.ptrContainer.style.opacity = pullHeight / 80;
    
    if (distance >= PULL_THRESHOLD) {
      elements.ptrIcon.classList.add('flip');
      elements.ptrText.textContent = config.ui.pull_to_refresh.release;
    } else {
      elements.ptrIcon.classList.remove('flip');
      elements.ptrText.textContent = config.ui.pull_to_refresh.pulling;
    }
  }
}, { passive: true });

window.addEventListener('touchend', async () => {
  if (!isPulling) return;
  const distance = touchCurrentY - touchStartY;
  isPulling = false;
  
  if (distance >= PULL_THRESHOLD && window.scrollY === 0) {
    elements.ptrContainer.style.height = '60px';
    elements.ptrIcon.classList.remove('flip');
    elements.ptrIcon.classList.add('spin');
    elements.ptrText.textContent = config.ui.pull_to_refresh.refreshing;
    await initApp();
  } else {
    resetPullIndicator();
  }
});

function resetPullIndicator() {
  elements.ptrContainer.style.height = '0px';
  setTimeout(() => {
    elements.ptrIcon.classList.remove('spin');
    elements.ptrIcon.classList.remove('flip');
  }, 200);
}

// Event Listeners
elements.btnRetry.addEventListener('click', initApp);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Refresh if older than 15 mins
    if (Date.now() - lastRefreshTime > 15 * 60 * 1000) {
      initApp();
    }
  }
});

// Setup periodic refresh (20 mins)
setInterval(() => {
  if (document.visibilityState === 'visible') {
    initApp();
  }
}, 20 * 60 * 1000);

// PWA Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Wait a few seconds before showing
  setTimeout(() => {
    elements.pwaPrompt.classList.add('active');
  }, 3000);
});

elements.pwaBtn.addEventListener('click', async () => {
  elements.pwaPrompt.classList.remove('active');
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
});

// Toast Notification Helper
let toastTimeout;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// Native OS Share & Clipboard Fallback
async function handleShare() {
  const shareData = {
    title: config?.ui?.app_title || 'MurMeteo',
    text: 'Consulta la previsión meteorológica de Murcia en tiempo real con MurMeteo ☀️🌧️',
    url: window.location.href
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Error al compartir:', err);
      }
    }
  } else if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('¡Enlace copiado al portapapeles!');
    } catch (err) {
      showToast('No se pudo copiar el enlace');
    }
  } else {
    showToast(window.location.href);
  }
}

const btnShare = document.getElementById('btn-share');
if (btnShare) {
  btnShare.addEventListener('click', handleShare);
}

// Boot
window.addEventListener('DOMContentLoaded', initApp);
