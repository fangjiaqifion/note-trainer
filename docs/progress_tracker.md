# Note Trainer Internal Progress Tracker

Last updated: 2026-11-11

Read [AGENTS.md](../AGENTS.md) first. This is the current implementation and handoff
record. Earlier audits describe their own stages, not current readiness. Current status includes the accepted teacher portal, automatic-student flow, and
instructional release. Each entry identifies its own runtime and database verification scope.

## Enlarged notation and concise prompts, 2026-11-11

Build `6f69a75390` keeps skill 12 comparisons within one clef until the final three
questions, which use mixed-clef triples when available. Same-clef pools with only two
selected pitches use a pair; no unchecked notes are added. Skills 13–14 explain
left-to-right order only on the first question, then say “弹出这三个音”. Extreme
prompts say “点出最高的音” or “点出最低的音”. Skills 12–15 enlarge notation, with
additional grand-staff space after the keyboard disappears. Skill 15 uses rounded
pastel number badges consistently across observation and answers.

Verification and local delivery evidence are recorded in the
[refinement audit](audit_20261111_notation_refinement/audit.md). The generation matrix
passes all 73,440 sessions; focused checks cover clef staging and first-question-only
direction prompts. Enlarged grand-staff and flash-card screenshots were inspected.
The mixed-clef finale rendering fixture now explicitly selects the last question.
The complete required local release suite passed, including 54 Node tests, 1,144
scheduling boundaries, 73,440 generation sessions, four-viewport layouts, and all
sync/backup/cloud/portal/storage/offline suites. The supplementary smoke run with
the mixed-clef finale fixture also passed. All release-file hashes matched both
local origins. Four actual Safari/Chrome boot receipts across 127.0.0.1:8775 and
localhost:8775 confirmed build `6f69a75390`; local status is ready.
Physical iPad touch and pronunciation remain unverified. No push or deployment is
included. Preview remains on the existing port 8775, retaining its stored profiles:
`http://127.0.0.1:8775/index.html?build=6f69a75390`.

Documentation updated: AGENTS, LEVELS, README, user guide, this tracker, and audit.
Development, cloud operations, and teacher portal procedures reviewed unchanged:
release mechanics, schemas, permissions, and synchronization are unaffected.
Parent/games guides and parent README remain applicable unchanged; parent tracker
and local submodule pointer record the completed local unit. Historical audits remain
unchanged.

## Grand staff and flash recall, 2026-11-11

Local build `b2c556dd20` shortens skill 12 speech while retaining the complete written
question, restores familiar bass-clef cards in skill 13 mixed groups, adds skill 14
play-and-compare on a braced grand staff, and adds skill 15 two-second numbered-note
recall. Five two-note questions progress from higher-pitch comparison to named-note
location, followed by three-note recall when three selected pitches are available.
Skill 15 requires two eligible pitches; skills 13–14 require three. The fifteen-card
menu uses fixed scrollable rows on short landscape screens to prevent hit overlap.

The final complete local release suite passed: 54 Node tests, 1,144 scheduling
boundaries, 73,440 generated sessions, 22 rendering cases at four viewports, targeted
grand-staff/flash/bass interaction checks, menu hit tests, and all sync/backup/cloud/
portal/storage/offline browser suites. Both local origins passed all release-file
hash checks. Four actual Safari/Chrome boot receipts on 127.0.0.1:8775 and
localhost:8775 acknowledge this exact build; local status is ready. Screenshots of
the new notation were visually inspected. Preview:
`http://127.0.0.1:8775/index.html?build=b2c556dd20`.
Port 8775 is a separate browser storage origin from the earlier port 8774; previous
origin profiles remain intact. No push or deployment was performed. Physical iPad
touch and pronunciation remain unverified. See the
[acceptance audit](audit_20261111_grand_flash/audit.md).

Documentation updated: AGENTS, LEVELS, README, development guide, user guide, this
tracker, and audit. Cloud operations and teacher portal procedures reviewed unchanged
because schemas, authentication, permissions, and synchronization are unaffected.
Parent/games guides and parent README remain applicable unchanged; the parent tracker
and local submodule pointer record delivery. Historical audits remain unchanged.

