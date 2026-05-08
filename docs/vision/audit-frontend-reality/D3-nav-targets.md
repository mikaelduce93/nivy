# D3 — Nav menus and dock targets validation

Audit date: 2026-05-08
Mode: read-only
Scope: every nav component’s `href` is checked against `app/**/page.tsx` and against the data the page actually requests (with focus on the seeded teen test account, where applicable).

Risk legend
- **OK** — page exists and is either pure render or fully empty-safe (catches errors, defaults to 0/empty arrays).
- **MISSING** — no `page.tsx` at the target path → Next.js 404.
- **AUTH-WALL** — page exists but redirects out for the wrong role (expected behaviour for a teen on a teen-only page; flagged when a teen-area dock points at it).
- **DATA-RISK** — page exists, but a server fetch can throw or rely on a row that may not exist for a freshly seeded teen (`.single()`, unguarded RPC, `eq("teen_id", X)` with no `maybeSingle`, etc.). Risk levels: low / medium / high.

---

## 1. `components/layouts/mobile-dock.tsx` — MobileDock (variant by zone)

The component switches between five nav arrays based on the URL prefix.

### 1.1 Teen variant (active when pathname starts with `/teen`)

| Label | Href | Target file | Risk |
|---|---|---|---|
| Home | `/teen` | `app/teen/page.tsx` | **OK** — every server call is wrapped in `.catch()` and falls back to defaults; `getTeenDashboardData()` returns `null` on error; coins query degrades gracefully. |
| Quests | `/teen/quests` | `app/teen/quests/page.tsx` | **OK** — `.maybeSingle()` on user_coins, all parallel calls have `.catch(() => …)`. |
| Social | `/teen/social` | `app/teen/social/page.tsx` | **OK** — pure shell; client component does the work. Falls back to `"Friend"` if no full_name. |
| Wallet | `/teen/wallet` | `app/teen/wallet/page.tsx` | DATA-RISK low — `getRewards`/`getCategories` are not `.catch()`ed. If either RPC throws (table not seeded), the route 500s. Coins fetch is try/catch. |
| Profil | `/teen/profile` | `app/teen/profile/page.tsx` | DATA-RISK **medium** — `getTeenProfile` does `.single()` on `profiles`; if RLS hides the row or the user is mid-onboarding the query errors and the page renders with `profile: {}`. The `getAchievementStats`/`getUserRank`/`getLifetimeStats` calls are NOT wrapped in `.catch()` — any one throwing crashes the page. |

### 1.2 Partner variant

| Label | Href | Target file | Risk |
|---|---|---|---|
| Dashboard | `/partner` | `app/partner/page.tsx` | OK |
| Offres | `/partner/offers` | `app/partner/offers/page.tsx` | OK |
| Events | `/partner/events` | `app/partner/events/page.tsx` | OK |
| Stats | `/partner/stats` | `app/partner/stats/page.tsx` | OK |
| Profil | `/partner/profile` | **MISSING** | **404** |

### 1.3 Admin variant

| Label | Href | Target file | Risk |
|---|---|---|---|
| Dashboard | `/admin` | `app/admin/page.tsx` | OK |
| Events | `/admin/events` | **MISSING** (real path is `/admin/evenements`) | **404** |
| Users | `/admin/users` | **MISSING** (real path is `/admin/utilisateurs`) | **404** |
| Analytics | `/admin/analytics` | `app/admin/analytics/page.tsx` | OK |
| Settings | `/admin/settings` | **MISSING** | **404** |

### 1.4 Ambassador variant

| Label | Href | Target file | Risk |
|---|---|---|---|
| Dashboard | `/ambassador` | `app/ambassador/page.tsx` | OK |
| Referrals | `/ambassador/referrals` | `app/ambassador/referrals/page.tsx` | OK |
| Boutique | `/ambassador/shop` | **MISSING** (real path is `/ambassador/boutique`) | **404** |
| Retraits | `/ambassador/withdrawals` | `app/ambassador/withdrawals/page.tsx` | OK |
| Profil | `/ambassador/profile` | **MISSING** | **404** |

### 1.5 Public/default variant

| Label | Href | Target file | Risk |
|---|---|---|---|
| Agenda | `/agenda` | `app/agenda/page.tsx` | OK |
| Anniv | `/anniversaires` | `app/anniversaires/page.tsx` | OK |
| Clubs | `/clubs` | `app/clubs/page.tsx` | OK |
| XP | `/gamification` | `app/gamification/page.tsx` | DATA-RISK low — auth-walled (redirects unauth to login); `.maybeSingle()` on `user_xp`, but uses `eq("teen_id", user.id)` with `user.id` = auth uid, NOT the teen row id. For a parent/ambassador/admin auth user, this returns null which `maybeSingle` handles fine. |
| Espace | `/espace` | `app/espace/page.tsx` | OK — pure role-based redirect. |

