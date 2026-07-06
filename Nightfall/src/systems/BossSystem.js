import { BossConfig } from '../config/BossConfig.js';
import { GameConfig } from '../config/GameConfig.js';
import { IdentityMods } from '../config/DifficultyConfig.js';
import { TAU } from '../core/math.js';
import { Boss } from '../entities/Boss.js';

// Owns the boss fight end to end: spawn scheduling (per game mode), the boss
// AI state machine, boss projectiles, and the circular arena that confines the
// fight. World mutations (tree clearing, minion spawns, effects, SFX) are
// delegated through injected hooks so the system stays decoupled, matching the
// ItemSystem pattern. Boss damage/death flows through the shared WeaponSystem
// pipeline — the Game routes `isBoss` deaths here via endFight().

export class BossSystem {
  constructor(bossProjectilePool, hooks) {
    this.pool = bossProjectilePool;
    this.hooks = hooks; // { spawnEffect, spawnEffectCustom, spawnMinion, hideTrees, restoreTrees, onBossSpawn, playSfx }
    this.boss = new Boss();
    this.def = null; // BossConfig entry for the live boss
    this.mods = IdentityMods;
    this.arena = { active: false, x: 0, y: 0, radius: BossConfig.arena.radius };
    this.reset();
  }

  reset() {
    this.boss.active = false;
    this.boss.reset();
    this.def = null;
    this.arena.active = false;
    this.schedule = null;
    this.scheduleIndex = 0;
    this.endless = null;
    this.nextEndlessTime = Infinity;
    this.endlessIndex = 0;
    this.pool.clear();
  }

  // Run-start hook: reads the mode's boss descriptor (schedule for timed modes,
  // interval + cycle for endless) and the difficulty multipliers.
  configure(mode, mods) {
    this.mods = mods || IdentityMods;
    const cfg = mode.bosses;
    if (!cfg) return;
    if (cfg.schedule) this.schedule = cfg.schedule;
    if (cfg.interval) {
      this.endless = cfg;
      this.nextEndlessTime = cfg.interval;
    }
  }

  get activeBoss() {
    return this.boss.active ? this.boss : null;
  }

  // `moveScale` (default 1) scales boss MOVEMENT only — a Freeze pickup passes
  // BuffConfig.freeze.bossSlowMult so the boss is slowed but keeps attacking
  // (bosses are never fully frozen). Attack timers/telegraphs run at full rate.
  update(dt, elapsed, player, enemyPool, moveScale = 1) {
    this._checkSpawn(elapsed, player);
    if (this.boss.active) {
      this._updateBoss(dt, player, moveScale);
      this._constrainInside(this.boss);
      this._constrainInside(player);
      this._constrainEnemiesOutside(enemyPool);
    }
    this._updateProjectiles(dt, player);
  }

  // Called by the Game when the boss's health reaches zero (rewards are the
  // Game's job). Tears down the fight and restores the arena-hidden trees
  // immediately (they were never destroyed; destroyed trees keep regrowing).
  endFight() {
    this.boss.active = false;
    this.arena.active = false;
    this.def = null;
    this.pool.clear();
    if (this.hooks.restoreTrees) this.hooks.restoreTrees();
  }

  // ---- Spawning -----------------------------------------------------------

  _checkSpawn(elapsed, player) {
    if (this.boss.active) return; // one boss at a time; due spawns wait

    if (this.schedule && this.scheduleIndex < this.schedule.length) {
      const entry = this.schedule[this.scheduleIndex];
      if (elapsed >= entry.time) {
        this.scheduleIndex++;
        this._spawn(entry.boss, !!entry.final, entry.scale || 1, player);
      }
      return;
    }

    if (this.endless && elapsed >= this.nextEndlessTime) {
      const cycle = this.endless.cycle;
      const typeId = cycle[this.endlessIndex % cycle.length];
      const scale = 1 + this.endlessIndex * this.endless.scaleGrowth;
      this.endlessIndex++;
      this.nextEndlessTime += this.endless.interval;
      this._spawn(typeId, false, scale, player);
    }
  }

