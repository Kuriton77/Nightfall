import { DestructibleConfig } from '../config/DestructibleConfig.js';

// Generic destructible world object (trees today; rocks / crates / barrels /
// ore nodes tomorrow). Plain data like every other entity — WorldSystem owns
// lifecycle (hostility, destruction, regrowth), WeaponSystem damages it through
// the shared combat pipeline, and the Renderer draws it by `type`. Intrinsic
// stats come from DestructibleConfig; only the small mutable runtime state lives
// per-instance, so thousands stay cheap.
//
// `isDestructible` lets the shared spatial-grid hit path (WeaponSystem) tell a
// destructible apart from a pooled enemy without any type coupling.

export class Destructible {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.isDestructible = true;
    const def = DestructibleConfig[type];
    this.radius = def.radius;
    this.maxHealth = def.maxHealth;
    this.reset();
  }

  reset() {
    this.health = this.maxHealth;
    this.alive = true; // false while destroyed (regrowing)
    this.active = false; // hostile flag (player in range) — trees only
    this.attackTimer = 0;
    this.hitFlash = 0; // white flash after taking a hit / landing an attack
    this.shake = 0; // brief shake after taking a hit
    this.growScale = 1; // 1 = full size; <1 during the regrowth grow-in
    this.regrowTimer = 0; // counts down while destroyed
    this.arenaHidden = false; // temporarily removed by a boss arena (not destroyed)
  }
}
