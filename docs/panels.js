// Panneaux d'information partagés (overlay 2D, démo, vue 3D) : objectifs, Foyer, menace, classements, aide, rallumage.
(function(){
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const NAME={hutte:'Hutte',ferme:'Ferme',carriere:'Carrière',tour:'Tour',grenier:'Grenier',palissade:'Palissade',marche:'Marché',atelier:'Atelier',forge:'Forge',merveille:'Merveille',attendre:'Attendre',murs:'Renforcer les murs',reserves:'Cacher les réserves'};
const DESC={forge:'chaque !defendre compte double',hutte:'+2 villageois (logement)',ferme:'+2 nourriture / 10 s',carriere:'+1 pierre / 10 s',tour:'+10 défense du Foyer',grenier:"l'hiver coûte moitié moins de nourriture",palissade:'+10 défense du Foyer',marche:'+1 bois et +1 pierre / 10 s',atelier:'!bois / !pierre +25 %',merveille:'objectif final (3 phases)',foyer:'à protéger : si ses PV tombent à 0, la partie peut se terminer',phare:'gains du chat ×1,5 (Bits)'};
const ico=n=>(window.I&&I(n))||'';
const clk=()=>Date.now()+(window.__skew||0);
const left=t=>Math.max(0,Math.ceil((t-clk())/1000)), mmss=t=>{ const x=left(t); return Math.floor(x/60)+':'+String(x%60).padStart(2,'0'); };
const bar=(cur,need,cls='')=>`<div class="pbar ${cls}"><i style="width:${need?Math.min(100,cur/need*100):0}%"></i></div>`;
const rate=v=>v?`<small class="rate ${v<0?'neg':''}">${v>0?'+':''}${v}/min</small>`:'';
function objectives(s,compact){ const o=s.objectives; if(!o) return '';
  const row=(k,x)=>`<div class="obj"><div class="ol"><span>${esc(x.label)}</span><em>${Math.floor(x.cur)}/${x.need}${x.ends&&k==='short'?' · '+mmss(x.ends):''}</em></div>${bar(x.cur,x.need,k)}</div>`;
  const ns=o.nextStage?`<div class="sub">${ico('palier')} Prochain palier : ${esc(o.nextStage.name)} (${o.nextStage.cur}/${o.nextStage.need} bâtiments)</div>`:'';
  const na=s.nextAffordable?`<div class="sub">${ico('build')} Prochain bâtiment : ${NAME[s.nextAffordable.name]} — ${s.nextAffordable.affordable?'abordable, !construire '+s.nextAffordable.name:'il manque '+esc(s.nextAffordable.missing)}</div>`:'';
  return `<h3><span>${ico('defi')} Objectifs</span></h3>`+row('short',o.short)+row('mid',o.mid)+row('long',o.long)+(compact?'':ns+na); }
function foyer(s){ const f=s.foyer; if(!f) return ''; const p=f.hp/f.max, d=s.defense||{};
  return `<div class="fy"><span class="fyl">${ico('foyer')} Grand Foyer</span>${bar(f.hp,f.max,'hp '+(p<.3?'low':p<.6?'mid':''))}<b>${f.hp}/${f.max} PV</b></div>`+
    `<div class="sub">${ico('bouclier')} Défense ${d.total||0} (tours ${d.tours||0} · défenseurs ${d.defenseurs||0}${d.remparts?' · remparts '+d.remparts:''}${d.strategie?' · murs '+d.strategie:''}) contre force ${s.raidPower||0} · <code>!defendre</code> <code>!reparer</code></div>`; }
function threat(s){ const t=s.threatInfo; if(!t) return '';
  return lastRaid(s)+`<h3><span>${t.type==='raid'?ico('raid')+(t.guard?' Raid « garde de la Merveille »':' Prochain raid'):ico('hiver')+' Prochain hiver'}</span><span class="pill ${t.ok?'calm':''}">${mmss(t.at)}</span></h3><div class="threat ${t.ok?'ok':'bad'}">${ico(t.ok?'ok':'warn')} ${esc(t.label)}</div>`+bar(t.have,t.need,t.ok?'ok':'bad'); }
function boards(s){ const med=['1.','2.','3.','4.','5.'];
  const b=(s.leaderboard||[]).slice(0,3).map((l,i)=>`<div class="row"><span>${med[i]} ${esc(l.name)}</span>${l.title?`<b>${l.pts} · Fondateur</b>`:`<span>${l.pts}</span>`}</div>`).join('')||'<div class="sub">Tapez !bois pour apparaître</div>';
  const m=(s.patronsBoard||[]).slice(0,3).map((l,i)=>`<div class="row"><span>${med[i]} ${esc(l.name)}</span><span>${l.pts}</span></div>`).join('')||'<div class="sub">Aucun soutien pour l\'instant</div>';
  return `<div class="boards"><div><h3><span>${ico('build')} Bâtisseurs</span></h3>${b}</div><div><h3><span>${ico('bits')} Mécènes</span></h3>${m}</div></div><div class="sub">Classements de la session, remis à zéro à chaque stream · !optout</div>`; }
function howto(s){ const T=(s&&s.bitsTiers)||[{bits:100},{bits:300},{bits:500},{bits:1500},{bits:5000}], f=n=>Number(n).toLocaleString('fr-FR'); return `<h3><span>${ico('aide')} Comment participer</span></h3><ul class="howto">
<li><b>Gratuit :</b> <code>!bois</code> <code>!pierre</code> <code>!chasse</code> récoltent · <code>!vote …</code> choisit · <code>!construire …</code> propose (3 propositions max en attente pendant un vote)</li>
<li><code>!rejoindre bûcheron|mineur|chasseur|garde</code> : +50 % sur ton métier · présence 3 × 10 min : +25 %</li>
<li><code>!defendre</code> protège le Foyer (raid repoussé = butin pour le village, raid perdu = pillage) · <code>!reparer</code> (10 bois + 5 pierre) : +5 PV · <code>!aide</code></li>
<li><b>Bits (session uniquement, plafonnés) :</b> ${f(T[0].bits)} ressources · ${f(T[1].bits)} remparts · ${f(T[2].bits)} Phare · ${f(T[3].bits)} Bénédiction · ${f(T[4].bits)} orage</li></ul>`; }
function me(s,u){ const v=s.viewers&&s.viewers[u]; if(!v) return `<div class="sub">${ico('user')} ${esc(u)} : pas encore de contribution</div>`;
  const cd=Object.entries(v.cd||{}).filter(([c,ms])=>ms>0).map(([c,ms])=>`${c} ${Math.ceil(ms/1000)} s`).join(' · ');
  return `<div class="me">${ico('user')} <b>${esc(u)}</b> · ${Math.round(v.contrib)} ressources · ${v.builder} pts bâtisseur${v.patron?' · '+v.patron+' pts mécène':''}${v.role?' · '+esc(v.role):''}${v.streak>=3?' · série ×1,25':v.streak?' · présence '+v.streak+'/3':''}${cd?' · attente '+cd:''}</div>`; }
function revival(s){ const r=s.revival; if(!r) return '';
  return `<div class="big-title">${ico('foyer')} Le Foyer est détruit !</div><div class="sub" style="font-size:18px">Rallumez-le avant <b>${mmss(r.until)}</b> (rallumage ${r.k}/${s.revivalsMax}) — objectif FIXE, aucun hasard :</div>
<div class="rv"><span>${r.count}/${r.viewers} viewers ont tapé <code>!rallumer</code></span>${bar(r.count,r.viewers,'ok')}</div><div class="rv"><span>OU ${r.bits}/${r.bitsNeed} Bits</span>${bar(r.bits,r.bitsNeed)}</div>`; }
function gameOver(s){ const g=s.gameOver; if(!g) return ''; const m=g.summary;
  return `<div class="big-title">${ico('crane')} Partie terminée</div><div class="sub" style="font-size:18px">${esc(g.reason)}</div><ul class="howto"><li>Durée : ${Math.floor(m.duree/60)} h ${String(m.duree%60).padStart(2,'0')} · palier ${esc(m.stage)} · ${m.buildings} bâtiments · Merveille ${m.wonder}/3</li><li>Raids repoussés : ${m.repelled}/${m.raids} · défis réussis : ${m.defis}</li><li>Bâtisseurs : ${m.top.map(esc).join(', ')||'—'}</li><li>Badges : ${m.badges.map(esc).join(', ')||'—'}</li></ul><div class="sub" style="font-size:18px">Nouvelle session dans ${left(g.restartAt)} s</div>`; }
function badges(s){ return (s.badges||[]).length?`<div class="sub">${ico('badge')} Badges : ${s.badges.map(esc).join(' · ')}</div>`:''; }
// Dernier raid (affiché 3 min) : butin si repoussé, pillage si perdu.
function lastRaid(s){ const L=s.lastRaid; if(!L||clk()-L.t>3*60000) return '';
  if(!L.dmg) return `<div class="raidres ok">${ico('ok')} Raid${L.guard?' « garde de la Merveille »':''} repoussé${L.reward?` : butin${L.shared?` partagé grâce aux remparts de ${esc(L.shared)}`:''} +${L.reward.bois} bois, +${L.reward.pierre} pierre`:''}</div>`;
  return `<div class="raidres bad">${ico('raid')} Raid perdu : −${L.dmg} PV${L.stolen?` · pillage ${stolenTxt(L.stolen,'−')}`:' · réserves cachées, rien de volé'}</div>`; }
function stolenTxt(st,sign){ const p=[]; if(st.bois) p.push(`${sign}${st.bois} bois`); if(st.pierre) p.push(`${sign}${st.pierre} pierre`); return p.length?p.join(', '):'rien (stock vide)'; }
// Propositions !construire en attente pendant un vote (3 max)
function pending(s){ const q=s.pendingBuilds||[]; if(!q.length) return ''; return `<div class="pending">${ico('build')} À suivre (${q.length}/3) : ${q.map(b=>`${ico(b)} ${esc(NAME[b]||b)}`).join(' · ')}</div>`; }
// Vote : état vide (aucun vote en cours) avec la façon dont le prochain s'ouvre.
const voteEmpty=()=>`<div class="vempty"><b>Aucun vote en cours</b><span>Le prochain s'ouvre automatiquement (toutes les 3 min par défaut) dès qu'un bâtiment est abordable, ou quand un viewer tape <code>!construire hutte</code>.</span></div>`;
// Annonces polies pour lecteurs d'écran (région #live, aria-live="polite") : retours de commande et votes.
let liveT=null, lastVoteKey=null, lastFeedT=0, primed=false, lastRaidT=null, lastStageT=null;
function announce(m){ const el=document.getElementById('live'); if(!el||!m) return; const t=String(m).replace(/<[^>]*>/g,'').trim(); el.textContent=''; clearTimeout(liveT); liveT=setTimeout(()=>{ el.textContent=t; },60); }
function liveState(s,user){ if(!s) return; const msgs=[];
  const vk=s.vote?s.vote.title+'|'+s.vote.ends:null;
  if(vk&&vk!==lastVoteKey) msgs.push(`Vote ouvert : ${String(s.vote.title).replace(/[\s.?!:]+$/,'')}. Options : ${Object.keys(s.vote.tally).map(o=>NAME[o]||o).join(', ')}. Pour voter : !vote suivi de l'option.`);
  else if(!vk&&lastVoteKey) msgs.push('Vote terminé.'+(s.alert&&Math.abs((s.now||Date.now())-s.alert.t)<5000?' '+s.alert.m:''));
  lastVoteKey=vk;
  const L=s.lastRaid; if(L&&L.t!==lastRaidT){ if(primed) msgs.push(L.dmg?`Raid perdu : le Foyer perd ${L.dmg} PV.${L.stolen?` Pillage : ${stolenTxt(L.stolen,'moins ').replace(', ',' et ')}.`:' Réserves cachées : rien n\'a été volé.'}`:`Raid repoussé !${L.reward?` Butin${L.shared?` partagé grâce aux remparts de ${L.shared}`:''} : plus ${L.reward.bois} bois et plus ${L.reward.pierre} pierre.`:''}`); lastRaidT=L.t; }
  if(primed&&s.alert&&s.alert.kind==='stage'&&s.alert.t!==lastStageT) msgs.push(s.alert.m); if(s.alert&&s.alert.kind==='stage') lastStageT=s.alert.t;
  const feed=primed?(s.feed||[]).filter(f=>f.t>lastFeedT):[]; if(s.feed&&s.feed.length) lastFeedT=Math.max(lastFeedT,...s.feed.map(f=>f.t));
  primed=true;
  if(user&&feed.length){ const us=[].concat(user), mine=feed.filter(f=>us.some(u=>f.m.includes(' '+u+' '))).reverse(); mine.forEach(f=>msgs.push(f.m)); }
  if(msgs.length) announce(msgs.join(' '));
}
window.Panels={lastRaid,pending,voteEmpty,announce,liveState,objectives,foyer,threat,boards,howto,me,revival,gameOver,badges,rate,bar,NAME,DESC,mmss};
})();
