import { GameConfig } from '../config/GameConfig.js';
import { TAU } from '../core/math.js';

// Auto-firing weapon system supporting two combat pipelines, selected per
// weapon by `weapon.kind`:
//   'projectile' — every cooldown, aim and emit a fan of projectiles (the
//                  original behaviour, unchanged).
//   'melee'      — every cooldown, swing a cone that hits all enemies inside
//                  it; a 3-hit combo whose finisher throws a piercing blade
//                  (reuses the projectile pool + pipeline).
//
// Combat multipliers from temporary buffs (rage) arrive via `combatMods` and
// scale damage + cadence for BOTH pipelines, so any buff applies to any weapon.
// Effects are emitted through injected hooks (spawnEffect/spawnArc), matching
// the decoupling used by the other systems; audio stays in the Game, driven by
// the per-frame telemetry flags below.

export class WeaponSystem {
  constructor(projectilePool, grid, hooks = {}) {
    this.projectilePool = projectilePool;
    this.grid = grid;
    this._queryScratch = []; // reused per-projectile / per-swing neighbor buffer
    this._hooks = {
      spawnEffect: hooks.spawnEffect || noop,
      spawnArc: hooks.spawnArc || noop,
      onDestructibleDestroyed: hooks.onDestructibleDestroyed || noop,
    };
    // Combat modifiers (from BuffSystem); mutated in place by the Game.
    this.combatMods = { damageMult: 1, cooldownMult: 1 };
    this.reset();
  }

  reset() {
    this.fireTimer = 0;
    this.comboStep = 0; // melee combo counter (0..comboLength-1)
    this._boss = null; // live boss target, refreshed every update
    this.combatMods.damageMult = 1;
    this.combatMods.cooldownMult = 1;
    // Per-frame telemetry read by the Game for SFX / dash-reset (no behavior).
    this.firedThisFrame = false;
    this.hitsThisFrame = 0;
    this.treeHitsThisFrame = 0; // destructibles damaged this frame (for SFX)
    this.meleeSwingThisFrame = false;
    this.swordThrownThisFrame = false;
    this.swordThrowHitThisFrame = false;
  }

  // `aim` (optional): { free, dirX, dirY }. When free, the weapon fires toward
  // the given direction (mouse) instead of auto-targeting the nearest enemy.
  // `boss` (optional): a live boss is auto-targeted and hit like any enemy —
  // it is not in the spatial grid, so it gets one direct test per projectile.
  update(dt, player, enemyPool, onEnemyDeath, aim, boss) {
    this._boss = boss && boss.active ? boss : null;
    this.firedThisFrame = false;
    this.hitsThisFrame = 0;
    this.treeHitsThisFrame = 0;
    this.meleeSwingThisFrame = false;
    this.swordThrownThisFrame = false;
    this.swordThrowHitThisFrame = false;
    this._updateFiring(dt, player, enemyPool, aim, onEnemyDeath);
    this._updateProjectiles(dt, onEnemyDeath);
  }

  _updateFiring(dt, player, enemyPool, aim, onEnemyDeath) {
    this.fireTimer -= dt;
    if (this.fireTimer > 0) return;

    const w = player.weapon;
    const isMelee = w.kind === 'melee';

    let angleTo;
    if (aim && aim.free) {
      // Free aim: attack toward the cursor, even with no enemies present.
      angleTo = Math.atan2(aim.dirY, aim.dirX);
    } else {
      const target = this._nearestEnemy(player, enemyPool);
      if (target) {
        angleTo = Math.atan2(target.y - player.y, target.x - player.x);
      } else if (isMelee) {
        // Melee still swings (into whatever it's facing) so the combo advances.
        angleTo = Math.atan2(player.facingY, player.facingX);
      } else {
        // Projectile with no target: retry soon rather than banking cooldown.
        this.fireTimer = 0;
        return;
      }
    }

    player.facingX = Math.cos(angleTo);
    player.facingY = Math.sin(angleTo);

    this.fireTimer += w.cooldown * this.combatMods.cooldownMult;

    if (isMelee) this._meleeAttack(player, enemyPool, angleTo, w, onEnemyDeath);
    else this._projectileVolley(player, angleTo, w);

    this.firedThisFrame = true;
  }

  // ---- Projectile pipeline (bolt / scatter) --------------------------------

  _projectileVolley(player, aimAngle, w) {
    const dmg = w.damage * this.combatMods.damageMult;
    const count = w.projectileCount;
    // Center the fan on the aim direction; optional per-shot jitter gives
    // shotgun-style weapons a looser spread.
    const start = aimAngle - (w.spread * (count - 1)) / 2;
    const jitter = w.spreadJitter || 0;
    for (let i = 0; i < count; i++) {
      let angle = start + w.spread * i;
      if (jitter) angle += (Math.random() * 2 - 1) * jitter;
      this._spawnProjectile(player, angle, w, dmg);
    }
  }

