# Food Delivery & Restaurants

Status: VISION (no implementation in repo as of audit). Owner: food-delivery-restaurants-auditor. Audited against Supabase project `imchornjvmgmaovhypco` and working tree `C:\Users\Shadow\Desktop\NIVY` on 2026-05-07.

## 1. Vision & Why

Nivy is the operating system for Moroccan teens (12-19) and their parents. Eating out, ordering snacks after school, and birthday catering are core teen-life flows that today happen on Glovo, Jumia Food, or by phone — outside any parent-aware, coin-priced, XP-rewarding loop. Bringing food into Nivy lets us:

- Convert a high-frequency physical-world spend into in-app coin flow (parents top-up DH → teen spends coins → partner cashes out).
- Earn XP cashback that ties healthy eating to gamification ("eat-the-rainbow" challenge → XP bonus).
- Surface partner restaurants alongside venues, clubs and retail in one teen-aware marketplace, with halal-by-default and nutrition tags suited to local norms (Ramadan iftar bundles, school-canteen alternatives, after-coaching protein snacks).
- Give parents a budget-bounded, allergen-aware, time-windowed food channel (no fast food on weeknights, max 800 kcal per order during a sport block, etc.) that pure aggregators cannot deliver because they have no parent identity.
- Unlock catering inside the existing `anniversaires` (birthday) flow: a venue partner that is also a restaurant can bundle the cake, the meal, and the activity in one coin-priced order.

The wedge is teen-specific: a normal Glovo session has no parental approval, no coin/XP economy, no nutrition policy, no school-schedule awareness. Nivy delivers all of those for the same physical meal.

## 2. Current State (audit)

**Database (live)** — query `WHERE tablename ILIKE '%food%' OR '%meal%' OR '%restaurant%' OR '%order%' OR '%menu%' OR '%nutrition%' OR '%cater%'` returned only:
- `anniv_orders` (id, parent_id, teen_id, pack_id, party_date, guest_count, total_dh, status, notes, created_at)
- `anniv_order_extras` (order_id, extra_id, quantity)

No `menu_items`, `food_orders`, `food_order_items`, `nutrition_challenges`, or `restaurants` tables exist. Catering is implicit inside the birthday-pack flow (fixed packs at 3500/5500/12000 DH, see `app/anniversaires/organiser/page.tsx`). No DH→coins conversion is plumbed into anniv_orders (it is a pure DH price).

**Partners** — `partners.partner_type` is TEXT with the four cases handled in `app/api/partners/register/route.ts`: `retail`, `venue`, `club`, `education`. No `food`, no `restaurant`, no `sub_category`. There is no menu manager UI, no incoming-orders feed for partners.

**Code** — Grep for `restaurant|glovo|jumia|nutrition|menu_item|food_order` returned 20 hits, all of which are: (a) marketing copy in `app/devenir-partenaire`, (b) research/benchmarking docs under `research/`, (c) prior vision docs (`partner-network.md`, `physical-challenges.md`, `data-model.md`) referencing the *concept* of restaurants, and (d) a prompt asset in `lib/ai/enhanced-quiz-prompts.ts`. None of these wire a real ordering loop.

**Conclusion** — Greenfield surface. Catering is the only adjacent existing flow (birthday packs), and it is hard-coded, not menu-driven. No aggregator integration. No nutrition layer anywhere in the schema.

## 3. Target Experience

**Teen** — Opens `/teen/food`, sees a discovery grid: nearby partner restaurants, filter chips (Healthy, Halal, Vegetarian, Under 50 coins, Ready in 15 min, Pickup-only). Taps a restaurant → menu with photos, calorie tags, prep time, coin price. Builds cart, picks delivery / pickup-at-venue / dine-in. If parent has set a weekly food budget, remaining budget shows live. Submits → coin debit reserved (not yet captured). Tracks order status: `pending` → `partner_accepted` (debit) → `preparing` → `out_for_delivery` (ride pool) → `delivered` (cashback XP fires).

**Parent** — `/parent/food` shows: this week's food spend vs budget, active orders, allergen profile per teen, ability to set a `nutrition_challenge` ("for the next 14 days, max 600 kcal/order, min 1 vegetable item"). Approval inbox surfaces orders that exceed ceiling or violate challenge rules.

**Partner restaurant** — `/partner/restaurant` is a menu manager (CRUD on items with photos, nutrition tags, availability windows, prep time) + an incoming-orders feed (kitchen ticker) + accept / reject controls. Acceptance triggers coin capture and XP cashback.

**Catering / birthday** — `anniv_orders` evolves: a venue partner with `sub_category='catering'` can attach `menu_items` to a pack, so the existing intimate/big/legendary packs become menu-backed instead of fixed-price.

## 4. Integration Surface