  _spawn(typeId, isFinal, scale, player) {
    const def = BossConfig.bosses[typeId];
    this.def = def;

    const b = this.boss;
    b.reset();
    b.active = true;
    b.typeId = def.id;
    b.name = def.name;
    b.isFinal = isFinal;
    b.radius = def.radius;
    b.speed = def.speed;
    b.maxHealth = Math.round(def.baseHealth * scale * this.mods.healthScaleMult);
    b.health = b.maxHealth;
    // Damage grows slower than health so heavily scaled bosses stay survivable.
    b.damageMult = (1 + (scale - 1) * 0.4) * this.mods.enemyDamageMult;
    b.contactDamage = def.contactDamage * b.damageMult;
    b.attackCooldown = def.attackCooldown;
    b.xpValue = Math.round(def.xpReward * scale);
    b.color = def.color;
    b.coreColor = def.coreColor;
    b.specialTimer = def.specialInterval * 0.75; // first special arrives early

    const angle = Math.random() * TAU;
    b.x = player.x + Math.cos(angle) * BossConfig.spawnDistance;
    b.y = player.y + Math.sin(angle) * BossConfig.spawnDistance;

    // Arena: fixed at the spawn point (the boss may roam, the wall does not).
    const arena = this.arena;
    arena.active = true;
    arena.x = b.x;
    arena.y = b.y;
    arena.radius = BossConfig.arena.radius;
    // Temporarily HIDE trees inside the arena (not destroyed) — restored intact
    // when the fight ends. Destruction + regrowth are handled separately.
    this.hooks.hideTrees(arena.x, arena.y, arena.radius + BossConfig.arena.clearMargin);

    this.hooks.spawnEffect('bossSpawn', b.x, b.y);
    this.hooks.onBossSpawn(b);
  }

  // ---- Boss AI --------------------------------------------------------------

  _updateBoss(dt, player, moveScale) {
    const b = this.boss;
    const def = this.def;
    if (b.hitFlash > 0) b.hitFlash -= dt;
    if (b.attackTimer > 0) b.attackTimer -= dt;

    const dx = player.x - b.x;
    const dy = player.y - b.y;
    const dist = Math.hypot(dx, dy);

    switch (b.state) {
      case 'chase': {
        if (dist > 0.0001) {
          const step = (b.speed * dt * moveScale) / dist;
          b.x += dx * step;
          b.y += dy * step;
        }
        b.specialTimer -= dt;
        if (b.specialTimer <= 0) this._startWindup(def);
        break;
      }
      case 'windup': {
        // Stationary telegraph; keep tracking the player so the charge lane /
        // burst aim stays honest until the attack actually launches.
        if (dist > 0.0001) {
          b.chargeDirX = dx / dist;
          b.chargeDirY = dy / dist;
        }
        b.stateTimer -= dt;
        if (b.stateTimer <= 0) this._executeAttack(def, player);
        break;
      }
      case 'charge': {
        b.x += b.chargeDirX * def.charge.speed * dt * moveScale;
        b.y += b.chargeDirY * def.charge.speed * dt * moveScale;
        b.stateTimer -= dt;
        if (b.stateTimer <= 0) this._endAttack(def);
        break;
      }
      case 'shockwave': {
        const cfg = def.shockwave;
        b.waveRadius += cfg.speed * dt;
        // The wave front damages the player once when it passes over them;
        // standing beyond maxRadius (or leaving during the windup) avoids it.
        if (!b.waveHit && dist <= b.waveRadius && dist <= cfg.maxRadius) {
          player.takeDamage(cfg.damage * b.damageMult);
          b.waveHit = true;
        }
        b.stateTimer -= dt;
        if (b.stateTimer <= 0) this._endAttack(def);
        break;
      }
    }

    // Contact damage in every state (recomputed after movement).
    const cdx = player.x - b.x;
    const cdy = player.y - b.y;
    const touch = b.radius + player.radius;
    if (cdx * cdx + cdy * cdy <= touch * touch && b.attackTimer <= 0) {
      player.takeDamage(b.contactDamage);
      b.attackTimer = b.attackCooldown;
    }
  }

  _startWindup(def) {
    const b = this.boss;
    const attackId = def.attacks[b.attackIndex % def.attacks.length];
    b.attackIndex++;
    b.pendingAttack = attackId;
    const cfg = def[attackId];
    b.state = 'windup';
    b.stateTimer = cfg.windup;
    b.stateDuration = cfg.windup;
    b.chargeLineLen = attackId === 'charge' ? cfg.speed * cfg.duration : 0;
  }

