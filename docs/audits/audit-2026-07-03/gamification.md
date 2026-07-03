# Audit — Gamification

**Date :** 2026-07-03 · Branche `refonte/home-nav-lifestyle` · Lecture seule.
**Périmètre :** `app/gamification/*` (11 routes), `app/teen/{quests,achievements,streak,coins,wallet,leaderboard,challenges,games,defis-physiques,aide-scolaire}`, `gamification-system/`, `features/gamification/`, `app/api/gamification/`, `lib/gamification/`, `components/gamification/`, `components/onboarding/gamification/`, `app/admin/gamification*`.

**Audits antérieurs lus (non re-découverts ici) :** `docs/audits/audit-2026-05-31/AUDIT-FEATURES-TEEN.md`, `docs/audits/audit-2026-06-02/AUDIT-FEATURES-CODE-VS-DB.md`, `docs/audits/AUDIT_LEVEL_UP_ET_DEFIS.md` (Jan 2025, pré-pivot, propose le rail XP→DH qu'on voit encore dans `xp-converter.ts`), `docs/GAMIFICATION_V2_EVOLUTION.md`, `docs/audits/orchestrator-2026-05/gamification.md`.

## Routes inspectées

- `app/gamification/{page,roue,boutique,crews,defis-physiques,aide-scolaire,parcours,missions,defis,collections,leaderboard}.tsx` — 11/11 lues intégralement.
- `app/teen/{quests,quests/[id],quests/friend-defis,quests/friend-defis/new,achievements,streak,coins,wallet,leaderboard,challenges,games,defis-physiques,aide-scolaire,avatar,social,crews,circles,passions,map}` — pages + clients échantillonnés.
- `lib/server/unified-quest-engine.ts`, `lib/server/teen-dashboard.ts`, `lib/xp-payment.ts`, `lib/payments/xp-converter.ts`.
- `features/gamification/{actions,index,schema,adaptive-difficulty,smart-challenge-assignment}.ts`.
- `gamification-system/index.ts`, `gamification-system/features/{missions,leaderboard,stats-dashboard,onboarding,mini-games}/actions.ts`.
- `components/dashboard/teen/sidebar.tsx`, `components/teen/dashboard/{mobile-nav,teen-dashboard-content}.tsx`, `components/onboarding/gamification/*`.
- `app/admin/gamification-setup/page.tsx`, `app/admin/gamification/scorecard/page.tsx`, `app/api/admin/run-migration/route.ts`.
- `docs/economy.md` (cross-référencé, pas répliqué).

## État actuel (résumé 5 lignes)

Les remédiations #201/#203/#205/#206/#208 (post-V6/V11) ont réellement corrigé la majorité des P0 documentés en mai-juin : les 11 routes `app/gamification/*` sont maintenant 100 % des `permanentRedirect` vers `/teen/*` (plus de doublon d'écran vivant), le dashboard ado n'affiche plus l'XP 3-4x, les friend-défis ne misent plus d'XP (« pour l'honneur »), le hub `/teen/quests` route chaque type de quête vers sa vraie page (fin du risque 404), et la nav mobile+desktop est unifiée en 5 piliers montés dans `app/teen/layout.tsx` (plus de nav absente hors dashboard). La dette structurelle réelle et non résolue est ailleurs : **deux moteurs « missions/défis quotidiens » distincts et non réconciliés** (`features/gamification/actions.ts` sur `user_challenges` vs `gamification-system/features/missions/actions.ts` sur `user_missions`), un **vrai leaderboard XP orphelin de toute page dédiée** (seul un leaderboard « créateurs de contenu » est exposé sous le nom « Classement »), et `docs/economy.md` qui décrit un modèle de coins et de routes qui n'existe plus (documentation en retard sur le code, pas l'inverse). Les mocks résiduels (avatar/skins, `app/teen/games`, quiz musical) sont désormais orphelins de nav plutôt que mis en avant, ce qui limite leur nocivité mais laisse du code mort visible.

## Niveau "pro" (1-5) avec justification

**Score : 3.5/5**

- **+** Consolidation de routing réellement terminée (pas juste documentée) : vérifié route par route, les 11 pages `/gamification/*` sont des stubs `permanentRedirect` + `robots:noindex`, sans logique dupliquée.
- **+** Le cœur du produit (XP = mérite, ne se convertit jamais) est maintenant respecté sur les surfaces vérifiées : `/teen/xp-value`, `/teen/wallet` (bandeau « ≈ DH » supprimé), friend-défis (stake retiré).
- **+** Dashboard et nav réellement simplifiés (5 piliers, un seul affichage par chiffre) — remédiation vérifiée dans le code, pas seulement dans un commentaire.
- **−** Deux backends « missions du jour » parallèles et vivants (`user_challenges` vs `user_missions`) — dette d'architecture non résolue, plus profonde qu'un problème de nommage.
- **−** Le vrai leaderboard XP (`gamification-system/features/leaderboard`) reste du code mort côté UI (seul `getUserRank` est utilisé, en aparté, sur `/teen/profile`) ; `/teen/leaderboard` reste un classement de créateurs de contenu étiqueté « Classement » sans distinction pour l'utilisateur.
- **−** Documentation économique (`docs/economy.md`) en dérive par rapport au code (dit coins=placeholder alors que `user_coins.balance` est lu en direct par `lib/server/teen-dashboard.ts`) — risque que la prochaine personne qui lit la doc reproduise une incohérence déjà corrigée.
- Pas un 4/5 car la dette de fond (deux moteurs de données, pas juste deux UI) reste un vrai risque de divergence future, mais nettement au-dessus d'un 2-3 vu l'ampleur des fixes vérifiés en dur.

## Données : statique/mocké vs API réelle

| Page | Source actuelle | API réelle dispo ? | Connecté ? |
| ---- | --------------- | ------------------- | ---------- |
| `app/gamification/*` (11 routes) | Aucune — stubs `permanentRedirect` | n/a | n/a (design correct) |
| `app/teen/quests` (hub) | `getUnifiedQuests()` (Supabase: `educational_quizzes`, `physical_challenges`, `passion_tutorials`, events) + `getDailyChallenges()` (`user_challenges`) | Oui | Connecté, mais `xp_reward: 500` events et `status: "available"` hardcodés (lib/server/unified-quest-engine.ts:52,74,95,110) |
| `app/teen/quests/[id]` | Supabase `quests`/`daily_challenges` (tables legacy quasi vides) | Oui (mais tables peu utilisées) | Route de repli seulement — les vraies cartes ne pointent plus ici (`questTarget()`) |
| `app/teen/quests/friend-defis` | Supabase `friend_challenges` | Oui | Connecté, stake XP retiré (#206) |
| `app/teen/defis-physiques` | Supabase `physical_challenges` + `teen_physical_challenge_progress` | Oui | Connecté |
| `app/teen/aide-scolaire` | Supabase `teen_grades` + XP agrégé | Oui | Connecté |
| `app/teen/streak` | `getLifetimeStats`, `getActivityHistory`, `getDailyMissions` (gamification-system) | Oui | Connecté ; carte « protection streak » retirée proprement (#201) au lieu d'un mock |
| `app/teen/leaderboard` | Supabase `creator_monthly_stats` | Oui | Connecté, mais c'est un classement créateurs, pas le leaderboard XP |
| `app/teen/coins` | Redirect vers `/teen/wallet` | — | Le mock `totalCoins=1250` a été retiré (commentaire dans le fichier est lui-même obsolète, cf Gaps) |
| `app/teen/wallet` (Coins/Boutique/Badges/Épargne/Historique) | `user_coins.balance`, `get_shop_rewards`, `user_achievements`, `savings_goals` | Oui | Connecté, `TwinCurrencyGauge` sans conversion XP→DH |
| `app/teen/xp-value` | `/api/payments/xp` (xp_transactions) | Oui | Connecté, section ROI/conversion supprimée (#206) |
| `app/teen/achievements` | Redirect vers `/teen/wallet?tab=badges` | — | Cible réelle (onglet Badges connecté à `user_achievements`) |
| `app/teen/avatar` | Mood: `/api/teen/avatar` (réel) ; Skins: tableau `SKINS` en dur | Partiel | Mood connecté, skins 100% mock (déblocage XP jamais implémenté) |
| `app/teen/games` | `getMiniGameTypes`/`getUserGameStats` (gamification-system/mini-games) | Oui | Données réelles mais tous les CTA sont `disabled` (« bientôt ») |
| `app/daily` | Système parallèle (`gamification-system/features/missions`) + chrome public (`Navbar`/`Footer`) | Oui | Connecté mais hors écosystème `/teen/*`, orphelin de toute nav teen sauf le lien streak |
| `app/admin/gamification-setup` | Liste statique de 19 migrations + `/api/admin/run-migration` | Ring-fencé (super_admin + env flag), ne s'exécute jamais réellement | UI trompeuse (bouton « Play ») pour un endpoint qui renvoie toujours une erreur d'instruction |
| `app/admin/gamification/scorecard` | `/api/admin/scorecard` via `lib/analytics/scorecard.ts` | Oui | Connecté, dégradation propre si indisponible |
| `components/onboarding/gamification/*` | `gamification-system/features/onboarding` (RPC `init_onboarding_progress`, etc.) | Oui | Connecté ; bonus finaux « +50 Coins / 2 Badges » affichés en dur, non vérifié si réellement crédités (à vérifier séparément) |

## Cohérence avec le reste de l'app

**Doublons missions/défis/quêtes — le vrai problème est la donnée, pas juste le libellé.**
Deux moteurs vivants et non réconciliés cohabitent :
- `features/gamification/actions.ts` (756 lignes) → tables `user_challenges`, `challenges_templates`, `user_streaks`, `xp_transactions` → consommé par `app/teen/quests/page.tsx`, `app/daily/page.tsx`, `components/gamification/daily-challenges.tsx`.
- `gamification-system/features/missions/actions.ts` (533 lignes) → table `user_missions` → consommé par `app/teen/streak/page.tsx`, `lib/server/teen-dashboard.ts`, `lib/server/unified-quest-engine.ts` (`getDailyMissions` importé ligne 4).

Concrètement : la page `/teen/quests` (onglet Quotidien) lit `user_challenges` via `getDailyChallenges()`, mais le hub calcule aussi ses quêtes agrégées via `getTeenDashboardData()` qui lui-même appelle en interne `getDailyMissions().catch(...)` sur `user_missions` (`lib/server/teen-dashboard.ts:206`). Deux tables différentes alimentent la même page sans qu'aucun code ne les réconcilie ou ne documente lequel est la source de vérité. C'est la cause structurelle du vocabulaire flottant « défi/quête/mission » constaté dans les audits précédents — ce n'est pas qu'un problème de libellé UI, il y a effectivement deux pipelines de données distincts.

**Concept overlap (visible utilisateur) :**
- `missions` : n'a plus de route dédiée (`/gamification/missions` redirige vers `/teen/quests`). Le mot survit uniquement dans le code backend (`user_missions`, `getDailyMissions`) et dans la carte quick-access du streak (« DAILY_TASKS » alimenté par `getDailyMissions`).
- `quêtes` (`/teen/quests`) : hub unifié agrégeant quiz + défis physiques + tutoriels passion + events + défis quotidiens. Onglets : Quotidien / Cerveau / Corps / Créa / Défis amis.
- `défis-physiques` (`/teen/defis-physiques`) : même table `physical_challenges` que l'onglet « Corps » du hub quests — présentée sur deux écrans avec deux UI différentes (toujours vrai, cf. `unified-quest-engine.ts:59-78` qui interroge `physical_challenges` en parallèle de la page dédiée).
- `challenges` (`/teen/challenges`) : simple redirect vers `/teen/quests?tab=body`, donc alias du point précédent.
- `aide-scolaire` : concept séparé et cohérent (notes scolaires, `teen_grades`), pas de recoupement avec quêtes/défis.
- `quests`/`games` : `/teen/games` (mini-jeux : quiz musical, etc.) est un système encore distinct (`gamification-system/features/mini-games`), désormais désorphelinisé de la nav principale mais toujours 100% désactivé (`disabled title="Bientôt disponible"` dans `games-client.tsx:134,171`).
- Lien cassé résiduel : le CTA « Défie un ami » du hub quests (`quests-hub-client.tsx:247-252`) pointe vers `/teen/social?tab=crew` (liste de crews) et non vers `/teen/quests/friend-defis/new` (la vraie création de défi 1v1) — incohérence déjà notée en mai, toujours vraie.
- Documentation : `docs/GAMIFICATION_V2_EVOLUTION.md` (déc. 2024) décrit une architecture `app/gamification/{missions,roue,defis,boutique,crews,leaderboard,collections}` qui n'existe plus telle quelle — document obsolète mais toujours dans `docs/`, à marquer explicitement périmé.

**XP & coins coherence :**
- Le rail de paiement hybride XP→DH est désormais **single-sourced** : `lib/xp-payment.ts` dérive son taux de `lib/payments/xp-converter.ts` (`XP_TO_DH_RATE = Math.round(1 / XP_DH_PER_XP)`), avec un commentaire explicite expliquant que l'ancien hardcode à 100 était la source de la divergence 10-vs-100. Bon point : cette dette précise (3 taux contradictoires) est corrigée.
- Reste une tension de fond, hors scope strict de ce rapport (domaine `rewards.md`) : ce rail « payer avec de l'XP » coexiste encore avec la doctrine affichée partout ailleurs (« XP ne se convertit jamais », `xp-value/page.tsx:122`). Cette tension architecturale (deux vérités simultanées : XP=mérite non convertible sur les écrans wallet/xp-value, XP=monnaie hybride sur `/api/payments/hybrid` et `/teen/shop/checkout`) mérite un arbitrage produit, mais le point technique (taux unique) est réglé.
- Coins : réellement câblés (`user_coins.balance`, lu en direct par `lib/server/teen-dashboard.ts:219`), contrairement à ce que dit encore `docs/economy.md` §2.2 (« not yet wired », « walletData.coins = 0 »). **Doc en dérive, à corriger** — un lecteur de `docs/economy.md` aujourd'hui reproduirait une conception dépassée.
- Le commentaire de tête de `app/teen/coins/page.tsx` cite lui aussi ce même passage obsolète de `docs/economy.md` — la fausse information s'est propagée dans un second fichier.

## Gaps bloquants (P0)

Aucun P0 nouveau et non documenté n'a été trouvé — les P0 des audits précédents (XP misée en friend-défis, dashboard sur-affiché, nav mobile absente hors accueil, hrefs de quête menant à des 404, `?tab=achievements` inexistant) sont **vérifiés corrigés dans le code actuel**. Le seul point à statut P0 aujourd'hui est un doute de fond plutôt qu'un bug isolé :

- **[DETTE] Deux moteurs de missions/défis quotidiens non réconciliés** (`user_challenges` via `features/gamification/actions.ts` vs `user_missions` via `gamification-system/features/missions/actions.ts`), tous deux appelés en parallèle par le même hub `/teen/quests` (directement + via `getTeenDashboardData`). Risque réel de double-comptage XP ou d'incohérence de progression si un jour les deux tables se peuplent en parallèle pour un même teen. Fichiers : `lib/server/unified-quest-engine.ts:4`, `lib/server/teen-dashboard.ts:206`, `features/gamification/actions.ts`, `gamification-system/features/missions/actions.ts:322`.

## Gaps importants (P1)

1. **[DETTE/CASSÉ]** Lien « Défie un ami » du hub quests pointe vers `/teen/social?tab=crew` au lieu de `/teen/quests/friend-defis/new` — `app/teen/quests/quests-hub-client.tsx:247-252`.
2. **[MANQUANT vs standard pro]** Aucune page ne rend le vrai leaderboard XP (`get_leaderboard`, `get_city_leaderboard`, `get_friends_leaderboard`) — seul `getUserRank` est consommé, en aparté, par `app/teen/profile/page.tsx:6,55`. `/teen/leaderboard` reste un classement de créateurs de contenu étiqueté « Classement », sans clarification pour l'utilisateur. `gamification-system/features/leaderboard/actions.ts` est en grande partie du code mort côté UI.
3. **[DETTE/doc]** `docs/economy.md` en dérive : décrit coins comme non câblés, cite des routes mortes (`app/gamification/defis/*`, `app/gamification/wheel/*`, `app/gamification/events/*`) comme si elles étaient vivantes alors qu'elles sont toutes des redirects. À mettre à jour dans le même esprit que `docs/GAMIFICATION_V2_EVOLUTION.md` (marquer explicitement obsolète ou réécrire).
4. **[CASSÉ mineur]** Le commentaire de `app/teen/coins/page.tsx` cite l'affirmation obsolète de `docs/economy.md` — propagation de fausse information dans le code lui-même (pas d'impact fonctionnel, juste trompeur pour le prochain développeur).
5. **[MANQUANT]** `/teen/games` reste 100% désactivé (« bientôt ») malgré des données réelles (`getMiniGameTypes`/`getUserGameStats`) — actuellement désorphelinisé de la nav (bon point, moins visible) mais reste du code mort exposé en deep-link.
6. **[DETTE]** `app/daily/page.tsx` est un troisième système « quêtes du jour » utilisant le chrome public (`Navbar`/`Footer`) au lieu du layout `/teen/*` — lien encore présent depuis `/teen/streak` (« Compléter pour maintenir la streak », `streak-client.tsx:180`) vers un écran visuellement incohérent avec le reste de l'app teen.
7. **[MOCK]** `/teen/avatar` : skins 100% mock (`SKINS` en dur, `unlocked: false, cost: 500/1200/2500` jamais fonctionnel) — commentaire l.19 admet « le déblocage réel par XP arrive avec l'économie skins » (jamais livré). Mood en revanche est réel.
8. **[MANQUANT]** Bonus onboarding « +50 Coins / 2 Badges » (`components/onboarding/gamification/onboarding-missions-preview.tsx:194,200`) affiché en dur — non vérifié dans cet audit si `syncToUser`/RPC de fin d'onboarding crédite réellement ce montant exact ; à vérifier séparément (risque de promesse non tenue si jamais désynchronisé).

## Polish (P2)

1. `app/admin/gamification-setup/page.tsx` : le bouton « Play » et le message de succès simulé donnent l'illusion qu'une migration peut s'exécuter depuis l'UI, alors que `/api/admin/run-migration` renvoie toujours une erreur d'instruction (par design, ring-fencé). UX trompeuse pour l'admin, pas un risque sécurité (bien gated : super_admin + env flag + 404 sinon).
2. Terminologie « parcours » toujours partagée entre `/teen/passions` (redirect → quests?tab=creative) et `/teen/pathways` (orientation carrière) — non retesté en profondeur ici mais confirmé toujours présent dans le code (`app/teen/passions/page.tsx`).
3. `xp_reward: 500 // Fixed for events` et `status: "available"` toujours hardcodés dans `getUnifiedQuests()` pour quiz/défis/passion (`lib/server/unified-quest-engine.ts:52,74,95,110`) — la progression réelle (`teen_physical_challenge_progress`, statut quiz) n'est pas reflétée dans le hub.
4. Deux formules de calcul de niveau XP dupliquées mais **désormais identiques** (`gamification-system/features/stats-dashboard/actions.ts:704-709` et `lib/server/teen-dashboard.ts:82-93`, même croissance `100*level*1.5`) — dette de duplication de code sans risque d'incohérence de valeur actuellement, à mutualiser en un seul helper.
5. `gamification-system/features/mini-games` (quiz musical) reste un second moteur de quiz parallèle à l'éducatif (`educational_quizzes`), toujours sans UI dédiée exposée.

## Effort estimé (S/M/L par gap)

| Gap | Effort |
| --- | ------ |
| P0 — Réconcilier ou clarifier `user_challenges` vs `user_missions` (choisir une source, migrer/déprécier l'autre) | L (2-3 j) |
| P1.1 — Corriger le lien « Défie un ami » | S (0.5 j) |
| P1.2 — Décider du sort du leaderboard XP (page dédiée ou retrait du code mort) + renommer `/teen/leaderboard` | M (1-2 j) |
| P1.3 — Réécrire `docs/economy.md` (coins réels, routes mortes retirées) | S (0.5-1 j) |
| P1.4 — Corriger le commentaire obsolète de `app/teen/coins/page.tsx` | S (< 0.5 j) |
| P1.5 — Retirer ou finir `/teen/games` | M (1-2 j selon décision produit) |
| P1.6 — Aligner `app/daily` sur le layout `/teen/*` ou le retirer | M (1 j) |
| P1.7 — Trancher l'économie des skins avatar (coins/DH réels ou retrait de la promesse XP) | M (1-2 j) |
| P1.8 — Vérifier le crédit réel des bonus onboarding (+50 Coins/2 Badges) | S (0.5 j, vérification uniquement) |
| P2.1 — Corriger l'UX trompeuse de `gamification-setup` (retirer le faux bouton Play ou expliciter le no-op) | S (0.5 j) |
| P2.2-P2.5 — Divers polish (xp_reward hardcodés, dédup formule niveau, quiz musical) | S chacun |

## Fichiers critiques à connaître

- `lib/server/unified-quest-engine.ts` — moteur d'agrégation des quêtes (quiz/défis/passion/events), tri déterministe (#208), mais `xp_reward`/`status` encore hardcodés par endroits ; importe `getDailyMissions` (2e moteur).
- `features/gamification/actions.ts` — moteur « défis quotidiens » réel n°1 (`user_challenges`), consommé par `/teen/quests` et `/daily`.
- `gamification-system/features/missions/actions.ts` — moteur « missions » réel n°2 (`user_missions`), consommé par `/teen/streak` et `lib/server/teen-dashboard.ts`.
- `gamification-system/index.ts` — point d'entrée du SDK 19-modules (achievements, leaderboard, shop, VIP, mini-games, onboarding...) ; source de vérité pour tout sauf les défis quotidiens.
- `lib/payments/xp-converter.ts` + `lib/xp-payment.ts` — rail de conversion XP↔DH désormais single-sourced (taux unique dérivé), mais coexiste avec la doctrine « XP ne se convertit jamais » ailleurs (cf. `rewards.md` pour le fond du sujet).
- `app/teen/quests/quests-hub-client.tsx` — hub canonique, `questTarget()` route chaque type vers sa vraie page (fix confirmé), mais lien friend-défis cassé (l.247-252).
- `app/teen/wallet/wallet-hub-client.tsx` — hub économie canonique (Coins/Boutique/Badges/Épargne/Historique), `TwinCurrencyGauge` = référence pédagogique XP≠coins à généraliser.
- `components/dashboard/teen/sidebar.tsx` + `components/teen/dashboard/mobile-nav.tsx` — nav 5 piliers unifiée desktop/mobile (#203), montée dans `app/teen/layout.tsx`.
- `components/teen/dashboard/teen-dashboard-content.tsx` — dashboard post-#205, dédup des stats above-the-fold confirmée en lisant le code (pas seulement le commentaire).
- `docs/economy.md` — en dérive par rapport au code actuel (coins, routes mortes citées comme vivantes) ; `docs/GAMIFICATION_V2_EVOLUTION.md` — architecture décrite n'existe plus, à marquer obsolète.
- `app/admin/gamification-setup/page.tsx` + `app/api/admin/run-migration/route.ts` — ring-fencé correctement mais UX trompeuse (no-op déguisé en action).
