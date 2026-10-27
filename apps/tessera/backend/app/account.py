"""Export and delete: the exit door, built as carefully as the entrance.

A learning product asks for a lot of honest information — what you can and cannot
do, what you got wrong, how long you sat there. That only stays fair if leaving is
real: you can take a copy of everything, and you can have it erased.

Three rules shape this module.

**Completeness is derived, not listed.** The set of tables holding learner rows is
read from the schema: every table with a foreign key to ``users.id``, plus every
table that reaches a learner through a parent that always names one (an
``assessment_score`` names an assessment; nothing on it names a learner). A
hand-written list would be correct on the day it was written and silently wrong the
first time a stage added a table. There are tests that fail if a learner-owned
table does not cascade from ``users``, if a table belongs to none of the three
groups, or if any of them still holds a row after deletion.

**Withholding a credential is not withholding data.** A session token in a
downloaded file is a working key to the account; a password hash is a target. Those
columns are left out, the row count is still reported, and the export says which
columns were withheld and why. Everything a learner would recognise as their own
record is included.

**Deletion is a hard delete, not a flag.** A tombstone with an email address is
still personal data, and "deleted" that leaves rows behind is a claim the database
can disprove. The catalogue (concepts, lessons, questions, sources, quests,
seasons) is shared material and is not learner data, so it survives — and the
export says so as well, because "here is everything" has to be true in both
directions.
"""

from __future__ import annotations

import json
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.sql.schema import Column, Table

from .database import Base
from .models import SessionToken, User

#: Bumped when the shape of the bundle changes in a way a consumer would notice.
#: The version travels inside the file, so an old export can still be read.
EXPORT_FORMAT = "tessera.account-export"
EXPORT_VERSION = 1

#: Tables withheld whole, with the reason printed in the export.
WITHHELD_TABLES: dict[str, str] = {
    "session_tokens": (
        "a live session token is a working key to this account; exporting it would make "
        "the downloaded file a login"
    ),
}

#: Columns withheld from an otherwise-included table. Same reason, narrower target.
WITHHELD_COLUMNS: dict[str, dict[str, str]] = {
    "users": {
        "password_hash": "a password hash is a credential, not a record about you",
    },
    "access_tokens": {
        "token_hash": "the stored digest of a bearer token is a secret, not data about you",
    },
    "authorization_codes": {
        "code_hash": "an authorization code is spent within five minutes; its digest is a secret",
    },
}

#: Printed in the export and on the deletion screen. Shared curriculum is not the
#: learner's data: exporting it would bury their own record in 20 questions, 10
#: opening lines and 7 quest definitions they did not write.
#
#: `concepts` is deliberately *not* here: the table is mixed. A learner's own
#: concepts are theirs and are exported and deleted; the seeded ones carry no owner
#: and stay. The sentence below says both halves.
SHARED_CATALOGUE = (
    "lessons",
    "questions",
    "sources",
    "openings",
    "chess_puzzles",
    "quests",
    "seasons",
    "oauth_clients",
)

SHARED_CATALOGUE_NOTE = (
    "textbook and reference material every learner sees, including the concepts the "
    "curriculum shipped with (the ones with no owner). Only the concepts you wrote are "
    "yours, and they are in `concepts` above."
)


def _owner_column(table: Table) -> Column | None:
    """The column that names the learner, or None for a shared table."""
    for foreign_key in table.foreign_keys:
        if foreign_key.column.table.name == "users":
            return foreign_key.parent
    return None


def learner_tables() -> list[Table]:
    """Every table that can hold a row belonging to exactly one learner.

    Derived from the schema rather than enumerated, so a table added in a later
    stage is exported and deleted without anyone remembering to add it here.
    """
    tables: list[Table] = []
    for table in Base.metadata.sorted_tables:
        if table.name == "users":
            continue
        if _owner_column(table) is not None:
            tables.append(table)
    return tables


