// Pooled world pickup (health pack / bomb). `age` drives the blink effect.

export class WorldItem {
  constructor() {
    this.active = false;
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.type = 'health'; // 'health' | 'bomb'
    this.radius = 14;
    this.age = 0; // seconds since spawn (blink phase)
    this.life = 0; // seconds remaining before despawn
  }
}
