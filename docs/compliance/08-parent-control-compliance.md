# Parent Control — Canon Compliance Audit (READ-ONLY)

- **Domain**: PARENT CONTROL
- **Canon source**: `docs/canon/parent-control.locked.md` + `docs/canon/INDEX.locked.md`
- **Audit date**: 2026-05-08
- **Mode**: read-only — no code modified
- **Score**: **38 / 100** → **62 / 100** (post-Wave-1C; CANON-PARENT-003 + CANON-PARENT-025 closed)
- **Launch status**: YELLOW — money + consent paths now wired; CIN privacy + per-teen detail page still pending.

---

## Severity legend

| Severity | Meaning |
|---|---|
| P0 | Money, consent, privacy or auth bypass. Ship blocker. |
| P1 | Canon-mandated UX or data path broken; user-visible regression. |
| P2 | Cosmetic / vocabulary drift, dead UI. |
| MISSING | Canon-required surface not built. |

---

## Findings

### CANON-PARENT-001 — `topup-form.tsx` sends DEPRECATED `{packageId, coins, bonus, price, parentId}` payload

- **Severity**: P0 (money pipeline)
- **Canon ref**: `docs/canon/parent-control.locked.md` §2 + §9 + §10.7
- **Location**: `components/parent/topup-form.tsx:53-64`
- **Evidence**: payload built as
  ```ts
  body: JSON.stringify({
    parentId,            // FORBIDDEN — canon §10.7 (server derives from session)
    teenId,
    packageId,           // FORBIDDEN — canon §9 (UI-only construct)
    coins: selectedPackage?.coins || 0,   // FORBIDDEN
    bonus: selectedPackage?.bonus || 0,   // FORBIDDEN
    price: selectedPackage?.price || 0,   // FORBIDDEN — should be amount_dh
  })
  ```
- **Canonical contract** (§2): `{ teenId, amount_dh }` ONLY. Server multiplies *100 to coins.
- **Impact**: Client trusts `coins`/`bonus`/`price` — money-pipeline risk. Even though the API (line 43 of `app/api/parent/topup/route.ts`) reads `body.amount_dh ?? body.amountDh` and ignores the spurious fields, the form NEVER sends `amount_dh`, so the server falls back to `Number(undefined) → NaN`, fails validation at line 45, and returns 400. **Top-up is functionally broken end-to-end** (E4 §3 launch-blocking bug confirmed).

---

### CANON-PARENT-002 — Top-up has no `client_idempotency_key` plumbing

- **Severity**: P0 (money pipeline)
- **Canon ref**: §2 idempotency block; §11 MISSING #14
- **Location**: `app/api/parent/topup/route.ts:93-97` (RPC call) + `components/parent/topup-form.tsx:53-64` (no key generation)
- **Evidence**: RPC invocation passes only `p_parent_id, p_teen_id, p_amount_dh`. No `p_idempotency_key` parameter; no `crypto.randomUUID()` minted client-side; no UNIQUE constraint on `payment_transactions.client_idempotency_key` in any migration searched.
- **Impact**: Re-submitting the form (slow network, double-click) double-charges. §29.4 invariant.

---

### CANON-PARENT-003 — `/api/parent/approvals` does NOT cascade to resource-specific RPCs — **FIXED Wave 1C**

- **Severity**: P0 (consent / money cascade)
- **Canon ref**: §5 routing rule; §10.1 FORBIDDEN
- **Status**: CLOSED (2026-05-08, mig 096).
- **Resolution**: route rewritten as a dispatcher. Looks up the parental_approvals row, validates `parent_id` ownership + active `parent_teen_links`, then dispatches to the canonical RPC by `action_type` (parent_approve_session_v2, parent_approve_ride, parent_approve_food, parent_approve_purchase, parent_approve_content). RPC failure returns 5xx; idempotent on approval id. The `hint` shipping convention is gone.
- **Test coverage**: `tests/integration/parent-approval-cascade.test.ts` (13 cases).

---

### CANON-PARENT-004 — CIN images uploaded to PUBLIC `documents` bucket via `getPublicUrl`

