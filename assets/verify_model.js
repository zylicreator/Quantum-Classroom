/* Normalization, exact moments, nodes, certified sampling envelope and CLT. */
'use strict';
const assert=require('node:assert/strict'), M=require('./electron_model.js');
function near(a,b,tol,label) { assert.ok(Math.abs(a-b)<=tol,`${label}: ${a} vs ${b}, tolerance ${tol}`); }
function integral(f,end,steps=24000) {
  steps=Math.max(steps,2*Math.ceil(end/.004));
  const h=end/steps; let sum=f(0)+f(end);
  for(let i=1;i<steps;i++) sum+=(i%2?4:2)*f(i*h);
  return sum*h/3;
}
assert.equal(Object.values(M.states).filter(s=>s.n<=4).length,30);
for(let n=1;n<=4;n++) assert.equal(Object.values(M.states).filter(s=>s.n===n).length,n*n);
near(M.probability('1s',1),1-5*Math.exp(-2),2e-12,'1s sphere probability');
near(M.probability('2pz',4),1-Math.exp(-4)*(1+4+8+64/6+256/24),2e-12,'2p sphere probability');
for(let n=1;n<=4;n++) for(let l=0;l<n;l++) {
  const s=Object.values(M.states).find(s=>s.n===n&&s.l===l), info=M.radialInfo(s);
  near(integral(r=>M.radialDensity(s,r),180),1,2e-9,s.id+' normalization');
  near(integral(r=>r*M.radialDensity(s,r),180),s.meanRadius,2e-8,s.id+' E[r]');
  near(integral(r=>r*r*M.radialDensity(s,r),180),s.meanRadiusSquared,2e-7,s.id+' E[r²]');
  assert.equal(info.nodes.length,s.radialNodes,s.id+' node count');
  assert.equal(info.critical.length,info.k+1,s.id+' radial mode count');
  for(const r of info.nodes) near(M.radialDensity(s,r),0,1e-22,s.id+' node density');
  let previous=0;
  for(const r of [0,.01,.5,1,2,4,8,16,32,64,120]) {
    const p=M.probability(s,r);
    assert.ok(p>=previous-1e-13&&p>=0&&p<=1,s.id+' monotone CDF');
    near(p,integral(x=>M.radialDensity(s,x),r,12000),3e-10,s.id+' CDF quadrature');
    previous=p;
  }
  // Check the proposal bound throughout every interval and the infinite-tail envelope.
  for(const b of info.intervals) for(let j=0;j<=20;j++)
    assert.ok(info.density(b.low+(b.high-b.low)*j/20)<=b.peak*(1+1e-12),s.id+' rejection envelope');
  for(let rho=info.tailStart;rho<=300;rho+=.5)
    assert.ok(info.density(rho)<=info.tailPeak*Math.exp(-info.tailRate*(rho-info.tailStart))*(1+1e-12),s.id+' tail envelope');
}
for(const s of Object.values(M.states)) {
  let norm=0; const steps=4000, h=2/steps, phis=32;
  for(let j=0;j<=steps;j++) {
    const u=-1+j*h; let angular=0;
    for(let k=0;k<phis;k++) angular+=M.angularAmplitude(s,u,2*Math.PI*k/phis)**2*2*Math.PI/phis;
    norm+=(j===0||j===steps?1:j%2?4:2)*angular;
  }
  near(norm*h/3,1,2e-11,s.id+' real angular normalization');
  const N=30000, samples=M.points(s,N,20261006+s.n*31+s.l*13+s.m);
  let sum=0,r2=0,hits=0;
  for(const p of samples) {
    assert.ok(Object.values(p).every(Number.isFinite));
    near(Math.hypot(p.x,p.y,p.z),p.r,4e-13,s.id+' 3D norm');
    assert.ok(p.phase===1||p.phase===-1);
    sum+=p.r; r2+=p.r*p.r; if(p.r<=s.radius) hits++;
  }
  const variance=s.meanRadiusSquared-s.meanRadius**2, p=M.probability(s,s.radius);
  near(sum/N,s.meanRadius,6*Math.sqrt(variance/N),s.id+' empirical mean radius');
  near(hits/N,p,6*Math.sqrt(p*(1-p)/N),s.id+' empirical sphere probability');
}
near(M.spatialDensity('1s',1,0,0),Math.exp(-2)/Math.PI,1e-15,'1s point density');
near(M.spatialDensity('2pz',0,0,1),Math.exp(-1)/(32*Math.PI),1e-15,'2pz point density');
near(M.spatialDensity('2pz',1,1,0),0,1e-20,'p nodal plane');
near(M.spatialDensity('3dxy',0,1,1),0,1e-20,'d nodal plane');
near(M.spatialDensity('4fxyz',1,1,0),0,1e-20,'f nodal plane');
assert.deepEqual(M.points('4s',8,42),M.points('4s',8,42),'seed reproducibility');
assert.throws(()=>M.probability('4s',-1),RangeError);
const groups=M.repeated(M.probability('1s',1),100,12000,7319);
const mean=groups.reduce((t,p)=>t+p.z,0)/groups.length, second=groups.reduce((t,p)=>t+p.z*p.z,0)/groups.length;
near(mean,0,.05,'CLT standardized mean'); near(second-mean*mean,1,.06,'CLT standardized variance');
console.log('PASS: 78 real angular basis functions; first four hydrogen shells retain 30 orbitals; 10 radial regression distributions; normalized densities, moments, nodes, CDFs, unbounded sampling and CLT.');
