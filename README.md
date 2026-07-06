# Nightfall — Vampire Survivors-style MVP

A complete, playable roguelite survival MVP built with **vanilla JavaScript (ES modules) + HTML5 Canvas**. No dependencies, no build step.

## Run it

ES modules must be served over HTTP (opening `index.html` via `file://` is blocked by the browser). From this folder:

```bash
python -m http.server 8123
```

Then open <http://localhost:8123> in a modern browser.

(Any static server works — e.g. `npx serve`, VS Code "Live Server", etc.)

## Controls

- **WASD** / **Arrow keys** — move
- **SPACE** — toggle Auto Aim / Free Aim (Free Aim fires toward the mouse cursor)
- Attacks fire **automatically** (Auto Aim targets the nearest enemy)
- **ESC** — pause / unpause (and back out of menus / the settings panel)
- On level-up: click a card or press **1 / 2 / 3**
- **Restart** button on the game-over screen

## Gameplay loop

The game opens on the **Main Menu** (Play / Weapons / Settings / Quit). Pick a **weapon** and a **game mode**, then survive. Enemies stream in and chase you; your weapon auto-fires. Kills drop XP gems — walk near them to vacuum them up. Fill the XP bar to level up and pick one of three random upgrades. Difficulty ramps over time. Watch out for **hostile trees** and grab **world items** (health packs, bombs) as they appear.

## Content update — modes, environment, items, weapons

- **Game modes** (`config/GameModeConfig.js`): **10 Minutes** / **20 Minutes** (reach the timer → **Victory** screen with full stats) and **Endless** (scales forever). Play → Select Mode.
- **Environment**: procedurally placed **trees** via deterministic chunk generation (`systems/WorldSystem.js`) — infinite, persistent, min-spaced, and *solid* (navigation decisions). Trees turn **hostile** in range, telegraph a danger zone, and periodically strike.
- **World items** (`systems/ItemSystem.js`): occasional, capped spawns. **Health Pack** (red, blinking — heals, never overheals) and **Bomb** (black/white blinking — instantly kills every active enemy as a normal kill, so gems + kill-count still apply).
- **Weapon selection** (Main Menu → Weapons): choose a starting weapon; the choice **persists**. Two balanced starters — **Magic Bolt** (accurate single-target) and **Scatter Blast** (short-range piercing shotgun). Both are fully upgradeable through the existing upgrade system. Adding a weapon = one entry in `config/WeaponConfig.js`.
- **Victory screen**: Time / Level / Kills / XP / Weapon / Mode, with **Play Again** and **Main Menu**.
- **Polish**: expanding-ring effects on gem pickup, healing, tree attacks, item spawns, and bomb blasts; card-based mode/weapon selection matching the existing aesthetic.

## Menus & flow

- **Main Menu** → Play starts a run, Settings opens the settings panel, Quit closes the app (browsers fall back to a "close this tab" screen).
- **Pause** (ESC) → Resume, Settings, or Return to Main Menu. Pausing freezes *everything* — enemies, projectiles, spawning, timers — because the simulation only advances in the `PLAYING` state.
- **Settings** persist to `localStorage` and reload automatically at startup: Master / Music / SFX volume, Fullscreen, Resolution, VSync.

## Enemies

Data-driven archetypes (`config/EnemyConfig.js`), unlocked in phases by the spawn table (`config/SpawnConfig.js`):

| Type | Health | Speed | XP | Appears |
| --- | --- | --- | --- | --- |
| Grunt | baseline | medium | 3 | immediately |
| Fast | low | high | 2 | ~40s (forces repositioning) |
| Tank | high | slow | 9 | ~110s (crowds & pressures) |

Spawn cadence and enemy health also scale continuously with elapsed time.

## Audio

Fully procedural via WebAudio (`systems/AudioManager.js`) — **no asset files**. Three gain buses (master → music / SFX) map to the three volume sliders; SFX are synthesized tones (shoot, hit, pickup, hurt, level-up, death, UI click) and a soft looping arpeggio provides music. Audio starts on the first menu click (browser autoplay policy).

## Project structure

