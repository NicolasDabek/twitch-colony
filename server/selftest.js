const assert=require('assert'),{Colony}=require('./game');
const g=new Colony();
g.chat('Alice','!bois'); assert.equal(g.res.bois,12);
g.chat('Alice','!bois'); assert.equal(g.res.bois,12,'cooldown');
g.cheer('Bob',100); assert.equal(g.res.bois,22);
g.cheer('Bob',500); assert.ok(g.special);
g.cheer('Bob',5000); assert.equal(g.weather,'orage magique');
g.chat('Bob','!optout'); assert.ok(!g.state().leaderboard.find(l=>l.name==='Bob'));
g.startVote(['hutte','ferme']); g.chat('Alice','!vote hutte'); g.vote.ends=0; g.tick(); assert.ok(g.buildings.includes('hutte'));
assert.equal(g.state().leaderboard[0].title,'Fondateur de la session');
g.reset(); assert.equal(g.bitsTotal,0); assert.deepEqual(g.leaders,{});
console.log('selftest OK');
const {buildConfig,mask}=require('./config');
let r=buildConfig({MODE:'twitch'}); assert.ok(r.errors.length>=3,'erreurs si vide');
r=buildConfig({MODE:'twitch',TWITCH_CHANNEL:'#NicoTest',TWITCH_BOT_USERNAME:'nicobot',TWITCH_OAUTH_TOKEN:'oauth:abcdefghijklmnopqrstuvwxyz0123'});
assert.deepEqual(r.errors,[]); assert.equal(r.config.twitch.token,'abcdefghijklmnopqrstuvwxyz0123'); assert.equal(r.config.twitch.channel,'nicotest');
r=buildConfig({MODE:'twitch',TWITCH_CHANNEL:'x y',TWITCH_BOT_USERNAME:'b0t',TWITCH_OAUTH_TOKEN:'bad token!'}); assert.ok(r.errors.length>=2);
assert.deepEqual(buildConfig({}).errors,[]); assert.ok(buildConfig({PORT:'abc'}).errors.length);
assert.ok(!mask('abcdefghijklmnopqrstuvwxyz0123').includes('qrst'));
const g2=new Colony({cooldownMs:0}); g2.chat('A','!bois'); g2.chat('A','!bois'); assert.equal(g2.res.bois,14);
console.log('config OK');
const fs=require('fs'),path=require('path');
for(const [a,b] of [['server/game.js','docs/game.js'],['server/game-config.js','docs/game-config.js'],['public/overlay.js','docs/overlay.js'],['public/controls.js','docs/controls.js'],['public/style.css','docs/style.css'],['public/demo.css','docs/demo.css'],['public/3d/main.js','docs/3d/main.js'],['public/icons.js','docs/icons.js'],['public/3d/three.module.js','docs/3d/three.module.js'],['public/3d/boot.js','docs/3d/boot.js'],['public/3d/nomodule.js','docs/3d/nomodule.js']])
  assert.equal(fs.readFileSync(path.join(__dirname,'..',a),'utf8'),fs.readFileSync(path.join(__dirname,'..',b),'utf8'),`${b} périmé : lancez npm run build:pages`);
