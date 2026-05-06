# Reservation / Payment audit — 2026-05

**Baseline:** SHA `6e3e7f2`
**Mode:** Read-only

## Score pro: 3 / 5

## Résumé

Le rail hybride payments est en place (9 routes API). `app/teen/shop/checkout/page.tsx` exige `?booking=<uuid>` et redirige sinon. Le e-signature parent côté API (`status`) existe mais le formulaire complet manque encore.

## Inventaire payments
Glob `app/api/payments/**` → 9 routes :
- `cash/create`, `cmi/create`, `cmi/initiate`, `cmi/callback`, `cmi/webhook`
- `mobile-money/initiate`
- `process`, `hybrid`, `xp`

## Inventaire e-signature
- `app/api/parent/e-signature/status/route.ts` (statut existe)
- ❗ Manque `app/api/parent/e-signature/create/route.ts` ou équivalent pour persister la signature
- `app/parent/e-signature/page.tsx` (Read OK) — server component lit `e_signatures` table, redirige si déjà signé

## Top-up parent
- `app/api/parent/topup/route.ts` modifié (Wave 1)
- `app/parent/topup/page.tsx` modifié (Wave 1)

## Approvals parent
- `app/parent/approvals/page.tsx` modifié (Wave 1) — non re-vérifié en détail

## P0
- **B1** — Tests E2E checkout : 0 spec. Ajouter `tests/e2e/teen-checkout.spec.ts` couvrant : booking → checkout hybrid → success.

## P1
- **B2** — Compléter le rail e-signature parent : POST endpoint pour insérer dans `e_signatures` (le `status` GET seul est insuffisant).
- **B3** — Tests Playwright top-up parent (`tests/e2e/parent-topup.spec.ts`) — modifié Wave 1 mais non couvert par tests.

## P2
- **B4** — Smoke-tester chaque payment provider en CI (Stripe / CMI / Mobile Money) avec mocks.

## Fichiers cités
- `app/api/payments/hybrid/route.ts`
- `app/api/payments/xp/route.ts`
- `app/api/payments/cmi/initiate/route.ts`
- `app/api/payments/cmi/webhook/route.ts`
- `app/api/payments/mobile-money/initiate/route.ts`
- `app/api/parent/topup/route.ts`
- `app/api/parent/e-signature/status/route.ts`
- `app/parent/topup/page.tsx`
- `app/parent/approvals/page.tsx`
- `app/parent/e-signature/page.tsx`
- `app/teen/shop/checkout/page.tsx`
- `app/teen/shop/checkout/checkout-client.tsx`
