# Onboarding parent audit — 2026-05

**Baseline:** SHA `6e3e7f2`
**Mode:** Read-only

## Score pro: 3 / 5

## Résumé

Le formulaire d'ajout teen est en place (`app/parent/teens/add/page.tsx` + `components/parent/add-teen-form.tsx`). E-signature parent existe en page mais pas en POST API. Les 6 pages de teen mocks (cf homepage.md) restent un risque pour la première impression du parent.

## Inventaire
- `app/parent/teens/add/page.tsx` — server component, redirige si rôle ≠ parent (Read OK)
- `app/parent/page.tsx` — modifié Wave 1
- `app/parent/topup/page.tsx` — modifié
- `app/parent/approvals/page.tsx` — modifié
- `app/parent/e-signature/page.tsx` — nouveau (untracked dans git status)
- `components/parent/e-signature-client.tsx` — nouveau
- `app/parent/budget/page.tsx`, `app/parent/history/page.tsx`, `app/parent/documents/page.tsx`, `app/parent/notifications/page.tsx`, `app/parent/settings/page.tsx`

## Gaps
- **OP1** — E-signature : seul `e_signature/status` existe en API ; POST manquant.
- **OP2** — Aucun parcours de bienvenue / wizard pour un parent qui se loggue 1ère fois.
- **OP3** — `app/autorisations/page.tsx` (Read OK) lit `children` + `child_authorizations` — schéma DB ancien (avant `parent_teen_relationships`). Confirmer cohérence avec le modèle actuel.

## P0
- **OP4** — Compléter POST e-signature avant prod (le formulaire `e-signature-client.tsx` n'a pas d'endpoint cible vérifié).

## P1
- **OP5** — Wizard onboarding parent : étapes (signer → ajouter teen → top-up).
- **OP6** — Tests Playwright `tests/e2e/parent-onboarding.spec.ts`.

## P2
- **OP7** — Réconcilier `children` table vs `parent_teen_relationships` table — risque doublon.

## Fichiers cités
- `app/parent/teens/add/page.tsx`
- `app/parent/e-signature/page.tsx`
- `components/parent/e-signature-client.tsx`
- `app/api/parent/e-signature/status/route.ts`
- `app/api/parent/topup/route.ts`
- `app/parent/topup/page.tsx`
- `app/parent/approvals/page.tsx`
- `app/parent/page.tsx`
- `app/autorisations/page.tsx`
- `components/e-signature-form.tsx`
