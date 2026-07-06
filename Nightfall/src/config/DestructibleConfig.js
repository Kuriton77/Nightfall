// Registry of destructible world-object TYPES — the data half of the reusable
// destructible framework. Each entry fully describes an object's combat,
// destruction, regrowth, and (optional) hostile behavior. WorldConfig owns
// PLACEMENT (chunk density); this owns what each object IS. Adding a new
// destructible (rock, crate, mushroom, shrine, barrel, ore node) is one entry
// here — the WorldSystem / WeaponSystem / Renderer are all type-agnostic.
//
// Field reference:
//   radius        - collision + hit radius
//   maxHealth     - HP; every weapon damages it through the shared pipeline
//   solid         - participates in player collision while alive
//   regrowTime    - seconds after destruction before it regrows (full HP)
//   growDuration  - seconds of the grow-in scale animation on regrowth
//   particles[]   - destruction burst specs (data-driven; see EffectSystem.burst)
//   hostile       - optional; objects that attack the player in range (trees)

export const DestructibleConfig = {
  tree: {
    id: 'tree',
    radius: 20,
    maxHealth: 60,
    solid: true,
    regrowTime: 45,
    growDuration: 1.1,
    particles: [
      { count: 7, color: '#3f7d4f', speed: 95, size: 4, life: 0.62, spreadUp: true }, // leaves
      { count: 5, color: '#5a3f2a', speed: 130, size: 3, life: 0.5 }, // wood chips
    ],
    hostile: {
      attackRange: 130, // wakes up when the player is this close
      damageRange: 100, // only lands a hit if the player is within this on attack
      attackInterval: 1.3,
      damage: 10,
    },
  },
};
