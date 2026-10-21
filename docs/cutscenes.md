# Cutscenes

How the story is shown between levels (roadmap 3.7, then 6.1 and 6.2b). Decided 2026-10-21; the why is in
[decisions.md](decisions.md). This is the design to build from; update it when the code differs.

## What a cutscene is

A short, skippable scene of **3–8 beats**, mostly **staged**: the game's own sprites (Kiwi, Sofi, Smok Junior, later
a few locals) act on a simple backdrop and talk in speech bubbles. A few big moments use **one illustrated panel**
instead: finding the glowing red stone, and the reunion at sunset. Pictures carry the story; text stays short.

```
┌──────────────────────────────────────┐
│                          [ Skip ▸ ]  │
│     ┌──────────────────┐             │
│     │ Look! It glows   │             │   speech bubble over whoever talks,
│     │ red!             │             │   text types in quickly
│     └───────┬──────────┘             │
│      Smok   ▾        Kiwi    Sofi    │   actors stand on the floor line
│  ▓▓▓▓▓▓▓▓▓ backdrop: salt mine ▓▓▓▓▓ │
│               tap to continue ▸      │
└──────────────────────────────────────┘
```

## How it plays

- **Tap, Enter or Space:** if a line is still typing, show all of it; otherwise go to the next beat. A walking actor
  jumps to where they were going. Nothing advances by itself, so slow and fast readers both keep up.
- **Skip** (top right, or Esc) ends the scene at once.
- **Typewriter:** about 40 letters per second. Lines are at most ~70 characters in every language (tested), so a
  bubble is two lines at most.
- **Once on its own, then on request:** a scene plays automatically the first time its moment comes; after that it
  can be replayed from the map ("▶ Story" in the place's panel). Which scenes were seen is saved with the progress,
  so **Reset progress** forgets them too.

## When scenes play

| Hook | Scene | Where |
|---|---|---|
| Before the first level, the first time | Intro: the salt mine, the red stone, getting separated (6.1) | Start → intro → map |
| The map opens a new place (after the sisters walk there) | That place's arrival scene: where Smok Junior was seen, why the sisters head there (6.2b) | on the map |
| After finishing the last level | Ending: the reunion, the stone glowing in the sun (6.1) | before the credits |

## How a scene is written

One file per scene in `src/cutscenes/`, a typed list of beats. The editor autocompletes actors, backdrops, panels and
text keys; a typo is a compile error, and `tests/cutscenes.test.ts` checks the rest.

```ts
// src/cutscenes/intro.ts
export const intro: Cutscene = {
    id: 'intro',
    backdrop: 'salt-mine',
    actors: { smok: 300, kiwi: 520, sofi: 600 },   // starting x on the floor line
    beats: [
        { move: 'smok', to: 380 },
        { say: 'smok', line: 'story.intro.stone' },
        { panel: 'red-stone-glow', line: 'story.intro.glow' },
        { say: 'sofi', line: 'story.intro.sun' },
        { together: [{ move: 'kiwi', to: 900 }, { move: 'sofi', to: 950 }] },
    ],
};
```

Beat types (the first version; add one only when a scene needs it):

| Beat | What happens |
|---|---|
| `{ say: actor, line }` | speech bubble over the actor, text types in |
| `{ move: actor, to, speed? }` | walks (or runs) along the floor line, facing the way they go |
| `{ face: actor, dir }` | turns left or right |
| `{ panel: id, line? }` | full-screen illustration with an optional caption; the next beat returns to the stage |
| `{ wait: ms }` | a short pause (also skippable) |
| `{ together: [...] }` | several beats at once, e.g. both sisters walking |

- **Text** lives in the locale files like all other text (`story.<scene>.<line>` keys in en/uk/pl), so translators
  work in one place and the i18n test keeps all three complete.
- **Actors** are characters with sprites: `kiwi`, `sofi`, `smok` (Smok Junior needs his sprite first, roadmap 7.2:
  at least idle and walk). Locals (the café owner, a flower seller) come later the same way.
- **Backdrops** start as simple code-drawn scenes (dark mine with salt crystals, Podgórze street, riverbank) and are
  replaced by painted ones in the art pass (7.4).
- **Panels** are images in `art/raw/panels/`, recorded in `art/raw/SOURCES.md`. Until a panel exists, the player
  shows its caption on a plain card, so scenes can be written before the art.

## Rules the tests check
- Every scene's actors, backdrop and panels exist; every `line` exists in all three languages and fits ~70 characters.
- Every place on the route that has levels after the first has an arrival scene (once 6.2b starts).
- A scene has 3–8 beats (longer stories become two scenes or get trimmed).

## Saving
Seen scenes go into the progress record (`seenCutscenes`), which moves the save format to version 2 with a migration
from version 1. The privacy notice gets one line ("which story scenes you've seen") in the same change.
