// Logique de la colonie (Node + navigateur). Tout est lié à la SESSION de stream :
// rien ne persiste d'un stream à l'autre, et rien n'est converti en avantage hors stream.
// Aucun hasard payant : votes gratuits et bruit des raids utilisent des canaux distincts ; aucun paiement ne relance un tirage.
// Réglages partagés (durée de partie, seuils Bits, objectif) : server/game-config.js, chargé avant ce fichier dans le navigateur.
const GC=(typeof module!=='undefined'&&module.exports&&typeof require==='function')?require('./game-config'):globalThis.TwitchColonyConfig;
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
  forge:{bois:170,pierre:140,stage:5,desc:'chaque !defendre compte double'},
};
// Merveille : construction communautaire en 3 phases, débloquée au palier Ville. Objectif long terme.
// Chaque phase s'ouvre à un palier (Ville, Grande ville, Cité) : la Merveille rythme la fin de partie au lieu d'un long plateau.
const WONDER={stage:4,phaseStage:[4,5,6],phases:[{bois:450,pierre:300},{bois:780,pierre:540},{bois:7000,pierre:4800}],name:'Merveille',
  // Passe GD 3 : la dernière phase se construit en 3 tranches ; jalons à 33 % et 66 % = récompense + fête 2 min + raid « garde de la Merveille ».
  cuts:[1/3,2/3,1],finalMinMs:3*3600000,capRampMs:30*60000,milestone:{bois:60,pierre:30,feteMs:2*60000,raidBonus:6,raidInMs:3*60000}};
const ROLES={'bûcheron':'!bois','bucheron':'!bois','mineur':'!pierre','chasseur':'!chasse','garde':'!defendre'}, ROLE_MULT=1.5, STREAK_MULT=1.25, STREAK_WIN=10*60000;
// Bits par paliers (déterministes, session uniquement, plafonnés) : 100 = ressources, 500 = Phare, 1500 = Bénédiction, 5000 = orage (objectif)
// Seuils configurables (BITS_TIERS / GOAL_STEP dans .env, voir game-config.js) ; effets et plafonds fixes.
const bitsTiersList=(t,goal)=>[{bits:100,label:'+1 bois / 10 Bits pour le village'},{bits:t.remparts,label:'Remparts : +15 défense du Foyer pendant 10 min'},{bits:t.phare,label:'Phare : gains du chat ×1,5 pendant 10 min'},{bits:t.benediction,label:'Bénédiction : production passive ×2 pendant 5 min'},{bits:goal,label:'Orage magique : cadeau au village + !bois donne de la pierre'}];
const BITS_TIERS=bitsTiersList(GC.DEFAULTS.bitsTiers,GC.DEFAULTS.goalStep);
// ─── Grand Foyer : bâtiment central à protéger (déterministe, aucun hasard) ───
// Raid : force = RAID_BASE + RAID_STEP × palier. Dégâts = force − défense (tours/palissades, défenseurs !defendre, remparts, stratégie votée).
const FOYER={max:100,regenMs:2*60000,raidBase:22,raidStep:6,smallBelow:8,smallRaidBase:20,smallRaidStep:4,towerDef:10,defenderPts:3,defenderCap:24,defRef:8,smallMax:2,scaleK:0.7,smallScaleK:0.35,wallsDef:15,wallsMs:10*60000,wallsMaxMs:20*60000,
  repair:{bois:10,pierre:5,hp:5},stealPerDmg:3,stealMaxShare:0.3,reward:{bois:40,pierre:20},rewardPerStage:1,stratDef:10,warnMs:2*60000,defendWin:5*60000,
  revive:{ms:3*60000,max:2,hp:40,bits:[1000,2500],viewers:[3,6],viewersPerActive:[0.3,0.5]},
  // Passe GD 7 : avant 3 h, une destruction donne une « Chute » (rallumage gratuit immédiat, −30 % bois/pierre) au lieu d'un game over.
  chute:{loss:0.3,hp:40},
  // Passe GD 7 : raid de climax avant la Merveille (une fois, à 2 h 30 ou à l'ouverture de la dernière tranche si plus tard).
  // GD11 : climax critique (bonus 58–76), récupérable avec les actions gratuites ; seuil de danger abaissé à 40 PV.
  // vacillantAt : seuil sous lequel le Foyer est « vacillant » (menace visible, rallumage pertinent) sans Chute.
  // GD12 : climax PRÉPARABLE. La préparation gratuite (renforts !reparer pendant l'annonce) remplace l'ancien poids graine 0,6 ;
  // la graine ne garde que ±seedHp PV. Brèche : un climax n'abat jamais plus de breach (±seedHp) PV d'un coup, le surplus pille le chantier.
  // Calendrier : annonce au plus tôt à atMs ET à (accès complet − leadMs), pendant l'avant-dernière tranche ; fin ≥ minGapMs après l'impact.
  climax:{atMs:150*60000,inMs:3*60000,leadMs:30*60000,minGapMs:15*60000,bonus:55,bonusSpread:14,seedHp:3,breach:92,holdHp:25,prep:{min:3,perActive:0.25},fullK:1},vacillantAt:40,
  // GD11 : assaut à 1 h 45, toutes audiences ; petite perte récupérable sans Bits.
  assault:{atMs:105*60000,inMs:3*60000,bonus:10,fullK:1,minViewers:1}};
// GD12 : cérémonie (cosmétique) entre « Merveille prête » et l'accès complet : un jalon visible au plus toutes les 10 min.
const CEREMONY={everyMs:10*60000,feteMs:60000,steps:['bannières hissées','lanternes accrochées','chœurs en répétition','tapis de fleurs déroulé','feux de joie dressés','statue voilée installée','cloches accordées','tribune pavoisée']};
const BLESS_MS=5*60000, BLESS_QUOTA={windowMs:60*60000,max:1}; // au plus 5 min de Bénédiction par heure
const DEFIS=[{type:'gather',cmd:'!bois',res:'bois',label:'coupez du bois'},{type:'vote',label:'votez nombreux au prochain vote'},{type:'gather',cmd:'!pierre',res:'pierre',label:'taillez de la pierre'},{type:'gather',cmd:'!chasse',res:'nourriture',label:'chassez'},{type:'survive',label:'survivez à la prochaine menace sans perte'}];
const PENDING_MAX=3, DEFI_EVERY=5*60000, DEFI_MS=3*60000;
const BADGES={breche:'Brèche tenue',first:'Premières fondations',raid:'Raid repoussé',winter:'Hiver survécu',defi3:'3 défis réussis',orage:'Orage magique',fete:'Fête au village',wonder:'Merveille achevée',cite:'Cité !',hameau:'Hameau',village:'Village',bourg:'Bourg',ville:'Ville',grandeville:'Grande ville',merv1:'Merveille : phase 1',merv2:'Merveille : phase 2'};
// Paliers : la partie est TERMINÉE quand la colonie devient une Cité (objectif de session, ≥ 3 h avec une audience typique).
const STAGES=[{name:'Campement',min:0},{name:'Hameau',min:3},{name:'Village',min:6},{name:'Bourg',min:10},{name:'Ville',min:15},{name:'Grande ville',min:18},{name:'Cité',min:21}];
const STAGE_BADGES=['','hameau','village','bourg','ville','grandeville','cite'];
// Équilibrage (voir server/simulate.js) : coût × 1,25^(exemplaires) × TOTAL_GROWTH^(bâtiments déjà construits)
// Adaptation à l'audience : le rendement d'une commande vaut (REF/A)^YIELD_EXP quand A (viewers actifs, lissé sur 10 min) dépasse REF.
// Progression totale ∝ A^(1-YIELD_EXP) : 5 → 100 viewers ≈ +25 %. Les coûts ne dépendent plus du nombre de viewers.
const YIELD_REF=5, YIELD_EXP=0.92, ACTIVE_SMOOTH_MS=10*60000;
const SUB_POP={windowMs:20*60000,max:2}, PHARE_QUOTA=3, TOTAL_GROWTH=1.19, CHAT_MULT_PHARE=1.5, PHARE_MAX_MS=20*60000, BITS_CAP={windowMs:10*60000,max:30};
const GOAL_STEP=GC.DEFAULTS.goalStep, GOAL_GIFT={bois:60,pierre:30,nourriture:30};
const MIN=60000, PHARE_MS=10*MIN, ORAGE_MS=2*MIN, THREAT_MS=15*MIN, ACTIVE_WINDOW=5*MIN;

