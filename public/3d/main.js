// Village 3D isométrique branché sur l'état réel du jeu (server/game.js).
// Mode serveur : état via SSE (/events) ; démo GitHub Pages : jeu dans le navigateur (driver-local.js).
import * as THREE from './three.module.js?v=r160';
// Garde-fou : si un ancien game.js est en cache (sans layout), on recharge une fois en contournant le cache.
const TC=window.TwitchColony||{};
if(typeof TC.layout!=='function'||typeof TC.mulberry!=='function'){
  const u=new URL(location); if(!u.searchParams.has('fresh')){ u.searchParams.set('fresh',Date.now()); location.replace(u); }
  window.showFatal('Le moteur du jeu (game.js) est une ancienne version en cache. Rechargez la page (ou videz le cache du navigateur).');
  throw new Error('game.js obsolète');
}
const {layout,mulberry}=TC;
const TYPES={hutte:{n:'Hutte',c:0xc9925a,roof:0x8a5a2b},ferme:{n:'Ferme',c:0xe8d9a8,roof:0xb5432f},carriere:{n:'Carrière',c:0x9a9a9a,roof:0x6d6d6d},
 tour:{n:'Tour',c:0xb8b0a0,roof:0x4a5d8a},phare:{n:'Phare de la session',c:0xf2efe6,roof:0xffd23f}};
const N=24, OFF=N/2, P=new URLSearchParams(location.search), OBS=P.has('obs'); if(OBS) document.body.classList.add('obs');
const $=id=>document.getElementById(id), esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Number(n).toLocaleString('fr-FR').replace(/\u202f/g,' ');
// ─── Rendu ───
const canvas=$('c'), R=new THREE.WebGLRenderer({canvas,antialias:true,alpha:OBS,preserveDrawingBuffer:true});
R.setPixelRatio(Math.min(devicePixelRatio,2)); R.shadowMap.enabled=true; R.shadowMap.type=THREE.PCFSoftShadowMap;
const S=new THREE.Scene(); if(!OBS) S.background=new THREE.Color(0x87b9d9);
const cam=new THREE.OrthographicCamera(-1,1,1,-1,-200,400); let zoom=P.has('zoom')?+P.get('zoom'):1, rot=+(P.get('rot')||0), rotA=rot*Math.PI/2+Math.PI/4;
const target=new THREE.Vector3(0,0,0);
S.add(new THREE.HemisphereLight(0xdff2ff,0x4d6b3a,1.1));
const sun=new THREE.DirectionalLight(0xfff1d6,2.2); sun.position.set(18,30,10); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:80}); sun.shadow.radius=4; sun.shadow.bias=-0.0008; S.add(sun);
const world=new THREE.Group(), town=new THREE.Group(), people=new THREE.Group(); S.add(world,town,people);
const M=c=>new THREE.MeshStandardMaterial({color:c,flatShading:true,roughness:.9});
function mesh(g,c,x,y,z,parent){ const m=new THREE.Mesh(g,M(c)); m.position.set(x,y,z); m.castShadow=m.receiveShadow=true; parent.add(m); return m; }
function building(t){ const d=TYPES[t], g=new THREE.Group();
 if(t==='hutte'){ mesh(new THREE.CylinderGeometry(.35,.4,.5,7),d.c,0,.25,0,g); mesh(new THREE.ConeGeometry(.5,.5,7),d.roof,0,.75,0,g); }
 else if(t==='ferme'){ mesh(new THREE.BoxGeometry(.9,.6,.7),d.c,-.35,.3,-.35,g); const r=mesh(new THREE.ConeGeometry(.7,.45,4),d.roof,-.35,.82,-.35,g); r.rotation.y=Math.PI/4;
  for(let i=0;i<3;i++) mesh(new THREE.BoxGeometry(.18,.12,.8),0x7fae3e,.1+i*.28,.06,.4,g); mesh(new THREE.CylinderGeometry(.18,.18,.8,8),0xd0a040,.55,.4,-.45,g); }
 else if(t==='carriere'){ mesh(new THREE.BoxGeometry(1.6,.15,.8),0x7d7468,0,.07,0,g); for(let i=0;i<4;i++) mesh(new THREE.DodecahedronGeometry(.18+i*.03),d.c,-.5+i*.33,.25,(i%2-.5)*.3,g);
  mesh(new THREE.BoxGeometry(.05,.7,.05),0x6b4a2b,.6,.35,.2,g); mesh(new THREE.BoxGeometry(.4,.05,.05),0x6b4a2b,.45,.68,.2,g); }
 else if(t==='tour'){ mesh(new THREE.CylinderGeometry(.28,.34,1.5,6),d.c,0,.75,0,g); mesh(new THREE.ConeGeometry(.4,.5,6),d.roof,0,1.75,0,g); }
 else { mesh(new THREE.CylinderGeometry(.25,.35,1.9,8),d.c,0,.95,0,g); for(let i=0;i<3;i++) mesh(new THREE.CylinderGeometry(.27,.3,.12,8),0xd04040,0,.4+i*.55,0,g);
  const l=mesh(new THREE.OctahedronGeometry(.22),d.roof,0,2.1,0,g); l.material.emissive=new THREE.Color(0xffc000); l.material.emissiveIntensity=.8; }
 return g; }
