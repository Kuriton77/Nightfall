// Live HUD: health bar, XP bar, level, survival timer, kill count. Reads DOM
// nodes once and mutates only what changed each frame.

export class HUD {
  constructor(root = document) {
    this.healthFill = root.getElementById('health-fill');
    this.healthText = root.getElementById('health-text');
    this.xpFill = root.getElementById('xp-fill');
    this.levelText = root.getElementById('level-text');
    this.timerText = root.getElementById('timer-text');
    this.killsText = root.getElementById('kills-text');
    this.difficultyBadge = root.getElementById('difficulty-badge');
    this.aimIndicator = root.getElementById('aim-indicator');
  }

  update(state) {
    const hpPct = Math.max(0, state.player.health / state.player.maxHealth) * 100;
    this.healthFill.style.width = hpPct + '%';
    this.healthText.textContent =
      Math.max(0, Math.ceil(state.player.health)) + ' / ' + Math.ceil(state.player.maxHealth);

    this.xpFill.style.width = state.progression.xpPercent * 100 + '%';
    this.levelText.textContent = 'LV ' + state.progression.level;
    this.timerText.textContent = formatTime(state.elapsed);
    this.killsText.textContent = state.kills;
    this.difficultyBadge.textContent = state.difficulty;
    this.aimIndicator.textContent = state.freeAim ? 'FREE AIM' : 'AUTO AIM';
    this.aimIndicator.classList.toggle('free', state.freeAim);
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
