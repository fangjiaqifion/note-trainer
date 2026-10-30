# Note Trainer

A single-page, offline-capable notation trainer for young piano beginners. It drills one
chain: note name → key on the keyboard → staff and clef → duration → hand and finger.

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

## The five levels

| Level | Task | What counts as correct |
|---|---|---|
| 1 · Find the key | A big letter (B / C / D) is shown under one instruction, "find the position of the displayed note name". Tap that key on either keyboard | Any octave. This level tests the letter, not the register |
| 2 · Staff ↔ keyboard | Two directions alternate: read a note and tap a key, or read a highlighted key and pick the matching staff image | Exact register, and the correct clef |
| 3 · Which clef | A note is drawn on a staff that has no clef, and the prompt says which note it is ("this is B" / "this is middle C"). Choose the treble or the bass clef | Four spellings: B3 in the space above the bass staff takes the bass clef; middle C on the first ledger line below the treble staff takes the treble clef; middle C on the first ledger line above the bass staff takes the bass clef; D4 in the space below the treble staff takes the treble clef |
| 4 · Read and hold | Read the note, choose how many beats it lasts, then find the key on the keyboard yourself and hold it for that long | Quarter 1, half 2, dotted half 3, whole 4 for the first step. The key is not highlighted and the beat count is not shown again: finding the key and judging the length are part of the answer |
| 5 · Hand, finger, hold | Three stages per question: choose the hand, choose the finger, then hold the key for the note's full length | Hand and finger per the table below; holding is judged in both directions |

**The clef level teaches one reading.** Middle C has two spellings: on the first ledger line
below the treble staff, and on the first ledger line above the bass staff. The level adds one
more note on each side, B3 in the space above the bass staff and D4 in the space below the
treble staff. The staff is drawn without a clef and the prompt names the note, so the question
is which clef makes that written position that note. On a correct answer the clef appears
where the question mark was. The four spellings appear equally often, so always guessing one
clef cannot beat the level.

**Level 4 asks three things, one after another.** The player reads the note, answers how many
beats, then has to find that note on the keyboard and hold it for the right length. An older
version lit the key and laid out one dot per beat, which gave away the position and the
duration; both hints are gone. Feedback still names the note and the length after a mistake.

**Level 5 is three questions in one.** Each note asks, in order: which hand, which finger,
then play it for its full length. The finger choices are open hands with a ring on one finger,
so nothing has to be mimed; the score prints the digit, and the player connects "2" with the
ringed index finger. Only the final hold is judged for stars, and a mistake at any stage still
costs the first-try star. Whole notes are left out of this level: without a stem there is no
hand cue.

## Holding a note

Levels 4 and 5 share the same hold interaction (`holdPad` in `index.html`). There is no
count-in: the child presses whenever ready, and the press starts the note.

The screen shows one circle that reads 1 the moment the key goes down, with a click: the
press is beat 1. Each following beat adds one and clicks again, and the count stops at the
note's value, so it never shows one number too many. A four-beat note therefore reads
1-2-3-4 and clicks four times; a half note reads 1-2. The last number stays on screen for one
more beat, and that last beat is the part the child has to keep counting: the release comes
one beat after the fourth click. Nothing marks the target length in advance, and the tone
does not stop at the right moment. The keyboard is never highlighted, so finding the note is
part of the task.

The window is 0.3 beat early and 0.62 beat late. A slightly early or late release is forgiven,
but holding far past the note's length is an error. A wrong release says how long the note is
and keeps the same question on screen; after two failed holds the correct key is marked.

## Notation conventions

| Note | Clef | Position | Hand | Stem | Fingering |
|---|---|---|---|---|---|
| B3 | Bass clef | Space above the staff | Left | Down | 2 |
| Middle C (C4) | Treble clef | First ledger line below | Right | Up | 1 |
| D4 | Treble clef | Space below the staff | Right | Up | 2 |

The stem direction *is* the hand: right hand up, left hand down. The fingering digit sits
outside the staff, on the far side from the note. This matches printed music, so nothing has
to be relearned when the child moves back to paper. Middle C has a second legal spelling, on
the first ledger line above the bass staff; it is `C4B` in `NOTES` and appears only in the
clef level.

The digit is drawn in the same colour as the ring on the cartoon hand, so "the 2 on the
score" and "the hand whose index finger wears the ring" are visibly the same thing. The hand
pictures show the thumb clearly (right hand: thumb on the left) and use a blue sleeve for the
left hand and a coral sleeve for the right, the convention many beginner piano books use.
The fingers are always open: the target finger wears a magenta ring instead of being raised,
so the picture never asks the child to copy a hand gesture.

## Difficulty

| Setting | Options (level 4 beats / level 2 / finger) | Hint after | Tempo | Questions (levels 1–4 / level 5) |
|---|---|---|---|---|
| Easy | 2 / 2 / 2 | 1 mistake | 52 BPM | 8 / 6 |
| Normal | 4 / 3 / 3 | 2 mistakes | 60 BPM | 8 / 6 |
| Hard | 4 / 3 / 3 | 3 mistakes | 76 BPM | 10 / 8 |

