# Marketplace C2C — Peer-to-Peer Selling for Teens

## 1. Vision & Intent

Nivy's C2C marketplace is a **safe, moderated peer-to-peer trading space** modeled on Vinted / Facebook Marketplace, but tailored to teens (13–17) under parental oversight. The product enables teens (and their parents) to **buy and sell among themselves**: used clothing, books, school supplies, sports gear, gaming consoles, handmade art, crafts, jewelry, concert ticket resale, peer tutoring services, and limited small services (dog-walking, gardening) for older teens.

Unlike open marketplaces, every listing is **reviewed before publish** (admin moderation + image AI), every transaction passes through **escrow held by Nivy**, and every meet-up happens at a **partner venue or school** — never at private addresses. Coins are the primary in-app currency; DH amounts may apply for high-value items but trigger stricter parental approval. A "Nivy Guarantee" trust badge rewards reliable sellers (≥10 sales, rating ≥ 4.5). Anti-money-laundering caps prevent abuse: max 5 active listings per teen, max 1000 DH/month total sales.

This is the **circular economy pillar** of Nivy — encouraging reuse, frugality, entrepreneurship, and peer trust, while keeping risk under tight admin and parental control.

## 2. Current State (Code & DB Audit)

**Implementation: 0%.** Despite the word "marketplace" appearing in components, **no C2C feature exists**.

