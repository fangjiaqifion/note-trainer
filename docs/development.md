# Note Trainer Development and Release

Last updated: 2026-11-11

Internal technical reference. Read [AGENTS.md](../AGENTS.md) for constraints and
[the progress tracker](progress_tracker.md) for current implementation status.
These procedures were extracted from the former README; they are not a record of a
new release. Documentation-only changes do not require running this pipeline.

## Work-completion pipeline

Run this pipeline for every substantive task, including fixes and documentation work.
The documentation gate is mandatory without another user prompt. It is an agent working
procedure, not a background watcher or a script that can judge semantic accuracy.

1. **Establish the baseline.** Read applicable AGENTS and the current tracker; inspect
   Git status, preserve unrelated work, and identify the owning repository. Consult
   relevant operating/design docs before changing the behavior they describe.
2. **Implement and verify.** Complete the authorized change and run appropriate checks.
   For runtime delivery run the full local release pipeline below. Use synthetic data;
   distinguish local fixtures from live acceptance and device-specific evidence.
3. **Review documentation before the feature commit.** Check AGENTS for changed rules,
   interfaces, ownership, and privacy boundaries. Update operating docs for changed steps,
   migrations, configuration, recovery, or failure handling; update the tracker for actual
   status, evidence, limits, and next actions. Review README and LEVELS when capabilities
   or instructional design change. Keep unaffected documents unchanged with a reason.
   Replace stale current guidance instead of only appending a contradictory update.
4. **Commit the complete unit locally.** Stage explicit paths and include affected docs
   with implementation. Exclude credentials, learner data, and ignored runtime evidence.
   Do not derive push/deployment authorization from this checklist.
5. **Release only when authorized and relevant.** Apply required migrations before a
   dependent client; run the push release pipeline, verify remote file hashes, and collect
   actual Safari/Chrome navigation receipts for the declared origins. With browser control,
   use `--no-open` and the generated URLs; `prepared` is not `ready`. Verify changed product
   behavior through an isolated synthetic workflow when needed. Reuse existing test identities.
6. **Close the evidence loop.** After deployment, update the tracker and dated acceptance
   record with observed build, migrations, checks, browser results, and remaining limits.
   Commit this evidence. Publish it only within existing authorization. In a nested checkout,
   update parent coordination docs if affected and commit the submodule pointer locally
   after game commits. Never push the parent implicitly.
7. **Check and hand off.** Review the final diff, run `git diff --check`, check affected
   local Markdown links, and search current docs for obsolete instructions. Record the
   documentation disposition in the tracker: updated files, reviewed-unchanged documents
   and reasons, verification, and unresolved gaps. Report the actual outcome and distinguish
   local commits, pushes, server verification, and browser acceptance.

For documentation-only work, perform steps 1, 3, 4, and 7; update evidence in step 6 when
the record changes. Do not rebuild runtime assets, clear caches, contact the live student
database, or repeat pressure tests merely to validate Markdown. Do not change the recorded
runtime build or claim new browser acceptance from a documentation commit.

## Adding a note

Everything about the note set lives in three declarations near the top of `index.html`:

```js
const NOTES = {
  E4: { id:'E4', letter:'E', label:'E', midi:64, clef:'treble', y:4.0,
        hand:'R', finger:3, landmark:'两个黑键的右边',
        keyHint:'E 在两个黑键的右边，中央 C 右边第二个白键',
        posHint:'E 在高音谱号的第一条线上',
        clefHint:'E 在高音谱号的第一条线上' }
};
const NOTE_ORDER = ['B3','C4','D4','E4','A3','F4','G4','A4'];
const BASE_NOTES = ['B3','C4','D4'];
```

To add a note:

1. Add an entry to `NOTES`.
   - `midi` is the MIDI number (57 = A3, 59 = B3, 60 = middle C, 64 = E4, 65 = F4,
     67 = G4, 69 = A4).
   - `y` is the staff position in staff units: line 1 = 4, space 1 = 3.5, line 2 = 3,
     space 2 = 2.5, the space below the staff = 4.5, the first ledger line below = 5.
   - `hand` (`'L'` / `'R'`) also decides the stem direction; `finger` is the digit drawn
     outside the staff (0 means no fixed fingering yet).
   - `landmark`, `keyHint` and `posHint` are the spoken and written hints.
2. Append the id to `NOTE_ORDER` in the order it should be taught. Do not put it in
   `BASE_NOTES`; that array is only for the three notes that are known from the start.
