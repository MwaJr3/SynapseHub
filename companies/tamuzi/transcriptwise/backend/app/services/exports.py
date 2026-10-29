import html
import io
import re

from docx import Document
from docx.shared import Inches, Pt, RGBColor

from app.models import Analysis, Transcript
from app.services.youtube import VIDEO_ID

LABELS = {
    "source_claim": "Source claim · unverified",
    "source_paraphrase": "Source paraphrase",
    "direct_quote": "Source quotation",
    "ai_explanation": "AI-added explanation",
    "illustrative_example": "Illustrative example",
    "recommendation": "Additional recommendation",
    "inferred_prerequisite": "Inferred prerequisite",
    "user_note": "User-edited note",
}


def stamp(value: float) -> str:
    total = int(value)
    hours, rem = divmod(total, 3600)
    minutes, seconds = divmod(rem, 60)
    return f"{hours}:{minutes:02}:{seconds:02}" if hours else f"{minutes:02}:{seconds:02}"


def ref_label(ref: str, transcript: Transcript, markdown=True):
    segment = next((s for s in transcript.segments if s["id"] == ref), None)
    if not segment:
        return ref
    label = stamp(segment["start"]) if segment["start"] is not None else f"Segment {ref}"
    if markdown and transcript.video_id and VIDEO_ID.fullmatch(transcript.video_id) and segment["start"] is not None:
        return f"[{label}](https://www.youtube.com/watch?v={transcript.video_id}&t={int(segment['start'])}s)"
    return label


def markdown_export(analysis: Analysis, transcript: Transcript) -> str:
    guide = analysis.guide or {}
    lines = [
        f"# {analysis.title}",
        "",
        f"Source: {transcript.source_url or transcript.source_type.title() + ' transcript'}",
        f"Engine: {guide.get('_meta', {}).get('engine', 'Unknown')}",
        "",
    ]
    if analysis.status == "partial":
        lines += ["> PARTIAL ANALYSIS: not all transcript chunks were processed.", ""]
    for notice in guide.get("notices", []):
        lines += [f"> {notice}", ""]
    for section in guide.get("sections", []):
        lines += [f"## {section['title']}", ""]
        for item in section["items"]:
            if item["heading"]:
                lines += [f"### {item['heading']}", ""]
            lines += [f"*{LABELS[item['provenance']]}*", "", item["body"], ""]
            for detail in item.get("details", []):
                lines += [f"**{detail['label']}:** {detail['text']}", ""]
            if item["refs"]:
                lines += ["Source: " + " · ".join(ref_label(r, transcript) for r in item["refs"]), ""]
    for key, title in (("quiz", "Revision questions"), ("flashcards", "Flashcards")):
        if guide.get(key):
            lines += [f"## {title}", ""]
            for n, entry in enumerate(guide[key], 1):
                front = entry.get("question", entry.get("front"))
                back = entry.get("answer", entry.get("back"))
                lines += [f"### {n}. {front}", ""]
                for option in entry.get("options", []):
                    lines.append(f"- {option}")
                lines += ["", f"**Answer:** {back}", ""]
                if entry.get("explanation"):
                    lines += [entry["explanation"], ""]
                if entry["refs"]:
                    lines += ["Source: " + " · ".join(ref_label(r, transcript) for r in entry["refs"]), ""]
    if analysis.notes:
        lines += ["## Personal notes", "", analysis.notes, ""]
    lines += [
        "---",
        "Generated with TranscriptWise. Source claims are not independently verified. Learning activity is not a measure of mastery.",
    ]
    return "\n".join(lines)


