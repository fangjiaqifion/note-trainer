# Skills and Note-Set Design

Last updated: 2026-11-11

Internal instructional-design reference, maintained in English. The README introduces
the product; AGENTS owns technical constraints; the progress tracker owns implementation
status. Update this record and the implementation together when design changes. If they
disagree, investigate and reconcile them rather than treating an unimplemented plan as fact.
This revision corrects stale retention, selected-pool, cache, and cloud statements using
the existing implementation/acceptance records; it does not introduce a new teaching design.

## Overview

The skill axis is fixed at fifteen cards. The note axis grows through
B3 → C4 → D4 → E4 → A3 → A4 → F4 → G4. Learned notes can be checked or unchecked.
A temporary 14-question first lesson introduces each new note and resumes after interruption.
Per-question logs support descriptive reports and adaptive choices; they are not independent
measures of mastery. Teachers manage profiles/reports; learners and parents share limited
practice access. Cloud roles are separately authorized.

| Module | Purpose | Entry |
|---|---|---|
| My notes chips | Checked pool, learning note, and unlearned notes | Home top |
| Daily practice | Ten review/key/duration/finger/staff items | Main home button |
| Thirteen skill cards | Practice one skill | Home cards |
| First lesson | Fourteen new-note items | Any unlearned chip |
| Single-note review | Six items using the note and neighbors | Teacher report review button |
| Next note | Adult chooses when to expand the set | Home footer |
| Teacher roster | Create profiles, seven-day summaries, reports, combined export | Profile picker |
| Parent panel | Switch or lock | Home footer |

## Data model and learning flags

`NOTES` stores each note's MIDI pitch, clef/staff y, hand/finger (`0` means unspecified),
keyboard landmark, and key/position hints. `NOTE_ORDER` controls introduction order;
`BASE_NOTES` are B3/C4/D4. C4B is the alternate bass-clef spelling of C4, not a queue note.

A3 is bass fifth line, left finger 3 in middle-C position (1=C4, 2=B3, 3=A3), paired
conceptually with E4/right finger 3. Duplicate A letters show octave subscripts on chips.
A4 is outside the right-hand C position; the current convention moves the whole hand
right with finger 5 on A. A dedicated shift lesson remains unresolved. F4/G4 return to
right-hand C position. The sequence follows the accompanying method book.

| `S.progress` flag | Meaning | Skills opened |
|---|---|---|
| key | Find the letter on any octave of the drawn keyboard | Find key |
| pos | Connect staff position, clef, and exact octave | Staff/key, clef, duration |
| fin | Identify the configured hand/finger | Hand/finger |

Flags open in stages during the lesson. Base notes always count as learned.
Completion flags indicate exposure through the lesson, not demonstrated mastery.

### Legacy state and accounts

The old `bcd-piano-game-v2` state migrates into the first account and is retained read-only.
Old stars 1–6 map to the first six cards. An old `stars[7]` represented the E lesson:
upgrade completes E4 flags and removes that star before the new skill 7 is used.
`S.level7` marks migration; `legacyE4` is temporary. Imported old backups take the same
upgrade path, including the older `layout !== 2` star migration.

`S.spot` is undefined before initialization, an object during a lesson, or null when
complete. Missing legacy selection defaults to all learned notes; intentional deselection
is preserved. Migration now retains events, autoHistory, and batteries and corrects counters.

The roster uses `nt.accounts.v1`; ordinary state uses `nt.state.<id>.v1`, with generation
storage used by full-roster restore. Every profile owns selections, flags, stars, settings,
current lesson, frozen battery, and log. Local four-digit PINs use salted FNV-1a hashes:
they prevent accidental switching, not data access by someone with developer tools.
One unlocked profile opens directly; otherwise show the picker and require the profile PIN.
Teacher mode is not persisted. Viewing a learner as teacher does not update lastActiveAt.
Local teacher controls manage reports/tests/exports; cloud roles use server permissions.

Completed correct answers create one row, including sequence, UTC/local time, session,
phase, mode, skill/kind, pitch/letter/value/clef/position, difficulty, first-try result,
wrong attempts, response time, and battery ID. Skill 7 additionally records relation,
positions, higher note, ask, and target; skill 9 records pair and first wrong choice.
First-try accuracy = first-try successes / completed questions; error rate = 1 − accuracy.
Tests are excluded from ordinary accuracy and adaptation. Save immediately after completion.
There is no longer an 8,000-event trim; capacity and long-term retention remain bounded
by browser storage. Full-roster backups and explicit cloud binding supplement local storage.
Infrastructure procedures belong in the cloud/development docs, not this design record.

