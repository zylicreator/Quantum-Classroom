/* Two-center, one-electron classroom. Computation lives in molecular_model.js. */
(function (global) {
  'use strict';
  const mount = document.getElementById('molecular-demo');
  if (!mount) return;
  const model = global.MolecularModel;
  if (!model) throw new Error('MolecularModel must load before molecular_app.js');
  const tr = (zh, en) => global.ElectronI18n ? global.ElectronI18n.pick(zh,en) : zh;
  const texts = {
    eyebrow:['从原子到分子','FROM ATOMS TO MOLECULES'],title:['分子轨道实验室','Molecular Orbital Laboratory'],
    intro:['两个原子核，一个电子：电子的位置会怎样分布？从 H₂⁺ 出发，先预测，再重复模拟位置测量，看看核间区域出现多少个点。','Two nuclei, one electron: where could a position measurement land? Start with H₂⁺, make a prediction, then repeat simulated position measurements and count the points between the nuclei.'],
    pill1:['固定的两个原子核','Two fixed nuclei'],pill2:['最小 1s 轨道线性组合','Minimal 1s linear combination'],pill3:['每个点是一次独立测量','One independent measurement per dot'],
    cloudTitle:['看见测量形成的电子云','Watch a cloud emerge from measurements'],cloudHint:['拖动图形旋转，或用方向滑块；核轴是 z 轴。','Drag to rotate, or use the angle sliders. The internuclear axis is z.'],
    nuclei:['原子核 A / B','Nuclei A / B'],slab:['核间观察薄片','Central observation slab'],probDots:['位置测量点','Position measurements'],positive:['模型振幅为正','Positive model amplitude'],negative:['模型振幅为负','Negative model amplitude'],
    view:['观察方向','View'],view3d:['可旋转三维','Rotatable 3D'],viewxz:['侧视投影 xz','Side projection xz'],viewxy:['端视投影 xy','End projection xy'],
    color:['点的颜色','Point colors'],colorProbability:['统一的测量点颜色','Uniform measurement color'],colorPhase:['模型波函数符号','Model wavefunction sign'],yaw:['水平旋转','Horizontal rotation'],pitch:['俯仰角','Tilt'],
    phaseNote:['符号颜色来自模型波函数；位置测量本身不会测出这个符号，也不是正负电荷。','Sign colors come from the model wavefunction. A position measurement does not reveal this sign; the colors do not mean positive or negative charge.'],
    projectionNote:['投影将不同深度的点叠在一起；端视时两个核重合，不能据此判断核间节点。','A projection overlaps different depths. In the end view the nuclei coincide, so this view cannot establish an internuclear node.'],
    regionNote:['计数区域是 |z| < R/4 的中央薄片，在 x、y 方向无限延伸。边框只表示显示窗口；窗口外的测量仍参与统计。','The counted region is the central slab |z| < R/4, extending infinitely in x and y. Its outline shows only the viewing window; off-screen measurements still count.'],
    controls:['设置实验','Set up the experiment'],distance:['核间距离 R','Internuclear distance R'],orbital:['分子轨道','Molecular orbital'],bonding:['成键 σ：两边同号相加','Bonding σ: same signs add'],antibonding:['反键 σ*：两边异号相减','Antibonding σ*: opposite signs subtract'],
    parameterNote:['改变核间距离或轨道会开始新的实验；改变视角、颜色或语言会保留测量。','Changing distance or orbital starts a new experiment. View, color and language changes preserve the measurements.'],
    total:['目标测量次数','Target measurements'],speed:['播放速度（次/秒）','Playback speed (per second)'],one:['测一次','Measure once'],batch:['再测 100 次','Add 100'],play:['开始播放','Play'],pause:['暂停','Pause'],finish:['完成全部测量','Finish all'],fresh:['重新测量','New experiment'],reveal:['揭晓模型概率','Reveal model probability'],
    measured:['测量次数 n','Measurements n'],hits:['落入薄片次数','Hits in slab'],frequency:['薄片中的频率','Frequency in slab'],zero:['还没有测量','No measurements yet'],
    hiddenProbability:['模型概率尚未揭晓。先观察频率，再与模型比较。','Model probability is hidden. Observe the frequency first, then compare with the model.'],probability:['模型概率 p','Model probability p'],error:['频率 − 模型概率','Frequency − model probability'],
    pointNote:['每个点来自独立制备后的单次位置测量；这些点不组成电子运动轨迹。','Each point is one position measurement after an independent preparation. The points do not trace an electron trajectory.'],
    convergence:['测量频率会怎样变化？','How does the measured frequency change?'],convergenceHint:['横轴使用对数刻度，让最初几次测量与大量测量都能看清；接近概率并不意味着每一步都更接近。','A logarithmic horizontal scale shows both early and later measurements. Convergence does not mean every step gets closer.'],nLabel:['测量次数 n（对数刻度）','Measurements n (log scale)'],frequencyLabel:['薄片频率','Slab frequency'],modelProbability:['模型概率','Model probability'],
    amplitude:['沿核轴：先叠加振幅','Along the nuclear axis: add amplitudes first'],density:['沿核轴：再取模平方','Along the nuclear axis: then square the amplitude'],
    axisHint:['下面是 x = y = 0 的轴线取值；不是把横向积分后的 z 边缘分布。','These are values on the line x = y = 0, not the z marginal obtained by integrating over transverse coordinates.'],
    aLabel:['原子轨道 φA','Atomic orbital φA'],bLabel:['原子轨道 φB','Atomic orbital φB'],psiLabel:['归一化分子振幅 ψ','Normalized molecular amplitude ψ'],densityLabel:['分子概率密度 |ψ|²','Molecular probability density |ψ|²'],baseline:['无干涉对照：½(φA² + φB²)','No-interference reference: ½(φA² + φB²)'],
    axisUnits:['z / a₀；振幅单位 a₀⁻³ᐟ²','z / a₀; amplitude in a₀⁻³ᐟ²'],densityUnits:['z / a₀；每单位体积的密度 a₀⁻³','z / a₀; density per unit volume in a₀⁻³'],
    baselineNote:['虚线是等权的两个原子密度混合，仅作对照。分子轨道来自振幅的叠加及归一化，不能直接把两个概率密度相加得到。','The dashed line is an equal-weight mixture of the two atomic densities, used only as a reference. A molecular orbital requires adding and normalizing amplitudes; directly adding densities does not produce it.'],
    details:['模型、公式与适用范围','Model, formulas and scope'],modelText:['采用固定原子核、两个未优化氢 1s 轨道的最小 LCAO 教学模型。距离以玻尔半径 a₀ 为单位；本实验不计算能量、平衡键长或真实反应动力学。','This is a minimal LCAO teaching model with fixed nuclei and two unoptimized hydrogen 1s orbitals. Distances are in Bohr radii a₀. This experiment does not calculate energies, equilibrium bond lengths or reaction dynamics.'],
    formulaText:['φA = exp(−rA) / √π，φB = exp(−rB) / √π；S = exp(−R)(1 + R + R²/3)；ψ± = (φA ± φB) / √[2(1 ± S)]；ρ = |ψ±|²。','φA = exp(−rA) / √π, φB = exp(−rB) / √π; S = exp(−R)(1 + R + R²/3); ψ± = (φA ± φB) / √[2(1 ± S)]; ρ = |ψ±|².'],
    formulaUnits:['公式使用原子单位。重叠积分 S 影响归一化；核间概率通过对三维概率密度积分得到。这里的“成键／反键”标记轨道的组合方式，不代表本页作出了能量预测。','The formulas use atomic units. The overlap S enters normalization; the slab probability is obtained by integrating the three-dimensional density. “Bonding/antibonding” labels the orbital combination; this page makes no energy prediction.'],
    citation:['参考：得克萨斯大学量子力学讲义 · H₂⁺ 分子离子','Reference: University of Texas quantum mechanics notes · H₂⁺ molecular ion']
  };
  const tx = key => tr(...texts[key]);
  const mark = (key,tag='span',extra='') => `<${tag} data-mo-t="${key}" ${extra}></${tag}>`;
  mount.innerHTML = `
    ${mark('eyebrow','p','class="mo-eyebrow"')}${mark('title','h1')}${mark('intro','p','class="mo-intro"')}
    <div class="mo-model-strip">${mark('pill1','span','class="mo-pill"')}${mark('pill2','span','class="mo-pill"')}${mark('pill3','span','class="mo-pill"')}</div>
    <div id="mo-classroom-root"></div>
    <div class="mo-lab-grid">
      <section class="mo-card mo-cloud-card">${mark('cloudTitle','h2')}${mark('cloudHint','p','class="mo-subtle"')}
        <div class="mo-cloud-wrap"><canvas id="mo-cloud" role="img"></canvas></div>
        <div class="mo-cloud-legend"><span><i class="mo-dot nucleus"></i>${mark('nuclei')}</span><span><i class="mo-slab-key"></i>${mark('slab')}</span><span id="mo-color-legend"></span></div>
        <div class="mo-view-controls">
          <label class="mo-field">${mark('view')}<select id="mo-view"><option value="3d" data-mo-t="view3d"></option><option value="xz" data-mo-t="viewxz"></option><option value="xy" data-mo-t="viewxy"></option></select></label>
          <label class="mo-field">${mark('color')}<select id="mo-color"><option value="probability" data-mo-t="colorProbability"></option><option value="phase" data-mo-t="colorPhase"></option></select></label>
        </div>
        <div class="mo-angle-controls"><label>${mark('yaw')}<input id="mo-yaw" type="range" min="-180" max="180" step="1" value="-28"></label><label>${mark('pitch')}<input id="mo-pitch" type="range" min="-80" max="80" step="1" value="18"></label></div>
        <p id="mo-phase-note" class="mo-subtle" data-mo-t="phaseNote" hidden></p><p id="mo-projection-note" class="mo-subtle" data-mo-t="projectionNote" hidden></p>
        ${mark('regionNote','p','class="mo-subtle"')}
        <p id="mo-display-note" class="mo-subtle"></p>
      </section>
      <section class="mo-card">${mark('controls','h2')}
        <label class="mo-field"><span class="mo-distance-label">${mark('distance')}<output id="mo-distance-value" for="mo-distance"></output></span><input id="mo-distance" type="range" min="0.6" max="8" step="0.1" value="2"></label>
        <label class="mo-field">${mark('orbital')}<select id="mo-state"><option value="bonding" data-mo-t="bonding"></option><option value="antibonding" data-mo-t="antibonding"></option></select></label>
        ${mark('parameterNote','p','class="mo-subtle"')}
        <hr class="mo-section-rule">
        <div class="mo-control-pair"><label class="mo-field">${mark('total')}<select id="mo-total"><option>100</option><option>1000</option><option selected>10000</option><option>50000</option><option>100000</option></select></label><label class="mo-field">${mark('speed')}<select id="mo-speed"><option value="500">500</option><option value="2000" selected>2000</option><option value="5000">5000</option><option value="10000">10000</option><option value="20000">20000</option></select></label></div>
        <div class="mo-action-row"><button type="button" class="mo-btn" id="mo-one" data-mo-t="one"></button><button type="button" class="mo-btn" id="mo-batch" data-mo-t="batch"></button><button type="button" class="mo-btn primary" id="mo-play"></button><button type="button" class="mo-btn" id="mo-finish" data-mo-t="finish"></button><button type="button" class="mo-btn" id="mo-new" data-mo-t="fresh"></button></div>
        <div class="mo-stats"><div class="mo-stat"><strong id="mo-count">0</strong>${mark('measured')}</div><div class="mo-stat"><strong id="mo-hits">0</strong>${mark('hits')}</div><div class="mo-stat"><strong id="mo-frequency">—</strong>${mark('frequency')}</div></div>
        <button class="mo-btn" type="button" id="mo-reveal" data-mo-t="reveal"></button>
        <p class="mo-probability" id="mo-probability"></p><p id="mo-status" class="mo-status" aria-live="polite"></p>
        ${mark('pointNote','p','class="mo-subtle"')}
      </section>
    </div>
    <section class="mo-card mo-plot-card">${mark('convergence','h2')}${mark('convergenceHint','p','class="mo-subtle"')}<canvas id="mo-convergence" class="mo-chart" role="img"></canvas><div class="mo-chart-legend"><span><i class="mo-line"></i>${mark('frequencyLabel')}</span><span id="mo-theory-legend"><i class="mo-line sum"></i>${mark('modelProbability')}</span></div></section>
    ${mark('axisHint','p','class="mo-subtle"')}
    <div class="mo-axis-grid">
      <section class="mo-card">${mark('amplitude','h2')}<canvas id="mo-amplitude" class="mo-chart" role="img"></canvas><div class="mo-chart-legend"><span><i class="mo-line a"></i>${mark('aLabel')}</span><span><i class="mo-line b"></i>${mark('bLabel')}</span><span><i class="mo-line"></i>${mark('psiLabel')}</span></div>${mark('axisUnits','p','class="mo-plot-note"')}</section>
      <section class="mo-card">${mark('density','h2')}<canvas id="mo-density" class="mo-chart" role="img"></canvas><div class="mo-chart-legend"><span><i class="mo-line"></i>${mark('densityLabel')}</span><span><i class="mo-line sum"></i>${mark('baseline')}</span></div>${mark('densityUnits','p','class="mo-plot-note"')}${mark('baselineNote','p','class="mo-subtle"')}</section>
    </div>
    <details class="mo-detail">${mark('details','summary')}${mark('modelText','p')}${mark('formulaText','p','class="mo-formula"')}${mark('formulaUnits','p')}<p><a href="https://farside.ph.utexas.edu/teaching/qm/Quantum/node100.html" target="_blank" rel="noopener noreferrer" data-mo-t="citation"></a></p></details>
  `;
  const $ = id => document.getElementById('mo-'+id);
  const state = {R:2,state:'bonding',total:10000,count:0,hits:0,seed:freshSeed(),revealed:false,playing:false,color:'probability',view:'3d',yaw:-28,pitch:18,speed:2000,runId:1};
  let pool = [], prefix = new Uint32Array(1), poolKey = '', probability = model.regionProbability(2,'bonding'), axis = null, frame = 0, lastTick = 0, carry = 0, drag = null;
  const number = value => value.toLocaleString(global.ElectronI18n?.locale()||'zh-CN');
  function freshSeed() { if (global.crypto?.getRandomValues) return global.crypto.getRandomValues(new Uint32Array(1))[0]; return (Date.now() ^ Math.floor(Math.random()*0xffffffff)) >>> 0; }
  function snapshot() { return {...state,frequency:state.count?state.hits/state.count:null,probability,displayLimit:50000,selectedDisplayCount:Math.min(state.count,50000)}; }
  function notify() { document.dispatchEvent(new CustomEvent('molecularlab:change',{detail:{snapshot:snapshot()}})); }
  function ensurePool() {
    const key = `${state.R}|${state.state}|${state.seed}`;
    if (key===poolKey && pool.length>=state.total) return;
    pool = model.points(state.R,state.state,state.total,state.seed); prefix = new Uint32Array(pool.length+1);
    for (let i=0;i<pool.length;i++) prefix[i+1]=prefix[i]+(pool[i].inRegion?1:0);
    poolKey=key;
  }
  function refreshModel() { probability=model.regionProbability(state.R,state.state); axis=model.axisData(state.R,state.state,301); }
  function pause(emit=true) { state.playing=false; if(frame) cancelAnimationFrame(frame); frame=0; lastTick=0; carry=0; updateControls(); if(emit) notify(); }
  function newRun(newSeed=true) { pause(false); state.count=0;state.hits=0;state.revealed=false;state.runId++; if(newSeed)state.seed=freshSeed();pool=[];prefix=new Uint32Array(1);poolKey='';refreshModel();render();notify(); }
  function advance(target) {
    ensurePool();state.count=Math.min(state.total,Math.max(state.count,Math.floor(target)));state.hits=prefix[state.count];
    if(state.count===state.total)pause(false);
    render(false);notify();
  }
  function play() {
    if(state.count>=state.total)return;
    ensurePool();state.playing=true;lastTick=0;carry=0;updateControls();notify();
    const tick = timestamp => { if(!state.playing)return;if(!lastTick)lastTick=timestamp;carry+=(timestamp-lastTick)*state.speed/1000;lastTick=timestamp;const add=Math.floor(carry);if(add){carry-=add;advance(state.count+add);}if(state.playing)frame=requestAnimationFrame(tick); };
    frame=requestAnimationFrame(tick);
  }
  function updateControls() {
    $('distance').value=state.R;$('distance-value').textContent=state.R.toFixed(1)+' a₀';$('state').value=state.state;$('total').value=state.total;$('speed').value=state.speed;$('view').value=state.view;$('color').value=state.color;$('yaw').value=state.yaw;$('pitch').value=state.pitch;
    $('yaw').disabled=$('pitch').disabled=state.view!=='3d';
    $('play').textContent=tx(state.playing?'pause':'play');
    ['one','batch','finish'].forEach(id=>$(id).disabled=state.count>=state.total);$('play').disabled=state.count>=state.total;
    $('reveal').disabled=state.revealed;$('phase-note').hidden=state.color!=='phase';$('projection-note').hidden=state.view==='3d';$('theory-legend').hidden=!state.revealed;
    $('count').textContent=number(state.count);$('hits').textContent=number(state.hits);$('frequency').textContent=state.count?(100*state.hits/state.count).toFixed(2)+'%':'—';
    $('probability').innerHTML=state.revealed?`<strong>${tx('probability')}: ${(100*probability).toFixed(2)}%</strong>${state.count?`<br>${tx('error')}: ${((state.hits/state.count-probability)*100).toFixed(2)} ${tr('个百分点','percentage points')}`:''}`:tx('hiddenProbability');
    $('status').textContent=!state.count?tx('zero'):tr(`已完成 ${number(state.count)} / ${number(state.total)} 次独立测量。`,`${number(state.count)} / ${number(state.total)} independent measurements completed.`);
    $('display-note').textContent=tr(`统计包含全部 ${number(state.count)} 次测量。点云最多均匀选取 ${number(50000)} 个点显示。`,`Statistics include all ${number(state.count)} measurements. The cloud displays up to ${number(50000)} evenly selected points.`);
    $('color-legend').innerHTML=state.color==='phase'?`<i class="mo-dot"></i>${tx('positive')} &nbsp; <i class="mo-dot warm"></i>${tx('negative')}`:`<i class="mo-dot"></i>${tx('probDots')}`;
  }
  function translate() {
    mount.querySelectorAll('[data-mo-t]').forEach(el=>el.textContent=tx(el.dataset.moT));
    ['distance','state','total','speed','view','color','yaw','pitch'].forEach(id=>$(id).setAttribute('aria-label',tx(id==='state'?'orbital':id)));
    ['cloud','convergence','amplitude','density'].forEach(id=>$(id).setAttribute('aria-label',tx(id==='cloud'?'cloudTitle':id)));
    render();
  }
  function canvas(id) {
    const el=$(id),rect=el.getBoundingClientRect();if(rect.width<5||rect.height<5)return null;
    const scale=Math.min(2,global.devicePixelRatio||1);const width=Math.round(rect.width),height=Math.round(rect.height);
    if(el.width!==Math.round(width*scale)||el.height!==Math.round(height*scale)){el.width=Math.round(width*scale);el.height=Math.round(height*scale);}
    const ctx=el.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);return {ctx,width,height};
  }
  function drawCloud() {
    const chart=canvas('cloud');if(!chart)return;const{ctx,width:w,height:h}=chart;
    const extent=state.R/2+5.5,scale=Math.min(w,h)*.43/extent,cy=h*.5,cx=w*.5;
    const yaw=state.yaw*Math.PI/180,pitch=state.pitch*Math.PI/180,co=Math.cos(yaw),si=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    function project(x,y,z) { if(state.view==='xz')return{x:cx+x*scale,y:cy-z*scale,depth:y};if(state.view==='xy')return{x:cx+x*scale,y:cy-y*scale,depth:z};const xx=x*co+z*si,zz=-x*si+z*co;return{x:cx+xx*scale,y:cy-(zz*cp-y*sp)*scale,depth:zz*sp+y*cp}; }
    ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
    function slabFace(z){const e=extent*.83,vertices=[[-e,-e,z],[e,-e,z],[e,e,z],[-e,e,z]].map(p=>project(...p));ctx.beginPath();vertices.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle='#157d850b';ctx.fill();ctx.setLineDash([5,4]);ctx.strokeStyle='#157d8555';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);}
    slabFace(-state.R/4);slabFace(state.R/4);
    if(state.view==='xz'){const a=project(-extent,0,-state.R/4),b=project(extent,0,state.R/4);ctx.fillStyle='#157d850b';ctx.fillRect(a.x,b.y,b.x-a.x,a.y-b.y);ctx.setLineDash([5,4]);ctx.strokeStyle='#157d8566';[-state.R/4,state.R/4].forEach(z=>{const a=project(-extent,0,z),b=project(extent,0,z);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();});ctx.setLineDash([]);}
    const axisA=project(0,0,-extent*.82),axisB=project(0,0,extent*.82);ctx.strokeStyle='#8eaaa577';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(axisA.x,axisA.y);ctx.lineTo(axisB.x,axisB.y);ctx.stroke();
    const visible=Math.min(state.count,50000),pointSize=state.count>5000?1.05:state.count>1000?1.35:2;
    ctx.globalAlpha=state.count>5000?.32:state.count>1000?.5:.72;
    for(let i=0;i<visible;i++){const index=visible===state.count?i:Math.floor(i*state.count/visible);const point=pool[index];if(!point)continue;const p=project(point.x,point.y,point.z);ctx.fillStyle=state.color==='phase'&&point.phase<0?'#c47036':'#157d85';ctx.fillRect(p.x-pointSize/2,p.y-pointSize/2,pointSize,pointSize);}
    ctx.globalAlpha=1;
    [-1,1].forEach((side,index)=>{const p=project(0,0,side*state.R/2);ctx.beginPath();ctx.arc(p.x,p.y,5.5,0,Math.PI*2);ctx.fillStyle='#243d49';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();ctx.fillStyle='#243d49';ctx.font='600 12px Segoe UI, sans-serif';ctx.textAlign='left';ctx.fillText(state.view==='xy'?'A, B':index?'B':'A',p.x+10,p.y+(index?-9:16));});
    if(state.view!=='xy'){ctx.font='12px Segoe UI, sans-serif';ctx.fillStyle='#547370';ctx.textAlign='left';ctx.fillText('z',axisB.x+7,axisB.y-3);}
    ctx.restore();ctx.font='12px Segoe UI, sans-serif';ctx.fillStyle='#547370';ctx.textAlign='left';ctx.fillText('|z| < R/4',12,h-14);
    if(!state.count){ctx.font='14px Segoe UI, Microsoft YaHei, sans-serif';ctx.textAlign='center';ctx.fillStyle='#52676c';ctx.fillText(tx('zero'),w/2,25);}
  }
  function chartBase(id,xMin,xMax,yMin,yMax,logX=false) {
    const chart=canvas(id);if(!chart)return null;const{ctx,width:w,height:h}=chart,p={l:48,r:18,t:22,b:40};
    const x=value=>p.l+(logX?Math.log10(value/xMin)/Math.log10(xMax/xMin):(value-xMin)/(xMax-xMin))*(w-p.l-p.r),y=value=>h-p.b-(value-yMin)/(yMax-yMin)*(h-p.t-p.b);
    ctx.font='11px Segoe UI, sans-serif';ctx.lineWidth=1;ctx.strokeStyle='#dce5de';ctx.fillStyle='#5a6f72';
    for(let i=0;i<=4;i++){const value=yMin+(yMax-yMin)*i/4;ctx.beginPath();ctx.moveTo(p.l,y(value));ctx.lineTo(w-p.r,y(value));ctx.stroke();ctx.textAlign='right';const label=id==='convergence'?Math.round(value*100)+'%':Math.abs(value)>=1?value.toFixed(1):value.toFixed(2);ctx.fillText(label,p.l-7,y(value)+4);}
    const ticks=logX?Array.from({length:6},(_,i)=>10**i).filter(v=>v<=xMax):Array.from({length:5},(_,i)=>xMin+(xMax-xMin)*i/4);
    ticks.forEach((value,index)=>{ctx.textAlign=index===0?'left':index===ticks.length-1?'right':'center';ctx.fillText(logX?number(value):value.toFixed(1),x(value),h-p.b+18);});
    ctx.strokeStyle='#6e8582';ctx.beginPath();ctx.moveTo(p.l,p.t);ctx.lineTo(p.l,h-p.b);ctx.lineTo(w-p.r,h-p.b);ctx.stroke();
    return{...chart,x,y,p};
  }
  function line(chart,data,getX,getY,color,width=2,dash=[]) {const{ctx,x,y,p,width:w,height:h}=chart;ctx.save();ctx.beginPath();ctx.rect(p.l,p.t,w-p.l-p.r,h-p.t-p.b);ctx.clip();ctx.beginPath();data.forEach((d,i)=>i?ctx.lineTo(x(getX(d)),y(getY(d))):ctx.moveTo(x(getX(d)),y(getY(d))));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.restore();}
  function drawConvergence() {
    const chart=chartBase('convergence',1,state.total,0,1,true);if(!chart)return;
    const{ctx,x,y,width:w,height:h}=chart;
    ctx.fillStyle='#5a6f72';ctx.font='12px Segoe UI, Microsoft YaHei, sans-serif';ctx.textAlign='center';ctx.fillText(tx('nLabel'),w/2,h-3);
    if(state.revealed){line(chart,[1,state.total],n=>n,()=>probability,'#38515d',1.5,[6,4]);}
    if(!state.count){ctx.fillStyle='#5a6f72';ctx.fillText(tx('zero'),w/2,h/2);return;}
    const indices=new Set([1,state.count]);for(let i=1;i<=Math.min(120,state.count);i++)indices.add(i);for(let i=1;i<=650;i++)indices.add(Math.max(1,Math.round(Math.exp(i/650*Math.log(state.count)))));
    const data=Array.from(indices).filter(n=>n<=state.count).sort((a,b)=>a-b);line(chart,data,n=>n,n=>prefix[n]/n,'#157d85',2);
    ctx.beginPath();ctx.arc(x(state.count),y(state.hits/state.count),3.5,0,Math.PI*2);ctx.fillStyle='#157d85';ctx.fill();
  }
  function drawAxis() {
    if(!axis)axis=model.axisData(state.R,state.state,301);
    const xmin=axis[0].z,xmax=axis[axis.length-1].z,ampValues=axis.flatMap(d=>[d.a,d.b,d.psi]),amin=Math.min(0,...ampValues),amax=Math.max(...ampValues),apad=(amax-amin)*.12;
    const a=chartBase('amplitude',xmin,xmax,amin-apad,amax+apad);if(a){if(amin<0)line(a,[xmin,xmax],z=>z,()=>0,'#8f9d99',1,[3,3]);line(a,axis,d=>d.z,d=>d.a,'#5c79bd',1.8);line(a,axis,d=>d.z,d=>d.b,'#c48a43',1.8);line(a,axis,d=>d.z,d=>d.psi,'#157d85',2.6);}
    const dmax=Math.max(...axis.flatMap(d=>[d.density,d.incoherent]))*1.12,d=chartBase('density',xmin,xmax,0,dmax);if(d){line(d,axis,q=>q.z,q=>q.incoherent,'#38515d',1.8,[5,4]);line(d,axis,q=>q.z,q=>q.density,'#157d85',2.6);}
  }
  function render(all=true) {updateControls();drawCloud();drawConvergence();if(all)drawAxis();}
  function loadPreset(config={}) {
    if(!config||typeof config!=='object'||Array.isArray(config))throw new TypeError('Preset must be an object');
    const next={...state,...config,count:config.count??0,seed:config.seed??freshSeed(),revealed:config.revealed??false,playing:false};
    const validEnum=(key,values)=>{if(!values.includes(next[key]))throw new RangeError('Invalid '+key);};
    validEnum('state',['bonding','antibonding']);validEnum('color',['probability','phase']);validEnum('view',['3d','xz','xy']);
    const finite=(key,min,max,integer=false)=>{if(typeof next[key]!=='number'||!Number.isFinite(next[key])||next[key]<min||next[key]>max||(integer&&!Number.isInteger(next[key])))throw new RangeError('Invalid '+key);};
    finite('R',.6,8);finite('total',100,100000,true);if(![100,1000,10000,50000,100000].includes(next.total))throw new RangeError('Invalid total');finite('count',0,next.total,true);finite('seed',0,0xffffffff,true);finite('yaw',-180,180);finite('pitch',-80,80);finite('speed',500,20000);if(![500,2000,5000,10000,20000].includes(next.speed))throw new RangeError('Invalid speed');
    if(typeof next.revealed!=='boolean'||('playing'in config&&typeof config.playing!=='boolean'))throw new TypeError('Invalid boolean');
    pause(false);const runId=state.runId+1;Object.assign(state,{R:next.R,state:next.state,total:next.total,count:next.count,seed:next.seed,revealed:next.revealed,playing:false,color:next.color,view:next.view,yaw:next.yaw,pitch:next.pitch,speed:next.speed,runId});
    pool=[];poolKey='';prefix=new Uint32Array(1);refreshModel();if(state.count){ensurePool();state.hits=prefix[state.count];}else state.hits=0;render();notify();if(config.playing)play();return snapshot();
  }
  $('distance').addEventListener('input',()=>{const next=Number($('distance').value);if(next!==state.R){state.R=next;newRun();}});
  $('state').addEventListener('change',()=>{state.state=$('state').value;newRun();});
  $('total').addEventListener('change',()=>{const total=Number($('total').value);pause(false);state.total=total;state.count=Math.min(state.count,state.total);if(state.count){ensurePool();state.hits=prefix[state.count];}render(false);notify();});
  $('speed').addEventListener('change',()=>{state.speed=Number($('speed').value);notify();});
  $('view').addEventListener('change',()=>{state.view=$('view').value;render(false);notify();});$('color').addEventListener('change',()=>{state.color=$('color').value;render(false);notify();});
  ['yaw','pitch'].forEach(id=>$(id).addEventListener('input',()=>{state[id]=Number($(id).value);drawCloud();notify();}));
  $('one').addEventListener('click',()=>{pause(false);advance(state.count+1);});$('batch').addEventListener('click',()=>{pause(false);advance(state.count+100);});$('finish').addEventListener('click',()=>{pause(false);advance(state.total);});$('new').addEventListener('click',()=>newRun());$('reveal').addEventListener('click',()=>{state.revealed=true;render(false);notify();});$('play').addEventListener('click',()=>state.playing?pause():play());
  $('cloud').addEventListener('pointerdown',event=>{if(state.view!=='3d')return;drag={x:event.clientX,y:event.clientY,yaw:state.yaw,pitch:state.pitch};$('cloud').setPointerCapture(event.pointerId);});
  $('cloud').addEventListener('pointermove',event=>{if(!drag)return;state.yaw=((drag.yaw+(event.clientX-drag.x)*.5+540)%360)-180;state.pitch=Math.max(-80,Math.min(80,drag.pitch+(event.clientY-drag.y)*.4));$('yaw').value=state.yaw;$('pitch').value=state.pitch;drawCloud();notify();});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>$('cloud').addEventListener(type,()=>drag=null));
  document.addEventListener('electronlab:languagechange',translate);
  document.addEventListener('electronlab:workspacechange',event=>{if(event.detail?.workspace!=='molecule')pause();else render();});
  global.addEventListener('resize',()=>render());
  if(global.ResizeObserver)new ResizeObserver(()=>render()).observe(mount);
  global.MolecularLab=Object.freeze({snapshot,loadPreset,pause,redraw:()=>render()});
  refreshModel();translate();notify();
})(window);
