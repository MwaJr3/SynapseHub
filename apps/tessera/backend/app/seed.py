"""Seed the knowledge graph, lessons, questions and chess puzzles.

All material here is **original**, written for this project, and is declared as
such in the `sources` table. Nothing is copied from another learning product:
the mechanics are inspired by good learning science, the words are ours.

Run with `python3 -m app.seed`. Idempotent: existing rows are left alone.
"""

from __future__ import annotations

from datetime import date

from .chess_modality import validate_puzzle
from .database import Base, SessionLocal, engine
from .open_content import seed_catalogue
from .openings_data import build_openings
from .models import ChessPuzzle, Concept, ConceptEdge, Lesson, OpeningRow, Question, SourceRow

SOURCE_ID = "src-tessera-original"

CONCEPTS: list[dict] = [
    {
        "id": "py.variables",
        "title": "Variables and names",
        "subject": "Python",
        "difficulty": 2.0,
        "ordering": 1,
        "summary": "A name bound to a value, and why rebinding is not the same as mutating.",
        "explanation": (
            "A variable in Python is a name attached to an object, not a box that holds a value. "
            "`a = [1, 2]` binds the name `a` to a list object. `b = a` binds a second name to the "
            "same object, so a change made through `b` is visible through `a`. Rebinding — `a = [3]` — "
            "attaches `a` to a different object and leaves `b` alone. Most confusion about Python "
            "'pass by reference' comes from mixing up rebinding and mutation."
        ),
    },
    {
        "id": "py.functions",
        "title": "Functions and argument passing",
        "subject": "Python",
        "difficulty": 2.5,
        "ordering": 2,
        "summary": "Parameters, defaults evaluated once, and why mutable defaults surprise people.",
        "explanation": (
            "A function groups behaviour behind a name. Arguments are bound to parameter names when "
            "the call happens. Default values are evaluated once, when the function is defined — so a "
            "mutable default such as `def add(item, bucket=[])` reuses one list across every call. The "
            "idiomatic fix is `bucket=None` followed by `if bucket is None: bucket = []`."
        ),
    },
    {
        "id": "py.exceptions",
        "title": "Exceptions and error handling",
        "subject": "Python",
        "difficulty": 3.0,
        "ordering": 3,
        "summary": "Catching what you can handle, and letting the rest propagate.",
        "explanation": (
            "An exception interrupts normal flow and unwinds the stack until something catches it. "
            "A bare `except:` catches everything, including `KeyboardInterrupt`, and hides bugs. Catch "
            "the specific type you can actually recover from, and re-raise or let the rest propagate. "
            "`finally` runs whether or not an exception occurred, which is what makes it the right place "
            "to release a resource."
        ),
    },
    {
        "id": "py.files",
        "title": "Files and resource handling",
        "subject": "Python",
        "difficulty": 3.0,
        "ordering": 4,
        "summary": "Context managers, encodings, and never leaving a handle open.",
        "explanation": (
            "`with open(path, encoding='utf-8') as handle:` closes the file even if the body raises. "
            "Always state the encoding: the platform default varies, and a file written as UTF-8 and "
            "read as something else produces mojibake rather than an error. Read large files in chunks "
            "instead of calling `.read()` on an unknown size."
        ),
    },
    {
        "id": "chess.pieces",
        "title": "Piece movement and legal play",
        "subject": "Chess",
        "difficulty": 1.5,
        "ordering": 5,
        "summary": "How each piece moves, and the rules that constrain every move.",
        "explanation": (
            "Each piece moves differently: rooks on ranks and files, bishops diagonally, queens both, "
            "knights in an L, kings one square, pawns forward with diagonal captures. Legality is more "
            "than movement: you may not leave your own king in check, castling has conditions about "
            "king and rook movement and passing through attacked squares, en passant is only available "
            "immediately after a double pawn push, and promotion happens on reaching the far rank."
        ),
    },
    {
        "id": "chess.tactics",
        "title": "Tactical motifs",
        "subject": "Chess",
        "difficulty": 3.0,
        "ordering": 6,
        "summary": "Forks, pins, skewers and discovered attacks — recognising the shapes.",
        "explanation": (
            "A fork attacks two targets at once with one piece. A pin restricts a piece because moving "
            "it would expose something more valuable behind it. A skewer is the reverse: the valuable "
            "piece is in front and must move, exposing what is behind. A discovered attack is created "
            "by moving one piece out of the way of another. Recognition beats calculation: most tactical "
            "chances are found by pattern, then verified by calculation."
        ),
    },
    {
        "id": "chess.endgames",
        "title": "Basic endgames",
        "subject": "Chess",
        "difficulty": 3.5,
        "ordering": 7,
        "summary": "King activity, opposition, and the mates every player should know.",
        "explanation": (
            "In the endgame the king becomes a fighting piece. King and queen versus king, and king and "
            "rook versus king, are mates that must be delivered without stalemate. King and pawn endings "
            "turn on the opposition: the side that does not have to move first can often force the "
            "opposing king away. Knowing these positions converts wins that would otherwise be drawn."
        ),
    },
    {
        "id": "sec.threat-model",
        "title": "Threat modelling",
        "subject": "Security",
        "difficulty": 2.5,
        "ordering": 8,
        "summary": "Naming assets, adversaries and trust boundaries before writing code.",
        "explanation": (
            "A threat model states what you are protecting, from whom, and where the trust boundaries "
            "are. Assets are the things worth attacking — data, credentials, availability. Adversaries "
            "range from opportunistic scanners to insiders. Every place data crosses from a less trusted "
            "zone to a more trusted one is a boundary that needs a control. A model that lists no "
            "adversary and no boundary has not modelled anything."
        ),
    },
    {
        "id": "sec.input-validation",
        "title": "Input validation and injection",
        "subject": "Security",
        "difficulty": 3.0,
        "ordering": 9,
        "summary": "Validate on the boundary, parameterise queries, never build commands by concatenation.",
        "explanation": (
            "Injection happens when data is interpreted as instructions: SQL built by string "
            "concatenation, shell commands assembled from user input, HTML rendered unescaped. The "
            "durable fix is structural — parameterised queries, argument arrays instead of shell "
            "strings, contextual escaping on output. Validation at the boundary (type, length, shape, "
            "allow-list) narrows what reaches the core, but it is not a substitute for safe construction."
        ),
    },
    {
        "id": "sec.hashing",
        "title": "Hashing and password storage",
        "subject": "Security",
        "difficulty": 3.0,
        "ordering": 10,
        "summary": "Fast hashes are for integrity; slow, salted hashes are for passwords.",
        "explanation": (
            "A cryptographic hash maps input to a fixed-size digest. It is fast and one-way, which "
            "makes it right for integrity checks and wrong for passwords: an attacker can try billions of "
            "candidates per second. Passwords need a deliberately slow, salted key-derivation function "
            "(scrypt, Argon2, bcrypt) with a unique salt per password, so identical passwords do not "
            "produce identical digests and precomputed tables are useless."
        ),
    },
]

