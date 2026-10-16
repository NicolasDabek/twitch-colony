// Logique de la colonie (Node + navigateur). Tout est lié à la SESSION de stream :
// rien ne persiste d'un stream à l'autre, et rien n'est converti en avantage hors stream.
// Aucun hasard payant : le seul tirage (égalité de vote) concerne des votes gratuits.
const BUILDINGS = {
  hutte:{bois:20,pierre:0,pop:2,desc:'+2 villageois (logement)'},
  ferme:{bois:30,pierre:10,desc:'+2 nourriture / 10 s'},
  carriere:{bois:40,pierre:0,desc:'+1 pierre / 10 s'},
  tour:{bois:60,pierre:40,desc:'protège des raids (1 tour par niveau de palier)'},
  // Bâtiments débloqués par palier (arbre de progression)
  grenier:{bois:50,pierre:20,stage:1,desc:"l'hiver ne coûte que la moitié de la nourriture"},
  palissade:{bois:80,pierre:30,stage:2,desc:'compte comme une tour contre les raids'},
  marche:{bois:120,pierre:80,stage:3,desc:'+1 bois et +1 pierre / 10 s'},
  atelier:{bois:150,pierre:120,stage:4,desc:'chaque !bois / !pierre rapporte +25 %'},
};
// Merveille : construction communautaire en 3 phases, débloquée au palier Ville. Objectif long terme.
const WONDER={stage:4,phases:[{bois:400,pierre:250},{bois:600,pierre:400},{bois:900,pierre:600}],name:'Merveille'};
const ROLES={'bûcheron':'!bois','bucheron':'!bois','mineur':'!pierre','chasseur':'!chasse'}, ROLE_MULT=1.5, STREAK_MULT=1.25, STREAK_WIN=10*60000;
// Bits par paliers (déterministes, session uniquement, plafonnés) : 100 = ressources, 500 = Phare, 1500 = Bénédiction, 5000 = orage (objectif)
const BITS_TIERS=[{bits:100,label:'+1 bois / 10 Bits pour le village'},{bits:500,label:'Phare : gains du chat ×1,5 pendant 10 min'},{bits:1500,label:'Bénédiction : production passive ×2 pendant 5 min'},{bits:5000,label:'Orage magique : cadeau au village + !bois donne de la pierre'}];
const BLESS_MS=5*60000;
const DEFIS=[{type:'gather',cmd:'!bois',res:'bois',label:'coupez du bois'},{type:'vote',label:'votez nombreux au prochain vote'},{type:'gather',cmd:'!pierre',res:'pierre',label:'taillez de la pierre'},{type:'gather',cmd:'!chasse',res:'nourriture',label:'chassez'},{type:'survive',label:'survivez à la prochaine menace sans perte'}];
const DEFI_EVERY=5*60000, DEFI_MS=3*60000;
const BADGES={first:'Premières fondations',raid:'Raid repoussé',winter:'Hiver survécu',defi3:'3 défis réussis',orage:'Orage magique',fete:'Fête au village',wonder:'Merveille achevée',cite:'Cité !',hameau:'Hameau',village:'Village',bourg:'Bourg',ville:'Ville'};
// Paliers : la partie est TERMINÉE quand la colonie devient une Cité (objectif de session, ≥ 3 h avec une audience typique).
const STAGES=[{name:'Campement',min:0},{name:'Hameau',min:3},{name:'Village',min:6},{name:'Bourg',min:10},{name:'Ville',min:15},{name:'Cité',min:21}];
// Équilibrage (voir server/simulate.js) : coût × 1,25^(exemplaires) × TOTAL_GROWTH^(bâtiments déjà construits)
// Adaptation à l'audience : le rendement d'une commande vaut (REF/A)^YIELD_EXP quand A (viewers actifs, lissé sur 10 min) dépasse REF.
// Progression totale ∝ A^(1-YIELD_EXP) : 5 → 100 viewers ≈ +25 %. Les coûts ne dépendent plus du nombre de viewers.
const YIELD_REF=5, YIELD_EXP=0.92, ACTIVE_SMOOTH_MS=10*60000;
const TOTAL_GROWTH=1.18, CHAT_MULT_PHARE=1.5, PHARE_MAX_MS=20*60000, BITS_CAP={windowMs:10*60000,max:60};
const GOAL_STEP=5000, GOAL_GIFT={bois:60,pierre:30,nourriture:30};
const MIN=60000, PHARE_MS=10*MIN, ORAGE_MS=2*MIN, THREAT_MS=15*MIN, ACTIVE_WINDOW=5*MIN;

