# Left/right matching and authorized release

Last updated: 2026-11-09

## Change

Skill 11 keeps its four face-up rounds but fixes the first representation on the left
and the second on the right. Each column is shuffled independently. A matching attempt
always spans the two sides. Selecting a different card on the same side changes the
selection without adding an error. The two-column layout remains on narrow viewports.
Previous placement, symbol-menu, and enlarged/proportional-keyboard corrections are
included in this release. The user explicitly authorized publication after this final fix.

## Verification

The browser regression checks representation ownership and left/right card geometry
at four viewports, same-side reselection, matching completion, full notation containment,
and uniform keyboard scaling. Full release-suite, remote file hashes, deployed build,
and actual Safari/Chrome navigation evidence are recorded in the current tracker.
Physical iPad touch accuracy remains a device-specific acceptance boundary.

## Observed delivery

- Build `b6f44fffb5`, feature commit `3862334`, pushed to the existing origin/main.
- Full required suite passed: 54 Node tests, 1,144 scheduling boundaries, 55,080
  generated sessions, four-viewport left/right geometry and containment, symbolic
  correction, all 18 placement confirmations, storage/backup/sync/cloud/portal fixtures,
  and offline-cache upgrade checks. No additional live database pressure test was run.
- Every deployed runtime hash matched Pages, 127.0.0.1:8773, and localhost:8773.
- All six actual Safari/Chrome navigation receipts acknowledged the exact build.
  Chrome remote reset failed twice at release-files, then passed a separate full-file
  diagnostic and a fresh reset/boot. Failed attempt history is retained in ignored status.
  A Safari duplicate callback displayed an already-used receipt after the original
  successful receipt; the server's actual ready record was checked rather than inferred.
- No database migrations changed. Existing learner storage was preserved during scoped
  service-worker/cache clearing. Physical iPad touch accuracy remains unverified.

## Documentation disposition

Updated LEVELS, user guide, tracker, and this audit. AGENTS reviewed unchanged: generation,
ownership, release, and privacy rules still apply. README reviewed unchanged: general
capabilities and the corrected skill-10 summary remain accurate. Development, cloud
operations, and teacher portal procedures are unchanged: no new migration, permission,
storage, or cloud behavior is introduced. Historical audits retain their original scope.
