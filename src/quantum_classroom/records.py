"""Versioned, bounded JSON sessions; validate and replay before replacing live state.

Only local JSON data is read: no pickle, dynamic imports, scripts or remote URLs.
Saved coordinates are authoritative; deterministic prefix replay positions the
sampler for continuation and rejects incompatible RNG/model implementations.
"""
from copy import deepcopy
from dataclasses import dataclass
import json
import math
import os
from pathlib import Path
import re
import stat
import tempfile

import numpy as np

from . import __version__
from .activities import ActivityBook, LESSONS, PRESETS
from .activities.state import now, observation
from .core import AtomicExperiment, AtomicModel, AtomicSampler, Experiment, H2Plus, Sampler, CLASSROOM_STATES
from .core.groups import repeat_groups
from .core.hydrogen import STATES

FORMAT = 'QuantumClassroomSession'
MAX_BYTES = 64 * 1024 * 1024


class RecordError(ValueError):
    MESSAGES = {
        'invalid': ('记录内容无效或不完整，当前实验保持不变。', 'Invalid or incomplete record; the current experiments are unchanged.'),
        'version': ('不支持此记录格式或版本。请选择 Python 桌面会话或测量 JSON。', 'Unsupported format/version. Select a Python desktop session or measurement JSON.'),
        'large': ('记录超过 64 MiB 的大小上限。', 'The record exceeds the 64 MiB size limit.'),
        'replay': ('记录坐标与此环境的种子抽样不一致，无法保证继续测量。请使用原记录的 NumPy 和程序版本。', 'Coordinates do not match seeded replay in this environment. Use the record’s NumPy and application versions for reproducible continuation.'),
    }

    def __init__(self, code='invalid'):
        self.code = code
        super().__init__(self.MESSAGES[code][1])

    def localized(self, language):
        return self.MESSAGES[self.code][language != 'zh']


def require(condition):
    if not condition:
        raise RecordError()


def integer(value, low, high):
    require(type(value) is int and low <= value <= high)
    return value


def number(value, low=-1e100, high=1e100):
    require(type(value) in (int, float) and math.isfinite(value) and low <= value <= high)
    return value


def run_id(value):
    require(isinstance(value, str) and re.fullmatch('[a-f0-9]{32}', value) is not None)
    return value


def model_from_parameters(workspace, data):
    require(isinstance(data, dict))
    if workspace == 'atomic':
        mode, z = data['mode'], integer(data['z'], 1, 118)
        state = data['state']
        require(mode in ('hydrogen', 'orbital', 'whole'))
        require(mode == 'whole' or isinstance(state, str))
        require(state is None if mode == 'whole' and state is None else isinstance(state, str) and state in STATES)
        require(mode != 'hydrogen' or state in CLASSROOM_STATES)
        return AtomicModel(mode, z, state or '1s', number(data['radius'], 0, 10000))
    require(workspace == 'molecular')
    return H2Plus(number(data['R'], .6, 8), data['state'])


def default_view(workspace, model):
    return dict(target=10000, view='3d', colors=1 if getattr(model, 'mixed', False) else 0,
                yaw=28., pitch=18., axis='density', revealed=True)


@dataclass
class RestoredWorkspace:
    experiment: Experiment
    sampler: object
    view: dict


@dataclass
class RestoredSession:
    language: str
    active: str
    projection: bool
    workspaces: dict
    activities: ActivityBook
    groups: dict | None
    teaching_page: int = 0