- **Severity**: P0 (Loi 09-08 / CNDP privacy regression)
- **Canon ref**: §6 + §10.5; cross-cutting INDEX rule #6
- **Location**: `app/api/parent/e-signature/create/route.ts:73-90` and `:135-155`
- **Evidence**:
  ```ts
  .from("documents")                      // line 77 — should be private parent-cin
  .upload(fileName, file, ...)
  ...
  .from("documents").getPublicUrl(...)    // lines 83-86 — FORBIDDEN per §10.5
  ```
  Audit `documents` table also stores `cin_front_url`/`cin_back_url` as PUBLIC URLs (lines 142-153), permanently leaking the CIN.
- **Bucket inventory**: no migration creating a private `parent-cin` bucket exists in `gamification-system/database/migrations/` (greps for `parent-cin` return only canon docs).
- **Impact**: Any Moroccan CIN uploaded through the e-signature flow today has a permanent public URL. CNDP violation.

---

### CANON-PARENT-005 — `/api/parent/teens/create` does NOT bootstrap `auth.users`

- **Severity**: P0 (auth integrity)
- **Canon ref**: §7 "Create teen from scratch" + cross-cutting INDEX rule #2
- **Location**: `app/api/parent/teens/create/route.ts:142-194`
- **Evidence**: route inserts `profiles { role:'teen', ... }` at line 142 then `parent_teen_links { status:'approved' }` at line 181. **No `supabase.auth.admin.createUser(...)` call anywhere** (grep `admin\.createUser` returns 0 hits in this file). Canon §7 mandates atomic (a) auth.users (b) profiles (c) parent_teen_links (d) magic-link email.
- **Impact**: Created teen has no `auth.users` row → cannot log in, cannot recover password, cannot receive magic-link. Profile is orphaned.

---

### CANON-PARENT-006 — Allowance disbursement cron does NOT insert teen `user_notifications`

- **Severity**: P1 (canonical receipt missing)
- **Canon ref**: §3 "Teen receipt"
- **Location**: `app/api/cron/disburse-allowances/route.ts:73-111`
- **Evidence**: loop calls `disburse_allowance` RPC (line 74) and writes an `admin_audit_logs` row (line 116), but no `user_notifications` insert. Grep `user_notifications` against `app/api/cron/disburse-allowances/` returns no matches; same against `gamification-system/database/migrations/054_allowance_savings.sql` returns no matches — the RPC `disburse_allowance` does not insert it either.
- **Impact**: Teen never receives "Argent de poche reçu" notification. §3 invariant.

---

### CANON-PARENT-007 — Allowance cron schedule is 09:00 UTC, canon mandates 06:00 Africa/Casablanca

- **Severity**: P1
- **Canon ref**: §3 "Recurring schedule + debit-on-day"
- **Location**: `vercel.json:5`
- **Evidence**: `{ "path": "/api/cron/disburse-allowances", "schedule": "0 9 * * *" }` (09:00 UTC = 10:00 Casablanca, off by 4h from canon).
- **Note**: route comment at `app/api/cron/disburse-allowances/route.ts:4` claims "09:00 Africa/Casablanca" — also wrong vs canon's 06:00.

---

### CANON-PARENT-008 — Sidebar links to non-existent `/parent/subscription` (canon mandates `/carte-vip/souscrire`)

- **Severity**: P1 (broken link)
- **Canon ref**: §1 sidebar table + §9 DEPRECATED
- **Location**: `components/dashboard/parent/sidebar.tsx:27`
- **Evidence**: `{ name: "Abonnement", href: "/parent/subscription", icon: Crown }`. Filesystem confirms `app/parent/subscription/` does NOT exist (404).
- **Impact**: 404 on click. Canon redirect target is `/carte-vip/souscrire`.

---

### CANON-PARENT-009 — Sidebar Approbations badge is hardcoded `2`

