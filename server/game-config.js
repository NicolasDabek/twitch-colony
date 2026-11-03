// Réglages de partie partagés par le serveur (Node) et la démo navigateur (GitHub Pages).
// Fichier sans dépendance ni script inline : chargé par <script src> avant game.js dans le navigateur,
// et par require() côté serveur. Les valeurs du .env (GAME_LENGTH, BITS_TIERS, GOAL_STEP) sont validées
// dans server/config.js puis transmises à new Colony({...}).
(function(root){
  // Durée de partie : multiplie les seuils de palier, les coûts de la Merveille et la croissance des coûts.
  // Toutes les durées respectent la règle : une partie complète (Cité + Merveille) dure au moins 3 h.
  // Passe GD 8 : deux jalons nommés de Merveille, « fondations » (premier) et « flèche » (avant la tranche finale), sans raid de garde.
  const NAMED={fondations:'fondations',fleche:'flèche'};
  const LENGTHS={
    courte:{label:'courte (≈ 3 h 30)',stageMul:0.85,wonderMul:0.6,growth:1.10,costMul:2.2,
      // Passe GD 6 (courte) : menace par palier adoucie, régénération plus lente, un seul rallumage à 25 PV,
      // « murs » par défaut si moins de 3 votants à la stratégie, et menace petite audience lissée.
      wonderCuts:[0.15,1/3,2/3,0.85,1],
      foyer:{raidStep:4,smallScaleK:0.5,smallCapMargin:10,regenMs:4*60000,stratDefaultBelow:3,revive:{max:1,hp:25}}},
    normale:{label:'normale (≈ 3 h 45)',stageMul:1,wonderMul:0.66,growth:1.10,costMul:2.4,wonderCuts:[0.15,1/3,1/2,2/3,0.85,1],
      // Passe GD 9 : petite audience plafonnée (défense gratuite max − 10) et rallumage à 25 PV : un Foyer négligé finit par tomber après 3 h.
      foyer:{smallCapMargin:10,smallCapFloor:true,revive:{hp:25}}},
    longue:{label:'longue (≈ 5 h 30)',stageMul:1.1,wonderMul:1.4,growth:1.10,costMul:2.2,wonderCuts:[0.1,0.2,0.35,0.5,0.65,0.8,0.9,1]},
  };
  // Seuils Bits (session uniquement, effets plafonnés dans game.js) : remparts < phare < bénédiction.
  // GOAL_STEP : taille de chaque palier de l'objectif communautaire (orage magique).
  const DEFAULTS={gameLength:'normale',bitsTiers:{remparts:300,phare:500,benediction:1500},goalStep:5000};
  const LIMITS={bitsMin:100,bitsMax:100000,goalMin:1000,goalMax:1000000};
  const api={NAMED,LENGTHS,DEFAULTS,LIMITS};
  if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.TwitchColonyConfig=api;
})(typeof globalThis!=='undefined'?globalThis:this);
