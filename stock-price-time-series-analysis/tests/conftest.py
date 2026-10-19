from __future__ import annotations

import numpy as np
import pandas as pd
import pytest


@pytest.fixture
def daily_ohlcv() -> pd.DataFrame:
    index = pd.bdate_range("2024-01-01", periods=260, name="Date")
    close = pd.Series(np.arange(100.0, 360.0), index=index)
    return pd.DataFrame(
        {
            "Open": close - 0.5,
            "High": close + 1.0,
            "Low": close - 1.0,
            "Close": close,
            "Adj Close": close * 0.99,
            "Volume": np.arange(1_000, 1_260),
        },
        index=index,
    )


@pytest.fixture
def one_week() -> pd.DataFrame:
    index = pd.bdate_range("2024-01-01", periods=5, name="Date")
    return pd.DataFrame(
        {
            "Open": [10, 12, 11, 14, 15],
            "High": [13, 15, 14, 17, 18],
            "Low": [9, 10, 8, 12, 13],
            "Close": [12, 11, 13, 16, 17],
            "Adj Close": [12, 11, 13, 16, 17],
            "Volume": [100, 200, 300, 400, 500],
        },
        index=index,
    )
