// Voice Player for Medit PWA
// Pre-generated offline soothing female neural voice (es-ES-ElviraNeural)
// 3 Guidance Levels: 'balanced' (default), 'minimal', 'none'

class VoicePlayer {
  constructor() {
    this.level = 'balanced'; // 'balanced' | 'minimal' | 'none'
    this.volume = 0.9;
    this.currentAudio = null;

    this.clips = {
      'zen_inicio': './audio/voice/zen_inicio.mp3',
      'zen_cierre': './audio/voice/zen_cierre.mp3',
      'resp_inhala': './audio/voice/resp_inhala.mp3',
      'resp_inhala_extra': './audio/voice/resp_inhala_extra.mp3',
      'resp_sosten': './audio/voice/resp_sosten.mp3',
      'resp_exhala': './audio/voice/resp_exhala.mp3',
      'resp_vacio': './audio/voice/resp_vacio.mp3',
      'stop_s': './audio/voice/stop_s.mp3',
      'stop_t': './audio/voice/stop_t.mp3',
      'stop_o': './audio/voice/stop_o.mp3',
      'stop_p': './audio/voice/stop_p.mp3',
      'zen_fase1': './audio/voice/zen_fase1.mp3',
      'zen_fase2': './audio/voice/zen_fase2.mp3',
      'zen_fase3': './audio/voice/zen_fase3.mp3',
      'zen_fase4': './audio/voice/zen_fase4.mp3'
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
          label: 'Guía Equilibrada',
          shortLabel: 'Equilibrada',
          desc: 'Voz suave en inicios, primer ciclo y cambios de fase',
          iconName: 'voice-high',
          emoji: '🔊'
        };
      case 'minimal':
        return {
          id: 'minimal',
          label: 'Guía Mínima',
          shortLabel: 'Mínima',
          desc: 'Solo bienvenida y felicitación final',
          iconName: 'voice-low',
          emoji: '🔉'
        };
      case 'none':
      default:
        return {
          id: 'none',
          label: 'Sin Locución',
          shortLabel: 'Silencio',
          desc: 'Silencio vocal total (solo cuencos y campanas)',
          iconName: 'voice-off',
          emoji: '🔇'
        };
    }
  }

  /**
   * Play an audio clip according to the active level and category
   * @param {string} clipKey Key from this.clips
   * @param {'intro' | 'step' | 'phase' | 'outro'} category
   */
  play(clipKey, category = 'step') {
    if (this.level === 'none') return;
    if (this.level === 'minimal' && category !== 'intro' && category !== 'outro') return;

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
