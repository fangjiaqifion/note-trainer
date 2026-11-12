# Placement and Information Activity Refinement

Last updated: 2026-11-12

## Requested behavior

Skill 22 retains six three-pitch questions but replaces the nine labeled buttons with a white board, one horizontal reference line, and three movable whole-note heads. The notes start at the middle height. Drag vertically or tap within a note's column to snap to one of three heights; arrow keys provide the same operation. The board has no written pitch labels, numbers, or instruction text. Replay and confirmation use icons with accessible names. Each question starts audio automatically, cancels speech, highlights the sounding note, and locks placement and confirmation until playback finishes. Replays preserve the student's placement. Navigation cancels pending playback, and disposal remains idempotent. Correct and incorrect feedback use the shared symbolic mode without instructional speech.

Skill 23 retains four questions and four required matching representations (name, fixed-do solfege, staff position, and local keyboard). Each question now has sixteen shuffled cards: four correct cards and twelve distractors from three distinct other pitch names. Cards have staggered offsets and wider distribution. Responsive layouts use four columns on tablets, three on narrow portrait screens, and eight in compact landscape. Selecting any extra distractor prevents completion, even if all four correct cards are selected.

## Verification

Regression coverage checks automatic playback and initial answer gating, exactly one reference line and three note heads, absence of visible placement instructions, repeatable disposal, actual pointer dragging to the heard pattern, sixteen information cards, rejection of extra distractors, and successful selection. The generation audit checks all placement patterns and information-card targets across 110,160 sessions. An isolated synthetic browser check inspects every information-card boundary and renders both activities in compact landscape. Screenshots: [placement](placement_landscape.png), [information cards](information_landscape.png).

Local build `7211f08873` passed the complete required release suite: 54 Node tests, 1,144 scheduling cases, 110,160 generated sessions, 45 rendering fixtures at four viewports, real pointer-drag and automatic-playback checks, and all sync/backup/cloud/portal/storage/offline suites. Both local-origin file hashes matched, and four actual Safari/Chrome receipts acknowledged this build on port 8775, status `ready`. Local documentation targets (55) and Git whitespace checks passed. Physical iPad dragging and audible automatic playback remain unverified. No live student data, push, deployment, or database changes.

## Documentation review

Updated AGENTS, LEVELS, README, user guide, development guide, tracker, and this audit. Cloud operations and teacher portal procedures reviewed unchanged because storage, permissions, onboarding, and sync behavior are unaffected. Parent/games guides and parent README reviewed unchanged because workspace scope, ownership, and publication boundaries remain applicable. Earlier audits preserve their original scope.
