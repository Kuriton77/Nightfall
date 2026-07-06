// Victory overlay shown when a timed mode's survival target is reached. Displays
// the full run summary with Play Again / Main Menu actions.

export class VictoryScreen {
  constructor(root = document) {
    this.overlay = root.getElementById('victory-screen');
    this.timeText = root.getElementById('victory-time');
    this.levelText = root.getElementById('victory-level');
    this.killsText = root.getElementById('victory-kills');
    this.xpText = root.getElementById('victory-xp');
    this.weaponText = root.getElementById('victory-weapon');
    this.modeText = root.getElementById('victory-mode');
    this.difficultyText = root.getElementById('victory-difficulty');
    this.againBtn = root.getElementById('victory-again-btn');
    this.menuBtn = root.getElementById('victory-menu-btn');
    this.onPlayAgain = null;
    this.onMainMenu = null;
    this.againBtn.addEventListener('click', () => this.onPlayAgain && this.onPlayAgain());
    this.menuBtn.addEventListener('click', () => this.onMainMenu && this.onMainMenu());
  }

  show(summary, { onPlayAgain, onMainMenu }) {
    this.onPlayAgain = onPlayAgain;
    this.onMainMenu = onMainMenu;
    const m = Math.floor(summary.elapsed / 60);
    const s = Math.floor(summary.elapsed % 60);
    this.timeText.textContent =
      String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    this.levelText.textContent = summary.level;
    this.killsText.textContent = summary.kills;
    this.xpText.textContent = summary.xp;
    this.weaponText.textContent = summary.weapon;
    this.modeText.textContent = summary.mode;
    this.difficultyText.textContent = summary.difficulty;
    this.overlay.classList.remove('hidden');
  }

  hide() {
    this.overlay.classList.add('hidden');
  }
}
