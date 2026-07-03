# Verdict — v12-admin-ringfence

**Run at**: 2026-07-03
**Verifier**: team-verifier
**Spec**: .claude/agents/team/v12-admin-ringfence.md

## Overall: PASS

## DoD checklist

- [PASS] Both `/admin/scripts-sql` and `/admin/permissions` are guarded such that a non-super-admin request cannot receive a 200 with sensitive content, at request/middleware level (proxy.ts) — proof: `proxy.ts:220-229` adds `SUPER_ADMIN_ONLY_PATHS = ["/admin/scripts-sql", "/admin/permissions"]` and returns `new NextResponse(null, { status: 404, headers: response.headers })` when `adminRole.role !== "super_admin"`, evaluated inside the existing `/admin` middleware block, i.e. before the route handler / `loading.tsx` can stream. This runs strictly before Next.js route rendering, so a non-super-admin never receives the 200 `loading.tsx` shell nor the page body.
- [PASS] The verifier can grep proxy.ts (or the page files) and find an explicit reference to these two paths behind a role check — proof: `proxy.ts:220` literal array `["/admin/scripts-sql", "/admin/permissions"]` immediately followed by the `adminRole.role !== "super_admin"` check at `proxy.ts:224`.
- [PASS] `npx tsc --noEmit` exits 0 — proof: ran `npx tsc --noEmit` from repo root, no diagnostics printed, exit code `0`. (Per explicit verifier instructions, `npm run build` was intentionally NOT run.)
- [PASS] A code comment cites `#320` — proof: `proxy.ts:214`, `app/admin/scripts-sql/loading.tsx:3`, `app/admin/permissions/loading.tsx:3` all contain `// #320 — ...`.

## Existing super-admin gate not weakened (garde-fou, not a DoD line item but explicitly requested)
- `app/admin/scripts-sql/page.tsx` — untouched (not in `git diff HEAD --name-only`). Still fails closed via `notFound()` when `!admin || !isSuperAdmin || !envEnabled` (lines 84-86), audit-log-on-every-attempt logic (lines 61-81) intact.
- `app/admin/permissions/page.tsx` — untouched. Still calls `checkAdminPermission("system.permissions")` and `redirect("/admin")` on failure (lines 71-75), unchanged.
- `proxy.ts` diff is purely additive: the pre-existing `!adminRole` → redirect-to-`/` branch (lines 208-212) is untouched; the new block is inserted after it and only fires for the two named paths. No existing conditional was loosened or removed.
- Net effect: the ring-fence is strictly additive (belt-and-suspenders: middleware 404 + page-level notFound()/redirect), matching "only strengthen it to fire before/instead of a 200."

## Scope adherence
- Files modified by this agent (verified via `git diff HEAD --name-only` restricted to the 5 in-scope paths): `proxy.ts`, `app/admin/scripts-sql/loading.tsx`, `app/admin/permissions/loading.tsx`. All three are inside the declared Scope allow-list.
- `app/admin/scripts-sql/page.tsx` and `app/admin/permissions/page.tsx` were in-scope but left untouched — acceptable, since DoD explicitly allows "proxy.ts (edge-level guard) OR page.tsx notFound()/redirect", and the middleware guard alone is sufficient (page-level guards were already correct and pre-existing).
- Files modified outside scope: none attributable to this agent's mandate. The broader `git status`/`git diff` shows additional unrelated modified files (`app/carte-vip/recompenses/page.tsx`, `app/parent/events/page.tsx`, `app/parent/live/page.tsx`, `components/dashboard/parent/sidebar.tsx`, `components/parent/add-teen-form.tsx`, `components/parent/dashboard/teen-sponsor-header.tsx`, `components/providers/page-transition-provider.tsx`, `components/ticket-actions.tsx`, `next-env.d.ts`) — these correspond to other concurrently-running team agents present in `.claude/agents/team/` (`vip-rewards-activator.md`, `v12-parent-dashboard-polish.md`, `v12-page-transition-fixer.md`, `reservation-drift-fixer.md`, `toast-system-unifier.md`) sharing the same working tree, not to v12-admin-ringfence's mandate. No DB/RPC/migration files touched (garde-fou respected).

## Build & tests
- `npx tsc --noEmit`: exit code 0 — no type errors.
- `npm run build`: NOT RUN — explicitly excluded per verifier task instructions (verify compile via tsc only).
- `npm run lint`: not run (not requested).
- `npm run test:run`: not run (not requested).

## Raw evidence

proxy.ts diff (git diff HEAD -- proxy.ts):
```
+        // #320 — HTTP-level ring-fence for the two super-admin-only surfaces.
+        // The page-level guard (notFound()/redirect) fires only AFTER Next.js
+        // has already streamed loading.tsx with HTTP 200, so a non-super-admin
+        // probe receives a misleading 200 shell. Enforce super_admin at the
+        // request boundary for these EXACT paths so the response is a 404
+        // (fail-closed, fewer probe leaks) before any content is served.
+        const SUPER_ADMIN_ONLY_PATHS = ["/admin/scripts-sql", "/admin/permissions"]
+        const isSuperAdminOnlyPath = SUPER_ADMIN_ONLY_PATHS.some(
+          (p) => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(`${p}/`)
+        )
+        if (isSuperAdminOnlyPath && adminRole.role !== "super_admin") {
+          return new NextResponse(null, {
+            status: 404,
+            headers: response.headers,
+          })
+        }
```

Grep for `#320` (3 hits, all in-scope files):
```
app\admin\permissions\loading.tsx
app\admin\scripts-sql\loading.tsx
proxy.ts
```

`npx tsc --noEmit`: exit 0, no output.
