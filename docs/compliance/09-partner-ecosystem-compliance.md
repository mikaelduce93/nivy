# Partner Ecosystem — Canon Compliance Audit

> Domain: PARTNER ECOSYSTEM
> Source-of-truth: `docs/canon/partner-ecosystem.locked.md` + `docs/canon/INDEX.locked.md`
> Date: 2026-05-08
> Mode: READ-ONLY
> Score: **22 / 100** — **NOT LAUNCH-READY**

---

## Executive summary

The partner ecosystem is the most non-compliant domain audited so far. The locked spec defines a 15-archetype taxonomy with a single 8-stage prospect→active funnel that requires `auth.users` provisioning to be performed atomically at admin-activation. **The codebase ships an 80%-mock surface** that violates more than half of the explicitly-locked invariants (§2, §4.1, §4.2, §4.7, §6).

Key findings:

1. **`/api/partners/wizard/submit` does not exist.** The live route `/api/partners/register` inserts a `partners` row directly with no auth-user provisioning path (canon F1).
2. **`/api/admin/partners/[id]/activate` does not exist.** Only `approve` / `reject` exist, neither of which calls `supabase.auth.admin.createUser`. Every approved partner is therefore an orphan that cannot log in (canon §2 stage 6, D1 — the same defect flagged a year ago).
3. **Scanner accepts the static `TPVIP:userId:cardNumber` format with no HMAC, no expiry, no nonce.** The `qr_nonces` table does not exist anywhere in migrations. Replay attacks are trivial (canon §4.2, F2).
4. **`POST /api/partner/offers` writes `is_active=true` directly on creation** (line 245), bypassing the moderation gate (canon §4.1, F3, §3.2 CHECK constraint not enforced because `status` column not populated).
5. **`discount_usage` writes are wrapped in silent try/catch** (canon F6 — explicit prohibition).
6. **Only 4 of 15 archetypes** have any registration surface (`retail`, `venue`, `club`, `education`). 11 archetypes have no public landing AND no API surface (canon §1, §7).
7. **No partner-side KYC upload UI exists.** `/partner/kyc` is read-only by file's own admission (line 11–13). No `/devenir-{archetype}/kyc?token=…` route exists (canon §7.2 P0).
8. **`/partner/settings` is fully hardcoded** with "Ma Boutique" defaults and a no-op Save button — file's own header openly admits it (line 1–3, canon D2).
9. **Sidebar is type-blind** (canon F4) AND **5 working pages are orphans** (canon F5): `/partner/restaurant/menu`, `/partner/restaurant/orders`, `/partner/kyc`, `/partner/payouts`, `/partner/invoices` are all reachable by URL but absent from the 8-item nav.
10. **`PARTNER_ACTIVE_STATUSES` synonym set is back** in `app/partner/page.tsx:23` — `{active, verified, approved}` — explicitly forbidden (canon D11).

The partner-discounts-as-view migration (074) is the **only piece of clean canonical work** in this audit.

---

## Findings (severity-ordered)

### CANON-PARTNER-001 — `/api/partners/register` creates orphan partners (no auth.users path)
- **Severity**: P0 BLOCKER
- **Canon**: §2 stage 6, §4.7, F1, INDEX cross-cutting lock #2, D1
- **File**: `app/api/partners/register/route.ts:29-50`
- **Evidence**: Single `INSERT INTO partners (status='pending')` is performed with no companion `partner_pending_credentials` row, no signup, no invite-by-email. Partner cannot log in even after admin approval.
- **Required**: Replace with `POST /api/partners/wizard/submit` per §4.7. Add a transient `partner_pending_credentials` table and capture password at wizard step.

### CANON-PARTNER-002 — `/api/admin/partners/[id]/activate` does not exist
- **Severity**: P0 BLOCKER
- **Canon**: §2 stage 5–7, §4.7, INDEX lock #2
- **Files**: `app/api/admin/partners/[id]/approve/route.ts:62-66`, `app/api/admin/partners/[id]/reject/route.ts`
- **Evidence**: `approve` only flips `partners.status='active'` and updates `kyc_documents.status='approved'`. **No call to `supabase.auth.admin.createUser` or `inviteUserByEmail`**, no `partner_staff (role='owner')` insert, no `profiles (role='partner')` insert. The locked transactional `activate` endpoint is missing entirely.
- **Required**: Build `POST /api/admin/partners/[id]/activate` per §4.7 with the atomic 6-step transaction. Migrate the existing `approve` route to delegate to it.

