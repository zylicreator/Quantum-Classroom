"""Normalized real hydrogenic orbitals; NumPy only, lengths in a0.

The 30 classroom orbitals have n<=4. The n<=7 s/p/d/f catalog also supports
occupied subshells in the screened teaching model. Spin is not counted.
"""
from dataclasses import dataclass
from functools import lru_cache
import math
from types import MappingProxyType

import numpy as np

from .molecular import H2Plus, _count, _seed

DIRECTIONS = (
    (("", 0, "zero"),),
    (("z", 0, "zero"), ("x", 1, "cos"), ("y", 1, "sin")),
    (("z2", 0, "zero"), ("xz", 1, "cos"), ("yz", 1, "sin"), ("x2y2", 2, "cos"), ("xy", 2, "sin")),
    (("z3", 0, "zero"), ("xz2", 1, "cos"), ("yz2", 1, "sin"), ("zx2y2", 2, "cos"),
     ("xyz", 2, "sin"), ("xx23y2", 3, "cos"), ("y3x2y2", 3, "sin")),
)


@dataclass(frozen=True)
class OrbitalSpec:
    id: str
    n: int
    l: int
    m: int
    kind: str

    @property
    def subshell(self):
        return f"{self.n}{'spdf'[self.l]}"

    @property
    def label(self):
        suffix = self.id[len(self.subshell):]
        names = {'z2': 'z²', 'x2y2': '(x²−y²)', 'z3': 'z(5z²−3r²)',
                 'xz2': 'x(5z²−r²)', 'yz2': 'y(5z²−r²)', 'zx2y2': 'z(x²−y²)',
                 'xx23y2': 'x(x²−3y²)', 'y3x2y2': 'y(3x²−y²)'}
        return self.subshell + ('_' + names.get(suffix, suffix) if suffix else '')


STATES = MappingProxyType({
    f"{n}{'spdf'[l]}{key}": OrbitalSpec(f"{n}{'spdf'[l]}{key}", n, l, m, kind)
    for n in range(1, 8) for l in range(min(n, 4)) for key, m, kind in DIRECTIONS[l]
})
CLASSROOM_STATES = tuple(key for key, spec in STATES.items() if spec.n <= 4)


def legendre(l, m, u):
    """Associated Legendre recurrence including the Condon–Shortley sign."""
    u = np.asarray(u, dtype=float)
    p = np.ones_like(u)
    for j in range(1, m+1):
        p *= -(2*j-1) * np.sqrt(np.maximum(0, 1-u*u))
    if l == m:
        return p
    next_p = u*(2*m+1)*p
    for j in range(m+2, l+1):
        p, next_p = next_p, ((2*j-1)*u*next_p-(j+m-1)*p)/(j-m)
    return next_p


def _positive_roots(coefficients):
    roots = np.polynomial.polynomial.polyroots(coefficients)
    return np.sort(roots.real[(np.abs(roots.imag) < 1e-8) & (roots.real > 0)])


@lru_cache(maxsize=32)
def radial_info(n, l):
    k, q = n-l-1, 2*l+2
    a = np.array([(-1)**j * math.comb(k+2*l+1, k-j)/math.factorial(j) for j in range(k+1)])
    c = math.factorial(k)/(2*n*math.factorial(n+l))
    nodes = _positive_roots(a)
    coefficients = np.zeros(len(a)+1)
    coefficients[:-1] = (q+2*np.arange(len(a)))*a
    coefficients[1:] -= a
    critical = _positive_roots(coefficients)
    start = max(40, 8*n+16)
    edges = np.arange(0, start+.0625, .125)

    def density(rho):
        rho = np.asarray(rho)
        return c*np.exp(-rho)*rho**q*np.polynomial.polynomial.polyval(rho, a)**2

    peak = np.maximum(density(edges[:-1]), density(edges[1:]))
    for root in critical:
        index = int(root/.125)
        if index < len(peak):
            peak[index] = max(peak[index], density(root))
    peak = peak*(1+1e-10)+1e-300
    absolute = np.polynomial.polynomial.polyval(start, np.abs(a))
    tail_peak = c*math.exp(-start)*start**q*absolute**2*(1+1e-10)
    tail_rate = 1-(q+2*k)/start
    cumulative = np.cumsum(np.r_[peak*.125, tail_peak/tail_rate])
    for array in (a, nodes, edges, peak, cumulative):
        array.flags.writeable = False
    return dict(k=k, q=q, a=a, c=c, nodes=nodes, density=density, edges=edges,
                peak=peak, start=start, tail_peak=tail_peak, tail_rate=tail_rate, cumulative=cumulative)


