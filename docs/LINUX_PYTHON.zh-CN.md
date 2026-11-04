# Linux 上的 Python 原子与 H₂⁺ 实验室

[English](LINUX_PYTHON.md) · [验证记录](PHASE3_VALIDATION.md) · [模型说明](MODELS.md)

第三阶段已加入 5 个双语课堂任务、7 个教师预设、成组重复实验和完整课堂记录保存／恢复。氢原子 30 个空间轨道、118 个元素屏蔽近似及 H₂⁺ 实验均保留。原有离线网页版保持可用。

## 环境与安装

先检查 `cat /etc/os-release`、`uname -m`、`python3 --version` 和 `echo "$XDG_SESSION_TYPE"`。核心要求 Python 3.11+、NumPy 2.3–2.x；桌面额外要求可安装的 PySide6-Essentials 6.10–6.x wheel。Essentials 包含本界面所用的 PySide6 QtCore、QtGui、QtWidgets 模块，匹配的 Shiboken 由 pip 自动安装。依赖是否可安装仍取决于发行版、Python 和 CPU 架构。本次实际验证均为 x86_64，ARM 和其他发行版版本尚未验证。

Ubuntu 24.04 / 26.04 的系统依赖（在正常系统终端执行）：

```sh
sudo apt update
sudo apt install python3 python3-venv python3-pip libgl1 libegl1 \
  libglib2.0-0t64 libdbus-1-3 libfontconfig1 libwayland-client0 libxkbcommon0 \
  libxcb-cursor0 libxkbcommon-x11-0 libxcb-icccm4 libxcb-image0 \
  libxcb-keysyms1 libxcb-render-util0 fonts-noto-cjk
```

Fedora 44 的系统依赖：

```sh
sudo dnf install python3 python3-pip mesa-libGL mesa-libEGL glib2 dbus-libs \
  fontconfig freetype wayland-libs libxkbcommon libxkbcommon-x11 libX11-xcb \
  xcb-util-cursor xcb-util-wm xcb-util-image xcb-util-keysyms xcb-util-renderutil \
  google-noto-sans-cjk-fonts
```

