// Contrôles de la démo : boutons groupés, raccourcis, cooldown visible, vote cliquable, vue mobile.
(function(){
  const $=id=>document.getElementById(id), last={};
  const put=(id,h)=>{ const e=$(id); if(e.dataset.k!==h){ e.dataset.k=h; e.innerHTML=h; } }; let S=null, cdMs=5000, msgTimer;
  const user=()=>{ const u=$('u'); if($('rnd').checked) u.value='Viewer'+Math.floor(Math.random()*50); return u.value.trim()||'Viewer'; };
  const say=m=>{ $('msg').innerHTML=iconify(esc(m)); clearTimeout(msgTimer); msgTimer=setTimeout(()=>$('msg').textContent='',2500); };
  const left=(u,c)=>Math.max(0,Math.ceil(((last[u+c]||0)+cdMs-Date.now())/1000));
  function chat(text){
    const u=user(), c=text.split(' ')[0];
    if(!['!optout','!optin'].includes(c)){ const l=left(u,c); if(l){ say(`⏳ ${c} ignoré pour ${u} : attends ${l} s (cooldown ${cdMs/1000} s par viewer)`); return; } last[u+c]=Date.now(); }
    Driver.send({type:'chat',user:u,text});
  }
  function act(e){ Driver.send({...e,user:user()}); }
  document.addEventListener('click',ev=>{ const b=ev.target.closest('button'); if(!b) return;
    if(b.dataset.c) chat(b.dataset.c); else if(b.dataset.bits) act({type:'cheer',bits:+b.dataset.bits}); else if(b.dataset.t) act({type:b.dataset.t}); });
  const K={b:()=>chat('!bois'),p:()=>chat('!pierre'),c:()=>chat('!chasse'),v:()=>act({type:'vote'}),1:()=>act({type:'cheer',bits:100}),5:()=>act({type:'cheer',bits:500}),s:()=>act({type:'sub'})};
  addEventListener('keydown',e=>{ if(e.target.tagName!=='INPUT'&&!e.ctrlKey&&!e.metaKey&&K[e.key]) K[e.key](); });
  function paintCooldowns(){
    const u=$('u').value.trim()||'Viewer';
    document.querySelectorAll('button[data-c]').forEach(b=>{ const c=b.dataset.c.split(' ')[0]; if(c==='!optout') return; const l=left(u,c);
      b.classList.toggle('cool',!!l); b.setAttribute('aria-disabled',!!l); let t=b.querySelector('.cd'); if(l){ if(!t){t=document.createElement('span');t.className='cd';b.appendChild(t);} t.textContent=l+' s'; } else if(t) t.remove(); });
    if(S&&S.vote){ const tm=$('vote').querySelector('.timer'); if(tm) tm.innerHTML=I('timer')+' '+Math.max(0,Math.ceil((S.vote.ends-S.now)/1000-(Date.now()-S._rx)/1000))+' s'; }
  }
  setInterval(paintCooldowns,250);
  const ICON={hutte:'🛖',ferme:'🌾',carriere:'⛏️',tour:'🏰'}, NAME={hutte:'Hutte',ferme:'Ferme',carriere:'Carrière',tour:'Tour'};
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let lastAlert=0;
  function onState(s){
    S=s; S._rx=Date.now(); if(s.cooldownMs!==undefined){ cdMs=s.cooldownMs; $('cdinfo').textContent=`cooldown ${cdMs/1000} s`; }
    render(s);
    // Vote
    if(s.vote){ const tot=Object.values(s.vote.tally).reduce((a,b)=>a+b,0), max=Math.max(0,...Object.values(s.vote.tally));
      put('vote',`<h4><span>🗳️ ${esc(s.vote.title)}</span> <span class="timer"></span></h4>`+Object.entries(s.vote.tally).map(([o,n])=>`<button data-c="!vote ${esc(o)}" class="${max&&n===max?'lead':''}" style="--p:${tot?n/tot*100:0}%"><span>${ICON[o]||''} ${NAME[o]||esc(o)}<small>!vote ${esc(o)}</small></span><span>${n}</span></button>`).join(''));
    } else put('vote',`<h4><span>🗳️ Vote</span> <span style="color:#aaa;text-transform:none;letter-spacing:0">aucun en cours</span></h4><button data-t="vote" style="width:100%">Lancer un vote (bâtiments abordables)<small>V</small></button>`);
    // Construire
    put('build',Object.entries(s.costs||{}).map(([b,c])=>`<button data-c="!construire ${b}">${ICON[b]} ${NAME[b]}<small>${c.bois}🪵${c.pierre?' '+c.pierre+'🪨':''}</small></button>`).join(''));
    const g=s.goal||{bits:5000}; $('goalinfo').textContent=`${Math.min(s.bitsTotal,g.bits).toLocaleString('fr-FR')} / ${g.bits.toLocaleString('fr-FR')} Bits`;
    // Vue mobile
    $('mini').className='mini'+(s.weather==='clair'?'':' storm');
    const ch=(ic,v,lab,tip)=>`<span title="${esc(tip)}">${I(ic)} ${v} <em>${lab}</em></span>`;
    const mh=`<div class="r">${ch('bois',s.res.bois,'bois','Bois')}${ch('pierre',s.res.pierre,'pierre','Pierre')}${ch('nourriture',s.res.nourriture,'nourr.','Nourriture')}${ch('colons',s.pop,'colons','Colons')}${ch('palier',esc(s.stage),'','Palier de la colonie')}${s.threat?`<span>${s.threat.type==='raid'?'⚔️':'❄️'} ${Math.max(0,Math.ceil((s.threat.at-s.now)/60000))} min</span>`:''}${s.special?'<span>✨ ×2</span>':''}</div>`+
      `<div class="bl">${s.buildings.map(b=>`<div>${ICON[b]}<small>${NAME[b]}</small></div>`).join('')}${s.special?'<div>🗼<small>Phare</small></div>':''}<div class="ppl">${'🧑‍🌾'.repeat(Math.min(s.pop,8))}</div></div>`; if($('mini').dataset.k!==mh){ $('mini').dataset.k=mh; $('mini').innerHTML=mh; }
    const a=s.alert||(s.feed&&s.feed[0]); if(a&&a.t!==lastAlert){ lastAlert=a.t; $('toast').innerHTML=iconify(esc(a.m)); }
    iconifyDom(document.querySelector('.side'));
    paintCooldowns();
  }
  // Échelle de l'overlay sur ordinateur : il tient toujours dans l'écran.
  function fit(){ const w=$('stagewrap'); if(!w||!w.offsetWidth) return; const k=Math.min(w.offsetWidth/1280,(innerHeight-90)/720); $('ov').style.transform=`scale(${k})`; w.style.height=720*k+'px'; }
  addEventListener('resize',fit); new ResizeObserver(fit).observe($('stagewrap'));
  buildOverlay(); fit(); Driver.start(onState);
  // Démo/vérification : #autotest déroule quelques actions via les vrais boutons.
  if(location.hash==='#autotest'){ const q=sel=>document.querySelector(sel).click(); q('[data-c="!bois"]'); q('[data-bits="500"]'); q('[data-t="sub"]'); q('[data-t="vote"]'); setTimeout(()=>{ q('[data-c="!vote hutte"], .v button[data-c]'); q('[data-c="!bois"]'); },300); }
})();
