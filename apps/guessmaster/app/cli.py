"""Interactive CLI: play and view high scores."""
from __future__ import annotations

import argparse
import sys

from .config import DIFFICULTIES
from .game import GameError, GuessGame
from .scores import record, top


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="guessmaster", description="Guess the number.")
    parser.add_argument("--scores", default="scores.json")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("play")
    p.add_argument("--difficulty", choices=sorted(DIFFICULTIES), default="medium")
    p.add_argument("--player", default="anonymous")
    p = sub.add_parser("daily"); p.add_argument("--date", default="today"); p.add_argument("--user", default="player")
    p = sub.add_parser("streak"); p.add_argument("days", nargs="*", help="ISO dates played")
    p = sub.add_parser("scores")
    p.add_argument("--difficulty", choices=sorted(DIFFICULTIES))
    args = parser.parse_args(argv)

    if args.command == "scores":
        for row in top(args.scores, args.difficulty):
            print(f"{row['player']:12} {row['difficulty']:7} {row['attempts']} attempts")
        return 0

    game = GuessGame(DIFFICULTIES[args.difficulty])
    print(f"I am thinking of a number between {game.difficulty.low} and {game.difficulty.high}. "
          f"You have {game.difficulty.max_attempts} attempts.")
    while game.state == "in_progress":
        try:
            raw = input("guess> ").strip()
            verdict = game.guess(int(raw))
        except ValueError:
            print("Please enter a whole number.")
            continue
        except GameError as exc:
            print(f"Invalid guess: {exc}")
            continue
        if verdict == "correct":
            print(f"Correct! The number was {game.target}. Solved in {game.attempts} attempt(s).")
        elif verdict == "high":
            print(f"Lower. {game.attempts_left} attempt(s) left.")
        else:
            print(f"Higher. {game.attempts_left} attempt(s) left.")
    if game.state == "lost":
        print(f"Out of attempts. The number was {game.target}.")
    record(args.scores, args.player, game.difficulty.name, game.attempts, game.state == "won")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
