# Note Trainer: Internal Development Guide

Last updated: 2026-11-11

This is an independent repository, registered as a submodule in the music-materials
workspace. When nested there, inherit the parent and `games/AGENTS.md`; when cloned
alone, this file remains the canonical technical guide. Commit game changes here;
the parent records only the submodule pointer and is never pushed implicitly.

## Documentation and continuation

- Write all project-owned documentation in English, including this guide, README,
  LEVELS, technical docs, audits, and trackers. Conversation may be English or Chinese.
  Preserve UI labels, quoted wording, identifiers, and bilingual learning content.
  English supports future communication, academic work, and sharing.
- `README.md` introduces the game, audience, capabilities, usage, limitations, and product
  direction. It is not the internal task board or release runbook.
- Read [docs/progress_tracker.md](docs/progress_tracker.md) before continuing implementation.
  It owns priorities, acceptance criteria, unresolved issues, and evidence links.
- [LEVELS.md](LEVELS.md) owns instructional design, not deployment or data infrastructure.
  Keep design, code, affected user documentation, and architecture comments consistent.
  A planned design change is not an implemented feature.
- [docs/development.md](docs/development.md) owns development, tests, and release mechanics;
  [docs/cloud_operations.md](docs/cloud_operations.md) owns cloud operation and recovery.
- Keep dated audits as historical evidence; use the current tracker for current status.
  Record findings, fixes, rounds, evidence, and limits in `docs/audit_<date>/`.
  Do not mark work complete from a chat conclusion alone.
- Documentation-only edits do not change the runtime build and do not require a release,
  database pressure test, browser-cache reset, or deployment.

## Mandatory work-completion gate

