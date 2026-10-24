// Medit PWA - Core Controller & Reactive UI
document.addEventListener('DOMContentLoaded', () => {
  // Service Worker Registration for 100% Offline Capability
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      console.log('Medit Service Worker registrado con éxito:', reg.scope);
    }).catch((err) => {
      console.warn('Error registrando Service Worker:', err);
    });
  }

  // App State
  let state = window.habitStorage.load();
  let currentTab = 'home';

  // Breathing Visualizer State
  let breathState = {
    protocolId: 'cyclic-sighing',
    currentCycle: 1,
    currentStepIdx: 0,
    isRunning: false,
    stepElapsed: 0,
    totalElapsed: 0,
    isCompleted: false,
    soundCues: true,
    timerId: null
  };

  // Timer State
  let timerState = {
    selectedSeconds: 120, // default 2 min
    remainingSeconds: 120,
    isActive: false,
    isPaused: false,
    isFinished: false,
    hideClock: false,
    intervalBell: 'auto', // 'auto' plays at 5m/10m for longer sessions
    ratingAfter: 4,
    note: '',
    timerId: null
  };

  // S.T.O.P. Modal State
  let stopState = {
    isOpen: false,
    stepIdx: 0,
    remaining: 15,
    isRunning: false,
    isFinished: false,
    timerId: null
  };

  const STOP_STEPS = [
    {
      letter: 'S',
      word: 'STOP',
      title: 'Para lo que estás haciendo',
      desc: 'Suelta el teclado, la pantalla o cualquier objeto. Deja caer los brazos. Date permiso para detener la inercia exterior por 60 segundos.',
      duration: 15
    },
    {
      letter: 'T',
      word: 'TAKE A BREATH',
      title: 'Toma una respiración consciente',
      desc: 'Inhala hondo por la nariz inflando el diafragma y exhala lentamente por la boca con un suspiro suave. Avisa a tu sistema de que estás a salvo.',
      duration: 15
    },
    {
      letter: 'O',
      word: 'OBSERVE',
      title: 'Observa sin juzgar',
      desc: 'Escanea mandíbula (sepárala), hombros (déjalos caer) y pensamientos de prisa (míralos como nubes pasajeras). Curiosidad y amabilidad.',
      duration: 15
    },
    {
      letter: 'P',
      word: 'PROCEED',
      title: 'Procede con claridad',
      desc: 'Abre los ojos despacio si los tenías cerrados. Pregúntate: "¿Qué es lo esencial ahora?". Retoma tu jornada desde la presencia lúcida.',
      duration: 15
    }
  ];

  // DOM Elements
  const headerStreak = document.getElementById('header-streak');
  const headerSoundBtn = document.getElementById('header-sound-btn');
  const headerSettingsBtn = document.getElementById('header-settings-btn');
  const mainContent = document.getElementById('main-content');
  const navTabs = document.querySelectorAll('.nav-tab');

  // Modals DOM
  const stopModalEl = document.getElementById('stop-modal');
  const anchorModalEl = document.getElementById('anchor-modal');
  const soundModalEl = document.getElementById('sound-modal');

  // PWA Install prompt
  let deferredPrompt = null;
  const pwaInstallBanner = document.getElementById('pwa-install-banner');
  const pwaInstallBtn = document.getElementById('pwa-install-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaInstallBanner) pwaInstallBanner.classList.remove('hidden');
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          pwaInstallBanner.classList.add('hidden');
        }
        deferredPrompt = null;
      }
    });
  }

  // Header Updates
  function updateHeader() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isDoneToday = state.lastActiveDate === todayStr;

    headerStreak.innerHTML = `
      <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
        isDoneToday
          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
      }">
        <span>${isDoneToday ? '✓' : '🔥'}</span>
        <span class="font-bold">${state.streakDays}</span>
        <span class="text-[11px] opacity-80">${state.streakDays === 1 ? 'día' : 'días'}</span>
      </div>
    `;

    const isSoundOn = state.soundVolume > 0;
    headerSoundBtn.innerHTML = isSoundOn
      ? `<svg class="w-4 h-4 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`
      : `<svg class="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
  }

  headerSoundBtn.addEventListener('click', () => {
    state.soundVolume = state.soundVolume > 0 ? 0 : 0.8;
    window.habitStorage.save(state);
    updateHeader();
  });

  headerSettingsBtn.addEventListener('click', () => {
    openSoundModal();
  });

  // Navigation tab switcher
  function switchTab(tabId) {
    currentTab = tabId;
    navTabs.forEach((btn) => {
      const isCurrent = btn.dataset.tab === tabId;
      btn.classList.toggle('text-teal-400', isCurrent);
      btn.classList.toggle('font-medium', isCurrent);
      btn.classList.toggle('text-slate-400', !isCurrent);
      const indicator = btn.querySelector('.active-indicator');
      if (indicator) indicator.classList.toggle('hidden', !isCurrent);
    });

    renderView();
  }

  navTabs.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Render current view
  function renderView() {
    updateHeader();
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (currentTab === 'home') {
      renderHome();
    } else if (currentTab === 'breathe') {
      renderBreathe();
    } else if (currentTab === 'timer') {
      renderTimer();
    } else if (currentTab === 'learn') {
      renderLearn();
    } else if (currentTab === 'habits') {
      renderHabits();
    }
  }

  // ==========================================
  // VIEW 1: HOME (Inicio)
  // ==========================================
  function renderHome() {
    const activeAnchor =
      window.MEDIT_DATA.HABIT_ANCHORS.find((a) => a.id === state.activeAnchorId) ||
      window.MEDIT_DATA.HABIT_ANCHORS[0];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isDoneToday = state.lastActiveDate === todayStr;

    mainContent.innerHTML = `
      <div class="space-y-5 animate-fade-in pb-20">
        <!-- Hero Card -->
        <div class="bg-gradient-to-br from-[#0e172a] via-[#0b101e] to-[#080d17] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
          <div class="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div class="relative z-10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/30">
                Ciencia & Micro-Hábitos
              </span>
              <span class="text-xs text-slate-400">Sin culpas · Alta Adherencia</span>
            </div>

            <h2 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              ${isDoneToday ? '¡Objetivo de hoy completado!' : 'Tu momento de calma hoy'}
            </h2>

            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mb-5">
              ${
                isDoneToday
                  ? 'Has entrenado tu corteza prefrontal hoy. Cualquier pausa adicional es un extra para tu claridad mental.'
                  : 'Solo necesitas entre 60 segundos y 2 minutos para romper la inercia del estrés y resetear tu sistema nervioso.'
              }
            </p>

            <!-- Active Anchor Banner -->
            <div id="btn-open-anchor-modal" class="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-teal-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 group">
              <div class="flex items-center gap-3">
                <div class="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-lg group-hover:scale-105 transition-transform">
                  ${activeAnchor.icon}
                </div>
                <div>
                  <span class="text-[10px] text-teal-300 uppercase tracking-widest font-bold block">
                    Tu Anclaje Diario (Habit Stacking)
                  </span>
                  <p class="text-xs font-semibold text-white tracking-tight">
                    ${activeAnchor.title}
                  </p>
                  <p class="text-[11px] text-slate-400 line-clamp-1">${activeAnchor.cue}</p>
                </div>
              </div>
              <span class="text-xs text-teal-400 font-semibold shrink-0">Cambiar →</span>
            </div>
          </div>
        </div>

        <!-- 2 Instant Action Buttons -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Button 1: STOP 60s -->
          <div id="btn-start-stop-protocol" class="group bg-gradient-to-br from-[#12192b] to-[#0c1220] border border-slate-800 hover:border-amber-500/50 p-5 rounded-3xl shadow-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                  Prisa / Transición
                </span>
                <span class="text-xs font-mono font-bold text-slate-400">60 seg</span>
              </div>
              <h3 class="text-base font-bold text-white mb-1">Pausa S.T.O.P.</h3>
              <p class="text-xs text-slate-300 leading-relaxed mb-4">
                Stop, Take a breath, Observe, Proceed. Desconecta de la rumiación entre tareas en 1 minuto.
              </p>
            </div>
            <button class="w-full py-2.5 rounded-xl bg-amber-500/20 group-hover:bg-amber-400 text-amber-200 group-hover:text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
              ▶ Iniciar Protocolo S.T.O.P.
            </button>
          </div>

          <!-- Button 2: Suspiro Fisiológico Stanford -->
          <div id="btn-start-sigh-protocol" class="group bg-gradient-to-br from-[#0e1b29] to-[#0a121d] border border-slate-800 hover:border-cyan-500/50 p-5 rounded-3xl shadow-lg cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                  Stanford Medicine
                </span>
                <span class="text-xs font-mono font-bold text-slate-400">90 seg</span>
              </div>
              <h3 class="text-base font-bold text-white mb-1">Suspiro Fisiológico</h3>
              <p class="text-xs text-slate-300 leading-relaxed mb-4">
                Doble inhalación nasal + exhalación prolongada. Baja el ritmo cardíaco de golpe ante estrés agudo.
              </p>
            </div>
            <button class="w-full py-2.5 rounded-xl bg-cyan-500/20 group-hover:bg-cyan-400 text-cyan-200 group-hover:text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
              🌬️ Respirar Ahora
            </button>
          </div>
        </div>

        <!-- Presets Grid: Including 10m, 12m, 15m -->
        <div class="bg-[#0e1422] border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-white tracking-tight">Micro & Macro Sesiones con Cuenco Tibetano</h3>
              <p class="text-xs text-slate-400">Desde dosis de 1 minuto hasta el umbral neuroprotector de 12-15 min</p>
            </div>
            <button id="btn-go-to-timer" class="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1">
              Personalizar →
            </button>
          </div>

          <!-- Micro Doses (1m to 5m) -->
          <div class="grid grid-cols-4 gap-2 pt-1">
            ${[
              { sec: 60, l: '1 min', tag: 'Tiny' },
              { sec: 120, l: '2 min', tag: 'Base' },
              { sec: 180, l: '3 min', tag: 'Pausa' },
              { sec: 300, l: '5 min', tag: 'Recarga' }
            ].map(item => `
              <button data-seconds="${item.sec}" class="btn-quick-timer p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 hover:bg-teal-500/10 text-center transition-all group">
                <span class="text-base font-black font-mono text-white group-hover:text-teal-300 block mb-0.5">${item.l}</span>
                <span class="text-[10px] text-slate-400 truncate block">${item.tag}</span>
              </button>
            `).join('')}
          </div>

          <!-- Deeper 10-15 Min Doses (New Amishi Jha & NSDR) -->
          <div class="pt-2 border-t border-slate-800/80">
            <span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Sesiones de 10 a 15 Minutos (Neuroprotección Cognitiva)
            </span>
            <div class="grid grid-cols-3 gap-2">
              <button data-seconds="600" class="btn-quick-timer p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-left transition-all">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-black font-mono text-white">10 min</span>
                  <span class="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">Reset</span>
                </div>
                <p class="text-[10px] text-slate-400 line-clamp-1">Atención dual y foco</p>
              </button>

              <button data-seconds="720" class="btn-quick-timer p-3 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/40 hover:border-teal-400 text-left transition-all shadow-md">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-black font-mono text-teal-300">12 min</span>
                  <span class="text-[9px] px-1.5 py-0.5 rounded bg-teal-400 text-slate-950 font-bold">Jha ★</span>
                </div>
                <p class="text-[10px] text-slate-300 line-clamp-1">Umbral anti-burnout</p>
              </button>

              <button data-seconds="900" class="btn-quick-timer p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-500/10 text-left transition-all">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-black font-mono text-white">15 min</span>
                  <span class="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">NSDR</span>
                </div>
                <p class="text-[10px] text-slate-400 line-clamp-1">Dopamina y descanso</p>
              </button>
            </div>
          </div>
        </div>

        <!-- Ambient Noise Toggle Widget -->
        <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-lg">
              🌊
            </div>
            <div>
              <span class="text-xs font-bold text-white block">Ruido Marrón de Concentración</span>
              <span class="text-[11px] text-slate-400">Aísla ruidos de la oficina y frena el parloteo mental</span>
            </div>
          </div>

          <button id="btn-toggle-ambient" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            state.ambientType !== 'none'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
          }">
            ${state.ambientType !== 'none' ? 'Activo (Apagar)' : 'Encender'}
          </button>
        </div>

        <!-- Daily Science Insight -->
        <div id="btn-read-science-today" class="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-slate-900/80 to-indigo-500/10 border border-teal-500/20 hover:border-teal-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 group">
          <div>
            <span class="text-[10px] text-teal-400 uppercase tracking-wider font-bold block mb-0.5">
              Neuro-Píldora: Dra. Amishi Jha
            </span>
            <p class="text-xs text-slate-200 font-medium">
              "12 minutos diarios de mindfulness es la dosis mínima demostrada para blindar tu memoria de trabajo bajo estrés intenso."
            </p>
          </div>
          <span class="text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all text-sm shrink-0">→</span>
        </div>
      </div>
    `;

    // Hook listeners
    document.getElementById('btn-open-anchor-modal')?.addEventListener('click', openAnchorModal);
    document.getElementById('btn-start-stop-protocol')?.addEventListener('click', startStopModal);
    document.getElementById('btn-start-sigh-protocol')?.addEventListener('click', () => {
      breathState.protocolId = 'cyclic-sighing';
      switchTab('breathe');
    });
    document.getElementById('btn-go-to-timer')?.addEventListener('click', () => switchTab('timer'));
    document.getElementById('btn-read-science-today')?.addEventListener('click', () => switchTab('learn'));

    document.querySelectorAll('.btn-quick-timer').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sec = parseInt(btn.dataset.seconds, 10);
        timerState.selectedSeconds = sec;
        timerState.remainingSeconds = sec;
        switchTab('timer');
      });
    });

    document.getElementById('btn-toggle-ambient')?.addEventListener('click', () => {
      if (state.ambientType !== 'none') {
        state.ambientType = 'none';
        window.soundEngine.stopAmbient();
      } else {
        state.ambientType = 'brown-noise';
        window.soundEngine.startAmbient('brown-noise', state.ambientVolume);
      }
      window.habitStorage.save(state);
      renderHome();
    });
  }

  // ==========================================
  // VIEW 2: BREATH VISUALIZER (Respirar)
  // ==========================================
  function renderBreathe() {
    const protocol =
      window.MEDIT_DATA.BREATH_PROTOCOLS.find((p) => p.id === breathState.protocolId) ||
      window.MEDIT_DATA.BREATH_PROTOCOLS[0];

    const currentStep = protocol.steps[breathState.currentStepIdx];
    const maxCycles = protocol.defaultCycles;

    // Calculate dynamic scaling for smooth CSS transform
    let targetScale = 0.6;
    const progressRatio = Math.min(breathState.stepElapsed / currentStep.duration, 1);
    if (currentStep.action === 'inhale') {
      targetScale = 0.6 + progressRatio * 0.35;
    } else if (currentStep.action === 'topInhale') {
      targetScale = 0.95 + progressRatio * 0.08;
    } else if (currentStep.action === 'hold') {
      targetScale = 1.0;
    } else if (currentStep.action === 'exhale') {
      targetScale = 1.0 - progressRatio * 0.4;
    }

    mainContent.innerHTML = `
      <div class="space-y-5 animate-fade-in pb-20">
        <!-- Header -->
        <div class="text-center space-y-1">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
            <span>🌬️ Regulación Fisiológica Directa</span>
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-white">Respiración Guiada</h2>
          <p class="text-xs text-slate-400 max-w-md mx-auto">
            Estimula el nervio vago y resetea tu ritmo biológico en pocos ciclos.
          </p>
        </div>

        <!-- Protocol Tabs -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          ${window.MEDIT_DATA.BREATH_PROTOCOLS.map((p) => {
            const isSel = p.id === breathState.protocolId;
            return `
              <button data-protocol="${p.id}" class="btn-select-protocol p-3 rounded-2xl border text-left transition-all ${
                isSel
                  ? 'bg-teal-500/15 border-teal-500/50 shadow-md text-white'
                  : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:bg-slate-800/60'
              }">
                <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  isSel ? 'bg-teal-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                }">${p.badge}</span>
                <p class="text-xs font-bold leading-tight mt-1 ${isSel ? 'text-white' : 'text-slate-300'}">
                  ${p.name.split('(')[0]}
                </p>
                <p class="text-[10px] text-slate-500 truncate mt-0.5">${p.tagline}</p>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Breathing Orb Visualizer Card -->
        <div class="relative bg-gradient-to-b from-[#0e1526] to-[#090d16] border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center shadow-xl overflow-hidden min-h-[380px]">
          <!-- Ambient Glow -->
          <div class="absolute w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none transition-all duration-500" style="transform: scale(${targetScale * 1.3});"></div>

          <!-- Top status bar -->
          <div class="w-full flex items-center justify-between z-10 mb-2">
            <span class="text-xs font-medium text-slate-400">
              Ciclo <strong class="text-white">${breathState.currentCycle}</strong> de ${maxCycles}
            </span>
            <button id="btn-toggle-breath-audio" class="p-1.5 rounded-xl bg-slate-800/80 text-xs text-slate-300">
              ${breathState.soundCues ? '🔊 Tono activo' : '🔇 Silencio'}
            </button>
          </div>

          <!-- Central Expanding Rings -->
          <div class="relative w-64 h-64 flex items-center justify-center my-4 z-10">
            <div class="absolute rounded-full border border-teal-500/20 transition-transform duration-200" style="width: 100%; height: 100%; transform: scale(${targetScale});"></div>
            <div class="absolute rounded-full bg-teal-400/20 blur-md transition-transform duration-200" style="width: 85%; height: 85%; transform: scale(${targetScale * 0.95});"></div>

            <div class="w-44 h-44 rounded-full flex flex-col items-center justify-center text-center p-4 border border-teal-400/30 bg-gradient-to-b from-slate-900/90 to-[#080d1a]/90 backdrop-blur-md shadow-2xl transition-transform duration-200" style="transform: scale(${targetScale});">
              ${
                !breathState.isCompleted
                  ? `
                <span class="text-[11px] font-semibold uppercase tracking-widest text-teal-400 mb-1">
                  ${
                    currentStep.action === 'inhale'
                      ? 'Inhala'
                      : currentStep.action === 'topInhale'
                      ? '+ Inhala extra'
                      : currentStep.action === 'hold'
                      ? 'Sostén'
                      : 'Exhala'
                  }
                </span>
                <h4 class="text-xl font-extrabold text-white tracking-tight leading-tight mb-1">
                  ${currentStep.label}
                </h4>
                <span class="font-mono text-sm text-slate-400 font-medium">
                  ${Math.max(0, currentStep.duration - breathState.stepElapsed).toFixed(1)}s
                </span>
              `
                  : `
                <span class="text-2xl mb-1">✓</span>
                <span class="text-xs font-bold text-white">¡Completado!</span>
              `
              }
            </div>
          </div>

          <!-- Step Instruction -->
          <p class="text-xs text-slate-400 text-center max-w-sm z-10 h-8 flex items-center justify-center mb-5">
            ${breathState.isRunning ? currentStep.tip : 'Pulsa comenzar para iniciar la sincronización'}
          </p>

          <!-- Buttons -->
          <div class="flex items-center gap-4 z-10">
            <button id="btn-reset-breath" class="p-3 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-700" title="Reiniciar">
              ↺
            </button>
            <button id="btn-toggle-breath-run" class="px-8 py-3.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-teal-500/25 hover:brightness-110 active:scale-95 transition-all">
              ${breathState.isRunning ? 'Pausar' : breathState.isCompleted ? 'Repetir' : 'Comenzar'}
            </button>
          </div>
        </div>

        <!-- Science Explanation Pill -->
        <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-1.5 text-xs">
          <div class="font-bold text-teal-300">Evidencia: ${protocol.name}</div>
          <p class="text-slate-300 leading-relaxed">${protocol.science}</p>
          <p class="text-slate-400 pt-0.5"><strong class="text-slate-300">Ideal para:</strong> ${protocol.idealFor}</p>
        </div>
      </div>
    `;

    // Hook listeners
    document.querySelectorAll('.btn-select-protocol').forEach((btn) => {
      btn.addEventListener('click', () => {
        stopBreathLoop();
        breathState.protocolId = btn.dataset.protocol;
        breathState.currentCycle = 1;
        breathState.currentStepIdx = 0;
        breathState.stepElapsed = 0;
        breathState.totalElapsed = 0;
        breathState.isCompleted = false;
        breathState.isRunning = false;
        renderBreathe();
      });
    });

    document.getElementById('btn-toggle-breath-audio')?.addEventListener('click', () => {
      breathState.soundCues = !breathState.soundCues;
      renderBreathe();
    });

    document.getElementById('btn-reset-breath')?.addEventListener('click', () => {
      stopBreathLoop();
      breathState.currentCycle = 1;
      breathState.currentStepIdx = 0;
      breathState.stepElapsed = 0;
      breathState.totalElapsed = 0;
      breathState.isCompleted = false;
      breathState.isRunning = false;
      renderBreathe();
    });

    document.getElementById('btn-toggle-breath-run')?.addEventListener('click', () => {
      if (breathState.isRunning) {
        stopBreathLoop();
        breathState.isRunning = false;
        renderBreathe();
      } else {
        if (breathState.isCompleted) {
          breathState.currentCycle = 1;
          breathState.currentStepIdx = 0;
          breathState.stepElapsed = 0;
          breathState.totalElapsed = 0;
          breathState.isCompleted = false;
        }
        breathState.isRunning = true;
        if (breathState.soundCues) {
          window.soundEngine.playBreathCue(true, state.soundVolume);
        }
        startBreathLoop();
      }
    });
  }

  function startBreathLoop() {
    stopBreathLoop();
    const protocol =
      window.MEDIT_DATA.BREATH_PROTOCOLS.find((p) => p.id === breathState.protocolId) ||
      window.MEDIT_DATA.BREATH_PROTOCOLS[0];

    breathState.timerId = setInterval(() => {
      breathState.totalElapsed += 0.1;
      breathState.stepElapsed += 0.1;

      const currentStep = protocol.steps[breathState.currentStepIdx];
      if (breathState.stepElapsed >= currentStep.duration) {
        breathState.stepElapsed = 0;

        if (breathState.currentStepIdx < protocol.steps.length - 1) {
          breathState.currentStepIdx += 1;
          if (breathState.soundCues) {
            const isHigh = protocol.steps[breathState.currentStepIdx].action.includes('inhale');
            window.soundEngine.playBreathCue(isHigh, state.soundVolume);
          }
        } else {
          // Next cycle
          if (breathState.currentCycle < protocol.defaultCycles) {
            breathState.currentCycle += 1;
            breathState.currentStepIdx = 0;
            if (breathState.soundCues) {
              window.soundEngine.playBreathCue(true, state.soundVolume);
            }
          } else {
            // Finished!
            stopBreathLoop();
            breathState.isCompleted = true;
            breathState.isRunning = false;
            window.soundEngine.playBell(state.bellTone, state.soundVolume);

            if (typeof window.confetti === 'function') {
              window.confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
            }

            const { nextState } = window.habitStorage.recordSession(state, {
              durationSeconds: breathState.totalElapsed,
              type: 'breathe',
              techniqueName: protocol.name,
              ratingAfter: 5
            });
            state = nextState;
            updateHeader();
          }
        }
      }

      // Re-render only if current tab is breathe
      if (currentTab === 'breathe') {
        renderBreathe();
      }
    }, 100);
  }

  function stopBreathLoop() {
    if (breathState.timerId) {
      clearInterval(breathState.timerId);
      breathState.timerId = null;
    }
  }

  // ==========================================
  // VIEW 3: ZEN TIMER (Temporizador con 10-15m)
  // ==========================================
  function renderTimer() {
    // If active fullscreen session
    if (timerState.isActive) {
      renderTimerFullscreen();
      return;
    }

    mainContent.innerHTML = `
      <div class="space-y-6 animate-fade-in pb-20">
        <!-- Header -->
        <div class="text-center space-y-1">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
            <span>🔔 Espacio de Meditación Silenciosa</span>
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-white">Temporizador Zen</h2>
          <p class="text-xs text-slate-400 max-w-md mx-auto">
            Desde micro-pausas de 1-3 minutos hasta sesiones completas de 10-15 min con fases de atención guiadas.
          </p>
        </div>

        <!-- Presets Configuration Card -->
        <div class="bg-[#0e1422] border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-6">
          <!-- Section 1: Micro Presets (1 to 5 min) -->
          <div>
            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
              Micro-Dosis (Construcción del Hábito)
            </label>
            <div class="grid grid-cols-4 gap-2">
              ${[
                { sec: 60, label: '1 min', tag: 'Tiny Habit' },
                { sec: 120, label: '2 min', tag: 'Dosis Base' },
                { sec: 180, label: '3 min', tag: 'Pausa Zen' },
                { sec: 300, label: '5 min', tag: 'Recarga' }
              ].map((p) => {
                const isSel = timerState.selectedSeconds === p.sec;
                return `
                  <button data-sec="${p.sec}" class="btn-timer-preset p-3 rounded-2xl border text-center transition-all ${
                    isSel
                      ? 'bg-teal-500/20 border-teal-500/60 shadow-lg text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }">
                    <p class="text-base font-extrabold font-mono leading-none mb-1">${p.label}</p>
                    <p class="text-[10px] text-slate-400 truncate">${p.tag}</p>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Section 2: Deep 10-15 Min Presets (Amishi Jha & NSDR) -->
          <div class="pt-3 border-t border-slate-800/80">
            <div class="flex items-center justify-between mb-2.5">
              <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Sesiones Profundas de 10 a 15 Minutos (Neuroprotección)
              </label>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Peak Mind & NSDR
              </span>
            </div>

            <div class="grid grid-cols-3 gap-2.5">
              ${[
                { sec: 600, label: '10 min', title: 'Reset Profundo', desc: 'Atención dual & calma' },
                { sec: 720, label: '12 min', title: 'Umbral Amishi Jha', desc: 'Inoculación anti-burnout' },
                { sec: 900, label: '15 min', title: 'NSDR Stanford', desc: 'Restauración de dopamina' }
              ].map((p) => {
                const isSel = timerState.selectedSeconds === p.sec;
                return `
                  <button data-sec="${p.sec}" class="btn-timer-preset p-3.5 rounded-2xl border text-left transition-all ${
                    isSel
                      ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900 border-teal-400/70 shadow-lg text-white'
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-base font-black font-mono ${isSel ? 'text-teal-300' : 'text-white'}">${p.label}</span>
                      ${p.sec === 720 ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-teal-400 text-slate-950 font-bold">Clave</span>' : ''}
                    </div>
                    <p class="text-xs font-bold leading-tight text-slate-200">${p.title}</p>
                    <p class="text-[10px] text-slate-400 mt-0.5 line-clamp-1">${p.desc}</p>
                  </button>
                `;
              }).join('')}
            </div>

            ${
              timerState.selectedSeconds >= 600
                ? `
              <div class="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-[11px] text-indigo-300 leading-relaxed">
                💡 <strong>Estructura guiada de 3 fases:</strong> Campanadas a los 5 min (cambio a Foco Amplio) y a los 10 min (descanso en presencia lúcida).
              </div>
            `
                : ''
            }
          </div>

          <!-- Big Action Button -->
          <button id="btn-start-timer-session" class="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-400 text-slate-950 font-bold text-base shadow-xl shadow-teal-500/25 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            ▶ Comenzar Sesión (${Math.round(timerState.selectedSeconds / 60)} min)
          </button>
        </div>

        <!-- Practical Tip -->
        <div class="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
          <span class="text-teal-400 text-lg">💡</span>
          <div>
            <strong class="text-white">Para días con agenda apretada:</strong> Comienza con 1 o 2 minutos para asegurar tu racha. Cuando tengas 12-15 minutos libres tras comer o al terminar la jornada, realiza una sesión profunda para renovar tu agilidad mental.
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('.btn-timer-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sec = parseInt(btn.dataset.sec, 10);
        timerState.selectedSeconds = sec;
        timerState.remainingSeconds = sec;
        renderTimer();
      });
    });

    document.getElementById('btn-start-timer-session')?.addEventListener('click', () => {
      timerState.isActive = true;
      timerState.isPaused = false;
      timerState.isFinished = false;
      timerState.remainingSeconds = timerState.selectedSeconds;

      // Play bell & ambient
      window.soundEngine.playBell(state.bellTone, state.soundVolume);
      if (state.ambientType !== 'none') {
        window.soundEngine.startAmbient(state.ambientType, state.ambientVolume);
      }

      startTimerLoop();
      renderTimer();
    });
  }

  function renderTimerFullscreen() {
    const formatTime = (secs) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const progressPercent =
      ((timerState.selectedSeconds - timerState.remainingSeconds) / timerState.selectedSeconds) * 100;

    // Guidance text for longer 10-15 min sessions
    let phaseTip = 'Si tu mente se dispersa, nótalo con amabilidad y regresa a la sensación del aire.';
    if (timerState.selectedSeconds >= 600) {
      const elapsed = timerState.selectedSeconds - timerState.remainingSeconds;
      if (elapsed < 300) {
        phaseTip = 'Fase 1 (Linterna): Atención estrecha y concentrada en tu respiración.';
      } else if (elapsed < 600) {
        phaseTip = 'Fase 2 (Foco Amplio): Abre la conciencia a todo el cuerpo, sonidos y pensamientos sin juzgar.';
      } else {
        phaseTip = 'Fase 3 (Presencia): Descanso en la quietud lúcida y claridad interior.';
      }
    }

    mainContent.innerHTML = `
      <div class="fixed inset-0 z-50 bg-[#060911] text-white flex flex-col justify-between p-6 sm:p-10 select-none animate-fade-in safe-pt safe-pb">
        <!-- Top Controls -->
        <div class="flex items-center justify-between z-10">
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
            <span>Meditación en curso</span>
          </div>

          <div class="flex items-center gap-2">
            <button id="btn-toggle-clock" class="p-2.5 rounded-full bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 transition-colors">
              ${timerState.hideClock ? '👁️' : '🕶️'}
            </button>
            <button id="btn-cancel-timer" class="p-2.5 rounded-full bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 transition-colors">
              ✕
            </button>
          </div>
        </div>

        <!-- Center: Orb or Reflection -->
        ${
          !timerState.isFinished
            ? `
          <div class="flex flex-col items-center justify-center my-auto relative">
            <div class="absolute w-72 h-72 sm:w-88 sm:h-88 rounded-full bg-teal-500/10 blur-3xl animate-breath-glow pointer-events-none"></div>

            <div class="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              <svg class="w-full h-full -rotate-90">
                <circle cx="50%" cy="50%" r="45%" class="stroke-slate-800/80 fill-none" stroke-width="4"></circle>
                <circle cx="50%" cy="50%" r="45%" class="stroke-teal-400 fill-none transition-all duration-1000 ease-linear" stroke-width="4" stroke-dasharray="283%" stroke-dashoffset="${
                  283 - (283 * progressPercent) / 100
                }%" stroke-linecap="round"></circle>
              </svg>

              <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                ${
                  !timerState.hideClock
                    ? `
                  <span class="font-mono text-5xl font-extralight tracking-tight text-white mb-1">
                    ${formatTime(timerState.remainingSeconds)}
                  </span>
                `
                    : `
                  <div class="w-12 h-12 rounded-full border border-teal-400/40 animate-ping opacity-30 mb-2"></div>
                  <span class="text-xs text-teal-400 uppercase tracking-widest font-medium">Presencia</span>
                `
                }
                <span class="text-xs text-slate-400 font-light">
                  ${timerState.isPaused ? 'En pausa' : 'Respira con calma'}
                </span>
              </div>
            </div>

            <p class="text-xs text-slate-400 text-center mt-6 max-w-sm font-light leading-relaxed">
              ${phaseTip}
            </p>
          </div>
        `
            : `
          <!-- Finished Reflection Modal -->
          <div class="max-w-md w-full mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center my-auto shadow-2xl backdrop-blur-md animate-fade-in">
            <div class="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400 text-2xl font-bold">
              ✓
            </div>
            <h3 class="text-2xl font-bold text-white mb-1">Sesión Completada</h3>
            <p class="text-xs text-teal-300 font-medium mb-5">
              +${Math.round(timerState.selectedSeconds / 60)} min para tu bienestar
            </p>

            <div class="space-y-2 mb-5">
              <label class="text-xs text-slate-400">¿Cómo te sientes ahora?</label>
              <div class="flex justify-center gap-3">
                ${[
                  { val: 1, e: '😴', l: 'Cansado' },
                  { val: 2, e: '😐', l: 'Neutro' },
                  { val: 3, e: '🙂', l: 'Calmado' },
                  { val: 4, e: '😌', l: 'En paz' },
                  { val: 5, e: '⚡', l: 'Renovado' }
                ].map((item) => `
                  <button data-val="${item.val}" class="btn-rate-mood flex flex-col items-center p-2 rounded-xl border transition-all ${
                    timerState.ratingAfter === item.val
                      ? 'bg-teal-500/20 border-teal-500/60 scale-105'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                  }">
                    <span class="text-2xl">${item.e}</span>
                    <span class="text-[10px] mt-1">${item.l}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <input id="input-session-note" type="text" placeholder="Nota personal (opcional)" value="${timerState.note}" class="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400 mb-5" />

            <button id="btn-save-session-reflection" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-teal-500/25 active:scale-95 transition-all">
              Guardar y Finalizar
            </button>
          </div>
        `
        }

        <!-- Bottom Controls -->
        ${
          !timerState.isFinished
            ? `
          <div class="flex items-center justify-center gap-4 z-10">
            <button id="btn-toggle-pause" class="px-8 py-3 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium text-sm flex items-center gap-2 transition-colors">
              ${timerState.isPaused ? '▶ Reanudar' : '⏸ Pausar'}
            </button>
          </div>
        `
            : ''
        }
      </div>
    `;

    document.getElementById('btn-toggle-clock')?.addEventListener('click', () => {
      timerState.hideClock = !timerState.hideClock;
      renderTimerFullscreen();
    });

    document.getElementById('btn-cancel-timer')?.addEventListener('click', () => {
      stopTimerLoop();
      timerState.isActive = false;
      timerState.isPaused = false;
      window.soundEngine.stopAmbient();
      renderTimer();
    });

    document.getElementById('btn-toggle-pause')?.addEventListener('click', () => {
      timerState.isPaused = !timerState.isPaused;
      renderTimerFullscreen();
    });

    document.querySelectorAll('.btn-rate-mood').forEach((btn) => {
      btn.addEventListener('click', () => {
        timerState.ratingAfter = parseInt(btn.dataset.val, 10);
        renderTimerFullscreen();
      });
    });

    document.getElementById('btn-save-session-reflection')?.addEventListener('click', () => {
      const noteInput = document.getElementById('input-session-note');
      const noteVal = noteInput ? noteInput.value : '';

      const { nextState } = window.habitStorage.recordSession(state, {
        durationSeconds: timerState.selectedSeconds,
        type: 'timer',
        techniqueName: `Temporizador Zen (${Math.round(timerState.selectedSeconds / 60)} min)`,
        ratingAfter: timerState.ratingAfter,
        note: noteVal
      });
      state = nextState;
      updateHeader();

      timerState.isActive = false;
      timerState.isFinished = false;
      timerState.note = '';
      renderTimer();
    });
  }

  function startTimerLoop() {
    stopTimerLoop();
    timerState.timerId = setInterval(() => {
      if (timerState.isPaused || timerState.isFinished) return;

      timerState.remainingSeconds -= 1;
      const elapsed = timerState.selectedSeconds - timerState.remainingSeconds;

      // Interval chimes at 5 min and 10 min for deeper sessions
      if (timerState.selectedSeconds >= 600) {
        if (elapsed === 300) {
          // 5 min mark: Switch to Open Monitoring
          window.soundEngine.playBell('zen', state.soundVolume * 0.7);
        } else if (elapsed === 600) {
          // 10 min mark: Switch to Integrated Presence
          window.soundEngine.playBell('zen', state.soundVolume * 0.7);
        }
      }

      if (timerState.remainingSeconds <= 0) {
        // Completed!
        stopTimerLoop();
        timerState.isFinished = true;
        window.soundEngine.stopAmbient();
        window.soundEngine.playBell(state.bellTone, state.soundVolume);

        if (typeof window.confetti === 'function') {
          window.confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
        }
      }

      if (currentTab === 'timer' && timerState.isActive) {
        renderTimerFullscreen();
      }
    }, 1000);
  }

  function stopTimerLoop() {
    if (timerState.timerId) {
      clearInterval(timerState.timerId);
      timerState.timerId = null;
    }
  }

  // ==========================================
  // VIEW 4: LEARN (Aprender sin Mitos)
  // ==========================================
  function renderLearn() {
    mainContent.innerHTML = `
      <div class="space-y-6 animate-fade-in pb-20">
        <!-- Header -->
        <div class="text-center space-y-1">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
            <span>📚 Neurociencia en Píldoras (&lt; 2 min)</span>
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-white">Aprender sin Mitos</h2>
          <p class="text-xs text-slate-400 max-w-md mx-auto">
            Fundamentos científicos rigurosos para desmitificar la práctica y maximizar tu adherencia.
          </p>
        </div>

        <!-- Articles Accordion -->
        <div class="space-y-3">
          ${window.MEDIT_DATA.SCIENCE_ARTICLES.map((art, idx) => {
            const isRead = state.completedArticleIds.includes(art.id);
            return `
              <div class="article-card rounded-2xl border border-slate-800/90 bg-[#0e1422] overflow-hidden transition-all">
                <div class="article-header p-4 sm:p-5 cursor-pointer flex items-start justify-between gap-3">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1.5">
                      <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/15 text-teal-400 border border-teal-500/20">
                        ${art.badge}
                      </span>
                      <span class="text-[11px] text-slate-400">⏱ ${art.readTime}</span>
                      ${isRead ? '<span class="text-[10px] text-emerald-400 font-semibold">✓ Leído</span>' : ''}
                    </div>
                    <h3 class="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                      ${art.title}
                    </h3>
                    <p class="text-xs text-slate-400 mt-1 line-clamp-1">${art.hook}</p>
                  </div>
                  <button class="text-slate-400 text-sm">▼</button>
                </div>

                <div class="article-body hidden px-4 pb-5 sm:px-5 sm:pb-6 pt-2 border-t border-slate-800/80 space-y-4">
                  <div class="p-4 rounded-xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-indigo-500/10 border border-teal-500/30">
                    <span class="text-[10px] font-bold text-teal-300 uppercase tracking-wider block mb-1">Idea Central</span>
                    <p class="text-xs text-slate-200 leading-relaxed">${art.coreInsight}</p>
                  </div>

                  <div class="space-y-3 pt-1 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    ${art.content.map((c) => `
                      <div>
                        <h4 class="font-bold text-white mb-1">${c.subtitle}</h4>
                        <p>${c.text}</p>
                      </div>
                    `).join('')}
                  </div>

                  <div class="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-emerald-300">
                    <strong class="block text-[10px] uppercase tracking-wider mb-0.5 text-emerald-400">⚡ Paso Práctico</strong>
                    <p class="text-slate-200">${art.actionable}</p>
                  </div>

                  <p class="text-[10px] text-slate-500 font-mono italic">Fuente: ${art.reference}</p>

                  <button data-id="${art.id}" class="btn-toggle-read w-full py-2.5 rounded-xl text-xs font-semibold border ${
                    isRead
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                  }">
                    ${isRead ? 'Marcado como leído (Desmarcar)' : 'Comprendido · Marcar como leído'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- FAQs -->
        <div class="pt-4 border-t border-slate-800/80 space-y-3">
          <h3 class="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <span>❓ Preguntas Frecuentes de Principiantes</span>
          </h3>

          <div class="space-y-2">
            ${window.MEDIT_DATA.FAQS.map((faq) => `
              <div class="faq-item rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <button class="faq-header w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-medium text-slate-200">
                  <span>${faq.q}</span>
                  <span class="text-slate-500">▼</span>
                </button>
                <div class="faq-body hidden px-3.5 pb-3.5 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 bg-[#090d16]">
                  ${faq.a}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Article accordion toggles
    document.querySelectorAll('.article-header').forEach((hdr) => {
      hdr.addEventListener('click', () => {
        const body = hdr.nextElementSibling;
        body.classList.toggle('hidden');
      });
    });

    document.querySelectorAll('.btn-toggle-read').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (state.completedArticleIds.includes(id)) {
          state.completedArticleIds = state.completedArticleIds.filter((x) => x !== id);
        } else {
          state.completedArticleIds.push(id);
        }
        window.habitStorage.save(state);
        renderLearn();
      });
    });

    // FAQ toggles
    document.querySelectorAll('.faq-header').forEach((hdr) => {
      hdr.addEventListener('click', () => {
        const body = hdr.nextElementSibling;
        body.classList.toggle('hidden');
      });
    });
  }

  // ==========================================
  // VIEW 5: HABITS (Hábitos & Progreso)
  // ==========================================
  function renderHabits() {
    const activeAnchor =
      window.MEDIT_DATA.HABIT_ANCHORS.find((a) => a.id === state.activeAnchorId) ||
      window.MEDIT_DATA.HABIT_ANCHORS[0];

    const totalMinutes = Math.round(state.totalSeconds / 60);

    mainContent.innerHTML = `
      <div class="space-y-6 animate-fade-in pb-20">
        <!-- Header -->
        <div class="text-center space-y-1">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <span>🔥 Ciencia del Hábito (B.J. Fogg)</span>
          </div>
          <h2 class="text-2xl font-bold tracking-tight text-white">Mi Práctica & Progreso</h2>
          <p class="text-xs text-slate-400 max-w-md mx-auto">
            Racha "Cero Culpas": un solo minuto al día consolida tu circuito neuronal de calma.
          </p>
        </div>

        <!-- 3 Primary Metrics -->
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-[#0e1422] border border-slate-800 p-4 rounded-2xl text-center">
            <span class="text-xl mb-1 block">🔥</span>
            <span class="text-2xl font-black font-mono text-white block">${state.streakDays}</span>
            <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Días Racha</span>
          </div>

          <div class="bg-[#0e1422] border border-slate-800 p-4 rounded-2xl text-center">
            <span class="text-xl mb-1 block">⏱</span>
            <span class="text-2xl font-black font-mono text-white block">${totalMinutes}</span>
            <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Minutos Totales</span>
          </div>

          <div class="bg-[#0e1422] border border-slate-800 p-4 rounded-2xl text-center">
            <span class="text-xl mb-1 block">🏆</span>
            <span class="text-2xl font-black font-mono text-white block">${state.totalSessions}</span>
            <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pausas Hechas</span>
          </div>
        </div>

        <!-- Active Habit Stacking Card -->
        <div class="bg-gradient-to-br from-[#0e172a] to-[#080d1a] border border-teal-500/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div class="flex items-start justify-between mb-3">
            <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/30">
              Anclaje Activo (Habit Stacking)
            </span>
            <button id="btn-change-anchor" class="text-xs text-teal-400 hover:text-teal-300 font-semibold">
              Cambiar →
            </button>
          </div>

          <div class="flex items-start gap-4">
            <div class="p-3 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-2xl shrink-0">
              ${activeAnchor.icon}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-base font-bold text-white mb-1">${activeAnchor.title}</h3>
              <p class="text-xs text-teal-300 font-medium mb-1">Disparador: ${activeAnchor.cue}</p>
              <p class="text-xs text-slate-300 leading-relaxed">${activeAnchor.action}</p>
            </div>
          </div>
        </div>

        <!-- History of Sessions -->
        <div class="bg-[#0e1422] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <span>📅 Historial de Práctica</span>
            </h3>
            <span class="text-xs text-slate-400 font-mono">${state.sessions.length} registros</span>
          </div>

          ${
            state.sessions.length === 0
              ? '<div class="text-center py-8 text-slate-500 text-xs">Aún no hay sesiones registradas. ¡Haz tu primera micro-pausa hoy!</div>'
              : `
            <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
              ${state.sessions.map((sess) => `
                <div class="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-white">${sess.techniqueName}</span>
                      <span class="text-[10px] text-slate-400 font-mono">${sess.durationSeconds}s</span>
                    </div>
                    <span class="text-[11px] text-slate-400">
                      ${new Date(sess.timestamp).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    ${sess.ratingAfter ? `<span class="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[11px]">Estado: ${sess.ratingAfter}/5</span>` : ''}
                    <span class="text-emerald-400">✓</span>
                  </div>
                </div>
              `).join('')}
            </div>
          `
          }
        </div>

        <!-- Privacy & Backup Actions -->
        <div class="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            <span class="font-semibold text-slate-300 block">Privacidad Total (100% Local)</span>
            <span>Tus datos se guardan solo en tu dispositivo. Puedes exportarlos o restaurarlos en cualquier momento.</span>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button id="btn-export-json" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 text-xs font-medium">
              Exportar JSON
            </button>
            <label class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 text-xs font-medium cursor-pointer">
              Importar
              <input id="input-import-file" type="file" accept=".json" class="hidden" />
            </label>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-change-anchor')?.addEventListener('click', openAnchorModal);

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      const dataStr = window.habitStorage.exportData(state);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medit_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('input-import-file')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const imported = window.habitStorage.importData(event.target.result);
        if (imported) {
          state = imported;
          updateHeader();
          renderHabits();
          alert('¡Datos restaurados con éxito!');
        } else {
          alert('Archivo de copia no válido.');
        }
      };
      reader.readAsText(file);
    });
  }

  // ==========================================
  // MODALS
  // ==========================================

  // S.T.O.P. Modal (60 seconds)
  function startStopModal() {
    stopState.isOpen = true;
    stopState.stepIdx = 0;
    stopState.remaining = STOP_STEPS[0].duration;
    stopState.isRunning = true;
    stopState.isFinished = false;

    window.soundEngine.playBell(state.bellTone, state.soundVolume);
    stopModalEl.classList.remove('hidden');
    renderStopModalContent();

    if (stopState.timerId) clearInterval(stopState.timerId);
    stopState.timerId = setInterval(() => {
      if (!stopState.isRunning || stopState.isFinished) return;

      stopState.remaining -= 1;
      if (stopState.remaining <= 0) {
        if (stopState.stepIdx < STOP_STEPS.length - 1) {
          stopState.stepIdx += 1;
          stopState.remaining = STOP_STEPS[stopState.stepIdx].duration;
          window.soundEngine.playBreathCue(true, state.soundVolume);
        } else {
          // Finished S.T.O.P.!
          clearInterval(stopState.timerId);
          stopState.isFinished = true;
          stopState.isRunning = false;
          window.soundEngine.playBell(state.bellTone, state.soundVolume);

          if (typeof window.confetti === 'function') {
            window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
          }

          const { nextState } = window.habitStorage.recordSession(state, {
            durationSeconds: 60,
            type: 'stop',
            techniqueName: 'Protocolo S.T.O.P. (60s)',
            ratingAfter: 5
          });
          state = nextState;
          updateHeader();
        }
      }
      renderStopModalContent();
    }, 1000);
  }

  function renderStopModalContent() {
    const cur = STOP_STEPS[stopState.stepIdx];
    const modalBody = document.getElementById('stop-modal-body');
    if (!modalBody) return;

    if (!stopState.isFinished) {
      modalBody.innerHTML = `
        <div class="text-center py-4">
          <div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700/80 shadow-inner mb-4">
            <span class="text-4xl font-extrabold text-teal-300">${cur.letter}</span>
          </div>

          <p class="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-1">${cur.word}</p>
          <h3 class="text-xl sm:text-2xl font-bold text-white mb-3">${cur.title}</h3>
          <p class="text-sm text-slate-300 leading-relaxed max-w-md mx-auto mb-6">${cur.desc}</p>

          <div class="flex items-center justify-center gap-2 text-slate-400 text-sm mb-6">
            <span class="font-mono text-2xl font-bold text-white">${stopState.remaining}s</span>
            <span>en este paso</span>
          </div>

          <div class="flex items-center justify-center gap-3">
            <button id="btn-stop-modal-pause" class="px-5 py-2.5 rounded-2xl bg-slate-800 text-slate-200 text-sm font-medium border border-slate-700">
              ${stopState.isRunning ? '⏸ Pausar' : '▶ Continuar'}
            </button>
            <button id="btn-stop-modal-next" class="px-5 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm">
              Siguiente →
            </button>
          </div>
        </div>
      `;

      document.getElementById('btn-stop-modal-pause')?.addEventListener('click', () => {
        stopState.isRunning = !stopState.isRunning;
        renderStopModalContent();
      });

      document.getElementById('btn-stop-modal-next')?.addEventListener('click', () => {
        if (stopState.stepIdx < STOP_STEPS.length - 1) {
          stopState.stepIdx += 1;
          stopState.remaining = STOP_STEPS[stopState.stepIdx].duration;
          renderStopModalContent();
        } else {
          stopState.isFinished = true;
          renderStopModalContent();
        }
      });
    } else {
      modalBody.innerHTML = `
        <div class="text-center py-6">
          <div class="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400 text-2xl font-bold">
            ✓
          </div>
          <h3 class="text-2xl font-bold text-white mb-2">¡Pausa S.T.O.P. Completada!</h3>
          <p class="text-sm text-slate-300 max-w-sm mx-auto mb-6">
            Has roto el bucle del piloto automático. Tu sistema nervioso está más regulado y tu atención está en el presente.
          </p>
          <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 mb-6">
            ✨ 60 segundos registrados en tu racha diaria sin culpas.
          </div>
          <button id="btn-close-stop-done" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 font-bold text-sm shadow-xl active:scale-95">
            Volver a mi día con serenidad
          </button>
        </div>
      `;

      document.getElementById('btn-close-stop-done')?.addEventListener('click', () => {
        closeStopModal();
      });
    }
  }

  function closeStopModal() {
    if (stopState.timerId) clearInterval(stopState.timerId);
    stopModalEl.classList.add('hidden');
    renderView();
  }

  document.getElementById('btn-close-stop-modal')?.addEventListener('click', closeStopModal);

  // Anchor Setup Modal
  function openAnchorModal() {
    anchorModalEl.classList.remove('hidden');
    const container = document.getElementById('anchor-list-container');
    if (!container) return;

    container.innerHTML = window.MEDIT_DATA.HABIT_ANCHORS.map((anc) => {
      const isSel = anc.id === state.activeAnchorId;
      return `
        <div data-id="${anc.id}" class="btn-select-anchor p-4 rounded-2xl border transition-all cursor-pointer ${
          isSel
            ? 'bg-teal-500/15 border-teal-500/50 shadow-md text-white'
            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
        }">
          <div class="flex items-start gap-3.5">
            <span class="text-2xl">${anc.icon}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <h4 class="text-sm font-bold text-white">${anc.title}</h4>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">${anc.seconds}s</span>
              </div>
              <p class="text-xs text-teal-300 font-medium mb-1">Disparador: ${anc.cue}</p>
              <p class="text-xs text-slate-400">${anc.action}</p>
            </div>
            ${isSel ? '<span class="text-teal-400 font-bold">✓</span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.btn-select-anchor').forEach((el) => {
      el.addEventListener('click', () => {
        state.activeAnchorId = el.dataset.id;
        window.habitStorage.save(state);
        anchorModalEl.classList.add('hidden');
        renderView();
      });
    });
  }

  document.getElementById('btn-close-anchor-modal')?.addEventListener('click', () => {
    anchorModalEl.classList.add('hidden');
  });

  // Sound Settings Modal
  function openSoundModal() {
    soundModalEl.classList.remove('hidden');

    const bellBtns = document.querySelectorAll('.btn-select-bell');
    bellBtns.forEach((btn) => {
      btn.classList.toggle('border-teal-500', btn.dataset.tone === state.bellTone);
      btn.addEventListener('click', () => {
        state.bellTone = btn.dataset.tone;
        window.soundEngine.playBell(state.bellTone, state.soundVolume);
        window.habitStorage.save(state);
        openSoundModal();
      });
    });

    const ambientBtns = document.querySelectorAll('.btn-select-ambient');
    ambientBtns.forEach((btn) => {
      btn.classList.toggle('border-cyan-500', btn.dataset.ambient === state.ambientType);
      btn.addEventListener('click', () => {
        state.ambientType = btn.dataset.ambient;
        if (state.ambientType === 'none') {
          window.soundEngine.stopAmbient();
        } else {
          window.soundEngine.startAmbient(state.ambientType, state.ambientVolume);
        }
        window.habitStorage.save(state);
        openSoundModal();
      });
    });

    const bellVol = document.getElementById('slider-bell-vol');
    if (bellVol) {
      bellVol.value = state.soundVolume;
      bellVol.oninput = (e) => {
        state.soundVolume = parseFloat(e.target.value);
        window.habitStorage.save(state);
        updateHeader();
      };
    }

    const ambVol = document.getElementById('slider-amb-vol');
    if (ambVol) {
      ambVol.value = state.ambientVolume;
      ambVol.oninput = (e) => {
        state.ambientVolume = parseFloat(e.target.value);
        window.soundEngine.setAmbientVolume(state.ambientVolume);
        window.habitStorage.save(state);
      };
    }
  }

  document.getElementById('btn-close-sound-modal')?.addEventListener('click', () => {
    soundModalEl.classList.add('hidden');
  });

  // Initial render
  renderView();
});
