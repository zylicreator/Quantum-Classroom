import json
from pathlib import Path
import shutil
import subprocess
import sys

import numpy as np
import pytest

from quantum_classroom.core import Experiment, H2Plus, Sampler
from quantum_classroom.verify import verify


def test_independent_integrals_and_statistics():
    assert verify()["status"] == "PASS"


@pytest.mark.parametrize("state", ["bonding", "antibonding"])
@pytest.mark.parametrize("seed", [0, 891013, "课堂实验"])
def test_seed_and_arbitrary_chunk_prefixes(state, seed):
    model = H2Plus(.6, state)
    whole = Sampler(model, seed).take(10_000)
    stream = Sampler(model, seed)
    chunks = np.concatenate([stream.take(n) for n in [0, 1, 17, 521, 9461]])
    np.testing.assert_array_equal(chunks, whole)
    np.testing.assert_array_equal(Sampler(model, seed).take(19), whole[:19])
    assert not np.array_equal(Sampler(model, "different").take(19), whole[:19])


@pytest.mark.parametrize("R", [0, .59, 8.01, float("nan"), float("inf"), True, "2"])
def test_invalid_separation(R):
    with pytest.raises(ValueError):
        H2Plus(R)


@pytest.mark.parametrize("count", [-1, .2, True])
def test_invalid_counts(count):
    with pytest.raises(ValueError):
        Sampler().take(count)


@pytest.mark.parametrize("seed", [-1, .5, None, float("nan"), True])
def test_invalid_seed(seed):
    with pytest.raises(ValueError):
        Sampler(seed=seed)


def test_model_boundaries_and_axis():
    model = H2Plus(2, "antibonding")
    assert not model.in_region([0, 0, .5])
    assert model.in_region([1e9, -1e9, 0])
    assert model.amplitude([1, 0, 1e-16]) < 0
    assert model.amplitude([1, 0, -1e-16]) > 0
    axis = model.axis_data()
    assert axis["z"][120] == axis["density"][120] == 0
    assert axis["incoherent"][120] > 0
    for call in [lambda: H2Plus(state="wrong"), lambda: model.amplitude([0, 1]),
                 lambda: model.density([0, 0, np.nan]), lambda: model.atomic_amplitude([0, 0, 0], "C"),
                 lambda: model.axis_data(1), lambda: model.axis_data(extent=0)]:
        with pytest.raises(ValueError):
            call()


def test_all_measurements_export_and_display_limit(tmp_path):
    experiment = Experiment(H2Plus(2, "antibonding"), "export seed")
    assert experiment.frequency is None
    assert experiment.record()["statistics"]["mean"] is None
    points = Sampler(experiment.model, experiment.seed).take(100_000)
    experiment.append(points[:70_000])
    experiment.append(points[70_000:])
    assert len(experiment.display_points()) == 50_000
    assert experiment.hits == int((np.abs(points[:, 2]) < .5).sum())
    n, f = experiment.convergence()
    assert n[-1] == 100_000 and f[-1] == experiment.frequency
    with pytest.raises(ValueError):
        experiment.append([[0, 0, 0]])
    with pytest.raises(ValueError):
        experiment.points[0] = 0
    output = tmp_path / "record.json"
    experiment.export(output, "en")
    record = json.loads(output.read_text())
    assert record["language"] == "en"
    assert record["sampling"]["seed"] == experiment.seed
    assert record["statistics"]["count"] == 100_000
    np.testing.assert_array_equal(record["measurements"], points)


def test_core_does_not_import_qt():
    subprocess.run([sys.executable, "-c", "import sys; from quantum_classroom.core import H2Plus; assert not any(x.startswith('PySide6') for x in sys.modules)"], check=True)


def test_javascript_deterministic_parity():
    if not shutil.which("node"):
        pytest.skip("Node.js unavailable; cross-language parity explicitly not run")
    root = Path(__file__).resolve().parents[2]
    model_file = root / "assets/molecular_model.js"
    if not model_file.exists():
        pytest.skip("JS source unavailable in this installed distribution")
    code = """
const m=require(process.argv[1]);
const rows=[];
for(const R of [.6,1,1.4,2,3,4,6,8]) for(const state of ['bonding','antibonding']) {
  const points=[[0,0,0],[.2,-.4,.7],[2,1,-3],[0,0,R/2],[1,2,1e-9]];
  rows.push({R,state,overlap:m.overlap(R),probability:m.regionProbability(R,state),
    psi:points.map(p=>m.amplitude(R,state,...p)),axis:m.axisData(R,state,17)});
}
console.log(JSON.stringify(rows));
"""
    rows = json.loads(subprocess.check_output(["node", "-e", code, str(model_file)], text=True))
    for row in rows:
        m = H2Plus(row["R"], row["state"])
        points = [[0, 0, 0], [.2, -.4, .7], [2, 1, -3], [0, 0, m.R/2], [1, 2, 1e-9]]
        assert abs(m.overlap - row["overlap"]) < 2e-15
        assert abs(m.region_probability - row["probability"]) < 1e-10
        np.testing.assert_allclose(m.amplitude(points), row["psi"], atol=3e-15, rtol=0)
        for key, values in m.axis_data(17).items():
            np.testing.assert_allclose(values, [a[key] for a in row["axis"]], atol=3e-15, rtol=0)
