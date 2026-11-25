"""Game import: Lichess public API (bounded, explicit, no token) and multi-game PGN paste."""
from __future__ import annotations

import io
import re

import chess.pgn
import httpx

LICHESS_URL = "https://lichess.org/api/games/user/{user}"
USERNAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{1,29}$")
MAX_GAMES = 20
TIMEOUT_S = 10.0
MAX_BYTES = 2_000_000
MAX_PASTE_CHARS = 400_000


class ImportError_(ValueError):
    pass


def fetch_lichess_pgn(username: str, max_games: int) -> str:
    """One bounded, unauthenticated request. The username is validated before it touches a URL."""
    if not USERNAME_RE.match(username or ""):
        raise ImportError_("Enter a valid Lichess username (letters, digits, - and _).")
    n = max(1, min(int(max_games), MAX_GAMES))
    try:
        with httpx.Client(timeout=TIMEOUT_S, follow_redirects=False) as client:
            with client.stream("GET", LICHESS_URL.format(user=username),
                               params={"max": n, "opening": "true", "clocks": "false", "evals": "false"},
                               headers={"Accept": "application/x-chess-pgn", "User-Agent": "ChessScope-import"}) as r:
                if r.status_code == 404:
                    raise ImportError_("Lichess user not found.")
                if r.status_code == 429:
                    raise ImportError_("Lichess is rate-limiting requests; try again in a minute.")
                if r.status_code != 200:
                    raise ImportError_(f"Lichess returned status {r.status_code}.")
                buf = bytearray()
                for chunk in r.iter_bytes():
                    buf += chunk
                    if len(buf) > MAX_BYTES:
                        raise ImportError_("Lichess response too large; request fewer games.")
    except httpx.TimeoutException as exc:
        raise ImportError_("Lichess did not answer in time.") from exc
    except httpx.HTTPError as exc:
        raise ImportError_("Could not reach Lichess.") from exc
    return buf.decode("utf-8", errors="replace")


def split_games(text: str, limit: int = MAX_GAMES) -> list[tuple[str, dict]]:
    """Parse a multi-game PGN; skip unparseable/empty games; return (pgn_text, headers)."""
    if len(text) > MAX_PASTE_CHARS:
        raise ImportError_("PGN is too large.")
    out = []
    stream = io.StringIO(text)
    while len(out) < limit:
        game = chess.pgn.read_game(stream)
        if game is None:
            break
        if game.errors or not list(game.mainline_moves()):
            continue
        exporter = chess.pgn.StringExporter(headers=True, variations=False, comments=False)
        out.append((game.accept(exporter), dict(game.headers)))
    return out