在仓库根目录建立项目虚拟环境并安装：

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[desktop,test,gui-test,science-test]'
.venv/bin/quantum-classroom
```

如需使用本次 Python 3.12/3.14 验证的依赖版本，在 pip 命令中加上 `-c constraints-linux-tested.txt`。该文件是版本约束，不是完整依赖锁；不用于 Python 3.11。Qt wheel 自带 Qt 库，平台依赖和字体仍由系统提供。参考 [PySide 官方安装说明](https://doc.qt.io/qtforpython-6/gettingstarted.html)和 [Qt Linux 平台依赖](https://doc.qt.io/qt-6/linux-requirements.html)。

真实 Wayland 桌面需要明确选择平台时，可运行 `QT_QPA_PLATFORM=wayland .venv/bin/quantum-classroom`。X11/XWayland 使用 `xcb` 且需要有效的 `DISPLAY`；本次尚未完成 X11 真实会话验证。`offscreen` 只检验离屏控件，不能代替真实桌面测试。

## 课堂任务、教师预设与记录恢复

顶部“课堂任务”标签下有“学习任务”“教师预设”“成组重复实验”三个页面。

1. 选择任务并填写实验前预测，点击“记录预测并开始实验”。场景从 0 次测量开始；本次预测锁定，直到清空或新建实验。
2. 在对应实验室完成观察。原子任务分别要求 100、1000、1000 次，两项 H₂⁺ 任务要求 1000 次；频率任务还要求点击“揭晓模型概率”。门槛是课堂要求，不是收敛定理的特殊次数。
3. 点击“返回课堂任务”，选择结论并自由解释，再核对选择。程序仅核对选择题与模型解释是否一致，不给自由解释评分；每题保留最近 30 次核对。
4. 教师预设提供目标、建议时长与教学提示。载入会清空对应实验的测量，不清空另一实验，不替学生提交预测；已写草稿与历史核对保留。“投影大字”可放大课堂文字。
5. “成组重复实验”按当前原子观察球的概率，用二项分布独立生成各组命中数。它不增加原实验的位置点。可比较频率与标准化误差直方图；p=0/1 不标准化，较小的 n·p 或 n·(1−p) 会提示正态近似可能较差。

“保存课堂记录”写入一个本地 JSON，包含两个实验的全部坐标、种子、参数、当前任务、预测、结论、自由解释、核对历史、语言、视角、概率揭晓状态、投影大字及成组结果。保存前暂停测量并完成正在运行的一批；写入失败不覆盖旧文件。

“恢复记录”先在后台校验整个文件及种子采样前缀，再替换当前会话，恢复后保持暂停。继续测量接着原序列，不重复已有样本。第一、二阶段单独导出的 Python 测量 JSON 也可导入，只替换对应实验，不影响另一实验。已有网页版记录缺少相同的 Python 采样序列，暂不转换导入。

记录上限为 64 MiB；不支持损坏文件、未知版本、超出界面范围的模型参数或种子。Python 核心可接受的字符串种子与非课堂氢轨道不在桌面恢复范围内。若当前 NumPy／计算实现不能精确重放保存的坐标，会明确拒绝恢复，当前实验保留；可用原记录的依赖版本恢复。该格式用于本地教学交流，不是防篡改成绩认证。没有自动保存或上传，关闭前请主动保存。

详细结构、限制和无界面用法见[课堂记录格式](CLASSROOM_RECORDS.md)。

## 原子实验室

计算模型可选“氢原子”“多电子·单个占据轨道”“多电子·整个原子混合”。氢原子提供 1s–4f 共 30 个空间轨道，不计自旋。多电子模式提供 118 个元素；单轨道仅可选择实际占据子壳层中的实角向基函数，并显示 Slater 有效核电荷。H–U 保留参考组态标记，Z=93–118 明确标为“理想填充示意，非实测基态”。

整个原子视图是按电子数加权、角向平均的非相干混合，没有统一波函数，禁用符号着色。每点表示从重新制备的原子中随机选取一个电子的位置测量。该近似不包含自洽场、电子关联或相对论修正。

改变观察球半径只对全部已有测量重新统计，不重新抽样；正在计算的批次也按新的观察球统计。橙色圆圈只是观察球的投影，投影落在圆内的点不一定处于三维球内。径向曲线 P(r) 已包含球壳体积因子，不能和点密度混同。改变模型、元素、轨道或种子会重置原子实验。

两个标签页各自保留实验。切换时暂停原实验室，最多完成正在计算的一批；切换语言不重置任一实验室。

```python
from quantum_classroom.core import AtomicModel, AtomicSampler, AtomicExperiment

model = AtomicModel(mode="orbital", z=26, state="3dxz")  # 铁，Z_eff=6.25
experiment = AtomicExperiment(model, seed=42)
experiment.append(AtomicSampler(model, seed=42).take(10000))
experiment.set_radius(0.8)  # 只重新计数
experiment.export("atomic-classroom-record.json", language="zh")
# AtomicModel(mode="whole", z=29) 表示铜原子的球对称整体混合。
```

## H₂⁺ 实验操作

1. 选择成键 σ／反键 σ*、0.6–8 a₀ 的核间距、随机种子和目标测量次数。
2. “测一次”“再测 1000 次”或开始持续测量。暂停时最多完成正在计算的一批 512 次；继续后保留原抽样序列。
3. 拖动三维图旋转，或选择 xz／xy 投影。配色、振幅／密度曲线和语言切换均保留测量。
4. 导出 JSON 保存全部坐标、模型参数、随机种子／算法／NumPy 版本与统计量。数据只保存在本地。顶部“保存课堂记录”保存两个实验与任务答案；“恢复记录”可以恢复并继续测量。原实验室的单独测量 JSON 也可导入。关闭窗口前仍需主动保存。

改变核间距、轨道或种子会开始新实验。后台结果带实验代号，旧任务不能覆盖新实验。最多 100000 次测量全部计入统计和导出；点云最多选取 50000 点，显示窗口外的点也仍参与统计。

每个点来自独立制备后的测量，不是运动轨迹。符号颜色不是电荷，也不是位置测量直接测出的相位。中央薄片 |z|<R/4 横向无限，不能与零厚度节点混同。轴向曲线取 x=y=0，不是边缘概率密度。大数定律和中心极限定理不推导波函数；该固定核最小模型不预测精确键能、平衡键长或反应动力学。详见 [MODELS.md](MODELS.md)。

## 原子的独立无界面验证

实际计算核心仅依赖 NumPy；独立校验额外使用 SciPy，即 `science-test` 可选依赖：

```sh
.venv/bin/python -m pip install -e '.[test,science-test]'
.venv/bin/quantum-classroom-verify-atoms
.venv/bin/python -m pytest tests/python/test_atoms.py -q
```

检查 78 个内部轨道（氢原子界面仅展示其中 30 个，高主量子数用于屏蔽模型）、22 种径向分布、16 个实角向基函数、118 个元素及 1379 个占据子壳层。固定种子的 6187500 个样本采用预先设定的 6.5 倍标准误差判据；区域/通道频率额外允许 1/N，稀疏尾部额外允许 2/N。理论概率很小的尾部不必在每次有限抽样中出现。

SciPy 的 Laguerre、Legendre 和积分参考与运行时的 NumPy 实现相互独立。NIST H–U 占据数已保存为带来源的离线夹具，测试不联网。Node 用于跨语言对照，缺失 Node 或原 JS 文件时会明确跳过该项。核心计算不依赖 Qt、SciPy 或 Node。

`HydrogenOrbital(state, charge)` 提供振幅、径向密度、球内概率和节点；`AtomicModel` 提供屏蔽、混合和观察球；`AtomicSampler` 支持保持前缀的分批抽样。整体混合导出包含模型边界、参考/示意组态标记、各子壳层电子数、屏蔽和有效核电荷。桌面版现可恢复这些测量记录；完整课堂记录还保存答案和视图。

## H₂⁺ 无界面计算与验证

若只需核心，可在独立虚拟环境中安装 `'.[test]'`，不安装桌面依赖：

```sh
.venv/bin/python -m pip install -e '.[test]'
.venv/bin/quantum-classroom-verify
.venv/bin/python -m pytest tests/python/test_core.py -q
```

验证程序输出 JSON，失败时返回非零退出码；`--output path.json` 可同时保存报告，父目录需存在。独立 CLI 不需要 Node、SciPy、Qt 或显示服务。pytest 的 JavaScript 对照检查需要 Node；缺失时会明确显示该项跳过。

```python
from quantum_classroom.core import H2Plus, Sampler, Experiment

