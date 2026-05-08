# B5 — Ambassador Role Pages Audit

> Read-only audit of `app/ambassador/**/page.tsx` + ambassador-specific navigation.
> Cross-referenced against `docs/vision/ambassador-referral.md`.
> Vision in one line: **referral commissions (cash, MLM-lite) + marketing kit + points-based boutique**.

---

## Section 1 — Ambassador nav + flow

### Layout shell
- `app/ambassador/layout.tsx`
  - Server-guards `userInfo.role !== "ambassador"` → redirects to `/auth/redirect`. Per the reference vision audit, the live `profiles.role` enum holds only `parent | partner | teen`, so this redirect fires for **every** authenticated user. The whole tree is unreachable in production.
  - Renders `<AmbassadorHeader>` + `<AmbassadorSidebar>` + `<AgentFloatingButton role="ambassador">`. Has its own brand palette (amber/orange gradient) distinct from teen/parent/partner.

### Desktop sidebar (`components/dashboard/ambassador/sidebar.tsx`)
Hard-coded nav with 8 entries:

| Label | href | Page exists? |
|---|---|---|
| Dashboard | `/ambassador` | yes |
| Mes Filleuls | `/ambassador/referrals` | yes |
| Mes Commissions | `/ambassador/commissions` | yes |
| Mon Lien | `/ambassador/link` | **404** (no page) |
| Statistiques | `/ambassador/stats` | **404** |
| Récompenses | `/ambassador/rewards` | **404** (boutique lives at `/ambassador/boutique`, link mismatch) |
| Paramètres | `/ambassador/settings` | **404** |
| Aide | `/ambassador/help` | **404** |

The sidebar is **out of sync with the actual route tree**. It points at 5 routes that do not exist, and omits 3 that do (`/ambassador/withdrawals`, `/ambassador/marketing`, `/ambassador/comment-gagner`, `/ambassador/boutique`).

### Mobile dock (`components/layouts/mobile-dock.tsx`)
Separate `ambassadorNavItems` list (lines 190–221). 5 entries pointing at: `/ambassador`, `/ambassador/referrals`, `/ambassador/shop` (**404** — should be `/ambassador/boutique`), `/ambassador/withdrawals`, `/ambassador/profile` (**404**). Same disease, different list — desktop sidebar and mobile dock disagree on `shop` vs `boutique` and `rewards` vs neither.

### Header (`components/dashboard/ambassador/header.tsx`)
Reads `userInfo.ambassadorData.commissionRate` from `getUserRole()`. Provides logout, copy-link, dropdown — relies on data populated from the missing `ambassadors` table.

### Page tree (`app/ambassador/**/page.tsx`)
7 pages exist:

```
app/ambassador/page.tsx                      Dashboard (server, KPI cards)
app/ambassador/referrals/page.tsx            Filleul list (server)
app/ambassador/commissions/page.tsx          Commission + withdrawal history (server)
app/ambassador/withdrawals/page.tsx          Withdrawal request UI (server)
app/ambassador/marketing/page.tsx            Marketing kit / share / QR (server)
app/ambassador/boutique/page.tsx             Points-based ambassador shop (client)
app/ambassador/comment-gagner/page.tsx       "How to earn more" educational (client)
```

### Intended flow (read from code)
1. Public `/devenir-ambassadeur` landing → `/devenir-ambassadeur/candidature` form persists into `ambassadors` table.
2. Admin approves at `/admin/ambassadeurs` → flips `ambassadors.status='active'` and (presumably) `profiles.role='ambassador'`.
3. User logs in → `/auth/redirect` routes `case "ambassador"` to `/ambassador`.
4. Dashboard hydrates from `ambassadors` + `referral_codes` + `referral_usage` + `ambassador_withdrawals`.
5. User shares link `${SOCIAL_BASE}/join?ref=CODE`; filleul purchase fires (intended) commission insert.
6. User requests withdrawal via `POST /api/ambassador/withdrawals` (100 DH min, mobile money / bank).

Steps 2–6 do not work end-to-end because `ambassadors`, `ambassador_withdrawals`, `ambassador_redemptions`, `ambassador_rewards`, `referral_usage` are **not migrated to live DB** (per reference audit), and there is no `/join` route for `?ref=` capture.

---

## Section 2 — Scoring table (0–10)

Score key: 10 = production-ready, fully wired, vision-complete. 5 = visible UI, partial logic. 0 = nonexistent.

