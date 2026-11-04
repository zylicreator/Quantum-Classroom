"""Neutral configurations and Slater-screened teaching approximations, Z=1..118.

H–U use the existing reference configurations. Beyond U is ideal filling only.
Whole-atom density is an incoherent, spherically averaged electron mixture.
"""
from dataclasses import dataclass, replace
from functools import cached_property, lru_cache
from numbers import Integral
import math

import numpy as np

from .hydrogen import HydrogenOrbital, OrbitalSampler, STATES
from .molecular import H2Plus, _count, _seed
from .experiment import Experiment

SYMBOLS = tuple('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split())
FILL_ORDER = '1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p 6s 4f 5d 6p 7s 5f 6d 7p'.split()
EXCEPTIONS = {
    24: {'3d': 5, '4s': 1}, 29: {'3d': 10, '4s': 1}, 41: {'4d': 4, '5s': 1}, 42: {'4d': 5, '5s': 1},
    44: {'4d': 7, '5s': 1}, 45: {'4d': 8, '5s': 1}, 46: {'4d': 10, '5s': 0}, 47: {'4d': 10, '5s': 1},
    57: {'4f': 0, '5d': 1}, 58: {'4f': 1, '5d': 1}, 64: {'4f': 7, '5d': 1},
    78: {'5d': 9, '6s': 1}, 79: {'5d': 10, '6s': 1}, 89: {'5f': 0, '6d': 1},
    90: {'5f': 0, '6d': 2}, 91: {'5f': 2, '6d': 1}, 92: {'5f': 3, '6d': 1},
}


def check_z(z):
    if isinstance(z, bool) or not isinstance(z, Integral) or not 1 <= z <= 118:
        raise ValueError('Atomic number must be an integer from 1 to 118.')
    return int(z)


@dataclass(frozen=True)
class Subshell:
    key: str
    electrons: int
    shielding: float = 0.
    charge: float = 1.

    @property
    def n(self):
        return int(self.key[0])

    @property
    def l(self):
        return 'spdf'.index(self.key[1])

    @property
    def order(self):
        return self.n*4 + (0 if self.l < 2 else self.l-1)


@lru_cache(maxsize=118)
def configuration(z):
    z = check_z(z)
    left, occupancy = z, {}
    for key in FILL_ORDER:
        take = min(left, 2*(2*'spdf'.index(key[1])+1))
        occupancy[key] = take
        left -= take
    occupancy.update(EXCEPTIONS.get(z, {}))
    shells = [Subshell(key, n) for key, n in occupancy.items() if n]
    shells.sort(key=lambda s: (s.n, s.l))
    result = []
    for target in shells:
        sigma = 0.
        for s in shells:
            electrons, coefficient = s.electrons, 0.
            if target.l < 2:
                if s.n == target.n and s.l < 2:
                    coefficient = .30 if target.n == 1 else .35
                    electrons -= s.key == target.key
                elif s.n == target.n-1:
                    coefficient = .85
                elif s.n < target.n-1:
                    coefficient = 1.
            elif s.key == target.key:
                coefficient, electrons = .35, electrons-1
            elif s.order < target.order:
                coefficient = 1.
            sigma += coefficient*electrons
        result.append(replace(target, shielding=sigma, charge=z-sigma))
    return tuple(result)


@dataclass(frozen=True)
class AtomicModel:
    mode: str = 'hydrogen'  # hydrogen, orbital (screened), whole (incoherent mixture)
    z: int = 1
    state: str = '1s'
    radius: float | None = None

    def __post_init__(self):
        check_z(self.z)
        if self.mode not in ('hydrogen', 'orbital', 'whole'):
            raise ValueError('Unknown atomic model mode.')
        if self.mode == 'hydrogen' and self.z != 1:
            raise ValueError('Hydrogen mode requires Z=1.')
        if self.mode != 'whole':
            if self.state not in STATES:
                raise ValueError('Unknown spatial orbital.')
            if self.mode == 'orbital' and not any(s.key == STATES[self.state].subshell for s in self.shells):
                raise ValueError('The selected subshell is not occupied.')
        if self.radius is None:
            object.__setattr__(self, 'radius', self.mean_radius)
        elif isinstance(self.radius, bool) or not math.isfinite(self.radius) or self.radius < 0:
            raise ValueError('Observation sphere radius must be finite and nonnegative.')

    @property
    def mixed(self):
        return self.mode == 'whole'

    @property
    def reference(self):
        return self.z <= 92

    @property
    def symbol(self):
        return SYMBOLS[self.z-1]

    @property
    def shells(self):
        return configuration(self.z)

    @cached_property
    def orbital(self):
        if self.mixed:
            raise ValueError('An incoherent mixture has no single wavefunction.')
        charge = 1 if self.mode == 'hydrogen' else next(s.charge for s in self.shells if s.key == STATES[self.state].subshell)
        return HydrogenOrbital(self.state, charge)

    @cached_property
    def channels(self):
        return tuple((s, HydrogenOrbital(next(key for key, spec in STATES.items() if spec.subshell == s.key), s.charge)) for s in self.shells)

    def _weighted(self, attribute):
        return sum(s.electrons/self.z*getattr(o, attribute) for s, o in self.channels) if self.mixed else getattr(self.orbital, attribute)

    @property
    def mean_radius(self):
        return self._weighted('mean_radius')

    @property
    def mean_radius_squared(self):
        return self._weighted('mean_radius_squared')

    @property
    def extent(self):
        return max(o.extent for _, o in self.channels) if self.mixed else self.orbital.extent

    @property
    def nodes(self):
        return np.empty(0) if self.mixed else self.orbital.nodes

    @property
    def sampling_key(self):
        return self.mode, self.z, self.state if not self.mixed else None

    _positions = staticmethod(H2Plus._positions)

    def in_region(self, points):
        return np.linalg.norm(self._positions(points), axis=-1) <= self.radius

    def probability(self, radius):
        return sum(s.electrons/self.z*o.probability(radius) for s, o in self.channels) if self.mixed else self.orbital.probability(radius)

    @property
    def region_probability(self):
        return self.probability(self.radius)

    def radial_density(self, radius):
        return sum(s.electrons/self.z*o.radial_density(radius) for s, o in self.channels) if self.mixed else self.orbital.radial_density(radius)

    def amplitude(self, points):
        return self.orbital.amplitude(points)  # rejects whole-atom mode

    def density(self, points):
        if not self.mixed:
            return self.orbital.density(points)
        radius = np.linalg.norm(self._positions(points), axis=-1)
        return sum(s.electrons/self.z*o.radial_amplitude(radius)**2/(4*math.pi) for s, o in self.channels)

    def metadata(self):
        return dict(system='atom', mode=self.mode, Z=self.z, symbol=self.symbol, state=None if self.mixed else self.state,
                    units='a0', radius=self.radius, region='r <= radius',
                    configuration_source='reference H-U' if self.reference else 'ideal filling; not an observed ground state',
                    approximation='nonrelativistic hydrogen' if self.mode == 'hydrogen' else 'Slater-screened hydrogenic teaching approximation; not SCF',
                    mixture='electron-count weighted; complete angular basis averaged; no common phase' if self.mixed else None,
                    subshells=[dict(key=s.key, electrons=s.electrons, shielding=s.shielding, effective_charge=s.charge) for s in self.shells])


class AtomicSampler:
    BLOCK = 4096

    def __init__(self, model=None, seed=123456789):
        self.model = model or AtomicModel()
        seeds = np.random.SeedSequence(_seed(seed)).spawn(len(self.model.shells)+1)
        self.rng = np.random.Generator(np.random.PCG64(seeds[0]))
        if self.model.mixed:
            self.streams = [OrbitalSampler(o, int(s.generate_state(1, dtype=np.uint64)[0]), spherical=True) for s, (_, o) in zip(seeds[1:], self.model.channels)]
        else:
            self.streams = [OrbitalSampler(self.model.orbital, seed)]
        self.buffer = np.empty((0, 3))
        self.labels = np.empty(0, dtype=int)
        self.last_channels = np.empty(0, dtype=int)

    def _fill(self):
        weights = np.array([s.electrons/self.model.z for s in self.model.shells])
        self.labels = self.rng.choice(len(weights), self.BLOCK, p=weights)
        self.buffer = np.empty((self.BLOCK, 3))
        for index, stream in enumerate(self.streams):
            selected = self.labels == index
            self.buffer[selected] = stream.take(int(selected.sum()))

    def take(self, count):
        count = _count(count)
        if not self.model.mixed:
            self.last_channels = np.zeros(count, dtype=int)
            return self.streams[0].take(count)
        result = np.empty((count, 3))
        labels = np.empty(count, dtype=int)
        offset = 0
        while offset < count:
            if not len(self.buffer):
                self._fill()
            size = min(count-offset, len(self.buffer))
            result[offset:offset+size] = self.buffer[:size]
            labels[offset:offset+size] = self.labels[:size]
            self.buffer, self.labels = self.buffer[size:], self.labels[size:]
            offset += size
        self.last_channels = labels
        return result


class AtomicExperiment(Experiment):
    def __init__(self, model=None, seed=123456789):
        super().__init__(model or AtomicModel(), seed)

    def set_radius(self, radius):
        self.model = replace(self.model, radius=radius)
        self._hits[:self.count] = self.model.in_region(self.points)
        self.hits = int(self._hits[:self.count].sum())

    def record(self, language='zh'):
        # Reuse the complete record/export implementation, with model metadata.
        record = self._record(self.model.metadata(), 'QuantumClassroomAtom', language)
        record['sampling']['algorithm'] = 'radial-envelope + real-harmonic rejection v1; spherical electron mixture when whole'
        record['statistics']['mean_radius'] = float(np.linalg.norm(self.points, axis=1).mean()) if self.count else None
        record['interpretation'] = 'Independent preparations, not a trajectory. Whole-atom view measures a randomly selected electron from each new atom; no common wavefunction sign. Z>=93 is ideal filling only.'
        return record
