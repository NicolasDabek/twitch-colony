// Adaptateur Twitch. Chat : connexion IRC native (TLS, sans dépendance).
// Bits/subs : lus depuis les tags IRC USERNOTICE/PRIVMSG (bits=). EventSub = TODO.
const tls=require('tls');
function startTwitch(game,env){
  const {TWITCH_CHANNEL:ch,TWITCH_BOT_USERNAME:nick,TWITCH_OAUTH_TOKEN:tok}=env;
  if(!ch||!nick||!tok){ console.warn('[twitch] Variables manquantes, retour au mode simulation.'); return false; }
  const s=tls.connect(6697,'irc.chat.twitch.tv',()=>{
    s.write('CAP REQ :twitch.tv/tags twitch.tv/commands\r\n'); s.write(`PASS ${tok}\r\nNICK ${nick}\r\nJOIN #${ch.toLowerCase()}\r\n`);
    console.log(`[twitch] connecté à #${ch}`);
  });
  let buf=''; s.on('data',d=>{ buf+=d; const lines=buf.split('\r\n'); buf=lines.pop(); lines.forEach(handle); });
  s.on('error',e=>console.error('[twitch]',e.message)); s.on('close',()=>{ console.warn('[twitch] déconnecté, reconnexion dans 10 s'); setTimeout(()=>startTwitch(game,env),10000); });
  function handle(l){
    if(l.startsWith('PING')) return s.write('PONG :tmi.twitch.tv\r\n');
    const tags={}; if(l[0]==='@'){ l.slice(1,l.indexOf(' ')).split(';').forEach(kv=>{const [k,v]=kv.split('=');tags[k]=v;}); }
    const user=tags['display-name']||'';
    if(/ PRIVMSG /.test(l)){ const msg=l.slice(l.indexOf(' :',l.indexOf('PRIVMSG'))+2); if(tags.bits) game.cheer(user,+tags.bits); else game.chat(user,msg); }
    else if(/ USERNOTICE /.test(l)&&/^(sub|resub|subgift)$/.test(tags['msg-id'])) game.sub(user);
  }
  // TODO EventSub (channel.cheer, channel.subscribe) via webhook signé avec TWITCH_EVENTSUB_SECRET.
  return true;
}
module.exports={startTwitch};
