# Audit — Quiz (solo + multi)

**Date:** 2026-07-03
**Branche:** refonte/home-nav-lifestyle
**Mode:** Read-only

## Routes inspectées

Frontend :
- `app/teen/quiz/page.tsx` (server component)
- `app/teen/quiz/quiz-hub-client.tsx`
- `app/teen/quiz/[id]/page.tsx` + `app/teen/quiz/[id]/quiz-runner-client.tsx`
- `app/teen/quiz/history/page.tsx`
- `components/education/quiz-player.tsx` (+ barrel `components/education/index.ts`)
- `gamification-system/components/special-challenges/quiz-challenge.tsx`
- `app/gamification/aide-scolaire/` — grep "quiz" : **0 résultat**, ce dossier ne référence pas le quiz
- `app/teen/quests/friend-defis/` (page, `friend-defis-client.tsx`, `new/new-friend-defi-form.tsx`) — seul candidat "multi"

Backend / data :
- `app/api/teen/education/quizzes/route.ts` (ancienne route)
- `app/api/teen/quiz/categories/route.ts`, `.../[id]/route.ts`, `.../submit/route.ts`, `.../history/route.ts`, `.../daily/route.ts`
- `app/api/teen/friend-challenges/route.ts` (+ `[id]/progress`, `[id]/decline`)
- `lib/quiz/server.ts`, `lib/quiz/schema.ts`, `lib/quiz/catalog.ts`
- `app/api/cron/generate-daily-content/route.ts`, `app/api/cron/quiz-seen-history-prune/route.ts`
- `app/admin/content/review/page.tsx` + `review-quiz-row.tsx`
- `gamification-system/database/migrations/000_base_tables.sql` (`add_xp_to_user`), `038_quiz_seed_content.sql`

Audits antérieurs lus (non dupliqués ici) : `docs/audits/AUDIT_GENERATION_QUIZ.md` (jan. 2025, portait sur la QUALITÉ de génération IA — prompts/validation factuelle, toujours pertinent mais hors scope de cet audit produit/UX) et `docs/audits/orchestrator-2026-05/quiz.md` (SHA `6e3e7f2`, score 4/5, "plus de mock array").

## État actuel (résumé 5 lignes)

Le hub solo (`/teen/quiz`) est **réellement câblé** depuis mai 2026 : server component RSC, `getQuizCategoriesForTeen`/`getDailyQuizForTeen`/`getRecentQuizAttempts`/`getTeenQuizStats` lisent `educational_quizzes` / `quiz_attempts` en direct via `lib/quiz/server.ts`. Le brief de mission supposant `app/teen/quiz/page.tsx` "100% statique mock" est **obsolète** — c'est le cas de l'audit AUDIT_GENERATION_QUIZ (jan. 2025) et de la commande initiale, pas de l'état du 2026-07-03. Le flow submit → XP → historique → signal de personnalisation → corrélation recommandation est solide et non trivial. En revanche, **deux générations de code coexistent en dette non nettoyée** : l'ancienne route `api/teen/education/quizzes` + `components/education/quiz-player.tsx` sont orphelines (0 appelant vivant), et une partie de la nouvelle API (`categories`, `history`, `daily` GET) n'est elle-même appelée par aucun composant. Le multijoueur quiz **n'existe pas** : `quiz_battle` est un simple label dans un système générique de défis entre amis (compteur "+1"), sans runner de quiz partagé, sans temps réel, sans questions synchronisées.

## Niveau "pro" (1-5) avec justification

**Solo : 4/5.** RSC + Suspense, XP via RPC canonique, no-repeat 7 jours, recommandation personnalisée avec fallback en cascade (recommender → pool frais → bibliothèque curated), signal de personnalisation post-quiz, corrélation avec `content_recommendations`, prompt eligibility pour push. C'est un flow production-grade. Le point qui empêche le 5/5 : dette de duplication non nettoyée (ancienne route + 3 endpoints API non utilisés) et absence de tests couvrant le chemin heureux complet avec contenu seedé.

**Multijoueur : 1/5.** Aucune infrastructure de quiz multijoueur. `quiz_battle` est une étiquette cosmétique sur un système de "défis entre amis" générique et non spécifique au quiz.

## Données : statique/mocké vs API réelle