#: (prerequisite, dependent)
EDGES: list[tuple[str, str]] = [
    ("py.variables", "py.functions"),
    ("py.functions", "py.exceptions"),
    ("py.exceptions", "py.files"),
    ("chess.pieces", "chess.tactics"),
    ("chess.tactics", "chess.endgames"),
    ("sec.threat-model", "sec.input-validation"),
    ("sec.threat-model", "sec.hashing"),
]

LESSONS: list[dict] = [
    {
        "id": "ls-py-variables",
        "concept_id": "py.variables",
        "title": "Names, not boxes",
        "hook": "Two names, one list, and a bug that looks impossible.",
        "explanation": "Binding attaches a name to an object. Rebinding moves the name; mutation changes the object both names still refer to.",
        "example": "a = [1]\nb = a\nb.append(2)\nprint(a)  # [1, 2] — same object\na = [9]\nprint(b)  # [1, 2] — rebinding a did not touch b",
        "application": "When a function seems to change a caller's variable 'for no reason', check whether both names point at the same mutable object.",
        "recap": "Rebinding ≠ mutation. `is` compares identity; `==` compares value.",
        "est_minutes": 4,
    },
    {
        "id": "ls-py-functions",
        "concept_id": "py.functions",
        "title": "Defaults are evaluated once",
        "hook": "Why the same empty list keeps coming back with old items in it.",
        "explanation": "Default arguments are computed at definition time, not call time.",
        "example": "def add(item, bucket=[]):\n    bucket.append(item)\n    return bucket\n\nadd(1)  # [1]\nadd(2)  # [1, 2] — the same list",
        "application": "Use a sentinel default (`None`) and create the mutable value inside the function.",
        "recap": "Mutable defaults are shared state disguised as a default.",
        "est_minutes": 5,
    },
    {
        "id": "ls-py-exceptions",
        "concept_id": "py.exceptions",
        "title": "Catch narrowly, fail loudly",
        "hook": "The bare except that hid a typo for three weeks.",
        "explanation": "Catch the specific exception you can handle; let everything else surface.",
        "example": "try:\n    value = int(raw)\nexcept ValueError:\n    value = 0  # only this failure is expected",
        "application": "Put cleanup in `finally`, or better, use a context manager.",
        "recap": "A broad catch converts a crash into silent corruption.",
        "est_minutes": 5,
    },
    {
        "id": "ls-py-files",
        "concept_id": "py.files",
        "title": "Open, then close — reliably",
        "hook": "A file handle that leaked because the body raised.",
        "explanation": "`with` guarantees the close, even on failure. Always declare the encoding.",
        "example": "with open('report.csv', encoding='utf-8', newline='') as handle:\n    for line in handle:\n        process(line)",
        "application": "Stream instead of reading an unknown-size file into memory in one call.",
        "recap": "Context manager for lifetime, explicit encoding for correctness.",
        "est_minutes": 4,
    },
    {
        "id": "ls-chess-pieces",
        "concept_id": "chess.pieces",
        "title": "Legal is more than 'it moves that way'",
        "hook": "You found a great move. Your king disagrees.",
        "explanation": "A move is legal only if it follows the piece's movement and leaves your king safe.",
        "example": "A pinned knight cannot move, because moving it would expose the king behind it.",
        "application": "Before playing a move, ask what it unmasks — including your own king's line.",
        "recap": "Castling, en passant and promotion all carry extra conditions.",
        "est_minutes": 6,
    },
    {
        "id": "ls-chess-tactics",
        "concept_id": "chess.tactics",
        "title": "Look for loose pieces",
        "hook": "Two undefended pieces are a fork waiting to happen.",
        "explanation": "Tactics usually start from a loose or overloaded piece, not from a brilliant idea.",
        "example": "A knight check that also attacks an undefended rook is a fork: the check must be answered, and the rook falls.",
        "application": "Scan for undefended pieces and pieces doing two jobs before calculating deeply.",
        "recap": "Pattern first, calculation second.",
        "est_minutes": 6,
    },
    {
        "id": "ls-chess-endgames",
        "concept_id": "chess.endgames",
        "title": "The king is a piece",
        "hook": "One square decides a drawn game from a won one.",
        "explanation": "In the endgame, king activity and opposition decide more games than material.",
        "example": "King and queen mate: drive the lone king to the edge, then bring your own king close enough to deliver mate without stalemate.",
        "application": "Practise the basic mates until they are automatic; they decide real results.",
        "recap": "Opposition means making the opponent move first into a worse square.",
        "est_minutes": 7,
    },
    {
        "id": "ls-sec-threat-model",
        "concept_id": "sec.threat-model",
        "title": "Name the adversary first",
        "hook": "'Secure' is meaningless until you say who from.",
        "explanation": "Assets, adversaries and trust boundaries turn a vague worry into a testable list.",
        "example": "A contact form's asset is the inbox; the adversary is anyone who can reach the endpoint; the boundary is the HTTP edge.",
        "application": "Write one sentence per asset describing who would want it and how they would reach it.",
        "recap": "No adversary, no model.",
        "est_minutes": 5,
    },
    {
        "id": "ls-sec-input-validation",
        "concept_id": "sec.input-validation",
        "title": "Build safely, then validate",
        "hook": "Validation is a filter, not a force field.",
        "explanation": "The structural fix (parameterisation) is what stops injection; validation narrows input.",
        "example": "cursor.execute('SELECT * FROM users WHERE email = ?', (email,)) — data never becomes SQL.",
        "application": "Grep for string-concatenated SQL and shell commands; replace them rather than escaping harder.",
        "recap": "Safe construction beats clever escaping.",
        "est_minutes": 5,
    },
    {
        "id": "ls-sec-hashing",
        "concept_id": "sec.hashing",
        "title": "Slow on purpose",
        "hook": "The hash that is too fast to protect a password.",
        "explanation": "Passwords need a salted, deliberately slow KDF; integrity checks need a fast hash.",
        "example": "scrypt(password, salt, n=2**14, r=8, p=1) is expensive by design; SHA-256 is not, for this purpose.",
        "application": "Store a per-user salt with the digest, and raise the cost factor as hardware improves.",
        "recap": "Fast hash for files, slow salted hash for secrets.",
        "est_minutes": 5,
    },
]

