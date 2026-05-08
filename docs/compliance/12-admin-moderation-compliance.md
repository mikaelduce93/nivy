# 12 — ADMIN + MODERATION canon compliance audit

> Source of truth: `docs/canon/admin-moderation.locked.md` + `docs/canon/INDEX.locked.md`.
> Domain owner lock: `admin-moderation.locked.md` (LOCKED 2026-05-08).
> Scope: every `/admin/*` page, every `/api/admin/*` route, sidebar, audit pipeline, refunds, broadcasts, KYC, support, SQL runner.
> Method: read-only static analysis. No code mutated. Findings cite `file:line`.

---

## 0. Score + launch status

| Block | Result |
|---|---|
| **Compliance score** | **22 / 100** |
| **Launch status** | **BLOCKED** — 8 P0/P1 violations in the locked-domain checklist; 9 of the 13 canonical sidebar surfaces do not exist; the canonical audit table (`audit_log`) is not in the schema and code writes to a different shape (`admin_audit_logs`). |
| **Distance to ship** | ~2 weeks: rename + restructure audit log, build 5 missing surfaces (`/admin/moderation`, `/admin/finances`, `/admin/audit-log`, `/admin/broadcasts`, `/admin/kyc`, `/admin/support`, `/admin/system`, `/admin/operations`), wire role-aware sidebar, ring-fence SQL runner. |

Score breakdown (10 checks @ 10 pts each):

| # | Check | Pts |
|---|---|---:|
| 1 | Sub-role gating on every admin page | 2 |
| 2 | Role-filtered 13-item sidebar | 0 |
| 3 | Single `/admin/moderation` over `moderation_queue` | 2 |
| 4 | Canonical `audit_log` (singular) + `logAdminAction` rewrite | 1 |
| 5 | `/admin/finances` tabbed surface + 7 RPCs | 1 |
| 6 | `/admin/broadcasts` route + `broadcasts` table | 2 |
| 7 | `/admin/kyc?subject_kind=…` unified surface | 3 |
| 8 | `/admin/support` + `support_tickets` + `support_ticket_messages` | 0 |
| 9 | `/admin/scripts-sql` ring-fenced to `super_admin` | 1 |
| 10 | `admin_roles.permissions` JSONB column matches code | 0 |

Tie-breakers: KYC scores 3/10 because `kyc_documents` exists with a partial `subject_kind` enum; moderation scores 2/10 because `moderation_queue` exists and one shared inbox renders at `/admin/proofs`, but four orphan routes still write to it.

---

## 1. Findings — standard schema

Every finding: id (`CANON-ADMIN-NNN`) — severity — section in lock — short title — evidence (`file:line`) — required fix.

### CANON-ADMIN-001 — P0 — §10.8 / §4 — `logAdminAction` writes to a non-canonical table with the wrong shape

The single canonical helper in `lib/auth/admin-permissions.ts:155-176` inserts into `admin_audit_logs` with columns `admin_id, action, description, resource_type, resource_id, metadata, ip_address, user_agent, created_at`. Canon §4 mandates table name `audit_log` (singular) with columns `actor_id, actor_role, action, resource_type, resource_id, target_user_id, description, metadata, ip_address, user_agent, created_at` and explicit BIGSERIAL PK.

Two separate breaks:

1. Wrong table name (`admin_audit_logs` vs canonical `audit_log`).
2. Schema drift: code uses `admin_id` (canon: `actor_id`), `target_type/target_id` (canon: `resource_type/resource_id` + separate `target_user_id`), `payload` (canon: `metadata`). Confirmed at:
   - `gamification-system/database/migrations/068_v12_admin_ops.sql:7-23` declares `admin_audit_logs` with columns `action, target_type, target_id, created_at` (only indexes; the table CREATE is in an earlier migration that is no longer in tree — see CANON-ADMIN-013).
   - 28 producers across `app/api/**` insert that schema (`refunds/route.ts:280`, `topups/[id]/confirm/route.ts:117`, `partners/[id]/approve/route.ts:81`, `moderation/[id]/approve/route.ts:74`, etc.).