console.log('docs OK');
// ─── Analyse game design ───
const {BUILDINGS:B}=require('./game');
let T=1e9; const clock=()=>T; const mk=(o={})=>new Colony({cooldownMs:0,now:clock,...o});
// QW1 vote auto : seulement abordables
let c=mk(); c.res.bois=c.cost('hutte').bois+5; c.autoVote(); assert.deepEqual(c.vote.options,['hutte']);
c=mk(); c.res.bois=0; assert.equal(c.autoVote(),false); assert.ok(!c.vote);
// QW2 Bits → round(bits/10) bois
c=mk(); c.cheer('A',99); assert.equal(c.res.bois,10+10); c.cheer('A',14); assert.equal(c.res.bois,21);
// QW3 Phare ×2 et prolongation
c=mk(); c.cheer('A',500); c.chat('U','!bois'); assert.equal(c.res.bois,10+30+3); // Phare ×1,5 (ressources Bits plafonnées à 30 / 10 min)
const u0=c.special.until; c.cheer('B',500); assert.equal(c.special.until,u0+10*60000);
// QW4 égalité au hasard annoncée
c=mk({rng:()=>0.99}); c.res.bois=100; c.res.pierre=50; c.startVote(['hutte','ferme']); c.chat('X','!vote hutte'); c.chat('Y','!vote ferme');
c.vote.ends=0; c.tick(); assert.ok(c.log.some(l=>/Égalité.*hasard/.test(l.m))); assert.deepEqual(c.buildings,['ferme']);
// QW5 villageois produisent floor(pop/2) bois / 10 s
c=mk(); c.pop=5; c.res.nourriture=100; for(let i=0;i<10;i++) c.tick(); assert.equal(c.res.bois,12);
// QW6 1 pt / 25 Bits
c=mk(); c.cheer('A',100); assert.equal(c.leaders.A,4);
// Orage : !bois donne +1 pierre
c=mk(); c.cheer('A',5000); const p0=c.res.pierre; c.chat('U','!bois'); assert.equal(c.res.pierre,p0+1);
// Raid sur le Foyer : sans défense, dégâts + pertes ; une tour réduit les dégâts de 10
c=mk(); c.res.bois=100; T+=15*60000; c.tick(); assert.equal(c.foyer.hp,78); assert.equal(c.res.bois,70,'pillage : dégâts × 3, au plus 30 % du stock'); assert.deepEqual(c.lastRaid.stolen,{bois:30,pierre:0}); T=1e9;
c=mk(); c.buildings=['tour']; c.res.bois=100; T+=15*60000; c.tick(); assert.equal(c.foyer.hp,88); assert.equal(c.res.bois,70); assert.equal(c.threat?.type,undefined); assert.equal(c.nextThreat.type,'hiver'); T=1e9;
// Hiver sans nourriture : départs
c=mk(); c.buildings=['tour']; T+=15*60000; c.tick(); c.res.nourriture=0; c.pop=4; T+=15*60000; c.tick(); assert.ok(c.pop<4); T=1e9;
// Famine : -1 villageois par minute
c=mk(); c.res.nourriture=0; c.pop=3; c.tick(); T+=60000; c.tick(); assert.equal(c.pop,2); T=1e9;
// Paliers
c=mk(); c.res.bois=1e4; c.res.pierre=1e4; ['hutte','ferme','carriere'].forEach(b=>c.build(b)); assert.equal(c.state().stage,'Hameau');
// Coûts : croissance par exemplaire et selon viewers actifs
c=mk(); assert.equal(c.cost('hutte').bois,Math.ceil(20*2.4)); c.res.bois=1e4; c.build('hutte'); assert.equal(c.cost('hutte').bois,Math.ceil(20*2.4*1.25*1.10));
// Adaptation à l'audience : coûts fixes, rendement par commande dégressif, actifs lissés sur 10 min
c=mk(); for(let i=0;i<20;i++) c.chat('v'+i,'!bois'); assert.equal(c.activeViewers(),20); assert.equal(c.cost('hutte').bois,Math.ceil(20*2.4));
assert.ok(Math.abs(c.yieldFactor()-Math.pow(5/20,0.92))<1e-9); T+=6*60000; assert.equal(c.activeViewers(),20); T+=5*60000; assert.equal(c.activeViewers(),0); T=1e9;
{ const rate=a=>a*(a<=5?1:Math.pow(5/a,0.92)); const r=rate(100)/rate(5); assert.ok(r>1.1&&r<1.35,'progression sous-linéaire 5→100 : '+r); }
// Plafond Bits : 60 ressources max par 10 min ; logement limite les villageois des subs
c=mk(); c.cheer('A',1000); assert.equal(c.res.bois,10+30); c.cheer('A',1000); assert.equal(c.res.bois,40); T+=11*60000; c.cheer('A',100); assert.equal(c.res.bois,50); T=1e9;
c=mk(); for(let i=0;i<10;i++) c.sub('s'+i); assert.equal(c.pop,c.housing());
// Les viewers gratuits progressent sans Bits
c=mk({cooldownMs:5000}); for(let s=0;s<60;s++){ T+=5000; ['a','b','c'].forEach(u=>c.chat(u,'!bois')); } assert.ok(c.affordable('hutte')); T=1e9;
console.log('game design OK');
// Alertes et fil d'actions
c=mk(); c.chat('A','!bois'); c.chat('B','!pierre'); c.chat('C','!chasse'); c.chat('D','!bois'); assert.equal(c.feed.length,3); assert.ok(/D coupe du bois/.test(c.feed[0].m));
c.sub('Z'); assert.equal(c.alert.kind,'sub'); c.cheer('Y',100); assert.equal(c.alert.kind,'bits'); c.res.bois=999; c.build('hutte'); assert.equal(c.alert.kind,'build');
for(const f of ['docs/index.html','public/sim.html','public/confidentialite.html']) assert.ok(/name="viewport"/.test(fs.readFileSync(path.join(__dirname,'..',f),'utf8')),f+' viewport');
console.log('ui OK');
// Placement 3D : stable, sans chevauchement, seed par partie
{ const {layout}=require('./game'); const L=['hutte','ferme','carriere','tour','hutte','ferme','hutte','tour','carriere','ferme','hutte','hutte'];
  for(const sd of [1,42,1337,987654321]){
    const full=layout(sd,L).items; assert.equal(full.length,L.length);
    for(let k=1;k<L.length;k++) assert.deepEqual(layout(sd,L.slice(0,k)).items,full.slice(0,k),'les bâtiments existants ne bougent pas');
    const cells=new Set(); for(const b of full) for(let i=0;i<b.w;i++) for(let j=0;j<b.h;j++){ const k=(b.x+i)+','+(b.z+j); assert.ok(!cells.has(k),'chevauchement'); cells.add(k); assert.ok(!['11,11','12,11','11,12','12,12'].includes(k),'case du Phare'); }
  }
  assert.notDeepEqual(layout(1,L).items,layout(2,L).items);
  const g=new Colony({seed:77}); assert.equal(g.state().seed,77); const g2=new Colony(); assert.ok(Number.isInteger(g2.state().seed)); }
