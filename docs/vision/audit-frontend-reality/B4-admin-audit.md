# B4 — Admin Frontend Audit

> READ-ONLY audit. Scope: `app/admin/**/page.tsx` + admin sidebar nav.
> Method: top-60 line read per page, score 0–10, classify data source.
> Date: 2026-05-08.

Middleware (`middleware.ts:209`) gates `/admin/*` against `admin_roles` table.
Sub-roles defined in `lib/auth/admin-permissions.ts`: **super_admin**, **admin**,
**moderator**, **support** — but the sidebar exposes the SAME nav to all four
sub-roles (no role-aware UI filtering). Per-page protection is uneven: most
pages re-check `admin_roles` server-side, a few only check `getUserRole().role
=== "admin"` (which excludes moderator/support entirely — see Section 4 doublons).

---

## Section 1 — Admin Nav Inventory + Sub-Role Expectations

### 1.1 Sidebar items (10 hard-coded, no role gating)

Source: `components/layouts/admin-sidebar.tsx:33-84`. The sidebar is rendered
identically for every sub-role.

| # | Label             | Href                  | Icon            |
|---|-------------------|-----------------------|-----------------|
| 1 | Dashboard         | `/admin`              | LayoutDashboard |
| 2 | Événements        | `/admin/evenements`   | Calendar        |
| 3 | Réservations      | `/admin/reservations` | Ticket          |
| 4 | Anniversaires     | `/admin/anniversaires`| Cake            |
| 5 | Check-in          | `/admin/check-in`     | QrCode          |
| 6 | Utilisateurs      | `/admin/utilisateurs` | Users           |
| 7 | Clubs             | `/admin/clubs`        | Trophy          |
| 8 | Ambassadeurs      | `/admin/ambassadeurs` | Award           |
| 9 | Analytics         | `/admin/analytics`    | BarChart3       |
|10 | Scripts SQL       | `/admin/scripts-sql`  | Database        |

### 1.2 Pages NOT in sidebar (orphans — reachable only by deeplink)

These exist as `page.tsx` but have no nav entry. They are effectively hidden
from admins who don't know the URL.

- `/admin/content` (client-only stub — see scoring)
- `/admin/content/review` (AI quiz pedagogical review)
- `/admin/creator-moderation` (Wave 2.3 feed_post moderation)
- `/admin/drivers` + `[id]` (Nivy transport KYC)
- `/admin/internships` (V1.1 P2.5)
- `/admin/logs` (audit trail)
- `/admin/marketplace` (C2C moderation + disputes)
- `/admin/mentors` (mentor KYC)
- `/admin/partners` (partner KYC)
- `/admin/permissions` (super_admin role manager)
- `/admin/proofs` (defi/feed moderation queue)
- `/admin/topups` (manual top-up dashboard)
- `/admin/tag-normalize` (Polish-E tag taxonomy)
- `/admin/gamification/scorecard` (Live Pulse 10/10)
- `/admin/gamification-setup` (one-shot migration runner)

That's **15 orphan pages** vs. 10 sidebar items. The sidebar is roughly
half-built relative to actual routes.

### 1.3 Sub-role expectations (per `ADMIN_PERMISSIONS` matrix, lines 4-60)

| Sub-role      | What they should see / do                                                                                         | Reality                                      |
|---------------|-------------------------------------------------------------------------------------------------------------------|----------------------------------------------|
| `super_admin` | Everything + `system.settings`, `system.sql`, `system.permissions`, `analytics.financial`, `users.change_role`     | Sees full sidebar; orphans only via deeplink |
| `admin`       | All ops surfaces: events, partners, ambassadors, refunds, content publish, system logs (no SQL/permissions)        | Same sidebar as super_admin                  |
| `moderator`   | View users, edit users, create/edit events, approve creator content, view ambassadors/partners, reservations cancel | Same sidebar; can hit pages that allow them but UI doesn't tell them what's gated |
| `support`     | Only: view users, view events, reservations checkin/view, support tickets/replies                                  | Sees sidebar items they cannot use (e.g. Clubs, Ambassadeurs, Analytics) — will hit redirect or "Accès refusé" pages |

