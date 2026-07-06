// XP curve. xpForLevel(n) is the XP required to advance FROM level n to n+1.
// Tuned so the first level-up lands ~30–60s in and later levels take longer.

export const ProgressionConfig = {
  baseXP: 18, // XP to go from level 1 -> 2 (scaled x3 with enemy XP values)
  growth: 1.28, // geometric growth per level
  startLevel: 1,

  xpForLevel(level) {
    return Math.floor(this.baseXP * Math.pow(this.growth, level - 1));
  },
};
