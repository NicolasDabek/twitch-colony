// Icônes SVG intégrées (aucune police emoji ni CDN requis). Utilisées par l'overlay, la démo et la vue 3D.
(function(){
const P={
 grenier:'<path d="M4 11h16v10H4z" fill="#c9925a"/><path d="M2 11.5L12 4l10 7.5z" fill="#7a4a22"/><path d="M9 14h6v7H9z" fill="#5a3818"/><path d="M9 14l6 7M15 14l-6 7" stroke="#c9925a" stroke-width="1"/>',
 palissade:'<g fill="#a0652d"><path d="M3 9l1.5-3L6 9v12H3zM7.5 9L9 6l1.5 3v12h-3zM12 9l1.5-3L15 9v12h-3zM16.5 9L18 6l1.5 3v12h-3z"/></g><path d="M2 13h20M2 17h20" stroke="#6b4a2b" stroke-width="1.6"/>',
 marche:'<path d="M3 10h18v11H3z" fill="#e8d9a8"/><path d="M2 10l2-6h16l2 6z" fill="#d04040"/><path d="M5 4l-1 6M9 4v6M15 4v6M19 4l1 6" stroke="#fff" stroke-width="1.4"/><circle cx="8" cy="15" r="2" fill="#ffb020"/><circle cx="14" cy="15" r="2" fill="#7fae3e"/>',
 forge:'<path d="M3 11h18v10H3z" fill="#6b5a4a"/><path d="M2 11.5L12 5l10 6.5z" fill="#8a3b2a"/><path d="M16 4h3v6h-3z" fill="#555"/><path d="M7 17h8l-1.5-2.5h-5z" fill="#2b2b33"/><path d="M9 14.5h4v-1.2H9z" fill="#2b2b33"/><circle cx="6.5" cy="19" r="1.4" fill="#ff8a2b"/>',
 atelier:'<path d="M3 10h18v11H3z" fill="#9aa3ad"/><path d="M2 10.5L12 4l10 6.5z" fill="#4a5d8a"/><circle cx="12" cy="15.5" r="3.2" fill="none" stroke="#ffd23f" stroke-width="2"/><circle cx="12" cy="15.5" r="1" fill="#ffd23f"/>',
 merveille:'<path d="M3 20h18v2H3zM5 10h14v2H5z" fill="#e8dcc0"/><path d="M6 12h2v8H6zM11 12h2v8h-2zM16 12h2v8h-2z" fill="#f2efe6"/><path d="M4 10l8-7 8 7z" fill="#ffd23f"/>',
 foyer:'<path d="M5 20h14l-1.5-4h-11z" fill="#8d8d8d"/><path d="M12 3c3 4 5 6 5 9a5 5 0 01-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-5.5 1-7.5z" fill="#ff8a1f"/><path d="M12 9c1.5 2 2.5 3 2.5 4.5a2.5 2.5 0 01-5 0c0-1.5 1.2-2.6 2.5-4.5z" fill="#ffd23f"/>',
 bouclier:'<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#4a7bd1"/><path d="M12 5l5 2v4c0 3.5-2.2 6.3-5 7.7z" fill="#7fa6ff"/>',
 reparer:'<path d="M14.5 3a5 5 0 00-4.7 6.7L3 16.5 5.5 19l6.8-6.8A5 5 0 0019 7.5l-3 3-2.5-2.5 3-3A5 5 0 0014.5 3z" fill="#c9ced6"/>',
 defi:'<circle cx="12" cy="12" r="9" fill="#d04040"/><circle cx="12" cy="12" r="6" fill="#fff"/><circle cx="12" cy="12" r="3" fill="#d04040"/>',
 badge:'<path d="M8 2h8l-2 7h-4z" fill="#4a7bd1"/><circle cx="12" cy="15" r="6" fill="#ffd23f"/><path d="M12 11.5l1.1 2.3 2.4.3-1.8 1.6.5 2.4L12 17l-2.2 1.1.5-2.4-1.8-1.6 2.4-.3z" fill="#c27c00"/>',
 aide:'<circle cx="12" cy="12" r="10" fill="#7c6bd6"/><path d="M9.5 9.5a2.5 2.5 0 115 0c0 1.8-2.5 2-2.5 4" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="12" cy="17.5" r="1.3" fill="#fff"/>',
 crane:'<path d="M12 3a8 8 0 00-8 8c0 3 1.5 5 3.5 6v3h9v-3c2-1 3.5-3 3.5-6a8 8 0 00-8-8z" fill="#e6e6e6"/><circle cx="9" cy="11" r="2" fill="#222"/><circle cx="15" cy="11" r="2" fill="#222"/>',
 bois:'<rect x="3" y="9" width="18" height="7" rx="3.5" fill="#a0652d"/><ellipse cx="19" cy="12.5" rx="2.4" ry="3.5" fill="#e3b778"/><ellipse cx="19" cy="12.5" rx="1.1" ry="1.7" fill="#a0652d"/>',
 pierre:'<path d="M4 17l2.5-7L11 6l6 2 3 6-2 4H6z" fill="#9aa3ad"/><path d="M11 6l1 6-6 5" stroke="#6b737c" stroke-width="1.4" fill="none"/>',
 nourriture:'<path d="M14 4c4 0 6 3 6 6 0 4-4 6-7 6l-4 4-2-2 4-4c0-3 0-10 3-10z" fill="#c8553d"/><path d="M7 18l-2 2M5.5 15.5l3 3" stroke="#f2e6d0" stroke-width="2.2" stroke-linecap="round"/>',
 colons:'<circle cx="9" cy="8" r="3.2" fill="#f1c9a0"/><path d="M3 20c0-4 3-6.5 6-6.5S15 16 15 20z" fill="#5b8def"/><circle cx="16.5" cy="9" r="2.6" fill="#f1c9a0"/><path d="M13 20c.3-3 1.8-5 3.5-5S21 17 21 20z" fill="#e0b03a"/>',
 soleil:'<circle cx="12" cy="12" r="4.5" fill="#ffd23f"/><g stroke="#ffd23f" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/></g>',
 orage:'<path d="M6 14a4 4 0 010-8 5 5 0 019.6-1A4 4 0 1118 14z" fill="#b9b3d6"/><path d="M12 13l-3 5h3l-1 4 4-6h-3l1-3z" fill="#ffd23f"/>',
 nuage:'<path d="M6 17a4 4 0 010-8 5 5 0 019.6-1A4 4 0 1118 17z" fill="#cfd6e0"/>',
 palier:'<path d="M3 11l5-4 5 4v9H3z" fill="#e8d9a8"/><path d="M2 11.5L8 6l6 5.5" stroke="#b5432f" stroke-width="2" fill="none"/><path d="M12 13l4.5-3.5L21 13v7h-9z" fill="#c9925a"/><rect x="6.5" y="15" width="3" height="5" fill="#8a5a2b"/>',
 raid:'<path d="M5 19l9-9 1.5-5.5L21 3l-1.5 5.5L10 18z" fill="#d7dde3"/><path d="M4 16l4 4M3 21l3-3" stroke="#a0652d" stroke-width="2.4" stroke-linecap="round"/>',
 hiver:'<g stroke="#9fd8ff" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/></g>',
 phare:'<path d="M9.5 21l1-14h3l1 14z" fill="#f2efe6"/><path d="M10.3 10h3.4l.3 3h-4zM9.9 15.5h4.2l.3 3H9.6z" fill="#d04040"/><path d="M9.5 7h5l-1-3h-3z" fill="#ffd23f"/><path d="M15 5l5-2M15 7h6M9 5L4 3M9 7H3" stroke="#ffd23f" stroke-width="1.4"/>',
 bits:'<path d="M12 2l7 7-7 13L5 9z" fill="#b57bff"/><path d="M5 9h14M12 2l-3 7 3 13 3-13z" stroke="#e5d2ff" stroke-width="1" fill="none"/>',
 sub:'<path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#ffd23f"/>',
 vote:'<rect x="3" y="11" width="18" height="10" rx="2" fill="#7c6bd6"/><rect x="7" y="3" width="10" height="10" rx="1" fill="#fff" transform="rotate(8 12 8)"/><path d="M9 8l2 2 4-4" stroke="#2fa36b" stroke-width="2" fill="none"/><rect x="6" y="11" width="12" height="2" fill="#4a3d99"/>',
 trophee:'<path d="M7 3h10v5a5 5 0 01-10 0z" fill="#ffd23f"/><path d="M7 5H4c0 3 1.5 4.5 3.5 5M17 5h3c0 3-1.5 4.5-3.5 5" stroke="#ffd23f" stroke-width="1.8" fill="none"/><path d="M10.5 13h3v4h-3zM7.5 18h9v3h-9z" fill="#d9a520"/>',
 timer:'<circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 13V8.5M10 2h4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
 eclair:'<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="#ffd23f"/>',
 ok:'<circle cx="12" cy="12" r="10" fill="#2fa36b"/><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
 warn:'<path d="M12 3l10 18H2z" fill="#ffb020"/><path d="M12 10v5" stroke="#1b1b1b" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="18" r="1.3" fill="#1b1b1b"/>',
 hutte:'<path d="M5 13h14v8H5z" fill="#c9925a"/><path d="M2 14L12 4l10 10z" fill="#8a5a2b"/><path d="M10 16h4v5h-4z" fill="#5a3818"/>',
 ferme:'<path d="M3 12h11v9H3z" fill="#e8d9a8"/><path d="M2 12.5L8.5 6l6.5 6.5z" fill="#b5432f"/><path d="M7 15h3v6H7z" fill="#8a5a2b"/><rect x="16" y="7" width="5" height="14" rx="2.5" fill="#d0a040"/><path d="M15.5 9.5h6" stroke="#9a7020" stroke-width="1.2"/>',
 carriere:'<path d="M2 21l4-7 4 3 3-5 4 4 5 5z" fill="#9aa3ad"/><path d="M14 3l6 3-2 1.5-5-2.5z" fill="#d7dde3"/><path d="M16.5 5.5L11 14" stroke="#a0652d" stroke-width="2.2" stroke-linecap="round"/>',
 tour:'<path d="M8 21V9h8v12z" fill="#b8b0a0"/><path d="M6.5 9V5h2v2h2V5h3v2h2V5h2v4z" fill="#8f8778"/><path d="M10.5 21v-4a1.5 1.5 0 013 0v4z" fill="#4a5d8a"/><rect x="11" y="11" width="2" height="3" fill="#4a5d8a"/>',
 maison:'<path d="M4 11l8-7 8 7v10H4z" fill="#c9925a"/><path d="M10 15h4v6h-4z" fill="#5a3818"/>',
 chat:'<path d="M4 4h16v12H9l-5 4z" fill="#9146ff"/><path d="M8 9h8M8 12h5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
 sablier:'<path d="M6 3h12M6 21h12M7 3c0 5 4 6 4 9s-4 4-4 9M17 3c0 5-4 6-4 9s4 4 4 9" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M9 19c1-2 2-3 3-3s2 1 3 3z" fill="currentColor"/>',
 reset:'<path d="M20 12a8 8 0 11-2.3-5.7" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M20 3v5h-5" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
 user:'<circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.5 3.6-7 8-7s8 2.5 8 7z" fill="currentColor"/>',
 cube:'<path d="M12 2l9 5v10l-9 5-9-5V7z" fill="#7c6bd6"/><path d="M12 12l9-5M12 12L3 7M12 12v10" stroke="#e5d2ff" stroke-width="1.4"/>',
 camp:'<path d="M2 20L12 4l10 16z" fill="#e0b03a"/><path d="M12 4v16M9 20l3-6 3 6z" fill="#8a5a2b"/>',
 outils:'<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
 build:'<path d="M3 21h18M5 21V10h14v11" stroke="#e0b03a" stroke-width="2" fill="none"/><path d="M8 6l4-3 4 3" stroke="#e0b03a" stroke-width="2" fill="none"/><path d="M9 14h6v7H9z" fill="#c9925a"/>',
 fete:'<path d="M3 21l5-14 9 9z" fill="#ff6bd5"/><path d="M14 4l1 2M19 6l-2 1M18 11l2 1M12 8c1-1 1-3 0-4" stroke="#ffd23f" stroke-width="1.8" stroke-linecap="round"/>',
 medal1:'<circle cx="12" cy="14" r="7" fill="#ffd23f"/><path d="M8 2l4 6 4-6" stroke="#d04040" stroke-width="2.5" fill="none"/><text x="12" y="17.5" font-size="9" font-weight="800" text-anchor="middle" fill="#6b4a00" font-family="sans-serif">1</text>',
 medal2:'<circle cx="12" cy="14" r="7" fill="#cfd6e0"/><path d="M8 2l4 6 4-6" stroke="#3d6fd1" stroke-width="2.5" fill="none"/><text x="12" y="17.5" font-size="9" font-weight="800" text-anchor="middle" fill="#3b4250" font-family="sans-serif">2</text>',
 medal3:'<circle cx="12" cy="14" r="7" fill="#d9915a"/><path d="M8 2l4 6 4-6" stroke="#2fa36b" stroke-width="2.5" fill="none"/><text x="12" y="17.5" font-size="9" font-weight="800" text-anchor="middle" fill="#4a2a10" font-family="sans-serif">3</text>',
 left:'<path d="M5 12a7 7 0 1 0 2-5" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M4 3v5h5" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
 close:'<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
 more:'<circle cx="5" cy="12" r="2.4" fill="currentColor"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/><circle cx="19" cy="12" r="2.4" fill="currentColor"/>',
 right:'<path d="M19 12a7 7 0 1 1-2-5" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M20 3v5h-5" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
};
const I=(n,cls='')=>P[n]?`<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[n]}</svg>`:'';
// Emoji → icône (pour les messages du jeu : alertes, fil d'actions)
const MAP=[['🧑‍🌾','colons'],['🪵','bois'],['🪨','pierre'],['🍖','nourriture'],['👥','colons'],['☀️','soleil'],['⛈️','orage'],['☁️','nuage'],['🏘️','palier'],['⚔️','raid'],['❄️','hiver'],['🗼','phare'],['💎','bits'],['⭐','sub'],['🗳️','vote'],['🏆','trophee'],['⏱','timer'],['⚡','eclair'],['✅','ok'],['⚠️','warn'],['🛖','hutte'],['🌾','ferme'],['⛏️','carriere'],['🏰','tour'],['🏠','maison'],['💬','chat'],['⏳','sablier'],['🔄','reset'],['👤','user'],['🧊','cube'],['🏕️','camp'],['⚙️','outils'],['🏗️','build'],['🎉','fete'],['✨','bits'],['🎯','defi'],['🏛️','merveille'],['🏅','badge'],['🔥','foyer'],['🛡️','bouclier'],['🔧','reparer'],['🧱','palissade'],['❔','aide'],['💀','crane'],['🧭','user'],['🌽','grenier']];
function iconify(html){ let s=String(html); for(const [e,n] of MAP) s=s.split(e).join(I(n)); return s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]\uFE0F?/gu,''); }
const EMO=/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}]/u;
const escH=t=>t.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Remplace tout emoji restant dans les nœuds texte par une icône SVG.
function iconifyDom(root){ if(!root) return; const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT), list=[]; let n;
  while((n=w.nextNode())) if(EMO.test(n.nodeValue)&&!(n.parentNode&&n.parentNode.closest&&n.parentNode.closest('svg,textarea,input'))) list.push(n);
  for(const t of list){ const sp=document.createElement('span'); sp.className='icotxt'; sp.innerHTML=iconify(escH(t.nodeValue)); t.replaceWith(...sp.childNodes); } }
function hydrate(root=document){ root.querySelectorAll('i[data-i]').forEach(el=>{ el.outerHTML=I(el.dataset.i,el.className); }); }
Object.assign(window,{I,iconify,iconifyDom,hydrateIcons:hydrate,ICON_NAMES:Object.keys(P)});
const boot=()=>{ hydrate(); iconifyDom(document.body); }; if(document.readyState!=='loading') boot(); else document.addEventListener('DOMContentLoaded',boot);
})();
