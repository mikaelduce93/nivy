# E6 — Shop / Rewards / Marketplace / Coins Audit

**Date:** 2026-05-08
**Scope:** `app/teen/shop/**`, `app/teen/rewards/**`, `app/teen/coins/**`,
`app/teen/wallet/**`, `app/marketplace/**`, `app/teen/offres/**`,
`app/teen/achievements/**`, `app/teen/passions/**`, plus the supporting
`app/api/teen/shop`, `app/api/teen/wallet`, `app/api/teen/spend`,
`app/api/teen/tokens`, `app/api/marketplace/*`, `app/api/payments/hybrid` routes.
**Method:** Read-only inspection of every page + its first-hop API/RPC, plus
cross-reference with `docs/economy.md` (the "rewards-currency-unifier"
canonical doc) and `lib/payments/xp-converter.ts`.

---

## 0. TL;DR

The audit confirms that the V1.2 sprint flagged "rewards-currency-unifier" as
"DONE" prematurely. The doc layer (`docs/economy.md`) and the surface-level
redirects (`/teen/shop`, `/teen/rewards`, `/teen/coins`, `/teen/achievements`,
`/teen/passions` all redirect to canonical hubs) are clean. **But the
underlying API and database story is still tri-rail and contradictory:**

- The wallet UI claims "XP and Coins are different currencies (no convert)" —
  yet two server endpoints (`/api/payments/hybrid`, `/api/payments/xp/route`,
  hybrid-checkout `/teen/shop/checkout`) treat XP itself as DH-redeemable at
  a fixed `XP_TO_DH_RATE = 0.10`, which **is** a conversion in everything but
  name.
- Three fully separate "shop" backends co-exist:
  1. `shop_items` + `/api/teen/shop` (uses `user_xp.total_xp`,
     `deduct_user_xp` RPC, no coins, no DH).
  2. `reward_categories` + `get_shop_rewards` RPC + `purchase_reward` RPC
     (canonical per `docs/economy.md`, used by the wallet `ShopTab`).
  3. `token_rewards` + `spend_tokens` RPC (a fourth currency family —
     "regular / premium / seasonal tokens" — exposed at `/api/teen/tokens`,
     never surfaced in the wallet UI today but live in the API).
- `/marketplace/*` runs a fourth rail entirely (`marketplace_listings.price_coins`
  / `price_dh` + `buy_listing` RPC), with its own meet-method and
  `marketplace_transactions.amount_coins` ledger.
- The fortune wheel (`/gamification/roue`) emits `xp_earned`, `coins_earned`,
  `bonus_spin`, `multiplier`, `jackpot` reward types — a fifth currency layer
  if you count multipliers — and writes via `spinWheel`/`spinWheelBonus`
  server actions independent of every rail above.
- Partner discount offers (`/teen/offres`) display **a third price unit**
  on the same surface: `discount_pct` (e.g. "-15%"), `price_dh`, and
  `price_coins`, all from one `partner_offers` table, with no normalization.

A teen can plausibly see, on the same screen or in adjacent screens, the
following price units **in the same session:**

> XP · DH · coins · partner % discount · token_cost (premium tokens) · spin
> "multipliers" · DH-equivalent of XP

Five-to-seven price units, three storage tables (`user_xp`, `user_coins`,
`token_transactions`), and at least four spend RPCs (`deduct_user_xp`,
`spend_teen_coins`, `spend_tokens`, `purchase_reward`). The
"rewards-currency-unifier" pass deduplicated **routes**, not **economies.**

---

## 1. Currency confusion audit

### 1.1 Inventory of currency surfaces

