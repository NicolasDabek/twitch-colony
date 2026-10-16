const http=require('http'),fs=require('fs'),path=require('path');
const {Colony}=require('./game'),{startTwitch}=require('./twitch');
try{ fs.readFileSync(path.join(__dirname,'..','.env'),'utf8').split('\n').forEach(l=>{const m=l.match(/^\s*([A-Z_]+)=(.*)$/); if(m&&!process.env[m[1]]) process.env[m[1]]=m[2];}); }catch{}
const PORT=+process.env.PORT||3000, MODE=process.env.MODE||'sim', PUB=path.join(__dirname,'..','public');
const game=new Colony(); const clients=new Set();
const twitchOn = MODE==='twitch' && startTwitch(game,process.env);
const push=()=>{ const d=`data: ${JSON.stringify({...game.state(),mode:twitchOn?'twitch':'sim'})}\n\n`; clients.forEach(c=>c.write(d)); };
setInterval(()=>{ game.tick(); push(); },1000);
setInterval(()=>game.startVote(['hutte','ferme','carriere','tour']),180000);
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'};
http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x');
  if(u.pathname==='/events'){ res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'}); clients.add(res); push(); req.on('close',()=>clients.delete(res)); return; }
  if(u.pathname==='/api/sim'&&req.method==='POST'){
    if(twitchOn){ res.writeHead(403); return res.end('simulation désactivée en mode twitch'); }
    let b=''; req.on('data',c=>b+=c); req.on('end',()=>{ try{ const e=JSON.parse(b||'{}');
      if(e.type==='chat') game.chat(e.user||'Viewer',e.text||''); else if(e.type==='cheer') game.cheer(e.user||'Viewer',e.bits||100);
      else if(e.type==='sub') game.sub(e.user||'Viewer'); else if(e.type==='vote') game.startVote(['hutte','ferme','carriere','tour']); else if(e.type==='reset') game.reset();
      push(); res.end('ok'); }catch{ res.writeHead(400); res.end('bad'); } }); return;
  }
  if(u.pathname==='/api/state'){ res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify(game.state())); }
  let f=path.normalize(path.join(PUB,u.pathname==='/'?'overlay.html':u.pathname));
  if(!f.startsWith(PUB)){ res.writeHead(403); return res.end(); }
  fs.readFile(f,(err,data)=>{ if(err){ res.writeHead(404); return res.end('404'); } res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'}); res.end(data); });
}).listen(PORT,()=>console.log(`Twitch Colony : http://localhost:${PORT}/overlay.html  (simulateur : /sim.html) — mode ${twitchOn?'twitch':'sim'}`));
