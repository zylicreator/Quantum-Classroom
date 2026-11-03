/* Static UI translations. Runtime content belongs to electron_app.js/classroom.js. */
(function (global) {
  'use strict';
  const strings = {
  "t000": [
    "电子云课堂实验室 · 原子与分子",
    "Electron Cloud Classroom · Atoms & Molecules"
  ],
  "t001": [
    "电子在哪里？让一次次测量告诉你",
    "Where is the electron? Let measurements reveal the pattern."
  ],
  "t002": [
    "不需要先学量子公式。先记录一个位置，再把许多次独立测量放在一起，看电子云怎样显现。",
    "Start with one position, then combine many independent measurements to see an electron cloud emerge. No quantum equations needed to get started."
  ],
  "t003": [
    "入门引导",
    "Guided introduction"
  ],
  "t004": [
    "自由探索 · 元素与轨道",
    "Free exploration · Elements & orbitals"
  ],
  "t005": [
    "选择一个入门形状（切换后从 0 次测量开始）",
    "Choose a starting shape (changing it resets measurements to 0)."
  ],
  "t006": [
    "球形云团",
    "Spherical cloud"
  ],
  "t007": [
    "上下两个云瓣",
    "Two vertical lobes"
  ],
  "t008": [
    "四个云瓣",
    "Four lobes"
  ],
  "t010": [
    "1 · 测一个位置",
    "1 · Measure one position"
  ],
  "t011": [
    "2 · 累积成电子云",
    "2 · Build an electron cloud"
  ],
  "t012": [
    "3 · 看比例怎样稳定",
    "3 · Watch the fraction settle"
  ],
  "t019": [
    "模型",
    "Model"
  ],
  "t020": [
    "多电子原子 · 屏蔽近似",
    "Multi-electron atom · Screening approximation"
  ],
  "t021": [
    "氢原子 · 教材 30 轨道",
    "Hydrogen · 30 textbook orbitals"
  ],
  "t022": [
    "中性元素 · 原子序数 Z",
    "Neutral element · Atomic number Z"
  ],
  "t023": [
    "显示内容",
    "Display"
  ],
  "t024": [
    "选定子层的单个空间轨道",
    "One spatial orbital in the selected subshell"
  ],
  "t025": [
    "全部已占据轨道 · 角方向平均",
    "All occupied orbitals · Angular average"
  ],
  "t026": [
    "采用有效核电荷类氢近似；适合比较轨道形状、屏蔽与测量统计，不提供精确的多电子波函数、能量或光谱。",
    "This hydrogen-like approximation uses an effective nuclear charge. It supports comparisons of orbital shapes, screening, and measurement statistics; it does not provide precise multi-electron wavefunctions, energies, or spectra."
  ],
  "t027": [
    "主量子数 n · 能级",
    "Principal quantum number n · Energy level"
  ],
  "t028": [
    "n = 1 · 1 个轨道",
    "n = 1 · 1 orbital"
  ],
  "t029": [
    "n = 2 · 4 个轨道",
    "n = 2 · 4 orbitals"
  ],
  "t030": [
    "n = 3 · 9 个轨道",
    "n = 3 · 9 orbitals"
  ],
  "t031": [
    "n = 4 · 16 个轨道",
    "n = 4 · 16 orbitals"
  ],
  "t032": [
    "轨道类型 · 角量子数 l",
    "Orbital type · Angular quantum number l"
  ],
  "t034": [
    "已占据子层",
    "Occupied subshell"
  ],
  "t035": [
    "空间方向 · 实轨道",
    "Spatial orientation · Real orbital"
  ],
  "t037": [
    "测量次数",
    "Measurements"
  ],
  "t038": [
    "100",
    "100"
  ],
  "t039": [
    "1,000",
    "1,000"
  ],
  "t040": [
    "10,000",
    "10,000"
  ],
  "t041": [
    "50,000",
    "50,000"
  ],
  "t042": [
    "100,000",
    "100,000"
  ],
  "t043": [
    "播放速度 · 次/秒",
    "Playback speed · Measurements/s"
  ],
  "t044": [
    "30",
    "30"
  ],
  "t045": [
    "300",
    "300"
  ],
  "t046": [
    "1,500",
    "1,500"
  ],
  "t047": [
    "6,000",
    "6,000"
  ],
  "t048": [
    "观察球大小 · 半径",
    "Observation sphere · Radius"
  ],
  "t051": [
    "测量一次",
    "Measure once"
  ],
  "t052": [
    "增加 100 次",
    "Add 100 measurements"
  ],
  "t056": [
    "观察视角",
    "View"
  ],
  "t057": [
    "三维旋转 · 可拖动点云",
    "3D rotation · Drag cloud"
  ],
  "t058": [
    "x–z 投影",
    "x–z projection"
  ],
  "t059": [
    "x–y 投影",
    "x–y projection"
  ],
  "t060": [
    "y–z 投影",
    "y–z projection"
  ],
  "t061": [
    "点的颜色",
    "Point colors"
  ],
  "t062": [
    "波函数正负 · 观察节点",
    "Wavefunction sign · Explore nodes"
  ],
  "t063": [
    "球内 / 球外 · 观察频率",
    "Inside / outside sphere · Explore frequency"
  ],
  "t064": [
    "轨道类型 · s/p/d/f",
    "Orbital type · s/p/d/f"
  ],
  "t065": [
    "坐标范围 · 比较收缩",
    "Coordinate range · Compare contraction"
  ],
  "t066": [
    "自动适配",
    "Auto-fit"
  ],
  "t067": [
    "固定 ±0.25 a₀",
    "Fixed ±0.25 a₀"
  ],
  "t068": [
    "固定 ±1 a₀",
    "Fixed ±1 a₀"
  ],
  "t069": [
    "固定 ±4 a₀",
    "Fixed ±4 a₀"
  ],
  "t070": [
    "固定 ±12 a₀",
    "Fixed ±12 a₀"
  ],
  "t071": [
    "水平旋转",
    "Horizontal rotation"
  ],
  "t073": [
    "俯仰角",
    "Tilt"
  ],
  "t075": [
    "把位置记录放在一起",
    "Bring the position records together"
  ],
  "t076": [
    "每个点是一次新测量，中心十字标出原子核。拖动云图，从不同方向观察。",
    "Each point is a new measurement; the central cross marks the nucleus. Drag the cloud to view it from different angles."
  ],
  "t082": [
    "落在观察球内的比例会稳定吗？",
    "Will the fraction inside the sphere settle?"
  ],
  "t083": [
    "球内次数 ÷ 全部测量次数 = 球内频率。球内按真实的三维距离判断；旋转图形不会改变统计。",
    "Inside count ÷ total measurements = observed frequency. The true 3D distance determines whether a point is inside; rotating the view does not change the statistics."
  ],
  "t084": [
    "累计频率",
    "Cumulative frequency"
  ],
  "t089": [
    "半径刻度",
    "Radius scale"
  ],
  "t090": [
    "线性 · 观察单轨道节点",
    "Linear · Single-orbital nodes"
  ],
  "t091": [
    "对数 · 展示内外电子层",
    "Logarithmic · Inner and outer shells"
  ],
  "t092": [
    "测量半径直方图",
    "Measured-radius histogram"
  ],
  "t094": [
    "查看全部已占据子层、电子数与屏蔽计算",
    "View all occupied subshells, electron counts, and screening calculations"
  ],
  "t095": [
    "子层",
    "Subshell"
  ],
  "t096": [
    "电子数",
    "Electrons"
  ],
  "t097": [
    "占据示意 ↑↓",
    "Illustrative occupancy ↑↓"
  ],
  "t098": [
    "Z_eff",
    "Z_eff"
  ],
  "t099": [
    "模型平均半径 / a₀",
    "Model mean radius / a₀"
  ],
  "t100": [
    "方框示意采用先单占、后配对的规则；简并轨道的方向不是唯一微观分配。全原子图按电子数加权、对子层方向平均，因此总密度为球对称。",
    "Boxes illustrate single occupancy before pairing; they do not specify a unique microscopic assignment to degenerate orbital directions. The whole-atom view weights subshells by electron count and averages their angular directions, giving a spherically symmetric total density."
  ],
  "t101": [
    "三个容易混淆的地方",
    "Three common questions"
  ],
  "t102": [
    "云里有这么多点，是不是有这么多电子？",
    "Do all these points represent that many electrons?"
  ],
  "t103": [
    "不是。上方三个入门形状都用只有一个电子的氢原子，每次重新制备到同一种状态，再测一次位置。许多个点对应许多次独立实验；两个或四个云瓣也不代表两个或四个电子。多电子原子的图同样记录许多次独立测量，点的总数不等于一个原子的电子数。",
    "No. All three introductory shapes use hydrogen, which has just one electron. Each measurement starts with a new preparation in the same state. Many points represent many independent experiments; two or four lobes do not mean two or four electrons. Multi-electron plots also collect many independent measurements, so the point count is not the number of electrons in one atom."
  ],
  "t104": [
    "“轨道”是不是电子绕核的路线？",
    "Is an orbital the electron's path around the nucleus?"
  ],
  "t105": [
    "这里的轨道用来描述电子的空间量子状态。电子云呈现不同位置的概率分布，画面没有记录一条连续运动路线。",
    "An orbital describes the electron's spatial quantum state. The cloud shows a probability distribution over positions; it does not trace a continuous path of motion."
  ],
  "t106": [
    "蓝色、橙色和虚线圆怎么理解？",
    "What do blue, orange, and the dashed circle mean?"
  ],
  "t107": [
    "入门的前两步统一用蓝色。第三步中，蓝点在三维观察球内，橙点在球外；虚线圆只是球在屏幕上的投影，所以圆内也可能看见橙点。自由探索中若选择“波函数正负”，两色则表示数学函数的正负号，与电子电荷无关。",
    "The first two guided steps use blue for all points. In step 3, blue points are inside the 3D observation sphere and orange points are outside. The dashed circle is only the sphere's projection on the screen, so orange points can appear within the circle. In free exploration, selecting “Wavefunction sign” instead uses the two colors for the mathematical function's positive and negative signs, unrelated to electric charge."
  ],
  "t108": [
    "坐标用原子尺度单位 a₀，1 a₀ 约为 0.053 纳米。想看元素、节点、量子数或中心极限定理，可切换“自由探索”。",
    "Coordinates use the atomic-scale unit a₀; 1 a₀ is approximately 0.053 nanometers. Switch to “Free exploration” for elements, nodes, quantum numbers, and the central limit theorem."
  ],
  "t109": [
    "中心极限定理：重复实验的误差",
    "Central limit theorem: Errors across repeated experiments"
  ],
  "t110": [
    "把“是否落在球内”记为 0 或 1。每组做 n 次独立测量，重复 1,200 组。左图看频率集中，右图把误差按标准差缩放后与正态曲线比较。",
    "Record whether each point is inside the sphere as 1 or 0. Run n independent measurements per group and repeat for 1,200 groups. The left plot shows how the frequencies cluster; the right compares errors scaled by their standard deviation with a normal curve."
  ],
  "t111": [
    "每组测量次数 n",
    "Measurements per group n"
  ],
  "t112": [
    "5",
    "5"
  ],
  "t113": [
    "20",
    "20"
  ],
  "t114": [
    "100",
    "100"
  ],
  "t115": [
    "1,000",
    "1,000"
  ],
  "t116": [
    "重新做 1,200 组",
    "Run 1,200 new groups"
  ],
  "t117": [
    "每组的球内频率",
    "Inside-sphere frequency per group"
  ],
  "t118": [
    "参考概率",
    "Reference probability"
  ],
  "t119": [
    "标准化误差",
    "Standardized error"
  ],
  "t120": [
    "重复实验",
    "Repeated experiments"
  ],
  "t121": [
    "标准正态密度",
    "Standard normal density"
  ],
  "t122": [
    "课堂里需要分清的模型与测量",
    "Distinguishing the model from the measurements"
  ],
  "t123": [
    "多电子模式中，Slater 屏蔽规则给出 Z_eff = Z − σ，再将氢样轨道按 1/Z_eff 缩放。它保留了节点与角形状，但没有求解电子相关、交换、轨道正交化或相对论效应。所得“模型概率”是这个近似分布的概率。",
    "In multi-electron mode, Slater's screening rules give Z_eff = Z − σ, and hydrogen-like orbitals are scaled in size by 1/Z_eff. This preserves their nodes and angular shapes, but does not calculate electron correlation, exchange, orbital orthogonalization, or relativistic effects. The “model probability” is the probability under this approximate distribution."
  ],
  "t124": [
    "全原子视图叠加的是密度而不是波函数：f(r) = Σ [N_nl/Z] f_nl(r)。每个点来自一次新的独立制备，随机抽取一个电子的位置；不是连续观察同一原子。未满子层按方向平均，不预设唯一的轨道取向。",
    "The whole-atom view adds densities, not wavefunctions: f(r) = Σ [N_nl/Z] f_nl(r). Each point comes from a new, independent preparation, with one electron's position sampled at random; this is not continuous observation of the same atom. Partially filled subshells are averaged over directions, without assuming a unique orbital orientation."
  ],
  "t125": [
    "量子力学先给出位置概率密度 |ψ|²；大数定律解释多次独立测量的频率为何逼近这个概率；中心极限定理近似描述大量重复实验的频率误差分布。这两项概率论结果不能单独推导出氢原子的波函数。",
    "Quantum mechanics supplies the position probability density |ψ|². The law of large numbers explains why frequencies from many independent measurements approach that probability; the central limit theorem approximates the distribution of frequency errors across repeated experiments with many measurements per group. Neither result alone derives the hydrogen wavefunction."
  ],
  "t126": [
    "每个点是一次独立的位置测量，画面中没有电子的运行轨迹。两种相位颜色表示波函数的正负，电子的电荷都相同；实际的位置概率由 |ψ|² 决定。颜色由模型计算，位置测量本身不测得波函数的相位。二维投影会叠加不同深度的点，旋转视角有助于分清各个瓣。",
    "Each point is an independent position measurement, not part of an electron trajectory. The two phase colors indicate the wavefunction's positive and negative signs; all electrons have the same charge, and position probabilities depend on |ψ|². Colors are calculated from the model; a position measurement itself does not measure the wavefunction's phase. A 2D projection overlaps points at different depths, so rotating the view helps distinguish the lobes."
  ],
  "t127": [
    "同一个 n、l 下，不同方向的轨道具有相同的径向分布和球内概率。径向节点有 n − l − 1 个，角节点有 l 个，总节点数为 n − 1。",
    "For the same n and l, orbitals with different orientations have the same radial distribution and inside-sphere probability. There are n − l − 1 radial nodes and l angular nodes, for a total of n − 1 nodes."
  ],
  "t128": [
    "节点是模型中概率密度为零的位置；有限点云里的普通空隙不一定是节点。若想核对节点，应结合方向和径向密度曲线。",
    "A node is a location where the model's probability density is zero; ordinary gaps in a finite point cloud need not be nodes. Check the angular shape together with the radial density curve to identify nodes."
  ],
  "t129": [
    "完整轨道目录：1 + 4 + 9 + 16 = 30",
    "Complete orbital catalog: 1 + 4 + 9 + 16 = 30"
  ],
  "t130": [
    "能级",
    "Energy level"
  ],
  "t131": [
    "完整轨道组",
    "Complete orbital set"
  ],
  "t132": [
    "这里的 30 个是空间轨道，不计自旋。p_x、p_y 以及 d、f 的实轨道由 m 和 −m 的复球谐函数组合得到；界面中的 |m| 标识所用组合，并不把实轨道误作单个磁量子数的本征态。氢原子还有 n ≥ 5 的更多轨道。",
    "These 30 are spatial orbitals, excluding spin. The real p_x, p_y, d, and f orbitals are formed from combinations of the complex spherical harmonics with m and −m. The interface uses |m| to identify these combinations, without treating a real orbital as an eigenstate of a single magnetic quantum number. Hydrogen also has further orbitals with n ≥ 5."
  ],
  "t133": [
    "查看理论公式与抽样方法",
    "View the formulas and sampling methods"
  ],
  "t134": [
    "取 s = r/a₀，a₀ ≈ 0.0529 nm。以下公式先描述非相对论氢原子定态，忽略自旋及核的运动；多电子模式再用有效核电荷缩放。",
    "Let s = r/a₀, where a₀ ≈ 0.0529 nm. The formulas below first describe nonrelativistic stationary states of hydrogen, neglecting spin and nuclear motion; multi-electron mode then applies effective-nuclear-charge scaling."
  ],
  "t135": [
    "取无量纲半径 s = r/a₀、ρ = 2s/n、k = n − l − 1。归一化径向函数为 R",
    "Use the dimensionless radius s = r/a₀, with ρ = 2s/n and k = n − l − 1. The normalized radial function is R"
  ],
  "t136": [
    "nl",
    "nl"
  ],
  "t137": [
    "(s) = (2/n²)√[k!/(n+l)!] e",
    "(s) = (2/n²)√[k!/(n+l)!] e"
  ],
  "t138": [
    "−ρ/2",
    "−ρ/2"
  ],
  "t139": [
    "ρ",
    "ρ"
  ],
  "t140": [
    "l",
    "l"
  ],
  "t141": [
    "L",
    "L"
  ],
  "t142": [
    "k",
    "k"
  ],
  "t143": [
    "2l+1",
    "2l+1"
  ],
  "t144": [
    "(ρ)。L 是广义拉盖尔多项式。",
    "(ρ), where L is a generalized Laguerre polynomial."
  ],
  "t145": [
    "ψ = a₀",
    "ψ = a₀"
  ],
  "t146": [
    "−3/2",
    "−3/2"
  ],
  "t147": [
    "R",
    "R"
  ],
  "t148": [
    "nl",
    "nl"
  ],
  "t149": [
    "(s)Y",
    "(s)Y"
  ],
  "t150": [
    "l",
    "l"
  ],
  "t151": [
    "实",
    "real"
  ],
  "t152": [
    "(θ,φ)，其中实球谐函数按球面积分归一化。径向密度 f(s) = s²R",
    "(θ,φ), with real spherical harmonics normalized by integration over solid angle. The radial density is f(s) = s²R"
  ],
  "t153": [
    "nl",
    "nl"
  ],
  "t154": [
    "(s)²，球内概率 p = ∫",
    "(s)². The inside-sphere probability p = ∫"
  ],
  "t155": [
    "0…R/a₀",
    "0…R/a₀"
  ],
  "t156": [
    "f(s) ds，用数值积分计算。",
    "f(s) ds is calculated by numerical integration."
  ],
  "t157": [
    "平均半径 E[r] = a₀[3n² − l(l+1)]/2。1s 的平均半径是 1.5 a₀，2s 是 6 a₀，2p 是 5 a₀。",
    "The mean radius is E[r] = a₀[3n² − l(l+1)]/2. It is 1.5 a₀ for 1s, 6 a₀ for 2s, and 5 a₀ for 2p."
  ],
  "t158": [
    "设每组球内频率为 p̂，则标准差 σ = √[p(1−p)/n]，标准化误差 Z = (p̂−p)/σ。右图的正态近似需 n 足够大，p 也不能过于接近 0 或 1。",
    "For the inside-sphere frequency p̂ in each group, the standard deviation is σ = √[p(1−p)/n], and the standardized error is Z = (p̂−p)/σ. The normal approximation in the right plot requires sufficiently large n, with p not too close to 0 or 1."
  ],
  "t159": [
    "径向密度已经计入球壳体积，与每单位体积的位置密度不同：1s 的位置密度在原点最大，径向密度却在 r = a₀ 最大。",
    "The radial density already includes spherical-shell volume and differs from the position density per unit volume: for 1s, the position density is greatest at the origin, while the radial density peaks at r = a₀."
  ],
  "t160": [
    "无径向节点的状态直接使用 Gamma 分布；其他状态按完整径向密度做拒绝抽样，并用指数包络保留无界尾部。方向从归一化实球谐函数的平方密度抽取。显示窗口外的样本仍参与所有统计。重复实验抽取相同球内概率的伯努利结果。",
    "States without radial nodes are sampled directly from a Gamma distribution. Other states use rejection sampling from the full radial density, with an exponential envelope preserving the unbounded tail. Directions are sampled from the squared, normalized real spherical harmonics. Samples outside the display window still contribute to all statistics. Repeated experiments sample Bernoulli outcomes with the same inside-sphere probability."
  ],
  "t161": [
    "多电子近似：f_Zeff(s) = Z_eff f_H(Z_eff s)，p(R) = p_H(Z_eff R)，节点与平均半径均除以 Z_eff。全原子密度是按电子数加权的非相干混合；不同轨道不能共用一个“波函数正负”着色。",
    "Multi-electron approximation: f_Zeff(s) = Z_eff f_H(Z_eff s), p(R) = p_H(Z_eff R); node positions and mean radii are divided by Z_eff. The whole-atom density is an incoherent mixture weighted by electron count. Different orbitals cannot share one “Wavefunction sign” coloring."
  ],
  "t162": [
    "H–U 的中性组态按照 NIST 参考表，包括常见填充例外。Z = 93–118 在本版本中仅按理想填充顺序生成，不标作实测基态组态。重元素的形状缩放也是粗略教学近似。",
    "Neutral configurations for H–U (Z = 1–92) follow the NIST reference table, including common filling exceptions. In this version, Z = 93–118 use only ideal filling order and are not presented as measured ground-state configurations. Shape scaling for heavy elements is also a rough teaching approximation."
  ],
  "t163": [
    "屏蔽规则参考：",
    "Screening reference:"
  ],
  "t164": [
    "Slater，Atomic Shielding Constants（1930）",
    "Slater, Atomic Shielding Constants (1930)"
  ],
  "t165": [
    "；组态参考：",
    ". Configuration reference:"
  ],
  "t166": [
    "NIST：H–U 中性原子参考组态",
    "NIST: Neutral-atom reference configurations, H–U"
  ],
  "t167": [
    "。轨道名称中的多项式用于标识角形状，完整波函数还包含径向部分。",
    ". Polynomials in orbital names identify angular shapes; the complete wavefunction also includes a radial part."
  ],
  "t168": [
    "模型参考：",
    "Model references:"
  ],
  "t169": [
    "NIST DLMF：氢原子径向波函数",
    "NIST DLMF: Hydrogen radial wavefunctions"
  ],
  "t170": [
    "；",
    ";"
  ],
  "t171": [
    "NIST DLMF：球谐函数",
    "NIST DLMF: Spherical harmonics"
  ],
  "t172": [
    "；",
    ";"
  ],
  "t173": [
    "Feynman Lectures III，第 19 章",
    "The Feynman Lectures on Physics, Vol. III, Chapter 19"
  ],
  "t174": [
    "。",
    "."
  ],
  "a012_aria-label": [
    "学习方式",
    "Learning mode"
  ],
  "a017_aria-label": [
    "氢原子的入门形状",
    "Introductory hydrogen shapes"
  ],
  "a022_aria-label": [
    "实验步骤",
    "Experiment steps"
  ],
  "a142_aria-label": [
    "随独立测量次数增加，球内位置的累计频率趋近当前模型的概率",
    "As independent measurements accumulate, the cumulative frequency inside the sphere approaches the probability predicted by the current model."
  ],
  "a157_aria-label": [
    "独立测量的半径直方图与当前模型的径向概率密度",
    "Histogram of independently measured radii and the current model's radial probability density"
  ],
  "a205_aria-label": [
    "1200 组独立实验的球内频率直方图，竖线表示参考概率",
    "Inside-sphere frequency histogram for 1,200 independent groups; the vertical line marks the reference probability"
  ],
  "a213_aria-label": [
    "标准化误差直方图，与均值 0、方差 1 的正态密度比较",
    "Standardized-error histogram compared with a normal density of mean 0 and variance 1"
  ],

  "workspace-label": ["实验室", "Laboratories"],
  "workspace-atom": ["原子轨道", "Atomic orbitals"],
  "workspace-molecule": ["分子轨道 · H₂⁺", "Molecular orbitals · H₂⁺"],
  "workspace-export": ["导出全部学习记录", "Export all learning records"],
  "workspace-note": ["从一个原子核到两个原子核，探索概率分布怎样改变。切换实验室会暂停播放，保留两边的测量和答案。", "From one nucleus to two: explore how the probability distribution changes. Switching laboratories pauses playback and preserves both experiments and their answers."],
  "workspace-molecular-region": ["分子轨道实验室", "Molecular orbital laboratory"],
  "utility-product": [
    "电子云课堂实验室 · 原子与分子",
    "Electron Cloud Classroom · Atoms & Molecules"
  ],
  "utility-language": [
    "界面语言",
    "Interface language"
  ],
  "utility-zh-title": [
    "切换到中文",
    "Switch to Chinese"
  ],
  "utility-en-title": [
    "切换到英文",
    "Switch to English"
  ],
  "utility-zh-aria": [
    "使用中文界面",
    "Use the Chinese interface"
  ],
  "utility-en-aria": [
    "使用英文界面",
    "Use the English interface"
  ]
};
  const storageKey = 'electronlab.language';
  let language = 'zh';
  try { if (global.localStorage.getItem(storageKey) === 'en') language = 'en'; } catch (_) {}

  // Bind only marked initial text nodes. Do not walk live SVG/canvas, replace
  // innerHTML, read form values, or collect text produced by a later render.
  // A disconnected or externally edited node is released to its runtime owner.
  const textBindings = [];
  document.querySelectorAll('[data-i18n-text]').forEach(function (element) {
    if (element.closest('svg, canvas, textarea, [data-i18n-dynamic]')) return;
    const keys = element.getAttribute('data-i18n-text').split(',');
    const nodes = Array.from(element.childNodes).filter(function (node) {
      return node.nodeType === 3 && node.nodeValue.trim();
    });
    keys.forEach(function (key, index) {
      if (strings[key] && nodes[index]) textBindings.push({ element: element, node: nodes[index], key: key, current: nodes[index].nodeValue, active: true });
    });
  });
  const attributeBindings = [];
  ['aria-label', 'aria-description', 'title', 'placeholder', 'alt'].forEach(function (attribute) {
    document.querySelectorAll('[data-i18n-' + attribute + ']').forEach(function (element) {
      if (element.closest('[data-i18n-dynamic]')) return;
      const key = element.getAttribute('data-i18n-' + attribute);
      if (strings[key]) attributeBindings.push({ element: element, attribute: attribute, key: key, current: element.getAttribute(attribute), active: true });
    });
  });
  function pick(zh, en) { return language === 'en' ? en : zh; }
  function locale() { return language === 'en' ? 'en-US' : 'zh-CN'; }
  function translateStatic() {
    document.documentElement.lang = locale();
    const index = language === 'en' ? 1 : 0;
    textBindings.forEach(function (binding) {
      if (!binding.active) return;
      if (binding.node.parentNode !== binding.element || binding.node.nodeValue !== binding.current) {
        binding.active = false; return;
      }
      const prefix = (binding.current.match(/^\s*/) || [''])[0];
      const suffix = (binding.current.match(/\s*$/) || [''])[0];
      binding.current = prefix + strings[binding.key][index] + suffix;
      binding.node.nodeValue = binding.current;
    });
    attributeBindings.forEach(function (binding) {
      if (!binding.active) return;
      if (!binding.element.isConnected || binding.element.getAttribute(binding.attribute) !== binding.current) {
        binding.active = false; return;
      }
      binding.current = strings[binding.key][index];
      binding.element.setAttribute(binding.attribute, binding.current);
    });
    ['zh', 'en'].forEach(function (code) {
      const button = document.getElementById('ec-lang-' + code);
      if (button) button.setAttribute('aria-pressed', String(language === code));
    });
  }
  function setLanguage(nextLanguage) {
    if (nextLanguage !== 'zh' && nextLanguage !== 'en') return;
    language = nextLanguage;
    try { global.localStorage.setItem(storageKey, language); } catch (_) {}
    translateStatic();
    document.dispatchEvent(new CustomEvent('electronlab:languagechange', { detail: { language: language } }));
  }
  const api = { pick: pick, locale: locale, setLanguage: setLanguage, translateStatic: translateStatic };
  Object.defineProperty(api, 'lang', { enumerable: true, get: function () { return language; } });
  global.ElectronI18n = Object.freeze(api);
  ['zh', 'en'].forEach(function (code) {
    const button = document.getElementById('ec-lang-' + code);
    if (button) button.addEventListener('click', function () { setLanguage(code); });
  });
  translateStatic();
})(window);