### Selected notes

Learned chips toggle selection; at least one remains checked. Completing a lesson checks
the note automatically. A current/unlearned chip opens its first lesson rather than toggling.
Skills using named notes take checked ∩ learned ∩ required flags. Skill 3 honors selection;
C4B is the same pitch as checked C4, not an unchecked contrast target. Skills 6–8 use
abstract positions with selected-note staff/key review; skills 9 and 12 use checked
pitches; skill 10 uses placements with selected-note review. Skills 11 and 13 use
checked key+pos notes. A distractor card
in skill 2 may use a base note when only one target is checked; it does not expand targets.

### Adaptation and scheduling

Auto difficulty uses the last 20 non-test answers at session end: ≥85% moves up one tier,
≤60% moves down, otherwise unchanged. Require 12 answers before the first decision, eight
between changes, and 30 before Hard. Freeze difficulty for the session. Log decisions;
the report shows the last four.

Within eligible pools, weaker notes may receive up to 3× weight; fewer than four observations
uses weight 1. Coverage caps and feasible spacing take precedence. Skill 1 balances letters;
skill 3 balances note names. Plan counts before ordering with `spaceOut`. Daily review uses
least recently practiced notes. One target necessarily repeats; multiple targets should
not be adjacent when spacing is feasible. Weights cannot manufacture unchecked targets.

## Thirteen skills

Counts below are base counts for Easy / Normal / Hard. Every eligible checked pitch
must appear; sessions grow as needed. Position skills 6–8 and 10 append a staff/key
review of each checked pitch. Skill 1 covers letter names across octaves.

| # | ID | Task | Prerequisites/pool | Count |
|---|---|---|---|---|
| 1 | findKey | Letter → any matching key | checked key | 8 / 8 / 10 |
| 2 | staffKey | Staff ↔ exact key/octave | checked key + pos | 8 / 8 / 10 |
| 3 | clef | Choose clef for named note | checked pos; C4B allowed for C4 | 8 / 8 / 10 |
| 4 | beats | Read value, find key, hold | checked key + pos | 8 / 8 / 10 |
| 5 | play | Hand → finger → hold | checked key + pos + fin | 6 / 6 / 8 |
| 6 | spot | Tap numbered line/space | abstract staff | 8 / 8 / 10 |
| 7 | twoNotes | Direction and relative height | abstract staff | 8 / 8 / 10 |
| 8 | ledger | Name ledger position | fixed position tasks plus checked-note review | 6 / 6 / 6 |
| 9 | contrast | Tap named note with alternating available clefs | checked familiar spellings, varied pairs | 8 / 8 / 10 |
| 10 | ledgerMove | Place one staff note, then five ledger notes | abstract positions | 6 / 6 / 6 |
| 11 | matching | Match face-up representations and durations | checked key + pos | 4 rounds minimum, extra rounds for full coverage |
| 12 | threeNotes | Tap the named note among three adjacent notes | checked triples, familiar staff images | 8 / 8 / 10 |
| 13 | playThree | Play three pitches, then choose the highest/lowest | checked key + pos; nearby, ledger, and familiar bass comparisons | 8 / 8 / 10 |
| 14 | grandThree | Play and compare three notes on a braced grand staff | checked key + pos | 8 / 8 / 10 |
| 15 | flashNotes | Two-second numbered-note recall | checked pos; two notes required | 10 |

### Skill behavior

1. **Find key:** show a capital letter and keyboard; any matching white key is correct.
   Balance selected target letters and avoid feasible adjacent repetition. After enough
   mistakes outline matching keys. `LETTER_SAY` uses `eigh` for A because Apple's voice
   pronounced `ay` like /aɪ/. Verify /eɪ/ audibly on Mac/iPad when changing speech.
2. **Staff/key:** half staff→exact octave, half key→staff. Staff examples are quarter
   notes, not duration tests. Choose three examples, two on Easy, with a base-note
   distractor if needed. The question keyboard sits above the answer staff cards.
