"""Independent atomic verification: SciPy references, normalization and sampling.

SciPy is a verification-only dependency. The production core imports only NumPy.
"""
import argparse
import json
import math
from pathlib import Path
import platform

import numpy as np

from .core.hydrogen import STATES, CLASSROOM_STATES, HydrogenOrbital, OrbitalSampler
from .core.atoms import AtomicModel, AtomicSampler, configuration


def verify():
    try:
        from scipy.integrate import quad
        from scipy.special import eval_genlaguerre, lpmv
        import scipy
    except ImportError as error:
        raise RuntimeError('Independent atomic verification needs: pip install -e ".[science-test]"') from error
    checks = 0
    maximum_error = 0.

    def near(actual, expected, tolerance, label):
        nonlocal checks
        if not np.all(np.isfinite(actual)) or not np.all(np.abs(np.asarray(actual)-expected) <= tolerance):
            raise AssertionError(f'{label}: {actual}, expected {expected} ± {tolerance}')
        checks += 1

    def reference_radial(n, l, r):
        rho = 2*np.asarray(r)/n
        return 2/n**2*math.sqrt(math.factorial(n-l-1)/math.factorial(n+l))*np.exp(-rho/2)*rho**l*eval_genlaguerre(n-l-1, 2*l+1, rho)

    u, weights = np.polynomial.legendre.leggauss(48)
    phi = np.arange(128)*2*math.pi/128
    uu, pp = u[:, None], phi[None, :]
    measure = weights[:, None]*2*math.pi/128
    directions = [np.sqrt(1-uu**2)*np.cos(pp), np.sqrt(1-uu**2)*np.sin(pp), np.broadcast_to(uu, (48, 128))]
    angular = {}
    radial_cases = sorted({(s.n, s.l) for s in STATES.values()})
    for n, l in radial_cases:
        o = HydrogenOrbital(next(k for k, s in STATES.items() if (s.n, s.l) == (n, l)))
        for r in [0, .01, .5, 1, 2, 4, 8, 16, 32, 64, 100]:
            near(o.radial_amplitude(r), reference_radial(n, l, r), 3e-14, 'independent Laguerre amplitude')
            reference = quad(lambda t: t*t*reference_radial(n, l, t)**2, 0, r, epsabs=2e-12, epsrel=2e-12)[0]
            error = abs(o.probability(r)-reference)
            maximum_error = max(maximum_error, error)
            near(o.probability(r), reference, 2e-11, 'independent sphere integral')
        for power, expected in [(0, 1), (1, o.mean_radius), (2, o.mean_radius_squared)]:
            actual = quad(lambda r: r**power*o.radial_density(r), 0, np.inf, epsabs=2e-10, epsrel=2e-11, limit=250)[0]
            near(actual, expected, 2e-10*max(1, expected), 'radial normalization/moment')
        if len(o.nodes) != n-l-1:
            raise AssertionError('Incorrect radial node count')
        near(o.radial_amplitude(o.nodes), 0, 3e-13, 'radial nodes')
    for spec in STATES.values():
        key = spec.l, spec.m, spec.kind
        if key in angular:
            continue
        l, m = spec.l, spec.m
        ref = math.sqrt((2*l+1)/(4*math.pi)*math.factorial(l-m)/math.factorial(l+m))*lpmv(m, l, uu)*(-1)**m
        if m:
            ref = math.sqrt(2)*ref*(np.cos(m*pp) if spec.kind == 'cos' else np.sin(m*pp))
        ref = np.broadcast_to(ref, (48, 128))
        actual = HydrogenOrbital(spec.id).angular_amplitude(uu, pp)
        near(actual, ref, 3e-14, 'independent associated Legendre basis')
        angular[key] = ref
    for key, a in angular.items():
        for other, b in angular.items():
            near(np.sum(a*b*measure), float(key == other), 2e-13, 'real harmonic orthogonality')
    hydrogen_samples = 0
    for index, (state, spec) in enumerate(STATES.items()):
        orbital = HydrogenOrbital(state)
        count = 20_000
        points = OrbitalSampler(orbital, 51731+index).take(count)
        r = np.linalg.norm(points, axis=1)
        variance = orbital.mean_radius_squared-orbital.mean_radius**2
        near(r.mean(), orbital.mean_radius, 6.5*math.sqrt(variance/count), f'{state} radius mean')
        near((r*r).mean(), orbital.mean_radius_squared, 6.5*math.sqrt((r*r).var(ddof=1)/count), f'{state} second moment')
        p = orbital.probability(orbital.mean_radius)
        near((r <= orbital.mean_radius).mean(), p, 6.5*math.sqrt(p*(1-p)/count)+1/count, f'{state} sphere frequency')
        ref = angular[spec.l, spec.m, spec.kind]
        for axis in range(3):
            expected = np.sum(directions[axis]**2*ref**2*measure)
            variance = np.sum(directions[axis]**4*ref**2*measure)-expected**2
            near(((points[:, axis]/r)**2).mean(), expected, 6.5*math.sqrt(max(variance, 0)/count)+1e-14, f'{state} angular moment')
        tail = max(0., 1-orbital.probability(orbital.extent))
        # Some high-n display extents have <<1 expected tail sample: requiring
        # a nonzero count there would be an invalid statistical acceptance rule.
        near((r > orbital.extent).mean(), tail, 6.5*math.sqrt(tail*(1-tail)/count)+2/count, f'{state} drawing-window tail')
        hydrogen_samples += count
    # Reference Slater examples, independent of JS parity checks.
    for z, key, expected in [(6, '1s', 5.7), (6, '2p', 3.25), (26, '1s', 25.7), (26, '2s', 21.85),
                              (26, '2p', 21.85), (26, '3s', 14.75), (26, '3p', 14.75), (26, '3d', 6.25), (26, '4s', 3.75)]:
        near(next(s.charge for s in configuration(z) if s.key == key), expected, 1e-12, 'Slater C/Fe reference')
    shell_cases = 0
    whole_samples = 0
    for z in range(1, 119):
        shells = configuration(z)
        if sum(s.electrons for s in shells) != z:
            raise AssertionError('Non-neutral electron count')
        for shell in shells:
            if not (0 < shell.electrons <= 2*(2*shell.l+1) and 0 < shell.charge <= z):
                raise AssertionError('Invalid subshell occupancy or charge')
            state = next(k for k, s in STATES.items() if s.subshell == shell.key)
            model = AtomicModel('orbital', z, state)
            points = AtomicSampler(model, 80011+z*31+shell.n*7+shell.l).take(2500)
            r = np.linalg.norm(points, axis=1)
            variance = model.mean_radius_squared-model.mean_radius**2
            near(r.mean(), model.mean_radius, 6.5*math.sqrt(variance/2500), 'screened radius mean')
            p = model.region_probability
            near(model.in_region(points).mean(), p, 6.5*math.sqrt(p*(1-p)/2500)+1/2500, 'screened sphere')
            shell_cases += 1
        model, count = AtomicModel('whole', z), 10_000
        sampler = AtomicSampler(model, 99109+z)
        points = sampler.take(count)
        r = np.linalg.norm(points, axis=1)
        near(r.mean(), model.mean_radius, 6.5*math.sqrt((model.mean_radius_squared-model.mean_radius**2)/count), 'whole-atom mean')
        near(((points[:, 2]/r)**2).mean(), 1/3, 6.5*math.sqrt((1/5-1/9)/count), 'whole-atom spherical average')
        p = model.region_probability
        near(model.in_region(points).mean(), p, 6.5*math.sqrt(p*(1-p)/count)+1/count, 'whole-atom sphere')
        for index, shell in enumerate(shells):
            weight = shell.electrons/z
            near((sampler.last_channels == index).mean(), weight, 6.5*math.sqrt(weight*(1-weight)/count)+1/count, 'mixture electron weights')
        near(model.probability(0), 0, 0, 'CDF at origin')
        near(model.probability(model.extent*20), 1, 2e-11, 'expanded CDF')
        near(model.density([0, 0, 0]), model.density([0, 0, 0]), 0, 'finite mixture density at origin')
        whole_samples += count
    return dict(status='PASS', checks=checks, python=platform.python_version(), numpy=np.__version__, scipy=scipy.__version__,
                classroom_orbitals=len(CLASSROOM_STATES), internal_orbitals=len(STATES), radial_distributions=len(radial_cases),
                real_angular_functions=len(angular), elements=118, screened_subshells=shell_cases,
                sampled_measurements=hydrogen_samples+shell_cases*2500+whole_samples,
                maximum_sphere_integral_error=float(maximum_error), statistical_tolerance='6.5 standard errors; +1/N for region/channel frequencies',
                scope='H-U reference configurations; Z=93..118 ideal filling illustration, not observed ground states; no SCF/relativistic/correlation model')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args(argv)
    report = verify()
    payload = json.dumps(report, indent=2)
    if args.output:
        args.output.write_text(payload+'\n', encoding='utf-8')
    print(payload)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
