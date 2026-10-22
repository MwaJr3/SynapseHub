"""Data-driven interpretation and non-destructive export helpers."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import asdict
from pathlib import Path

import pandas as pd

from .data_loader import DataProvenance
from .exceptions import DataValidationError

DISCLAIMER = (
    "Educational historical analysis only—not financial advice. Past performance, historical "
    "volatility, moving averages, drawdowns, and correlations do not predict future results."
)


def generate_findings(
    summary: pd.DataFrame,
    moving_average_data: Mapping[str, pd.DataFrame],
    correlation: pd.DataFrame,
) -> list[str]:
    """Generate only claims directly supported by computed values."""
    required = {
        "Percentage price change",
        "Annualized volatility",
        "Mean daily volume",
    }
    missing = required.difference(summary.columns)
    if missing:
        raise DataValidationError(f"Summary table is missing metrics: {sorted(missing)}")
    findings: list[str] = []

    return_leader = summary["Percentage price change"].astype(float).idxmax()
    findings.append(
        "Calculated result: "
        f"{return_leader} had the largest price-only change in the selected window "
        f"({float(summary.loc[return_leader, 'Percentage price change']):.1%})."
    )
    volatility_leader = summary["Annualized volatility"].astype(float).idxmax()
    findings.append(
        "Calculated result: "
        f"{volatility_leader} had the greatest annualized historical daily-return variability "
        f"({float(summary.loc[volatility_leader, 'Annualized volatility']):.1%}, using √252)."
    )
    volume_leader = summary["Mean daily volume"].astype(float).idxmax()
    findings.append(
        "Observed fact: "
        f"{volume_leader} had the higher mean share volume in this sample "
        f"({float(summary.loc[volume_leader, 'Mean daily volume']) / 1_000_000:.1f} million shares/day). "
        "This does not establish company size, liquidity quality, or investor intent."
    )

    for ticker, frame in moving_average_data.items():
        sma_columns = sorted(
            (column for column in frame if column.startswith("SMA_")),
            key=lambda value: int(value.split("_")[1]),
        )
        if not sma_columns:
            continue
        longest = sma_columns[-1]
        available = frame.dropna(subset=[longest])
        if available.empty:
            findings.append(
                f"Limitation: {ticker} has insufficient observations to calculate {longest}."
            )
            continue
        latest = available.iloc[-1]
        relationship = "above" if latest["Close"] > latest[longest] else "below"
        findings.append(
            "Observed relationship: "
            f"on {available.index[-1].date()}, {ticker}'s close was {relationship} its "
            f"{longest.replace('SMA_', '')}-session moving average. This is descriptive, not a signal."
        )

    if len(correlation) >= 2:
        pairs: list[tuple[float, str, str]] = []
        for left_index, left in enumerate(correlation.columns):
            for right in correlation.columns[left_index + 1 :]:
                pairs.append((float(correlation.loc[left, right]), left, right))
        if pairs:
            value, left, right = max(pairs, key=lambda item: abs(item[0]))
            findings.append(
                "Calculated result: "
                f"{left} and {right} daily returns had a {value:.2f} Pearson correlation on common dates. "
                "Historical correlation is association, not causation, and can change."
            )

    findings.append(
        "Methodological observation: weekly and monthly closes use the last available close in each "
        "period, reducing plotted point density without averaging closing prices."
    )
    findings.append(
        "Unresolved explanation: prices and volumes alone cannot establish why any observed move occurred; "
        "no news or causal narrative is inferred."
    )
    return findings


def _format_summary_for_markdown(summary: pd.DataFrame) -> pd.DataFrame:
    table = summary.copy()
    currency_columns = [
        "First close",
        "Last close",
        "Absolute price change",
        "Minimum close",
        "Maximum close",
    ]
    percent_columns = [
        "Percentage price change",
        "CAGR",
        "Mean daily return",
        "Median daily return",
        "Daily return std",
        "Annualized volatility",
        "Maximum drawdown",
    ]
    for column in currency_columns:
        if column in table:
            table[column] = table[column].map(lambda value: f"${float(value):,.2f}")
    for column in percent_columns:
        if column in table:
            table[column] = table[column].map(lambda value: f"{float(value):.2%}")
    for column in ("Mean daily volume", "Median daily volume", "Total observed volume"):
        if column in table:
            table[column] = table[column].map(lambda value: f"{float(value):,.0f}")
    if "Approx. mean daily turnover" in table:
        table["Approx. mean daily turnover"] = table["Approx. mean daily turnover"].map(
            lambda value: f"${float(value):,.0f}"
        )
    for column in ("Start date", "End date"):
        if column in table:
            table[column] = pd.to_datetime(table[column]).dt.date.astype(str)
    return table


def write_markdown_report(
    path: str | Path,
    *,
    title: str,
    summary: pd.DataFrame,
    findings: Sequence[str],
    metadata: Mapping[str, DataProvenance],
    price_basis: str,
    figure_paths: Sequence[str | Path] = (),
) -> Path:
    """Write an auditable report assembled from computed results."""
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    metadata_table = pd.DataFrame([asdict(item) for item in metadata.values()])
    selected_metadata_columns = [
        "ticker",
        "source",
        "requested_start",
        "requested_end",
        "actual_start",
        "actual_end",
        "observations",
        "auto_adjust",
        "retrieved_at_utc",
    ]
    figure_lines = (
        "\n".join(f"- `{Path(item)}`" for item in figure_paths) or "- No figures exported."
    )
    finding_lines = "\n".join(f"{index}. {item}" for index, item in enumerate(findings, start=1))
    report = f"""# {title}

