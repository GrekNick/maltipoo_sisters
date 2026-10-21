# Where the art comes from

Every image in the game, with its source and license. Add a line whenever you add or regenerate art (AGENTS.md
rule). All of it is © Nick Grechuha, all rights reserved ([ASSETS-LICENSE.md](../../ASSETS-LICENSE.md)), unless a
line says otherwise.

**AI tools used:** Google Gemini and Anthropic Claude (which tool made which original isn't recorded). Both
providers' terms say they don't claim ownership of what you generate, but re-check them before any commercial
release. Images made purely by AI may not be protected by copyright in every country; the hand-made pixel art our
tools derive from them is on firmer ground.

## Originals (in `art/raw/`)

| File | Made by | Added | Notes |
|---|---|---|---|
| `kiwi_sprites/chill.png` | AI (Gemini or Claude), from the owner's prompts | 2025-10-11 | Kiwi's design; input to `tools/make-kiwi.mjs` |
| `kiwi_sprites/chill_move.png`, `chill_jump.png` | AI (Gemini or Claude) | 2025-10-12 | Not used by the build any more (kept for reference) |
| `kiwi_sprites/angry.png` | AI (Gemini or Claude) | 2025-10-11 | Not used yet |
| `sofi_sprites/smiley.png`, `smiley_move.png`, `smiley_jump.png` | AI (Gemini or Claude) | 2025-10-11/12 | Sofi's design; input to `tools/make-sofi.mjs`. Her leap is also Kiwi's (recoloured) |
| `sofi_sprites/sad.png` | AI (Gemini or Claude) | 2025-10-11 | Not used yet |
| `logo/logo_roses.png` | AI (Gemini or Claude), provided by the owner | 2026-10-12 | Title logo; shrunk by `tools/build-sprites.mjs` |

## Made by our tools (code in `tools/`, rerun with the npm scripts)

| Files | Made by | From |
|---|---|---|
| `kiwi_pixel/*.png` | `npm run art:kiwi` (`tools/make-kiwi.mjs`) | `kiwi_sprites/chill.png`, Sofi's leap recoloured |
| `sofi_pixel/*.png` | `npm run art:sofi` (`tools/make-sofi.mjs`) | `sofi_sprites/smiley*.png`; duck and crawl composed from her standing pose |
| `assets/characters/*.png`, `sprites.json`, `assets/ui/logo.png` | `npm run build:sprites` | the files above |
| `levels/tilesets/placeholder.png` | `npm run art:tileset` (`tools/make-tileset.mjs`) | drawn in code |
| Textures baked at runtime (ground, clouds, dog house, treat, signs, flags, sparkle) | `src/scenes/art.ts` | drawn in code |

## Not committed yet

| File | Source | Before committing |
|---|---|---|
| `assets/characters/smok_jr.png` (Smok Junior sheet) | AI (Gemini or Claude), from the owner's prompts after the brief in docs/art-direction.md | Move to `art/raw/smok_junior/`, give it a transparent background, and add a row above |

## Third-party files

None yet. When adding some (e.g. a Kenney tileset, CC0), list the file, author, license and link here, and
credit them in the game.

## Never
Found images (from search results, other games, stock sites) are not committed or used as an image-to-image base
(docs/art-direction.md). A test sprite of unknown origin that was once committed (`assests/test_man_sprites/`) is
removed from the git history; see docs/decisions.md.
