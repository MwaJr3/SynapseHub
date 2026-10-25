"""The licence gate must refuse anything it cannot prove is reusable."""
from __future__ import annotations

from datetime import date

import pytest

from app.content import LicenseClass, Source, Usage, assert_ingestible, decide

TODAY = date(2026, 1, 1)


def make(license_class: LicenseClass, *, name: str, commercial: bool) -> Source:
    return Source(
        source_id="s1",
        title="A source",
        author="Someone",
        url="https://example.org/material",
        license_class=license_class,
        license_name=name,
        commercial_use_ok=commercial,
        attribution="Credit",
        retrieved_at=TODAY,
    )


def test_open_permissive_material_may_be_adapted():
    decision = decide(make(LicenseClass.OPEN, name="CC BY 4.0", commercial=True), commercial_deployment=False)
    assert decision.usage is Usage.FULL
    assert decision.attribution_required is True


def test_non_commercial_licence_is_blocked_in_a_commercial_deployment():
    source = make(LicenseClass.OPEN, name="CC BY-NC-SA 4.0", commercial=False)
    personal = decide(source, commercial_deployment=False)
    commercial = decide(source, commercial_deployment=True)
    assert personal.usage is Usage.FULL
    assert commercial.usage is Usage.REFERENCE_ONLY
    assert "commercial" in commercial.reason


def test_unknown_licence_is_refused_not_assumed():
    decision = decide(make(LicenseClass.UNKNOWN, name="", commercial=False), commercial_deployment=False)
    assert decision.usage is Usage.REFUSED
    assert decision.can_store is False


def test_proprietary_material_is_refused():
    decision = decide(
        make(LicenseClass.PROPRIETARY, name="All rights reserved", commercial=False),
        commercial_deployment=False,
    )
    assert decision.usage is Usage.REFUSED


def test_link_only_material_may_be_referenced_but_not_stored():
    decision = decide(make(LicenseClass.LINK_ONLY, name="Reference only", commercial=False), commercial_deployment=False)
    assert decision.usage is Usage.REFERENCE_ONLY
    assert decision.can_store is False
    assert decision.attribution_required is True


def test_authorized_material_may_be_used_with_attribution():
    decision = decide(make(LicenseClass.AUTHORIZED, name="Written permission", commercial=True), commercial_deployment=False)
    assert decision.usage is Usage.FULL


def test_ingest_raises_instead_of_storing_refused_material():
    with pytest.raises(PermissionError):
        assert_ingestible(make(LicenseClass.UNKNOWN, name="", commercial=False), commercial_deployment=False)


def test_a_source_without_a_url_is_rejected():
    with pytest.raises(ValueError):
        Source(
            source_id="s2", title="No URL", author="", url="not-a-url",
            license_class=LicenseClass.OPEN, license_name="CC0", commercial_use_ok=True,
            attribution="", retrieved_at=TODAY,
        )


def test_unknown_cannot_claim_a_licence_name():
    with pytest.raises(ValueError):
        make(LicenseClass.UNKNOWN, name="CC BY", commercial=False)