  _executeAttack(def, player) {
    const b = this.boss;
    const attackId = b.pendingAttack;
    b.pendingAttack = null;

    if (attackId === 'charge') {
      b.state = 'charge';
      b.stateTimer = def.charge.duration;
      b.stateDuration = def.charge.duration;
      this.hooks.playSfx('charge');
      return;
    }

    if (attackId === 'burst') {
      const cfg = def.burst;
      // Aim the ring so one projectile heads straight at the player.
      const base = Math.atan2(player.y - b.y, player.x - b.x);
      for (let i = 0; i < cfg.count; i++) {
        const angle = base + (i * TAU) / cfg.count;
        this._spawnBossProjectile(b, angle, cfg);
      }
      this.hooks.spawnEffect('summon', b.x, b.y);
      this.hooks.playSfx('bossShot');
      this._endAttack(def);
      return;
    }

    if (attackId === 'shockwave') {
      const cfg = def.shockwave;
      b.state = 'shockwave';
      b.waveRadius = b.radius;
      b.waveHit = false;
      const travel = (cfg.maxRadius - b.radius) / cfg.speed;
      b.stateTimer = travel;
      b.stateDuration = travel;
      // Visual ring with the exact same radius-over-time as the damage front.
      this.hooks.spawnEffectCustom(b.x, b.y, {
        life: travel,
        r0: b.radius,
        rMax: cfg.maxRadius,
        width: 5,
        color: GameConfig.colors.effectShockwave,
      });
      this.hooks.playSfx('bomb');
      return;
    }

    if (attackId === 'summon') {
      const cfg = def.summon;
      const arena = this.arena;
      const maxDist = arena.radius - 40;
      for (let i = 0; i < cfg.count; i++) {
        const angle = (i * TAU) / cfg.count + Math.random() * 0.5;
        let x = b.x + Math.cos(angle) * cfg.ring;
        let y = b.y + Math.sin(angle) * cfg.ring;
        // Keep summons inside the arena so they join the fight immediately.
        const ax = x - arena.x;
        const ay = y - arena.y;
        const d2 = ax * ax + ay * ay;
        if (d2 > maxDist * maxDist) {
          const s = maxDist / Math.sqrt(d2);
          x = arena.x + ax * s;
          y = arena.y + ay * s;
        }
        this.hooks.spawnMinion(cfg.type, x, y);
        this.hooks.spawnEffect('summon', x, y);
      }
      this.hooks.playSfx('bossShot');
      this._endAttack(def);
    }
  }

  _endAttack(def) {
    const b = this.boss;
    b.state = 'chase';
    b.stateTimer = 0;
    b.specialTimer = def.specialInterval;
  }

  // ---- Boss projectiles -----------------------------------------------------

  _spawnBossProjectile(b, angle, cfg) {
    if (this.pool.active.length >= MAX_BOSS_PROJECTILES) return;
    const p = this.pool.acquire();
    p.x = b.x + Math.cos(angle) * b.radius;
    p.y = b.y + Math.sin(angle) * b.radius;
    p.vx = Math.cos(angle) * cfg.speed;
    p.vy = Math.sin(angle) * cfg.speed;
    p.damage = cfg.damage * b.damageMult;
    p.size = cfg.size;
    p.life = cfg.life;
    p.pierce = 0;
  }

  _updateProjectiles(dt, player) {
    const projectiles = this.pool.active;
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.release(p);
        continue;
      }
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const r = p.size + player.radius;
      if (dx * dx + dy * dy <= r * r) {
        player.takeDamage(p.damage);
        this.pool.release(p);
      }
    }
    this.pool.sweep();
  }

  // ---- Arena constraints ----------------------------------------------------

  // Player and boss cannot leave the arena.
  _constrainInside(obj) {
    const arena = this.arena;
    if (!arena.active) return;
    const dx = obj.x - arena.x;
    const dy = obj.y - arena.y;
    const maxDist = arena.radius - obj.radius;
    const d2 = dx * dx + dy * dy;
    if (d2 > maxDist * maxDist && d2 > 0.0001) {
      const s = maxDist / Math.sqrt(d2);
      obj.x = arena.x + dx * s;
      obj.y = arena.y + dy * s;
    }
  }

  // Enemies outside the wall cannot enter; enemies already inside are free.
  _constrainEnemiesOutside(enemyPool) {
    const arena = this.arena;
    if (!arena.active) return;
    const enemies = enemyPool.active;
    const R = arena.radius;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const dx = e.x - arena.x;
      const dy = e.y - arena.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= R * R) continue; // inside: continues functioning normally
      const minDist = R + e.radius;
      if (d2 < minDist * minDist && d2 > 0.0001) {
        const s = minDist / Math.sqrt(d2);
        e.x = arena.x + dx * s;
        e.y = arena.y + dy * s;
      }
    }
  }
}

// Hard cap on simultaneous boss projectiles (well above any burst size).
const MAX_BOSS_PROJECTILES = 64;