def indirect_tables() -> list[tuple[Table, Table, Column]]:
    """Tables that belong to a learner only through a parent row.

    `assessment_scores` has no `user_id`: it names an assessment, which names a
    learner. A scan for foreign keys to `users.id` cannot see it, so without this
    the export would omit every score and the delete would verify a set of tables
    that does not include them — reporting success while a row survived. Derived
    from the schema for the same reason as `learner_tables`: a hand-kept list is
    wrong the first time a stage adds a table.
    """
    # Only through a parent whose every row names a learner. `concepts` is a mixed
    # table (a learner's own concepts beside the seeded ones), and it is the parent
    # of the shared curriculum: following it would pull lessons and questions into
    # an export that is supposed to be about one person.
    owned = {
        table.name
        for table in learner_tables()
        if (owner := _owner_column(table)) is not None and not owner.nullable
    }
    pairs: list[tuple[Table, Table, Column]] = []
    for table in Base.metadata.sorted_tables:
        if table.name == "users" or _owner_column(table) is not None:
            continue
        for foreign_key in table.foreign_keys:
            if foreign_key.column.table.name in owned:
                pairs.append((table, foreign_key.column.table, foreign_key.parent))
    return pairs


def _jsonable(value: Any) -> Any:
    """Values as JSON, with the types the database actually returns.

    Datetimes go to ISO-8601 with an offset. SQLite hands back naive datetimes that
    were written as UTC; stamping them naive would make a timestamp ambiguous in a
    file a person keeps, so the offset is added rather than left implicit.
    """
    if value is None or isinstance(value, (bool, int, str)):
        return value
    if isinstance(value, float):
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    if isinstance(value, (date, time)):
        return value.isoformat()
    if isinstance(value, (list, tuple)):
        return [_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, bytes):
        # No column stores bytes today. If one arrives, an explicit marker is
        # better than a JSON encoder crashing halfway through the file.
        return value.hex()
    return str(value)


def _rows_for(db: Session, table: Table, user: User) -> list[dict[str, Any]]:
    owner = _owner_column(table)
    assert owner is not None  # guarded by learner_tables()
    withheld = WITHHELD_COLUMNS.get(table.name, {})
    columns = [column for column in table.columns if column.name not in withheld]
    statement = (
        select(*columns)
        .where(owner == user.id)
        .order_by(*[column for column in table.primary_key.columns])
    )
    return [
        {column.name: _jsonable(getattr(row, column.name)) for column in columns}
        for row in db.execute(statement)
    ]


def account_row(user: User) -> dict[str, Any]:
    """The account itself, minus the credential.

    Included as a row so the manifest accounts for it: a person reading the file
    should see their own record in `data`, not only in a header block.
    """
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "created_at": _jsonable(user.created_at),
    }


def export_bundle(db: Session, user: User) -> dict[str, Any]:
    """Everything this learner owns, in one file, with a manifest that proves it.

    The manifest is not decoration: it is how a person can see that a table is
    empty rather than missing, and how a test can compare the export with the
    deletion preview without maintaining a second list of tables.
    """
    generated_at = datetime.now(timezone.utc)
    data: dict[str, list[dict[str, Any]]] = {}
    manifest: dict[str, int] = {}

    data["users"] = [account_row(user)]
    manifest["users"] = 1

    for table in learner_tables():
        if table.name in WITHHELD_TABLES:
            continue
        rows = _rows_for(db, table, user)
        data[table.name] = rows
        manifest[table.name] = len(rows)

    # Rows that name one of the learner's rows rather than the learner directly.
    for table, parent, column in indirect_tables():
        if table.name in WITHHELD_TABLES:
            continue
        rows = _indirect_rows(db, table, parent, column, user)
        data.setdefault(table.name, []).extend(rows)
        manifest[table.name] = len(data[table.name])

    excluded: list[dict[str, Any]] = [
        {"table": name, "columns": [], "reason": reason} for name, reason in WITHHELD_TABLES.items()
    ]
    for table, columns in WITHHELD_COLUMNS.items():
        excluded.append(
            {
                "table": table,
                "columns": sorted(columns),
                "reason": "; ".join(sorted(set(columns.values()))),
            }
        )

    return {
        "format": EXPORT_FORMAT,
        "version": EXPORT_VERSION,
        "generated_at": generated_at.isoformat(),
        "generated_by": "Tessera",
        "account": {
            "email": user.email,
            "display_name": user.display_name,
            "created_at": _jsonable(user.created_at),
        },
        "units": {
            "concepts": "your own concepts only; the shared catalogue is not included",
            "manifest": "row count per table, so an empty table is visibly empty",
            "scores": "stored exactly as reported; an absent score is absent, never zero",
        },
        "manifest": manifest,
        "rows": sum(manifest.values()),
        "data": data,
        "excluded": excluded,
        "not_yours": {
            "tables": list(SHARED_CATALOGUE),
            "reason": SHARED_CATALOGUE_NOTE,
        },
    }


