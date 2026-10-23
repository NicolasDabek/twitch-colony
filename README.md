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
| `!defendre` | va défendre le Grand Foyer (+3 défense par défenseur, +6 pour un garde, plafond 24 ; petite audience : bonus jusqu'à × 2 sous 8 viewers actifs) pour le prochain raid |
| `!reparer` | 10 bois + 5 pierre de la colonie → +5 PV au Foyer |
| `!rallumer` | quand le Foyer est détruit : chaque viewer différent compte pour le rallumage |
| `!aide` | rappelle les commandes dans le fil |
| `!optout` / `!optin` | ne pas / de nouveau apparaître aux classements |

**Présence** : un viewer actif 3 tranches de 10 min d'affilée gagne +25 % sur ses récoltes. Les viewers gratuits peuvent tout construire, tout défendre et rallumer le Foyer : les Bits accélèrent, ils ne sont jamais indispensables.

## Enjeux de la partie

- **Paliers** : Campement → Hameau (3 bâtiments) → Village (6) → Bourg (10) → Ville (15) → **Grande ville (18)** → Cité (21). Moins d'une heure entre deux paliers avec une audience typique. **Fin de la partie = Cité + Merveille**, avec une annonce de victoire et la durée.
- **Durée de partie** (`GAME_LENGTH` dans `.env`) : `courte` (≈ 3 h 30), `normale` (≈ 4 h 30, par défaut) ou `longue` (≈ 5 h 30). Toujours au moins 3 h, même avec beaucoup de Bits. Les réglages partagés serveur / démo sont dans `server/game-config.js`.
- **Coûts** : coût de base × 2,4 × 1,25 par exemplaire déjà construit × 1,10 par bâtiment déjà construit (partie normale). Les coûts ne dépendent pas du nombre de viewers.
- **Adaptation à l'audience** : on compte les viewers actifs A, lissés sur 10 min. Au-delà de 5, chaque commande rapporte (5/A)^0,92 de sa valeur de base. La progression totale n'augmente donc que d'environ 25 % entre 5 et 100 viewers, et chaque commande compte toujours (le gain s'affiche dans le fil, par ex. « +0,4 »).
- **Logement** : villageois max = 3 + 2 par hutte + 1 pour 3 autres bâtiments. Un sub sans place libre donne de la nourriture.
- **Votes** : le vote automatique ne propose que les bâtiments abordables ; à la Cité, il épargne pour la Merveille. `!construire` affiche ce qui manque. Un `!construire` reçu pendant un vote est mis **en file d'attente** (3 propositions max, sans doublon, affichées « À suivre » dans le panneau de vote) et ouvert juste après. En cas d'égalité, le vote est départagé au hasard et c'est annoncé (votes gratuits uniquement).

## Objectifs à trois niveaux

