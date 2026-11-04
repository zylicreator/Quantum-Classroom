# Phase 3 verification / 第三阶段验证记录

Date: 2026-11-03 (Asia/Singapore). Branch: `codex/linux-python`.
Version: `0.4.0a1`. Work remains local and uncommitted; no remote push or release.
The earlier [phase 1](PHASE1_VALIDATION.md) and [phase 2](PHASE2_VALIDATION.md)
reports describe their historical scopes.

## Delivered / 已完成

- All five original bilingual tasks: three atomic and two molecular activities.
  Predictions lock before observing; scenario/run identity, observation minima,
  sign colors and the convergence task's probability reveal gate are enforced.
- All seven original teacher scenarios, objectives and notes. Loading starts
  zero measurements, preserves the other workspace and answer history, and does
  not submit a student prediction. Each task retains drafts and the latest 30
  checks with observation context. Written explanations are never graded.
- Independent binomial repeated-group experiments, frequency/standardized-error
  histograms, normal approximation and low-count/zero-variance interpretation.
- Native task/teacher/group pages, large-text projection, full Chinese/English
  switching, and the requested `English Version` button label.
- Complete local JSON save/restore for both experiments, all coordinates,
  answers, history, language, views, active pages, probability reveal state,
  large text and grouped results. Restored sessions remain paused and can continue
  the seeded sample stream without duplicate or omitted samples.
- Legacy phase 1/2 individual Python measurement records import into their own
  workspace. Unknown formats, invalid data and incompatible replay are rejected
  before replacing live state. File writes use a temporary file and atomic replace.
- NumPy-only activity, group and restoration APIs, packaged bilingual content,
  GUI tests, desktop checking script, CI coverage and updated bilingual guides.
  No new third-party dependencies were added; existing licenses are retained.

## Actual checks / 实测

All tested environments are x86_64. Host: Ubuntu 26.04.1, Python 3.14.4,
NumPy 2.5.4, SciPy 1.18.1, PySide6-Essentials/Shiboken6 6.12.0,
pytest 9.2.0, pytest-qt 4.5.0.

| Environment | Core + offscreen tests | Native desktop |
| --- | --- | --- |
| Ubuntu 26.04.1 / Python 3.14.4 | 125 passed, no skips | GNOME/Wayland: 18 GUI tests passed; classroom screenshot/export/restore script passed |
| Ubuntu 24.04.5 / Python 3.12.3 container | 125 passed, no skips; both numerical CLIs and all three native offscreen scripts passed | Not tested |
| Fedora 44 / Python 3.14.8 container | 125 passed, no skips; both numerical CLIs and all three native offscreen scripts passed | Not tested |

Both complete container pipelines exited successfully. They used the same NumPy,
SciPy, Qt and test-package versions listed above. Container checks are not claims
of real Fedora or Ubuntu 24.04 desktop coverage.

The built wheel was installed with `--no-deps` in a separate NumPy-only
environment. Qt and SciPy were absent; the packaged five-task/seven-preset catalog
loaded correctly, and **106 core tests passed**. One SciPy-dependent reference test
was explicitly skipped there; it passed in all fully provisioned environments.
The wheel's source/resources and the source distribution's required contents were
checked. Dependency consistency and `git diff --check` passed. The original
JavaScript model tests and offline HTML reproducible-build check also passed;
web application sources were not changed in this phase.

The baseline was 57 passing tests. All 57 original test definitions remain
unchanged. The 68 additions cover migrated content, all task flows and teacher
presets, semantic run identity, hidden probability through language changes,
drafts/history, independent group moments, record validation/atomicity, buffered
sampler continuation, UI responsiveness, file-dialog actions and restoration.

The full-record test saves and restores **200000 coordinates**: 100000 atomic and
100000 molecular measurements. Both retain complete statistics and 50000-point
display limits. Malformed versions, fields, seeds, dimensions, coordinates,
counts, answers, nonfinite values, duplicate JSON keys, oversized files, FIFOs and
write failures have rejection/preservation checks. A held measurement worker
proves that saving includes its final bounded batch; a held record worker proves
the GUI timer continues running during restoration.

Additional real historical files restored successfully:

- Phase 1 Wayland H₂⁺ export: 20000 measurements, followed by one new measurement.
- Phase 2 hydrogen export: all 100000 measurements (already at the UI limit).
- Phase 2 whole-atom export: 5000 measurements, followed by one new measurement.

Complete sessions created by each phase 3 container were additionally loaded on
the Ubuntu 26.04 host, preserving both 1000-point experiments and continuing each
by 37 samples. These specific cross-Linux/Python-version records passed exact
seed replay; this does not promise compatibility with arbitrary future versions.

The atomic numerical CLI again passes **6244 grouped checks / 6187500 samples**;
the H₂⁺ CLI again passes **97 grouped checks / 600000 samples**. The existing
atomic/molecular formula/sampling files and independent verifiers are byte-for-byte
unchanged from the phase 2 starting point. The shared experiment record adds a
run UUID but does not alter measurement sampling or statistics.

Binomial group tests cover p=0, .001, .2, .5, .99, 1, with 10000 independent
groups at n=100. Mean and standardized second-moment tolerances are derived from
the binomial variance and fourth moment, using 6.5 standard errors. Zero-variance
endpoints are handled explicitly. This verifies implementation, not classroom
learning outcomes or exactness of the normal approximation.

## Reproduce / 复现

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[desktop,test,gui-test,science-test]'
.venv/bin/quantum-classroom
QT_QPA_PLATFORM=offscreen .venv/bin/python -m pytest tests/python -q
.venv/bin/quantum-classroom-verify
.venv/bin/quantum-classroom-verify-atoms
.venv/bin/python scripts/check_classroom_desktop.py --require-display
bash scripts/test_linux_container.sh ubuntu:24.04
bash scripts/test_linux_container.sh fedora:44
```

Headless classroom tests are `test_activities.py` and `test_records.py`.
Only cross-language/content comparison tests need Node. See the
[installation guide](LINUX_PYTHON.md), [中文说明](LINUX_PYTHON.zh-CN.md) and
[record contract / 无界面恢复 API](CLASSROOM_RECORDS.md).

Artifacts in the local checkout:

- `artifacts/phase3/`: baseline, final tests, Wayland GUI XML and numerical reports.
- `artifacts/phase3-wayland-final/`: six native screenshots, restorable example
  session and scripted desktop report.
- `artifacts/phase3-linux-ubuntu-24.04/`, `artifacts/phase3-linux-fedora-44/`:
  OS/packages, numerical reports, full tests and three native offscreen scripts.

## Boundaries / 限制与未验证范围

Restoration is local and explicitly requested; there is no autosave, upload or
authenticated grading. Web record conversion is not implemented. Deterministic
continuation requires exact seed replay in the current environment; incompatible
NumPy/model versions are rejected with an explanatory message. Keep original
dependency versions if needed. All desktop parameters/seeds must fit the documented
control ranges. Refer to the record contract for limits and legacy behavior.

Native Fedora/Ubuntu 24.04 desktops, X11, ARM and local Python 3.11 remain untested.
Scripted widgets are not manual classroom acceptance, accessibility certification
or evidence of learning gains. GitHub Actions configuration is updated, but the
hosted workflow has not run from this unpushed branch. The optional Playwright
web interaction suite was not rerun. No new H₂/N₂/O₂ model or standalone binary
release was added. Phase 4 remains installation/distribution and CI refinement.
