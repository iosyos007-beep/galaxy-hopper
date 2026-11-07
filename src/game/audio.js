// All sounds are synthesized with the Web Audio API — no sound files needed.
// Browsers only allow audio after a tap, so call unlock() from a touch/click handler.
export class GameAudio {
  constructor() { this.ac = null; this.muted = false; this.musicOn = true; }

  unlock() {
    try {
      if (!this.ac) this.build();
      if (this.ac && this.ac.state === 'suspended') this.ac.resume();
    } catch (e) { console.warn('Audio unavailable', e); }
  }

  build() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ac = new AC(); this.ac = ac;
    this.master = ac.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.connect(this.master);
    this.sfxBus = ac.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(comp);

    const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;

    // engine = filtered noise + low saw hum
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
    const eg = ac.createGain(); eg.gain.value = 0; src.connect(f); f.connect(eg); eg.connect(comp); src.start();
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 52;
    const of = ac.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 220;
    const og = ac.createGain(); og.gain.value = 0; o.connect(of); of.connect(og); og.connect(comp); o.start();
    this.eng = { f, eg, o, og };

    // music bus with a little echo
    this.musicBus = ac.createGain(); this.musicBus.gain.value = this.musicOn ? 0.2 : 0;
    const dl = ac.createDelay(); dl.delayTime.value = 0.285; const fb = ac.createGain(); fb.gain.value = 0.32;
    const wet = ac.createGain(); wet.gain.value = 0.5;
    this.musicBus.connect(comp); this.musicBus.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(comp);
    this.nextNote = ac.currentTime + 0.15; this.step = 0;
  }

  get ready() { return this.ac && this.ac.state === 'running'; }

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ac.currentTime, 0.05); }
  setMusic(on) { this.musicOn = on; if (this.musicBus) this.musicBus.gain.value = on ? 0.2 : 0; }

  tone(f, t, dur, type, vol, dest, f2) {
    const ac = this.ac; const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxBus); o.start(t); o.stop(t + dur + 0.05);
  }

  noise(t, dur, vol, freq) {
    const ac = this.ac; const s = ac.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(70, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  sfx(name) {
    if (!this.ready) return;
    const t = this.ac.currentTime + 0.005;
    switch (name) {
      case 'coin': this.tone(1318.5, t, 0.09, 'square', 0.06); this.tone(1975.5, t + 0.065, 0.16, 'square', 0.05); break;
      case 'fuel': [523.3, 659.3, 784, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.06, 0.16, 'triangle', 0.16)); break;
      case 'hit': this.noise(t, 0.45, 0.55, 1800); this.tone(190, t, 0.4, 'sawtooth', 0.16, null, 45); break;
      case 'boom': this.noise(t, 1.3, 0.8, 2600); this.tone(120, t, 1.1, 'sawtooth', 0.22, null, 28); break;
      case 'win':
        [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => this.tone(f, t + i * 0.1, 0.32, 'triangle', 0.16));
        [523.3, 659.3, 784].forEach((f) => this.tone(f, t + 0.55, 1.1, 'triangle', 0.1)); break;
      case 'start': this.tone(180, t, 0.6, 'sawtooth', 0.07, null, 900); this.noise(t, 0.7, 0.25, 3000); break;
      case 'nofuel': this.tone(440, t, 0.25, 'square', 0.06, null, 220); this.tone(330, t + 0.26, 0.4, 'square', 0.06, null, 110); break;
      case 'click': this.tone(880, t, 0.06, 'triangle', 0.08); break;
    }
  }

  // Called every frame: engine loudness + music sequencer.
  tick({ engineOn, thrusting, paused }) {
    if (!this.ready) return;
    const now = this.ac.currentTime, on = engineOn && !paused, th = on && thrusting;
    this.eng.eg.gain.setTargetAtTime(on ? (th ? 0.16 : 0.05) : 0, now, 0.06);
    this.eng.f.frequency.setTargetAtTime(th ? 1200 : 380, now, 0.08);
    this.eng.og.gain.setTargetAtTime(on ? (th ? 0.06 : 0.03) : 0, now, 0.08);
    this.eng.o.frequency.setTargetAtTime(th ? 78 : 52, now, 0.1);
    if (paused || !this.musicOn) return;
    if (this.nextNote < now - 0.5) this.nextNote = now + 0.05;
    const chords = [[60, 64, 67, 72], [59, 62, 67, 71], [57, 60, 64, 69], [57, 60, 65, 69]]; // C G Am F
    const roots = [48, 43, 45, 41], pat = [0, 1, 2, 3, 2, 1, 3, 2];
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    while (this.nextNote < now + 0.25) {
      const st = this.step, bar = Math.floor(st / 8) % 4;
      this.tone(mtof(chords[bar][pat[st % 8]] + 12), this.nextNote, 0.24, 'triangle', 0.08, this.musicBus);
      if (st % 4 === 0) this.tone(mtof(roots[bar]), this.nextNote, 0.7, 'sine', 0.2, this.musicBus);
      this.nextNote += 0.19; this.step++;
    }
  }
}
