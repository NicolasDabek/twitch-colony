// Utilitaires HTTP du serveur local (sans dépendance), testés dans selftest.js.
const path=require('path');
const MAX_BODY=10*1024; // POST /api/sim : 10 Ko max
// CSP : scripts uniquement depuis le serveur (aucun script inline) ; style 'unsafe-inline' car les panneaux
// utilisent des attributs style="" (barres de progression, couleurs) ; data:/blob: pour les images générées.
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";
const SEC_HEADERS={'X-Content-Type-Options':'nosniff','Content-Security-Policy':CSP,'Referrer-Policy':'no-referrer'};
// Vrai si f est root ou se trouve dans root (refuse les dossiers frères comme « public-x »).
const isInside=(root,f)=>f===root||f.startsWith(root+path.sep);
// 1.0.0 : validation stricte des évènements du simulateur (/api/sim). Retourne l'évènement nettoyé, ou null.
const SIM_TYPES=new Set(['chat','cheer','sub','vote','reset','build','gift','wonder','raid']);
const str=(v,max,def)=>typeof v==='string'&&v.trim()?v.trim().slice(0,max):def;
const intIn=(v,min,max,def)=>{ if(v===undefined||v===null||v==='') return def; const n=Number(v); return Number.isInteger(n)&&n>=min&&n<=max?n:null; };
function cleanSimEvent(e){
  if(!e||typeof e!=='object'||Array.isArray(e)||!SIM_TYPES.has(e.type)) return null;
  const out={type:e.type,user:str(e.user,40,'Viewer')};
  if(e.user!==undefined&&typeof e.user!=='string') return null;
  if(e.type==='chat'){ if(typeof e.text!=='string') return null; out.text=e.text.slice(0,500); }
  if(e.type==='cheer'){ out.bits=intIn(e.bits,1,100000,100); if(out.bits==null) return null; }
  if(e.type==='gift'){ out.n=intIn(e.n,1,50,5); if(out.n==null) return null; }
  if(e.type==='build'){ if(typeof e.name!=='string'||!/^[a-z]{1,20}$/.test(e.name)) return null; out.name=e.name; }
  return out;
}
// Limiteur simple (fenêtre fixe d'une seconde) : protège le simulateur local contre un flot de requêtes.
function rateLimiter(perSec,now=Date.now){ let win=0,count=0; return ()=>{ const t=Math.floor(now()/1000); if(t!==win){ win=t; count=0; } return ++count<=perSec; }; }
// Requête venue d'une autre origine (page web tierce qui viserait le serveur local) : refusée.
function sameOrigin(req){ const o=req.headers.origin; if(!o) return true; try{ return new URL(o).host===req.headers.host; }catch{ return false; } }
module.exports={MAX_BODY,CSP,SEC_HEADERS,isInside,cleanSimEvent,rateLimiter,sameOrigin};
