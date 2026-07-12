# LOCKED — Economy & Payments Canon

> **Read-only canonical lock.** Source-of-truth for currencies, conversion,
> shop backend, payment paths, and money-write RPCs. Resolves contradictions
> documented in `docs/economy.md`, `docs/vision/economy.md`,
> `docs/vision/rewards-economy.md`, `docs/vision/allowance-savings.md`,
> `docs/vision/payment-rails-morocco.md`,
> `docs/vision/audit-frontend-reality/E6-shop-rewards.md`,
> `docs/vision/audit-frontend-reality/B1-teen-audit.md`,
> `docs/vision/audit-prelaunch/03-money-pipeline.md`.
>
> Generated 2026-05-08. All file paths absolute, rooted at
> `C:\Users\Shadow\Desktop\NIVY`. Contradictions flagged inline with `[CONTRADICTION]`.

---

## 1. LOCKED — Currencies

Nivy has **exactly three** currency constructs. They are siloed.
Cross-currency conversion (XP↔coins, coins↔XP) is **FORBIDDEN**.

| # | Currency | Type | Source-of-truth table | Column | SQL type | Owner | Convertible? |
|---|----------|------|------------------------|--------|----------|-------|--------------|
| 1 | **XP** | Integer score | `public.user_xp` | `total_xp` | `integer` | Teen | Display-only DH equivalent (informational pill). NEVER becomes DH cash. |
| 2 | **Coins** | Prepaid e-money proxy | `public.user_coins` | `balance` | `integer` | Teen (escrowed by parent) | NEVER converts to/from XP. Refundable to parent in DH at fixed rate (§2). |
| 3 | **DH credit** | Real cash (MAD) | `public.payment_transactions` + `public.escrow_ledger` | `amount_dh` | `numeric(10,2)` | Parent (until top-up settles → escrowed for teen) | Converts to coins at top-up only (one-way deposit). Refunds reverse the same chain. |

### 1.1 Definitions

- **XP (`user_xp.total_xp`)** — engagement signal. Earned via quests, quizzes,
  streaks, defis, events, fortune wheel, creator engagement (likes, comments,
  shares received, capped). Spent on `shop_rewards` catalog via
  `purchase_reward` RPC (§3, §7). Cashback XP is credited every time coins
  are spent (§7). **PK on `teen_id`** (not `user_id`).
- **Coins (`user_coins.balance`)** — soft real-money proxy. Funded only by
  parent top-up (DH→coins at locked rate). Spent on marketplace, food orders,
  rides, mentor sessions, partner offers. **PK on `teen_id`.** Premium /
  seasonal / pending token columns exist on the same row but are
  **DEPRECATED** scaffolding (§5).
- **DH credit** — **NOT a stored teen-side balance.** DH is real money held
  in escrow by Nivy's PSP partner on behalf of the parent for the teen's
  benefit. The "DH equivalent" pill in the wallet header is a **display-only
  computation** from XP via `convertXPToDH()`; it is **NOT** redeemable
  cash and **NOT** the coin balance. UI must label it clearly to avoid
  confusion documented in audit-prelaunch/03 §1.5.

### 1.2 Locked invariants (whitepaper §29 alignment)

- **§29.1** — XP↔coin conversion path: **does not exist, must never be
  added.** No SQL function, no RPC, no API route may convert between them.
- **§29.2** — every coin movement (debit, credit, refund) **MUST** insert a
  paired `coin_transactions` row.
- **§29.3** — every coin **spend** **MUST** trigger paired XP cashback via
  `add_xp_to_user(teen_id, cashback_xp, 'cashback', source_id)`. Refunds
  **MUST** reverse the cashback.
- **§29.4** — every coin movement **MUST** insert a paired `escrow_ledger`
  row with `related_payment_id` (top-ups) or `related_spend_id` (spends).
- **§29.5** — `auth.users.id` is the canonical user identifier. Money RPCs
  take typed UUID params (`p_teen_id`, `p_parent_id`, `p_buyer_id`).
- **§29.6** — `amount_dh numeric(10,2)`, `amount_coins integer`, `amount_xp integer`.
  No floats anywhere.

---

## 2. LOCKED — Conversion rates

### 2.1 Top-up (parent DH → teen coins): **1 DH = 100 coins**

This is the canonical, locked, production-enforced rate. Used by:

- `top_up_teen` RPC (live `pg_proc` body): `v_amount_coins := (p_amount_dh * 100)::integer`
- `payout_chore_reward`, `disburse_allowance` (delegate to `top_up_teen`)
- `parent_allowances.amount_dh` × 100 displayed at `app/teen/wallet/allowance/page.tsx:53`

### 2.2 Coin → DH refund (cashout to parent): **1 coin = 0.01 DH** (inverse of 2.1)

Refunds traverse the same escrow chain in reverse. Cashout to a third party
(teen-direct cashout) is **FORBIDDEN** (regulatory: BAM Circular 6/W/2017,
Loi 09-08 — minors cannot withdraw e-money in Morocco). Only the original
funding parent receives refunds, via reversal on the original PSP rail
within 14 days.

### 2.3 XP → DH (display-only): **1 XP = 0.10 DH** (10 XP = 1 DH)

- TS source-of-truth: `lib/payments/xp-converter.ts:10` (`XP_TO_DH_RATE = 0.10`)
- Used **only** for the informational "≈ X DH" pill in the wallet header and
  the per-item DH approximation in the shop tab.
