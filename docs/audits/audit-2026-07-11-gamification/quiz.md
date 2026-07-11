# Audit focalisé — Quiz : origine, adaptativité, récompense (2026-07-11)

**Branche:** refonte/home-nav-lifestyle
**Mode:** Read-only. Ne duplique pas `docs/audits/audit-2026-07-03/quiz.md` (solo câblé 4/5, multi 1/5, dette de doublons) — vérifie ce qui a changé et creuse création/volume/adaptativité/anti-triche, non traités en détail le 2026-07-03.

## Verdict (1 paragraphe)

Un ado de 13 ans **peut** jouer un quiz aujourd'hui et être récompensé en XP — le flow `/teen/quiz` → `[id]` → `submit` → `add_xp_to_user` est réel, re-noté côté serveur, et alimente le moteur de recommandation. Mais trois choses cassent la promesse « adaptatif, banque suffisante et fraîche » du cahier des charges : (1) **la banque manuelle est minuscule** — 9 quiz écrits à la main, 37 questions au total, un ado actif l'épuise en une à deux semaines ; (2) **« adaptatif » ne veut pas dire ce qu'on croit** — le `learning_style` (visuel/auditif/kinesthésique) capturé à l'inscription (V11) n'est lu NULLE PART dans la sélection de quiz, seul le coach IA Niv l'utilise pour son ton ; le vrai moteur `recommend_for_teen` adapte sur affinité de tags, niveau XP et cohorte scolaire, pas sur le style d'apprentissage ; (3) **le pipeline de génération IA quotidien existe et tourne réellement** (cron 1h du matin, jusqu'à 12 cohortes/jour) mais **contourne entièrement la file de modération humaine** censée protéger les mineurs : la file admin ne cherche que des codes `AI_%` avec `is_active=false`, alors que le cron insère avec un préfixe `DAILY_` et `is_active=true` — la file est donc vide en permanence et le contenu généré par IA part en direct sans jamais passer devant un humain. À cela s'ajoute une faille anti-triche non corrigée : rien n'empêche un ado de rejouer indéfiniment le même quiz déjà réussi pour farmer l'XP.

---

## 1. CRÉATION — comment un quiz naît-il ?

**Tables** : `public.educational_quizzes` (créée `gamification-system/database/migrations/022_pillars_system.sql:107-135`, questions embarquées en JSONB, pas de table `quiz_questions` normalisée réellement utilisée par ce flow) et `public.quiz_attempts` (`022_pillars_system.sql:141-163`). Colonnes ajoutées plus tard : `cohort_key`, `language`, `school_type`, `curriculum` (migrations 075-077, non lues en détail ici mais référencées par le code), `question_type_mix` / `quality_score` (`031_quiz_question_types.sql:81-98`).

**Trois canaux de création, aucune UI de création manuelle** :

