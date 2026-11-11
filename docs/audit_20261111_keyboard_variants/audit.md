# Random keyboard variants and find-all letter targets

Date: 2026-11-11

## Implemented behavior

Skill 18 retains eight single-note questions per session but now samples eight
different layouts from sixteen shapes. Added ascending and descending stairs,
origami, accordion folds, roof, valley, fan, and bow tie. Existing ring, oval,
arch, wave, ribbon, slopes, and zigzag remain. Folded white-key facets use subtle
shading; black keys stay at the back and on top of the white-key layer.

Name questions say “找出所有的 C” (or another eligible selected letter A–G).
The keyboard spans two full octaves, C3–B4, so every letter has two matches.
Both keys must be found. Found keys stay green, a found/total counter updates,
and repeated taps do not count twice. An incorrect key preserves partial progress.
Only the final correct match completes and records the question. Staff questions
still require one exact pitch. The eight questions alternate four name and four
staff targets and cover every eligible selected pitch.

The range change preserves complete 2–3–2–3 black-key groups, no black key at
E–F/B–C, the middle-C anchor, and the corrected radial back/front direction.

## Verification

Runtime build: 4b74ebb1b2. Complete required local release suite passed:
54 Node tests, 1,144 scheduling cases, 87,210 generation sessions, 40 rendering
fixtures at four viewports, focused interactions, and all sync/backup/cloud/
portal/storage/offline browser suites. Both local origins matched all runtime
file hashes. Four actual Safari/Chrome boot receipts acknowledged this build
across 127.0.0.1:8775 and localhost:8775. Local release status is ready.

The layout matrix instantiates all sixteen shapes independently of the eight
random session samples. Hit tests verify white and black MIDI sequences, both
key layers, exposed white fronts, E–F/B–C gaps, and radial orientation.
Generation checks verify distinct allowed session shapes, selected target bounds,
and the complete expected match set, with two name matches versus one staff match.
Interaction tests cover partial success, ignored repeated taps, both name octaves,
staff octave rejection, wrong black keys, and one completion record.
New shape screenshots, ring at phone size, and origami in short landscape were
visually inspected. Git whitespace and changed local Markdown links passed.

Preview: http://127.0.0.1:8775/index.html?build=4b74ebb1b2.

## Documentation disposition

Updated AGENTS, LEVELS, README, development guide, user guide, tracker, and this
audit. Cloud operations and teacher portal procedures reviewed unchanged because
schemas, permissions, enrollment, and synchronization are unaffected.
Parent/games guides and parent README reviewed unchanged: ownership, workspace
scope, and publishing boundaries remain applicable. Historical audits preserved.
Existing local profiles remain intact. No push or remote deployment performed.
Physical iPad touch and pronunciation remain unverified for this build.
