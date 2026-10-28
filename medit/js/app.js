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
  let librarySubTab = 'breathe'; // 'breathe' | 'timer' | 'science'

  if (state.voiceLevel && window.voicePlayer) {
    window.voicePlayer.setLevel(state.voiceLevel);
  }

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
    timerId: null,
    lastSpokenPhase: -1
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
      <div class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium border ${
        isDoneToday
          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
      }">
        <span class="${isDoneToday ? 'text-emerald-400' : 'text-amber-400'} flex items-center">
          ${isDoneToday ? window.MEDIT_ICONS.check('w-3.5 h-3.5') : window.MEDIT_ICONS.flame('w-3.5 h-3.5')}
        </span>
        <span class="font-bold text-white">${state.streakDays}</span>
        <span class="text-[10px] sm:text-[11px] opacity-80">${state.streakDays === 1 ? 'día' : 'días'}</span>
      </div>
    `;

    const isSoundOn = state.soundVolume > 0;
    headerSoundBtn.innerHTML = isSoundOn
      ? window.MEDIT_ICONS.soundOn('w-4 h-4 text-teal-400')
      : window.MEDIT_ICONS.soundOff('w-4 h-4 text-slate-500');
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
  function switchTab(tabId, subTab = null) {
    currentTab = tabId;
    if (subTab) librarySubTab = subTab;

    navTabs.forEach((btn) => {
      const targetTab = btn.dataset.tab;
      const isCurrent =
        targetTab === tabId ||
        (targetTab === 'library' && ['library', 'breathe', 'timer', 'learn'].includes(tabId)) ||
        (targetTab === 'progress' && ['progress', 'habits'].includes(tabId));

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
    } else if (currentTab === 'library' || currentTab === 'learn') {
      renderLibrary();
    } else if (currentTab === 'breathe') {
      renderBreathe();
    } else if (currentTab === 'timer') {
      renderTimer();
    } else if (currentTab === 'progress' || currentTab === 'habits') {
      renderProgress();
    }
  }

  // ==========================================
  // VIEW 1: HOME (Inicio Simplificado)
  // ==========================================
  const TIME_OPTIONS = [
    {
      seconds: 60,
      label: '1 min',
      tag: 'Micro-Pausa',
      badge: 'Cero Fricción',
      title: 'Pausa S.T.O.P.',
      desc: 'Corte de inercia y rumiación mental en 4 pasos guiados.',
      actionType: 'stop',
      science: 'Rompe el ciclo de reactividad simpática en 60 segundos antes de cambiar de tarea.'
    },
    {
      seconds: 120,
      label: '2 min',
      tag: 'Reseteo Rápido',
      badge: 'Stanford · 2m',
      title: 'Suspiro Fisiológico Cíclico',
      desc: 'Doble inhalación nasal y exhalación bucal prolongada.',
      actionType: 'breathe',
      protocolId: 'cyclic-sighing',
      science: 'Estudio Stanford (Cell Reports Medicine, 2023). Baja la frecuencia cardíaca y la activación simpática de inmediato.'
    },
    {
      seconds: 180,
      label: '3 min',
      tag: 'Foco & Calma',
      badge: 'Navy SEALs · 3m',
      title: 'Respiración Cuadrada (Box)',
      desc: 'Regulación del sistema autonómico en 4 tiempos equilibrados.',
      actionType: 'breathe',
      protocolId: 'box-breathing',
      science: 'Equilibra el sistema simpático y parasimpático antes de momentos de alta demanda ejecutiva.'
    },
    {
      seconds: 300,
      label: '5 min',
      tag: 'Pausa Zen',
      badge: 'Presencia · 5m',
      title: 'Meditación Zen con Cuenco',
      desc: 'Silencio consciente con cuenco tibetano e intervalos de presencia.',
      actionType: 'timer',
      secondsParam: 300,
      science: 'Desacelera el flujo de pensamientos intrusivos y renueva la claridad mental.'
    },
    {
      seconds: 600,
      label: '10 min',
      tag: 'Atención Dual',
      badge: 'Reset · 10m',
      title: 'Reset Mental Profundo',
      desc: 'Entrenamiento de foco en respiración + monitoreo abierto.',
      actionType: 'timer',
      secondsParam: 600,
      science: 'Entrena la corteza prefrontal y reduce la tendencia a la distracción recurrente.'
    },
    {
      seconds: 720,
      label: '12 min',
      tag: 'Peak Mind ★',
      badge: 'Amishi Jha · 12m',
      title: 'Umbral Neuroprotector',
      desc: 'La dosis diaria mínima demostrada contra el agotamiento cognitivo.',
      actionType: 'timer',
      secondsParam: 720,
      science: 'Investigación clínica de la Dra. Amishi Jha: 12 min/día blinda la memoria de trabajo contra el burnout.'
    },
    {
      seconds: 900,
      label: '15 min',
      tag: 'NSDR Stanford',
      badge: 'Dopamina · 15m',
      title: 'Descanso Profundo (NSDR)',
      desc: 'Non-Sleep Deep Rest: restauración ejecutiva y calma total.',
      actionType: 'timer',
      secondsParam: 900,
      science: 'Protocolo de Stanford (Dr. Huberman) para restaurar las reservas de dopamina y energía mental.'
    }
  ];

  let pendingTimeOption = null;

  function renderHome() {
    const activeAnchor =
      window.MEDIT_DATA.HABIT_ANCHORS.find((a) => a.id === state.activeAnchorId) ||
      window.MEDIT_DATA.HABIT_ANCHORS[0];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const isDoneToday = state.lastActiveDate === todayStr;

    mainContent.innerHTML = `
      <div class="space-y-6 animate-fade-in pb-20">
        <!-- Streak & Daily Goal Summary Card -->
        <div class="bg-gradient-to-br from-[#0e172a] via-[#0b101e] to-[#080d17] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl relative overflow-hidden">
          <div class="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div class="relative z-10 space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <span class="p-2.5 rounded-2xl ${isDoneToday ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'} flex items-center justify-center">
                  ${isDoneToday ? window.MEDIT_ICONS.check('w-5 h-5') : window.MEDIT_ICONS.flame('w-5 h-5')}
                </span>
                <div>
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tu Racha Cero Culpas</span>
                  <div class="flex items-baseline gap-1.5">
                    <span class="text-2xl sm:text-3xl font-extrabold text-white font-mono">${state.streakDays}</span>
                    <span class="text-xs text-slate-300 font-medium">${state.streakDays === 1 ? 'día consecutivo' : 'días consecutivos'}</span>
                  </div>
                </div>
              </div>

              <div class="text-right">
                <span class="text-[10px] font-semibold text-slate-400 block">Total meditado</span>
                <span class="text-xs sm:text-sm font-bold font-mono text-teal-300">${Math.round(state.totalSeconds / 60)} min</span>
              </div>
            </div>

            <div class="p-3 rounded-2xl ${isDoneToday ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-slate-900/80 border border-slate-800 text-slate-300'} text-xs flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full ${isDoneToday ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}"></span>
                <span>
                  ${isDoneToday ? '<strong>¡Objetivo de hoy completado!</strong> Cualquier pausa adicional sumará claridad.' : '<strong>Pausa de hoy pendiente:</strong> Desde solo 60 segundos mantienes activa tu racha.'}
                </span>
              </div>
            </div>

            <!-- Compact Habit Anchor Reminder -->
            <div id="btn-open-anchor-modal" class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-teal-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 group">
              <div class="flex items-center gap-2.5">
                <span class="p-1.5 rounded-xl bg-teal-500/10 text-teal-300 flex items-center justify-center">
                  ${window.getAnchorSvg ? window.getAnchorSvg(activeAnchor.id, 'w-4 h-4 text-teal-300') : '📍'}
                </span>
                <div>
                  <span class="text-[9px] uppercase font-bold tracking-wider text-teal-400 block">Tu anclaje diario</span>
                  <p class="text-xs font-semibold text-white tracking-tight">${activeAnchor.title}</p>
                </div>
              </div>
              <span class="text-[11px] text-teal-400 font-medium shrink-0 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Cambiar ${window.MEDIT_ICONS.chevronRight('w-3.5 h-3.5')}
              </span>
            </div>
          </div>
        </div>

        <!-- Central Question: ¿Cuánto tiempo tienes para meditar ahora? -->
        <div class="space-y-3">
          <div class="px-1">
            <h3 class="text-lg sm:text-xl font-bold tracking-tight text-white">¿Cuánto tiempo tienes para ti ahora?</h3>
            <p class="text-xs text-slate-400">Pulsa tu tiempo disponible y te guiaremos en la práctica ideal.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            ${TIME_OPTIONS.map((opt) => `
              <button data-time-sec="${opt.seconds}" class="btn-select-time group p-3.5 sm:p-4 rounded-3xl bg-[#0e1422] border border-slate-800/90 hover:border-teal-500/50 hover:bg-slate-900/90 text-left transition-all active:scale-[0.99] flex items-center justify-between gap-3 shadow-lg">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-teal-500/15 to-indigo-500/10 border border-teal-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-center p-1">
                    <span class="text-xs sm:text-sm font-black font-mono text-teal-300 text-center leading-none whitespace-nowrap">${opt.label}</span>
                  </div>
                  <div>
                    <div class="flex items-center gap-1.5 mb-0.5">
                      <span class="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/60">${opt.badge}</span>
                    </div>
                    <h4 class="text-xs sm:text-sm font-bold text-white group-hover:text-teal-200 transition-colors">${opt.title}</h4>
                    <p class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">${opt.desc}</p>
                  </div>
                </div>
                <span class="p-2 rounded-xl bg-slate-900 text-slate-400 group-hover:text-teal-400 group-hover:bg-teal-500/10 transition-colors shrink-0">
                  ${window.MEDIT_ICONS.chevronRight('w-4 h-4')}
                </span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Ambient Noise Quick Widget -->
        <div class="p-3.5 sm:p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              ${window.MEDIT_ICONS.wave('w-4 h-4 text-cyan-400')}
            </div>
            <div>
              <span class="text-xs font-bold text-white block">Ruido Marrón de Concentración</span>
              <span class="text-[10px] text-slate-400">Aísla ruidos y frena la distracción</span>
            </div>
          </div>

          <button id="btn-toggle-ambient" class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
            state.ambientType !== 'none'
              ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
          }">
            ${state.ambientType !== 'none' ? 'Activo (Apagar)' : 'Encender'}
          </button>
        </div>
      </div>

      <!-- Confirmation Modal / 1-Click Card -->
      <div id="time-confirm-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in" role="dialog" aria-modal="true">
        <div id="time-confirm-card" class="relative w-full max-w-md bg-[#0d1424] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4" onclick="event.stopPropagation()">
          <!-- Populated dynamically -->
        </div>
      </div>
    `;

    // Hook listeners
    document.getElementById('btn-open-anchor-modal')?.addEventListener('click', openAnchorModal);

    document.querySelectorAll('.btn-select-time').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sec = parseInt(btn.dataset.timeSec, 10);
        showTimeConfirmation(sec);
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

    // Close confirmation modal on backdrop click
    const confirmModalEl = document.getElementById('time-confirm-modal');
    confirmModalEl?.addEventListener('click', (e) => {
      if (e.target === confirmModalEl) {
        confirmModalEl.classList.add('hidden');
      }
    });
  }

  function showTimeConfirmation(seconds) {
    const opt = TIME_OPTIONS.find((o) => o.seconds === seconds) || TIME_OPTIONS[0];
    pendingTimeOption = opt;

    const modalEl = document.getElementById('time-confirm-modal');
    const cardEl = document.getElementById('time-confirm-card');
    if (!modalEl || !cardEl) return;

    const voiceDetails = window.voicePlayer.getLevelDetails();

    cardEl.innerHTML = `
      <div class="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div class="flex items-center gap-2">
          <span class="text-xs font-extrabold px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-mono">
            ${opt.label}
          </span>
          <span class="text-xs text-slate-400 font-medium">Técnica Recomendada</span>
        </div>
        <button id="btn-close-confirm-modal" class="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          ${window.MEDIT_ICONS.close('w-5 h-5')}
        </button>
      </div>

      <div class="space-y-2 py-1">
        <h3 class="text-xl font-extrabold text-white tracking-tight">${opt.title}</h3>
        <p class="text-xs text-slate-300 leading-relaxed">${opt.desc}</p>
        <div class="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-300 leading-relaxed flex items-start gap-2">
          <span class="mt-0.5">${window.MEDIT_ICONS.sparkle('w-3.5 h-3.5 text-teal-400 shrink-0')}</span>
          <span><strong>Base científica:</strong> ${opt.science}</span>
        </div>
      </div>

      <!-- Voice Guidance Setting Quick Toggle -->
      <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <span class="text-lg">${voiceDetails.emoji}</span>
          <div>
            <span class="text-[10px] text-slate-400 block font-semibold uppercase tracking-wider">Locución por voz</span>
            <span class="text-xs font-bold text-white">${voiceDetails.label}</span>
          </div>
        </div>
        <button id="btn-confirm-cycle-voice" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-semibold transition-colors flex items-center gap-1">
          <span>Cambiar</span>
        </button>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-2 pt-2">
        <button id="btn-start-confirmed-session" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-teal-500/25 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          ${window.MEDIT_ICONS.play('w-4 h-4 text-slate-950')} Comenzar Sesión (${opt.label})
        </button>
        <button id="btn-explore-library-from-confirm" class="w-full py-2.5 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors text-center">
          Ver todas las técnicas en la Biblioteca →
        </button>
      </div>
    `;

    modalEl.classList.remove('hidden');

    document.getElementById('btn-close-confirm-modal')?.addEventListener('click', () => {
      modalEl.classList.add('hidden');
    });

    document.getElementById('btn-explore-library-from-confirm')?.addEventListener('click', () => {
      modalEl.classList.add('hidden');
      switchTab('library');
    });

    document.getElementById('btn-confirm-cycle-voice')?.addEventListener('click', () => {
      const newLvl = window.voicePlayer.cycleLevel();
      state.voiceLevel = newLvl;
      window.habitStorage.save(state);
      showTimeConfirmation(seconds);
    });

    document.getElementById('btn-start-confirmed-session')?.addEventListener('click', () => {
      modalEl.classList.add('hidden');
      launchConfirmedSession(opt);
    });
  }

  function launchConfirmedSession(opt) {
    if (opt.actionType === 'stop') {
      startStopModal();
    } else if (opt.actionType === 'breathe') {
      breathState.protocolId = opt.protocolId;
      breathState.currentCycle = 1;
      breathState.currentStepIdx = 0;
      breathState.stepElapsed = 0;
      breathState.totalElapsed = 0;
      breathState.isCompleted = false;
      breathState.isRunning = true;
      switchTab('breathe');
      startBreathLoop();
      // Voice intro
      window.voicePlayer.play('zen_inicio', 'intro');
    } else if (opt.actionType === 'timer') {
      timerState.selectedSeconds = opt.secondsParam;
      timerState.remainingSeconds = opt.secondsParam;
      timerState.isActive = true;
      timerState.isPaused = false;
      timerState.isFinished = false;
      timerState.lastSpokenPhase = -1;

      // Play bell & ambient
      window.soundEngine.playBell(state.bellTone, state.soundVolume);
      if (state.ambientType !== 'none') {
        window.soundEngine.startAmbient(state.ambientType, state.ambientVolume);
      }

      startTimerLoop();
      renderTimerFullscreen();
      // Voice intro
      window.voicePlayer.play('zen_inicio', 'intro');
    }
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
            <span>${window.MEDIT_ICONS.breathe('w-3.5 h-3.5')}</span>
            <span>Regulación Fisiológica Directa</span>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white">Respiración Guiada</h2>
          <p class="text-xs text-slate-400 max-w-md mx-auto">
            Estimula el nervio vago y resetea tu ritmo biológico en pocos ciclos.
          </p>
        </div>

        <!-- Protocol Tabs -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          ${window.MEDIT_DATA.BREATH_PROTOCOLS.map((p) => {
            const isSel = p.id === breathState.protocolId;
            return `
              <button data-protocol="${p.id}" class="btn-select-protocol p-2.5 sm:p-3 rounded-2xl border text-left transition-all ${
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
        <div class="relative bg-gradient-to-b from-[#0e1526] to-[#090d16] border border-slate-800 rounded-3xl p-5 sm:p-8 flex flex-col items-center justify-center shadow-xl overflow-hidden min-h-[360px] sm:min-h-[380px]">
          <!-- Ambient Glow -->
          <div class="absolute w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none transition-all duration-500" style="transform: scale(${targetScale * 1.3});"></div>

          <!-- Top status bar -->
          <div class="w-full flex items-center justify-between z-10 mb-2">
            <span class="text-xs font-medium text-slate-400">
              Ciclo <strong class="text-white">${breathState.currentCycle}</strong> de ${maxCycles}
            </span>
            <div class="flex items-center gap-1.5">
              <button id="btn-toggle-breath-voice" class="p-1.5 px-2 rounded-xl bg-slate-800/80 text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-colors border border-slate-700/60" title="Locución por voz">
                <span>${window.voicePlayer.getLevelDetails().emoji}</span>
                <span id="label-breath-voice" class="text-[11px] font-medium">${window.voicePlayer.getLevelDetails().shortLabel}</span>
              </button>
              <button id="btn-toggle-breath-audio" class="p-1.5 px-2 rounded-xl bg-slate-800/80 text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-colors border border-slate-700/60">
                ${breathState.soundCues ? window.MEDIT_ICONS.soundOn('w-3.5 h-3.5 text-teal-400') + '<span class="text-[11px]">Tono</span>' : window.MEDIT_ICONS.soundOff('w-3.5 h-3.5 text-slate-500') + '<span class="text-[11px]">Silencio</span>'}
              </button>
            </div>
          </div>

          <!-- Central Expanding Rings -->
          <div class="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center my-3 sm:my-4 z-10">
            <div id="breath-orb-ring-outer" class="absolute rounded-full border border-teal-500/20 transition-transform duration-200" style="width: 100%; height: 100%; transform: scale(${targetScale});"></div>
            <div id="breath-orb-ring-inner" class="absolute rounded-full bg-teal-400/20 blur-md transition-transform duration-200" style="width: 85%; height: 85%; transform: scale(${targetScale * 0.95});"></div>

            <div id="breath-orb-sphere" class="w-40 h-40 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center text-center p-3 sm:p-4 border border-teal-400/30 bg-gradient-to-b from-slate-900/90 to-[#080d1a]/90 backdrop-blur-md shadow-2xl transition-transform duration-200" style="transform: scale(${targetScale});">
              ${
                !breathState.isCompleted
                  ? `
                <span id="breath-action-text" class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-teal-400 mb-0.5 sm:mb-1">
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
                <h4 id="breath-label-text" class="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-tight mb-1">
                  ${currentStep.label}
                </h4>
                <span id="breath-seconds-text" class="font-mono text-xs sm:text-sm text-slate-400 font-medium">
                  ${Math.max(0, currentStep.duration - breathState.stepElapsed).toFixed(1)}s
                </span>
              `
                  : `
                <div class="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-1 text-emerald-400">
                  ${window.MEDIT_ICONS.check('w-6 h-6')}
                </div>
                <span class="text-xs font-bold text-white">¡Completado!</span>
              `
              }
            </div>
          </div>

          <!-- Step Instruction -->
          <p class="text-xs text-slate-400 text-center max-w-sm z-10 h-8 flex items-center justify-center mb-4 sm:mb-5">
            ${breathState.isRunning ? currentStep.tip : 'Pulsa comenzar para iniciar la sincronización'}
          </p>

          <!-- Buttons -->
          <div class="flex items-center gap-3 sm:gap-4 z-10">
            <button id="btn-reset-breath" class="p-3 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-700 flex items-center justify-center" title="Reiniciar">
              ${window.MEDIT_ICONS.reset('w-4 h-4')}
            </button>
            <button id="btn-toggle-breath-run" class="px-7 sm:px-8 py-3 sm:py-3.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-teal-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2">
              ${breathState.isRunning ? window.MEDIT_ICONS.pause('w-4 h-4') + ' Pausar' : breathState.isCompleted ? window.MEDIT_ICONS.reset('w-4 h-4') + ' Repetir' : window.MEDIT_ICONS.play('w-4 h-4') + ' Comenzar'}
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

    document.getElementById('btn-toggle-breath-voice')?.addEventListener('click', () => {
      const newLvl = window.voicePlayer.cycleLevel();
      state.voiceLevel = newLvl;
      window.habitStorage.save(state);
      const details = window.voicePlayer.getLevelDetails();
      const btn = document.getElementById('btn-toggle-breath-voice');
      if (btn) {
        btn.innerHTML = `<span>${details.emoji}</span><span id="label-breath-voice" class="text-[11px] font-medium">${details.shortLabel}</span>`;
      }
    });

    document.getElementById('btn-toggle-breath-run')?.addEventListener('click', () => {
      const runBtn = document.getElementById('btn-toggle-breath-run');
      if (breathState.isRunning) {
        stopBreathLoop();
        breathState.isRunning = false;
        if (runBtn) runBtn.textContent = 'Comenzar';
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
        if (runBtn) runBtn.textContent = 'Pausar';
        if (breathState.soundCues) {
          window.soundEngine.playBreathCue(true, state.soundVolume);
        }
        startBreathLoop();
      }
    });
  }

  function playBreathStepVoice(action, prevAction = null) {
    if (breathState.currentCycle !== 1) return;
    if (action === 'inhale') {
      window.voicePlayer.play('resp_inhala', 'step');
    } else if (action === 'topInhale') {
      window.voicePlayer.play('resp_inhala_extra', 'step');
    } else if (action === 'hold') {
      if (prevAction === 'exhale') {
        window.voicePlayer.play('resp_vacio', 'step');
      } else {
        window.voicePlayer.play('resp_sosten', 'step');
      }
    } else if (action === 'exhale') {
      window.voicePlayer.play('resp_exhala', 'step');
    }
  }

  function startBreathLoop() {
    stopBreathLoop();
    const protocol =
      window.MEDIT_DATA.BREATH_PROTOCOLS.find((p) => p.id === breathState.protocolId) ||
      window.MEDIT_DATA.BREATH_PROTOCOLS[0];

    // Play first step voice cue in cycle 1
    if (breathState.currentCycle === 1 && breathState.stepElapsed <= 0.15) {
      playBreathStepVoice(protocol.steps[breathState.currentStepIdx].action);
    }

    breathState.timerId = setInterval(() => {
      breathState.totalElapsed += 0.1;
      breathState.stepElapsed += 0.1;

      const currentStep = protocol.steps[breathState.currentStepIdx];
      if (breathState.stepElapsed >= currentStep.duration) {
        const prevAction = currentStep.action;
        breathState.stepElapsed = 0;

        if (breathState.currentStepIdx < protocol.steps.length - 1) {
          breathState.currentStepIdx += 1;
          const nextAction = protocol.steps[breathState.currentStepIdx].action;
          playBreathStepVoice(nextAction, prevAction);
          if (breathState.soundCues) {
            const isHigh = nextAction.includes('inhale');
            window.soundEngine.playBreathCue(isHigh, state.soundVolume);
          }
        } else {
          // Next cycle
          if (breathState.currentCycle < protocol.defaultCycles) {
            breathState.currentCycle += 1;
            breathState.currentStepIdx = 0;
            const nextAction = protocol.steps[0].action;
            playBreathStepVoice(nextAction, prevAction);
            if (breathState.soundCues) {
              window.soundEngine.playBreathCue(true, state.soundVolume);
            }
          } else {
            // Finished!
            stopBreathLoop();
            breathState.isCompleted = true;
            breathState.isRunning = false;
            window.soundEngine.playBell(state.bellTone, state.soundVolume);
            window.voicePlayer.play('zen_cierre', 'outro');

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

      // Smooth in-place DOM update without tearing down the subtree
      if (currentTab === 'breathe' && !breathState.isCompleted) {
        const secondsEl = document.getElementById('breath-seconds-text');
        if (secondsEl) {
          secondsEl.textContent = `${Math.max(0, currentStep.duration - breathState.stepElapsed).toFixed(1)}s`;
        }
        const actionEl = document.getElementById('breath-action-text');
        if (actionEl) {
          actionEl.textContent =
            currentStep.action === 'inhale'
              ? 'Inhala'
              : currentStep.action === 'topInhale'
              ? '+ Inhala extra'
              : currentStep.action === 'hold'
              ? 'Sostén'
              : 'Exhala';
        }
        const labelEl = document.getElementById('breath-label-text');
        if (labelEl) {
          labelEl.textContent = currentStep.label;
        }

        let scale = 0.6;
        const ratio = Math.min(breathState.stepElapsed / currentStep.duration, 1);
        if (currentStep.action === 'inhale') scale = 0.6 + ratio * 0.35;
        else if (currentStep.action === 'topInhale') scale = 0.95 + ratio * 0.08;
        else if (currentStep.action === 'hold') scale = 1.0;
        else if (currentStep.action === 'exhale') scale = 1.0 - ratio * 0.4;

        const sphere = document.getElementById('breath-orb-sphere');
        if (sphere) sphere.style.transform = `scale(${scale})`;
        const inner = document.getElementById('breath-orb-ring-inner');
        if (inner) inner.style.transform = `scale(${scale * 0.95})`;
        const outer = document.getElementById('breath-orb-ring-outer');
        if (outer) outer.style.transform = `scale(${scale})`;
      } else if (currentTab === 'breathe' && breathState.isCompleted) {
        renderBreathe();
      }
    }, 100);
  }

  function stopBreathLoop() {
    if (breathState.timerId) {
      clearInterval(breathState.timerId);
      breathState.timerId = null;
    }
    if (window.voicePlayer) window.voicePlayer.stop();
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
            <span>${window.MEDIT_ICONS.timer('w-3.5 h-3.5')}</span>
            <span>Espacio de Meditación Silenciosa</span>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white">Temporizador Zen</h2>
          <p class="text-xs text-slate-400 max-w-md mx-auto">
            Desde micro-pausas de 1-3 minutos hasta sesiones completas de 10-15 min con fases de atención guiadas.
          </p>
        </div>

        <!-- Presets Configuration Card -->
        <div class="bg-[#0e1422] border border-slate-800/90 rounded-3xl p-4 sm:p-6 shadow-xl space-y-5 sm:space-y-6">
          <!-- Section 1: Micro Presets (1 to 5 min) -->
          <div>
            <label class="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2 sm:mb-2.5">
              Micro-Dosis (Construcción del Hábito)
            </label>
            <div class="grid grid-cols-4 gap-1.5 sm:gap-2">
              ${[
                { sec: 60, label: '1 min', tag: 'Tiny Habit' },
                { sec: 120, label: '2 min', tag: 'Dosis Base' },
                { sec: 180, label: '3 min', tag: 'Pausa Zen' },
                { sec: 300, label: '5 min', tag: 'Recarga' }
              ].map((p) => {
                const isSel = timerState.selectedSeconds === p.sec;
                return `
                  <button data-sec="${p.sec}" class="btn-timer-preset p-3 sm:p-3.5 rounded-2xl border text-center flex items-center justify-center transition-all ${
                    isSel
                      ? 'bg-teal-500/20 border-teal-500/60 shadow-lg text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }">
                    <p class="text-xs sm:text-sm font-extrabold font-mono leading-none text-center whitespace-nowrap">${p.label}</p>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Section 2: Deep 10-15 Min Presets (Amishi Jha & NSDR) -->
          <div class="pt-3 border-t border-slate-800/80">
            <div class="flex items-center justify-between mb-2.5">
              <label class="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Sesiones Profundas de 10 a 15 Minutos (Neuroprotección)
              </label>
              <span class="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Peak Mind & NSDR
              </span>
            </div>

            <div class="grid grid-cols-3 gap-2 sm:gap-2.5">
              ${[
                { sec: 600, label: '10 min', title: 'Reset Profundo', desc: 'Atención dual & calma' },
                { sec: 720, label: '12 min', title: 'Umbral Amishi Jha', desc: 'Inoculación anti-burnout' },
                { sec: 900, label: '15 min', title: 'NSDR Stanford', desc: 'Restauración de dopamina' }
              ].map((p) => {
                const isSel = timerState.selectedSeconds === p.sec;
                return `
                  <button data-sec="${p.sec}" class="btn-timer-preset p-2.5 sm:p-3.5 rounded-2xl border text-left transition-all ${
                    isSel
                      ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900 border-teal-400/70 shadow-lg text-white'
                      : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm sm:text-base font-black font-mono ${isSel ? 'text-teal-300' : 'text-white'}">${p.label}</span>
                      ${p.sec === 720 ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-teal-400 text-slate-950 font-bold">Clave</span>' : ''}
                    </div>
                    <p class="text-[11px] sm:text-xs font-bold leading-tight text-slate-200">${p.title}</p>
                    <p class="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 line-clamp-1">${p.desc}</p>
                  </button>
                `;
              }).join('')}
            </div>

            ${
              timerState.selectedSeconds >= 600
                ? `
              <div class="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-[11px] text-indigo-300 leading-relaxed flex items-start gap-2">
                <span class="mt-0.5">${window.MEDIT_ICONS.sparkle('w-3.5 h-3.5 text-indigo-400 shrink-0')}</span>
                <span><strong>Estructura guiada de 3 fases:</strong> Campanadas a los 5 min (cambio a Foco Amplio) y a los 10 min (descanso en presencia lúcida).</span>
              </div>
            `
                : ''
            }
          </div>

          <!-- Big Action Button -->
          <button id="btn-start-timer-session" class="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-400 text-slate-950 font-bold text-sm sm:text-base shadow-xl shadow-teal-500/25 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            ${window.MEDIT_ICONS.play('w-4 h-4 text-slate-950')} Comenzar Sesión (${Math.round(timerState.selectedSeconds / 60)} min)
          </button>
        </div>

        <!-- Tarjeta de Acompañamiento: Qué hacer y qué sensaciones buscar antes de empezar -->
        <div class="bg-gradient-to-br from-[#0e1628] to-[#0a101d] border border-teal-500/25 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="p-1.5 rounded-xl bg-teal-500/15 text-teal-300">${window.MEDIT_ICONS.breathe('w-4 h-4')}</span>
              <h3 class="text-xs sm:text-sm font-bold text-white tracking-tight">Antes de empezar: Guía Acompañada</h3>
            </div>
            <span class="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">Instrucciones Clave</span>
          </div>

          <!-- 1. Qué hacer -->
          <div class="space-y-2">
            <span class="text-[10px] sm:text-[11px] font-bold text-teal-300 uppercase tracking-wider block">1. Qué hacer (Paso a paso)</span>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              ${window.MEDIT_DATA.SESSION_GUIDANCE.prepSteps.map(step => `
                <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
                  <div class="flex items-center gap-1.5 mb-1 font-bold text-teal-300">
                    <span class="w-4 h-4 rounded-full bg-teal-500/20 text-teal-400 text-[10px] flex items-center justify-center font-mono">${step.num}</span>
                    <span>${step.title}</span>
                  </div>
                  <p class="text-[11px] text-slate-400 leading-relaxed">${step.desc}</p>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- 2. Qué sensaciones buscar -->
          <div class="space-y-2 pt-2 border-t border-slate-800/80">
            <span class="text-[10px] sm:text-[11px] font-bold text-cyan-300 uppercase tracking-wider block">2. Qué sensaciones buscar (Tu mapa sensorial)</span>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              ${window.MEDIT_DATA.SESSION_GUIDANCE.sensationsToFind.map(s => `
                <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
                  <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 mb-1 inline-block">${s.badge}</span>
                  <p class="font-bold text-white mb-0.5">${s.name}</p>
                  <p class="text-[11px] text-slate-400 leading-relaxed">${s.desc}</p>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Practical Tip -->
        <div class="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-3.5 sm:p-4 text-xs text-slate-300 leading-relaxed flex items-start gap-3">
          <span class="text-teal-400 mt-0.5 shrink-0">${window.MEDIT_ICONS.sparkle('w-4 h-4')}</span>
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
      timerState.lastSpokenPhase = -1;

      // Play bell & ambient
      window.soundEngine.playBell(state.bellTone, state.soundVolume);
      if (state.ambientType !== 'none') {
        window.soundEngine.startAmbient(state.ambientType, state.ambientVolume);
      }

      startTimerLoop();
      renderTimerFullscreen();
      // Voice intro
      window.voicePlayer.play('zen_inicio', 'intro');
    });
  }

  function updateTimerFullscreenDOM() {
    const formatTime = (secs) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const progressPercent =
      ((timerState.selectedSeconds - timerState.remainingSeconds) / timerState.selectedSeconds) * 100;

    let phaseIdx = 0;
    if (progressPercent >= 20 && progressPercent < 45) phaseIdx = 1;
    else if (progressPercent >= 45 && progressPercent < 70) phaseIdx = 2;
    else if (progressPercent >= 70 && progressPercent < 88) phaseIdx = 3;
    else if (progressPercent >= 88) phaseIdx = 4;

    if (timerState.lastSpokenPhase !== phaseIdx) {
      timerState.lastSpokenPhase = phaseIdx;
      if (phaseIdx === 0) window.voicePlayer.play('zen_fase1', 'phase');
      else if (phaseIdx === 1) window.voicePlayer.play('zen_fase2', 'phase');
      else if (phaseIdx === 2) window.voicePlayer.play('zen_fase3', 'phase');
      else if (phaseIdx === 3) window.voicePlayer.play('zen_fase4', 'phase');
    }

    const ring = document.getElementById('timer-progress-ring');
    if (ring) {
      const offset = `${283 - (283 * progressPercent) / 100}%`;
      ring.style.strokeDashoffset = offset;
      ring.setAttribute('stroke-dashoffset', offset);
    }

    const timeText = document.getElementById('timer-countdown-text');
    if (timeText) {
      timeText.textContent = formatTime(timerState.remainingSeconds);
    }

    const guidanceList = (window.MEDIT_DATA && window.MEDIT_DATA.SESSION_GUIDANCE)
      ? window.MEDIT_DATA.SESSION_GUIDANCE.phasePrompts
      : [];
    const currentGuidance = guidanceList.find(g => progressPercent >= g.minPercent && progressPercent < g.maxPercent)
      || guidanceList[guidanceList.length - 1]
      || { stage: 'Presencia Lúcida', prompt: 'Si tu mente se dispersa, nótalo con amabilidad y regresa a la sensación del aire.' };

    const stageEl = document.getElementById('timer-guidance-stage');
    if (stageEl && stageEl.textContent.trim() !== currentGuidance.stage) {
      stageEl.textContent = currentGuidance.stage;
    }
    const promptEl = document.getElementById('timer-guidance-prompt');
    if (promptEl && promptEl.textContent.trim() !== currentGuidance.prompt) {
      promptEl.textContent = currentGuidance.prompt;
    }
  }

  function renderTimerFullscreen() {
    const container = document.getElementById('timer-fullscreen-container');
    const currentMode = container?.dataset?.mode;

    // Smooth in-place DOM update without tearing down the subtree while active
    if (!timerState.isFinished && currentMode === 'active') {
      updateTimerFullscreenDOM();
      return;
    }

    const formatTime = (secs) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const progressPercent =
      ((timerState.selectedSeconds - timerState.remainingSeconds) / timerState.selectedSeconds) * 100;

    // Accompanied real-time guidance prompts based on progress percentage
    const guidanceList = (window.MEDIT_DATA && window.MEDIT_DATA.SESSION_GUIDANCE)
      ? window.MEDIT_DATA.SESSION_GUIDANCE.phasePrompts
      : [];
    const currentGuidance = guidanceList.find(g => progressPercent >= g.minPercent && progressPercent < g.maxPercent)
      || guidanceList[guidanceList.length - 1]
      || { stage: 'Presencia Lúcida', prompt: 'Si tu mente se dispersa, nótalo con amabilidad y regresa a la sensación del aire.' };

    mainContent.innerHTML = `
      <div id="timer-fullscreen-container" data-mode="${timerState.isFinished ? 'finished' : 'active'}" class="fixed inset-0 z-50 bg-[#060911] text-white flex flex-col justify-between p-5 sm:p-10 select-none animate-fade-in safe-pt safe-pb">
        <!-- Top Controls -->
        <div class="flex items-center justify-between z-10">
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>
            <span>Meditación en curso</span>
          </div>

          <div class="flex items-center gap-2">
            <button id="btn-toggle-voice-timer" class="w-9 h-9 rounded-full bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800 transition-colors flex items-center justify-center relative group" title="Locución por voz">
              <span>${window.voicePlayer.getLevelDetails().emoji}</span>
            </button>
            <button id="btn-toggle-clock" class="w-9 h-9 rounded-full bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 transition-colors flex items-center justify-center" title="Alternar reloj">
              ${timerState.hideClock ? window.MEDIT_ICONS.eye('w-4 h-4 text-teal-400') : window.MEDIT_ICONS.eyeOff('w-4 h-4')}
            </button>
            <button id="btn-cancel-timer" class="w-9 h-9 rounded-full bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 transition-colors flex items-center justify-center" title="Cancelar sesión">
              ${window.MEDIT_ICONS.close('w-4 h-4')}
            </button>
          </div>
        </div>

        <!-- Center: Orb or Reflection -->
        ${
          !timerState.isFinished
            ? `
          <div class="flex flex-col items-center justify-center my-auto relative">
            <div class="absolute w-72 h-72 sm:w-88 sm:h-88 rounded-full bg-teal-500/10 blur-3xl animate-breath-glow pointer-events-none"></div>

            <div class="relative w-60 h-60 sm:w-72 sm:h-72 flex items-center justify-center">
              <svg class="w-full h-full -rotate-90">
                <circle cx="50%" cy="50%" r="45%" class="stroke-slate-800/80 fill-none" stroke-width="4"></circle>
                <circle id="timer-progress-ring" cx="50%" cy="50%" r="45%" class="stroke-teal-400 fill-none transition-all duration-1000 ease-linear" stroke-width="4" stroke-dasharray="283%" stroke-dashoffset="${
                  283 - (283 * progressPercent) / 100
                }%" stroke-linecap="round"></circle>
              </svg>

              <div class="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <div id="timer-clock-display" class="${timerState.hideClock ? 'hidden' : ''} flex flex-col items-center">
                  <span id="timer-countdown-text" class="font-mono text-4xl sm:text-5xl font-extralight tracking-tight text-white mb-1">
                    ${formatTime(timerState.remainingSeconds)}
                  </span>
                </div>
                <div id="timer-zen-display" class="${timerState.hideClock ? '' : 'hidden'} flex flex-col items-center">
                  <div class="w-12 h-12 rounded-full border border-teal-400/40 animate-ping opacity-30 mb-2"></div>
                  <span class="text-xs text-teal-400 uppercase tracking-widest font-medium">Presencia</span>
                </div>
                <span id="timer-status-text" class="text-xs text-slate-400 font-light">
                  ${timerState.isPaused ? 'En pausa' : 'Respira con calma'}
                </span>
              </div>
            </div>

            <!-- Accompanied Guidance Prompt -->
            <div class="mt-5 sm:mt-6 max-w-sm mx-auto text-center px-4 z-10">
              <span id="timer-guidance-stage" class="text-[10px] uppercase font-bold tracking-widest text-teal-400 block mb-1">
                ${currentGuidance.stage}
              </span>
              <p id="timer-guidance-prompt" class="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                ${currentGuidance.prompt}
              </p>
            </div>
          </div>
        `
            : `
          <!-- Finished Reflection Modal -->
          <div class="max-w-md w-full mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-8 text-center my-auto shadow-2xl backdrop-blur-md animate-fade-in">
            <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 sm:mb-4 text-emerald-400 font-bold">
              ${window.MEDIT_ICONS.check('w-7 h-7 sm:w-8 sm:h-8')}
            </div>
            <h3 class="text-xl sm:text-2xl font-bold text-white mb-1">Sesión Completada</h3>
            <p class="text-xs text-teal-300 font-medium mb-4 sm:mb-5">
              +${Math.round(timerState.selectedSeconds / 60)} min para tu bienestar
            </p>

            <div class="space-y-2 mb-4 sm:mb-5">
              <label class="text-xs text-slate-400">¿Cómo te sientes ahora?</label>
              <div class="flex justify-center gap-2 sm:gap-3">
                ${[
                  { val: 1, e: '😴', l: 'Cansado' },
                  { val: 2, e: '😐', l: 'Neutro' },
                  { val: 3, e: '🙂', l: 'Calmado' },
                  { val: 4, e: '😌', l: 'En paz' },
                  { val: 5, e: '⚡', l: 'Renovado' }
                ].map((item) => `
                  <button data-val="${item.val}" class="btn-rate-mood flex flex-col items-center p-2 sm:p-2.5 rounded-xl border transition-all ${
                    timerState.ratingAfter === item.val
                      ? 'bg-teal-500/20 border-teal-500/60 scale-105 shadow-md'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                  }">
                    <span class="text-xl sm:text-2xl">${item.e}</span>
                    <span class="text-[9px] sm:text-[10px] mt-1">${item.l}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <input id="input-session-note" type="text" placeholder="Nota personal (opcional)" value="${timerState.note}" class="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400 mb-4 sm:mb-5" />

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
            <button id="btn-toggle-pause" class="px-7 sm:px-8 py-3 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium text-xs sm:text-sm flex items-center gap-2 transition-colors">
              ${timerState.isPaused ? window.MEDIT_ICONS.play('w-4 h-4 text-teal-400') + ' Reanudar' : window.MEDIT_ICONS.pause('w-4 h-4 text-slate-400') + ' Pausar'}
            </button>
          </div>
        `
            : ''
        }
      </div>
    `;

    document.getElementById('btn-toggle-voice-timer')?.addEventListener('click', () => {
      const newLvl = window.voicePlayer.cycleLevel();
      state.voiceLevel = newLvl;
      window.habitStorage.save(state);
      const btn = document.getElementById('btn-toggle-voice-timer');
      if (btn) {
        btn.innerHTML = `<span>${window.voicePlayer.getLevelDetails().emoji}</span>`;
      }
    });

    document.getElementById('btn-toggle-clock')?.addEventListener('click', () => {
      timerState.hideClock = !timerState.hideClock;
      const clockDisp = document.getElementById('timer-clock-display');
      const zenDisp = document.getElementById('timer-zen-display');
      const clockBtn = document.getElementById('btn-toggle-clock');
      if (clockDisp && zenDisp && clockBtn) {
        clockDisp.classList.toggle('hidden', timerState.hideClock);
        zenDisp.classList.toggle('hidden', !timerState.hideClock);
        clockBtn.innerHTML = timerState.hideClock
          ? window.MEDIT_ICONS.eye('w-4 h-4 text-teal-400')
          : window.MEDIT_ICONS.eyeOff('w-4 h-4');
      }
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
      const pauseBtn = document.getElementById('btn-toggle-pause');
      const statusText = document.getElementById('timer-status-text');
      if (pauseBtn) {
        pauseBtn.innerHTML = timerState.isPaused
          ? window.MEDIT_ICONS.play('w-4 h-4 text-teal-400') + ' Reanudar'
          : window.MEDIT_ICONS.pause('w-4 h-4 text-slate-400') + ' Pausar';
      }
      if (statusText) {
        statusText.textContent = timerState.isPaused ? 'En pausa' : 'Respira con calma';
      }
    });

    document.querySelectorAll('.btn-rate-mood').forEach((btn) => {
      btn.addEventListener('click', () => {
        timerState.ratingAfter = parseInt(btn.dataset.val, 10);
        document.querySelectorAll('.btn-rate-mood').forEach((b) => {
          const val = parseInt(b.dataset.val, 10);
          if (val === timerState.ratingAfter) {
            b.className = 'btn-rate-mood flex flex-col items-center p-2 sm:p-2.5 rounded-xl border transition-all bg-teal-500/20 border-teal-500/60 scale-105 shadow-md';
          } else {
            b.className = 'btn-rate-mood flex flex-col items-center p-2 sm:p-2.5 rounded-xl border transition-all bg-slate-800/60 border-slate-700/60 text-slate-400';
          }
        });
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
        if (window.voicePlayer) window.voicePlayer.play('zen_cierre', 'outro');
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
    if (window.voicePlayer) window.voicePlayer.stop();
  }

  // ==========================================
  // VIEW 4: LEARN (Aprender sin Mitos)
  // ==========================================
  function renderLearn() {
    const totalArticles = window.MEDIT_DATA.SCIENCE_ARTICLES.length;
    const completedCount = window.MEDIT_DATA.SCIENCE_ARTICLES.filter((a) =>
      state.completedArticleIds.includes(a.id)
    ).length;
    const progressPercent = Math.round((completedCount / totalArticles) * 100);

    mainContent.innerHTML = `
      <div class="space-y-5 sm:space-y-6 animate-fade-in pb-20">
        <!-- Header -->
        <div class="text-center space-y-1">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
            <span>${window.MEDIT_ICONS.learn('w-3.5 h-3.5')}</span>
            <span>Neurociencia en Píldoras (&lt; 2 min)</span>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white">Aprender sin Mitos</h2>
          <p class="text-xs text-slate-400 max-w-md mx-auto">
            Guía ordenada de iniciación: desde el concepto básico hasta la consolidación atencional.
          </p>
        </div>

        <!-- Curriculum Roadmap Progress Card -->
        <div class="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#0d1627] to-[#080d19] border border-teal-500/30 shadow-lg space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">Ruta Guiada de Iniciación</span>
              <h3 class="text-xs sm:text-sm font-bold text-white">De Principiante a Práctica Sólida</h3>
            </div>
            <span class="font-mono text-xs sm:text-sm font-bold text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2.5 py-1 rounded-xl">
              ${completedCount}/${totalArticles} Niveles
            </span>
          </div>

          <!-- Progress bar -->
          <div class="space-y-1.5">
            <div class="w-full bg-slate-800/90 rounded-full h-2 overflow-hidden">
              <div class="bg-gradient-to-r from-teal-500 to-emerald-400 h-2 rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
            </div>
            <div class="flex justify-between text-[10px] sm:text-[11px] text-slate-400">
              <span>Nivel 1: Qué es y qué NO es</span>
              <span class="text-teal-300 font-semibold">${progressPercent}% Completado</span>
              <span>Nivel 6: Umbral 12-15m</span>
            </div>
          </div>
        </div>

        <!-- Articles Accordion (Curriculum Levels 1 to 6) -->
        <div class="space-y-3">
          ${window.MEDIT_DATA.SCIENCE_ARTICLES.map((art, idx) => {
            const isRead = state.completedArticleIds.includes(art.id);
            const levelNum = art.level || idx + 1;
            return `
              <div class="article-card rounded-2xl border ${
                isRead ? 'border-teal-500/30 bg-[#0c1524]' : 'border-slate-800/90 bg-[#0e1422]'
              } overflow-hidden transition-all shadow-sm">
                <div class="article-header p-3.5 sm:p-5 cursor-pointer flex items-start justify-between gap-3">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isRead
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700/80'
                      }">
                        Nivel ${levelNum} · ${art.badge}
                      </span>
                      <span class="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1">
                        ${window.MEDIT_ICONS.clock('w-3 h-3')} ${art.readTime}
                      </span>
                      ${
                        isRead
                          ? `<span class="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">${window.MEDIT_ICONS.check('w-3 h-3')} Aprendido</span>`
                          : ''
                      }
                    </div>
                    <h3 class="text-xs sm:text-base font-bold text-white tracking-tight leading-snug">
                      ${art.title}
                    </h3>
                    <p class="text-[11px] sm:text-xs text-slate-400 mt-1 line-clamp-1">${art.hook}</p>
                  </div>
                  <button class="text-slate-400 p-1 shrink-0 article-chevron" aria-label="Expandir">${window.MEDIT_ICONS.chevronDown('w-4 h-4')}</button>
                </div>

                <div class="article-body hidden px-3.5 pb-4 sm:px-5 sm:pb-6 pt-2 border-t border-slate-800/80 space-y-3 sm:space-y-4">
                  <div class="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-indigo-500/10 border border-teal-500/30">
                    <span class="text-[10px] font-bold text-teal-300 uppercase tracking-wider block mb-1">Idea Central</span>
                    <p class="text-xs text-slate-200 leading-relaxed">${art.coreInsight}</p>
                  </div>

                  <div class="space-y-3 pt-1 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                    ${art.content.map((c) => `
                      <div>
                        <h4 class="font-bold text-white mb-1">${c.subtitle}</h4>
                        <p class="text-slate-300">${c.text}</p>
                      </div>
                    `).join('')}
                  </div>

                  <div class="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-emerald-300">
                    <strong class="flex items-center gap-1 text-[10px] uppercase tracking-wider mb-0.5 text-emerald-400">
                      ${window.MEDIT_ICONS.bolt('w-3 h-3')} Ejercicio Práctico del Nivel ${levelNum}
                    </strong>
                    <p class="text-slate-200">${art.actionable}</p>
                  </div>

                  <p class="text-[10px] text-slate-500 font-mono italic">Fuente: ${art.reference}</p>

                  <button data-id="${art.id}" class="btn-toggle-read w-full py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    isRead
                      ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      : 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30 shadow-md'
                  }">
                    ${isRead ? 'Nivel completado (Desmarcar)' : `Comprendido · Marcar Nivel ${levelNum} como aprendido`}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- FAQs -->
        <div class="pt-4 border-t border-slate-800/80 space-y-3">
          <h3 class="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <span class="text-teal-400">${window.MEDIT_ICONS.sparkle('w-4 h-4')}</span>
            <span>Preguntas Frecuentes de Principiantes</span>
          </h3>

          <div class="space-y-2">
            ${window.MEDIT_DATA.FAQS.map((faq) => `
              <div class="faq-item rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                <button class="faq-header w-full p-3 sm:p-3.5 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white">
                  <span>${faq.q}</span>
                  <span class="text-slate-500 shrink-0">${window.MEDIT_ICONS.chevronDown('w-3.5 h-3.5')}</span>
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
        const chevron = hdr.querySelector('.article-chevron');
        if (chevron) {
          chevron.classList.toggle('rotate-180');
        }
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
  // VIEW: LIBRARY (Biblioteca Unificada)
  // ==========================================
  function renderLibrary() {
    const subnavHtml = `
      <div class="mb-5 space-y-3">
        <div class="text-center space-y-1">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
            <span>${window.MEDIT_ICONS.library('w-3.5 h-3.5')}</span>
            <span>Catálogo Completo</span>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white">Biblioteca de Técnicas</h2>
          <p class="text-xs text-slate-400 max-w-md mx-auto">
            Explora las prácticas según tu necesidad fisiológica o cognitiva.
          </p>
        </div>

        <div class="flex items-center justify-center p-1 rounded-2xl bg-slate-900/90 border border-slate-800 max-w-md mx-auto">
          <button data-subtab="breathe" class="btn-lib-subtab flex-1 py-2 rounded-xl text-xs transition-all ${
            librarySubTab === 'breathe'
              ? 'bg-teal-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white font-semibold'
          }">
            Respiración
          </button>
          <button data-subtab="timer" class="btn-lib-subtab flex-1 py-2 rounded-xl text-xs transition-all ${
            librarySubTab === 'timer'
              ? 'bg-teal-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white font-semibold'
          }">
            Temporizador Zen
          </button>
          <button data-subtab="science" class="btn-lib-subtab flex-1 py-2 rounded-xl text-xs transition-all ${
            librarySubTab === 'science'
              ? 'bg-teal-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white font-semibold'
          }">
            Neurociencia
          </button>
        </div>
      </div>
    `;

    // Render the selected subview
    if (librarySubTab === 'breathe') {
      renderBreathe();
    } else if (librarySubTab === 'timer') {
      renderTimer();
    } else if (librarySubTab === 'science') {
      renderLearn();
    }

    // Prepend subnav if in library view
    if (currentTab === 'library' || currentTab === 'learn') {
      const topDiv = mainContent.firstElementChild;
      if (topDiv) {
        const defaultHeader = topDiv.querySelector('.text-center.space-y-1');
        if (defaultHeader) defaultHeader.classList.add('hidden');

        const headerPlaceholder = document.createElement('div');
        headerPlaceholder.innerHTML = subnavHtml;
        topDiv.insertBefore(headerPlaceholder, topDiv.firstChild);

        headerPlaceholder.querySelectorAll('.btn-lib-subtab').forEach((btn) => {
          btn.addEventListener('click', () => {
            librarySubTab = btn.dataset.subtab;
            renderLibrary();
          });
        });
      }
    }
  }

  function renderProgress() {
    renderHabits();
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
      <div class="space-y-5 sm:space-y-6 animate-fade-in pb-20">
        <!-- Header -->
        <div class="text-center space-y-1">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <span>${window.MEDIT_ICONS.flame('w-3.5 h-3.5')}</span>
            <span>Ciencia del Hábito (B.J. Fogg)</span>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white">Mi Práctica & Progreso</h2>
          <p class="text-xs text-slate-400 max-w-md mx-auto">
            Racha "Cero Culpas": un solo minuto al día consolida tu circuito neuronal de calma.
          </p>
        </div>

        <!-- 3 Primary Metrics -->
        <div class="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div class="bg-[#0e1422] border border-slate-800 p-3 sm:p-4 rounded-2xl text-center">
            <div class="flex justify-center mb-1 text-amber-400">${window.MEDIT_ICONS.flame('w-5 h-5')}</div>
            <span class="text-xl sm:text-2xl font-black font-mono text-white block">${state.streakDays}</span>
            <span class="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Días Racha</span>
          </div>

          <div class="bg-[#0e1422] border border-slate-800 p-3 sm:p-4 rounded-2xl text-center">
            <div class="flex justify-center mb-1 text-teal-400">${window.MEDIT_ICONS.clock('w-5 h-5')}</div>
            <span class="text-xl sm:text-2xl font-black font-mono text-white block">${totalMinutes}</span>
            <span class="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Minutos Totales</span>
          </div>

          <div class="bg-[#0e1422] border border-slate-800 p-3 sm:p-4 rounded-2xl text-center">
            <div class="flex justify-center mb-1 text-cyan-400">${window.MEDIT_ICONS.award('w-5 h-5')}</div>
            <span class="text-xl sm:text-2xl font-black font-mono text-white block">${state.totalSessions}</span>
            <span class="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pausas Hechas</span>
          </div>
        </div>

        <!-- Active Habit Stacking Card -->
        <div class="bg-gradient-to-br from-[#0e172a] to-[#080d1a] border border-teal-500/30 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
          <div class="flex items-start justify-between mb-3">
            <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/30">
              Anclaje Activo (Habit Stacking)
            </span>
            <button id="btn-change-anchor" class="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1">
              <span>Cambiar</span>
              <span>${window.MEDIT_ICONS.arrowRight('w-3 h-3')}</span>
            </button>
          </div>

          <div class="flex items-start gap-3.5 sm:gap-4">
            <div class="p-3 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 shrink-0">
              ${window.getAnchorSvg(activeAnchor.id, 'w-6 h-6')}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm sm:text-base font-bold text-white mb-1">${activeAnchor.title}</h3>
              <p class="text-xs text-teal-300 font-medium mb-1">Disparador: ${activeAnchor.cue}</p>
              <p class="text-xs text-slate-300 leading-relaxed">${activeAnchor.action}</p>
            </div>
          </div>
        </div>

        <!-- History of Sessions -->
        <div class="bg-[#0e1422] border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span class="text-teal-400">${window.MEDIT_ICONS.calendar('w-4 h-4')}</span>
              <span>Historial de Práctica</span>
            </h3>
            <span class="text-[11px] sm:text-xs text-slate-400 font-mono">${state.sessions.length} registros</span>
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
                    ${sess.ratingAfter ? `<span class="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] sm:text-[11px]">Estado: ${sess.ratingAfter}/5</span>` : ''}
                    <span class="text-emerald-400">${window.MEDIT_ICONS.check('w-4 h-4')}</span>
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
            <button id="btn-export-json" class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 text-xs font-medium flex items-center gap-1.5">
              <span>${window.MEDIT_ICONS.download('w-3.5 h-3.5 text-teal-400')}</span>
              <span>Exportar JSON</span>
            </button>
            <label class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700 text-xs font-medium cursor-pointer flex items-center gap-1.5">
              <span>${window.MEDIT_ICONS.upload('w-3.5 h-3.5 text-cyan-400')}</span>
              <span>Importar</span>
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

    const stopVoiceClips = ['stop_s', 'stop_t', 'stop_o', 'stop_p'];
    window.voicePlayer.play(stopVoiceClips[0], 'step');

    if (stopState.timerId) clearInterval(stopState.timerId);
    stopState.timerId = setInterval(() => {
      if (!stopState.isRunning || stopState.isFinished) return;

      stopState.remaining -= 1;
      if (stopState.remaining <= 0) {
        if (stopState.stepIdx < STOP_STEPS.length - 1) {
          stopState.stepIdx += 1;
          stopState.remaining = STOP_STEPS[stopState.stepIdx].duration;
          window.soundEngine.playBreathCue(true, state.soundVolume);
          window.voicePlayer.play(stopVoiceClips[stopState.stepIdx], 'step');
        } else {
          // Finished S.T.O.P.!
          clearInterval(stopState.timerId);
          stopState.isFinished = true;
          stopState.isRunning = false;
          window.soundEngine.playBell(state.bellTone, state.soundVolume);
          window.voicePlayer.play('zen_cierre', 'outro');

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
            <button id="btn-stop-modal-pause" class="px-5 py-2.5 rounded-2xl bg-slate-800 text-slate-200 text-sm font-medium border border-slate-700 flex items-center gap-1.5 hover:bg-slate-700 transition-colors">
              ${stopState.isRunning ? window.MEDIT_ICONS.pause('w-4 h-4 text-slate-400') + '<span>Pausar</span>' : window.MEDIT_ICONS.play('w-4 h-4 text-teal-400') + '<span>Continuar</span>'}
            </button>
            <button id="btn-stop-modal-next" class="px-5 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-sm flex items-center gap-1.5 transition-colors">
              <span>Siguiente</span>
              <span>${window.MEDIT_ICONS.arrowRight('w-3.5 h-3.5')}</span>
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
          <div class="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400">
            ${window.MEDIT_ICONS.check('w-8 h-8')}
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
    if (window.voicePlayer) window.voicePlayer.stop();
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
        <div data-id="${anc.id}" class="btn-select-anchor p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
          isSel
            ? 'bg-teal-500/15 border-teal-500/50 shadow-md text-white'
            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
        }">
          <div class="flex items-start gap-3.5">
            <div class="p-2.5 rounded-xl ${isSel ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400'} shrink-0">
              ${window.getAnchorSvg(anc.id, 'w-5 h-5')}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <h4 class="text-xs sm:text-sm font-bold text-white">${anc.title}</h4>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">${anc.seconds}s</span>
              </div>
              <p class="text-xs text-teal-300 font-medium mb-1">Disparador: ${anc.cue}</p>
              <p class="text-xs text-slate-400">${anc.action}</p>
            </div>
            ${isSel ? `<span class="text-teal-400 font-bold shrink-0">${window.MEDIT_ICONS.check('w-4 h-4')}</span>` : ''}
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

  // Sound & Settings Modal (Robust single initialization + reactive UI update)
  let soundModalEventsBound = false;

  function updateSoundModalUI() {
    // 1. Bell tones buttons
    document.querySelectorAll('.btn-select-bell').forEach((btn) => {
      const isSel = btn.dataset.tone === state.bellTone;
      btn.classList.toggle('border-teal-500', isSel);
      btn.classList.toggle('bg-teal-500/15', isSel);
      btn.classList.toggle('border-slate-800', !isSel);
      btn.classList.toggle('bg-slate-900/60', !isSel);
      const checkBadge = btn.querySelector('.bell-check-badge');
      if (checkBadge) {
        checkBadge.classList.toggle('hidden', !isSel);
      }
    });

    // 2. Bell volume
    const bellVol = document.getElementById('slider-bell-vol');
    const bellVolLabel = document.getElementById('label-bell-vol');
    if (bellVol) bellVol.value = state.soundVolume;
    if (bellVolLabel) bellVolLabel.textContent = `${Math.round(state.soundVolume * 100)}%`;

    // 3. Ambient buttons
    document.querySelectorAll('.btn-select-ambient').forEach((btn) => {
      const isSel = btn.dataset.ambient === state.ambientType;
      btn.classList.toggle('border-cyan-500', isSel);
      btn.classList.toggle('bg-cyan-500/15', isSel);
      btn.classList.toggle('border-slate-800', !isSel);
      btn.classList.toggle('bg-slate-900/60', !isSel);
      const checkBadge = btn.querySelector('.amb-check-badge');
      if (checkBadge) {
        checkBadge.classList.toggle('hidden', !isSel);
      }
    });

    // 4. Ambient volume
    const ambVol = document.getElementById('slider-amb-vol');
    const ambVolLabel = document.getElementById('label-amb-vol');
    if (ambVol) ambVol.value = state.ambientVolume;
    if (ambVolLabel) ambVolLabel.textContent = `${Math.round(state.ambientVolume * 100)}%`;

    // 5. Voice level buttons
    document.querySelectorAll('.btn-select-voice-level').forEach((btn) => {
      const isSel = btn.dataset.voiceLevel === (state.voiceLevel || 'balanced');
      btn.classList.toggle('border-teal-500', isSel);
      btn.classList.toggle('bg-teal-500/15', isSel);
      btn.classList.toggle('border-slate-800', !isSel);
      btn.classList.toggle('bg-slate-900', !isSel);
      const checkBadge = btn.querySelector('.voice-check-badge');
      if (checkBadge) {
        checkBadge.classList.toggle('hidden', !isSel);
      }
    });

    // 6. Preferences toggles
    const breathSoundToggle = document.getElementById('toggle-setting-breath-sound');
    if (breathSoundToggle) breathSoundToggle.checked = Boolean(state.soundCues !== false);

    const hideClockToggle = document.getElementById('toggle-setting-hide-clock');
    if (hideClockToggle) hideClockToggle.checked = Boolean(state.hideClockDefault);
  }

  function initSoundModalEvents() {
    if (soundModalEventsBound) return;
    soundModalEventsBound = true;

    // Bell tone click
    document.querySelectorAll('.btn-select-bell').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.bellTone = btn.dataset.tone;
        window.soundEngine.playBell(state.bellTone, state.soundVolume);
        window.habitStorage.save(state);
        updateSoundModalUI();
      });
    });

    // Ambient tone click
    document.querySelectorAll('.btn-select-ambient').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.ambientType = btn.dataset.ambient;
        if (state.ambientType === 'none') {
          window.soundEngine.stopAmbient();
        } else {
          window.soundEngine.startAmbient(state.ambientType, state.ambientVolume);
        }
        window.habitStorage.save(state);
        updateSoundModalUI();
        if (currentTab === 'home') renderHome();
      });
    });

    // Voice level click
    document.querySelectorAll('.btn-select-voice-level').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.voiceLevel = btn.dataset.voiceLevel;
        if (window.voicePlayer) window.voicePlayer.setLevel(state.voiceLevel);
        window.habitStorage.save(state);
        updateSoundModalUI();
      });
    });

    // Bell volume slider
    const bellVol = document.getElementById('slider-bell-vol');
    if (bellVol) {
      bellVol.addEventListener('input', (e) => {
        state.soundVolume = parseFloat(e.target.value);
        window.habitStorage.save(state);
        updateHeader();
        updateSoundModalUI();
      });
    }

    // Ambient volume slider
    const ambVol = document.getElementById('slider-amb-vol');
    if (ambVol) {
      ambVol.addEventListener('input', (e) => {
        state.ambientVolume = parseFloat(e.target.value);
        window.soundEngine.setAmbientVolume(state.ambientVolume);
        window.habitStorage.save(state);
        updateSoundModalUI();
      });
    }

    // Preference toggles
    document.getElementById('toggle-setting-breath-sound')?.addEventListener('change', (e) => {
      state.soundCues = e.target.checked;
      breathState.soundCues = state.soundCues;
      window.habitStorage.save(state);
    });

    document.getElementById('toggle-setting-hide-clock')?.addEventListener('change', (e) => {
      state.hideClockDefault = e.target.checked;
      timerState.hideClock = state.hideClockDefault;
      window.habitStorage.save(state);
    });

    // Backup buttons inside settings
    document.getElementById('btn-settings-export')?.addEventListener('click', () => {
      const dataStr = window.habitStorage.exportData(state);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medit_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('input-settings-import')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const imported = window.habitStorage.importData(event.target.result);
        if (imported) {
          state = imported;
          updateHeader();
          updateSoundModalUI();
          renderView();
          alert('¡Datos restaurados con éxito!');
        } else {
          alert('Archivo de copia no válido.');
        }
      };
      reader.readAsText(file);
    });
  }

  function openSoundModal() {
    initSoundModalEvents();
    updateSoundModalUI();
    soundModalEl.classList.remove('hidden');
  }

  document.getElementById('btn-close-sound-modal')?.addEventListener('click', () => {
    soundModalEl.classList.add('hidden');
  });

  // Backdrop dismissals for all modals
  stopModalEl?.addEventListener('click', (e) => {
    if (e.target === stopModalEl) closeStopModal();
  });
  anchorModalEl?.addEventListener('click', (e) => {
    if (e.target === anchorModalEl) anchorModalEl.classList.add('hidden');
  });
  soundModalEl?.addEventListener('click', (e) => {
    if (e.target === soundModalEl) soundModalEl.classList.add('hidden');
  });

  // Global Escape key dismiss
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!stopModalEl.classList.contains('hidden')) closeStopModal();
      anchorModalEl.classList.add('hidden');
      soundModalEl.classList.add('hidden');
    }
  });

  // Initial render
  renderView();
});
