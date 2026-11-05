# Teacher Portal and Administrator Operations

Last updated: 2026-11-05

## Delivery boundary

This document describes the new local implementation. Deployment requires migration 003,
one owner-provisioned application administrator, site publication, and live acceptance.
Consult the progress tracker and release audit for actual verification status. Do not treat
a local browser fixture as a live Supabase acceptance result.

## Teacher experience

1. Open cloud accounts from the game, or open cloud management after verifying the local
   teacher PIN. First-time visitors can establish their local PIN during registration.
2. Choose `教师注册`, paste the administrator's reusable invitation, and choose a username.
   Usernames contain 3–32 ASCII letters/digits only, are case-insensitive, and cannot
   contain spaces, underscores, punctuation, or Chinese characters. The server enforces
   uniqueness and the same syntax. Student participant-code syntax is unchanged.
3. Copy the generated `NT2-` teacher key into private storage. A JSON download is optional.
   Confirm saving to clear the pending plaintext registration key from browser storage.
4. On another device choose `教师登录`, enter username/key, and establish the local PIN.
   Explicitly load students and progress; login alone never imports or uploads a roster.
5. Bind each local learner explicitly after the full local snapshot/download. Student and
   researcher recovery continues to use existing scoped `nt1.` packets.

The random teacher key has 256 bits of entropy. It is not derived from a username or invitation.
New portal teacher keys (including later teacher keys for that workspace) have no fixed annual
expiration; student/researcher and legacy grants retain their existing expiry policy.
No inactivity account deletion, email, application approval, or message center is implemented.
Legacy `nt1.` recovery and one-time bootstrap remain under the legacy section for compatibility;
old accounts are not silently recreated, renamed, or rebound. They do not appear in the new
teacher list until an explicit future adoption operation; manage them with existing owner tools.

Registration persists a pending random key before the request. Retries from its original Auth
identity return the original workspace and consume one invitation slot, even after a lost response.
After success and before confirmation, reopening the dialog re-displays the key. Losing all browser
storage before saving the key requires administrator recovery; username alone is not sufficient.
Browser storage and JSON files are unencrypted. PINs are local switching guards, not server credentials.
Each credential permits ten active Auth identities, not ten independently identifiable hardware devices.
Clearing browser storage can create another identity. A device-only revocation can be reversed by
someone who still holds a valid key; key reset is needed after credential compromise.

## Reusable invitations

The administrator creates a random 192-bit invitation, a note, an expiration, and a registration
limit (1–10,000, default 10; default validity 30 days). The server stores its SHA-256 hash only.
Copy/save the plaintext at issue time; the list cannot reveal it later. A lost unsaved invitation
can be paused and replaced. The issue request is idempotent while its browser page remains open.
An unknown request outcome after closing that page requires checking the list before creating another.

Invitations can be extended, paused/re-enabled, or assigned a larger limit. A limit cannot be
lowered below existing usage. Expiration/pause affects only new registrations. Previously completed
registrations remain valid. Username allocation, invitation consumption, class creation, and the
initial revocable teacher membership occur in one transaction. Advisory and row locks serialize
same-name registrations and shared invitation quotas.

## Administrator page

`manage.html` is a separate, unlinked entry. Its address is discoverable in the public repository;
server authorization is the access control. It contains invitations and teacher accounts only,
not collected answer records or plaintext teacher keys. It supports notes, invitation-associated
teacher filtering, account suspension/restoration, and device revocation. Audit events are stored
server-side; owner maintenance can inspect them. Passwords, TOTP secrets/codes, teacher keys and
invitation strings never enter audit events. Application admin sessions stay in page memory and
are not shared with game authentication. Refreshing requires signing in again.

Every management RPC checks an owner-maintained administrator allowlist, enabled status, `aal2`,
and a TOTP verification timestamp after the administrator's recovery cutoff. Merely signing in,
changing client metadata, or using a teacher key does not grant administrator access. There is no
first-user-wins bootstrap. Management requires a new login once the short-lived token expires;
the initial version does not persist or refresh administrator sessions in browser storage.

### First administrator and recovery

1. As the Supabase project owner, create a dedicated application Auth user (email/password).
   This is distinct from the Supabase Dashboard owner. A confirmed account can be owner-created;
   teacher onboarding and ordinary admin sign-in do not need email delivery.
2. Obtain that application's Auth user UUID. Run
   `node scripts/portal_maintenance.mjs grant-admin USER_UUID`.
3. Review the generated SQL under ignored `.release/portal_maintenance/` and execute it using
   project-owner access. The tool prepares SQL only; it does not connect or execute anything.