// ─── Monde (sol + décor, dérivés de la seed de la partie) ───
let seed=null, decor=[], blds=[], phare=null, colonists=[], occ=new Uint8Array(N*N), tags=[];
function buildWorld(sd){
  world.clear(); town.clear(); people.clear(); blds=[]; phare=null; colonists=[]; decor=[];
  const ground=new THREE.Mesh(new THREE.BoxGeometry(N,.4,N),M(0x6aa84f)); ground.position.y=-.2; ground.receiveShadow=true; world.add(ground);
  const grid=new THREE.GridHelper(N,N,0x5a9443,0x5a9443); grid.position.y=.005; grid.material.opacity=.35; grid.material.transparent=true; world.add(grid);
  const r=mulberry(sd^0x5bd1e995);
  for(let i=0;i<70;i++){ const x=Math.floor(r()*N), z=Math.floor(r()*N); if(Math.abs(x-OFF)<4&&Math.abs(z-OFF)<4) continue; const g=new THREE.Group(), s=.7+r()*.6;
    if(r()<.8){ mesh(new THREE.CylinderGeometry(.06,.09,.4,5),0x6b4a2b,0,.2,0,g); mesh(new THREE.ConeGeometry(.35,.8,6),r()<.5?0x2f7d3a:0x3f9445,0,.75,0,g); mesh(new THREE.ConeGeometry(.25,.55,6),0x4aa552,0,1.1,0,g); }
    else { const m=mesh(new THREE.DodecahedronGeometry(.2+r()*.2),0x8d8d8d,0,.12,0,g); m.rotation.set(r()*3,r()*3,0); }
    g.scale.setScalar(s); g.position.set(x+.5-OFF,0,z+.5-OFF); g.userData.cell=z*N+x; world.add(g); decor.push(g); }
  $('seed').textContent=sd;
}
const label=(text,pos,prio)=>{ const el=document.createElement('div'); el.className='lbl'; el.textContent=text; $('labels').appendChild(el); const t={el,pos,prio,w:0}; tags.push(t); return t; };
const dropLabel=t=>{ t.el.remove(); tags=tags.filter(x=>x!==t); };
function placeColonist(c,i){ // case libre aléatoire, stable pour (seed, i), déplacée seulement si un bâtiment la recouvre
  const r=mulberry((seed^0x27d4eb2d)+i*7919+(c.userData.moves||0)*104729);
  for(let k=0;k<400;k++){ const x=Math.floor(OFF-6+r()*12+(k/40)*(r()-.5)), z=Math.floor(OFF-6+r()*12+(k/40)*(r()-.5)); if(x>=0&&z>=0&&x<N&&z<N&&!occ[z*N+x]){ c.userData.cell=z*N+x; c.userData.c=new THREE.Vector3(x+.5-OFF,0,z+.5-OFF); return; } }
}
function addColonist(i){ const g=new THREE.Group();
  mesh(new THREE.CylinderGeometry(.1,.13,.36,6),[0x3d6fd1,0xd1503d,0xe0b03a,0x7a4ad1][i%4],0,.18,0,g); mesh(new THREE.SphereGeometry(.12,8,6),0xf1c9a0,0,.46,0,g);
  g.userData={ph:i*1.7,moves:0,born:performance.now()}; placeColonist(g,i); g.position.copy(g.userData.c); people.add(g); colonists.push(g); }
