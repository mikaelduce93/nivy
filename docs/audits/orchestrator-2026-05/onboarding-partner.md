# Onboarding partner audit — 2026-05

**Baseline:** SHA `6e3e7f2`
**Mode:** Read-only

## Score pro: 3 / 5

## Résumé

Wave 1 a ajouté l'état "awaiting approval" (`components/dashboard/partner/awaiting-approval.tsx`) et différencié `PARTNER_ACTIVE_STATUSES = new Set(["active", "verified", "approved"])` dans `app/partner/page.tsx`. Le formulaire d'inscription est segmenté en 4 types (retail/venue/club/education) — bonne architecture.

## Inventaire
- `app/devenir-partenaire/page.tsx` — page marketing
- `app/devenir-partenaire/inscription/page.tsx` — wizard 4-types (Read OK), client component avec `RetailPartnerForm`, `VenuePartnerForm`, `ClubPartnerForm`, `EducationPartnerForm`
- `app/partner/page.tsx` — dashboard (Read OK), branche awaiting-approval si statut ≠ active
- `app/partner/{kyc,offers,payouts,invoices,scanner,settings,events,stats,transactions,support}/` — 10+ pages dashboard

## Gaps confirmés
- **OPP1** — KYC : `app/partner/kyc/page.tsx` existe mais flow upload→review→approve non vérifié.
- **OPP2** — `awaiting-approval.tsx` est un nouveau composant (untracked) — bonne UX, mais pas testé.
- **OPP3** — Le formulaire d'inscription `inscription/page.tsx` est `'use client'` — pas de validation server-side via Server Action visible.

## P0
- Aucun bloquant.

## P1
- **OPP4** — Tests E2E partner-onboarding : 0 spec.
- **OPP5** — Vérifier que `RetailPartnerForm` / `VenuePartnerForm` / `ClubPartnerForm` / `EducationPartnerForm` POST vers une API existante (à vérifier avec un Read).

## P2
- **OPP6** — Notifications email lors du passage `pending` → `active` (probablement déjà en triggers).

## Fichiers cités
- `app/devenir-partenaire/page.tsx`
- `app/devenir-partenaire/inscription/page.tsx`
- `app/partner/page.tsx`
- `app/partner/kyc/page.tsx`
- `app/partner/offers/page.tsx`
- `app/partner/payouts/page.tsx`
- `app/partner/invoices/page.tsx`
- `app/partner/scanner/page.tsx`
- `components/dashboard/partner/awaiting-approval.tsx`
- `components/partners/RetailPartnerForm` (chemin présumé)
