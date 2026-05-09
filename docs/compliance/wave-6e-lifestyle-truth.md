# Wave 6E — Lifestyle Truth / Supply Completion (2026-05-09)

> Closes the lifestyle/supply remediation that Wave 6A started.
> Eliminates every remaining caller of the deprecated `public.clubs`
> table and removes every link / sitemap entry / search arm that
> pointed at a detail surface that doesn't exist.
> No new feature, no broad refactor, no fake supply.

## Audit findings

After Wave 6A fixed the visible `/clubs` smoke bug, a fresh grep
surfaced **8 remaining files** still calling `from("clubs")`:

| File | Pattern | Closure |
|---|---|---|
| `app/clubs/[slug]/page.tsx` | `clubs.slug` + `club_enrollments` + `club_sessions` | → permanentRedirect to `/clubs` |
| `app/admin/clubs/page.tsx` | list query | → permanentRedirect to `/admin` |
| `app/admin/clubs/creer/page.tsx` | create form | → permanentRedirect to `/admin` |
| `app/admin/clubs/[id]/supprimer/page.tsx` | delete form | → permanentRedirect to `/admin` |
| `components/layouts/admin-sidebar.tsx` | "Clubs" link | removed |
| `components/search/search-modal.tsx` | search arm + `/clubs/${id}` link | search arm dropped |
| `app/sitemap.ts` | `/clubs/${slug}` URL emitter | dropped (still emits `/clubs` index) |
| `lib/server/data-fetching.ts` | `getClubs` + `getClubBySlug` exports + `clubsCount` in `getAdminStats` | exports removed, count dropped |

After this wave: **`grep "from(\"clubs\")"` across `app/`, `components/`,
`lib/` returns zero matches.**

## Out of scope (declared)

- **Build a real sport_clubs admin surface** — would be a new feature
  (canonical sport_clubs has no slug/description/schedule/price fields,
  no enrollments/sessions tables wired). When/if a founder spec lands,
  re-add the admin sidebar entry and rebuild the CRUD.
- **Build a real `/clubs/[slug]` detail page** — same reason: would be
  a new feature, not a truth fix.
- **Migrate the search modal to sport_clubs** — there's no detail URL
  to link search results to, so the search arm would dead-end. Re-add
  alongside the future detail surface.
- **Marketplace** — Wave 4C closures (status gate, owner PATCH/DELETE,
  contact-info regex, restaurant order ownership defence-in-depth)
  re-verified intact.
- **Agenda + anniversaires** — sampled; both read real `events` /
  `getAnnivPacks` data with no fake supply / availability / capacity.
- **Internships, pathways, driver, mentor lifestyle surfaces** —
  out of /clubs scope; will be revisited in their own wave if score
  needs to move further.

## Tests

`tests/unit/wave6e-lifestyle-truth.test.ts` — **25 green static guards**:

- **8** files (one per legacy site) explicitly verified free of
  `from("clubs")`.
- **2** `/clubs/[slug]` is a small (< 2 KB) `permanentRedirect("/clubs")`
  stub.
- **3** the three `/admin/clubs/*` pages are small redirect stubs to
  `/admin`, plus admin sidebar no longer carries the link.
- **3** sitemap drops `/clubs/${slug}`, no `from("clubs")`, but keeps
  `/clubs` index.
- **2** search modal: no `from("clubs")`, no `/clubs/${id}` href.
- **3** data-fetching: `getClubs`/`getClubBySlug` exports removed,
  `getAdminStats` no longer counts `clubs`.
- **2** marketplace Wave 4C closures intact (GET/PATCH/DELETE +
  PUBLIC_VISIBLE_STATUSES gate).
- **1** `/api/bookings/create` still starts bookings as `pending_payment`
  (no fake confirmation).
- **1** `/clubs/[slug]` calls `permanentRedirect('/clubs')`.

## Final gates

| Gate | Result |
|---|---|
| `check:env` | ✅ 11 / 0 |
| `lint:canon --enforce` | ✅ 6 improvements carried (200 baseline); 0 net-new |
| `typecheck` | ✅ clean |
| `test:run` | ✅ **61 files / 551 tests** |
| `npm run smoke` | ✅ **39/39 ok**, 0 dev-log runtime errors, **0 PGRST** errors |

## Compliance score

- `lifestyle`: **78 → 86 (+8)** — top of the founder's 78 → 85+ band.
- overall: 89 → **90 (+1)** — **founder's "Global ≥ 90" target hit**.
- core_flow_score: 91 → **92 (+1)** — **founder's "Core flow ≥ 92"
  target hit**.

## Status

- Closed-beta ready: **YES**.
- Public launch ready: **NO** — D.1 secret rotation still pending,
  by design.

## Founder targets met

> Objectif avant beta sérieuse :
> - Global ≥ 90 ✅ (90)
> - Core flow ≥ 92 ✅ (92)
> - Aucun domaine sous 85 → **5 of 11 domains still under 85**
> - D.1 secret rotation reste avant toute exposition publique ✅ (still pending)

## Domain scoreboard now

| Domain | Score |
|---|---|
| partner-ecosystem | 89 |
| personalization-ai | 87 |
| **lifestyle** | **86** (Wave 6E) |
| parent-control | 86 |
| auth-onboarding | 85 |
| routing-navigation | 85 |
| gamification | 83 |
| design-system-mobile | 82 |
| economy-payments | 80 ← founder's planned 6F |
| social-feed | 80 ← founder's planned 6G |
| admin-moderation | 80 ← founder's planned 6H |

## Next per founder plan

Three domains still at 80. Next sequence: 6F (economy-payments),
6G (social-feed), 6H (admin-moderation).
