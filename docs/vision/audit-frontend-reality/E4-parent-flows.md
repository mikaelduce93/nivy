# E4 — Parent Flows Audit (READ-ONLY)

**Date:** 2026-05-08
**Method:** End-to-end journey per flow — page → API → DB invariants — reading every parent UI page and every parent-scoped route under `app/api/parent/**`.
**Scoring:** /10 per flow weighted by completeness, correctness of contract, gating (e-signature / RLS / link), error surfacing, and gaps versus the whitepaper.

---

## TL;DR — Launch readiness verdict

| Flow | Score | State | Launch blocker? |
|---|---|---|---|
| E-signature (parental consent) | **9/10** | Production-ready | No |
| Allowance (recurring debit schedule) | **8/10** | Production-ready | No |
| Manual top-up (CashPlus / Wafacash / M2T) | **8/10** | Production-ready | No |
| Chores (create → submit → approve → payout) | **8/10** | Production-ready | No |
| Approvals (rides / mentor / purchase) | **7/10** | Functional, soft-fails on notify | No |
| Top-up (auto, package-based) | **2/10** | **CONTRACT MISMATCH — 100% failure** | **YES** |
| Teens (link / create / manage) | **6/10** | Working but missing detail page + dead notif inserts | No |
| Budget (per-teen monthly limits) | **7/10** | Working, notif insert errors | No |
| Savings (parent match) | **8/10** | Production-ready | No |
| Grades (validation) | **3/10** | Two diverging code paths, schema drift | No (feature flagged) |
| Events (parent visibility on teen bookings) | **8/10** | Read-only, working | No |

**Critical broken flow blocking launch:**
- `app/parent/topup/page.tsx` + `components/parent/topup-form.tsx` — auto-credit pipeline is broken at the client→API boundary. Every "pack" top-up sends `{coins, bonus, price, packageId}` but `POST /api/parent/topup` requires `amount_dh`. Result: parents cannot recharge via the package UI. Manual top-up still works, so the company is not bricked, but the headline ROI surface in the dashboard is.

---

## 1) Chores — `/parent/chores/**`

### Scoring: **8/10**

### Journey traced
- `app/parent/chores/page.tsx` lists from `parent_chores` filtered by `parent_id`; aggregates pending / verified counts via `parent_chore_completions`. (Polish-F: error banner on RLS / network failure — good.)
- `app/parent/chores/new/page.tsx` → renders `<ChoreForm>` with linked teens loaded from `parent_teens_overview`. Empty-state CTA points to `/parent/teens/add` if no teens are linked. (`components/parent/chore-form.tsx`)
- `app/parent/chores/[id]/page.tsx` → loads chore + completions, **re-signs evidence URLs server-side** (15-min TTL on the private `chore-evidence` bucket). Renders `<ChoreVerifyButtons>` for pending completions. Falls back to "preuve indisponible" if signing fails. (TICKET-014.)
- `POST /api/parent/chores/create` (`route.ts`):
  - Accepts `teen_ids: string[]` (Wave 3 multi-target / sibling fan-out) with legacy `teen_id` fallback.
  - UUID-validated, recurrence-whitelisted, links checked against `parent_teen_links`, fan-out into `chore_targets`.
  - Best-effort rollback if junction insert fails — clean.
- `POST /api/parent/chores/[id]/verify-completion` → thin wrapper around the SECURITY DEFINER RPC `verify_chore_completion`, with proper status mapping (403 not_linked / 409 already_verified / 404 not_found). Multi-parent verification supported (TICKET-013). On approve, the RPC delegates to `payout_chore_reward` (canonical money rails).

### Strengths
- Money path is server-side only (RPC + service role).
- Multi-parent ("dad approves, mum approves") first-wins immutability — correct.
- Sibling fan-out works without breaking the legacy single-`teen_id` column.
- Evidence URLs are short-TTL signed; bucket is private.
- Rejection reason captured.

### Gaps
- No archive / unarchive UI flow for old chores (you can read `is_active=false` but not toggle from the UI).
- No bulk approve for multiple completions.
- No "edit chore" page — only delete-and-recreate.
- Streak/recurrence_config validation client-side is shallow.

---

## 2) Allowances — `/parent/allowances/**`

### Scoring: **8/10**

