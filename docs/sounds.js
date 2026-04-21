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


// ============================================================
// Connect Four — Music Engine
// Synthesised ambient background loops, fully independent of
// the SFX SoundEngine.  Two themes:
//   Synthwave — "Neon Grid":  120 BPM, 8 s loop
//   Aero      — "Aero Drift":  72 BPM, 26.7 s loop, flowing chords
// ============================================================

class MusicEngine {
  constructor() {
    this.enabled       = true;
    this.ctx           = null;
    this.musicMaster   = null;
    this._loopTimer    = null;
    this._pendingTheme = null;   // queued theme for next loop boundary
  }

  // ── Public API ─────────────────────────────────────────────

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this._ensureCtx();
      this._startLoop();
    } else {
      this._fadeOut(0.5);
      if (this._loopTimer) { clearTimeout(this._loopTimer); this._loopTimer = null; }
    }
    return this.enabled;
  }

  /**
   * Immediately cross-fade to the new theme's music track.
   * If music is off, records the pending theme so it starts
   * correctly when the user next enables music.
   */
  switchTheme() {
    const next = _isAero() ? 'aero' : 'synthwave';
    this._pendingTheme = next;
    if (!this.enabled) return;   // not playing — theme applied on next toggle
    // Cancel current loop and cross-fade to new theme
    if (this._loopTimer) { clearTimeout(this._loopTimer); this._loopTimer = null; }
    this._fadeOut(0.4);
    setTimeout(() => this._startLoop(), 420);
  }

  // ── Private ────────────────────────────────────────────────

  _ensureCtx() {
    if (!this.ctx) {
      this.ctx = (soundEngine && soundEngine.ctx)
        ? soundEngine.ctx
        : new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.musicMaster) {
      this.musicMaster = this.ctx.createGain();
      this.musicMaster.gain.value = 0;
      this.musicMaster.connect(this.ctx.destination);
    }
  }

  _fadeOut(dur) {
    if (!this.musicMaster) return;
    const g = this.musicMaster.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(g.value, this.ctx.currentTime);
    g.linearRampToValueAtTime(0, this.ctx.currentTime + dur);
  }

  _fadeIn(target, dur) {
    const g = this.musicMaster.gain;
    if (g.value >= target * 0.8) return;   // already at volume — skip ramp
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(g.value, this.ctx.currentTime);
    g.linearRampToValueAtTime(target, this.ctx.currentTime + dur);
  }

  _startLoop() {
    if (!this.enabled) return;
    this._ensureCtx();

    const theme = this._pendingTheme || (_isAero() ? 'aero' : 'synthwave');
    this._pendingTheme = null;

    this._fadeIn(theme === 'aero' ? 0.22 : 0.12, 1.5);

    const loopMs = theme === 'aero'
      ? this._scheduleAero()
      : this._scheduleSynthwave();

    this._loopTimer = setTimeout(() => this._startLoop(), loopMs - 60);
  }

  // ── Note helpers ───────────────────────────────────────────

  _osc(type, freq, detune, startT, stopT, peak, attack, release) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(peak, startT + attack);
    gain.gain.setValueAtTime(peak, stopT - release);
    gain.gain.linearRampToValueAtTime(0, stopT);
    osc.connect(gain); gain.connect(this.musicMaster);
    osc.start(startT); osc.stop(stopT + 0.06);
  }

  _bell(freq, peak, startT, decay, detune = 0) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq; osc.detune.value = detune;
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(peak, startT + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + decay);
    osc.connect(gain); gain.connect(this.musicMaster);
    osc.start(startT); osc.stop(startT + decay + 0.05);
  }

  // ── Synthwave — "Neon Grid" ────────────────────────────────
  // 120 BPM · 4 bars · 8 s  ·  Am–F–C–G  ·  bass + detuned pad + arp
  _scheduleSynthwave() {
    const ctx = this.ctx, t = ctx.currentTime + 0.02;
    const beat = 0.5, bar = 2.0, loop = 8.0;
    const roots = [220, 174.61, 261.63, 196];
    const iv    = [1, 1.189, 1.498, 1.782];

    // Bass — one per bar
    roots.forEach((r, bi) => {
      const nt = t + bi * bar;
      this._osc('sawtooth', r / 2, 0, nt, nt + bar * 0.88, 0.18, 0.04, 0.12);
    });

    // Pad — detuned saw, holds at full volume right to the boundary
    [[220, 6], [220, -6], [329.63, 5], [329.63, -5]].forEach(([f, det], i) => {
      const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
      lfo.frequency.value = 0.28 + i * 0.04; lfoG.gain.value = 4;
      lfo.connect(lfoG);
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = f; osc.detune.value = det;
      lfoG.connect(osc.detune);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.042, t + 0.4);
      gain.gain.setValueAtTime(0.042, t + loop - 0.06);
      gain.gain.linearRampToValueAtTime(0, t + loop);
      osc.connect(gain); gain.connect(this.musicMaster);
      lfo.start(t); osc.start(t); lfo.stop(t + loop); osc.stop(t + loop);
    });

    // Arp — square, 16th notes
    const s16 = beat / 4;
    const pat = [0, 1, 2, 3, 2, 1, 0, 2, 1, 3, 0, 2, 3, 1, 2, 0];
    for (let bi = 0; bi < 4; bi++) {
      const root = roots[bi];
      pat.forEach((ivIdx, ni) => {
        const nt = t + bi * bar + ni * s16;
        const fr = root * iv[ivIdx % 4];
        this._osc('square', fr * 2, 0, nt, nt + s16 * 0.70, 0.032, 0.01, 0.05);
      });
    }

    return Math.round(loop * 1000);
  }

  // ── Aero — "Aero Flow" ────────────────────────────────────
  // 96 BPM · 8 bars · ~20.0 s
  // Cmaj7 (2 bars) → Am7 (2 bars) → Fmaj7 (2 bars) → G6 (2 bars)
  // Sine chord pads with slow bloom, vibraphone-style melody, C2 sub drone.
  // Added bubbly 'water drop' arpeggios for extra Frutiger Aero aesthetic.
  // No per-loop fade-in/out — pads hold right to boundary for seamless loops.
  _scheduleAero() {
    const ctx = this.ctx, t = ctx.currentTime + 0.02;
    const beat = 60 / 96, bar = beat * 4, loop = bar * 8;

    // Chord voicings — 4 tones each
    //   Cmaj7: C3 E3 G3 B3    Am7: A2 C3 E3 G3
    //   Fmaj7: F2 A2 C3 E3    G6:  G2 B2 D3 E3
    const chords = [
      [130.81, 164.81, 196.00, 246.94],
      [110.00, 130.81, 164.81, 196.00],
      [ 87.31, 110.00, 130.81, 164.81],
      [ 98.00, 123.47, 146.83, 164.81],
    ];

    chords.forEach((freqs, ci) => {
      const cs = t + ci * bar * 2;
      const ce = cs + bar * 2 + 0.10;   // 100ms overlap for gentle cross-fade

      freqs.forEach((freq, fi) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        osc.detune.value = (fi % 2 === 0 ? 1 : -1) * (fi + 1);
        gain.gain.setValueAtTime(0, cs);
        gain.gain.linearRampToValueAtTime(0.050, cs + 1.6);    // slow bloom
        gain.gain.setValueAtTime(0.050, cs + bar * 2 - 1.0);
        gain.gain.linearRampToValueAtTime(0, ce);
        osc.connect(gain); gain.connect(this.musicMaster);
        osc.start(cs); osc.stop(ce + 0.05);
      });

      // Soft octave shimmer on the 3rd of each chord
      const shim = ctx.createOscillator(), shimG = ctx.createGain();
      shim.type = 'sine'; shim.frequency.value = freqs[1] * 2;
      shimG.gain.setValueAtTime(0, cs);
      shimG.gain.linearRampToValueAtTime(0.013, cs + 2.0);
      shimG.gain.setValueAtTime(0.013, cs + bar * 2 - 1.2);
      shimG.gain.linearRampToValueAtTime(0, ce);
      shim.connect(shimG); shimG.connect(this.musicMaster);
      shim.start(cs); shim.stop(ce + 0.05);
    });

    // Vibraphone-style melody: one bell per beat, legato decay
    const melody = [
      // bars 1-2  Cmaj7
      [392.00,1.0],[329.63,0.7],[392.00,0.6],[440.00,1.1],
      [392.00,0.9],[329.63,0.7],[261.63,0.6],[293.66,0.8],
      // bars 3-4  Am7
      [220.00,1.1],[261.63,0.8],[293.66,0.7],[329.63,1.0],
      [293.66,0.8],[261.63,0.7],[220.00,0.6],[246.94,0.9],
      // bars 5-6  Fmaj7
      [261.63,1.0],[293.66,0.8],[329.63,0.7],[261.63,0.9],
      [220.00,0.8],[196.00,0.7],[220.00,0.6],[261.63,1.0],
      // bars 7-8  G6
      [293.66,1.1],[329.63,0.9],[392.00,0.8],[329.63,0.7],
      [293.66,0.9],[261.63,0.8],[246.94,0.7],[261.63,1.0],
    ];
    melody.forEach(([freq, vol], ni) => {
      const nt = t + ni * beat;
      this._bell(freq, 0.038 * vol, nt, beat * 1.9); // Boosted melody
      if (ni % 4 === 0) this._bell(freq * 2, 0.012, nt + 0.02, beat * 1.1); // Boosted shimmer
    });

    // C2 sub drone — warmth without weight
    const sub = ctx.createOscillator(), subG = ctx.createGain();
    sub.type = 'sine'; sub.frequency.value = 65.41;
    subG.gain.setValueAtTime(0, t);
    subG.gain.linearRampToValueAtTime(0.024, t + 3.0);
    subG.gain.setValueAtTime(0.024, t + loop - 3.0);
    subG.gain.linearRampToValueAtTime(0, t + loop);
    sub.connect(subG); subG.connect(this.musicMaster);
    sub.start(t); sub.stop(t + loop + 0.06);

    // Bubbly water drops (syncopated 8th notes, matching chords)
    const chordScales = [
      [523.25, 659.25, 783.99, 880.00, 1046.5], // Cmaj7 pentatonic
      [440.00, 523.25, 659.25, 783.99, 880.00], // Am7 pentatonic
      [349.23, 440.00, 523.25, 659.25, 698.46], // Fmaj7 pentatonic
      [392.00, 493.88, 587.33, 659.25, 783.99]  // G6 pentatonic
    ];
    const dropPat = [0, 2, 1, 3, 2, 4, 3, 1]; // ascending/descending motif
    for (let ci = 0; ci < 4; ci++) { // 4 chords
      const scale = chordScales[ci];
      for (let b = 0; b < 16; b++) { // 16 eighth notes in 2 bars
        const nt = t + ci * bar * 2 + b * (beat / 2);
        // Play mostly on off-beats for a floating, bubbly feel
        if (b % 4 !== 0 || b === 12) { 
          const f = scale[dropPat[b % 8]];
          this._bell(f * 2, 0.015, nt, 0.15, 0); // Fast, glassy high-pitch droplet
        }
      }
    }

    return Math.round(loop * 1000);
  }
}

const musicEngine = new MusicEngine();
