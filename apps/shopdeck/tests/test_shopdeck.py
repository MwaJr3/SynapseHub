"""Tests: state machines, pricing audit, alerts, reports with data-quality flags."""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.pricing import PriceRule, PricingError, compute_total
from app.states import TransitionError, transition, ORDER_TRANSITIONS, INVENTORY_TRANSITIONS
from app.store import Store


def fresh(tmp_path):
    main.store = Store(str(tmp_path / "s.db"))
    main.store.add_product("SKU1", "Widget", 10.0, 20)
    main.store.add_product("SKU2", "Gadget", 25.0, 3)
    return TestClient(main.app)


def test_order_state_machine():
    assert transition("placed", "paid", ORDER_TRANSITIONS, ORDER_TRANSITIONS["placed"], "order") == "paid"
    with pytest.raises(TransitionError):
        transition("placed", "shipped", ORDER_TRANSITIONS, ORDER_TRANSITIONS["placed"], "order")
    with pytest.raises(TransitionError):
        transition("refunded", "paid", ORDER_TRANSITIONS, ORDER_TRANSITIONS["refunded"], "order")


def test_inventory_state_machine():
    with pytest.raises(TransitionError):
        transition("discontinued", "in_stock", INVENTORY_TRANSITIONS, INVENTORY_TRANSITIONS["discontinued"], "inventory")


def test_pricing_rules_and_guardrails():
    r = compute_total(50.0, 2, [PriceRule(code="SAVE10", percent_off=10, min_subtotal=80)])
    assert r["subtotal"] == 100.0 and r["total"] == 90.0
    assert r["applied"][0]["rule"] == "SAVE10"
    r2 = compute_total(10.0, 1, [PriceRule(code="BIG", percent_off=10, min_subtotal=80)])
    assert r2["total"] == 10.0 and r2["skipped"][0]["reason"].startswith("subtotal below")
    with pytest.raises(PricingError):
        PriceRule(code="X", percent_off=95)
    with pytest.raises(PricingError):
        compute_total(-1, 2, [])


def test_order_flow_with_audit_and_alerts(tmp_path):
    c = fresh(tmp_path)
    assert main.store.open_alerts() and "low_stock" in main.store.open_alerts()[0]["kind"]
    r = c.post("/order/new", data={"customer": "kim", "product_id": "1", "quantity": "2",
                                   "code": "SAVE10", "percent_off": "10"},
               follow_redirects=False)
    order_id = int(r.headers["location"].split("/")[2])
    r = c.post(f"/order/{order_id}/advance", data={"target": "paid"}, follow_redirects=False)
    assert r.status_code == 303
    r = c.post(f"/order/{order_id}/advance", data={"target": "delivered"})
    assert r.status_code == 409                       # illegal jump paid -> delivered
    r = c.post(f"/order/{order_id}/advance", data={"target": "packed"}, follow_redirects=False)
    assert r.status_code == 303
    audit = main.store.conn.execute("SELECT payload FROM price_audit WHERE order_id=?", (order_id,)).fetchone()
    payload = json.loads(audit["payload"])
    assert payload["total"] == 18.0                   # 20 - 10%
    assert payload["audit"]["inputs"]["quantity"] == 2


def test_sales_report_flags(tmp_path):
    c = fresh(tmp_path)
    c.post("/order/new", data={"customer": "a", "product_id": "1", "quantity": "1"})
    # order with no lines -> flagged
    main.store.conn.execute("INSERT INTO orders(created_at, customer, total) VALUES ('2026-01-01','x',0)")
    main.store.conn.commit()
    r = c.get("/report")
    assert "Data-quality flags" in r.text and "no lines" in r.text
    report = main.store.sales_report()
    assert "counts only shipped/delivered" in report["note"]