| Surface (file) | Currency unit shown | Source field / RPC |
|---|---|---|
| `app/teen/wallet/wallet-hub-client.tsx` (Coins tab) | **Coins** balance + Total XP + Cashback 7j + Day Streak + Level | `user_coins.balance`, `user_xp.total_xp`, derived |
| `app/teen/wallet/wallet-hub-client.tsx` (Shop tab) | **XP** as price + DH "≈" approximation + "10 XP = 1 DH" banner | `xp_cost` from `get_shop_rewards`, `convertXPToDH` |
| `app/teen/wallet/wallet-hub-client.tsx` (VIP tab) | **XP** thresholds (5,000 / 15,000 / 50,000) | hardcoded |
| `app/teen/shop/checkout/checkout-client.tsx` | **XP slider** + DH cash remainder ("Tu utilises N XP (X DH)") | `HybridCheckout` component, `calculateHybridPayment` |
| `app/teen/shop/history/page.tsx` | **Coins dépensés** badge (literal label) | `shop_purchases.coins_spent` (column name says coins, but the actual debit is XP — see §1.4) |
| `app/teen/coins/coins-client.tsx` (legacy mock, now redirected) | "Coins" balance, gains, top-ups | `profile.coins_balance`, `profile.coins_topup` — fields that don't exist in the canonical schema |
| `app/teen/wallet/allowance/page.tsx` | **DH** with parenthetical coin equivalent "(N coins)" | `parent_allowances.amount_dh`, hard-multiplied `× 100` (1 DH = 100 coins, an entirely different rate from the shop's 10 XP = 1 DH) |
| `app/teen/offres/page.tsx` | Mix per-offer: `discount_pct` ("-15%"), `price_dh`, `price_coins`, "+25 XP" reward heuristic | `partner_offers.{discount_pct, price_coins, price_dh}` |
| `app/marketplace/page.tsx` + `[id]/page.tsx` | **Coins OR DH** depending on which column the seller filled | `marketplace_listings.price_coins` then fallback `price_dh` |
| `app/marketplace/orders/page.tsx` | "N coins · meet_method" | `marketplace_transactions.amount_coins` |
| `app/gamification/roue/fortune-wheel-client.tsx` | XP, Coins, "bonus_spin", "multiplier ×N pendant Xh", "jackpot" | wheel RPC reward_type/reward_value blob |
| `app/api/teen/tokens/route.ts` | "regular", "premium", "seasonal" tokens with `token_multiplier`, plus `transfer_tokens` between users | `user_coins.{balance, premium_tokens, seasonal_tokens, token_multiplier}` and `token_*` tables |
| `app/teen/wallet/page.tsx` (server) | "Spendable coins = balance - locked savings_goals.current_saved_coins" | client-derived twin-currency gauge |

### 1.2 What `docs/economy.md` says (canonical)

Per §2 of `docs/economy.md`, Nivy has **three** currencies:
1. **XP** (`user_xp.total_xp`) — primary.
2. **Coins** (`user_coins.balance`) — soft, **explicitly noted as "table not yet wired"**, "wallet UI reads coins=0 as a placeholder", "no purchase path uses coins yet". This is documented as a deferred gap.
3. **DH credit** — derived, not a stored balance.

§3 fixes the conversion: `1 XP = 0.10 DH`, `MIN_XP_FOR_PAYMENT = 50`,
`PARENTAL_APPROVAL_THRESHOLD_XP = 1000`. The doc says "**XP and coins NEVER
convert.**"

### 1.3 What the code actually does (reality)

The doc is describing a **future state**, not the current one. Concrete contradictions:

1. **Coins are wired and being debited.** `app/api/teen/spend/route.ts` reads
   `user_coins.balance` and calls `spend_teen_coins` RPC; the wallet hub
   reads a non-zero `balance` from `getTeenDashboardData()`; the marketplace
   debits coins via `buy_listing`; allowances credit coins via
   `parent_allowances`. The doc's claim that "no purchase path uses coins
   yet" is false in the marketplace surface.

2. **Allowances introduce a second, undocumented conversion rate.**
   `app/teen/wallet/allowance/page.tsx` line 53 displays the literal
   formula `Math.round(Number(next.amount_dh) * 100)` to convert DH to
   coins. **1 DH = 100 coins**, contradicting the wallet shop's banner
   that ties price to XP via `1 XP = 0.10 DH` (i.e. 1 DH = 10 XP).
   So in the same teen session the rates are:
   - Shop banner: 1 DH = 10 XP
   - Allowance page: 1 DH = 100 coins
   - Implicit: 1 coin = 0.1 XP? (Not asserted anywhere; would be derivable
     only if the two rates were consistent.)

3. **`/teen/shop/checkout` directly converts XP to DH.** The hybrid checkout
   in `app/api/payments/hybrid/route.ts` debits XP from `user_xp.total_xp`
   (lines 162-198), pays the DH price difference in cash via Stripe, and
   labels this "Paiement effectué avec tes XP !" The whitepaper invariant
   §29.1 quoted in `app/api/teen/spend/route.ts` says "No XP↔coins
   conversion path" — but no invariant prevents XP↔DH conversion, which
   *is* what hybrid checkout does. Conceptually this **is** a redemption
   conversion; the system just doesn't call it that.

4. **Shop history mislabels the unit.** `app/teen/shop/history/page.tsx`
   line 167 displays "Coins dépensés" with the icon `Coins` (yellow), but
   reads from `shop_purchases.coins_spent` — and the canonical
   `purchase_reward` RPC actually debits XP (per `docs/economy.md` §6.1).
   So the column name says coins, the UI label says coins, but the debit
   is XP. **A teen reading this page will believe they spent coins when
   they actually spent XP.** This is the single most concrete confusion
   defect in the audit.

5. **`shop_purchases` table is a different ledger from `coin_transactions`.**
   The wallet's "Recent Activity" reads `coin_transactions` (per
   `/api/teen/wallet`). The shop history reads `shop_purchases`. The
   wallet's "Coins dépensés" stat in shop history will not match any line
   in the wallet's coin transactions feed.

