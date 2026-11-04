# Third-party notices

Electron Cloud Classroom's original code is licensed under the MIT license in
`LICENSE`. Third-party code keeps its own license; the project's MIT license does
not replace the notices below.

The vendored `assets/d3.min.js` is the full D3 7.9.0 browser distribution. The
standalone HTML embeds the same library for offline use. Keep these notices with
both source and bundled distributions.

## Included components

- D3 7.9.0 (ISC): visualization library, including its D3 modules.
- d3-delaunay 6.x (ISC): Delaunay/Voronoi functionality exported by the full bundle.
- Delaunator 5.x (ISC): triangulation implementation used by d3-delaunay.
- robust-predicates 3.x (Unlicense): robust orientation predicates used by Delaunator.
- InternMap (ISC): interning maps and sets used by D3 array/grouping utilities.

D3's release manifest declares d3-delaunay 6.x; d3-delaunay declares Delaunator
5.x, and Delaunator declares robust-predicates 3.x. D3 array utilities declare
InternMap. The browser bundle is preserved as a distribution asset, rather than
rebuilt from those packages. Exact transitive patch versions are not asserted.
Both Mapbox copyright-year notices from Delaunator's 5.0.0 and 5.0.1 releases are
retained below.

## D3 — ISC

Source: [D3 7.9.0 LICENSE](https://github.com/d3/d3/blob/v7.9.0/LICENSE)

```text
Copyright 2010-2023 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

## d3-delaunay — ISC

Source: [d3-delaunay 6.0.4 LICENSE](https://github.com/d3/d3-delaunay/blob/v6.0.4/LICENSE)

```text
Copyright 2018-2021 Observable, Inc.
Copyright 2021 Mapbox

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

## Delaunator — ISC

Sources: [Delaunator 5.0.0 LICENSE](https://github.com/mapbox/delaunator/blob/v5.0.0/LICENSE),
[Delaunator 5.0.1 LICENSE](https://github.com/mapbox/delaunator/blob/v5.0.1/LICENSE)

```text
ISC License

Copyright (c) 2017, Mapbox
Copyright (c) 2021, Mapbox

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

## InternMap — ISC

Source: [InternMap 2.0.3 LICENSE](https://github.com/mbostock/internmap/blob/v2.0.3/LICENSE)

```text
Copyright 2021 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

## robust-predicates — Unlicense

Source: [robust-predicates 3.0.2 LICENSE](https://github.com/mourner/robust-predicates/blob/v3.0.2/LICENSE)

```text
This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, commercial or non-commercial, and by any
means.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <http://unlicense.org>
```

## Scope

Scientific references cited in the application and documentation are references
to formulas, models, and factual data. Their textbooks, articles, figures, and
web pages are not included in this repository or relicensed by it. System fonts
are referenced by name and are not bundled. Development dependencies, such as
Playwright, NumPy, and SciPy, are installed separately under their own licenses.

## Python desktop and numerical dependencies (phases 1–2)

The new Python source remains MIT-licensed. Dependencies are installed separately
in a project virtual environment; this repository does not vendor their wheels
or include them in its own Python wheel. The project's MIT license does not
relicense NumPy, Qt, PySide6, Shiboken or any of their bundled components.

| Component | Role | License / upstream notices |
| --- | --- | --- |
| NumPy (tested 2.5.4) | Core arrays, PCG64, quadrature | Primarily BSD-3-Clause; distribution metadata also lists 0BSD, MIT, Zlib and CC0-1.0 for components. Its wheel includes further notices for OpenBLAS/LAPACK and runtime components in `numpy-*.dist-info/licenses/LICENSE.txt`. See [NumPy license](https://github.com/numpy/numpy/blob/main/LICENSE.txt). |
| PySide6-Essentials (tested 6.12.0) | Optional native QtCore/QtGui/QtWidgets interface | Package metadata: `LGPL-3.0-only OR GPL-2.0-only OR GPL-3.0-only`; commercial licensing is also available from Qt. See [Qt for Python](https://doc.qt.io/qtforpython-6/) and [upstream license texts](https://code.qt.io/cgit/pyside/pyside-setup.git/tree/LICENSES). |
| Shiboken6 (tested 6.12.0) | PySide6 binding runtime | Same license alternatives in its installed package metadata; version matched to PySide6 by pip. See the same upstream PySide repository. |
| Qt libraries/plugins shipped by PySide6-Essentials | Native window system, painting, widgets | Qt module and bundled third-party terms apply separately. See [Qt licensing](https://doc.qt.io/qt-6/licensing.html) and [third-party licenses](https://doc.qt.io/qt-6/licenses-used-in-qt.html). |
| pytest / pytest-qt | Optional automated tests | MIT: [pytest](https://github.com/pytest-dev/pytest/blob/main/LICENSE), [pytest-qt](https://github.com/pytest-dev/pytest-qt/blob/master/LICENSE). |
| SciPy (tested 1.18.1) | Optional independent atomic verification (`science-test`); not imported by the runtime core | Primarily BSD-3-Clause, with further bundled-component notices in its installed distribution. See [SciPy license](https://github.com/scipy/scipy/blob/main/LICENSE.txt). |
| setuptools / build | Package building only | MIT: [setuptools](https://github.com/pypa/setuptools/blob/main/LICENSE), [build](https://github.com/pypa/build/blob/main/LICENSE). |

Only Qt Essentials is requested; no Qt add-on modules or WebView are used.
No standalone binary bundle is shipped in phase 1. If a later release bundles
dependency binaries, include the exact distribution's license texts/notices and
fulfil the applicable source/relinking obligations; this notice is not a substitute
for those license terms. Existing D3 notices above are preserved.

The phase 2 NIST test fixture records factual neutral-atom occupancy numbers
(H–U), with a source URL and retrieval date in the JSON. It does not bundle the
source page's prose, images, or ionic tables. Scientific data and references do
not change the model's stated teaching approximations.
