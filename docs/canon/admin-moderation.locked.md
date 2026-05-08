# Admin + Moderation — LOCKED Canonical Model

> Status: LOCKED. Source of truth for all admin / moderation / audit / refund / broadcast / KYC / support work.
> Sources: `docs/vision/admin-moderation.md`, `docs/vision/audit-frontend-reality/B4-admin-audit.md`, `docs/vision/ai-safety-teen-welfare.md`, `docs/vision/audit-prelaunch/07-security-compliance.md`, `docs/vision/cndp-filing-dossier/*`, `lib/auth/admin-permissions.ts`.
> Date locked: 2026-05-08.
> Override authority: founder only. Anything contradicting this file is wrong; fix the code, not the lock.

---

## 1. LOCKED — Admin sub-roles (capability matrix)

Four sub-roles. Stored in `admin_roles.role`. Mirrored in `profiles.role` (kept in sync; `admin_roles` wins on conflict per `getAdminInfo`).

| Surface / Action                       | super_admin | admin | moderator | support |
|----------------------------------------|:-----------:|:-----:|:---------:|:-------:|
| Dashboard `/admin`                     | R           | R     | R         | R       |
| Users — list + view                    | R           | R     | R         | R       |
| Users — edit (profile fields)          | W           | W     | W         | —       |
| Users — suspend / ban                  | W           | W     | flag-only | —       |
| Users — change role                    | W           | —     | —         | —       |
| Users — impersonate (view-as)          | W           | —     | —         | —       |
| Events — view                          | R           | R     | R         | R       |
| Events — create / edit                 | W           | W     | W         | —       |
| Events — delete / publish              | W           | W     | —         | —       |
| Reservations — view + check-in         | R/W         | R/W   | R/W       | R/W     |
| Reservations — cancel                  | W           | W     | W         | —       |
| Reservations — refund                  | W           | W     | —         | —       |
| Partners — KYC view                    | R           | R     | R         | —       |
| Partners — KYC approve/reject          | W           | W     | —         | —       |
| Partners — suspend                     | W           | W     | —         | —       |
| Mentors — KYC view + approve/reject    | W           | W     | —         | —       |
| Drivers — KYC view + approve/reject    | W           | W     | —         | —       |
| Ambassadors — view                     | R           | R     | R         | —       |
| Ambassadors — approve/reject           | W           | W     | —         | —       |
| Moderation inbox — view                | R           | R     | R         | —       |
| Moderation inbox — approve/reject      | W           | W     | W         | —       |
| Moderation — feature/pin               | W           | W     | —         | —       |
| Refund console                         | W           | W     | —         | —       |
| Top-ups — manual confirm               | W           | W     | —         | —       |
| Partner payouts — release              | W           | W     | —         | —       |
| Broadcast — compose + send             | W           | W     | —         | —       |
| Support inbox — view + reply           | R/W         | R/W   | R/W       | R/W     |
| Support inbox — escalate / close       | W           | W     | W         | W       |
| Audit log — view                       | R           | R     | —         | —       |
| Analytics — view (ops KPIs)            | R           | R     | R         | —       |
| Analytics — financial / export         | R/W         | —     | —         | —       |
| CNDP requests — view + fulfil          | W           | W     | —         | —       |
| Ride/curfew monitor                    | R/W         | R/W   | R         | —       |
| Restaurant / food ops                  | R/W         | R/W   | R         | —       |
| System — settings                      | W           | —     | —         | —       |
| System — permissions / roles manager   | W           | —     | —         | —       |
| System — SQL runner / migrations       | W           | —     | —         | —       |

**Enforcement rule (LOCKED):** every `/admin/*` page MUST gate via `requireAdminPermission(<perm>)` from `lib/auth/admin-permissions.ts`. Sidebar MUST filter items via `roleHasPermission(role, <perm>)`. No raw `=== "admin"` string compares anywhere.

---

## 2. LOCKED — Admin sidebar (canonical 13 items, in priority order)

