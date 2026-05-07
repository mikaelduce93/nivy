# P2.3 Tier alignment — inventory

**Sub-agent**: A1 (read-only). DB project: `imchornjvmgmaovhypco`. All counts/values pulled live on 2026-05-07.

## 1. Canonical tier names (per whitepaper)

The whitepaper is **explicit and locked** on this — `docs/vision/PRODUCT_WHITEPAPER.md:951` (founder-decisions table row 19):

| # | Decision | Recommended default | Locked? |
|---|---|---|---|
| 19 | Tier names | **Free / Silver / Gold / Platinum** | 🟢 LOCKED here |

Reinforced at:
- `PRODUCT_WHITEPAPER.md:17` — "Their tier (Free / Silver / Gold / Platinum) drives top-up discounts."
- `PRODUCT_WHITEPAPER.md:125` — flagged divergence: "Tier naming diverges (Free/Silver/Gold/Platinum vs Free/Starter/Pro/Elite/Family)"
- `PRODUCT_WHITEPAPER.md:359` — `family_subscriptions (parent_id, tier CHECK IN ('free','silver','gold','platinum'), status)`
- `PRODUCT_WHITEPAPER.md:387` — "Tier names: 🟢 LOCKED to Free / Silver / Gold / Platinum (rename code to align)."
- `PRODUCT_WHITEPAPER.md:897` — P1 work item #20 "Tier alignment to Free/Silver/Gold/Platinum (§10)"
- `PRODUCT_WHITEPAPER.md:952` — top-up discount ladder 0 / -10 / -20 / -30
- `PRODUCT_WHITEPAPER.md:1008` glossary — "Tier | Free / Silver / Gold / Platinum (parent subscription)"
- `parent-control.md:9, 47, 54` — same canon, flags reconciliation needed.

**Canonical set (parent subscription):**

| code (DB / API) | name (fr-FR UI) | name (ar-MA UI) | top-up discount | sort_order |
|---|---|---|---|---|
| `free` | Gratuit | مجاني | 0 % | 0 |
| `silver` | Argent | فضي | -10 % | 1 |
| `gold` | Or | ذهبي | -20 % | 2 |
| `platinum` | Platine | بلاتيني | -30 % | 3 |

**Note — out of scope but adjacent:** the gamified XP-based progression in `vip_tiers` (Standard/Bronze/Silver/Gold/Platinum/Diamond/Legendary) is a *different* concept (engagement reward tiers), not a parent subscription. The whitepaper glossary explicitly reserves the word "Tier" for the parent subscription; the XP track should stay scoped under "VIP" / "VIP level" wording. **FOUNDER REVIEW** flag: P2.3 should rename only parent-subscription strings, not VIP tiers — but A2/A3 must take care because some VIP-track code uses literal `'silver'/'gold'/'platinum'` and we must not collapse the two namespaces.

---

## 2. Current state — DB (live)

### 2.1 `subscription_plans` table (5 rows, all `is_active=true`)

Source of truth today. Distinct values of `tier` and `code` columns:

| code | name (fr) | name_ar | tier | plan_type | price_monthly | sort_order |
|---|---|---|---|---|---|---|
| free | Gratuit | مجاني | free | free | 0 | 0 |
| starter | Starter | ستارتر | starter | starter | 29 | 1 |
| pro | Pro | برو | pro | pro | 49 | 2 |
| elite | Elite | إيليت | elite | elite | 99 | 3 |
| family | Famille | عائلة | family | family | 79 | 4 |

So the live DB uses **Free / Starter / Pro / Elite / Family**, not the whitepaper-locked Free/Silver/Gold/Platinum. Misalignment confirmed.

### 2.2 `family_subscriptions` table (0 rows)

Actual columns (from `information_schema.columns`):
`id`, `subscription_id` (FK → `user_subscriptions.id`), `owner_id`, `max_members`, `family_name`, `created_at`.

**There is no `tier` column on `family_subscriptions`.** This contradicts both the whitepaper §10 contract and the `lib/auth/get-user-role.ts:93-97` code, which selects `tier` from this table. That query silently returns no row today, and the helper falls back to `"free"`. This is a real bug, not just a rename.

### 2.3 `user_subscriptions` table (0 rows)

