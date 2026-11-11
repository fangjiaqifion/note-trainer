# Code Quality and Documentation Audit

Last updated: 2026-11-11

## Scope and baseline

Reviewed the nine local game commits after `origin/main` (`fd3f55a` through
`bb4c090`, with baseline `7669b29` verified by fetch), emphasizing the new selected-note,
notation, keyboard, rhythm, and listening behavior. Also inspected shared navigation,
answer recording, release integrity, local serving, and cloud/portal boundaries.
This is a focused code and regression audit, not an exhaustive security assessment.
The parent repository has no remote; it records coordination and the submodule pointer locally.
The existing parent `.statamcp/` directory is unrelated and remains untouched.

## Findings and fixes

| Priority | Finding | Resolution and regression |
|---|---|---|
| P2 | Leaving flash recall kept `G.q` unchanged, allowing its timer to hide notes and speak on the home screen | Optional idempotent question `dispose()` runs on navigation, session start, and question transition; flash cleanup clears the timer. Browser regression exits during observation and waits beyond three seconds. |
| P2 | The top speaker control could mask listening notes, and leaving playback did not stop the current synthesized voice | Listening owns its voice and cancellable interval, invalidates the playback run, and exposes `playing` to suppress prompt repetition. Browser regression repeats the prompt during playback, leaves mid-sequence, and checks no further status changes or answer unlock. |
| P2 | Repeated listening mistakes replaced the first wrong selection in the practice log | Preserve the first `wrongChoice`, consistent with other question types. Regression makes two different incorrect choices before completing. |
| P3 | Page/share descriptions still advertised nine skills; comments described obsolete grid and read-only debug behavior | Descriptions now say twenty-one; comments describe scrollable rows and mutable debugging access accurately. |
| P3 | README promised speech for every question despite intentionally silent listening prompts; tracker operational guidance named an older preview port as current | Clarified listening controls and distinguished historical cloud acceptance from current preview origins. |

## Maintainability and remaining boundaries

The main HTML still combines rendering, question factories, state, and orchestration.
Future skill additions would benefit from extracting factories behind the documented
question interface. A broad extraction is deferred to its own behavior-preserving task;
this audit keeps the release diff focused on demonstrated faults.

The isolated notation follow-up test still expects a server on port 8775. It is a manual
supplement, not part of `npm test`; the normal smoke suite starts an ephemeral server.
Physical iPad touch, audible pitch/speech output, regional networks, large-history
storage capacity, and ordinary unbound multi-tab practice remain outside this acceptance.
No live database mutations or pressure tests are needed for these client-only fixes.

## Documentation disposition

Updated game AGENTS, README, development guide, user guide, tracker, and this audit.
Reviewed LEVELS unchanged: timing, prerequisites, note pools, and instructional answers
remain the same. Reviewed cloud operations and teacher portal documentation unchanged:
no schemas, enrollment, authorization, recovery, or synchronization protocol changes.
Reviewed parent/games AGENTS and public overviews unchanged: ownership, scope, and
publishing rules remain accurate. Historical audits retain their original evidence.

## Verification

- Syntax checks passed for 46 tracked JavaScript/module files.
- Local file links passed across 35 existing tracked Markdown files; final audit links
  are checked again before the evidence commit.
- The npm registry audit reported zero known vulnerabilities for the locked dependency tree.
- Full release and deployment acceptance is recorded below after execution.

The stable local release run passed all 54 Node tests, 1,144 scheduling cases,
100,980 generation sessions, 43 four-viewport fixtures, and every browser suite
(sync, backup, local cloud/portal fixtures, storage failures, offline/cache upgrade).
Build: `75f7d37c63`. Both local origins passed all runtime-file hashes. The run used
`--no-open`, so its browser receipt status is `prepared`, not `ready`.
An earlier sandbox run could not bind local test ports. An intermediate run reached
cache verification while runtime edits were still being finalized and timed out;
the stable rebuild and complete rerun above passed. No result from those attempts
is used as release acceptance.
