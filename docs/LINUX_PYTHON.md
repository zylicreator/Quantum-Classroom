# Python atomic and H₂⁺ laboratories on Linux

[中文](LINUX_PYTHON.zh-CN.md) · [Results](PHASE2_VALIDATION.md) · [Model definitions](MODELS.md)

Phase 2 adds the 30 classroom hydrogen orbitals and all 118 screened neutral
atoms to the preserved H₂⁺ workspace. Full classroom activities and teacher
presets remain later work. The original offline web edition is preserved.

## Environment and installation

Check `cat /etc/os-release`, `uname -m`, `python3 --version` and
`echo "$XDG_SESSION_TYPE"` before choosing packages. The Python core requires
Python 3.11+ and NumPy 2.3–2.x. Desktop installation additionally requires a
compatible PySide6-Essentials 6.10–6.x wheel; this package supplies the PySide6
QtCore/QtGui/QtWidgets modules used here. A matching Shiboken is installed by pip.
Availability of wheels and system libraries still depends on OS, Python and CPU.
The tested environments are x86_64; ARM and other Linux releases are unverified.

Ubuntu 24.04 / 26.04 system dependencies (run in your regular terminal):

```sh
sudo apt update
sudo apt install python3 python3-venv python3-pip libgl1 libegl1 \
  libglib2.0-0t64 libdbus-1-3 libfontconfig1 libwayland-client0 libxkbcommon0 \
  libxcb-cursor0 libxkbcommon-x11-0 libxcb-icccm4 libxcb-image0 \
  libxcb-keysyms1 libxcb-render-util0 fonts-noto-cjk
```

Fedora 44 system dependencies:

```sh
sudo dnf install python3 python3-pip mesa-libGL mesa-libEGL glib2 dbus-libs \
  fontconfig freetype wayland-libs libxkbcommon libxkbcommon-x11 libX11-xcb \
  xcb-util-cursor xcb-util-wm xcb-util-image xcb-util-keysyms xcb-util-renderutil \
  google-noto-sans-cjk-fonts
```

Create the virtual environment **inside the repository**, then install:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[desktop,test,gui-test,science-test]'
.venv/bin/quantum-classroom
```

For the validated Python 3.12/3.14 dependency versions, optionally add
`-c constraints-linux-tested.txt` to the pip command. These constraints are not a
complete lockfile and are not intended for Python 3.11.
Qt wheels contain Qt libraries; platform dependencies and fonts still come from
the system. See the official [PySide installation guide](https://doc.qt.io/qtforpython-6/gettingstarted.html)
and [Linux platform dependencies](https://doc.qt.io/qt-6/linux-requirements.html).

On a real Wayland desktop use `QT_QPA_PLATFORM=wayland .venv/bin/quantum-classroom`
if explicit platform selection is needed; for X11/XWayland use `xcb` with a valid
`DISPLAY`. Offscreen mode tests widgets but does not validate the desktop session.
Only the real Wayland session listed in the results has been exercised here.

## Atomic workspace

Choose Hydrogen (30 spatial orbitals, n<=4), Screened occupied orbital, or Screened
whole-atom mixture. The latter two modes offer all 118 elements. Only occupied
subshells can be selected in screened orbital mode. The displayed effective charge
uses the original Slater rules. H–U configurations retain their reference status;
Z=93–118 are marked as ideal filling, not observed ground states.

The whole atom is an electron-count-weighted mixture with angular averaging, not
one coherent wavefunction; sign coloring is disabled. Each point measures one
randomly selected electron from a newly prepared atom. No SCF, electron
correlation or relativistic corrections are included.

Changing observation-sphere radius recounts every existing sample without drawing
new points, including any in-flight batch. The orange circle is only the sphere's
projection: a projected dot inside that circle may be outside the 3D sphere.
The radial graph P(r) includes shell volume; it is not pointwise spatial density.
Model/element/orbital/seed changes reset the atomic experiment. Switching tabs
pauses the old workspace (at most one batch finishes) and preserves both states.
Language changes preserve both workspaces.

```python
from quantum_classroom.core import AtomicModel, AtomicSampler, AtomicExperiment

