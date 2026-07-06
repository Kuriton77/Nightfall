import { WeaponConfig } from '../config/WeaponConfig.js';

// Weapon selection overlay (Main Menu -> Weapons). Displays each weapon's info
// and stats, highlights the current selection, and reports picks via onSelect.
// Data-driven from WeaponConfig, so new weapons appear automatically.

export class WeaponSelect {
  constructor(root = document) {
    this.overlay = root.getElementById('weapon-select');
    this.optionsEl = root.getElementById('weapon-options');
    this.backBtn = root.getElementById('weapon-back-btn');
    this.onSelect = null;
    this.onBack = null;
    this.selectedId = WeaponConfig.default;
    this.backBtn.addEventListener('click', () => this.onBack && this.onBack());
  }

  _statsHtml(stats) {
    // Melee weapons report cone/combo stats; ranged report projectile stats.
    const rows = stats.kind === 'melee'
      ? [
          ['Damage', stats.damage],
          ['Attack Rate', (1 / stats.cooldown).toFixed(1) + '/s'],
          ['Cone', (stats.melee ? stats.melee.coneDeg : 90) + '°'],
          ['Combo', (stats.combo ? stats.combo.length : 3) + '-hit'],
        ]
      : [
          ['Damage', stats.damage],
          ['Fire Rate', (1 / stats.cooldown).toFixed(1) + '/s'],
          ['Projectiles', stats.projectileCount],
          ['Pierce', stats.pierce],
        ];
    return (
      '<div class="weapon-stats">' +
      rows
        .map(([label, value]) => `<div class="wstat"><span>${label}</span><b>${value}</b></div>`)
        .join('') +
      '</div>'
    );
  }

  _render() {
    this.optionsEl.replaceChildren();
    for (const id of Object.keys(WeaponConfig.weapons)) {
      const w = WeaponConfig.weapons[id];
      const isSel = id === this.selectedId;
      const card = document.createElement('button');
      card.className = 'select-card weapon-card' + (isSel ? ' selected' : '');
      card.innerHTML =
        `<div class="select-icon">${w.icon}</div>` +
        `<div class="select-name">${w.name}</div>` +
        `<div class="select-desc">${w.description}</div>` +
        this._statsHtml(w.stats) +
        `<div class="select-badge">${isSel ? 'SELECTED' : 'SELECT'}</div>`;
      card.addEventListener('click', () => {
        this.selectedId = id;
        if (this.onSelect) this.onSelect(id);
        this._render();
      });
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
