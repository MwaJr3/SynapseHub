"""TeachCraft domain logic: workflow, versioning, question validation, safe export."""
from __future__ import annotations

import html
import json

WORKFLOW = {
    "draft": {"review", "archived"},
    "review": {"published", "draft", "archived"},   # published = approve; draft = reject
    "published": {"archived", "draft"},
    "archived": {"draft"},
}


class WorkflowError(ValueError):
    pass


def validate_transition(current: str, target: str) -> None:
    if target not in WORKFLOW.get(current, set()):
        raise WorkflowError(f"Illegal workflow transition '{current}' → '{target}'. Allowed: {sorted(WORKFLOW.get(current, set()))}.")


def is_editable(status: str) -> bool:
    """Published/archived content is not edited in place — create a draft instead."""
    return status in ("draft", "review")


# --------------------------------------------------------------- versioning ---


def snapshot(lesson) -> dict:
    return {
        "lesson_id": lesson.id,
        "version": lesson.version,
        "title": lesson.title,
        "blocks_json": lesson.blocks_json,
    }


def restore_plan(snapshots: list[dict], target_version: int) -> dict:
    """Restore = copy an old snapshot into a NEW version (history preserved)."""
    match = next((s for s in snapshots if s["version"] == target_version), None)
    if match is None:
        raise WorkflowError(f"Version {target_version} not found.")
    return {
        "title": match["title"],
        "blocks_json": match["blocks_json"],
        "new_version": max(s["version"] for s in snapshots) + 1,
        "change_summary": f"Restored from version {target_version}",
    }


# --------------------------------------------------------- question bank ---


def validate_question(kind: str, choices: list, answer) -> list[str]:
    """Return a list of validation problems (empty = valid)."""
    problems: list[str] = []
    if kind == "single":
        if len(choices) < 2:
            problems.append("Single-choice questions need at least two choices.")
        if not isinstance(answer, int) or not (0 <= answer < len(choices)):
            problems.append("Answer must be the index of exactly one choice.")
    elif kind == "multi":
        if len(choices) < 2:
            problems.append("Multiple-choice questions need at least two choices.")
        if not isinstance(answer, list) or not answer:
            problems.append("Answer must list at least one correct choice.")
        elif any((not isinstance(i, int)) or i < 0 or i >= len(choices) for i in answer):
            problems.append("Correct-choice indexes must reference existing choices.")
    elif kind == "tf":
        if not isinstance(answer, bool):
            problems.append("True/false answers must be a boolean.")
    elif kind == "numeric":
        try:
            float(answer)
        except (TypeError, ValueError):
            problems.append("Numeric answers must be a number.")
    elif kind == "ordering":
        if not isinstance(answer, list) or len(answer) < 2 or any(not isinstance(x, str) for x in answer):
            problems.append("Ordering answers must be a list of at least two strings (correct order).")
    elif kind == "matching":
        if not isinstance(answer, dict) or len(answer) < 2:
            problems.append("Matching answers must map at least two items to their pairs.")
    elif kind == "rubric":
        if not isinstance(answer, str) or not answer.strip():
            problems.append("Rubric-based questions need a rubric description.")
    else:
        problems.append(f"Unknown question kind '{kind}'.")
    return problems


# -------------------------------------------------------------- export ---


TEMPLATES = {
    "blank": [],
    "lesson_plan": [{"kind": "heading", "text": "Learning objectives"}, {"kind": "list", "items": ["…"]},
                    {"kind": "heading", "text": "Activities"}, {"kind": "heading", "text": "Assessment"}],
    "worked_example": [{"kind": "heading", "text": "Problem"}, {"kind": "example", "text": "Worked steps…"},
                       {"kind": "heading", "text": "Your turn"}],
    "revision_sheet": [{"kind": "heading", "text": "Key ideas"}, {"kind": "list", "items": ["…"]},
                       {"kind": "heading", "text": "Practice questions"}],
    "quiz": [{"kind": "heading", "text": "Questions"}],
    "assignment_brief": [{"kind": "heading", "text": "Task"}, {"kind": "heading", "text": "Criteria"}],
}


def expand_template(template: str) -> list[dict]:
    if template not in TEMPLATES:
        raise WorkflowError(f"Unknown template '{template}'.")
    return json.loads(json.dumps(TEMPLATES[template]))


def render_block_html(block: dict) -> str:
    """Render one content block to HTML with ALL text escaped (XSS-safe export)."""
    kind = block.get("kind", "text")
    if kind == "heading":
        return f"<h2>{html.escape(str(block.get('text', '')))}</h2>"
    if kind == "list":
        items = "".join(f"<li>{html.escape(str(i))}</li>" for i in block.get("items", []))
        return f"<ul>{items}</ul>"
    if kind == "table":
        rows = block.get("rows", [])
        body = "".join("<tr>" + "".join(f"<td>{html.escape(str(c))}</td>" for c in row) + "</tr>" for row in rows)
        return f"<table>{body}</table>"
    if kind == "link":
        url = html.escape(str(block.get("url", "")), quote=True)
        return f'<p><a href="{url}" rel="noopener noreferrer">{html.escape(str(block.get("text", url)))}</a></p>'
    if kind == "image":
        alt = html.escape(str(block.get("alt", "image")))
        return f'<figure><figcaption>{alt}</figcaption></figure>'  # alt text preserved; binary upload not in MVP
    if kind == "example":
        return f"<aside class='example'>{html.escape(str(block.get('text', '')))}</aside>"
    return f"<p>{html.escape(str(block.get('text', '')))}</p>"


def export_lesson_html(title: str, blocks_json: str, version: int) -> str:
    """Static HTML export. Stated plainly: static export preserves layout and
    text only — interactive question behaviour does NOT survive export."""
    blocks = json.loads(blocks_json or "[]")
    body = "\n".join(render_block_html(b) for b in blocks)
    return (
        "<!DOCTYPE html>\n<html><head><meta charset='utf-8'>"
        f"<title>{html.escape(title)}</title></head><body>"
        f"<h1>{html.escape(title)} <small>(version {version})</small></h1>"
        "<p><em>Static HTML export — text and layout preserved; interactive "
        "question behaviour is not included.</em></p>"
        f"{body}\n</body></html>"
    )
