"""Independent binomial region counts: LLN/CLT demonstration, NumPy only."""
from dataclasses import dataclass
from numbers import Integral
import math
import numpy as np
from .molecular import _seed


@dataclass(frozen=True)
class GroupResult:
    probability: float
    size: int
    seed: int
    hits: np.ndarray

    @property
    def frequencies(self):
        return self.hits / self.size

    @property
    def standard_error(self):
        return math.sqrt(self.probability*(1-self.probability)/self.size)

    @property
    def standardized(self):
        return (self.frequencies-self.probability)/self.standard_error if self.standard_error > 0 else None

    @property
    def normal_caution(self):
        # A conservative teaching heuristic, not an error bound or theorem threshold.
        return min(self.size*self.probability, self.size*(1-self.probability)) < 10

    def record(self):
        return dict(probability=self.probability, size=self.size, seed=self.seed, hits=self.hits.tolist())


def repeat_groups(probability, size=100, groups=1000, seed=2026101104):
    if isinstance(probability, bool) or not math.isfinite(probability) or not 0 <= probability <= 1:
        raise ValueError('Probability must be finite and between 0 and 1.')
    for value, name, limit in [(size, 'Group size', 10000), (groups, 'Groups', 10000)]:
        if isinstance(value, bool) or not isinstance(value, Integral) or not 1 <= value <= limit:
            raise ValueError(f'{name} must be an integer from 1 to {limit}.')
    if isinstance(seed, bool) or not isinstance(seed, Integral) or not 0 <= seed <= 2147483647:
        raise ValueError('Seed must be an integer from 0 to 2147483647.')
    hits = np.random.Generator(np.random.PCG64(_seed(seed))).binomial(size, probability, groups)
    hits.flags.writeable = False
    return GroupResult(float(probability), int(size), int(seed), hits)
