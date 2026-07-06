import { ProgressionConfig } from '../config/ProgressionConfig.js';
import { PlayerConfig } from '../config/PlayerConfig.js';
import { WeaponConfig } from '../config/WeaponConfig.js';
import { Upgrades } from '../config/UpgradeConfig.js';

// Owns XP, level, and the player's chosen upgrade levels. Recomputes effective
// stats from base config + upgrade levels so values never compound/drift.

export class ProgressionSystem {
  constructor() {
    this.weaponId = WeaponConfig.default;
    this.reset();
  }

  // Weapon selection persists across resets (set by the Game per run).
  setWeapon(weaponId) {
    this.weaponId = WeaponConfig.weapons[weaponId] ? weaponId : WeaponConfig.default;
  }

  reset() {
    this.level = ProgressionConfig.startLevel;
    this.xp = 0;
    this.xpToNext = ProgressionConfig.xpForLevel(this.level);
    this.pendingLevelUps = 0;
    this.upgradeLevels = Object.create(null);
    for (const up of Upgrades) this.upgradeLevels[up.id] = 0;
  }

  // Returns true if at least one level-up was triggered.
  addXP(amount) {
    this.xp += amount;
    let leveled = false;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level++;
      this.pendingLevelUps++;
      this.xpToNext = ProgressionConfig.xpForLevel(this.level);
      leveled = true;
    }
    return leveled;
  }

  get xpPercent() {
    return this.xpToNext > 0 ? this.xp / this.xpToNext : 0;
  }

  isMaxed(upgradeId) {
    const def = Upgrades.find((u) => u.id === upgradeId);
    return def ? this.upgradeLevels[upgradeId] >= def.maxLevel : true;
  }

  // Upgrades not yet at max level, eligible to be offered.
  availableUpgrades() {
    return Upgrades.filter((u) => this.upgradeLevels[u.id] < u.maxLevel);
  }

  applyUpgrade(upgradeId) {
    if (this.upgradeLevels[upgradeId] === undefined) return;
    if (this.isMaxed(upgradeId)) return;
    this.upgradeLevels[upgradeId]++;
  }

  // Build effective stats from base config + cumulative upgrade levels.
  computeStats() {
    const stats = {
      player: { ...PlayerConfig.baseStats },
      weapon: { ...WeaponConfig.weapons[this.weaponId].stats },
    };
    for (const up of Upgrades) {
      const lvl = this.upgradeLevels[up.id];
      if (lvl > 0) up.modify(stats, lvl);
    }
    return stats;
  }

  // Push freshly computed stats onto the player, preserving current health.
  applyTo(player) {
    const stats = this.computeStats();
    player.stats = stats.player;
    player.weapon = stats.weapon;
    const prevMax = player.maxHealth;
    player.maxHealth = stats.player.maxHealth;
    // Grant any max-health increase as current health too.
    if (player.maxHealth > prevMax) {
      player.health += player.maxHealth - prevMax;
    }
    player.health = Math.min(player.health, player.maxHealth);
  }
}
