"""Triage: asset criticality weighting, incident timeline, playbook mapping."""
from __future__ import annotations

from dataclasses import dataclass

# Asset criticality from the local asset inventory (data/assets.json).
CRITICALITY_WEIGHT = {"critical": 3, "high": 2, "medium": 1, "low": 0}

# Playbooks: bounded, offline runbook steps. NOT automated containment.
PLAYBOOKS = {
    "auth": ["1. Confirm the account and source of the authentication events.",
             "2. Check for impossible-travel or repeated failures in the same window.",
             "3. If compromise is suspected: rotate credentials via your identity provider (manual step).",
             "4. Document findings in the incident timeline."],
    "network": ["1. Identify the source/destination pair and whether either is an approved allowlisted system.",
                "2. Correlate with firewall/proxy logs held by the network team (manual step).",
                "3. Block indicators at the perimeter only through your change process (manual step).",
                "4. Record evidence and timestamps in the incident timeline."],
    "endpoint": ["1. Identify the host and isolate it per your IT process (manual step).",
                 "2. Collect triage artifacts per your forensics policy (manual step).",
                 "3. Reimage or remediate per severity.",
                 "4. Document in the incident timeline."],
    "email": ["1. Verify the reported message headers and sender.",
              "2. Search the mail store for similar messages (manual step).",
              "3. Purge/quarantine via your mail platform (manual step).",
              "4. Record in the incident timeline."],
    "cloud": ["1. Identify the affected resource and its owner.",
              "2. Review access policies and recent changes (manual step).",
              "3. Revoke exposed keys via your cloud IAM process (manual step).",
              "4. Document in the incident timeline."],
}


@dataclass
class Incident:
    incident_id: str
    score: int
    assets: list[str]
    event_ids: list[str]
    categories: list[str]
    playbook: list[str]
    timeline: list[dict]
    status: str = "new"      # new -> triaged -> contained -> closed (manual steps)


def score_events(events: list[dict], assets: dict[str, str]) -> int:
    """Prioritization score: severity × criticality weight. Transparent math."""
    total = 0
    for e in events:
        weight = CRITICALITY_WEIGHT.get(assets.get(e["asset"], "low"), 0)
        total += e["severity"] * (1 + weight)
    return total


def build_incident(incident_id: str, events: list[dict], assets: dict[str, str]) -> Incident:
    if not events:
        raise ValueError("an incident needs at least one event")
    categories = sorted({e["category"] for e in events})
    primary = max(categories, key=lambda c: sum(e["severity"] for e in events if e["category"] == c))
    timeline = [{"at": e.get("collected_at", ""), "event_id": e["event_id"],
                 "summary": e["summary"], "severity": e["severity"]} for e in events]
    return Incident(
        incident_id=incident_id,
        score=score_events(events, assets),
        assets=sorted({e["asset"] for e in events}),
        event_ids=[e["event_id"] for e in events],
        categories=categories,
        playbook=PLAYBOOKS.get(primary, PLAYBOOKS["auth"]),
        timeline=timeline)