Single sidebar definition in `components/layouts/admin-sidebar.tsx`. Each item declares `requiredPermission`. Items render only if `roleHasPermission(currentRole, requiredPermission) === true`.

| # | Label              | Href                          | Required permission       | Notes |
|---|--------------------|-------------------------------|---------------------------|-------|
| 1 | Dashboard          | `/admin`                      | `dashboard.view`          | Single canonical KPI surface |
| 2 | Modération         | `/admin/moderation`           | `content.view`            | Unified inbox (see §3) |
| 3 | Utilisateurs       | `/admin/utilisateurs`         | `users.view`              | List + detail at `/[id]` |
| 4 | Support            | `/admin/support`              | `support.tickets`         | Tickets inbox (see §8) |
| 5 | KYC                | `/admin/kyc`                  | `partners.view`           | Unified KYC across partners/mentors/drivers/ambassadors (see §7) |
| 6 | Réservations       | `/admin/reservations`         | `reservations.view`       | Bookings + check-in tabs |
| 7 | Événements         | `/admin/evenements`           | `events.view`             | Includes anniversaires + clubs as tabs |
| 8 | Finances           | `/admin/finances`             | `analytics.financial` OR `reservations.refund` | Refunds, top-ups, partner payouts (see §5) |
| 9 | Broadcasts         | `/admin/broadcasts`           | `content.publish`         | Push/email composer (see §6) |
| 10| Rides & Food       | `/admin/operations`           | `partners.view`           | Curfew monitor + food orders + restaurant ops |
| 11| Audit log          | `/admin/audit-log`            | `system.logs`             | Read-only viewer (see §4) |
| 12| Analytics          | `/admin/analytics`            | `analytics.view`          | Single canonical analytics surface |
| 13| Système            | `/admin/system`               | `system.settings`         | super_admin only — settings, permissions, SQL ring-fenced |

**LOCKED:** exactly 13 items. No more (clutter), no fewer (orphans return). Anything else is an orphan and MUST be merged into one of these or deleted.

---

## 3. LOCKED — Moderation queues

**Decision: SINGLE canonical inbox at `/admin/moderation` backed by ONE table `moderation_queue`.** Sub-tabs by `content_type` are filters, not separate routes.

### Canonical table

`moderation_queue` (already exists per audit 07):
- `id uuid PK`
- `content_type text NOT NULL` ∈ `('feed_post','marketplace_listing','partner_offer','chore_evidence','defi_proof','quiz_ai','circle_message','mentor_review')`
- `content_id uuid NOT NULL` (FK polymorphic to source row)
- `reporter_id uuid NULL` (NULL = system-flagged by validator/AI)
- `reason text` ∈ `('inappropriate','spam','harassment','hate_speech','personal_info','safety','other')`
- `status text NOT NULL DEFAULT 'pending'` ∈ `('pending','approved','rejected','escalated','auto_resolved')`
- `assigned_to uuid NULL` (admin profile_id)
- `resolved_by uuid NULL`
- `resolution_note text NULL`
- `created_at timestamptz`, `resolved_at timestamptz`
- `UNIQUE (content_type, content_id, reporter_id)` — enforces dedupe at insert.

### Dedupe rules (LOCKED)

1. A row appears in `moderation_queue` **once per (content_type, content_id, reporter_id)**. Multiple reports on the same item by the same reporter are idempotent.
2. Multiple reporters on the same item produce N rows but UI groups by `(content_type, content_id)` and shows aggregate count.
3. **No row is in two queues.** All UI surfaces query `moderation_queue` filtered by `content_type`. Routes `/admin/proofs`, `/admin/creator-moderation`, `/admin/marketplace`, `/admin/content/review` are DEPRECATED (see §9) — they MUST be replaced by `/admin/moderation?type=<x>` filters.
4. Auto-restrict trigger: when `count(*) FILTER (status='pending') >= 3` for the same `(content_type, content_id)`, the source row's visibility flag flips (`feed_posts.is_hidden=true`, `marketplace_listings.status='pending_moderation'`, etc.) until reviewed. Implemented as a DB trigger, not in app code.

