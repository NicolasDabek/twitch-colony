# Twitch Colony 🛖

Jeu de **colonie communautaire** affiché sur un stream Twitch : le chat récolte, vote et construit ensemble. Overlay HTML/JS à ajouter comme **source navigateur OBS**, servi par un petit serveur Node **sans aucune dépendance** (pas de CDN, pas de `npm install`).

> « Les Bits permettent à la communauté d'influencer la partie en direct. Ils ne donnent accès à aucun objet, compte, service ou avantage en dehors de ce stream. »

## ▶️ Jouer en ligne (simulation, sans OBS ni serveur)

**https://nicolasdabek.github.io/twitch-colony/**

C'est une version 100 % navigateur hébergée sur GitHub Pages (dossier `docs/`). Elle utilise la même logique de jeu (`server/game.js`) que le serveur. Après toute modification de `server/game.js` ou `public/overlay.js`, lancez `npm run build:pages` : `npm test` vérifie que `docs/` est à jour.

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
| `!construire <hutte\|ferme\|carriere\|tour>` | propose un vote de construction |
| `!vote <option>` | vote en cours (un vote auto toutes les 3 min) |
| `!optout` / `!optin` | ne pas / de nouveau apparaître au classement |

Les viewers gratuits peuvent faire progresser toute la colonie : les Bits accélèrent, ils ne sont jamais indispensables.

## Enjeux de la partie

- **Paliers** : Campement → Village (3 bâtiments) → Bourg (7) → Ville (12), avec une annonce à l'écran.
- **Menace toutes les 15 min**, en alternance :
  - ⚔️ **Raid** : sans assez de tours (une par niveau de palier), la colonie perd 30 % de son bois et de sa pierre.
  - ❄️ **Hiver** : consomme 3 nourriture par colon ; si la nourriture manque, des colons partent.
- **Famine** : à 0 nourriture, un colon part chaque minute.
- **Colons** : chaque colon récolte du bois (floor(pop/2) toutes les 10 s).
- **Coûts adaptés à l'audience** : coût de base × max(1, viewers actifs sur 5 min / 5) × 1,25 par exemplaire déjà construit.
- **Votes** : le vote automatique ne propose que les bâtiments abordables. `!construire` affiche ce qui manque. En cas d'égalité, le vote est départagé au hasard et c'est annoncé (votes gratuits uniquement).

## Bits et subs : effets de session uniquement

- **Bits** = +1 bois pour 10 Bits (arrondi), pour la colonie
- **500 Bits** = **Phare de la session** : gains du chat ×2 pendant 10 min. Un nouveau cheer de 500 Bits le prolonge de 10 min.
- **Objectif communautaire 5000 Bits** = **orage magique** : chaque `!bois` donne aussi 1 pierre pendant 2 min
- **Sub** = un nouveau colon + 10 nourriture
- **Classement** : 1 point par commande ou vote, 1 point pour 25 Bits, 20 points par sub

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
