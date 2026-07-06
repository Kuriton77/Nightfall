// Procedural audio via the WebAudio API — no asset files required. Three gain
// buses (master -> destination, music -> master, sfx -> master) map directly to
// the three volume settings. SFX are short synthesized tones; music is a soft
// looping arpeggio. The AudioContext is created lazily and resumed on the first
// user gesture (menu click), per browser autoplay policy.

const SFX = {
  shoot: { type: 'triangle', from: 640, to: 420, dur: 0.07, gain: 0.18 },
  hit: { type: 'square', from: 220, to: 130, dur: 0.05, gain: 0.14 },
  pickup: { type: 'sine', from: 520, to: 840, dur: 0.09, gain: 0.22 },
  hurt: { type: 'sawtooth', from: 300, to: 90, dur: 0.18, gain: 0.28 },
  death: { type: 'sawtooth', from: 240, to: 55, dur: 0.6, gain: 0.32 },
  click: { type: 'sine', from: 460, to: 460, dur: 0.05, gain: 0.2 },
  levelup: { type: 'triangle', from: 523, to: 1046, dur: 0.28, gain: 0.24 },
  heal: { type: 'sine', from: 660, to: 990, dur: 0.22, gain: 0.24 },
  bomb: { type: 'sawtooth', from: 180, to: 40, dur: 0.5, gain: 0.34 },
  victory: { type: 'triangle', from: 523, to: 1568, dur: 0.5, gain: 0.28 },
  bossSpawn: { type: 'sawtooth', from: 60, to: 220, dur: 0.9, gain: 0.3 },
  bossDeath: { type: 'sawtooth', from: 500, to: 30, dur: 1.2, gain: 0.34 },
  bossShot: { type: 'square', from: 340, to: 180, dur: 0.09, gain: 0.15 },
  charge: { type: 'sawtooth', from: 130, to: 360, dur: 0.32, gain: 0.24 },
  dash: { type: 'sine', from: 300, to: 780, dur: 0.14, gain: 0.2 },
  sword: { type: 'square', from: 520, to: 300, dur: 0.06, gain: 0.13 },
  swordThrow: { type: 'sawtooth', from: 380, to: 820, dur: 0.16, gain: 0.2 },
  dashReset: { type: 'triangle', from: 660, to: 1320, dur: 0.22, gain: 0.22 },
  freeze: { type: 'sine', from: 900, to: 280, dur: 0.4, gain: 0.22 },
  rage: { type: 'sawtooth', from: 150, to: 340, dur: 0.3, gain: 0.24 },
  magnet: { type: 'sine', from: 420, to: 900, dur: 0.2, gain: 0.2 },
  treeHit: { type: 'square', from: 200, to: 120, dur: 0.05, gain: 0.11 },
  treeBreak: { type: 'sawtooth', from: 170, to: 55, dur: 0.3, gain: 0.22 },
};

// A gentle A-minor-ish arpeggio pattern (Hz), one note per step.
const MUSIC_PATTERN = [220, 261.63, 329.63, 261.63, 293.66, 349.23, 293.66, 261.63];
const MUSIC_STEP = 0.42; // seconds per note

export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this._throttle = new Map();
    this._musicTimer = null;
    this._musicStep = 0;
    this._nextNoteTime = 0;
  }

  _ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.applyVolumes();
  }

  // Call from a user gesture so audio is allowed to start.
  resume() {
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.settings.get('masterVolume');
    this.musicBus.gain.value = this.settings.get('musicVolume');
    this.sfxBus.gain.value = this.settings.get('sfxVolume');
  }

  _tone(spec, destination) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, spec.to), now + spec.dur);
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(spec.gain, now + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, now + spec.dur);
    osc.connect(env);
    env.connect(destination);
    osc.start(now);
    osc.stop(now + spec.dur + 0.02);
  }

  playSfx(name) {
    if (!this.ctx) return;
    const spec = SFX[name];
    if (spec) this._tone(spec, this.sfxBus);
  }

  // Rate-limited SFX so high-frequency events (shots/hits) never spam the mixer.
  playThrottled(name, minMs = 55) {
    if (!this.ctx) return;
    const now = performance.now();
    const last = this._throttle.get(name) || 0;
    if (now - last < minMs) return;
    this._throttle.set(name, now);
    this.playSfx(name);
  }

  startMusic() {
    if (!this.ctx || this._musicTimer !== null) return;
    this._nextNoteTime = this.ctx.currentTime;
    // Look-ahead scheduler keeps timing stable regardless of JS jitter.
    this._musicTimer = setInterval(() => this._scheduleMusic(), 60);
  }

  stopMusic() {
    if (this._musicTimer !== null) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }

  _scheduleMusic() {
    if (!this.ctx) return;
    while (this._nextNoteTime < this.ctx.currentTime + 0.2) {
      const freq = MUSIC_PATTERN[this._musicStep % MUSIC_PATTERN.length];
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = this._nextNoteTime;
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.12, t + 0.04);
      env.gain.exponentialRampToValueAtTime(0.0001, t + MUSIC_STEP * 0.9);
      osc.connect(env);
      env.connect(this.musicBus);
      osc.start(t);
      osc.stop(t + MUSIC_STEP);
      this._musicStep++;
      this._nextNoteTime += MUSIC_STEP;
    }
  }
}