Un panneau **Objectifs** (trois lignes sans étiquette, court → moyen → long terme, chacune avec sa barre de progression colorée) est affiché dans l'overlay, la démo 2D et la vue 3D (version compacte sur mobile) :
- **Court terme : défis communautaires** toutes les 5 min (coupez du bois, taillez de la pierre, chassez, votez nombreux, survivez à la prochaine menace). Réussi : +25 ressources, +10 nourriture, +3 points pour chaque participant.
- **Moyen terme : projets** (loger les villageois, défenses du palier, Grenier, réserve pour l'hiver, Palissade, Marché, Atelier) et **bâtiments débloqués par palier** : Grenier (Hameau, l'hiver coûte moitié moins), Palissade (Village, +10 défense), Marché (Bourg, +1 bois et +1 pierre / 10 s), Atelier (Ville, `!bois` / `!pierre` +25 %), Forge (Grande ville, chaque `!defendre` compte double).
- **Long terme : Cité (21 bâtiments) + Merveille** en 3 phases : phase 1 à la Ville, phase 2 à la Grande ville, phase 3 à la Cité (chaque phase = alerte + badge ; à la Cité, une barre d'épargne montre la progression). **La partie est gagnée quand les deux sont achevés.** Des **badges de session** marquent les étapes (premières fondations, raid repoussé, hiver survécu, 3 défis, orage, fête, Merveille, paliers). **La phase finale se construit en 3 tranches** : aux jalons **33 % et 66 %**, le village reçoit +60 bois et +30 pierre, une fête de 2 min, et un raid « garde de la Merveille » (force +6) arrive 3 min plus tard.

L'interface montre aussi : le prochain bâtiment abordable et ce qui manque, la production par minute de chaque ressource, la menace suivante avec son compte à rebours et ce qu'il faut pour la passer, la contribution et le cooldown de chaque viewer, et deux classements séparés **Bâtisseurs** (actions gratuites) et **Mécènes** (Bits et subs). Dans la vue 3D, **toucher un bâtiment** affiche son nom, son effet et sa production ; les villageois offerts par un sub portent le pseudo de l'abonné.

## Le Grand Foyer : protéger le cœur du village

Le **Grand Foyer** occupe le centre de la carte (le Phare de la session s'y allume sous forme de faisceau). Il a **100 PV**, affichés dans le HUD et au-dessus du Foyer en 3D, et regagne 1 PV toutes les 2 min.
- **Raids** (toutes les 30 min, en alternance avec l'hiver) : des assaillants arrivent du bord de la carte et marchent vers le Foyer. **Force du raid = 22 + 6 × palier.** **Défense** = 10 par tour ou palissade + défenseurs `!defendre` (3 points chacun, garde ×2, Forge ×2, plafond 24 ; avec moins de 12 viewers actifs chaque défenseur compte un peu plus) + remparts (Bits) + stratégie votée. **Dégâts = force − défense** (calcul fixe, affiché à l'avance).
- **Raid repoussé** par la défense gratuite : **butin** de 40 bois et 20 pierre × (1 + palier). Si les remparts payés en Bits ont fait la différence, **butin partagé** : la moitié, au nom du donateur des remparts, comptée dans le plafond de ressources Bits (30 / 10 min).
- **Raid perdu** : **pillage** de dégâts × 3 × (1 + palier) en bois et en pierre, **au plus 30 % du stock** (on peut toujours progresser sans Bits), sauf si la stratégie *cacher les réserves* a été votée. Le résultat s'affiche 3 min dans le panneau de menace et est annoncé aux lecteurs d'écran.
- **Vote de stratégie** 2 min avant chaque raid : *renforcer les murs* (+10 défense) ou *cacher les réserves* (rien n'est volé, le Foyer encaisse).
- **Foyer détruit (0 PV)** : 3 min pour le rallumer, avec un **objectif fixe** : **N viewers différents tapent `!rallumer`** (au moins 3, ou 30 % des viewers actifs) **OU 1 000 Bits**. Le Foyer repart à 40 PV. **2 rallumages maximum par session**, avec une exigence croissante (2e : au moins 6 viewers ou 50 % des actifs, OU 2 500 Bits). Sinon : **fin de partie**, écran récapitulatif de la session (durée, palier, bâtiments, raids, défis, Bâtisseurs, badges), puis une **nouvelle session démarre automatiquement** 30 s plus tard.

**Pourquoi aucun hasard ?** Les règles de Twitch interdisent d'utiliser les Bits pour des jeux d'argent ou de hasard (loterie, tirage, loot box, chance de gagner contre des Bits). Ici, tout ce qui touche aux Bits est **déterministe et annoncé à l'avance** : la force d'un raid, la défense, les dégâts, l'objectif de rallumage (un nombre fixe de viewers ou de Bits) et chaque effet payant. Le chemin gratuit (`!rallumer`, `!defendre`, `!reparer`) suffit toujours. Le seul tirage du jeu départage une égalité de **votes gratuits**.

## Équilibrage : une partie complète dure au moins 3 h 20

`node server/simulate.js` lance une simulation accélérée sans dépendance (jusqu'à 10 h de jeu en quelques secondes). La fin de partie = **Cité + Merveille**. Hypothèses :
- chaque viewer actif envoie une commande toutes les 30 s en moyenne, 70 % prennent un métier (dont des gardes) ;
- un vote automatique toutes les 3 min ; avant un raid, la moitié du chat tape `!defendre` et vote *murs* (ou *réserves* si la défense ne suffira pas) ; `!reparer` quand le Foyer descend sous 70 PV ;
- Bits modérés : 100 Bits toutes les 10 min, 500 Bits par heure, 1 sub toutes les 15 min, 5 subs offerts toutes les 2 h ;
- Bits massifs : 500 Bits toutes les 2 min, 1 500 Bits toutes les 10 min, 5 000 Bits par heure, 1 sub toutes les 5 min, 10 subs offerts toutes les 30 min ;
- Foyer négligé : personne ne défend ni ne répare, la stratégie est votée au hasard (le Foyer tombe à 0 et doit être rallumé, voire la partie est perdue).

| Scénario | 1er bâtiment | Hameau | Village | Bourg | Ville | Grande ville | Cité | Merveille | Fin | Raids repoussés | PV min | Rallumages |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 viewers | 4 min | 10 min | 19 min | 40 min | 1 h 22 | 1 h 58 | 2 h 52 | 4 h 58 | 4 h 58 | 4/11 | 84 | 0 |
| 20 viewers (typique) | 4 min | 10 min | 19 min | 40 min | 1 h 10 | 1 h 46 | 2 h 43 | 4 h 31 | 4 h 31 | 9/10 | 88 | 0 |
| 50 viewers | 4 min | 10 min | 22 min | 37 min | 1 h 10 | 1 h 46 | 2 h 37 | 4 h 34 | 4 h 34 | 9/10 | 88 | 0 |
| 200 viewers | 4 min | 10 min | 19 min | 37 min | 1 h 10 | 1 h 43 | 2 h 31 | 4 h 16 | 4 h 16 | 10/10 | 100 | 0 |
| 20 viewers, sans Bits | 4 min | 13 min | 25 min | 43 min | 1 h 25 | 2 h 07 | 3 h 10 | 4 h 49 | 4 h 49 | 9/10 | 84 | 0 |
| 20 viewers, Bits massifs | 4 min | 10 min | 19 min | 31 min | 1 h 04 | 1 h 34 | 2 h 16 | 3 h 49 | 3 h 49 | 8/8 | 100 | 0 |
| 20 viewers, Foyer négligé | 4 min | 10 min | 22 min | 40 min | 1 h 16 | 1 h 55 | 2 h 52 | 5 h 31 | 5 h 31 | 0/11 | 0 | 2 |
| 20 viewers (typique) — courte | 4 min | 10 min | 19 min | 37 min | 1 h 10 | 1 h 40 | 2 h 22 | 3 h 37 | 3 h 37 | 8/8 | 100 | 0 |
| 20 viewers, Bits massifs — courte | 4 min | 10 min | 19 min | 31 min | 58 min | 1 h 25 | 2 h 04 | 3 h 13 | 3 h 13 | 7/7 | 100 | 0 |
| 20 viewers (typique) — longue | 4 min | 10 min | 22 min | 40 min | 1 h 25 | 2 h 07 | 3 h 04 | 5 h 31 | 5 h 31 | 11/11 | 100 | 0 |
| 20 viewers, Bits massifs — longue | 4 min | 10 min | 22 min | 34 min | 1 h 13 | 1 h 49 | 2 h 37 | 4 h 25 | 4 h 25 | 10/10 | 100 | 0 |

`npm test` vérifie, sur plusieurs seeds, que **la partie complète dure au moins 3 h 20 dans tous les scénarios (y compris Bits massifs)** et au plus 6 h 30, que le premier bâtiment arrive en moins de 6 min, que la durée varie de moins de 30 % entre 5 et 200 viewers, que négliger le Foyer a des conséquences réelles (au moins 20 min de plus en moyenne), qu'au moins 5 raids sur 9 sont repoussés sans Bits à 20 viewers, qu'aucun palier ne prend plus d'une heure à 20 viewers, et que les durées `courte` et `longue` restent au-dessus de 3 h. Il vérifie aussi (passe GD 3) qu'il n'y a jamais plus de 45 min sans progression entre la Cité et la fin à 20 viewers, que courte < normale − 45 min < longue − 45 min, que le mode courte dure au moins 3 h même avec des Bits massifs, et que l'écart entre graines reste borné à 5 viewers sans Bits.

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

Tous les secrets vont dans **`.env`**. Ce fichier est ignoré par git et ne doit jamais être commité ni montré à l'écran pendant un stream. `.env.example` documente chaque variable. Sans `.env`, ou avec `MODE=sim`, le jeu tourne en simulateur, sans aucune valeur Twitch.

### 1. Créer l'application Twitch
1. Activez la double authentification sur votre compte Twitch (c'est obligatoire pour la console développeur).
2. Allez sur https://dev.twitch.tv/console/apps, puis cliquez sur **Register Your Application**.
3. **Nom** : par ex. `twitch-colony-nicolas`. **OAuth Redirect URLs** : `http://localhost:3000`. **Catégorie** : *Chat Bot*. **Type de client** : *Confidentiel*.
4. Validez, puis ouvrez **Manage**. Copiez le **Client ID** dans `TWITCH_CLIENT_ID`. Cliquez sur **New Secret** et copiez la valeur dans `TWITCH_CLIENT_SECRET`.

### 2. Obtenir le jeton (avec le compte qui servira de bot)
1. Connecté avec ce compte, ouvrez cette URL dans le navigateur (remplacez `VOTRE_CLIENT_ID`) :
   ```
   https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=VOTRE_CLIENT_ID&redirect_uri=http://localhost:3000&scope=chat:read+chat:edit+bits:read+channel:read:subscriptions
   ```
2. Acceptez. Le navigateur est redirigé vers `http://localhost:3000/?code=XXXX&scope=…`. Copiez la valeur de `code`, qui n'est valable que quelques minutes.
3. Échangez ce code contre les jetons :
   ```bash
   curl -X POST https://id.twitch.tv/oauth2/token \\
     -d client_id=VOTRE_CLIENT_ID -d client_secret=VOTRE_SECRET \\
     -d code=XXXX -d grant_type=authorization_code -d redirect_uri=http://localhost:3000
   ```
4. Mettez `access_token` dans `TWITCH_OAUTH_TOKEN` (le préfixe `oauth:` est facultatif) et `refresh_token` dans `TWITCH_REFRESH_TOKEN`.

Scopes requis : `chat:read` (lire le chat), `chat:edit` (répondre, à venir), `bits:read` (Bits), `channel:read:subscriptions` (subs). ⚠ Les scopes `bits:read` et `channel:read:subscriptions` doivent être autorisés par le compte **de la chaîne** : le plus simple est d'utiliser le compte de votre chaîne comme bot.

### 3. Remplir `.env`
```
MODE=twitch
TWITCH_CHANNEL=nom_de_votre_chaine
TWITCH_BOT_USERNAME=nom_du_compte_bot
TWITCH_OAUTH_TOKEN=…
TWITCH_CLIENT_ID=…
TWITCH_CLIENT_SECRET=…
TWITCH_REFRESH_TOKEN=…
```
Facultatif : `HOST` (adresse d'écoute, `127.0.0.1` par défaut, donc accessible uniquement depuis cette machine, ce qui suffit pour OBS). Mettez `HOST=0.0.0.0` seulement pour un accès depuis le réseau local (par exemple tester sur un téléphone en Wi-Fi).

Réglages de partie facultatifs (validés au démarrage) : `GAME_LENGTH=courte|normale|longue`, `BITS_TIERS=300,500,1500` (seuils remparts, Phare, Bénédiction : 3 entiers croissants ; effets et plafonds inchangés) et `GOAL_STEP=5000` (taille de chaque palier de l'objectif « Orage magique »).

Ensuite, lancez `npm start`. Au démarrage :
- la configuration est vérifiée, avec des messages d'erreur clairs en français si une valeur manque ou est mal formée ;
- le jeton est validé auprès de Twitch, avec un avertissement si des scopes manquent ;
- si le jeton a expiré et que `TWITCH_REFRESH_TOKEN`, `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` sont fournis, il est renouvelé automatiquement (en mémoire uniquement, le fichier `.env` n'est pas modifié) ;
- les secrets ne sont jamais affichés en clair dans les logs (ils sont masqués).

`server/twitch.js` lit le chat IRC de Twitch (TLS natif, sans dépendance), les Bits (tag `bits`) et les subs (`USERNOTICE`). En mode twitch, le simulateur est désactivé. **À faire** : passer à EventSub (`channel.cheer`, `channel.subscribe`) avec `TWITCH_EVENTSUB_SECRET`.

## Structure

```
server/game.js      logique de la colonie (état de session)
server/twitch.js    adaptateur chat Twitch
server/config.js    chargement .env, validation, masquage
server/auth.js      validation/renouvellement du jeton
server/index.js     serveur HTTP + SSE + API du simulateur
public/             overlay, simulateur, page de confidentialité
```
