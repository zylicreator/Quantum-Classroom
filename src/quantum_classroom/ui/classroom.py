"""Two preserved native workspaces, with shared language and pause on tab switch."""
from PySide6.QtWidgets import QMainWindow, QTabWidget
from .atomic import AtomicLaboratory
from .window import Laboratory


class ClassroomWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.resize(1340, 1000)
        self.tabs = QTabWidget()
        self.atomic = AtomicLaboratory()
        self.molecular = Laboratory()
        self.tabs.addTab(self.atomic, '原子轨道')
        self.tabs.addTab(self.molecular, '分子轨道 · H₂⁺')
        self.setCentralWidget(self.tabs)
        self._previous = 0
        self.tabs.currentChanged.connect(self.change_workspace)
        self.atomic.language_changed.connect(self.set_language)
        self.molecular.language_changed.connect(self.set_language)
        self.set_language('zh')

    def change_workspace(self, index):
        self.tabs.widget(self._previous).pause()
        self._previous = index

    def set_language(self, language):
        for lab in (self.atomic, self.molecular):
            lab.language = language
            lab.translate()
        self.tabs.setTabText(0, '原子轨道' if language == 'zh' else 'Atomic orbitals')
        self.tabs.setTabText(1, '分子轨道 · H₂⁺' if language == 'zh' else 'Molecular orbitals · H₂⁺')
        self.setWindowTitle('Quantum Classroom · 量子课堂' if language == 'zh' else 'Quantum Classroom')

    def closeEvent(self, event):
        self.atomic.close()
        self.molecular.close()
        event.accept()