The clef level always has two options, treble or bass. Level 5 runs two questions fewer
because each one takes three stages, which keeps a session at about three minutes.

Three stars requires all but one first-try answer; two stars all but three; anything lower
is one star. That is 7/8 and 5/8 on Easy and Normal, 9/10 and 7/10 on Hard, and 5/6 and 3/6
in level 5, which has fewer questions. Stars only ever go up. Three stars unlocks a "try
harder" button on the results screen.

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

The clef level also uses `C4B`, a second spelling of middle C on the bass staff
(`clef:'bass'`, `y:-1`, `stem:'down'`, registered in `LEDGER.bass`). It is not in
`UNIT.notes`, so only the clef level draws it.

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

The question generators follow automatically: every level draws from `NOTE_IDS`, so a new
note appears in all five. The clef level reads each note's `clef` field, so a new note needs
the right clef set. A second unit (for example treble E4–F4–G4) can be a copy of the folder
with its own `UNIT`, or merged into one unit.

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
| 2026-10-30 | The hold count starts at 1 on the press and stops at the note's value: 1-2-3-4 and four clicks for a whole note |
| 2026-10-30 | Clef level adds middle C written on the bass staff's upper ledger line, so there are four spellings |
| 2026-10-30 | The hold counter no longer shows 0: the press shows a dot, then 1-2-3-4, so a whole note is four numbers, not five |
| 2026-10-30 | Level 1 draws a fresh sequence each time and never repeats the same note twice in a row |
| 2026-10-30 | The beat counter clicks once per beat held; the press is silent, so a four-beat note counts four clicks, not five |
| 2026-10-30 | Question speech is queued one sentence at a time, so changing between the Chinese and English voices cannot drop a prompt |
| 2026-10-30 | Added a clef level between the staff/keyboard level and the beat-count level; levels are renumbered and saved stars move with them |
| 2026-10-30 | Level 4 no longer highlights the key or shows the beat count: finding the note and judging the length are part of the answer |
| 2026-10-30 | Level 1 states the task once instead of naming the note in the instruction every time |
| 2026-10-30 | Finger choices are open hands with a ring on the target finger, so no finger has to be raised |
| 2026-10-30 | Speech is quieter and the piano is louder, so the voice no longer covers the instrument |
| 2026-10-30 | Offline cache bumped to v4 |
| 2026-10-30 | Middle C is labelled "中央 C" at the keyboard's top-right corner, next to the same orange dot |
| 2026-10-30 | "Which one is a half note" no longer says the beat count before holding; a counter shows the beats passed and the child judges when to let go |
| 2026-10-30 | The hand/finger level rebuilt as three stages per note: choose the hand, choose the finger from cartoon hands, then hold for the full length |
| 2026-10-30 | New cartoon hand icons: thumb side, wrist, fingernails, blue left sleeve and coral right sleeve |
| 2026-10-30 | The hand/finger level drops whole notes: without a stem there is no hand cue |
| 2026-10-30 | Offline cache bumped to v3 |
| 2026-10-29 | Level 3 now ends with holding the key: pick the beat count, then hold for that many beats |
| 2026-10-29 | Note letters are spoken as letter names ("bee", "see"), never "capital B" |
| 2026-10-29 | "弹" is read tán, not dàn (speech-only substitution; the screen still shows 弹) |
| 2026-10-29 | Redrew the left/right hand icons: clear thumb, wrist, correct finger lengths |
| 2026-10-29 | Fixed: a finger sliding off the keyboard left the key lit and the tone ringing |
| 2026-10-29 | Fixed: leaving a level mid-hold left the tone playing |
| 2026-10-29 | Removed the four-beat count-in before a hold; pressing starts the beat |
| 2026-10-29 | Staff shrinks when the keyboard is on screen, so the keyboard fits on iPad portrait |
| 2026-10-29 | Offline cache bumped to v2; removed duplicate manifest icon entry |
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

The cartoon hands, keyboard, and cover image were drawn for this project.

## License

No license has been chosen yet. Until one is added, the code is public for reference but not
licensed for reuse. If this changes, add a `LICENSE` file and replace this section.

## Known limitations

- The page cannot tell which finger was used. Level 5 asks which finger and shows the right
  picture, but the actual hand position still has to be checked on the piano by an adult.
- Holding is judged by duration only, not by which finger pressed. In level 5 the hand and
  finger are checked before the key is pressed, not while it is held.
- The clef level covers the four spellings this unit uses, not the general rule that clefs
  are chosen by register: middle C is legal in both clefs, and one pitch can be written more
  than one way.
- On iOS, the side switch mutes Web Audio as well. Use Settings → "试听" to tell a muted
  device from a broken page.
- Speech depends on installed system voices: Chinese text uses a Chinese voice, while the
  letters B / C / D are spoken by an English voice as letter names ("bee", "see", "dee").
  Without the voices the page falls back to text only.
- In landscape the staff scales to fit the height, so it looks narrower than on paper.
- Stars and settings are per device (`localStorage`); clearing website data erases them.