  _spawnProjectile(player, angle, w, damage) {
    if (this.projectilePool.active.length >= GameConfig.performance.maxProjectiles) {
      return;
    }
    const p = this.projectilePool.acquire();
    p.x = player.x;
    p.y = player.y;
    p.vx = Math.cos(angle) * w.projectileSpeed;
    p.vy = Math.sin(angle) * w.projectileSpeed;
    p.damage = damage;
    p.size = w.projectileSize;
    p.life = w.projectileLifetime;
    p.pierce = w.pierce;
    p.kind = 'bolt';
    p.swordThrow = false;
    p.dashResetArmed = false;
  }

  // ---- Melee pipeline (sword) ----------------------------------------------

  _meleeAttack(player, enemyPool, angleTo, w, onEnemyDeath) {
    const comboLen = (w.combo && w.combo.length) || 3;
    this.comboStep++;
    if (this.comboStep >= comboLen) {
      this.comboStep = 0;
      this._swordThrow(player, angleTo, w); // finisher
    } else {
      this._swordSwing(player, enemyPool, angleTo, w, onEnemyDeath);
    }
  }

  // Cone swing: damage every enemy (and the boss) within range and half-cone.
  _swordSwing(player, enemyPool, angleTo, w, onEnemyDeath) {
    const m = w.melee;
    const range = m.range + w.projectileSize; // size upgrades add a little reach
    const half = (m.coneDeg * Math.PI) / 180 / 2;
    const dmg = w.damage * this.combatMods.damageMult;

    let hitCount = 0;
    const hits = this.grid.query(player.x, player.y, range + MAX_ENEMY_RADIUS, this._queryScratch);
    for (let j = 0; j < hits.length; j++) {
      const e = hits[j];
      // Destructibles (trees, future props) are damaged by the swing too.
      if (e.isDestructible) {
        if (e.alive && !e.arenaHidden && this._inCone(player, e, angleTo, range, half)) {
          this._applyDestructibleDamage(e, dmg);
        }
        continue;
      }
      if (!e.active) continue;
      if (this._inCone(player, e, angleTo, range, half)) {
        this._applyDamage(e, dmg, onEnemyDeath);
        if (hitCount < MAX_HIT_EFFECTS) this._hooks.spawnEffect('swordHit', e.x, e.y);
        hitCount++;
      }
    }

    const boss = this._boss;
    if (boss && boss.active && this._inCone(player, boss, angleTo, range, half)) {
      this._applyDamage(boss, dmg, onEnemyDeath);
      this._hooks.spawnEffect('swordHit', boss.x, boss.y);
    }

    // Swipe arc visual centered on the swing direction.
    this._hooks.spawnArc(player.x, player.y, angleTo, range, half, GameConfig.colors.swordArc);
    this.meleeSwingThisFrame = true;
  }

  _inCone(player, target, angleTo, range, half) {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const reach = range + target.radius;
    if (dx * dx + dy * dy > reach * reach) return false;
    let da = Math.atan2(dy, dx) - angleTo;
    da = Math.atan2(Math.sin(da), Math.cos(da)); // wrap to [-pi, pi]
    return Math.abs(da) <= half;
  }

  // Combo finisher: throw piercing blade(s) forward. projectileCount blades
  // fan out when upgraded; each blade refreshes the dash on its first hit.
  _swordThrow(player, angleTo, w) {
    const c = w.combo;
    const dmg = w.damage * c.damageMult * this.combatMods.damageMult;
    const size = w.projectileSize * c.sizeMult;
    const count = w.projectileCount;
    const start = angleTo - (w.spread * (count - 1)) / 2;
    for (let i = 0; i < count; i++) {
      this._spawnSword(player, start + w.spread * i, dmg, size, c);
    }
    this.swordThrownThisFrame = true;
  }

  _spawnSword(player, angle, damage, size, c) {
    if (this.projectilePool.active.length >= GameConfig.performance.maxProjectiles) {
      return;
    }
    const p = this.projectilePool.acquire();
    p.x = player.x;
    p.y = player.y;
    p.vx = Math.cos(angle) * c.speed;
    p.vy = Math.sin(angle) * c.speed;
    p.damage = damage;
    p.size = size;
    p.life = c.lifetime;
    p.pierce = c.pierce;
    p.kind = 'sword';
    p.angle = angle;
    p.spin = 0;
    p.swordThrow = true;
    p.dashResetArmed = true; // first hit refreshes the dash (once)
  }