- **Severity**: P1
- **Canon ref**: §1 sidebar + §10.8 FORBIDDEN
- **Location**: `components/dashboard/parent/sidebar.tsx:86-90`
- **Evidence**: literal `<span ...>2</span>` rendered for any item named `Approbations`. Component receives `userInfo: UserRoleInfo` but no `pendingCount` prop.
- **Impact**: Badge lies in both directions (shows 2 even if 0; never shows 7 if 7).

---

### CANON-PARENT-010 — Sidebar uses DEPRECATED `silver | gold | platinum` tier vocabulary

- **Severity**: P2
- **Canon ref**: §9 "Subscription tier vocabulary drift"
- **Location**: `components/dashboard/parent/sidebar.tsx:39-58`
- **Evidence**: `tierColors: { free, silver, gold, platinum }` and conditional copy `tier === "silver" && "-10%"` etc. DB enum is `free | starter | pro | elite | family`.

---

### CANON-PARENT-011 — `/api/parent/teens` (link request) writes to DEPRECATED `notifications` + `activity_logs`

- **Severity**: P1 (silent breakage)
- **Canon ref**: §8 + §10.3 + §10.4
- **Location**: `app/api/parent/teens/route.ts:90` and `:101`
- **Evidence**:
  ```ts
  await supabase.from("notifications").insert({ ... })   // line 90 — table does not exist
  await supabase.from("activity_logs").insert({ ... })   // line 101 — DEPRECATED
  ```
- **Impact**: invited teen never sees the link request.

---

### CANON-PARENT-012 — `/api/parent/teens/create` writes to DEPRECATED `notifications` + `activity_logs`

- **Severity**: P1
- **Canon ref**: §8 + §10.3/4
- **Location**: `app/api/parent/teens/create/route.ts:197` (`activity_logs`) + `:207` (`notifications`)
- **Evidence**: `supabase.from("activity_logs").insert(...)` and `supabase.from("notifications").insert(...)`.

---

### CANON-PARENT-013 — `/api/parent/budget` writes to DEPRECATED `notifications` + `activity_logs`

- **Severity**: P1
- **Canon ref**: §8 + §10.3/4
- **Location**: `app/api/parent/budget/route.ts:101` + `:113`
- **Evidence**: `supabase.from("notifications")` and `supabase.from("activity_logs")` inserts.

---

### CANON-PARENT-014 — `/api/parent/grades` writes to DEPRECATED `notifications`

- **Severity**: P1
- **Canon ref**: §8 + §10.3
- **Location**: `app/api/parent/grades/route.ts:295`

---

### CANON-PARENT-015 — `/api/parent/live` writes to DEPRECATED `notifications`

- **Severity**: P1
- **Canon ref**: §8 + §10.3
- **Location**: `app/api/parent/live/route.ts:378`

---

### CANON-PARENT-016 — `/parent/approvals` page reads DEPRECATED `approval_type` (broken icons)

- **Severity**: P1
- **Canon ref**: §5 "Status mapping" + §contradictions #6
- **Location**: `app/parent/approvals/page.tsx:281, 289, 343, 352`
- **Evidence**: every `getApprovalIcon(approval.approval_type)` and `getApprovalTypeName(approval.approval_type)` reads a column that does not exist canonically (`action_type` is canonical). `getApprovalIcon` switch (lines 86-99) also keys on legacy values `booking | purchase | payment | event` which are not the canonical `action_type` set (`coach_meeting | ride | purchase_above_ceiling | food_order | content`).
- **Impact**: every approval card falls through to the default `FileCheck` icon. Status filter at lines 130-134 also reads `rejected` (legacy) instead of canonical `denied`.

---

### CANON-PARENT-017 — Approvals page has decorative non-functional Filter button

- **Severity**: P2
- **Canon ref**: §5 "Page contract — Filter button MUST become functional or be removed"
- **Location**: `app/parent/approvals/page.tsx:162-165`
- **Evidence**: `<Button variant="outline">Filtrer</Button>` with no `onClick`.

---

### CANON-PARENT-018 — `/api/parent/teens/search` uses `.single()` instead of `.maybeSingle()`

