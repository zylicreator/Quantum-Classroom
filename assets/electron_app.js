(function () {
  'use strict';
  const root = document.getElementById('hydrogen-demo');
  if (!root || typeof d3 === 'undefined' || typeof ElectronModel === 'undefined') return;
  const M = ElectronModel, A = AtomModel, $ = id => root.querySelector('#ec-' + id);
  const I = window.ElectronI18n;
  const L = (zh,en) => I.pick(zh,en);
  const displayLabel = (s=currentSpec()) => {
    const label=(s.atom && !s.mixed ? M.states[s.id].label : s.label).replace('s · spherical',L('s · 球形','s · spherical'));
    return s.atom ? s.atom.symbol+' · '+(s.mixed ? L('全部已占据轨道','all occupied orbitals') : label) : label;
  };
  const emitChange = () => document.dispatchEvent(new CustomEvent('electronlab:change'));
  const ui = Object.fromEntries(['n', 'family', 'state', 'orbital-info', 'catalog', 'view', 'color', 'yaw', 'pitch', 'yaw-value', 'pitch-value', 'view-caption', 'legend-first', 'legend-second', 'radial', 'radial-info', 'radial-legend', 'total', 'speed', 'radius', 'radius-value', 'play', 'one', 'batch', 'finish', 'new', 'reveal', 'status', 'canvas', 'cloud', 'cloud-axes', 'cloud-info', 'convergence', 'frequency-info', 'theory-info', 'tooltip', 'frequency-legend', 'theory-legend', 'clt-n', 'clt-new', 'clt-info', 'clt-warning', 'clt-plots', 'clt-raw', 'clt-z'].map(id => [id, $(id)]));
  for (const id of ['mode','element','scope','subshell','scale','radial-scale','radial-title','radial-caption','atom-panel','atom-configuration','atom-source','screening-info','element-field','scope-field','subshell-field','n-field','family-field','state-field','occupancy','occupancy-details','legend-third','legend-fourth']) ui[id]=$(id);
  for (const id of ['guide','guided-mode','explore-mode','guide-title','guide-description','guide-primary','guide-next','guide-feedback','guide-context','measurement-note','beginner-help']) ui[id]=$(id);
  let guideStep=0;
  const isGuided=()=>root.classList.contains('ec-guided');
  const maxSamples=Math.max(...Array.from(ui.total.options,option=>Number(option.value)));
  const cloudPointLimit=50000;
  let atomContext=null;
  const currentSpec=()=>atomContext ? atomContext.spec : M.states[state];
  const currentPoints=(count,seed)=>atomContext ? atomContext.points(count,seed) : M.points(state,count,seed);
  const currentProbability=r=>atomContext ? atomContext.probability(r) : M.probability(state,r);
  const currentDensity=r=>atomContext ? atomContext.radialDensity(r) : M.radialDensity(state,r);
  const currentNodes=()=>atomContext ? atomContext.nodes : M.radialInfo(state).nodes;
  let state = '1s', seed = 20261005, cltSeed = 7319;
  let total = 10000, speed = 1500, radius = 1, count = 1000, playing = false, revealed = false;
  let samples = [], pathData = [], hits = 0, groups = [], probability = 0;
  let frequencyVisible = true, theoryVisible = true, lastFrame = 0, pending = 0, lastDraw = 0;
  let convergenceState = null;
  const pct = value => (100 * value).toFixed(2) + '%';
  const fmt = value => value.toLocaleString(I.locale());
  const decimal = value => Number(value.toPrecision(3)).toString();
  const theme = token => {
    const probe = document.createElement('span');
    probe.style.color = 'var(' + token + ')';
    probe.style.display = 'none';
    root.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  };
  let colors;
  function updateColors() {
    colors = {inside: theme('--viz-series-1'), outside: theme('--viz-series-2'), reference: theme('--viz-series-3'), fourth:theme('--viz-series-4'), foreground: theme('--foreground'), border: theme('--border')};
  }
  function refreshData() {
    probability = currentProbability(radius);
    const data = M.series(samples, radius, total);
    pathData = data.values;
    hits = count ? pathData[count - 1].hits : 0;
  }
  function clearTip() { ui.tooltip.hidden = true; }
  function stop() { playing = false; pending = 0; updateButtons(); }
  function updateButtons() {
    ui.play.textContent =L( playing ? '暂停' : count >= total ? '已完成' : isGuided() ? '自动累积' : count ? '继续累积' : '开始累积', playing ? 'Pause' : count >= total ? 'Complete' : isGuided() ? 'Auto-accumulate' : count ? 'Resume' : 'Start');
    ui.play.disabled = count >= total;
    for (const key of ['one', 'batch', 'finish']) ui[key].disabled = count >= total;
    const noun=L(atomContext ? '模型概率' : '理论概率',atomContext ? 'model probability' : 'theoretical probability');
    ui.reveal.textContent =L( revealed ? '隐藏'+noun : '揭晓'+noun, revealed ? 'Hide '+noun : 'Reveal '+noun);
    ui['theory-legend'].lastChild.textContent=noun;
    ui.reveal.setAttribute('aria-pressed', String(revealed));
    ui['theory-legend'].hidden = !revealed;
    ui.new.textContent=L(isGuided() ? '重新从 0 开始' : '换一组测量',isGuided() ? 'Restart from 0' : 'New experiment');
    ui.finish.textContent=L(isGuided() ? `直接看 ${fmt(total)} 次` : '看到最后',isGuided() ? `Show all ${fmt(total)}` : 'Finish experiment');
  }
  function updateLearningView() {
    const guided=isGuided();
    root.dataset.guideStep=String(guideStep);
    ui.guide.hidden=ui['measurement-note'].hidden=ui['beginner-help'].hidden=!guided;
    ui['guided-mode'].setAttribute('aria-pressed',String(guided));
    ui['explore-mode'].setAttribute('aria-pressed',String(!guided));
    for(const button of root.querySelectorAll('[data-guide-target]')) {
      if(Number(button.dataset.guideTarget)===guideStep) button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    }
    for(const button of root.querySelectorAll('[data-guide-scene]')) button.setAttribute('aria-pressed',String(ui.mode.value==='hydrogen'&&state===button.dataset.guideScene));
    if(atomContext) {
      const s=atomContext.spec,a=s.atom,name=a.symbol;
      ui['guide-context'].textContent=L(`当前：${name}原子（${a.z} 个电子）· ${s.mixed ? '全原子的近似密度，每次随机选一个电子测量' : '选定单个轨道的近似密度'}。`+(a.reference ? '' : '组态仅为理想填充示意。'),`Current: ${name} atom (${a.z} electrons) · ${s.mixed ? 'approximate whole-atom density; one randomly chosen electron per measurement' : 'approximate density of the selected orbital'}. `+(a.reference ? '' : 'The configuration illustrates ideal filling only.'));
    } else {
      const names=L({'1s':'球形云团','2pz':'上下两个云瓣','3dxy':'四个云瓣'},{'1s':'a spherical cloud','2pz':'two lobes, above and below','3dxy':'four lobes'});
      ui['guide-context'].textContent=L('当前：H 原子 · '+(names[state]||displayLabel(M.states[state]))+'。每次实验只有一个电子。','Current: H · '+(names[state]||displayLabel(M.states[state]))+'. Each experiment has just one electron.');
    }
    ui['measurement-note'].textContent=L(guideStep===2 ? '量子模型先给出位置概率。大数定律解释大量独立测量的频率为什么会趋近这个概率；它不能单独决定电子云的形状。' : '一个点是一条测量记录。点密集的区域，表示在同样大小的空间里更容易发现电子；二维投影也会叠加不同深度的点。',guideStep===2 ? 'The quantum model supplies the position probabilities. The law of large numbers explains why frequencies approach these probabilities across many independent measurements. It does not determine the cloud shape by itself.' : 'Each dot records one measurement. In equal volumes, denser regions are more likely to contain the electron. This 2D projection also overlaps points at different depths.');
    const descriptions=[
      L(['第一步：先记录一个位置','每按一次按钮，就把原子重新制备到相同状态，再模拟一次独立的位置测量。新点的位置可以和上一次不同。'],['Step 1: Record one position','Each click prepares the atom in the same state again, then simulates one independent position measurement. The next position may be different.']),
      L(['第二步：把许多落点累积成云','继续测量，观察哪些区域更密集。许多个点是许多次实验的记录；两个或四个云瓣，也不代表有两个或四个电子。'],['Step 2: Build a cloud from many dots','Keep measuring and look for denser regions. Many dots record many experiments. Two or four lobes do not mean two or four electrons.']),
      L(['第三步：看球内比例怎样稳定','蓝点在三维观察球内，橙点在球外。先看球内次数占全部测量的比例，再揭晓模型预测；测量增多时比例通常趋向预测，但不会每一步都更接近。'],['Step 3: Watch the proportion settle','Blue dots lie inside the 3D sphere; orange dots lie outside. Compare the fraction inside with the model prediction. More measurements tend to bring them closer, but not at every step.'])
    ];
    ui['guide-title'].textContent=descriptions[guideStep][0];
    ui['guide-description'].textContent=descriptions[guideStep][1];
    ui['guide-primary'].textContent=L(guideStep===0 ? '模拟测一次' : guideStep===1 ? '再累积 100 次' : revealed ? '隐藏预测，继续观察' : '揭晓预测概率',guideStep===0 ? 'Simulate one measurement' : guideStep===1 ? 'Add 100 measurements' : revealed ? 'Hide prediction' : 'Reveal predicted probability');
    ui['guide-primary'].disabled=guideStep<2 ? count>=total : count===0;
    ui['guide-next'].textContent=L(guideStep===0 ? '下一步：累积成云' : guideStep===1 ? '下一步：看比例' : '进入自由探索',guideStep===0 ? 'Next: Build a cloud' : guideStep===1 ? 'Next: Compare the proportion' : 'Explore freely');
    ui['guide-next'].disabled=guideStep===0 ? count===0 : guideStep===1 ? count<Math.min(100,total) : false;
    let feedback=L( count ? `已记录 ${fmt(count)} 次独立测量。` : '还没有测量。先留下第一个点。', count ? `${fmt(count)} independent measurement${count===1 ? "" : "s"} recorded. ` : 'No measurements yet. Start with the first dot. ');
    if(guideStep===0&&count) feedback+=L('再测一次，会增加一条新的位置记录。','Measure again to add a new position record.');
    if(guideStep===1) feedback+=L(count>=100 ? '可以继续增加次数，或进入下一步比较比例。' : '试着累积至少 100 次，再看看云团的形状。',count>=100 ? 'Keep adding measurements, or go to the next step to compare the proportion.' : 'Try at least 100 measurements, then look at the cloud shape.');
    if(guideStep===2&&count) {
      feedback+=L(`其中 ${fmt(hits)} 次在球内，球内比例为 ${pct(hits/count)}。`,`${fmt(hits)} are inside the sphere: ${pct(hits/count)} of all measurements. `);
      if(revealed) feedback+=L(`预测概率为 ${pct(probability)}，本组相差 ${(100*Math.abs(hits/count-probability)).toFixed(2)} 个百分点；重新实验仍会有随机波动。`,`The predicted probability is ${pct(probability)}; this experiment differs by ${(100*Math.abs(hits/count-probability)).toFixed(2)} percentage points. New experiments still fluctuate randomly.`);
    }
    ui['guide-feedback'].textContent=feedback;
  }
  function setLearningMode(guided) {
    stop();root.classList.toggle('ec-guided',guided);
    if(guided) { guideStep=count<100 ? 0 : revealed ? 2 : 1; ui.view.value='rotate';ui.scale.value='auto'; }
    updateText();redraw();
  }
  function setGuideStep(step) {
    stop();guideStep=step;updateText();redrawMain();
  }
  function chooseGuidedScene(id) {
    stop();guideStep=0;root.classList.add('ec-guided');
    const s=M.states[id];
    ui.mode.value='hydrogen';ui.n.value=String(s.n);populateOrbitals(true);
    ui.family.value=s.family;populateOrbitals();ui.state.value=id;state=id;
    ui.view.value='rotate';ui.yaw.value=0;ui.pitch.value=id==='3dxy' ? 85 : 0;
    ui.scale.value='auto';ui.color.value='sphere';ui['radial-scale'].value='linear';
    newMeasurement(true);
  }
  function updateText(announce = false) {
    const s = currentSpec();
    const branch =L( s.m === 0 ? 'm = 0' : `|m| = ${s.m} 的${s.kind === 'cos' ? '余弦' : '正弦'}实组合`, s.m === 0 ? 'm = 0' : `real ${s.kind === 'cos' ? 'cosine' : 'sine'} combination, |m| = ${s.m}`);
    ui['orbital-info'].textContent =L( s.mixed ? `${displayLabel(s)} · ${s.atom.z} 个电子的归一化密度 · 子层内按方向平均 · 不共享单个轨道的节点与相位` : `${displayLabel(s)} · n = ${s.n} · l = ${s.l} · ${branch} · 径向节点 ${s.radialNodes} 个 · 角节点 ${s.angularNodes} 个`, s.mixed ? `${displayLabel(s)} · normalized density for ${s.atom.z} electrons · angularly averaged within each subshell · no shared orbital nodes or phase` : `${displayLabel(s)} · n = ${s.n} · l = ${s.l} · ${branch} · ${s.radialNodes} radial nodes · ${s.angularNodes} angular nodes`);
    ui['radius-value'].textContent = decimal(radius) + ' a₀';
    ui['frequency-info'].textContent =L( `已测量 ${fmt(count)} 次 · 球内 ${fmt(hits)} 次 · 累计频率 ${count ? pct(hits / count) : '—'}`, `${fmt(count)} measurement${count===1 ? "" : "s"} · ${fmt(hits)} inside · cumulative frequency ${count ? pct(hits / count) : '—'}`);
    const noun=L(isGuided() ? (atomContext ? '近似模型预测' : '理论预测概率') : atomContext ? '近似模型概率' : '理论概率',isGuided() ? (atomContext ? 'Approximate model prediction' : 'Theoretical prediction') : atomContext ? 'Approximate model probability' : 'Theoretical probability');
    ui['theory-info'].textContent =L( revealed ? `${noun} ${pct(probability)}（${probability.toFixed(6)}，径向数值积分）` : noun+'尚未揭晓', revealed ? `${noun}: ${pct(probability)} (${probability.toFixed(6)}, numerical radial integration)` : noun+': not yet revealed');
    if (announce) ui.status.textContent =L( count >= total ? `本组 ${fmt(total)} 次测量已完成。` : playing ? `正在累积测量点 · 目标 ${fmt(total)} 次。` : `已暂停在 ${fmt(count)} 次测量。`, count >= total ? `All ${fmt(total)} measurements are complete.` : playing ? `Accumulating measurements · target: ${fmt(total)}.` : `Paused at ${fmt(count)} measurements.`);
    updateButtons();
    updateLearningView();
    emitChange();
  }
  function newMeasurement(changeState = false) {
    stop(); seed = (seed + 104729) >>> 0;
    syncContext();
    if (changeState) {
      const s=currentSpec(); radius = s.radius;
      ui.radius.min=s.radius/20; ui.radius.step='any'; ui.radius.max=s.radiusMax;
      ui.radius.value = radius;
      revealed = false;
    }
    samples = currentPoints(maxSamples, seed);
    if(isGuided()) { guideStep=0;revealed=false; }
    count = changeState&&!isGuided() ? Math.min(1000,total) : 0;
    refreshData(); updateText(true); redraw(); refreshCLT();
    if (changeState&&!isGuided()) ui.status.textContent =L( `已预览 ${fmt(count)} 次独立测量。可继续累积，或点击“换一组测量”从 0 开始。`, `Previewing ${fmt(count)} independent measurements. Continue accumulating, or select "New experiment" to start from 0.`);
  }
  function populateOrbitals(changeLevel = false) {
    const n = Number(ui.n.value), previous = ui.family.value;
    if (changeLevel) {
      ui.family.replaceChildren(...Array.from({length:n},(_,l) => new Option(`${'spdf'[l]} · l = ${l}`,'spdf'[l])));
      if ('spdf'.indexOf(previous)<n) ui.family.value = previous;
    }
    const family = ui.family.value;
    ui.state.replaceChildren(...Object.values(M.states).filter(s => s.n===n && s.family===family).map(s => new Option(displayLabel(s),s.id)));
    state = ui.state.value;
  }
  function populateAtomDirections() {
    const shell=ui.subshell.value;
    const choices=Object.values(M.states).filter(s=>s.n===Number(shell[0])&&s.family===shell[1]);
    const previous=state;
    ui.state.replaceChildren(...choices.map(s=>new Option(displayLabel(s),s.id)));
    if(choices.some(s=>s.id===previous)) ui.state.value=previous;
    state=ui.state.value;
  }
  function populateAtom() {
    const a=A.atom(Number(ui.element.value)), previous=ui.subshell.value;
    ui.subshell.replaceChildren(...a.subshells.map(s=>new Option(L(`${s.key} · ${s.electrons} 电子`,`${s.key} · ${s.electrons} electrons`),s.key)));
    if(a.subshells.some(s=>s.key===previous)) ui.subshell.value=previous;
    else ui.subshell.value=a.subshells.reduce((best,s)=>s.l>best.l||(s.l===best.l&&s.n>best.n) ? s : best).key;
    populateAtomDirections(); fillOccupancy(a);
  }
  function fillOccupancy(a) {
    ui.occupancy.replaceChildren();
    for(const s of a.subshells) {
      const row=document.createElement('tr'), orbitals=2*s.l+1;
      for(const value of [s.key,s.electrons,'',s.effectiveCharge.toFixed(2),decimal(M.states[s.n+s.family+M.directions[s.family][0].key].meanRadius/s.effectiveCharge)]) {
        const cell=document.createElement('td'); cell.textContent=value; row.append(cell);
      }
      const cell=row.children[2];
      for(let j=0;j<orbitals;j++) { const box=document.createElement('span'); box.className='ec-orbital-box'; box.textContent=(j<s.electrons ? '↑' : '')+(j<s.electrons-orbitals ? '↓' : '') || ' '; cell.append(box); }
      row.title='σ = '+s.contributions.map(c=>`${c.key}: ${c.electrons}×${c.coefficient}`).join(' + ');
      ui.occupancy.append(row);
    }
  }
  function syncContext() {
    const atomic=ui.mode.value==='atom', mixed=atomic&&ui.scope.value==='whole';
    atomContext=atomic ? (mixed ? A.wholeAtom(Number(ui.element.value)) : A.orbital(Number(ui.element.value),state)) : null;
    for(const key of ['element-field','scope-field','atom-panel','occupancy-details']) ui[key].hidden=!atomic;
    ui['n-field'].hidden=ui['family-field'].hidden=atomic;
    ui['subshell-field'].hidden=!atomic||mixed; ui['state-field'].hidden=mixed;
    ui.color.querySelector('option[value="phase"]').disabled=mixed;
    if(mixed&&ui.color.value==='phase') ui.color.value='family';
    if(atomic) {
      const s=atomContext.spec,a=s.atom;
      ui['atom-configuration'].textContent=L(`${a.symbol} · Z = ${a.z} · ${a.z} 个电子 · ${a.configuration}`,`${a.symbol} · Z = ${a.z} · ${a.z} electrons · ${a.configuration}`);
      ui['atom-source'].textContent=L(L(a.reference ? 'NIST 中性原子参考组态（H–U）' : '理想填充示意；并非实测基态组态',a.reference ? 'NIST neutral-atom reference configurations (H-U)' : 'Ideal filling illustration; not an observed ground-state configuration')+(a.reference ? '；轨道形状另用屏蔽近似计算。' : '；较重元素的组态及形状仅作教学示意。'),L(a.reference ? 'NIST 中性原子参考组态（H–U）' : '理想填充示意；并非实测基态组态',a.reference ? 'NIST neutral-atom reference configurations (H-U)' : 'Ideal filling illustration; not an observed ground-state configuration')+(a.reference ? '; orbital shapes use a separate screening approximation.' : '; configurations and shapes of these heavier elements are teaching illustrations only.'));
      ui['screening-info'].textContent=L(mixed ? '每个子层使用自己的 Z_eff，按电子数加权叠加位置密度。每次从独立制备的原子中随机抽取一个电子。' : `${s.subshell.key}：σ = ${s.subshell.sigma.toFixed(2)}，Z_eff = ${a.z} − ${s.subshell.sigma.toFixed(2)} = ${s.effectiveCharge.toFixed(2)}；径向尺度缩小为同一 H 轨道的 1/${s.effectiveCharge.toFixed(2)}。`,mixed ? 'Each subshell uses its own Z_eff. Position densities are weighted by electron count and added. Each measurement samples one randomly chosen electron from an independently prepared atom.' : `${s.subshell.key}: σ = ${s.subshell.sigma.toFixed(2)}, Z_eff = ${a.z} − ${s.subshell.sigma.toFixed(2)} = ${s.effectiveCharge.toFixed(2)}; radial distances scale to 1/${s.effectiveCharge.toFixed(2)} of the matching H orbital.`);
    }
  }
  function fillCatalog() {
    ui.catalog.replaceChildren();
    for (let n=1;n<=4;n++) {
      const row = document.createElement('tr'), level = document.createElement('td'), names = document.createElement('td');
      level.textContent =L( `n = ${n}（${n*n} 个）`, `n = ${n} (${n*n} orbitals)`);
      for (let l=0;l<n;l++) { const line=document.createElement('div'); line.textContent=Object.values(M.states).filter(s => s.n===n && s.l===l).map(s => displayLabel(s)).join(L('、',', ')); names.append(line); }
      row.append(level,names); ui.catalog.append(row);
    }
  }
  function advance(target, announce = true) {
    count = Math.max(count, Math.min(total, Math.floor(target)));
    hits = count ? pathData[count - 1].hits : 0;
    if (count >= total) stop();
    updateText(announce); redrawMain();
  }
  function configureSvg(element, height, accessibleTitle) {
    const width = Math.max(220, element.parentElement.getBoundingClientRect().width);
    const svg = d3.select(element);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);
    svg.append('title').text(accessibleTitle);
    return {svg, width, height};
  }
  function axes(svg, width, height, x, y, xLabel, yLabel, xCount = 4, yCount = 4, xFormat, yFormat) {
    const margin = {left: 64, right: 16, top: 16, bottom: 52};
    const frame = {left: margin.left, right: width - margin.right, top: margin.top, bottom: height - margin.bottom};
    x.range([frame.left + 2, frame.right - 2]);
    y.range([frame.bottom - 2, frame.top + 2]);
    svg.append('rect').attr('data-chart-frame', '').attr('x', frame.left).attr('y', frame.top).attr('width', frame.right - frame.left).attr('height', frame.bottom - frame.top).attr('fill', 'none').attr('stroke', 'var(--border)');
    let xa = d3.axisBottom(x).ticks(xCount).tickSizeOuter(0);
    if (typeof x.base === 'function' && x.domain()[0]>=1) {
      const end = x.domain()[1], choices = [1];
      for (let power = 10; power < end; power *= 10) choices.push(power);
      choices.push(end);
      const maxTicks = width < 360 ? 4 : 6;
      const selected = choices.length <= maxTicks ? choices : Array.from({length: maxTicks}, (_, i) => choices[Math.round(i*(choices.length-1)/(maxTicks-1))]);
      xa = xa.tickValues(selected).tickFormat(fmt);
    }
    if (xFormat) xa = xa.tickFormat(xFormat);
    let ya = d3.axisLeft(y).ticks(yCount).tickSizeOuter(0);
    if (yFormat) ya = ya.tickFormat(yFormat);
    const gx = svg.append('g').attr('transform', `translate(0,${frame.bottom})`).call(xa);
    gx.selectAll('.domain').remove();
    const gy = svg.append('g').attr('transform', `translate(${frame.left},0)`).call(ya);
    gy.selectAll('.domain').remove();
    svg.append('text').attr('class', 'axis-title').attr('data-axis', 'x').attr('x', (frame.left + frame.right) / 2).attr('y', height - 7).attr('text-anchor', 'middle').text(xLabel);
    svg.append('text').attr('class', 'axis-title').attr('data-axis', 'y').attr('transform', `translate(16,${(frame.top + frame.bottom) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text(yLabel);
    // Measure labels and remove overlapping optional ticks without shrinking text.
    [gx, gy].forEach(g => {
      let previous = null;
      g.selectAll('.tick').each(function () {
        const label = this.querySelector('text');
        if (!label || !label.textContent) return;
        const box = label.getBoundingClientRect();
        if (previous && box.left < previous.right + 4 && box.top < previous.bottom + 4 && box.bottom > previous.top - 4) this.remove();
        else previous = box;
      });
    });
    gx.selectAll('.tick text').each(function () {
      const b = this.getBBox(), transform = this.parentElement.transform.baseVal.consolidate();
      const position = transform ? transform.matrix.e : 0;
      if (position + b.x < 2) d3.select(this).attr('text-anchor', 'start');
      if (position + b.x + b.width > width - 2) d3.select(this).attr('text-anchor', 'end');
    });
    return frame;
  }
  function project(p) {
    switch (ui.view.value) {
      case 'xz': return [p.x,p.z,p.y];
      case 'xy': return [p.x,p.y,p.z];
      case 'yz': return [p.y,p.z,p.x];
      default: {
        const yaw=Number(ui.yaw.value)*Math.PI/180, pitch=Number(ui.pitch.value)*Math.PI/180;
        const horizontal=p.x*Math.cos(yaw)+p.y*Math.sin(yaw), depth=-p.x*Math.sin(yaw)+p.y*Math.cos(yaw);
        return [horizontal,p.z*Math.cos(pitch)-depth*Math.sin(pitch),p.z*Math.sin(pitch)+depth*Math.cos(pitch)];
      }
    }
  }
  function drawCloud() {
    const width = Math.max(220, ui.cloud.getBoundingClientRect().width);
    const height = width;
    const view = ui.view.value, singleColor=isGuided()&&guideStep<2, phase = !isGuided()&&ui.color.value === 'phase';
    const labels =L( {rotate:['投影水平 / a₀','投影竖直 / a₀'],xz:['x / a₀','z / a₀'],xy:['x / a₀','y / a₀'],yz:['y / a₀','z / a₀']}[view], {rotate:['Horizontal projection / a₀','Vertical projection / a₀'],xz:['x / a₀','z / a₀'],xy:['x / a₀','y / a₀'],yz:['y / a₀','z / a₀']}[view]);
    const {svg} = configureSvg(ui['cloud-axes'], height, L(`${displayLabel()} 的位置测量投影，坐标单位 a₀`,`${displayLabel()} position measurements projected onto a plane; coordinates in a₀`));
    ui['cloud-axes'].setAttribute('aria-label',L(`${ui.view.selectedOptions[0].text}，坐标单位为玻尔半径 a₀`,`${ui.view.selectedOptions[0].text}; coordinates in Bohr radii, a₀`));
    const extent = ui.scale.value==='auto' ? currentSpec().extent : Number(ui.scale.value);
    const left = 64, right = 16, top = 16, bottom = 52;
    const side = Math.min(width - left - right, height - top - bottom);
    const frame = {left, right: left + side, top, bottom: top + side};
    const x = d3.scaleLinear().domain([-extent, extent]).range([frame.left, frame.right]);
    const z = d3.scaleLinear().domain([-extent, extent]).range([frame.bottom, frame.top]);
    svg.append('rect').attr('data-chart-frame', '').attr('x', left).attr('y', top).attr('width', side).attr('height', side).attr('fill', 'none').attr('stroke', 'var(--border)');
    svg.append('g').attr('transform', `translate(0,${frame.bottom})`).call(d3.axisBottom(x).ticks(width < 360 ? 3 : 4).tickSizeOuter(0)).select('.domain').remove();
    svg.append('g').attr('transform', `translate(${left},0)`).call(d3.axisLeft(z).ticks(4).tickSizeOuter(0)).select('.domain').remove();
    svg.append('text').attr('class', 'axis-title').attr('data-axis', 'x').attr('x', left + side / 2).attr('y', frame.bottom + 42).attr('text-anchor', 'middle').text(labels[0]);
    svg.append('text').attr('class', 'axis-title').attr('data-axis', 'y').attr('transform', `translate(16,${top + side / 2}) rotate(-90)`).attr('text-anchor', 'middle').text(labels[1]);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = ui.canvas;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    const context = canvas.getContext('2d');
    context.scale(ratio, ratio);
    context.clearRect(0, 0, width, height);
    context.save(); context.beginPath(); context.rect(left, top, side, side); context.clip();
    let offscreen = 0;
    const dotRadius = count < 500 ? 2.1 : count < 5000 ? 1.4 : 0.85;
    const alpha = count < 500 ? .8 : count < 5000 ? .6 : count < 20000 ? .48 : .28;
    const visible=[];
    const displayCount=Math.min(count,cloudPointLimit);
    let chosen=0,nextIndex=displayCount ? Math.floor(.5*count/displayCount) : -1;
    // Select by measurement index, before applying the window clip. Every
    // measurement still contributes to offscreen counts and all statistics.
    for (let i=0;i<count;i++) {
      const p=samples[i],q=project(p),outside=Math.abs(q[0])>extent||Math.abs(q[1])>extent;
      if(outside) offscreen++;
      if(i===nextIndex) {
        if(!outside) visible.push({p,q});
        chosen++;nextIndex=chosen<displayCount ? Math.floor((chosen+.5)*count/displayCount) : -1;
      }
    }
    const familyColor=!isGuided()&&ui.color.value==='family', palette=[colors.inside,colors.outside,colors.reference,colors.fourth];
    for (let category = 0; category < (singleColor ? 1 : familyColor ? 4 : 2); category++) {
      context.fillStyle = palette[category];
      context.globalAlpha = alpha;
      for (const {p,q} of visible) {
        if ((singleColor ? 0 : familyColor ? (p.l ?? M.states[state].l) : phase ? (p.phase>0 ? 0 : 1) : (p.r<=radius ? 0 : 1)) !== category) continue;
        context.beginPath(); context.arc(x(q[0]), z(q[1]), dotRadius, 0, 2 * Math.PI); context.fill();
      }
    }
    if(!singleColor) {
      context.globalAlpha = .65;
      context.strokeStyle = colors.foreground; context.lineWidth = 1;
      context.setLineDash([5, 4]); context.beginPath(); context.arc(x(0), z(0), side * radius / (2 * extent), 0, 2 * Math.PI); context.stroke(); context.setLineDash([]);
    }
    context.restore();
    svg.append('path').attr('d', `M${x(0)-4},${z(0)}h8M${x(0)},${z(0)-4}v8`).attr('stroke', 'var(--foreground)').attr('stroke-width', 1.5).attr('fill', 'none');
    if (view==='rotate'&&!isGuided()) {
      const ox=frame.right-44, oy=frame.bottom-40, length=26;
      for (const [name,unit] of [['x',{x:1,y:0,z:0}],['y',{x:0,y:1,z:0}],['z',{x:0,y:0,z:1}]]) {
        const q=project(unit), ex=ox+length*q[0], ey=oy-length*q[1];
        svg.append('line').attr('x1',ox).attr('y1',oy).attr('x2',ex).attr('y2',ey).attr('stroke','var(--foreground)').attr('stroke-width',1);
        svg.append('text').attr('x',ex+3).attr('y',ey-3).text(name);
      }
    }
    ui['yaw-value'].textContent=ui.yaw.value+'°'; ui['pitch-value'].textContent=ui.pitch.value+'°';
    ui.yaw.disabled=ui.pitch.disabled=view!=='rotate';
    ui['legend-first'].textContent=L(singleColor ? '独立测量的位置' : familyColor ? 's' : phase ? 'ψ 为正' : isGuided() ? '在观察球内' : '球内 · 三维距离 ≤ R',singleColor ? 'Independent position measurements' : familyColor ? 's' : phase ? 'Positive ψ' : isGuided() ? 'Inside the sphere' : 'Inside · 3D distance ≤ R');
    ui['legend-second'].textContent=L(familyColor ? 'p' : phase ? 'ψ 为负' : isGuided() ? '在观察球外' : '球外',familyColor ? 'p' : phase ? 'Negative ψ' : isGuided() ? 'Outside the sphere' : 'Outside');
    ui['legend-second'].parentElement.hidden=singleColor;
    ui['legend-third'].hidden=ui['legend-fourth'].hidden=!familyColor;
    ui['view-caption'].textContent=L(isGuided() ? (singleColor ? '画面把三维落点投影到屏幕上，不同深度的点会重叠；可以拖动云图转一转。' : '颜色按真实三维距离判断。虚线圆只是观察球的投影，圆内的橙点也可能在球外。') : (view==='rotate' ? '拖动点云或调整角度旋转；画面是三维位置的正交投影。' : ui.view.selectedOptions[0].text+'；不同深度的点会重叠。')+'虚线为观察球的轮廓，球外点也可能投影在圆内。'+(familyColor ? '颜色表示抽样所来自的子层类型。' : phase ? '两种颜色表示波函数的正负，不表示电荷。' : '颜色按真实三维距离判断。'),isGuided() ? (singleColor ? '3D positions are projected onto the screen, so points at different depths overlap. Drag the cloud to rotate it.' : 'Colors use the true 3D distance. The dashed circle is only the sphere\'s projection: orange dots inside the circle can still lie outside the sphere.') : (view==='rotate' ? 'Drag the cloud or adjust the angles to rotate this orthographic projection. ' : ui.view.selectedOptions[0].text+'; points at different depths overlap. ')+'The dashed outline projects the sphere; points outside it in 3D may appear inside the circle. '+(familyColor ? 'Colors identify the sampled subshell type.' : phase ? 'Colors indicate the sign of the wavefunction, not electric charge.' : 'Colors use the true 3D distance.'));
    const selectionNote=L(count>cloudPointLimit ? ` · 点云均匀选取 ${fmt(displayCount)} 次测量显示，统计使用全部 ${fmt(count)} 次` : '',count>cloudPointLimit ? ` · cloud displays ${fmt(displayCount)} measurements selected evenly by index; statistics use all ${fmt(count)}` : '');
    ui['cloud-info'].textContent =L( `显示范围 ±${decimal(extent)} a₀ · 原点十字为核 · 全部测量中窗口外 ${fmt(offscreen)} 点（仍参与统计）${selectionNote}`, `View range ±${decimal(extent)} a₀ · cross marks the nucleus · ${fmt(offscreen)} measurement${offscreen===1 ? "" : "s"} outside the window (still counted in statistics)${selectionNote}`);
    canvas.setAttribute('aria-label', L(`${displayLabel()}，已累积 ${fmt(count)} 个独立测量点，${fmt(hits)} 点在观察球内，${fmt(offscreen)} 点在显示窗口外。选取 ${fmt(displayCount)} 次测量作点云显示，其中 ${fmt(visible.length)} 点绘在窗口内；统计使用全部测量。`,`${displayLabel()}: ${fmt(count)} independent measurement points, ${fmt(hits)} inside the sphere, ${fmt(offscreen)} outside the view. ${fmt(displayCount)} measurements selected for the cloud; ${fmt(visible.length)} drawn inside the window. Statistics use every measurement.`));
    canvas.textContent=L('电子位置测量点','Electron position measurements');
  }
  function drawRadial() {
    const s=currentSpec(), extent=s.extent, nodes=currentNodes(), logarithmic=ui['radial-scale'].value==='log';
    const minimum=logarithmic ? (s.mixed ? Math.min(...s.channels.map(c=>c.states[0].meanRadius/c.effectiveCharge))/60 : s.meanRadius/60) : 0;
    const title=L(s.mixed ? '从径向分布看内外电子层' : '从径向分布看球壳节点',s.mixed ? 'Inner and outer shells in the radial distribution' : 'Find spherical nodes in the radial distribution');
    ui['radial-title'].textContent=title;
    ui['radial-caption'].textContent=L(logarithmic ? '对数刻度把内层与外层放在同一张图上。纵轴为 log₁₀(r/a₀) 的密度；统计仍使用真实半径。' : '三维投影可能掩盖节点。这里把每个点到核的距离单独统计，揭晓后可对照模型曲线。',logarithmic ? 'A logarithmic scale puts inner and outer shells on one plot. The vertical axis is density per unit log₁₀(r/a₀); statistics still use the actual radii.' : 'A projection can hide nodes. Here we plot each point\'s distance from the nucleus. Reveal the prediction to compare with the model curve.');
    const {svg,width,height}=configureSvg(ui.radial,260,displayLabel(s)+L(' 的径向分布',' radial distribution'));
    const data=samples.slice(0,count).map(p=>p.r);
    const breaks=Array.from({length:51},(_,i)=>logarithmic ? minimum*Math.pow(extent/minimum,i/50) : extent*i/50);
    const bins=d3.bin().domain([minimum,extent]).thresholds(breaks)(data).filter(b=>b.x1>b.x0);
    const density=b=>count ? b.length/(count*(logarithmic ? Math.log10(b.x1/b.x0) : b.x1-b.x0)) : 0;
    const curve=Array.from({length:801},(_,i)=> {
      const r=logarithmic ? minimum*Math.pow(extent/minimum,i/800) : extent*i/800;
      return {r,d:currentDensity(r)*(logarithmic ? r*Math.LN10 : 1)};
    });
    const ymax=d3.max([...bins.map(density),...(revealed ? curve.map(p=>p.d) : [0])]) || .1;
    const x=(logarithmic ? d3.scaleLog() : d3.scaleLinear()).domain([minimum,extent]);
    const y=d3.scaleLinear().domain([0,ymax*1.15]);
    const logFormat=v=>Math.abs(Math.log10(v)-Math.round(Math.log10(v)))<1e-8 ? decimal(v) : '';
    const frame=axes(svg,width,height,x,y,'r / a₀'+(logarithmic ? L(' · 对数刻度',' · log scale') : ''),logarithmic ? L('对数半径密度','Density per log radius') : L('径向概率密度','Radial probability density'),width<400 ? 3 : 6,3,logarithmic ? logFormat : null,decimal);
    const clipId='ec-radial-clip';
    svg.append('defs').append('clipPath').attr('id',clipId).append('rect').attr('x',frame.left).attr('y',frame.top).attr('width',frame.right-frame.left).attr('height',frame.bottom-frame.top);
    const plot=svg.append('g').attr('clip-path','url(#'+clipId+')');
    plot.selectAll('rect').data(bins).join('rect').attr('x',b=>x(b.x0)).attr('width',b=>Math.max(0,x(b.x1)-x(b.x0)-.8)).attr('y',b=>y(density(b))).attr('height',b=>y(0)-y(density(b))).attr('fill','var(--viz-series-1)').attr('fill-opacity',.4);
    if(revealed) {
      plot.append('path').datum(curve).attr('d',d3.line().x(p=>x(p.r)).y(p=>y(p.d))).attr('stroke','var(--viz-series-3)').attr('stroke-width',2).attr('fill','none');
      nodes.filter(r=>r>=minimum&&r<=extent).forEach((r,i)=>{
        plot.append('line').attr('x1',x(r)).attr('x2',x(r)).attr('y1',frame.top).attr('y2',frame.bottom).attr('stroke','var(--foreground)').attr('stroke-dasharray','3 4').attr('stroke-opacity',.6);
        if(width>500) svg.append('text').attr('x',x(r)+4).attr('y',frame.top+14+i%2*16).text(L('节点 ','Node ')+decimal(r));
      });
    }
    ui['radial-legend'].hidden=!revealed;
    ui['radial-legend'].lastChild.textContent=L(atomContext ? '模型径向密度' : '理论径向密度',atomContext ? 'Model radial density' : 'Theoretical radial density');
    const average=count ? d3.mean(data) : null, outside=data.filter(r=>r<minimum||r>extent).length;
    ui['radial-info'].textContent=L('测量平均半径 '+(average===null ? '—' : decimal(average)+' a₀')+
      (revealed ? ' · '+(atomContext ? '模型' : '理论')+'平均半径 '+decimal(s.meanRadius)+' a₀'+
        (s.mixed ? ' · 混合密度无统一的轨道节点' : ' · 径向节点 '+(nodes.length ? nodes.map(r=>decimal(r)+' a₀').join('、') : '无'))
        : ' · 揭晓后显示参考曲线、平均半径与节点')+
      ' · 图外 '+fmt(outside)+' 次测量仍计入平均值','Measured mean radius: '+(average===null ? '—' : decimal(average)+' a₀')+
      (revealed ? ' · '+(atomContext ? 'model' : 'theoretical')+' mean radius: '+decimal(s.meanRadius)+' a₀'+
        (s.mixed ? ' · mixed density has no shared orbital nodes' : ' · radial nodes: '+(nodes.length ? nodes.map(r=>decimal(r)+' a₀').join(', ') : 'none'))
        : ' · reveal the reference curve, mean radius and nodes')+
      ' · '+fmt(outside)+' measurements outside the plot still contribute to the mean');




  }
  function compactSeries(values, maxPoints = 1300) {
    if (values.length <= maxPoints) return values;
    const chosen = [];
    // Dense at the beginning on the logarithmic axis; retain local extrema later.
    const first = Math.min(250, values.length);
    chosen.push(...values.slice(0, first));
    const stride = Math.max(1, Math.ceil((values.length - first) / ((maxPoints - first) / 2)));
    for (let start = first; start < values.length; start += stride) {
      const end = Math.min(values.length, start + stride);
      let min = start, max = start;
      for (let i = start + 1; i < end; i++) { if (values[i].frequency < values[min].frequency) min = i; if (values[i].frequency > values[max].frequency) max = i; }
      for (const i of [...new Set([min, max])].sort((a, b) => a - b)) chosen.push(values[i]);
    }
    if (chosen.at(-1) !== values.at(-1)) chosen.push(values.at(-1));
    return chosen;
  }
  function drawConvergence() {
    const height = ui.cloud.getBoundingClientRect().width;
    const {svg, width} = configureSvg(ui.convergence, height, L('球内累计频率随独立测量次数变化；横轴为对数刻度','Cumulative frequency inside the sphere versus independent measurement count; logarithmic horizontal axis'));
    const x = d3.scaleLog().domain(d3.extent([1, total]));
    const domain = d3.extent([0, 1, ...pathData.slice(0, count).map(d => d.frequency)]);
    const y = d3.scaleLinear().domain(domain);
    const frame = axes(svg, width, height, x, y, L('测量次数 · 对数刻度','Measurements · log scale'), isGuided() ? L('观察球内的比例','Proportion inside sphere') : L('球内频率','Frequency inside sphere'), width < 360 ? 3 : 4, 4, null, d3.format('.0%'));
    const clipId = 'ec-frequency-clip';
    svg.append('defs').append('clipPath').attr('id', clipId).append('rect').attr('x', frame.left).attr('y', frame.top).attr('width', frame.right-frame.left).attr('height', frame.bottom-frame.top);
    const plot = svg.append('g').attr('clip-path', `url(#${clipId})`);
    if (revealed && theoryVisible) plot.append('line').attr('x1', frame.left + 2).attr('x2', frame.right - 2).attr('y1', y(probability)).attr('y2', y(probability)).attr('stroke', 'var(--viz-series-3)').attr('stroke-width', 1.5).attr('stroke-dasharray', '6 4');
    if (frequencyVisible && count) {
      const line = d3.line().x(d => x(d.n)).y(d => y(d.frequency));
      plot.append('path').datum(compactSeries(pathData.slice(0, count))).attr('d', line).attr('fill', 'none').attr('stroke', 'var(--viz-series-1)').attr('stroke-width', 1.5);
      plot.append('circle').attr('cx', x(count)).attr('cy', y(hits/count)).attr('r', 2.5).attr('fill', 'var(--viz-series-1)');
    }
    const hover = svg.append('g').attr('visibility', 'hidden');
    hover.append('line').attr('data-chart-hover-guide', '').attr('y1', frame.top).attr('y2', frame.bottom).attr('stroke', 'var(--border)');
    const frequencyMarker = hover.append('circle').attr('data-chart-hover-marker', '').attr('data-series', 'frequency').attr('r', 3).attr('fill', 'var(--viz-series-1)');
    const theoryMarker = hover.append('circle').attr('data-chart-hover-marker', '').attr('data-series', 'theory').attr('r', 3).attr('fill', 'var(--viz-series-3)');
    svg.append('rect').attr('data-chart-hit', '').attr('data-chart-hover-overlay', 'cross-series').attr('x', frame.left).attr('y', frame.top).attr('width', frame.right-frame.left).attr('height', frame.bottom-frame.top).attr('fill', 'transparent').on('pointermove', event => showConvergenceTip(event)).on('pointerleave', () => { clearTip(); hover.attr('visibility', 'hidden'); }).on('click', event => showConvergenceTip(event));
    convergenceState = {x, y, frame, hover, frequencyMarker, theoryMarker, width};
  }
  function placeTip(event, text) {
    ui.tooltip.textContent = text; ui.tooltip.hidden = false;
    const rootBox = root.getBoundingClientRect();
    const box = ui.tooltip.getBoundingClientRect();
    const left = Math.max(0, Math.min(rootBox.width - box.width, event.clientX - rootBox.left + 12));
    const top = Math.max(0, event.clientY - rootBox.top - box.height - 12);
    ui.tooltip.style.left = left + 'px'; ui.tooltip.style.top = top + 'px';
  }
  function showConvergenceTip(event) {
    if (!count || !convergenceState) return;
    const c = convergenceState;
    const box = ui.convergence.getBoundingClientRect();
    const cursorX = Math.max(c.frame.left + 2, Math.min(c.frame.right - 2, (event.clientX-box.left) * c.width / box.width));
    const n = c.x.invert(cursorX);
    if (n > count) { clearTip(); c.hover.attr('visibility', 'hidden'); return; }
    const low = Math.max(1, Math.min(count, Math.floor(n))), high = Math.min(count, low + 1);
    const f1 = pathData[low-1].frequency, f2 = pathData[high-1].frequency;
    const fraction = high === low ? 0 : (Math.log(n)-Math.log(low))/(Math.log(high)-Math.log(low));
    const f = f1 + fraction * (f2-f1);
    c.hover.attr('visibility', 'visible').select('line').attr('x1', cursorX).attr('x2', cursorX);
    c.frequencyMarker.attr('cx', cursorX).attr('cy', c.y(f)).attr('visibility', frequencyVisible ? 'visible' : 'hidden');
    c.theoryMarker.attr('cx', cursorX).attr('cy', c.y(probability)).attr('visibility', revealed && theoryVisible ? 'visible' : 'hidden');
    const near = d3.bisector(d => d.n).center(pathData.slice(0, count), n);
    const parts = [`n ≈ ${fmt(pathData[near].n)}`];
    if (frequencyVisible) parts.push(L(`频率 ${pct(f)}`,`Frequency ${pct(f)}`));
    if (revealed && theoryVisible) parts.push(L(`${atomContext ? '模型' : '理论'} ${pct(probability)}`,`${atomContext ? 'Model' : 'Theory'} ${pct(probability)}`));
    placeTip(event, parts.join(' · '));
  }
  function refreshCLT(reuse = false) {
    clearTip();
    const n = Number(ui['clt-n'].value);
    const sigma = Math.sqrt(probability * (1-probability) / n);
    ui['clt-plots'].hidden = !revealed;
    ui['clt-new'].disabled = !revealed;
    if (!revealed) {
      groups = [];
      ui['clt-info'].textContent =L( `揭晓${atomContext ? '模型' : '理论'}概率后，显示重复实验及标准化误差。`, `Reveal the ${atomContext ? 'model' : 'theoretical'} probability to see repeated experiments and standardized errors.`);
      ui['clt-warning'].textContent = '';
      return;
    }
    if (!(probability>0 && probability<1)) {
      groups=[]; ui['clt-plots'].hidden=true; ui['clt-new'].disabled=true;
      ui['clt-info'].textContent=L('当前球内概率在数值精度下为 0 或 1，无法按非零标准差进行标准化。请调整观察球半径。','At numerical precision, the probability inside this sphere is 0 or 1. The standard deviation is zero, so standardization is unavailable. Adjust the sphere radius.');
      ui['clt-warning'].textContent=''; return;
    }
    if (reuse!==true) groups = M.repeated(probability, n, 1200, cltSeed);
    const average = d3.mean(groups, d => d.frequency);
    ui['clt-info'].textContent =L( `1,200 组 · 每组 ${fmt(n)} 次 · 频率均值 ${pct(average)} · ${atomContext ? '模型' : '理论'}标准差 ${(100*sigma).toFixed(2)} 个百分点`, `1,200 experiments · ${fmt(n)} measurements each · mean frequency ${pct(average)} · ${atomContext ? 'model' : 'theoretical'} standard deviation ${(100*sigma).toFixed(2)} percentage points`);
    const sparse = n * Math.min(probability, 1-probability) < 10;
    ui['clt-warning'].textContent =L( sparse ? '当前球内或球外的预期次数偏少：分布会明显离散或偏斜，正态近似可能较差。' : '增大每组次数：左图频率更集中，右图的标准化误差逐渐接近同一条正态曲线。', sparse ? 'The expected count inside or outside is small. The distribution can be visibly discrete or skewed, making the normal approximation poor.' : 'Increase measurements per experiment: frequencies on the left become more concentrated, while standardized errors on the right approach the same normal curve.');
    drawCLT();
  }
  function histogram(element, data, standardized) {
    const {svg, width, height} = configureSvg(element, 300, standardized ? L('重复实验的标准化误差密度，与标准正态分布比较','Density of standardized errors across repeated experiments, compared with the standard normal distribution') : L('重复实验的球内频率密度','Density of frequencies inside the sphere across repeated experiments'));
    const field = standardized ? 'z' : 'frequency';
    const values = data.map(d => d[field]);
    const anchors = standardized ? [-4, 4] : [0, 1];
    let [minimum, maximum] = d3.extent([...values, ...anchors]);
    if (standardized) { const pad = (maximum-minimum)*.04; minimum -= pad; maximum += pad; }
    const x = d3.scaleLinear().domain([minimum, maximum]);
    const n = Number(ui['clt-n'].value), sigma = Math.sqrt(probability*(1-probability)/n);
    const thresholds = standardized ? d3.range(minimum, maximum, Math.max(.28, (maximum-minimum)/42)) : d3.range(-.5/n, 1+1/n, Math.max(1/n, .025));
    const bins = d3.bin().domain([minimum, maximum]).thresholds(thresholds)(values).filter(b => b.x1 > b.x0);
    const density = b => b.length/(data.length*(b.x1-b.x0));
    const normal = value => Math.exp(-value*value/2)/Math.sqrt(2*Math.PI);
    const ymax = d3.max([...bins.map(density), standardized ? normal(0) : 0]);
    const y = d3.scaleLinear().domain([0, ymax * 1.12 || 1]);
    const frame = axes(svg, width, height, x, y, standardized ? 'Z = (p̂ − p) / σ' : L('每组球内频率 p̂','Frequency per experiment p̂'), L('概率密度','Probability density'), width < 360 ? 3 : 4, 4, standardized ? d3.format('~g') : d3.format('.0%'), decimal);
    const clipId = standardized ? 'ec-z-clip' : 'ec-raw-clip';
    svg.append('defs').append('clipPath').attr('id', clipId).append('rect').attr('x', frame.left).attr('y', frame.top).attr('width', frame.right-frame.left).attr('height', frame.bottom-frame.top);
    const plot = svg.append('g').attr('clip-path', `url(#${clipId})`);
    plot.selectAll('rect').data(bins).join('rect').attr('data-hist-bin', '').attr('x', b => x(b.x0)).attr('width', b => Math.max(0, x(b.x1)-x(b.x0)-.8)).attr('y', b => y(density(b))).attr('height', b => y(0)-y(density(b))).attr('fill', 'var(--viz-series-1)').attr('fill-opacity', .55);
    if (standardized) {
      const curve = d3.range(minimum, maximum+.01, (maximum-minimum)/240).map(v => ({x:v,y:normal(v)}));
      plot.append('path').datum(curve).attr('d', d3.line().x(d => x(d.x)).y(d => y(d.y))).attr('fill', 'none').attr('stroke', 'var(--viz-series-3)').attr('stroke-width', 2).attr('stroke-dasharray', '6 4');
    } else plot.append('line').attr('x1', x(probability)).attr('x2', x(probability)).attr('y1', frame.top).attr('y2', frame.bottom).attr('stroke', 'var(--viz-series-3)').attr('stroke-width', 1.5).attr('stroke-dasharray', '6 4');
    svg.append('rect').attr('data-chart-hit', '').attr('x', frame.left).attr('y', frame.top).attr('width', frame.right-frame.left).attr('height', frame.bottom-frame.top).attr('fill', 'transparent').on('pointermove', event => {
      const rect = element.getBoundingClientRect(), value = x.invert((event.clientX-rect.left)*width/rect.width);
      const b = bins.find(bin => value >= bin.x0 && value <= bin.x1);
      if (!b) return clearTip();
      const bound = standardized ? v => v.toFixed(2) : pct;
      placeTip(event, L(`${bound(b.x0)} ～ ${bound(b.x1)} · ${fmt(b.length)} 组 · 密度 ${decimal(density(b))}`,`${bound(b.x0)} to ${bound(b.x1)} · ${fmt(b.length)} experiments · density ${decimal(density(b))}`));
    }).on('pointerleave', clearTip);
  }
  function drawCLT() {
    if (!revealed || !groups.length) return;
    histogram(ui['clt-raw'], groups, false);
    histogram(ui['clt-z'], groups, true);
  }
  function redrawMain() { clearTip(); drawCloud(); drawConvergence(); drawRadial(); }
  function redraw() { redrawMain(); drawCLT(); }
  function snapshot() {
    const selected=M.states[state];
    return {version:2,model:ui.mode.value,element:Number(ui.element.value),scope:ui.scope.value,
      state,n:selected.n,family:selected.family,subshell:ui.subshell.value,guided:isGuided(),guideStep,
      count,total,speed,radius,seed,cltSeed,revealed,view:ui.view.value,color:ui.color.value,
      scale:ui.scale.value,radialScale:ui['radial-scale'].value,yaw:Number(ui.yaw.value),
      pitch:Number(ui.pitch.value),cltN:Number(ui['clt-n'].value),hits,probability,
      frequency:count ? hits/count : null,playing};
  }
  function loadPreset(config = {}) {
    const fail = message => { throw new Error(L('无效课堂预设：','Invalid classroom preset: ')+message); };
    if (!config || typeof config!=='object' || Array.isArray(config)) fail(L('配置必须是对象','configuration must be an object'));
    const allowed=new Set(['model','element','scope','state','guided','guideStep','total','count','radius','seed','cltSeed','revealed','color','scale','view','yaw','pitch','cltN']);
    if(Object.keys(config).some(key=>!allowed.has(key))) fail(L('存在不支持的字段','unsupported field'));
    const next={model:'atom',element:26,scope:'orbital',state:'1s',guided:true,guideStep:0,
      total:10000,count:0,seed:20261011,cltSeed:7319,revealed:false,color:'sphere',scale:'auto',
      view:'rotate',yaw:0,pitch:0,cltN:100,...config};
    const menu=(key,value)=>Array.from(ui[key].options).some(option=>option.value===String(value));
    for(const key of ['model','scope','color','scale','view']) {
      const id=key==='model' ? 'mode' : key;
      if(typeof next[key]!=='string' || !menu(id,next[key])) fail(key);
    }
    if(!Number.isInteger(next.element) || !A.elements.some(element=>element.z===next.element)) fail('element');
    const selected=M.states[next.state];
    if(typeof next.state!=='string' || !Object.prototype.hasOwnProperty.call(M.states,next.state)) fail('state');
    if(next.model==='hydrogen' && selected.n>4) fail(L('H 原子仅开放 n ≤ 4','H requires n ≤ 4'));
    const atom=A.atom(next.element);
    if(next.model==='atom' && !atom.subshells.some(shell=>shell.n===selected.n&&shell.family===selected.family)) fail(L('所选轨道的子层未被占据','selected subshell is unoccupied'));
    if(next.model==='atom' && next.scope==='whole' && next.color==='phase') fail(L('全原子密度没有统一相位','whole-atom density has no shared phase'));
    for(const key of ['guided','revealed']) if(typeof next[key]!=='boolean') fail(key);
    if(!Number.isInteger(next.guideStep) || next.guideStep<0 || next.guideStep>2) fail('guideStep');
    if(!Number.isInteger(next.total) || next.total>100000 || !menu('total',next.total)) fail('total');
    if(!Number.isInteger(next.count) || next.count<0 || next.count>next.total) fail('count');
    for(const key of ['seed','cltSeed']) if(!Number.isInteger(next[key]) || next[key]<0 || next[key]>0xffffffff) fail(key);
    for(const key of ['yaw','pitch']) if(!Number.isInteger(next[key]) || next[key]<Number(ui[key].min) || next[key]>Number(ui[key].max)) fail(key);
    if(!Number.isInteger(next.cltN) || !menu('clt-n',next.cltN)) fail('cltN');
    const context=next.model==='atom' ? (next.scope==='whole' ? A.wholeAtom(next.element) : A.orbital(next.element,next.state)) : null;
    const spec=context ? context.spec : selected;
    if(!Object.prototype.hasOwnProperty.call(config,'radius')) next.radius=spec.radius;
    if(typeof next.radius!=='number' || !Number.isFinite(next.radius) || next.radius<spec.radius/20 || next.radius>spec.radiusMax) fail('radius');
    // Validate and generate before changing the live controls. Both models use
    // the supplied seed directly, so loading the same preset repeats its data.
    const nextSamples=context ? context.points(maxSamples,next.seed) : M.points(next.state,maxSamples,next.seed);
    stop();
    ui.mode.value=next.model;ui.element.value=String(next.element);ui.scope.value=next.scope;
    state=next.state;
    if(next.model==='atom') {
      populateAtom();ui.subshell.value=selected.n+selected.family;populateAtomDirections();
    } else {
      ui.n.value=String(selected.n);populateOrbitals(true);ui.family.value=selected.family;populateOrbitals();
    }
    state=next.state;ui.state.value=state;
    ui.total.value=String(next.total);total=next.total;count=next.count;
    seed=next.seed;cltSeed=next.cltSeed;revealed=next.revealed;guideStep=next.guideStep;
    root.classList.toggle('ec-guided',next.guided);
    for(const key of ['color','scale','view','yaw','pitch']) ui[key].value=String(next[key]);
    ui['clt-n'].value=String(next.cltN);ui['radial-scale'].value=next.model==='atom'&&next.scope==='whole' ? 'log' : 'linear';
    syncContext();
    radius=next.radius;ui.radius.min=spec.radius/20;ui.radius.max=spec.radiusMax;ui.radius.step='any';ui.radius.value=String(radius);
    samples=nextSamples;frequencyVisible=theoryVisible=true;
    ui['frequency-legend'].setAttribute('aria-pressed','true');ui['theory-legend'].setAttribute('aria-pressed','true');
    lastFrame=lastDraw=pending=0;
    refreshData();updateText(true);redrawMain();refreshCLT();emitChange();
    return snapshot();
  }
  window.ElectronLab=Object.freeze({snapshot,loadPreset,pause:stop,redraw});
  document.addEventListener('electronlab:languagechange',()=>{
    const selected=state;
    if(ui.mode.value==='atom') populateAtom();
    else populateOrbitals(true);
    state=selected;ui.state.value=selected;
    fillCatalog();syncContext();updateText(true);redrawMain();refreshCLT(true);
  });
  ui['guided-mode'].addEventListener('click',()=>setLearningMode(true));
  ui['explore-mode'].addEventListener('click',()=>setLearningMode(false));
  for(const button of root.querySelectorAll('[data-guide-scene]')) button.addEventListener('click',()=>chooseGuidedScene(button.dataset.guideScene));
  for(const button of root.querySelectorAll('[data-guide-target]')) button.addEventListener('click',()=>setGuideStep(Number(button.dataset.guideTarget)));
  ui['guide-primary'].addEventListener('click',()=>{
    stop();
    if(guideStep<2) advance(count+(guideStep===0 ? 1 : 100));
    else { revealed=!revealed;updateText();redrawMain();refreshCLT(); }
  });
  ui['guide-next'].addEventListener('click',()=>{ if(guideStep<2) setGuideStep(guideStep+1);else setLearningMode(false); });
  ui.state.addEventListener('change', () => { state = ui.state.value; newMeasurement(true); });
  ui.mode.addEventListener('change',()=>{
    ui.color.value='phase'; ui['radial-scale'].value='linear';
    if(ui.mode.value==='atom') populateAtom(); else { populateOrbitals(true); ui.scale.value='auto'; }
    newMeasurement(true);
  });
  ui.element.addEventListener('change',()=>{ populateAtom(); newMeasurement(true); });
  ui.subshell.addEventListener('change',()=>{ populateAtomDirections(); newMeasurement(true); });
  ui.scope.addEventListener('change',()=>{ ui['radial-scale'].value=ui.scope.value==='whole' ? 'log' : 'linear'; ui.color.value=ui.scope.value==='whole' ? 'family' : 'phase'; newMeasurement(true); });
  ui.scale.addEventListener('change',drawCloud);
  ui['radial-scale'].addEventListener('change',drawRadial);
  ui.n.addEventListener('change',()=>{ populateOrbitals(true); newMeasurement(true); });
  ui.family.addEventListener('change',()=>{ populateOrbitals(); newMeasurement(true); });
  for (const key of ['view','color']) ui[key].addEventListener('change',()=>{ drawCloud();emitChange(); });
  for (const key of ['yaw','pitch']) ui[key].addEventListener('input',drawCloud);
  let drag=null;
  ui.canvas.addEventListener('pointerdown',event=>{
    if (ui.view.value!=='rotate' || event.button!==0) return;
    drag={x:event.clientX,y:event.clientY,yaw:Number(ui.yaw.value),pitch:Number(ui.pitch.value)};
    ui.canvas.setPointerCapture(event.pointerId);
  });
  ui.canvas.addEventListener('pointermove',event=>{
    if (!drag) return;
    const angle=drag.yaw+(event.clientX-drag.x)*.65;
    ui.yaw.value=Math.round(((angle+180)%360+360)%360-180);
    ui.pitch.value=Math.round(Math.max(-85,Math.min(85,drag.pitch+(event.clientY-drag.y)*.5)));
    drawCloud();
  });
  for (const name of ['pointerup','pointercancel','lostpointercapture']) ui.canvas.addEventListener(name,()=>{drag=null;});
  ui.total.addEventListener('change', () => {
    stop(); total = Number(ui.total.value); count = Math.min(count, total);
    refreshData(); updateText(true); redrawMain();
  });
  ui.speed.addEventListener('change', () => { speed = Number(ui.speed.value); pending = 0; });
  ui.radius.addEventListener('input', () => { radius = Number(ui.radius.value); refreshData(); updateText(); redrawMain(); refreshCLT(); });
  ui.play.addEventListener('click', () => { playing = !playing; pending = 0; lastFrame = 0; updateText(true); });
  ui.one.addEventListener('click', () => { stop(); advance(count+1); });
  ui.batch.addEventListener('click', () => { stop(); advance(count+100); });
  ui.finish.addEventListener('click', () => { stop(); advance(total); });
  ui.new.addEventListener('click', () => newMeasurement());
  ui.reveal.addEventListener('click', () => { revealed = !revealed; updateText(); redrawMain(); refreshCLT(); });
  ui['frequency-legend'].addEventListener('click', () => { frequencyVisible = !frequencyVisible; ui['frequency-legend'].setAttribute('aria-pressed', String(frequencyVisible)); drawConvergence(); clearTip(); });
  ui['theory-legend'].addEventListener('click', () => { theoryVisible = !theoryVisible; ui['theory-legend'].setAttribute('aria-pressed', String(theoryVisible)); drawConvergence(); clearTip(); });
  ui['clt-n'].addEventListener('change', refreshCLT);
  ui['clt-new'].addEventListener('click', () => { cltSeed = (cltSeed+65537) >>> 0; refreshCLT(); });
  function tick(time) {
    const elapsed = lastFrame ? Math.max(0, Math.min(.25, (time-lastFrame)/1000)) : 0;
    lastFrame = time;
    if (playing) {
      pending += elapsed * speed;
      const amount = Math.floor(pending);
      if (amount > 0 && time-lastDraw >= 75) {
        pending -= amount; lastDraw = time;
        advance(count+amount, false);
        if (!playing) updateText(true);
      }
    }
    requestAnimationFrame(tick);
  }
  updateColors();
  ui.element.replaceChildren(...A.elements.map(e=>new Option(e.z+' · '+e.symbol,String(e.z))));
  ui.element.value='26'; fillCatalog(); populateAtom(); chooseGuidedScene('1s');
  const resize = new ResizeObserver(() => redraw());
  resize.observe(ui.cloud);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', () => { updateColors(); redraw(); });
  new MutationObserver(() => { updateColors(); drawCloud(); }).observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'style', 'data-theme']});
  requestAnimationFrame(tick);
})();
