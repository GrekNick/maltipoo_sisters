# Privacy and licensing

What the game does with data, who owns what, and what to do before sharing it more widely. Reviewed 2026-10-21.
This is a careful developer's checklist, not legal advice. If the game ever earns money, shows ads, or goes into an
app store's kids section, have a lawyer look at it.

## Where we are

### Data: the game collects nothing about players

| What | Where it goes | Personal data? |
|---|---|---|
| Settings (`maltipoo.settings`: hitboxes, language, on-screen controls) | `localStorage`, this browser only | No |
| Progress (`maltipoo.progress`: best time and treat count per finished level; old `maltipoo.best.*` keys are only read) | `localStorage`, this browser only | No |
| Page and asset requests | GitHub Pages servers | Your IP address and browser details reach GitHub's server logs, as with any website ([GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)) |

Checked in the code and the production build:
- No accounts, names, chat, analytics, ads, cookies, fonts or scripts from other sites. The page loads only its
  own files.
- Nothing stored leaves the device. Clearing the site's data in the browser deletes all of it.
- Online co-op is not in the built game: it's only bundled with `VITE_COOP=true` (see "Co-op" below).

**Why this matters for a kids' game:** the strict rules for children's games are about *collecting personal data*.
That covers the US COPPA, the EU GDPR (Art. 8, parental consent; in Poland under 16), and the UK Children's Code.
Collecting none keeps us outside most of them. Saving settings and progress on the device for a feature the player
uses counts as "strictly necessary" under the EU cookie rules (ePrivacy), so **no consent banner is needed**. Adding
analytics, ads, accounts or a server changes all of that, hence the rule below.

Players can read this in the **privacy notice** ([privacy.html](../privacy.html), linked from the title screen and
the README; EN/UK/PL) and delete their progress in Settings → Reset progress. **Keep the notice in sync with this
document.**

### Licensing: code MIT, everything creative all rights reserved (since 2026-10-21)

- `LICENSE` (MIT) covers **the source code only**; it says so at the top. [ASSETS-LICENSE.md](../ASSETS-LICENSE.md)
  reserves all rights in the characters, art, logo, story and level designs. Before that, MIT covered everything
  in the public repository, so copies made from older commits could claim MIT for the art. That's a small,
  accepted risk; the current terms apply from now on.
- `package.json` says `SEE LICENSE IN LICENSE` and is `"private": true`, so it can't be published to npm by accident.
- **Fonts: none are shipped.** The game and pages only *name* fonts already installed on the player's device
  (`"Trebuchet MS", "Segoe UI", Verdana, Arial, sans-serif`, see `FONT_FAMILY` in `src/scenes/shared.ts`), and the
  browser uses whichever exists. Nothing is redistributed, so no font license applies; it's the same as any web
  page asking for Arial. Text in the logo is part of the image, not a font. Checked in the repo and the build: no
  font files, no `@font-face`, no font services.
- Libraries in the build: Phaser (MIT). socket.io and express are only used by the parked co-op. MIT asks that its
  notice stays with the code; Phaser's license comments survive in the built file.
- Art provenance is in [art/raw/SOURCES.md](../art/raw/SOURCES.md). The originals were generated with Google Gemini
  and Anthropic Claude from the owner's prompts, then rebuilt as pixel art by our tools. Two things follow:
  1. Publishing them depends on the providers' terms; both say they don't claim ownership of outputs. Re-check them
     before a commercial release.
  2. Purely AI-generated images may not be protected by copyright in some countries (e.g. the US), so we might not
     be able to stop others from copying them. Our hand-edited pixel versions are on firmer ground.
- **A found image left on GitHub:** `assests/test_man_sprites/man.png` (and a copy), a 6-frame man sprite sheet of
  unknown source, added in February 2026 (commit c063afe) and deleted later. Checked 2026-10-21: **no branch, tag
  or pull request contains it any more**, so there's no history to rewrite. GitHub still serves the orphaned commit
  to anyone who has its exact ID, until GitHub Support purges it. The repo has no forks.
- `assets/characters/smok_jr.png` is untracked; its source (AI, Gemini or Claude) is in SOURCES.md, to be moved
  into `art/raw/` when it's ready.
