// Simulation accélérée (sans dépendance) : temps pour atteindre chaque palier selon l'audience.
// Usage : node server/simulate.js [--json]
const {Colony,BUILDINGS,STAGES,mulberry}=require('./game');
const SCENARIOS=[
  {name:'5 viewers',viewers:5,bits:'modérés'},
  {name:'20 viewers (typique)',viewers:20,bits:'modérés'},
  {name:'50 viewers',viewers:50,bits:'modérés'},
  {name:'200 viewers',viewers:200,bits:'modérés'},
  {name:'20 viewers, sans Bits',viewers:20,bits:'aucun'},
  {name:'20 viewers, Bits massifs',viewers:20,bits:'massifs'},
];
// Rythme réaliste : chaque viewer actif envoie en moyenne une commande toutes les 30 s.
function run(sc,{hours=7,seed=1,cmdEverySec=30}={}){
  let T=1e12; const r=mulberry(seed*7919+sc.viewers), g=new Colony({now:()=>T,rng:r,seed});
  const users=Array.from({length:sc.viewers},(_,i)=>'v'+i), reached={}, start=T; let firstBuild=null;
  STAGES.forEach((s,i)=>{ if(i===0) reached[s.name]=0; });
  const pick=()=>{ const s=g.state(), need=s.pop*3, food=g.res.nourriture;
    if(food<need&&r()<.6) return '!chasse'; if(r()<.35) return '!pierre'; return r()<.85?'!bois':'!chasse'; };
  const want=opts=>{ const s=g.state();
    if(opts.includes('tour')&&s.towers<s.towersNeeded) return 'tour';
    if(opts.includes('ferme')&&g.count('ferme')*2*6<Math.ceil(g.pop/4)*6+1) return 'ferme';
    const pref=['hutte','carriere','ferme','tour','marche','temple'].filter(o=>opts.includes(o)); return pref[Math.floor(r()*pref.length)]||opts[0]; };
  for(let sec=0;sec<hours*3600;sec++){
    T+=1000;
    for(const u of users) if(r()<1/cmdEverySec) g.chat(u,pick());
    if(sec%180===0) g.autoVote();
    if(g.vote&&!g.vote.simVoted){ g.vote.simVoted=true; const w=want(g.vote.options); for(const u of users) if(r()<.5) g.chat(u,'!vote '+(r()<.8?w:g.vote.options[0])); }
    if(sc.bits==='modérés'){ if(sec%600===300) g.cheer('m',100); if(sec%3600===1800) g.cheer('m',500); if(sec%900===450) g.sub('s'+sec); }
    if(sc.bits==='massifs'){ if(sec%120===60) g.cheer('M',500); if(sec%300===150) g.sub('S'+sec); }
    g.tick();
    if(firstBuild===null&&g.buildings.length) firstBuild=sec;
    const st=STAGES[g.stage].name; if(reached[st]===undefined) reached[st]=sec;
  }
  return {name:sc.name,firstBuild,reached,buildings:g.buildings.length,pop:g.pop};
}
const fmt=s=>s==null?'—':s<3600?Math.round(s/60)+' min':Math.floor(s/3600)+' h '+String(Math.round(s%3600/60)).padStart(2,'0');
function table(results){
  const names=STAGES.map(s=>s.name);
  let t='| Scénario | 1er bâtiment | '+names.slice(1).join(' | ')+' |\n|'+'---|'.repeat(names.length+1)+'\n';
  for(const r of results) t+=`| ${r.name} | ${fmt(r.firstBuild)} | `+names.slice(1).map(n=>fmt(r.reached[n])).join(' | ')+' |\n';
  return t;
}
function all(opts){ return SCENARIOS.map(sc=>run(sc,opts)); }
if(require.main===module){ const res=all(); if(process.argv.includes('--json')) console.log(JSON.stringify(res,null,1)); else console.log(table(res)); }
module.exports={run,all,table,SCENARIOS};
