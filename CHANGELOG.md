# Journal des versions

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Versions selon [SemVer](https://semver.org/lang/fr/).

## [1.0.0] — 2026-11-11

Première version stable : jeu complet pour un stream de 3 h à 5 h 30, overlay OBS, simulateur et démo en ligne.

### Corrigé (audit de release, `2f8b3c3`)
- **Bits** : un Bits géant (ex. 1 000 000 000) franchissait des milliers de paliers d'objectif et donnait autant de cadeaux (+12 millions de bois). Désormais : un seul orage (6 min maximum) et un seul cadeau par Bits, au plus 6 cadeaux par heure ; les paliers restent comptés.
- **Opt-out** : `!optout` retirait seulement du classement interne ; le pseudo restait chez les Bâtisseurs, les Mécènes et les villageois nommés. Il est maintenant retiré partout, et n'est plus crédité ni nommé tant que `!optin` n'est pas tapé.
- **Mémoire** : chaque mot du chat créait une clé de cooldown (fuite sur une longue session). Les cooldowns sont bornés aux commandes connues et purgés toutes les 10 min ; mémoire stable sur 6 h simulées (5,0 → 5,7 Mo avec 300 viewers).
- **Entrées** : pseudo ≤ 40 caractères, message ≤ 500 ; `/api/sim` valide chaque évènement (Bits 1–100 000, subs offerts 1–50, bâtiment `a-z`), limite à 30 requêtes/s, refuse les autres origines (403), les autres méthodes (405) et le JSON invalide (400).
- **Serveur** : en-têtes CSP + `nosniff` + `Referrer-Policy` sur toutes les réponses (404, API, SSE compris), `/healthz` (version et mode), 50 flux SSE au maximum, message clair si le port est occupé, arrêt propre (Ctrl+C), une erreur de la boucle de jeu est journalisée sans couper le stream.
- **Twitch IRC** : commande `RECONNECT` gérée, chien de garde (6 min sans données ⇒ reconnexion), tags IRC décodés (`display-name` avec espaces), subs offerts groupés comptés une seule fois (avant : `submysterygift` + chaque `subgift`), Bits invalides ignorés, renouvellement du jeton si Twitch le refuse en cours de stream.
- **Équilibrage** : en partie longue, vote de stratégie à moins de 3 votants ⇒ « murs » par défaut (comme en courte). 5 viewers, graine 7 : 70,6 % → 83,3 % de raids repoussés ; 5 viewers longue sur 10 graines : 82,4–85,0 %.

### Passes précédentes
| Passe | Commit | Résumé |
|---|---|---|
| Prototype | `39461cb` | colonie communautaire, overlay OBS, simulateur, adaptateur chat |
| Configuration | `922f3cb` | `.env` sans dépendance, validation en français, renouvellement du jeton, secrets masqués |
| Démo Pages | `b7c0add`, `671cfcf` | logique partagée navigateur/Node, publication par GitHub Actions |
| Game design 1 | `a4fe00b`, `c256cf0`, `b4e8a1b` | effets réels, raids/hiver/famine, rôles, défis, Merveille, Grand Foyer |
| UI / 3D | `a935aac`, `dc74537`, `8abda9b` | overlay lisible, village 3D isométrique (three.js local), votes cliquables, « villageois » |
| Sécurité | `318795c` | écoute 127.0.0.1, corps ≤ 10 Ko, chemins stricts, CSP sans script inline |
| UX 2 → 5 | `5f04c0f`, `7e09114`, `63d141d`, `8dbb83b` | textes ≥ 12 px, cibles 44 px, aria-live, contrastes, dialogue accessible, mouvement réduit |
| GD 2 → 5 | `801d2ee`, `9013df7`, `60aa88c`, `56a94fc` | défense gratuite viable, jalons de Merveille, raids indexés sur la défense gratuite |
| GD6 / GD7 | `c5a0b74`, `bb0a603` | règle des 3 h (Chute avant 3 h, défaite seulement après), raid de climax, Éclat cosmétique |
| UX6 → UX9 | `e7f663a`, `441e342`, `a870e2d`, `eb6f2b5` | overlay mobile, HUD 3D repliable, aperçu 1280 |
| GD8 / GD9 | `93805e9`, `3b060bc`, `d58ffc8` | jalons nommés, rallumage communautaire avant la Chute, petite audience |
| GD10 / UX10 | `e679887`, `e9cae0e` | variance du climax, Bits massifs, un seul titre accessible |
| GD11 | `c447bdb` | variance indépendante des raids, Foyer critique réel, finales rythmées |
| UX11 | `50b39d9` | quantités entières, `:hover` sous `@media (hover:hover)` |
| GD12 | `555da5d` | climax préparable (`!reparer`) et lisible, défi « Tenir la brèche », climax → fin 15–45 min |
