"""Optional independent SciPy checks; the demo itself needs no Python libraries."""
from pathlib import Path
import json
import math
import subprocess
import numpy as np
from scipy.integrate import quad
from scipy.special import eval_genlaguerre, lpmv

HERE = Path(__file__).resolve().parent
JS = r"""
const M=require('./electron_model.js');
const fixture=Object.values(M.states).map(s=>{
  const N=50000, samples=M.points(s,N,51731+s.n*11+s.l*17+s.m);
  const sums=Array(6).fill(0);
  for(const p of samples) for(let j=0;j<3;j++) {
    const u=p[['x','y','z'][j]]/p.r;
    sums[j]+=u*u; sums[j+3]+=u**4;
  }
  return {s, nodes:M.radialInfo(s).nodes,
    r:[0,.01,.5,1,2,4,8,16,32,64].map(r=>({r,R:M.radialAmplitude(s,r),f:M.radialDensity(s,r),p:M.probability(s,r)})),
    a:[-.9,-.5,-.1,0,.2,.7,.95].flatMap(u=>[.1,.7,1.3,2.1,4.7].map(phi=>({u,phi,Y:M.angularAmplitude(s,u,phi)}))),
    average:sums.map(v=>v/N),N};
});
console.log(JSON.stringify(fixture));
"""
fixture = json.loads(subprocess.check_output(['node', '-e', JS], cwd=HERE, text=True, encoding='utf-8'))

def radial(s, r):
    n, l = s['n'], s['l']
    rho, k = 2*r/n, n-l-1
    return (2/n**2 * math.sqrt(math.factorial(k)/math.factorial(n+l))
            * np.exp(-rho/2) * np.power(rho,l) * eval_genlaguerre(k,2*l+1,rho))

def angular(s, u, phi):
    l, m = s['l'], s['m']
    y = math.sqrt((2*l+1)/(4*math.pi)*math.factorial(l-m)/math.factorial(l+m))*lpmv(m,l,u)*(-1)**m
    if m:
        y = y * math.sqrt(2)*(np.cos(m*phi) if s['kind']=='cos' else np.sin(m*phi))
    return y

def near(a,b,tol,label):
    assert abs(a-b)<=tol, f'{label}: {a} versus {b}, tolerance {tol}'

u, weights = np.polynomial.legendre.leggauss(40)
phi = np.arange(128)*2*math.pi/128
uu, pp = u[:,None], phi[None,:]
xx, yy, zz = np.sqrt(1-uu**2)*np.cos(pp), np.sqrt(1-uu**2)*np.sin(pp), np.broadcast_to(uu,(40,128))
measure = weights[:,None]*2*math.pi/128
harmonics = {}
for f in fixture:
    s, label = f['s'], f['s']['id']
    Y = np.broadcast_to(angular(s,uu,pp),(40,128))
    near(float(np.sum(Y*Y*measure)),1,1e-13,label+' angular norm')
    harmonics[(s['l'],s['m'],s['kind'])] = Y
    for j,axis in enumerate([xx,yy,zz]):
        for power,index in [(2,j),(4,j+3)]:
            expected=float(np.sum(axis**power*Y**2*measure))
            variance=float(np.sum(axis**(2*power)*Y**2*measure))-expected**2
            near(f['average'][index],expected,6.5*math.sqrt(variance/f['N']),label+f' angular moment {j},{power}')
    for row in f['a']:
        near(row['Y'],float(angular(s,row['u'],row['phi'])),2e-14,label+' angular amplitude')
    for row in f['r']:
        r=row['r']; ref=float(radial(s,r))
        near(row['R'],ref,2e-14,label+' radial amplitude')
        near(row['f'],r*r*ref*ref,2e-14,label+' radial density')
        prob=quad(lambda t:t*t*float(radial(s,t))**2,0,r,epsabs=2e-13,epsrel=2e-13)[0]
        near(row['p'],prob,3e-12,label+' sphere probability')
    assert len(f['nodes'])==s['n']-s['l']-1
    for r in f['nodes']:
        near(float(radial(s,r)),0,2e-15,label+' radial node')

for (l,m,kind),Y in harmonics.items():
    for (other_l,other_m,other_kind),Z in harmonics.items():
        expected=1 if (l,m,kind)==(other_l,other_m,other_kind) else 0
        near(float(np.sum(Y*Z*measure)),expected,2e-13,'real harmonic orthogonality')
print(f'PASS: independent SciPy Laguerre/Legendre amplitudes, sphere integrals, nodes, all 16 real angular functions and {len(fixture)} sampled angular distributions.')