// ─── Placement 3D (village isométrique) ───
// Déterministe : même seed + même liste ⇒ mêmes positions. Chaque bâtiment i dépend
// uniquement de la seed et des bâtiments 0..i-1 : les bâtiments existants ne bougent jamais.
const FOOT={forge:[2,1],hutte:[1,1],ferme:[2,2],carriere:[2,1],tour:[1,1],grenier:[2,1],palissade:[2,1],marche:[2,2],atelier:[2,1],merveille:[3,3]};
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
    // Durée de partie (GAME_LENGTH) : seuils de palier, Merveille et croissance des coûts. Seuils Bits / objectif.
    const L=GC.LENGTHS[opts.gameLength]||GC.LENGTHS[GC.DEFAULTS.gameLength]; this.gameLength=GC.LENGTHS[opts.gameLength]?opts.gameLength:GC.DEFAULTS.gameLength;
    let prev=-1; this.STAGES=STAGES.map((st,i)=>{ const m=i?Math.max(prev+1,Math.round(st.min*L.stageMul)):0; prev=m; return {name:st.name,min:m}; });
    this.WPH=WONDER.phases.map(p=>({bois:Math.round(p.bois*L.wonderMul/10)*10,pierre:Math.round(p.pierre*L.wonderMul/10)*10})); this.growth=L.growth; this.costMul=L.costMul||1; this.raidMul=Math.min(1,L.stageMul||1); this.CUTS=L.wonderCuts||WONDER.cuts; const Lf=L.foyer||{}; this.FO={...FOYER,...Lf,revive:{...FOYER.revive,...(Lf.revive||{})},climax:{...FOYER.climax,...(Lf.climax||{})},assault:Lf.assault===null?null:{...FOYER.assault,...(Lf.assault||{})}};
    this.tiers={...GC.DEFAULTS.bitsTiers,...(opts.bitsTiers||{})}; this.goalStep=opts.goalStep||GC.DEFAULTS.goalStep; this.bitsTiers=bitsTiersList(this.tiers,this.goalStep);
    this.threatMs=opts.threatMs??L.threatMs??THREAT_MS; this.now=opts.now||(()=>Date.now()); this.rng=opts.rng||Math.random; this.fixedSeed=opts.seed;
    this.reset();
  }
  reset(){
    this.seed=this.fixedSeed??Math.floor(this.rng()*1e9);
    this.res={bois:10,pierre:0,nourriture:20}; this.pop=3; this.buildings=[];
    this.leaders={}; this.optout=new Set(); this.vote=null; this.weather='clair'; this.weatherUntil=0;
    this.special=null; this.bitsTotal=0; this.goal={from:0,to:this.goalStep,tier:1,label:'Orage magique'}; this.goalsReached=0;
    this.log=[]; this.feed=[]; this.alert=null; this.last={}; this.seen={}; this.startedAt=this.now(); this.ticks=0; this.stage=0;
    this.nextThreat={type:'raid',at:this.now()+this.threatMs}; this.lastFamine=0;
    this.foyer={hp:this.FO.max,max:this.FO.max,lastRegen:this.now()}; this.defenders={}; this.wallsUntil=0; this.strategy=null; this.stratAsked=0; this.revival=null; this.revivals=0; this.chutes=0; this.climaxDone=false; this.climaxHitAt=0; this.climaxPrep=null; this.climaxPrev=null; this.climaxFell=false; this.climaxWave=0; this.breach=null; this.ceremonySteps=0; this.nextCeremony=0; this.saveMarks=0; this.saveMarkKey=null; this.assaultDone=false; this.lastAssaultDone=false; this.eclat=0; this.readyAnnounced=false; this.inaugurationExtra=0; this.sessionFullMs=(this.gameLength==='longue'?315:188)*60000+Math.floor(mulberry(this.seed^0x1a93)()* (this.gameLength==='longue'?18:14))*60000; this.vacillant=0; this.vacillantLatched=false; this.gameOver=null; this.lastRaid=null; this.stats={raids:0,repelled:0,repairs:0,destructions:0,destructions3h:0};
    this.builders={}; this.patrons={}; this.roles={}; this.windows={}; this.contrib={}; this.named=[]; this.badges=[]; this.defisWon=0;
    this.wonder=0; this.wonderPart=0; this.wonderPaid={bois:0,pierre:0}; this.wonderCapOpened=false; this.wonderIndex=null; this.wallsBy=null; this.blessUntil=0; this.feteUntil=0; this.defi=null; this.nextDefi=this.now()+60000; this.projectsDone=[]; this.completedAt=0; this.pendingBuild=[];
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
      {id:'p-forge',label:'Forge (débloquée à la Grande ville)',cur:c('forge'),need:1,stage:5},
    ].filter(p=>(p.stage||0)<=this.stage); }
  objectives(){ const n=this.now(), d=this.defi;
    const short=d&&!d.done&&n<d.ends?{label:'Défi : '+d.label,cur:Math.min(d.count,d.target),need:d.target,ends:d.ends}:{label:'Prochain défi communautaire',cur:0,need:1,ends:this.nextDefi};
    // À la Cité : barre d'épargne pour la phase suivante de la Merveille (la fin de partie avance visiblement)
    const wc=this.stage===this.STAGES.length-1&&this.wonderCost();
    if(wc&&this.wonderFinal()){ const P=this.wonderPaid, f=this.wonderCapFrac(), left=Math.max(0,this.startedAt+this.wonderFullMs()-n), lk=this.wonderLockedUntil();
      var save={label:(this.wonderReady()?`${WONDER.name} prête — inauguration dans ${Math.max(1,Math.ceil(left/60000))} min${this.eclat?` · ✨ Éclat ${this.eclat}`:''} · `:'')+`${WONDER.name}, dernière tranche : ${P.bois}/${wc.bois} bois · ${P.pierre}/${wc.pierre} pierre déposés`+(lk?` · ouverture dans ${Math.ceil((lk-n)/60000)} min`:f<1?` · plafond ${Math.round(f*100)} %, accès complet dans ${Math.ceil(left/60000)} min`:''),cur:Math.floor(this.wonderPaidFrac()*100),need:100}; }
    else if(wc){ const b=Math.min(1,this.res.bois/wc.bois), pi=Math.min(1,this.res.pierre/wc.pierre); var save={label:`Épargne pour la ${WONDER.name}, ${this.wonderStep()} : ${Math.floor(Math.min(this.res.bois,wc.bois))}/${wc.bois} bois · ${Math.floor(Math.min(this.res.pierre,wc.pierre))}/${wc.pierre} pierre`,cur:Math.floor((b+pi)*50),need:100}; }
    const p=save||this.projects().find(p=>p.cur<p.need&&!(p.live&&this.nextThreat.type!=='hiver'))||{label:'Tous les projets sont faits : visez la Merveille !',cur:1,need:1};
    const cite=this.STAGES[this.STAGES.length-1].min, nx=this.STAGES[this.stage+1];
    return {short,mid:{label:p.label,cur:Math.min(p.cur,p.need),need:p.need},
      long:{label:`Cité (${Math.min(this.buildings.length,cite)}/${cite} bâtiments) + ${WONDER.name} (${this.wonder}/${this.WPH.length} phases · ${this.wonderPct()} %)`,cur:Math.min(this.buildings.length,cite)+Math.round(3*this.wonderPct()*this.WPH.length/100),need:cite+this.WPH.length*3},
      nextStage:nx?{name:nx.name,cur:this.buildings.length,need:nx.min}:null};
  }
  // La dernière tranche se finance par dépôts sous un plafond progressif. GD11 : inauguration après 3 h 08 au minimum, calendrier propre à la graine.
  wonderCuts(){ return this.CUTS||WONDER.cuts; }
  wonderParts(){ return this.wonderCuts().length; }
  wonderFinal(){ return this.wonderLast()&&this.wonderPart===this.wonderParts()-1; }
  // GD11 : calendrier du chantier fixé par la graine au reset, jamais par les Bits.
  // Longue : consolidation sur 120 min avec jalons réels tous les sixièmes ; autres modes : ouverture à 2 h 30.
  wonderFullMs(){ return this.sessionFullMs; }
  wonderRampMs(){ return this.gameLength==='longue'?120*60000:WONDER.capRampMs; }
  wonderOpenMs(){ return this.gameLength==='longue'?this.wonderFullMs()-this.wonderRampMs():WONDER.finalMinMs-WONDER.capRampMs; }
  wonderCapFrac(){ const t=this.now()-this.startedAt, open=this.wonderOpenMs(), full=this.wonderFullMs(), span=Math.max(this.wonderRampMs(),full-open); return Math.min(1,Math.max(0,(t-open)/span)); }
  wonderLockedUntil(){ return this.wonderFinal()&&this.wonderCapFrac()<=0?this.startedAt+this.wonderOpenMs():0; }
  wonderOpen(){ const k=WONDER.phaseStage[this.wonder]; return k!=null&&this.stage>=k&&!this.wonderLockedUntil(); }
  wonderNextStage(){ const k=WONDER.phaseStage[this.wonder]; return k!=null?this.STAGES[k].name:null; }
  wonderLast(){ return this.wonder===this.WPH.length-1; }
  wonderCost(){ const p=this.WPH[this.wonder]; if(!p) return null; if(!this.wonderLast()) return {...p}; const C=[0,...this.wonderCuts()], i=this.wonderPart, sl=v=>Math.round(v*C[i+1])-Math.round(v*C[i]); return {bois:sl(p.bois),pierre:sl(p.pierre)}; }
  // Dépôt possible maintenant sur la dernière tranche : limité par le reste à payer et par le plafond progressif.
  wonderDeposit(){ const c=this.wonderCost(); if(!c||!this.wonderFinal()) return null; const f=this.wonderCapFrac(), P=this.wonderPaid;
    const lim=k=>Math.max(0,Math.min(c[k]-P[k],Math.round(c[k]*f)-P[k])); return {bois:Math.min(Math.floor(this.res.bois),lim('bois')),pierre:Math.min(Math.floor(this.res.pierre),lim('pierre')),lim:{bois:lim('bois'),pierre:lim('pierre')},cost:c,f}; }
  wonderDepositOk(){ const d=this.wonderDeposit(); if(!d) return false; const ok=k=>d[k]>=Math.min(d.lim[k],Math.ceil(d.cost[k]/4)); return (d.lim.bois+d.lim.pierre)>0&&ok('bois')&&ok('pierre'); }
  // Prête : dernière tranche, plafond < 100 % et le village a déjà de quoi tout payer (seul le plancher de 3 h retient la fin).
  wonderReady(){ const c=this.wonderCost(); if(!c||!this.wonderFinal()||this.wonderCapFrac()>=1||this.stage<WONDER.phaseStage[this.wonder]) return false; const P=this.wonderPaid; return this.res.bois>=c.bois-P.bois&&this.res.pierre>=c.pierre-P.pierre; }
  wonderPaidFrac(){ const c=this.wonderCost(); if(!c||!this.wonderFinal()) return 0; return Math.min(this.wonderPaid.bois/c.bois,this.wonderPaid.pierre/c.pierre); }
  wonderStep(){ return `phase ${this.wonder+1}`+(this.wonderLast()?` (tranche ${this.wonderPart+1}/${this.wonderParts()})`:''); }
  wonderPct(){ const n=this.WPH.length, C=[0,...this.wonderCuts()], i=this.wonderPart; if(!this.wonderLast()) return Math.round(100*this.wonder/n);
    return Math.round(100*(this.wonder+C[i]+(C[i+1]-C[i])*this.wonderPaidFrac())/n); }
  buildWonder(){ const c=this.wonderCost(), lk=this.wonderLockedUntil(); if(c&&lk){ this._log(`${WONDER.name} : la dernière tranche ouvre dans ${Math.ceil((lk-this.now())/60000)} min ; accès complet après ${Math.floor(this.wonderFullMs()/3600000)} h ${Math.round(this.wonderFullMs()%3600000/60000)} min de partie`); return false; } if(!c||!this.wonderOpen()) return false;
    if(this.wonderFinal()) return this._wonderDeposit();
    if(this.res.bois<c.bois||this.res.pierre<c.pierre){ this._log(`${WONDER.name} : il manque ${Math.max(0,Math.ceil(c.bois-this.res.bois))} bois, ${Math.max(0,Math.ceil(c.pierre-this.res.pierre))} pierre`); return false; }
    this.res.bois-=c.bois; this.res.pierre-=c.pierre; if(!this.wonder) this.wonderIndex=this.buildings.length;
    if(this.wonderLast()){ this.wonderPart++; this.wonderPaid={bois:0,pierre:0}; this._wonderMilestone(); return true; }
    return this._wonderPhaseDone(); }
  _wonderDeposit(){ const d=this.wonderDeposit(), c=d.cost, P=this.wonderPaid;
    if(!d.bois&&!d.pierre){ const full=d.lim.bois+d.lim.pierre===0; this._log(full?`${WONDER.name} : plafond atteint (${Math.round(d.f*100)} % de la tranche), accès complet dans ${Math.max(1,Math.ceil((this.startedAt+this.wonderFullMs()-this.now())/60000))} min`:`${WONDER.name} : il manque du bois ou de la pierre pour la dernière tranche`); return false; }
    const before=this.wonderPaidFrac(); this.res.bois-=d.bois; this.res.pierre-=d.pierre; P.bois+=d.bois; P.pierre+=d.pierre;
    if(P.bois>=c.bois&&P.pierre>=c.pierre){ this.wonderPart=0; this.wonderPaid={bois:0,pierre:0}; return this._wonderPhaseDone(); }
    const now=this.wonderPaidFrac(), checkpoints=this.gameLength==='longue'?6:2; if(Math.floor(before*checkpoints)<Math.floor(now*checkpoints)) this._wonderMilestone(true,now);
    else this._log(`🏛️ ${WONDER.name} : dépôt de ${d.bois} bois et ${d.pierre} pierre (dernière tranche ${Math.floor(now*100)} %${d.f<1?`, plafond ${Math.round(d.f*100)} %, accès complet dans ${Math.max(1,Math.ceil((this.startedAt+this.wonderFullMs()-this.now())/60000))} min`:''})`);
    return true; }
  _wonderPhaseDone(){ this.wonder++; this.wonderPart=0; this._alert('build',`🏛️ ${WONDER.name} : phase ${this.wonder}/${this.WPH.length} terminée !`);
    if(this.wonder===this.WPH.length){ this._badge('wonder'); } else this._badge('merv'+this.wonder); this._checkEnd(); return true; }
  // Jalons de la dernière phase (33 %, 66 %, 50 % en longue, puis mi-parcours de la dernière tranche) : récompense gratuite, fête de 2 min et raid « garde de la Merveille » (force +6) dans 3 min.
  _wonderMilestone(half=false,progress=null){ const M=WONDER.milestone, n=this.now(), C=this.wonderCuts(), pct=half?Math.floor(100*(C[C.length-2]+(1-C[C.length-2])*(progress??0.5))):Math.floor(100*C[this.wonderPart-1]);
    this.res.bois+=M.bois; this.res.pierre+=M.pierre; this.feteUntil=Math.max(this.feteUntil,n+M.feteMs); this.wonderMilestones=(this.wonderMilestones||0)+1;
    // Raid « garde » seulement aux jalons historiques (33 % / 66 %…) : les jalons ajoutés en passe GD 5 (50 % et mi-parcours de la dernière tranche) donnent récompense et fête sans raid.
    const named=this._wonderNamed(half); const guard=!half&&pct!==50&&!named; if(guard&&!this.nextThreat.climax&&!this.nextThreat.assault){ this.nextThreat={type:'raid',at:n+M.raidInMs,guard:true}; this.stratAsked=null; }
    this._alert('stage',`🏛️ ${WONDER.name} : jalon ${named?`« ${named} » (${pct} %)`:`${pct} %`} atteint (${half?'consolidation de la dernière tranche':`tranche ${this.wonderPart}/${this.wonderParts()}`} de la phase finale) ! +${M.bois} bois, +${M.pierre} pierre et fête au village.`+(guard?` Des pillards visent le chantier : raid « garde de la ${WONDER.name} » (force ${this.raidPower()}) dans ${Math.round(M.raidInMs/60000)} min, !defendre !`:'')); }
  // Passe GD 8 : premier jalon = « fondations », dernier avant la tranche finale = « flèche ».
  _wonderNamed(half){ if(half) return null; const k=this.wonderPart, P=this.wonderParts(); return k===1?GC.NAMED.fondations:k===P-1?GC.NAMED.fleche:null; }
  // GD12 : la cérémonie attend la fin du climax (impact + minGapMs) : la tension retombe avant l'inauguration.
  climaxSettled(){ const C=this.FO.climax; return !!this.climaxHitAt&&!this.climaxFell&&!(this.nextThreat&&this.nextThreat.climax)&&this.now()>=this.climaxHitAt+(C.minGapMs||0); }
  _checkEnd(){ if(this.gameOver||this.revival||this.now()-this.startedAt<WONDER.finalMinMs||this.completedAt||this.stage<this.STAGES.length-1||this.wonder<this.WPH.length||!this.climaxSettled()) return; this.completedAt=this.now(); const m=Math.round((this.completedAt-this.startedAt)/60000);
    this._alert('stage',`🏆 Partie terminée : Cité et ${WONDER.name} achevées en ${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')} ! Bravo le chat !`+(this.chutes?` Bilan : ${this.chutes} chute${this.chutes>1?'s':''} du Foyer surmontée${this.chutes>1?'s':''}.`:' Bilan : aucune chute du Foyer.')); }
  rates(){ const bl=this.now()<this.blessUntil?2:1, f=this.count('ferme'), m=this.count('marche');
    return {bois:(Math.floor(this.pop/2)+m)*6*bl,pierre:(this.count('carriere')+m)*6*bl,nourriture:(f*2*bl-Math.ceil(this.pop/4))*6}; }
  viewer(u){ const n=this.now(), cd={}; ['!bois','!pierre','!chasse','!vote'].forEach(c=>{ const l=this.last[u+c]; cd[c]=l?Math.max(0,l+this.cooldownMs-n):0; }); return {name:u,cd,builder:this.builders[u]||0,patron:this.patrons[u]||0,role:this.roles[u]||null,streak:this.streak(u),contrib:this.contrib[u]||0}; }
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
    const b=BUILDINGS[name], k=this.costMul*Math.pow(1.25,this.count(name))*Math.pow(this.growth,this.buildings.length);
    return {bois:Math.ceil(b.bois*k),pierre:Math.ceil(b.pierre*k)};
  }
  affordable(name){ const c=this.cost(name); return this.res.bois>=c.bois&&this.res.pierre>=c.pierre; }
  // UX11 : quantités entières à l'affichage (overlay + chat) ; l'équilibrage interne garde ses fractions.
  missing(name){ const c=this.cost(name),m=[]; for(const r of ['bois','pierre']) if(this.res[r]<c[r]) m.push(`${Math.ceil(c[r]-this.res[r])} ${r}`); return m.join(', '); }
  phareActive(){ return !!(this.special&&this.now()<this.special.until); }
  chat(user,text){
    const [cmd,arg]=String(text).trim().toLowerCase().split(/\s+/);
    if(cmd==='!optout'){ this.optout.add(user.toLowerCase()); delete this.leaders[user]; this._log(`${user} ne figure plus au classement`); return; }
    if(cmd==='!optin'){ this.optout.delete(user.toLowerCase()); return; }
    if(cmd==='!aide'){ this._feed(`❔ Commandes : !bois !pierre !chasse · !defendre !reparer · !rejoindre garde · !vote <option> · !construire <bâtiment> · !rejoindre bûcheron|mineur|chasseur · !optout`); return; }
    if(!this._cool(user,cmd)) return;
    this.seen[user]=this.now(); const wk=Math.floor(this.now()/STREAK_WIN); (this.windows[user]=this.windows[user]||new Set()).add(wk);
    if(cmd==='!rejoindre'){ const r=ROLES[arg]; if(!r) return; const nm=arg==='bucheron'?'bûcheron':arg; this.roles[user]=nm; this._feed(`🧭 ${user} devient ${nm} (+50 % sur ${r})`); return; }
    if(this.revival&&cmd==='!rallumer'){ this.revival.who.add(user); this._feed(`🔥 ${user} ravive le Foyer (${this.revival.who.size}/${this.revival.viewers})`); this._builder(user,2); this._checkRevival(); return; }
    if(cmd==='!defendre'){ if(this.revival||this.gameOver) return; this.defenders[user]=this.now(); this._feed(`🛡️ ${user} ${this.roles[user]==='garde'?'(garde) ':''}défend le Foyer`); this._builder(user,1); return; }
    if(cmd==='!reparer'){ const c=this.FO.repair, prep=this.climaxPending()&&this.climaxPrep; if(this.revival||this.gameOver||(this.foyer.hp>=this.foyer.max&&!prep)) return;
      if(this.res.bois<c.bois||this.res.pierre<c.pierre){ this._feed(`🔧 ${user} : réparer coûte ${c.bois} bois + ${c.pierre} pierre`); return; }
      this.res.bois-=c.bois; this.res.pierre-=c.pierre;
      // GD12 : pendant l'annonce du climax, chaque viewer distinct qui répare renforce la brèche (préparation gratuite, ressources du village).
      if(prep){ const had=prep.users.has(user); prep.users.add(user); if(!had) this._builder(user,1); if(this.foyer.hp>=this.foyer.max){ this.stats.renforts=(this.stats.renforts||0)+1; this._feed(`🧱 ${user} renforce la brèche (${Math.min(prep.users.size,this.climaxPrepNeed())}/${this.climaxPrepNeed()} renforts, à défense max −${this.climaxMaxDmg()} PV)`); return; } }
      this.foyer.hp=Math.min(this.foyer.max,this.foyer.hp+c.hp); if(this.foyer.hp>(this.FO.vacillantAt||55)) this.vacillantLatched=false; this.stats.repairs++; this._feed(`🔧 ${user} répare le Foyer (+${c.hp} PV → ${this.foyer.hp})`); this._builder(user,1); return; }
    const gain={'!bois':['bois',2],'!pierre':['pierre',1],'!chasse':['nourriture',2]}[cmd];
    if(gain){
      const role=this.roles[user]&&ROLES[this.roles[user]]===cmd?ROLE_MULT:1, streak=this.streak(user)>=3?STREAK_MULT:1, atelier=this.count('atelier')&&cmd!=='!chasse'?1.25:1;
      const mult=(this.phareActive()?CHAT_MULT_PHARE:1)*role*streak*atelier; const add=gain[1]*mult*this.yieldFactor(); this.res[gain[0]]+=add; this.contrib[user]=(this.contrib[user]||0)+add;
      if(this.defi&&this.defi.type==='gather'&&this.defi.cmd===cmd&&this.now()<this.defi.ends) this._defiProgress(user);
      this._feed(`${{'!bois':'🪵','!pierre':'🪨','!chasse':'🍖'}[cmd]} ${user} ${{'!bois':'coupe du bois','!pierre':'taille la pierre','!chasse':'chasse'}[cmd]} (+${add>=1&&Number.isInteger(add)?add:add.toFixed(add<0.1?2:1).replace('.',',')} ${gain[0]})`);
      if(cmd==='!bois'&&this.weather==='orage magique') this.res.pierre+=1;
      this._builder(user,1); return;
    }
    if(cmd==='!vote'&&this.vote&&this.vote.options.includes(arg)){ if(!this.vote.voters[user]&&this.defi&&this.defi.type==='vote'&&!this.defi.done) this._defiProgress(user); this.vote.voters[user]=arg; this._feed(`🗳️ ${user} vote ${arg}`); this._builder(user,1); return; }
    if(cmd==='!construire'&&(BUILDINGS[arg]||arg==='merveille')){
      if(this.vote){ return this._queueBuild(user,arg); }
      if(arg==='merveille'){ if(this.wonderOpen()&&this.wonderCost()) this.startVote(['merveille','attendre'],`Construire la ${this.wonderStep()} de la ${WONDER.name} ?`); return; }
      if(!this.unlocked(arg)){ this._log(`${arg} : débloqué au palier ${this.STAGES[BUILDINGS[arg].stage].name}`); return; }
      if(!this.affordable(arg)){ this._log(`${arg} : il manque ${this.missing(arg)}`); return; }
      this.startVote([arg,'attendre'],`Construire ${arg} ?`);
    }
  }
  // File d'attente des !construire reçus pendant un vote : 3 au maximum, sans doublon, ouverts un par un ensuite.
  _queueBuild(user,arg){ const q=this.pendingBuild;
    if(arg!=='merveille'&&!this.unlocked(arg)){ this._feed(`🏗️ ${user} : ${arg} est débloqué au palier ${this.STAGES[BUILDINGS[arg].stage].name}`); return; }
    if(q.includes(arg)){ this._feed(`🏗️ ${arg} est déjà proposé après le vote en cours`); return; }
    if(q.length>=PENDING_MAX){ this._feed(`🏗️ File pleine (${PENDING_MAX} propositions) : réessayez après les votes en cours`); return; }
    q.push(arg); this._feed(`🏗️ ${user} : ${arg} proposé après le vote en cours (file ${q.length}/${PENDING_MAX})`); }
  _openPending(){ while(!this.vote&&this.pendingBuild.length){ const b=this.pendingBuild.shift();
      if(b==='merveille'){ if(this.wonderOpen()&&this.wonderCost()) this.startVote(['merveille','attendre'],`Construire la ${this.wonderStep()} de la ${WONDER.name} ?`); continue; }
      if(!this.affordable(b)){ this._log(`${b} (proposé) : il manque ${this.missing(b)}, proposition retirée`); continue; }
      this.startVote([b,'attendre'],`Construire ${b} ? (proposé par le chat)`); } }
  startVote(options,title='Que construit la colonie ?'){
    if(this.vote||!options.length) return false; this.vote={title,options,voters:{},ends:this.now()+this.voteDurationMs}; this._log(`Vote : ${title}`); return true;
  }
  // Vote automatique : uniquement les bâtiments abordables.
  autoVote(){
    if(this.vote) return false;
    // À la Cité, seule la Merveille reste à finir : les votes automatiques épargnent pour elle (!construire reste possible).
    const saving=this.stage===this.STAGES.length-1&&this.wonderCost();
    const opts=saving?[]:Object.keys(BUILDINGS).filter(b=>this.unlocked(b)&&this.affordable(b));
    const wc=this.wonderCost(); if(this.wonderOpen()&&wc&&(this.wonderFinal()?this.wonderDepositOk():this.res.bois>=wc.bois&&this.res.pierre>=wc.pierre)) opts.push('merveille');
    if(!opts.length&&saving){ this._log(`🏛️ Le village épargne pour la ${WONDER.name} (${this.wonderStep()}) : il manque ${Math.max(0,Math.ceil(wc.bois-this.res.bois))} bois, ${Math.max(0,Math.ceil(wc.pierre-this.res.pierre))} pierre`); return false; }
    if(!opts.length){ this._log(`Rien d'abordable : il manque ${this.missing('hutte')} pour une hutte. À vos !bois !`); return false; }
    return this.startVote(opts);
  }
  _closeVote(){
    const voters=this.vote.voters, c={}; Object.values(voters).forEach(o=>c[o]=(c[o]||0)+1); this.vote=null;
    // Passe GD 6 : vote de stratégie avec moins de FO.stratDefaultBelow votants ⇒ « murs » par défaut (déterministe, gratuit) : lisse la menace des petites audiences.
    const nv=Object.keys(voters).length; if(this.FO.stratDefaultBelow&&nv<this.FO.stratDefaultBelow&&this._stratVote){ this._stratVote=false; this.strategy='murs'; this._log(`Vote de stratégie (${nv} votant${nv>1?'s':''}) : « murs » par défaut`); this._alert('vote','🛡️ Stratégie par défaut : renforcer les murs (+10 défense pour ce raid)'); return; }
    this._stratVote=false;
    const max=Math.max(0,...Object.values(c)); if(!max){ this._log('Vote sans participants'); return; }
    const top=Object.keys(c).filter(o=>c[o]===max);
    const win=top[Math.floor(this.rng()*top.length)];
    if(top.length>1) this._log(`Égalité (${top.join(' / ')}) départagée au hasard : ${win}`);
    this._log(`Le chat a choisi : ${win}`);
    Object.entries(voters).forEach(([u,o])=>{ if(o===win) this._builder(u,2); });
    if(win==='murs'||win==='reserves'){ this.strategy=win; this._alert('vote',win==='murs'?'🛡️ Stratégie : renforcer les murs (+10 défense pour ce raid)':'🛡️ Stratégie : cacher les réserves (aucune ressource volée, le Foyer encaisse)'); }
    else if(BUILDINGS[win]) this.build(win); else if(win==='merveille') this.buildWonder();
  }
  build(name){
    if(!this.affordable(name)){ this._log(`Pas assez de ressources pour ${name} (il manque ${this.missing(name)})`); return false; }
    const c=this.cost(name); this.res.bois-=c.bois; this.res.pierre-=c.pierre; this.buildings.push(name);
    if(BUILDINGS[name].pop) this.pop+=BUILDINGS[name].pop; if(this.buildings.length===1) this._badge('first'); this._alert('build',`🏗️ Nouvelle construction : ${name} !`);
    this._checkStage(); return true;
  }
  _checkStage(){
    let s=0; this.STAGES.forEach((st,i)=>{ if(this.buildings.length>=st.min) s=i; });
    if(s>this.stage){ this.stage=s; this._badge(STAGE_BADGES[s]);
      const unl=Object.keys(BUILDINGS).filter(k=>BUILDINGS[k].stage===s);
      this._alert('stage',`🎉 La colonie devient : ${this.STAGES[s].name} !${unl.length?' Nouveau bâtiment : '+unl.join(', ')+'.':''}${WONDER.phaseStage.includes(s)?` Phase ${WONDER.phaseStage.indexOf(s)+1} de la Merveille débloquée !`:''}`);
      this._checkEnd(); }
  }
  // Effets Bits/subs : uniquement des effets temporaires de session, sans hasard.
  cheer(user,bits){
    bits=Math.max(0,Math.floor(bits)); if(!bits) return; this.bitsTotal+=bits; this._patron(user,Math.floor(bits/25));
    // Passe GD 7 : Merveille prête avant 3 h → les Bits vont à l'Éclat (score cosmétique de session : aucune ressource, aucun avantage, rien après le stream).
    const ready=this.wonderReady(); if(ready){ const e=Math.round(bits/10); this.eclat+=e;  this._alert('bits',`✨ ${user} : ${bits} Bits → +${e} Éclat de la ${WONDER.name} (${this.eclat}) · inauguration dans ${Math.max(1,Math.ceil((this.startedAt+this.wonderFullMs()-this.now())/60000))} min`); while(this.bitsTotal>=this.goal.to){ this.goalsReached++; this.goal={from:this.goal.to,to:this.goal.to+this.goalStep,tier:this.goal.tier+1,label:'Éclat de la cérémonie'}; } return; }
    const want=ready?0:Math.round(bits/10), wood=want?this._bitsGift(want):0; this.res.bois+=wood;
    if(wood<want) this._feed(`💎 Merci ${user} ! Plafond de ressources Bits atteint pour 10 min (+${wood} bois au lieu de +${want}) : les effets spéciaux restent actifs`);
    const T=this.tiers;
    if(bits>=T.remparts&&bits<T.phare){ const n0=this.now(); this.wallsBy=user; this.wallsUntil=Math.min(Math.max(this.wallsUntil,n0)+this.FO.wallsMs,n0+this.FO.wallsMaxMs); this._alert('bits',`🧱 ${user} renforce les remparts : +${this.FO.wallsDef} défense du Foyer (${Math.round((this.wallsUntil-n0)/60000)} min, plafond 20 min)`); }
    if(this.revival){ this.revival.got+=bits; this._checkRevival(); }
    if(bits>=T.benediction){ const n0=this.now(); this.blessLog=(this.blessLog||[]).filter(t=>n0-t<BLESS_QUOTA.windowMs);
      if(this.blessLog.length<BLESS_QUOTA.max){ this.blessLog.push(n0); this.blessUntil=Math.max(this.blessUntil,n0)+BLESS_MS; this._alert('bits',`🌾 ${user} offre la Bénédiction : production passive ×2 pendant 5 min !`); }
      else this._feed(`💎 Merci ${user} ! Bénédiction déjà offerte ${BLESS_QUOTA.max} fois cette heure-ci (plafond) : le Bits compte pour l'objectif communautaire`); }
    if(bits>=T.phare&&bits<T.benediction){
      const n=this.now(); this.phareLog=(this.phareLog||[]).filter(t=>n-t<60*MIN);
      if(this.phareLog.length>=PHARE_QUOTA){ this._feed(`💎 Merci ${user} ! Phare déjà allumé ${PHARE_QUOTA} fois cette heure-ci (plafond 30 min/h) : le Bits compte pour l'objectif communautaire`); }
      else { this.phareLog.push(n);
      if(this.phareActive()){ this.special.until=Math.min(this.special.until+PHARE_MS,n+PHARE_MAX_MS); this._alert('bits',`💎 ${user} prolonge le Phare de la session (+10 min) !`); }
      else { this.special={name:'Phare de la session',until:n+PHARE_MS}; this._alert('bits',`💎 ${user} allume le Phare : gains du chat ×1,5 pendant 10 min !`); } }
    } else if(bits<T.remparts) this._alert('bits',`💎 ${user} : ${bits} Bits → +${wood} bois`);
    // Objectif communautaire par paliers : chaque palier atteint déclenche l'orage magique (session uniquement, sans hasard),
    // offre un cadeau de ressources à toute la colonie, puis la barre repart vers le palier suivant.
    while(this.bitsTotal>=this.goal.to){
      const n=this.now(); this.goalsReached++;
      this.weather='orage magique'; this.weatherUntil=Math.max(this.weatherUntil||0,n)+ORAGE_MS;
      for(const k in GOAL_GIFT) this.res[k]+=GOAL_GIFT[k]; this._badge('orage');
      this._alert('goal',`⚡ Objectif communautaire ${this.goal.tier} atteint : ORAGE MAGIQUE ! Cadeau au village : +${GOAL_GIFT.bois} bois, +${GOAL_GIFT.pierre} pierre, +${GOAL_GIFT.nourriture} nourriture. Pendant 2 min, chaque !bois donne aussi 1 pierre`);
      this.goal={from:this.goal.to,to:this.goal.to+this.goalStep,tier:this.goal.tier+1,label:'Orage magique'};
    }
  }
  // Plafond des ressources offertes par les Bits : BITS_CAP.max unités par fenêtre glissante de 10 min,
  // pour qu'une session ne puisse pas être « achetée » en quelques minutes.
  _bitsGift(n){ const t=this.now(); this.bitsLog=(this.bitsLog||[]).filter(e=>t-e.t<BITS_CAP.windowMs);
    const used=this.bitsLog.reduce((a,e)=>a+e.n,0), ok=Math.max(0,Math.min(n,BITS_CAP.max-used)); if(ok) this.bitsLog.push({t,n:ok}); return ok; }
  // Subs offerts : fête au village (déterministe, session uniquement) : +5 nourriture par sub offert (plafonné), villageois en fête 2 min.
  giftSubs(user,n=1){ n=Math.max(1,Math.min(50,n|0)); if(this.wonderReady()){ this.eclat+=20*n; this._patron(user,20*n); this._alert('fete','✨ Abonnements offerts : Éclat de la cérémonie uniquement.'); return; } this._patron(user,20*n); this.res.nourriture+=this._bitsGift(5*n); this.feteUntil=this.now()+2*60000;
    this._alert('fete',`🎉 ${user} offre ${n} abonnement${n>1?'s':''} : FÊTE AU VILLAGE !`); this._badge('fete'); }
  housing(){ const h=this.count('hutte'); return 3+2*h+Math.floor((this.buildings.length-h)/3); }
  sub(user){ if(this.wonderReady()){ this.eclat+=20; this._patron(user,20); this._alert('sub','✨ Abonnement : Éclat de la cérémonie uniquement.'); return; } this._patron(user,20); this.res.nourriture+=this._bitsGift(10);
    const n0=this.now(); this.subPopLog=(this.subPopLog||[]).filter(t=>n0-t<SUB_POP.windowMs);
    if(this.pop<this.housing()&&this.subPopLog.length<SUB_POP.max){ this.subPopLog.push(n0); this.pop+=1; if(user&&!this.named.includes(user)){ this.named.push(user); this.named=this.named.slice(-12); } this._alert('sub',`⭐ ${user} s'abonne : un villageois rejoint le village !`); }
    else { this.res.nourriture+=this._bitsGift(10); this._alert('sub',`⭐ ${user} s'abonne : de la nourriture pour le village (plus de place ou plafond de 2 villageois offerts / 20 min atteint)`); } }
  _threat(){
    const t=this.nextThreat.type, lvl=this.stage+1, cl=!!this.nextThreat.climax;
    if(t==='raid'){ this._raid();
      // GD12 : si le Foyer tombe au climax, la horde revient (nouvelle vague dans threatMs) tant que la brèche n'a pas tenu une fois ;
      // sinon la menace ordinaire interrompue reprend.
      if(cl&&this.climaxFell&&!this.gameOver){ const n=this.now(); this.climaxWave++; this.defenders={}; this.strategy=null; this.climaxPrep={users:new Set(),start:n}; this.nextThreat={type:'raid',at:n+this.threatMs,climax:true,wave:this.climaxWave}; this.stratAsked=null;
        this._alert('threat',`⚔️ La horde se regroupe : vague ${this.climaxWave} du climax dans ${Math.round(this.threatMs/60000)} min. La cérémonie attend que la brèche tienne : !reparer, !defendre, « murs » !`); return; }
      // Le climax prend la place du raid du cycle : la menace suivante est un hiver, 6 min après l'impact au plus tôt (ou l'hiver qui était prévu).
      // Un raid « garde » (jalon de la Merveille) n'est pas absorbé : il reprend 6 min après l'impact au plus tôt.
      if(cl&&this.climaxPrev){ const p=this.climaxPrev; this.climaxPrev=null; if(p.guard){ this.nextThreat={type:'raid',guard:true,at:Math.max(p.at,this.now()+this.threatMs/2)}; return; } this.nextThreat={type:'hiver',at:p.type==='hiver'?Math.max(p.at,this.now()+this.threatMs/2):this.now()+this.threatMs/2}; return; }
    } else {
      const need=Math.ceil(this.pop*3*(this.count('grenier')?0.5:1));
      if(this.res.nourriture>=need){ this.res.nourriture-=need; this._alert('threat',`❄️ L'hiver passe : -${need} nourriture`); this._badge('winter'); if(this.defi&&this.defi.type==='survive'&&!this.defi.done) this._winDefi(); }
      else { const gone=Math.max(0,Math.min(this.pop-1,Math.ceil((need-this.res.nourriture)/3))); this.res.nourriture=0; this.pop-=gone; this._alert('threat',`❄️ Hiver rude : ${gone} villageois ${gone>1?'partent':'part'} faute de nourriture`); }
    }
    // GD12 (longue) : trêve après un climax tenu — la horde brisée ne revient plus, seuls les hivers continuent (même cadence).
    const truce=this.climaxTruce(); this.nextThreat={type:t==='raid'||truce?'hiver':'raid',at:this.now()+this.threatMs*(truce&&t==='hiver'?2:1)};
  }
  climaxTruce(){ return !!(this.FO.climax.truce&&this.climaxHitAt&&!this.climaxFell&&!this.completedAt); }
  tick(){
    const n=this.now(); this.ticks++; this._checkEnd();
    // Ouverture progressive du chantier final selon le calendrier de session (indépendant du paiement).
    if(!this.wonderCapOpened&&!this.gameOver&&this.wonderFinal()&&this.stage>=WONDER.phaseStage[this.wonder]&&n-this.startedAt>=this.wonderOpenMs()&&n-this.startedAt<this.wonderFullMs()){ this.wonderCapOpened=true;
      this._alert('stage',`🏛️ ${WONDER.name} : le chantier final ouvre ! Les dépôts sont plafonnés et s'ouvrent peu à peu, accès complet dans ${Math.ceil((this.startedAt+this.wonderFullMs()-n)/60000)} min. !construire merveille`); }
    // Passe GD 10 : assaut de mi-parcours (une fois, audiences ≥ minViewers), force = défense gratuite max + bonus — le chat attentif encaisse sans Chute.
    if(!this.assaultDone&&!this.gameOver&&!this.revival&&this.FO.assault&&this.activeViewers()>=(this.FO.assault.minViewers||0)&&n-this.startedAt>=this.FO.assault.atMs){ this.assaultDone=true;
      this.nextThreat={type:'raid',at:n+this.FO.assault.inMs,assault:true}; this.stratAsked=null; this._alert('threat',`⚔️ Assaut de mi-parcours dans ${Math.round(this.FO.assault.inMs/60000)} min (force ${this.raidPower()}) ! !defendre, !reparer !`); }
    if(!this.nextThreat.climax&&!this.nextThreat.assault&&this.gameLength==='longue'&&!this.lastAssaultDone&&!this.revival&&!this.gameOver&&n-this.startedAt>=240*60000){ this.lastAssaultDone=true; this.nextThreat={type:'raid',at:n+3*60000,assault:true}; this.stratAsked=null; this._alert('threat','⚔️ Dernier assaut du chantier dans 3 min : !defendre et !reparer !'); }
    // Passe GD 7 : raid de climax, une fois, quand la dernière tranche est ouverte et t ≥ 2 h 30 (annoncé 3 min avant).
    // GD12 : annonce pendant l'avant-dernière tranche (ou plus tard), jamais avant max(2 h 30, accès complet − 30 min).
    if(!this.nextThreat.assault&&!this.climaxDone&&!this.gameOver&&!this.revival&&this.climaxDue()){ this.climaxDone=true; const C=this.FO.climax;
      // La menace ordinaire en attente reprend après le climax (le climax s'ajoute, il ne remplace pas un raid du calendrier).
      // Nouvelle mobilisation : les défenseurs et la stratégie d'un raid annulé ne comptent pas pour la horde.
      this.climaxPrev={type:this.nextThreat.type,at:this.nextThreat.at,guard:!!this.nextThreat.guard}; this.defenders={}; this.strategy=null; this.climaxWave=1;
      this.nextThreat={type:'raid',at:n+C.inMs,climax:true}; this.stratAsked=null; this.climaxPrep={users:new Set(),start:n}; this.breach={hold:C.holdHp,status:'en cours',at:n+C.inMs};
      this._alert('threat',`⚔️ Raid de CLIMAX : une horde vise la ${WONDER.name} dans ${Math.round(C.inMs/60000)} min (force ${this.raidPower()}, à défense max −${this.climaxMaxDmg()} PV) ! !defendre, votez « murs », et ${this.climaxPrepNeed()} viewers différents !reparer pour renforcer la brèche. Défi « Tenir la brèche » : Foyer ≥ ${C.holdHp} PV après l'impact.`); }
    // GD12 : jalon d'épargne (annonce seule) quand le village a réuni la moitié de la prochaine tranche de la Merveille, une fois par tranche.
    if(this.wonderOpen()&&!this.wonderFinal()){ const c=this.wonderCost(), key=this.wonder+'.'+this.wonderPart; if(c&&key!==this.saveMarkKey&&Math.min(this.res.bois/Math.max(1,c.bois),this.res.pierre/Math.max(1,c.pierre))>=0.5){ this.saveMarkKey=key; this.saveMarks++;
      this._alert('stage',`🏛️ Épargne : la moitié de la ${this.wonderStep()} de la ${WONDER.name} est réunie (${Math.floor(this.res.bois)}/${c.bois} bois · ${Math.floor(this.res.pierre)}/${c.pierre} pierre). Encore un effort !`); } }
    // GD12 : Merveille prête → jalons cosmétiques de cérémonie toutes les 10 min jusqu'à l'accès complet (aucune ressource, aucun effet de jeu).
    if(this.readyAnnounced&&this.wonderReady()&&!this.completedAt){ if(!this.nextCeremony) this.nextCeremony=n+CEREMONY.everyMs; else if(n>=this.nextCeremony){ this.nextCeremony=n+CEREMONY.everyMs; const k=this.ceremonySteps++, step=CEREMONY.steps[k%CEREMONY.steps.length];
      this.feteUntil=Math.max(this.feteUntil,n+CEREMONY.feteMs); this._alert('stage',`✨ Préparatifs de l'inauguration : ${step} (${k+1}) · accès complet dans ${Math.max(1,Math.ceil((this.startedAt+this.wonderFullMs()-n)/60000))} min. Jalon cosmétique : aucune ressource ni effet de jeu.`); } }
    // GD11 : surplus exclusivement cosmétique ; aucun changement de durée, force ou ressources.
    if(this.wonderReady()){
      if(!this.readyAnnounced){ this.readyAnnounced=true; this._alert('stage',`🏛️ ${WONDER.name} prête — inauguration dans ${Math.max(1,Math.ceil((this.startedAt+this.wonderFullMs()-n)/60000))} min. Les Bits en plus nourrissent l'Éclat de la ${WONDER.name} (score cosmétique) sans modifier la durée ni la difficulté de la cérémonie.`); } }
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
    if(this.gameOver){ if(n>=this.gameOver.restartAt){ const k=this.fixedSeed; this.fixedSeed=undefined; this.reset(); this.fixedSeed=k; this._alert('stage','🏕️ Nouvelle session : un nouveau campement commence !'); } return; }
    if(this.revival){ this.nextThreat.at+=1000; if(n>=this.revival.until) this._gameOver("Le Foyer n'a pas été rallumé à temps"); return; }
    if(this.foyer.hp<this.foyer.max&&n-this.foyer.lastRegen>=this.FO.regenMs){ this.foyer.hp++; this.foyer.lastRegen=n; } else if(this.foyer.hp>=this.foyer.max) this.foyer.lastRegen=n;
    if(this.nextThreat.type==='raid'&&!this.vote&&this.stratAsked!==this.nextThreat.at&&this.nextThreat.at-n<=this.FO.warnMs){ this.stratAsked=this.nextThreat.at; if(this.startVote(['murs','reserves'],'Stratégie contre le raid ?')) this._stratVote=true; }
    if(!this.vote&&this.pendingBuild.length&&!(this.nextThreat.type==='raid'&&this.stratAsked!==this.nextThreat.at&&this.nextThreat.at-n<=this.FO.warnMs)) this._openPending();
    if(n>=this.nextThreat.at) this._threat();
    if(this.defi&&!this.defi.done&&n>=this.defi.ends){ this._log('🎯 Défi manqué, le prochain arrive bientôt'); this.defi=null; }
    if(n>=this.nextDefi){ this.nextDefi=n+DEFI_EVERY; this._startDefi(); }
  }
  defense(){ const n=this.now(), towers=this.count('tour')+this.count('palissade');
    const forge=this.count('forge')?2:1, dp=Object.entries(this.defenders).filter(([u,t])=>n-t<=this.FO.defendWin).reduce((a,[u])=>a+(this.roles[u]==='garde'?2:1)*this.FO.defenderPts*forge,0);
    // Petite audience : chaque défenseur compte plus (×DEF_REF/actifs, plafond inchangé) pour que la défense gratuite reste possible à 5 viewers.
    const small=Math.min(this.FO.smallMax,Math.max(1,this.FO.defRef/Math.max(1,this.activeViewers())));
    const parts={tours:towers*this.FO.towerDef,defenseurs:Math.min(this.FO.defenderCap,Math.round(dp*small)),remparts:n<this.wallsUntil?this.FO.wallsDef:0,strategie:this.strategy==='murs'?this.FO.stratDef:0};
    return {...parts,total:Object.values(parts).reduce((a,b)=>a+b,0)}; }
  // Butin / pillage proportionnels au palier (les coûts augmentent aussi) : palier 0 = +40 bois +20 pierre, vol = dégâts × 3.
  raidReward(){ const k=1+this.stage*this.FO.rewardPerStage; return {bois:Math.round(this.FO.reward.bois*k),pierre:Math.round(this.FO.reward.pierre*k)}; }
  stealPerDmg(){ return this.FO.stealPerDmg*(1+this.stage*this.FO.rewardPerStage); }
  // Passe GD 4 : la menace suit la meilleure défense GRATUITE possible (tours/palissades + plafond des défenseurs + stratégie « murs »).
  // Les remparts payés en Bits sont exclus : payer ne rend jamais les raids plus durs.
  // Défenseurs au mieux : tous les viewers actifs font !defendre (bonus petite audience et forge compris), dans la limite du plafond.
  defenseMaxFree(){ const a=Math.max(1,this.activeViewers()), small=Math.min(this.FO.smallMax,Math.max(1,this.FO.defRef/a)), forge=this.count('forge')?2:1;
    return (this.count('tour')+this.count('palissade'))*this.FO.towerDef+Math.min(this.FO.defenderCap,Math.round(a*this.FO.defenderPts*small*forge))+this.FO.stratDef; }
  // Passe GD 10 : tension de climax 0–1 selon la graine et l'état de la colonie (tours manquantes, retard) — aucun tirage lié au paiement.
  // GD12 : le poids 0,6 vient de la préparation gratuite (renforts), plus de la graine ; 0,25 tours manquantes ; 0,15 retard.
  climaxTension(){ const C=this.FO.climax||{}, towers=this.count('tour')+this.count('palissade'), need=Math.max(1,this.stage+1);
    const under=Math.max(0,Math.min(1,(need-towers)/need)), late=Math.max(0,Math.min(1,((this.now()-this.startedAt)-(C.atMs||0))/(40*60000)));
    return Math.max(0,Math.min(1,0.6*(1-this.climaxPrepFrac())+0.25*under+0.15*late)); }
  climaxPending(){ return !!(this.nextThreat&&this.nextThreat.climax&&this.now()<this.nextThreat.at); }
  climaxDue(){ const C=this.FO.climax, t=this.now()-this.startedAt, lead=C.leadMs||0; if(t<Math.max(C.atMs,this.wonderFullMs()-lead)) return false;
    if(this.wonder>=this.WPH.length) return true; return this.wonderLast()&&this.stage>=WONDER.phaseStage[this.wonder]&&this.wonderPart>=this.wonderParts()-2; }
  // Renforts : viewers distincts ayant fait !reparer depuis l'annonce ; besoin = max(3, 25 % des actifs).
  climaxPrepNeed(){ const P=this.FO.climax.prep; return Math.max(P.min,Math.ceil(this.activeViewers()*P.perActive)); }
  climaxPrepFrac(){ const P=this.climaxPrep; return P?Math.min(1,P.users.size/this.climaxPrepNeed()):0; }
  // Seule part de la graine : ±seedHp PV (canal indépendant, jamais relancé par un paiement).
  climaxJitter(){ const k=this.FO.climax.seedHp||0; return Math.round(k*(2*mulberry((this.seed^0xc1a7)>>>0)()-1)); }
  climaxBreach(){ return this.FO.climax.breach+this.climaxJitter(); }
  // Dégâts du climax si toute la défense gratuite est mobilisée (tours + défenseurs au plafond + « murs ») : affiché « à défense max : −X PV ».
  climaxMaxDmg(){ const C=this.FO.climax; return Math.min(this.climaxBreach(),Math.max(0,C.bonus+Math.round(C.bonusSpread*this.climaxTension())+this.climaxJitter())); }
  // Canal environnemental stable par graine et numéro de raid ; indépendant des appels RNG/votes/paiements.
  // GD12 : index des raids hors climax, pour que l'ajout du climax ne décale pas le bruit des raids ordinaires suivants.
  raidNoise(){ const k=this.stats.raids-(this.stats.climaxRaids||0); return 0.9+0.2*mulberry((this.seed^0x52ac)+Math.imul(k+1,0x9e3779b1))(); }
  raidPower(){ const small=this.activeViewers()<this.FO.smallBelow, base=(small?this.FO.smallRaidBase:this.FO.raidBase)+Math.round((small?this.FO.smallRaidStep:this.FO.raidStep)*this.stage*(this.raidMul||1)), ease=small&&this.FO.smallEase&&this.lastRaid&&this.lastRaid.dmg>0?this.FO.smallEase:1, extra=Math.max(0,Math.round(ease*(small?this.FO.smallScaleK:this.FO.scaleK)*(this.defenseMaxFree()-base)));
    const cl=this.nextThreat&&this.nextThreat.climax, as=this.nextThreat&&this.nextThreat.assault, hard=cl||as, C=cl?this.FO.climax:this.FO.assault, ex=hard?Math.max(0,Math.round((C.fullK||1)*(this.defenseMaxFree()-base))):extra;
    // Passe GD 7 (courte, petite audience) : force plafonnée à défense gratuite max − smallCapMargin (hors climax/assaut).
    const capped=small&&!hard&&this.FO.smallCapMargin!=null?Math.min(base+ex,Math.max(this.FO.smallCapFloor?base:0,this.defenseMaxFree()-this.FO.smallCapMargin)):base+ex; // passe GD 9 (normale) : jamais sous la force de base
    // Passe GD 8 : le raid « garde » reste battable par la défense gratuite complète (plafond = défense gratuite max) : les Bits ne sont jamais nécessaires.
    const g=this.nextThreat&&this.nextThreat.guard; let cBonus=0; if(cl) cBonus=this.FO.climax.bonus+Math.round((this.FO.climax.bonusSpread||0)*this.climaxTension())+this.climaxJitter(); else if(as) cBonus=this.FO.assault.bonus;
    // GD11 : marge nominale gratuite avant bruit ±10 % ; un dépassement peut coûter quelques PV, réparables gratuitement.
    if(g) return Math.min(capped+WONDER.milestone.raidBonus,this.defenseMaxFree());
    if(hard) return capped+cBonus;
    return Math.max(1,Math.round(Math.min(capped,this.defenseMaxFree()-4.5)*this.raidNoise())); }
  // Raid : repoussé ⇒ récompense (si la défense gratuite suffisait) ; perdu ⇒ PV en moins + vol de ressources (sauf stratégie « réserves »).
  _raid(){ const pow=this.raidPower(), d=this.defense(), cl=!!this.nextThreat.climax, raw=Math.max(0,pow-d.total), dmg=cl?Math.min(raw,this.climaxBreach()):raw, over=raw-dmg, n=this.now(), chutes0=this.chutes; this.stats.raids++; if(cl) this.stats.climaxRaids=(this.stats.climaxRaids||0)+1;
    const attackers=Math.max(3,Math.round(pow/6));
    this.lastRaid={t:n,attackers,dmg,pow,def:d.total,stolen:null,reward:null,guard:!!this.nextThreat.guard,climax:!!this.nextThreat.climax,assault:!!this.nextThreat.assault};
    if(!dmg){ this.stats.repelled++;
      // Récompense uniquement si la défense gratuite (sans remparts payés en Bits) suffisait : les Bits ne produisent pas de ressources hors plafond.
      const free=d.total-d.remparts>=pow, R=this.raidReward(); let gain='';
      if(free){ this.res.bois+=R.bois; this.res.pierre+=R.pierre; this.lastRaid.reward={...R}; gain=` Butin des pillards : +${R.bois} bois, +${R.pierre} pierre.`; }
      else { // Les remparts payés en Bits ont fait la différence : moitié du butin, comptée dans le plafond de ressources Bits (30 / 10 min).
        const hb=Math.round(R.bois*0.5), hp=Math.round(R.pierre*0.5), ok=this._bitsGift(hb+hp), gb=Math.min(hb,ok), gp=Math.min(hp,ok-gb);
        this.res.bois+=gb; this.res.pierre+=gp; this.lastRaid.reward={bois:gb,pierre:gp}; this.lastRaid.shared=this.wallsBy||'un mécène';
        gain=` Butin partagé grâce aux remparts de ${this.wallsBy||'un mécène'} : +${gb} bois, +${gp} pierre${gb+gp<hb+hp?' (plafond Bits atteint)':''}.`; }
      this._alert('threat',`⚔️ Raid repoussé (force ${pow} / défense ${d.total}) : le Foyer est intact !${gain}`); this._badge('raid'); if(this.defi&&this.defi.type==='survive'&&!this.defi.done) this._winDefi(); }
    else { this.foyer.hp=Math.max(0,this.foyer.hp-dmg); let loss='';
      if(this.strategy!=='reserves'){ const want=(dmg+over)*this.stealPerDmg(), cap=r=>Math.floor(Math.max(0,this.res[r])*this.FO.stealMaxShare);
        const lb=Math.min(want,cap('bois')), lp=Math.min(want,cap('pierre')); this.res.bois-=lb; this.res.pierre-=lp; this.lastRaid.stolen={bois:lb,pierre:lp}; loss=`. Pillage : ${[lb?`-${lb} bois`:'',lp?`-${lp} pierre`:''].filter(Boolean).join(', ')||'stock vide, rien à voler'}`; }
      else loss='. Réserves cachées : rien n\'a été volé';
      this._alert('threat',`⚔️ Raid ! Force ${pow} contre défense ${d.total} : le Foyer perd ${dmg} PV (${this.foyer.hp}/${this.foyer.max})${loss}`);
      // Passe GD 10 : Foyer « vacillant » = PV sous le seuil (menace visible) sans destruction — le chat peut encore !reparer / !defendre.
      if(this.foyer.hp>0&&this.foyer.hp<=(this.FO.vacillantAt||55)){ if(!this.vacillantLatched){ this.vacillant++; this.vacillantLatched=true; this._alert('threat',`🕯️ Le Foyer vacille (${this.foyer.hp} PV) ! !reparer et !defendre pour éviter la destruction.`); } }
      else if(this.foyer.hp>(this.FO.vacillantAt||55)) this.vacillantLatched=false;
      if(this.foyer.hp<=0) this._foyerDown(); }
    if(cl) this._climaxResolved(d,this.revival||this.chutes>chutes0||this.gameOver);
    this.defenders={}; this.strategy=null; if(this.vote&&this.vote.options[0]==='murs') this.vote=null; }
  // GD12 : défi « Tenir la brèche » (Foyer ≥ holdHp après l'impact) — récompense gratuite : butin, fête, badge, points aux défenseurs et renforts.
  _climaxResolved(d,fell){ const n=this.now(), B=this.breach, P=this.climaxPrep; this.climaxHitAt=n; this.climaxPrep=null; this.climaxFell=!!fell; if(!B||B.status!=='en cours') return; const hp=fell?0:this.foyer.hp; B.hp=hp; B.prep=P?P.users.size:0;
    if(hp>=B.hold){ B.status='réussi'; this.defisWon++; const R=this.raidReward(); this.res.bois+=R.bois; this.res.pierre+=R.pierre; B.reward={...R}; this.feteUntil=Math.max(this.feteUntil,n+2*60000);
      const who=new Set([...Object.keys(this.defenders).filter(u=>n-this.defenders[u]<=this.FO.defendWin),...(P?P.users:[])]); who.forEach(u=>this._builder(u,3)); this._badge('breche');
      this._alert('stage',`🛡️ Défi « Tenir la brèche » réussi : le Foyer tient à ${hp} PV (≥ ${B.hold}) ! Récompense gratuite : +${R.bois} bois, +${R.pierre} pierre, fête et +3 points aux ${who.size} défenseurs et renforts.`); }
    else { B.status='manqué'; this._alert('stage',`🕯️ Défi « Tenir la brèche » manqué : le Foyer est à ${hp} PV (objectif ${B.hold}). !reparer pour le remonter avant l'inauguration.`); } }
  reviveNeed(k=this.revivals){ const R=this.FO.revive, a=this.activeViewers(); return {bits:R.bits[k],viewers:Math.max(R.viewers[k],Math.ceil(a*R.viewersPerActive[k]))}; }
  _foyerDown(){ const n=this.now(); this.stats.destructions++; if(n-this.startedAt<WONDER.finalMinMs) this.stats.destructions3h++;
    if(this.revivals>=this.FO.revive.max){ return this._gameOver('Le Grand Foyer est détruit et ne peut plus être rallumé'); }
    const need=this.reviveNeed(); this.revival={until:n+this.FO.revive.ms,got:0,who:new Set(),viewers:need.viewers,bitsNeed:need.bits,k:this.revivals+1}; this.vote=null;
    this._alert('threat',`🔥 Le Foyer est détruit ! 3 min pour le rallumer : ${need.viewers} viewers différents tapent !rallumer OU ${need.bits} Bits (objectif fixe, sans hasard)`); }
  _checkRevival(){ const r=this.revival; if(!r) return; 
    if(r.who.size>=r.viewers||r.got>=r.bitsNeed){ this.revival=null; this.revivals++; this.foyer.hp=this.FO.revive.hp; this.nextThreat.at=Math.max(this.nextThreat.at,this.now()+this.threatMs);
      this._alert('stage',`🔥 Le Foyer est rallumé (${this.FO.revive.hp} PV) ! Rallumages restants : ${this.FO.revive.max-this.revivals}`); } }
  // Passe GD 7 : règle des 3 h. Avant 3 h, aucune défaite définitive : « Chute » = rallumage gratuit immédiat avec pénalité (−30 % bois et pierre).
  _chute(reason){ const n=this.now(), C=this.FO.chute, lb=Math.floor(this.res.bois*C.loss), lp=Math.floor(this.res.pierre*C.loss); this.res.bois-=lb; this.res.pierre-=lp; this.chutes++;
    this.revival=null; this.foyer.hp=C.hp; this.foyer.lastRegen=n; this.nextThreat={type:this.nextThreat.type,at:Math.max(this.nextThreat.at,n+this.threatMs)};
    this._alert('threat',`🔥 CHUTE (${reason}) : le Foyer se rallume gratuitement à ${C.hp} PV, mais le village perd ${lb} bois et ${lp} pierre. Avant 3 h de partie, aucune défaite définitive.`); }
  _gameOver(reason){ const n=this.now(); if(n-this.startedAt<WONDER.finalMinMs) return this._chute(reason); const m=Math.round((n-this.startedAt)/60000);
    this.gameOver={at:n,restartAt:n+30000,reason,summary:{duree:m,chutes:this.chutes,stage:this.STAGES[this.stage].name,buildings:this.buildings.length,wonder:this.wonder,raids:this.stats.raids,repelled:this.stats.repelled,defis:this.defisWon,badges:this.badges.map(k=>BADGES[k]),top:Object.entries(this.builders).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0])}};
    this.revival=null; this.vote=null; this._alert('threat',`💀 Partie terminée : ${reason}. Nouvelle session dans 30 s.`); }
  forceRaid(){ if(this.revival||this.gameOver) return; this.nextThreat={type:'raid',at:this.now()}; this.stratAsked=this.nextThreat.at; }
  threatInfo(){ const t=this.nextThreat, lvl=this.stage+1;
    if(t.type==='raid'){ const pow=this.raidPower(), d=this.defense(), raw=Math.max(0,pow-d.total), dmg=t.climax?Math.min(raw,this.climaxBreach()):raw;
      const info={type:'raid',guard:!!t.guard,at:t.at,need:pow,have:d.total,def:d,dmg,ok:!dmg,label:!dmg?`Défense ${d.total} ≥ force ${pow} : le Foyer tiendra`:`Force ${pow} contre défense ${d.total} : le Foyer perdrait ${dmg} PV. !defendre, tours, palissades`};
      // GD12 : climax lisible — dégâts à défense max, renforts et défi « Tenir la brèche ».
      if(t.climax){ const max=this.climaxMaxDmg(), need=this.climaxPrepNeed(), k=this.climaxPrep?this.climaxPrep.users.size:0, after=this.foyer.hp-max, hold=this.FO.climax.holdHp;
        info.climax={maxDmg:max,prep:Math.min(k,need),prepNeed:need,hold,holdOk:after>=hold,hpAtMax:Math.max(0,after)};
        info.label=`Force ${pow} / défense ${d.total}`+(dmg?` : −${dmg} PV maintenant`:' : le Foyer tiendra'); }
      return info; }
    const need=Math.ceil(this.pop*3*(this.count('grenier')?0.5:1)), have=Math.floor(this.res.nourriture); return {type:'hiver',at:t.at,need,have,ok:have>=need,label:have>=need?`${have}/${need} nourriture : l'hiver passera`:`Il manque ${need-have} nourriture (!chasse, fermes), sinon des villageois partent`}; }
  _nextAffordable(){ const l=Object.keys(BUILDINGS).filter(b=>this.unlocked(b)).map(b=>({b,c:this.cost(b)})).sort((x,y)=>(x.c.bois+x.c.pierre)-(y.c.bois+y.c.pierre))[0]; return l?{name:l.b,cost:l.c,affordable:this.affordable(l.b),missing:this.missing(l.b)}:null; }
  state(){
    const top=Object.entries(this.builders).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,pts],i)=>({name,pts,title:i===0?'Fondateur de la session':''}));
    const tally={}; if(this.vote){ this.vote.options.forEach(o=>tally[o]=0); Object.values(this.vote.voters).forEach(o=>tally[o]++); }
    const costs={}; Object.keys(BUILDINGS).forEach(b=>costs[b]=this.cost(b));
    return {res:{bois:Math.floor(this.res.bois),pierre:Math.floor(this.res.pierre),nourriture:Math.floor(this.res.nourriture)},yieldFactor:this.yieldFactor(),pop:this.pop,buildings:this.buildings,weather:this.weather,special:this.special,bitsTotal:this.bitsTotal,weatherUntil:this.weatherUntil,goalsReached:this.goalsReached,
      vote:this.vote&&{title:this.vote.title,tally,ends:this.vote.ends},seed:this.seed,leaderboard:top,patronsBoard:Object.entries(this.patrons).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,pts])=>({name,pts})),objectives:this.objectives(),rates:this.rates(),badges:this.badges.map(k=>BADGES[k]),named:this.named,roles:this.roles,wonder:{index:this.wonderIndex,phase:this.wonder,part:this.wonderPart,parts:WONDER.parts,pct:this.wonderPct(),phases:this.WPH.length,cost:this.wonderCost(),unlocked:this.wonderOpen(),nextStage:this.wonderNextStage(),opensAt:this.wonderLockedUntil()||null,final:this.wonderFinal()?{paid:{...this.wonderPaid},cost:this.wonderCost(),cap:Math.round(this.wonderCapFrac()*100),fullAt:this.startedAt+this.wonderFullMs(),canDeposit:this.wonderDepositOk()}:null},blessUntil:this.blessUntil,feteUntil:this.feteUntil,bitsTiers:this.bitsTiers,gameLength:this.gameLength,pendingBuilds:this.pendingBuild.slice(),stages:this.STAGES,bitsCapLeft:Math.max(0,BITS_CAP.max-(this.bitsLog||[]).filter(e=>this.now()-e.t<BITS_CAP.windowMs).reduce((a,e)=>a+e.n,0)),unlockedBuildings:Object.keys(BUILDINGS).filter(b=>this.unlocked(b)),nextAffordable:this._nextAffordable(),viewers:Object.fromEntries(Object.keys(this.seen).slice(-200).map(u=>[u,this.viewer(u)])),log:this.log,feed:this.feed,alert:this.alert,cooldownMs:this.cooldownMs,goal:{bits:this.goal.to-this.goal.from,cur:this.bitsTotal-this.goal.from,tier:this.goal.tier,target:this.goal.to,label:this.goal.label,done:false},
      stage:this.STAGES[this.stage].name,housing:this.housing(),finalStage:this.STAGES[this.STAGES.length-1].name,completed:!!this.completedAt,completedAt:this.completedAt,startedAt:this.startedAt,citeReached:this.stage===this.STAGES.length-1,threat:this.nextThreat,threatInfo:this.threatInfo(),towersNeeded:this.stage+1,towers:this.count('tour')+this.count('palissade'),foyer:{hp:this.foyer.hp,max:this.foyer.max},defense:this.defense(),raidPower:this.raidPower(),wallsUntil:this.wallsUntil,strategy:this.strategy,lastRaid:this.lastRaid,revival:this.revival&&{until:this.revival.until,bits:this.revival.got,bitsNeed:this.revival.bitsNeed,viewers:this.revival.viewers,count:this.revival.who.size,k:this.revival.k},revivals:this.revivals,breach:this.breach&&{...this.breach},ceremonySteps:this.ceremonySteps,saveMarks:this.saveMarks,chutes:this.chutes,eclat:this.eclat,vacillant:this.vacillant,wonderReady:this.wonderReady(),revivalsMax:this.FO.revive.max,gameOver:this.gameOver,defendersCount:Object.values(this.defenders).filter(t=>this.now()-t<=this.FO.defendWin).length,defi:this.defi&&{label:this.defi.label,count:this.defi.count,target:this.defi.target,ends:this.defi.ends,done:this.defi.done},nextDefi:this.nextDefi,projects:this.projects(),costs,active:this.activeViewers(),now:this.now()};
  }
}
if(typeof module!=='undefined'&&module.exports) module.exports={Colony,PENDING_MAX,bitsTiersList,BUILDINGS,STAGES,layout,mulberry,BITS_CAP,WONDER,BADGES,FOYER};
else globalThis.TwitchColony={Colony,BUILDINGS,STAGES,layout,mulberry,WONDER,FOYER};
