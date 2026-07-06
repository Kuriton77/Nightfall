// Pooled projectile fired by the weapon. `kind` lets one pool serve both the
// default bolt/pellet (drawn as a dot) and the sword-throw blade (drawn as a
// spinning blade, and able to refresh the dash on its first hit).

export class Projectile {
  constructor() {
    this.active = false;
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.damage = 0;
    this.size = 0; // radius / hit radius
    this.life = 0; // seconds remaining
    this.pierce = 0; // remaining extra enemies it can pass through

    // Sword-throw support (default 'bolt' behaves exactly as before).
    this.kind = 'bolt'; // 'bolt' | 'sword'
    this.angle = 0; // travel angle (sword blade orientation)
    this.spin = 0; // accumulated spin for the blade visual
    this.swordThrow = false; // is this the combo-finisher blade?
    this.dashResetArmed = false; // fires the dash-reset once, on first hit
  }
}
