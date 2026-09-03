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
  btnInfo: document.getElementById('btn-info'),
  btnShare: document.getElementById('btn-share'),
  hourlyList: document.getElementById('hourly-list'),
  
  // Modal de instalación
  infoModal: document.getElementById('info-modal'),
  modalClose: document.getElementById('modal-close'),
  modalBtnOk: document.getElementById('modal-btn-ok'),
  modalBadge: document.getElementById('modal-badge'),
  modalTitle: document.getElementById('modal-title'),
  modalInstructions: document.getElementById('modal-instructions'),
  modalInstallWrapper: document.getElementById('modal-install-wrapper'),
  modalInstallBtn: document.getElementById('modal-install-btn'),
  
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
  // Hora almacenada en el fichero de previsión (AEMET elaborado / creación)
  let timeStr = "";
  if (data && data.updatedAt) {
    if (typeof data.updatedAt === 'string' && data.updatedAt.includes(':') && data.updatedAt.length <= 5) {
      timeStr = data.updatedAt;
    } else {
      const match = String(data.updatedAt).match(/T?(\d{1,2}):(\d{2})/);
      if (match) {
        timeStr = match[1].padStart(2, '0') + ':' + match[2];
      } else {
        const d = new Date(data.updatedAt);
        if (!isNaN(d.getTime())) {
          timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
        }
      }
    }
  }
  
  // Si no hay hora en el fichero, mostrar indicador neutral, nunca la hora del reloj del dispositivo
  if (!timeStr) {
    timeStr = "--:--";
  }

  if (isOffline) {
    elements.offlineBanner.classList.add('active');
    elements.headerBadge.textContent = "Offline (" + timeStr + ")";
    elements.headerBadge.style.background = "#fef3c7";
    elements.headerBadge.style.color = "#92400e";
  } else {
    elements.offlineBanner.classList.remove('active');
    elements.headerBadge.textContent = "Act. " + timeStr;
    elements.headerBadge.style.background = "#dbeafe";
    elements.headerBadge.style.color = "#1e40af";
  }
  elements.headerBadge.title = "Previsión generada a las " + timeStr;
  
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
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  data.hourly.forEach((hourData, index) => {
    // Parse date from data or construct if mock
    const itemDate = new Date(hourData.date);
    const day = itemDate.getDate();
    const itemMidnight = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()).getTime();
    
    // Add day separator if day changes
    if (currentDay !== -1 && day !== currentDay) {
      const sep = document.createElement('div');
      sep.className = 'day-separator';
      
      const diffDays = Math.round((itemMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayName = days[itemDate.getDay()];
      
      if (diffDays === 1) {
        sep.textContent = `${dayName} ${day} (Mañana)`;
      } else if (diffDays === 2) {
        sep.textContent = `${dayName} ${day}`;
      } else {
        sep.textContent = `${dayName} ${day}`;
      }
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
    text: 'MurMeteo: la previsión meteorológica para Murcia y nada más ☀️🌧️ (con datos AEMET)',
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

if (elements.btnShare) {
  elements.btnShare.addEventListener('click', handleShare);
}

// Modal de Información / Instrucciones de Instalación
function getInstallInstructions() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  
  const isFirefox = /Firefox|FxiOS/i.test(ua);
  const isChrome = (/Chrome|CriOS/i.test(ua) || /Chromium/i.test(ua)) && !/Edg/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !isChrome && !isFirefox && !/Edg/i.test(ua);
  const isEdge = /Edg/i.test(ua);

  if (isIOS) {
    if (isSafari) {
      return {
        badge: 'iOS · Safari',
        title: 'Instalar en iPhone o iPad',
        steps: [
          'Pulsa el botón <strong>Compartir</strong> (icono de cuadro con flecha hacia arriba <span style="font-size:1.1em">⎋</span> en la barra inferior de Safari).',
          'En el menú que aparece, desliza hacia abajo y pulsa en <strong>"Añadir a la pantalla de inicio"</strong> ➕.',
          'Pulsa <strong>"Añadir"</strong> arriba a la derecha para confirmar.'
        ]
      };
    } else if (isChrome) {
      return {
        badge: 'iOS · Chrome',
        title: 'Instalar en iPhone o iPad',
        steps: [
          'Pulsa el botón <strong>Compartir</strong> o el menú de tres puntos (<strong>...</strong>) en la barra de navegación.',
          'Selecciona la opción <strong>"Añadir a pantalla de inicio"</strong> ➕.',
          'Pulsa <strong>"Añadir"</strong> para tener el acceso directo en tu pantalla.'
        ]
      };
    } else if (isFirefox) {
      return {
        badge: 'iOS · Firefox',
        title: 'Instalar en iPhone o iPad',
        steps: [
          'Toca el menú de tres líneas (<strong>☰</strong>) en la esquina inferior.',
          'Toca en <strong>"Compartir"</strong> y luego en <strong>"Añadir a la pantalla de inicio"</strong> ➕.',
          'Confirma pulsando <strong>"Añadir"</strong>.'
        ]
      };
    } else {
      return {
        badge: 'iOS',
        title: 'Instalar en iPhone o iPad',
        steps: [
          'Abre el menú de opciones o el botón <strong>Compartir</strong> de tu navegador.',
          'Selecciona la opción <strong>"Añadir a la pantalla de inicio"</strong> ➕.',
          'Confirma pulsando <strong>"Añadir"</strong>.'
        ]
      };
    }
  }

  if (isAndroid) {
    if (isFirefox) {
      return {
        badge: 'Android · Firefox',
        title: 'Instalar en Android',
        steps: [
          'Toca el menú de tres puntos (<strong>⋮</strong>) en la barra del navegador.',
          'Pulsa en <strong>"Instalar"</strong> o <strong>"Añadir a la pantalla de inicio"</strong> ➕.',
          'Confirma para añadir el acceso directo a tus aplicaciones.'
        ]
      };
    } else if (isChrome) {
      return {
        badge: 'Android · Chrome',
        title: 'Instalar en Android',
        steps: [
          'Toca el menú de tres puntos (<strong>⋮</strong>) en la esquina superior derecha de Chrome.',
          'Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a la pantalla de inicio"</strong>.',
          'Pulsa <strong>"Instalar"</strong> en el mensaje de confirmación.'
        ]
      };
    } else {
      return {
        badge: 'Android',
        title: 'Instalar en Android',
        steps: [
          'Abre el menú de opciones (<strong>⋮</strong> o <strong>☰</strong>) de tu navegador.',
          'Selecciona la opción <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.',
          'Confirma la instalación.'
        ]
      };
    }
  }

  // Escritorio / Desktop
  if (isChrome || isEdge) {
    return {
      badge: 'Escritorio · ' + (isEdge ? 'Edge' : 'Chrome'),
      title: 'Instalar en tu ordenador',
      steps: [
        'Haz clic en el icono de <strong>Instalar</strong> en la barra de direcciones (a la derecha de la URL).',
        'O abre el menú (<strong>⋮</strong>) y haz clic en <strong>"Instalar MurMeteo..."</strong>.',
        'La aplicación se abrirá en su propia ventana rápida e independiente.'
      ]
    };
  } else if (isSafari) {
    return {
      badge: 'macOS · Safari',
      title: 'Instalar en Mac',
      steps: [
        'En la barra de menús superior de Safari, haz clic en <strong>Archivo</strong>.',
        'Selecciona <strong>"Añadir al Dock..."</strong>.',
        'Haz clic en <strong>"Añadir"</strong> para tenerla siempre accesible.'
      ]
    };
  } else {
    return {
      badge: 'Navegador Web',
      title: 'Instalar como Web App',
      steps: [
        'Abre el menú de opciones de tu navegador web.',
        'Busca la opción <strong>"Instalar aplicación"</strong> o <strong>"Añadir a la pantalla de inicio"</strong>.',
        'Tendrás acceso instantáneo como cualquier otra app nativa.'
      ]
    };
  }
}

function openInfoModal() {
  if (!elements.infoModal) return;
  
  const info = getInstallInstructions();
  if (elements.modalBadge) elements.modalBadge.textContent = info.badge;
  if (elements.modalTitle) elements.modalTitle.textContent = info.title;
  
  if (elements.modalInstructions) {
    elements.modalInstructions.innerHTML = `
      <ul class="modal-steps">
        ${info.steps.map((step, idx) => `
          <li class="modal-step">
            <span class="modal-step-num">${idx + 1}</span>
            <span>${step}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }

  if (deferredPrompt && elements.modalInstallWrapper) {
    elements.modalInstallWrapper.style.display = 'block';
  } else if (elements.modalInstallWrapper) {
    elements.modalInstallWrapper.style.display = 'none';
  }

  elements.infoModal.classList.add('active');
}

function closeInfoModal() {
  if (elements.infoModal) {
    elements.infoModal.classList.remove('active');
  }
}

if (elements.btnInfo) {
  elements.btnInfo.addEventListener('click', openInfoModal);
}
if (elements.modalClose) {
  elements.modalClose.addEventListener('click', closeInfoModal);
}
if (elements.modalBtnOk) {
  elements.modalBtnOk.addEventListener('click', closeInfoModal);
}
if (elements.infoModal) {
  elements.infoModal.addEventListener('click', (e) => {
    if (e.target === elements.infoModal) closeInfoModal();
  });
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeInfoModal();
});

if (elements.modalInstallBtn) {
  elements.modalInstallBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      closeInfoModal();
    }
  });
}

// Boot
window.addEventListener('DOMContentLoaded', initApp);
