"""FastAPI app: create quizzes, take attempts (shuffled, seeded), leaderboards."""
from __future__ import annotations

import secrets
import time

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from app.bank import BankError, export_bank, validate_bank
from app.store import Store, shuffled_order

app = FastAPI(title="QuizArena", docs_url=None, redoc_url=None)
store = Store("quizarena.db")

PAGE = """<!doctype html><html><head><meta charset="utf-8"><title>{title} · QuizArena</title>
<style>body{{font-family:system-ui,sans-serif;max-width:52rem;margin:2rem auto;padding:0 1rem;color:#22223b}}
a{{color:#5c4d9b}}table{{width:100%;border-collapse:collapse}}td,th{{border:1px solid #e2e0f2;padding:.45rem;text-align:left}}
button,input,textarea,select{{padding:.5rem;border:1px solid #c9c4ec;border-radius:6px}}button{{background:#5c4d9b;color:#fff;border:0;cursor:pointer}}
.badge{{background:#eee;padding:.15rem .5rem;border-radius:99px;font-size:.8rem}}.warn{{background:#fff3cd;padding:.55rem;border-radius:6px}}</style>
</head><body><header><strong><a href="/" style="color:#22223b;text-decoration:none">QuizArena</a></strong> · collaborative quiz platform (demo data)</header>
<main>{body}</main><footer style="margin-top:2.5rem;font-size:.85rem;color:#7a7793">Demo instance with simulated content.
Attempts are reproducible from their recorded seed. Leaderboard: best score, then fastest time.</footer></body></html>"""


def page(title: str, body: str) -> HTMLResponse:
    return HTMLResponse(PAGE.format(title=title, body=body))


@app.get("/", response_class=HTMLResponse)
async def index():
    rows = store.conn.execute("SELECT * FROM quizzes ORDER BY id").fetchall()
    items = "".join(f"<li><a href='/quiz/{r['id']}'>{r['title']}</a> <span class='badge'>{r['author']}</span></li>"
                    for r in rows) or "<li>no quizzes yet</li>"
    return page("home", f"<h1>Quizzes</h1><ul>{items}</ul>"
                "<p><a href='/quiz/new'>Create quiz</a> · <a href='/bank/import'>Import bank</a></p>")


@app.get("/quiz/new", response_class=HTMLResponse)
async def new_quiz_form():
    return page("new quiz", "<h1>Create quiz</h1><form method='post' action='/quiz/new'>"
                "<input name='title' placeholder='title' required>"
                "<input name='author' placeholder='author' required>"
                "<textarea name='description' placeholder='description'></textarea>"
                "<button>Create</button></form>")


@app.post("/quiz/new")
async def new_quiz(request: Request):
    form = await request.form()
    quiz_id = store.create_quiz(str(form.get("title", "Untitled")).strip(),
                                str(form.get("description", "")), str(form.get("author", "anon")))
    return RedirectResponse(f"/quiz/{quiz_id}/add", status_code=303)


@app.get("/quiz/{quiz_id}/add", response_class=HTMLResponse)
async def add_question_form(quiz_id: int):
    return page("add question", f"<h1>Add question</h1><form method='post' action='/quiz/{quiz_id}/add'>"
                "<textarea name='prompt' placeholder='prompt' required></textarea>"
                "<input name='opt0' placeholder='option 1' required><input name='opt1' placeholder='option 2' required>"
                "<input name='opt2' placeholder='option 3'><input name='opt3' placeholder='option 4'>"
                "<select name='answer_index'><option>0</option><option>1</option><option>2</option><option>3</option></select>"
                "<input name='explanation' placeholder='explanation (shown after submit)'>"
                "<select name='difficulty'><option>easy</option><option selected>medium</option><option>hard</option></select>"
                "<button>Add question</button></form><p><a href='/quiz/{quiz_id}'>Done — view quiz</a></p>")


