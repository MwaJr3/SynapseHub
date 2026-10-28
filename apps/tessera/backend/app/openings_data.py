"""A starter set of openings: factual ECO codes, names and move sequences.

Opening names, ECO codes and move sequences are reference data, not creative
text. Every `idea` note below was written for this project. This is a small
starter set attached to the Queenside/Kingside principles already in the
curriculum - not a repertoire generator.
"""

from __future__ import annotations

from .openings import Opening, san_line, validate_opening

#: (eco, name, family, moves_uci, idea)
RAW: list[tuple[str, str, str, list[str], str]] = [
    ("B20", "Sicilian Defence", "Sicilian",
     ["e2e4", "c7c5"],
     "Black answers the centre with a flank pawn, unbalancing the position from move one. "
     "The trade is space for counterplay on the queenside."),
    ("B50", "Sicilian, Classical", "Sicilian",
     ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4"],
     "White opens the centre and gets a knight to d4; Black accepts a slightly cramped but "
     "solid position with play against the d4 knight."),
    ("B90", "Sicilian, Najdorf", "Sicilian",
     ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"],
     "The most heavily analysed line in chess. a7-a6 controls b5 and prepares ...e5 or ...b5, "
     "keeping maximum flexibility."),
    ("C50", "Italian Game", "Italian",
     ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"],
     "The bishop takes the a2-g8 diagonal before the position closes. Direct, principled and "
     "the best place for a beginner to learn development."),
    ("C55", "Italian, Two Knights Defence", "Italian",
     ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6"],
     "Black develops and hits e4 rather than defending passively. White must decide between "
     "quiet development and the sharp Ng5 lines."),
    ("C65", "Ruy Lopez, Berlin Defence", "Ruy Lopez",
     ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "g8f6"],
     "The pin on c6 is tested immediately. The resulting endgames are famously hard to win "
     "against a prepared opponent - a good practical choice."),
    ("D06", "Queen's Gambit", "Queen's Gambit",
     ["d2d4", "d7d5", "c2c4"],
     "A pawn offer on c4. Accepting does not win a pawn cleanly, because White regains it "
     "with e2-e3 and a bishop on the long diagonal."),
    ("D30", "Queen's Gambit Declined", "Queen's Gambit",
     ["d2d4", "d7d5", "c2c4", "e7e6"],
     "Black holds the centre rather than grabbing material. The cost is a passive light-squared "
     "bishop, which shapes the whole middlegame."),
    ("A45", "Indian Game", "Indian",
     ["d2d4", "g8f6"],
     "Black controls e4 from a distance and delays committing pawns to the centre. Flexible, "
     "and the gateway to the King's Indian and Nimzo-Indian structures."),
    ("A10", "English Opening", "English",
     ["c2c4"],
     "A flank first move that fights for d5 without occupying the centre. Often transposes into "
     "Queen's Gambit or Indian structures - so naming it early is a choice, not a distinction."),
]


def build_openings() -> list[Opening]:
    """Construct validated Opening records, raising on any bad line."""
    result: list[Opening] = []
    for eco, name, family, moves, idea in RAW:
        opening = Opening(
            id=f"eco-{eco.lower()}-{moves[-1]}",
            eco=eco,
            name=name,
            family=family,
            moves_san=san_line(moves),
            moves_uci=" ".join(moves),
            idea=idea,
        )
        validate_opening(opening)
        result.append(opening)
    return result
