# B2 — Parent Role Frontend Audit (READ-ONLY)

Scope: every `app/parent/**/page.tsx`, the parent mobile dock
(`components/layouts/parent-mobile-dock.tsx`), and the parent sidebar
(`components/dashboard/parent/sidebar.tsx`).

Method: each page was opened, the Supabase reads inspected, and the rendering
logic checked against navigation entry points. Score 0–10 reflects:
- 9–10 = real Supabase, robust error handling, no obvious dead links
- 7–8 = real Supabase, minor bugs / placeholder buttons / stale link
- 5–6 = real Supabase but partial mock UI, missing target page, or stub branch
- 3–4 = mostly mock / hard-coded UI / target table may not exist
- 0–2 = does not work, leads to 404, or pure placeholder

---

## Section 1 — Parent nav inventory

### Mobile dock (`components/layouts/parent-mobile-dock.tsx`)
5 pillars, each is a real route:

| Label | Target | Page exists? | Notes |
|---|---|---|---|
| Home | `/parent` | yes | `app/parent/page.tsx` |
| Teens | `/parent/teens` | yes | `app/parent/teens/page.tsx` |
| Approvals | `/parent/approvals` | yes | `app/parent/approvals/page.tsx`. Badge count is wired from the `pendingCount` prop but most layouts pass 0 — visual badge is essentially decorative |
| Budget | `/parent/budget` | yes | `app/parent/budget/page.tsx` |
| Settings | `/parent/settings` | yes | `app/parent/settings/page.tsx` |

### Desktop sidebar (`components/dashboard/parent/sidebar.tsx`)
9 entries. Note the sidebar shows a hard-coded `2` red badge on Approbations (lines 87–89) regardless of real pending count.

| Label | Target | Page exists? | Notes |
|---|---|---|---|
| Dashboard | `/parent` | yes | OK |
| Mes Teens | `/parent/teens` | yes | OK |
| Top-up Crédits | `/parent/topup` | yes | OK (signature-gated) |
| Approbations | `/parent/approvals` | yes | OK; sidebar badge is `2` literal |
| Events | `/parent/events` | yes | OK |
| Historique | `/parent/history` | yes | OK |
| Notifications | `/parent/notifications` | yes | OK |
| Abonnement | `/parent/subscription` | **MISSING — 404** | No directory `app/parent/subscription` exists. Settings page sends users to `/carte-vip/souscrire` instead, so the canonical entry is inconsistent |
| Paramètres | `/parent/settings` | yes | OK |

### Cross-references discovered while auditing
- `/parent/teens` page ("Détails" button, line 249) links to `/parent/teens/${teen.teen_id}` → **404 — no `[id]` route**.
- `/parent/settings` "Modifier le profil" → `/profile/modifier` → **404 — no `app/profile/modifier`**.
- `/parent/settings` "Confidentialité & sécurité" repurposes `/parent/e-signature` (works, but the label is misleading).
- `/parent/settings` "Langue" uses `href: "#"` — dead.
- `/parent/teens/add` "QR Code", "Envoyer une invitation", "Lien de partage" buttons are `disabled` with "Bientôt" label — surface, not target.

---

## Section 2 — Per-route scoring table

