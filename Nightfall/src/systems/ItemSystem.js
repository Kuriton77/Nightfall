import { WorldConfig } from '../config/WorldConfig.js';
import { PickupConfig } from '../config/PickupConfig.js';
import { TAU } from '../core/math.js';

// Spawns and manages beneficial world pickups on a throttled, capped cadence so
// the map is never flooded. The pickup TYPES + spawn weights are data-driven
// (PickupConfig); collection is delegated to the Game via a single onCollect
// hook that dispatches by type, so adding a pickup needs no changes here.

export class ItemSystem {
  constructor(itemPool, hooks) {
    this.pool = itemPool;
    this.cfg = WorldConfig.items;
    this.onCollect = hooks.onCollect; // (type, x, y) => void
    this.spawnEffect = hooks.spawnEffect; // (type, x, y) => void
    this.healthWeightMult = 1; // difficulty hook
    this._types = Object.keys(PickupConfig.weights);
    this.reset();
  }

  reset() {
    this.timer = this._nextInterval();
  }

  // Difficulty hook — scales how often health packs appear vs everything else.
  setModifiers(mods) {
    this.healthWeightMult = mods && mods.healthItemMult ? mods.healthItemMult : 1;
  }

  _nextInterval() {
    return this.cfg.spawnInterval + (Math.random() * 2 - 1) * this.cfg.spawnIntervalJitter;
  }

  _weightOf(type) {
    const w = PickupConfig.weights[type];
    return type === 'health' ? w * this.healthWeightMult : w;
  }

  // Weighted random over the data-driven pickup table.
  _pickType() {
    const types = this._types;
    let total = 0;
    for (let i = 0; i < types.length; i++) total += this._weightOf(types[i]);
    let roll = Math.random() * total;
    for (let i = 0; i < types.length; i++) {
      roll -= this._weightOf(types[i]);
      if (roll <= 0) return types[i];
    }
    return types[0];
  }

  update(dt, player) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this._nextInterval();
      this._spawn(player);
    }

    const items = this.pool.active;
    const pickup = this.cfg.pickupRadius + player.radius;
    const pickup2 = pickup * pickup;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.active) continue;
      it.age += dt;
      it.life -= dt;
      if (it.life <= 0) {
        this.pool.release(it);
        continue;
      }
      const dx = player.x - it.x;
      const dy = player.y - it.y;
      if (dx * dx + dy * dy <= pickup2) {
        this.onCollect(it.type, it.x, it.y);
        this.pool.release(it);
      }
    }
    this.pool.sweep();
  }

  // Guaranteed drop at a world position (boss rewards). Intentionally bypasses
  // the maxActive cap — a boss kill must always yield its pickup.
  spawnAt(type, x, y) {
    const it = this.pool.acquire();
    it.x = x;
    it.y = y;
    it.type = type;
    it.radius = this.cfg.radius;
    it.age = 0;
    it.life = this.cfg.lifetime;
    this.spawnEffect('itemSpawn', it.x, it.y);
  }

  _spawn(player) {
    if (this.pool.active.length >= this.cfg.maxActive) return;
    const it = this.pool.acquire();
    const angle = Math.random() * TAU;
    const dist = this.cfg.spawnMinDist +
      Math.random() * (this.cfg.spawnMaxDist - this.cfg.spawnMinDist);
    it.x = player.x + Math.cos(angle) * dist;
    it.y = player.y + Math.sin(angle) * dist;
    it.type = this._pickType();
    it.radius = this.cfg.radius;
    it.age = 0;
    it.life = this.cfg.lifetime;
    this.spawnEffect('itemSpawn', it.x, it.y);
  }

  clear() {
    this.pool.clear();
  }
}