console.log('3d layout OK');
// Objectif communautaire : orage visible, cadeau, palier suivant
{ let T2=5e9; const g=new Colony({cooldownMs:0,now:()=>T2}); const b0={...g.res};
  g.cheer('A',4900); assert.equal(g.weather,'clair'); assert.equal(g.state().goal.cur,4900);
  g.cheer('B',100); assert.equal(g.weather,'orage magique'); assert.equal(g.alert.kind,'goal');
  assert.equal(g.res.pierre,b0.pierre+30); assert.equal(g.state().goal.tier,2); assert.equal(g.state().goal.cur,0); assert.equal(g.state().goal.target,10000);
  assert.ok(g.state().weatherUntil>T2); const p0=g.res.pierre; g.chat('U','!bois'); assert.equal(g.res.pierre,p0+1);
  g.cheer('C',12000); assert.equal(g.goalsReached,3); assert.equal(g.state().goal.target,20000); // plusieurs paliers d'un coup
  T2+=7*60000; g.tick(); assert.equal(g.weather,'clair'); }
console.log('objectif OK');
// Carte 72×72 : positions centrales stables, débordement vers l'extérieur sans chevauchement
{ const {layout}=require('./game'); const many=Array.from({length:120},(_,i)=>['hutte','ferme','carriere','tour'][i%4]);
  const L=layout(9,many); assert.equal(L.items.length,120); const cells=new Set();
  for(const b of L.items) for(let i=0;i<b.w;i++) for(let j=0;j<b.h;j++){ const k=(b.x+i)+','+(b.z+j); assert.ok(!cells.has(k)); cells.add(k); assert.ok(b.x>=-24&&b.x+b.w<=48); }
  assert.ok(L.items.some(b=>b.x<0||b.x>=24||b.z<0||b.z>=24),'expansion hors zone centrale');
  for(let k=1;k<120;k+=17) assert.deepEqual(layout(9,many.slice(0,k)).items,L.items.slice(0,k)); assert.equal(L.at(11,11),1); }
