// World-pickup catalog. Spawn cadence/lifetime/radius still live in
// WorldConfig.items (environment tuning); this file owns the pickup TYPES and
// their relative spawn weights, so adding/rebalancing pickups is data-only.
// `health` weight is additionally scaled by the difficulty's healthItemMult
// inside ItemSystem. Behavior for each type is dispatched by the Game
// (Game._collectItem), and per-type visuals live in Renderer.drawItems.

export const PickupConfig = {
  weights: {
    health: 40,
    bomb: 24,
    magnet: 13,
    freeze: 11,
    rage: 12,
  },
  healthValue: 35, // HP restored by a health pack (clamped to max)
};