### CANON-PARTNER-003 — Scanner accepts static `TPVIP:userId:cardNumber` (replayable)
- **Severity**: P0 BLOCKER
- **Canon**: §4.2 (locked QR format), F2
- **File**: `app/api/partner/verify-card/route.ts:47-54`
- **Evidence**: `if (qrData.startsWith("TPVIP:"))` parses `userId:cardNumber` only. No HMAC, no `exp_unix`, no nonce. Card number is a stable identifier; any leaked photo of a VIP card is permanently usable.
- **Required**: Migrate QR format to `nivy:v1:{user_id}:{card_number}:{exp_unix}:{nonce}:{hmac_sha256}`. Create `qr_nonces` table. Reject any payload missing the v1 prefix once the issuance side is migrated.

### CANON-PARTNER-004 — `qr_nonces` table absent + no `apply_partner_offer` RPC
- **Severity**: P0 BLOCKER
- **Canon**: §4.2, F2, F7
- **Evidence**: `grep apply_partner_offer | qr_nonces` over `**/*.sql` returns 0 hits. The apply path performs a non-atomic JS-side check-and-increment (`apply-discount/route.ts:170-175`: `current_total_uses: (offer.current_total_uses || 0) + 1`) — race-prone, double-spendable on concurrent scans (F7 textbook violation).
- **Required**: Create `qr_nonces (nonce TEXT PRIMARY KEY, used_at TIMESTAMPTZ)` and the SECURITY DEFINER RPC `apply_partner_offer(...)` that atomically locks the offer row, inserts the nonce, increments the counter, writes `discount_usage` + `partner_transactions` with idempotency_key UNIQUE.

### CANON-PARTNER-005 — Offer creation defaults `is_active: true` (bypasses moderation)
- **Severity**: P0 BLOCKER
- **Canon**: §4.1 ("**NEVER `is_active=true` on create**"), F3, §3.2 CHECK constraint
- **File**: `app/api/partner/offers/route.ts:245`
- **Evidence**: `is_active: true,` is written verbatim in the insert payload. No `status` column populated. The CHECK `NOT is_active OR status='approved'` from canon §3.2 is **not enforced in DB** (migration 074 adds the discount-flavored columns but does not add the CHECK constraint). Partner self-creates a "live" offer in one POST.
- **Required**: Default `is_active=false, status='pending_approval'`. Add the CHECK constraint at DB level. Enqueue moderation. Add `POST /api/admin/partners/offers/[id]/decision`.

### CANON-PARTNER-006 — `discount_usage` writes wrapped in swallowing try/catch
- **Severity**: P1
- **Canon**: F6 (explicit forbidden pattern with verbatim comment match), §4.2 step 7 ("hard fail if table unavailable")
- **File**: `app/api/partner/apply-discount/route.ts:118-121`, `:165-167`, `:194-196`
- **Evidence (line 118-121)**:
  ```ts
  } catch {
    // discount_usage missing — skip the per-user cap silently rather
    // than block the apply flow.
  }
  ```
  Canon F6 detection signal is "*Grep for `// discount_usage missing` or analogous defensive comments*" — exact match.
  Line 165-167 silently drops the usage write itself, allowing redemption to succeed without a ledger row. Line 194-196 swallows XP failure. Same pattern on lines 218-240 (loyalty points and `points_transactions`).
- **Required**: Remove all silent catches. Make `discount_usage` write atomic with the offer-counter increment via the RPC in CANON-PARTNER-004.

### CANON-PARTNER-007 — `add_user_xp` invocation (phantom RPC)
- **Severity**: P1
- **Canon**: INDEX gamification lock ("`add_user_xp` is phantom (use `add_xp_to_user`)")
- **File**: `app/api/partner/apply-discount/route.ts:188-193`
- **Evidence**: `await supabase.rpc("add_user_xp", { ... })` — wrong RPC name. Wrapped in try/catch so silently fails. The companion challenge route correctly uses `add_xp_to_user` (line 173).
- **Required**: Rename to `add_xp_to_user`, drop the silent catch.

