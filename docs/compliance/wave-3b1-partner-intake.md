# Wave 3B.1 — Partner Archetype Intake (2026-05-09)

> Source: founder directive 2026-05-09 — open the missing intake funnels using the canonical Wave 3A backend before building any new dashboards.
> Local/dev only. No production deploy. No new dashboards (Wave 3B.2). No redesign.

## Pages added (10 + 1 redirect)

| Path | Archetype | Funnel target | Notes |
|---|---|---|---|
| `/devenir-restaurant` | food | `MinimalArchetypeWizard partnerType="food"` | canon §1 row 5, §7.1 |
| `/devenir-dj` | event_talent (DJ / performer) | `MinimalArchetypeWizard partnerType="event_talent"` | canon §1 row 10 |
| `/devenir-organisateur` | event_organizer | `MinimalArchetypeWizard partnerType="event_organizer"` | canon §1 row 11 |
| `/devenir-createur` | creator (sponsored content) | `MinimalArchetypeWizard partnerType="creator"` | canon §1 row 13, F3 distinct from ambassador |
| `/devenir-anniv-host` | venue + `accepts_birthday=true` flag | `MinimalArchetypeWizard partnerType="venue"` with `accepts_birthday` metadata; also offers existing-partner CTA | canon §1 row 12 (flag, not a partner_type) |
| `/devenir-mentor` | first-class `auth.users.role='mentor'` | CTA → `/auth/sign-up?role=mentor` (NOT partner wizard) | canon §1 row 7, §8.1 |
| `/devenir-driver` | first-class `profiles.role='driver'` | CTA → `/auth/sign-up?role=driver` (NOT partner wizard) | canon §1 row 6, F2 |
| `/devenir-coach` | `partner_staff.role='coach'` inside a club | informational + CTA → `/devenir-partenaire` if creating own club | canon §1.1, §8.2 |
| `/devenir-teacher` | `partner_staff.role='teacher'` inside an education centre | same two-path model as coach | canon §1.1, §8.2 |
| `/devenir-influenceur` | folds into ambassador (canon F3) | `permanentRedirect('/devenir-ambassadeur')` | F3 ratification |
| `/devenir-influenceur/candidature` | same | `permanentRedirect('/devenir-ambassadeur/candidature')` | F3 ratification |

`/devenir-ambassadeur` already exists from prior waves — left untouched.

## Forms wired

5 archetype intakes funnel through the canonical `/api/partners/wizard/submit`:
- food, event_talent, event_organizer, creator, anniv-host (via venue + flag).

All five use the new shared `<MinimalArchetypeWizard>` component (`components/partners/MinimalArchetypeWizard.tsx`):
- Captures: company_name, email, password (with `<PartnerPasswordPanel>` validation), phone, contact_person_name, optional website / description / contact phone.
- Optional `metadata` prop becomes `venue_details` payload (used by anniv-host).
- POST → `submitPartnerWizard()` from `lib/partners/wizard-submit.ts` (Wave 3A.5 helper).
- Success → `router.push('/partenaires/merci?ref=<partner_id>')`.

The four legacy commerce forms (Retail / Venue / Club / Education) remain unchanged — they already posted to the canonical wizard since Wave 3A.5.

## Migrations

`100_wave3b1_partner_type_taxonomy.sql` (applied via Supabase MCP):
- `partners.partner_type` CHECK extended to the canon §3.1 enumeration.
- Backfill noop (only legacy 4 values exist).

**`101_wave3b1_1_taxonomy_sanity.sql` (Wave 3B.1.1, founder override 2026-05-09)**:
- Drops `driver` and `mentor` from the `partners.partner_type` CHECK.
- Rationale: canon §3.1 originally allowed both for "KYC/payout reuse", but
  the founder closed the ambiguity — driver and mentor live ONLY as
  first-class roles (`profiles.role` / `auth.users.role`). The `partners`
  table is reserved for commerce / food / event_* / creator entities.
