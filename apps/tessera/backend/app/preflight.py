"""The checks to run before pointing a deployment at real learners.

`python3 -m app.preflight` answers one question — *is this instance safe to serve?*
— with evidence instead of optimism. Every check either passes, produces a warning
that is honest about what is missing, or fails with the command that fixes it.

It is deliberately a separate program from the app: the app must still start when a
check fails (turning a configuration mistake into an outage helps nobody), but a
deployment that cannot pass this should not be announced.

Exit codes: 0 when nothing failed, 1 when at least one check failed.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

from sqlalchemy import inspect, text

from . import config
from .database import SessionLocal, engine
from .models import Concept, Quest, SourceRow

BACKEND_ROOT = Path(__file__).resolve().parents[1]


@dataclass
class Check:
    name: str
    status: str  # "ok" | "warn" | "fail"
    detail: str
    fix: str = ""


def safe_dsn(url: str) -> str:
    """The database location without the credential.

    Everything after the last `@` is host and database; everything before it can
    contain a password, and a preflight line is exactly the sort of output that ends
    up in a CI log.
    """
    if "@" not in url:
        return url
    return url.rsplit("@", 1)[-1]


def _revision() -> tuple[str | None, str | None, str | None]:
    """(applied revision, head revision, problem) — tolerating a missing table."""
    head: str | None = None
    try:
        from alembic.config import Config
        from alembic.script import ScriptDirectory

        script = ScriptDirectory.from_config(Config(str(BACKEND_ROOT / "alembic.ini")))
        head = script.get_current_head()
    except Exception as error:  # pragma: no cover - only when alembic is broken
        return None, None, f"could not read the migration history ({error})"

    if "alembic_version" not in inspect(engine).get_table_names():
        return None, head, "the database was created without migrations"
    with engine.connect() as connection:
        row = connection.execute(text("SELECT version_num FROM alembic_version")).first()
        return (row[0] if row else None), head, None


def run_checks() -> list[Check]:
    checks: list[Check] = []

    # 1 — the database answers at all.
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        checks.append(Check("database", "ok", f"reachable at {safe_dsn(config.DATABASE_URL)}"))
    except Exception as error:
        checks.append(
            Check(
                "database",
                "fail",
                f"cannot connect ({error})",
                "check DATABASE_URL and that the server is running",
            )
        )
        # Everything below needs the database; stop rather than print six cascades.
        return checks

    # 2 — the schema is the migration history, not whatever create_all produced.
    applied, head, problem = _revision()
    if problem and "without migrations" in problem:
        status = "fail" if config.PRODUCTION else "warn"
        checks.append(
            Check(
                "schema revision",
                status,
                "no alembic_version table: this database was built by create_all, "
                "which is a local convenience",
                "run `python3 -m alembic upgrade head` against this database",
            )
        )
    elif problem:
        checks.append(Check("schema revision", "fail", problem, "run `python3 -m alembic upgrade head`"))
    elif applied != head:
        checks.append(
            Check(
                "schema revision",
                "fail",
                f"database is at {applied or 'nothing'}, the history head is {head}",
                "run `python3 -m alembic upgrade head`",
            )
        )
    else:
        checks.append(Check("schema revision", "ok", f"at head ({head})"))

    # 3 — the curriculum the app claims to ship with.
    with SessionLocal() as db:
        for label, model, expected_minimum, hint in (
            ("curriculum", Concept, 10, "run `python3 -m app.seed`"),
            # Quests are registered when the API starts, not by the seeder, so a
            # fresh database legitimately has none until the first boot.
            ("quests", Quest, 7, "start the API once (it registers the quest catalogue)"),
            ("sources", SourceRow, 1, "run `python3 -m app.seed`"),
        ):
            try:
                total = db.query(model).count()
            except Exception as error:  # pragma: no cover - missing table
                # The raw driver message is a paragraph of SQL; the useful half is
                # the first line, and the fix is the same for every missing table.
                first_line = str(error).splitlines()[0]
                checks.append(Check(label, "fail", f"table unreadable: {first_line}", "upgrade the schema"))
                continue
            if total >= expected_minimum:
                checks.append(Check(label, "ok", f"{total} rows"))
            else:
                checks.append(
                    Check(label, "warn", f"{total} rows; expected at least {expected_minimum}", hint)
                )

    # 4 — configuration that only matters when real people are using it.
    problems = config.production_problems()
    if config.PRODUCTION:
        if problems:
            for problem in problems:
                checks.append(Check("production config", "fail", problem, "fix the variable named above"))
        else:
            checks.append(Check("production config", "ok", "no problems found"))
    else:
        checks.append(
            Check(
                "production config",
                "warn",
                "TESSERA_PRODUCTION is not set: this instance is a local/demo deployment",
                "set TESSERA_PRODUCTION=1 before serving real learners",
            )
        )

    # 5 — the frontend, when this process is supposed to serve it.
    if config.FRONTEND_DIR:
        index = Path(config.FRONTEND_DIR) / "index.html"
        if index.is_file():
            checks.append(Check("frontend build", "ok", f"{index.parent}"))
        else:
            checks.append(
                Check(
                    "frontend build",
                    "fail",
                    f"TESSERA_FRONTEND_DIR is set but {index} does not exist",
                    "run `npm run build` in apps/tessera/frontend, or unset TESSERA_FRONTEND_DIR",
                )
            )
    else:
        checks.append(
            Check(
                "frontend build",
                "warn",
                "TESSERA_FRONTEND_DIR is unset: this process serves the API only",
                "a deployment that serves both sets it to the built frontend directory",
            )
        )

    # 6 — somewhere to write the SQLite file, when SQLite is in use.
    if config.DATABASE_URL.startswith("sqlite"):
        try:
            config.DATA_DIR.mkdir(parents=True, exist_ok=True)
            probe = config.DATA_DIR / ".preflight"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink()
            checks.append(Check("data directory", "ok", f"{config.DATA_DIR} is writable"))
        except Exception as error:
            checks.append(
                Check("data directory", "fail", f"not writable ({error})", "set TESSERA_DATA_DIR")
            )

    return checks


def render(checks: list[Check]) -> str:
    width = max(len(check.name) for check in checks)
    lines = []
    for check in checks:
        mark = {"ok": "ok  ", "warn": "warn", "fail": "FAIL"}[check.status]
        lines.append(f"{mark}  {check.name.ljust(width)}  {check.detail}")
        if check.status != "ok" and check.fix:
            lines.append(f"      {' ' * width}  → {check.fix}")
    failed = sum(1 for check in checks if check.status == "fail")
    warned = sum(1 for check in checks if check.status == "warn")
    lines.append("")
    lines.append(
        f"{len(checks)} checks: {len(checks) - failed - warned} ok, {warned} warning(s), {failed} failure(s)"
    )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Check whether this Tessera instance is safe to serve.")
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    arguments = parser.parse_args(argv)

    checks = run_checks()
    if arguments.json:
        print(json.dumps([asdict(check) for check in checks], indent=2))
    else:
        print(render(checks))
    return 1 if any(check.status == "fail" for check in checks) else 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
