"""Storage abstraction (§85). Layout: storage/{originals,intermediate,stems,analysis,exports}/…
Local filesystem implementation; an S3-compatible backend implements the same
interface for production (keys are opaque everywhere else in the system).
"""
from __future__ import annotations
import shutil
from pathlib import Path
from .config import STORAGE_DIR, ensure_dirs


class LocalStorage:
    def __init__(self, root: Path = STORAGE_DIR):
        ensure_dirs(); self.root = Path(root)

    def path(self, key: str) -> Path:
        p = (self.root / key).resolve()
        if not str(p).startswith(str(self.root.resolve())):
            raise ValueError("storage key escapes storage root")   # path-traversal guard (§55)
        return p

    def put_file(self, key: str, src: Path) -> str:
        dst = self.path(key); dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
        return key

    def put_bytes(self, key: str, data: bytes) -> str:
        dst = self.path(key); dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_bytes(data)
        return key

    def delete(self, key: str) -> None:
        self.path(key).unlink(missing_ok=True)

    def delete_prefix(self, prefix: str) -> None:
        d = self.path(prefix)
        if d.is_dir():
            shutil.rmtree(d, ignore_errors=True)


storage = LocalStorage()
