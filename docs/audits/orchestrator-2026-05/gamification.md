# Gamification audit — 2026-05

**Baseline:** SHA `6e3e7f2`
**Mode:** Read-only

## Score pro: 4 / 5

## Résumé

Bonne nouvelle : la triple boutique a été unifiée vers `/teen/wallet?tab=shop` (3 redirects vérifiés). Le moteur (`gamification-system/features/*`) est intact. La principale dette restante est la **duplication des hubs gamification vs teen** sur 4 surfaces.

## Boutiques unifiées (Wave 1 succès)
Read confirmé sur les 3 redirects :
- `app/xp-shop/page.tsx` (10 lignes, redirect-only)
- `app/gamification/boutique/page.tsx` (10 lignes, redirect-only)
- `app/teen/shop/page.tsx` (7 lignes, redirect-only)

Le canonical est `/teen/wallet?tab=shop`. La table `xp_shop_items` est marquée legacy dans `docs/economy.md` mais **non droppée** (pas de migration DB dans cette passe — conforme à la garde-fou).

## Doublons hub gamification ↔ teen
Existent toujours :
- `app/gamification/aide-scolaire/page.tsx` ↔ `app/teen/aide-scolaire/page.tsx`
- `app/gamification/defis-physiques/page.tsx` ↔ `app/teen/defis-physiques/page.tsx`
- `app/gamification/defis/page.tsx` ↔ `app/teen/challenges/page.tsx`
- `app/gamification/missions/page.tsx` ↔ `app/teen/quests/page.tsx`
- `app/gamification/leaderboard/page.tsx` ↔ `app/teen/leaderboard/page.tsx`
- `app/gamification/crews/page.tsx` ↔ `app/teen/circles/circles-client.tsx`

Le DoD du `routes-deduplicator` exigeait *"One canonical URL per teen domain (missions, défis, quests, leaderboard, aide-scolaire, shop, achievements)"* — partiellement atteint (shop OK, le reste non).

## XP/Coins consistance
`docs/economy.md` (203 lignes) clarifie : XP = canon, coins = placeholder (jamais wired), DH credit = dérivé via `lib/payments/xp-converter.ts`. Le wallet UI lit `walletData.coins = 0`. **Le mock `app/teen/coins/page.tsx` continue d'afficher `totalCoins = 1250`** — incohérence visible utilisateur.

## P0
- **G1** — Réconcilier `app/teen/coins/page.tsx` avec `walletData.coins = 0` du wallet (afficher l'état réel ou supprimer la page).

## P1
- **G2** — Choisir un canonical par domaine `gamification` vs `teen` et redirect l'autre (mêmes 6 paires listées ci-dessus).
- **G3** — Drop `xp_shop_items` (zéro caller selon `docs/economy.md`) — ticket DB séparé.

## P2
- **G4** — Le hub `app/gamification/page.tsx` est modifié (cf git status) ; vérifier qu'il ne pointe plus vers les pages /teen/.

## Fichiers cités
- `app/teen/wallet/wallet-hub-client.tsx`
- `app/xp-shop/page.tsx`
- `app/gamification/boutique/page.tsx`
- `app/teen/shop/page.tsx`
- `app/gamification/aide-scolaire/page.tsx`
- `app/gamification/defis-physiques/page.tsx`
- `app/gamification/missions/page.tsx`
- `app/gamification/leaderboard/page.tsx`
- `app/gamification/crews/page.tsx`
- `app/teen/coins/page.tsx`
- `lib/payments/xp-converter.ts`
- `docs/economy.md`
