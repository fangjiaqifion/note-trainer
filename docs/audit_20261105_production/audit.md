# Controlled Cloud Release Audit

Last updated: 2026-11-05 (English documentation revision)

Historical implementation and acceptance record for NT-003/NT-002 after roster protection.
The user selected strong recovery codes and explicitly authorized separate-table migration
in the existing Supabase project, Pages publication, and synthetic online acceptance.
No real learner profiles were automatically read/uploaded; old `nt_sync_events` was unchanged.
This translation does not execute or repeat those actions.

## Implementation and review

- Added cloud_client.mjs/cloud_ui.mjs using existing authenticated transport without
  changing question types or instructional randomization.
- Administrator bootstrap, class-scoped teacher, single-student access, and readonly
  researcher roles are enforced by RLS and checked RPCs.
- Recovery codes store SHA-256 hashes, last one year, allow ten active devices, and support
  code/device revocation including the original device. Each code uses a distinct Auth
  identity, preventing teacher JWT reuse after switching roles.
- Local-first persistence, ten-second/fifty-item batching, full receipts, stable UUIDs,
  idempotent retry, and zero idle database reads.
- Progress revision CAS supports lost-receipt same-content retries; concurrent conflicts
  pause without discarding local state. Cloud load is explicit.
- Snapshot/download before binding; preserve previous roster and merge unconfirmed events
  on another device. Same-ID conflicting payload stops. Bound profiles reject overwrite
  imports/log clearing and require a same-origin writer Web Lock.
- Local save failure pauses advancement, allows in-memory export/retry without double
  counting, and warns before leaving.
- Class disaster export is one MVCC snapshot; administrator transactional restore refuses
  existing classes. Recovery hashes let new Auth identities recover ownership.
- Ordinary settings gained separate piano/Chinese/letter diagnostics, bounded gesture
  resume/voiceschanged handling, background retry, and local diagnostic exports.
- Release verification waits for modules; failed imports return failure receipts. Temporary
  verification pages neither take cloud writer locks nor sync or modify learner state.

## Regressions found and fixed

1. Roster validation incorrectly rejected a new student device without a local teacher PIN.
2. SQL parameter/column ambiguity was found through real local PostgreSQL-engine tests.
3. Explicit restore with a nonrevoked code can reauthorize a revoked device, still respecting
   ten active devices.
4. Saves during in-flight sync no longer lose their rescan notification; timer versions track it.
5. Failure injection prevents successful release receipts before asynchronous modules load.

## Database execution and initial validation

The logged-in Supabase SQL Editor reported `Success. No rows returned` for the migration.
Executed migration SHA-256:
`8d8fa5c9155bf034ea179a09981093f7a4d1b7b5026e97d8641fe05cf4e45227`.
The user generated the first bootstrap code in the console and downloaded it to ignored
local storage without printing/committing credentials. Future database fixes need new
incremental migrations; editing an executed file does not change the server.

Real local PostgreSQL (PGlite) covered same/cross identities, role negatives, direct-table
write denial, code/device revocation, whole-batch rollback, UUID idempotency, revision
conflicts, same-state lost receipts, empty-database restore, original-code/new-identity
recovery, restore permissions, and overwrite denial.

Ordinary-page synthetic UI tests created/bound profiles, answered questions, restored in
another context, retained offline answers across refresh, retried dropped success receipts,
and displayed readonly researcher reports. The receiver was a restricted HTTP adapter over
real local PostgreSQL, distinct from real Supabase. Audio unit tests covered gesture resume,
coalescing, timeout, late voices, and retry, not physical sound. Save-failure tests blocked
advancement and resumed only once without duplicate events.

## Live and manual acceptance

- Feature commit `94a9585` was pushed; build `156b85e041` matched all thirteen release
  files and six actual Safari/Chrome loads across three origins.
- Ordinary Pages, no sync_test and no fabricated answers: created synthetic teacher/student.
  Real Supabase core flow used 29 HTTP requests. Two answers matched field by field;
  second-device recovery, refresh with cloud requests blocked, lost-success retry,
  researcher readonly reports and write 403 passed.
- Separate full-network-offline check reused that student with SW allowed, refreshed,
  opened a question, and refreshed again, preserving the same two answers. No additional
  answers; cloud-request failure alone was not presented as full offline testing.
