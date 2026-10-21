# Roadmap

The plan from today's prototype to a first release. Story and level details live in
[story-and-levels.md](story-and-levels.md); the reasons behind choices live in [decisions.md](decisions.md).

## Vision

**Maltipoo Sisters** is a gentle 2D platformer for families and kids. Two maltipoo sisters, **Kiwi** and
**Sofi**, lose their friend **Smok Junior** (a little Wawel dragon) after a trip to the Wieliczka Salt Mine,
and travel across **Kraków** back to Wawel to find him.
The player swaps between the sisters, and each has her own skill. Levels need both.

### Design pillars
Use these to settle arguments. If a feature fights a pillar, cut it or change it.

1. **Kind to kids**: no game over and no lives. Falling only sends you back to a nearby checkpoint.
   Text is short or replaced by icons. Levels take 2–4 minutes.
2. **Two sisters, two skills**: every level has moments that need Kiwi and moments that need Sofi.
   Swapping is instant and always allowed.
3. **Kraków you can recognise**: each location has a landmark and a little bit of its legend. Every level
   ends at a doggy pad by an obwarzanek stand. No villains: the story is about friends finding each other.
4. **Small and finished beats big and half-done**: ship one world of 5 locations before dreaming of more.

## Where we are (done)

| PR | What |
|---|---|
| #1–#6 | Prototype: Phaser 3 + Vite, two dogs, character select, online co-op experiment, GitHub Pages deploy |
| #7 | Cleanup: co-op parked behind `VITE_COOP`, real hitboxes, rendering fixes |
| #8 | Playable level 1: 4 screens wide, pits + checkpoints, dog house finish, best time, sprite pipeline, Vitest + CI |

## Milestones

Each milestone is a few PRs. Each PR is one branch with one commit per concern, and has a **"done when"**
check you can verify by playing or running tests. Milestones are ordered; chunks inside a milestone mostly are too.

### M1 — Tech foundation: Phaser 4 + TypeScript + scenes
Cheapest now, while the game is ~500 lines.

| Chunk | Done when |
|---|---|
| ✅ 1.1 TypeScript setup: `tsconfig`, typecheck script and CI step; convert the pure modules first (`physics`, `levels/*`, `characters`) | `npm run typecheck` passes in CI; tests still pass |
| ✅ 1.2 Phaser 3.90 → 4 upgrade; convert `main.js` to TS | Level 1 plays the same; no console errors |
| ✅ 1.3 Split scenes: `Preload` (loading bar) → `Title` → `Game` → `UI` (HUD overlay). No separate `Boot`: the loading bar is drawn with shapes, so it needs no assets. The level key parameter comes with M2 | `GameScene` contains no HUD code; restart still works |
| ✅ 1.4 Responsive canvas: fills the window, keeps 4:3, prefers whole-pixel scales (`src/display.ts`); rotate hint on upright phones | The game fills a phone or tablet screen without distortion |

### M2 — Level planner: Tiled pipeline
The tool we chose in [decisions.md](decisions.md).

| Chunk | Done when |
|---|---|
| ✅ 2.1 Tiled project in `levels/` (`.tiled-project`, object types: `spawn`, `goal`, `checkpoint`, `pickup`, `hazard`, `sister-gate`) plus a placeholder tileset (32 px; generated, Kenney later). Pickups = treats, hazards = puddles (back to checkpoint), sister gates = signs (blocking comes with 4.4) | Opening the project in Tiled shows ready-to-use object types |
| ✅ 2.2 Loader: `make.tilemap` + layers (`Background`, `Ground`, `Foreground`, `Objects`) → solids, spawn, goal, checkpoints | A test map loads with no coordinates in code |
| ✅ 2.3 Rebuild level 1 in Tiled; delete `src/levels/level1.ts` | Level 1 plays the same as today |
| ✅ 2.4 Tests read Tiled JSON: reachability, headroom, a spawn and a goal exist, all object types are known | `npm test` validates every map in `levels/` |
| ✅ 2.5 Level-making guide in `docs/level-design.md` (how to add a map, conventions, checklist) | You can build a new level without reading code |

