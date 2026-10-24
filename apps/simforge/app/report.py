"""Reproducible exports: parameters, assumptions, versions, results."""
from __future__ import annotations

import json
import platform


def export(path, title: str, parameters: dict, assumptions: list[str], results: dict, formulas: list[str]) -> dict:
    payload = {
        "title": title,
        "parameters": parameters,           # every parameter with its unit
        "assumptions": assumptions,          # idealisations stated explicitly
        "formulas": formulas,
        "results": results,
        "environment": {"python": platform.python_version(), "numpy": _numpy_version()},
        "disclaimer": "Idealised calculations, not real-world measurements. Rounding: results rounded "
                      "for display only; underlying math uses double precision.",
    }
    with open(path, "w") as fh:
        json.dump(payload, fh, indent=2)
    return payload


def _numpy_version() -> str:
    try:
        import numpy
        return numpy.__version__
    except Exception:
        return "unavailable"