- Automatic approval review initially rejected later permission changes because general
  synthetic-testing authorization did not cover specific additions/revocations. Only after
  explicit itemized user authorization: recovered a new synthetic teacher with the existing
  code, added QA-SECONDARY, verified cross-student denials/researcher 403, revoked a researcher
  code and original teacher device, and confirmed old access failed.
- Live class archive held two synthetic students/two events. Restored into a separate empty
  PostgreSQL database, preserving IDs, associations, and payloads; the original valid teacher
  code recovered permissions for a new Auth identity. No active Supabase class was deleted/restored.
- User explicitly confirmed piano, Chinese, and letter audio on iPad first launch, background
  return, and lock-screen return. No iPadOS or Safari/home-screen mode supplied; evidence is
  physical-device feedback but does not generalize to all devices.

## Final fixes and build sequence

- URL.pathname encoded spaces/Chinese and put four browser-session evidence files in the
  wrong local directory. fileURLToPath fixed this. A manifest plus SHA-256/bytes verified
  moving four files, 88,392 bytes, back into .release; source emptied, no credential exposure.
- Expired teacher codes previously blocked historical archive restoration. Incremental
  `002_archive_expiry.sql` updated only the administrator restore function, leaving API
  execution denied. Historical data can restore without renewing old credentials; new
  authorization still requires ownership verification. Executed in the real console.
  SHA-256: `c28521c9fb794bdb12eef314173ecb6a3879dcd72ac05665233e6a90c48dd783`.
- CSV gained cloud_workspace/cloud_participant/event_id while retaining participant; cloud
  JSON gained workspace_id/student_id, preventing local-ID differences and repeated P001
  labels across classes from corrupting joins. Export-fix build `df08b997fd` initially had
  five receipts and remote Safari timeout: incomplete, not ready.
- Role-filtered shared-device queues restrict teacher to class, student to self, researcher
  to no upload. In-flight requests retain their starting Auth transport. Scope-fix build
  `0d74cfd3df` subsequently passed all six loads.
- Local updatedAt-only changes no longer cause cloud writes/revision churn; server updated_at
  still tracks actual writes. Added zero-request regression; intermediate build `1d0c66e2f6`.
- Legacy events without IDs use UUIDv5 from cloud-student UUID plus canonical fields. Existing
  UUIDs remain; field order does not create duplicates. Binding aborts if roster/state changes.
  Serialized management UI prevents concurrent identity restores from repeated taps.
- Versioned production ESM prevents stale-worker module mixing. Old-cache fixtures deliberately
  injected unusable modules, then verified online upgrade and complete offline graph with
  storage markers preserved. Cached Response.url initially lost version parameters; synthetic
  responses retaining request URLs fixed the offline dependency failure. Fault routes match
  version query parameters too.
- Final build `13d5d3b4a4`: synthesis, speech, and diagnostics logic unchanged, module URLs
  versioned. The manual iPad evidence remains for `156b85e041`, with missing system details.

## Final recorded delivery and limits

Commit `f320c18` pushed to origin/main, build `13d5d3b4a4`. Full regression passed:
46 Node tests, 1,144 scheduling boundaries, 45,900 generated sessions, four viewports,
reports, original sync faults, roster restore, actual-game storage failures, and old-SW
module upgrade/offline. All Pages/127.0.0.1:8766/localhost:8766 file hashes matched and
six Safari/Chrome load receipts matched, status ready.

The final ordinary-page export reused the recovered synthetic teacher and P001's original
two answers. Workspace/student IDs matched the second device. No new class, permission,
or answers were created. Screenshot remained ignored at
`.release/cloud_live/final_export_report.png`; sessions/codes remained unprinted/uncommitted.
The parent only records the submodule locally and is not pushed.

Controlled per-learner activation is supported; real old profiles were not automatically
uploaded. localStorage capacity remains finite; failed saves stop practice. Retained old
and binding snapshots consume extra space. Interrupted-stage cleanup and iPad large-history
write/capacity measurements remain open. Browser archive caps remain 50,000 events/25 MiB;
class backup is not whole-project backup. Teacher sessions/codes in local storage are not
encrypted and require trusted devices. Mainland/Hong Kong representative networks,
low-activity service pause recovery, broader iPad modes, mute/offline sound, and long-term
operating performance remain unverified. Do not claim universal production readiness.
