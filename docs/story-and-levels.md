# Story and levels — Part 1: Kraków

Status: **draft**. Items marked *(proposal)* are open for discussion; change them freely and note big
changes in [decisions.md](decisions.md).

## Story

**Characters**
- **Kiwi**: the red-brown, chill sister. Strong legs: **big jump**.
- **Sofi**: the cream, smiley sister. Small and bendy: **squeezes** through low gaps.
- **Smoczek** *(proposal for the name)*: a little Wawel dragon, a descendant of the legendary
  [Smok Wawelski](https://en.wikipedia.org/wiki/Wawel_Dragon). He used to be the sisters' friend. He's not evil, just
  cheeky and a bit lonely.

**Plot (kid-sized, told in a few comic panels)**
1. *Intro:* the sisters are playing with their favourite toy *(proposal: a red squeaky ball)* in the Planty park.
   Smoczek swoops in, grabs it, giggles, and flies off toward the Old Town.
2. *Middle:* in each location the sisters almost catch him. He drops a clue (a shiny dragon scale) and flies
   further, until he hides in his den under Wawel Hill and then in the castle itself.
3. *Ending:* the sisters find Smoczek on the castle tower. He admits he took the toy because nobody plays
   with him anymore. They make up, he gives the toy back, and all three play together on Wawel Hill, with
   fireworks over the Vistula.

Tone: friendly and funny; no fighting and no defeat. The dragon is a target to chase, not an enemy to hurt.

## Recurring elements
| Element | Purpose |
|---|---|
| **Obwarzanki** (Kraków pretzel rings) | Collectibles, about 10 per level; the map shows how many were found |
| **Dragon scale** | One per level at the end, as a story beat. It replaces the dog house as the goal *(the dog house stays as the final home in the ending)* |
| **Checkpoints** | A friendly local object per location (bench, flower stall, tram stop…) |
| **Sister signs** | A small paw sign with Kiwi's or Sofi's face hints which sister a spot needs |

## Level sequence

Each location starts as **one level** (2–4 min). Later, any location can grow into 2–3 levels.
The skill curve: learn one thing per level, then combine.

### 1. Planty Park — "Hey, that's our ball!"
- **Setting:** the green ring around the Old Town: trees, benches, lamp posts, a duck pond, autumn leaves.
- **Teaches:** run and jump → **swap** → Kiwi's big jump (a tree branch) → Sofi's squeeze (under a hedge or bench).
- **Hazards:** none dangerous; small pits only (the pond splash just sends you back to the checkpoint).
- **Story:** intro panels, then Smoczek flies off toward the Main Square.
- **Built from:** today's level 1 (rebuilt in Tiled during M2).

### 2. Main Market Square (Rynek Główny) — "Up on the rooftops"
- **Setting:** the Cloth Hall (Sukiennice) stalls, flower sellers, pigeons, St. Mary's Basilica.
- **New idea:** **bouncy market awnings** and climbing up toward the towers.
- **Set piece:** *(proposal)* the **hejnał** trumpet call: when it plays, the pigeons fly up and briefly form
  a bridge or open a path.
- **Hazards:** pigeon flocks that gently bump you back.
- **Story:** Smoczek is spotted on St. Mary's tower and drops the first scale.

### 3. Kazimierz — "Courtyards and trams"
- **Setting:** cobbled streets, old courtyards, café tables, cellar windows, a passing tram.
- **New idea:** **moving platforms** (the tram roof, laundry lines on pulleys) and **combining skills**:
  Kiwi jumps up to a gallery, Sofi squeezes through a cellar window to open a gate.
- **Hazards:** a rolling barrel *(proposal)*.
- **Story:** Smoczek's trail leads toward the river.

### 4. Vistula Boulevards → Dragon's Den (Smocza Jama) — "Into the cave"
- **Setting:** the riverside with boats and the dragon statue that breathes fire; then the cave under Wawel Hill.
- **New idea:** a **darker cave** with glowing crystals and water drips; *(proposal)* the statue's fire puffs
  are timed obstacles (harmless; they just push you back).
- **Hazards:** water (sends you back to the checkpoint), timed fire puffs.
- **Story:** the sisters find Smoczek's den full of collected toys. He escapes up into the castle.

### 5. Wawel Castle — "Friends again"
- **Setting:** Wawel Hill walls, the Renaissance arcaded courtyard, the cathedral, the Sigismund bell tower.
- **New idea:** the **finale**: a friendly chase ("tag") up the tower using everything learned.
  *(Proposal: ringing the Sigismund bell is the final trigger.)*
- **Story:** ending panels and credits.

## Skill matrix
Which locations use what; useful when building levels so every level has something for both sisters.

| | Planty | Rynek | Kazimierz | Smocza Jama | Wawel |
|---|---|---|---|---|---|
| Run and jump | teach | ✓ | ✓ | ✓ | ✓ |
| Swap | teach | ✓ | ✓ | ✓ | ✓ |
| Kiwi big jump | teach | ✓ | combine | ✓ | combine |
| Sofi squeeze | teach | ✓ | combine | ✓ | combine |
| Bouncy surfaces | | teach | | | ✓ |
| Moving platforms | | | teach | ✓ | ✓ |
| Timed obstacles | | pigeons | barrel | fire puffs | ✓ |

## Open questions
- The toy (red ball? a plush? a bone?) and the dragon's name.
- Do the second skills come later (Kiwi pushes crates, Sofi digs or sniffs out hidden treats)? Keep them for
  "more levels per location".
- Story delivery: comic panels between levels, speech bubbles in-level, or both?
- UI languages: Ukrainian, English and Polish. Which one is the default?