### Routing per content type (LOCKED)

| `content_type`         | Source table             | Approve action                              | Reject action                          | Min role     |
|------------------------|--------------------------|---------------------------------------------|----------------------------------------|--------------|
| `feed_post`            | `feed_posts`             | `feed_posts.status='approved'`              | `is_hidden=true` + notify author       | moderator    |
| `marketplace_listing`  | `marketplace_listings`   | `status='active'`                           | `status='removed'` + reason            | moderator    |
| `partner_offer`        | `partner_offers`         | `status='published'`                        | `status='rejected'` + reason           | admin        |
| `chore_evidence`       | `chore_completions`      | award XP/coins via `approve_chore` RPC      | `approve_chore` w/ reject + reason     | moderator    |
| `defi_proof`           | `physical_challenges_progress` | award XP via `approve_defi_proof` RPC | reject + reason                        | moderator    |
| `quiz_ai`              | `educational_quizzes`    | `status='approved'`                         | `status='rejected'` (regenerate)       | moderator    |
| `circle_message`       | `circle_messages`        | `is_hidden=false`                           | `is_hidden=true` + warn user           | moderator    |
| `mentor_review`        | `mentor_reviews`         | `status='published'`                        | `status='hidden'`                      | moderator    |

All approve/reject MUST go through `moderate_content(p_queue_id, p_decision, p_note)` RPC which dispatches to the correct content-type handler and writes the audit row.

---

## 4. LOCKED — Audit log

### Canonical table

**`audit_log`** (single name, singular, replaces all of `admin_audit_logs`, `activity_logs`, scattered domain logs for admin actions).

Schema:
- `id bigserial PK`
- `actor_id uuid NULL` (admin or system user; NULL for cron/system)
- `actor_role text` ∈ `('super_admin','admin','moderator','support','system','cron')`
- `action text NOT NULL` (verb_noun, e.g. `approve_partner`, `refund_booking`, `change_role`, `send_broadcast`, `moderate_content`, `cancel_ride_curfew`)
- `resource_type text` (`partner`, `mentor`, `driver`, `ambassador`, `booking`, `payment`, `refund`, `feed_post`, `marketplace_listing`, `admin_role`, `broadcast`, `support_ticket`, `cndp_request`, `system_setting`)
- `resource_id text NULL` (uuid stringified or domain ID)
- `target_user_id uuid NULL` (the affected end-user, if any)
- `description text` (human-readable)
- `metadata jsonb` (before/after, params, signed URLs at time of action)
- `ip_address inet NULL`
- `user_agent text NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`

Index: `(actor_id, created_at DESC)`, `(resource_type, resource_id)`, `(target_user_id, created_at DESC)`.

### What MUST write to `audit_log`

Every privileged write. Specifically:

- All admin approve/reject (partner, mentor, driver, ambassador, content).
- All role changes via `/admin/permissions`.
- All refunds, manual top-ups, partner payouts.
- All suspensions / bans / impersonations.
- All broadcasts sent.
- All CNDP fulfilments (export issued, account erased).
- All curfew cancellations (cron writes with `actor_role='cron'`).
- All SQL runner / migration executions (super_admin).
- All support ticket status transitions (open → assigned → resolved → closed).
- All e-signature / parental approval decisions consumed.

Helper: `logAdminAction(actor, action, resourceType, resourceId, description, metadata)` in `lib/auth/admin-permissions.ts` MUST insert into `audit_log` (current code targets non-existent `admin_audit_logs` — fix at the code site, not the lock).

### Viewer URL

**`/admin/audit-log`** — single canonical viewer. Replaces `/admin/logs`. Filters: actor, role, action, resource_type, target_user, date range. CSV export gated on `analytics.export`.

### Retention policy (LOCKED)

