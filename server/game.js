// Logique de la colonie. Tout est lié à la SESSION de stream : rien ne persiste
// d'un stream à l'autre, et rien n'est converti en avantage hors stream.
const BUILDINGS = { hutte:{bois:20,pierre:0,pop:2}, ferme:{bois:30,pierre:10,food:1}, carriere:{bois:40,pierre:0}, tour:{bois:60,pierre:40} };
class Colony {
  constructor(opts={}){ this.cooldownMs=opts.cooldownMs??5000; this.voteDurationMs=opts.voteDurationMs??30000; this.reset(); }
  reset(){
    this.res={bois:10,pierre:0,nourriture:20}; this.pop=3; this.buildings=[];
    this.leaders={}; this.optout=new Set(); this.vote=null; this.weather='clair';
    this.special=null; this.bitsTotal=0; this.goals=[{bits:5000,label:'Orage magique',done:false}];
    this.log=[]; this.last={}; this.startedAt=Date.now();
  }
  _log(m){ this.log.unshift({t:Date.now(),m}); this.log=this.log.slice(0,12); }
  _credit(user,pts){ if(!user||this.optout.has(user.toLowerCase())) return; this.leaders[user]=(this.leaders[user]||0)+pts; }
  _cool(user,cmd){ const k=user+cmd,n=Date.now(); if(this.last[k]&&n-this.last[k]<this.cooldownMs) return false; this.last[k]=n; return true; }
  chat(user,text){
    const [cmd,arg]=String(text).trim().toLowerCase().split(/\s+/);
    if(cmd==='!optout'){ this.optout.add(user.toLowerCase()); delete this.leaders[user]; this._log(`${user} ne figure plus au classement`); return; }
    if(cmd==='!optin'){ this.optout.delete(user.toLowerCase()); return; }
    if(!this._cool(user,cmd)) return;
    const gain={'!bois':['bois',2],'!pierre':['pierre',1],'!chasse':['nourriture',2]}[cmd];
    if(gain){ this.res[gain[0]]+=gain[1]; this._credit(user,1); return; }
    if(cmd==='!vote'&&this.vote&&this.vote.options.includes(arg)){ this.vote.voters[user]=arg; this._credit(user,1); return; }
    if(cmd==='!construire'&&BUILDINGS[arg]) this.startVote([arg,'attendre'],`Construire ${arg} ?`);
  }
  startVote(options,title='Que construit la colonie ?'){
    if(this.vote) return; this.vote={title,options,voters:{},ends:Date.now()+this.voteDurationMs}; this._log(`Vote : ${title}`);
  }
  _closeVote(){
    const c={}; Object.values(this.vote.voters).forEach(o=>c[o]=(c[o]||0)+1);
    const win=Object.entries(c).sort((a,b)=>b[1]-a[1])[0]; this.vote=null;
    if(!win){ this._log('Vote sans participants'); return; }
    this._log(`Le chat a choisi : ${win[0]}`); if(BUILDINGS[win[0]]) this.build(win[0]);
  }
  build(name){
    const b=BUILDINGS[name]; if(this.res.bois<b.bois||this.res.pierre<b.pierre){ this._log(`Pas assez de ressources pour ${name}`); return; }
    this.res.bois-=b.bois; this.res.pierre-=b.pierre; this.buildings.push(name); if(b.pop) this.pop+=b.pop; this._log(`Nouvelle construction : ${name}`);
  }
  // Effets Bits/subs : uniquement des effets temporaires de session.
  cheer(user,bits){
    bits=Math.max(0,Math.floor(bits)); this.bitsTotal+=bits; this._credit(user,Math.floor(bits/10));
    this.res.bois+=Math.floor(bits/100)*10;
    if(bits>=500){ this.special={name:'Phare de la session',until:Date.now()+10*60000}; this._log(`${user} offre le Phare de la session !`); }
    else this._log(`${user} : ${bits} Bits → +${Math.floor(bits/100)*10} bois`);
    for(const g of this.goals) if(!g.done&&this.bitsTotal>=g.bits){ g.done=true; this.weather='orage magique'; this.weatherUntil=Date.now()+120000; this._log(`Objectif communautaire atteint : ${g.label} !`); }
  }
  sub(user){ this.pop+=1; this.res.nourriture+=10; this._credit(user,20); this._log(`${user} s'abonne : un colon rejoint la colonie`); }
  tick(){
    const n=Date.now(), farms=this.buildings.filter(b=>b==='ferme').length, q=this.buildings.filter(b=>b==='carriere').length;
    this.ticks=(this.ticks||0)+1;
    if(this.ticks%10===0){ this.res.nourriture=Math.max(0,this.res.nourriture+farms*2-Math.ceil(this.pop/4)); this.res.pierre+=q; }
    if(this.vote&&n>this.vote.ends) this._closeVote();
    if(this.special&&n>this.special.until){ this._log('Le Phare de la session s\'éteint'); this.special=null; }
    if(this.weatherUntil&&n>this.weatherUntil){ this.weather='clair'; this.weatherUntil=0; }
  }
  state(){
    const top=Object.entries(this.leaders).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,pts],i)=>({name,pts,title:i===0?'Fondateur de la session':''}));
    const tally={}; if(this.vote){ this.vote.options.forEach(o=>tally[o]=0); Object.values(this.vote.voters).forEach(o=>tally[o]++); }
    return {res:this.res,pop:this.pop,buildings:this.buildings,weather:this.weather,special:this.special,bitsTotal:this.bitsTotal,goals:this.goals,
      vote:this.vote&&{title:this.vote.title,tally,ends:this.vote.ends},leaderboard:top,log:this.log};
  }
}
if(typeof module!=='undefined'&&module.exports) module.exports={Colony,BUILDINGS};
else globalThis.TwitchColony={Colony,BUILDINGS};
