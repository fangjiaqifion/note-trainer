# Notation and Prompt Refinement

Last updated: 2026-11-11

## Accepted behavior

Skill 12 keeps treble comparisons and bass comparisons separate until the last three
questions, which use mixed-clef triples when available. Same-clef pools with only two
eligible selected pitches use a pair. Without a mixed trio, the session retains
same-clef practice. Small selections retain the existing selected-note review.
No unchecked pitches or unfamiliar alternate-clef spellings are introduced.

Skills 13 and 14 introduce left-to-right playing only on the first question of each
session. Later prompts say “弹出这三个音”. Comparison prompts say “点出最高的音” or
“点出最低的音”. Skill 14 removes the keyboard sizing class during comparison, allowing
a larger grand staff. Skills 12–15 enlarge notation using the available viewport;
short landscape keeps notation bounded within its column. Skill 15 uses matching
rounded pastel number badges during observation and numbered answer selection.

## Verification and limits

Synthetic Chrome checks intercept premature mixed-clef questions and repeated direction
prompts. The generation audit retains all 73,440 sessions and selected-note boundaries;
same-clef pairs are explicitly allowed in skill 12. Four-viewport checks cover 22
rendering cases. Enlarged grand-staff and flash-card screenshots were inspected. An
inherited fixed card height initially shrank SVGs; removing that height constraint
produced the intended large notation. Final local build `6f69a75390` passed the full required release suite, including
54 Node tests, 1,144 scheduling boundaries, all 73,440 generation sessions, and
sync/backup/cloud/portal/storage/offline browser suites. A supplementary smoke run
explicitly rendering the mixed-clef finale at four viewports passed. Release-file
hashes matched both local origins on port 8775. Four actual Safari/Chrome boot
receipts across 127.0.0.1 and localhost acknowledged this build; readiness is
recorded from those receipts. Existing 127.0.0.1:8775 profiles remained visible
after cache reset. Physical iPad touch and speech pronunciation remain
unverified. No push, deployment, schema, identity, or cloud behavior change is included.

## Documentation review

Updated AGENTS, LEVELS, README, user guide, current tracker, and this audit. Development,
cloud operations, and teacher portal procedures were reviewed unchanged because the
runtime release procedure, storage, permissions, and synchronization are unchanged.
Parent/games guides and parent README remain applicable; parent coordination and the
submodule pointer are updated after the game commit. Historical audits remain intact.
