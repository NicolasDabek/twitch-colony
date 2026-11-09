// GD12 : matrice d'acceptation reproductible (même politique de simulation, graines 1–10 par défaut).
// node server/gd12-audit.js [--json] [--seeds=10]  — scénarios GD11 + « préparé » et « passif au climax », trois modes.
const {run,SCENARIOS,CLIMAX_SCENARIOS=[]}=require('./simulate');
const ALL=[...SCENARIOS,...CLIMAX_SCENARIOS], MODES=['courte','normale','longue'];
const q=values=>{ const a=values.filter(x=>x!=null).sort((x,y)=>x-y); return a.length?[a[0],a[a.length>>1],a[a.length-1]]:null; };
const hm=t=>t==null?'—':`${Math.floor(t/3600)}h${String(Math.floor(t%3600/60)).padStart(2,'0')}`, mn=t=>t==null?'—':(t/60).toFixed(1);
function audit(n=10,modes=MODES,scenarios=ALL){
  return modes.flatMap(len=>scenarios.map(sc=>{ const runs=Array.from({length:n},(_,i)=>run(sc,{seed:i+1,gameLength:len}));
    const cl=runs.map(r=>r.climax||{});
    return {name:sc.name,len,n,neglect:!!sc.neglect,end:q(runs.map(r=>r.end)),over:runs.filter(r=>r.over!=null).length,minHp:q(runs.map(r=>r.minHp)),minHps:runs.map(r=>r.minHp),
      rate:q(runs.map(r=>r.raids?r.repelled/r.raids:1)),vacillant:q(runs.map(r=>r.vacillant)),vacAll:runs.every(r=>r.vacillant>=1),chutes:runs.reduce((a,r)=>a+r.chutes,0),
      chutesOk:runs.every(r=>r.chutes<=r.destructions3h),climaxDmg:q(cl.map(c=>c.dmg)),maxDmg:q(cl.map(c=>c.maxDmg)),climaxAt:q(cl.map(c=>c.at)),
      climaxToEnd:q(runs.map(r=>r.climaxToEnd)),breachWon:runs.filter(r=>r.breach==='réussi').length,gap:q(runs.map(r=>r.finaleGap)),eventGap:q(runs.map(r=>r.eventGap)),
      readyGap:q(runs.map(r=>r.readyGap)),ceremony:q(runs.map(r=>r.ceremonySteps)),runs}; })); }
const J=a=>a?a.join(' / '):'—';
function table(rows){
  let t='| Scénario | Mode | Fin min/méd/max | Raids % | PV min | Vacillant | Climax : dégâts réels | À défense max | Climax → fin (min) | Brèche tenue | Creux progression (min) | Attente prête → accès : creux (min) | Chutes | Défaites |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  for(const r of rows) t+=`| ${r.name} | ${r.len} | ${r.end?r.end.map(hm).join(' / '):'—'} | ${r.rate.map(v=>(100*v).toFixed(1)).join(' / ')} | ${J(r.minHp)} | ${J(r.vacillant)} | ${J(r.climaxDmg)} | ${J(r.maxDmg)} | ${r.climaxToEnd?r.climaxToEnd.map(mn).join(' / '):'—'} | ${r.breachWon}/${r.n} | ${r.gap.map(mn).join(' / ')} | ${r.readyGap?r.readyGap.map(mn).join(' / '):'—'} | ${r.chutes} | ${r.over}/${r.n} |\n`;
  return t; }
if(require.main===module){ const n=+((process.argv.find(a=>a.startsWith('--seeds='))||'').split('=')[1]||10), rows=audit(n);
  if(process.argv.includes('--json')) console.log(JSON.stringify({seeds:Array.from({length:n},(_,i)=>i+1),rows:rows.map(({runs,...r})=>r)},null,1)); else console.log(table(rows)); }
module.exports={audit,table,q,ALL,MODES};
