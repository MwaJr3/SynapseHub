"""Hashing, baseline creation and integrity comparison.

SHA-256 (standard library `hashlib`) is used for all integrity comparisons —
no custom cryptography. A hash match proves byte-identity with the baseline
record, **not** that a file is safe or free of malware.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_stream(file_obj, chunk_size: int = 65536) -> str:
    digest = hashlib.sha256()
    while chunk := file_obj.read(chunk_size):
        digest.update(chunk)
    return digest.hexdigest()


@dataclass
class ManifestEntry:
    uid: str
    file_id: int
    display_name: str
    sha256: str
    size_bytes: int


@dataclass
class ComparisonResult:
    kind: str  # matched | changed | missing | new
    display_name: str
    file_id: int | None
    expected_sha256: str
    observed_sha256: str
    explanation: str


def build_manifest(files: list[ManifestEntry]) -> list[dict]:
    """Create a baseline manifest from the selected registered files."""
    return [
        {
            "uid": f.uid,
            "file_id": f.file_id,
            "display_name": f.display_name,
            "sha256": f.sha256,
            "size_bytes": f.size_bytes,
        }
        for f in sorted(files, key=lambda f: f.display_name)
    ]


def compare_to_baseline(manifest: list[dict], current_files: list[ManifestEntry]) -> list[ComparisonResult]:
    """Compare the current state of registered files with a baseline manifest.

    Files are matched by immutable `uid`, never by row id (row ids can be
    reused after deletion on SQLite).

    Each result explains which comparison produced it:
      matched  — same file present in both, identical SHA-256
      changed  — same file present in both, different SHA-256
      missing  — in the baseline, no longer among registered files
      new      — registered now, not part of the baseline
    """
    results: list[ComparisonResult] = []
    baseline_by_uid = {entry["uid"]: entry for entry in manifest}
    current_by_uid = {f.uid: f for f in current_files}

    for uid, base in baseline_by_uid.items():
        current = current_by_uid.get(uid)
        if current is None:
            results.append(
                ComparisonResult(
                    kind="missing",
                    display_name=base["display_name"],
                    file_id=base.get("file_id"),
                    expected_sha256=base["sha256"],
                    observed_sha256="",
                    explanation=(
                        f"'{base['display_name']}' is recorded in the baseline manifest "
                        f"(SHA-256 {base['sha256'][:12]}…) but is no longer registered in this workspace."
                    ),
                )
            )
        elif current.sha256 != base["sha256"]:
            results.append(
                ComparisonResult(
                    kind="changed",
                    display_name=current.display_name,
                    file_id=current.file_id,
                    expected_sha256=base["sha256"],
                    observed_sha256=current.sha256,
                    explanation=(
                        f"'{current.display_name}' changed since the baseline: SHA-256 "
                        f"{base['sha256'][:12]}… (expected) vs {current.sha256[:12]}… (observed). "
                        "The comparison used the full 256-bit digests of the file contents."
                    ),
                )
            )
        else:
            results.append(
                ComparisonResult(
                    kind="matched",
                    display_name=current.display_name,
                    file_id=current.file_id,
                    expected_sha256=base["sha256"],
                    observed_sha256=current.sha256,
                    explanation=(
                        f"'{current.display_name}' matches the baseline byte-for-byte (SHA-256 "
                        f"{current.sha256[:12]}…). A match proves byte-identity only — not that the file is safe."
                    ),
                )
            )

    for uid, current in current_by_uid.items():
        if uid not in baseline_by_uid:
            results.append(
                ComparisonResult(
                    kind="new",
                    display_name=current.display_name,
                    file_id=current.file_id,
                    expected_sha256="",
                    observed_sha256=current.sha256,
                    explanation=(
                        f"'{current.display_name}' is registered in the workspace but is not part of "
                        "the selected baseline manifest (registered after the baseline, or never included)."
                    ),
                )
            )

    order = {"changed": 0, "missing": 1, "new": 2, "matched": 3}
    return sorted(results, key=lambda r: (order[r.kind], r.display_name))


DEFAULT_SEVERITY = {"changed": "high", "missing": "high", "new": "medium"}
