"""Does the scheduler actually retain more per review than simpler rules?

A memory model cannot be validated by testing it against itself. The scheduler in
`app.srs` uses a power-forgetting curve and its own stability update; if the
evaluation used that same curve to decide what the learner "remembers", every
result would be true by construction and the numbers would mean nothing.

So this harness simulates learners with a **different** forgetting model —
exponential decay with a latent half-life per item, and noise in whether a review
succeeds — and then asks how well each review strategy keeps retention up for a
budget of reviews.

    python -m app.evals.recall_eval

**The comparison is budget-matched.** Asking "which strategy retains more" without
fixing the cost is meaningless: a scheduler that reviews daily wins on retention
and loses on everything a learner actually cares about. Every strategy here gets
the same maximum number of reviews per item, and then the question is a real one:
*given the same number of reviews, which placement of them keeps more in memory?*
All randomness is seeded, so a regression is a change in the model rather than a
different roll of the dice.

The control matters as much as the strategies: `broken` schedules ninety days
regardless of what happened, and the tests require it to *fail* the same threshold
the real scheduler passes. An evaluation that cannot fail is a screenshot.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from .. import srs

#: Days simulated after the first encounter.
HORIZON_DAYS = 90
#: Items per simulated learner.
ITEMS = 200
#: Reviews allowed per item. Every strategy gets the same allowance so the
#: comparison is about placement, not about how often a strategy can ask.


@dataclass
class Item:
    """Ground truth for one concept, deliberately not the scheduler's model."""

    half_life_days: float
    reviews: int = 0

    def recall_probability(self, elapsed_days: float) -> float:
        if elapsed_days <= 0:
            return 1.0
        # Exponential forgetting. The scheduler uses a power curve, so agreement
        # between the two is evidence rather than tautology.
        return float(0.5 ** (elapsed_days / self.half_life_days))

    def reviewed(self, *, success: bool) -> None:
        self.reviews += 1
        # Spacing effect: a successful retrieval stretches the half-life; failure
        # shortens it, but never to zero.
        self.half_life_days = min(240.0, self.half_life_days * (1.6 if success else 0.55))
        self.half_life_days = max(0.5, self.half_life_days)


@dataclass
class Run:
    strategy: str
    reviewed: int = 0
    items: int = 0
    probes: list[float] = field(default_factory=list)

    @property
    def mean_recall(self) -> float:
        return sum(self.probes) / len(self.probes) if self.probes else 0.0

    @property
    def reviews_per_item(self) -> float:
        return self.reviewed / self.items if self.items else 0.0


# ------------------------------------------------------------------ strategies


def simulate(
    strategy: str,
    *,
    items: int = ITEMS,
    horizon_days: int = HORIZON_DAYS,
    seed: int = 7,
    probe_every: int = 15,
    budget_per_item: int = 12,
) -> Run:
    rng = random.Random(seed)
    run = Run(strategy=strategy, items=items)

    ground_truth = [
        Item(half_life_days=math.exp(rng.uniform(math.log(1.0), math.log(30.0)))) for _ in range(items)
    ]
    # Each item's own schedule, in days from the start.
    memory = [srs.MemoryState() for _ in range(items)]
    last_review = [0.0] * items
    next_due = [0.0] * items  # due immediately for the first review
    spent = [0] * items

    for day in range(0, horizon_days + 1):
        if day and day % probe_every == 0:
            run.probes.extend(
                item.recall_probability(day - last_reviewed)
                for item, last_reviewed in zip(ground_truth, last_review)
            )

        for index, item in enumerate(ground_truth):
            if day < next_due[index]:
                continue
            if spent[index] >= budget_per_item:
                next_due[index] = float("inf")
                continue
            elapsed = day - last_review[index]
            if day > 0:
                success = rng.random() < item.recall_probability(elapsed)
                item.reviewed(success=success)
                run.reviewed += 1
            else:
                success = True  # the first encounter is the lesson, not a review

            spent[index] += 1

            if strategy == "tessera":
                state = memory[index]
                now = datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(days=day)
                result = srs.schedule(
                    state,
                    correct=success,
                    elapsed_days=max(0.0, elapsed if day > 0 else 0.0),
                    now=now,
                )
                memory[index] = result.state
                next_due[index] = day + max(0.5, result.interval_days)
            elif strategy == "fixed_7":
                next_due[index] = day + 7
            elif strategy == "fixed_30":
                next_due[index] = day + 30
            elif strategy == "never":
                next_due[index] = float("inf")
            elif strategy == "broken":
                # The control: ignores the outcome and schedules far too late.
                next_due[index] = day + 90
            else:  # pragma: no cover - guarded by the caller
                raise ValueError(f"unknown strategy {strategy!r}")

            last_review[index] = day

    return run


STRATEGIES = ("tessera", "fixed_7", "fixed_30", "never", "broken")


def evaluate(
    *, seed: int = 7, items: int = ITEMS, horizon_days: int = HORIZON_DAYS, budget_per_item: int = 12
) -> dict[str, Run]:
    return {
        name: simulate(
            name, seed=seed, items=items, horizon_days=horizon_days, budget_per_item=budget_per_item
        )
        for name in STRATEGIES
    }


def report(results: dict[str, Run]) -> str:
    lines = [
        f"{'strategy':<10}{'recall':>8}{'reviews':>9}{'per item':>10}",
        "-" * 37,
    ]
    for name, run in results.items():
        lines.append(
            f"{name:<10}{run.mean_recall:>8.3f}{run.reviewed:>9}{run.reviews_per_item:>10.1f}"
        )
    return "\n".join(lines)


if __name__ == "__main__":  # pragma: no cover - manual run
    print(report(evaluate()))
