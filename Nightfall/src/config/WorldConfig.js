// Environment + world-item tuning. Kept as data so placement density, hostility,
// and item cadence are all trivially adjustable.

export const WorldConfig = {
  // Procedural tree PLACEMENT uses a jittered sub-grid inside deterministic
  // world chunks (see WorldSystem). Min spacing is guaranteed by the sub-grid:
  // adjacent trees are at least (cellSize - 2*jitter) apart. Each tree's
  // intrinsic stats (radius, health, hostile behavior, regrowth, particles)
  // live in DestructibleConfig.tree — this block is purely where/how-many.
  trees: {
    chunkSize: 512, // world px per generation chunk
    cellSize: 150, // one candidate tree per sub-grid cell
    jitter: 40, // max random offset from a cell center
    skipChance: 0.5, // fraction of cells left empty (prevents density/trapping)
    clearRadius: 240, // keep the spawn area (world origin) tree-free
    activeChunkRadius: 2, // chunks around the player kept live (each direction)
  },

  // Occasional beneficial pickups. Spawn cadence/placement lives here; the
  // pickup TYPES, spawn weights, and heal value are in PickupConfig.
  items: {
    spawnInterval: 15, // average seconds between item spawns
    spawnIntervalJitter: 6, // +/- randomness on the interval
    maxActive: 4, // hard cap on simultaneous world items
    spawnMinDist: 170, // spawn ring around the player
    spawnMaxDist: 360,
    pickupRadius: 24,
    lifetime: 22, // seconds before an uncollected item despawns
    radius: 14,
  },
};
