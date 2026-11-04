"""Portable record integrity, atomic writes and exact sampler continuation."""
from copy import deepcopy
import json
import os

import numpy as np
import pytest

from quantum_classroom.activities import ActivityBook, observation
from quantum_classroom.activities.state import parameters
from quantum_classroom.core import AtomicExperiment, AtomicModel, AtomicSampler, Experiment, H2Plus, Sampler
from quantum_classroom.core.groups import repeat_groups
from quantum_classroom.records import (RecordError, decode_session, default_view, load_session,
                                      save_session, session_record)


def workspace(exp):
    key = 'atomic' if isinstance(exp, AtomicExperiment) else 'molecular'
    return dict(experiment=exp.record(), view=default_view(key, exp.model))


def payload(atom=None, molecule=None, book=None):
    return session_record(dict(atomic=workspace(atom or AtomicExperiment()), molecular=workspace(molecule or Experiment())), book or ActivityBook())


@pytest.mark.parametrize('model', [AtomicModel('hydrogen', state='4fxyz'), AtomicModel('orbital', 26, '3dxz'), AtomicModel('whole', 118), H2Plus(2, 'bonding'), H2Plus(2, 'antibonding')])
@pytest.mark.parametrize('count', [0, 513])
def test_measurement_record_and_session_exact_continuation(model, count):
    atomic = isinstance(model, AtomicModel)
    exp = (AtomicExperiment if atomic else Experiment)(model, 312)
    sampler = (AtomicSampler if atomic else Sampler)(model, 312)
    exp.append(sampler.take(count))
    data = payload(atom=exp) if atomic else payload(molecule=exp)
    key = 'atomic' if atomic else 'molecular'
    current = decode_session(data).workspaces[key]
    np.testing.assert_array_equal(current.experiment.points, exp.points)
    assert current.experiment.run_id == exp.run_id
    np.testing.assert_array_equal(current.sampler.take(99), sampler.take(99))
    old = exp.record(); old.pop('run_id')
    standalone = decode_session(old)
    assert set(standalone.workspaces) == {key}
    np.testing.assert_array_equal(standalone.workspaces[key].experiment.points, exp.points)


def test_200000_coordinates_round_trip_without_display_truncation(tmp_path):
    atom = AtomicExperiment(AtomicModel('whole', 29), 15)
    molecule = Experiment(H2Plus(6, 'antibonding'), 16)
    for exp, sampler in [(atom, AtomicSampler(atom.model, atom.seed)), (molecule, Sampler(molecule.model, molecule.seed))]:
        exp.append(sampler.take(100000))
    path = tmp_path/'complete.json'; save_session(path, payload(atom, molecule))
    restored = load_session(path)
    for key, exp in [('atomic', atom), ('molecular', molecule)]:
        got = restored.workspaces[key].experiment
        np.testing.assert_array_equal(got.points, exp.points)
        assert got.count == 100000 and len(got.display_points()) == 50000 and got.hits == exp.hits


def test_answers_drafts_history_and_groups_restored(tmp_path):
    atom = AtomicExperiment(AtomicModel(state='2pz', radius=4), 2026101101)
    book = ActivityBook(); key = 'atom-positions'
    book.choose(key, 'prediction', 'a'); book.start(key, observation(atom))
    atom.append(AtomicSampler(atom.model, atom.seed).take(100))
    book.choose(key, 'conclusion', 'b'); book.explain(key, '<b>Independent preparation</b> 非轨迹')
    book.check(key, observation(atom))
    book.choose('molecule-node-sign', 'prediction', 'charge')
    groups = dict(size=100, groups=1000, seed=6, workspace='atomic', parameters=parameters(atom.model), result=repeat_groups(atom.model.region_probability, 100, 1000, 6).record())
    data = payload(atom=atom, book=book); data['groups'] = groups
    path = tmp_path/'answers.json'; save_session(path, data)
    restored = load_session(path)
    assert restored.activities.record() == book.record()
    assert restored.groups == groups
    assert restored.activities.answers[key]['result']['written_explanation_automatically_graded'] is False


@pytest.mark.parametrize('corruption', ['version','missing','seed_bool','bad_state','bad_units','large_count','shape','nan','infinity','string','hits','wrong_coordinates','algorithm','reflection','forged_start','invalid_view','language'])
def test_malformed_records_rejected(corruption):
    atom = AtomicExperiment(seed=18); atom.append(AtomicSampler(atom.model, atom.seed).take(4))
    data = payload(atom=atom); record = data['workspaces']['atomic']['experiment']
    if corruption == 'version': data['schema_version'] = 99
    elif corruption == 'missing': del data['workspaces']['molecular']
    elif corruption == 'seed_bool': record['sampling']['seed'] = True
    elif corruption == 'bad_state': record['model']['state'] = '8z'
    elif corruption == 'bad_units': record['model']['units'] = 'nm'
    elif corruption == 'large_count': record['statistics']['count'] = 100001
    elif corruption == 'shape': record['measurements'][0] = [1, 2]
    elif corruption == 'nan': record['measurements'][0][0] = float('nan')
    elif corruption == 'infinity': record['measurements'][0][0] = float('inf')
    elif corruption == 'string': record['measurements'][0][0] = '1.0'
    elif corruption == 'hits': record['statistics']['hits'] = -1
    elif corruption == 'wrong_coordinates': record['measurements'][0][0] += .001
    elif corruption == 'algorithm': record['sampling']['algorithm'] = 'unknown v100'
    elif corruption == 'reflection': data['activities']['answers']['atom-positions']['reflection'] = 'x'*2001
    elif corruption == 'forged_start': data['activities']['answers']['atom-positions']['started'] = True
    elif corruption == 'invalid_view': data['workspaces']['atomic']['view']['pitch'] = 1000
    elif corruption == 'language': data['language'] = 'unknown'
    with pytest.raises(RecordError): decode_session(data)


def test_bad_json_duplicates_future_and_web_formats(tmp_path):
    for raw in ['{', '{"format":"a","format":"b"}', '{"format":NaN}', '{"format":"ElectronCloudAtomsMoleculesRecord","version":1}']:
        path = tmp_path/'bad.json'; path.write_text(raw)
        with pytest.raises(RecordError): load_session(path)
    fifo = tmp_path/'pipe'; os.mkfifo(fifo)
    with pytest.raises(RecordError): load_session(fifo)
    path = tmp_path/'large.json'
    with path.open('wb') as stream: stream.truncate(64*1024*1024+1)
    with pytest.raises(RecordError, match='64 MiB'): load_session(path)


def test_failed_write_preserves_existing_file(tmp_path, monkeypatch):
    path = tmp_path/'record.json'; path.write_text('previous record')
    with pytest.raises(ValueError): save_session(path, {'value': float('nan')})
    assert path.read_text() == 'previous record'
    monkeypatch.setattr(os, 'replace', lambda *args: (_ for _ in ()).throw(OSError('simulated write failure')))
    with pytest.raises(OSError): save_session(path, payload())
    assert path.read_text() == 'previous record'
    assert list(tmp_path.iterdir()) == [path]