3. If the note needs a ledger line, register it in `LEDGER` under the clef, using the same
   `y` value (`LEDGER.treble.C4 = 5`).
4. Test the first lesson: the local keyboard should show only the new note's black-key group
   (F3–B3 for A3, for example), the staff steps should use the exact pitch, and the mixed
   items should offer the new note and its learned neighbours. The 14 questions come from
   `SPOT_STEPS`; a new note needs no change there.

All skills cover their eligible checked notes. Skills 6–8 and 10 retain abstract
positions and append staff/key review; skills 9 and 12 use familiar selected-note
comparisons. Skill 13 explicitly includes selected ledger spellings; the new-note finale still
uses CONTRAST_POS and CONTRAST_PARTNERS for learned-note comparisons.

## Adding a skill

Add one entry to `SKILLS` and one `make` function:

```js
{ id:17, key:'interval', name:'音程', title:'音程',
  desc:'两个音之间隔几步', color:'#5C6B3F',
  needs:['key','pos'], pool:'active', make:makeInterval }
```

This is a hypothetical seventeenth skill, not an implemented feature.
`needs` says which note flags the skill requires; `pool` is `'active'` (eligible checked notes),
`'fixed'` (the `ids` list) or `'none'` (no notes). `make(ids, n)` returns an array of question
objects with the same `{ kind, render(), reveal() }` interface as the existing factories.
`buildQuestions` is a registry lookup now, not a chain of `if`/`else`, so adding a skill does
not touch the note data or the other skills. `id` is also the display number and the star key;
it must stay unique, and adding another card changes the home grid.

`SKILLS` also drives the home screen. The menu currently has sixteen cards; new skills are
added only when the interface has room for them.

## Project structure

```
note-trainer/
├── index.html            main game: styles, orchestration, clef paths, question pool; cloud/sync modules are separate
├── LEVELS.md             skill-by-skill instructional design record (English)
├── manifest.webmanifest  PWA manifest for "Add to Home Screen"
├── sw.js                 offline cache; cache name is written by the release script
├── clear-cache.html      origin-scoped cache reset page used by the release script
├── AGENTS.md             development and release requirements
├── release.json          generated build ID and SHA-256 file manifest
├── scripts/release.mjs   build stamp, tests, commit/push, cache clear, load receipts
├── scripts/release_integrity.mjs  shared file-integrity checks
├── scripts/local_server.mjs       no-store server and loopback receipt service
├── scripts/pages_refresh.mjs      remote Pages rebuild, without pushing local code
├── tests/smoke.mjs       Playwright regression test
├── package.json          npm test / release / cache scripts
├── icon.svg, icon-*.png  icons (180 is full-bleed for iOS, 192/512 are masked)
├── og-cover.png          link-preview image referenced by og:image
├── serve.sh              local static server for development
└── README.md             public conceptual overview
```

## Running locally

```bash
bash serve.sh          # serves on 8765
bash serve.sh 8080     # another port
npm run release -- --local   # the full local test flow
```

`serve.sh` prints two addresses: `http://127.0.0.1:8765/index.html` for this Mac, and
`http://<Mac LAN IP>:8765/index.html` for the iPad on the same Wi-Fi. Closing the lid or the
terminal stops it.

### Release, cache, and the test link

The pipeline distinguishes built files, verified server files, and verified browser loads.
Only the last state is test-ready.

```bash
npm run build                           # stamp build + release.json; no tests or browser actions
npm run release -- --local              # tests + local server + both browsers, local and remote URLs
npm run release -- --local --local-only # explicitly verify local URLs only; remote remains unchecked
npm run cache                           # repeat cache clearing/load checks, without rebuilding
npm run cache -- --local-only            # local browser cache/load checks only
npm run verify:remote                    # compare all remote file hashes with the local release
npm run pages:refresh                    # read-only plan for rebuilding remote main
npm run pages:refresh -- --execute        # rebuild remote main; does not push local changes
npm run release -- --push                # authorized push, wait for all remote files, clear/load checks
```

The development server uses `Cache-Control: no-store`. Its source hash identifies the running
server, so an old server or a different project cannot pass the readiness check. Stop an old
server or choose `--port`; the command does not kill unknown processes.

