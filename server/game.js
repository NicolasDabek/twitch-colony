// Logique de la colonie (Node + navigateur). Tout est lié à la SESSION de stream :
// rien ne persiste d'un stream à l'autre, et rien n'est converti en avantage hors stream.
// Aucun hasard payant : le seul tirage (égalité de vote) concerne des votes gratuits.
const BUILDINGS = {
  hutte:{bois:20,pierre:0,pop:2,desc:'+2 villageois'},
  ferme:{bois:30,pierre:10,desc:'+2 nourriture / 10 s'},
  carriere:{bois:40,pierre:0,desc:'+1 pierre / 10 s'},
  tour:{bois:60,pierre:40,desc:'protège des raids'},
};
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
const FOOT={hutte:[1,1],ferme:[2,2],carriere:[2,1],tour:[1,1]};
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
  }
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
    if(!this._cool(user,cmd)) return;
    this.seen[user]=this.now();
    const gain={'!bois':['bois',2],'!pierre':['pierre',1],'!chasse':['nourriture',2]}[cmd];
    if(gain){
      const mult=this.phareActive()?CHAT_MULT_PHARE:1; const add=gain[1]*mult*this.yieldFactor(); this.res[gain[0]]+=add;
      this._feed(`${{'!bois':'🪵','!pierre':'🪨','!chasse':'🍖'}[cmd]} ${user} ${{'!bois':'coupe du bois','!pierre':'taille la pierre','!chasse':'chasse'}[cmd]} (+${add>=1&&Number.isInteger(add)?add:add.toFixed(add<0.1?2:1).replace('.',',')})`);
      if(cmd==='!bois'&&this.weather==='orage magique') this.res.pierre+=1;
      this._credit(user,1); return;
    }
    if(cmd==='!vote'&&this.vote&&this.vote.options.includes(arg)){ this.vote.voters[user]=arg; this._feed(`🗳️ ${user} vote ${arg}`); this._credit(user,1); return; }
    if(cmd==='!construire'&&BUILDINGS[arg]){
      if(this.vote) return;
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
    const opts=Object.keys(BUILDINGS).filter(b=>this.affordable(b));
    if(!opts.length){ this._log(`Rien d'abordable : il manque ${this.missing('hutte')} pour une hutte. À vos !bois !`); return false; }
    return this.startVote(opts);
  }
  _closeVote(){
    const c={}; Object.values(this.vote.voters).forEach(o=>c[o]=(c[o]||0)+1); this.vote=null;
    const max=Math.max(0,...Object.values(c)); if(!max){ this._log('Vote sans participants'); return; }
    const top=Object.keys(c).filter(o=>c[o]===max);
    const win=top[Math.floor(this.rng()*top.length)];
    if(top.length>1) this._log(`Égalité (${top.join(' / ')}) départagée au hasard : ${win}`);
    this._log(`Le chat a choisi : ${win}`); if(BUILDINGS[win]) this.build(win);
  }
  build(name){
    if(!this.affordable(name)){ this._log(`Pas assez de ressources pour ${name} (il manque ${this.missing(name)})`); return false; }
    const c=this.cost(name); this.res.bois-=c.bois; this.res.pierre-=c.pierre; this.buildings.push(name);
    if(BUILDINGS[name].pop) this.pop+=BUILDINGS[name].pop; this._alert('build',`🏗️ Nouvelle construction : ${name} !`);
    this._checkStage(); return true;
  }
  _checkStage(){
    let s=0; STAGES.forEach((st,i)=>{ if(this.buildings.length>=st.min) s=i; });
    if(s>this.stage){ this.stage=s;
      if(s===STAGES.length-1){ const m=Math.round((this.now()-this.startedAt)/60000); this.completedAt=this.now(); this._alert('stage',`🏆 Partie terminée : la colonie est devenue une ${STAGES[s].name} en ${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')} ! Bravo le chat !`); }
      else this._alert('stage',`🎉 La colonie devient : ${STAGES[s].name} ! (objectif final : ${STAGES[STAGES.length-1].name})`); }
  }
  // Effets Bits/subs : uniquement des effets temporaires de session, sans hasard.
  cheer(user,bits){
    bits=Math.max(0,Math.floor(bits)); if(!bits) return; this.bitsTotal+=bits; this._credit(user,Math.floor(bits/25));
    const wood=this._bitsGift(Math.round(bits/10)); this.res.bois+=wood;
    if(bits>=500){
      const n=this.now();
      if(this.phareActive()){ this.special.until=Math.min(this.special.until+PHARE_MS,n+PHARE_MAX_MS); this._alert('bits',`💎 ${user} prolonge le Phare de la session (+10 min) !`); }
      else { this.special={name:'Phare de la session',until:n+PHARE_MS}; this._alert('bits',`💎 ${user} allume le Phare : gains du chat ×1,5 pendant 10 min !`); }
    } else this._alert('bits',`💎 ${user} : ${bits} Bits → +${wood} bois`);
    // Objectif communautaire par paliers : chaque palier atteint déclenche l'orage magique (session uniquement, sans hasard),
    // offre un cadeau de ressources à toute la colonie, puis la barre repart vers le palier suivant.
    while(this.bitsTotal>=this.goal.to){
      const n=this.now(); this.goalsReached++;
      this.weather='orage magique'; this.weatherUntil=Math.max(this.weatherUntil||0,n)+ORAGE_MS;
      for(const k in GOAL_GIFT) this.res[k]+=GOAL_GIFT[k];
      this._alert('goal',`⚡ Objectif communautaire ${this.goal.tier} atteint : ORAGE MAGIQUE ! Cadeau au village : +${GOAL_GIFT.bois} bois, +${GOAL_GIFT.pierre} pierre, +${GOAL_GIFT.nourriture} nourriture. Pendant 2 min, chaque !bois donne aussi 1 pierre`);
      this.goal={from:this.goal.to,to:this.goal.to+GOAL_STEP,tier:this.goal.tier+1,label:'Orage magique'};
    }
  }
  // Plafond des ressources offertes par les Bits : BITS_CAP.max unités par fenêtre glissante de 10 min,
  // pour qu'une session ne puisse pas être « achetée » en quelques minutes.
  _bitsGift(n){ const t=this.now(); this.bitsLog=(this.bitsLog||[]).filter(e=>t-e.t<BITS_CAP.windowMs);
    const used=this.bitsLog.reduce((a,e)=>a+e.n,0), ok=Math.max(0,Math.min(n,BITS_CAP.max-used)); if(ok) this.bitsLog.push({t,n:ok}); return ok; }
  housing(){ const h=this.count('hutte'); return 3+2*h+Math.floor((this.buildings.length-h)/3); }
  sub(user){ this._credit(user,20); this.res.nourriture+=10;
    if(this.pop<this.housing()){ this.pop+=1; this._alert('sub',`⭐ ${user} s'abonne : un villageois rejoint le village !`); }
    else { this.res.nourriture+=10; this._alert('sub',`⭐ ${user} s'abonne : +20 nourriture (plus de place : construisez une hutte pour accueillir des villageois)`); } }
  _threat(){
    const t=this.nextThreat.type, lvl=this.stage+1;
    if(t==='raid'){
      const towers=this.count('tour');
      if(towers>=lvl) this._alert('threat',`⚔️ Raid repoussé grâce aux ${towers} tour(s) !`);
      else { const lb=Math.floor(this.res.bois*0.3),lp=Math.floor(this.res.pierre*0.3); this.res.bois-=lb; this.res.pierre-=lp; this._alert('threat',`⚔️ Raid ! Il fallait ${lvl} tour(s) : -${lb} bois, -${lp} pierre`); }
    } else {
      const need=this.pop*3;
      if(this.res.nourriture>=need){ this.res.nourriture-=need; this._alert('threat',`❄️ L'hiver passe : -${need} nourriture`); }
      else { const gone=Math.max(0,Math.min(this.pop-1,Math.ceil((need-this.res.nourriture)/3))); this.res.nourriture=0; this.pop-=gone; this._alert('threat',`❄️ Hiver rude : ${gone} villageois ${gone>1?'partent':'part'} faute de nourriture`); }
    }
    this.nextThreat={type:t==='raid'?'hiver':'raid',at:this.now()+this.threatMs};
  }
  tick(){
    const n=this.now(); this.ticks++;
    if(this.ticks%10===0){
      this.res.nourriture=Math.max(0,this.res.nourriture+this.count('ferme')*2-Math.ceil(this.pop/4));
      this.res.pierre+=this.count('carriere'); this.res.bois+=Math.floor(this.pop/2);
    }
    if(this.res.nourriture===0&&this.pop>1){
      if(!this.lastFamine) this.lastFamine=n;
      else if(n-this.lastFamine>=MIN){ this.pop--; this.lastFamine=n; this._log('🍖 Famine : un villageois quitte le village. !chasse ou une ferme !'); }
    } else this.lastFamine=0;
    if(this.vote&&n>this.vote.ends) this._closeVote();
    if(this.special&&n>=this.special.until){ this._log('Le Phare de la session s\'éteint'); this.special=null; }
    if(this.weatherUntil&&n>=this.weatherUntil){ this.weather='clair'; this.weatherUntil=0; }
    if(n>=this.nextThreat.at) this._threat();
  }
  state(){
    const top=Object.entries(this.leaders).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,pts],i)=>({name,pts,title:i===0?'Fondateur de la session':''}));
    const tally={}; if(this.vote){ this.vote.options.forEach(o=>tally[o]=0); Object.values(this.vote.voters).forEach(o=>tally[o]++); }
    const costs={}; Object.keys(BUILDINGS).forEach(b=>costs[b]=this.cost(b));
    return {res:{bois:Math.floor(this.res.bois),pierre:Math.floor(this.res.pierre),nourriture:Math.floor(this.res.nourriture)},yieldFactor:this.yieldFactor(),pop:this.pop,buildings:this.buildings,weather:this.weather,special:this.special,bitsTotal:this.bitsTotal,weatherUntil:this.weatherUntil,goalsReached:this.goalsReached,
      vote:this.vote&&{title:this.vote.title,tally,ends:this.vote.ends},seed:this.seed,leaderboard:top,log:this.log,feed:this.feed,alert:this.alert,cooldownMs:this.cooldownMs,goal:{bits:this.goal.to-this.goal.from,cur:this.bitsTotal-this.goal.from,tier:this.goal.tier,target:this.goal.to,label:this.goal.label,done:false},
      stage:STAGES[this.stage].name,housing:this.housing(),finalStage:STAGES[STAGES.length-1].name,completed:this.stage===STAGES.length-1,threat:this.nextThreat,towersNeeded:this.stage+1,towers:this.count('tour'),costs,active:this.activeViewers(),now:this.now()};
  }
}
if(typeof module!=='undefined'&&module.exports) module.exports={Colony,BUILDINGS,STAGES,layout,mulberry,BITS_CAP};
else globalThis.TwitchColony={Colony,BUILDINGS,STAGES,layout,mulberry};