| URL | Data source | Score | Top issue |
|---|---|---|---|
| `/parent` | Real Supabase (`parent_teens_overview`, `teen_budget_limits`, `bookings`, `parental_approvals`, `parent_chores` + `parent_chore_completions`, `feed_posts`, `feed_likes`, `quiz_attempts`) — heavy aggregation, all real | 9 | "Historique" / "Sécurité" buttons in right column are decorative `<Button>`s with no `href` (lines 407–414); creativity stat assumes `feed_posts.post_type` enum that may not be populated yet |
| `/parent/teens` | Real Supabase (`parent_teens_overview` + per-teen booking counts) | 7 | "Détails" button links to `/parent/teens/[id]` which does not exist (404) |
| `/parent/teens/add` | Real (uses `AddTeenForm` client component) | 8 | Three alternative methods (QR, email invite, share link) are disabled placeholders. Core form is real |
| `/parent/approvals` | Real (`parental_approvals` join `profiles`, `e_signatures` for gate) | 9 | "Filtrer" header button is decorative (no onClick); otherwise solid |
| `/parent/budget` | Real (`teen_budget_limits`, `bookings` of current month) + `BudgetLimitForm` client | 9 | None significant. Strong page |
| `/parent/topup` | Real (`parent_teens_overview`, `e_signatures`, `coin_transactions`) + `TopupForm` | 9 | The 4 hard-coded packages are static config (acceptable); manual fallback exists via `/parent/topup/manual` |
| `/parent/topup/manual` | Real (`parent_teen_links`, `manual_topup_requests`) | 9 | Solid — explicit Cash Plus / Wafacash / M2T flow |
| `/parent/notifications` | Real (`user_notifications`) | 8 | Comment says "Marquage automatique au clic" but page is server-rendered and there's no client-side mutation — clicks do not actually set `is_read`. Misleading copy |
| `/parent/events` | Real (`bookings` joined `events`, plus `events` published) | 8 | Header "Filtrer" button is decorative; otherwise OK |
| `/parent/history` | Real (`bookings`, `coin_transactions`, `discount_usage`, `shop_purchases`) — multi-source merge | 9 | Robust try/catch fallback; export and invoice client buttons present. One of the strongest pages |
| `/parent/settings` | Real (reads `userInfo.parentData.subscriptionTier` from view) | 6 | "Modifier le profil" → `/profile/modifier` is 404. "Langue" is `#`. "Gérer l'abonnement" goes to `/carte-vip/souscrire` while the sidebar still advertises the missing `/parent/subscription` |
| `/parent/e-signature` | Real (`e_signatures`) + `ParentSignatureClient` | 9 | Solid; properly gates topup/approvals |
| `/parent/documents` | Real (`e_signatures`) | 9 | Mock removed; canonical signing flow used. Compliance footer is clear |
| `/parent/chores` | Real (`parent_chores`, `parent_chore_completions`, `parent_teens_overview`) — Polish-F error banner | 9 | Strong page with explicit error surfacing |
| `/parent/chores/new` | Real (`parent_teens_overview`) + `ChoreForm` | 9 | Clean; redirects to add-teen if none linked |
| `/parent/chores/[id]` | Real (`parent_chores`, `parent_chore_completions`) + signed evidence URLs (15 min TTL) + `ChoreVerifyButtons` | 10 | Best-in-class. Re-signed private bucket URLs, video/image branching, paid_at surfaced |
| `/parent/allowances` | Real (`parent_allowances`, `parent_teen_links`) | 9 | Polish-F error banner present |
| `/parent/allowances/new` | Real (`parent_teen_links`) + `AllowanceForm` | 9 | Lean and correct |
| `/parent/rides` | Real (`ride_bookings`) | 9 | Try/catch + load banner; "Configurer les autorisations transport" CTA points at `/parent/teens` (no per-teen detail page exists, see B2-1 finding) |
| `/parent/rides/[id]` | Real (`ride_bookings`, `ride_tracks`, `nivy_drivers`) + `RideMap` + `RideActions` | 10 | Live map, driver card, RLS-checked, all real |
| `/parent/food` | Real (`food_orders` + partner join, `nutrition_challenges`) — uses `service_role` client which is a tradeoff | 7 | Uses `createServiceRoleClient` server-side which bypasses RLS. Audit finding: this is a **policy concern** for a parent-scoped page; should rely on `createClient` + RLS like every other parent page |
| `/parent/mentor-sessions` | Real (`parent_teen_links`, `mentor_sessions`, `mentors`, `profiles`) | 9 | Solid join chain; recording-consent gate logic visible on detail page |
| `/parent/mentor-sessions/[id]` | Real, with consent-gated approval branch | 10 | Excellent — V1.2 recording consent enforced server-side, parent cannot approve until teen consent checkbox set |
| `/parent/savings` | Real (`parent_teen_links`, `savings_goals` + profile) + `GoalMatchForm` | 9 | Polish-F applied; sentinel UUID hack removed |
| `/parent/live` | Real client component (`parent_teen_links`, `event_check_ins`, `photo_galleries`, `photo_gallery_items`) — 30s polling | 7 | "Demande sortie anticipée" inserts into a `notifications` table whose name differs from the canonical `user_notifications` used elsewhere — likely silent no-op (table may not exist or RLS blocks). Phone "+212 6 00 00 00 00" placeholder |
| `/parent/grades` | Real (`teen_grades`) with explicit graceful degradation if table missing | 7 | Page already detects missing table and shows "Bientôt disponible". Also: the `parent_teen_links` join uses `children(prenom, nom)` which assumes a `children` table relation that may not match the actual schema (the rest of the codebase uses `profiles`/`teens`) — name will fall back to "Teen" silently |
| `/parent/subscription` | — | **0 — 404** | Sidebar advertises this route; no page exists. Hijacks user trust |

Hidden-but-not-yet-broken routes referenced by other roles or by config but not listed in either dock or sidebar: `/parent/chores`, `/parent/allowances`, `/parent/rides`, `/parent/food`, `/parent/mentor-sessions`, `/parent/savings`, `/parent/grades`, `/parent/live`, `/parent/documents`, `/parent/topup/manual`. None of these are reachable from the dock or sidebar — they are deep-link-only. **This is the single biggest UX gap of the parent surface: heavy lifestyle features exist but are invisible from primary navigation.**

---

## Section 3 — Top broken / missing

