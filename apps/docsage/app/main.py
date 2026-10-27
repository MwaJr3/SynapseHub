"""FastAPI knowledge base: pages, citations, review status, search, import/export."""
from __future__ import annotations

import json

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from app.store import Store

app = FastAPI(title="DocSage", docs_url=None, redoc_url=None)
store = Store("docsage.db")

PAGE = """<!doctype html><html><head><meta charset="utf-8"><title>{title} · DocSage</title>
<style>
label{{display:block;margin:.35rem 0;font-size:.9rem}}label>input,label>select,label>textarea{{display:block;width:100%;margin-top:.15rem;box-sizing:border-box}}
:focus-visible{{outline:2px solid #14213d;outline-offset:2px}}
body{{font-family:Georgia,serif;max-width:48rem;margin:2rem auto;padding:0 1rem;color:#322f3d}}
a{{color:#7d5ba6}}table{{width:100%;border-collapse:collapse}}td,th{{border:1px solid #e2dcee;padding:.45rem;text-align:left}}
button,input,textarea,select{{padding:.5rem;border:1px solid #c4b8de;border-radius:6px}}button{{background:#7d5ba6;color:#fff;border:0;cursor:pointer}}
.badge{{background:#f0ebf7;padding:.15rem .5rem;border-radius:99px;font-size:.8rem}}.cite{{background:#f7f5fb;border-left:3px solid #7d5ba6;padding:.5rem;margin:.35rem 0;font-size:.9rem}}</style>
</head><body><header><strong><a href="/" style="color:#322f3d;text-decoration:none">DocSage</a></strong> · team knowledge base (demo workspace)</header>
<main>{body}</main><footer style="margin-top:2.5rem;font-size:.85rem;color:#5c6473">Internal knowledge base. Sources/citations are recorded with
each page; URLs must be on the configured allowlist. Search is offline keyword ranking (not semantic embeddings). Demo workspace with simulated content.</footer></body></html>"""


def page(title: str, body: str) -> HTMLResponse:
    return HTMLResponse(PAGE.format(title=title, body=body))


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    q = request.query_params.get("q", "")
    role = request.query_params.get("role", "member")
    if q:
        results = store.search(q, role)
        rows = "".join(f"<tr><td><a href='/page/{r['id']}'>{r['title']}</a></td><td>{r['status']}</td>"
                       f"<td>{r['visibility']}</td><td>{r['score']}</td><td>{r['snippet']}</td></tr>"
                       for r in results) or "<tr><td colspan=5>no results</td></tr>"
        body = f"<h1>Search: {q}</h1><table><tr><th scope='col'>title</th><th scope='col'>status</th><th scope='col'>visibility</th><th scope='col'>score</th><th scope='col'>snippet</th></tr>{rows}</table>"
    else:
        pages = store.conn.execute("SELECT * FROM pages ORDER BY id").fetchall()
        rows = "".join(f"<tr><td><a href='/page/{p['id']}'>{p['title']}</a></td><td>{p['status']}</td>"
                       f"<td>{p['visibility']}</td><td>{p['owner']}</td></tr>" for p in pages) or "<tr><td colspan=4>no pages</td></tr>"
        body = f"<h1>Pages</h1><table><tr><th scope='col'>title</th><th scope='col'>status</th><th scope='col'>visibility</th><th scope='col'>owner</th></tr>{rows}</table>"
    body += ("<form method='get' action='/'><label>Search<input name='q' placeholder='search (keyword ranking)' value='" + q + "'></label>"
             "<select name='role'><option value='member'>member</option><option value='admin'>admin</option></select>"
             "<button>Search</button></form>")
    body += "<p><a href='/page/new'>New page</a> · <a href='/export'>Export JSON</a> · <a href='/import'>Import JSON</a></p>"
    return page("home", body)


@app.get("/page/new", response_class=HTMLResponse)
async def new_form():
    return page("new", "<h1>New page</h1><form method='post' action='/page/new'>"
                "<label>Owner<input name='owner' placeholder='owner' required></label><label>Title<input name='title' placeholder='title' required></label>"
                "<textarea name='body' rows='8' placeholder='body' required></textarea>"
                "<select name='visibility'><option>team</option><option>restricted</option></select>"
                "<button>Create</button></form>")


@app.post("/page/new")
async def create(request: Request):
    form = await request.form()
    page_id = store.create_page(str(form.get("title", "")).strip() or "Untitled",
                                str(form.get("body", "")), str(form.get("owner", "anon")),
                                str(form.get("visibility", "team")))
    return RedirectResponse(f"/page/{page_id}", status_code=303)


