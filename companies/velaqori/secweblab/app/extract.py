"""Passive extractor: scan code/markup/markdown for common risky patterns.

Demo policy: uses only in-repo lab samples (no live URL fetching).
"""
from __future__ import annotations

import re

from .findings import Finding, SEVERITY_NOTE

LIMITS = ("Passive analysis only: no execution, no exploitation, no traffic. "
          "Absence of findings is NOT proof of safety. " + SEVERITY_NOTE)


def scan_markup(source: str, name: str = "sample.html") -> list[Finding]:
    findings: list[Finding] = []
    m = re.search(r"<script[^>]*>(.*?)</script>", source, re.S | re.I)
    if m and re.search(r"document\.cookie|innerHTML\s*=", m.group(1)):
        findings.append(Finding(
            vulnerability_class="A03:2021-Injection (DOM XSS indicator)",
            location=f"{name}: <script> block",
            evidence=m.group(1).strip()[:300],
            why_it_matters="Direct use of untrusted data in the DOM/cookie context can enable session theft or script injection.",
            reproduction_steps=[
                "1. Load the page with a crafted value in the reflected input/query.",
                "2. Observe whether the value executes or leaks into an exposed context.",
                "3. Confirm in a local lab only — do not test third-party systems."],
            candidate_fix="Use textContent/setAttribute with validated values; never concatenate untrusted data into HTML; add a CSP.",
            severity="high (indicative)", limitations=LIMITS))
    m2 = re.search(r"<input[^>]*value=[\"']([^\"']+)[\"']", source, re.I)
    if m2 and re.search(r"javascript:", m2.group(1), re.I):
        findings.append(Finding(
            vulnerability_class="A03:2021-Injection (javascript: URI in input value)",
            location=f"{name}: input value attribute",
            evidence=m2.group(0)[:300],
            why_it_matters="javascript: URIs in reflected attributes can trigger script execution in some contexts.",
            reproduction_steps=["1. Reflect a javascript: payload into the input value in a local lab.",
                                "2. Trigger the associated action (submit/click)."],
            candidate_fix="Validate and encode attribute values; reject non-https schemes.",
            severity="medium (indicative)", limitations=LIMITS))
    return findings


def scan_python(source: str, name: str = "sample.py") -> list[Finding]:
    findings: list[Finding] = []
    if re.search(r"(?<![\w.])eval\s*\(|(?<![\w.])exec\s*\(", source):
        m = re.search(r".*(?<![\w.])(eval|exec)\s*\(.*", source)
        findings.append(Finding(
            vulnerability_class="A03:2021-Injection (code execution via eval/exec)",
            location=f"{name}: eval/exec call",
            evidence=m.group(0).strip()[:300],
            why_it_matters="Executing strings from untrusted input gives attackers full code execution in the process.",
            reproduction_steps=["1. Provide crafted input to the vulnerable entry point in a local lab.",
                                "2. Observe code execution beyond the intended operation."],
            candidate_fix="Never eval untrusted input; use ast.literal_eval for data or explicit parsers.",
            severity="critical (indicative)", limitations=LIMITS))
    if re.search(r"pickle\.loads?\(", source):
        findings.append(Finding(
            vulnerability_class="A08:2021-Software and Data Integrity Failures (unsafe deserialization)",
            location=f"{name}: pickle.load(s)",
            evidence=re.search(r".*pickle\.loads?\(.*", source).group(0).strip()[:300],
            why_it_matters="Unpickling untrusted data can execute arbitrary code by design of the format.",
            reproduction_steps=["1. Feed crafted pickle bytes to the untrusted input path in a local lab.",
                                "2. Observe code execution on load."],
            candidate_fix="Use JSON for untrusted data; if pickle is required, authenticate data with a MAC first.",
            severity="critical (indicative)", limitations=LIMITS))
    if re.search(r"subprocess\.(run|Popen|call)\([^)]*shell\s*=\s*True", source):
        findings.append(Finding(
            vulnerability_class="A03:2021-Injection (command injection risk)",
            location=f"{name}: subprocess with shell=True",
            evidence=re.search(r".*subprocess\.(run|Popen|call)\(.*", source).group(0).strip()[:300],
            why_it_matters="shell=True with interpolated input enables command injection.",
            reproduction_steps=["1. Insert shell metacharacters into the interpolated argument in a local lab.",
                                "2. Observe command chaining."],
            candidate_fix="Pass argument lists without shell=True; validate inputs against an allowlist.",
            severity="high (indicative)", limitations=LIMITS))
    return findings
