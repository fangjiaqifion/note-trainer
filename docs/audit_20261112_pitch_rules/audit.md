# Pitch Rules, Aligned Cards, and G3

Last updated: 2026-11-12

## Report and rule review

The user reported hearing G–C–G, placing high–low–high, and seeing an inverted answer. The earlier code's literal G–C–G mapping was already [2,0,2]; a universal inversion could not be reproduced from that code. Its confirmed instructional defect was exact absolute-level matching: a correct relative shape could fail when shifted vertically. Previous tests also derived expected pointer positions from the question's own answer pattern, so they could not independently establish that sounding pitches and expected visual positions agreed.

The question bank now stores explicit, immutable MIDI sequences. Both playback and scoring use the same sequence. Scoring compares every pair of pitches against every pair of placed heights, preserving higher, lower, and equal relations. G–C–G accepts high–low–high and rejects low–high–low. Two-pitch sequences can use any pair of heights in the correct order; repeated pitches must share a height, and three different pitches require three ordered heights. All-equal sequences can be placed together at any height. The six-question session, icon controls, automatic playback, and instruction-free board remain unchanged.

Regression checks independently enumerate 27 heard sequences × 27 placements. The browser captures the Web Audio oscillator start frequencies during an explicit G4–C4–G4 question and compares the three fundamentals with approximately 392, 262, and 392 Hz. Pointer dragging uses literal high–low–high positions, independent of question answer metadata. The inverse placement is rejected. These checks establish code/audio-engine consistency, not human audible acceptance or reproduction of the user's original device state.

## Card alignment

Skill 23 retains four questions and sixteen cards per question, with four matching cards and twelve distractors. Removed random offsets and made all cards fill their cells. All viewports now use exactly four columns and four rows, including narrow portrait and compact landscape. Independent screenshots and rectangle checks confirm equal row/column alignment and no viewport clipping.

## New-note scope

Added G3 (MIDI 55), below middle C, bass fourth space, left fourth finger. It follows A3 and precedes existing F4. Its first keyboard presents the complete F3–B3 black-key group. Shared comparison planning now recognizes any all-bass trio and includes G3's explicit treble ledger spelling only where ledger play/comparison is authorized.

The requested F note remains pending clarification: the request names F3 but describes the F to the right of middle C, which is existing F4. F3 is below middle C. No existing learner progress or note identifiers were relabeled.

## Verification and documentation

Local build `d639676bcf` passed the complete required release suite (54 Node tests, 1,144 scheduling cases, 220,752 generated sessions, 45 four-viewport fixtures, and all browser storage/sync/backup/cloud/portal/offline suites). The supplementary smoke run passed the explicit inverse-rejection assertion. Both local-origin file hashes and four actual Safari/Chrome boot receipts match this build, status ready. G3 data, first-keyboard range, and exact 4 × 4 alignment/bounds were independently checked. Screenshots: [G–C–G high–low–high](gcg_high_low_high.png), [landscape grid](aligned_landscape.png), [phone grid](aligned_phone.png). Human listening and physical iPad interaction remain unverified. No push, deployment, or live database change.

Updated AGENTS, LEVELS, README, development guide, user guide, tracker, and this audit. Cloud operations and teacher portal docs reviewed unchanged because schemas, permissions, and sync behavior are unaffected. Parent/games guides and parent README reviewed unchanged because ownership, workspace scope, and publication boundaries remain applicable. Historical audits retain their original scope.
