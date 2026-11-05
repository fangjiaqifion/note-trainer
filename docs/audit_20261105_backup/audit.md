# Roster Protection and Sync-Scan Audit

Last updated: 2026-11-05 (English revision)

Historical NT-001 stage after reviewing Git, AGENTS, tracker, and pressure audit. All
automation used synthetic accounts, with no real learner access or live database requests.
Later production work supersedes this stage's no-cloud/no-push limitations.

## Findings and fixes

1. Added restorable v1 full-roster backup, teacher export/file restore, and strict
   separation between ordinary and test namespaces.
2. Avoid partial multi-key restore: stage every state in a new generation, commit one
   roster pointer, retain the old roster reference. Failures remove this attempt's staging
   and preserve the original. Never merge names; internal IDs stay unchanged.
3. Stale pages compare storage-generation IDs before saving and require refresh after restore.
4. Failed single-profile quota writes restore prior in-memory state and do not claim success.
   Isolated sync refuses overwrite imports.
5. Missing state, missing/duplicate participant IDs, or duplicate event IDs no longer become
   empty histories or disappear behind receipts. Fail permanently before network, keep data,
   and pause automatic retry.

## Boundaries

Backups contain salts/PIN hashes, no plaintext PIN/Auth session/key, and are unencrypted.
Restore uses the backed-up teacher PIN; events, counters, and battery links are not renumbered.
Previous snapshots can be exported/restored. Old generations remain and require space.
Unexpected termination can leave unused staging, never treated as active; reclamation,
iPad capacity/write time, and ordinary concurrent-practice merging remain unverified.
Validation rejects missing structure, future versions, and dangerous prototype properties,
without claiming complete semantic validation of every question field. At this stage no
cross-device binding or real learner upload was enabled.

## Recorded verification

- Six backup/import tests: roundtrip, duplicate/changed names and imports, failures at every
  write point, malformed/missing/future archives, old-page barriers, and single-profile quota.
- Independent Chrome teacher UI export/restore/refresh/re-export matched field by field,
  including previous-snapshot export and old-page save denial.
- Missing state/duplicate participant/same- or cross-profile duplicate events caused zero
  network requests and no success receipts.
- An outdated manifest correctly failed initial integrity regression. Regenerated the manifest,
  reran without weakening checks: 31 Node tests, 1,144 scheduling boundaries, 45,900 sessions,
  thirteen question types/four viewports, reports, SW/offline/cache, sync and backup browser suites passed.
- `npm run release -- --local --port 8766`, build `950868f0bf`, ready in its recorded scope.
  Both local origins matched hashes and four actual Safari/Chrome loads matched the new build.
- Remote old build `34156b64c6` passed its own files/two browser loads. No push; remote old
  functionality was not represented as acceptance of the new local backup feature.
- Historical local link: `http://127.0.0.1:8766/index.html?build=950868f0bf`.
  Receipts remained ignored; no database records added or previous live pressure repeated.
