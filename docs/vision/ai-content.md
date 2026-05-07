# AI Content Generation — Vision Audit

> Read-only audit of the Nivy AI content pipelines (quizzes, missions, défis, coach text)
> performed against the codebase, the SQL migrations and the live `nivy` Supabase project
> (`imchornjvmgmaovhypco`).
> Scope: lib/ai, app/api/admin/content, app/api/cron, app/api/teen/content, migrations 032-034.

---

## 1. What the founder appears to want (vision)

A self-driving content factory aimed at Moroccan teens 13-17:

- **Generate** quizzes (curriculum-aligned), daily/physical défis, and personalised
  challenge text spoken by the avatar coach (Kai/Aura).
- **Validate** every piece of content along three axes:
  1. *Pedagogical* — correctness, age-appropriate, distractors plausibles.
  2. *Moroccan-context* — Darija/fr-MA accent, programme scolaire MA, références culturelles.
  3. *Moderation* — nothing inappropriate for a minor.
- **Recommend** the right piece to the right teen using a behavioural profile
  (learning style, attention span, best/struggling subject, optimal hour).
- A **fallback** to a curated library when AI generation fails or scores too low.
- A **human review queue** for borderline content.
- An **LLM provider abstraction** so the team can swap OpenAI ↔ Anthropic ↔ Mistral.

Reference: `docs/INTELLIGENT_CONTENT_SYSTEM.md` (self-rated 18.5/20).

---

## 2. What is actually built (state of the code)

### 2.1 Provider layer — multi-vendor but **OpenAI-first**

Two parallel stacks coexist (a smell to clean up):

- **Strategy pattern** for batch generation
  (`lib/ai/providers/factory.ts`, `claude.ts`, `openai.ts`, `base.ts`)
  - `OpenAIProvider` → `https://api.openai.com/v1/chat/completions`, default `gpt-4`.
  - `ClaudeProvider` → `https://api.anthropic.com/v1/messages`, default
    `claude-3-sonnet-20240229` (an *outdated* model id).
  - Selected at runtime via `process.env.AI_PROVIDER` (default `"openai"`).
- **Vercel AI SDK** for the conversational agent
  (`lib/ai/provider.ts`, uses `@ai-sdk/openai` v3.0.12, model `gpt-4o-mini`).

No `groq`, `together`, `replicate` or local-model wiring is present.
`package.json` only contains `@ai-sdk/openai`. The Anthropic call goes through `fetch`,
no SDK, no prompt-caching, no streaming on that path.

### 2.2 Generation orchestrator

- `lib/ai/content-generator.ts` — class `ContentGenerator` with three entry points:
  `generateQuiz`, `generateMission`, `generateChallenge`.
  Quizzes use enriched prompts (`enhanced-quiz-prompts.ts`) injecting teen interests
  (`interest-integration.ts`) and parsed with a tolerant `SmartJSONParser`.
- `lib/ai/intelligent-content-engine.ts` — `IntelligentContentEngine` orchestrates
  *behavioural profiling → param mapping → generation → validation → refinement*.
  It hard-codes the OpenAI provider (`new ContentGenerator("openai", true)`).
- `lib/ai/international-school-engine.ts` and `tpm-content-engine.ts`
  appear to be parallel, less-used variants.

### 2.3 Validators (3 layers)

- `lib/ai/content-validator.ts` — structural checks (titre, description, count of
  questions, options, réponse correcte, distribution des bonnes réponses).
  Returns score 0-100, `requiresManualReview` flag, persists to
  `content_validations`.
