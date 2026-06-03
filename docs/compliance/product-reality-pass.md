# Product Reality Pass — Nivy (2026-05-09)

> **Audit only.** No code modified. Source-of-truth: route files,
> compliance closure logs (Waves 1A → 6J), seed scripts, canon docs.
>
> Goal: separate **what's wired in code** from **what actually works
> end-to-end for a logged-in user**. Compliance scores ≠ product
> reality. A route can be canon-compliant and still produce an empty
> screen if its data dependencies aren't seeded.
>
> **Verdict format**:
> - 🟢 works end-to-end with seeded data
> - 🟡 wired but degrades to empty/partial state without specific seed rows
> - 🔴 broken or unreachable for a real user
> - ⚫ disabled by design (410 / permanentRedirect — see §5)

---

## 0. The single most important finding

The seeders (`scripts/seed-test-accounts.ts` + `scripts/seed-all-test-accounts.ts`) only create `auth.users` + `profiles` rows. They do **not** create:

- `parent_teen_links` rows → **parent.test sees zero teens, zero approvals, zero topup target**
- `teens` rows → **teen.amine has no `teen_id`** → `/teen` dashboard renders with `teenId=''`, all teen-keyed queries return empty
- `partners` row → **partner.* accounts can't pass `/partner` dashboard's `from("partners").single()` check** → first-run `<PartnerAwaitingApproval>` banner forever
- `ambassadors` / `mentors` / `nivy_drivers` rows → those roles loop in `/{role}/onboarding/awaiting-approval` indefinitely
- `is_onboarded=true` on any seeded profile → first login = onboarding wizard

**Until those rows exist, every "the route works" claim from compliance scoring is academic** — the user sees an empty shell.

`scripts/seed-e2e-data.ts` partially closes this: it seeds 6 quizzes, 1 reward category, 2 shop_rewards, 1 pending booking for teen.amine, and 1 pending partner row. **Run order required for a real test:**

```
npx tsx scripts/seed-all-test-accounts.ts   # auth users + profiles
npx tsx scripts/seed-e2e-data.ts            # content
# THEN — hand-fill missing pivots (see §6 P0 list)
```

---

## 1. Parcours ADO (teen.amine@teenclub.ma)

### Login + onboarding
| Step | Verdict | Notes |
|---|---|---|
| `/auth/login` form renders | 🟢 | Wave 5A smoke: 200 |
| Login as teen → `/auth/redirect` | 🟢 | role-router truthy (Wave 6B) |
| `is_onboarded=false` → `/onboarding/teen` (stub page) | 🟢 | Wave 1A stub renders a "Salut Teen / Démarrer" card pointing at `/onboarding/interests` |
| `/onboarding/interests` chip selector | 🟡 | needs `interest_taxonomy` rows in DB; route catches errors and renders empty selector with banner — won't crash but won't progress |
| `/onboarding/goals` → `/onboarding/learning-style` → `/onboarding/complete` | 🟡 | each step server-action shells; complete page flips `is_onboarded=true` (Wave 6D fixed parent bypass; teen path was already correct) |
| Onboarding loop possible? | **No** | `/onboarding/complete` always sets `is_onboarded=true` before redirecting (Wave 6D guard test in place) |

### Dashboard `/teen`
| Surface | Verdict | Reality |
|---|---|---|
| Dashboard renders | 🟡 | `getTeenDashboardData()` runs even with `teenId=''` (line 21 fallback). XP=0, level=1, streak=0, nextReward=null |
| AvatarCoach (KAI) | 🟢 | mounted, AI surface works (Wave 4 / V1.1) |
| TwinCurrencyGauge | 🟡 | reads `user_coins.balance` + `savings_goals.current_saved_coins`. Without a `teens` row + initial `user_coins` row, shows 0/0 |
| BentoGrid + lazy components | 🟢 | layout intact (Wave 5) |

### Quiz / quests
| Surface | Verdict | Reality |
|---|---|---|
| `/teen/quiz` daily quiz | 🟡 | requires ≥1 `educational_quizzes` row with `is_active=true` (seed-e2e provides 6); deterministic by UTC day index |
| `/teen/quests` hub | 🟢 | renders catalogue from `quests` table |
| Quest start → `/api/teen/quests/start` | 🟢 | Wave 6C: returns 500 cleanly if `quest_progress` upsert fails (no fake) |
| Quest complete → `/api/teen/quests/complete` | 🟢 | Wave 6J: idempotent (replay returns `xpEarned: 0, idempotent_replay: true`); canonical `add_xp_to_user` only fires on first completion |
| `/teen/quests/friend-defis` + `/new` | 🟢 | Wave 2B closure (CANON-GAME-015); decline/accept routed correctly |
| `/teen/defis-physiques` action UI | 🟢 | Wave 2B; `validated=false` until admin moderates via `/admin/proofs` |

### Wallet / shop / tokens
| Surface | Verdict | Reality |
|---|---|---|
| `/teen/wallet` reads `user_coins` | 🟢 | canonical |
| `/teen/wallet?tab=shop` purchases via `purchase_reward` RPC | 🟡 | needs `shop_rewards` rows (seed-e2e provides 2) |
| `/api/teen/shop` (legacy) | ⚫ **410** since Wave 1B |
| `/api/teen/tokens` POST (legacy) | ⚫ **410** since Wave 6C |
| `/api/teen/tokens` GET (wallet read) | 🟡 | reads canonical `get_user_wallet` RPC + `user_coins`. Honest 0 balance without seed |
| `components/tokens/token-rewards.tsx` redeem button | 🔴 | clicks call POST → 410 → toast.error. Surface still ships in UI; no canonical replacement wired. **Should be hidden or rerouted to `/teen/wallet?tab=shop`.** |
| `components/tokens/token-wallet.tsx` claim_daily / transfer | 🔴 | same — POST → 410. UI buttons need to disappear or surface honest "indisponible" |

### XP / streak / leaderboard
| Surface | Verdict | Reality |
|---|---|---|
| XP grants via `add_xp_to_user` | 🟢 | Wave 1B + 6J: only canonical writer (sweep-tested) |
| `/teen/streak` | 🟡 | reads real `updateLoginStreak`/`getLifetimeStats`/activity; falls back to 0/empty; milestones are deterministic config |
| `/teen/leaderboard` | 🟡 | Wave 6J: reads canonical `user_xp` + `profiles`. Empty without seeded `user_xp` rows; honest `status: 'unavailable'` on error |
| Level-up / multiplier triggers | unverified | depends on RPC implementation in `add_xp_to_user`; Wave 6J shifted circles + grades to canonical RPC so triggers fire |