- **Hot retention:** 24 months in `audit_log` (queryable from UI).
- **Cold retention:** archive to `audit_log_archive` (same schema) after 24 months via monthly cron. Total retention: **5 years** (BAM e-money + CNDP minor-data baseline).
- **Hard delete:** never, except for CNDP erasure of a target user — in which case `target_user_id` is nulled and metadata redacted, but the row stays for actor accountability.

---

## 5. LOCKED — Refunds + reconciliation

### Canonical surface

**`/admin/finances`** — single tabbed surface. Tabs: `Refunds`, `Top-ups`, `Partner payouts`, `Reconciliation`.

### Canonical RPCs

| Action                          | RPC                                | Min role | Writes audit_log? |
|---------------------------------|------------------------------------|----------|-------------------|
| Issue refund on a booking       | `refund_booking(p_booking_id, p_amount_dh, p_reason)` | admin    | yes (`action='refund_booking'`) |
| Issue refund on food order      | `refund_food_order(p_order_id, p_amount_dh, p_reason)` | admin    | yes |
| Issue refund on marketplace tx  | `refund_marketplace(p_listing_id, p_buyer_id, p_amount_coins, p_reason)` | admin | yes |
| Reverse a top-up                | `reverse_topup(p_payment_id, p_reason)` | super_admin | yes |
| Confirm manual top-up           | `top_up_teen(p_parent_id, p_teen_id, p_amount_dh, p_psp_provider, p_psp_reference)` | admin | yes |
| Release partner payout          | `release_partner_payout(p_payout_id, p_psp_reference)` | admin | yes |
| Mark partner payout failed      | `mark_partner_payout_failed(p_payout_id, p_reason)` | admin | yes |

### Canonical tables (already exist or to add)

- `payment_transactions` — top-ups (parent → teen wallet). Existing.
- `escrow_ledger` — paired entries. Existing.
- `partner_payouts` — period accrual + settlement. Existing schema, no fill RPC yet — see audit 07 P1.
- `refunds` (NEW canonical) — `id, source_type ('booking'|'food_order'|'marketplace'|'topup'), source_id, amount_dh, amount_coins, reason, requested_by, status, psp_reference, created_at, settled_at`. One refund row per refund event; cross-references `escrow_ledger` for the paired entry.

### Reconciliation tab

Daily reconciliation view: PSP webhook count vs `payment_transactions` count, escrow imbalance check (`SUM(direction='top_up') = SUM(direction='spend') + outstanding_balance`), partner payout aging buckets.

---

## 6. LOCKED — Broadcasts

### Canonical surface

**`/admin/broadcasts`** — composer + history.

### Targeting

Segments (LOCKED list, no free-form SQL):
- Role: `teen` | `parent` | `partner` | `ambassador` | `mentor`
- City: any from `profiles.city`
- Age range: 13–14, 15–16, 17+
- Active in last N days
- Has linked parent / has linked teen
- Cohort tag (manual labels)

### Channels

- Push (via `push_subscriptions`)
- In-app notification (`user_notifications`)
- Email (template-based)

All three respect `notification_preferences` opt-outs and `quiet_hours` from migration 016.

### Backend

Reuses existing `notification_templates`, `notification_triggers`, `user_notifications`, `notification_analytics`. ADD: `broadcasts` table — `id, created_by, segment_filter jsonb, channels text[], template_id, sent_at, recipient_count, delivered_count, opened_count, status`.

Composer writes a `broadcasts` row + enqueues per-recipient `user_notifications`. Audit log: `action='send_broadcast'`, metadata includes segment + recipient_count.

---

## 7. LOCKED — KYC review queues

### Decision: SINGLE review surface `/admin/kyc` with archetype filter tabs.

Rationale: same review pattern (open document, signed URL, approve/reject with reason, audit log). Splitting per-archetype duplicates UI for no gain.

### Canonical table

