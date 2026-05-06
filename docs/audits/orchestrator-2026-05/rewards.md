# Rewards / Wallet audit — 2026-05

**Baseline:** SHA `6e3e7f2`
**Mode:** Read-only

## Score pro: 4 / 5

## Résumé

`docs/economy.md` (203 lignes, source canonique) clarifie 3 devises (XP, Coins, DH credit dérivé), 1 boutique canonique (`/teen/wallet?tab=shop`), 1 conversion (`lib/payments/xp-converter.ts`). Trois redirects propres remplacent les 3 anciennes boutiques.

## Cohérence vérifiée
- `app/teen/wallet/wallet-hub-client.tsx` modifié (Wave 1) — header XP/Coins/DH credit attendu par la spec.
- `components/rewards/unified-rewards-display.tsx` (Read OK) — composant client unique.
- 3 redirects vers `/teen/wallet?tab=shop` (xp-shop, gamification/boutique, teen/shop) tous Read-confirmés.

## Incohérences résiduelles
- **R1** — `app/teen/coins/page.tsx` affiche `totalCoins = 1250` en mock alors que `docs/economy.md §2.2` indique « `walletData.coins = 0` ». Cohérence inter-pages cassée.
- **R2** — `app/teen/shop/checkout/page.tsx` (Read OK) gère le hybrid checkout via `?booking=<uuid>` ; route correcte mais pas de tests E2E (cf reservation.md).
- **R3** — `xp_shop_items` table reste en DB sans caller — gap connu (deferred per `docs/economy.md §8`).

## P0
- Aucun.

## P1
- **R4** — Re-aligner `app/teen/coins/page.tsx` sur l'état réel ou la marquer roadmap V2.
- **R5** — Tests E2E reward shop : aucun spec dans `tests/e2e/`. Ajouter `tests/e2e/teen-shop.spec.ts` (parcours: open shop → pick reward → confirm → XP debit).

## P2
- **R6** — DB migration de cleanup `xp_shop_items` (séparé, owner: futur DB-consolidator).

## Fichiers cités
- `docs/economy.md`
- `lib/payments/xp-converter.ts`
- `app/teen/wallet/wallet-hub-client.tsx`
- `app/teen/shop/checkout/page.tsx`
- `app/teen/shop/checkout/checkout-client.tsx`
- `components/rewards/unified-rewards-display.tsx`
- `app/api/payments/hybrid/route.ts`
- `app/api/payments/xp/route.ts`
- `app/teen/coins/page.tsx`
