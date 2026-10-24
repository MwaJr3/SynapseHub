"""Modern features: generation presets and property explanations.

Preset rules are explicit configuration — never silently narrowed. Property
explanations state what a property contributes and what it does NOT prove.
"""
from __future__ import annotations

PRESETS = {
    "web": {"length": 16, "upper": True, "lower": True, "digits": True, "symbols": True,
            "notes": "General website accounts. 16 chars mixed classes."},
    "legacy": {"length": 12, "upper": True, "lower": True, "digits": True, "symbols": False,
               "notes": "For systems that reject symbols. Weaker against offline guessing — length compensates partially."},
    "wifi": {"length": 24, "upper": True, "lower": True, "digits": True, "symbols": False,
             "notes": "Long WPA2-style key you may need to type; symbols avoided for device input pain."},
    "passphrase": {"words": 5, "separator": "-",
                   "notes": "Diceware-style passphrase from the bundled vetted word list. Length beats complexity for memorability."},
}


def apply_preset(name: str) -> dict:
    if name not in PRESETS:
        raise ValueError(f"unknown preset {name!r}; available: {sorted(PRESETS)}")
    return dict(PRESETS[name])


PROPERTY_EXPLANATIONS = {
    "length": ("Length is the dominant factor against offline guessing — each extra character "
               "multiplies the search space. It does NOT protect against reuse or phishing."),
    "character_classes": ("Mixed classes raise the per-character search space. NIST guidance treats "
                          "composition rules as weaker than length — classes are not a silver bullet."),
    "randomness": ("Uniform random generation avoids human patterns. It does NOT help if the password "
                   "is reused or entered on a fake site."),
    "unique_per_service": ("Uniqueness limits breach fallout to one service. It does NOT protect the "
                           "service itself from being breached. Password managers are the practical "
                           "way to keep many unique secrets."),
}


def explain_properties(config: dict) -> list[dict]:
    out = [{"property": "length", "value": config.get("length", config.get("words")),
            "explanation": PROPERTY_EXPLANATIONS["length"]}]
    classes = sum(bool(config.get(k)) for k in ("upper", "lower", "digits", "symbols"))
    out.append({"property": "character_classes", "value": classes,
                "explanation": PROPERTY_EXPLANATIONS["character_classes"]})
    out.append({"property": "randomness", "value": "CSPRNG sampling (secrets module)",
                "explanation": PROPERTY_EXPLANATIONS["randomness"]})
    out.append({"property": "unique_per_service", "value": "user responsibility",
                "explanation": PROPERTY_EXPLANATIONS["unique_per_service"]})
    return out
