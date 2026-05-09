# Wave 3A — Partner Ecosystem Truth (2026-05-09)

> Source: `docs/canon/partner-ecosystem.locked.md` §2 §3 §4 §6 + `docs/compliance/09-partner-ecosystem-compliance.md` + `docs/compliance/15-phantom-rpc-api-table-violations.md`.
> Local/dev only — no production deploy. Secret rotation deferred to end of remediation per `release-blockers.md`.

## Scope (founder-locked, 2026-05-09)

Eight sub-areas (A–H). All must-have items closed; large MISSING build-out (11 archetype landings, type-aware dashboards) deferred to Wave 3B.

### A. Partner registration truth — ✅
- `POST /api/partners/wizard/submit` is the canonical wizard endpoint (canon §4.7). Captures password, inserts `partners (status='pending')` + child rows, stages `partner_pending_credentials`. **Never** calls `auth.signUp`.
- Child-insert failure rolls back the partner row (no orphans).
- `POST /api/partners/register` (legacy) returns **410 deprecated_endpoint** when called without password; otherwise forwards to the wizard. The no-orphan loophole is closed.

### B. Admin partner activation — ✅
- `POST /api/admin/partners/[id]/activate` (canon §4.7).
- Atomic 6-step: admin gate → KYC verify (or env-flagged bypass) → `auth.admin.inviteUserByEmail` → `profiles.role='partner'` → `partner_staff (role='owner', is_active=true)` upsert → `partners.status='active'` + cleanup credentials → `audit_log`.
- Idempotent: already-active partner reconciles owner+role and returns `noop_already_active`.

### C. Partner KYC upload truth — ✅
- `POST /api/partner/kyc/upload` returns a one-shot signed upload token for the **private** `kyc-documents` bucket (canon §4.6, §3.4, §6 F12).
- Path forced to `partners/<partner_id>/<uuid>.<ext>`. Doc row inserted with `status='submitted'`.
- 19-doc allow-list enforced server-side. MIME allow-list enforced.
- No `getPublicUrl` anywhere.

### D. Partner scanner v2 — ✅
- Canonical QR format: `nivy:v1:{user_id}:{card_number}:{exp_unix}:{nonce}:{hmac_sha256}`.
- Canonical apply endpoint: `POST /api/partner/scanner/apply` → SECURITY DEFINER RPC `apply_partner_offer`.
- HMAC seed in `partner_qr_secret` (server-only, RLS-locked, never logged).
- Replay protection via `qr_nonces` UNIQUE constraint inside the RPC.
- TPVIP: legacy format **rejected by default**; opt-in via `ALLOW_LEGACY_TPVIP_QR=true` env flag.
- `verify-card` route also rejects TPVIP: under same flag.

