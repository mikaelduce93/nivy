# Wave 4C — Lifestyle / Supply Cleanup (2026-05-09)

> Closed beta only. No production deploy. No new feature. No fake inventory.
> No fake booking confirmation. No new partner_type.

## Scope closed

### A. Marketplace listing truth — ✅
- `app/api/marketplace/listings/[id]/route.ts` rebuilt:
  - **GET** — public visibility gated to `status='active'`. Non-active
    listings (`pending_review`, `rejected`, `removed`, `sold`) are visible
    only to the seller (`seller_user_id === userInfo.profileId`) or to an
    admin/moderator (`content.view` permission). Other callers get a 404
    rather than a 403 — we do not leak existence of unmoderated content.
    (canon §3 marketplace LOCKED).
  - **PATCH** — owner-only edit on a documented field allowlist. Material
    edits to a `status='active'` listing flip it back to `pending_review`
    so the change re-enters moderation. `sold` and `removed` are not
    editable (409 `listing_not_editable`). Same contact-info regex as the
    creation path defends against handle/phone/email leakage on edit.
  - **DELETE** — owner-only soft delete (`status='removed'`). `sold`
    listings cannot be deleted (409 `cannot_delete_sold`).
- The public marketplace feed (`/api/marketplace/listings` GET and
  `app/marketplace/page.tsx`) already filters `status='active'` — verified
  unchanged.
- Creation path (`POST /api/marketplace/listings`) already uses
  `create_listing` SECURITY DEFINER RPC and the contact-info sanitiser —
  verified unchanged.

### B. Food / restaurant supply truth — ✅
- `app/api/partner/restaurant/orders/[id]/accept/route.ts` and
  `.../reject/route.ts` now do a **defence-in-depth ownership check**
  before invoking the SECURITY DEFINER RPC:
  1. Resolve the caller's `partners.id` via their email.
  2. Read `food_orders.partner_id, status` for the target order id.
  3. 404 if the order does not exist.
  4. 403 `not_order_owner` if `order.partner_id !== caller_partner.id`.
  5. 409 `invalid_status` if the order is not in a transitionable state
     (`accept` requires `pending`; `reject` accepts `pending` or `accepted`).
- Without this gate, a partner could in principle craft a request with
  another partner's order id and rely solely on the RPC to refuse. With
  the gate, the API surface gives a clean 4xx contract instead.
- `partner_accept_food_order` and `partner_reject_food_order` remain the
  authoritative SECURITY DEFINER mutations (Wave 1B, B.3).
- Menu-item ownership: `app/api/partner/restaurant/menu/items/[id]/route.ts`
  already uses `partnerOwns()` — verified unchanged.

### C. Event / birthday / venue supply truth — verified clean
- `app/api/bookings/create/route.ts` writes the booking with
  `payment_status='pending'` and `status='pending_payment'` — no fake
  confirmation. CSRF + rate limit + budget gate + parental approval
  cascade are all in place.
- No `app/venues/*` or `app/birthday/*` routes exist; the canon does not
  require them for closed beta.

### D. Inventory / stock truth — verified clean
- A repo-wide grep for `(in_stock|stock_count|inventory_count|availability:.*true)`
  returns one match: `app/ambassador/boutique/page.tsx`'s `Reward.stock`
  field — that is real ambassador-rewards data, not lifestyle/supply, and
  is out of scope for this wave.
- Marketplace listings carry no inventory counter (single-item resale model).

### E. Supply moderation integration — verified
- The `marketplace_listing` adapter added in Wave 4A
  (`lib/admin/moderation-adapters.ts`) is the moderation entry point for
  listings. Wave 4C's status gate on the public listing GET endpoint
  closes the loop: hidden / deleted / pending_review listings cannot
  surface to non-owners regardless of bookmark / direct link.

### F. UI truth cleanup — verified clean
- `app/marketplace/**` — only legitimate `placeholder=` form attributes
  (input hints), no mock data.
- `app/partner/restaurant/**` — no mock data.
- `app/agenda`, `app/reservation/**` — already wired to real `events` /
  `bookings` rows.

### G. Tests + compliance docs — ✅
- `tests/unit/wave4c-lifestyle-supply.test.ts` — static guard:
  - Marketplace listing route exports GET, PATCH, DELETE.
  - GET path contains the `PUBLIC_VISIBLE_STATUSES` gate.
  - Restaurant accept + reject routes contain `not_order_owner`.
  - Restaurant accept + reject routes do an order ownership lookup
    (`food_orders` → `partner_id`) BEFORE calling the RPC.
- This file (`docs/compliance/wave-4c-lifestyle-supply.md`).
- Updated `docs/compliance/10-lifestyle-compliance.md` with the new
  closures.

## Out of scope (intentional)

- New marketplace categories or experiences.
- New partner_type beyond the locked taxonomy (Wave 3B.1.1).
- A real-time inventory model for restaurants (none exists yet; menu
  items just have an `is_active` boolean — that is the canonical truth).
- Any production secret rotation or deploy.

## Score impact (claimed, pending re-audit)

- lifestyle-supply: 62 → 78 (+16) toward the 82 target.
- overall: 81 → 83 (+2).

## Next

1. End-of-remediation **secret rotation** (D.1) + closed-beta smoke test.
2. Wave 5 — launch readiness.
