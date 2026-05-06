# Nivy Economy — Single Source of Truth

> Owned by the `rewards-currency-unifier` team agent.
> If you change conversion rates, **edit `lib/payments/xp-converter.ts` and this file in the same diff**.

This document is the canonical reference for Nivy's currencies, the conversion
between them, where each is earned, and where each is spent. It also documents
the canonical reward shop URL and the rationale for the consolidation that
happened in the `rewards-currency-unifier` pass.

---

## 1. Canonical shop URL

**`/teen/wallet?tab=shop`** is the single, canonical reward shop in Nivy.

Why this URL and not `/gamification/boutique` or `/xp-shop`:

- It is the redirect target the audit (`docs/audits/AUDIT_E2E_DOUBLONS_HARDCODE_SCAFFOLD.md`)
  and the routes-deduplicator already converged on for `/teen/shop` and
  `/teen/rewards`.
- The teen sidebar (`components/dashboard/teen/sidebar.tsx`) already points
  "Récompenses" at this URL.
- The wallet surface is the natural place to combine balance + spend in a
  single page (XP, coins, DH credit equivalent), which is the point of the
  consolidation.
- It lives inside the `/teen/*` ecosystem the rest of the teen UI lives in.

The previous shop pages now redirect:

| Old URL                   | Status   | Target                  |
|---------------------------|----------|-------------------------|
| `/teen/shop`              | redirect | `/teen/wallet?tab=shop` |
| `/teen/rewards`           | redirect | `/teen/wallet?tab=shop` |
| `/xp-shop`                | redirect | `/teen/wallet?tab=shop` |
| `/gamification/boutique`  | redirect | `/teen/wallet?tab=shop` |

The internal links in `app/gamification/page.tsx` and
`components/rewards/unified-rewards-display.tsx` were also updated to point
directly at the canonical URL (no redirect hop).

---

## 2. Currencies

Nivy has **three** currencies. They are not interchangeable and they have
distinct lifecycles.

### 2.1 XP — `user_xp.total_xp`

- **What it is:** primary reward currency. Earned through engagement.
- **Earned at:**
  - Quizzes — `gamification-system/features/xp/*`
  - Daily streak — `daily_streak_*`
  - Quest completion — `app/teen/quests/*`
  - Defi (challenge) completion — `app/gamification/defis/*`
  - Event participation — `app/gamification/events/*`
  - Fortune wheel spins — `app/gamification/wheel/*`
- **Spent at:**
  - Reward shop (`/teen/wallet?tab=shop`) — debits via RPC `purchase_reward`
    invoked from `gamification-system/features/shop/actions.ts::purchaseReward`.
  - Hybrid event-booking checkout (`/teen/shop/checkout`) — debits via
    `app/api/payments/hybrid/route.ts` together with Stripe / CMI / Mobile
    Money for the cash remainder.
  - Pure-XP booking payment (`app/api/payments/xp/route.ts`) — alternative
    rail for legacy bookings.

### 2.2 Coins — `user_coins.balance` (placeholder)

- **What it is:** soft currency intended for cosmetics (avatars, badges,
  themes). Conceptually distinct from XP because it is *spendable* without
  affecting level/progression display.
- **Status today:** the `user_coins` table is not yet wired. The wallet UI
  reads `walletData.coins = 0` as a placeholder. **No purchase path uses
  coins yet.** This is documented as a deferred gap.
- **Earned at (planned):** level-up bonuses, achievement unlocks, special
  events. (See `app/teen/coins/page.tsx` for the intended UX shape — note
  that file is currently a static mock.)
- **Spent at (planned):** cosmetic-only items in the reward shop, when the
  shop catalog adds a `currency: 'coins'` flag. Until then, the canonical
  shop catalogue (`reward_categories` + `get_shop_rewards`) only prices
  rewards in XP.

### 2.3 DH credit — derived

- **What it is:** **not a stored balance.** DH (Moroccan Dirham) is the cash
  currency for real bookings; the "DH credit" the wallet shows next to a
  teen's XP is the *DH-equivalent value* of their XP balance, computed via
  `convertXPToDH()` from `lib/payments/xp-converter.ts`.
- **Earned at:** never directly. It is always a function of XP balance.
- **Spent at:** the hybrid checkout (`/api/payments/hybrid`) when the teen
  chooses to apply XP toward a real DH-priced booking. The XP debit and the
  DH discount are both computed from the same conversion rate.

---

## 3. Conversion rule (single source: `lib/payments/xp-converter.ts`)

