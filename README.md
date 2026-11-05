# Note Trainer

A single-page, offline-capable notation trainer for young piano beginners. It drills one
chain: note name → key on the keyboard → staff and clef → duration → hand and finger, then
returns to the staff itself: first to name its lines and spaces, then to compare two notes by
position, with and without a clef, then to name ledger positions above and below the staff, and
finally to tell visually similar notes apart. New notes are introduced one at a time in a
14-question first lesson, then folded into the same nine skills.

**Live:** https://fangjiaqifion.github.io/note-trainer/
**Repository:** https://github.com/fangjiaqifion/note-trainer

Current note set: three anchor notes (B3, middle C, D4) are always available; E4 is the
current new note, followed by A3, A4, F4 and G4. The order follows the student's method book:
after E the book moves to A, then back to F and G. A3 is the left-hand third finger in the
middle-C position; it is paired with E4 (right-hand third finger). Learned notes can be checked
or unchecked on the home screen. Skills 1–5 and daily practice use the checked notes;
skill 9 uses eligible pairs from them, while skills 6–8 teach abstract staff positions. The note set is configuration, not code: adding a note is one registry entry plus one
queue slot, see [Adding a note](#adding-a-note). The nine skills stay the same as the set
grows; the menu does not get longer.

Each learner has a separate profile with a four-digit local PIN. The profile holds the checked
notes, progress flags, stars, settings, and a per-question practice log. Profiles are stored
in `localStorage`; learner records are not uploaded to an account server, and account recovery
is not available.

The teacher is the only superuser. A separate teacher PIN unlocks the student roster: the
teacher creates learner profiles, opens every learner's report on this device, and exports all
learners' logs. Parents and students share one limited role: they practice, check notes, change
settings, switch or lock their own profile, and cannot open reports or manage accounts.

## What it is

The game was built for a four-year-old at the very start of piano lessons, so every design
choice follows from two constraints: she cannot read yet, and she practices alone for about
three minutes a day.

- Answers are given by tapping keys on a drawn keyboard or by choosing one of a few staff
  images, never by typing.
- Every question is read aloud by the system voice, so no reading is required.
- Feedback is immediate and positive; a wrong answer is "try again", never "wrong".
- The game is one `index.html` with no compilation or runtime dependencies, and no network
  requests for piano samples or learner-data uploads. It runs from a static host and caches
  its application files for offline use.

Sound is synthesized at runtime with the Web Audio API; there are no audio files to download.
The keyboard uses an additive piano voice: twelve partials with the slight stretch of a real
string, two strings detuned by 0.35 cent so their average is the exact equal-tempered pitch, a
two-stage decay with no steady sustain, hammer and damper noise, and a light room reverb
generated in code. The fundamental is always the exact equal-tempered frequency, and no
sample-shifting is involved.

Stars, checked notes, progress flags and the practice log live in `localStorage`, in a
separate record for each learner profile.

## Quick start

1. Open the live URL in Safari on the iPad.
2. Tap **Share → Add to Home Screen**. It then opens full screen, like an app, and works
   offline.
3. On first launch the gate has no learners. Tap **老师入口** (Teacher entry), set a teacher
   PIN, then tap **新建学生** (New student) to create the first learner profile: a name or
   participant code and a four-digit learner PIN. If the device already has the old
   single-profile progress, the first profile adopts it.
4. The learner opens their card, enters their PIN, checks the notes to practice under
   **我的音** (My notes), and taps **今日练习** (Daily practice).
5. The teacher opens **老师入口**, enters the teacher PIN, and sees the roster with each
   learner's last seven days.

## Learner profiles, the teacher role, and data

A profile is a separate `localStorage` record: checked notes, progress flags, stars, settings,
the current new note, the frozen pre/post battery, and the practice log. The account roster
holds the names, colours, and salted hashes of the learner PINs, plus the teacher PIN hash.
The PINs are local gates against opening the wrong profile; they are not encryption, and
anyone who can read the device's storage can read the data.

When the app starts:

- one profile, not locked: it opens directly;
- more than one profile, or the last session ended with **锁定** (Lock): the profile picker
  appears, and switching profiles requires the PIN.

The **老师入口** (Teacher entry) is on the profile picker. The first time, it asks the teacher
to set a four-digit teacher PIN; after that it asks for it. The teacher console lists every
learner on this device with the last seven days: practice days, time on questions, questions,
and first-try accuracy. **报告** opens that learner's report; **进入** opens the learner's home
with teacher mode on, so the teacher can also run a pre/post test or clear the log. **导出全部
CSV** writes one combined file with a `participant` column. **退出老师** returns to the picker.

Teacher mode is not stored. A refresh returns to the normal profile picker, and the teacher
must enter the PIN again. Entering a learner for a report does not update the learner's
`lastActiveAt`, so viewing data does not look like practice.

A normal profile's account panel has only **切换** (Switch) and **锁定** (Lock). The report,
pre/post tests, CSV/JSON export, backup import and log clearing are hidden unless the teacher
is in teacher mode. The checked notes and the settings (sound, speech, key labels, difficulty,
decor) remain available to the learner.

### Practice log

One row is written when a question is finally answered correctly, not on every tap. A row
contains:

| Field | Meaning |
|---|---|
| `event_seq` | Monotonic counter, survives trimming |
| `datetime_iso`, `date_local` | UTC timestamp and local date |
| `session_id` | Groups the questions of one session |
| `phase` | `pre`, `post`, or empty for practice |
| `mode` | `skill`, `daily`, `spotlight`, `note`, `contrast`, or `test` |
| `skill`, `kind` | Skill 1–9 and the question factory |
| `note`, `letter`, `value`, `clef`, `line_space` | What the item asked |
| `relation`, `staff_y1`, `staff_y2`, `higher` | Skill 7 geometry: up/down/same, the two staff positions, and which note was higher (empty for other skills) |
| `ask`, `target` | Skill 7 higher/lower questions: which wording was asked, and which note was the correct answer |
| `pair`, `chosen` | Skill 9: the confusable pair (letters sorted, e.g. `A3\|C4`) and the first wrong note tapped; the last tap, the correct one, is not used |
| `difficulty` | Difficulty used for that session |
| `first_try`, `wrong_count` | Whether the first attempt was correct, and how many attempts failed |
| `response_ms` | Time from the question appearing to the correct answer |

Accuracy is `first_try / questions`; the error rate is its complement. `wrong_count` keeps
the retries that a single accuracy figure hides. Each completed answer is saved immediately.
The log retains older records rather than trimming them at 8000 rows. Export backups regularly;
if browser storage fills up, the app asks you to export. The teacher panel shows the current count.

### Practice report

The report is teacher-only. It has a range switch (last 7, 14, 30 days, or all time) and is
built from the practice log; no schema change is needed.

The header summarizes the range: practice days, time on questions, questions, first-try
accuracy, the two weakest items, the strongest item, the error-rate trend, and the note set
(learned, learning, not yet learned, checked). Time is the sum of `response_ms`, so it
includes retries and holds but excludes the gaps between questions. Accuracy is
`first_try / questions`; the error count is the sum of `wrong_count`. The trend splits the
range chronologically in half and compares the first-try error rate of the two halves; each
half needs at least three questions, otherwise it says the sample is too small.

Then:

- **每天练了哪一项** (daily by skill): a matrix with dates as rows and the nine skills plus a
  total as columns. Each cell shows time and first-try accuracy, colored green at 80% or
  above, orange from 60% to 79%, red below 60%.
- **每关** (per skill): questions, total time, average time per question, first-try accuracy,
  error count, and the error-rate trend.
- **每个音** (per note): learned and learning notes, the three progress flags, questions, time,
  accuracy, errors, trend, and a **练** (review) or **继续学** (continue learning) button.
  Notes still in the 14-question first lesson appear as learning, so the new note is visible
  before it is complete.
- **第 7 关：哪些音作了比较** (skill 7 comparisons): pairs with a clef resolve to actual note
  names (e.g., C4–E4); pairs without a clef are staff positions only (e.g., first space to
  second line). Direction questions are listed separately.
- **易混音：哪些对容易混** (confusable pairs): each letter pair (e.g. A3 / C4) with questions,
  first-try accuracy, errors, and the note the child tapped first when wrong. Both directions
  of a pair are asked, so A→B and B→A can be compared.
- **练习形式** (session type): skill card, daily practice, first lesson, single-note review,
  and the new-note contrast finale, with questions, time, and accuracy.
- Pre/post tests and the adaptive-difficulty history follow.

**打印 / 存为 PDF** prints only the open report: the buttons, range switch, and the rest of the
page are hidden by a print stylesheet.

### Pre/post tests

**前测** freezes a 12-item battery and the difficulty in use at that moment. It covers keyboard
finding, staff ↔ keyboard, clef, duration, hand/finger, and lines/spaces, using only notes
that have already been taught. **后测** replays the same items with the same difficulty. Test
rows carry the battery id and are excluded from the daily accuracy and the adaptive
difficulty. The report shows overall and per-skill change in percentage points. Skills 7–9 are not
yet part of the fixed battery; their practice rows still appear in the per-skill report. The
pre/post buttons are teacher-only.

The battery needs at least two checked notes with staff positions. If a checked note has no
finger flag yet, the hand/finger item is replaced by an extra staff ↔ keyboard item, so the
battery stays at 12.

### Export, backup, import

These are teacher-only. A normal learner profile does not show them.

- **CSV** exports the current learner's log, one row per question, with a UTF-8 BOM so Excel
  opens Chinese correctly. `participant` is the internal profile id; `display_name` is the
  profile name. For sharing, use participant codes as names, or drop the name column.
- **导出全部 CSV** (teacher console) combines every learner on the device into one file with
  the same columns and a `participant` value per learner.
- **完整备份** (Full backup) in the teacher roster exports every learner, internal ID, settings,
  progress, complete event history, pre/post battery, and the roster's salted local PIN hashes.
  It excludes cloud authentication sessions. Keep this unencrypted file private.
- **恢复完整备份** (Restore full backup) validates the archive and replaces the whole roster by
  internal ID, without merging names. All state files are staged before a single roster commit;
  quota or write failures leave the active profiles intact. After restoring, use the teacher PIN
  from the backup. **导出恢复前快照** exports the previous roster and states for rollback.
  Old generations remain on this device, so restoring requires space for another full copy.
  An interrupted staging operation can leave unused copies; automatic reclamation is not implemented.
  Full-roster restore is disabled in isolated cloud tests until identity recovery is available.
- **JSON** exports the whole current profile. It does not contain the PIN.
- **导入** replaces the *current* profile with a backup, keeping the current profile's PIN.
  On a new device, create a placeholder profile first, then import.

## Layout

The play screen reads top to bottom: prompt, question, answer, empty space. The question
stage no longer absorbs the leftover height, so the answer is not pushed to the bottom edge.
The stage and the answer area follow the prompt immediately and stay top-aligned; the extra
space stays below them. The keyboard is placed by its role: in the staff → keyboard direction
it is the answer and sits below the staff; in keyboard → staff it is the question and sits
above the staff choices. The order is always question first, then options, then empty space.

On very short landscape screens (max-height 520px, such as a phone on its side) the play screen
becomes two columns: question on the left, answer on the right. The staff is sized from the
column width instead of a fixed `vh`, so neither the staff nor the keyboard is clipped.

The local keyboard in the first spotlight step shows only one black-key group. It keeps the
same key width as the full keyboard: its container is 3/15 (or 4/15) of the keyboard width and
is centered, so the black keys keep their normal proportions instead of stretching across the
screen.

In the new-note lesson, the previous keyboard question can leave one octave of the same letter
marked with a check. The next keyboard question then asks **再找一个 A** and rejects the checked
key with a spoken nudge rather than as a wrong answer. If the lesson resumes directly at that
second keyboard step and no key has been found yet, the prompt names the exact octave (**A3**)
so the target is unambiguous.

The home screen keeps the checked-note chips at the top, the daily button below them, and the
nine fixed skill cards below that. The chips are the only part that grows with the note set.
Wide screens use three card columns, tablet portrait two, and phones one.

## The nine skills

The nine cards are fixed. Each one declares which note flags it needs, so a new note joins a
skill automatically once that flag is open.

| # | Skill | Task | Needs |
|---|---|---|---|
| 1 | 找键盘 · Find the key | A big letter is shown; tap any key with that letter name | `key` |
| 2 | 谱与键 · Staff ↔ keyboard | Read a note and tap the key, or read a key and pick the staff image | `key` + `pos` |
| 3 | 谱号 · Which clef | A note is drawn on a staff with no clef; choose treble or bass | `pos` |
| 4 | 时值 · Read and hold | Read the note, choose the beat count, then find the key and hold it | `key` + `pos` |
| 5 | 手指 · Hand, finger, hold | Three stages: which hand, which finger, then hold for the note's length | `key` + `pos` + `fin` |
| 6 | 线与间 · Lines and spaces | A bare five-line staff; tap the line or space asked | none |
| 7 | 两个音 · Two notes | Two whole notes; name the direction, then tap the higher or lower note, first without and then with a clef (the prompt does not name the clef) | none |
| 8 | 加线加间 · Ledger lines | A clef and one note on a ledger line or space; fill a sentence with four dropdowns: treble/bass, above/below, number 1–8, line/space (the note name is not asked); six questions per session | none |
| 9 | 易混音 · Confusable notes | Two whole notes on one staff; tap the one the prompt names (neighbouring, third, ledger-count and mirror pairs) | none |

The clef skill uses only the checked notes. C4 brings both spellings (treble and bass) of the
same pitch. Checking D and E mixes D and E without adding an unchecked bass note. Their
correct clef can be the same while the questions still vary. Note names are balanced and
spaced apart when possible; one checked note necessarily repeats.

Skill 7 is the bridge from staff geometry to pitch. It always shows two whole notes with no
stems, so the only cue is vertical position. The first three questions, with no clef, ask for
the direction of the two notes; the answer choices are straight lines with an arrowhead, not
two noteheads, so the child reads the motion rather than comparing the notes. The next
questions ask **选出更高的音** (choose the higher note) or **选出更低的音** (choose the lower
note), answered by tapping one of them; the two wordings alternate. The last group adds a clef,
one clef per question, but the prompt still says only "choose the higher note" or "choose the
lower note"; the clef is drawn, never named. Tapping a note now also plays its pitch, so the
clef is audible as well as visible. A correct answer in skill 7 shows confetti and turns the
note green but gives no "correct" toast and no speech; the question's audio is stopped. The
skill uses no note pool and starts without any learned notes.

## New notes: a 14-question first lesson

A new note is not a new level. It is one 14-question lesson that opens three flags.
The flags unlock a skill only after the note is complete and checked:

| Flag | Meaning | Unlocks |
|---|---|---|
| `key` | Find the note on the keyboard in any octave | Skill 1 |
| `pos` | Match the staff position, clef and exact octave | Skills 2, 3, 4 |
| `fin` | Know the hand and finger | Skill 5 |

The lesson follows a fixed 3 / 2 / 2 / 2 / 2 split, then ends with three mixed items:

| Step | Task | Flag |
|---|---|---|
| 0 | Local keyboard showing the new note's black-key group; the landmark is named once | `key` (partial) |
| 1 | Full keyboard, any octave: only the letter counts | `key` |
| 2 | Full keyboard: the octave found in step 1 is checked, and the task becomes find another octave; when the lesson resumes here, the prompt names the exact octave | `key` |
| 3 | Staff + letter → keyboard: the staff fixes the octave, the letter is a scaffold | `key` |
| 4 | Keyboard → staff, options limited to the new note and its learned neighbours | `pos` |
| 5 | Which clef: the new note | `pos` |
| 6 | Which clef: a learned note written in the other clef | `pos` |
| 7–8 | Duration: read, choose the beat count, find the key and hold (quarter, half) | `key` + `pos` |
| 9–10 | Hand → finger → hold (quarter, half) | `fin` |
| 11–13 | Mixed: the new note and its learned neighbours, staff ↔ keyboard | — |

After the first eight questions (steps 0–7) the key and position flags are open; after step 13
all three are open, the note is checked automatically in **我的音**, and it joins every skill
that asks for it. The 14 questions are the acquisition phase: the note does not appear in the
daily session or skills 1–6 before it is complete. The result screen then offers
**和邻居比一比** (compare with neighbours): one contrast item per learned comparison note,
up to six. The new note is always the answer, so every item compares it with a different note
instead of repeating one pair; the session is shorter when fewer comparison notes are learned.
The home screen also shows a **下一个音** (Next note) button. The teacher or parent decides when
to start the next note.

The current order is E4, then A3, then A4, F4 and G4. A3 is the left-hand third finger in the
middle-C position and pairs with E4 (right-hand third finger). A4 falls outside the right-hand
five-finger position; for now it uses a "move the whole hand right, fifth finger on A"
convention. A dedicated hand-shift lesson is still future work. Any unlearned chip can be
tapped to start that note's first lesson, so a teacher or parent can choose A3, A4, F or G
without waiting for the **下一个音** button. The step is saved after every answered question,
so stopping halfway and coming back continues at the next question.

## Daily practice

One tap on **今日练习** builds a ten-question session from the checked notes only:

| Block | Questions | Source | Purpose |
|---|---|---|---|
| Review | 2 | The least recently seen checked notes, staff ↔ keyboard | Retention |
| Find the key | 2 | Checked notes by letter | Keyboard fluency |
| Duration | 2 | Checked notes with staff positions | Reading and holding |
| Hand and finger | 1 | Checked notes with a finger flag | Technique |
| Staff ↔ keyboard | 3 | Checked notes, error-weighted | Discrimination |

If no checked note has a finger flag, the hand/finger question becomes a fourth staff ↔
keyboard question, so the session stays at ten. Note counts are planned across the whole
session before question types are assigned, with the review prefix first. A single checked
note gives one review item and one additional staff/key item.
Older notes rotate in through the review block, so the session length does not grow with the
note set.

The daily session does not insert the current new note. To learn it, tap its chip in
**我的音** (the current new note pulses, and any other unlearned chip opens its own
first lesson); that starts the 14-question first lesson. This keeps the checked set authoritative: if
only B, C and D are checked, the daily session only asks B, C and D.

The home screen also has a row of note chips (**我的音**). A learned chip is a checkbox: tap it
to include or exclude that note in daily practice, skills 1–5, and eligible pairs in skill 9. A selected note has
a filled check; an unselected learned note stays white; the current new note pulses and opens
the spotlight; any other unlearned note is dimmed but still opens its spotlight when tapped.
A single-note review of a note and its neighbours is available from the **练** button beside
each note in the teacher report. The report also shows notes still in the spotlight as
**学习中** (learning), with a **继续学** (continue learning) button that resumes at the saved
step instead of restarting the note. The step is saved after each answered question.

## Notation conventions

| Note | Clef | Position | Hand | Finger |
|---|---|---|---|---|
| B3 | Bass | Space above the staff | Left | 2 |
| Middle C (C4) | Treble | First ledger line below | Right | 1 |
| D4 | Treble | Space below the staff | Right | 2 |
| E4 | Treble | First line (bottom line) | Right | 3 |
| A3 | Bass | Fifth line (top line) | Left | 3 |
| F4 | Treble | First space | Right | 4 |
| G4 | Treble | Second line | Right | 5 |
| A4 | Treble | Second space | Right | 5 |

A3 and A4 share the letter A, so the home chips add a small octave number (A₃, A₄) only
when a letter appears twice. A3 is the left-hand third finger of the middle-C position;
A4 is the right-hand fifth finger after the whole-hand shift.

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
| Auto | One of the three above | Follows the level | Follows the level | Follows the level |

Auto is the default. At the end of each practice session it looks at the last 20
non-test questions. At 85% first-try accuracy or better it moves up one level; at 60% or
below it moves down one; otherwise it stays. It needs at least 12 questions before the first
judgement, waits at least eight questions between changes, and does not enter Hard until 30
questions have been logged. The session's difficulty is fixed when the session starts, so
questions and tempo do not change mid-session. Each change is recorded with its date, the
accuracy that triggered it, and the two levels; the report shows the last four.

Question selection also follows the log: within a skill, notes with a lower first-try
accuracy are weighted up (up to 3×) within a per-note cap. Skill 1 balances letters; skill 3
balances note names. Weighting cannot override coverage and feasible spacing. The daily review block
still puts the least recently seen notes first.

The clef skill always has two options, treble or bass. Skill 5 runs two questions fewer
because each one takes three stages, which keeps a session at about three minutes. The daily
session asks ten questions; a new-note lesson has fourteen steps and resumes its remaining steps; they do not use the
difficulty count.

Three stars requires all but one first-try answer; two stars all but three; anything lower is
one star. Stars are stored per skill (1–9) per profile and only ever go up. The daily session
and the spotlight show stars on the result screen but do not overwrite skill stars.

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
const NOTE_ORDER = ['B3','C4','D4','E4','A3','A4','F4','G4'];
const BASE_NOTES = ['B3','C4','D4'];
```

To add a note:

1. Add an entry to `NOTES`.
   - `midi` is the MIDI number (57 = A3, 59 = B3, 60 = middle C, 64 = E4, 65 = F4,
     67 = G4, 69 = A4).
   - `y` is the staff position in staff units: line 1 = 4, space 1 = 3.5, line 2 = 3,
     space 2 = 2.5, the space below the staff = 4.5, the first ledger line below = 5.
   - `hand` (`'L'` / `'R'`) also decides the stem direction; `finger` is the digit drawn
     outside the staff (0 means no fixed fingering yet).
   - `landmark`, `keyHint` and `posHint` are the spoken and written hints.
2. Append the id to `NOTE_ORDER` in the order it should be taught. Do not put it in
   `BASE_NOTES`; that array is only for the three notes that are known from the start.
3. If the note needs a ledger line, register it in `LEDGER` under the clef, using the same
   `y` value (`LEDGER.treble.C4 = 5`).
4. Test the first lesson: the local keyboard should show only the new note's black-key group
   (F3–B3 for A3, for example), the staff steps should use the exact pitch, and the mixed
   items should offer the new note and its learned neighbours. The 14 questions come from
   `SPOT_STEPS`; a new note needs no change there.

No other code changes are needed. Skills 1–6 read `activeNotes(needs)` and pick up the
new note once it is complete and checked. Skills 7–8 use no note pool. Skill 9's card reads
the checked set; the new-note contrast finale reads all learned notes so it can vary the
comparison note.

## Adding a skill

Add one entry to `SKILLS` and one `make` function:

```js
{ id:8, key:'interval', name:'音程', title:'音程',
  desc:'两个音之间隔几步', color:'#5C6B3F',
  needs:['key','pos'], pool:'active', make:makeInterval }
```

`needs` says which note flags the skill requires; `pool` is `'active'` (learned notes),
`'fixed'` (the `ids` list) or `'none'` (no notes). `make(ids, n)` returns an array of question
objects with the same `{ kind, render(), reveal() }` interface as the existing factories.
`buildQuestions` is a registry lookup now, not a chain of `if`/`else`, so adding a skill does
not touch the note data or the other skills. `id` is also the display number and the star key;
it must stay unique, and adding a tenth card changes the home grid.

`SKILLS` also drives the home screen. The menu length is fixed at nine; new skills would be
added only when the interface has room for them.

## Roadmap

Reserved for future work. Add rows; do not rewrite finished ones.

| Item | Status | Notes |
|---|---|---|
| F4 and G4 | Shipped 2026-11-03 | Enter after A4 through the same spotlight; the chips can also be opened directly |
| A4 | Shipped 2026-11-03 | The first new note after E4, matching the method book; finger 5 with a whole-hand shift |
| Teacher role and permissions | Shipped 2026-11-03 | Teacher PIN, student roster, all reports, combined CSV; parents and students keep practice, note checks and settings |
| Hand-shift lesson for A4 | Idea | The current convention is "move the whole hand right, fifth finger on A"; a dedicated lesson is still needed |
| Note names for staff lines | Idea | Skill 6 asks where line 2 is; the next step is "line 2 is G" |
| Skill 7 in daily and pre/post | Idea | Two-note comparison is not in the daily mix or the 12-item battery yet |
| Eighth notes | Exploring | `VALUES` already drives the drawing; judging needs a faster tempo |
| More left-hand notes | Idea | B3 and A3 are the only left-hand notes, so skill 5 is still right-hand heavy |
| Skill 8 placement | Idea | The naming half is shipped; the next step is "put the note on the third ledger line above the treble staff" |
| Grand staff for skill 9 | Idea | The mirror pairs (E4/A3, D4/B3) are most visible on a two-staff system; the current version uses one staff |
| A3 treble spelling | Idea | A3 is taught on the bass staff; its treble spelling (second ledger line below) is not yet taught |
| Progress history for teachers | Shipped 2026-11-03 | Time, daily-by-skill matrix, per-skill and per-note tables, comparison pairs, error-rate trend, print/PDF |
| Adaptive question selection | Shipped 2026-11-02 | Error-weighted note pools and auto difficulty |
| Pre/post testing | Shipped 2026-11-02 | Frozen 12-item battery, same items and difficulty at post |
| Cloud sync or cross-device accounts | Idea | Would need a backend and a data-protection plan; deliberately absent |
| Account deletion | Idea | The teacher console can clear logs but cannot remove a profile |
| Teacher PIN change or recovery | Idea | The PIN can be set once; there is no change screen and no recovery |
| English interface | Idea | All strings are inline; would need a small dictionary and a switch |
| Sound check | Shipped 2026-10-29 | Settings → "试听" |
| License | Not chosen | See [License](#license) |

## Changelog

One row per user-visible change, newest first. Dates are ISO. The project is identified by
date rather than semver.

| Date | Change |
|---|---|
| 2026-11-04 | Checked-note practice now stays inside its selected pool, including D/E in skill 3. Skill 1 balances letters and daily practice plans note counts for the whole session before mixing question types |
| 2026-11-04 | Releases verify file hashes and actual Safari/Chrome loads across remote and local URLs. Per-step timeouts, failure receipts, and a process lock prevent false success and overlapping resets |
| 2026-11-04 | Skill 8 no longer repeats the same ledger position within a session |
| 2026-11-04 | `npm run release -- --local` and `--push` stamp a build, run the tests, clear Safari and Chrome caches for the remote and local origins, and print the correct test link. Settings shows the build tag |
| 2026-11-04 | Tests now sweep checked-note subsets and cover the cache reset page, so a level that collapses to one note under a non-default selection fails before release |
| 2026-11-04 | Question generators space out adjacent notes: skill 3 balances B/C/D and never shows C twice in a row (C4 and C4B count as C), and skills 2, 4, 5, 8 and 9 and the daily mix use a shared `spaceOut` pass |
| 2026-11-04 | Skill 8 always offers numbers 1–8 instead of shrinking the list to the correct position, and the session is fixed at six questions |
| 2026-11-04 | New-note progress is saved after every answered question, so leaving the 14-question lesson resumes at the next step; `npm test` now runs a Playwright smoke suite |
| 2026-11-05 | Teachers can back up and restore the full roster with a recoverable previous snapshot. Failed single-profile imports no longer claim success; missing or duplicate local sync identities pause uploads |
| 2026-11-05 | Isolated sync tests batch saved answers on a bounded ten-second window, back off on temporary failures, pause on identity/configuration errors, and support remote test pages without publishing a database key |
| 2026-11-05 | Completed answers save immediately; older records are retained beyond 8000 rows. A separate local test mode checks game-generated answers against Supabase and reports startup audio/network timing |
| 2026-11-04 | Audit pass: the keyboard sits with the question when it is the stimulus (keyboard → staff); staff choices get a distractor when only one note is checked; phones in landscape use two columns; report and metadata say nine skills |
| 2026-11-04 | Skill 8 asks only for the position: **这个音在（高/低）谱号的（上/下）加（数字）（线/间）** with four dropdowns. The note-name dropdown is gone because students do not yet know the pitch outside the staff |
| 2026-11-04 | The play screen keeps the question and answer together directly below the prompt; the keyboard is no longer pinned to the bottom edge. The new-note keyboard step marks an octave already found and asks for another A instead of silently requiring A3 |
| 2026-11-04 | New-note lesson rebalanced to 3 find-keyboard, 2 staff↔keyboard, 2 clef, 2 duration, 2 hand/finger, and 3 mixed items; finishing still opens all three flags and checks the note |
| 2026-11-04 | Skill 6 now tells a line tap from a space tap: a line needs a tap within 0.18 staff steps, so the middle of the fourth space no longer counts as the fifth line |
| 2026-11-04 | The new-note contrast finale asks the new note once against each learned note, up to six; it no longer repeats the same pair, and the note stays the answer every time |
| 2026-11-04 | Skill 9 **易混音**: two whole notes on one staff, tap the named one; neighbour, third, ledger-count and mirror pairs; both directions; the new-note result screen offers a contrast finale, and the report has a per-pair confusion table |
| 2026-11-04 | Skill 8 **加线加间**: a clef plus one ledger note; a two-step above/below and number choice; one to three ledger lines by difficulty |
| 2026-11-04 | The new-note flow is now a 14-question first lesson covering skills 1–5; key/pos open after the first eight questions, fin after step 14 |
| 2026-11-04 | A3 added: left-hand third finger, bass fifth line, taught between E4 and A4; chips add an octave subscript when a letter appears twice |
| 2026-11-04 | Fixed the letter A read as "I": Apple voices read `ay` as `eye`; the TTS map now uses `eigh`, and level 1 asks **A 音在键盘哪里？** |
| 2026-11-03 | Teacher role: a separate teacher PIN opens a student roster, creates learner profiles, opens every learner's report on the device, and exports all learners' CSV. Normal profiles keep only practice, note checks, settings, switch and lock |
| 2026-11-03 | New practice report: range switch (7/14/30/all), time on questions, daily-by-skill matrix, per-skill and per-note tables, skill-7 comparison pairs, error-rate trend, learning notes, and print/PDF |
| 2026-11-03 | Level 7 prompts now say only "choose the higher note" / "choose the lower note", even when a clef is drawn; a correct answer shows confetti and no toast or speech |
| 2026-11-03 | The spotlight's second step shows the note on the staff next to its letter, so requiring the exact octave is justified; step 3 removes the letter |
| 2026-11-03 | Note order follows the method book: E4, then A4, then F4 and G4. The next-note button points to A after E |
| 2026-11-03 | Level 7 asks for the **direction** of the two notes and uses line-and-arrow choices; the higher/lower questions alternate "which is higher" and "which is lower". The note set now runs through A4; any unlearned chip opens its spotlight |
| 2026-11-02 | Level 7 **两个音**: two whole notes with no clef, first up/down/repeat, then tap the higher note; the last group adds one clef per question and plays the tapped pitch |
| 2026-11-02 | Learner profiles with a four-digit local PIN, per-profile progress and a per-question practice log; parent report, CSV/JSON export, backup import, and a frozen pre/post battery |
| 2026-11-02 | **我的音** chips are checkboxes: all skills and the daily session use only the checked notes; the daily session no longer inserts the current new note automatically |
| 2026-11-02 | The keyboard is docked at the bottom in every question; in the keyboard → staff direction the answer cards sit directly above it |
| 2026-11-02 | Auto difficulty and error-weighted question selection; the daily session now mixes find, duration, hand/finger, and staff ↔ keyboard |
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
├── sw.js                 offline cache; cache name is written by the release script
├── clear-cache.html      origin-scoped cache reset page used by the release script
├── AGENTS.md             development and release requirements
├── release.json          generated build ID and SHA-256 file manifest
├── scripts/release.mjs   build stamp, tests, commit/push, cache clear, load receipts
├── scripts/release_integrity.mjs  shared file-integrity checks
├── scripts/local_server.mjs       no-store server and loopback receipt service
├── scripts/pages_refresh.mjs      remote Pages rebuild, without pushing local code
├── tests/smoke.mjs       Playwright regression test
├── package.json          npm test / release / cache scripts
├── icon.svg, icon-*.png  icons (180 is full-bleed for iOS, 192/512 are masked)
├── og-cover.png          link-preview image referenced by og:image
├── serve.sh              local static server for development
└── README.md             this file
```

## Running locally

```bash
bash serve.sh          # serves on 8765
bash serve.sh 8080     # another port
npm run release -- --local   # the full local test flow
```

`serve.sh` prints two addresses: `http://127.0.0.1:8765/index.html` for this Mac, and
`http://<Mac LAN IP>:8765/index.html` for the iPad on the same Wi-Fi. Closing the lid or the
terminal stops it.

### Release, cache, and the test link

The pipeline distinguishes built files, verified server files, and verified browser loads.
Only the last state is test-ready.

```bash
npm run build                           # stamp build + release.json; no tests or browser actions
npm run release -- --local              # tests + local server + both browsers, local and remote URLs
npm run release -- --local --local-only # explicitly verify local URLs only; remote remains unchecked
npm run cache                           # repeat cache clearing/load checks, without rebuilding
npm run cache -- --local-only            # local browser cache/load checks only
npm run verify:remote                    # compare all remote file hashes with the local release
npm run pages:refresh                    # read-only plan for rebuilding remote main
npm run pages:refresh -- --execute        # rebuild remote main; does not push local changes
npm run release -- --push                # authorized push, wait for all remote files, clear/load checks
```

The development server uses `Cache-Control: no-store`. Its source hash identifies the running
server, so an old server or a different project cannot pass the readiness check. Stop an old
server or choose `--port`; the command does not kill unknown processes.

`release.json` contains SHA-256 hashes for the game, service worker, reset page, manifest and
icons. Server verification fetches every file using a fresh URL. Browser reset unregisters only
this game's service worker, deletes its offline caches, refreshes and hashes all release files,
and then opens `index.html?build=...`. The game refuses a mismatched build.

The loaded game acknowledges its actual build through a short-lived loopback navigation
receipt. Each browser/origin gets a different random receipt. This avoids AppleScript tab
reading, browser JavaScript automation settings, CORS and background HTTPS-to-localhost fetches.
The local server stores receipts in memory for ten minutes and accepts receipt API requests
only from loopback. It redirects back to the verified game URL after acknowledgement.

Each target is opened and acknowledged before the next one, avoiding Safari background-tab delays. The transient verification page defers service-worker registration until it redirects to the normal game page. Reset steps have bounded timeouts and failure receipts. An atomic process lock prevents overlapping runs from racing or overwriting status.

The normal scope is Safari + Chrome × GitHub Pages + 127.0.0.1 + localhost. All six targets must
acknowledge before success. `--local-only` explicitly limits this to four local targets.
`--no-open` only prepares URLs and records `prepared`, never `ready`. Missing files, old CDN
bytes, failed loads and timeouts fail the full pipeline instead of silently succeeding.
Machine-readable results are stored in gitignored `.release/status.json`; runtime receipts
are not committed. Learner accounts, selection, progress and records in localStorage are preserved.

GitHub Pages has build/status APIs, not a documented site-CDN purge endpoint. The rebuild
command uses the official Pages build API for the configured legacy main/root source and
then verifies the remote release. It never deletes Actions caches or pretends to purge a CDN.
When setting up a new deployment, publish the pipeline files before expecting remote verification to work.
[GitHub's Pages API](https://docs.github.com/en/rest/pages/pages) documents the rebuild behavior.

Commit feature changes before `--push`. The release command only auto-commits generated
`index.html`, `sw.js` and `release.json`, avoiding unrelated work. Hand over the local link for
an unpushed version, or the remote link only after its files and browser loads are verified.

## Tests

The app needs no compilation or runtime dependencies. `npm run build` stamps the release
metadata; regression tests run separately:

```bash
npm install
npm test
```

It uses `playwright-core` with the system Google Chrome, starts a temporary static server,
seeds a test profile in `localStorage`, and checks: nine home cards; 13 question types at four
viewports with no clipping or horizontal scroll; a single checked note still gets two
keyboard → staff choices; a new-note lesson resumes at the saved step and opens all three
flags; the report has nine skill columns; the console stays clean; every checked-note subset
is audited across all 255 nonempty selections, three difficulties, two answer histories, and three fixed seeds (45,900 sessions across nine skills and daily practice); and `clear-cache.html` removes only this
game's caches and keeps `localStorage`. The main context blocks service workers so it always
runs the working copy; the cache test uses a separate context that allows them and checks controlled navigation, cache isolation, offline recovery, and HTTP failure receipts.

## Deploying

The site is served by GitHub Pages from the `main` branch, repository root.

```bash
npm run release -- --push
```

The script runs the tests, writes a content-based build tag into `index.html`, updates the cache
name in `sw.js`, commits generated release files, pushes, and polls all remote release files
until their hashes match. It then
clears the browser caches and prints the remote link. If the poll times out, the command fails and does not hand over an unverified remote test link; the push itself may already have succeeded.

- Pages HTTP caching is checked through actual file hashes and a fresh request URL; the local server sends `Cache-Control: no-store`.
- Free accounts can only publish Pages from a public repository, so both the repository and
  the site are public.
- The page carries `noindex, nofollow, noarchive`: search engines will not index it, but
  anyone with the link can still open it.
- Do not bump the cache name by hand. `npm run release` derives it from the page content;
  a manual edit is overwritten at the next release.


## Credits

The treble clef is `Treble clef.svg` by Tlusťa, and the bass clef is `Clef Bass (F).svg`,
both from Wikimedia Commons and in the public domain. Both paths are inlined in
`index.html`; nothing is fetched at runtime.

The cartoon hands, keyboard, and cover image were drawn for this project.

## License

No license has been chosen yet. Until one is added, the code is public for reference but not
licensed for reuse. If this changes, add a `LICENSE` file and replace this section.

## Known limitations

- Some iPad users report intermittent audio on first launch after clearing the game cache.
  This is under investigation; adding a loading screen has not yet been implemented or verified.

- The page cannot tell which finger was used. Skill 5 asks which finger and shows the right
  picture, but the actual hand position still has to be checked on the piano by an adult.
- Holding is judged by duration only, not by which finger pressed. In skill 5 the hand and
  finger are checked before the key is pressed, not while it is held.
- The clef skill strictly follows checked notes. If they share a clef, the correct answer
  stays the same while note content varies. It does not teach the general register rule: middle C is legal in both clefs, and one
  pitch can be written more than one way.
- Skill 6 uses the clef as a distractor: the second half shows one but never names it, and
  the answer is the same in either clef. The other lines and spaces come later.
- A4 is introduced before F4 and G4 with finger 5, but the shift itself is not taught. The
  current convention is "move the whole hand right"; a dedicated hand-position step is still
  missing.
- F4 is 4 and G4 is 5 in the right-hand C position. The game does not check the actual
  finger, and it does not yet teach a new hand position.
- B3 is the only left-hand note. Skill 5 is therefore right-hand heavy; the left-hand
  contrast is weaker than it should be once the set grows.
- Stars, checked notes, progress and the log are per profile but still per device
  (`localStorage`); clearing website data erases every profile. Export a JSON backup before
  clearing browser data.
- The teacher roster reads only the profiles on this device. There is no cloud sync and no
  cross-device merge; a teacher with several devices has to collect CSV files or JSON backups.
- The teacher PIN has no recovery and no change screen. Forgetting it leaves the learner data
  readable only by clearing site data or by using developer tools.
- The report's time figure is the sum of per-question response times. It includes retries and
  holds but excludes the gaps between questions; a question left on screen while the child
  walks away will inflate its time. The trend is descriptive and does not test significance.
- Per-note counts merge skill 1's letter-only questions into the note with that letter, so an
  F tapped in any octave counts toward F4. The report says so under the per-note table.
- The PIN is a local switch guard, not encryption. A four-digit PIN has little strength, and
  the hash protects only against casual reading. Anyone with the unlocked device and developer
  tools can read the log.
- The log is limited by browser storage capacity. Export regularly; a full browser store can
  prevent new saves. Cloud sync is an explicitly enabled isolated test feature and is not enabled for learners.
- A profile JSON covers one learner; use the teacher console's full backup for a restorable
  whole roster. Combined CSV is a research export and does not restore progress or PINs.
- The test battery is frozen at pre-test. If the child learns new notes before the post-test,
  those notes are not tested, which is the point of a paired comparison but means the post-test
  does not describe the full current note set.
- Test accuracy and practice accuracy are reported separately. Test rows are excluded from the
  adaptive difficulty and the practice report's daily matrix and trend.
- The report and exports show timestamps in the device's local time and store the UTC time;
  moving a device between time zones can put one session on two local dates.
- On iOS, the side switch mutes Web Audio as well. Use Settings → "试听" to tell a muted
  device from a broken page.
- Speech depends on installed system voices: Chinese text uses a Chinese voice, while the
  letters B / C / D / E are spoken by an English voice as letter names. Without the voices
  the page falls back to text only.
- In landscape the staff scales to fit the height, so it looks narrower than on paper.
