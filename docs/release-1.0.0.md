# Audit de release 1.0.0 (11 novembre 2026)

Base : `555da5d` (GD12). Correctifs : `2f8b3c3`. Node 24 (moteur requis : Node ≥ 18).

## Résultats

| Contrôle | Résultat |
|---|---|
| `npm test` (logique, GD4 → GD12, UX, 1.0.0, sécurité, serveur réel) | ✅ tout vert |
| `node server/gd11-audit.js` (5 graines × 21 cas) | ✅ raids repoussés 70,0–85,0 %, aucune défaite hors Foyer négligé, 0 chute en jeu attentif |
| `node server/gd12-audit.js` (10 graines × 27 cas) | ✅ voir tableau ci-dessous |
| `npm audit` | ✅ 0 vulnérabilité (aucune dépendance npm : modules Node intégrés uniquement) |
| Composants tiers | three.js r160 (MIT), local, en-tête de licence conservé ; voir `THIRD_PARTY_NOTICES.md` |
| Serveur réel (`MODE=sim`) | ✅ `/`, `/overlay.html`, `/sim.html`, `/3d/`, `/confidentialite.html`, `/api/state`, `/healthz` en 200 avec CSP + `nosniff` ; 404/403/405/400/413/429 attendus ; traversée refusée |
| Navigateur (Chrome headless, profil vierge) | ✅ overlay, simulateur et 3D sans erreur console ni violation CSP |
| `.env.example` | ✅ complet (toutes les variables lues par `server/config.js`), durées corrigées |
| Secrets dans les journaux | ✅ masqués (`summary()`), jeton jamais écrit (test), pas de pseudo ni message dans les journaux |
| Twitch IRC | ✅ reconnexion exponentielle 5 s → 2 min vérifiée contre le réseau réel (port 6697 injoignable depuis la machine d'audit), `RECONNECT`, chien de garde, Bits, subs, subs offerts groupés testés sur lignes IRC réelles ; ⚠ pas de test sur un vrai live (aucun jeton dans `.env`) |
| Entrées | ✅ chat : pseudo ≤ 40, message ≤ 500, cooldown 5 s par commande ; `/api/sim` validé, 30 req/s, même origine |
| Mémoire, session de 6 h simulée | ✅ 300 viewers, 2 messages/s : tas 5,0 → 5,7 Mo (stable) ; avant correctif, une clé par mot du chat |
| Persistance | non prévue : état en mémoire, redémarrage = nouvelle partie (documenté) |
| Textes FR | ✅ « villageois », quantités manquantes entières, aucun TODO/FIXME restant |
| Confidentialité | ✅ page mise à jour ; `!optout` retire désormais aussi des Mécènes et des villageois nommés |
| Règles Bits | ✅ jamais nécessaires, session seulement, sans hasard, plafonnés (y compris un Bits géant), aucune conversion |

## Écart GD12 corrigé

5 viewers en partie longue : sur 10 graines, 70,6 / 82,4 / 84,2 % → **82,4 / 83,3 / 85,0 %** (min / méd / max) de raids repoussés. Cause : à 5 viewers, il arrivait que personne ne vote la stratégie, ce qui retirait les +10 de « murs ». Correctif : en longue, comme en courte, un vote de stratégie à moins de 3 votants donne « murs » par défaut. Aucun autre mode ni scénario ne change.

## Invariants (10 graines)

- Fin jamais avant 3 h ; courte 3 h 09–3 h 24 ; longue 5 h 15–5 h 33.
- Raids repoussés 70,0–85,0 % ; 5 viewers 77,8–85,0 % dans les 3 modes.
- Chutes ≤ destructions ; Foyer négligé perdu 10/10 dans les 3 modes.
- Climax → fin 15–33 min ; préparé 38/41/43, typique 29/32/34, passif 5/8/10 PV min (normale).
- « Tenir la brèche » 10/10 en jeu attentif, 0/10 en passif.
