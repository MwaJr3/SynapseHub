# Stock Price Analysis — Comparative Time-Series Analytics

> Educational historical analysis only—not financial advice. Past performance, historical volatility, moving averages, drawdowns, and correlations do not predict future results.

## Scope and methodology

- **Price basis:** unadjusted closing price
- **Resampling:** Friday-ending weekly and calendar-month-end OHLCV; open=first, high=max, low=min, close=last, volume=sum.
- **Moving averages:** trailing 20- and 200-observation simple means with full-window warm-up.
- **Volatility:** standard deviation of daily percentage returns, annualized with √252.
- **Performance:** price-only; dividends are included only when the configured price series incorporates them.

## Data provenance

| ticker   | source                                                         | requested_start   | requested_end   | actual_start   | actual_end   |   observations | auto_adjust   | retrieved_at_utc                 |
|:---------|:---------------------------------------------------------------|:------------------|:----------------|:---------------|:-------------|---------------:|:--------------|:---------------------------------|
| AAPL     | documented archived market-data sample (explicit offline mode) | 2024-01-01        | 2026-09-01      | 2024-01-02     | 2026-08-28   |            667 | False         | 2026-10-19T06:40:47.333264+00:00 |
| MSFT     | documented archived market-data sample (explicit offline mode) | 2024-01-01        | 2026-09-01      | 2024-01-02     | 2026-08-28   |            667 | False         | 2026-10-19T06:40:47.341264+00:00 |

Downloaded/source observations are kept separate from derived tables. Provider data may be delayed, incomplete, or revised.

## Computed summary

| Ticker   | Start date   | End date   |   Observations | First close   | Last close   | Absolute price change   | Percentage price change   | CAGR   | Mean daily return   | Median daily return   | Daily return std   | Annualized volatility   | Maximum drawdown   | Minimum close   | Maximum close   |   Mean daily volume |   Median daily volume |   Total observed volume | Approx. mean daily turnover   |
|:---------|:-------------|:-----------|---------------:|:--------------|:-------------|:------------------------|:--------------------------|:-------|:--------------------|:----------------------|:-------------------|:------------------------|:-------------------|:----------------|:----------------|--------------------:|----------------------:|------------------------:|:------------------------------|
| AAPL     | 2024-01-02   | 2026-08-28 |            667 | $185.64       | $319.70      | $134.06                 | 72.22%                    | 22.74% | 0.10%               | 0.13%                 | 1.74%              | 27.70%                  | -33.43%            | $165.00         | $340.08         |          54,293,628 |            48,073,400 |          36,213,849,800 | $12,598,379,334               |
| MSFT     | 2024-01-02   | 2026-08-28 |            667 | $370.87       | $513.53      | $142.66                 | 38.47%                    | 13.05% | 0.06%               | 0.08%                 | 1.69%              | 26.86%                  | -34.91%            | $352.83         | $542.07         |          25,163,769 |            21,502,200 |          16,784,233,800 | $10,863,536,456               |

## Data-driven findings

1. Calculated result: AAPL had the largest price-only change in the selected window (72.2%).
2. Calculated result: AAPL had the greatest annualized historical daily-return variability (27.7%, using √252).
3. Observed fact: AAPL had the higher mean share volume in this sample (54.3 million shares/day). This does not establish company size, liquidity quality, or investor intent.
4. Observed relationship: on 2026-08-28, AAPL's close was above its 200-session moving average. This is descriptive, not a signal.
5. Observed relationship: on 2026-08-28, MSFT's close was above its 200-session moving average. This is descriptive, not a signal.
6. Calculated result: AAPL and MSFT daily returns had a 0.34 Pearson correlation on common dates. Historical correlation is association, not causation, and can change.
7. Methodological observation: weekly and monthly closes use the last available close in each period, reducing plotted point density without averaging closing prices.
8. Unresolved explanation: prices and volumes alone cannot establish why any observed move occurred; no news or causal narrative is inferred.

## Generated figures

- `outputs/figures/aapl-msft_20240101_20260901_aapl_daily_close.png`
- `outputs/figures/aapl-msft_20240101_20260901_msft_daily_close.png`
- `outputs/figures/aapl-msft_20240101_20260901_comparative_nominal_close.png`
- `outputs/figures/aapl-msft_20240101_20260901_normalized_price_performance.png`
- `outputs/figures/aapl-msft_20240101_20260901_aapl_frequency_comparison.png`
- `outputs/figures/aapl-msft_20240101_20260901_msft_frequency_comparison.png`
- `outputs/figures/aapl-msft_20240101_20260901_aapl_moving_averages.png`
- `outputs/figures/aapl-msft_20240101_20260901_msft_moving_averages.png`
- `outputs/figures/aapl-msft_20240101_20260901_volume_comparison.png`
- `outputs/figures/aapl-msft_20240101_20260901_rolling_historical_volatility.png`
- `outputs/figures/aapl-msft_20240101_20260901_historical_drawdowns.png`
- `outputs/figures/aapl-msft_20240101_20260901_daily_return_correlation.png`

## Limitations

Historical observations do not predict future results. Nominal share prices and raw share volumes are not measures of company value. Correlation does not establish causation. Price-only performance may exclude distributions. Different listing histories, calendars, missing observations, and provider adjustments can affect comparisons. No recommendation to buy or sell a security is made.
