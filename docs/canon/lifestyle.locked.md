# Lifestyle — LOCKED canonical model

> Generated 2026-05-08. Read-only canonicalization of rides / food / mentors / internships / pathways.
> Sources: `docs/vision/{transport-mobility,food-delivery-restaurants,mentorship-career,academic-integration,PRODUCT_WHITEPAPER}.md` and `docs/vision/audit-frontend-reality/E3-lifestyle.md`. Verified against migrations 057 / 057_rpcs / 058 / 058_rpcs / 059 / 059_rpcs / 060b / 061 / 064 / 065 / 069 and the live `app/` tree.
> This document supersedes any conflicting URL, table, enum, or RPC name in vision specs. Where the spec drifts from shipped code, the shipped contract wins (called out inline).

---

## 1. LOCKED — Rides

### URLs (canonical)

| Surface | Path |
|---|---|
| Teen rides hub | `/teen/rides` |
| Teen ride request form | `/teen/rides/request` |
| Parent ride detail (live tracking) | `/parent/rides/[id]` |
| Parent rides hub | `/parent/rides` |
| Admin drivers / KYC queue | `/admin/drivers`, `/admin/drivers/[id]` |

Driver workspace (the page rendering `app/driver/`) is **MISSING** — see §9.

### Lifecycle (canonical state machine)

`requested → approved → dispatched → in_progress → completed`
Branches: `requested|approved → denied | cancelled` (curfew cron, parent, or teen); `dispatched|in_progress → cancelled`.

CHECK constraint (locked, from `ride_bookings.status` in `057_transport_mobility.sql`):
`('requested','approved','denied','dispatched','in_progress','completed','cancelled')`.

| Trigger | Writer | Status transition |
|---|---|---|
| `request_ride` RPC | service-role API | inserts `requested` + paired `parental_approvals` row |
| Parent approves the `parental_approvals` row | parent flow | flips ride to `approved` |
| `dispatch_ride(ride_id, driver_id)` | admin or driver-self | `approved → dispatched` (driver must be `kyc_status='approved' AND is_active=true`) |
| Driver tracking ping | `/api/driver/rides/[id]/track` | inserts `ride_tracks` rows; ride may flip to `in_progress` on first ping |
| `complete_ride(ride_id, actual_dh)` | service-role only (driver app calls API) | `dispatched\|in_progress → completed`; debits coins (1 DH = 100 coins), pairs `escrow_ledger`, awards cashback XP |
| `cancel_ride(ride_id, reason)` | teen / parent | sets `cancelled`, computes refund_pct (>60min → 100%, ≤60min → 50%) — actual coin refund is a TODO in `057_rpcs` |
| Curfew cron (`/api/cron/ride-curfew-check`, daily 21:00 UTC = 22:00 Africa/Casablanca) | system | cancels any `requested|approved` ride scheduled in the next-24h window with `curfew_override=false` |

### Curfew rules (locked)

- TZ = `Africa/Casablanca` (UTC+1, treated as fixed by cron and by `request_ride`).
- Forbidden window: `local_hour >= 22 OR local_hour < 5`.
- Two-layer enforcement:
  1. **`request_ride` raises `curfew_violation`** if `scheduled_for` is in the forbidden window and `p_curfew_override=false` (migration 060b lines 51–56).
  2. **Cron backstop** cancels approved-but-unstarted rides that slipped through.
- `curfew_override` may only be set by a parent of the teen (`request_ride` raises `curfew_override_requires_parent` otherwise).
- Cron schedule registered in `vercel.json`: `"0 21 * * *"`.

### `complete_ride` contract (locked)

Signature: `complete_ride(p_ride_id uuid, p_actual_dh numeric, p_caller_id uuid DEFAULT NULL) RETURNS jsonb`. Defined in `061_wave_b_money_pipeline.sql`. Service-role only (`REVOKE ... FROM authenticated`). Caller authorization: admin or `nivy_drivers.user_id = caller`. Required prior status ∈ {`dispatched`,`in_progress`}. Conversion = **1 DH = 100 coins (locked)**. Writes paired `coin_transactions` + `escrow_ledger.related_spend_id` + cashback XP via `add_xp_to_user`.