#: Each question targets one misbelief, which is reported back to the learner.
QUESTIONS: list[dict] = [
    {
        "id": "q-py-variables-1",
        "concept_id": "py.variables",
        "difficulty": 2.0,
        "prompt": "After `a = [1]; b = a; b.append(2)`, what does `a` contain?",
        "choices": ["[1]", "[1, 2]", "An error", "[]"],
        "correct_index": 1,
        "explanation": "`b = a` binds a second name to the same list object, so a mutation through `b` is visible through `a`.",
        "misconception": "Assignment copies the value.",
    },
    {
        "id": "q-py-variables-2",
        "concept_id": "py.variables",
        "difficulty": 2.0,
        "prompt": "Which statement is true after `a = [1]; b = a; a = [9]`?",
        "choices": [
            "`b` becomes [9] because the list was updated",
            "`b` is still [1] because `a` was rebound to a new object",
            "`b` raises an error",
            "`a` and `b` are the same object",
        ],
        "correct_index": 1,
        "explanation": "Rebinding `a` points the name at a different object; `b` still refers to the original list.",
        "misconception": "Rebinding a name mutates the object other names share.",
    },
    {
        "id": "q-py-functions-1",
        "concept_id": "py.functions",
        "difficulty": 2.5,
        "prompt": "Why does `def add(item, bucket=[])` share one list between calls?",
        "choices": [
            "Python caches lists for performance",
            "The default is evaluated once, at definition time",
            "Lists are global by default",
            "It does not share a list; each call gets a new one",
        ],
        "correct_index": 1,
        "explanation": "Default expressions are evaluated once when the function is defined, so the same object is reused.",
        "misconception": "Defaults are re-evaluated on every call.",
    },
    {
        "id": "q-py-functions-2",
        "concept_id": "py.functions",
        "difficulty": 2.6,
        "prompt": "What is the idiomatic fix for a mutable default argument?",
        "choices": [
            "Use a tuple instead",
            "Default to None and create the value inside the function",
            "Always pass the argument explicitly",
            "Use a class-level attribute",
        ],
        "correct_index": 1,
        "explanation": "`bucket=None` plus `if bucket is None: bucket = []` creates a fresh object per call.",
        "misconception": "The default has to be the real container type.",
    },
    {
        "id": "q-py-exceptions-1",
        "concept_id": "py.exceptions",
        "difficulty": 3.0,
        "prompt": "Why is a bare `except:` risky?",
        "choices": [
            "It is slower than catching a specific type",
            "It also catches things you did not intend, hiding bugs and interruptions",
            "It cannot catch ValueError",
            "It disables the finally block",
        ],
        "correct_index": 1,
        "explanation": "A bare except catches everything, including KeyboardInterrupt and genuine defects.",
        "misconception": "Catching more is always safer.",
    },
    {
        "id": "q-py-exceptions-2",
        "concept_id": "py.exceptions",
        "difficulty": 3.0,
        "prompt": "When does a `finally` block run?",
        "choices": [
            "Only when no exception was raised",
            "Only when an exception was raised",
            "Whether or not an exception occurred",
            "Only if the exception is re-raised",
        ],
        "correct_index": 2,
        "explanation": "`finally` always runs on the way out, which is why cleanup belongs there.",
        "misconception": "`finally` is an error-only path.",
    },
    {
        "id": "q-py-files-1",
        "concept_id": "py.files",
        "difficulty": 3.0,
        "prompt": "Why should the encoding be stated explicitly when opening a text file?",
        "choices": [
            "It makes reading faster",
            "The platform default varies, so a mismatch produces mojibake rather than a clear error",
            "It is required by Python",
            "It enables compression",
        ],
        "correct_index": 1,
        "explanation": "Encoding is platform-dependent; being explicit makes the read reproducible.",
        "misconception": "The default encoding is always UTF-8.",
    },
    {
        "id": "q-py-files-2",
        "concept_id": "py.files",
        "difficulty": 3.1,
        "prompt": "What does `with open(...) as handle:` guarantee?",
        "choices": [
            "The file is closed when the block exits, even if it raises",
            "The file is read into memory",
            "The file is locked for other processes",
            "Exceptions inside the block are suppressed",
        ],
        "correct_index": 0,
        "explanation": "The context manager releases the handle on exit, including on exception.",
        "misconception": "`with` suppresses errors.",
    },
    {
        "id": "q-chess-pieces-1",
        "concept_id": "chess.pieces",
        "difficulty": 1.5,
        "prompt": "A knight is pinned to its king. May it move?",
        "choices": [
            "Yes, knights can always jump away",
            "No, moving it would expose the king to check",
            "Only to capture a piece",
            "Only if it gives check",
        ],
        "correct_index": 1,
        "explanation": "A pinned piece cannot legally move if that exposes its own king.",
        "misconception": "Pins do not apply to knights.",
    },
    {
        "id": "q-chess-pieces-2",
        "concept_id": "chess.pieces",
        "difficulty": 1.6,
        "prompt": "How long is en passant available?",
        "choices": [
            "Any time a pawn is on the fifth rank",
            "Only on the move immediately after the opponent's double pawn push",
            "Whenever a pawn captures diagonally",
            "Only in the endgame",
        ],
        "correct_index": 1,
        "explanation": "The right expires immediately; it is not a standing option.",
        "misconception": "En passant is always available once the pawns are adjacent.",
    },
    {
        "id": "q-chess-tactics-1",
        "concept_id": "chess.tactics",
        "difficulty": 3.0,
        "prompt": "What defines a skewer?",
        "choices": [
            "A piece attacks two undefended pieces",
            "A valuable piece is forced to move, exposing a less valuable one behind it",
            "A piece is immobilised by an attack on what is behind it",
            "A pawn captures diagonally",
        ],
        "correct_index": 1,
        "explanation": "A skewer puts the valuable piece in front; it must move and unmasks the piece behind.",
        "misconception": "Skewer and pin are the same motif.",
    },
    {
        "id": "q-chess-tactics-2",
        "concept_id": "chess.tactics",
        "difficulty": 3.1,
        "prompt": "What is a fork?",
        "choices": [
            "One piece attacking two targets at once",
            "Two pieces attacking one target",
            "A sacrifice to open a file",
            "A pawn breaking a pawn chain",
        ],
        "correct_index": 0,
        "explanation": "One unit, two targets: the opponent can often only save one.",
        "misconception": "A fork needs two attackers.",
    },
    {
        "id": "q-chess-endgames-1",
        "concept_id": "chess.endgames",
        "difficulty": 3.5,
        "prompt": "In king and queen versus king, what is the main risk while mating?",
        "choices": [
            "Running out of time",
            "Stalemating the lone king",
            "Losing the queen to a fork",
            "The fifty-move rule",
        ],
        "correct_index": 1,
        "explanation": "With the king on the edge, careless queen moves can leave it with no legal move and no check — stalemate.",
        "misconception": "Any check on the edge is mate.",
    },
    {
        "id": "q-chess-endgames-2",
        "concept_id": "chess.endgames",
        "difficulty": 3.4,
        "prompt": "What does 'the opposition' describe?",
        "choices": [
            "Two kings facing each other with one square between them, the side to move at a disadvantage",
            "The side with more material",
            "A pawn race",
            "Castling on opposite sides",
        ],
        "correct_index": 0,
        "explanation": "Having the move in a direct king confrontation is often a disadvantage; the opponent gains ground.",
        "misconception": "The opposition is about material count.",
    },
    {
        "id": "q-sec-threat-model-1",
        "concept_id": "sec.threat-model",
        "difficulty": 2.5,
        "prompt": "What makes a threat model useful?",
        "choices": [
            "A long list of every possible attack",
            "Naming assets, adversaries and trust boundaries specifically",
            "Repeating the OWASP Top 10",
            "A penetration test report",
        ],
        "correct_index": 1,
        "explanation": "Specificity is what turns a model into checks you can implement and test.",
        "misconception": "A generic checklist is a threat model.",
    },
    {
        "id": "q-sec-threat-model-2",
        "concept_id": "sec.threat-model",
        "difficulty": 2.6,
        "prompt": "What is a trust boundary?",
        "choices": [
            "A firewall rule",
            "A place where data crosses from a less trusted zone to a more trusted one",
            "The edge of the database schema",
            "An authentication cookie",
        ],
        "correct_index": 1,
        "explanation": "Boundaries are where validation and authorisation decisions have to happen.",
        "misconception": "Trust boundaries are physical network edges only.",
    },
    {
        "id": "q-sec-input-validation-1",
        "concept_id": "sec.input-validation",
        "difficulty": 3.0,
        "prompt": "What is the durable fix for SQL injection?",
        "choices": [
            "Escaping quotes in user input",
            "Parameterised queries so data is never parsed as SQL",
            "Blocking the word SELECT",
            "Validating length only",
        ],
        "correct_index": 1,
        "explanation": "Parameterisation separates the statement from the data structurally.",
        "misconception": "Escaping input is equivalent to parameterising.",
    },
    {
        "id": "q-sec-input-validation-2",
        "concept_id": "sec.input-validation",
        "difficulty": 3.1,
        "prompt": "Which is an example of injection into a shell?",
        "choices": [
            "`subprocess.run(['ls', path])`",
            "`subprocess.run(f'ls {path}', shell=True)`",
            "`os.path.join(base, name)`",
            "`shutil.copy(src, dst)`",
        ],
        "correct_index": 1,
        "explanation": "Interpolating input into a shell string lets metacharacters become commands; an argument array does not.",
        "misconception": "Any use of subprocess is injection.",
    },
    {
        "id": "q-sec-hashing-1",
        "concept_id": "sec.hashing",
        "difficulty": 3.0,
        "prompt": "Why is SHA-256 a poor choice for storing passwords?",
        "choices": [
            "It is not one-way",
            "It is fast, so an attacker can try enormous numbers of candidates",
            "It produces collisions easily",
            "It cannot handle long passwords",
        ],
        "correct_index": 1,
        "explanation": "Speed is the problem: password storage needs a deliberately expensive KDF.",
        "misconception": "Any cryptographic hash is acceptable for passwords.",
    },
    {
        "id": "q-sec-hashing-2",
        "concept_id": "sec.hashing",
        "difficulty": 3.2,
        "prompt": "What is the purpose of a per-password salt?",
        "choices": [
            "To make the hash shorter",
            "So identical passwords do not produce identical digests, defeating precomputation",
            "To encrypt the password",
            "To allow password recovery",
        ],
        "correct_index": 1,
        "explanation": "A unique salt per password makes rainbow tables useless and hides shared passwords.",
        "misconception": "A salt is a secret that must not be stored.",
    },
]

