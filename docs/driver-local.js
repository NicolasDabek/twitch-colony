// Pilote « autonome » (GitHub Pages) : la logique de jeu tourne dans le navigateur.
(function(){
  const game=new TwitchColony.Colony(); window.game=game; let cb=()=>{};
  const draw=()=>cb(game.state());
  window.Driver={
    send:e=>{ if(e.type==='chat') game.chat(e.user,e.text); else if(e.type==='cheer') game.cheer(e.user,e.bits); else if(e.type==='sub') game.sub(e.user);
      else if(e.type==='vote') game.autoVote(); else if(e.type==='reset') game.reset(); else if(e.type==='build') game.build(e.name); else if(e.type==='gift') game.giftSubs(e.user||'Viewer',e.n||5); else if(e.type==='wonder') game.buildWonder(); else if(e.type==='raid') game.forceRaid(); draw(); return Promise.resolve(); },
    start:f=>{ cb=f; setInterval(()=>{ game.tick(); draw(); },1000); setInterval(()=>game.autoVote(),180000); draw(); }
  };
})();