- **Severity**: P1
- **Canon ref**: §10.10 FORBIDDEN
- **Location**: `app/api/parent/teens/search/route.ts:33` (teen lookup) and `:48` (existing-link lookup)
- **Evidence**: `.single()` throws PGRST116 when no row exists, surfacing as 500 to the client.

---

### CANON-PARENT-019 — Parent dashboard missing 5 of 9 must-show tiles + decorative quick-action buttons

- **Severity**: P1
- **Canon ref**: §1 dashboard tiles 1-9
- **Location**: `app/parent/page.tsx:230-426`
- **Evidence vs canon checklist**:
  - Tile 1 (signature gate banner) — NOT rendered on `/parent` (only on `/parent/approvals`, `/parent/topup`).
  - Tile 2 (linked teens strip) — present (`TeenSponsorHeader`, line 271).
  - Tile 3 (pending approvals count) — partial: `ControlCenter` at line 265 receives `pendingCount`, but `ApprovalList` only renders when `pendingApprovals.length > 0`. Sidebar still hardcoded.
  - Tile 4 (pending chore verifications count) — **MISSING**. Page never queries `parent_chore_completions WHERE parent_verified IS NULL`.
  - Tile 5 (next allowance disbursement) — **MISSING**. No query against `parent_allowances.next_disbursement_at`.
  - Tile 6 (budget overview per teen) — partial (`FinancialOverview`, lines 397-403, but only aggregate, not per-teen states).
  - Tile 7 (recent activity timeline / `coin_transactions`) — **MISSING**.
  - Tile 8 (live tile / event_check_ins) — **MISSING**. No `event_check_ins` query.
  - Tile 9 (quick actions as `<Link>`) — **DECORATIVE `<Button>` cards** at lines 407-414 ("Historique", "Sécurité"). Canon §1.9 mandates real `<Link>`s with hrefs, NOT decorative buttons. Canon explicitly cites these lines as needing replacement/removal.

---

### CANON-PARENT-020 — `/parent/teens/[id]` detail page does NOT exist

- **Severity**: MISSING (P0 for §11.1)
- **Canon ref**: §7 + §11 MISSING #1
- **Location**: filesystem `app/parent/teens/[id]/` returns "No such file or directory"
- **Evidence**: directory listing of `app/parent/teens/` returns only `add/`, `loading.tsx`, `page.tsx`. The "Détails" deep-link from the teens strip is dead.

---

### CANON-PARENT-021 — Auto-topup UI not gated behind `PSP_AUTO_TOPUP_ENABLED=false`

- **Severity**: P1
- **Canon ref**: §2 "Manual vs auto-package routes" + §12.2 + INDEX F5
- **Location**: `app/parent/topup/page.tsx` (the canonical auto path) + `components/parent/topup-form.tsx`
- **Evidence**: grep `PSP_AUTO_TOPUP_ENABLED` returns hits only in `app/parent/topup/manual/page.tsx:8` (a comment) — the auto path on `/parent/topup` is unconditionally rendered. Canon mandates the package UI MUST be hidden behind the flag until Cash Plus is wired.

---

### CANON-PARENT-022 — Allowance "Trash2" delete icon dangling without delete endpoint

- **Severity**: P2
- **Canon ref**: §3 "Pause / resume" — "Delete is NOT supported"
- **Location**: `app/parent/allowances/page.tsx:8` (import `Trash2`)
- **Evidence**: import retained even though no delete route exists at `app/api/parent/allowances/[id]`. Canon explicitly says "MUST be removed until a delete endpoint is built".

---

### CANON-PARENT-023 — Add-teen form's three "Bientôt" CTAs status

- **Severity**: P2 (informational)
- **Canon ref**: §7 "Link request via QR / email / share — LOCKED future surface"
- **Location**: `components/parent/add-teen-form.tsx`
- **Evidence**: greps for `Bientôt|QR|email-invite` return 0 hits in this file. The QR/email/share future surface is not present at all (neither shipped nor stubbed). Canon allows hidden — requirement is "MUST be hidden, not 'disabled with Bientôt'", so this passes the negative form, but flagged as MISSING for §11.10 owner accountability.

