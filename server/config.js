// Chargement .env (sans dépendance) + validation + masquage des secrets.
const fs=require('fs'),path=require('path');
const ENV_PATH=path.join(__dirname,'..','.env');
const SECRETS=['TWITCH_OAUTH_TOKEN','TWITCH_CLIENT_SECRET','TWITCH_REFRESH_TOKEN','TWITCH_EVENTSUB_SECRET'];
function loadEnv(file=ENV_PATH){
  let txt; try{ txt=fs.readFileSync(file,'utf8'); }catch{ return false; }
  for(const raw of txt.split(/\r?\n/)){
    const l=raw.trim(); if(!l||l[0]==='#') continue;
    const m=l.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/); if(!m) continue;
    let v=m[2]; if(/^(['"]).*\1$/.test(v)) v=v.slice(1,-1); else v=v.replace(/\s+#.*$/,'').trim();
    if(process.env[m[1]]===undefined) process.env[m[1]]=v;
  }
  return true;
}
const mask=v=>!v?'(vide)':v.length<=8?'****':v.slice(0,4)+'…'+'*'.repeat(4);
function int(env,k,def,min,max,errors){
  const v=env[k]; if(v===undefined||v==='') return def;
  const n=Number(v); if(!Number.isInteger(n)||n<min||n>max){ errors.push(`${k} doit être un entier entre ${min} et ${max} (reçu « ${v} »).`); return def; } return n;
}
function buildConfig(env=process.env){
  const errors=[],warnings=[];
  const c={ mode:(env.MODE||'sim').toLowerCase() };
  if(!['sim','twitch'].includes(c.mode)) errors.push(`MODE doit valoir « sim » ou « twitch » (reçu « ${env.MODE} »).`);
  c.port=int(env,'PORT',3000,1,65535,errors);
  c.host=(env.HOST||'').trim()||'127.0.0.1'; // local par défaut ; 0.0.0.0 = accessible depuis le réseau local
  if(!/^[A-Za-z0-9.:\-\[\]]+$/.test(c.host)) errors.push(`HOST doit être une adresse IP ou un nom d'hôte (reçu « ${env.HOST} »).`);
  c.cooldownMs=int(env,'COMMAND_COOLDOWN_SECONDS',5,0,3600,errors)*1000;
  c.voteDurationMs=int(env,'VOTE_DURATION_SECONDS',30,5,3600,errors)*1000;
  c.voteIntervalMs=int(env,'AUTO_VOTE_INTERVAL_SECONDS',180,0,86400,errors)*1000;
  c.twitch={
    channel:(env.TWITCH_CHANNEL||'').trim().replace(/^#/,'').toLowerCase(),
    botUsername:(env.TWITCH_BOT_USERNAME||'').trim().toLowerCase(),
    token:(env.TWITCH_OAUTH_TOKEN||'').trim().replace(/^oauth:/i,''),
    clientId:(env.TWITCH_CLIENT_ID||'').trim(), clientSecret:(env.TWITCH_CLIENT_SECRET||'').trim(),
    refreshToken:(env.TWITCH_REFRESH_TOKEN||'').trim(), eventsubSecret:(env.TWITCH_EVENTSUB_SECRET||'').trim(),
  };
  const t=c.twitch, login=/^[a-z0-9_]{3,25}$/;
  if(c.mode==='twitch'){
    if(!t.channel) errors.push('TWITCH_CHANNEL est vide : indiquez le nom de votre chaîne (ex. nicolasdabek).');
    else if(!login.test(t.channel)) errors.push(`TWITCH_CHANNEL « ${t.channel} » est invalide (3 à 25 caractères : lettres, chiffres, _).`);
    if(!t.botUsername) errors.push('TWITCH_BOT_USERNAME est vide : indiquez le compte qui se connecte au chat (votre chaîne ou un compte bot).');
    else if(!login.test(t.botUsername)) errors.push(`TWITCH_BOT_USERNAME « ${t.botUsername} » est invalide.`);
    if(!t.token&&!(t.refreshToken&&t.clientId&&t.clientSecret)) errors.push('TWITCH_OAUTH_TOKEN est vide (et pas de TWITCH_REFRESH_TOKEN + TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET pour en obtenir un).');
    else if(t.token&&!/^[a-z0-9]{20,64}$/i.test(t.token)) errors.push('TWITCH_OAUTH_TOKEN a un format invalide (attendu : « oauth:xxxx » ou le jeton brut alphanumérique).');
    if(t.refreshToken&&!(t.clientId&&t.clientSecret)) warnings.push('TWITCH_REFRESH_TOKEN fourni sans TWITCH_CLIENT_ID/TWITCH_CLIENT_SECRET : le renouvellement automatique est désactivé.');
    if(t.eventsubSecret&&(t.eventsubSecret.length<10||t.eventsubSecret.length>100)) errors.push('TWITCH_EVENTSUB_SECRET doit faire entre 10 et 100 caractères.');
  }
  return {config:c,errors,warnings};
}
function summary(c){
  const t=c.twitch;
  return `mode=${c.mode} hôte=${c.host} port=${c.port} chaîne=${t.channel||'(vide)'} bot=${t.botUsername||'(vide)'} token=${mask(t.token)} clientId=${mask(t.clientId)} clientSecret=${mask(t.clientSecret)} refresh=${mask(t.refreshToken)}`;
}
module.exports={loadEnv,buildConfig,mask,summary,SECRETS,ENV_PATH};
