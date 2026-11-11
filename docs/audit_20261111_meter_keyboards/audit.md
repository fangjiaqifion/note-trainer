# Rhythm grouping, meter choice, and deformed keyboards

Date: 2026-11-11

## Changes and teaching decisions

The previous rhythm-fill implementation checked sums but admitted a quarter plus
two dotted quarters in 4/4. The user's example correctly exposed that arithmetic
alone was insufficient for this beginning notation exercise. Skill 16 now uses
quarter, half, dotted-half, and whole notes and the curated RHYTHM_PATTERNS bank.
Its six measures cover all four answers. The unsupported dotted-quarter value
was removed. Sources, grouping conventions, and limits are recorded in
[beginning rhythm notation](../rhythm_notation.md). The curated bank is an
instructional restriction, not a universal ban on other notations.

Skill 17 gives two complete measures and asks for 2/4, 3/4, or 4/4.
Each measure has the same total; each meter occurs twice in six questions.
Both rhythm skills are pitch-independent and do not append pitch-review items.

Skill 18 uses eight different keyboards: ring, oval, arch, wave, ribbon,
rising slope, falling slope, and zigzag. Each round has up to three distinct
eligible checked-note cards. A child selects a card, then its exact key.
Every selected pitch appears in both name and familiar-staff form across the
session. Names include octave numbers, and every keyboard preserves F3–B4
order, all eight intervening black keys in 3–2–3 groups, and a middle-C label.
Low/high endpoints identify direction. Wrong black keys or wrong octaves cannot
match a card. Matched cards remain visibly complete; the round finishes only
when all cards match. Each board records one existing-format answer event.

## Verification

Final runtime build: 15b2f9779c. The complete required local release pipeline
passed: 54 Node tests, 1,144 scheduling cases, 87,210 generation sessions,
32 rendering fixtures at four viewports, focused interactions, and all sync,
backup, cloud, portal, storage, and offline/upgrade browser suites.
Every release-file hash matched both local origins. Four actual Safari/Chrome
boot receipts across 127.0.0.1:8775 and localhost:8775 acknowledged this build.
Local release status is ready. No push or remote verification was performed.
Preview: http://127.0.0.1:8775/index.html?build=15b2f9779c.

Changed documentation local links and Git whitespace checks passed.

Expanded generation checks cover 87,210 sessions, including exact totals,
approved groupings, all four rhythm answers, two measures per meter question,
balanced meter choices, eight distinct keyboard layouts, selected-note bounds,
and both representations for each pitch.

The four-viewport browser layout matrix now has 32 fixtures, including every
keyboard layout. White-key interior points are transformed through each SVG's
screen matrix and hit-tested with elementFromPoint to catch overlapped,
inaccessible, or misplaced keys. Focused interactions exercise all three meter
choices, wrong meter retry, selecting a card first, wrong black keys, successful
matches through Enter/Space, complete-board events, and duplicate-answer protection.
Screenshots of all eight keyboards at tablet portrait and the new rhythm/meter
screens at phone size were visually inspected.

An initial standalone smoke run occurred before stamping the new release manifest:
generation and layout checks passed, but cache verification timed out against the
previous manifest. That run is not final release evidence. The full final pipeline
uses the stamped runtime without subsequent runtime edits.

## Documentation review

Updated AGENTS, LEVELS, README, development guide, user guide, game tracker,
and the dedicated rhythm rule/source record. Cloud operations and teacher portal
procedures were reviewed unchanged: database schemas, permissions, enrollment,
synchronization, and release mechanics do not change. Parent/games guides and
parent README remain applicable unchanged. Historical audits are preserved.
No push or remote deployment is authorized. Existing local profiles are preserved.
Physical iPad touch and spoken feedback remain unverified for this build.