| Élément | Frontend | API existe ? | Connecté ? |
| ------- | -------- | ------------ | ---------- |
| Catégories quiz (hub) | `quiz-hub-client.tsx` | `getQuizCategoriesForTeen` (lib direct) | ✅ Connecté (RSC), données réelles de `educational_quizzes` |
| Quiz du jour | `quiz-hub-client.tsx` | `getDailyQuizForTeen` (lib direct, recommender RPC + fallback curated) | ✅ Connecté, logique riche (pas un simple mock) |
| Historique / stats | `history/page.tsx` | `getRecentQuizAttempts` / `getTeenQuizStats` | ✅ Connecté, lit `quiz_attempts` réel |
| Runner (questions/réponses) | `quiz-runner-client.tsx` | `getQuizById` (page) + `POST /api/teen/quiz/[id]` (start) + `POST /api/teen/quiz/submit` | ✅ Connecté, re-note côté serveur (pas de confiance au client) |
| XP gagné | Résultat du runner | RPC `add_xp_to_user` (canonique, partagé avec tout le reste de l'app) | ✅ Connecté, avec bonus ×1.25/×1.5 |
| `GET /api/teen/quiz/categories` | — | Existe | ❌ **Non appelé** par aucun composant (le hub RSC bypasse cette API) |
| `GET /api/teen/quiz/history` | — | Existe | ❌ **Non appelé** (idem, RSC direct) |
| `GET /api/teen/quiz/daily` | — | Existe, algorithme dayIndex simple (différent de `getDailyQuizForTeen`) | ❌ **Non appelé**, doublon d'algorithme mort |
| `app/api/teen/education/quizzes` (GET+POST) | `components/education/quiz-player.tsx` (lui-même orphelin) | Existe, fonctionnel | ❌ Route + composant tous deux **orphelins**, non montés dans l'app |
| `components/education/quiz-player.tsx` / `QuizResult` / `QuizCard` | Barrel `components/education/index.ts` | — | ❌ **0 import** depuis `app/` — code mort complet |
| `gamification-system/components/special-challenges/quiz-challenge.tsx` | — | — | ❌ **0 import** en dehors de son propre barrel — code mort |
| Quiz multijoueur / duel | Aucun composant dédié | Aucune API dédiée | ❌ **Inexistant** |
| `quiz_battle` (friend-défis) | `new-friend-defi-form.tsx` (simple `<select>`), `friend-defis-client.tsx` (bouton "+1" générique) | `api/teen/friend-challenges` + RPC `create_friend_challenge_v2` | ⚠️ Connecté à un backend générique de défis (compteur, pas de quiz réel) |
| Contenu généré (IA quotidienne) | — | `app/api/cron/generate-daily-content/route.ts` (cohortes, `content-generator.ts`, `content-safety.ts`) | ✅ Existe et tourne en cron réel |
| Authoring / modération admin | `app/admin/content/review/page.tsx` | `POST /api/admin/content/review/:id` | ✅ File de revue humaine (approve/reject), pas un éditeur de création manuelle |

## Cohérence avec le reste de l'app

- **XP** : oui, via `add_xp_to_user` (RPC canonique partagée par tout le système de gamification — pas une logique XP ad hoc au quiz). Bonus haut score ×1.25/×1.5 dupliqué en commentaire entre `submit/route.ts` et l'ancienne route morte (dette documentée, sans risque actif puisque l'ancienne route n'est plus appelée par le flow réel).
- **Leaderboard** : aucun lien "classement" trouvé dans `app/teen/quiz/*`. Le score alimente `user_xp`/`xp_transactions` qui nourrit potentiellement un leaderboard global ailleurs dans l'app, mais rien de spécifique au quiz (pas de "classement des quiz" visible).
- **Streak** : pas de branchement direct visible entre un quiz réussi et l'incrémentation d'un streak dédié — le XP retombe dans le pot commun `user_xp`, mais aucun code dans `lib/quiz/server.ts` ou `submit/route.ts` ne touche une table `streaks`.
- **Recommandation / personnalisation** : oui, fortement intégré — `recommend_for_teen` RPC, `content_recommendations` (impression + corrélation post-résultat), `recordSignalAsync` (signal `complete`/`abandon` avec poids selon score) pour le moteur de recommandation. C'est la meilleure preuve de cohérence transverse du module.
- **Push** : `markPushPromptEligible()` appelé après un quiz réussi — cohérent avec le système de prompts push différés du reste de l'app.
- **Achievement unlock** : aucun appel explicite à un système de déblocage de succès trouvé dans le chemin `submit/route.ts`. Si des achievements réagissent à `xp_transactions.source_type = 'quiz'`, ce serait via un trigger DB non exploré ici (hors scope du grep effectué).

## Gaps bloquants (P0)

Aucun gap P0 sur le flow solo — confirme le score 4/5 de l'audit précédent, toujours vrai au 2026-07-03.

- **P0-1 — CASSÉ (risque de confusion, pas un crash)** : deux algorithmes de "quiz du jour" coexistent et divergent : `getDailyQuizForTeen` (utilisé, recommandation personnalisée + fallback curated + respect du no-repeat 7 jours) vs `GET /api/teen/quiz/daily` (mort, simple `dayIndex % pool.length`, ne consulte même pas `quiz_seen_history`). Si un futur développeur relie par erreur un client (mobile, widget) à cette route morte, il obtiendra un comportement incohérent avec le web. Fichier : `app/api/teen/quiz/daily/route.ts:41-42` vs `lib/quiz/server.ts:89-385`.

## Gaps importants (P1)

- **P1-1 — DETTE/doublon** : `app/api/teen/education/quizzes/route.ts` (238 lignes) et `components/education/quiz-player.tsx` (604 lignes) forment un **flow complet parallèle et orphelin**, non monté nulle part dans `app/`. Risque : maintenance perdue (si quelqu'un modifie le schéma `educational_quizzes` sans savoir que cette route existe, elle cassera silencieusement sans que personne ne le remarque puisqu'aucun test/usage réel ne la couvre). À supprimer ou explicitement documenter comme "legacy, à ne pas utiliser". Fichiers : `app/api/teen/education/quizzes/route.ts`, `components/education/quiz-player.tsx:127` (fetch vers la route morte), `components/education/index.ts:24-28`.
- **P1-2 — DETTE/doublon** : `GET /api/teen/quiz/categories` et `GET /api/teen/quiz/history` existent mais ne sont appelés par aucun composant — le hub et l'historique lisent directement `lib/quiz/server.ts` en RSC. Ces deux endpoints ne sont donc couverts par aucun test d'intégration réel côté usage web (seul un futur client mobile/API externe les activerait). Fichiers : `app/api/teen/quiz/categories/route.ts`, `app/api/teen/quiz/history/route.ts`.
- **P1-3 — MANQUANT vs standard pro** : aucune infrastructure multijoueur/duel de quiz. Grep exhaustif sur "multiplayer", "duel", "battle", "vs", "rooms", "realtime", "channel", "presence" combinés à "quiz" : le seul résultat est `quiz_battle` comme valeur d'enum `challenge_kind` dans le système générique `friend_challenges` (`app/teen/quests/friend-defis/new/new-friend-defi-form.tsx:20`). Le bouton d'action associé (`friend-defis-client.tsx:223-245`) envoie un `POST .../progress` avec `{ delta: 1 }` générique — il n'y a **aucun** composant qui affiche des questions à deux joueurs, aucune synchronisation, aucun canal Supabase Realtime, aucun socket. Un ado qui choisit "Quiz Battle" dans le formulaire de défi obtient en réalité un simple compteur manuel partagé, pas un quiz. Ceci confirme et ne fait que reconduire le P2 déjà noté dans `docs/audits/audit-2026-05-31/AUDIT-FEATURES-TEEN.md:465` — resté non résolu à ce jour.
- **P1-4 — DETTE/doublon** : le calcul du bonus XP haut-score (×1.25 dès 80%, ×1.5 dès 90%) est dupliqué en dur entre `app/api/teen/quiz/submit/route.ts:86-91` et l'ancienne route morte `app/api/teen/education/quizzes/route.ts:178-181`, avec seulement un commentaire ("mirrors ...") pour les garder synchronisés — aucune garde de type/test ne l'impose. Si un PO change la règle XP à un seul endroit, l'autre dérive silencieusement (risque faible tant que la route morte n'est pas relancée, mais dette réelle).
- **P1-5 — MANQUANT vs standard pro** : pas de test Playwright pour le flow complet submit → résultat → XP crédité (le test existant `tests/e2e/quiz.spec.ts` skip explicitement le click-through dès que le contenu seed n'est pas appliqué — voir ligne 40-44 et 63-79 — donc en pratique il ne vérifie que le rendu du skeleton, pas la logique de notation/XP réelle en CI standard).
- **P1-6 — MOCK/faux contenu conditionnel** : la seed de contenu `gamification-system/database/migrations/038_quiz_seed_content.sql` est bien committée (contredisant l'hypothèse de l'audit orchestrator-2026-05 qui la croyait "untracked, non encore commitée"), mais son application sur l'environnement de test reste "manuelle, opt-in" selon le commentaire du test e2e — sans garantie qu'elle soit appliquée en review/staging/prod à ce jour.

## Polish (P2)

- **P2-1** : aucun lien vers un classement ("leaderboard") depuis le hub ou l'historique quiz — occasion manquée de renforcer la boucle sociale/compétitive alors que le reste de la gamification (XP, niveaux) existe déjà.
- **P2-2** : pas de vérification explicite d'un rate-limit serveur pour le daily (1/24h) au-delà de la simple lecture de `quiz_attempts` du jour — comportement correct fonctionnellement mais pas un vrai verrou anti-triche (un attaquant pourrait rejouer le même quiz plusieurs fois dans la même journée sans blocage serveur, seul l'affichage `completedToday` change côté UI).
- **P2-3** : `components/education/quiz-player.tsx` et `gamification-system/components/special-challenges/quiz-challenge.tsx` implémentent chacun leur propre variante UI de "quiz runner" (3 implémentations distinctes au total avec `quiz-runner-client.tsx` en comptant la version vivante) — à consolider ou supprimer clairement pour éviter la confusion des futurs contributeurs.
- **P2-4** : le rapport `AUDIT_GENERATION_QUIZ.md` (qualité de génération IA — prompts marocains, vérification factuelle, variété des types de questions) reste largement non traité ; hors scope produit/UX de cet audit mais toujours d'actualité si l'objectif est d'améliorer la qualité du contenu généré par `lib/ai/content-generator.ts`.

