# Stock Price Analysis

A reproducible Jupyter Notebook that uses Pandas time-series tools to compare Apple (`AAPL`) and Microsoft (`MSFT`) from **2019-01-01 to 2026-09-01**.

The analysis:

- downloads daily OHLCV market data with `yfinance`;
- parses `Date` and makes it a sorted `DatetimeIndex`;
- charts daily closing prices and normalized price performance;
- resamples daily observations into weekly and monthly OHLCV bars;
- calculates 20-session and 200-session simple moving averages with `.rolling()`;
- compares raw and 20-session-average trading volume; and
- reports total return, CAGR, annualized volatility, maximum drawdown, and average volume.

> This is an educational time-series analysis, not investment advice. Prices can differ by provider and may later be corrected.

## Run the notebook

From this directory:

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
python -m pip install -r requirements.txt
jupyter lab stock_price_analysis.ipynb
```

Choose **Run → Run All Cells**. The notebook tries Yahoo Finance first and records the source used for each ticker.

Yahoo Finance access is required to refresh data. When it is unavailable, the notebook automatically uses the bundled, read-only snapshots in [`data/`](data/README.md), so the complete analysis remains runnable. To deliberately test the offline path:

```bash
STOCK_DATA_OFFLINE=1 jupyter lab stock_price_analysis.ipynb
```

## Files

```text
stock-price-analysis/
├── stock_price_analysis.ipynb   # documented, executed analysis
├── requirements.txt             # Python dependencies
└── data/
    ├── AAPL.csv                 # offline snapshot
    ├── MSFT.csv                 # offline snapshot
    ├── README.md                # provenance and schema
    └── LICENSE                  # upstream snapshot license
```

## Reproducibility notes

- `START_DATE` and `END_DATE` are fixed rather than using a changing “last N years” window.
- `auto_adjust=False` is explicit in the `yfinance` request. The analysis uses `Close` to meet the project requirement and retains `Adj Close` for extensions involving dividends and split-adjusted return series.
- Weekly bars end on Friday (`W-FRI`). Monthly bars use calendar month-end (`ME`). Open, high, low, close, adjusted close, and volume each receive an appropriate aggregation rather than taking a mean of every field.
- Rolling windows count trading sessions—not calendar days—and do not emit a value until the full 20 or 200 observations are available.
