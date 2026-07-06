// Enemy archetypes, keyed by id so new types are pure data. The spawn mix over
// time is defined in SpawnConfig.js.
//
// XP values are scaled x3 vs. the original single-enemy MVP (grunt 1 -> 3) and
// ProgressionConfig.baseXP is scaled identically, so level-up pacing is
// unchanged while allowing "slightly less" (fast) / "more" (tank) rewards.

export const EnemyConfig = {
  types: {
    // Baseline chaser.
    grunt: {
      id: 'grunt',
      radius: 13,
      baseHealth: 22,
      speed: 74,
      contactDamage: 8,
      attackCooldown: 0.6,
      xpValue: 3,
      color: '#e05a5a',
    },
    // Fast, fragile — forces the player to keep moving and reposition.
    fast: {
      id: 'fast',
      radius: 10,
      baseHealth: 11,
      speed: 142,
      contactDamage: 6,
      attackCooldown: 0.45,
      xpValue: 2,
      color: '#e8b84d',
    },
    // Tank — slow but durable; crowds the field and pressures the player.
    tank: {
      id: 'tank',
      radius: 22,
      baseHealth: 95,
      speed: 44,
      contactDamage: 15,
      attackCooldown: 0.85,
      xpValue: 9,
      color: '#9b6ce0',
    },
  },
  defaultType: 'grunt',
};

// Elite variants: any enemy type can spawn as an elite after `startTime`, with
// a chance that grows over the run. Elites are the same archetype scaled up —
// all multipliers apply uniformly, so new enemy types get elites for free.
export const EliteConfig = {
  startTime: 180, // elites begin appearing at 3:00
  baseChance: 0.05, // spawn chance at startTime
  chanceGrowthPer60s: 0.025, // added chance per minute after startTime
  maxChance: 0.22,

  healthMult: 3.4,
  damageMult: 1.6,
  radiusMult: 1.35,
  speedMult: 0.95, // slightly slower — bigger and scarier, not faster
  xpMult: 4,
};