## Full selected-note coverage and play-three practice, 2026-11-11

Skill 9 now alternates available familiar clefs, randomizes the first clef and targets,
reserves enough questions for every eligible selected target, and penalizes reused
pairs. With B3/C4/D4/E4 selected, every target occurs and treble/bass strictly alternate.
A single legal pair cannot acquire new distractors without adding unchecked notes;
it can recur, separated by other-clef questions when possible. Unpairable pitches
receive selected-note review rather than unfamiliar spellings.

Every skill session now verifies selected-note coverage. Skills 6–8 and 10 keep their
position tasks and append staff/key review, as explicitly chosen by the user. Skill 5
grows when its base count is too small. Skill 3 preserves both selected A octaves and
spaces their letter names. Skill 11 rotates the pool and adds a small matching round
before duration matching as needed. Skill 12 uses variable nearby triples, separate
familiar staff cards for mixed clefs, and explicit above/below-middle-C wording when
same-letter octaves coexist. Smaller pools receive staff/key review.

New skill 13 shows three selected pitches, favoring adjacent notes and similar line
positions including treble A3/C4/E4. The learner first plays all three on the screen
keyboard from left to right, then chooses the highest or lowest displayed note.
Wrong keys do not advance; comparison cannot start early. Three distinct eligible
pitches are required. This avoids invented unchecked distractors in smaller pools.

Final local build `f96c43f1e8` passed the complete required release suite: 54 Node
tests, 1,144 scheduling boundaries, 64,260 generated sessions, twenty rendering cases
at four viewports, menu hit tests, and all sync/backup/cloud/portal/storage/offline
browser suites. All release-file hashes match both local origins. Four actual
Safari/Chrome boot receipts on 127.0.0.1:8774 and localhost:8774 acknowledge this exact
build; local status is ready. Chrome extension DOM inspection timed out after reset,
but the independent loopback game-boot receipts confirmed both actual loads.
Preview: `http://127.0.0.1:8774/index.html?build=f96c43f1e8`.
No push or remote deployment was performed. Physical iPad touch remains unverified.
See the [acceptance audit](audit_20261111_play_three/audit.md).

Documentation updated: AGENTS, LEVELS, README, development guide, user guide, this
tracker, and audit. Cloud operations and teacher portal procedures reviewed unchanged:
no schema, permission, authentication, or synchronization changes. Parent/games guides
and parent README remain applicable; the parent tracker/submodule pointer records
local delivery after the game commit. Historical audits remain unchanged.

## Selected comparison and three-note recognition, 2026-11-10

Local build `87cfb76b40` corrects skill 9 to checked, position-learned pitches.
Treble C4/D4/E4 and bass A3/B3/C4 are practiced in separate blocks, before optional
selected upper-treble extensions. Difficulty no longer injects unchecked or unfamiliar
alternate-clef ledger spellings. New skill 12 shows three shuffled adjacent notes
on one staff and asks the child to tap a target letter. A complete checked/learned
core trio is required; incomplete selections produce a useful selection message.
The report includes the twelfth skill. See the [audit](audit_20261110_comparison/audit.md).

Verification passed: the complete required release suite (54 Node tests, 1,144
scheduling boundaries, 59,670 generated sessions, 17 question variants at four
viewports, and all storage/backup/sync/portal/offline browser suites). All release
file hashes match both local origins. Four actual Safari/Chrome reset and boot
receipts across 127.0.0.1:8774 and localhost:8774 confirm this build; local status
is ready. Preview: `http://127.0.0.1:8774/index.html?build=87cfb76b40`.
No push or deployment has been authorized for this task; the accepted remote release
below remains the publication baseline. Physical iPad touch behavior remains unverified.

Documentation updated: AGENTS, LEVELS, README, development guide, user guide, this
tracker, and audit. Cloud operations and teacher portal docs reviewed unchanged:
no storage, authentication, permission, migration, or cloud workflow changes.
Parent/game area guides remain applicable; the parent tracker records coordination
and the local submodule pointer after game commits. Historical audits are preserved.

## Left/right matching release, 2026-11-09

