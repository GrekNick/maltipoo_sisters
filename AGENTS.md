# AGENTS.md

Guidance for AI agents (and humans) working on this repo. Keep it current: if you change something that
makes a line here wrong, fix the line in the same PR.

## What this is
**Maltipoo Sisters**: a family-friendly 2D platformer. Two dog sisters, Kiwi and Sofi, travel from the
Wieliczka Salt Mine across Kraków back to Wawel to find their friend Smok Junior (a young dragon; no
villains). It's a browser game deployed to GitHub Pages.

- Plan and milestones: [docs/roadmap.md](docs/roadmap.md). Check which milestone/chunk the task belongs to.
- Story and level sequence: [docs/story-and-levels.md](docs/story-and-levels.md)
- Making or changing levels (Tiled): [docs/level-design.md](docs/level-design.md)
- Art style rules and character briefs: [docs/art-direction.md](docs/art-direction.md). Follow these when adding art.
  Never commit found reference images.
- Why things are the way they are: [docs/decisions.md](docs/decisions.md). Read it before proposing
  architecture changes, and add an entry when you make a hard-to-reverse choice.
- `microservices_game_architecture.md` is an early brainstorm and **not** the plan. Don't build toward it.

The owner is an experienced developer who is new to game development. When you introduce a game-dev
concept (tilemaps, coyote time, parallax…), explain it briefly in the PR or reply, mapped to general dev terms.

## Stack and commands
Phaser 4 (WebGL, Arcade Physics) · Vite 5 · Vitest 2 · **TypeScript 5.9** everywhere in `src/` and `tests/`
(strict + `noUncheckedIndexedAccess`; type-check only: Vite/Vitest strip types, `tsc` never emits). Node 24, set once
in `.nvmrc` (both workflows read it). When GitHub warns that an action's runtime is deprecated, bump the action's major
version after reading its release notes.
Only `tools/*.mjs` (Node scripts) and `server/` (CommonJS) are still JavaScript.

```bash
npm run dev            # dev server: http://localhost:5173/maltipoo_sisters/  (note the base path)
npm test               # Vitest, runs in CI on PRs and before every deploy
npm run typecheck      # tsc --noEmit, also in CI
npm run build          # production build into dist/ (gitignored)
npm run build:sprites  # regenerate assets/characters/ and assets/ui/ from art/raw/ (commit the output)
npm run art:kiwi       # regenerate Kiwi's pixel-art frames (art/raw/kiwi_pixel/) from her original image
npm run art:sofi       # regenerate Sofi's pixel-art frames incl. duck/crawl (art/raw/sofi_pixel/)
npm run art:tileset    # regenerate the placeholder level tileset (levels/tilesets/placeholder.png)
npm run dev:coop       # + `npm run coop:server`: parked online co-op prototype
```

## Layout
```
src/main.ts            game config + scene list + screen fitting + translated page text
src/display.ts         pure: how big to show the 800x600 game in the window (whole-pixel scales preferred)
src/scenes/            Preload → Title ⇄ Settings; Title → Game (+ UI on top) ⇄ Pause; shared.ts has keys/events/sizes
  GameScene.ts         gameplay only; emits GameEvent.Hud / Finished, knows nothing about the HUD
  UIScene.ts           HUD + finish panel, listens to GameScene's events
  PauseScene.ts        pause menu over the paused (not stopped) GameScene; can open Settings on top
  art.ts               placeholder textures, character animations, backdrop, ground strips
src/ui/Menu.ts         buttons with mouse, touch and keyboard (↑/↓, Enter/Space) support
src/persistence.ts     settings (incl. language) + best times in localStorage (versioned, never throws)
src/i18n/              t(), language detection; locales/{en,uk,pl}.json hold every player-facing string
src/characters.ts      spritesheets, animation states, hitbox rule (derived from sprites.json)
src/physics.ts         all movement tuning (speeds, ramp, gravity, jump, coyote/buffer), per sister; shared by game and tests
src/movement.ts        pure per-frame movement rules (run ramp, jump buffer/coyote/cut), tested in movement.test.ts
levels/                Tiled project, maps (*.tmj) and tilesets: the levels themselves (data, no code)
src/levels/index.ts    level + tileset registry (every .tmj must be listed; tests check it)
src/levels/tiled.ts    pure Tiled map parser/validator: solid tiles, surfaces, spawn/goal/checkpoints, pickups,
                       hazards, sister gates (object classes must match levels/maltipoo.tiled-project; tests check)
src/levels/reachability.ts   pure jump math + "is the level finishable" BFS (used by tests)
src/coop/              parked online co-op client, only bundled when VITE_COOP=true; typed socket events
server/coop-server.js  Socket.IO relay for co-op
assets/characters/     GENERATED spritesheets + sprites.json; don't edit by hand
assets/ui/             GENERATED UI images at display size (title logo)
art/raw/               original art, the input to tools/build-sprites.mjs (logo in art/raw/logo/)
art/raw/kiwi_pixel/    Kiwi as true 52x52 pixel art (smile, trot, leap), made by tools/make-kiwi.mjs
art/raw/sofi_pixel/    Sofi as true pixel art + duck/crawl poses, made by tools/make-sofi.mjs
tools/pixel-art.mjs    shared helpers: extract pixel grid, lift parts, recolour one pose into another palette
tests/                 Vitest suites (pure logic + data; no Phaser imports)
docs/                  roadmap, story, decisions
```

