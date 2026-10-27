"""Catalogue of openly-licensed external material — metadata and links only.

Why this module stores no lesson text
-------------------------------------
The brief asked for content from MIT OpenCourseWare and OpenStax. Both are
genuinely open, and both are **not** free to copy into a commercial product
without care:

* MIT OpenCourseWare material is published under Creative Commons licences that
  vary by course and include NonCommercial and ShareAlike terms; some courses
  contain third-party material that OCW itself cannot relicense.
* OpenStax textbooks are CC BY for most titles, but several are CC BY-NC-SA.

Both sites also serve their catalogues through interfaces whose terms address
automated retrieval. So this module does the two things that are unambiguously
defensible:

1. **Catalogue and link.** A record holds the title, publisher, subject, URL and
   licence name. Nothing is reproduced.
2. **Gate every record through the licence gate** (`app/content.py`), so a
   NonCommercial licence resolves to `reference_only` in a commercial
   deployment and the learner is sent to the original.

Bulk ingest is deliberately left to the operator: `import_catalogue` reads a
JSON file the operator supplies (typically produced under an institutional
licence or with written permission). Nothing here scrapes a website.
"""

from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass

from sqlalchemy.orm import Session

from .content import LicenseClass
from .models import SourceRow

#: Verified catalogue entries: real titles, real publishers, real licence names.
#: Every URL is the publisher's own page; no text is copied.
SEED: list[dict] = [
    {
        "id": "src-ocw-6-0001",
        "title": "MIT OpenCourseWare — Introduction to Computer Science and Programming in Python",
        "author": "MIT OpenCourseWare",
        "url": "https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/",
        "license_class": "OPEN",
        "license_name": "CC BY-NC-SA 4.0",
        "commercial_use_ok": False,
        "attribution": "Course materials from MIT OpenCourseWare. Referenced by link; not reproduced.",
        "holds_copy": False,
    },
    {
        "id": "src-ocw-6-006",
        "title": "MIT OpenCourseWare — Introduction to Algorithms",
        "author": "MIT OpenCourseWare",
        "url": "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/",
        "license_class": "OPEN",
        "license_name": "CC BY-NC-SA 4.0",
        "commercial_use_ok": False,
        "attribution": "Course materials from MIT OpenCourseWare. Referenced by link; not reproduced.",
        "holds_copy": False,
    },
    {
        "id": "src-ocw-18-06",
        "title": "MIT OpenCourseWare — Linear Algebra",
        "author": "MIT OpenCourseWare",
        "url": "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/",
        "license_class": "OPEN",
        "license_name": "CC BY-NC-SA 4.0",
        "commercial_use_ok": False,
        "attribution": "Course materials from MIT OpenCourseWare. Referenced by link; not reproduced.",
        "holds_copy": False,
    },
    {
        "id": "src-openstax-biology-2e",
        "title": "OpenStax — Biology 2e",
        "author": "OpenStax, Rice University",
        "url": "https://openstax.org/details/books/biology-2e",
        "license_class": "OPEN",
        "license_name": "CC BY 4.0",
        "commercial_use_ok": True,
        "attribution": "OpenStax Biology 2e, Rice University. CC BY 4.0. Referenced by link; no text reproduced.",
        "holds_copy": False,
    },
    {
        "id": "src-openstax-psychology-2e",
        "title": "OpenStax — Psychology 2e",
        "author": "OpenStax, Rice University",
        "url": "https://openstax.org/details/books/psychology-2e",
        "license_class": "OPEN",
        "license_name": "CC BY 4.0",
        "commercial_use_ok": True,
        "attribution": "OpenStax Psychology 2e, Rice University. CC BY 4.0. Referenced by link; no text reproduced.",
        "holds_copy": False,
    },
    {
        "id": "src-openstax-college-algebra",
        "title": "OpenStax — College Algebra 2e",
        "author": "OpenStax, Rice University",
        "url": "https://openstax.org/details/books/college-algebra-2e",
        "license_class": "OPEN",
        "license_name": "CC BY 4.0",
        "commercial_use_ok": True,
        "attribution": "OpenStax College Algebra 2e, Rice University. CC BY 4.0. Referenced by link; no text reproduced.",
        "holds_copy": False,
    },
    {
        "id": "src-lichess-openings",
        "title": "Lichess — opening explorer (reference)",
        "author": "lichess.org",
        "url": "https://lichess.org/opening",
        "license_class": "LINK_ONLY",
        "license_name": "Site service; opening names and ECO codes are reference data",
        "commercial_use_ok": False,
        "attribution": "Opening reference linked to lichess.org. No explorer data is copied or scraped.",
    },
    {
        "id": "src-lichess-puzzles",
        "title": "Lichess open puzzle database",
        "author": "Lichess (published by the lichess.org project)",
        "url": "https://database.lichess.org/",
        "license_class": "OPEN",
        "license_name": "CC0 1.0 (public domain dedication)",
        "commercial_use_ok": True,
        "attribution": "Puzzles from the Lichess open database, released under CC0.",
    },
]

