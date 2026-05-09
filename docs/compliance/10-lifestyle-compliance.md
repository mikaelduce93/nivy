# 10. LIFESTYLE — Canon compliance audit

**Domain**: rides / food / mentors / internships / pathways
**Source of truth**: `docs/canon/lifestyle.locked.md` + `docs/canon/INDEX.locked.md`
**Method**: read-only static audit of `app/`, `gamification-system/database/migrations/`, `vercel.json`, scripts.
**Date**: 2026-05-08
**Score**: **62 / 100** — DO NOT LAUNCH (P0 blockers in money pipeline + missing supply + missing surfaces)
**Launch status**: **BLOCKED**

---

## Severity legend

| Sev | Meaning |
|---|---|
| **P0** | Will break money/safety in production. Must fix before any teen interacts. |
| **P1** | Will break a user journey or violate canon rule. Must fix before launch. |
| **P2** | Drift from canon, won't break runtime, fix in next wave. |
| **P3** | Cosmetic / informational. |

---

## Findings

### CANON-LIFE-001 — Admin refund writes `'refunded'` to `ride_bookings.status` (NOT in CHECK constraint)

- **Severity**: **P0** (will fail in production with `check constraint violation`)
- **File**: `C:\Users\Shadow\Desktop\NIVY\app\api\admin\refunds\route.ts:401-406`
- **Canon rule**: `lifestyle.locked.md` §1 — `ride_bookings.status` CHECK is `('requested','approved','denied','dispatched','in_progress','completed','cancelled')`. There is no `'refunded'` value. Also §8 #1 — direct ride status writes are forbidden outside the four canonical RPCs and the curfew cron.
- **Schema source**: `gamification-system/database/migrations/057_transport_mobility.sql:54-55`.
- **Evidence**: route does `await sr.from("ride_bookings").update({ status: "refunded" })`. The same handler also short-circuits on `ride.status === "refunded"` (line 396), but that branch is unreachable because no row can ever hold that value.
- **Impact**: every admin ride refund will throw at the DB layer; teen never gets coins back.
- **Fix**: either (a) add `'refunded'` to the CHECK and ship a `refund_ride` RPC that does the coin clawback + ledger, or (b) reuse `cancel_ride` with `reason='admin_refund'` and credit coins via a service-role helper. Recommendation: ship `refund_ride` RPC mirroring `complete_ride`.

### CANON-LIFE-002 — Admin refund writes `'refunded'` to `food_orders.status` (NOT in CHECK constraint)

- **Severity**: **P0**
- **File**: `C:\Users\Shadow\Desktop\NIVY\app\api\admin\refunds\route.ts:323-329`
- **Canon rule**: `lifestyle.locked.md` §2 — `food_orders.status` CHECK is `('pending','accepted','preparing','ready','out_for_delivery','delivered','cancelled','rejected')`. No `'refunded'`.
- **Schema source**: `gamification-system/database/migrations/058_food_delivery.sql:64-66`.
- **Impact**: identical to LIFE-001 — every admin food refund throws.
- **Fix**: extend the `food_orders.status` enum with `'refunded'` (or use `'cancelled'` + a `refund_id`) and route through a `refund_food_order` RPC; do not direct-write from the API.

### CANON-LIFE-003 — `mentor_can_dm_teen` window-gate has zero call sites

