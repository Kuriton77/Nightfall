// Base player definition. Effective stats are recomputed from these values
// plus upgrade levels (see ProgressionSystem), so this stays the source of truth.

export const PlayerConfig = {
  radius: 15,
  startPosition: { x: 0, y: 0 },
  invulnerabilityTime: 0.4, // brief i-frames after taking a hit
  baseStats: {
    maxHealth: 100,
    moveSpeed: 210, // px/sec
    pickupRadius: 70, // gems within this range are magneted in
    healthRegen: 0.5, // hp/sec
  },
};
