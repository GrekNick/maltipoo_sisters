# Decision log

Short records of project-level decisions: what we chose, why, and what we gave up.
Newest first. Add an entry when a choice would be expensive to reverse or easy to forget.

---

## 2026-10-21 — Story told by short cutscenes between levels

**Status:** accepted (roadmap 3.7, 6.1, 6.2b).

One cutscene player plays scenes written as data (backgrounds, characters, short speech lines as i18n keys).
It runs before the first level, on the map when a new place opens, and after the last level. Scenes are
skippable, play once on their own, and can be replayed from the map.

**Why:** the story (no villains, friends finding each other) needs a few warm moments between levels to feel
immersive, but kids mostly want to play. Short and skippable keeps both. Data files mean new scenes and
translations need no code.

**Alternatives considered:** only speech bubbles inside levels (interrupts play, hard to read while moving);
full animated cinematics (far too much art for the scope).

---

## 2026-10-21 — Saved progress: one versioned record per browser, levels unlock in order

**Status:** accepted (roadmap 3.5).

Progress is saved in `localStorage` under `maltipoo.progress` as `{ version: 1, levels: { <level id>: { bestSeconds,
bestTreats } } }`. A level is in the record once it has been finished; the first level is always open and each
other one unlocks when the level before it is finished. Level ids are the map keys, so **renaming a level's key
loses its saved progress**; reordering levels changes what is unlocked.

**Why:** levels are short and kid-sized, so finishing (not checkpoints) is the unit worth saving. One record with a
version number can be migrated later (the old per-level best-time keys are read once, if no record exists yet).
An unknown version is ignored rather than misread.

**Alternatives considered:** saving mid-level state (position, checkpoint): more to keep consistent for little
gain on 2-minute levels. Cloud saves or accounts: out of scope for a static GitHub Pages game.

---

## 2026-10-20 — Screen scaling: fill the window, but prefer crisp whole-pixel scales

**Status:** accepted (roadmap 1.4).

The game renders 800×600 and the page enlarges the canvas to fit the window (4:3 kept, letterboxed). With pixel art,
a non-whole number of device pixels per game pixel makes some game pixels wider than others, which shimmers while
scrolling. So we use the largest **whole-device-pixel** scale if it fills at least 85% of the space, otherwise we fill
it. On 2× screens that means CSS steps of 0.5, which almost always fits well.
*Alternatives considered:* Phaser's `Scale.FIT` (always fills, uneven pixels); integer scaling only (crisp, but
an 800×600 game on a 1080p monitor would stay small); rendering at device resolution (sharpest, but every scene,
camera and text would need rework; revisit if text sharpness matters).

---

## 2026-10-17 — Level grid: 32px tiles, ground on row 17, hitboxes sized to the grid

**Status:** accepted (implements the Tiled decision below; guide in [level-design.md](level-design.md)).

- Maps are 19 tiles tall (608 px) with the ground top on row 17 (y = 544); the camera shows the bottom 600 px.
- Standing hitbox ≈ 70 px (0.9 of the idle art), ducked ≈ 50 px. So **3 free tiles = everyone, 2 = ducking
  only, 1 = nobody**. The old 65 px was 1 px over 2 tiles, which made 2-tile gaps "almost" passable.
- Collision comes from the `collides` tile property (Phaser tile collision), replacing the hand-placed zones.
- Placeholder tiles are **generated** (`npm run art:tileset`) instead of downloaded from Kenney for now: no
  third-party files or licences yet, and it matches the current look. A real tileset replaces it in M7.3.
