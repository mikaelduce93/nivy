# 07 — Security + compliance + storage audit

> Read-only pre-launch review of `C:\Users\Shadow\Desktop\NIVY` against Supabase project `imchornjvmgmaovhypco`. Audited 2026-05-07. Methodology: live introspection of `pg_policies`, `information_schema`, `pg_proc.prosrc`, `storage.buckets`; static review of `middleware.ts`, layout files, and a stratified sample of API routes (~25 of ~190+ routes); grep for service-role and secret-handling anti-patterns. No mutations were performed.

## Verdict

**AMBER** — leaning RED on three issues that can ship a 13-year-old's CIN scan or full ride history to a wrong recipient with one bad commit. The platform has the right backbone (RLS on the right tables, server-side service-role only, working storage policies on the three sensitive buckets, middleware-level CSP/CSRF/rate-limit/auth) but several launch-blocking gaps remain in the parental-approval write path, the CNDP Article-9 surfaces (export, erasure, consent ledger), and one of the three private buckets (`defi-proofs`) which mounts a teen-side public read on `is_active=true` rows. The good news is each finding is small and targeted; none requires a re-architecture.

The ten-line summary: **storage privacy holds, RLS scopes are correct, the e-money pipeline is BAM-shaped (no crypto, paired ledger, locked rate, server-only writes), the halal default is enforced inside the food RPC, the curfew cron actually runs and cancels, and KYC gating is enforced in `book_mentor_session`.** The bad news: **the `parent/approvals/route.ts` decision endpoint writes to columns and tables that do not exist (`responded_at`, `approval_type`, `title`, `notifications`, `activity_logs`), so every parent decision in the UI is a no-op while pretending success; `data_exports` exists as a table with no API behind it; the privacy policy still says "Teens Party Morocco" and lists no Nivy-specific surfaces; and `nivy_drivers` exposes plate + phone to any authenticated user.**

Fix list at the bottom — twelve items, none larger than a half-day of work. Do them and the verdict moves to GREEN.

---

## Storage privacy

Live result of `SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets`:

| Bucket | Public | Size limit | MIME allow-list | Verdict |
|---|---|---|---|---|
| `cin-scans` | **false** | 5 MB | jpeg/png/webp/pdf | OK |
| `kyc-documents` | **false** | 5 MB | jpeg/png/webp/pdf | OK |
| `defi-proofs` | **false** | 10 MB | jpeg/png/webp/mp4/mov | OK |
| `event-images` | true | 5 MB | jpeg/png/webp | OK (intended) |
| `partner-logos` | true | 2 MB | jpeg/png/webp/svg | OK (intended) |
| `avatar-assets` | true | 1 MB | png/webp/svg | OK (intended) |

All three sensitive buckets are correctly `public=false`, so an anonymous fetch of `cin-scans/<file>` over the storage public URL returns 400. MIME allow-lists are sane (PDFs only allowed where they belong — CIN + KYC). Object counts are zero across all three private buckets right now (no production data yet), which is consistent with the "manual MVP" state of the upstream flows.

### Storage RLS — bucket-by-bucket

Read directly from `pg_policies` on `storage.objects`. Twelve policies, all four private flows correct, two minor cleanups recommended:

**`cin-scans`** — paired `cin_self_insert` (folder-prefix bound to `auth.uid()`) and `cin_self_read` that joins `e_signatures` and only returns the row when `e.parent_id = auth.uid() AND e.cin_url = objects.name`. This is the right shape: the scan is readable only by the parent who uploaded it, and only via the e-signature record that references it. **No leak vector.**

**`kyc-documents`** — `kyc_owner_insert` and `kyc_owner_read` both gate on `partner_staff.role = 'owner'`. A partner staff member with role `staff` cannot read their own employer's KYC docs (intended), and no third party can. **OK**, but flag: there is no admin read policy on this bucket. Admins reviewing KYC docs from `/admin/kyc` will need either a service-role read path or an additional `kyc_admin_read` policy bound to `admin_roles`.

**`defi-proofs`** — `defi_proof_teen_insert` (folder-prefix bound to `auth.uid()`) and `defi_proof_visibility` allowing read by the teen themselves OR a parent linked via `parent_teen_links`. Correct scope. The mime list (`mp4`, `quicktime`) means video defi proofs work end-to-end.

**Public buckets** — `event-images`, `partner-logos`, `avatar-assets` all have `public_read` (anyone) + admin/partner-bound write policies. Intended.

### Leak vectors searched

- `getPublicUrl('cin-scans/...')`, `getPublicUrl('kyc-documents/...')`, `getPublicUrl('defi-proofs/...')` — **zero matches across the codebase.** All sensitive bucket reads go through signed URLs.
- Hardcoded service-role-key file paths — none.
- Cross-bucket misroute (e.g. uploading a CIN scan into `event-images`) — the upload routes (`app/api/upload/avatar/route.ts`, `app/api/check-in/...`) all hit the right bucket; sensitive uploads (CIN, KYC, defi proof) are not yet wired to a UI route, so this risk is structural-only today.