### Dispute resolution (locked — but specific to marketplace today)

`resolve_dispute(p_dispute_id, p_resolution, p_admin_notes)` (migration 061) handles **marketplace** disputes (`marketplace_disputes` / `marketplace_transactions`). Resolutions: `release_to_seller | refund_buyer | split`. Admin-only (`mp_is_admin`).

**There is no `ride_disputes` table and no ride-specific dispute RPC.** A driver/teen ride dispute today has no canonical channel. Recommendation in §10.

---

## 2. LOCKED — Food

### URLs (canonical)

| Surface | Path |
|---|---|
| Teen food discovery | `/teen/food` |
| Teen restaurant menu + cart | `/teen/food/[partner_id]` |
| Teen order tracking | `/teen/food/order/[id]` |
| Parent food visibility | `/parent/food` |
| Partner kitchen / orders feed | `/partner/restaurant/orders` |
| Partner menu manager | `/partner/restaurant/menu` |

### Cart / cashback rules (locked)

- One cart per `partner_id`. `food_order_items` PK = `(order_id, menu_item_id)` — duplicate item adds increment `qty` via `ON CONFLICT DO UPDATE` (migration `058_food_delivery_rpcs.sql`).
- `place_food_order` validates: every item belongs to the same `partner_id` (`menu_item_partner_mismatch`), is `is_active=true`, and is sold by an active partner. Empty cart → `no_items`.
- **Coin debit timing**: happens **inside `place_food_order`** on the autonomous path (no parental approval required) via `spend_teen_coins`. Approval-required orders insert a `food_orders` row in `pending` with no debit; on parent approval the spend is reapplied.
- **Cashback**: 10% (default) of `total_coins` as XP, configured via `cashback_rules` table or `xp_payment_settings.default_cashback_pct`. Awarded on the spend; **reversed by `partner_reject_food_order`** if the partner rejects.
- Halal-by-default: any item with `is_halal=false` forces `requires_approval=true` with `reason='non_halal_item'`.
- Active `nutrition_challenges` enforce: `halal_only`, `max_calories_per_meal`, `budget_coins`. Violations force parental approval.
- `teen_budget_limits.mode='validation'` OR `total_coins > max_per_transaction_coins` also force approval.

### Order status enum (locked)

CHECK constraint on `food_orders.status` (migration 058):
`('pending','accepted','preparing','ready','out_for_delivery','delivered','cancelled','rejected')`.

`payment_method` ∈ `('coins','dh','split')` (migration 058 — note: spec says `'mixed'` and the API doc says `'dh_topup'`; the schema is the lock).

---

## 3. LOCKED — Mentors

### URLs (canonical)

| Surface | Path |
|---|---|
| Teen mentor discovery | `/teen/mentors` |
| Teen mentor profile | `/teen/mentors/[id]` |
| Teen mentor sessions list | `/teen/mentor-sessions` |
| Parent mentor sessions visibility | `/parent/mentor-sessions` (route exists at `/api/parent/mentor-sessions/...`; UI page TBD) |
| Mentor workspace | `/mentor/dashboard`, `/mentor/sessions`, `/mentor/profile/edit` |
| Admin mentor KYC queue | `/admin/mentors` |

Booking entry point: client component `app/teen/mentors/[id]/book-mentor-session-button.tsx` (consent checkbox is mandatory — see Recording-Consent gating below).

### Booking flow (locked)

