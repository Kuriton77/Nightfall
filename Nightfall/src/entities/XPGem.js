// Pooled XP gem dropped by dying enemies.

export class XPGem {
  constructor() {
    this.active = false;
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.value = 0;
    this.radius = 5;
    this.magnetized = false; // true once inside pickup radius
  }
}
