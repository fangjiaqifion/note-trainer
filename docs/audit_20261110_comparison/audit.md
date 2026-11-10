# Selected comparison and three-note recognition

Date: 2026-11-10

## Defect and instructional correction

Skill 9 previously ignored checked notes and generated fixed clef-specific groups,
including automatic unfamiliar ledger spellings on Hard. This contradicted the user's
beginner sequence. It now reads the checked, position-learned pool and practices
C4/D4/E4 in treble clef, A3/B3/C4 in bass clef, then selected upper-treble extensions.
Middle C retains its two familiar core spellings. No tier introduces unchecked pitches
or alternate-clef ledger spellings. Ledger-position work remains in skills 8 and 10.
The new-note comparison finale keeps its existing separate instructional role.

Skill 12 adds three-note visual discrimination. The complete treble CDE or bass ABC
trio appears together on one staff, horizontally shuffled, with an explicit target-letter
question. Each core group is completed before the next. Targets are balanced and spaced
within blocks. Missing complete groups receive a specific selection message. Existing
feedback, reveal, pitch playback, stars, answer recording, and reports include this skill.

## Verification

Final local build: `87cfb76b40`. The full required local release suite passed: 54 Node tests, 1,144 scheduling
boundaries, 59,670 generated sessions, 17 question variants at four viewports, and
all sync, backup, cloud/portal fixture, storage, and offline-upgrade browser suites.
Both local origins matched every release-file hash. Four actual Safari/Chrome
reset/boot receipts on 127.0.0.1:8774 and localhost:8774 acknowledged this exact
build; ignored release status was marked ready only after querying those receipts.
An initial preparation became stale after final report wording/categorization edits;
the complete suite and final preparation were rerun against the final build.
The targeted regression exercises the exact B3/C4/D4/E4/A3 selection in all tiers,
checking every target and distractor, familiar clef spellings, group order, all three
hit regions, correct tapping, and insufficient selections. The generation matrix now
includes twelve skills and daily practice across 59,670 sessions. Layout checks include
the new three-note item at four viewport sizes.

No real learner records or live database writes are part of these checks. No publication
was authorized. Physical iPad interaction is not established by desktop browser checks.

## Documentation review

Updated AGENTS, LEVELS, README, development guide, user guide, and current tracker.
Cloud operations and teacher portal documents remain unchanged because this changes
only instructional generation, question rendering, and report categorization. Parent and
area guides remain applicable. Dated earlier audits preserve their original evidence.
