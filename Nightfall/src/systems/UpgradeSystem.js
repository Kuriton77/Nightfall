// Chooses the random set of upgrades offered on level-up. Purely stateless
// selection logic driven by the progression system's available pool.

export class UpgradeSystem {
  constructor(progression) {
    this.progression = progression;
  }

  // Return up to `count` distinct random upgrade definitions that aren't maxed.
  rollChoices(count = 3) {
    const pool = this.progression.availableUpgrades().slice();
    // Fisher–Yates partial shuffle.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    return pool.slice(0, Math.min(count, pool.length));
  }
}
