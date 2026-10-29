import pytest

from app.engine.indicators import IndicatorError, parse_indicator
from app.services import canonical, parse_lines, simulated_batch, source_summary


def test_parse_indicator_kinds():
    assert parse_indicator("example.com").kind in ("domain", "url", "ip", "hash")
    assert parse_indicator("aabbccdd" * 8).kind.startswith("hash")
    with pytest.raises(IndicatorError):
        parse_indicator("not an indicator!!")


def test_canonicalization_normalizes_before_dedup():
    assert canonical("Example.COM.", "domain") == "example.com"
    assert canonical("AABBCC", "hash") == "aabbcc"


def test_parse_lines_skips_bad_lines_without_crashing():
    ok, errors = parse_lines("example.com\nnot an indicator!!\n# comment\n", 100)
    assert len(ok) == 1 and len(errors) == 1


def test_simulated_batch_is_deterministic_and_labelled():
    assert simulated_batch("feed-a") == simulated_batch("feed-a")
    assert simulated_batch("feed-a") != simulated_batch("feed-b")


def test_one_feed_is_never_proof():
    framing = source_summary('["only-feed"]')
    assert framing["source_count"] == 1
    assert "not proof" in framing["framing"]
    assert "unverified third-party claims" in framing["framing"]
