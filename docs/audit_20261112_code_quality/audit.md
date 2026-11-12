# Code quality audit, 2026-11-12

## Scope

Focused review of the six instructional commits after `b1ac77d`: fixed quotas,
twenty keyboard layouts, audio/ledger interactions, G3, and skills 22–23.
Reviewed question generation, scoring, pointer/keyboard interaction, playback
cancellation, answer recording, rendering tests, and documentation consistency.
This is a targeted audit, not a claim that every application path is defect-free.

## Findings and fixes

- P2: Skill 23 retained its selection Set when render rebuilt unselected cards.
  A redraw could score invisible selections. Clear the Set before rebuilding.
- P2: Skill 23 did not retain the first incorrect submission. Record it before
  judging. The shared answer logger also used truthiness, replacing an empty
  first submission with the eventual correct answer. Use nullish fallback so an
  explicitly empty answer survives into the saved event.
- Regression: select a card, redraw, submit empty, submit a correct set plus a
  distractor, then correct it. Assert empty state, first-error retention, final
  completion, and the persisted event's original empty choice.
- Maintenance follow-up: the main HTML still combines factories, rendering, and
  orchestration. Extraction can be a separate task; no broad refactor is needed
  to publish these instructional changes.

## Verification

Final local build `3f32ad216a` passed the full required release suite: 54 Node
tests, 1,144 scheduling cases, 220,752 generated sessions across 511 selections,
45 rendering fixtures at four viewports, and sync/backup/cloud/portal/storage/SW
checks. The new state and persisted first-error regression passed. Both local
origins match all runtime hashes. The `--no-open` run is prepared, not browser-ready.

The initial sandboxed attempt could not start its test server. A subsequent full
run passed; the final run also includes the empty-choice logger fix. Module syntax
checks passed for 45 source/test modules; 56 local Markdown targets and Git whitespace
checks passed. Full npm dependency audit reported zero vulnerabilities. No real
learner records or live database tests are used in this audit. Publication verification is complete.

## Documentation review

Updated this audit and the current tracker. AGENTS, LEVELS, README, development,
user, cloud, and teacher-portal guides were reviewed unchanged: these fixes restore
existing state/recording behavior and change no instructional design, permissions,
configuration, or release procedure. Prior dated audits retain historical scope.
Physical iPad interaction and human audible acceptance remain unverified.

## Publication evidence

The user authorized commits and push. Commit `2694676` contains fixes, regressions,
release metadata, and initial audit evidence. The push also publishes the six
instructional commits `6492535`, `550c78d`, `aa071fc`, `3436620`, `c37bd43`, and
`d11aea1`. The complete push release suite passed again. All runtime file hashes
match GitHub Pages, 127.0.0.1, and localhost. Six actual Safari/Chrome boot receipts
confirmed build `3f32ad216a` on these three origins, final status `ready`. Browser
navigation used CUA after `--no-open`; prepared status was promoted only after
reading every matching receipt. Normal game UI was also observed in both browsers.

Published build: https://fangjiaqifion.github.io/note-trainer/index.html?build=3f32ad216a.
No migration, live database test, or learner-data modification was performed.
Parent coordination and the submodule pointer are updated locally after game commits.