Fix: rename via migration + alias view `audit_log` AS the new canonical schema + rewrite `logAdminAction` to insert `actor_id, actor_role, action, resource_type, resource_id, target_user_id, description, metadata` and propagate to all 28 call sites.

---

### CANON-ADMIN-002 — P0 — §10.9 — `logAdminAction` swallows errors

`lib/auth/admin-permissions.ts:163-176` calls `await supabase.from("admin_audit_logs").insert(...)` but ignores the result — no `.throwOnError()` and no error-bubble. The lock §10.9 makes this FORBIDDEN: audit writes MUST throw on failure (CNDP requirement). Combined with CANON-ADMIN-001 (table-name mismatch in some envs), audit writes silently no-op.

Fix: `await supabase.from("audit_log").insert(...).throwOnError()`. All callers must `await` (most do; verify `app/api/admin/topups/[id]/confirm/route.ts:117,196` which double-writes).

---

### CANON-ADMIN-003 — P1 — §1 + §10.1 — Pages gate on `userInfo.role === "admin"` instead of `requireAdminPermission`

Hard-coded string-compare role checks bypass the ACL matrix and lock out `super_admin` / `moderator` / `support`:

| File | Line | Pattern |
|---|---|---|
| `app/admin/drivers/page.tsx` | 15 | `userInfo.role !== "admin"` (locks out `super_admin`, `moderator`) |
| `app/admin/drivers/[id]/page.tsx` | 30 | `userInfo.role !== "admin"` |
| `app/admin/logs/page.tsx` | 52 | `userInfo.role !== "admin"` (audit log viewer — also wrong table per CANON-ADMIN-001) |
| `app/admin/anniversaires/page.tsx` | 142 | `userInfo.role !== "admin" && userInfo.role !== "super_admin"` (locks out `moderator` who has `events.view` per ACL) |
| `app/admin/anniversaires/[id]/page.tsx` | 100 | same |
| `app/admin/marketplace/page.tsx` | 15 | `["admin","super_admin","moderator"].includes(userInfo.role)` — closer, but still hardcoded list, not `requireAdminPermission('content.view')` |
| `app/admin/proofs/page.tsx` | 24, 61 | Hardcoded `Set(["admin","super_admin","moderator"])` |

Fix: replace each with `await requireAdminPermission('<perm>')` per the §1 ACL matrix. After the move into `/admin/moderation`, `/admin/audit-log`, `/admin/kyc`, the pages themselves are deleted (see §3).

---

### CANON-ADMIN-004 — P1 — §10.3 + §2 — Sidebar shows the same 10 items to every sub-role; ignores ACL

`components/layouts/admin-sidebar.tsx:33-84` declares a static `navItems` array of **10 items** with no permission gating. Every sub-role sees identical links. Canon §2 mandates **exactly 13** items, each with a `requiredPermission`, filtered via `roleHasPermission(currentRole, requiredPermission)`.

Concrete drift:

- Items present in code but NOT in canon: `Anniversaires` (canon: tab inside `/admin/evenements`), `Check-in` (canon: tab inside `/admin/reservations`), `Clubs` (canon: tab inside `/admin/evenements`), `Ambassadeurs` (canon: merged into `/admin/kyc` + `/admin/utilisateurs?role=ambassador`), `Scripts SQL` (canon: under `/admin/system`, super_admin only).
- Items in canon but MISSING in sidebar: `Modération`, `Support`, `KYC`, `Finances`, `Broadcasts`, `Rides & Food` (a.k.a. `/admin/operations`), `Audit log`, `Système`. **8 of 13.**
- No `requiredPermission` field anywhere; no `roleHasPermission` import; sidebar is a `'use client'` file with zero auth context.

