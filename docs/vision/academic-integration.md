# Academic Integration — Vision Audit

Read-only audit of the Aide Scolaire / academic pillar — grades, quizzes, tutorials, curriculum adaptation, and the (unbuilt) tutoring booking layer. Generated 2026-05-07. Project: `imchornjvmgmaovhypco` (nivy, ACTIVE_HEALTHY).

## 1. Vision (founder, intended)

Aide Scolaire is a core teen pillar — the reason a parent installs Nivy for a kid in collège or lycée. The intended product surface:

- **Tutoring sessions**: education partners (teachers, code academies, Acadomia-style centres) publish bookable slots that look like events but carry curriculum metadata (matter + level + duration + price in MAD/XP). Booking flow reuses event infrastructure.
- **Teacher-submitted grades**: a teacher who tutored Amine can push the grade he got at school into `teen_grades` directly, triggering an XP bonus on the École pillar (`user_xp.school_score`). Parent still sees the entry but doesn't have to type it.
- **Curriculum-aligned content**: quizzes, tutorials and challenges adapt to `school_type` (french / american / british / IB / Moroccan public) and `grade_level` (6ème → terminale or G6 → G12). A British teen on the IGCSE Cambridge curriculum sees Cambridge-aligned mock exams in English; a Moroccan public school teen on Programme Marocain sees Arabic-labelled BAC revision.
- **Academic challenges**: math contests, dictée nationale, language olympics — partner-organised, tracked in the same engine as physical / passion challenges.
- **Possibly an AI homework helper** that uses the teen's `grade_level` + recent `teen_grades` to give appropriately scoped help (no university physics for a 4ème).

The pillar exists to convert real-school performance into XP and to give parents a "Nivy is helping my kid in school" narrative they will pay for.

## 2. What is actually built

### Code (frontend + API)
- `app/teen/aide-scolaire/page.tsx` — server component, post-W2 fix, fetches `teen_grades` directly via Supabase server client, computes per-subject averages on-the-fly, hydrates a client component with real grade data + computed XP. Subject metadata (color/icon) is hardcoded in `SUBJECT_META` covering 13 matters including `arabic`, `islamic`, `philosophy`, `svt` (Moroccan/French curriculum-flavoured).
- `app/teen/aide-scolaire/aide-scolaire-client.tsx` — pure presentational client. Renders subject cards with averages, XP totals, grade counts. The "Recommandé" and "Activité Récente" sections are hardcoded coming-soon `EmptyState`s — **no recommendation rendering**, although a recommendations API exists.
- `app/teen/academic/page.tsx` — 8-line redirect to `/teen/aide-scolaire` (verified duplicate at SHA 6e3e7f2 was deleted). The legacy `app/teen/academic/academic-client.tsx` (689 lines) is still on disk but unreachable: it has its own `Add grade` dialog calling `submitGrade` from `gamification-system/features/pillars/actions.ts`, hardcoded `sampleQuizQuestions` for math (3 questions about discriminants), and a legacy purple Tailwind palette.
- `app/api/teen/education/grades/route.ts` — full CRUD: GET list+stats, POST teen-self-declares (`status: 'pending'`), PATCH parent approves/rejects with tiered XP grant (10–100 XP scaled by `gradePercent` band) calling `add_xp_to_user` RPC. Hardcoded `SUBJECTS` list of 13 matters with French + Arabic labels.
- `app/api/teen/education/quizzes/route.ts` — GET active quizzes filtered by `subject` / `difficulty` / `grade_level`, joined with `quiz_attempts` for completion status. POST submits an attempt, computes score, awards XP via `add_xp_to_user` with high-score multiplier (×1.25 / ×1.5).
- `app/api/teen/education/tutorials/route.ts` — GET `educational_tutorials` or `passion_tutorials` with progress join. POST upserts `educational_tutorial_progress` and awards XP on first completion.
- `app/api/teen/education/recommendations/route.ts` — heuristic engine: weak-subject detection (`avg < 60%` over 90d), pulls 2 quizzes + 2 tutorials per weak subject excluding already-passed ones, daily check-in nudge, low-sport-score physical challenge fallback. Reads `get_pillar_scores` RPC. Not wired into any UI.
- `app/api/parent/grades/route.ts` — parallel parent-side endpoint (overlapping logic, needs orchestrator dedup).
- `app/parent/grades/page.tsx` — client component listing pending grades with approve/reject + comment dialog.
- `app/api/teen/content/international/route.ts` — calls `InternationalSchoolEngine` (`lib/ai/international-school-engine`) to fetch a teen's `school_type`-adapted profile and recommendations. AI engine is the only consumer of `school_type`.
- `gamification-system/features/pillars/actions.ts` — `submitGrade` server action (90+) used by the legacy academic-client; inserts directly to `teen_grades` with `status: 'pending'`. Contains a syntax-broken comment `\ Check permissions...` that suggests cargo-culted code.
- `gamification-system/database/migrations/022_pillars_system.sql` — defines `teen_grades`, `educational_quizzes`, `quiz_attempts`, `educational_tutorials`, `educational_tutorial_progress`, the `school_score` column on `user_xp`, the pillar-score RPC `update_pillar_score`, and triggers on grade approval / quiz completion that recompute `school_score`.
- `gamification-system/database/migrations/036_international_schools_support.sql` — adds `school_type`, `curriculum`, `primary_language` columns to `teens`; creates `content_curriculum_mapping` and `curriculum_subjects`.

