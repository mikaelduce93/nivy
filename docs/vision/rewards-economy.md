# Rewards Economy — Vision Audit

Read-only audit. Date 2026-05-07. Scope: shop catalog, redemption flow,
stock/promo/partner mechanics, mystery-box compliance, token (migration 028)
status, and the gap between schema ambition and shipped UI.

---

## 1. Vision intended

Per founder brief, the Nivy shop is meant to convert XP/coins into a mix of
**partner discounts** (e.g. -20% TechStore), **event tickets** (free entry,
skip-queue, VIP), **physical/digital items** (T-shirts, stickers, downloads),
**experiences** (meet & greet, DJ session), **mystery boxes** with tiered loot
tables, and **profile customisations** (avatar frames, name colors, titles).
Currency is XP today (10 XP = 1 DH per `lib/payments/xp-converter.ts`); a
separate `coins` rail is planned but not wired (`walletData.coins = 0` is
hard-coded in `app/teen/wallet/page.tsx`). Variable pricing is anticipated
through the `original_xp_cost` column (struck-through "was/now" pricing) and
via `shop_promo_codes`. Stock mechanics distinguish `unlimited` / `limited` /
`unique` SKUs. Compliance posture must respect Morocco's loi 09-08 on minors'
digital purchases and avoid drifting into chance-based gambling territory with
mystery boxes.

## 2. Reality on the ground

**Canonical shop UI** lives in `app/teen/wallet/wallet-hub-client.tsx` (Shop
tab inside the wallet hub). All other shop entry points are now redirects
(`app/teen/shop/page.tsx`, `app/teen/rewards/page.tsx`,
`app/gamification/boutique/page.tsx`, `app/xp-shop/page.tsx`,
`app/teen/coins/page.tsx`). Server data flows through
`gamification-system/features/shop/actions.ts` (`getRewards`, `getCategories`,
`purchaseReward`, `useReward`, `toggleWishlist`, `validatePromoCode`,
`getShopSummary`) backed by Postgres RPCs `get_shop_rewards`, `purchase_reward`,
`use_reward`, `toggle_wishlist`. Schema in
`gamification-system/features/shop/schema.ts` defines the `RewardTypeEnum` (11
values), `StockTypeEnum` (3 values), `PurchaseStatusEnum` (5 values), plus
helpers `formatRewardValue`, `isOnSale`, `calculateDiscountPercentage`.

**Live data (Supabase project `imchornjvmgmaovhypco`):**

- `shop_rewards` — 26 rows, all `is_active=true`. Distribution: experience 4,
  physical_item 4, profile_customization 4, discount 3, mystery_box 3,
  exclusive_access 3, free_entry 2, digital_item 2 (E2E test), skip_queue 1.
  Missing from catalog (defined in enum but zero rows): `lottery_ticket`,
  `xp_multiplier`. Stock split: 14 unlimited, 10 limited, 2 unique. `vip_only`
  set on 1 reward (Meet & Greet Artiste). `original_xp_cost` is **NULL on all
  26 rows** — the promo "was/now" UI affordance has no live data feeding it.
- `reward_categories` — 8 rows. 7 production (entries, event-perks, discounts,
  goodies, experiences, customization, mystery) + 1 test pollution
  (`e2e-test`, display_order=999) that is currently `is_active=true` and will
  show in the teen filter strip.
- `user_purchases` — schema present (`xp_spent`, `quantity`, `status`,
  `used_at_event_id`, `expires_at`, `purchase_metadata jsonb`) but **0 rows**.
  No teen has ever transacted.
- `user_collectibles` — 0 rows (intended inventory of obtained items, with
  `obtained_from`, `source_event_id`, `gifted_by_user_id`, `is_favorite`).
- `user_wishlists` — 0 rows. The `notify_on_sale` boolean exists; no surface
  in `wallet-hub-client.tsx` calls `toggleWishlist`. Functionality is
  server-side dead code from the teen's POV.