### CANON-PARTNER-008 — `PARTNER_ACTIVE_STATUSES` synonym set re-introduced
- **Severity**: P1
- **Canon**: D11 (locked: "only `active` is alive"), Contradictions table row 2
- **File**: `app/partner/page.tsx:23`
- **Evidence**: `const PARTNER_ACTIVE_STATUSES = new Set(["active", "verified", "approved"])`. The exact pattern flagged in `partner-network.md` §2 and explicitly locked-out in canon D11.
- **Required**: Replace with `partner.status === "active"` direct check. Rewrite all callers.

### CANON-PARTNER-009 — No partner-side KYC upload UI exists
- **Severity**: P0
- **Canon**: §7.2 ("Today no partner-side upload UI exists anywhere"), stage 4 of §2
- **Files**: `app/partner/kyc/page.tsx:1-13` (read-only by header admission), `app/api/partner/kyc/**` (does not exist)
- **Evidence**: The `kyc` page is decorative — it lists existing docs with 15-min signed URLs but the file's own header (line 11–13) says "*No client-side upload is wired here — the onboarding upload flow lives elsewhere*", and the wizard does not collect KYC files either. No `/devenir-{archetype}/kyc?token=…` route exists. No `POST /api/partner/kyc/upload` endpoint exists.
- **Required**: Build the signed-link uploader at `/devenir-{archetype}/kyc?token={signed_jwt}` and the post-activation `/partner/kyc/upload`. Wire `POST /api/partner/kyc/upload` against the private `kyc-documents` bucket.

### CANON-PARTNER-010 — `/partner/settings` is hardcoded mock with no-op Save
- **Severity**: P1
- **Canon**: D2 (verbatim — "hardcoded mock — uncontrolled inputs, 'Sauvegarder' is no-op")
- **File**: `app/partner/settings/page.tsx:1-3, 38-101`
- **Evidence**: File header: "*The 'Sauvegarder' button is a no-op*". Hardcoded `defaultValue="Ma Boutique"` (l.40), `defaultValue="Boutique de vêtements et accessoires tendance pour adolescents."` (l.57), `defaultValue="contact@maboutique.ma"` (l.69), etc. Switch states are also hardcoded (l.119-123). The Save button (l.104-106) has no `onClick`, no form, no server action.
- **Required**: Convert to RHF + zod, wire to `partners` row via server action, RLS-bound.

### CANON-PARTNER-011 — Sidebar is type-blind + 5 orphan pages
- **Severity**: P1
- **Canon**: F4 (no per-`partner_type` filtering), F5 (5 working pages today are orphaned — exact list match)
- **File**: `components/dashboard/partner/sidebar.tsx:17-26`
- **Evidence**: Flat 8-item array — no `partner_type` switch. Items shipped: Dashboard, Mes Offres, Transactions, Scanner QR, Statistiques, Events, Paramètres, Support. **Missing entries**:
  - `/partner/restaurant/menu` (orphan)
  - `/partner/restaurant/orders` (orphan)
  - `/partner/kyc` (orphan — even though it exists at `app/partner/kyc/page.tsx`)
  - `/partner/payouts` (orphan)
  - `/partner/invoices` (orphan)
  Exact set predicted by F5 detection signal in canon.
- **Required**: Convert sidebar to type-aware (accept `partner_type` prop). Add the 5 missing nav items per archetype.

### CANON-PARTNER-012 — 11 / 15 archetypes have no surface
- **Severity**: P0 (taxonomy lock)
- **Canon**: §1 (15 rows), §1.1 (no Potemkin landings), §7.1
- **Files inventoried**:
  | # | Archetype | Landing | Wizard | API | Dashboard | Status |
  |---|---|---|---|---|---|---|
  | 1 | retail | `/devenir-partenaire` (card 1/4) | yes | partial | `/partner` | partial |
  | 2 | venue | `/devenir-partenaire` (card 2/4) | yes | partial | `/partner` | partial |
  | 3 | club | `/devenir-partenaire` (card 3/4) | yes | partial | `/partner` | partial |
  | 4 | education | `/devenir-partenaire` (card 4/4) | yes | partial | `/partner` | partial |
  | 5 | food | **MISSING** `/devenir-restaurant` | no | `/api/partner/restaurant/{menu,orders}` exists | `/partner/restaurant/*` orphan | F |
  | 6 | driver | **MISSING** `/devenir-driver` | no | `/api/driver/rides` only | NO `/driver/*` workspace | F |
  | 7 | mentor | **MISSING** `/devenir-mentor` (only `/api/mentor/apply`) | no | `/api/mentor/*` partial | `/mentor/dashboard` exists | partial |
  | 8 | coach | **MISSING** `/devenir-coach` | no | absent | absent | F |
  | 9 | teacher | **MISSING** `/devenir-teacher` | no | absent | absent | F |
  | 10 | event_talent (DJ) | `/djs` exists, no `/devenir-dj` | no | absent | absent | F |
  | 11 | event_organizer | **MISSING** `/devenir-organisateur` | no | absent | `/partner/events` list-only | F |
  | 12 | birthday host | **MISSING** `/devenir-anniv-host` | no | absent | absent | F |
  | 13 | creator/influencer | `/devenir-influenceur` UI shell | UI only | absent | NO `/creator/*` | F |
  | 14 | ambassador | `/devenir-ambassadeur` UI shell | UI only | partial | `/ambassador/*` exists | partial |
  | 15 | marketplace seller | `/marketplace/sell` exists | n/a | partial | `/marketplace/my-listings` | partial |