1. Teen taps "Book" inside `/teen/mentors/[id]` → `book-mentor-session-button.tsx` modal.
2. Submit hits `POST /api/teen/mentor-sessions/book` with `{ mentor_id, scheduled_for, duration_minutes, consent_recorded }`.
3. API calls `book_mentor_session(p_mentor_id, p_mentee_user_id, p_scheduled_for, p_duration_minutes, p_consent_recorded)` (5-arg signature locked by migration 065 — old 4-arg is `DROP FUNCTION`-ed).
4. RPC validates: mentor `status='active' AND kyc_status='approved'`; teen DOB present; mentee age ∈ `[mentor.age_min_mentee, mentor.age_max_mentee]`; teen has at least one parent link.
5. RPC inserts `parental_approvals` (action_type=`coach_meeting`, resource_type=`mentor_session`) + `mentor_sessions` row in `status='pending_approval'` with `recorded = consent_recorded`.
6. Parent approves via `parent_approve_session(session_id, parent_id)` → flips status to `approved`, debits coins for paid sessions (1 DH = 100 coins, intro is free if `mentor.free_intro_session=true` AND no prior session).
7. Parent denies via `parent_deny_session(session_id, parent_id, reason)`.
8. Mentor marks complete via `mentor_complete_session(session_id)` (migration 069) → `approved|dispatched → completed`, bumps `mentors.sessions_count`, queues teen "rate" notification.

### Parent approval requirement (locked, non-negotiable)

Every `mentor_sessions` row begins in `pending_approval`. **No mentor session can be `approved` or executed without a `parental_approvals.id` linked via `parent_approval_id` and approved by a row in `parent_teen_links` for that teen.** Enforced at RPC layer (`book_mentor_session` and `parent_approve_session` both check `parent_teen_links`).

### Recording-consent gating (locked)

- `mentor_sessions.recorded` is set from the `p_consent_recorded BOOLEAN DEFAULT FALSE` param of `book_mentor_session` (migration 065).
- Default = FALSE. The UI's Book button is **disabled until the consent checkbox is ticked** (audit E3 verified).
- Recording media stored in **PRIVATE** Supabase bucket `mentor-recordings` (migration 064). 90-day expiry via `prune_expired_mentor_recordings()` RPC.
- `mentor_can_dm_teen(mentor_id, teen_id)` RPC is the chat-API gate enforcing the `[scheduled_for-30min, scheduled_for+duration+30min]` window.

### Session status enum — CANONICAL (locked, supersedes vision drift)

CHECK constraint on `mentor_sessions.status` (migration 059):

```
('pending_approval','approved','denied','dispatched','completed','cancelled','no_show')
```

This is the **shipped** enum. The vision spec in `mentorship-career.md` lists `('requested','parent_pending','scheduled','live','completed','cancelled','no_show')` which has **never existed in the database**. Treat the spec as deprecated text; treat the migration value as canonical.

Recommended renaming if/when changed (founder decision §10): `pending_approval → parent_pending`, `approved → scheduled`, `dispatched → live`. Until then, the seven values above are authoritative.

---

## 4. LOCKED — Internships + Pathways

### URLs (canonical)

| Surface | Path |
|---|---|
| Teen internships hub | `/teen/internships` |
| Teen internship detail | `/teen/internships/[id]` — **MISSING** (see §9) |
| Teen pathways hub | `/teen/pathways` |
| Teen pathway detail | `/teen/pathways/[slug]` — **MISSING** |
| Admin internships queue | `/admin/internships` |

### Application flow (internships, locked)

1. Teen taps Apply → `POST /api/teen/internships/[id]/apply`.
2. API calls `apply_to_internship(p_internship_id, p_applicant_id, p_cover_letter, p_portfolio_urls)` (migration 059_rpcs).
3. RPC validates: internship `status='open'`, has free spots, applicant age ∈ `[age_min, age_max]`, applicant has a parent link, no prior non-rejected/withdrawn application.
4. Inserts `parental_approvals` (action_type=`coach_meeting`, resource_type=`internship_application`) + `internship_applications` row in `status='pending'`.
5. Parent must approve via the standard `parental_approvals` flow.
6. Decision via `decide_internship_application(p_application_id, p_decider_id, p_decision, p_notes)` where `decision ∈ {'accepted','shortlisted','rejected'}`. POST endpoint at `/api/admin/internships/[id]/decide`.

### Pathways flow (locked)

- 5 seeded pathways from migration 059 (`medicine, engineering, arts, business, law`).
- Teen declares via `POST /api/teen/pathways/[slug]/declare` → upsert into `teen_pathway_progress (teen_id, pathway_id)`.
- `total_milestones` defaults to 10 (hard-coded in `teen_pathway_progress` schema).
- **Milestones are decorative today**: there is no `pathway_milestones` table, no `advance_pathway_milestone` RPC, and no XP/coin reward path. Progress bar will read 0/10 indefinitely. See §9.

