from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from stock_analysis.data_loader import DataProvenance
from stock_analysis.metrics import calculate_return_correlation, create_summary_table
from stock_analysis.reporting import (
    export_analysis_tables,
    generate_findings,
    write_markdown_report,
)
from stock_analysis.time_series import calculate_moving_averages, resample_ohlcv


def test_findings_are_computed_from_metrics(daily_ohlcv: pd.DataFrame) -> None:
    second = daily_ohlcv.copy()
    second["Close"] = second["Close"] * 1.1
    second["Open"] = second["Close"] - 0.5
    second["High"] = second["Close"] + 1
    second["Low"] = second["Close"] - 1
    data = {"AAA": daily_ohlcv, "BBB": second}
    summary = create_summary_table(data)
    moving = {ticker: calculate_moving_averages(frame) for ticker, frame in data.items()}
    correlation = calculate_return_correlation(data)
    findings = generate_findings(summary, moving, correlation)
    assert any("largest price-only change" in finding for finding in findings)
    assert any("not causation" in finding for finding in findings)
    assert any("cannot establish why" in finding for finding in findings)


def test_exports_and_report_are_written(daily_ohlcv: pd.DataFrame, tmp_path: Path) -> None:
    data = {"AAA": daily_ohlcv, "BBB": daily_ohlcv * 1.1}
    weekly = {ticker: resample_ohlcv(frame, "W-FRI") for ticker, frame in data.items()}
    monthly = {ticker: resample_ohlcv(frame, "ME") for ticker, frame in data.items()}
    moving = {ticker: calculate_moving_averages(frame) for ticker, frame in data.items()}
    summary = create_summary_table(data)
    normalized = pd.DataFrame({"AAA": [100, 110], "BBB": [100, 90]})
    correlation = calculate_return_correlation(data)
    exports = export_analysis_tables(
        data=data,
        weekly=weekly,
        monthly=monthly,
        moving_averages=moving,
        summary=summary,
        normalized_performance=normalized,
        correlation=correlation,
        output_dir=tmp_path / "outputs",
        processed_dir=tmp_path / "processed",
        run_label="test_run",
    )
    assert all(path.exists() for path in exports.values())
    assert len(exports) == 11

    provenance = {
        ticker: DataProvenance(
            ticker=ticker,
            source="controlled test fixture",
            requested_start="2024-01-01",
            requested_end="2025-01-01",
            actual_start="2024-01-01",
            actual_end="2024-12-27",
            retrieved_at_utc=datetime.now(timezone.utc).isoformat(),
            interval="1d",
            auto_adjust=False,
            observations=len(frame),
            pandas_version=pd.__version__,
            yfinance_version="test",
        )
        for ticker, frame in data.items()
    }
    report = write_markdown_report(
        tmp_path / "outputs" / "reports" / "report.md",
        title="Test report",
        summary=summary,
        findings=["Calculated test finding."],
        metadata=provenance,
        price_basis="test close",
    )
    text = report.read_text()
    assert "Educational historical analysis only" in text
    assert "Calculated test finding" in text
    assert "controlled test fixture" in text
