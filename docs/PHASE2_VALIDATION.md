# Phase 2 verification / 第二阶段验证记录

Date / 日期：2026-11-03（Asia/Singapore）

Local branch: `codex/linux-python`. Package version: `0.3.0a1`.
This extends the existing uncommitted phase 1 implementation; no remote push,
merge or release was performed. [Phase 1 results](PHASE1_VALIDATION.md) are historical.

## Delivered / 已完成

- Hydrogen 1s–4f: all 30 classroom spatial orbitals, real wavefunction signs,
  radial/angular nodes, normalized density, sphere probability and radial curves.
- Screened neutral atoms Z=1–118: original Slater rules, occupied-orbital selection,
  effective charge, electron-count-weighted spherical whole-atom mixtures.
- H–U occupancies independently checked against the bundled NIST reference facts.
  Z=93–118 explicitly remain ideal-filling illustrations, not observed ground states.
- Whole-atom density has no common amplitude/phase; sign colors are disabled.
- Exact radial rejection envelope with a proposal tail to infinity, independent
  angular sampling, reproducible arbitrary chunks, all-measurement statistics.
- Native atomic workspace, bilingual controls, sphere recount without resampling,
  rotation/projections, frequency/radial plots, all-coordinate JSON export.
- Atomic and H₂⁺ tabs pause on switching and preserve both experiments and language.
  A shared bounded worker controller rejects stale results after model changes.
- The existing H₂⁺ numerical implementation and original regression tests remain
  unchanged. Shared record/controller code was refactored and regression-tested.

## Validation scope / 验证范围

All environments are x86_64; NumPy 2.5.4, PySide6-Essentials/Shiboken6 6.12.0,
SciPy 1.18.1, pytest 9.2.0 and pytest-qt 4.5.0 were used.

| Environment / 环境 | Python | Core + offscreen / 核心与离屏 | Real desktop / 真实桌面 |
| --- | --- | --- | --- |
| Ubuntu 26.04.1 LTS host | 3.14.4 | 57 tests passed, no skips; both independent CLIs passed | GNOME/Wayland: 8 GUI tests and both-workspace screenshot/export checks passed |
| Ubuntu 24.04.5 LTS container | 3.12.3 | 57 tests, both CLIs and both screenshot scripts passed | Not tested / 未测试 |
| Fedora Linux 44 container | 3.14.8 | 57 tests, both CLIs and both screenshot scripts passed | Not tested / 未测试 |

The 57 tests comprise the original 30 H₂⁺/record/GUI regressions and 27 new atomic
tests. Real-session checks are scripted native-widget interactions, not manual
classroom acceptance. Container results do not establish a real Fedora desktop.
Hosted GitHub Actions has been updated but has not been run from this local branch.

The built 0.3.0a1 wheel was installed with `--no-deps` in a separate NumPy-only
environment: Qt and SciPy were both absent, imports succeeded, and the core suite
passed 48 tests. Its one SciPy-dependent reference test was explicitly skipped;
that test passed in all three fully provisioned environments above. Both wheel
and source distribution were built and their required contents checked.

## Scientific evidence / 数值证据

The atomic CLI completed **6244 grouped checks**, covering:

- 78 internal spatial orbitals (30 classroom hydrogen states), 22 radial
  distributions and 16 orthonormal real angular functions.
- Independent SciPy Laguerre/associated-Legendre reference values, radial
  normalization and moments integrated over [0, infinity), radial nodes and
  sphere probabilities. Largest tested sphere-integral error on the host:
  **3.1086244689504383e-15**, below the predeclared 2e-11 tolerance.
- **6187500 independent samples**: 20000 per internal orbital, 2500 per each of
  the **1379 occupied subshells**, and 10000 per each of **118 whole atoms**.
- Radial/angular moments, sphere frequencies, spherical mixture symmetry,
  electron weights and drawing-window tails. Tolerances were fixed at 6.5
  standard errors; region/channel frequencies add 1/N, sparse tails add 2/N.
- Tail tests do not demand a nonzero count where the expected count is much less
  than one. A separate forced-valid-tail-proposal test exercises every radial-node
  distribution beyond its envelope transition; 1s samples also reach beyond 6 a₀.

Additional tests compare the original JavaScript's deterministic values for all
78 orbitals and all 118 configurations/whole-atom densities, match every H–U
occupancy against the independent NIST fixture, verify chunk/seed prefixes,
invalid inputs, 100000-coordinate export round-trips and 50000-point display limits.
Changing sphere radius recounts every stored measurement and preserves positions.

The H₂⁺ CLI still passes its 97 grouped checks and 600000-sample verification.
The original JavaScript model suite passes. Both offline HTML entry points pass
the reproducible-build check; application code/styles under `assets/` are
unchanged. Generated HTML changes only update the embedded dependency notices.
The optional Playwright web interaction suite was not rerun in this phase.

## Desktop evidence / 界面证据

Tests exercised measuring, pause/continue, parameter changes during a held worker,
discarding old results, tab switching, preserving both workspaces, global language
switching, sphere recounts, occupied-orbital filtering, ideal-filling warnings,
disabled whole-atom sign colors, rotation/projections and JSON export buttons.

Native screenshot scenarios: hydrogen 3d_z² with 100000 measurements; Fe 3d_xz
with Z_eff=6.25; spherical Cu; English Og with its non-observed-ground-state
warning; return to the preserved antibonding H₂⁺ experiment.

## Reproduction and artifacts / 复现与记录

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[desktop,test,gui-test,science-test]'
.venv/bin/quantum-classroom
.venv/bin/quantum-classroom-verify-atoms
.venv/bin/quantum-classroom-verify
QT_QPA_PLATFORM=offscreen .venv/bin/python -m pytest tests/python -q
```

See [English installation/API guide](LINUX_PYTHON.md) or
[中文安装与操作说明](LINUX_PYTHON.zh-CN.md) for OS packages, optional tested-version
constraints and API examples. Python 3.11 has a configured CI job but was not
locally exercised. Runtime core imports require neither Qt nor SciPy.

- `artifacts/phase2-atoms.json`, `artifacts/phase2-h2plus.json`: independent reports.
- `artifacts/phase2-tests.xml`: full host tests.
- `artifacts/phase2-wayland/tests.xml`: real-session GUI tests.
- `artifacts/phase2-wayland-final/`: final real-window screenshots and records.
- `artifacts/phase2-linux-fedora-44/`, `artifacts/phase2-linux-ubuntu-24.04/`:
  OS/version manifests, numerical reports, test XML, offscreen screenshots/records.
- `scripts/test_linux_container.sh`: read-only source mount, isolated container
  dependencies, user-owned reports on exit; no system package installation on host.

## Remaining work / 后续与未验证范围

Full classroom activities, teacher presets, prediction/answer workflow, grouped
CLT classroom interface, import/session restoration and teaching records are later
work. The current atomic/measurement JSON export is already functional.
No H₂/N₂/O₂ physical model was added.

Real Fedora/Ubuntu 24.04 desktops, X11, ARM, local Python 3.11, manual classroom
usability and broader accessibility/performance validation remain untested.
No standalone binary bundle or public release was produced.

本阶段完成了原子模型迁移与桌面接入，并保留 H₂⁺。统计测试验证实现的一致性，不代表多电子近似已成为精确电子结构模型，也不代表已经验证课堂教学效果。