```
index.html            Canvas + HUD/overlay DOM
styles/main.css       UI styling
src/
  main.js             Entry point
  Game.js             Orchestrator + fixed-timestep loop + state machine
  config/             All tunable data (no magic numbers in logic)
    GameConfig.js       engine/perf/colors
    PlayerConfig.js     base player stats
    WeaponConfig.js     base weapon stats
    EnemyConfig.js      enemy archetypes
    SpawnConfig.js      difficulty curve
    ProgressionConfig.js XP curve
    UpgradeConfig.js    data-driven upgrade pool
  core/               Reusable primitives
    math.js  Pool.js  SpatialGrid.js  Input.js  Camera.js
    GameState.js        top-level state enum (single source of truth)
  entities/           Pooled POD entities
    Player.js  Enemy.js  Projectile.js  XPGem.js
  systems/            Behavior
    SpawnSystem.js  EnemySystem.js  WeaponSystem.js
    PickupSystem.js  ProgressionSystem.js  UpgradeSystem.js
    SettingsManager.js  persistence (localStorage) + resolution data
    AudioManager.js     procedural WebAudio (volume buses, SFX, music)
  render/Renderer.js  Camera-space canvas drawing
  ui/                 DOM UI
    HUD.js  UpgradeScreen.js  GameOverScreen.js
    MainMenu.js  PauseMenu.js  SettingsPanel.js
```

## Destructible environment update — breakable trees & regrowth

A reusable **destructible world-object framework** (trees today; rocks / crates / barrels / ore nodes are one config entry away):
- **Framework** (`config/DestructibleConfig.js` + `entities/Destructible.js`): each type declares its radius, health, `solid` flag, regrowth time, grow-in duration, data-driven destruction `particles[]`, and optional `hostile` behavior. `WorldConfig.trees` now owns *placement only* (chunk density); DestructibleConfig owns *what each object is*. The WorldSystem, WeaponSystem, and Renderer are all type-agnostic (`isDestructible` / `type`), so new destructibles need no code.
- **Destructible trees**: trees have HP (60) and take damage through the **existing weapon pipeline** — bullets and sword swings both hit them, and any future weapon works automatically. Trees are inserted into the combat broad-phase grid; `WeaponSystem` tells them apart from enemies via `isDestructible` and routes damage without touching enemy logic. Projectiles consume pierce on trees exactly like enemies (destructible cover). Sword-throw's dash-reset only triggers on enemies, never trees. Trees never damage each other.
- **Destruction** (`Game._destroyDestructible`): at 0 HP a tree stops colliding + being hostile, sprays a **data-driven debris burst** (leaves + wood chips via the pooled effect system), pops a break ring, plays a break sound, and schedules regrowth. Idempotent against multiple same-frame hits.
- **Regrowth**: per-object countdown timer (45s, configurable), regrowing at the original position to full health with a **grow-in scale animation**; the collision radius scales with the grow-in so a returning tree eases the player aside instead of popping them. Off-screen (unloaded-chunk) timers pause and resume — no wasted work.
- **Boss arena compatibility**: the arena now **hides** trees (temporary, not destroyed) and **restores them intact and immediately** when the boss dies (`WorldSystem.hideTreesInRadius` / `restoreHiddenTrees`, wired through the boss `hideTrees`/`restoreTrees` hooks). Trees that were genuinely destroyed keep their own regrowth timer — arena and destruction never interfere.
- **Combat feedback**: hit flash (white, same as enemies), a brief shake on hit, leaf + wood particles, and a destruction sound — matching enemy-quality feedback.
- **Performance**: destruction/regrowth flip flags only (zero allocation); particles reuse the pooled effect system with velocity + drag; everything stays inside the deterministic chunk generation, and only live, non-hidden trees join the grid.

## Combat update — dash, sword, pickups, elite loot & buffs

