"""Interactive quiz runner."""
from __future__ import annotations

import argparse
import sys

from app.bank import load_bank, select_questions
from app.engine import QuizError, QuizSession
from app.models import QuestionError


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="quizbox", description="Take a categorized quiz.")
    parser.add_argument("--bank", default=None, help="Path to a question bank JSON file.")
    parser.add_argument("--seed", type=int, default=None, help="Seed for reproducible question selection.")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("start")
    p = sub.add_parser("review"); p.add_argument("attempts_json", help="JSON list of attempt records")
    p = sub.add_parser("calibrate"); p.add_argument("confidences", help="e.g. 5,4,2")
    p.add_argument("results", help="e.g. 1,1,0 (1=correct)")
    p = sub.add_parser("import-bank"); p.add_argument("path")
    p = sub.add_parser("export-bank"); p.add_argument("cards_json", help="JSON list of cards")
    p.add_argument("--category")
    p.add_argument("--difficulty", choices=["easy", "medium", "hard"])
    p.add_argument("--count", type=int, default=5)
    args = parser.parse_args(argv)
    try:
        bank = load_bank(args.bank)
        import random
        rng = random.Random(args.seed) if args.seed is not None else None
        questions = select_questions(bank, args.count, args.category, args.difficulty, rng)
        session = QuizSession(questions)
        while not session.finished:
            q = session.current
            print(f"\n[{q.category} / {q.difficulty}] {q.prompt}")
            for i, option in enumerate(q.options):
                print(f"  {i}) {option}")
            try:
                choice = int(input("answer> ").strip())
                record = session.answer(choice)
            except (ValueError, QuizError) as exc:
                print(f"Invalid: {exc}")
                continue
            verdict = "Correct." if record.correct else f"Incorrect. The answer was {q.correct_index}."
            print(f"{verdict} {q.explanation}")
        s = session.summary()
        print(f"\nResult: {s['score']}/{s['total']} ({s['percent']}%)")
        for cat, row in sorted(s["by_category"].items()):
            print(f"  {cat}: {row['correct']}/{row['total']}")
        return 0
    except (QuestionError, QuizError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