- Maps must embed their tilesets (Phaser can't read external ones); the tests enforce it.

---

## 2026-10-10 — Audience: families and kids

**Status:** accepted.

No game over and no lives; a fall returns you to a nearby checkpoint. Levels are short (2–4 min), text is
minimal, and touch and gamepad controls are first-class. Difficulty comes from finding the way, not
from precision. This is pillar 1 in [roadmap.md](roadmap.md).

---

## 2026-10-10 — Core mechanic: one player swaps between the sisters, each with her own skill

**Status:** accepted. The exact skills are a proposal: Kiwi has a **big jump**, Sofi can **squeeze** through low gaps.

Swapping is instant and allowed anytime. Levels include moments that need each sister.
*Alternatives considered:* picking one dog with different stats (the theme goes unused), local 2-player co-op
(harder camera and level design; parked), and cosmetic-only differences.

---

## 2026-10-10 — UI languages: English (default), Ukrainian, Polish

**Status:** accepted, milestone M3 in [roadmap.md](roadmap.md).

All player-facing text comes from locale files (`en`, `uk`, `pl`), switchable in Settings. English is the
default and the fallback for missing strings. Story panels lean on pictures to keep the text small. Until M3,
don't translate individual strings ad hoc.

---

## 2026-10-10 — Part 1: from the Wieliczka Salt Mine back to Wawel, with friend Smok Junior

**Status:** accepted (revised the same day); details in [story-and-levels.md](story-and-levels.md).

There are no villains. After finding a red stone in the Wieliczka Salt Mine, Smok Junior (a young Wawel dragon,
taught that "treasures belong in the castle") takes it in his backpack, and the friends get separated on
the way out. Kiwi and Sofi travel back to Wawel to find him. 5 locations along a real route: Wieliczka → Podgórze →
Kazimierz → Rynek → Smocza Jama / Wawel, one level each to start, possibly 2–3 per location later.
Collectibles are dog treats (smaczki); every level ends at a doggy pad by an obwarzanek stand.

*Earlier draft (replaced):* a dragon kid steals the sisters' toy and they chase him. It was dropped because
friendship works better than a chase for a kids' game.

---

## 2026-10-10 — Migrate to Phaser 4 + TypeScript before building the Tiled pipeline

**Status:** accepted, milestone M1 in [roadmap.md](roadmap.md).

The code is ~500 lines, so migrating is cheapest now. Typed level data and Tiled objects catch mistakes
early, and Phaser 4 is the current engine (Phaser 3.90 was announced as the final v3 release).
Order: TypeScript setup on the pure modules → Phaser 4 → scene split.

---

## 2026-10-10 — Levels will be authored in Tiled, loaded with Phaser's native tilemap support

**Status:** done (M2). See [level-design.md](level-design.md).

**Decision**
- Paint levels in [Tiled](https://www.mapeditor.org/) and export them as JSON.
- Load them with Phaser's built-in loader (`this.load.tilemapTiledJSON` → `make.tilemap` → `createLayer`), with no plugins.
- Layers: `Background` (decor), `Ground` (tiles with `collides: true`), `Foreground` (drawn over the player),
  and an `Objects` layer for spawn, goal, hazards and pickups. Mechanics are configured through
  custom properties on objects (e.g. `requires: "sofi"`).
- One generic `GameScene` loads any level by key; there are no per-level scenes.
- Use a free placeholder tileset (e.g. Kenney "Pixel Platformer", CC0) until custom art exists.
  Planned tile size: 32 px, which makes a dog about 2 tiles tall.

**Why**
- Phaser loads Tiled JSON natively, so very little loader code is needed.
- Levels can be seen and painted instead of typed as coordinates, which matters most while learning level design.
- Object layers and custom properties are a natural home for the sisters' different abilities.

**Alternatives considered**
- *Hard-coded coordinates* (the original prototype): no tooling, but unworkable past a handful of objects.
- *Hand-written grid or JSON*: diff-friendly, but awkward for decoration and layered art. Used only as a stopgap (`src/levels/`).
- *LDtk*: excellent for platformers, but Phaser has no native loader, so it would need a converter.
- *Phaser Editor / engine scene editors*: powerful, but they tie the project to the tool's workflow.

---

## 2026-10-10 — Single-player first, online co-op parked

**Status:** accepted (PR #7).

Online co-op lives in `src/coop/` and `server/`, behind the `VITE_COOP` build flag, and is not part of the
default build. We revisit it once the single-player game is fun. Hosting a server is out of scope until then.