def filename(generated_at: datetime | None = None) -> str:
    stamp = (generated_at or datetime.now(timezone.utc)).date().isoformat()
    return f"tessera-export-{stamp}.json"


def _parent_ids(db: Session, parent: Table, user: User):
    """The ids of one learner's rows in a parent table, as a subquery."""
    owner = _owner_column(parent)
    assert owner is not None, parent.name
    return select(parent.c.id).where(owner == user.id)


def _indirect_rows(db: Session, table: Table, parent: Table, column: Column, user: User) -> list[dict[str, Any]]:
    statement = select(table).where(column.in_(_parent_ids(db, parent, user)))
    columns = list(table.columns)
    return [
        {name: _jsonable(row._mapping[name]) for name in (c.name for c in columns)}
        for row in db.execute(statement)
    ]


def _counts(db: Session, user: User) -> dict[str, int]:
    # The account row is one row that deletion removes, so the preview and the
    # export manifest can be compared without a mental adjustment.
    counts: dict[str, int] = {"users": 1}
    for table in learner_tables():
        owner = _owner_column(table)
        assert owner is not None
        total = db.execute(select(func.count()).select_from(table).where(owner == user.id)).scalar_one()
        if total:
            counts[table.name] = int(total)
    for table, parent, column in indirect_tables():
        total = db.execute(
            select(func.count()).select_from(table).where(column.in_(_parent_ids(db, parent, user)))
        ).scalar_one()
        if total:
            counts[table.name] = counts.get(table.name, 0) + int(total)
    return counts


def deletion_preview(db: Session, user: User) -> dict[str, Any]:
    """What pressing delete would remove, counted before the button exists."""
    counts = _counts(db, user)
    return {
        "email": user.email,
        "tables": counts,
        "rows": sum(counts.values()),
        "kept": {
            "tables": list(SHARED_CATALOGUE),
            "reason": SHARED_CATALOGUE_NOTE,
        },
        "statement": (
            "Deleting your account removes these rows and the account itself. It cannot be "
            "undone, and a copy cannot be restored afterwards — download an export first if "
            "you might want one."
        ),
    }


def delete_account(db: Session, user: User) -> dict[str, Any]:
    """Remove every row that names this learner, then the learner.

    The cascade is declared in the schema, so the database is what guarantees the
    children are gone; this function deletes the parent and verifies the result.
    Verification is the point: a delete that reports success while a table still
    holds a row is the failure mode this whole module exists to avoid.
    """
    user_id = user.id
    counts = _counts(db, user)

    # Sessions are removed explicitly as well as by cascade. The request that
    # deletes the account is carrying one, and a session row that outlived its user
    # would be an authentication path to a person who no longer exists.
    db.query(SessionToken).filter(SessionToken.user_id == user_id).delete(synchronize_session=False)

    try:
        db.delete(user)
        db.commit()
    except IntegrityError as error:  # pragma: no cover - schema guard fails loudly
        db.rollback()
        raise RuntimeError(
            "deletion was refused by the database and nothing was removed; a table that "
            f"names a learner does not cascade ({error.orig})"
        ) from error

    leftovers = {
        table.name: db.execute(
            select(func.count()).select_from(table).where(_owner_column(table) == user_id)
        ).scalar_one()
        for table in learner_tables()
    }
    # Rows reached through a parent are verified too: the cascade removes them,
    # and a report of "zero rows left" that never looked at them is not a check.
    for table, parent, column in indirect_tables():
        total = db.execute(
            select(func.count()).select_from(table).where(column.in_(_parent_ids(db, parent, user)))
        ).scalar_one()
        if total:
            leftovers[table.name] = total

    remaining = {name: int(total) for name, total in leftovers.items() if total}
    if remaining:
        raise RuntimeError(f"deletion left rows behind: {sorted(remaining)}")
    if db.get(User, user_id) is not None:  # pragma: no cover - defensive
        raise RuntimeError("the account row survived its own deletion")

    return counts


def bundle_json(bundle: dict[str, Any]) -> str:
    """Stable, readable JSON: sorted keys so two exports of the same data match."""
    return json.dumps(bundle, indent=2, sort_keys=True, ensure_ascii=False) + "\n"
