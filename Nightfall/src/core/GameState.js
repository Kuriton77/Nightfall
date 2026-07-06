// Central game-state enum — the single source of truth for the top-level state
// machine. Systems and UI branch on these values; transitions run through
// Game._setState(), which guarantees only one screen is visible at a time.
//
// The simulation only advances in PLAYING; every other state naturally freezes
// gameplay (no _update call), which is what makes pause/upgrade/game-over "stop
// time" without any per-system pause flags.

export const GameState = Object.freeze({
  MAIN_MENU: 'main_menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  UPGRADE: 'upgrade',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
});
