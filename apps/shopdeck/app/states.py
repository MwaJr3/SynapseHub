"""Explicit state machines for orders and inventory with transition validation."""
from __future__ import annotations


class TransitionError(ValueError):
    pass


ORDER_STATES = {"placed", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"}
ORDER_TRANSITIONS = {
    "placed": {"paid", "cancelled"},
    "paid": {"packed", "cancelled", "refunded"},
    "packed": {"shipped", "cancelled"},
    "shipped": {"delivered", "refunded"},
    "delivered": {"refunded"},
    "cancelled": set(),
    "refunded": set(),
}

INVENTORY_STATES = {"in_stock", "low", "out_of_stock", "discontinued"}
INVENTORY_TRANSITIONS = {
    "in_stock": {"low", "out_of_stock", "discontinued"},
    "low": {"in_stock", "out_of_stock", "discontinued"},
    "out_of_stock": {"in_stock", "low", "discontinued"},
    "discontinued": set(),            # terminal; reactivation needs explicit policy
}


def transition(current: str, target: str, table: dict, allowed: set[str], kind: str) -> str:
    if current not in table:
        raise TransitionError(f"Unknown {kind} state: {current!r}")
    if target not in allowed:
        raise TransitionError(f"Illegal {kind} transition: {current!r} -> {target!r} "
                              f"(allowed from here: {sorted(table[current]) or 'none'})")
    return target