**Gap:** the permission matrix exists in code, but the sidebar does not consume
it. There is no `roleHasPermission(...)` filter wrapping `navItems.map(...)`.
Every sub-role sees the same 10 links, several of which redirect them away.

---

## Section 2 — Scoring Table per Admin Page

Score scale: **0** = file exists but redirects/empty, **3** = stub UI no real
data, **5** = real data but read-only and minimal, **7** = full CRUD or full
moderation flow, **10** = complete with stats, filters, exports, audit logs.

Data source: `live` = Supabase server query in page; `live-rpc` = uses
service-role + RPC; `client-fetch` = useEffect → API; `static` = hard-coded
constants only.

| # | Path | Score | Data source | Notes |
|---|------|-------|-------------|-------|
| 1 | `/admin` | 7 | live (server) | Real KPIs from `profiles`/`events`/`bookings`; counters + recent + upcoming. Solid landing. |
| 2 | `/admin/evenements` | 7 | live (server) | List + per-event bookings/revenue aggregation; CRUD via `creer` / `modifier` / `supprimer`. |
| 3 | `/admin/evenements/creer` | 6 | client-fetch | Client form with VIPPricePreview. No image upload visible top-60. |
| 4 | `/admin/evenements/[id]/modifier` | 6 | client-fetch | Symmetric to creer + status field. |
| 5 | `/admin/evenements/[id]/supprimer` | 5 | client-fetch | Confirmation page; loads bookings count. |
| 6 | `/admin/reservations` | 7 | live (server) | Filter by status + search; full booking list with profile/event joins. |
| 7 | `/admin/anniversaires` | 6 | live (server) | Stats counts (total/pending/confirmed/upcoming). Tabs/Table imports suggest deeper UI below cut. |
| 8 | `/admin/anniversaires/[id]` | 6 | live (server) | Order detail with extras + actions client component. |
| 9 | `/admin/check-in` | 6 | live (server) | Loads week's events; delegates to `<CheckInInterface>`. |
|10 | `/admin/utilisateurs` | 6 | live (server) | Full profile list + bookings/children stats; search param. No bulk actions visible. |
|11 | `/admin/clubs` | 6 | live (server) | List + enrollments count + CRUD links. |
|12 | `/admin/clubs/creer` | 6 | client-fetch | Standard form. |
|13 | `/admin/clubs/[id]/supprimer` | 5 | client-fetch | Confirmation. |
|14 | `/admin/ambassadeurs` | 6 | live (server) | Status counters; uses correct `ambassadors_profile_id_fkey` join. |
|15 | `/admin/analytics` | 7 | live (server) | Revenue-by-month aggregation, all bookings/events/users; `<RealtimeKPIs>` widget. No export visible. |
|16 | `/admin/scripts-sql` | 2 | static | Just a list of SQL filenames + button to open Supabase SQL editor in a new tab. Not actually runnable from the app. |
|17 | `/admin/content` | 3 | client-only | `"use client"`, no fetch in top 60 — Tabs/Dialog scaffolding only; appears to be an unfinished mock. |
|18 | `/admin/content/review` | 8 | live-rpc (service role) | AI quiz review queue with approve/reject mutations + audit log. Tight. |
|19 | `/admin/creator-moderation` | 8 | live-rpc | feed_post pending queue with approve/reject/feature RPC. |
|20 | `/admin/drivers` | 7 | live (server) | KYC queue + active list with try/catch banner. **Gates on `role === "admin"` only — locks out moderator/support.** |
|21 | `/admin/drivers/[id]` | 6 | live (server) | Driver detail + DriverActions. Same gate issue as parent. |
|22 | `/admin/internships` | 7 | live-rpc | Status filter, post form, close action. Solid. |
|23 | `/admin/logs` | 5 | live (server) | Last 100 activity_logs with user join. No filters/export hooked up despite imports. |
|24 | `/admin/marketplace` | 7 | live-rpc | Pending listings + open disputes; try/catch banner. |
|25 | `/admin/mentors` | 7 | live-rpc | KYC queue + active mentors + 15-min signed URLs for KYC docs. **Reject endpoint flagged "not yet implemented" in source comment**. |
|26 | `/admin/partners` | 8 | live-rpc | KYC queue with approve/reject + 5-state counters + signed URL inspection. Strongest moderation surface. |
|27 | `/admin/permissions` | 6 | live (server) | Lists admin/staff + 50 recent users for role changes. Gated by `system.permissions` (super_admin only). |
|28 | `/admin/proofs` | 7 | live-rpc | Generic moderation_queue with content_type hydration + signed URL for defi-proofs. |
|29 | `/admin/topups` | 7 | live-rpc | Pending manual_topup_requests + status filter; confirms via top_up_teen RPC. |
|30 | `/admin/tag-normalize` | 6 | live-rpc | Reads latest cron audit log payload + decorates with `tag_aliases`. |
|31 | `/admin/gamification/scorecard` | 5 | client-fetch | `getLiveScorecard()` client call; "Live Pulse" KPIs (D1, sessions, social, etc.). |
|32 | `/admin/gamification-setup` | 2 | client-fetch | One-shot migration runner UI with hard-coded list of 19 SQL files. Operational hack, not product. |