**One residual concern, not a leak but worth noting:** the storage MIME list for `defi-proofs` allows up to 10 MB videos but there is no rate-limit on storage writes per teen per day. A motivated teen could DOS the bucket. Acceptable for MVP; flag as P2.

---

## Auth enforcement matrix

`middleware.ts:104-296` covers the front door. CSP with per-request nonce, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy, distributed rate limit (Upstash with in-memory fallback per `lib/security/rate-limiter-redis.ts`), CSRF on all non-GET API routes (`middleware.ts:128-136`), and fail-closed in production if Supabase env is missing (`middleware.ts:140-151`). The `/admin` and `/dashboard|/profile|/parent|/teen|/ambassador|/partner` matchers do a server-side `auth.getUser()` and a profile/role lookup, with cross-role redirect (`middleware.ts:266-280`). The `dashboardPaths` regex correctly redirects a teen who navigates to `/parent/...` to their own dashboard.

Layouts then re-check, defense-in-depth:

| Layout | File | Gate |
|---|---|---|
| Admin | `app/admin/layout.tsx:11-17` | `getAdminInfo()` → redirects on null |
| Teen | `app/teen/layout.tsx:32-40` | `getUserRole()` → redirect to `/auth/login` if null, `/auth/redirect` if role mismatch |
| Parent | `app/parent/layout.tsx:14-22` | same pattern |
| Partner | `app/partner/layout.tsx:14-20` | same pattern |
| Mentor | (no `app/mentor/` exists yet) | mentor flows currently use `/teen/mentors/*`; mentor-side dashboard not built |
| Driver | (no `app/driver/` route group exists yet) | only API routes under `app/api/driver/*` |

This is the right belt-and-suspenders shape. Middleware blocks anonymous access at the request boundary; layouts re-verify the role before rendering. Two observations:

1. **Mentor and driver have no front-end shells.** They have API routes but no dashboard, so a mentor or driver in the system currently has no place to log in and use the product. Not a security finding — it's a product-completeness finding documented in audits 02/03 — but worth flagging because `nivy_drivers.is_active=true` exists with no UI to set it.
2. **`isAccessingWrongDashboard`** in `middleware.ts:266` works for the four named role paths but does not catch new top-level segments like `/marketplace` or `/anniversaires` which are role-agnostic. Those rely on RLS and the layout/page itself. Acceptable but document it as a convention.

### Routes that bypass auth on purpose

`/api/csrf` (`middleware.ts:128`), `/api/cron/*` (auth via `CRON_SECRET` Bearer or `x-vercel-cron` header — verified in `app/api/cron/ride-curfew-check/route.ts:15-23`), `/api/webhooks/stripe`, `/api/health`, public marketing routes (`app/legal/*`, `app/aide`, etc.). All correct.

### Routes with weakly-validated callers

`app/api/admin/run-migration/route.ts:28-45` is `POST` with **no auth check at all** before doing fs I/O on `gamification-system/database/migrations/*`. It returns instructions rather than executing, so it's information-disclosure-only (the SQL preview), but: this should still require admin role. **P1.**

`app/api/teen/mentors/route.ts:4-22` is a `GET` with no auth check. Returns only `status='active' AND kyc_status='approved'` mentors with non-PII fields — bio, expertise, rate, rating. Acceptable as a public discovery endpoint; flag P2 only because an unauthenticated scraper could enumerate mentors.

---

## Service role audit

`lib/supabase/service-role.ts:20-34` is the canonical helper. It throws if the URL or key is missing, sets `persistSession: false` and `autoRefreshToken: false` (correct for a one-shot server client), and is documented as "SOURCE OF TRUTH for service-role clients."

Grep for direct `createClient(.+SUPABASE_SERVICE_ROLE_KEY` returned **one** match outside the canonical helper: `scripts/check-schema.ts:16` (a build-time script, not a runtime path). **Zero** matches in any `'use client'` file. **Zero** matches in any `components/**`. **Zero** matches in any `.tsx` file under `app/**`.

The other 18 grep hits (`scripts/verify-*.ts`, `scripts/seed-*.ts`, `gamification-system/database/run-migrations.ts`, `lib/config/app-config.ts`, `identify-missing-scripts.js`) are all server-side scripts or env-presence checks. **No client-side leak.**

API routes that import `createServiceRoleClient` (sample audited):

