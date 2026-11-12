# Fixed Question Quotas and Visual Keyboard Variants

Last updated: 2026-11-12

## Accepted changes

The user requested exact totals for skills 1–21:
6, 6, 6, 4, 4, 8, 8, 6, 10, 8, 5, 8, 6, 4, 6, 6, 6, 6, 8, 8, 6.
`SKILL_COUNTS` is the single runtime authority across difficulty tiers. Fixed totals
supersede automatic session growth for checked-note coverage. Eligible pitches remain
balanced within available slots; larger pools are sampled without extra questions.
Abstract position skills retain their own tasks without appended pitch review.
Daily practice and new-note lessons retain their separate schedules.

Preserved staged progression:

- Skill 7: three direction tasks, two plain-staff comparisons, three clef comparisons.
- Skill 10: one staff placement followed by seven ledger placements.
- Skill 11: four pitch matching rounds followed by one duration matching round.
- Skill 12: five same-clef questions followed by three mixed-clef questions when available.
- Skill 15: three two-note questions followed by three three-note questions when eligible;
  one introductory highest-note question and five target-name questions.
- Skill 18: six distinct keyboards, alternating three staff targets and three letter targets.
- Skill 19: three four-note, three three-note, and two two-note direction questions.
  The longer sequences retain the established introductory contour scaffold. The first
  two blocks cover all three directions; the final block samples two distinct directions.
- Skill 20: four three-note questions followed by four two-note questions; a two-pitch
  selection retains pairs throughout.

Skill 19 uses the same up/down/repeated-note SVG arrows as skill 7. The replay control
is an icon, playback status text is hidden, question prompts contain no visible words,
and correct/incorrect feedback stays symbolic. Accessible labels retain direction names.
Shared navigation and session chrome are preserved.

Skill 18 expands the bank from sixteen to twenty layouts: spiral, zebra, fish, and flower
join the existing shapes. SVG geometry preserves the fourteen white keys C3–B4,
ten black keys, 2–3–2–3 groups, and E–F/B–C gaps. The spiral places black keys on the
outer back edge of the local strip. Zebra decorations sit behind the interactive keys.
All layouts retain a middle-C landmark, exact staff pitch answers, and all-octave letter matching.

## Verification

Build `6ba889db8f` passed `npm run release -- --local --local-only --no-open --port 8775`,
including all 54 Node tests, 1,144 scheduler cases, the full generation matrix,
four-viewport smoke/interaction checks, sync, backup, cloud, portal, storage-failure,
and service-worker offline/upgrade tests. Both local origins matched all runtime hashes.
`npm run cache -- --local-only --port 8775` then collected all four actual Safari/Chrome
boot receipts on 127.0.0.1 and localhost. The final receipt status is `ready`.
Local preview: http://127.0.0.1:8775/index.html?build=6ba889db8f.

Evidence is local only. No push, deployment, live database, or real learner changes are authorized.
The generation matrix checks the requested literal quotas across all 255 checked-note
sets, three difficulties, two histories, three seeds, and twenty-two modes (100,980 sessions).
The visual fixtures instantiate all twenty keyboard layouts and test white centers,
black-key backs, exposed white fronts, and E–F/B–C boundaries at four viewports.
The spiral's rotating radial front uses local hit tests rather than the ring's fixed
midpoint vertical-orientation assertion.

Inspected tablet screenshots: [spiral](spiral.png), [zebra](zebra.png), and
[direction arrows](arrows.png). Fixture screenshots illustrate the question surfaces;
their generic level header is supplied by the fixture, not a recorded student session.
An earlier full-suite attempt timed out in the existing new-note lesson continuation test.
Added diagnostic state and stack output; the subsequent complete smoke run passed
without changing lesson runtime behavior. This does not establish the cause of that timeout.
Physical iPad touch and human audible listening acceptance remain unverified.

## Documentation disposition

Updated AGENTS, LEVELS, README, development guide, user guide, and both owning trackers.
Reviewed parent/games guides and parent README unchanged: workspace ownership, scope,
and publishing boundaries remain accurate. Cloud and teacher-portal operations are unchanged.
Historical audits remain intact. The local submodule pointer is recorded after game commits.