### Database (live, project `imchornjvmgmaovhypco`)
Three searches performed:
1. `SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename ILIKE '%school%' OR '%grade%' OR '%academic%' OR '%tutor%' OR '%curricul%' OR '%subject%' OR '%educ%')` → `content_curriculum_mapping`, `curriculum_subjects`, `educational_quizzes`, `educational_tutorial_progress`, `educational_tutorials`, `passion_tutorial_progress`, `passion_tutorials`, `teen_grades`. **No `schools`, no `tutors`, no `tutoring_sessions`, no `academic_challenges`, no `school_partners` table.**
2. Row counts: `teen_grades` = **0**, `educational_quizzes` = 9, `educational_tutorials` = 0, `curriculum_subjects` = 39, `content_curriculum_mapping` = 0. The grades table is empty in production. The tutorials catalogue is empty. Only quiz seed data (mig 038) exists.
3. `SELECT DISTINCT school_type, curriculum FROM curriculum_subjects` → 3 curricula seeded: `french / Programme Français`, `american / American Curriculum`, `british / British Curriculum`. **No Moroccan public, no IB, no Cambridge IGCSE rows yet.** The 9 seeded quizzes are tagged `grade_level` ∈ {`6eme`, `5eme`} — French-curriculum naming only.

### Schemas
- `teen_grades` columns: `id, teen_id, subject, subject_label, grade, max_grade, grade_type, status, validated_by, validated_at, rejection_reason, term, school_year, xp_awarded, grade_date, created_at, updated_at`. **No `created_by` column** — there is no way to know whether a grade was inserted by the teen, the parent, or a teacher.
- `teens` has `school_type`, `curriculum`, `primary_language` (mig 036) plus a free-text `school` and `grade_level`.
- `curriculum_subjects` columns: `school_type, curriculum, subject_id, subject_label_fr, subject_label_en, subject_label_ar, available_grade_levels[], is_active, sort_order` — proper i18n shape.
- `content_curriculum_mapping` columns: `content_type, content_id, school_type, curriculum, adapted_title, adapted_description, language` — designed for per-curriculum content adaptation. **0 rows live.**
- RLS on `teen_grades`: 3 policies, all gated on `teens.parent_id = auth.uid()`. **A teacher (or any non-parent) cannot SELECT or INSERT.** The RLS encodes "this is a parent-controlled feature", contradicting the vision of teacher-submitted grades.

## 3. Gaps vs vision

- **Grade ownership: parent-only.** Schema has no `created_by` column and RLS forbids non-parents. The teen UI's `submitGrade` action runs under the parent session via the auth fixture, not the teen — meaning even the "teen self-declares" branch is structurally a parent insert. **Teachers have no write path to `teen_grades` at all.** This is the same pattern flagged in `teacher-coach-xp.md` for sport.
- **Aide-scolaire UI is wired to real data, but the data is empty.** Post-W2 the page is a server component fetching `teen_grades` correctly — verified at L48-93 of `page.tsx`. With 0 rows in production the UI permanently shows the `EmptyState` "Aucune note validée". The W2 fix is correct; the seeding is missing.
- **Recommendations endpoint exists but is not rendered.** `app/api/teen/education/recommendations/route.ts` has heuristic logic ready (weak-subject detection, quiz suggestion, physical challenge fallback) but `aide-scolaire-client.tsx` shows a hardcoded "Recommandations bientôt disponibles" `EmptyState`. ~250 lines of unused logic.
- **No tutoring booking flow.** No `tutoring_sessions` table, no `app/teen/aide-scolaire/book/` route, no API endpoint, no partner-side UI to publish slots. The vision premise that "tutoring slots reuse event infrastructure" is unmet — and the `events`/`activities` system was never extended with `subject` / `grade_level` fields. Booking is **not unified, not separate, just absent.**
- **No academic challenges entity.** `physical_challenges` exists; there is no `academic_challenges`, no `math_contests`, no `language_olympics` table.
- **Curriculum mapping is a stub.** `curriculum_subjects` has 39 rows across 3 curricula (FR/US/UK), but `content_curriculum_mapping` has **0 rows** — no actual quiz or tutorial has been mapped to a curriculum. Quizzes are seeded with `grade_level='6eme'` etc. (French-only naming) and **no `school_type` or `curriculum` column on `educational_quizzes`** — the table cannot be filtered by curriculum at all. The 036 migration created the mapping table but the application layer never started populating it.
- **No Moroccan public curriculum, no IB, no Cambridge.** Only `french`, `american`, `british` are seeded. The teens table CHECK constraint allows `'french','american','british','ib','other','unknown'` — **no `'moroccan_public'` value**, even though the founder is Morocco-based. The vision-stated "Moroccan / IB / Cambridge" support is only partially representable in the schema.
- **Multi-language adaptation: schema-ready, content-empty.** `curriculum_subjects` carries `subject_label_fr/en/ar`; `content_curriculum_mapping.language` exists; `teens.primary_language` defaults to `french`. None of this is rendered: the aide-scolaire page hardcodes French strings ("Mes Matières", "Aucune note validée"). Arabic labels in the API `SUBJECTS` constant are unused.
- **No AI homework helper.** No `homework_help_sessions` table, no `/api/teen/aide-scolaire/help` route. `lib/ai/international-school-engine` is the only academic AI artefact; it generates content recommendations, not interactive homework help. Out of scope per current code, but matches the founder bullet "Possibly: AI homework helper".
- **Education partners cannot publish anything.** `EducationPartnerForm` collects a course catalogue at registration, but there is no live "publish a tutoring slot" / "submit a grade for student X" / "upload a quiz to the bank" partner UI. `partners.partner_type='education'` is used nowhere downstream.
- **`teen_grades` xp_awarded path inconsistent.** PATCH approve grants 10–100 XP; legacy `submitGrade` server action does not. Parent-side `app/api/parent/grades/route.ts` has its own (overlapping, slightly different) XP grant formula. Three parallel code paths.

