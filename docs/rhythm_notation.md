# Beginning rhythm notation

Last updated: 2026-11-11

## Teaching scope

Skills 16 and 17 use quarter, half, dotted-half, and whole notes, valued at
1, 2, 3, and 4 quarter-note beats. They use complete measures in 2/4, 3/4, or
4/4, without rests, ties, pickups, or syncopation exercises. A whole note is a
four-beat note here, not a generic full-measure symbol.

A correct total is necessary but does not by itself ensure readable notation.
The reported old example was a quarter followed by two dotted quarters in 4/4.
Its arithmetic totals four, but the first dotted quarter starts on beat 2 and
crosses beat 3, and the last note begins halfway through beat 3. That sound is
possible, but this notation obscures the beat structure and introduces subdivision
and syncopation beyond this exercise. Remove that pattern and the dotted-quarter option.

## Shared pattern bank

The runtime declaration RHYTHM_PATTERNS is the canonical implementation.
Use these beginner patterns rather than permuting arbitrary note durations.

| Meter | Patterns, in quarter-note beats |
|---|---|
| 2/4 | 1+1; 2 |
| 3/4 | 1+1+1; 2+1; 1+2; 3 |
| 4/4 | 1+1+1+1; 2+2; 2+1+1; 1+1+2; 3+1; 4 |

The 3/4 patterns show familiar 2+1 or 1+2 divisions or one dotted-half note.
Most 4/4 patterns make its two halves visible. A dotted half starting on beat 1
and a whole note are familiar longer-value conventions. This is a deliberately
limited beginning bank, not an exhaustive list of legal notation. Do not teach
a blanket rule that every long note crossing beat 3 is forbidden: conventional
single-value exceptions exist.

Skill 16 removes one duration from an approved complete pattern. Six questions
cover all four answers, with randomized patterns, blank positions, and choices.
Skill 17 shows two approved complete measures with the same total and asks
for 2/4, 3/4, or 4/4. Its six questions cover each meter twice. A time-signature
answer is unambiguous within these three choices because the beat unit is
always the quarter note and neither measure is incomplete.

## Sources and interpretation

Checked 2026-11-11. These sources informed the rules; no textbook score images
or text passages are copied into the product.

- [The Open University, 3.3 Time signatures](https://www.open.edu/openlearn/history-the-arts/music/an-introduction-music-theory/content-section-3.3):
  the upper number counts beats and the lower number specifies the beat unit
  in the simple meters used here.
- [The Open University, 3.5 Dots and ties](https://www.open.edu/openlearn/history-the-arts/music/an-introduction-music-theory/content-section-3.5):
  dots extend duration by half the original value; ties combine durations.
- [The Open University, 3.6 Grouping and beaming notes](https://www.open.edu/openlearn/history-the-arts/music/an-introduction-music-theory/content-section-3.6):
  grouping supports readable beats, with conventional exceptions. Its discussion
  of not beaming across the middle of 4/4 concerns beaming, not a blanket ban
  on longer notes.
- [E. P. Hellberg, Grade 2 extracts (2015), printed p. 19, PDF p. 6](https://theoryofmusic.co.za/wp-content/uploads/2020/11/Grade_2_extracts.pdf):
  summarizes visible middle divisions in duple/quadruple meter and 1+2 or
  2+1 in triple meter, while allowing conventional single-value groupings.

The curated bank and exclusion of subdivision/syncopation are this game's
instructional choices based on those principles, not verbatim examination-board
rules. Broader rhythm lessons need their own design review.
