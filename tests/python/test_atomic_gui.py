import json
import threading

import numpy as np
import pytest

pytest.importorskip('PySide6')
pytest.importorskip('pytestqt')
from PySide6.QtCore import QPoint, Qt
from PySide6.QtWidgets import QFileDialog

from quantum_classroom.core import AtomicSampler
from quantum_classroom.ui.classroom import ClassroomWindow

pytestmark = pytest.mark.gui


@pytest.fixture
def classroom(qtbot):
    window = ClassroomWindow()
    qtbot.addWidget(window)
    window.show()
    yield window
    window.close()


def idle(qtbot, lab):
    qtbot.waitUntil(lambda: not lab._busy and not lab._remaining, timeout=30000)


def test_atomic_controls_and_interpretation(qtbot, classroom):
    atom = classroom.atomic
    assert atom.orbital.count() == 30
    atom.orbital.setCurrentIndex(atom.orbital.findData('4fxyz'))
    assert atom.experiment.model.state == '4fxyz'
    atom.mode.setCurrentIndex(1)
    atom.element.setCurrentIndex(25)
    atom.orbital.setCurrentIndex(atom.orbital.findData('3dxz'))
    assert atom.experiment.model.orbital.charge == pytest.approx(6.25)
    atom.element.setCurrentIndex(117)
    assert '非实测基态' in atom.model_note.text()
    atom.mode.setCurrentIndex(2)
    assert not atom.orbital.isEnabled() and not atom.colors.isEnabled()
    assert atom.colors.currentIndex() == 1 and not atom.cloud.sign_colors
    atom.language_button.click()
    assert 'NOT an observed ground state' in atom.model_note.text()
    assert 'no common phase' in atom.interpretation.text()
    assert classroom.molecular.language == 'en'


def test_tabs_pause_preserve_both_experiments_and_language(qtbot, classroom):
    atom, molecule = classroom.atomic, classroom.molecular
    atom.measure(1000)
    idle(qtbot, atom)
    points = atom.experiment.points.copy()
    atom.radius.setValue(.5)
    assert atom.experiment.hits == int((np.linalg.norm(points, axis=1) <= .5).sum())
    np.testing.assert_array_equal(atom.experiment.points, points)
    classroom.tabs.setCurrentIndex(1)
    molecule.state.setCurrentIndex(1)
    molecule.measure(1000)
    idle(qtbot, molecule)
    mo_points = molecule.experiment.points.copy()
    molecule.target.setValue(100_000)
    molecule.run.click()
    qtbot.waitUntil(lambda: molecule.experiment.count > 1000)
    before = molecule.experiment.count
    classroom.tabs.setCurrentIndex(0)
    idle(qtbot, molecule)
    assert before <= molecule.experiment.count <= before + molecule.BATCH
    np.testing.assert_array_equal(atom.experiment.points, points)
    np.testing.assert_array_equal(molecule.experiment.points[:1000], mo_points)
    atom.language_button.click()
    assert molecule.language == atom.language == 'en'
    assert molecule.experiment.model.state == 'antibonding'
    assert atom.radius.value() == .5
    classroom.tabs.setCurrentIndex(1)
    assert molecule.experiment.count >= 1000


def test_atomic_old_results_discarded(qtbot, classroom):
    atom = classroom.atomic
    entered, release = threading.Event(), threading.Event()
    original = atom.sampler
    class Held:
        def take(self, count):
            entered.set()
            if not release.wait(5):
                raise RuntimeError('Test worker was not released')
            return original.take(count)
    atom.sampler = Held()
    try:
        atom.measure(1000)
        atom.submit_batch()
        qtbot.waitUntil(entered.is_set)
        atom.mode.setCurrentIndex(2)
        atom.element.setCurrentIndex(28)
        atom.seed.setValue(42)
        atom.language_button.click()
        assert atom.experiment.count == 0
    finally:
        release.set()
    idle(qtbot, atom)
    assert atom.experiment.count == 0 and atom.experiment.model.z == 29
    atom.batch.click()
    idle(qtbot, atom)
    np.testing.assert_array_equal(atom.experiment.points, AtomicSampler(atom.experiment.model, 42).take(1000))


def test_atomic_100000_export_and_rotation(qtbot, classroom, tmp_path, monkeypatch):
    atom = classroom.atomic
    atom.orbital.setCurrentIndex(atom.orbital.findData('3dz2'))
    atom.target.setValue(100_000)
    atom.run.click()
    idle(qtbot, atom)
    assert atom.experiment.count == 100_000
    assert len(atom.experiment.display_points()) == 50_000
    atom.radius.setValue(4)
    assert atom.experiment.hits == int((np.linalg.norm(atom.experiment.points, axis=1) <= 4).sum())
    center, yaw = atom.cloud.rect().center(), atom.cloud.yaw
    qtbot.mousePress(atom.cloud, Qt.MouseButton.LeftButton, pos=center)
    qtbot.mouseMove(atom.cloud, pos=center+QPoint(30, 10))
    qtbot.mouseRelease(atom.cloud, Qt.MouseButton.LeftButton, pos=center+QPoint(30, 10))
    assert atom.cloud.yaw != yaw
    for index in [1, 2, 0]:
        atom.view.setCurrentIndex(index)
    filename = tmp_path/'atoms.json'
    monkeypatch.setattr(QFileDialog, 'getSaveFileName', lambda *args: (str(filename), 'JSON (*.json)'))
    atom.export_button.click()
    record = json.loads(filename.read_text())
    assert record['statistics']['count'] == len(record['measurements']) == 100_000
    assert record['model']['state'] == '3dz2' and record['model']['radius'] == 4
    atom.close()
    assert not atom.thread.isRunning()
