const http=require('http'),fs=require('fs'),path=require('path');
const {Colony}=require('./game'),{startTwitch}=require('./twitch');
const {MAX_BODY,SEC_HEADERS,isInside,cleanSimEvent,rateLimiter,sameOrigin}=require('./http-util');
const {loadEnv,buildConfig,summary,ENV_PATH}=require('./config'),{ensureToken}=require('./auth');
const VERSION=require('../package.json').version;
if(!loadEnv()) console.log(`[config] Pas de fichier .env (${ENV_PATH}) : valeurs par défaut, mode simulation.`);
const {config:cfg,errors,warnings}=buildConfig();
warnings.forEach(w=>console.warn('[config] ⚠ '+w));
if(errors.length){ console.error('[config] Configuration invalide :\n  - '+errors.join('\n  - ')+'\nCorrigez le fichier .env (voir .env.example et le README), ou mettez MODE=sim pour jouer sans Twitch.'); process.exit(1); }
console.log(`[config] v${VERSION} `+summary(cfg));
const PORT=cfg.port, HOST=cfg.host, PUB=path.join(__dirname,'..','public');
const game=new Colony(cfg); const clients=new Set(), MAX_CLIENTS=50;
let twitchOn=cfg.mode==='twitch';
// Jeton refusé en cours de stream : renouvellement automatique si TWITCH_REFRESH_TOKEN + CLIENT_ID + CLIENT_SECRET, sinon nouvelles tentatives espacées.
const onAuthFail=()=>{ const t=cfg.twitch; if(t.refreshToken&&t.clientId&&t.clientSecret){ t.token=''; ensureToken(t).catch(()=>{}); } };
if(twitchOn) ensureToken(cfg.twitch).then(ok=>{ if(ok) startTwitch(game,cfg.twitch,console,{onAuthFail}); else { console.error('[twitch] Connexion impossible, arrêt.'); process.exit(1); } });
const push=()=>{ const d=`data: ${JSON.stringify({...game.state(),mode:twitchOn?'twitch':'sim'})}\n\n`; clients.forEach(c=>c.write(d)); };
// Une erreur ponctuelle de la boucle de jeu est journalisée sans arrêter le stream.
const safe=(what,f)=>()=>{ try{ f(); }catch(e){ console.error(`[jeu] erreur (${what}) :`,e&&e.stack||e); } };
setInterval(safe('tick',()=>{ game.tick(); push(); }),1000);
if(cfg.voteIntervalMs) setInterval(safe('vote',()=>game.autoVote()),cfg.voteIntervalMs);
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const send=(res,code,body,type='text/plain; charset=utf-8',extra={})=>{ res.writeHead(code,{'Content-Type':type,...SEC_HEADERS,...extra}); res.end(body); };
const simLimit=rateLimiter(30);
const ACTIONS={chat:e=>game.chat(e.user,e.text),cheer:e=>game.cheer(e.user,e.bits),sub:e=>game.sub(e.user),vote:()=>game.autoVote(),reset:()=>game.reset(),build:e=>game.build(e.name),gift:e=>game.giftSubs(e.user,e.n),wonder:()=>game.buildWonder(),raid:()=>game.forceRaid()};
const server=http.createServer((req,res)=>{
  let u; try{ u=new URL(req.url,'http://x'); decodeURIComponent(u.pathname); }catch{ return send(res,400,'requête invalide'); }
  if(u.pathname==='/events'){
    if(clients.size>=MAX_CLIENTS) return send(res,503,'trop de connexions');
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive',...SEC_HEADERS}); clients.add(res); push(); req.on('close',()=>clients.delete(res)); return; }
  if(u.pathname==='/api/sim'){
    if(req.method!=='POST') return send(res,405,'POST uniquement',undefined,{Allow:'POST'});
    if(twitchOn) return send(res,403,'simulation désactivée en mode twitch');
    if(!sameOrigin(req)) return send(res,403,'origine refusée');
    if(!simLimit()) return send(res,429,'trop de requêtes',undefined,{'Retry-After':'1'});
    if(+req.headers['content-length']>MAX_BODY){ res.writeHead(413,{'Content-Type':'text/plain; charset=utf-8',Connection:'close',...SEC_HEADERS}); return res.end('corps trop volumineux (max 10 Ko)',()=>req.destroy()); }
    let b='',size=0,tooBig=false; req.on('error',()=>{}); req.on('data',c=>{ if(tooBig) return; size+=c.length; if(size>MAX_BODY){ tooBig=true; res.writeHead(413,{'Content-Type':'text/plain; charset=utf-8',Connection:'close',...SEC_HEADERS}); res.end('corps trop volumineux (max 10 Ko)',()=>req.destroy()); return; } b+=c; });
    req.on('end',()=>{ if(tooBig) return; let e; try{ e=cleanSimEvent(JSON.parse(b||'{}')); }catch{ e=null; }
      if(!e) return send(res,400,'évènement invalide');
      try{ ACTIONS[e.type](e); push(); send(res,200,'ok'); }catch(err){ console.error('[sim] erreur :',err&&err.message); send(res,500,'erreur'); } }); return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD') return send(res,405,'méthode non autorisée',undefined,{Allow:'GET, HEAD'});
  if(u.pathname==='/game.js'||u.pathname==='/game-config.js'){ res.writeHead(200,{'Content-Type':TYPES['.js'],...SEC_HEADERS}); return fs.createReadStream(path.join(__dirname,u.pathname.slice(1))).pipe(res); }
  if(u.pathname==='/api/state') return send(res,200,JSON.stringify(game.state()),'application/json; charset=utf-8',{'Cache-Control':'no-store'});
  if(u.pathname==='/healthz') return send(res,200,JSON.stringify({ok:true,version:VERSION,mode:twitchOn?'twitch':'sim'}),'application/json; charset=utf-8',{'Cache-Control':'no-store'});
  let f=path.normalize(path.join(PUB,u.pathname==='/'?'overlay.html':u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname));
  if(!isInside(PUB,f)) return send(res,403,'interdit');
  fs.readFile(f,(err,data)=>{ if(err) return send(res,404,'404'); send(res,200,data,TYPES[path.extname(f)]||'application/octet-stream'); });
});
server.on('clientError',(e,sock)=>{ if(sock.writable) sock.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); });
server.on('error',e=>{ console.error(e.code==='EADDRINUSE'?`[http] Le port ${PORT} est déjà utilisé : fermez l'autre serveur ou changez PORT dans .env.`:`[http] erreur : ${e.message}`); process.exit(1); });
server.listen(PORT,HOST,()=>console.log(`Twitch Colony : http://${HOST==='0.0.0.0'||HOST==='::'?'localhost':HOST.includes(':')?'['+HOST+']':HOST}:${PORT}/overlay.html  (simulateur : /sim.html) — mode ${twitchOn?'twitch':'sim'}`));
// Arrêt propre (Ctrl+C, arrêt du service) : ferme les flux SSE puis le serveur.
const stop=sig=>{ console.log(`[http] arrêt (${sig})`); clients.forEach(c=>c.end()); server.close(()=>process.exit(0)); setTimeout(()=>process.exit(0),2000).unref(); };
process.on('SIGINT',()=>stop('SIGINT')); process.on('SIGTERM',()=>stop('SIGTERM'));
