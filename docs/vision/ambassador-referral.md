# Ambassador / Referral System — Vision vs Reality Audit

> Read-only audit by `ambassador-referral-auditor`. Live Supabase project: `imchornjvmgmaovhypco`.
> Compares the founder's intended ambassador / parrainage model with what is actually wired in the Next.js codebase and the live Postgres schema.

---

## 1. Vision intended (founder summary)

**Ambassadors / parrains** are users (often teens, sometimes parents) who **invite others** to the Nivy platform via a unique referral code or link. Concretely:

- Each ambassador owns a unique referral code/short link.
- The system tracks invited users (filleuls).
- The ambassador earns a **% commission** on every purchase a filleul makes (event tickets, partner offers, premium subscriptions).
- Possibly **tiered**: more invites → higher commission %.
- Beyond cash, the ambassador may also award (and earn) **XP / coins** as a referral bonus, hooking into the gamification economy.
- Parents-as-ambassadors is supported: a parent can refer another parent's family.
- Cash-out happens via Mobile Money (Orange / inwi / Maroc Telecom Cash) or bank transfer, above a 500 DH threshold (per the public marketing page).

This is essentially a hybrid **MLM-lite + viral gamification** loop, sitting at the seam between the Teen, Parent, and Partner sub-products.

---

## 2. What is actually shipped in code

The codebase implements a fairly thorough **UI surface** for the ambassador feature, organised under two parallel route groups:

### Public / onboarding surface
- `app/devenir-ambassadeur/page.tsx` — public landing page with FAQ ("10% commission", "500 DH cash-out", Mobile Money). Reads from `ambassadors` table to show approval status banner.
- `app/devenir-ambassadeur/programme/page.tsx` — programme details page.
- `app/devenir-ambassadeur/candidature/page.tsx` — application gate; redirects to login, then renders `<AmbassadorApplicationForm>` (client form persisting into `ambassadors`).

### Authenticated ambassador dashboard (`app/ambassador/`)
Sub-routes (each is a server component + page.tsx):
- `app/ambassador/page.tsx` — dashboard with KPI cards (Filleuls, Commissions DH, Ce mois, Taux %), recent referrals, recent commissions, quick actions, "Conseils pour gagner plus".
- `app/ambassador/referrals/page.tsx` — full filleul list with status badges (active / pending / inactif) and per-filleul commission_amount.
- `app/ambassador/commissions/page.tsx` — combined transaction history merging `referral_usage` rows and `ambassador_withdrawals` rows, with growth %, Disponible balance, etc.
- `app/ambassador/withdrawals/page.tsx` — withdrawal request UI.
- `app/ambassador/boutique/page.tsx` — points-based ambassador shop (separate from the cash commission flow).
- `app/ambassador/marketing/page.tsx` — marketing material (banners, copy, QR).
- `app/ambassador/comment-gagner/page.tsx` — "how to earn more" educational page.

### Components
- `components/ambassador/share-buttons.tsx` — Web Share API + clipboard fallback. Builds link `${getSocialBaseUrl()}/join?ref=${referralCode}`.
- `components/ambassador/qr-code-generator.tsx` — QR for referral code.
- `components/ambassador/withdrawal-form.tsx` — payout request form.

### API routes
- `app/api/ambassador/withdrawals/route.ts` — POST creates a row in `ambassador_withdrawals`, validates against `ambassadors.total_earnings - pending_withdrawals - withdrawn_amount`, enforces 100 DH minimum, increments `pending_withdrawals`.
- `app/api/ambassador/shop/redeem/route.ts` — calls RPC `redeem_ambassador_reward(p_ambassador_id, p_reward_id, ...)` writing into `ambassador_redemptions` joined to `ambassador_rewards`.
- `app/api/ambassador/shop/points/route.ts` and `app/api/ambassador/shop/rewards/route.ts` — points balance and reward catalog.

### Admin
- `app/admin/ambassadeurs/page.tsx` — admin list with Approve / Reject buttons posting to `/api/admin/ambassadors/{approve,reject}`.

