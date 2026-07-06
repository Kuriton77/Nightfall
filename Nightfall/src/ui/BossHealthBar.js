// Top-center boss health bar with the boss name. Visible only during a boss
// fight; the Game shows it on boss spawn and hides it when the fight ends.

export class BossHealthBar {
  constructor(root = document) {
    this.wrap = root.getElementById('boss-bar-wrap');
    this.nameEl = root.getElementById('boss-name');
    this.fill = root.getElementById('boss-fill');
  }

  show(name) {
    this.nameEl.textContent = name;
    this.fill.style.width = '100%';
    this.wrap.classList.remove('hidden');
  }

  update(health, maxHealth) {
    const pct = maxHealth > 0 ? Math.max(0, health / maxHealth) * 100 : 0;
    this.fill.style.width = pct + '%';
  }

  hide() {
    this.wrap.classList.add('hidden');
  }
}