**Average score: ~5.9 / 10.** Strong on KYC moderation queues
(partners/mentors/proofs/creator-moderation = 7–8). Weak on ops tooling
(scripts-sql=2, gamification-setup=2, content=3, logs=5).

---

## Section 3 — Gaps (surfaces an admin SHOULD have for ops, missing or stub)

### 3.1 User / Identity Ops — partial

- **Missing user search**: `/admin/utilisateurs` supports `?search=` param but
  filters client-side AFTER pulling all profiles. No server-side full-text,
  no phone/booking-ref cross-search, no merged search across teen/parent.
- **Missing "view as user" / impersonation** — none of the pages expose a
  support-grade impersonation mode. Support sub-role has nothing to do.
- **Missing user detail page** — there is no `/admin/utilisateurs/[id]` route.
  Admin can list users but cannot drill into one (no merged view of bookings,
  children, ambassadors, KYC, top-ups, audit log).
- **Missing role-change audit trail UI** — `/admin/permissions` exposes role
  changes but the audit trail is only viewable via `/admin/logs`, which is a
  100-row dump with no filter on `resource_type='admin_roles'`.

### 3.2 Financial Reconciliation — almost entirely missing

- No **/admin/payments** dashboard — Stripe/CMI/Cashplus/Wafacash/M2T
  webhooks exist (`csrfExemptPrefixes` in middleware) but there is no admin
  UI to inspect transaction status, reconcile mismatches, trigger refunds.
- No **/admin/refunds** queue — `reservations.refund` permission exists but
  has no surface that consumes it.
- No **/admin/payouts** — partners earn revenue, ambassadors earn
  commissions, mentors are paid hourly. No payout reconciliation page.
- `/admin/topups` is the closest thing but is scoped to manual top-ups only.
- `/admin/analytics` shows revenue trends but has no per-PSP breakdown,
  no failed-payment retry flow, no chargeback queue.

### 3.3 Content Moderation Queue — fragmented across 4 pages

There are **four separate moderation queues** (see Section 4 doublons):
`/admin/proofs`, `/admin/creator-moderation`, `/admin/content/review`,
`/admin/marketplace`. There is no **unified inbox** showing total pending
items across the four. A moderator who lands on `/admin` cannot see "12
items waiting".

### 3.4 Support Tickets — completely missing

- `support.tickets` and `support.reply` permissions are defined for the
  `support` sub-role, but there is no `/admin/support`, no
  `/admin/tickets`, no `/admin/conversations`. The `support` sub-role has
  literally nothing to do once they log in.
