# Listening Skills and Notation Refinement

Last updated: 2026-11-11

## Scope

- Skill 14 adds a closing barline spanning both staves, preserving the opening connector and brace.
- Skill 15 keeps every number upright and extends observation to 3,000 ms.
- Skill 17 retains the corrected absence of an initial barline. Existing regressions check both unanswered notation and the inserted time signature.
- Skill 19 provides twelve direction questions, four each with four, three, and two notes. Every block includes up, down, and same, plus one randomized repeat category.
- Skill 20 alternates highest/lowest judgments with numbered choices, six three-note then six two-note questions. A two-pitch selection uses pairs throughout; fewer than two is rejected explicitly. Correct answers reveal all staff cards and mark the target for 3.5 seconds.
- Skill 21 plays a single selected pitch and offers three distinct letter names, with complete selected-target coverage. It uses absolute identification without a reference pitch.

Listening requires an explicit play gesture; notes remain hidden and choices disabled until playback ends. Replay suppresses speech and stale sequence callbacks check both session and question identity. The existing synthesized piano is reused. No cloud schema, storage, account, or deployment behavior changes.

## Verification

Final local build `170f3e845b` passed the complete required release suite, both local-origin runtime hash checks, and four actual Safari/Chrome load receipts on port 8775. The focused `node tests/notation_refinement.mjs` regression also passed. Synthetic browser tests cover hidden notation, playback gating, wrong/correct answers, and notation reveal. The generation matrix checks all 255 nonempty selections at three difficulties, two histories, and three seeds across 21 skills and daily practice (100,980 sessions). Direction monotonicity and unique highest/lowest answers are checked directly. Layout fixtures include all three listening skills at four viewports.

Screenshots reviewed include upright flash badges on a landscape phone and hidden-note numbered listening on a portrait tablet. Actual audibility, physical iPad use, and learning effectiveness are not inferred from browser tests.

## Documentation disposition

Updated AGENTS, LEVELS, README, user guide, development guide, tracker, and this audit. Parent/games guides and parent README remain applicable: ownership and publishing boundaries are unchanged. Cloud operations and teacher portal docs remain unchanged because permissions, enrollment, schemas, and sync are unaffected. Historical audits retain their original scope. No push or deployment is authorized by this task.