### 1.4 Canonical economy — what it should be

The doc's intent is good and consistent: **XP is the only "shop currency",
DH is real money, coins are reserved for a future cosmetics rail.** The
canonical pieces (used by the new wallet shop tab) are:

- `reward_categories` table
- `get_shop_rewards` RPC (priced in `xp_cost`)
- `purchase_reward` RPC (debits XP)
- `convertXPToDH` for the informational "≈ X.XX DH" caption

**Everything else listed in §1.1 is residue from prior iterations and is
still active.** Specifically:
- `shop_items` + `/api/teen/shop` route — legacy, still POSTable.
- `token_rewards` + `/api/teen/tokens` route — fully separate token economy
  (premium / seasonal / multipliers / transfers between users), still
  reachable via API.
- `marketplace_listings.price_coins` — gives the "coins" label its only
  real purchase rail today, contradicting `docs/economy.md` §2.2.

### 1.5 Confusion matrix — what a teen plausibly believes

| Action | Surface | What teen sees | What actually happens |
|---|---|---|---|
| Buy reward in wallet shop | `/teen/wallet?tab=shop` | "1,000 XP" + "≈ 100 DH" | XP debit only |
| Pay event booking | `/teen/shop/checkout` | XP slider + DH | XP debit + cash via Stripe |
| Buy on marketplace | `/marketplace/listings/[id]` | "500 coins" | Coin debit via `buy_listing` |
| View shop history | `/teen/shop/history` | "Coins dépensés: 1,000" | XP was debited, coins column mislabel |
| Receive allowance | `/teen/wallet/allowance` | "50 DH (5,000 coins)" | DH→coins at 1:100 |
| Spin wheel | `/gamification/roue` | "+250 XP" or "+100 coins" or "x2 multiplier 1h" | Per-segment RPC |
| Redeem partner offer | `/teen/offres` | "-15%" or "120 DH" or "200 coins" + "+25 XP" | Click → external partner OR scan-on-site |
| Shop with tokens API | (no UI today) | n/a | premium/seasonal tokens, transferable |

---

## 2. Payment paths — real PSP, mock, or coin-only?

### 2.1 Wallet shop tab — pure XP redemption

`app/teen/wallet/wallet-hub-client.tsx::ShopTab.handlePurchase` calls the
server action `purchaseReward({ rewardId })`, which dispatches RPC
`purchase_reward(p_user_id, p_reward_id, p_promo_code)`. **No PSP involved,
no real money.** XP is debited by the RPC; the comment at line 314
explicitly says "the hybrid /api/payments/hybrid route is reserved for
booking checkout (XP + Stripe/CMI/Mobile Money) — pure XP redemption stays
on the single-currency rail." This is the cleanest path.

### 2.2 Hybrid checkout — real PSP

`app/teen/shop/checkout/checkout-client.tsx` → `/api/payments/hybrid` route
is **real**:
- Stripe integration via `lib/stripe::createCheckoutSession` (live unless
  using test keys).