4. Open `manage.html`, personally enter credentials, and enroll a TOTP authenticator if none
   is verified. The setup eligibility RPC exposes only whether the current identity is allowlisted;
   no management data is available before MFA. Save an independent authenticator backup, then verify.
5. Verify invitation listing/creation and a synthetic teacher workflow before real enrollment.

If credentials/factors are lost or compromised, use project-owner Auth tools to repair the existing
user, or create a replacement user. Prepare `grant-admin NEW_UUID OLD_UUID` to disable the old
administrator in the same reviewed transaction. Regranting the same user moves the MFA cutoff,
invalidating old MFA proof for management operations. Revoke Auth refresh sessions and compromised
factors through owner tools too. Never place a service-role/secret key in the webpage or repository.
`revoke-admin UUID` refuses to disable the last enabled application administrator. Preserve project
owner credentials and MFA backups separately from application credentials; no webpage can recover
ownership if every independent owner recovery route is lost.

### Teacher recovery

Search by normalized username, verify ownership outside the app, obtain the teacher UUID, and run
`node scripts/portal_maintenance.mjs reset-teacher TEACHER_UUID`. Review/apply the generated SQL
before privately handing over the generated credential file. It revokes all teacher keys and teacher
memberships for that workspace, then issues a replacement hash. It does not delete answers, reset
student keys, or re-enable a suspended account. The tool never prints the new key. Do not execute a
new reset until the outcome of the previous reset is known; keep the credential file private until
successful delivery, then remove it according to the operator's private storage procedure.

Account suspension is checked on each server-side teacher operation, including requests with
previously issued JWTs. It preserves data and does not remotely erase local copies. Student and
researcher grants remain independent. Restoring an account re-enables its otherwise valid grants.

## Backups and restore

Migration 003 extends class archives with optional `portal_teacher` metadata (username, stable ID,
status and timestamps), excluding administrator-only notes, old Auth identities, and invitation references. Restoring
into an absent workspace with migration 003 recreates the username mapping and credential hashes,
so an existing valid teacher key can log in with a new Auth identity. A username collision aborts
the complete restore transaction. Old v1 archives remain accepted. An old restore implementation
cannot restore the new username mapping; apply all migrations first.

Class archives are not full project backups: they exclude shared invitations, administrator grants,
audit/rate-limit tables, Auth configuration, and other project settings. Retain owner database dumps
and the migration/configuration/operations records separately. No new retention guarantee or automatic
backup job is introduced by the health check. No credential plaintext belongs in a committed backup.

## Health schedule

`.github/workflows/cloud_health.yml` runs three times daily, offset from the hour, plus manual
`workflow_dispatch`. It calls only `nt_portal_health()`, which reads one dedicated nonstudent row.
No learner records, anonymous Auth users, teacher keys, or privileged server keys are needed.
Retries are bounded; failures produce a failed workflow without printing response bodies/secrets.

After migration, configure repository variable `NT_SUPABASE_URL` and Actions secret
`NT_SUPABASE_PUBLISHABLE_KEY` with the public client key. The secret slot avoids accidental logging;
it is not an administrator credential. Enable GitHub failure notifications and monitor Supabase's
owner warning emails. Do not simulate activity with automatic repository commits.

This reduces inactivity-pause risk, not a guaranteed free service SLA. Supabase documents that a few
daily database requests typically keep a project active; public GitHub schedules disable after 60
days without repository activity, and scheduled jobs may be delayed/dropped. Check workflow state
before long breaks. A paused project may require manual resume. No paid upgrade is authorized.

## Security and verification limits

Rate limits apply to each Auth identity and a global hourly budget. Rejected attempts return a
structured error so counters commit; errors that raise exceptions would otherwise roll back counters.
These limits complement Supabase Auth/signup limits. They are not a replacement for an IP-aware
edge gateway, CAPTCHA, or production abuse monitoring; deliberate signup churn may exhaust the
shared budget. Keep invitations private and bounded during the controlled rollout.

Only the publishable browser key is intentionally included in `portal_config.mjs`, eliminating
configuration-file uploads for new teachers. It conveys no table access by itself. RLS, server RPC
checks, and private-schema restrictions protect data. All administrative/owner credentials remain
outside published assets. Old recovery packets embed public configuration and remain compatible.

References checked 2026-11-05:
- https://supabase.com/docs/guides/auth/auth-mfa
- https://raw.githubusercontent.com/supabase/auth/master/openapi.yaml
- https://supabase.com/docs/guides/auth/users
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
