import json
from pathlib import Path
import shutil
import subprocess
import sys

import numpy as np
import pytest

from quantum_classroom.core import AtomicModel, AtomicSampler, AtomicExperiment, HydrogenOrbital, OrbitalSampler
from quantum_classroom.core.atoms import configuration
from quantum_classroom.core.hydrogen import STATES, CLASSROOM_STATES, RadialStream, radial_info


def test_independent_atomic_verification():
    pytest.importorskip('scipy')
    from quantum_classroom.verify_atoms import verify
    report = verify()
    assert report['status'] == 'PASS'
    assert report['screened_subshells'] == 1379


def test_h_u_nist_reference_facts():
    fixture = json.loads((Path(__file__).parent/'fixtures/nist_h_u.json').read_text())
    assert len(fixture['rows']) == 92
    for row in fixture['rows']:
        assert {s.key: s.electrons for s in configuration(row['Z'])} == row['occupancy']
    assert AtomicModel('whole', 92).reference
    assert not AtomicModel('whole', 93).reference
    assert 'not an observed' in AtomicModel('whole', 118).metadata()['configuration_source']


@pytest.mark.parametrize('model', [AtomicModel(), AtomicModel(state='4fxyz'), AtomicModel('orbital', 26, '3dxz'), AtomicModel('whole', 29), AtomicModel('whole', 118)])
@pytest.mark.parametrize('seed', [0, '量子课堂'])
def test_chunk_reproducibility(model, seed):
    all_points = AtomicSampler(model, seed).take(8000)
    sampler = AtomicSampler(model, seed)
    pieces = [sampler.take(n) for n in [0, 1, 17, 511, 7471]]
    np.testing.assert_array_equal(np.concatenate(pieces), all_points)
    np.testing.assert_array_equal(AtomicSampler(model, seed).take(9), all_points[:9])
    assert not np.array_equal(AtomicSampler(model, 'different').take(9), all_points[:9])


def test_catalog_node_planes_and_phase():
    assert len(CLASSROOM_STATES) == 30 and len(STATES) == 78
    assert HydrogenOrbital('2px').amplitude([0, 1, 2]) == pytest.approx(0, abs=1e-15)
    assert HydrogenOrbital('3dxy').amplitude([1, 0, 2]) == 0
    assert HydrogenOrbital('4fxyz').amplitude([1, 2, 0]) == 0
    for name in CLASSROOM_STATES:
        model = HydrogenOrbital(name)
        p = np.array([[.2, .5, .7], [-2, 1, 4]])
        np.testing.assert_allclose(model.amplitude(-p), (-1)**model.spec.l*model.amplitude(p), atol=1e-14)


def test_radial_proposal_reaches_unbounded_tail():
    # Force a legitimate tail proposal in every radial-node distribution.
    for n, l in sorted({(s.n, s.l) for s in STATES.values()}):
        info = radial_info(n, l)
        if info['k'] == 0:
            continue
        class TailRandom:
            def random(self, shape):
                return np.broadcast_to([0, 1-np.exp(-info['tail_rate']), 1-1e-15], shape)
        orbital = HydrogenOrbital(next(k for k, s in STATES.items() if (s.n, s.l) == (n, l)))
        radius = RadialStream(orbital, TailRandom()).take(3)
        assert np.all(radius > info['start']*n/2)
    r = np.linalg.norm(OrbitalSampler(HydrogenOrbital(), 8123).take(100_000), axis=1)
    assert np.any(r > 6)


def test_observation_sphere_recounts_all_points_and_export(tmp_path):
    model = AtomicModel('whole', 118)
    experiment = AtomicExperiment(model, 99)
    points = AtomicSampler(model, 99).take(100_000)
    experiment.append(points)
    assert len(experiment.display_points()) == 50_000
    experiment.set_radius(model.radius/2)
    np.testing.assert_array_equal(experiment.points, points)
    assert experiment.hits == int((np.linalg.norm(points, axis=1) <= model.radius/2).sum())
    assert experiment.convergence()[1][-1] == experiment.frequency
    destination = tmp_path/'atomic.json'
    experiment.export(destination, 'en')
    record = json.loads(destination.read_text())
    assert record['format'] == 'QuantumClassroomAtom'
    assert record['model']['state'] is None
    assert 'ideal filling' in record['model']['configuration_source']
    assert record['statistics']['count'] == len(record['measurements']) == 100_000
    with pytest.raises(ValueError):
        model.amplitude([1, 2, 3])
    with pytest.raises(ValueError):
        experiment.set_radius(-1)


