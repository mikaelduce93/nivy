# Search & Discovery — Vision

## 1. Problem

Nivy is a multi-surface platform: events (parties, sports, culture), partner offers (VIP card discounts), clubs (sport, art, music, tech), quizzes (subject/grade), academic help (subjects/tutors), birthday venues, friends, and crews. Teens and parents must locate the *right* item across a growing catalog spanning multiple Moroccan cities (Casablanca first, then Rabat/Marrakech). Without robust discovery, the catalog becomes an inert list and engagement collapses to "what's on the home dashboard." The discovery problem is heterogeneous — events filter on city/date/age/price, offers on partner/discount/proximity, friends on username/code/QR, quizzes on subject/grade, tutors on subject/availability — but a unified mental model ("I want X near me, soon, that I can afford") must thread through all of them.

## 2. Current State

**Global search**: a `SearchModal` (`components/search/search-modal.tsx`) exists, mounted via `components/navbar.tsx`. It performs two parallel `ilike` queries against `events.title` and `clubs.name` (debounced 300 ms, limit 5 each), with keyboard navigation and "quick links" placeholders. It searches **only** events + clubs — no offers, partners, quizzes, friends, or birthday venues. It uses `ILIKE '%q%'` (no FTS, no fuzzy match, no ranking, no unaccent).

**Per-surface filters**:
- **Events** (`components/agenda/events-client.tsx`): rich client-side filter set — search query, city dropdown, type, age, theme, AEFE-discount toggle, price range, sort by date/price/popularity/spots-left, grid/list view, paginated 9 or 6 per page. All filtering is in-memory after a `select("*")` server fetch in `app/agenda/page.tsx` — fine for now, will not scale.
- **Teen events** (`app/teen/events/events-client.tsx`): a much thinner filter (all/confirmed/pending/featured) — RSVP-state, not discovery.
- **Clubs** (`components/features/clubs/clubs-list-client.tsx`): search input + category icons (sport/art/tech/music/dance/theatre); city is rendered but not filtered ("Casablanca" is hardcoded as fallback).
- **Wallet/Offers** (`app/teen/wallet/wallet-hub-client.tsx`): tabbed hub (coins/shop/badges/vip) — *no* filter, *no* search over offers. Shop rewards are listed via `walletData.rewards` with category metadata but no search input.
- **Friends** (`app/teen/friends/page.tsx`): tabbed (all/online/requests) + name `ilike` filter on the already-loaded friends list. There is **no** discovery for *new* friends — `SUGGESTIONS` and `PENDING_REQUESTS` are hardcoded `[]` with a `TODO(data)` comment.
- **Crews/Circles** (`app/teen/circles/circles-client.tsx`): search by crew name across `discoverCrews`.
- **Quiz** (`app/teen/quiz/quiz-hub-client.tsx`): subject selector, no free-text search.
- **Aide scolaire** (`app/teen/aide-scolaire/aide-scolaire-client.tsx`): subject grid, no search; **no tutor directory exists** despite the vision.
- **Birthdays** (`app/anniversaires/page.tsx`): wizard (date → pack → extras), not a venue search — venue catalog is implicit in packs.

**Friend discovery primitives**: QR-code/invitation flows exist for parent→teen onboarding (`components/teen/teen-id-card.tsx`, `app/parent/teens/add/page.tsx`) and ambassador codes, but **no teen↔teen "add by username/code/QR" flow** is wired in `app/teen/friends/page.tsx`.

## 3. DB / Backend Findings

Live MCP queries against project `imchornjvmgmaovhypco`:

- `pg_indexes` for `tsvector`/`gin`/`%fts%`/`%search%` returned **zero application FTS indexes** — only an unrelated `idx_curated_content_tags` GIN-on-tags and Postgres internals. No `tsvector` columns exist anywhere in `public`.
- `pg_extension` query for `pg_trgm`, `postgis`, `unaccent`, `vector` returned **empty** — none of these are installed. No fuzzy-match, no geo, no embedding-based search infra at the DB layer.
- Geographic columns: `latitude`/`longitude` exist on `event_check_ins`, `geolocation_zones`, `special_challenge_submissions` (operational telemetry). City strings exist on `sport_clubs.city`, `payment_requests.pos_location`, leaderboard views. **`events` table has no `city`/lat/lng** — the `EventsClient` reads `event.city` but the schema sample returned only `id, slug, title, description, event_date, venue_id, status, created_at, updated_at` — `city` lives on `venues` (or is a denormalized column not in the slim schema dump). `shop_rewards` has no city/geo column at all — offers are platform-wide, not store-localized.

Net: discovery today = `ILIKE` over a few columns + client-side filtering of fully-loaded lists. No FTS, no trigram, no geo, no recommendation engine.

## 4. Vision (where we want to go)

