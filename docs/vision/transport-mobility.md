# Transport & Mobility — Vision

> Audit date: 2026-05-07 — auditor: transport-mobility-auditor (read-only). Scope: pre-event ride booking, parent-trusted live geo-tracking, group rides, designated Nivy driver pool, post-event auto-dispatch return, multi-modal (taxi / Careem / Heetch / tramway / bus) integration, coin/DH payment rails. Active Supabase project: `imchornjvmgmaovhypco`. Codebase root: `C:\Users\Shadow\Desktop\NIVY`.

## 1. Vision intended

Nivy targets teens aged 13–17 attending ticketed events — concerts, anniversaires, sport tournaments, partner-venue activities — all of which start and end at known locations and known times. The single largest unmet need from the parent persona is **trusted transport**: a teen with permission to attend an event in another district (or another city) still represents a journey their parent does not control, on roads at hours the parent often does not see. The intended platform behaviour is to make the journey itself a first-class object that the parent can approve, watch, and, in the worst case, intercept.

The product should accept a transport need either implicitly (the teen has a confirmed event reservation that requires moving to/from a venue) or explicitly (the teen requests a one-off ride for a non-Nivy purpose, which surfaces the standard parental-approval flow). Pre-event booking should occur up to N hours ahead, with optional automatic return dispatch when the event ends — a "round trip" is the canonical product, not a one-way ride. The supply side should be a hybrid of (a) curated **Nivy partner drivers** with KYC, vehicle registration, photo, plate, and rating; (b) aggregator integrations such as **Careem** and **Heetch** in cities where they operate (Casablanca, Rabat, Marrakech) for surge capacity; and (c) public-transport metadata for the Casablanca and Rabat tramways plus intercity rail (ONCF) where the journey is straightforward and the parent opts in. Group rides — a crew of three to four teens going to the same event — should split the fare across each parent's wallet and award shared XP for arriving together (a rare social signal worth gamifying).

Live geo-tracking is non-negotiable and is the single feature that justifies the product over a parent simply opening a third-party ride app: the parent receives the driver's name, plate, photo, ETA, and a moving location dot, with push notifications at dispatch / pickup / dropoff / late-by-N-min. Coins and DH should both be acceptable payment, with a "split with parent" option that debits the teen's coins and the parent's DH wallet pro-rata. Cancellation, refund, curfew, and geo-fence deviation are all parent-policy primitives, not driver-side details.

## 2. Today (live state)

The live state is **0% built**. Concretely, in the Supabase project `imchornjvmgmaovhypco`, the query `SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename ILIKE '%transport%' OR tablename ILIKE '%ride%' OR tablename ILIKE '%trip%' OR tablename ILIKE '%mobility%' OR tablename ILIKE '%driver%' OR tablename ILIKE '%pickup%')` returns the empty set. There is no `ride_bookings`, no `ride_tracks`, no `nivy_drivers`, no `ride_groups`, no provider-credential storage, no fare cache, no geo-fence, no curfew rule.

In the codebase, a Grep across `transport|careem|heetch|uber|taxi|tramway|mobility|pickup|dropoff` returns 26 hits, **none of which are transport features** — every match is either the French word "transport" used in research documents, the variable `taxId` in partner-registration forms (`components/partners/{Venue,Retail,Education,Club}PartnerForm.tsx`), or the unrelated `tracking` strings in safety/analytics docs. A second pass on `\bride\b` across the tree returns **zero files**. The `app/teen/agenda/` path the brief points to does not exist; the agenda surface lives at `app/agenda/page.tsx`, `app/agenda/[id]/page.tsx` plus a loading and an error boundary, and none of them surface a transport CTA. The shop checkout at `app/teen/shop/checkout/{page,checkout-client,error}.tsx` is for catalog items, not rides. There is no `/teen/rides`, no `/parent/rides`, no `/admin/drivers`.

The only adjacent foundations that do exist are: `events.address text` and `events.city text` columns (no lat/lng), the `parental_approvals` table, and the `parent_teen_links` table — these three together are exactly enough to anchor a future ride-approval flow but not to dispatch one. There is no MapLibre/Mapbox/Google Maps client wired into the app, no realtime channel for driver positions, no Careem or Heetch credential, no driver KYC document storage bucket. Effectively, transport is a green-field surface inside a product whose surrounding primitives (events, parents, approvals, coins) are mature enough to plug into.

## 3. Gap

The gap is a full vertical slice. Five tables (rides, tracks, drivers, groups, group members), one provider-adapter abstraction with at least a Nivy-partner concrete implementation and stubbed Careem/Heetch adapters, one realtime channel for the parent-facing tracker, geo columns on `events` (lat/lng), a fare-estimation function, a cancellation/refund engine, a geo-fence/curfew rule engine, four UI surfaces (teen rides, parent rides, agenda CTA, admin drivers), and at least four push-notification templates (requested / confirmed / started / ended). The hardest non-obvious gaps are (a) **liability and insurance** (currently undefined — a Nivy-branded ride must legally rest on someone), (b) **driver KYC document handling** (PII at the level of national ID + driver licence + vehicle registration), and (c) **realtime location ingestion at scale** (driver phones must push positions every ~5 s without draining battery or running up Postgres write costs — Supabase Realtime + a small ingestion buffer is the cheap path).

## 4. Risks

Safety: the absence of geo-fence deviation alerts means a kidnapping or rerouting scenario has no automated trip-wire — this is the single risk that, if realised, ends the product. Trust: a single bad-actor driver in the Nivy-partner pool is reputationally fatal; KYC must be human-reviewed and re-verified on a cadence. Legal: in Morocco, ride-hailing regulations evolve; partnering with a licensed taxi cooperative may be the only compliant path in some cities. Privacy: storing minute-by-minute teen location is GDPR/CNDP-sensitive — retention must be short and parent-only. Economic: aggregator (Careem/Heetch) margins are thin; a pure aggregator model leaves Nivy with no defensible margin, while a pure own-fleet model is capital-intensive. Operational: late-night demand (post-event 22h–01h) has the lowest driver supply and the highest parent anxiety — exactly the inverse of what the unit economics want. Curfew bypass: parents will demand override capability; a poorly designed override is a child-safety liability.

