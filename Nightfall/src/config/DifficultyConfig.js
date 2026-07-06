// Centralized difficulty balancing. Each difficulty is a set of named
// multipliers consumed by existing systems (no hardcoded per-difficulty logic
// anywhere else). Normal is the baseline (all multipliers 1.0). To retune a
// difficulty, edit only this file.
//
// Multiplier reference:
//   damageTakenMult   - scales ALL incoming player damage (enemies + trees)
//   xpMult            - scales XP gained from gems
//   regenMult         - scales passive health regen (0 disables it)
//   spawnIntervalMult - scales time between spawns (>1 = fewer enemies)
//   batchMult         - scales enemies per spawn tick
//   healthScaleMult   - scales how fast enemy health grows over time
//   enemyDamageMult   - scales enemy base contact damage
//   treeDensityMult   - scales tree density (<1 fewer, >1 more)
//   healthItemMult    - scales health-pack spawn weight (frequency)

export const Difficulties = {
  easy: {
    id: 'easy',
    name: 'Easy',
    icon: '🌱',
    description: 'Beginner friendly. Take less damage, level faster, face fewer foes.',
    mods: {
      damageTakenMult: 0.5,
      xpMult: 1.35,
      regenMult: 1.6,
      spawnIntervalMult: 1.35,
      batchMult: 0.7,
      healthScaleMult: 0.8,
      enemyDamageMult: 0.85,
      treeDensityMult: 0.6,
      healthItemMult: 1.8,
    },
  },
  normal: {
    id: 'normal',
    name: 'Normal',
    icon: '⚔️',
    description: 'The intended experience. Balanced challenge from start to finish.',
    mods: {
      damageTakenMult: 1,
      xpMult: 1,
      regenMult: 1,
      spawnIntervalMult: 1,
      batchMult: 1,
      healthScaleMult: 1,
      enemyDamageMult: 1,
      treeDensityMult: 1,
      healthItemMult: 1,
    },
  },
  hard: {
    id: 'hard',
    name: 'Hard',
    icon: '🔥',
    description: 'Challenging but fair. More enemies, denser forest, slower leveling.',
    mods: {
      damageTakenMult: 1.35,
      xpMult: 0.9,
      regenMult: 1,
      spawnIntervalMult: 0.8,
      batchMult: 1.3,
      healthScaleMult: 1.2,
      enemyDamageMult: 1.15,
      treeDensityMult: 1.35,
      healthItemMult: 0.8,
    },
  },
  hardcore: {
    id: 'hardcore',
    name: 'Hardcore',
    icon: '💀',
    description: 'A brutal survival test. No regen, no mercy, the highest enemy pressure.',
    mods: {
      damageTakenMult: 1.8,
      xpMult: 0.8,
      regenMult: 0,
      spawnIntervalMult: 0.62,
      batchMult: 1.6,
      healthScaleMult: 1.4,
      enemyDamageMult: 1.3,
      treeDensityMult: 1.6,
      healthItemMult: 0.55,
    },
  },
};

export const DifficultyOrder = ['easy', 'normal', 'hard', 'hardcore'];

export const DefaultDifficulty = 'normal';

// Identity multipliers — safe default when no difficulty is applied yet.
export const IdentityMods = Difficulties.normal.mods;
