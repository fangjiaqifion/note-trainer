# Selected Notes, Scheduling, and Delivery-Cache Audit

Last updated: 2026-11-05 (English revision)

Historical audit dated 2026-11-04, baseline `8a259f6`, no push. Read the current tracker
for later releases; this record preserves what was observed and changed at this stage.

## Conclusions and causes

The fixed clef-pool bug that dropped E from D/E had already been repaired in `4e9233a`.
However, the baseline still added unchecked B to force clef variety. Chrome actually had
an older four-card page open, so stale delivery also interfered with testing. An old page
could not establish that current HEAD still produced eight D items.

| Issue | Evidence | Fix |
|---|---|---|
| Unchecked clef target | B-only baseline audit produced four unchecked C per session | Strict target selection; C4B only as checked C4's alternate spelling; D/E stay D/E |
| Skill-1 imbalance | Fixed seed gave B6/E2 instead of B4/E4 | Balance counts before order |
| Ignored shuffle return | shuffle returned a copy, leaving backtracking in original order | Schedule by remaining-count groups, randomize ties, avoid unsolvable permutation enumeration |
| Independent daily blocks | Local balancing failed globally; find-key lacked noteId and escaped old assertion | Plan ten note targets globally, keep stale-review prefix, then assign types |
| SW deleted all origin caches | activate deleted every key except CACHE | Restrict game prefix and scope, retain other apps/scopes |
| Reset page polluted index offline cache | Any navigation response could be stored as index | Bypass reset page; cache only successful game-index responses |
| Unregister/reload recreated cache | Second real-controller test found cache after cleanup | Reset marker bypasses replacement controller; final cleanup handles old controlling worker |
| Fixed three-second success/HTTP errors accepted | Script slept; fetch ignored status | Unique success/failure receipt token, timeout remains unverified, HTTP 500 fails |
| Incomplete fingerprint | SW/reset files omitted | Include them while ignoring generated IDs for stability |
| Unverified remote link after timeout | Wait warned and continued | Fail release and withhold new remote test link |
| One local hostname | Only 127.0.0.1 reset | Cover localhost too |

## Verification rounds

1. Read history, generators, selection/flags, skill registry, daily planning, SW, and release
   paths. Old tests covered few sets; single-target adjacency assertions could skip problems.
2. Expanded to all 255 nonempty checked sets × three difficulties × two histories × three
   seeds × nine skills/daily: 45,900 sessions. D/E clef examples alternated D4/E4 and the
   opposite start. With exactly two nonadjacent targets, order must alternate; randomness
   lies in start and larger-pool ordering.
3. Ran new checks against old HEAD: old smoke passed, new selection check failed. B/E
   fixed seed also reproduced the 6:2 imbalance, establishing regression sensitivity.
4. Real SW tests retained other apps/scopes, exercised controlled unregister/reload, offline,
   HTTP 500 failure, and localStorage. Found/fixed the post-unregister recreation race.
5. Shared scheduler passed 1,144 count/prior-target boundaries, preserving every item and
   feasible spacing. B/E had 4:4 counts in all 100 fixed-seed sessions.
6. Full local release ran tests/build/server. Under CUA-only browser constraints it prepared
   with --no-open, then reset both local origins in Safari/Chrome via actual UI.

## Recorded delivery

Build `71877f3fc3`. Safari both local origins displayed reset success. Chrome 127.0.0.1
unregistered one old SW and removed recreated caches after reload; localhost succeeded.
Before this, Chrome showed only four skills. Both browsers then opened the new local
build with the My notes account entry. No real account was created/modified to inspect
settings; isolated automation verified the settings build.

Remote clear-cache.html returned 404 because it had not been pushed. Remote cleanup was
not completed and the script reported unavailable. A later authorized deployment was
required before remote end-to-end validation. Independent Chrome automation was not
represented as full Safari regression.

The first title-receipt approach depended on macOS AppleScript authorization. This audit
used CUA and observed reset receipts without shell-driven browser UI automation. Unverified
automation was not called verified; timeout/failure retained pages and reported the reason.
Later pipeline records supersede that receipt mechanism.

One selected target necessarily repeats. Skills 6–8 are abstract; skill 9 uses only eligible
registered checked pairs and can be empty. New-note lessons/review/tests keep separate
instructional sequences. Current rules are owned by AGENTS/LEVELS/development docs.
