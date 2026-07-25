/* ===========================================================================
   SOUND — synthesised, not sampled.
   ---------------------------------------------------------------------------
   Every sound here is generated with the Web Audio API at runtime. That keeps
   the game a single folder with no media files, which matters because the whole
   thing has to run from a local file with no server and no network.

   Browsers refuse to start audio until the user interacts with the page, so the
   context is created lazily on the first click and stays muted until then.
   =========================================================================== */

const Sound = {
  ctx: null,
  master: null,
  ready: false,
  lastPlay: {},          // per-name throttle, so a fast fight is not a buzzsaw

  init() {
    // created on first gesture; calling this early is harmless
    const start = () => {
      if (this.ready) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = S.settings.sound ? S.settings.volume : 0;
        this.master.connect(this.ctx.destination);
        this.ready = true;
      } catch (e) { /* audio simply will not work here; the game does not care */ }
    };
    document.addEventListener("pointerdown", start, { once: true });
    document.addEventListener("keydown", start, { once: true });
  },

  setVolume(v) {
    S.settings.volume = clamp(v, 0, 1);
    if (this.master) this.master.gain.value = S.settings.sound ? S.settings.volume : 0;
    saveGame();
  },

  setEnabled(on) {
    S.settings.sound = !!on;
    if (this.master) this.master.gain.value = on ? S.settings.volume : 0;
    saveGame();
  },

  /* One shaped oscillator. Everything below is built from this. */
  tone(opts) {
    if (!this.ready || !S.settings.sound) return;
    const o = opts || {};
    const t0 = this.ctx.currentTime + (o.delay || 0);
    const dur = o.dur || 0.12;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.from || 440, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + dur);

    const peak = (o.gain === undefined ? 0.25 : o.gain);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.02, dur * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain); gain.connect(this.master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  },

  /* Filtered white noise — impacts, hits, salvage. */
  noise(opts) {
    if (!this.ready || !S.settings.sound) return;
    const o = opts || {};
    const dur = o.dur || 0.10;
    const t0 = this.ctx.currentTime + (o.delay || 0);
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = o.filter || "bandpass";
    filt.frequency.value = o.freq || 900;
    filt.Q.value = o.q || 1.1;
    const gain = this.ctx.createGain();
    gain.gain.value = (o.gain === undefined ? 0.20 : o.gain);

    src.connect(filt); filt.connect(gain); gain.connect(this.master);
    src.start(t0);
  },

  /* Throttled so a 8x-speed fight does not produce a solid wall of noise. */
  play(name, minGap) {
    if (!this.ready || !S.settings.sound) return;
    const now = performance.now();
    const gap = minGap === undefined ? 60 : minGap;
    if (this.lastPlay[name] && now - this.lastPlay[name] < gap) return;
    this.lastPlay[name] = now;
    const fn = this.bank[name];
    if (fn) fn.call(this);
  },

  bank: {
    click()    { this.tone({ type: "triangle", from: 520, to: 380, dur: 0.05, gain: 0.10 }); },
    hover()    { this.tone({ type: "sine", from: 700, dur: 0.03, gain: 0.04 }); },
    hit()      { this.noise({ freq: 700, dur: 0.07, gain: 0.10, filter: "bandpass" }); },
    crit()     { this.noise({ freq: 1400, dur: 0.10, gain: 0.16 });
                 this.tone({ type: "square", from: 720, to: 300, dur: 0.11, gain: 0.10 }); },
    hurt()     { this.tone({ type: "sawtooth", from: 190, to: 90, dur: 0.13, gain: 0.10 }); },
    spell()    { this.tone({ type: "sine", from: 480, to: 900, dur: 0.16, gain: 0.10 }); },
    proc()     { this.tone({ type: "triangle", from: 900, to: 1500, dur: 0.10, gain: 0.09 }); },
    potion()   { this.tone({ type: "sine", from: 300, to: 760, dur: 0.20, gain: 0.11 }); },
    loot()     { this.tone({ type: "sine", from: 880, dur: 0.09, gain: 0.10 });
                 this.tone({ type: "sine", from: 1320, dur: 0.11, gain: 0.09, delay: 0.07 }); },
    rare()     { [660, 880, 1100].forEach((f, i) =>
                   this.tone({ type: "sine", from: f, dur: 0.16, gain: 0.10, delay: i * 0.07 })); },
    levelup()  { [523, 659, 784, 1047].forEach((f, i) =>
                   this.tone({ type: "triangle", from: f, dur: 0.26, gain: 0.13, delay: i * 0.09 })); },
    victory()  { [587, 784].forEach((f, i) =>
                   this.tone({ type: "sine", from: f, dur: 0.16, gain: 0.09, delay: i * 0.08 })); },
    defeat()   { this.tone({ type: "sawtooth", from: 260, to: 70, dur: 0.55, gain: 0.13 }); },
    craft()    { this.noise({ freq: 420, dur: 0.13, gain: 0.16, filter: "lowpass" });
                 this.tone({ type: "square", from: 240, to: 170, dur: 0.13, gain: 0.07, delay: 0.05 }); },
    salvage()  { this.noise({ freq: 2200, dur: 0.16, gain: 0.11, filter: "highpass" }); },
    coin()     { [1200, 1600].forEach((f, i) =>
                   this.tone({ type: "sine", from: f, dur: 0.07, gain: 0.08, delay: i * 0.04 })); },
    error()    { this.tone({ type: "square", from: 200, to: 150, dur: 0.14, gain: 0.09 }); },
  },
};
