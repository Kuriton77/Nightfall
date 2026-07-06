// Difficulty curve. Spawn cadence quickens and batch size grows over time,
// enemy health scales up, and the enemy MIX unlocks in phases:
//   Early  (0s+):   grunts only
//   Mid    (40s+):  grunts + fast
//   Late   (110s+): grunts + fast + tank
// Each spawn picks a type by weighted random among entries eligible at the
// current elapsed time (see SpawnSystem).

export const SpawnConfig = {
  spawnTable: [
    { type: 'grunt', weight: 70, startTime: 0 },
    { type: 'fast', weight: 32, startTime: 40 },
    { type: 'tank', weight: 18, startTime: 110 },
  ],

  // Spawn cadence.
  initialInterval: 1.0, // seconds between spawns at t=0
  minInterval: 0.16, // fastest cadence
  intervalRampTime: 240, // seconds to reach minInterval

  // How many spawn per tick, growing over the run.
  initialBatch: 1,
  batchGrowthPer60s: 1, // +1 to batch size each minute
  maxBatch: 6,

  // Enemies appear just beyond the visible edge.
  spawnPadding: 60,

  // Enemy health multiplier grows linearly with elapsed minutes.
  healthScalePer60s: 0.4, // +40% max health per minute
};
