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
//   Synthwave — "Neon Grid": 120 BPM, minor bass+arp+pad
//   Aero      — "Crystal Meadow": 90 BPM, pentatonic bells+pad
// ============================================================

class MusicEngine {
  constructor() {
    this.enabled      = false;   // off by default — user opts in
    this.ctx          = null;    // shared with SoundEngine lazily
    this.musicMaster  = null;    // dedicated gain for music (≠ SFX master)
    this._loopTimer   = null;    // setTimeout handle for next bar
    this._stopping    = false;   // fade-out in progress guard
    this._currentTheme = null;   // 'synthwave' | 'aero'
  }

  // ── Public API ─────────────────────────────────────────────

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this._ensureCtx();
      this._currentTheme = _isAero() ? 'aero' : 'synthwave';
      this._startLoop();
    } else {
      this._stopLoop(false);
    }
    return this.enabled;
  }

  /** Called when the user switches theme. Cross-fades to the new track. */
  switchTheme() {
    if (!this.enabled) {
      this._currentTheme = _isAero() ? 'aero' : 'synthwave';
      return;
    }
    this._stopLoop(true);   // fade out + restart
  }

  // ── Private ────────────────────────────────────────────────

  _ensureCtx() {
    // Try to reuse SoundEngine's context when available
    if (!this.ctx) {
      if (soundEngine && soundEngine.ctx) {
        this.ctx = soundEngine.ctx;
      } else {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();

    if (!this.musicMaster) {
      this.musicMaster = this.ctx.createGain();
      this.musicMaster.gain.value = 0;
      this.musicMaster.connect(this.ctx.destination);
    }
  }

  // Fade a gain node from current value to target over `dur` seconds
  _fade(gainNode, target, dur) {
    const g = gainNode.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(g.value, this.ctx.currentTime);
    g.linearRampToValueAtTime(target, this.ctx.currentTime + dur);
  }

  _startLoop() {
    if (!this.enabled || this._stopping) return;
    this._ensureCtx();
    const theme = _isAero() ? 'aero' : 'synthwave';
    this._currentTheme = theme;

    // Fade in
    this._fade(this.musicMaster, theme === 'aero' ? 0.10 : 0.12, 0.6);

    // Schedule one bar and queue the next
    const barMs = theme === 'aero' ? this._scheduleAero() : this._scheduleSynthwave();
    this._loopTimer = setTimeout(() => this._startLoop(), barMs - 40);
  }

  _stopLoop(thenRestart = false) {
    this._stopping = true;
    if (this._loopTimer) { clearTimeout(this._loopTimer); this._loopTimer = null; }

    if (this.musicMaster) {
      this._fade(this.musicMaster, 0, 0.4);
    }
    setTimeout(() => {
      this._stopping = false;
      if (thenRestart && this.enabled) {
        this._currentTheme = _isAero() ? 'aero' : 'synthwave';
        this._startLoop();
      }
    }, 500);
  }

  // ── Helpers ────────────────────────────────────────────────

  _osc(type, freq, detune, startT, stopT, gainPeak, attackT, decayT) {
    const ctx  = this.ctx;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (detune) osc.detune.value = detune;
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(gainPeak, startT + attackT);
    gain.gain.setValueAtTime(gainPeak, stopT - decayT);
    gain.gain.linearRampToValueAtTime(0, stopT);
    osc.connect(gain); gain.connect(this.musicMaster);
    osc.start(startT); osc.stop(stopT + 0.05);
  }

  _bell(freq, gainPeak, startT, decay, detune = 0) {
    const ctx  = this.ctx;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(0, startT);
    gain.gain.linearRampToValueAtTime(gainPeak, startT + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + decay);
    osc.connect(gain); gain.connect(this.musicMaster);
    osc.start(startT); osc.stop(startT + decay + 0.05);
  }

  // ── Synthwave Track — "Neon Grid" ──────────────────────────
  // 120 BPM · 4 bars of 4/4 = 8 seconds per loop
  // Chord progression: Am – F – C – G (i–VI–III–VII)
  _scheduleSynthwave() {
    const ctx   = this.ctx;
    const t     = ctx.currentTime + 0.02;
    const BPM   = 120;
    const beat  = 60 / BPM;          // 0.5 s
    const bar   = beat * 4;           // 2.0 s
    const loop  = bar * 4;            // 8.0 s

    // Chord roots (Hz): Am=220 F=174.61 C=261.63 G=196
    const roots = [220, 174.61, 261.63, 196];
    // Minor-7 arpeggio intervals (relative to root): root, m3, P5, m7
    const arpIntervals = [1, 1.189, 1.498, 1.782];

    // ── Bass — sawtooth root, one note per bar ──
    roots.forEach((root, bi) => {
      const noteT = t + bi * bar;
      this._osc('sawtooth', root / 2, 0, noteT, noteT + bar * 0.88, 0.18, 0.04, 0.12);
    });

    // ── Pad — detuned saw pair: tonic (Am) holds for 4 bars ──
    [[220, 6], [220, -6], [329.63, 5], [329.63, -5]].forEach(([f, det], i) => {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.28 + i * 0.04;
      lfoGain.gain.value = 4;
      lfo.connect(lfoGain);
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.detune.value = det;
      lfoGain.connect(osc.detune);  // vibrato
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.045, t + 0.3);
      gain.gain.setValueAtTime(0.045, t + loop - 0.4);
      gain.gain.linearRampToValueAtTime(0, t + loop);
      osc.connect(gain); gain.connect(this.musicMaster);
      lfo.start(t); osc.start(t); lfo.stop(t + loop); osc.stop(t + loop);
    });

    // ── Arp — square wave, 16th-note pattern, rides chord tones ──
    const sixteenth = beat / 4;
    for (let bi = 0; bi < 4; bi++) {
      const root = roots[bi];
      // 4 beats × 4 sixteenths = 16 notes per bar; play a rising+falling pattern
      const pattern = [0, 1, 2, 3, 2, 1, 0, 2, 1, 3, 0, 2, 3, 1, 2, 0];
      pattern.forEach((ivIdx, ni) => {
        const noteT = t + bi * bar + ni * sixteenth;
        const freq  = root * arpIntervals[ivIdx % arpIntervals.length];
        const dur   = sixteenth * 0.72;
        this._osc('square', freq * 2, 0, noteT, noteT + dur, 0.035, 0.01, 0.06);
      });
    }

    return Math.round(loop * 1000); // ms until next loop
  }

  // ── Aero Track — "Crystal Meadow" ─────────────────────────
  // 90 BPM · 4 bars of 4/4 ≈ 10.67 seconds per loop
  // Key: C major pentatonic — C D E G A
  _scheduleAero() {
    const ctx  = this.ctx;
    const t    = ctx.currentTime + 0.02;
    const BPM  = 90;
    const beat  = 60 / BPM;          // ~0.667 s
    const bar   = beat * 4;           // ~2.667 s
    const loop  = bar * 4;            // ~10.667 s

    // C major pentatonic: C4 D4 E4 G4 A4 C5
    const penta = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];

    // ── Soft sine pad (C major chord) — whole loop ──
    [[261.63, 3], [329.63, -3], [392.00, 5]].forEach(([f, det]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.detune.value = det;
      // Tremolo via LFO
      const lfo  = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 3.5;
      lfoG.gain.value = 0.008;
      lfo.connect(lfoG); lfoG.connect(gain.gain);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.038, t + 0.5);
      gain.gain.setValueAtTime(0.038, t + loop - 0.5);
      gain.gain.linearRampToValueAtTime(0, t + loop);
      osc.connect(gain); gain.connect(this.musicMaster);
      lfo.start(t); osc.start(t); lfo.stop(t + loop); osc.stop(t + loop);
    });

    // ── Bell melody — ascending pentatonic phrase, varies by bar ──
    const melodyPatterns = [
      [0, 2, 4, 3, 1, 3, 2, 4],   // bar 1
      [2, 4, 5, 3, 4, 2, 3, 1],   // bar 2
      [1, 3, 2, 4, 3, 5, 4, 2],   // bar 3
      [4, 3, 2, 1, 0, 2, 1, 3],   // bar 4
    ];
    const eighth = beat / 2;
    melodyPatterns.forEach((pat, bi) => {
      pat.forEach((pIdx, ni) => {
        const noteT = t + bi * bar + ni * eighth;
        const freq  = penta[pIdx];
        // alternately use upper octave for shimmer
        const oct   = ni % 3 === 2 ? 2 : 1;
        this._bell(freq * oct, 0.045 - ni * 0.002, noteT, 0.55, (ni % 2) * 4);
      });
    });

    // ── Accent bells on beat 1 and 3 of each bar ──
    for (let bi = 0; bi < 4; bi++) {
      this._bell(penta[4] * 2, 0.025, t + bi * bar, 0.80);            // beat 1
      this._bell(penta[2] * 2, 0.018, t + bi * bar + beat * 2, 0.70); // beat 3
    }

    return Math.round(loop * 1000);
  }
}

const musicEngine = new MusicEngine();
