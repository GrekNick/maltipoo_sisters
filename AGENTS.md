# AGENTS.md

Guidance for AI agents (and humans) working on this repo. Keep it current: if you change something that
makes a line here wrong, fix the line in the same PR.

## What this is
**Maltipoo Sisters**: a family-friendly 2D platformer. Two dog sisters, Kiwi and Sofi, travel from the
Wieliczka Salt Mine across Kraków back to Wawel to find their friend Smok Junior (a young dragon; no
villains). It's a browser game deployed to GitHub Pages.

- Plan and milestones: [docs/roadmap.md](docs/roadmap.md). Check which milestone/chunk the task belongs to.
- Story and level sequence: [docs/story-and-levels.md](docs/story-and-levels.md)
- Art style rules and character briefs: [docs/art-direction.md](docs/art-direction.md). Follow these when adding art.
  Never commit found reference images.
- Why things are the way they are: [docs/decisions.md](docs/decisions.md). Read it before proposing
  architecture changes, and add an entry when you make a hard-to-reverse choice.
- `microservices_game_architecture.md` is an early brainstorm and **not** the plan. Don't build toward it.

The owner is an experienced developer who is new to game development. When you introduce a game-dev
concept (tilemaps, coyote time, parallax…), explain it briefly in the PR or reply, mapped to general dev terms.

## Stack and commands
Phaser 3.90 (Arcade Physics) · Vite 5 · Vitest 2 · **TypeScript 5.9** (strict, type-check only: Vite/Vitest strip
types, `tsc` never emits). Node 20 in CI. Pure modules and tests are TypeScript; `main.js` and `src/coop/` are
converted in M1.2 together with the Phaser 4 upgrade. Update this section when that lands.

```bash
npm run dev            # dev server: http://localhost:5173/maltipoo_sisters/  (note the base path)
npm test               # Vitest, runs in CI on PRs and before every deploy
npm run typecheck      # tsc --noEmit, also in CI
npm run build          # production build into dist/ (gitignored)
npm run build:sprites  # regenerate assets/characters/ from art/raw/ (commit the output)
npm run dev:coop       # + `npm run coop:server`: parked online co-op prototype
```

## Layout
```
src/main.js            MainScene (one scene for now) + game config + DOM character select
src/characters.ts      spritesheets, animation states, hitbox rule (derived from sprites.json)
src/physics.ts         gravity / run speed / jump velocity, shared by game and tests
src/levels/level1.ts   level data (stopgap until Tiled, milestone M2); types in src/levels/types.ts
src/levels/reachability.ts   pure jump math + "is the level finishable" BFS (used by tests)
src/coop/              parked online co-op client, only bundled when VITE_COOP=true
server/coop-server.js  Socket.IO relay for co-op
assets/characters/     GENERATED spritesheets + sprites.json; don't edit by hand
art/raw/               original art, the input to tools/build-sprites.mjs
tests/                 Vitest suites (pure logic + data; no Phaser imports)
docs/                  roadmap, story, decisions
```

## How the game is put together (rules to keep)
- **The sprite origin is at the feet**: `setOrigin(0.5, 1)`. Spawn, checkpoint and goal coordinates are
  feet positions. Generated frames have the feet on the bottom edge (enforced by tests).
- **Hitboxes come from data**: `hitboxFor()` in `characters.ts` derives the body from the idle frame bounds.
  Arcade `body.setSize/setOffset` take **texture pixels**, before scale. Never hand-tune hitbox numbers
  again; change the rule or the art.
- **Visuals and collision are separate**: tile sprites for looks, invisible static `zone`s in
  `this.solids` for physics. This mirrors how Tiled maps will work (tile layer + collision property).
- **Movement numbers live in `src/physics.ts` only**: the level tests compute reachability from them, so
  changing jump or run values automatically re-validates every level.
- **Co-op stays behind the flag**: nothing outside `src/coop/` may import `socket.io-client`. The scene talks
  to co-op only via `this.coop?.update()` and `requestCharacterChange()`.
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
- Add a test when you add level data or pure logic. Level changes must keep `tests/level1.test.ts` green;
  it checks bounds, overlaps, headroom under platforms and that every surface plus the goal is reachable.

## Verifying changes in the browser
Unit tests don't cover rendering, so also play-test:
- In dev builds `window.game` is exposed. Get the scene with `game.scene.keys.MainScene`.
- A hidden or background tab **pauses the game loop**. To drive it deterministically, step it manually:
  `game.step(t += 16.67, 16.67)` in a loop, and set inputs directly (`scene.wasd.D.isDown = true`,
  `scene.spaceKey.isDown = true`).
- **Tweens use wall-clock time**, so they don't advance under instant manual stepping. Await small delays
  between steps when checking tweens.
- The Arcade debug view toggles with **H** in game.

## Pitfalls we already hit
- `this.add.graphics()` to bake textures leaves the drawing on screen. Use `this.make.graphics({}, false)`,
  `generateTexture`, then `destroy()`. Generated textures outlive scene restarts, so guard with `textures.exists`.
- Teleporting a physics sprite with `setPosition` can tunnel it through the ground (its body keeps the old
  previous position). Use `body.reset(x, y)`.
- Objects draw in creation order: background first, HUD last (and HUD uses `setScrollFactor(0)`).
- A platform hanging over the ground needs headroom: its underside must be at least the dog's body height
  plus a margin above the ground, or the dog can't walk under it. There's a test for this.
- Assets must be **imported** through Vite (`import url from '…png'`), not referenced by string paths. The
  site is served under `/maltipoo_sisters/` and string paths break in production.
- The raw AI art was drawn at different scales per pose. Always go through `npm run build:sprites`, never
  load `art/raw/` directly.
- Import project modules **without** a file extension (`'./physics'`); Vite and `tsc` resolve `.ts`.
- `localStorage` may throw (private mode, previews); wrap access in try/catch and degrade gracefully.
- The UI text is currently mixed Ukrainian and English. i18n is planned in M3 (English is the default and
  fallback; Ukrainian and Polish selectable in Settings). Don't "fix" single strings ad hoc. Once it lands,
  every player-facing string must exist in all three locale files.