// ─── Application de l'état du jeu ───
let last=null;
function apply(s){
  last=s; if(s.seed!==seed||s.buildings.length<blds.length){ tags.forEach(t=>t.el.remove()); tags=[]; seed=s.seed; buildWorld(seed); }
  const L=layout(seed,s.buildings,N); occ=L.occ;
  for(let i=blds.length;i<L.items.length;i++){ const b=L.items[i], g=building(b.type);
    g.position.set(b.x+b.w/2-OFF,0,b.z+b.h/2-OFF); g.rotation.y=b.rot*Math.PI/2; g.scale.setScalar(.01); g.userData.born=performance.now(); town.add(g);
    blds.push({g,tag:label(TYPES[b.type].n,new THREE.Vector3(g.position.x,b.type==='tour'?2.3:1.35,g.position.z),b.w*b.h)}); }
  const ph=!!s.special;
  if(ph&&!phare){ const g=building('phare'); g.position.set(L.phare.x+1-OFF,0,L.phare.z+1-OFF); g.scale.setScalar(.01); g.userData.born=performance.now(); town.add(g); phare={g,tag:label(TYPES.phare.n,new THREE.Vector3(g.position.x,2.7,g.position.z),10)}; }
  else if(!ph&&phare){ town.remove(phare.g); dropLabel(phare.tag); phare=null; }
  decor.forEach(d=>d.visible=!occ[d.userData.cell]);
  const want=Math.min(s.pop,40);
  while(colonists.length<want) addColonist(colonists.length);
  while(colonists.length>want){ people.remove(colonists.pop()); }
  colonists.forEach((c,i)=>{ if(occ[c.userData.cell]){ c.userData.moves++; placeColonist(c,i); } });
  hud(s);
}
// ─── HUD (valeurs réelles) ───
let skew=0; const now=()=>Date.now()+skew, secLeft=t=>Math.max(0,Math.ceil((t-now())/1000)), mmss=t=>{ const x=secLeft(t); return Math.floor(x/60)+':'+String(x%60).padStart(2,'0'); };
function hud(s){
  if(s.now) skew=s.now-Date.now();
  const st=(ic,v,lab,tip,bad)=>`<span class="stat${bad?' bad':''}" title="${esc(tip)}">${I(ic)}<span class="sv"><b>${v}</b><em>${lab}</em></span></span>`;
  $('res').innerHTML=st('bois',s.res.bois,'Bois','Bois : sert à construire (!bois)')+st('pierre',s.res.pierre,'Pierre','Pierre : fermes et tours (!pierre)')+
    st('nourriture',s.res.nourriture,s.res.nourriture===0?'Famine !':'Nourriture','Nourriture : nourrit les colons (!chasse, fermes)',s.res.nourriture===0)+st('colons',s.pop,'Colons','Colons : population de la colonie')+
    st('palier',esc(s.stage),'Palier','Palier de la colonie')+(s.threat?st(s.threat.type==='raid'?'raid':'hiver',mmss(s.threat.at),s.threat.type==='raid'?'Raid':'Hiver','Prochaine menace : '+(s.threat.type==='raid'?'raid (il faut des tours)':'hiver (il faut de la nourriture)')):'')+
    (s.special?st('phare','×2 '+mmss(s.special.until),'Phare','Phare de la session : gains du chat ×2'):'');
  const g=s.goal||{bits:5000,label:'Orage magique'};
  $('goal').innerHTML=`<div class="gl"><span>⚡ Objectif : ${esc(g.label)}${g.done?' ✅':''}</span><span>${fmt(Math.min(s.bitsTotal,g.bits))} / ${fmt(g.bits)} Bits</span></div><div class="track"><div class="fill" style="width:${Math.min(100,s.bitsTotal/g.bits*100)}%"></div></div>`;
  if(s.vote){ const tot=Object.values(s.vote.tally).reduce((a,b)=>a+b,0), max=Math.max(0,...Object.values(s.vote.tally));
    $('vote').innerHTML=`<h3><span>🗳️ ${esc(s.vote.title)}</span><span class="pill">⏱ ${secLeft(s.vote.ends)} s</span></h3>`+Object.entries(s.vote.tally).map(([o,n])=>`<div class="opt ${max&&n===max?'lead':''}"><div class="l"><span><code>!vote ${esc(o)}</code></span><span>${n}</span></div><div class="vb"><i style="width:${tot?n/tot*100:0}%"></i></div></div>`).join('');
  } else if(s.threat){ $('vote').innerHTML=`<h3><span>${s.threat.type==='raid'?'⚔️ Prochain raid':'❄️ Prochain hiver'}</span><span class="pill calm">${mmss(s.threat.at)}</span></h3><div class="sub">`+
      (s.threat.type==='raid'?`Tours : ${s.towers} / ${s.towersNeeded} ${s.towers>=s.towersNeeded?'✅':'⚠️'}`:`Nourriture : ${s.res.nourriture} / ${s.pop*3} ${s.res.nourriture>=s.pop*3?'✅':'⚠️'}`)+`</div><div class="sub">!bois · !pierre · !chasse · !construire …</div>`; }
  const a=s.alert, on=a&&now()-a.t<4500; $('alert').className='card alert '+(a?a.kind:'')+(on?' on':''); if(a&&$('alert').dataset.t!=a.t){ $('alert').dataset.t=a.t; $('alert').innerHTML=iconify(esc(a.m)); }
  iconifyDom(document.querySelector('.hud'));
  layoutHud();
}
function layoutHud(){ const st=document.documentElement.style; st.setProperty('--resh',($('res').offsetHeight+16)+'px'); st.setProperty('--legh',document.querySelector('.legal').offsetHeight+'px'); st.setProperty('--ctlh',(OBS?0:$('ctl').offsetHeight)+'px'); }
// ─── Contrôles de démo (absents en ?obs) ───
const crowd=['Viewer1','Viewer2','Viewer3','Viewer4','Viewer5']; let ci=0; const who=()=>crowd[ci++%crowd.length];
let msgT; const say=m=>{ $('msg').innerHTML=iconify(esc(m)); clearTimeout(msgT); msgT=setTimeout(()=>$('msg').textContent='',3000); };
$('ctl').addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.c) Driver.send({type:'chat',user:who(),text:b.dataset.c});
  else if(b.dataset.b){ if(last&&last.costs){ const c=last.costs[b.dataset.b]; if(last.res.bois<c.bois||last.res.pierre<c.pierre){ say(`${TYPES[b.dataset.b].n} : il faut ${c.bois} bois${c.pierre?' et '+c.pierre+' pierre':''}`); return; } } Driver.send({type:'build',name:b.dataset.b}); }
  else if(b.dataset.bits) Driver.send({type:'cheer',user:who(),bits:+b.dataset.bits});
  else if(b.dataset.t) Driver.send({type:b.dataset.t,user:who()}); });