---

## 2. `components/layouts/parent-mobile-dock.tsx` — ParentMobileDock

| Label | Href | Target file | Risk |
|---|---|---|---|
| Home | `/parent` | `app/parent/page.tsx` | OK |
| Teens | `/parent/teens` | `app/parent/teens/page.tsx` | OK |
| Approvals | `/parent/approvals` | `app/parent/approvals/page.tsx` | OK |
| Budget | `/parent/budget` | `app/parent/budget/page.tsx` | OK |
| Settings | `/parent/settings` | `app/parent/settings/page.tsx` | OK |

All 5 parent dock items resolve. Cleanest dock in the codebase.

---

## 3. `components/dashboard/sidebar.tsx` — Generic DashboardSidebar (legacy)

Used by the old `/dashboard` shell. Most targets are FR-localised legacy pages that no longer exist in `app/`.

| Label | Href | Target file | Risk |
|---|---|---|---|
| Dashboard | `/dashboard` | **MISSING** | **404** |
| Mes Réservations | `/mes-reservations` | **MISSING** | **404** |
| Mes Clubs | `/mes-clubs` | **MISSING** | **404** |
| Événements | `/agenda` | `app/agenda/page.tsx` | OK |
| Mes Enfants | `/profile/enfants` | **MISSING** (no `app/profile` dir) | **404** |
| Gamification | `/gamification` | `app/gamification/page.tsx` | OK |
| Carte VIP | `/carte-vip` | `app/carte-vip/page.tsx` | OK |
| Fidélité | `/carte-vip` | (duplicate of above) | OK |
| Notifications | `/notifications` | `app/notifications/page.tsx` | OK |
| Paramètres | `/mon-compte` | **MISSING** | **404** |

**5 of 10 items are 404s.** This sidebar appears to be dead/legacy — verify no current layout still imports it before patching. (Search for `DashboardSidebar` import to confirm.)

---

## 4. `components/dashboard/teen/sidebar.tsx` — TeenSidebar (md+ desktop)

| Label | Href | Target file | Risk |
|---|---|---|---|
| Dashboard | `/teen` | `app/teen/page.tsx` | OK |
| Events | `/teen/events` | `app/teen/events/page.tsx` | OK — uses `getTeenDashboardData` (defaults safely) and emits non-blocking signals. |
| Aide Scolaire | `/teen/aide-scolaire` | `app/teen/aide-scolaire/page.tsx` | OK — try/catch around grade fetch, empty array fallback. |
| Défis Physiques | `/teen/defis-physiques` | `app/teen/defis-physiques/page.tsx` | OK — top-level `.catch()` with empty defaults. |
| Parcours Passion | `/teen/passions` | `app/teen/passions/page.tsx` | OK — redirects to `/teen/quests?tab=creative`. |
| Games | `/teen/games` | `app/teen/games/page.tsx` | OK — both fetches `.catch()`-wrapped. |
| Circles | `/teen/circles` | `app/teen/circles/page.tsx` | OK — three parallel fetches all `.catch()`-wrapped. |
| Partager | `/teen/share` | `app/teen/share/page.tsx` | OK — fully client-side, no server data. |
| Mes Achievements | `/gamification/collections` | `app/gamification/collections/page.tsx` | DATA-RISK **medium** — passes `user.id` (auth uid) to `getUserCollections`/`getCollectionStats` etc. Functions assume teen-row id; for a freshly seeded teen account this may return empty or, worse, throw on the first call. None of the awaits are `.catch()`-wrapped → a single failure 500s the page. |
| Mes Coins | `/teen/coins` | `app/teen/coins/page.tsx` | OK — redirects to `/teen/wallet`. |
| Ma Streak | `/teen/streak` | `app/teen/streak/page.tsx` | OK — all four parallel fetches have `.catch()` fallbacks. |
| Récompenses | `/teen/wallet?tab=shop` | `app/teen/wallet/page.tsx` | Same risk as wallet (DATA-RISK low — see 1.1). |
| Classement | `/gamification/leaderboard` | `app/gamification/leaderboard/page.tsx` | DATA-RISK **medium** — auth uid passed where teen id is expected; raw `supabase.from("user_xp")...` without `.catch`. If the join `teens!inner(...)` finds nothing the query still returns an empty array (acceptable). Bigger risk: schema drift on `user_xp.weekly_xp` / `crews.current_level` → page crashes. |
| Mon Profil | `/teen/profile` | `app/teen/profile/page.tsx` | DATA-RISK medium — see 1.1. |
| Paramètres | `/teen/settings` | `app/teen/settings/page.tsx` | OK — redirects to `/teen/profile?tab=settings`. |

