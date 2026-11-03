/* Bilingual classroom prompts and reproducible teaching scenarios. */
(function () {
  'use strict';

  window.ElectronLessons = {
    lessons: [
      {
        id: 'positions',
        title: { zh: '任务 1 · 每个点是什么？', en: 'Task 1 · What is each dot?' },
        goal: { zh: '解释一次位置测量与累积点云的关系。', en: 'Connect one position measurement with the accumulated cloud.' },
        question: { zh: '图中的一个点代表什么？', en: 'What does one dot represent?' },
        choices: [
          { id: 'a', text: { zh: '同一电子连续运动时留下的一个轨迹点。', en: 'One point along a continuous path traced by the same electron.' } },
          { id: 'b', text: { zh: '独立制备同一量子态后的一次位置测量记录。', en: 'One position measurement after an independent preparation of the same quantum state.' } },
          { id: 'c', text: { zh: '原子中另一个电子在这一刻的位置。', en: 'The position of another electron in the atom at this moment.' } }
        ],
        answerId: 'b',
        explanation: {
          zh: '每个点模拟一次位置测量：先独立制备同一量子态，再记录测得的位置。累积点云表示这些重复实验的分布，不是一个电子的连续轨迹。这里的 H 只有一个电子；2pz 的两个云瓣也不表示两个电子。',
          en: 'Each dot simulates one position measurement: independently prepare the same quantum state, then record the measured position. The accumulated cloud shows the distribution of repeated experiments, not a continuous electron path. H here has one electron; the two lobes of 2pz do not mean two electrons.'
        },
        reflectionPrompt: { zh: '用自己的话说明一个点如何得到，以及多个云瓣为什么不表示多个电子。', en: 'Explain in your own words how one dot is obtained and why several lobes do not mean several electrons.' },
        rubric: [
          { zh: '说明每个点是一条位置测量记录。', en: 'Identify each dot as one position measurement record.' },
          { zh: '说明各次实验独立制备同一量子态，不是连续追踪同一电子。', en: 'Explain that each experiment independently prepares the same state, rather than continuously tracking one electron.' },
          { zh: '区分点云的空间分布与原子中的电子数。', en: 'Distinguish the spatial distribution of the cloud from the number of electrons in the atom.' }
        ],
        observeHint: { zh: '先记录预测，再逐次测量并累积至少 100 次。留意新点如何加入，再选择结论并写下解释。', en: 'Record a prediction first. Take individual measurements and accumulate at least 100. Watch how new dots are added, then choose a conclusion and explain it.' },
        minCount: 100,
        needsReveal: false,
        presetId: 'intro'
      },
      {
        id: 'convergence',
        title: { zh: '任务 2 · 每一步都更接近吗？', en: 'Task 2 · Closer at every step?' },
        goal: { zh: '比较累计频率与固定的模型概率。', en: 'Compare cumulative frequency with a fixed model probability.' },
        question: { zh: '追加测量时，球内频率每一步都更接近预测概率吗？', en: 'Does every added measurement bring the inside-sphere frequency closer to the predicted probability?' },
        choices: [
          { id: 'a', text: { zh: '会，每一步的偏差都一定变小。', en: 'Yes. The error must decrease at every step.' } },
          { id: 'b', text: { zh: '不一定：大量测量下整体趋稳，局部仍可能偏离。', en: 'Not necessarily: many measurements bring overall stability, while local deviations remain possible.' } },
          { id: 'c', text: { zh: '达到 1000 次后，频率就会一直准确等于预测。', en: 'After 1,000 measurements, the frequency stays exactly equal to the prediction.' } }
        ],
        answerId: 'b',
        explanation: {
          zh: '同一量子态与同一观察球对应固定的模型概率。独立测量累积时，频率整体趋近该概率，但偏差不必每一步都减小，也没有某个次数保证此后完全相等。波函数来自所选量子模型；大数定律解释频率的趋近，不负责推导波函数或电子云形状。',
          en: 'The same quantum state and observation sphere give a fixed model probability. As independent measurements accumulate, the frequency approaches that probability overall, but the error need not decrease at every step. No sample count guarantees exact agreement thereafter. The selected quantum model supplies the wavefunction; the law of large numbers explains frequency convergence, not the wavefunction or cloud shape.'
        },
        reflectionPrompt: { zh: '结合曲线的一段变化，解释“整体趋稳”为什么不等于“每一步都更接近”。', en: 'Use a section of the curve to explain why overall stability does not mean getting closer at every step.' },
        rubric: [
          { zh: '区分大量测量下的整体趋近与逐步单调靠近。', en: 'Distinguish overall convergence across many measurements from monotonic improvement at every step.' },
          { zh: '引用曲线上的波动或某段变化；若暂未看到回摆，说明一次有限实验不能保证每一步。', en: 'Refer to a fluctuation or change in the curve. If no reversal is visible, explain why one finite run cannot guarantee every step.' },
          { zh: '说明模型先给出概率，大数定律不生成波函数。', en: 'Explain that the model supplies the probability first; the law of large numbers does not generate the wavefunction.' }
        ],
        observeHint: { zh: '先记录预测；累积至少 1000 次并揭晓预测概率。分批追加测量，比较曲线各段与预测线的距离，再写结论。', en: 'Record a prediction first. Accumulate at least 1,000 measurements and reveal the predicted probability. Add measurements in batches, compare sections of the curve with the prediction line, then explain your conclusion.' },
        minCount: 1000,
        needsReveal: true,
        presetId: 'lln'
      },
      {
        id: 'nodes',
        title: { zh: '任务 3 · 四瓣的颜色是什么？', en: 'Task 3 · What do the lobe colors mean?' },
        goal: { zh: '区分模型的波函数符号与位置测量。', en: 'Distinguish model wavefunction signs from position measurements.' },
        question: { zh: 'H 的 3dxy 四瓣中，两种颜色表示什么？', en: 'What do the two colors in the four lobes of H 3dxy represent?' },
        choices: [
          { id: 'a', text: { zh: '带正电与带负电的两类电子。', en: 'Two kinds of electrons, with positive and negative charge.' } },
          { id: 'b', text: { zh: '所选实波函数的正负符号，由模型标注。', en: 'Positive and negative signs of the selected real wavefunction, labeled by the model.' } },
          { id: 'c', text: { zh: '位置测量直接测出的两种相位结果。', en: 'Two phase outcomes directly obtained by the position measurements.' } }
        ],
        answerId: 'b',
        explanation: {
          zh: '这个 H 场景仍只有一个电子，四瓣是 3dxy 位置概率分布的结构。颜色由程序按所选实波函数的正负符号添加，表示相对相位关系，不表示正负电荷。位置记录按 |ψ|² 采样，本身不直接测出波函数的符号或相位。',
          en: 'This H scenario still has one electron. The four lobes are a feature of the 3dxy position probability distribution. The program adds colors according to the signs of the selected real wavefunction, indicating relative phase, not positive and negative charge. Position records are sampled from |ψ|²; they do not directly measure the wavefunction sign or phase.'
        },
        reflectionPrompt: { zh: '用自己的话说明颜色信息来自哪里，以及它与点的位置记录有什么区别。', en: 'Explain in your own words where the color information comes from and how it differs from the recorded positions.' },
        rubric: [
          { zh: '说明颜色是模型中实波函数正负符号的标注。', en: 'Identify the colors as model labels for the signs of a real wavefunction.' },
          { zh: '说明两种颜色不表示不同电荷，四瓣不表示四个电子。', en: 'Explain that the colors do not mean different charges and the four lobes do not mean four electrons.' },
          { zh: '区分按 |ψ|² 得到的位置记录与额外添加的符号颜色；位置记录本身不直接给出相位。', en: 'Distinguish positions sampled from |ψ|² from the added sign colors; the position records themselves do not directly reveal phase.' }
        ],
        observeHint: { zh: '先记录预测；载入场景后旋转四瓣云，确认至少 1000 次记录，并对照“波函数符号”颜色图例。完成观察后再选结论并自由解释。', en: 'Record a prediction first. Load the scenario, rotate the four-lobe cloud, confirm at least 1,000 records, and consult the wavefunction-sign color key. Then choose a conclusion and explain it in your own words.' },
        minCount: 1000,
        needsReveal: false,
        presetId: 'nodes'
      }
    ],
    presets: [
      {
        id: 'intro',
        title: { zh: '入门 · 从一个点到一片云', en: 'Introduction · From a dot to a cloud' },
        duration: { zh: '8–12 分钟（建议）', en: '8–12 minutes (suggested)' },
        objective: { zh: '让学生解释点、重复实验与概率分布的关系。', en: 'Help students explain the relationship between dots, repeated experiments, and a probability distribution.' },
        teacherNotes: [
          { zh: '按“预测 → 观察 → 解释”展开：先记录每个点含义的预测，再测一次，随后累积至少 100 次。', en: 'Follow “predict → observe → explain”: record a prediction about each dot, take one measurement, then accumulate at least 100.' },
          { zh: '请学生解释点云如何形成，并区分多个云瓣与多个电子；自由解释由师生讨论，不作自动评分。', en: 'Invite students to explain how the cloud forms and distinguish multiple lobes from multiple electrons. Discuss written explanations without automatic grading.' },
          { zh: '强调独立重复制备同一量子态，避免把新增点连成连续运动轨迹。', en: 'Emphasize independent repeated preparations of the same state; avoid connecting the dots into a continuous motion path.' }
        ],
        config: { model: 'hydrogen', state: '2pz', guided: true, guideStep: 0, count: 0, total: 1000, radius: 4, seed: 2026101101, color: 'sphere', scale: 'auto', view: 'rotate', yaw: 0, pitch: 0, revealed: false },
        lessonId: 'positions'
      },
      {
        id: 'lln',
        title: { zh: '频率 · 大量测量会怎样？', en: 'Frequency · What changes with many measurements?' },
        duration: { zh: '10–15 分钟（建议）', en: '10–15 minutes (suggested)' },
        objective: { zh: '借累计频率曲线区分整体趋稳与逐步单调靠近。', en: 'Use the cumulative frequency curve to distinguish overall convergence from monotonic improvement.' },
        teacherNotes: [
          { zh: '按“预测 → 观察 → 解释”展开：先预测是否每步都更接近，再分批累积、揭晓模型概率并解释曲线。', en: 'Follow “predict → observe → explain”: predict whether every step gets closer, accumulate measurements in batches, reveal the model probability, and explain the curve.' },
          { zh: '保持量子态与球半径固定；请学生找局部波动。若单次曲线没有明显回摆，可换一组种子对照。', en: 'Keep the state and sphere radius fixed. Ask students to look for local fluctuations. If one run shows no clear reversal, compare another seed.' },
          { zh: '明确大数定律描述大量独立测量的频率，不保证每一步偏差下降，也不从频率推导量子态或波函数。', en: 'Clarify that the law of large numbers describes frequencies across many independent measurements. It guarantees neither a smaller error at every step nor a derivation of the quantum state or wavefunction from frequency.' },
          { zh: '至少 1000 次是课堂观察门槛，不是保证准确相等的数学阈值。自由解释用于交流与核对思路。', en: 'The 1,000-measurement minimum is an activity requirement, not a mathematical threshold for exact agreement. Use written explanations to discuss and compare reasoning.' }
        ],
        config: { model: 'hydrogen', state: '2pz', guided: true, guideStep: 2, count: 0, total: 10000, radius: 4, seed: 2026101102, color: 'sphere', scale: 'auto', view: 'rotate', yaw: 0, pitch: 0, revealed: false },
        lessonId: 'convergence'
      },
      {
        id: 'nodes',
        title: { zh: '节点 · 四瓣与符号颜色', en: 'Nodes · Four lobes and sign colors' },
        duration: { zh: '8–12 分钟（建议）', en: '8–12 minutes (suggested)' },
        objective: { zh: '理解四瓣是单电子概率分布的结构，颜色是模型的符号标注。', en: 'Understand the four lobes as a feature of a one-electron probability distribution and the colors as model sign labels.' },
        teacherNotes: [
          { zh: '按“预测 → 观察 → 解释”展开：先预测颜色含义，再旋转 3dxy 点云、阅读图例，最后说明颜色信息的来源。', en: 'Follow “predict → observe → explain”: predict what the colors mean, rotate the 3dxy cloud and read the key, then explain where the color information comes from.' },
          { zh: '指出四瓣之间的节点面来自所选 3dxy 模型；有限点云的空白本身不能证明概率严格为零。', en: 'Explain that the nodal planes between the lobes come from the selected 3dxy model. An empty region in a finite cloud alone does not prove exactly zero probability.' },
          { zh: '颜色标注实波函数正负与相对相位，不标注电荷；位置测量按 |ψ|² 采样，本身不直接测出相位。', en: 'The colors label real-wavefunction signs and relative phase, not charge. Position measurements sample |ψ|² and do not directly measure phase.' },
          { zh: '四个云瓣仍对应一个 H 电子；请学生用自己的话解释，讨论时区分模型信息与测量记录。', en: 'The four lobes still describe one H electron. Invite explanations in students’ own words, distinguishing model information from measurement records.' }
        ],
        config: { model: 'hydrogen', state: '3dxy', guided: false, guideStep: 0, count: 1000, total: 10000, radius: 9, seed: 2026101103, color: 'phase', scale: 'auto', view: 'rotate', yaw: 0, pitch: 85, revealed: false },
        lessonId: 'nodes'
      },
      {
        id: 'clt',
        title: { zh: '拓展 · 重复成组实验', en: 'Extension · Repeat experiments in groups' },
        duration: { zh: '10–15 分钟（建议）', en: '10–15 minutes (suggested)' },
        objective: { zh: '比较成组球内频率的分布与标准化误差的正态近似。', en: 'Compare the distribution of group frequencies with a normal approximation for standardized errors.' },
        teacherNotes: [
          { zh: '按“预测 → 观察 → 解释”展开：先预测每组 100 次时频率的分散程度，再运行重复实验，最后比较直方图。', en: 'Follow “predict → observe → explain”: predict the spread of frequencies for groups of 100, run repeated experiments, then compare the histograms.' },
          { zh: '每次测量只记录是否在球内；改变每组次数后，观察频率分布的宽度与标准化误差图。', en: 'Each measurement records whether it falls inside the sphere. Change the group size, then observe the frequency spread and standardized-error plot.' },
          { zh: '正态曲线是大样本近似，适用性还取决于球内概率；有限组直方图不必光滑或完全贴合曲线。', en: 'The normal curve is a large-sample approximation whose suitability also depends on the inside-sphere probability. A finite-group histogram need not be smooth or match the curve exactly.' },
          { zh: '区分两件事：大数定律解释单组频率趋稳，中心极限定理近似描述重复组之间的误差分布；两者都不推导量子态。', en: 'Distinguish two ideas: the law of large numbers explains stabilization of a group frequency, while the central limit theorem approximates the error distribution across repeated groups. Neither derives the quantum state.' }
        ],
        config: { model: 'hydrogen', state: '1s', guided: false, guideStep: 0, count: 1000, total: 10000, radius: 1.5, seed: 2026101104, color: 'sphere', scale: 'auto', view: 'rotate', yaw: 0, pitch: 0, revealed: true, cltN: 100 }
      }
    ]
  };
})();
