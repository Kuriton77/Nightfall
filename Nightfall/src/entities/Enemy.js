// Pooled enemy. All fields are set on spawn; `reset()` returns it to a neutral
// state for reuse.

export class Enemy {
  constructor() {
    this.active = false;
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.health = 0;
    this.maxHealth = 0;
    this.radius = 0;
    this.speed = 0;
    this.contactDamage = 0;
    this.attackCooldown = 0;
    this.attackTimer = 0;
    this.xpValue = 0;
    this.color = '#ffffff';
    this.hitFlash = 0; // seconds of white-flash remaining after a hit
    this.typeId = null;
    this.isElite = false; // scaled-up variant with an aura (see EliteConfig)
  }
}
