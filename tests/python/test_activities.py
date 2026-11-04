"""Headless classroom rules, migrated content and repeated-group statistics."""
from copy import deepcopy
import json
from pathlib import Path
import shutil
import subprocess
import sys

import numpy as np
import pytest

from quantum_classroom.activities import ActivityBook, LESSONS, PRESETS, observation
from quantum_classroom.core import AtomicExperiment, AtomicSampler, Experiment, Sampler
from quantum_classroom.core.groups import repeat_groups
from quantum_classroom.records import model_from_parameters


def scenario(key):
    preset = PRESETS[LESSONS[key]['presetId']]
    model = model_from_parameters(preset['workspace'], preset['config'])
    exp = (AtomicExperiment if preset['workspace'] == 'atomic' else Experiment)(model, preset['config']['seed'])
    sampler = (AtomicSampler if preset['workspace'] == 'atomic' else Sampler)(model, exp.seed)
    return exp, sampler, preset['config']


@pytest.mark.parametrize('key', LESSONS)
def test_predict_observe_explain_and_run_identity(key):
    book = ActivityBook()
    exp, sampler, config = scenario(key)
    snap = lambda: observation(exp, revealed=config['revealed'], colors=config['colors'])
    with pytest.raises(ValueError):
        book.start(key, snap())
    answer = LESSONS[key]['answerId']
    book.choose(key, 'prediction', answer)
    book.start(key, snap())
    with pytest.raises(ValueError):
        book.choose(key, 'prediction', answer)
    assert book.readiness(key, snap()) == 'count'
    exp.append(sampler.take(LESSONS[key]['minCount']))
    if LESSONS[key]['needsReveal']:
        assert book.readiness(key, snap()) == 'reveal'
    sample = snap(); sample['revealed'] = True
    book.choose(key, 'conclusion', answer)
    with pytest.raises(ValueError):
        book.check(key, sample)
    book.explain(key, '这是独立重复测量；a free explanation is not a score.')
    result = book.check(key, sample, 'en')
    assert result['correct'] and result['written_explanation_automatically_graded'] is False
    saved = deepcopy(book.answers[key]['attempts'])
    other, _, _ = scenario(key)  # identical seed/parameters but a new run
    book.observe(LESSONS[key]['workspace'], observation(other))
    assert not book.answers[key]['started'] and book.answers[key]['result'] is None
    assert book.answers[key]['attempts'] == saved


def test_check_history_limit_drafts_and_scenario_gate():
    key = 'atom-nodes'; book = ActivityBook()
    exp, sampler, config = scenario(key)
    sample = lambda: observation(exp, colors=0)
    book.choose(key, 'prediction', 'a'); book.start(key, sample())
    exp.append(sampler.take(1000))
    assert book.readiness(key, observation(exp, colors=1)) == 'scenario'
    exp.set_radius(4)
    assert book.readiness(key, sample()) == 'scenario'
    exp.set_radius(9)
    book.choose(key, 'conclusion', 'a'); book.explain(key, 'A deliberately incorrect choice with ungraded text.')
    for _ in range(35):
        assert book.check(key, sample())['correct'] is False
    assert len(book.answers[key]['attempts']) == 30
    with pytest.raises(ValueError):
        book.explain(key, 'x'*2001)
    book.invalidate('atomic')  # teacher load never starts a student answer
    assert book.answers[key]['prediction'] == 'a' and not book.answers[key]['started']
    book.clear(key)
    assert book.answers[key]['attempts'] == [] and book.answers[key]['prediction'] is None


@pytest.mark.parametrize('preset', PRESETS.values(), ids=PRESETS)
def test_all_teacher_presets_are_valid_and_bilingual(preset):
    model = model_from_parameters(preset['workspace'], preset['config'])
    assert 0 <= model.region_probability <= 1
    for field in ['title', 'objective', 'duration']:
        assert set(preset[field]) == {'zh', 'en'} and all(preset[field].values())


def test_bilingual_catalog_matches_original_web_content():
    if not shutil.which('node'):
        pytest.skip('Node is needed only for original-web content comparison.')
    root = Path(__file__).resolve().parents[2]
    script = r"""
    const fs=require('fs'),vm=require('vm'),ctx={window:{}};vm.createContext(ctx);
    vm.runInContext(fs.readFileSync('assets/lessons.js','utf8'),ctx);
    const source=fs.readFileSync('assets/molecular_lessons.js','utf8');
    vm.runInContext('const T=(zh,en)=>({zh,en});'+source.slice(source.indexOf('const lessons = ['),source.indexOf('const emptyAnswer'))+';globalThis.m={lessons,presets};',ctx);
    console.log(JSON.stringify({a:ctx.window.ElectronLessons,m:ctx.m}));
    """
    original = json.loads(subprocess.check_output(['node', '-e', script], cwd=root))
    assert len(LESSONS) == 5 and len(PRESETS) == 7
    for item in original['a']['lessons']:
        current = LESSONS['atom-'+item['id']]
        for field in ['title', 'question', 'choices', 'answerId', 'explanation', 'rubric', 'minCount', 'needsReveal']:
            assert current[field] == item[field]
    for item in original['m']['lessons']:
        current = LESSONS['molecule-'+item['id']]
        for field in ['title', 'question', 'choices', 'explanation', 'rubric']:
            assert current[field] == item[field]
        assert current['answerId'] == item['correct']


@pytest.mark.parametrize('p', [0, .001, .2, .5, .99, 1])
def test_groups_binomial_moments_and_degeneracy(p):
    result = repeat_groups(p, size=100, groups=10000, seed=902)
    np.testing.assert_array_equal(result.hits, repeat_groups(p, 100, 10000, 902).hits)
    assert abs(result.frequencies.mean()-p) <= 6.5*result.standard_error/100+1e-15
    if 0 < p < 1:
        # For binomial K: excess kurtosis=(1-6pq)/(npq).
        kurtosis = 3+(1-6*p*(1-p))/(100*p*(1-p))
        assert abs(np.mean(result.standardized**2)-1) < 6.5*np.sqrt((kurtosis-1)/10000)
    else:
        assert result.standardized is None and result.standard_error == 0


@pytest.mark.parametrize('args', [(float('nan'),), (True,), (.5, 0), (.5, 10001), (.5, 100, 10001), (.5, 100, 100, -1)])
def test_groups_invalid_inputs(args):
    with pytest.raises(ValueError):
        repeat_groups(*args)


def test_activities_records_and_groups_import_without_qt_or_scipy():
    subprocess.run([sys.executable, '-c', "import sys; import quantum_classroom.activities, quantum_classroom.records, quantum_classroom.core.groups; assert not any(x.startswith(('PySide6', 'scipy')) for x in sys.modules)"], check=True)
