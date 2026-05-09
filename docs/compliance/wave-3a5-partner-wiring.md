# Wave 3A.5 — Partner Wiring & Admin Activation UI (2026-05-09)

> Source: founder directive 2026-05-09 — wire the existing UI to Wave 3A canonical backend before starting Wave 3B.
> Local/dev only. No production deploy. No new archetypes. No redesign.

## Scope

Five wiring items closed in this wave:

### A. Partner wizard UI wiring — ✅
- New shared module `lib/partners/wizard-submit.ts` exposes `submitPartnerWizard()` — the only client-side entry into the canonical wizard.
- New `<PartnerPasswordPanel>` component renders the password + confirm fields with inline validation (canon §2 stage 2: wizard collects a password).
- All four legacy commerce forms (`Retail`, `Venue`, `Club`, `Education`):
  - Add `password` + `confirmPassword` state.
  - Render `<PartnerPasswordPanel>` in Step 1.
  - Validate password ≥8 chars + match in `validateStep(1)`.
  - POST to `/api/partners/wizard/submit` (no more direct `/api/partners/register` calls).
  - Replace `alert()` with sonner `toast.error/success`.
  - Success: redirect to `/partenaires/merci?ref=<partner_id>` with the canonical persisted reference.
  - Honest copy: "Demande envoyée. KYC + activation admin requise avant la connexion." — no fake immediate-login promise.

### B. Admin partner activation UI — ✅
- New "Activer" button on `app/admin/partners/partner-review-row.tsx` calling `POST /api/admin/partners/[id]/activate`.
- KYC missing → renders `Documents KYC requis. N/M approuvés.` (no silent success).
- Already-active partner → renders `Déjà actif` (idempotent reconciliation).
- Successful activation with auth user creation → renders `Activé · invitation envoyée`.
- Legacy "Approuver" button kept with `title=` tooltip warning ("préférer Activer") for backward-compat with the in-flight reviews.
- audit_log writes are server-side via the activation route.

### C. Admin offer moderation UI — ✅
- New `/admin/partners/offers` page (server component) listing all `partner_offers` in `status='pending_approval'`.
- Per-row `<OfferDecisionRow>` client component:
  - "Approuver (active)" → POST `decision:'approved'` → flips status='approved' + is_active=true (atomic via DB CHECK).
  - "Rejeter" → reveals optional reason textarea → POST `decision:'rejected', reason` → flips status='rejected', is_active=false.
- No direct `is_active` toggle path exposed.
- audit_log written server-side per decision.

### D. Partner KYC UI — ✅
- New `<PartnerKycUploader>` component on `/partner/kyc` page.
- Hard contract:
  - Step 1: `POST /api/partner/kyc/upload` returns `{ path, token, doc_id, bucket }`.
  - Step 2: client uploads via `supabase.storage.uploadToSignedUrl(path, token, file)`.
  - DB row inserted server-side at step 1; storage write is the only client touch.
  - Doc-type allow-list (14 types) + MIME allow-list (JPEG/PNG/WebP/PDF) enforced client + server.
  - 10 MB hard cap.
- Removed "contactez le support" stub language. Kept the existing read-only doc list with 15-min signed admin URLs.
- Never `getPublicUrl` — hard rule per canon §6 F12.

### E. Sidebar nav verification — ✅
- Wave 3A made `<PartnerSidebar>` type-aware. Wave 3A.5 adds a unit test (`tests/unit/wave3a5-partner-sidebar.test.tsx`) that asserts:
  - Pending partner sees ONLY Dashboard / KYC / Support.
  - Active retail partner sees Scanner.
  - Active food partner sees Menu + Commandes (NOT Scanner).
  - Active event_organizer sees Évènements.
  - Every emitted href starts with `/partner/`.

## Files changed (12)

**New (7):**
- `lib/partners/wizard-submit.ts`
- `components/partners/PartnerPasswordPanel.tsx`
- `components/partners/PartnerKycUploader.tsx`
- `app/admin/partners/offers/page.tsx`
- `app/admin/partners/offers/offer-decision-row.tsx`
- `tests/unit/wave3a5-partner-sidebar.test.tsx`
- `tests/unit/wave3a5-form-wiring.test.ts`

**Modified (5):**
- `components/partners/RetailPartnerForm.tsx` (password panel, wizard submit, sonner)
- `components/partners/VenuePartnerForm.tsx` (same)
- `components/partners/ClubPartnerForm.tsx` (same)
- `components/partners/EducationPartnerForm.tsx` (same)
- `app/admin/partners/partner-review-row.tsx` (Activate button, error / outcome states)
- `app/partner/kyc/page.tsx` (mount `<PartnerKycUploader>`)

No migrations. No new APIs. No RPC changes.

## Tests added

21 specs across 2 files, all green:
- `tests/unit/wave3a5-form-wiring.test.ts` (16) — for each of the 4 forms: no legacy `/api/partners/register`, imports canonical helper, renders password panel, no `alert()`.
- `tests/unit/wave3a5-partner-sidebar.test.tsx` (5) — pending vs active scoping, type-specific items, all hrefs scoped to `/partner/`.

Total vitest suite: **41 files / 299 specs / 100% green**.

## P0/P1 closed

- **CANON-PARTNER-001 final closure** — legacy register UI path now blocked at the form level (not just the API). Even with the 410 delegate in place, no production form posts a no-password payload anymore.
- **CANON-PARTNER-002 UI completion** — admin can actually trigger activation from `/admin/partners` instead of needing a curl call.
- **CANON-PARTNER-005 UI completion** — admin can moderate offers from `/admin/partners/offers` with an explicit approve/reject workflow.
- **CANON-PARTNER-009 UI completion** — partner can self-upload KYC docs from `/partner/kyc` (private bucket only).
- **CANON-PARTNER-021 final closure** — wizard form components now collect a password (companion to the schema added in Wave 3A).

## Score after Wave 3A.5

| Bucket | Wave 3A | After Wave 3A.5 |
|---|---|---|
| **PARTNER (partner-ecosystem)** | 65 / 100 | **70 / 100** |
| **Core flow score** | 80 | **80** |
| **Overall product score** | 72 | **73** |

The +5 partner gain reflects: (1) form-level no-orphan guarantee, (2) admin activation usable end-to-end, (3) offer moderation usable end-to-end, (4) KYC upload usable end-to-end. Public launch remains BLOCKED — 11 missing archetypes (Wave 3B), `/partner/settings` rewrite, and end-of-remediation secret rotation still pending.

Launch status:
- `public_launch_status`: **BLOCKED**.
- `closed_beta_status`: **RISKY_PENDING_SECRET_ROTATION**.

## Wave 3B starting line

Wave 3A.5 is the prerequisite for Wave 3B. After this commit lands, Wave 3B can take on:

- 11 missing archetype landing pages + wizards.
- Type-aware per-archetype dashboards (`/partner/food/dashboard`, `/driver/dashboard`, etc.).
- `/partner/settings` rewrite (still hardcoded mock).
- `/devenir-{archetype}/kyc?token=` signed-link upload UI (signed-JWT infra for prospects pre-auth).
- `partner_xp_awards` route family for coach/teacher.
- `/admin/partners/offers` filtering + bulk actions (current page is single-list, single-action).

## Secrets

- `npm run check:env`: 11/11 PRESENT, every value `[REDACTED]`.
- No secret read or printed during Wave 3A.5.
- Rotation event remains scheduled for end of remediation (per `release-blockers.md`).
