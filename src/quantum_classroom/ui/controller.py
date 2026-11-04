"""Shared bounded-worker measurement controller for both native laboratories."""
from PySide6.QtCore import QObject, QThread, QTimer, Signal, Slot
from PySide6.QtWidgets import QFileDialog, QLabel, QMainWindow, QMessageBox, QPushButton
from quantum_classroom.core import Experiment

class SamplingWorker(QObject):
    completed = Signal(int, object, str)

    @Slot(int, object, int)
    def sample(self, epoch, sampler, count):
        try:
            self.completed.emit(epoch, sampler.take(count), "")
        except Exception as error:
            self.completed.emit(epoch, None, str(error))



class SamplingWindow(QMainWindow):
    requested = Signal(int, object, int)
    language_changed = Signal(str)
    BATCH = 512
    record_filename = 'h2plus-classroom-record.json'

    def set_revealed(self, value):
        self.revealed = bool(value)
        self.frequency_plot.show_probability = self.revealed
        self.reveal_button.setVisible(not self.revealed)
        self._dirty = True
        self.update_controls()

    def reveal_probability(self):
        self.set_revealed(True)

    def initialize_worker(self):
        self.thread = QThread(self)
        self.worker = SamplingWorker()
        self.worker.moveToThread(self.thread)
        self.thread.finished.connect(self.worker.deleteLater)
        self.requested.connect(self.worker.sample)
        self.worker.completed.connect(self.accept_result)
        self.thread.start()
        self.work_timer = QTimer(self)
        self.work_timer.setInterval(25)
        self.work_timer.timeout.connect(self.submit_batch)
        self.work_timer.start()
        self.paint_timer = QTimer(self)
        self.paint_timer.setInterval(100)
        self.paint_timer.timeout.connect(self.refresh_plots)
        self.paint_timer.start()

    def label(self, zh, en, muted=False):
        label = QLabel(zh)
        label.setWordWrap(True)
        if muted:
            label.setObjectName("muted")
        self._translations.append((label, zh, en))
        return label


    def button(self, zh, en, callback):
        button = QPushButton(zh)
        self._translations.append((button, zh, en))
        button.clicked.connect(callback)
        return button


    def measure(self, count):
        if not self._busy and not self._remaining:
            self._remaining = min(count, Experiment.MAX_COUNT-self.experiment.count)
            self.update_controls()


    def run_or_pause(self):
        if self._remaining or self._busy:
            self.pause()
        else:
            self.measure(max(0, self.target.value()-self.experiment.count))


    def pause(self):
        # Finish at most one 512-point batch so resume never drops RNG samples.
        self._remaining = 0
        self.update_controls()


    def submit_batch(self):
        if self._remaining and not self._busy:
            self._busy = True
            self.requested.emit(self.epoch, self.sampler, min(self.BATCH, self._remaining))


    @Slot(int, object, str)
    def accept_result(self, epoch, points, error):
        if self._closing:
            return
        self._busy = False
        if epoch != self.epoch:
            self.update_controls()
            return
        if error:
            self._remaining = 0
            QMessageBox.critical(self, "Quantum Classroom", error)
        else:
            self.experiment.append(points)
            self._remaining = max(0, self._remaining-len(points))
            self._dirty = True
        self.update_controls()


    def refresh_plots(self):
        if self._dirty:
            for plot in [self.cloud, self.frequency_plot, self.axis_plot]:
                plot.update()
            self._dirty = False


    def choose_export(self):
        self.pause()
        title = "导出测量记录" if self.language == "zh" else "Export measurements"
        filename, _ = QFileDialog.getSaveFileName(self, title, self.record_filename, "JSON (*.json)")
        if filename:
            if not filename.lower().endswith(".json"):
                filename += ".json"
            try:
                self.export_record(filename)
            except (OSError, ValueError) as error:
                QMessageBox.critical(self, title, str(error))
            else:
                self.status.setText(("已导出：" if self.language == "zh" else "Exported: ") + filename)


    def export_record(self, filename):
        self.experiment.export(filename, self.language)


    def closeEvent(self, event):
        self._closing = True
        self.epoch += 1
        self.pause()
        self.work_timer.stop()
        self.paint_timer.stop()
        self.thread.quit()
        self.thread.wait()  # bounded to at most one 512-sample calculation
        event.accept()
