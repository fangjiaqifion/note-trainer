# Note Trainer Internal Progress Tracker

Last updated: 2026-11-05

Read [AGENTS.md](../AGENTS.md) first. This is the current implementation and handoff
record. Earlier audits describe their own stages, not current readiness. This English
revision consolidates the previous tracker against its linked final acceptance evidence;
it does not report a new release or repeat live tests.

## Last recorded delivery baseline

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
Documentation commits may now be ahead of the last runtime-delivery commit. This task
has no push or deployment authorization.

## Priorities and remaining work

| ID | Topic | Current status | Next action |
|---|---|---|---|
| NT-001 | Long-term local retention and full backup/restore | Restore implemented and tested; capacity strategy incomplete | Interrupted staging cleanup, iPad write/capacity measurements, deeper semantic validation, ordinary multi-tab concurrency |
| NT-002 | iPad startup/audio readiness | Ordinary settings diagnostics shipped; three scenarios user-confirmed | If reproduced, record OS/mode, export diagnostics, and test offline/mute/disabled-sound cases |
| NT-003 | Cloud sync and researcher management | Explicit binding, recovery, permissions, and synthetic live acceptance passed | Controlled binding, continued offline backups, regional networks, service pause recovery, ongoing abuse/capacity review |

## Teacher portal implementation, 2026-11-05

Local work adds reusable invitations, ASCII-alphanumeric case-insensitive usernames, random
teacher keys, a separate MFA-protected `manage.html`, owner-maintenance SQL preparation, and
a dedicated database-health workflow. Local build `29d4243781 passed the full required
regression suite and four Safari/Chrome local-origin navigation receipts. See
[operations/design](teacher_portal.md) and [acceptance audit](audit_20261105_portal/audit.md).
Migration 003 has been applied and feature commit `59d8018` pushed to the existing game remote.
Pages files match build `29d4243781`. Health workflow run `42040722798` passed on GitHub;
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

- Strong, revocable, expiring recovery codes map separate Auth identities to teacher,
  student, or readonly researcher permissions. The four-digit local PIN is not server authorization.
- Cloud-bound profiles use a same-origin single-writer lock and revision conflict checks.
  Loading cloud progress retains a local snapshot and merges unconfirmed events.
- Bound profiles reject overwrite imports and research-log clearing. Unbound ordinary
  profiles still lack automatic multi-tab practice merging.
- Explicit binding first saves/downloads a complete local snapshot. Real old profiles are
  never silently migrated. Legacy events without IDs receive stable UUIDv5 values based
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
- Final recorded full regression: 46 Node tests, 1,144 scheduling boundaries, 45,900
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
3. Real learner binding remains explicit and preceded by backup. Check actual use against
   the approved ethics/notice arrangements before changing data handling; the earlier user
   reported ethics approval and no institution-specified storage region.
4. Run targeted checks for each change, update evidence/status, and commit complete units.
   Run the full release pipeline only when runtime delivery changes.

Runtime paths, never print or commit their contents:

- `secrets/api_keys.md`: ignored publishable-key configuration; never use secret/service-role keys in the client.
- `.release/pressure_identity.json`: reusable pressure identity/session.
- `.release/browser_test_config.json`: public client configuration loaded into an isolated page's memory.
- `.release/cloud_live/`: synthetic identities, sessions, recovery codes, and live evidence.
- `.release/status.json`: release receipts; read-only verification must preserve it.
- `.release/cloud_bootstrap.txt`: one-time live bootstrap credential.

The synthetic Supabase project is `note-trainer-synthetic-test`, Singapore region;
isolated table/RPC: `nt_sync_events`/`nt_sync_batch`. Production tables are separate.
The last dedicated local server used port 8766; check its source fingerprint before reuse
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
