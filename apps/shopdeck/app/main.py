"""FastAPI admin dashboard: products, orders, alerts, reports."""
from __future__ import annotations

import json

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from app.pricing import PriceRule, PricingError
from app.states import TransitionError
from app.store import Store

app = FastAPI(title="ShopDeck", docs_url=None, redoc_url=None)
store = Store("shopdeck.db")

PAGE = """<!doctype html><html><head><meta charset="utf-8"><title>{title} · ShopDeck</title>
<style>body{{font-family:system-ui,sans-serif;max-width:52rem;margin:2rem auto;padding:0 1rem;color:#1d3557}}
a{{color:#457b9d}}table{{width:100%;border-collapse:collapse}}td,th{{border:1px solid #d7e3ef;padding:.45rem;text-align:left}}
button,input,select{{padding:.5rem;border:1px solid #a8c6df;border-radius:6px}}button{{background:#1d3557;color:#fff;border:0;cursor:pointer}}
.badge{{background:#eef4f8;padding:.15rem .5rem;border-radius:99px;font-size:.8rem}}.alert{{background:#fff3cd;padding:.55rem;border-radius:6px;margin:.35rem 0}}</style>
</head><body><header><strong><a href="/" style="color:#1d3557;text-decoration:none">ShopDeck</a></strong> · e-commerce operations (demo catalog)</header>
<main>{body}</main><footer style="margin-top:2.5rem;font-size:.85rem;color:#6c7f93">Demo catalog with simulated data. Order and inventory
states are explicit state machines; prices carry an audit trail; reports flag data-quality issues instead of hiding them.</footer></body></html>"""


def page(title: str, body: str) -> HTMLResponse:
    return HTMLResponse(PAGE.format(title=title, body=body))


@app.get("/", response_class=HTMLResponse)
async def index():
    products = store.conn.execute("SELECT * FROM products ORDER BY sku").fetchall()
    alerts = store.open_alerts()
    body = "<h1>Catalog</h1>"
    body += "".join(f"<div class='alert'>⚠ {a['message']}</div>" for a in alerts)
    rows = "".join(f"<tr><td>{p['sku']}</td><td>{p['name']}</td><td>{p['unit_price']:.2f}</td>"
                   f"<td>{p['stock']}</td><td><span class='badge'>{p['inv_state']}</span></td>"
                   f"<td><form method='post' action='/product/{p['id']}/stock'>"
                   f"<input name='stock' type='number' style='width:5rem' value='{p['stock']}'>"
                   f"<button>update</button></form></td></tr>" for p in products)
    body += ("<table><tr><th>SKU</th><th>name</th><th>price</th><th>stock</th><th>state</th><th>set stock</th></tr>"
             f"{rows}</table>")
    body += ("<h2>New product</h2><form method='post' action='/product/new'>"
             "<input name='sku' placeholder='SKU' required><input name='name' placeholder='name' required>"
             "<input name='unit_price' type='number' step='0.01' placeholder='price' required>"
             "<input name='stock' type='number' placeholder='stock' required>"
             "<input name='threshold' type='number' value='5' placeholder='low-stock threshold'>"
             "<button>Add</button></form>")
    body += ("<h2>New order</h2><form method='post' action='/order/new'>"
             "<input name='customer' placeholder='customer' required>"
             "<input name='product_id' type='number' placeholder='product id' required>"
             "<input name='quantity' type='number' placeholder='qty' required>"
             "<input name='code' placeholder='discount code (optional)'>"
             "<input name='percent_off' type='number' step='0.1' placeholder='% off (optional)'>"
             "<button>Create order</button></form>")
    body += "<p><a href='/report'>Sales report</a></p>"
    return page("home", body)


@app.post("/product/new")
async def new_product(request: Request):
    form = await request.form()
    store.add_product(str(form.get("sku", "")).strip(), str(form.get("name", "")).strip(),
                      float(str(form.get("unit_price", "0"))), int(str(form.get("stock", "0"))),
                      int(str(form.get("threshold", "5"))))
    return RedirectResponse("/", status_code=303)


