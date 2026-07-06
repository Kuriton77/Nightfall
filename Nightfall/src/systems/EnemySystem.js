import { length } from '../core/math.js';

// Steers every active enemy toward the player and applies contact damage on a
// per-enemy cooldown. Also decays hit-flash timers for rendering. When `frozen`
// (a Freeze pickup is active), enemies are fully inert — no movement, no contact
// damage — while hit-flash still decays so combat feedback stays responsive.

export class EnemySystem {
  constructor(enemyPool) {
    this.enemyPool = enemyPool;
  }

  update(dt, player, frozen = false) {
    const enemies = this.enemyPool.active;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;

      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (frozen) continue; // frozen solid: skip movement + attacks
      if (e.attackTimer > 0) e.attackTimer -= dt;

      // Move toward the player.
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = length(dx, dy);
      if (dist > 0.0001) {
        const step = (e.speed * dt) / dist;
        e.x += dx * step;
        e.y += dy * step;
      }

      // Contact damage.
      const touchDist = e.radius + player.radius;
      if (dist <= touchDist && e.attackTimer <= 0) {
        player.takeDamage(e.contactDamage);
        e.attackTimer = e.attackCooldown;
      }
    }
  }
}