- No inbox for parent/teen complaints, no SLA tracking, no escalation.

### 3.5 Partner Approval Queue — exists but isolated

`/admin/partners` is the strongest moderation page (score 8) but:
- No "partner activity" view post-approval (their bookings, their revenue,
  their listing health).
- No `/admin/partners/[id]` detail page visible in the file tree.
- No suspension flow visible (status enum exists but no UI action).

### 3.6 Ride / Driver Ops — partial

- `/admin/drivers` validates KYC but there is no **active rides monitor**,
  no GPS/location view, no incident reporting queue, no curfew-violation
  queue (the `cron/ride-curfew-check` route exists in untracked files).

### 3.7 Restaurant / Food Partner Ops — missing entirely

- New `app/api/partner/restaurant/` and `app/parent/food/` exist (see git
  status untracked) but there is no `/admin/restaurants` or
  `/admin/food-orders` page to moderate restaurant onboarding, dispute
  food orders, refund failed deliveries.

### 3.8 Mentorship Ops — partial

- `/admin/mentors` covers KYC but the source comment flags the **reject
  endpoint as not yet implemented**. There is no mentor-session dispute
  queue, no payout reconciliation, no rating moderation.

### 3.9 Internships Ops — minimal

- `/admin/internships` lets admin post + close. There is no application
  review (parent consent flow), no per-internship applicant list visible
  in the page top.

### 3.10 Analytics & Exports — no exports

- `/admin/analytics` displays charts but the imports for `Download` icon in
  `/admin/logs` and `/admin/utilisateurs` and `/admin/reservations` are
  not wired to anything visible. CSV/Excel export for compliance (CNDP /
  parental records) is missing.
- No **financial dashboard** for super_admin (the `analytics.financial`
  permission has no consumer page).
- No **cohort retention** dashboard beyond the `scorecard` Live Pulse.
- No **A/B test** results page despite personalization-engine docs.

### 3.11 System / DevOps surfaces — hacky

- `/admin/scripts-sql` (score 2) and `/admin/gamification-setup` (score 2)
  are pre-launch ops hacks — they should not be linked from a production
  admin sidebar but `scripts-sql` is item #10 of the live nav.
- Missing: **/admin/feature-flags** (no UI for gating features by city,
  cohort, age), **/admin/cron-status** (despite many cron routes),
  **/admin/notifications/broadcast** (no surface to push platform-wide
  announcements), **/admin/cndp-requests** (despite CNDP filing dossier
  in docs).

### 3.12 Compliance — missing

- No **/admin/cndp** for data subject access requests (export / delete).
- No **/admin/parental-consents** dashboard despite parental consent being
  a core gating mechanism.
- No **/admin/age-verification** queue.

### 3.13 Notifications & Communication — missing

- No surface to send a one-off push/email blast to a cohort.
- No template editor.
- No delivery / open-rate dashboard.

---

## Section 4 — Doublons (overlapping or redundant pages)

### 4.1 Four moderation queues, no unified inbox

| Page                        | Queue                              | Source table              |
|-----------------------------|------------------------------------|---------------------------|
| `/admin/proofs`             | Generic moderation_queue (defi etc.) | `moderation_queue`      |
| `/admin/creator-moderation` | feed_post pending                   | `feed_posts`             |
| `/admin/content/review`     | AI-generated quizzes                | `educational_quizzes`    |
| `/admin/marketplace`        | Listings pending + disputes         | `marketplace_listings`   |

**Doublon risk**: `/admin/proofs` already hydrates feed_post and
marketplace_listing content_types. So it overlaps with both
`/admin/creator-moderation` (feed_post) and `/admin/marketplace`
(listings) — same row could appear in two queues. No clear ownership
contract documented.

### 4.2 Two SQL/migration runners

- `/admin/scripts-sql` — links out to Supabase SQL editor with file list.
- `/admin/gamification-setup` — calls `/api/admin/run-migration` directly.

