// ============================================================
// Connect Four — Dual-Theme Sound Engine
// Synthwave sounds: filtered noise, sawtooth arpeggios.
// Frutiger Aero sounds: clean glass chimes, water-drop clicks,
//   crystalline win fanfare — all synthesised, no files needed.
// ============================================================
'use strict';

// Returns true when the Aero theme is currently active.
function _isAero() {
  return document.documentElement.getAttribute('data-theme') === 'aero';
}

class SoundEngine {
  constructor() {
    this.ctx        = null;
    this.master     = null;
    this.enabled    = true;
    this._lastHover = 0; // throttle hover ticks
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.value = this.enabled ? 0.55 : 0;
    return this.enabled;
  }

  _boot() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    this.ctx    = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.enabled ? 0.55 : 0;
    this.master.connect(this.ctx.destination);
  }

  // -----------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------

  // Short sine bell tone — used for Aero glass chimes
  _bell(freq, gainPeak, startTime, decay, detune = 0) {
    const ctx = this.ctx;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value    = detune;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);

    osc.connect(gain); gain.connect(this.master);
    osc.start(startTime); osc.stop(startTime + decay + 0.02);
  }

  // Soft noise burst — used for smooth Aero drop landing
  _noiseBurst(gainPeak, startTime, dur, lpFreq) {
    const ctx = this.ctx;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buf  = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

    const src  = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type  = 'lowpass';
    filt.frequency.value = lpFreq;
    const env  = ctx.createGain();
    env.gain.setValueAtTime(gainPeak, startTime);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    src.connect(filt); filt.connect(env); env.connect(this.master);
    src.start(startTime); src.stop(startTime + dur + 0.01);
  }

  // -----------------------------------------------------------
  // PIECE DROP
  // Synthwave: low filtered noise “thunk”
  // Aero:       ceramic disk “clack” — a pitched sine hit
  //             with a brief harmonic overtone (like a Go stone
  //             dropped onto a wooden board)
  // -----------------------------------------------------------
  playDrop(fromRow = 0) {
    if (!this.enabled) return;
    this._boot();
    const ctx = this.ctx, t = ctx.currentTime;

    if (_isAero()) {
      // Primary strike tone — drops from high to mid frequency
      const baseFreq = 340 - fromRow * 22;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 2.4, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.70, t + 0.09);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain); gain.connect(this.master);
      osc.start(t); osc.stop(t + 0.20);

      // Ceramic overtone (high harmonic partial — gives “stone” texture)
      this._bell(baseFreq * 4.8, 0.04, t, 0.12);

      // Short noise click for attack transient
      this._noiseBurst(0.08, t, 0.04, 600);
    } else {
      // Synthwave: white noise + low-pass thunk
      const frames = Math.floor(ctx.sampleRate * 0.18);
      const buf  = ctx.createBuffer(1, frames, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

      const src  = ctx.createBufferSource();
      src.buffer = buf;
      const freq = 220 - fromRow * 20;
      const filt = ctx.createBiquadFilter();
      filt.type  = 'lowpass';
      filt.frequency.setValueAtTime(freq * 3, t);
      filt.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.15);
      filt.Q.value = 1.2;

      const env = ctx.createGain();
      env.gain.setValueAtTime(0.5, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      src.connect(filt); filt.connect(env); env.connect(this.master);
      src.start(t); src.stop(t + 0.22);
    }
  }

  // -----------------------------------------------------------
  // BOUNCE
  // Synthwave: softer noise thump
  // Aero:       soft glass tap
  // -----------------------------------------------------------
  playBounce() {
    if (!this.enabled) return;
    this._boot();
    const ctx = this.ctx, t = ctx.currentTime;

    if (_isAero()) {
      // A quick sine decay — like a marble tapping glass
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.exponentialRampToValueAtTime(620, t + 0.055);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(gain); gain.connect(this.master);
      osc.start(t); osc.stop(t + 0.08);
    } else {
      const frames = Math.floor(ctx.sampleRate * 0.06);
      const buf  = ctx.createBuffer(1, frames, ctx.sampleRate);
      const d    = buf.getChannelData(0);
      for (let i = 0; i < frames; i++) d[i] = Math.random() * 2 - 1;
      const src  = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type  = 'lowpass';
      filt.frequency.value = 600;
      const env  = ctx.createGain();
      env.gain.setValueAtTime(0.18, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      src.connect(filt); filt.connect(env); env.connect(this.master);
      src.start(t); src.stop(t + 0.08);
    }
  }

  // -----------------------------------------------------------
  // WIN
  // Synthwave: sawtooth arpeggio + square lead
  // Aero:       ascending crystalline glass chime fanfare
  //             (think Vista startup / system ready chime)
  // -----------------------------------------------------------
  playWin() {
    if (!this.enabled) return;
    this._boot();
    const ctx = this.ctx, t = ctx.currentTime;

    if (_isAero()) {
      // Bright major pentatonic ascent — C E G A C'
      const melody = [523.25, 659.25, 783.99, 880, 1046.5];
      melody.forEach((freq, i) => {
        const at = t + i * 0.13;
        // Primary bell
        this._bell(freq, 0.12, at, 0.80);
        // Octave shimmer
        this._bell(freq * 2, 0.03, at + 0.01, 0.55, 5);
      });

      // Warm harmonic pad beneath (pure sines — "crystal bowl" chord)
      [261.63, 329.63, 392, 523.25].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value    = i * 2;
        gain.gain.setValueAtTime(0, t + 0.1);
        gain.gain.linearRampToValueAtTime(0.055, t + 0.25);
        gain.gain.setValueAtTime(0.055, t + 0.9);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
        osc.connect(gain); gain.connect(this.master);
        osc.start(t + 0.1); osc.stop(t + 1.9);
      });

    } else {
      // Synthwave: synth pad + square arpeggio
      const padFreqs = [261.63, 329.63, 392, 493.88];
      padFreqs.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.detune.value    = (i % 2 === 0) ? 6 : -6;
        const at = t + 0.05;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.08, at + 0.04);
        gain.gain.setValueAtTime(0.08, at + 0.55);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 1.2);
        osc.connect(gain); gain.connect(this.master);
        osc.start(at); osc.stop(at + 1.25);
      });

      const arp = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      arp.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        const at = t + i * 0.11;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.06, at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.28);
        osc.connect(gain); gain.connect(this.master);
        osc.start(at); osc.stop(at + 0.32);
      });
    }
  }

  // -----------------------------------------------------------
  // LOSE
  // Synthwave: descending minor triangle arpeggio + low drone
  // Aero:       descending glass chimes (minor, soft)
  // -----------------------------------------------------------
  playLose() {
    if (!this.enabled) return;
    this._boot();
    const ctx = this.ctx, t = ctx.currentTime;

    if (_isAero()) {
      // Descending minor — E D C B A
      const melody = [659.25, 587.33, 523.25, 493.88, 440];
      melody.forEach((freq, i) => {
        this._bell(freq, 0.08, t + i * 0.14, 0.65);
        // Soft warm partial
        this._bell(freq * 0.5, 0.025, t + i * 0.14 + 0.01, 0.55);
      });

      // Slow sigh pad (pure sine)
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.055, t + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
      osc.connect(gain); gain.connect(this.master);
      osc.start(t); osc.stop(t + 1.7);

    } else {
      const notes = [392, 349.23, 311.13, 261.63, 220];
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const at = t + i * 0.14;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.1, at + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.55);
        osc.connect(gain); gain.connect(this.master);
        osc.start(at); osc.stop(at + 0.58);
      });

      const drone = ctx.createOscillator();
      const dg    = ctx.createGain();
      drone.type  = 'sawtooth';
      drone.frequency.value = 110;
      dg.gain.setValueAtTime(0, t);
      dg.gain.linearRampToValueAtTime(0.07, t + 0.1);
      dg.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
      drone.connect(dg); dg.connect(this.master);
      drone.start(t); drone.stop(t + 1.5);
    }
  }

  // -----------------------------------------------------------
  // DRAW
  // Synthwave: suspended maj7 chord, sines fade slowly
  // Aero:       two gentle glass bells — a soft resolution chord
  // -----------------------------------------------------------
  playDraw() {
    if (!this.enabled) return;
    this._boot();
    const ctx = this.ctx, t = ctx.currentTime;

    if (_isAero()) {
      // Neutral major chord bells — G B D
      [392, 493.88, 587.33, 783.99].forEach((freq, i) => {
        this._bell(freq, 0.07, t + i * 0.06, 1.2, i * 3);
      });
    } else {
      [261.63, 329.63, 392, 493.88].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value    = i * 3;
        gain.gain.setValueAtTime(0.07, t);
        gain.gain.setValueAtTime(0.07, t + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
        osc.connect(gain); gain.connect(this.master);
        osc.start(t); osc.stop(t + 2.1);
      });
    }
  }

  // -----------------------------------------------------------
  // HOVER
  // Synthwave: high sine ping
  // Aero:       very soft glass ting
  // -----------------------------------------------------------
  playHover() {
    if (!this.enabled) return;
    const now = Date.now();
    if (now - this._lastHover < 80) return; // throttle ~12 Hz
    this._lastHover = now;
    this._boot();
    const ctx = this.ctx, t = ctx.currentTime;

    if (_isAero()) {
      // Feather-light glass bing
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3200, t);
      osc.frequency.exponentialRampToValueAtTime(2200, t + 0.06);
      gain.gain.setValueAtTime(0.018, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain); gain.connect(this.master);
      osc.start(t); osc.stop(t + 0.09);
    } else {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, t);
      osc.frequency.exponentialRampToValueAtTime(1800, t + 0.06);
      gain.gain.setValueAtTime(0.025, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain); gain.connect(this.master);
      osc.start(t); osc.stop(t + 0.08);
    }
  }

  // -----------------------------------------------------------
  // CLICK (button press)
  // Synthwave: square-wave chirp
  // Aero:       soft marimba-like tap (sine + slight attack transient)
  // -----------------------------------------------------------
  playClick() {
    if (!this.enabled) return;
    this._boot();
    const ctx = this.ctx, t = ctx.currentTime;

    if (_isAero()) {
      // Warm marimba tap: sine with fast attack transient
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1100, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.04);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
      osc.connect(gain); gain.connect(this.master);
      osc.start(t); osc.stop(t + 0.12);

      // Soft octave partial
      this._bell(880, 0.025, t, 0.12);
    } else {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.05);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(gain); gain.connect(this.master);
      osc.start(t); osc.stop(t + 0.07);
    }
  }
}

// Singleton
const soundEngine = new SoundEngine();
