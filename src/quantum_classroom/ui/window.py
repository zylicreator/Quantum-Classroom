"""Experiment controller: bounded worker batches, versioned results, GUI-only painting."""
from PySide6.QtWidgets import (
    QComboBox, QDoubleSpinBox, QFrame, QGridLayout, QHBoxLayout,
    QLabel, QPushButton, QScrollArea, QSpinBox,
    QVBoxLayout, QWidget,
)

from quantum_classroom.core import Experiment, H2Plus, Sampler
from .plots import Cloud, Plot
from .controller import SamplingWindow
from .style import STYLE


class Laboratory(SamplingWindow):

    def __init__(self):
        super().__init__()
        self.language = "zh"
        self.epoch = 0
        self._busy = False
        self._remaining = 0
        self._dirty = True
        self._closing = False
        self._translations = []
        self.resize(1260, 900)
        self.setMinimumSize(970, 710)
        self.setStyleSheet(STYLE)
        shell = QWidget()
        shell.setObjectName("shell")
        outer = QVBoxLayout(shell)
        outer.setContentsMargins(22, 16, 22, 16)
        outer.setSpacing(12)
        header = QHBoxLayout()
        title_box = QVBoxLayout()
        title = self.label("H₂⁺ 分子轨道实验室", "H₂⁺ Molecular Orbital Laboratory")
        title.setObjectName("title")
        title_box.addWidget(title)
        title_box.addWidget(self.label("两个固定原子核，一个电子；每个点来自一次独立制备与测量。",
                                      "Two fixed nuclei, one electron; each point comes from an independent preparation and measurement.", muted=True))
        header.addLayout(title_box, 1)
        self.language_button = QPushButton("English Version")
        self.language_button.clicked.connect(self.toggle_language)
        header.addWidget(self.language_button)
        outer.addLayout(header)
        body = QHBoxLayout()
        body.setSpacing(14)
        sidebar = QFrame()
        sidebar.setObjectName("card")
        sidebar.setFixedWidth(265)
        controls = QVBoxLayout(sidebar)
        controls.setContentsMargins(16, 16, 16, 16)
        controls.setSpacing(9)
        self.state = QComboBox()
        self.state.addItems(["", ""])
        self.R = QDoubleSpinBox()
        self.R.setRange(.6, 8)
        self.R.setSingleStep(.1)
        self.R.setDecimals(2)
        self.R.setValue(2)
        self.R.setSuffix(" a₀")
        self.R.setKeyboardTracking(False)
        self.seed = QSpinBox()
        self.seed.setRange(0, 2_147_483_647)
        self.seed.setValue(123456789)
        self.seed.setKeyboardTracking(False)
        self.target = QSpinBox()
        self.target.setRange(1, 100_000)
        self.target.setSingleStep(1000)
        self.target.setValue(10_000)
        self.target.setKeyboardTracking(False)
        for widget, zh, en in [(self.state, "轨道组合", "Orbital combination"), (self.R, "核间距 R", "Nuclear separation R"),
                               (self.seed, "随机种子", "Random seed"), (self.target, "目标测量次数（最多 100000）", "Target measurements (max 100000)")]:
            label = self.label(zh, en)
            label.setBuddy(widget)
            controls.addWidget(label)
            controls.addWidget(widget)
        controls.addWidget(self.label("改变轨道、核间距或种子会清空测量。", "Changing orbital, R or seed clears measurements.", muted=True))
        buttons = QGridLayout()
        self.one = self.button("测一次", "Measure once", lambda: self.measure(1))
        self.batch = self.button("再测 1000 次", "Add 1000", lambda: self.measure(1000))
        self.run = self.button("开始测量", "Start", self.run_or_pause)
        self.run.setObjectName("primary")
        self.reset = self.button("清空重来", "Reset", self.reset_experiment)
        for widget, row, column in [(self.one, 0, 0), (self.batch, 0, 1), (self.run, 1, 0), (self.reset, 1, 1)]:
            buttons.addWidget(widget, row, column)
        controls.addLayout(buttons)
        self.stats = QLabel()
        self.stats.setObjectName("stats")
        self.stats.setWordWrap(True)
        controls.addWidget(self.stats)
        self.status = QLabel()
        self.status.setObjectName("muted")
        self.status.setWordWrap(True)
        controls.addWidget(self.status)
        self.revealed = True
        self.reveal_button = self.button("揭晓模型概率", "Reveal model probability", self.reveal_probability)
        controls.addWidget(self.reveal_button)
        self.export_button = self.button("导出全部测量 JSON", "Export all measurements (JSON)", self.choose_export)
        controls.addWidget(self.export_button)
        controls.addStretch()
        controls.addWidget(self.label("ψ± = (φA ± φB) / √[2(1 ± S)]\nS = e⁻ᴿ(1 + R + R²/3)",
                                      "ψ± = (φA ± φB) / √[2(1 ± S)]\nS = e⁻ᴿ(1 + R + R²/3)", muted=True))
        controls.addWidget(self.label("固定核、最小 1s 线性组合近似；不预测精确键能、平衡键长或反应动力学。",
                                      "Fixed nuclei, minimal 1s LCAO approximation; no precise bond energies, equilibrium bond lengths or reaction dynamics.", muted=True))
        body.addWidget(sidebar)
        right = QVBoxLayout()
        right.setSpacing(8)
        view_controls = QHBoxLayout()
        self.view = QComboBox()
        self.view.addItems(["", "", ""])
        self.colors = QComboBox()
        self.colors.addItems(["", ""])
        self.axis_mode = QComboBox()
        self.axis_mode.addItems(["", ""])
        for widget, zh, en in [(self.view, "视角", "View"), (self.colors, "颜色", "Colors"), (self.axis_mode, "轴向曲线", "Axial curve")]:
            label = self.label(zh, en)
            label.setBuddy(widget)
            view_controls.addWidget(label)
            view_controls.addWidget(widget, 1)
        right.addLayout(view_controls)
        self.cloud = Cloud()
        right.addWidget(self.cloud, 1)
        self.display_note = QLabel()
        self.display_note.setObjectName("muted")
        self.display_note.setWordWrap(True)
        right.addWidget(self.display_note)
        plots = QHBoxLayout()
        self.frequency_plot = Plot("frequency")
        self.axis_plot = Plot("density")
        plots.addWidget(self.frequency_plot, 1)
        plots.addWidget(self.axis_plot, 1)
        right.addLayout(plots)
        right.addWidget(self.label("薄片 |z| < R/4 在 x、y 方向无限延伸。反键节点是 z = 0 平面；周围有限薄片仍有非零概率。",
                                  "The slab |z| < R/4 is unlimited in x and y. The antibonding node is the plane z = 0; its surrounding finite slab still has nonzero probability.", muted=True))
        right.addWidget(self.label("符号色：青 ψ≥0，橙 ψ<0；黄色标记为原子核。颜色不是电荷，也不是位置测量直接测得的相位。大数定律与中心极限定理不推导波函数。",
                                  "Sign colors: teal ψ≥0, orange ψ<0; gold markers are nuclei. Colors are neither charge nor phase measured by position observations. LLN and CLT do not derive the wavefunction.", muted=True))
        body.addLayout(right, 1)
        outer.addLayout(body, 1)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll.setWidget(shell)
        self.setCentralWidget(scroll)

        self.initialize_worker()
        self.state.currentIndexChanged.connect(self.reset_experiment)
        self.R.valueChanged.connect(self.reset_experiment)
        self.seed.valueChanged.connect(self.reset_experiment)
        self.view.currentIndexChanged.connect(self.update_view)
        self.colors.currentIndexChanged.connect(self.update_view)
        self.axis_mode.currentIndexChanged.connect(self.update_view)
        self.target.valueChanged.connect(self.update_controls)
        self.reset_experiment()
        self.translate()


    def toggle_language(self):
        self.language = "en" if self.language == "zh" else "zh"
        self.translate()
        self.language_changed.emit(self.language)

    def translate(self):
        zh = self.language == "zh"
        self.setWindowTitle("Quantum Classroom · H₂⁺" + (" 分子轨道实验" if zh else " Molecular Orbitals"))
        for widget, chinese, english in self._translations:
            widget.setText(chinese if zh else english)
        self.language_button.setText("English Version" if zh else "中文")
        for combo, chinese, english in [
            (self.state, ["成键 σ", "反键 σ*"], ["Bonding σ", "Antibonding σ*"]),
            (self.view, ["三维 · 拖动旋转", "侧视投影 xz", "端视投影 xy"], ["3D · drag to rotate", "Side projection xz", "End projection xy"]),
            (self.colors, ["波函数符号", "统一颜色"], ["Wavefunction sign", "Uniform color"]),
            (self.axis_mode, ["概率密度", "波函数振幅"], ["Probability density", "Wavefunction amplitude"]),
        ]:
            for index, text in enumerate(chinese if zh else english):
                combo.setItemText(index, text)
        for plot in [self.cloud, self.frequency_plot, self.axis_plot]:
            plot.language = self.language
        self._dirty = True
        self.set_revealed(self.revealed)

    def reset_experiment(self, *_):
        self.epoch += 1
        self._remaining = 0
        model = H2Plus(self.R.value(), ["bonding", "antibonding"][self.state.currentIndex()])
        self.experiment = Experiment(model, self.seed.value())
        self.sampler = Sampler(model, self.seed.value())
        for plot in [self.cloud, self.frequency_plot, self.axis_plot]:
            plot.experiment = self.experiment
        self._dirty = True
        self.set_revealed(True)


    def update_view(self, *_):
        self.cloud.view = ["3d", "xz", "xy"][self.view.currentIndex()]
        self.cloud.sign_colors = self.colors.currentIndex() == 0
        self.axis_plot.mode = ["density", "amplitude"][self.axis_mode.currentIndex()]
        self._dirty = True


    def update_controls(self, *_):
        exp = self.experiment
        zh = self.language == "zh"
        active = self._busy or self._remaining > 0
        available = exp.count < Experiment.MAX_COUNT
        self.one.setEnabled(not active and available)
        self.batch.setEnabled(not active and available)
        self.run.setEnabled(active or (available and exp.count < self.target.value()))
        self.run.setText(("暂停" if zh else "Pause") if active else ("开始测量" if zh else "Start"))
        self.target.setEnabled(not active)
        frequency = "—" if exp.frequency is None else f"{exp.frequency:.3%}"
        probability = f"{exp.model.region_probability:.3%}" if self.revealed else ("待揭晓" if zh else "hidden")
        if zh:
            self.stats.setText(f"测量次数  {exp.count:,}\n薄片命中  {exp.hits:,}\n测量频率  {frequency}\n模型概率  {probability}")
            self.status.setText("正在测量…" if self._remaining else ("正在完成当前批次…" if self._busy else "已暂停 / 等待测量"))
            self.display_note.setText(f"点云选取 {min(exp.count, Experiment.DISPLAY_LIMIT):,} / {exp.count:,} 个测量点；全部测量均计入统计，含显示窗口外的点。")
        else:
            self.stats.setText(f"Measurements  {exp.count:,}\nSlab hits  {exp.hits:,}\nFrequency  {frequency}\nModel probability  {probability}")
            self.status.setText("Measuring…" if self._remaining else ("Finishing current batch…" if self._busy else "Paused / ready"))
            self.display_note.setText(f"Cloud selects {min(exp.count, Experiment.DISPLAY_LIMIT):,} / {exp.count:,} measurements. All measurements count in statistics, including off-screen points.")
