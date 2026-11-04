"""Hydrogen and screened neutral-atom native workspace."""
import numpy as np
from PySide6.QtCore import QPointF, QRectF, Qt, QSignalBlocker
from PySide6.QtGui import QColor, QPainter, QPen
from PySide6.QtWidgets import (
    QComboBox, QDoubleSpinBox, QFrame, QGridLayout, QHBoxLayout, QLabel,
    QPushButton, QScrollArea, QSpinBox, QVBoxLayout, QWidget,
)

from quantum_classroom.core import AtomicModel, AtomicSampler, AtomicExperiment, Experiment, CLASSROOM_STATES
from quantum_classroom.core.atoms import SYMBOLS, configuration
from quantum_classroom.core.hydrogen import STATES
from .controller import SamplingWindow
from .plots import Cloud, Plot, INK, MUTED, TEAL, ORANGE, GRID, polygon
from .style import STYLE


class AtomicCloud(Cloud):
    def paintEvent(self, event):
        p = QPainter(self)
        p.fillRect(self.rect(), QColor('white'))
        if self.experiment is None:
            return
        model = self.experiment.model
        rect = QRectF(20, 36, self.width()-40, self.height()-74)
        scale = min(rect.width(), rect.height())/(2*model.extent)
        center = np.array([rect.center().x(), rect.center().y()])
        p.setPen(INK)
        p.drawText(20, 23, ('整个原子 · 球对称混合' if model.mixed else f'{model.state} · 独立位置测量') if self.language == 'zh' else ('Whole atom · spherical mixture' if model.mixed else f'{model.state} · independent position measurements'))
        p.save()
        p.setClipRect(rect)
        p.setPen(QPen(GRID, 1))
        p.drawLine(QPointF(rect.left(), center[1]), QPointF(rect.right(), center[1]))
        p.drawLine(QPointF(center[0], rect.top()), QPointF(center[0], rect.bottom()))
        points = self.experiment.display_points()
        if len(points):
            projected = self.project(points)*[scale, -scale]+center
            positive = np.ones(len(points), dtype=bool) if model.mixed or not self.sign_colors else model.amplitude(points) >= 0
            for mask, color in [(positive, TEAL), (~positive, ORANGE)]:
                color = QColor(color)
                color.setAlpha(140)
                p.setPen(QPen(color, 1.7))
                selected = projected[mask]
                p.drawPoints(polygon(selected[:, 0], selected[:, 1]))
        p.setPen(QPen(ORANGE, 1.5, Qt.PenStyle.DashLine))
        p.drawEllipse(QPointF(*center), model.radius*scale, model.radius*scale)
        p.setPen(INK)
        p.setBrush(QColor('#e4b14d'))
        p.drawEllipse(QPointF(*center), 4, 4)
        p.restore()
        p.setPen(MUTED)
        axes = 'x → / y ↑' if self.view == 'xy' else 'z → / x ↑' if self.view == 'xz' else '3D'
        p.drawText(QRectF(20, 4, self.width()-40, 28), Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter, axes)
        p.drawText(20, self.height()-18, '拖动三维图旋转；橙色虚线为观察球投影 · a₀' if self.language == 'zh' else 'Drag 3D to rotate; orange circle projects the observation sphere · a₀')


