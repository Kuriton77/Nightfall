import { clamp } from './math.js';

// Reusable cooldown primitive. Tick it with dt; query `ready`/`fraction`;
// `trigger()` to start it and `reset()` to make it instantly available again.
// Used by the dash and ready for any future timed ability (weapon specials,
// dash upgrades, etc.) — no per-ability bespoke timers.

export class Cooldown {
  constructor(duration) {
    this.duration = duration;
    this.remaining = 0;
  }

  update(dt) {
    if (this.remaining > 0) {
      this.remaining -= dt;
      if (this.remaining < 0) this.remaining = 0;
    }
  }

  get ready() {
    return this.remaining <= 0;
  }

  // 0 right after trigger -> 1 when ready. Drives cooldown bars directly.
  get fraction() {
    return this.duration > 0 ? clamp(1 - this.remaining / this.duration, 0, 1) : 1;
  }

  trigger() {
    this.remaining = this.duration;
  }

  reset() {
    this.remaining = 0;
  }

  setDuration(duration) {
    this.duration = duration;
  }
}