Fix: rewrite `navItems` per the table in canon §2; convert to a server component that receives `role` and filters; or fetch `getAdminInfo()` on hydrate and filter client-side.

---

### CANON-ADMIN-005 — P1 — §3 + §9 — Moderation is fragmented across 4 routes; canon mandates a single `/admin/moderation`

Per canon §3, ONE inbox at `/admin/moderation` over the existing `moderation_queue` table, sub-tabs as `?type=` filters. Reality:

| Route | File | Status |
|---|---|---|
| `/admin/proofs` | `app/admin/proofs/page.tsx` | Reads `moderation_queue` (correct table) but lives at deprecated URL |
| `/admin/creator-moderation` | `app/admin/creator-moderation/page.tsx:35` | Reads `moderation_queue` filtered to `feed_post` |
| `/admin/content/review` | `app/admin/content/review/page.tsx` | Mocked — comment line 7 says "log rejection in admin_audit_logs" → also wrong audit table |
| `/admin/marketplace` | `app/admin/marketplace/page.tsx` | Marketplace moderation + disputes |
| `/admin/moderation` | **does not exist** | — |

The four routes write through different API endpoints (`/api/admin/creator/moderate`, `/api/admin/marketplace/moderate/[listing_id]`, `/api/admin/content/review/[id]`, `/api/admin/moderation/[id]/approve`) which all duplicate the same approve/reject + audit-log pattern with subtle drift. Canon §3 requires every approve/reject to dispatch through a single `moderate_content(p_queue_id, p_decision, p_note)` RPC — that RPC does not exist.

Fix: create `/admin/moderation/page.tsx` with `?type=<content_type>` tab filter; build `moderate_content` RPC; deprecate the 4 routes via 308 redirect to `/admin/moderation?type=…`; delete the 4 page files.

---

### CANON-ADMIN-006 — P1 — §11.2 + §3 — Auto-restrict trigger missing on `moderation_queue`

Canon §3.4: "when `count(*) FILTER (status='pending') >= 3` for the same `(content_type, content_id)`, the source row's visibility flag flips … implemented as a DB trigger, not in app code." Migrations `055_creator_economy.sql` and `056_marketplace_c2c.sql` create / extend `moderation_queue` but no AFTER INSERT trigger fires this auto-restrict. App code does not implement it either (would violate the lock anyway).

Fix: add migration `094_moderation_auto_restrict_trigger.sql` with one TRIGGER per source-table flag (`feed_posts.is_hidden`, `marketplace_listings.status='pending_moderation'`, etc.).

---

### CANON-ADMIN-007 — P0 — §5 + §11.13 — `/admin/finances` does not exist; refund flow is split, missing canonical RPCs and `refunds` table

Canon §5 requires a single tabbed surface `/admin/finances` (Refunds, Top-ups, Partner payouts, Reconciliation) with 7 named SECURITY-DEFINER RPCs (`refund_booking`, `refund_food_order`, `refund_marketplace`, `reverse_topup`, `top_up_teen`, `release_partner_payout`, `mark_partner_payout_failed`) and a NEW `refunds` table.

Reality:

- `/admin/finances` route: **does not exist** (no file under `app/admin/finances/`).
- `/admin/topups` exists (`app/admin/topups/page.tsx`) — should be a tab, not a route.
- Refunds API: `app/api/admin/refunds/route.ts` performs inline coin-movement updates (lines ~280-440) directly on `coin_transactions` + `escrow_ledger` instead of calling the named RPCs. This violates §10.5 ("refund / payout / top-up writes outside the canonical RPCs … FORBIDDEN").
- Auth gate at `app/api/admin/refunds/route.ts:61` accepts `moderator` — canon §1 row "Reservations — refund" is admin-only.
- `refunds` table: no `CREATE TABLE refunds` anywhere in `gamification-system/database/migrations/`.
- `refund_booking`, `refund_food_order`, `refund_marketplace`, `reverse_topup`, `release_partner_payout`, `mark_partner_payout_failed` RPCs: none of these names appear in the migrations tree.

