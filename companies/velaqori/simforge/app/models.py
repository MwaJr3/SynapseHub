"""Physical models, separated from solvers and reporting (units explicit)."""
from __future__ import annotations

import math
from dataclasses import dataclass


class ModelError(ValueError):
    pass


@dataclass(frozen=True)
class RCDischarge:
    """Series RC discharge: v(t) = V0 * exp(-t / (R*C)). Units: V, ohm, F, s."""
    v0_volts: float
    r_ohms: float
    c_farads: float

    def validate(self) -> None:
        if self.v0_volts < 0:
            raise ModelError("Initial voltage must not be negative.")
        if self.r_ohms <= 0 or self.c_farads <= 0:
            raise ModelError("R and C must be positive (zero would make tau undefined).")

    @property
    def tau_seconds(self) -> float:
        return self.r_ohms * self.c_farads

    def voltage_at(self, t_seconds: float) -> float:
        if t_seconds < 0:
            raise ModelError("Time must not be negative.")
        return self.v0_volts * math.exp(-t_seconds / self.tau_seconds)


@dataclass(frozen=True)
class SpringMass:
    """Undamped spring-mass: x(t) = A*cos(sqrt(k/m)*t). Units: kg, N/m, m, s."""
    mass_kg: float
    stiffness_n_per_m: float
    amplitude_m: float

    def validate(self) -> None:
        if self.mass_kg <= 0 or self.stiffness_n_per_m <= 0:
            raise ModelError("Mass and stiffness must be positive.")
        if abs(self.amplitude_m) > 100:
            raise ModelError("Amplitude beyond the supported range (|A| <= 100 m).")

    @property
    def omega_rad_s(self) -> float:
        return math.sqrt(self.stiffness_n_per_m / self.mass_kg)

    @property
    def period_seconds(self) -> float:
        return 2 * math.pi / self.omega_rad_s


@dataclass(frozen=True)
class ResistorNetwork:
    """Series/parallel resistor networks (bounded size)."""
    values_ohms: tuple[float, ...]

    def validate(self) -> None:
        if not 1 <= len(self.values_ohms) <= 64:
            raise ModelError("Network size must be 1-64 resistors (bounded input).")
        if any(r <= 0 for r in self.values_ohms):
            raise ModelError("All resistances must be positive.")

    def series(self) -> float:
        return sum(self.values_ohms)

    def parallel(self) -> float:
        inv = sum(1.0 / r for r in self.values_ohms)
        return 1.0 / inv
