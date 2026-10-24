"""Money-handling policy: currency label, precision, period rules."""
from __future__ import annotations

from decimal import Decimal

CURRENCY = "ZMW"          # display label only; amounts are unitless Decimals
QUANT = Decimal("0.01")   # money is quantised to 2 decimal places