$('rl').onclick=()=>rot--; $('rr').onclick=()=>rot++;
// ─── Caméra ───
function resize(){ const w=innerWidth,h=innerHeight; R.setSize(w,h,false); const a=w/h, v=(w<700?11:9)/zoom; cam.left=-v*a; cam.right=v*a; cam.top=v; cam.bottom=-v; cam.updateProjectionMatrix(); layoutHud(); }
addEventListener('resize',resize);
const keys={}; addEventListener('keydown',e=>{ keys[e.key.toLowerCase()]=1; if(e.key==='q'||e.key==='Q') rot--; if(e.key==='e'||e.key==='E') rot++; }); addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
function pan(dx,dy){ const s=(cam.top-cam.bottom)/innerHeight, f=new THREE.Vector3(-Math.sin(rotA),0,-Math.cos(rotA)), rt=new THREE.Vector3(Math.cos(rotA),0,-Math.sin(rotA));
  target.addScaledVector(rt,-dx*s).addScaledVector(f,dy*s*1.6); target.clampLength(0,N/2); }
const setZoom=z=>{ zoom=Math.min(4,Math.max(.5,z)); resize(); };
canvas.addEventListener('wheel',e=>{ e.preventDefault(); setZoom(zoom*Math.exp(-e.deltaY*.0015)); },{passive:false});
const pts=new Map(); let pd=0;
canvas.addEventListener('pointerdown',e=>{ canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); });
canvas.addEventListener('pointermove',e=>{ const p=pts.get(e.pointerId); if(!p) return;
  if(pts.size===1) pan(e.clientX-p.x,e.clientY-p.y);
  else if(pts.size===2){ p.x=e.clientX; p.y=e.clientY; const [a,b]=[...pts.values()], d=Math.hypot(a.x-b.x,a.y-b.y); if(pd) setZoom(zoom*d/pd); pd=d; return; }
  p.x=e.clientX; p.y=e.clientY; });
