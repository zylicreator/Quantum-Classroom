"""Headless verification, with cylindrical integration independent of core formulas."""
import argparse
import json
import math
from pathlib import Path
import platform

import numpy as np

from .core import H2Plus, Sampler


def cylindrical_integrals(R, order=96, extent=32):
    """Direct 3D integrals (azimuth integrated), with split cusp/slab panels.

    Does not call model amplitudes or the model's prolate slab reduction.
    Finite bounds here are verification quadrature bounds, never sampler bounds.
    Returns atomic norm, overlap, two MO norms, two slab probabilities.
    """
    nodes, weights = np.polynomial.legendre.leggauss(order)
    radial = [0, .5, 2, 6, 16, extent]
    axial = sorted({-extent-R/2, -R/2, -R/4, 0, R/4, R/2, extent+R/2})
    S = math.exp(-R) * (1 + R + R*R/3)
    total = np.zeros(6)
    for lo, hi in zip(radial[:-1], radial[1:]):
        rho = ((nodes + 1) * (hi-lo)/2 + lo)[:, None]
        wr = (weights * (hi-lo)/2)[:, None]
        for bottom, top in zip(axial[:-1], axial[1:]):
            z = ((nodes + 1) * (top-bottom)/2 + bottom)[None, :]
            wz = (weights * (top-bottom)/2)[None, :]
            a = np.exp(-np.sqrt(rho*rho + (z+R/2)**2))
            b = np.exp(-np.sqrt(rho*rho + (z-R/2)**2))
            measure = 2 * rho * wr * wz  # azimuth 2pi cancels 1/pi
            plus, minus = (a+b)**2 / (2*(1+S)), (a-b)**2 / (2*(1-S))
            total[:4] += [np.sum(measure*a*a), np.sum(measure*a*b),
                          np.sum(measure*plus), np.sum(measure*minus)]
            if bottom >= -R/4 and top <= R/4:
                total[4:] += [np.sum(measure*plus), np.sum(measure*minus)]
    return total


def verify(samples=100_000):
    if samples < 10_000:
        raise ValueError("Use at least 10000 measurements for statistical verification.")
    checks = 0

    def near(actual, expected, tolerance, label):
        nonlocal checks
        if not np.all(np.isfinite(actual)) or not np.all(np.abs(np.asarray(actual)-expected) <= tolerance):
            raise AssertionError(f"{label}: {actual}, expected {expected} ± {tolerance}")
        checks += 1

    integration, sampling = [], []
    for R in [.6, 1, 1.4, 2, 3, 4, 6, 8]:
        plus, minus = H2Plus(R), H2Plus(R, "antibonding")
        actual = cylindrical_integrals(R)
        expected = np.array([1, plus.overlap, 1, 1, plus.region_probability, minus.region_probability])
        near(actual, expected, 1e-10, f"independent cylindrical integrals R={R}")
        if R in [.6, 2, 8]:
            near(cylindrical_integrals(R, 144, 40), actual, 1e-10, f"quadrature order/tail expansion R={R}")
        integration.append({"R": R, "maximum_absolute_error": float(np.max(np.abs(actual-expected)))})
        coordinates = np.array([[0, 0, 0], [.2, -.4, .7], [2, 1, -3], [0, 0, R/2], [1, 2, 1e-9]])
        for model in (plus, minus):
            a, b = model.atomic_amplitude(coordinates, "A"), model.atomic_amplitude(coordinates, "B")
            near(model.amplitude(coordinates), (a+model.sign*b)/math.sqrt(2*(1+model.sign*model.overlap)), 3e-15, "LCAO amplitudes")
            reflected = coordinates * [1, 1, -1]
            near(model.amplitude(reflected), model.sign*model.amplitude(coordinates), 3e-15, "reflection parity")
            near(model.density(coordinates[:, [1, 0, 2]]), model.density(coordinates), 3e-15, "axial symmetry")
        near(minus.amplitude([[0, 0, 0], [1, 0, 0], [100, 50, 0]]), 0, 0, "nodal plane")

    # Fixed seeds and predeclared six-standard-error tolerances; never rerun to pass.
    for R in [.6, 2, 8]:
        for state in ("bonding", "antibonding"):
            model = H2Plus(R, state)
            sampler = Sampler(model, 891013)
            points = sampler.take(samples)
            p = model.region_probability
            f = float(model.in_region(points).mean())
            tolerance = 6*math.sqrt(p*(1-p)/samples) + 2/samples
            near(f, p, tolerance, "slab frequency")
            near((points[:, 2] > 0).mean(), .5, 3/math.sqrt(samples), "left/right balance")
            near(points.mean(axis=0), 0, 6*np.sqrt((points**2).mean(axis=0)/samples), "first moments")
            near((points**2).mean(axis=0), model.second_moments,
                 6*np.sqrt((points**2).var(axis=0, ddof=1)/samples), "second moments")
            acceptance = sampler.accepted / sampler.proposed
            expected_acceptance = sampler.expected_acceptance
            near(acceptance, expected_acceptance,
                 6*math.sqrt(expected_acceptance*(1-expected_acceptance)/sampler.proposed), "acceptance")
            distances = np.minimum(np.linalg.norm(points-[0, 0, R/2], axis=1),
                                   np.linalg.norm(points+[0, 0, R/2], axis=1))
            if samples >= 100_000 and not np.any(distances > 6):
                raise AssertionError("Expected tail samples beyond 6 a0 from both nuclei.")
            sampling.append({"R": R, "state": state, "count": samples, "probability": p,
                             "frequency": f, "tolerance": tolerance,
                             "max_nearest_nucleus": float(distances.max()),
                             "proposed": sampler.proposed, "accepted_including_buffer": sampler.accepted})
    return {"status": "PASS", "checks": checks, "python": platform.python_version(),
            "numpy": np.__version__, "integration": integration, "sampling": sampling,
            "method": "Direct cylindrical quadrature 96/144 nodes; bounds 32/40 a0; fixed-seed statistics with six-standard-error tolerances."}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=100_000)
    parser.add_argument("--output", type=Path, help="Optional JSON verification report")
    args = parser.parse_args(argv)
    if args.samples < 10_000:
        parser.error("--samples must be at least 10000")
    report = verify(args.samples)
    payload = json.dumps(report, indent=2, ensure_ascii=False)
    if args.output:
        args.output.write_text(payload + "\n", encoding="utf-8")
    print(payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
