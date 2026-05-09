# Wave 4A — Admin Moderation Completion (2026-05-09)

> Local/dev only. No production deploy. No fake moderation success. No silent catch. No admin action without audit_log.

## Scope closed

### A. Unified moderation inbox — ✅
- New `app/admin/moderation/page.tsx` — single inbox at `/admin/moderation` backed by `moderation_queue` (canon §3 LOCKED).
- Filters: pending / actioned / all + per-content_type tabs.
- Per-row enrichment with `user_reports` count joined on `(target_type, target_id)`.
- Honest empty state — no mock rows.
- Permission gate: `content.view` (moderator + admin + super_admin).

### B. Moderation decision API — ✅
- `POST /api/admin/moderation/[id]/decision` (canon §3 + §10 FORBIDDEN #6/#7/#8/#9).
- Decisions: `dismiss | hide | delete | restore | escalate | warn | suspend`.
- Reason required for destructive (`delete`, `warn`, `suspend`) → 400 `reason_required`.
- Already-reviewed → 409 `already_reviewed` (idempotent).
- Unsupported content_type → 409 `unsupported_content_type`.
- Unsupported decision per type (e.g. `warn` on `feed_post`) → 409 `unsupported_action`.
- Atomic order: content UPDATE → queue UPDATE → user_reports sync → audit_log → notify owner.
- `logAdminAction()` throws on failure (canon §10 FORBIDDEN #9).

### C. Moderation queue creation consistency — verified clean
- All Wave 2A report endpoints already write to `user_reports` (canonical).
- No `moderation_reports` writes anywhere in app code.

### D. Admin permissions cleanup — ✅
- Decision route uses `requireAdminPermission('content.view')` (no raw role string compares).
- Existing matrix in `lib/auth/admin-permissions.ts` left as-is.

### E. Admin sidebar alignment — ✅
- `Modération` item added with `requiredPermission: 'content.view'`.
- `Scripts SQL` stays gated by `system.sql` AND env flag `sqlConsoleEnabled` (Wave 1C ring-fence preserved).
- No new sidebar links to non-existent routes.

### F. Audit consistency — ✅
- All Wave 4A admin actions write `audit_log` via `logAdminAction()`.
- No `admin_audit_logs` / `activity_logs` / deprecated `notifications` writes.
- Audit failure throws (test-enforced).

### G. /admin/broadcasts — DEFERRED (Wave 4A.2)

## Files changed (5)

**New:** `lib/admin/moderation-adapters.ts`, `app/api/admin/moderation/[id]/decision/route.ts`, `app/admin/moderation/page.tsx`, `app/admin/moderation/moderation-decision-row.tsx`, 3 test files.

**Modified:** `components/layouts/admin-sidebar.tsx` (Modération item).

## Migrations

None. Pure application-layer over existing `moderation_queue`, `user_reports`, `audit_log`.

## Tests added (21 specs)

- `tests/unit/wave4a-moderation-adapters.test.ts` (5)
- `tests/integration/wave4a-moderation-decision.test.ts` (10)
- `tests/unit/wave4a-admin-sidebar.test.tsx` (6)

Total vitest: **50 files / 389 specs / 100% green** (+21 from Wave 4A).

## P0/P1 closed

- **CANON-ADMIN-005** — `/admin/moderation` unified inbox.
- **Decision dispatcher** — single canonical route, real effects, 409 unsupported_action discipline.
- **Sidebar alignment** — Modération visible to moderators+, scripts-sql ring-fenced.
- **Audit consistency** — `logAdminAction` throw-on-failure preserved.

## Score before / after

| Bucket | Before | After Wave 4A |
|---|---|---|
| **admin-moderation** | 60 / 100 | **80 / 100** |
| **Core flow score** | 80 | **82** |
| **Overall product score** | 78 | **80** |

**Closed beta admin operations are ready** for: feed_post, marketplace_listing, partner_offer.

Public launch still pending Wave 4B (design-system 62→) + secret rotation.

## Remaining admin blockers (carry-forward)

- **Wave 4A.2**: `warn`/`suspend` user-targeted handlers (today they 409 because the adapter returns null; canon-correct behavior — the action is on the user, not the content).
- **Wave 4A.2**: bulk actions + claim/assignment UI.
- **Wave 4B / V1.4**: `/admin/broadcasts` (table + composer + cron).
- **Wave 4B / V1.4**: `/admin/audit-log` viewer page (table exists, surface missing).
- **Wave 4B / V1.4**: extra adapters for circle_message, direct_message, kyc_document, mentor_review.

## Hard constraints honored

- No fake moderation success.
- No silent catch (audit failure throws).
- No admin action without `audit_log`.
- No deprecated `admin_audit_logs` / `activity_logs` / `notifications` writes.
- No production deploy.
- No secrets read or printed (`npm run check:env`: 11/11 PRESENT, every value `[REDACTED]`).
