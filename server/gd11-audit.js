// Reproducible GD11 acceptance matrix: identical simulation policy, seeds 1–5.
// node server/gd11-audit.js [--json] > audit.json
const {seeds,SCENARIOS}=require('./simulate');
const cases=['courte','normale','longue'].flatMap(len=>SCENARIOS.map(sc=>[sc.name,len]));
const quantiles=values=>{const a=values.filter(x=>x!=null).sort((a,b)=>a-b);return a.length?[a[0],a[a.length>>1],a[a.length-1]]:null;};
const fmt=t=>t==null?'—':`${Math.floor(t/3600)}h${String(Math.floor(t%3600/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;
function table(rows){
  let out='| Scénario | Mode | Fin min/méd/max | Raids % min/méd/max | PV min min/méd/max | Vacillant min/méd/max | Creux progression min/méd/max (min) | Creux tension min/méd/max (min) | Défaites | Chutes |\n|---|---|---|---|---|---|---|---|---|---|\n';
  for(const r of rows){const q=f=>quantiles(r.runs.map(f)),mins=a=>a.map(v=>(v/60).toFixed(1)).join('/');
    out+=`| ${r.name} | ${r.len} | ${r.end?r.end.map(fmt).join('/'):'—'} | ${r.rate.map(v=>(100*v).toFixed(1)).join('/')} | ${r.minHp.join('/')} | ${r.vacillant.join('/')} | ${mins(q(x=>x.finaleGap))} | ${mins(q(x=>x.eventGap))} | ${r.over}/5 | ${r.chutes} |\n`;
  }return out;
}
if(require.main===module){const rows=seeds(5,cases);console.log(process.argv.includes('--json')?JSON.stringify({baseline:'e679887',seeds:[1,2,3,4,5],rows},null,2):table(rows));}
module.exports={table,quantiles,cases};