## Effort estimé (S/M/L par gap)

| Gap | Effort |
| --- | --- |
| P0-1 — Supprimer ou rediriger `GET /api/teen/quiz/daily` vers `getDailyQuizForTeen` | S (0.5j) |
| P1-1 — Supprimer `education/quizzes` route + `quiz-player.tsx` (ou documenter "legacy, ne pas utiliser") | S (0.5-1j) |
| P1-2 — Décider du sort de `categories`/`history` GET (garder pour future API publique/mobile, ou supprimer) | S (0.5j, décision produit + suppression ou doc) |
| P1-3 — Vrai quiz multijoueur (runner partagé + synchronisation + UI dédiée) | L (5-8j) — nécessite conception (Supabase Realtime channel par duel, questions synchronisées, anti-triche, UI de résultat comparatif) |
| P1-4 — Mutualiser le calcul du bonus XP dans une fonction partagée | S (0.5j) |
| P1-5 — Compléter `tests/e2e/quiz.spec.ts` pour couvrir le chemin heureux sans dépendre d'un flag "seed opt-in" (seeder minimal dans le test lui-même ou fixture dédiée) | M (1-2j) |
| P1-6 — Garantir l'application de la migration 038 en CI/staging/prod (ou fixture de test dédiée indépendante) | S-M (1j) |
| P2-1 — Ajouter un lien leaderboard quiz | S (0.5j) |
| P2-2 — Rate-limit serveur explicite daily quiz | S (0.5j) |
| P2-3 — Consolider les 3 implémentations UI de quiz runner | M (1-2j) |