def html_export(analysis: Analysis, transcript: Transcript) -> str:
    """Standalone escaped print document. No scripts, external assets, or raw source HTML."""
    md = markdown_export(analysis, transcript)
    parts, in_code, code = [], False, []
    for line in md.splitlines():
        if line.startswith("```"):
            if in_code:
                parts.append("<pre><code>" + html.escape("\n".join(code)) + "</code></pre>")
                code = []
            in_code = not in_code
            continue
        if in_code:
            code.append(line)
            continue
        safe = html.escape(line)
        safe = re.sub(r"\[([^\]]+)\]\((https://www\.youtube\.com/watch\?[^\s)]+)\)", r'<a href="\2" rel="noreferrer">\1</a>', safe)
        if line.startswith("### "):
            parts.append(f"<h3>{safe[4:]}</h3>")
        elif line.startswith("## "):
            parts.append(f"<h2>{safe[3:]}</h2>")
        elif line.startswith("# "):
            parts.append(f"<h1>{safe[2:]}</h1>")
        elif line.startswith("> "):
            parts.append(f"<aside>{safe[2:]}</aside>")
        elif line.startswith("- "):
            parts.append(f"<p class='bullet'>• {safe[2:]}</p>")
        elif line == "---":
            parts.append("<hr>")
        elif line:
            safe = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", safe)
            safe = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", safe)
            parts.append(f"<p>{safe}</p>")
    if code:
        parts.append("<pre>" + html.escape("\n".join(code)) + "</pre>")
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{html.escape(analysis.title)}</title><style>
    *{{box-sizing:border-box}}body{{max-width:820px;margin:48px auto;padding:0 28px;font:16px/1.75 system-ui,sans-serif;color:#222}}h1{{font-size:34px;line-height:1.2}}h2{{border-top:1px solid #ddd;padding-top:24px;margin-top:36px}}h3{{font-size:19px}}aside{{padding:12px 18px;background:#f7f4ef;border-left:3px solid #d76b36;margin:16px 0;font-size:14px}}pre{{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f4f6;padding:16px;font-size:13px}}a{{color:#a94a22}}p{{overflow-wrap:anywhere}}.print-hint{{font-size:13px;color:#666;border-bottom:1px solid #ddd;padding-bottom:16px}}@media print{{body{{margin:0;max-width:none;padding:0;font-size:11pt}}.print-hint{{display:none}}h2,h3{{break-after:avoid}}pre,aside{{break-inside:avoid}}a{{color:inherit}}@page{{margin:20mm}}}}</style></head><body><p class="print-hint">TranscriptWise · Print or save as PDF using your browser's Print command (Ctrl/Cmd + P).</p>{"".join(parts)}</body></html>"""


def docx_export(analysis: Analysis, transcript: Transcript) -> bytes:
    document = Document()
    section = document.sections[0]
    section.top_margin = section.bottom_margin = Inches(0.8)
    normal = document.styles["Normal"]
    normal.font.name, normal.font.size = "Calibri", Pt(11)
    normal.paragraph_format.space_after = Pt(7)
    code_mode = False
    for line in markdown_export(analysis, transcript).splitlines():
        if line.startswith("```"):
            code_mode = not code_mode
            continue
        if code_mode:
            p = document.add_paragraph()
            run = p.add_run(line)
            run.font.name, run.font.size = "Consolas", Pt(9)
        elif line.startswith("# "):
            document.add_heading(line[2:], 0)
        elif line.startswith("## "):
            document.add_heading(line[3:], 1)
        elif line.startswith("### "):
            document.add_heading(line[4:], 2)
        elif line.startswith("- "):
            document.add_paragraph(line[2:], style="List Bullet")
        elif re.match(r"^\d+\. ", line):
            document.add_paragraph(re.sub(r"^\d+\. ", "", line), style="List Number")
        elif line:
            # Preserve actual source links as readable URLs in portable Word output.
            text = re.sub(r"\[([^]]+)\]\(([^)]+)\)", r"\1 (\2)", line).replace("**", "").strip("*")
            paragraph = document.add_paragraph(text.removeprefix("> "))
            if line.startswith("> "):
                for run in paragraph.runs:
                    run.font.color.rgb = RGBColor.from_string("7D4A32")
    buffer = io.BytesIO()
    document.save(buffer)
    return buffer.getvalue()
