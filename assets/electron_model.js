/* Normalized nonrelativistic hydrogen orbitals. Distances are r/a0.
   Independent Born-density measurements, not electron trajectories. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.ElectronModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const factorial = n => { let v = 1; for (let j = 2; j <= n; j++) v *= j; return v; };
  const choose = (n, k) => factorial(n) / (factorial(k) * factorial(n-k));
  const directions = Object.freeze({
    s: [{key:'', name:'s · spherical', m:0, kind:'zero'}],
    p: [{key:'z', name:'p_z', m:0, kind:'zero'}, {key:'x', name:'p_x', m:1, kind:'cos'}, {key:'y', name:'p_y', m:1, kind:'sin'}],
    d: [{key:'z2', name:'d_z²', m:0, kind:'zero'}, {key:'xz', name:'d_xz', m:1, kind:'cos'}, {key:'yz', name:'d_yz', m:1, kind:'sin'}, {key:'x2y2', name:'d_(x²−y²)', m:2, kind:'cos'}, {key:'xy', name:'d_xy', m:2, kind:'sin'}],
    f: [{key:'z3', name:'f_z(5z²−3r²)', m:0, kind:'zero'}, {key:'xz2', name:'f_x(5z²−r²)', m:1, kind:'cos'}, {key:'yz2', name:'f_y(5z²−r²)', m:1, kind:'sin'}, {key:'zx2y2', name:'f_z(x²−y²)', m:2, kind:'cos'}, {key:'xyz', name:'f_xyz', m:2, kind:'sin'}, {key:'xx23y2', name:'f_x(x²−3y²)', m:3, kind:'cos'}, {key:'y3x2y2', name:'f_y(3x²−y²)', m:3, kind:'sin'}]
  });
  const states = {};
  for (let n = 1; n <= 7; n++) for (let l = 0; l < Math.min(n,4); l++) {
    const family = 'spdf'[l];
    for (const direction of directions[family]) {
      const id = n + family + direction.key;
      states[id] = Object.freeze({id, n, l, family, ...direction,
        label: n + direction.name, radialNodes: n-l-1, angularNodes: l,
        extent: (n<=4 ? [0,5,14,28,46][n] : 3*n*n)-l*(n>=4 ? 4 : n===3 ? 3 : 2), radius: n === 1 ? 1 : n*n,
        radiusMax: Math.max(6,3*n*n), meanRadius: (3*n*n-l*(l+1))/2,
        meanRadiusSquared: n*n*(5*n*n+1-3*l*(l+1))/2});
    }
  }
  Object.freeze(states);
  function specOf(state) {
    const spec = typeof state === 'string' ? states[state] : state;
    if (!spec || !Number.isInteger(spec.n) || spec.n < 1 || spec.n > 7 || spec.l < 0 || spec.l >= Math.min(spec.n,4)) throw new RangeError('Unknown hydrogen orbital');
    return spec;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return (((t ^ (t >>> 14)) >>> 0) + 0.5) / 4294967296;
    };
  }
  const polynomial = (a, x) => a.reduceRight((v,c) => v*x+c, 0);
  function laguerreCoefficients(k, alpha) {
    return Array.from({length:k+1}, (_,j) => (j%2 ? -1 : 1)*choose(k+alpha,k-j)/factorial(j));
  }
  function positiveRoots(coefficients) {
    const a = coefficients.slice();
    while (a.length > 1 && Math.abs(a.at(-1)) < 1e-15) a.pop();
    if (a.length < 2) return [];
    if (a.length === 2) { const r = -a[0]/a[1]; return r > 0 ? [r] : []; }
    const turning = positiveRoots(a.slice(1).map((v,i) => (i+1)*v));
    const upper = 1 + Math.max(...a.slice(0,-1).map(v => Math.abs(v/a.at(-1))));
    const boundaries = [0, ...turning.filter(v => v < upper), upper], roots = [];
    for (let j = 1; j < boundaries.length; j++) {
      let low = boundaries[j-1], high = boundaries[j];
      let fl = polynomial(a, low), fh = polynomial(a, high);
      if (Math.abs(fl) < 1e-12 && low > 0 && !roots.some(v => Math.abs(v-low)<1e-8)) roots.push(low);
      if (fl*fh >= 0) continue;
      for (let i = 0; i < 75; i++) {
        const mid = (low+high)/2, fm = polynomial(a, mid);
        if (fl*fm <= 0) high = mid;
        else { low = mid; fl = fm; }
      }
      roots.push((low+high)/2);
    }
    return roots.sort((a,b) => a-b);
  }
  const radialCache = new Map();
  function radialInfo(state) {
    const s = specOf(state), key = s.n + ':' + s.l;
    if (radialCache.has(key)) return radialCache.get(key);
    const k = s.n-s.l-1, q = 2*s.l+2, a = laguerreCoefficients(k,2*s.l+1);
    const c = factorial(k)/(2*s.n*factorial(s.n+s.l));
    const density = rho => rho <= 0 ? 0 : c*Math.exp(-rho)*Math.pow(rho,q)*Math.pow(polynomial(a,rho),2);
    const critical = positiveRoots(Array.from({length:a.length+1}, (_,j) => (q+2*j)*(a[j] || 0) - (j ? a[j-1] : 0)));
    const nodes = positiveRoots(a).map(rho => rho*s.n/2);
    const intervals = [], cumulative = [], tailStart = Math.max(40,8*s.n+16), step = .125;
    let mass = 0;
    if (k > 0) for (let low = 0; low < tailStart; low += step) {
      const high = low+step;
      const peak = Math.max(density(low),density(high), ...critical.filter(rho => rho>low && rho<high).map(density))*(1+1e-10)+1e-300;
      intervals.push({low,high,peak}); mass += peak*step; cumulative.push(mass);
    }
    // A certified exponential envelope includes the entire unbounded tail.
    const absL = a.reduce((sum,v,j) => sum+Math.abs(v)*Math.pow(tailStart,j),0);
    const tailPeak = c*Math.exp(-tailStart)*Math.pow(tailStart,q)*absL*absL*(1+1e-10);
    const tailRate = 1-(q+2*k)/tailStart;
    if (k > 0) { mass += tailPeak/tailRate; cumulative.push(mass); }
    const info = {n:s.n,l:s.l,k,q,a,c,density,nodes,critical,intervals,cumulative,mass,tailStart,tailPeak,tailRate};
    radialCache.set(key,info); return info;
  }
  function associatedLegendre(l,m,u) {
    let p = 1;
    for (let j = 1; j <= m; j++) p *= -(2*j-1)*Math.sqrt(Math.max(0,1-u*u));
    if (l === m) return p;
    let next = u*(2*m+1)*p;
    for (let j = m+2; j <= l; j++) { const value = ((2*j-1)*u*next-(j+m-1)*p)/(j-m); p = next; next = value; }
    return next;
  }
  function angularAmplitude(state,u,phi) {
    const s = specOf(state), ratio = factorial(s.l-s.m)/factorial(s.l+s.m);
    const base = Math.sqrt((2*s.l+1)/(4*Math.PI)*ratio)*associatedLegendre(s.l,s.m,u)*(s.m%2 ? -1 : 1);
    return s.m === 0 ? base : Math.SQRT2*base*(s.kind === 'cos' ? Math.cos(s.m*phi) : Math.sin(s.m*phi));
  }
  function drawRadius(info,random) {
    if (info.k === 0) { let r = 0; for (let j = 0; j < info.q+1; j++) r -= Math.log(random())*info.n/2; return r; }
    for (;;) {
      const mass = random()*info.mass;
      let low = 0, high = info.cumulative.length-1;
      while (low < high) { const mid = (low+high)>>>1; if (info.cumulative[mid] < mass) low = mid+1; else high = mid; }
      let rho, envelope;
      if (low === info.intervals.length) {
        rho = info.tailStart-Math.log(random())/info.tailRate;
        envelope = info.tailPeak*Math.exp(-info.tailRate*(rho-info.tailStart));
      } else {
        const bin = info.intervals[low]; rho = bin.low+(bin.high-bin.low)*random(); envelope = bin.peak;
      }
      if (random()*envelope <= info.density(rho)) return rho*info.n/2;
    }
  }
  function point(state,random) {
    const s = specOf(state), info = radialInfo(s), r = drawRadius(info,random);
    let u, phi;
    if (s.l === 0) u = 2*random()-1;
    else if (s.l === 1 && s.m === 0) u = Math.cbrt(2*random()-1);
    else {
      const ratio = factorial(s.l-s.m)/factorial(s.l+s.m);
      do { u = 2*random()-1; } while (random() > ratio*Math.pow(associatedLegendre(s.l,s.m,u),2));
    }
    if (s.m === 0) phi = 2*Math.PI*random();
    else do { phi = 2*Math.PI*random(); } while (random() > Math.pow(s.kind === 'cos' ? Math.cos(s.m*phi) : Math.sin(s.m*phi),2));
    const transverse = r*Math.sqrt(Math.max(0,1-u*u));
    const phase = polynomial(info.a,2*r/s.n)*angularAmplitude(s,u,phi) >= 0 ? 1 : -1;
    return {x:transverse*Math.cos(phi), y:transverse*Math.sin(phi), z:r*u, r,u,phi,phase};
  }
  function points(state,count,seed) { const random = rng(seed); return Array.from({length:count}, () => point(state,random)); }
  function radialAmplitude(state,r) {
    const s = specOf(state), info = radialInfo(s), rho = 2*r/s.n;
    return 2/(s.n*s.n)*Math.sqrt(factorial(info.k)/factorial(s.n+s.l))*Math.exp(-rho/2)*Math.pow(rho,s.l)*polynomial(info.a,rho);
  }
  function radialDensity(state,r) { return r < 0 ? 0 : r*r*Math.pow(radialAmplitude(state,r),2); }
  function spatialDensity(state,x,y,z) {
    const r = Math.hypot(x,y,z);
    return Math.pow(radialAmplitude(state,r)*angularAmplitude(state,r ? z/r : 0,Math.atan2(y,x)),2);
  }
  function integrate(f,a,b,tolerance) {
    const fa=f(a), fb=f(b), mid=(a+b)/2, fm=f(mid), whole=(b-a)*(fa+4*fm+fb)/6;
    function recurse(a,b,fa,fm,fb,whole,tol,depth) {
      const mid=(a+b)/2, fl=f((a+mid)/2), fr=f((mid+b)/2);
      const left=(mid-a)*(fa+4*fl+fm)/6, right=(b-mid)*(fm+4*fr+fb)/6, delta=left+right-whole;
      if (depth === 0 || Math.abs(delta) <= 15*tol) return left+right+delta/15;
      return recurse(a,mid,fa,fl,fm,left,tol/2,depth-1)+recurse(mid,b,fm,fr,fb,right,tol/2,depth-1);
    }
    return recurse(a,b,fa,fm,fb,whole,tolerance,18);
  }
  function probability(state,radius) {
    const s=specOf(state);
    if (!Number.isFinite(radius) || radius < 0) throw new RangeError('Invalid radius');
    const info=radialInfo(s), end=Math.min(160,2*radius/s.n);
    if (!end) return 0;
    let value=0;
    for (let low=0; low<end; low+=1) value+=integrate(info.density,low,Math.min(low+1,end),1e-12/Math.ceil(end));
    return Math.max(0,Math.min(1,value));
  }
  function series(samples,radius,count) {
    let hits=0; const values=[];
    for (let i=0; i<count; i++) { if (samples[i].r<=radius) hits++; values.push({n:i+1,hits,frequency:hits/(i+1)}); }
    return {hits,values};
  }
  function repeated(p,n,groups,seed) {
    if (!(p>0 && p<1) || !Number.isInteger(n) || n<1) throw new RangeError('Invalid binomial experiment');
    const random=rng(seed), sigma=Math.sqrt(p*(1-p)/n), result=[];
    for (let g=0; g<groups; g++) { let hits=0; for (let j=0; j<n; j++) if (random()<p) hits++; const frequency=hits/n; result.push({hits,frequency,z:(frequency-p)/sigma}); }
    return result;
  }
  return Object.freeze({states,directions,rng,point,points,radialInfo,associatedLegendre,angularAmplitude,radialAmplitude,probability,radialDensity,spatialDensity,series,repeated});
});
