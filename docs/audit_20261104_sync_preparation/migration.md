# Cloud Preparation: Legacy-Record Migration

Last updated: 2026-11-05 (English revision)

Historical stage record, 2026-11-04. Later implementation is recorded in the current
progress tracker; the limitations below describe this stage only.

The old `migrateLegacyState` cleared per-question events, difficulty history, and pre/post
batteries when creating the first account. The fix preserves existing fields and adjusts
the counter to the largest recorded sequence, preventing duplicate future sequences.
Missing fields retain empty defaults; the original legacy save is not deleted.

`tests/legacy_migration.test.mjs` checked synthetic events/history/battery/counters and
missing fields. The full suite passed, including generation, layout, continuation, reports,
and cache checks. Initially, cache integrity correctly rejected an outdated release manifest;
after `npm run build`, the full suite passed without weakening integrity checks.

At this stage there was no full migration backup/failure recovery, removal of the 8,000
trim, capacity protection, Supabase identity/permissions/sync, or physical-device acceptance.
These historical gaps must not be read as the current feature list.