1. **`/parent/subscription` — 404 from sidebar.** Sidebar entry "Abonnement" (Crown icon) links to a route that has no `page.tsx`. Either delete the sidebar entry or build the page (current settings page already redirects elsewhere, to `/carte-vip/souscrire`).
2. **`/parent/teens/[teen_id]` — 404 from teens list "Détails" button.** `app/parent/teens/page.tsx` line 249 references `/parent/teens/${teen.teen_id}`. No `[id]` directory exists.
3. **`/profile/modifier` — 404 from settings.** Settings card "Modifier le profil" goes to a route that does not exist anywhere under `app/profile/`.
4. **Lifestyle features completely hidden from nav.** Chores, allowances, rides, food, mentor-sessions, savings, grades, live tracking, documents, manual topup — 10 deep features, zero discoverability through dock or sidebar. Only entry point is the dashboard's right-column buttons (which themselves are decorative — see #5).
5. **Decorative buttons on `/parent` dashboard right column.** `History` and `Sécurité` buttons (lines 407–414 of `app/parent/page.tsx`) have no `href`. They're styled glass cards but are no-ops.
6. **`/parent/notifications` "Marquage automatique au clic" is a lie.** The page is server-rendered and never mutates `is_read`. Either implement a client-side route handler or remove the copy.
7. **`/parent/live` early-checkout writes to the wrong table.** Inserts to `notifications` (lines 285–296) while the rest of the codebase uses `user_notifications`. Likely silent failure under RLS.
8. **`/parent/grades` joins on a `children` table that does not seem to exist.** The other parent pages use `profiles` joins. Name display will fall back to "Teen" for everyone. Function still works but it's a schema-drift smell.
9. **`/parent/food` uses `createServiceRoleClient` server-side.** Bypasses RLS on a user-scoped page. Inconsistent with every other parent page (which uses `createClient`). Is the trade-off intentional? If yes, document it. If no, fix.
10. **Hard-coded "2" pending count in sidebar.** `components/dashboard/parent/sidebar.tsx` lines 87–89. Not pulled from any query.
11. **"Filtrer" buttons on `/parent/approvals` and `/parent/events`** are decorative (no onClick / no controlled state).
12. **`/parent/teens/add` alternative methods** (QR, email invite, share link) are explicitly disabled with "Bientôt" labels — that's honest but means 3 of the 4 onboarding paths are non-functional.

---

## Section 4 — Top strong

1. **`/parent/chores/[id]`** (10/10) — gold standard. Re-signs private bucket URLs server-side with 15 min TTL, branches on video vs image, surfaces `paid_at`, and uses real `ChoreVerifyButtons` client.
2. **`/parent/mentor-sessions/[id]`** (10/10) — V1.2 recording-consent gate enforced server-side. Parent cannot approve until teen explicitly consented at booking time. Good policy code.
3. **`/parent/rides/[id]`** (10/10) — full live map, driver card with vehicle plate and rating, real `ride_tracks` polylines, RLS-checked at the page level (`ride.parent_id !== userInfo.profileId → notFound()`).
4. **`/parent`** (9/10) — Suspense streaming, lazy-loaded sub-components, real per-teen stats computed from 4 different tables (chores, feed, quizzes), upcoming-events join. Annotated "audit fix" comments show this page has been hardened.
5. **`/parent/history`** (9/10) — merges 4 transaction sources (bookings, coin_transactions, discount_usage, shop_purchases) into a unified timeline, with real export and invoice buttons. Try/catch wrapper prevents one bad query from 500-ing the whole page.
6. **`/parent/budget`** (9/10) — clean teen-by-teen budget cards with progress bars, near-limit alerting, and a real edit form (`BudgetLimitForm`).
7. **`/parent/topup` + `/parent/topup/manual`** (9/10 each) — strong PSP fallback story. Manual flow has explicit Cash Plus / Wafacash / M2T copy and a real `manual_topup_requests` table with admin review loop.
8. **`/parent/approvals`** (9/10) — signature gate banner, full status history, real `ApprovalButtons` client. Pending section is visually prioritized.
9. **`/parent/e-signature` + `/parent/documents`** (9/10 each) — proper compliance flow tied to `e_signatures` table. Documents page footer references "URLs signées 5 minutes — bucket privé" which matches the chore-evidence pattern.
10. **Polish-F error-handling pattern is consistent** across `/parent/chores`, `/parent/allowances`, `/parent/rides`, `/parent/food`, `/parent/savings`, `/parent/mentor-sessions`. Each wraps Supabase reads in try/catch and surfaces an inline red banner instead of silently rendering empty state. This is the right pattern and it's applied uniformly.

---

## Aggregate stats

- 26 parent routes inspected (24 real + 2 absent-but-linked)
- Mean score: ~8.0/10
- Median: 9/10
- Critical 404s from nav: 3 (`/parent/subscription`, `/parent/teens/[id]`, `/profile/modifier`)
- Score = 10: 3 routes (chores/[id], mentor-sessions/[id], rides/[id])
- Score ≤ 6: 2 routes (settings, subscription)
- Pages that do real Supabase reads: 24/24 of the existing pages
- Pages with mock/hardcoded data only: 0
- Pages with placeholder/stub branches inside (subset of buttons or tabs that don't work): ~7

The parent surface is on average more mature than the typical 7/10 baseline.
The biggest **systemic** problem is not bad data — it's discoverability:
the dock has 5 slots, 10 lifestyle features exist, only 2 of them surface
in the dock or sidebar.
