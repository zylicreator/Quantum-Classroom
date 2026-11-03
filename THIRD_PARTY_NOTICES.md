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
