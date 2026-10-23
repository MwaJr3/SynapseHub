"""Dependency-manifest parsing: requirements.txt and pyproject.toml.

Parsed with the standard library only. Uploaded manifests are never executed
and never installed — only read as text.
"""
from __future__ import annotations

import re
import tomllib
from dataclasses import dataclass, field

REQ_LINE_RE = re.compile(
    r"^\s*(?P<name>[A-Za-z0-9][A-Za-z0-9._-]*)\s*(?P<spec>(?:[<>=!~]=?|===)\s*[^;#\s][^;#]*)?\s*(?:;[^#]*)?\s*(?:#.*)?$"
)


@dataclass
class ParsedPackage:
    name: str
    version_spec: str


@dataclass
class ManifestParseResult:
    kind: str  # requirements | pyproject
    packages: list[ParsedPackage] = field(default_factory=list)
    errors: list[dict] = field(default_factory=list)


def parse_requirements(text: str) -> ManifestParseResult:
    result = ManifestParseResult(kind="requirements")
    for line_no, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#") or line.startswith("-"):
            # Options (-r includes, --index-url, …) are skipped and reported.
            if line.startswith("-"):
                result.errors.append({"line_no": line_no, "reason": f"option line not analysed: {line[:80]}", "raw": raw[:200]})
            continue
        match = REQ_LINE_RE.match(line)
        if not match:
            result.errors.append({"line_no": line_no, "reason": "unrecognised requirement syntax", "raw": raw[:200]})
            continue
        result.packages.append(ParsedPackage(name=match.group("name"), version_spec=(match.group("spec") or "").strip()))
    return result


def parse_pyproject(text: str) -> ManifestParseResult:
    result = ManifestParseResult(kind="pyproject")
    try:
        data = tomllib.loads(text)
    except tomllib.TOMLDecodeError as exc:
        result.errors.append({"line_no": 0, "reason": f"invalid TOML: {exc}", "raw": ""})
        return result
    deps = (((data.get("project") or {}).get("dependencies")) or []) or []
    if not isinstance(deps, list):
        result.errors.append({"line_no": 0, "reason": "project.dependencies must be a list", "raw": ""})
        return result
    for entry in deps:
        if not isinstance(entry, str):
            result.errors.append({"line_no": 0, "reason": f"non-string dependency entry: {entry!r}", "raw": ""})
            continue
        match = REQ_LINE_RE.match(entry.strip())
        if not match:
            result.errors.append({"line_no": 0, "reason": f"unrecognised dependency specifier: {entry[:80]}", "raw": entry[:200]})
            continue
        result.packages.append(ParsedPackage(name=match.group("name"), version_spec=(match.group("spec") or "").strip()))
    if not result.packages and not result.errors:
        result.errors.append({"line_no": 0, "reason": "no project.dependencies found (optional-dependencies are not analysed in this MVP)", "raw": ""})
    return result


def parse_manifest(filename: str, text: str) -> ManifestParseResult:
    lower = filename.lower()
    if lower.endswith(".toml"):
        return parse_pyproject(text)
    return parse_requirements(text)