What exists today is a **rewards/partner-deals surface** that reuses the marketplace label:
- `components/teen/marketplace-overlay.tsx` — hardcoded partner deal cards (Nike, Megarama) costing XP, not peer listings.
- `components/teen/dashboard/marketplace-drops.tsx` — hardcoded "drops" (McDonald's, Virgin Megastore) — partner promo XP-unlock cards, no listings, no sellers, no escrow.
- `components/teen/dashboard/lazy-components.tsx`, `lib/client/lazy-components.tsx` — lazy-load wrappers for the above.

**Database (live audit on `imchornjvmgmaovhypco`)**: query `pg_tables WHERE tablename ILIKE '%market%' OR '%listing%' OR '%seller%' OR '%buyer%' OR '%c2c%'` returns **`[]`** — zero tables. No `marketplace_listings`, no `marketplace_transactions`, no `marketplace_disputes`, no `user_seller_stats`, no escrow ledger, no rating/review tables, no dispute workflow.

**Conclusion**: marketplace C2C is a **greenfield build**. Existing "marketplace" UI must be either renamed (e.g., `partner-deals-*`) or evolved to coexist with a true C2C surface. Adjacent vision docs already exist that this feature must integrate with: `parental-authorizations.md`, `admin-moderation.md`, `economy.md`, `partner-network.md`, `ai-safety-teen-welfare.md`, `payment-rails-morocco.md`.

## 3. Target Architecture

A six-layer stack:
1. **Listings** — draft → pending_moderation → active → sold/removed/reported. Photos in private bucket until approved; auto-published to public bucket post-approval.
2. **Moderation pipeline** — keyword denylist (weapons/drugs/contact info), image AI scan, admin manual review on `moderation_queue`.
3. **Escrow** — buyer's coins debited on Buy, held in Nivy treasury, released on `confirm-receipt` (or 3-day auto-release). Disputes freeze the escrow.
4. **Parental approval gateway** — wraps both listing publication (sellers) and purchase (buyers) when the user is a teen, reusing `parental_authorizations`.
5. **Safe-meet layer** — meet location restricted to `school` or `venue_partner` for teen↔teen; shipping permitted only adult↔adult.
6. **Trust & analytics** — `user_seller_stats` aggregates sold count, rating, revenue; powers the "Nivy Guarantee" badge and discovery ranking.

## 4. User Journeys

- **Teen seller (Yasmine, 15)**: opens `/marketplace/sell`, lists used Zara jacket for 200 coins. Listing → `pending_moderation`. Admin approves in <24h. Listing visible in feed.
- **Teen buyer (Adam, 14)**: discovers jacket in `/marketplace`, taps Buy. Coins debited & held in escrow. Parent receives push → approves in `parental_authorizations`. Both teens scheduled to meet at partnered school cafeteria. Adam confirms receipt → coins release to Yasmine, platform fee (5–10%) to Nivy, cashback XP to Adam.
- **Tutor (Sara, 16)**: lists "1h math tutoring" service for 80 coins. Same moderation, parental approval, meet at school library.
- **Parent reseller**: parent lists outgrown kid's clothes from their own account (open question — see §6).
- **Disputed sale**: Adam claims jacket damaged → opens dispute → admin reviews chat + photos → refund or release.

## 5. Risks & Constraints

- **Money laundering**: hard cap 1000 DH/month per teen seller; total volume monitored.
- **Adult predators**: meet locations restricted to school/partner venues; no addresses or phone numbers (regex-filtered descriptions).
- **Counterfeits / illegal items**: keyword denylist + image AI + admin review.
- **Disputes & chargebacks**: 3-day escrow window; admin-only resolution.
- **Tax / Moroccan legal compliance**: occasional teen-to-teen sales likely below tax thresholds, but high-value items (gaming consoles) need verification — flag to legal.
- **Fee transparency**: platform fee 5–10% must be displayed pre-purchase.
- **Image storage cost**: private→public bucket migration on approve; lifecycle rule deletes images of removed listings after 30 days.

## 6. Adjacent Systems & Dependencies

- `parental_authorizations` (vision: parental-authorizations.md) — gates publish ≥ 200 coins and all teen buys.
- `moderation_queue` (vision: admin-moderation.md) — every listing routes through admin review.
- `partner_venues` (vision: partner-network.md) — provides safe-meet locations.
- Coin/XP ledger (vision: economy.md, rewards-economy.md) — escrow accounting + cashback.
- AI safety pipeline (vision: ai-safety-teen-welfare.md) — content scan on images & descriptions.
- Payment rails (vision: payment-rails-morocco.md) — only relevant if DH cash-out.
- Notifications (vision: notifications.md) — listing approved, buy request, parent approval, meet reminder, receipt confirmation, dispute opened.

---

## SPEC

### Data contract

```sql
public.marketplace_listings (
  id UUID PK,
  seller_user_id UUID NOT NULL REFERENCES users(id),
  category TEXT CHECK (category IN ('clothing','books','school','sport','gaming','art','crafts','tickets','services','other')),
  title TEXT NOT NULL, description TEXT,
  price_coins INTEGER, price_dh NUMERIC,
  images TEXT[],                         -- private bucket initially, public on approve
  condition TEXT CHECK (condition IN ('new','like_new','good','fair','poor')),
  size TEXT, brand TEXT, color TEXT,
  status TEXT CHECK (status IN ('draft','pending_moderation','active','sold','removed','reported')),
  moderation_id UUID REFERENCES moderation_queue(id),
  city TEXT, neighborhood TEXT,
  views_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,                -- auto-removed after 30d unless renewed
  created_at TIMESTAMPTZ DEFAULT now(),
  sold_at TIMESTAMPTZ
);

public.marketplace_transactions (
  id UUID PK,
  listing_id UUID REFERENCES marketplace_listings(id),
  buyer_user_id UUID, seller_user_id UUID,
  amount_coins INTEGER, amount_dh NUMERIC,
  cashback_xp INTEGER, platform_fee_coins INTEGER,
  status TEXT CHECK (status IN ('escrow','completed','disputed','refunded','cancelled')),
  meet_method TEXT CHECK (meet_method IN ('school','venue_partner','public_pickup','shipping')),
  meet_location_partner_id UUID REFERENCES partner_venues(id),
  meet_at TIMESTAMPTZ,
  rated_by_buyer BOOLEAN DEFAULT false, rated_by_seller BOOLEAN DEFAULT false,
  parent_approval_id UUID REFERENCES parental_authorizations(id),
  auto_release_at TIMESTAMPTZ,           -- escrow auto-release T+3d
  created_at TIMESTAMPTZ DEFAULT now()
);

public.marketplace_disputes (
  id UUID PK,
  transaction_id UUID REFERENCES marketplace_transactions(id),
  opened_by UUID, reason TEXT,
  evidence_urls TEXT[],
  status TEXT CHECK (status IN ('open','investigating','resolved_buyer','resolved_seller','rejected')),
  resolution TEXT, resolved_by UUID, resolved_at TIMESTAMPTZ
);

public.marketplace_ratings (
  id UUID PK,
  transaction_id UUID REFERENCES marketplace_transactions(id),
  rater_user_id UUID, ratee_user_id UUID,
  stars INTEGER CHECK (stars BETWEEN 1 AND 5),
  comment TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

public.user_seller_stats (
  user_id UUID PK,
  listings_count INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  rating_avg NUMERIC(3,2) DEFAULT 0,
  total_revenue_coins INTEGER DEFAULT 0,
  total_revenue_dh_month NUMERIC DEFAULT 0,
  trust_badge BOOLEAN DEFAULT false,
  last_listing_at TIMESTAMPTZ
);
```

### Trust & moderation
- All listings → `moderation_queue` (admin reviews title + image + description before publish).
- Auto-reject keywords: weapons, drugs, alcohol, tobacco, contact info (phone/email regex), addresses, brand counterfeits.
- Image AI scan: NSFW + blocked categories.
- Listings expire after 30 days unless renewed.
- Trust badge: 10+ sold + rating ≥ 4.5 + zero disputes in 90 days.
- Repeated dispute losses → seller suspension.

### API
- `POST   /api/marketplace/listings` — draft → moderation
- `GET    /api/marketplace/listings` — discover (geo + category + price filters)
- `GET    /api/marketplace/listings/:id` — detail + view counter
- `PATCH  /api/marketplace/listings/:id` — edit (re-triggers moderation)
- `DELETE /api/marketplace/listings/:id` — remove (soft)
- `POST   /api/marketplace/listings/:id/buy` — escrow + parental_approval if buyer is teen
- `POST   /api/marketplace/transactions/:id/confirm-receipt` — releases escrow
- `POST   /api/marketplace/transactions/:id/dispute` — opens dispute, freezes escrow
- `POST   /api/marketplace/transactions/:id/rate` — post-meet rating
- `GET    /api/admin/marketplace/queue` — moderation pending
- `POST   /api/admin/marketplace/disputes/:id/resolve` — admin verdict

### UI
- `/marketplace` — discover feed (categories, search, geo)
- `/marketplace/sell` — create listing (multi-step wizard: photos → details → price → safety acknowledgment)
- `/marketplace/listings/:id` — detail page with seller profile + trust badge
- `/marketplace/my-listings` — manage own listings
- `/marketplace/orders` — buy/sell history + escrow states
- `/parent/marketplace` — parent visibility on teen's listings + pending approvals
- `/admin/marketplace` — moderation queue + disputes + analytics

### Invariants (SAFETY-CRITICAL)
- Teen sellers: `parental_approval` required to publish any listing ≥ 200 coins (or any DH listing).
- Teen buyers: `parental_approval` per buy (or autonomous mode within preset ceiling).
- No private contact info in listing — regex filter + admin review.
- Meet at `school` or `venue_partner` ONLY for teen↔teen; `public_pickup` and `shipping` blocked when either party is a minor.
- Escrow held by Nivy until buyer confirms receipt; 3-day auto-release if no dispute.
- Cap: teen seller max **5 listings active simultaneously**.
- Cap: teen sales total ≤ **1000 DH/month** (anti-money-laundering).
- Sold items unsearchable, archived for audit ≥ 24 months.
- Listing images stored in private bucket until moderation approves; never public for `removed`/`reported`.

### Acceptance criteria
- [ ] Teen lists used jacket for 200 coins → moderation_queue → admin approves within SLA
- [ ] Other teen sees listing in `/marketplace`, taps Buy
- [ ] Parent of buyer gets approval request → approves
- [ ] Coins debited from buyer + held in escrow ledger
- [ ] Teens meet at partner venue + buyer confirms receipt
- [ ] Coins released to seller + commission to Nivy + cashback XP to buyer
- [ ] Bilateral rating recorded; `user_seller_stats` updated
- [ ] Attempt to publish 6th active listing rejected with cap error
- [ ] Attempt to add phone number in description blocked by regex pre-submit
- [ ] Dispute opened within 3 days freezes auto-release; admin resolves

### Open questions
- Platform fee % (suggest 5–10%) — fixed or tiered by category?
- Image AI moderation: who pays the API cost — Nivy operating cost or absorbed in platform fee?
- Adult↔teen sale: completely blocked, or parent-approved with extra friction?
- Refund policy if item not as described — full refund, partial, or buyer-keeps-item?
- Tax / legal compliance for teen-to-teen sales in Morocco — threshold & reporting obligations?
- Anti-fraud: ID verification needed for high-value listings (>500 DH)?
- Could parents resell their own kid's outgrown stuff from a parent account (separate seller type)?
- Concert ticket resale: face-value cap to prevent scalping?
- Service listings (tutoring, dog-walking): minimum age, liability insurance?
- Cross-school discovery: limit to same-city, same-school, or open?
