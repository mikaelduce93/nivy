# Teacher / Coach XP Distribution — Vision Audit

Read-only audit of how teachers (`partner_type = 'education'`) and sports coaches (`partner_type = 'club'`) award XP to teens on Nivy. Generated 2026-05-07. Project: `imchornjvmgmaovhypco` (nivy, ACTIVE_HEALTHY).

## 1. Vision (founder, intended)

Teachers (écoles / centres de formation / partenaires éducation) and sports coaches (clubs / partenaires sport) are **certified XP-awarders** on Nivy. The intent is:

- They are first-class partners on the platform (`partners.partner_type ∈ {'education','club'}`).
- They can **manually award XP to a specific teen** for measurable real-world events ("Amine ran 5 km in 25 min → +200 XP", "Yasmine got 18/20 in math → +100 XP").
- Each award carries provenance: who awarded, when, why (description), and ideally evidence (timer, GPS trace, photo of the bulletin, signed PDF).
- Awards are **rate-capped** (e.g. a teacher can only inject X XP per teen per week) so a single coach can't dominate the economy.
- Awards are **transparent to parents** — the `parent` dashboard surfaces every XP grant with attribution, and parents can dispute or veto.
- This is the lever that makes the École and Sport pillars (`user_xp.school_score`, `user_xp.sport_score`) move from real-life signal, not just self-declared quizzes.

## 2. What is actually built

### Code (frontend + API)
- `components/partners/EducationPartnerForm.tsx` — 4-step onboarding wizard for `partner_type='education'` collecting centre info, expertise types, teacher qualifications, course catalogue, prices. **No award-XP-to-teen UI**. The form is pre-sales (course offer marketplace), not operational.
- `components/partners/ClubPartnerForm.tsx` — symmetric form for `partner_type='club'`. Also no XP-awarding UI.
- `app/api/partners/register/route.ts` — POST endpoint dispatching to `handleEducationPartner` / `handleClubPartner`.
- `app/partner/page.tsx`, `app/partner/dashboard/page.tsx`, `app/partner/scanner/page.tsx` — partner dashboard chrome. The dashboard is type-agnostic (same UI for retail/venue/club/education) and shows mock stats only ("Paiements XP: 45 000 XP" is hardcoded). It embeds `<UniversalScanner />` (mock) — a partner can scan a teen's QR card to redeem an offer, but **there is no flow to type "give Amine 200 XP because he ran 5 km"**.
- `app/api/partner/apply-discount/route.ts` — the only partner-side write to XP. It calls `add_user_xp` (or equivalent) after a discount redemption. This is **transactional XP** (loyalty / cashback for spending), not **certified XP** for real-world performance.
- `app/api/teen/education/grades/route.ts` — closest analog. POST lets a **teen self-declare** a grade (`status: pending`); PATCH lets a **parent** approve/reject; on approval the parent awards 10–100 XP via `add_xp_to_user` RPC, scaled by `(grade / max_grade) * 100` percentile. **Teachers are not the actor here** — the grade is teen-typed and parent-validated. `teen_grades.validated_by` is the parent's `user.id`, never a teacher's.
- `app/api/parent/grades/route.ts` — duplicate/overlapping endpoint with similar approve/reject + XP-grant logic (50 base + tiered bonus + improvement delta).
- `gamification-system/database/migrations/022_pillars_system.sql` — defines `user_xp.school_score` and `user_xp.sport_score` (0–100) and `balance_multiplier`. The pillars exist, but the **education/sport partners have no write path into them**.

### Database (live, project `imchornjvmgmaovhypco`)

Three DB searches performed:

1. `SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename ILIKE '%xp%' OR '%award%' OR '%grant%' OR '%coach%' OR '%teacher%' OR '%partner%' OR '%grade%')` → `partner_discounts`, `partners`, `teen_grades`, `user_xp`, `xp_monthly`, `xp_payment_settings`, `xp_shop_items`, `xp_transactions`, `xp_weekly`. **No `coaches`, no `teachers`, no `partner_xp_awards`, no `coach_xp_log`, no `xp_grants`, no `xp_awards`.**
2. `SELECT DISTINCT partner_type FROM partners` → only `'venue'` (1 row total). No live `'education'` or `'club'` partners exist; the registration code paths have never been exercised against real data.
3. `SELECT proname FROM pg_proc WHERE proname ILIKE '%xp%' OR '%award%' OR '%grant%'` → `add_xp_to_user`, `add_vip_xp`, `award_circle_join_xp`, `record_xp_transaction`, `refund_booking_xp`, `trigger_check_achievements_on_xp`, `trigger_update_missions_on_xp`. **No `award_xp_by_partner`, no `coach_grant_xp`, no `teacher_validate_grade`.**

`teen_grades` has a `validated_by uuid` column that *could* point at a teacher, and an `xp_awarded` column to record the bonus. In practice both code paths populate `validated_by` with the parent's auth id.

`xp_transactions.source_type` is free-text varchar with no CHECK; it currently encodes `grade`, `grade_bonus`, `quiz`, `mission`, `booking`, etc. There is no enum value reserved for `coach_award` or `teacher_award`.

## 3. Gaps vs vision

