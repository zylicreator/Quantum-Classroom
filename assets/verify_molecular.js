'use strict';
// Statistical tolerances are fixed before running; no retry-until-pass tests.
const assert = require('assert');
const { performance } = require('perf_hooks');
const model = require('./molecular_model.js');
let checks = 0;
function check(condition, description) {
  assert(condition, description); checks++;
}
function near(actual, expected, tolerance, description) {
  check(Math.abs(actual - expected) <= tolerance, `${description}: ${actual}, expected ${expected} +/- ${tolerance}`);
}
const references = [];
for (const R of [0.6, 1, 1.4, 2, 3, 4, 6, 8]) {
  const S = model.overlap(R);
  check(S > 0 && S < 1, `physical overlap at R=${R}`);
  const row = { R, overlap: S };
  for (const state of ['bonding', 'antibonding']) {
    const sign = state === 'bonding' ? 1 : -1;
    const probability = model.regionProbability(R, state);
    check(probability > 0 && probability < 1, `physical slab probability ${R}, ${state}`);
    row[state] = probability;
    for (const [x, y, z] of [[0, 0, 0], [0.2, -0.4, 0.7], [2, 1, -3], [0, 0, R / 2]]) {
      const a = model.atomicAmplitude(R, 'A', x, y, z);
      const b = model.atomicAmplitude(R, 'B', x, y, z);
      const psi = model.amplitude(R, state, x, y, z);
      near(psi, (a + sign * b) / Math.sqrt(2 * (1 + sign * S)), 5e-15, 'normalized LCAO');
      near(model.amplitude(R, state, x, y, -z), sign * psi, 3e-15, 'inversion parity');
      near(model.density(R, state, x, y, -z), psi * psi, 3e-15, 'density reflection symmetry');
      near(model.amplitude(R, state, -y, x, z), psi, 3e-15, 'axial rotation symmetry');
      if (state === 'bonding') check(psi > 0, 'bonding amplitude has one sign');
    }
    if (state === 'antibonding') {
      for (const radius of [0, 0.01, 1, 10, 100])
        near(model.amplitude(R, state, radius, 0, 0), 0, 0, 'entire central plane is a node');
      check(model.amplitude(R, state, 0, 0, -0.1) > 0 && model.amplitude(R, state, 0, 0, 0.1) < 0,
        'antibonding signs change across node');
    }
  }
  check(row.bonding > row.antibonding, 'bonding puts more probability in the central slab');
  references.push(row);
}
near(model.overlap(2), 0.5864528940253216, 2e-15, 'known overlap S(2)');
check(!model.inRegion(2, 0, 0, 0.5), 'region boundary is excluded');
check(model.inRegion(2, 1e9, -1e9, 0), 'region has no lateral cutoff');
check(!model.inRegion(2, 0, 0, -0.51), 'outside slab');
const axis = model.axisData(2, 'antibonding');
check(axis.length === 241, 'axis row count');
near(axis[120].z, 0, 0, 'central axis sample');
near(axis[120].density, 0, 0, 'central axial density node');
check(axis[120].incoherent > 0, 'incoherent mixture has no interference node');

