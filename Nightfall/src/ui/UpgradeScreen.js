// Level-up overlay. Renders the three rolled upgrade choices as buttons and
// invokes a callback with the chosen id. Also supports 1/2/3 hotkeys.

export class UpgradeScreen {
  constructor(root = document) {
    this.overlay = root.getElementById('upgrade-screen');
    this.optionsEl = root.getElementById('upgrade-options');
    this.onChoose = null;

    this._onKey = (e) => {
      if (this.overlay.classList.contains('hidden')) return;
      const idx = { Digit1: 0, Digit2: 1, Digit3: 2 }[e.code];
      if (idx !== undefined) {
        const btn = this.optionsEl.children[idx];
        if (btn) btn.click();
      }
    };
    window.addEventListener('keydown', this._onKey);
  }

  show(choices, progression, onChoose) {
    this.onChoose = onChoose;
    this.optionsEl.replaceChildren();

    for (const up of choices) {
      const currentLevel = progression.upgradeLevels[up.id];
      const btn = document.createElement('button');
      btn.className = 'upgrade-card';
      btn.innerHTML =
        `<div class="upgrade-icon">${up.icon}</div>` +
        `<div class="upgrade-name">${up.name}</div>` +
        `<div class="upgrade-desc">${up.describe(currentLevel)}</div>` +
        `<div class="upgrade-level">Lv ${currentLevel} → ${currentLevel + 1}` +
        ` <span class="max">/ ${up.maxLevel}</span></div>`;
      btn.addEventListener('click', () => {
        if (this.onChoose) this.onChoose(up.id);
      });
      this.optionsEl.appendChild(btn);
    }
    this.overlay.classList.remove('hidden');
  }

  hide() {
    this.overlay.classList.add('hidden');
  }
}
