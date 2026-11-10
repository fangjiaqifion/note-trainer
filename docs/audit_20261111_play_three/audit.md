# Selected-note coverage and play-three acceptance

Date: 2026-11-11

## Requirements and decisions

The user replaced the blocked-clef sequence in skill 9 with randomized, alternating
clefs, asked to avoid consecutive reversed pairs, required every selected pitch to
appear in every skill session, and requested a thirteenth play/compare exercise.
The user explicitly chose to retain the position tasks and add selected-note staff/key
review in position-oriented skills. Existing first lessons and fixed test batteries
retain their instructional purpose; the change concerns skill-card sessions.

Skill 9 alternates the first randomly chosen clef whenever both familiar-clef pools
contain a legal pair. Target slots cover all selected pairable pitches; distractor
selection penalizes pair reuse before considering proximity. One-clef selections stay
in that clef. A sole pair necessarily recurs; unpairable selected pitches receive
staff/key review. No unchecked notes or unfamiliar alternate-clef ledger spellings
are added in skill 9.

A shared coverage gate inspects the actual displayed note IDs. Skill 1 covers letters
across octaves. Skill 5 grows to fit its selected pool. Skill 3 plans individual pitches
before letter spacing so A3/A4 both occur. Skills 6–8 and 10 append selected-note
staff/key review. Matching rounds rotate the pool and add another small round when
needed before duration matching. Skill 12 draws nearby selected triples and preserves
familiar spellings in separate cards when there is no familiar common clef. Same-letter
octaves receive explicit target wording above or below middle C; fewer than three
selected notes receive review instead of ambiguous duplicate choices.

Skill 13 plans three distinct selected pitches, favors adjacent and similar line
positions, and explicitly permits treble A3/B3 ledger spellings. It first requires the
exact left-to-right keyboard sequence, then opens a highest/lowest question. Wrong
keys retain the current step; comparison choices cannot be used early. A whole
question records one answer, including mistakes in both phases. Fewer than three
eligible pitches produce an explanatory message, without fabricated distractors.

## Verification

Final local build: `f96c43f1e8`. The complete required local release suite passed:
54 Node tests, 1,144 scheduling boundaries, all smoke/interaction/menu checks, and
all sync, backup, cloud/portal fixture, storage, and offline-upgrade browser suites.
Both local origins matched every release-file hash. Four actual Safari/Chrome
reset/game-boot receipts across 127.0.0.1:8774 and localhost:8774 acknowledged this
build. Ignored release status was set ready only after querying all four receipts.
Native Chrome input encountered concurrent user activity; the available extension
opened dedicated verification tabs. Extension DOM inspection timed out after resets,
but independent loopback receipts confirmed the actual game loads. A DOM timeout
was not counted as browser-load evidence. The generation matrix now runs 64,260 sessions:
255 nonempty subsets × three difficulties × two histories × three seeds × thirteen
skills plus daily practice. It checks actual coverage of each selected pitch in every
skill, target coverage and clef alternation in skill 9, selected-only comparisons,
nonambiguous octave prompts, reduced-pool behavior, and existing scheduling invariants.
Targeted browser tests use B3/C4/D4/E4 across tiers and repeated sessions to check
random order, alternating clefs, complete target coverage, and no immediate pair reversal.
Keyboard tests cover wrong input, all three ordered keys, locked comparison choices,
wrong/correct highest and lowest answers, and the A3/C4/E4 ledger trio.

Twenty rendering cases at four viewport sizes include the mixed-clef triple and both
skill-13 phases. Play-three screenshots at 820×1180, 390×844, and 844×390 were visually
reviewed: notation and the complete keyboard fit. These synthetic browser screenshots
do not establish physical iPad touch accuracy or external MIDI/acoustic input support.

The interaction tests exposed a stale mixed-clef event listener that could accept a
later question's wrong choice. Handlers now attach only to the current rendered wrapper;
the subsequent wrong-extreme regression intercepts the original failure.

No real learner records, new database migrations, push, or remote deployment are part
of this task. Local release and browser-receipt evidence is recorded above.

The full suite also exposed a menu regression: a thirteenth card created an overflowing
fifth row in wide, short windows. Centered grid overflow hid the first card beneath the
daily button. Safe centering preserves scroll access; a four-viewport first/last-card
hit-test regression verifies that neither entry is obscured.

## Documentation disposition

Updated AGENTS, LEVELS, README, development guide, user guide, and current tracker.
Cloud operations and teacher portal procedures remain valid unchanged because data
transport, authentication, permissions, and schemas are unaffected. Parent/area guides
remain applicable. Historical records preserve the previous blocked-clef decisions.
