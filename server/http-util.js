// Utilitaires HTTP du serveur local (sans dépendance), testés dans selftest.js.
const path=require('path');
const MAX_BODY=10*1024; // POST /api/sim : 10 Ko max
// CSP : scripts uniquement depuis le serveur (aucun script inline) ; style 'unsafe-inline' car les panneaux
// utilisent des attributs style="" (barres de progression, couleurs) ; data:/blob: pour les images générées.
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'";
const SEC_HEADERS={'X-Content-Type-Options':'nosniff','Content-Security-Policy':CSP};
// Vrai si f est root ou se trouve dans root (refuse les dossiers frères comme « public-x »).
const isInside=(root,f)=>f===root||f.startsWith(root+path.sep);
module.exports={MAX_BODY,CSP,SEC_HEADERS,isInside};