def restore_workspace(workspace, data):
    record, view = data['experiment'], deepcopy(data['view'])
    expected = 'QuantumClassroomAtom' if workspace == 'atomic' else 'QuantumClassroomH2Plus'
    require(record['format'] == expected and type(record['schema_version']) is int and record['schema_version'] == 1)
    metadata = record['model']
    if workspace == 'atomic':
        require(metadata['system'] == 'atom')
        model = model_from_parameters(workspace, dict(mode=metadata['mode'], z=metadata['Z'], state=metadata['state'], radius=metadata['radius']))
    else:
        require(metadata['system'] == 'H2+')
        model = model_from_parameters(workspace, metadata)
    require(metadata['units'] == 'a0' and record['columns'] == ['x', 'y', 'z'])
    seed = integer(record['sampling']['seed'], 0, 2147483647)
    require(record['sampling']['rng'] == 'NumPy PCG64' and record['sampling']['proposal_block'] == 4096)
    exp = AtomicExperiment(model, seed) if workspace == 'atomic' else Experiment(model, seed)
    require(record['sampling']['algorithm'] == exp.record()['sampling']['algorithm'])
    points = record['measurements']
    require(isinstance(points, list) and len(points) <= Experiment.MAX_COUNT)
    for row in points:
        require(isinstance(row, list) and len(row) == 3)
        for value in row:
            number(value)
    positions = np.asarray(points, dtype=float).reshape(-1, 3)
    exp.append(positions)
    if 'run_id' in record:
        exp.run_id = run_id(record['run_id'])
    # Recompute statistics from every coordinate instead of trusting imported summaries.
    require(integer(record['statistics']['count'], 0, 100000) == exp.count)
    require(integer(record['statistics']['hits'], 0, exp.count) == exp.hits)
    sampler = AtomicSampler(model, seed) if workspace == 'atomic' else Sampler(model, seed)
    for offset in range(0, exp.count, 4096):
        reference = sampler.take(min(4096, exp.count-offset))
        if not np.array_equal(reference, exp.points[offset:offset+len(reference)]):
            raise RecordError('replay')
    integer(view['target'], 1, 100000)
    require(view['view'] in ('3d', 'xz', 'xy'))
    integer(view['colors'], 0, 2 if workspace == 'atomic' else 1)
    require(not getattr(model, 'mixed', False) or view['colors'] != 0)
    number(view['yaw'], 0, 360)
    number(view['pitch'], -85, 85)
    require(view['axis'] in ('density', 'amplitude') and type(view['revealed']) is bool)
    return RestoredWorkspace(exp, sampler, view)


def validate_observation(value, workspace):
    require(isinstance(value, dict))
    run_id(value['run_id'])
    integer(value['seed'], 0, 2147483647)
    model = model_from_parameters(workspace, value['parameters'])
    count = integer(value['count'], 0, 100000)
    hits = integer(value['hits'], 0, count)
    require(value['frequency'] is None if count == 0 else number(value['frequency'], 0, 1) == hits/count)
    require(math.isclose(number(value['probability'], 0, 1), model.region_probability, rel_tol=0, abs_tol=1e-12))
    integer(value['colors'], 0, 2 if workspace == 'atomic' else 1)
    require(type(value['revealed']) is bool)


def restore_activities(data, workspaces):
    book = ActivityBook()
    require(data['active'] in LESSONS and data['teacher'] in PRESETS)
    require(isinstance(data['answers'], dict) and set(data['answers']) == set(LESSONS))
    book.active, book.teacher = data['active'], data['teacher']
    for key, answer in data['answers'].items():
        choices = book.choices(key)
        require(isinstance(answer, dict) and set(answer) == set(book.answers[key]))
        for field in ('prediction', 'recorded_prediction', 'conclusion'):
            require(answer[field] is None or answer[field] in choices)
        require(isinstance(answer['reflection'], str) and len(answer['reflection']) <= 2000)
        require(type(answer['started']) is bool)
        if answer['run_id'] is not None:
            run_id(answer['run_id'])
        require(isinstance(answer['attempts'], list) and len(answer['attempts']) <= 30)
        for attempt in answer['attempts']:
            require(isinstance(attempt, dict))
            require(attempt['prediction'] in choices and attempt['conclusion'] in choices)
            require(isinstance(attempt['reflection'], str) and 0 < len(attempt['reflection'].strip()) <= 2000)
            require(type(attempt['correct']) is bool and attempt['correct'] == (attempt['conclusion'] == LESSONS[key]['answerId']))
            require(attempt['written_explanation_automatically_graded'] is False)
            require(attempt['language'] in ('zh', 'en'))
            require(isinstance(attempt['checked_at'], str) and len(attempt['checked_at']) <= 64)
            validate_observation(attempt['observation'], LESSONS[key]['workspace'])
            require(book.matches(key, attempt['observation']))
            require(attempt['observation']['count'] >= LESSONS[key]['minCount'])
            require(not LESSONS[key]['needsReveal'] or attempt['observation']['revealed'])
        require(answer['result'] is None or (answer['attempts'] and answer['result'] == answer['attempts'][-1]))
        current = workspaces[LESSONS[key]['workspace']]
        if answer['started']:
            require(answer['run_id'] == current.experiment.run_id and answer['recorded_prediction'] == answer['prediction'] and answer['prediction'] in choices)
        else:
            require(answer['run_id'] is None and answer['result'] is None)
        if answer['result'] is not None:
            result = answer['result']
            require(result['prediction'] == answer['recorded_prediction'] and result['conclusion'] == answer['conclusion'] and result['reflection'] == answer['reflection'])
            require(result['observation']['run_id'] == current.experiment.run_id and result['observation']['count'] <= current.experiment.count)
        book.answers[key] = deepcopy(answer)
    return book


