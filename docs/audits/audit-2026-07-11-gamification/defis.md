# Audit — Les défis de Nivy (solo / groupe / physique)

**Date :** 2026-07-11 · Branche `refonte/home-nav-lifestyle` · Lecture seule.
**Contexte :** suite à `docs/audits/audit-2026-07-03/gamification.md` (trouvaille N7 : deux moteurs
`user_challenges` vs `user_missions` non réconciliés). Aucun commit n'a touché
`features/gamification/`, `gamification-system/features/missions/`, `app/teen/quests/` ou
`app/teen/challenges/` depuis le 2026-07-03 (`git log` vérifié) : N7 n'a pas bougé. Cet audit va plus
loin que le 03/07 en traçant le **cycle E2E réel** (clic → complétion → XP crédité) de chaque surface,
pas seulement la source de données.

## Verdict

Sur les quatre familles de « défis » que l'app expose à un ado, **une seule fonctionne vraiment de bout
en bout aujourd'hui : le défi 1v1 entre amis** (`/teen/quests/friend-defis`), qui va de l'invitation à la
résolution par cron avec crédit XP réel — mais sans mise (bragging rights only) et avec une progression
purement auto-déclarée (bouton « +1 », aucun lien avec l'action réelle). Les **quêtes quotidiennes solo**,
qui sont pourtant la surface la plus visible du hub `/teen/quests`, sont cassées par un bug de routage
(la carte pointe vers la mauvaise page) ; le seul écran qui sait réellement les compléter (`/daily`)
éjecte un ado connecté vers un flux d'onboarding **parent** à cause d'un filtre `parent_id` mal scopé —
donc, concrètement, **aucun chemin UI ne permet à un ado de compléter et d'être récompensé pour une
quête quotidienne**. Les **défis physiques avec preuve** sont pires qu'« sur l'honneur » : la preuve
photo est bien exigée et bloquée en attente de validation, mais rien n'insère jamais cette soumission
dans la file de modération admin, donc l'XP promis n'arrive jamais. Il n'existe **aucun format « crew
battle »** à plusieurs (le vocabulaire existe dans le copy, la mécanique non) — les primitives
`group_actions` sont réservées au commerce (rides/food/events), pas à la gamification. Enfin, la
réconciliation N7 est **plus grave que documentée** : des triggers SQL font que la moindre complétion
d'un défi (`user_challenges`) ou le moindre gain d'XP fait automatiquement passer 2 à 3 « missions »
(`user_missions`) à `completed` en silence — elles s'affichent cochées sur `/teen/streak` avec une
récompense XP affichée, mais cette récompense n'est **jamais créditée** car aucune page n'appelle jamais
la fonction de réclamation. Ce n'est pas (encore) un double-crédit d'XP, c'est une promesse non tenue
prête à devenir un bug de multiplication d'XP le jour où quelqu'un branche un bouton « réclamer ».

## Tableaux par format

### Solo

| Surface | Contenu (table + seed/assignation) | Boucle E2E | Verdict |
| --- | --- | --- | --- |
| `/teen/quests` onglet « Quotidien » (hub principal) | `user_challenges` + `challenges_templates`, assignation à la lecture (`getDailyChallenges` → `assignDailyChallenges` si vide, moteur `QuestRecommender`/`selectChallengeTemplate` avec anti-répétition 7j + difficulté adaptative) — `features/gamification/actions.ts:270-496` | Carte cliquée → `questTarget("challenge", id)` renvoie **toujours** `/teen/defis-physiques` quel que soit `id`/catégorie (école/sport/créa) — `app/teen/quests/quests-hub-client.tsx:41-54,113-122`. Cette page ignore l'id et affiche une liste `physical_challenges` sans rapport. Aucun bouton « Valider » n'existe sur le hub lui-même. | **Cassé (routage).** Contenu réel, assignation réelle, mais aucun moyen de compléter *cette* quête depuis là où elle est montrée. |
| `/daily` (chrome public Navbar/Footer, lien depuis `/teen/streak` « Compléter pour maintenir la streak ») | Mêmes `user_challenges`, via `completeChallenge`/`skipChallenge` (`features/gamification/actions.ts:501-600`) avec UI de validation réelle (timer, texte, checklist, sélection photo) | `getMyTeens()` filtre `.eq('parent_id', user.id)` (`features/teens/actions.ts:82-96`) — scope **parent**. Un ado connecté a `auth.uid() = teens.id`, jamais un `parent_id` : la requête renvoie 0 ligne → `toast.error("Aucun profil enfant trouvé…")` → `router.push('/profile/enfants/ajouter')` (`app/daily/page.tsx:52-65`), un écran d'onboarding **parent**. | **Cassé (mauvais rôle).** La logique de complétion elle-même est correcte et crédite du XP réel via `add_xp_to_user`, mais un ado n'atteint jamais cet écran. |
| `/teen/streak` « dailyTasks » | `user_missions` via `getDailyMissions()` (`gamification-system/features/missions/actions.ts:96-101`), cron d'assignation quotidien réel (`app/api/cron/assign-missions/route.ts`, `assign_missions_for_teen`, 00:05 Casablanca) | Rendu **lecture seule** — `completed: m.status === "completed" \|\| m.status === "claimed"` (`app/teen/streak/page.tsx:56-61`), aucun bouton de complétion/réclamation dans `streak-client.tsx`. Le statut `completed` est en réalité mis à jour par des **triggers SQL** déclenchés par les actions de l'engine 1 (voir D4), pas par une action de l'ado sur cet écran. | **Théâtre UI.** Coché « fait » avec XP affiché, mais rien à cliquer et rien n'est jamais crédité (cf. D4). |
| `/teen/defis-physiques` — voir tableau Physique ci-dessous | | | |
| `/teen/aide-scolaire` | `teen_grades` (notes) | Câblage direct, hors format « défi » à proprement parler | Non audité ici (hors scope défis) |

### Groupe

| Surface | Contenu (table + seed/assignation) | Boucle E2E | Verdict |
| --- | --- | --- | --- |
| `/teen/quests/friend-defis` (1v1) | `friend_challenges`, créé via `POST /api/teen/friend-challenges` | Invite → `handleAccept`/`handleDecline` (`/api/teen/friend-challenges/[id]/accept`\|`/decline`) → progression auto-déclarée `POST …/progress` (`delta`, défaut 1, aucun contrôle serveur lié au `challenge_kind` réel — `app/api/teen/friend-challenges/[id]/progress/route.ts:46-58`) → cron horaire `resolve_friend_challenge_v2` (`app/api/cron/friend-challenge-resolve/route.ts`, `30 * * * *`) détermine le gagnant et notifie. Stake retiré (#206) : `xpReward` affiché = 0 pour les nouveaux défis. | **Fonctionne.** Seul format à plusieurs réellement bouclé. Progression = bouton « +1 progression » cliquable à volonté, sans lien vérifié avec l'action réelle (quiz/mission/sport) — honor system pur, mais sans enjeu XP donc risque faible. |
| Crew battle (N joueurs) | N'existe pas comme mécanique de jeu. `crews`/`get_user_crew`/`update_crew_stats` (migration `007_crews_system.sql`, `133_realityfix_update_crew_stats_xp_source.sql`) sont des stats sociales agrégées, pas un mode compétitif. | Le CTA « Défie un ami » du hub (`quests-hub-client.tsx:249-254`) renvoie vers `/teen/social?tab=crew` (liste de crew), pas vers un défi. Le copy de `/teen/quests/friend-defis` (« Affronte ton crew et prends la couronne ») suggère un mode crew-vs-crew qui n'existe pas. | **Théâtre.** Vocabulaire de gamification collective sans backend dédié. `group_actions` (migration 131) sert exclusivement au commerce collectif (rides/food/events/anniversaires), jamais à un défi. |

### Physique (preuve)

| Surface | Contenu (table + seed) | Boucle E2E | Verdict |
| --- | --- | --- | --- |
| `/teen/defis-physiques` | `physical_challenges` + `teen_physical_challenge_progress` (progression, preuve, validation) | `start` → `update` (+1 manuel) → `complete` **exige** `proofUrl` (`app/api/teen/sport/challenges/route.ts:288-362`, refus explicite si absent, comment canon §9 « no auto-validate ») → upload via `EvidenceUpload` (bucket privé `defi-proofs`) → ligne posée à `completed=true, validated=false, xp_earned=0`. Endpoint admin réel existe : `POST /api/admin/sport-challenges/[id]/validate` (`approve`/`reject`, crédite `add_xp_to_user` si approuvé) — bien gated (rôle admin/moderator), avec rollback si le crédit XP échoue. **Mais** : aucun code n'insère cette soumission dans `moderation_queue`, et aucune page admin ne liste `teen_physical_challenge_progress WHERE validated=false`. `app/admin/proofs/page.tsx` (la seule file de modération existante) ne lit que `moderation_queue` — vide pour ce cas. | **Cassé (backend orphelin).** La preuve est exigée, stockée, bien plus stricte que « sur l'honneur » — mais l'humain qui devrait la valider n'a **aucun écran** pour le faire. L'XP n'arrive jamais en pratique. |

## Trouvailles

**D1 [P0 — cassé].** Le hub `/teen/quests`, onglet « Quotidien », route toute carte de type `challenge`
vers `/teen/defis-physiques` indépendamment de la catégorie réelle (école/sport/créa) et de l'id.
`app/teen/quests/quests-hub-client.tsx:41-54` (`questTarget`) et `:113-122` (mapping `dailyChallenges` →
`type: "challenge"` systématique). La page de destination ignore l'id transmis et affiche une tout
autre liste (`physical_challenges`). Un ado qui clique une quête « école » ou « créa » atterrit sur des
défis sportifs sans rapport et ne peut pas compléter la quête qu'il a cliquée.

**D2 [P0 — cassé, rôle].** `app/daily/page.tsx:52-65` appelle `getMyTeens()`
(`features/teens/actions.ts:82-96`), qui filtre `teens.parent_id = auth.uid()` — un scope **parent**.
Pour une session ado, `auth.uid()` correspond à `teens.id`, jamais à un `parent_id` : la requête renvoie
toujours 0 ligne, déclenche `toast.error("Aucun profil enfant trouvé. Créez-en un d'abord !")` et
redirige l'ado vers `/profile/enfants/ajouter` — un écran d'onboarding conçu pour un parent qui ajoute un
enfant. C'est la **seule** page qui sait réellement compléter un `user_challenges` (bouton « Valider »,
formulaires de preuve, crédit XP réel via `add_xp_to_user`) ; combiné à D1, il n'existe **aucun chemin
UI accessible à un ado** pour terminer une quête quotidienne solo et être récompensé.

**D3 [P0 — cassé, pipeline orphelin].** `app/api/teen/sport/challenges/route.ts:288-362` exige une
preuve (`proofUrl`) pour marquer un défi physique complété et pose la ligne à
`validated=false, xp_earned=0`. L'endpoint de validation admin existe et fonctionne
(`app/api/admin/sport-challenges/[id]/validate/route.ts`, crédite `add_xp_to_user`, rollback si échec,
audit log). Mais **rien n'insère jamais** cette soumission dans `moderation_queue` (vérifié par grep :
aucune insertion `moderation_queue` référençant `physical_challenges`/`defi_proof` hors la doc canon), et
`app/admin/proofs/page.tsx:71-76` — la seule file de modération de l'app — ne lit que `moderation_queue`.
Le sous-dossier `app/admin/` ne contient aucune page dédiée aux `sport-challenges`. Résultat : la preuve
photo soumise par l'ado reste éternellement « en attente de validation modérateur » (message affiché par
`components/teen/physical-challenge-actions.tsx:111-117`) sans que personne ne la voie jamais.