Reusable frameworks (all data-driven, future-ready):
- **Cooldown** (`core/Cooldown.js`) — generic timed-ability primitive (`ready`/`fraction`/`trigger`/`reset`). Powers the dash; ready for any future ability.
- **BuffSystem** (`systems/BuffSystem.js` + `config/BuffConfig.js`) — one timed-effect framework for both player buffs (rage) and world status effects (freeze). Re-applying refreshes (no stacking). Systems query it (weapon combat mods, enemy/boss freeze); the Buff HUD renders `list()`. New buff = one BuffConfig entry.
- **Weapon pipelines** — `WeaponConfig` weapons carry a `kind` (`projectile` | `melee`); WeaponSystem branches on it. Combat multipliers from buffs (`combatMods`) scale damage + cadence for *every* weapon.

Features:
- **Dash** (LEFT/RIGHT SHIFT, `config/DashConfig.js`): burst in the movement direction (or facing if idle), ~4s cooldown, with i-frames that ignore **all** damage (enemies, trees, boss contact/projectiles/shockwave — everything routes through `Player.takeDamage`). Afterimage trail + dash SFX. A bottom-left **dash bar** shows cooldown / "DASH READY".
- **Nightblade** (new melee starter, `WeaponConfig.sword`): a 90° cone swing hitting every enemy inside it, on a continuous **3-hit combo**. Every 3rd attack **throws a piercing blade** (higher damage, longer range) reusing the projectile pool. When a thrown blade hits an enemy it **instantly refreshes the dash** (once per throw) — rewarding the loop *dash → combo → throw → hit → dash → re-engage*. Fully upgradeable (all existing upgrades apply).
- **New pickups** (`config/PickupConfig.js`, data-driven weights): **Magnet** (pulls all XP gems to you), **Freeze** (enemies inert 5s; bosses slowed 50%, never fully frozen), **Rage** (+50% damage / +20% attack speed for 20s, refresh-not-stack). Each has a distinct glyph (horseshoe magnet, snowflake, flame).
- **Elite loot** (`config/EliteLootConfig.js`): a dedicated, gated (`dropChance`) drop table separate from boss rewards — XP burst / health / magnet / freeze / rage. Weighted toward XP burst so consumables stay special.
- **Buff HUD** (`ui/BuffHUD.js`): auto-populated chips (icon, label, remaining seconds, shrinking bar) reconciled against the active buff set each frame — supports future buffs with no changes.
- **Combat polish**: sword swipe arcs, per-hit impact rings, spinning thrown blade, dash trail + reset burst, pickup rings, rage aura on the player, and an icy tint on frozen enemies.

## Boss update — camera, fog, elites, bosses & arenas

- **Camera zoom** (`config/GameConfig.js` → `camera.zoom`, default 1.2): the camera sits ~17% closer for a tighter, more intense view. Implemented as a `Camera` zoom factor applied through the canvas transform, so every system (spawning, culling, free aim) respects it automatically; `Camera.setZoom()` is ready for a future user setting.
- **Edge fog** (`GameConfig.fog`): a cached radial-gradient overlay darkens the screen edges — the center stays fully clear and enemies emerge from the darkness. Purely cosmetic.
- **Elite enemies** (`config/EnemyConfig.js` → `EliteConfig`): from 3:00, any spawn can roll elite (chance grows over time). Elites are the same archetype scaled up — more HP/damage, slightly larger, 4× XP — with a pulsing gold aura + outline. Works for every current and future enemy type.
- **Bosses** (`config/BossConfig.js`, `systems/BossSystem.js`): data-driven boss framework. **The Warden** (mini boss: charge + projectile burst) and the **Night Monarch** (final boss: charge, burst, shockwave, summon). Bosses are auto-targeted and damaged through the normal weapon pipeline, chase in between telegraphed specials (windup rings + charge lanes), and have a top-center **boss health bar** with their name.
- **Boss schedule** (`config/GameModeConfig.js`): 10-minute mode — Warden at 5:00, Monarch at 10:00. 20-minute mode — Wardens at 5:00/15:00, Monarch at 20:00. Endless — a boss every 10 minutes, cycling Warden/Monarch, each ~60% stronger than the last.
- **Victory = timer + final boss.** Reaching the timer target spawns the final boss instead of instantly winning; the Victory screen appears only when it dies.
- **Boss arena**: each boss fight carves a circular arena (~480 px) around the spawn — trees inside are removed **permanently for the run**, a pulsing energy barrier keeps the player and boss in and outside enemies out (enemies already inside keep fighting). The barrier drops when the boss dies.
- **Boss rewards**: an XP gem explosion, a guaranteed health-pack drop, layered blast rings, and a dedicated boss-death sound.

