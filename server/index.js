const http=require('http'),fs=require('fs'),path=require('path');
const {Colony}=require('./game'),{startTwitch}=require('./twitch');
const {loadEnv,buildConfig,summary,ENV_PATH}=require('./config'),{ensureToken}=require('./auth');
if(!loadEnv()) console.log(`[config] Pas de fichier .env (${ENV_PATH}) : valeurs par défaut, mode simulation.`);
const {config:cfg,errors,warnings}=buildConfig();
warnings.forEach(w=>console.warn('[config] ⚠ '+w));
if(errors.length){ console.error('[config] Configuration invalide :\n  - '+errors.join('\n  - ')+'\nCorrigez le fichier .env (voir .env.example et le README), ou mettez MODE=sim pour jouer sans Twitch.'); process.exit(1); }
console.log('[config] '+summary(cfg));
const PORT=cfg.port, PUB=path.join(__dirname,'..','public');
const game=new Colony(cfg); const clients=new Set();
let twitchOn=cfg.mode==='twitch';
if(twitchOn) ensureToken(cfg.twitch).then(ok=>{ if(ok) startTwitch(game,cfg.twitch); else { console.error('[twitch] Connexion impossible, arrêt.'); process.exit(1); } });
const push=()=>{ const d=`data: ${JSON.stringify({...game.state(),mode:twitchOn?'twitch':'sim'})}\n\n`; clients.forEach(c=>c.write(d)); };
setInterval(()=>{ game.tick(); push(); },1000);
if(cfg.voteIntervalMs) setInterval(()=>game.autoVote(),cfg.voteIntervalMs);
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'};
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x');
  if(u.pathname==='/events'){ res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'}); clients.add(res); push(); req.on('close',()=>clients.delete(res)); return; }
  if(u.pathname==='/api/sim'&&req.method==='POST'){
    if(twitchOn){ res.writeHead(403); return res.end('simulation désactivée en mode twitch'); }
    let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ try{ const e=JSON.parse(b||'{}');
      if(e.type==='chat') game.chat(e.user||'Viewer',e.text||''); else if(e.type==='cheer') game.cheer(e.user||'Viewer',e.bits||100);
      else if(e.type==='sub') game.sub(e.user||'Viewer'); else if(e.type==='vote') game.autoVote(); else if(e.type==='reset') game.reset(); else if(e.type==='build') game.build(e.name);
      push(); res.end('ok'); }catch{ res.writeHead(400); res.end('bad'); } }); return;
  }
  if(u.pathname==='/game.js'){ res.writeHead(200,{'Content-Type':'text/javascript'}); return fs.createReadStream(path.join(__dirname,'game.js')).pipe(res); }
  if(u.pathname==='/api/state'){ res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify(game.state())); }
  let f=path.normalize(path.join(PUB,u.pathname==='/'?'overlay.html':u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname));
  if(!f.startsWith(PUB)){ res.writeHead(403); return res.end(); }
  fs.readFile(f,(err,data)=>{ if(err){ res.writeHead(404); return res.end('404'); } res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'}); res.end(data); });
}).listen(PORT,()=>console.log(`Twitch Colony : http://localhost:${PORT}/overlay.html  (simulateur : /sim.html) — mode ${twitchOn?'twitch':'sim'}`));