#: Original compositions, validated with python-chess at seed time.
PUZZLES: list[dict] = [
    {
        "id": "pz-back-rank",
        "title": "Back-rank mate",
        "fen": "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
        "solution_uci": ["a1a8"],
        "theme": "back-rank",
        "difficulty": 1.5,
        "concept_id": "chess.tactics",
    },
    {
        "id": "pz-smothered",
        "title": "Smothered mate",
        "fen": "6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1",
        "solution_uci": ["g5f7"],
        "theme": "smothered",
        "difficulty": 2.5,
        "concept_id": "chess.tactics",
    },
    {
        "id": "pz-queen-mate",
        "title": "Queen supported by the king",
        "fen": "7k/8/6K1/8/8/8/8/7Q w - - 0 1",
        "solution_uci": ["h1h7"],
        "theme": "mate-in-one",
        "difficulty": 1.5,
        "concept_id": "chess.endgames",
    },
]


def seed() -> dict[str, int]:
    """Insert the catalogue. Safe to run repeatedly."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(SourceRow).filter(SourceRow.id == SOURCE_ID).first() is None:
            db.add(
                SourceRow(
                    id=SOURCE_ID,
                    title="Tessera curriculum (original)",
                    author="Tamuzi Learning",
                    url="https://github.com/MwaJr3/SynapseHub",
                    license_class="OPEN",
                    license_name="CC BY 4.0 (original work)",
                    commercial_use_ok=True,
                    attribution="Original material written for Tessera, Tamuzi Learning.",
                    retrieved_at=date.today().isoformat(),
                )
            )

        for concept in CONCEPTS:
            if db.get(Concept, concept["id"]) is None:
                db.add(
                    Concept(
                        id=concept["id"],
                        title=concept["title"],
                        subject=concept["subject"],
                        summary=concept["summary"],
                        explanation=concept["explanation"],
                        difficulty=concept["difficulty"],
                        ordering=concept["ordering"],
                    )
                )

        db.flush()

        for prerequisite, dependent in EDGES:
            exists = (
                db.query(ConceptEdge)
                .filter(
                    ConceptEdge.from_concept_id == prerequisite,
                    ConceptEdge.to_concept_id == dependent,
                    ConceptEdge.relation == "prerequisite",
                )
                .first()
            )
            if exists is None:
                db.add(
                    ConceptEdge(
                        from_concept_id=prerequisite,
                        to_concept_id=dependent,
                        relation="prerequisite",
                    )
                )

        for lesson in LESSONS:
            if db.get(Lesson, lesson["id"]) is None:
                db.add(Lesson(source_id=SOURCE_ID, **lesson))

        for question in QUESTIONS:
            if db.get(Question, question["id"]) is None:
                db.add(Question(source_id=SOURCE_ID, **question))

        for puzzle in PUZZLES:
            # A malformed puzzle must fail here, not in front of a learner.
            validate_puzzle(puzzle["fen"], puzzle["solution_uci"])
            if db.get(ChessPuzzle, puzzle["id"]) is None:
                db.add(ChessPuzzle(source_id=SOURCE_ID, **puzzle))

        # Opening names, ECO codes and move sequences are reference data; the
        # study notes are original. Every line is validated against real rules.
        for opening in build_openings():
            if db.get(OpeningRow, opening.id) is None:
                db.add(
                    OpeningRow(
                        id=opening.id,
                        eco=opening.eco,
                        name=opening.name,
                        family=opening.family,
                        moves_san=opening.moves_san,
                        moves_uci=opening.moves_uci,
                        idea=opening.idea,
                        concept_id="chess.tactics",
                    )
                )

        db.commit()

        # Catalogue of openly-licensed external material - metadata and links
        # only, each gated by its licence. No third-party text is stored.
        catalogue = seed_catalogue(db)

        return {
            "concepts": db.query(Concept).count(),
            "edges": db.query(ConceptEdge).count(),
            "lessons": db.query(Lesson).count(),
            "questions": db.query(Question).count(),
            "puzzles": db.query(ChessPuzzle).count(),
            "openings": db.query(OpeningRow).count(),
            "sources": db.query(SourceRow).count(),
            "catalogue_imported": catalogue.imported,
            "catalogue_rejected": len(catalogue.rejected),
        }
    finally:
        db.close()


if __name__ == "__main__":
    print(seed())
