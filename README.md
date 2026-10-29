# Note Trainer

A single-page, offline-capable notation trainer for young piano beginners. It drills one
chain: note name → key on the keyboard → position on the staff → duration → hand and finger.

**Live:** https://fangjiaqifion.github.io/note-trainer/
**Repository:** https://github.com/fangjiaqifion/note-trainer

Current unit: three notes (B3, middle C, D4) and four durations (quarter, half, dotted half,
whole). The note set is configuration, not code: adding a note is a three-step edit, see
[Units: adding notes](#units-adding-notes).

## What it is

The game was built for a four-year-old at the very start of piano lessons, so every design
choice follows from two constraints: she cannot read yet, and she practices alone for about
three minutes a day.

- Answers are given by tapping keys on a drawn keyboard or by choosing one of a few staff
  images, never by typing.
- Every question is read aloud by the system voice, so no reading is required.
- Feedback is immediate and positive; a wrong answer is "try again", never "wrong".
- The whole game is one `index.html` with no build step, no dependencies, and no network
  requests. It runs from a static host, and after the first visit it runs offline.

Sound is synthesized at runtime with the Web Audio API; there are no audio files to download.
Stars and settings live in `localStorage` on the device.

## Quick start

1. Open the live URL in Safari on the iPad.
2. Tap **Share → Add to Home Screen**. It then opens full screen, like an app, and works
   offline.
3. Pick a level. Start on Easy the first time.

## The four levels

| Level | Task | What counts as correct |
|---|---|---|
| 1 · Find the key | A letter (B / C / D) is shown; tap it on either keyboard | Any octave. This level tests the letter, not the register |
| 2 · Staff ↔ keyboard | Two directions alternate: read a note and tap a key, or read a highlighted key and pick the matching staff image | Exact register, and the correct clef |
| 3 · How many beats | Read the notehead and stem to choose 1–4 beats, or answer "which one is a half note?" | Quarter 1, half 2, dotted half 3, whole 4. After a correct answer the note sounds for its real length and a dot lights up on every beat |
| 4 · Hand, finger, hold | Read the stem to choose the hand, read the fingering digit, and hold a key for the note's full length | Hand and finger per the table below. Holding is judged by elapsed beats, with 0.2 beat of tolerance |

Level 4 does not reveal the beat count: the player has to read it from the note. While a key
is held, one dot lights up per beat and the tone keeps sounding; releasing early gets
"This note is 3 beats, you held 2".

## Notation conventions

| Note | Clef | Position | Hand | Stem | Fingering |
|---|---|---|---|---|---|
| B3 | Bass clef | Space above the staff | Left | Down | 2 |
| Middle C (C4) | Treble clef | First ledger line below | Right | Up | 1 |
| D4 | Treble clef | Space below the staff | Right | Up | 2 |

The stem direction *is* the hand: right hand up, left hand down. The fingering digit sits
outside the staff, on the far side from the note. This matches printed music, so nothing has
to be relearned when the child moves back to paper.

## Difficulty

| Setting | Options | Hint after | Tempo | Questions |
|---|---|---|---|---|
| Easy | 2 | 1 mistake | 52 BPM | 8 |
| Normal | 3–4 | 2 mistakes | 60 BPM | 8 |
| Hard | 3–4 | 3 mistakes | 76 BPM | 10 |

Three stars requires 7–8 first-try answers (9–10 on Hard), two stars 5–6, otherwise one.
Stars only ever go up. Three stars unlocks a "try harder" button on the results screen.

Hints are never automatic at the start: after enough mistakes the correct key is highlighted,
or the answer is shown in the prompt, but the player is never told "that is wrong".

## Units: adding notes

Everything about the note set lives in three declarations near the top of `index.html`:

```js
const NOTES = {
  B3: { id:'B3', letter:'B', label:'B',      midi:59, clef:'bass',   y:-0.5, hand:'L', finger:2 },
  C4: { id:'C4', letter:'C', label:'中央 C', midi:60, clef:'treble', y:5.0,  hand:'R', finger:1 },
  D4: { id:'D4', letter:'D', label:'D',      midi:62, clef:'treble', y:4.5,  hand:'R', finger:2 }
};
const UNIT = { name:'第一单元', label:'B · 中央 C · D', notes:['B3','C4','D4'] };
const LEDGER = { treble: { C4: 5 }, bass: {} };
```

To add a note:

1. Add an entry to `NOTES`.
   - `midi` is the MIDI number (59 = B3, 60 = middle C, 62 = D4). Sound and keyboard
     placement both derive from it.
   - `y` is the position on the staff in staff units, where 1 unit is one line-to-space
     step: `0`–`4` are the five lines, `4.5` is the space under the staff, `5` is the first
     ledger line below, and negative values go above the staff.
   - `hand` (`'L'` / `'R'`) also decides the stem direction; `finger` is the digit drawn
     outside the staff.
2. If the note needs a ledger line, register it in `LEDGER` under the clef, using the same
   `y` value (`LEDGER.treble.C4 = 5`).
3. Add the id to `UNIT.notes`, and update `UNIT.name` / `UNIT.label` for the home screen.

The question generators follow automatically: levels 1 and 2 draw from `NOTE_IDS`, and levels
3 and 4 extend their pools. A second unit (for example treble E4–F4–G4) can be a copy of the
folder with its own `UNIT`, or merged into one unit.

## Roadmap

Reserved for future work. Add rows; do not rewrite finished ones.

| Item | Status | Notes |
|---|---|---|
| Unit 2: E4, F4, G4 | Planned | Three `NOTES` entries, plus a `LEDGER` entry only if a ledger line is needed |
| Eighth notes | Exploring | `VALUES` already drives the drawing, so a new value is mostly data; judging needs a faster tempo |
| Progress history for parents | Planned | Stars are stored per level only; a dated log would show practice over time |
| Adaptive question selection | Idea | Currently uniform random; weight toward notes answered slowly or wrongly |
| English interface | Idea | All strings are inline; would need a small dictionary and a language switch |
| Sound check | Shipped 2026-10-29 | Settings → "试听" |
| License | Not chosen | See [License](#license) |

## Changelog

One row per user-visible change, newest first. Dates are ISO. The project is identified by
date rather than semver.

| Date | Change |
|---|---|
| 2026-10-29 | Added `noindex`, so the public site stays out of search results |
| 2026-10-29 | Added a "试听" (sound check) row in Settings, to diagnose the iPad mute switch |
| 2026-10-29 | Added structural comments throughout `index.html`; no behavior change |
| 2026-10-29 | Link-preview metadata (`og:*`, `twitter:*`) and a 1200×630 cover image |
| 2026-10-29 | Full-bleed home-screen icon, to avoid black corners on iOS |
| 2026-10-29 | Renamed from `bcd_piano_game` to `note-trainer`; note set moved into `UNIT` config |
| 2026-10-29 | First working version: four levels, three difficulty settings, offline cache |

## Project structure

```
note-trainer/
├── index.html            the whole game: styles, script, clef paths, question pool
├── manifest.webmanifest  PWA manifest for "Add to Home Screen"
├── sw.js                 offline cache
├── icon.svg, icon-*.png  icons (180 is full-bleed for iOS, 192/512 are masked)
├── og-cover.png          link-preview image referenced by og:image
├── serve.sh              local static server for development
└── README.md             this file
```

## Running locally

```bash
bash serve.sh          # serves on 8765
bash serve.sh 8080     # another port
```

The script prints two addresses: `http://127.0.0.1:8765/index.html` for this Mac, and
`http://<Mac LAN IP>:8765/index.html` for the iPad on the same Wi-Fi. Closing the lid or the
terminal stops it.

Opening `index.html` directly also renders, but the service worker will not register from
`file://`, so offline mode is only available over http(s).

## Deploying

The site is served by GitHub Pages from the `main` branch, repository root. Push to `main`
and the site rebuilds in about a minute.

- `cache-control` is 600 seconds; when checking a fresh deploy, append a query string.
- Free accounts can only publish Pages from a public repository, so both the repository and
  the site are public.
- The page carries `noindex, nofollow, noarchive`: search engines will not index it, but
  anyone with the link can still open it.

## Editing this README

Notes for future edits, so the document does not drift:

- Keep the section order. New feature detail goes under the relevant section, not at the end.
- Roadmap: add a row and set a status (`Planned` / `Exploring` / `Idea` / `Shipped`). When an
  item ships, change its status and add a changelog row; leave the row in place.
- Changelog: one row per user-visible change, newest first, written as what changed for the
  player, not as a commit summary.
- Code changes should also update the header comment in `index.html`, which describes the
  same architecture in more detail.
- The interface is Chinese by design (it is for a Chinese-speaking child); the README is
  English so the repository is readable to outside visitors. Keep that split.

## Credits

The treble clef is `Treble clef.svg` by Tlusťa, and the bass clef is `Clef Bass (F).svg`,
both from Wikimedia Commons and in the public domain. Both paths are inlined in
`index.html`; nothing is fetched at runtime.

The hand icons, keyboard, and cover image were drawn for this project.

## License

No license has been chosen yet. Until one is added, the code is public for reference but not
licensed for reuse. If this changes, add a `LICENSE` file and replace this section.

## Known limitations

- The page cannot tell which finger was used. Level 4 tests reading and memory; the actual
  hand position has to be checked on the piano by an adult.
- Holding is judged by duration only, not by which finger pressed.
- On iOS, the side switch mutes Web Audio as well. Use Settings → "试听" to tell a muted
  device from a broken page.
- Speech depends on installed system voices: Chinese text uses a Chinese voice, while the
  letters B / C / D are read by an English voice as letter names. Without the voices the page
  falls back to text only.
- In landscape the staff scales to fit the height, so it looks narrower than on paper.
- Stars and settings are per device (`localStorage`); clearing website data erases them.