---

### CANON-PARENT-024 — Approval expiry cron MISSING

- **Severity**: P1
- **Canon ref**: §5 "TTL surfacing" + §11 MISSING #12
- **Location**: `vercel.json` cron registry; `app/api/cron/`
- **Evidence**: no `*-approvals-expiry` or similar cron registered. `parental_approvals` past `expires_at` are never auto-denied. Page never displays `expires_at` either.

---

### CANON-PARENT-025 — Resource-specific approve RPCs other than `parent_approve_session` MISSING — **FIXED Wave 1C**

- **Severity**: P0 (cascade is half-built)
- **Canon ref**: §5 cascade table + §11 MISSING #11
- **Status**: CLOSED (2026-05-08, mig 096).
- **Resolution**: shipped `parent_approve_ride / parent_approve_food / parent_approve_purchase / parent_approve_content` (uniform shape `(p_approval_id uuid, p_parent_id uuid)`) + `parent_deny_*` counterparts. Each RPC is `SECURITY DEFINER`, idempotent on approval id, validates owner + link, performs the side effect (status flip on `ride_bookings`/`food_orders`/`feed_posts` + delegation to `parent_approve_session` for mentor sessions), writes `user_notifications` + `audit_log` via the `_approval_finalize` helper. `parent_approve_session_v2` wraps the existing Wave 3 `parent_approve_session` so the dispatch interface is uniform.

---

### CANON-PARENT-026 — Parent panic-suspend RPC MISSING

- **Severity**: MISSING
- **Canon ref**: §7 permissions matrix + §11 MISSING #5
- **Evidence**: no `parent_panic_suspend` RPC, no UI button.

---

### CANON-PARENT-027 — Configurable curfew per teen MISSING; cron uses hardcoded 22:00

- **Severity**: P1
- **Canon ref**: §11 MISSING #3 + INDEX F10
- **Location**: `app/api/cron/ride-curfew-check/route.ts:30-34`
- **Evidence**: cron computes `todayCurfewUtc` as 21:00 UTC unconditionally (= 22:00 Africa/Casablanca). No `teen_curfew_settings` table read; no per-parent override. Canon-mandated table absent from migrations.

---

### CANON-PARENT-028 — Reconciliation cron MISSING (`coin_transactions ↔ user_coins.balance`)

- **Severity**: P1
- **Canon ref**: §11 MISSING #13
- **Evidence**: not in `vercel.json` cron list.

---

### CANON-PARENT-029 — `partner_blocklist` table and parent UI MISSING

- **Severity**: MISSING
- **Canon ref**: §11 MISSING #2

---

### CANON-PARENT-030 — Mark-as-read on `/parent/notifications` NOT wired

- **Severity**: P2
- **Canon ref**: §8 read path "LOCKED option (a)"
- **Location**: `app/parent/notifications/page.tsx`
- **Evidence**: page is server-rendered (line 18 comment confirms), never POSTs to mark notifications read on click. Routes `app/api/notifications/mark-read/` exist as siblings, but not wired from this page.

---

### CANON-PARENT-031 — Per-category budget caps MISSING

- **Severity**: MISSING
- **Canon ref**: §11 MISSING #6 (extend `teen_budget_limits.caps_by_category`)

---

### CANON-PARENT-032 — Two-parent co-sign machinery MISSING

- **Severity**: MISSING
- **Canon ref**: §11 MISSING #7 + INDEX F9

---

### CANON-PARENT-033 — Parent-side data export MISSING

- **Severity**: MISSING
- **Canon ref**: §11 MISSING #8

---

### CANON-PARENT-034 — `/parent/rides/[id]/live` deep-link MISSING

- **Severity**: MISSING
- **Canon ref**: §11 MISSING #9

---

### CANON-PARENT-035 — Parent-facing alert inbox MISSING

- **Severity**: MISSING
- **Canon ref**: §11 MISSING #15

---

### CANON-PARENT-036 — Manual top-up screenshot upload widget MISSING

