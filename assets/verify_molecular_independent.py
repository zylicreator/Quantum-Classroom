"""Independent cylindrical-quadrature checks of H2+ minimal LCAO.

This uses direct 2D rho,z integration of exp(-rA) and exp(-rB), not the
JavaScript engine's prolate-coordinate reduction or its analytic slab terms.
The only finite bounds below belong to this verification quadrature, not to
the simulation. A separate bounds/order expansion checks their numerical effect.
Requires NumPy and Node.js; no SciPy or downloaded atomic-data tables.
"""
import json
import math
import pathlib
import shutil
import subprocess
import sys
import numpy as np

HERE = pathlib.Path(__file__).resolve().parent
NODE = shutil.which('node')
if not NODE:
    raise RuntimeError('Node.js is required for the independent verification.')
js = "const m=require('./molecular_model.js'); console.log(JSON.stringify([.6,1,1.4,2,3,4,6,8].map(R=>({R,S:m.overlap(R),bonding:m.regionProbability(R,'bonding'),antibonding:m.regionProbability(R,'antibonding')}))))"
reference = json.loads(subprocess.check_output([NODE, '-e', js], cwd=HERE, text=True))
checks = 0
results = []

def quadrature(R, order, extent):
    nodes, weights = np.polynomial.legendre.leggauss(order)
    radial_breaks = [0, 0.5, 2, 6, 16, extent]
    # Split at nuclei and observation-region boundaries so atomic cusps and the
    # region's discontinuous indicator are not smeared by a quadrature panel.
    z_breaks = sorted(set([-extent-R/2, -R/2, -R/4, 0, R/4, R/2, extent+R/2]))
    S = math.exp(-R) * (1 + R + R*R/3)
    totals = np.zeros(5)  # atomic normalization, overlap, MO+/MO- norm, z^2 moment
    slab = np.zeros(2)
    for rlo, rhi in zip(radial_breaks[:-1], radial_breaks[1:]):
        rho = ((nodes+1)*(rhi-rlo)/2+rlo)[:, None]
        wr = (weights*(rhi-rlo)/2)[:, None]
        for zlo, zhi in zip(z_breaks[:-1], z_breaks[1:]):
            z = ((nodes+1)*(zhi-zlo)/2+zlo)[None, :]
            wz = (weights*(zhi-zlo)/2)[None, :]
            # The pi from phi^2 cancels with pi in the azimuthal Jacobian.
            a = np.exp(-np.sqrt(rho*rho+(z+R/2)**2))
            b = np.exp(-np.sqrt(rho*rho+(z-R/2)**2))
            measure = 2*rho*wr*wz
            plus = (a+b)**2/(2*(1+S))
            minus = (a-b)**2/(2*(1-S))
            totals += [np.sum(measure*a*a), np.sum(measure*a*b),
                       np.sum(measure*plus), np.sum(measure*minus), np.sum(measure*plus*z*z)]
            if zlo >= -R/4 and zhi <= R/4:
                slab += [np.sum(measure*plus), np.sum(measure*minus)]
    return totals, slab

def near(actual, expected, tolerance, description):
    global checks
    if abs(actual-expected) > tolerance:
        raise AssertionError(f'{description}: {actual}, expected {expected} +/- {tolerance}')
    checks += 1

for row in reference:
    R = row['R']
    totals, slab = quadrature(R, 96, 32)
    near(totals[0], 1, 2e-10, f'1s atomic normalization R={R}')
    near(totals[1], row['S'], 2e-10, f'overlap integral R={R}')
    near(totals[2], 1, 2e-10, f'bonding normalization R={R}')
    near(totals[3], 1, 2e-10, f'antibonding normalization R={R}')
    near(slab[0], row['bonding'], 1e-10, f'bonding central slab R={R}')
    near(slab[1], row['antibonding'], 1e-10, f'antibonding central slab R={R}')
    cross_z2 = math.exp(-R)*(1+R+9*R*R/20+7*R**3/60+R**4/60)
    expected_z2 = (1+R*R/4+cross_z2)/(1+row['S'])
    near(totals[4], expected_z2, 2e-10, f'analytic second-moment reference R={R}')
    results.append({'R': R, 'overlap_error': float(totals[1]-row['S']),
                    'normalization_error': [float(totals[2]-1), float(totals[3]-1)],
                    'slab_error': [float(slab[0]-row['bonding']), float(slab[1]-row['antibonding'])]})
    if R in [0.6, 2, 8]:
        expanded, expanded_slab = quadrature(R, 144, 40)
        for actual, expected in zip(totals, expanded):
            near(actual, expected, 2e-10, f'quadrature order/tail expansion R={R}')
        for actual, expected in zip(slab, expanded_slab):
            near(actual, expected, 1e-10, f'slab quadrature order/tail expansion R={R}')

report = {'status': 'PASS', 'checks': checks, 'method': 'direct cylindrical quadrature, 96 points/panel; checked against 144 points/panel and expanded bounds', 'results': results}
print(json.dumps(report, ensure_ascii=False, indent=2))
