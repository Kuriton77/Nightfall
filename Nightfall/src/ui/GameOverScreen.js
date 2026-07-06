// Game-over overlay showing the final run summary and a restart button.

export class GameOverScreen {
  constructor(root = document) {
    this.overlay = root.getElementById('gameover-screen');
    this.timeText = root.getElementById('final-time');
    this.levelText = root.getElementById('final-level');
    this.killsText = root.getElementById('final-kills');
    this.difficultyText = root.getElementById('final-difficulty');
    this.restartBtn = root.getElementById('restart-btn');
    this.onRestart = null;
    this.restartBtn.addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });
  }

  show(summary, onRestart) {
    this.onRestart = onRestart;
    const m = Math.floor(summary.elapsed / 60);
    const s = Math.floor(summary.elapsed % 60);
    this.timeText.textContent =
      String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    this.levelText.textContent = summary.level;
    this.killsText.textContent = summary.kills;
    this.difficultyText.textContent = summary.difficulty;
    this.overlay.classList.remove('hidden');
  }

  hide() {
    this.overlay.classList.add('hidden');
  }
}
