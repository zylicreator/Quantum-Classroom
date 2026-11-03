/* Reference Slater examples, neutral counts and independent sampling statistics. */
'use strict';
const assert=require('node:assert/strict'),M=require('./electron_model.js'),A=require('./atom_model.js');
function near(a,b,t,label) { assert.ok(Math.abs(a-b)<=t,`${label}: ${a} versus ${b}, tolerance ${t}`); }
assert.equal(A.elements.length,118); assert.equal(A.elements.at(-1).symbol,'Og');
assert.throws(()=>A.atom(0),RangeError); assert.throws(()=>A.atom(119),RangeError);
assert.throws(()=>A.orbital(1,'2pz'),RangeError);
for(const [key,charge] of Object.entries({'1s':25.7,'2s':21.85,'2p':21.85,'3s':14.75,'3p':14.75,'3d':6.25,'4s':3.75}))
  near(A.atom(26).subshells.find(s=>s.key===key).effectiveCharge,charge,1e-12,'Slater original Fe '+key);
near(A.atom(6).subshells.find(s=>s.key==='1s').effectiveCharge,5.7,1e-12,'Slater original C 1s');
near(A.atom(6).subshells.find(s=>s.key==='2p').effectiveCharge,3.25,1e-12,'Slater original C 2p');
for(const [z,expected] of [[24,{'3d':5,'4s':1}],[29,{'3d':10,'4s':1}],[46,{'4d':10,'5s':0}],[58,{'4f':1,'5d':1}],[90,{'5f':0,'6d':2}]])
  for(const [key,n] of Object.entries(expected)) assert.equal(A.atom(z).subshells.find(s=>s.key===key)?.electrons||0,n,'reference configuration '+z+' '+key);
let singleCases=0;
for(let z=1;z<=118;z++) {
  const a=A.atom(z);
  assert.equal(a.subshells.reduce((sum,s)=>sum+s.electrons,0),z,'neutral count '+z);
  assert.equal(a.reference,z<=92);
  for(const s of a.subshells) {
    assert.ok(s.electrons>0&&s.electrons<=2*(2*s.l+1));
    assert.ok(s.effectiveCharge>0&&s.effectiveCharge<=z);
    const state=Object.values(M.states).find(v=>v.n===s.n&&v.l===s.l),o=A.orbital(z,state.id),N=2500;
    assert.equal(o.nodes.length,s.n-s.l-1);
    for(const r of o.nodes) near(o.radialDensity(r),0,1e-19,'screened radial node');
    const R=o.spec.meanRadius,p=o.probability(R),variance=o.spec.meanRadiusSquared-R*R;
    let sum=0,hits=0;
    for(const point of o.points(N,80011+z*31+s.n*7+s.l)) {
      assert.ok([point.x,point.y,point.z,point.r].every(Number.isFinite));
      near(Math.hypot(point.x,point.y,point.z),point.r,1e-12,'screened 3D norm');
      sum+=point.r;if(point.r<=R)hits++;
    }
    near(sum/N,R,6.5*Math.sqrt(variance/N),'screened mean '+z+' '+s.key);
    near(hits/N,p,6.5*Math.sqrt(p*(1-p)/N),'screened sphere '+z+' '+s.key);
    singleCases++;
  }
  const o=A.wholeAtom(z),N=10000,R=o.spec.meanRadius,p=o.probability(R),variance=o.spec.meanRadiusSquared-R*R;
  near(o.spec.channels.reduce((sum,c)=>sum+c.weight,0),1,1e-12,'mixture normalized');
  let sum=0,hits=0,u2=0;const counts={};
  for(const point of o.points(N,99109+z)) {
    assert.ok([point.x,point.y,point.z,point.r].every(Number.isFinite));
    assert.equal(point.phase,0);sum+=point.r;u2+=point.u*point.u;
    if(point.r<=R)hits++;counts[point.subshell]=(counts[point.subshell]||0)+1;
  }
  near(sum/N,R,6.5*Math.sqrt(variance/N),'whole mean '+z);
  near(hits/N,p,6.5*Math.sqrt(p*(1-p)/N),'whole sphere '+z);
  near(u2/N,1/3,6.5*Math.sqrt((1/5-1/9)/N),'spherical angular density '+z);
  for(const c of o.spec.channels) near((counts[c.key]||0)/N,c.weight,6.5*Math.sqrt(c.weight*(1-c.weight)/N)+1/N,'electron weights '+z+' '+c.key);
  near(o.probability(0),0,1e-14,'CDF at zero');
  near(o.probability(o.spec.extent*20),1,2e-10,'unbounded CDF');
  assert.ok(Number.isFinite(o.spatialDensity(0,0,0)));
}
assert.ok(A.orbital(8,'2pz').spec.meanRadius<A.orbital(6,'2pz').spec.meanRadius,'C to O contraction');
assert.deepEqual(A.wholeAtom(29).points(8,42),A.wholeAtom(29).points(8,42),'mixture seed reproducibility');
const fe=A.orbital(26,'3dxz');near(fe.spatialDensity(1,.5,2),fe.spatialDensity(-1,-.5,-2),1e-16,'density inversion symmetry');
console.log(`PASS: 118 neutral configurations; original C/Fe Slater references; ${singleCases} screened subshells; nodes, moments, sphere frequencies, spherical mixture weights and reproducibility.`);