Fix: build `/admin/finances/page.tsx` with 4 tabs; migrate `app/admin/topups` into Top-ups tab; create the 7 RPCs; add `refunds` table; tighten ACL to admin/super_admin; add D6 two-person rule on partial refunds ≥ 200 DH.

---

### CANON-ADMIN-008 — P1 — §6 + §11.14 — `/admin/broadcasts` page does not exist; `broadcasts` table does not exist

Canon §6: route `/admin/broadcasts` (composer + history) backed by new `broadcasts` table with columns `id, created_by, segment_filter jsonb, channels text[], template_id, sent_at, recipient_count, delivered_count, opened_count, status`.

Reality:

- `app/admin/broadcasts/`: **does not exist**.
- `app/api/admin/broadcasts/route.ts`: present, but writes audit-log via wrong table (line 199: `admin_audit_logs`) and does not insert into a `broadcasts` row — there is no `broadcasts` table. The route enqueues `user_notifications` directly, no broadcast history.
- `broadcasts` table: no migration creates it.

Fix: add migration creating `broadcasts` table; build `/admin/broadcasts/page.tsx`; rewrite the route to write a `broadcasts` row first, then fan out to `user_notifications`.

---

### CANON-ADMIN-009 — P1 — §7 + §11.9 — `/admin/kyc` unified surface does not exist; KYC is split per archetype

Canon §7: single `/admin/kyc?subject_kind=partner|mentor|driver|ambassador` surface over `kyc_documents`.

Reality:

- `app/admin/kyc/`: **does not exist**.
- Split routes still live under `/admin/partners`, `/admin/mentors`, `/admin/drivers`, `/admin/ambassadeurs`. All four are listed as DEPRECATED in canon §9 with the merge target `/admin/kyc?subject_kind=…`.
- `kyc_documents` table exists (`migrations/059_mentorship_career.sql:21-41` extends it for mentors with `owner_user_id` and a subject-presence CHECK), and `migrations/057_transport_mobility.sql:22` references `kyc_documents_url` for drivers — but the canon `subject_kind` enum (`partner|mentor|driver|ambassador`) is not enforced as a CHECK constraint in any migration in tree.
- Missing RPC: `admin_approve_driver(p_driver_id)` (canon §7 marks it TO ADD; current driver-approve route does direct table update at `app/api/admin/drivers/[id]/approve/route.ts`).
- Missing storage policy: `kyc_admin_read` on `storage.objects` for bucket `kyc-documents` (canon §7 ADD).

Fix: build `/admin/kyc/page.tsx` with subject_kind tabs; CHECK constraint on `kyc_documents.subject_kind`; add `admin_approve_driver` RPC; add storage policy.

---

### CANON-ADMIN-010 — P1 — §8 + §11.15 — `/admin/support`, `support_tickets`, `support_ticket_messages` do not exist

Canon §8: route `/admin/support`, two tables `support_tickets` + `support_ticket_messages`, SLA matrix (1h/4h/24h/48h first response), round-robin assignment by category, escalation chain, daily SLA cron.

Reality:

- `app/admin/support/`: **does not exist**.
- `support_tickets` / `support_ticket_messages` tables: no `CREATE TABLE` in the migrations tree (grep over `gamification-system/database/migrations/` returns zero matches).
- `app/partner/support/page.tsx` and `app/partner/support/actions.ts` exist — partner-facing only — but they reference `support_tickets` (the table the canon mandates) without the migration to back it. This means partner support is broken at runtime.
- The `support` admin sub-role is defined in `lib/auth/admin-permissions.ts:58-59` (`support.tickets`, `support.reply` permissions) but no route consumes either permission.
- Cron `support-sla-check`: not implemented.

Fix: create `support_tickets` + `support_ticket_messages` migration; build `/admin/support/page.tsx`; wire SLA cron; auto-priority rule per canon §8 (urgent for `cndp`/`refund`/teen content_report).

