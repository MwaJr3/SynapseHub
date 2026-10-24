"""FastAPI dashboard: posts, review workflow, version history, calendar."""
from __future__ import annotations

import json

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from app.states import WorkflowError
from app.store import Store

app = FastAPI(title="CreateDesk", docs_url=None, redoc_url=None)
store = Store("creadesk.db")

PAGE = """<!doctype html><html><head><meta charset="utf-8"><title>{title} · CreateDesk</title>
<style>body{{font-family:system-ui,sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem;color:#22333b}}
a{{color:#0a6c74}}table{{width:100%;border-collapse:collapse}}td,th{{border:1px solid #d6e2e4;padding:.45rem;text-align:left}}
button,input,textarea,select{{padding:.5rem;border:1px solid #9fbfc3;border-radius:6px}}button{{background:#0a6c74;color:#fff;border:0;cursor:pointer}}
.badge{{background:#e7f0f1;padding:.15rem .5rem;border-radius:99px;font-size:.8rem}}.warn{{background:#fff3cd;padding:.55rem;border-radius:6px;margin:.4rem 0}}</style>
</head><body><header><strong><a href="/" style="color:#22333b;text-decoration:none">CreateDesk</a></strong> · content pipeline (demo workspace)</header>
<main>{body}</main><footer style="margin-top:2.5rem;font-size:.85rem;color:#60757c">Editorial states are enforced: draft → in_review → approved →
published → archived, with role rights (authors submit, reviewers approve, editors publish). External links must be on the configured allowlist.
Demo workspace with simulated content.</footer></body></html>"""


def page(title: str, body: str) -> HTMLResponse:
    return HTMLResponse(PAGE.format(title=title, body=body))


@app.get("/", response_class=HTMLResponse)
async def index():
    posts = store.conn.execute("SELECT * FROM posts ORDER BY id").fetchall()
    rows = "".join(f"<tr><td><a href='/post/{p['id']}'>{p['title']}</a></td><td>{p['author']}</td>"
                   f"<td><span class='badge'>{p['state']}</span></td><td>{p['scheduled_at'] or '—'}</td></tr>"
                   for p in posts) or "<tr><td colspan=4>no posts</td></tr>"
    return page("home", f"<h1>Posts</h1><table><tr><th>title</th><th>author</th><th>state</th><th>scheduled</th></tr>{rows}</table>"
                "<p><a href='/post/new'>New post</a> · <a href='/calendar'>Calendar</a></p>")


@app.get("/post/new", response_class=HTMLResponse)
async def new_form():
    return page("new", "<h1>New post</h1><form method='post' action='/post/new'>"
                "<input name='author' placeholder='author' required>"
                "<input name='title' placeholder='title' required>"
                "<textarea name='body' placeholder='body (>= 40 chars)' rows='8' required></textarea>"
                "<button>Create draft</button></form>")


@app.post("/post/new")
async def create(request: Request):
    form = await request.form()
    from app.validate import check_content
    title, body = str(form.get("title", "")), str(form.get("body", ""))
    problems = check_content(title, body)
    if problems:
        return page("new", "<h1>New post</h1>" + "".join(f"<div class='warn'>{p}</div>" for p in problems) +
                    "<p><a href='/post/new'>Try again</a></p>")
    post_id = store.create(title, body, str(form.get("author", "anon")))
    return RedirectResponse(f"/post/{post_id}", status_code=303)


@app.get("/post/{post_id}", response_class=HTMLResponse)
async def post_page(post_id: int):
    post = store.conn.execute("SELECT * FROM posts WHERE id=?", (post_id,)).fetchone()
    if post is None:
        return page("post", "<p>Not found.</p>"), 404
    diffs = store.diff(post_id)
    body = (f"<h1>{post['title']}</h1><p><span class='badge'>{post['state']}</span> by {post['author']} · "
            f"scheduled: {post['scheduled_at'] or '—'}</p><p>{post['body'][:400]}</p>")
    body += "<h2>Workflow</h2><p>"
    for target, role in (("in_review", "author"), ("draft", "reviewer"), ("approved", "reviewer"),
                         ("published", "editor"), ("archived", "editor")):
        body += (f"<form style='display:inline' method='post' action='/post/{post_id}/move'>"
                 f"<input type='hidden' name='target' value='{target}'><input type='hidden' name='role' value='{role}'>"
                 f"<input name='actor' placeholder='actor' value='{role}' style='width:6rem'>"
                 f"<button>{target} ({role})</button></form> ")
    body += "</p><h2>Schedule</h2><form method='post' action='/post/{post_id}/schedule'>" \
            "<input name='when' placeholder='YYYY-MM-DDTHH:MM'><button>Set schedule</button></form>"
    body += "<h2>Version history</h2><ol>" + "".join(
        f"<li>{d['saved_at']} — {d['note']}: title changed: {d['title_changed']}, body {d['body_chars_before']}→{d['body_chars_after']} chars ({d['added']:+d})</li>"
        for d in diffs) + "</ol>"
    body += f"<p><a href='/post/{post_id}/history'>History JSON</a> · <a href='/'>Home</a></p>"
    return page("post", body)


@app.post("/post/{post_id}/move")
async def move(post_id: int, request: Request):
    form = await request.form()
    try:
        store.move(post_id, str(form.get("target", "")), str(form.get("role", "")), str(form.get("actor", "")))
    except (WorkflowError, ValueError) as exc:
        resp = page("error", f"<p>{exc}</p><p><a href='/post/{post_id}'>Back</a></p>")
        resp.status_code = 409
        return resp
    return RedirectResponse(f"/post/{post_id}", status_code=303)


@app.post("/post/{post_id}/schedule")
async def schedule(post_id: int, request: Request):
    form = await request.form()
    problems = store.schedule(post_id, str(form.get("when", "")))
    if problems:
        return page("error", "<p>" + "; ".join(problems) + "</p><p><a href='/post/" + str(post_id) + "'>Back</a></p>")
    return RedirectResponse(f"/post/{post_id}", status_code=303)


@app.get("/post/{post_id}/history")
async def history(post_id: int):
    return JSONResponse({"post_id": post_id, "diffs": store.diff(post_id)})


@app.get("/calendar", response_class=HTMLResponse)
async def calendar():
    rows = "".join(f"<tr><td>{c['scheduled_at']}</td><td>{c['title']}</td><td>{c['state']}</td></tr>"
                   for c in store.calendar()) or "<tr><td colspan=3>nothing scheduled</td></tr>"
    return page("calendar", f"<h1>Editorial calendar</h1><table><tr><th>when</th><th>title</th><th>state</th></tr>{rows}</table>")


@app.get("/api/health")
async def health():
    return {"ok": True, "app": "creadesk"}
