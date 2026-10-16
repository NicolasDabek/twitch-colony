# Twitch Colony 🛖

Jeu de **colonie communautaire** affiché sur un stream Twitch : le chat récolte, vote et construit ensemble. Overlay HTML/JS à ajouter comme **source navigateur OBS**, servi par un petit serveur Node **sans aucune dépendance** (pas de CDN, pas de `npm install`).

> « Les Bits permettent à la communauté d'influencer la partie en direct. Ils ne donnent accès à aucun objet, compte, service ou avantage en dehors de ce stream. »

## ▶️ Jouer en ligne (simulation, sans OBS ni serveur)

**https://nicolasdabek.github.io/twitch-colony/**

C'est une version 100 % navigateur hébergée sur GitHub Pages (dossier `docs/`). Elle utilise la même logique de jeu (`server/game.js`) que le serveur. Après toute modification de `server/game.js` ou `public/overlay.js`, lancez `npm run build:pages` : `npm test` vérifie que `docs/` est à jour.

### 🧊 Village 3D isométrique

- Démo en ligne : **https://nicolasdabek.github.io/twitch-colony/3d/**
- Source OBS (serveur local, fond transparent) : `http://localhost:3000/3d/?obs`
- La vue 3D utilise les vraies données du jeu : bâtiments, villageois, Phare, ressources, vote, objectif Bits et menaces. En mode serveur, l'état arrive par SSE (`/events`) ; dans la démo, le jeu tourne dans le navigateur.
- Placement : chaque partie a sa propre seed. Un nouveau bâtiment prend une case libre au hasard, et les bâtiments existants ne bougent jamais (fonction `layout()` dans `server/game.js`, testée). Le centre est réservé au Phare.
- Carte de 72×72 cases (la zone d'origine de 24×24 est au centre). Les nouveaux bâtiments remplissent d'abord le centre, puis s'étendent vers l'extérieur.
- Caméra : glisser / WASD / flèches pour déplacer, molette ou pincement pour zoomer (×0,1, carte entière, à ×4), Q/E pour pivoter d'un quart de tour.
- `three.module.js` (r160) est fourni dans le dépôt (aucun CDN).

## Lancer

```bash
node server/index.js      # ou npm start (Node 18+)
npm test                  # tests de la logique de jeu
```

- Overlay (OBS, 1280×720) : http://localhost:3000/overlay.html
- Simulateur (boutons + clavier, sans Twitch) : http://localhost:3000/sim.html
- Confidentialité : http://localhost:3000/confidentialite.html

Le simulateur (et la démo en ligne) regroupe les actions par blocs : Vote, Récolter, Construire, Soutiens, et Outils (repliés). Il affiche le cooldown de 5 s sur les boutons et a une mise en page mobile. L'overlay montre des alertes centrales (subs, Bits, constructions, menaces) et les 3 dernières actions.

Raccourcis du simulateur : **B** !bois · **P** !pierre · **C** !chasse · **V** lancer un vote · **1** 100 Bits · **5** 500 Bits · **S** sub.

## Commandes du chat (gratuites)

| Commande | Effet |
|---|---|
| `!bois` / `!pierre` / `!chasse` | +2 bois / +1 pierre / +2 nourriture (cooldown 5 s) |
| `!construire <bâtiment>` / `!construire merveille` | propose un vote de construction (bâtiments débloqués uniquement) |
| `!vote <option>` | vote en cours ; **+2 points** aux votants de l'option gagnante |
| `!rejoindre bûcheron\|mineur\|chasseur\|garde` | métier : +50 % sur `!bois` / `!pierre` / `!chasse` ; un garde compte double avec `!defendre` |
| `!defendre` | va défendre le Grand Foyer (+2 défense par défenseur, +4 pour un garde, plafond 16) pour le prochain raid |
| `!reparer` | 10 bois + 5 pierre de la colonie → +5 PV au Foyer |
| `!rallumer` | quand le Foyer est détruit : chaque viewer différent compte pour le rallumage |
| `!aide` | rappelle les commandes dans le fil |
| `!optout` / `!optin` | ne pas / de nouveau apparaître aux classements |

**Présence** : un viewer actif 3 tranches de 10 min d'affilée gagne +25 % sur ses récoltes. Les viewers gratuits peuvent tout construire, tout défendre et rallumer le Foyer : les Bits accélèrent, ils ne sont jamais indispensables.

## Enjeux de la partie

- **Paliers** : Campement → Hameau (3 bâtiments) → Village (6) → Bourg (10) → Ville (15) → Cité (21). **Fin de la partie = Cité + Merveille**, avec une annonce de victoire et la durée.
- **Coûts** : coût de base × 1,25 par exemplaire déjà construit × 1,19 par bâtiment déjà construit. Les coûts ne dépendent pas du nombre de viewers.
- **Adaptation à l'audience** : on compte les viewers actifs A, lissés sur 10 min. Au-delà de 5, chaque commande rapporte (5/A)^0,92 de sa valeur de base. La progression totale n'augmente donc que d'environ 25 % entre 5 et 100 viewers, et chaque commande compte toujours (le gain s'affiche dans le fil, par ex. « +0,4 »).
- **Logement** : villageois max = 3 + 2 par hutte + 1 pour 3 autres bâtiments. Un sub sans place libre donne de la nourriture.
- **Votes** : le vote automatique ne propose que les bâtiments abordables. `!construire` affiche ce qui manque. En cas d'égalité, le vote est départagé au hasard et c'est annoncé (votes gratuits uniquement).