@app.post("/quiz/{quiz_id}/add")
async def add_question(quiz_id: int, request: Request):
    form = await request.form()
    options = [str(form.get(f"opt{i}", "")).strip() for i in range(4)]
    options = [o for o in options if o]
    if len(options) < 2:
        return page("add question", "<p>Need at least 2 non-empty options.</p>")
    answer_index = int(str(form.get("answer_index", "0")))
    if answer_index >= len(options):
        answer_index = 0
    store.add_question(quiz_id, str(form.get("prompt", "")).strip(), options, answer_index,
                       str(form.get("explanation", "")), str(form.get("difficulty", "medium")))
    return RedirectResponse(f"/quiz/{quiz_id}/add", status_code=303)


@app.get("/quiz/{quiz_id}", response_class=HTMLResponse)
async def quiz_page(quiz_id: int):
    quiz = store.conn.execute("SELECT * FROM quizzes WHERE id=?", (quiz_id,)).fetchone()
    if quiz is None:
        return page("not found", "<p>Quiz not found.</p>"), 404
    qs = store.questions(quiz_id)
    body = (f"<h1>{quiz['title']}</h1><p>{quiz['description']}</p>"
            f"<p><span class='badge'>{len(qs)} questions</span> <a href='/quiz/{quiz_id}/take'>Take the quiz</a> · "
            f"<a href='/quiz/{quiz_id}/leaderboard'>Leaderboard</a> · "
            f"<a href='/quiz/{quiz_id}/export'>Export bank</a></p>")
    for q in qs:
        body += f"<p>Q{q['id']}: {q['prompt']} <span class='badge'>{q['difficulty']}</span> " \
                f"<form style='display:inline' method='post' action='/question/{q['id']}/report'>" \
                f"<button style='background:#9d6b6b;font-size:.75rem'>report</button></form></p>"
    return page(quiz["title"], body)


@app.post("/question/{question_id}/report")
async def report_question(question_id: int):
    store.report_question(question_id)
    return RedirectResponse("/", status_code=303)


@app.get("/quiz/{quiz_id}/take", response_class=HTMLResponse)
async def take_quiz(quiz_id: int, request: Request):
    qs = store.questions(quiz_id)
    if not qs:
        return page("take", "<p>No questions available.</p>")
    seed = request.query_params.get("seed") or secrets.token_hex(8)
    order = shuffled_order(len(qs), seed)
    rows = "".join(
        f"<fieldset><legend>Q{i+1}. {qs[idx]['prompt']}</legend>" +
        "".join(f"<label><input type='radio' name='q{idx}' value='{j}'> {opt}</label><br>"
                for j, opt in enumerate(json_opts(qs[idx]))) +
        "</fieldset><br>"
        for i, idx in enumerate(order))
    return page("take quiz", f"<form method='post' action='/quiz/{quiz_id}/submit'>"
                f"<input type='hidden' name='seed' value='{seed}'><input name='player' placeholder='your name' required>"
                f"{rows}<button>Submit</button></form>")


def json_opts(q):
    import json as _json
    return _json.loads(q["options"])


@app.post("/quiz/{quiz_id}/submit")
async def submit_quiz(quiz_id: int, request: Request):
    form = await request.form()
    qs = store.questions(quiz_id)
    seed = str(form.get("seed", "seed"))
    player = str(form.get("player", "anon")).strip() or "anon"
    answers, correct = [], 0
    explanations = []
    for i, q in enumerate(qs):
        raw = form.get(f"q{i}")
        given = int(raw) if raw is not None else -1
        answers.append(given)
        if given == q["answer_index"]:
            correct += 1
        elif q["explanation"]:
            explanations.append(f"{q['prompt'][:40]}: {q['explanation']}")
    score = correct
    store.record_attempt(quiz_id, player, seed, answers, score, len(qs))
    body = f"<h1>Result</h1><p>{player}: <strong>{correct}/{len(qs)}</strong> (seed <code>{seed}</code>)</p>"
    if explanations:
        body += "<h2>Review</h2><ul>" + "".join(f"<li>{e}</li>" for e in explanations) + "</ul>"
    body += f"<p><a href='/quiz/{quiz_id}/leaderboard'>Leaderboard</a> · <a href='/quiz/{quiz_id}'>Back</a></p>"
    return page("result", body)