| Route | Validates caller? | OK? |
|---|---|---|
| `app/api/admin/execute-sql/route.ts:21-32` | yes — `auth.getUser()` + `admin_roles` check + `ENABLE_ADMIN_SQL_EXECUTION` flag + script-id allow-list `["105","106","107","108","109"]` | ✓ |
| `app/api/parent/topup/route.ts:36-89` | yes — role + parent-teen link + e-signature gate before service-role RPC | ✓ |
| `app/api/teen/rides/request/route.ts:29-50` | yes — role check, then RPC also validates caller via `p_caller_id` | ✓ |
| `app/api/parent/rides/[id]/approve/route.ts:13-23` | yes — role=parent | ✓ |
| `app/api/admin/drivers/[id]/approve/route.ts:13-23` | yes — role=admin | ✓ |
| `app/api/marketplace/listings/[id]/buy/route.ts:23-43` | yes — `getUserRole()` + `buy_listing` RPC re-checks `auth.uid() = p_buyer_id` | ✓ |
| `app/api/teen/food/order/route.ts:38-67` | yes — role=teen | ✓ |
| `app/api/cron/ride-curfew-check/route.ts:16-23` | yes — Vercel cron header OR `CRON_SECRET` Bearer | ✓ |
| `app/api/driver/rides/[id]/track/route.ts:20-43` | yes — verifies caller `user_id == nivy_drivers.user_id` for the assigned driver | ✓ |

Every service-role path I audited validates the caller before calling the privileged RPC, and the SECURITY DEFINER RPCs themselves perform a second check (`IF v_caller IS NOT NULL AND v_caller <> p_teen_id THEN unauthorized` — see `place_food_order` and `spend_teen_coins` pg_proc bodies). This is the pattern the whitepaper §29.15 requires.

**Recommendation, not a finding:** standardize on calling RPCs through the user JWT client (so `auth.uid()` is set inside the RPC) for non-money paths, and reserve `createServiceRoleClient()` for explicit cross-user writes (notifications, escrow ledger, audit logs, admin actions). Today most teen-action routes use service-role even though the RPC has SECURITY DEFINER + auth check — it works, but it forfeits the in-RPC `auth.uid()` defense if someone forgets to pass `p_caller_id`. The `request_ride` RPC is the exemplar of doing this right.

---

## Compliance — Loi 09-08 / CNDP

The Moroccan equivalent of GDPR. Required surfaces for a platform processing minors' data:

1. **Privacy policy** — present at `app/legal/confidentialite/page.tsx`. Length ~200 lines, structured into 11 sections (introduction, data collected, use, minors, sharing, rights, security, cookies, retention, modifications, contact). **Two issues:**
   - The brand still says "Teens Party Morocco" (`page.tsx:18-21`, `:188`) instead of Nivy. Either keep TPM as the legal entity (fine) or update — but be consistent. **P1 cosmetic but legally relevant** (the data controller name is what CNDP cares about).
   - The contact block (`:196-198`) literally contains the placeholder strings `+212 5XX-XXXXXX` and `[Votre adresse complète]`. **P0 to fix before launch** — CNDP requires a real postal address and phone for the data controller.

2. **Right of access / export** — `data_exports` table exists (per migration 046, columns `id, user_id, export_type, status, file_url, requested_at, completed_at`). RLS policy `data_exports_self_read (user_id = auth.uid())` is in place. **But no API route, no UI, no cron, no anything.** Grep for `data_exports` returned only `docs/vision/db-architect.md`. The schema is half-laid; the implementation is zero. **P1 launch blocker** — claiming "droit à la portabilité" (`page.tsx:113`) without a working endpoint is a CNDP violation.

3. **Right of erasure** — no `delete_account` RPC exists (`SELECT routine_name ... LIKE '%delete_account%' OR '%erase%'` returned zero). No `app/api/account/delete` route. Privacy policy promises this right (`page.tsx:110`) and there is no implementation. **P1 launch blocker.**

4. **Consent collection** — there is `e_signatures.terms_accepted=true` gating top-ups (verified in `top_up_teen` RPC body). That is the parent CGU signature. But there is no separate **per-purpose consent ledger** (cookies, marketing, transactional emails, photo rights). The cookie page exists at `app/legal/cookies` but there is no consent-management UI on the site. The privacy policy claims you can "withdraw consent at any time" (`page.tsx:118`) — show me where. **P2.**

5. **Audit trail** — `admin_audit_logs` exists and is written from sensitive admin actions (verified in `app/api/admin/marketplace/moderate/[listing_id]/route.ts:65-71` and the curfew cron). Good. But teen-facing actions (top-ups, spends, consents) only land in `coin_transactions` and `escrow_ledger`, not in a unified audit trail. **P2.**

6. **CNDP declaration** — out of scope for this audit (legal filing, not code). Flag only that the entity name in the privacy policy must match whatever was filed with CNDP.

---

## Compliance — BAM e-money

Bank Al-Maghrib regulates e-money in Morocco. The whitepaper §28 commits to using a BAM-licensed partner (Cash Plus, Wafacash, M2T, CMI) and **never crypto**. Verifying:

