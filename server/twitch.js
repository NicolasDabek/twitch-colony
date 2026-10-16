// Adaptateur chat Twitch : IRC natif (TLS, sans dépendance). Bits via tag bits=, subs via USERNOTICE.
// TODO EventSub (channel.cheer, channel.subscribe) avec TWITCH_EVENTSUB_SECRET.
const tls=require('tls');
function startTwitch(game,t,log=console){
  let delay=5000;
  const connect=()=>{
    const s=tls.connect(6697,'irc.chat.twitch.tv',()=>{
      s.write('CAP REQ :twitch.tv/tags twitch.tv/commands\r\n');
      s.write(`PASS oauth:${t.token}\r\nNICK ${t.botUsername}\r\nJOIN #${t.channel}\r\n`); // jeton jamais journalisé
    });
    let buf=''; s.on('data',d=>{ buf+=d; const lines=buf.split('\r\n'); buf=lines.pop(); lines.forEach(handle); });
    s.on('error',e=>log.error('[twitch] erreur réseau :',e.message));
    s.on('close',()=>{ log.warn(`[twitch] déconnecté, reconnexion dans ${delay/1000} s`); setTimeout(connect,delay); delay=Math.min(delay*2,120000); });
    function handle(l){
      if(l.startsWith('PING')) return s.write('PONG :tmi.twitch.tv\r\n');
      if(/NOTICE \* :(Login authentication failed|Improperly formatted auth)/.test(l)){ log.error('[twitch] Authentification refusée : vérifiez TWITCH_OAUTH_TOKEN et TWITCH_BOT_USERNAME.'); return; }
      if(/ 366 /.test(l)){ delay=5000; log.log(`[twitch] connecté au chat de #${t.channel}`); return; }
      const tags={}; if(l[0]==='@') l.slice(1,l.indexOf(' ')).split(';').forEach(kv=>{ const i=kv.indexOf('='); tags[kv.slice(0,i)]=kv.slice(i+1); });
      const user=tags['display-name']||'';
      if(/ PRIVMSG /.test(l)){ const msg=l.slice(l.indexOf(' :',l.indexOf('PRIVMSG'))+2); if(tags.bits) game.cheer(user,+tags.bits); else game.chat(user,msg); }
      else if(/ USERNOTICE /.test(l)&&tags['msg-id']==='submysterygift') game.giftSubs(user,+tags['msg-param-mass-gift-count']||1);
      else if(/ USERNOTICE /.test(l)&&/^(sub|resub)$/.test(tags['msg-id'])) game.sub(user);
      else if(/ USERNOTICE /.test(l)&&tags['msg-id']==='subgift') game.sub(tags['msg-param-recipient-display-name']||user);
    }
  };
  connect(); return true;
}
module.exports={startTwitch};