- CMI integration via `lib/payments/cmi::CMIPaymentGateway`, gated by the
  `cmi_payment` feature flag.
- Mobile Money via `lib/payments/mobile-money::mobileMoneyService`, gated
  by `mobile_money_payment` flag (currently Orange Money default,
  `phone: ""` is empty in the request which means the rail is non-functional
  unless the frontend supplies a phone — and the teen checkout client
  currently always sends `paymentMethod: "stripe"`, so CMI/MM are dead code
  in the teen flow today).
- Parental approval branch: any XP usage ≥ `PARENTAL_APPROVAL_THRESHOLD_XP`
  (1,000 XP, ~100 DH) creates a `parental_approvals` row + parent
  notification. The branch is wired (lines 119-159).

**Concerns:**
- The teen checkout always passes `paymentMethod: "stripe"` (line 47), so
  the frontend exposes zero choice between Stripe / CMI / Mobile Money on
  the teen side. CMI is the dominant Moroccan PSP — this is a UX gap, not
  a bug, but it means the hybrid route's CMI/MM branches are functionally
  unreachable from this page.
- The XP debit is non-atomic with the cash payment: the route updates
  `user_xp.total_xp` and inserts `xp_transactions` (lines 162-186) *before*
  creating the Stripe session. If Stripe fails, lines 332-337 do a best-
  effort rollback (`UPDATE user_xp SET total_xp = availableXP`), but a
  concurrent XP gain between debit and rollback would be silently
  overwritten. CMI and Mobile Money paths have the same race.
- The booking flow is the only entry point. There is no "buy a generic
  thing for XP+DH" surface in the teen UI today.

### 2.3 Legacy `/api/teen/shop` POST — mock-ish

`app/api/teen/shop/route.ts` POST handler reads `shop_items`, debits XP
via `deduct_user_xp` RPC, inserts `shop_purchases`, and creates a
notification. **The GET handler returns hardcoded fallback data when the
table is empty** (`McDonald's Coupon`, `Cinema Ticket`, `Spotify 1 Month`,
`Nike Voucher`, `AirPods Pro` — all emoji, no real fulfilment). This route
is no longer wired to a teen page (the canonical shop redirected away from
it), but it is still callable and still mutates state. Dead-but-armed code.

### 2.4 Marketplace buy — coin-only + meet IRL

`app/marketplace/listings/[id]/buy-button.tsx` POSTs to
`/api/marketplace/listings/[id]/buy`, which calls `buy_listing` RPC. The
RPC presumably debits buyer coins, credits seller coins, creates a
`marketplace_transactions` row with `meet_method` (school / venue_partner
/ public_pickup / shipping). **No PSP.** Pure coin-economy. Returns
`status: 'pending_approval'` if the buyer is a teen above ceiling.

The `confirm-receipt` and `dispute` endpoints exist
(`app/api/marketplace/transactions/[id]/{confirm-receipt,dispute}`), so
the escrow flow is partially wired, but I did not read those bodies — they
are out of E6 scope's "is the buy path PSP-real?" question, which is
**no, marketplace is coin-only.**

### 2.5 Tokens API — separate economy, no UI

`app/api/teen/tokens/route.ts` is a 514-line endpoint with:
- `claim_daily` action (login bonus)
- `earn` action (`add_tokens_to_user`)
- `redeem` action (`spend_tokens` RPC + `token_redemptions` ledger)
- `transfer` action (peer-to-peer transfer between users — **a teen-to-teen
  payment system that bypasses parental approval entirely; minimum 10
  tokens, no ceiling check, only blocks self-transfers**)
- `exchange` action (premium↔regular conversion at runtime-fetched rates
  from `token_types.exchange_rate`)

**This entire economy is invisible in the teen UI today** but reachable
via the API. The `transfer` action in particular is a parental-controls
hole if any frontend ever calls it.

---

## 3. Marketplace listings — who creates, are creator-economy features wired?

### 3.1 Listing creation (`app/marketplace/sell/sell-form.tsx`)

- **Who:** any user with role `teen` or `parent` (per
  `app/api/marketplace/listings/route.ts` line 64). Mentor/partner/admin
  cannot list.
- **Validation:** server-side regex strips listings with phone numbers,
  emails, social handles (whatsapp/instagram/etc), and a blocked-categories
  regex (`weapon|gun|drug|alcohol|tobacco|vape|...`) — defence in depth on
  top of a DB regex.
