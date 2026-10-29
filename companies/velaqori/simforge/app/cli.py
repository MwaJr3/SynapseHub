"""CLI: run simulations and export reproducible reports."""
from __future__ import annotations

import argparse
import sys

from app.models import ModelError, RCDischarge, ResistorNetwork, SpringMass
from app.report import export
from app.solvers import SolverError, sensitivity, sweep


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="simforge", description="Engineering simulation toolkit.")
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("rc"); p.add_argument("v0", type=float); p.add_argument("r", type=float); p.add_argument("c", type=float)
    p.add_argument("--at", type=float, help="Evaluate voltage at t seconds.")
    p.add_argument("--report", help="Export a reproducible JSON report.")
    p = sub.add_parser("spring"); p.add_argument("mass", type=float); p.add_argument("k", type=float); p.add_argument("amplitude", type=float)
    p.add_argument("--sweep-mass", nargs=3, type=float, metavar=("START", "STOP", "POINTS"))
    p.add_argument("--report", help="Export a reproducible JSON report.")
    p = sub.add_parser("resistors"); p.add_argument("values", nargs="+", type=float)
    args = parser.parse_args(argv)
    try:
        if args.command == "rc":
            model = RCDischarge(args.v0, args.r, args.c); model.validate()
            results = {"tau_seconds": model.tau_seconds}
            if args.at is not None:
                results["voltage_at_t_volts"] = round(model.voltage_at(args.at), 6)
            print(results)
            if args.report:
                export(args.report, "RC discharge", {"v0_volts": args.v0, "r_ohms": args.r, "c_farads": args.c},
                       ["ideal components; no leakage; constant R and C"],
                       results, ["tau = R*C", "v(t) = V0 * exp(-t/tau)"])
                print(f"wrote {args.report}")
        elif args.command == "spring":
            model = SpringMass(args.mass, args.k, args.amplitude); model.validate()
            results = {"omega_rad_s": model.omega_rad_s, "period_seconds": model.period_seconds}
            if args.sweep_mass:
                start, stop, points = args.sweep_mass
                rows = sweep(SpringMass, "mass_kg", [start + (stop - start) * i / (int(points) - 1) for i in range(int(points))],
                             stiffness_n_per_m=args.k, amplitude_m=args.amplitude)
                results["sweep"] = [{"mass_kg": m.mass_kg, "period_seconds": m.period_seconds} for m in
                                    (row[1] for row in rows)]
            print(results)
            if args.report:
                export(args.report, "Spring-mass oscillator",
                       {"mass_kg": args.mass, "stiffness_n_per_m": args.k, "amplitude_m": args.amplitude},
                       ["undamped; linear spring; point mass"],
                       results, ["omega = sqrt(k/m)", "T = 2*pi/omega"])
                print(f"wrote {args.report}")
        else:
            net = ResistorNetwork(tuple(args.values)); net.validate()
            print({"series_ohms": net.series(), "parallel_ohms": net.parallel()})
        return 0
    except (ModelError, SolverError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