// ─── Placement 3D (village isométrique) ───
// Déterministe : même seed + même liste ⇒ mêmes positions. Chaque bâtiment i dépend
// uniquement de la seed et des bâtiments 0..i-1 : les bâtiments existants ne bougent jamais.
const FOOT={hutte:[1,1],ferme:[2,2],carriere:[2,1],tour:[1,1],grenier:[2,1],palissade:[2,1],marche:[2,2],atelier:[2,1],merveille:[3,3]};
function mulberry(a){ return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function layout(seed,list,N=24,OUT=72){
  // Coordonnées « locales » : la zone centrale d'origine va de 0 à N-1 ; la carte complète (OUT×OUT) s'étend autour.
  const O=(OUT-N)/2, occ=new Uint8Array(OUT*OUT), out=[], c=N/2-1;
  const at=(x,z)=>{ const a=x+O,b=z+O; return a>=0&&b>=0&&a<OUT&&b<OUT?occ[b*OUT+a]:1; };
  const mark=(x,z,w,h)=>{ for(let i=0;i<w;i++) for(let j=0;j<h;j++) occ[(z+j+O)*OUT+x+i+O]=1; };
  mark(c,c,2,2); // réservé au Phare de la session (centre)
  const free=(x,z,w,h,pad,lo=0,hi=N)=>{ if(x<lo||z<lo||x+w>hi||z+h>hi) return false;
    for(let i=-pad;i<w+pad;i++) for(let j=-pad;j<h+pad;j++){ const a=x+i+O,b=z+j+O; if(a>=0&&b>=0&&a<OUT&&b<OUT&&occ[b*OUT+a]) return false; } return true; };
  list.forEach((type,i)=>{
    const [w,h]=FOOT[type]||[1,1], r=mulberry((seed>>>0)^Math.imul(i+1,0x9E3779B1)); let p=null;
    // 1) zone centrale d'origine (identique à la version 24×24 : les parties existantes gardent leurs positions)
    for(let k=0;k<600&&!p;k++){ const span=Math.min(N,8+i*1.5+k/40), x=Math.floor(N/2-span/2+r()*span), z=Math.floor(N/2-span/2+r()*span); if(free(x,z,w,h,1)) p=[x,z]; }
    // 2) zone centrale pleine : on s'étend vers l'extérieur, anneau par anneau
    for(let ring=1;ring<=O&&!p;ring++) for(let k=0;k<300&&!p;k++){ const lo=-ring,hi=N+ring, x=Math.floor(lo+r()*(hi-lo-w+1)), z=Math.floor(lo+r()*(hi-lo-h+1)); if(free(x,z,w,h,1,lo,hi)) p=[x,z]; }
    for(let k=0;k<OUT*OUT&&!p;k++){ const x=k%OUT-O,z=Math.floor(k/OUT)-O; if(free(x,z,w,h,0,-O,N+O)) p=[x,z]; }
    if(!p) return; mark(p[0],p[1],w,h); out.push({type,x:p[0],z:p[1],w,h,rot:Math.floor(r()*4)});
  });
  return {items:out,phare:{x:c,z:c,w:2,h:2},occ,at,N,OUT,O};
}
class Colony {
  constructor(opts={}){
    this.cooldownMs=opts.cooldownMs??5000; this.voteDurationMs=opts.voteDurationMs??30000;
    this.threatMs=opts.threatMs??THREAT_MS; this.now=opts.now||(()=>Date.now()); this.rng=opts.rng||Math.random; this.fixedSeed=opts.seed;
    this.reset();
  }
  reset(){
    this.seed=this.fixedSeed??Math.floor(this.rng()*1e9);
    this.res={bois:10,pierre:0,nourriture:20}; this.pop=3; this.buildings=[];
    this.leaders={}; this.optout=new Set(); this.vote=null; this.weather='clair'; this.weatherUntil=0;
    this.special=null; this.bitsTotal=0; this.goal={from:0,to:GOAL_STEP,tier:1,label:'Orage magique'}; this.goalsReached=0;
    this.log=[]; this.feed=[]; this.alert=null; this.last={}; this.seen={}; this.startedAt=this.now(); this.ticks=0; this.stage=0;
    this.nextThreat={type:'raid',at:this.now()+this.threatMs}; this.lastFamine=0;
    this.builders={}; this.patrons={}; this.roles={}; this.windows={}; this.contrib={}; this.named=[]; this.badges=[]; this.defisWon=0;
    this.wonder=0; this.blessUntil=0; this.feteUntil=0; this.defi=null; this.nextDefi=this.now()+60000; this.projectsDone=[]; this.completedAt=0;
  }
  _badge(k){ if(!this.badges.includes(k)){ this.badges.push(k); this._log(`🏅 Badge de session : ${BADGES[k]}`); } }
  _builder(u,p){ if(!u||!p||this.optout.has(u.toLowerCase())) return; this.builders[u]=(this.builders[u]||0)+p; this._credit(u,p); }
  _patron(u,p){ if(!u||!p||this.optout.has(u.toLowerCase())) return; this.patrons[u]=(this.patrons[u]||0)+p; this._credit(u,p); }
  streak(u){ const w=this.windows[u]; if(!w) return 0; let k=Math.floor(this.now()/STREAK_WIN), n=0; if(!w.has(k)) k--; while(w.has(k)){ n++; k--; } return n; }
  unlocked(name){ return (BUILDINGS[name].stage||0)<=this.stage; }
  // ─── Objectifs : court (défis), moyen (projets), long (Cité + Merveille) ───
  _startDefi(){ const n=this.now(), i=Math.floor((n-this.startedAt)/DEFI_EVERY)%DEFIS.length, d=DEFIS[i], a=Math.max(3,this.activeViewers());
    if(d.type==='survive'&&this.nextThreat.at-n>DEFI_MS*3) return this._startDefiAlt(n,a);
    this.defi={...d,start:n,ends:d.type==='survive'?this.nextThreat.at+1000:d.type==='vote'?n+DEFI_MS*2:n+DEFI_MS,target:d.type==='gather'?Math.round(4+a*1.5):d.type==='vote'?Math.max(2,Math.ceil(a/2)):1,count:0,who:new Set(),done:false};
    this._alert('defi',`🎯 Défi communautaire : ${d.label}${d.type==='gather'?` (${this.defi.target} fois en 3 min)`:''} !`); }
  _startDefiAlt(n,a){ const d=DEFIS[0]; this.defi={...d,start:n,ends:n+DEFI_MS,target:Math.round(4+a*1.5),count:0,who:new Set(),done:false}; this._alert('defi',`🎯 Défi communautaire : ${d.label} (${this.defi.target} fois en 3 min) !`); }
  _defiProgress(u,n=1){ const d=this.defi; if(!d||d.done) return; d.count+=n; if(u) d.who.add(u); if(d.count>=d.target) this._winDefi(); }
  _winDefi(){ const d=this.defi; d.done=true; this.defisWon++; const r=d.res||'bois'; this.res[r]+=25; this.res.nourriture+=10;
    d.who.forEach(u=>this._builder(u,3)); this._alert('defi',`🎯 Défi réussi ! Bonus de session : +25 ${r}, +10 nourriture, +3 points aux ${d.who.size} participant(s)`); if(this.defisWon>=3) this._badge('defi3'); }
  projects(){ const c=n=>this.count(n);
    return [
      {id:'p-hutte',label:'Loger les villageois : 2 huttes',cur:c('hutte'),need:2},
      {id:'p-def',label:'Défense : autant de tours que le niveau de palier',cur:c('tour')+c('palissade'),need:this.stage+1},
      {id:'p-grenier',label:'Grenier (débloqué au Hameau)',cur:c('grenier'),need:1,stage:1},
      {id:'p-hiver',label:"Préparer l'hiver : réserve de nourriture",cur:Math.floor(this.res.nourriture),need:this.pop*3*(c('grenier')?0.5:1)|0,live:true},
      {id:'p-palissade',label:'Palissade (débloquée au Village)',cur:c('palissade'),need:1,stage:2},
      {id:'p-marche',label:'Marché (débloqué au Bourg)',cur:c('marche'),need:1,stage:3},
      {id:'p-atelier',label:'Atelier (débloqué à la Ville)',cur:c('atelier'),need:1,stage:4},
    ].filter(p=>(p.stage||0)<=this.stage); }
  objectives(){ const n=this.now(), d=this.defi;
    const short=d&&!d.done&&n<d.ends?{label:'Défi : '+d.label,cur:Math.min(d.count,d.target),need:d.target,ends:d.ends}:{label:'Prochain défi communautaire',cur:0,need:1,ends:this.nextDefi};
    const p=this.projects().find(p=>p.cur<p.need&&!(p.live&&this.nextThreat.type!=='hiver'))||{label:'Tous les projets sont faits : visez la Merveille !',cur:1,need:1};
    const cite=STAGES[STAGES.length-1].min, nx=STAGES[this.stage+1];
    return {short,mid:{label:p.label,cur:Math.min(p.cur,p.need),need:p.need},
      long:{label:`Cité (${Math.min(this.buildings.length,cite)}/${cite} bâtiments) + ${WONDER.name} (${this.wonder}/${WONDER.phases.length} phases)`,cur:Math.min(this.buildings.length,cite)+this.wonder*3,need:cite+WONDER.phases.length*3},
      nextStage:nx?{name:nx.name,cur:this.buildings.length,need:nx.min}:null};
  }
  wonderCost(){ const p=WONDER.phases[this.wonder]; return p?{...p}:null; }
  buildWonder(){ const c=this.wonderCost(); if(!c||this.stage<WONDER.stage) return false; if(this.res.bois<c.bois||this.res.pierre<c.pierre){ this._log(`${WONDER.name} : il manque ${Math.max(0,c.bois-Math.floor(this.res.bois))} bois, ${Math.max(0,c.pierre-Math.floor(this.res.pierre))} pierre`); return false; }
    this.res.bois-=c.bois; this.res.pierre-=c.pierre; this.wonder++; this._alert('build',`🏛️ ${WONDER.name} : phase ${this.wonder}/${WONDER.phases.length} terminée !`);
    if(this.wonder===WONDER.phases.length){ this._badge('wonder'); } this._checkEnd(); return true; }
  _checkEnd(){ if(this.completedAt||this.stage<STAGES.length-1||this.wonder<WONDER.phases.length) return; this.completedAt=this.now(); const m=Math.round((this.completedAt-this.startedAt)/60000);
    this._alert('stage',`🏆 Partie terminée : Cité et ${WONDER.name} achevées en ${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')} ! Bravo le chat !`); }
  rates(){ const bl=this.now()<this.blessUntil?2:1, f=this.count('ferme'), m=this.count('marche');
    return {bois:(Math.floor(this.pop/2)+m)*6*bl,pierre:(this.count('carriere')+m)*6*bl,nourriture:(f*2*bl-Math.ceil(this.pop/4))*6}; }
  viewer(u){ return {name:u,builder:this.builders[u]||0,patron:this.patrons[u]||0,role:this.roles[u]||null,streak:this.streak(u),contrib:this.contrib[u]||0}; }
  _log(m){ this.log.unshift({t:this.now(),m}); this.log=this.log.slice(0,12); }
  _feed(m){ this.feed.unshift({t:this.now(),m}); this.feed=this.feed.slice(0,3); }
  _alert(kind,m){ this.alert={kind,m,t:this.now()}; this._log(m); }
  _credit(user,pts){ if(!user||!pts||this.optout.has(user.toLowerCase())) return; this.leaders[user]=(this.leaders[user]||0)+pts; }
  _cool(user,cmd){ const k=user+cmd,n=this.now(); if(this.last[k]&&n-this.last[k]<this.cooldownMs) return false; this.last[k]=n; return true; }
  count(name){ return this.buildings.filter(b=>b===name).length; }
  activeViewers(){ const n=this.now(); return Object.values(this.seen).filter(t=>n-t<=ACTIVE_SMOOTH_MS).length; }
  yieldFactor(){ const a=this.activeViewers(); return a<=YIELD_REF?1:Math.pow(YIELD_REF/a,YIELD_EXP); }
  // Coût = base × max(1, actifs/5) × 1,25^(exemplaires déjà construits)
  cost(name){
    const b=BUILDINGS[name], k=Math.pow(1.25,this.count(name))*Math.pow(TOTAL_GROWTH,this.buildings.length);
    return {bois:Math.ceil(b.bois*k),pierre:Math.ceil(b.pierre*k)};
  }
  affordable(name){ const c=this.cost(name); return this.res.bois>=c.bois&&this.res.pierre>=c.pierre; }
  missing(name){ const c=this.cost(name),m=[]; for(const r of ['bois','pierre']) if(this.res[r]<c[r]) m.push(`${c[r]-this.res[r]} ${r}`); return m.join(', '); }
  phareActive(){ return !!(this.special&&this.now()<this.special.until); }
  chat(user,text){
    const [cmd,arg]=String(text).trim().toLowerCase().split(/\s+/);
    if(cmd==='!optout'){ this.optout.add(user.toLowerCase()); delete this.leaders[user]; this._log(`${user} ne figure plus au classement`); return; }
    if(cmd==='!optin'){ this.optout.delete(user.toLowerCase()); return; }
    if(cmd==='!aide'){ this._feed(`❔ Commandes : !bois !pierre !chasse · !vote <option> · !construire <bâtiment> · !rejoindre bûcheron|mineur|chasseur · !optout`); return; }
    if(!this._cool(user,cmd)) return;
    this.seen[user]=this.now(); const wk=Math.floor(this.now()/STREAK_WIN); (this.windows[user]=this.windows[user]||new Set()).add(wk);
    if(cmd==='!rejoindre'){ const r=ROLES[arg]; if(!r) return; const nm=arg==='bucheron'?'bûcheron':arg; this.roles[user]=nm; this._feed(`🧭 ${user} devient ${nm} (+50 % sur ${r})`); return; }
    const gain={'!bois':['bois',2],'!pierre':['pierre',1],'!chasse':['nourriture',2]}[cmd];
    if(gain){
      const role=this.roles[user]&&ROLES[this.roles[user]]===cmd?ROLE_MULT:1, streak=this.streak(user)>=3?STREAK_MULT:1, atelier=this.count('atelier')&&cmd!=='!chasse'?1.25:1;
      const mult=(this.phareActive()?CHAT_MULT_PHARE:1)*role*streak*atelier; const add=gain[1]*mult*this.yieldFactor(); this.res[gain[0]]+=add; this.contrib[user]=(this.contrib[user]||0)+add;
      if(this.defi&&this.defi.type==='gather'&&this.defi.cmd===cmd&&this.now()<this.defi.ends) this._defiProgress(user);
      this._feed(`${{'!bois':'🪵','!pierre':'🪨','!chasse':'🍖'}[cmd]} ${user} ${{'!bois':'coupe du bois','!pierre':'taille la pierre','!chasse':'chasse'}[cmd]} (+${add>=1&&Number.isInteger(add)?add:add.toFixed(add<0.1?2:1).replace('.',',')})`);
      if(cmd==='!bois'&&this.weather==='orage magique') this.res.pierre+=1;
      this._builder(user,1); return;
    }
    if(cmd==='!vote'&&this.vote&&this.vote.options.includes(arg)){ if(!this.vote.voters[user]&&this.defi&&this.defi.type==='vote'&&!this.defi.done) this._defiProgress(user); this.vote.voters[user]=arg; this._feed(`🗳️ ${user} vote ${arg}`); this._builder(user,1); return; }
    if(cmd==='!construire'&&(BUILDINGS[arg]||arg==='merveille')){
      if(this.vote) return;
      if(arg==='merveille'){ if(this.stage>=WONDER.stage&&this.wonderCost()) this.startVote(['merveille','attendre'],`Construire la phase ${this.wonder+1} de la ${WONDER.name} ?`); return; }
      if(!this.unlocked(arg)){ this._log(`${arg} : débloqué au palier ${STAGES[BUILDINGS[arg].stage].name}`); return; }
      if(!this.affordable(arg)){ this._log(`${arg} : il manque ${this.missing(arg)}`); return; }
      this.startVote([arg,'attendre'],`Construire ${arg} ?`);
    }
  }
  startVote(options,title='Que construit la colonie ?'){
    if(this.vote||!options.length) return false; this.vote={title,options,voters:{},ends:this.now()+this.voteDurationMs}; this._log(`Vote : ${title}`); return true;
  }
  // Vote automatique : uniquement les bâtiments abordables.
  autoVote(){
    if(this.vote) return false;
    const opts=Object.keys(BUILDINGS).filter(b=>this.unlocked(b)&&this.affordable(b));
    const wc=this.wonderCost(); if(this.stage>=WONDER.stage&&wc&&this.res.bois>=wc.bois&&this.res.pierre>=wc.pierre) opts.push('merveille');
    if(!opts.length){ this._log(`Rien d'abordable : il manque ${this.missing('hutte')} pour une hutte. À vos !bois !`); return false; }
    return this.startVote(opts);
  }
  _closeVote(){
    const voters=this.vote.voters, c={}; Object.values(voters).forEach(o=>c[o]=(c[o]||0)+1); this.vote=null;
    const max=Math.max(0,...Object.values(c)); if(!max){ this._log('Vote sans participants'); return; }
    const top=Object.keys(c).filter(o=>c[o]===max);
    const win=top[Math.floor(this.rng()*top.length)];
    if(top.length>1) this._log(`Égalité (${top.join(' / ')}) départagée au hasard : ${win}`);
    this._log(`Le chat a choisi : ${win}`);
    Object.entries(voters).forEach(([u,o])=>{ if(o===win) this._builder(u,2); });
    if(BUILDINGS[win]) this.build(win); else if(win==='merveille') this.buildWonder();
  }
  build(name){
    if(!this.affordable(name)){ this._log(`Pas assez de ressources pour ${name} (il manque ${this.missing(name)})`); return false; }
    const c=this.cost(name); this.res.bois-=c.bois; this.res.pierre-=c.pierre; this.buildings.push(name);
    if(BUILDINGS[name].pop) this.pop+=BUILDINGS[name].pop; if(this.buildings.length===1) this._badge('first'); this._alert('build',`🏗️ Nouvelle construction : ${name} !`);
    this._checkStage(); return true;
  }
  _checkStage(){
    let s=0; STAGES.forEach((st,i)=>{ if(this.buildings.length>=st.min) s=i; });
    if(s>this.stage){ this.stage=s; this._badge(['','hameau','village','bourg','ville','cite'][s]);
      const unl=Object.keys(BUILDINGS).filter(k=>BUILDINGS[k].stage===s);
      this._alert('stage',`🎉 La colonie devient : ${STAGES[s].name} !${unl.length?' Nouveau bâtiment : '+unl.join(', ')+'.':''}${s===WONDER.stage?' La Merveille est débloquée !':''}`);
      this._checkEnd(); }
  }
  // Effets Bits/subs : uniquement des effets temporaires de session, sans hasard.
  cheer(user,bits){
    bits=Math.max(0,Math.floor(bits)); if(!bits) return; this.bitsTotal+=bits; this._patron(user,Math.floor(bits/25));
    const want=Math.round(bits/10), wood=this._bitsGift(want); this.res.bois+=wood;
    if(wood<want) this._feed(`💎 Merci ${user} ! Plafond de ressources Bits atteint pour 10 min (+${wood} bois au lieu de +${want}) : les effets spéciaux restent actifs`);
    if(bits>=1500){ const n0=this.now(); this.blessUntil=Math.min(Math.max(this.blessUntil,n0)+BLESS_MS,n0+3*BLESS_MS); this._alert('bits',`🌾 ${user} offre la Bénédiction : production passive ×2 pendant 5 min !`); }
    if(bits>=500&&bits<1500){
      const n=this.now();
      if(this.phareActive()){ this.special.until=Math.min(this.special.until+PHARE_MS,n+PHARE_MAX_MS); this._alert('bits',`💎 ${user} prolonge le Phare de la session (+10 min) !`); }
      else { this.special={name:'Phare de la session',until:n+PHARE_MS}; this._alert('bits',`💎 ${user} allume le Phare : gains du chat ×1,5 pendant 10 min !`); }
    } else if(bits<500) this._alert('bits',`💎 ${user} : ${bits} Bits → +${wood} bois`);
    // Objectif communautaire par paliers : chaque palier atteint déclenche l'orage magique (session uniquement, sans hasard),
    // offre un cadeau de ressources à toute la colonie, puis la barre repart vers le palier suivant.
    while(this.bitsTotal>=this.goal.to){
      const n=this.now(); this.goalsReached++;
      this.weather='orage magique'; this.weatherUntil=Math.max(this.weatherUntil||0,n)+ORAGE_MS;
      for(const k in GOAL_GIFT) this.res[k]+=GOAL_GIFT[k]; this._badge('orage');
      this._alert('goal',`⚡ Objectif communautaire ${this.goal.tier} atteint : ORAGE MAGIQUE ! Cadeau au village : +${GOAL_GIFT.bois} bois, +${GOAL_GIFT.pierre} pierre, +${GOAL_GIFT.nourriture} nourriture. Pendant 2 min, chaque !bois donne aussi 1 pierre`);
      this.goal={from:this.goal.to,to:this.goal.to+GOAL_STEP,tier:this.goal.tier+1,label:'Orage magique'};
    }
  }
  // Plafond des ressources offertes par les Bits : BITS_CAP.max unités par fenêtre glissante de 10 min,
  // pour qu'une session ne puisse pas être « achetée » en quelques minutes.
  _bitsGift(n){ const t=this.now(); this.bitsLog=(this.bitsLog||[]).filter(e=>t-e.t<BITS_CAP.windowMs);
    const used=this.bitsLog.reduce((a,e)=>a+e.n,0), ok=Math.max(0,Math.min(n,BITS_CAP.max-used)); if(ok) this.bitsLog.push({t,n:ok}); return ok; }
  // Subs offerts : fête au village (déterministe, session uniquement) : +5 nourriture par sub offert (plafonné), villageois en fête 2 min.
  giftSubs(user,n=1){ n=Math.max(1,Math.min(50,n|0)); this._patron(user,20*n); this.res.nourriture+=this._bitsGift(5*n); this.feteUntil=this.now()+2*60000;
    this._alert('fete',`🎉 ${user} offre ${n} abonnement${n>1?'s':''} : FÊTE AU VILLAGE !`); this._badge('fete'); }
  housing(){ const h=this.count('hutte'); return 3+2*h+Math.floor((this.buildings.length-h)/3); }
  sub(user){ this._patron(user,20); this.res.nourriture+=10;
    if(this.pop<this.housing()){ this.pop+=1; if(user&&!this.named.includes(user)){ this.named.push(user); this.named=this.named.slice(-12); } this._alert('sub',`⭐ ${user} s'abonne : un villageois rejoint le village !`); }
    else { this.res.nourriture+=10; this._alert('sub',`⭐ ${user} s'abonne : +20 nourriture (plus de place : construisez une hutte pour accueillir des villageois)`); } }
  _threat(){
    const t=this.nextThreat.type, lvl=this.stage+1;
    if(t==='raid'){
      const towers=this.count('tour')+this.count('palissade');
      if(towers>=lvl){ this._alert('threat',`⚔️ Raid repoussé grâce aux ${towers} défense(s) !`); this._badge('raid'); if(this.defi&&this.defi.type==='survive'&&!this.defi.done) this._winDefi(); }
      else { const lb=Math.floor(this.res.bois*0.3),lp=Math.floor(this.res.pierre*0.3); this.res.bois-=lb; this.res.pierre-=lp; this._alert('threat',`⚔️ Raid ! Il fallait ${lvl} tour(s) : -${lb} bois, -${lp} pierre`); }
    } else {
      const need=Math.ceil(this.pop*3*(this.count('grenier')?0.5:1));
      if(this.res.nourriture>=need){ this.res.nourriture-=need; this._alert('threat',`❄️ L'hiver passe : -${need} nourriture`); this._badge('winter'); if(this.defi&&this.defi.type==='survive'&&!this.defi.done) this._winDefi(); }
      else { const gone=Math.max(0,Math.min(this.pop-1,Math.ceil((need-this.res.nourriture)/3))); this.res.nourriture=0; this.pop-=gone; this._alert('threat',`❄️ Hiver rude : ${gone} villageois ${gone>1?'partent':'part'} faute de nourriture`); }
    }
    this.nextThreat={type:t==='raid'?'hiver':'raid',at:this.now()+this.threatMs};
  }
  tick(){
    const n=this.now(); this.ticks++;
    if(this.ticks%10===0){
      const bl=n<this.blessUntil?2:1, m=this.count('marche');
      this.res.nourriture=Math.max(0,this.res.nourriture+this.count('ferme')*2*bl-Math.ceil(this.pop/4));
      this.res.pierre+=(this.count('carriere')+m)*bl; this.res.bois+=(Math.floor(this.pop/2)+m)*bl;
    }
    if(this.res.nourriture===0&&this.pop>1){
      if(!this.lastFamine) this.lastFamine=n;
      else if(n-this.lastFamine>=MIN){ this.pop--; this.lastFamine=n; this._log('🍖 Famine : un villageois quitte le village. !chasse ou une ferme !'); }
    } else this.lastFamine=0;
    if(this.vote&&n>this.vote.ends) this._closeVote();
    if(this.special&&n>=this.special.until){ this._log('Le Phare de la session s\'éteint'); this.special=null; }
    if(this.weatherUntil&&n>=this.weatherUntil){ this.weather='clair'; this.weatherUntil=0; }
    if(n>=this.nextThreat.at) this._threat();
    if(this.defi&&!this.defi.done&&n>=this.defi.ends){ this._log('🎯 Défi manqué, le prochain arrive bientôt'); this.defi=null; }
    if(n>=this.nextDefi){ this.nextDefi=n+DEFI_EVERY; this._startDefi(); }
  }
  _nextAffordable(){ const l=Object.keys(BUILDINGS).filter(b=>this.unlocked(b)).map(b=>({b,c:this.cost(b)})).sort((x,y)=>(x.c.bois+x.c.pierre)-(y.c.bois+y.c.pierre))[0]; return l?{name:l.b,cost:l.c,affordable:this.affordable(l.b),missing:this.missing(l.b)}:null; }
  state(){
    const top=Object.entries(this.builders).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,pts],i)=>({name,pts,title:i===0?'Fondateur de la session':''}));
    const tally={}; if(this.vote){ this.vote.options.forEach(o=>tally[o]=0); Object.values(this.vote.voters).forEach(o=>tally[o]++); }
    const costs={}; Object.keys(BUILDINGS).forEach(b=>costs[b]=this.cost(b));
    return {res:{bois:Math.floor(this.res.bois),pierre:Math.floor(this.res.pierre),nourriture:Math.floor(this.res.nourriture)},yieldFactor:this.yieldFactor(),pop:this.pop,buildings:this.buildings,weather:this.weather,special:this.special,bitsTotal:this.bitsTotal,weatherUntil:this.weatherUntil,goalsReached:this.goalsReached,
      vote:this.vote&&{title:this.vote.title,tally,ends:this.vote.ends},seed:this.seed,leaderboard:top,patronsBoard:Object.entries(this.patrons).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,pts])=>({name,pts})),objectives:this.objectives(),rates:this.rates(),badges:this.badges.map(k=>BADGES[k]),named:this.named,roles:this.roles,wonder:{phase:this.wonder,phases:WONDER.phases.length,cost:this.wonderCost(),unlocked:this.stage>=WONDER.stage},blessUntil:this.blessUntil,feteUntil:this.feteUntil,bitsTiers:BITS_TIERS,bitsCapLeft:Math.max(0,BITS_CAP.max-(this.bitsLog||[]).filter(e=>this.now()-e.t<BITS_CAP.windowMs).reduce((a,e)=>a+e.n,0)),unlockedBuildings:Object.keys(BUILDINGS).filter(b=>this.unlocked(b)),nextAffordable:this._nextAffordable(),viewers:Object.fromEntries(Object.keys(this.seen).slice(-200).map(u=>[u,this.viewer(u)])),log:this.log,feed:this.feed,alert:this.alert,cooldownMs:this.cooldownMs,goal:{bits:this.goal.to-this.goal.from,cur:this.bitsTotal-this.goal.from,tier:this.goal.tier,target:this.goal.to,label:this.goal.label,done:false},
      stage:STAGES[this.stage].name,housing:this.housing(),finalStage:STAGES[STAGES.length-1].name,completed:this.stage===STAGES.length-1,threat:this.nextThreat,towersNeeded:this.stage+1,towers:this.count('tour'),costs,active:this.activeViewers(),now:this.now()};
  }
}
if(typeof module!=='undefined'&&module.exports) module.exports={Colony,BUILDINGS,STAGES,layout,mulberry,BITS_CAP,WONDER,BADGES};
else globalThis.TwitchColony={Colony,BUILDINGS,STAGES,layout,mulberry,WONDER};
