// Adaptateur chat Twitch : IRC natif (TLS, sans dépendance). Bits via le tag bits=, subs via USERNOTICE.
// EventSub n'est pas utilisé en 1.0 : le chat IRC suffit pour les commandes, les Bits et les subs (TWITCH_EVENTSUB_SECRET est réservé).
const tls=require('tls');
// Valeurs de tags IRCv3 : \s espace, \: point-virgule, \\ barre oblique inverse.
const unescapeTag=v=>String(v||'').replace(/\\(s|:|\\|r|n)/g,(_,c)=>({s:' ',':':';','\\':'\\',r:'',n:''}[c]));
// Nom public : display-name, sinon le login du préfixe IRC (« :login!login@login.tmi.twitch.tv »).
function userOf(tags,line){
  const d=unescapeTag(tags['display-name']).trim(); if(d) return d;
  const m=line.match(/(?:^|\s):([^\s!:@]+)!/); return m?m[1]:(tags.login||'');
}
function parseTags(l){ const tags={}; if(l[0]==='@') l.slice(1,l.indexOf(' ')).split(';').forEach(kv=>{ const i=kv.indexOf('='); if(i>0) tags[kv.slice(0,i)]=kv.slice(i+1); }); return tags; }
// Applique une ligne IRC au jeu. Retourne ce qu'il faut faire côté connexion : 'pong', 'reconnect', 'auth', 'joined' ou null.
function handleLine(game,l,t){
  if(l.startsWith('PING')) return 'pong';
  const tags=parseTags(l), body=l[0]==='@'?l.slice(l.indexOf(' ')+1):l;
  if(/^:tmi\.twitch\.tv RECONNECT\b/.test(body)||/^RECONNECT\b/.test(body)) return 'reconnect';
  if(/NOTICE \* :(Login authentication failed|Improperly formatted auth)/.test(body)) return 'auth';
  if(/^\S+ 366 /.test(body)) return 'joined';
  const user=userOf(tags,body); if(!user) return null;
  if(/^\S+ PRIVMSG #/.test(body)){ const msg=body.slice(body.indexOf(' :',body.indexOf('PRIVMSG'))+2); const bits=parseInt(tags.bits,10);
    if(Number.isInteger(bits)&&bits>0) game.cheer(user,bits); else game.chat(user,msg); }
  else if(/^\S+ USERNOTICE /.test(body)){ const id=tags['msg-id'];
    if(id==='submysterygift') game.giftSubs(user,parseInt(tags['msg-param-mass-gift-count'],10)||1);
    else if(id==='sub'||id==='resub') game.sub(user);
    else if(id==='subgift'&&!tags['msg-param-community-gift-id']) game.sub(unescapeTag(tags['msg-param-recipient-display-name'])||user); }
  return null;
}
// Connexion avec reconnexion exponentielle (5 s → 2 min), commande RECONNECT de Twitch, et chien de garde :
// sans aucune donnée pendant 6 min (Twitch envoie un PING toutes les ~5 min), la connexion est relancée.
function startTwitch(game,t,log=console,{connectFn=(...a)=>tls.connect(...a),idleMs=6*60000,onAuthFail=null}={}){
  let delay=5000,stopped=false,sock=null;
  const connect=()=>{ if(stopped) return;
    const s=sock=connectFn(6697,'irc.chat.twitch.tv',()=>{
      s.write('CAP REQ :twitch.tv/tags twitch.tv/commands\r\n');
      s.write(`PASS oauth:${t.token}\r\nNICK ${t.botUsername}\r\nJOIN #${t.channel}\r\n`); // jeton jamais journalisé
    });
    let buf='',idle=null,closed=false; const kick=()=>{ clearTimeout(idle); idle=setTimeout(()=>{ log.warn('[twitch] aucune donnée depuis 6 min, reconnexion'); s.destroy(); },idleMs); if(idle.unref) idle.unref(); };
    kick(); s.setEncoding&&s.setEncoding('utf8');
    s.on('data',d=>{ kick(); buf+=d; if(buf.length>1e6) buf=''; const lines=buf.split('\r\n'); buf=lines.pop(); lines.forEach(l=>{ let a=null; try{ a=handleLine(game,l,t); }catch(e){ log.error('[twitch] ligne ignorée :',e.message); }
      if(a==='pong') s.write('PONG :tmi.twitch.tv\r\n');
      else if(a==='joined'){ delay=5000; log.log(`[twitch] connecté au chat de #${t.channel}`); }
      else if(a==='reconnect'){ log.warn('[twitch] Twitch demande une reconnexion'); delay=1000; s.destroy(); }
      else if(a==='auth'){ log.error('[twitch] Authentification refusée : vérifiez TWITCH_OAUTH_TOKEN et TWITCH_BOT_USERNAME.'); if(onAuthFail) onAuthFail(); s.destroy(); } }); });
    s.on('error',e=>log.error('[twitch] erreur réseau :',e.message));
    s.on('close',()=>{ if(closed) return; closed=true; clearTimeout(idle); if(stopped) return; log.warn(`[twitch] déconnecté, reconnexion dans ${Math.round(delay/1000)} s`); setTimeout(connect,delay); delay=Math.min(delay*2,120000); });
  };
  connect();
  return {stop(){ stopped=true; if(sock) sock.destroy(); }};
}
module.exports={startTwitch,userOf,handleLine,unescapeTag};
