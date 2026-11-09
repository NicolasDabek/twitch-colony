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
    courte:{label:'courte (≈ 3 h 15)',stageMul:0.85,wonderMul:0.6,growth:1.10,costMul:2.2,
      // Passe GD 6 (courte) : menace par palier adoucie, régénération plus lente, un seul rallumage à 25 PV,
      // « murs » par défaut si moins de 3 votants à la stratégie, et menace petite audience lissée.
      // Passe GD 10 : plus de jalons (creux ≤ 25 min), menace toutes les 12 min ; dernière tranche 20 % pour laisser le Foyer négligé tomber après 3 h.
      wonderCuts:[0.1,0.22,0.36,0.5,0.65,0.8,1],
      threatMs:12*60000,
      foyer:{raidStep:4,smallScaleK:0.5,smallCapMargin:10,regenMs:4*60000,stratDefaultBelow:3,revive:{max:1,hp:25},assault:{atMs:105*60000,inMs:3*60000,bonus:10,fullK:1,minViewers:1}}},
    normale:{threatMs:12*60000,label:'normale (≈ 3 h 45)',stageMul:1,wonderMul:0.64,growth:1.10,costMul:2.4,wonderCuts:[0.15,1/3,1/2,2/3,0.85,1],
      // Passe GD 9 : petite audience plafonnée et rallumage à 25 PV.
      // Passe GD 10 : petite audience plus clémente (base 16, marge 18) → ≥ 60 % de raids repoussés à 5 viewers.
      foyer:{smallCapMargin:18,smallCapFloor:true,smallRaidBase:16,smallScaleK:0.25,revive:{hp:25}}},
    // GD11 : finale 5 h 15–5 h 45, jalons rapprochés et consolidation gratuite.
    // GD12 : climax vers 4 h 50–5 h 05 (accès complet − 30 min), puis trêve : plus de raid ordinaire avant l'inauguration.
    longue:{threatMs:12*60000,label:'longue (≈ 5 h 30)',stageMul:1.1,wonderMul:1.0,growth:1.10,costMul:2.2,wonderCuts:[0.08,0.16,0.24,0.32,0.4,0.5,0.56,0.64,0.72,0.8,0.9,1],foyer:{climax:{truce:true}}},
  };
  // Seuils Bits (session uniquement, effets plafonnés dans game.js) : remparts < phare < bénédiction.
  // GOAL_STEP : taille de chaque palier de l'objectif communautaire (orage magique).
  const DEFAULTS={gameLength:'normale',bitsTiers:{remparts:300,phare:500,benediction:1500},goalStep:5000};
  const LIMITS={bitsMin:100,bitsMax:100000,goalMin:1000,goalMax:1000000};
  const api={NAMED,LENGTHS,DEFAULTS,LIMITS};
  if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.TwitchColonyConfig=api;
})(typeof globalThis!=='undefined'?globalThis:this);