### Parallel "social-sharing" referral track
There is a *second*, semantically distinct referral system inside `gamification-system/`:
- Migration `gamification-system/database/migrations/019_social_sharing.sql` defines `referral_codes`, `referral_uses`, `user_shares`, `user_sharing_stats`, `sharing_achievements`, plus RPCs `get_or_create_referral_code`, `use_referral_code`, `complete_referral`. This track is **purely XP/coins-based** (no DH). Code prefix is `TPM` (Teens Party Morocco legacy branding).
- `gamification-system/components/social-sharing/referral-section.tsx` — `<ReferralCard>`, `<ReferredUsersList>`, `<ReferralLeaderboard>`, `<QRCodeModal>`. Hard-coded "+100 XP / +50 Coins" reward labels.
- `gamification-system/features/social-sharing/{actions.ts,schema.ts}` — server actions and zod schemas.

So the project actually carries **two parallel referral concepts** that have never been reconciled.

---

## 3. What is actually persisted live (Supabase)

Run on `public` schema:

```
SELECT tablename FROM pg_tables WHERE schemaname='public'
AND (tablename ILIKE ANY (ARRAY['%referral%','%ambassad%','%commission%','%invite%','%share%','%withdraw%','%parrain%','%filleul%']));
```

Result (only matching tables that exist):

```
feed_shares
generated_share_cards
referral_codes
referral_uses
share_card_templates
share_image_templates
share_link_clicks
share_links
share_rewards          (11 rows, configured)
share_templates
social_shares
user_share_stats
user_shares
```

Counts: `referral_codes=0`, `referral_uses=0`, `user_shares=0`, `share_links=0`, `share_rewards=11`. Only the gamification (XP/coin) referral plumbing is provisioned and it has zero traffic.

**Tables referenced by the ambassador dashboard but ABSENT from the live DB**:

```
ambassadors                 -- queried by 8+ files
ambassador_withdrawals      -- queried by withdrawals API + commissions page
ambassador_redemptions      -- queried by shop redeem API
ambassador_rewards          -- queried by shop API
referral_usage              -- queried by dashboard, referrals page, commissions page
admin_roles                 -- queried by admin page
```

`SELECT DISTINCT role FROM profiles` returns only `parent | partner | teen` — there is **no `ambassador` role enum value**, despite `app/ambassador/page.tsx` doing `if (userInfo.role !== "ambassador") redirect(...)`. Every visit to `/ambassador` therefore redirects.

The only RPCs live for this domain are the gamification ones: `complete_referral`, `get_or_create_referral_code`, `use_referral_code`. There is no `redeem_ambassador_reward` RPC, so the shop API would 500.

---

## 4. Vision-vs-reality answers

**Q: Does an ambassador account type exist?**
Code assumes a separate `role='ambassador'` on `profiles` AND a dedicated `ambassadors` row keyed by `profile_id`. Live: **neither exists**. The role enum holds only `parent|partner|teen`, and the `ambassadors` table is unmigrated. The whole `app/ambassador/*` tree is dead code today.

