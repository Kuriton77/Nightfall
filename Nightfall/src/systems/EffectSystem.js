import { GameConfig } from '../config/GameConfig.js';
import { TAU } from '../core/math.js';

// Manages pooled visual effects (expanding rings, sword arcs, debris particles).
// Data-driven per type; the Renderer reads pool.active to draw them. Self-sweeps
// each frame. Particles drift via vx/vy with drag and shrink out.

const EFFECTS = {
  pickup: { life: 0.35, r0: 4, rMax: 22, width: 2, color: 'effectPickup' },
  heal: { life: 0.6, r0: 6, rMax: 62, width: 3, color: 'effectHeal' },
  treeAttack: { life: 0.4, r0: 10, rMax: 72, width: 3, color: 'effectTree' },
  bomb: { life: 0.75, r0: 24, rMax: 900, width: 6, color: 'effectBomb' },
  itemSpawn: { life: 0.6, r0: 2, rMax: 34, width: 3, color: 'effectItem' },
  bossSpawn: { life: 0.9, r0: 30, rMax: 480, width: 5, color: 'effectBossSpawn' },
  bossDeath: { life: 1.1, r0: 40, rMax: 620, width: 7, color: 'effectBossDeath' },
  summon: { life: 0.5, r0: 6, rMax: 60, width: 3, color: 'effectSummon' },
  // Combat / dash / pickup feedback.
  dashTrail: { life: 0.28, r0: 15, rMax: 3, width: 3, color: 'effectDash' }, // shrinking ghost
  dashReset: { life: 0.5, r0: 8, rMax: 76, width: 4, color: 'effectDashReset' },
  swordHit: { life: 0.22, r0: 3, rMax: 20, width: 3, color: 'effectSwordHit' },
  swordThrow: { life: 0.3, r0: 6, rMax: 32, width: 3, color: 'effectSword' },
  magnet: { life: 0.6, r0: 12, rMax: 200, width: 4, color: 'effectMagnet' },
  freeze: { life: 0.85, r0: 20, rMax: 560, width: 5, color: 'effectFreeze' },
  rage: { life: 0.6, r0: 10, rMax: 74, width: 4, color: 'effectRage' },
  elite: { life: 0.4, r0: 4, rMax: 40, width: 3, color: 'effectElite' },
  treeBreak: { life: 0.4, r0: 6, rMax: 46, width: 4, color: 'effectTreeBreak' },
};

const PARTICLE_DRAG = 0.9; // per-fixed-step velocity damping

export class EffectSystem {
  constructor(effectPool) {
    this.pool = effectPool;
  }

  spawn(type, x, y) {
    const def = EFFECTS[type];
    if (!def) return;
    const e = this.pool.acquire();
    e.x = x;
    e.y = y;
    e.age = 0;
    e.life = def.life;
    e.r0 = def.r0;
    e.rMax = def.rMax;
    e.width = def.width;
    e.color = GameConfig.colors[def.color];
    e.shape = 'ring';
  }

  // Sword-swing swipe: a fading arc sector centered on `angle` with half-width
  // `half`, expanding out to `radius`. Reuses the effect pool. `color` is a
  // resolved CSS color.
  spawnArc(x, y, angle, radius, half, color) {
    const e = this.pool.acquire();
    e.x = x;
    e.y = y;
    e.age = 0;
    e.life = 0.18;
    e.r0 = radius * 0.55;
    e.rMax = radius;
    e.width = 5;
    e.color = color;
    e.shape = 'arc';
    e.angle = angle;
    e.spread = half;
  }

  // One drifting debris particle (shrinks r0 -> rMax as it fades). `color` is a
  // resolved CSS color.
  spawnParticle(x, y, vx, vy, size, life, color) {
    const e = this.pool.acquire();
    e.x = x;
    e.y = y;
    e.age = 0;
    e.life = life;
    e.r0 = size;
    e.rMax = 0;
    e.width = 1;
    e.color = color;
    e.shape = 'particle';
    e.vx = vx;
    e.vy = vy;
  }

  // Data-driven debris burst (see DestructibleConfig particle specs). Emits
  // `spec.count` particles; `spreadUp` biases them upward (leaves), otherwise
  // they scatter in all directions (wood/dust).
  burst(x, y, spec) {
    for (let i = 0; i < spec.count; i++) {
      const angle = spec.spreadUp
        ? -Math.PI / 2 + (Math.random() - 0.5) * Math.PI
        : Math.random() * TAU;
      const sp = spec.speed * (0.5 + Math.random() * 0.5);
      this.spawnParticle(
        x, y,
        Math.cos(angle) * sp,
        Math.sin(angle) * sp,
        spec.size * (0.7 + Math.random() * 0.6),
        spec.life * (0.7 + Math.random() * 0.5),
        spec.color,
      );
    }
  }

  // Fully parameterized ring for one-off effects whose geometry is computed at
  // runtime (e.g. the boss shockwave, whose visual must match its damage front).
  // `color` is a resolved CSS color, not a GameConfig key.
  spawnCustom(x, y, { life, r0, rMax, width, color }) {
    const e = this.pool.acquire();
    e.x = x;
    e.y = y;
    e.age = 0;
    e.life = life;
    e.r0 = r0;
    e.rMax = rMax;
    e.width = width;
    e.color = color;
    e.shape = 'ring';
  }

  update(dt) {
    const effects = this.pool.active;
    for (let i = 0; i < effects.length; i++) {
      const e = effects[i];
      if (!e.active) continue;
      e.age += dt;
      // Particles drift with drag; rings/arcs have zero velocity (no-op).
      if (e.vx !== 0 || e.vy !== 0) {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vx *= PARTICLE_DRAG;
        e.vy *= PARTICLE_DRAG;
      }
      if (e.age >= e.life) this.pool.release(e);
    }
    this.pool.sweep();
  }

  clear() {
    this.pool.clear();
  }
}
