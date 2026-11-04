"""Exercise native activities, teaching presets and complete session restoration."""
import argparse
from copy import deepcopy
import json
from pathlib import Path
import platform
import time

import numpy as np
from PySide6 import __version__ as qt_version
from PySide6.QtCore import QEvent
from PySide6.QtGui import QFont
from PySide6.QtTest import QTest
from PySide6.QtWidgets import QApplication
from quantum_classroom.ui.classroom import ClassroomWindow


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('artifacts/phase3-desktop'))
    parser.add_argument('--require-display', action='store_true')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    app = QApplication([])
    app.setFont(QFont('Noto Sans CJK SC', 10))
    if args.require_display and app.platformName() in ('offscreen', 'minimal'):
        raise RuntimeError('A real desktop was requested.')
    window = ClassroomWindow(); window.show()
    screenshots = []

    def idle():
        deadline = time.monotonic()+40
        while window._io_busy or any(lab._busy or lab._remaining for lab in window.labs.values()):
            if time.monotonic() > deadline: raise TimeoutError('Desktop operation timed out.')
            QTest.qWait(20)
        window.observe_activities(); QTest.qWait(200)

    def capture(name):
        QTest.qWait(200)
        assert window.grab().save(str(args.output/name))
        screenshots.append(name)

    def activity(key, prediction, conclusion, explanation):
        window.show_workspace('teaching'); window.teaching.setCurrentIndex(0)
        panel = window.teaching
        panel.task_selector.setCurrentIndex(panel.task_selector.findData(key))
        panel.prediction_buttons[prediction].click()
        panel.start_button.click(); idle()
        lab = window.labs['atomic' if key.startswith('atom-') else 'molecular']
        assert lab.experiment.count == 0 and not lab.revealed
        lab.batch.click(); idle()
        lab.reveal_button.click()
        window.show_workspace('teaching'); window.observe_activities()
        panel.conclusion_buttons[conclusion].click()
        panel.reflection.setPlainText(explanation)
        panel.check_button.click()
        assert window.book.answers[key]['result']['correct']
        panel.task_page.ensureWidgetVisible(panel.feedback)
        QTest.qWait(150)

    try:
        activity('atom-positions', 'a', 'b', '每个点来自重新制备后的独立位置测量，累积点云是概率分布的记录，不是电子连续运动的轨迹。')
        capture('atomic-activity-feedback-zh.png')
        activity('molecule-node-sign', 'charge', 'sign', '两种颜色来自实波函数的正负号；节点是零厚度平面，周围的有限薄片仍有非零概率。')
        window.set_language('en')
        QTest.qWait(200)
        window.teaching.task_page.ensureWidgetVisible(window.teaching.feedback)
        capture('molecular-activity-feedback-en.png')
        window.set_language('zh')
        window.teaching.setCurrentIndex(1)
        window.teaching.preset_selector.setCurrentIndex(window.teaching.preset_selector.findData('atom-clt'))
        capture('teacher-preset-zh.png')
        window.teaching.setCurrentIndex(2)
        window.teaching.group_controls['groups'].setValue(3000)
        window.teaching.group_run.click()
        window.set_projection(True)
        capture('group-experiments-zh.png')
        window.set_projection(False)
        expected = {key: lab.experiment.points.copy() for key, lab in window.labs.items()}
        answers = window.book.record()
        groups = deepcopy(window.teaching.group_data)
        filename = args.output/'restorable-classroom-session.json'
        window.save_record(filename); idle()
        for lab in window.labs.values(): lab.reset.click()
        window.book.clear('atom-positions'); window.book.clear('molecule-node-sign')
        window.restore_record(filename); idle()
        assert window.book.record() == answers and window.teaching.group_data == groups
        for key, lab in window.labs.items():
            np.testing.assert_array_equal(lab.experiment.points, expected[key])
            lab.measure(37); idle()
            assert lab.experiment.count == 1037
        window.show_workspace('atomic')
        assert window.atomic.language_button.text() == 'English Version'
        capture('restored-atomic-experiment-zh.png')
        window.show_workspace('molecular')
        capture('restored-h2plus-experiment-zh.png')
        report = dict(status='PASS', platform=app.platformName(), python=platform.python_version(),
                      PySide6=qt_version, screenshots=screenshots, tasks=5, presets=7,
                      scope='Scripted native activities, bilingual answers, teacher notes, grouped experiments, atomic+molecular complete save/restore and continued sampling. Not manual classroom acceptance.')
        (args.output/'report.json').write_text(json.dumps(report, indent=2)+'\n')
        print(json.dumps(report, indent=2))
    finally:
        idle()
        window.close(); window.deleteLater()
        app.sendPostedEvents(None, QEvent.Type.DeferredDelete)


if __name__ == '__main__':
    main()