  // ---- Shared targeting + projectile integration ---------------------------

  _nearestEnemy(player, enemyPool) {
    const enemies = enemyPool.active;
    let best = null;
    let bestDistSq = Infinity;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const d = dx * dx + dy * dy;
      if (d < bestDistSq) {
        bestDistSq = d;
        best = e;
      }
    }
    // The boss competes for nearest-target like any enemy (and guarantees a
    // target when the arena has cleared everything else out).
    const boss = this._boss;
    if (boss) {
      const dx = boss.x - player.x;
      const dy = boss.y - player.y;
      if (dx * dx + dy * dy < bestDistSq) best = boss;
    }
    return best;
  }

  _updateProjectiles(dt, onEnemyDeath) {
    const projectiles = this.projectilePool.active;
    const scratch = this._queryScratch;

    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      if (!p.active) continue;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'sword') p.spin += SWORD_SPIN * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.projectilePool.release(p);
        continue;
      }

      // Broad-phase: only test enemies + destructibles in nearby cells.
      const hits = this.grid.query(p.x, p.y, p.size + MAX_ENEMY_RADIUS, scratch);
      for (let j = 0; j < hits.length; j++) {
        const e = hits[j];

        // Destructibles (trees, future props): damaged like an obstacle and
        // consume pierce exactly like an enemy. Sword-throw dash-reset does NOT
        // trigger on trees (only enemies count).
        if (e.isDestructible) {
          if (!e.alive || e.arenaHidden) continue;
          const ddx = e.x - p.x;
          const ddy = e.y - p.y;
          const dr = e.radius + p.size;
          if (ddx * ddx + ddy * ddy > dr * dr) continue;
          this._applyDestructibleDamage(e, p.damage);
          if (p.pierce > 0) {
            p.pierce--;
          } else {
            this.projectilePool.release(p);
            break;
          }
          continue;
        }

        if (!e.active) continue;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const r = e.radius + p.size;
        if (dx * dx + dy * dy > r * r) continue;

        this._applyDamage(e, p.damage, onEnemyDeath);
        this._registerSwordHit(p);

        if (p.pierce > 0) {
          p.pierce--;
        } else {
          this.projectilePool.release(p);
          break;
        }
      }

      // Boss: single direct test (it lives outside the grid).
      const boss = this._boss;
      if (boss && boss.active && p.active) {
        const dx = boss.x - p.x;
        const dy = boss.y - p.y;
        const r = boss.radius + p.size;
        if (dx * dx + dy * dy <= r * r) {
          this._applyDamage(boss, p.damage, onEnemyDeath);
          this._registerSwordHit(p);
          if (p.pierce > 0) {
            p.pierce--;
          } else {
            this.projectilePool.release(p);
          }
        }
      }
    }
  }

  // Fire the dash-reset exactly once, on a thrown blade's first hit.
  _registerSwordHit(p) {
    if (p.swordThrow && p.dashResetArmed) {
      p.dashResetArmed = false;
      this.swordThrowHitThisFrame = true;
    }
  }

  _applyDamage(enemy, damage, onEnemyDeath) {
    enemy.health -= damage;
    enemy.hitFlash = HIT_FLASH_TIME;
    this.hitsThisFrame++;
    if (enemy.health <= 0) {
      onEnemyDeath(enemy);
    }
  }

  // Damage a destructible via the shared pipeline. On death, fires the hook so
  // the Game orchestrates destruction (particles / sound / regrowth). The
  // `alive` guard makes multiple same-frame hits fire the hook only once (the
  // hook marks it destroyed synchronously).
  _applyDestructibleDamage(d, damage) {
    d.health -= damage;
    d.hitFlash = HIT_FLASH_TIME;
    d.shake = DESTRUCTIBLE_SHAKE_TIME;
    this.treeHitsThisFrame++;
    if (d.health <= 0 && d.alive) {
      this._hooks.onDestructibleDestroyed(d);
    }
  }
}

function noop() {}

// Conservative query padding so fast/large enemies aren't missed. A single
// constant keeps the grid query cheap without tracking per-type radii.
const MAX_ENEMY_RADIUS = 40;
const HIT_FLASH_TIME = 0.08;
const DESTRUCTIBLE_SHAKE_TIME = 0.12; // brief shake after a destructible is hit
const SWORD_SPIN = 22; // radians/sec — spinning blade visual
const MAX_HIT_EFFECTS = 3; // cap swing impact rings per swing (perf)

// Fan spread helper kept for potential future weapons.
export const FULL_CIRCLE = TAU;