---

## 5. `components/dashboard/parent/sidebar.tsx` — ParentSidebar (desktop)

| Label | Href | Target file | Risk |
|---|---|---|---|
| Dashboard | `/parent` | `app/parent/page.tsx` | OK |
| Mes Teens | `/parent/teens` | `app/parent/teens/page.tsx` | OK |
| Top-up Crédits | `/parent/topup` | `app/parent/topup/page.tsx` | OK |
| Approbations | `/parent/approvals` | `app/parent/approvals/page.tsx` | OK |
| Events | `/parent/events` | `app/parent/events/page.tsx` | OK |
| Historique | `/parent/history` | `app/parent/history/page.tsx` | OK |
| Notifications | `/parent/notifications` | `app/parent/notifications/page.tsx` | OK |
| Abonnement | `/parent/subscription` | **MISSING** | **404** |
| Paramètres | `/parent/settings` | `app/parent/settings/page.tsx` | OK |

Note also: this sidebar hard-codes `<span>2</span>` next to “Approbations” regardless of real pending count — UI-only stale value, not a crash, but worth flagging.

---

## 6. `components/dashboard/ambassador/sidebar.tsx` — AmbassadorSidebar (desktop)

| Label | Href | Target file | Risk |
|---|---|---|---|
| Dashboard | `/ambassador` | `app/ambassador/page.tsx` | OK |
| Mes Filleuls | `/ambassador/referrals` | `app/ambassador/referrals/page.tsx` | OK |
| Mes Commissions | `/ambassador/commissions` | `app/ambassador/commissions/page.tsx` | OK |
| Mon Lien | `/ambassador/link` | **MISSING** | **404** |
| Statistiques | `/ambassador/stats` | **MISSING** | **404** |
| Récompenses | `/ambassador/rewards` | **MISSING** | **404** |
| Paramètres | `/ambassador/settings` | **MISSING** | **404** |
| Aide | `/ambassador/help` | **MISSING** | **404** |

**5 of 8 items 404.** This sidebar is severely under-implemented — only the first three slots resolve.

---

## 7. `components/dashboard/partner/sidebar.tsx` — PartnerSidebar (desktop)

| Label | Href | Target file | Risk |
|---|---|---|---|
| Dashboard | `/partner` | `app/partner/page.tsx` | OK |
| Mes Offres | `/partner/offers` | `app/partner/offers/page.tsx` | OK |
| Transactions | `/partner/transactions` | `app/partner/transactions/page.tsx` | OK |
| Scanner QR | `/partner/scanner` | `app/partner/scanner/page.tsx` | OK |
| Statistiques | `/partner/stats` | `app/partner/stats/page.tsx` | OK |
| Events | `/partner/events` | `app/partner/events/page.tsx` | OK |
| Paramètres | `/partner/settings` | `app/partner/settings/page.tsx` | OK |
| Support | `/partner/support` | `app/partner/support/page.tsx` | OK |

All 8 resolve. Healthiest sidebar.

---

## 8. `components/dashboard/mentor/sidebar.tsx` — MentorSidebar (desktop)

| Label | Href | Target file | Risk |
|---|---|---|---|
| Dashboard | `/mentor/dashboard` | `app/mentor/dashboard/page.tsx` | OK |
| Sessions | `/mentor/sessions` | `app/mentor/sessions/page.tsx` | OK |
| Profil | `/mentor/profile/edit` | `app/mentor/profile/edit/page.tsx` | OK |
| Disponibilités | `/mentor/availability` | **MISSING** | **404** |

---

## Aggregate summary — broken/risky items per nav component

