// Voice Player for Medit PWA
// Pre-generated offline soothing female neural voice (es-ES-ElviraNeural)
// 3 Guidance Levels: 'balanced' (permisivo: texto completo), 'minimal' (restrictivo: nombre fase + resumen), 'none'

class VoicePlayer {
  constructor() {
    this.level = 'balanced'; // 'balanced' | 'minimal' | 'none'
    this.volume = 0.9;
    this.currentAudio = null;

    this.clips = {
      // General
      'zen_inicio': './audio/voice/zen_inicio.mp3',
      'zen_cierre': './audio/voice/zen_cierre.mp3',

      // Respiración
      'resp_inhala': './audio/voice/resp_inhala.mp3',
      'resp_inhala_extra': './audio/voice/resp_inhala_extra.mp3',
      'resp_sosten': './audio/voice/resp_sosten.mp3',
      'resp_exhala': './audio/voice/resp_exhala.mp3',
      'resp_vacio': './audio/voice/resp_vacio.mp3',

      // Protocolo S.T.O.P.
      'stop_s': './audio/voice/stop_s.mp3',
      'stop_t': './audio/voice/stop_t.mp3',
      'stop_o': './audio/voice/stop_o.mp3',
      'stop_p': './audio/voice/stop_p.mp3',

      // Nivel permisivo (balanced): Lee todo el texto debajo del temporizador
      'zen_fase1_full': './audio/voice/zen_fase1_full.mp3',
      'zen_fase2_full': './audio/voice/zen_fase2_full.mp3',
      'zen_fase3_full': './audio/voice/zen_fase3_full.mp3',
      'zen_fase4_full': './audio/voice/zen_fase4_full.mp3',
      'zen_fase5_full': './audio/voice/zen_fase5_full.mp3',

      // Nivel restrictivo (minimal): Lee el nombre de la fase junto a un resumen breve
      'zen_fase1_short': './audio/voice/zen_fase1_short.mp3',
      'zen_fase2_short': './audio/voice/zen_fase2_short.mp3',
      'zen_fase3_short': './audio/voice/zen_fase3_short.mp3',
      'zen_fase4_short': './audio/voice/zen_fase4_short.mp3',
      'zen_fase5_short': './audio/voice/zen_fase5_short.mp3',

      // Alias retrocompatibles
      'zen_fase1': './audio/voice/zen_fase1_full.mp3',
      'zen_fase2': './audio/voice/zen_fase2_full.mp3',
      'zen_fase3': './audio/voice/zen_fase3_full.mp3',
      'zen_fase4': './audio/voice/zen_fase4_full.mp3',
      'zen_fase5': './audio/voice/zen_fase5_full.mp3'
    };

    // Cache preloaded audio elements for instant zero-latency playback
    this.audioCache = {};
    this.preloadClips();
  }

  preloadClips() {
    try {
      Object.entries(this.clips).forEach(([key, src]) => {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = src;
        this.audioCache[key] = audio;
      });
    } catch (e) {
      console.warn('Voice preloading warning:', e);
    }
  }

  setLevel(level) {
    if (['balanced', 'minimal', 'none'].includes(level)) {
      this.level = level;
    }
  }

  getLevel() {
    return this.level;
  }

  cycleLevel() {
    const cycle = {
      balanced: 'minimal',
      minimal: 'none',
      none: 'balanced'
    };
    this.level = cycle[this.level] || 'balanced';
    if (this.level === 'none') {
      this.stop();
    }
    return this.level;
  }

  getLevelDetails(lvl = this.level) {
    switch (lvl) {
      case 'balanced':
        return {
          id: 'balanced',
          label: 'Guía Completa',
          shortLabel: 'Completa',
          desc: 'Lee el texto completo de las fases debajo de la esfera',
          iconName: 'voice-high',
          svg: (cls = 'w-4 h-4') => window.MEDIT_ICONS.voiceHigh(cls)
        };
      case 'minimal':
        return {
          id: 'minimal',
          label: 'Guía Mínima',
          shortLabel: 'Mínima',
          desc: 'Lee el nombre de la fase y un resumen breve',
          iconName: 'voice-low',
          svg: (cls = 'w-4 h-4') => window.MEDIT_ICONS.voiceLow(cls)
        };
      case 'none':
      default:
        return {
          id: 'none',
          label: 'Sin Locución',
          shortLabel: 'Silencio',
          desc: 'Silencio vocal total (solo cuencos y campanas)',
          iconName: 'voice-off',
          svg: (cls = 'w-4 h-4') => window.MEDIT_ICONS.voiceOff(cls)
        };
    }
  }

  /**
   * Reproduce la fase según el nivel de locución:
   * - Nivel más permisivo ('balanced'): lee todo el texto debajo del temporizador
   * - Nivel más restrictivo ('minimal'): lee el nombre de la fase + resumen breve
   * - Nivel 'none': silencio
   * @param {number} phaseIdx 0 a 4
   */
  playPhase(phaseIdx) {
    if (this.level === 'none') return;
    const num = Math.max(1, Math.min(5, phaseIdx + 1));
    if (this.level === 'balanced') {
      this.play(`zen_fase${num}_full`, 'phase');
    } else if (this.level === 'minimal') {
      this.play(`zen_fase${num}_short`, 'phase');
    }
  }

  /**
   * Play an audio clip according to the active level and category
   * @param {string} clipKey Key from this.clips
   * @param {'intro' | 'step' | 'phase' | 'outro'} category
   */
  play(clipKey, category = 'step') {
    if (this.level === 'none') return;
    if (this.level === 'minimal' && category === 'step') return;

    const src = this.clips[clipKey];
    if (!src) return;

    try {
      this.stop();

      let audio = this.audioCache[clipKey];
      if (!audio) {
        audio = new Audio(src);
        this.audioCache[clipKey] = audio;
      }

      audio.currentTime = 0;
      audio.volume = this.volume;
      this.currentAudio = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Ignore interruption errors when rapid-switching or user hasn't interacted yet
          if (err.name !== 'AbortError') {
            console.debug('Voice playback debug notice:', err.message);
          }
        });
      }
    } catch (err) {
      console.warn('Voice play exception:', err);
    }
  }

  stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
  }
}

window.voicePlayer = new VoicePlayer();
