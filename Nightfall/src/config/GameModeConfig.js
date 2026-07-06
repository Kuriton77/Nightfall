// Game modes — data-driven. `duration` is the survival target in seconds;
// `null` means endless (no victory condition, difficulty scales forever).
//
// `bosses` drives the BossSystem:
//   schedule: [{ time, boss, final?, scale? }] — timed modes. The final boss
//     spawns when the timer target is reached; victory requires killing it
//     (reaching the timer alone never wins).
//   interval + cycle + scaleGrowth — endless modes. A boss rises every
//     `interval` seconds, cycling through `cycle`; boss #n is scaled by
//     1 + n * scaleGrowth, so they grow progressively stronger forever.

export const GameModes = {
  time10: {
    id: 'time10',
    name: '10 Minutes',
    icon: '⏱️',
    duration: 600,
    description: 'Survive to 10:00, then slay the Night Monarch to win.',
    bosses: {
      schedule: [
        { time: 300, boss: 'warden' },
        { time: 600, boss: 'monarch', final: true },
      ],
    },
  },
  time20: {
    id: 'time20',
    name: '20 Minutes',
    icon: '⏳',
    duration: 1200,
    description: 'A longer trial. Two Wardens guard the road to the Monarch.',
    bosses: {
      schedule: [
        { time: 300, boss: 'warden' },
        { time: 900, boss: 'warden', scale: 2.2 },
        { time: 1200, boss: 'monarch', final: true, scale: 1.4 },
      ],
    },
  },
  endless: {
    id: 'endless',
    name: 'Endless',
    icon: '♾️',
    duration: null,
    description: 'No time limit. A boss rises every 10 minutes, each stronger than the last.',
    bosses: {
      interval: 600,
      cycle: ['warden', 'monarch'],
      scaleGrowth: 0.6,
    },
  },
};

// Display order for the mode-select menu.
export const GameModeOrder = ['time10', 'time20', 'endless'];

export const DefaultMode = 'time10';