### Journey traced
- `app/parent/allowances/page.tsx` reads `parent_allowances` for the parent, joins teen names via `parent_teen_links → profiles`. Polish-F error banner present.
- `app/parent/allowances/new/page.tsx` → `<AllowanceForm>` with the linked-teen list.
- `POST /api/parent/allowances` validates link, computes `next_disbursement_at` via `lib/allowance/next-disbursement`, inserts via service role (bypasses RLS for cron-stable schema writes).
- `POST /api/parent/allowances/[id]/pause` → sets `paused_until` (requires ISO timestamp `until`).
- `POST /api/parent/allowances/[id]/resume` → clears `paused_until`, sets `is_active=true`.
- Cadences supported: `weekly`, `biweekly`, `monthly`, `custom_dates`. Conditional allowances (`streak_min` / `quest_completion_rate` / `chore_checklist` / `custom`) accepted in the body but the resolver/cron is out of scope here.

### Strengths
- Service-role insert keeps the cron-side recurring debit invariant clean.
- Pause has a hard `until` — good (can't accidentally pause forever).
- Empty / error state surfaced (Polish-F).

### Gaps
- **No way to delete (only pause indefinitely).** UI shows "Trash2" icon import that is dead in the row actions.
- No "skip next" UX — only pause/resume by date.
- No history of past disbursements visible from the allowance row (parent has to dig into `/parent/history`).
- Conditional allowance UI exists but no admin/parent way to verify the condition was actually evaluated (no "last evaluation result" or "skipped because condition failed" state surfaced).

---

## 3) Top-up (auto / package) — `/parent/topup/**`  **CRITICAL**

### Scoring: **2/10** — broken at the client/API contract.

### Bug (launch-blocker)
- `components/parent/topup-form.tsx` (line 53–64) submits:
  ```js
  body: JSON.stringify({ parentId, teenId, packageId, coins, bonus, price })
  ```
- `app/api/parent/topup/route.ts` (line 41–50) requires:
  ```ts
  const amountDh = Number(body.amount_dh ?? body.amountDh)
  if (!teenId || !Number.isFinite(amountDh) || amountDh <= 0)
    return 400 "Données manquantes (teenId, amount_dh)"
  ```
- **Net effect:** every package click resolves to a 400 from the server. The UI even handles the error path silently with `toast.error(result.error)`. The `success: true` branch never fires, but the form's `setSuccess(true)` confetti wouldn't ever render either.
- Whitepaper §5 + §29 invariants for top-up (atomic via `top_up_teen` RPC; payment_transactions + escrow_ledger + user_coins + coin_transactions) are correctly wired in the API — the bug is purely the client-side payload contract.

### Other issues in this surface
- `topup-form.tsx` also passes the redundant `parentId` from props rather than letting the server derive from the session (`getUserRole`). Server ignores it — minor but confusing.
- The "PAR DEFAUT" fallback (`amountDh`) accepts only the numeric DH value, not the package combo.
- Page header `getTopupHistory` queries `coin_transactions` filtered by `transaction_type='topup'` for linked teens — works but doesn't include the `manual_topup_requests` queue that's still pending.
- `getParentSignature` gate works correctly; before signing, the page shows the `/parent/e-signature` redirect banner — the gate UI is good.
- **No PSP redirect / 3DS / Stripe / CMI integration anywhere** — the auto path is fully mocked at status='succeeded' (per the comment in `route.ts`). For MVP launch, that means the only working path is the manual one (see flow 4).

### What needs to ship before launch
1. Fix `TopupForm.handleSubmit` to compute `amount_dh = selectedPackage.price` and submit `{ teenId, amount_dh }`.
2. Either remove the package UI entirely from the homepage (and rely on `/parent/topup/manual`) or wire a real PSP behind it.
3. Surface the bonus DH in the API response and write it as a separate `bonus_topup` row (currently the bonus shown to the parent is fictional unless the RPC reads `packageId`, which it does not).

---

## 4) Manual top-up — `/parent/topup/manual/**`

### Scoring: **8/10**

### Journey traced
- `app/parent/topup/manual/page.tsx` lists linked teens + last 10 manual top-up requests for the parent (`manual_topup_requests`).
- `manual-topup-form.tsx` → posts to `/api/parent/topup/manual` via `useCSRFAwareSubmit`. Provider whitelist enforced (cashplus/wafacash/m2t/damanecash/baridcash/other). Reference required, optional screenshot path.
- `POST /api/parent/topup/manual`:
  - E-signature gate enforced (returns `requiresSignature: true`, 403).
  - Parent-teen link required.
  - Provider whitelist enforced server-side too.
  - On 23505 (duplicate `(provider, provider_ref)`) — clean 409.
  - Inserts into `manual_topup_requests` with `status='pending'`. Admin then credits via `top_up_teen` RPC (out of scope here, but the contract is documented).
- Recent requests surfaced with status pill (pending / confirmed / rejected) and rejection reason.

### Strengths
- E-sig gate enforced at the API boundary, not just on the page.
- Idempotent on `provider_ref`.
- CSRF-aware client wrapper.
- Service role for the insert keeps the audit table immutable from the parent side.

### Gaps
- Screenshot upload UX expects a hand-pasted bucket path — there is no in-form upload widget. Realistically parents will not paste a path into the box. The "Téléversez d'abord la capture d'écran via le bucket privé" is a manual ops dance.
- No client-side preview of what reference numbers the operators emit (just placeholder "ex. CP12345678").
- No webhook path documented for when the operator writes a settlement file — admin still has to manually credit each row.

---

## 5) Approvals — `/parent/approvals/**`

### Scoring: **7/10**

### Journey traced
- `app/parent/approvals/page.tsx` reads `parental_approvals` joined with the teen's profile; partitions into pending / approved / rejected.
- E-sig gate banner shown if not signed (good UX).
- `<ApprovalButtons>` posts to `/api/parent/approvals` (`POST { approvalId, action: 'approve'|'reject', reason? }`).
- `POST /api/parent/approvals`:
  - Wave-B audit comment in the file confirms a previous version wrote to **non-existent columns** (`responded_at`, `rejection_reason`, `approval_type`, `title`) — that has been fixed against the canonical `parental_approvals` shape (`action_type`, `decided_at`, `decided_by`, `details`).
  - Updates status (`approved`/`denied`), patches `details.rejection_reason` if present.
  - Inserts a `user_notifications` row to notify the teen (correct table).
  - Returns a `hint` telling the caller to invoke `/api/parent/mentor-sessions/[id]/approve` for the actual coin-debit cascade. **The approvals route does NOT cascade by itself.**

### Strengths
- The status mapping is correct (`pending` → `approved`/`denied`).
- Notification table is the canonical `user_notifications` (not the legacy `notifications`).
- `EmptyState` has been added.
- Resource type → `action_url` mapping covers mentor_session, ride, food_order, marketplace_listing.

### Gaps & risks
- The **cascade is the caller's problem.** A parent approving in the UI fires a single endpoint that *only* flips the row + notifies. For mentor-session approvals, the actual coin debit lives in `/api/parent/mentor-sessions/[id]/approve` (which the approvals UI does not currently call). For purchases above ceiling, similar story. **A teen can think "approved!" and the back-end never debits or executes the action.** The hint in the response is for engineers, not the UI.
- Pending list does not show the resource type badge prominently — `getApprovalIcon(approval.approval_type)` is fine but `approval_type` is the *legacy* column name, while the canonical column is `action_type`. The page reads `approval.approval_type` — likely `undefined` on rows written under the new schema, so every approval card shows the default icon.
- No filter UI is implemented despite the "Filtrer" button (placeholder).
- No bulk approve / reject.
- No timer / TTL on pending requests visible to the parent (rides require curfew check; if a parent never decides, the ride sits forever).

---

## 6) E-signature — `/parent/e-signature/**`

### Scoring: **9/10**

### Journey traced
- `app/parent/e-signature/page.tsx` reads the most recent `e_signatures` row (`terms_accepted=true`), shows "Signature déjà enregistrée" if present, otherwise the legal banner + form.
- `<ParentSignatureClient>` wraps `<ESignatureForm>` and POSTs multipart to `/api/parent/e-signature/create`.
- `POST /api/parent/e-signature/create`:
  - Parent role gate via session.
  - Multipart parses `signatureData`, `signatureHash`, `parentFullName`, `parentCin`, `cinFront`, `cinBack`, `photoConsent`, `medicalConsent`.
  - **Both CIN faces required** — good.
  - Uploads CIN to `documents` bucket with namespaced path `${profileId}/cin-${side}-${ts}.${ext}`.
  - Inserts e-signatures row with `terms_accepted=true`, IP, user-agent.
  - Logs CIN documents in the `documents` audit table.
  - Idempotent: if insert fails and a prior valid signature exists, returns the prior id.
- `GET /api/parent/e-signature/status` returns `{signed, signedAt, signatureId}` for any caller that needs to gate.

### Strengths
- CSRF-bypass justified for multipart with a clear comment (cookie-as-proof).
- Audit-friendly: `ip_address`, `user_agent`, `terms_accepted`, `signature_hash` all captured.
- Loi 09-08 / CNDP messaging explicit.
- Renewal path supported (insert a new row; status endpoint reads the most-recent).

### Gaps
- The CIN images are uploaded with `getPublicUrl` on a `documents` bucket — **if that bucket is public, CIN images become public URLs.** Should be a private bucket with signed URLs (same pattern as `chore-evidence`). This is the only privacy concern across the entire parent surface.
- No re-verification or expiry on the signature (it's "lifetime").
- `child_id` / `event_id` / `booking_id` are accepted but not surfaced in the parent UI as separate signatures — the parent doesn't see "you signed for event X" anywhere.

---

## 7) Teens — `/parent/teens/**`

### Scoring: **6/10**

### Journey traced
- `app/parent/teens/page.tsx` lists from `parent_teens_overview`, computes per-teen booking + monthly-spend stats.
  - **Broken link:** the "Détails" button points to `/parent/teens/${teen.teen_id}` but **no `[id]/page.tsx` route exists.** Result: 404 on click. Same for filename `app/parent/teens/[id]` — does not exist.
  - "Top-up" button correctly deep-links to `/parent/topup?teen=...`.
  - "Limites" button points to `/parent/budget?teen=...` — but the budget page does not actually filter by `teen` searchParam.
- `app/parent/teens/add/page.tsx` → `<AddTeenForm>` (search-or-create flow).
  - QR code / email invitation / share link buttons are all `disabled` with "Bientôt" — three dead methods.
- `POST /api/parent/teens` (`route.ts`) — link-request flow:
  - Inserts `parent_teen_links { status: 'pending' }`.
  - Inserts into `notifications` (legacy table — silent failure).
  - Inserts into `activity_logs` (table doesn't exist in canonical schema — silent failure).
- `POST /api/parent/teens/create` — direct teen creation by parent:
  - Validates pseudo, age (10–18), phone format.
  - Generates `linking_code` via `crypto.randomBytes(4)` — secure.
  - Inserts profile + auto-approved `parent_teen_links { status: 'approved', approved_at: now }` (since the parent created them).
  - Inserts `notifications` (legacy) + `activity_logs` (missing) — both silent failures.
  - **No auth.users row created** — this is a profile-only insert, so the teen has no way to log in. The pseudo + linking_code are surfaced but there's no email/password/magic-link onboarding triggered.
- `GET /api/parent/teens/search` — search by email or `linking_code` to find an existing teen profile. Uses `parent_teen_links` `single()` instead of `maybeSingle()` — risk of error when no link exists (PostgREST returns PGRST116). Not fatal but messy.
- `DELETE /api/parent/teens?teenId=...` — unlinks. Good.

### Strengths
- Linking code generation uses CSPRNG.
- Validation rules (age, pseudo regex, phone) are present.
- Search supports both email and linking-code paths.
- Stats overview (events, monthly spend, level) is real.

### Gaps
- **No `[id]` detail page** — every teen-card "Détails" button is a dead link.
- The "create teen" path doesn't bootstrap an auth account, so the parent cannot actually onboard a teen from scratch in one go.
- Three "Bientôt" CTAs in `add/page.tsx` (QR, email invite, share link) clutter the UI.
- Notification + activity-log inserts target tables that don't exist canonically — every link request and every teen creation logs a noisy console error.

---

## 8) Budget — `/parent/budget/**`

### Scoring: **7/10**

### Journey traced
- `app/parent/budget/page.tsx` aggregates `teen_budget_limits` + monthly spend from `bookings` per teen, renders progress bars with three states (under / near 80% / over). Uses `<BudgetLimitForm>` to edit.
- `POST /api/parent/budget` upserts `teen_budget_limits { monthly_limit, per_event_limit, requires_approval }` after verifying the parent-teen link. Inserts into `notifications` (legacy table — silent fail) and `activity_logs` (missing — silent fail).
- `GET /api/parent/budget` returns one teen's limit if `teenId` query param is given, else all linked teens'.

### Strengths
- Hard link verification (`parent_teen_links`) before any write.
- Three-state progress (under / near / over) is good UX.
- Tips card reads like a parent-coaching surface.

### Gaps
- Same `notifications` / `activity_logs` schema drift as elsewhere — teens never receive the "your budget changed" notification.
- The page's "Limites" deep-link from `/parent/teens` includes `?teen=...` but the budget page does not filter or auto-scroll to that teen. Minor.
- Categories breakdown computed (`spendingByCategory`) is computed and never rendered.
- No way to set per-category caps (only monthly + per-event).
- No way to restrict spending hours / days (curfew on spending).

---

## 9) Savings (parent match) — `/parent/savings/**`

### Scoring: **8/10**

### Journey traced
- `app/parent/savings/page.tsx` resolves linked teens, lists their `savings_goals`, renders progress + match config.
  - Polish-F branching: `teenIds.length === 0` short-circuits, error banner on RLS / network failure, sentinel UUID hack removed.
- `<GoalMatchForm>` → `POST /api/parent/savings/match`:
  - Service-role client (money path).
  - Verifies parent ↔ teen link.
  - Validates `match_pct ∈ [0,100]` and optional `cap`.
  - Updates `savings_goals { parent_id, parent_match_pct, parent_match_cap_coins }`.

### Strengths
- Server-side validation matches whitepaper invariant (match_pct bounded, cap nullable).
- Money rails on the service role.
- Per-teen filtering via link join.

### Gaps
- No "match a specific contribution" — only the static config. Hard to do "I'll match this week's saving 1.5x then revert."
- No history of how much the parent has actually contributed beyond the `parent_match_contributed_coins` summary on each goal.

---

## 10) Grades — `/parent/grades/**`

### Scoring: **3/10** — two divergent paths, schema drift.

### Journey traced
- `app/parent/grades/page.tsx` is a CLIENT component that:
  - Queries `teen_grades` directly via the browser Supabase client.
  - Maps columns: reads `grade_type`, `grade_date`, `status`, `validated_at`, `parent_comment`.
  - Update path also from the client: `supabase.from("teen_grades").update({ status, parent_comment, validated_at }).eq("id", grade.id)`.
- `app/api/parent/grades/route.ts` is a SERVER endpoint that:
  - Reads from `teen_grades` with **different columns**: `validation_status`, `validated_by`, `value`, `subject_id`, `rejection_reason`.
  - Joins `subject:subject_id (name)` and `teen:teen_id (pseudo, full_name)`.
  - On approve, awards XP via `user_xp` and `xp_transactions`, calculates `school_score`.
  - Inserts to `notifications` (legacy table) on decision.
  - **Never called from the parent UI** — the page does direct client-side updates and ignores this richer endpoint entirely.

### Critical issues
1. The page reads `status` and the API reads `validation_status` — these are two different schema assumptions. Whichever one matches the actual `teen_grades` table will work; the other path will silently 400.
2. The page does its own `update` from the browser. RLS must allow `parent` role to update grade rows where `teen_id IN (parent_teen_links.teen_id)`. If RLS is open enough for that, the client *also* skips the XP cascade and the school-score recompute that the API would have done.
3. Both code paths drift — one captures `parent_comment`, the other `rejection_reason`. The same teen looking at "why did mum reject this" might or might not see a reason.
4. Hard-coded "Bientôt disponible" banner triggers on `42P01 / PGRST205 / PGRST204` — feature is essentially flagged off.

### Gaps
- Two parallel implementations should converge on the API endpoint.
- The XP cascade is non-trivial logic (50 base + tier bonus + improvement bonus) that will silently never fire in production because the page bypasses it.

---

## 11) Events (parent visibility) — `/parent/events/**`

### Scoring: **8/10**

### Journey traced
- `app/parent/events/page.tsx` reads bookings for linked teens, partitions upcoming / past, renders status pills (confirmed / pending / cancelled).
- Loads upcoming `events` (status='published') as an inspiration carousel.
- No write actions — read-only surface.

### Strengths
- Uses `parent_teens_overview` (canonical view).
- Schema-correct columns (`event_date`, `event_start`, `venue_name`).
- Image fallback on missing `image_url`.

### Gaps
- "Filtrer" button is a placeholder.
- Past list capped at 5 with no pagination.
- No bulk actions, no "see ticket QR" — parent can read code but not validate.

---

## Cross-cutting issues

### Schema drift (notifications + activity_logs)
Six parent-side endpoints insert into `notifications` and/or `activity_logs` despite the canonical tables being `user_notifications` and (no canonical activity_logs table at all):

- `app/api/parent/teens/route.ts` (link request)
- `app/api/parent/teens/create/route.ts` (teen creation)
- `app/api/parent/budget/route.ts` (budget update notify)
- `app/api/parent/grades/route.ts` (decision notify)
- `app/api/parent/live/route.ts` (live notify)
- `app/parent/grades/page.tsx` (client-side, technically reads not writes)

Every one of these is best-effort try/catch'd OR awaited without try/catch. The latter risks 500ing on any path where `notifications` doesn't exist; the former just floods the logs.

`app/api/parent/approvals/route.ts` is the *one* endpoint that uses the canonical `user_notifications` table — so the migration was started but never finished.

### Money path correctness
The flows that DO go through `top_up_teen` / `payout_chore_reward` / `parent_approve_session` RPCs are correct (allowance creation, manual top-up enqueue, chore verification, savings match). The **only money-related break** is the front-end contract bug on `/parent/topup` (auto packages) — see flow 3.

### Top-up auto package failure (recap)
This is the launch-blocker. Either fix the form, or hide the auto-package UI behind a `PSP_AUTO_TOPUP_ENABLED` flag (the manual page comment hints at exactly this). Since there is no real PSP wired anyway, hiding the auto path and pointing parents at the manual flow is the safe pre-launch move.

### Dead links / dead UI
- `/parent/teens/[id]` route does not exist → "Détails" button 404s.
- `add-teen-form` advertises QR / email / share link methods, all disabled "Bientôt".
- "Filtrer" button on `/parent/approvals` and `/parent/events` is a placeholder.
- `Trash2` icon imported in `/parent/allowances/page.tsx` is dead (no delete action wired).

### Missing flows (whitepaper signals not implemented anywhere on the parent surface)

| Capability | Whitepaper signal | Parent-side implementation |
|---|---|---|
| **Block a partner** (e.g. "no rides from driver X" / "no orders from restaurant Y") | `docs/vision/parent-control.md` references blocklist | **Not implemented anywhere.** No `partner_blocklist` table, no UI, no API. |
| **Set a curfew per teen** (configurable, not just 22:00 hardcoded) | `app/api/cron/ride-curfew-check/route.ts` enforces a hardcoded 22:00 Casablanca cutoff | **Parent cannot configure curfew time per teen.** No UI for `teen_curfew` or `parent_curfew_settings`. The cron is hardcoded; parent has zero control. |
| **Daily / weekly digest email** | `lib/emails.ts` + `docs/vision/notifications.md` reference digests | **No parent UI to opt in/out** of digests. No `parent_email_preferences` toggle on the parent settings page. The `notifications/preferences` page is teen-only. |
| **Block a category of activity** (e.g. "no marketplace purchases over 200 DH" — granular) | Whitepaper §10 mentions per-category caps | Only monthly + per-event caps; no per-category. |
| **Sleep / screen-time limits** | Whitepaper §29 mentions teen welfare | Not on the parent dashboard. |
| **See real-time location during a ride** | `/parent/rides/[id]` exists | The detail page exists but the live-tracking surface (`/parent/live`) is a separate page; deep-linking from a specific ride card to its live page is not wired. |
| **Receive an alert on big purchase / curfew breach / budget overrun** | Whitepaper §29 alerts | Backend cron exists for curfew, but there is no parent-facing inbox of alerts; only `parental_approvals` (which is opt-in approval flow, not alert-on-event). |
| **Suspend a teen account** (panic button) | Implicit in parent-control doc | No UI. The DELETE endpoint on `/api/parent/teens` only unlinks — it doesn't disable the teen profile. |
| **Two-parent co-signing on big decisions** | Whitepaper §10 (multi-parent) | The chore verify RPC supports first-wins multi-parent, but there is no analogous "both parents must approve" flow for top-ups, marketplace purchases, or e-sig. |
| **Export / GDPR data export for the teen** | `app/api/me/data-export/route.ts` exists | Self-service path only — parent has no surface to export their teen's data. |
| **Change of legal guardian / divorce-aware re-linking** | Not mentioned but operationally important | Not implemented. |

---

## Critical broken flows (launch-blocker definition: "parental consent failure or topup failure")

1. **Top-up auto packages (P0).** Form contract mismatch breaks 100% of clicks. Fix the form to send `amount_dh` or hide the package UI behind the manual flow until a PSP is wired.

## High-priority broken/incomplete (P1)

2. **Approval cascade is caller-side.** Parent UI flips `parental_approvals.status` but does not invoke the resource-specific RPC (`parent_approve_session`, etc.). Teens see "approved" but the action never executes.
3. **Teen detail page does not exist.** `/parent/teens/[id]` is a dead link from the teens list and indirectly from anywhere else that constructs that URL.
4. **Grades has two divergent code paths.** Client-direct update vs. server endpoint; column names disagree (`status` vs `validation_status`). The XP cascade & school_score recompute never fire because the page uses the simpler client path.
5. **CIN images publicly URLed.** `e-signature/create` uses `getPublicUrl` on the `documents` bucket. If the bucket is public, CIN scans are world-readable.
6. **Notifications schema drift.** Six endpoints write to `notifications` (which doesn't exist canonically) instead of `user_notifications`. Teens never get the parent-decision notification on budget/grades/teen-link/etc.

## Medium (P2)

7. Curfew and activity blocking are not parent-configurable.
8. No daily/weekly parental digest email opt-in.
9. No "alert me when X" inbox; only opt-in approvals.
10. No two-parent co-sign on money / consent decisions (only chores).
11. Dead "QR / email invite / share link" CTAs in add-teen.
12. Activity-logs writes target a non-existent table (six places).

---

## Files of interest (absolute paths)

**Pages (UI surface):**
- C:/Users/Shadow/Desktop/NIVY/app/parent/page.tsx (dashboard)
- C:/Users/Shadow/Desktop/NIVY/app/parent/chores/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/chores/new/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/chores/[id]/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/allowances/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/allowances/new/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/topup/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/topup/manual/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/topup/manual/manual-topup-form.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/approvals/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/e-signature/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/teens/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/teens/add/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/budget/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/savings/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/grades/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/events/page.tsx
- C:/Users/Shadow/Desktop/NIVY/app/parent/settings/page.tsx

**Components:**
- C:/Users/Shadow/Desktop/NIVY/components/parent/topup-form.tsx (the broken contract)
- C:/Users/Shadow/Desktop/NIVY/components/parent/chore-form.tsx
- C:/Users/Shadow/Desktop/NIVY/components/parent/allowance-form.tsx
- C:/Users/Shadow/Desktop/NIVY/components/parent/add-teen-form.tsx
- C:/Users/Shadow/Desktop/NIVY/components/parent/e-signature-client.tsx
- C:/Users/Shadow/Desktop/NIVY/components/parent/budget-limit-form.tsx
- C:/Users/Shadow/Desktop/NIVY/components/parent/goal-match-form.tsx
- C:/Users/Shadow/Desktop/NIVY/components/parent/approval-buttons.tsx
- C:/Users/Shadow/Desktop/NIVY/components/parent/chore-verify-buttons.tsx
- C:/Users/Shadow/Desktop/NIVY/components/parent/allowance-row-actions.tsx

**APIs:**
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/topup/route.ts (correct API; client breaks the contract)
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/topup/manual/route.ts
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/chores/create/route.ts
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/chores/[id]/verify-completion/route.ts
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/allowances/route.ts
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/allowances/[id]/pause/route.ts
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/allowances/[id]/resume/route.ts
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/approvals/route.ts (only canonical user_notifications writer)
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/e-signature/create/route.ts (CIN public URL risk)
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/e-signature/status/route.ts
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/teens/route.ts (notifications + activity_logs drift)
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/teens/create/route.ts (no auth.users bootstrap)
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/teens/search/route.ts
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/budget/route.ts (notif + activity drift)
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/grades/route.ts (parallel to client UI; never called)
- C:/Users/Shadow/Desktop/NIVY/app/api/parent/savings/match/route.ts
- C:/Users/Shadow/Desktop/NIVY/app/api/cron/ride-curfew-check/route.ts (hardcoded 22:00, no parent config)