### Notifications / activity
| Surface | Verdict | Reality |
|---|---|---|
| `/teen/activity` | 🟢 | reads canonical `user_notifications` |
| `/notifications` (bare path) | ⚫ Wave 5A: redirect to `/auth/redirect` |
| Push permission prompt | 🟡 | UI shipped (`notification-center.tsx`); actual push subscription wiring not verified in this audit |

---

## 2. Parcours PARENT (parent.test@teenclub.ma)

### Login + onboarding
| Step | Verdict | Notes |
|---|---|---|
| `/auth/login` → `/auth/redirect` → `/parent` | 🟢 | Wave 6B router truthy |
| First-login: `is_onboarded=false` → `/onboarding/parent` stub | 🟡 | Wave 1A stub: a "Bienvenue parent / construction Wave 1B" placeholder. Wave 6D added `/api/parent/onboarding/complete` POST — but **no UI button on the stub calls it**. Parent must hit `/onboarding/complete` manually OR an admin must flip `is_onboarded=true`. **Real product gap.** |

### Dashboard `/parent`
| Surface | Verdict | Reality |
|---|---|---|
| Dashboard renders | 🟢 | reads `parent_teens_overview` filtered by `parent_id` (Wave C.6) |
| Teen list empty without `parent_teen_links` | 🟡 | renders honest `<EmptyState>` "Aucun teen lié" |
| `<ControlCenter>` + budget limits + approvals | 🟡 | all real reads, all empty without seed pivots |

### Children flows
| Surface | Verdict | Reality |
|---|---|---|
| `/parent/teens` list | 🟢 | Wave 5A; cards link to `/parent/teens/[id]` |
| `/parent/teens/[id]` detail | 🟢 | Wave 6D — minimal honest detail page, scoped, returns 404 on miss |
| `/parent/teens/add` | 🟡 | wired to `/api/parent/teens/create` (Wave 1A.5: creates auth.users + profiles + teens + parent_teen_links). Email collection required. **Confirms working when DB tables seeded.** |

### Approvals / chores / allowances / topup
| Surface | Verdict | Reality |
|---|---|---|
| `/parent/approvals` | 🟢 | Wave 1C dispatcher RPC. 13 integration tests pass |
| `/parent/chores` create + verify | 🟢 | Wave 2.1 canonical; multi-teen fan-out via `chore_targets` |
| `/parent/allowances` pause/resume | 🟢 | Wave 4B; uses confirmToast |
| `/parent/topup` manual | 🟢 | Wave 1B: idempotency key, e-sig gate, parent-teen link verify, server-derived amount, `top_up_teen` RPC. **Founder F5: manual-only.** |
| `/parent/topup/manual` (cash drop-off form) | 🟡 | UI for the manual rail; same backing API as above |
| Auto-topup (PSP webhook) | ⚫ env-gated by `PSP_AUTO_TOPUP_ENABLED=false` per F5 |

### Notifications
| Surface | Verdict | Reality |
|---|---|---|
| `/parent/notifications` | 🟢 | Wave 6D: real mark-read + mark-all-read; no fake auto-mark |
| `/api/notifications/{mark-read,mark-all-read}` (legacy) | ⚫ 410 since Wave 6D (callers migrated) |

### Other
| Surface | Verdict | Reality |
|---|---|---|
| `/parent/grades` | 🟢 | Wave 6J: XP grant on validated grade now uses `add_xp_to_user` RPC |
| `/parent/mentor-sessions` | 🟢 | Wave 6D: parent-role gate added; RLS still primary |
| `/parent/savings` (match config) | 🟢 | Wave 1C savings/match RPC works |
| `/parent/rides` | 🟢 | Wave 3.1 ride approval RPCs |
| `/parent/food` budget | 🟡 | needs `food_orders` rows to surface anything |
| `/parent/e-signature` | 🟢 | Wave 1B fix: CIN now stored in private `parent-cin` bucket |

---

## 3. Parcours PARTNER (e.g. retail.partner@teenclub.ma)

### DB conditions required for the dashboard to surface anything
Per `app/partner/page.tsx:30-34` (`getPartnerStats`):

```ts
const { data: partner } = await supabase
  .from("partners")
  .select("id, company_name, partner_type, status, created_at")
  .eq("email", partnerEmail)
  .single()
if (!partner) return null
```

| Required row | Status in seed |
|---|---|
| `auth.users` | ✅ created |
| `profiles { role: 'partner' }` | ✅ |
| `partners { email, company_name, partner_type, status }` | ❌ **NOT seeded** |
| `partner_staff { partner_id, user_id, role: 'owner', is_active: true }` | ❌ |
| `is_onboarded=true` | ❌ |