### Teacher / coach award flow

There is **no internship/pathway-specific teacher/coach award flow**. Adjacent: `gamification-system/features/pillars/actions.ts.submitGrade` (academic) and `teacher-coach-xp.md` (sport) — neither moves a pathway milestone counter.

### Milestones table per pathway

**Does not exist.** `career_pathways.recommended_quiz_ids` / `recommended_partner_ids` / `recommended_mentor_tags` arrays are populated by no migration and surfaced by no UI. The milestone primitive needs to be designed (see §9 / §10).

---

## 5. LOCKED — Canonical tables

| Table | Migration | Notes |
|---|---|---|
| `ride_bookings` | 057 | status enum and provider enum locked there |
| `nivy_drivers` | 057 | KYC + `service_cities text[]` |
| `ride_tracks` | 057 | live tracking; `ride_id`-scoped RLS |
| `ride_groups`, `ride_group_members` | 057 | group / split-fare scaffolding |
| `ride_disputes` | **MISSING** | not implemented |
| `partners` | (pre-existing, +058 ALTER) | `sub_category ∈ ('restaurant','cafe','bakery','catering','grocery','fast_food')` (locked by 058) |
| `partner_offers` | 074 (consolidation) + 082 (tags) + 087 (challenge_type) | not lifestyle-specific but referenced by pathways/recommendations |
| `menu_items` | 058 | partner-scoped, halal default TRUE |
| `food_orders` | 058 | status enum locked |
| `food_order_items` | 058 | composite PK |
| `nutrition_challenges` | 058 | parent-managed |
| `mentors` | 059 | `status ∈ ('pending','active','paused','suspended','rejected')`, `kyc_status ∈ ('pending','approved','rejected','expired')` |
| `mentor_sessions` | 059 (+065 consent) | status enum see §3 |
| `mentor_strikes` | 064 | 3-strike auto-suspend, 180-day expiry |
| `mentor_session_recordings` | 064 | 90-day expiry, private bucket |
| `mentor_session_reports` | 069 | teen/parent abuse reports |
| `internships` | 059 | `status ∈ ('draft','open','closed','filled','cancelled')` |
| `internship_applications` | 059 | `status ∈ ('pending','shortlisted','accepted','rejected','withdrawn')` |
| `career_pathways` | 059 | 5 seeded |
| `teen_pathway_progress` | 059 | composite PK |
| `pathway_milestones` | **MISSING** | needs design |

---

## 6. LOCKED — Canonical RPCs

