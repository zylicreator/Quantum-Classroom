"""Fixed-nuclei H₂⁺ in two normalized hydrogen 1s functions (atomic units).

Port of assets/molecular_model.js; no optimized exponents or energy prediction.
Every sample is an independent position measurement, never a trajectory.
"""
from dataclasses import dataclass
from functools import lru_cache
import hashlib
import math
from numbers import Integral

import numpy as np


def _count(value):
    if isinstance(value, bool) or not isinstance(value, Integral) or value < 0:
        raise ValueError("Count must be a nonnegative integer.")
    return int(value)


def _seed(value):
    if isinstance(value, str):
        return int.from_bytes(hashlib.sha256(value.encode("utf-8")).digest(), "little")
    if isinstance(value, bool) or not isinstance(value, Integral) or value < 0:
        raise ValueError("Seed must be a nonnegative integer or a string.")
    return int(value)


@lru_cache(maxsize=128)
def _region_parts(R):
    # Same prolate-coordinate reduction as the web model, but Gauss-Legendre
    # quadrature for the residual. Independent cylindrical checks live elsewhere.
    nodes, weights = _legendre(128)
    u = 20 * (nodes + 1)
    residual = 20 * np.dot(weights, np.exp(-u) / (1 + u / R) ** 3)
    a, b = R / 4, 3 * R / 4
    atomic = (a / 2 + .5) * math.exp(-2 * a) - (b / 2 + .5) * math.exp(-2 * b)
    cross = R * R * math.exp(-R) / 4 * (1 + 1 / R - residual / 12)
    # The omitted u>40 residual contributes <1e-18 for 0.6 <= R <= 8.
    return atomic, cross


@lru_cache(maxsize=8)
def _legendre(order):
    return np.polynomial.legendre.leggauss(order)


@dataclass(frozen=True)
class H2Plus:
    """Minimal normalized LCAO model with nuclei at (0, 0, ±R/2).

    Coordinate arrays have final dimension 3; all leading dimensions broadcast.
    R is in Bohr radii, amplitude in a0**(-3/2), density in a0**(-3).
    """

    R: float = 2.0
    state: str = "bonding"

    def __post_init__(self):
        if isinstance(self.R, bool) or not isinstance(self.R, (float, int, np.floating)):
            raise ValueError("R must be a finite number between 0.6 and 8 a0.")
        if not math.isfinite(self.R) or not .6 <= self.R <= 8:
            raise ValueError("R must be between 0.6 and 8 a0.")
        if self.state not in ("bonding", "antibonding"):
            raise ValueError("State must be bonding or antibonding.")

    @property
    def sign(self):
        return 1 if self.state == "bonding" else -1

    @property
    def overlap(self):
        return math.exp(-self.R) * (1 + self.R + self.R**2 / 3)

    @staticmethod
    def _positions(points):
        points = np.asarray(points, dtype=float)
        if points.ndim == 0 or points.shape[-1] != 3 or not np.all(np.isfinite(points)):
            raise ValueError("Positions must be finite (..., 3) coordinates.")
        return points

    def _distances(self, points):
        p = self._positions(points)
        transverse = np.hypot(p[..., 0], p[..., 1])
        return p, np.hypot(transverse, p[..., 2] + self.R / 2), np.hypot(transverse, p[..., 2] - self.R / 2)

    def atomic_amplitude(self, points, side="A"):
        if side not in ("A", "B"):
            raise ValueError("Side must be A or B.")
        _, a, b = self._distances(points)
        return np.exp(-(a if side == "A" else b)) / math.sqrt(math.pi)

    def amplitude(self, points):
        p, a, b = self._distances(points)
        # rA-rB = 2Rz/(rA+rB), avoiding cancellation near the nodal plane.
        delta = np.abs(self.R * (p[..., 2] / (a / 2 + b / 2)))
        factor = 1 + np.exp(-delta) if self.sign == 1 else -np.expm1(-delta)
        if self.sign == -1:
            factor = np.where(p[..., 2] <= 0, factor, -factor)
        return np.exp(-np.minimum(a, b)) * factor / math.sqrt(2 * math.pi * (1 + self.sign * self.overlap))

    def density(self, points):
        return self.amplitude(points) ** 2

    def in_region(self, points):
        """The strict slab |z|<R/4, unlimited in x and y."""
        return np.abs(self._positions(points)[..., 2]) < self.R / 4

    @property
    def region_probability(self):
        atomic, cross = _region_parts(self.R)
        return float((atomic + self.sign * cross) / (1 + self.sign * self.overlap))

    @property
    def second_moments(self):
        R, s = self.R, self.sign
        cross_x = math.exp(-R) * (1 + R + 2 * R**2 / 5 + R**3 / 15)
        cross_z = math.exp(-R) * (1 + R + 9 * R**2 / 20 + 7 * R**3 / 60 + R**4 / 60)
        x = (1 + s * cross_x) / (1 + s * self.overlap)
        z = (1 + R**2 / 4 + s * cross_z) / (1 + s * self.overlap)
        return np.array([x, x, z])

    def axis_data(self, count=241, extent=None):
        if _count(count) < 2:
            raise ValueError("Axis count must be at least 2.")
        extent = max(4, self.R / 2 + 3) if extent is None else extent
        if not math.isfinite(extent) or extent <= 0:
            raise ValueError("Axis extent must be positive and finite.")
        z = np.linspace(-extent, extent, count)
        p = np.column_stack((np.zeros(count), np.zeros(count), z))
        a, b = self.atomic_amplitude(p, "A"), self.atomic_amplitude(p, "B")
        psi = self.amplitude(p)
        return dict(z=z, a=a, b=b, psi=psi, density=psi**2, incoherent=(a*a+b*b)/2)


