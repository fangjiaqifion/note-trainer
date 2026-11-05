# Cache and Release Verification Pipeline Audit

Last updated: 2026-11-05 (English revision)

Historical first-local-build record, dated 2026-11-04. Final build `29280ef61b`, earlier
rehearsal `65da7cc46a`. Remote status below is historical; use current tracker and actual
release state for later delivery. No remote work was repeated during translation.

## Commands and meaning

| Command | Meaning of success |
|---|---|
| npm run build | built: stamp build/manifest only |
| npm run release -- --local | ready only after six browser/origin actual-load receipts |
| npm run release -- --local --local-only | Four local targets ready; remote unverified |
| npm run cache | Repeat six-target reset/load without rebuilding |
| npm run cache -- --local-only | Four local targets only |
| npm run verify:remote | server-verified files, not browser freshness |
| npm run pages:refresh | Read-only rebuild plan |
| npm run pages:refresh -- --execute | Rebuild existing remote main and verify files; no local push/browser cleanup |
| npm run release -- --push | Authorized push, wait for files, six loads; remote handoff only after ready |

--no-open means prepared. Missing any target fails/nonzero. Ignored .release/status.json
holds runtime detail/short-lived tokens, never committed. Atomic locks reject concurrent
release/cache/build work; dead-process locks can be reclaimed, live locks cannot. Negative
parallel-build rehearsal was rejected. Unknown port processes are never automatically killed.

## Three verification layers

1. Dedicated Node server sends no-store on success/error, fingerprints its source by SHA-256,
   rejects hidden paths using realpath, and accepts receipt API requests only on loopback.
   An old Python/Node server cannot pass as the current implementation.
2. At this stage release.json hashed eight index/SW/reset/manifest/icon files. CLI uses fresh
   query URLs; browsers reload and hash. .nojekyll preserves bytes. Mixed CDN deployment
   fails rather than waiting a guessed fixed delay. Later module additions expand the manifest.
3. Reset unregisters only this game's SW scope/cache and retains localStorage. After file
   verification, open index?build=...; reject mismatches. Actual boot navigates to one-time
   loopback receipt, then returns to game. Each browser/origin has a distinct random token,
   stored in memory ten minutes. No tab reading or AppleScript/JS automation permissions.
   Verify targets sequentially to avoid Safari background delays. Transient verification
   pages defer SW registration until normal return; each reset step has timeout/failure receipt.

Top-level navigation avoids background HTTPS-to-loopback CORS/mixed-content/local-network
fetch problems. Local success was not treated as remote success before authorized deployment.

## Historical Pages inspection

Read-only inspection found fangjiaqifion/note-trainer using legacy main/root Pages, remote
main `dc501ef`, without reset/manifest; release.json 404. The reviewed Pages API had rebuild/
status operations, not a documented site-CDN purge. The script verifies account/publishing
mode, new build timestamp/commit/built state, then actual hashes. It does not delete Actions
caches, change publishing settings, or push unauthorized code.
Historical reference: [GitHub Pages API](https://docs.github.com/en/rest/pages/pages),
not independently rechecked in this documentation audit.

## Verification rounds

- Round 1: independent mixed deployment, old manifest, old SW bytes, 404/503 tests all intercepted failures.
- Round 2: physical browsers loaded the new build but AppleScript title reading timed out;
  correctly failed, then replaced title reading with one-time navigation receipts.
- Round 3: no-store, hidden-path denial, unready/wrong/correct-build receipts; browser reset
  auto-open, wrong-build refusal, and HTTP error failure. Existing 45,900 generation,
  1,144 scheduler boundary, layout/continuation/report/offline checks passed.
- Round 4: complete local release/tests, Safari/Chrome × localhost/127.0.0.1 four loads ready,
  rehearsal `65da7cc46a`. Later repeat exposed intermittent hanging Safari SW APIs.
- Round 5: closed only this task's Safari pages, added per-step timeout/failure receipts and
  deferred SW registration. Final `29280ef61b` four-local-target release ready
  (local_release.log); final_validation.log recorded repeat and never-returning-SW regression.
- Remote end-to-end still failed 404/nonzero because files were not deployed. This was neither
  a question-generation defect nor full-pipeline success.

No remote rebuild, push, or Pages-setting change occurred in this stage. Remote code was
prepared for later authorized deployment; later audits record its acceptance.