for (const state of ['bonding', 'antibonding']) {
  const short = model.points(2, state, 15, 'classroom-seed');
  const long = model.points(2, state, 100, 'classroom-seed');
  check(JSON.stringify(short) === JSON.stringify(long.slice(0, 15)), 'seeded count changes preserve prefixes');
  const stream = model.createSampler(2, state, 'classroom-seed');
  check(JSON.stringify(stream.take(5).concat(stream.take(10))) === JSON.stringify(short), 'stream chunks preserve prefixes');
  check(JSON.stringify(model.points(2, state, 15, 7)) !== JSON.stringify(short), 'different seeds differ');
}
check(model.points(2, 'bonding', 0, 1).length === 0, 'zero samples');
for (const action of [() => model.points(2, 'bonding', -1), () => model.points(2, 'bonding', 1.2),
  () => model.density(0, 'bonding', 0, 0, 0), () => model.density(8.1, 'bonding', 0, 0, 0),
  () => model.density(2, 'wrong', 0, 0, 0), () => model.density(2, 'bonding', NaN, 0, 0),
  () => model.points(2, 'bonding', 1, Infinity), () => model.atomicAmplitude(2, 'wrong', 0, 0, 0)]) {
  assert.throws(action, RangeError); checks++;
}
const sampling = [];
for (const R of [0.6, 2, 8]) for (const state of ['bonding', 'antibonding']) {
  const count = 100000, sampler = model.createSampler(R, state, 891013);
  const start = performance.now(), points = sampler.take(count), milliseconds = performance.now() - start;
  let hits = 0, right = 0, positive = 0, distant = 0, sumX = 0, sumY = 0, sumZ = 0;
  let sumXX = 0, sumYY = 0, sumZZ = 0, sumX4 = 0, sumY4 = 0, sumZ4 = 0, maxNearestNucleus = 0;
  for (const p of points) {
    check([p.x, p.y, p.z].every(Number.isFinite), 'all sampled coordinates finite');
    check(p.inRegion === (Math.abs(p.z) < R / 4), 'sample region flag');
    check(p.phase === (state === 'bonding' || p.z < 0 ? 1 : -1), 'sample wavefunction sign');
    hits += p.inRegion ? 1 : 0; right += p.z > 0 ? 1 : 0; positive += p.phase === 1 ? 1 : 0;
    sumX += p.x; sumY += p.y; sumZ += p.z;
    sumXX += p.x * p.x; sumYY += p.y * p.y; sumZZ += p.z * p.z;
    sumX4 += p.x ** 4; sumY4 += p.y ** 4; sumZ4 += p.z ** 4;
    const nearest = Math.min(Math.hypot(p.x, p.y, p.z - R / 2), Math.hypot(p.x, p.y, p.z + R / 2));
    maxNearestNucleus = Math.max(maxNearestNucleus, nearest);
    distant += nearest > 6 ? 1 : 0;
  }
  const probability = model.regionProbability(R, state), frequency = hits / count;
  const frequencyTolerance = 6 * Math.sqrt(probability * (1 - probability) / count) + 2 / count;
  near(frequency, probability, frequencyTolerance, `100000 independent slab measurements ${R}, ${state}`);
  near(right / count, 0.5, 6 / (2 * Math.sqrt(count)), 'left/right measurement symmetry');
  if (state === 'bonding') near(positive / count, 1, 0, 'bonding sample signs');
  else near(positive / count, 0.5, 6 / (2 * Math.sqrt(count)), 'antibonding phase balance');
  for (const [sum, sum2, label] of [[sumX, sumXX, 'x'], [sumY, sumYY, 'y'], [sumZ, sumZZ, 'z']])
    near(sum / count, 0, 6 * Math.sqrt(sum2 / count / count), `sample ${label} mean`);
  // Independent analytic second moments of the same normalized LCAO density.
  // These test the sampled spatial extent, beyond one region's hit indicator.
  const sign = state === 'bonding' ? 1 : -1, S = model.overlap(R);
  const crossX2 = Math.exp(-R) * (1 + R + 2 * R * R / 5 + R ** 3 / 15);
  const crossZ2 = Math.exp(-R) * (1 + R + 9 * R * R / 20 + 7 * R ** 3 / 60 + R ** 4 / 60);
  const expectedX2 = (1 + sign * crossX2) / (1 + sign * S);
  const expectedZ2 = (1 + R * R / 4 + sign * crossZ2) / (1 + sign * S);
  for (const [sum2, sum4, expected, label] of [[sumXX, sumX4, expectedX2, 'x2'],
    [sumYY, sumY4, expectedX2, 'y2'], [sumZZ, sumZ4, expectedZ2, 'z2']]) {
    const second = sum2 / count, variance = Math.max(0, sum4 / count - second * second);
    near(second, expected, 6 * Math.sqrt(variance / count), `sample ${label} moment`);
  }
  check(distant > 0 && maxNearestNucleus > 6, 'samples reach beyond 6 a0 from both nuclei; no cloud-box truncation');
  const observedAcceptance = count / sampler.stats.proposed;
  near(observedAcceptance, sampler.stats.expectedAcceptance,
    6 * Math.sqrt(sampler.stats.expectedAcceptance * (1 - sampler.stats.expectedAcceptance) / sampler.stats.proposed),
    'rejection sampler acceptance matches analytic normalization');
  sampling.push({ R, state, count, frequency, probability, frequencyTolerance, distant, maxNearestNucleus,
    proposed: sampler.stats.proposed, observedAcceptance, expectedAcceptance: sampler.stats.expectedAcceptance,
    milliseconds: Math.round(milliseconds) });
}
const report = { status: 'PASS', checks, references, sampling, modelInfo: model.modelInfo };
if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(report));
else {
  console.log(`PASS ${checks} molecular model checks (600000 independent samples).`);
  console.table(sampling.map(({ R, state, frequency, probability, proposed, milliseconds, maxNearestNucleus }) =>
    ({ R, state, frequency, probability, proposed, milliseconds, maxNearestNucleus })));
}
