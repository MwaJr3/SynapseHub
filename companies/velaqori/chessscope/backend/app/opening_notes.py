"""Original study notes for well-known openings.

Provenance: written for ChessScope by the project authors (not copied from Lotus Chess,
Kinnu, books or any course). Names/ECO codes/moves come from lichess-org/chess-openings (CC0);
the prose here is original. A note applies to its exact opening name and to every
sub-variation whose name starts with "<name>:" unless that sub-variation has its own note.

Fields: structure (pawn structure tag), white / black (plans), pitfalls (typical errors).
"""
from __future__ import annotations

NOTES_SOURCE = "ChessScope original notes"
NOTES_LICENSE = "Project license (original text)"

# name -> (structure, white plan, black plan, pitfalls)
_N: dict[str, tuple[str, str, str, str]] = {
    "Italian Game": ("open centre", "Build a broad centre with c3 and d4, keep the bishop on the a2-g8 diagonal, castle early.", "Mirror with ...Nf6 and ...d6/...d5; neutralise the bishop and challenge the centre in one go.", "Rushing Ng5 or Qh5 attacks before development is finished just loses time."),
    "Italian Game: Giuoco Piano": ("open centre", "Play c3 followed by d4 to claim the centre; a slow d3 setup keeps tension instead.", "Answer ...Nf6, castle, then ...d5 to free the position once the king is safe.", "Grabbing the e4 pawn without counting defenders can walk into a pin on the e-file."),
    "Italian Game: Two Knights Defense": ("open centre", "Choose between the sharp Ng5 and the calm d3/c3 development; know what you are risking.", "Counter-attack on e4 with ...Nf6 and be ready for 4.Ng5 d5 where precise play is needed.", "After 4.Ng5 d5 5.exd5, grabbing material with ...Nxd5 loses to Nxf7 tricks; ...Na5 or ...Nd4 are the principled ideas."),
    "Ruy Lopez": ("semi-open centre", "Pressure the knight that defends e5, aim for c3 and d4, and keep the bishop pair in reserve.", "Hold e5 solidly, challenge the bishop with ...a6 and ...b5 when it is safe, and aim for ...d5.", "Both sides trade pieces too eagerly; the opening rewards patience and manoeuvring."),
    "Ruy Lopez: Berlin Defense": ("open endgame-like", "Aim for a slightly better structure: Black's doubled pawns are a long-term target.", "Accept doubled pawns in exchange for the bishop pair and a very solid king.", "White gets nowhere by rushing; Black must not treat the queenless middlegame as drawn by default."),
    "Ruy Lopez: Closed": ("closed centre", "Prepare d4 with c3 and h3; later regroup the knight toward f5 or g3.", "Use the space-gaining ...b5 and ...d6 and prepare ...Na5/...c5 to break the centre.", "Playing ...f6 or ...g5 loosens the king before the centre is resolved."),
    "Ruy Lopez: Exchange Variation": ("pawn majority endgame", "Give Black doubled c-pawns and aim for a kingside 4-vs-3 majority in the endgame.", "The bishop pair compensates; trade queens only if the structure is favourable.", "White must convert with the majority; Black must keep pieces active to avoid a worse endgame."),
    "Scotch Game": ("open centre", "Open the centre at once with d4 to gain space and activate pieces quickly.", "Develop fast with ...Nf6 or ...Bc5 and avoid being pushed back by Nxc6 tactics.", "Delaying development after the early exchanges lets White seize the initiative."),
    "Four Knights Game": ("symmetrical open", "A solid way to develop; look for Nd5 or Bb5 ideas to unbalance.", "Keep symmetry in check and prepare ...d5 when ready.", "Drawish if both sides copy; take a decision on where to create imbalances."),
    "Petrov's Defense": ("symmetrical open", "Take the central tension carefully; the knight on e5 is attackable only after Nxe5.", "Counter-attack e4 immediately and recapture on e5 after d4; stay solid.", "Black must avoid 3...Nxe4? 4.Qe2 tricks and not simply copy White's moves."),
    "Philidor Defense": ("hedgehog-like", "Take space with d4 and develop smoothly; look for kingside activity.", "Keep e5 supported with ...d6 and ...Nd7; strike back with ...exd4 and ...c6.", "Cramped pieces and passive play can leave Black unable to ever break through."),
    "King's Gambit": ("open f-file", "Sacrifice a pawn for rapid development and an open f-file.", "Accept with ...exf4 and return the material when attacked, or decline solidly.", "Weakening the white king with g4 and h4 without a concrete follow-up often just loses."),
    "Vienna Game": ("flexible centre", "Develop Nc3 first and keep f4 in reserve for a gambit-style break.", "Strike with ...Nf6 and ...d5 to claim equality in the centre.", "Both sides often misjudge the f4 break because it weakens the king."),
    "Bishop's Opening": ("flexible", "Develop the bishop and keep Nf3, d3 or c3 options open.", "Reply with ...Nf6 and ...d5, counter-attacking e4.", "Not a forcing line; the side that develops pieces fastest gets the edge."),
    "Sicilian Defense": ("asymmetric open", "Open the d-file with d4 and use the central space; castle quickly and attack on the kingside.", "Trade the c-pawn for White's d-pawn; use the half-open c-file and aim at queenside play.", "Ignoring development to chase pawns on the c- or b-file."),
    "Sicilian Defense: Najdorf Variation": ("asymmetric open", "Choose a setup (Bg5, Be3 or Be2) and keep a kingside attack or central control going.", "...a6 prepares ...b5 and ...e5; Black often fights for ...d5 as a thematic break.", "Pawn grabbing with ...Qb6 and ...Qxb2 in this line is dangerous: the queen can be trapped."),
    "Sicilian Defense: Dragon Variation": ("asymmetric open", "Castle queenside, open the h-file with h4-h5, and attack the fianchettoed king.", "The long diagonal bishop and the half-open c-file give counter-chances; time is critical.", "Mutual pawn storms mean one tempo decides the game."),
    "Sicilian Defense: Classical Variation": ("asymmetric open", "Develop naturally with Be2 or Bg5; keep an eye on the e4-e5 break.", "...Nc6 and ...Nf6 develop with a solid, flexible setup.", "Neglecting the d5 square leaves long-term holes."),
    "Sicilian Defense: Alapin Variation": ("semi-closed centre", "Take the centre with c3 and d4 and avoid theory on the open Sicilian.", "Respond with ...d5 or ...Nf6; use quick central counterplay.", "Allowing a cramped position if you play ...d6 without a clear plan."),
    "Sicilian Defense: Taimanov Variation": ("asymmetric open", "Build a flexible centre with Nc3 and Be3; watch for kingside attacks.", "Keep options open with ...Nc6 and ...Qc7; the pieces are placed before committing pawns.", "Premature ...Nxd4 can leave a weak d-pawn."),
    "Sicilian Defense: Scheveningen Variation": ("small centre", "Use Be3 and f3 to build a rock-solid centre and attack on the kingside.", "A compact structure with ...e6 and ...d6; counterplay via ...b5 and ...Qc7.", "Passivity: Black can be mated if the centre is not challenged in time."),
    "Sicilian Defense: Accelerated Dragon": ("Maroczy Bind possible", "Play c4 to clamp down on d5 and restrict ...d5 breaks.", "Avoid the bind by ...d5 break or relieve it with exchanges.", "Delaying the ...d5 break allows a lasting space disadvantage."),
    "Sicilian Defense: Smith-Morra Gambit": ("open gambit", "Sacrifice a pawn for rapid development and open files for the rooks.", "Accept with ...dxc3 and develop accurately; return the pawn only if forced.", "Greedily taking pawns while falling behind in development."),
    "Sicilian Defense: Closed": ("closed centre", "Play g3 and Bg2 with f4 as an attacking lever.", "Use ...e6 and ...Nge7 with a queenside minority push.", "Overextension on either flank when the centre is closed."),
    "French Defense": ("closed centre", "Gain space with e5 or exchange and play for a simple advantage.", "Attack White's pawn chain at the base with ...c5 and ...f6; solve the light-squared bishop.", "The c8-bishop is the 'bad piece'; fail to find a role for it and the game drifts."),
    "French Defense: Advance Variation": ("closed centre", "Hold the chain with c3 and Nf3; push on the kingside if Black's bishop is stuck.", "Pound d4 with ...c5, ...Nc6 and ...Qb6; the chain's base is the key target.", "Neglecting d4 loses the thematic fight for the centre."),
    "French Defense: Exchange Variation": ("symmetrical", "Simple development; look to open the e-file and take a small initiative.", "Trade the bad bishop and avoid being outplayed by quiet manoeuvres.", "Both sides sleep; a missed tactic decides."),
    "French Defense: Winawer Variation": ("doubled pawns", "Break the pin with a3, accept the doubled pawns, and use the bishop pair and space.", "Trade the dark-squared bishop and play against the weakened queenside.", "Mistakes in pawn grabs (...Qxg2) can expose the black king."),
    "French Defense: Tarrasch Variation": ("closed centre", "Avoid the pin of the Winawer; develop and keep the pawn chain solid.", "Play ...c5 at the right moment or the isolated pawn structures.", "Late ...c5 can leave a lasting space disadvantage."),
    "Caro-Kann Defense": ("solid", "Gain space with the advance, or exchange for a calm game with chances to play on the queenside.", "Play ...d5 with a healthy pawn structure; develop the light bishop before ...e6.", "A cramped position if White seizes space and Black remains passive."),
    "Caro-Kann Defense: Advance Variation": ("closed centre", "Take space and aim for kingside expansion.", "Relieve space issues with ...c5 and develop the bishop to f5 before closing in.", "Forgetting to develop the c8-bishop first."),
    "Caro-Kann Defense: Classical Variation": ("open centre", "Develop quickly; aim at the queenside structure of Black.", "Play ...Bf5 or ...Nf6 followed by ...e6; trade light bishops if possible.", "Missing a tactic on the h7 square when the bishop is exposed."),
    "Scandinavian Defense": ("early queen sortie", "Gain tempi by chasing the queen and aim for a lead in development.", "Recapture with the queen or ...Nf6, and later complete development with ...c6, ...Bf5.", "Queen gets trapped or chased too often; retreat to a5 or d6 safely."),
    "Alekhine Defense": ("space for pieces", "Advance pawns to gain space but watch for overextension.", "Provoke White's pawns forward and undermine them with ...d6 and ...c5.", "Black's knight is easily harassed; avoid losing tempi to repeated attacks."),
    "Pirc Defense": ("hypermodern", "Occupy the centre with e4, d4 and Nc3; consider the Austrian Attack with f4.", "Fianchetto the bishop and hit the centre with ...c5 or ...e5 when ready.", "Allowing a massive white centre without a concrete counter-plan."),
    "Pirc Defense: Austrian Attack": ("big white centre", "Push e5 or f5 to attack Black's king.", "Strike with ...c5 and ...Nc6 at the right moment to break the centre.", "A passive reply gets Black mated or crushed."),
    "Modern Defense": ("hypermodern", "Build a centre and decide between quiet and attacking setups.", "Fianchetto the bishop and wait before committing the centre pawns.", "Concessions: giving White too much space without compensation."),
    "Queen's Gambit": ("open d-file", "Use the c-pawn offer to gain central control with d4 and e4.", "Stay solid with ...e6 or ...c6, or accept and give back the pawn at the right time.", "Taking the pawn and trying to keep it leads to trouble in development."),
    "Queen's Gambit Accepted": ("open centre", "Regain the pawn with e3 and Bxc4, then take the centre.", "Give back the pawn for rapid development and equal centre control.", "Trying to hold the c4 pawn costs time and loses the centre."),
    "Queen's Gambit Declined": ("classical", "Aim for minority attack on the queenside or central e4 break.", "Develop the pieces calmly and trade the 'bad' bishop; ...c5 and ...dxc4 break.", "Locking the light-squared bishop behind the pawn chain without a plan."),
    "Slav Defense": ("solid", "Seize the centre, develop the bishop outside the pawn chain.", "Protect d5 with ...c6 and develop the c8-bishop before ...e6.", "Allowing a pawn grab on c4 and not having a plan to regain it."),
    "Semi-Slav Defense": ("complex", "Play e3 for solidity or Bg5 for sharper play; watch for central breaks.", "Combine ...c6 and ...e6 for a rock-solid but active setup; break with ...dxc4 and ...b5.", "Black's light bishop gets locked in; time the break carefully."),
    "London System": ("system opening", "Set up with Bf4, e3, Nf3, c3 and Bd3; play for a calm game.", "Strike at the centre with ...c5 and ...Qb6; pressure b2 and d4.", "Following the setup blindly against ...c5 and ...Qb6 can leave b2 weak."),
    "Catalan Opening": ("fianchetto", "Press along the long diagonal and use the bishop pair; keep the pressure with Qc2 and Nbd2.", "Hold the centre with ...Be7 and ...dxc4; give the pawn back when needed.", "White: sacrificing the c4 pawn for long-term compensation requires patience."),
    "Nimzo-Indian Defense": ("flexible", "Break the pin with a3 or Qc2; use the bishop pair or e4.", "Pin the knight with ...Bb4 and ...c5; double White's pawns if allowed.", "Forgetting about the central pawn tension while chasing pawns."),
    "Queen's Indian Defense": ("flexible", "Control e5 and seek a space advantage; develop smoothly.", "Control e4 with ...Bb7 and ...Be7; aim for ...d5 or ...c5.", "Black ignores the e5 square and lets White take the centre."),
    "King's Indian Defense": ("closed centre", "Take space; play for a queenside attack with c5 or b4.", "Counter-attack on the kingside with ...f5, ...g5 and ...Nh5.", "A race: slow play loses to a faster attack."),
    "Grünfeld Defense": ("dynamic", "Build a big centre but watch for ...c5 and ...Qa5 pressure.", "Allow White to build a big centre then hit it with ...c5 and ...Nc6; fianchetto bishop.", "A huge centre can be a target; Black must act at the right time."),
    "Benoni Defense": ("asymmetric", "Use the e4-e5 push and space to restrict Black.", "Use the queenside pawn majority, aim for the ...b5 break and active pieces.", "Black must generate counterplay quickly or be squeezed."),
    "Dutch Defense": ("flank control", "Hit the e5 square and attack the f5 pawn; use the long diagonal.", "Control e4 with ...f5 and aim for a kingside attack.", "The weakened king: White's a3/b4 queenside play is easy if Black is slow."),
    "English Opening": ("flexible", "Control d5 with c4; keep the centre flexible and use a fianchetto.", "Respond solid with ...e5, or ...c5 for symmetry; take control of d4.", "Not choosing a plan: the move order is the main skill."),
    "Réti Opening": ("hypermodern", "Fianchetto and wait; strike in the centre with c4 and d4 later.", "Occupy the centre with ...d5 and ...e6 or hit the fianchettoed bishop.", "Too passive play lets the opponent take over the centre."),
    "Trompowsky Attack": ("early bishop", "Pin the knight with Bg5 to unbalance the position early.", "Answer ...Ne4 or ...d5; avoid weakening the kingside.", "Wasting time with the bishop invites a strong pawn centre."),
    "Benko Gambit": ("gambit", "Accept the pawn and consolidate, then return it at the right time.", "Open the queenside files and use pressure on a1-h8; the pawn is compensated by activity.", "Black's long-term compensation requires patient play along the a- and b-files."),
    "Bird Opening": ("flank", "Control e5 with f4 and aim at the kingside.", "Answer with ...d5 and ...Nf6; attack the f4 pawn or play ...e5 gambits.", "Weakened e1-h4 diagonal makes the king vulnerable."),
    "Tarrasch Defense": ("isolated pawn", "Prepare to play against the isolated d-pawn; block and trade.", "Accept the isolated pawn for activity; piece play.", "Passivity makes the isolated pawn a long-term weakness."),
}

NOTES: dict[str, dict[str, str]] = {
    name: {"structure": s, "white_plan": w, "black_plan": b, "pitfalls": p} for name, (s, w, b, p) in _N.items()
}


def note_for(name: str) -> dict[str, str] | None:
    """Exact name first, then the nearest 'Parent: ...' prefix, then the family before the colon."""
    if name in NOTES:
        return NOTES[name]
    parts = name.split(": ")
    while len(parts) > 1:
        parts = parts[:-1]
        key = ": ".join(parts)
        if key in NOTES:
            return NOTES[key]
    return None