console.log('carte 72 OK');
// Équilibrage : partie complète (Cité + Merveille) ≥ 3 h 20 dans tous les scénarios, sur plusieurs seeds
{ const sim=require('./simulate'), H=3600;
  for(const seed of [1,2]) for(const sc of sim.SCENARIOS){ const r=sim.run(sc,{seed});
    if(sc.neglect){ assert.ok(r.minHp===0&&(r.revivals>0||r.over!=null),'négliger le Foyer doit avoir des conséquences'); continue; }
    assert.ok(r.end!=null,`${sc.name} (seed ${seed}) : partie non terminée`); assert.ok(r.over==null,`${sc.name} : partie perdue`);
    assert.ok(r.end>=3*H+20*60,`${sc.name} (seed ${seed}) : fin en ${(r.end/H).toFixed(2)} h (< 3 h 20)`); assert.ok(r.end<=6.5*H,`${sc.name} : trop long`);
    assert.ok(r.firstBuild<=6*60,`${sc.name} : 1er bâtiment trop lent`); }
  const ends=['5 viewers','20 viewers (typique)','50 viewers','200 viewers'].map(n=>sim.run(sim.SCENARIOS.find(s=>s.name===n)).end);
  assert.ok(Math.max(...ends)/Math.min(...ends)<1.3,'durée trop sensible au nombre de viewers'); }
// Passe GD 2 : défense gratuite viable, paliers rapprochés, négligence punie, durées de partie
{ const sim=require('./simulate'), H=3600, S=n=>sim.SCENARIOS.find(s=>s.name===n), ST=['Hameau','Village','Bourg','Ville','Grande ville','Cité'];
  for(const seed of [1,2]){ const nb=sim.run(S('20 viewers, sans Bits'),{seed}); assert.ok(nb.repelled*9>=5*nb.raids,`sans Bits (seed ${seed}) : ${nb.repelled}/${nb.raids} raids repoussés (< 5/9)`);
    const t=sim.run(S('20 viewers (typique)'),{seed}); ST.forEach((k,i)=>{ const gap=t.reached[k]-(i?t.reached[ST[i-1]]:0); assert.ok(gap<60*60,`typique (seed ${seed}) : ${Math.round(gap/60)} min avant ${k} (≥ 60 min)`); }); }
  let d=0; for(const seed of [1,2,3]){ const t=sim.run(S('20 viewers (typique)'),{seed}), n=sim.run(S('20 viewers, Foyer négligé'),{seed}); d+=(n.end??n.over??10*H)-t.end; }
  assert.ok(d/3>=20*60,`Foyer négligé : seulement ${Math.round(d/180)} min de plus que le scénario typique en moyenne`);
  for(const len of ['courte','longue']) for(const sc of sim.SCENARIOS){ if(sc.neglect) continue; const r=sim.run(sc,{gameLength:len});
    assert.ok(r.end!=null&&r.over==null,`${len} / ${sc.name} : partie non terminée`); assert.ok(r.end>=3*H,`${len} / ${sc.name} : ${(r.end/H).toFixed(2)} h (< 3 h)`); }
  assert.ok(sim.run(S('20 viewers (typique)'),{gameLength:'longue'}).end>sim.run(S('20 viewers (typique)'),{gameLength:'courte'}).end,'longue > courte'); }
console.log('équilibrage OK');
{const {Colony}=require('./game.js');const g=new Colony();
g.chat('a','!aide');g.chat('a','!rejoindre bûcheron');const s=g.state();
if(!s.objectives||!s.objectives.short||!s.objectives.mid||!s.objectives.long) throw new Error('objectifs manquants');
if(!Array.isArray(s.patronsBoard)) throw new Error('mécènes manquant');
g.pop=0;g.sub('c');g.giftSubs('b',5);if(!g.state().named||!g.state().named.length) throw new Error('villageois nommé');
console.log('mécaniques OK');}

