# Audit GD13 — climax indexé sur l'audience active, « Brèche scellée », moment variable, petite audience

Reproduire : `node server/gd13-audit.js` (options `--json`, `--seeds=N`, `--workers=N`). 20 graines (1 à 20) × 3 modes × 4 audiences (5, 20, 50, 200 viewers) × 3 politiques (typique, préparé, passif au climax) = 720 parties par version. Le simulateur et ses politiques sont ceux de GD12 ; GD13 ajoute seulement les scénarios 5/50/200 viewers et le champ `sealed` du résultat.

« Avant » = `fc69ec4` (v1.0.0). La colonne « Brèche scellée » d'avant est hypothétique (brèche tenue **et** PV min ≥ 38), le palier n'existait pas.

Chaque cellule « a / b / c » = min / médiane / max sur les 20 graines. Écart = PV min préparé − PV min passif, graine par graine.

## Avant (v1.0.0, `fc69ec4`)

| Mode | Viewers | PV min typique | PV min préparé | PV min passif | Écart préparé − passif (par graine) | Brèche tenue typ / prép / passif | Brèche scellée typ / prép / passif | Climax → fin (min) | Plage (min) | Fins | Raids % | Chutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| courte | 5 | 30 / 33 / 36 | 37 / 42 / 45 | 6 / 10 / 17 | 27 / 32 / 33 | 20 / 20 / 0 (sur 20) | 0 / 19 / 0 | 27.0 / 28.5 / 33.0 | 6.0 | 3h09 / 3h18 / 3h24 | 77.8 / 80.0 / 81.8 | 0 |
| courte | 20 | 30 / 34 / 37 | 38 / 42 / 45 | 6 / 10 / 15 | 29 / 32 / 33 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 27.0 / 28.5 / 33.0 | 6.0 | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 81.8 | 0 |
| courte | 50 | 30 / 34 / 37 | 39 / 42 / 45 | 9 / 14 / 23 | 20 / 29 / 33 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 27.0 / 28.5 / 33.0 | 6.0 | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 81.8 | 0 |
| courte | 200 | 30 / 34 / 37 | 37 / 42 / 45 | 14 / 28 / 35 | 5 / 17 / 24 | 20 / 20 / 12 (sur 20) | 0 / 18 / 0 | 27.5 / 28.5 / 31.5 | 4.0 | 3h09 / 3h18 / 3h24 | 77.8 / 80.0 / 80.0 | 0 |
| normale | 5 | 23 / 32 / 35 | 31 / 41 / 44 | 5 / 8 / 11 | 23 / 33 / 33 | 19 / 20 / 0 (sur 20) | 0 / 17 / 0 | 15.0 / 21.0 / 30.0 | 15.0 | 3h27 / 3h45 / 4h00 | 80.0 / 80.0 / 83.3 | 0 |
| normale | 20 | 25 / 33 / 35 | 33 / 41 / 44 | 5 / 8 / 11 | 28 / 33 / 33 | 20 / 20 / 0 (sur 20) | 0 / 19 / 0 | 15.0 / 24.0 / 33.0 | 18.0 | 3h27 / 3h39 / 4h12 | 70.0 / 80.0 / 84.6 | 0 |
| normale | 50 | 29 / 33 / 36 | 38 / 41 / 44 | 5 / 9 / 16 | 25 / 33 / 33 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 18.0 / 24.0 / 36.0 | 18.0 | 3h24 / 3h36 / 4h06 | 70.0 / 80.0 / 83.3 | 0 |
| normale | 200 | 29 / 33 / 36 | 35 / 39 / 42 | 9 / 20 / 25 | 14 / 19 / 30 | 20 / 20 / 1 (sur 20) | 0 / 15 / 0 | 18.0 / 24.0 / 30.0 | 12.0 | 3h18 / 3h27 / 4h06 | 70.0 / 80.0 / 81.8 | 0 |
| longue | 5 | 29 / 33 / 35 | 35 / 41 / 44 | 5 / 9 / 16 | 23 / 32 / 33 | 20 / 20 / 0 (sur 20) | 0 / 17 / 0 | 27.5 / 28.5 / 30.5 | 3.0 | 5h15 / 5h27 / 5h33 | 82.4 / 83.3 / 85.0 | 0 |
| longue | 20 | 29 / 33 / 36 | 38 / 41 / 44 | 5 / 10 / 17 | 24 / 32 / 33 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 27.5 / 28.5 / 29.5 | 2.0 | 5h15 / 5h27 / 5h33 | 76.5 / 83.3 / 85.0 | 0 |
| longue | 50 | 29 / 33 / 35 | 38 / 41 / 44 | 9 / 14 / 24 | 17 / 27 / 33 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 27.5 / 28.5 / 29.5 | 2.0 | 5h15 / 5h27 / 5h33 | 77.8 / 83.3 / 84.2 | 0 |
| longue | 200 | 29 / 33 / 36 | 38 / 41 / 44 | 19 / 32 / 36 | 8 / 9 / 23 | 20 / 20 / 17 (sur 20) | 0 / 20 / 0 | 27.5 / 28.5 / 29.5 | 2.0 | 5h15 / 5h27 / 5h33 | 77.8 / 83.3 / 84.2 | 0 |