const up=e=>{ pts.delete(e.pointerId); pd=0; }; canvas.addEventListener('pointerup',up); canvas.addEventListener('pointercancel',up);
// ─── Étiquettes sans chevauchement ni débordement ───
const v=new THREE.Vector3();
function placeLabels(){ const W=innerWidth,H=innerHeight, kept=[];
  const list=tags.map(t=>{ v.copy(t.pos).project(cam); if(!t.w) t.w=t.el.offsetWidth||t.el.textContent.length*8+12; return {t,x:(v.x+1)/2*W,y:(1-v.y)/2*H,depth:v.z}; });
  list.sort((a,b)=>b.t.prio-a.t.prio||a.depth-b.depth);
  for(const o of list){ const w=o.t.w, h=20, x=Math.min(W-w/2-4,Math.max(w/2+4,o.x)), r={l:x-w/2-2,r:x+w/2+2,t:o.y-h-2,b:o.y+2};
    const vis=o.y>h+4&&o.y<H-4&&o.x>-20&&o.x<W+20&&!kept.some(k=>r.l<k.r&&r.r>k.l&&r.t<k.b&&r.b>k.t);
    o.t.el.style.display=vis?'':'none'; if(vis){ kept.push(r); o.t.el.style.left=x+'px'; o.t.el.style.top=o.y+'px'; } } }
// ─── Boucle ───
resize(); const clock=new THREE.Clock();
R.setAnimationLoop(()=>{ const dt=Math.min(clock.getDelta(),.05), t=clock.elapsedTime, sp=600*dt, pn=performance.now();
  if(keys.w||keys.arrowup) pan(0,sp*.6); if(keys.s||keys.arrowdown) pan(0,-sp*.6); if(keys.a||keys.arrowleft) pan(sp,0); if(keys.d||keys.arrowright) pan(-sp,0);
  rotA+=((rot*Math.PI/2+Math.PI/4)-rotA)*Math.min(1,dt*8);
  cam.position.set(target.x+Math.sin(rotA)*40,target.y+40*Math.tan(Math.PI/6)*1.41,target.z+Math.cos(rotA)*40); cam.lookAt(target);
  town.children.forEach(g=>{ const k=Math.min(1,(pn-(g.userData.born||0))/450); g.scale.setScalar(k<1?.01+k*(1+.25*Math.sin(k*Math.PI)):1); });
  colonists.forEach(c=>{ const u=c.userData, a=t*.6+u.ph; c.position.set(u.c.x+Math.cos(a)*.3,Math.abs(Math.sin(t*6+u.ph))*.05,u.c.z+Math.sin(a)*.3); c.rotation.y=-a; });
  R.render(S,cam); placeLabels(); });
let failed=false;
Driver.start(s=>{ if(failed) return; try{ apply(s); window.__state=s; }catch(e){ failed=true; console.error(e); window.showFatal('Erreur d\'affichage du village : '+e.message); } });
window.__ready=true;