3. **Clef:** draw no clef initially, name the note, choose treble/bass, reveal after success.
   C4 permits treble/bass spellings. D/E must both occur when checked, even though both
   answers are treble. Balance names before spellings; C4/C4B count as the same name for
   spacing. Do not add unchecked notes just to force both answer categories.
4. **Duration:** every third item includes a reverse shape question such as identifying
   a half note. After choosing beats, independently find/hold the key; no target-key
   highlight or advance beat grid. Release tolerance is 0.3 beat early / 0.62 late.
5. **Hand/finger/hold:** three stages; quarter, half, and dotted-half values only because
   whole notes have no stem cue. Stem direction is a game-specific hand convention,
   not a general notation rule. `balanceHands` includes a left-hand item when eligible.
6. **Lines/spaces:** first no clef, then a clef as distractor. A tap within 0.18 staff-line
   spacing counts as a line; other taps are spaces. Error hints identify actual and target
   positions, avoiding the former fourth-space/fifth-line misclassification.
7. **Two notes:** whole-note heads within the five staff lines, no ledgers. Three ordered
   groups introduce one condition at a time: direction (up/down/repeat once each, using
   line-arrow icons); higher/lower without clef; then higher/lower with alternating clefs.
   Alternate asks and balance sides. Tap either staff half, not only the notehead. With
   clef, tapping plays pitch; after two mistakes play the pair low-to-high. Correct feedback
   is visual confetti/green heads only, with `quiet:true` also stopping ongoing speech.
   Never name the clef in the higher/lower prompt. Center the pair in available staff space.
   Eight items split 3+2+3; ten split 3+3+4. Direction always has three options. Pool is
   `'none'`. This skill is absent from daily practice and the frozen pre/post battery.
8. **Ledger positions:** use compact dropdowns showing clef glyphs, direction arrows, Arabic numbers 1–8,
   and line/space diagrams. Only the number menu uses a native select; symbol menus use
   the shared clef SVG and position diagrams so options require no text reading. All four fields must be set; wrong answers remain
   editable. Six unique positions cover both clefs and both directions. Easy/Normal reach
   two ledger lines; Hard reaches three. Read the complete correct position after success.
9. **Confusable notes:** cover every eligible selected target. Alternate treble and bass
   whenever both contain a legal pair; randomize the first clef and reserve enough slots
   for exclusive targets. Middle C may use either familiar spelling. Choose distractors
   with pair-use penalties and proximity preference, avoiding consecutive reversed pairs
   when alternatives exist. Neither tier adds unchecked or unfamiliar ledger pitches.
   An unpairable selected note receives staff/key review; a one-clef pool uses that clef.
10. **Position placement:** all tiers contain six placement questions. First hear/read a
    requested line or space inside the treble or bass staff. The remaining five request
    ledger lines/spaces above or below a staff, covering both clefs and directions.
    Drag or tap to place the note, then confirm; arrow keys move by half a staff step.
    Easy/Normal reach two ledger lines; Hard reaches three. Retries preserve the request.
11. **Card matching:** at least four rounds pair name↔keyboard, name↔staff, keyboard↔staff, and duration↔beat count.
    Each round fixes one representation in the left column and the other in the right,
    shuffling the two columns independently. Students select one card from each side;
    selecting another card on the same side changes the selection without an error.
    Keyboard cards scale the entire standard keyboard, preserving its key aspect ratios,
    borders, corners, black-key proportions, and middle-C landmark. All cards start face up. Selected cards are outlined, successful pairs stay marked,
    and mismatches remain visible after feedback. Easy uses up to two checked pitches per round; Normal/Hard up to three.
    Rotate the entire selected pool across rounds; add a round if the first three pitch
    rounds cannot cover it before the duration round. One checked
    pitch remains playable. Name cards match letters across octaves; keyboard↔staff requires
    the exact pitch. One completed round produces one answer row; mismatches count as errors.
12. **Three-note recognition:** draw three distinct checked notes, favor nearby pitches
    and similar line positions while ensuring all selected pitches appear in the session.
    Randomize horizontal order and ask “请问这三个音中哪个是 E？” (substitute target).
    Speak only “找出 E 音” while retaining the complete written prompt.
    Use one staff for familiar common-clef triples; otherwise show three familiar staff
    cards. With fewer than three selected notes, use staff/key review of those notes.
