"""Content provenance and the licensing gate.

The rule this module enforces: *free to access is not free to copy*. Every piece
of learning material must declare where it came from and under what licence, and
material without a known, permissive licence is refused rather than quietly
ingested.

Usage tiers
-----------
``full``             the material may be adapted and stored
``reference_only``   link to the source, do not copy its text
``refused``          rights unknown or explicitly reserved — do not ingest

The gate is deliberately conservative: an unknown licence is a refusal, not a
maybe. `LINK_ONLY`, `PROPRIETARY` and `UNKNOWN` never reach ``full``.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import Enum


class LicenseClass(str, Enum):
    OPEN = "OPEN"                    # e.g. CC BY, CC BY-SA, CC0
    AUTHORIZED = "AUTHORIZED"        # written permission obtained for this use
    LINK_ONLY = "LINK_ONLY"          # may reference, must not copy
    PROPRIETARY = "PROPRIETARY"      # rights explicitly reserved
    UNKNOWN = "UNKNOWN"              # not established


class Usage(str, Enum):
    FULL = "full"
    REFERENCE_ONLY = "reference_only"
    REFUSED = "refused"


@dataclass(frozen=True)
class Source:
    """Provenance for one piece of learning material."""

    source_id: str
    title: str
    author: str
    url: str
    license_class: LicenseClass
    license_name: str
    #: True only when the licence permits commercial use. Non-commercial licences
    #: (e.g. CC BY-NC-SA) are open but cannot back a commercial deployment.
    commercial_use_ok: bool
    attribution: str
    retrieved_at: date

    def __post_init__(self) -> None:
        if not self.url.startswith(("http://", "https://")):
            raise ValueError("a source must record an http(s) URL")
        if self.license_class is not LicenseClass.UNKNOWN and not self.license_name.strip():
            raise ValueError("a known licence class must record the licence name")
        if self.license_class is LicenseClass.UNKNOWN and self.license_name.strip():
            raise ValueError("an UNKNOWN source must not claim a licence name")


@dataclass(frozen=True)
class Decision:
    usage: Usage
    reason: str
    #: Attribution the UI must display when the material is actually shown.
    attribution_required: bool

    @property
    def can_store(self) -> bool:
        return self.usage is Usage.FULL


def decide(source: Source, *, commercial_deployment: bool) -> Decision:
    """Decide how a source may be used. Never assumes permission."""
    if source.license_class is LicenseClass.UNKNOWN:
        return Decision(
            Usage.REFUSED,
            "Licence not established. Material is not ingested until the rights are known.",
            attribution_required=False,
        )
    if source.license_class is LicenseClass.PROPRIETARY:
        return Decision(
            Usage.REFUSED,
            f"'{source.license_name}' reserves the rights to this material. It may not be copied or adapted.",
            attribution_required=False,
        )
    if source.license_class is LicenseClass.LINK_ONLY:
        return Decision(
            Usage.REFERENCE_ONLY,
            "Rights permit referencing only: link to the original and do not reproduce its text.",
            attribution_required=True,
        )
    if source.license_class is LicenseClass.OPEN:
        if commercial_deployment and not source.commercial_use_ok:
            return Decision(
                Usage.REFERENCE_ONLY,
                f"'{source.license_name}' does not permit commercial use, so this material cannot back a commercial deployment.",
                attribution_required=True,
            )
        return Decision(
            Usage.FULL,
            f"'{source.license_name}' permits adaptation with attribution.",
            attribution_required=True,
        )
    # AUTHORIZED
    return Decision(
        Usage.FULL,
        f"Used under recorded authorization ({source.license_name}).",
        attribution_required=True,
    )


def assert_ingestible(source: Source, *, commercial_deployment: bool) -> Decision:
    """Raise instead of ingesting material that the gate refuses."""
    decision = decide(source, commercial_deployment=commercial_deployment)
    if decision.usage is Usage.REFUSED:
        raise PermissionError(f"{source.title}: {decision.reason}")
    return decision
