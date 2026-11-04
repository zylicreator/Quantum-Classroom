"""Native task workflow, in-flight isolation and session restoration checks."""
from copy import deepcopy
import json
import threading

import numpy as np
import pytest

pytest.importorskip('PySide6')
pytest.importorskip('pytestqt')
from PySide6.QtCore import QTimer
from PySide6.QtWidgets import QFileDialog, QMessageBox

from quantum_classroom.activities import LESSONS, PRESETS
from quantum_classroom.core import AtomicSampler, Sampler
from quantum_classroom.ui.classroom import ClassroomWindow

pytestmark = pytest.mark.gui


@pytest.fixture
def classroom(qtbot, monkeypatch):
    window = ClassroomWindow()
    warnings = []
    monkeypatch.setattr(QMessageBox, 'warning', lambda *args: warnings.append(args[-1]))
    window.test_warnings = warnings
    qtbot.addWidget(window); window.show()
    yield window
    qtbot.waitUntil(lambda: not window._io_busy, timeout=30000)
    window.close()


def idle(qtbot, window):
    qtbot.waitUntil(lambda: not window._io_busy and all(not lab._busy and not lab._remaining for lab in window.labs.values()), timeout=30000)
    window.observe_activities()


@pytest.mark.parametrize('key', LESSONS)
def test_all_activity_flows_preserve_answers_and_hidden_probability(qtbot, classroom, key):
    window, lesson = classroom, LESSONS[key]
    window.show_workspace('teaching')
    panel = window.teaching
    panel.task_selector.setCurrentIndex(panel.task_selector.findData(key))
    correct = lesson['answerId']
    wrong = next(item['id'] for item in lesson['choices'] if item['id'] != correct)
    assert not panel.start_button.isEnabled() and not panel.check_button.isEnabled()
    panel.prediction_buttons[wrong].click()
    panel.start_button.click(); idle(qtbot, window)
    lab = window.labs[lesson['workspace']]
    assert lab.experiment.count == 0 and not lab.revealed
    assert not lab.frequency_plot.show_probability
    lab.language_button.click()
    assert window.language == 'en' and not lab.revealed
    assert window.io_status.text() == 'Prediction recorded. Begin measuring.'
    assert window.book.answers[key]['recorded_prediction'] == wrong
    assert not panel.prediction_buttons[correct].isEnabled()
    lab.measure(lesson['minCount']); idle(qtbot, window)
    if lesson['needsReveal']:
        assert not panel.conclusion_buttons[correct].isEnabled()
        lab.reveal_button.click(); window.observe_activities()
    panel.conclusion_buttons[correct].click()
    panel.reflection.setPlainText('Independent measurements, not a trajectory. 这是自由解释。')
    assert panel.check_button.isEnabled()
    panel.check_button.click()
    answer = deepcopy(window.book.answers[key])
    assert answer['result']['correct']
    assert answer['result']['prediction'] == wrong
    assert answer['result']['written_explanation_automatically_graded'] is False
    lab.language_button.click()
    assert window.book.answers[key] == answer
    assert lab.language_button.text() == 'English Version'
    # A fresh experiment with the same seed cannot reuse this observation.
    lab.reset.click(); window.observe_activities()
    assert not window.book.answers[key]['started'] and not panel.check_button.isEnabled()
    assert len(window.book.answers[key]['attempts']) == 1
    assert not window.test_warnings


def test_every_teacher_preset_does_not_submit_and_preserves_other_workspace(qtbot, classroom):
    window = classroom
    window.book.choose('atom-positions', 'prediction', 'a')
    for key, preset in PRESETS.items():
        other = window.molecular if preset['workspace'] == 'atomic' else window.atomic
        other.measure(1); idle(qtbot, window)
        snapshot = other.experiment.points.copy()
        panel = window.teaching
        panel.preset_selector.setCurrentIndex(panel.preset_selector.findData(key))
        panel.load_preset_button.click(); idle(qtbot, window)
        lab = window.labs[preset['workspace']]
        assert lab.experiment.count == 0 and lab.seed.value() == preset['config']['seed']
        assert not any(answer['started'] for name, answer in window.book.answers.items() if LESSONS[name]['workspace'] == preset['workspace'])
        np.testing.assert_array_equal(other.experiment.points, snapshot)
    assert window.book.answers['atom-positions']['prediction'] == 'a'
    assert not window.test_warnings