def restore_groups(data):
    if data is None:
        return None
    require(isinstance(data, dict))
    integer(data['size'], 1, 10000)
    integer(data['groups'], 1, 10000)
    integer(data['seed'], 0, 2147483647)
    if data['result'] is not None:
        result = data['result']
        require(data['workspace'] in ('atomic', 'molecular'))
        model = model_from_parameters(data['workspace'], data['parameters'])
        require(number(result['probability'], 0, 1) == model.region_probability)
        require(isinstance(result['hits'], list) and 1 <= len(result['hits']) <= 10000)
        for hit in result['hits']:
            integer(hit, 0, integer(result['size'], 1, 10000))
        reference = repeat_groups(result['probability'], result['size'], len(result['hits']), integer(result['seed'], 0, 2147483647))
        if not np.array_equal(reference.hits, result['hits']):
            raise RecordError('replay')
    return deepcopy(data)


def session_record(workspaces, activities, language='zh', active='atomic', projection=False, groups=None, teaching_page=0):
    return dict(format=FORMAT, schema_version=1, application_version=__version__, created_at=now(),
                language=language, active=active, projection=projection,
                workspaces=workspaces, activities=activities.record(), groups=deepcopy(groups), teaching_page=teaching_page,
                written_explanation_automatically_graded=False)


def decode_session(data):
    """Build detached experiments/samplers first. Never mutate a live workspace."""
    try:
        require(isinstance(data, dict))
        kind = data.get('format')
        if kind in ('QuantumClassroomAtom', 'QuantumClassroomH2Plus'):
            workspace = 'atomic' if kind == 'QuantumClassroomAtom' else 'molecular'
            require(type(data.get('schema_version')) is int and data['schema_version'] == 1)
            meta = data['model']
            model = model_from_parameters(workspace, dict(mode=meta['mode'], z=meta['Z'], state=meta['state'], radius=meta['radius']) if workspace == 'atomic' else meta)
            item = restore_workspace(workspace, dict(experiment=data, view=default_view(workspace, model)))
            require(data['language'] in ('zh', 'en'))
            return RestoredSession(data['language'], workspace, False, {workspace: item}, ActivityBook(), None)
        if kind != FORMAT or type(data.get('schema_version')) is not int or data['schema_version'] != 1:
            raise RecordError('version')
        require(data['language'] in ('zh', 'en') and data['active'] in ('atomic', 'molecular', 'teaching'))
        require(type(data['projection']) is bool and data['written_explanation_automatically_graded'] is False)
        require(set(data['workspaces']) == {'atomic', 'molecular'})
        workspaces = {key: restore_workspace(key, value) for key, value in data['workspaces'].items()}
        require(workspaces['atomic'].experiment.run_id != workspaces['molecular'].experiment.run_id)
        book = restore_activities(data['activities'], workspaces)
        return RestoredSession(data['language'], data['active'], data['projection'], workspaces, book, restore_groups(data['groups']), integer(data.get('teaching_page', 0), 0, 2))
    except RecordError:
        raise
    except (KeyError, TypeError, ValueError, OverflowError, AttributeError, RecursionError) as error:
        raise RecordError() from error


def _pairs(items):
    result = {}
    for key, value in items:
        require(key not in result)
        result[key] = value
    return result


def load_session(filename):
    path = Path(filename)
    # Nonblocking open also rejects FIFOs/devices without waiting for a writer.
    with os.fdopen(os.open(path, os.O_RDONLY | os.O_NONBLOCK), 'rb') as stream:
        info = os.fstat(stream.fileno())
        require(stat.S_ISREG(info.st_mode))
        if info.st_size > MAX_BYTES:
            raise RecordError('large')
        raw = stream.read(MAX_BYTES+1)
    if len(raw) > MAX_BYTES:
        raise RecordError('large')
    try:
        data = json.loads(raw, object_pairs_hook=_pairs, parse_constant=lambda value: (_ for _ in ()).throw(RecordError()))
    except (ValueError, UnicodeError, RecursionError) as error:
        raise RecordError() from error
    return decode_session(data)


def save_session(filename, data):
    """Atomic replace after serialization succeeds; an error preserves the old file."""
    path, temporary = Path(filename), None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent,
                                         prefix='.quantum-session-', suffix='.tmp', delete=False) as stream:
            temporary = Path(stream.name)
            json.dump(data, stream, ensure_ascii=False, allow_nan=False, separators=(',', ':'))
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        if temporary.stat().st_size > MAX_BYTES:
            raise RecordError('large')
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()
