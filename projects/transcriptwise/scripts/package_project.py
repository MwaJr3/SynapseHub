"""Package only distributable project source, docs, templates and authored fixtures.

Dependencies/builds/caches/logs/secrets/databases/test artifacts are excluded.
The top-level allowlist intentionally requires review when adding a new root file.
"""

import argparse
import hashlib
import stat
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROOT_FILES = {
    "README.md",
    ".gitignore",
    ".dockerignore",
    ".prettierrc.json",
    ".env.example",
    ".env.production.example",
    "Dockerfile",
    "compose.yml",
}
SOURCE_DIRS = {
    "backend",
    "frontend",
    "docs",
    "deployment",
    "scripts",
    "examples",
    ".github",
}
SKIP_DIRS = {
    ".git",
    ".venv",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
    ".cache",
    ".e2e",
    "dist",
    "build",
    "coverage",
    "test-results",
    "playwright-report",
    ".vite",
}


def distributable(path):
    relative = path.relative_to(ROOT)
    if not path.is_file() or path.is_symlink():
        return False
    if len(relative.parts) == 1:
        return path.name in ROOT_FILES
    if relative.parts[0] not in SOURCE_DIRS or any(
        part in SKIP_DIRS for part in relative.parts
    ):
        return False
    if relative.parts[:2] == ("backend", "data"):
        return path.name == ".gitkeep"
    name = path.name.lower()
    if (
        name.startswith(".env")
        or name.endswith(
            (
                ".log",
                ".zip",
                ".pyc",
                ".pyo",
                ".tsbuildinfo",
                ".db",
                ".sqlite",
                ".sqlite3",
            )
        )
        or ".db-" in name
    ):
        return False
    return name not in {".ds_store", "thumbs.db"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output", type=Path, default=ROOT.parent / "TranscriptWise.zip"
    )
    args = parser.parse_args()
    files = sorted(p for p in ROOT.rglob("*") if distributable(p))
    manifest = []
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(
        args.output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9
    ) as archive:
        for path in files:
            relative = path.relative_to(ROOT).as_posix()
            content = path.read_bytes()
            manifest.append(f"{hashlib.sha256(content).hexdigest()}  {relative}")
            info = zipfile.ZipInfo(
                "TranscriptWise/" + relative, date_time=(2026, 10, 23, 0, 0, 0)
            )
            info.create_system = 3
            mode = 0o755 if path.stat().st_mode & stat.S_IXUSR else 0o644
            info.external_attr = (stat.S_IFREG | mode) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, content)
        info = zipfile.ZipInfo(
            "TranscriptWise/MANIFEST.sha256", date_time=(2026, 10, 23, 0, 0, 0)
        )
        info.create_system = 3
        info.external_attr = (stat.S_IFREG | 0o644) << 16
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, "\n".join(manifest) + "\n")
    with zipfile.ZipFile(args.output) as archive:
        if archive.testzip():
            raise SystemExit("Archive integrity check failed")
        for member in archive.namelist():
            parts = Path(member).parts
            if any(part in SKIP_DIRS for part in parts):
                raise SystemExit(f"Forbidden runtime artifact: {member}")
            if Path(member).name.startswith(".env") and not member.endswith(".example"):
                raise SystemExit(f"Forbidden secret file: {member}")
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
    print(
        f"{args.output}\n{len(files) + 1} files · {args.output.stat().st_size:,} bytes\nSHA256 {digest}"
    )


if __name__ == "__main__":
    main()
