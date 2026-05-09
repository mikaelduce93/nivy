# Wave 6A — /clubs PGRST205 fix (clubs → sport_clubs) (2026-05-09)

> Closed-beta hardening. Founder-targeted fix for the only runtime
> error surfaced by the closed-beta smoke. No new feature, no broad
> refactor, no secret rotation.

## Trigger

Closed-beta smoke (commit `85cc012`) returned 39/39 ok but the dev
server log carried:

```
Error fetching clubs: {
  code: 'PGRST205',
  hint: "Perhaps you meant the table 'public.sport_clubs'",
  message: "Could not find the table 'public.clubs' in the schema cache"
}
GET /clubs 200 in 1717ms
```

The page degraded gracefully (rendered an empty list) so smoke counted
it as a 200, but the error in the log is real and the PGRST205 violates
canon §5 ("no DB schema-cache misses on canonical user-facing pages").

## Scope closed

### A. List page query → canonical sport_clubs — ✅
`app/clubs/page.tsx` rewritten:
- `.from("clubs")` → `.from("sport_clubs")`.
- Dropped the `city:cities(name)` join — sport_clubs stores city as a
  plain `VARCHAR(100)` column (no FK to a `cities` table).
- Selected only the columns sport_clubs actually has: `id, name,
  sport_type, city, address, logo_url, is_partner`.
- `is_active = true` filter preserved.
- `order("name")` preserved.

### B. Honest field mapping — ✅
sport_clubs and the legacy `clubs` schema overlap only partially. Wave
6A maps the truthful subset and leaves the rest unset rather than
synthesise placeholders:

| ClubsListClient field | source |
|---|---|
| `id` | `sport_clubs.id` |
| `name` | `sport_clubs.name` |
| `category` | derived from `sport_type`: `"dance"` → `"dance"`, else `"sport"` |
| `image_url` | `sport_clubs.logo_url` |
| `city.name` | `sport_clubs.city` |
| `slug` | **`undefined`** (sport_clubs has no slug column) |
| `description`, `schedule`, `price_per_session`, `age_min`, `age_max` | **omitted** (sport_clubs has none of these) |
| `enrolled_count`, `capacity` | **omitted** (sport_clubs has neither) |

No fake numbers, no placeholder copy, no "Bientôt 100 places" lies.

### C. Guard against silent-404 CTA — ✅
`components/features/clubs/clubs-list-client.tsx`:
- `Club.slug` typed as optional.
- Card "Découvrir" CTA gated on `club.slug` truthy — when absent the
  card renders a plain "Détail bientôt disponible" placeholder instead
  of linking to `/clubs/undefined`.

### D. Out-of-scope (intentional, founder constraint) — declared
- `app/clubs/[slug]/page.tsx` (detail) still queries the legacy `clubs`
  table and depends on `club_enrollments`, `club_sessions`, `capacity`,
  `enrolled_count`, etc. — none of which exist in `sport_clubs`.
  Detail re-wiring would be a structural rebuild, not a bug fix. The
  card-CTA guard above closes the only path users have to reach it
  from the canonical surface, so until detail is properly wired the
  page is unreachable from /clubs.
- Other `from("clubs")` callers (`app/admin/clubs/**`, `app/sitemap.ts`,
  `lib/server/data-fetching.ts`, `components/search/search-modal.tsx`)
  are admin / sitemap / search surfaces, not the closed-beta visible
  bug. Out of Wave 6A scope.

### E. Regression test — ✅
`tests/unit/wave6a-clubs-canonical.test.ts` — **7 green tests**:
- list page queries `sport_clubs`,
- list page never queries the deprecated `clubs` table,
- `is_active = true` filter present,
- `slug: undefined` set explicitly (no fake-slug for non-existent detail),
- no fake `capacity` / `enrolled_count` / `schedule` / `price_per_session` / `age_*` fields surfaced,
- `Club.slug` is optional in the client type,
- card CTA is gated on `club.slug` (no broken-link CTA).

### F. Smoke verification — ✅
- `npm run smoke`: **39/39 ok** (unchanged green from `85cc012`).
- Dev-server log: **`grep -c PGRST205 dev.log` = 0**. The
  `Error fetching clubs:` line that appeared on every `/clubs` hit is
  gone.

### G. Compliance JSON + this doc — ✅
- `compliance-findings.json` v2.5-wave5c → **v2.6-wave6a**. Score
  unchanged (lifestyle 78 already accounts for this surface in
  aggregate); the closure removes a real runtime PGRST205 from the
  dev log without claiming a domain-score lift, which would be misleading.

## Final gates

| Gate | Result |
|---|---|
| `check:env` | ✅ 11 present / 0 missing |
| `lint:canon --enforce` | ✅ 1 improvement carried; 206 baseline; 0 net-new |
| `typecheck` | ✅ clean |
| `test:run` | ✅ **57 files / 478 tests passed** |
| `npm run smoke` | ✅ **39/39 ok**, **0 PGRST205** in dev log |

## Next

Per founder plan — Wave 6B: Auth-onboarding truth (75 → 85).
