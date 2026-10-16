// Validation et renouvellement du jeton via fetch natif (Node 18+). Ne journalise jamais les secrets.
async function validateToken(token){
  const r=await fetch('https://id.twitch.tv/oauth2/validate',{headers:{Authorization:`OAuth ${token}`}});
  if(!r.ok) return null; return r.json(); // {login, scopes, expires_in, client_id}
}
async function refreshToken(t){
  const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:t.refreshToken,client_id:t.clientId,client_secret:t.clientSecret});
  const r=await fetch('https://id.twitch.tv/oauth2/token',{method:'POST',body});
  if(!r.ok) throw new Error(`renouvellement refusé par Twitch (HTTP ${r.status}). Régénérez le jeton.`);
  const j=await r.json(); t.token=j.access_token; if(j.refresh_token) t.refreshToken=j.refresh_token; return j.expires_in;
}
const REQUIRED=['chat:read','chat:edit','bits:read','channel:read:subscriptions'];
// Retourne true si un jeton utilisable est prêt.
async function ensureToken(t,log=console){
  const canRefresh=t.refreshToken&&t.clientId&&t.clientSecret;
  try{
    let info=t.token?await validateToken(t.token):null;
    if(!info&&canRefresh){ log.log('[auth] jeton absent ou expiré, renouvellement…'); await refreshToken(t); info=await validateToken(t.token); }
    if(!info){ log.error('[auth] Jeton OAuth refusé par Twitch. Régénérez-le (voir README, section « Configurer Twitch »).'); return false; }
    const missing=REQUIRED.filter(s=>!(info.scopes||[]).includes(s));
    if(missing.length) log.warn(`[auth] Scopes manquants : ${missing.join(', ')}. Certaines fonctions ne marcheront pas.`);
    if(info.login&&t.botUsername&&info.login!==t.botUsername) log.warn(`[auth] Le jeton appartient à « ${info.login} », pas à TWITCH_BOT_USERNAME « ${t.botUsername} ».`);
    if(canRefresh&&info.expires_in) setTimeout(()=>(t.token='',ensureToken(t,log)).catch(()=>{}),Math.max(60,info.expires_in-300)*1000).unref();
    log.log(`[auth] jeton valide pour ${info.login}, expire dans ${Math.round((info.expires_in||0)/60)} min.`);
    return true;
  }catch(e){ log.error(`[auth] ${e.message}`); return false; }
}
module.exports={validateToken,refreshToken,ensureToken,REQUIRED};
