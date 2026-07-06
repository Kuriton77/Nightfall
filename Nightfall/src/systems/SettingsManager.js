// Persistent user settings. Stores values in localStorage and loads them at
// startup. This module only owns storage + schema; applying effects (volume,
// canvas resolution, fullscreen, vsync) is the Game's responsibility so this
// stays free of DOM/engine coupling.

const STORAGE_KEY = 'nightfall.settings.v1';

// Schema doubles as the defaults table.
export const SettingsDefaults = Object.freeze({
  masterVolume: 0.8, // 0..1
  musicVolume: 0.5, // 0..1
  sfxVolume: 0.8, // 0..1
  fullscreen: false,
  resolution: 'native',
  vsync: true,
  weapon: 'bolt', // selected starting weapon (persists until changed)
  difficulty: 'normal', // last-selected difficulty (persists)
});

// Resolution options are data-driven. `maxHeight: null` means "use device
// pixel ratio" (native crispness); otherwise the internal buffer height is
// capped for performance while the canvas still fills the viewport.
export const ResolutionOptions = Object.freeze([
  { id: 'native', label: 'Native', maxHeight: null },
  { id: '1080', label: '1080p', maxHeight: 1080 },
  { id: '720', label: '720p', maxHeight: 720 },
  { id: '480', label: '480p', maxHeight: 480 },
]);

export class SettingsManager {
  constructor() {
    this.values = { ...SettingsDefaults };
    this.load();
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    if (!(key in SettingsDefaults)) return;
    this.values[key] = value;
    this.save();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      for (const key of Object.keys(SettingsDefaults)) {
        if (parsed[key] !== undefined) this.values[key] = parsed[key];
      }
    } catch (err) {
      // Corrupt/unavailable storage: fall back to defaults silently.
      console.warn('Settings load failed; using defaults.', err);
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch (err) {
      console.warn('Settings save failed.', err);
    }
  }
}