- Tokens system from migration 028 is partially deployed (`token_types`,
  `token_sources`, `token_rewards`, plus extra columns on `user_coins` for
  `premium_tokens`, `seasonal_tokens`, `pending_tokens`, `token_multiplier`,
  `total_lifetime_tokens`). No UI references these tables.

## 3. Specific findings

- **Reward types surfaced in UI**: the shop grid renders any reward returned
  by `get_shop_rewards` with the same generic `Gift` icon — it does **not**
  branch on `reward_type`. The rich `REWARD_TYPE_CONFIG` map (icon/color per
  type) and `formatRewardValue` helper in `schema.ts` are imported nowhere in
  the wallet shop tab. So a Mystery Box Gold and an Avatar Frame Gold look
  identical to the teen except for name/category badge.
- **Mystery boxes are implemented as catalog rows** (3 tiers: Bronze 1.5k,
  Silver 4k, Gold 10k XP) with `reward_value.possible_rewards` arrays declared
  in JSONB, but there is **no roll/reveal flow** in the client; `purchaseReward`
  just debits XP and writes a row in `user_purchases`. The `useReward` RPC is
  the supposed unboxing point, but no UI surface invokes it. Compliance risk:
  if/when a roll is added, the loot table determinism, transparency of odds,
  and the fact players are minors put this close to the loi 09-08 / loi 13-10
  (jeux de hasard) line. Recommend founder ruling before exposing a roll UI.
- **Stock_type handling**: the UI does not surface stock at all — no
  "X remaining" badge, no "sold out" treatment beyond the generic
  `can_purchase` boolean returned by RPC. `unique` items (Titre "Party Legend",
  Badge Vérifié) are not visually distinguished from `unlimited`. Limited
  experiences with countable scarcity (Meet & Greet 5 left, Mini Session DJ 10
  left) do not show their counts.
- **Promo / `original_xp_cost`**: schema, helper (`isOnSale`,
  `calculateDiscountPercentage`), and DB column exist; **no row uses them**
  and `wallet-hub-client.tsx` never renders a strike-through price. The
  `shop_promo_codes` table and `validatePromoCode` server action exist but the
  shop UI has no code-entry input — promos are a backend-only feature today.
- **Partner discount → redemption**: the 3 discount rewards encode
  `reward_value = {applies_to: "entry"|"bar", discount_percent: 20|30|50}`.
  These are Nivy-internal venue discounts, **not** third-party partner
  redemptions. There is no partner table, no partner branding on the reward
  card, no QR/code generation surface for the teen. `app/teen/shop/history/`
  references a `redemption_code` field on a `shop_purchases` table — that
  table does not exist in the live DB (the canonical purchases table is
  `user_purchases`, no redemption_code column). History page is broken.
- **Wishlist used?** No. `toggleWishlist` server action and `is_in_wishlist`
  flag are wired through the schema but the wallet shop tab has zero "heart"
  / "save" affordance.
- **Currency split**: XP is the only spendable currency in the shop today.
  `coins` is hard-coded to 0 in `app/teen/wallet/page.tsx` (TODO comment
  references `docs/economy.md`). Tokens (regular/premium/seasonal/gift) from
  migration 028 are entirely server-side scaffolding.
- **VIP tab** in `wallet-hub-client.tsx` shows hard-coded Bronze→Platinum tier
  ladder unrelated to any DB table; it is mock UI.

## 4. Open questions for founder