@lru_cache(maxsize=512)
def _probability(n, l, radius):
    end = min(160., 2*radius/n)
    if end == 0:
        return 0.
    # Same negligible integration-tail bound as the existing web CDF, not a
    # sampling cutoff. Unit-width panels prevent skipping narrow inner peaks.
    nodes, weights = _quadrature()
    edges = np.r_[np.arange(0, end, 1), end]
    width = np.diff(edges)
    rho = edges[:-1, None] + (nodes+1)*width[:, None]/2
    value = np.sum(radial_info(n, l)['density'](rho)*weights*width[:, None]/2)
    return float(np.clip(value, 0, 1))


@lru_cache(maxsize=1)
def _quadrature():
    return np.polynomial.legendre.leggauss(32)


@dataclass(frozen=True)
class HydrogenOrbital:
    state: str = "1s"
    charge: float = 1.0

    def __post_init__(self):
        if self.state not in STATES:
            raise ValueError("Unknown hydrogenic spatial orbital.")
        if isinstance(self.charge, bool) or not np.isfinite(self.charge) or self.charge <= 0:
            raise ValueError("Effective charge must be positive and finite.")

    @property
    def spec(self):
        return STATES[self.state]

    @property
    def nodes(self):
        return radial_info(self.spec.n, self.spec.l)['nodes']*self.spec.n/(2*self.charge)

    @property
    def mean_radius(self):
        n, l = self.spec.n, self.spec.l
        return (3*n*n-l*(l+1))/(2*self.charge)

    @property
    def mean_radius_squared(self):
        n, l = self.spec.n, self.spec.l
        return n*n*(5*n*n+1-3*l*(l+1))/(2*self.charge**2)

    @property
    def extent(self):
        n, l = self.spec.n, self.spec.l
        return (([0, 5, 14, 28, 46][n] if n <= 4 else 3*n*n)-l*(4 if n >= 4 else 3 if n == 3 else 2))/self.charge

    def radial_amplitude(self, radius):
        radius = np.asarray(radius, dtype=float)
        if not np.all(np.isfinite(radius)) or np.any(radius < 0):
            raise ValueError("Radii must be finite and nonnegative.")
        n, l = self.spec.n, self.spec.l
        info = radial_info(n, l)
        rho = 2*radius*self.charge/n
        return self.charge**1.5 * 2/n**2 * math.sqrt(math.factorial(info['k'])/math.factorial(n+l)) * np.exp(-rho/2)*rho**l*np.polynomial.polynomial.polyval(rho, info['a'])

    def angular_amplitude(self, cosine, phi):
        u, phi = np.broadcast_arrays(np.asarray(cosine, dtype=float), np.asarray(phi, dtype=float))
        if not np.all(np.isfinite(u)) or not np.all(np.isfinite(phi)) or np.any(np.abs(u) > 1):
            raise ValueError("Angles must be finite and cosine in [-1, 1].")
        l, m = self.spec.l, self.spec.m
        base = math.sqrt((2*l+1)/(4*math.pi)*math.factorial(l-m)/math.factorial(l+m)) * legendre(l, m, u)*(-1)**m
        if not m:
            return base
        return math.sqrt(2)*base*(np.cos(m*phi) if self.spec.kind == 'cos' else np.sin(m*phi))

    def amplitude(self, points):
        p = H2Plus._positions(points)
        r = np.linalg.norm(p, axis=-1)
        u = np.divide(p[..., 2], r, out=np.zeros_like(r), where=r > 0)
        return self.radial_amplitude(r)*self.angular_amplitude(np.clip(u, -1, 1), np.arctan2(p[..., 1], p[..., 0]))

    def density(self, points):
        return self.amplitude(points)**2

    def radial_density(self, radius):
        return np.asarray(radius)**2*self.radial_amplitude(radius)**2

    def probability(self, radius):
        if not np.isfinite(radius) or radius < 0:
            raise ValueError("Sphere radius must be finite and nonnegative.")
        return _probability(self.spec.n, self.spec.l, float(radius*self.charge))


