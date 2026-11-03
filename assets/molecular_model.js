/* H2+ in a frozen, minimal hydrogen 1s LCAO basis. Atomic length unit: a0.
 * This is a teaching approximation at a user-selected nuclear separation;
 * it is not an exact two-centre solution or a prediction of bond energy/length.
 * Reference: University of Texas, Quantum Mechanics, section 9.3, eqs 9.98–9.107
 * https://farside.ph.utexas.edu/teaching/qm/Quantum/node100.html
 * Numerical functions and samples cover all space, without a drawing-box cutoff.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MolecularModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var INV_SQRT_PI = 1 / Math.sqrt(Math.PI);
  var probabilityCache = new Map();
  var MIN_R = 0.6, MAX_R = 8;

  function checkR(R) {
    if (!Number.isFinite(R) || R < MIN_R || R > MAX_R)
      throw new RangeError('Nuclear separation R must be between 0.6 and 8 a0.');
    return R;
  }
  function stateSign(state) {
    if (state === 'bonding') return 1;
    if (state === 'antibonding') return -1;
    throw new RangeError('State must be bonding or antibonding.');
  }
  function checkCount(count) {
    if (!Number.isSafeInteger(count) || count < 0)
      throw new RangeError('Sample count must be a nonnegative safe integer.');
  }
  function checkCoordinates(x, y, z) {
    if (![x, y, z].every(Number.isFinite))
      throw new RangeError('Position coordinates must be finite.');
  }
  function overlap(R) {
    checkR(R);
    return Math.exp(-R) * (1 + R + R * R / 3);
  }
  function atomicAmplitude(R, side, x, y, z) {
    checkR(R); checkCoordinates(x, y, z);
    if (side !== 'A' && side !== 'B') throw new RangeError('Side must be A or B.');
    return INV_SQRT_PI * Math.exp(-Math.hypot(x, y, z + (side === 'A' ? R / 2 : -R / 2)));
  }
  // Stable difference of two exponentials, including very near the nodal plane.
  function combined(rA, rB, sign, normalizer) {
    var delta = Math.abs(rA - rB), small = Math.min(rA, rB);
    var factor = sign === 1 ? 1 + Math.exp(-delta) : -Math.expm1(-delta);
    if (sign === -1 && rA > rB) factor = -factor;
    return INV_SQRT_PI * Math.exp(-small) * factor * normalizer;
  }
  function amplitude(R, state, x, y, z) {
    checkR(R); checkCoordinates(x, y, z);
    var sign = stateSign(state), half = R / 2;
    return combined(Math.hypot(x, y, z + half), Math.hypot(x, y, z - half),
      sign, 1 / Math.sqrt(2 * (1 + sign * overlap(R))));
  }
  function density(R, state, x, y, z) {
    var psi = amplitude(R, state, x, y, z);
    return psi * psi;
  }
  // A central slab, with no transverse boundary. A strict boundary has measure 0.
  function inRegion(R, x, y, z) {
    checkR(R); checkCoordinates(x, y, z);
    return Math.abs(z) < R / 4;
  }

  function makeRandom(seed) {
    if (seed === undefined) seed = 123456789;
    var word;
    if (typeof seed === 'string') {
      word = 2166136261;
      for (var i = 0; i < seed.length; i++) {
        word ^= seed.charCodeAt(i);
        word = Math.imul(word, 16777619) >>> 0;
      }
    } else if (Number.isFinite(seed)) word = Math.trunc(seed) >>> 0;
    else throw new RangeError('Seed must be a finite number or a string.');
    // Mulberry32; the half-bin offset makes outputs strictly between 0 and 1.
    return function () {
      word = (word + 0x6D2B79F5) | 0;
      var t = Math.imul(word ^ (word >>> 15), 1 | word);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return (((t ^ (t >>> 14)) >>> 0) + 0.5) / 4294967296;
    };
  }
  function createSampler(R, state, seed) {
    checkR(R);
    var sign = stateSign(state), random = makeRandom(seed), half = R / 2;
    var stats = { proposed: 0, accepted: 0, expectedAcceptance: (1 + sign * overlap(R)) / 2 };
    function next() {
      for (;;) {
        stats.proposed++;
        // q = (phi_A^2 + phi_B^2)/2. A 1s radius is Gamma(shape=3, rate=2).
        // No finite-radius/truncated rejection box is used.
        var radius = -0.5 * Math.log(random() * random() * random());
        var cosine = 2 * random() - 1;
        var z = radius * cosine + (random() < 0.5 ? -half : half);
        var transverse2 = Math.max(0, radius * radius * (1 - cosine * cosine));
        var rA = Math.sqrt(transverse2 + (z + half) * (z + half));
        var rB = Math.sqrt(transverse2 + (z - half) * (z - half));
        var delta = Math.abs(rA - rB), t = Math.exp(-delta);
        var numerator = sign === 1 ? 1 + t : -Math.expm1(-delta);
        // f/q <= 2/(1 +/- S); this gives acceptance (1 +/- S)/2 exactly.
        var acceptance = numerator * numerator / (2 * (1 + t * t));
        if (random() >= acceptance) continue;
        // The azimuth is independent of the rejection test, so draw it only now.
        var angle = 2 * Math.PI * random(), transverse = Math.sqrt(transverse2);
        stats.accepted++;
        return {
          x: transverse * Math.cos(angle), y: transverse * Math.sin(angle), z: z,
          phase: sign === 1 || rA <= rB ? 1 : -1,
          inRegion: Math.abs(z) < R / 4
        };
      }
    }
    function take(count) {
      checkCount(count);
      var result = new Array(count);
      for (var i = 0; i < count; i++) result[i] = next();
      return result;
    }
    return { next: next, take: take, stats: stats };
  }
  function points(R, state, count, seed) {
    checkCount(count);
    return createSampler(R, state, seed).take(count);
  }

  function adaptiveSimpson(f, left, right, tolerance) {
    var middle = (left + right) / 2, fl = f(left), fm = f(middle), fr = f(right);
    var initial = (right - left) * (fl + 4 * fm + fr) / 6;
    function recurse(a, b, fa, fc, fb, whole, tol, depth) {
      var c = (a + b) / 2, d = (a + c) / 2, e = (c + b) / 2;
      var fd = f(d), fe = f(e);
      var first = (c - a) * (fa + 4 * fd + fc) / 6;
      var last = (b - c) * (fc + 4 * fe + fb) / 6;
      var error = first + last - whole;
      if (depth === 0 || Math.abs(error) <= 15 * tol)
        return first + last + error / 15;
      return recurse(a, c, fa, fd, fc, first, tol / 2, depth - 1) +
        recurse(c, b, fc, fe, fb, last, tol / 2, depth - 1);
    }
    return recurse(left, right, fl, fm, fr, initial, tolerance, 24);
  }
  function regionComponents(R) {
    checkR(R);
    if (probabilityCache.has(R)) return probabilityCache.get(R);
    var a = R / 4, b = 3 * R / 4;
    // H = integral_slab phi_A^2 = integral_slab phi_B^2.
    // The normalized 1s z-marginal is (|z| + 1/2) exp(-2|z|).
    var atomic = (a / 2 + 0.5) * Math.exp(-2 * a) - (b / 2 + 0.5) * Math.exp(-2 * b);
    // Prolate spheroidal coordinates: mu=(rA+rB)/R, nu=(rA-rB)/R.
    // |z|<R/4 means |nu|<1/(2mu), with mu>=1. Thus the cross-term
    // C = R^3/4 integral_1^infty exp(-R mu) [mu - 1/(12mu^3)] dmu.
    // u=R(mu-1); integrate only the rational residual; exp(-40) tail is
    // < 5e-18 and its final contribution < 1e-18 throughout 0.6<=R<=8.
    var residual = adaptiveSimpson(function (u) {
      return Math.exp(-u) / Math.pow(1 + u / R, 3);
    }, 0, 40, 2e-13);
    var cross = R * R * Math.exp(-R) / 4 * (1 + 1 / R - residual / 12);
    var result = Object.freeze({ atomic: atomic, cross: cross, overlap: overlap(R) });
    probabilityCache.set(R, result);
    return result;
  }
  function regionProbability(R, state) {
    var sign = stateSign(state), parts = regionComponents(R);
    return (parts.atomic + sign * parts.cross) / (1 + sign * parts.overlap);
  }
  function axisData(R, state, count, extent) {
    checkR(R); stateSign(state);
    if (count === undefined) count = 241;
    if (!Number.isSafeInteger(count) || count < 2) throw new RangeError('Axis count must be an integer >= 2.');
    if (extent === undefined) extent = Math.max(4, R / 2 + 3);
    if (!Number.isFinite(extent) || extent <= 0) throw new RangeError('Axis extent must be positive.');
    var rows = new Array(count);
    for (var i = 0; i < count; i++) {
      var z = (2 * i / (count - 1) - 1) * extent;
      var a = atomicAmplitude(R, 'A', 0, 0, z), b = atomicAmplitude(R, 'B', 0, 0, z);
      var psi = amplitude(R, state, 0, 0, z);
      rows[i] = { z: z, a: a, b: b, psi: psi, density: psi * psi, incoherent: (a * a + b * b) / 2 };
    }
    return rows;
  }
  var modelInfo = Object.freeze({
    system: 'H2+', basis: 'normalized hydrogen 1s, exponent 1/a0', units: 'a0',
    minimumSeparation: MIN_R, maximumSeparation: MAX_R,
    nuclei: 'A: z=-R/2; B: z=+R/2', observationRegion: '|z|<R/4, all x and y',
    sampling: 'independent unbounded mixture-1s rejection sampling',
    probabilityAbsoluteTolerance: 1e-10,
    limitation: 'Frozen nuclei and minimal LCAO teaching approximation; no energy or equilibrium bond length prediction.',
    reference: 'https://farside.ph.utexas.edu/teaching/qm/Quantum/node100.html'
  });
  return Object.freeze({ overlap: overlap, amplitude: amplitude, density: density,
    atomicAmplitude: atomicAmplitude, points: points, createSampler: createSampler,
    regionProbability: regionProbability, regionComponents: regionComponents,
    inRegion: inRegion, axisData: axisData, modelInfo: modelInfo });
});
