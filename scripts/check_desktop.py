"""Scripted native-window check and screenshots; specify --require-display for a real session."""
import argparse
import json
import platform
from pathlib import Path
import time

from PySide6 import __version__ as qt_version
from PySide6.QtCore import QEvent
from PySide6.QtGui import QFont
from PySide6.QtTest import QTest
from PySide6.QtWidgets import QApplication

from quantum_classroom.ui.window import Laboratory


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("artifacts/python-desktop"))
    parser.add_argument("--require-display", action="store_true")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    app = QApplication([])
    app.setFont(QFont("Noto Sans CJK SC", 10))
    if args.require_display and app.platformName() in ("offscreen", "minimal"):
        raise RuntimeError("A real desktop platform was requested.")
    window = Laboratory()
    window.show()
    screenshots = []

    def finish():
        deadline = time.monotonic()+30
        while window._remaining or window._busy:
            if time.monotonic() > deadline:
                raise TimeoutError("Measurements did not finish")
            QTest.qWait(20)
        QTest.qWait(200)

    def capture(name):
        path = args.output / name
        if not window.grab().save(str(path)):
            raise RuntimeError("Could not save screenshot")
        screenshots.append(name)

    try:
        QTest.qWait(200)
        window.target.setValue(100_000)
        window.run.click()
        finish()
        assert window.experiment.count == 100_000
        assert len(window.experiment.display_points()) == 50_000
        window.view.setCurrentIndex(1)
        QTest.qWait(150)
        capture("bonding-zh.png")
        window.state.setCurrentIndex(1)
        assert window.experiment.count == 0
        window.target.setValue(20_000)
        window.run.click()
        finish()
        capture("antibonding-zh.png")
        window.language_button.click()
        window.axis_mode.setCurrentIndex(1)
        QTest.qWait(150)
        assert window.experiment.count == 20_000
        capture("antibonding-en.png")
        window.export_record(args.output / "h2plus-classroom-record.json")
        saved = json.loads((args.output / "h2plus-classroom-record.json").read_text())
        assert saved["statistics"]["count"] == len(saved["measurements"]) == 20_000
        report = {"status": "PASS", "platform": app.platformName(), "python": platform.python_version(),
                  "PySide6": qt_version, "screenshots": screenshots,
                  "scope": "Scripted native window; 100000 measurements, state reset, language preservation, plot changes, JSON export. Not manual classroom acceptance."}
        (args.output / "report.json").write_text(json.dumps(report, indent=2)+"\n")
        print(json.dumps(report, indent=2))
    finally:
        window.close()
        # Destroy the widgets and their thread wrapper before QApplication teardown.
        window.deleteLater()
        app.sendPostedEvents(None, QEvent.Type.DeferredDelete)


if __name__ == "__main__":
    main()
