import { length } from '../core/math.js';

// Handles XP gems: magnet gems inside the pickup radius toward the player and
// collect them on contact, forwarding XP to the progression system.

const MAGNET_SPEED = 420; // px/sec once a gem is magnetized
const COLLECT_DISTANCE = 14; // px at which a gem is absorbed

export class PickupSystem {
  constructor(gemPool) {
    this.gemPool = gemPool;
  }

  // Returns total XP collected this frame (0 if none). `onCollect(x, y, value)`
  // is invoked per collected gem (used for pickup effects).
  update(dt, player, onCollect) {
    const gems = this.gemPool.active;
    const pickupRadius = player.stats.pickupRadius;
    let collected = 0;

    for (let i = 0; i < gems.length; i++) {
      const g = gems[i];
      if (!g.active) continue;

      const dx = player.x - g.x;
      const dy = player.y - g.y;
      const dist = length(dx, dy);

      if (dist <= COLLECT_DISTANCE) {
        collected += g.value;
        if (onCollect) onCollect(g.x, g.y, g.value);
        this.gemPool.release(g);
        continue;
      }

      if (g.magnetized || dist <= pickupRadius) {
        g.magnetized = true;
        const step = (MAGNET_SPEED * dt) / (dist || 1);
        g.x += dx * step;
        g.y += dy * step;
      }
    }
    return collected;
  }
}