**Schema readiness for a licensed partner integration:**

`payment_transactions` (verified columns): `id, parent_id, teen_id, amount_dh, amount_coins, status, psp_provider, psp_reference, failure_reason, created_at, succeeded_at, refunded_at`. The `psp_provider` and `psp_reference` columns are exactly what's needed to plug a real provider. Today `top_up_teen` writes `psp_provider='manual'` and synthesizes a success — the comment in `app/api/parent/topup/route.ts:18-19` says "PSP integration is mocked at status='succeeded' for the MVP."

`escrow_ledger` is the paired entry. `direction IN ('top_up','spend',...)`, `related_payment_id` pointing back to `payment_transactions.id`, `created_by` recording the actor. This is the right shape for BAM bookkeeping.

**Locked rate** — verified in `top_up_teen` RPC body: `v_amount_coins := (p_amount_dh * 100)::integer`. Whitepaper §5 says 100 coins = 1 DH, hardcoded, no exchange-rate floating. ✓

**Crypto search** — grep for `wallet`, `chain`, `web3`, `blockchain`, `crypto`, `eth`, `usdc` across the source tree returned only the Stripe SDK (`lib/stripe.ts`) and unrelated naming (`user_coins`, `crypto.randomUUID()`). No crypto in path. ✓

**What's still mocked:**

- The PSP webhook itself (`app/api/payments/cmi/webhook/route.ts` exists but the production credentials are empty in `.env.example:71-74`).
- There is no CMI `psp_provider` value being written by code today — `top_up_teen` always writes `'manual'`. To go live, a webhook handler must call `top_up_teen` after a real charge succeeds, or `top_up_teen` must accept a `p_psp_provider` parameter.

**Gap that matters for BAM:**

The escrow architecture is parent → teen wallet only. There is **no escrow → partner cash-out path with a `partner_payouts.psp_reference`**. `partner_payouts` table exists with columns `partner_id, period_start, period_end, total_dh, status, paid_at, reference`, but no RPC fills it and no settlement cron runs. For a BAM-compliant launch you need: teen pays partner in coins → coins debited from teen → DH counterpart accrued in `partner_payouts.total_dh` → weekly cron triggers a real bank transfer through the licensed partner (Cash Plus B2B) → `paid_at` and `reference` written. **None of this is wired today.** Treat as P1 if real partner cash-outs are required for launch; P2 if launch is "just teens spending coins, partners settle later."

**Top-up provider parameter passing.** `top_up_teen` does not accept a `p_psp_provider` arg, so even when the CMI webhook is wired it cannot tell the RPC which provider was used. **Add a `p_psp_provider TEXT, p_psp_reference TEXT` argument with default `'manual'`** and start writing real values when CMI is enabled. Half a day of work; do it before launch.

---

## Halal + teen safety

### Halal-by-default

`menu_items.is_halal` column exists with `column_default = true`. ✓ The food RPC `place_food_order` (verified body):

```
IF NOT COALESCE(v_item.is_halal, true) THEN
  v_has_non_halal := true;
END IF;
...
IF v_has_non_halal THEN
  v_requires_approval := true;
  v_approval_reason := 'non_halal_item';
END IF;
```

A non-halal item triggers a parental approval path; the order is inserted with `status='pending'` and no debit happens until the parent approves. Whitepaper §29 requirement met. ✓

**Restaurant-level halal flag** — there is no `restaurants` table; the food-delivery surface uses `partners` (no `is_halal` column on partners) + `menu_items.is_halal`. So the per-item flag is the only mechanism. That is sufficient (a partner can have both halal and non-halal items), but consider adding `partners.halal_certified` for the discovery filter so a teen can scope to fully-halal restaurants. **P2.**

### Curfew

`ride_bookings.curfew_override` boolean exists. The cron (`app/api/cron/ride-curfew-check/route.ts:36-58`) runs daily at 22:00 UTC, finds rides scheduled between today's 21:00 UTC (= 22:00 Casablanca) and tomorrow's 21:00 UTC where `curfew_override=false AND status IN ('requested','approved')`, cancels them with `cancellation_reason='curfew_22h'`, and writes an `admin_audit_logs` row. ✓

**Two sharp edges:**

1. The cron only runs once a day at 22:00. A ride scheduled for 23:30 on the same day, requested at 18:00, will be cancelled. A ride requested at 22:30 on the same day will **also** be cancelled at the next 22:00 run — a 23.5h delay in feedback. The right shape is to enforce curfew **at request time** in `request_ride` RPC, with the cron as a sweep for approved-but-not-yet-cancelled edge cases.
2. Daylight saving is hand-waved (`Casablanca / Morocco is UTC+1 year-round` per the cron comment) — Morocco actually observes DST in Ramadan, but that's a calendar question for ops, not a security finding.

**P1 — add a request-time curfew check inside `request_ride` RPC.**