- **Severity**: P2
- **Canon ref**: §11 MISSING #16
- **Evidence**: `app/api/parent/topup/manual/route.ts:65` accepts `screenshot_path` as a pre-existing string — parent UI must paste a bucket path. No upload widget surfaced.

---

## Summary

### Canon checks (10) status

| # | Check | Status |
|---|---|---|
| 1 | Parent dashboard 9 tiles + sidebar 9 items + dock 5 items | **FAIL** — 5/9 tiles missing (CANON-PARENT-019); sidebar item #8 broken (008); badge hardcoded (009); dock OK |
| 2 | Top-up canonical body `{teenId, amount_dh}` + idempotency | **FAIL** — 001 + 002 |
| 3 | Allowance cron 06:00 + RPC + idempotency + teen receipt | **PARTIAL FAIL** — 006 (no receipt) + 007 (wrong time) |
| 4 | Chores multi-target + private bucket 15-min TTL + cascade RPC | **PASS** (077, 080, 088 + verify-completion route OK) |
| 5 | Approvals cascade via canonical RPCs | **FAIL** — 003 + 025 |
| 6 | E-signature server gates + private `parent-cin` + signed URLs | **PARTIAL** — gates OK on topup + manual; **PRIVACY FAIL** 004 |
| 7 | Teens management 3 link paths + auth.users bootstrap + detail page | **FAIL** — 005 + 020 |
| 8 | Notifications use `user_notifications` exclusively | **FAIL** — 011, 012, 013, 014, 015 |
| 9 | CIN bucket private | **FAIL** — 004 |
| 10 | Score / launch | computed below |

### P0 violations (5)

- CANON-PARENT-001: top-up payload broken
- CANON-PARENT-002: top-up no idempotency key
- CANON-PARENT-003: approvals do not cascade
- CANON-PARENT-004: CIN uploaded to public bucket with `getPublicUrl`
- CANON-PARENT-005: teen creation skips `auth.users`
- CANON-PARENT-025: 4 of 5 approve RPCs missing (cascade is half-built — also P0)

### P1 violations (10)

006, 007, 008, 009, 011, 012, 013, 014, 015, 016, 018, 019, 021, 024, 027, 028 (16 P1 in total once counted distinctly).

### P2 / MISSING (10+)

010, 017, 022, 023, 026, 029, 030, 031, 032, 033, 034, 035, 036.

### Score

| Bucket | Weight | Lost | Notes |
|---|---|---|---|
| Money pipeline (top-up, idempotency, approvals cascade, panic) | 30 | -22 | 001 + 002 + 003 + 025 |
| Privacy / consent (CIN, e-signature gates) | 15 | -12 | 004 |
| Auth / bootstrap (teen create) | 10 | -8 | 005 |
| Notifications discipline | 10 | -7 | 5x deprecated-table writes + missing allowance receipt |
| Dashboard surfaces / sidebar / dock | 10 | -6 | 008 + 009 + 019 |
| Approvals page correctness | 10 | -6 | 016 + 017 + 024 |
| Cron correctness (allowance time, curfew, reconciliation, expiry) | 10 | -6 | 007 + 024 + 027 + 028 |
| Vocabulary / dead UI (tier, Trash2, Filter, mark-read) | 5 | -3 | 010 + 017 + 022 + 030 |
| **Score** | **100** | **-62** | **38 / 100** |

### Launch gate

**NO-GO** until at minimum:

1. CANON-PARENT-001 (top-up payload) fixed.
2. CANON-PARENT-002 (idempotency key) added.
3. CANON-PARENT-003 + 025 (approvals cascade RPCs + server-side fan-out) shipped.
4. CANON-PARENT-004 (private `parent-cin` bucket migration + signed URL refactor) deployed and existing public URLs purged.
5. CANON-PARENT-005 (`auth.admin.createUser` in teen-create endpoint) shipped.

The five P0s map cleanly onto the canon's "money invariant + consent gate + auth bootstrap" tripod. Until they ship, every parent flow that actually moves money or grants permission is broken or unsafe. Everything below P0 is unblockable launch-quality polish, not a launch blocker.
