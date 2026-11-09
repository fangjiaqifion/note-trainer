# Skills 8–11: Instructional Update

Last updated: 2026-11-09

## Scope and decisions

- Skill 8 retains six editable position-naming items. Clef choices use the existing
  licensed clef paths, direction uses arrows, numbers remain a fixed Arabic 1–8 list,
  and line/space choices combine text and diagrams. The fixed eight choices exceed
  the requested minimum of five without revealing the answer range.
- Skill 9 now uses separate treble C4–G4 and bass F3–C4 blocks, independent of the
  checked lesson notes. This intentionally replaces the previous checked-pair rule for
  this skill only. Basic groups need at most one ledger line. Hard adds ledger pitches.
  The first-lesson contrast finale retains its separate learned-note comparisons.
- Skill 10 consolidates position naming in Easy/Normal. Hard reverses the task: hear
  the requested clef/direction/number/line-or-space, move a note by dragging or tapping,
  then confirm. Arrow keys provide half-step placement. Three ledger lines are supported.
- Skill 11 has three face-down matching rounds: name/key, name/staff, key/staff. Easy
  uses up to two eligible checked pitches; other tiers use up to three. Name matching
  uses letters, while key/staff matching requires the same octave. One checked pitch
  remains playable. A completed board records one answer; mismatches count as errors.
- Existing stars keep their IDs. Home and report registries now contain eleven skills.
  Daily practice and frozen pre/post batteries are unchanged.

## Verification

Final build `6cd59fcd9e` passed the full required local release suite (54 Node tests,
1,144 scheduling boundaries, and all required browser suites). Validation extends the generation matrix to all eleven skills (55,080 sessions),
adds skill 10 placement to the four-viewport layout suite, and checks pictorial choices,
Arabic numbers, basic contrast ranges, rejection of same-letter contrast distractors
across octaves, keyboard movement, three matching modes, and
completion with one eligible pitch. A stale nine-skill report assertion was corrected
when the final suite intercepted it. The suite also verifies retained focus during consecutive note moves. Both local-origin
file manifests matched; four actual Safari/Chrome navigation receipts acknowledged
`6cd59fcd9e`. Scope is local-only. Final release evidence is recorded in the tracker.

No real learner records were used. Cloud tests use existing isolated local fixtures;
this task does not claim new live database, regional-network, or iPad touch acceptance.
No push or deployment was authorized. Prior remote release evidence remains historical.

## Documentation disposition

Updated AGENTS, README, LEVELS, development/testing guidance, user guide, and progress
tracker. Parent tracker records coordination only. Cloud operations and teacher portal
procedures were reviewed unchanged because identity, storage, ownership, enrollment,
and synchronization behavior did not change. Dated earlier audits remain unchanged.