**D4 [P0 — escalade de N7, promesse non tenue / risque de double-crédit dormant].** Deux triggers SQL
(`gamification-system/database/migrations/003_missions_system.sql:548-598`) font que **toute**
complétion de `user_challenges` (`on_challenge_complete_update_missions`) ou **tout** gain d'XP
(`on_xp_update_missions`, sur `user_xp`) appelle automatiquement `update_mission_progress()` pour les
templates seedés `daily_challenge` (+25 XP), `daily_challenges_all` (+50 XP), `daily_xp_50` (+30 XP),
`weekly_xp_500`, `monthly_xp_2000`, etc. (`003_missions_system.sql:141-150`). Une seule complétion de
défi (via `/daily`, cf. D2) peut donc faire passer 2 à 3 `user_missions` à `status='completed'` en
silence, sans action dédiée de l'ado. Ces missions s'affichent **cochées avec un montant XP** sur
`/teen/streak` (`app/teen/streak/page.tsx:56-61`, `completed: m.status === "completed" || m.status ===
"claimed"`) — mais `claimMissionReward`/`claimAllMissionRewards`
(`gamification-system/features/missions/actions.ts:239-296`, seules fonctions qui appellent le RPC
`claim_mission_rewards` qui crédite réellement l'XP) ne sont **jamais invoquées** par aucune page ou
composant de l'app (vérifié par grep, une seule occurrence = leur propre définition). Aujourd'hui donc :
pas de double-paiement réel (rien n'est crédité), mais une UI qui ment (coché + XP affiché = jamais payé)
et une architecture où brancher un bouton « Réclamer » — la suite logique évidente — ferait immédiatement
gagner 2 à 4× l'XP réel pour un seul effort.

**D5 [P1 — fonctionnel mais honor-system].** `/teen/quests/friend-defis` est le seul format à plusieurs
qui boucle réellement (création → invitation → accept/decline → progression → résolution cron horaire
→ notification, `app/api/cron/friend-challenge-resolve/route.ts`). Mais la progression
(`app/api/teen/friend-challenges/[id]/progress/route.ts:46-58`) est un simple `delta` accepté tel quel,
sans vérification serveur liée au `challenge_kind` (`quiz_battle`/`mission_race`/`physical_count` ne sont
jamais reliés à une vraie complétion de quiz/mission/défi physique) — le bouton « +1 progression »
peut être cliqué librement. Risque limité car le stake XP a été retiré (#206, bragging rights only).

**D6 [P1 — théâtre de vocabulaire].** Il n'existe aucun mode « crew battle » (défi à plusieurs, N > 2).
Les `crews` (migration `007_crews_system.sql`) sont des groupes sociaux avec stats agrégées
(`update_crew_stats`), pas une mécanique de compétition. Le copy de l'app (« Affronte ton crew et prends
la couronne », `friend-defis-client.tsx:280-283` ; CTA « Défie un ami » → `/teen/social?tab=crew`,
`quests-hub-client.tsx:249-254`) suggère une fonctionnalité crew-vs-crew qui n'a pas de backend. Les
primitives `group_actions`/`split_group_purchase` (migrations 131-145, cf. audit V6) sont exclusivement
utilisées pour le commerce collectif (rides, food, events, anniversaires, marketplace), jamais pour un
défi gamifié.

**D7 [P1 — statu quo confirmé].** N7 (deux moteurs `user_challenges` vs `user_missions`) n'a reçu aucun
commit depuis le 2026-07-03 (`git log` sur `features/gamification/`, `gamification-system/features/
missions/`, `app/teen/quests/`, `app/teen/challenges/` : dernier commit touchant ces zones = V11, début
juin). Renouvellement quotidien réel des deux côtés cependant : engine 1 se réassigne à la lecture
(`getDailyChallenges` → `assignDailyChallenges` si vide) et engine 2 a un cron dédié
(`app/api/cron/assign-missions/route.ts`, `assign_missions_for_teen`, 00:05 Casablanca) — un ado ne voit
donc **pas** toujours les mêmes défis, ce point précis de la question 1 n'est pas un problème.

## Priorités

**P0 (bloquant enfant) :**
1. D2 — corriger `getMyTeens()`/`/daily` pour un appelant ado (ou retirer `/daily` du parcours ado et
   réparer D1 à la place). Sans l'un des deux, zéro quête quotidienne solo n'est complétable.
2. D1 — router `questTarget("challenge", id)` vers un écran qui connaît réellement cette instance de
   `user_challenges` (idéalement une action inline sur la carte elle-même, cf. `daily-challenges.tsx`
   qui a déjà tout le code de validation, juste jamais monté sur `/teen/quests`).
3. D3 — brancher la soumission de preuve physique sur `moderation_queue` (comme le fait déjà
   `app/api/teen/feed/submissions/route.ts` pour les posts) ou construire une page admin dédiée qui
   liste `teen_physical_challenge_progress WHERE validated=false`.
4. D4 — trancher : soit exposer un vrai bouton « Réclamer » avec garde anti-double-crédit (vérifier que
   la source de progression n'a pas déjà payé l'XP sous-jacente), soit désactiver silencieusement
   l'affichage `xp` sur les `dailyTasks` de `/teen/streak` tant qu'aucune réclamation n'est possible
   (arrêter d'afficher une récompense qui ne sera jamais payée).

**P1 (important) :**
5. D5 — décider si la progression des friend-défis doit rester purement déclarative ou se brancher sur
   les vrais événements (quiz terminé, mission complétée) pour les `challenge_kind` qui le prétendent.
6. D6 — soit construire un vrai mode crew-battle, soit retirer le vocabulaire qui le laisse croire
   (copy « Affronte ton crew », CTA mal routé).
7. D7 — trancher la source de vérité unique missions/défis (reco du 03/07 toujours valable, effort L).

**P2 (polish) :** harmoniser le libellé « missions » (engine 2, invisible côté route dédiée) vs « défis »/
« quêtes » (engine 1, hub principal) une fois D1/D2 réglés — actuellement le mot « mission » ne vit plus
que dans du code mort côté UX.

## Effort estimé

| Gap | Effort |
| --- | ------ |
| D1 — routage carte défi quotidien | S (0.5-1 j) |
| D2 — `getMyTeens`/`/daily` scope ado | S-M (0.5-1 j selon option choisie) |
| D3 — brancher preuve physique sur file de modération | M (1-2 j) |
| D4 — décision claim UI + garde anti double-crédit, ou masquer la promesse | M (1-2 j) |
| D5 — lier progression friend-défis aux vrais événements | M (2-3 j, par `challenge_kind`) |
| D6 — crew battle réel ou retrait du copy | L si construit (3-5 j) / S si retrait copy |
| D7 — réconciliation moteurs (déjà chiffré L au 03/07) | L (2-3 j) |

## Fichiers critiques à connaître

- `app/teen/quests/quests-hub-client.tsx` — hub principal, bug de routage D1 (`questTarget`, l.41-54).
- `app/daily/page.tsx` + `features/teens/actions.ts:82-96` (`getMyTeens`) — bug de rôle D2.
- `components/gamification/daily-challenges.tsx` — le vrai composant de complétion (timer/texte/photo/
  checklist), fonctionnel mais monté seulement sur `/daily` (inaccessible à un ado).
- `app/api/teen/sport/challenges/route.ts` (exige preuve) + `app/api/admin/sport-challenges/[id]/
  validate/route.ts` (validation orpheline) + `app/admin/proofs/page.tsx` (file qui ne voit jamais ces
  soumissions) — pipeline preuve physique D3.
- `gamification-system/database/migrations/003_missions_system.sql:548-598` — triggers
  `on_challenge_complete_update_missions` / `on_xp_update_missions`, cœur de D4.
- `gamification-system/features/missions/actions.ts:239-362` — `claimMissionReward`/
  `claimAllMissionRewards`, jamais appelées côté UI.
- `app/teen/quests/friend-defis/friend-defis-client.tsx` + `app/api/cron/friend-challenge-resolve/
  route.ts` — le seul format à plusieurs qui fonctionne réellement.
- `app/api/cron/assign-missions/route.ts` (engine 2, cron réel) vs `features/gamification/
  actions.ts:310-496` (`assignDailyChallenges`, engine 1, réassignation à la lecture) — les deux moteurs
  se renouvellent bien chacun de leur côté, ce n'est pas la source du problème enfant.