class AtomicLaboratory(SamplingWindow):
    record_filename = 'atomic-classroom-record.json'

    def __init__(self):
        super().__init__()
        self.language, self.epoch = 'zh', 0
        self._busy = self._closing = False
        self._remaining = 0
        self._dirty = True
        self._translations = []
        self.resize(1300, 950)
        self.setMinimumSize(1000, 760)
        self.setStyleSheet(STYLE)
        shell = QWidget()
        shell.setObjectName('shell')
        outer = QVBoxLayout(shell)
        outer.setContentsMargins(20, 14, 20, 14)
        header = QHBoxLayout()
        title = self.label('原子轨道实验室', 'Atomic Orbital Laboratory')
        title.setObjectName('title')
        header.addWidget(title, 1)
        self.language_button = QPushButton('English Version')
        self.language_button.clicked.connect(self.toggle_language)
        header.addWidget(self.language_button)
        outer.addLayout(header)
        outer.addWidget(self.label('氢原子 30 个空间轨道 · 118 种元素的屏蔽近似 · 每个点是一次独立测量',
                                   '30 hydrogen spatial orbitals · 118 screened elements · each dot is an independent measurement', muted=True))
        body = QHBoxLayout()
        sidebar = QFrame()
        sidebar.setObjectName('card')
        sidebar.setFixedWidth(295)
        controls = QVBoxLayout(sidebar)
        controls.setSpacing(7)
        controls.setContentsMargins(14, 14, 14, 14)
        self.mode = QComboBox()
        self.mode.addItems(['', '', ''])
        self.element = QComboBox()
        for z, symbol in enumerate(SYMBOLS, 1):
            self.element.addItem(f'{z} · {symbol}', z)
        self.orbital = QComboBox()
        self.radius = QDoubleSpinBox()
        self.radius.setDecimals(4)
        self.radius.setRange(0, 10000)
        self.radius.setSingleStep(.1)
        self.radius.setSuffix(' a₀')
        self.radius.setKeyboardTracking(False)
        self.seed = QSpinBox()
        self.seed.setRange(0, 2_147_483_647)
        self.seed.setValue(123456789)
        self.seed.setKeyboardTracking(False)
        self.target = QSpinBox()
        self.target.setRange(1, 100_000)
        self.target.setValue(10_000)
        self.target.setSingleStep(1000)
        self.target.setKeyboardTracking(False)
        for widget, zh, en in [(self.mode, '计算模型', 'Model'), (self.element, '元素（原子序数 Z）', 'Element (atomic number Z)'),
                               (self.orbital, '空间轨道（不计自旋）', 'Spatial orbital (spin excluded)'), (self.radius, '观察球半径', 'Observation sphere radius'),
                               (self.seed, '随机种子', 'Random seed'), (self.target, '目标测量次数（最多 100000）', 'Target measurements (max 100000)')]:
            label = self.label(zh, en)
            label.setBuddy(widget)
            controls.addWidget(label)
            controls.addWidget(widget)
        actions = QGridLayout()
        self.one = self.button('测一次', 'Measure once', lambda: self.measure(1))
        self.batch = self.button('再测 1000 次', 'Add 1000', lambda: self.measure(1000))
        self.run = self.button('开始测量', 'Start', self.run_or_pause)
        self.run.setObjectName('primary')
        self.reset = self.button('清空重来', 'Reset', self.reset_experiment)
        for i, button in enumerate([self.one, self.batch, self.run, self.reset]):
            actions.addWidget(button, i//2, i%2)
        controls.addLayout(actions)
        self.stats = QLabel()
        self.stats.setObjectName('stats')
        controls.addWidget(self.stats)
        self.status = QLabel()
        self.status.setWordWrap(True)
        self.status.setObjectName('muted')
        controls.addWidget(self.status)
        self.export_button = self.button('导出全部测量 JSON', 'Export measurements (JSON)', self.choose_export)
        controls.addWidget(self.export_button)
        controls.addWidget(self.label('模型、元素、轨道或种子改变会清空测量；观察球半径改变只重新统计。',
                                      'Changing model, element, orbital or seed clears measurements. Changing sphere radius only recounts them.', muted=True))
        controls.addStretch()
        body.addWidget(sidebar)
        right = QVBoxLayout()
        self.model_note = QLabel()
        self.model_note.setWordWrap(True)
        self.model_note.setTextFormat(Qt.TextFormat.PlainText)
        right.addWidget(self.model_note)
        self.configuration_note = QLabel()
        self.configuration_note.setWordWrap(True)
        self.configuration_note.setObjectName('muted')
        right.addWidget(self.configuration_note)
        options = QHBoxLayout()
        self.view = QComboBox()
        self.view.addItems(['', '', ''])
        self.colors = QComboBox()
        self.colors.addItems(['', ''])
        options.addWidget(self.view, 1)
        options.addWidget(self.colors, 1)
        right.addLayout(options)
        self.cloud = AtomicCloud()
        right.addWidget(self.cloud, 1)
        self.display_note = QLabel()
        self.display_note.setObjectName('muted')
        self.display_note.setWordWrap(True)
        right.addWidget(self.display_note)
        plots = QHBoxLayout()
        self.frequency_plot = Plot('frequency')
        self.axis_plot = Plot('radial')
        plots.addWidget(self.frequency_plot, 1)
        plots.addWidget(self.axis_plot, 1)
        right.addLayout(plots)
        self.interpretation = self.label('', '', muted=True)
        right.addWidget(self.interpretation)
        right.addWidget(self.label('投影叠加不同深度；投影圆内的点不一定在三维观察球内。',
                                  'Projection overlaps depths; dots inside the projected circle may lie outside the 3D sphere.', muted=True))
        right.addWidget(self.label('这些点不是电子运动轨迹。符号颜色不是电荷，也不是位置测量直接测得的相位。大数定律和中心极限定理不推导波函数。',
                                  'These dots are not a trajectory. Sign colors are neither charge nor phase measured by position observations. LLN and CLT do not derive the wavefunction.', muted=True))
        body.addLayout(right, 1)
        outer.addLayout(body, 1)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll.setWidget(shell)
        self.setCentralWidget(scroll)
        self.initialize_worker()
        self.mode.currentIndexChanged.connect(self.selection_changed)
        self.element.currentIndexChanged.connect(self.selection_changed)
        self.orbital.currentIndexChanged.connect(self.reset_experiment)
        self.seed.valueChanged.connect(self.reset_experiment)
        self.radius.valueChanged.connect(self.radius_changed)
        self.target.valueChanged.connect(self.update_controls)
        self.view.currentIndexChanged.connect(self.update_view)
        self.colors.currentIndexChanged.connect(self.update_view)
        self.selection_changed()
        self.translate()

    def selection_changed(self, *_):
        index = self.mode.currentIndex()
        if index == 0:
            with QSignalBlocker(self.element):
                self.element.setCurrentIndex(0)
        self.element.setEnabled(index != 0)
        self.orbital.setEnabled(index != 2)
        selected = self.orbital.currentData()
        shells = {s.key for s in configuration(self.element.currentData())}
        states = CLASSROOM_STATES if index == 0 else [key for key, spec in STATES.items() if spec.subshell in shells]
        with QSignalBlocker(self.orbital):
            self.orbital.clear()
            for state in states:
                self.orbital.addItem(STATES[state].label, state)
            self.orbital.setCurrentIndex(max(0, self.orbital.findData(selected)))
        self.reset_experiment()

    def reset_experiment(self, *_):
        self.epoch += 1
        self._remaining = 0
        base = AtomicModel(['hydrogen', 'orbital', 'whole'][self.mode.currentIndex()], self.element.currentData(), self.orbital.currentData())
        self.experiment = AtomicExperiment(base, self.seed.value())
        with QSignalBlocker(self.radius):
            self.radius.setValue(base.radius)
        self.experiment.set_radius(self.radius.value())
        self.sampler = AtomicSampler(self.experiment.model, self.seed.value())
        if base.mixed:
            with QSignalBlocker(self.colors):
                self.colors.setCurrentIndex(1)
        self.cloud.sign_colors = self.colors.currentIndex() == 0 and not base.mixed
        self.colors.setEnabled(not base.mixed)
        for plot in [self.cloud, self.frequency_plot, self.axis_plot]:
            plot.experiment = self.experiment
        self._dirty = True
        self.update_controls()

    def radius_changed(self, radius):
        self.experiment.set_radius(radius)
        self._dirty = True
        self.update_controls()

    def update_view(self, *_):
        self.cloud.view = ['3d', 'xz', 'xy'][self.view.currentIndex()]
        self.cloud.sign_colors = self.colors.currentIndex() == 0 and not self.experiment.model.mixed
        self._dirty = True

    def toggle_language(self):
        self.language = 'en' if self.language == 'zh' else 'zh'
        self.translate()
        self.language_changed.emit(self.language)

    def translate(self):
        zh = self.language == 'zh'
        for widget, chinese, english in self._translations:
            widget.setText(chinese if zh else english)
        self.language_button.setText('English Version' if zh else '中文')
        for combo, chinese, english in [
            (self.mode, ['氢原子', '多电子 · 单个占据轨道', '多电子 · 整个原子混合'], ['Hydrogen', 'Screened · occupied orbital', 'Screened · whole-atom mixture']),
            (self.view, ['三维 · 拖动旋转', '侧视投影 xz', '端视投影 xy'], ['3D · drag to rotate', 'Side projection xz', 'End projection xy']),
            (self.colors, ['波函数符号', '统一颜色'], ['Wavefunction sign', 'Uniform color'])]:
            for i, text in enumerate(chinese if zh else english):
                combo.setItemText(i, text)
        for plot in [self.cloud, self.frequency_plot, self.axis_plot]:
            plot.language = self.language
        self._dirty = True
        self.update_controls()

    def update_controls(self, *_):
        exp, zh = self.experiment, self.language == 'zh'
        m = exp.model
        active = self._busy or self._remaining > 0
        available = exp.count < Experiment.MAX_COUNT
        self.one.setEnabled(not active and available)
        self.batch.setEnabled(not active and available)
        self.run.setEnabled(active or (available and exp.count < self.target.value()))
        self.run.setText(('暂停' if zh else 'Pause') if active else ('开始测量' if zh else 'Start'))
        self.target.setEnabled(not active)
        frequency = '—' if exp.frequency is None else f'{exp.frequency:.3%}'
        self.stats.setText((f'测量次数  {exp.count:,}\n球内命中  {exp.hits:,}\n测量频率  {frequency}\n模型概率  {m.region_probability:.3%}') if zh else (f'Measurements  {exp.count:,}\nSphere hits  {exp.hits:,}\nFrequency  {frequency}\nModel probability  {m.region_probability:.3%}'))
        self.status.setText(('正在测量…' if zh else 'Measuring…') if self._remaining else ('正在完成当前批次…' if zh else 'Finishing current batch…') if self._busy else ('已暂停 / 等待测量' if zh else 'Paused / ready'))
        self.display_note.setText((f'点云选取 {min(exp.count, 50000):,} / {exp.count:,} 点；窗口外的测量仍计入统计。' if zh else f'Cloud selects {min(exp.count, 50000):,} / {exp.count:,} measurements; off-screen points still count.'))
        if m.mode == 'hydrogen':
            self.model_note.setText((f'非相对论氢原子 · 径向节点 {len(m.nodes)} · 角节点 {m.orbital.spec.l}' if zh else f'Nonrelativistic hydrogen · {len(m.nodes)} radial nodes · {m.orbital.spec.l} angular nodes'))
            self.configuration_note.setText('30 个空间轨道，1s–4f；不计自旋。' if zh else '30 spatial orbitals, 1s–4f; spin excluded.')
        else:
            source = ('H–U 参考组态' if zh else 'H–U reference configuration') if m.reference else ('理想填充示意，非实测基态！' if zh else 'Ideal filling illustration, NOT an observed ground state!')
            charge = '' if m.mixed else f' · Z_eff = {m.orbital.charge:.4g}'
            self.model_note.setText(f'{m.symbol} · Z={m.z} · {source}{charge}')
            self.configuration_note.setText('  '.join(f'{s.key}^{s.electrons}' for s in m.shells))
        self.model_note.setStyleSheet('color: #9a4327; font-weight: 600;' if not m.reference else '')
        self.interpretation.setText((
            ('整个原子是按电子数加权、角向平均的非相干混合，无统一波函数符号。每点表示从新制备原子随机选取一个电子的位置测量。' if m.mixed else '青色 ψ≥0，橙色 ψ<0；径向密度已包含 r² 球壳因子。') + (' Slater 屏蔽是教学近似，非自洽电子结构计算。' if m.mode != 'hydrogen' else '')
        ) if zh else ((
            'Whole-atom view is an electron-weighted angularly averaged incoherent mixture, with no common phase. Each point measures a randomly selected electron from a new atom.' if m.mixed else 'Teal ψ≥0, orange ψ<0; radial density includes the r² shell factor.'
        ) + (' Slater screening is a teaching approximation, not a self-consistent electronic-structure calculation.' if m.mode != 'hydrogen' else '')))
