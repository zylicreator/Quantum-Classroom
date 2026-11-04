"""Activity state never depends on widgets or grades a written explanation."""
from copy import deepcopy
from datetime import datetime, timezone
import math

from . import LESSONS, PRESETS


def now():
    return datetime.now(timezone.utc).isoformat()


def parameters(model):
    if hasattr(model, 'mode'):
        return dict(mode=model.mode, z=model.z, state=model.state, radius=model.radius)
    return dict(R=model.R, state=model.state)


def observation(experiment, *, revealed=True, colors=0):
    return dict(run_id=experiment.run_id, seed=experiment.seed,
                parameters=parameters(experiment.model), count=experiment.count,
                hits=experiment.hits, frequency=experiment.frequency,
                probability=experiment.model.region_probability,
                revealed=bool(revealed), colors=colors)


def empty_answer():
    return dict(prediction=None, recorded_prediction=None, conclusion=None,
                reflection='', started=False, run_id=None, result=None, attempts=[])


class ActivityBook:
    def __init__(self):
        self.active = 'atom-positions'
        self.teacher = 'atom-intro'
        self.answers = {key: empty_answer() for key in LESSONS}

    @staticmethod
    def choices(key):
        return {item['id'] for item in LESSONS[key]['choices']}

    def choose(self, key, kind, value):
        if kind not in ('prediction', 'conclusion') or value not in self.choices(key):
            raise ValueError('Unknown activity choice.')
        answer = self.answers[key]
        if kind == 'prediction' and answer['started']:
            raise ValueError('The recorded prediction is locked for this run.')
        answer[kind] = value
        answer['result'] = None

    def explain(self, key, value):
        if not isinstance(value, str) or len(value) > 2000:
            raise ValueError('Written explanations allow at most 2000 characters.')
        self.answers[key]['reflection'] = value
        self.answers[key]['result'] = None

    def clear(self, key):
        self.answers[key] = empty_answer()

    def invalidate(self, workspace):
        for key, lesson in LESSONS.items():
            if lesson['workspace'] == workspace:
                self.answers[key].update(started=False, run_id=None, result=None)

    @staticmethod
    def matches(key, sample):
        lesson = LESSONS[key]
        config = PRESETS[lesson['presetId']]['config']
        for name, value in sample['parameters'].items():
            if name not in config:
                return False
            if isinstance(value, (int, float)):
                if not math.isclose(value, config[name], rel_tol=0, abs_tol=1e-8):
                    return False
            elif value != config[name]:
                return False
        return key not in ('atom-nodes', 'molecule-node-sign') or sample['colors'] == 0

    def start(self, key, sample):
        answer = self.answers[key]
        if answer['prediction'] not in self.choices(key):
            raise ValueError('Choose a prediction before starting.')
        if sample['count'] != 0 or not self.matches(key, sample):
            raise ValueError('Start on the fresh activity scenario before observing.')
        self.invalidate(LESSONS[key]['workspace'])
        answer.update(started=True, recorded_prediction=answer['prediction'],
                      run_id=sample['run_id'], result=None)

    def observe(self, workspace, sample):
        for key, lesson in LESSONS.items():
            if lesson['workspace'] != workspace:
                continue
            answer = self.answers[key]
            if answer['started'] and answer['run_id'] != sample['run_id']:
                answer.update(started=False, run_id=None, result=None)
            elif not self.matches(key, sample):
                answer['result'] = None

    def readiness(self, key, sample):
        answer, lesson = self.answers[key], LESSONS[key]
        if not answer['started']:
            return 'prediction'
        if answer['run_id'] != sample['run_id']:
            return 'run'
        if not self.matches(key, sample):
            return 'scenario'
        if sample['count'] < lesson['minCount']:
            return 'count'
        if lesson['needsReveal'] and not sample['revealed']:
            return 'reveal'
        return 'ready'

    def check(self, key, sample, language='zh'):
        answer = self.answers[key]
        if self.readiness(key, sample) != 'ready':
            raise ValueError('Complete this activity observation before checking.')
        if answer['conclusion'] not in self.choices(key) or not answer['reflection'].strip():
            raise ValueError('Choose a conclusion and write an explanation.')
        result = dict(checked_at=now(), correct=answer['conclusion'] == LESSONS[key]['answerId'],
                      prediction=answer['recorded_prediction'], conclusion=answer['conclusion'],
                      reflection=answer['reflection'], observation=deepcopy(sample), language=language,
                      written_explanation_automatically_graded=False)
        answer['result'] = result
        answer['attempts'].append(deepcopy(result))
        answer['attempts'] = answer['attempts'][-30:]
        return result

    def record(self):
        return deepcopy(dict(active=self.active, teacher=self.teacher, answers=self.answers))
