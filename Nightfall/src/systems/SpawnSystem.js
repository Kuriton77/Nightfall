import { SpawnConfig } from '../config/SpawnConfig.js';
import { EnemyConfig, EliteConfig } from '../config/EnemyConfig.js';
import { GameConfig } from '../config/GameConfig.js';
import { IdentityMods } from '../config/DifficultyConfig.js';
import { clamp, TAU } from '../core/math.js';

// Spawns enemies just outside the camera view on a difficulty curve that ramps
// cadence, batch size, and enemy health with elapsed time. Difficulty
// multipliers (from DifficultyConfig) are injected via setModifiers().
// After EliteConfig.startTime, spawns roll a growing chance to come out as
// elites — the same archetype with multiplied stats (works for every type).

export class SpawnSystem {
  constructor(enemyPool) {
    this.enemyPool = enemyPool;
    this.mods = IdentityMods;
    this.reset();
  }

  reset() {
    this.timer = 0;
  }

  // Difficulty hook — mods is a DifficultyConfig `mods` object.
  setModifiers(mods) {
    this.mods = mods || IdentityMods;
  }

  _interval(elapsed) {
    const t = clamp(elapsed / SpawnConfig.intervalRampTime, 0, 1);
    const base = SpawnConfig.initialInterval +
      (SpawnConfig.minInterval - SpawnConfig.initialInterval) * t;
    return base * this.mods.spawnIntervalMult;
  }

  _batchSize(elapsed) {
    const grow = Math.floor((elapsed / 60) * SpawnConfig.batchGrowthPer60s);
    const scaled = Math.round((SpawnConfig.initialBatch + grow) * this.mods.batchMult);
    return clamp(scaled, 1, SpawnConfig.maxBatch);
  }

  _healthScale(elapsed) {
    return 1 + (elapsed / 60) * SpawnConfig.healthScalePer60s * this.mods.healthScaleMult;
  }

  // Weighted random pick among enemy types eligible at the current time.
  _pickType(elapsed) {
    const table = SpawnConfig.spawnTable;
    let total = 0;
    for (let i = 0; i < table.length; i++) {
      if (elapsed >= table[i].startTime) total += table[i].weight;
    }
    let roll = Math.random() * total;
    for (let i = 0; i < table.length; i++) {
      const entry = table[i];
      if (elapsed < entry.startTime) continue;
      roll -= entry.weight;
      if (roll <= 0) return entry.type;
    }
    return table[0].type;
  }

  update(dt, elapsed, camera) {
    this.timer -= dt;
    // `while` so a long frame can catch up multiple spawns deterministically.
    while (this.timer <= 0) {
      this.timer += this._interval(elapsed);
      const batch = this._batchSize(elapsed);
      for (let i = 0; i < batch; i++) this._spawnOne(elapsed, camera);
    }
  }

  _eliteChance(elapsed) {
    const e = EliteConfig;
    if (elapsed < e.startTime) return 0;
    const grown = e.baseChance + ((elapsed - e.startTime) / 60) * e.chanceGrowthPer60s;
    return clamp(grown, 0, e.maxChance);
  }

  // Shared stat setup for edge spawns, elite spawns, and direct placement.
  _configure(enemy, def, elapsed, isElite) {
    const e = EliteConfig;
    const maxHealth =
      def.baseHealth * this._healthScale(elapsed) * (isElite ? e.healthMult : 1);
    enemy.health = maxHealth;
    enemy.maxHealth = maxHealth;
    enemy.radius = def.radius * (isElite ? e.radiusMult : 1);
    enemy.speed = def.speed * (isElite ? e.speedMult : 1);
    enemy.contactDamage =
      def.contactDamage * this.mods.enemyDamageMult * (isElite ? e.damageMult : 1);
    enemy.attackCooldown = def.attackCooldown;
    enemy.attackTimer = 0;
    enemy.xpValue = isElite ? def.xpValue * e.xpMult : def.xpValue;
    enemy.color = def.color;
    enemy.hitFlash = 0;
    enemy.typeId = def.id;
    enemy.isElite = isElite;
  }

  _spawnOne(elapsed, camera) {
    if (this.enemyPool.active.length >= GameConfig.performance.maxEnemies) return;

    const def = EnemyConfig.types[this._pickType(elapsed)];
    const enemy = this.enemyPool.acquire();

    const angle = Math.random() * TAU;
    const dist = camera.viewRadius + SpawnConfig.spawnPadding;
    enemy.x = camera.x + Math.cos(angle) * dist;
    enemy.y = camera.y + Math.sin(angle) * dist;

    const isElite = Math.random() < this._eliteChance(elapsed);
    this._configure(enemy, def, elapsed, isElite);
  }

  // Direct placement at a world position (boss minion summons). Never elite;
  // respects the global enemy cap and full time/difficulty stat scaling.
  spawnAt(typeId, x, y, elapsed) {
    if (this.enemyPool.active.length >= GameConfig.performance.maxEnemies) return;
    const def = EnemyConfig.types[typeId] || EnemyConfig.types[EnemyConfig.defaultType];
    const enemy = this.enemyPool.acquire();
    enemy.x = x;
    enemy.y = y;
    this._configure(enemy, def, elapsed, false);
  }
}
