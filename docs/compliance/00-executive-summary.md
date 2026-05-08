# Nivy canon compliance — executive summary

Generated 2026-05-08. Source: 11 domain audits + 17 founder decisions.

## TL;DR (5 bullets)

1. **Overall score 38/100 — BLOCKED.** 8 of 11 domains carry at least one P0; 61 P0 findings across the platform.
2. **Top 3 P0s:** (a) parent top-up is 100 % broken end-to-end — the canonical form ships a forbidden payload (`packageId/coins/bonus/price`) and the route ignores all of it, so every legitimate parent click silently mints nothing (econ §1, parent §1); (b) teens validated by their parent get a `profiles` row with no `auth.users` mate — they are locked out forever (auth §1); (c) partners registered via `/api/partners/register` get no `auth.users` row and no magic-link — **partner sans espace de connexion** even after admin approval (auth §2, partner §1+§2).
3. **Money pipeline:** top-up broken on the canonical surface, CMI webhook accepts unsigned payments, 6 canonical refund/payout RPCs missing, ride-cancel and food-refund both crash the DB CHECK constraint by writing `'refunded'` to a status enum that doesn't have it. No real DH can move safely.
4. **Onboarding pipeline:** 3 of 4 account-creation surfaces violate the `auth.users.id == profiles.id` invariant. Teen + partner + ambassador all create orphan profile rows. Marketing wizard runs a parallel `auth.signUp` outside the canonical sign-up surface.
5. **Estimated calendar to LAUNCH READY: ~5 weeks** if the founder rules on the F2/F5/F25 trio in the next 48 h. Week 1 closes money + identity P0s; weeks 2–3 close partner + admin + social P0s; weeks 4–5 land missing surfaces and run W4-A1 4-viewport regression matrix.

## Headline numbers

- **Findings:** P0 = 61, P1 = 107, P2 = 58, P3 = 22 (total **248**).
- **Phantoms:** 6 RPCs called but undefined (`add_user_xp` ×3, `deduct_user_xp`, `get_user_xp`, `apply_partner_offer`); 5 APIs called but missing (`/api/admin/partners/[id]/activate`, `/api/partners/wizard/submit`, `/api/admin/finances/*`, `/api/admin/broadcasts/*` table-side, `/api/admin/kyc`); 7 tables referenced but not defined in tree (`audit_log` canonical, `user_reports`, `qr_nonces`, `parental_limits`, `topup_packages`, `broadcasts`, `support_tickets`).
- **Deprecated surfaces:** 5 `/gamification/*` pages still rendering (canon mandates 308) vs ~18 of 40 deprecated stubs that correctly redirect. `/teen/challenges` re-export still alive. 4 parallel admin moderation routes (canon: single `/admin/moderation`).
- **Founder decisions outstanding:** 51 (18 INDEX + 33 domain-local). Top 3 by impact: **F25** e-money license (B+D recommended) — blocks any real DH top-up; **F2** driver as first-class role — blocks the role-enum CHECK migration and `/driver/**` wiring; **F1** teen self-signup vs parent-invited only — blocks the canonicalisation of `/auth/sign-up?role=teen` and `linking_codes`.

## Domain readiness

| Domain | Score | Top issue (one-liner) | Days to fix P0 |
|---|---|---|---|
| Auth + onboarding (§3) | 22 | Teen + partner orphan profiles, redirect switch lacks mentor/driver | 4 |
| Economy + payments (§4) | 38 | Top-up form contract violates canon; CMI webhook accepts unsigned; 6 RPCs missing | 5 |
| Parent control (§8) | 38 | Top-up payload + idempotency + approvals cascade + CIN public bucket | 4 |
| Partner ecosystem (§9) | 22 | No `activate` endpoint, no `auth.users` provisioning at approve, scanner accepts replayable QR | 5 |
| Social + feed (§6) | 38 | `user_reports` table missing, feed pagination wrong, `window.alert()` still shipped | 3 |
| Gamification (§7) | 38 | 3 phantom `add_user_xp` calls, savings enum missing `withdrawn`, wrong storage bucket | 1 |
| Routing + nav (§5) | 42 | `/gamification` renders content, sidebars + dock point at forbidden / nonexistent URLs | 2 |
| Lifestyle (§10) | 62 | Admin refund writes `'refunded'` status that violates DB CHECK on rides + food | 1 |

(Personalization-ai §11 score 62, design-system §13 score 62, admin §12 score 22 omitted from the 8-row table; full sheet in `02-canon-scoreboard.md`.)

## What's actually working (don't break it)

1. **Canonical money RPC contract** is correct where it exists — `top_up_teen` (5-arg), `complete_ride`, `purchase_reward`, `book_mentor_session` consent gate, `disburse_allowance` all match canon byte-for-byte.
2. **`record_signal` is the single canonical signal sink** — all 6 hot paths (chore / booking / shop / feed / quest / quiz) call it via `recordSignal`/`recordSignalAsync`, and the recommender + friend graph + missions + rollup + tag-normalize crons are all registered in `vercel.json`.
3. **PWA spine + skeletons + view transitions** — `public/sw.js`, `app/manifest.ts`, the 7 role layouts mounting `<SkipToContent>` + `<main id="main-content" tabIndex={-1}>`, the 5 `vt-*` pairs, and the 3 bespoke dashboard skeletons all match the lock.
4. **Cursor-soft-token migration is clean** — `--warning-soft`/`--danger-soft` are now `color-mix()`-derived for both `:root` and `.dark` (W4-A5 contradiction RESOLVED).
5. **165 of the canonical routes per role have `page.tsx` on disk** — the IA scaffold is overwhelmingly there; the failure mode is the deprecation layer + the few missing P0 routes (`/partner/awards`), not the canonical routes themselves.

