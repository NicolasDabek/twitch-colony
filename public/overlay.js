const ICON={hutte:'🛖',ferme:'🌾',carriere:'⛏️',tour:'🗼'}, $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function render(s){
  const sec=t=>Math.max(0,Math.ceil((t-(s.now||Date.now()))/1000)), mmss=t=>{const x=sec(t);return Math.floor(x/60)+':'+String(x%60).padStart(2,'0');};
  const th=s.threat?(s.threat.type==='raid'?`⚔️ Raid dans ${mmss(s.threat.at)} · tours ${s.towers}/${s.towersNeeded}`:`❄️ Hiver dans ${mmss(s.threat.at)} · besoin ${s.pop*3} 🍖`):'';
  $('res').innerHTML=`<h3>${esc(s.stage||'Colonie')} — ${s.pop} colons · météo : ${esc(s.weather)}</h3>🪵 ${s.res.bois} &nbsp; 🪨 ${s.res.pierre} &nbsp; 🍖 ${s.res.nourriture}${s.res.nourriture===0?' <b style="color:#f66">FAMINE</b>':''}<br><small>${th}</small><br>${s.special?`<small>✨ Phare : gains ×2 encore ${mmss(s.special.until)}</small><br>`:''}<small>Objectif communautaire : ${Math.min(s.bitsTotal,5000)}/5000 Bits (orage magique)</small><div class="bar" style="width:${Math.min(100,s.bitsTotal/50)}%"></div>`;
  $('vote').innerHTML=s.vote?`<h3>🗳️ ${esc(s.vote.title)} (${sec(s.vote.ends)} s)</h3>`+Object.entries(s.vote.tally).map(([o,n])=>`!vote ${esc(o)} — ${n}${s.costs&&s.costs[o]?` <small>(${s.costs[o].bois}🪵 ${s.costs[o].pierre}🪨)</small>`:''}`).join('<br>'):'<h3>Commandes</h3>!bois · !pierre · !chasse · !construire hutte · !vote …<br><small>!optout pour ne pas apparaître au classement</small>'+(s.costs?'<br><small>'+Object.entries(s.costs).map(([b,c])=>`${b} ${c.bois}🪵${c.pierre?' '+c.pierre+'🪨':''}`).join(' · ')+(s.active?` · ${s.active} actifs`:'')+'</small>':'');
  $('lb').innerHTML='<h3>🏆 Classement de la session</h3>'+(s.leaderboard.map((l,i)=>`${i+1}. ${esc(l.name)} — ${l.pts}${l.title?` <b>· ${l.title}</b>`:''}`).join('<br>')||'<small>Personne encore… tapez !bois</small>');
  $('log').innerHTML=s.log.map(l=>esc(l.m)).join(' · ');
  $('map').className=s.weather==='clair'?'':'storm';
  $('map').innerHTML=s.buildings.map((b,i)=>`<span class="b" style="left:${40+(i*97)%740}px;top:${300+Math.floor(i*97/740)*70}px">${ICON[b]||'🏠'}</span>`).join('')+(s.special?'<span class="b" style="left:380px;top:120px;font-size:70px" title="Phare de la session">🗼✨</span>':'')+`<span class="b" style="left:20px;top:20px;font-size:20px">${'🧑‍🌾'.repeat(Math.min(s.pop,25))}</span>`;
}
if(!window.STANDALONE) new EventSource('/events').onmessage=e=>render(JSON.parse(e.data));
