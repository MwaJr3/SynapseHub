"""FastAPI app: question bank with filters, mock sessions, spaced review."""
from __future__ import annotations

import json

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from app.store import Store
from app.mocktimer import format_mmss

app = FastAPI(title="PrepWise", docs_url=None, redoc_url=None)
store = Store("prepwise.db")

PAGE = """<!doctype html><html><head><meta charset="utf-8"><title>{title} · PrepWise</title>
<style>body{{font-family:Georgia,serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#2b2d42}}
a{{color:#7b5ea7}}table{{width:100%;border-collapse:collapse}}td,th{{border:1px solid #ddd;padding:.45rem;text-align:left}}
button,input,select,textarea{{padding:.5rem;border:1px solid #cbb8e8;border-radius:6px}}button{{background:#7b5ea7;color:#fff;border:0;cursor:pointer}}
.timer{{font-variant-numeric:tabular-nums;font-size:2rem}}.card{{border:1px solid #e4dcf4;border-radius:8px;padding:1rem;margin:.6rem 0}}</style>
</head><body><header><strong><a href="/" style="color:#2b2d42;text-decoration:none">PrepWise</a></strong> · interview preparation (demo content)</header>
<main>{body}</main><footer style="margin-top:2.5rem;font-size:.85rem;color:#8d8a9e">Demo content is simulated. Self-scores are learner
estimates, not verified performance. Spaced review uses Leitner-style boxes — an educational heuristic.</footer></body></html>"""


def page(title: str, body: str) -> HTMLResponse:
    return HTMLResponse(PAGE.format(title=title, body=body))


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    company = request.query_params.get("company", "")
    role = request.query_params.get("role", "")
    difficulty = request.query_params.get("difficulty", "")
    qs = store.filter_questions(company, role, difficulty)
    stats = store.session_stats()
    rows = "".join(f"<div class='card'><strong>Q{q['id']}</strong> [{q['company']} · {q['role']} · {q['difficulty']} · {q['topic']}]"
                   f"<p>{q['prompt']}</p>"
                   f"<form method='post' action='/review/{q['id']}'>"
                   f"<button formaction='/review/{q['id']}?remembered=1'>Review: remembered</button> "
                   f"<button formaction='/review/{q['id']}?remembered=0' style='background:#9d6b6b'>Review: needs work</button></form></div>"
                   for q in qs) or "<p>No questions match those filters.</p>"
    return page("home", f"<h1>Question bank</h1>"
                f"<form method='get' action='/'>"
                f"<input name='company' placeholder='company' value='{company}'>"
                f"<input name='role' placeholder='role' value='{role}'>"
                f"<select name='difficulty'><option value=''>any</option>" +
                "".join(f"<option {'selected' if difficulty == d else ''}>{d}</option>" for d in ("easy", "medium", "hard")) +
                f"</select><button>Filter</button></form>"
                f"<p>{len(qs)} question(s). Sessions completed: {stats['sessions_completed']} · "
                f"avg self-score: {stats['average_self_score']} (self-estimates)</p>{rows}"
                "<p><a href='/mock'>Start mock interview</a> · <a href='/review/due'>Spaced review queue</a></p>")


@app.get("/mock", response_class=HTMLResponse)
async def mock_form():
    return page("mock", "<h1>Mock interview</h1><form method='post' action='/mock'>"
                "<select name='company'><option>any</option><option>Acme</option><option>Globex</option></select>"
                "<select name='role'><option>any</option><option>SWE</option><option>Data</option></select>"
                "<select name='difficulty'><option value=''>any</option><option>easy</option><option>medium</option><option>hard</option></select>"
                "<input name='minutes' type='number' value='30' min='5' max='180'>"
                "<button>Start</button></form>")


@app.post("/mock")
async def mock_start(request: Request):
    form = await request.form()
    company = "" if str(form.get("company")) == "any" else str(form.get("company"))
    role = "" if str(form.get("role")) == "any" else str(form.get("role"))
    difficulty = str(form.get("difficulty", ""))
    minutes = max(5, min(180, int(str(form.get("minutes", "30")))))
    qs = store.filter_questions(company, role, difficulty)
    if not qs:
        return page("mock", "<p>No questions match — adjust filters.</p>")
    session_id = store.start_session("mock", [q["id"] for q in qs])
    per_q = format_mmss(max(30, minutes * 60 // len(qs)))
    cards = "".join(f"<div class='card'><p><strong>Q{i+1}.</strong> {q['prompt']}</p>"
                    f"<textarea name='score_{i}' placeholder='self-score 1-5 after answering' rows='1'></textarea></div>"
                    for i, q in enumerate(qs))
    return page("mock session", f"<h1>Mock session #{session_id}</h1>"
                f"<p class='timer' id='timer'>{format_mmss(minutes * 60)}</p>"
                f"<p>{len(qs)} questions · ~{per_q} per question (suggested pace)</p>"
                f"<form method='post' action='/mock/{session_id}/finish'>{cards}"
                f"<textarea name='notes' placeholder='session notes' rows='2'></textarea>"
                f"<button>Finish &amp; self-assess</button></form>"
                "<script>let t=" + str(minutes * 60) + ";const el=document.getElementById('timer');"
                "setInterval(()=>{if(t>0){t--;el.textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}},1000);</script>")


@app.post("/mock/{session_id}/finish")
async def mock_finish(session_id: int, request: Request):
    form = await request.form()
    session = store.conn.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()
    if session is None:
        return page("finish", "<p>Session not found.</p>"), 404
    n = len(json.loads(session["question_ids"]))
    scores = []
    for i in range(n):
        raw = str(form.get(f"score_{i}", "")).strip()
        scores.append(max(1, min(5, int(raw))) if raw.isdigit() else 0)
    store.finish_session(session_id, scores, str(form.get("notes", "")))
    return page("finish", f"<h1>Session #{session_id} saved</h1><p>Self-scores recorded (your own estimates).</p>"
                "<p><a href='/'>Home</a></p>")


@app.post("/review/{question_id}")
async def review(question_id: int, request: Request):
    remembered = request.query_params.get("remembered", "1") == "1"
    result = store.schedule(question_id, remembered)
    return page("review", f"<h1>Review recorded</h1><p>Q{question_id} → box {result['box']}, "
                f"next due in {result['interval_days']} day(s).</p><p>{result['schedule_note']}</p><p><a href='/'>Home</a></p>")


@app.get("/review/due", response_class=HTMLResponse)
async def review_due():
    due = store.due()
    rows = "".join(f"<tr><td>{d['question_id']}</td><td>box {d['box']}</td><td>{d['due_at']}</td>"
                   f"<td><form method='post' action='/review/{d['question_id']}?remembered=1'><button>remembered</button></form></td>"
                   f"<td><form method='post' action='/review/{d['question_id']}?remembered=0'><button style='background:#9d6b6b'>needs work</button></form></td></tr>"
                   for d in due) or "<tr><td colspan=5>Nothing due — nothing overdue is hidden.</td></tr>"
    return page("due", f"<h1>Spaced review — due now</h1><table><tr><th>Q</th><th>box</th><th>due</th><th colspan=2>mark</th></tr>{rows}</table>")


@app.get("/api/health")
async def health():
    return {"ok": True, "app": "prepwise"}