- **Unified search bar** (CMD-K) reachable from any page: events, offers, partners, clubs, quizzes, tutors, friends, birthday venues — typed-result categories with badges. Replace `ILIKE` with Postgres FTS (`tsvector` + `websearch_to_tsquery`) and `pg_trgm` for typo tolerance and partial-name match (`unaccent` for "café" ↔ "cafe").
- **Geographic discovery**: every venue/partner/club/event gets `city` + optional `lat/lng`; teens get a "near me" toggle (10 km radius via PostGIS or `earthdistance`), with city fallback when permission denied.
- **Per-surface filters** standardized (city, date range, price, age, category, accessibility), URL-synced (`?city=casa&theme=tech&priceMax=200`) so links are shareable and pagination is server-side.
- **Friend discovery**: username search (`profiles.username` + trigram), 6-digit invite code, QR scan, "people you may know" (mutual-friends count, same school, same crew).
- **Recommendations**: rule-based v1 ("events in your city, your age, this week, themes you've RSVP'd before"), graduating to embeddings or collaborative filtering at scale. Seed exists in `app/api/teen/content/intelligent/route.ts` and `recommendations/route.ts`.
- **Saved searches & alerts**: "notify me when TechStore posts an offer" / "events in Rabat under 100 DH next month."
- **Empty states with intent**: not "no results" but "no events in Rabat this week — see Casablanca? get notified?" — drive cross-city / cross-time / waitlist paths.

## 5. Open Questions

- **Search engine choice**: Postgres FTS + `pg_trgm` (cheap, in-DB, good enough for ~50k events) vs. Meilisearch (great UX, separate infra) vs. Algolia (fastest, $$$). Recommendation: Postgres FTS for v1, evaluate Meili at 10k MAU.
- **Geographic radius search**: needed at launch, or city-string is enough for Phase 1 Casablanca-only? PostGIS install adds DB complexity.
- **Saved searches / alerts**: notify channels (push, email)? Throttling? Tied to `notification_triggers` table?
- **Recommendations**: rule-based for v1 (RSVP history × city × age) vs. embedding-based (would need pgvector and an offline pipeline)?
- **Friend discovery privacy**: username search public to all teens, or only to mutuals/same-school? COPPA/parental-control implications.
- **Tutor directory**: build a real `tutors` table + filtering (subject, grade, availability, price, language) or stay AI-only?
- **Offer search by proximity**: do partner stores get geo-coords, or just city? VIP card scan flow today is partner-side, not teen-side discovery.

## 6. Recommended Next Steps

1. Add `tsvector` columns + `gin` indexes on `events(title, description)`, `shop_rewards(name, description)`, `clubs(name, description)`, `profiles(username, full_name)`. Triggers to keep them updated.
2. Install `pg_trgm` + `unaccent` extensions; add similarity indexes on `profiles.username` and `events.title`.
3. Replace `SearchModal` `ILIKE` with a single RPC `global_search(q text, types text[])` returning ranked unified results (event/club/offer/profile rows).
4. Standardize URL-synced filters (Nuqs or `useSearchParams`) on agenda + clubs + offers; move filtering server-side with `range()` pagination.
5. Wire teen friend-discovery: username search endpoint, invite-code redemption, QR-scan reuse of existing `qr-scanner.tsx`.
6. Stub `recommendations` table + nightly job (rule-based v1) feeding `/api/teen/recommendations` with proper logic instead of placeholder.
7. Decide PostGIS vs. flat city-string before partner network expands beyond Casablanca.

## Sources

- `components/search/search-modal.tsx` — global search modal (events + clubs only, ILIKE).
- `components/agenda/events-client.tsx` — richest filter surface (city/type/age/theme/AEFE/price/sort/view).
- `app/teen/wallet/wallet-hub-client.tsx` — wallet/offers hub, no offer-search wired.
- `app/teen/friends/page.tsx` — friends filtering by name only; suggestions/requests stubbed `[]`.
- `app/teen/circles/circles-client.tsx` — crew discovery with name search.
- `components/features/clubs/clubs-list-client.tsx` — clubs by category + name search; city not filtered.
- `app/teen/quiz/quiz-hub-client.tsx` — quiz subject grid.
- `app/teen/aide-scolaire/aide-scolaire-client.tsx` — academic help (no tutor directory).
- `app/anniversaires/page.tsx` — birthday wizard (no venue search).
- `app/agenda/page.tsx` — server-side fetch of all upcoming events.
- `app/api/teen/recommendations/route.ts`, `app/api/teen/content/intelligent/route.ts` — recommendation seeds.
- DB live: `pg_indexes` (no FTS), `information_schema.columns` (geo only on telemetry tables), `pg_extension` (no `pg_trgm`/`postgis`/`unaccent`/`vector`).