// ─── Nouvelles mécaniques ───
{ const {Colony,BUILDINGS,WONDER,FOYER}=require('./game.js'); let T=1e12; const mk=(o={})=>{ T=1e12; return new Colony({now:()=>T,rng:()=>0.5,seed:1,cooldownMs:0,...o}); };
  // Rôles : +50 % sur la commande du métier
  let g=mk(); g.chat('a','!bois'); const base=g.res.bois; g.chat('b','!rejoindre bûcheron'); g.chat('b','!bois'); assert.strictEqual(g.res.bois-base,3,'rôle bûcheron ×1,5');
  g.chat('c','!rejoindre garde'); assert.strictEqual(g.roles.c,'garde');
  // Série : 3 fenêtres de 10 min consécutives → ×1,25
  g=mk(); for(let i=0;i<3;i++){ g.chat('s','!pierre'); T+=10*60000; } T-=10*60000; assert.strictEqual(g.streak('s'),3); const p0=g.res.pierre; g.chat('s','!pierre'); assert.ok(Math.abs(g.res.pierre-p0-1.25)<1e-9,'bonus de série');
  // Défis : un défi de récolte réussi donne un bonus et des points
  g=mk(); T+=60000; g.tick(); assert.ok(g.defi&&g.defi.type==='gather','défi lancé'); const tgt=g.defi.target, cmd=g.defi.cmd; for(let i=0;i<tgt;i++) g.chat('u'+i,cmd); assert.strictEqual(g.defisWon,1); assert.ok(g.builders.u0>=4,'points de défi');
  // Déblocages par palier
  g=mk(); assert.ok(!g.unlocked('grenier')&&g.unlocked('hutte')); g.stage=1; assert.ok(g.unlocked('grenier')&&!g.unlocked('atelier')); g.stage=4; assert.ok(g.unlocked('atelier'));
  g=mk(); g.res.bois=1e4; g.res.pierre=1e4; g.chat('x','!construire atelier'); assert.ok(!g.vote,'atelier verrouillé au Campement');
  // Merveille : 3 phases, débloquée à la Ville ; fin = Cité + Merveille
  g=mk(); g.res.bois=1e5; g.res.pierre=1e5; assert.ok(!g.buildWonder(),'Merveille verrouillée'); g.stage=4; assert.ok(g.buildWonder()); assert.ok(!g.buildWonder(),'phase 2 verrouillée avant la Grande ville'); assert.ok(g.badges.includes('merv1')); g.stage=5; assert.ok(g.buildWonder()); g.stage=6; assert.ok(g.buildWonder()); assert.strictEqual(g.wonder,WONDER.phases.length); // la phase 3 ne s'ouvre qu'à la Cité
  g._checkEnd(); assert.ok(g.completedAt,'Cité + Merveille = fin'); assert.ok(g.badges.includes('wonder'));
  // Badges
  g=mk(); g.res.bois=100; g.build('hutte'); assert.ok(g.badges.includes('first')); g.giftSubs('z',3); assert.ok(g.badges.includes('fete'));
  // Vote : +2 aux votants de l'option gagnante, classements séparés
  g=mk(); g.res.bois=100; g.startVote(['hutte','attendre']); g.chat('v1','!vote hutte'); g.chat('v2','!vote attendre'); g.chat('v3','!vote hutte'); T+=31000; g.tick(); assert.strictEqual(g.builders.v1,3); assert.strictEqual(g.builders.v2,1);
  g.cheer('m',100); assert.ok(g.patrons.m>0&&!g.builders.m,'Mécènes séparés des Bâtisseurs');
  // Plafond Bits visible
  g=mk(); g.cheer('m',1000); assert.ok(g.feed.some(f=>/Plafond/.test(f.m)),'message de plafond');
  // Foyer : raid non défendu → dégâts ; défendu → repoussé ; réparation
  g=mk(); g.forceRaid(); g.tick(); assert.strictEqual(g.foyer.hp,FOYER.max-g.raidPower(),'dégâts = force − défense');
  g=mk(); for(let i=0;i<8;i++) g.chat('d'+i,'!defendre'); g.cheer('w',300); g.strategy='murs'; assert.ok(g.defense().total>=g.raidPower()); g.forceRaid(); g.tick(); assert.strictEqual(g.foyer.hp,FOYER.max);
  g=mk(); g.foyer.hp=50; g.res.bois=20; g.res.pierre=10; g.chat('r','!reparer'); assert.strictEqual(g.foyer.hp,55); assert.strictEqual(g.res.bois,10);
  g=mk(); for(let i=0;i<12;i++) g.chat('x'+i,'!bois'); g.chat('g','!rejoindre garde'); g.chat('g','!defendre'); assert.strictEqual(g.defense().defenseurs,6,'garde compte double (2 × 3)');
  // Remparts plafonnés à 20 min
  g=mk(); for(let i=0;i<5;i++) g.cheer('w',300); assert.strictEqual(g.wallsUntil-T,FOYER.wallsMaxMs);
  // Foyer détruit → rallumage (objectif fixe, sans hasard), puis fin de partie au 3e
  g=mk(); g.foyer.hp=1; g._raid(); assert.ok(g.revival); const need=g.reviveNeed(0); for(let i=0;i<need.viewers;i++) g.chat('f'+i,'!rallumer'); assert.ok(!g.revival&&g.foyer.hp===FOYER.revive.hp&&g.revivals===1);
  g.foyer.hp=1; g._raid(); g.cheer('b',FOYER.revive.bits[1]-1); assert.ok(g.revival,'Bits insuffisants'); g.cheer('b',1); assert.ok(!g.revival&&g.revivals===2,'rallumage Bits');
  assert.ok(FOYER.revive.bits[1]>FOYER.revive.bits[0],'exigence croissante');
  g.foyer.hp=1; g._raid(); assert.ok(g.gameOver&&g.gameOver.summary,'plus de rallumage : fin de partie'); T+=31000; g.tick(); assert.ok(!g.gameOver&&g.foyer.hp===FOYER.max,'nouvelle session automatique');
  g=mk(); g.foyer.hp=1; g._raid(); T+=FOYER.revive.ms+1000; g.tick(); assert.ok(g.gameOver,'délai de rallumage dépassé');
  // Vote de stratégie avant le raid
  g=mk(); T=g.nextThreat.at-FOYER.warnMs+1; g.tick(); assert.deepStrictEqual(g.vote.options,['murs','reserves']);
  console.log('mécaniques (rôles, séries, défis, merveille, badges, déblocages, Foyer) OK');
  // ─── Passe GD 2 ───
  const {PENDING_MAX,STAGES:STG}=require('./game');
  // Butin d'un raid repoussé par la défense gratuite ; pas de butin si seuls les remparts (Bits) suffisent
  g=mk(); for(let i=0;i<12;i++) g.chat('d'+i,'!defendre'); const rb0=g.res.bois, rp0=g.res.pierre; g.forceRaid(); g.tick(); assert.strictEqual(g.foyer.hp,FOYER.max); assert.deepStrictEqual(g.lastRaid.reward,{bois:40,pierre:20}); assert.strictEqual(g.res.bois,rb0+40); assert.strictEqual(g.res.pierre,rp0+20);
  g=mk(); for(let i=0;i<12;i++) g.chat('x'+i,'!bois'); g.chat('d','!defendre'); g.cheer('w',300); g.strategy='murs'; assert.ok(g.defense().total>=g.raidPower()&&g.defense().total-g.defense().remparts<g.raidPower()); g.forceRaid(); g.tick(); assert.strictEqual(g.foyer.hp,FOYER.max); assert.strictEqual(g.lastRaid.reward,null,'pas de butin acheté en Bits');
  // Pillage : dégâts × 3 (× palier), plafonné à 30 % du stock ; rien avec la stratégie « réserves »
  g=mk(); g.res.bois=1000; g.res.pierre=1000; g.forceRaid(); g.tick(); assert.deepStrictEqual(g.lastRaid.stolen,{bois:66,pierre:66}); assert.ok(/Pillage/.test(g.alert.m));
  g=mk(); g.res.bois=1000; g.strategy='reserves'; g.forceRaid(); g.tick(); assert.strictEqual(g.lastRaid.stolen,null); assert.strictEqual(g.res.bois,1000);
  g=mk(); g.stage=5; assert.deepStrictEqual(g.raidReward(),{bois:240,pierre:120}); assert.strictEqual(g.stealPerDmg(),18);
  // Forge (Grande ville) : !defendre compte double
  g=mk(); for(let i=0;i<12;i++) g.chat('x'+i,'!bois'); g.chat('d','!defendre'); const dp1=g.defense().defenseurs; g.buildings.push('forge'); assert.strictEqual(g.defense().defenseurs,2*dp1);
  // Palier Grande ville à 18 bâtiments, badge, forge débloquée ; écarts des seuils
  assert.deepStrictEqual(STG.map(s=>s.min),[0,3,6,10,15,18,21]); g=mk(); g.res.bois=1e7; g.res.pierre=1e7; for(let i=0;i<18;i++) g.build('hutte'); assert.strictEqual(g.state().stage,'Grande ville'); assert.ok(g.badges.includes('grandeville')&&g.unlocked('forge'));
  // File !construire pendant un vote : max 3, sans doublon, ouverte après le vote
  g=mk(); g.res.bois=1e5; g.res.pierre=1e5; g.startVote(['hutte','attendre']);
  g.chat('a','!construire ferme'); g.chat('b','!construire ferme'); g.chat('c','!construire carriere'); g.chat('d','!construire tour'); g.chat('e','!construire hutte');
  assert.deepStrictEqual(g.pendingBuild,['ferme','carriere','tour']); assert.strictEqual(PENDING_MAX,3); assert.ok(/File pleine/.test(g.feed[0].m)); assert.deepStrictEqual(g.state().pendingBuilds,['ferme','carriere','tour']);
  g.chat('a','!construire atelier'); assert.strictEqual(g.pendingBuild.length,3,'bâtiment verrouillé refusé');
  g.vote.ends=0; T+=1000; g.tick(); assert.ok(g.vote&&g.vote.options[0]==='ferme'); assert.deepStrictEqual(g.pendingBuild,['carriere','tour']);
  // La file ne bloque pas le vote de stratégie avant un raid
  g=mk(); g.res.bois=1e5; g.res.pierre=1e5; g.startVote(['hutte','attendre']); g.chat('a','!construire ferme'); T=g.nextThreat.at-FOYER.warnMs+1; g.vote.ends=0; g.tick(); assert.deepStrictEqual(g.vote.options,['murs','reserves']); assert.deepStrictEqual(g.pendingBuild,['ferme']);
  // À la Cité, les votes automatiques épargnent pour la Merveille
  g=mk(); g.stage=6; g.wonder=2; g.res.bois=500; g.res.pierre=500; assert.strictEqual(g.autoVote(),false); assert.ok(/épargne/.test(g.log[0].m));
  // Réglages : durée de partie, seuils Bits et objectif configurables (effets et plafonds inchangés)
  g=mk({gameLength:'courte'}); assert.strictEqual(g.gameLength,'courte'); assert.ok(g.WPH[2].bois<new Colony().WPH[2].bois); assert.strictEqual(mk({gameLength:'??'}).gameLength,'normale');
  g=mk({bitsTiers:{remparts:200,phare:400,benediction:1000},goalStep:2000}); g.cheer('a',400); assert.ok(g.special,'Phare au seuil configuré'); g.cheer('b',200); assert.ok(g.wallsUntil>T); assert.strictEqual(g.state().goal.target,2000); assert.strictEqual(g.state().bitsTiers[2].bits,400);
  g.cheer('c',1000); assert.ok(g.blessUntil>T); g.cheer('c',1000); assert.strictEqual(g.blessLog.length,1,'plafond Bénédiction inchangé');
  { const {buildConfig}=require('./config'); let r=buildConfig({GAME_LENGTH:'longue',BITS_TIERS:'200, 400, 1000',GOAL_STEP:'2000'}); assert.deepStrictEqual(r.errors,[]); assert.strictEqual(r.config.gameLength,'longue'); assert.deepStrictEqual(r.config.bitsTiers,{remparts:200,phare:400,benediction:1000}); assert.strictEqual(r.config.goalStep,2000);
    assert.strictEqual(buildConfig({GAME_LENGTH:'x'}).errors.length,1); assert.strictEqual(buildConfig({BITS_TIERS:'500,300,1500'}).errors.length,1); assert.strictEqual(buildConfig({BITS_TIERS:'300,500'}).errors.length,1); assert.strictEqual(buildConfig({GOAL_STEP:'10'}).errors.length,1);
    assert.strictEqual(buildConfig({}).config.gameLength,'normale'); }
  console.log('passe GD 2 (butin, pillage, forge, Grande ville, file !construire, réglages) OK'); }