**Q: Referral code generation mechanism?**
Two competing mechanisms:
1. **Cash track (intended)**: `ambassadors.referral_code` column (admin sees it; per `admin/ambassadeurs/page.tsx` it's already populated when a candidate is approved). No generator function visible — likely meant to be set on approval. Table missing live.
2. **XP track (live)**: `get_or_create_referral_code(uuid)` RPC generates `'TPM' || UPPER(SUBSTRING(MD5(...) FROM 1 FOR 6))` and inserts into `referral_codes` (one per user). Functional but unused.

**Q: Commission persistence — any table?**
Intended: `referral_usage(ambassador_id, user_id, commission_amount, status, created_at)` plus aggregate columns on `ambassadors.total_earnings / pending_withdrawals / withdrawn_amount`. None of these exist. The XP track has no money column at all (only `referrer_xp_reward`, `referrer_coins_reward`).

**Q: Filleul attribution — when teen X buys, how does the system know X was referred by Y?**
**It does not.** There is no purchase hook anywhere that increments `referral_usage.commission_amount`, no trigger on `event_reservations` / `payments` / `subscriptions` that fires `complete_referral`, and the `share-buttons.tsx` link `/join?ref=CODE` has no `app/join/` route registered to capture the ref param into a cookie or session. Attribution is a complete blank.

**Q: Ambassador dashboard — KPIs visible?**
The UI is rich and pixel-perfect (gradient cards, growth %, transaction icons), but every query targets non-existent tables. With no `ambassadors` row, `getAmbassadorStats()` returns `null`, and the dashboard renders zeros / empty states. It's an empty stub with sophisticated chrome.

**Q: Ambassador-as-Parent — can a parent refer another parent's family?**
Nothing in the schema or code prevents it (no role check on `referral_codes.user_id`), but nothing supports it either: there is no notion of "family" attribution, and parents do not currently appear in the candidacy form copy ("Adolescents actifs sur les réseaux sociaux"). The vision is uncodified.

---

## 5. Source paths consulted

- `app/ambassador/page.tsx`
- `app/ambassador/commissions/page.tsx`
- `app/ambassador/referrals/page.tsx`
- `app/ambassador/withdrawals/page.tsx`
- `app/ambassador/boutique/page.tsx`
- `app/ambassador/marketing/page.tsx`
- `app/ambassador/comment-gagner/page.tsx`
- `app/devenir-ambassadeur/page.tsx`
- `app/devenir-ambassadeur/candidature/page.tsx`
- `app/devenir-ambassadeur/programme/page.tsx`
- `app/api/ambassador/withdrawals/route.ts`
- `app/api/ambassador/shop/redeem/route.ts`
- `app/api/ambassador/shop/points/route.ts`
- `app/admin/ambassadeurs/page.tsx`
- `components/ambassador/share-buttons.tsx`
- `components/ambassador/qr-code-generator.tsx`
- `components/ambassador/withdrawal-form.tsx`
- `gamification-system/database/migrations/019_social_sharing.sql`
- `gamification-system/components/social-sharing/referral-section.tsx`
- `gamification-system/features/social-sharing/actions.ts`
- `gamification-system/features/social-sharing/schema.ts`

DB queries executed (≥ 4):
1. `pg_tables` ILIKE on `%referral% / %ambassad% / %commission% / %invite% / %share% / %withdraw%`
2. `pg_tables` filter on canonical names `ambassadors / ambassador_withdrawals / ambassador_commissions / referral_usage / partner_commissions / user_referrals` → empty.
3. Column dump on `referral_codes / referral_uses / user_shares / user_sharing_stats / share_links / share_link_clicks / share_rewards`.
4. Row counts on those 5 tables.
5. `SELECT DISTINCT role FROM profiles`.
6. `information_schema.routines` filter for `%referral%/%ambassad%/%commission%`.

---

## 6. Open questions for the founder

- **Commission %**: flat 10/15% (the dashboard hard-codes `15`, the public page advertises `10`, the `ambassadors.commission_rate` column suggests per-ambassador override) — flat or tiered by rank/volume?
- **Filleul attribution window**: lifetime, 30 days from signup, first-purchase-only, or every purchase forever?
- **Cash-out**: bank transfer + Mobile Money advertised. Who validates? Who pays? Is the 500 DH threshold marketing copy or a hard rule (the API enforces only 100 DH)?
- **Teen ambassadors referring adults**: legally allowed in MA? Age-gated on application?
- **Notifications**: should the ambassador get a push/email when a filleul purchases? Currently nothing is wired — no entry in `notifications` triggers, no edge function on commission insert.
- **Reconciliation of two referral systems**: the gamification (`TPM`) XP-only flow vs the cash `ambassadors` flow — are they meant to merge (every user gets a referral code, ambassadors get an *upgraded* one with cash) or stay separate?
- **`/join?ref=CODE` capture**: should this be an edge middleware that drops a cookie consumed at signup? It is currently a 404.
- **`ambassadors` migration**: is a migration file lost / never written, or is the entire feature on hold? No `*ambassador*.sql` exists under `supabase/migrations` or `gamification-system/database/migrations`.

---

## TL;DR

The ambassador / referral system is, in May 2026, **a UI mockup plus a marketing landing page connected to a database that does not exist**. A parallel XP-only referral system from the legacy "Teens Party Morocco" gamification module is fully migrated and has 0 usage. The cash commission flow (which is the actual product vision) has no schema, no role, no attribution hook, no cash-out backend, and the dashboard route redirects every authenticated user away because `role='ambassador'` is not a valid enum value.
