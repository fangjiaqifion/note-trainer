# Synthetic Sync-Queue Experiment

Last updated: 2026-11-05

This isolated prototype explores durable, idempotent upload of synthetic events. It does
not read or upload learner data and must not be used for real students. Production sync
now exists separately; this experiment's original limits are not the current game's status.

The queue persists before sending and removes items only after complete acknowledgement.
The server must persist unique event IDs and treat repeated submissions idempotently.
Persistence failures, partial receipts, and network failures must never count as success.
Mock-service results do not substitute for real-service validation.

Run local tests with:

```bash
node --test experiments/supabase_sync/*.test.mjs
```

The transport accepts caller-provided public client configuration. A historical real HTTP
synthetic test passed; routine tests simulate the network. The test project has an
RLS-restricted batch RPC with database-layer synthetic identity checks.

At the prototype stage, game integration, restore/backup, cross-device identity mapping,
multi-tab concurrency, device tests, and production deployment were absent. Its anonymous
identity was device-local and unrecoverable if lost. See the game guide for later work.

`live_test.mjs` historically created two anonymous identities and synthetic records to
verify upload, lost-receipt deduplication, and cross-identity isolation. Records remain in
the test project. It accepts only `SUPABASE_PUBLISHABLE_KEY` supplied through the
environment or ignored `secrets/api_keys.md`. Do not run live writes merely to check docs;
live execution needs authorization and should avoid unnecessary identity creation.