ALLOWED_CLASSES = {c.value for c in LicenseClass}


@dataclass(frozen=True)
class ImportReport:
    imported: int
    skipped_existing: int
    rejected: list[str]


def validate_entry(entry: dict) -> str | None:
    """Return an error message when an entry must be rejected, else None."""
    required = {"id", "title", "author", "url", "license_class", "license_name", "attribution"}
    missing = required - set(entry)
    if missing:
        return f"missing fields: {sorted(missing)}"
    if not str(entry["url"]).startswith(("http://", "https://")):
        return "url must be http(s)"
    if entry["license_class"] not in ALLOWED_CLASSES:
        return f"unknown licence class {entry['license_class']!r}"
    # An entry that claims a licence but no name is a record we cannot defend.
    if entry["license_class"] != "UNKNOWN" and not str(entry["license_name"]).strip():
        return "a licensed entry must name the licence"
    return None


def _upsert(db: Session, entry: dict) -> bool:
    """Insert when absent. Returns True when a row was added."""
    if db.get(SourceRow, entry["id"]) is not None:
        return False
    db.add(
        SourceRow(
            id=entry["id"],
            title=entry["title"],
            author=entry["author"],
            url=entry["url"],
            license_class=entry["license_class"],
            license_name=entry["license_name"],
            commercial_use_ok=bool(entry.get("commercial_use_ok", False)),
            attribution=entry["attribution"],
            retrieved_at=str(entry.get("retrieved_at", "")),
            holds_copy=bool(entry.get("holds_copy", True)),
        )
    )
    return True


def seed_catalogue(db: Session) -> ImportReport:
    imported = 0
    skipped = 0
    rejected: list[str] = []
    for entry in SEED:
        problem = validate_entry(entry)
        if problem:
            rejected.append(f"{entry.get('id', '?')}: {problem}")
            continue
        if _upsert(db, entry):
            imported += 1
        else:
            skipped += 1
    db.commit()
    return ImportReport(imported=imported, skipped_existing=skipped, rejected=rejected)


def import_catalogue(db: Session, path: pathlib.Path) -> ImportReport:
    """Import operator-supplied catalogue entries from JSON.

    This is the supported route to bulk material: the operator obtains the right
    to use it, records the licence, and imports a file. The application never
    fetches content from a third-party site on its own.
    """
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError("catalogue file must contain a JSON array")

    imported = 0
    skipped = 0
    rejected: list[str] = []
    for entry in payload:
        if not isinstance(entry, dict):
            rejected.append("non-object entry")
            continue
        problem = validate_entry(entry)
        if problem:
            rejected.append(f"{entry.get('id', '?')}: {problem}")
            continue
        if _upsert(db, entry):
            imported += 1
        else:
            skipped += 1
    db.commit()
    return ImportReport(imported=imported, skipped_existing=skipped, rejected=rejected)
