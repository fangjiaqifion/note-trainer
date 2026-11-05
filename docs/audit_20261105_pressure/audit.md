# Local Reliability, Database Pressure, and Remote Release Audit

Last updated: 2026-11-05 (English revision)

Historical stage: user authorized pressure tests, fixes, push, and remote revalidation.
Used the existing synthetic Supabase project, no real student profiles or schema/permission
changes. Later production identity/backup features are recorded separately; the gaps below
are stage-specific. No live actions were repeated for translation.

## Real database pressure

`node scripts/database_pressure_test.mjs --execute` was bounded at two synthetic identities,
1,000 records, fifty per batch, four concurrent requests. This was neither a capacity limit
nor DoS test. Ignored `.release/pressure_identity.json` retains identities/sessions; reruns
reuse IDs rather than creating identities or accumulating unique records.

Passed full payload readback, overlapping concurrent idempotency, cross-identity isolation,
whole-transaction rollback when a later event conflicts, and preservation of existing payloads.

| Measure | First round | Second round after deployment |
|---|---|---|
| Unique records | 1,000 | Same 1,000 |
| Initial batches | 20 | Reused IDs |
| Overlapping retry batches | 4 | Repeated verification |
| HTTP calls, including Auth/readback/negatives | 50 | 48 |
| Maximum in flight | 4 | 4 |
| Header latency p50/p95/max | 207/733/1366 ms | 279/818/859 ms |

Timing stops at response headers, excluding complete body parsing. These are local-network
observations, not mainland/Hong Kong/iPad performance or free-tier capacity conclusions.

## Reliability fixes

- Bounded ten-second batching deadline does not reset under continuous saves; fifty records
  per serial batch. No synchronized-idle config/Auth/empty RPC requests.
- Explicit startup diagnostics alone send the empty diagnostic RPC. Server verification
  reuses Auth without a preliminary diagnostic call; no polling/realtime/per-question reads.
- Temporary retry uses exponential backoff/jitter and Retry-After, unaffected by save storms.
  Permanent config/Auth/permission errors pause until correction/manual retry.
- Refresh rejected access tokens once; do not replace identities or recreate missing established sessions.
- Corrupt local receipts/rosters fail closed, keeping answers. Scan saved answers after async
  module startup without requiring another question.
- Real-browser testing exposed native setTimeout/clearTimeout this-binding failure missed
  by Node tests; fixed and added browser regression.
- Local save and server confirmation remain separate. Failed/lost responses and receipt
  persistence failures retain answers and original UUIDs.

## Automated and browser evidence

`tests/game_sync.test.mjs`: 10,000 pending events → exactly 200 nonempty batches, one
registration, zero idle requests; 1,000 saves retain one deadline; offline zero requests;
429 waiting survives save storms; 403 pauses; malformed receipts fail closed. Also lost/
partial receipts, local write failure, and retention of event 8001.

`tests/sync_browser.mjs`: independent Chrome UI profiles/answers, simulated HTTP outage,
refresh preservation, dropped successful acknowledgement, deduplicated retry, full readback,
and second-tab lock. Its in-memory HTTP receiver is distinct from real Supabase/CUA evidence.
The existing suite retained 45,900 sessions, four viewports, cache isolation, SW offline,
and error receipts. `NT_REMOTE_TEST_BASE` targets a fixed Pages build with isolated data.

## Remote isolated entry

Only explicit `sync_test=1` enabled isolated remote testing at this stage. Ordinary profiles
did not upload. A file chooser loaded public publishable-key configuration into page memory,
not GitHub, URLs, or logs; remote pages did not read loopback configuration endpoints.
RLS, field allowlists, storage separation, and writer locks were retained. This stage did
not establish production identity recovery, full-roster restore, teacher/researcher roles,
or iPad first-launch audio acceptance.

## Recorded final delivery

- Feature `661501c` pushed by `npm run release -- --push --no-open --port 8766` to origin/main.
  Build `34156b64c6`. Full local regression passed after fixes and again before release:
  23 Node subtests, 45,900 sessions, four viewports, SW/cache/offline and browser sync faults.
- Remote full smoke passed with `NT_REMOTE_TEST_BASE=https://fangjiaqifion.github.io/note-trainer/`.
  Settings/meta both showed `34156b64c6`; remote evidence was not substituted with local source.
- Repeated pressure reused all 1,000 IDs with matching payloads, concurrency deduplication,
  isolation and rollback. Additional real API negatives: B POST owner=A returned 403;
  unauthenticated read denied; PATCH/DELETE of nonexistent test IDs returned 403. Existing
  records were neither updated nor deleted; permissions were not expanded.
- Local CUA read back existing UI answers 5/5. Remote CUA loaded public config from a file,
  created an isolated profile, answered C first as D then C, completed D while dropping its
  success receipt, and verified retry left exactly 2/2 matching complete payloads.
- CUA observed first Auth+diagnostic RPC 2158 ms, answer confirmation 442 ms, retry 365 ms,
  readback 362 ms, audio initialization 14 ms. These are a few local-network observations.
- CUA opened Safari/Chrome for Pages/127.0.0.1:8766/localhost:8766. All three origins matched
  file hashes; six one-time actual-load receipts matched the build, status ready. No claims
  were made about unknown servers on other ports.
- Runtime screenshot: `/private/tmp/note_trainer_remote_audit_proof.png`. Keys, sessions,
  profile backups, and raw pressure state were not committed.

## Final read-only-verification fix and limits

A final review found `--verify-remote` overwrote six-target ready status with server-verified.
Fixed preservation and added a regression executing that branch; the old saveReport call
would fail it. Three release regressions passed; actual remote hash verification preserved
`.release/status.json` byte for byte, still six-target ready. This script/test-only fix did
not change runtime files/build, require another cache reset, or repeat database pressure.

Evidence establishes bounded low-load batching, identity reuse, zero idle calls, and the
specific fault/permission cases. It cannot guarantee all networks or determine maximum
free capacity. Formal learner recovery/binding, full-roster restore, roles, abuse controls,
and physical iPad acceptance were future work at this historical stage, some completed later.
