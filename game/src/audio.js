// Shadow Protocol — synthesized sound only (WebAudio, no audio files).
// Footsteps, keycard chime, alarm sting and a low ambient drone.
export function makeAudio() {
  const audio = {
    ctx: null,
    master: null,
    muted: false,
    ensure() {
      if (this.ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      } catch { /* sound is optional */ }
    },
    resume() { this.ensure(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    blip(freq, dur, type, vol, when = 0) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol || 0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    // Short filtered-noise thock, pitched by who is walking.
    footstep(vol, low) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const len = this.ctx.sampleRate * 0.07;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = low ? 300 : 700;
      const gain = this.ctx.createGain();
      gain.gain.value = vol;
      src.connect(filter).connect(gain).connect(this.master);
      src.start(t);
    },
    pickup() { this.blip(660, 0.12, 'sine', 0.2); this.blip(990, 0.18, 'sine', 0.2, 0.09); },
    alarm() {
      this.blip(220, 0.22, 'sawtooth', 0.22);
      this.blip(165, 0.3, 'sawtooth', 0.22, 0.18);
      this.blip(330, 0.2, 'square', 0.12, 0.36);
    },
    caught() { this.blip(110, 0.5, 'sawtooth', 0.25); this.blip(82, 0.7, 'sawtooth', 0.25, 0.2); },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.25, 'triangle', 0.2, i * 0.12));
    },
    click() { this.blip(440, 0.06, 'square', 0.08); },
  };
  return audio;
}
