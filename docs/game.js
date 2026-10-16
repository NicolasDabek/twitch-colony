// Logique de la colonie (Node + navigateur). Tout est lié à la SESSION de stream :
// rien ne persiste d'un stream à l'autre, et rien n'est converti en avantage hors stream.
// Aucun hasard payant : le seul tirage (égalité de vote) concerne des votes gratuits.
const BUILDINGS = {
  hutte:{bois:20,pierre:0,pop:2,desc:'+2 colons'},
  ferme:{bois:30,pierre:10,desc:'+2 nourriture / 10 s'},
  carriere:{bois:40,pierre:0,desc:'+1 pierre / 10 s'},
  tour:{bois:60,pierre:40,desc:'protège des raids'},
};
const STAGES=[{name:'Campement',min:0},{name:'Village',min:3},{name:'Bourg',min:7},{name:'Ville',min:12}];
const MIN=60000, PHARE_MS=10*MIN, ORAGE_MS=2*MIN, THREAT_MS=15*MIN, ACTIVE_WINDOW=5*MIN;

// ─── Placement 3D (village isométrique) ───
// Déterministe : même seed + même liste ⇒ mêmes positions. Chaque bâtiment i dépend
// uniquement de la seed et des bâtiments 0..i-1 : les bâtiments existants ne bougent jamais.
const FOOT={hutte:[1,1],ferme:[2,2],carriere:[2,1],tour:[1,1]};
function mulberry(a){ return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function layout(seed,list,N=24){
  const occ=new Uint8Array(N*N), out=[], c=N/2-1;
  const mark=(x,z,w,h)=>{ for(let i=0;i<w;i++) for(let j=0;j<h;j++) occ[(z+j)*N+x+i]=1; };
  mark(c,c,2,2); // réservé au Phare de la session (centre)
  const free=(x,z,w,h,pad)=>{ if(x<0||z<0||x+w>N||z+h>N) return false;
    for(let i=-pad;i<w+pad;i++) for(let j=-pad;j<h+pad;j++){ const a=x+i,b=z+j; if(a>=0&&b>=0&&a<N&&b<N&&occ[b*N+a]) return false; } return true; };
  list.forEach((type,i)=>{
    const [w,h]=FOOT[type]||[1,1], r=mulberry((seed>>>0)^Math.imul(i+1,0x9E3779B1)); let p=null;
    for(let k=0;k<600&&!p;k++){ const span=Math.min(N,8+i*1.5+k/40), x=Math.floor(N/2-span/2+r()*span), z=Math.floor(N/2-span/2+r()*span); if(free(x,z,w,h,1)) p=[x,z]; }
    for(let k=0;k<N*N&&!p;k++){ const x=k%N,z=Math.floor(k/N); if(free(x,z,w,h,0)) p=[x,z]; }
    if(!p) return; mark(p[0],p[1],w,h); out.push({type,x:p[0],z:p[1],w,h,rot:Math.floor(r()*4)});
  });
  return {items:out,phare:{x:c,z:c,w:2,h:2},occ};
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
    this.special=null; this.bitsTotal=0; this.goals=[{bits:5000,label:'Orage magique',done:false}];
    this.log=[]; this.feed=[]; this.alert=null; this.last={}; this.seen={}; this.startedAt=this.now(); this.ticks=0; this.stage=0;
    this.nextThreat={type:'raid',at:this.now()+this.threatMs}; this.lastFamine=0;
  }
  _log(m){ this.log.unshift({t:this.now(),m}); this.log=this.log.slice(0,12); }
  _feed(m){ this.feed.unshift({t:this.now(),m}); this.feed=this.feed.slice(0,3); }
  _alert(kind,m){ this.alert={kind,m,t:this.now()}; this._log(m); }
  _credit(user,pts){ if(!user||!pts||this.optout.has(user.toLowerCase())) return; this.leaders[user]=(this.leaders[user]||0)+pts; }
  _cool(user,cmd){ const k=user+cmd,n=this.now(); if(this.last[k]&&n-this.last[k]<this.cooldownMs) return false; this.last[k]=n; return true; }
  count(name){ return this.buildings.filter(b=>b===name).length; }
  activeViewers(){ const n=this.now(); return Object.values(this.seen).filter(t=>n-t<=ACTIVE_WINDOW).length; }
  // Coût = base × max(1, actifs/5) × 1,25^(exemplaires déjà construits)
  cost(name){
    const b=BUILDINGS[name], k=Math.max(1,this.activeViewers()/5)*Math.pow(1.25,this.count(name));
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
      const mult=this.phareActive()?2:1; this.res[gain[0]]+=gain[1]*mult;
      this._feed(`${{'!bois':'🪵','!pierre':'🪨','!chasse':'🍖'}[cmd]} ${user} ${{'!bois':'coupe du bois','!pierre':'taille la pierre','!chasse':'chasse'}[cmd]} (+${gain[1]*mult})`);
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
    if(s>this.stage){ this.stage=s; this._alert('stage',`🎉 La colonie devient : ${STAGES[s].name} !`); }
  }
  // Effets Bits/subs : uniquement des effets temporaires de session, sans hasard.
  cheer(user,bits){
    bits=Math.max(0,Math.floor(bits)); if(!bits) return; this.bitsTotal+=bits; this._credit(user,Math.floor(bits/25));
    const wood=Math.round(bits/10); this.res.bois+=wood;
    if(bits>=500){
      const n=this.now();
      if(this.phareActive()){ this.special.until+=PHARE_MS; this._alert('bits',`💎 ${user} prolonge le Phare de la session (+10 min) !`); }
      else { this.special={name:'Phare de la session',until:n+PHARE_MS}; this._alert('bits',`💎 ${user} allume le Phare : gains du chat ×2 pendant 10 min !`); }
    } else this._alert('bits',`💎 ${user} : ${bits} Bits → +${wood} bois`);
    for(const g of this.goals) if(!g.done&&this.bitsTotal>=g.bits){ g.done=true; this.weather='orage magique'; this.weatherUntil=this.now()+ORAGE_MS; this._alert('goal',`⚡ Objectif communautaire atteint : ${g.label} ! Chaque !bois donne aussi 1 pierre pendant 2 min`); }
  }
  sub(user){ this.pop+=1; this.res.nourriture+=10; this._credit(user,20); this._alert('sub',`⭐ ${user} s'abonne : un colon rejoint la colonie !`); }
  _threat(){
    const t=this.nextThreat.type, lvl=this.stage+1;
    if(t==='raid'){
      const towers=this.count('tour');
      if(towers>=lvl) this._alert('threat',`⚔️ Raid repoussé grâce aux ${towers} tour(s) !`);
      else { const lb=Math.floor(this.res.bois*0.3),lp=Math.floor(this.res.pierre*0.3); this.res.bois-=lb; this.res.pierre-=lp; this._alert('threat',`⚔️ Raid ! Il fallait ${lvl} tour(s) : -${lb} bois, -${lp} pierre`); }
    } else {
      const need=this.pop*3;
      if(this.res.nourriture>=need){ this.res.nourriture-=need; this._alert('threat',`❄️ L'hiver passe : -${need} nourriture`); }
      else { const gone=Math.max(0,Math.min(this.pop-1,Math.ceil((need-this.res.nourriture)/3))); this.res.nourriture=0; this.pop-=gone; this._alert('threat',`❄️ Hiver rude : ${gone} colon(s) partent faute de nourriture`); }
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
      else if(n-this.lastFamine>=MIN){ this.pop--; this.lastFamine=n; this._log('🍖 Famine : un colon quitte la colonie. !chasse ou une ferme !'); }
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
    return {res:this.res,pop:this.pop,buildings:this.buildings,weather:this.weather,special:this.special,bitsTotal:this.bitsTotal,goals:this.goals,
      vote:this.vote&&{title:this.vote.title,tally,ends:this.vote.ends},seed:this.seed,leaderboard:top,log:this.log,feed:this.feed,alert:this.alert,cooldownMs:this.cooldownMs,goal:this.goals[0],
      stage:STAGES[this.stage].name,threat:this.nextThreat,towersNeeded:this.stage+1,towers:this.count('tour'),costs,active:this.activeViewers(),now:this.now()};
  }
}
if(typeof module!=='undefined'&&module.exports) module.exports={Colony,BUILDINGS,STAGES,layout,mulberry};
else globalThis.TwitchColony={Colony,BUILDINGS,STAGES,layout,mulberry};