- **Mystery boxes**: is the loot table public (visible odds per rarity, like
  the EU's mandatory disclosure for loot boxes), or hidden? With minors aged
  13–17 as the audience and Morocco's restrictive stance on chance-based
  monetisation, a visible deterministic ladder ("box always contains 1 of N")
  is far safer than a hidden weighted RNG. Decision needed before unboxing UI
  ships.
- **Partner-specific rewards**: are the future TechStore-style discounts
  limited to that partner's customers/locations, and does Nivy track
  redemption (QR scan at partner POS) or just hand the teen a code? Schema
  has no `partner_id` foreign key today.
- **Refund policy**: if a partner shuts down or refuses to honour a code, what
  happens to the spent XP? `PurchaseStatusEnum` includes `refunded` but no
  RPC currently issues refunds, and there is no admin tooling exposed.
- **Token rewards (migration 028)**: are the regular/premium/seasonal/gift
  tokens still in scope, or should migration 028 be retired? Right now they
  add schema surface area with no user-facing path, which complicates the
  "wallet shows coins=0" story.
- **`e2e-test` category active in production**: should it be hidden via
  `is_active=false` or via a server-side filter? Today teens see it.

## 5. Risks

- **Compliance (loi 09-08 + minors gambling)**: mystery boxes purchasable for
  XP that was earned through engagement loops can be argued as paid
  loot-boxes since XP is convertible to DH (10:1). A regulator-friendly
  framing requires either deterministic loot or a clear "no real-money value"
  isolation of the box currency from convertible XP.
- **Empty live economy**: 0 purchases, 0 collectibles, 0 wishlists. Either
  the shop is unreachable in practice for current accounts, or no teen has
  found it. Worth instrumenting.
- **Schema/UI drift**: 11 reward types in enum, 9 in catalog, 1 visually
  rendered (generic). Featured/new badges, struck-through pricing, stock
  counters, wishlist toggle, mystery-box reveal — all unimplemented at the
  client even though backend supports them. Teens see a flat "Acheter" button.
- **Broken history page**: `app/teen/shop/history/page.tsx` reads from a
  non-existent `shop_purchases` table — will crash or return empty silently
  for any teen who navigates there.

## 6. Recommendations (read-only — for founder triage)

1. Decide mystery-box compliance posture before any reveal UI lands; if
   keeping, publish odds and isolate the unboxing currency from DH-convertible
   XP.
2. Wire the schema-defined affordances the UI ignores: per-type icons via
   `REWARD_TYPE_CONFIG`, stock counters for `limited`/`unique`, on-sale
   strike-through via `isOnSale`, wishlist heart, promo-code input.
3. Repoint `app/teen/shop/history/page.tsx` from `shop_purchases` to
   `user_purchases` (actual table) or replace with a "My Inventory" view
   driven by `getUserPurchases`.
4. Either hide the `e2e-test` reward_category in production via RPC filter or
   set `is_active=false`.
5. Decide between merging migration 028 tokens into the wallet (and shipping
   a coins/tokens UI) or removing the dead schema.
6. Introduce a `partners` table + `partner_id` FK on `shop_rewards` before
   onboarding the first external brand discount.

## 7. Source index

**Code paths**

- `app/teen/wallet/page.tsx`
- `app/teen/wallet/wallet-hub-client.tsx`
- `app/teen/shop/page.tsx`
- `app/teen/shop/checkout/page.tsx`
- `app/teen/shop/checkout/checkout-client.tsx`
- `app/teen/shop/history/page.tsx`
- `app/teen/rewards/page.tsx`
- `app/teen/coins/page.tsx`
- `app/gamification/boutique/page.tsx`
- `app/xp-shop/page.tsx`
- `gamification-system/features/shop/schema.ts`
- `gamification-system/features/shop/actions.ts`
- `gamification-system/database/migrations/004_rewards_shop.sql`
- `gamification-system/database/migrations/028_tokens_rewards_system.sql`
- `lib/payments/xp-converter.ts`

**DB tables consulted** (project `imchornjvmgmaovhypco`)

- `shop_rewards` (26 rows; columns incl. `reward_type`, `stock_type`,
  `original_xp_cost`, `vip_only`, `min_level`, `min_vip_tier`,
  `purchase_limit_per_user`, `purchase_limit_period`, `available_from`,
  `available_until`, `reward_value jsonb`)
- `reward_categories` (8 rows; 7 prod + 1 e2e-test)
- `user_purchases` (0 rows)
- `user_collectibles` (0 rows)
- `user_wishlists` (0 rows)
- `shop_promo_codes` (exists, not exercised by UI)
- `token_types` / `token_sources` / `token_rewards` (migration 028 scaffold)