Skill 11 now keeps each representation in a fixed left/right column, with independent
ordering and one-card-per-side matching. Same-side reselection changes the selection
without an error. The user authorized publishing this final fix together with the earlier
local instructional, keyboard, placement, and symbol-menu changes. See the
[release audit](audit_20261109_left_right_release/audit.md).

Released build: `b6f44fffb5`; feature commit `3862334` and preceding local
instructional corrections were pushed to origin/main. The full required suite passed:
54 Node tests, 1,144 scheduling boundaries, 55,080 generated sessions, four-viewport
layout/left-right geometry, symbolic answer correction, 18 placement confirmations,
and all storage, backup, sync, cloud/portal fixture, and offline-upgrade browser suites.
All deployed runtime file hashes matched Pages and both local origins. Six actual
Safari/Chrome load receipts across Pages, 127.0.0.1:8773, and localhost:8773 acknowledged
this exact build. Chrome remote reset initially failed twice at release-files; a separate
full-file diagnostic and the final fresh reset/boot succeeded. Prior attempts are retained
in ignored release status. No browser failure was converted to success by assertion.
No new database migration or live learner-data test was needed for these UI-only changes.
Physical iPad touch accuracy remains unverified. Published URL:
`https://fangjiaqifion.github.io/note-trainer/index.html?build=b6f44fffb5`.

Documentation updated: LEVELS, user guide, tracker, and release audit. AGENTS, README,
development, cloud operations, and teacher portal docs reviewed unchanged because their
generation rules, capabilities, release procedures, storage, and permissions remain valid.

## Earlier placement and symbolic-menu correction, 2026-11-09

The user clarified skill 10: every tier now places one note inside the staff, followed
by five notes on requested upper/lower ledger lines/spaces. The previous Easy/Normal
naming behavior is superseded. Skill 8 retains compact sentence dropdowns, with clef
SVGs, arrows, Arabic digits, and line/space diagrams instead of written options.
Skill 11 scales the whole standard keyboard uniformly, replacing independent card-height
stretching. Four face-up matching rounds remain. See the
[correction audit](audit_20261109_placement_symbols/audit.md).

Final local build: `09f63dc4c3`. Full required release suite passed: 54 Node tests,
1,144 scheduling boundaries, 55,080 generated sessions, four-viewport layout/card
checks, all 18 placement confirmations across three tiers, symbol-choice correction,
and storage, backup, sync, cloud/portal fixture, and offline-upgrade browser suites.
Published-file hashes match both local origins. All four actual Safari/Chrome receipts
across 127.0.0.1 and localhost acknowledged this build; local release status is ready.
Local preview: `http://127.0.0.1:8773/index.html?build=09f63dc4c3`.
No push or deployment was performed. Physical iPad touch accuracy remains unverified.

Documentation updated: AGENTS, LEVELS, README, user guide, tracker, and correction audit.
Development, cloud operations, and teacher portal docs reviewed unchanged because
release mechanics, storage, cloud behavior, and permissions are unaffected. Historical
audits and the earlier local build records below are retained with their original scope.

## Earlier touch and matching refinement, 2026-11-09

Build `ce29b4d8fb` simplifies skills 8/10 position naming to four native dropdowns.
All shared answer keyboards are taller (190–300 CSS pixels outside short landscape),
with a 1,200-pixel full-width cap and local groups up to 80 pixels per white key.
The complete 15-key pitch range remains available. Narrow screens still constrain
full-keyboard key widths; physical iPad touch accuracy remains unverified.
Skill 11 now uses four face-up rounds: name/key, name/staff, key/staff, and duration/beats.
It shares the standard keyboard renderer and colors; compact SVGs fit complete clefs,
staffs, ledger lines, and notes inside cards. Mismatches stay visible; matches stay marked.

Verification: full local release passed 54 Node tests, 1,144 scheduling boundaries,
55,080 generated sessions, four-viewport layout/card containment checks, and all
storage, backup, sync, cloud/portal fixture, and offline upgrade browser suites.
Both local origins passed published-file hash checks. Actual Safari/Chrome receipts
across 127.0.0.1 and localhost all acknowledged build `ce29b4d8fb`; local status is ready.
Local preview: `http://127.0.0.1:8773/index.html?build=ce29b4d8fb`.
No push or remote deployment was performed.

