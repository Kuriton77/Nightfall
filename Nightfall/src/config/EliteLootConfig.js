// Elite drop table — rolled once per elite death (in addition to the elite's
// normal XP gem). Data-driven and separate from BossConfig.rewards so elite and
// boss economies can be tuned independently. Each `drop` is either 'xpBurst'
// (a cluster of bonus gems) or a world-pickup type spawned at the death point.

export const EliteLootConfig = {
  // Fraction of elite deaths that yield BONUS loot (on top of the elite's normal
  // 4x XP gem). Gating this keeps late-game elite density from flooding the field
  // with consumables (near-permanent freeze/rage). Tune freely.
  dropChance: 0.6,

  // Weighted toward the low-impact XP burst so consumables stay special; the
  // strong effects (freeze/rage) are the rare, exciting rolls.
  table: [
    { drop: 'xpBurst', weight: 44 },
    { drop: 'health', weight: 18 },
    { drop: 'magnet', weight: 14 },
    { drop: 'freeze', weight: 12 },
    { drop: 'rage', weight: 12 },
  ],

  // 'xpBurst' parameters: a scatter of bonus gems worth, in total, the elite's
  // own XP value again (valueMult = 1.0).
  xpBurst: {
    gems: 6,
    scatter: 48,
    valueMult: 1.0,
  },
};