- **Aggregator path (Glovo / Jumia Food)** — Phase-2 connector that surfaces aggregator inventory as Nivy menus, with the aggregator handling fulfillment. Coins still settle through Nivy; we reimburse the aggregator in DH. Pros: instant coverage. Cons: no nutrition tags, no halal verification, thin partner data.
- **Direct partner path** — Restaurant manages its own menu in Nivy; Nivy ride-pool (see `transport-mobility` vision) delivers, or pickup at venue. Pros: full control, halal/nutrition tags accurate, XP loop tight. Cons: requires per-restaurant onboarding.
- **Catering path** — Direct partner only, attached to `anniv_orders.pack_id` so a birthday booking can include a real menu, not a fixed bundle.
- **Cross-system** — Hooks into `parental-authorizations` for over-ceiling spend, `economy` for coin debit/credit + cashback XP, `partner-network` for the restaurant sub-type, `transport-mobility` for delivery, `gamification` for nutrition-challenge XP, `notifications` for kitchen ticker + status pushes, `data-model` for the new tables.

## 5. Risks & Open Questions

- **Halal enforcement** — In Moroccan context halal is the default expectation. Hard-block non-halal items, or warn-and-allow? Default proposal: hard-block at filter level, item-level warning if a partner self-declares non-halal.
- **Allergen liability** — Who is liable for an undeclared allergen — partner, Nivy, parent? Need a partner-attestation step on each menu item.
- **Aggregator economics** — Glovo / Jumia take 25-30% commission; can we pass through coin pricing without breaking partner margins?
- **Delivery driver identity** — Nivy ride pool drivers are vetted (parent visibility); aggregator drivers are not. Mixing them weakens the safety story.
- **Group orders / split bill** — Multi-teen orders need multi-parent approval. UX gets complex fast.
- **Subscription meal plans** — Parent funds 5 lunches/week. Should this be a recurring `parental_authorization` or a new product?
- **Loyalty tiering** — Free dessert at 10 orders is partner-funded; needs a clearing mechanism distinct from XP.
- **Ramadan mode** — Iftar-window scheduling and pre-ordering deserve a dedicated feature flag.

## 6. Phasing

- **P0 (foundation)** — `partners.sub_category` column, `menu_items`, `food_orders`, `food_order_items` tables. RLS: partner sees own menu/orders, parent sees teen's orders, teen sees own.
- **P1 (direct ordering)** — `/partner/restaurant` menu manager + orders feed; `/teen/food` discovery + cart + pickup flow; coin debit on partner accept; cashback XP on delivered.
- **P2 (delivery)** — Ride-pool integration, `food_orders.ride_booking_id` link, live tracking.
- **P3 (parent layer)** — `/parent/food`, weekly budget, `nutrition_challenges` table, ceiling-aware approvals.
- **P4 (catering merge)** — Attach `menu_items` to `anniv_orders` packs; deprecate fixed-price extras.
- **P5 (aggregator)** — Glovo / Jumia connector behind a feature flag, only where direct partners are absent.
- **P6 (group + subscriptions)** — Split-bill multi-teen orders, recurring meal plans.

## SPEC

### Data contract additions

