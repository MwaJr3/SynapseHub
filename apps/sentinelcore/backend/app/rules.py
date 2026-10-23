"""Rule matching: turn events into alerts.

A match means "this rule's pattern matched this event" — it is a triage
suggestion for an analyst, NOT proof of malicious activity.
"""
from __future__ import annotations

from dataclasses import dataclass

from .models import Event, Rule


@dataclass
class Match:
    rule_id: int
    rule_name: str
    event_id: int
    severity: str


def event_matches(rule: Rule, event: Event) -> bool:
    if rule.enabled != "yes":
        return False
    if rule.category_match and rule.category_match != event.category:
        return False
    if rule.summary_contains and rule.summary_contains.lower() not in event.summary.lower():
        return False
    return bool(rule.category_match or rule.summary_contains)


def evaluate(rules: list[Rule], events: list[Event]) -> list[Match]:
    matches: list[Match] = []
    for rule in rules:
        for event in events:
            if event_matches(rule, event):
                matches.append(Match(rule_id=rule.id, rule_name=rule.name, event_id=event.id, severity=rule.severity))
    return matches


MATCH_NOTE = "Rule match = triage suggestion for review; not proof of malicious activity."