13. **Play and compare three notes:** favor nearby pitches and similar line positions,
    including treble A3/C4/E4. Alternate mixed groups with familiar separate
    bass/treble cards so selected bass pitches retain bass-clef practice. Every selected pitch appears in a trio during the session.
    First play the exact three pitches on the on-screen keyboard from left to right.
    Wrong keys do not advance the sequence; selecting an extreme is unavailable until
    all three are correct. Then alternate highest/lowest requests and tap a displayed
    note. Count one completed question, retaining mistakes from both phases. A hint
    identifies the next required key or the requested extreme. Require three distinct
    eligible notes; do not manufacture unchecked pitches for smaller pools.

14. **Grand-staff play and comparison:** use the skill 13 play-then-compare sequence,
    displaying both clefs, a brace, and three notes ordered horizontally across the
    two staves. Use each selected pitch’s familiar clef. Do not invent unchecked bass
    pitches when the selection contains only treble pitches.
15. **Flash recall:** show numbered staff cards for 2,000 ms with no answer buttons,
    then hide the notes and offer numbered choices. Questions 1–2 ask which is higher;
    questions 3–5 ask for a selected target letter, including D when selected. From
    question 6, show three notes if available. Otherwise retain two notes. Distinguish
    same-letter octaves in target wording. Switching questions invalidates old timers.

## Note queue

| Note | Keyboard landmark | Staff position | Hand/finger | Comparison notes |
|---|---|---|---|---|
| B3 | Right of three black keys | Bass space above | Left 2 | C4 |
| C4 | Left of two black keys | Treble first ledger below | Right 1 | B3, D4 |
| D4 | Between two black keys | Treble space below | Right 2 | C4, E4 |
| E4 | Right of two black keys | Treble first line | Right 3 | D4, F4 |
| A3 | Between black keys 2–3 of a three-key group | Bass fifth line | Left 3 | B3, C4 |
| A4 | Between black keys 2–3 | Treble second space | Right 5 after hand shift | G4, B4 |
| F4 | Left of three black keys | Treble first space | Right 4 | E4, G4 |
| G4 | Between black keys 1–2 | Treble second line | Right 5 | F4, A4 |

Listed comparison relationships do not authorize adding unlearned/unchecked targets.

## New-note first lesson

`SPOT_STEPS` defines fourteen items: three key, two staff/key, two clef, two duration,
two hand/finger, and three mixed review items.

| Step | Task | Exposure/flag |
|---|---|---|
| 0 | Local keyboard black-key group and landmark | partial key exposure |
| 1 | Full keyboard, any octave matching letter | key exposure |
| 2 | Find another octave; preserve prior checked key | key exposure |
| 3 | Staff + capital letter → exact keyboard pitch | key exposure |
| 4 | Keyboard → staff, new note and learned neighbors | pos exposure |
| 5 | New-note clef | pos exposure |
| 6 | Learned note in opposite clef | pos exposure |
| 7–8 | Quarter/half duration and hold | key + pos |
| 9–10 | Hand/finger and quarter/half hold | fin exposure |
| 11–13 | Mixed staff/key, new note and neighbors | integration |

After steps 0–7, open key/pos; after fourteen completed items, open fin and select the note.
`recordAnswer` advances the saved step each time; completion is saved before the result
screen. Flags reflect completed exposure, without a first-try accuracy gate.

In step 2, tapping the already-found key prompts another key without counting an error.
Only a resumed step without a previous found key names the exact octave. Step 3 keeps
the letter as a scaffold but asks the learner to follow the score; step 4 removes it.
The local keyboard shows one black-key group at normal key proportions: a responsive width of up to 80 CSS pixels per white key. A3 uses F3–B3, A4 F4–B4. Do not stretch keys to fill the screen.
Speech puts letter before landmark, joins short clauses with commas, and strips isolated
punctuation to avoid speaking a full-stop character. Display text is unchanged.

The incomplete new note is not inserted into checked-note skills or daily practice.
`spotlightPool` explicitly includes it and neighbors for mixed lesson steps. The optional
finale compares it once with each learned comparison note, at most six, without repeating
one pair to fill a quota. Any unlearned chip can start its lesson out of queue order.

## Daily practice

