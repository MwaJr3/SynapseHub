# Archived sample market data

These two files are an **explicit offline sample**, not an automatic fallback and not live data. The executed notebook uses them because Yahoo Finance is unreachable in the build environment. Set `STOCK_ANALYSIS_DATA_MODE=live` to request fresh data through `yfinance`; a failed live request raises an actionable error and is never replaced silently.

| File | Ticker | First observation | Last observation | Rows |
| --- | --- | --- | --- | ---: |
| `AAPL.csv` | Apple Inc. | 2024-01-02 | 2026-08-28 | 667 |
| `MSFT.csv` | Microsoft Corp. | 2024-01-02 | 2026-08-28 | 667 |

The files were selected from the MIT-licensed [`fja05680/brownbear`](https://github.com/fja05680/brownbear) symbol cache at commit [`4e9cde8102829208a00d576cbd50685083d4a590`](https://github.com/fja05680/brownbear/commit/4e9cde8102829208a00d576cbd50685083d4a590), accessed 2026-10-19. The upstream license is reproduced in [`LICENSE`](LICENSE).

They use a yfinance-compatible schema: `Date`, `Adj Close`, `Close`, `High`, `Low`, `Open`, `Volume`. Data can be delayed, corrected, incomplete, or adjusted differently by another provider. These observations are committed only to make the portfolio notebook inspectable offline; downloaded cache files remain ignored.
