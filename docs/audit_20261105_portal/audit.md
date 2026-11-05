# Teacher Portal Local Acceptance Audit

Last updated: 2026-11-05

## Scope and delivery status

Implemented reusable invitations, teacher username/key registration and login, a simplified
cloud dialog, an unlinked MFA-protected management page, owner-maintenance SQL preparation,
and a dedicated health-check workflow. Build: `29d4243781`.

No push, Pages deployment, Supabase migration, live registration, administrator provisioning,
GitHub repository-secret update, or scheduled workflow activation was performed. Existing
synthetic live identities, real learners, and cloud records were not used for new tests.

Migration 003 SHA-256: `e7c8134e93e48b9ec3f3d6e228c6ba269b12814d5c430fedfe7f1c2348eb5458`.

## Verification

- Required command: `npm run release -- --local --local-only --no-open --port 8771`.
  The complete Node, scheduling, smoke, sync, backup, cloud, portal, storage, and old-cache
  upgrade suites passed. This run includes 48 Node tests, 1,144 scheduling boundaries,
  45,900 generated sessions, and four-viewport ordinary-game checks.
- A subsequent targeted `node --test tests/portal_database.test.mjs` passed all three
  tests, including the additional bounded health-check/no-secret-logging test and the
  final archive exclusion of administrator-only notes. Runtime assets did not change.
- Real local PostgreSQL-engine tests cover reusable invitation quotas, retry idempotency,
  invalid usernames, case-folded duplicates, cross-class RLS, owner allowlist plus AAL2,
  stale MFA proof after owner recovery, account suspension, independent note updates,
  teacher-key reset, revoked-device denial, committed error-rate counters, archive restore
  into an empty database, and unchanged collected events.
- Ordinary-browser fixtures cover owner-only first TOTP enrollment and verification,
  invitation issue, invalid username rejection, lost registration success response/retry,
  unsaved key recovery after reload, explicit key-save confirmation, uppercase username
  login on a separate device, ordinary-teacher admin denial, suspension, note preservation
  of suspended state, and direct registration at a 390-pixel viewport. No live network
  requests reach Supabase in these fixtures. MFA REST responses are fixtures, not evidence
  of live authenticator acceptance.
- All local release file hashes matched on both `127.0.0.1:8771` and `localhost:8771`.
  CUA opened the issued clear-cache URLs in Safari and Chrome. All four one-time navigation
  receipts reported the matching build; only then was ignored release status marked ready
  for this local scope. No remote receipt was requested or represented as current.
- CUA visibly opened the final management login page. The game cloud login panel and
  synthetic administrator dashboard screenshots were visually inspected. Synthetic UI
  images remain ignored under `.release/portal_preview/`; no credential-bearing image
  was saved. Administrator secrets and teacher keys were cleared before screenshots.

## Corrections during review

- Pause automatic sync during management/credential changes, and reject role recovery
  while a sync is in flight. Authentication transports already retain request identity.
- Update administrator notes separately so a stale note form cannot restore an account.
- Preserve portal username mapping in class disaster archives, but exclude administrator
  notes, prior Auth identities, and shared invitation references. Full-project backups
  remain separate; a username collision rolls back restoration.
- Preserve the registration secret before requesting server creation and retain it until
  explicit save confirmation. A lost success response consumes only one invitation slot.
- Cache new versioned game modules and exclude the management entry from the game's
  offline-navigation fallback. Reset preserves learner localStorage.
- Scope new modal styling, provide full-width key fields, keep legacy controls in
  expandable sections, and reset scroll position on entry-mode changes.

## Remaining activation and limits

Follow [portal operations](../teacher_portal.md) for owner-reviewed migration and initial
administrator creation/recovery. New privileges are closed by default until an owner grants
an application administrator. The project-owner account and application Auth administrator
are distinct. Personally entered passwords/TOTP and independent recovery storage are required.

No email, inbox, inactivity-account deletion, real-learner automatic binding, or paid service
upgrade was added. Legacy identities remain on the old recovery route and are not automatically
listed as newly registered teachers. Rate limits are per Auth identity plus a global budget;
controlled invitations do not establish public-scale abuse resistance. No iPadOS, regional
network, long-duration, or production Supabase MFA/portal claim is implied by local tests.

The health workflow is prepared, not active. Free-tier inactivity and public GitHub schedule
disabling still need monitoring; this is not a guarantee against service suspension or a
substitute for independent backups.

## Authorized live activation, 2026-11-05

The user explicitly authorized migration, administrator setup, Pages publication, and health
workflow activation after reviewing the local implementation. This section supersedes the
local-only delivery boundary above; it does not retroactively convert fixture tests into live tests.

- Supabase SQL preflight returned NULL for portal tables/functions. The reviewed migration 003
  was copied from the local file through native TextEdit/Chrome controls and executed once.
  The console reported `Success. No rows returned`. Its transaction completed without an error.
- Live publishable-key verification returned true from the dedicated health RPC and 401/403
  from the unauthenticated administrator-list endpoint. No learner data was queried or altered.
- GitHub identity and destination were verified as `fangjiaqifion` and the existing
  `fangjiaqifion/note-trainer` repository. Feature commit `59d8018` was pushed through the full
  required release command with browser opening disabled. All regression suites passed again;
  Pages release assets matched build `29d4243781`. Browser status is `prepared`, not ready.
- Repository variable `NT_SUPABASE_URL` and secret `NT_SUPABASE_PUBLISHABLE_KEY` were
  configured without printing the public client-key value. Workflow run
  [42040722798](https://github.com/fangjiaqifion/note-trainer/actions/runs/42040722798)
  completed successfully. The schedule is three runs daily; its free-service and GitHub
  inactivity limitations remain as documented.
- The Supabase `Create a new user` form is open for the owner to enter the dedicated
  application email/password and submit personally. Auto-confirm is enabled in that form.
  No administrator user UUID has been selected or granted yet. The owner must finish this
  handoff before allowlisting and personally entering the first TOTP verification code.
- Final native Safari/Chrome receipts across Pages/127.0.0.1/localhost remain pending.
  This is not a claim of completed administrator activation or end-to-end live registration.