**`kyc_documents`** (already exists, expand `subject_kind` enum):
- `id, subject_kind text` ∈ `('partner','mentor','driver','ambassador')`
- `subject_id uuid` (FK to the appropriate domain table)
- `doc_type text` ∈ `('cin','license','vehicle_registration','diploma','business_license','tax_id','address_proof','other')`
- `file_path text` (private bucket `kyc-documents`)
- `status text` ∈ `('pending','approved','rejected')`
- `reviewed_by uuid NULL`
- `reviewed_at timestamptz NULL`
- `rejection_reason text NULL`
- `owner_user_id uuid` (uploader)

### Surface tabs

`/admin/kyc?subject_kind=partner|mentor|driver|ambassador` — same component, different filter. Each tab shows:
- Pending count badge.
- Per-subject card: name, all docs with status, signed URL viewer (15-min TTL), approve-all / reject-with-reason actions.

### Approval RPCs (uniform)

- `admin_approve_partner(p_partner_id)` — adds row, flips `partners.status='active'`.
- `admin_approve_mentor(p_mentor_id)` — exists.
- `admin_approve_driver(p_driver_id)` — TO ADD (currently direct table update, see audit 07 P2-9).
- `admin_approve_ambassador(p_ambassador_id)` — exists as `app/api/admin/ambassadors/approve`.

All write to `audit_log` with `action='approve_kyc'`, `resource_type='<kind>'`.

### Storage policy ADD

`kyc_admin_read` policy on `storage.objects` for bucket `kyc-documents`: allow read when `auth.uid() IN (SELECT profile_id FROM admin_roles WHERE role IN ('super_admin','admin'))`. Without this, admin viewer requires service-role signed URLs (current pattern works but inconsistent).

---

## 8. LOCKED — Support tickets

### Canonical surface

**`/admin/support`** — single inbox. (`/admin/tickets` is NOT canonical; alias-redirect if needed.)

### Canonical table

**`support_tickets`** (NEW — does not exist today):
- `id uuid PK`
- `requester_id uuid NOT NULL` (FK profiles)
- `requester_role text` ∈ `('teen','parent','partner','ambassador','mentor','driver')`
- `subject text NOT NULL`
- `category text` ∈ `('account','payment','refund','content_report','technical','partner_dispute','kyc','cndp','other')`
- `priority text NOT NULL DEFAULT 'normal'` ∈ `('low','normal','high','urgent')` (auto = `urgent` for `category IN ('cndp','refund') OR requester_role='teen' AND category='content_report'`)
- `status text NOT NULL DEFAULT 'open'` ∈ `('open','assigned','waiting_user','resolved','closed')`
- `assigned_to uuid NULL` (admin profile_id)
- `created_at, updated_at, resolved_at, closed_at timestamptz`
- `first_response_at timestamptz NULL` (SLA tracking)

Plus **`support_ticket_messages`** — `id, ticket_id, author_id, body, attachments jsonb, is_internal_note boolean, created_at`.

### SLA (LOCKED)

| Priority | First response | Resolution target |
|----------|----------------|-------------------|
| urgent   | 1 hour          | 4 hours           |
| high     | 4 hours         | 24 hours          |
| normal   | 24 hours        | 5 business days   |
| low      | 48 hours        | 10 business days  |

SLA breach = open + no `first_response_at` past target. Surfaces as red badge in inbox. Cron job `support-sla-check` (daily) writes audit_log entries for breaches.

### Assignment

- Default: round-robin among `support` + `moderator` sub-roles by category.
- `category IN ('refund','cndp','kyc')` → auto-assign to `admin` queue (support cannot resolve, only triage).
- Manual reassignment by anyone with `support.tickets` permission.

### Escalation chain

`support` → `moderator` → `admin` → `super_admin`. Triggered manually OR auto on SLA breach (one level per breach).

---

## 9. DEPRECATED

These pages MUST be removed or merged. Listed with replacement.

