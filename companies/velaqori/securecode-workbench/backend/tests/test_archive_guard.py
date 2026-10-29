import io, zipfile

import pytest

from app.archive_guard import ArchiveRejected, extract_archive, iter_source_files

LIMITS = dict(max_bytes=1024 * 1024, max_uncompressed=1024 * 1024, max_files=10, max_ratio=20)


def make_zip(entries: dict[str, bytes]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in entries.items():
            zf.writestr(name, data)
    return buf.getvalue()


def test_extract_valid_archive_reads_text_only():
    result = extract_archive(make_zip({"src/app.py": b"print('hi')\n", "README.md": b"# t\n"}), **LIMITS)
    try:
        files = dict(iter_source_files(result.root))
        assert files["src/app.py"] == "print('hi')\n"
    finally:
        result.cleanup()


def test_path_traversal_and_absolute_paths_refused():
    for bad in ("../evil.py", "/etc/passwd", "a/../../evil.py"):
        with pytest.raises(ArchiveRejected, match="unsafe"):
            extract_archive(make_zip({bad: b"x"}), **LIMITS)


def test_zip_bomb_ratio_enforced():
    with pytest.raises(ArchiveRejected, match="zip bomb"):
        extract_archive(make_zip({"big.txt": b"a" * (500 * 1024)}), **LIMITS)


def test_file_count_and_size_limits():
    with pytest.raises(ArchiveRejected, match="files"):
        extract_archive(make_zip({f"f{i}.py": b"x" for i in range(20)}), **LIMITS)
    with pytest.raises(ArchiveRejected, match="exceeds"):
        extract_archive(b"x" * (2 * 1024 * 1024), **LIMITS)


def test_invalid_zip_refused():
    with pytest.raises(ArchiveRejected, match="valid zip"):
        extract_archive(b"this is not a zip", **LIMITS)