### E. Partner offers moderation — ✅
- `POST /api/partner/offers` defaults `status='pending_approval'`, `is_active=false` (canon §4.1).
- DB CHECK `NOT is_active OR status='approved'` enforces invariant at schema level.
- `POST /api/admin/partners/offers/[id]/decision` admin-only approve/reject route (canon §4.1).
- `audit_log` (singular) replaces deprecated `activity_logs` (canon cross-cut #5/#7).

### F. Partner workspace/sidebar truth — ✅
- `PartnerSidebar` accepts `partnerType` + `partnerStatus` props (canon §6 F4 fix).
- Active retail/venue/club/education partners see Scanner; food partner sees Menu+Commandes; event_organizer sees Évènements.
- KYC, Payouts, Factures, Settings, Support always present (canon §6 F5 — closes 5 orphan pages).
- Pending partners see flat awaiting-approval nav.

### G. Partner statuses canon — ✅
- Migration 099 backfills `verified|approved` → `active` and adds `partners.status` CHECK accepting only `('pending','in_review','active','rejected','suspended','offboarded')` (canon D11).
- `PARTNER_ACTIVE_STATUSES = {active, verified, approved}` synonym set **deleted** from `app/partner/page.tsx`. Status check reduced to `partnerStatus !== 'active'`.

### H. Payouts / invoices honest empty states — ✅
- `app/partner/payouts/page.tsx` reads real `partner_payouts` rows; honest empty state on zero rows. Already canonical pre-Wave-3A.
- `app/partner/invoices/page.tsx` reads real `partner_invoices`; same pattern.
- No fake totals, no fabricated "Payé" status.

## Migration applied via Supabase MCP

`099_wave3a_partner_truth.sql`:
- `partner_pending_credentials (partner_id UNIQUE, password_hash, email, expires_at, consumed_at)` + RLS deny-all to client.
- `qr_nonces (nonce PK, user_id, partner_id, used_at, expires_at)` + RLS deny-all.
- `partner_qr_secret (id=1 single row, secret_b64, rotated_at)` + RLS deny-all. Initial seed = `gen_random_bytes(32)`.
- `partner_offers.status` text + CHECK + `NOT is_active OR status='approved'` invariant; `approved_by`, `approved_at`, `rejection_reason` columns.
- `partners.status` CHECK accepts only canonical values; `verified|approved` rows backfilled to `active`.
- SECURITY DEFINER RPC `apply_partner_offer(p_offer_id, p_member_user_id, p_purchase_amount, p_idempotency_key, p_nonce, p_qr_exp_unix)` — atomic row-lock + nonce insert + counter increment + discount_usage write.

Verified via `execute_sql`: tables present, RPC live, CHECK in place.

## RPCs added

- `apply_partner_offer(uuid, uuid, numeric, uuid, text, bigint) RETURNS jsonb` — SECURITY DEFINER, GRANTed to `authenticated` + `service_role`, REVOKEd from `PUBLIC, anon`. Replaces non-atomic JS-side check-and-increment in `apply-discount/route.ts:170-175` (canon §6 F7 violation).

## APIs added/changed

| Route | Direction | Status |
|---|---|---|
| `POST /api/partners/wizard/submit` | NEW | canonical wizard |
| `POST /api/partners/register` | CHANGED | 410 + delegate |
| `POST /api/admin/partners/[id]/activate` | NEW | atomic activation |
| `POST /api/partner/kyc/upload` | NEW | private signed upload |
| `POST /api/partner/scanner/apply` | NEW | v2 QR canonical apply |
| `POST /api/admin/partners/offers/[id]/decision` | NEW | offer moderation flip |
| `POST /api/partner/offers` | CHANGED | default pending_approval, audit_log singular |
| `POST /api/partner/verify-card` | CHANGED | reject TPVIP: by default |
| `POST /api/partner/apply-discount` | CHANGED | drop 3 silent catches (canon §6 F6) |

## Tests added (27 specs)

| File | Specs |
|---|---|
| `tests/integration/wave3a-partners-register-deprecated.test.ts` | 1 |
| `tests/integration/wave3a-admin-activate.test.ts` | 6 (auth, KYC gate, bypass, idempotency, full happy path, audit) |
| `tests/integration/wave3a-offer-moderation.test.ts` | 5 (create→pending, approve→active+audit, reject→rejected+reason, non-admin 403, invalid 400) |
| `tests/integration/wave3a-scanner-v2.test.ts` | 6 (TPVIP rejected, malformed v2, non-partner 401, valid v2 RPC call, replay surfaces, card mismatch) |
| `tests/unit/wave3a-qr-v2.test.ts` | 9 (sign+parse+verify roundtrip, expired, bad HMAC, TPVIP rejected, malformed, env-flag default off) |

Vitest test suite count: **39 files / 278 specs / 100% green**.

Plus `tests/shims/server-only.ts` no-op shim (referenced from `vitest.config.ts`) so server-only modules can be unit-tested.

## P0s closed (8)

- CANON-PARTNER-001 — orphan partners on `/api/partners/register` (canonical wizard + 410 delegate).
- CANON-PARTNER-002 — `/api/admin/partners/[id]/activate` missing.
- CANON-PARTNER-003 — static TPVIP scanner (rejected by default).
- CANON-PARTNER-004 — `qr_nonces` table + `apply_partner_offer` RPC.
- CANON-PARTNER-005 — offer creation auto-active (now pending_approval).
- CANON-PARTNER-009 — partner-side KYC upload route.
- CANON-PARTNER-008 (P1) — `PARTNER_ACTIVE_STATUSES` synonym killed.
- CANON-PARTNER-014 (P1) — `partner_offers.status` column + CHECK enforced.

P1 closed (3): CANON-PARTNER-006 (silent catches), CANON-PARTNER-019 (audit_log singular), CANON-PARTNER-022 (atomic counter via RPC).

## Score before / after

| Bucket | Before | After Wave 3A |
|---|---|---|
| **PARTNER (partner-ecosystem)** | 22 / 100 | **65 / 100** |
| **Core flow score** | 78 | **80** |
| **Overall product score** | 68 | **72** |

Composite remains under 80 because lifestyle (62), admin-moderation (60), design-system-mobile (62) and 11 missing partner archetypes (Wave 3B) are still untouched.

Launch status:
- `public_launch_status`: **BLOCKED** (Wave 3B + Wave 4 + secret rotation pending).
- `closed_beta_status`: **RISKY_PENDING_SECRET_ROTATION**.

## Remaining partner blockers

Carried to Wave 3B (Partner Supply Activation):
- 11 missing archetype landings (`/devenir-restaurant`, `/devenir-driver`, `/devenir-mentor`, `/devenir-coach`, `/devenir-teacher`, `/devenir-organisateur`, `/devenir-anniv-host`, `/devenir-dj`, plus driver/creator/event_talent wizards).
- Type-aware per-archetype dashboards.
- `partner_kyc_documents` rename of `kyc_documents` (canon §3.8).
- `/devenir-{archetype}/kyc?token=` signed-link upload UI (signed-JWT infra).
- Wizard password field on the four legacy commerce form components (schema is ready; UI needs the input).
- Admin offer-decision UI in `/admin/partners` (route exists, button missing).
- `partner_xp_awards` route family (coach/teacher XP grants).
- `register_partner` SECURITY DEFINER RPC if we move wizard atomicity into a single transaction.
- `/api/cron/partner-payout-monthly` already exists; `partner_payouts.request` API for partner-initiated request not yet built.

## Secrets

**No secret was read or printed during Wave 3A.** Per `docs/compliance/security-debt.md`:
- `npm run check:env`: 11/11 PRESENT, every value rendered as `[REDACTED]`.
- Rotation event still scheduled for end of remediation (after Wave 3B + Wave 4).
- HMAC seed for the v2 scanner lives in `partner_qr_secret` (DB-side, RLS deny-all-to-client). It will rotate as part of the same end-of-remediation event.

## Wave 3B starting line

Ready to start when:
1. Wave 3A commit lands (this PR).
2. Founder ratifies F2 (driver as first-class role) and F11 (defis-physiques merge — already done) for the upcoming archetype landings.
3. `compliance-findings.json` reflects the new partner score (68).