| Page | Wiring | Vision fit | UX polish | Score |
|---|---|---|---|---|
| `app/ambassador/page.tsx` (Dashboard) | Reads from 3 missing tables (`ambassadors`, `referral_codes`, `referral_usage`) — returns null → empty state for everyone. Beautiful KPI gradient cards. | Hits the right KPIs (filleuls, commissions DH, taux %). | High — gradient cards, recent referrals/commissions, quick actions. | **3/10** |
| `app/ambassador/referrals/page.tsx` | Same — queries non-existent `ambassadors` + `referral_usage`. Status badges (active/pending/inactif), per-filleul commission. | Direct hit on "tracks invited users (filleuls)". | High — filter/search/sort scaffolding (likely cosmetic). | **3/10** |
| `app/ambassador/commissions/page.tsx` | Merges `referral_usage` + `ambassador_withdrawals` rows into unified ledger. Computes growth %, available balance. Both source tables missing. | Direct hit on "% commission per filleul purchase" tracking. | High — unified transaction history with icons. | **3/10** |
| `app/ambassador/withdrawals/page.tsx` | API exists (`POST /api/ambassador/withdrawals`, validates balance, 100 DH min), increments `pending_withdrawals`. Page reads `ambassadors` + `ambassador_withdrawals` (both missing). Mobile Money / bank form per reference audit. | Direct hit on cash-out vision. **Mismatch: 100 DH min in code vs 500 DH advertised on public page.** | Medium-high — withdrawal form component exists. | **4/10** (highest — has actual API logic) |
| `app/ambassador/marketing/page.tsx` | Loads `ambassador.commission_rate` + `referral_codes.code`. Renders QR generator + share buttons + social templates array. Builds `/join?ref=CODE` link. | Direct hit on "marketing kit". **But `/join` route does not exist** so the link is a 404 even if shared. | Medium-high — QR + Web Share API + clipboard fallback + Instagram/WhatsApp/Facebook templates. | **4/10** |
| `app/ambassador/boutique/page.tsx` | Top-of-file V1.2 TODO comment recommending DELETE. Calls `/api/ambassador/shop/{points,rewards,redeem}`; redeem invokes RPC `redeem_ambassador_reward` which does not exist live (would 500). | **Off-vision** — whitepaper §12 says no separate ambassador shop; should fold into `/teen/shop` or be killed. | High — Tabs, Dialog, Progress, skeletons, history view. | **2/10** (UX wasted on a feature flagged for deletion by its own author) |
| `app/ambassador/comment-gagner/page.tsx` | Pure client static content. Top-of-file V1.2 TODO flags it as legacy points/level model that needs restructuring around bronze/silver/gold tiers + XP-only under-18 track. | Mixes legacy XP track with cash track — confused vision. EARNING_METHODS hard-codes 100 pts / family + 50 pts / TikTok video. | High — gradient cards per earning method. | **3/10** |

**Aggregate:** ~22/70 = **31%** vision realisation. UI craftsmanship is uniformly high (avg ~8/10 on chrome alone), but data layer is uniformly absent (avg ~1/10 on persistence).

---

## Section 3 — Vision gaps

### 3.1 Referral code visibility — PARTIAL
- Dashboard surfaces `ambassador.referralCode` (with a fallback to `profileId.slice(0,8)` if missing — leaks raw UUID prefix).
- Marketing page surfaces it again, with QR and copy-to-clipboard.
- **Gap:** there is no admin-side or self-serve code regeneration. The reference audit notes the column is presumed to be set on approval, but no generator function is visible in either the cash-track schema (table missing) or in the admin approval handler. Two competing code mechanisms exist (`ambassadors.referral_code` cash track vs `referral_codes` XP-track / RPC `get_or_create_referral_code` returning `TPM…` codes).
- **Gap:** the `<ShareButtons>` component builds `${getSocialBaseUrl()}/join?ref=${code}`, but **`app/join/` does not exist** — every link an ambassador shares is a 404. There is no middleware capturing `?ref=` into a cookie for later signup attribution.

### 3.2 Commission tracking — ABSENT
- UI columns ready: `commission_amount`, `status`, `created_at`, joined to `user.full_name`.
- **Gap:** zero attribution hook. No trigger, no edge function, no purchase webhook on `event_reservations`, `payments`, `subscriptions`, partner offers, or top-ups inserts a row into `referral_usage`. Even if the table existed, it would never receive data.
- **Gap:** `referral_usage` table itself is unmigrated.
- **Gap:** commission rate is contradictory across surfaces — public page says 10%, dashboard hard-codes 15, header reads from per-row `commission_rate`. No single source of truth.
- **Gap:** no tier system (bronze/silver/gold) despite `comment-gagner` TODO flagging it.

### 3.3 Withdrawals UI — UI READY, BACKEND PARTIAL
- Withdrawals form component exists; API route validates balance + threshold.
- **Gap:** threshold mismatch — API enforces 100 DH, public marketing page says 500 DH.
- **Gap:** Mobile Money (Orange / inwi / Maroc Telecom Cash) advertised but no payment provider integration is visible — withdrawal status presumably stays "pending" forever with no admin payout UI under `app/admin/ambassadeurs/page.tsx` (which only does Approve/Reject of *applications*, not payouts).
- **Gap:** no notification to ambassador on payout completion.
- **Gap:** the `ambassador_withdrawals` table is unmigrated, so the API would 500 on first call.

