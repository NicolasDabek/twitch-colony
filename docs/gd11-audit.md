# Audit GD11 — cinq graines, avant / après

Base immuable : `e6798870d8acf226c5fccbe8f95a4a6d33108d1f`. UX10 séparée : `e9cae0e`.
Graines **1, 2, 3, 4, 5** ; sept scénarios × trois modes = **105 parties** par version.
La politique de commandes, votes et dons de `simulate.js` n'a pas changé ; seuls des compteurs / historiques ont été ajoutés.

## Corrections

- Raids ordinaires : bruit environnemental stable **0,9–1,1**, graine + numéro du raid, sans consommer le RNG des votes ni reroll lors d'un paiement. Marge nominale gratuite **4,5** avant bruit ; une perte de quelques PV reste réparable gratuitement. Les gardes sont réellement plafonnés à la défense gratuite max, y compris quand la force de base dépassait ce maximum.
- Assaut de mi-parcours ouvert aux petites audiences ; normale : menace toutes les **12 min**. Les annonces d'assauts/climax ne s'écrasent plus. Longue : dernier assaut gratuit à 4 h.
- **Vrai danger** : seuil vacillant **abaissé de 65 à 40 PV**, climax renforcé (bonus 58 + 0–18 d'état/graine), pas seuil remonté pour compter davantage. Dix épisodes typiques normale/courte restent à 26–35 PV sans Chute ; les actions gratuites les remontent.
- Longue : Merveille ×**1,0**, paliers 8/16/24/32/40/50/56/64/72/80/90 %, puis consolidation par sixièmes sur **120 min**. Ces jalons correspondent à des dépôts réels ; pas d'événements fictifs dans le simulateur.
- Calendrier de consolidation fixé au reset par un canal de graine indépendant : accès final à **3 h 08–3 h 21** (courte/normale), **5 h 15–5 h 32** (longue), puis le chat termine les dépôts/votes. Le paiement ne raccourcit ni ne prolonge ce calendrier.
- Une Merveille prête convertit intégralement les nouveaux Bits/subs en **Éclat cosmétique** : pas de ressources, remparts, météo, Phare, Bénédiction ni changement de durée en surplus.

## Méthode et limites

Les tableaux donnent min/médiane/max, sans arrondir les bornes dans les assertions. Les fins sont en h/min/s. Deux creux sont conservés : progression (paliers, dépôts-jalons, ouverture, annonces d'assaut/climax, cérémonie prête) et tension (ajoute les raids exécutés et défis réussis). Les deux restent ≤25 min en longue ; on ne substitue pas la métrique plus favorable à l'ancienne. Les dégâts ordinaires peuvent dépasser la défense courante de quelques PV : perdre un raid n'exige jamais de payer pour continuer.

Le critère vacillant n'est pas un nombre de rallumages après destruction : c'est un danger avant destruction, relevé à ≤40 PV. Un test contrôlé vérifie qu'à 30 PV un raid non défendu détruirait le Foyer, alors que `!reparer` + `!defendre` + murs le sauvent sans Bits. Les réparations critiques mesurées ci-dessous sont de vrais gains de PV.

Tous les objectifs GD11 sont atteints sur la matrice testée ; cela n'est pas une garantie statistique pour toute graine, toute audience ou un chat sans commandes. Le Foyer négligé perd 5/5 dans chaque mode, seulement après 3 h.

## Avant — GD10

| Scénario | Mode | Fin min/méd/max | Raids % min/méd/max | PV min min/méd/max | Vacillant min/méd/max | Creux progression min/méd/max (min) | Creux tension min/méd/max (min) | Défaites | Chutes |
|---|---|---|---|---|---|---|---|---|---|
| 5 viewers | courte | 3h00:31/3h06:31/3h09:31 | 88.9/88.9/88.9 | 58/61/69 | 0/1/1 | 15.0/18.0/18.0 | 10.3/15.0/15.0 | 0/5 | 0 |
| 20 viewers (typique) | courte | 3h06:31/3h12:31/3h21:31 | 77.8/77.8/77.8 | 56/61/67 | 0/1/1 | 15.0/18.0/18.0 | 9.2/9.7/18.0 | 0/5 | 0 |
| 50 viewers | courte | 3h06:31/3h09:31/3h15:31 | 77.8/77.8/77.8 | 57/60/68 | 0/1/1 | 15.0/15.0/18.0 | 7.8/9.0/12.5 | 0/5 | 0 |
| 200 viewers | courte | 3h00:31/3h03:31/3h12:31 | 77.8/77.8/80.0 | 58/62/68 | 0/1/1 | 15.0/18.0/18.3 | 8.8/11.8/15.1 | 0/5 | 0 |
| 20 viewers, sans Bits | courte | 3h15:31/3h18:31/3h30:31 | 80.0/80.0/80.0 | 56/61/67 | 0/1/1 | 18.0/18.0/18.0 | 9.8/10.6/18.0 | 0/5 | 0 |
| 20 viewers, Bits massifs | courte | 3h15:31/3h15:31/3h15:31 | 77.8/80.0/88.9 | 59/63/70 | 0/1/1 | 21.0/24.0/24.5 | 10.7/11.6/18.5 | 0/5 | 0 |
| 20 viewers, Foyer négligé | courte | — | 0.0/0.0/0.0 | 0/0/0 | 1/1/1 | 15.0/21.0/21.0 | 7.9/11.9/12.0 | 5/5 | 9 |
| 5 viewers | normale | 3h27:31/3h39:31/3h57:31 | 88.9/88.9/90.0 | 57/60/66 | 0/1/1 | 12.0/15.0/21.0 | 10.9/12.0/12.0 | 0/5 | 0 |
| 20 viewers (typique) | normale | 3h36:31/3h45:31/3h54:31 | 77.8/77.8/77.8 | 57/60/67 | 0/1/1 | 12.0/15.0/18.0 | 7.1/9.8/13.2 | 0/5 | 0 |
| 50 viewers | normale | 3h33:31/3h36:31/4h06:31 | 77.8/77.8/77.8 | 57/60/67 | 0/1/1 | 9.0/15.0/21.0 | 5.9/10.0/11.4 | 0/5 | 0 |
| 200 viewers | normale | 3h24:31/3h33:31/3h39:31 | 75.0/77.8/77.8 | 57/60/67 | 0/1/1 | 12.0/12.0/15.0 | 7.0/9.0/10.8 | 0/5 | 0 |
| 20 viewers, sans Bits | normale | 4h00:31/4h03:31/4h30:31 | 77.8/80.0/80.0 | 57/60/67 | 0/1/1 | 12.0/12.0/18.0 | 9.8/12.0/12.0 | 0/5 | 0 |
| 20 viewers, Bits massifs | normale | 3h00:31/3h12:31/3h15:31 | 75.0/75.0/75.0 | 58/61/68 | 0/1/1 | 9.0/12.0/22.5 | 8.3/9.0/16.5 | 0/5 | 0 |
| 20 viewers, Foyer négligé | normale | — | 0.0/0.0/0.0 | 0/0/0 | 1/1/1 | 15.0/18.0/21.0 | 8.7/10.4/11.8 | 5/5 | 0 |
| 5 viewers | longue | 5h36:31/5h42:31/6h03:31 | 84.6/92.3/92.9 | 57/60/66 | 0/1/1 | 27.0/27.0/30.0 | 15.0/20.5/24.0 | 0/5 | 0 |
| 20 viewers (typique) | longue | 5h18:31/5h48:31/6h00:31 | 84.6/84.6/84.6 | 57/60/67 | 0/1/1 | 21.0/27.0/30.0 | 10.7/14.9/17.4 | 0/5 | 0 |
| 50 viewers | longue | 5h54:31/6h00:31/6h06:31 | 84.6/84.6/84.6 | 57/60/67 | 0/1/1 | 27.0/30.0/30.0 | 10.6/11.1/19.8 | 0/5 | 0 |
| 200 viewers | longue | 5h36:31/5h48:31/5h51:31 | 84.6/84.6/84.6 | 57/60/67 | 0/1/1 | 27.0/27.0/30.0 | 11.1/14.0/14.2 | 0/5 | 0 |
| 20 viewers, sans Bits | longue | 6h12:31/6h30:31/6h36:31 | 85.7/85.7/86.7 | 57/60/67 | 0/1/1 | 27.0/30.0/30.0 | 11.1/15.0/20.5 | 0/5 | 0 |
| 20 viewers, Bits massifs | longue | 4h48:31/5h03:31/5h12:31 | 83.3/83.3/83.3 | 57/60/67 | 0/1/1 | 24.0/24.0/24.0 | 10.5/14.1/17.1 | 0/5 | 0 |
| 20 viewers, Foyer négligé | longue | — | 0.0/0.0/0.0 | 0/0/0 | 1/1/1 | 33.0/33.0/33.0 | 13.4/19.6/24.8 | 5/5 | 0 |

## Après — GD11

| Scénario | Mode | Fin min/méd/max | Raids % min/méd/max | PV min min/méd/max | Vacillant min/méd/max | Creux progression min/méd/max (min) | Creux tension min/méd/max (min) | Défaites | Chutes |
|---|---|---|---|---|---|---|---|---|---|
| 5 viewers | courte | 3h12:31/3h18:31/3h21:31 | 77.8/80.0/80.0 | 27/29/36 | 1/1/1 | 15.0/18.0/18.0 | 8.7/13.5/15.0 | 0/5 | 0 |
| 20 viewers (typique) | courte | 3h12:31/3h21:31/3h24:31 | 77.8/77.8/80.0 | 26/30/35 | 1/1/1 | 15.0/18.0/18.0 | 9.2/12.0/18.0 | 0/5 | 0 |
| 50 viewers | courte | 3h12:31/3h18:31/3h21:31 | 77.8/80.0/80.0 | 27/29/35 | 1/1/1 | 16.0/18.0/18.0 | 8.6/9.2/12.5 | 0/5 | 0 |
| 200 viewers | courte | 3h12:31/3h18:31/3h21:31 | 80.0/80.0/80.0 | 27/30/35 | 1/1/1 | 15.0/15.8/25.2 | 9.3/12.0/15.1 | 0/5 | 0 |
| 20 viewers, sans Bits | courte | 3h15:31/3h21:31/3h33:31 | 80.0/80.0/80.0 | 26/29/34 | 1/1/1 | 18.0/18.0/18.0 | 9.8/12.6/18.0 | 0/5 | 0 |
| 20 viewers, Bits massifs | courte | 3h12:31/3h18:31/3h21:31 | 77.8/80.0/83.3 | 28/31/37 | 1/1/1 | 21.0/24.0/27.0 | 9.8/12.8/18.5 | 0/5 | 0 |
| 20 viewers, Foyer négligé | courte | — | 0.0/0.0/0.0 | 0/0/0 | 1/1/1 | 15.0/18.0/21.0 | 10.1/11.9/15.0 | 5/5 | 7 |
| 5 viewers | normale | 3h27:31/3h36:31/3h54:31 | 80.0/80.0/83.3 | 26/29/34 | 1/1/1 | 9.0/12.0/21.0 | 9.0/11.5/16.3 | 0/5 | 0 |
| 20 viewers (typique) | normale | 3h33:31/3h39:31/4h09:31 | 70.0/80.0/83.3 | 26/29/34 | 1/1/1 | 12.0/15.0/18.0 | 9.0/12.0/12.0 | 0/5 | 0 |
| 50 viewers | normale | 3h30:31/3h36:31/3h39:31 | 70.0/80.0/80.0 | 26/29/34 | 1/1/1 | 12.0/15.0/15.0 | 6.5/11.0/11.4 | 0/5 | 0 |
| 200 viewers | normale | 3h24:31/3h24:31/3h42:31 | 70.0/80.0/81.8 | 26/29/34 | 1/1/1 | 9.0/12.0/15.0 | 6.0/9.0/12.0 | 0/5 | 0 |
| 20 viewers, sans Bits | normale | 3h45:31/3h57:31/4h12:31 | 72.7/81.8/83.3 | 26/29/34 | 1/1/1 | 9.0/12.0/15.0 | 8.5/12.0/12.0 | 0/5 | 0 |
| 20 viewers, Bits massifs | normale | 3h12:31/3h18:31/3h21:31 | 70.0/77.8/80.0 | 27/30/36 | 1/1/1 | 12.0/21.0/27.0 | 6.8/12.0/12.1 | 0/5 | 0 |
| 20 viewers, Foyer négligé | normale | — | 0.0/0.0/0.0 | 0/0/0 | 1/1/1 | 18.0/18.0/21.0 | 10.5/15.0/15.4 | 5/5 | 0 |
| 5 viewers | longue | 5h21:31/5h30:31/5h33:31 | 77.8/82.4/85.0 | 20/28/34 | 1/1/1 | 21.0/21.0/21.0 | 12.0/12.5/18.5 | 0/5 | 0 |
| 20 viewers (typique) | longue | 5h21:31/5h30:31/5h33:31 | 77.8/84.2/85.0 | 17/29/35 | 1/1/1 | 21.0/21.0/21.0 | 8.5/11.5/12.0 | 0/5 | 0 |
| 50 viewers | longue | 5h21:31/5h30:31/5h33:31 | 78.9/84.2/85.0 | 27/28/34 | 1/1/1 | 21.0/21.0/21.0 | 11.5/12.0/14.1 | 0/5 | 0 |
| 200 viewers | longue | 5h21:31/5h30:31/5h33:31 | 78.9/84.2/85.0 | 24/29/33 | 1/1/1 | 21.0/21.0/21.0 | 9.1/10.6/12.0 | 0/5 | 0 |
| 20 viewers, sans Bits | longue | 5h21:31/5h30:31/5h33:31 | 80.0/80.0/84.2 | 27/29/35 | 1/1/1 | 18.0/18.0/21.0 | 8.5/10.6/15.0 | 0/5 | 0 |
| 20 viewers, Bits massifs | longue | 5h21:31/5h30:31/5h33:31 | 77.8/84.2/85.0 | 27/29/35 | 1/1/1 | 21.0/21.0/21.0 | 10.7/13.1/14.1 | 0/5 | 0 |
| 20 viewers, Foyer négligé | longue | — | 0.0/0.0/0.0 | 0/0/0 | 1/1/1 | 9.0/12.0/12.0 | 6.0/9.0/11.2 | 5/5 | 0 |

## Actions gratuites en danger réel (scénario typique)

| Mode | Graine | PV minimum | Réparations à ≤40 PV | PV réellement restaurés à ≤40 | PV à la fin | Chutes |
|---|---|---|---|---|---|---|
| courte | 1 | 30 | 3 | 15 | 74 | 0 |
| courte | 2 | 35 | 2 | 10 | 75 | 0 |
| courte | 3 | 26 | 3 | 15 | 77 | 0 |
| courte | 4 | 32 | 2 | 10 | 77 | 0 |
| courte | 5 | 28 | 3 | 15 | 81 | 0 |
| normale | 1 | 29 | 3 | 15 | 79 | 0 |
| normale | 2 | 34 | 2 | 10 | 78 | 0 |
| normale | 3 | 26 | 3 | 15 | 78 | 0 |
| normale | 4 | 32 | 2 | 10 | 77 | 0 |
| normale | 5 | 27 | 3 | 15 | 79 | 0 |

## Reproduction

```sh
npm test
node server/gd11-audit.js
node server/gd11-audit.js --json > /tmp/gd11-complete.json
```

Données brutes locales (parties individuelles, historique des raids après) : `/workspace/gd11-audit/before-all.json` et `/workspace/gd11-audit/after.json`. Les tableaux versionnés ci-dessus préservent les agrégats avant/après. Les assertions exactes couvrent 75–88 % à 5 viewers, 70–85 % à 20 viewers, ≤88 % partout, variation ≥5 points en normale, vacillant sur chaque graine, durées et creux longue, fenêtre et dispersion Bits massifs courte, survie gratuite et invariants.
