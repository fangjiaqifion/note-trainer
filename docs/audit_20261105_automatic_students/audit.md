# Automatic Student Cloud Sync Acceptance

Last updated: 2026-11-05

## Scope and result

The user requested cloud-by-default student management. A signed-in teacher now creates
students through the ordinary teacher overview. The app automatically assigns cloud IDs,
preserves an internal local snapshot, uploads progress and answers, and retries transient
failures. The normal cloud dialog no longer asks for participant codes or manual binding.
Legacy binding remains nested in advanced compatibility tools.

Feature commit `ac86b85` and release commit `d8d55a2` were pushed to the existing game
remote. GitHub Pages files match build `e30cc2ef11`. Migration 004 was checked absent and
applied successfully through the owner-authenticated Supabase SQL Editor before publication.
The SQL pasted into the editor was compared byte for byte with the reviewed local file.
All six actual Safari/Chrome navigation receipts across Pages, 127.0.0.1:8771, and
localhost:8771 returned `ready` for the same build. No browser credentials were weakened.

## Verification

- Both the local release run and the push release run passed the full required suite:
  database permissions/recovery, automatic enrolment, storage failures, answer batching,
  generation/scheduling, browser flows, backup restore, and offline/cache upgrades.
- The automatic portal browser regression created a student while the network was down,
  reloaded, and recovered after connectivity returned. It simulated a successful enrolment
  with a lost response; retry created exactly one server student. A real UI answer reached
  the database once. Local quota and roster/state/memory changes preserve source records.
- Private display labels are readable by the owning teacher and corresponding learner.
  Cross-workspace and researcher reads do not disclose names. Archives preserve labels;
  old archives without labels remain restorable. PINs and hashes remain local.
- Live acceptance reused `portalqa20261105`, previously registered with the supplied
  invitation. Fresh private Safari login had passed with the saved username/key. The
  management dashboard confirmed one used invitation slot out of ten.
- A separate clean Chrome incognito session logged into the same synthetic teacher,
  created `AUTO01` in the ordinary New Student dialog, and observed automatic cloud
  enrolment. One B-key answer was correct; the teacher overview showed one recorded
  answer and cloud synchronization. The cloud roster returned `AUTO01`, and its read-only
  report read back one answer with 100% first-attempt accuracy. No manual enrolment,
  participant-code input, or forced download was used.

Private screenshots, recovery credentials, and runtime receipts remain ignored under
`.release/portal_live_invite/` and `.release/status.json`. No real learners were used.

## Practical boundaries

Local saving remains first so offline work survives until the next successful connection.
Profiles scoped to another teacher workspace are never silently reassigned. A first verified
teacher workspace may adopt its initial unowned local roster, as the user authorized.
Changing devices still uses the existing cloud progress import and local PIN flow; this
change does not implement automatic merging of simultaneous edits on different devices.
Service availability and regional connectivity remain external limits. This acceptance
is not a new iPad or capacity test.
