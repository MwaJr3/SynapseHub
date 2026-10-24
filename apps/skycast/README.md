# SkyCast — weather application (CLI)

Engineering catalogue **Project 11** (Intermediate).

## Overview
Search a city, see temperature and conditions plus humidity and wind (units
always explicit), a multi-day forecast, and favourite locations.

## API-integration engineering (as required)
- **API integration is isolated** behind `WeatherProvider` adapters;
  application logic never touches HTTP.
- **Credentials/config out of source control** (`.env.example` only; the
  provider is opt-in via `SKYCAST_PROVIDER=http` + explicit URLs).
- **Explicit network timeouts** (8s default) and **response-structure
  validation** — malformed responses raise `ProviderError`, never a fabricated
  reading.
- **Stale data honesty:** every reading carries `observed_at` and the provider
  name; simulated data is labelled `SIMULATED DEMO DATA` in the output.
- Units are displayed explicitly (°C, km/h, %) and the **timezone is shown**.

## Known environment limitation (documented, not hidden)
This build environment has no general internet access, so the default is the
**fixture provider** (deterministic, simulated). The HTTP adapter is implemented
and unit-tested against malformed/error responses; end-to-end live calls must be
verified where network access and provider terms permit.

## Usage
```bash
python3 -m app.cli weather Lusaka
python3 -m app.cli forecast Ndola
python3 -m app.cli fav add Lusaka && python3 -m app.cli fav list
```

## Testing
`python3 -m pytest tests/ -q` — simulated labelling, unknown-city errors,
provider configuration requirements, malformed-response handling, favourites.

## Limitations
Fixture data is fictional. No caching or charts yet (roadmap). Respect the
chosen provider's rate limits and terms.

## Future improvements
Caching with explicit freshness display, accessible weather summaries, charts,
location autocomplete.

## Modern features & performance notes (feature-candidate pass)
- **Unit conversions** (`units`): deterministic metric/imperial math with the
  unit echoed in the output (never ambiguous display).
- **Hourly series** (`hourly`): bounded 1..48-hour preview; incomplete records
  are flagged — **never interpolated or invented**.
- **Favourites** (`favourite`): named locations registry.
- Freshness/TTL cache labels and stale warnings (existing) remain the honesty
  surface for cached observations.
- Deferred candidates (with reasons): map views (assets/renderer out of
  scope); severe-weather push alerts (would need outbound notification infra).
