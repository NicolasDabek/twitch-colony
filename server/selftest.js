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
for(const [a,b] of [['server/game.js','docs/game.js'],['public/overlay.js','docs/overlay.js'],['public/controls.js','docs/controls.js'],['public/style.css','docs/style.css'],['public/demo.css','docs/demo.css']])
  assert.equal(fs.readFileSync(path.join(__dirname,'..',a),'utf8'),fs.readFileSync(path.join(__dirname,'..',b),'utf8'),`${b} périmé : lancez npm run build:pages`);
console.log('docs OK');
// ─── Analyse game design ───
const {BUILDINGS:B}=require('./game');
let T=1e9; const clock=()=>T; const mk=(o={})=>new Colony({cooldownMs:0,now:clock,...o});
// QW1 vote auto : seulement abordables
let c=mk(); c.res.bois=25; c.autoVote(); assert.deepEqual(c.vote.options,['hutte']);
c=mk(); c.res.bois=0; assert.equal(c.autoVote(),false); assert.ok(!c.vote);
// QW2 Bits → round(bits/10) bois
c=mk(); c.cheer('A',99); assert.equal(c.res.bois,10+10); c.cheer('A',14); assert.equal(c.res.bois,21);
// QW3 Phare ×2 et prolongation
c=mk(); c.cheer('A',500); c.chat('U','!bois'); assert.equal(c.res.bois,10+50+4);
const u0=c.special.until; c.cheer('B',500); assert.equal(c.special.until,u0+10*60000);
// QW4 égalité au hasard annoncée
c=mk({rng:()=>0.99}); c.res.bois=100; c.res.pierre=50; c.startVote(['hutte','ferme']); c.chat('X','!vote hutte'); c.chat('Y','!vote ferme');
c.vote.ends=0; c.tick(); assert.ok(c.log.some(l=>/Égalité.*hasard/.test(l.m))); assert.deepEqual(c.buildings,['ferme']);
// QW5 colons produisent floor(pop/2) bois / 10 s
c=mk(); c.pop=5; c.res.nourriture=100; for(let i=0;i<10;i++) c.tick(); assert.equal(c.res.bois,12);
// QW6 1 pt / 25 Bits
c=mk(); c.cheer('A',100); assert.equal(c.leaders.A,4);
// Orage : !bois donne +1 pierre
c=mk(); c.cheer('A',5000); const p0=c.res.pierre; c.chat('U','!bois'); assert.equal(c.res.pierre,p0+1);
// Tour : protège du raid ; sans tour, perte
c=mk(); c.res.bois=100; T+=15*60000; c.tick(); assert.equal(c.res.bois,70); T=1e9;
c=mk(); c.buildings=['tour']; c.res.bois=100; T+=15*60000; c.tick(); assert.equal(c.res.bois,100); assert.equal(c.threat?.type,undefined); assert.equal(c.nextThreat.type,'hiver'); T=1e9;
// Hiver sans nourriture : départs
c=mk(); c.buildings=['tour']; T+=15*60000; c.tick(); c.res.nourriture=0; c.pop=4; T+=15*60000; c.tick(); assert.ok(c.pop<4); T=1e9;
// Famine : -1 colon par minute
c=mk(); c.res.nourriture=0; c.pop=3; c.tick(); T+=60000; c.tick(); assert.equal(c.pop,2); T=1e9;
// Paliers
c=mk(); c.res.bois=1e4; c.res.pierre=1e4; ['hutte','ferme','carriere'].forEach(b=>c.build(b)); assert.equal(c.state().stage,'Village');
// Coûts : croissance par exemplaire et selon viewers actifs
c=mk(); assert.equal(c.cost('hutte').bois,20); c.res.bois=1e4; c.build('hutte'); assert.equal(c.cost('hutte').bois,25);
c=mk(); for(let i=0;i<20;i++) c.chat('v'+i,'!bois'); assert.equal(c.activeViewers(),20); assert.equal(c.cost('hutte').bois,80);
T+=6*60000; assert.equal(c.activeViewers(),0); T=1e9;
// Les viewers gratuits progressent sans Bits
c=mk({cooldownMs:5000}); for(let s=0;s<60;s++){ T+=5000; ['a','b','c'].forEach(u=>c.chat(u,'!bois')); } assert.ok(c.affordable('hutte')); T=1e9;
console.log('game design OK');
// Alertes et fil d'actions
c=mk(); c.chat('A','!bois'); c.chat('B','!pierre'); c.chat('C','!chasse'); c.chat('D','!bois'); assert.equal(c.feed.length,3); assert.ok(/D coupe du bois/.test(c.feed[0].m));
c.sub('Z'); assert.equal(c.alert.kind,'sub'); c.cheer('Y',100); assert.equal(c.alert.kind,'bits'); c.res.bois=999; c.build('hutte'); assert.equal(c.alert.kind,'build');
for(const f of ['docs/index.html','public/sim.html','public/confidentialite.html']) assert.ok(/name="viewport"/.test(fs.readFileSync(path.join(__dirname,'..',f),'utf8')),f+' viewport');
console.log('ui OK');
