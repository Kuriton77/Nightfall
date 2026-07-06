import { WorldConfig } from '../config/WorldConfig.js';
import { DestructibleConfig } from '../config/DestructibleConfig.js';
import { Destructible } from '../entities/Destructible.js';
import { clamp } from '../core/math.js';

// Procedural environment: deterministic, chunk-based generation of destructible
// world objects (trees today; any DestructibleConfig type in future). Only the
// chunks around the player are kept "live" (updated/collided/rendered), so the
// world is effectively infinite and persistent while staying cheap.
//
// Destructibles take damage through the shared weapon pipeline (WeaponSystem);
// this system owns their lifecycle: hostility, destruction (via markDestroyed),
// and per-object regrowth. Boss arenas temporarily HIDE objects (not destroy
// them) and restore them intact when the fight ends — orthogonal to destruction.

// Deterministic hash + PRNG so a chunk always regenerates identically within a
// run seed (persistence) but differs run-to-run.
function hashChunk(x, y, seed) {
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GROW_START = 0.12; // scale a regrowing object starts at

export class WorldSystem {
  constructor() {
    this.cfg = WorldConfig.trees;
    this.chunks = new Map(); // key -> Destructible[]
    this.activeTrees = []; // flat list of currently live objects (stable ref)
    this.hiddenTrees = []; // objects temporarily hidden by a boss arena
    this.seed = 0;
    this.densityMult = 1; // difficulty hook
    this._lastCX = null;
    this._lastCY = null;
  }

  reset() {
    this.chunks.clear();
    this.activeTrees.length = 0;
    this.hiddenTrees.length = 0;
    this.seed = (Math.random() * 0x7fffffff) | 0;
    this._lastCX = null;
    this._lastCY = null;
  }

  // Difficulty hook — <1 thins the forest, >1 densifies it. Cleared chunks
  // regenerate with the new density on the next update.
  setDensity(mult) {
    this.densityMult = mult || 1;
  }

  _key(cx, cy) {
    return cx + ':' + cy;
  }

  _generateChunk(cx, cy) {
    const cfg = this.cfg;
    const size = cfg.chunkSize;
    const cells = Math.floor(size / cfg.cellSize);
    const rand = mulberry32(hashChunk(cx, cy, this.seed));
    const clear2 = cfg.clearRadius * cfg.clearRadius;
    // Density adjusts the skip probability: higher density -> lower skip.
    const skipChance = clamp(1 - (1 - cfg.skipChance) * this.densityMult, 0, 0.95);
    const trees = [];
    for (let ix = 0; ix < cells; ix++) {
      for (let iy = 0; iy < cells; iy++) {
        // Consume RNG in a fixed order so layout is deterministic.
        const skip = rand() < skipChance;
        const ox = (rand() * 2 - 1) * cfg.jitter;
        const oy = (rand() * 2 - 1) * cfg.jitter;
        if (skip) continue;
        const x = cx * size + ix * cfg.cellSize + cfg.cellSize * 0.5 + ox;
        const y = cy * size + iy * cfg.cellSize + cfg.cellSize * 0.5 + oy;
        if (x * x + y * y < clear2) continue; // keep spawn area clear
        trees.push(new Destructible(x, y, 'tree'));
      }
    }
    return trees;
  }

  _ensureChunk(cx, cy) {
    const key = this._key(cx, cy);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = this._generateChunk(cx, cy);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  // Rebuild the live object list only when the player crosses a chunk boundary.
  _refreshActive(pcx, pcy) {
    const R = this.cfg.activeChunkRadius;
    this.activeTrees.length = 0;
    for (let dx = -R; dx <= R; dx++) {
      for (let dy = -R; dy <= R; dy++) {
        const chunk = this._ensureChunk(pcx + dx, pcy + dy);
        for (let i = 0; i < chunk.length; i++) this.activeTrees.push(chunk[i]);
      }
    }
  }

  update(dt, player, effectSystem) {
    const size = this.cfg.chunkSize;
    const pcx = Math.floor(player.x / size);
    const pcy = Math.floor(player.y / size);
    if (pcx !== this._lastCX || pcy !== this._lastCY) {
      this._lastCX = pcx;
      this._lastCY = pcy;
      this._refreshActive(pcx, pcy);
    }

    const trees = this.activeTrees;
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      if (t.arenaHidden) continue; // inert while removed by a boss arena

      if (t.hitFlash > 0) t.hitFlash -= dt;
      if (t.shake > 0) t.shake -= dt;

      // Destroyed: count down to regrowth, then respawn at full health.
      if (!t.alive) {
        t.regrowTimer -= dt;
        if (t.regrowTimer <= 0) this._regrow(t);
        continue;
      }

      // Regrowth grow-in animation.
      const def = DestructibleConfig[t.type];
      if (t.growScale < 1) {
        t.growScale = Math.min(1, t.growScale + dt / def.growDuration);
      }

      // Hostile behavior (optional per type; only once fully grown).
      const h = def.hostile;
      if (h && t.growScale >= 1) {
        this._updateHostile(t, h, dt, player, effectSystem);
      } else if (t.active) {
        t.active = false;
      }
    }
  }

  _updateHostile(t, h, dt, player, effectSystem) {
    const attack2 = h.attackRange * h.attackRange;
    const damage2 = h.damageRange * h.damageRange;
    const dx = player.x - t.x;
    const dy = player.y - t.y;
    const d2 = dx * dx + dy * dy;

    if (d2 <= attack2) {
      if (!t.active) {
        t.active = true;
        t.attackTimer = h.attackInterval * 0.5; // brief wind-up
      }
      t.attackTimer -= dt;
      if (t.attackTimer <= 0) {
        t.attackTimer = h.attackInterval;
        effectSystem.spawn('treeAttack', t.x, t.y);
        if (d2 <= damage2) {
          player.takeDamage(h.damage);
          t.hitFlash = 0.14;
        }
      }
    } else if (t.active) {
      t.active = false;
    }
  }

  // Destroy a destructible: it stops colliding / attacking / rendering and
  // schedules its own regrowth. Idempotent (guards double-destruction from
  // multiple same-frame hits). Called by the Game when a weapon drops it to 0 HP.
  markDestroyed(t) {
    if (!t.alive) return;
    t.alive = false;
    t.active = false;
    t.health = 0;
    t.shake = 0;
    t.hitFlash = 0;
    t.regrowTimer = DestructibleConfig[t.type].regrowTime;
  }

  _regrow(t) {
    const def = DestructibleConfig[t.type];
    t.alive = true;
    t.health = def.maxHealth;
    t.growScale = GROW_START; // grow-in from small
    t.active = false;
    t.attackTimer = 0;
    t.regrowTimer = 0;
  }

  // ---- Boss arena integration ----------------------------------------------
  // The arena TEMPORARILY hides objects inside its radius (they are not
  // destroyed and keep full health); restoreHiddenTrees() brings them straight
  // back when the fight ends. Objects that were already destroyed keep their
  // own regrowth timer untouched.

  hideTreesInRadius(x, y, radius) {
    const size = this.cfg.chunkSize;
    const minCX = Math.floor((x - radius) / size);
    const maxCX = Math.floor((x + radius) / size);
    const minCY = Math.floor((y - radius) / size);
    const maxCY = Math.floor((y + radius) / size);
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const chunk = this._ensureChunk(cx, cy);
        for (let i = 0; i < chunk.length; i++) {
          const t = chunk[i];
          if (t.arenaHidden) continue;
          const dx = t.x - x;
          const dy = t.y - y;
          const reach = radius + t.radius;
          if (dx * dx + dy * dy <= reach * reach) {
            t.arenaHidden = true;
            this.hiddenTrees.push(t);
          }
        }
      }
    }
    if (this._lastCX !== null) this._refreshActive(this._lastCX, this._lastCY);
  }

  restoreHiddenTrees() {
    const hidden = this.hiddenTrees;
    for (let i = 0; i < hidden.length; i++) hidden[i].arenaHidden = false;
    hidden.length = 0;
    if (this._lastCX !== null) this._refreshActive(this._lastCX, this._lastCY);
  }

  // Solid destructibles: push the player out of any nearby overlapping one.
  // Skips destroyed / hidden / non-solid objects; the collision radius scales
  // with the grow-in so a regrowing object eases the player aside instead of
  // popping them.
  resolvePlayerCollision(player) {
    const trees = this.activeTrees;
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i];
      if (!t.alive || t.arenaHidden) continue;
      if (!DestructibleConfig[t.type].solid) continue;
      const dx = player.x - t.x;
      const dy = player.y - t.y;
      const minDist = t.radius * t.growScale + player.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 < minDist * minDist && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (minDist - d) / d;
        player.x += dx * push;
        player.y += dy * push;
      }
    }
  }
}
