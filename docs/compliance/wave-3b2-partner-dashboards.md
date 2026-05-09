# Wave 3B.2 — Type-aware Partner Dashboards (2026-05-09)

> Local/dev only. No production deploy. No new registration pipeline. **No fake data anywhere.**
> Hard rule applied throughout: every dashboard reads canonical data and surfaces an honest "setup pending" state when the backing schema is missing.

## Scope

Honest dashboards for the new archetypes (canon §1, §7.3). Existing
dashboards (food menu/orders, event_organizer events, scanner, mentor
sessions, driver root) were already real-data; we add the new surfaces
without disturbing them.

## Routes added (7)

| Route | Backing data | Honesty posture |
|---|---|---|
| `/partner/talent` | partner row + soft `dj_bookings` placeholder | `dj_bookings` table not present → "Module booking en cours de mise en place"; KPIs render `—` |
| `/partner/talent/bookings` | (no table yet) | EmptyState: "Aucun booking pour l'instant. Aucun paiement n'est facturé tant que tu n'as pas accepté un gig." |
| `/partner/creator` | partner row + real `creator_engagement` count | KPIs: real engagement count, briefs `—`, paiements `—` |
| `/partner/creator/briefs` | `sponsored_posts` table missing | EmptyState: "Module brief en cours de mise en place. Pas de campagne fictive ici." |
| `/driver/rides` | real `ride_bookings WHERE driver_id = …` | Honest list with status badge; empty state if no rides assigned |
| `/driver/earnings` | computed brut from `ride_bookings.actual_dh WHERE status='completed'` | Amber warning: "Net & commission Nivy non encore détaillés. Module paiement chauffeur arrive avec Wave 3B.3." Versement list = empty state. |
| `/mentor/availability` | `mentor_availability` table missing | EmptyState: "Module en cours de mise en place. Wave 3B.3." |

## Sidebar contract update

`PartnerSidebar` extended (canon §6 F4):
- `event_talent` → adds **Talent**, **Bookings**.
- `creator` → adds **Créateur**, **Briefs**.
- driver / mentor never appear in `/partner/*` sidebar (they have their own workspaces under `/driver/*` and `/mentor/*`).
- Pending partner still locked to Dashboard / KYC / Support.

## Tests added (23 specs)

`tests/unit/wave3b2-dashboards.test.tsx`:
- All 7 new page files exist on disk.
- event_talent sees Talent + Bookings (NOT scanner).
- creator sees Créateur + Briefs (NOT scanner).
- event_organizer keeps Évènements; food keeps Menu + Commandes; retail keeps Scanner.
- For every partner_type, the sidebar emits **zero** `/driver/*` or `/mentor/*` hrefs (cross-cutting role-isolation guard).
- Pending partner sees ONLY Dashboard / KYC / Support regardless of type.
- New pages contain **no hardcoded DH amount** (no `'\d+ DH'` literal), no fake "Revenu total: 1234", no fake "Payé: …" strings.
- `/driver/earnings` carries the explicit "non encore détaillés / module paiement chauffeur" warning.
- `/partner/creator/briefs` carries the explicit "module en cours de mise en place" copy.

Total vitest: **44 files / 351 specs / 100% green** (+30 from Wave 3B.2).

## Migrations

None. Wave 3B.2 only adds frontend surfaces over the existing Wave 3A backend.

## P0/P1 closed

- **CANON-PARTNER-012 partial** — 4 archetypes (food, event_organizer, event_talent, creator) now have first-pass dashboards. Driver + mentor workspaces extended. Combined with Wave 3B.1 landings, the missing-archetype list reduces to creator/talent depth (Wave 3B.3 / Wave 4).

## Score before / after

| Bucket | Wave 3B.1 | After Wave 3B.2 |
|---|---|---|
| **PARTNER (partner-ecosystem)** | 78 / 100 | **84 / 100** |
| **Core flow score** | 80 | **80** |
| **Overall product score** | 75 | **77** |

The +6 partner gain reflects: (1) honest event_talent + creator dashboards, (2) driver workspace deepening, (3) mentor workspace extension, (4) every new surface uses honest empty/setup-needed states (no fake data anywhere).

Public launch still BLOCKED — Wave 3B.3 (`/partner/settings` rewrite + KYC signed-link prospect upload + `partner_xp_awards` for coach/teacher) + secret rotation pending.

## Wave 3B.3 starting line

After this commit, Wave 3B.3 can take on:
- `/partner/settings` rewrite (drop the hardcoded "Ma Boutique" mock, wire RHF + zod + server action against `partners` row).
- `/devenir-{archetype}/kyc?token=` signed-link prospect upload (signed-JWT infra so KYC happens before sign-up).
- `partner_xp_awards` route family for coach/teacher.
- Optional: `dj_bookings`, `sponsored_posts`, `mentor_availability` table migrations + dashboard hydration.

## Hard constraints honored

- No fake dashboards.
- No mock totals.
- No fake orders.
- No fake payout success.
- No new registration pipeline.
- No production deploy.
- No social/gamification changes.
- No secret read or printed.

## Secrets

`npm run check:env`: 11/11 PRESENT, every value `[REDACTED]`. Rotation event remains scheduled for end of remediation per `release-blockers.md`.
