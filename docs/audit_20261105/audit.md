# Game-to-Database Integration and Startup Diagnostics Audit

Last updated: 2026-11-05 (English revision)

Historical stage, 2026-11-05 Asia/Shanghai. Only isolated synthetic profiles were integrated;
existing learners were excluded. Later implementation supersedes the stage-specific gaps.

## Scope and outcome

Fixed project: `note-trainer-synthetic-test`, Singapore; no schema/permission changes.
Actual game-generated answers reached the real API and matched field-by-field readback.
No old learner histories, names, or PINs were uploaded. This advanced beyond constructed
API payloads but was not production learner sync.

Historical local entry: `http://127.0.0.1:8766/index.html?sync_test=1&build=f81186d7a2`.
At this stage test entry was loopback-only, using separate `nt.sync-test.*` roster/state/
Auth/receipts and explicit test-profile creation/switching. Ordinary mode stayed local.

## Findings and fixes

1. Replaced the 500 ms answer-save delay with immediate successful-answer persistence.
   Sync reads successfully persisted state only.
2. Removed silent trimming above 8,000 events. Cannot restore previously deleted history;
   large-state serialization/write behavior on iPad remained unmeasured.
3. Allocate a test UUID per answer, separate from display name/sequence; upload only allowlisted fields.
4. Require complete batch-ID acknowledgement before local receipts. Timeout/partial receipt/
   failed receipt storage is not success.
5. Fifty items per batch, coalesced scheduling, exponential retry up to 60 seconds, online retry.
6. Failed Auth refresh never creates a replacement identity. Eight-second network limits
   keep local practice independent.
7. Whole-page test Web Lock prevents another test writer; sync separately serializes Auth/
   receipt work. Ordinary multi-tab conflicts were not solved at this stage.
8. Development configuration endpoint allows loopback and correct Host/Origin only; static
   secrets are denied. It supplies publishable configuration, never secret/service-role keys.
9. Added modules to fingerprints, SHA-256 manifests, reset checks, and SW offline bundle.
   A real new-page/old-module mix was resolved through full cleanup and hash verification.
10. One gesture resumes AudioContext, builds reverb, checks Chinese/English voices, and
    separately checks Auth+real empty-batch RPC. No fake answers inserted. Audio checks have
    four-second timeout/retry and individual timings. Voice availability is not audibility;
    settings audition remains necessary. At this stage diagnostics were isolated-entry only.

## CUA evidence

In the in-app browser, created TEST-1, answered C incorrectly as D then correctly, and
completed D. Created TEST-2 and completed B. Real-server readback matched all three full
payloads/profile IDs/event IDs. Refresh retained both profiles and reused Auth; readback 3/3.
A second tab showed an isolated-test lock and could not write.

On build f81186d7a2, deliberately dropped the next successful acknowledgement and completed
another D. The server accepted it while the client showed pending; automatic retry left
exactly four matching events across two profiles. Only synthetic identities/records changed.
Screenshot: `/private/tmp/note_trainer_sync_proof.png`, runtime evidence, not committed.

| Observation | Time |
|---|---|
| First config load | 6 ms |
| First anonymous Auth + empty RPC | 2646 ms |
| Refresh/reused identity + empty RPC | 872 ms |
| Answer confirmations | 162, 365, 781 ms |
| Readbacks | 238, 261, 329, 778 ms |
| AudioContext/reverb | 10–11 ms |

Auth/RPC timing was combined, not pure SQL time. These few observations do not cover iPad,
mainland direct access, or Hong Kong networks.

## Regression and final local release

Added state/allowlist/namespace isolation, 51-item batching, lost/partial receipts, failed
receipt storage, immediate recordAnswer save, and event 8001 retention to game_sync tests.
Existing queue/Auth-refresh faults remained. The outdated manifest correctly failed the
first full run; regeneration then passed 45,900 sessions, four viewports, cache isolation,
offline recovery, and error receipts. Simulated failures were not presented as physical iPad offline tests.

`npm run release -- --local --no-open --port 8766` passed automation, build f81186d7a2.
Both local origins matched all hashes. CUA opened Safari/Chrome reset pages; four local
actual-load receipts matched and were recorded in ignored status.json. The remote old
manifest lacked new modules, so strict validation rejected it; no push and no weakening.
Full-scope status remained prepared, not six-target ready.

Endpoint checks: secrets/.git 404, foreign-Origin configuration 403, mjs JavaScript MIME.
Automatic approval review rejected a compatibility proposal for the old incomplete manifest;
it was not executed. Strict integrity/local-versus-remote boundaries were retained.
CUA typing once lost URL punctuation and opened search; exact paste corrected navigation.
Only actual game boot counted. Receipt tokens were short-lived loopback navigation values,
containing no database key, identity session, or student data.

## Gaps at this stage

Full roster backup/restore, lost-identity recovery, cross-device mapping, teacher/researcher
permissions, abuse protection, ordinary stable IDs/migration/concurrency/capacity, iPad
first audio/background audibility, and mainland/Hong Kong testing were still future work.
No push/deployment occurred in this stage. Read current tracker for later completions.

Historical service references:
[anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous) and
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
Anonymous server identity and the local PIN are distinct layers. Links were not rechecked
for this documentation translation.