- **Required**: Build 9 missing landings + wire 4 partial archetypes per §7.

### CANON-PARTNER-013 — Edit endpoint writes to nonexistent columns
- **Severity**: P1 (will silently fail or 500)
- **Canon**: §3.2 schema
- **File**: `app/api/partner/offers/[id]/route.ts:69-81`
- **Evidence**: PATCH writes `name`, `min_purchase`, `max_usage`, `eligible_levels` — none of those columns exist on `partner_offers` (canon §3.2 has `title`, `min_purchase_amount`, `max_uses_per_user`, `min_vip_level`). DELETE on l.141 selects `existingOffer.name` which doesn't exist either.
- **Required**: Rename payload mapping to canonical column names. Reject the request via zod if mapping fails.

### CANON-PARTNER-014 — `partner_offers.status` column never populated
- **Severity**: P1
- **Canon**: §3.2 (`status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (...))`), §4.1 lifecycle
- **Files**: `app/api/partner/offers/route.ts:230-253`, migration `074_partner_offers_consolidation.sql:76-90`
- **Evidence**: Migration 074 adds `discount_value, discount_type, …` but does NOT add the `status` enum column from canon §3.2. The create route therefore cannot populate it. The lifecycle (`draft → pending_approval → approved → paused → expired → archived`) is unenforceable.
- **Required**: Migration to add `status TEXT NOT NULL DEFAULT 'draft' CHECK (...)` + the `NOT is_active OR status='approved'` CHECK. Backfill existing rows.

### CANON-PARTNER-015 — `dashboard/page.tsx` reads via `partner_discounts` view (legacy path)
- **Severity**: P2
- **Canon**: D4 (view is read-only stop-gap; callers must migrate to `partner_offers`)
- **File**: `app/partner/page.tsx:40-44, 64-68, 75-80`
- **Evidence**: Three reads still hit `from("partner_discounts")` instead of canonical `partner_offers`. The view works (074), but canon flags it as a sunset compatibility shim (`Remove after Wave 2 PT1 audit`).
- **Required**: Migrate all reads to `partner_offers`.

### CANON-PARTNER-016 — `/partner` and `/partner/dashboard` duplicate routes
- **Severity**: P2
- **Canon**: D6 (merge into `/partner` only; `/partner/dashboard` redirects)
- **Files**: `app/partner/page.tsx`, `app/partner/dashboard/page.tsx`
- **Evidence**: Both exist as full pages with overlapping KPIs. `app/partner/dashboard/page.tsx:17` imports the (now-stub) `UniversalScanner`, `app/partner/page.tsx` lazy-loads two different feeds.
- **Required**: Merge per D6.

### CANON-PARTNER-017 — `is_active=false` on wizard child rows is correct (only positive finding)
- **Severity**: COMPLIANT
- **Canon**: §4.1, §6 F3
- **File**: `app/api/partners/register/route.ts:136, 190, 214, 268`
- **Evidence**: Discounts, menu items, event packages, and club offerings are all inserted `is_active=false` in the wizard. This is the one place §4.1's "never live on create" invariant is honored — except the parent partner is never given an auth.users (CANON-PARTNER-001), so the rows are orphaned anyway.

