// Web Audio API Synthesis Engine for Medit PWA
// 100% Offline, synthetic acoustic harmonics - zero external mp3 files

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientSource = null;
    this.ambientGain = null;
    this.isAmbientPlaying = false;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Tibetan Singing Bowl with authentic acoustic beating (216Hz + harmonics)
  playTibetanBowl(volume = 0.8) {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;
      const duration = 4.8;

      const harmonics = [
        { freq: 216, gain: 0.6, detune: 0 },
        { freq: 216, gain: 0.35, detune: 3 }, // Acoustic beating
        { freq: 594, gain: 0.28, detune: 1 },
        { freq: 872, gain: 0.16, detune: -2 },
        { freq: 1406, gain: 0.08, detune: 0 }
      ];

      harmonics.forEach(({ freq, gain: hGain, detune }) => {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(detune, now);

        const peak = hGain * volume;
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(peak, now + 0.015);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
      });
    } catch (e) {
      console.warn('Tibetan bowl audio error:', e);
    }
  }

  // Pure High Zen Chime (880Hz crystal clear)
  playZenChime(volume = 0.7) {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;
      const duration = 3.2;

      const freqs = [
        { f: 880, g: 0.45 },
        { f: 1760, g: 0.2 },
        { f: 2640, g: 0.06 }
      ];

      freqs.forEach(({ f, g }) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(g * volume, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
      });
    } catch (e) {
      console.warn('Zen chime audio error:', e);
    }
  }

  // Deep Temple Gong (110Hz resonant)
  playTempleGong(volume = 0.8) {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;
      const duration = 5.5;

      const freqs = [
        { f: 110, g: 0.65 },
        { f: 165, g: 0.35 },
        { f: 275, g: 0.2 },
        { f: 440, g: 0.1 }
      ];

      freqs.forEach(({ f, g }) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(g * volume, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration);
      });
    } catch (e) {
      console.warn('Gong audio error:', e);
    }
  }

  playBell(tone = 'tibetan', volume = 0.8) {
    if (tone === 'zen') {
      this.playZenChime(volume);
    } else if (tone === 'gong') {
      this.playTempleGong(volume);
    } else {
      this.playTibetanBowl(volume);
    }
  }

  // Subtle breath cue tone
  playBreathCue(isHigh = true, volume = 0.3) {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(isHigh ? 440 : 330, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume * 0.25, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn('Breath cue audio error:', e);
    }
  }

  // Algorithmic Brown Noise Buffer (Leaky integration for deep waterfall sound)
  createBrownNoiseBuffer() {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }
    return buffer;
  }

  // Algorithmic Rain Buffer (Pink noise filtered)
  createRainBuffer() {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  startAmbient(type = 'brown-noise', volume = 0.35) {
    try {
      this.stopAmbient();
      this.initContext();
      if (!this.ctx) return;

      const buffer = type === 'rain' ? this.createRainBuffer() : this.createBrownNoiseBuffer();
      if (!buffer) return;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(type === 'rain' ? 1400 : 450, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume * 0.35, this.ctx.currentTime + 1.5);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain || this.ctx.destination);

      source.start();

      this.ambientSource = source;
      this.ambientGain = gain;
      this.isAmbientPlaying = true;
    } catch (e) {
      console.warn('Error starting ambient noise:', e);
    }
  }

  stopAmbient() {
    if (this.ambientGain && this.ctx && this.isAmbientPlaying) {
      try {
        const now = this.ctx.currentTime;
        this.ambientGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
        setTimeout(() => {
          if (this.ambientSource) {
            try {
              this.ambientSource.stop();
              this.ambientSource.disconnect();
            } catch {}
            this.ambientSource = null;
          }
        }, 850);
      } catch {}
    }
    this.isAmbientPlaying = false;
  }

  setAmbientVolume(volume) {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(volume * 0.35, this.ctx.currentTime);
    }
  }
}

window.soundEngine = new SoundEngine();