The actual subscription source. (Schema not pulled — no impact on this rename, just the FK target.)

### 2.4 Other tier-bearing tables (out of scope but listed for safety)

| table.column | distinct values found | scope |
|---|---|---|
| `ambassadors.tier` | (0 rows live) — CHECK IN (`bronze`,`silver`,`gold`) | ambassador track, NOT parent subscription. Keep as-is. |
| `vip_tiers` (slug, name) | standard, bronze, silver, gold, platinum, diamond, legendary | VIP/XP track. Keep as-is. |
| `vip_tiers.tier_level` | int 0..6 | same |
| `shop_rewards.min_vip_tier` | varchar | gates shop items by VIP tier. Keep as-is. |
| `user_vip_status.{current,next,highest}_tier_id` | uuid → vip_tiers | VIP track. |
| `vip_perks.tier_id`, `vip_benefits_log.tier_id`, `vip_exclusive_items.min_tier_id` | uuid → vip_tiers | VIP track. |

### 2.5 RLS / constraints / enums hardcoding tier strings

- `pg_constraint`: only `ambassadors_tier_check` hardcodes (`bronze`,`silver`,`gold`) — out of scope.
- `subscription_plans.tier` has **no CHECK constraint** (just default `'free'`) — safe to update values.
- No enum type named `subscription_tier` exists in the live DB (the migration `027_premium_subscriptions.sql:1013` checks for it conditionally and falls through to plain VARCHAR — confirmed by `pg_type` query).
- No `pg_policies` row matches `tier|starter|silver|gold|platinum|pro|elite` substrings against `qual`/`with_check` (search returned only unrelated admin policies). **No RLS gate keys off tier strings.**

---

## 3. Current state — code

### 3.1 Authoritative occurrences (parent-subscription scope)

| File | Line | Content | Notes |
|---|---|---|---|
| `lib/auth/get-user-role.ts` | 22 | `subscriptionTier: string` | Type field returned to UI. |
| `lib/auth/get-user-role.ts` | 93 | `.from("family_subscriptions")` | **Bug**: that table has no `tier` column. |
| `lib/auth/get-user-role.ts` | 94 | `.select("tier")` | Will silently fail. Needs join via `subscription_id → user_subscriptions → subscription_plans.tier` OR move to a view. |
| `lib/auth/get-user-role.ts` | 106 | `subscriptionTier: subscription?.tier \|\| "free"` | Default `"free"` is canonical. |
| `components/dashboard/parent/header.tsx` | 32 | `const tier = userInfo.parentData?.subscriptionTier \|\| "free"` | Renders `{tier}` capitalized at line 89. |
| `components/dashboard/parent/sidebar.tsx` | 37 | `const tier = userInfo.parentData?.subscriptionTier \|\| "free"` | Renders badge. |
| `components/dashboard/parent/sidebar.tsx` | 39-44 | `tierColors` map: keys `free`, `silver`, `gold`, `platinum` | **Already canonical.** |
| `components/dashboard/parent/sidebar.tsx` | 53 | `<p className="...uppercase">{tier}</p>` | Localization gap: shows raw English token. |
| `components/dashboard/parent/sidebar.tsx` | 56-58 | hardcoded discount strings: silver -10%, gold -20%, platinum -30% | Already canonical numbers. |
| `components/admin/VIPPricePreview.tsx` | 12-14 | Silver/Gold/Platinum discounts 10/20/30% | Admin preview — already canonical (but lives in `admin/` not parent). |

### 3.2 Migration / seed occurrences (DB-side, must change in step with DB)

| File | Line | Content | Notes |
|---|---|---|---|
| `gamification-system/database/migrations/027_premium_subscriptions.sql` | 1031-1043 | Inserts tiers `starter,pro,elite,family` cast to `subscription_tier` enum | Path A branch (enum exists w/ those labels). |
| same file | 1054-1066 | Fallback inserts mapping `starter→silver, pro→gold, elite→platinum, family→gold` | **Already maps to the canonical names** — but only on the fallback branch. |
| same file | 1072+ | Plain insert (no enum) — goes through with raw `starter/pro/elite/family` tier values | This is the path that ran (DB has no enum). |
| `gamification-system/database/all_migrations.sql` | 18997-19062 | Same logic, mirrored | Aggregate file. |
| `gamification-system/database/migrations/028_tokens_rewards_system.sql` | 452, 966 | Reads `subscription_plans` (no tier literal) | Safe. |

