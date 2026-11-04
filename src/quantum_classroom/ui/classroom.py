"""Preserved laboratories, classroom activities and transactional session I/O."""
from PySide6.QtCore import QObject, QThread, QTimer, Signal, Slot, QSignalBlocker
from PySide6.QtWidgets import QMainWindow, QTabWidget, QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QLabel, QFileDialog, QMessageBox

from quantum_classroom.activities import ActivityBook, LESSONS, PRESETS, observation
from quantum_classroom.core import AtomicExperiment, AtomicSampler, Experiment, Sampler
from quantum_classroom.records import (RecordError, RestoredWorkspace, default_view,
                                      load_session, model_from_parameters, save_session, session_record)
from .atomic import AtomicLaboratory
from .window import Laboratory
from .teaching import TeachingPanel
from .session_adapter import install_workspace, workspace_record
from .style import STYLE


class RecordWorker(QObject):
    completed = Signal(object, object)

    @Slot(object)
    def run(self, operation):
        try:
            self.completed.emit(operation(), None)
        except Exception as error:
            self.completed.emit(None, error)


class ClassroomWindow(QMainWindow):
    record_requested = Signal(object)

    def __init__(self):
        super().__init__()
        self.resize(1340, 1000)
        self.language = 'zh'
        self._status_pair = ('', '')
        self.projection = False
        self._io_busy = False
        self._closing = False
        self.book = ActivityBook()
        self.tabs = QTabWidget()
        self.atomic = AtomicLaboratory()
        self.molecular = Laboratory()
        self.labs = dict(atomic=self.atomic, molecular=self.molecular)
        self.tabs.addTab(self.atomic, '原子轨道')
        self.tabs.addTab(self.molecular, '分子轨道 · H₂⁺')
        self.teaching = TeachingPanel(self)
        self.tabs.addTab(self.teaching, '课堂任务')
        self._previous = 0
        self.tabs.currentChanged.connect(self.change_workspace)
        shell = QWidget()
        layout = QVBoxLayout(shell)
        layout.setContentsMargins(0, 0, 0, 0)
        toolbar = QHBoxLayout()
        toolbar.setContentsMargins(12, 6, 12, 2)
        self.save_button = QPushButton()
        self.restore_button = QPushButton()
        self.teaching_button = QPushButton()
        self.projection_button = QPushButton()
        self.projection_button.setCheckable(True)
        self.language_button = QPushButton('English Version')
        self.io_status = QLabel()
        self.io_status.setWordWrap(True)
        self.save_button.clicked.connect(self.choose_save)
        self.restore_button.clicked.connect(self.choose_restore)
        self.teaching_button.clicked.connect(lambda: self.tabs.setCurrentIndex(2))
        self.projection_button.clicked.connect(self.set_projection)
        self.language_button.clicked.connect(lambda: self.set_language('en' if self.language == 'zh' else 'zh'))
        for widget in (self.save_button, self.restore_button, self.teaching_button, self.projection_button):
            toolbar.addWidget(widget)
        toolbar.addWidget(self.io_status, 1)
        toolbar.addWidget(self.language_button)
        self.language_button.hide()
        layout.addLayout(toolbar)
        layout.addWidget(self.tabs, 1)
        self.setCentralWidget(shell)
        for lab in self.labs.values():
            lab.language_changed.connect(self.set_language)
        self.record_thread = QThread(self)
        self.record_worker = RecordWorker()
        self.record_worker.moveToThread(self.record_thread)
        self.record_thread.finished.connect(self.record_worker.deleteLater)
        self.record_requested.connect(self.record_worker.run)
        self.record_worker.completed.connect(self.record_finished)
        self.record_thread.start()
        self.activity_timer = QTimer(self)
        self.activity_timer.setInterval(150)
        self.activity_timer.timeout.connect(self.observe_activities)
        self.activity_timer.start()
        self.set_projection(False)
        self.set_language('zh')

    def tr(self, zh, en):
        return zh if self.language == 'zh' else en

    def show_workspace(self, workspace):
        self.tabs.setCurrentIndex(['atomic', 'molecular', 'teaching'].index(workspace))

    def change_workspace(self, index):
        if self._previous < 2:
            self.tabs.widget(self._previous).pause()
        self._previous = index
        self.language_button.setVisible(index == 2)
        self.observe_activities()

    def set_language(self, language):
        self.language = language
        for lab in self.labs.values():
            lab.language = language
            lab.translate()
        self.teaching.language = language
        self.teaching.render()
        self.tabs.setTabText(0, self.tr('原子轨道', 'Atomic orbitals'))
        self.tabs.setTabText(1, self.tr('分子轨道 · H₂⁺', 'Molecular orbitals · H₂⁺'))
        self.tabs.setTabText(2, self.tr('课堂任务', 'Classroom activities'))
        self.save_button.setText(self.tr('保存课堂记录', 'Save classroom record'))
        self.restore_button.setText(self.tr('恢复记录', 'Restore record'))
        self.teaching_button.setText(self.tr('返回课堂任务', 'Return to activities'))
        self.projection_button.setText(self.tr('投影大字', 'Large text'))
        self.language_button.setText('English Version' if language == 'zh' else '中文')
        self.io_status.setText(self.tr(*self._status_pair))
        self.setWindowTitle(self.tr('Quantum Classroom · 量子课堂', 'Quantum Classroom'))

    def set_status(self, zh, en):
        self._status_pair = (zh, en)
        self.io_status.setText(self.tr(zh, en))

    def set_projection(self, enabled):
        self.projection = bool(enabled)
        with QSignalBlocker(self.projection_button):
            self.projection_button.setChecked(self.projection)
        style = STYLE + ('\nQWidget { font-size: 16px; } QLabel#title { font-size: 30px; } QLabel#muted { font-size: 15px; }' if enabled else '')
        self.setStyleSheet(style)
        for lab in self.labs.values():
            lab.setStyleSheet(style)

    def observe_activities(self):
        if self._closing:
            return
        for workspace, lab in self.labs.items():
            self.book.observe(workspace, observation(lab.experiment, revealed=lab.revealed, colors=lab.colors.currentIndex()))
        self.teaching.refresh()

    def _enable(self, enabled):
        self.tabs.setEnabled(enabled)
        for button in (self.save_button, self.restore_button, self.teaching_button, self.projection_button, self.language_button):
            button.setEnabled(enabled)

    def _quiesce(self, callback):
        if self._io_busy:
            return
        self._io_busy = True
        self._enable(False)
        for lab in self.labs.values():
            lab.pause()
        self.set_status('正在完成当前批次…', 'Finishing current batch…')

        def drained():
            if self._closing:
                return
            if any(lab._busy for lab in self.labs.values()):
                QTimer.singleShot(15, drained)
                return
            try:
                callback()
            except Exception as error:
                self._finish(error=error)
        QTimer.singleShot(0, drained)

    def _finish(self, message=('', ''), error=None):
        self._io_busy = False
        self._enable(True)
        if error is not None:
            message = (error.localized('zh'), error.localized('en')) if isinstance(error, RecordError) else ('操作未完成：'+str(error), 'Operation failed: '+str(error))
            QMessageBox.warning(self, self.tr('课堂记录', 'Classroom record'), self.tr(*message))
        self.set_status(*message)
        self.observe_activities()

    def _install_preset(self, preset_id):
        preset = PRESETS[preset_id]
        workspace, config = preset['workspace'], preset['config']
        lab = self.labs[workspace]
        self.book.invalidate(workspace)
        model = model_from_parameters(workspace, config)
        exp = AtomicExperiment(model, config['seed']) if workspace == 'atomic' else Experiment(model, config['seed'])
        sampler = AtomicSampler(model, exp.seed) if workspace == 'atomic' else Sampler(model, exp.seed)
        view = default_view(workspace, model)
        view.update({key: config[key] for key in ('target', 'view', 'colors', 'yaw', 'pitch', 'revealed')})
        install_workspace(lab, RestoredWorkspace(exp, sampler, view))
        self.book.teacher = preset_id
        if preset['lessonId']:
            self.book.active = preset['lessonId']
        return workspace

    def load_preset(self, preset_id):
        def apply():
            workspace = self._install_preset(preset_id)
            if preset_id == 'atom-clt':
                self.teaching.group_data = dict(size=100, groups=1000, seed=2026101104, result=None)
            self.teaching.render()
            self.show_workspace(workspace)
            self._finish(('已载入场景；学生预测尚未提交。', 'Scenario loaded; no student prediction submitted.'))
        self._quiesce(apply)

    def start_activity(self, key):
        if self.book.answers[key]['prediction'] is None:
            return
        def apply():
            workspace = self._install_preset(LESSONS[key]['presetId'])
            lab = self.labs[workspace]
            self.book.start(key, observation(lab.experiment, revealed=lab.revealed, colors=lab.colors.currentIndex()))
            self.teaching.render()
            self.show_workspace(workspace)
            self._finish(('预测已记录，可以开始测量。', 'Prediction recorded. Begin measuring.'))
        self._quiesce(apply)

    def clear_activity(self, key):
        def apply():
            self._install_preset(LESSONS[key]['presetId'])
            self.book.clear(key)
            self.teaching.render()
            self._finish(('本题已清空。', 'Activity cleared.'))
        self._quiesce(apply)

    def snapshot(self):
        if any(lab._busy or lab._remaining for lab in self.labs.values()):
            raise RuntimeError('Pause and finish pending measurement batches before saving.')
        self.observe_activities()
        return session_record({key: workspace_record(lab) for key, lab in self.labs.items()}, self.book,
                              self.language, ['atomic', 'molecular', 'teaching'][self.tabs.currentIndex()],
                              self.projection, self.teaching.group_data, self.teaching.currentIndex())

    def choose_save(self):
        filename, _ = QFileDialog.getSaveFileName(self, self.tr('保存完整课堂记录', 'Save complete classroom record'), 'quantum-classroom-session.json', 'JSON (*.json)')
        if filename:
            self.save_record(filename if filename.lower().endswith('.json') else filename+'.json')

    def choose_restore(self):
        filename, _ = QFileDialog.getOpenFileName(self, self.tr('恢复课堂或测量记录', 'Restore classroom or measurement record'), '', 'JSON (*.json)')
        if filename:
            self.restore_record(filename)

    def save_record(self, filename):
        def ready():
            data = self.snapshot()
            self._record_action = 'save'
            self.set_status('正在保存完整记录…', 'Saving complete record…')
            self.record_requested.emit(lambda: save_session(filename, data))
        self._quiesce(ready)

    def restore_record(self, filename):
        def ready():
            self._record_action = 'restore'
            self.set_status('正在校验并恢复记录…', 'Validating and restoring record…')
            self.record_requested.emit(lambda: load_session(filename))
        self._quiesce(ready)

    @Slot(object, object)
    def record_finished(self, result, error):
        if self._closing:
            return
        if error is not None:
            self._finish(error=error)
            return
        if self._record_action == 'restore':
            for workspace, restored in result.workspaces.items():
                install_workspace(self.labs[workspace], restored)
            if len(result.workspaces) == 2:
                self.book = result.activities
                self.teaching.group_data = result.groups or dict(size=100, groups=1000, seed=2026101104, result=None)
                self.set_projection(result.projection)
            else:
                self.book.invalidate(next(iter(result.workspaces)))
            self.set_language(result.language)
            if len(result.workspaces) == 2:
                self.teaching.setCurrentIndex(result.teaching_page)
            self.show_workspace(result.active)
            self._finish(('记录已恢复并暂停，可继续测量。', 'Record restored and paused; measurements can continue.'))
        else:
            self._finish(('完整课堂记录已保存。', 'Complete classroom record saved.'))

    def closeEvent(self, event):
        if self._io_busy:
            self.set_status('请等待记录操作完成后关闭。', 'Wait for the record operation before closing.')
            event.ignore()
            return
        self._closing = True
        self.activity_timer.stop()
        self.atomic.close()
        self.molecular.close()
        self.record_thread.quit()
        self.record_thread.wait()
        event.accept()