- **Pricing:** the form only exposes `price_coins`, never `price_dh`,
  even though the API accepts both. So teens-selling-to-teens is forced
  into the coin economy.
- **Images:** the form has no image upload — the API accepts `images: []`
  but the form never passes it. **All listings created via this UI will
  have empty images.** The detail page falls back to "no image" placeholder.
- **Image render:** the listing detail (`app/marketplace/listings/[id]/page.tsx`)
  renders `Image src={listing.images[0]}` directly with `priority`, which
  trusts seller-provided URLs. That said, since the form can't actually
  set images, this attack surface is currently unreachable from the teen
  UI but reachable via raw API POST.

### 3.2 Creator-economy hooks

The creator-economy migration exists (`gamification-system/database/migrations/055_creator_economy.sql`)
and the `app/api/creator/leaderboard` endpoint reads
`creator_monthly_stats` (xp_earned, total_likes, total_views,
rank_overall, rank_category). But:

- The marketplace surface is **not wired** to creator stats. Listings are
  not weighted, ranked, or surfaced based on the seller's `user_seller_stats`
  beyond the trust-badge display ("★ Nivy Guarantee") on the detail page.
- The submission composer at `app/teen/create/page.tsx` posts to
  `/api/teen/feed/submissions`, which is part of the creator economy but
  is **not** the marketplace. Creator XP rewards are computed from feed
  engagement, not from marketplace sales.
- There is **no link** between marketplace sales and creator stats. A
  teen who sells 50 items on the marketplace gains 0 creator XP from that.
- Creator monetization (revenue share, payout, real cash to the teen) is
  absent. Searching for `creator_earnings`, `creator_revenue`, or
  `creator_payout` returns 0 matches in the codebase. The only file that
  uses `creator_economy` is the migration and audit notes.

**Verdict:** marketplace and creator economy are two independent silos.
The whitepaper v3.6 added "creator economy" as a lifestyle surface, but
the wired bits are: (a) submission ranking via `creator_monthly_stats`,
(b) leaderboard display. There is no monetization rail. The C2C marketplace
is a complete, separate economy with its own ledger.

### 3.3 Order history visibility per role

| Role | Surface | What they see |
|---|---|---|
| Teen buyer | `/marketplace/orders` | Their own buy + sell rows (joins on `userId = teenData.id || profileId`) |
| Teen seller | same | same |
| Parent (as buyer/seller) | same | Their own buy + sell rows (joins on `profileId`) |
| Parent (of a teen) | **none today** | The parent has no surface to view their teen's marketplace activity. There is no `/parent/marketplace` route. |
| Partner | none | not applicable |
| Admin | `/admin/marketplace/loading.tsx` exists (per Grep earlier) — admin moderation surface, not audited here |

**Gap:** parents have parental-approval gates on coin spend above ceiling,
but no read-only visibility into their teen's marketplace transactions
unless approval was triggered. Approvals are a one-time event; there is no
ongoing visibility surface on the parent side.

For shop history (XP-debit purchases), `app/teen/shop/history/page.tsx`
shows the teen their own; there is no `/parent/shop-history` for the
parent role.

---

## 4. Routes and redirects map

| Route | Status | Behavior |
|---|---|---|
| `/teen/shop` | redirect | → `/teen/wallet?tab=shop` |
| `/teen/shop/checkout` | active | Hybrid XP+DH booking checkout (requires `?booking=<uuid>`) |
| `/teen/shop/history` | active | XP/coin purchase history (mislabel issue, §1.4) |
| `/teen/rewards` | redirect | → `/teen/wallet?tab=shop` |
| `/teen/coins` | redirect | → `/teen/wallet` (was hardcoded mock) |
| `/teen/wallet` | active | Hub: tabs `coins / shop / badges / vip` |
| `/teen/wallet/allowance` | active | Allowance schedule + history (uses 1 DH = 100 coins implicit conversion) |
| `/teen/achievements` | redirect | → `/gamification/collections` |
| `/teen/passions` | redirect | → `/teen/quests?tab=creative` |
| `/teen/offres` | active | Personalized partner offers (recommend_for_teen RPC) |
| `/marketplace` | active | C2C feed (filters: category, city, max_price, search) |
| `/marketplace/listings/[id]` | active | Detail + Buy CTA |
| `/marketplace/sell` | active | Create listing (coins-only pricing in form) |
| `/marketplace/my-listings` | active | Own listings |
| `/marketplace/orders` | active | Buy + sell history (own only) |
| `/teen/marketplace` | does not exist | The marketplace lives at `/marketplace`, not `/teen/marketplace` |

