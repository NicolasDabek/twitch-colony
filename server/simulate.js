// Simulation accélérée (sans dépendance) : temps pour atteindre chaque palier selon l'audience.
// Usage : node server/simulate.js [--json]
const {Colony,BUILDINGS,STAGES,mulberry,WONDER}=require('./game');
const SCENARIOS=[
  {name:'5 viewers',viewers:5,bits:'modérés'},
  {name:'20 viewers (typique)',viewers:20,bits:'modérés'},
  {name:'50 viewers',viewers:50,bits:'modérés'},
  {name:'200 viewers',viewers:200,bits:'modérés'},
  {name:'20 viewers, sans Bits',viewers:20,bits:'aucun'},
  {name:'20 viewers, Bits massifs',viewers:20,bits:'massifs'},
  {name:'20 viewers, Foyer négligé',viewers:20,bits:'modérés',neglect:true},
];
// Rythme réaliste : chaque viewer actif envoie en moyenne une commande toutes les 30 s.
function run(sc,{hours=10,seed=1,cmdEverySec=30}={}){
  let T=1e12; const r=mulberry(seed*7919+sc.viewers), g=new Colony({now:()=>T,rng:r,seed});
  const users=Array.from({length:sc.viewers},(_,i)=>'v'+i), reached={}, start=T; let firstBuild=null, minHp=100, over=null;
  STAGES.forEach((s,i)=>{ if(i===0) reached[s.name]=0; });
  // Rôles : 70 % des viewers rejoignent un métier (!rejoindre), et le jouent 60 % du temps.
  const RO=['bûcheron','mineur','chasseur','garde'], RC={'bûcheron':'!bois','mineur':'!pierre','chasseur':'!chasse','garde':'!bois'}, role={};
  users.forEach((u,i)=>{ if(r()<.7){ role[u]=RO[i%7===6?3:i%3]; g.chat(u,'!rejoindre '+role[u]); } });
  const pick=u=>{ const need=g.pop*3, food=g.res.nourriture;
    if(g.revival) return '!rallumer';
    if(!sc.neglect&&g.nextThreat.type==='raid'&&g.nextThreat.at-T<=3*60000&&(role[u]==='garde'||r()<.35)) return '!defendre';
    if(!sc.neglect&&g.foyer.hp<70&&r()<.15) return '!reparer'; if(role[u]&&r()<.6) return RC[role[u]];
    if(food<need&&r()<.6) return '!chasse'; if(r()<.35) return '!pierre'; return r()<.85?'!bois':'!chasse'; };
  const want=opts=>{ const s=g.state();
    if(opts.includes('murs')) return sc.neglect?'reserves':'murs';
    if(opts.includes('merveille')&&(g.buildings.length>=21||r()<.5)) return 'merveille';
    if(!sc.neglect&&opts.includes('tour')&&s.towers<s.towersNeeded) return 'tour';
    for(const b of ['grenier','palissade','marche','atelier']) if(opts.includes(b)&&!g.count(b)) return b;
    if(opts.includes('ferme')&&g.count('ferme')*2*6<Math.ceil(g.pop/4)*6+1) return 'ferme';
    const pref=(sc.neglect?['hutte','carriere','ferme','marche']:['hutte','carriere','ferme','tour','marche']).filter(o=>opts.includes(o)); return pref[Math.floor(r()*pref.length)]||opts[0]; };
  for(let sec=0;sec<hours*3600;sec++){
    T+=1000;
    for(const u of users) if(r()<1/cmdEverySec) g.chat(u,pick(u));
    if(sec%180===0) g.autoVote();
    if(g.vote&&!g.vote.simVoted){ g.vote.simVoted=true; const w=want(g.vote.options); for(const u of users) if(r()<.5) g.chat(u,'!vote '+(r()<.8?w:g.vote.options[0])); }
    if(sc.bits==='modérés'){ if(sec%600===300) g.cheer('m',100); if(sec%3600===1800) g.cheer('m',500); if(sec%900===450) g.sub('s'+sec); if(sec%7200===3600) g.giftSubs('G',5); }
    if(sc.bits==='massifs'){ if(sec%120===60) g.cheer('M',500); if(sec%300===150) g.sub('S'+sec); if(sec%600===0) g.cheer('M',1500); if(sec%1800===900) g.giftSubs('G',10); if(sec%3600===0&&sec) g.cheer('M',5000); }
    g.tick();
    if(firstBuild===null&&g.buildings.length) firstBuild=sec;
    const st=STAGES[g.stage].name; if(reached[st]===undefined) reached[st]=sec;
    if(g.wonder===WONDER.phases.length&&reached.Merveille===undefined) reached.Merveille=sec;
    minHp=Math.min(minHp,g.foyer.hp); if(g.gameOver){ over=sec; break; }
    if(g.completedAt){ reached.Fin=sec; break; }
  }
  return {name:sc.name,firstBuild,reached,end:reached.Fin??null,minHp,over,revivals:g.revivals,raids:g.stats.raids,repelled:g.stats.repelled,defis:g.defisWon,badges:g.badges.length,buildings:g.buildings.length,pop:g.pop};
}
const fmt=s=>s==null?'—':s<3600?Math.round(s/60)+' min':Math.floor(s/3600)+' h '+String(Math.round(s%3600/60)).padStart(2,'0');
function table(results){
  const names=STAGES.map(s=>s.name).concat(['Merveille','Fin']);
  let t='| Scénario | 1er bâtiment | '+names.slice(1).join(' | ')+' | Raids repoussés | PV min | Rallumages |\n|'+'---|'.repeat(names.length+4)+'\n';
  for(const r of results) t+=`| ${r.name} | ${fmt(r.firstBuild)} | `+names.slice(1).map(n=>fmt(r.reached[n])).join(' | ')+` | ${r.repelled}/${r.raids} | ${r.minHp} | ${r.revivals}${r.over!=null?' (perdu à '+fmt(r.over)+')':''} |\n`;
  return t;
}
function all(opts){ return SCENARIOS.map(sc=>run(sc,opts)); }
if(require.main===module){ const res=all(); if(process.argv.includes('--json')) console.log(JSON.stringify(res,null,1)); else console.log(table(res)); }
module.exports={run,all,table,SCENARIOS};
