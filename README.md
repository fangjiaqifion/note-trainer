# Note Trainer

A single-page, offline-capable notation trainer for young piano beginners. It drills one
chain: note name → key on the keyboard → staff and clef → duration → hand and finger, then
returns to the staff itself to name its lines and spaces. New notes are introduced one at a
time in a short spotlight, then folded into the same six skills.

**Live:** https://fangjiaqifion.github.io/note-trainer/
**Repository:** https://github.com/fangjiaqifion/note-trainer

Current note set: three anchor notes (B3, middle C, D4) are always available; E4 is the
current new note; F4 and G4 are queued. The note set is configuration, not code: adding a
note is one registry entry plus one queue slot, see [Adding a note](#adding-a-note). The six
skills stay the same as the set grows; the menu does not get longer.

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
The keyboard uses an additive piano voice: twelve partials with the slight stretch of a real
string, two strings detuned by 0.35 cent so their average is the exact equal-tempered pitch, a
two-stage decay with no steady sustain, hammer and damper noise, and a light room reverb
generated in code. The fundamental is always the exact equal-tempered frequency, and no
sample-shifting is involved.

Stars and learning progress live in `localStorage` on the device.

## Quick start

1. Open the live URL in Safari on the iPad.
2. Tap **Share → Add to Home Screen**. It then opens full screen, like an app, and works
   offline.
3. Tap **今日练习** (Daily practice). The child does not have to choose a skill first.

## The six skills

The six cards are fixed. Each one declares which note flags it needs, so a new note joins a
skill automatically once that flag is open.

| # | Skill | Task | Needs |
|---|---|---|---|
| 1 | 找键盘 · Find the key | A big letter is shown; tap any key with that letter name | `key` |
| 2 | 谱与键 · Staff ↔ keyboard | Read a note and tap the key, or read a key and pick the staff image | `key` + `pos` |
| 3 | 谱号 · Which clef | A note is drawn on a staff with no clef; choose treble or bass | `pos` |
| 4 | 时值 · Read and hold | Read the note, choose the beat count, then find the key and hold it | `key` + `pos` |
| 5 | 手指 · Hand, finger, hold | Three stages: which hand, which finger, then hold for the note's length | `key` + `pos` + `fin` |
| 6 | 线与间 · Lines and spaces | A bare five-line staff; tap the line or space asked | none |

The clef skill uses a fixed pool (B3, C4 on the treble staff, C4 on the bass staff, D4) and
does not grow with the note set. F, G and A are all treble notes; adding them would turn the
level into "is it B3?", so the pool is deliberately kept at four spellings.

## New notes: an eight-step spotlight

A new note is not a new level. It is a short flow that opens three flags on the note:

| Flag | Meaning | Opens |
|---|---|---|
| `key` | Find the note on the keyboard in any octave | Skill 1 |
| `pos` | Match the staff position, clef and exact octave | Skills 2, 3, 4 |
| `fin` | Know the hand and finger | Skill 5 |

The flow has eight steps, taken four at a time, so a note takes two short sessions:

| Step | Task | Flag opened |
|---|---|---|
| 0 | Local keyboard showing the new note's black-key group (C4–E4 for the two-black group, F4–B4 for the three-black group); the landmark is named once | `key` (partial) |
| 1 | Full keyboard, any octave: only the letter counts | `key` |
| 2 | Full keyboard, exact pitch: the new note itself | `key` |
| 3 | Staff → keyboard, with a position hint after mistakes | `pos` |
| 4 | Keyboard → staff, options limited to the new note and its learned neighbours | `pos` |
| 5 | Hand, finger, then hold a quarter note | `fin` |
| 6 | Mixed with neighbours: staff → keyboard | — |
| 7 | Mixed with neighbours: keyboard → staff | — |

After step 3 the note enters skills 1 and 2. After step 7 all three flags are open and the
note joins every skill that asks for it. The home screen then shows a **下一个音** (Next note)
button; the parent decides when to start the next note. The game never advances the note set
on its own.

E4 is the current new note. F4 and G4 are queued. A4 is defined in `NOTES` but not queued,
because it falls outside the right-hand five-finger position and needs a hand-position lesson
before it can use the same spotlight.

## Daily practice

One tap on **今日练习** builds a ten-question session:

| Block | Questions | Source | Purpose |
|---|---|---|---|
| Review | 2 (3 when there is no new note) | The least recently seen learned notes | Retention |
| New note | 4 | The current spotlight steps | Acquisition |
| Mixed | 4 (7 when there is no new note) | Learned notes, with the new note guaranteed once | Discrimination |

Sessions are kept at ten questions so practice stays near three minutes. The note set can
grow without making a session longer; older notes rotate in through the review block.

The home screen also has a row of note chips (**我的音**). A learned chip starts a six-question
review of that note and its neighbours. The current new note pulses; tapping it starts the
spotlight. Notes that have not been taught are dimmed.

## Notation conventions

| Note | Clef | Position | Hand | Finger |
|---|---|---|---|---|
| B3 | Bass | Space above the staff | Left | 2 |
| Middle C (C4) | Treble | First ledger line below | Right | 1 |
| D4 | Treble | Space below the staff | Right | 2 |
| E4 | Treble | First line (bottom line) | Right | 3 |
| F4 | Treble | First space | Right | 4 |
| G4 | Treble | Second line | Right | 5 |
| A4 | Treble | Second space | Right | not fixed yet |

The stem direction *is* the hand: right hand up, left hand down. The fingering digit sits
outside the staff, on the far side from the note. This matches printed music, so nothing has
to be relearned when the child moves back to paper. Middle C has a second legal spelling, on
the first ledger line above the bass staff; it is `C4B` in `NOTES` and appears only in the
clef skill.

The digit is drawn in the same colour as the ring on the cartoon hand, so "the 2 on the
score" and "the hand whose index finger wears the ring" are visibly the same thing. The hand
pictures show the thumb clearly (right hand: thumb on the left) and use a blue sleeve for the
left hand and a coral sleeve for the right, the convention many beginner piano books use. The
fingers are always open: the target finger wears a magenta ring instead of being raised, so
the picture never asks the child to copy a hand gesture.

## Holding a note

Skills 4 and 5 share the same hold interaction (`holdPad` in `index.html`). There is no
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

## Difficulty

| Setting | Options (beats / staff / finger) | Hint after | Tempo | Questions (skills / skill 5) |
|---|---|---|---|---|
| Easy | 2 / 2 / 2 | 1 mistake | 52 BPM | 8 / 6 |
| Normal | 4 / 3 / 3 | 2 mistakes | 60 BPM | 8 / 6 |
| Hard | 4 / 3 / 3 | 3 mistakes | 76 BPM | 10 / 8 |

The clef skill always has two options, treble or bass. Skill 5 runs two questions fewer
because each one takes three stages, which keeps a session at about three minutes. The daily
session and the spotlight always ask ten and four questions respectively; they do not use the
difficulty count.

Three stars requires all but one first-try answer; two stars all but three; anything lower is
one star. Stars are stored per skill (1–6) and only ever go up. The daily session and the
spotlight show stars on the result screen but do not overwrite skill stars.

Hints are never automatic at the start: after enough mistakes the correct key is highlighted,
or the answer is shown in the prompt, but the player is never told "that is wrong".

## Adding a note

Everything about the note set lives in three declarations near the top of `index.html`:

```js
const NOTES = {
  E4: { id:'E4', letter:'E', label:'E', midi:64, clef:'treble', y:4.0,
        hand:'R', finger:3, stage:4, landmark:'两个黑键的右边',
        keyHint:'E 在两个黑键的右边，中央 C 右边第二个白键',
        posHint:'E 在高音谱号的第一条线上',
        clefHint:'E 在高音谱号的第一条线上' }
};
const NOTE_ORDER = ['B3','C4','D4','E4','F4','G4'];
const BASE_NOTES = ['B3','C4','D4'];
```

To add a note:

1. Add an entry to `NOTES`.
   - `midi` is the MIDI number (59 = B3, 60 = middle C, 64 = E4, 65 = F4, 67 = G4).
   - `y` is the staff position in staff units: line 1 = 4, space 1 = 3.5, line 2 = 3,
     space 2 = 2.5, the space below the staff = 4.5, the first ledger line below = 5.
   - `hand` (`'L'` / `'R'`) also decides the stem direction; `finger` is the digit drawn
     outside the staff (0 means no fixed fingering yet).
   - `stage` is the introduction order; `landmark`, `keyHint` and `posHint` are the spoken
     and written hints.
2. Append the id to `NOTE_ORDER` in the order it should be taught. Do not put it in
   `BASE_NOTES`; that array is only for the three notes that are known from the start.
3. If the note needs a ledger line, register it in `LEDGER` under the clef, using the same
   `y` value (`LEDGER.treble.C4 = 5`).
4. Test the spotlight: the local keyboard should end at the new note, the full-keyboard step
   should accept only the exact pitch, and the mixed step should offer the new note and its
   learned neighbours.

No other code changes are needed. The six skills read `activeNotes(needs)` and pick up the
new note as its flags open.

## Adding a skill

Add one entry to `SKILLS` and one `make` function:

```js
{ id:7, key:'interval', name:'音程', title:'音程',
  desc:'两个音之间隔几步', color:'#5C6B3F',
  needs:['key','pos'], pool:'active', make:makeInterval }
```

`needs` says which note flags the skill requires; `pool` is `'active'` (learned notes),
`'fixed'` (the `ids` list) or `'none'` (no notes). `make(ids, n)` returns an array of question
objects with the same `{ kind, render(), reveal() }` interface as the existing factories.
`buildQuestions` is a registry lookup now, not a chain of `if`/`else`, so adding a skill does
not touch the note data or the other skills.

`SKILLS` also drives the home screen. The menu length is fixed at six; new skills would be
added only when the interface has room for them.

## Roadmap

Reserved for future work. Add rows; do not rewrite finished ones.

| Item | Status | Notes |
|---|---|---|
| F4 and G4 | Queued | Data is in `NOTES`; they enter after E, through the same spotlight |
| A4 and hand position | Idea | A4 is outside the C five-finger position; needs a hand-shift lesson |
| Note names for staff lines | Idea | Skill 6 asks where line 2 is; the next step is "line 2 is G" |
| Eighth notes | Exploring | `VALUES` already drives the drawing; judging needs a faster tempo |
| More left-hand notes | Idea | B3 is the only left-hand note, so skill 5 is right-hand heavy |
| Progress history for parents | Planned | Flags are stored per note; a dated log would show practice over time |
| Adaptive question selection | Idea | `staleNotes` rotates review; weights could also follow error history |
| English interface | Idea | All strings are inline; would need a small dictionary and a switch |
| Sound check | Shipped 2026-10-29 | Settings → "试听" |
| License | Not chosen | See [License](#license) |

## Changelog

One row per user-visible change, newest first. Dates are ISO. The project is identified by
date rather than semver.

| Date | Change |
|---|---|
| 2026-11-02 | Six skills on a growing note set: new notes enter through an eight-step spotlight (four steps per session), then join skills 1–5; the home screen adds note chips, a daily-practice button, and a parent-controlled "next note" button |
| 2026-11-02 | Level 7: a short C4–E4 keyboard introduces E, then the full keyboard; C/D/E naming, D/E and C/E comparisons, and a B C D E mix, with no duration |
| 2026-11-02 | The home screen lays out seven levels in two columns, with the seventh centered |
| 2026-11-02 | Level 6: a bare five-line staff, tap the line or space asked; the first half has no clef, the second half adds a treble or bass clef as a distractor |
| 2026-11-02 | Added `LEVELS.md`, a Chinese record of what each level trains and what it leaves out |
| 2026-10-30 | The piano voice now decays naturally instead of holding a steady tone, with unison strings, stretched partials, hammer and damper noise, and a light room reverb |
| 2026-10-30 | Keyboard notes use an additive piano voice with exact equal-tempered pitch; still no audio files |
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
├── LEVELS.md             skill-by-skill teaching record (Chinese)
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
- After editing `index.html`, bump the cache name in `sw.js` (currently `note-trainer-v14`);
  otherwise the iPad keeps the old page.

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

- The page cannot tell which finger was used. Skill 5 asks which finger and shows the right
  picture, but the actual hand position still has to be checked on the piano by an adult.
- Holding is judged by duration only, not by which finger pressed. In skill 5 the hand and
  finger are checked before the key is pressed, not while it is held.
- The clef skill covers the four spellings this note set uses, not the general rule that
  clefs are chosen by register: middle C is legal in both clefs, and one pitch can be written
  more than one way.
- Skill 6 uses the clef as a distractor: the second half shows one but never names it, and
  the answer is the same in either clef. The other lines and spaces come later.
- A4 is defined but not queued. Its fingering is left at 0 because it needs a hand shift,
  and the spotlight has no hand-position step yet.
- F4 is 4 and G4 is 5 in the right-hand C position. The game does not check the actual
  finger, and it does not yet teach a new hand position.
- B3 is the only left-hand note. Skill 5 is therefore right-hand heavy; the left-hand
  contrast is weaker than it should be once the set grows.
- Stars are per skill and per device. The daily session and the spotlight do not overwrite
  skill stars; progress flags are stored separately.
- On iOS, the side switch mutes Web Audio as well. Use Settings → "试听" to tell a muted
  device from a broken page.
- Speech depends on installed system voices: Chinese text uses a Chinese voice, while the
  letters B / C / D / E are spoken by an English voice as letter names. Without the voices
  the page falls back to text only.
- In landscape the staff scales to fit the height, so it looks narrower than on paper.
- Stars and progress are per device (`localStorage`); clearing website data erases them.
