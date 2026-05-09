# Wave 3B.3 — Partner Settings + Pre-auth KYC Polish (2026-05-09)

> Local/dev only. No production deploy. No fake save. No fake KYC approval. No public KYC URLs.

## Scope closed

### A. /partner/settings real rewrite — ✅
- Server component reads canonical `partners` row; `<PartnerSettingsForm>` client patches `/api/partner/settings`.
- Allowed fields: `company_name, sub_category, phone, website, description, business_hours`.
- **Locked** (read-only, never sent): `partner_type, status, email, kyc_status`.
- All canon-D2 mocks removed (no `Ma Boutique` default, no `contact@maboutique.ma`, no no-op Save).
- Server PATCH allow-lists the payload (defence-in-depth mass-assignment guard) and writes `audit_log`.

### B. Pre-auth KYC signed-link flow — ✅
- New `partner_kyc_tokens` table (mig 102): `(token_hash UNIQUE, partner_id, issued_by, expires_at, used_at)`. RLS deny-all-to-client.
- `lib/partners/kyc-token.ts` server-only primitives — `issueKycToken` / `sha256Hex` / `timingSafeHexEqual`.
- `POST /api/admin/partners/[id]/kyc-token` issues a token; raw value returned ONCE in the response, only sha256 persisted; audit logged.
- `POST /api/partner/kyc/upload-with-token` consumes the token; storage path forced to `partners/<token.partner_id>/<uuid>` so a leaked token cannot upload for another partner. Token marked used only after the upload signed-url + DB row succeed.
- `app/devenir-partenaire/kyc?token=…` server page validates the token before rendering the uploader; safe error screen on invalid/expired/used.
- `<ProspectKycUploader>` uploads via `uploadToSignedUrl` to the private `kyc-documents` bucket. Never `getPublicUrl`.

### C. Admin KYC review polish — ✅
- `POST /api/admin/partners/kyc/[doc_id]/decision` — per-doc approve/reject. Reason required for rejection. `audit_log` written.
- The Wave 3A activation gate (`/api/admin/partners/[id]/activate`) keeps blocking until KYC docs are approved.
- Admin-side display already uses 15-min signed read URLs (Wave C.7).

### D. partner_xp_awards minimum — DEFERRED
- `partner_xp_awards` table exists in DB; route family + per-week / per-day caps + parent-notification flow are non-trivial.
- Documented as carry-forward to Wave 4 to keep Wave 3B.3 honest.

### E. Final partner cleanup — ✅
- `/partner/dashboard` (canon D6) → `permanentRedirect('/partner')`.
- Other CANON-PARTNER findings either closed in earlier waves (3A / 3A.5 / 3B.1 / 3B.2) or carried to Wave 4.

## Files changed (10)

**New (8):** `app/api/partner/settings/route.ts`, `app/partner/settings/partner-settings-form.tsx`, `lib/partners/kyc-token.ts`, `app/api/admin/partners/[id]/kyc-token/route.ts`, `app/api/partner/kyc/upload-with-token/route.ts`, `app/api/admin/partners/kyc/[doc_id]/decision/route.ts`, `app/devenir-partenaire/kyc/page.tsx`, `app/devenir-partenaire/kyc/prospect-kyc-uploader.tsx`.

**Modified (2):** `app/partner/settings/page.tsx` (full rewrite drops the canon-D2 mock), `app/partner/dashboard/page.tsx` (canon D6 redirect).

## Migrations

`102_wave3b3_partner_settings_kyc_tokens.sql` (applied via Supabase MCP):
- `partners.{phone, website, description, business_hours}` columns added.
- `partner_kyc_tokens` table + 2 indexes + RLS policy.

## APIs added

| Route | Purpose |
|---|---|
| `GET /api/partner/settings` | Read partner row |
| `PATCH /api/partner/settings` | Allow-list update + audit |
| `POST /api/admin/partners/[id]/kyc-token` | Issue single-use signed token |
| `POST /api/partner/kyc/upload-with-token` | Prospect uploads via token |
| `POST /api/admin/partners/kyc/[doc_id]/decision` | Per-doc approve/reject |

## Tests added (17 specs)

- `tests/unit/wave3b3-kyc-token.test.ts` (5) — token primitives.
- `tests/integration/wave3b3-settings.test.ts` (5) — PATCH route incl. mass-assignment guard.
- `tests/unit/wave3b3-settings-page-honesty.test.ts` (7) — no canon-D2 mocks, /partner/dashboard redirects, form does not edit forbidden fields.

Total vitest: **47 files / 368 specs / 100% green** (+17 from Wave 3B.3).

## P0/P1 closed

- **CANON-PARTNER-010** — `/partner/settings` no longer hardcoded mock.
- **CANON-PARTNER-016** — `/partner` vs `/partner/dashboard` duplicate fixed.
- **Pre-auth KYC** (canon §2 stage 4 + §4.6) — signed-link path closes the prospect-side gap.
- **Per-doc KYC moderation** — admin path completed.

## Score before / after

| Bucket | Wave 3B.2 | After Wave 3B.3 |
|---|---|---|
| **PARTNER (partner-ecosystem)** | 84 / 100 | **89 / 100** |
| **Core flow score** | 80 | **80** |
| **Overall product score** | 77 | **78** |

**Partner domain can now be considered closed-beta-ready.** Public launch still BLOCKED on:
- secret rotation (end-of-remediation event).
- admin-moderation domain (60/100 — Wave 4A target).
- design-system-mobile (62/100 — Wave 4B target).

## Wave 4A starting line

Per founder ruling, the next wave is **Wave 4A — Admin Moderation Completion**:
- Single `/admin/moderation` inbox unifying user_reports + moderation_queue + KYC.
- `moderate_content` dispatcher RPC.
- Moderator audit-log surface (`/admin/audit-log`).

After 4A, then Wave 4B (design-system / mobile cleanup), then secret rotation, then closed-beta smoke test.

## Carry-forward

- `partner_xp_awards` route family for coach/teacher (per-week 500 XP cap, parent notify) — Wave 4.
- `dj_bookings`, `sponsored_posts`, `mentor_availability` tables + hydration — Wave 4 / V1.4.
- Driver commission + monthly payout request UI — Wave 4 / V1.4.
- Sensitive-edit re-moderation auto-flip on settings — Wave 4.
- Bulk approve/reject on admin offer + KYC inboxes — Wave 4A polish.

## Hard constraints honored

- No production deploy.
- No fake save / no fake KYC approval / no public KYC URLs.
- No partner self-activation (partner_type/status/kyc_status excluded from settings allow-list).
- No direct XP writes (partner_xp_awards deferred; canonical RPC will be wired in Wave 4).
- No new registration pipeline.
- No secret read or printed (`npm run check:env`: 11/11 PRESENT, every value `[REDACTED]`).
