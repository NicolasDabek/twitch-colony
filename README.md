# Twitch Colony 🛖

Jeu de **colonie communautaire** affiché sur un stream Twitch : le chat récolte, vote et construit ensemble. Overlay HTML/JS à ajouter comme **source navigateur OBS**, servi par un petit serveur Node **sans aucune dépendance** (pas de CDN, pas de `npm install`).

> « Les Bits permettent à la communauté d'influencer la partie en direct. Ils ne donnent accès à aucun objet, compte, service ou avantage en dehors de ce stream. »

## Lancer

```bash
node server/index.js      # ou npm start (Node 18+)
npm test                  # tests de la logique de jeu
```

- Overlay (OBS, 1280×720) : http://localhost:3000/overlay.html
- Simulateur (boutons + clavier, sans Twitch) : http://localhost:3000/sim.html
- Confidentialité : http://localhost:3000/confidentialite.html

Raccourcis du simulateur : **B** !bois · **P** !pierre · **C** !chasse · **V** lancer un vote · **1** 100 Bits · **5** 500 Bits · **S** sub.

## Commandes du chat (gratuites)

| Commande | Effet |
|---|---|
| `!bois` / `!pierre` / `!chasse` | +2 bois / +1 pierre / +2 nourriture (cooldown 5 s) |
| `!construire <hutte\|ferme\|carriere\|tour>` | propose un vote de construction |
| `!vote <option>` | vote en cours (un vote auto toutes les 3 min) |
| `!optout` / `!optin` | ne pas / de nouveau apparaître au classement |

Les viewers gratuits peuvent faire progresser toute la colonie : les Bits accélèrent, ils ne sont jamais indispensables.

## Bits et subs : effets de session uniquement

- **100 Bits** = +10 bois pour la colonie
- **500 Bits** = « Phare de la session », bâtiment spécial pendant 10 min
- **Objectif communautaire 5000 Bits** = événement météo « orage magique »
- **Sub** = un nouveau colon + 10 nourriture

## Règles de conception (politique Twitch)

1. Les Bits et subs déclenchent **uniquement des effets temporaires** de la session de stream en cours, des votes et le classement de la session.
2. **Classement par session** : pseudo public Twitch seulement, opt-out avec `!optout`, remise à zéro à chaque stream, titres honorifiques (« Fondateur de la session »).
3. **Aucun hasard payant** : pas de loterie, de loot box ni de gain aléatoire contre des Bits. Rien de nuisible.
4. Un futur jeu complet sur un site web pourra avoir ses **propres paiements directs** et une vraie progression gratuite, mais **les Bits ne seront jamais convertis** en crédits, objets ou avantages sur ce site, ni maintenant ni plus tard.

## Brancher Twitch

Copier `.env.example` en `.env`, puis :

```
MODE=twitch
TWITCH_CHANNEL=ma_chaine
TWITCH_BOT_USERNAME=mon_bot
TWITCH_OAUTH_TOKEN=oauth:xxxx
```

`server/twitch.js` se connecte au chat IRC de Twitch (TLS natif, sans tmi.js) et lit les Bits (tag `bits`) et les subs (`USERNOTICE`). Le simulateur est désactivé en mode twitch. **À faire** : passer à EventSub (`channel.cheer`, `channel.subscribe`), qui est plus fiable. Le point d'entrée est indiqué dans le fichier.

## Structure

```
server/game.js      logique de la colonie (état de session)
server/twitch.js    adaptateur Twitch
server/index.js     serveur HTTP + SSE + API du simulateur
public/             overlay, simulateur, page de confidentialité
```