| Block | Count | Source |
|---|---|---|
| Review | 2 | Least recently practiced checked notes, staff/key |
| Find key | 2 | Checked letters |
| Duration | 2 | Checked notes with positions |
| Hand/finger/hold | 1 | Checked notes with fingering |
| Staff/key | 3 | Eligible checked notes with error weighting |

Total ten. Without eligible fingering replace that item with staff/key. With one checked
note there is one review item plus an extra staff/key item. Keep review first and plan
note counts across the whole session before assigning/mixing question types. `staleNotes`
uses `S.lastSeen`; a larger note set does not lengthen the session. Never insert a current
unlearned note automatically.

## Reports and home interaction

Teacher-only report entries: roster report button, teacher panel inside a learner profile,
and pre/post results. Ordinary parent/learner panels expose only switch/lock, practice,
selection, and settings; teacher mode exposes reports, tests, exports, backup, and clearing
where permitted. Bound-cloud logs cannot be cleared or overwritten by profile import.

Report range is 7/14/30 days or all, default seven; tests/adaptation remain all-time.
Time is summed question response time including retries/holds, excluding gaps. Accuracy
is first-try success/completed questions; errors sum retries. Trend compares chronological
halves with at least three questions each. These are descriptive, not significance tests.

Sections: summary, date×skill matrix, per-skill/per-note tables, skill-7 pairs, confusable
pairs, practice modes, pre/post and adaptation. Learning notes appear and can resume at
saved steps. Skill-7 clef pairs resolve to pitches; no-clef pairs remain positions. Skill-9
reports direction-specific first wrong choices. Print outputs only the current report.
The local roster summarizes this device; authorized cloud reports are separate. Stable
workspace/student/event UUIDs are required for cross-device joins, not display names.

Home order: My notes → daily button → fifteen cards. Wide screens use three columns,
tablet portrait two, phones one; center the last odd card. Stars are stored by skill ID;
daily/first lessons do not overwrite them. Unlearned chips remain tappable; the next-note
footer requires adult initiation. Current learner opens picker or teacher roster by role.
Question and answer stay together below the prompt; unused space remains below them.
Short landscape under 520px uses question-left/answer-right with width-scaled notation.

## Regression checklist

Use isolated synthetic accounts. `window.__dbg` exposes diagnostic state/functions.

1. Thirteen home cards/chips/daily/settings render without console errors.
2. Find-key uses checked letters, correct session count, advancement, and result/stars.
3. Staff/key supports both directions, exact octave, question-before-answer layout, and
   at least two staff options with one target checked.
4. Clef mixes checked D/E without adding B; checked C allows C4/C4B; feasible adjacent
   names differ, while one-target repetition is allowed. Reveal clef after success.
5. Duration values, key finding, hold window, and results work.
6. Hand→finger→hold advances correctly under session-token cleanup.
7. Line/space tapping, fourth-space boundary, and corrective hints work with/without clef.
8. All fourteen lesson steps advance/save; key/pos open after eight, fin after fourteen;
   resume, second-octave feedback, letter scaffold removal, opposite-clef step, and finale work.
9. Daily is exactly ten, honors selection, and does not import the current unlearned note.
10. Teacher single-note review uses target/neighbors, six items; next-note resets spotlight.
11. Legacy migrations preserve flags/stars/history/selection and run only once.
12. Settings, auto/three fixed tiers, sound/speech/test, and star-only reset work.
13. Teacher creation, learner PIN errors, switching/locking, refresh picker, profile isolation,
    and teacher-only reports/tests/exports work without treating PIN as encryption.
14. Reports render all sections/ranges, summed time, learning-note continuation, and print.
15. CSV headers/counts/combined roster, profile JSON, full-roster restore, and write-failure
    paths match documented semantics; bound-profile overwrite is refused.
16. iPad/phone portrait/landscape fit; short landscape is two-column; reports scroll.
17. Skill 7 covers direction once each, higher/lower alternating asks and sides, both clefs,
    wide tap regions, audio, silent success, hints, and skill-7 stars without E4 migration.
18. New-note order is E4→A3→A4→F4→G4; chips can start each directly. A3 is left 3/bass
    fifth line/F3–B3; A4 right 5/F4–B4. Completed lessons join eligible named-note skills.
