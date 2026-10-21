# Level design guide

Levels are painted in [Tiled](https://www.mapeditor.org/) (free) and saved as JSON maps (`.tmj`) in `levels/`.
The game loads them with Phaser's built-in Tiled support, and `npm test` checks every map, so a broken or
unfinishable level fails CI instead of reaching players. No code is needed to change a level.

## Setup (once)

1. Install Tiled: `brew install --cask tiled`, or download it from mapeditor.org.
2. In Tiled: **File → Open File or Project…** → `levels/maltipoo.tiled-project`.
   The project knows our object classes (`spawn`, `goal`, `checkpoint`, `pickup`, `hazard`, `sister-gate`), so they
   appear in the Class dropdown.
3. Run the game: `npm run dev`, then open http://localhost:5173/maltipoo_sisters/ and press Start.
   **Saving a map in Tiled reloads the game automatically.**

## How a map is built

| Thing | Value |
|---|---|
| Tile size | 32 × 32 px |
| Map height | 19 tiles (608 px; the bottom 600 px are on screen) |
| Ground | top surface on **row 17** (y = 544), with a dirt row below |
| Map width | anything ≥ 25 tiles (one screen); level 1 is 100 |

**Layers** (names matter; the tests check them):

| Layer | Type | What goes there |
|---|---|---|
| `Background` | tile layer | decoration behind the dogs (flowers). Never solid. Optional |
| `Ground` | tile layer | everything the dogs stand on or bump into. Solid wherever the tile has `collides` |
| `Objects` | object layer | exactly one `spawn` and one `goal`; any number of checkpoints, pickups, hazards, sister gates |

**Tiles** (placeholder set, `levels/tilesets/placeholder.png`, made by `npm run art:tileset`):

| Tile | Solid | Use |
|---|---|---|
| grass | yes | ground top, platforms |
| dirt | yes | ground below the top |
| plank | yes | ledges and benches (e.g. a duck ledge) |
| flower | no | decoration, on the Background layer |

**Objects** (set the **Class** of each one):

| Class | Tool | What it does | Placement |
|---|---|---|---|
| `spawn` | Insert Point | where the level starts | anywhere above the ground; dropped onto it |
| `goal` | Insert Point | the dog house; reaching it finishes the level | dropped onto the ground |
| `checkpoint` | Insert Point | respawn point after a fall or a puddle (the furthest one reached on foot) | dropped onto the ground; put one after each pit or tricky section |
| `pickup` | Insert Point | a treat (smaczek) to collect; counted in the HUD and finish panel | **stays exactly where you put it**: float treats in the air to reward jumps, or hide them in Sofi-only gaps |
| `hazard` | **Insert Rectangle** | a puddle: touching it sends the dog back to the last checkpoint | draw the water area, e.g. 2 tiles wide and half a tile tall, sunk into the grass |
| `sister-gate` | Insert Point | a sign hinting which sister a spot needs (a hint only, it never blocks); set its **sister** property (`sofi` by default, or `kiwi`) | dropped onto the ground, just before the spot |

## Rules for a fair level (in tiles)

The tests compute these from `src/physics.ts` with a safety margin, so a level that passes is beatable at
**walking speed**, without a perfect run-up. Running and jumping goes further; that's the fun part, not a requirement.

**Headroom over anything you can stand on:**

| Free tiles above | Who fits |
|---|---|
| 3 or more | everyone walks under |
| exactly 2 | only Sofi, ducked (↓/S). Kiwi has to jump on top. This is a "sister moment" |
| 1 | nobody: the tests reject it, because it looks passable but isn't |

**Jumps** (horizontal gap = empty tiles between the two edges). Kiwi's big jump goes higher; the tests use the
shared numbers (Sofi's column), so for now every level must work without it. Levels that need Kiwi come with
skill-aware level checks (roadmap 4.4).

| Going up by | Largest gap (everyone) | Largest gap (Kiwi) |
|---|---|---|
| 0 – 1 tiles | 4 tiles | 5 tiles |
| 2 tiles | 4 tiles | 4 tiles |
| 3 – 5 tiles | 3 tiles | 4 tiles |
| 6 tiles | impossible: add a step | 4 tiles |
| 7 tiles | impossible | 3 tiles |
| 8 or more | impossible | impossible |

**Objects:**
- Every treat must be collectable: above ground the dogs can reach, within jump height.
- Every puddle must be jumpable at walking speed (at most 4 tiles wide) and keep clear of the spawn, checkpoints
  and goal (a respawn must never land in water).

Going *down* always allows longer gaps. If you change the movement numbers in `src/physics.ts`, these limits
change with them, and the tests re-check every level automatically.

## Making a new level

1. In Tiled, open `levels/level1.tmj` and **File → Save As…** `levels/level2.tmj`, then change it. This keeps the
   tileset embedded and the layers named right.
2. Register it in `src/levels/index.ts` (one line: key, name, URL import), and add its key to its place's
   `levels` in `src/levels/route.ts`, in the same order. That order is the unlock order on the map.
3. `npm test`: every check prints which tile, object or surface is wrong.
4. Play it: it appears on the map once the level before it is finished. To try it right away, start it from the
   browser console with `game.scene.getScene('Title').scene.start('Game', { levelKey: 'level2' })`.

## Gotchas

- **Tilesets must be embedded in the map.** Phaser can't load external tileset files. If you add a tileset with
  **New Tileset…**, tick **Embed in map**, or use **Map → Embed Tilesets**. The tests catch it.
- **Keep the map finite and orthogonal** with 32 px tiles (Map → Map Properties).
- The tileset's name inside the map (`placeholder`) must match `TILESETS` in `src/levels/index.ts`.
- Dog house, backdrop and hills are drawn by the game, not the map.
