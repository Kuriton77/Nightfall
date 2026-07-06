// Boss + arena tuning. Every boss is pure data: stats, an ordered attack list,
// and per-attack parameters. Adding a boss = one entry in `bosses` plus a
// schedule reference in GameModeConfig — no logic changes (see BossSystem).
//
// Attack parameter reference:
//   charge    - windup telegraph, then a locked-direction dash
//   burst     - ring of boss projectiles aimed so one heads at the player
//   shockwave - expanding damage ring; escape its maxRadius during the windup
//   summon    - minions placed in a ring around the boss (regular enemies)

export const BossConfig = {
  // Circular arena created around the boss spawn point.
  arena: {
    radius: 480, // ~15 m at ~32 px/m — roomy enough to dodge every attack
    clearMargin: 60, // trees are also removed this far beyond the wall
  },

  // How far from the player the boss materializes (always inside the arena).
  spawnDistance: 320,

  // Rewards granted on any boss death (see Game._handleBossDeath).
  rewards: {
    gemCount: 26, // the boss XP reward explodes into this many gems
    gemScatter: 130, // max scatter radius of the gem burst
    pickupType: 'health', // guaranteed world-item drop
  },

  bosses: {
    // Mini boss — a straightforward bruiser that teaches charge + burst.
    warden: {
      id: 'warden',
      name: 'THE WARDEN',
      radius: 42,
      baseHealth: 2000,
      speed: 62,
      contactDamage: 18,
      attackCooldown: 0.8,
      xpReward: 160,
      specialInterval: 4.0, // seconds of chasing between special attacks
      attacks: ['charge', 'burst'],
      charge: { windup: 0.7, speed: 520, duration: 0.75 },
      burst: { windup: 0.5, count: 10, speed: 240, damage: 10, size: 8, life: 2.6 },
      color: '#e07b3f',
      coreColor: '#4a2410',
    },

    // Final boss — every attack pattern, higher pressure.
    monarch: {
      id: 'monarch',
      name: 'NIGHT MONARCH',
      radius: 58,
      baseHealth: 5200,
      speed: 55,
      contactDamage: 26,
      attackCooldown: 0.8,
      xpReward: 420,
      specialInterval: 3.2,
      attacks: ['burst', 'charge', 'summon', 'shockwave'],
      charge: { windup: 0.6, speed: 600, duration: 0.7 },
      burst: { windup: 0.45, count: 14, speed: 270, damage: 12, size: 9, life: 2.8 },
      shockwave: { windup: 0.8, speed: 420, damage: 22, maxRadius: 320 },
      summon: { windup: 0.6, count: 6, type: 'fast', ring: 120 },
      color: '#8f4de1',
      coreColor: '#22093f',
    },
  },
};
