"""Safe moving with dry-run default, deterministic conflict handling, reports."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from .classify import classify


class OrganizeError(ValueError):
    pass


@dataclass
class MoveRecord:
    source: str
    destination: str
    category: str
    signal: str
    mismatch: bool
    status: str          # moved | would-move | skipped | failed
    detail: str = ""


@dataclass
class Report:
    records: list[MoveRecord] = field(default_factory=list)

    @property
    def moved(self) -> int:
        return sum(1 for r in self.records if r.status in ("moved", "would-move"))

    def to_json(self) -> str:
        return json.dumps({"records": [r.__dict__ for r in self.records],
                           "moved_count": self.moved}, indent=2)


def _destination_for(root: Path, category: str, name: str) -> Path:
    """Deterministic conflict resolution: name (1).ext, name (2).ext, ..."""
    dest_dir = root / category
    candidate = dest_dir / name
    stem, suffix = candidate.stem, candidate.suffix
    counter = 0
    while candidate.exists():
        counter += 1
        candidate = dest_dir / f"{stem} ({counter}){suffix}"
    return candidate


def organize(source_dir: str | Path, target_dir: str | Path, dry_run: bool = True) -> Report:
    src, root = Path(source_dir), Path(target_dir)
    if not src.is_dir():
        raise OrganizeError(f"{src} is not a directory.")
    if not root.is_dir():
        raise OrganizeError(f"Target {root} must be an existing directory (explicit selection required).")
    if src.resolve() == root.resolve():
        raise OrganizeError("Source and target must differ.")
    report = Report()
    for item in sorted(src.iterdir()):
        if item.is_dir():
            continue
        cls = classify(item)
        dest = _destination_for(root, cls.category, item.name)
        record = MoveRecord(str(item), str(dest), cls.category, cls.signal, cls.mismatch, "skipped")
        try:
            if dry_run:
                record.status = "would-move"
                record.detail = "dry run: no changes made"
            else:
                dest.parent.mkdir(parents=True, exist_ok=True)
                item.rename(dest)     # same-filesystem move preserves content; never deletes
                record.status = "moved"
        except OSError as exc:
            record.status = "failed"
            record.detail = f"{type(exc).__name__}: {exc}"
        if cls.mismatch:
            record.detail = (record.detail + " | " if record.detail else "") + \
                "warning: extension suggests a different type than the file content"
        report.records.append(record)
    return report
