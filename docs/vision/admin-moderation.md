# Admin, Moderation & Audit — Vision vs Reality

Auditor: admin-moderation-auditor (read-only). Project: imchornjvmgmaovhypco. Date: 2026-05-07.

## 1. Vision intended

Nivy is a teen-facing platform with AI-generated content, real-money payments, KYC-bound partners, an ambassador economy, and minor users. That mix forces a serious back-office. Staff (super_admin > admin > moderator > support, per `docs/TEST_ACCOUNTS.md` and `lib/auth/admin-permissions.ts`) should be able to:

- Approve partner KYC and ambassador applications.
- Moderate AI-generated content (review queue, false-positive triage, escalate to ban).
- Review user reports (a teen flags an inappropriate Circle post or peer message; a parent flags a partner offer).
- Validate physical-challenge photo / video proofs before XP is awarded.
- Resolve support tickets across parent / teen / partner with a clear escalation chain.
- Run analytics dashboards, export accounting CSVs, send broadcast notifications.
- Manage the user lifecycle: search, suspend, ban, refund, change role.
- Persist a tamper-evident audit trail of every privileged action for CNDP / BAM compliance, with a defined retention policy.
- Multi-role server-side enforcement so a `support` agent can never silently issue a refund or change a role.

## 2. Reality on the ground

Reality is a thick UI shell over a thin backend: the admin surfaces exist visually, but most moderation pipelines run on hard-coded mock arrays in client components, and the persistence layer for moderation / audit / reports / tickets is missing.

**Admin dashboard surfaces (present)**: a fairly complete sitemap under `app/admin/` — `page.tsx` (KPI cards: users, events, revenue, pending ambassadors), `analytics/`, `utilisateurs/`, `permissions/`, `partners/`, `ambassadeurs/`, `evenements/`, `clubs/`, `reservations/`, `anniversaires/`, `check-in/`, `gamification/`, `gamification-setup/`, `proofs/`, `content/`, `logs/`, `scripts-sql/`. The home dashboard reads live counts from `profiles`, `events`, `bookings`, `ambassadors` and renders upcoming events + recent bookings.

**Permissions matrix (partially real)**: `lib/auth/admin-permissions.ts` defines a clean ACL of ~30 permissions across 4 roles (super_admin, admin, moderator, support) with helpers `getAdminInfo`, `checkAdminPermission`, `requireAdminPermission`, `withAdminPermission`. Server pages like `app/admin/permissions/page.tsx` gate on `system.permissions`. Other pages (`app/admin/page.tsx`, `app/admin/analytics/page.tsx`) gate only on the existence of an `admin_roles` row, not on a specific permission. `app/admin/logs/page.tsx` hard-codes `userInfo.role !== "admin"` and bypasses the matrix entirely.

**`admin_roles` table (live but empty)**: schema is `(id uuid, profile_id uuid, role text, created_at)` — note the `permissions jsonb` column referenced by `getAdminInfo` does **not** exist in the live DB, so custom per-user permission overrides will silently no-op. `count = 0`: there is currently no admin row in production at all, meaning every admin page redirects authenticated users to `/`. Staff identity is double-tracked between `profiles.role` and `admin_roles.role`, with `getAdminInfo` preferring `admin_roles.role` if present.

**Moderation queue for AI content (UI only)**: `app/admin/content/page.tsx` is a `"use client"` component with mock `ContentItem[]` (post / comment / image / bio, `aiScore`, `aiFlags`, status pending/approved/rejected/flagged). There is no `moderation_queue`, `content_reviews`, or equivalent table, and no API route writes back. `app/api/admin/content/{generate,validate}` exist but feed AI-generation, not user-content moderation.

**Photo/video proofs (UI only)**: `app/admin/proofs/page.tsx` handles challenge video proofs (approve / reject / flag, rejection reason, moderator stamp) — also entirely mock. No `challenge_proofs` / `proof_reviews` table exists; XP-award flows therefore have no human gate.

**User report mechanism (one endpoint, no admin queue)**: `app/api/circles/report/route.ts` accepts teen reports inside Circles, and `app/admin/clubs/page.tsx` references reporting flags, but there is no `user_reports` / `content_reports` table and no admin inbox aggregating them. Reports are effectively write-only.

**Audit log (broken)**: `lib/auth/admin-permissions.ts#logAdminAction` writes to `admin_audit_logs` — a table that **does not exist** in the live DB. Every privileged action that calls this helper fails silently (or errors and is swallowed). `app/admin/logs/page.tsx` queries `activity_logs` — also non-existent. Compliance trail is currently zero. The only real logs in DB are domain-specific: `content_generation_logs`, `challenge_progress_log`, `crew_activity_log`, `mission_progress_log`, `vip_benefits_log`.

**Support ticket system**: no table (`support_tickets` does not exist), no admin route, no UI component. The `support.*` permissions in the ACL are aspirational. Parent / teen / partner support today is implicitly email-only.

**Analytics**: real and reasonable. `app/admin/analytics/page.tsx` aggregates 12-month revenue from `bookings`, segments by category/city, and renders charts via `AnalyticsChart`. `components/admin/realtime-kpis.tsx` adds live KPIs. `app/api/admin/analytics/export` and `app/api/admin/accounting/export` provide CSV exports. `app/api/admin/kpis` and `app/api/admin/scorecard` expose programmatic KPIs. `app/api/admin/run-migration` and `app/api/admin/execute-sql` exist as super_admin-only escape hatches — high blast-radius surfaces that warrant their own threat model.