## Fichiers critiques à connaître

- `app/teen/quiz/page.tsx` — RSC vivant, plus de mock, charge 4 sources en parallèle
- `app/teen/quiz/quiz-hub-client.tsx` — rendu client du hub
- `app/teen/quiz/[id]/page.tsx` + `app/teen/quiz/[id]/quiz-runner-client.tsx` — runner réel, seul consommateur de `POST /api/teen/quiz/[id]` et `POST /api/teen/quiz/submit`
- `app/teen/quiz/history/page.tsx` — historique + stats réelles
- `lib/quiz/server.ts` — cœur logique (catégories, quiz du jour avec recommender + fallback curated, stats) — commentaire explicite "keep in sync with /api/teen/quiz/* routes" (l.4-7), déjà une dette assumée par l'équipe
- `app/api/teen/quiz/submit/route.ts` — re-notation serveur, XP RPC, signal de personnalisation, corrélation recommandation, no-repeat 7j
- `app/api/teen/quiz/daily/route.ts` — **doublon mort**, algorithme différent de celui réellement utilisé
- `app/api/teen/education/quizzes/route.ts` — **route legacy orpheline**, à supprimer ou isoler
- `components/education/quiz-player.tsx` + `components/education/index.ts` — **code mort complet**, 0 import réel
- `gamification-system/components/special-challenges/quiz-challenge.tsx` — **code mort complet**, 0 import réel
- `app/teen/quests/friend-defis/new/new-friend-defi-form.tsx:20` + `friend-defis-client.tsx:223-245` — seul point de contact "quiz + multi", cosmétique uniquement
- `app/api/teen/friend-challenges/route.ts` — backend générique de défis (pas spécifique au quiz)
- `app/api/cron/generate-daily-content/route.ts` — génération IA réelle, cohortes, sécurité contenu
- `app/admin/content/review/page.tsx` + `review-quiz-row.tsx` — modération humaine du contenu IA (pas un éditeur de création manuelle)
- `gamification-system/database/migrations/000_base_tables.sql:305-391` — `add_xp_to_user`, RPC XP canonique partagée par tout le système
- `gamification-system/database/migrations/038_quiz_seed_content.sql` — seed committée mais application non garantie hors dev manuel
- `tests/e2e/quiz.spec.ts` — existe (comble le P1 de l'audit de mai) mais skip le chemin heureux sans seed appliquée