// ─── Sécurité serveur (revue du 17/10) ───
{ const {buildConfig}=require('./config'),{isInside,MAX_BODY,CSP}=require('./http-util'),{userOf}=require('./twitch');
  assert.strictEqual(buildConfig({}).config.host,'127.0.0.1','écoute locale par défaut');
  assert.strictEqual(buildConfig({HOST:'0.0.0.0'}).config.host,'0.0.0.0'); assert.ok(buildConfig({HOST:'a b'}).errors.length);
  const P=path.join(path.sep,'srv','public');
  assert.ok(isInside(P,P)&&isInside(P,path.join(P,'3d','main.js')));
  assert.ok(!isInside(P,P+'-evil'+path.sep+'x.js')&&!isInside(P,P+'2')&&!isInside(P,path.join(P,'..','server','index.js')),'dossier frère refusé');
  assert.ok(/script-src 'self'/.test(CSP)&&!/script-src[^;]*unsafe/.test(CSP));
  // display-name vide → login du préfixe IRC
  assert.strictEqual(userOf({'display-name':''},'@badges=;display-name=;user-id=1 :nicotest!nicotest@nicotest.tmi.twitch.tv PRIVMSG #c :!bois'),'nicotest');
  assert.strictEqual(userOf({'display-name':'NicoTest'},'@display-name=NicoTest :nicotest!nicotest@nicotest.tmi.twitch.tv PRIVMSG #c :salut'),'NicoTest');
  assert.strictEqual(userOf({},':abc!abc@abc.tmi.twitch.tv PRIVMSG #c :x!y'),'abc');
  console.log('sécurité (hôte, chemins, CSP, nom IRC) OK');
  // Serveur réel : hôte par défaut, 413, en-têtes, traversée
  const {spawn}=require('child_process'),http=require('http'),net=require('net');
  const port=20000+Math.floor(Math.random()*20000);
  const srv=spawn(process.execPath,[path.join(__dirname,'index.js')],{env:{...process.env,MODE:'sim',PORT:String(port),HOST:''},stdio:['ignore','pipe','pipe']});
  let out=''; srv.stdout.on('data',d=>out+=d); srv.stderr.on('data',d=>out+=d);
  const req=(o,body)=>new Promise((ok,ko)=>{ const r=http.request({host:'127.0.0.1',port,...o},res=>{ let b=''; res.on('data',c=>b+=c); res.on('end',()=>ok({status:res.statusCode,headers:res.headers,body:b})); }); r.on('error',ko); if(body) r.write(body); r.end(); });
  const raw=(line)=>new Promise(ok=>{ const s=net.connect(port,'127.0.0.1',()=>s.write(line+'\r\nHost: x\r\nConnection: close\r\n\r\n')); let b=''; s.on('data',d=>b+=d); s.on('close',()=>ok(b)); s.on('error',()=>ok(b)); });
  const fail=e=>{ srv.kill(); console.error(out); console.error(e); process.exit(1); };
  const t0=Date.now(); const ready=async()=>{ while(!/Twitch Colony :/.test(out)){ if(Date.now()-t0>8000) throw new Error('serveur non démarré'); await new Promise(r=>setTimeout(r,50)); } };
  (async()=>{ await ready();
    assert.ok(out.includes(`http://127.0.0.1:${port}/`),'écoute sur 127.0.0.1 par défaut');
    let r=await req({path:'/overlay.html'}); assert.strictEqual(r.status,200);
    assert.strictEqual(r.headers['x-content-type-options'],'nosniff'); assert.strictEqual(r.headers['content-security-policy'],CSP);
    r=await req({path:'/api/sim',method:'POST',headers:{'Content-Type':'application/json'}},JSON.stringify({type:'chat',user:'T',text:'!bois'})); assert.strictEqual(r.body,'ok');
    r=await req({path:'/api/sim',method:'POST',headers:{'Content-Type':'application/json'}},'x'.repeat(MAX_BODY+1)); assert.strictEqual(r.status,413,'corps > 10 Ko → 413');
    r=await new Promise(ok=>{ const q=http.request({host:'127.0.0.1',port,path:'/api/sim',method:'POST',headers:{'Transfer-Encoding':'chunked'}},res=>{ res.resume(); ok({status:res.statusCode}); }); q.on('error',()=>ok({status:'reset'})); q.write('y'.repeat(8000)); q.write('y'.repeat(8000)); q.end(); });
    assert.strictEqual(r.status,413,'flux sans Content-Length > 10 Ko → 413');
    for(const p of ['/../server/index.js','/..%2fserver%2findex.js','/../.env','/%2e%2e/.env']){ const b=await raw(`GET ${p} HTTP/1.1`); assert.ok(!/^HTTP\/1\.1 200/.test(b),'traversée refusée : '+p); }
    srv.kill(); console.log('serveur HTTP (127.0.0.1, 413, nosniff + CSP, traversée) OK');
  })().catch(fail); }