## Difficulty & aiming update

- **Difficulty selection** (Play → Mode → **Difficulty** → Start): **Easy / Normal / Hard / Hardcore**. All balancing lives in `config/DifficultyConfig.js` as named multipliers — nothing is hardcoded elsewhere. Each multiplier maps to exactly one place: damage taken (player), XP gain, passive regen, spawn interval / batch / health scaling / enemy damage (spawn system), tree density (world), and health-pack frequency (items). The selected difficulty persists and is shown on the HUD, Victory, and Game Over screens.
- **Free Aim** (SPACE): toggles between Auto Aim (nearest enemy) and Free Aim (fires toward the cursor, even with no enemies in view). Works with every weapon — current and future — because it only changes the aim angle fed into the shared projectile pipeline. A HUD indicator shows the active mode and the player renders an aim arrow toward the cursor in Free Aim.
- **Bomb safety (verified)**: the bomb pickup only ever iterates the enemy pool — it never calls `player.takeDamage` and never touches trees, world items, or effects, so the player and environment are always unaffected while enemy deaths process normally (XP gems + kill stats).

## Game state machine

`Game._setState()` is the single transition point. States: **MAIN_MENU · PLAYING · PAUSED · UPGRADE · GAME_OVER · VICTORY** (`core/GameState.js`). Each transition hides all overlays first, so only one screen is ever visible — no overlapping UI. Only `PLAYING` advances the fixed-timestep simulation, so pause / level-up / game-over / victory freeze gameplay with no per-system pause flags. Sub-menus (Settings, Mode Select, Weapon Select) are overlays of `MAIN_MENU`/`PAUSED` that swap the visible menu without changing the frozen state.

## Extending

The content update kept every prior system intact and added along existing seams:
- **New weapon** → add an entry to `config/WeaponConfig.js` (`weapons` map). It's auto-listed in the weapon menu and works with all upgrades — no code changes.
- **New game mode** → add an entry to `config/GameModeConfig.js`.
- **New enemy** → add to `config/EnemyConfig.js` + a spawn-table row in `config/SpawnConfig.js`.
- **Trees / items / effects** are pooled or chunk-generated to preserve performance with hundreds of enemies on screen.

## Architecture notes

- **Data-driven**: every tunable lives in `src/config/`. Balancing is editing data, not logic.
- **Systems over entities**: entities are plain data; systems own behavior. Easy to extend (new enemy type = one entry in `EnemyConfig`; new upgrade = one entry in `UpgradeConfig`).
- **Fixed-timestep** simulation (`1/60`) with a render pass each rAF — stable physics independent of frame rate.
- **State machine**: `PLAYING` / `LEVELUP` (pauses simulation, keeps rendering) / `GAMEOVER`.
- **Effective stats** are recomputed from base config + cumulative upgrade levels on every level-up, so repeated upgrades never drift.

## Performance

- **Object pooling** for enemies, projectiles, and gems — steady-state runs allocate nothing per spawn.
- **Uniform spatial grid** for projectile↔enemy hit detection — combat stays near O(n) instead of O(n²), supporting hundreds of enemies.
- Pools compact in place via a single-pass `sweep()` (no `splice`), scratch vectors/arrays are reused, and off-screen enemies are render-culled.

## Tuning quick reference

| Want to change | Edit |
| --- | --- |
| First level-up timing / XP curve | `config/ProgressionConfig.js` |
| Spawn rate & difficulty ramp | `config/SpawnConfig.js` |
| Weapon feel | `config/WeaponConfig.js` |
| Enemy stats | `config/EnemyConfig.js` |
| Upgrade effects | `config/UpgradeConfig.js` |
| Perf caps (max enemies, etc.) | `config/GameConfig.js` |
```
