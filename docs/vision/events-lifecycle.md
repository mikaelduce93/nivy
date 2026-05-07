# Events Lifecycle Audit

Status: Audit snapshot (read-only) of the Nivy events domain. Live Supabase project `imchornjvmgmaovhypco`.

## 1. Vision

Events are intended to be the **central social/business object** of Nivy: themed birthday parties, concerts, sport tournaments, educational workshops, club meetups. Created by venue/club partners (or the Nivy admin team) and surfaced to teens through `/agenda` (public) and `/teen/calendar` (logged-in teen).

End-to-end intended flow:

1. Partner (or admin) drafts an event: `title`, `event_date`, `venue`, `capacity`, `price` (DH) plus optional XP/coins, age range (`age_min`/`age_max`), AEFE flag, theme/category, image gallery, dress code, transport options, VIP/Premium pricing tiers.
2. Discovery: teen browses `/agenda` with filters on city / type / theme / age / price / AEFE; sees popularity, "almost full", "new" badges; can drill into `/agenda/[id]` to see artists, gallery, FAQ, similar events.
3. Reservation: teen taps "Réserver" -> `/reservation?event=...` -> `/api/bookings/create` (writes `bookings` + `booking_tickets` with QR codes) -> `/reservation/paiement` -> hybrid checkout `/api/payments/hybrid` (XP + DH via Stripe / CMI).
4. Parental gate: budget check via `lib/budget/check-budget.ts`; if over ceiling or "sensitive", a `booking_approval_requests` row is created and a notification is sent to the linked parent (`/parent/events`, `/reservation/approbation`).
5. Day-of: teen is checked-in by partner via `app/partner/scanner` (today: VIP card scanner) or `/api/check-in/entry` / `/exit` / `/verify-pass`; XP awarded on check-in (`xp_awarded` column).
6. In-event gamification: `event_challenges` (early_bird, stay_late, dance_floor, photo_booth, social_butterfly, VIP, etc.) granting XP/bonus XP; geofenced via `target_location` + `target_radius_meters`.
7. Post-event: `event_reviews` (overall + ambiance/music/staff/value sub-ratings, pros/cons, photo URLs, moderation, helpful_count, XP reward); leaderboards via `get_event_leaderboard` RPC; recap stats via `get_user_event_stats`.
8. Cancellation/refund: UI advertises "annulation gratuite 48h avant"; no enforcement code path found.

## 2. Code state

- Public discovery: `app/agenda/page.tsx` (server fetch from `events`) + `components/agenda/events-client.tsx` (client filters: search, city, type, theme, age, AEFE, price range, sort by date/price/popularity/spots, grid/list, pagination), and detail page `app/agenda/[id]/page.tsx` (joins `cities` and `venues`, gallery, artists hardcoded, reviews hardcoded, similar events, transport radio).
- Teen surfaces: `app/teen/calendar/page.tsx` + `calendar-client.tsx` (month grid, hydrated from `getTeenDashboardData`). No `app/teen/agenda/` route. Legacy `app/evenements/` does not exist.
- Reservation flow: `app/reservation/page.tsx` -> `app/api/bookings/create/route.ts` (rate-limited, CSRF, budget check, `booking_approval_requests` branch, `bookings` insert with `payment_status=pending`/`status=pending_payment`, generates per-teen `booking_tickets` with QR via `qrcode.toDataURL`) -> `app/reservation/paiement/page.tsx` -> `app/teen/shop/checkout/checkout-client.tsx` posts to `/api/payments/hybrid`.
- Admin authoring: `app/admin/evenements/{page,creer,[id]/modifier,[id]/supprimer}` — full CRUD UI (title, slug, date/time, venue, city, capacity, base price, image, category, age range, VIP price preview).
- Partner authoring: `app/partner/events/page.tsx` is a **mock/static** UI ("Demander un stand") with hardcoded events array — partners cannot create events from the partner portal today.
- Partner scanner: `app/partner/scanner/page.tsx` is wired to `/api/partner/verify-card` + `/api/partner/apply-discount` (loyalty card, not event ticket validation). Door-validation of event tickets goes through the separate `app/api/check-in/{entry,exit,verify-pass}` endpoints.
- Gamification: `gamification-system/features/event-challenges/{schema,actions}.ts` defines 20 challenge slugs, RPCs `get_event_challenges`, `check_in_to_event`, `check_out_from_event`, `complete_event_challenge`, `submit_event_review`, `get_user_event_stats`, `get_event_leaderboard`, plus `challenge-proofs` storage bucket.
- Parent visibility: `app/parent/events/page.tsx` exists; `components/features/events/{events-list-client,vip-pricing-badge}.tsx` provide tier pricing display.

## 3. DB state (live)

Tables found relating to events lifecycle: `events`, `bookings`, `event_check_ins`, `event_reviews`, `event_challenges`, `event_challenge_types`, `user_event_challenge_progress`, `partners`, `partner_discounts`.

Counts: `events=0`, `bookings=1` (status `pending`), `event_check_ins=0`, `event_reviews=0`, `event_challenges=0` — the lifecycle is wired but unused.

`events` columns (live): `id, slug, title, description, event_date, venue_id, status, created_at, updated_at` — only **9 columns**. Code reads many absent columns: `type, theme, city, capacity, current_attendees, price, age_min, age_max, partner_id, has_aefe_discount, image_url, dress_code, price_vip, price_premium`. Detail page joins `venue:venues(name, address)` and `city:cities(name)` but neither `venues` nor `cities` table appears in the listing of related tables (the `partner_venues` MCP probe returned nothing).

