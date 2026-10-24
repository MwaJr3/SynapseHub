"""SQLite storage: items, stock movements (immutable ledger), roles, alerts.

Every stock change is an immutable ledger row — corrections are new
reversing rows, never edits to history.
"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY, sku TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    unit_cost REAL NOT NULL, on_hand INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 5, archived INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS movements (
    id INTEGER PRIMARY KEY, item_id INTEGER NOT NULL, at TEXT NOT NULL,
    actor TEXT NOT NULL, kind TEXT NOT NULL,                   -- receive|issue|adjust|reverse
    quantity INTEGER NOT NULL, note TEXT DEFAULT '', reverses INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY, item_id INTEGER NOT NULL, at TEXT NOT NULL,
    kind TEXT NOT NULL, message TEXT NOT NULL, resolved INTEGER DEFAULT 0
);
"""

ROLE_RIGHTS = {"viewer": set(), "clerk": {"receive", "issue"}, "manager": {"receive", "issue", "adjust", "reverse", "archive"}}


def connect(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Store:
    def __init__(self, db_path: str) -> None:
        self.conn = connect(db_path)

    def add_item(self, sku: str, name: str, unit_cost: float, reorder_level: int = 5) -> int:
        cur = self.conn.execute("INSERT INTO items(sku, name, unit_cost, reorder_level) VALUES (?,?,?,?)",
                                (sku, name, unit_cost, reorder_level))
        self.conn.commit()
        return cur.lastrowid

    def move(self, item_id: int, kind: str, quantity: int, actor: str, role: str,
             note: str = "", reverses: int = 0) -> dict:
        if kind not in ROLE_RIGHTS.get(role, set()):
            raise PermissionError(f"role {role!r} cannot perform {kind!r} "
                                  f"(allowed: {sorted(ROLE_RIGHTS.get(role, set())) or 'none'})")
        row = self.conn.execute("SELECT * FROM items WHERE id=?", (item_id,)).fetchone()
        if row is None:
            raise ValueError("unknown item")
        if row["archived"] and kind != "reverse":
            raise ValueError("item is archived; only reversals allowed")
        delta = {"receive": abs(quantity), "issue": -abs(quantity),
                 "adjust": quantity, "reverse": -quantity}.get(kind)
        if delta is None:
            raise ValueError(f"unknown movement kind {kind!r}")
        new_on_hand = row["on_hand"] + delta
        if new_on_hand < 0:
            raise ValueError(f"stock would go negative ({row['on_hand']} {kind} {quantity}); refused")
        cur = self.conn.execute(
            "INSERT INTO movements(item_id, at, actor, kind, quantity, note, reverses) VALUES (?,?,?,?,?,?,?)",
            (item_id, _now(), actor, kind, quantity, note, reverses))
        self.conn.execute("UPDATE items SET on_hand=? WHERE id=?", (new_on_hand, item_id))
        if new_on_hand <= row["reorder_level"]:
            self.conn.execute("INSERT INTO alerts(item_id, at, kind, message) VALUES (?,?,?,?)",
                              (item_id, _now(), "reorder",
                               f"{row['name']}: on hand {new_on_hand} <= reorder level {row['reorder_level']}"))
        self.conn.commit()
        return {"movement_id": cur.lastrowid, "item_id": item_id, "kind": kind,
                "delta": delta, "on_hand": new_on_hand}

    def reverse_movement(self, movement_id: int, actor: str, role: str, note: str = "reversal") -> dict:
        m = self.conn.execute("SELECT * FROM movements WHERE id=?", (movement_id,)).fetchone()
        if m is None:
            raise ValueError("unknown movement")
        if m["kind"] == "reverse":
            raise ValueError("cannot reverse a reversal; create a new adjustment instead")
        return self.move(m["item_id"], "reverse", m["quantity"], actor, role, note, reverses=movement_id)

    def ledger(self, item_id: int) -> list[dict]:
        return [dict(r) for r in self.conn.execute(
            "SELECT * FROM movements WHERE item_id=? ORDER BY id", (item_id,))]

    def valuation(self) -> dict:
        rows = self.conn.execute("SELECT * FROM items WHERE archived=0").fetchall()
        total = round(sum(r["on_hand"] * r["unit_cost"] for r in rows), 2)
        return {"items": len(rows), "inventory_value_at_cost": total,
                "basis": "unit_cost × on_hand (FIFO lot tracking not included; figures are book estimates)",
                "note": "Valuation is a book estimate, not a market appraisal."}

    def demand_forecast(self, item_id: int, days: int = 30) -> dict:
        """Average daily issue rate from the ledger, projected forward.
        Clearly labelled ESTIMATE with its assumptions."""
        rows = self.conn.execute(
            "SELECT quantity FROM movements WHERE item_id=? AND kind='issue'", (item_id,)).fetchall()
        issued = sum(abs(r["quantity"]) for r in rows)
        rate = issued / max(1, days)
        return {"item_id": item_id, "window_days": days, "total_issued": issued,
                "avg_daily_issue_rate": round(rate, 3),
                "projected_30_day_demand": round(rate * 30, 1),
                "classification": "ESTIMATE",
                "assumptions": "Assumes observed issue rate continues; no seasonality; ledger window may be short."}
