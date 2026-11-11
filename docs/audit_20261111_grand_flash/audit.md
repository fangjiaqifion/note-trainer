# Grand Staff and Flash Recall Acceptance

Last updated: 2026-11-11

## Changes and decisions

- Skill 12 retains its complete written question and speaks only “找出 C 音” (with the actual target substituted). Same-letter octave qualifiers remain when needed.
- Skill 13 retains selected treble ledger comparisons and alternates mixed groups with familiar staff cards, including selected bass B3. No unchecked notes are introduced for clef variety.
- Skill 14 uses both clefs and a brace on a grand staff. Three distinct selected pitches must be played in horizontal order before highest/lowest selection. Each pitch keeps its familiar clef; an all-treble selection does not invent bass pitches.
- Skill 15 has ten questions. Each observation lasts 2,000 ms with numbered note cards and no answer buttons. Notes disappear before numbered answer choices appear. The first two questions compare height, the next three locate a named note, and the remaining five use three notes when available. With only two eligible pitches, the complete session retains two-note tasks. Same-letter octaves receive explicit qualifiers.
- Fifteen menu cards and report columns are registered. Fixed-height scrollable rows prevent short-landscape cards from shrinking into overlapping hit regions.

## Verification

Final local build `b2c556dd20` passed the complete release suite. All runtime-file hashes matched both local origins on port 8775. Four actual Safari/Chrome boot receipts acknowledged that build across 127.0.0.1 and localhost; local readiness is recorded from those receipts. No remote deployment was performed. Port 8775 uses a separate storage origin from the previous preview; existing port 8774 profiles remain intact. Isolated synthetic Chrome checks cover wrong/correct keys, play-before-comparison gating, bass cards, grand-staff selection, flash observation and hidden-answer phases, wrong/correct recall choices, and menu hit regions. The generation audit covers 73,440 sessions across all 255 nonempty checked sets, three difficulties, two histories, three seeds, and fifteen skills plus daily practice. Layout checks cover 22 rendering cases at four viewports. Grand-staff and flash screenshots were visually inspected; an overlapping brace was corrected before the final release run.

The full local release suite includes Node, scheduling, generation, storage, backup, sync, portal, cloud fixtures, and offline-upgrade checks. This task does not change database schema or contact real learner records. Actual physical iPad touch behavior and pronunciation remain unverified. No push or remote deployment is authorized by this task.

## Documentation disposition

Updated AGENTS, LEVELS, README, development guide, user guide, tracker, and this audit. Cloud operations and teacher portal procedures were reviewed unchanged because storage, identity, permissions, and synchronization are unaffected. Parent/game-area guides and parent README remain applicable unchanged; the parent tracker records coordination and the locally committed submodule pointer. Historical audits are preserved.
