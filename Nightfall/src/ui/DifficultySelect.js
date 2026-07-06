import { Difficulties, DifficultyOrder } from '../config/DifficultyConfig.js';

// Difficulty selection overlay (Mode Select -> Select Difficulty). Cards are
// built from DifficultyConfig and highlight the currently selected difficulty.

export class DifficultySelect {
  constructor(root = document) {
    this.overlay = root.getElementById('difficulty-select');
    this.optionsEl = root.getElementById('difficulty-options');
    this.backBtn = root.getElementById('difficulty-back-btn');
    this.onSelect = null;
    this.onBack = null;
    this.selectedId = null;
    this.backBtn.addEventListener('click', () => this.onBack && this.onBack());
  }

  _render() {
    this.optionsEl.replaceChildren();
    for (const id of DifficultyOrder) {
      const d = Difficulties[id];
      const card = document.createElement('button');
      card.className = 'select-card' + (id === this.selectedId ? ' selected' : '');
      card.innerHTML =
        `<div class="select-icon">${d.icon}</div>` +
        `<div class="select-name">${d.name}</div>` +
        `<div class="select-desc">${d.description}</div>`;
      card.addEventListener('click', () => this.onSelect && this.onSelect(id));
      this.optionsEl.appendChild(card);
    }
  }

  show(selectedId) {
    this.selectedId = selectedId;
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
