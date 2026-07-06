// Data-driven upgrade pool. Each upgrade's `modify` is applied to a FRESH copy
// of the base stats using the CUMULATIVE level, so effects never drift no matter
// how many times stats are recomputed. `describe(level)` documents the jump from
// `level` to `level + 1` for the selection screen.

export const Upgrades = [
  {
    id: 'damage',
    name: 'Attack Damage',
    maxLevel: 10,
    icon: '⚔️',
    describe: () => '+5 projectile damage',
    modify: (stats, level) => {
      stats.weapon.damage += 5 * level;
    },
  },
  {
    id: 'attackSpeed',
    name: 'Attack Speed',
    maxLevel: 10,
    icon: '⏱️',
    describe: () => '-10% attack cooldown',
    modify: (stats, level) => {
      stats.weapon.cooldown *= Math.pow(0.9, level);
    },
  },
  {
    id: 'projectileCount',
    name: 'Projectile Count',
    maxLevel: 10,
    icon: '✳️',
    describe: () => '+1 projectile per volley',
    modify: (stats, level) => {
      stats.weapon.projectileCount += level;
    },
  },
  {
    id: 'projectileSize',
    name: 'Projectile Size',
    maxLevel: 10,
    icon: '⭕',
    describe: () => '+2 projectile size',
    modify: (stats, level) => {
      stats.weapon.projectileSize += 2 * level;
    },
  },
  {
    id: 'moveSpeed',
    name: 'Movement Speed',
    maxLevel: 10,
    icon: '👟',
    describe: () => '+8% movement speed',
    modify: (stats, level) => {
      stats.player.moveSpeed *= Math.pow(1.08, level);
    },
  },
];
