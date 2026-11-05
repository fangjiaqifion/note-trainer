# Note Trainer Changelog

Last updated: 2026-11-05

[Project overview](../README.md). Historical entries describe behavior at their dates;
[the user guide](user_guide.md) describes current operation.

One row per user-visible change, newest first. Dates are ISO. The project is identified by
date rather than semver.

| Date | Change |
|---|---|
| 2026-11-05 | Optional cloud classes add revocable scoped recovery, cross-device history, teacher/researcher access, version-conflict protection, and class disaster recovery. Audio diagnostics distinguish piano, Chinese, and letters; failed local saves pause practice |
| 2026-11-05 | Teachers can back up and restore the full roster with a recoverable previous snapshot. Failed single-profile imports no longer claim success; missing or duplicate local sync identities pause uploads |
| 2026-11-05 | Isolated sync tests batch saved answers on a bounded ten-second window, back off on temporary failures, pause on identity/configuration errors, and support remote test pages without publishing a database key |
| 2026-11-05 | Completed answers save immediately; older records are retained beyond 8000 rows. A separate local test mode checks game-generated answers against Supabase and reports startup audio/network timing |
| 2026-11-04 | Checked-note practice now stays inside its selected pool, including D/E in skill 3. Skill 1 balances letters and daily practice plans note counts for the whole session before mixing question types |
| 2026-11-04 | Releases verify file hashes and actual Safari/Chrome loads across remote and local URLs. Per-step timeouts, failure receipts, and a process lock prevent false success and overlapping resets |
| 2026-11-04 | Skill 8 no longer repeats the same ledger position within a session |
| 2026-11-04 | `npm run release -- --local` and `--push` stamp a build, run the tests, clear Safari and Chrome caches for the remote and local origins, and print the correct test link. Settings shows the build tag |
| 2026-11-04 | Tests now sweep checked-note subsets and cover the cache reset page, so a level that collapses to one note under a non-default selection fails before release |
| 2026-11-04 | Question generators space out adjacent notes: skill 3 balances B/C/D and never shows C twice in a row (C4 and C4B count as C), and skills 2, 4, 5, 8 and 9 and the daily mix use a shared `spaceOut` pass |
| 2026-11-04 | Skill 8 always offers numbers 1–8 instead of shrinking the list to the correct position, and the session is fixed at six questions |
| 2026-11-04 | New-note progress is saved after every answered question, so leaving the 14-question lesson resumes at the next step; `npm test` now runs a Playwright smoke suite |
| 2026-11-04 | Audit pass: the keyboard sits with the question when it is the stimulus (keyboard → staff); staff choices get a distractor when only one note is checked; phones in landscape use two columns; report and metadata say nine skills |
| 2026-11-04 | Skill 8 asks only for the position: **这个音在（高/低）谱号的（上/下）加（数字）（线/间）** with four dropdowns. The note-name dropdown is gone because students do not yet know the pitch outside the staff |
| 2026-11-04 | The play screen keeps the question and answer together directly below the prompt; the keyboard is no longer pinned to the bottom edge. The new-note keyboard step marks an octave already found and asks for another A instead of silently requiring A3 |
| 2026-11-04 | New-note lesson rebalanced to 3 find-keyboard, 2 staff↔keyboard, 2 clef, 2 duration, 2 hand/finger, and 3 mixed items; finishing still opens all three flags and checks the note |
| 2026-11-04 | Skill 6 now tells a line tap from a space tap: a line needs a tap within 0.18 staff steps, so the middle of the fourth space no longer counts as the fifth line |
| 2026-11-04 | The new-note contrast finale asks the new note once against each learned note, up to six; it no longer repeats the same pair, and the note stays the answer every time |
| 2026-11-04 | Skill 9 **易混音**: two whole notes on one staff, tap the named one; neighbor, third, ledger-count and mirror pairs; both directions; the new-note result screen offers a contrast finale, and the report has a per-pair confusion table |
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
| 2026-11-02 | Added `LEVELS.md`, a teaching-design record of what each level trains and what it leaves out (now maintained in English) |
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
| 2026-10-30 | Middle C is labeled "中央 C" at the keyboard's top-right corner, next to the same orange dot |
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