- `lib/ai/factual-validator.ts` and `factual-verifier.ts` — heuristic checks
  (longueur, plausibilité, vocabulaire, **détection langue française** via
  liste de mots-clés anglais et présence d'accents). **Pas d'appel API externe**
  (Wikipedia, Wolfram, etc.) — l'auto-eval `INTELLIGENT_CONTENT_SYSTEM.md` le
  reconnaît comme un point d'amélioration.
- `lib/ai/pedagogical-validator.ts` — heuristiques sans LLM : longueur 20-250,
  3-5 options, distracteurs ≥ 5 chars, doublons, patterns interdits
  (« toutes les réponses », « aucune des réponses »), jargon (tldr/fyi/asap/lol/wtf),
  cri en MAJUSCULES. Score combiné via
  `quality-scoring.ts` (50 % pédagogique, 20 % variété de types,
  15 % couverture marocaine, 15 % cohérence).

### 2.4 Moroccan-context layer

`lib/ai/moroccan-context.ts` — base statique : 15 villes, 12 régions, 7 dynasties,
plats emblématiques, fêtes nationales, personnalités publiques (Roi, Hakimi, Bounou,
El Guerrouj, El Moutawakel, Slimani, Ben Jelloun…). Fonctions
`enrichWithMoroccanContext(text)` et `moroccanCoverage(questions)`.

**Pas de Darija**. Le prompt système interdit même explicitement la darija
dans les quiz : *« Pas d'anglais, pas de darija dans le contenu du quiz »*
(`enhanced-quiz-prompts.ts:54`). La couverture multilingue se limite à du
français standard avec références culturelles MA.

### 2.5 Moderation

Très rudimentaire :

- Liste noire de gros mots (3 entrées : `merde`, `con`, `putain`)
  dans `factual-validator.ts:239`.
- Regex anti « aucune/toutes/peut-être/je ne sais pas » comme bonne réponse.
- Aucun classifier ML, aucun LLM-as-judge, aucun appel à l'API moderation
  d'OpenAI ou à un service tiers (Perspective API, etc.).

### 2.6 Cost controls

- Schéma DB prévu (`tokens_used`, `cost_estimate` dans `content_generation_logs`)
  mais **aucun rate-limit ni budget cap** ne sont appliqués côté code.
- La cron limite à 100 teens (`.limit(100)`) et 2 quiz + 1 mission par groupe de
  profil → unique garde-fou de coût.

### 2.7 Trigger / orchestration

- **Manual** : `POST /api/admin/content/generate` (admin uniquement).
- **Cron** : `POST /api/cron/generate-daily-content` protégé par
  `CRON_SECRET` Bearer. Idempotent via `daily_content_schedule.target_date`.
  **Pas de `vercel.json` à la racine** → la cron n'est probablement pas
  câblée à un scheduler en prod, c'est une route qui attend qu'on l'appelle.
- **Just-in-time pour le teen** : `app/api/teen/content/{personalized,intelligent,international}/route.ts`.
- **Validation queue UI** : `POST /api/admin/content/validate` pour
  `approve | reject | needs_revision`.

---

## 3. Live database state

Projet Supabase actif : **nivy** (`imchornjvmgmaovhypco`, eu-central-1, Postgres 17).

Tables AI/contenu présentes :

| Table | Rows |
|---|---|
| `ai_generation_templates` | 0 |
| `content_generation_logs` | 0 |
| `content_validations` | 0 |
| `content_factual_verification` | 0 |
| `content_quality_rules` | 0 |
| `content_recommendations` | 0 |
| `content_reliability_scores` | 0 |
| `curated_content_library` | **0** (le fallback est vide !) |
| `teen_behavioral_profile` | 0 |
| `content_curriculum_mapping` | 0 |
| `content_performance_metrics` | 0 |

**Aucune génération n'a jamais tourné en prod**. Tout le pipeline est dormant.
Encore plus inquiétant : `curated_content_library` est vide, donc le fallback
configuré dans `ContentGenerator.getFallbackQuiz()` ne renvoie rien quand le
LLM échoue → le teen voit `null`.

---

## 4. Gaps & risks

1. **Modèles obsolètes** : `gpt-4` et `claude-3-sonnet-20240229` sont les
   defaults. Aucun usage des familles 4o / 4.x / Sonnet 4.x → coût 5-10× plus
   cher pour qualité moindre, et `claude-3-sonnet-20240229` est *deprecated*.
2. **Deux stacks LLM en parallèle** (`fetch` direct vs `@ai-sdk/openai`) sans
   raison technique → maintenance double.
3. **Modération absente** au sens vrai du terme : pas d'OpenAI Moderation API,
   pas de classifier d'âge, juste 3 mots interdits.
4. **Pas de Darija ni d'arabe** dans le pipeline : moroccan-context n'a que des
   noms propres, le prompt interdit la darija. Aucun support `ar-MA` / `fr-MA` BCP-47.
5. **Pas de garde-fou budget** : un attaquant qui obtient un cookie admin
   peut dérouler `count` jusqu'à OOM Tokens.
6. **Curated fallback vide** → mode dégradé inutilisable.
7. **Cron non planifié** : route présente, scheduler absent (`vercel.json` manquant).
8. **Pas de queue de revue humaine** matérialisée : `validation_status =
   'manual_review'` existe mais aucune UI dédiée n'a été repérée
   (seulement l'API `/api/admin/content/validate`).
9. **Profilage comportemental** dépend d'une RPC Supabase
   `calculate_teen_behavioral_profile` qu'il faudra vérifier en migration.
10. **Pas de RAG / mémoire long terme** sur le coach (cf. `AGENTIC_SYSTEM_STATUS.md`).

---

## 5. Open questions for the founder

1. **LLM provider** : on standardise sur Anthropic Claude (Sonnet 4.x avec
   prompt caching) ou on reste sur OpenAI `gpt-4o-mini` ? Le coût pour 50k
   teens × 1 quiz/jour est très différent.
2. **Cadence de génération** : nightly batch global, on-demand par teen, ou
   les deux ? Aujourd'hui le code prévoit les deux mais aucun n'est planifié.
3. **Qui revoie les contenus en `manual_review`** ? Équipe interne, modérateurs
   externalisés, ou auto-rejet après X jours sans review ?
4. **Multilingue** : le périmètre annoncé est « ado marocain ». Faut-il livrer
   les quiz en français uniquement (état actuel), ou ajouter Darija/Arabe
   classique/Anglais (lycées internationaux) comme l'a évoqué
   `INTERNATIONAL_SCHOOLS_ADAPTATION.md` ?
5. **Modération minors-safe** : on branche l'OpenAI Moderation API et un
   classifier d'âge (ex: Detoxify) en plus des heuristiques, ou on reste
   en humain-in-the-loop seulement ?
6. **Budget cap** : quelle enveloppe mensuelle (USD) on protège, et avec
   quel système (Vercel Edge Config flag, table DB, env var) ?

---

## 6. Files & paths inventoried

Code:
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\content-generator.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\content-validator.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\pedagogical-validator.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\factual-validator.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\factual-verifier.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\moroccan-context.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\enhanced-quiz-prompts.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\quality-scoring.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\question-type-generator.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\smart-json-parser.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\interest-integration.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\intelligent-content-engine.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\international-school-engine.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\tpm-content-engine.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\context-engine.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\agent-actions.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\provider.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\providers\factory.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\providers\openai.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\providers\claude.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\providers\base.ts`
- `C:\Users\Shadow\Desktop\NIVY\lib\ai\prompts\roles.ts`

Routes:
- `C:\Users\Shadow\Desktop\NIVY\app\api\admin\content\generate\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\admin\content\validate\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\cron\generate-daily-content\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\content\personalized\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\content\intelligent\route.ts`
- `C:\Users\Shadow\Desktop\NIVY\app\api\teen\content\international\route.ts`

Migrations & docs:
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\032_content_generation_system.sql`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\033_content_validation_system.sql`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\034_intelligent_content_system.sql`
- `C:\Users\Shadow\Desktop\NIVY\gamification-system\database\migrations\038_quiz_seed_content.sql`
- `C:\Users\Shadow\Desktop\NIVY\docs\INTELLIGENT_CONTENT_SYSTEM.md`
- `C:\Users\Shadow\Desktop\NIVY\docs\CONTENT_GENERATION_SYSTEM.md`
- `C:\Users\Shadow\Desktop\NIVY\docs\CONTENT_VALIDATION_GUIDE.md`
- `C:\Users\Shadow\Desktop\NIVY\docs\AGENTIC_SYSTEM_STATUS.md`

DB tables observed (project `imchornjvmgmaovhypco`, schema `public`):
`ai_generation_templates`, `content_generation_logs`, `content_validations`,
`content_quality_rules`, `content_factual_verification`, `content_recommendations`,
`content_reliability_scores`, `curated_content_library`, `teen_behavioral_profile`,
`content_curriculum_mapping`, `content_performance_metrics` — **all empty**.