`release.json` contains SHA-256 hashes for every released runtime file, including
local modules, the service worker, reset page, manifest, and icons. Server verification fetches every file using a fresh URL. Browser reset unregisters only
this game's service worker, deletes its offline caches, refreshes and hashes all release files,
and then opens `index.html?build=...`. The game refuses a mismatched build.

The loaded game acknowledges its actual build through a short-lived loopback navigation
receipt. Each browser/origin gets a different random receipt. This avoids AppleScript tab
reading, browser JavaScript automation settings, CORS and background HTTPS-to-localhost fetches.
The local server stores receipts in memory for ten minutes and accepts receipt API requests
only from loopback. It redirects back to the verified game URL after acknowledgement.

Each target is opened and acknowledged before the next one, avoiding Safari background-tab delays. The transient verification page defers service-worker registration until it redirects to the normal game page. Reset steps have bounded timeouts and failure receipts. An atomic process lock prevents overlapping runs from racing or overwriting status.

The normal scope is Safari + Chrome × GitHub Pages + 127.0.0.1 + localhost. All six targets must
acknowledge before success. `--local-only` explicitly limits this to four local targets.
`--no-open` only prepares URLs and records `prepared`, never `ready`. Missing files, old CDN
bytes, failed loads and timeouts fail the full pipeline instead of silently succeeding.
Machine-readable results are stored in gitignored `.release/status.json`; runtime receipts
are not committed. Learner accounts, selection, progress and records in localStorage are preserved.

GitHub Pages has build/status APIs, not a documented site-CDN purge endpoint. The rebuild
command uses the official Pages build API for the configured legacy main/root source and
then verifies the remote release. It never deletes Actions caches or pretends to purge a CDN.
When setting up a new deployment, publish the pipeline files before expecting remote verification to work.
[GitHub's Pages API](https://docs.github.com/en/rest/pages/pages) documents the rebuild behavior.

Commit feature changes before `--push`. The release command only auto-commits generated
`index.html`, `sw.js` and `release.json`, avoiding unrelated work. Hand over the local link for
an unpushed version, or the remote link only after its files and browser loads are verified.

## Tests

The app needs no compilation or runtime dependencies. `npm run build` stamps the release
metadata; regression tests run separately:

```bash
npm install
npm test
```

It uses `playwright-core` with the system Google Chrome, starts a temporary static server,
seeds a test profile in `localStorage`, and checks: sixteen home cards; 23 question types at four
viewports with no clipping or horizontal scroll; a single checked note still gets two
keyboard → staff choices; a new-note lesson resumes at the saved step and opens all three
flags; the report has sixteen skill columns; the console stays clean; selected-note coverage in pitch-based skills and every checked-note subset
is audited across all 255 nonempty selections, three difficulties, two answer histories, and three fixed seeds (78,030 sessions across sixteen skills and daily practice); and `clear-cache.html` removes only this
game's caches and keeps `localStorage`. The main context blocks service workers so it always
runs the working copy; the cache test uses a separate context that allows them and checks controlled navigation, cache isolation, offline recovery, and HTTP failure receipts.

## Deploying

The site is served by GitHub Pages from the `main` branch, repository root.

```bash
npm run release -- --push
```

The script runs the tests, writes a content-based build tag into `index.html`, updates the cache
name in `sw.js`, commits generated release files, pushes, and polls all remote release files
until their hashes match. It then
clears the browser caches and prints the remote link. If the poll times out, the command fails and does not hand over an unverified remote test link; the push itself may already have succeeded.

- Pages HTTP caching is checked through actual file hashes and a fresh request URL; the local server sends `Cache-Control: no-store`.
- This project uses a public repository and a public Pages site. Repository visibility
  and hosting policy should be checked before any future configuration change.
- The page requests `noindex, nofollow, noarchive`; these directives are not access
  control. Anyone with the link can open it.
- Do not bump the cache name by hand. `npm run release` derives it from the page content;
  a manual edit is overwritten at the next release.



## Additional modules and tests

Production cloud behavior is in `cloud_client.mjs` and `cloud_ui.mjs`; sync and
transport modules remain separate from the core page. Ordered database migrations live
in `scripts/migrations/`. See [cloud operations](cloud_operations.md) for procedures.

The package test command also runs Node regressions, the scheduling audit, real local
PostgreSQL-engine permission/transaction tests, and isolated browser suites for sync,
roster restore, cloud UI, storage barriers, and old-SW module upgrades. Live Supabase
checks are separate and require specific authorization; normal documentation checks
make no database requests. Read the package scripts for the exact current suite.