19. Use the release pipeline for SW versions, file hashes, actual load receipts, and offline
    upgrade. Never manually increment the cache version or erase learner storage.
20. Skill 8 covers compact symbolic dropdowns, Arabic 1–8, line/space diagrams, editable answers, six unique
    positions, one/two/three ledgers by tier, full-sentence speech, and no pitch-name question.
21. Skill 9 respects checked notes, alternates available familiar clefs, varies pairs, and verifies all targets,
    feedback/hints/log fields, and one-per-learned-comparison new-note finale.
22. A chips disambiguate octaves; A speech is /eɪ/, not /aɪ/.
23. Skill 10 uses placement in all tiers: one staff position, then five ledger positions;
    continuous keyboard movement retains focus after redraw.
24. Skill 11 offers all three representation pairs and duration/beat pairs, mismatches, persistent matches, and
    completion with one checked pitch; keyboard/staff matching requires the exact octave.

## Code map

| Area | Symbols |
|---|---|
| Notes/skills | NOTES, NOTE_ORDER, BASE_NOTES, SKILLS |
| First lesson | SPOT_STEPS, spotlightQuestions, advanceSpotlight |
| Accounts | ACCOUNTS, CURRENT, S, TEACHER_MODE, newState, enterAccount, createAccount |
| Teacher UI | syncRoleUI, openTeacherEntry, saveTeacherPin, showTeacher, teacherRoster, renderTeacherList, openTeacherLearner, exitTeacher |
| Progress/selection | blankProgress, ensureProgress, ensureSelection, selectedNotes, activeNotes, noteComplete |
| Generators | makeFindKey, makeStaffKey, makeClef, makeBeats, makePlay, makeSpot, makeTwoNotes, makeLedger, makeLedgerMove, makeMatching, makeContrast, buildQuestions, weightedRepeatTo, spaceOut |
| Clef | clefPool, makeClef |
| Pairs/geometry | staffPairSVG, staffPairBlock, ledgerBlock, pairIcon, staffPitch, qPairDirection, qWhichHigher, alternateAsks, higherSpecs |
| Ledger | ledgerSpots, qLedgerName, staffSpotLabel, positionLabel |
| Placement/cards | qLedgerMove, makeLedgerMove, makeMatching |
| Contrast | CONTRAST_POS, CONTRAST_PARTNERS, contrastPairFor, contrastPool, qContrast, makeContrastFor |
| Daily/entry | buildDailySession, startSession, startLevel, startDaily, startSpotlight, startNoteImport, startNoteContinue, startNoteReview, startContrastNote |
| Logs/adaptation | recordAnswer, practiceEvents, noteStats, evaluateAuto |
| Upgrade/tests | upgradeState, loadAccountState, migrateLegacyState, makeBattery, batteryQuestions, startTest |
| Reports | REPORT_DAYS, practiceList, rangeStart, halfTrend, pairGroups, dailyMatrix, skillTable, noteTable, comparisonTable, contrastTable, modeTable, renderReport |
| Export | CSV_HEAD, csvEventRows, exportCsv, exportAllCsv, exportBackup, importBackup |
| Home | renderChips, noteName, noteNameHTML, renderDaily, renderNextNote, renderHome, renderWho |

## Open instructional decisions

- Dedicated A4 shift lesson: whole-hand shift versus thumb passage and method-book sequence.
- More left-hand notes; current B3/A3 still leave skill 5 right-hand heavy.
- Whether clef identification remains separate as F/G join, and when staff-position naming
  should progress to pitch naming.
- Exposure-based lesson advancement versus a justified performance criterion.
- Validate auto-difficulty 85%/60% thresholds against suitable evidence; do not treat defaults
  as established optimal teaching thresholds.
- Whether skills 7/9 belong in daily practice and whether skill 7 belongs in the fixed
  12-item battery. Clarify measurement purpose before replacing or adding items.
- Skill 7 cross-staff/ledger comparisons; skill 10 placement beyond three ledger lines.
- Skill 9 grand-staff mirror pairs E4/A3 and D4/B3; currently single-staff only.
- Teach A3's treble second-ledger spelling before relying on it in contrast.

Account management, long-term retention, and cloud operating limits are infrastructure
items in the progress tracker. The old 8,000 cap and “cloud is another project” notes
are superseded; optional cloud has been implemented, while long-term/device limits remain.