**Result**: out of the box, `partner.* accounts log in → /auth/redirect → /partner/onboarding/awaiting-approval (no `partners` row → status≠'active') → stuck.** Even if we manually inject a `partners.status='pending'` row, login lands on the awaiting-approval banner, not the dashboard.

### Partner zone surfaces
| Surface | Verdict | Reality |
|---|---|---|
| `/partner` dashboard | 🔴 (no seed) → 🟡 (with `partners.status='active'` row) |
| `/partner/dashboard` | ⚫ Wave 3B.3 redirect → `/partner` (canonical hub) |
| `/partner/onboarding/awaiting-approval` | 🟢 stub page renders banner |
| `/partner/onboarding/kyc` (mentor archetype) | 🟢 |
| `/partner/scanner` v2 QR | 🟢 Wave 3A; HMAC + nonce + expiry |
| `/partner/restaurant/menu` | 🟢 menu CRUD works (canonical `partnerOwns`) |
| `/partner/restaurant/menu/items/[id]` PATCH/DELETE | 🟢 ownership-checked |
| `/partner/restaurant/orders` accept/reject | 🟢 Wave 4C: defence-in-depth `food_orders.partner_id` check before RPC |
| `/partner/offers` | 🟢 |
| `/partner/events` | 🟢 wired |
| `/partner/stats` | 🟢 |
| `/partner/settings` | 🟢 Wave 3B.3 |
| `/partner/payouts` + monthly cron | 🟢 Wave D.11 cron |
| `/partner/transactions` | 🟢 |
| `/partner/invoices` | 🟢 |
| `/partner/talent` | 🟡 partial (Wave 3A.5) |

### Partner type taxonomy (canonical, post-Wave 3B.1.1)
The `partners.partner_type` CHECK constraint (mig 101) accepts: `retail`, `venue`, `club`, `education`, `restaurant`. **`driver` and `mentor` are NOT partner_types** — those are first-class `profiles.role` values (driver pending F2 ratification; mentor canonical via `mentors` table).

So today, a real partner is one of those 5 commercial archetypes. The 4 seeded partner emails (`retail`/`venue`/`club`/`education.partner`) match canonical types — but the seeder still doesn't create the `partners` row that the dashboard needs.

### Admin → partner activation flow
- Admin reviews KYC + flips `partners.status='active'` via `/api/admin/partners/[id]/activate` (Wave 6B fix: also sets `profiles.is_onboarded=true` on the partner — without that fix, partner stayed gated forever)
- Partner gets invite email → magic link → lands on `/partner` ✅

---

## 4. Parcours ADMIN (admin.test@teenclub.ma + moderator.test + support.test)

### Login + access matrix
| Subrole | `admin_roles.role` | Inbox `/admin/moderation` | Decision dispatch | SQL console | Refunds |
|---|---|---|---|---|---|
| `admin` | ✅ seeded | 🟢 | 🟢 | 🟢 (env-gated) | 🟢 |
| `moderator` | ✅ seeded | 🟢 | 🟢 | 🔴 | 🔴 |
| `support` | ✅ seeded | 🔴 (no `content.view`) | 🔴 | 🔴 | 🔴 |

Permission matrix: `lib/auth/admin-permissions.ts` (Wave 1C/4A).

### Admin surfaces
| Surface | Verdict | Reality |
|---|---|---|
| `/admin` dashboard | 🟢 |
| `/admin/moderation` inbox | 🟢 Wave 4A canonical inbox; needs `moderation_queue` rows or pending-status content rows to show anything |
| `/admin/moderation/[id]/decision` (7 decisions) | 🟢 Wave 4A + 6H — `warn`/`suspend` honestly return 409 `unsupported_action` (no fake action on user) |
| `/admin/moderation/[id]/approve` + `/reject` (binary) | 🟢 Wave 6H — hardened to canonical helpers |
| `/admin/proofs` | 🟢 calls the `/approve` and `/reject` endpoints above |
| `/admin/refunds` | 🟢 Wave 1B: ride + food refund RPCs |
| `/admin/partners` | 🟢 Wave 3A — KYC review + activate |
| `/admin/ambassadeurs` approve/reject | 🟢 Wave 6B: also flips `is_onboarded` |
| `/admin/mentors` approve/reject | 🟢 Wave 6B: same |
| `/admin/drivers` approve/reject | 🟢 Wave 6B: same |
| `/admin/evenements` | 🟢 |
| `/admin/anniversaires` | 🟢 |
| `/admin/check-in` | 🟢 |
| `/admin/utilisateurs` | 🟢 |
| `/admin/analytics` | 🟢 |
| `/admin/logs` | 🟢 reads `audit_log` |
| `/admin/clubs/*` | ⚫ Wave 6E: redirect to `/admin` (legacy `clubs` table dead). **Sidebar link removed.** |
| `/admin/scripts-sql` | 🟡 Wave 1C: gated by `system.sql` permission AND `ENABLE_ADMIN_SQL_CONSOLE` env flag. Off by default. |
| `/admin/topups` admin manual confirm | 🟢 |
| `/admin/internships` | 🟢 |
| `/admin/marketplace` | 🟢 Wave 4A adapter + Wave 4C status gate |
| `/admin/content` | 🟢 |
| `/admin/permissions` | 🟢 |
| `/admin/tag-normalize` | 🟢 |
| `/admin/gamification-setup` | 🟢 |
| `/admin/creator-moderation` | 🟢 |
| `/admin/reservations` | 🟢 |
| `/admin/users/[id]/export` | 🟢 |

**Product impact of `/admin/clubs` removal**: today, no admin can manage `sport_clubs` from the UI. Adding sport_clubs to the catalogue requires a direct DB insert. **Real gap if the founder wants to onboard real sport clubs to the closed beta.**

---

## 5. Inventaire des features désactivées / redirigées

### A) `permanentRedirect` stubs (12 routes)

| Route | Wave | Reason | User impact | Recommendation |
|---|---|---|---|---|
| `/clubs/[slug]` | 6E | Detail page depended on dead `clubs` + `club_enrollments` + `club_sessions` tables. `sport_clubs` has no `slug`. | Bookmarks → `/clubs` | **Keep redirect**; build real detail when sport_clubs spec ratified |
| `/admin/clubs/page` | 6E | Admin CRUD on dead `clubs` | Admin loses club management UI | **Restore as `sport_clubs` admin** when founder wants live sport-club intake |
| `/admin/clubs/creer` | 6E | Same | Same | Same |
| `/admin/clubs/[id]/supprimer` | 6E | Same | Same | Same |
| `/autorisations` + `/ajouter` | 5A | Canon §2: replaced by `/parent/approvals` | Old links → `/parent/approvals` | **Keep redirect.** No restore needed — `/parent/approvals` is the canonical surface |
| `/notifications` + `/preferences` | 5A | Canon §5: bare path forbidden, role-namespaced now | Old links → `/auth/redirect` (router) | **Keep redirect** |
| `/gamification` (root + 6 children) | 2B/5A | Canon §2: zone sunset; merged into `/teen/*` | Old links → `/teen` etc. | **Keep redirect** |
| `/teen/challenges` | 2B | Alias for `/teen/quests?tab=body` | None | Keep |
| `/devenir-influenceur` (+ candidature) | F3 fold | Influencer collapsed into ambassador | Old links → `/devenir-ambassadeur` | Keep |
| `/partner/dashboard` | 3B.3 | Duplicate of `/partner` | None | Keep |

### B) `410` deprecated endpoints (4 routes)

| Endpoint | Wave | Reason | User impact | Recommendation |
|---|---|---|---|---|
| `/api/teen/shop` GET+POST | 1B | Wrote deprecated `shop_items` + phantom `deduct_user_xp` RPC | Zero callers in app code | **Keep 410** |
| `/api/teen/tokens` POST | 6C | 6 phantom RPCs (`spend_tokens`, `transfer_tokens`, etc.) — every action faked success | `components/tokens/token-rewards.tsx` + `token-wallet.tsx` STILL render redeem/transfer/claim_daily buttons that hit this 410. **UI surface needs hiding or canonical rewiring.** | **P0 follow-up**: hide buttons OR migrate UI to `purchase_reward` RPC |
| `/api/notifications/mark-read` + `/mark-all-read` | 6D | Wrote deprecated `notifications` table; zero callers | None | **Keep 410** |

### C) Disabled-but-not-redirected (relies on env flag)

| Surface | Flag | Default | Effect when off |
|---|---|---|---|
| Cash Plus PSP webhook (auto-topup) | `PSP_AUTO_TOPUP_ENABLED` | `false` (F5) | Logs only; never credits coins |
| `/admin/scripts-sql` | `ENABLE_ADMIN_SQL_CONSOLE` | unset | Page returns forbidden |
| Card payments via `/api/payments/process` | `CARD_GATEWAY_AVAILABLE` (in-code const) | `false` | Returns 503 (honest) |
| CMI flow | `cmi_payment` feature flag | varies | Initiate redirects honestly with `cmi_not_available` |

### D) Founder decisions blocking reality

| F-id | Question | Status | Blocks |
|---|---|---|---|
| F1 | Teen self-signup at launch? | OPEN | `/auth/sign-up?role=teen` only via parent invite; no public teen signup route |
| F2 | Driver as first-class `profiles.role` or `partner_type='driver'`? | OPEN (canon recommends A — first-class) | `/driver/**` zone exists per route map but full schema not built; mentor.test can't onboard as driver |
| F4 | Coach + teacher as `partner_staff.role` or own `partner_type`? | OPEN | `/devenir-coach`, `/devenir-teacher` candidature pages can't be wired |
| F25 | E-money license partnership (M2T / Cash Plus / Wafacash)? | OPEN | Real DH top-up flow blocked; Cash Plus webhook stays env-gated |

---

## 6. Comptes de test (état réel attendu)

Universal password: `Test123!` (per `docs/TEST_ACCOUNTS.md` + seed scripts).

### Out-of-the-box (after `seed-all-test-accounts.ts` only)

| Email | Role | `is_onboarded` | DB pivots present | Reality |
|---|---|---|---|---|
| `parent.test@teenclub.ma` | `parent` | ❌ false | none | Lands on `/onboarding/parent` stub, **stuck** (no UI button to complete) |
| `parent.silver@teenclub.ma` | `parent` | ❌ | none | Same |
| `parent.gold@teenclub.ma` | `parent` | ❌ | none | Same |
| `parent.platinum@teenclub.ma` | `parent` | ❌ | none | Same |
| `teen.amine@teenclub.ma` | `teen` | ❌ | no `teens` row | `/onboarding/teen` stub → `/onboarding/interests` (works if `interest_taxonomy` seeded) |
| `teen.sara@teenclub.ma` | `teen` | ❌ | no `teens` row | Same |
| `ambassador.test@teenclub.ma` | `ambassador` | ❌ | no `ambassadors` row | Loops on `/ambassador/onboarding/awaiting-approval` |
| `admin.test@teenclub.ma` | `admin` | n/a (gate bypassed) | `admin_roles.role='admin'` ✅ | **Works** — full `/admin` access |
| `moderator.test@teenclub.ma` | `admin` | n/a | `admin_roles.role='moderator'` ✅ | **Works** — `/admin/moderation` only |
| `support.test@teenclub.ma` | `admin` | n/a | `admin_roles.role='support'` ✅ | **Works** — read-only surfaces |
| `retail.partner@teenclub.ma` | `partner` | ❌ | **no `partners` row** | `/partner` returns null → awaiting-approval banner |
| `venue.partner@teenclub.ma` | `partner` | ❌ | none | Same |
| `club.partner@teenclub.ma` | `partner` | ❌ | none | Same |
| `education.partner@teenclub.ma` | `partner` | ❌ | none | Same |
| `mentor.test@teenclub.ma` | `mentor` | ❌ | no `mentors` row | Loops on `/mentor/onboarding/kyc` |

### What's missing per role to make the test actually exercise the product

| Role | Required pivot | Where to add |
|---|---|---|
| parent | `is_onboarded=true` OR a working complete-button on `/onboarding/parent` | DB poke OR P0 #2 below |
| teen | `teens { id, parent_id, level, title, coins, ... }` row + matching `user_xp` + `user_coins` rows | DB seed |
| parent ↔ teen | `parent_teen_links { parent_id, teen_id, status: 'active' }` | DB seed |
| partner | `partners { email, company_name, partner_type, status: 'active' }` + `partner_staff { partner_id, user_id, role: 'owner', is_active: true }` + `is_onboarded=true` | DB seed (or admin activate flow once a `partners` row exists in `pending`) |
| ambassador | `ambassadors { profile_id, status: 'active' }` + `is_onboarded=true` | DB seed |
| mentor | `mentors { user_id, kyc_status: 'approved' }` + `is_onboarded=true` | DB seed |

---

## 7. Tableau "Feature prévue / visible / fonctionne / cassée"

| Feature | Prévu | Visible (UI) | Fonctionne end-to-end | Cause si cassée | Priorité |
|---|---|---|---|---|---|
| Teen login + onboarding wizard | ✅ | ✅ | 🟡 marche si `interest_taxonomy` seedé | onboarding requires content row | P1 |
| Teen dashboard real data | ✅ | ✅ | 🟡 vide sans `teens` + `user_xp` + `user_coins` rows | seed gap | **P0** |
| Teen quiz daily | ✅ | ✅ | 🟢 si `educational_quizzes.is_active=true` | seed-e2e provides | OK |
| Teen quests / friend defis | ✅ | ✅ | 🟢 | — | OK |
| Teen wallet (canonical coins) | ✅ | ✅ | 🟡 | seed gap | P1 |
| Teen shop (canonical purchase_reward) | ✅ | ✅ | 🟡 needs `shop_rewards` rows | seed-e2e provides 2 | OK |
| Token redeem/transfer/claim_daily UI | ❌ deprecated | ✅ buttons still ship | 🔴 → 410 toast.error | UI not removed after Wave 6C | **P0** |
| Teen XP grants | ✅ | ✅ | 🟢 (canonical) | — | OK |
| Teen leaderboard | ✅ | ✅ | 🟡 honest empty / `unavailable` fallback | — | OK |
| Teen streak | ✅ | ✅ | 🟡 honest 0 fallback | — | OK |
| Parent login + dashboard | ✅ | ✅ | 🟡 empty without `parent_teen_links` | seed gap | **P0** |
| Parent /onboarding/parent stub | ✅ stub | ✅ | 🔴 no complete button | UI gap (Wave 6D added API but not UI) | **P0** |
| Parent teens list + detail | ✅ | ✅ | 🟢 (Wave 6D detail page) | — | OK |
| Parent approvals dispatcher | ✅ | ✅ | 🟢 | — | OK |
| Parent topup (manual) | ✅ | ✅ | 🟢 | — | OK |
| Parent topup (auto / PSP) | ❌ disabled | ❌ | ⚫ env-gated F5 | by design | OK |
| Parent grades XP grant | ✅ | ✅ | 🟢 (Wave 6J canonical RPC) | — | OK |
| Parent notifications mark-read | ✅ | ✅ | 🟢 (Wave 6D real action) | — | OK |
| Parent mentor sessions approval | ✅ | ✅ | 🟢 | — | OK |
| Partner dashboard | ✅ | ✅ | 🔴 needs `partners` row | seed gap | **P0** |
| Partner restaurant orders accept/reject | ✅ | ✅ | 🟢 (Wave 4C ownership defence) | — | OK |
| Partner menu items CRUD | ✅ | ✅ | 🟢 | — | OK |
| Partner offers | ✅ | ✅ | 🟢 | — | OK |
| Partner scanner v2 QR | ✅ | ✅ | 🟢 (Wave 3A HMAC) | — | OK |
| Partner KYC + admin activate | ✅ | ✅ | 🟢 (Wave 6B is_onboarded fix) | — | OK |
| Admin moderation inbox | ✅ | ✅ | 🟢 needs `moderation_queue` rows | DB or report-trigger pre-fill | P1 |
| Admin moderation 7 decisions | ✅ | ✅ | 🟢 (warn/suspend honestly 409) | — | OK |
| Admin clubs CRUD | ❌ disabled (was broken) | ❌ (sidebar link removed Wave 6E) | ⚫ redirect to `/admin` | sport_clubs admin = new feature | P2 (founder spec needed) |
| Admin SQL console | 🟡 env-gated | 🟡 sidebar entry shown if env flag on | ⚫ off by default | by design | OK |
| `/clubs/[slug]` detail | ❌ disabled | ❌ | ⚫ redirect to `/clubs` | needs sport_clubs spec | P2 |
| Driver workspace `/driver/**` | 🟡 routed | 🟡 KYC stub | ⚫ blocked by F2 | founder ratification needed | P2 |
| Mentor sessions booking | ✅ | ✅ | 🟢 if mentor seed row + KYC approved | — | P1 (seed gap) |
| Ambassador commissions / boutique | ✅ | ✅ | 🟢 if ambassador seed row + active | — | P1 (seed gap) |
| Closed-beta smoke (`npm run smoke`) | ✅ | n/a | 🟢 39/39 | — | OK |
| CMI payment HASH gate | ✅ | n/a | 🟢 (Wave 6F closed unsigned-callback) | — | OK |
| D.1 secret rotation | ❌ deferred | n/a | 🔴 not done | by design (intentional defer) | **P0 before public launch** |

---

## 8. P0 list — à corriger avant que tu testes la beta

These are the **product-reality blockers**. Fix in this order:

### P0 #1 — Seed pivots so test accounts can actually use the app
Hand-rolled SQL OR extend `seed-all-test-accounts.ts` to also create:

```sql
-- 1. Make every seeded account "onboarded" so they pass the middleware gate
UPDATE profiles SET is_onboarded = true
WHERE email IN (
  'parent.test@teenclub.ma','parent.silver@teenclub.ma',
  'parent.gold@teenclub.ma','parent.platinum@teenclub.ma',
  'teen.amine@teenclub.ma','teen.sara@teenclub.ma',
  'ambassador.test@teenclub.ma','mentor.test@teenclub.ma',
  'retail.partner@teenclub.ma','venue.partner@teenclub.ma',
  'club.partner@teenclub.ma','education.partner@teenclub.ma'
);

-- 2. teens rows for each teen profile
INSERT INTO teens (id, parent_id, level, title, title_icon, coins)
SELECT p.id, NULL, 1, 'Débutant', '🌱', 0
FROM profiles p WHERE p.role = 'teen'
ON CONFLICT DO NOTHING;

-- 3. parent_teen_links: link parent.test → teen.amine, parent.silver → teen.sara
-- (do the same for the other parents as needed)
INSERT INTO parent_teen_links (parent_id, teen_id, status)
SELECT (SELECT id FROM profiles WHERE email = 'parent.test@teenclub.ma'),
       (SELECT id FROM profiles WHERE email = 'teen.amine@teenclub.ma'),
       'active'
ON CONFLICT DO NOTHING;

-- 4. user_coins + user_xp rows for each teen
INSERT INTO user_coins (teen_id, balance, premium_tokens, seasonal_tokens)
SELECT id, 0, 0, 0 FROM profiles WHERE role = 'teen' ON CONFLICT DO NOTHING;
INSERT INTO user_xp (user_id, total_xp, level)
SELECT id, 0, 1 FROM profiles WHERE role = 'teen' ON CONFLICT DO NOTHING;

-- 5. partners rows for each partner profile (status='active')
INSERT INTO partners (email, company_name, partner_type, status)
VALUES
  ('retail.partner@teenclub.ma',    'TechStore Morocco',     'retail',     'active'),
  ('venue.partner@teenclub.ma',     'Le Rooftop Teen',       'venue',      'active'),
  ('club.partner@teenclub.ma',      'Teen Fitness Academy',  'club',       'active'),
  ('education.partner@teenclub.ma', 'Code Academy Junior',   'education',  'active')
ON CONFLICT (email) DO UPDATE SET status = 'active';

-- 6. partner_staff: link the partner profile as owner
INSERT INTO partner_staff (partner_id, user_id, role, is_active, accepted_at)
SELECT p.id, prof.id, 'owner', true, NOW()
FROM partners p
JOIN profiles prof ON prof.email = p.email
ON CONFLICT (partner_id, user_id) DO NOTHING;

-- 7. ambassadors row for ambassador.test (status='active')
INSERT INTO ambassadors (profile_id, status, commission_rate)
SELECT id, 'active', 0.10 FROM profiles WHERE email = 'ambassador.test@teenclub.ma'
ON CONFLICT (profile_id) DO UPDATE SET status = 'active';

-- 8. mentors row for mentor.test (kyc_status='approved')
INSERT INTO mentors (user_id, kyc_status, is_active)
SELECT id, 'approved', true FROM profiles WHERE email = 'mentor.test@teenclub.ma'
ON CONFLICT (user_id) DO UPDATE SET kyc_status = 'approved';
```

After applying: every seeded account can reach its real dashboard.

### P0 #2 — `/onboarding/parent` stub has no complete button
Wave 6D shipped `/api/parent/onboarding/complete` POST but the stub at `app/onboarding/parent/page.tsx` (Wave 1A) still says "construction Wave 1B" with no submit. Add a "Continuer" button that calls the API + redirects to `/parent`. Or short-circuit: have the stub call the API server-side on first GET if the parent reaches it (auto-complete).

### P0 #3 — Token UI buttons hit 410 silently
`components/tokens/token-rewards.tsx` (lines 681-689) and `components/tokens/token-wallet.tsx` (lines 95-100, 525-535) still POST to `/api/teen/tokens` (deprecated 6C). Buttons surface a toast.error to the teen. Either:
- Hide the buttons (rip the redeem/transfer/claim_daily UI from these two components)
- Migrate them to canonical `purchase_reward` RPC via `/teen/wallet?tab=shop`

### P0 #4 — D.1 secret rotation
Mandatory before any exposure beyond local dev:
- Reset `SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard)
- Rotate `OPENAI_API_KEY`
- Push fresh `CRON_SECRET` to Vercel env
- Redeploy + run `npm run smoke` against the new env

(See `docs/compliance/release-blockers.md` for the runbook.)

---

## 9. Aucun score gonflé — disclaimer

This audit deliberately **decouples compliance scores from product reality**. Examples:

- Compliance says "lifestyle 86" but the `/clubs/[slug]` detail page is a redirect stub (no real detail surface) and `/admin/clubs` is gone. The 86 reflects truthful code (no deprecated table writes) **not** feature completeness.
- Compliance says "auth-onboarding 85" but parent onboarding stub has no working UI completion path (P0 #2). The 85 reflects middleware + role-router + admin-approval truth, not the parent-side wizard.
- Compliance says "gamification 88" but tokens UI still surfaces dead buttons (P0 #3). The 88 reflects no fake XP / canonical RPCs / quest idempotency, not UI cleanup.

The compliance score answers "is the code honest about what it does?". This Reality Pass answers "can a real user actually use it?".

---

## 10. Verdict

**Closed-beta technical readiness**: code is in good shape (all gates green, no fake success, idempotent money/XP, honest empty states). **But the test accounts as seeded today don't exercise the real product.**

Before you spend time logging in:
1. Fix P0 #1 — DB pivot seeding (single SQL block above).
2. Fix P0 #2 — parent onboarding completion path (one UI change).
3. Fix P0 #3 — hide or migrate dead token UI buttons (one component edit).

After those three, the test accounts will reach real dashboards and you can actually feel what the product does.

**No code changed in this pass. No commit. Awaiting your call on which P0 to tackle first.**

---

## 11. Reality Fix P0 — applied (2026-05-09)

> Founder GO: "GO Product Reality Fix P0. Pas de nouvelle wave conformité. Objectif : rendre les comptes beta réellement utilisables." Hard rules: no score increase, no Wave 7, no commit before tests, stop if any major flow still loops.

### What was repaired

**P0.1 — Beta pivot seeder** (`scripts/seed-beta-pivots.ts`, new)
- Idempotent script run **after** `seed-all-test-accounts.ts`. For every test account it creates the missing pivots so dashboards have data to read:
  - flips `profiles.is_onboarded = true` on the 11 beta accounts (4 parents, 2 teens, 1 ambassador, 1 mentor, 4 partners)
  - inserts a `teens` row keyed on `profiles.id` (Wave 1A invariant) for each teen profile
  - inserts initial `user_xp` (level 1, 0 XP) + `user_coins` (0 balance) per teen — so wallet/leaderboard reads return 0 instead of null
  - inserts `parent_teen_links` (`status='active'`) for the two seeded parent↔teen pairs (`parent.test↔teen.amine`, `parent.silver↔teen.sara`); also mirrors `teens.parent_id` for legacy reads
  - inserts a `partners` row (status='active', approved_at=now) per partner email + a `partner_staff` `role='owner'` link so `partner_id` resolves through `partner_staff.user_id`
  - inserts an `ambassadors` row (status='active', commission_rate=0.10) for `ambassador.test`
  - inserts a `mentors` row (status='active', kyc_status='approved') for `mentor.test`
- Defensive: per-row try/catch with a single-line outcome log (`ok` / `noop` / `skip` / `fail`) so a missing column or RLS denial is loud, not silent. Refuses to run against `teensparty.ma` without `SEED_ALLOW_PRODUCTION=1`. Beta fixtures only — no fake prod data.

**P0.2 — Parent onboarding stub escape** (`app/onboarding/parent/page.tsx` + new `complete-button.tsx`)
- The Wave 1A stub had no UI to call `/api/parent/onboarding/complete`, so middleware would loop a fresh parent back to the stub forever. Added a client-component **"Continuer vers mon espace parent"** button that POSTs the canonical endpoint, surfaces a sonner toast on success/error, and forwards to `/parent`. The page also short-circuits with `redirect('/parent')` if `is_onboarded` is already true.

**P0.3 — Dead token POSTs neutralized** (`components/tokens/token-wallet.tsx`, `components/tokens/token-rewards.tsx`)
- Three call sites used to POST to `/api/teen/tokens` (410 since Wave 6C). All three now surface an honest sonner toast pointing at the canonical rail instead of swallowing the click or hitting the dead endpoint:
  - `token-wallet.tsx:handleClaimDaily` → "Le bonus quotidien se réclame depuis ton tableau de bord teen (section Streak)."
  - `token-wallet.tsx:handleTransfer` → sets in-card result with "Le transfert de tokens entre comptes n'est pas activé pour la beta." (transfer between users was never wired to a canonical RPC)
  - `token-rewards.tsx:handleRedeem` → "Les échanges de récompenses sont sur ton portefeuille teen — section Boutique."
- The visualization (balances, history, daily card, catalogue browse) still reads through the live GET and stays intact. These components are imported only via `components/tokens/index.ts` and aren't currently mounted in any page — the fix is preventative for future re-mount.

**P0.4 — Connected smoke runbook** (`docs/compliance/beta-smoke-runbook.md`, new)
- Replaces the unconnected `npm run smoke` (anonymous GET sweep) with a logged-in walk-through. For each of the 4 primary roles (teen / parent / partner / admin) it lists a login → dashboard → 3 actions sequence with explicit pass criteria ("real values from seeded user_xp/user_coins", "no loop back to /onboarding/teen", "scanner POST returns deterministic HMAC error not 500", etc.). Includes a reporting template to append the per-role outcome under §Reality findings.

**P0.5 — This document** updated with the §11 you're reading.

### What's still broken (intentionally not in P0)

- **Live partner scanner E2E** — needs a teen-side QR tokenize fixture before the manual smoke can fully exercise `/api/partner/scanner/redeem`. The scanner UI loads and produces deterministic errors on bad input, but a true end-to-end "teen tokenizes → partner scans → redemption persists" loop is not a P0 (no broken loop, just incomplete fixture).
- **Token wallet transfer between teens** — never had a canonical RPC. P0.3 just makes the surface honest; building `transfer_tokens_to_teen` is a feature decision, not a Reality Fix.
- **Daily bonus claim** — the legacy "claim_daily" UI in `token-wallet.tsx` is now toast-only. Daily bonuses are awarded through the streak/quest rail; the standalone claim button stays disabled until/unless the founder ratifies a separate daily-claim RPC.
- **D.1 secret rotation** — still pending; required before any non-local exposure (unchanged from §8 P0 #4).

### Exact accounts ready for the runbook

Universal beta password: `Test123!`

| Role | Email | Pivot rows seeded |
|---|---|---|
| Teen (linked) | `teen.amine@teenclub.ma` | profiles+teens+user_xp+user_coins+parent_teen_link |
| Teen (linked) | `teen.sara@teenclub.ma`  | profiles+teens+user_xp+user_coins+parent_teen_link |
| Parent (linked) | `parent.test@teenclub.ma` | profiles+is_onboarded+parent_teen_link |
| Parent (linked) | `parent.silver@teenclub.ma` | profiles+is_onboarded+parent_teen_link |
| Parent (unlinked, "no teens" state) | `parent.gold@teenclub.ma`, `parent.platinum@teenclub.ma` | profiles+is_onboarded only |
| Partner | `retail.partner@teenclub.ma` (retail) | profiles+partners(active)+partner_staff(owner) |
| Partner | `venue.partner@teenclub.ma` (venue) | same |
| Partner | `club.partner@teenclub.ma` (club) | same |
| Partner | `education.partner@teenclub.ma` (education) | same |
| Ambassador | `ambassador.test@teenclub.ma` | profiles+ambassadors(active) |
| Mentor | `mentor.test@teenclub.ma` | profiles+mentors(active, kyc=approved) |
| Admin | `admin.test@teenclub.ma` (super_admin) | profiles+admin_roles (already wired by `seed-all-test-accounts.ts`) |

### Routes touched / verified in this pass

| Route | What changed | Status |
|---|---|---|
| `/onboarding/parent` | Added "Continuer" button + auto-skip if already onboarded | ✅ wired |
| `/api/parent/onboarding/complete` | (no change — already existed since Wave 6D, now has a UI caller) | ✅ wired |
| `components/tokens/token-wallet.tsx` POST sites | Replaced fetches with toast pointers | ✅ neutralized |
| `components/tokens/token-rewards.tsx` POST site | Replaced fetch with toast + close dialog | ✅ neutralized |

### Real result of the Reality Fix gates

Run on 2026-05-09 against the working tree after all P0 edits:

| Gate | Result |
|---|---|
| `npm run typecheck` | ✅ clean |
| `npm run lint:canon -- --enforce` | ✅ 6 improvements carried (200 baseline), 0 net-new |
| `npm run test:run` | ✅ **66 files / 636 tests** — same count as Wave 6J close (no regressions, no new tests added — Reality Fix is product wiring, not a new compliance domain) |

### Connected smoke run

Not yet executed against a live local Supabase — requires the founder to (a) run the seed scripts in order against their dev instance, (b) walk the runbook in `beta-smoke-runbook.md`, (c) append the per-role outcome table here. The P0 work is **the prerequisite** that makes that smoke run actually meaningful; the run itself is the founder's call (chosen accounts, chosen partner type, etc.).

### Score philosophy — unchanged

This Reality Fix moves **no compliance score**. The 95 / 97 from Wave 6J still reflects code honesty, and the P0 work doesn't change that — it changes what a real human sees when they log in. Per founder note ("le score 95 voulait dire : le code est devenu plus honnête et plus sécurisé. Mais il ne voulait pas dire : les comptes de beta sont prêts"), Reality Fix P0 closes the second gap without inflating the first.

### Discipline notes

- **No commit yet** — per the founder's hard rule "Pas de commit avant tests". Tests are green; awaiting founder validation before staging.
- **No new feature added** — every change is either deletion of a dead path (P0.3) or restoration of an already-existing canonical path (P0.1 pivots write to existing tables; P0.2 wires the existing endpoint).
- **No Wave 7** — this isn't a compliance wave, it's a product-reality wiring pass.
- **No major loop encountered** during the work; the parent stub loop was the one major loop and it's the explicit fix in P0.2.

### Reality Fix P0.1 — schema-adaptation pass (2026-05-09 second run)

The first run of `seed-beta-pivots.ts` against the live `nivy` Supabase project surfaced 5 concrete schema mismatches between the script and the real DB. All 5 are fixed in the current tree; the seeder now ends with **`ok=24 noop=8 skip=0 fail=0`** against the live DB.

**Stale DB trigger (the most damaging finding)**
- `on_profile_xp_change` was an `AFTER UPDATE ON profiles` trigger installed by migration `007_crews_system.sql`. Its function body still reads `OLD.total_xp` / `NEW.total_xp` — but `profiles.total_xp` was dropped when XP moved to `user_xp` in Wave 1A/6C. Result: **every** UPDATE on profiles fails with `record "old" has no field "total_xp"`. Even flipping `is_onboarded` is impossible.
- Fix: migration **`103_realityfix_stale_profile_xp_trigger.sql`** drops the broken trigger from `profiles`, rewrites the function to read `NEW.teen_id` (the canonical FK to `crew_members.user_id` under the Wave 1A identity invariant), and recreates the trigger on `user_xp` where `total_xp` actually lives. Applied to the live DB via MCP `apply_migration`. Verified post-migration with `pg_get_triggerdef`.

**Column / constraint corrections in the seeder**
| Mismatch | Truth | Fix |
|---|---|---|
| `partners.approved_at` | does not exist | dropped from insert |
| `ambassadors.commission_rate` | column is `commission_pct` | renamed |
| `ambassadors.profile_id` | column is `user_id` (UNIQUE) | renamed; `onConflict: "user_id"` |
| `ambassadors.code` (NOT NULL UNIQUE) | required, no default | derive stable code from email: `BETA-AMBASSADOR-TEST` |
| `ambassadors.track` check | enum is `{cash, xp_only}` | seed `track: "cash"` |
| `partner_staff.accepted_at` | column is `joined_at` | renamed |
| `parent_teen_links` UNIQUE(parent_id, teen_id) | only PK(id) exists | switched to select-then-insert/update; do not use `onConflict` here |

**Documented follow-up (not done in P0)** — `parent_teen_links` should have a `UNIQUE(parent_id, teen_id, status)` (or partial unique on active links) to prevent duplicate active links. That's a canonical schema decision, not a Reality Fix concern; logged here for the next compliance window.

**Tooling — npm scripts added** so the seeders are discoverable:
```
npm run seed:test-accounts   # accounts (auth + profiles + admin_roles)
npm run seed:e2e-data        # content fixtures
npm run seed:beta-pivots     # the new pivot seeder
npm run seed:beta            # all three in canonical order
```

**Real result of the second run (live DB)**

| Gate | Result |
|---|---|
| `npm run typecheck` | ✅ clean |
| `npm run lint:canon -- --enforce` | ✅ 6 improvements carried, 0 net-new |
| `npm run test:run` | ✅ 66 files / 636 tests |
| `npm run seed:beta-pivots` | ✅ **fail=0** (24 ok, 8 idempotent noop) |

**Still pending (founder action)** — connected manual smoke per the runbook in `docs/compliance/beta-smoke-runbook.md`. The seeders are now reliable, so the runbook is genuinely executable.

**Still no commit** — per "Pas de commit avant tests" + "Stop si un parcours connecté majeur boucle encore". Tests are green and the seed is fail=0, but the connected manual smoke is the founder's call to run.

---

## Reality Pass — V7 « Fiabilité données & connexion » (2026-06-03)

Déclencheur : bug de connexion teen `Error fetching user crew: {}` (compte Amine).
Cause racine = **drift de schéma** : la table `profiles` live n'est plus que l'identité
auth `{id,email,full_name,avatar_url,role,created_at,updated_at,is_onboarded,is_deletion_pending}` ;
le code/RPC lisait encore `profiles.pseudo`/`.level`/`.xp` (42703) et une table fantôme
`user_profiles` (42P01). Audit complet : `docs/audits/audit-2026-06-03/AUDIT-CONNEXION-AMINE.md`.
Milestone GitHub V7 (#243), issues #244-#256.

**Sources réelles** : `pseudo→teens.pseudo` (fallback `profiles.full_name`), `level→user_xp.current_level`,
`total_xp→user_xp.total_xp`, `coins→user_coins.balance` (PK `teen_id`), `parent_id→teens.parent_id`/`parent_teen_links`,
`referral_code→RPC get_or_create_referral_code`, `linking_code→linking_codes.code`.
`username` et `xp` n'existent nulle part.

**Migrations appliquées en live (via Supabase MCP `apply_migration`) + smoke avant/après :**

| Migration | Objet | Vérif live |
|---|---|---|
| 146 | `get_user_crew` (pseudo→teens, level→user_xp) + SECURITY DEFINER self-only + REVOKE PUBLIC/anon | Amine `has_crew:true`, 2 membres, level 9 ; anon `EXECUTE`=false ; autre uid `has_crew:false` |
| 147 | DROP policy `teens` `"Users can view all teens"` (qual=true public) | anon voit **0** teen (avant 5) ; teen authentifié voit la sienne ; `get_advisors` sans alerte PII résiduelle |
| 148 | `get_user_challenges`/`end_game_session`/`get_game_leaderboard` (JOIN teens) | plus de 42703/42P01 ; leaderboard 3 périodes → jsonb |
| 149 | crédits XP `complete_seasonal_challenge`/`open_advent_day`/`resolve_prediction`/`submit_game_score` (→ `user_xp.total_xp`) | 0 réf `user_profiles` ; `user_xp` incrémente |
| 150 | RLS `crews_member_read` tautologie `crew_id=id` → `is_active_crew_member` | membre voit son crew privé (avant : 0) |
| 151 | capture vue `teen_full_profile` (était live-only) | vue → Amine level 9 |

**Hygiène** : les realityfix `103/116/117/118` (appliquées live, jusque-là untracked) sont
committées dans V7 ; vérifiées live (helpers RLS ×5 présents, trigger périmé `on_profile_xp_change`
supprimé, `get_crew_leaderboard` = 2 lignes).

**Code (drift TS/TSX)** : 15 fichiers réalignés (liaison parent↔teen, api/circles, contexte coach IA,
économie coins→`add_coins_to_user`, surfaces XP/pseudo). Observabilité : helper
`lib/observability/log-db-error.ts` (fin du log `{}`) + garde CI `scripts/drift-lint.mjs`
(`no-ghost-profiles-column` + `no-empty-catch`, baseline 13 dettes, net-new bloqué).

**Gates** : `npm run typecheck` ✅ clean (0 erreur, baseline → post-V7) ; `drift-lint --enforce` ✅
(0 net-new) + test négatif rouge confirmé.

**Drift résiduel documenté (suivi V8 #257 / cleanup)** : embeds `profiles.pseudo` restants hors
chemin connexion (`crews/activity.ts` getCrewActivity, `challenges/actions.ts`, `special-challenges/actions.ts`
— 13 sites baselinés par drift-lint) ; `export-pdf` filtres `bookings.parent_id`/`coin_transactions.parent_id`
(vraies colonnes `user_id`/`teen_id`) ; pipeline modération circles (tables `moderation_alerts/logs`,
colonnes `deleted_by` inexistantes). Sécurité résiduelle → milestone V8 (#257).
