"""All-measurement statistics and portable, atomic JSON record exports."""
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
from uuid import uuid4

import numpy as np

from quantum_classroom import __version__
from .molecular import H2Plus, _seed


class Experiment:
    MAX_COUNT = 100_000
    DISPLAY_LIMIT = 50_000

    def __init__(self, model=None, seed=123456789):
        _seed(seed)
        self.model = model if model is not None else H2Plus()
        self.seed = int(seed) if not isinstance(seed, str) else seed
        self.run_id = uuid4().hex
        self.count = self.hits = 0
        self._points = np.empty((self.MAX_COUNT, 3))
        self._hits = np.empty(self.MAX_COUNT, dtype=bool)

    @property
    def points(self):
        view = self._points[:self.count].view()
        view.flags.writeable = False
        return view

    def append(self, points):
        points = self.model._positions(points)
        if points.ndim != 2:
            raise ValueError("Measurements must have shape (N, 3).")
        end = self.count + len(points)
        if end > self.MAX_COUNT:
            raise ValueError("An experiment supports at most 100000 measurements.")
        hits = self.model.in_region(points)
        self._points[self.count:end] = points
        self._hits[self.count:end] = hits
        self.hits += int(hits.sum())
        self.count = end

    @property
    def frequency(self):
        return self.hits / self.count if self.count else None

    def display_points(self):
        if self.count <= self.DISPLAY_LIMIT:
            return self.points
        return self.points[np.linspace(0, self.count - 1, self.DISPLAY_LIMIT, dtype=int)]

    def convergence(self, limit=400):
        if not self.count:
            return np.empty(0), np.empty(0)
        indices = np.unique(np.geomspace(1, self.count, min(limit, self.count)).astype(int))
        hits = np.cumsum(self._hits[:self.count])
        return indices, hits[indices - 1] / indices

    def record(self, language="zh"):
        return self._record({"system": "H2+", "R": self.model.R, "state": self.model.state,
                             "units": "a0", "basis": "fixed nuclei; normalized hydrogen 1s LCAO",
                             "region": "|z| < R/4; unlimited x,y"}, "QuantumClassroomH2Plus", language)

    def _record(self, metadata, format_name, language):
        return {
            "format": format_name, "schema_version": 1,
            "run_id": self.run_id,
            "application_version": __version__,
            "created_at": datetime.now(timezone.utc).isoformat(), "language": language,
            "model": metadata,
            "sampling": {"seed": self.seed, "rng": "NumPy PCG64",
                         "numpy_version": np.__version__, "proposal_block": 4096,
                         "algorithm": "mixture-1s rejection v1; no drawing-box cutoff"},
            "statistics": {"count": self.count, "hits": self.hits,
                           "frequency": self.frequency,
                           "probability": self.model.region_probability,
                           "mean": self.points.mean(axis=0).tolist() if self.count else None,
                           "second_moments": (self.points**2).mean(axis=0).tolist() if self.count else None},
            "columns": ["x", "y", "z"], "measurements": self.points.tolist(),
            "interpretation": "Independent preparations; not a trajectory. Signs are not charges. No energy or equilibrium bond-length prediction.",
        }

    def export(self, filename, language="zh"):
        """Replace the selected file only after a complete valid JSON write."""
        path = Path(filename)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent,
                                             prefix=".h2plus-", suffix=".tmp", delete=False) as stream:
                temporary = Path(stream.name)
                json.dump(self.record(language), stream, ensure_ascii=False, allow_nan=False)
                stream.write("\n")
            os.replace(temporary, path)
        finally:
            if temporary is not None and temporary.exists():
                temporary.unlink()
