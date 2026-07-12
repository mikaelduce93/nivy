# Nivy canon — index

Source of truth for product decisions. Specialists own one domain each. Code MUST conform; PRs that violate a `.locked.md` rule are rejected.

Generated 2026-05-08 from `docs/vision/**` (46 files) + `docs/vision/audit-frontend-reality/**` (26 files).

## The 12 domain locks

| File | Owns | Critical lock |
|---|---|---|
| `routing.locked.md` | URL map, deprecations, merge targets | 17 redirect stubs, 35 missing routes, 11 merge clusters |
| `auth-onboarding.locked.md` | Sign-up entry points per role, role enum, redirect logic, `is_onboarded` policy | One canonical sign-up URL per role; `auth.users` row creation is non-negotiable |
| `roles-permissions.locked.md` | `profiles.role` enum, admin sub-roles, RLS, middleware | 7-value role enum; `checkAdminPermission()` only |
| `economy-payments.locked.md` | XP / coins / DH currencies, shop backend, PSPs | 1 DH = 100 coins (top-up); XP↔coin conversion FORBIDDEN; canonical shop = `purchase_reward` |
| `partner-ecosystem.locked.md` | 15 archetypes, prospect → registered pipeline, KYC, payouts | `auth.users` provisioned at admin-activation, never at wizard submit |
| `gamification.locked.md` | Quests, chores, friend-defis, savings, levels, tiers, streak | `/teen/quests` is THE quest hub; `add_user_xp` is phantom (use `add_xp_to_user`) |
| `lifestyle.locked.md` | Rides, food, mentors, internships, pathways | One mentor session-status enum; ride-curfew TZ = `Africa/Casablanca` 22:00–05:00 |
| `social-feed.locked.md` | Feed, comments, friends, messages, circles, marketplace | `direct_messages` (not `teen_messages`); cursor pagination 20/page; `window.alert()` BANNED |
| `parent-control.locked.md` | Top-up, allowance, chores, approvals, e-signature, teens management | Top-up payload = `{teenId, amount_dh}` only; approvals fan out via RPC, not direct status flips |
| `admin-moderation.locked.md` | Sub-roles, queues, audit log, refunds, broadcasts, KYC, support | Single `/admin/moderation` inbox; `audit_log` (singular) canonical |
| `personalization-ai.locked.md` | Signals, recommender, friend graph, AvatarCoach, AI models | `record_signal` is THE signal sink; AvatarCoach name = **Niv** (founder decision #356, F54 resolved); model IDs are env-driven |
| `design-system-mobile.locked.md` | Tokens, primitives, motion, a11y, mobile, view-transitions, toasts | sonner only; raw `framer-motion` import FORBIDDEN; min touch 44px |

## Cross-cutting locks (cited from ≥2 domain specs — non-negotiable)

1. **Role enum is `parent | teen | partner | mentor | driver | ambassador | admin`**. Add a DB CHECK constraint. (auth-onboarding + roles-permissions + partner-ecosystem)
2. **`auth.users` row is created exactly once, by `supabase.auth.signUp` or admin-activation. No exceptions.** Profile rows without an auth user are forbidden. (auth-onboarding + partner-ecosystem)
3. **No money write outside a SECURITY DEFINER RPC.** `service_role` only on money tables. (economy-payments + parent-control + roles-permissions)
4. **No raw `framer-motion` import. Use `Motion` proxy from `@/components/ui/motion`.** (design-system-mobile + gamification)
5. **`user_notifications` is the canonical notifications table. `notifications` and `activity_logs` are deprecated.** (parent-control + social-feed + admin-moderation)
6. **All KYC / CIN / chore-evidence / payout-proof storage is private. Signed URLs only.** (parent-control + partner-ecosystem + admin-moderation)
7. **`audit_log` (singular) is the canonical audit table.** Not `admin_audit_logs`. **DECIDED 2026-05-08.** Resolves the social-feed §7 invariant 4 contradiction — `admin_audit_logs` is deprecated; canonical is `audit_log`. (admin-moderation + roles-permissions)
8. **`record_signal` is the only signal-write entry point.** (personalization-ai + gamification)
9. **AvatarCoach name = `Niv`. One canonical prompt. 5-turn cap.** (personalization-ai)
10. **No `<img>`, no inline cubic-bezier, no bare `focus:` (must be `focus-visible:`), no `userScalable: false`, no hardcoded `cyan/emerald/sky/rose/amber/fuchsia/blue/gray/indigo/teal-(50-950)` outside the allowlist.** (design-system-mobile)

## Cross-cutting deprecations (sunset before V2)

| What | Why | Replacement |
|---|---|---|
| `/gamification/*` zone | duplicates `/teen/*` | redirect 308 to `/teen/<canonical>` |
| Radix toast wrapper | parallel system | sonner |
| `claude-3-sonnet-20240229` literal | model deprecated | `CLAUDE_MODEL_ID` env (default `claude-sonnet-4-6`) |
| Three parallel shop backends (`shop_items`, `token_rewards`, plus the `purchase_reward` canon) | currency confusion | `shop_rewards` + `purchase_reward` only; 410 the others |
| `partner_discounts` table | consolidated | view aliasing `partner_offers` |
| `defi-proofs` storage bucket | naming drift | `chore-evidence` |
| 4 AI-companion components (`elite-ai-companion`, `AgentSheet`, `ai-companion`, legacy avatar-coach) | parallel prototypes | `AvatarCoach` v2 only |
| Legacy `friendships(user_id, friend_id)` shape | drift | `friendships(user1_id, user2_id, status, ...)` |
| `gen-z-*` color tokens | non-semantic | `brand`/`accent`/`success`/`info`/`warning`/`danger` + `-soft` via `color-mix(in oklch, ...)` |

## Unresolved founder decisions (one ruling per item, with recommendation)

These contradict between docs. Pick ONE per row. Order by impact.

| # | Question | Domains | Recommendation |
|---|---|---|---|
| F1 | Self-signup teen vs parent-invited only at launch | auth-onboarding | **Parent-invited only.** Defer self-signup to V1.4. **DECIDED 2026-05-08.** |
| F2 | Driver as first-class `profiles.role` or `partner_type='driver'` | partner + roles | **First-class role.** Driver workspace `/driver/**` exists in spec, treat as peer to mentor. **DECIDED 2026-05-08.** |
| F3 | Influencer = ambassador or distinct enum value | partner + roles | **Fold into ambassador.** Drop `/devenir-influenceur` candidature, keep `/devenir-ambassadeur`. **DECIDED 2026-05-08.** Resolves the `partner-ecosystem.locked.md` §8.3 contradiction — that file's "DISTINCT" lock is overruled. |
| F4 | Coach + teacher = `partner_staff.role` or distinct partner_type | partner + gamification | **`partner_staff.role`.** Both extend an existing `partner` (school/club). |
| F5 | Auto-topup packages launch policy | economy + parent-control | **Manual only at launch.** `PSP_AUTO_TOPUP_ENABLED=false`. Re-enable Cash Plus week +2. **DECIDED 2026-05-08.** |
| F6 | Top-up cap per parent per month | economy + parent-control | **500 DH/month default**, raised by admin on request. |
| F7 | Single moderation inbox vs per-type queues | admin + social | **Single inbox.** `/admin/moderation` with tab filters; not separate routes. |
| F8 | `support` admin sub-role: keep, build, or remove | admin + roles | **Keep + build `/admin/support`.** Build the tickets surface in V1.4. |
| F9 | Two-parent co-sign default | parent + economy | **Single-parent default.** Opt-in `parents_cosign_required` flag per family. |
| F10 | Curfew per-parent vs global | parent + lifestyle | **Per-parent override** on top of 22:00 global default. |
| F11 | `/teen/defis-physiques` keep or merge into `/teen/quests?tab=body` | gamification + routing | **Merge.** 308 redirect; kill `/teen/challenges` re-export. |
| F12 | `circles` vs `crews` naming | social + routing | **`/teen/circles` canonical.** Whitepaper §17 mention of crews → unified under circles tab. |
| F13 | Marketplace allowed for teens or parent-only | social + economy | **Teen-allowed with caps**: 5 active listings, 1000 DH/teen/month, school + venue_partner meet-methods only. |
| F14 | CIN signed-URL TTL | parent + admin + partner | **5 min parent / 15 min admin / 30 min hard cap** on `parent-cin` private bucket. |
| F15 | Recommender cold-start strategy | personalization | **Tag-default → popularity fallback.** Friend-of-friend deferred until cohort ≥ 100. |
| F16 | gen-z palette deprecation timeline | design-system | **V1.5 hard cutover.** V1.4 = warn-only ESLint, no new gen-z usage. |
| F17 | PPR (Partial Prerendering) enable | design-system | **V1.5.** Not V1.4. |
| F18 | Storybook adoption | design-system | **No.** Playwright matrix (W4-A1) is higher leverage at this stage. |

## Read order for new contributors

> ⚠️ **`docs/vision/*` is HISTORICAL (snapshot 2026-05-07) and non-decisional.**
> This canon (`docs/canon/*.locked.md`, generated 2026-05-08) superseded it and
> resolved its contradictions. Do not cite `docs/vision/*` for a product
> decision; each vision file now carries a HISTORIQUE banner pointing back here.

1. `INDEX.locked.md` (this file)
2. `routing.locked.md` — what URLs exist and what they mean
3. `auth-onboarding.locked.md` — how a user reaches your code
4. `roles-permissions.locked.md` — what they can see and do
5. The domain spec relevant to the PR

## Maintenance

- Every PR that adds/removes a route, table, RPC, or API endpoint MUST update the relevant `.locked.md` in the same commit.
- Founder decisions (F1–F18) are answered by replacing the recommendation row with the ruling and stamping the date.
- New contradictions found in vision/* docs are added to the owning domain's UNRESOLVED section, never silently picked.