### Marketplace meet safety

The `buy_listing` RPC (verified body) refuses `meet_method` outside `('school','venue_partner')` when either party is a teen, and refuses `venue_partner` without a `meet_location_partner_id`. ✓ Whitepaper §29 #11 (no public-pickup for teens) enforced.

### Marketplace ceiling

`teen_budget_limits.max_per_transaction_coins` (default 100) gates marketplace purchases above the ceiling — verified in `buy_listing` body. ✓ Above the ceiling, a `parental_approvals` row is written and the function returns `status='pending_approval'` without debiting. Correct invariant.

### Mentor age gate

`book_mentor_session` (verified body) computes the mentee's age from `teens.date_of_birth` and refuses the booking if `age < age_min_mentee OR age > age_max_mentee`. ✓ Also requires `mentor.status='active' AND mentor.kyc_status='approved'`.

### DM / messaging

`circle_messages`, `challenge_messages`, `avatar_messages` exist. There is **no global teen-to-teen DM table** — messaging is scoped to circles (= friend groups with parent-side `crews.requires_approval`) and challenge contexts. This is the "no DM from strangers" rule by absence-of-feature. ✓ Verify before launch that no PR sneaks a `direct_messages` table in without RLS and friend-list gating.

### Content moderation

`moderation_queue` exists. The marketplace moderation flow writes to it (verified in `app/api/admin/marketplace/moderate/[listing_id]/route.ts:52-62`). The creator economy moderation route exists at `app/api/admin/creator/moderate/route.ts`. Listings transition through `pending_moderation → active|removed`. ✓

