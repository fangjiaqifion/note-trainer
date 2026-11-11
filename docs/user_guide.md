# Note Trainer User Guide

Last updated: 2026-11-11

Detailed product behavior and usage. Start with [the overview](../README.md) for purpose
and quick start. Contributor procedures are in [development.md](development.md).

## Learner profiles, the teacher role, and data

A profile is a separate `localStorage` record: checked notes, progress flags, stars, settings,
the current new note, the frozen pre/post battery, and the practice log. The account roster
holds the names, colors, and salted hashes of the learner PINs, plus the teacher PIN hash.
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

### Optional cloud classes and recovery

Teachers can open **云端管理** to enroll a class with an administrator-issued one-time code,
back up and bind a learner, and issue recovery codes. Students can restore only their own
profile; researchers receive readonly class access. Roles are checked by database permissions.
Cloud report JSON exports include both workspace and learner UUIDs, so identical participant
codes in different classes remain distinct. The server stores recovery-code hashes, not the codes or local PINs. Codes expire after a year,
can be revoked, and permit up to ten devices. Individual device access can also be revoked.

Completed answers are saved locally before bounded batches of up to fifty records are uploaded.
Retries keep their UUIDs. Progress uses revision checks: concurrent changes pause instead of
automatically overwriting another device. Restoring cloud progress retains a local snapshot
and merges locally pending answer records. Storage failures pause question advancement and
allow an emergency backup. Cloud-bound logs cannot be cleared or replaced by a profile import.

Teachers can export a consistent class disaster-recovery archive; restore is administrator-only
and refuses to overwrite an existing class. Browser exports are limited to 50,000 answers and
25 MiB of event payload; larger archives require an administrator database dump. Keep recovery
codes and backups offline. Local browser storage is unencrypted, and shared devices holding a
teacher session should be trusted. See [Cloud operations](cloud_operations.md).

### Practice log

One row is written when a question is finally answered correctly, not on every tap. A row
contains:

| Field | Meaning |
|---|---|
| `event_seq` | Local monotonic counter, retained local sequence |
| `cloud_workspace`, `cloud_participant`, `event_id` | Stable cloud class, learner and answer IDs for cross-device joins; empty for older unbound records |
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

- **每天练了哪一项** (daily by skill): a matrix with dates as rows and the eighteen skills plus a
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
  opens Chinese correctly. `participant` is the local profile id; `display_name` is the
  profile name. Cloud-bound exports add `cloud_workspace`, `cloud_participant`, and `event_id`
  for stable cross-device joins and deduplication. For sharing, use participant codes as names, or drop the name column.
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
eighteen fixed skill cards below that. The chips are the only part that grows with the note set.
Wide screens use three card columns, tablet portrait two, and phones one.

## The eighteen skills

The eighteen cards are fixed. Each one declares which note flags it needs, so a new note joins a
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
| 8 | 加线加间 · Ledger lines | A clef and one note on a ledger line or space; fill a sentence with compact dropdowns with clef glyphs, direction arrows, Arabic 1–8, and line/space diagrams (the note name is not asked); six position questions plus selected-note review | none |
| 9 | 易混音 · Confusable notes | Tap the named checked note; alternate available familiar clefs and vary pairs | `pos` |
| 10 | 加线定位 · Ledger placement | All tiers: place a note at one requested staff line/space, then five requested ledger lines/spaces; drag or tap and confirm | none |
| 11 | 卡牌配对 · Card matching | Match face-up name/key, name/staff, key/staff, and duration/beat pairs in at least four rounds, adding rounds for coverage; each representation stays in its own left/right column | `key` + `pos` |
| 12 | 三音辨认 · Three-note recognition | Three shuffled checked notes, preferring nearby pitches; tap the requested letter. Mixed-clef pitches use separate familiar staff images | `pos` |
| 13 | 三音弹比 · Play and compare | Play three checked pitches on the screen keyboard from left to right, then tap the highest or lowest note. Similar adjacent and ledger pitches receive priority; requires three eligible pitches | `key` + `pos` |
| 14 | 大谱表弹比 · Grand staff | Play three selected notes from left to right on a braced treble/bass staff, then choose the highest or lowest | `key` + `pos` |
| 15 | 闪现记音 · Flash recall | View numbered notes for two seconds, then choose a hidden note’s position. Start with five two-note questions, then three-note questions when available | `pos` |
| 16 | 节奏填空 · Rhythm completion | Complete six measures using quarter, half, dotted-half, or whole notes; read the time signature | none |
| 17 | 选择拍号 · Choose the meter | Read two complete measures and choose 2/4, 3/4, or 4/4; six questions | none |
| 18 | 变形键盘 · Deformed keyboard matching | Find one displayed note on each of eight keyboard shapes; name targets accept any octave | key + pos |