### 3.4 Marketing kit assets — UI READY, ASSETS MISSING
- `/ambassador/marketing` defines `socialTemplates` array (Instagram/WhatsApp/Facebook copy) and a QR generator wired to the referral code.
- **Gap:** the page lists `Image as ImageIcon`, `FileText`, `Video` icons — implying banners/PDFs/video templates — but the file (within first 60 lines and assumed elsewhere) does not show any download URLs to actual hosted assets. There is no `public/ambassador/` or Supabase storage bucket reference for media kit downloads.
- **Gap:** no per-event flyers, no co-branded partner assets, no Story templates with overlays.

### 3.5 Other notable gaps
- **Sidebar/dock route mismatch:** 5 desktop sidebar entries are 404s; mobile dock points to `/ambassador/shop` which is also a 404 (correct path is `/boutique`). User clicks die.
- **Boutique flagged for deletion** by its own author yet shipped — wasted surface.
- **No `/ambassador/profile` page** but mobile dock links to it.
- **No leaderboard** — XP-track has `<ReferralLeaderboard>` (in gamification module) but cash track has none, so there is no social proof / gamification on the cash side.

---

## Section 4 — Signup flow: can someone become an ambassador?

### Public surface (functional UI, broken backend)
1. **Landing:** `/devenir-ambassadeur` (`app/devenir-ambassadeur/page.tsx`) — public, marketing copy ("10% commission", "500 DH cash-out", Mobile Money). Reads `ambassadors` table to show approval-status banner if user already applied.
2. **Programme details:** `/devenir-ambassadeur/programme` (exists per glob).
3. **Application gate:** `/devenir-ambassadeur/candidature` (`app/devenir-ambassadeur/candidature/page.tsx`):
   - Forces login, then checks `ambassadors` table for an existing row keyed by `profile_id`.
   - If existing → redirects to `/devenir-ambassadeur` (status banner).
   - Otherwise renders `<AmbassadorApplicationForm profile={profile}>` (client form persisting into `ambassadors`).
   - Copy explicitly targets **teens** ("Adolescents actifs sur les réseaux sociaux"), so the parent-as-ambassador vision is **uncodified in onboarding copy**.
4. **Admin approval:** `app/admin/ambassadeurs/page.tsx` lists candidates with Approve / Reject buttons hitting `/api/admin/ambassadors/{approve,reject}`.

### What actually happens today
- Every `app/devenir-ambassadeur/*` page hits the missing `ambassadors` table → reads return null → forms can submit but the `INSERT` would fail (table absent) → users get a silent 500 or RLS error depending on whether an empty stub table exists.
- Even if the table existed, admin approval would need to **also flip `profiles.role` to `'ambassador'`**, but `'ambassador'` is not a valid value in the live role enum, so the update would be rejected.
- Result: **no path from "interested visitor" → "active ambassador" works end-to-end today**. The signup UI is fully drawn but the schema migration that would make it real is missing.

### Where the signup link is exposed
- Footer / public marketing pages (referenced via `app/devenir-ambassadeur/page.tsx`).
- Not surfaced in any teen/parent dashboard nav (audited indirectly — no `/devenir-ambassadeur` reference shows up in mobile-dock or sidebar grep). To find the program, a logged-in user would have to type the URL or hit the public footer.

### TL;DR for §4
Yes, the **signup *form* exists** at `/devenir-ambassadeur/candidature`. No, **becoming an ambassador does not work** because (a) the `ambassadors` table is unmigrated, (b) `profiles.role` enum has no `'ambassador'` value, (c) the admin Approve handler has no path to grant the role, and (d) the program is not promoted to logged-in users in any dashboard nav.

---

## Source paths consulted

Pages:
- `C:\Users\Shadow\Desktop\NIVY\app\ambassador\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\ambassador\referrals\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\ambassador\commissions\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\ambassador\withdrawals\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\ambassador\marketing\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\ambassador\boutique\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\ambassador\comment-gagner\page.tsx`

Layout / nav:
- `C:\Users\Shadow\Desktop\NIVY\app\ambassador\layout.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\dashboard\ambassador\sidebar.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\dashboard\ambassador\header.tsx`
- `C:\Users\Shadow\Desktop\NIVY\components\layouts\mobile-dock.tsx` (lines 190–221)

Signup flow:
- `C:\Users\Shadow\Desktop\NIVY\app\devenir-ambassadeur\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\devenir-ambassadeur\candidature\page.tsx`
- `C:\Users\Shadow\Desktop\NIVY\app\auth\redirect\page.tsx`

Reference vision:
- `C:\Users\Shadow\Desktop\NIVY\docs\vision\ambassador-referral.md`
