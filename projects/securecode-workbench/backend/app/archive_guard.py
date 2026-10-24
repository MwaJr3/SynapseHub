"""Safe handling of untrusted project archives.

Enforced (and tested):
- entries must not escape the extraction root (no absolute paths, no "..")
- bounded file count, total uncompressed size, and compression ratio (zip bomb)
- uploads are only ever READ as text for rule matching — code is never executed
"""
from __future__ import annotations

import io, zipfile
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath
import tempfile, shutil


class ArchiveRejected(ValueError):
    pass


@dataclass
class ExtractionResult:
    root: Path
    files: list[Path] = field(default_factory=list)
    total_bytes: int = 0
    cleanup: callable = lambda: None


def _safe_name(name: str) -> PurePosixPath:
    p = PurePosixPath(name.replace("\\", "/"))
    if p.is_absolute() or any(part == ".." for part in p.parts) or (p.parts and p.parts[0].endswith(":")):
        raise ArchiveRejected(f"refused: unsafe path in archive: {name!r}")
    return p


def extract_archive(data: bytes, max_bytes: int, max_uncompressed: int,
                    max_files: int, max_ratio: int) -> ExtractionResult:
    if len(data) > max_bytes:
        raise ArchiveRejected(f"refused: archive exceeds {max_bytes} bytes")
    tmp = Path(tempfile.mkdtemp(prefix="scw-"))
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            infos = [i for i in zf.infolist() if not i.is_dir()]
            if len(infos) > max_files:
                raise ArchiveRejected(f"refused: archive contains {len(infos)} files (limit {max_files})")
            total = sum(i.file_size for i in infos)
            if total > max_uncompressed:
                raise ArchiveRejected(f"refused: uncompressed size {total} exceeds {max_uncompressed}")
            if len(data) > 0 and total / len(data) > max_ratio:
                raise ArchiveRejected("refused: compression ratio suggests a zip bomb")
            result = ExtractionResult(root=tmp)
            for info in infos:
                rel = _safe_name(info.filename)
                dest = tmp / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(info) as src, open(dest, "wb") as out:
                    shutil.copyfileobj(src, out)
                result.files.append(dest)
                result.total_bytes += info.file_size
            result.cleanup = lambda: shutil.rmtree(tmp, ignore_errors=True)
            return result
    except zipfile.BadZipFile:
        shutil.rmtree(tmp, ignore_errors=True)
        raise ArchiveRejected("refused: not a valid zip archive")


TEXT_SUFFIXES = {".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rb", ".php", ".yml", ".yaml", ".json", ".env", ".sh", ".txt", ".md", ".cfg", ".ini"}


def iter_source_files(root: Path, limit: int = 2000):
    """Yield (relative_path, text) — read-only; never import or execute."""
    count = 0
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        count += 1
        if count > limit:
            return
        try:
            text = path.read_text(errors="replace")
        except OSError:
            continue
        yield str(path.relative_to(root)), text