| RPC | Signature | Source migration | Caller |
|---|---|---|---|
| `request_ride` | `(p_teen_id, p_pickup_address, p_dropoff_address, p_scheduled_for, p_event_id, p_provider, p_payment_method, p_pickup_lat, p_pickup_lng, p_dropoff_lat, p_dropoff_lng, p_estimated_dh, p_caller_id, p_curfew_override) → jsonb` | 060b | authenticated (teen or parent of teen) |
| `dispatch_ride` | `(p_ride_id, p_driver_id, p_caller_id) → jsonb` | 057_rpcs | authenticated (admin or driver-self) |
| `cancel_ride` | `(p_ride_id, p_reason, p_caller_id) → jsonb` | 057_rpcs | service-role |
| `complete_ride` | `(p_ride_id, p_actual_dh, p_caller_id) → jsonb` | 061 | **service-role only** |
| `resolve_dispute` | `(p_dispute_id, p_resolution, p_admin_notes) → jsonb` | 061 | admin (`mp_is_admin`) — **marketplace only** today |
| `place_food_order` | `(p_teen_id, p_partner_id, p_delivery_type, p_items jsonb, p_address, p_scheduled_for, p_payment_method) → jsonb` | 058_rpcs | authenticated (teen-self) |
| `partner_accept_food_order` | `(p_order_id, p_partner_user_id) → jsonb` | 061 (rewrite) | authenticated partner_staff |
| `partner_reject_food_order` | `(p_order_id, p_reason) → jsonb` | 061 (rewrite) | authenticated partner_staff or admin |
| `apply_mentor` | (KYC + intro video) → jsonb | 064 area | authenticated user opting into mentor role |
| `admin_approve_mentor` | `(p_mentor_id, p_admin_user_id) → jsonb` | (admin path, called from `/api/admin/mentors/[id]/approve`) | admin |
| `book_mentor_session` | `(p_mentor_id, p_mentee_user_id, p_scheduled_for, p_duration_minutes DEFAULT 30, p_consent_recorded BOOLEAN DEFAULT FALSE) → jsonb` | 065 (replaces 4-arg from 059) | authenticated teen-self |
| `parent_approve_session` | `(p_session_id, p_parent_id) → jsonb` | 059_rpcs | authenticated parent of mentee |
| `parent_deny_session` | `(p_session_id, p_parent_id, p_reason) → jsonb` | called from `/api/parent/mentor-sessions/[id]/deny` | parent of mentee |
| `mentor_complete_session` | `(p_session_id) → jsonb` | 069 | authenticated mentor-self |
| `mentor_can_dm_teen` | `(p_mentor_id, p_teen_id) → boolean` | 064 | chat-API gate |
| `prune_expired_mentor_recordings` | `() → void` | 064 | service-role / cron |
| `apply_to_internship` | `(p_internship_id, p_applicant_id, p_cover_letter, p_portfolio_urls) → jsonb` | 059_rpcs | authenticated applicant-self |
| `decide_internship_application` | `(p_application_id, p_decider_id, p_decision, p_notes) → jsonb` | called from `/api/admin/internships/[id]/decide` | admin or partner_staff for the internship |
| `advance_pathway_milestone` | — | **MISSING** | — |

---

## 7. DEPRECATED

The following exist somewhere (in spec text, in legacy code, or as a dead column) and **must not be used**:

- **Duplicate ride routes**: any `app/teen/ride/...` (singular) or `app/parent/ride/...` — only the plural `/teen/rides` and `/parent/rides/[id]` are canonical. Audit doc references to `/teen/agenda/event/:id` "Réserver le transport" CTA are aspirational; the only real entry point today is `/teen/rides/request`.
- **Duplicate mentor session enum from `docs/vision/mentorship-career.md` §SPEC**: `('requested','parent_pending','scheduled','live','completed','cancelled','no_show')`. The shipped enum (§3 of this doc) is canonical.
- **Mentor `intro_only` status**: the vision doc lists `pending → intro_only → active → paused → suspended → banned`. The shipped CHECK is `('pending','active','paused','suspended','rejected')` — `intro_only` and `banned` are not in the schema. Use `is_intro` BOOLEAN on `mentor_sessions` for the per-session intro flag instead of a mentor-tier value.
- **Food cart variants**:
  - `payment_method='dh_topup'` (vision food doc §SPEC) — the locked schema is `('coins','dh','split')`.
  - `payment_method='split_with_parent'` (vision rides doc) — for **rides** the schema is `('coins','dh','split_with_parent')`; for **food** it is `'split'`. The two surfaces have different enum values; do not unify casually.
  - `food_orders.status='partner_accepted'` (vision teen experience text) — locked value is `'accepted'`.
  - Any "cart" persisted server-side: there is none. The cart is client-side; the row is created only by `place_food_order`.
- **`mentor_session.meeting_provider='nivy_video'`** (vision spec) — the shipped CHECK is `('zoom','google_meet','jitsi','in_person')`.
- **`internship_applications.status='submitted' / 'reviewed' / 'draft'`** (vision spec) — shipped CHECK is `('pending','shortlisted','accepted','rejected','withdrawn')`.

---

## 8. FORBIDDEN patterns