- **Severity**: **P1** (CNDP-grade safety gap; not yet exploitable because the only DM path requires friendship, but canon §8 #4 mandates the gate "each violation must mint a `mentor_strikes` row")
- **File evidence**: `C:\Users\Shadow\Desktop\NIVY\app\api\teen\messages\route.ts:171-180` (the only DM gate is `are_friends`).
- **Search**: grep for `mentor_can_dm_teen` returns 0 hits in `app/` and `lib/`. Only in canon docs and migration `064_mentorship_safety.sql`.
- **Canon rule**: §3 ("`mentor_can_dm_teen(mentor_id, teen_id)` RPC is the chat-API gate") + §8 #4.
- **Impact**: if a teen ever friends a mentor (current friend RPCs don't block role='mentor'), they can DM 24/7 with no window enforcement and no strike tracking. There is no separate mentor-DM channel.
- **Fix**: either (a) ship a separate `/api/mentor/dm` route that calls `mentor_can_dm_teen` and inserts `mentor_strikes` on FALSE, or (b) extend `direct_messages` RLS / `are_friends` to call the RPC when one side is `role='mentor'`.

### CANON-LIFE-004 — `pathway_milestones` table + `advance_pathway_milestone` RPC missing (canon flagged, confirmed)

- **Severity**: **P1** (founder decision D5 — primitive needs design; locks `recommend_for_teen('pathway')`)
- **Canon rule**: `lifestyle.locked.md` §4 ("Milestones are decorative today"), §6 (RPC marked MISSING), §10 D5.
- **Evidence**: zero occurrences of `pathway_milestones` or `advance_pathway_milestone` in code or migrations.
- **File**: `C:\Users\Shadow\Desktop\NIVY\app\teen\pathways\page.tsx` and `gamification-system/database/migrations/059_mentorship_career.sql:114-123` (`teen_pathway_progress.total_milestones DEFAULT 10` is a placeholder).
- **Fix**: per canon D5 recommendation — design table, ship RPC, hand-curate 5–7 milestones per seeded pathway. Until then, decorative is acceptable but must be flagged to founder.

### CANON-LIFE-005 — `/teen/internships/[id]` detail page missing AND card uses `<span>` not `<Link>`

- **Severity**: **P1** (canon flagged the missing route; this audit additionally confirms the CTA is not even a navigable element)
- **File**: `C:\Users\Shadow\Desktop\NIVY\app\teen\internships\page.tsx:339-352`
- **Canon rule**: `lifestyle.locked.md` §4 + §9 ("`/teen/internships/[id]` detail page (the card 'Voir les details' link is dead)").
- **Evidence**: `<span>` with `aria-disabled` rendered as the CTA. No `<Link href="/teen/internships/${id}">`. There is no route file under `app/teen/internships/[id]/`.
- **Impact**: teens cannot read internship description, deadline, application form, or apply via UI. The `apply_to_internship` RPC + `/api/teen/internships/[id]/apply` exist but are unreachable from the teen UI.
- **Fix**: ship `app/teen/internships/[id]/page.tsx` with description, application form, and apply button; replace the `<span>` with `<Link>`.

### CANON-LIFE-006 — `/teen/pathways/[slug]` detail page missing

- **Severity**: **P1**
- **File**: glob `app/teen/pathways/[slug]/**/*` returns nothing.
- **Canon rule**: §4 ("`/teen/pathways/[slug]` — **MISSING**") + §9.
- **Impact**: teen can declare a pathway via `DeclarePathwayButton` but has no detail surface to track progress, view recommended quizzes/partners/mentors. The `recommended_*` arrays on `career_pathways` are populated by no migration and surfaced by no UI.
- **Fix**: ship `app/teen/pathways/[slug]/page.tsx` once milestones primitive (LIFE-004) lands.

### CANON-LIFE-007 — Driver workspace `app/driver/**` does not exist

- **Severity**: **P1** (drivers literally cannot log in)
- **Glob**: `app/driver/**/*` returns nothing.
- **APIs that exist (orphaned)**: `app/api/driver/rides/[id]/dispatch/route.ts`, `track/route.ts`, `complete/route.ts`.
- **Canon rule**: §1 ("Driver workspace (the page rendering `app/driver/`) is **MISSING**") + §9.
- **Impact**: a driver who is KYC-approved and active has no Next.js route. The lifecycle `dispatched → in_progress → completed` cannot proceed without a UI calling `/api/driver/rides/[id]/{dispatch,track,complete}`.
- **Fix**: ship `app/driver/dashboard/page.tsx` + `app/driver/rides/[id]/page.tsx`. Also requires `profiles.role='driver'` enum value (cross-cutting INDEX lock #1; current profiles enum lacks driver per `auth-onboarding.locked.md` line 53).

### CANON-LIFE-008 — Supplier signup public funnels missing (`/devenir-driver`, `/devenir-mentor`, `/devenir-restaurant`)

- **Severity**: **P1** (no public path to onboard supply)
- **Canon rule**: §9 ("Restaurant signup public funnel… Driver signup public funnel… Mentor signup public funnel").
- **Evidence**:
  - `app/devenir-partenaire/inscription/page.tsx` exists (generic partner)
  - `app/devenir-ambassadeur/candidature/page.tsx` exists
  - `app/devenir-influenceur/candidature/page.tsx` exists (per INDEX F3 should be folded into ambassador)
  - `/devenir-driver`, `/devenir-mentor`, `/devenir-restaurant` are absent.
- **Impact**: zero organic supply acquisition. Mentors cannot reach `apply_mentor` RPC, drivers cannot reach `POST /api/driver/apply` (which itself doesn't exist), restaurants depend on admin manual creation.
- **Fix**: ship three public landing pages → candidature forms → admin queue. Restaurant flow can short-cut as `sub_category='restaurant'` on the existing `/devenir-partenaire` form if the founder accepts.

### CANON-LIFE-009 — Empty supply tables (mentors, nivy_drivers, menu_items, internships, partners with sub_category='restaurant')

- **Severity**: **P1** (classified per spec — supply gap, not code bug, but launch-blocking)
- **Evidence**: no `INSERT INTO public.mentors|nivy_drivers|menu_items|internships` statements anywhere in `gamification-system/database/migrations/`. The `verify-*.ts` scripts insert ephemerally with `Date.now()`-suffixed emails for test runs only.
- **Canon rule**: implicit — UI consumes these tables; teen sees `EmptyState` everywhere.
- **Files relying on this data**:
  - `app/teen/mentors/page.tsx` (mentor discovery)
  - `app/teen/food/page.tsx` (restaurant discovery)
  - `app/teen/food/[partner_id]/page.tsx` (menu)
  - `app/teen/internships/page.tsx`
  - `app/admin/drivers/page.tsx` (KYC queue empty)
- **Fix**: either (a) create a `099_lifestyle_supply_seed.sql` with 3 mentors + 2 drivers + 1 restaurant + 5 menu items + 3 internships for launch demo, or (b) onboard real supply via the missing funnels (LIFE-008) before public launch.

### CANON-LIFE-010 — `track` route writes ride status directly (allowed by canon §1 lifecycle, but conflicts with §8 #1)

- **Severity**: **P2** (internal canon contradiction; current code matches the lifecycle table)
- **File**: `C:\Users\Shadow\Desktop\NIVY\app\api\driver\rides\[id]\track\route.ts:48`
- **Code**: `await admin.from("ride_bookings").update({ status: "in_progress" }).eq("id", id)` (direct UPDATE, no RPC).
- **Canon rule conflict**:
  - §1 lifecycle table line 36 explicitly says: "Driver tracking ping … inserts `ride_tracks` rows; ride may flip to `in_progress` on first ping" — this is canonical.
  - §8 #1 forbidden patterns says: "All transitions go through `request_ride / dispatch_ride / complete_ride / cancel_ride` or the curfew cron."
- **Impact**: code is consistent with §1 but violates §8 letter. Either canon or code must change.
- **Fix**: recommend §8 be amended to whitelist the track-route status flip, OR ship a thin `start_ride(p_ride_id)` RPC and call from track. Cheaper option is the canon amendment.

### CANON-LIFE-011 — Ride request form does not expose `curfewOverride` or parent-on-behalf

- **Severity**: **P2** (canon §9 explicit — "Parent UI surface to set `curfew_override=true` when requesting a late ride on behalf of a teen")
- **File**: `C:\Users\Shadow\Desktop\NIVY\app\teen\rides\request\request-form.tsx:23-40` (zod schema has no `curfewOverride` field), `app/api/teen/rides/request/route.ts:52-67` (server accepts the param).
- **Canon rule**: §1 ("`curfew_override` may only be set by a parent of the teen") + §9.
- **Impact**: a parent who needs to schedule a 22:30 pickup for a teen has no UI lever; `request_ride` will throw `curfew_violation`.
- **Fix**: add a parent-only `curfew_override` checkbox visible when role='parent' (router redirect if teen tries) and pass through.

### CANON-LIFE-012 — Provider selector hard-coded to `nivy_partner` in ride request

- **Severity**: **P3**
- **File**: `app/teen/rides/request/request-form.tsx` (zod schema omits `provider`), `app/api/teen/rides/request/route.ts:58` defaults to `'nivy_partner'`.
- **Canon rule**: §9 ("Provider selector in the ride request form (API accepts 4 providers; UI hard-codes `nivy_partner`)").
- **Fix**: add radio group for `('nivy_partner','careem','heetch','public_transport')`.

### CANON-LIFE-013 — `partner_accept_food_order` 058_rpcs version still inserts `partner_transactions` (would double-insert if 058 wins migration order)

- **Severity**: **P3** (informational — 061 rewrite at line 339 supersedes; verify migration application order)
- **Files**:
  - `gamification-system/database/migrations/058_food_delivery_rpcs.sql:236-243` (old: INSERT INTO partner_transactions inside accept)
  - `gamification-system/database/migrations/061_wave_b_money_pipeline.sql:339-402` (rewrite: only stamps scanner_user_id; the comment at line 333-337 explicitly notes the B.3 fix)
- **Canon rule**: §2 + §8 #8 ("Coin debit before partner accept (food autonomous path)" / "do not attempt to 'double capture' on partner accept").
- **Status**: **PASS** — 061 ships chronologically after 058 and `CREATE OR REPLACE FUNCTION` will overwrite. Confirmed safe in current migration tree. Flagged only because the older bad code is still in repo and could be re-applied if 061 is reverted.
- **Fix**: optional — add a comment block to 058_rpcs noting it is superseded; or rewrite 058_rpcs to match 061's logic.

### CANON-LIFE-014 — `place_food_order` cashback hard-codes 10% instead of reading `cashback_rules`

- **Severity**: **P2** (drifts from canon "Cashback: 10% (default) of `total_coins` as XP, configured via `cashback_rules` table or `xp_payment_settings.default_cashback_pct`")
- **File**: `gamification-system/database/migrations/058_food_delivery_rpcs.sql:159` — `v_cashback_xp := FLOOR(v_total_coins * 0.10)::int;` (literal 10%)
- **Canon rule**: §2 ("Cashback rate config-driven via cashback_rules"). Note the actual coin debit goes through `spend_teen_coins` (061:37-171) which DOES read `cashback_rules` — so the *real* cashback is config-driven; this `v_cashback_xp` value is only stored in `food_orders.cashback_xp` for the records column, and `partner_reject_food_order` (061:721) uses it for reversal.
- **Impact**: if `cashback_rules` is set to anything other than 10%, the *displayed* cashback in the order row drifts from the *actual* cashback awarded. Reversal math on rejection will then over- or under-reverse XP.
- **Fix**: in `place_food_order`, mirror the cashback-rules lookup from `spend_teen_coins`/`complete_ride` and store the resolved value into `food_orders.cashback_xp`.

### CANON-LIFE-015 — Curfew cron uses fixed UTC offset instead of `Africa/Casablanca` timezone

- **Severity**: **P3** (Morocco does not observe DST in 2026; UTC+1 is correct year-round per the cron's own comment, so functional risk is nil — but canon says TZ should be authoritative)
- **File**: `app/api/cron/ride-curfew-check/route.ts:28-34`
- **Canon rule**: §1 ("TZ = `Africa/Casablanca` (UTC+1, treated as fixed by cron and by `request_ride`)").
- **Code uses**: `Date.UTC(...) ... 21, 0, 0` — hard-codes 21:00 UTC = 22:00 local.
- **Status**: PASS in practice; the comment at line 28 calls this out explicitly. Canon §1 also blesses the "fixed" treatment.
- **Fix**: optional — switch to `Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Casablanca' })` or Postgres-side `AT TIME ZONE 'Africa/Casablanca'` for forward compatibility if Morocco ever changes DST policy.

### CANON-LIFE-016 — Mentor `meeting_url` selected on teen sessions page but never displayed

- **Severity**: **P3**
- **File**: `app/teen/mentor-sessions/page.tsx:101` (selects `meeting_url, meeting_provider`).
- **Canon rule**: §9 ("`mentor_session.meeting_url` rendered in the teen sessions list (column selected, never displayed)").
- **Fix**: add a "Rejoindre" link rendered when `status='approved'` and `now()` within `[scheduled_for-15min, scheduled_for+duration]`.

### CANON-LIFE-017 — `mentor_can_dm_teen` enforcement never mints `mentor_strikes` on violation

- **Severity**: **P1** (companion to LIFE-003)
- **Canon rule**: §8 #4 ("Each violation must mint a `mentor_strikes` row").
- **Evidence**: with no call sites to the gate (LIFE-003), no strike code path exists either. Grep for `mentor_strikes` only matches the migration definition (064) — there is no INSERT in `app/`.
- **Fix**: paired with LIFE-003.

### CANON-LIFE-018 — `place_food_order` payment_method validation accepts canon enum (PASS)

- **Severity**: **PASS** (positive confirmation)
- **File**: `gamification-system/database/migrations/058_food_delivery_rpcs.sql:46`
- **Code**: `IF p_payment_method NOT IN ('coins','dh','split') THEN RETURN ... 'invalid_payment_method'`. Schema CHECK at `058_food_delivery.sql:63` matches.
- **Canon rule**: §2 + §7 (deprecation of `'mixed'`, `'dh_topup'`).

### CANON-LIFE-019 — `book_mentor_session` consent gate enforced server-side (PASS) and UI button disabled until checked (PASS)

- **Severity**: **PASS**
- **Files**:
  - RPC: `gamification-system/database/migrations/065_book_mentor_session_consent.sql:33-134` (5-arg signature, default FALSE, drops the old 4-arg).
  - API: `app/api/teen/mentor-sessions/book/route.ts:17-23` passes `Boolean(consent_recorded)`.
  - UI: `app/teen/mentors/[id]/book-mentor-session-button.tsx:289` (`disabled={isPending || !consentRecorded}`) and explicit error at line 129-132.
- **Canon rule**: §3 recording-consent gating.

### CANON-LIFE-020 — `complete_ride` service-role-only GRANT enforced (PASS)

- **Severity**: **PASS**
- **Files**:
  - RPC: `gamification-system/database/migrations/061_wave_b_money_pipeline.sql:329-330` (`REVOKE … FROM PUBLIC, anon, authenticated; GRANT … TO service_role`).
  - Caller: `app/api/driver/rides/[id]/complete/route.ts:20` uses `createServiceRoleClient()`.
- **Canon rule**: §1 + §6 + §8 #6.

### CANON-LIFE-021 — Mentor session status enum matches shipped canon (PASS)

- **Severity**: **PASS**
- **File**: `gamification-system/database/migrations/059_mentorship_career.sql:81-82`.
- **Code**: `CHECK (status IN ('pending_approval','approved','denied','dispatched','completed','cancelled','no_show'))`.
- **Canon rule**: §3 — exact match.

### CANON-LIFE-022 — Curfew enforcement layered (PASS)

- **Severity**: **PASS**
- **Files**:
  - RPC raises: `060b_request_ride_curfew_guard.sql:51-56`.
  - Cron backstop: `app/api/cron/ride-curfew-check/route.ts:36-58`.
  - `vercel.json:7` registers `"0 21 * * *"`.
  - Parent-only override: `060b:83-85` (`curfew_override_requires_parent`).
- **Canon rule**: §1 curfew rules.

### CANON-LIFE-023 — `complete_ride` pairs `escrow_ledger.related_spend_id` + cashback XP (PASS)

- **Severity**: **PASS**
- **File**: `gamification-system/database/migrations/061_wave_b_money_pipeline.sql:264-294` writes `coin_transactions` capturing `v_coin_tx_id`, then `escrow_ledger` with `related_spend_id = v_coin_tx_id`, then `add_xp_to_user(... v_coin_tx_id ...)`.
- **Canon rule**: §1 `complete_ride` contract + §29 #4.

### CANON-LIFE-024 — `food_orders.payment_method` and status enums match canon (PASS)

- **Severity**: **PASS**
- **File**: `gamification-system/database/migrations/058_food_delivery.sql:63-66`.
- **Canon rule**: §2.

### CANON-LIFE-025 — Partner orders client uses `window.alert()` for errors (cross-cutting design-system violation)

- **Severity**: **P2**
- **File**: `app/partner/restaurant/orders/orders-feed-client.tsx:76` — `alert(json?.error || "Échec")`.
- **Canon rule**: INDEX cross-cutting #10 + `social-feed.locked.md` ("`window.alert()` BANNED").
- **Fix**: replace with `toast.error(...)` from `@/lib/utils/toast`.

---

## Direct status writes audit (canon §8 #1)

Search for `from("ride_bookings").update` outside RPCs:

| File:line | Status written | Verdict |
|---|---|---|
| `app/api/driver/rides/[id]/track/route.ts:48` | `'in_progress'` | Allowed by canon §1 lifecycle table (LIFE-010 contradiction noted) |
| `app/api/cron/ride-curfew-check/route.ts:51-58` | `'cancelled'` | Allowed by canon §8 #1 (cron exception) |
| `app/api/admin/refunds/route.ts:401-406` | `'refunded'` | **VIOLATION** — value not in CHECK + no RPC (LIFE-001) |

`food_orders` direct status writes:

| File:line | Status written | Verdict |
|---|---|---|
| `app/api/admin/refunds/route.ts:323-329` | `'refunded'` | **VIOLATION** — value not in CHECK (LIFE-002) |

`mentor_sessions` direct status writes outside RPCs: none found in `app/` (all writes go through RPCs or are SELECT-only).

---

## EmptyState supply gap (LIFE-009 detail)

| Surface | Table | Empty? | Code path that depends on it |
|---|---|---|---|
| `/teen/mentors` | `mentors WHERE status='active'` | YES (no migration seed) | discover page renders empty |
| `/teen/rides` (admin assignment) | `nivy_drivers WHERE kyc_status='approved' AND is_active=true` | YES | dispatch RPC will fail |
| `/teen/food` | `partners WHERE sub_category='restaurant'` | YES (no migration seed) | discover empty |
| `/teen/food/[partner_id]` | `menu_items WHERE is_active=true` | YES | menu empty |
| `/teen/internships` | `internships WHERE status='open'` | YES (no migration seed) | list empty |

Verify scripts (`scripts/verify-*.ts`) seed ephemerally for tests but do not commit a launch-ready supply baseline. Classification: **supply gap (P1)**, not code bug.

---

## Summary table

| ID | Severity | Title |
|---|---|---|
| CANON-LIFE-001 | **P0** | Admin refund writes `'refunded'` to `ride_bookings.status` (CHECK violation) |
| CANON-LIFE-002 | **P0** | Admin refund writes `'refunded'` to `food_orders.status` (CHECK violation) |
| CANON-LIFE-003 | **P1** | `mentor_can_dm_teen` window-gate has zero call sites |
| CANON-LIFE-004 | **P1** | `pathway_milestones` + `advance_pathway_milestone` missing |
| CANON-LIFE-005 | **P1** | `/teen/internships/[id]` missing AND CTA is `<span>` not `<Link>` |
| CANON-LIFE-006 | **P1** | `/teen/pathways/[slug]` detail page missing |
| CANON-LIFE-007 | **P1** | Driver workspace `app/driver/**` does not exist |
| CANON-LIFE-008 | **P1** | Supplier signup funnels missing (driver, mentor, restaurant) |
| CANON-LIFE-009 | **P1** | Empty supply tables (mentors / drivers / restaurants / menu / internships) |
| CANON-LIFE-010 | P2 | Track route writes status directly (canon §1 vs §8 contradiction) |
| CANON-LIFE-011 | P2 | Ride request form does not expose `curfewOverride` |
| CANON-LIFE-012 | P3 | Provider selector hard-coded |
| CANON-LIFE-013 | P3 | 058_rpcs `partner_accept_food_order` still has double-insert (superseded by 061) |
| CANON-LIFE-014 | P2 | `place_food_order` hard-codes 10% cashback into `food_orders.cashback_xp` |
| CANON-LIFE-015 | P3 | Curfew cron uses fixed UTC offset, not `AT TIME ZONE` |
| CANON-LIFE-016 | P3 | `meeting_url` selected but never rendered |
| CANON-LIFE-017 | P1 | No `mentor_strikes` mint path on DM violation |
| CANON-LIFE-018 | PASS | Food `payment_method` validation matches canon |
| CANON-LIFE-019 | PASS | `book_mentor_session` consent gate enforced + UI gated |
| CANON-LIFE-020 | PASS | `complete_ride` service-role-only |
| CANON-LIFE-021 | PASS | Mentor session status enum matches |
| CANON-LIFE-022 | PASS | Curfew layered enforcement (RPC raise + cron backstop) |
| CANON-LIFE-023 | PASS | `complete_ride` pairs ledger + cashback |
| CANON-LIFE-024 | PASS | Food enums match canon |
| CANON-LIFE-025 | P2 | `window.alert()` in partner orders client |

---

## Score derivation (0-100)

Base 100, deductions:

| Bucket | Findings | Deduction |
|---|---|---|
| P0 — money pipeline broken at refund | LIFE-001, LIFE-002 | −20 |
| P1 — safety gate missing (DM window) | LIFE-003, LIFE-017 | −8 |
| P1 — missing surfaces (3 routes) | LIFE-005, LIFE-006, LIFE-007 | −9 |
| P1 — supplier signup + supply gap | LIFE-008, LIFE-009 | −6 (supply is recoverable) |
| P1 — pathways primitive | LIFE-004 | −3 (decorative, founder-decision) |
| P2 — drift / contradictions | LIFE-010, LIFE-011, LIFE-014, LIFE-025 | −4 |
| P3 — cosmetic | LIFE-012, LIFE-013, LIFE-015, LIFE-016 | −2 |
| **Total deduction** | | **−52** |

Add back +14 for the 7 PASSes that confirm the highest-risk invariants (consent gate, service-role lock, paired ledger, curfew enforcement, status enum, food enums, money RPC contract). Final: **62 / 100**.

## Launch status

**BLOCKED — must fix LIFE-001 and LIFE-002 before any production refund can succeed.**

Recommended unblock path (smallest-blast-radius first):

1. Hotfix LIFE-001 + LIFE-002 — extend CHECK constraints to include `'refunded'` (one migration), or rewrite the refund handlers to call `cancel_ride` + a coin-clawback RPC. **P0**, day 1.
2. Ship `mentor_can_dm_teen` chat gate + strike mint (LIFE-003 / LIFE-017). **P1**, day 1-2.
3. Seed launch supply (LIFE-009): 3 mentors, 2 drivers, 1 restaurant + 5 menu items, 3 internships, via a `099_lifestyle_supply_seed.sql`. **P1**, day 2.
4. Ship missing routes (LIFE-005, LIFE-006, LIFE-007) — internship detail, pathway detail, driver dashboard. **P1**, day 3-5.
5. Ship supplier signup funnels (LIFE-008). **P1**, day 5-7.
6. Pathway milestones primitive (LIFE-004) — founder decision D5. Defer past launch if necessary; flag as "decorative until V1.4" in marketing.

Re-audit after step 1 should bump score to ~74 (P0s cleared); after step 4 to ~88 (launch-ready).

End of audit.

---

## Wave 4C update — 2026-05-09

Lifestyle/supply truth pass. See `docs/compliance/wave-4c-lifestyle-supply.md`
for the full diff. Closures relevant to this scoreboard:

- **Marketplace listing gate** — `GET /api/marketplace/listings/:id` now
  hides non-`active` listings from anyone but the seller and admins.
  `PATCH` and `DELETE` added with owner gate; material edits flip to
  `pending_review`. Closes a P1 leak path where bookmarked URLs surfaced
  unmoderated content.
- **Restaurant order ownership defence-in-depth** — `accept` and
  `reject` now read `food_orders.partner_id` and 403/404/409 before the
  RPC instead of relying on it as the sole gate.
- **No fake supply** — verified no `in_stock` / `inventory_count` /
  fake availability flags in lifestyle pages (only legitimate `placeholder=`
  form attributes).

Out of scope for 4C (still open from the original audit):
LIFE-004 (pathway milestones), LIFE-005/006/007 (internship/pathway/driver
detail routes), LIFE-008 (supplier signup), LIFE-009 (launch supply seed).
These remain blockers for full launch but are not closed-beta blockers.

Score: **62 → 78** (claimed; pending re-audit).

