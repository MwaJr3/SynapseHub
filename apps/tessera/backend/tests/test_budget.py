"""The context budget: an estimate that is labelled as one.

The tests here care about three things: the arithmetic cannot produce nonsense
(negative, zero for real text, more than the window), the "tight fit" warning
fires when it should, and the sentence always admits that it is an estimate. The
last one is a product requirement, not a style preference — a number presented as
measured when it is approximated is exactly the kind of claim this project refuses.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.ai.budget import (
    CHARS_PER_TOKEN,
    ContextReport,
    DEFAULT_CONTEXT_TOKENS,
    context_report,
    estimate_tokens,
)


def test_empty_text_costs_nothing():
    assert estimate_tokens("") == 0
    assert estimate_tokens("   \n\t ") == 0


def test_any_real_text_costs_at_least_one_token():
    for text in ("a", "x", "Hello!", "Go."):
        assert estimate_tokens(text) >= 1


def test_the_estimate_follows_the_documented_ratio():
    text = "x" * 400
    assert estimate_tokens(text) == int(400 / CHARS_PER_TOKEN)


def test_longer_text_costs_more():
    short = estimate_tokens("Spacing beats rereading.")
    long = estimate_tokens("Spacing beats rereading. " * 50)
    assert long > short


def test_formatting_is_not_free():
    plain = estimate_tokens("onetwothreefour")
    formatted = estimate_tokens("one\ntwo\nthree\nfour")
    assert formatted > plain


def test_a_report_adds_up_and_never_exceeds_the_window():
    report = context_report("What is spacing?", ["passage " * 100], budget_tokens=500)
    assert report.used_tokens == report.question_tokens + report.passage_tokens
    assert report.remaining_tokens >= 0
    assert 0.0 <= report.share <= 1.0
    assert report.remaining_tokens + min(report.used_tokens, report.budget_tokens) == report.budget_tokens


def test_an_over_long_context_is_clamped_rather_than_reporting_a_negative_remainder():
    report = context_report("q" * 1000, ["p" * 5000], budget_tokens=100)
    assert report.remaining_tokens == 0
    assert report.share == 1.0
    assert report.tight is True


def test_a_tight_fit_is_flagged_and_a_roomy_one_is_not():
    roomy = context_report("short question", ["a passage"], budget_tokens=8192)
    assert roomy.tight is False
    # 2000 characters is roughly 500 tokens, so a 1000-token window is full.
    tight = context_report("q" * 2000, ["p" * 2000], budget_tokens=1000)
    assert tight.tight is True


def test_the_sentence_always_says_it_is_an_estimate():
    for report in (
        context_report("q", []),
        context_report("q", ["a passage"]),
        context_report("q" * 4000, ["p" * 4000], budget_tokens=1000),
    ):
        assert "estimated" in report.describe().lower()


def test_the_sentence_counts_passages_correctly_and_flags_the_tight_case():
    one = context_report("q", ["a"])
    assert "1 passage" in one.describe()
    three = context_report("q", ["a", "b", "c"])
    assert "3 passages" in three.describe()
    assert "tight fit" in context_report("q" * 3000, ["p" * 3000], budget_tokens=1000).describe()


def test_no_passages_is_stated_rather_than_implied():
    report = context_report("what is spacing", [])
    assert report.passages == 0
    assert "no passages were added" in report.describe().lower()


def test_the_default_window_is_documented_and_sane():
    assert DEFAULT_CONTEXT_TOKENS >= 4096
    report = context_report("q", ["p"])
    assert report.budget_tokens == DEFAULT_CONTEXT_TOKENS


def test_the_budget_is_reported_in_the_stream_before_the_text():
    """The trace must carry the estimate, and it must arrive before the answer.

    Checked against the real module source rather than a live model: the stub
    provider tests already prove ordering for the frames themselves, and this
    test pins that the budget step is inside the same pre-text block.
    """
    source = Path(__file__).resolve().parents[1].joinpath("app/ai/chat.py").read_text()
    budget_at = source.index('step("Fitted it into the context window"')
    first_delta_at = source.index('yield sse("delta"')
    assert budget_at < first_delta_at
    assert "context_report(" in source


@pytest.mark.parametrize("budget", [0, -5])
def test_a_nonsense_budget_cannot_divide_by_zero(budget):
    report = context_report("q", ["p"], budget_tokens=budget)
    assert report.budget_tokens == 1
    assert report.share == 1.0


def test_report_is_immutable():
    report = ContextReport(question_tokens=1, passage_tokens=2, budget_tokens=10, passages=1)
    with pytest.raises(Exception):
        report.budget_tokens = 99  # type: ignore[misc]
