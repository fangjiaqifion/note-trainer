# Single-note keyboards and meter notation correction

Date: 2026-11-11

## Corrected behavior

Skill 18 now shows one note with one keyboard per question. A key can be answered
directly, without selecting a card. Eight distinct layouts remain, with four staff
and four letter-name targets and coverage of every eligible checked pitch.
Letter names show only A–G and accept matching white keys in any octave.
Staff targets still require the displayed pitch.

The reported radial keyboard had the back/front direction reversed. Its black
keys occupied the inner edge, putting them below the white fronts on the upper
arc. Rings and ovals now put black keys on the outer back edge and extend white
fronts inward. The ring was enlarged within its existing viewBox. Other layouts
retain black keys above white fronts. All preserve the piano's F–G, G–A, A–B,
C–D, and D–E black-key boundaries, with no black key at E–F or B–C. F3–B4
retains complete 3–2–3 black-key groups and the middle-C landmark.

Skill 17 says “选择对应的拍号”. Its score contains only the dividing and ending
barlines. There is no initial barline before the first measure, either before
answering or after the correct time signature appears. The shared rhythm renderer
also omits the initial barline in skill 16.

## Verification

Build b387b90745. The complete required local release suite passed: 54 Node
tests, 1,144 scheduling cases, 87,210 generation sessions, 32 rendering fixtures
at four viewports, focused interactions, and all sync/backup/cloud/portal/storage/
offline browser suites. All release-file hashes matched both local origins.
Four actual Safari/Chrome boot receipts confirmed this build across
127.0.0.1:8775 and localhost:8775; local release status is ready.
A supplementary full smoke run passed after strengthening the barline selector
to count every top-level score path, including an accidentally untagged barline.
Changed local Markdown links and Git whitespace checks passed.

Preview: http://127.0.0.1:8775/index.html?build=b387b90745.

The generation matrix still covers 87,210 sessions. New assertions require exactly
one target per keyboard and four questions of each representation, rather than the
previous requirement that every note appear in both forms. Four-viewport layout
tests cover all eight keyboards. The tests independently check piano white/black
MIDI sequences; black-key centers at shared boundaries; exposed white fronts;
E–F/B–C gaps; and the back-above-front direction on the top arc. The latter
intercepts the reported reversal, which the previous white-center-only tests missed.

Interaction checks cover direct answering, plain letters without octave subscripts,
A3-name acceptance at A4, exact-octave staff answers, wrong black keys, and single
answer-event recording. Meter tests check the exact prompt and both initial and
completed score barlines. Tablet-portrait ring and phone meter screenshots were
visually inspected, together with the remaining keyboard layouts.

The first full run found an incomplete synthetic A3 fixture: A3 had been selected
without its key/position prerequisites, so the factory correctly returned no
questions. The test now sets those prerequisites and restores them afterward.
No runtime change was needed for that fixture correction.

## Documentation disposition

Updated AGENTS, LEVELS, README, development guide, user guide, this audit, and the
game tracker. Cloud operations and teacher portal procedures reviewed unchanged:
schemas, permissions, synchronization, and enrollment are unaffected. Parent/games
guides and parent README remain applicable unchanged; parent tracker and submodule
pointer record this local delivery. Historical audits retain their earlier scope.
No push or remote deployment is authorized. Existing local profiles remain intact.
Physical iPad touch and pronunciation remain unverified.
