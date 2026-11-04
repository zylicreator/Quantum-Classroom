# Phase 1 verification / 第一阶段验证记录

Date / 日期：2026-11-03（Asia/Singapore）

Repository base: `af07263` · local branch: `codex/linux-python`.
The results below concern this local working-tree implementation, not a published
release or an executed GitHub Actions run.

## Completed / 已完成

- GUI-independent Python H₂⁺ minimal 1s LCAO model: overlap normalization,
  stable bonding/antibonding amplitudes, density, infinite-transverse central-slab
  probability, axial curves and analytic second moments.
- Unbounded NumPy PCG64 rejection sampling; identical seed/model/environment
  preserves prefixes regardless of chunk size. No finite cloud-box rejection.
- Native PySide6 desktop: R/state/seed controls, single and batch measurements,
  start/pause/reset, drag rotation, xz/xy projections, sign/uniform colors,
  frequency and density/amplitude curves, Chinese/English, full JSON export.
- All 100000 measurements enter statistics and export; only 50000 are selected
  for the cloud. Worker batches stay off the GUI thread; stale results cannot
  overwrite a changed experiment. Pause finishes at most one 512-sample batch.
- Python packaging, optional desktop dependencies, bilingual installation docs,
  dependency notices, and Ubuntu/Fedora container CI configuration.
- The built wheel was installed into a fresh environment without PySide6;
  all 26 core tests passed there, including Node-based cross-language parity.

## Actual environments / 实际测试环境

All three environments are x86_64 and used NumPy 2.5.4, PySide6-Essentials 6.12.0
and Shiboken6 6.12.0. Tests used pytest 9.2.0 and pytest-qt 4.5.0.

| Environment / 环境 | Python | Core + offscreen / 核心与离屏 | Real desktop / 真实桌面 |
| --- | --- | --- | --- |
| Ubuntu 26.04.1 LTS host, GNOME | 3.14.4 | 30 pytest tests passed; verification CLI passed | Wayland: 4 GUI tests and scripted screenshots/export passed |
| Ubuntu 24.04.5 LTS container (`ubuntu:24.04`) | 3.12.3 | 30 pytest tests, CLI and screenshot/export script passed | Not tested / 未测试 |
| Fedora Linux 44 container (`fedora:44`) | 3.14.8 | 30 pytest tests, CLI and screenshot/export script passed | Not tested / 未测试 |

“Real desktop” above means scripted native windows on the actual Wayland session,
not manual classroom usability acceptance. Container checks do not establish
Fedora desktop compatibility. The CI matrix additionally includes `ubuntu:26.04`
and a core-only Python 3.11 job; those jobs have not yet run on hosted CI.

## Numerical evidence / 数值证据

The standalone CLI completed 97 grouped checks, including 600000 fixed-seed
independent samples (100000 for each state at R=0.6,2,8). Independent direct
cylindrical quadrature covered R=0.6,1,1.4,2,3,4,6,8 and expanded bounds/order at
R=0.6,2,8. The largest absolute integral error on the host was approximately
**4.21×10⁻¹⁴**, below the predeclared 1e-10 tolerance.

At R=2 a₀, seed 891013, n=100000 per state:

| State / 状态 | Model slab probability / 模型概率 | Observed frequency / 实测频率 |
| --- | --- | --- |
| Bonding / 成键 | 0.259482296548287 | 0.25950 |
| Antibonding / 反键 | 0.037952267839344 | 0.03781 |

All six sampling cases reached beyond 6 a₀ from both nuclei; their maximum
nearest-nucleus distances ranged from 7.30 to 8.03 a₀. Frequencies, first/second
moments and acceptance passed fixed six-standard-error criteria (slab frequency
also allows 2/n). These are statistical checks, not guarantees of monotone error.

Pytest additionally checked deterministic JS/Python agreement at eight R values,
invalid inputs, exact chunk/seed reproducibility, node signs near z=0, JSON
round-trips of all 100000 coordinates, display capping, and core imports without
Qt. GUI checks covered event-loop responsiveness during a held worker, changing
R/state/seed during computation, pause/resume sequence preservation, rotation,
language preservation, the export button and closing during computation.

## Existing web baseline / 原网页版基线

- `npm test`: hydrogen, all 118 screened configurations and 1800457 molecular
  checks passed; the molecular suite sampled 600000 points.
- Existing independent SciPy atomic checks passed; the independent molecular
  cylindrical integration script passed 77 checks.
- `python assets/build.py --check` passed at baseline and after regenerating
  HTML to include the updated dependency notices.
- `assets/` application/model/style files were not changed. An exact comparison
  after removing the distribution-license comment confirmed that both generated
  HTML files retain identical application content.
- The optional Playwright browser interaction suite was not rerun in this phase.

## Artifacts and commands / 记录与复现

Use the repository virtual environment and the commands in
[English](LINUX_PYTHON.md) / [中文](LINUX_PYTHON.zh-CN.md).

- `artifacts/python-numerical.json`: numerical CLI report.
- `artifacts/python-tests.xml`: host core/offscreen test results.
- `artifacts/python-wayland/`: real-session screenshots, export and GUI test XML.
- `artifacts/python-offscreen-final/`: offscreen screenshots and export.
- `artifacts/linux-fedora-44/`, `artifacts/linux-ubuntu-24.04/`: container OS,
  exact installed package lists, numerical reports, test XML and screenshots.
- `dist/quantum_classroom-0.2.0a1-py3-none-any.whl` and matching source archive:
  local build artifacts, with project and third-party notices in wheel metadata.

During development, one early screenshot process exited abnormally after writing
its report. Explicit widget deletion before QApplication teardown was added;
subsequent offscreen and Wayland screenshot runs completed with exit code 0.

Artifacts, environments and exported measurement records are ignored by Git.
The desktop operates offline after dependencies are installed. Numerical and UI
results do not establish exact molecular physics or classroom learning outcomes.

## Remaining work / 未完成或仍待验证

- Python hydrogen/multi-electron migration; complete classroom activities and
  teacher presets; prediction/answer workflow, record import and session restore.
  No H₂/N₂/O₂ model was added, and no automatic free-text grading is implemented.
- Real Fedora/Ubuntu 24.04 desktops, X11, ARM, Python 3.11 local execution, manual
  classroom acceptance, and broader accessibility/performance testing.
- Hosted GitHub Actions execution and any standalone binary packaging/release.

本阶段已完成 H₂⁺ 计算核心、无界面验证与最小可用桌面实验。后续功能仍以上述范围为限；本地改动保留在开发分支，未推送、合并或发布。