model = AtomicModel(mode="orbital", z=26, state="3dxz")  # Fe, Z_eff=6.25
experiment = AtomicExperiment(model, seed=42)
experiment.append(AtomicSampler(model, seed=42).take(10000))
experiment.set_radius(0.8)  # recount, no resampling
experiment.export("atomic-classroom-record.json", language="en")
# AtomicModel(mode="whole", z=29) selects the spherical copper mixture.
```

## Running the H₂⁺ experiment

1. Choose bonding σ or antibonding σ*, R in [0.6, 8] a₀, a seed and a target count.
2. Measure once, add 1000, or start accumulation. Pause finishes at most one
   in-flight batch of 512 measurements; continuing preserves the sample sequence.
3. Drag the 3D view to rotate, or choose xz/xy projection. Switch uniform/sign
   colors or density/amplitude curves without changing measurements.
4. Change language at any time. Export JSON to save every measurement and its
   parameters, RNG information and statistics. Records remain local. Import and
   session restoration are not implemented; reset/parameter changes and closing
   the window discard unsaved measurements.

Changing R, orbital or seed starts a new experiment. Old worker results are
rejected by experiment generation number. All 100000 allowed measurements enter
statistics and export; display selects at most 50000, with drawing-window clipping
affecting visualization only. Pause, rotations and translations do not resample.

Every point comes from an independent preparation, not an electron trajectory.
Sign colors are not charges or phases directly measured by position observations.
The central slab is |z|<R/4 with unlimited x,y; it is not the zero-thickness node.
Axial values at x=y=0 are not a marginal density. LLN/CLT do not derive ψ, and this
fixed-nuclei minimal model makes no bond-energy, equilibrium-length or dynamics
prediction. Detailed scientific references remain in [MODELS.md](MODELS.md).

## Independent atomic verification

The production atomic core needs only NumPy. SciPy is an optional, independent
verification dependency (the `science-test` extra):

```sh
.venv/bin/python -m pip install -e '.[test,science-test]'
.venv/bin/quantum-classroom-verify-atoms
.venv/bin/python -m pytest tests/python/test_atoms.py -q
```

This checks 78 internal orbitals (30 exposed for hydrogen; higher n supports the
screened model), 22 radial distributions, 16 real angular functions, all 118
elements and 1379 occupied subshells. Fixed seeds and 6.5-standard-error criteria
cover 6187500 samples. Region/channel frequency checks add 1/N; rare tail checks
add 2/N. A rare theoretical tail need not appear in every finite sample.
Independent SciPy Laguerre/Legendre and quadrature references are separate from
the NumPy-only runtime formulas. A bundled NIST H–U occupancy fixture and Node
parity tests require no network. Node parity explicitly skips when Node/assets
are unavailable. Core calculations never require Qt, SciPy or Node.

`HydrogenOrbital(state, charge)` exposes amplitudes, radial density, sphere
probability and nodes. `AtomicModel` adds screened mixtures and observation
regions. `AtomicSampler` preserves arbitrary chunk prefixes. Whole-atom records
include the approximation, configuration status and every channel's occupancy,
shielding and effective charge. Import/restoration remains unimplemented.

## Headless and reusable H₂⁺ core

For a separate environment without Qt, install `'.[test]'` instead of desktop extras:

```sh
.venv/bin/python -m pip install -e '.[test]'
.venv/bin/quantum-classroom-verify
.venv/bin/python -m pytest tests/python/test_core.py -q
```

The verification CLI prints JSON and exits nonzero on failure. `--output path.json`
also saves the report (the parent directory must exist). Node.js is needed only
for the pytest cross-language check; that test reports an explicit skip without it.
The standalone verification CLI needs neither Node, SciPy, Qt nor a display.

```python
from quantum_classroom.core import H2Plus, Sampler, Experiment

model = H2Plus(R=2.0, state="antibonding")
stream = Sampler(model, seed=42)
record = Experiment(model, seed=42)
record.append(stream.take(1000))
record.append(stream.take(9000))
print(model.overlap, model.region_probability, record.frequency)
record.export("h2plus-classroom-record.json", language="en")
```

Positions use shape (..., 3). Core streams have no display cap. Integer seeds must
be nonnegative; strings use SHA-256 UTF-8 conversion. NumPy PCG64 uses fixed
proposal blocks with retained accepted samples, so arbitrary `take` chunk sizes
preserve exact prefixes for the same seed/model/environment. Export records save
NumPy version and sampler algorithm. JavaScript uses a different RNG: compare
deterministic calculations and statistical properties, not individual samples.

## Validation layers

```sh
# Local headless widgets (includes core, GUI, and Node parity if available)
QT_QPA_PLATFORM=offscreen .venv/bin/python -m pytest tests/python -q
QT_QPA_PLATFORM=offscreen .venv/bin/python scripts/check_desktop.py
QT_QPA_PLATFORM=offscreen .venv/bin/python scripts/check_atomic_desktop.py

# A real local desktop; opens test windows
.venv/bin/python scripts/check_atomic_desktop.py --require-display --output artifacts/phase2-desktop

# Requires a working Docker engine; sources mounted read-only
bash scripts/test_linux_container.sh fedora:44
bash scripts/test_linux_container.sh ubuntu:24.04
bash scripts/test_linux_container.sh ubuntu:26.04
```

Independent direct cylindrical quadrature checks normalization, overlap and slab
integrals at eight R values, expanding order 96→144 and bounds 32→40 a₀ at three
separations. Its finite integration bounds never restrict the sampler. Fixed-seed
600000-sample checks cover frequencies, moments, symmetry, acceptance and tails
beyond 6 a₀ from both nuclei. Tolerances are fixed at six standard errors (plus
2/n for slab frequency); no repeated runs to obtain a pass, and no monotone-error
assumption. Numeric assertions use an absolute tolerance of 1e-10 for integrals.

The CI workflow tests three distribution images plus Python 3.11/3.14 core-only
installs and builds. Local results and unverified cases are recorded separately;
adding workflow YAML does not mean hosted CI has run.