1. **Direct ride status writes** (`UPDATE ride_bookings SET status='dispatched'` from any client/route). All transitions go through `request_ride / dispatch_ride / complete_ride / cancel_ride` or the curfew cron. The cron is the only direct-write exception, and it writes only `'cancelled'` with `cancellation_reason='curfew_22h'`.
2. **`book_mentor_session` without the consent gate**: never call the RPC with `p_consent_recorded` omitted unless the UI has already presented the recording-consent disclosure. Default FALSE means "no recording will be made"; calling with TRUE without ticking the checkbox is a CNDP-grade safety violation.
3. **Internship apply without parental link**: the `apply_to_internship` RPC will return `no_parent_link` and is the only sanctioned path. Do not bypass with a direct `INSERT INTO internship_applications`.
4. **Mentor → teen DM outside the session window**: chat code paths must call `mentor_can_dm_teen(mentor_id, teen_id)` and respect `FALSE`. Each violation must mint a `mentor_strikes` row.
5. **Rides past 22:00 Africa/Casablanca without `curfew_override`**: blocked at `request_ride` and again at the curfew cron. Do not introduce a third path.
6. **`complete_ride` from a non-service-role context**: GRANT is `service-role` only. The driver app calls the API which uses the service-role client.
7. **Non-halal food order without parental approval**: `place_food_order` forces `requires_approval=true` whenever any item has `is_halal=false`.
8. **Coin debit before partner accept (food autonomous path)**: the coin debit is inside `place_food_order` via `spend_teen_coins`. Do not attempt to "double capture" on partner accept — `B.3` in migration 061 explicitly removed that double-insert.

---

## 9. MISSING

These surfaces / primitives are referenced by spec or audit but do not exist:

- `/teen/internships/[id]` detail page (the card "Voir les details" link is dead).
- `/teen/pathways/[slug]` detail page.
- Mentor availability calendar (`mentor_sessions` has no slot/availability schema; bookings hit raw timestamps).
- Driver workspace UI: `app/api/driver/rides/[id]/{dispatch,track,complete}` exists, but `app/driver/` does not — drivers cannot log in to anything.
- Restaurant signup public funnel (`/devenir-restaurant`, `/become-partner`). Today: only an admin or auth-trigger can create a `partners` row with `sub_category='restaurant'`.
- Driver signup public funnel (`/become-driver`) and `POST /api/driver/apply`.
- Mentor signup public funnel (`/become-mentor`) — the `apply_mentor` RPC exists but no public landing page reaches it.
- Partner-side "post an internship" form (today only `/admin/internships`).
- Post-delivery food review/rating loop. `/teen/food/order/[id]` ends at the celebrate burst.
- Post-mentor-session rating UI on the teen side. `/api/teen/mentor-sessions/[id]/rate` exists; no client component triggers it.
- Geocoding for ride addresses: `pickup_lat/lng` and `dropoff_lat/lng` are on the schema but the form uses free-text `<input>`. Map-picker / Google Places / OSM Nominatim integration is unbuilt.
- `pathway_milestones` table + `advance_pathway_milestone` RPC + XP/coin reward on advance.
- `ride_disputes` table + `resolve_ride_dispute` RPC (the marketplace `resolve_dispute` does not cover rides).
- Parent UI surface to set `curfew_override=true` when requesting a late ride on behalf of a teen.
- `nutrition_challenges` parent-side composer UI.
- Provider selector in the ride request form (API accepts 4 providers; UI hard-codes `nivy_partner`).
- `mentor_session.meeting_url` rendered in the teen sessions list (column selected, never displayed).
- `menu_items.image_url` rendered in the menu cart (column selected, never rendered).

---

## 10. UNRESOLVED founder decisions

### D1. Single mentor-session status enum (DRIFT)

**Conflict**: `docs/vision/mentorship-career.md §SPEC` lists `('requested','parent_pending','scheduled','live','completed','cancelled','no_show')`. Migration 059 + 069 ship `('pending_approval','approved','denied','dispatched','completed','cancelled','no_show')`.

**Recommendation: lock the shipped enum, rename in a future migration**: `pending_approval → parent_pending`, `approved → scheduled`, `dispatched → live`, keep `denied`, `completed`, `cancelled`, `no_show` (drop the `denied` orphan or fold into `cancelled`). Adds a `live` value (no current `dispatched` semantic loss, since `mentor_complete_session` accepts both `approved` and `dispatched`). This is a non-trivial migration: client filters in `app/teen/mentor-sessions/page.tsx`, `app/parent/mentor-sessions/[id]/deny/route.ts`, `mentor_complete_session`'s `status NOT IN ('approved','dispatched')` guard, and `parent_approve_session`'s transition all need to flip together. Ship as a coordinated 070+ migration with code update in the same PR.