| Constant                          | Value     | Meaning                                       |
|-----------------------------------|-----------|-----------------------------------------------|
| `XP_TO_DH_RATE`                   | `0.10`    | 1 XP = 0.10 DH → **10 XP = 1 DH**             |
| `MIN_XP_FOR_PAYMENT`              | `50`      | Minimum XP usable in a single hybrid payment  |
| `PARENTAL_APPROVAL_THRESHOLD_XP`  | `1000`    | XP usage at/above this triggers parent gate   |

The wallet UI surfaces this rate directly in the header banner:

> Taux de conversion : 1 XP = 0.10 DH (10 XP = 1 DH)

Any change to these constants **must** update both the file and this table in
the same commit.

---

## 4. Debit precedence

When a teen takes an action that costs money:

1. **Pure reward redemption** (cosmetics, perks, vouchers from the shop):
   - Single rail: XP via `purchase_reward` RPC, called from the canonical
     shop tab.
   - No DH cash, no Stripe, no parental approval (the rewards table
     `reward_categories` does not contain real-money items).

2. **Event booking checkout** (real DH-priced booking):
   - Hybrid rail: `/api/payments/hybrid`.
   - Teen chooses how many XP to apply (subject to `MIN_XP_FOR_PAYMENT`).
   - If `xp >= PARENTAL_APPROVAL_THRESHOLD_XP`, request goes to the parent
     queue (`parental_approvals` table).
   - Otherwise: XP is debited, DH remainder is charged via Stripe (default),
     CMI, or Mobile Money depending on `paymentMethod`.

3. **Coins** are not yet on any debit rail.

---

## 5. Data model — dual table reality, **single read path per surface**

There are historically three tables for "things a teen can buy":

| Table              | Status today                         | Used by                                |
|--------------------|--------------------------------------|----------------------------------------|
| `reward_categories` + RPC `get_shop_rewards` | **canonical** for the wallet shop tab | `gamification-system/features/shop/actions.ts` → wallet `ShopTab` |
| `xp_shop_items`    | legacy, only the orphaned `/xp-shop` page read it (now a redirect) | nothing in production code |
| `shop_items`       | referenced by `app/api/teen/shop/route.ts` GET/POST | the API endpoint exists but the canonical wallet shop **no longer calls it** (it now uses the `purchaseReward` server action). The endpoint is left in place for potential mobile / external clients but is no longer the production path. |

Per the agent contract, **no DB migrations were performed in this pass.** The
two unused-from-UI tables (`xp_shop_items`, `shop_items`) remain in the
database for backward compatibility. A future database-consolidator pass
should:

- Decide whether to drop `xp_shop_items` (zero callers).
- Decide whether to merge `shop_items` rows into `reward_categories` /
  `rewards` (the table the RPC reads from), or to drop the `/api/teen/shop`
  endpoint entirely.

---

## 6. Checkout wiring (canonical shop)

The wallet `ShopTab` purchase button calls
`gamification-system/features/shop/actions.ts::purchaseReward({ rewardId })`
(server action), which invokes the Postgres RPC `purchase_reward`. That RPC
atomically:

- Verifies the user has enough XP.
- Debits XP from `user_xp.total_xp`.
- Inserts a row into `shop_purchases`.
- Applies any promo discount.
- Returns `{ success, purchase_id, xp_spent, discount_applied }`.

For event-booking checkout (separate flow, not the reward shop), the
`/teen/shop/checkout` route invokes `/api/payments/hybrid` with
`{ bookingId, teenId, xpAmount, paymentMethod: 'stripe' }` — that path is
owned by the `reservation-payment-finisher` agent and is unchanged here.

---

## 7. UI contract

The wallet header (`app/teen/wallet/wallet-hub-client.tsx`) must always show:

- **XP balance** (purple, with `Zap` icon)
- **Coins balance** (yellow, with `Coins` icon — currently always 0)
- **DH credit equivalent** (emerald, with `Sparkles` icon) computed from XP

…plus the conversion rule banner immediately below the header pills.

The shop tab additionally shows the per-item DH-equivalent next to the XP
price tag, using `convertXPToDH()` so there is one and only one rate in the
codebase.

---

## 8. Open gaps / deferred

- **Coins are not wired.** `user_coins` table does not exist; `walletData.coins`
  hard-codes `0`. This is a separate workstream.
- **`shop_items` vs `reward_categories` data merge** — deferred to a future
  DB-consolidator pass (see §5).
- **Mobile Money / CMI** in `/api/payments/hybrid` are gated behind feature
  flags (`mobile_money_payment`, `cmi_payment`) and are out of scope for
  reward shops (cash remainder only).