---

## 5. Scoring

### Shop flow score: **5/10**

Strengths (+):
- Canonical wallet+shop tab is clean: the wallet UI uses `get_shop_rewards`
  RPC, the purchase action uses `purchase_reward` RPC, the price tags show
  XP + DH approximation, the affordability banner explains "≈ X DH to spend".
- Hybrid checkout has real PSP integration (Stripe live) with parental
  approval gating for high-value XP usage.
- The redirect map is consistent: `/teen/shop`, `/teen/rewards`, `/teen/coins`,
  `/teen/achievements`, `/teen/passions` all redirect to canonical hubs.
- Promo codes, wishlist, categories are all wired through `gamification-system/features/shop/actions.ts`.

Weaknesses (-):
- Three parallel shop backends still callable: `shop_items`+`/api/teen/shop`,
  `reward_categories`+RPC, `token_rewards`+`/api/teen/tokens`. Only the second
  is canonical.
- Shop history mislabels XP-debit as "Coins dépensés" with a coin icon (§1.4).
- Hybrid checkout's CMI/MM branches are unreachable from the teen UI
  (frontend hardcodes `paymentMethod: "stripe"`).
- XP debit in hybrid is non-atomic with the cash payment, with race-prone
  rollback paths.
- VIP tab is fully hardcoded (Bronze/Silver/Gold/Platinum tiers, "5,000 XP
  to Silver" hardcoded with `Progress value={30}`); no DB binding.
- Badges tab combines real `user_achievements` data with hardcoded "locked"
  placeholder badges (`locked-1`, `locked-2`, `locked-3`).

### Marketplace flow score: **6/10**

Strengths (+):
- C2C end-to-end: list → discover → detail → buy → orders → confirm/dispute
  endpoints all exist.
- Strong server-side validation regex (no contact info, no blocked
  categories) with defence-in-depth at API + DB.
- Trust badge surfacing (`user_seller_stats.trust_badge → "Nivy Guarantee"`).
- Meet-method enum constrains in-person handoff to `school | venue_partner |
  public_pickup | shipping` — explicit teen-safety design.
- View Transitions morph anchors between feed and detail (TICKET-024 polish).
- Parental-approval branch on `buy_listing` (teen above ceiling → pending).
- Distinct ledgers: `marketplace_listings`, `marketplace_transactions`,
  `user_seller_stats` are well-shaped.

Weaknesses (-):
- **Image upload missing from sell form** — created listings have
  `images: []`, the entire visual layer is an empty-state placeholder
  ("no image"). API accepts images but the only frontend doesn't send them.
- Pricing forced to coins-only in the form, while the API accepts coins or
  DH — inconsistent capability story.
- No parent-side visibility into teen marketplace activity.
- No link to creator economy (a teen building a brand on submissions
  cannot tie it to their marketplace store).
- Detail page renders `Image src={images[0]}` with `priority` from
  seller-provided URLs — image-host trust attack surface (mitigated only
  by the form not allowing image input today).
- The view-counter increment runs in a non-idempotent UPDATE on every page
  load (line 28 of detail page) — counts inflated by the seller's own
  views and refreshes.

---

## 6. Top 5 issues

### Issue #1 — "Coins dépensés" label on XP debits in shop history (HIGH severity, currency confusion)

**File:** `app/teen/shop/history/page.tsx:166-172`

The shop history page displays:
```
"Coins dépensés"  →  {stats.coinsSpent.toLocaleString()}
```
with a yellow `Coins` icon, reading from `shop_purchases.coins_spent`. But
the canonical purchase RPC `purchase_reward` (per `docs/economy.md` §6.1)
debits XP. The teen sees a number labeled "coins" that is actually their
XP spend. This is the most concrete, user-visible currency-confusion defect
in the audit and exactly what the V1.2 sprint's "rewards-currency-unifier"
was supposed to eliminate.

**Recommended fix:** rename column to `xp_spent`, change UI label to "XP
dépensés", change icon to `Zap`. (Or, if the column truly stores coins
because the legacy `/api/teen/shop` POST writes to the same table at
line 133 with `xp_spent: item.xp_cost` — there's a column-name mismatch
inside the codebase too: the legacy route inserts `xp_spent` while the
history page reads `coins_spent`. They cannot both be correct.)