model = H2Plus(R=2.0, state="antibonding")
stream = Sampler(model, seed=42)
record = Experiment(model, seed=42)
record.append(stream.take(1000))
record.append(stream.take(9000))
print(model.overlap, model.region_probability, record.frequency)
record.export("h2plus-classroom-record.json", language="zh")
```

坐标格式为 (..., 3)。核心抽样流不受显示点数限制。整数种子非负；字符串种子按 UTF-8 和 SHA-256 转换。NumPy PCG64 使用固定提议批次并保留已接受样本缓存，因此相同模型、种子和环境下，任意分批的 `take` 都保留完全一致的样本前缀。JavaScript 使用另一种随机数生成器，只比较确定性计算和统计性质，不要求逐点相同。

## 分层验证

```sh
# 离屏控件测试（同时包含核心及可用的跨语言对照）
QT_QPA_PLATFORM=offscreen .venv/bin/python -m pytest tests/python -q
QT_QPA_PLATFORM=offscreen .venv/bin/python scripts/check_desktop.py
QT_QPA_PLATFORM=offscreen .venv/bin/python scripts/check_atomic_desktop.py
QT_QPA_PLATFORM=offscreen .venv/bin/python scripts/check_classroom_desktop.py

# 真实本地图形会话，会打开实验窗口
.venv/bin/python scripts/check_classroom_desktop.py --require-display --output artifacts/phase3-wayland

# 需要可用的 Docker；源代码以只读方式挂载
bash scripts/test_linux_container.sh fedora:44
bash scripts/test_linux_container.sh ubuntu:24.04
bash scripts/test_linux_container.sh ubuntu:26.04
```

独立柱坐标积分覆盖 8 个核间距的归一化、重叠和薄片积分；在 3 个间距上将每段阶数从 96 提高到 144、积分边界从 32 扩展到 40 a₀ 检查误差。这些有限积分边界不限制抽样。固定种子的 600000 个样本检查频率、矩、对称性、接受率和远离两核 6 a₀ 之外的尾部。统计容差预先设为六倍标准误差（薄片频率额外加 2/n），不反复抽样碰通过，不要求误差单调下降；积分绝对容差为 1e-10。

新增 CI 验证三个发行版镜像，并配置 Python 3.11/3.14 的纯核心安装和构建。配置文件已加入不代表 GitHub 托管任务已经运行，实际完成范围另列于验证记录。