## What's broken that nobody else can fix (founder ruling required)

1. **F25 — e-money license / EP partner of record.** Without ratifying B+D (M2T or Cash Plus or Wafacash partnership + multi-rail collection), no real DH top-up can ship; manual top-up is a stop-gap and every cent moved is legal exposure.
2. **F2 — driver as first-class `profiles.role`.** Three canon files reference this; nothing about the role enum CHECK constraint, the `/driver/**` zone, or the `app/auth/redirect/page.tsx` driver branch can ship until the founder ratifies. Cross-references F42 (driver UI scope: API-only at V1) — both can coexist.
3. **F5 — auto-topup launch policy.** Canon recommends `PSP_AUTO_TOPUP_ENABLED=false` at launch with Cash Plus enabled at week +2. Without this ruling, the parent topup flag-flip safety is undecided and the headline conversion KPI is blocked.

(Full list of 51 outstanding decisions in `17-founder-decisions-required.md`. F1 + F3 + F14 also high-leverage.)

## Recommended first 7 days (operational)

- **Day 1 — money DB hotfixes.** Ship the migration adding `'refunded'` to `ride_bookings.status` and `food_orders.status` CHECKs, OR rewrite both admin refund handlers to call `cancel_ride` + a coin-clawback helper (closes LIFE-001, LIFE-002 — every admin ride/food refund currently throws). Same day: rename `add_user_xp` → `add_xp_to_user` at the 3 callsites + add `p_source_category`/`p_description` (closes GAME-001/002/003 + ECON-004 — quest XP, parent verification, partner-discount cashback all start recording for real). Fix `app/api/teen/wallet/route.ts` PK column (`user_id` → `teen_id`, 5 lines) so wallet stops returning zeros.
- **Day 2 — top-up unblock + auth bootstrap.** Ship the `topup_packages` migration + change form payload to `{teenId, packageId}` + route looks up `amount_dh` server-side + require PSP confirmation before crediting (closes ECON-001 + PARENT-001). Make CMI webhook HASH check mandatory (`if (!params.HASH) return HASH_MISSING` — 2-line fix in `lib/payments/cmi.ts`, closes ECON-011). Wire `auth.admin.createUser` into `app/api/auth/validate-teen` approve branch (closes AUTH-001 + PARENT-005).
- **Day 3 — partner login wedge.** Build `partner_pending_credentials` table + add password to wizard step 2 + ship `POST /api/admin/partners/[id]/activate` with the atomic 6-step transaction (auth user + profile + partner_staff(role='owner') + magic-link). Closes PARTNER-002 + PARTNER-021 + AUTH-002. **End-state**: a partner can log in to upload KYC while pending. This is the canonical fix for **partner sans espace de connexion**.
- **Day 4 — moderation + audit canonicalisation.** Ship migration renaming `admin_audit_logs` → `audit_log` (singular) with the canonical 11-column shape, rewrite `logAdminAction` to throw on failure (no more silent CNDP gap), build `/admin/moderation` over `moderation_queue` with `?type=` tabs, 308 the 4 deprecated moderation routes. Closes ADMIN-001/002/005 + SOCIAL `user_reports`-table-missing follow-up.
- **Day 5 — frontend fouillis cleanup.** Convert the 5 live `/gamification/*` pages to `permanentRedirect` (closes GAME-006 + ROUTE-001). Re-point the 3 cross-cutting nav components to canonical hrefs and remove the 6 nonexistent mobile dock targets (closes ROUTE-002/003/004). Switch `defi-proofs` storage bucket to `chore-evidence` (closes GAME-008). Replace `window.alert()` in feed list with `sonner` (closes DS finding + social hygiene).
- **Day 6 — privacy + safety gates.** Strip `full_name`/`first_name` from `lib/ai/context-engine.ts` and switch to `pseudo` + `age_bucket` projection (closes AI-001 — every teen chat turn currently leaks PII to OpenAI). Migrate CIN to private `parent-cin` bucket with signed URLs at the F14 TTLs (5 / 15 / 30 min). Wire `mentor_can_dm_teen` window-gate into the DM path or a new `/api/mentor/dm` route (closes LIFE-003 + LIFE-017).
- **Day 7 — invariants + idempotency + scoreboard re-run.** Add `payment_transactions.client_idempotency_key` UNIQUE + `psp_reference` UNIQUE migrations (closes ECON-017). Add per-month parental cap migration `parental_limits` + check inside `top_up_teen`/`spend_teen_coins` (closes ECON-023 + answers F6 with B/C combined). Re-run the 11 domain audits; expected score lift: **38 → ~70/100**, money cluster **33 → ~75**, identity cluster **27 → ~70**. P0 count expected to drop from 61 to ≤ 8.

---

End of summary. Full per-domain detail in `02-canon-scoreboard.md` and the eleven `03-..-13-…-compliance.md` files.