@app.get("/quiz/{quiz_id}/leaderboard", response_class=HTMLResponse)
async def leaderboard(quiz_id: int):
    board = store.leaderboard(quiz_id)
    rows = "".join(f"<tr><td>{b['rank']}</td><td>{b['player']}</td><td>{b['score_percent']}%</td>"
                   f"<td>{b['best_time_seconds']}</td></tr>" for b in board) or "<tr><td colspan=4>no attempts</td></tr>"
    return page("leaderboard", f"<h1>Leaderboard</h1><table><tr><th>#</th><th>player</th><th>best score</th><th>best time</th></tr>{rows}</table>"
                f"<p>Tie-break: higher score first, then lower completion time.</p><p><a href='/quiz/{quiz_id}'>Back</a></p>")


@app.get("/quiz/{quiz_id}/export")
async def export(quiz_id: int):
    qs = store.questions(quiz_id)
    return JSONResponse({"quiz_id": quiz_id, "bank": __import__("json").loads(export_bank(qs))},
                        headers={"Content-Disposition": f"attachment; filename=quiz-{quiz_id}.json"})


@app.get("/bank/import", response_class=HTMLResponse)
async def import_form():
    return page("import", "<h1>Import quiz bank (JSON)</h1><form method='post' action='/bank/import'>"
                "<input name='title' placeholder='quiz title' required>"
                "<textarea name='payload' placeholder='{\"questions\": [...]}' required></textarea>"
                "<button>Import</button></form>")


@app.post("/bank/import")
async def import_bank(request: Request):
    form = await request.form()
    import json as _json
    try:
        payload = _json.loads(str(form.get("payload", "")))
        valid, invalid = validate_bank(payload)
    except (BankError, ValueError) as exc:
        return page("import", f"<p>Import rejected: {exc}</p>")
    quiz_id = store.create_quiz(str(form.get("title", "Imported bank")).strip(), "Imported quiz bank", "importer")
    for row in valid:
        opts = [str(o) for o in row["options"]]
        store.add_question(quiz_id, str(row["prompt"]).strip(), opts, int(row["answer_index"]),
                           str(row.get("explanation", "")), str(row.get("difficulty", "medium")),
                           str(row.get("tags", "")))
    body = f"<h1>Import result</h1><p>Imported <strong>{len(valid)}</strong> questions; " \
           f"<strong>{len(invalid)}</strong> rejected (reasons below — nothing dropped silently).</p>"
    if invalid:
        body += "<ul>" + "".join(f"<li>#{inv['index']}: {'; '.join(inv['reasons'])}</li>" for inv in invalid) + "</ul>"
    body += f"<p><a href='/quiz/{quiz_id}'>View quiz</a></p>"
    return page("import result", body)


@app.get("/moderation", response_class=HTMLResponse)
async def moderation():
    rows = store.reported_questions()
    body = "<h1>Moderation queue</h1>"
    if not rows:
        body += "<p>No reported questions.</p>"
    for r in rows:
        body += (f"<p>Q{r['id']}: {r['prompt'][:60]} <form style='display:inline' method='post' action='/moderation/{r['id']}/restore'>"
                 f"<button>restore</button></form> <form style='display:inline' method='post' action='/moderation/{r['id']}/remove'>"
                 f"<button style='background:#9d6b6b'>remove</button></form></p>")
    return page("moderation", body)


@app.post("/moderation/{question_id}/{action}")
async def moderate(question_id: int, action: str):
    store.moderate(question_id, action)
    return RedirectResponse("/moderation", status_code=303)