### M3 — Game shell: start screen, settings, progress
| Chunk | Done when |
|---|---|
| ✅ 3.1 **Title screen**: title, Start and Settings buttons (mouse, touch, keyboard), language flags in the corner, animated dogs. Continue and Credits come later | The game opens on the title screen; Enter, tap or gamepad starts it |
| ◐ 3.2 **Settings** (screen, saving, "show hitboxes" and **language** done; sound comes with 5.3): music and sound volume, **language: English (default) / Ukrainian / Polish**, "show hitboxes" moved here from the H key | Settings survive a page reload |
| 3.3 **Level select = a map of the route** (Wieliczka → Wawel): locations unlock one by one, each showing its best time and collected treats | Finishing a level unlocks the next one on the map |
| ✅ 3.4 **Pause menu**: Resume / Restart / Settings / Quit to map (to the title screen until the map exists; also pauses when the tab is hidden) | Esc or a tap on the pause icon pauses the game |
| 3.5 Save progress (localStorage, versioned) | A refresh keeps unlocked levels and best times |
| ✅ 3.6 i18n: all UI text comes from `src/i18n/locales/{en,uk,pl}.json`; English is the default and the fallback for missing keys; the first launch picks the browser language if it's supported | Switching language changes every on-screen string; a test fails if a key is missing in any language |

### M4 — The sisters mechanic
| Chunk | Done when |
|---|---|
| ✅ 4.1 **Swap** (Tab, Q or a button tap): instant switch in place, short sparkle effect. Replaced the character dropdown | You can swap mid-jump with no physics glitches |
| ✅ 4.2 **Kiwi: big jump** (higher jump: ~8 tiles instead of ~6; `SISTER_PHYSICS` in `src/physics.ts`) | A ledge in a test map is reachable only by Kiwi |
| ✅ 4.3 **Sofi: duck** (↓/S: lies low, crawls, can't jump; stays down under low ceilings) | Level 1's low ledge: Sofi ducks under, Kiwi jumps over |
| 4.4 **Sister gates** in Tiled (e.g. a sign showing which sister is needed) and the reachability test made aware of skills | Tests prove each level is finishable with swapping |
| 4.5 The inactive sister follows as a companion (cosmetic, teleports when left behind) | Both dogs are always on screen together |

### M5 — Game feel and kid-friendly controls
| Chunk | Done when |
|---|---|
| ✅ 5.1 Jump feel: coyote time, jump buffering, variable jump height; plus a walk → run speed ramp and faster falling | Jumps feel forgiving; tested on the pure movement logic |
| 5.2 Touch controls (on-screen buttons) and gamepad | Playable on a tablet and with a controller |
| 5.3 Sound: jump, land, collect, swap, finish; a music loop per location | Volume settings apply |
| 5.4 Juice: dust puffs, squash and stretch on landing, camera nudge, treat sparkle | Players notice it feels alive |

### M6 — Content: Kraków world (5 locations)
One PR per location; see [story-and-levels.md](story-and-levels.md).

| Chunk | Done when |
|---|---|
| 6.1 Story intro (Wieliczka: the red stone, getting separated) and ending (the reunion at Wawel); comic panels, skippable | The story makes sense without reading much |
| 6.2 Smok Junior sightings: a short scripted moment near each finish pointing to the next location (not an enemy) | Shows up in every location |
| 6.3 Level finish: a doggy pad by an obwarzanek stand (replaces the dog house) | Every level ends there |
| 6.4–6.8 Locations 1–5: Wieliczka, Podgórze, Kazimierz, Rynek, Smocza Jama → Wawel | Each one passes the tests and has had a playtest with a kid |
| 6.9 Collectibles: **smaczki** (bone treats), more of them and better hidden in later levels; counts shown on the map | The map shows how many were found |
| 6.10 *(proposal)* Dog wardrobe: treats unlock bandanas and collars | Cosmetics show on both sisters |

### M7 — Art pass
| Chunk | Done when |
|---|---|
| 7.1 Real animation frames: walk cycle (4–6 frames), jump up/down, idle blink, swap pose. Same pipeline (`build:sprites`) | No more single-frame animations |
| 7.2 Smok Junior sprite set following [art-direction.md](art-direction.md), then obwarzanek stand, doggy pad, treat icons. `build:sprites` gains per-character pose lists (the dragon has `fly` and `wave`, not the dogs' states) | Smok Junior passes the readability check on the darkest level background |
| 7.3 Tileset per location (or one shared tileset with themed decor) | Kenney placeholders replaced |
| 7.4 Title logo, map illustration, UI icons | |

### M8 — Release 1.0
Credits screen, performance pass on mobile, accessibility check (colours, text size), itch.io page and
GitHub Pages, and a family playtest feedback round.

### Later (parked)
- More levels per location (each location becomes 2–3 levels).
- Online co-op (code exists, behind `VITE_COOP`) or local 2-player co-op.
- Part 2: another city or world.

## Working agreement
- One branch and one PR per chunk, one commit per concern. Squash nothing that should be revertable on its own.
- Every PR states its **done when** and how it was tested (tests plus what was played).
- Update this roadmap when a milestone finishes or the plan changes; record big choices in `decisions.md`.
