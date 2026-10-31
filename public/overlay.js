// Rendu de l'overlay (OBS, simulateur et démo GitHub Pages). Construit son propre DOM dans #ov.
const ICON={hutte:'🛖',ferme:'🌾',carriere:'⛏️',tour:'🏰'}, NAME=Panels.NAME, BI=b=>I(b)||I('maison');
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
  <div class="colL"><div class="card res" id="ov-res"></div><div class="card" id="ov-goal"></div><div class="row2"><div class="card" id="ov-foyer"></div><div class="card obj3" id="ov-obj"></div></div></div>
  <div class="colR"><div class="card" id="ov-vote"></div><div class="card" id="ov-threat"></div><div class="card lb" id="ov-lb"></div></div><div class="card bigcard" id="ov-big"></div>
  <div class="card alert" id="ov-alert"></div><div class="card feed" id="ov-feed"></div><div class="foot">« ${LEGAL} »</div>`;
}
function render(s){
  buildOverlay(); if(s.now){ skew=s.now-Date.now(); window.__skew=skew; }
  const RT=s.rates||{};
  const $=id=>document.getElementById('ov-'+id); if(!$('res')) return;
  const W={'clair':'soleil','orage magique':'orage'}[s.weather]||'nuage';
  const st=(ic,v,lab,tip,bad)=>`<span class="stat${bad?' bad':''}" title="${esc(tip)}">${I(ic)}<span class="sv"><b>${v}</b><em>${lab}</em></span></span>`;
  $('res').innerHTML=st('bois',s.res.bois+Panels.rate(RT.bois),'Bois','Bois : sert à construire (!bois)')+st('pierre',s.res.pierre+Panels.rate(RT.pierre),'Pierre','Pierre : sert aux fermes et aux tours (!pierre)')+
    st('nourriture',s.res.nourriture+Panels.rate(RT.nourriture),s.res.nourriture===0?'Famine !':'Nourriture','Nourriture : nourrit les villageois (!chasse, fermes)',s.res.nourriture===0)+st('colons',s.pop,'Villageois','Villageois : population du village')+
    (s.weather==='orage magique'&&s.weatherUntil?st('orage','Orage '+mmss(s.weatherUntil),'Météo','Orage magique : chaque !bois donne aussi 1 pierre'):st(W,esc(s.weather),'Météo','Météo actuelle'))+st('palier',esc(s.stage||''),'Palier','Palier de la colonie')+(s.special?st('phare','×1,5 '+mmss(s.special.until),'Phare','Phare de la session : gains du chat ×1,5'):'');
  const g=s.goal||{bits:5000,label:'Orage magique'}, pct=Math.min(100,(g.cur??s.bitsTotal)/g.bits*100);
  $('goal').innerHTML=`<div class="gl"><span>⚡ Objectif communautaire ${g.tier||1} : ${esc(g.label)}${g.done?' ✅':''}</span><span>${fmt(Math.min(g.cur??s.bitsTotal,g.bits))} / ${fmt(g.bits)} Bits</span></div><div class="track"><div class="fill" style="width:${pct}%"></div></div>`;
  if(s.vote){
    const tot=Object.values(s.vote.tally).reduce((a,b)=>a+b,0), max=Math.max(0,...Object.values(s.vote.tally));
    $('vote').innerHTML=`<h3><span>🗳️ ${esc(s.vote.title)}</span><span class="pill">⏱ ${secLeft(s.vote.ends)} s</span></h3>`+
      Object.entries(s.vote.tally).map(([o,n])=>`<div class="opt ${max&&n===max?'lead':''}"><div class="l"><span><code>!vote ${esc(o)}</code> ${s.costs&&s.costs[o]?`<small>${s.costs[o].bois}🪵${s.costs[o].pierre?' '+s.costs[o].pierre+'🪨':''}</small>`:''}</span><span>${n}</span></div><div class="vb"><i style="width:${tot?n/tot*100:0}%"></i></div></div>`).join('')+Panels.pending(s);
  } else {
    $('vote').innerHTML=(document.body.classList.contains('demo')?'':Panels.howto(s))+Panels.pending(s)+
      (s.costs?`<div class="sub" style="margin-top:4px">`+(s.active?` · ${s.active} actifs · rendement ×${(s.yieldFactor||1).toFixed(2).replace('.',',')}`:'')+`</div>`:'')+
      '';
  }
  { const v=$('vote'); v.hidden=document.body.classList.contains('demo')&&!v.textContent.trim(); }
  $('threat').innerHTML=Panels.threat(s);
  $('foyer').innerHTML=Panels.foyer(s); $('obj').innerHTML=Panels.objectives(s)+Panels.badges(s);
  $('lb').innerHTML=Panels.boards(s);
  const big=s.gameOver?Panels.gameOver(s):s.revival?Panels.revival(s):''; $('big').className='card bigcard'+(big?' on':'')+(s.gameOver?' over':''); $('big').innerHTML=big;
  const a=s.alert, on=a&&nowS()-a.t<4500; $('alert').className='card alert '+(a?a.kind:'')+(on?' on':''); if(a) $('alert').textContent=a.m;
  const feed=s.feed||[]; $('feed').style.display=feed.length?'':'none'; $('feed').innerHTML=feed.map(f=>`<div>${esc(f.m)}</div>`).join('');
  $('scene').className='scene'+(s.weather==='clair'?'':' storm');
  const named=s.named||[]; const townHtml=`<div class="bld big foyer ${s.foyer&&s.foyer.hp<=0?'dead':''}">${I('foyer')}<small>Grand Foyer ${s.foyer?s.foyer.hp+' PV':''}</small></div>`+s.buildings.map(b=>`<div class="bld">${BI(b)}<small>${NAME[b]||esc(b)}</small></div>`).join('')+(s.wonder&&s.wonder.phase?`<div class="bld big">${I('merveille')}<small>Merveille ${s.wonder.phase}/3</small></div>`:'')+
    (s.special?'<div class="bld big">🗼<small>Phare de la session</small></div>':'')+`<div class="people">${'🧑‍🌾'.repeat(Math.min(s.pop,18))}${s.pop>18?` <small>+${s.pop-18}</small>`:''}${named.length?`<small class="named">${named.slice(-6).map(esc).join(' · ')}</small>`:''}</div>`;
  if($('town').dataset.k!==townHtml){ $('town').dataset.k=townHtml; $('town').innerHTML=townHtml; }
  iconifyDom(document.getElementById('ov'));
  if(window.onColonyState) window.onColonyState(s);
}
if(document.body&&document.body.dataset.page==='overlay') new EventSource('/events').onmessage=e=>{ const st=JSON.parse(e.data); render(st); Panels.liveState(st,''); };