## How the game is put together (rules to keep)
- **The sprite origin is at the feet**: `setOrigin(0.5, 1)`. Spawn, checkpoint and goal coordinates are
  feet positions. Generated frames have the feet on the bottom edge (enforced by tests).
- **Sprites are drawn at scale 1 and snap to whole pixels**: sheets are built at display size with even frame
  sizes, and characters use `vertexRoundMode = 'fullAuto'`. A scaled or flipped sprite at a fractional position
  gets resampled by the GPU and looks blurry while moving (tested in `characters.test.ts`).
- **The camera is locked to the player horizontally** (follow lerp 1) and the canvas is shown with
  `image-rendering: pixelated` (index.html). A lagging camera or browser smoothing on high-DPI screens made the
  dogs look blurry while moving; measure before changing either (see "Verifying changes" below).
- **The game always renders 800x600 and is shown scaled** to fill the window (`displayScale()` in `src/display.ts`,
  applied in `main.ts` with Phaser's scale mode NONE + `game.scale.refresh()` so input still maps). It prefers a
  whole number of device pixels per game pixel (crisp, even pixels) unless that loses more than 15% of the size.
  Never scale the game inside Phaser or change the 800x600 view to "fit" a device.
- **Hitboxes come from data**: `hitboxFor()` in `characters.ts` derives the body from the idle frame bounds.
  Arcade `body.setSize/setOffset` take **texture pixels**, before scale. Never hand-tune hitbox numbers
  again; change the rule or the art.
- **Levels are Tiled maps, not code**: `GameScene` renders the map's tile layers, collides with tiles that have
  the `collides` property, and takes spawn/goal/checkpoints from `parseTiledMap()`. Gameplay code must not hard-code
  level coordinates. The level rules (headroom in whole tiles, reachability) are in `tests/levels.test.ts` and
  explained in `docs/level-design.md`.
- **Movement numbers live in `src/physics.ts` only**, and the rules in `src/movement.ts` (pure, no Phaser). The level
  tests compute reachability from those numbers at *walking* speed (levels must be finishable without a running
  start), so changing them automatically re-validates every level. Each sister plays with `SISTER_PHYSICS[key]`:
  the shared `PHYSICS` plus her skill (Kiwi: a higher `jumpVelocity`). Level tests use the shared numbers until
  levels may need a skill (M4.4).
- **Co-op stays behind the flag**: nothing outside `src/coop/` may import `socket.io-client` (main.ts only
  `import type`s it). Co-op sees the scene only through the `CoopHost` interface; the scene talks to co-op only
  via `this.coop?.update()` and `requestCharacterChange()`.
- **Scenes are like routes**: one job each. `GameScene` contains no HUD/menu code; it emits events (`GameEvent` in
  `scenes/shared.ts`) and `UIScene` draws them. Taps on HUD buttons go the other way as `UIEvent` (e.g. the swap
  button), which `GameScene` handles like the matching key. Scene instances survive `restart()`/`start()` (the
  constructor runs once), so reset per-run state in `create()`. A scene started **without** data keeps its previous
  data (Phaser), so pass `{}` explicitly when that matters (Title → Settings does).
- **Sister skills are data + pure rules**: a character can duck if its sprites have a `crouch` animation (then it
  gets a `crouchHitbox`, same width and feet line). The rules live in `movement.ts` (`nextCrouching`): duck only on
  the ground, no jumping while ducked, crawl at `crawlSpeed`, and never stand up (or swap to a sister who can't
  duck) without headroom, so nobody gets stuck in a ceiling. Swapping (`swapSister()`, Q/Tab/button) keeps position
  and speed, even mid-jump; it's refused only where the other sister wouldn't fit.
- **Kid-friendly by design**: no game over or lives; falls respawn at a checkpoint (see the design pillars in the roadmap).

## Workflow conventions
- **One branch and one PR per change**, branched from an up-to-date `main`. Branch prefixes: `feature/`, `fix/`,
  `chore/`, `docs/`.
- **One commit per concern** so each can be reverted alone. Conventional-commit style subjects
  (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`) with a body that explains *why*.
- Each PR description has: what changed, why, how it was tested (tests **and** what was played), and notes
  for the reviewer (breaking changes, known leftovers).
- Don't push or open PRs unless asked. The `gh` CLI may not be installed; the fallback is a pre-filled
  `https://github.com/GrekNick/maltipoo_sisters/compare/main...<branch>?quick_pull=1&title=…&body=…` link.
- Add a test when you add pure logic. Every map in `levels/` is checked by `tests/levels.test.ts` (registered,
  valid, spawn/goal/checkpoints on ground, everything reachable at walking speed, headroom rules); new maps are
  picked up automatically. Use `tests/helpers/asciiMap.ts` to build small maps in tests.

## Verifying changes in the browser
Unit tests don't cover rendering, so also play-test:
- In dev builds `window.game` is exposed. The game opens on the title screen: start play with
  `game.scene.getScene('Title').scene.start('Game')`, then get it with `game.scene.getScene('Game')`.
- A hidden or background tab **pauses the game loop**. To drive it deterministically, step it manually:
  `game.step(t += 16.67, 16.67)` in a loop. Drive input with real `KeyboardEvent`s on `window` (keydown/keyup with
  `code` and `keyCode`): jumping reacts to a fresh press (`JustDown`), so setting `key.isDown` directly won't jump.
- **Tweens use wall-clock time**, so they don't advance under instant manual stepping. Await small delays
  between steps when checking tweens.
- The game **pauses itself when the page is hidden** (pause menu on top). Press Esc or call
  `game.scene.getScene('Pause')` → Resume before stepping further.
- The Arcade debug view toggles with **H** in game (saved, like the Settings switch).
- To check on-screen steadiness, record `Math.round(player.x - player.displayOriginX - camera.scrollX)` every frame
  while running: it should not change once the camera is scrolling.

## Pitfalls we already hit
- `this.add.graphics()` to bake textures leaves the drawing on screen. Use `this.make.graphics({}, false)`,
  `generateTexture`, then `destroy()`. Generated textures outlive scene restarts, so guard with `textures.exists`.
- Teleporting a physics sprite with `setPosition` can tunnel it through the ground (its body keeps the old
  previous position). Use `body.reset(x, y)`.
- Objects draw in creation order: background first, HUD last (and HUD uses `setScrollFactor(0)`).
- Headroom in tiles: 3+ free tiles = everyone walks under, 2 = only Sofi ducked, 1 = a trap (tests reject it).
  Hitbox heights were chosen to fit this grid (standing ≈70px, ducked ≈50px); keep them that way.
- Tiled maps must **embed** their tilesets (Phaser can't load external `.tsx`/`.tsj`); `parseTiledMap` rejects them.
- Phaser 4's `map.createLayer()` returns `TilemapLayer | TilemapGPULayer`; narrow with `instanceof` before use.
- Assets must be **imported** through Vite (`import url from '…png'`), not referenced by string paths. The
  site is served under `/maltipoo_sisters/` and string paths break in production.
- The raw AI art was drawn at different scales per pose. Always go through `npm run build:sprites`, never
  load `art/raw/` directly. If poses don't match in style, rebuild them from one design as true pixel art
  (`tools/extract-pixel-grid.mjs`, see `tools/make-kiwi.mjs`) instead of rescaling.
- Import project modules **without** a file extension (`'./physics'`); Vite and `tsc` resolve `.ts`.
- Validate untrusted strings (DOM values, network messages) with `isCharacterKey()` before using them as keys.
- After upgrading a dependency, restart the dev server with a clean `node_modules/.vite`; Vite can keep serving
  the old pre-bundled version (we were briefly "testing Phaser 4" while running 3.90).
- `localStorage` may throw (private mode, previews); wrap access in try/catch and degrade gracefully.
- **Every player-facing string goes through `t()`** (`src/i18n`), in the canvas and on the page (`data-i18n`
  attributes in index.html). Add new keys to **all three** locale files (`en`, `uk`, `pl`); English is the source
  of truth for key names (typed) and the fallback. `tests/i18n.test.ts` fails if a key or `{placeholder}` is missing.
  Character names (Kiwi, Sofi, Smok Junior) are the same in every language.
- Game text uses `FONT_FAMILY` (`scenes/shared.ts`): Phaser's default Courier has no Cyrillic on many systems and
  Ukrainian fell back to another font mid-word. Use `TEXT_STYLE` or set `fontFamily` on every new text style.
- When adding text, check the longest translation fits (Ukrainian is usually longest): read `text.width` in the
  browser for each language.