**Broadcast notifications**: backbone exists (`notification_templates`, `notification_triggers`, `user_notifications`, `notification_analytics`, `notification_preferences`) but no admin UI to compose / send a broadcast was found in `app/admin/`.

**Lifecycle actions**: `app/admin/utilisateurs/page.tsx` and `components/admin/role-change-button.tsx` allow viewing users and changing roles; suspend/ban/refund flows are not implemented as first-class admin endpoints (refund permission exists in the ACL but no `bookings.refund` route was found under `app/api/admin/`). Ambassador approve/reject are real (`app/api/admin/ambassadors/{approve,reject}/route.ts`).

## 3. Gap matrix

| Capability                                    | Vision | Reality                          |
|-----------------------------------------------|--------|----------------------------------|
| Admin role matrix (4 roles, 30+ perms)         | Yes    | Defined, partially enforced      |
| `admin_roles` populated                        | Yes    | 0 rows in prod                   |
| Custom per-admin permissions JSON              | Yes    | Column missing in DB             |
| AI content moderation queue                    | Yes    | Mock UI only                     |
| Photo/video proof review                       | Yes    | Mock UI only                     |
| User report inbox                              | Yes    | Endpoint exists, no aggregation  |
| Persistent admin audit log                     | Yes    | Table missing, writes silently fail |
| Support tickets                                | Yes    | Not implemented                  |
| Analytics dashboards + CSV exports             | Yes    | Implemented                      |
| Broadcast notifications UI                     | Yes    | Backend yes, UI no               |
| Refund workflow                                | Yes    | Permission only, no endpoint     |
| KYC partner approval workflow                  | Yes    | UI shell only, no decision API   |
| Compliance retention policy                    | Yes    | Undefined                        |

## 4. Risks

- **Compliance**: zero persisted admin-action trail means CNDP (data subject access) and BAM (financial action) audits cannot be answered. The `logAdminAction` helper masks the gap because writes do not throw visibly.
- **Moderation safety on a minor-facing platform**: AI content and physical-challenge proofs ship to teens without a working human review path. A bad AI generation or unsafe video can reach a 13-year-old user with no flag-to-action loop.
- **Authorization drift**: pages mix three gating styles (`admin_roles` row check, `profiles.role` string check, `checkAdminPermission`). A regression in one bypasses the others.
- **`execute-sql` and `run-migration` API routes**: super_admin-only is necessary but not sufficient — these need IP allow-listing, MFA, and full audit capture before production.
- **Empty `admin_roles`**: today nobody can reach the admin dashboard. The bootstrap path (how the first super_admin is seeded outside `TEST_ACCOUNTS.md`) is undocumented.

## 5. Open questions

- Support escalation chain: is it support → moderator → admin, and which event triggers an auto-escalation (SLA breach? keyword?)
- Audit retention: how long do we keep admin action logs (CNDP minimum vs commercial preference)?
- Moderator powers: can a moderator suspend a teen account directly, or only flag for an admin? The ACL grants `users.edit` but not `users.delete`, leaving suspend ambiguous.
- Refund authority: ACL says `super_admin` + `admin`, but nothing prevents a partner-initiated dispute bypass — who signs off on partial refunds?
- Communication channel for staff: in-app inbox, external Slack, or email-only? No internal staff messaging surface exists today.
- Bootstrap: who creates the first `admin_roles` row in a fresh environment, and is the seeding script reproducible?

## 6. References

Code paths:
- `app/admin/page.tsx`
- `app/admin/permissions/page.tsx`
- `app/admin/content/page.tsx`
- `app/admin/proofs/page.tsx`
- `app/admin/logs/page.tsx`
- `app/admin/analytics/page.tsx`
- `app/admin/utilisateurs/page.tsx`
- `app/admin/partners/page.tsx`
- `lib/auth/admin-permissions.ts`
- `lib/auth/get-user-role.ts`
- `app/api/admin/permissions/route.ts`
- `app/api/admin/ambassadors/approve/route.ts`
- `app/api/admin/ambassadors/reject/route.ts`
- `app/api/admin/execute-sql/route.ts`
- `app/api/admin/run-migration/route.ts`
- `app/api/admin/analytics/export/route.ts`
- `app/api/admin/accounting/export/route.ts`
- `app/api/circles/report/route.ts`
- `components/admin/role-change-button.tsx`
- `components/admin/realtime-kpis.tsx`
- `docs/TEST_ACCOUNTS.md`

DB tables (live):
- `admin_roles` (4 cols, 0 rows; missing `permissions` jsonb the code expects)
- `profiles.role` (string mirror of admin_roles)
- `content_generation_logs` (AI generation trail)
- `crew_activity_log` (Crew domain)
- `challenge_progress_log` (gamification)
- `mission_progress_log` (gamification)
- `vip_benefits_log` (VIP economy)
- `notification_templates`, `notification_triggers`, `user_notifications`, `notification_analytics` (broadcast backbone)
- Missing: `admin_audit_logs`, `activity_logs`, `moderation_queue`, `content_reviews`, `challenge_proofs`, `user_reports`, `support_tickets`.