def test_full_save_restore_answers_views_groups_and_continue(qtbot, classroom, tmp_path, monkeypatch):
    window = classroom
    window.book.choose('molecule-node-sign', 'prediction', 'charge')
    window.start_activity('molecule-node-sign'); idle(qtbot, window)
    molecule, atom = window.molecular, window.atomic
    molecule.measure(1000); idle(qtbot, window)
    panel = window.teaching
    panel.conclusion_buttons['sign'].click(); panel.reflection.setPlainText('节点平面与有限薄片不同。')
    panel.check_button.click()
    atom.mode.setCurrentIndex(2); atom.element.setCurrentIndex(28)
    atom.measure(513); idle(qtbot, window)
    atom.cloud.yaw, atom.cloud.pitch = 62., -15.
    molecule.axis_mode.setCurrentIndex(1)
    panel.run_groups()
    window.set_projection(True); window.set_language('en'); window.show_workspace('teaching'); panel.setCurrentIndex(2)
    expected_points = {key: lab.experiment.points.copy() for key, lab in window.labs.items()}
    expected_answers = window.book.record(); expected_groups = deepcopy(panel.group_data)
    path = tmp_path/'classroom.json'
    monkeypatch.setattr(QFileDialog, 'getSaveFileName', lambda *args: (str(path), 'JSON (*.json)'))
    window.save_button.click(); idle(qtbot, window)
    assert path.exists()
    for lab in window.labs.values(): lab.reset.click()
    window.book.clear('molecule-node-sign'); window.set_projection(False); window.set_language('zh')
    monkeypatch.setattr(QFileDialog, 'getOpenFileName', lambda *args: (str(path), 'JSON (*.json)'))
    window.restore_button.click(); idle(qtbot, window)
    assert window.language == 'en' and window.projection and window.tabs.currentIndex() == 2
    assert panel.currentIndex() == 2
    assert window.book.record() == expected_answers and panel.group_data == expected_groups
    assert atom.cloud.yaw == 62 and atom.cloud.pitch == -15 and molecule.axis_mode.currentIndex() == 1
    for key, lab in window.labs.items():
        np.testing.assert_array_equal(lab.experiment.points, expected_points[key])
        assert not lab._busy and not lab._remaining
        count = lab.experiment.count
        lab.measure(37); idle(qtbot, window)
        sampler = AtomicSampler(lab.experiment.model, lab.experiment.seed) if key == 'atomic' else Sampler(lab.experiment.model, lab.experiment.seed)
        np.testing.assert_array_equal(lab.experiment.points, sampler.take(count+37))
    assert not window.test_warnings


def test_save_waits_for_inflight_and_restore_remains_responsive(qtbot, classroom, tmp_path, monkeypatch):
    window, lab = classroom, classroom.atomic
    entered, release = threading.Event(), threading.Event()
    original = lab.sampler
    class Held:
        def take(self, count):
            entered.set()
            if not release.wait(5): raise RuntimeError('Test worker timeout')
            return original.take(count)
    lab.sampler = Held()
    path = tmp_path/'paused.json'
    lab.measure(1000); lab.submit_batch(); qtbot.waitUntil(entered.is_set)
    window.save_record(path)
    try:
        qtbot.wait(80)
        assert window._io_busy and not path.exists()
    finally:
        release.set()
    idle(qtbot, window)
    assert lab.experiment.count == 512
    assert json.loads(path.read_text())['workspaces']['atomic']['experiment']['statistics']['count'] == 512
    # Deliberately slow the I/O worker; GUI timer must still tick.
    import quantum_classroom.ui.classroom as module
    loader = module.load_session
    io_entered, io_release = threading.Event(), threading.Event()
    def held_load(filename):
        io_entered.set()
        if not io_release.wait(5): raise RuntimeError('Test I/O timeout')
        return loader(filename)
    monkeypatch.setattr(module, 'load_session', held_load)
    beats = []
    timer = QTimer(window); timer.setInterval(10); timer.timeout.connect(lambda: beats.append(1)); timer.start()
    window.restore_record(path); qtbot.waitUntil(io_entered.is_set)
    try:
        qtbot.wait(100)
        assert len(beats) >= 3 and not window.tabs.isEnabled()
    finally:
        io_release.set()
    idle(qtbot, window); timer.stop()
    assert lab.experiment.count == 512 and not window.test_warnings


def test_invalid_restore_preserves_current_session_and_legacy_import_is_scoped(qtbot, classroom, tmp_path):
    window = classroom
    for lab in window.labs.values(): lab.measure(123)
    idle(qtbot, window)
    before = {key: lab.experiment for key, lab in window.labs.items()}
    window.book.choose('atom-positions', 'prediction', 'c')
    answers = window.book.record()
    path = tmp_path/'broken.json'; path.write_text('{"format":"QuantumClassroomSession","schema_version":200}')
    window.restore_record(path); idle(qtbot, window)
    assert len(window.test_warnings) == 1 and window.book.record() == answers
    assert all(window.labs[key].experiment is exp for key, exp in before.items())
    old = window.atomic.experiment.record(); old.pop('run_id')
    path.write_text(json.dumps(old)); window.atomic.reset.click()
    window.restore_record(path); idle(qtbot, window)
    assert window.atomic.experiment.count == 123
    assert window.molecular.experiment is before['molecular']
    assert len(window.test_warnings) == 1


def test_group_controls_do_not_modify_atomic_measurements(qtbot, classroom):
    window, atom = classroom, classroom.atomic
    atom.measure(200); idle(qtbot, window)
    points = atom.experiment.points.copy()
    panel = window.teaching
    panel.group_controls['size'].setValue(50)
    panel.group_controls['groups'].setValue(3000)
    panel.group_run.click()
    assert len(panel.group_data['result']['hits']) == 3000
    assert panel.group_data['result']['size'] == 50
    np.testing.assert_array_equal(atom.experiment.points, points)
    atom.radius.setValue(0); panel.group_run.click()
    assert panel.group_plots[1].result.standardized is None
    old = deepcopy(panel.group_data)
    window.set_language('en')
    assert panel.group_data == old and panel.group_plots[1].result.standardized is None
