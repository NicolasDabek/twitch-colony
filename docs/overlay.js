// Rendu de l'overlay (OBS, simulateur et démo GitHub Pages). Construit son propre DOM dans #ov.
const ICON={hutte:'🛖',ferme:'🌾',carriere:'⛏️',tour:'🏰'}, NAME={hutte:'Hutte',ferme:'Ferme',carriere:'Carrière',tour:'Tour'};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Number(n).toLocaleString('fr-FR').replace(/\u202f/g,' ');
const LEGAL="Les Bits permettent à la communauté d'influencer la partie en direct. Ils ne donnent accès à aucun objet, compte, service ou avantage en dehors de ce stream.";
let skew=0; // décalage horloge serveur/navigateur
function nowS(){ return Date.now()+skew; }
function secLeft(t){ return Math.max(0,Math.ceil((t-nowS())/1000)); }
function mmss(t){ const x=secLeft(t); return Math.floor(x/60)+':'+String(x%60).padStart(2,'0'); }
function buildOverlay(){
  const ov=document.getElementById('ov'); if(!ov||ov.dataset.built) return; ov.dataset.built=1;
  ov.innerHTML=`<div class="scene" id="ov-scene"><div class="ground"></div><div class="town" id="ov-town"></div></div>
  <div class="colL"><div class="card res" id="ov-res"></div><div class="card" id="ov-goal"></div></div>
  <div class="colR"><div class="card" id="ov-vote"></div><div class="card" id="ov-threat"></div><div class="card lb" id="ov-lb"></div></div>
  <div class="card alert" id="ov-alert"></div><div class="card feed" id="ov-feed"></div><div class="foot">« ${LEGAL} »</div>`;
}
function render(s){
  buildOverlay(); if(s.now) skew=s.now-Date.now();
  const $=id=>document.getElementById('ov-'+id); if(!$('res')) return;
  const W={'clair':'soleil','orage magique':'orage'}[s.weather]||'nuage';
  const st=(ic,v,lab,tip,bad)=>`<span class="stat${bad?' bad':''}" title="${esc(tip)}">${I(ic)}<span class="sv"><b>${v}</b><em>${lab}</em></span></span>`;
  $('res').innerHTML=st('bois',s.res.bois,'Bois','Bois : sert à construire (!bois)')+st('pierre',s.res.pierre,'Pierre','Pierre : sert aux fermes et aux tours (!pierre)')+
    st('nourriture',s.res.nourriture,s.res.nourriture===0?'Famine !':'Nourriture','Nourriture : nourrit les colons (!chasse, fermes)',s.res.nourriture===0)+st('colons',s.pop,'Colons','Colons : population de la colonie')+
    st(W,esc(s.weather),'Météo','Météo actuelle')+st('palier',esc(s.stage||''),'Palier','Palier de la colonie')+(s.special?st('phare','×2 '+mmss(s.special.until),'Phare','Phare de la session : gains du chat ×2'):'');
  const g=s.goal||{bits:5000,label:'Orage magique'}, pct=Math.min(100,s.bitsTotal/g.bits*100);
  $('goal').innerHTML=`<div class="gl"><span>⚡ Objectif communautaire : ${esc(g.label)}${g.done?' ✅':''}</span><span>${fmt(Math.min(s.bitsTotal,g.bits))} / ${fmt(g.bits)} Bits</span></div><div class="track"><div class="fill" style="width:${pct}%"></div></div>`;
  if(s.vote){
    const tot=Object.values(s.vote.tally).reduce((a,b)=>a+b,0), max=Math.max(0,...Object.values(s.vote.tally));
    $('vote').innerHTML=`<h3><span>🗳️ ${esc(s.vote.title)}</span><span class="pill">⏱ ${secLeft(s.vote.ends)} s</span></h3>`+
      Object.entries(s.vote.tally).map(([o,n])=>`<div class="opt ${max&&n===max?'lead':''}"><div class="l"><span><code>!vote ${esc(o)}</code> ${s.costs&&s.costs[o]?`<small>${s.costs[o].bois}🪵${s.costs[o].pierre?' '+s.costs[o].pierre+'🪨':''}</small>`:''}</span><span>${n}</span></div><div class="vb"><i style="width:${tot?n/tot*100:0}%"></i></div></div>`).join('');
  } else {
    $('vote').innerHTML=`<h3><span>💬 Commandes</span></h3><div class="cmds"><code>!bois</code><code>!pierre</code><code>!chasse</code><code>!construire …</code><code>!vote …</code></div>`+
      (s.costs?`<div class="sub" style="margin-top:8px">`+Object.entries(s.costs).map(([b,c])=>`${ICON[b]} ${c.bois}🪵${c.pierre?' '+c.pierre+'🪨':''}`).join(' · ')+(s.active?` · ${s.active} actifs`:'')+`</div>`:'')+
      `<div class="sub">!optout : ne pas apparaître au classement</div>`;
  }
  const t=s.threat; $('threat').innerHTML=t?`<h3><span>${t.type==='raid'?'⚔️ Prochain raid':'❄️ Prochain hiver'}</span><span class="pill calm">${mmss(t.at)}</span></h3><div class="threat">`+
    (t.type==='raid'?`Tours : ${s.towers} / ${s.towersNeeded} ${s.towers>=s.towersNeeded?'✅ protégés':'⚠️ construisez une tour'}`:`Nourriture : ${s.res.nourriture} / ${s.pop*3} ${s.res.nourriture>=s.pop*3?'✅':'⚠️ !chasse'}`)+`</div>`:'';
  const medal=['🥇','🥈','🥉','4.','5.'];
  $('lb').innerHTML='<h3><span>🏆 Classement de la session</span></h3>'+(s.leaderboard.map((l,i)=>`<div class="row"><span>${medal[i]} ${esc(l.name)}</span>${l.title?`<b>${l.pts} · Fondateur</b>`:`<span>${l.pts}</span>`}</div>`).join('')||'<div class="sub">Personne encore… tapez !bois</div>');
  const a=s.alert, on=a&&nowS()-a.t<4500; $('alert').className='card alert '+(a?a.kind:'')+(on?' on':''); if(a) $('alert').textContent=a.m;
  const feed=s.feed||[]; $('feed').style.display=feed.length?'':'none'; $('feed').innerHTML=feed.map(f=>`<div>${esc(f.m)}</div>`).join('');
  $('scene').className='scene'+(s.weather==='clair'?'':' storm');
  const townHtml=s.buildings.map(b=>`<div class="bld">${ICON[b]||'🏠'}<small>${NAME[b]||esc(b)}</small></div>`).join('')+
    (s.special?'<div class="bld big">🗼<small>Phare de la session</small></div>':'')+`<div class="people">${'🧑‍🌾'.repeat(Math.min(s.pop,18))}${s.pop>18?` <small>+${s.pop-18}</small>`:''}</div>`;
  if($('town').dataset.k!==townHtml){ $('town').dataset.k=townHtml; $('town').innerHTML=townHtml; }
  iconifyDom(document.getElementById('ov'));
  if(window.onColonyState) window.onColonyState(s);
}
if(document.body&&document.body.dataset.page==='overlay') new EventSource('/events').onmessage=e=>render(JSON.parse(e.data));
