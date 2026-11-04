"""Exercise both native workspaces and save atomic screenshots/export records."""
import argparse
import json
import platform
from pathlib import Path
import time

from PySide6 import __version__ as pyside_version
from PySide6.QtCore import QEvent
from PySide6.QtGui import QFont
from PySide6.QtTest import QTest
from PySide6.QtWidgets import QApplication

from quantum_classroom.ui.classroom import ClassroomWindow


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('artifacts/phase2-desktop'))
    parser.add_argument('--require-display', action='store_true')
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    app = QApplication([])
    app.setFont(QFont('Noto Sans CJK SC', 10))
    if args.require_display and app.platformName() in ('offscreen', 'minimal'):
        raise RuntimeError('A real desktop platform was requested')
    w = ClassroomWindow()
    w.show()
    screenshots = []

    def finish(lab):
        deadline = time.monotonic()+35
        while lab._busy or lab._remaining:
            if time.monotonic() > deadline:
                raise TimeoutError('Measurement did not finish')
            QTest.qWait(20)
        QTest.qWait(200)

    def run(lab, count):
        lab.target.setValue(count)
        lab.run.click()
        finish(lab)
        assert lab.experiment.count == count

    def capture(name):
        QTest.qWait(200)
        assert w.grab().save(str(args.output/name))
        screenshots.append(name)

    try:
        atom, mo = w.atomic, w.molecular
        atom.orbital.setCurrentIndex(atom.orbital.findData('3dz2'))
        run(atom, 100000)
        atom.radius.setValue(7.5)
        assert len(atom.experiment.display_points()) == 50000
        capture('hydrogen-3dz2-zh.png')
        atom.export_record(args.output/'hydrogen-classroom-record.json')
        w.tabs.setCurrentIndex(1)
        mo.state.setCurrentIndex(1)
        run(mo, 1000)
        w.tabs.setCurrentIndex(0)
        assert atom.experiment.count == 100000 and atom.radius.value() == 7.5
        atom.mode.setCurrentIndex(1)
        atom.element.setCurrentIndex(25)
        atom.orbital.setCurrentIndex(atom.orbital.findData('3dxz'))
        run(atom, 20000)
        assert atom.experiment.model.orbital.charge == 6.25
        capture('iron-3dxz-zh.png')
        atom.mode.setCurrentIndex(2)
        atom.element.setCurrentIndex(28)
        run(atom, 20000)
        assert not atom.cloud.sign_colors
        capture('copper-whole-zh.png')
        atom.element.setCurrentIndex(117)
        run(atom, 5000)
        atom.language_button.click()
        assert 'NOT an observed ground state' in atom.model_note.text()
        capture('oganesson-illustration-en.png')
        atom.export_record(args.output/'whole-atom-classroom-record.json')
        data = json.loads((args.output/'whole-atom-classroom-record.json').read_text())
        assert data['statistics']['count'] == len(data['measurements']) == 5000
        assert 'ideal filling' in data['model']['configuration_source']
        w.tabs.setCurrentIndex(1)
        assert mo.experiment.count == 1000 and mo.experiment.model.state == 'antibonding'
        assert mo.language == 'en'
        capture('h2plus-preserved-en.png')
        report = dict(status='PASS', platform=app.platformName(), python=platform.python_version(),
                      PySide6=pyside_version, screenshots=screenshots,
                      scope='Scripted real widgets: hydrogen 100000, Fe orbital, Cu/Og whole mixtures, radius recount, bilingual export, both workspaces preserved. Not manual classroom acceptance.')
        (args.output/'report.json').write_text(json.dumps(report, indent=2)+'\n')
        print(json.dumps(report, indent=2))
    finally:
        w.close()
        w.deleteLater()
        app.sendPostedEvents(None, QEvent.Type.DeferredDelete)


if __name__ == '__main__':
    main()
