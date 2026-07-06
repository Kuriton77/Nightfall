// Dash tuning. Kept as data so dash upgrades / evolutions later are pure config
// edits. `invulnDuration` is slightly longer than `duration` so the i-frames
// cover the moment you land, which feels fair.

export const DashConfig = {
  speed: 1150, // px/sec burst speed while dashing
  duration: 0.16, // seconds of active dash movement (~184px of travel)
  cooldown: 4, // seconds before it can be used again
  invulnDuration: 0.3, // seconds of full invulnerability from dash start
  trailInterval: 0.025, // seconds between afterimage trail effects
};
