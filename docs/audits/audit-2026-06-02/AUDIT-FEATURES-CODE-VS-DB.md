# Audit features Nivy — code × base réelle (2026-06-02)

> **Méthode.** Audit multi-agents (8 sous-audits) croisant le code (routes / UI / server
> actions) avec l'état réel de la base live `nivy` (`imchornjvmgmaovhypco`).
>
> **⚠️ Correction importante.** Un premier relevé via `pg_stat_user_tables.n_live_tup`
> (estimations) indiquait la plupart des catalogues à **0 ligne**. C'était **faux** : ces
> estimations étaient périmées (pas d'`ANALYZE` après chargement). Les `COUNT(*)` exacts
> montrent que **le contenu EST seedé**. Les verdicts « WIRED-EMPTY → seeder la table » du
> premier passage sont donc en grande partie **erronés** et ont été corrigés ici. Les
> constats de *code* (câblage, redirects, mocks, bugs) restent valides.

---

## 1. Pourquoi « Jouer » est vide — réponse directe

Le raccourci **Jouer → `/teen/quests`** (`quick-access-grid.tsx:34`, `mobile-nav.tsx:53`).
La page (`app/teen/quests/page.tsx`) charge `getUnifiedQuests()` + `getDailyChallenges()` + `getTeenXP()`.

**Le contenu cœur EST présent en base :** `educational_quizzes` = **9 actifs**,
`physical_challenges` = **9 actifs**. Les requêtes de `getUnifiedQuests()`
(`unified-quest-engine.ts:37-78`) n'ont **aucun filtre par ado** (`is_active=true` + `limit`),
donc elles renvoient ~5 cartes (3 quiz + 2 défis) pour **tout ado connecté**.

L'onglet par défaut est `daily` (`quests-hub-client.tsx:96`). Sa logique :
`dailyChallenges.length > 0 ? … : quests.slice(0,6)`. Or `getDailyChallenges` renvoie un
`ActionResult` (objet `{success,data}`, **pas un tableau**) ⇒ `.length` = `undefined` ⇒ on
retombe **toujours** sur `quests.slice(0,6)`. Donc l'onglet `daily` doit afficher 5 cartes.

`getUserRole()` (qui laisse passer la page) et `getUnifiedQuests()` utilisent **le même**
client cookie `@/lib/supabase/server`. Donc si la page s'affiche, l'auth est valide dans la
même requête et `getUnifiedQuests` **ne retourne pas `[]`**. Le happy-path est sain.

> **✅ Vérifié en live (2026-06-02, session ado réelle, localhost:3000).** `/teen/quests?tab=daily`
> **affiche bien 5 cartes** (Les Fractions +30, Conjugaison +25, English Basics +25 → quiz ;
> 100 Pompes +75, 10 Pompes +20 → défis). La page **fonctionne**. MAIS la console crachait une
> **erreur d'hydratation `<a>` imbriqué dans `<a>`** sur chaque `DefiCard` (bug **B6** ci-dessous) —
> corrigé et re-vérifié : console propre après fix, 5 cartes intactes.

**Conclusion : « Jouer » vide n'est PAS un manque de données ni un bug de logique du
happy-path.** Causes réalistes, par ordre de probabilité :

1. **Chunks périmés (service-worker / build dev)** — problème récurrent documenté dans ce
   repo. Un vieux chunk rend une version antérieure du hub (d'avant les seeds). → **Hard
   refresh + désinscrire le SW + rebuild** (`Ctrl+Shift+R`, ou DevTools → Application →
   Service Workers → Unregister, ou supprimer `.next/` et relancer).
2. **Onglet pilier réellement vide** — si tu étais sur **Créa** : `passion_tutorials` = **0**
   (vraiment vide). Sur **Social** : `events` = 1 total mais **0 futur** ⇒ pilier vide.
   (Cerveau et Corps, eux, ont du contenu.)
3. **Fragilités code latentes** (à corriger par robustesse, voir §4 bugs B1/B4/B5).

> **Pour trancher définitivement :** ouvre `/teen/quests?tab=daily` connecté en ado, console
> ouverte. Si tu vois 5 cartes → c'était un chunk périmé. Si tu vois l'empty-state « Aucune
> quête quotidienne » → `getUnifiedQuests` renvoie `[]` (session serveur sans user). Si tu
> vois un écran d'erreur → exception remontée (manque de `.catch`, bug B4).
> Je peux piloter l'app en live pour confirmer si tu me donnes l'URL dev + une session ado.

---

## 2. Verdict global (corrigé)

| Verdict | Sens | ~Nombre |
|---|---|---|
| **DONE / fonctionne** | codé, câblé, données présentes | ~22 |
| **REDIRECT** | la route ne fait que rediriger (par design) | 17 |
| **EMPTY-BY-USE** | câblé OK, vide car données générées par l'usage (pas un manque de seed) | ~18 |
| **SEED-DEMO manquant** | vraiment vide, à remplir pour la démo/beta | 5 |
| **MOCK** | UI en dur, non câblée | 4 |
| **BROKEN** | bug réel vérifié | 3 |

**Diagnostic corrigé : la dette n'est PAS « tout seeder ».** Les catalogues sont seedés. Le
reste à faire est **petit et ciblé** : 3 bugs réels + 5 seeds de démo + vérifier les flux
d'écriture + des décisions produit sur les surfaces mortes.

### Catalogues SEEDÉS (à ne PAS reseeder — corrige le 1er passage)

`educational_quizzes`=9 · `quiz_questions`=7 · `physical_challenges`=9 · `passion_paths`=5 ·
`mini_game_types`=6 (+`music_quiz_questions`=10, `memory_game_cards`=16) ·
`mission_templates`=30 · `achievements`=63 · `shop_rewards`=26 · `reward_categories`=8 ·
`xp_shop_items`=5 · `collectible_items`=20 · `collection_sets`=4 · `wheel_segments`=12 ·
`vip_tiers`=7 · `career_pathways`=5 · `notification_templates`=25. Intégrité OK
(`user_achievements`=252, **0 orphelin** vs `achievements`).

### Vraiment VIDES

- **SEED-DEMO manquant :** `passion_tutorials`=0 (Créa) · `events` futurs=0 (Social) ·
  `crews`=0 · `sport_clubs`=0 · `feed_posts`=1 (feed quasi vide).
- **EMPTY-BY-USE (normal, se remplit à l'usage) :** `quiz_attempts`, `friendships`,
  `friend_requests`, `direct_messages`, `mentor_sessions`, `bookings`, `ride_bookings`,
  `food_orders`, `savings_goals`, `parent_chores`, `teen_grades`, `teen_creations`,
  `user_missions` (instances), `user_purchases`, `coin_transactions`, `user_vip_status`,
  `teen_interests`.

---

## 3. Bugs réels vérifiés (corriger en priorité)

| # | Bug | Preuve | Impact | Fix |
|---|---|---|---|---|
| **B1** | `getTeenDashboardData` sélectionne **6 colonnes inexistantes** sur la vue `teen_full_profile` (`full_name, interests, coins_earned, coins_topup, streak, city`) | `teen-dashboard.ts:182` ; vue = `id, primary_parent_id, first_name, last_name, pseudo, avatar_url, level, title, title_icon, coins_balance, total_xp` | PostgREST 400 → `teenProfile=null` → **pilier Social mort** + `interests`/`streak` du dashboard à 0 | Corriger le `.select()` aux colonnes réelles ; dériver `interests`/`streak` de leurs vraies sources |
| **B2** | `.from('activities')` — table **inexistante** (la vraie est `user_activities`, mig 018) | `api/teen/activities/route.ts:26` **et** `api/teen/quests/complete/route.ts:198` | `/teen/activity` toujours vide + la complétion de quête ne logge pas l'activité | Remplacer `activities` → `user_activities` (+ aligner colonnes) aux 2 endroits |
| **B3** | `/teen/achievements` & `/gamification/collections` redirigent vers `/teen/wallet?tab=badges`, mais `WALLET_TABS` n'a **pas** d'onglet `badges` | `achievements/page.tsx:8`, `collections/page.tsx:12` vs `wallet-hub-client.tsx:74` (`coins/shop/savings/history`) | « Mes Achievements » atterrit sur l'onglet Solde → **252 badges invisibles** | Ajouter un onglet `badges` au wallet (lire `user_achievements`) OU repointer vers une vraie page |
| **B4** | `getUnifiedQuests()` est le **seul** appel du `Promise.all` **sans** `.catch()` | `quests/page.tsx:38` | Toute exception vide les 4 piliers d'un coup (fragilité « Jouer ») | `getUnifiedQuests().catch(() => [])` |
| **B5** | Onglet `daily` teste `dailyChallenges.length` sur un `ActionResult` (objet) | `quests-hub-client.tsx:113` vs `getDailyChallenges` → `ActionResult<UserChallenge[]>` | `.length` toujours `undefined` ⇒ les vrais défis du jour ne s'affichent **jamais** (fallback silencieux) | Lire `dailyChallenges.data` (ou passer `data` depuis la page) |
| **B6** ✅ **CORRIGÉ** | `<a>` imbriqué dans `<a>` : la carte est un `<Link>` (`cardHref`) et son CTA un 2e `<Link>` | `defi-card.tsx:419-430` + `468-470` ; **erreur d'hydratation confirmée en live**, disparue après fix | HTML invalide → erreur d'hydratation, rendu/interactivité cassés par intermittence sur **toutes** les `DefiCard` (quests, défis-physiques, social) | **Fait** : CTA rendu en `<span>` visuel quand la carte est déjà un lien |

---

## 4. Ce qu'il reste à faire — roadmap corrigée

### P0 — Débloquer la perception « tout est vide »
- **B4 + B1** (S) : `.catch()` sur `getUnifiedQuests` + corriger le `.select()` de
  `teen-dashboard.ts`. Garantit que « Jouer » ne se vide jamais entièrement et rallume le
  pilier Social.
- **Vérifier le service-worker / rebuild** (S) : confirmer que le hub affiche bien ses 5
  cartes après hard-refresh — c'est probablement la cause #1 du symptôme rapporté.

### P1 — Bugs restants + contenu de démo
- **B2** (S) : `activities` → `user_activities` (2 fichiers).
- **B3** (S) : onglet `badges` du wallet (les 252 achievements existent).
- **Seeds de démo** (M) : `passion_tutorials` (Créa), `events` futurs (Social),
  `crews`, `sport_clubs`, quelques `feed_posts`. + `teen_interests` pour les 3 ados de test
  (rallume le ranking `/teen/offres`). + instancier les missions (`user_missions`) via le RPC
  d'assignation (`assign_missions_*`).

### P2 — Vérifs de flux & décisions produit
- **Flux d'écriture jamais exercés** (S) : commander (`food_orders`), réserver une course
  (`ride_bookings` / RPC `request_ride`), réserver un mentor (`mentor_sessions`), RSVP event
  (`bookings`). Câblés mais à tester bout-en-bout.
- **MOCK à câbler** (M) : `/teen/share` (`shareableItems=[]` en dur),
  `/teen/avatar` (lire `avatars.mood`), `/teen/wellbeing` (placeholder « à venir »),
  `/teen/birthday` (vitrine ; dépend de `anniv_packs`).
- **Surfaces mortes — trancher** : roue de la fortune (retirée), `teen_creations`,
  `vip_exclusive_items`, doublons de routes passion/collections.

---

## 5. Quick wins (≤ 1 jour)
1. **B4 + B1** — robustifie « Jouer » et rallume le pilier Social.
2. **Hard-refresh / unregister SW / `rm -rf .next`** — vérifie que le symptôme n'était pas un chunk périmé.
3. **B2** (`activities`→`user_activities`) — répare `/teen/activity` (écran vide permanent).
4. **B3** (onglet badges wallet) — rend visibles 252 achievements déjà gagnés.
5. **Seed `passion_tutorials` + re-dater un `events`** — rallume Créa + Social dans le hub.

---

## Annexe — verdicts par feature (axe code conservé, axe données corrigé)

| Route | Verdict corrigé | Données réelles | Note |
|---|---|---|---|
| /teen/quests | OK (happy-path) | quiz 9 / défis 9 actifs | voir §1 ; bugs B1/B4/B5 |
| /teen/quiz, /teen/quiz/[id] | DONE | 9 quiz actifs | jouable |
| /teen/quiz/history | EMPTY-BY-USE | quiz_attempts=0 | se remplit en jouant |
| /teen/defis-physiques | DONE | 9 défis actifs | |
| /teen/games | DONE | 6 types, contenu jouable seedé | (1er passage disait « seeder » à tort) |
| /teen/challenges, /gamif/* | REDIRECT | n/a | par design |
| /teen/achievements | **BROKEN (B3)** | achievements 63 | cible badges inexistante |
| /teen/streak | PARTIAL | user_missions=0, lifetime_stats=0 | instancier missions |
| /teen/leaderboard | EMPTY-BY-USE | feed_posts=1 | classement créateurs |
| /teen/circles (crews) | SEED-DEMO | crews=0 | vérifier RLS 116/118 avant seed |
| /teen/pathways | DONE-à-vérifier | career_pathways=5 | vérifier clé teen_id |
| /teen/xp-value, /teen (dash) | DONE | XP/coins réels | |
| /teen/wallet | DONE | shop_rewards 26, reward_cat 8 | boutique a du contenu |
| /teen/vip-card | DONE-à-vérifier | vip_tiers=7 | (1er passage disait « vide » à tort) |
| /teen/savings | EMPTY-BY-USE | savings_goals=0 | créer via /new |
| /teen/feed | SEED-DEMO | feed_posts=1 | seed quelques posts |
| /teen/friends, /social, /messages | EMPTY-BY-USE | friendships=0 | se remplit à l'usage / seed démo |
| /teen/activity | **BROKEN (B2)** | user_activities existe | mauvais nom de table |
| /teen/notifications | REDIRECT | n/a | → /teen/activity |
| /teen/share | MOCK | n/a | câbler aux achievements/streak |
| /teen/events | SEED-DEMO | 0 futur | re-dater / seeder |
| /teen/offres | DONE (ranking à plat) | partner_offers≥1, teen_interests=0 | seed interests |
| /teen/partenaires | DONE | partners=5 | |
| /teen/mentors | DONE | mentors=10 | |
| /teen/internships | DONE | internships=12 | |
| /teen/food | DONE | 5 restos / 12 items | tester commande |
| /teen/rides | EMPTY-BY-USE | nivy_drivers=6 | tester RPC request_ride |
| /teen/mentor-sessions | EMPTY-BY-USE | 0 | réserver pour tester |
| /teen/birthday | MOCK | anniv_packs=0 | vitrine |
| /teen/aide-scolaire | EMPTY-BY-USE | teen_grades=0 | |
| /teen/avatar | MOCK | avatars=0 | persister mood |
| /teen/profile | DONE | badges/level OK | stats à 0 si lifetime_stats vide |
| /teen/wellbeing | MOCK | n/a | placeholder « à venir » |
| /teen/chores | EMPTY-BY-USE | parent_chores=0 | parent crée |
| /teen/create | EMPTY-BY-USE | teen_creations=0 | vérifier RPC award_creator_xp |
