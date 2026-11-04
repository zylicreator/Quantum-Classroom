#!/usr/bin/env bash
# Reproducible core/offscreen validation. Does not claim real desktop coverage.
set -euo pipefail
image="${1:-fedora:44}"
case "$image" in
  fedora:44|ubuntu:26.04|ubuntu:24.04) ;;
  *) echo 'Use fedora:44, ubuntu:26.04 or ubuntu:24.04.' >&2; exit 2 ;;
esac
repo_dir="$(cd "$(dirname "$0")/.." && pwd)"
report_dir="$repo_dir/artifacts/phase2-linux-${image/:/-}"
mkdir -p "$report_dir"
docker run --rm -i \
  --env "QC_UID=$(id -u)" --env "QC_GID=$(id -g)" \
  --mount "type=bind,source=$repo_dir,target=/source,readonly" \
  --mount "type=bind,source=$report_dir,target=/reports" \
  "$image" bash -s <<'CONTAINER'
set -euo pipefail
trap 'chown -R "$QC_UID:$QC_GID" /reports' EXIT
if command -v apt-get >/dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y --no-install-recommends python3 python3-venv python3-pip nodejs \
    libgl1 libegl1 libglib2.0-0t64 libdbus-1-3 libxkbcommon0 libfontconfig1 fonts-noto-cjk
else
  dnf install -y python3 python3-pip nodejs mesa-libGL mesa-libEGL glib2 dbus-libs \
    libxkbcommon fontconfig freetype google-noto-sans-cjk-fonts
fi
mkdir /work
tar -C /source --exclude='./.git' --exclude='./.venv' --exclude='./artifacts' \
  --exclude='./node_modules' --exclude='./dist' --exclude='./build' -cf - . | tar -C /work -xf -
cd /work
python3 -m venv .venv
.venv/bin/python -m pip install '.[desktop,test,gui-test,science-test]'
cat /etc/os-release > /reports/os-release.txt
.venv/bin/python -m pip freeze > /reports/python-packages.txt
.venv/bin/python -m quantum_classroom.verify --output /reports/numerical.json
.venv/bin/python -m quantum_classroom.verify_atoms --output /reports/atomic-numerical.json
QT_QPA_PLATFORM=offscreen .venv/bin/python -m pytest tests/python -q -ra --junitxml=/reports/tests.xml
QT_QPA_PLATFORM=offscreen .venv/bin/python scripts/check_desktop.py --output /reports/offscreen
QT_QPA_PLATFORM=offscreen .venv/bin/python scripts/check_atomic_desktop.py --output /reports/atomic-offscreen
CONTAINER