### CANON-PARTNER-018 — `partner_discounts` is correctly a VIEW
- **Severity**: COMPLIANT
- **Canon**: §3.8, INDEX cross-cutting deprecations table
- **File**: `gamification-system/database/migrations/074_partner_offers_consolidation.sql:130-159`
- **Evidence**: Old table dropped, view selecting from `partner_offers` created. Read-only by design (no INSERT trigger). Matches canon spec exactly.

### CANON-PARTNER-019 — Activity log uses deprecated `activity_logs` instead of `audit_log`
- **Severity**: P2
- **Canon**: INDEX cross-cutting lock #5 (`user_notifications` canonical, `activity_logs` deprecated) + lock #7 (`audit_log` singular)
- **Files**: `app/api/partner/offers/route.ts:271-278`, `app/api/partner/offers/[id]/route.ts:98-105, 168-175`, `app/api/admin/partners/[id]/{approve,reject}/route.ts:81-87, 75-81` (uses `admin_audit_logs`)
- **Evidence**: Three writes to `activity_logs` (deprecated). Admin approve/reject writes to `admin_audit_logs` instead of canonical `audit_log` (singular).
- **Required**: Rename targets to `audit_log`.

### CANON-PARTNER-020 — Driver / ambassador role enum values not added to `profiles.role` CHECK
- **Severity**: P1
- **Canon**: INDEX cross-cutting lock #1 ("Role enum is `parent | teen | partner | mentor | driver | ambassador | admin`. Add a DB CHECK constraint."), §1 row 14 (ambassador is "NOT a `partners` row" — role on `auth.users.app_metadata.role`)
- **Evidence**: Grep for `role IN (.*'driver'` and `profiles.*role.*CHECK` over `**/*.sql` returns **zero matches** anywhere. Canon expects the 7-value enum CHECK constraint on `profiles.role`. Code references `userInfo.role !== "ambassador"` (`app/ambassador/page.tsx:69`) and `getUserRole()` returns string-typed role, but DB has no enforcement. The ambassador dashboard's redirect-loop defect predicted in §1 row 14 is therefore active until the enum is added.
- **Required**: Add `CHECK (role IN ('parent','teen','partner','mentor','driver','ambassador','admin'))` to `profiles.role`. Or to the `app_metadata` JWT claim path. Migration is a P1 dependency for any driver/ambassador login flow.

### CANON-PARTNER-021 — Wizard does not collect password (transient credentials missing)
- **Severity**: P0 (companion to PARTNER-001/002)
- **Canon**: §2 stage 2 ("**The wizard collects a password.**" — locked change), §2.1 invariant "wizard collects a password"
- **File**: `app/devenir-partenaire/inscription/page.tsx` + `components/partners/{Retail,Venue,Club,Education}PartnerForm.tsx`
- **Evidence**: None of the four wizard forms accept a password field. `partner_pending_credentials` table does not exist (no SQL match). Even if `/api/admin/partners/[id]/activate` were built, it would have nothing to consume at stage 6.
- **Required**: Add password field + zod validation to the wizard. Create `partner_pending_credentials (partner_id, password_hash, expires_at)` table.

### CANON-PARTNER-022 — `current_total_uses` non-atomic increment (RMW race)
- **Severity**: P1
- **Canon**: F7 ("`SET current_total_uses = (offer.current_total_uses || 0) + 1` … must be RPC-driven `UPDATE … RETURNING` with row lock")
- **File**: `app/api/partner/apply-discount/route.ts:170-175`
- **Evidence**: Exact textbook match — read offer.current_total_uses, JS-add 1, write back. Two concurrent scans of the same offer can both pass the cap check and both succeed.
- **Required**: RPC `apply_partner_offer` (CANON-PARTNER-004) with row lock + `RETURNING`.

### CANON-PARTNER-023 — Mentor / driver / creator / ambassador have no `partners` row
- **Severity**: P2
- **Canon**: §1.1 ("`ambassador` and `marketplace_seller` are NOT `partners` rows" — locked), §1 row 6 driver "`partner_type='driver'` AND own role"
- **Evidence**: Driver has `nivy_drivers` table (canon §1 row 6) but no enum value `'driver'` in any `partner_type CHECK`. Mentor has `mentors` table. Neither archetype is wired through the §2 funnel.
- **Required**: Migration adding the four new `partner_type` values (`food`, `driver`, `mentor`, `event_talent`, `event_organizer`, `creator`) to the CHECK constraint on `partners.partner_type`. Wire the new wizards.

