# Decision log

Short records of project-level decisions: what we chose, why, and what we gave up.
Newest first. Add an entry when a choice would be expensive to reverse or easy to forget.

---

## 2026-10-10 — Levels will be authored in Tiled, loaded with Phaser's native tilemap support

**Status:** accepted, to be implemented in 1–2 steps. Until then, levels live as plain data in `src/levels/`.

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
