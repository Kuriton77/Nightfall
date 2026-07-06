// Data-driven timed effects consumed by BuffSystem. A "buff" here is any timed
// status shown in the Buff HUD — player buffs (rage) and world/enemy status
// effects (freeze) share one framework. Adding a new buff = one entry here plus
// whichever system reads its payload; the HUD needs no changes.
//
// Payload fields (all optional, read by the relevant consumer):
//   damageMult / cooldownMult - aggregated by BuffSystem into combat mods
//                               (WeaponSystem applies them to every weapon).
//   bossSlowMult              - boss movement scale while active (BossSystem).
//   target                    - documentation only ('player' | 'enemies').

export const BuffConfig = {
  rage: {
    id: 'rage',
    label: 'RAGE',
    icon: '🔥',
    color: '#ff7a3f',
    duration: 20,
    target: 'player',
    damageMult: 1.5, // +50% damage
    cooldownMult: 1 / 1.2, // +20% attack speed (shorter cooldown)
  },
  freeze: {
    id: 'freeze',
    label: 'FROZEN',
    icon: '❄️',
    color: '#9fe4ff',
    duration: 5,
    target: 'enemies',
    bossSlowMult: 0.5, // bosses aren't fully frozen — slowed 50%
  },
};