Documentation updated: AGENTS (four-round invariant), LEVELS, user guide, this tracker,
and the [refinement audit](audit_20261109_touch_matching/audit.md). README reviewed
unchanged because its general capability summary remains accurate. Development, cloud
operations, and teacher portal procedures remain unchanged because release mechanics,
permissions, storage, and cloud behavior are unaffected. Earlier audits are historical.

## Local instructional update, 2026-11-09

Skills 8–11 now have pictorial ledger choices, fixed clef-specific contrast groups,
ledger placement on Hard, and three card-matching modes. See the
[instructional audit](audit_20261109_skills/audit.md) for decisions and verification scope.
Local build: `6cd59fcd9e`. `npm run release -- --local --local-only --no-open --port 8772`
passed the complete required suite: 54 Node tests, 1,144 scheduling boundaries, 55,080
generated sessions, 16 question variants across four viewports, and all browser suites
for storage, backup, cloud/portal fixtures, and offline cache upgrades. Published-file
hashes matched both local origins. CUA opened the generated reset URLs; all four
Safari/Chrome receipts across 127.0.0.1 and localhost acknowledged the exact build.
The ignored release status was updated to local-only ready from those actual receipts.
Local preview: `http://127.0.0.1:8772/index.html?build=6cd59fcd9e`.
This version has not been pushed or deployed; the accepted remote baseline below is unchanged.

Documentation reviewed: updated AGENTS, README, LEVELS, development guide, user guide,
this tracker, and the new audit. Cloud operations and teacher portal docs were reviewed
unchanged because cloud behavior and permissions are unaffected. Historical audits retained.

## Current accepted delivery

| Item | Accepted result |
|---|---|
| Runtime build | `b6f44fffb5`, instructional and left/right matching release |
| Game commits | Frontend `3862334`, pushed; prior cloud release `ac86b85` / `d8d55a2` / `d07e0de` retained |
| Database | Migrations 001–004 applied; migration 004 succeeded before dependent client publication |
| Release verification | Pages file hashes matched; six Safari/Chrome receipts ready for `b6f44fffb5` across Pages, 127.0.0.1:8773, and localhost:8773 |
| Teacher access | Reusable invitation, ASCII-alphanumeric username, saved random key; ordinary teachers need no MFA |
| Administrator | Separate unlinked `manage.html`, allowlist, owner-entered password/TOTP; invitation and teacher views accepted |
| Default student flow | Ordinary New Student creation automatically enrolls and syncs labels, progress, and answers; offline queue and idempotent retry |
| Live acceptance | Existing synthetic teacher, one synthetic `AUTO01` student, one answer read back from cloud; no manual binding or forced download |
| Health check | Three daily GitHub runs configured; initial run passed; no service-availability guarantee |

Frontend release evidence: [left/right release audit](audit_20261109_left_right_release/audit.md).
Cloud acceptance evidence: [automatic-sync audit](audit_20261105_automatic_students/audit.md) and
[portal audit](audit_20261105_portal/audit.md). Prior device/network/capacity limits remain.

## Historical pre-portal delivery baseline

| Item | Recorded result |
|---|---|
| Main delivered feature commit | `f320c18`, pushed to origin/main in the preceding implementation task |
| Accepted runtime build | `13d5d3b4a4` |
| Release verification | All files matched across Pages, 127.0.0.1:8766, and localhost:8766; Safari/Chrome six-load receipts ready |
| Ordinary-page synthetic class | Two completed answers read back field by field; second-device recovery, cloud-request failure refresh, and lost-receipt retry passed |
| Permissions and disaster recovery | Teacher recovery, cross-student denial, researcher write 403, code/original-device revocation, and two-answer restore into an empty local database passed |
| Fully offline | Bound profile refreshed with SW enabled and all networking disabled; question rendered and original two records retained |
| Real learners | Explicit per-learner backup/binding exists; this work did not automatically upload existing real profiles |
| iPad audio | User confirmed piano/Chinese/letters at first launch, background return, and lock-screen return; OS and Safari/home-screen mode unspecified |