Every task must finish with a documentation review without waiting for a user reminder.
Follow the [work-completion pipeline](docs/development.md#work-completion-pipeline): update
applicable AGENTS, operating docs, the tracker, and capability/design docs; record which
were updated or reviewed unchanged and why. Resolve contradictory current guidance.
After an authorized deployment, update actual build/migration/browser evidence before the
final handoff and commit that evidence. Preserve historical audits. Do not report a
substantive task complete while required documentation remains stale. This applies when
cloned alone and within the parent workspace. It is an agent workflow requirement, not
an installed automatic hook or permission to push/deploy.

## Question-generation invariants

- Skills 1–5 and daily practice target only checked notes that meet learning prerequisites.
  Do not add unchecked target notes to manufacture clef variety.
- Skill 3 may use C4B as the same pitch as checked C4. D/E must both appear when checked,
  even though both answers are treble clef.
- Every skill session covers every checked note eligible for that skill. Skill 1 covers
  letter names (A3/A4 share A). Grow the session if the normal count would omit notes.
  Skills 6–8 and 10 retain abstract position tasks and append selected-note staff/key
  review. Coverage items belong to the owning skill in reports.
- Skill 9 uses familiar clefs and alternates them whenever both have a legal pair.
  Reserve slots for every eligible target and penalize reused pairs; do not ask a pair
  and its reverse consecutively when a different pair exists. Randomize the first clef,
  targets, distractors, and horizontal order. A one-clef pool cannot alternate without
  inventing notes. Unpairable selected pitches receive explicit staff/key review.
- Skill 12 draws selected-note triples, preferring close pitches. Mixed-clef trios use
  separate familiar staff cards only in the final three questions, after same-clef
  comparisons. Use a selected pair when that clef has only two pitches. With fewer than three
  notes, provide selected-note review. Skill 13 requires three distinct selected pitches,
  exact left-to-right keyboard playing, then a highest/lowest selection. It explicitly
  permits selected A3/B3 below treble for ledger comparisons such as A3/C4/E4.
- Skill 13 alternates mixed groups with familiar bass/treble cards. Skill 14 uses
  the same exact-key sequence and extreme selection on a braced grand staff. Skill 15
  shows numbered notes for two seconds, hides them before numbered choices, and
  progresses from five two-note questions to three notes when the selection permits.
  Skills 13–14 require three pitches; skill 15 requires two. Teach left-to-right
  playing only in the first question of skills 13–14; subsequent prompts say
  “弹出这三个音”, followed by “点出最高的音” or “点出最低的音”.
- Skill 11 rotates selected notes across small face-up rounds, adding a matching round
  when needed before duration/beat matching. Skill 10 retains one staff placement and
  five ledger placements in every tier, followed by selected-note review.
  The new-note contrast finale retains its separate learned-note pool.
- Plan note counts before ordering. One eligible target necessarily repeats; with multiple
  targets, avoid adjacent repeats whenever feasible.
- Plan the entire ten-item daily session, rather than shuffling independently sampled blocks.
- New-note lessons, single-note review, and pre/post tests have distinct instructional
  purposes; do not apply skill-card randomness indiscriminately.

- Skill 16 is pitch-independent: exactly six rhythm measures, all four duration answers,
  quarter-note beat unit, and exact measure totals. Dotted-quarter duration is 1.5 beats;
  the existing dotted-half value remains available to earlier skills.
- New-note order after A3 is F4, G4, then A4. Skill 15 number badges remain black and white.

## Runtime delivery requirements

1. Implement, audit, fix, and verify. New regressions must intercept the original defect.
2. For runtime delivery run `npm run release -- --local`, including `npm test`; do not
   skip the full required tests. Commit feature changes before a release push.
3. The release script derives the build and SW cache version; never edit cache versions
   manually. `release.json` hashes all release files; `.nojekyll` preserves Pages bytes.
4. Verify all server file hashes, then clear only this game's SW scope and caches, keeping
   learner localStorage. Verify actual game boot through one-time loopback navigation
   receipts for Safari/Chrome across remote, `127.0.0.1`, and `localhost` origins.
   The default local port is 8765; use the explicitly selected port for that run.
5. All targets in the declared scope must acknowledge the correct build. Missing files,
   mixed deployments, wrong builds, timeouts, or failed reset steps fail the pipeline.
   `.release/status.json` is ignored runtime state. `--no-open` means `prepared`;
   `--local-only` proves only local readiness. Never turn prepared into ready by assertion.
6. Do not read browser tabs using AppleScript, enable browser JavaScript automation,
   close unrelated tabs, or substitute fixed delays for receipts. Respect active browser
   tool restrictions; when necessary prepare with `--no-open` and open targets via CUA.
7. Use `scripts/local_server.mjs`, its no-store responses and source fingerprint. Never
   kill an unknown port process. Respect the atomic release/cache lock.
8. Deliver a local build URL for an unpushed runtime version. Run
   `npm run release -- --push` only with explicit push authorization; verify deployment
   and actual browser loads before handing over a new remote test link.
9. `npm run pages:refresh` is read-only by default; `--execute` rebuilds existing remote
   main. It is not a push or CDN purge. Do not delete Actions caches or alter Pages
   settings to simulate freshness. Check deployment and file hashes first.
10. `--push` auto-commits only generated index.html, sw.js, and release.json. Keep complete
    feature commits separate, then update the parent's pointer locally. Final reports
    distinguish local commit, push, server verification, and browser-load verification.

## Data and verification boundaries

Use synthetic accounts and isolated contexts. Never modify real student records for tests,
print/commit credentials or recovery codes, or silently upload existing learners.
The user authorized cloud-by-default student creation on 2026-11-05. A signed-in teacher
creates a student once; automatic enrolment, an internal local snapshot, progress, answers,
and private student display labels follow without manual binding or forced downloads.
The initial local roster can be assigned to its first verified teacher workspace; never
reassign another workspace's profiles or upload through learner/researcher credentials.
Student display labels are restricted to the owning teacher and the corresponding learner;
researchers receive participant codes only. PINs and their hashes remain local. A local PIN
is neither encryption nor server authorization. Reuse existing synthetic identities for
necessary live checks; do not rerun passed pressure tests without a new validation need.

The generation matrix covers 255 nonempty checked sets × three difficulties × two
answer histories × three seeds × sixteen skills and daily practice, totaling 78,030 sessions.
Other checks cover scheduling boundaries, four viewports, choices, continuation, reports,
backup/storage failures, cloud permissions, SW upgrades, and offline/cache behavior.
Chrome automation does not establish full Safari/iPad behavior. Current evidence and
unverified capacity, regional-network, and device scenarios are listed in the tracker.

## Teacher portal configuration exception

`portal_config.mjs` intentionally contains only the project URL and publishable browser key.
This is a reviewed exception to storing all key configuration only under ignored `secrets/`: new
teachers must not upload a configuration file. It grants no administrator authority. Never place
secret/service-role keys, sessions, teacher credentials, or invitation plaintext in published assets.
The independent management entry is `manage.html`; its discoverable URL is not an access control.
See `docs/teacher_portal.md` for owner setup/recovery and rollout boundaries.
