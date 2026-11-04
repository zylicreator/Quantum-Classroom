"""Native H₂⁺ laboratory. Import Qt only when the desktop entry point is used."""
import sys


def main():
    try:
        from PySide6.QtCore import QEvent
        from PySide6.QtGui import QFont
        from PySide6.QtWidgets import QApplication
    except ImportError:
        print('Desktop dependencies are missing. Install: python -m pip install -e ".[desktop]"', file=sys.stderr)
        return 1
    from .classroom import ClassroomWindow
    app = QApplication(sys.argv)
    app.setApplicationName("Quantum Classroom")
    app.setFont(QFont("Noto Sans CJK SC", 10))
    window = ClassroomWindow()
    window.show()
    result = app.exec()
    window.deleteLater()
    app.sendPostedEvents(None, QEvent.Type.DeferredDelete)
    return result


if __name__ == "__main__":
    raise SystemExit(main())