## Objectifs à trois niveaux

Un panneau **Objectifs** (trois lignes sans étiquette, court → moyen → long terme, chacune avec sa barre de progression colorée) est affiché dans l'overlay, la démo 2D et la vue 3D (version compacte sur mobile) :
- **Court terme : défis communautaires** toutes les 5 min (coupez du bois, taillez de la pierre, chassez, votez nombreux, survivez à la prochaine menace). Réussi : +25 ressources, +10 nourriture, +3 points pour chaque participant.
- **Moyen terme : projets** (loger les villageois, défenses du palier, Grenier, réserve pour l'hiver, Palissade, Marché, Atelier) et **bâtiments débloqués par palier** : Grenier (Hameau, l'hiver coûte moitié moins), Palissade (Village, +10 défense), Marché (Bourg, +1 bois et +1 pierre / 10 s), Atelier (Ville, `!bois` / `!pierre` +25 %).
- **Long terme : Cité (21 bâtiments) + Merveille** en 3 phases (débloquée à la Ville). **La partie est gagnée quand les deux sont achevés.** Des **badges de session** marquent les étapes (premières fondations, raid repoussé, hiver survécu, 3 défis, orage, fête, Merveille, paliers).

L'interface montre aussi : le prochain bâtiment abordable et ce qui manque, la production par minute de chaque ressource, la menace suivante avec son compte à rebours et ce qu'il faut pour la passer, la contribution et le cooldown de chaque viewer, et deux classements séparés **Bâtisseurs** (actions gratuites) et **Mécènes** (Bits et subs). Dans la vue 3D, **toucher un bâtiment** affiche son nom, son effet et sa production ; les villageois offerts par un sub portent le pseudo de l'abonné.

## Le Grand Foyer : protéger le cœur du village