> {DISCLAIMER}

## Scope and methodology

- **Price basis:** {price_basis}
- **Resampling:** Friday-ending weekly and calendar-month-end OHLCV; open=first, high=max, low=min, close=last, volume=sum.
- **Moving averages:** trailing 20- and 200-observation simple means with full-window warm-up.
- **Volatility:** standard deviation of daily percentage returns, annualized with √252.
- **Performance:** price-only; dividends are included only when the configured price series incorporates them.

## Data provenance

{metadata_table[selected_metadata_columns].to_markdown(index=False)}

Downloaded/source observations are kept separate from derived tables. Provider data may be delayed, incomplete, or revised.

## Computed summary

{_format_summary_for_markdown(summary).to_markdown()}

## Data-driven findings

{finding_lines}

## Generated figures

{figure_lines}

## Limitations

Historical observations do not predict future results. Nominal share prices and raw share volumes are not measures of company value. Correlation does not establish causation. Price-only performance may exclude distributions. Different listing histories, calendars, missing observations, and provider adjustments can affect comparisons. No recommendation to buy or sell a security is made.
"""
    target.write_text(report, encoding="utf-8")
    return target


def export_analysis_tables(
    *,
    data: Mapping[str, pd.DataFrame],
    weekly: Mapping[str, pd.DataFrame],
    monthly: Mapping[str, pd.DataFrame],
    moving_averages: Mapping[str, pd.DataFrame],
    summary: pd.DataFrame,
    normalized_performance: pd.DataFrame,
    correlation: pd.DataFrame,
    output_dir: str | Path,
    processed_dir: str | Path,
    run_label: str,
) -> dict[str, Path]:
    """Export derived files under descriptive names without modifying source data."""
    output_root = Path(output_dir)
    processed_root = Path(processed_dir)
    tables_dir = output_root / "tables"
    tables_dir.mkdir(parents=True, exist_ok=True)
    processed_root.mkdir(parents=True, exist_ok=True)
    exported: dict[str, Path] = {}

    for ticker, frame in data.items():
        paths_and_frames: tuple[tuple[str, pd.DataFrame, Path], ...] = (
            ("processed_daily", frame, processed_root / f"{run_label}_{ticker.lower()}_daily.csv"),
            ("weekly", weekly[ticker], tables_dir / f"{run_label}_{ticker.lower()}_weekly.csv"),
            ("monthly", monthly[ticker], tables_dir / f"{run_label}_{ticker.lower()}_monthly.csv"),
            (
                "moving_averages",
                moving_averages[ticker],
                tables_dir / f"{run_label}_{ticker.lower()}_moving_averages.csv",
            ),
        )
        for kind, export_frame, path in paths_and_frames:
            export_frame.to_csv(path, index_label="Date")
            exported[f"{ticker}_{kind}"] = path

    shared_exports: tuple[tuple[str, pd.DataFrame], ...] = (
        ("summary", summary),
        ("normalized_performance", normalized_performance),
        ("return_correlation", correlation),
    )
    for name, frame in shared_exports:
        path = tables_dir / f"{run_label}_{name}.csv"
        frame.to_csv(path, index=True)
        exported[name] = path
    return exported