Evidence: [production audit](audit_20261105_production/audit.md),
[cloud operations](cloud_operations.md), and [backup audit](audit_20261105_backup/audit.md).
The prior iPad confirmation was for build `156b85e041`; later changes affected exports,
sync scope, and module URLs, while synthesis, speech, and diagnostics logic remained
unchanged. Do not describe this as a fresh iPad test of the final build.

The earlier tracker also said that its round had no push. That statement applied to the
backup-only stage (build `950868f0bf`), not the subsequent production delivery above.
Documentation commits may now be ahead of the last runtime-delivery commit. That documentation-only task had no push or deployment authorization; the subsequent
portal and automatic-sync implementation were explicitly authorized for deployment.

## Priorities and remaining work

| ID | Topic | Current status | Next action |
|---|---|---|---|
| NT-001 | Long-term local retention and full backup/restore | Restore implemented and tested; capacity strategy incomplete | Interrupted staging cleanup, iPad write/capacity measurements, deeper semantic validation, ordinary multi-tab concurrency |
| NT-002 | iPad startup/audio readiness | Ordinary settings diagnostics shipped; three scenarios user-confirmed | If reproduced, record OS/mode, export diagnostics, and test offline/mute/disabled-sound cases |
| NT-003 | Cloud sync and researcher management | Cloud-default student creation, teacher portal, scoped recovery, and synthetic live acceptance passed | Continued off-device backups, explicit new-device progress loading, regional networks, service pause recovery, abuse/capacity review |

## Teacher portal implementation, 2026-11-05

Local work adds reusable invitations, ASCII-alphanumeric case-insensitive usernames, random
teacher keys, a separate MFA-protected `manage.html`, owner-maintenance SQL preparation, and
a dedicated database-health workflow. Local build `29d4243781` passed the full required
regression suite and four Safari/Chrome local-origin navigation receipts. See
[operations/design](teacher_portal.md) and [acceptance audit](audit_20261105_portal/audit.md).
Migration 003 has been applied and feature commit `59d8018` pushed to the existing game remote.
At that stage, Pages files matched build `29d4243781`; the current build is listed above. Health workflow run `42040722798` passed on GitHub;
its URL variable and publishable-key secret are configured. The dedicated administrator was owner-created and allowlisted, and the owner completed
live password/TOTP login. Both management tabs and all six Safari/Chrome release receipts
across Pages/127.0.0.1/localhost are verified for build `29d4243781`. No real learners were
enrolled and no live teacher-registration claim is inferred from local fixtures. Local release evidence is recorded separately in
`docs/audit_20261105_portal/audit.md`. Preserve existing legacy accounts and synthetic identities.

## Completed, do not rebuild

### Local data protection

- Removed silent trimming above 8,000 events; already-trimmed history cannot be recovered automatically.
- Save each completed answer immediately instead of using the old 500 ms delay.
- Preserve legacy events, autoHistory, battery, and monotonic sequence counters during migration.
- Full-roster v1 JSON includes accounts, internal IDs, progress, selections, stars, complete
  events, pre/post batteries and associations, local salt and PIN hashes. No plaintext PINs
  or cloud Auth sessions. Backups are unencrypted and require private storage.
- Teacher export/restore validates the archive, stages a new storage generation, then commits
  the roster once. Failures leave active data intact. Same names are not merged.
- Restore preserves the previous generation and provides a pre-restore snapshot export.
  An old page cannot save over a different restored generation.
- Tests cover full roundtrip, same/changed names, duplicate import, malformed/missing/future
  versions, failures at each write point, stale pages, and failed single-profile imports.
  The former unchecked task to validate all these cases was stale; deeper field semantics
  and real-device interruption/capacity remain open.

### Sync reliability and isolation

- Isolated `nt.sync-test.*` accounts, state, authentication, and receipts never upload real profiles.
- Synthetic answers receive stable UUIDs before upload. Only allowlisted fields leave the device;
  names, PINs, and account objects are excluded.
