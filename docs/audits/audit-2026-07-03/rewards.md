# Audit — Rewards & Shops

**Date :** 2026-07-03 · **Branche :** `refonte/home-nav-lifestyle` · **Mode :** Read-only
**Baseline comparée :** `docs/audits/orchestrator-2026-05/rewards.md` (score 4/5, SHA `6e3e7f2`)

## Routes inspectées

- `app/teen/rewards/page.tsx` — redirect
- `app/teen/shop/page.tsx`, `app/teen/shop/checkout/{page,checkout-client}.tsx`, `app/teen/shop/history/page.tsx`
- `app/xp-shop/page.tsx` — redirect
- `app/gamification/boutique/page.tsx` — redirect
- `app/ambassador/boutique/page.tsx`
- `app/carte-vip/recompenses/page.tsx`, `app/carte-vip/page.tsx`
- `app/teen/coins/page.tsx` — redirect, `app/teen/wallet/{page,wallet-hub-client}.tsx`, `app/teen/vip-card/page.tsx`
- `app/teen/xp-value/page.tsx`
- `app/gamification/roue/page.tsx` — 410/redirect (fortune wheel retired)
- `components/payment/hybrid-checkout.tsx`, `components/payment-cart-persistence.tsx`
- `app/api/payments/hybrid/route.ts`, `app/api/teen/shop/route.ts` (410-gone)
- `app/api/ambassador/shop/{redeem,rewards,points}/route.ts`, `app/api/ambassador/withdrawals/route.ts`
- `gamification-system/features/shop/actions.ts`, `lib/payments/xp-converter.ts`
- `docs/economy.md`, `docs/AMBASSADOR_SHOP_SYSTEM.md`

## État actuel (résumé 5 lignes)