---

### CANON-ADMIN-011 — P0 — §9 + §10.2 — `/admin/scripts-sql` is exposed without `super_admin` gate, `ENABLE_ADMIN_SQL_EXECUTION`, or audit hook

Canon §10.2 + §9 + §12-D3: the SQL runner MUST require ALL of (a) `requireAdminPermission('system.sql')`, (b) env flag `ENABLE_ADMIN_SQL_EXECUTION=true`, (c) IP allow-list, (d) every execution writes to `audit_log`.

Reality:

- `app/admin/scripts-sql/page.tsx:59-110`: zero auth — no `getUserRole`, no `requireAdminPermission`, no `redirect`. The page renders a list of canned scripts and a "Open Supabase SQL Editor" external-link button. Anyone hitting `/admin/scripts-sql` directly gets it.
- `app/api/admin/execute-sql/route.ts` and `app/api/admin/run-migration/route.ts` exist (file list above) — these are the actual mutators and must be gated, but the consumer page has no gate at all.
- Sidebar exposes the link to ALL roles (`components/layouts/admin-sidebar.tsx:79-83`).
- `ENABLE_ADMIN_SQL_EXECUTION` env flag: not referenced anywhere.

Fix: top of page → `await requireAdminPermission('system.sql')`; check `process.env.ENABLE_ADMIN_SQL_EXECUTION === 'true'`; remove from sidebar (move under `/admin/system` super_admin tab); audit-log every render.

---

### CANON-ADMIN-012 — P1 — §12 contradiction #1 + §11.11 — `admin_roles.permissions` JSONB column is read by code but does not exist in DB

`lib/auth/admin-permissions.ts:103-119` reads `admin_roles.permissions` and merges it into the computed permissions map. The actual schema in `gamification-system/database/all_migrations.sql:13` is:

