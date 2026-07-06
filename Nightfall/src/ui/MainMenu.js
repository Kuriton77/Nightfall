// Main menu overlay: Play / Weapons / Settings / Quit. Pure view — behavior is
// injected via callbacks so it stays decoupled from the Game.

export class MainMenu {
  constructor(root = document) {
    this.overlay = root.getElementById('main-menu');
    this.playBtn = root.getElementById('menu-play-btn');
    this.weaponsBtn = root.getElementById('menu-weapons-btn');
    this.settingsBtn = root.getElementById('menu-settings-btn');
    this.quitBtn = root.getElementById('menu-quit-btn');
  }

  bind({ onPlay, onWeapons, onSettings, onQuit }) {
    this.playBtn.addEventListener('click', onPlay);
    this.weaponsBtn.addEventListener('click', onWeapons);
    this.settingsBtn.addEventListener('click', onSettings);
    this.quitBtn.addEventListener('click', onQuit);
  }

  show() {
    this.overlay.classList.remove('hidden');
  }

  hide() {
    this.overlay.classList.add('hidden');
  }
}
