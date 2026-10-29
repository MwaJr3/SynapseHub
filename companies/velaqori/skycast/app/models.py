"""Weather domain model with explicit units and observation time."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class DayForecast:
    date: str
    high_c: float
    low_c: float
    conditions: str


@dataclass
class WeatherReading:
    city: str
    country: str
    temperature_c: float
    conditions: str
    humidity_pct: int
    wind_kph: float
    timezone: str
    observed_at: str            # ISO timestamp of the source data (never stale-as-current)
    forecast: list[DayForecast] = field(default_factory=list)
    provider: str = "unknown"
    simulated: bool = False     # honest labelling: demo data vs live data
