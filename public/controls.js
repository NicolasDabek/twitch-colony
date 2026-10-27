// Contrôles de la démo : boutons groupés, raccourcis, cooldown visible, vote cliquable, vue mobile.
(function(){
  const $=id=>document.getElementById(id), last={};
  const put=(id,h)=>Panels.swap($(id),h); let S=null, cdMs=5000, msgTimer;
  const user=()=>{ const u=$('u'); if($('rnd').checked) u.value='Viewer'+Math.floor(Math.random()*50); return u.value.trim()||'Viewer'; };
  const say=m=>{ $('msg').innerHTML=iconify(esc(m)); Panels.announce(m); clearTimeout(msgTimer); msgTimer=setTimeout(()=>$('msg').textContent='',2500); };
  const left=(u,c)=>Math.max(0,Math.ceil(((last[u+c]||0)+cdMs-Date.now())/1000));
  function chat(text){
    const u=user(), c=text.split(' ')[0];
    if(!['!optout','!optin'].includes(c)){ const l=left(u,c); if(l){ say(`⏳ ${c} ignoré pour ${u} : attends ${l} s (cooldown ${cdMs/1000} s par viewer)`); return; } last[u+c]=Date.now(); }
    Driver.send({type:'chat',user:u,text});
  }
  function act(e){ Driver.send({...e,user:user()}); }
  document.addEventListener('click',ev=>{ const b=ev.target.closest('button'); if(!b) return;
    if(b.dataset.c) chat(b.dataset.c); else if(b.dataset.bits) act({type:'cheer',bits:+b.dataset.bits}); else if(b.dataset.t==='gift') act({type:'gift',n:5}); else if(b.dataset.w) act({type:'wonder'}); else if(b.dataset.t==='reset') Panels.confirmDialog({title:'Recommencer une nouvelle session ?',text:'Le village, les ressources et les classements de cette partie seront effacés. Cette action est définitive.',ok:'Nouvelle session',cancel:'Annuler',opener:b,onOk:()=>act({type:'reset'})}); else if(b.dataset.t) act({type:b.dataset.t}); });
  const K={b:()=>chat('!bois'),p:()=>chat('!pierre'),c:()=>chat('!chasse'),v:()=>act({type:'vote'}),1:()=>act({type:'cheer',bits:100}),5:()=>act({type:'cheer',bits:500}),s:()=>act({type:'sub'})};
  addEventListener('keydown',e=>{ if(e.target.tagName!=='INPUT'&&!e.ctrlKey&&!e.metaKey&&K[e.key]) K[e.key](); });
  function paintCooldowns(){
    const u=$('u').value.trim()||'Viewer';
    document.querySelectorAll('button[data-c]').forEach(b=>{ const c=b.dataset.c.split(' ')[0]; if(c==='!optout') return; const l=left(u,c);
      b.classList.toggle('cool',!!l); b.setAttribute('aria-disabled',!!l); let t=b.querySelector('.cd'); if(l){ if(!t){t=document.createElement('span');t.className='cd';b.appendChild(t);} t.textContent=l+' s'; } else if(t) t.remove(); });
    if(S&&S.vote){ const tm=$('vote').querySelector('.timer'); if(tm) tm.innerHTML=I('timer')+' '+Math.max(0,Math.ceil((S.vote.ends-S.now)/1000-(Date.now()-S._rx)/1000))+' s'; }
  }
  setInterval(paintCooldowns,250);
  const ICON={hutte:'🛖',ferme:'🌾',carriere:'⛏️',tour:'🏰'}, NAME=Panels.NAME, BI=b=>I(b);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let lastAlert=0;
  function onState(s){
    S=s; S._rx=Date.now(); if(s.cooldownMs!==undefined){ cdMs=s.cooldownMs; $('cdinfo').textContent=`cooldown ${cdMs/1000} s`; }
    render(s); Panels.liveState(s,$('u').value.trim()||'Viewer');
    // Vote
    if(s.vote){ const tot=Object.values(s.vote.tally).reduce((a,b)=>a+b,0), max=Math.max(0,...Object.values(s.vote.tally));
      put('vote',`<h4><span>🗳️ ${esc(s.vote.title)}</span> <span class="timer"></span></h4>`+Object.entries(s.vote.tally).map(([o,n])=>`<button data-c="!vote ${esc(o)}" class="${max&&n===max?'lead':''}" style="--p:${tot?n/tot*100:0}%"><span>${I(o)} ${NAME[o]||esc(o)}<small>!vote ${esc(o)}</small></span><span>${n}</span></button>`).join('')+Panels.pending(s));
    } else put('vote',`<h4><span>🗳️ Vote</span></h4>${Panels.voteEmpty()}${Panels.pending(s)}<button data-t="vote" class="vlaunch" aria-keyshortcuts="v">🗳️ Lancer un vote maintenant<small>simulation · touche V</small></button>`);
    // Construire
    const unl=s.unlockedBuildings||Object.keys(s.costs||{});
    put('build',Object.entries(s.costs||{}).map(([b,c])=>unl.includes(b)?`<button data-c="!construire ${b}" title="${esc(Panels.DESC[b]||'')}" class="${s.res.bois>=c.bois&&s.res.pierre>=c.pierre?'ok':''}">${BI(b)} ${NAME[b]}<small>${c.bois}🪵${c.pierre?' '+c.pierre+'🪨':''}</small></button>`:`<button class="locked" disabled title="${esc(Panels.DESC[b]||'')}">${BI(b)} ${NAME[b]}<small>🔒 palier suivant</small></button>`).join('')+
      (s.wonder?`<button data-w="1" class="${s.wonder.unlocked?'':'locked'}" ${s.wonder.unlocked&&s.wonder.cost?'':'disabled'}>${I('merveille')} Merveille ${s.wonder.pct!=null?s.wonder.pct+' %':s.wonder.phase+'/3'}<small>${s.wonder.cost?(s.wonder.unlocked?(s.wonder.final?(s.wonder.final.cost.bois-s.wonder.final.paid.bois)+'🪵 '+(s.wonder.final.cost.pierre-s.wonder.final.paid.pierre)+'🪨'+(s.wonder.final.cap<100?' · ⏳ '+s.wonder.final.cap+' %, plein dans '+Math.max(1,Math.ceil((s.wonder.final.fullAt-(s.now||Date.now()))/60000))+' min':''):s.wonder.cost.bois+'🪵 '+s.wonder.cost.pierre+'🪨'):'🔒 '+(s.wonder.opensAt?'dans '+Math.max(1,Math.ceil((s.wonder.opensAt-(s.now||Date.now()))/60000))+' min':(s.wonder.nextStage||'Ville'))):'achevée'}</small></button>`:''));
    put('me',Panels.me(s,$('u').value.trim()||'Viewer'));
    put('miniobj',Panels.objectives(s,innerWidth<900)+Panels.foyer(s)+Panels.lastRaid(s)+(s.revival?`<div class="rvmini">${Panels.revival(s)}</div>`:'')+(s.gameOver?`<div class="rvmini">${Panels.gameOver(s)}</div>`:''));
    put('howto',Panels.howto(s));
    // Seuils Bits configurés (BITS_TIERS / GOAL_STEP) : boutons de démo alignés sur le serveur
    if(s.bitsTiers) document.querySelectorAll('[data-tier]').forEach(b=>{ const t=s.bitsTiers[+b.dataset.tier]; if(t&&+b.dataset.bits!==t.bits){ b.dataset.bits=t.bits; const a=b.querySelector('.amt'); if(a) a.textContent=t.bits.toLocaleString('fr-FR'); } });
    $('hpinfo').textContent=s.foyer?s.foyer.hp+'/'+s.foyer.max+' PV':'';
    $('capinfo').innerHTML=s.bitsCapLeft!=null?(s.bitsCapLeft>0?`Ressources Bits encore possibles sur 10 min : ${s.bitsCapLeft}`:`<b style="color:#ffb020">Plafond de ressources Bits atteint pour 10 min</b> : les effets spéciaux restent actifs`):'';
    const g=s.goal||{bits:5000}; $('goalinfo').textContent=`${Math.min(g.cur??s.bitsTotal,g.bits).toLocaleString('fr-FR')} / ${g.bits.toLocaleString('fr-FR')} Bits`;
    // Vue mobile
    $('mini').className='mini'+(s.weather==='clair'?'':' storm');
    const ch=(ic,v,lab,tip)=>`<span title="${esc(tip)}">${I(ic)} ${v} <em>${lab}</em></span>`;
    const mh=`<div class="r">${ch('bois',s.res.bois,'bois','Bois')}${ch('pierre',s.res.pierre,'pierre','Pierre')}${ch('nourriture',s.res.nourriture,'nourriture','Nourriture')}${ch('colons',s.pop,'villageois','Villageois')}${ch('palier',esc(s.stage),'','Palier de la colonie')}${s.foyer?ch('foyer',s.foyer.hp,'PV','Grand Foyer'):''}${s.threat?`<span>${s.threat.type==='raid'?'⚔️':'❄️'} ${Math.max(0,Math.ceil((s.threat.at-s.now)/60000))} min</span>`:''}${s.special?'<span>✨ ×1,5</span>':''}${s.weather==='orage magique'?`<span title="Orage magique">⛈️ ${Math.max(0,Math.ceil((s.weatherUntil-s.now)/1000))} s</span>`:''}</div>`+
      `<div class="bl">${s.buildings.map(b=>`<div>${BI(b)}<small>${NAME[b]}</small></div>`).join('')}${s.special?'<div>🗼<small>Phare</small></div>':''}<div class="ppl">${'🧑‍🌾'.repeat(Math.min(s.pop,8))}</div></div>`; if($('mini').dataset.k!==mh){ $('mini').dataset.k=mh; $('mini').innerHTML=mh; }
    const a=s.alert||(s.feed&&s.feed[0]); if(a&&a.t!==lastAlert){ lastAlert=a.t; $('toast').innerHTML=iconify(esc(a.m)); }
    iconifyDom(document.querySelector('.side'));
    paintCooldowns();
  }
  // Aperçu de l'overlay à l'échelle 1 (textes ≥ 12 px) : il défile dans son cadre au lieu d'être réduit.
  buildOverlay(); Driver.start(onState);
  // Démo/vérification : #autotest déroule quelques actions via les vrais boutons.
  if(location.hash==='#autotest'){ const q=sel=>document.querySelector(sel).click(); q('[data-c="!bois"]'); q('[data-bits="500"]'); q('[data-t="sub"]'); q('[data-t="vote"]'); setTimeout(()=>{ q('[data-c="!vote hutte"], .v button[data-c]'); q('[data-c="!bois"]'); },300); }
})();
