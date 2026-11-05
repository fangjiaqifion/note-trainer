# Cloud Accounts, Collection, and Recovery

Last updated: 2026-11-05

Internal operating reference. Ordinary practice can remain offline. Only profiles explicitly
backed up and bound by the teacher synchronize; names and local PINs are not uploaded.
Researchers read authorized participant codes, progress, and answers only. Cloud JSON
retains workspace_id/student_id; local CSV adds cloud_workspace/cloud_participant/event_id.
Use those stable fields for cross-device joins; legacy participant remains a local-profile ID.
Server authorization is separate from the local PIN.

## New teacher portal

The invitation/username/key implementation and its activation boundary are documented in
[Teacher Portal and Administrator Operations](teacher_portal.md). Migration 003 and Pages
publication are complete; initial administrator setup and final browser acceptance remain pending. New teacher keys have
no fixed annual expiry; existing student/researcher and legacy keys retain their prior policy.

## Legacy teacher setup

1. Open the local teacher entry, set/enter its PIN, and create the learner.
2. In cloud management (`云端管理`), load the administrator-provided public client
   configuration file and enter the one-time class bootstrap code.
3. Immediately download the teacher recovery code and keep it safely off the practice device.
4. Enter a participant code such as P001 and choose backup/bind (`备份并绑定学生`). A complete
   local snapshot is saved and downloaded before binding is created.
5. Generate each learner's recovery code in cloud management. Never give a learner the
   teacher code or put a recovery code in a public link.

Codes are high-entropy credentials; the server stores hashes only. They expire in one year
and permit up to ten active devices per code. Different recovery codes use different Auth
identities, preventing reuse of teacher tokens when switching to a student role. Local PINs
are switching guards only. Do not retain teacher/researcher credentials or sessions on
untrusted shared devices; local storage is not an encrypted vault.

## Second device and conflicts

1. Open the ordinary game and choose cloud recovery (`云端恢复`); paste a code or select
   its JSON file.
2. Students see only themselves; teachers their class; researchers readonly reports and
   deidentified exports.
3. Set a four-digit local PIN and load a student. Preserve the current roster snapshot
   first; merge that student's locally unconfirmed answers.
4. Legacy history from the same backup uses stable UUIDv5 deduplication; existing IDs stay
   unchanged. Roster/state changes during migration abort overwrite and require retry.
5. Confirm the old device has synchronized before starting another. Save offline answers
   locally first; send at most 50 per batch on a bounded ten-second schedule.
6. Concurrent progress revisions pause sync rather than overwrite. Export local backup,
   then explicitly load cloud progress. Merge event UUIDs; stop if the same ID has conflicting
   content instead of guessing.

Failed local saves pause advancement and allow emergency in-memory export/retry. Closing
the browser can still lose unsaved memory. Bound profiles reject overwrite imports of old
single-profile JSON and research-log clearing. Cloud events are append-only; deleting a local
profile is not a cloud-delete command. Full-roster restore retains binding IDs but excludes
Auth sessions, so a new device still needs a recovery code.

## Revocation and recovery

Code revocation (`查看或撤销授权`) revokes that code and all devices recovered through it.
Device revocation (`查看或撤销设备`) can revoke one device, including the original bootstrap
device. A valid code can authorize a new device after device-only revocation, so revoke a
lost credential's code too. Before rotating the teacher code, generate/download/confirm
another valid teacher code, then revoke the old one to avoid lockout.

If all codes/devices are lost, a database administrator must verify ownership and arrange
recovery. Display names and four-digit PINs cannot recover cloud access.

## Backups and disaster recovery

- Keep full local-roster JSON and cloud class archives separately, both off-device.
- Teacher cloud disaster export (`导出班级云端灾备`) includes class, students, events,
  progress, and recovery-code hashes from one database snapshot; no plaintext codes/tokens.
- Browser export caps: 50,000 answers and 25 MiB event payload. Exceeding limits fails
  explicitly without truncation; use an administrator database dump for larger archives.
- Administrator `nt_private.restore_snapshot(jsonb)` accepts only absent classes, refuses
  to overwrite live data, and rolls back the transaction on failure. Still-valid teacher
  codes can map new Auth identities after restore; old Auth users/sessions need not be backed up.
  Historical archives can restore after credential expiry but do not renew old codes.
  If every teacher code is expired, an administrator verifies ownership and issues a new one.
- The prior service review recorded no downloadable managed database backups for the free
  project. Recheck service terms before changing an operating plan. Export offline and
  rehearse restore; separately retain schema/configuration/operations records. A class archive
  is not a full Supabase project backup. Confirm budget before any paid upgrade.
- Current application limits: 500 students per class and 20,000 new events per student/day.
  Limits stop new work rather than delete history; administrator review precedes adjustment.

## iPad acceptance

In settings open startup/audio diagnostics (`启动与声音诊断`), run checks, then audition
piano, Chinese, and letters separately and confirm channels actually heard. Local exports
include build, OS/home-screen mode, timings, and manual audition results, excluding student
data/credentials; nothing uploads automatically.

Test cache-cleared first launch, relaunch, background return, lock-screen return, and offline
separately. A running engine or passing Mac/emulator test is not proof of iPad audibility.
The recorded user confirmation and its missing OS/mode details are in the progress tracker.

## Development and acceptance entry points

- Ordered migrations: `scripts/migrations/001_cloud.sql`, then `002_archive_expiry.sql`.
  They are transactional and separate from the isolated test table.
- `npm test` includes real local PostgreSQL-engine permissions/transactions/restore tests
  and ordinary-page synthetic UI workflows.
- Only with explicit live-test authorization, run
  `NT_CLOUD_LIVE=1 node tests/cloud_pipeline.mjs`. It uses ordinary Pages and real Supabase.
  Bootstrap comes only from ignored `.release/cloud_bootstrap.txt`; public configuration
  from `.release/browser_test_config.json`. Identities/codes/sessions remain in ignored
  `.release/cloud_live/`, never printed or committed. Existing identities prevent blind
  creation of another class.
- Do not describe local implementation as universal production readiness. Existing live
  synthetic acceptance supports controlled use within the documented limits; regional,
  long-term, and broader device scenarios remain unverified.

Service reference links retained from the earlier operating review:
[anonymous authentication](https://supabase.com/docs/guides/auth/auth-anonymous),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[function permissions](https://supabase.com/docs/guides/database/functions), and
[backups](https://supabase.com/docs/guides/platform/backups).
These pages were not rechecked during the documentation-only audit.
