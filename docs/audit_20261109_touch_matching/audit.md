# Touch and matching refinement

Last updated: 2026-11-09

## Changes and rationale

- Replaced crowded skill 8 pictorial option groups with four native dropdowns. Skill 10
  naming shares that component and stays consistent. Numbers remain 1–8 and all fields
  remain editable after an error.
- Enlarged shared answer keyboards across find-key, staff/key, hold, and new-note tasks.
  Full keyboards allow 1,200 pixels instead of 980; local black-key groups use up to
  80 pixels per white key instead of a small percentage of the viewport. Keyboard height
  is 190–300 pixels except short landscape. Pitch ranges and hit evaluation are unchanged.
- Replaced memory flipping with visible matching. Added duration-to-beat-count as round 4,
  using existing quarter, half, dotted-half, and whole values. Checked-note eligibility
  and exact-octave keyboard/staff matching remain unchanged.
- Removed nested full-page paper sizing from cards. Compact notation SVGs fit complete
  clefs and notes. Keyboard cards use the same renderer, white/black-key colors, middle-C
  landmark, and highlighted targets as other levels.

## Verification

Build: `ce29b4d8fb`. Regression coverage includes four dropdowns, all four matching
modes, complete card-child containment at four viewports, duration/beat completion,
and single-checked-note completion. Synthetic screenshots were inspected for ledger
naming, enlarged keyboard, name/key, name/staff, and duration/beats. No real learner data
was used. Full required release-suite and browser receipt outcomes are recorded in the
[current tracker](../progress_tracker.md).

## Boundaries

No push or remote deployment is authorized. Desktop Chrome viewport emulation does not
establish physical iPad finger accuracy. A narrow viewport still limits full-keyboard
width; local groups gain the largest width improvement. Short phone landscape retains
its existing compact keyboard height to keep the question and answer visible.

## Documentation disposition

Updated AGENTS, LEVELS, user guide, tracker, and this audit. README, development,
cloud operations, and teacher portal docs reviewed unchanged: general capabilities and
operating procedures remain accurate. Retained all prior dated audits.
