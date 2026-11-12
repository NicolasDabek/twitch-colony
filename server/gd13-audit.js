// GD13 : climax indexé sur l'audience, palier « Brèche scellée », moment du climax variable, petite audience.
// node server/gd13-audit.js [--json] [--seeds=20] [--workers=N]  — typique / préparé / passif au climax, 5–20–50–200 viewers, trois modes.
// Les parties sont indépendantes : elles tournent en parallèle (worker_threads) puis sont agrégées dans l'ordre des graines.
const {Worker,isMainThread,parentPort,workerData}=require('worker_threads');
const MODES=['courte','normale','longue'];
const q=a=>{ const b=a.filter(x=>x!=null).sort((x,y)=>x-y); return b.length?[b[0],b[b.length>>1],b[b.length-1]]:null; };
function one({len,i,seed}){ const {run,GD13_SCENARIOS}=require('./simulate'), sc=GD13_SCENARIOS[i], r=run(sc,{seed,gameLength:len});
  return {len,i,seed,minHp:r.minHp,breach:r.breach,sealed:r.sealed,chutes:r.chutes,chutesOk:r.chutes<=r.destructions3h,over:r.over,c2e:r.climaxToEnd,end:r.end,rate:r.raids?r.repelled/r.raids:1}; }
if(!isMainThread){ parentPort.postMessage(workerData.jobs.map(one)); return; }
function jobsFor(n){ const {GD13_SCENARIOS}=require('./simulate'); const jobs=[]; for(const len of MODES) GD13_SCENARIOS.forEach((sc,i)=>{ for(let s=1;s<=n;s++) jobs.push({len,i,seed:s,w:sc.viewers}); }); return jobs; }
function runAll(n=20,workers=require('os').cpus().length){
  const jobs=jobsFor(n); if(workers<=1) return Promise.resolve(jobs.map(one));
  jobs.sort((a,b)=>b.w-a.w); const parts=Array.from({length:workers},()=>[]); jobs.forEach((j,k)=>parts[k%workers].push(j));
  return Promise.all(parts.filter(p=>p.length).map(p=>new Promise((ok,ko)=>{ const w=new Worker(__filename,{workerData:{jobs:p}}); w.once('message',ok); w.once('error',ko); }))).then(r=>r.flat()); }
function summarize(results,n){ const {GD13_SCENARIOS,GD13_AUDIENCES}=require('./simulate'); const rows=[];
  for(const len of MODES) for(const v of GD13_AUDIENCES){ const pick=kind=>{ const i=GD13_SCENARIOS.findIndex(s=>s.viewers===v&&s.kind===kind); return results.filter(r=>r.len===len&&r.i===i).sort((a,b)=>a.seed-b.seed); };
    const T=pick('typique'),P=pick('préparé'),Z=pick('passif'), gaps=P.map((r,k)=>r.minHp-Z[k].minHp), all=[...T,...P,...Z], c2e=all.map(r=>r.c2e).filter(x=>x!=null);
    const cnt=(a,f)=>a.filter(f).length;
    rows.push({len,viewers:v,n,typ:q(T.map(r=>r.minHp)),prep:q(P.map(r=>r.minHp)),pass:q(Z.map(r=>r.minHp)),gap:q(gaps),gapMin:Math.min(...gaps),
      breach:{typ:cnt(T,r=>r.breach==='réussi'),prep:cnt(P,r=>r.breach==='réussi'),pass:cnt(Z,r=>r.breach==='réussi')},
      sealed:{typ:cnt(T,r=>r.sealed),prep:cnt(P,r=>r.sealed),pass:cnt(Z,r=>r.sealed)},
      chutes:all.reduce((a,r)=>a+r.chutes,0),chutesOk:all.every(r=>r.chutesOk),over:cnt(all,r=>r.over!=null),
      c2e:q(c2e),c2eRange:c2e.length?Math.max(...c2e)-Math.min(...c2e):0,c2eTyp:q(T.map(r=>r.c2e)),end:q(all.map(r=>r.end)),rate:q(all.map(r=>r.rate))}); }
  return rows; }
async function audit(n=20,workers){ return summarize(await runAll(n,workers),n); }
const mn=t=>t==null?'—':(t/60).toFixed(1), hm=t=>t==null?'—':`${Math.floor(t/3600)}h${String(Math.floor(t%3600/60)).padStart(2,'0')}`, J=a=>a?a.join(' / '):'—';
function table(rows){ let t='| Mode | Viewers | PV min typique | PV min préparé | PV min passif | Écart préparé − passif (par graine) | Brèche tenue typ / prép / passif | Brèche scellée typ / prép / passif | Climax → fin (min) | Plage (min) | Fins | Raids % | Chutes |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  for(const r of rows) t+=`| ${r.len} | ${r.viewers} | ${J(r.typ)} | ${J(r.prep)} | ${J(r.pass)} | ${J(r.gap)} | ${r.breach.typ} / ${r.breach.prep} / ${r.breach.pass} (sur ${r.n}) | ${r.sealed.typ} / ${r.sealed.prep} / ${r.sealed.pass} | ${r.c2e?r.c2e.map(mn).join(' / '):'—'} | ${mn(r.c2eRange)} | ${r.end?r.end.map(hm).join(' / '):'—'} | ${r.rate.map(v=>(100*v).toFixed(1)).join(' / ')} | ${r.chutes} |\n`;
  return t; }
if(require.main===module){ const arg=k=>(process.argv.find(a=>a.startsWith(`--${k}=`))||'').split('=')[1]; const n=+(arg('seeds')||20), w=arg('workers')?+arg('workers'):undefined;
  audit(n,w).then(rows=>console.log(process.argv.includes('--json')?JSON.stringify({seeds:n,rows},null,1):table(rows))).catch(e=>{ console.error(e); process.exit(1); }); }
module.exports={audit,table,summarize,runAll,MODES};