class RadialStream:
    """Exact rejection envelope with an exponential proposal to infinity."""
    BLOCK = 4096

    def __init__(self, orbital, rng):
        self.orbital, self.rng = orbital, rng
        self.info = radial_info(orbital.spec.n, orbital.spec.l)
        self.buffer = np.empty(0)

    def _fill(self):
        info = self.info
        if info['k'] == 0:
            self.buffer = self.rng.gamma(info['q']+1, 1, self.BLOCK)
            return
        u = 1-self.rng.random((self.BLOCK, 3))
        bins = np.searchsorted(info['cumulative'], u[:, 0]*info['cumulative'][-1], side='left')
        tail = bins == len(info['peak'])
        rho = bins*.125+u[:, 1]*.125
        envelope = info['peak'][np.minimum(bins, len(info['peak'])-1)].copy()
        rho[tail] = info['start']-np.log(u[tail, 1])/info['tail_rate']
        envelope[tail] = info['tail_peak']*np.exp(-info['tail_rate']*(rho[tail]-info['start']))
        target = info['density'](rho)
        if np.any(target > envelope*(1+1e-9)):
            raise ArithmeticError("Radial rejection envelope was violated.")
        self.buffer = rho[u[:, 2]*envelope <= target]

    def take(self, count):
        result = np.empty(count)
        offset = 0
        while offset < count:
            if not len(self.buffer):
                self._fill()
            size = min(count-offset, len(self.buffer))
            result[offset:offset+size] = self.buffer[:size]
            self.buffer = self.buffer[size:]
            offset += size
        return result*self.orbital.spec.n/(2*self.orbital.charge)


class OrbitalSampler:
    """Independent radius/angular streams; optionally spherical angular averaging."""
    BLOCK = 4096

    def __init__(self, orbital=None, seed=123456789, spherical=False):
        self.orbital = orbital or HydrogenOrbital()
        seeds = np.random.SeedSequence(_seed(seed)).spawn(2)
        self.radial = RadialStream(self.orbital, np.random.Generator(np.random.PCG64(seeds[0])))
        self.rng = np.random.Generator(np.random.PCG64(seeds[1]))
        self.spherical = spherical
        self.buffer = np.empty((0, 3))

    def _fill(self):
        u = self.rng.random((self.BLOCK, 3))
        cosine, phi = 2*u[:, 0]-1, 2*math.pi*u[:, 1]
        keep = np.ones(self.BLOCK, dtype=bool) if self.spherical else u[:, 2] < 4*math.pi*self.orbital.angular_amplitude(cosine, phi)**2/(2*self.orbital.spec.l+1)
        cosine, phi = cosine[keep], phi[keep]
        rho = np.sqrt(np.maximum(0, 1-cosine**2))
        self.buffer = np.column_stack((rho*np.cos(phi), rho*np.sin(phi), cosine))

    def take(self, count):
        count = _count(count)
        direction = np.empty((count, 3))
        offset = 0
        while offset < count:
            if not len(self.buffer):
                self._fill()
            size = min(count-offset, len(self.buffer))
            direction[offset:offset+size] = self.buffer[:size]
            self.buffer = self.buffer[size:]
            offset += size
        return direction*self.radial.take(count)[:, None]
