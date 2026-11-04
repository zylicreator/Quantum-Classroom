"""Predict–observe–explain, teacher scenarios and grouped experiments."""
from PySide6.QtCore import Qt, QSignalBlocker
from PySide6.QtWidgets import (
    QButtonGroup, QComboBox, QFrame, QGridLayout, QHBoxLayout, QLabel,
    QPlainTextEdit, QPushButton, QRadioButton, QScrollArea, QSpinBox,
    QTabWidget, QVBoxLayout, QWidget,
)
from quantum_classroom.activities import LESSONS, PRESETS, observation
from quantum_classroom.activities.state import parameters
from quantum_classroom.core.groups import repeat_groups, GroupResult
import numpy as np
from .groups import GroupPlot


class TeachingPanel(QTabWidget):
    def __init__(self, classroom):
        super().__init__()
        self.classroom = classroom
        self.language = 'zh'
        self.group_data = dict(size=100, groups=1000, seed=2026101104, result=None)
        self.task_page, self.task_layout = self.page()
        self.teacher_page, self.teacher_layout = self.page()
        self.group_page, self.group_layout = self.page()
        for page in (self.task_page, self.teacher_page, self.group_page):
            self.addTab(page, '')
        self.render()

    @property
    def book(self):
        return self.classroom.book

    def tr(self, zh, en):
        return zh if self.language == 'zh' else en

    def tx(self, value):
        return value[self.language]

    def page(self):
        body = QWidget()
        layout = QVBoxLayout(body)
        layout.setContentsMargins(24, 20, 24, 20)
        layout.setSpacing(12)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll.setWidget(body)
        return scroll, layout

    def label(self, value, title=False):
        label = QLabel(value)
        label.setTextFormat(Qt.TextFormat.PlainText)
        label.setWordWrap(True)
        if title:
            label.setObjectName('title')
        return label

    @staticmethod
    def clear_layout(layout):
        while layout.count():
            item = layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
            elif item.layout():
                TeachingPanel.clear_layout(item.layout())

    def render(self):
        for layout in (self.task_layout, self.teacher_layout, self.group_layout):
            self.clear_layout(layout)
        self.setTabText(0, self.tr('学习任务', 'Learning activities'))
        self.setTabText(1, self.tr('教师预设', 'Teacher scenarios'))
        self.setTabText(2, self.tr('成组重复实验', 'Repeated groups'))
        self.render_task()
        self.render_teacher()
        self.render_groups()
        self.refresh()

    def select_task(self, index):
        self.book.active = self.task_selector.itemData(index)
        self.clear_layout(self.task_layout)
        self.render_task()
        self.refresh()

    def choice_group(self, kind, lesson, layout):
        layout.addWidget(self.label(self.tr('实验前：我的预测', 'Before observing: my prediction') if kind == 'prediction' else self.tr('观察后：我的结论', 'After observing: my conclusion')))
        box = QWidget()
        choices = QVBoxLayout(box)
        choices.setContentsMargins(0, 0, 0, 0)
        group = QButtonGroup(box)
        buttons = {}
        for choice in lesson['choices']:
            row = QHBoxLayout()
            radio = QRadioButton()
            radio.setAccessibleName(self.tx(choice['text']))
            group.addButton(radio)
            label = self.label(self.tx(choice['text']))
            label.mousePressEvent = lambda event, button=radio: button.click()
            row.addWidget(radio)
            row.addWidget(label, 1)
            choices.addLayout(row)
            radio.setChecked(self.book.answers[lesson['id']][kind] == choice['id'])
            radio.clicked.connect(lambda checked=False, value=choice['id']: self.choose(kind, value))
            buttons[choice['id']] = radio
        layout.addWidget(box)
        return buttons

    def render_task(self):
        layout = self.task_layout
        self.task_selector = QComboBox()
        for key, item in LESSONS.items():
            self.task_selector.addItem(self.tx(item['title']), key)
        self.task_selector.setCurrentIndex(self.task_selector.findData(self.book.active))
        self.task_selector.currentIndexChanged.connect(self.select_task)
        layout.addWidget(self.task_selector)
        lesson = LESSONS[self.book.active]
        layout.addWidget(self.label(self.tx(lesson['goal'])))
        layout.addWidget(self.label(self.tx(lesson['question']), True))
        self.prediction_buttons = self.choice_group('prediction', lesson, layout)
        row = QHBoxLayout()
        self.start_button = QPushButton(self.tr('记录预测并开始实验', 'Record prediction and start'))
        self.start_button.setObjectName('primary')
        self.start_button.clicked.connect(lambda: self.classroom.start_activity(self.book.active))
        self.clear_button = QPushButton(self.tr('清空本题并重做', 'Clear this activity'))
        self.clear_button.clicked.connect(lambda: self.classroom.clear_activity(self.book.active))
        self.experiment_button = QPushButton(self.tr('回到本课实验', 'Go to this experiment'))
        self.experiment_button.clicked.connect(lambda: self.classroom.show_workspace(LESSONS[self.book.active]['workspace']))
        for button in (self.start_button, self.clear_button, self.experiment_button):
            row.addWidget(button)
        layout.addLayout(row)
        self.progress = self.label('')
        layout.addWidget(self.progress)
        layout.addWidget(self.label(self.tx(lesson['observeHint'])))
        self.conclusion_buttons = self.choice_group('conclusion', lesson, layout)
        layout.addWidget(self.label(self.tx(lesson['reflectionPrompt'])))
        self.reflection = QPlainTextEdit()
        self.reflection.setPlaceholderText(self.tr('用自己的话解释；最多 2000 字，不自动评分。', 'Explain in your own words; up to 2,000 characters, never automatically graded.'))
        self.reflection.setMaximumHeight(115)
        self.reflection.setPlainText(self.book.answers[self.book.active]['reflection'])
        self.reflection.textChanged.connect(self.explain)
        layout.addWidget(self.reflection)
        self.check_button = QPushButton(self.tr('核对我的结论', 'Check my conclusion'))
        self.check_button.setObjectName('primary')
        self.check_button.clicked.connect(self.check)
        layout.addWidget(self.check_button)
        self.feedback = self.label('')
        layout.addWidget(self.feedback)
        layout.addStretch()

    def choose(self, kind, value):
        self.book.choose(self.book.active, kind, value)
        self.refresh()

    def explain(self):
        value = self.reflection.toPlainText()
        if len(value) > 2000:
            with QSignalBlocker(self.reflection):
                self.reflection.setPlainText(value[:2000])
            value = value[:2000]
        self.book.explain(self.book.active, value)
        self.refresh()

    def snapshot(self, key):
        lab = self.classroom.labs[LESSONS[key]['workspace']]
        return observation(lab.experiment, revealed=lab.revealed, colors=lab.colors.currentIndex())

    def check(self):
        self.classroom.observe_activities()
        key = self.book.active
        if self.book.readiness(key, self.snapshot(key)) != 'ready':
            self.refresh()
            return
        self.book.check(key, self.snapshot(key), self.language)
        self.refresh()

    def refresh(self):
        key = self.book.active
        answer, lesson, sample = self.book.answers[key], LESSONS[key], self.snapshot(key)
        status = self.book.readiness(key, sample)
        ready = status == 'ready'
        for button in self.prediction_buttons.values():
            button.setEnabled(not answer['started'])
        for button in self.conclusion_buttons.values():
            button.setEnabled(ready)
        self.reflection.setEnabled(ready)
        self.start_button.setEnabled(answer['prediction'] is not None)
        self.start_button.setText(self.tr('按已记录预测重新开始', 'Restart with recorded prediction') if answer['started'] else self.tr('记录预测并开始实验', 'Record prediction and start'))
        self.check_button.setEnabled(ready and answer['conclusion'] is not None and bool(answer['reflection'].strip()))
        messages = {
            'prediction': ('先选择预测，再开始本课实验。教师载入不代替提交预测。', 'Choose a prediction, then start this activity. Teacher loading does not submit a prediction.'),
            'run': ('实验已重置，请重新记录预测并开始。', 'The experiment was reset. Record a prediction and start again.'),
            'scenario': ('当前参数或配色偏离本课场景；请恢复本课设置。', 'The parameters or colors differ from this scenario. Restore the activity settings.'),
            'count': (f'已测量 {sample["count"]:,} 次；本课至少观察 {lesson["minCount"]:,} 次。', f'{sample["count"]:,} measurements; this activity needs at least {lesson["minCount"]:,}.'),
            'reveal': ('次数已足够，请回到实验揭晓模型概率后比较曲线。', 'Enough measurements. Reveal the model probability in the experiment and compare the curve.'),
            'ready': ('观察已就绪。选择结论并用自己的话解释。', 'Observation ready. Choose a conclusion and explain it in your own words.'),
        }
        self.progress.setText(self.tr(*messages[status]))
        result = answer['result']
        self.feedback.setVisible(result is not None)
        if result:
            title = self.tr('你的选择符合模型解释。', 'Your choice matches the model explanation.') if result['correct'] else self.tr('请再对照观察想一想。', 'Compare your observation once more.')
            self.feedback.setText(title+'\n'+self.tx(lesson['explanation'])+'\n\n'+'\n'.join('• '+self.tx(point) for point in lesson['rubric'])+'\n\n'+self.tr('自由解释没有自动评分；要点供师生讨论。', 'Written explanations are not automatically graded; use these points for discussion.'))

    def render_teacher(self):
        layout = self.teacher_layout
        layout.addWidget(self.label(self.tr('教师工具 · 课堂场景', 'Teacher tools · Classroom scenarios'), True))
        layout.addWidget(self.label(self.tr('载入预设会清空对应实验的测量，保留另一实验及历史答案；学生仍需自行提交预测。', 'Loading clears measurements in the chosen experiment and preserves the other experiment and answer history. Students must still record their own prediction.')))
        self.preset_selector = QComboBox()
        for key, preset in PRESETS.items():
            self.preset_selector.addItem(self.tx(preset['title']), key)
        self.preset_selector.setCurrentIndex(self.preset_selector.findData(self.book.teacher))
        self.preset_selector.currentIndexChanged.connect(self.select_preset)
        layout.addWidget(self.preset_selector)
        self.preset_notes = self.label('')
        layout.addWidget(self.preset_notes)
        self.load_preset_button = QPushButton(self.tr('载入场景并清空对应测量', 'Load scenario and clear its measurements'))
        self.load_preset_button.setObjectName('primary')
        self.load_preset_button.clicked.connect(lambda: self.classroom.load_preset(self.book.teacher))
        layout.addWidget(self.load_preset_button)
        layout.addWidget(self.label(self.tr('顶部“保存课堂记录”保存两个实验、所有坐标、预测、解释、核对历史和视图。可用“恢复记录”继续测量。', 'Save classroom record at the top preserves both experiments, all coordinates, predictions, explanations, check history and views. Restore record lets you continue measuring.')))
        layout.addStretch()
        self.teacher_notes()

    def select_preset(self, index):
        self.book.teacher = self.preset_selector.itemData(index)
        self.teacher_notes()

    def teacher_notes(self):
        preset = PRESETS[self.book.teacher]
        self.preset_notes.setText(self.tx(preset['objective'])+'\n\n'+self.tx(preset['duration'])+'\n\n'+'\n\n'.join('• '+self.tx(note) for note in preset['teacherNotes']))

    def render_groups(self):
        layout = self.group_layout
        layout.addWidget(self.label(self.tr('成组实验 · 频率的分布', 'Repeated groups · Distribution of frequencies'), True))
        layout.addWidget(self.label(self.tr('使用当前原子实验的观察球概率 p，独立生成每组的球内命中数 K~Binomial(n,p)。这是区域事件的重复实验，不添加位置点或改变原实验。', 'Use the current atomic observation-sphere probability p to independently generate K~Binomial(n,p) for each group. These repeated region events do not add position points or change the original experiment.')))
        row = QHBoxLayout()
        self.group_controls = {}
        for name, zh, en, maximum in [('size', '每组次数', 'Group size', 10000), ('groups', '组数', 'Groups', 10000), ('seed', '随机种子', 'Seed', 2147483647)]:
            label = self.label(self.tr(zh, en))
            control = QSpinBox()
            control.setRange(0 if name == 'seed' else 1, maximum)
            control.setValue(self.group_data[name])
            control.valueChanged.connect(lambda value, key=name: self.group_data.__setitem__(key, value))
            label.setBuddy(control)
            row.addWidget(label)
            row.addWidget(control)
            self.group_controls[name] = control
        self.group_run = QPushButton(self.tr('运行成组实验', 'Run repeated groups'))
        self.group_run.clicked.connect(self.run_groups)
        row.addWidget(self.group_run)
        layout.addLayout(row)
        self.group_summary = self.label('')
        layout.addWidget(self.group_summary)
        plots = QHBoxLayout()
        self.group_plots = [GroupPlot(), GroupPlot(True)]
        for plot in self.group_plots:
            plot.language = self.language
            plots.addWidget(plot)
        layout.addLayout(plots)
        layout.addWidget(self.label(self.tr('正态曲线是近似，有限组直方图不必平滑。n·p 或 n·(1−p) 小时近似可能较差；p=0 或 1 时不能标准化。大数定律和中心极限定理都不推导波函数。', 'The normal curve is an approximation; finite-group histograms need not be smooth. Small n·p or n·(1−p) can give poor approximations; p=0 or 1 cannot be standardized. Neither the LLN nor the CLT derives a wavefunction.')))
        layout.addStretch()
        self.show_group_result()

    def run_groups(self):
        exp = self.classroom.atomic.experiment
        result = repeat_groups(exp.model.region_probability, self.group_data['size'], self.group_data['groups'], self.group_data['seed'])
        self.group_data.update(workspace='atomic', parameters=parameters(exp.model), result=result.record())
        self.show_group_result()

    def show_group_result(self):
        data = self.group_data['result']
        result = None if data is None else GroupResult(data['probability'], data['size'], data['seed'], np.array(data['hits']))
        for plot in self.group_plots:
            plot.result = result
            plot.update()
        if result is None:
            self.group_summary.setText(self.tr('等待运行；教师预设中的“拓展”提供 1s 场景。', 'Ready; the Extension teacher scenario provides a 1s example.'))
        else:
            params = self.group_data['parameters']
            mode = {'hydrogen': self.tr('氢原子', 'Hydrogen'), 'orbital': self.tr('屏蔽单轨道', 'Screened orbital'), 'whole': self.tr('整个原子混合', 'Whole-atom mixture')}[params['mode']]
            state = params['state'] if params['mode'] != 'whole' else self.tr('球对称', 'spherical')
            source = f'{mode}, Z={params["z"]}, {state}, r={params["radius"]:g} a₀'
            self.group_summary.setText(self.tr('本次来源：', 'Recorded source: ')+source+f'\np={result.probability:.6f}; n={result.size}; '+self.tr('组数', 'groups')+f'={len(result.hits)}; '+self.tr('频率均值', 'mean frequency')+f'={result.frequencies.mean():.6f}; σ={result.standard_error:.6f}'+('\n'+self.tr('提示：此 n 与 p 下正态近似需谨慎。', 'Caution: the normal approximation may be poor for this n and p.') if result.normal_caution else ''))