- A bounded ten-second window sends at most 50 items per batch. Continuous saves do not
  postpone the deadline; synchronized idle checks make zero database requests.
- Complete matching batch receipts are required. Offline, partial/lost receipts, or failed
  receipt storage preserve local answers and IDs.
- Temporary failures use exponential backoff/jitter and Retry-After. Permanent identity,
  permission, or configuration errors pause automatic retry.
- A rejected access token is refreshed once. Missing established sessions do not silently
  create replacement identities.
- Startup scans recover answers saved before asynchronous module initialization. Missing
  state, duplicate participants, or duplicate event IDs stop before network requests.
- Real-browser regressions cover native timer binding, lost receipts, refresh, readback,
  and the isolated single-writer lock. Read-only remote verification preserves prior receipts.

### Production identity and authorization

- Strong, revocable recovery codes map separate Auth identities to teacher,
  student, or readonly researcher permissions. Portal teacher keys have no fixed annual
  expiry; legacy/student/researcher grants retain expiry. The local PIN is not server authorization.
- Cloud-bound profiles use a same-origin single-writer lock and revision conflict checks.
  Loading cloud progress retains a local snapshot and merges unconfirmed events.
- Bound profiles reject overwrite imports and research-log clearing. Unbound ordinary
  profiles still lack automatic multi-tab practice merging.
- Automatic teacher enrolment preserves an internal local snapshot without a forced
  download; the first verified workspace can adopt unowned local profiles, as authorized.
  Profiles owned by another workspace are never reassigned. Legacy manual binding remains
  in advanced compatibility tools. Legacy events without IDs receive stable UUIDv5 values based
  on cloud-student UUID and canonical fields; existing UUIDs are preserved.
- Changes to roster/state during asynchronous binding stop overwrite. Cloud management
  actions are serialized. In-flight requests retain the originating Auth transport.
- Shared-device queues follow current role: teacher's class, student's own profile,
  researcher no upload. Local updatedAt alone causes no cloud progress write.
- Class disaster recovery, empty-database restore, role denials, and revocation have live
  synthetic evidence. These were stale unchecked tasks in the previous tracker.
  Historical archives may be restored after code expiry without renewing expired codes.
- Production ESM uses build-versioned URLs. Old-worker upgrade and full offline module
  graph regressions preserve storage and avoid stale-module responses.

### Startup/audio

- Settings offers separate piano, Chinese speech, and letter diagnostics, retry, gesture
  resume, voiceschanged handling, bounded checks, and local diagnostic export.
- Piano is synthesized; there are no sample downloads. Available voices or a running
  AudioContext do not prove audible sound. Database failure does not block local practice.
- Diagnostic exports omit student data and credentials and are not uploaded automatically.

## Evidence and limits

- [Initial integration audit](audit_20261105/audit.md): actual game-generated synthetic
  answers, refresh/readback, and lost-receipt retry on two local profiles.
- [Pressure/release audit](audit_20261105_pressure/audit.md): real Supabase, 1,000 unique
  records, at most four concurrent requests, full payload readback, overlapping retry
  deduplication, cross-identity isolation, and conflict rollback. Second round reused IDs.
- The two rounds used 50/48 HTTP requests, with header-latency p50 207/279 ms and p95
  733/818 ms. These are not full-response, regional-network, or free-tier capacity results.
- A 10,000-event local backlog produced exactly 200 nonempty batches and one registration;
  idle checks made zero requests. Independent Chrome HTTP fixtures are separate from live
  database evidence. Earlier CUA readbacks were local 5/5 and remote 2/2.
- Historical pre-portal full regression: 46 Node tests, 1,144 scheduling boundaries, 45,900
  generated sessions, four viewports, reports, SW/offline, cloud faults, roster restore,
  storage barriers, and old-cache upgrade. These tests were not rerun for translation.

Open boundaries: iPad large-history writes/capacity; cleanup after unexpected staging
termination; full semantic validation; unbound ordinary concurrent practice; representative
mainland China/Hong Kong networks; long low-activity service pause recovery; all OS/mode,
fully offline and mute audio scenarios; larger operating scale and ongoing abuse controls.
No claim of unlimited retention or universal reliability is justified.

