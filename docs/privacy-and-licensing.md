# Privacy and licensing

What the game does with data, who owns what, and what to do before sharing it more widely. Reviewed 2026-10-21.
This is a careful developer's checklist, not legal advice. If the game ever earns money, shows ads, or goes into an
app store's kids section, have a lawyer look at it.

## Where we are

### Data: the game collects nothing about players

| What | Where it goes | Personal data? |
|---|---|---|
| Settings (`maltipoo.settings`: hitboxes, language) | `localStorage`, this browser only | No |
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

### Licensing: code and art are both under MIT today

- `LICENSE` is MIT ("Copyright (c) 2025 GrekNick") and the repository is **public**. MIT applies to everything in
  the repository, so **anyone may copy and even sell the art, the logo and the characters**, not only the code.
  `package.json` says `ISC`, which contradicts it.
- Libraries in the build: Phaser (MIT). socket.io and express are only used by the parked co-op. MIT asks that its
  notice stays with the code; Phaser's license comments survive in the built file.
- Art provenance is not written down. The raw sprites, the logo and the Smok Junior sheet look AI-generated, then
  were rebuilt as pixel art by our tools. Two things follow:
  1. Whether we may publish them depends on the generator's terms of use.
  2. Purely AI-generated images may not be protected by copyright in some countries (e.g. the US), so we might not
     be able to stop others from copying them. Our hand-edited pixel versions are on firmer ground.
- **A found image in the public history:** `assests/test_man_sprites/man.png` (and a copy), a 6-frame man sprite
  sheet. It was added in February 2026 in commit c063afe, later deleted, but still downloadable from the git
  history. Its source is unknown; if it came from the web, it's someone else's art published in our repo.
- `assets/characters/smok_jr.png` is untracked; its source isn't recorded yet.
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
   commercial game. CC0 is ideal (Kenney). Record them in the credits.

## To do

Also in the roadmap ("Privacy and licensing" before M8). Do the first group soon, because the repo is already
public and deployed.

**Soon (now):**
- [ ] **Decide the art license.** Suggested: code stays MIT; art, characters, logo and story are "all rights
      reserved" (or CC BY-NC 4.0 if you're happy for people to reuse them non-commercially with credit). Then add
      `ASSETS-LICENSE.md` (or `art/LICENSE`), update `LICENSE` and the README's License section so they say which
      covers what, and set `package.json` `license` to `MIT` with `"private": true` (it also prevents an
      accidental `npm publish`).
- [ ] **Record art provenance** in `art/raw/SOURCES.md`: generator and date for each raw image, plus what our
      tools derived from it. Check the generator's terms allow a public game.
- [ ] **The found test sprite in history:** ask Vadym where `man.png` came from. If it isn't free to use, either
      accept the low risk (it's not in the game or the site) or rewrite history with `git filter-repo` and
      force-push. That's disruptive: every clone needs re-cloning and forks keep the old history. Write down what
      was decided.
- [ ] **Smok Junior sheet:** record its source before it's committed (and move it to `art/raw/smok_junior/`).
- [ ] **Contributor OK:** a short note from Vadym that his contributions are his to give under the repo's license.
- [ ] **Commit email:** `git config --global user.email <id>+GrekNick@users.noreply.github.com` (the exact
      address is in GitHub → Settings → Emails), and tick "Keep my email addresses private" there.

**Before sharing the game widely (with M8):**
- [ ] **Privacy notice** in EN/UK/PL, linked from the title screen or credits and the README. It says: no personal
      data, what is saved on the device and how to delete it, hosting by GitHub Pages (IP logs), and a contact.
      Short and kid-readable on top, details below.
- [ ] **"Reset progress"** in Settings, with a confirmation: deleting your data without browser menus.
- [ ] **Credits screen**: Phaser (MIT), any third-party assets, contributors, "not affiliated with" the Wieliczka
      Salt Mine or Wawel Royal Castle.
- [ ] **itch.io or app stores:** stores require a privacy policy URL even for "we collect nothing". They also need
      an age rating (IARC questionnaire), and the kids' sections (Google Play "Designed for Families", Apple Kids
      Category) have extra rules. Re-read this document then.

**Only if online co-op is ever un-parked:**
- [ ] The server sees IP addresses and positions; it logs connection ids and allows any origin (`cors: *`).
      Before hosting it: no names or chat for kids, a narrowed CORS origin, a log policy, the server's location
      (EU/GDPR), and an updated privacy notice.