### 3.3 Code that handles `subscription_plans` plan_type / code (passthrough)

| File | Line | Notes |
|---|---|---|
| `app/api/teen/subscription/handlers.ts` | 16, 23, 30, 51, 58, 85, 143, 169 | All read-only or echo `code/name/plan_type`. No literal tier strings. Will follow the DB rename automatically when row data changes. |
| `app/api/me/data-export/route.ts` | 136-138 | Exports `family_subscriptions` rows as-is — no literal. Safe. |
| `types/supabase.ts` | 3416-3454, 7588-7642 | Generated types. Will be regenerated after DB DDL. |

### 3.4 Strings to NOT touch (false positives — different concept)

- `features/pass/schema.ts:14` — VIP card pass `z.enum(['standard','gold','platinum'])` — pass tier, not subscription.
- `features/pass/schema.ts:62, 79, 99` — "Badge profil Silver/Gold/Platinum" — VIP pass badges.
- `app/carte-vip/**` — VIP card pages, separate product.
- `app/anniversaires/organiser/page.tsx:16` — pack id `'starter'` for birthday packs, unrelated.
- `lib/monitoring/analytics.ts:163` — `trackPassSubscribed(tier: 'standard'|'gold'|'platinum')` — VIP pass.
- `lib/emails.ts:326-327` — VIP pass email tier styling.
- `components/teen/dashboard/teen-dashboard-content.tsx:30, 283` — `'elite'` is a hero variant, not subscription.
- `components/partners/RetailPartnerForm.tsx:34, 92, 131` — partner offer min-VIP-level, not parent subscription.
- `gamification-system/features/vip-system/schema.ts:90, 114` — VIP track names "Argent","Platine".
- `gamification-system/database/migrations/017_vip_system.sql`, `017`+`004_rewards_shop.sql` — VIP/loot inserts.

**Important:** A2 must NOT bulk-replace bare `'silver'/'gold'/'platinum'` literals across the codebase. The parent-subscription scope is *narrow*: the rename is essentially "rewrite the seed rows in `subscription_plans`" + "fix the `lib/auth/get-user-role.ts` query".

---

## 4. Rename plan

### 4.1 DB (A2 owns)

Both `family_subscriptions` and `user_subscriptions` are **0 rows**, so we can rewrite freely with no data migration risk.

1. **New migration `gamification-system/database/migrations/060_align_subscription_tiers.sql`**:
   - `UPDATE subscription_plans SET code='silver', name='Argent', name_ar='فضي', plan_type='silver', tier='silver', price_monthly=… WHERE code='starter';`
   - `UPDATE subscription_plans SET code='gold', name='Or', name_ar='ذهبي', plan_type='gold', tier='gold', price_monthly=… WHERE code='pro';`
   - `UPDATE subscription_plans SET code='platinum', name='Platine', name_ar='بلاتيني', plan_type='platinum', tier='platinum', price_monthly=… WHERE code='elite';`
   - `DELETE FROM subscription_plans WHERE code='family';` *(or rename to `gold` family-pack — FOUNDER REVIEW: whitepaper has no "family" tier; recommendation: drop the row, add `family=true` flag column on `gold` if family-pack pricing needed.)*
   - Preserve `id` UUIDs (do not regenerate) so any FK references stay intact.
   - Add `ALTER TABLE subscription_plans ADD CONSTRAINT subscription_plans_tier_check CHECK (tier IN ('free','silver','gold','platinum'));`
2. **Add the missing `family_subscriptions.tier` column** OR (preferred) **create a `parent_subscription_view`** that joins `family_subscriptions → user_subscriptions → subscription_plans` and exposes `(parent_id, tier, status)` to match the whitepaper §10 contract. The view is cheaper and lets the FK chain stay normalized.
3. Regenerate `types/supabase.ts`.

### 4.2 Code (A2 owns DB-coupled)

| Old | New | File |
|---|---|---|
| `.from("family_subscriptions").select("tier")` | `.from("parent_subscription_view").select("tier")` (or join chain) | `lib/auth/get-user-role.ts:93-95` |
| Literal default `"free"` | unchanged | `lib/auth/get-user-role.ts:106` |

