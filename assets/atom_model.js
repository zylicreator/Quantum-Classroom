/* Teaching approximation: screened hydrogenic orbitals, not an SCF solver.
   Neutral configurations H–U follow the cited NIST reference table. Beyond U,
   Madelung filling is explicitly illustrative, not an experimental ground state.
   An atom-wide density is an incoherent, spherically averaged electron mixture. */
(function(root,factory) {
  const M=typeof module==='object'&&module.exports ? require('./electron_model.js') : root.ElectronModel;
  const model=factory(M);
  if(typeof module==='object'&&module.exports) module.exports=model; else root.AtomModel=model;
})(typeof globalThis!=='undefined' ? globalThis : this,function(M) {
  'use strict';
  const symbols='H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
  const names=symbols;
  const elements=Object.freeze(symbols.map((symbol,i)=>Object.freeze({z:i+1,symbol,name:names[i]||symbol,reference:i<92})));
  const fillOrder='1s 2s 2p 3s 3p 4s 3d 4p 5s 4d 5p 6s 4f 5d 6p 7s 5f 6d 7p'.split(' ');
  const exceptions={
    24:{'3d':5,'4s':1},29:{'3d':10,'4s':1},41:{'4d':4,'5s':1},42:{'4d':5,'5s':1},
    44:{'4d':7,'5s':1},45:{'4d':8,'5s':1},46:{'4d':10,'5s':0},47:{'4d':10,'5s':1},
    57:{'4f':0,'5d':1},58:{'4f':1,'5d':1},64:{'4f':7,'5d':1},
    78:{'5d':9,'6s':1},79:{'5d':10,'6s':1},89:{'5f':0,'6d':1},90:{'5f':0,'6d':2},91:{'5f':2,'6d':1},92:{'5f':3,'6d':1}
  };
  const familyIndex=f=>'spdf'.indexOf(f);
  const groupOrder=s=>s.n*4+(s.l<2 ? 0 : s.l-1);
  const atomCache=new Map();
  const elementLabel=a=>a.name===a.symbol ? a.symbol : a.name+' '+a.symbol;
  function configuration(z) {
    if(!Number.isInteger(z)||z<1||z>118) throw new RangeError('Atomic number must be 1–118');
    let left=z; const occupancies={};
    for(const key of fillOrder) {
      const capacity=2*(2*familyIndex(key[1])+1), electrons=Math.min(left,capacity);
      occupancies[key]=electrons; left-=electrons;
    }
    if(z<=92&&exceptions[z]) Object.assign(occupancies,exceptions[z]);
    const subshells=Object.entries(occupancies).filter(([,electrons])=>electrons>0).map(([key,electrons])=>({key,n:Number(key[0]),family:key[1],l:familyIndex(key[1]),electrons}));
    return subshells.sort((a,b)=>a.n-b.n||a.l-b.l);
  }
  function shielding(z,subshells,target) {
    let sigma=0; const contributions=[];
    for(const s of subshells) {
      let coefficient=0, electrons=s.electrons;
      if(target.l<2) {
        if(s.n===target.n&&s.l<2) { coefficient=target.n===1 ? .30 : .35; if(s.key===target.key) electrons--; }
        else if(s.n===target.n-1) coefficient=.85;
        else if(s.n<target.n-1) coefficient=1;
      } else {
        if(s.key===target.key) { coefficient=.35; electrons--; }
        else if(groupOrder(s)<groupOrder(target)) coefficient=1;
      }
      if(coefficient&&electrons>0) { sigma+=coefficient*electrons; contributions.push({key:s.key,electrons,coefficient,amount:coefficient*electrons}); }
    }
    const effectiveCharge=z-sigma;
    if(!(effectiveCharge>0)) throw new RangeError('Nonpositive effective nuclear charge');
    return {sigma,effectiveCharge,contributions};
  }
  const superscript=n=>String(n).replace(/[0-9]/g,c=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(c)]);
  function atom(z) {
    if(atomCache.has(z)) return atomCache.get(z);
    const subshells=configuration(z), element=elements[z-1];
    for(const s of subshells) Object.assign(s,shielding(z,subshells,s));
    const value={...element,subshells,configuration:subshells.map(s=>s.key+superscript(s.electrons)).join(' '),source:element.reference ? 'NIST neutral-atom reference configurations (H-U)' : 'Ideal filling illustration; not an observed ground-state configuration'};
    atomCache.set(z,value); return value;
  }
  function orbital(z,state) {
    const a=atom(z), base=M.states[state];
    if(!base) throw new RangeError('Unknown spatial orbital');
    const subshell=a.subshells.find(s=>s.n===base.n&&s.l===base.l);
    if(!subshell) throw new RangeError('The chosen subshell is not occupied');
    const charge=subshell.effectiveCharge;
    const spec={...base,label:elementLabel(a)+' · '+base.label,effectiveCharge:charge,subshell,atom:a,mixed:false,
      extent:base.extent/charge,radius:base.radius/charge,radiusMax:base.radiusMax/charge,
      meanRadius:base.meanRadius/charge,meanRadiusSquared:base.meanRadiusSquared/(charge*charge)};
    return {
      spec,nodes:M.radialInfo(state).nodes.map(r=>r/charge),
      points:(count,seed)=>M.points(state,count,seed).map(p=>({...p,x:p.x/charge,y:p.y/charge,z:p.z/charge,r:p.r/charge,l:base.l,subshell:subshell.key})),
      probability:r=>M.probability(state,r*charge),radialDensity:r=>charge*M.radialDensity(state,r*charge),
      spatialDensity:(x,y,z)=>charge**3*M.spatialDensity(state,x*charge,y*charge,z*charge)
    };
  }
  function wholeAtom(z) {
    const a=atom(z), channels=a.subshells.map(s=>({...s,weight:s.electrons/z,states:Object.values(M.states).filter(v=>v.n===s.n&&v.l===s.l)}));
    const meanRadius=channels.reduce((sum,s)=>sum+s.weight*s.states[0].meanRadius/s.effectiveCharge,0);
    const meanRadiusSquared=channels.reduce((sum,s)=>sum+s.weight*s.states[0].meanRadiusSquared/s.effectiveCharge**2,0);
    const extent=Math.max(...channels.map(s=>s.states[0].extent/s.effectiveCharge));
    const probability=r=>channels.reduce((sum,s)=>sum+s.weight*M.probability(s.states[0],r*s.effectiveCharge),0);
    const radialDensity=r=>channels.reduce((sum,s)=>sum+s.weight*s.effectiveCharge*M.radialDensity(s.states[0],r*s.effectiveCharge),0);
    return {
      spec:{label:elementLabel(a)+' · all occupied orbitals',atom:a,mixed:true,extent,radius:meanRadius,radiusMax:extent*1.2,meanRadius,meanRadiusSquared,channels},nodes:[],probability,radialDensity,
      points:(count,seed)=>{
        const random=M.rng(seed);
        return Array.from({length:count},()=>{
          let target=random(),s=channels.at(-1);
          for(const channel of channels) { target-=channel.weight; if(target<=0) { s=channel; break; } }
          // Uniformly average the complete real angular basis. The addition
          // theorem makes this exactly spherical even for an open subshell.
          const state=s.states[Math.floor(random()*s.states.length)], p=M.point(state,random), charge=s.effectiveCharge;
          return {...p,x:p.x/charge,y:p.y/charge,z:p.z/charge,r:p.r/charge,l:s.l,subshell:s.key,phase:0};
        });
      },
      spatialDensity:(x,y,z)=>{
        const r=Math.hypot(x,y,z);
        if(r>0) return radialDensity(r)/(4*Math.PI*r*r);
        return channels.reduce((sum,s)=>sum+s.weight*s.effectiveCharge**3*M.radialAmplitude(s.states[0],0)**2/(4*Math.PI),0);
      }
    };
  }
  return Object.freeze({elements,configuration,shielding,atom,orbital,wholeAtom});
});
