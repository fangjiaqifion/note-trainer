# Note Trainer

Last updated: 2026-11-11

A single-page, offline-capable notation trainer for young piano beginners. It drills one
chain: note name → key on the keyboard → staff and clef → duration → hand and finger, then
returns to the staff itself: first to name its lines and spaces, then to compare two notes by
position, with and without a clef, then to name ledger positions above and below the staff, and
then to tell visually similar notes apart, place notes at requested ledger positions, and
match note names, keyboard keys, and staff notation in a card game. New notes are introduced one at a time in a
14-question first lesson, then folded into the same eighteen skills.

**Live:** https://fangjiaqifion.github.io/note-trainer/
**Repository:** https://github.com/fangjiaqifion/note-trainer

Current note set: three anchor notes (B3, middle C, D4) are always available; E4 is the
current new note, followed by A3, F4, G4 and A4. The teaching sequence introduces
left-hand A3 after E4, then F4 and G4, and finally upper A4. A3 is the left-hand third finger in the
middle-C position; it is paired with E4 (right-hand third finger). Learned notes can be checked
or unchecked on the home screen. Skills 1–5 and daily practice use the checked notes;
skill 11 also uses checked notes. Skills 6–8 and 10 teach abstract staff positions.
Every pitch-based skill session includes every eligible checked note. Position exercises retain
their line/space tasks and add a staff-to-key review of the checked notes. Sessions grow
when needed to cover the pool. Skill 9 alternates available clefs, varies comparison
pairs, and covers all selected pitches. Skill 12 shows three selected notes together;
same-clef practice precedes three final mixed-clef questions when available.
Mixed-clef notes use separate familiar staff images. Skill 13 asks the child to play
three selected notes from left to right, then choose the highest or lowest. Nearby
pitches and similar line positions receive priority, including treble A3/C4/E4 ledger
comparisons. Mixed groups also use familiar bass-clef cards. Skill 14 places the three
notes on a braced grand staff. Skill 15 briefly shows numbered notes for two seconds,
then hides them for higher-pitch and target-note recall, progressing from two notes
to three after five questions. Three distinct eligible notes are required for skills
13–14; skill 15 requires two.
Skill 16 provides six rhythm measures per session. Read the 2/4, 3/4, or 4/4
time signature and choose the missing quarter, half, dotted-half, or whole note.
It requires no selected pitches. Skill 17 shows two complete measures and asks for
2/4, 3/4, or 4/4. Both use a shared bank of simple, readable rhythm patterns.
Skill 18 draws eight random shapes from sixteen keyboards, including rings,
ribbons, stairs, and origami folds. Each question shows one selected note. Name
targets use only A–G and ask for every matching key across two octaves; found keys
stay marked until all matches are found. Staff targets retain one exact pitch.
Black-key groups and middle C provide landmarks.
The eighteen skill cards remain stable as new lesson notes join the selected pool.
See [the development guide](docs/development.md#adding-a-note).

Each learner has a separate profile with a four-digit local PIN. The profile holds the checked
notes, progress flags, stars, settings, and a per-question practice log. Profiles are stored
in `localStorage`. For a signed-in teacher, learner profiles automatically join their cloud class;
strong recovery codes restore scoped access on another device. Unbound profiles remain local.

On this device, the teacher manages the local roster. Cloud access uses separately authorized roles. A separate teacher PIN unlocks the student roster: the
teacher creates learner profiles, opens every learner's report on this device, and exports all
learners' logs. Parents and students share one limited role: they practice, check notes, change
settings, switch or lock their own profile, and cannot open reports or manage accounts.

## What it is

The game was built for a four-year-old at the very start of piano lessons, so every design
choice follows from two constraints: she cannot read yet, and she practices alone for about
three minutes a day.

- Answers are given by tapping keys on a drawn keyboard or by choosing one of a few staff
  images, never by typing.
- Every question is read aloud by the system voice, so no reading is required.
- Feedback is immediate and positive; a wrong answer is "try again", never "wrong".
- The game is a static single-page app with local modules and no compilation or third-party runtime dependencies, and no network
  requests for piano samples. Cloud profiles automatically synchronize allowlisted practice data and private display labels. It runs from a static host and caches
  its application files for offline use.

Sound is synthesized at runtime with the Web Audio API; there are no audio files to download.
The keyboard uses an additive piano voice: thirteen partials with the slight stretch of a real
string, two strings detuned by 0.35 cent so their average is the exact equal-tempered pitch, a
two-stage decay with no steady sustain, hammer and damper noise, and a light room reverb
generated in code. The fundamental is always the exact equal-tempered frequency, and no
sample-shifting is involved.

Stars, checked notes, progress flags and the practice log live in `localStorage`, in a
separate record for each learner profile.

## Quick start

1. Open the live URL in Safari on the iPad.
2. Tap **Share → Add to Home Screen**. It then opens full screen, like an app, and works
   offline.
3. On first launch the gate has no learners. Tap **老师入口** (Teacher entry), set a teacher
   PIN, then tap **新建学生** (New student) to create the first learner profile: a name or
   participant code and a four-digit learner PIN. If the device already has the old
   single-profile progress, the first profile adopts it.
4. The learner opens their card, enters their PIN, checks the notes to practice under
   **我的音** (My notes), and taps **今日练习** (Daily practice).
5. The teacher opens **老师入口**, enters the teacher PIN, and sees the roster with each
   learner's last seven days.

## Learning activities

Thirteen skill cards cover finding a keyboard key, connecting staff and keyboard, choosing a
clef, reading and holding note values, hand/finger choices, lines and spaces, relative
pitch positions, ledger naming and placement, confusable notes, card matching, and
three-note keyboard/high-low comparisons. A ten-question daily mix uses
the checked learned notes. Each new note has a fourteen-question first lesson that saves
its place after every completed answer.

The game separates a growing note set from a fixed skill menu. Adults choose when to
introduce notes, and learners can revisit individual skills without adding more menu
cards. Hints and difficulty respond to practice history, but lesson completion flags
record exposure rather than independently measured mastery.

See [the user guide](docs/user_guide.md) for profiles, reports, backup/recovery, individual
skills, notation conventions, and difficulty settings.

## Data and teacher support

Learner profiles are stored locally. Teachers can view descriptive practice reports and
export single-profile or full-roster backups. A four-digit local PIN guards switching;
it does not encrypt the records. Back up regularly because browser storage is finite
and clearing website data erases local profiles.

For signed-in cloud teachers, creating a learner automatically enrols and synchronizes the profile.
Scoped recovery codes support another device; teacher and readonly researcher access
are enforced separately from local PINs. An unowned local roster can join its first verified teacher workspace; profiles belonging
to another workspace are never reassigned. See [cloud operation and recovery](docs/cloud_operations.md) for details.

## Evidence and limitations

This game originated from teaching one preschool beginner. Its design aims to support
short, independent practice, but app accuracy, stars, and completion do not establish
transfer to reading new scores or playing a real piano. The pre/post battery is an
in-app comparison, not a validated independent outcome measure.

The drawn keyboard cannot detect actual finger use. A4 currently uses a whole-hand
shift convention without a dedicated shift lesson. Cloud use has controlled synthetic
acceptance evidence; long-term capacity, representative mainland China/Hong Kong
networks, and broader device/audio conditions remain unverified. See the user guide
for the [complete limitations](docs/user_guide.md#known-limitations).

## Roadmap

Product directions and delivered capabilities. This is not an implementation checklist;
current descriptions should stay accurate as the product changes.

| Item | Status | Notes |
|---|---|---|
| F4 and G4 | Shipped 2026-11-03 | Enter after A4 through the same spotlight; the chips can also be opened directly |
| A4 | Shipped 2026-11-03 | Follows E4 and A3 in the current sequence; finger 5 with a whole-hand shift |
| Teacher role and permissions | Shipped 2026-11-03 | Teacher PIN, student roster, all reports, combined CSV; parents and students keep practice, note checks and settings |
| Hand-shift lesson for A4 | Idea | The current convention is "move the whole hand right, fifth finger on A"; a dedicated lesson is still needed |
| Note names for staff lines | Idea | Skill 6 asks where line 2 is; the next step is "line 2 is G" |
| Skill 7 in daily and pre/post | Idea | Two-note comparison is not in the daily mix or the 12-item battery yet |
| Eighth notes | Exploring | `VALUES` already drives the drawing; judging needs a faster tempo |
| More left-hand notes | Idea | B3 and A3 are the only left-hand notes, so skill 5 is still right-hand heavy |
| Ledger placement | Implemented locally | Skill 10 places one staff note and five ledger notes in every tier |
| Grand staff for skill 9 | Idea | The mirror pairs (E4/A3, D4/B3) are most visible on a two-staff system; the current version uses one staff |
| A3 treble spelling | Idea | A3 is taught on the bass staff; its treble spelling (second ledger line below) is not yet taught |
| Progress history for teachers | Shipped 2026-11-03 | Time, daily-by-skill matrix, per-skill and per-note tables, comparison pairs, error-rate trend, print/PDF |
| Adaptive question selection | Shipped 2026-11-02 | Error-weighted note pools and auto difficulty |
| Pre/post testing | Shipped 2026-11-02 | Frozen 12-item battery, same items and difficulty at post |
| Optional cloud classes and recovery | Available for controlled use | Automatic cloud enrolment, scoped recovery, teacher/researcher roles, and disaster recovery; long-term and regional limits remain |
| Account deletion | Idea | The teacher console can clear logs but cannot remove a profile |
| Teacher PIN change or recovery | Idea | The PIN can be set once; there is no change screen and no recovery |
| English interface | Idea | All strings are inline; would need a small dictionary and a switch |
| Sound check | Shipped 2026-10-29 | Settings → "试听" |
| License | Not chosen | See [License](#license) |

## Changelog

See the [dated user-visible changes](docs/changelog.md).

## Development

The app runs from a static host and uses local modules without a compilation step.
For local setup, extending the note set, tests, and release procedures, see
[the development guide](docs/development.md). Contributors should also read
[AGENTS.md](AGENTS.md).

## Credits

The treble clef is `Treble clef.svg` by Tlusťa, and the bass clef is `Clef Bass (F).svg`,
both from Wikimedia Commons and in the public domain. Both paths are inlined in
`index.html`; nothing is fetched at runtime.

The cartoon hands, keyboard, and cover image were drawn for this project.

## License

No license has been chosen yet. Until one is added, the code is public for reference but not
licensed for reuse. If this changes, add a `LICENSE` file and replace this section.

### Teacher portal development

An invitation-based teacher portal is published with an owner-managed administrator account. Teachers register with a reusable
invitation and an alphanumeric username, then save a random teacher key for later login. A
separate, unlinked administrator page manages invitations and teacher access. It requires explicit
server-side administrator authorization and MFA. Database migration, administrator activation, and published-file/browser-load verification
are complete. Teachers use username/key access; only administrators require MFA. See
[portal operations and rollout status](docs/teacher_portal.md).