### Issue #2 — Three parallel shop backends still active (HIGH, architectural debt)

**Files:** `app/api/teen/shop/route.ts` (legacy `shop_items`),
`gamification-system/features/shop/actions.ts` (canonical
`reward_categories`+`get_shop_rewards`+`purchase_reward`),
`app/api/teen/tokens/route.ts` (parallel `token_rewards`+`spend_tokens`
+ premium/seasonal token economy with peer transfers).

`docs/economy.md` claims the unification is done. In practice three
separate shop economies exist with three separate ledgers
(`shop_purchases`, `coin_transactions`, `token_redemptions`), three
spend RPCs (`deduct_user_xp`, `spend_teen_coins`/`purchase_reward`,
`spend_tokens`), and the token economy adds a peer-to-peer transfer rail
that bypasses parental approval. The wallet UI uses only the canonical
rail today, but the others are reachable via raw API POSTs and have not
been deprecated or returned 410-Gone.

**Recommended fix:** sunset `/api/teen/shop` POST and `/api/teen/tokens`
(at least the `transfer` and `exchange` actions) by returning 410 with a
deprecation header, or delete them. Until then, the "rewards-currency-
unifier" status of DONE is misleading.

### Issue #3 — Two undocumented currency conversion rates in the same UI (HIGH, currency confusion)

**Files:** `app/teen/wallet/wallet-hub-client.tsx` (banner: "1 XP = 0.10
DH (10 XP = 1 DH)") vs `app/teen/wallet/allowance/page.tsx:53` (formula:
`Math.round(Number(amount_dh) * 100)` → 1 DH = 100 coins).

If the teen does mental arithmetic across these two adjacent pages, they
will derive that 1 coin = 0.1 XP — which is asserted nowhere and may not
be the intended design. `docs/economy.md` §2.2 explicitly says "XP and
coins NEVER convert", but the allowance page is implicitly defining a
conversion (DH→coins) that, combined with the shop banner (XP↔DH),
defines a transitive XP↔coins rate.

**Recommended fix:** either define the canonical rate in
`lib/payments/xp-converter.ts` and surface it consistently, or drop the
parenthetical "(N coins)" from the allowance page and avoid the
conversion entirely (allowances credit coins via the API anyway — the UI
is just labeling them, not deriving them).

### Issue #4 — Marketplace sell form has no image upload (HIGH, UX/data integrity)

**File:** `app/marketplace/sell/sell-form.tsx`

The form has no `<input type="file">`, no upload component, and never
sends an `images` field. Every listing created via the only available
seller UI has `images: []`. The marketplace feed and detail pages handle
this gracefully (placeholder), but the user experience is "post a
photo-less classified ad", which kills conversion vs. any e-commerce
benchmark. The `/api/upload` endpoint exists (in app/api/upload), so the
infra is there; the form just doesn't use it.

**Recommended fix:** wire the existing upload endpoint into the sell form.
Probably a 1-day ticket given that the trust-badge + seller-stats
infrastructure is already wired — the form is the bottleneck.

### Issue #5 — Hybrid checkout's CMI/MM are dead code in the teen flow (MEDIUM, regional UX)

**File:** `app/teen/shop/checkout/checkout-client.tsx:47`

Hardcodes `paymentMethod: "stripe"`. CMI is the dominant Moroccan PSP —
not exposing it on the teen booking checkout means Moroccan teens without
international cards are blocked on the cash remainder side of any hybrid
payment. `app/api/payments/hybrid/route.ts` has full CMI and Mobile Money
branches, gated by feature flags `cmi_payment` and `mobile_money_payment`
and ready to use. The teen-side selector simply doesn't exist.

