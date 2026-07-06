import { BuffConfig } from '../config/BuffConfig.js';

// Reusable timed-effect framework. Tracks active buffs/status effects keyed by
// id, each carrying its config + remaining time. Systems query it for the
// effect they care about (WeaponSystem: combat mods; EnemySystem/BossSystem:
// freeze) and the Buff HUD renders `list()`. Re-applying a buff refreshes its
// duration instead of stacking. Future buffs need only a BuffConfig entry.

export class BuffSystem {
  constructor() {
    this.active = new Map(); // id -> { id, def, remaining }
    this._list = []; // reused snapshot for the HUD (no per-frame alloc)
  }

  reset() {
    this.active.clear();
    this._list.length = 0;
  }

  // Apply (or refresh) a buff by id. No stacking — a repeat pickup just resets
  // the timer to full duration.
  apply(id) {
    const def = BuffConfig[id];
    if (!def) return;
    const cur = this.active.get(id);
    if (cur) cur.remaining = def.duration;
    else this.active.set(id, { id, def, remaining: def.duration });
  }

  update(dt) {
    for (const b of this.active.values()) {
      b.remaining -= dt;
      if (b.remaining <= 0) this.active.delete(b.id); // safe: Map delete-in-iter
    }
  }

  has(id) {
    return this.active.has(id);
  }

  remaining(id) {
    const b = this.active.get(id);
    return b ? Math.max(0, b.remaining) : 0;
  }

  // Aggregate combat multipliers from every active buff (product).
  get damageMult() {
    let m = 1;
    for (const b of this.active.values()) if (b.def.damageMult) m *= b.def.damageMult;
    return m;
  }

  get cooldownMult() {
    let m = 1;
    for (const b of this.active.values()) if (b.def.cooldownMult) m *= b.def.cooldownMult;
    return m;
  }

  // Snapshot of active buffs for the HUD (stable reused array).
  list() {
    this._list.length = 0;
    for (const b of this.active.values()) this._list.push(b);
    return this._list;
  }
}
