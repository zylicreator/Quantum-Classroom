"""Create a small, licensed offline distribution from an explicit allowlist.

The editable source and development tests live in the repository. This ZIP is
for teachers and students who want to open the application without a toolchain.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = (
    "index.html",
    "electron-cloud-classroom.html",
    "README.md",
    "README.zh-CN.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "THIRD_PARTY_NOTICES.md",
    "docs/MODELS.md",
    "docs/images/molecular-orbitals.png",
    "docs/images/amplitudes-and-density.png",
)


def main():
    subprocess.run([sys.executable, str(ROOT / "assets/build.py"), "--check"], check=True)
    missing = [name for name in FILES if not (ROOT / name).is_file()]
    if missing:
        raise FileNotFoundError("Missing release files: " + ", ".join(missing))
    distribution = ROOT / "dist"
    distribution.mkdir(exist_ok=True)
    archive = distribution / "electron-cloud-classroom-offline.zip"
    # Deterministic archive timestamps and ordering aid release verification.
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for name in FILES:
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            package.writestr(info, (ROOT / name).read_bytes())
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (distribution / (archive.name + ".sha256")).write_text(f"{digest}  {archive.name}\n", encoding="utf-8")
    print(json.dumps({"archive": str(archive.relative_to(ROOT)), "bytes": archive.stat().st_size, "sha256": digest}))


if __name__ == "__main__":
    main()