@pytest.mark.parametrize('z', [0, 119, -1, 1.2, True])
def test_invalid_elements(z):
    with pytest.raises(ValueError):
        AtomicModel('whole', z)


def test_invalid_models_and_sphere_boundary():
    for action in [lambda: AtomicModel('bad'), lambda: AtomicModel(z=2), lambda: AtomicModel('orbital', 1, '2pz'),
                   lambda: AtomicModel(state='bad'), lambda: AtomicModel(radius=np.nan), lambda: AtomicSampler().take(-1),
                   lambda: HydrogenOrbital(charge=0), lambda: HydrogenOrbital().probability(-1)]:
        with pytest.raises(ValueError):
            action()
    assert AtomicModel(radius=1).in_region([1, 0, 0])
    assert not AtomicModel(radius=1).in_region([1.001, 0, 0])


def test_atomic_import_without_qt_or_scipy():
    subprocess.run([sys.executable, '-c', "import sys; from quantum_classroom.core import AtomicModel, AtomicSampler; AtomicSampler(AtomicModel('whole', 118)).take(20); assert not any(n.startswith(('PySide6', 'scipy')) for n in sys.modules)"], check=True)


def test_javascript_atomic_parity():
    if not shutil.which('node'):
        pytest.skip('Node.js unavailable; atomic cross-language check not run')
    root = Path(__file__).resolve().parents[2]
    if not (root/'assets/atom_model.js').exists():
        pytest.skip('Original JS assets not present in this source distribution')
    script = r'''
const M=require('./assets/electron_model.js'),A=require('./assets/atom_model.js');
const orbitals=Object.values(M.states).map(s=>({id:s.id,nodes:M.radialInfo(s).nodes,
 radial:[0,.1,1,4,16,64].map(r=>[r,M.radialAmplitude(s,r),M.radialDensity(s,r),M.probability(s,r)]),
 angular:[[-.9,.1],[0,.7],[.7,2.1]].map(([u,p])=>M.angularAmplitude(s,u,p))}));
const elements=Array.from({length:118},(_,i)=>{const a=A.atom(i+1),w=A.wholeAtom(i+1);return {z:i+1,reference:a.reference,
 shells:a.subshells.map(s=>({key:s.key,electrons:s.electrons,charge:s.effectiveCharge,shielding:s.sigma})),
 mean:w.spec.meanRadius,second:w.spec.meanRadiusSquared,probability:w.probability(w.spec.meanRadius),density:w.spatialDensity(.2,.3,.5)};});
console.log(JSON.stringify({orbitals,elements}));
'''
    data = json.loads(subprocess.check_output(['node', '-e', script], cwd=root, text=True))
    for row in data['orbitals']:
        o = HydrogenOrbital(row['id'])
        np.testing.assert_allclose(o.nodes, row['nodes'], atol=3e-10, rtol=0)
        for r, amplitude, density, probability in row['radial']:
            assert o.radial_amplitude(r) == pytest.approx(amplitude, abs=3e-14)
            assert o.radial_density(r) == pytest.approx(density, abs=3e-14)
            assert o.probability(r) == pytest.approx(probability, abs=2e-11)
        np.testing.assert_allclose(o.angular_amplitude([-.9, 0, .7], [.1, .7, 2.1]), row['angular'], atol=3e-14, rtol=0)
    for row in data['elements']:
        model = AtomicModel('whole', row['z'])
        assert model.reference == row['reference']
        for actual, expected in zip(model.shells, row['shells'], strict=True):
            assert actual.key == expected['key'] and actual.electrons == expected['electrons']
            assert actual.charge == pytest.approx(expected['charge'], abs=1e-12)
            assert actual.shielding == pytest.approx(expected['shielding'], abs=1e-12)
        assert model.mean_radius == pytest.approx(row['mean'], abs=1e-12)
        assert model.mean_radius_squared == pytest.approx(row['second'], abs=1e-12)
        assert model.region_probability == pytest.approx(row['probability'], abs=2e-11)
        assert model.density([.2, .3, .5]) == pytest.approx(row['density'], abs=1e-12)
