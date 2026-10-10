# Story and levels — Part 1: Kraków

Status: **draft**. Items marked *(proposal)* are open for discussion; change them freely and note big
changes in [decisions.md](decisions.md).

## Story

**Characters**
- **Kiwi**: the red-brown, chill sister. Strong legs: **big jump**.
- **Sofi**: the cream, smiley sister. Small and bendy: **squeezes** through low gaps.
- **Smok Junior**: a little dragon, the son of the legendary
  [Wawel Dragon](https://en.wikipedia.org/wiki/Wawel_Dragon) family, and the sisters' good friend. He always wears
  his backpack. His parents taught him one rule: *"Treasures belong in the castle."*

There are **no villains**. Nobody steals anything; the friends just lose each other. The sisters' goal is
simply to **find Smok Junior**.

**Plot (kid-sized, told in a few comic panels)**
1. *Intro: the Wieliczka Salt Mine.* The three friends visit the famous salt mine. Deep in a salt chamber
   they find a **glowing red stone**. It's so beautiful down here, so how will it shine in real sunlight?
   Smok Junior puts it in his backpack so they can all **see it glow in the sun** once they're outside (and,
   remembering his parents' rule, to bring it to the castle afterwards). But in the crowd on the way out of
   the mine the friends get **separated**.
2. *The journey back.* Kiwi and Sofi set off for Wawel, where Smok Junior surely went. At the end of
   each level they catch a glimpse of him ahead (a wave from a rooftop, a tail disappearing around a corner),
   or someone tells them which way he went. He's looking for them too.
3. *Ending: Wawel.* The sisters climb up through the Dragon's Den into the castle and find Smok Junior.
   Happy reunion! On Wawel Hill, in the setting sun, he finally takes the stone out: it **sparkles red in the
   real sunlight**, just like they hoped. Then it gets its place of honour in the family treasury, and the
   friends celebrate with obwarzanki, with fireworks over the Vistula.

Tone: warm, funny, about friendship and finding each other. Nothing to defeat.

## Recurring elements
| Element | Purpose |
|---|---|
| **Smaczki** (bone-shaped dog treats) | Collectibles, scattered through each level. Later levels hide more of them and in trickier spots. The map shows how many were found. *(proposal: treats unlock cosmetic bandanas and collars in a "dog wardrobe")* |
| **Level finish: doggy pad by an obwarzanek stand** | Every level ends at a comfy dog bed next to an obwarzanek (Kraków pretzel) stand: a rest stop before the next location. This replaces today's dog house. |
| **Smok Junior sightings** | A short scripted moment near each finish that points the way to the next location |
| **Checkpoints** | A friendly local object per location (mine cart, bench, tram stop, flower stall…) |
| **Sister signs** | A small paw sign with Kiwi's or Sofi's face hints which sister a spot needs |

## Level sequence
The route runs from the Wieliczka Salt Mine back into Kraków: through Podgórze, across the Vistula to
Kazimierz, up to the Old Town, then along the Royal Road to Wawel.
Each location starts as **one level** (2–4 min) and can later grow into 2–3 levels.
The skill curve: learn one thing per level, then combine.

### 1. Wieliczka Salt Mine — "The red stone"
- **Setting:** wooden staircases, salt-carved chambers and sculptures, the salt chapel, underground brine
  lakes, mine carts.
- **Teaches:** run and jump → **swap** → Kiwi's big jump (up a wooden scaffold) → Sofi's squeeze (through a
  narrow side tunnel).
- **Story:** intro panels: finding the stone, then getting separated. The level ends at the mine exit.
- **Hazards:** none dangerous; brine puddles send you back to the checkpoint.
- **Built from:** today's level 1 (rebuilt in Tiled during M2, re-themed underground).

### 2. Podgórze — "Over the river"
- **Setting:** Krakus Mound with a view of the city, old Podgórze streets, the Bernatka footbridge with its
  hanging acrobat sculptures.
- **New idea:** **swinging and balancing platforms** (the acrobat sculptures) and the first big outdoor level.
- **Story:** from the mound the sisters spot a little dragon shape heading across the river.

### 3. Kazimierz — "Courtyards and trams"
- **Setting:** cobbled streets, old courtyards, café tables, cellar windows, a passing tram.
- **New idea:** **moving platforms** (the tram roof, laundry lines on pulleys) and **combining skills**:
  Kiwi jumps up to a gallery, Sofi squeezes through a cellar window to open a gate.
- **Story:** a café owner saw "a little dragon with a backpack" heading to the Main Square.

### 4. Main Market Square (Rynek Główny) — "Up on the rooftops"
- **Setting:** reached through the Planty park. The Cloth Hall (Sukiennice) stalls, flower sellers,
  pigeons, St. Mary's Basilica.
- **New idea:** **bouncy market awnings** and climbing toward the towers.
- **Set piece:** *(proposal)* the **hejnał** trumpet call: when it plays, the pigeons fly up and briefly open
  a path.
- **Story:** from up high the sisters see Smok Junior flying down the Royal Road toward Wawel.

### 5. Smocza Jama → Wawel Castle — "Together again"
- **Setting:** the riverside dragon statue that breathes fire, then up through the Dragon's Den cave into
  the castle: walls, the arcaded courtyard, the cathedral bell tower.
- **New idea:** everything combined, plus *(proposal)* timed fire puffs from the statue (harmless; they push
  you back).
- **Story:** the reunion, the family treasury, the ending panels and credits.

## Skill matrix
Which locations use what; useful when building levels so every level has something for both sisters.

| | Wieliczka | Podgórze | Kazimierz | Rynek | Smocza Jama / Wawel |
|---|---|---|---|---|---|
| Run and jump | teach | ✓ | ✓ | ✓ | ✓ |
| Swap | teach | ✓ | ✓ | ✓ | ✓ |
| Kiwi big jump | teach | ✓ | combine | ✓ | combine |
| Sofi squeeze | teach | ✓ | combine | ✓ | combine |
| Swinging / balancing | | teach | | | ✓ |
| Moving platforms | mine carts? | | teach | | ✓ |
| Bouncy surfaces | | | | teach | ✓ |
| Timed obstacles | | | | pigeons | fire puffs |

## Languages
In-game text is available in **English (default)**, **Ukrainian** and **Polish**, switchable in Settings
(roadmap M3). Story panels rely on pictures with short lines of text so translation stays small.
Character names stay the same in every language: Kiwi, Sofi, Smok Junior.

## Open questions
- What does Smok Junior look like (colour, backpack style)? Do his parents appear in the ending?
- Second skills for later levels (Kiwi pushes crates, Sofi digs or sniffs out hidden treats)?
- Story delivery: comic panels between levels, speech bubbles in-level, or both?
- Is the wardrobe a good reward for treats, or should treats unlock something else (bonus levels, map stickers)?