**Gap:** the moderation_queue is populated by marketplace and creator submissions. Circle messages, challenge messages, and food-order notes are **not moderated**. For launch with 13yo teens, at minimum add a profanity filter on `circle_messages` and `coin_transactions.description`. **P2 (or P1 if you have CSAM exposure concerns — this audit didn't review chat content; consult skill `security-review` for that).**

---

## Parental authorization gates

The whitepaper §11 requires per-action consent for high-impact teen actions. Verified in RPC bodies:

| Action | Per-action approval row written? | Where | Verdict |
|---|---|---|---|
| Transport ride request | yes — every teen ride writes `parental_approvals` with `action_type='booking', resource_type='ride'` | `request_ride` RPC | ✓ |
| Mentor session booking | yes — `action_type='coach_meeting', resource_type='mentor_session'`, expires in 7 days | `book_mentor_session` RPC | ✓ |
| Food order with non-halal OR over-ceiling OR over-challenge-budget | yes — `action_type='food_order'`, with reason | `place_food_order` RPC | ✓ |
| Marketplace purchase above ceiling | yes — `action_type='purchase_above_ceiling'`, expires 48h | `buy_listing` RPC | ✓ |
| Coin top-up | no per-action row; gated by one-time `e_signatures.terms_accepted` | `top_up_teen` RPC | OK by design (one-time CGU consent for the wallet itself) |
| Marketplace listing creation by teen | no | `marketplace_listings` insert path | **GAP — P2** (a teen listing requires parent approval per whitepaper §29 — verify and add) |
| Crew join with `crews.requires_approval=true` | not verified in this audit | crew-join code path | **needs verification** |

**Parent decision endpoint — P0 BUG.** `app/api/parent/approvals/route.ts:54-114` writes columns and tables that **do not exist**:

- Writes `responded_at` — actual column is `decided_at`.
- Reads `approval.approval_type` — actual column is `action_type`.
- Reads `approval.title` — column does not exist on `parental_approvals`.
- Inserts into `notifications` — table is `user_notifications`.
- Inserts into `activity_logs` — table does not exist.
- Cascades to `event_bookings` table — does not exist (only `bookings` exists).

This means **every parent decision via this endpoint is broken at runtime** — the row update silently fails on the unknown column, the cascade hits a 404 table, and the endpoint returns `success: false` with a 500. The parent UI will show the spinner forever. **P0, fix before any parent touches the app.**

The newer flow-specific routes do this correctly: `app/api/parent/rides/[id]/approve/route.ts` calls `approve_ride` RPC; `app/api/parent/mentor-sessions/[id]/approve/route.ts` calls `parent_approve_session` RPC. Both work. The catch-all `/api/parent/approvals` route is a holdover from before the per-action RPCs existed and needs to either be deleted or rewritten to dispatch by `action_type` to the right RPC.

The `parental-authorizations.md` vision doc (`docs/vision/parental-authorizations.md`) is **stale** — it claims `parental_approvals` doesn't exist, but it does (Wave 3.1 introduced it). Refresh that doc.

---

## KYC enforcement

### Drivers

`nivy_drivers` table — columns `kyc_status TEXT, kyc_documents_url TEXT, is_active BOOLEAN, approved_by UUID, approved_at TIMESTAMPTZ`. Admin approval RPC: there is no `admin_approve_driver` RPC, but `app/api/admin/drivers/[id]/approve/route.ts:25-37` does the update directly via service-role: sets `kyc_status='approved', approved_by=admin.id, approved_at=now(), is_active=true`. Works.

**Gap — `kyc_documents_url` is a single TEXT column.** A driver needs at least three docs (CIN, license, vehicle registration). Either store them as `kyc_documents_url JSONB` or use the `kyc_documents` table (which currently only has `partner_id`, no `driver_id`). **P1 launch blocker** — without per-document tracking you cannot tell a driver "your license is rejected, your CIN is fine."

### Mentors

`mentors.kyc_status` exists. `mentors_active_read` policy filters to `status='active' OR self OR admin`. The `book_mentor_session` RPC enforces `kyc_status='approved'` before booking. ✓ But same gap — no per-document table tying a mentor to their diploma scan. The diploma scan upload flow does not exist yet (no UI, no API).

### Partners

`kyc_documents` table exists with `partner_id, doc_type, file_path, status, reviewed_by, reviewed_at, rejection_reason, owner_user_id, subject_kind`. The `kyc_owner_insert` and `kyc_owner_read` storage policies bind to `partner_staff.role='owner'`. Schema is right; admin-side review UI is the missing piece — there is an `app/admin/partner-staff/` route but no `/admin/kyc` review queue.

### KYC docs in private bucket

Confirmed: `kyc-documents` bucket is `public=false`. ✓ All KYC document references must go through signed URLs only.

### Admin KYC approval RPC

`admin_approve_mentor` exists (verified in `pg_proc`). No `admin_approve_driver` (just direct table update — works but inconsistent). No `admin_approve_partner` (partner gets approved via `partner_staff.is_active=true` on registration). Recommend wrapping these in RPCs for consistency and audit-trail uniformity. **P2.**

---

## PII exposure

### Driver-side PII to teens

`nivy_drivers` columns expose `full_name, phone, vehicle_make, vehicle_model, vehicle_plate, kyc_status, is_active, rating, service_cities`. RLS policy `nivy_drivers_self_read` is `(user_id = auth.uid()) OR (is_active = true)` — meaning **any authenticated user can read all active drivers including their phone number and plate.** This is intentional for the ride-tracking flow (the teen needs to know who's picking them up), but:

- Phone should only be exposed once a ride is **dispatched** to that specific driver.
- Plate should only be exposed once a ride is **dispatched** to that specific driver.
- Other teens should not see the driver list with phones at all.

**P1 — tighten the policy** to `is_active=true AND EXISTS (SELECT 1 FROM ride_bookings WHERE driver_id = nivy_drivers.id AND status IN ('dispatched','in_progress') AND (teen_id = auth.uid() OR parent_id = auth.uid()))`, or split the table into `nivy_drivers` (private PII) and `nivy_drivers_public` view (no phone, no plate).

### Mentor-side PII to teens

`mentors` table doesn't store name/email/phone directly — those live on `profiles` (joined by `user_id`). The `app/api/teen/mentors/route.ts:11-15` SELECT returns only `id, expertise_tags, years_experience, bio, hourly_rate_dh, free_intro_session, age_min_mentee, age_max_mentee, rating, sessions_count` — no PII leaked. ✓

### Teen-side PII to other users

The `profiles_self_read` policy is `(id = auth.uid())` — a teen cannot read another teen's profile. Crew/circle membership and the leaderboard surfaces use a denormalized public-view pattern (verify: `gamification_leaderboard` materialized view or similar). **Verify before launch** that no `app/api/teen/leaderboard/route.ts` returns `full_name + photo + birthday` joined together. Quick spot-check showed no such SELECT, but full audit needed.

### Parent → teen PII

Parents can see their own teens' full data via `parent_teen_links`. ✓ A parent cannot see another parent's teen — verified in `user_coins_self_read` policy: `(teen_id = auth.uid()) OR (EXISTS ... parent_teen_links)`.

### Marketplace listings

`marketplace_listings` exposes `seller_user_id` to anyone (`mp_listings_public_select` is `status='active'`). The seller's profile is then joined by the listing UI. **Verify** that the joined view does not expose teen sellers' phone numbers — the buyer should communicate via in-app messaging only. The whitepaper requires `meet_method IN ('school','venue_partner')` for teen sellers (enforced in `buy_listing`), so the phone-number exposure path is moot if no DM happens. But: if the marketplace UI shows the seller's avatar + first name + city, that's PII — make sure birthday and full name are not in the SELECT. **P2 verify.**

---

## Session security

Cookies set by `@supabase/ssr` (`lib/supabase/middleware.ts:19-32`). Default config from `@supabase/ssr` is `httpOnly: true, secure: true (in production), sameSite: 'lax'`. Verify in production browser dev tools after deploy.

**CSRF.** `lib/security/csrf.ts:13-27` — double-submit pattern: `x-csrf-token` header must equal `csrf-token` cookie. Validated in `middleware.ts:128-136` for all `/api/*` non-GET routes except `/api/csrf` (the token-fetch endpoint itself). Acceptable. The `withSecurity` wrapper (`lib/security/api-middleware.ts:71-79`) re-validates inside individual route handlers as a defense-in-depth — used by 28 routes.

**Rate limiting.** `lib/security/rate-limiter-redis.ts` (Upstash, with in-memory fallback). Presets in `lib/security/rate-limiter.ts:31-34`: `auth, booking, payment, upload, api`. Middleware applies per-path config (`middleware.ts:104-119`). ✓

**Auth-endpoint rate limit.** `RATE_LIMITS.auth` is applied to `/api/auth/*` (`middleware.ts:109`). Verified the path matcher hits before the auth handler. Acceptable.

**Two missing pieces:**

- No account lockout after N failed login attempts (Supabase Auth handles its own throttling, but it's just a 429 — not a temporary lockout). Acceptable for MVP.
- No session revocation UI for parents to "kick all my devices off." The Supabase client supports `auth.signOut({ scope: 'global' })` but there's no UI button. **P2.**

---

## Hardcoded / scaffolded (security side)

1. **`app/api/admin/run-migration/route.ts`** — has a hardcoded `MIGRATIONS_MAP` of `001..019` and **no auth check at all** before reading SQL files from disk. Returns SQL preview to caller. Information disclosure to anonymous. **P1.**
2. **`app/api/admin/execute-sql/route.ts:45`** — script-id allow-list is `["105","106","107","108","109"]` hardcoded. As long as `ENABLE_ADMIN_SQL_EXECUTION=false` in prod (verify), this is gated. The route is correctly admin-only and disabled-by-default.
3. **`app/legal/confidentialite/page.tsx:196-198`** — placeholder address and phone in the privacy policy (`+212 5XX-XXXXXX`, `[Votre adresse complète]`). **P0 to fix before launch.**
4. **`app/api/parent/approvals/route.ts`** — entire endpoint scaffolded against tables and columns that don't exist. **P0.**
5. **`top_up_teen` RPC** — hardcodes `psp_provider='manual'` even though the column accepts any text. Add `p_psp_provider` arg. **P1 before BAM partner integration.**
6. **`nivy_drivers.kyc_documents_url`** — single TEXT column for what should be 3-4 separate documents. **P1.**
7. **`payment_transactions.failure_reason`** — column exists, never written to by `top_up_teen`. Means a real PSP failure mode would silently swallow the reason. **P2.**
8. **Driver/mentor frontend shells missing** — system has API routes and tables but no `app/driver/` or `app/mentor/` route group. KYC documents cannot actually be uploaded today through the product. **P1 if drivers/mentors are launch-required; P2 otherwise.**
9. **`data_exports` table** with no API behind it. **P1 for CNDP.**
10. **`docs/vision/parental-authorizations.md`** — stale, claims `parental_approvals` doesn't exist when it now does. Refresh. **P2 documentation hygiene.**

---

## Risks (P0 / P1 / P2)

### P0 — launch blockers

**P0-1. `parent/approvals/route.ts` is broken at runtime.** Writes to columns and tables that don't exist. Every parent decision via the legacy catch-all endpoint silently fails. Replace with a dispatcher that calls `approve_ride`, `parent_approve_session`, etc., based on `action_type`, OR delete the route and ensure all UI paths use the per-action endpoints.
*File: `app/api/parent/approvals/route.ts:54-114`. Effort: 4 hours.*

**P0-2. Privacy policy contains placeholders.** `+212 5XX-XXXXXX` and `[Votre adresse complète]` shipped to a CNDP-regulated platform is a non-starter. Replace with the real legal entity address and phone.
*File: `app/legal/confidentialite/page.tsx:196-198`. Effort: 15 minutes.*

**P0-3. Brand mismatch in privacy policy.** Says "Teens Party Morocco" — either keep TPM as the legal entity (and update the rest of the product to match) or rebrand the policy to Nivy. Pick one and be consistent.
*File: `app/legal/confidentialite/page.tsx:18-21, 188`. Effort: 1 hour.*

### P1 — must-fix before public launch

**P1-1. CNDP data-export API missing.** `data_exports` table exists, no endpoint. Build `POST /api/me/data-export` (creates row, sets `status='pending'`, queues async job) + cron worker that compiles JSON of the user's data and uploads to `defi-proofs` bucket (or new `data-exports` bucket) + returns signed URL. Effort: 1 day.

**P1-2. CNDP data-erasure API missing.** Build `POST /api/me/account/delete` (soft-delete with 30-day grace period, then hard-delete via `delete_user_account` RPC that respects FK cascade and writes an audit row). Effort: 1 day.

**P1-3. `nivy_drivers` PII overshare.** Tighten `nivy_drivers_self_read` policy to expose phone + plate only to the teen/parent of the active ride. Effort: 2 hours.

**P1-4. Curfew enforcement at request time.** Add curfew check inside `request_ride` RPC, not just the daily cron. Effort: 2 hours.

**P1-5. `app/api/admin/run-migration/route.ts` has no auth check.** Add admin role check at line 28. Effort: 15 minutes.

**P1-6. KYC document storage is a single URL.** Migrate `nivy_drivers.kyc_documents_url` to a JSONB or use the `kyc_documents` table with `subject_kind='driver'`. Same for mentors. Effort: half day for schema + admin UI.

**P1-7. `top_up_teen` accepts no PSP provider.** Add `p_psp_provider TEXT, p_psp_reference TEXT` arguments. Required before any real CMI/Stripe/Cash Plus integration. Effort: 1 hour for the RPC + 2 hours for the webhook handler.

**P1-8. Mentor and driver have no frontend shells.** They cannot log in or upload KYC. Either build the shells or commit to "mentors and drivers are admin-onboarded only for v1, no self-service." Effort: 3 days for both shells, or 0 if scoped out.

### P2 — pre-launch polish, can ship without

**P2-1. `partners.halal_certified` flag for restaurant filter.** Today only per-item halal flag exists.

**P2-2. Per-purpose consent ledger.** Cookies/marketing/photo consents are not granularly tracked.

**P2-3. Account-level "kick all sessions" UI.** Backend supports it; no button.

**P2-4. Storage write rate-limit per teen per day.** Defi proofs bucket can be DOS'd.

**P2-5. Profanity filter on `circle_messages`.**

**P2-6. Marketplace listing creation by teen — verify parent approval row.** Whitepaper §29 requires it; not verified in this audit.

**P2-7. Refresh `docs/vision/parental-authorizations.md`** — stale doc.

**P2-8. KYC admin review UI** at `/admin/kyc`.

**P2-9. `admin_approve_driver` and `admin_approve_partner` RPCs** for consistency with `admin_approve_mentor`.

**P2-10. Public mentor list rate-limit** — `/api/teen/mentors` is unauthenticated.

---

## Pre-launch security action plan

Numbered, in execution order. P0 blocks merge to `main`; P1 blocks production deploy; P2 ships post-launch.

1. **Replace `app/api/parent/approvals/route.ts` with a per-action dispatcher** OR delete it and ensure UI uses the typed endpoints. Add a Playwright test that exercises a parent decision end-to-end. (P0-1)
2. **Fix the privacy policy placeholders + brand consistency.** Have legal counsel review. (P0-2, P0-3)
3. **Tighten `nivy_drivers` RLS policy** so phone/plate only flows to the teen of the active ride. Add a regression test. (P1-3)
4. **Add curfew check at request time** in `request_ride` RPC, return `error='curfew_violation'` instead of letting the cron sweep. Keep the cron as a safety net. (P1-4)
5. **Harden `app/api/admin/run-migration/route.ts`** — add admin role check or delete the route entirely (the SQL Editor in Supabase Studio is the right tool). (P1-5)
6. **Build CNDP data-export endpoint** + worker + signed-URL flow. Document under `/legal/confidentialite` how to request. (P1-1)
7. **Build CNDP data-erasure endpoint** + 30-day grace period. Document the same way. (P1-2)
8. **Migrate KYC docs to per-document records** (`kyc_documents.subject_kind='driver'|'mentor'`). Build the admin review UI at `/admin/kyc`. (P1-6, P2-8)
9. **Decide on driver/mentor frontend shells.** Either build minimal shells with KYC upload + status view, or document explicitly that v1 is admin-onboarded only. (P1-8)
10. **Extend `top_up_teen` with PSP provider args** so a CMI webhook can pass through real provider data. (P1-7)
11. **Pre-launch security review of all API routes** that aren't in the audited sample — automated check that each `app/api/**/route.ts` either calls `getUserRole()` / `auth.getUser()` or is in the explicit allow-list of public endpoints (`/api/csrf`, `/api/cron/*`, `/api/webhooks/*`, `/api/health`, `/api/teen/mentors` GET).
12. **Refresh `docs/vision/parental-authorizations.md`** to reflect that `parental_approvals` and `e_signatures` exist; add a "current state, not stale" datestamp banner. (P2-7)

Estimated total effort to AMBER → GREEN: **5 working days** for one engineer, or **2 days** with the right pair (one on schema/RPC fixes, one on CNDP endpoints + UI).

The architecture is sound. The remaining work is plumbing, policy text, and deleting one broken legacy route. Do those twelve items and the launch is defensible to CNDP, BAM, and a teenager's lawyer-uncle.
