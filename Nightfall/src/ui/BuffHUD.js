// Buff status display. Renders a chip per active buff (icon, label, remaining
// seconds, shrinking timer bar) and reconciles the DOM against the active set
// each frame — creating/updating/removing only what changed (no per-frame
// rebuild). Fully data-driven from each buff's BuffConfig def, so future buffs
// appear with no changes here.

export class BuffHUD {
  constructor(root = document) {
    this.el = root.getElementById('buff-bar');
    this.chips = new Map(); // id -> { root, time, bar, lastSecs }
  }

  update(buffs) {
    const seen = SEEN;
    seen.clear();
    for (let i = 0; i < buffs.length; i++) {
      const b = buffs[i];
      seen.add(b.id);
      let chip = this.chips.get(b.id);
      if (!chip) {
        chip = this._create(b);
        this.chips.set(b.id, chip);
        this.el.appendChild(chip.root);
      }
      const secs = Math.max(0, Math.ceil(b.remaining));
      if (chip.lastSecs !== secs) {
        chip.time.textContent = secs + 's';
        chip.lastSecs = secs;
      }
      const frac = b.def.duration > 0 ? Math.max(0, b.remaining / b.def.duration) : 0;
      chip.bar.style.transform = 'scaleX(' + frac + ')';
    }
    // Remove chips whose buff expired.
    for (const [id, chip] of this.chips) {
      if (!seen.has(id)) {
        chip.root.remove();
        this.chips.delete(id);
      }
    }
  }

  _create(b) {
    const root = document.createElement('div');
    root.className = 'buff-chip';
    root.style.setProperty('--buff-color', b.def.color);

    const icon = document.createElement('span');
    icon.className = 'buff-icon';
    icon.textContent = b.def.icon;

    const meta = document.createElement('div');
    meta.className = 'buff-meta';
    const label = document.createElement('span');
    label.className = 'buff-label';
    label.textContent = b.def.label;
    const time = document.createElement('span');
    time.className = 'buff-time';
    meta.appendChild(label);
    meta.appendChild(time);

    const progress = document.createElement('div');
    progress.className = 'buff-progress';
    const bar = document.createElement('div');
    bar.className = 'buff-progress-fill';
    progress.appendChild(bar);

    root.appendChild(icon);
    root.appendChild(meta);
    root.appendChild(progress);
    return { root, time, bar, lastSecs: -1 };
  }

  clear() {
    for (const [, chip] of this.chips) chip.root.remove();
    this.chips.clear();
  }
}

const SEEN = new Set();
