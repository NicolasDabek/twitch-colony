// UX passe 6 : l'overlay 1280 × 720 est fait pour OBS. Sur téléphone / tablette, on affiche un bandeau lisible vers la simulation.
(function(){
  var q=location.search;
  if(/[?&](obs|force)\b/.test(q)) return;
  var small=!!(window.matchMedia&&matchMedia('(hover:none) and (pointer:coarse)').matches);
  if(!small) return;
  var vp=document.querySelector('meta[name=viewport]'); if(vp) vp.setAttribute('content','width=device-width,initial-scale=1');
  document.documentElement.classList.add('ovgate');
  function show(){
    var d=document.createElement('main'); d.className='ovgate-box'; d.setAttribute('role','main');
    d.innerHTML='<h1>Twitch Colony</h1><p>Cette page est l’<b>overlay pour OBS</b> (1280 × 720) : illisible sur un petit écran.</p>'+
      '<a class="ovgate-go" href="sim.html">Ouvrir la simulation →</a><a class="ovgate-alt" href="3d/">Voir le village en 3D</a>'+
      '<a class="ovgate-alt" href="?force">Afficher quand même l’overlay</a>';
    document.body.insertBefore(d,document.body.firstChild);
  }
  if(document.body) show(); else document.addEventListener('DOMContentLoaded',show);
})();
