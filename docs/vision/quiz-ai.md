# Quiz + AI Personalization - Vision vs Reality Audit

Date: 2026-05-07
Auditor: quiz-ai-vision-auditor
Scope: read-only audit of the quiz feature, with focus on AI generation, pedagogical validation, and per-teen personalization.
Project DB: Supabase `imchornjvmgmaovhypco` (live).

---

## 1. Vision (founder)

- Quizzes **adapted to the child's profile**: school, grade level, language, interests, past performance.
- **AI generation pipeline**: a model produces questions, a pedagogical reviewer validates them, a moderator checks safety, then content is published.
- **Daily personalized quiz**: Nivy's avatar proposes "today's quiz" tuned to the teen.
- Rewards in XP, feeding the gamification loop (pillar `school`).
- Parent visibility on the teen's quiz progress.

## 2. What actually exists in the code

### 2a. Quiz runtime (the part that ships)
- `app/teen/quiz/page.tsx` - RSC quiz hub. Calls `getQuizCategoriesForTeen`, `getRecentQuizAttempts`, `getDailyQuizForTeen`, `getTeenQuizStats` from `lib/quiz/server.ts`.
- `app/teen/quiz/[id]/page.tsx` + `app/teen/quiz/[id]/quiz-runner-client.tsx` - quiz execution UI.
- `app/teen/quiz/history/page.tsx` - past attempts.
- `app/teen/quiz/quiz-hub-client.tsx` - client shell of the hub.
- `app/api/teen/quiz/categories/route.ts` - lists categories from `educational_quizzes` aggregated by `subject`.
- `app/api/teen/quiz/daily/route.ts` - "daily quiz".
- `app/api/teen/quiz/[id]/route.ts` - single quiz fetch.
- `app/api/teen/quiz/submit/route.ts` - server-side regrade + `quiz_attempts` insert + XP via `add_xp_to_user` RPC.
- `app/api/teen/quiz/history/route.ts` - last N attempts.
- `lib/quiz/catalog.ts` - **display-only** category icons/colors. Not a question source. Comment: "questions are NEVER generated client-side. They live in `educational_quizzes.questions` (JSONB)".
- `lib/quiz/schema.ts` - Zod + TS shapes (`Quiz`, `QuizQuestion`, `submitQuizSchema`).
- `lib/quiz/server.ts` - all RSC fetchers; the source of truth for runtime quiz reads.

### 2b. AI generation pipeline (built but disconnected)
- `lib/ai/content-generator.ts` - `ContentGenerator` class, calls OpenAI or Claude through `AIProviderFactory`. Real HTTP calls.
- `lib/ai/providers/openai.ts` - `fetch("https://api.openai.com/v1/chat/completions")`, default `gpt-4`.
- `lib/ai/providers/claude.ts` - `fetch("https://api.anthropic.com/v1/messages")`, default `claude-3-sonnet-20240229` (note: a 2024 snapshot; long deprecated by 2026).
- `lib/ai/providers/factory.ts`, `lib/ai/providers/base.ts` - strategy pattern + key wiring.
- `lib/ai/intelligent-content-engine.ts` - orchestrator: profile fetch -> generation params -> validator -> pedagogical -> reliability score -> recommendation.
- `lib/ai/pedagogical-validator.ts`, `lib/ai/content-validator.ts`, `lib/ai/factual-validator.ts`, `lib/ai/factual-verifier.ts`, `lib/ai/quality-scoring.ts` - validation/scoring layer.
- `lib/ai/enhanced-quiz-prompts.ts`, `lib/ai/prompts/`, `lib/ai/question-type-generator.ts`, `lib/ai/smart-json-parser.ts` - prompt + parsing tooling.
- `lib/ai/interest-integration.ts`, `lib/ai/moroccan-context.ts`, `lib/ai/international-school-engine.ts`, `lib/ai/context-engine.ts`, `lib/ai/tpm-content-engine.ts`, `lib/ai/agent-actions.ts` - context layers (Moroccan curricula, OIB schools, etc.).
- `app/api/admin/content/generate/route.ts` - admin endpoint to trigger generation manually.
- `app/api/cron/generate-daily-content/route.ts` - cron entrypoint that loops over teens grouped by `profiles[]` and asks the generator for content.