@app.get("/page/{page_id}", response_class=HTMLResponse)
async def page_view(page_id: int):
    row = store.conn.execute("SELECT * FROM pages WHERE id=?", (page_id,)).fetchone()
    if row is None:
        return page("page", "<p>Not found.</p>"), 404
    cites = store.citations(page_id)
    cite_html = "".join(f"<div class='cite'>[{c['kind']}] <strong>{c['label']}</strong> — {c['locator']}</div>" for c in cites) \
        or "<p>No sources recorded.</p>"
    diffs = store.version_diff(page_id)
    body = (f"<h1>{row['title']}</h1><p><span class='badge'>{row['status']}</span> "
            f"<span class='badge'>{row['visibility']}</span> · owner {row['owner']}</p>"
            f"<p>{row['body']}</p><h2>Sources / citations</h2>{cite_html}"
            "<form method='post' action='/page/" + str(page_id) + "/source'>"
            "<label>Label<input name='label' placeholder='label' required></label><label>Locator or URL<input name='locator' placeholder='locator / URL' required></label>"
            "<select name='kind'><option>internal</option><option>configured-url</option></select>"
            "<button>Add source</button></form>")
    body += "<h2>Review status</h2><p>"
    for st in ("draft", "in_review", "published"):
        body += (f"<form style='display:inline' method='post' action='/page/{page_id}/status'>"
                 f"<input type='hidden' name='status' value='{st}'><label>Actor<input name='actor' value='reviewer' style='width:6rem'></label>"
                 f"<button>{st}</button></form> ")
    body += "</p><h2>Version history</h2><ol>" + "".join(
        f"<li>{d['saved_at']} — title changed: {d['title_changed']}, body Δ {d['body_delta_chars']:+d} chars</li>" for d in diffs) + "</ol>"
    body += f"<p><a href='/page/{page_id}/diff'>Diff JSON</a> · <a href='/'>Home</a></p>"
    return page("page", body)


@app.post("/page/{page_id}/source")
async def add_source(page_id: int, request: Request):
    form = await request.form()
    error = store.add_source(page_id, str(form.get("label", "")), str(form.get("locator", "")),
                             str(form.get("kind", "internal")))
    if error:
        resp = page("source rejected", f"<p>{error}</p><p><a href='/page/{page_id}'>Back</a></p>")
        resp.status_code = 422
        return resp
    return RedirectResponse(f"/page/{page_id}", status_code=303)


@app.post("/page/{page_id}/status")
async def set_status(page_id: int, request: Request):
    form = await request.form()
    try:
        store.set_status(page_id, str(form.get("status", "")), str(form.get("actor", "")))
    except ValueError as exc:
        resp = page("error", f"<p>{exc}</p><p><a href='/page/{page_id}'>Back</a></p>")
        resp.status_code = 422
        return resp
    return RedirectResponse(f"/page/{page_id}", status_code=303)


@app.get("/page/{page_id}/diff")
async def diff(page_id: int):
    return JSONResponse({"page_id": page_id, "versions_diff": store.version_diff(page_id),
                         "audit": [dict(r) for r in store.conn.execute(
                             "SELECT at, actor, action, detail FROM audit WHERE page_id=? ORDER BY id", (page_id,))]})


@app.get("/export")
async def export():
    return JSONResponse(json.loads(store.export_json()))


@app.get("/import", response_class=HTMLResponse)
async def import_form():
    return page("import", "<h1>Import knowledge base (JSON)</h1><form method='post' action='/import'>"
                "<textarea name='payload' rows='8' placeholder='{\"pages\": [{\"title\":..., \"body\":...}]}' required></textarea>"
                "<button>Import</button></form>")


@app.post("/import")
async def do_import(request: Request):
    form = await request.form()
    try:
        payload = json.loads(str(form.get("payload", "")))
        result = store.import_json(payload)
    except (ValueError, json.JSONDecodeError) as exc:
        return page("import", f"<p>Import rejected: {exc}</p>")
    body = f"<h1>Import result</h1><p>imported {result['imported']}, rejected {len(result['rejected'])}</p>"
    if result["rejected"]:
        body += "<ul>" + "".join(f"<li>{r['reason']}</li>" for r in result["rejected"]) + "</ul>"
    return page("import result", body + f"<p>{result['note']}</p><p><a href='/'>Home</a></p>")


@app.get("/api/health")
async def health():
    return {"ok": True, "app": "docsage"}