1. **Seeds SQL figées, écrites à la main** — `022_pillars_system.sql:1399-1411` (3 quiz : `math_fractions` 3 questions, `french_conjugaison` 2 questions, `english_basics` 2 questions) et `038_quiz_seed_content.sql` (6 quiz × 5 questions : math, science, history, geography, french, culture générale). **Total : 9 quiz, 37 questions**, tous en français, contenu marocain (indépendance, géographie du Maroc). La migration 038 est explicitement documentée comme **opt-in** (`038_quiz_seed_content.sql:8-10` : « this migration is NOT applied automatically. Apply manually with psql ») — aucune garantie qu'elle soit appliquée en prod à ce jour.
2. **Génération IA automatique quotidienne, réelle** — `app/api/cron/generate-daily-content/route.ts`, déclenché par Vercel Cron `0 1 * * *` (`vercel.json:9`). Pour chaque cohorte (groupe de teens par grade/type d'école/curriculum/langue, plafonné à 12 cohortes/run — `route.ts:222`), appelle `ContentGenerator.generateQuiz()` (`lib/ai/content-generator.ts:257-318`, provider OpenAI ou Claude via `AI_PROVIDER` env, schéma structuré `QUIZ_SCHEMA:78-111`), passe par validation qualité + `FactualValidator` + `checkContentSafety` (double-vérifié : une fois dans le générateur, une fois avant insertion — `route.ts:257`), puis **insère directement** dans `educational_quizzes` avec `code: DAILY_${today}_${cohortLabel}_${Date.now()}` et **`is_active: true`** (`route.ts:271-291`). Rien de bloquant si l'IA échoue (`failedCount++`) ou si le contenu est jugé dangereux (`safetyBlockedCount++`, loggé mais pas persisté).
3. **File de modération admin — orpheline, ne voit jamais rien.** `app/admin/content/review/page.tsx:4-7,62-73` documente : « AI-generated quizzes (code LIKE 'AI\_%') with is_active=false are queued here for human review before going live ». Or **rien dans le code ne produit jamais un quiz avec ce préfixe et ce statut** — seul `app/api/admin/content/review/[id]/route.ts:73` en dépend (`quiz.code.startsWith("AI_")`), sans qu'aucun générateur n'écrive ce préfixe. Le cron réel écrit `DAILY_` + `is_active:true` (point 2 ci-dessus). **Conséquence : la file est vide en permanence, le contenu IA n'est jamais réellement examiné par un humain avant d'atteindre un mineur**, en contradiction avec le commentaire du fichier et l'intention documentée.

**Qui peut ajouter des questions aujourd'hui ?** Personne via une UI produit. Seuls (a) un développeur qui écrit/exécute une migration SQL, ou (b) le cron IA automatique. Pas d'admin UI de saisie manuelle de questions trouvée (grep `app/admin` pour "quiz" + "create"/"question" : rien au-delà de la file de review approve/reject).

## 2. VOLUME & FRAÎCHEUR

- **Banque manuelle statique** : 9 quiz, 37 questions, 6 matières (math, science, history, geography, french, culture) + 3 legacy (math_fractions, french_conjugaison, english_basics). À raison d'un quiz/jour (feature "quiz du jour"), un ado épuise le stock manuel unique en **~9 jours**, et le stock de questions distinctes en 1-2 semaines de jeu quotidien assidu.
- **Renouvellement réel via IA** : le cron génère au mieux **1 quiz par cohorte par jour**, plafonné à **12 cohortes/run** (`route.ts:222`, commentaire « protect token spend »). Si la base a plus de 12 cohortes distinctes (grade × type d'école × curriculum × langue), une partie des ados ne reçoit **aucun** nouveau contenu IA ce jour-là — pas de round-robin ni de compensation documentée pour les cohortes exclues.
- Le nombre de questions par quiz généré par IA dépend du modèle (schéma `QUIZ_SCHEMA` n'impose pas de minimum de questions — `content-generator.ts:89-104`, `required: ["question","correct"]` seulement, pas de `minItems` sur le tableau `questions`), donc le volume par quiz IA n'est pas garanti constant.
- Anti-répétition : `quiz_seen_history` empêche de revoir le **même** quiz déjà vu dans les 7 jours pour la sélection "quiz du jour" (`lib/quiz/server.ts:196-222`), et un cron dédié `quiz-seen-history-prune` (`vercel.json:11`, `30 2 * * *`) purge l'historique ancien — mais rien n'empêche de rejouer un quiz **déjà réussi** pour l'XP (voir §4).
- Fallback en cascade documenté et réel : `getDailyQuizForTeen` retombe sur `curated_content_library` (30 entrées admin-vetted, migration 067 — non relue ici) via `get_curated_content_fallback` RPC quand tout le pool actif est épuisé (`lib/quiz/server.ts:224-337`) — mécanisme solide pour ne jamais afficher un écran vide, mais ne résout pas le problème de fond : peu de contenu **neuf**.

## 3. ADAPTATIVITÉ — le learning_style influence-t-il vraiment la sélection ?

**Non. Le mot "adaptatif" est trompeur.** Traçage complet du chemin réel de sélection :

- `lib/quiz/server.ts:getDailyQuizForTeen` appelle le RPC `recommend_for_teen(p_teen_id, p_content_type='quiz', p_n=1, p_language)` (`server.ts:107-112`).
- Définition du RPC : `gamification-system/database/migrations/052_recommend_for_teen_v1.sql` (v1) puis `076_recommend_for_teen_v2.sql` (v2, ajoute un filtre `cohort_key`). **Aucune des deux versions ne référence `learning_style`** (vérifié par lecture intégrale des deux fichiers). Les facteurs réels de score sont :
  - `affinity_match` — chevauchement de tags entre `teen_interests`/`affinity_scores` et les tags du quiz (`052...sql:58-64,116-120`)
  - `novelty_bonus` — bonus si aucun signal comportemental récent (`:121-130`)
  - `context_fit` — bonus si le quiz dure ≤15 min (`:131`)
  - `difficulty_fit` — courbe gaussienne autour du **niveau XP** (`user_xp.current_level`), pas du style d'apprentissage (`:132`, `076...sql:160`)
  - `recently_seen_penalty` — pénalité 7 jours (`:134-136`)
  - v2 ajoute un filtre dur par `cohort_key` (grade/type école/curriculum/langue dérivés de `teens.grade_level, school_type, curriculum, primary_language` — `076_recommend_for_teen_v2.sql:75-80`)
- `teens.learning_style` (colonne écrite par `app/api/teen/onboarding/learning-style/route.ts:80`, issue d'un questionnaire de 4 questions à l'onboarding — `app/onboarding/learning-style/page.tsx:10-12` : « 4-question quiz; server scoring updates teens.learning_style + archetype ») **n'est lu que par deux endroits dans tout le repo** :
  - `lib/ai/context-engine.ts:89,175,284-285` — persona du **coach Niv** (« apprend mieux en mode visuel/auditif/... » injecté dans le prompt de conversation)
  - `app/api/teen/avatar-coach/route.ts:270,284-285` — même usage, ton de l'avatar-coach
  - **Zéro occurrence** dans `lib/quiz/server.ts`, `app/api/teen/quiz/*`, ou les migrations `recommend_for_teen`.
- Le format de question (`type: mcq | true_false | fill_blank | image | audio | matching`, ajouté par `031_quiz_question_types.sql`) n'est jamais filtré ou pondéré selon `learning_style` non plus — c'est une colonne de métadonnée (`question_type_mix`) posée mais non exploitée par le recommender.

**Conclusion Q3** : le cahier des charges §B1.1 note « learning_style câblé ✅ V11 » — c'est vrai au sens où la colonne existe et est *écrite* (V11 a livré le questionnaire d'onboarding), mais elle sert uniquement à personnaliser le **ton du coach conversationnel**, jamais la **sélection ou la difficulté des quiz**. « Quiz adaptatif par profil » n'est donc adaptatif que sur l'affinité de tags et le niveau XP (une vraie logique de recommandation, ce n'est pas un mensonge total), mais pas sur le style d'apprentissage au sens où le questionnaire d'onboarding le mesure.

## 4. BOUCLE COMPLÈTE — scoring → XP → progression, et anti-triche

- **Scoring serveur, fiable** : `app/api/teen/quiz/submit/route.ts:66-82` recharge `educational_quizzes.questions` (clé de réponse canonique), recalcule `correctCount`/`score` côté serveur — le client ne peut pas mentir sur le score.
- **XP réel via RPC canonique** : `submit/route.ts:135-148`, `add_xp_to_user(p_teen_id, p_xp_amount, p_source_type='quiz', ...)` — même RPC que tout le reste de la gamification (`000_base_tables.sql:305-391`). Bonus ×1.25 (≥80%), ×1.5 (≥90%) (`submit/route.ts:86-91`).
- **Progression visible** : `app/teen/quiz/history/page.tsx` via `getTeenQuizStats` (`lib/quiz/server.ts:415-434`) — total complété, score moyen, XP total, quiz parfaits. Le pilier "École" (`calculate_school_score`, `022_pillars_system.sql:650-727`) intègre le taux de réussite des quiz (30% du score) via un trigger `on_quiz_complete_update_school` (`022_pillars_system.sql:1127-1139`) — **c'est une vraie boucle transverse**, un quiz réussi améliore le score du pilier École et peut déclencher le bonus équilibre mensuel (`calculate_balance_bonus`, `022_pillars_system.sql:915-1012`).
- **Personnalisation** : signal `complete`/`abandon` pondéré par score envoyé au moteur de recommandation (`submit/route.ts:165-187`), corrélation avec `content_recommendations` (`:193-220`).
- **Pas de leaderboard, pas de streak dédié** — confirmé inchangé depuis le 2026-07-03 (grep `leaderboard`/`streak` dans `lib/quiz/server.ts` et `submit/route.ts` : 0 résultat).
- **ANTI-TRICHE — trouvaille nouvelle, non couverte le 2026-07-03** : **aucun verrou serveur n'empêche de rejouer indéfiniment un quiz déjà réussi pour refarmer l'XP.**
  - `quiz_attempts` (`022_pillars_system.sql:141-163`) n'a **aucune contrainte UNIQUE(teen_id, quiz_id)** — contrairement à `educational_tutorial_progress` (`UNIQUE(teen_id, tutorial_id)`, `022...sql:224`) ou `teen_club_memberships`.
  - `POST /api/teen/quiz/submit` ne vérifie jamais si `(teenId, quizId)` a déjà un attempt `passed=true` avant de créditer l'XP à nouveau (`submit/route.ts:93-148` — aucune requête de garde avant l'insert/XP).
  - `app/teen/quiz/[id]/page.tsx` n'a aucune logique bloquant l'accès à un quiz déjà réussi (grep "passed"/"already"/"attempt" sur ce fichier : 0 résultat).
  - Le seul frein est le "quiz du jour" recommandé qui applique un no-repeat 7 jours **pour la sélection automatique** — mais un ado peut naviguer directement vers n'importe quel `quiz_id` connu (via l'URL, ou via le hub qui liste tous les quiz actifs de la base sans filtre de cohorte — `lib/quiz/server.ts:23-29`, aucun filtre `cohort_key`/`language` contrairement au recommender v2) et le rejouer à volonté, récoltant l'XP à chaque passage.

## 5. MULTIJOUEUR — état réel

**Inchangé depuis le 2026-07-03 : absent.** Re-vérification par grep exhaustif "multiplayer", "duel", "battle", "vs", "rooms", "realtime", "channel", "presence" : le seul résultat lié au quiz est `quiz_battle`, une simple valeur d'énumération `challenge_kind` dans le système générique `friend_challenges` (`app/teen/quests/friend-defis/new/new-friend-defi-form.tsx`, `app/teen/quests/friend-defis/friend-defis-client.tsx`, `app/api/teen/friend-challenges/route.ts`). Aucun runner de quiz partagé, aucune synchronisation de questions, aucun canal Supabase Realtime, aucun socket, aucun matchmaking. Un ado qui choisit « Quiz Battle » obtient un compteur manuel `+1` partagé entre amis — **pas un quiz joué à deux**.

## 6. Verdict enfant (synthèse)

Un ado de 13 ans **peut** : ouvrir `/teen/quiz`, jouer un vrai quiz avec de vraies questions notées côté serveur, gagner de l'XP réel qui alimente son niveau et le score du pilier École, voir son historique et ses stats. Ce n'est **pas** une coquille vide.

Ce qui est **mort ou trompeur** :
- La file de modération humaine des quiz IA (jamais alimentée — bug de préfixe/statut).
- Le mot "adaptatif" appliqué au learning_style (le style d'apprentissage n'influence que le coach, pas les quiz).
- La possibilité de refarmer l'XP en boucle sur un quiz déjà réussi (pas de garde-fou).
- La profondeur du contenu écrit à la main (37 questions au total, épuisées en ~1-2 semaines).

Ce qui **manque** : toute infrastructure multijoueur, tout classement, tout streak dédié au quiz, toute UI d'auteur pour un humain (parent/enseignant/admin) qui voudrait ajouter des questions sans toucher au SQL.

---

## Trouvailles numérotées

- **Q1 — MODÉRATION CASSÉE (P0, sécurité contenu mineur)** : la file admin `app/admin/content/review/page.tsx:62-73` et l'API `app/api/admin/content/review/[id]/route.ts:73` ne cherchent que `code LIKE 'AI_%' AND is_active=false`. Le cron réel `app/api/cron/generate-daily-content/route.ts:271-291` insère avec `code: DAILY_${today}_...` et `is_active: true` **directement** — aucun code du repo n'écrit jamais de quiz avec préfixe `AI_`. La file de review est donc vide en permanence et **tout contenu généré par IA part en ligne sans jamais être vu par un humain**, alors que le commentaire du fichier affirme explicitement le contraire (« queued here for human review before going live »).
- **Q2 — FAUX "ADAPTATIF" (P1, écart cahier des charges vs réalité)** : `teens.learning_style` (V11) n'est lu dans aucun chemin de sélection/difficulté de quiz (`recommend_for_teen` v1 `052...sql` et v2 `076...sql` : 0 référence). Seuls `lib/ai/context-engine.ts:89,175,284-285` et `app/api/teen/avatar-coach/route.ts:270,284-285` le consomment, pour le ton du coach conversationnel uniquement. Le cahier des charges §B1.1 risque d'être lu comme « le quiz s'adapte au style d'apprentissage » — c'est faux.
- **Q3 — BANQUE MANUELLE MINUSCULE (P1)** : 9 quiz écrits à la main, 37 questions au total (`022_pillars_system.sql:1399-1411` = 7 questions, `038_quiz_seed_content.sql` = 30 questions), la seconde migration étant **opt-in / non garantie en prod** (`038...sql:8-10`). Un ado assidu épuise le stock manuel en 1-2 semaines.
- **Q4 — FARM XP SANS GARDE-FOU (P0, économie/anti-triche)** : `quiz_attempts` n'a pas de contrainte `UNIQUE(teen_id, quiz_id)` (`022_pillars_system.sql:141-163`) et `POST /api/teen/quiz/submit` (`submit/route.ts:93-148`) ne vérifie jamais un attempt `passed=true` préexistant avant de créditer l'XP. Un ado peut rejouer indéfiniment n'importe quel `quiz_id` connu et farmer l'XP à volonté — reconduit et précisé le P2-2 de l'audit du 2026-07-03 (le prior audit le classait en Polish ; avec la confirmation qu'il n'y a *aucun* verrou, ni client ni serveur, ni contrainte DB, il mérite un reclassement en P0/P1).
- **Q5 — GÉNÉRATION IA PLAFONNÉE ET NON ÉQUITABLE (P2)** : le cron quotidien (`vercel.json:9`, 1h du matin) plafonne à 12 cohortes/run (`generate-daily-content/route.ts:222`, "protect token spend") sans round-robin documenté — si la base compte plus de 12 cohortes distinctes, certaines n'obtiennent aucun contenu neuf certains jours, sans rotation équitable visible dans le code lu.
- **Q6 — AUCUNE UI DE CRÉATION MANUELLE (P2)** : aucun admin UI pour saisir/éditer des questions à la main (recherche exhaustive dans `app/admin`) — seule la file approve/reject (elle-même cassée, Q1) existe ; toute nouvelle question passe soit par une migration SQL développeur, soit par le cron IA.
- **Q7 — HUB SANS FILTRE COHORTE (P2)** : `getQuizCategoriesForTeen` (`lib/quiz/server.ts:23-29`) liste tous les `educational_quizzes` actifs sans filtrer par `cohort_key`/`language`, contrairement au recommender v2 qui, lui, filtre strictement (`076_recommend_for_teen_v2.sql:107-112`). Un ado peut donc parcourir et jouer des quiz IA générés pour d'autres cohortes (grade/école/curriculum différents) via le hub de navigation, même si le "quiz du jour" recommandé respecte le filtre.
- **Q8 — MULTIJOUEUR INEXISTANT (P1, confirmé sans changement)** : aucune infrastructure de duel/quiz à plusieurs — `quiz_battle` reste un simple label cosmétique sur le système générique `friend_challenges` (compteur `+1`), sans questions synchronisées, sans temps réel. Identique au constat du 2026-07-03.

## Priorités

**P0**
- Corriger le bug de préfixe/statut entre le générateur (`DAILY_`, `is_active:true`) et la file de modération (`AI_%`, `is_active:false`) — soit faire écrire le cron en `is_active:false` + préfixe `AI_` en attendant validation humaine (ralentit la fraîcheur mais restaure la sécurité), soit assumer et documenter que la modération humaine n'existe pas et renforcer les gardes automatiques (`checkContentSafety`, `FactualValidator`) en conséquence. Décision produit nécessaire : vitesse de fraîcheur vs sécurité du contenu pour mineurs.
- Empêcher le farm d'XP : ajouter une garde serveur dans `submit/route.ts` (vérifier un attempt `passed=true` existant, ou XP dégressif/nul sur replay) — la RPC `add_xp_to_user` et la table `quiz_attempts` n'ont aujourd'hui aucun garde-fou.

**P1**
- Décider et documenter honnêtement ce que "quiz adaptatif" veut dire : soit câbler `learning_style`/format de question dans `recommend_for_teen` (nouvelle version v3), soit retirer la mention "adaptatif par style d'apprentissage" du cahier des charges pour ne garder que "adaptatif par affinité/niveau/cohorte" (déjà vrai).
- Industrialiser le volume : la banque manuelle de 37 questions est un plancher, pas une solution — garantir l'application de la migration 038 en prod (déjà noté P1-6 le 2026-07-03) et/ou augmenter la fréquence/plafond du cron IA au-delà de 12 cohortes/jour si le budget de tokens le permet.
- Filtrer le hub de navigation (`getQuizCategoriesForTeen`) par `cohort_key`/`language` comme le fait déjà le recommender v2, pour cohérence.
- Multijoueur : toujours à construire de zéro (cf. effort L, 5-8j, déjà chiffré le 2026-07-03).

**P2**
- Round-robin documenté/équitable pour le plafond de 12 cohortes/run.
- UI admin de création manuelle de questions (au-delà du simple approve/reject).

## Fichiers critiques à connaître

- `app/api/cron/generate-daily-content/route.ts:150-380` — cron IA réel, cohortes, insertion directe `is_active:true`
- `lib/ai/content-generator.ts:78-111,257-318` — génération structurée, schéma quiz, validation qualité+factuelle+sécurité
- `app/admin/content/review/page.tsx:1-87` + `app/api/admin/content/review/[id]/route.ts:15,73` — file de modération **orpheline** (bug de préfixe/statut, Q1)
- `gamification-system/database/migrations/022_pillars_system.sql:107-163,1399-1420` — schéma `educational_quizzes`/`quiz_attempts`, seed initiale (7 questions), score pilier École, triggers
- `gamification-system/database/migrations/038_quiz_seed_content.sql` — seed principale (30 questions), **opt-in non garantie en prod**
- `gamification-system/database/migrations/052_recommend_for_teen_v1.sql`, `076_recommend_for_teen_v2.sql` — cœur du "adaptatif", aucune référence à `learning_style`
- `lib/quiz/server.ts:18-67,89-385` — hub (sans filtre cohorte), quiz du jour (recommender + fallback curated), aucune référence learning_style
- `app/api/teen/quiz/submit/route.ts:66-148` — scoring serveur, XP, **absence de garde anti-replay** (Q4)
- `app/api/teen/onboarding/learning-style/route.ts`, `app/onboarding/learning-style/page.tsx` — origine de `teens.learning_style`, jamais reconnectée au quiz
- `lib/ai/context-engine.ts:89,175,284-285`, `app/api/teen/avatar-coach/route.ts:270,284-285` — seuls consommateurs réels de `learning_style` (coach, pas quiz)
- `vercel.json:9-11` — planification des crons (génération 1h, prune quiz_seen_history 2h30)
- `app/teen/quests/friend-defis/*`, `app/api/teen/friend-challenges/route.ts` — seul point de contact "quiz + multi", cosmétique (Q8)