`bookings` columns: `id, user_id, event_id, booking_reference, status, payment_status, total_amount, payment_method, paid_at, created_at, updated_at, xp_used, xp_value, amount_after_xp`. The booking creation route writes `parent_id`, `qr_code`, and creates a `booking_tickets` row — none of `parent_id`/`qr_code`/`booking_tickets` exist in the live schema.

`event_check_ins` columns: `id, event_id, teen_id, checked_in_at, checked_out_at, latitude/longitude, check_in_method, device_info, xp_awarded`. Gamification actions reference different shape (`user_id`, `check_in_time`, `check_out_time`, GeoJSON `check_in_location`, `status`, `duration_minutes`).

`event_reviews` columns: `id, event_id, teen_id, overall_rating, ambiance_rating, music_rating, staff_rating, value_rating, comment, pros, cons, photo_urls, is_verified, is_visible, moderated_at, helpful_count, xp_awarded, created_at, updated_at`. Schema in `event-challenges/schema.ts` instead expects `user_id, rating, review_text, atmosphere_rating, service_rating, would_recommend, xp_earned`.

No `event_categories`, `event_tickets`, `event_reservations`, `partner_venues`, `waitlist`, `cities`, `venues`, `booking_tickets`, `booking_approval_requests`, `notifications` tables surfaced for the events domain in the probes (only `bookings`, `partners`, `partner_discounts`, plus the five `event_*` tables and `user_event_challenge_progress`).

## 4. Gaps

- **Schema drift, severe.** The `events` table is a stub (9 columns) while the entire teen UI assumes ~20+ rich columns. `/agenda` will silently render empty/undefined for everything except title/date.
- **Partner authoring missing.** No partner-side event creation UI; only admin can create. `app/partner/events` is mock data with "Demander un stand" buttons that go nowhere. `events.partner_id` does not exist, so no partner attribution / payout linkage.
- **Booking write path will fail.** `bookings.insert({ parent_id, qr_code, ... })` and `booking_tickets` insert will both 500 against the live DB. `booking_approval_requests` and `notifications` tables also referenced but not present in surveyed tables.
- **Two divergent check-in / review schemas.** `event_check_ins` and `event_reviews` columns disagree with the gamification module's Zod schemas, so the RPCs (`check_in_to_event`, `submit_event_review`, etc.) likely target different tables or migrations not yet applied.
- **Scanner mismatch.** Partner scanner verifies VIP loyalty cards, not event tickets. Door-validation of event QR codes lives under `/api/check-in/*` but the partner UI for that flow is not surfaced.
- **No capacity / waitlist enforcement.** Capacity & `current_attendees` are read but never written; no concurrency-safe reservation increment, no waitlist table, no overbooking protection.
- **No cancellation / refund engine.** UI promises "48h refund" but no booking-cancellation API, refund job, or policy field on `events`.
- **No category taxonomy.** Filters use free-text `theme` / `type` strings; no `event_categories` table.
- **Hardcoded UI content.** Detail page artists, gallery URLs, reviews, FAQ are all literal arrays — not driven by the DB.
- **No post-event XP grant pipeline** beyond per-challenge RPCs; no automated bonus on check-in/check-out completion in the `events` row itself.
- **Parental authorization gate.** Budget check exists, but "sensitive event" classification (e.g. age vs ceiling) has no flag column on `events`.

## 5. Risks

- **Production-blocking schema drift**: any teen attempting to reserve will hit insert errors on `bookings`/`booking_tickets`. Highest priority.
- **Silent feature loss**: filters by city/age/price will return empty because columns are missing — looks "fine" in dev with empty `events`, breaks user trust on first real seed.
- **Double-booking / race**: without atomic capacity decrement and unique `(event_id, teen_id)` constraints, capacity overflow is trivial.
- **Compliance / parental authorization**: parental gate relies entirely on `lib/budget/check-budget.ts`; if approval insert fails, teen could end up paying without parent consent.
- **PII in QR**: `bookingQrData` JSON includes `parent_id` (UUID) and `child_id` — printable QR exposes IDs; no signed token.
- **Scanner spoofing**: door check-in uses raw card number; no HMAC / nonce verification surfaced.
- **Refund / no-show liability**: cancellation policy promised in copy but unenforceable -> dispute risk.
- **Partner economics**: with no `partner_id` on events and no `partner_venues`, payouts cannot be attributed for event-driven revenue.

## 6. Open questions

1. **Authorship model** — Are events curated by Nivy admin only (current code reality) or co-authored by partners (vision)? If partners, what's the moderation flow?
2. **Cancellation policy** — Refund window (the UI says 48h)? Partial vs full refund? XP refund vs DH refund? Who eats the Stripe/CMI fee?
3. **Group bookings** — Can a "crew" co-book and split price? Different pricing tiers? One QR per crew or per teen?
4. **Recurring events** — Are weekly club meetups modelled as one row + occurrences, or one row per date?
5. **Capacity & waitlist** — Hard cap with waitlist auto-promote, or soft cap with overbook? Per-tier capacity (VIP/Premium/Standard)?
6. **Sensitive-event flag** — How is "needs parental authorization" determined: age threshold, price ceiling, explicit flag, or category?
7. **Ticket model** — One `booking_tickets` row per teen seat (current write path), one row per booking, or numbered seat assignment?
8. **Schema reconciliation** — Is the rich schema expected by `/agenda/page.tsx` planned in an unapplied migration, or is the live 9-col schema the new truth and the UI needs to be retrofitted?
9. **Partner scanner unification** — Should the partner scanner page handle both VIP loyalty cards AND event tickets, or stay separate?
10. **Post-event recap** — Photo album surface (`event_reviews.photo_urls` exists), and how does it interact with `challenge-proofs` storage bucket?
