// Starter weapons — data-driven so more can be added by dropping in a new entry.
// Every weapon shares the same base stat fields (so all upgrades apply to all),
// and `kind` selects the combat pipeline in WeaponSystem:
//   kind 'projectile' (default) — auto-fires a fan of projectiles.
//   kind 'melee'                — swings a cone; a combo finisher throws a blade.
//
//   bolt    — measured, accurate single-target fire (the original MVP weapon).
//   scatter — short-range piercing shotgun; low per-hit damage, great vs crowds.
//   sword   — wide melee cone with a 3-hit combo; every 3rd attack throws a
//             piercing blade that refreshes the dash on hit (aggressive loop).

export const WeaponConfig = {
  default: 'bolt',

  weapons: {
    bolt: {
      id: 'bolt',
      name: 'Magic Bolt',
      icon: '🔮',
      kind: 'projectile',
      description: 'Balanced auto-targeting bolt. Reliable single-target damage.',
      stats: {
        kind: 'projectile',
        damage: 12,
        cooldown: 0.75,
        projectileCount: 1,
        projectileSize: 6,
        projectileSpeed: 460,
        projectileLifetime: 1.2,
        pierce: 0,
        spread: 0.16, // radians between projectiles in the fan
        spreadJitter: 0, // random angle noise per shot (radians)
      },
    },
    scatter: {
      id: 'scatter',
      name: 'Scatter Blast',
      icon: '💥',
      kind: 'projectile',
      description: 'Piercing spread. Low damage per pellet, devastating in a crowd.',
      stats: {
        kind: 'projectile',
        damage: 6,
        cooldown: 0.5,
        projectileCount: 3,
        projectileSize: 7,
        projectileSpeed: 380,
        projectileLifetime: 0.5, // short lifetime -> short range
        pierce: 1,
        spread: 0.28, // wider fan
        spreadJitter: 0.14, // shotgun-like randomness
      },
    },
    sword: {
      id: 'sword',
      name: 'Nightblade',
      icon: '🗡️',
      kind: 'melee',
      description: 'Wide melee combo. Every 3rd swing hurls a blade that refreshes your dash on hit.',
      stats: {
        kind: 'melee',
        damage: 15,
        cooldown: 0.5, // seconds per swing
        // Shared fields kept so all upgrades apply cleanly. For the sword,
        // projectileCount = blades thrown by the finisher; projectileSize scales
        // the blade + arc thickness. Speed/lifetime/pierce below are defaults;
        // the throw block overrides them for the finisher.
        projectileCount: 1,
        projectileSize: 7,
        projectileSpeed: 560,
        projectileLifetime: 0.8,
        pierce: 99,
        spread: 0.14, // spacing between thrown blades when count > 1
        spreadJitter: 0,
        // Melee swing geometry.
        melee: {
          range: 108, // reach in px (~1 tile; tuned for playable melee)
          coneDeg: 90, // full cone width
        },
        // Combo finisher — the sword throw.
        combo: {
          length: 3, // every 3rd attack is the throw
          damageMult: 2.4, // finisher hits harder than a swing
          sizeMult: 1.7, // bigger blade
          speed: 620, // faster + longer range than a swing
          lifetime: 0.85,
          pierce: 999, // passes through the whole line
        },
      },
    },
  },
};
