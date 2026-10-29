"""SQLite storage: products, inventory, orders, price audit, alerts."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone

from .pricing import PriceRule, compute_total
from .states import (INVENTORY_STATES, INVENTORY_TRANSITIONS, ORDER_STATES,
                     ORDER_TRANSITIONS, transition)

SCHEMA = """
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY, sku TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    unit_price REAL NOT NULL, stock INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    inv_state TEXT DEFAULT 'out_of_stock', updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, state TEXT DEFAULT 'placed',
    customer TEXT NOT NULL, total REAL NOT NULL DEFAULT 0, audit TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS order_lines (
    id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL, unit_price REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS price_audit (
    id INTEGER PRIMARY KEY, order_id INTEGER, computed_at TEXT NOT NULL, payload TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL, kind TEXT NOT NULL,
    message TEXT NOT NULL, created_at TEXT NOT NULL, resolved INTEGER DEFAULT 0
);
"""


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

    def add_product(self, sku: str, name: str, unit_price: float, stock: int,
                    low_stock_threshold: int = 5) -> int:
        state = "out_of_stock" if stock <= 0 else ("low" if stock <= low_stock_threshold else "in_stock")
        cur = self.conn.execute(
            "INSERT INTO products(sku, name, unit_price, stock, low_stock_threshold, inv_state, updated_at) "
            "VALUES (?,?,?,?,?,?,?)", (sku, name, unit_price, stock, low_stock_threshold, state, _now()))
        if state == "low":
            self.alert(cur.lastrowid, "low_stock",
                       f"{name}: stock {stock} <= threshold {low_stock_threshold}")
        self.conn.commit()
        return cur.lastrowid

    def set_stock(self, product_id: int, new_stock: int) -> dict:
        row = self.conn.execute("SELECT * FROM products WHERE id=?", (product_id,)).fetchone()
        if row is None:
            raise ValueError("unknown product")
        new_state = "out_of_stock" if new_stock <= 0 else ("low" if new_stock <= row["low_stock_threshold"] else "in_stock")
        transition(row["inv_state"], new_state, INVENTORY_TRANSITIONS, INVENTORY_TRANSITIONS[row["inv_state"]], "inventory")
        self.conn.execute("UPDATE products SET stock=?, inv_state=?, updated_at=? WHERE id=?",
                          (new_stock, new_state, _now(), product_id))
        if new_state == "low":
            self.alert(product_id, "low_stock",
                       f"{row['name']}: stock {new_stock} <= threshold {row['low_stock_threshold']}")
        self.conn.commit()
        return {"product_id": product_id, "stock": new_stock, "state": new_state}

    def alert(self, product_id: int, kind: str, message: str) -> None:
        self.conn.execute("INSERT INTO alerts(product_id, kind, message, created_at) VALUES (?,?,?,?)",
                          (product_id, kind, message, _now()))

    def open_alerts(self) -> list[dict]:
        return [dict(r) for r in self.conn.execute(
            "SELECT * FROM alerts WHERE resolved=0 ORDER BY id")]

    def create_order(self, customer: str, lines: list[tuple[int, int]],
                     rules: list[PriceRule]) -> int:
        products = {r["id"]: r for r in self.conn.execute("SELECT * FROM products")}
        unit_prices = []
        for product_id, qty in lines:
            if product_id not in products:
                raise ValueError(f"unknown product {product_id}")
            if qty <= 0:
                raise ValueError("quantity must be positive")
            unit_prices.append((product_id, qty, products[product_id]["unit_price"]))
        # Price audit: per-order total with full rule trace. Compute the gross
        # amount first, then apply rules against that subtotal.
        amount = sum(price * qty for _, qty, price in unit_prices)
        total_qty = sum(qty for _, qty, _ in unit_prices) or 1
        result = compute_total(round(amount / total_qty, 6), total_qty, rules)
        cur = self.conn.execute("INSERT INTO orders(created_at, customer, total, audit) VALUES (?,?,?,?)",
                                (_now(), customer, result["total"], json.dumps(result["audit"])))
        order_id = cur.lastrowid
        for (product_id, qty, price) in unit_prices:
            self.conn.execute("INSERT INTO order_lines(order_id, product_id, quantity, unit_price) VALUES (?,?,?,?)",
                              (order_id, product_id, qty, price))
        self.conn.execute("INSERT INTO price_audit(order_id, computed_at, payload) VALUES (?,?,?)",
                          (order_id, _now(), json.dumps(result)))
        self.conn.commit()
        return order_id

    def advance_order(self, order_id: int, target: str) -> dict:
        row = self.conn.execute("SELECT * FROM orders WHERE id=?", (order_id,)).fetchone()
        if row is None:
            raise ValueError("unknown order")
        transition(row["state"], target, ORDER_TRANSITIONS, ORDER_TRANSITIONS[row["state"]], "order")
        audit = json.loads(row["audit"] or "[]")
        audit = audit if isinstance(audit, list) else []
        audit.append({"at": _now(), "from": row["state"], "to": target})
        self.conn.execute("UPDATE orders SET state=?, audit=? WHERE id=?", (target, json.dumps(audit), order_id))
        self.conn.commit()
        return {"order_id": order_id, "state": target, "audit_entries": len(audit)}

    def sales_report(self) -> dict:
        rows = self.conn.execute(
            "SELECT o.id, o.state, COUNT(l.id) AS line_count, SUM(l.quantity * l.unit_price) AS gross "
            "FROM orders o LEFT JOIN order_lines l ON l.order_id=o.id GROUP BY o.id").fetchall()
        complete = [r for r in rows if r["state"] in ("delivered", "shipped")]
        flagged = [r["id"] for r in rows if r["line_count"] == 0]    # orders with no lines
        total = round(sum(r["gross"] or 0 for r in complete), 2)
        return {"orders_total": len(rows), "shipped_or_delivered": len(complete),
                "gross_revenue_completed": total,
                "data_quality_flags": (["orders with no lines: " + ",".join(map(str, flagged))] if flagged else []),
                "note": "Gross revenue counts only shipped/delivered orders; order states are explicit."}
