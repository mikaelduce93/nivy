# Economy + Payments compliance

## Score: 38/100

## Launch status: NO-GO — money pipeline has multiple P0 invariant violations (forbidden client-trusted DH amount in top-up, hardcoded packages, phantom RPCs that 500 silently, direct money-table writes that bypass §29, currency mislabel that lies to users about what was debited). Production top-up cannot ship until P0 list is closed.

## Findings count: P0=11, P1=8, P2=5, P3=2

## Top 3 P0

1. **CANON-ECON-001** — `app/api/parent/topup/route.ts` accepts `{teenId, amount_dh}` correctly server-side BUT the live `components/parent/topup-form.tsx` sends `{teenId, packageId, coins, bonus, price}` (canon §6 FORBIDDEN #5: client-set DH; §1.4 contract `{teenId, amount_dh}` only). The route reads only `amount_dh|amountDh`, silently ignoring `coins`/`bonus`/`price`/`packageId` — pack 2 (250 coins for 100 DH, +25 bonus) currently credits **NOTHING** because no `amount_dh` field is sent. Top-up is broken end-to-end.

2. **CANON-ECON-002** — `app/api/teen/shop/route.ts` calls phantom `deduct_user_xp` RPC, reads `user_coins.balance` via wrong PK column `user_id` (canon §6 FORBIDDEN #11), inserts directly into `shop_purchases` and `notifications` (canon §6 FORBIDDEN #2: direct money table write). Canon §5.1 mandates returning 410 Gone — route is still live.

3. **CANON-ECON-008** — `app/api/payments/hybrid/route.ts:164-186` and `app/api/payments/xp/route.ts:221-243` perform **direct `UPDATE user_xp` + `INSERT xp_transactions`** (read-then-write, no FOR UPDATE, no SECURITY DEFINER RPC). Canon §6 FORBIDDEN #1 + #2: non-atomic XP debit + direct write. Race-prone and bypasses audit invariants.

## Findings (JSON blocks)

```json
{
  "id": "CANON-ECON-001",
  "domain": "economy-payments",
  "severity": "P0",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§6 FORBIDDEN #3 + #5: top-up form contract is `{teenId, amount_dh}` only; client-set DH amounts and hardcoded TSX packs are forbidden. INDEX.locked cross-cut: 'Top-up payload = {teenId, amount_dh} only'.",
  "code_files": [
    "components/parent/topup-form.tsx:56-63",
    "app/parent/topup/page.tsx:121-162",
    "app/api/parent/topup/route.ts:26-50"
  ],
  "current_behavior": "Form posts {parentId, teenId, packageId, coins, bonus, price} — none of which is amount_dh. The route's TopupBody interface only reads amount_dh|amountDh, so amountDh=NaN at line 43 → 400 'Données manquantes' for every legitimate parent click on the canonical UI. Even if it were patched to read body.price, that value is client-trusted (canon §6 FORBIDDEN #3). The 4 packs (line 121-162 of page.tsx) are hardcoded in TSX rather than read from a server-side topup_packages table (canon §6 FORBIDDEN #5).",
  "why_it_matters": "Two consequences: (a) production top-up is currently 100% broken on the canonical /parent/topup surface; no parent can credit coins. (b) If patched to read body.price/coins, a malicious parent could mint coins by sending {coins:99999, price:0.01} — server has no DH ground truth. Combined with the absence of a real PSP charge before crediting, this is mint-on-demand.",
  "recommended_fix": "Step 1: ship `topup_packages(id uuid PK, name text, amount_dh numeric(10,2), bonus_coins int, is_active bool, sort_order int)` migration; seed 4 rows mirroring the current TSX. Step 2: change form payload to `{teenId, packageId}` only. Step 3: route looks up package by id, derives `amount_dh` server-side, ALSO requires PSP confirmation (Stripe session.id paid OR Cash Plus webhook ref) before calling top_up_teen. Step 4: revert the 5-arg top_up_teen overload to require p_psp_provider/p_psp_reference at all callsites.",
  "blast_radius": "S — single route + single form + 1 migration. ~3 hours.",
  "implementation_complexity": "S",
  "test_required": [
    "POST /api/parent/topup with {teenId, packageId} only succeeds and credits server-derived amount_dh × 100 coins",
    "POST with raw {coins, price, bonus} returns 400",
    "POST with packageId of inactive package returns 400",
    "PSP confirmation gate: route refuses to credit if psp_reference missing"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-002",
  "domain": "economy-payments",
  "severity": "P0",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§5.1 — `app/api/teen/shop/route.ts` (uses `deduct_user_xp` on `shop_items` rail) DEPRECATED → 410 Gone. §6 FORBIDDEN #2 (direct write to shop_purchases), #11 (wrong PK col on user_xp), #1 (non-atomic debit). §8 — `deduct_user_xp` is PHANTOM in canonical sense.",
  "code_files": [
    "app/api/teen/shop/route.ts:17-21",
    "app/api/teen/shop/route.ts:97-138"
  ],
  "current_behavior": "GET reads shop_items table (DEPRECATED rail per canon §5.1). POST: queries user_xp WHERE user_id=teenId (canon: column is `teen_id`, not `user_id` — query returns nothing, userXp=0 → balance check passes for any teen with no XP), calls phantom RPC `deduct_user_xp` (RPC exists on legacy rail but not in canon), then directly INSERTs into `shop_purchases` and `notifications`. Three separate violations in one POST.",
  "why_it_matters": "Two parallel shop backends are live; teen UI may hit either. The legacy rail bypasses §29 invariants (no escrow_ledger, no cashback). The PK mismatch silently corrupts: the 'XP check' compares against 0, and the eventual deduct_user_xp call may succeed on a different schema than the canon one — net result is the teen's XP could be debited twice or the shop_items purchase happens without any XP deduction. Either way, audit cannot reconcile.",
  "recommended_fix": "Replace GET + POST handlers with `return new NextResponse(null, { status: 410 })`. Migrate any remaining UI callers to the canonical `/teen/wallet?tab=shop` surface (which uses `purchase_reward` server action via `gamification-system/features/shop/actions.ts`). After 30-day audit window, drop `shop_items` table and `deduct_user_xp` RPC.",
  "blast_radius": "S — kill route, ensure no UI callsites remain. The wallet ShopTab is the canonical caller.",
  "implementation_complexity": "S",
  "test_required": [
    "GET /api/teen/shop returns 410",
    "POST /api/teen/shop returns 410",
    "Codebase grep confirms zero non-test callers of the route",
    "Wallet ShopTab purchase still succeeds via purchase_reward RPC"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-003",
  "domain": "economy-payments",
  "severity": "P0",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§5.1 — `token_rewards` + `transfer_tokens` + `exchange` actions DEPRECATED → 410 Gone. §6 FORBIDDEN #6: 'XP↔coin conversion'. §8 — exchange_tokens EXISTS but FORBIDDEN (premium↔regular conversion contradicts §29.1 isolation). Transfer P2P bypasses parental approval (security hole).",
  "code_files": [
    "app/api/teen/tokens/route.ts:412-418",
    "app/api/teen/tokens/route.ts:441-501",
    "app/api/teen/tokens/route.ts:325-332"
  ],
  "current_behavior": "Route still mounts the entire token rail. POST action='transfer' calls `transfer_tokens` RPC enabling teen-to-teen P2P bypassing parental approval (canon §5.1 explicit security violation). action='exchange' calls `spend_tokens` then `add_tokens_to_user` with type conversion premium↔regular — a currency conversion that violates §29.1 isolation. action='redeem' calls phantom `spend_tokens` and writes directly to `token_redemptions`. GET `case 'rewards'` reads DEPRECATED `token_rewards` table. Multiple `from('user_coins').select('premium_tokens, seasonal_tokens, token_multiplier')` — DEPRECATED columns (canon §1.1: 'premium / seasonal / pending token columns are DEPRECATED scaffolding').",
  "why_it_matters": "Live exposed surface for teen-to-teen value transfer with zero parental gate; minor age, Loi 09-08 risk. Live exposed cross-currency conversion (regular↔premium token type) which canon mandates as forbidden. Both actions are documented in canon as security holes that must be removed before launch.",
  "recommended_fix": "Replace entire route with 410 Gone. Drop tables `token_types`, `token_sources`, `token_rewards`, `token_redemptions`, `token_transactions`, `token_transfers`. Drop columns `premium_tokens`, `seasonal_tokens`, `pending_tokens`, `token_multiplier`, `total_lifetime_tokens` from `user_coins`. Drop RPCs `spend_tokens`, `add_tokens_to_user`, `transfer_tokens`, `claim_daily_bonus` (move daily-bonus to canonical XP grant if needed).",
  "blast_radius": "M — route + 5 tables + 5 columns + 4 RPCs. Verify no UI surface depends on token_* — the canon explicitly says wallet UI migrated to `purchase_reward` already.",
  "implementation_complexity": "M",
  "test_required": [
    "POST /api/teen/tokens with any action returns 410",
    "GET /api/teen/tokens returns 410",
    "Codebase has zero non-test callers of /api/teen/tokens",
    "user_coins schema no longer has premium_tokens column"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-004",
  "domain": "economy-payments",
  "severity": "P0",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§5.2 + §8 — `add_user_xp` is PHANTOM. ALWAYS call `add_xp_to_user(p_teen_id, p_amount, p_source_type, p_source_id)`. INDEX.locked cross-cut: '`add_user_xp` is phantom (use `add_xp_to_user`)'.",
  "code_files": [
    "app/api/teen/quests/complete/route.ts:94-99",
    "app/api/auth/validate-teen/route.ts:265-271",
    "app/api/partner/apply-discount/route.ts:188-193"
  ],
  "current_behavior": "Three separate routes call `supabase.rpc('add_user_xp', { p_user_id, p_xp_amount, p_source, p_source_id })`. Canon RPC is `add_xp_to_user(p_teen_id, p_amount, p_source_type, p_source_id)`. The phantom call returns an error which is swallowed by try/catch in all three sites — the user-facing flow proceeds (quest marked complete, teen registration succeeds, discount applied) but no XP is recorded. Optimistic UI then displays the XP gain that never happened.",
  "why_it_matters": "The single highest-impact production bug per audit-frontend-reality/E2 Issue B1: 'optimistic UI tells the teen they earned XP, but no XP is actually recorded.' Affects quest completion (the core retention loop), parent verification reward, and partner-discount cashback. Trust-eroding silent failure that compounds daily.",
  "recommended_fix": "Replace all three callsites with `supabase.rpc('add_xp_to_user', { p_teen_id, p_amount, p_source_type, p_source_id })`. Remove the `try/catch` swallowing pattern OR change to `console.error` + Sentry capture. Ship a SQL alias `CREATE OR REPLACE FUNCTION add_user_xp(p_user_id uuid, p_xp_amount int, p_source text, p_source_id uuid) RETURNS jsonb LANGUAGE sql AS $$ SELECT add_xp_to_user(p_user_id, p_xp_amount, p_source::varchar, NULL::varchar, p_source_id, NULL); $$` as belt-and-suspenders to catch any future phantom callers.",
  "blast_radius": "S — 3 callsites. ~30 minutes.",
  "implementation_complexity": "S",
  "test_required": [
    "Complete a quest as teen → `xp_transactions` row inserted, `user_xp.total_xp` increased",
    "Parent verifies a teen → parent's user_xp +50",
    "Partner-discount apply → teen's user_xp +floor(amount/10)",
    "grep confirms zero remaining `add_user_xp` references in app/api"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-005",
  "domain": "economy-payments",
  "severity": "P0",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§6 FORBIDDEN #11: 'Wallet read with wrong PK column. Forbidden: app/api/teen/wallet/route.ts filtering eq(user_id, teenId) on user_xp and user_coins. Schema column is teen_id in both.'",
  "code_files": [
    "app/api/teen/wallet/route.ts:24",
    "app/api/teen/wallet/route.ts:31",
    "app/api/teen/wallet/route.ts:38",
    "app/api/teen/wallet/route.ts:45",
    "app/api/teen/wallet/route.ts:64"
  ],
  "current_behavior": "Five separate `.eq('user_id', teenId)` calls against `user_coins`, `user_xp`, `user_streaks`, `coin_transactions`, `user_achievements`. Canon §1.1 confirms `user_xp` and `user_coins` PK is `teen_id`. Live result: wallet API returns coins=0, xp.total=0, level=1, transactions=[] for every teen — fundamental wallet display is broken.",
  "why_it_matters": "Whatever this route powers shows zeros, fueling the 'XP not recorded' user complaint cycle. May also break level-progress badge logic. Teen has no proof their XP exists.",
  "recommended_fix": "Replace all 5 occurrences with `.eq('teen_id', teenId)` for user_coins/user_xp/coin_transactions. user_streaks PK can stay user_id if its schema differs; verify. Add a unit test reading a fixture teen with known balance.",
  "blast_radius": "XS — 5 line edits.",
  "implementation_complexity": "XS",
  "test_required": [
    "GET /api/teen/wallet for a teen with seeded balance returns the actual balance",
    "Returned `xp.total` matches user_xp.total_xp by teen_id",
    "Returned `transactions` non-empty for a teen with coin_transactions rows"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-006",
  "domain": "economy-payments",
  "severity": "P0",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§3.5 + §5.3 — `shop_purchases.coins_spent` actually stores XP; UI label 'Coins dépensés' with yellow Coins icon is the single most concrete user-visible currency-confusion defect. Canon §6 FORBIDDEN #4: 'Hardcoded currency labels' that mislabel.",
  "code_files": [
    "app/teen/shop/history/page.tsx:51",
    "app/teen/shop/history/page.tsx:58",
    "app/teen/shop/history/page.tsx:166",
    "app/teen/shop/history/page.tsx:170",
    "app/teen/shop/history/page.tsx:300-303"
  ],
  "current_behavior": "Page reads `shop_purchases.coins_spent` (which `purchase_reward` RPC populates with XP cost), aggregates as `stats.coinsSpent`, displays under label 'Coins dépensés' with yellow `<Coins />` icon. Every per-row line reuses the same Coins icon at line 301-303. Every reward in the canonical catalog is XP-priced (canon §3.1 row).",
  "why_it_matters": "Teen sees 'Coins dépensés: 1000' after spending 1000 XP. The wallet header shows the same teen has the same coin balance (untouched). Teen cannot reconcile the numbers; trust + confusion. Documented in canon as Issue #1 of E6 audit.",
  "recommended_fix": "Migration: rename `shop_purchases.coins_spent` → `xp_spent`. Update `purchase_reward` RPC body to write `xp_spent`. Update page.tsx: replace `coins_spent` → `xp_spent`, label 'Coins dépensés' → 'XP dépensés', icon `Coins` → `Zap`, color class `warning` → use the canonical XP color token.",
  "blast_radius": "S — 1 migration + 1 RPC body update + 1 page.",
  "implementation_complexity": "S",
  "test_required": [
    "Migration ALTER COLUMN renames cleanly; RPC purchase_reward inserts using the new column name",
    "Shop history shows 'XP dépensés' label with Zap icon",
    "Sum of xp_spent on a fixture teen equals the teen's xp_transactions(type='purchase') sum"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-007",
  "domain": "economy-payments",
  "severity": "P0",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§7 — `cancel_ride`: 'MUST implement refund via new refund_teen_coins helper; currently a no-op stub'. §4.6 — refund per refund_pct (100 if pre-driver-assigned, 50 within window). §29.4: every coin movement MUST insert paired escrow_ledger row.",
  "code_files": [
    "gamification-system/database/migrations/057_transport_mobility_rpcs.sql:107-117",
    "app/api/teen/rides/[id]/cancel/route.ts:23-30"
  ],
  "current_behavior": "`cancel_ride` RPC computes `v_refund_pct` (100 or 50), updates ride_bookings.status='cancelled', then has a TODO comment 'Wave B follow-up: actual coin refund honoring v_refund_pct' and returns. No coin_transactions, no user_coins update, no escrow_ledger refund row. The /api/teen/rides/:id/cancel route invokes this stub.",
  "why_it_matters": "A teen who cancels a coin-paid ride loses their coins forever. Direct money loss for users. Canon labels this RED—P0.",
  "recommended_fix": "Build `refund_teen_coins(p_teen_id uuid, p_amount_coins int, p_source_type text, p_source_id uuid, p_reason text)` SECURITY DEFINER helper that: locks user_coins FOR UPDATE, credits balance, inserts coin_transactions(refund), inserts escrow_ledger(direction='refund', related_spend_id), and (if a cashback was originally given) reverses XP via revoke_xp_cashback. Wire into cancel_ride after the status flip. Add a regression test: teen books ride, cancels >60min before, balance restored to 100% pre-spend.",
  "blast_radius": "M — new RPC + cancel_ride patch + test fixtures.",
  "implementation_complexity": "M",
  "test_required": [
    "Cancel ride scheduled >60min later → 100% coin refund + xp_transactions(cashback_reversal) row",
    "Cancel ride scheduled within 60min → 50% coin refund",
    "Refund inserts paired escrow_ledger(direction='refund') with related_spend_id",
    "Refund is idempotent: second cancel call does not double-refund"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-008",
  "domain": "economy-payments",
  "severity": "P0",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§6 FORBIDDEN #1: 'Non-atomic XP/coin debit' — debits MUST be in single SECURITY DEFINER RPC with FOR UPDATE. §6 FORBIDDEN #2: 'Direct table writes for money' — INSERT/UPDATE on user_xp, xp_transactions from API routes is forbidden, must go through RPCs. §29.4: every coin/xp movement paired with escrow_ledger.",
  "code_files": [
    "app/api/payments/hybrid/route.ts:164-186",
    "app/api/payments/hybrid/route.ts:332-337",
    "app/api/payments/xp/route.ts:221-243",
    "app/api/payments/xp/route.ts:265-270"
  ],
  "current_behavior": "Both routes do read-then-write XP debits directly: `SELECT user_xp.total_xp` then `UPDATE user_xp SET total_xp = current - amount` then `INSERT xp_transactions`. No FOR UPDATE, no SECURITY DEFINER wrapper. Hybrid route uses identical pattern; on Stripe/CMI/MM failure it tries to rollback via ANOTHER raw UPDATE. xp/route.ts has the same pattern lines 221-243 then a manual rollback block 265-270.",
  "why_it_matters": "Race: two concurrent XP-payment requests for the same booking will both pass the balance check and both succeed in debiting, double-spending the teen's XP. The 'rollback' is itself a non-atomic UPDATE that may execute after a competing UPDATE has already advanced the balance, corrupting the ledger. This is exactly the §29 invariant the canon was written to prevent.",
  "recommended_fix": "Replace the read+update+insert pattern with a single `spend_xp_for_booking(p_teen_id uuid, p_booking_id uuid, p_amount_xp int)` SECURITY DEFINER RPC that locks user_xp FOR UPDATE, debits, inserts xp_transactions(type='booking_payment'), updates booking row, and returns new_balance. Routes call only the RPC. Same change to /api/payments/xp.",
  "blast_radius": "M — 1 new RPC + 2 routes refactored.",
  "implementation_complexity": "M",
  "test_required": [
    "Concurrent paste of 2 hybrid POSTs with same booking — exactly one succeeds, the other returns 'insufficient_xp'",
    "RPC failure path inside Stripe leg → no partial XP debit visible after error response",
    "xp_transactions rows present for every successful debit"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-009",
  "domain": "economy-payments",
  "severity": "P0",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§6 FORBIDDEN #2: any INSERT/UPDATE from API/client into payment_transactions, coin_transactions, escrow_ledger is forbidden — must go through SECURITY DEFINER RPCs. §4.1 audit chain: top-up MUST flow through `top_up_teen` RPC.",
  "code_files": [
    "app/api/webhooks/stripe/dispatcher.ts:67-86",
    "app/api/webhooks/stripe/dispatcher.ts:79",
    "app/api/payments/cmi/callback/route.ts:77-89",
    "app/api/payments/cmi/callback/route.ts:111-122",
    "app/api/payments/cmi/webhook/route.ts:80-93",
    "app/api/admin/refunds/route.ts:185-200",
    "app/api/admin/refunds/route.ts:269-277",
    "app/api/admin/refunds/route.ts:347-356",
    "app/api/admin/refunds/route.ts:428-437"
  ],
  "current_behavior": "Stripe handleCoinTopup writes to non-existent `profiles.coins` column then directly INSERTs into `coin_transactions` (canon §6 FORBIDDEN #2). No call to `top_up_teen` RPC, no escrow_ledger row, no payment_transactions row, no idempotency check. CMI callback + webhook directly INSERT `payment_transactions` (forbidden by §6 FORBIDDEN #2). Admin refund route's `bumpCoins` helper does direct `user_coins` UPDATE then direct `coin_transactions` INSERT (lines 156-200), bypassing the canonical refund_teen_coins RPC (which is MISSING per §8).",
  "why_it_matters": "Top-ups via Stripe (the international rail for diaspora parents) skip the entire audit chain mandated by §29. Money credited to teens cannot be reconciled against payment_transactions or escrow_ledger. CMI top-ups land in a different shape than Cash Plus / M2T / Wafacash (which do call top_up_teen via processTopupEvent), creating two parallel ledger conventions. The admin refund route invents its own bumpCoins helper that bypasses FOR UPDATE locking and skips cashback reversal.",
  "recommended_fix": "Stripe coin_topup: rewrite to call `top_up_teen(parent, teen, amount_dh, 'stripe', session.id)` — let the canonical RPC do all writes. CMI callback + webhook: same pattern, route through top_up_teen with provider='cmi'. Admin refunds: build the canonical `refund_teen_coins` RPC (§8 P0 build) and have the admin route call only that — delete bumpCoins helper. Add an audit query that asserts every coin_transactions row has a matching escrow_ledger row.",
  "blast_radius": "L — refactor 4 routes + build refund_teen_coins RPC + drop bumpCoins helper.",
  "implementation_complexity": "M",
  "test_required": [
    "Stripe coin_topup webhook → user_coins.balance += amount_coins, payment_transactions row, escrow_ledger row, coin_transactions row, all linked",
    "CMI callback success → identical chain via top_up_teen RPC",
    "Admin marketplace refund → escrow_ledger(direction='refund') with related_spend_id; bumpCoins no longer in codebase",
    "Replay protection: duplicate Stripe checkout.session.completed for same session.id is no-op"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-010",
  "domain": "economy-payments",
  "severity": "P0",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§4.6 + §10 reference index — Hybrid checkout client `paymentMethod: \"stripe\"` hardcoded means CMI + Mobile Money branches are dead in the teen flow. CMI is the dominant Moroccan PSP; Stripe-only path forces all teens to international cards.",
  "code_files": [
    "app/teen/shop/checkout/checkout-client.tsx:46"
  ],
  "current_behavior": "TeenCheckoutClient always sends `paymentMethod: \"stripe\"` to /api/payments/hybrid. The route's `paymentMethod` arg supports `stripe|cmi|mobile_money` but the UI never lets the teen pick. CMI feature flag `cmi_payment` and Mobile Money `mobile_money_payment` cannot be exercised from the teen UI.",
  "why_it_matters": "Effectively launches event booking with international-card-only collection in a Moroccan-MAD market. Most teens/parents do not have international cards. Marketing copy promising CMI/Cash Plus support does not match reality. Canon labels this UNRESOLVED §9.12 P1 but the cumulative effect with #1-9 makes it P0 for launch usability.",
  "recommended_fix": "Add a radio/select in the HybridCheckout UI with options gated by feature flags: stripe (always), cmi (gated), mobile_money (gated, plus phone input). Persist the choice in the POST body. Keep stripe default for diaspora parents.",
  "blast_radius": "S — 1 UI component + a feature-flag fetch.",
  "implementation_complexity": "S",
  "test_required": [
    "UI shows CMI option when cmi_payment flag is on",
    "Selecting CMI sends paymentMethod='cmi' and route returns redirect_cmi formHtml",
    "Mobile Money option requires phone input"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-011",
  "domain": "economy-payments",
  "severity": "P0",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§4.1 idempotency: 'payment_transactions.client_idempotency_key text UNIQUE'. §6 FORBIDDEN #3: trusting client-supplied DH amount. PSP webhook signature validation is the gatekeeper that prevents minting.",
  "code_files": [
    "app/api/payments/cmi/webhook/route.ts:11-50",
    "lib/payments/cmi.ts:144-156"
  ],
  "current_behavior": "CMI S2S webhook receives form-encoded params then calls `cmiGateway.parseCallback(params)`. The hash check is conditional: 'Verify hash if present' (cmi.ts:149) — `if (params.HASH && !verifyCallbackHash())` — if a caller sends NO `HASH` field at all, the webhook accepts the payment as valid and writes payment_transactions(status='completed'). There is no enforced signature requirement; an attacker who knows a booking_reference can POST a forged success and mark it paid.",
  "why_it_matters": "Authentication-of-payment bypass on the dominant Moroccan PSP rail. Combined with the absence of escrow chain (CANON-ECON-009), this could mint paid bookings without any real money moving. Note: Cash Plus / M2T / Wafacash webhooks DO require signature (`if (!valid) drop`); only CMI is permissive.",
  "recommended_fix": "Make HASH presence + verification mandatory: at top of parseCallback, `if (!params.HASH) return { success:false, responseCode:'HASH_MISSING' }`. Same for the webhook route — return 200 but log error and DO NOT write any DB row. Add CMI integration test that asserts unsigned POST does not write payment_transactions.",
  "blast_radius": "XS — 2-line policy fix in cmi.ts.",
  "implementation_complexity": "XS",
  "test_required": [
    "POST /api/payments/cmi/webhook with no HASH → no DB write, response 200",
    "POST with bad HASH → no DB write, response 200",
    "POST with good HASH (signed in test) → payment_transactions inserted exactly once"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-012",
  "domain": "economy-payments",
  "severity": "P1",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§5.2 + §8 — `get_user_xp` is PHANTOM. Read directly from user_xp filtered by teen_id (RLS allows self-read).",
  "code_files": [
    "lib/hooks/teen-dashboard.ts:130-132"
  ],
  "current_behavior": "Hook calls `supabase.rpc('get_user_xp', { user_id: userId }).single()`. RPC does not exist; call returns error which is swallowed by surrounding logic.  Teen dashboard XP card displays stale or default values.",
  "why_it_matters": "Same family of silent-failure bugs as add_user_xp. The dashboard advertises XP totals that do not reflect reality.",
  "recommended_fix": "Replace with `supabase.from('user_xp').select('total_xp, current_level, lifetime_earned').eq('teen_id', userId).maybeSingle()`. RLS user_xp_self_read covers the teen's own read.",
  "blast_radius": "XS — single hook.",
  "implementation_complexity": "XS",
  "test_required": [
    "Teen dashboard XP value matches user_xp.total_xp for the auth'd teen",
    "grep confirms zero remaining `get_user_xp` callers"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-013",
  "domain": "economy-payments",
  "severity": "P1",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§6 FORBIDDEN #2: direct INSERT/UPDATE on user_xp + xp_transactions is forbidden. §6 FORBIDDEN #1: non-atomic XP debit/credit forbidden.",
  "code_files": [
    "app/api/circles/route.ts:387-407",
    "app/api/parent/grades/route.ts:260-285"
  ],
  "current_behavior": "circles route awards 5 XP for community participation by `SELECT user_xp.total_xp`, then `upsert user_xp` with new total, then direct `INSERT xp_transactions`. Same read+upsert+insert pattern in parent/grades route awarding grade-bonus XP. No FOR UPDATE, no SECURITY DEFINER, no escrow_ledger pairing (XP doesn't require escrow per canon, but the audit ledger is still corrupted by direct writes).",
  "why_it_matters": "Race: two messages posted in same tick by the same teen race on user_xp.total_xp; one upsert overwrites the other, dropping a +5 XP credit silently. Same on grade approvals if a parent batch-approves.",
  "recommended_fix": "Replace both with `supabase.rpc('add_xp_to_user', { p_teen_id, p_amount, p_source_type, p_source_id })`. Drop the `SELECT current; UPDATE total = current+5; INSERT xp_transactions` pattern entirely.",
  "blast_radius": "S — 2 callsites.",
  "implementation_complexity": "S",
  "test_required": [
    "Concurrent circle messages by same teen credit both XP increments",
    "Parent grade approval inserts exactly one xp_transactions row + correct user_xp delta"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-014",
  "domain": "economy-payments",
  "severity": "P1",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§5.2 — `app/teen/coins/coins-client.tsx` legacy mock reading `profile.coins_balance` / `profile.coins_topup` (fields don't exist). 'Already redirected; delete file after redirect verification.' §5.2 also lists deprecated SELECT policies on user_coins referencing `teens.parent_id`.",
  "code_files": [
    "app/teen/coins/coins-client.tsx (per canon)",
    "Stripe handler: app/api/webhooks/stripe/dispatcher.ts:71-77 reads/writes profiles.coins"
  ],
  "current_behavior": "Stripe handleCoinTopup line 71-77 does `from('profiles').select('coins').eq('id', teenId)` then `update profiles.coins`. Per canon, profiles has no `coins` column; the column lives on user_coins. The Supabase upsert on a non-existent column may either be silently dropped (PostgREST 400) or, if a generated alias exists, write to the wrong place. Either way the teen does not get coins from a Stripe top-up.",
  "why_it_matters": "Compounds CANON-ECON-009. Stripe-rail top-up is doubly broken: wrong table + wrong audit chain.",
  "recommended_fix": "Already covered by CANON-ECON-009 fix (route through top_up_teen RPC). Additionally remove `app/teen/coins/coins-client.tsx` and verify the legacy `/teen/coins` redirect lands on `/teen/wallet`.",
  "blast_radius": "XS within the larger 009 refactor.",
  "implementation_complexity": "XS",
  "test_required": [
    "After CANON-ECON-009 fix: Stripe coin_topup credits user_coins, not profiles",
    "/teen/coins responds 308 to /teen/wallet"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-015",
  "domain": "economy-payments",
  "severity": "P1",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§7 — MISSING canonical RPCs that the canon designates P0/P1 build: `resolve_dispute` (P0), `complete_mentor_session` (P1), `pay_featured_creator` (P1), `refund_top_up` (P0), `refund_teen_coins` (P0), `revoke_xp_cashback` (P0), `release_savings_goal` (P1), `_cashback_pct` (P1).",
  "code_files": [
    "gamification-system/database/migrations/061_wave_b_money_pipeline.sql (resolve_dispute exists at line ~590-650)",
    "Other RPCs: not found in any migration"
  ],
  "current_behavior": "Migration 061 ships `resolve_dispute` (good — partially closes the P0). The other six (`complete_mentor_session`, `pay_featured_creator`, `refund_top_up`, `refund_teen_coins`, `revoke_xp_cashback`, `release_savings_goal`, `_cashback_pct`) are not in any migration. Mentor sessions cannot complete the money leg; refund flows are improvised in routes (see CANON-ECON-009); cashback is not reversed on cancellation/refund (mostly — partner_reject_food_order does its own inline reversal).",
  "why_it_matters": "Mentor session bookings book money (parental approval) but cannot debit at completion → mentors paid out of band. Parent refunds (14-day window per §9.8) have no implementation. The escrow chain has no clean reversal primitive — every refund route invents its own pattern.",
  "recommended_fix": "Build the seven RPCs in canonical form per §7 signatures. Prioritize order: refund_teen_coins + revoke_xp_cashback first (unblocks CANON-ECON-007 ride cancel + CANON-ECON-009 refund unification + food reject), then refund_top_up (parent UX), then complete_mentor_session, then the rest.",
  "blast_radius": "L — 7 RPCs, ~3 days.",
  "implementation_complexity": "L",
  "test_required": [
    "Each RPC has a fixture-based test asserting the exact ledger writes per §7 column",
    "Idempotency: every RPC is safe to replay",
    "Granted to service_role only; REVOKE FROM PUBLIC, anon, authenticated"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-016",
  "domain": "economy-payments",
  "severity": "P1",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§5.1 — `xp_shop_items` table DEPRECATED, zero callers, drop. §5.2 — `add_coins_to_user` RPC race-prone, drop or revoke EXECUTE.",
  "code_files": [
    "types/supabase.ts:11461 (add_coins_to_user definition still exposed)",
    "audit reference: docs/vision/audit-prelaunch/03-money-pipeline.md:294,302,390,463"
  ],
  "current_behavior": "`add_coins_to_user` RPC still has EXECUTE granted (per types it's exposed); not SECURITY DEFINER and lacks FOR UPDATE per audit. `xp_shop_items` table referenced as dead in canon §5.1 is presumed still in DB.",
  "why_it_matters": "Backdoor for racing the user_coins balance and inflating coins. Even if no canonical caller uses it, attack surface is open via service_role compromise OR a future contributor accidentally choosing the wrong helper.",
  "recommended_fix": "Migration: `REVOKE EXECUTE ON FUNCTION public.add_coins_to_user(uuid, integer) FROM PUBLIC, anon, authenticated, service_role;` then `DROP FUNCTION add_coins_to_user`. Same for `xp_shop_items` (DROP TABLE IF EXISTS).",
  "blast_radius": "XS — 1 migration.",
  "implementation_complexity": "XS",
  "test_required": [
    "supabase rpc add_coins_to_user → 'function does not exist'",
    "Existing canonical paths still pass (top_up_teen, spend_teen_coins, purchase_reward, payout_chore_reward, disburse_allowance)"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-017",
  "domain": "economy-payments",
  "severity": "P1",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§4.1 — `payment_transactions.psp_reference UNIQUE` (PSP-side dedup). §29 invariants: idempotency. INDEX.locked cross-cut #3.",
  "code_files": [
    "app/api/webhooks/stripe/dispatcher.ts:96-101",
    "app/api/payments/cmi/webhook/route.ts:71-93"
  ],
  "current_behavior": "Stripe `handlePaymentSucceeded` does `update payment_logs ... WHERE stripe_payment_intent = id` — no replay guard at INSERT level. CMI webhook checks 'existing transaction by booking_id + provider_transaction_id' before insert — partial idempotency but the column is `provider_transaction_id` not the canonical `psp_reference`, so cross-rail uniqueness is not enforced.",
  "why_it_matters": "PSP retries (Stripe re-delivers events on 5xx, CMI re-fires) can result in duplicate payment_transactions rows or duplicate coin credits. Combined with CANON-ECON-009, the teen could end up with 2× the topped-up amount.",
  "recommended_fix": "Add `payment_transactions.client_idempotency_key text UNIQUE NULLS NOT DISTINCT` and `payment_transactions.psp_reference UNIQUE NULLS NOT DISTINCT` migrations. Update `top_up_teen` to honor uniqueness and return the existing payment_id on conflict (the 5-arg version already does this correctly per migration 093:159-172 — that's the canonical pattern; ensure all other writers go through it).",
  "blast_radius": "S — migration + verify webhook routes use top_up_teen.",
  "implementation_complexity": "S",
  "test_required": [
    "Stripe duplicate event delivery → exactly one payment_transactions row, exactly one coin credit",
    "CMI webhook same psp_reference twice → second call returns idempotent_replay:true"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-018",
  "domain": "economy-payments",
  "severity": "P1",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§9.1 — `xp_payment_settings.xp_to_dh_rate=100` is DEAD CONFIG that contradicts the canonical TS constant by 10×. LOCKED ACTION: delete row OR change to 10.",
  "code_files": [
    "DB row: xp_payment_settings.xp_to_dh_rate (no code reads it; canon ref §2.4)"
  ],
  "current_behavior": "DB row persists; no code reads it. Latent contradiction with TS constant XP_TO_DH_RATE = 0.10 (lib/payments/xp-converter.ts:10).",
  "why_it_matters": "Future contributor adds a feature reading this DB row and ships at 10× the wrong rate, silently. Canon explicitly mandates removing this trap.",
  "recommended_fix": "Migration: `DELETE FROM xp_payment_settings WHERE setting_key='xp_to_dh_rate';` OR update to 10 with a comment. Add a comment in lib/payments/xp-converter.ts referencing the canon section.",
  "blast_radius": "XS — single SQL DELETE.",
  "implementation_complexity": "XS",
  "test_required": [
    "Migration applies cleanly",
    "No code regression (grep xp_to_dh_rate → only docs)"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-019",
  "domain": "economy-payments",
  "severity": "P1",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§6 FORBIDDEN #4: 'Hardcoded currency labels … Required: canonical formatter formatCurrency(amount, currency: xp|coins|dh) … Centralized in lib/payments/currency-formatter.ts (TO BUILD).'",
  "code_files": [
    "Throughout app/teen/**, app/parent/**, components/**: hardcoded 'coins' / 'XP' / 'DH' strings + lucide icons (Coins/Zap)",
    "Concrete examples: app/parent/topup/page.tsx:283 ('{pack.price} DH'), app/teen/shop/history/page.tsx:166 (mislabel)"
  ],
  "current_behavior": "No `lib/payments/currency-formatter.ts` exists. Every UI surface picks its own label + icon + color. Canon mandates a centralized formatter to prevent the recurring 'Coins dépensés on XP' bug class.",
  "why_it_matters": "Without the formatter, each new feature is one bad copy-paste away from the same currency-confusion defect. Canon documented this as the single most user-visible defect for a reason.",
  "recommended_fix": "Build `lib/payments/currency-formatter.ts` exporting `formatCurrency(amount: number, currency: 'xp'|'coins'|'dh')` + `<CurrencyChip />` component (icon + label + color token). Migrate the highest-traffic surfaces first (wallet hub, shop, history, topup).",
  "blast_radius": "M — codebase-wide gradual migration.",
  "implementation_complexity": "M",
  "test_required": [
    "Snapshot test: formatCurrency(100, 'xp') = '100 XP' with Zap icon",
    "Snapshot test: formatCurrency(100, 'coins') = '100 coins' with Coins icon",
    "Snapshot test: formatCurrency(100, 'dh') = '100,00 DH'"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-020",
  "domain": "economy-payments",
  "severity": "P2",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§3.5 — Drop `user_purchases` (zero-row, zero-writer) OR formally retire it.",
  "code_files": [
    "Per canon: `user_purchases` table referenced in rewards-economy.md as canonical; not used by any writer"
  ],
  "current_behavior": "Two purchase ledgers exist; canon resolved canonical = shop_purchases. user_purchases is dead.",
  "why_it_matters": "Schema noise + future-contributor confusion (which one is canonical? canon answers: shop_purchases, but the dead table sits there).",
  "recommended_fix": "Migration: `DROP TABLE IF EXISTS user_purchases;` after final greenlight from founder.",
  "blast_radius": "XS.",
  "implementation_complexity": "XS",
  "test_required": [
    "No code reference to user_purchases remains",
    "Migration applies cleanly"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-021",
  "domain": "economy-payments",
  "severity": "P2",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§9.1 (display unification): 'Hide the DH-equivalent pill on XP in the wallet header (it confuses users into thinking DH equivalent = coin balance); keep it only in the shop tab next to per-item prices where context makes it unambiguous.'",
  "code_files": [
    "app/teen/wallet/wallet-hub-client.tsx (XP card displays ≈ DH pill)",
    "lib/payments/xp-converter.ts:23-26 (convertXPToDH used by wallet)"
  ],
  "current_behavior": "Wallet header XP card likely displays the DH equivalent pill globally. Canon says only shop tab.",
  "why_it_matters": "User mistakes XP DH-equivalent for spendable coins; documented confusion source.",
  "recommended_fix": "Remove the ≈ DH pill from the wallet header XP card. Keep convertXPToDH for shop-tab per-item price.",
  "blast_radius": "XS — UI tweak.",
  "implementation_complexity": "XS",
  "test_required": [
    "Wallet header XP card has no DH approximation",
    "Shop tab per-item card still shows '~ X DH' next to XP price"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-022",
  "domain": "economy-payments",
  "severity": "P2",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§6 FORBIDDEN #12: 'Mystery box / loot reveal … deterministic ladders only … no hidden weighted RNG.' §9.6: 'Hide the 3 mystery_box catalog rows (is_active=false) until ruling.'",
  "code_files": [
    "shop_rewards rows category='mystery_box' (DB)",
    "Possibly: gamification-system/features/shop/components/mystery-box-* if any"
  ],
  "current_behavior": "Per canon §9.6 the 3 mystery_box rows are still active. Loi 09-08 / 13-10 minor-audience risk.",
  "why_it_matters": "Regulatory exposure (gambling-adjacent for minors) until founder-legal review completes.",
  "recommended_fix": "Migration: `UPDATE shop_rewards SET is_active=false WHERE category='mystery_box';` Defer reveal UI until deterministic-ladder design is approved.",
  "blast_radius": "XS.",
  "implementation_complexity": "XS",
  "test_required": [
    "get_shop_rewards does not return mystery_box category items"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-023",
  "domain": "economy-payments",
  "severity": "P2",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§9.3 — 'No per-month cap exists in code/DB. LOCKED RECOMMENDATION: 500 DH/month/parent, 5000 DH/month-aggregate per teen, 200 DH per single top-up.' §9.4 — parental_limits table (teen-side spend caps) MISSING.",
  "code_files": [
    "app/api/parent/topup/route.ts (no cap check)",
    "Migration 093 top_up_teen RPC (no cap branch)",
    "spend_teen_coins (no parental_limits check)"
  ],
  "current_behavior": "No per-month cap, no per-tx cap, no per-category whitelist enforcement. BAM Circular 6/W/2017 lightly-KYC'd ceiling not enforced.",
  "why_it_matters": "Regulatory exposure; runaway-charge risk for parents; trust signal for early adopters absent.",
  "recommended_fix": "Build `parental_limits(parent_id, teen_id, max_monthly_dh, max_per_tx_dh, allowed_categories text[])` table + check inside top_up_teen, spend_teen_coins, buy_listing, book_mentor_session, place_food_order, request_ride.",
  "blast_radius": "L — table + check in 6 RPCs.",
  "implementation_complexity": "L",
  "test_required": [
    "Top-up that would exceed monthly cap returns error 'cap_exceeded'",
    "Spend in disallowed category returns 'category_blocked'"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-024",
  "domain": "economy-payments",
  "severity": "P2",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§9.7 — 'Currently all 26 catalog rows are XP-priced. LOCKED RECOMMENDATION: introduce currency column on shop_rewards; classify profile_customization (4 rows) as coins.' §3.4 deferred until coin-shop UI affordance ships.",
  "code_files": [
    "shop_rewards table (no currency column today)",
    "purchase_reward RPC (XP-only path)"
  ],
  "current_behavior": "shop_rewards.currency column missing; coin-priced cosmetics not yet plumbed.",
  "why_it_matters": "Minor — canon deferred this (§3.4 explicit). Track for V1.5.",
  "recommended_fix": "Defer until coin-shop UI sprint. Add column + currency-dispatch in purchase_reward when scheduled.",
  "blast_radius": "M (when scheduled).",
  "implementation_complexity": "M",
  "test_required": [
    "purchase_reward dispatches by shop_rewards.currency: 'xp' debits user_xp; 'coins' debits user_coins via spend_teen_coins"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-025",
  "domain": "economy-payments",
  "severity": "P3",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§5.2 — Legacy user_coins SELECT policies referencing teens.parent_id (column doesn't exist). Drop in favor of user_coins_self_read.",
  "code_files": [
    "Per canon: legacy RLS policy on user_coins"
  ],
  "current_behavior": "Dead RLS policy may still exist; canon flags for cleanup.",
  "why_it_matters": "Audit/lint hygiene; no functional impact.",
  "recommended_fix": "Migration: DROP POLICY IF EXISTS old policies; ensure user_coins_self_read covers teen self-read.",
  "blast_radius": "XS.",
  "implementation_complexity": "XS",
  "test_required": [
    "supabase pg_advisor reports no orphan policies on user_coins"
  ],
  "status": "open"
}
```

```json
{
  "id": "CANON-ECON-026",
  "domain": "economy-payments",
  "severity": "P3",
  "canon_file": "docs/canon/economy-payments.locked.md",
  "canon_rule": "§5.1 — `xp_shop_items` zero callers, drop after migration window.",
  "code_files": [
    "DB: xp_shop_items table (per canon)"
  ],
  "current_behavior": "Dead table.",
  "why_it_matters": "Schema noise.",
  "recommended_fix": "Migration: `DROP TABLE IF EXISTS xp_shop_items;` after sanity check.",
  "blast_radius": "XS.",
  "implementation_complexity": "XS",
  "test_required": [
    "No code references xp_shop_items"
  ],
  "status": "open"
}
```
