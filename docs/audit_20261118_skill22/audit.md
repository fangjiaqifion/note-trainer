# Skill 22 scaffolding acceptance

Date: 2026-11-18

## Request and implementation

Classroom feedback identified the independent three-note placement task as too hard.
The session now has four two-note questions followed by four three-note questions.
Two-note questions fix the first note at the middle screen height and balance the
second note above/below two each. Three-note questions sample four unique C4/E4/G4
orders and fix E4 at the middle height. A lock identifies the reference note.
All notes start at the reference line. No labels reveal pitch answers.

The same playback sequence supplies scoring. Fixed notes reject pointer dragging,
column taps, and keyboard movement. Automatic playback, replay, playback input
locking, cancellation, correction, and the shared answer lifecycle are retained.
Skill 23 is unchanged.

## Verification scope

Generation coverage checks both block quotas, immutable-reference metadata,
balanced pair directions, distinct heights, and sounding/scoring agreement.
Chrome regression completes all eight questions and attempts keyboard/drag changes
to each reference. Existing tests cover actual oscillator frequencies, inverted-answer
rejection, replay/disposal, pointer placement, and four responsive viewports.

Only synthetic local test contexts are used. No live learner/database changes,
push, or deployment. Physical iPad interaction and human audible/classroom
acceptance remain unverified. Release evidence is recorded in the current tracker.

## Documentation review

Updated AGENTS, LEVELS, README, development, user guide, and tracker to replace the
previous six-permutation specification. Cloud/portal procedures and parent/games
guides and overviews remain accurate because protocols, scope, and ownership did
not change. Historical audits retain their original question-bank descriptions.
