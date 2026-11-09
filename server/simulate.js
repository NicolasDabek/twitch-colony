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
// GD12 : deux politiques de chat AU CLIMAX seulement (le reste de la partie = 20 viewers typique).
// « préparé » : pendant l'annonce, chaque viewer !reparer une fois (renfort), !defendre et vote « murs ».
// « passif au climax » : pendant l'annonce, personne ne défend, ne répare ni ne vote ; jeu attentif ensuite.
const CLIMAX_SCENARIOS=[
  {name:'20 viewers, préparé',viewers:20,bits:'modérés',climax:'prepare'},
  {name:'20 viewers, passif au climax',viewers:20,bits:'modérés',climax:'passive'},
];
// Rythme réaliste : chaque viewer actif envoie en moyenne une commande toutes les 30 s.
function run(sc,{hours=10,seed=1,cmdEverySec=30,gameLength,repair=true}={}){
  let T=1e12; const r=mulberry(seed*7919+sc.viewers), g=new Colony({now:()=>T,rng:r,seed,gameLength});
  const users=Array.from({length:sc.viewers},(_,i)=>'v'+i), reached={}, start=T; let firstBuild=null, minHp=100, over=null, lastPk=null, lastEv=''; let criticalRepairs=0,criticalHpRestored=0; const chat=g.chat.bind(g); g.chat=(u,text)=>{const hp=g.foyer.hp; chat(u,text); if(text==='!reparer'&&hp>0&&hp<=g.FO.vacillantAt&&g.foyer.hp>hp){criticalRepairs++;criticalHpRestored+=g.foyer.hp-hp;}}; const events=[], allEv=[],raidLog=[]; let climax=null, readyAt=null; const raid=g._raid.bind(g); g._raid=()=>{const noise=g.raidNoise(), cl=g.nextThreat.climax?{hpBefore:g.foyer.hp,maxDmg:g.climaxMaxDmg?g.climaxMaxDmg():Math.max(0,g.raidPower()-g.defenseMaxFree()),prep:g.climaxPrep?g.climaxPrep.users.size:0,prepNeed:g.climaxPrepNeed?g.climaxPrepNeed():null}:null; raid(); const l={...g.lastRaid,hp:g.foyer.hp,freeMax:g.defenseMaxFree(),repairs:g.stats.repairs,noise,at:(T-start)/1000}; raidLog.push(l); if(cl) climax={...cl,at:l.at,dmg:l.dmg,pow:l.pow,def:l.def,freeMax:l.freeMax,hpAfter:l.hp,breach:g.breach&&g.breach.status};};
  STAGES.forEach((s,i)=>{ if(i===0) reached[s.name]=0; });
  // Rôles : 70 % des viewers rejoignent un métier (!rejoindre), et le jouent 60 % du temps.
  const RO=['bûcheron','mineur','chasseur','garde'], RC={'bûcheron':'!bois','mineur':'!pierre','chasseur':'!chasse','garde':'!bois'}, role={};
  users.forEach((u,i)=>{ if(r()<.7){ role[u]=RO[i%7===6?3:i%3]; g.chat(u,'!rejoindre '+role[u]); } });
  const pick=u=>{ const need=g.pop*3, food=g.res.nourriture;
    if(g.revival) return '!rallumer';
    const clp=sc.climax&&g.nextThreat.climax&&g.nextThreat.at>T, passive=clp&&sc.climax==='passive';
    if(clp&&sc.climax==='prepare'){ if(g.climaxPrep&&!g.climaxPrep.users.has(u)) return '!reparer'; if(!g.defenders[u]) return '!defendre'; }
    if(passive){ if(role[u]&&r()<.6) return RC[role[u]]; return r()<.35?'!pierre':r()<.85?'!bois':'!chasse'; }
    // Passe GD 10 : chat attentif — chaque viewer défend au moins une fois dans la fenêtre, sans bloquer la récolte.
    if(!sc.neglect&&g.nextThreat.type==='raid'&&g.nextThreat.at-T<=3*60000&&(role[u]==='garde'||!g.defenders[u]||r()<.35)) return '!defendre';
    if(!sc.neglect&&repair&&g.foyer.hp<70&&r()<.25) return '!reparer'; if(role[u]&&r()<.6) return RC[role[u]];
    if(food<need&&r()<.6) return '!chasse'; if(r()<.35) return '!pierre'; return r()<.85?'!bois':'!chasse'; };
  const want=opts=>{ const s=g.state();
    if(opts.includes('murs')){ if(sc.climax==='passive'&&g.nextThreat.climax) return null; if(sc.neglect) return r()<.5?'reserves':'murs'; // chat négligent : stratégie votée au hasard
      return 'murs'; } // Passe GD 10 : chat attentif vote toujours « murs »
    if(opts.includes('merveille')&&(g.buildings.length>=21||r()<.5)) return 'merveille';
    if(!sc.neglect&&opts.includes('tour')&&s.towers<s.towersNeeded) return 'tour';
    for(const b of ['grenier','palissade','marche','atelier']) if(opts.includes(b)&&!g.count(b)) return b;
    if(opts.includes('ferme')&&g.count('ferme')*2*6<Math.ceil(g.pop/4)*6+1) return 'ferme';
    const pref=(sc.neglect?['hutte','carriere','ferme','marche']:['hutte','carriere','ferme','tour','marche']).filter(o=>opts.includes(o)); return pref[Math.floor(r()*pref.length)]||opts[0]; };
  for(let sec=0;sec<hours*3600;sec++){
    T+=1000;
    for(const u of users) if(r()<1/cmdEverySec) g.chat(u,pick(u));
    if(sec%180===0) g.autoVote();
    if(g.vote&&!g.vote.simVoted){ g.vote.simVoted=true; const w=want(g.vote.options); if(w!=null) for(const u of users) if(r()<.5) g.chat(u,'!vote '+(r()<.8?w:g.vote.options[0])); }
    if(sc.bits==='modérés'){ if(sec%600===300) g.cheer('m',100); if(sec%3600===1800) g.cheer('m',500); if(sec%900===450) g.sub('s'+sec); if(sec%7200===3600) g.giftSubs('G',5); }
    if(sc.bits==='massifs'){ if(sec%120===60) g.cheer('M',500); if(sec%300===150) g.sub('S'+sec); if(sec%600===0) g.cheer('M',1500); if(sec%1800===900) g.giftSubs('G',10); if(sec%3600===0&&sec) g.cheer('M',5000); }
    g.tick();
    if(firstBuild===null&&g.buildings.length) firstBuild=sec;
    const st=STAGES[g.stage].name; if(reached[st]===undefined) reached[st]=sec;
    if(g.wonder===WONDER.phases.length&&reached.Merveille===undefined) reached.Merveille=sec;
    const pk=g.wonder+'.'+g.wonderPart+'.'+g.stage+'.'+(g.wonderMilestones||0)+'.'+(g.wonderCapOpened?1:0)+'.'+(g.assaultDone?1:0)+'.'+(g.climaxDone?1:0)+'.'+(g.readyAnnounced?1:0)+'.'+(g.ceremonySteps||0)+'.'+(g.saveMarks||0); if(pk!==lastPk){ lastPk=pk; events.push(sec); }
    // Évènements visibles (jalon, palier, raid, défi gagné) pour mesurer les creux en fin de partie.
    const ek=pk+'.'+g.stats.raids+'.'+g.defisWon; if(ek!==lastEv){ lastEv=ek; allEv.push(sec); }
    if(readyAt==null&&g.readyAnnounced) readyAt=sec;
    minHp=Math.min(minHp,g.foyer.hp); if(g.gameOver){ over=sec; break; }
    if(g.completedAt){ reached.Fin=sec; break; }
  }
  const cite=reached[STAGES[STAGES.length-1].name], ev=cite==null?[]:events.filter(t=>t>=cite).concat(reached.Fin!=null?[reached.Fin]:[]); const ev2=cite==null?[]:allEv.filter(t=>t>=cite).concat(reached.Fin!=null?[reached.Fin]:[]); let eventGap=0; for(let i=1;i<ev2.length;i++) eventGap=Math.max(eventGap,ev2[i]-ev2[i-1]);
  let finaleGap=0; for(let i=1;i<ev.length;i++) finaleGap=Math.max(finaleGap,ev[i]-ev[i-1]);
  // GD12 : attente « Merveille prête » → accès complet : plus long intervalle sans jalon de progression (cérémonie comprise).
  const fullAt=g.wonderFullMs()/1000; let readyGap=null; if(readyAt!=null&&readyAt<fullAt){ const w=[readyAt,...events.filter(t=>t>readyAt&&t<fullAt),Math.min(fullAt,reached.Fin??fullAt)]; readyGap=0; for(let i=1;i<w.length;i++) readyGap=Math.max(readyGap,w[i]-w[i-1]); }
  return {name:sc.name,climax,climaxToEnd:g.completedAt&&climax?(g.completedAt-start)/1000-climax.at:null,breach:g.breach&&g.breach.status,readyAt,fullAt,readyGap,ceremonySteps:g.ceremonySteps||0,finaleGap,eventGap,milestones:g.wonderMilestones||0,firstBuild,reached,end:reached.Fin??null,minHp,over,revivals:g.revivals,chutes:g.chutes,vacillant:g.vacillant||0,repairs:g.stats.repairs,criticalRepairs,criticalHpRestored,finalHp:g.foyer.hp,raidLog,destructions3h:g.stats.destructions3h,raids:g.stats.raids,repelled:g.stats.repelled,defis:g.defisWon,badges:g.badges.length,buildings:g.buildings.length,pop:g.pop};
}
const fmt=s=>s==null?'—':s<3600?Math.round(s/60)+' min':Math.floor(s/3600)+' h '+String(Math.round(s%3600/60)).padStart(2,'0');
function table(results){
  const names=STAGES.map(s=>s.name).concat(['Merveille','Fin']);
  let t='| Scénario | 1er bâtiment | '+names.slice(1).join(' | ')+' | Raids repoussés | PV min | Rallumages | Chutes |\n|'+'---|'.repeat(names.length+5)+'\n';
  for(const r of results) t+=`| ${r.name} | ${fmt(r.firstBuild)} | `+names.slice(1).map(n=>fmt(r.reached[n])).join(' | ')+` | ${r.repelled}/${r.raids} | ${r.minHp} | ${r.revivals}${r.over!=null?' (perdu à '+fmt(r.over)+')':''} | ${r.chutes} |\n`;
  return t;
}
function all(opts){ return SCENARIOS.map(sc=>run(sc,opts)); }
// Modes de durée : la table « normale » complète, puis une ligne typique et une ligne Bits massifs pour « courte » et « longue ».
function modes(opts){ const S=n=>SCENARIOS.find(s=>s.name===n); const out=[]; for(const len of ['courte','longue']) for(const n of ['20 viewers (typique)','20 viewers, Bits massifs'].concat(len==='courte'?['20 viewers, Foyer négligé']:[])) out.push({...run(S(n),{...opts,gameLength:len}),name:`${n} — ${len}`}); return out; }
// Passe GD 8 : agrégats sur N graines (min / médiane / max) de la fin, du PV min et du taux de raids repoussés, plus les chutes.
const CASES=[['20 viewers (typique)','normale'],['20 viewers, sans Bits','normale'],['20 viewers, Bits massifs','normale'],['5 viewers','normale'],['200 viewers','normale'],['20 viewers, Foyer négligé','normale'],
  ['20 viewers (typique)','courte'],['20 viewers, sans Bits','courte'],['20 viewers, Bits massifs','courte'],['5 viewers','courte'],['20 viewers, Foyer négligé','courte'],['20 viewers (typique)','longue'],['20 viewers, Bits massifs','longue']];