### 2c. DB schema for the AI system
- `gamification-system/database/migrations/022_pillars_system.sql` - introduces `educational_quizzes`, `quiz_attempts`, `teen_grades` (school pillar).
- `gamification-system/database/migrations/031_quiz_question_types.sql` - adds `question_type_mix` JSONB to quizzes; supports `mcq | true_false | fill_blank | image | audio | matching`.
- `gamification-system/database/migrations/032_content_generation_system.sql` - `content_generation_logs`, `ai_generation_templates`, `personalized_content_assignments`, `daily_content_schedule`.
- `gamification-system/database/migrations/033_content_validation_system.sql` - `content_validations`, `content_quality_rules`, `curated_content_library`.
- `gamification-system/database/migrations/034_intelligent_content_system.sql` - `teen_behavioral_profile`, `content_performance_metrics`, `content_factual_verification`, `content_recommendations`, `adaptive_learning_tracker`, `content_reliability_scores` + RPC `calculate_teen_behavioral_profile` + `calculate_content_reliability`.
- `gamification-system/database/migrations/038_quiz_seed_content.sql` - **OPT-IN** static seed of 9 quizzes.

## 3. Live DB state

| Table | Rows | Note |
|---|---|---|
| `educational_quizzes` | 9 (all `is_active`) | seed only (math x2, french x2, science, english, geography, history, culture) |
| `quiz_attempts` | 0 | no teen has ever submitted |
| `teen_behavioral_profile` | 0 | profile RPC is never called in production |
| `teen_grades` | 0 | school-pillar input empty |
| `content_generation_logs` | 0 | AI pipeline has never been invoked in prod |
| `ai_generation_templates` | 0 | template table empty -> `ContentGenerator` would generate without curated prompts |
| `content_validations` | 0 | no validation has ever run |
| `content_recommendations` | 0 | recommendation engine idle |
| `curated_content_library` | 0 | fallback library empty |

Quiz subject/grade distribution:
- 6eme: math(2), french, english, geography
- 5eme: science
- 4eme: french, history
- 3eme: culture
Total 8 grade/subject buckets across 9 rows.

## 4. Gap analysis - vision vs implementation

### Gap 1: `getDailyQuizForTeen` is NOT personalized
File: `lib/quiz/server.ts:89-133` and `app/api/teen/quiz/daily/route.ts`.
Logic: `dayIndex = floor(now / 1day); today = pool[dayIndex % pool.length]`. **Same quiz served to every teen** on the same UTC day. Ignores `teen.school_type`, `teen.date_of_birth`, behavioral profile, performance history. The function name suggests personalization (`ForTeen`), the body delivers a global rotation.

### Gap 2: `educational_quizzes.grade_level` is set but never filtered against the teen
The quiz row carries `grade_level` (`6eme`, `5eme`, etc.). None of `getQuizCategoriesForTeen`, `getDailyQuizForTeen`, `getQuizById` filter by it. A 3eme teen will be offered a 6eme math quiz indistinguishably from a grade-appropriate one.

### Gap 3: `teens` table lacks the columns the vision requires
Live `teens` columns relevant to personalization: `first_name`, `date_of_birth`, `school_type`. **No** `grade_level`, `interests`, `profiles`, `language`, `school_name`. The cron in `app/api/cron/generate-daily-content/route.ts:54-58` selects `id, grade_level, interests, profiles, school` - **those columns do not exist**, so the cron would crash on first run. This is a strong tell that the AI pipeline has never been executed against the live schema.

### Gap 4: Real AI pipeline exists but is not wired to the teen UX
`lib/ai/intelligent-content-engine.ts` + `content-generator.ts` are real (HTTP calls to OpenAI/Anthropic, prompt templates, JSON parsing, validators). But:
- The teen quiz hub never calls them.
- The only callers are `app/api/admin/content/generate` (admin-only) and `app/api/cron/generate-daily-content` (broken, see Gap 3).
- Generated quizzes do not appear to be inserted back into `educational_quizzes` automatically anywhere reachable by the teen UI.