Le **Grand Foyer** occupe le centre de la carte (le Phare de la session s'y allume sous forme de faisceau). Il a **100 PV**, affichés dans le HUD et au-dessus du Foyer en 3D, et regagne 1 PV toutes les 2 min.
- **Raids** (toutes les 30 min, en alternance avec l'hiver) : des assaillants arrivent du bord de la carte et marchent vers le Foyer. **Force du raid = 22 + 8 × palier.** **Défense** = 10 par tour ou palissade + défenseurs `!defendre` (plafond 16) + remparts (Bits) + stratégie votée. **Dégâts = force − défense** (calcul fixe, affiché à l'avance). Un raid qui passe vole aussi jusqu'à 30 % du bois et de la pierre.
- **Vote de stratégie** 2 min avant chaque raid : *renforcer les murs* (+10 défense) ou *cacher les réserves* (rien n'est volé, le Foyer encaisse).
- **Foyer détruit (0 PV)** : 3 min pour le rallumer, avec un **objectif fixe** : **N viewers différents tapent `!rallumer`** (au moins 3, ou 30 % des viewers actifs) **OU 1 000 Bits**. Le Foyer repart à 40 PV. **2 rallumages maximum par session**, avec une exigence croissante (2e : au moins 6 viewers ou 50 % des actifs, OU 2 500 Bits). Sinon : **fin de partie**, écran récapitulatif de la session (durée, palier, bâtiments, raids, défis, Bâtisseurs, badges), puis une **nouvelle session démarre automatiquement** 30 s plus tard.

**Pourquoi aucun hasard ?** Les règles de Twitch interdisent d'utiliser les Bits pour des jeux d'argent ou de hasard (loterie, tirage, loot box, chance de gagner contre des Bits). Ici, tout ce qui touche aux Bits est **déterministe et annoncé à l'avance** : la force d'un raid, la défense, les dégâts, l'objectif de rallumage (un nombre fixe de viewers ou de Bits) et chaque effet payant. Le chemin gratuit (`!rallumer`, `!defendre`, `!reparer`) suffit toujours. Le seul tirage du jeu départage une égalité de **votes gratuits**.

## Équilibrage : une partie complète dure au moins 3 h 20

`node server/simulate.js` lance une simulation accélérée sans dépendance (jusqu'à 10 h de jeu en quelques secondes). La fin de partie = **Cité + Merveille**. Hypothèses :
- chaque viewer actif envoie une commande toutes les 30 s en moyenne, 70 % prennent un métier (dont des gardes) ;
- un vote automatique toutes les 3 min ; avant un raid, une partie du chat tape `!defendre` et vote *murs* ; `!reparer` quand le Foyer descend sous 70 PV ;
- Bits modérés : 100 Bits toutes les 10 min, 500 Bits par heure, 1 sub toutes les 15 min, 5 subs offerts toutes les 2 h ;
- Bits massifs : 500 Bits toutes les 2 min, 1 500 Bits toutes les 10 min, 5 000 Bits par heure, 1 sub toutes les 5 min, 10 subs offerts toutes les 30 min ;
- Foyer négligé : personne ne défend ni ne répare (le Foyer tombe à 0 et doit être rallumé, voire la partie est perdue).

| Scénario | 1er bâtiment | Hameau | Village | Bourg | Ville | Cité | Merveille | Fin | Raids repoussés | PV min | Rallumages |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 viewers | 4 min | 10 min | 19 min | 34 min | 1 h 19 | 4 h 40 | 4 h 07 | 4 h 40 | 0/9 | 58 | 0 |
| 20 viewers (typique) | 4 min | 10 min | 19 min | 31 min | 1 h 13 | 4 h 31 | 3 h 34 | 4 h 31 | 0/9 | 76 | 0 |
| 50 viewers | 4 min | 10 min | 19 min | 31 min | 1 h 13 | 4 h 13 | 3 h 46 | 4 h 13 | 3/8 | 90 | 0 |
| 200 viewers | 4 min | 10 min | 19 min | 31 min | 1 h 07 | 4 h 07 | 3 h 34 | 4 h 07 | 0/8 | 90 | 0 |
| 20 viewers, sans Bits | 4 min | 10 min | 19 min | 34 min | 1 h 22 | 5 h 10 | 4 h 40 | 5 h 10 | 2/10 | 82 | 0 |
| 20 viewers, Bits massifs | 4 min | 10 min | 19 min | 31 min | 1 h 04 | 3 h 34 | 3 h 04 | 3 h 34 | 7/7 | 100 | 0 |
| 20 viewers, Foyer négligé | 4 min | 10 min | 19 min | 31 min | 1 h 10 | 4 h 13 | 3 h 19 | 4 h 13 | 0/8 | 0 | 2 |

`npm test` vérifie, sur plusieurs seeds, que **la partie complète dure au moins 3 h 20 dans tous les scénarios (y compris Bits massifs)** et au plus 6 h 30, que le premier bâtiment arrive en moins de 6 min, que la durée varie de moins de 30 % entre 5 et 200 viewers, et que négliger le Foyer a des conséquences réelles.

## Bits et subs : effets de session uniquement

Tous les effets sont **déterministes, limités à la session en cours et plafonnés** :

| Bits | Effet (affiché sur les boutons de la démo et dans « Comment participer ») |
|---|---|
| tout cheer | +1 bois pour 10 Bits, **plafonné à 30 ressources par tranche de 10 min** (subs inclus) ; un message indique quand le plafond est atteint |
| **300** | **Remparts** : +15 défense du Foyer pendant 10 min (20 min restantes au maximum) |
| **500** | **Phare de la session** : gains du chat ×1,5 pendant 10 min (3 fois par heure au maximum) |
| **1 500** | **Bénédiction** : production passive ×2 pendant 5 min (une fois par heure au maximum) |
| **5 000** (objectif communautaire, par paliers) | **orage magique** (ciel sombre, pluie, éclairs) 2 min + cadeau au village (+60 bois, +30 pierre, +30 nourriture) ; pendant l'orage, `!bois` donne aussi 1 pierre |

- **Sub** = un villageois **nommé d'après l'abonné**, visible sur la carte (2 villageois offerts au maximum par 20 min et selon le logement), sinon de la nourriture.
- **Subs offerts** = **fête au village** (2 min) + 5 nourriture par sub (dans le plafond).
- **Rallumage du Foyer** : les Bits ne sont qu'une alternative à un objectif gratuit fixe (voir plus haut).
- **Classements** : **Bâtisseurs** = 1 point par commande, vote, défense ou réparation (+2 pour un vote gagnant, +3 par défi réussi) ; **Mécènes** = 1 point pour 25 Bits, 20 points par sub. Remis à zéro à chaque stream, titre « Fondateur de la session » pour le premier Bâtisseur.

Aucun effet payant n'est aléatoire. Les viewers gratuits peuvent tout construire et défendre la colonie sans Bits.

## Règles de conception (politique Twitch)

1. Les Bits et subs déclenchent **uniquement des effets temporaires** de la session de stream en cours, des votes et le classement de la session.
2. **Classement par session** : pseudo public Twitch seulement, opt-out avec `!optout`, remise à zéro à chaque stream, titres honorifiques (« Fondateur de la session »).
3. **Aucun hasard payant** : pas de loterie, de loot box ni de gain aléatoire contre des Bits. Rien de nuisible.
4. Un futur jeu complet sur un site web pourra avoir ses **propres paiements directs** et une vraie progression gratuite, mais **les Bits ne seront jamais convertis** en crédits, objets ou avantages sur ce site, ni maintenant ni plus tard.

## Configurer Twitch

Tous les secrets vont dans **\`.env\`**. Ce fichier est ignoré par git et ne doit jamais être commité ni montré à l'écran pendant un stream. \`.env.example\` documente chaque variable. Sans \`.env\`, ou avec \`MODE=sim\`, le jeu tourne en simulateur, sans aucune valeur Twitch.

### 1. Créer l'application Twitch
1. Activez la double authentification sur votre compte Twitch (c'est obligatoire pour la console développeur).
2. Allez sur https://dev.twitch.tv/console/apps, puis cliquez sur **Register Your Application**.
3. **Nom** : par ex. \`twitch-colony-nicolas\`. **OAuth Redirect URLs** : \`http://localhost:3000\`. **Catégorie** : *Chat Bot*. **Type de client** : *Confidentiel*.
4. Validez, puis ouvrez **Manage**. Copiez le **Client ID** dans \`TWITCH_CLIENT_ID\`. Cliquez sur **New Secret** et copiez la valeur dans \`TWITCH_CLIENT_SECRET\`.

### 2. Obtenir le jeton (avec le compte qui servira de bot)
1. Connecté avec ce compte, ouvrez cette URL dans le navigateur (remplacez \`VOTRE_CLIENT_ID\`) :
   \`\`\`
   https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=VOTRE_CLIENT_ID&redirect_uri=http://localhost:3000&scope=chat:read+chat:edit+bits:read+channel:read:subscriptions
   \`\`\`
2. Acceptez. Le navigateur est redirigé vers \`http://localhost:3000/?code=XXXX&scope=…\`. Copiez la valeur de \`code\`, qui n'est valable que quelques minutes.
3. Échangez ce code contre les jetons :
   \`\`\`bash
   curl -X POST https://id.twitch.tv/oauth2/token \\
     -d client_id=VOTRE_CLIENT_ID -d client_secret=VOTRE_SECRET \\
     -d code=XXXX -d grant_type=authorization_code -d redirect_uri=http://localhost:3000
   \`\`\`
4. Mettez \`access_token\` dans \`TWITCH_OAUTH_TOKEN\` (le préfixe \`oauth:\` est facultatif) et \`refresh_token\` dans \`TWITCH_REFRESH_TOKEN\`.

Scopes requis : \`chat:read\` (lire le chat), \`chat:edit\` (répondre, à venir), \`bits:read\` (Bits), \`channel:read:subscriptions\` (subs). ⚠ Les scopes \`bits:read\` et \`channel:read:subscriptions\` doivent être autorisés par le compte **de la chaîne** : le plus simple est d'utiliser le compte de votre chaîne comme bot.

### 3. Remplir \`.env\`
\`\`\`
MODE=twitch
TWITCH_CHANNEL=nom_de_votre_chaine
TWITCH_BOT_USERNAME=nom_du_compte_bot
TWITCH_OAUTH_TOKEN=…
TWITCH_CLIENT_ID=…
TWITCH_CLIENT_SECRET=…
TWITCH_REFRESH_TOKEN=…
\`\`\`
Ensuite, lancez \`npm start\`. Au démarrage :
- la configuration est vérifiée, avec des messages d'erreur clairs en français si une valeur manque ou est mal formée ;
- le jeton est validé auprès de Twitch, avec un avertissement si des scopes manquent ;
- si le jeton a expiré et que \`TWITCH_REFRESH_TOKEN\`, \`TWITCH_CLIENT_ID\` et \`TWITCH_CLIENT_SECRET\` sont fournis, il est renouvelé automatiquement (en mémoire uniquement, le fichier \`.env\` n'est pas modifié) ;
- les secrets ne sont jamais affichés en clair dans les logs (ils sont masqués).

\`server/twitch.js\` lit le chat IRC de Twitch (TLS natif, sans dépendance), les Bits (tag \`bits\`) et les subs (\`USERNOTICE\`). En mode twitch, le simulateur est désactivé. **À faire** : passer à EventSub (\`channel.cheer\`, \`channel.subscribe\`) avec \`TWITCH_EVENTSUB_SECRET\`.

## Structure

```
server/game.js      logique de la colonie (état de session)
server/twitch.js    adaptateur chat Twitch
server/config.js    chargement .env, validation, masquage
server/auth.js      validation/renouvellement du jeton
server/index.js     serveur HTTP + SSE + API du simulateur
public/             overlay, simulateur, page de confidentialité
```