function seeds(n=5,cases=CASES){ const S=x=>SCENARIOS.find(s=>s.name===x), q=a=>{ const b=a.filter(v=>v!=null).sort((x,y)=>x-y); return b.length?[b[0],b[b.length>>1],b[b.length-1]]:null; };
  return cases.map(([name,len])=>{ const rs=Array.from({length:n},(_,i)=>run(S(name),{seed:i+1,gameLength:len}));
    return {name,len,n,end:q(rs.map(r=>r.end)),over:rs.filter(r=>r.over!=null).length,minHp:q(rs.map(r=>r.minHp)),rate:q(rs.map(r=>r.raids?r.repelled/r.raids:1)),gap:Math.max(...rs.map(r=>r.finaleGap)),eventGap:Math.max(...rs.map(r=>r.eventGap)),vacillant:q(rs.map(r=>r.vacillant)),chutes:rs.reduce((a,r)=>a+r.chutes,0),runs:rs}; }); }
function seedTable(rows){ const T=a=>a?a.map(fmt).join(' / '):'—', P=a=>a.map(v=>Math.round(v*100)+' %').join(' / '), V=a=>a?a.join(' / '):'—';
  let t=`| Scénario (${rows[0].n} graines) | Mode | Fin min / méd / max | PV min min / méd / max | Raids repoussés min / méd / max | Creux max (jalons) | Creux tension | Vacillant méd | Chutes (total) | Perdues |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  for(const r of rows) t+=`| ${r.name} | ${r.len} | ${T(r.end)} | ${r.minHp.join(' / ')} | ${P(r.rate)} | ${Math.round(r.gap/60)} min | ${Math.round(r.eventGap/60)} min | ${V(r.vacillant)} | ${r.chutes} | ${r.over}/${r.n} |\n`; return t; }
if(require.main===module){ const res=all().concat(modes()); const ns=+((process.argv.find(a=>a.startsWith('--seeds='))||'').split('=')[1]||5);
  if(process.argv.includes('--json')) console.log(JSON.stringify(res,null,1)); else { console.log(table(res)); console.log(seedTable(seeds(Math.max(5,ns)))); } }
module.exports={run,all,modes,table,seeds,seedTable,SCENARIOS,CLIMAX_SCENARIOS,CASES};
