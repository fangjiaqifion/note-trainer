# Pitch Activities and Interaction Refinement

Last updated: 2026-11-12

## Scope and decisions

The request names two different activities as skill 22. They are implemented consecutively as skill 22 (six listening-placement questions) and skill 23 (four mixed-information questions). Skill 22 uses a stable low/middle/high C4/E4/G4 register and six patterns, including repeated pitches. The white board has three ordered columns; tapping a height places or changes a numbered note. Skill 23 uses eligible checked targets and presents eight shuffled cards: one correct and one distractor each for letter, fixed-do solfege, familiar notation, and a highlighted keyboard key. Keyboards contain seven white keys within one octave. All four correct cards must be selected, without any distractors.

## Existing-skill changes

- Skill 8 and the shared piano voice: reduce upper partial energy, shorten upper-partial decay, vary string inharmonicity with register, and omit partials near Nyquist. Fundamental pitch and offline synthesis remain intact. This is an acoustic modeling refinement, not a sampled piano or a claim of verified realism.
- Skill 10: redraw ledger strokes on every snapped pointer position, while retaining pointer capture on the same SVG. Display a live position label; keyboard arrows still work.
- Skill 16: full initial instruction only on the first question, then “补全缺失音符”.
- Skill 18: middle C is a small yellow dot with a separate legend.
- Skill 20: speak the question before listening; playback still cancels speech to prevent overlap.
- Skill 21: keep replay and answer controls in place, add correct-name/notation feedback inline, and advance after two seconds.

## Verification

The first sandboxed release test could not bind loopback ports (EPERM); the authorized unsandboxed local test run resolves that environment limitation. Layout testing intercepted a landscape overflow in skill 23; a four-column compact landscape layout corrects it. A duplicate regression helper name was corrected before the passing smoke run.

Screenshot review also intercepted inherited two-column landscape stage placement and undersized new-card text. New activities now use full-width stage and answer rows in compact landscape mode, with larger card content. An isolated synthetic browser check verifies every new card stays inside the viewport. See [placement](placement_landscape.png) and [information cards](information_landscape.png).

The browser smoke run covers all 23 menu cards, 45 rendering fixtures at four viewports, 110,160 generated sessions, information-selection rejection/completion, three-column placement gating and correct answers, listening behavior, existing placement/matching checks, lesson continuation, reports, cache reset, and clean console output. Final local build `0de68d13b9` passed the complete required release suite: 54 Node tests, 1,144 scheduling cases, 110,160 generated sessions, 45 rendering fixtures at four viewports, all listening/new-activity smoke checks, and sync/backup/cloud/portal/storage/offline suites. Both local origins matched every runtime file hash. Four actual Safari/Chrome boot receipts acknowledged this build on port 8775; ignored release status is `ready`. Local preview: http://127.0.0.1:8775/index.html?build=0de68d13b9. Local Markdown targets (54) and Git whitespace checks passed.

## Documentation disposition and limits

Updated AGENTS, LEVELS, README, development guide, user guide, tracker, and this audit. Cloud operations and teacher portal procedures are unchanged because no schema, permission, sync, or onboarding behavior changes. Parent/games guides and parent README remain applicable: ownership, workspace scope, and publication boundaries do not change. Historical audits are preserved.

Physical iPad touch accuracy and human listening acceptance remain unverified. No push, deployment, or live database changes are authorized in this task.