```sql
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

— no `permissions` column. The select at line 105 returns `null` for that field; the merge at line 118 silently no-ops. This is flagged as `C9` in `docs/canon/auth-onboarding.locked.md:261` and confirmed in canon §12 contradiction #1 of admin-moderation.

Fix: ADD migration `095_admin_roles_permissions.sql`: `ALTER TABLE admin_roles ADD COLUMN permissions JSONB NOT NULL DEFAULT '{}'::jsonb`. Plus a partial-unique constraint `(profile_id)` so an admin has exactly one role row.

---

### CANON-ADMIN-013 — P1 — §11 + §12 contradiction #3 — `admin_audit_logs` table CREATE is not in tree; only indexes are added

`gamification-system/database/migrations/068_v12_admin_ops.sql:18-26` adds **indexes** to `admin_audit_logs` but the `CREATE TABLE admin_audit_logs(...)` itself does not appear in any file under `gamification-system/database/migrations/`. This means either (a) the table was created out-of-band via Supabase Studio (no version control, CNDP risk) or (b) it lives in a removed/older migration.

Code writes to it from 28 sites (see CANON-ADMIN-001 list). If a fresh prod env is bootstrapped from `gamification-system/database/migrations/`, every audit insert silently fails (`relation does not exist`) — combined with CANON-ADMIN-002 (no throw), all admin actions become un-audited.

Fix: as part of CANON-ADMIN-001 rename, write the canonical `CREATE TABLE audit_log (...)` migration with the canon §4 schema and a one-shot data backfill `INSERT INTO audit_log SELECT … FROM admin_audit_logs WHERE EXISTS`. Drop `admin_audit_logs` after backfill verified.

---

### CANON-ADMIN-014 — P1 — §9 + §11 — Multiple deprecated routes still live in tree

Canon §9 lists routes that MUST be removed or merged. Found still active (each is a separate cleanup task):

| File | Canon §9 disposition |
|---|---|
| `app/admin/proofs/page.tsx` | DELETE → `/admin/moderation?type=defi_proof` |
| `app/admin/creator-moderation/page.tsx` | DELETE → `/admin/moderation?type=feed_post` |
| `app/admin/content/review/page.tsx` | DELETE → `/admin/moderation?type=quiz_ai` |
| `app/admin/content/page.tsx` | DELETE entirely (mock UI) |
| `app/admin/partners/page.tsx` | DELETE → `/admin/kyc?subject_kind=partner` |
| `app/admin/mentors/page.tsx` | DELETE → `/admin/kyc?subject_kind=mentor` |
| `app/admin/drivers/page.tsx` | DELETE → `/admin/kyc?subject_kind=driver` |
| `app/admin/topups/page.tsx` | DELETE route, move component to `/admin/finances` Top-ups tab |
| `app/admin/permissions/page.tsx` | MOVE under `/admin/system` permissions tab (super_admin only) |
| `app/admin/gamification-setup/page.tsx` | DELETE — one-shot migration runner |
| `app/admin/tag-normalize/page.tsx` | MOVE → `/admin/system` Cron audits tab |
| `app/admin/internships/page.tsx` | MOVE → `/admin/operations` Internships tab |
| `app/admin/clubs/page.tsx` | MOVE → `/admin/evenements` Clubs tab |
| `app/admin/anniversaires/page.tsx` | MOVE → `/admin/evenements` Anniversaires tab |
| `app/admin/check-in/page.tsx` | MOVE → `/admin/reservations` Check-in tab |
| `app/admin/ambassadeurs/page.tsx` | MOVE → `/admin/kyc` (approval) + `/admin/utilisateurs?role=ambassador` |
| `app/admin/marketplace/page.tsx` | DELETE → `/admin/moderation?type=marketplace_listing` (disputes → `/admin/finances`) |
| `app/admin/gamification/scorecard/page.tsx` | DELETE component, MOVE into `/admin/analytics` "Live Pulse" tab |
| `app/admin/logs/page.tsx` | RENAME → `/admin/audit-log` (ALSO fix table from `activity_logs` to `audit_log`) |

That is 19 surfaces pending action. Some are simple deletes; the moves require a tabbed parent page that doesn't exist yet (e.g., `/admin/operations`, `/admin/system`).

---

### CANON-ADMIN-015 — P1 — §1 + §11.1 + §11.10 — `/admin/utilisateurs/[id]` user-detail surface does not exist; `/admin/system` does not exist; `/admin/operations` does not exist; `/admin/cndp` does not exist; `/admin/audit-log` does not exist

Spot-check of canon §11 MISSING list: 9 of 16 listed surfaces are absent.

| Required (canon §11) | Status |
|---|---|
| `/admin/utilisateurs/[id]` (user detail merged view) | MISSING (only list page `app/admin/utilisateurs/page.tsx`) |
| `/admin/finances` | MISSING (CANON-ADMIN-007) |
| `/admin/support` | MISSING (CANON-ADMIN-010) |
| `/admin/moderation` | MISSING (CANON-ADMIN-005) |
| `/admin/broadcasts` | MISSING (CANON-ADMIN-008) |
| `/admin/audit-log` | MISSING (CANON-ADMIN-014: rename `/admin/logs` + fix table) |
| `/admin/operations` | MISSING (rides+food+internships consolidation) |
| `/admin/cndp` | MISSING (CNDP DSAR dashboard) |
| `/admin/kyc` | MISSING (CANON-ADMIN-009) |
| `/admin/system` | MISSING (super_admin home for settings + permissions + SQL + crons) |
| `audit_log` table | MISSING (CANON-ADMIN-013) |
| `moderate_content` RPC | MISSING (CANON-ADMIN-005) |
| `refunds` table + canonical RPCs | MISSING (CANON-ADMIN-007) |
| `broadcasts` table + send-engine | MISSING (CANON-ADMIN-008) |
| `support_tickets` + `support_ticket_messages` + SLA cron | MISSING (CANON-ADMIN-010) |
| Sidebar role-aware filter | MISSING (CANON-ADMIN-004) |

---

### CANON-ADMIN-016 — P2 — §10.6 — Storage URL surface check (defensive)

Canon §10.6 forbids `getPublicUrl` on `kyc-documents`, `cin-scans`, `defi-proofs`. Spot-grep against `app/api/admin/**` and `app/admin/**` does not surface a violation in the moderation domain (`app/admin/proofs/page.tsx:25` uses 15-min `SIGNED_URL_TTL_SECONDS` constant). Canon §7 still requires the `kyc_admin_read` storage policy ADD — see CANON-ADMIN-009.

No new finding here, but the canon ADD is still pending and folded into CANON-ADMIN-009.

---

### CANON-ADMIN-017 — P1 — §12 contradiction #4 — `app/api/circles/report/route.ts` writes to `moderation_reports` (non-existent) instead of `moderation_queue`

Canon §12 contradiction #4 explicitly flags this. The route inserts into a `moderation_reports` table that has no migration. Canon §3 says ALL reports go to `moderation_queue` with `content_type='circle_message'`.

Fix: rewrite the route to insert `(content_type='circle_message', content_id=<message_id>, reporter_id=<reporter>, reason=<reason>)` into `moderation_queue`.

---

## 2. Per-canon-section coverage matrix

| Canon § | Locked rule | In code? | Severity if drift | Finding |
|---|---|---|---|---|
| §1 ACL matrix | 4 sub-roles + per-action grid | partial | P1 | CANON-ADMIN-003 |
| §2 13-item sidebar | role-filtered | NO | P1 | CANON-ADMIN-004 |
| §3 single moderation inbox | `/admin/moderation` over `moderation_queue` + `moderate_content` RPC | NO | P1 | CANON-ADMIN-005, -006, -017 |
| §4 audit_log | singular table + `logAdminAction` | NO | P0 | CANON-ADMIN-001, -002, -013 |
| §5 refunds + finances | `/admin/finances` + 7 RPCs + `refunds` table | NO | P0 | CANON-ADMIN-007 |
| §6 broadcasts | route + `broadcasts` table | NO | P1 | CANON-ADMIN-008 |
| §7 unified KYC | `/admin/kyc?subject_kind=...` | NO | P1 | CANON-ADMIN-009 |
| §8 support | `/admin/support` + 2 tables + SLA | NO | P1 | CANON-ADMIN-010 |
| §9 deprecations | 19 routes to delete/move | NO | P1 | CANON-ADMIN-014 |
| §10 forbidden patterns | linter + grep gate | partial | P0/P1 | CANON-ADMIN-001, -002, -003, -011 |
| §11 missing | build-list of 16 items | 0/16 | P0/P1 | CANON-ADMIN-015 |
| §12 contradictions | resolve 6 | 0/6 | P1 | CANON-ADMIN-001, -012, -017 |

---

## 3. Quickest path to compliance (recommended sequence)

1. **DB foundation (1 PR)** — migrations: rename `admin_audit_logs` → `audit_log` with canon §4 schema; add `admin_roles.permissions JSONB`; add `refunds`, `broadcasts`, `support_tickets`, `support_ticket_messages` tables; add `moderate_content` RPC + 7 finance RPCs; add `kyc_documents.subject_kind` CHECK + `admin_approve_driver` RPC; add `kyc_admin_read` storage policy. Closes CANON-ADMIN-001/-006/-007/-008/-009/-010/-012/-013.
2. **`logAdminAction` rewrite + propagation (1 PR)** — single helper, throws on failure, all 28 callers migrated. Closes CANON-ADMIN-002.
3. **Sidebar + ACL gate sweep (1 PR)** — rewrite `components/layouts/admin-sidebar.tsx` to canon §2; replace every `userInfo.role === "admin"` in `app/admin/**` with `requireAdminPermission`; ring-fence `/admin/scripts-sql`. Closes CANON-ADMIN-003/-004/-011.
4. **New surfaces (4 PRs, parallel-safe)** — `/admin/moderation`, `/admin/finances`, `/admin/audit-log`, `/admin/kyc`, `/admin/support`, `/admin/broadcasts`, `/admin/system`, `/admin/operations`, `/admin/cndp`, `/admin/utilisateurs/[id]`. Closes CANON-ADMIN-005/-015.
5. **Deprecation cleanup (1 PR)** — delete/redirect 19 routes per canon §9. Closes CANON-ADMIN-014.
6. **Circles report fix (trivial)** — rewrite `app/api/circles/report/route.ts` to insert into `moderation_queue`. Closes CANON-ADMIN-017.

After (1)–(6), score should reach ≥ 90/100 and launch unblocks for ADMIN+MODERATION.

---

## 4. Cited file set

Code under review:

- `lib/auth/admin-permissions.ts`
- `components/layouts/admin-sidebar.tsx`
- `app/admin/page.tsx`
- `app/admin/drivers/page.tsx`, `app/admin/drivers/[id]/page.tsx`
- `app/admin/anniversaires/page.tsx`, `app/admin/anniversaires/[id]/page.tsx`
- `app/admin/logs/page.tsx`
- `app/admin/marketplace/page.tsx`
- `app/admin/proofs/page.tsx`
- `app/admin/creator-moderation/page.tsx`
- `app/admin/content/review/page.tsx`
- `app/admin/permissions/page.tsx`
- `app/admin/scripts-sql/page.tsx`
- `app/api/admin/refunds/route.ts`
- `app/api/admin/broadcasts/route.ts`
- `app/api/admin/audit-log/route.ts`
- `app/api/admin/moderation/[id]/approve/route.ts`, `…/reject/route.ts`
- `app/api/admin/creator/moderate/route.ts`
- `app/api/admin/marketplace/moderate/[listing_id]/route.ts`
- `app/api/admin/topups/[id]/confirm/route.ts`
- `app/api/admin/users/[id]/anonymize/route.ts`, `…/export/route.ts`
- `app/api/admin/partners/[id]/approve/route.ts`, `…/reject/route.ts`
- `app/api/admin/mentors/[id]/approve/route.ts`, `…/reject/route.ts`
- `app/api/admin/internships/route.ts`, `…/[id]/close/route.ts`, `…/[id]/decide/route.ts`
- `app/api/admin/mentor-reports/route.ts`, `…/[id]/resolve/route.ts`
- `app/api/admin/content/review/[id]/route.ts`
- `app/api/admin/tag-aliases/route.ts`
- `app/api/admin/signals/cap-stats/route.ts`
- `app/api/admin/execute-sql/route.ts`, `app/api/admin/run-migration/route.ts`
- `app/api/circles/report/route.ts`
- `app/api/me/data-delete/route.ts`
- `gamification-system/database/all_migrations.sql:13` (`admin_roles` shape)
- `gamification-system/database/migrations/055_creator_economy.sql` (moderation_queue extension)
- `gamification-system/database/migrations/056_marketplace_c2c.sql` (moderation_queue insert)
- `gamification-system/database/migrations/057_transport_mobility.sql` (kyc_documents_url)
- `gamification-system/database/migrations/059_mentorship_career.sql` (kyc_documents subject extension)
- `gamification-system/database/migrations/068_v12_admin_ops.sql` (audit indexes; missing CREATE)
- `gamification-system/database/migrations/064_mentorship_safety.sql` (audit inserts)
- `gamification-system/database/migrations/092_tag_aliases.sql` (audit guard)

Canon source:

- `docs/canon/admin-moderation.locked.md`
- `docs/canon/INDEX.locked.md`
- `docs/canon/roles-permissions.locked.md` (cross-cutting)
- `docs/canon/auth-onboarding.locked.md` (C9 contradiction)

---

END.
