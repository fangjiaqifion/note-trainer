# Production Cloud Deployment Review

Last updated: 2026-11-05 (English revision)

Historical pre-deployment review. Later migration and live acceptance are recorded in
[audit.md](audit.md); pending items here describe the review stage, not current status.

## Prepared database changes

`scripts/migrations/001_cloud.sql` is a single transaction creating dedicated
`nt_cloud_*` tables and the `nt_private` schema. It neither reads nor rewrites the old
`nt_sync_events`, changes existing identities, nor automatically uploads local learners.

- Enrollment is closed by default; an administrator one-time bootstrap code creates a class.
- Supabase anonymous Auth issues identities; only SHA-256 recovery-code hashes are stored.
- Teachers access their class; students one bound student ID; researchers authorized readonly classes.
- RLS is enabled; clients cannot write tables directly and must use permission-checking RPCs.
- Codes are revocable, expire in a year, and allow ten active devices; original devices are revocable.
- Events are append-only, fifty per batch, with all-or-nothing conflict rollback; progress uses optimistic revisions.
- Limits are 20,000 new events/student/day and 500 students/class.
- Class disaster export uses one MVCC snapshot; administrator restore refuses existing classes.
- Browser export caps are 50,000 events and 25 MiB payload, failing explicitly without truncation.

At review time, real local PostgreSQL-engine tests covered RLS, role denials, retries,
revocation, conflicts, and empty-database restore. Live Supabase acceptance required
migration followed by an ordinary-page synthetic class.

## Bootstrap and console boundary

The initial code is a server-access credential, generated/retained in the database
console and never committed. After migration approval, execute the migration, then
the one-time statement below. It produces a code valid for 24 hours and one use.
Never paste the result into chat. This historical recipe is not authorization to run it.

```sql
with token as materialized (
 select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') as secret
), inserted as (
 insert into nt_private.bootstrap(hash,expires_at)
 select sha256(convert_to(secret,'UTF8')),now()+interval '24 hours' from token
 returning hash
)
select secret as bootstrap_code from token,inserted;
```

Load existing publishable client configuration locally; do not publish keys or recovery
codes. After class creation, download the teacher recovery code before backing up and
binding learners individually. Original test and class tables are physically separate.
Real learner enrollment follows synthetic online acceptance and explicit teacher choice.

## Acceptance required at review time

- Server migration/permissions and ordinary Pages synthetic workflows.
- All deployed hashes and actual Safari/Chrome load receipts.
- iPadOS Safari/home-screen startup, background, lock, offline, and three audible channels.
- Mainland/Hong Kong networks, low-activity pause recovery, long-term capacity/write times.
- Separate operational backups: class archives omit Supabase configuration, Auth/audit,
  and other project objects. The service review recorded no downloadable free managed
  backup; retain schema/config and offline class archives, and use administrator dumps
  for scale or a budget-approved managed upgrade. Recheck service terms when needed.

Local implementation alone is not universal production readiness. Later evidence resolves
some of these items; the current tracker preserves the remaining limits.
