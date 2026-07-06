import { GameModes, GameModeOrder } from '../config/GameModeConfig.js';

// Mode selection overlay (Play -> Select Mode). Cards are built from
// GameModeConfig so adding a mode needs no UI changes.

export class ModeSelect {
  constructor(root = document) {
    this.overlay = root.getElementById('mode-select');
    this.optionsEl = root.getElementById('mode-options');
    this.backBtn = root.getElementById('mode-back-btn');
    this.onSelect = null;
    this.onBack = null;
    this.backBtn.addEventListener('click', () => this.onBack && this.onBack());
  }

  _render() {
    this.optionsEl.replaceChildren();
    for (const id of GameModeOrder) {
      const mode = GameModes[id];
      const card = document.createElement('button');
      card.className = 'select-card';
      card.innerHTML =
        `<div class="select-icon">${mode.icon}</div>` +
        `<div class="select-name">${mode.name}</div>` +
        `<div class="select-desc">${mode.description}</div>`;
      card.addEventListener('click', () => this.onSelect && this.onSelect(id));
      this.optionsEl.appendChild(card);
    }
  }

  show() {
    this._render();
    this.overlay.classList.remove('hidden');
  }

  hide() {
    this.overlay.classList.add('hidden');
  }

  get isOpen() {
    return !this.overlay.classList.contains('hidden');
  }
}