@app.post("/product/{product_id}/stock")
async def set_stock(product_id: int, request: Request):
    form = await request.form()
    try:
        store.set_stock(product_id, int(str(form.get("stock", "0"))))
    except (TransitionError, ValueError) as exc:
        resp = page("error", f"<p>{exc}</p><p><a href='/'>Back</a></p>")
        resp.status_code = 409
        return resp
    return RedirectResponse("/", status_code=303)


@app.post("/order/new")
async def new_order(request: Request):
    form = await request.form()
    rules = []
    if str(form.get("code", "")).strip():
        try:
            rules.append(PriceRule(code=str(form.get("code")), percent_off=float(str(form.get("percent_off") or 0))))
        except PricingError as exc:
            resp = page("error", f"<p>Pricing rejected: {exc}</p><p><a href='/'>Back</a></p>")
            resp.status_code = 422
            return resp
    try:
        order_id = store.create_order(str(form.get("customer", "anon")),
                                      [(int(str(form.get("product_id"))), int(str(form.get("quantity"))))], rules)
    except ValueError as exc:
        resp = page("error", f"<p>{exc}</p><p><a href='/'>Back</a></p>")
        resp.status_code = 422
        return resp
    return RedirectResponse(f"/order/{order_id}", status_code=303)


@app.get("/order/{order_id}", response_class=HTMLResponse)
async def order_page(order_id: int):
    order = store.conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
    if order is None:
        return page("order", "<p>Not found.</p>"), 404
    audit = json.loads(order["audit"] or "[]")
    audit = audit if isinstance(audit, list) else []
    lines = store.conn.execute("SELECT * FROM order_lines WHERE order_id=?", (order_id,)).fetchall()
    body = (f"<h1>Order #{order_id}</h1><p>state: <span class='badge'>{order['state']}</span> · "
            f"customer {order['customer']} · total {order['total']:.2f}</p><ul>" +
            "".join(f"<li>product {l['product_id']} × {l['quantity']} @ {l['unit_price']:.2f}</li>" for l in lines) + "</ul>")
    body += "<h2>Transitions</h2><p>"
    for target in ("paid", "packed", "shipped", "delivered", "cancelled", "refunded"):
        body += f"<form style='display:inline' method='post' action='/order/{order_id}/advance'><input type='hidden' name='target' value='{target}'><button>{target}</button></form> "
    body += "</p><h2>Audit trail</h2><ol>" + "".join(f"<li>{a['from']} → {a['to']} at {a['at']}</li>" for a in audit) + "</ol>"
    body += f"<p><a href='/'>Home</a> · <a href='/order/{order_id}/audit'>Audit JSON</a></p>"
    return page(f"order {order_id}", body)


@app.post("/order/{order_id}/advance")
async def advance(order_id: int, request: Request):
    form = await request.form()
    try:
        store.advance_order(order_id, str(form.get("target", "")))
    except TransitionError as exc:
        resp = page("error", f"<p>{exc}</p><p><a href='/order/{order_id}'>Back</a></p>")
        resp.status_code = 409
        return resp
    return RedirectResponse(f"/order/{order_id}", status_code=303)


@app.get("/order/{order_id}/audit")
async def order_audit(order_id: int):
    row = store.conn.execute("SELECT * FROM price_audit WHERE order_id=? ORDER BY id DESC LIMIT 1", (order_id,)).fetchone()
    return JSONResponse({"order_id": order_id,
                         "pricing": json.loads(row["payload"]) if row else None})


@app.get("/report", response_class=HTMLResponse)
async def report():
    r = store.sales_report()
    flags = "".join(f"<li>{f}</li>" for f in r["data_quality_flags"]) or "<li>none</li>"
    return page("report", f"<h1>Sales report</h1><p>orders: {r['orders_total']} · "
                f"shipped/delivered: {r['shipped_or_delivered']} · gross revenue (completed): {r['gross_revenue_completed']:.2f}</p>"
                f"<h2>Data-quality flags</h2><ul>{flags}</ul><p>{r['note']}</p><p><a href='/'>Home</a></p>")


@app.get("/api/health")
async def health():
    return {"ok": True, "app": "shopdeck"}