```sql
ALTER TABLE partners ADD COLUMN IF NOT EXISTS sub_category TEXT
  CHECK (sub_category IN ('restaurant','cafe','bakery','catering','grocery'));
-- Within partner_type='venue' or new partner_type='food'
-- Today partners.partner_type only handles ('retail','venue','club','education')
-- per app/api/partners/register/route.ts; extend the switch.

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,                 -- 'starter','main','drink','dessert','snack'
  price_dh NUMERIC(8,2) NOT NULL,
  price_coins INTEGER NOT NULL,
  image_url TEXT,
  calories INTEGER,
  nutrition_tags TEXT[],         -- 'healthy','vegetarian','halal','gluten_free','low_sugar'
  allergens TEXT[],              -- 'gluten','dairy','nuts','egg','soy','shellfish'
  available_from TIME,
  available_until TIME,
  available_days INTEGER[],      -- 0..6, ISO day-of-week
  prep_time_minutes INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE food_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL,
  parent_id UUID NOT NULL,
  partner_id UUID NOT NULL REFERENCES partners(id),
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('delivery','pickup','dine_in')),
  delivery_address TEXT,
  scheduled_for TIMESTAMPTZ,
  total_dh NUMERIC(8,2) NOT NULL,
  total_coins INTEGER NOT NULL,
  delivery_fee_dh NUMERIC(6,2) DEFAULT 0,
  cashback_xp INTEGER DEFAULT 0,
  payment_method TEXT NOT NULL,  -- 'coins','dh_topup','mixed'
  status TEXT NOT NULL,          -- 'pending','partner_accepted','preparing','out_for_delivery','delivered','cancelled','refunded'
  parent_approval_id UUID,       -- references parental_authorizations
  ride_booking_id UUID,          -- references ride pool when delivery
  challenge_id UUID,             -- references nutrition_challenges if active
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE food_order_items (
  order_id UUID NOT NULL REFERENCES food_orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price_coins INTEGER NOT NULL, -- snapshot
  customizations JSONB,
  PRIMARY KEY (order_id, menu_item_id)
);

CREATE TABLE nutrition_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  parent_id UUID NOT NULL,
  teen_id UUID NOT NULL,
  budget_coins INTEGER,
  nutrition_targets JSONB,   -- {min_veggies:2, max_calories:800, max_sugar_g:30, require_halal:true}
  reward_xp INTEGER DEFAULT 0,
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### API

- `POST /api/teen/food/order` — create order. Validates: teen coin balance, parent weekly food budget, ceiling rule, active `nutrition_challenges` policy, halal default, allergen profile, partner availability windows. Creates `parental_authorizations` row if total > ceiling.
- `GET /api/teen/food/menu/:partner_id` — browse menu, with `is_active=true` and current-time within `available_from/until` and current-day in `available_days`.
- `POST /api/partner/restaurant/menu/items` — partner staff CRUD on menu items; nutrition tags + allergen attestation required.
- `POST /api/partner/restaurant/orders/:id/accept` — flips status to `partner_accepted`, captures coin debit, schedules ride pool if `delivery_type='delivery'`.
- `POST /api/partner/restaurant/orders/:id/reject` — flips to `cancelled`, releases reservation, refund if any DH was charged.
- `POST /api/parent/food/budget` — parent sets weekly food budget in coins.
- `POST /api/parent/food/nutrition-challenge` — create / update a `nutrition_challenges` row.
- `GET /api/parent/food/orders` — list teen orders with policy hits.

### UI

- `/teen/food` — discovery (nearby, by category, healthy / halal filter, prep-time chip).
- `/teen/food/:partner_id` — menu + cart, live remaining budget if parent set one.
- `/teen/food/order/:id` — tracking with status timeline.
- `/parent/food` — active orders, weekly budget, allergen profile, nutrition-challenge composer.
- `/partner/restaurant` — menu manager + incoming-orders kitchen ticker.
- Catering: extend `app/anniversaires/organiser` to attach `menu_items` to a pack.

### Invariants

- Nutrition challenge active → an order whose summed `calories` exceeds `max_calories` is blocked unless parent overrides via `parental_authorizations`.
- Halal default ON in Moroccan context: filter excludes non-halal; if a teen explicitly disables the filter, an item-level warning is shown before submit.
- Delivery fee is a separate line item, never bundled into `total_coins` of items.
- Coin debit happens only on `status='partner_accepted'`. A `pending` order only reserves balance.
- Partner cancellation → automatic refund of coins + DH topup, with audit log.
- Allergen profile match: any item whose `allergens` intersect the teen's declared allergens is hidden from menu UI and blocked at API level (defense in depth).
- Cashback XP fires once on `status='delivered'` and is idempotent on the order id.

### Acceptance criteria

- ☐ Teen orders a 50-DH meal in coins from a venue partner with `sub_category='restaurant'`.
- ☐ Order shows up in the partner restaurant dashboard's incoming-orders feed within 5 seconds.
- ☐ Partner accepts → coin debit posts in `economy` ledger and cashback XP fires on delivered.
- ☐ Parent sees the order in `/parent/food` with calorie + halal status.
- ☐ A `nutrition_challenge` with `max_calories=600` blocks an 800-kcal fast-food order until parent override.
- ☐ Refund is automatic on partner cancellation, with a ledger entry.
- ☐ Halal-default OFF + non-halal item triggers a confirm dialog before submit.
- ☐ Catering: a birthday pack in `anniv_orders` can be linked to a menu of `menu_items` instead of fixed extras.

### Open questions

- Aggregator (Glovo / Jumia) integration vs direct partner orders — which goes first, and is the aggregator a per-city fallback only?
- Delivery driver: Nivy ride pool (transport-mobility vision) or restaurant-managed couriers?
- Halal-by-default rule enforcement: hard block or warning-and-confirm?
- Group order: split-bill mechanics + multi-teen / multi-parent approval flow?
- Loyalty tier on restaurants (free dessert at 10 orders) — partner-funded clearing?
- Subscription meal plans (parent funds 5 lunches/week) — recurring authorization or new product?
- Ramadan-iftar pre-order window: feature flag or first-class scheduling primitive?
- Allergen liability split: partner attestation vs Nivy verification vs parent acknowledgement?
- How does `anniv_orders` migrate — keep fixed packs and overlay menus, or fully menu-drive packs?
