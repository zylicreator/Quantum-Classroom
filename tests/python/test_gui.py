"""Native widget tests; run with QT_QPA_PLATFORM=offscreen or a real display."""
import json
import threading

import numpy as np
import pytest

pytest.importorskip("PySide6")
pytest.importorskip("pytestqt")
from PySide6.QtCore import QPoint, QTimer, Qt
from PySide6.QtWidgets import QFileDialog

from quantum_classroom.core import Sampler
from quantum_classroom.ui.window import Laboratory

pytestmark = pytest.mark.gui


@pytest.fixture
def lab(qtbot):
    window = Laboratory()
    qtbot.addWidget(window)
    window.show()
    yield window
    window.close()


def wait_idle(qtbot, lab):
    qtbot.waitUntil(lambda: not lab._busy and not lab._remaining, timeout=30_000)


def test_measure_pause_resume_language_export(qtbot, lab, tmp_path, monkeypatch):
    qtbot.mouseClick(lab.one, Qt.MouseButton.LeftButton)
    qtbot.waitUntil(lambda: lab.experiment.count == 1)
    qtbot.mouseClick(lab.batch, Qt.MouseButton.LeftButton)
    wait_idle(qtbot, lab)
    assert lab.experiment.count == 1001
    lab.target.setValue(6000)
    qtbot.mouseClick(lab.run, Qt.MouseButton.LeftButton)
    qtbot.waitUntil(lambda: lab.experiment.count > 1001)
    before = lab.experiment.count
    qtbot.mouseClick(lab.run, Qt.MouseButton.LeftButton)
    wait_idle(qtbot, lab)
    paused = lab.experiment.count
    assert before <= paused <= before + lab.BATCH
    qtbot.wait(100)
    assert lab.experiment.count == paused
    snapshot = lab.experiment.points.copy()
    qtbot.mouseClick(lab.language_button, Qt.MouseButton.LeftButton)
    assert lab.language == "en"
    np.testing.assert_array_equal(lab.experiment.points, snapshot)
    qtbot.mouseClick(lab.run, Qt.MouseButton.LeftButton)
    wait_idle(qtbot, lab)
    assert lab.experiment.count == 6000
    np.testing.assert_array_equal(lab.experiment.points, Sampler(lab.experiment.model, lab.experiment.seed).take(6000))
    filename = tmp_path / "measurements.json"
    monkeypatch.setattr(QFileDialog, "getSaveFileName", lambda *args: (str(filename), "JSON (*.json)"))
    qtbot.mouseClick(lab.export_button, Qt.MouseButton.LeftButton)
    data = json.loads(filename.read_text())
    assert data["language"] == "en"
    assert data["statistics"]["count"] == len(data["measurements"]) == 6000
    qtbot.mouseClick(lab.reset, Qt.MouseButton.LeftButton)
    assert lab.experiment.count == 0


def test_inflight_result_is_discarded_and_gui_remains_responsive(qtbot, lab):
    started, release = threading.Event(), threading.Event()
    original = lab.sampler

    class DelayedSampler:
        def take(self, count):
            started.set()
            if not release.wait(5):
                raise RuntimeError("Test did not release the worker")
            return original.take(count)

    lab.sampler = DelayedSampler()
    heartbeats = []
    timer = QTimer(lab)
    timer.setInterval(5)
    timer.timeout.connect(lambda: heartbeats.append(True))
    timer.start()
    try:
        lab.measure(1000)
        lab.submit_batch()
        qtbot.waitUntil(started.is_set)
        qtbot.mouseClick(lab.language_button, Qt.MouseButton.LeftButton)
        assert lab.language == "en"
        lab.R.setValue(3)
        lab.state.setCurrentIndex(1)
        lab.seed.setValue(42)
        qtbot.wait(60)
        assert len(heartbeats) >= 3
        assert lab.experiment.count == 0
    finally:
        release.set()
    wait_idle(qtbot, lab)
    assert lab.experiment.model.R == 3
    assert lab.experiment.model.state == "antibonding"
    assert lab.experiment.count == 0  # old worker must not fill the new experiment
    lab.one.click()
    wait_idle(qtbot, lab)
    np.testing.assert_array_equal(lab.experiment.points, Sampler(lab.experiment.model, 42).take(1))


def test_100000_measurements_views_and_rotation(qtbot, lab):
    lab.state.setCurrentIndex(1)
    lab.target.setValue(100_000)
    lab.run.click()
    wait_idle(qtbot, lab)
    assert lab.experiment.count == 100_000
    assert len(lab.experiment.display_points()) == 50_000
    assert lab.experiment.hits == int(lab.experiment.model.in_region(lab.experiment.points).sum())
    assert not lab.one.isEnabled()
    assert not lab.batch.isEnabled()
    assert not lab.run.isEnabled()
    for view in [1, 2, 0]:
        lab.view.setCurrentIndex(view)
    lab.colors.setCurrentIndex(1)
    lab.axis_mode.setCurrentIndex(1)
    assert lab.axis_plot.mode == "amplitude"
    assert not lab.cloud.sign_colors
    yaw = lab.cloud.yaw
    center = lab.cloud.rect().center()
    qtbot.mousePress(lab.cloud, Qt.MouseButton.LeftButton, pos=center)
    qtbot.mouseMove(lab.cloud, pos=center+QPoint(40, 10))
    qtbot.mouseRelease(lab.cloud, Qt.MouseButton.LeftButton, pos=center+QPoint(40, 10))
    assert lab.cloud.yaw != yaw
    assert lab.experiment.count == 100_000


def test_close_during_computation(qtbot, lab):
    lab.R.setValue(.6)
    lab.state.setCurrentIndex(1)
    lab.measure(100_000)
    lab.submit_batch()
    lab.close()
    assert not lab.thread.isRunning()
