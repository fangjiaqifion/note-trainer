# Three Distinct Heights in Skill 22

Last updated: 2026-11-12

The user requested simplifying skill 22 after another unsuccessful trial. Every question now contains three distinct pitches, C4, E4, and G4, exactly once each. The six-question session draws all six permutations without duplication. Repeated-pitch, all-equal, and two-height items are removed. A correct placement must occupy all three heights in the heard order. Automatic playback, the instruction-free board, movable whole-note heads, and icon-only replay/confirmation remain unchanged. Skills 23 and the confirmed new-note sequence are unaffected.

## Verification

The generation audit requires six distinct sequences and three distinct heights per question, with each answer height matching its actual MIDI pitch. Independent browser checks capture actual oscillator fundamentals and perform real pointer placement for all six literal MIDI/height pairs, rather than deriving pointer targets from the question answer metadata. The shared relative-pitch comparator retains its earlier exhaustive checks; the production bank now exclusively uses three-height permutations.

Local build `a16fb117cc` passed the complete required release suite: 54 Node tests, 1,144 scheduling cases, 220,752 generated sessions, 45 fixtures at four viewports, and all sync/backup/cloud/portal/storage/offline suites. Independent actual-frequency and pointer tests passed all six permutations. Both local-origin file hashes and four actual Safari/Chrome boot receipts match this build, status ready. Git whitespace checks and 55 documentation links passed. [Screenshot](three_heights.png). Physical iPad interaction and audible acceptance remain unverified. No push, deployment, or live database changes.

## Documentation review

Updated AGENTS, LEVELS, README, development/user guides, tracker, and this audit. Cloud/portal procedures and parent/games guides/overviews reviewed unchanged because protocols, permissions, scope, and ownership remain accurate. Historical audits preserve their original question-bank scope.