| Deprecated route                     | Replacement                                    | Action |
|--------------------------------------|------------------------------------------------|--------|
| `/admin` KPI dashboard widgets duplicating analytics | Keep `/admin` as landing only (counts + recent + upcoming). Move all chart KPIs to `/admin/analytics`. | Refactor |
| `/admin/analytics`                   | KEEP as canonical analytics surface.           | Canonical |
| `/admin/gamification/scorecard`      | Merge into `/admin/analytics` as a tab "Live Pulse". | Delete route, move component |
| `/admin/logs`                        | `/admin/audit-log`                             | Rename + repoint table to `audit_log` |
| `/admin/proofs`                      | `/admin/moderation?type=defi_proof`            | Delete |
| `/admin/creator-moderation`          | `/admin/moderation?type=feed_post`             | Delete |
| `/admin/content/review`              | `/admin/moderation?type=quiz_ai`               | Delete |
| `/admin/marketplace` (moderation)    | `/admin/moderation?type=marketplace_listing` (disputes go to `/admin/finances`) | Delete |
| `/admin/content` (mock)              | Delete entirely (mock UI, never wired).        | Delete |
| `/admin/partners` (KYC)              | `/admin/kyc?subject_kind=partner`              | Delete |
| `/admin/mentors` (KYC)               | `/admin/kyc?subject_kind=mentor`               | Delete |
| `/admin/drivers` (KYC)               | `/admin/kyc?subject_kind=driver`               | Delete |
| `/admin/topups`                      | `/admin/finances` → Top-ups tab                | Delete route, move component |
| `/admin/permissions`                 | `/admin/system` → Permissions tab              | Move under super_admin-only `/admin/system` |
| `/admin/scripts-sql`                 | `/admin/system` → SQL tab, super_admin only, behind a 2nd confirm + `ENABLE_ADMIN_SQL_EXECUTION=true` env flag. | Ring-fence (do NOT remove — needed for ops) |
| `/admin/gamification-setup`          | DELETE — one-shot migration runner, not product. | Delete |
| `/admin/tag-normalize`               | `/admin/system` → Cron audits tab              | Move |
| `/admin/internships`                 | Move to `/admin/operations` → Internships tab  | Move |
| `/admin/clubs`, `/admin/anniversaires` | Move into `/admin/evenements` as tabs        | Move |
| `/admin/check-in`                    | Move into `/admin/reservations` as a tab      | Move |
| `/admin/ambassadeurs`                | Move into `/admin/kyc` (approval) + `/admin/utilisateurs?role=ambassador` for management | Merge |

**Single canonical KPI dashboard:** `/admin/analytics`. The root `/admin` is the operational landing (pending counts + queue badges + recent activity), not a KPI surface. Number-drift between three dashboards is ELIMINATED.

---

## 10. FORBIDDEN patterns

Banned at code-review time. Linter rule + grep gate in CI.

1. **`userInfo.role === "admin"`** or any string-equality role check in `/admin/**`. Violations: `/admin/drivers`, `/admin/drivers/[id]`, `/admin/logs`, `/admin/marketplace` per audit B4 §4.4. MUST use `requireAdminPermission(<perm>)` or `roleHasPermission()`.
2. **SQL runner / migration runner exposed without `super_admin` guard AND `ENABLE_ADMIN_SQL_EXECUTION=true`.** Both checks are required. Today `/admin/scripts-sql` is in the sidebar with no permission gate — FORBIDDEN.
3. **Sub-role ignored in nav rendering.** `components/layouts/admin-sidebar.tsx` MUST iterate items and skip those failing `roleHasPermission`. Today every sub-role sees the same 10 links — FORBIDDEN.
4. **Direct writes to source moderation tables (`feed_posts`, `marketplace_listings`, etc.) from admin UI.** All moderation actions MUST go through `moderate_content` RPC so audit + dedupe + auto-restrict are enforced.
5. **Refund / payout / top-up writes outside the canonical RPCs in §5.** Any direct UPDATE on `payment_transactions` / `escrow_ledger` / `partner_payouts` from app code is FORBIDDEN.
6. **`getPublicUrl` on `kyc-documents`, `cin-scans`, or `defi-proofs`.** Always signed URL with ≤15-min TTL. Already grep-clean per audit 07 — keep it that way.
7. **Multiple moderation queue tables.** Anything that creates `content_reviews`, `proof_reviews`, `creator_moderation_queue`, etc., is FORBIDDEN. Single `moderation_queue` table only.
8. **Writing to `admin_audit_logs` or `activity_logs`.** Both are non-canonical. Single canonical table is `audit_log` (§4).
9. **`logAdminAction` called without `await` or with swallowed error.** Audit writes MUST throw on failure (CNDP requirement) — current swallowing pattern is FORBIDDEN.
10. **Hardcoded admin role list in middleware or layout** that diverges from `ADMIN_PERMISSIONS`. Single source: `lib/auth/admin-permissions.ts`.