**Recommended fix:** add a payment-method picker to `HybridCheckout`
component that flips `paymentMethod` based on user selection + flag
availability. Mobile Money also requires a `phone` field which is
currently hardcoded to `""` server-side — that needs a UI input too.

---

## 7. Cross-references

- `docs/economy.md` — the canonical doc; this audit shows it is aspirational rather than descriptive.
- `lib/payments/xp-converter.ts` — sole source of `XP_TO_DH_RATE = 0.10`.
- `gamification-system/database/migrations/055_creator_economy.sql` — wired but unused for monetization.
- `docs/audits/orchestrator-2026-05/RECETTE.md:23` — claims `rewards-currency-unifier` is DONE; this audit disputes that.
- Prior audit `docs/vision/audit-prelaunch/05-lifestyle-surfaces.md` — likely overlaps, not re-read here.

---

## 8. Files of interest (absolute paths)

- C:\Users\Shadow\Desktop\NIVY\app\teen\shop\page.tsx (redirect)
- C:\Users\Shadow\Desktop\NIVY\app\teen\shop\checkout\page.tsx
- C:\Users\Shadow\Desktop\NIVY\app\teen\shop\checkout\checkout-client.tsx
- C:\Users\Shadow\Desktop\NIVY\app\teen\shop\history\page.tsx (Issue #1 lives here)
- C:\Users\Shadow\Desktop\NIVY\app\teen\rewards\page.tsx (redirect)
- C:\Users\Shadow\Desktop\NIVY\app\teen\coins\page.tsx (redirect)
- C:\Users\Shadow\Desktop\NIVY\app\teen\coins\coins-client.tsx (legacy mock, dead)
- C:\Users\Shadow\Desktop\NIVY\app\teen\wallet\page.tsx
- C:\Users\Shadow\Desktop\NIVY\app\teen\wallet\wallet-hub-client.tsx
- C:\Users\Shadow\Desktop\NIVY\app\teen\wallet\allowance\page.tsx (Issue #3)
- C:\Users\Shadow\Desktop\NIVY\app\teen\offres\page.tsx
- C:\Users\Shadow\Desktop\NIVY\app\teen\achievements\page.tsx (redirect)
- C:\Users\Shadow\Desktop\NIVY\app\teen\passions\page.tsx (redirect)
- C:\Users\Shadow\Desktop\NIVY\app\marketplace\page.tsx
- C:\Users\Shadow\Desktop\NIVY\app\marketplace\listings\[id]\page.tsx
- C:\Users\Shadow\Desktop\NIVY\app\marketplace\listings\[id]\buy-button.tsx
- C:\Users\Shadow\Desktop\NIVY\app\marketplace\sell\page.tsx
- C:\Users\Shadow\Desktop\NIVY\app\marketplace\sell\sell-form.tsx (Issue #4)
- C:\Users\Shadow\Desktop\NIVY\app\marketplace\my-listings\page.tsx
- C:\Users\Shadow\Desktop\NIVY\app\marketplace\orders\page.tsx
- C:\Users\Shadow\Desktop\NIVY\app\api\teen\shop\route.ts (legacy, still callable)
- C:\Users\Shadow\Desktop\NIVY\app\api\teen\wallet\route.ts
- C:\Users\Shadow\Desktop\NIVY\app\api\teen\spend\route.ts
- C:\Users\Shadow\Desktop\NIVY\app\api\teen\tokens\route.ts (Issue #2)
- C:\Users\Shadow\Desktop\NIVY\app\api\marketplace\listings\route.ts
- C:\Users\Shadow\Desktop\NIVY\app\api\marketplace\listings\[id]\buy\route.ts
- C:\Users\Shadow\Desktop\NIVY\app\api\marketplace\orders\route.ts
- C:\Users\Shadow\Desktop\NIVY\app\api\payments\hybrid\route.ts (Issue #5)
- C:\Users\Shadow\Desktop\NIVY\app\api\creator\leaderboard\route.ts
- C:\Users\Shadow\Desktop\NIVY\lib\payments\xp-converter.ts
- C:\Users\Shadow\Desktop\NIVY\gamification-system\features\shop\actions.ts
- C:\Users\Shadow\Desktop\NIVY\app\gamification\roue\fortune-wheel-client.tsx
- C:\Users\Shadow\Desktop\NIVY\docs\economy.md (canonical doc)
