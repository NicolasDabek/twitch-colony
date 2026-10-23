// Réglages de partie partagés par le serveur (Node) et la démo navigateur (GitHub Pages).
// Fichier sans dépendance ni script inline : chargé par <script src> avant game.js dans le navigateur,
// et par require() côté serveur. Les valeurs du .env (GAME_LENGTH, BITS_TIERS, GOAL_STEP) sont validées
// dans server/config.js puis transmises à new Colony({...}).
(function(root){
  // Durée de partie : multiplie les seuils de palier, les coûts de la Merveille et la croissance des coûts.
  // Toutes les durées respectent la règle : une partie complète (Cité + Merveille) dure au moins 3 h.
  const LENGTHS={
    courte:{label:'courte (≈ 3 h 30)',stageMul:1,wonderMul:0.7,growth:1.10,costMul:2.2},
    normale:{label:'normale (≈ 4 h 30)',stageMul:1,wonderMul:1,growth:1.10,costMul:2.4},
    longue:{label:'longue (≈ 5 h 30)',stageMul:1.1,wonderMul:1.25,growth:1.10,costMul:2.2},
  };
  // Seuils Bits (session uniquement, effets plafonnés dans game.js) : remparts < phare < bénédiction.
  // GOAL_STEP : taille de chaque palier de l'objectif communautaire (orage magique).
  const DEFAULTS={gameLength:'normale',bitsTiers:{remparts:300,phare:500,benediction:1500},goalStep:5000};
  const LIMITS={bitsMin:100,bitsMax:100000,goalMin:1000,goalMax:1000000};
  const api={LENGTHS,DEFAULTS,LIMITS};
  if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.TwitchColonyConfig=api;
})(typeof globalThis!=='undefined'?globalThis:this);
