"""Modern features: backlinks, bounded knowledge-graph expansion, duplicate
detection, markdown import/export.

DSA notes: backlinks are indexed link lookups O(deg); graph expansion is
BFS bounded by depth and node cap (no unbounded expansion); duplicate
detection is pairwise token-Jaccard O(n²) over a bounded corpus with an
early length filter.
"""
from __future__ import annotations

import json
import re


class FeatureError(ValueError):
    pass


def backlinks(note_id: int, links: list[tuple[int, int]]) -> list[int]:
    """All notes linking TO this note."""
    return sorted({a for a, b in links if b == note_id})


def graph_bounded(note_id: int, links: list[tuple[int, int]], depth: int = 2,
                  max_nodes: int = 50) -> dict:
    """BFS expansion from a note, explicitly bounded (depth ≤ 4, ≤ max_nodes).
    Returns visited nodes per depth level and a truncation flag."""
    if depth < 1 or depth > 4:
        raise FeatureError("depth must be within 1..4 (bounded expansion)")
    if max_nodes < 1 or max_nodes > 200:
        raise FeatureError("max_nodes must be within 1..200")
    adjacency: dict[int, set[int]] = {}
    for a, b in links:
        adjacency.setdefault(a, set()).add(b)
        adjacency.setdefault(b, set()).add(a)
    visited = {note_id}
    frontier = {note_id}
    levels = [[note_id]]
    truncated = False
    for _ in range(depth):
        nxt = set()
        for node in frontier:
            for neighbor in adjacency.get(node, ()):
                if neighbor not in visited:
                    nxt.add(neighbor)
        if not nxt:
            break
        if len(visited | nxt) > max_nodes:
            allowed = list(nxt)[: max_nodes - len(visited)]
            nxt = set(allowed)
            truncated = True
        visited |= nxt
        levels.append(sorted(nxt))
        frontier = nxt
        if truncated:
            break
    return {"root": note_id, "levels": levels, "nodes_visited": len(visited),
            "truncated": truncated,
            "note": "Bounded expansion; the full graph is never rendered implicitly."}


TOKEN = re.compile(r"[a-z0-9]{2,}")


def detect_duplicates(notes: list[dict], threshold: float = 0.8) -> list[dict]:
    """Pairwise token-Jaccard similarity above the threshold. Candidates are
    flagged for human review — never merged automatically."""
    if not 0.5 <= threshold <= 1.0:
        raise FeatureError("threshold must be within 0.5..1.0")
    token_sets = [(n, set(TOKEN.findall(n.get("body", "").lower()))) for n in notes]
    out = []
    for i, (a, ta) in enumerate(token_sets):
        for b, tb in token_sets[i + 1:]:
            if not ta or not tb:
                continue
            if abs(len(ta) - len(tb)) / max(len(ta), len(tb)) > (1 - threshold):
                continue                                  # cheap length pre-filter
            jac = len(ta & tb) / len(ta | tb)
            if jac >= threshold:
                out.append({"id_a": a.get("id"), "id_b": b.get("id"),
                            "similarity": round(jac, 3), "action": "review candidates — never auto-merged"})
    return out


def export_markdown(notes: list[dict]) -> str:
    parts = []
    for n in notes:
        parts.append(f"# {n.get('title', 'Untitled')}\n\n{n.get('body', '')}\n")
    return "\n---\n".join(parts)


def import_markdown(text: str) -> dict:
    """Split a markdown bundle on H1 headings. Ambiguous bundles are reported,
    not guessed."""
    chunks = re.split(r"(?m)^# ", text)
    notes, rejected = [], []
    for chunk in chunks:
        chunk = chunk.strip("\n")
        if not chunk.strip():
            continue
        if "\n" in chunk:
            title, body = chunk.split("\n", 1)
        else:
            rejected.append({"chunk": chunk[:60], "reason": "heading without body"})
            continue
        if not body.strip():
            rejected.append({"chunk": title[:60], "reason": "empty body"})
            continue
        notes.append({"title": title.strip(), "body": body.strip()})
    return {"notes": notes, "rejected": rejected,
            "note": "Import splits on H1 headings; rejected chunks carry reasons."}