---

## 11. MISSING (must build)

In priority order. Each maps to a section above.

1. **`/admin/utilisateurs/[id]`** — user detail. Merged view: profile + bookings + children/parent links + ambassadors + KYC docs + top-ups + audit log timeline + suspend/ban/impersonate actions. (B4 §3.1)
2. **`/admin/finances`** — single tabbed financial console (refunds, top-ups, partner payouts, reconciliation). (§5, B4 §3.2)
3. **`/admin/support`** — support inbox with `support_tickets` + `support_ticket_messages` tables, SLA tracking, assignment, escalation. (§8, admin-moderation §3.4)
4. **`/admin/moderation`** — unified inbox over `moderation_queue`, sub-tabs by `content_type`. Replaces the four split queues. (§3, B4 §3.3)
5. **`/admin/broadcasts`** — composer + history backed by new `broadcasts` table. (§6, B4 §3.13)
6. **`/admin/audit-log`** — viewer over canonical `audit_log` table; replace `/admin/logs`. (§4, admin-moderation §2)
7. **`/admin/operations`** — restaurant/food ops (orders, disputes, refund hooks) + ride/curfew monitor (active rides, curfew violations queue, incident reports). (B4 §3.6, §3.7)
8. **`/admin/cndp`** — data subject access requests dashboard (export queue, erasure queue, consent revocations). Backed by `data_exports` (exists) + new `account_deletion_requests`. (audit 07 P1-1, P1-2)
9. **`/admin/kyc`** — unified KYC review across partner/mentor/driver/ambassador with `subject_kind` filter. (§7)
10. **`/admin/system`** — super_admin-only: settings, permissions manager, ring-fenced SQL runner, cron status, feature flags.
11. **`audit_log` table + `logAdminAction` rewrite** to target it. Backfill from any existing `admin_audit_logs` rows if present.
12. **`moderate_content` RPC** dispatching by content_type + auto-write to `audit_log`.
13. **`refunds` table + canonical refund RPCs** (§5).
14. **`broadcasts` table + send-engine.**
15. **`support_tickets` + `support_ticket_messages` tables** + SLA cron.
16. **Sidebar role-aware filter** wrapping `navItems.map(...)` with `roleHasPermission`.

---

## 12. UNRESOLVED founder decisions + recommendations

### D1. Single moderation inbox vs per-type queues

**Recommendation: SINGLE inbox (`/admin/moderation`), tabs as filters.**
- Rationale: dedupe is enforced at the table layer (one row per `(type, content, reporter)`), no risk of the same item in two queues, one SLA model, one audit shape. Per-type pages today already drift in UI/UX.
- Cost: one merge effort, four pages deleted, one new page.
- Locked in §3 above pending founder veto.

### D2. Does `super_admin` sub-role exist, or admin-only?

**Recommendation: KEEP `super_admin` as a distinct sub-role.**
- Rationale: financial reconciliation, role changes, SQL runner, system settings, and CNDP erasure are all single-decision-of-no-return operations. They warrant a separation from `admin` (who handles day-to-day ops including refunds and KYC).
- The four sub-roles map cleanly to typical SaaS staffing: 1 super_admin (founder/CTO), 2-3 admins (ops lead), 4-8 moderators (community), 4-8 support agents.
- Locked in §1 above pending founder veto.

