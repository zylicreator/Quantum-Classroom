"""Build reproducible, fully offline HTML entry points from editable sources.

Run ``python assets/build.py`` from any directory. ``--check`` verifies the
committed HTML without rewriting it. Python's standard library is sufficient.
"""
from argparse import ArgumentParser
from pathlib import Path
import re

ASSETS = Path(__file__).resolve().parent
PROJECT = ASSETS.parent
STYLESHEETS = (
    "visualize.css", "classroom.css", "workspace.css", "molecular.css",
    "molecular_lessons.css",
)
SCRIPTS = (
    "d3.min.js", "electron_model.js", "atom_model.js", "i18n.js",
    "electron_app.js", "lessons.js", "classroom.js", "molecular_model.js",
    "molecular_app.js", "molecular_lessons.js", "workspace.js",
)
TARGETS = ("index.html", "electron-cloud-classroom.html")


def read_text(path):
    # Normalize line endings so Windows, macOS and Linux generate equal bytes.
    return path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")


def replace_marker(source, marker, replacement):
    if source.count(marker) != 1:
        raise ValueError(f"Expected exactly one source marker: {marker}")
    return source.replace(marker, replacement, 1)


def license_notice():
    sections = []
    for name in ("LICENSE", "THIRD_PARTY_NOTICES.md"):
        path = PROJECT / name
        if not path.is_file():
            raise FileNotFoundError(f"Required distribution notice is missing: {name}")
        content = read_text(path).strip()
        if any(delimiter in content for delimiter in ("<!--", "-->", "--!>")):
            raise ValueError(f"{name} contains an HTML-comment delimiter that cannot be embedded verbatim")
        sections.append(f"{name}\n\n{content}")
    return "<!--\nDistribution licenses and notices\n\n" + "\n\n".join(sections) + "\n-->"


def render():
    source = read_text(ASSETS / "index.source.html")
    source = replace_marker(source, "<head>", "<head>\n" + license_notice())
    for name in STYLESHEETS:
        css = read_text(ASSETS / name)
        source = replace_marker(source, f'<link rel="stylesheet" href="{name}">', f"<style>\n{css}\n</style>")
    for name in SCRIPTS:
        script = re.sub(r"</script", r"<\\/script", read_text(ASSETS / name), flags=re.IGNORECASE)
        source = replace_marker(source, f'<script src="{name}"></script>', f"<script>\n{script}\n</script>")
    return source.encode("utf-8")


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if either generated HTML differs from its sources")
    args = parser.parse_args()
    data = render()
    stale = []
    for name in TARGETS:
        target = PROJECT / name
        if args.check:
            if not target.is_file() or target.read_bytes() != data:
                stale.append(name)
        else:
            target.write_bytes(data)
            print(f"Built {name} ({len(data):,} bytes)")
    if stale:
        parser.exit(1, "Generated HTML is missing or stale: " + ", ".join(stale) + ". Run python assets/build.py.\n")
    if args.check:
        print("PASS: both offline HTML entry points match the editable sources.")


if __name__ == "__main__":
    main()