- **NOT** a redemption rate. XP is never converted to DH cash.
- Hybrid event-booking checkout (`/api/payments/hybrid`) uses this same
  constant to compute the DH discount when a teen applies XP toward a
  booking — but the XP debit and DH cash leg are accounted separately;
  this is a **discount mechanic**, not a currency conversion.

### 2.4 [CONTRADICTION RESOLVED] — `xp_payment_settings.xp_to_dh_rate = 100`

The DB row `xp_payment_settings.xp_to_dh_rate=100` (meaning "100 XP per 1 DH")
is **DEAD CONFIG**. No code path reads it. It contradicts the canonical TS
constant by 10×. **LOCKED ACTION:** delete the row OR change to `10` (XP per
DH inverse representation) to match `XP_TO_DH_RATE = 0.10`. TS constant wins;
DB row is informational at best.

> **RESOLVED (#349, 2026-07-12).** Migration
> `174_drop_dead_xp_to_dh_rate.sql` deletes the dead row. `XP_TO_DH_RATE = 0.10`
> (10 XP = 1 DH) is the sole source of truth for the display-only rate.

### 2.5 [CONTRADICTION RESOLVED] — XP→coin transitive rate

The audit (E6 §1.5, audit-prelaunch/03) flagged that combining shop banner
(1 DH = 10 XP) with allowance display (1 DH = 100 coins) implies 1 coin =
0.1 XP. **LOCKED:** there is **NO** XP↔coin rate. The display arithmetic is
coincidental and must not be exposed in any UI as a tradable conversion.

---

## 3. LOCKED — Shop architecture

### 3.1 Canonical shop backend

**Single canonical rail:** `reward_categories` + `shop_rewards` tables read
via `get_shop_rewards` RPC; spend via `purchase_reward` RPC.

| Layer | Canonical | Path |
|-------|-----------|------|
| Catalog table | `public.shop_rewards` | 26 rows live, all priced in `xp_cost` |
| Categories | `public.reward_categories` | 8 rows (1 e2e-test row to deactivate) |
| Catalog read RPC | `get_shop_rewards(p_user_id, p_filter)` | Returns affordability flags |
| Spend RPC | `purchase_reward(p_user_id, p_reward_id, p_promo_code)` | SECURITY DEFINER, atomic XP debit + `shop_purchases` insert |
| Server action | `gamification-system/features/shop/actions.ts::purchaseReward` | Sole client entry |
| UI surface | `/teen/wallet?tab=shop` (`wallet-hub-client.tsx::ShopTab`) | Sole canonical UI |
| Currency | XP only. (Coins-priced cosmetics deferred — see §3.4.) |
| Purchase ledger | `public.user_purchases` (canonical) and/or `public.shop_purchases` (legacy) | **[CONTRADICTION]** see §3.5 |

### 3.2 Canonical shop URL

**`/teen/wallet?tab=shop`** — single. All other shop entry points (`/teen/shop`,
`/teen/rewards`, `/teen/coins`, `/xp-shop`, `/gamification/boutique`) are
redirects only.

### 3.3 Hybrid event-booking checkout (separate, not "shop")

`/teen/shop/checkout` is **not the reward shop**; it is the booking checkout
for real DH-priced events. Routes through `/api/payments/hybrid` with XP
discount + DH cash via Stripe/CMI/Mobile Money. Shares no code with §3.1.

### 3.4 Coin-priced rewards (DEFERRED, not yet canonical)

Cosmetics intended to be coin-priced (avatar frames, profile customization)
are **catalog-deferred**. When wired:

- Add `coin_cost integer` (nullable) and `currency text CHECK (currency IN ('xp','coins'))` to `shop_rewards`.
- `purchase_reward` RPC dispatches by `currency`: XP path debits via
  `add_xp_to_user(-amount, ...)`, coin path delegates to `spend_teen_coins`.
- Until shipped, all 26 catalog rows remain XP-priced.

### 3.5 [CONTRADICTION] — `shop_purchases` vs `user_purchases` ledger

Two purchase ledgers exist:

- `user_purchases` — canonical per `rewards-economy.md` (0 rows live).
- `shop_purchases` — written by `purchase_reward` per `economy.md §6`.
  Read by `app/teen/shop/history/page.tsx`, with column `coins_spent` that
  **actually stores XP** (E6 Issue #1 — single most concrete user-visible
  currency-confusion defect).

**LOCKED:** canonical = `shop_purchases` (because `purchase_reward` already
writes there). **REQUIRED REMEDIATION:**

1. Rename column `shop_purchases.coins_spent` → `xp_spent`.
2. Update UI label from "Coins dépensés" to "XP dépensés", icon `Zap`.
3. Drop `user_purchases` (zero-row, zero-writer table) OR formally retire it.

---

## 4. LOCKED — Payment paths per use case

For each path: PSP options, webhook table, idempotency key, refund path.

### 4.1 Parent top-up (DH → coins escrow)

| Field | Value |
|-------|-------|
| API entry | `POST /api/parent/topup` |
| RPC | `top_up_teen(p_parent_id, p_teen_id, p_amount_dh, p_psp_provider, p_psp_reference, p_idempotency_key)` |
| PSP options (priority) | **CMI** (primary, MAD cards, gated by `cmi_payment` flag) → **M2T / Cash Plus / Wafacash** (e-money partner of record, see payment-rails-morocco §6 Option B) → **Mobile Money** (Orange Money / Inwi Money / MT Cash, gated by `mobile_money_payment`) → **Stripe** (international cards only, non-MAD) → **Cash via ambassador** (last resort, `app/api/payments/cash/create`) |
| Webhook table | `public.payment_transactions` (status: `pending` → `succeeded` → `failed`/`refunded`); paired `public.escrow_ledger`; `public.webhook_events` (S2S log) |
| Idempotency key | `payment_transactions.client_idempotency_key text UNIQUE` (per-request UUID from route) **AND** `payment_transactions.psp_reference UNIQUE` (PSP-side dedup) |
| Audit chain | `payment_transactions` → `escrow_ledger(direction='top_up', related_payment_id)` → `coin_transactions(transaction_type='topup', source_id=payment_transactions.id)` |
| Refund path | Reverse on original PSP rail within 14 days; calls inverse RPC `refund_top_up(p_payment_transaction_id, p_reason)` (TO BUILD); inserts paired `coin_transactions(transaction_type='refund')` + `escrow_ledger(direction='refund')`; reverses cashback if any was issued. |

### 4.2 Teen shop checkout (XP redemption — pure)

| Field | Value |
|-------|-------|
| API entry | Server action `purchaseReward({ rewardId, promoCode })` |
| RPC | `purchase_reward(p_user_id, p_reward_id, p_promo_code)` |
| PSP options | **NONE** — no real money. XP-only. |
| Webhook table | None. |
| Idempotency key | None required (single atomic RPC, frontend disables button after click). |
| Audit chain | `xp_transactions(type='purchase', amount=-xp_cost)` + `shop_purchases` row. |
| Refund path | `refund_booking_xp(p_purchase_id)` (migration 021) — credits XP back, marks `shop_purchases.status='refunded'`. |

### 4.3 Marketplace C2C (coins escrow + meet-method)

| Field | Value |
|-------|-------|
| API entry | `POST /api/marketplace/listings/[id]/buy` → `/api/marketplace/transactions/[id]/{confirm-receipt,dispute}` |
| RPC | `buy_listing(p_buyer_id, p_listing_id)` → `confirm_receipt(p_tx_id)` / `open_dispute(p_tx_id, p_reason)` / `resolve_dispute(p_tx_id, p_outcome)` (TO BUILD) |
| PSP options | **NONE** — coin-only economy. Meet IRL via `meet_method ∈ {school, venue_partner, public_pickup, shipping}`. |
| Webhook table | None. Internal escrow held via `marketplace_transactions.status ∈ {escrow, completed, disputed, refunded}`. |
| Idempotency key | `marketplace_transactions.id` (one tx per buy click; FOR UPDATE on listing prevents double-spend). |
| Audit chain | `coin_transactions(spend, source_type='marketplace_escrow')` + `escrow_ledger(direction='spend', related_spend_id)` (currently MISSING — see audit-prelaunch/03 P1) → on confirm: seller credit `coin_transactions(earn, source_type='marketplace_sale')` + cashback XP via canonical `_cashback_pct(partner_id=NULL)` lookup. |
| Refund path | `resolve_dispute(p_tx_id, 'refund_buyer')` — paired `coin_transactions(refund)` + `escrow_ledger(refund)` + reverses any cashback. (RPC currently MISSING — P0 build.) |

### 4.4 Mentor session booking (coins, parent-gated)

| Field | Value |
|-------|-------|
| API entry | `POST /api/teen/mentor-sessions` → parental approval queue → `POST /api/parent/mentor-sessions/[id]/approve` |
| RPC | `book_mentor_session(p_teen_id, p_mentor_id, p_slot)` enqueues `parental_approvals` only. On approve: `complete_mentor_session(p_session_id)` (TO BUILD) debits coins via `spend_teen_coins`, credits mentor via separate `mentor_payouts` ledger. |
| PSP options | **NONE** — coin-only at point of sale. Mentor cashout to mentor (DH) is a separate B2B accounts-payable rail (off-platform). |
| Webhook table | None at booking. Mentor payout settlement out-of-band. |
| Idempotency key | `mentor_sessions.id` (single row per booking). |
| Audit chain | At completion: `coin_transactions(spend, source_type='mentor_session')` + `escrow_ledger(spend)` + cashback XP + `mentor_payouts(mentor_id, amount_coins, status='pending_payout')`. |
| Refund path | Cancellation policy TBD; `cancel_mentor_session` mirrors `cancel_ride` pattern (refund_pct based on lead time). |

### 4.5 Food order (coins, partner accept/reject)

| Field | Value |
|-------|-------|
| API entry | `POST /api/teen/food/orders` → `POST /api/partner/restaurant/orders/[id]/{accept,reject}` |
| RPC | `place_food_order(p_teen_id, p_partner_id, p_items, p_total_coins)` (delegates debit to `spend_teen_coins`) → `partner_accept_food_order(p_order_id)` / `partner_reject_food_order(p_order_id, p_reason)`. |
| PSP options | **NONE** — coin-only. Partner DH settlement is separate B2B rail via `partner_transactions`. |
| Webhook table | `public.partner_transactions` (status: `pending_accept` → `accepted` → `delivered`/`refunded`). |
| Idempotency key | `food_orders.id` (one row per order). |
| Audit chain | At place: `coin_transactions(spend, source_type='food_order')` + `escrow_ledger(spend)` + cashback XP via `spend_teen_coins`. At reject: refund chain + cashback reversal (currently missing — audit-prelaunch/03 P1). |
| Refund path | `partner_reject_food_order` issues refund via paired `coin_transactions(refund)` + `escrow_ledger(refund)`. **MUST also reverse cashback XP** (currently broken — see §6 FORBIDDEN). |

### 4.6 Ride (coins, completion-debit)

| Field | Value |
|-------|-------|
| API entry | `POST /api/teen/rides/request` → `POST /api/driver/rides/[id]/complete` → `POST /api/teen/rides/[id]/cancel` |
| RPC | `request_ride` → `complete_ride(p_ride_id, p_actual_dh, p_driver_id)` → `cancel_ride(p_ride_id, p_reason)`. |
| PSP options | **NONE** — coin-only. Driver DH settlement separate B2B. |
| Webhook table | `public.ride_bookings` status. |
| Idempotency key | `ride_bookings.id`. |
| Audit chain | At completion: `coin_transactions(spend, source_type='ride')` + `escrow_ledger(spend)` + cashback XP. **CURRENTLY VIOLATES §29 — see §6.** |
| Refund path | `cancel_ride` per `refund_pct` (100 if pre-driver-assigned, 50 within window). **Currently a no-op stub — P0 fix.** |

---

## 5. DEPRECATED — sunset plan

### 5.1 Three parallel shop backends → consolidate to `purchase_reward`

| Backend | Status | Action |
|---------|--------|--------|
| `shop_items` table + `app/api/teen/shop/route.ts` (uses `deduct_user_xp`) | DEPRECATED | Return `410 Gone` from route; drop table after 30-day audit window. No UI calls it (canonical wallet shop migrated away). |
| `reward_categories` + `shop_rewards` + `purchase_reward` RPC | **CANONICAL** | Keep. Sole production rail. |
| `token_rewards` + `app/api/teen/tokens/route.ts` + `spend_tokens` RPC | DEPRECATED | Return `410 Gone` from route. Specifically delete `transfer` action (teen-to-teen P2P bypassing parental approval — security hole) and `exchange` action (premium↔regular conversion contradicts §29.1 isolation). Drop `token_types`, `token_sources`, `token_rewards`, `token_redemptions`, `token_transactions` after migration. Strip `premium_tokens`, `seasonal_tokens`, `pending_tokens`, `token_multiplier`, `total_lifetime_tokens` columns from `user_coins` (migration 028 scaffolding). |
| `xp_shop_items` table | DEPRECATED | Zero callers. Drop. |

### 5.2 Dead routes / phantom surfaces

- `app/teen/coins/coins-client.tsx` — legacy mock reading `profile.coins_balance` / `profile.coins_topup` (fields don't exist). Already redirected; **delete file** after redirect verification.
- `app/teen/shop/history/page.tsx` reading `shop_purchases.coins_spent` with "Coins dépensés" label — **rename column + relabel UI** (E6 Issue #1).
- Token transfer P2P (teen-to-teen) without parental approval — security violation. **Remove `transfer` action from tokens API.**
- Hybrid checkout's hardcoded `paymentMethod: "stripe"` (`checkout-client.tsx:47`) — CMI/MM branches dead in teen flow. **Add payment-method selector.**
- `add_coins_to_user` RPC — race-prone (no FOR UPDATE), bypasses audit invariants. **Drop or revoke EXECUTE.**
- Legacy `user_coins` SELECT policies referencing `teens.parent_id` (column doesn't exist) — dead policies, drop in favor of `user_coins_self_read`.

### 5.3 Shop history mislabel

- `shop_purchases.coins_spent` column → rename to `xp_spent`.
- UI yellow `Coins` icon → `Zap` icon.
- "Coins dépensés" label → "XP dépensés".

---

## 6. FORBIDDEN patterns

The following are **invariant violations**. Any PR introducing them must be
blocked at review.

1. **Non-atomic XP/coin debit.**
   Forbidden: `SELECT total_xp; UPDATE total_xp = current - amount` outside a
   single SECURITY DEFINER RPC with `SELECT ... FOR UPDATE`.
   Required: all debits through `add_xp_to_user`, `spend_teen_coins`,
   `purchase_reward`, or `top_up_teen`.

2. **Direct table writes for money.**
   Forbidden: any `INSERT`/`UPDATE` from API routes or client code into
   `user_xp`, `user_coins`, `coin_transactions`, `xp_transactions`,
   `escrow_ledger`, `payment_transactions`, `shop_purchases`,
   `marketplace_transactions`, `partner_transactions`, `mentor_payouts`.
   Required: route through SECURITY DEFINER RPCs only. RLS write-deny is
   enforced by absence-of-policies; **add explicit deny-default policies**
   to prevent regression.

3. **Client-set DH amounts.**
   Forbidden: trusting `req.body.price` or any client-supplied DH amount in
   the top-up route. Currently `app/api/parent/topup/route.ts` accepts
   `{coins, bonus, price}` from the body and never charges — bad actor with
   a parent account could mint coins.
   Required: server **MUST** look up DH amount from a server-side
   `topup_packages` table keyed on `package_id`; **MUST** charge PSP for
   that DH amount **before** calling `top_up_teen`; **MUST** verify PSP
   webhook confirmation (status='paid') before crediting.

4. **Hardcoded currency labels.**
   Forbidden: hardcoded "coins" / "XP" / "DH" strings in JSX with potential
   for mislabel (e.g. "Coins dépensés" reading XP).
   Required: canonical formatter `formatCurrency(amount, currency: 'xp' | 'coins' | 'dh')`
   that produces the correct icon + label + color pill. Centralized in
   `lib/payments/currency-formatter.ts` (TO BUILD).

5. **Topup packs hardcoded in TSX.**
   Forbidden: `app/parent/topup/page.tsx:101-141` hardcoded array of 4 packs.
   Required: server-side `topup_packages` table (id, coins, bonus_coins,
   price_dh, is_active) with admin CRUD and analytics attribution.

6. **XP↔coin conversion.**
   Forbidden: any function, RPC, server action, or UI that converts XP into
   coins or coins into XP. Zero such paths exist today; that **MUST** stay.

7. **Cashback omission on coin spend.**
   Forbidden: any spend RPC that does not credit cashback XP via the
   canonical `_cashback_pct(partner_id)` ladder (cashback_rules → settings
   default → 10%).
   Currently violated by `complete_ride` (no cashback) and `confirm_receipt`
   (hardcoded 10% bypassing `cashback_rules`).

8. **Cashback non-reversal on refund.**
   Forbidden: refund without paired cashback reversal.
   Currently violated by `partner_reject_food_order` (refunds coins, keeps
   cashback). **MUST** call `revoke_xp_cashback(teen_id, amount, ...)` (TO BUILD).

9. **Missing `escrow_ledger` row on coin movement.**
   Forbidden: any coin debit/credit that doesn't insert a paired
   `escrow_ledger` row with `related_payment_id` or `related_spend_id`
   populated. Currently violated by `complete_ride`, `buy_listing`,
   `confirm_receipt`, and the trigger never sets `related_spend_id` even
   when called.

10. **Money RPC granted to anon/PUBLIC.**
    Forbidden: `GRANT EXECUTE` on a money-write RPC to PUBLIC, anon, or
    authenticated without a strict `auth.uid()` identity gate.
    Currently violated: `complete_ride` and `disburse_allowance` are granted
    to PUBLIC + anon. **REVOKE immediately.**

11. **Wallet read with wrong PK column.**
    Forbidden: `app/api/teen/wallet/route.ts` filtering `eq('user_id', teenId)`
    on `user_xp` and `user_coins`. Schema column is **`teen_id`** in both.

12. **Mystery box / loot reveal in convertible XP.**
    Compliance forbids: chance-based loot purchasable with XP that has any
    DH-conversion narrative, when audience contains minors aged 13-17 (Loi
    09-08 + loi 13-10 jeux de hasard). If reveal UI ships, deterministic
    ladders only ("box always contains 1 of N visible items"); no hidden
    weighted RNG.

---

## 7. CANONICAL RPCs for money writes

All SECURITY DEFINER unless noted. All take typed UUID params. All check
`auth.uid() = p_caller_id OR auth.uid() IS NULL` (service_role) at top.
EXECUTE granted to `service_role` only (and `authenticated` where
auth.uid() check is strict).

| RPC | Signature | Writes | Notes |
|-----|-----------|--------|-------|
| `top_up_teen` | `(p_parent_id uuid, p_teen_id uuid, p_amount_dh numeric(10,2), p_psp_provider text, p_psp_reference text, p_idempotency_key text)` returns `uuid` | `payment_transactions`, `escrow_ledger(direction='top_up')`, `coin_transactions(topup)`, `user_coins.balance += amount_dh*100`, `user_coins.lifetime_earned += ...` | Live. Add `p_idempotency_key` param + UNIQUE constraint. PSP webhook is sole caller in production. |
| `spend_teen_coins` | `(p_teen_id uuid, p_amount_coins int, p_source_type text, p_source_id uuid, p_partner_id uuid)` returns `uuid` | `user_coins.balance -= amount` (FOR UPDATE), `coin_transactions(spend)`, `escrow_ledger(direction='spend', related_spend_id)`, `xp_transactions(cashback)` via `add_xp_to_user`, `partner_transactions` if partner_id | Live. **MUST** populate `related_spend_id`. |
| `add_xp_to_user` | `(p_teen_id uuid, p_amount int, p_source_type text, p_source_id uuid)` returns `bigint` | `user_xp.total_xp += amount`, `xp_transactions` row | Live. NOT SECURITY DEFINER (consumed only by other DEFINER RPCs); audit flagged for future hardening. |
| `purchase_reward` | `(p_user_id uuid, p_reward_id uuid, p_promo_code text)` returns `jsonb` | `user_xp.total_xp -= xp_cost` (FOR UPDATE), `xp_transactions(purchase)`, `shop_purchases` | Live. Sole shop debit path. |
| `payout_chore_reward` | `(p_completion_id uuid)` returns `uuid` | Delegates to `top_up_teen`; re-tags `coin_transactions.source_type='chore_payout'` | Live. |
| `disburse_allowance` | `(p_allowance_id uuid)` returns `uuid` | Delegates to `top_up_teen`; advances `next_disbursement_at`; inserts `allowance_disbursements` | Live. **REVOKE EXECUTE FROM PUBLIC, anon, authenticated** (P0). |
| `buy_listing` | `(p_buyer_id uuid, p_listing_id uuid)` returns `uuid` | `marketplace_listings` FOR UPDATE, `marketplace_transactions(escrow)`, `coin_transactions(spend)`, must add `escrow_ledger(spend)` (P1 fix) | Live, partial. |
| `confirm_receipt` | `(p_tx_id uuid)` returns `void` | `marketplace_transactions.status='completed'`, `user_coins.balance += seller_amount`, `coin_transactions(earn)`, `xp_transactions(cashback)` — **MUST** route cashback through `_cashback_pct()` not hardcode 10% | Live, partial. |
| `open_dispute` | `(p_tx_id uuid, p_reason text)` returns `void` | `marketplace_transactions.status='disputed'`, `marketplace_disputes` | Live. |
| `resolve_dispute` | `(p_tx_id uuid, p_outcome text, p_admin_id uuid)` returns `void` | per outcome: refund buyer or release to seller; paired `coin_transactions` + `escrow_ledger` | **MISSING — P0 build.** |
| `place_food_order` | `(p_teen_id uuid, p_partner_id uuid, p_items jsonb, p_total_coins int)` returns `uuid` | `food_orders`, delegates to `spend_teen_coins` | Live. |
| `partner_accept_food_order` | `(p_order_id uuid, p_partner_staff_id uuid)` returns `void` | `food_orders.status='accepted'` — **MUST remove duplicate `partner_transactions` insert** (audit-prelaunch/03 P1) | Live, defective. |
| `partner_reject_food_order` | `(p_order_id uuid, p_reason text)` returns `void` | refund chain (paired coin_tx + escrow_ledger), **MUST add cashback reversal via `revoke_xp_cashback`**, **MUST add `FOR UPDATE` on user_coins** | Live, defective. |
| `request_ride` | `(p_teen_id uuid, p_pickup geography, p_dropoff geography)` returns `uuid` | `ride_bookings(pending)` — no money movement | Live. |
| `complete_ride` | `(p_ride_id uuid, p_actual_dh numeric(10,2), p_driver_id uuid)` returns `void` | **MUST rewrite to delegate to `spend_teen_coins(amount_coins=p_actual_dh*100)`** instead of direct writes; current rate `1 DH = 1 coin` is a §29.1 violation | Live, **RED — P0 rewrite + REVOKE EXECUTE FROM PUBLIC, anon**. |
| `cancel_ride` | `(p_ride_id uuid, p_reason text)` returns `void` | **MUST implement refund** via new `refund_teen_coins` helper; currently a no-op stub | Live, **RED — P0 fix**. |
| `book_mentor_session` | `(p_teen_id uuid, p_mentor_id uuid, p_slot timestamptz)` returns `uuid` | `mentor_sessions(pending_approval)`, `parental_approvals` | Live. |
| `complete_mentor_session` | `(p_session_id uuid, p_mentor_id uuid)` returns `void` | delegates to `spend_teen_coins`; credits `mentor_payouts(pending_payout)` | **MISSING — P1 build.** |
| `rate_mentor_session` | `(p_session_id uuid, p_rating int, p_rater_id uuid)` returns `void` | `mentor_sessions.rating_*`, `mentors.rating` recompute | Live, no money. |
| `award_creator_xp` | `(p_creator_id uuid, p_signal text, p_amount int, p_source_id uuid)` returns `void` | `creator_engagement`, `add_xp_to_user` (capped per signal/day) | Live. **MUST enable RLS** on `creator_engagement` and `creator_monthly_stats` (currently disabled — critical advisory). |
| `pay_featured_creator` | `(p_post_id uuid, p_admin_id uuid)` returns `void` | `add_xp_to_user(+500)` + `top_up_teen` for +200 coins (parent-of-record source); audit log | **MISSING — P1 build** for whitepaper §19.4.6 featured-post bonus. |
| `refund_top_up` | `(p_payment_transaction_id uuid, p_reason text)` returns `void` | Reverses chain: `coin_transactions(refund)` + `escrow_ledger(refund)`, debits `user_coins.balance`, marks `payment_transactions.status='refunded'`, triggers PSP reversal | **MISSING — P0 build.** |
| `refund_teen_coins` | `(p_teen_id uuid, p_amount_coins int, p_source_type text, p_source_id uuid, p_reason text)` returns `void` | shared helper for ride cancel, food reject, dispute refund: paired coin_tx + escrow_ledger refund + optional cashback reversal | **MISSING — P0 build.** |
| `revoke_xp_cashback` | `(p_teen_id uuid, p_amount_xp int, p_source_id uuid, p_reason text)` returns `void` | `user_xp.total_xp -= amount`, `xp_transactions(type='refund', amount=-cashback_xp)` | **MISSING — P0 build.** |
| `release_savings_goal` | `(p_goal_id uuid)` returns `void` | sets `savings_goals.status='achieved'`, paired audit trail (coin_tx + escrow_ledger with `direction='savings_release'`) | **MISSING — P1 build.** |
| `lock_to_goal` | `(p_teen_id uuid, p_goal_id uuid, p_amount_coins int)` returns `void` | increments `current_saved_coins`; trigger `_savings_match_trigger` fires for parent match | Live. |
| `_cashback_pct` | `(p_partner_id uuid)` returns `int` (private helper) | reads `cashback_rules` → `xp_payment_settings.default_cashback_pct` → fallback 10 | **MISSING — P1 extract** to centralize cashback ladder used today only by `spend_teen_coins`. |

---

## 8. MISSING / PHANTOM RPCs called by UI but absent from DB

These are referenced in code or audit but **do not exist** in `pg_proc`. Calls
will 500 at runtime.

| Phantom name | Called from | Status | Resolution |
|--------------|-------------|--------|------------|
| `add_user_xp` | E6 / B1 audit references | **PHANTOM** | Use canonical `add_xp_to_user(p_teen_id, p_amount, p_source_type, p_source_id)`. |
| `deduct_user_xp` | `app/api/teen/shop/route.ts` (legacy) | **PHANTOM in canonical sense** — exists as legacy on `shop_items` rail | Deprecate route (return 410). Use `purchase_reward` for shop XP debit, or `add_xp_to_user` with negative amount. |
| `get_user_xp` | misc UI | **PHANTOM** | Read directly from `user_xp` view filtered by `teen_id` (RLS allows self-read). |
| `transfer_tokens` | `app/api/teen/tokens/route.ts` | EXISTS but **FORBIDDEN** | Remove route + RPC. Teen-to-teen P2P bypasses parental approval (security hole). |
| `exchange_tokens` | `app/api/teen/tokens/route.ts` | EXISTS but **FORBIDDEN** | Remove. premium↔regular conversion contradicts §29.1 isolation. |
| `resolve_dispute` | marketplace dispute admin path | **MISSING** | P0 build (§7). |
| `complete_mentor_session` | mentor flow | **MISSING** | P1 build (§7). |
| `pay_featured_creator` | admin creator-moderation | **MISSING** | P1 build (§7). |
| `refund_top_up` | parent refund flow | **MISSING** | P0 build (§7). |
| `refund_teen_coins` | shared refund helper | **MISSING** | P0 build (§7). |
| `revoke_xp_cashback` | refund cashback reversal | **MISSING** | P0 build (§7). |
| `release_savings_goal` | savings goal achievement | **MISSING** | P1 build (§7). |
| `_cashback_pct` | shared cashback helper | **MISSING** (logic exists inline only in `spend_teen_coins`) | P1 extract (§7). |
| `parental_approvals` table writes from `/api/payments/hybrid` | payment route writes to non-existent table | **TABLE MISSING** | Ship migration or strip the parent-gate branch (audit P0-3). |
| `payment_transactions`, `cash_settlements`, `webhook_events`, `payment_logs` tables | CMI / hybrid / cash routes INSERT into | **TABLES MISSING in live DB** per payment-rails-morocco audit | Ship migrations before any real DH rail goes live. |

---

## 9. UNRESOLVED — founder decisions

Each item lists the contradiction, the audit reference, and the locked
recommendation pending founder approval.

### 9.1 [CONTRADICTION] DH-to-coin rate vs DH-to-XP rate

- Wallet shop banner: **1 DH = 10 XP** (`xp-converter.ts`).
- Allowance display + `top_up_teen` RPC: **1 DH = 100 coins**.
- `xp_payment_settings.xp_to_dh_rate=100` (DB seed, dead): would mean **1 DH = 100 XP**.
- Implied transitive (forbidden but visible): 1 coin = 0.1 XP.

**Recommendation (LOCKED):** Keep both rates as-is — they apply to different
currencies (XP-DH is display-only at 1:10; DH-coins is real escrow at 1:100).
**Delete `xp_payment_settings.xp_to_dh_rate` row** to remove the third
contradictory representation. **Hide the DH-equivalent pill on XP** in the
wallet header (it confuses users into thinking DH equivalent = coin balance);
keep it only in the shop tab next to per-item prices where context makes it
unambiguous.

### 9.2 E-money license: Option A vs B vs C vs D

Per `payment-rails-morocco.md §6`. **LOCKED RECOMMENDATION:** **Option B + D**
— partner with M2T or Cash Plus or Wafacash as the licensed e-money issuer
of record (B), expose CMI + Mobile Money + Stripe + Cash-via-ambassador as
collection rails into the partner-held wallet (D). Stripe restricted to
non-MAD international cards (diaspora parents). **Founder must sign one EP
partnership before any real DH top-up flow goes live.**

### 9.3 Per-month top-up cap

No per-month cap exists in code/DB. **LOCKED RECOMMENDATION:** default
500 DH/month/parent, 5 000 DH/month-aggregate per teen, 200 DH per single
top-up (BAM Circular 6/W/2017 lightly-KYC'd ceiling). Parent can raise via
post-KYC. Enforce server-side in `top_up_teen` via new `parental_limits`
table.

> **RESOLVED (F6, mig 179, 2026-07-12).** `parental_limits` shipped; defaults
> seeded in `xp_payment_settings` (`max_single_topup_dh=200`,
> `parent_monthly_topup_cap_dh=500`, `teen_monthly_topup_aggregate_dh=5000`);
> `_check_topup_caps()` enforced in BOTH `top_up_teen` overloads. Month window
> = calendar month, Africa/Casablanca. Overrides are service_role-write-only
> (post-KYC raise process; a parent cannot self-raise). Smoke-tested 6/6 in a
> rolled-back transaction.

### 9.4 Per-teen spend cap, per-category whitelist

None today. **LOCKED RECOMMENDATION:** introduce
`parental_limits(parent_id, teen_id, max_monthly_dh, allowed_categories text[])`;
check in every spend RPC (`spend_teen_coins`, `buy_listing`, `book_mentor_session`,
`place_food_order`, `request_ride`).

> **PARTIALLY RESOLVED (F49, mig 179, 2026-07-12).**
> `parental_limits.max_monthly_spend_dh` enforced in `_debit_teen_coins` (the
> central debit path behind `spend_teen_coins` and `split_group_purchase` — all
> V6 rails). Most-restrictive rule across active linked parents; spend MTD does
> not re-credit on refunds (conservative). NOT yet covered: category whitelist
> (`allowed_categories` deliberately NOT shipped — the live spend pipeline
> carries no category param; shipping the column without enforcement would be
> schema theater) and the legacy direct debitors (`buy_listing`,
> `complete_ride`, `spend_tokens`/`transfer_tokens`) already flagged
> RED/deprecated in §7 — their rewrite must delegate to `_debit_teen_coins`.

### 9.5 18th birthday wallet handling

No code, no DB column. **LOCKED RECOMMENDATION:** at teen's 18th birthday,
freeze the wallet (no new top-ups, no spends) and notify parent + teen with
two options: (a) cash-out remaining balance to parent on original PSP rail,
(b) re-KYC into adult Nivy account (separate flow). 30-day grace period;
auto-cashout to parent thereafter.

### 9.6 Mystery box compliance

XP-priced loot boxes with hidden odds + DH-convertibility narrative + minor
audience = Loi 09-08/13-10 risk. **LOCKED RECOMMENDATION:** deterministic
ladder only ("box contains exactly 1 of N visible items, equiprobable"),
visible loot table, no hidden weighted RNG, until legal review. Hide the
3 mystery_box catalog rows (`is_active=false`) until ruling.

### 9.7 Coin-priced cosmetics

Currently all 26 catalog rows are XP-priced. **LOCKED RECOMMENDATION:**
introduce `currency` column on `shop_rewards`; classify
`profile_customization` (4 rows) as `coins` (natural premium feel), keep
others XP. Ship in same migration as coin-shop UI affordance.

### 9.8 Refund policy timeline

No code path for parent refund. **LOCKED RECOMMENDATION:** 14-day
no-questions-asked refund window from top-up date, **only on unspent coins**;
partial refund (refund - already-spent portion) up to day 14; after day 14
refund only on dispute. Implemented via `refund_top_up` RPC (§7).

### 9.9 Cashout for top creators

`creator_economy` migration shipped, no monetization path. **LOCKED
RECOMMENDATION:** defer to V2; align with ambassador revenue-share (single
B2B accounts-payable rail, off-platform). Until V2 cashout exists, cap
creator XP issuance; do not introduce a second teen-side payment-out rail.

### 9.10 Subscription / Premium tier

`family_subscriptions` table empty, `subscription_tiers`/`subscription_packages`
tables don't exist. **LOCKED RECOMMENDATION:** ship the empty `family_subscriptions`
table or drop it (reduce attack surface). If kept, build the tier model as a
**separate billing rail** (Stripe subscription) — does **NOT** touch `user_coins`
or `user_xp`. Premium benefit = catalog filter / multiplier on cashback, not
direct coin issuance.

### 9.11 Multi-parent matching on savings goals

`savings_goals.parent_id` is a single UUID. **LOCKED RECOMMENDATION:** one
matching parent per goal (the one who configured the match). If a second
parent wants to fund, they create a **separate goal** for the same target
(or top up the teen and let the teen lock manually). Avoids accounting
complexity.

### 9.12 Hybrid checkout payment-method selector

Frontend hardcodes `paymentMethod: "stripe"`. CMI + Mobile Money branches
unreachable. **LOCKED RECOMMENDATION (P1):** add radio selector in
`HybridCheckout` with options gated by feature flags + locale; add `phone`
input for Mobile Money path.

---

## 10. Reference index

### Source-of-truth files

- `lib/payments/xp-converter.ts:10` — XP_TO_DH_RATE = 0.10 (display-only).
- `gamification-system/features/shop/actions.ts` — canonical shop server actions.
- `app/api/parent/topup/route.ts` — parent top-up (P0 fixes pending).
- `app/api/payments/hybrid/route.ts` — hybrid event-booking checkout.
- `app/teen/wallet/wallet-hub-client.tsx` — canonical wallet UI.
- `docs/economy.md` — narrative economy doc (this canon supersedes for conflicts).

### Audit references

- `docs/vision/economy.md` — full audit, P0-1..P2-11.
- `docs/vision/rewards-economy.md` — shop catalog audit, mystery-box compliance.
- `docs/vision/allowance-savings.md` — allowance + savings spec.
- `docs/vision/payment-rails-morocco.md` — PSP options A/B/C/D matrix.
- `docs/vision/audit-frontend-reality/E6-shop-rewards.md` — three shop backends, currency confusion matrix.
- `docs/vision/audit-frontend-reality/B1-teen-audit.md` — teen surface inventory.
- `docs/vision/audit-prelaunch/03-money-pipeline.md` — RPC-by-RPC §29 invariant audit.
- `docs/vision/content-creator-economy.md` — creator XP/coin caps.

### DB references

- Project: `imchornjvmgmaovhypco` (Supabase "nivy").
- Tables (canonical money-side): `user_xp`, `user_coins`, `xp_transactions`,
  `coin_transactions`, `escrow_ledger`, `payment_transactions`,
  `shop_rewards`, `reward_categories`, `shop_purchases`,
  `marketplace_listings`, `marketplace_transactions`,
  `partner_transactions`, `food_orders`, `ride_bookings`,
  `parent_allowances`, `allowance_disbursements`, `savings_goals`,
  `savings_contributions`, `cashback_rules`, `xp_payment_settings`.
- Tables NOT live but written-to (must ship migrations): `parental_approvals`,
  `cash_settlements`, `webhook_events`, `payment_logs`, `parental_limits`,
  `topup_packages`, `mentor_payouts`.
- Tables to deprecate: `shop_items`, `xp_shop_items`, `token_types`,
  `token_sources`, `token_rewards`, `token_redemptions`, `token_transactions`.

---

*End of locked canon. Any change to currency, conversion rate, shop backend,
payment path, RPC signature, or invariant requires explicit founder approval
and a same-PR update to this file plus `lib/payments/xp-converter.ts`,
`docs/economy.md`, and the affected migration.*