## 5. North star (12-month)

A teen books a return trip to a Casablanca concert from the agenda detail page in two taps. The parent receives a push, taps approve, and watches the journey on a live map with driver photo and plate. Three friends share the ride; the 60 DH fare is split 20/20/20 across three parent wallets; all three parents see the same map. At the venue, a geo-fence confirms drop-off; at the event end-time, a return ride is auto-offered. Across 5,000 active teens, ride NPS is ≥ 60, on-time pickup ≥ 92%, zero unresolved safety incidents, driver pool ≥ 200 KYC-verified across Casa/Rabat/Marrakech, Careem fallback handles ≤ 20% of trips for surge, tramway info shown for short urban hops as a free option that still earns "green commute" XP.

## 6. Roadmap

**M0 (weeks 1–2):** schema for `ride_bookings`, `ride_tracks`, `nivy_drivers`, `ride_groups`, `ride_group_members`; add `events.lat`, `events.lng`; storage bucket `driver-kyc` (private). **M1 (weeks 3–5):** `POST /api/teen/rides/request` wired through `parental_approvals`; admin driver CRUD + KYC review queue at `/admin/drivers`. **M2 (weeks 6–8):** realtime tracking via Supabase Realtime channel `ride:{id}`; parent live-map at `/parent/rides/[id]`; push notifications. **M3 (weeks 9–11):** group rides + fare-split engine; coin/DH/split payment in `wallet_transactions`. **M4 (weeks 12–14):** Careem adapter (sandbox), Heetch adapter (sandbox), provider-pick policy. **M5 (weeks 15–18):** auto-dispatch return ride at event end, geo-fence + curfew rules, deviation alerts. **M6 (weeks 19–24):** tramway / ONCF metadata layer, "green commute" XP, scaling to Rabat + Marrakech.

## SPEC — what to build

### Data contract
```sql
public.ride_bookings (
  id UUID PK, teen_id UUID, parent_id UUID, event_id UUID,
  pickup_address TEXT, dropoff_address TEXT,
  pickup_lat NUMERIC, pickup_lng NUMERIC, dropoff_lat NUMERIC, dropoff_lng NUMERIC,
  scheduled_for TIMESTAMPTZ, return_scheduled_for TIMESTAMPTZ,
  group_size INTEGER DEFAULT 1, group_leader_id UUID,
  provider TEXT CHECK (provider IN ('careem','heetch','nivy_partner','public_transport')),
  external_booking_ref TEXT,
  estimated_dh NUMERIC, actual_dh NUMERIC,
  payment_method TEXT CHECK (payment_method IN ('coins','dh','split_with_parent')),
  status TEXT CHECK (status IN ('requested','confirmed','dispatched','in_progress','completed','cancelled')),
  parent_approval_id UUID REFERENCES parental_approvals(id),
  driver_user_id UUID,
  created_at TIMESTAMPTZ
);

public.nivy_drivers (
  id UUID PK, user_id UUID UNIQUE, name TEXT, phone TEXT,
  vehicle_make TEXT, vehicle_plate TEXT,
  kyc_status TEXT, kyc_documents_url TEXT,
  is_active BOOLEAN, rating NUMERIC,
  service_cities TEXT[],
  created_at TIMESTAMPTZ
);

public.ride_tracks (
  ride_id UUID, lat NUMERIC, lng NUMERIC, captured_at TIMESTAMPTZ
); -- live tracking; parent sees this

public.ride_groups (
  id UUID PK, leader_id UUID, event_id UUID, max_seats INTEGER, seats_taken INTEGER
);
public.ride_group_members (group_id, teen_id, accepted_at);
```

### API
- `POST /api/teen/rides/request` — auto-routes through `parental_approvals` if needed
- `GET  /api/parent/rides/active` — live tracking list
- `POST /api/parent/rides/:id/approve`
- `POST /api/teen/rides/:id/cancel`
- WebSocket `/api/realtime/ride/:id` — push driver location to parent

### UI
- `/teen/agenda/event/:id` — "Réserver le transport" button
- `/teen/rides` — my upcoming rides + group invites
- `/parent/rides` — live map + history
- `/admin/drivers` — KYC queue + active drivers map

### Invariants
- Every ride for a teen requires `parental_approvals != null` OR ride within whitelisted recurrence (e.g. school commute pre-approved)
- Driver KYC mandatory for `nivy_partner` provider
- Ride cancellation > 1h before pickup = full refund; < 1h = partner-set fee
- Parent receives push when ride starts and ends (always, even autonomous mode)
- Group ride: all linked parents notified

### Acceptance criteria
- [ ] Teen books ride to event in Casablanca
- [ ] Parent gets approval push, taps "approuver", ride confirmed
- [ ] Parent sees driver name/plate + live ETA + live position during trip
- [ ] Coins debited at trip start, refund issued if cancelled by driver
- [ ] Group of 3 teens split a 60 DH ride = 20 DH each, all parents see status

### Open questions
- Provider stack: integrate Careem API + own driver pool, or pure aggregator?
- Driver pool: employed by Nivy or independent contractors?
- Geo-fencing: alert if ride deviates from expected route?
- Curfew: hard cutoff time for teen rides (22h?), bypassable by parent override?
- Multi-modal: tramway/bus integration in V1 or V2?
- Insurance: who carries liability? Driver / Nivy / parent?
