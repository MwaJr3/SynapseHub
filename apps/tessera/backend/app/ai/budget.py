"""How much of the model's context this turn will actually use.

Why a learning product cares: a retrieval-grounded answer is only as good as what
fits in the window. Passages are truncated (700 characters each in
`retrieval.py`), the conversation history is trimmed, and a long thread can evict
the very material the answer should lean on. Rather than hope, the tutor reports
an estimate in its trace, so a learner can see when an answer was working from
less than they think.

The estimate is deliberately crude. Real tokenisation is model-specific: the same
sentence is a different number of tokens for Llama, Qwen and Nemotron, and loading
three tokenisers to count them would cost more than the number is worth. This
module approximates with two rules that are right about the shape and honest about
the precision:

- roughly four characters per token for ordinary English prose;
- punctuation and format characters count separately, because they do.

So every number it produces is labelled **estimated** wherever it is shown, and
no product decision depends on it. What it is actually for is the comparison: 400
tokens of curriculum out of an 8,192-token window is fine, and 7,900 is a warning
that the next question will start dropping sources.

This is the one idea taken from the "LLMs from scratch" material worth putting in
front of a learner: a language model reads a fixed window of tokens, and the
window is a budget, not a memory.
"""

from __future__ import annotations

from dataclasses import dataclass

#: Roughly what an English word becomes in a modern BPE tokeniser.
CHARS_PER_TOKEN = 4.0

#: Default window used when the configured model's size is unknown. Deliberately
#: conservative: most current open-weight models are at least this large, and
#: under-promising the budget is safer than over-promising it.
DEFAULT_CONTEXT_TOKENS = 8192


def estimate_tokens(text: str) -> int:
    """Approximate the token count of `text`.

    Ceil rather than truncate, so a non-empty string never estimates as zero and
    a series of tiny fragments cannot hide a large context.
    """
    if not text:
        return 0
    stripped = text.strip()
    if not stripped:
        return 0
    base = len(stripped) / CHARS_PER_TOKEN
    # Format characters are their own tokens in practice, and prose rarely
    # contains many, so counting them is a small correction rather than a fudge.
    marks = sum(1 for char in stripped if char in "\n\t•-—#*`|")
    return int(base) + (1 if base % 1 else 0) + marks


@dataclass(frozen=True)
class ContextReport:
    """An estimate, not a measurement. Never presented without that word."""

    question_tokens: int
    passage_tokens: int
    budget_tokens: int
    passages: int

    @property
    def used_tokens(self) -> int:
        return self.question_tokens + self.passage_tokens

    @property
    def remaining_tokens(self) -> int:
        return max(0, self.budget_tokens - self.used_tokens)

    @property
    def share(self) -> float:
        """Fraction of the window used, clamped to [0, 1]."""
        if self.budget_tokens <= 0:
            return 0.0
        return min(1.0, self.used_tokens / self.budget_tokens)

    @property
    def tight(self) -> bool:
        """True when there is little room left for the answer itself.

        A quarter of the window for the reply is the line: below that, a long
        answer is likely to crowd out the material that justifies it.
        """
        return self.remaining_tokens < self.budget_tokens * 0.25

    def describe(self) -> str:
        """One sentence for the trace. Says 'estimated', always."""
        if self.passages == 0:
            return (
                f"Estimated {self.used_tokens} of {self.budget_tokens} tokens used by the question; "
                "no passages were added."
            )
        sentence = (
            f"Estimated {self.used_tokens} of {self.budget_tokens} tokens "
            f"used by the question and {self.passages} passage"
            f"{'' if self.passages == 1 else 's'} ({int(round(self.share * 100))}% of the window)."
        )
        if self.tight:
            sentence += " That is a tight fit for the answer itself, so a long reply may drop a source."
        return sentence


def context_report(
    question: str,
    passages: list[str],
    *,
    budget_tokens: int = DEFAULT_CONTEXT_TOKENS,
) -> ContextReport:
    return ContextReport(
        question_tokens=estimate_tokens(question),
        passage_tokens=sum(estimate_tokens(passage) for passage in passages),
        budget_tokens=max(1, budget_tokens),
        passages=len(passages),
    )