Consolidation confirmée pour the teen-facing "6 shops": `/teen/shop`, `/teen/rewards`, `/xp-shop`, `/gamification/boutique` all still correctly redirect to the single canonical `/teen/wallet?tab=shop`, and `/teen/coins` now redirects too (May-audit R1/R4 fixed). But the currency model underneath moved since May without `docs/economy.md` being updated: coins are now real (`user_coins.balance`, wired 2026-06-02, #206) instead of the hard-coded 0 placeholder the doc still describes, and the wallet explicitly adopted a "XP and coins never convert" doctrine — while `lib/payments/xp-converter.ts` (10 XP = 1 DH) still lives on for hybrid booking checkout only. Three *other* shops remain genuinely separate storefronts with their own currencies and are correctly NOT part of the consolidation: ambassador boutique (`ambassador_points`, real payouts), VIP loyalty rewards at `carte-vip/recompenses` (`user_points`, real DB reads but **purchase buttons hardcoded `disabled`**), and the paid Carte VIP subscription tiers (`carte-vip/page.tsx`, DH-priced, separate from the XP-earned `vip_tiers` shown at `/teen/vip-card`). Fulfillment for the canonical shop is self-service ("code à présenter", derived client-side from `purchase_id`), with no partner-scanner endpoint; ambassador rewards use a manual admin-fulfilled pipeline (address + status enum) instead.

## Niveau "pro" (1-5) avec justification

**3.5 / 5** (down from May's 4/5 — the redirect layer held, but the source-of-truth doc drifted and a new dead economy governance gap opened)

- +1 for real redirects still in place and correctly enforced (verified live, not just planned).
- +1 for the canonical shop being genuinely wired end-to-end: real RPC (`purchase_reward`, `get_shop_rewards`), real stock decrement, real purchase history, real hybrid Stripe/CMI/MobileMoney checkout with atomic XP debit RPC (`deduct_xp_for_payment`) and parental-approval gate.
- +0.5 for `/api/teen/shop` legacy endpoint cleanly retired to 410 (May's R3 gap resolved, no orphaned callers).
- -1 for `docs/economy.md` being the stated single source of truth yet contradicting live code on the single most important fact (coins wired vs not) — a doc that lies is worse than no doc.
- -1 for the VIP loyalty shop (`carte-vip/recompenses`) being read-wired to real tables but write-dead (all buttons `disabled`, label "Échange bientôt") with no visible ticket/roadmap flag in the file itself.

## Données : statique/mocké vs API réelle

| Shop | Catalogue source | Currency | Cart | Checkout | Fulfillment |
| ---- | ---------------- | -------- | ---- | -------- | ----------- |
| `/teen/wallet?tab=shop` (canonical, ex `/teen/shop`, `/teen/rewards`, `/xp-shop`, `/gamification/boutique`) | REAL — `reward_categories` + RPC `get_shop_rewards` (`gamification-system/database/migrations/004_rewards_shop.sql`) | XP only (`total_xp`) | None (single-item buy button, no multi-item cart) | Server action `purchaseReward()` → RPC `purchase_reward` (atomic XP debit + stock decrement + `user_purchases` insert) | Digital self-service: "code à présenter" = `purchase_id.slice(0,8).toUpperCase()` (`app/teen/shop/history/page.tsx:23-25`, `wallet-hub-client.tsx:738`) — no partner-scanner API found |
| `/teen/shop/checkout` (hybrid event booking) | REAL — `bookings` table (event reservation, not a "reward") | XP + DH (Stripe/CMI/MobileMoney) | Single booking, persisted via `payment-cart-persistence.tsx` (localStorage `nivy.cart`, one bookingId, 24h TTL — NOT a shopping cart) | `/api/payments/hybrid` → `calculateHybridPayment()` + RPC `deduct_xp_for_payment`, parental-approval gate at ≥1000 XP | Booking confirmation flow (separate from reward fulfillment; owned by reservation system) |
| `app/ambassador/boutique` | REAL — `ambassador_rewards` + `ambassador_points` + RPC `redeem_ambassador_reward` | Ambassador points (`points_cost`, distinct table, **not** XP/coins) | None (single-item) | RPC `redeem_ambassador_reward` (points debit + stock via `docs/AMBASSADOR_SHOP_SYSTEM.md`) | Manual/admin: delivery address captured, status enum `pending→processing→shipped→delivered`, admin updates in Supabase directly |
| `app/carte-vip/recompenses` | REAL reads — `user_points` + `rewards` tables | VIP loyalty "points" (`points_cost`, yet another distinct table/currency) | N/A | **NONE — `<Button disabled>` hardcoded**, label "Échange bientôt" (`page.tsx:102-104`) | Not implemented |
| `app/carte-vip` (paid tiers Silver/Gold/Platinum) | Static hardcoded array in the client component (`priceAmount`, benefits — `page.tsx:49-61`) | Real DH (subscription price) | N/A (marketing/pricing page) | Not shown in this file (out of audit scope — subscription purchase flow, separate surface) | N/A |
| `app/teen/vip-card` (XP-earned VIP tier, distinct from paid Carte VIP) | REAL — `getUserVipTier()` / `vip_tiers` (7 tiers) | Lifetime XP | N/A | N/A (status display, not a shop) | N/A |
| `app/gamification/roue` (fortune wheel) | N/A — retired | N/A | N/A | N/A | **Route is `permanentRedirect` to `/teen` — feature dead** (`wheel_streaks` trigger broken, "pending founder ratification") |

## Cohérence avec le reste de l'app

**Quatre systèmes de "points" cohabitent aujourd'hui, dont deux conversions distinctes et non alignées :**

1. **XP** (`user_xp.total_xp`) — mérite, jamais convertie en argent depuis #206. Doctrine affirmée sur `/teen/xp-value` (`page.tsx:1-9`: *"Les XP = mérite. Ils NE se convertissent JAMAIS en DH ni en coins"*) et reprise dans `wallet-hub-client.tsx:124-127`.
2. **Coins** (`user_coins.balance`, via vue `user_coins_spendable`) — **désormais réel** (`wallet/page.tsx:54,63-65`: *"W3.1 — real balance... Per whitepaper §5: 1 DH = 100 coins (locked). XP and coins NEVER convert"*). This directly contradicts `docs/economy.md §2.2/§8`, which still says *"the `user_coins` table is not yet wired... `walletData.coins = 0` as a placeholder"* — that doc is now **factually wrong** and was last touched 2026-05-06, while the wallet code was rewired 2026-06-02.
3. **Ambassador points** (`ambassador_points.total_points` / `ambassador_rewards.points_cost`) — real, siloed table, no conversion to XP/coins/DH anywhere. Feeds `ambassador_commissions`/`ambassador_payouts` (real DH withdrawals) — a completely separate economy from the teen wallet.
4. **VIP loyalty points** (`user_points.total_points` / `rewards.points_cost`, "1 point per 10dh spent" per `app/carte-vip/page.tsx:52`) — real reads, dead write path.

**Conversion table location:** `lib/payments/xp-converter.ts` (`XP_TO_DH_RATE = 0.10`, i.e. 10 XP = 1 DH) remains the only defined XP↔DH rate, used exclusively by the hybrid booking checkout (`/api/payments/hybrid`, `app/teen/shop/checkout/checkout-client.tsx`). It is **not** used by the canonical reward shop (which prices in bare XP per #206) and **not** used by coins (which per the wallet's own comment "NEVER convert" to XP). `docs/economy.md §3` documents this rate but frames it as *the* conversion rule for "DH credit" shown in the wallet header — that banner has since been **removed** from the wallet UI (`wallet-hub-client.tsx:124-127` explicitly says so), so the doc's §7 "UI contract" (wallet must show DH-credit pill + conversion banner) is now stale/false.

**Dead-code drift risk:** `components/payment/hybrid-checkout.tsx:27` hardcodes its own local `const XP_RATE = 0.10` instead of importing `XP_TO_DH_RATE` from `lib/payments/xp-converter.ts` — a second, independently-maintained copy of the same number. Currently in sync; will silently drift if either is changed without the other (violates `docs/economy.md`'s own governance rule: "edit `xp-converter.ts` and this file in the same diff").

## Gaps bloquants (P0)

- **P0-1 (CASSÉ)** — `app/carte-vip/recompenses/page.tsx:102-104`: reward cards read real `user_points`/`rewards` data and render a live points balance, but every redeem button is `<Button ... disabled>` with label `"Échange bientôt"` — the page looks fully functional but the core action is dead. No banner/flag tells the user this is a preview. **Effort: S (0.5-1j)** to either wire a real redeem RPC (mirroring `purchase_reward`/`redeem_ambassador_reward` pattern) or make the "coming soon" state visually explicit (banner, not just disabled label).
- **P0-2 (DETTE/doublon)** — `docs/economy.md` (last edited 2026-05-06) is stale against `app/teen/wallet/wallet-hub-client.tsx` / `wallet/page.tsx` (rewired 2026-06-02, #206): coins are now real, not a placeholder; the DH-conversion banner it mandates in §7 no longer exists in the UI. Anyone reading the "single source of truth" doc today gets actively wrong information about the most contentious part of the system (currency confusion was the #1 finding of the May audit). **Effort: S (0.5j)** — rewrite §2.2, §7, §8 to match current code; this is a pure doc fix, zero code risk.

## Gaps importants (P1)

- **P1-1 (DETTE/doublon)** — `components/payment/hybrid-checkout.tsx:27` duplicates `XP_TO_DH_RATE` as a local literal instead of importing from `lib/payments/xp-converter.ts`, violating the project's own "same diff" governance rule for that constant. **Effort: S (~1h)** — import the constant, delete the local copy.
- **P1-2 (MANQUANT vs standard pro)** — No fulfillment/scanner backend for canonical shop rewards: "code à presenter" is derived client-side from the first 8 chars of `purchase_id` (`app/teen/shop/history/page.tsx:23-25`, `wallet-hub-client.tsx:738`) with no corresponding partner-facing verification endpoint (unlike bookings, which have a real check-in flow per prior audits). A teen could screenshot/fabricate a plausible-looking code; there is no `/api/.../verify-purchase-code` to check it server-side. **Effort: M (2-3j)** — add a verification RPC/endpoint + partner UI, or explicitly scope "digital-only, no physical redemption" rewards until built.
- **P1-3 (DETTE/doublon)** — Four non-interoperable "points" ledgers now exist in production (XP, coins, ambassador points, VIP loyalty points) with zero documentation cross-referencing them as a set; `docs/economy.md` only covers 3 (XP/coins/DH) and doesn't mention `ambassador_points` or `user_points` at all, even as "out of scope, intentionally separate." A new engineer has no map of the full picture. **Effort: S (0.5j)** — add a short "adjacent economies" section to `docs/economy.md` explicitly scoping ambassador points and VIP loyalty points as intentionally separate ledgers.
- **P1-4 (MOCK/faux contenu)** — `app/carte-vip/page.tsx:49-61`: pricing tiers and benefits are a hardcoded client-side array, not sourced from any table (no `carte_vip_tiers` or similar). If prices change, they change in code only, with no admin path. Likely fine for a marketing page but worth flagging since it's DH-priced. **Effort: S** if intentional-as-marketing-page (no action); **M** if this needs to become data-driven.

## Polish (P2)

- **P2-1** — `app/ambassador/boutique/page.tsx` fetch pattern uses three sequential-looking client calls via `Promise.all` but re-fetches all data (`fetchData()`) after every redemption instead of optimistic local state (contrast with the canonical shop's optimistic `setRewards` update in `wallet-hub-client.tsx:354-360`). Minor UX inconsistency between the two real shops.
- **P2-2** — `docs/AMBASSADOR_SHOP_SYSTEM.md` footer says "Dernière mise à jour : Janvier 2025" — stale timestamp, though content still matches code. Update the date or drop it.
- **P2-3** — `app/gamification/roue/page.tsx` redirect comment references "wheel_streaks trigger broken; wheel feature retired pending founder ratification" — this decision seems stuck in limbo since Wave 2B; worth a founder decision to either delete the dead migration (`005_fortune_wheel.sql`) or actually revive it, rather than leaving a permanent 410 with unresolved intent.

## Effort estimé (S/M/L par gap)

| Gap | Effort |
| --- | ------ |
| P0-1 VIP recompenses dead buttons | S (0.5-1j) |
| P0-2 economy.md doc drift | S (0.5j) |
| P1-1 hybrid-checkout.tsx duplicated rate | S (~1h) |
| P1-2 no partner-scanner fulfillment | M (2-3j) |
| P1-3 undocumented 4-ledger economy | S (0.5j) |
| P1-4 carte-vip hardcoded pricing | S/M (depends on decision) |
| P2-1/2/3 polish | S each (~2h each) |

## Fichiers critiques à connaître

- `docs/economy.md` — stated single source of truth, currently **stale** (coins section, UI contract section)
- `lib/payments/xp-converter.ts` — the one real XP↔DH rate (`XP_TO_DH_RATE = 0.10`), used only by hybrid booking checkout
- `app/teen/wallet/page.tsx` + `wallet-hub-client.tsx` — canonical shop + real coins balance (`user_coins_spendable` view) + "no convert" doctrine (#206)
- `app/teen/xp-value/page.tsx` — canonical statement of the "XP never converts" rule
- `gamification-system/features/shop/actions.ts` — server actions wrapping `purchase_reward`/`get_shop_rewards`/`use_reward` RPCs
- `gamification-system/database/migrations/004_rewards_shop.sql` — real stock/reward-type schema backing the canonical shop
- `app/api/payments/hybrid/route.ts` — real hybrid Stripe/CMI/MobileMoney + parental-approval + atomic XP debit (`deduct_xp_for_payment`)
- `app/api/teen/shop/route.ts` — legacy endpoint, now cleanly 410-gone (May gap resolved)
- `app/carte-vip/recompenses/page.tsx` — read-wired, write-dead VIP loyalty shop (P0-1)
- `app/ambassador/boutique/page.tsx` + `app/api/ambassador/shop/*` + `app/api/ambassador/withdrawals/route.ts` — fully separate, fully real ambassador economy (points → commissions → DH payouts)
- `components/payment/hybrid-checkout.tsx` — duplicated XP rate constant (P1-1)
- `components/payment-cart-persistence.tsx` — single-booking resume token, not a multi-shop cart
- `app/gamification/roue/page.tsx` — fortune wheel, retired/410, decision pending
