import { ResolutionOptions } from '../systems/SettingsManager.js';

// Settings overlay. Binds DOM controls to the SettingsManager and reports every
// change via `onApply(key, value)` so the Game can apply the effect (volumes,
// resolution, fullscreen, vsync). `syncFromSettings()` pushes stored values
// back into the controls at startup and whenever the panel opens, keeping UI
// and state consistent.

export class SettingsPanel {
  constructor(settings, { onApply, onBack }, root = document) {
    this.settings = settings;
    this.onApply = onApply;
    this.onBack = onBack;

    this.overlay = root.getElementById('settings-menu');
    this.master = root.getElementById('master-volume');
    this.music = root.getElementById('music-volume');
    this.sfx = root.getElementById('sfx-volume');
    this.masterVal = root.getElementById('master-volume-value');
    this.musicVal = root.getElementById('music-volume-value');
    this.sfxVal = root.getElementById('sfx-volume-value');
    this.fullscreen = root.getElementById('fullscreen-toggle');
    this.resolution = root.getElementById('resolution-select');
    this.vsync = root.getElementById('vsync-toggle');
    this.backBtn = root.getElementById('settings-back-btn');

    this._buildResolutionOptions();
    this._bind();
  }

  _buildResolutionOptions() {
    this.resolution.replaceChildren();
    for (const opt of ResolutionOptions) {
      const el = document.createElement('option');
      el.value = opt.id;
      el.textContent = opt.label;
      this.resolution.appendChild(el);
    }
  }

  _bind() {
    // Volume sliders: live update (input) of both value + label.
    const vol = (input, label, key) => {
      input.addEventListener('input', () => {
        const value = Number(input.value) / 100;
        label.textContent = input.value + '%';
        this.settings.set(key, value);
        this.onApply(key, value);
      });
    };
    vol(this.master, this.masterVal, 'masterVolume');
    vol(this.music, this.musicVal, 'musicVolume');
    vol(this.sfx, this.sfxVal, 'sfxVolume');

    this.fullscreen.addEventListener('change', () => {
      this.settings.set('fullscreen', this.fullscreen.checked);
      this.onApply('fullscreen', this.fullscreen.checked);
    });
    this.vsync.addEventListener('change', () => {
      this.settings.set('vsync', this.vsync.checked);
      this.onApply('vsync', this.vsync.checked);
    });
    this.resolution.addEventListener('change', () => {
      this.settings.set('resolution', this.resolution.value);
      this.onApply('resolution', this.resolution.value);
    });
    this.backBtn.addEventListener('click', () => this.onBack());
  }

  // Push stored settings into the controls.
  syncFromSettings() {
    const s = this.settings;
    this.master.value = Math.round(s.get('masterVolume') * 100);
    this.music.value = Math.round(s.get('musicVolume') * 100);
    this.sfx.value = Math.round(s.get('sfxVolume') * 100);
    this.masterVal.textContent = this.master.value + '%';
    this.musicVal.textContent = this.music.value + '%';
    this.sfxVal.textContent = this.sfx.value + '%';
    this.fullscreen.checked = !!s.get('fullscreen');
    this.vsync.checked = !!s.get('vsync');
    this.resolution.value = s.get('resolution');
  }

  // Keep the fullscreen checkbox in sync if the user exits via browser ESC.
  setFullscreenChecked(on) {
    this.fullscreen.checked = on;
  }

  show() {
    this.syncFromSettings();
    this.overlay.classList.remove('hidden');
  }

  hide() {
    this.overlay.classList.add('hidden');
  }

  get isOpen() {
    return !this.overlay.classList.contains('hidden');
  }
}
