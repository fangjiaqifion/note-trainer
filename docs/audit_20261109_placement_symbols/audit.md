# Placement, symbol dropdowns, and keyboard proportions

Last updated: 2026-11-09

## User clarification and corrections

The previous local refinement misunderstood skill 10: Easy/Normal repeated skill 8
position naming. All tiers now use six placement questions: one line/space inside a
random treble or bass staff, then five distinct ledger positions. The ledger block covers
both clefs and both directions. Easy/Normal reach two ledger lines; Hard reaches three.
Students hear/read the request, drag/tap or use arrows to position the note, and confirm
with a large standard primary button. Incorrect placements remain editable.

Skill 8 retains compact dropdown sentence completion. Clef SVGs, arrows, and line/space
diagrams replace written options. Only Arabic numbers 1–8 use a native select; SVG
options use compact accessible dropdown menus. The same clef paths are used in notation
and menus. Accessible labels retain spoken text. Corrected choices still trigger judgment.
An interaction regression also intercepts a success-decoration selector error that could
prevent the final answer from being recorded.

Skill 11 retains four face-up matching rounds. Its previous independent card-height
stretching altered keyboard proportions despite using the shared renderer. Cards now
scale the complete standard keyboard uniformly, including key dimensions, borders,
rounded corners, shadows, target highlights, and middle-C marker. Resize recomputes
preview scale; card keyboards remain illustrations and do not accept individual key input.

## Verification and limits

Synthetic browser regressions verify six placement tasks in every tier, their ordering,
all 18 confirmations, symbolic choices and correction after an error, full card content,
and uniform keyboard scaling at four viewports. Screenshots were inspected for opened
clef and line/space menus, in-staff and ledger placement, and proportional keyboard cards.
The game tracker records the final full release suite, build, local hash checks, and actual
Safari/Chrome browser receipts. No physical iPad finger-accuracy claim is made.

## Documentation review

Updated AGENTS, LEVELS, README capability table, user guide, tracker, and this audit.
Development, cloud operations, and teacher portal docs reviewed unchanged: release
procedures, storage, synchronization, and permissions are unaffected. Earlier dated
audits remain evidence of their own stages, superseded where stated by this correction.
No push or remote deployment is authorized by this task.
