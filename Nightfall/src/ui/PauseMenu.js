// Pause menu overlay: Resume / Settings / Return to Main Menu.

export class PauseMenu {
  constructor(root = document) {
    this.overlay = root.getElementById('pause-menu');
    this.resumeBtn = root.getElementById('pause-resume-btn');
    this.settingsBtn = root.getElementById('pause-settings-btn');
    this.menuBtn = root.getElementById('pause-menu-btn');
  }

  bind({ onResume, onSettings, onMainMenu }) {
    this.resumeBtn.addEventListener('click', onResume);
    this.settingsBtn.addEventListener('click', onSettings);
    this.menuBtn.addEventListener('click', onMainMenu);
  }

  show() {
    this.overlay.classList.remove('hidden');
  }

  hide() {
    this.overlay.classList.add('hidden');
  }
}