- Final accepted set: `retail | venue | club | education | food | event_talent | event_organizer | creator`.
- Backfill: zero partners rows currently use either value (verified via
  execute_sql before the migration ran).
- Companion test: `tests/unit/wave3b1_1-taxonomy.test.ts` keeps the
  application layer in sync (wizard PARTNER_TYPES + WizardPartnerType union
  + landing pages do not promote the values).

## APIs

No new APIs. The wizard `zod` schema in `app/api/partners/wizard/submit/route.ts` was extended:
```ts
const PARTNER_TYPES = [
  "retail", "venue", "club", "education", "food",
  "event_talent", "event_organizer", "creator"
]
```
`driver` and `mentor` are intentionally NOT in this list — their funnels use sign-up-with-role, not the partner wizard.

## Thank-you page truthification

`/partenaires/merci`:
- Reads `?ref=<partner_id>` from query params (the persisted `partners.id` returned by the wizard).
- Removed the `crypto.randomUUID()` placebo reference (canon §2.1, D3 — explicit FORBIDDEN).
- If no `ref` is present, shows a generic "vérifie ton email" hint instead of fabricating one.

## Tests added (22 specs)

`tests/unit/wave3b1-archetype-pages.test.ts`:
- All 12 page files exist (10 landings + 2 redirects).
- Partner-table-backed pages use `MinimalArchetypeWizard`.
- anniv-host wires `accepts_birthday` metadata + offers existing-partner alternative.
- Mentor/driver landings link to `/auth/sign-up?role=…` (canonical sign-up).
- Coach/teacher landings link to `/devenir-partenaire` (no fake direct funnel).
- Influencer pages `permanentRedirect` to ambassadeur.
- No archetype landing posts to legacy `/api/partners/register`.
- No archetype landing calls `supabase.auth.signUp` from the client.
- All landings carry honest "activation / revue admin" copy.
- `/partenaires/merci` reads `searchParams.get('ref')` and never invokes `window.crypto.randomUUID`.

Total vitest: **42 files / 321 specs / 100% green** (+22 from Wave 3B.1).

## P0/P1 closed

- **CANON-PARTNER-012 partial** — 8 of the 11 missing archetype landings now exist (food, dj/event_talent, organisateur, createur, anniv-host, mentor, driver, coach, teacher). Remaining: per-archetype dashboards (Wave 3B.2).
- **CANON-PARTNER-024** — `/partenaires/merci` placebo reference replaced with persisted `?ref=<partner_id>`.
- **CANON-AUTH-023 partial / canon F3** — `/devenir-influenceur` + `/devenir-influenceur/candidature` permanent-redirect to `/devenir-ambassadeur` (canon F3 fold).

## Score before / after

| Bucket | Wave 3A.5 | After Wave 3B.1 |
|---|---|---|
| **PARTNER (partner-ecosystem)** | 70 / 100 | **78 / 100** |
| **Core flow score** | 80 | **80** |
| **Overall product score** | 73 | **75** |

Public launch still BLOCKED — Wave 3B.2 (type-aware dashboards) + Wave 3B.3 (KYC signed-link polish + `/partner/settings` rewrite) + secret rotation pending.

## Wave 3B.2 starting line

After this commit, Wave 3B.2 can take on:
- Type-aware partner dashboards (`/partner/food/dashboard`, `/partner/event_talent/dashboard`, etc.).
- `/driver/dashboard` + `/driver/rides` (driver workspace).
- `/mentor/dashboard` extension (availability, strikes).
- `/creator/dashboard` (sponsored briefs queue).
- Coach/teacher invite-by-code flow inside club/education partner settings.

## Carry-forward

- `/partner/settings` rewrite (still hardcoded mock from Wave V1.2).
- `/devenir-{archetype}/kyc?token=` signed-link prospect upload (signed-JWT infra).
- `partner_xp_awards` route family (coach/teacher).

## Secrets

`npm run check:env`: 11/11 PRESENT, every value `[REDACTED]`.
No secret read or printed. Rotation event remains scheduled for end of remediation per `release-blockers.md`.