class Sampler:
    """Unbounded mixture-1s rejection sampler; reproducible across take sizes.

    Fixed proposal blocks and a retained buffer preserve exact sample prefixes.
    PCG64 differs from the JS RNG: cross-language individual samples need not match.
    Instances are mutable streams and must not be used concurrently.
    """

    BLOCK = 4096

    def __init__(self, model=None, seed=123456789):
        self.model = model if model is not None else H2Plus()
        self.seed = seed
        self._rng = np.random.Generator(np.random.PCG64(_seed(seed)))
        self._buffer = np.empty((0, 3))
        self.proposed = self.accepted = self.delivered = 0

    @property
    def expected_acceptance(self):
        return (1 + self.model.sign * self.model.overlap) / 2

    def _propose(self):
        # Uniforms in (0,1] keep log finite without a finite-radius cutoff.
        u = 1 - self._rng.random((self.BLOCK, 7))
        radius = -.5 * np.log(u[:, :3]).sum(axis=1)  # Gamma(shape=3, rate=2)
        cosine = 2 * u[:, 3] - 1
        z = radius * cosine + np.where(u[:, 4] < .5, -self.model.R / 2, self.model.R / 2)
        rho = radius * np.sqrt(np.maximum(0, 1 - cosine**2))
        a, b = np.hypot(rho, z + self.model.R / 2), np.hypot(rho, z - self.model.R / 2)
        delta = np.abs(2 * self.model.R * z / (a + b))
        t = np.exp(-delta)
        numerator = 1 + t if self.model.sign == 1 else -np.expm1(-delta)
        keep = u[:, 5] < numerator**2 / (2 * (1 + t*t))
        angle = 2 * math.pi * u[keep, 6]
        self._buffer = np.column_stack((rho[keep] * np.cos(angle), rho[keep] * np.sin(angle), z[keep]))
        self.proposed += self.BLOCK
        self.accepted += len(self._buffer)

    def take(self, count):
        count = _count(count)
        result = np.empty((count, 3))
        offset = 0
        while offset < count:
            if not len(self._buffer):
                self._propose()
            size = min(count - offset, len(self._buffer))
            result[offset:offset+size] = self._buffer[:size]
            self._buffer = self._buffer[size:]
            offset += size
        self.delivered += count
        return result
