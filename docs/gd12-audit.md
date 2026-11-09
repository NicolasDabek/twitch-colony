# Audit GD12 — dix graines, avant / après

Base : `50b39d9` (UX11, logique de jeu GD11 `c447bdb`). Graines **1 à 10** ; 9 scénarios × 3 modes = **270 parties** par version.
« Avant » = code de jeu `50b39d9` piloté par le même `simulate.js` (les deux politiques ajoutées n'agissent que pendant l'annonce du climax ; les sept politiques GD11 sont inchangées).
Reproduire : `node server/gd12-audit.js` (tableau) ou `--json` ; `--seeds=N` pour une autre taille.

## Corrections

1. **Climax préparable.** La tension du climax vaut `0,6 × (1 − préparation) + 0,25 × tours manquantes + 0,15 × retard` : la préparation remplace l'ancien poids graine 0,6. Préparation = viewers **différents** qui tapent `!reparer` pendant les 3 min d'annonce (besoin : max(3, 25 % des actifs) ; 10 bois + 5 pierre chacun, même Foyer plein = « renfort »). La graine ne garde que **±3 PV** (canal indépendant, jamais relancé par un paiement). Bonus 55 + 14 × tension. **Brèche** : un climax n'abat jamais plus de 92 (±3) PV d'un coup, le surplus pille le chantier. Les défenseurs et la stratégie d'un raid annulé ne comptent pas : la horde exige une nouvelle mobilisation. Si le Foyer tombe quand même, **la horde revient** (vague suivante 12 min plus tard) et la cérémonie attend qu'une vague soit tenue.
2. **Climax lisible.** `threatInfo.climax` + panneau : « À défense max : −X PV », renforts k/besoin, défi **« Tenir la brèche »** (Foyer ≥ 25 PV après l'impact). Réussi : butin du raid (+bois/pierre), fête, badge « Brèche tenue », +3 points aux défenseurs et renforts — rien de payant. Annonce `aria-live` ; aucun script ni style inline dans le bloc ; texte 13 px.
3. **Climax → fin.** Annonce au plus tôt à max(2 h 30, accès complet − 30 min), pendant l'avant-dernière tranche de la phase finale (ou plus tard) ; la fin attend **15 min** après l'impact. Le climax prend la place du raid du cycle (la menace suivante est un hiver ≥ 6 min plus tard ; un raid « garde » interrompu reprend). Le bruit des raids ordinaires est indexé hors climax. **Longue** : trêve après un climax tenu (seuls les hivers continuent).
4. **Attente « prête » → accès.** Jalon cosmétique de cérémonie toutes les **10 min** (annonce + fête visuelle, aucune ressource ni effet). Jalon d'épargne (annonce seule) quand la moitié de la tranche suivante est réunie.

## Résultats clés (10 graines, min / médiane / max)

| Mesure | Avant | Après | Cible |
|---|---|---|---|
| Normale 20 v, préparé : PV min | 26 / 29 / 35 (préparation sans effet) | **38 / 41 / 43** | 36–45 |
| Normale 20 v, typique : PV min | 26 / 29 / 35 | **29 / 32 / 34**, vacillant 10/10 | 26–38, ≥ 1 vacillant |
| Normale 20 v, passif au climax : PV min | 0 / 1 / 4 (Foyer détruit puis rallumé) | **5 / 8 / 10**, 0 Chute | 2–15 sans Chute |
| Écart préparé − passif (même graine) | — | **33** sur chaque graine | ≥ 30 |
| À défense max (typique / préparé) | 65 / 71 / 74 | **66 / 68 / 71** / **57 / 59 / 62** | préparable |
| « Tenir la brèche » attentif / passif | — | **10/10** / **0/10** (×3 modes) | 5/5 / 0/5 |
| Climax → fin, courte | 18,0 – 48,5 min | **21,0 – 33,0** | 15–45 |
| Climax → fin, normale | 6,0 – 36,0 min | **15,0 – 33,0** | 15–45 |
| Climax → fin, longue | 12,0 – 117,0 min | **21,0 – 30,5** | 15–45 |
| PV min longue (hors passif) | 17 … 36 | **29 … 35** | ≥ 20 |
| Fin longue | 5 h 15 – 5 h 33 | **5 h 15 – 5 h 33** | 5 h 15–5 h 45 |
| Attente prête → accès sans jalon | 0,3 – 24,5 min | **≤ 10,0** | ≤ 12 |
| Creux de progression courte / normale | ≤ 27,0 / ≤ 27,0 | **≤ 18,0 / ≤ 13,7** | ≤ 20 |
| Fins courte (tous scénarios) | 3 h 09 – 3 h 33 | **3 h 09 – 3 h 24** | 3 h 08–3 h 25 |

Invariants : sur les graines 1–5, tous les taux de raids repoussés restent dans les bornes du test GD11 inchangé (70–85 % à 20 viewers, 75–88 % à 5 viewers, 70–88 % ailleurs). Sur 10 graines, un seul cas sort de 75 % à 5 viewers : longue graine 7, **70,6 %** (avant : **72,2 %**, déjà hors borne sur cette graine). Foyer négligé : 10/10 défaites, toutes après 3 h, dans chaque mode ; chutes ≤ destructions partout ; aucune fin ni défaite avant 3 h.

Limites : la préparation se mesure sur les renforts de l'annonce (3 min) ; les tours manquantes pèsent toujours 0,25. Le plafond de brèche protège un Foyer plein d'un chat passif, pas un Foyer déjà entamé (danger réel). Les bornes sont validées sur cette matrice, pas pour toute graine ou audience.

## Avant — `50b39d9`

| Scénario | Mode | Fin min/méd/max | Raids % | PV min | Vacillant | Climax : dégâts réels | À défense max | Climax → fin (min) | Brèche tenue | Creux progression (min) | Attente prête → accès : creux (min) | Chutes | Défaites |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 viewers | courte | 3h09 / 3h18 / 3h21 | 77.8 / 77.8 / 81.8 | 24 / 30 / 36 | 1 / 1 / 1 | 64 / 71 / 76 | 64 / 71 / 73 | 18.0 / 27.0 / 39.0 | 0/10 | 15.0 / 18.0 / 21.0 | 0.3 / 4.2 / 18.5 | 0 | 0/10 |
| 20 viewers (typique) | courte | 3h12 / 3h21 / 3h24 | 77.8 / 77.8 / 80.0 | 26 / 30 / 36 | 1 / 1 / 1 | 64 / 70 / 74 | 64 / 70 / 74 | 18.0 / 24.0 / 33.0 | 0/10 | 15.0 / 18.0 / 18.0 | 5.8 / 9.5 / 15.7 | 0 | 0/10 |
| 50 viewers | courte | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 81.8 | 27 / 31 / 36 | 1 / 1 / 1 | 64 / 70 / 73 | 64 / 70 / 73 | 21.0 / 33.0 / 48.5 | 0/10 | 15.0 / 18.0 / 27.0 | 2.0 / 13.5 / 24.5 | 0 | 0/10 |
| 200 viewers | courte | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 80.0 | 27 / 31 / 37 | 1 / 1 / 1 | 63 / 70 / 73 | 63 / 70 / 73 | 24.0 / 36.0 / 48.5 | 0/10 | 15.0 / 15.8 / 27.0 | 3.4 / 15.0 / 24.5 | 0 | 0/10 |
| 20 viewers, sans Bits | courte | 3h15 / 3h21 / 3h33 | 77.8 / 80.0 / 81.8 | 26 / 29 / 35 | 1 / 1 / 1 | 65 / 71 / 74 | 65 / 71 / 74 | 18.0 / 21.0 / 30.0 | 0/10 | 15.0 / 18.0 / 18.0 | 3.8 / 5.3 / 5.3 | 0 | 0/10 |
| 20 viewers, Bits massifs | courte | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 83.3 | 28 / 32 / 38 | 1 / 1 / 1 | 62 / 69 / 72 | 62 / 69 / 72 | 36.5 / 45.5 / 48.5 | 0/10 | 18.0 / 24.0 / 27.0 | 16.5 / 23.5 / 24.5 | 0 | 0/10 |
| 20 viewers, Foyer négligé | courte | — | 0.0 / 0.0 / 0.0 | 0 / 0 / 0 | 1 / 1 / 1 | 93 / 100 / 108 | 66 / 71 / 74 | — | 0/10 | 15.0 / 15.0 / 21.0 | — | 15 | 10/10 |
| 20 viewers, préparé | courte | 3h12 / 3h21 / 3h24 | 77.8 / 77.8 / 80.0 | 26 / 30 / 36 | 1 / 1 / 1 | 64 / 70 / 74 | 64 / 70 / 74 | 18.0 / 24.0 / 33.0 | 0/10 | 15.0 / 18.0 / 18.0 | 5.8 / 9.5 / 15.7 | 0 | 0/10 |
| 20 viewers, passif au climax | courte | 3h12 / 3h18 / 3h24 | 77.8 / 77.8 / 80.0 | 3 / 9 / 14 | 1 / 1 / 1 | 86 / 91 / 97 | 64 / 70 / 74 | 18.0 / 24.0 / 33.0 | 0/10 | 15.0 / 18.0 / 21.0 | 4.4 / 8.5 / 15.8 | 0 | 0/10 |
| 5 viewers | normale | 3h27 / 3h42 / 3h54 | 80.0 / 80.0 / 83.3 | 26 / 29 / 35 | 1 / 1 / 1 | 65 / 71 / 74 | 65 / 71 / 74 | 6.0 / 12.0 / 12.0 | 0/10 | 9.0 / 15.0 / 21.0 | — | 0 | 0/10 |
| 20 viewers (typique) | normale | 3h27 / 3h39 / 4h09 | 70.0 / 80.0 / 83.3 | 26 / 29 / 35 | 1 / 1 / 1 | 65 / 71 / 74 | 65 / 71 / 74 | 9.0 / 12.0 / 15.0 | 0/10 | 9.0 / 15.0 / 21.0 | — | 0 | 0/10 |
| 50 viewers | normale | 3h30 / 3h36 / 4h03 | 70.0 / 80.0 / 81.8 | 26 / 30 / 35 | 1 / 1 / 1 | 65 / 71 / 74 | 65 / 71 / 74 | 9.0 / 12.0 / 12.0 | 0/10 | 12.0 / 15.0 / 18.0 | — | 0 | 0/10 |
| 200 viewers | normale | 3h21 / 3h24 / 3h42 | 70.0 / 80.0 / 81.8 | 26 / 29 / 35 | 1 / 1 / 1 | 65 / 71 / 74 | 65 / 71 / 74 | 12.0 / 12.0 / 15.0 | 0/10 | 9.0 / 12.0 / 18.0 | — | 0 | 0/10 |
| 20 viewers, sans Bits | normale | 3h45 / 3h57 / 4h21 | 72.7 / 81.8 / 83.3 | 26 / 29 / 35 | 1 / 1 / 1 | 65 / 71 / 74 | 65 / 71 / 74 | 6.0 / 9.0 / 15.0 | 0/10 | 9.0 / 12.0 / 18.0 | — | 0 | 0/10 |
| 20 viewers, Bits massifs | normale | 3h09 / 3h18 / 3h21 | 70.0 / 77.8 / 80.0 | 27 / 30 / 36 | 1 / 1 / 1 | 64 / 70 / 73 | 64 / 70 / 73 | 6.0 / 27.0 / 36.0 | 0/10 | 12.0 / 21.0 / 27.0 | 1.4 / 19.5 / 24.5 | 0 | 0/10 |
| 20 viewers, Foyer négligé | normale | — | 0.0 / 0.0 / 0.0 | 0 / 0 / 0 | 1 / 1 / 1 | 96 / 102 / 102 | 68 / 72 / 72 | — | 0/10 | 18.0 / 18.0 / 21.0 | — | 0 | 10/10 |
| 20 viewers, préparé | normale | 3h27 / 3h39 / 4h09 | 70.0 / 80.0 / 83.3 | 26 / 29 / 35 | 1 / 1 / 1 | 65 / 71 / 74 | 65 / 71 / 74 | 9.0 / 12.0 / 15.0 | 0/10 | 9.0 / 15.0 / 21.0 | — | 0 | 0/10 |
| 20 viewers, passif au climax | normale | 3h27 / 3h39 / 4h09 | 70.0 / 80.0 / 83.3 | 0 / 1 / 4 | 0 / 1 / 1 | 96 / 102 / 108 | 65 / 71 / 74 | 9.0 / 12.0 / 15.0 | 0/10 | 9.0 / 15.0 / 21.0 | — | 0 | 0/10 |
| 5 viewers | longue | 5h15 / 5h30 / 5h33 | 72.2 / 82.4 / 85.0 | 20 / 30 / 35 | 1 / 1 / 1 | 65 / 71 / 74 | 65 / 71 / 74 | 33.0 / 60.0 / 78.0 | 0/10 | 18.0 / 21.0 / 21.0 | 17.5 / 21.0 / 21.0 | 0 | 0/10 |
| 20 viewers (typique) | longue | 5h15 / 5h30 / 5h33 | 77.8 / 84.2 / 85.0 | 17 / 29 / 36 | 1 / 1 / 1 | 64 / 71 / 74 | 64 / 71 / 74 | 39.0 / 54.0 / 87.5 | 0/10 | 21.0 / 21.0 / 21.0 | 18.5 / 21.0 / 21.0 | 0 | 0/10 |
| 50 viewers | longue | 5h15 / 5h30 / 5h33 | 75.0 / 84.2 / 85.0 | 24 / 28 / 35 | 1 / 1 / 1 | 65 / 71 / 73 | 65 / 71 / 73 | 36.0 / 54.0 / 87.0 | 0/10 | 18.0 / 21.0 / 21.0 | 17.5 / 21.0 / 21.0 | 0 | 0/10 |
| 200 viewers | longue | 5h15 / 5h30 / 5h33 | 73.7 / 84.2 / 85.0 | 24 / 29 / 33 | 1 / 1 / 1 | 64 / 71 / 74 | 64 / 71 / 74 | 45.0 / 63.0 / 75.0 | 0/10 | 21.0 / 21.0 / 21.0 | 19.5 / 21.0 / 21.0 | 0 | 0/10 |
| 20 viewers, sans Bits | longue | 5h18 / 5h30 / 5h33 | 77.8 / 83.3 / 85.0 | 27 / 30 / 36 | 1 / 1 / 1 | 64 / 71 / 73 | 64 / 71 / 73 | 12.0 / 30.0 / 45.0 | 0/10 | 9.0 / 18.0 / 21.0 | 7.5 / 17.5 / 19.5 | 0 | 0/10 |
| 20 viewers, Bits massifs | longue | 5h15 / 5h30 / 5h33 | 72.2 / 84.2 / 85.0 | 27 / 30 / 36 | 1 / 1 / 1 | 64 / 71 / 73 | 64 / 71 / 73 | 99.0 / 111.0 / 117.0 | 0/10 | 21.0 / 21.0 / 21.0 | 21.0 / 21.0 / 21.0 | 0 | 0/10 |
| 20 viewers, Foyer négligé | longue | — | 0.0 / 0.0 / 0.0 | 0 / 0 / 0 | 1 / 1 / 1 | — | — | — | 0/10 | 9.0 / 12.0 / 15.0 | — | 0 | 10/10 |
| 20 viewers, préparé | longue | 5h15 / 5h30 / 5h33 | 77.8 / 84.2 / 85.0 | 17 / 29 / 36 | 1 / 1 / 1 | 64 / 71 / 74 | 64 / 71 / 74 | 39.0 / 54.0 / 87.5 | 0/10 | 21.0 / 21.0 / 21.0 | 18.5 / 21.0 / 21.0 | 0 | 0/10 |
| 20 viewers, passif au climax | longue | 5h15 / 5h30 / 5h33 | 77.8 / 84.2 / 85.0 | 0 / 0 / 10 | 0 / 0 / 1 | 90 / 102 / 107 | 64 / 71 / 74 | 39.0 / 54.0 / 87.5 | 0/10 | 21.0 / 21.0 / 21.0 | 18.5 / 21.0 / 21.0 | 0 | 0/10 |

## Après — GD12

| Scénario | Mode | Fin min/méd/max | Raids % | PV min | Vacillant | Climax : dégâts réels | À défense max | Climax → fin (min) | Brèche tenue | Creux progression (min) | Attente prête → accès : creux (min) | Chutes | Défaites |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5 viewers | courte | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 81.8 | 30 / 33 / 35 | 1 / 1 / 1 | 65 / 67 / 70 | 65 / 67 / 70 | 27.0 / 28.5 / 29.5 | 10/10 | 10.0 / 12.0 / 16.8 | 2.3 / 8.5 / 10.0 | 0 | 0/10 |
| 20 viewers (typique) | courte | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 80.0 | 30 / 33 / 35 | 1 / 1 / 1 | 65 / 67 / 70 | 65 / 67 / 70 | 27.0 / 27.5 / 31.5 | 10/10 | 10.3 / 12.0 / 12.0 | 0.7 / 10.0 / 10.0 | 0 | 0/10 |
| 50 viewers | courte | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 81.8 | 31 / 33 / 35 | 1 / 1 / 1 | 65 / 67 / 69 | 65 / 67 / 69 | 27.0 / 28.5 / 29.5 | 10/10 | 10.0 / 12.0 / 15.0 | 7.3 / 10.0 / 10.0 | 0 | 0/10 |
| 200 viewers | courte | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 80.0 | 31 / 33 / 35 | 1 / 1 / 1 | 65 / 67 / 69 | 65 / 67 / 69 | 27.5 / 28.5 / 29.5 | 10/10 | 10.5 / 12.4 / 15.0 | 8.5 / 10.0 / 10.0 | 0 | 0/10 |
| 20 viewers, sans Bits | courte | 3h12 / 3h21 / 3h24 | 77.8 / 80.0 / 81.8 | 29 / 33 / 35 | 1 / 1 / 1 | 65 / 67 / 71 | 65 / 67 / 71 | 21.0 / 27.0 / 29.5 | 10/10 | 10.7 / 12.0 / 12.4 | 0.2 / 1.3 / 10.0 | 0 | 0/10 |
| 20 viewers, Bits massifs | courte | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 81.8 | 31 / 34 / 35 | 1 / 1 / 1 | 65 / 67 / 69 | 65 / 67 / 69 | 27.5 / 28.5 / 29.5 | 10/10 | 10.0 / 11.5 / 14.5 | 10.0 / 10.0 / 10.0 | 0 | 0/10 |
| 20 viewers, Foyer négligé | courte | — | 0.0 / 0.0 / 0.0 | 0 / 0 / 0 | 1 / 1 / 1 | 90 / 92 / 95 | 66 / 68 / 71 | — | 0/10 | 8.8 / 12.3 / 15.2 | — | 20 | 10/10 |
| 20 viewers, préparé | courte | 3h12 / 3h18 / 3h21 | 77.8 / 80.0 / 80.0 | 39 / 42 / 43 | 0 / 0 / 1 | 57 / 59 / 61 | 57 / 59 / 61 | 27.5 / 30.0 / 33.0 | 10/10 | 10.8 / 15.0 / 15.0 | 1.1 / 9.0 / 10.0 | 0 | 0/10 |
| 20 viewers, passif au climax | courte | 3h15 / 3h18 / 3h21 | 80.0 / 80.0 / 80.0 | 6 / 11 / 14 | 1 / 1 / 1 | 86 / 90 / 94 | 65 / 67 / 70 | 27.5 / 31.5 / 33.0 | 0/10 | 10.8 / 15.0 / 18.0 | 9.0 / 9.0 / 10.0 | 0 | 0/10 |
| 5 viewers | normale | 3h27 / 3h39 / 3h51 | 80.0 / 80.0 / 83.3 | 28 / 32 / 34 | 1 / 1 / 1 | 66 / 68 / 72 | 66 / 68 / 71 | 15.0 / 21.0 / 24.0 | 10/10 | 7.3 / 11.0 / 13.0 | — | 0 | 0/10 |
| 20 viewers (typique) | normale | 3h27 / 3h36 / 4h06 | 70.0 / 80.0 / 83.3 | 29 / 32 / 34 | 1 / 1 / 1 | 66 / 68 / 71 | 66 / 68 / 71 | 15.0 / 21.0 / 27.0 | 10/10 | 7.3 / 9.8 / 12.8 | — | 0 | 0/10 |
| 50 viewers | normale | 3h27 / 3h36 / 4h00 | 70.0 / 80.0 / 81.8 | 29 / 32 / 34 | 1 / 1 / 1 | 66 / 68 / 71 | 66 / 68 / 71 | 18.0 / 21.0 / 24.0 | 10/10 | 9.0 / 10.2 / 12.0 | — | 0 | 0/10 |
| 200 viewers | normale | 3h18 / 3h21 / 3h39 | 70.0 / 80.0 / 81.8 | 30 / 33 / 34 | 1 / 1 / 1 | 66 / 67 / 70 | 66 / 67 / 70 | 18.0 / 21.0 / 27.0 | 10/10 | 9.0 / 10.7 / 11.8 | 0.8 / 0.8 / 0.8 | 0 | 0/10 |
| 20 viewers, sans Bits | normale | 3h45 / 3h57 / 4h18 | 72.7 / 81.8 / 83.3 | 30 / 32 / 34 | 1 / 1 / 1 | 66 / 68 / 70 | 66 / 68 / 70 | 15.0 / 15.0 / 24.0 | 10/10 | 8.2 / 9.0 / 11.7 | — | 0 | 0/10 |
| 20 viewers, Bits massifs | normale | 3h09 / 3h18 / 3h21 | 77.8 / 80.0 / 80.0 | 31 / 34 / 35 | 1 / 1 / 1 | 65 / 67 / 69 | 65 / 67 / 69 | 18.0 / 27.5 / 29.5 | 10/10 | 9.8 / 10.0 / 13.7 | 3.6 / 10.0 / 10.0 | 0 | 0/10 |
| 20 viewers, Foyer négligé | normale | — | 0.0 / 0.0 / 0.0 | 0 / 0 / 0 | 1 / 1 / 1 | 90 / 92 / 93 | 66 / 68 / 69 | — | 0/10 | 10.0 / 12.2 / 15.9 | — | 0 | 10/10 |
| 20 viewers, préparé | normale | 3h27 / 3h36 / 4h09 | 70.0 / 80.0 / 83.3 | 38 / 41 / 43 | 0 / 0 / 1 | 57 / 59 / 62 | 57 / 59 / 62 | 18.0 / 24.0 / 30.0 | 10/10 | 9.0 / 9.8 / 12.8 | — | 0 | 0/10 |
| 20 viewers, passif au climax | normale | 3h33 / 3h39 / 4h12 | 70.0 / 80.0 / 84.6 | 5 / 8 / 10 | 1 / 1 / 1 | 90 / 92 / 95 | 66 / 68 / 71 | 21.0 / 27.0 / 33.0 | 0/10 | 9.0 / 9.8 / 12.8 | — | 0 | 0/10 |
| 5 viewers | longue | 5h18 / 5h30 / 5h33 | 70.6 / 82.4 / 84.2 | 29 / 32 / 34 | 1 / 1 / 1 | 66 / 68 / 71 | 66 / 68 / 71 | 27.5 / 29.5 / 30.5 | 10/10 | 10.0 / 11.7 / 12.8 | 10.0 / 10.0 / 10.0 | 0 | 0/10 |
| 20 viewers (typique) | longue | 5h15 / 5h30 / 5h33 | 76.5 / 83.3 / 84.2 | 29 / 32 / 34 | 1 / 1 / 1 | 66 / 68 / 71 | 66 / 68 / 71 | 27.5 / 28.5 / 29.5 | 10/10 | 10.0 / 10.0 / 11.8 | 10.0 / 10.0 / 10.0 | 0 | 0/10 |
| 50 viewers | longue | 5h15 / 5h30 / 5h33 | 77.8 / 83.3 / 84.2 | 30 / 32 / 35 | 1 / 1 / 1 | 65 / 68 / 70 | 65 / 68 / 70 | 27.5 / 28.5 / 29.5 | 10/10 | 10.0 / 10.0 / 12.5 | 10.0 / 10.0 / 10.0 | 0 | 0/10 |
| 200 viewers | longue | 5h15 / 5h30 / 5h33 | 77.8 / 83.3 / 84.2 | 30 / 33 / 34 | 1 / 1 / 1 | 66 / 67 / 70 | 66 / 67 / 70 | 27.5 / 28.5 / 29.5 | 10/10 | 10.0 / 10.0 / 12.2 | 10.0 / 10.0 / 10.0 | 0 | 0/10 |
| 20 viewers, sans Bits | longue | 5h15 / 5h30 / 5h33 | 78.9 / 83.3 / 84.2 | 30 / 33 / 35 | 1 / 1 / 1 | 65 / 67 / 70 | 65 / 67 / 70 | 21.0 / 28.5 / 29.5 | 10/10 | 10.0 / 10.0 / 12.0 | 2.0 / 10.0 / 10.0 | 0 | 0/10 |
| 20 viewers, Bits massifs | longue | 5h15 / 5h30 / 5h33 | 77.8 / 83.3 / 85.0 | 30 / 33 / 35 | 1 / 1 / 1 | 65 / 67 / 70 | 65 / 67 / 70 | 27.5 / 28.5 / 29.5 | 10/10 | 10.0 / 10.0 / 12.5 | 10.0 / 10.0 / 10.0 | 0 | 0/10 |
| 20 viewers, Foyer négligé | longue | — | 0.0 / 0.0 / 0.0 | 0 / 0 / 0 | 1 / 1 / 1 | — | — | — | 0/10 | 7.0 / 9.3 / 12.4 | — | 0 | 10/10 |
| 20 viewers, préparé | longue | 5h15 / 5h30 / 5h33 | 76.5 / 83.3 / 84.2 | 38 / 41 / 43 | 0 / 0 / 1 | 57 / 59 / 62 | 57 / 59 / 62 | 27.5 / 28.5 / 29.5 | 10/10 | 10.0 / 10.0 / 11.8 | 10.0 / 10.0 / 10.0 | 0 | 0/10 |
| 20 viewers, passif au climax | longue | 5h15 / 5h30 / 5h33 | 76.5 / 83.3 / 84.2 | 5 / 8 / 10 | 1 / 1 / 1 | 90 / 92 / 95 | 66 / 68 / 71 | 27.5 / 28.5 / 29.5 | 0/10 | 10.0 / 10.0 / 11.8 | 10.0 / 10.0 / 10.0 | 0 | 0/10 |
