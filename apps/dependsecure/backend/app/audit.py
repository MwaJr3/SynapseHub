"""Scanner adapter: run `pip-audit` safely and parse its results.

Safety properties:
- subprocess with an argument *list* — never a shell string; untrusted content
  is only ever passed as a file path to a server-generated temp file.
- Hard timeout; the process is killed on expiry.
- `--no-deps`: only the packages listed in the manifest are audited — the
  uploaded project is never installed and no dependencies are resolved.
- A failed scan is reported as a failed scan, distinctly from "completed with
  zero findings". Network/advisory-source errors are surfaced explicitly.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

from . import config


@dataclass
class AuditFinding:
    package: str
    version: str
    advisory_id: str
    aliases: list[str]
    description: str
    fix_versions: list[str]
    source: str = "pip-audit"


@dataclass
class AuditResult:
    status: str  # completed | failed
    tool: str = "pip-audit"
    error: str = ""
    findings: list[AuditFinding] = field(default_factory=list)
    raw: dict = field(default_factory=dict)


def pip_audit_available() -> bool:
    return shutil.which(config.PIP_AUDIT_BIN) is not None


def run_pip_audit(manifest_text: str, manifest_filename: str, timeout: int | None = None, runner=None) -> AuditResult:
    """Audit a manifest with pip-audit. `runner` is injectable for tests."""
    timeout = timeout if timeout is not None else config.SCAN_TIMEOUT_SECONDS
    suffix = ".toml" if manifest_filename.lower().endswith(".toml") else ".txt"
    with tempfile.NamedTemporaryFile("w", suffix=suffix, delete=False, encoding="utf-8") as handle:
        handle.write(manifest_text)
        temp_path = Path(handle.name)
    try:
        args = [
            config.PIP_AUDIT_BIN,
            "-r",
            str(temp_path),
            "--no-deps",
            "--format",
            "json",
            "--progress-spinner",
            "off",
        ]
        if suffix == ".toml":
            # pip-audit reads pyproject manifests through -r on recent versions;
            # keep arguments explicit and constant.
            pass
        try:
            if runner is not None:
                completed = runner(args, timeout)
            else:
                completed = subprocess.run(
                    args, capture_output=True, text=True, timeout=timeout, shell=False, check=False
                )
        except subprocess.TimeoutExpired:
            return AuditResult(status="failed", error=f"Scan exceeded the {timeout}s time limit and was stopped.")
        except FileNotFoundError:
            return AuditResult(
                status="failed",
                error="The auditor (pip-audit) is not installed in this environment. Install it or set DEPENDSECURE_PIP_AUDIT.",
            )
        except OSError as exc:
            return AuditResult(status="failed", error=f"Scanner could not start: {exc}")

        stdout = completed.stdout or ""
        stderr = completed.stderr or ""
        if not stdout.strip():
            # Empty output with a non-zero exit is a failure (e.g. dependency
            # resolution conflicts, unreachable advisory source) — report it as
            # a failed scan, distinctly from "completed with zero findings".
            detail = (stderr or "no output").strip()[:500]
            lowered = detail.lower()
            if "network" in lowered or "connection" in lowered:
                return AuditResult(
                    status="failed",
                    error=f"The vulnerability source could not be reached or the manifest could not be resolved: {detail}",
                )
            if "ResolutionImpossible" in detail or "Failed to install" in detail or "conflict" in lowered:
                return AuditResult(
                    status="failed",
                    error=f"The manifest could not be resolved as pinned (version conflicts): {detail}",
                )
            return AuditResult(status="failed", error=f"Scanner produced no output: {detail}")
        if completed.returncode not in (0, 1):
            # pip-audit exits 1 when vulnerabilities are found; anything else is a failure.
            detail = (stderr or stdout).strip()[:500]
            if "network" in detail.lower() or "connection" in detail.lower() or "resolve" in detail.lower():
                return AuditResult(
                    status="failed",
                    error=f"The vulnerability source could not be reached or the manifest could not be resolved: {detail}",
                )
            return AuditResult(status="failed", error=f"Scanner exited with code {completed.returncode}: {detail}")

        try:
            payload = json.loads(stdout)
        except json.JSONDecodeError:
            return AuditResult(status="failed", error="Scanner produced output that could not be parsed as JSON.")

        findings: list[AuditFinding] = []
        seen: set[tuple[str, str]] = set()
        for dep in payload.get("dependencies", []):
            name = str(dep.get("name", ""))
            version = str(dep.get("version", ""))
            for vuln in dep.get("vulns", []) or []:
                advisory_id = str(vuln.get("id", ""))
                key = (name, advisory_id)
                if not advisory_id or key in seen:
                    continue
                seen.add(key)
                findings.append(
                    AuditFinding(
                        package=name,
                        version=version,
                        advisory_id=advisory_id,
                        aliases=[str(a) for a in (vuln.get("aliases") or [])],
                        description=str(vuln.get("description", ""))[:2000],
                        fix_versions=[str(v) for v in (vuln.get("fix_versions") or [])],
                    )
                )
        return AuditResult(status="completed", findings=findings, raw=payload)
    finally:
        temp_path.unlink(missing_ok=True)
