# Quiz audit — 2026-05

**Baseline:** SHA `6e3e7f2`
**Mode:** Read-only

## Score pro: 4 / 5

## Résumé

**Wave 1 succès majeur** : le hub quiz est désormais full server-component avec 5 endpoints API, un client `quiz-hub-client.tsx`, un runner par-quiz et un historique. Plus de mock array.

## Inventaire vérifié

### App routes
- `app/teen/quiz/page.tsx` — server component (Read confirmé), `force-dynamic`, charge en parallèle `getQuizCategoriesForTeen`, `getRecentQuizAttempts`, `getDailyQuizForTeen`, `getTeenQuizStats`
- `app/teen/quiz/quiz-hub-client.tsx`
- `app/teen/quiz/[id]/page.tsx` + `quiz-runner-client.tsx`
- `app/teen/quiz/history/page.tsx`

### API routes
- `app/api/teen/quiz/categories/route.ts`
- `app/api/teen/quiz/[id]/route.ts`
- `app/api/teen/quiz/submit/route.ts`
- `app/api/teen/quiz/history/route.ts`
- `app/api/teen/quiz/daily/route.ts`

### Library
- `lib/quiz/catalog.ts`
- `lib/quiz/schema.ts`
- `lib/quiz/server.ts`

### DB seed
- `gamification-system/database/migrations/038_quiz_seed_content.sql` (untracked, non encore commité ?)

## P0
- Aucun. Le quiz est solide.

## P1
- **Q1** — Tests Playwright: 0 spec quiz dans `tests/e2e/`. Ajouter au moins `tests/e2e/teen-quiz.spec.ts` couvrant : ouverture hub → daily quiz → submit → résultat → XP credité.
- **Q2** — Vérifier que la migration `038_quiz_seed_content.sql` (status untracked) est bien runnable et idempotente avant merge.

## P2
- **Q3** — Endpoint `app/api/teen/quiz/daily/route.ts` : vérifier rate-limit (1 daily / 24h) côté serveur, pas seulement UI.

## Fichiers cités
- `app/teen/quiz/page.tsx`
- `app/teen/quiz/quiz-hub-client.tsx`
- `app/teen/quiz/[id]/page.tsx`
- `app/teen/quiz/[id]/quiz-runner-client.tsx`
- `app/teen/quiz/history/page.tsx`
- `app/api/teen/quiz/categories/route.ts`
- `app/api/teen/quiz/submit/route.ts`
- `lib/quiz/server.ts`
- `gamification-system/database/migrations/038_quiz_seed_content.sql`