### Gap 5: Validation pipeline never runs
`content_validations`, `content_factual_verification`, `content_quality_rules` are zero rows. The `pedagogical-validator.ts` / `content-validator.ts` modules exist but only the AI pipeline calls them, and the AI pipeline does not run. There is **no human pedagogical reviewer step** wired anywhere - the migration leaves `reviewed_by` open but no admin UI or workflow targets it.

### Gap 6: Quiz attempts never feed back
`quiz_attempts` is empty (no teen activity yet). Even when populated, nothing reads it to: (a) skip already-passed quizzes in the daily rotation; (b) update `teen_behavioral_profile`; (c) call `calculate_teen_behavioral_profile` RPC; (d) drive spaced repetition or difficulty adjustment. The closed loop (perform -> profile update -> next reco) is not closed.

### Gap 7: Language handling absent
Vision mentions `langue` (FR/AR/EN). Quizzes have no `language` column; `teens` has none either. The seed is FR-only. Arabic quizzes are not modelled.

### Gap 8: Parent visibility on quiz progress not in this feature
No `app/parent/quiz*` route exists. Any parent surfacing of the school pillar is via `teen_grades` (also empty), not via `quiz_attempts`.

### Gap 9: Stale model identifier
`ContentGenerator` defaults to `claude-3-sonnet-20240229`, retired well before 2026-05. Calls would fail until the model id is updated (e.g. to a current Claude Sonnet/Opus snapshot).

### Gap 10: Two overlapping submit paths
The submit comment in `app/api/teen/quiz/submit/route.ts:13` references `app/api/teen/education/quizzes/route.ts` as a sibling using the same XP path. Risk of double-grading or drift between them.

## 5. Strengths

- Server-side regrade in `submit/route.ts` is correct: client never decides if an answer is right.
- `add_xp_to_user` RPC is the canonical XP path -> consistent ledger.
- `educational_quizzes.questions` JSONB with embedded `correct` index is a clean shape for AI-generated content.
- The AI lib code is structured (Strategy/Factory, repository pattern in `intelligent-content-engine.ts`) - the bones are there, only the wiring is missing.
- Migrations 032/033/034 already model logs, validations, reliability scoring, recommendations - the schema is more mature than the runtime.

## 6. Open questions for the founder

1. **Generation strategy** - should AI generate fresh quizzes daily per teen, or curate from a vetted pool (current `educational_quizzes` seeded by editors)? The DB supports both; the runtime supports neither personally yet.
2. **Pedagogical validation owner** - internal Nivy team, contracted teachers, AI-only, or parent feedback loop? `content_validations.reviewed_by` expects a `profiles.id` - who?
3. **Difficulty curve** - rule-based (target ~70-80% score) or learned via `adaptive_learning_tracker`? Today neither runs.
4. **Language policy** - should we add `language` to `teens` and `educational_quizzes`, or infer from `school_type`?
5. **Daily quiz semantic** - same for everyone (current behavior, simpler social) or unique per teen (founder vision)?
6. **`teens` schema** - confirm we need to add `grade_level`, `interests`, `profiles[]`, `language`, `school_name`. Cron and AI prompts already assume them.
7. **Closing the loop** - do we want spaced repetition (skip recently passed, resurface failed) before or after AI generation lands?

## 7. Recommended next steps (read-only audit, not applied)

1. Decide pool-curation vs on-the-fly generation; if pool, expand `educational_quizzes` seed dramatically and drop the cron. If generation, fix `teens` columns first.
2. Add the missing `teens` columns (`grade_level`, `interests`, `language`, `profiles`) so the existing cron and prompts compile against live schema.
3. Replace the dayIndex global rotation in `getDailyQuizForTeen` with: filter by `grade_level` matching teen, exclude `quiz_id`s already passed in last N days, rank by difficulty match.
4. Wire `calculate_teen_behavioral_profile` into the submit path so profile updates after each attempt.
5. Bump the Claude model id to a 2026-supported snapshot before ever calling `ContentGenerator`.
6. Build a minimal admin review queue over `content_validations` (status `manual_review`) to put a human in the loop before published quizzes go live.

---

This audit is read-only; the only file written is this document.