| Nav component | Items | 404 / MISSING | Data-risk items | Verdict |
|---|---|---|---|---|
| MobileDock — public | 5 | 0 | 1 (low) | Healthy |
| MobileDock — parent (n/a, returns null in /parent) | — | — | — | — |
| **MobileDock — admin** | 5 | **3** (events, users, settings — wrong language slug + missing) | 0 | **Broken — 60%** |
| **MobileDock — ambassador** | 5 | **2** (shop, profile) | 0 | **Broken — 40%** |
| MobileDock — partner | 5 | 1 (profile) | 0 | Mostly OK |
| MobileDock — teen | 5 | 0 | 2 (wallet low, profile medium) | Healthy targets, soft risks |
| ParentMobileDock | 5 | 0 | 0 | **Best — 0 broken** |
| **DashboardSidebar (legacy)** | 10 | **5** | 0 | **Dead — 50% broken** |
| TeenSidebar | 15 | 0 | 3 (collections + leaderboard medium, profile medium, wallet low) | Mostly OK; data risks dominate |
| ParentSidebar | 9 | 1 (subscription) | 0 (cosmetic stale "2" badge) | Mostly OK |
| **AmbassadorSidebar** | 8 | **5** (link, stats, rewards, settings, help) | 0 | **Broken — 62%** |
| PartnerSidebar | 8 | 0 | 0 | **Healthy — 0 broken** |
| MentorSidebar | 4 | 1 (availability) | 0 | One critical gap |

**Worst offenders, ranked by broken-link share:**
1. AmbassadorSidebar (5/8 — 62.5%)
2. MobileDock admin variant (3/5 — 60%)
3. DashboardSidebar legacy (5/10 — 50%)
4. MobileDock ambassador variant (2/5 — 40%)
5. MentorSidebar (1/4 — 25%)

---

## Top 5 fixes to make the menu trustable for the seeded teen test account

The seeded teen lands in `/teen` (teen MobileDock + TeenSidebar are the surfaces the test account actually sees). Sorted by user-visible severity for that account:

1. **Wrap `/teen/profile` server fetches in `.catch()`** (`app/teen/profile/page.tsx`).
   `getAchievementStats`, `getUserRank`, `getLifetimeStats`, and the `.single()` on `profiles` are all unguarded. If RLS, schema drift, or a missing row hits any one of them, the entire profile route 500s — and "Profil" is the right-most item on the bottom dock, the highest-traffic teen tab after Home. Same fix pattern as `/teen/page.tsx` already uses.

2. **Wrap `/gamification/collections` and `/gamification/leaderboard` fetches** (`app/gamification/collections/page.tsx`, `app/gamification/leaderboard/page.tsx`).
   Both pages are linked from the TeenSidebar (`Mes Achievements`, `Classement`) and both pass `user.id` (auth uid) to functions/queries that expect a teen id. None of the awaits are `.catch()`-wrapped. A freshly seeded teen with no `user_xp` / `user_collections` rows can hit zero rows fine, but any RPC error or schema mismatch crashes the page. Add `.catch(() => default)` around each await as in `/teen/streak` and `/teen/page.tsx`.

3. **Wrap `getRewards` / `getCategories` in `/teen/wallet`** (`app/teen/wallet/page.tsx`).
   The other parallel call (`getTeenDashboardData`) is `.catch()`-friendly upstream, but the two shop-catalog calls aren't. The wallet is one of the 5 dock targets — protect it the same way.

4. **Fix admin MobileDock slugs** (`components/layouts/mobile-dock.tsx`).
   Even if the seeded teen never enters `/admin`, this is a 3-of-5 broken dock ready to bite anyone debugging admin views from a phone. Real paths exist as `/admin/evenements` and `/admin/utilisateurs`; `/admin/settings` doesn't exist and should be removed or pointed at `/admin/permissions` (or whichever screen is canonical).

5. **Either delete `components/dashboard/sidebar.tsx` or fix its 5 dead links.**
   This generic sidebar (`/dashboard`, `/mes-reservations`, `/mes-clubs`, `/profile/enfants`, `/mon-compte`) points at a legacy URL space that no longer exists. Confirm via `grep` that no current layout imports `DashboardSidebar`; if unreferenced, delete the file. If still mounted somewhere, retarget to the modern equivalents (`/teen` or `/parent` zones, `/teen/profile`, `/parent/teens`, `/parent/settings`). Live broken sidebar > none.

### Honourable mentions (not teen-critical but trivial wins)

- `/parent/subscription` (404) — replace with `/parent/topup` or build the page; it's the only 404 in an otherwise clean ParentSidebar.
- `/mentor/availability` (404) — single broken item in a 4-item sidebar; either build it or hide the link.
- AmbassadorSidebar — needs a wave of stub pages or a sidebar trim; until then the desktop ambassador experience is unusable.
- ParentSidebar hard-coded "2" badge on Approbations — wire to real pending count or remove (cosmetic but trust-eroding).