## Après (GD13)

| Mode | Viewers | PV min typique | PV min préparé | PV min passif | Écart préparé − passif (par graine) | Brèche tenue typ / prép / passif | Brèche scellée typ / prép / passif | Climax → fin (min) | Plage (min) | Fins | Raids % | Chutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| courte | 5 | 30 / 34 / 36 | 38 / 43 / 46 | 5 / 8 / 11 | 30 / 35 / 35 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 20.3 / 31.0 / 35.3 | 15.0 | 3h09 / 3h18 / 3h24 | 77.8 / 80.0 / 81.8 | 0 |
| courte | 20 | 30 / 34 / 36 | 39 / 43 / 46 | 5 / 8 / 11 | 34 / 35 / 35 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 20.3 / 28.6 / 33.7 | 13.4 | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 81.8 | 0 |
| courte | 50 | 30 / 34 / 36 | 40 / 43 / 46 | 5 / 8 / 11 | 34 / 35 / 35 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 20.3 / 28.6 / 36.1 | 15.9 | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 81.8 | 0 |
| courte | 200 | 30 / 34 / 36 | 40 / 43 / 46 | 5 / 8 / 11 | 34 / 35 / 36 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 20.3 / 28.8 / 36.0 | 15.7 | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 80.0 | 0 |
| normale | 5 | 28 / 32 / 35 | 37 / 42 / 45 | 5 / 8 / 11 | 29 / 34 / 34 | 20 / 20 / 0 (sur 20) | 0 / 19 / 0 | 18.8 / 30.7 / 39.7 | 20.9 | 3h36 / 3h51 / 4h16 | 80.0 / 81.8 / 84.6 | 0 |
| normale | 20 | 29 / 33 / 35 | 38 / 42 / 45 | 5 / 8 / 11 | 33 / 34 / 34 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 17.8 / 30.7 / 39.7 | 21.9 | 3h30 / 3h45 / 4h12 | 70.0 / 81.8 / 84.6 | 0 |
| normale | 50 | 29 / 32 / 35 | 39 / 42 / 45 | 5 / 8 / 11 | 34 / 34 / 34 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 18.0 / 30.7 / 39.7 | 21.7 | 3h26 / 3h47 / 4h11 | 70.0 / 81.8 / 84.6 | 0 |
| normale | 200 | 29 / 33 / 36 | 39 / 42 / 45 | 5 / 8 / 11 | 34 / 34 / 34 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 20.7 / 30.7 / 39.7 | 19.0 | 3h23 / 3h35 / 4h16 | 70.0 / 80.0 / 81.8 | 0 |
| longue | 5 | 29 / 33 / 35 | 38 / 42 / 45 | 5 / 9 / 11 | 29 / 34 / 34 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 19.6 / 30.8 / 37.7 | 18.1 | 5h15 / 5h27 / 5h36 | 82.4 / 83.3 / 85.0 | 0 |
| longue | 20 | 29 / 33 / 36 | 39 / 42 / 45 | 5 / 8 / 11 | 34 / 34 / 34 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 19.6 / 30.8 / 37.1 | 17.6 | 5h15 / 5h27 / 5h33 | 76.5 / 83.3 / 85.0 | 0 |
| longue | 50 | 29 / 33 / 35 | 39 / 42 / 45 | 5 / 8 / 11 | 34 / 34 / 34 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 19.6 / 30.8 / 37.1 | 17.6 | 5h15 / 5h27 / 5h33 | 77.8 / 83.3 / 84.2 | 0 |
| longue | 200 | 29 / 33 / 36 | 39 / 42 / 45 | 5 / 8 / 11 | 34 / 34 / 34 | 20 / 20 / 0 (sur 20) | 0 / 20 / 0 | 19.6 / 30.8 / 37.1 | 17.6 | 5h15 / 5h27 / 5h33 | 77.8 / 83.3 / 84.2 | 0 |