- **No mechanism exists for partners to award XP directly.** The entire premise — a coach typing "Amine ran 5 km → +200 XP" — has zero implementation: no UI, no API route (`/api/partner/award-xp/` does not exist), no DB table, no RPC. The closest substitute is the parent-mediated grades flow, which inverts the intended trust model (parent is the validator, not the teacher).
- **Coaches are not modeled as a separate entity.** They are presumed to be `partners` rows with `partner_type='club'`, i.e. the **club is the partner**, not the individual coach. The DB has no `coaches` table, no `partner_staff` table, no notion of an individual professional within a club. A club registration captures the `contact_person_*` fields, but those are commercial contacts, not authenticated XP-awarders.
- **Same for teachers.** An education partner is a centre/école; individual `teacher` identities are described only as a free-text `teacher_qualifications` paragraph in the registration wizard. No login, no authn, no per-teacher accountability.
- **No verification primitives.** Even if an award API existed, there is no schema for evidence: no GPS trace storage, no photo upload bound to an award, no timer integration, no signed-bulletin attachment. `teen_grades` has no evidence column either; the parent approves on trust.
- **No cap mechanism.** No table tracks per-teen-per-week XP from a given partner. `xp_weekly` and `xp_monthly` are global teen aggregates, not per-source. The `partner_xp_awards` rate-limit table does not exist.
- **No anti-fraud signal.** Nothing prevents a (hypothetical) coach from awarding 100k XP to a friend's teen. There is no review queue, no parent-veto window, no anomaly detection (e.g. award > 3σ of cohort mean), no reputation score on the coach.
- **Pillar feedback loop is broken.** `user_xp.school_score` and `sport_score` exist (migration 022) and would be the natural sink for teacher/coach awards, but the only writers found are `teen_grades` (parent-mediated) and quiz completions. Sport pillar in particular has no certified writer at all.
- **Provenance fields missing in `xp_transactions`.** The table has `source_type` and `source_id` but no `awarded_by` user/partner FK; you can know an XP came "from a grade" but you cannot SQL-query "all XP awarded by partner X this month" without joining through `teen_grades` (which itself doesn't store the partner id).

## 4. Open questions for the founder

- Are coaches **employees of partner clubs** (and so authenticated as sub-users of the `partners` row), or **independent professionals** who onboard themselves on Nivy with a personal certification and can work across multiple clubs?
- How is a teacher/coach **paid by Nivy** if they are driving engagement? Per validated XP award? Per active teen on their roster? Revenue share on parent subscription? Or are they unpaid and the value-add for them is recruiting families to their physical centre?
- Should parents **approve XP awards from coaches** (parent-veto window of N hours), or **trust the coach's certification** (auto-credit, parent only sees the audit trail)? The two models have very different UX and trust assumptions.
- What is the **certification process** that turns a person into a "Nivy-certified XP-awarder"? Document upload (CAPEPS, CAPES, federation licence)? Manual Nivy admin review? KYC + criminal record check (especially for sports coaches working with minors)?
- Should `education` and `club` be **distinct from `retail`/`venue`** at the schema level (e.g. `partner_type` enum + a separate `partner_certifications` table for the XP-awarder permission), or treated uniformly with a `can_award_xp boolean` flag on `partners`?
- What is the **per-week / per-month cap** the founder has in mind (XP / teen / partner)? And what happens when the cap is hit — silent drop, queue for next week, or notify coach?
- Should the **sport pillar** accept GPS / Strava / smartwatch integrations (auto-award by API) in parallel with manual coach awards, or is human certification the only intended writer?

## 5. Recommendations (informational only — no edits made)

- Introduce `partner_xp_awards` table: `id, partner_id, teen_id, amount, category ('school'|'sport'|'crea'), reason, evidence_url, awarded_at, parent_review_status, parent_reviewed_at`.
- Add `partners.can_award_xp boolean DEFAULT false`, flipped on after admin certification.
- Add `partner_staff` table for individual coaches/teachers within a club/centre, each with their own auth user id and per-staff cap.
- Introduce RPC `award_xp_by_partner(p_partner_id, p_staff_id, p_teen_id, p_amount, p_category, p_reason, p_evidence)` that enforces caps, writes `partner_xp_awards`, writes `xp_transactions` with `source_type='partner_award'` and `awarded_by=p_staff_id`, and queues a parent notification.
- Add `xp_transactions.awarded_by uuid` and `awarded_by_partner_id uuid` for direct provenance queries.
- Define a per-teen-per-partner-per-week cap (e.g. 500 XP) and per-staff daily cap; enforce in the RPC.
- Build a parent-side review screen mirroring `app/parent/grades/page.tsx` for partner-issued awards, with a 48 h auto-approve window and a one-click veto.
- Reserve `source_type` enum values `coach_award`, `teacher_award`, `partner_award` and CHECK-constrain the column.

## 6. Source map (paths cited)

- `app/partner/page.tsx`
- `app/partner/dashboard/page.tsx`
- `app/partner/scanner/page.tsx`
- `app/api/partners/register/route.ts`
- `app/api/partner/apply-discount/route.ts`
- `app/api/partner/verify-card/route.ts`
- `app/api/teen/education/grades/route.ts`
- `app/api/parent/grades/route.ts`
- `components/partners/EducationPartnerForm.tsx`
- `components/partners/ClubPartnerForm.tsx`
- `gamification-system/database/migrations/022_pillars_system.sql`
- `docs/vision/partner-network.md` (sibling audit, complementary)

DB searches reported: 3 (tables ILIKE xp/award/grant/coach/teacher/partner/grade; partners.partner_type distinct values; pg_proc functions ILIKE xp/award/grant). Live counts: `partners`=1 (`venue`), `teen_grades`=1, `xp_transactions`>0. Tables searched-for and NOT FOUND: `coaches`, `teachers`, `partner_xp_awards`, `coach_xp_log`, `xp_awards`, `xp_grants`. Function searched-for and NOT FOUND: `award_xp_by_partner`, `coach_grant_xp`, `teacher_validate_grade`.