- Contributors: besides the owner, Vadym Moiseyenko (co-op prototype, README, the test sprite above), committing
  with a work address. Normally contributions to an MIT repo are under MIT, but it's worth his OK, especially if
  any of it was done on work time.
- Real places and the dragon legend: place names, landmarks and folklore are fine in fiction. Don't use official
  logos or branding (the Wieliczka Salt Mine and the Wawel Royal Castle are institutions with trademarks), don't
  suggest they endorse the game, and draw landmarks ourselves instead of using photos.

### The owner's own privacy

Commit author details are public in a public repository. History shows a personal Gmail address and a local machine
address (`nickgrechuha@MacBook-Pro-Nick.local`, which reveals the computer's user and host name). Future commits can
use GitHub's no-reply address instead (see the steps below). The existing history stays as it is.

## Rules from now on

1. **No new data flows without a review.** Analytics, ads, accounts, player names, chat, crash reporting, a
   server, or loading anything from another site (fonts, CDNs) first needs an update of this document and of the
   privacy notice. Prefer not doing it at all: it's a kids' game.
2. **Every new `localStorage` key goes in the table above.**
3. **Every art file has a source**: who made it, how (drawn, generated with which tool, edited by which script),
   and its license. Found images are never committed (see art-direction.md).
4. **Third-party assets** (tilesets, fonts, sounds) only with a license that allows a public, possibly
   commercial game. CC0 is ideal (Kenney). Record them in `art/raw/SOURCES.md` and the credits.
5. **Fonts, if we ever bundle one** (e.g. a pixel font for M7): only **SIL Open Font License 1.1** or CC0 (most
   Google Fonts are OFL). Ship its `OFL.txt` next to the file, don't rename-and-sell it, and **host the file
   ourselves**. Never load it from the Google Fonts servers: that sends every player's IP address to Google, which a
   German court found to break the GDPR (LG München I, 2022), and it would need the privacy notice changed. Avoid
   "free for personal use" fonts from font sites: they don't allow a public game.

## To do

Also in the roadmap ("Privacy and licensing" before M8). Do the first group soon, because the repo is already
public and deployed.

**Soon (now):**
- [x] **Art license:** code MIT, the rest all rights reserved (`ASSETS-LICENSE.md`, `LICENSE`, README,
      `package.json` with `"private": true`).
- [x] **Art provenance** recorded in `art/raw/SOURCES.md` (Gemini and Claude).
- [ ] **The found test sprite:** it's in no branch any more (no rewrite needed). Ask GitHub Support to purge the
      orphaned commit `c063afe062fcdc98574bcd4a376d6918669bf24b` from GitHub (support.github.com → "Removing data"):
      only the repo owner can request it.
- [x] **Smok Junior sheet:** source recorded; move it to `art/raw/smok_junior/` when it's ready.
- [ ] **Contributor OK:** a short note from Vadym that his contributions are his to give under the repo's
      license.
- [x] **Commit email:** future commits use `10743531+GrekNick@users.noreply.github.com`. Also tick "Keep my email
      addresses private" and "Block command line pushes that expose my email" in GitHub → Settings → Emails.

**Before sharing the game widely (with M8):**
- [x] **Privacy notice** in EN/UK/PL (`privacy.html`), linked from the title screen and the README.
- [x] **"Reset progress"** in Settings, with a confirmation (No is focused first).
- [ ] **Credits screen**: Phaser (MIT), any third-party assets, contributors, "not affiliated with" the Wieliczka
      Salt Mine or Wawel Royal Castle.
- [ ] **itch.io or app stores:** stores require a privacy policy URL even for "we collect nothing". They also need
      an age rating (IARC questionnaire), and the kids' sections (Google Play "Designed for Families", Apple Kids
      Category) have extra rules. Re-read this document then.

**Only if online co-op is ever un-parked:**
- [ ] The server sees IP addresses and positions; it logs connection ids and allows any origin (`cors: *`).
      Before hosting it: no names or chat for kids, a narrowed CORS origin, a log policy, the server's location
      (EU/GDPR), and an updated privacy notice.