## Mécanismes

1. **Climax indexé sur l'audience active.** La force du climax = défense maximale gratuite de la colonie + bonus (54) + charge (préparation et tension, ±3 PV de graine) + **pénalité de mobilisation** : 20 × (1 − part des défenseurs distincts requis présents à `!defendre` pendant l'annonce et au plus tard 30 s avant l'impact). Un chat de 200 personnes qui reste passif ne profite plus de sa masse : sa défense de dernière seconde ne compte pas et la stratégie par défaut « murs » n'est appliquée au climax que si le chat s'est mobilisé. La pénalité ne s'applique pas sous 8 actifs.
2. **« Brèche scellée ».** Foyer ≥ 38 PV après l'impact : badge « Brèche scellée » et annonce (journal + `aria-live`). Récompense **purement cosmétique** : les ressources sont identiques à « Tenir la brèche » seul (≥ 25 PV, inchangé).
3. **Moment variable.** Avance du climax = 20 + 18 × u min avant l'accès complet, et en normale écart minimal climax → fin = 15 + 25 × u min, avec u tiré sur un canal de graine indépendant (`seed ^ 0x1ead5`), jamais relancé, sans lien avec les Bits/subs. Entre l'impact et l'accès complet, un jalon cosmétique « Veillée d'inauguration » toutes les 10 min (aucun creux > 20 min).
4. **Petite audience.** Sous 8 actifs, renforts requis = max(2, 25 % des actifs). Pendant l'annonce, `!reparer` enregistre toujours un renfort **gratuit** (même sans ressources) ; les PV restent payés 10 bois + 5 pierre.

## Objectifs (après)

| Point | Cible | Résultat |
|---|---|---|
| 1. Écart préparé − passif, 50 et 200 viewers | ≥ 25 | 34 (min, tous modes) — avant 5 à 25 en courte/longue 200, 14 en normale 200 |
| 1. Brèche passive 50/200 | ≤ 2/10 | 0/20 partout — avant 12/20 (courte 200), 17/20 (longue 200) |
| 1. Préparé 50/200 | 10/10, aucune Chute | 20/20, 0 Chute |
| 1. Écart à 20 viewers | ≥ 30 | 33 à 34 (avant 24 à 29) |
| 2. Brèche scellée préparé / typique / passif | ≥ 18 / ≤ 3 / 0 sur 20 | 19–20 / 0 / 0 |
| 3. Climax → fin | 15–45 min, plage ≥ 12 min par mode | courte 20,3–36,1 (plage 13,4–15,9), normale 17,8–39,7 (19,0–21,9), longue 19,6–37,7 (17,6–18,1) |
| 3. Fins | courte 3h08–3h25, longue 5h15–5h45, ≥ 3 h | courte 3h09–3h24, normale 3h23–4h16, longue 5h15–5h36 |
| 4. 5 viewers : préparé PV min | ≥ 36 | 38 / 37 / 38 (courte / normale / longue) |
| 4. 5 viewers : typique normale | ≥ 26, brèche 20/20 | 28, 20/20 (avant 23, 19/20) |
| 4. 5 viewers : passif | ≤ 15 | 11 |

## Écarts restants

- À 5 viewers, l'écart préparé − passif minimal est 29 en normale et en longue (30 en courte) : aucune borne n'est demandée à cette audience, et le passif y reste à 5–11 PV.
- Le taux minimal de raids repoussés en normale reste 70,0 % (graines difficiles, borne GD11 70–88 % ; inchangé par rapport à v1.0.0).
- La plage climax → fin de la courte (13,4 à 15,9 min) est la plus étroite des trois modes : la fin courte est bornée à 3h08–3h25.

## Invariants

Aucune défaite, aucune Chute (Chutes ≤ destructions) ; fins ≥ 3 h ; Bits jamais nécessaires et aucun hasard lié à un paiement (le tirage du moment et de l'écart ne dépend que de la graine) ; « villageois » ; CSP et accessibilité sans style ni script inline ; bornes GD11/GD12 et tests 1.0.0 inchangés.