### 4.3 UI labels (A3 owns)

| Old label | New label (fr) | New label (ar) | File |
|---|---|---|---|
| Raw `{tier}` capitalized | Localized via i18n key `parent.tier.{free,silver,gold,platinum}` → `Gratuit / Argent / Or / Platine` | `مجاني / فضي / ذهبي / بلاتيني` | `components/dashboard/parent/header.tsx:89` |
| Raw `{tier}` uppercased | Same i18n key, uppercased | same | `components/dashboard/parent/sidebar.tsx:53` |

A3 should also confirm there is currently **no i18n dictionary** for these — the project today inlines French in JSX. Recommendation: either inline the translated label (`{ free: 'Gratuit', silver: 'Argent', gold: 'Or', platinum: 'Platine' }[tier]`) or stand up the i18n keys if `next-intl`/similar is already wired (A3 to verify).

---

## 5. Risks

1. **Active DB rows count = 0**, so no data loss risk on the rename. Confirm again immediately before A2 runs the migration.
2. **`user_subscriptions.id` foreign keys**: `subscription_payments`, `payment_requests`, `family_subscriptions.subscription_id` all reference the subscription chain. Since `subscription_plans.id` UUIDs are preserved, FKs stay intact.
3. **Generated supabase types** (`types/supabase.ts`) will need regeneration; failure to do so breaks compile.
4. **VIP-track shadow vocabulary**: code uses `'silver'/'gold'/'platinum'` for VIP cards, VIP tiers, partner discount tiers. **Do not collapse these namespaces.** A2/A3 must scope replacements to files inside `components/dashboard/parent/**`, `lib/auth/get-user-role.ts`, and the new migration only.
5. **No URLs / receipts / emails persist tier names** — verified by inspection; `emails/payment-confirmation.tsx`, `emails/booking-confirmation.tsx` etc. don't render subscription tier strings. Safe.
6. **No RLS policy** keys off subscription tier strings — confirmed by `pg_policies` scan.
7. **`get-user-role.ts:93` is currently broken** (selects nonexistent column). The rename is also the natural moment to fix this. If A2 ships the rename without the view/join fix, the parent badge will continue showing "Free" for everyone.
8. **"family" plan disposition** is the only ambiguity → flagged FOUNDER REVIEW.

---

## 6. Hand-off

### A2 — DB + DB-coupled code (owns)

**Files to write/modify:**
- `gamification-system/database/migrations/060_align_subscription_tiers.sql` (new)
- `lib/auth/get-user-role.ts` (lines 90-110: switch query to view or proper join)
- `types/supabase.ts` (regenerate after migration)

**Files to read for context only:**
- `app/api/teen/subscription/handlers.ts`
- `gamification-system/database/migrations/027_premium_subscriptions.sql:1007-1080`

### A3 — UI + i18n (owns)

**Files to modify:**
- `components/dashboard/parent/header.tsx:89` — replace `{tier}` with localized label.
- `components/dashboard/parent/sidebar.tsx:39-44, 53, 56-58` — confirm `tierColors` keys (already canonical), localize `{tier}` in line 53, optionally keep the `-10%/-20%/-30%` block (already canonical) or pull discount % from DB instead of hardcode.

**Files to read for context only:**
- `app/parent/topup/page.tsx` (no tier strings — confirms no hidden surface)
- `components/parent/topup-form.tsx`
- `lib/auth/get-user-role.ts` (to know what `subscriptionTier` will return after A2's fix)

**Files A3 must NOT touch (different concept):**
- `app/carte-vip/**`, `features/pass/**`, `components/partners/RetailPartnerForm.tsx`, `gamification-system/features/vip-system/**`, `lib/monitoring/analytics.ts:163`, `lib/emails.ts:326-327`, `components/admin/VIPPricePreview.tsx` (admin VIP preview), and any `*_vip_*` migration.

### Founder review queue

1. Disposition of the `family` plan (drop / rename / keep as flag on `gold`).
2. Confirm the `vip_tiers` track stays separate vocabulary (recommended: yes).
3. Confirm top-up discount ladder 0/-10/-20/-30 (whitepaper row 20, marked 🟡 DEFAULT, not LOCKED).