Both expose dangerous capabilities; only `scripts-sql` is in the sidebar.
Only super_admin should see either, but neither is gated by
`system.sql` / `system.migrations` permission in the read top-60.

### 4.3 Three "stats / KPI" surfaces

- `/admin` (root dashboard) — KPIs from raw queries.
- `/admin/analytics` — chart-driven KPIs.
- `/admin/gamification/scorecard` — "Live Pulse" KPIs (retention/engagement/social/economy).

These do not share a common KPI library. Different metric sets, different
styling (analytics is dark zinc; scorecard is also dark zinc but its own
`getLiveScorecard()`). Risk: number drift between dashboards (D1 retention
in scorecard vs. analytics monthly bookings).

### 4.4 Auth gate inconsistency (not a doublon but related)

Three different gating styles in /admin pages:

1. **Inline `admin_roles` check** (most pages): `/admin/page.tsx`,
   `/admin/evenements`, `/admin/reservations`, `/admin/utilisateurs`,
   `/admin/check-in`, `/admin/clubs`, `/admin/ambassadeurs`,
   `/admin/anniversaires`, `/admin/topups`, `/admin/partners`,
   `/admin/proofs`, `/admin/mentors`, `/admin/internships`,
   `/admin/content/review`, `/admin/creator-moderation`,
   `/admin/tag-normalize`.
2. **`getUserRole()` + `role === "admin"` only** (excludes
   moderator/support): `/admin/drivers`, `/admin/drivers/[id]`,
   `/admin/logs`, `/admin/marketplace` (uses array but `getUserRole`).
3. **`getAdminInfo()` + `checkAdminPermission(...)`**: `/admin/permissions`
   only — the only page using the proper permission matrix.

This means a `moderator` who can legally access `/admin/drivers` per the
permission matrix will be redirected to `/login` because the page
hard-codes `=== "admin"`. Style #2 is buggy.

### 4.5 `/admin/utilisateurs` vs. `/admin/permissions` overlap

Both show user lists. `/admin/utilisateurs` shows everyone with revenue
stats. `/admin/permissions` shows the same `profiles` table filtered to
admin roles + first 50 users for role-change. The "first 50 users" panel
in permissions duplicates the utilisateurs list with worse filtering.

### 4.6 `/dashboard` vs. `/admin`

`/dashboard` (per middleware lines 297-303) redirects to the role-specific
dashboard. For admins, that means redirect to `/admin`. So `/dashboard`
itself is not an admin surface — but the middleware does NOT explicitly
include `admin` in `dashboardPaths` (line 280), only `["/teen", "/parent",
"/ambassador", "/partner"]`. Effect: an admin hitting `/dashboard` will
fall through to the `/dashboard === pathname` branch which redirects to
`/admin` — works by accident, not by design.

### 4.7 Sidebar Admin nav vs. Real route surface — 60% gap

The sidebar surfaces 10 of ~24 unique admin top-level routes. The
remaining 14 (drivers, mentors, partners, proofs, marketplace,
internships, topups, permissions, content review, creator moderation,
tag-normalize, logs, scorecard, gamification-setup) are reachable only by
typed URL. This is the biggest doublon-adjacent issue: navigation lies
about what admin can do.

---

## Summary

- **24 admin top-level routes** discovered; **10 in sidebar**, **14 orphan**.
- Average page score **~5.9/10**. Strong moderation queues (partners 8,
  mentors 7, proofs 7, creator-moderation 8, marketplace 7); weak ops
  tooling (scripts-sql 2, content 3, gamification-setup 2).
- **Sub-role UX**: nav is identical for super_admin/admin/moderator/support.
  `support` has effectively no page to use.
- **Biggest functional gaps**: financial reconciliation, support tickets,
  user detail page, unified moderation inbox, CNDP/compliance, broadcast
  notifications, restaurant/food ops.
- **Biggest structural issues**: 4 fragmented moderation queues with
  overlap, 2 SQL runners, 3 KPI dashboards with no shared metric layer,
  and 3 incompatible auth-gate styles producing role-matrix bugs.