## Next-session workflow

1. Read this guide, the relevant audit, and current Git status. Continue open work rather
   than rebuilding implemented restore, identity, or permissions.
2. For device/network issues, reuse existing synthetic identities and recovery codes.
   Do not rerun passed live pressure tests without a changed implementation or validation goal.
3. Follow the authorized cloud-default student flow and workspace isolation. Reuse existing
   synthetic accounts for checks; never modify real learner data for testing. Preserve the
   documented privacy boundary for labels and local PINs.
4. Follow the mandatory [work-completion pipeline](development.md#work-completion-pipeline),
   including documentation disposition and post-release evidence. Run the full release
   pipeline only when runtime delivery changes.

Runtime paths, never print or commit their contents:

- `secrets/api_keys.md`: ignored publishable-key configuration; never use secret/service-role keys in the client.
- `.release/pressure_identity.json`: reusable pressure identity/session.
- `.release/browser_test_config.json`: public client configuration loaded into an isolated page's memory.
- `.release/cloud_live/`: synthetic identities, sessions, recovery codes, and live evidence.
- `.release/status.json`: release receipts; read-only verification must preserve it.
- `.release/cloud_bootstrap.txt`: one-time live bootstrap credential.

The synthetic Supabase project is `note-trainer-synthetic-test`, Singapore region;
isolated table/RPC: `nt_sync_events`/`nt_sync_batch`. Production tables are separate.
The last accepted release used a dedicated local server on port 8771; check its source fingerprint before reuse
and never kill an unknown process. `sync_test=1` selects the isolated test entry.

Commands, only as needed:

```bash
npm test
npm run verify:remote
NT_REMOTE_TEST_BASE=https://fangjiaqifion.github.io/note-trainer/ node tests/smoke.mjs
node scripts/database_pressure_test.mjs --execute
```

The live pressure command is not part of routine handoff or documentation verification.
Game commits/pushes belong here; the parent updates its pointer locally and is not pushed.
The parent's pre-existing untracked `.statamcp/` is unrelated and must remain untouched.

## Cloud-default student update, 2026-11-05

The user authorized automatic teacher-owned student enrolment and synchronization, replacing
the manual participant-code/binding workflow. Local build `e30cc2ef11` passed the full release regression suite. Migration 004 was
applied successfully to the live project before the client update. Pages now serves build `e30cc2ef11`; all six Safari/Chrome release receipts across
Pages, 127.0.0.1, and localhost are verified. Feature commit `ac86b85` and generated
release commit `d8d55a2` were pushed to origin/main. See
[automatic student acceptance](audit_20261105_automatic_students/audit.md). Automatic full local snapshots, offline queues,
idempotent enrolment, state/roster race protection, and private display labels are covered
by targeted checks. PIN hashes remain local; researcher access excludes names.

The supplied invitation was separately tested against the live portal: one synthetic teacher
`portalqa20261105` registered, copied/saved its random key, and logged in through a fresh private
Safari session with an uppercase username. No MFA was required. Exactly one registration was
performed; the synthetic key is retained privately under ignored `.release/portal_live_invite/`.
No real learners or administrator credentials were used.

Live acceptance reused the synthetic teacher above, created only `AUTO01` through the
ordinary New Student dialog, and read back its private display label and one correctly
answered practice item through the cloud report. No manual binding, participant-code
entry, or forced backup download occurred. The administrator dashboard showed one
invitation slot used out of ten. No additional teacher registration was performed.

## Documentation completion review, 2026-11-05

Updated parent/game AGENTS, development completion pipeline, portal delivery/onboarding
instructions, cloud operations, and parent/game trackers. Reconciled the current baseline,
cloud-default ownership, credential expiry, and legacy compatibility guidance. README and
LEVELS were reviewed unchanged: published capabilities already match the release, and
instructional design is unaffected. Dated acceptance audits were retained as evidence.
Validation: changed local Markdown links, stale-guidance review, and Git whitespace checks.
No runtime files changed; no new release, browser, or database acceptance is claimed.
Future work must run this documentation gate without another user reminder.