**Until then: the canonical lock is the shipped enum.**

### D2. Curfew configurable per parent or global

Today: hard-coded `22:00 → 05:00 Africa/Casablanca` in `request_ride` and the cron. No per-parent override of the *window* (only per-ride `curfew_override` boolean).

**Recommendation**: keep the global window for v1. Add a per-parent `curfew_window_local int4range` column on `parent_settings` only when a paying customer asks. Reasons: (a) safety regressions are catastrophic and an editable curfew gives parents the ability to footgun themselves; (b) `curfew_override` already provides per-ride flexibility; (c) cron complexity grows linearly with per-parent windows.

### D3. Ride dispute resolution autonomy

Today: no `ride_disputes` table; `marketplace.resolve_dispute` does not cover rides. Driver-vs-teen issues (no-show, route-deviation, fare-dispute) have no canonical channel.

**Recommendation**: ship a thin `ride_disputes (id, ride_id, opened_by, reason, status, evidence_urls, admin_notes, resolved_at, resolved_by, resolution)` mirroring `marketplace_disputes`, plus a `resolve_ride_dispute(p_dispute_id, p_resolution ∈ {'side_with_teen_refund','side_with_driver','split'}, p_admin_notes)` RPC, **admin-only** (no autonomous resolution). Defer ML-based auto-classification. Use the existing `escrow_ledger` for refund credit. Wave-B 062-equivalent migration.

### D4. Single source of truth for `payment_method` across rides and food

Rides accept `('coins','dh','split_with_parent')`; food accepts `('coins','dh','split')`. **Recommendation**: leave each surface alone (renaming is a multi-call breaking change), but document `'split'` and `'split_with_parent'` as semantically identical in this canon. Future v2 migration may unify.

### D5. Pathway milestone primitive

No `pathway_milestones` table exists; `total_milestones=10` is a placeholder. **Recommendation**: ship `pathway_milestones (id, pathway_id, sort_order, title, description, criterion JSONB, xp_reward, coin_reward)` + per-teen `teen_pathway_milestone_progress (teen_id, milestone_id, completed_at, evidence_url)` + `advance_pathway_milestone(p_teen_id, p_milestone_id, p_evidence_url) RETURNS jsonb`. Hand-curate 5–7 milestones for each of the 5 seeded pathways. This unblocks the recommendation engine's `recommend_for_teen('pathway')` and gives the progress bar real semantics.

### D6. `mentor_complete_session` allowed prior statuses

Currently accepts `'approved'` OR `'dispatched'`. The `'dispatched'` value never gets set anywhere on a mentor session (no `dispatch_session` RPC exists). **Recommendation**: remove `'dispatched'` from the prior-status check OR add a `dispatch_session` RPC that flips `approved → dispatched` when the meeting URL is generated. Cheaper option is the former.

---

## Contradictions flagged

- **Mentor session enum**: vision spec ↔ shipped schema (D1).
- **Food `payment_method`**: spec says `'mixed'` and `'dh_topup'`; schema says `'split'` and `'dh'`.
- **Mentor `meeting_provider`**: spec says `'nivy_video'`; schema says `'jitsi'`.
- **Mentor tier ladder**: spec has `intro_only` / `banned`; schema has neither.
- **Internship application status**: spec has `'submitted'`, `'reviewed'`, `'draft'`; schema has `'pending'`, `'shortlisted'`, `'withdrawn'`.
- **Curfew window**: vision says "22h?, bypassable by parent override?"; shipped is fixed 22:00–05:00 with per-ride override.
- **`complete_ride` permission**: spec doc implies driver-self path; shipped GRANT is service-role only (driver app reaches it through the API route, not directly).
- **Cashback rate**: vision food §6 says hard-block / loyalty model; shipped is configurable via `cashback_rules` (per-partner) and `xp_payment_settings.default_cashback_pct` (default 10%).

End of lock.
