"""HTML + JSON reports with accessible text summaries for every chart."""
from __future__ import annotations

import html
import json

from .analysis import ColumnStats, group_totals
from .ingest import Dataset


def _bar_chart_svg(items: list[tuple[str, float, int]], title: str) -> str:
    if not items:
        return "<p>No grouped data.</p>"
    width, height = 640, 220
    max_val = max(v for _, v, _ in items) or 1.0
    bar_w = width // len(items)
    bars = []
    for i, (label, value, _n) in enumerate(items):
        h = int((value / max_val) * (height - 40))
        bars.append(
            f'<rect x="{i * bar_w + 8}" y="{height - 24 - h}" width="{bar_w - 16}" height="{h}" fill="#2563eb"/>'
            f'<text x="{i * bar_w + bar_w / 2}" y="{height - 8}" text-anchor="middle" font-size="11">{html.escape(label)}</text>')
    summary = "; ".join(f"{label}: {value}" for label, value, _ in items)
    return (
        f'<figure><figcaption>{html.escape(title)}</figcaption>'
        f'<svg viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}: {html.escape(summary)}">'
        + "".join(bars) + "</svg>"
        f'<p class="summary">Text summary — {html.escape(summary)}.</p></figure>')


def build_report(ds: Dataset, stats: list[ColumnStats], groups: list[tuple[str, float, int]],
                 group_label: str) -> str:
    rows_html = "".join(
        f"<tr><td>{html.escape(s.column)}</td><td>{s.count}</td><td>{s.missing}</td><td>{s.mean}</td>"
        f"<td>{s.median}</td><td>{s.std}</td><td>{s.min}</td><td>{s.max}</td><td>{s.slope_per_row}</td></tr>"
        for s in stats)
    warnings = "".join(f"<li>{html.escape(w)}</li>" for w in ds.warnings) or "<li>none</li>"
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>datadesk report — {html.escape(ds.name)}</title>
<style>
 body {{ font-family: system-ui, sans-serif; margin: 2rem auto; max-width: 60rem; color: #0f172a; }}
 table {{ border-collapse: collapse; width: 100%; }} th, td {{ border: 1px solid #cbd5e1; padding: .4rem; text-align: left; }}
 figure {{ margin: 1.5rem 0; }} .summary {{ font-size: .9rem; color: #334155; }}
 .note {{ background: #f1f5f9; padding: .75rem; border-radius: .5rem; }}
</style></head><body>
<h1>datadesk report — {html.escape(ds.name)}</h1>
<p class="note">All figures are computed from the imported CSV. Original source files are never
modified. Missing or invalid values are reported and excluded from numeric analysis; they are never zero-filled. Trend slopes are simple least-squares estimates over row order: association only,
never causation.</p>
<h2>Dataset</h2>
<p>{len(ds.rows)} rows; columns: {html.escape(", ".join(ds.columns))}</p>
<h2>Cleaning decisions</h2><ul>{warnings}</ul>
<h2>Descriptive statistics</h2>
<table><thead><tr><th>column</th><th>count</th><th>missing</th><th>mean</th><th>median</th>
<th>std</th><th>min</th><th>max</th><th>trend slope/row</th></tr></thead><tbody>{rows_html}</tbody></table>
{_bar_chart_svg(groups, f"Totals by {group_label} (accessible text summary below)")}
</body></html>"""


def build_json(ds: Dataset, stats: list[ColumnStats], groups: list[tuple[str, float, int]]) -> str:
    return json.dumps({
        "dataset": ds.name, "rows": len(ds.rows), "columns": ds.columns,
        "warnings": ds.warnings,
        "statistics": [s.__dict__ for s in stats],
        "group_totals": [{"group": g, "total": v, "n": n} for g, v, n in groups],
    }, indent=2)