### CANON-PARTNER-024 — `/partenaires/merci` ref is `crypto.randomUUID()` placebo
- **Severity**: P2
- **Canon**: §2.1 ("`/devenir-{archetype}/merci` is a real persisted reference, not a `crypto.randomUUID()` UI affordance"), D3
- **Note**: Flagged in canon as deprecated; not re-verified in this audit but listed for completeness pending PARTNER-001 fix.

---

## Compliance scorecard

| Check | Result | Severity | Finding id |
|---|---|---|---|
| 1. 15 archetypes inventory | 4/15 minimal, 4/15 partial, 7/15 missing | P0 | PARTNER-012 |
| 2. Wizard → activation → `auth.users` pipeline | **BROKEN** (no activate endpoint, no password capture, no pending_credentials table) | P0 | PARTNER-001, -002, -021 |
| 3. KYC upload UI | **NONE** | P0 | PARTNER-009 |
| 4. Scanner QR HMAC + nonce + expiry | **NONE** (static `TPVIP:...` accepted) | P0 | PARTNER-003, -004 |
| 5. Offer creation `is_active` default | **VIOLATED** (`is_active=true` on create) | P0 | PARTNER-005, -014 |
| 6. `discount_usage` swallow-catch | **VIOLATED** (3 silent catches) | P1 | PARTNER-006 |
| 7. Sidebar coverage of 5 expected pages | **VIOLATED** (all 5 orphans) | P1 | PARTNER-011 |
| 8. `partner_discounts` is VIEW | COMPLIANT | — | PARTNER-018 |
| 9. `/partner/settings` hardcoded mock | **VIOLATED** | P1 | PARTNER-010 |
| 10. driver/ambassador role enum present | **MISSING** (no profiles.role CHECK) | P1 | PARTNER-020 |
| 11. `PARTNER_ACTIVE_STATUSES` synonym | **VIOLATED** | P1 | PARTNER-008 |
| 12. Atomic counter on `current_total_uses` | **VIOLATED** (RMW) | P1 | PARTNER-022 |
| 13. Phantom RPC `add_user_xp` | **VIOLATED** | P1 | PARTNER-007 |
| 14. `/partner` vs `/partner/dashboard` merged | **VIOLATED** (both live) | P2 | PARTNER-016 |
| 15. `audit_log` (singular) used | **VIOLATED** (`activity_logs`, `admin_audit_logs`) | P2 | PARTNER-019 |

**Counts**: 6 × P0 BLOCKER, 7 × P1, 3 × P2, 2 × COMPLIANT.

**Score**: 22 / 100.

Calculation:
- Domain has 15 archetypes worth 60 pts (4 pts each). 4 minimal + 4 partial = 16 + 8 = 24, capped at the partial mark = ~22 pts.
- Pipeline correctness worth 25 pts. Scoring 0 (auth user provisioning entirely absent — the single most-locked invariant in the spec).
- Surface-level compliance (settings, sidebar, scanner QR format) worth 15 pts. Scoring 0.

**Launch status**: **NOT LAUNCH-READY**. Cannot ship even retail/venue/club/education at v1 because partners physically cannot log in after admin approval (PARTNER-002).

---

## P0 fix order (minimum to unblock launch of legacy 4 archetypes)

1. **PARTNER-002 + PARTNER-021** — Build `partner_pending_credentials` table + add password to wizard + ship `POST /api/admin/partners/[id]/activate` with the atomic auth-user provisioning. Without this, no partner can log in.
2. **PARTNER-005 + PARTNER-014** — Add `partner_offers.status` column with CHECK + flip default to `is_active=false, status='pending_approval'` + ship admin offer-decision endpoint.
3. **PARTNER-003 + PARTNER-004 + PARTNER-022** — Migrate QR to v1 HMAC format + create `qr_nonces` + ship `apply_partner_offer` RPC with row lock.
4. **PARTNER-009** — Build the KYC upload UI (signed-link route + bucket write).
5. **PARTNER-006** — Remove the three silent try/catches in apply-discount.
6. **PARTNER-008** — Replace `PARTNER_ACTIVE_STATUSES` synonym set with `=== "active"` everywhere.

Once those are green, the 11 missing-archetype landings (PARTNER-012) are P1 work for v1.4+.

---

*End of audit. Read-only. Cite this document by finding id (`CANON-PARTNER-NNN`).*