### D3. SQL runner — remove or ring-fence?

**Recommendation: RING-FENCE, do not remove.**
- Rationale: ops genuinely need it for incident response (data fixes, emergency cleanup). Removing it forces direct Supabase Studio access which has no audit trail in our system.
- Required guards (ALL of):
  1. `requireAdminPermission('system.sql')` (super_admin only).
  2. `ENABLE_ADMIN_SQL_EXECUTION=true` env flag (default off in prod).
  3. Allow-listed script IDs (current pattern) OR mandatory 2-step confirm for free-form.
  4. Every execution writes to `audit_log` with full SQL text in metadata.
  5. IP allow-list at middleware (founder's static IPs).
- Keep `/admin/system` as the home; delete `/admin/scripts-sql` and `/admin/gamification-setup` standalone pages.

### D4. Moderator suspend authority

ACL today gives moderator `users.edit` but not `users.delete`. **Recommendation: moderator can flag-for-suspend (writes to `audit_log` with `action='request_suspend'`), admin reviews and executes.** No silent suspend by moderator. Locked in §1.

### D5. Audit retention — CNDP minimum vs commercial preference

**Recommendation: 24 months hot + 5 years cold (as locked in §4).**
- CNDP minimum is 12 months for processing logs; 5 years aligns with BAM e-money record-keeping and Moroccan commercial code. Single retention rule across both regulators is simpler than splitting.

### D6. Refund signoff for partial refunds

ACL today: `reservations.refund` is admin+super_admin. **Recommendation: full refund = admin signoff; partial refund < 200 DH = admin; partial refund ≥ 200 DH = super_admin co-signoff (two-person rule).** Implementable as a check inside `refund_booking` RPC: if `p_amount_dh >= 200 AND NOT super_admin THEN write to `pending_refund_approvals` and require second approval.

### D7. Bootstrap of first super_admin

Today `admin_roles` is empty in prod. **Recommendation: seed via a one-shot SQL migration that promotes the founder's email (looked up in `profiles`) to `super_admin` AND writes the `admin_roles` row. Document the migration ID in `docs/RUNBOOK.md`. After seed, all role changes go through `/admin/system` UI.**

---

## Contradictions flagged

1. **`admin_roles.permissions jsonb` column is referenced by `getAdminInfo` but does not exist in DB** (admin-moderation §2). The lock assumes the column exists for custom overrides — ADD it via migration, OR remove the merge logic from `getAdminInfo`. Recommend ADD to preserve future flexibility.
2. **`profiles.role` and `admin_roles.role` are double-tracked.** Lock chooses `admin_roles` as source of truth (matches `getAdminInfo` precedence). `profiles.role` becomes a denormalized mirror updated by trigger. Today they can drift silently.
3. **Audit 07 verifies `admin_audit_logs` exists and is written ("Good")** while admin-moderation says it does NOT exist. Discrepancy resolved: audit 07 is more recent (Wave 3.x added it for marketplace + curfew). Lock canonicalizes to `audit_log` (singular, no `admin_` prefix because system + cron actions also write here) and deprecates `admin_audit_logs` — migrate rows during the rename.
4. **`moderation_reports` (referenced by `app/api/circles/report/route.ts`) has no migration** but `moderation_queue` exists. Lock canonicalizes to `moderation_queue`; the circles report route MUST be updated to insert into `moderation_queue` with `content_type='circle_message'`.
5. **`activity_logs` is queried by `/admin/logs` but does not exist.** Lock deletes `activity_logs` reference; viewer reads `audit_log`.
6. **`notifications` table referenced in `app/api/parent/approvals/route.ts` does not exist** (canonical is `user_notifications`). Already flagged P0 in audit 07; lock confirms `user_notifications` is canonical.

---

END LOCKED.
