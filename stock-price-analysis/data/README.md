# Offline market-data snapshots

These files let the educational notebook run when Yahoo Finance cannot be reached. They are fallback inputs only: under normal conditions, the notebook downloads the same schema directly with `yfinance`.

| File | Ticker | First observation | Last observation | Rows |
| --- | --- | --- | --- | ---: |
| `AAPL.csv` | Apple Inc. | 2019-01-02 | 2026-08-28 | 1,925 |
| `MSFT.csv` | Microsoft Corp. | 2019-01-02 | 2026-08-28 | 1,925 |

Schema: `Date`, `Adj Close`, `Close`, `High`, `Low`, `Open`, `Volume`.

## Provenance

The snapshots were copied from the MIT-licensed [`fja05680/brownbear`](https://github.com/fja05680/brownbear) symbol cache at commit [`4e9cde8102829208a00d576cbd50685083d4a590`](https://github.com/fja05680/brownbear/commit/4e9cde8102829208a00d576cbd50685083d4a590), accessed 2026-10-19. The upstream repository's MIT license is reproduced in [`LICENSE`](LICENSE).

Market data is informational and can contain omissions, revisions, or provider-specific adjustments. The notebook validates the schema, dates, duplicates, missing values, and non-negative volume before analysis.