## 4. Open questions for the founder

- **Are tutors employed by Nivy or independent on the platform?** The `partners` schema treats education as institutional (a centre or école); there is no per-teacher identity, no teacher login, no tutor profile. If tutors are independents (the Acadomia / Superprof model) we need a `tutors` table separate from `partners`, with KYC, certifications, and an availability calendar. If they are employees of registered education partners, we need a `partner_staff` table and per-staff auth.
- **AI homework helper: in scope for v1, or post-launch?** Privacy concerns are non-trivial: a homework helper sees the teen's school work, potentially their address (school name), and certainly their academic level. PII routing to an LLM provider needs a Morocco/EU data-residency answer and parental consent UX before this can ship.
- **Grade data: who owns it? What is the parent-visibility default?** Today: parent owns and validates everything. If teachers submit grades in v2, do they go directly to `approved` (teacher trusted) or via a parent approval queue? Can a teen hide a bad grade from the parent? Anonymisation for analytics — do we publish "average 4ème math grade across Nivy" leaderboards, and if so, how do we anonymise small-cohort private schools?
- **Curriculum: how many supported at launch?** 3 are seeded (French, American, British). The Morocco market needs at least Programme Marocain (Arabic + French bilingual, often called "Mission" vs "OSUI" vs "public") and probably IB and Cambridge IGCSE for the international school segment in Casa/Rabat. Does the founder ship with 3 and grow, or block launch on 6?
- **Tutoring booking: separate page or inside `events`?** Reusing events gives free calendar/payment/notifications but pollutes the events feed with non-leisure entries. A dedicated `aide-scolaire/book` flow gives clean filtering by subject/level but duplicates booking logic.
- **Academic challenges: partner-organised or Nivy-curated?** A "Concours Nivy de Mathématiques" run by Nivy is a different business from "Acadomia Math Cup published on Nivy". The schema and revenue split differ.
- **What is the XP-bonus formula for teacher-submitted grades vs teen-self-declared?** Should teacher submissions carry a higher XP coefficient (trust premium), or the same baseline? Should the `xp_transactions.source_type` distinguish `grade_self`, `grade_parent_validated`, `grade_teacher_validated`?

## 5. Tables read (live DB)

`teen_grades` (0 rows, parent-RLS-gated), `educational_quizzes` (9 rows, French grade_level only, no curriculum column), `educational_tutorials` (0 rows), `curriculum_subjects` (39 rows, 3 curricula seeded), `content_curriculum_mapping` (0 rows), `teens` (school_type / curriculum / primary_language columns present from mig 036), `quiz_attempts` (referenced), `educational_tutorial_progress` (referenced).

## 6. Files referenced

- `app/teen/aide-scolaire/page.tsx`
- `app/teen/aide-scolaire/aide-scolaire-client.tsx`
- `app/teen/academic/page.tsx` (redirect)
- `app/teen/academic/academic-client.tsx` (legacy, unreachable)
- `app/api/teen/education/grades/route.ts`
- `app/api/teen/education/quizzes/route.ts`
- `app/api/teen/education/tutorials/route.ts`
- `app/api/teen/education/recommendations/route.ts`
- `app/api/teen/content/international/route.ts`
- `app/api/parent/grades/route.ts`
- `app/parent/grades/page.tsx`
- `gamification-system/features/pillars/actions.ts` (`submitGrade`)
- `gamification-system/database/migrations/022_pillars_system.sql`
- `gamification-system/database/migrations/036_international_schools_support.sql`
