"""FastAPI inventory dashboard: items, movements, ledger, alerts, reports."""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from app.store import Store

app = FastAPI(title="StockMate", docs_url=None, redoc_url=None)
store = Store("stockmate.db")

PAGE = """<!doctype html><html><head><meta charset="utf-8"><title>{title} · StockMate</title>
<style>
label{{display:block;margin:.35rem 0;font-size:.9rem}}label>input,label>select,label>textarea{{display:block;width:100%;margin-top:.15rem;box-sizing:border-box}}
:focus-visible{{outline:2px solid #14213d;outline-offset:2px}}
body{{font-family:system-ui,sans-serif;max-width:52rem;margin:2rem auto;padding:0 1rem;color:#2d3436}}
a{{color:#2e7d6f}}table{{width:100%;border-collapse:collapse}}td,th{{border:1px solid #d3dedd;padding:.45rem;text-align:left}}
button,input,select{{padding:.5rem;border:1px solid #a9c9c2;border-radius:6px}}button{{background:#2e7d6f;color:#fff;border:0;cursor:pointer}}
.badge{{background:#e8f2f0;padding:.15rem .5rem;border-radius:99px;font-size:.8rem}}.alert{{background:#fff3cd;padding:.55rem;border-radius:6px;margin:.35rem 0}}</style>
</head><body><header><strong><a href="/" style="color:#2d3436;text-decoration:none">StockMate</a></strong> · inventory with audit trail (demo warehouse)</header>
<main>{body}</main><footer style="margin-top:2.5rem;font-size:.85rem;color:#5c6473">Stock changes are an immutable ledger — corrections are reversing
entries. Demand figures are labelled ESTIMATE with assumptions. Role permissions are enforced server-side. Demo warehouse with simulated data.</footer></body></html>"""


def page(title: str, body: str) -> HTMLResponse:
    return HTMLResponse(PAGE.format(title=title, body=body))


@app.get("/", response_class=HTMLResponse)
async def index():
    items = store.conn.execute("SELECT * FROM items ORDER BY sku").fetchall()
    alerts = store.conn.execute("SELECT * FROM alerts WHERE resolved=0 ORDER BY id").fetchall()
    body = "".join(f"<div class='alert'>⚠ {a['message']}</div>" for a in alerts)
    rows = "".join(f"<tr><td><a href='/item/{p['id']}'>{p['sku']}</a></td><td>{p['name']}</td>"
                   f"<td>{p['on_hand']}</td><td>{p['reorder_level']}</td><td>{p['unit_cost']:.2f}</td>"
                   f"<td><span class='badge'>{'archived' if p['archived'] else 'active'}</span></td></tr>" for p in items)
    body += ("<h1>Items</h1><table><tr><th scope='col'>SKU</th><th scope='col'>name</th><th scope='col'>on hand</th><th scope='col'>reorder</th><th scope='col'>unit cost</th><th scope='col'>state</th></tr>"
             f"{rows}</table>")
    body += ("<h2>Add item</h2><form method='post' action='/item/new'><label>SKU<input name='sku' placeholder='SKU' required></label>"
             "<label>Name<input name='name' placeholder='name' required></label><label>Unit cost<input name='unit_cost' type='number' step='0.01' placeholder='unit cost' required></label>"
             "<label>Reorder level<input name='reorder_level' type='number' value='5'></label><button>Add</button></form>")
    body += "<p><a href='/report'>Valuation &amp; demand report</a></p>"
    return page("home", body)


@app.post("/item/new")
async def new_item(request: Request):
    form = await request.form()
    store.add_item(str(form.get("sku", "")).strip(), str(form.get("name", "")).strip(),
                   float(str(form.get("unit_cost", "0"))), int(str(form.get("reorder_level", "5"))))
    return RedirectResponse("/", status_code=303)


@app.get("/item/{item_id}", response_class=HTMLResponse)
async def item_page(item_id: int):
    item = store.conn.execute("SELECT * FROM items WHERE id=?", (item_id,)).fetchone()
    if item is None:
        return page("item", "<p>Not found.</p>"), 404
    ledger = store.ledger(item_id)
    rows = "".join(f"<tr><td>{m['id']}</td><td>{m['at']}</td><td>{m['kind']}</td><td>{m['quantity']}</td>"
                   f"<td>{m['actor']}</td><td>{m['note'] or ('reverses #' + str(m['reverses']) if m['reverses'] else '')}</td></tr>"
                   for m in ledger)
    body = (f"<h1>{item['name']} <span class='badge'>{item['sku']}</span></h1>"
            f"<p>on hand: <strong>{item['on_hand']}</strong> · reorder level {item['reorder_level']}</p>")
    body += ("<h2>New movement</h2><form method='post' action='/item/" + str(item_id) + "/move'>"
             "<select name='kind'><option>receive</option><option>issue</option><option>adjust</option></select>"
             "<label>Quantity<input name='quantity' type='number' placeholder='quantity'></label><label>Actor<input name='actor' placeholder='actor' value='clerk'></label>"
             "<select name='role'><option>clerk</option><option>manager</option><option>viewer</option></select>"
             "<label>Note<input name='note' placeholder='note'></label><button>Record movement</button></form>")
    body += f"<h2>Immutable ledger</h2><table><tr><th scope='col'>#</th><th scope='col'>at</th><th scope='col'>kind</th><th scope='col'>qty</th><th scope='col'>actor</th><th scope='col'>note</th></tr>{rows}</table>"
    body += ("<h2>Reverse a movement</h2><form method='post' action='/reverse'>"
             "<label>Movement ID<input name='movement_id' type='number' placeholder='movement id'></label><label>Actor<input name='actor' value='manager'></label>"
             "<select name='role'><option>manager</option><option>clerk</option></select><button>Reverse</button></form>")
    body += f"<p><a href='/item/{item_id}/forecast'>Demand estimate</a> · <a href='/'>Home</a></p>"
    return page("item", body)


@app.post("/item/{item_id}/move")
async def move(item_id: int, request: Request):
    form = await request.form()
    try:
        store.move(item_id, str(form.get("kind", "")), int(str(form.get("quantity", "0"))),
                   str(form.get("actor", "")), str(form.get("role", "")), str(form.get("note", "")))
    except (PermissionError, ValueError) as exc:
        resp = page("error", f"<p>{exc}</p><p><a href='/item/{item_id}'>Back</a></p>")
        resp.status_code = 403 if isinstance(exc, PermissionError) else 422
        return resp
    return RedirectResponse(f"/item/{item_id}", status_code=303)


@app.post("/reverse")
async def reverse(request: Request):
    form = await request.form()
    try:
        result = store.reverse_movement(int(str(form.get("movement_id", "0"))),
                                        str(form.get("actor", "")), str(form.get("role", "")))
    except (PermissionError, ValueError) as exc:
        resp = page("error", f"<p>{exc}</p><p><a href='/'>Home</a></p>")
        resp.status_code = 403 if isinstance(exc, PermissionError) else 422
        return resp
    return RedirectResponse(f"/item/{result['item_id']}", status_code=303)


@app.get("/item/{item_id}/forecast")
async def forecast(item_id: int):
    return JSONResponse(store.demand_forecast(item_id))


@app.get("/report", response_class=HTMLResponse)
async def report():
    v = store.valuation()
    return page("report", f"<h1>Valuation</h1><p>items: {v['items']} · value at cost: {v['inventory_value_at_cost']:.2f}</p>"
                f"<p>{v['basis']}</p><p>{v['note']}</p><p><a href='/'>Home</a></p>")


@app.get("/api/health")
async def health():
    return {"ok": True, "app": "stockmate"}
