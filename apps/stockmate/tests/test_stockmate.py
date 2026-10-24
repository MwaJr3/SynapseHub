"""Tests: ledger immutability, roles, negative-stock guard, reversal, estimates."""
from __future__ import annotations

import pytest

from app.store import Store


def store_with_item(tmp_path):
    store = Store(str(tmp_path / "st.db"))
    item_id = store.add_item("SKU1", "Widget", 2.5, reorder_level=5)
    return store, item_id


def test_receive_issue_and_negative_guard(tmp_path):
    store, item = store_with_item(tmp_path)
    store.move(item, "receive", 10, "kim", "clerk")
    store.move(item, "issue", 3, "kim", "clerk")
    with pytest.raises(ValueError, match="negative"):
        store.move(item, "issue", 100, "kim", "clerk")
    assert store.conn.execute("SELECT on_hand FROM items").fetchone()[0] == 7


def test_role_permissions(tmp_path):
    store, item = store_with_item(tmp_path)
    with pytest.raises(PermissionError):
        store.move(item, "receive", 5, "vic", "viewer")
    with pytest.raises(PermissionError):
        store.move(item, "adjust", 5, "kim", "clerk")     # clerk cannot adjust
    store.move(item, "adjust", 5, "mgr", "manager")       # manager can


def test_ledger_immutable_with_reversal(tmp_path):
    store, item = store_with_item(tmp_path)
    r1 = store.move(item, "receive", 10, "kim", "clerk")
    r2 = store.reverse_movement(r1["movement_id"], "mgr", "manager")
    ledger = store.ledger(item)
    assert len(ledger) == 2                       # original kept; reversal appended
    assert ledger[1]["kind"] == "reverse" and ledger[1]["reverses"] == r1["movement_id"]
    assert store.conn.execute("SELECT on_hand FROM items").fetchone()[0] == 0
    with pytest.raises(ValueError, match="reversal"):
        store.reverse_movement(r2["movement_id"], "mgr", "manager")


def test_reorder_alert(tmp_path):
    store, item = store_with_item(tmp_path)
    store.move(item, "receive", 4, "kim", "clerk")        # 4 <= reorder level 5
    alerts = store.conn.execute("SELECT * FROM alerts").fetchall()
    assert alerts and "reorder" in alerts[0]["kind"]


def test_demand_forecast_labelled_estimate(tmp_path):
    store, item = store_with_item(tmp_path)
    store.move(item, "receive", 30, "kim", "clerk")
    for _ in range(6):
        store.move(item, "issue", 2, "kim", "clerk")
    f = store.demand_forecast(item, days=30)
    assert f["classification"] == "ESTIMATE"
    assert f["total_issued"] == 12 and f["avg_daily_issue_rate"] == 0.4
    assert "Assumes" in f["assumptions"]


def test_valuation_labels(tmp_path):
    store, item = store_with_item(tmp_path)
    store.move(item, "receive", 4, "kim", "clerk")
    v = store.valuation()
    assert v["inventory_value_at_cost"] == 10.0
    assert "book estimate" in v["note"]