Every eligible checked pitch appears in each pitch-based skill session. Skills 16–17 are independent of pitch selection. Base question counts may grow.
Position skills 6–8 and 10 keep their original exercises and add checked-note staff/key
review. Matching rounds rotate the selected pool and add a small round when needed.
Skill 9 uses one clef if only one has a legal pair; unpairable notes receive staff/key
review. Skill 12 similarly reviews smaller pools without inventing extra notes.


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

Skills 12–15 use enlarged notation. Skill 12 keeps comparisons within one clef
until the final three questions; mixed clefs appear only in that finale when the
selected pool permits. A clef with only two eligible pitches uses a pair. Skills
13–14 explain left-to-right playing once per session, then say “弹出这三个音”.
Comparison prompts say “点出最高的音” or “点出最低的音”. Skill 15 uses matching
black-and-white cartoon number badges for observation and answer choices.

Skill 17 says “选择对应的拍号”. Its two measures have a dividing barline
and an ending barline, with no barline before the first note.

Skill 18 has eight single-note questions, including ring, oval, rainbow, wave,
ribbon, slopes, and zigzag keyboards. Each question shows one note and one
keyboard. Tap the matching key directly. Name targets show only A–G and accept
the same letter in any octave; staff targets require the displayed pitch.
The middle-C label anchors staff questions. Key order and complete black-key
groups stay consistent. Black keys are at the upper/back portion of white keys;
on radial keyboards that is the outer edge, with white fronts extending inward.

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
| 4 | Keyboard → staff, options limited to the new note and its learned neighbors | `pos` |
| 5 | Which clef: the new note | `pos` |
| 6 | Which clef: a learned note written in the other clef | `pos` |
| 7–8 | Duration: read, choose the beat count, find the key and hold (quarter, half) | `key` + `pos` |
| 9–10 | Hand → finger → hold (quarter, half) | `fin` |
| 11–13 | Mixed: the new note and its learned neighbors, staff ↔ keyboard | — |

After the first eight questions (steps 0–7) the key and position flags are open; after step 13
all three are open, the note is checked automatically in **我的音**, and it joins every skill
that asks for it. The 14 questions are the acquisition phase: the note does not appear in the
daily session or skills 1–6 before it is complete. The result screen then offers
**和邻居比一比** (compare with neighbors): one contrast item per learned comparison note,
up to six. The new note is always the answer, so every item compares it with a different note
instead of repeating one pair; the session is shorter when fewer comparison notes are learned.
The home screen also shows a **下一个音** (Next note) button. The teacher or parent decides when
to start the next note.

The current order is E4, then A3, then F4, G4 and A4. A3 is the left-hand third finger in the
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
to include or exclude that note in daily practice and skills 1–5 and 11. A selected note has
a filled check; an unselected learned note stays white; the current new note pulses and opens
the spotlight; any other unlearned note is dimmed but still opens its spotlight when tapped.
A single-note review of a note and its neighbors is available from the **练** button beside
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

In this game, stem direction is used as a hand cue: right hand up, left hand down.
This is a local teaching convention, not a general rule of music notation. The fingering digit sits
outside the staff, on the far side from the note. This follows the fingering presentation used in the accompanying beginner materials;
transfer to other scores has not been demonstrated. Middle C has a second legal spelling, on
the first ledger line above the bass staff; it is `C4B` in `NOTES` and appears only in the
clef skill.

The digit is drawn in the same color as the ring on the cartoon hand, so "the 2 on the
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
judgment, waits at least eight questions between changes, and does not enter Hard until 30
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

## Known limitations

- Sound diagnostics are available for piano, Chinese speech, and letter speech. One user
  confirmed all three on iPad at first launch, after backgrounding, and after lock-screen
  return. The OS and Safari/home-screen mode were not recorded; broader compatibility
  and fully offline/mute scenarios remain unverified.

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
- B3 and A3 are the current left-hand notes. Skill 5 remains right-hand heavy.
- Stars, checked notes, progress and the log are per profile but still per device
  (`localStorage`); clearing website data erases every profile. Export a JSON backup before
  clearing browser data.
- The local teacher roster lists this device. The separate cloud panel lists the authorized
  class and provides recovery, readonly researcher reports, and deidentified exports.
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
  prevent new saves. Cloud sync is enabled only after a teacher explicitly backs up and binds each learner.
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
