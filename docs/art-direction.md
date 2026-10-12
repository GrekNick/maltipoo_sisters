# Art direction

Rules that keep generated or drawn art consistent, plus briefs for each character.
Raw art goes into `art/raw/` and is turned into game spritesheets with `npm run build:sprites`
(see [AGENTS.md](../AGENTS.md)).

## Global style (set by Kiwi and Sofi)
- **Chunky pixel art**: about **40×40 "drawn pixels"** for a full character, delivered upscaled
  (e.g. 1024×1024). The build script measures the drawn-pixel size and normalises it, but every pose of
  a character should still use the same grid.
- **Dark, warm outlines** (1 drawn pixel), soft 2–3-step shading, no dithering noise.
- **Side / three-quarter view, facing right.** The game mirrors the sprite for walking left.
- **Full body, transparent background**: no ground shadow, frame, text or watermark.
- **Cute, round, readable shapes**: big heads and big eyes. The audience is kids.
- One file per pose, with the same character size across poses (the dogs' raw poses drifted; the pipeline
  fixes some of that, but it's better to avoid it).

## Kiwi and Sofi

- **Kiwi** is true pixel art (52×52, `art/raw/kiwi_pixel/`), made from her original standing design by
  `npm run art:kiwi`: the original serious mouth became an open smile with a small tongue, and the walk and jump
  poses are the same drawing with lifted or tucked legs. Her separately generated move and jump images were
  dropped because their colour, size and face didn't match.
- **Sofi** still uses her AI poses, which already match each other. Real walk cycles for both come in M7.1.

## Title logo

`art/raw/logo/logo_roses.png` (Wawel in a rose wreath, both sisters, Smok Junior's tail at the cave). It is
baked to its display height (320 px) by `npm run build:sprites` and drawn unscaled on the title screen.

## Smok Junior

The sisters' friend: a young dragon from the Wawel dragon family. Curious, cheerful, a bit clumsy.

**Look**
- **Body: black / charcoal grey**, with lighter grey highlights on the head, back and wing tops so he
  doesn't turn into a dark blob.
- **Backpack: bright yellow**, the strongest colour on him. It makes him easy to spot from far away
  (important for the "sightings" at each level's end). Darker yellow straps and a buckle.
- **Story detail:** a faint **red glow** peeks out from under the backpack flap. That's the red stone from the
  Wieliczka mine, and it makes the item recognisable in every scene.
- Chibi proportions (head about half the body height), big glossy eyes, small stubby wings, a spiky
  crest down the head and back, a curled tail, and light belly plates.
- **Size:** about the same height as the dogs, a little shorter if anything; he's a kid too.

**Palette (starting point)**

| Use | Colour |
|---|---|
| Outline | `#1b1d21` |
| Body dark / mid / light | `#2f333a` / `#4a5059` / `#767d88` |
| Belly plates | `#c9c3b8` (warm ash) |
| Crest and spikes | `#3d434c` with `#8d95a1` tips |
| Wing membrane | `#5d6470` |
| Eyes | white highlights, dark iris with a warm amber ring `#e0a030` |
| Backpack | `#f6c90e` main, `#c99a06` shadow, `#8a6a04` straps |
| Red stone glow | `#ff4b3a` → `#ff9a7a` |

**Readability check:** he must stand out on the darkest backgrounds (the salt mine, the Dragon's Den). If he
doesn't, add a subtle light rim on the top edges, never a white outline all around.

**Poses needed** (priority order)
1. `idle`: standing, backpack visible, slight smile
2. `fly`: 2–4 frames of wing flapping (used for the sightings)
3. `wave`: waving to the sisters from far away
4. `walk`: 4 frames
5. `happy`: a jump for joy (the reunion)
6. `hold-stone`: holding the glowing red stone up (the ending, at sunset)

**Prompt template for an image generator** (adjust per pose)
> Pixel art sprite of a cute baby dragon character, chibi proportions, charcoal black and grey scales with
> lighter grey highlights, warm ash-coloured belly plates, small stubby wings, spiky crest, big glossy eyes
> with amber rings, wearing a bright yellow backpack with a faint red glow peeking out of it, POSE: standing
> idle, side three-quarter view facing right, full body, chunky ~40x40 pixel grid, 1-pixel dark outline, soft
> 2–3 step shading, transparent background, no shadow, no frame, no text.

**About reference images:** found images (like the red donut dragon we used for mood) are someone
else's artwork. Use them for the general feel only. Don't commit them, trace them, or use them as an
image-to-image base. Generate or draw our own.
