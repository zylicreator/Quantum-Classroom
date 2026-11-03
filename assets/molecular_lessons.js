/* H2+ classroom activities. Written explanations are never automatically graded. */
(function () {
  'use strict';
  const root = document.getElementById('mo-classroom-root');
  const lab = window.MolecularLab, I = window.ElectronI18n;
  if (!root || !lab || !I) return;
  root.dataset.i18nDynamic = 'true';
  const T = (zh, en) => ({ zh, en });
  const L = (zh, en) => I.pick(zh, en);
  const tx = value => typeof value === 'string' ? value : L(value.zh, value.en);
  const copy = value => JSON.parse(JSON.stringify(value));
  const lessons = [
    {
      id: 'one-electron', preset: 'bonding', state: 'bonding', R: 2,
      title: T('任务 A · 一个电子，许多次测量', 'Activity A · One electron, many measurements'),
      goal: T('解释成键轨道中的点云：点数增加，电子数没有增加。', 'Explain a bonding cloud: more dots do not mean more electrons.'),
      question: T('先预测：H₂⁺ 只有一个电子。反复独立制备并测量它的位置，会看到什么？', 'Predict first: H₂⁺ has one electron. What happens when its position is measured across independently prepared copies?'),
      choices: [
        { id: 'copies', text: T('各次测量得到一个位置；许多位置逐渐呈现该轨道的概率分布。', 'Each measurement gives one position; many positions gradually reveal the orbital probability distribution.') },
        { id: 'path', text: T('把这些点按顺序连接，就能得到这个电子在两核之间的运动轨迹。', 'Joining the dots in order gives the electron’s path between the nuclei.') },
        { id: 'electrons', text: T('每增加一个点，分子中就多了一个电子。', 'Each added dot introduces another electron into the molecule.') }
      ],
      correct: 'copies',
      observe: T('观察核间区域的点云，并比较中央薄片的测量频率与模型概率。中央薄片为 |z| < R/4，横向不限。1000 次是本任务的观察门槛，不是大数定律的特殊阈值。', 'Observe the cloud between the nuclei and compare the central-slab frequency with its model probability. The slab is |z| < R/4 with no transverse limit. The 1,000-measurement requirement is an activity guideline, not a special threshold in the law of large numbers.'),
      reflection: T('用自己的话解释：为什么许多点仍然表示一个电子的模型？', 'In your own words: why do many dots still represent a one-electron model?'),
      explanation: T('H₂⁺ 的这一模型只有一个电子。每个点来自一次独立的位置测量；点云描述重复实验的统计分布。成键组合的波函数在两核之间相长叠加，核间密度得到增强。', 'This H₂⁺ model contains one electron. Each dot comes from an independent position measurement; the cloud shows the statistical distribution of repeated experiments. Constructive overlap in the bonding wavefunction enhances density between the nuclei.'),
      rubric: [
        T('点是不同次实验的测量结果，不是轨迹上的连续位置，也不是同时存在的许多电子。', 'Dots belong to different experiments: they are neither consecutive points on a trajectory nor many electrons present at once.'),
        T('波函数先相加，再取模平方；直接把两团原子密度相加不会给出同样的干涉。', 'Add wavefunctions first, then take the squared magnitude. Adding two atomic densities directly misses interference.'),
        T('频率通常随次数增多而更稳定，但误差不需要每一步都变小。', 'Frequencies tend to become more stable as observations increase; the error need not decrease at every step.')
      ]
    },
    {
      id: 'node-sign', preset: 'antibonding', state: 'antibonding', R: 2,
      title: T('任务 B · 节点与两种颜色', 'Activity B · A node and two colors'),
      goal: T('区分波函数正负号、概率密度和电子电荷。', 'Distinguish wavefunction sign, probability density, and electron charge.'),
      question: T('先预测：把两个 1s 波函数相减时，中间的节点和两种颜色说明什么？', 'Predict first: what do the middle node and two colors mean when two 1s wavefunctions are subtracted?'),
      choices: [
        { id: 'sign', text: T('颜色表示所选实波函数的正负号；两核的中垂面上波函数相消，概率密度为零。', 'Colors indicate the sign of the chosen real wavefunction; cancellation gives zero density on the plane halfway between the nuclei.') },
        { id: 'charge', text: T('两种颜色表示电子在不同区域分别带正电和负电。', 'The two colors show positive and negative electron charge in different regions.') },
        { id: 'forbidden', text: T('节点说明整个中央薄片都没有任何概率，电子不能出现在两核之间。', 'The node means the entire central slab has no probability, so an electron cannot be detected anywhere between the nuclei.') }
      ],
      correct: 'sign',
      observe: T('切换“波函数符号”配色，并结合轴向曲线核对 z = 0 的节点。xz 投影沿 y 方向叠加，不能只凭投影推断完整三维形状。节点是零厚度平面；其周围有限厚度的中央薄片仍有非零概率，可能出现测量点。', 'Use the wavefunction-sign colors and the axial curve to inspect the node at z = 0. An xz projection sums positions along y; it does not reveal the complete 3D shape. The node is a plane of zero thickness. The surrounding central slab has finite thickness and nonzero probability, so it may contain dots.'),
      reflection: T('用一句话解释颜色的含义，并说明为什么中央薄片仍可能出现点。', 'Explain the colors and why the central slab can still contain dots.'),
      explanation: T('反键组合在 z = 0 的中垂面精确相消。颜色只是所选实波函数的正负号，电子在两侧都带负电。概率密度为 |ψ|²，不带正负号。', 'The antibonding combination cancels exactly on the midpoint plane z = 0. Colors encode the sign of the chosen real wavefunction; the electron has negative charge on both sides. The probability density |ψ|² is nonnegative.'),
      rubric: [
        T('把整个波函数乘以 −1 会交换两种颜色，但不会改变任何位置概率。', 'Multiplying the whole wavefunction by −1 swaps the colors without changing position probabilities.'),
        T('节点平面为零概率密度；“中央薄片”是一个有厚度的观察区域，两者不同。', 'The nodal plane has zero probability density. The central slab is a finite-thickness observation region, a different object.'),
        T('有限次随机抽样不能证明某处严格为零；节点来自模型的波函数相消，并可对照轴向曲线。', 'Finite random samples cannot prove an exact zero. The node follows from cancellation in the model and can be checked against the axial curve.')
      ]
    }
  ];
  const presets = [
    { id: 'bonding', lesson: 'one-electron', config: { R: 2, state: 'bonding', color: 'probability', view: 'xz', seed: 2026101201 }, title: T('成键 · 核间密度与独立测量', 'Bonding · Internuclear density and independent measurements'), notes: T('先问“1000 个点是否代表 1000 个电子”，再让学生观察累积点云与中央薄片频率。相长叠加增强核间密度；此固定 1s 线性组合模型不提供精确键能或真实电子运动。', 'Ask whether 1,000 dots represent 1,000 electrons, then observe the growing cloud and central-slab frequency. Constructive overlap enhances internuclear density. This fixed-1s LCAO model does not provide exact bond energies or electron trajectories.') },
    { id: 'antibonding', lesson: 'node-sign', config: { R: 2, state: 'antibonding', color: 'phase', view: 'xz', seed: 2026101202 }, title: T('反键 · 节点与波函数符号', 'Antibonding · Node and wavefunction sign'), notes: T('对照轴向曲线讨论 z = 0 节点，再区分零厚度平面与有限厚度中央薄片。强调颜色不是电荷；“反键”在这里是轨道性质，不应仅凭点云宣称测得了键能。', 'Discuss the z = 0 node using the axial curve, and distinguish the zero-thickness plane from the finite central slab. Colors are not charge. Antibonding describes the orbital; a point cloud alone is not a bond-energy measurement.') },
    { id: 'separated', lesson: null, config: { R: 6, state: 'bonding', color: 'phase', view: 'xz', seed: 2026101203 }, title: T('远核 · R = 6 a₀ 的轨道叠加', 'Separated nuclei · Overlap at R = 6 a₀'), notes: T('与 R = 2 a₀ 比较，两团原子形状更容易辨认、重叠较弱。R 变大也会改变中央薄片的宽度，因此薄片频率不是跨 R 比较成键强弱的直接指标。核固定，模型没有模拟分子的振动或解离动力学。', 'Compare with R = 2 a₀: the atomic shapes are easier to distinguish and overlap is weaker. The central slab also widens as R increases, so its frequency is not a direct measure of bonding strength across R values. The nuclei are fixed; molecular vibration and dissociation dynamics are not simulated.') }
  ];
  const emptyAnswer = () => ({ prediction: null, recordedPrediction: null, conclusion: null, reflection: '', started: false, run: null, result: null, attempts: [] });
  const answers = Object.fromEntries(lessons.map(lesson => [lesson.id, emptyAnswer()]));
  let active = null, teacher = 'bonding', projection = false, updating = false;
  const refs = {};
  const getLesson = id => lessons.find(item => item.id === id);
  const getPreset = id => presets.find(item => item.id === id);
  function el(tag, cls, value) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function button(id, label, action, primary = false) {
    const node = el('button', 'mo-lesson-button' + (primary ? ' mo-primary' : ''), label);
    node.id = id; node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function snap() { return lab.snapshot(); }
  function matches(lesson, s) { return s.state === lesson.state && Math.abs(Number(s.R) - lesson.R) < 1e-8; }
  function sameRun(run, s) { return run && (run.runId !== undefined && s.runId !== undefined ? run.runId === s.runId : String(run.seed) === String(s.seed)); }
  function usable(lesson, a, s) { return a.started && sameRun(a.run, s) && matches(lesson, s) && s.count >= 1000; }
  function clearStarts() {
    for (const a of Object.values(answers)) { a.started = false; a.run = null; a.result = null; }
  }
  function showError(value) {
    if (!refs.error) return;
    refs.error.textContent = value || ''; refs.error.hidden = !value;
  }
  function scrollTo(node) {
    node?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  function updateReturnButton() {
    const grid = document.querySelector('#molecular-demo .mo-lab-grid');
    if (!grid) return;
    let back = document.getElementById('mo-return-task');
    if (!back) {
      back = button('mo-return-task', '', () => {
        if (!active || !refs.task) return;
        refs.task.open = true; scrollTo(refs.task);
      });
      back.classList.add('mo-btn'); grid.after(back);
    }
    back.textContent = L('返回任务，填写结论', 'Return to the activity');
    back.hidden = !active;
  }
  function load(id, fromTask) {
    const preset = getPreset(id); if (!preset) return;
    const lesson = fromTask && active ? getLesson(active) : null;
    if (fromTask && (!lesson || !answers[lesson.id].prediction)) return;
    clearStarts(); teacher = id;
    if (!fromTask) active = preset.lesson;
    try {
      updating = true;
      lab.pause();
      lab.loadPreset({ ...preset.config, total: 10000, count: 0, revealed: false, playing: false });
      const s = snap();
      if (s.count !== 0) throw new Error(L('场景未重置，请先清空测量。', 'The scenario did not reset. Clear its measurements first.'));
      if (fromTask) {
        const a = answers[lesson.id];
        a.started = true; a.recordedPrediction = a.prediction;
        a.run = { seed: s.seed, runId: s.runId, lastCount: 0, startedAt: new Date().toISOString() };
      }
      render(true); showError('');
      if (fromTask) scrollTo(document.querySelector('#molecular-demo .mo-lab-grid'));
    } catch (error) {
      clearStarts(); render(true); showError(L('载入失败：', 'Unable to load: ') + error.message);
    } finally { updating = false; updateProgress(); }
  }
  function radios(lesson, type) {
    const fieldset = el('fieldset', 'mo-choice-group');
    fieldset.id = 'mo-task-' + type;
    fieldset.append(el('legend', '', type === 'prediction' ? L('实验前：我的预测', 'Before observing: my prediction') : L('观察后：我的结论', 'After observing: my conclusion')));
    for (const option of lesson.choices) {
      const label = el('label', 'mo-choice');
      const input = el('input'); input.type = 'radio'; input.name = 'mo-task-' + type; input.id = 'mo-' + type + '-' + option.id; input.value = option.id;
      input.checked = answers[lesson.id][type] === option.id;
      input.addEventListener('change', () => {
        answers[lesson.id][type] = option.id;
        answers[lesson.id].result = null; renderFeedback(lesson); updateProgress();
      });
      label.append(input, el('span', '', tx(option.text))); fieldset.append(label);
    }
    return fieldset;
  }
  function renderFeedback(lesson) {
    if (!refs.feedback) return;
    refs.feedback.replaceChildren(); const result = answers[lesson.id].result;
    refs.feedback.hidden = !result; if (!result) return;
    refs.feedback.append(el('h4', '', result.correct ? L('你的选择符合模型解释', 'Your choice matches the model') : L('再对照观察想一想', 'Compare your observations once more')));
    refs.feedback.append(el('p', '', tx(lesson.explanation)));
    const list = el('ul'); for (const point of lesson.rubric) list.append(el('li', '', tx(point))); refs.feedback.append(list);
    refs.feedback.append(el('p', 'mo-lesson-note', L('自由解释没有自动评分，请自行对照上面的要点。', 'Your written explanation is not automatically graded. Compare it with the points above.')));
  }
  function check(lesson) {
    const a = answers[lesson.id], s = snap();
    if (!usable(lesson, a, s) || !a.conclusion || !a.reflection.trim()) { updateProgress(); return; }
    const result = { checkedAt: new Date().toISOString(), correct: a.conclusion === lesson.correct, prediction: a.recordedPrediction, conclusion: a.conclusion, reflection: a.reflection, observation: copy(s), writtenExplanationAutomaticallyGraded: false };
    a.result = result; a.attempts.push(copy(result)); a.attempts = a.attempts.slice(-30); renderFeedback(lesson);
  }
  function taskPanel(lesson, open) {
    const a = answers[lesson.id], panel = el('details', 'mo-task-panel'); panel.id = 'mo-task-panel'; panel.open = open;
    panel.append(el('summary', '', tx(lesson.title)), el('p', '', tx(lesson.question)));
    const prediction = radios(lesson, 'prediction'); panel.append(prediction);
    const actions = el('div', 'mo-lesson-actions');
    const start = button('mo-task-start', a.started ? L('按已记录预测重新开始', 'Restart with this prediction') : L('记录预测并开始实验', 'Record prediction and start'), () => load(lesson.preset, true), true);
    const reset = button('mo-task-reset', L('清空本题并重做', 'Clear this activity'), () => {
      answers[lesson.id] = emptyAnswer(); clearStarts();
      try { updating = true; lab.pause(); lab.loadPreset({ ...getPreset(lesson.preset).config, total: 10000, count: 0, revealed: false, playing: false }); render(true); }
      catch (error) { render(true); showError(error.message); }
      finally { updating = false; updateProgress(); }
    });
    actions.append(start, reset); panel.append(actions);
    const progress = el('p', 'mo-task-progress'); progress.id = 'mo-task-progress'; progress.setAttribute('aria-live', 'polite'); panel.append(progress);
    panel.append(el('p', 'mo-lesson-note', tx(lesson.observe)));
    const conclusion = radios(lesson, 'conclusion'); panel.append(conclusion);
    const label = el('label', 'mo-reflection-label', tx(lesson.reflection)); label.htmlFor = 'mo-task-reflection'; panel.append(label);
    const reflection = el('textarea', 'mo-task-reflection'); reflection.id = 'mo-task-reflection'; reflection.rows = 3; reflection.maxLength = 2000; reflection.value = a.reflection;
    reflection.placeholder = L('写下你的解释……', 'Write your explanation…');
    reflection.addEventListener('input', () => { a.reflection = reflection.value; a.result = null; renderFeedback(lesson); updateProgress(); }); panel.append(reflection);
    const checkButton = button('mo-task-check', L('核对我的结论', 'Check my conclusion'), () => check(lesson), true); panel.append(checkButton);
    const feedback = el('div', 'mo-task-feedback'); feedback.id = 'mo-task-feedback'; feedback.setAttribute('role', 'status'); panel.append(feedback);
    Object.assign(refs, { task: panel, prediction, conclusion, progress, start, reflection, check: checkButton, feedback }); renderFeedback(lesson); return panel;
  }
  function teacherNotes() {
    if (!refs.notes) return;
    const preset = getPreset(teacher);
    refs.notes.replaceChildren(el('p', '', tx(preset.notes)));
    refs.notes.append(el('p', 'mo-lesson-note', L('建议用时 3–5 分钟。预设采用固定随机种子，便于重复课堂展示。载入会清空测量，但不会替学生记录预测。', 'Allow 3–5 minutes. Presets use fixed random seeds for repeatable demonstrations. Loading clears measurements and does not record a student prediction.')));
  }
  function exportRecord() {
    const record = { format: 'MolecularOrbitalClassroomRecord', version: 1, createdAt: new Date().toISOString(), language: I.lang, model: 'Fixed-nuclei hydrogen molecular ion, normalized 1s LCAO', currentExperiment: copy(snap()), activeLesson: active, teacherPreset: teacher, activities: lessons.map(lesson => ({ id: lesson.id, title: lesson.title, question: lesson.question, choices: lesson.choices, ...copy(answers[lesson.id]) })), writtenExplanationAutomaticallyGraded: false };
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob), link = el('a'); link.href = url; link.download = 'molecular-orbital-learning-record.json';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function teacherPanel(open) {
    const panel = el('details', 'mo-teacher-panel'); panel.id = 'mo-teacher-panel'; panel.open = open;
    panel.append(el('summary', '', L('教师工具 · 场景与学习记录', 'Teacher tools · Scenarios and learning records')));
    const controls = el('div', 'mo-teacher-controls');
    const label = el('label', '', L('课堂场景', 'Classroom scenario')); label.htmlFor = 'mo-teacher-preset';
    const select = el('select'); select.id = 'mo-teacher-preset';
    for (const preset of presets) { const option = el('option', '', tx(preset.title)); option.value = preset.id; select.append(option); }
    select.value = teacher; select.addEventListener('change', () => { teacher = select.value; teacherNotes(); }); label.append(select);
    const project = button('mo-project', projection ? L('退出投影模式', 'Exit projection mode') : L('投影大字模式', 'Projection mode'), () => {
      projection = !projection; document.getElementById('molecular-demo')?.classList.toggle('mo-projecting', projection);
      project.textContent = projection ? L('退出投影模式', 'Exit projection mode') : L('投影大字模式', 'Projection mode'); project.setAttribute('aria-pressed', String(projection)); lab.redraw();
    }); project.setAttribute('aria-pressed', String(projection));
    controls.append(label, button('mo-teacher-load', L('载入并清空测量', 'Load and clear measurements'), () => load(select.value, false)), project); panel.append(controls);
    const notes = el('div', 'mo-teacher-notes'); notes.id = 'mo-teacher-notes'; panel.append(notes); refs.notes = notes;
    panel.append(button('mo-export-record', L('导出学习记录 JSON', 'Export learning record JSON'), exportRecord));
    panel.append(el('p', 'mo-lesson-note', L('记录包括任务草稿、最近 30 次核对与当前分子实验。答案只保存在本页面内存中；刷新或关闭前请导出。', 'Records include activity drafts, the latest 30 checks per activity, and the current molecular experiment. Answers stay in page memory; export before refreshing or closing.')));
    refs.teacherPanel = panel; return panel;
  }
  function updateProgress() {
    if (updating || !active || !refs.progress) return;
    const lesson = getLesson(active), a = answers[active], s = snap();
    const match = matches(lesson, s);
    if (a.started && a.run && (!sameRun(a.run, s) || s.count < a.run.lastCount)) {
      a.started = false; a.run = null; a.result = null; renderFeedback(lesson);
    }
    if (a.run) a.run.lastCount = s.count;
    if (!match && a.result) { a.result = null; renderFeedback(lesson); }
    const ready = usable(lesson, a, s);
    // The recorded prediction stays locked within a run; teacher loads and task clearing unlock it.
    for (const input of refs.prediction.querySelectorAll('input')) input.disabled = a.started;
    for (const input of refs.conclusion.querySelectorAll('input')) input.disabled = !ready;
    refs.start.disabled = !a.prediction; refs.reflection.disabled = !ready; refs.check.disabled = !ready || !a.conclusion || !a.reflection.trim();
    let message;
    if (!match) message = L('当前参数不属于本课场景。请重新载入本课，记录预测后再测量；本次不能核对。', 'The current parameters do not match this activity. Reload it, record a prediction, and measure again; checking is unavailable.');
    else if (!a.started) message = L('请选择预测，再点“记录预测并开始实验”。教师载入或清空测量不会代替这一步。', 'Choose a prediction, then record it and start. A teacher preset or measurement reset does not complete this step.');
    else if (!ready) message = L('已完成 ', 'Completed ') + Number(s.count).toLocaleString(I.locale()) + L(' / 1000 次测量。继续观察，再填写结论。', ' / 1,000 measurements. Keep observing before choosing a conclusion.');
    else message = L('观察已就绪：选择结论并写一句解释，即可核对。', 'Observation ready: choose a conclusion and write an explanation to check.');
    refs.progress.textContent = message;
  }
  function render(forceOpen) {
    const taskOpen = forceOpen === undefined ? (refs.task?.open ?? true) : forceOpen;
    const teacherOpen = refs.teacherPanel?.open ?? false;
    root.replaceChildren(); for (const key of Object.keys(refs)) delete refs[key];
    root.append(el('h3', '', L('分子课堂 · 预测、观察、解释', 'Molecular classroom · Predict, observe, explain')));
    const choices = el('div', 'mo-lesson-cards');
    for (const lesson of lessons) {
      const card = button('mo-lesson-' + lesson.id, '', () => { active = lesson.id; teacher = lesson.preset; render(true); });
      card.classList.add('mo-lesson-card'); card.dataset.lesson = lesson.id; card.setAttribute('aria-pressed', String(active === lesson.id));
      card.append(el('strong', '', tx(lesson.title)), el('span', '', tx(lesson.goal))); choices.append(card);
    }
    root.append(choices);
    if (active) root.append(taskPanel(getLesson(active), taskOpen));
    root.append(teacherPanel(teacherOpen)); teacherNotes();
    const error = el('p', 'mo-lesson-error'); error.id = 'mo-lesson-error'; error.setAttribute('role', 'alert'); error.hidden = true; root.append(error); refs.error = error;
    updateReturnButton(); updateProgress();
  }
  document.addEventListener('molecularlab:change', updateProgress);
  document.addEventListener('electronlab:languagechange', () => render());
  window.MolecularClassroom = Object.freeze({
    snapshot: () => ({ activeLesson: active, teacherPreset: teacher, projection, answers: copy(answers), experiment: copy(snap()) }),
    exportRecord
  });
  render();
})();
