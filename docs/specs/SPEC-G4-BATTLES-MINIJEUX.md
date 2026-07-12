# SPEC G4 — Battles synchrones & mini-jeux `/teen/games`

> **Statut :** spécification d'implémentation, prête à être découpée en issues GitHub (jalons §8).
> **Date :** 2026-07-12 · Branche `refonte/home-nav-lifestyle` · Suite directe des vagues G1-G3
> (commits `be39249`…`6518e69`) issues de l'audit `docs/audits/audit-2026-07-11-gamification/`.
> **Public :** un agent d'implémentation qui ne connaît PAS les conversations amont doit pouvoir
> exécuter chaque jalon avec ce seul document + le repo.

---

## 1. Objet & décisions PO déjà actées

Cette spec couvre la vague **G4** : donner vie aux deux dernières zones « théâtre » de la
gamification identifiées par l'audit du 2026-07-11 (SYNTHESE.md, trouvailles P1 « Multijoueur quiz
absent » et « Théâtre UI /teen/games ») :

1. **Battles 1v1 synchrones** — deux ados s'affrontent **en temps réel** sur un quiz chronométré
   (même question, même deadline, scores live). Décision PO 2026-07-11 : battles **synchrones
   complètes**, PAS asynchrones (le format asynchrone existe déjà = friend-défis, il est conservé
   tel quel).
2. **Mini-jeux solo `/teen/games`** — construire réellement 2-3 mini-jeux derrière la page
   aujourd'hui 100 % `disabled` (« Bientôt disponible »).

### Canon économique et produit (NON négociable, verrouillé)

| Règle | Source |
|---|---|
| **XP = progression pure** : jamais dépensé, jamais converti en argent, jamais transféré | Décision PO 2026-07-11, commit G2-A `3e2f229` (boutique = déblocage par niveau, zéro débit XP) |
| **Coins = argent parent** (1 DH = 100 coins), **jamais gagnables en jouant** | `docs/canon/gamification.locked.md` §5 ; les battles et mini-jeux ne touchent JAMAIS `user_coins` |
| **Anti-farm actif** : un même effort n'est crédité qu'une fois | Migration `169_quiz_xp_first_pass_only.sql` (garde idempotente dans `add_xp_to_user`) — à généraliser, cf. §6 |
| **Contenu servi aux mineurs = modéré par un humain** | Vague G3 : banque de 104 quiz seedés `is_active=false` (mig 172a/b) + file admin batch (commit `6518e69`) ; les battles ne consomment QUE cette banque |
| **Moteur de défis unique = `user_challenges`** | Commit G2-B `087137d` (triggers `user_missions` neutralisés, mig 171) |
| **Stack : Next.js App Router + Supabase (Postgres + Realtime + RLS)** — pas de nouveau vendor, pas de serveur WebSocket dédié | Contrainte PO |
| Public : ados marocains 13-17 ans (mineurs) — sécurité sociale maximale | Produit |

---

## 2. Existant réutilisé (recon vérifiée fichier:ligne)

### 2.1 Surface `/teen/games` (à câbler, pas à créer)

- `app/teen/games/page.tsx:6-8` — page serveur, gate rôle `teen` via `getUserRole()`
  (`lib/auth/get-user-role`). Charge le catalogue + stats.
- `app/teen/games/games-client.tsx:134-137` et `:171` — tous les CTA sont `disabled`
  (« Bientôt disponible ») : c'est exactement ce que G4 remplace.
- `gamification-system/features/mini-games/actions.ts:33-54` (`getMiniGameTypes`) et `:750-801`
  (`getUserGameStats`) — server actions de lecture déjà branchées sur la page.
- i18n : clés `teen.games.*` déjà présentes dans `messages/fr.json`.

### 2.2 Infra legacy mini-jeux (mig 011) — catalogue réutilisé, moteur ABANDONNÉ

- `gamification-system/database/migrations/011_mini_games.sql:13-29` — **`mini_game_types`**
  (catalogue : slug, base_xp, cooldown, min/max_players, is_daily). **RÉUTILISÉ** comme catalogue
  de la page `/teen/games` (déjà lu par `getMiniGameTypes`).
- `011_mini_games.sql:32-58` — `mini_game_sessions` / `mini_game_participants` : **NON réutilisés
  pour les battles** (voir pourquoi §3.1).
- `011_mini_games.sql:406-472` — RPC `submit_game_score` : **INTERDIT** de le brancher. Il fait
  confiance au score client (`p_score`, l.430) et crédite l'XP en écrivant directement
  `user_profiles` (l.461-464), une table qui **n'existe plus** (drift constaté par la mig 148) —
  et il contourne `add_xp_to_user`. À déprécier explicitement (jalon J8).
- `148_realityfix_game_challenge_rpc_profiles_drift.sql` — a réparé uniquement les RPC de
  **lecture** (`get_user_challenges`, `end_game_session`, `get_game_leaderboard`) via
  `COALESCE(teens.pseudo, profiles.full_name)`. Pattern d'identité à reprendre partout.
- `011_mini_games.sql:751-803` — RLS legacy ultra-permissive (« Anyone can view ») : contre-modèle,
  ne pas reproduire.

### 2.3 Contenu quiz modéré (la SEULE source de questions des battles)

- `gamification-system/database/migrations/022_pillars_system.sql:107-139` —
  **`educational_quizzes`** : `questions JSONB` (tableau de questions avec options + bonne
  réponse), `subject`, `difficulty`, `xp_reward`, **`is_active`** (gate de modération humaine).
- ⚠️ **FUITE CONSTATÉE (red-team) — préalable bloquant** : la RLS actuelle
  `"Everyone can view active quizzes" FOR SELECT USING (is_active = true)`
  (`022_pillars_system.sql:1287`) expose le JSONB `questions` **complet, champ `correct`
  inclus** (format confirmé `{question,options[4],correct,explanation}`,
  `172a_seed_quiz_bank_academique.sql:37`) à tout utilisateur authentifié via
  `supabase.from('educational_quizzes').select('questions')`. Pire, deux routes solo renvoient
  déjà `questions` (donc `.correct`) au client : `app/api/teen/quiz/categories/route.ts:31` et
  `app/api/teen/quiz/daily/route.ts:26`. Tant que ce n'est pas colmaté, TOUTE l'autorité serveur
  des battles (§3.4) est du théâtre : le tricheur lit `battles.quiz_id`, télécharge la banque,
  joint la question par son texte. **Le jalon J0 (§8) verrouille cette surface AVANT J1.**
- Mig `172a_seed_quiz_bank_academique.sql` / `172b_seed_quiz_bank_decouverte.sql` — 104 quiz /
  520 questions seedés **INACTIFS** ; activation uniquement via la file admin
  (`app/admin/content/`, batch approve/reject, commit `6518e69`).
- `173_recommend_quizzes_for_teen.sql` — RPC de sélection adaptative (catégories faibles, niveau,
  répétition espacée) : réutilisable pour choisir le quiz d'une battle.
- `app/api/teen/quiz/submit/route.ts:89-118` — pattern « XP à la première réussite seulement »
  (`alreadyRewarded`) + `:163-173` appel canonique `add_xp_to_user(source_type='quiz')`.

### 2.4 XP canonique & anti-farm

- `169_quiz_xp_first_pass_only.sql:43-149` — définition canonique actuelle d'`add_xp_to_user`
  (SECURITY DEFINER, `search_path` épinglé, `FOR UPDATE` sur `user_xp`) ; garde idempotente
  `:85-101` sur le ledger `xp_transactions (teen_id, source_type, source_id, amount>0)` ;
  courbe de niveaux `:106-121` (`(N×(N+1)/2)×100`, cap niveau 100) ; grants `:153-154`
  (`service_role, authenticated`, REVOKE `anon`).
- `xp_transactions` = grand livre. Index partiel quiz `:39-41` — à répliquer pour les nouvelles
  sources (§6).

### 2.5 Temps réel Supabase (patterns déjà en prod)

- `lib/hooks/notifications/use-realtime.ts:27-40` — `postgres_changes` filtré
  (`user_id=eq.${userId}`) sur `user_notifications` (INSERT/UPDATE/DELETE).
- `app/teen/messages/messages-client.tsx:129-140` — channel par conversation (`dm:${id}`).
- `lib/hooks/use-presence.ts:279-281` + `029_presence_system.sql:85`
  (`ALTER PUBLICATION supabase_realtime ADD TABLE user_presence`) — pattern **présence** ET
  pattern d'ajout d'une table à la publication Realtime.
- `lib/hooks/use-gamification.ts:216-577` — channels XP/streak/challenges par teen.

### 2.6 Graphe social & crews (adversaires = amis `accepted` ; crews = ladder §6.4 uniquement)

- `024_friends_system.sql:11-42` — `friendships` (paire ordonnée `user1_id<user2_id`, statut
  `pending|accepted|blocked`) ; `:48-70` `friend_requests` ; `:76+` **`blocked_users`**.
- `079` — RPC `recommend_friends` (picker d'adversaire).
- `007_crews_system.sql:13-58` — `crews` (dont `total_xp`, **`total_challenges_won`**) ;
  `:59-88` `crew_members` (dont **`challenges_won`**, `xp_contributed`).
- `133_realityfix_update_crew_stats_xp_source.sql` — `update_crew_stats` réparé : à réutiliser
  pour le crew ladder (§6.4).

### 2.7 Friend-défis asynchrones (conservés, complémentaires)

- Canon `docs/canon/gamification.locked.md` §2 : `friend_challenges` v2 (mig 073),
  RPCs `*_v2` (mig 078), `challenge_kind` inclut `quiz_battle` (label jamais câblé).
- `app/api/teen/friend-challenges/route.ts` + `[id]/{accept,decline,progress,resolve}` ;
  cron `app/api/cron/friend-challenge-resolve/route.ts` (`vercel.json:16`, `30 * * * *`).
- Progression auto-déclarée (`[id]/progress/route.ts:46-58`) — c'est précisément la limite que
  les battles synchrones dépassent (autorité serveur, §3.4).

### 2.8 Modération, signalement, notifications

- `app/api/teen/report/route.ts:19-43` — sink universel de signalement (`user_reports`,
  trigger ≥3 signalements → `moderation_queue`) ; enum `resource_type` à étendre (§5.3).
- `app/admin/moderation/page.tsx` + `app/api/admin/moderation/*` — file admin existante.
- `app/admin/defis-sportifs/` (commit `62aefe4`) — pattern de file de validation dédiée.
- `user_notifications` + cron `notification-fan-out` (`vercel.json:8`) — insertion directe pour
  invitation/résultat de battle.
- `lib/observability/log-db-error.ts` (`logDbError`) — obligatoire sur tout accès DB (V8).

### 2.9 Crons

- `vercel.json:2-19` — pattern Vercel Cron (pas de `pg_cron` sur le projet). Le sweeper battles
  (§3.3) s'y ajoute.

---

## 3. Architecture retenue

> **Numérotation migrations** : `179_parental_limits_caps.sql` existe déjà (plus haut numéro du
> repo au 2026-07-12). Le train G4 démarre donc à **180** : `180` lockdown clé de réponses (J0),
> `181` battles (J1), `182` garde XP (J2), `183` catalogue (J5), `184` revoke legacy (J8).
> **Re-vérifier le plus haut numéro libre à l'implémentation de chaque jalon.**

### 3.0 Prérequis transverse (J0) — la clé de réponses quitte la surface ado — mig `180_quiz_answer_key_lockdown.sql`

Colmater la fuite constatée §2.3 avant toute battle :

1. **Privilèges par colonne** : `REVOKE SELECT ON public.educational_quizzes FROM authenticated;`
   puis `GRANT SELECT (id, code, title, description, subject, difficulty, grade_level,
   time_limit_minutes, passing_score, xp_reward, icon, is_active, created_at, …) ON
   public.educational_quizzes TO authenticated;` — **toutes les colonnes SAUF `questions`**.
   La RLS 022 reste en place (elle filtre les lignes `is_active=true`) ; la colonne `questions`
   devient illisible pour un teen, quel que soit le chemin (PostgREST, Realtime, RPC non-DEFINER).
2. **RPC de service** `get_quiz_questions_stripped(p_quiz_id)` (SECURITY DEFINER, search_path
   épinglé, grant `authenticated`) : renvoie le tableau de questions **sans les champs `correct`
   et `explanation`** — seule façon pour un client d'obtenir les énoncés. Les RPC battles (§3.4)
   et Quiz Rush (§7.1) lisent, elles, le JSONB complet en interne (DEFINER).
3. **Correction des routes solo qui fuient** : `app/api/teen/quiz/categories/route.ts:31` retire
   `questions` du select (la route n'en a besoin que pour compter — remplacer par
   `jsonb_array_length` via la RPC ou une colonne dénormalisée) ; `app/api/teen/quiz/daily/route.ts:26`
   passe par `get_quiz_questions_stripped` et la correction du quiz solo reste/passe côté
   serveur (`app/api/teen/quiz/submit/route.ts` corrige déjà serveur — vérifier qu'il ne renvoie
   `correct`/`explanation` qu'**après** soumission, question par question, jamais en avance).
4. **Non-régression** : le flow quiz solo (categories → play → submit) et la RPC 173 doivent
   rester verts (smoke-test J0).

### 3.1 Modèle de données — migration `181_battles_system.sql`

**Décision : nouvelles tables dédiées**, on ne ressuscite pas `mini_game_sessions` (mig 011).
Raisons : (a) son RPC d'écriture fait confiance au client et écrit une table morte (§2.2) ;
(b) sa RLS est publique ; (c) son modèle « host + N participants » sans rounds ni deadlines ne
porte pas le protocole synchrone. Le catalogue `mini_game_types` est en revanche conservé pour
la page `/teen/games`.

DDL esquissé (le jalon J1 l'écrit en entier, avec le style maison : en-tête ⚠️, BEGIN/COMMIT,
idempotence, COMMENT ON) :

```sql
-- Battles 1v1 synchrones
CREATE TABLE public.battles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            varchar(30) NOT NULL DEFAULT 'quiz_battle'
                  CHECK (kind IN ('quiz_battle')),          -- v1 : un seul mode
  status          varchar(20) NOT NULL DEFAULT 'invited'
                  CHECK (status IN ('invited','lobby','active','resolved','cancelled','expired')),
  creator_id      uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  opponent_id     uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  quiz_id         uuid NOT NULL REFERENCES public.educational_quizzes(id),
  rounds_total    integer NOT NULL DEFAULT 5 CHECK (rounds_total BETWEEN 3 AND 10),
  current_round   integer NOT NULL DEFAULT 0,
  round_deadline  timestamptz,           -- deadline serveur du round courant
  current_payload jsonb,                 -- question du round courant SANS la bonne réponse
  winner_id       uuid REFERENCES public.teens(id),
  is_draw         boolean NOT NULL DEFAULT false,
  resolution      varchar(20) CHECK (resolution IN ('score','forfeit','expired')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  accepted_at     timestamptz,
  started_at      timestamptz,
  resolved_at     timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '24 hours', -- TTL invitation
  CONSTRAINT battles_distinct_players CHECK (creator_id <> opponent_id)
);

CREATE TABLE public.battle_participants (
  battle_id        uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  teen_id          uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  -- Dénormalisation VOLONTAIRE (red-team #11) : la RLS SELECT de cette table doit être une
  -- comparaison simple (auth.uid() IN (creator_id, opponent_id)) SANS sous-requête jointe vers
  -- battles — postgres_changes réévalue la policy par événement et par abonné, les policies
  -- jointes y sont le cas le plus lent/fragile. Colonnes posées par create_battle, jamais
  -- modifiées ensuite.
  creator_id       uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  opponent_id      uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  score            integer NOT NULL DEFAULT 0,      -- mis à jour à la CLÔTURE du round (§3.4-4b), pas au submit
  correct_count    integer NOT NULL DEFAULT 0,      -- idem : jamais mi-round (fuite d'info, red-team #5)
  answered_current boolean NOT NULL DEFAULT false,  -- flag "a répondu au round courant" (seul signal mi-round)
  round_seen_at    timestamptz,                     -- accusé de réception de la question courante (§3.4-2, équité 3G)
  is_ready         boolean NOT NULL DEFAULT false,  -- lobby
  last_seen_at     timestamptz,                     -- heartbeat (détection abandon)
  reactions_count  integer NOT NULL DEFAULT 0,      -- compteur persisté pour revue abus (§5.1-3)
  xp_awarded       integer NOT NULL DEFAULT 0,
  PRIMARY KEY (battle_id, teen_id)
);

CREATE TABLE public.battle_rounds (
  battle_id      uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  round_no       integer NOT NULL,
  question_index integer NOT NULL,       -- index dans educational_quizzes.questions
  started_at     timestamptz NOT NULL,
  deadline       timestamptz NOT NULL,
  PRIMARY KEY (battle_id, round_no)
);

CREATE TABLE public.battle_answers (
  battle_id    uuid NOT NULL,
  round_no     integer NOT NULL,
  teen_id      uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  answer_index integer NOT NULL,
  is_correct   boolean NOT NULL,
  response_ms  integer NOT NULL,         -- calculé SERVEUR : submitted_at - round.started_at
  submitted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (battle_id, round_no, teen_id),
  FOREIGN KEY (battle_id, round_no) REFERENCES public.battle_rounds(battle_id, round_no)
);

-- Sessions mini-jeux solo (remplace l'usage écriture de mini_game_sessions)
CREATE TABLE public.game_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id      uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  game_slug    varchar(50) NOT NULL,     -- FK logique vers mini_game_types.slug
  seed         jsonb NOT NULL,           -- contenu choisi par le serveur (ids questions, layout memory)
  answers      jsonb NOT NULL DEFAULT '[]'::jsonb,
               -- Stockage AUTORITAIRE des réponses solo (red-team #13) : append-only, écrit
               -- EXCLUSIVEMENT par la RPC submit_game_answer (correction serveur question par
               -- question). complete_game_session dérive le score de CE champ, jamais du client.
  status       varchar(20) NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','completed','abandoned','expired')),
  score        integer,
  xp_awarded   integer NOT NULL DEFAULT 0,
  started_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at   timestamptz NOT NULL DEFAULT now() + interval '30 minutes'
);

-- Realtime : les clients s'abonnent aux changements de CES DEUX tables uniquement
ALTER PUBLICATION supabase_realtime ADD TABLE public.battles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_participants;

-- Index
CREATE INDEX idx_battles_creator  ON public.battles (creator_id, status);
CREATE INDEX idx_battles_opponent ON public.battles (opponent_id, status);
CREATE INDEX idx_battles_sweeper  ON public.battles (status, expires_at)
  WHERE status IN ('invited','lobby','active');
CREATE INDEX idx_game_sessions_teen_day ON public.game_sessions (teen_id, game_slug, started_at);
-- Anti-farm : lookups ledger (cf. §6)
CREATE INDEX idx_xp_transactions_game_sources
  ON public.xp_transactions (teen_id, source_type, created_at)
  WHERE source_type IN ('battle','mini_game');
```

**RLS (verrouillée écriture) :**

- `battles` et `battle_participants` : `SELECT` **uniquement** si
  `auth.uid() IN (creator_id, opponent_id)` — **comparaison simple sur colonnes locales, AUCUNE
  sous-requête** (c'est la raison d'être de la dénormalisation ci-dessus : ces deux tables sont
  publiées en Realtime et `postgres_changes` réévalue la policy à chaque événement).
  `battle_rounds` n'est PAS publiée en Realtime : sa policy peut joindre `battles`.
  Aucune policy INSERT/UPDATE/DELETE pour `authenticated` : **toutes les écritures passent par
  des RPC SECURITY DEFINER** qui revérifient `auth.uid()` en interne (pattern
  `_debit_teen_coins`, V6).
- `battle_answers` : `SELECT` ses **propres** lignes seulement
  (`teen_id = auth.uid()`) — on ne voit jamais la réponse de l'adversaire en cours de round ;
  le score adverse arrive agrégé via `battle_participants`.
- `game_sessions` : `SELECT` self ; écritures via RPC.
- `REVOKE ALL … FROM anon` sur les 5 tables (canon V8 : zéro surface pré-auth).
- NB Realtime : `postgres_changes` respecte la RLS — seuls les deux participants reçoivent les
  événements de leur battle.

### 3.2 Protocole temps réel (événements)

Un seul mécanisme de vérité : **les lignes Postgres**. Le temps réel n'est qu'un miroir
(`postgres_changes`), jamais un canal d'autorité. Channel par battle : `battle:{battle_id}`.

| Événement client | Transport | Payload utile | Déclencheur |
|---|---|---|---|
| `battle.updated` | `postgres_changes` UPDATE sur `battles` (filter `id=eq.{id}`) | `status`, `current_round`, `round_deadline`, `current_payload` (question sans réponse), `winner_id` | RPC serveur (accept/start/advance/resolve/forfeit) |
| `participant.updated` | `postgres_changes` UPDATE sur `battle_participants` (filter `battle_id=eq.{id}`) | `answered_current`, `is_ready` mi-round ; `score`, `correct_count` **uniquement à la clôture du round** (red-team #5 : jamais de mise à jour de score mi-round — sinon l'incrément `correct_count` adverse révèle que la bonne réponse a été trouvée avant que j'aie répondu) | RPC `advance_battle_round` (scores), `submit_battle_answer` (`answered_current` seul), `set_ready`, heartbeat |
| `round.seen` | RPC `battle_round_seen(p_battle_id, p_round_no)` appelée par le client au rendu de la question | pose `round_seen_at` serveur | réception de `current_payload` (équité latence, §3.4-2) |
| `presence.sync/join/leave` | Supabase Presence sur `battle:{id}` (pattern `use-presence.ts:279`) | `{teen_id, online_at}` | connexion/déconnexion des clients |
| `reaction` (option, décision PO §9) | route `POST [id]/react` → broadcast **émis serveur** sur `battle:{id}` | `{emoji}` ∈ set fermé de 6 | tap client ; **rate-limité serveur** (≤ 3/round, ≤ 10/battle) + `reactions_count` persisté (§5.1-3, red-team #8) |
| `battle.invite` / `battle.result` | INSERT `user_notifications` (hook `use-realtime.ts:27` déjà branché) | type, battle_id | RPC create/resolve |

**Synchronisation du chrono :** le client n'a pas d'horloge de confiance. Le compte à rebours
affiché = `round_deadline` (timestamp serveur reçu dans la ligne `battles`) moins une estimation
de l'offset horloge (calculée une fois à l'accept : `offset = battles.accepted_at_reçu -
Date.now()` — champs réellement présents dans la DDL ; affiner à chaque round avec
`battle_rounds.started_at` si besoin). La **validité** d'une réponse n'en dépend jamais : elle
est tranchée par `now()` serveur dans la RPC, avec la deadline personnelle décrite en §3.4-2.

### 3.3 Cycle de vie d'une battle

```
create_battle(opponent, quiz?)        accept_battle()
        │                                  │
        ▼                                  ▼
    INVITED ────────────────────────▶   LOBBY ──────────────▶ ACTIVE ────────▶ RESOLVED
        │            │                     │   start_battle()    │   resolve_     │
        │ decline_   │ TTL 24 h            │   (2× is_ready +    │   battle()     ├─ XP (§6)
        │ battle()   │ (sweeper)           │    présence, crée   │   après le     ├─ crew stats
        ▼            ▼                     │    round 1)         │   round N      ├─ notification
    CANCELLED     EXPIRED                  │                     │                └─ ledger
                     ▲                     │              round r = 1..N :
                     │                     │                current_payload ← question r (sans réponse)
   sweeper cron (*/10 min) :               │                round_deadline ← now() + 15 s
   - LOBBY   inactif > 10 min              │                les 2 répondent (submit_battle_answer)
   - ACTIVE  bloqué  > 15 min              │                     │
     (0 XP, resolution='expired')          │                advance_battle_round()   ◀─ idempotent,
                                           │                (si 2 réponses OU deadline    appelable par
                                           │                 dépassée → round r+1)        chaque client
                                           │                     │
                                           │            abandon : heartbeat absent > 30 s en ACTIVE
                                           │                     │
                                           │                claim_forfeit() → RESOLVED
                                           │                (resolution='forfeit', gagnant = resté,
                                           └────────────────  XP réduits, cf. §6)
```

Transitions permises (toutes en RPC, toutes vérifiées serveur) :

| RPC | De → vers | Qui | Gardes principales |
|---|---|---|---|
| `create_battle(p_opponent_id, p_quiz_id default null)` | ∅ → `invited` | tout teen | adversaire = **ami `friendships.status='accepted'` uniquement en v1** (le co-crew est retiré du défaut — red-team #7, cf. §5.1-1 et P3) ; pas de ligne `blocked_users` dans les 2 sens ; ≤ 1 battle non résolue par paire ; **≤ 2 créations / jour / même paire ET cooldown 24 h après un `decline` de cette cible** (anti-harcèlement, red-team #6), PUIS quota global ≤ 10/jour (§4 M9) ; invariant identité §3.5 ; quiz choisi serveur si null (RPC 173) et `is_active=true` obligatoire |
| `accept_battle(p_battle_id)` | `invited` → `lobby` | opponent | TTL non expiré |
| `decline_battle(p_battle_id)` | `invited` → `cancelled` | opponent | — |
| `set_battle_ready(p_battle_id)` | (lobby) | chaque participant | pose `is_ready` + `last_seen_at` |
| `start_battle(p_battle_id)` | `lobby` → `active` | creator OU opponent | les 2 `is_ready` ; écrit `battle_rounds` r1 + `current_payload` + `round_deadline` |
| `battle_round_seen(p_battle_id, p_round_no)` | (active) | chaque participant | pose `round_seen_at = now()` (une seule fois par round) — base de la deadline personnelle §3.4-2 |
| `submit_battle_answer(p_battle_id, p_round_no, p_answer_index)` | (active) | chaque participant | cf. §3.4 |
| `advance_battle_round(p_battle_id)` | (active) round r → r+1 ou → `resolved` | chaque participant | idempotent ; exige (2 réponses) OU (`now() ≥ deadline`) |
| `claim_forfeit(p_battle_id)` | `active` → `resolved` | le participant présent | heartbeat adverse absent > 30 s (lu sur `battle_participants.last_seen_at`) |
| `battle_heartbeat(p_battle_id)` | (lobby/active) | chaque participant | met à jour `last_seen_at` (appelé toutes les 10 s par le client) |
| sweeper (cron, service_role) | `invited/lobby/active` → `expired` | cron | cf. diagramme |

### 3.4 Autorité serveur (le cœur de G4)

Tout ce qui a une valeur (validité d'une réponse, score, chrono, XP) est calculé **dans Postgres,
en SECURITY DEFINER, search_path épinglé**, à partir de données que le client n'a jamais vues :

1. **La bonne réponse ne quitte jamais le serveur pendant la battle — ET n'est lisible par
   AUCUN autre chemin.** `current_payload` est construit par les RPC en retirant les champs
   `correct`/`explanation` du JSONB `educational_quizzes.questions`. Le client envoie un
   `answer_index` ; `submit_battle_answer` relit la question en base et calcule `is_correct`
   lui-même. **Ce point n'a de valeur que parce que J0 (§3.0) a retiré la colonne `questions`
   de la surface lisible `authenticated`** — sans J0, n'importe quel ado télécharge la clé de
   réponses par la RLS 022 et le strip de `current_payload` est du théâtre (red-team #1).
2. **Le chrono fait foi côté serveur, avec deadline PERSONNELLE (équité 3G, red-team #14).**
   La question arrive par Realtime avec une latence variable ; une deadline unique figée à
   `started_at + 15 s` pénaliserait le participant à la connexion lente (moins de temps réel,
   `response_ms` gonflé). Donc : le client accuse réception via `battle_round_seen` ;
   `submit_battle_answer` valide si `now() <= LEAST(round.deadline + interval '3 seconds',
   round_seen_at + interval '15 seconds')` et calcule
   `response_ms = now() - GREATEST(round.started_at, round_seen_at)`.
   L'extension est **plafonnée à +3 s** : retarder volontairement son accusé de réception
   (pour lire la question avant d'acker) rapporte au plus 3 s et est visible dans les données
   (`round_seen_at - started_at` anormalement long, cf. M8). Sans accusé de réception,
   fallback = deadline commune + tolérance 1 s. L'iniquité résiduelle (payload lu avant l'ack)
   est documentée §10. Le client ne fournit JAMAIS `response_ms`.
3. **Le score est dérivé, jamais soumis.** Barème serveur v1 :
   `points = 100 si correct, + bonus vitesse floor(50 × restant/15s)` (restant calculé sur la
   fenêtre personnelle du point 2) ; 0 si incorrect ou hors délai. (Contraste assumé avec le
   legacy `submit_game_score` qui accepte `p_score` — §2.2. **Seule exception au principe :
   la plausibilité Memory, §7.2, explicitement bornée.**)
4. **Concurrence :** `submit_battle_answer` et `advance_battle_round` prennent
   `SELECT … FOR UPDATE` sur la ligne `battles` ; l'unicité `PRIMARY KEY (battle_id, round_no,
   teen_id)` sur `battle_answers` rend le double-submit inoffensif (idempotence : renvoie l'état,
   ne recrédite rien).
   **4b. Publication différée des scores (red-team #5) :** `submit_battle_answer` écrit
   `battle_answers` et ne pousse sur `battle_participants` QUE `answered_current=true` ;
   `score` et `correct_count` sont recalculés et écrits par `advance_battle_round` à la clôture
   du round. Mi-round, l'adversaire sait seulement que j'ai répondu — jamais si c'était juste.
5. **Résolution :** `resolve_battle` (appelé par `advance_battle_round` après le dernier round,
   par `claim_forfeit`, ou par le sweeper) : gagnant = plus haut `score` (égalité → `is_draw`),
   crédite l'XP (§6) dans la MÊME transaction, met à jour crew stats, insère les
   2 `user_notifications`, passe `resolved`. Idempotent (garde sur `status='resolved'` +
   garde ledger §6).
6. **Grants :** toutes les RPC `EXECUTE` → `authenticated` (+ `service_role` pour le sweeper),
   `REVOKE FROM anon, PUBLIC` (canon V8).

Côté HTTP : les RPC sont appelées via de fines routes `app/api/teen/battles/**` (auth
`supabase.auth.getUser()`, gate rôle teen, `logDbError`, mêmes gardes CSRF que les routes teen
V11) — jamais directement depuis le client Supabase JS, pour garder un point de rate-limiting
et d'audit (sauf lectures `SELECT` RLS et abonnements Realtime, qui restent client).

### 3.5 Invariant identité — `teens.id = auth.uid()` REQUIS (red-team #12)

Le repo porte DEUX modèles d'identité teen (cœur de l'audit-connexion-amine) :

- **Modèle V11 (self-auth)** : `teens.id == profiles.id == auth.uid()` — confirmé par
  `lib/auth/get-user-role.ts:104` (`.eq("id", user.id)`) et la RLS friendships
  (`user1_id = auth.uid()`, `024_friends_system.sql:496`).
- **Modèle legacy** : `000_base_tables.sql:25-33` crée des teens avec `id = gen_random_uuid()`
  et `parent_id = auth.users(id)` ⇒ `teens.id ≠ auth.uid()`.

Toute la RLS et toutes les RPC battles s'appuient sur `auth.uid()`. **Les battles v1 exigent
donc l'invariant `teens.id = auth.uid()`** :

1. `create_battle` et `accept_battle` vérifient `EXISTS (SELECT 1 FROM teens WHERE id =
   auth.uid())` et échouent avec une erreur explicite (`battle_identity_unsupported`) sinon —
   un teen legacy ne peut NI créer NI recevoir de battle : échec propre, pas comportement
   silencieusement cassé.
2. Le périmètre v1 « amis `accepted` uniquement » (§5.1-1) réduit l'exposition : `friendships`
   est déjà clé sur `auth.uid()`, donc tout adversaire atteignable respecte l'invariant.
   (C'était le co-crew qui cassait : `crew_members.user_id` référence `profiles(id)`,
   `007_crews_system.sql:59-88` — raison supplémentaire de son retrait du défaut v1.)
3. L'affichage des identités passe par le helper existant `resolveTeenIdentities` /
   pattern mig 148 (`COALESCE(teens.pseudo, profiles.full_name)`), jamais `user_profiles`.
4. La migration/exclusion des teens legacy est un chantier séparé (hors périmètre G4, déjà
   tracé dans le mémo drift schéma) — G4 doit seulement ne pas leur mentir (point 1).

---

## 4. Anti-triche — menaces → parades

| # | Menace | Parade (v1) |
|---|---|---|
| M1 | Le client soumet un score forgé | Aucune RPC n'accepte de score. Score dérivé serveur (§3.4-3). Le legacy `submit_game_score` est révoqué (J8). **Exception unique et assumée : Memory (§7.2)** — plausibilité sur données client, bornée à ≤ 15 XP plafonnés |
| M2 | Lire la bonne réponse avant de répondre (DevTools/réseau **OU lecture directe de `educational_quizzes.questions` par la RLS 022**) | **J0 (§3.0) : colonne `questions` retirée de la surface `authenticated` (privilèges par colonne) + routes solo categories/daily corrigées** ; la réponse n'est jamais dans `current_payload` ni dans aucune ligne/colonne lisible ; correction en RPC (§3.4-1). `battle_answers` : SELECT self-only. Sans J0, tout le reste est du théâtre (red-team #1) |
| M3 | Répondre après la deadline (lag simulé, pause devtools) | Deadline **personnelle** = `LEAST(deadline+3s, round_seen_at+15s)` ; `now()` Postgres fait foi ; extension plafonnée à +3 s (§3.4-2) |
| M4 | Double soumission / replay d'une réponse | PK `(battle_id, round_no, teen_id)` ; RPC idempotente |
| M5 | Manipuler l'horloge client | L'horloge client n'entre dans aucun calcul de validité ni de vitesse (§3.2, §3.4-2) |
| M6 | Farm XP en rejouant (battles ou mini-jeux en boucle) | Généralisation de la garde 169 : idempotence ledger par `(teen, source_type, source_id)` pour `battle` et `mini_game` + **plafonds quotidiens** (§6.2). Au-delà : on joue encore, XP = 0 (« entraînement », même politique que le rejeu quiz) |
| M7 | Collusion / win-trading entre amis (l'un laisse gagner l'autre = « throw ») | Les plafonds (2 créditées/paire/jour, 5/jour) **bornent la quantité, ils ne détectent PAS le throw** — résidu assumé : 150 XP/jour garantis pour un binôme complice, sans compétence. En complément, **détection différée (J8)** : requête d'analyse sur `battle_answers` marquant les paires à taux de victoire unilatéral ≥ 90 % sur ≥ 5 battles AVEC réponses du perdant systématiquement fausses ⇒ `audit_log` (`battle.suspect_collusion`) + file admin. Pas de sanction automatique v1 (revue humaine). Résidu explicite §10 |
| M8 | Bot / réponses scriptées (instantanées OU « à allure humaine » si la clé a fuité) | Deux couches : (a) plancher par battle — `response_ms < 250` ⇒ réponse marquée, ≥ 3 par battle ⇒ XP=0 + `audit_log` (`battle.suspect_speed`) ; (b) **détection cross-battle (J8), la seule qui attrape le bot calibré** : sur les N=10 dernières battles d'un teen, taux de justesse ≥ 95 % ET variance de `response_ms` anormalement faible ⇒ `audit_log` (`battle.suspect_pattern`) + file admin. NB : la couche (a) seule est trivialement esquivable en répondant en 1,5-2,5 s ; elle ne vaut que combinée à J0 (clé inaccessible) et à (b) |
| M9 | Spam d'invitations (harcèlement par battle) | Plafonds **dans cet ordre** : ≤ 1 battle non résolue par paire ; **≤ 2 créations / jour / même paire** ; **cooldown 24 h sur une cible après son `decline`** (un refus n'est pas une invitation à réessayer) ; PUIS ≤ 10 créations / jour / teen (le plafond global seul laissait concentrer 10 pings/jour sur UNE victime — red-team #6) ; adversaire = ami `accepted` uniquement (§5.1) ; `blocked_users` bloque dans les deux sens |
| M10 | Écriture directe des tables (contournement RPC) | Zéro policy d'écriture `authenticated` ; SECURITY DEFINER + revérification `auth.uid()` interne (§3.1) |
| M11 | Deviner le seed / contenu d'un mini-jeu avant de jouer | `game_sessions.seed` choisi serveur à la création, `SELECT` self-only, et pour Quiz Rush les réponses sont corrigées en RPC exactement comme M2 |
| M12 | Abandon stratégique pour éviter la défaite | Forfeit = défaite (resolution=`forfeit`, gagnant = resté, §3.3) ; l'abandonneur ne touche pas l'XP de participation |
| M13 | Multi-comptes | Hors périmètre technique v1 (l'inscription exige la validation parentale — V11 — ce qui renchérit fortement le multi-compte) ; consigné comme risque §10 |

---

## 5. Sécurité mineurs

### 5.1 Interactions sociales exactes autorisées (liste fermée)

1. **Inviter en battle** : uniquement un ami `friendships.status='accepted'` — **relation
   bilatérale explicitement consentie**. Le co-membre de crew est RETIRÉ du périmètre v1
   (red-team #7) : `crews.is_public DEFAULT true` (`007_crews_system.sql:36`) et l'approbation
   d'adhésion ne créent AUCUN consentement mutuel entre membres — un mineur ajouté à un crew
   public aurait reçu des invites de gens qu'il n'a jamais acceptés. Réintroduire le co-crew
   exige un opt-in dédié « battles crew » (décision PO P3, v1.1 au plus tôt). **Jamais
   d'inconnu, jamais de matchmaking public en v1.** Vérifié dans `create_battle`, pas seulement
   dans l'UI.
2. **Accepter / refuser** une invitation. Refus silencieux (l'inviteur voit « refusée », sans
   justification demandée) + **cooldown 24 h** : la même cible ne peut pas être ré-invitée après
   un refus (§4 M9).
3. **Réactions emoji** pendant la battle : **set fermé de 6 emojis** définis en code
   (👏 😮 😂 🔥 💪 🤝). Passent par la route `POST [id]/react` (JAMAIS broadcast client
   direct) : **rate-limit serveur ≤ 3/round et ≤ 10/battle**, compteur `reactions_count` + tally
   par emoji persistés sur `battle_participants` — le spam moqueur (😂🔥 en rafale sur un
   perdant) est donc borné ET auditable par l'admin en cas de signalement (red-team #8).
   Bouton client « couper les réactions » (mute local, immédiat, sans notification à l'autre).
   **Aucun texte libre, aucun chat, aucune image** dans toute la surface battles/games.
   (Option retirable, décision PO §9.)
4. **Voir** : pseudo, avatar, niveau et score de l'adversaire (données déjà publiques intra-app
   via le pattern identité `COALESCE(teens.pseudo, profiles.full_name)` — mig 148).
   Aucune autre PII (pas de ville, âge, école). ⚠️ Limite connue (red-team #9) : les pseudos ne
   sont PAS modérés a priori à la création/renommage — un pseudo injurieux peut être vu par un
   mineur avant tout signalement. Le filtre pseudo (liste noire fr/darija au renommage) est un
   chantier transverse HORS périmètre G4, consigné §10 ; G4 fournit le canal réactif (§5.3).

`blocked_users` (mig 024) est respecté dans les deux sens à la création ET à l'acceptation.

### 5.2 Contenu

- Les questions des battles et de Quiz Rush proviennent **exclusivement** de
  `educational_quizzes WHERE is_active=true`, c'est-à-dire la banque passée en modération
  humaine (G3, mig 172a/b + file admin `app/admin/content/`). Aucune génération IA à la volée,
  aucun contenu tiers, aucun UGC.
- Le Memory v1 utilise des sets d'emojis **définis en dur dans le code** (pas de DB, pas
  d'images uploadées) — zéro risque de contenu, zéro modération requise.
- Le seed legacy `music_quiz_questions` (mig 011, pop occidentale non modérée) n'est **pas**
  servi : les `mini_game_types` non construits passent `is_active=false` (J5).

### 5.3 Signalement & modération

- Étendre le sink universel `app/api/teen/report/route.ts:19-27` : ajouter `"battle"` à l'enum
  `resource_type` (+ la contrainte DB de `user_reports` si elle énumère — vérifier mig 097).
  Motifs réutilisés tels quels (`harassment`, `inappropriate`, …).
- Point d'entrée UI : bouton « Signaler » sur l'écran de résultat et la fiche d'invitation.
  Cible = la battle. L'admin voit : les deux participants, l'historique des invitations de la
  paire (spam), et le **tally de réactions persisté** (`battle_participants.reactions_count` +
  répartition par emoji, §5.1-3) — le signalement « il m'a spammé de 😂 » est donc vérifiable,
  pas invisible. Pseudo offensif → routé vers la modération profil existante (réactif
  uniquement en v1, cf. §5.1-4 et risque §10).
- Le trigger existant ≥ 3 signalements → `moderation_queue` s'applique sans changement ;
  la file `app/admin/moderation/` affiche le nouveau type.
- Battles suspectes (M8) : visibles via `audit_log` (`action='battle.suspect_speed'`).

### 5.4 Bien-être

- Pas de notion de « classement mondial public » : leaderboard battles limité aux amis + crew
  (défaut, décision PO §9).
- Le forfait/défaite ne retire jamais rien (pas de perte d'XP — l'XP ne descend jamais, canon).
- Copy Niv bienveillant sur la défaite (pattern `NivCoach` de `games-client.tsx:69`).
- Limites horaires / temps d'écran : PAS en v1 (décision PO ouverte §9).

---

## 6. Règles XP

### 6.1 Barème (défauts — ajustables par le PO, §9)

| Événement | XP | `source_type` | `source_id` |
|---|---|---|---|
| Battle gagnée | **+30** | `battle` | `battle_id` |
| Battle perdue (jouée jusqu'au bout) | **+10** | `battle` | `battle_id` |
| Égalité | **+15** chacun | `battle` | `battle_id` |
| Victoire par forfait | **+15** (gagnant) / **0** (forfaiteur) | `battle` | `battle_id` |
| Battle expirée (sweeper) | 0 / 0 | — | — |
| Mini-jeu solo terminé (session valide) | **+10 à +25** selon `mini_game_types.base_xp` et score, calcul serveur | `mini_game` | `game_sessions.id` |

Ordres de grandeur alignés sur l'existant : quiz solo = 50 XP base
(`educational_quizzes.xp_reward`), missions quotidiennes 10-50 (canon §1). Une battle rapporte
**moins** qu'un quiz réussi : le contenu pédagogique reste le chemin d'XP principal.

**Jamais de coins.** Aucune RPC battle/game ne référence `user_coins`, `top_up_teen`,
`spend_coins`. Point de vérification explicite en revue de code (jalon J2).

### 6.2 Plafonds anti-farm (serveur, dans les RPC de crédit)

1. **Idempotence par source** — migration `182_xp_game_sources_guard.sql` : généraliser la garde
   169 dans `add_xp_to_user` :
   `IF p_source_type IN ('quiz','battle','mini_game') AND p_source_id IS NOT NULL THEN …`
   (même bloc `:85-101`, même placement après le `FOR UPDATE`) + index partiel dédié (§3.1).
   Un `battle_id` / une `game_session` ne crédite qu'une fois, pour toujours.
2. **Sérialisation des compteurs (anti-TOCTOU, red-team #3)** : le `FOR UPDATE` de la garde 169
   ne sérialise que l'idempotence par source, PAS les plafonds — deux `resolve_battle` du même
   teen quasi simultanés liraient chacun `COUNT=4 (<5)` et créditeraient tous les deux. Donc :
   **chaque RPC de crédit prend `PERFORM pg_advisory_xact_lock(hashtext('g4_xp:' || teen_id))`
   AVANT tout `COUNT` de plafond** (un lock par teen, relâché en fin de transaction ; pour une
   battle, prendre les locks des deux teens dans l'ordre lexicographique des uuid pour éviter le
   deadlock). Les COUNT ci-dessous se font sous ce verrou.
3. **Définition du « jour »** : `Africa/Casablanca`, pas UTC —
   `(created_at AT TIME ZONE 'Africa/Casablanca')::date = (now() AT TIME ZONE
   'Africa/Casablanca')::date` (sinon reset à 01:00 locale, red-team #18).
4. **Plafond quotidien battles** : seules les **5 premières battles résolues du jour** créditent
   de l'XP (compte serveur dans `resolve_battle` sur `xp_transactions WHERE teen_id=… AND
   source_type='battle' AND amount>0` + prédicat jour du point 3). Au-delà : on joue,
   XP=0, l'UI l'annonce (« mode entraînement » — même langage que le rejeu de quiz, commit
   `fc1f8df`).
5. **Plafond quotidien mini-jeux** : XP sur les **3 premières sessions créditées par jeu et par
   jour** ; au-delà XP=0 (le `cooldown_minutes` de `mini_game_types` reste appliqué en plus à la
   création de session).
6. **Plafond par paire** (anti-collusion M7) : max 2 battles créditées / jour / même paire.
7. **Plafond global implicite** : (5×30) + 3×(25+15+15) = 150 + 165 = **315 XP/jour maximum**
   via G4 (Quiz Rush 25, Memory 15, Vrai/Faux 15 — §7), soit moins d'un niveau aux niveaux
   moyens — la progression reste tirée par les quiz et missions.

Ces plafonds vivent dans les RPC (pas dans l'UI) ; l'UI ne fait que refléter
`xp_awarded` retourné.

### 6.3 Interaction avec la garde 169 existante

La mig 182 **réécrit** `add_xp_to_user` en reprenant mot pour mot la version 169 (comme 169 a
repris 060) et n'élargit QUE le prédicat de la garde. L'alias déprécié `add_user_xp` (095)
forwarde déjà et hérite. Le smoke-test du jalon J2 vérifie : double `resolve_battle` ⇒ un seul
crédit ; `add_xp_to_user('battle', même id)` direct ⇒ `xp_already_awarded`.

### 6.4 Crew ladder

À la résolution (`resolution='score'` ou `'forfeit'`) :

- `crew_members.challenges_won += 1` pour le gagnant (s'il a un crew actif) ;
- `crews.total_challenges_won += 1` ;
- via `update_crew_stats` (version canonique = mig 133 — NE PAS réécrire une variante locale).
- `crews.total_xp` continue de suivre l'XP des membres par le mécanisme existant (les crédits
  §6.1 y participent automatiquement) — aucune double écriture.
- Le cron `weekly-leaderboard-rollup` (`vercel.json:13`) reste inchangé en v1 ; le classement
  « crews par victoires » lit `crews.total_challenges_won` (déjà en base depuis 007).

---

## 7. Mini-jeux v1 (solo, `/teen/games`)

Trois jeux, tous servis par le même socle `game_sessions` + RPC (`create_game_session_v2`,
`complete_game_session`) et les mêmes plafonds §6.2. Aucun nouveau vendor : tout en
React + server routes.

### 7.1 Quiz Rush (`slug: quiz_rush`) — nouveau row `mini_game_types`

- **Boucle :** 10 questions tirées serveur de la banque modérée (RPC 173 en mode « léger » :
  sujets faibles du teen prioritaires), 10 s/question. Le client obtient chaque énoncé strippé,
  répond via la RPC `submit_game_answer(p_session_id, p_question_index, p_answer_index)` qui
  corrige serveur (relit `educational_quizzes.questions` en DEFINER) et **appende le verdict
  dans `game_sessions.answers`** (jsonb append-only, écrit exclusivement par cette RPC — c'est
  le stockage autoritaire par question, red-team #13 ; jamais la bonne réponse dans le payload
  avant soumission).
- **Fin :** `complete_game_session` calcule le score final côté serveur **à partir de
  `game_sessions.answers` uniquement** (aucun paramètre score/coups accepté), crédite
  `+10 à +25 XP` (`base_xp=20`).
- **Pourquoi lui :** réutilise 100 % du contenu modéré + le moteur de correction quiz existant ;
  c'est aussi la brique d'entraînement des battles (même gameplay).

### 7.2 Memory (`slug: memory`) — row existant (mig 011, `base_xp=30` → recalibré 15)

- **Boucle :** grille 4×4 de paires d'emojis ; le **layout est généré serveur** dans
  `game_sessions.seed` (ordre des cartes) et n'est jamais renvoyé en clair — le client demande
  `flip(i)` à une route qui répond la valeur de la carte ; ou variante v1 simplifiée : le layout
  est envoyé au client et la validation finale est une **plausibilité** (nb de coups ≥ minimum
  théorique, durée ≥ 10 s) — retenu : **variante simplifiée**, l'enjeu XP est faible (≤15) et
  plafonné, le coût d'une validation coup-par-coup n'est pas justifié (proportionnalité).
- ⚠️ **EXCEPTION EXPLICITE à M1** (red-team #16) : cette variante fait confiance aux
  coups/durée soumis par le client — c'est la SEULE surface G4 où un client peut influencer son
  crédit, bornée à 15 XP/session, 3 sessions/jour, idempotente. Elle est listée comme telle en
  §4 M1. Si un jour l'enjeu XP de Memory monte, basculer sur la variante `flip(i)` serveur.
- **Contenu :** sets d'emojis en code (`lib/games/memory-sets.ts`), zéro DB, zéro modération.

### 7.3 Vrai/Faux Sprint (`slug: vrai_faux`) — nouveau row (option, décision PO §9)

- **Boucle :** 15 affirmations dérivées de la banque modérée (question + bonne/mauvaise option),
  5 s chacune, correction serveur. `base_xp=15`.
- Si le PO le coupe, v1 sort avec 2 jeux — le socle ne change pas.

### 7.4 Catalogue honnête

J5 met à jour `mini_game_types` : `is_active=false` pour `music_quiz`, `predictions`,
`blindtest`, `emoji_guess`, `daily_quiz` (non construits — audio/événements indisponibles) ;
insère/active `quiz_rush`, `memory`, `vrai_faux`. La page `/teen/games` n'affiche QUE du jouable
(fin du « théâtre » constaté par l'audit).

---

## 8. Phasage d'implémentation (jalons → issues GitHub)

> Chaque jalon est autoporteur, avec critères de done **vérifiables**. Ordre strict
> **J0**→J1→J2→J3, puis J4 ∥ J5 (parallélisables), puis J6→J7→J8.
> Toutes les migrations suivent le style maison (en-tête contexte, BEGIN/COMMIT, idempotence,
> COMMENT ON, grants explicites, REVOKE anon) et sont appliquées via MCP Supabase.
> Numérotation : voir l'encart §3 (le train démarre à 180, `179` est déjà pris — re-vérifier
> le plus haut numéro libre à chaque jalon).

### J0 — Verrouiller la clé de réponses (mig 180) — BLOQUANT avant toute battle

Appliquer `180_quiz_answer_key_lockdown.sql` (§3.0 : privilèges par colonne sur
`educational_quizzes.questions` + RPC `get_quiz_questions_stripped`) et corriger les deux
routes solo qui fuient (`app/api/teen/quiz/categories/route.ts`, `app/api/teen/quiz/daily/route.ts`).

**Done :**
- [ ] `supabase.from('educational_quizzes').select('questions')` en `authenticated` ⇒
      `permission denied for column` (test SQL `set_config` + RAISE-rollback).
- [ ] `select('id, title, subject')` fonctionne toujours (colonnes non sensibles lisibles).
- [ ] `get_quiz_questions_stripped` : aucun champ `correct`/`explanation` dans le retour
      (assert jsonb).
- [ ] Réponses des routes categories/daily : grep `correct` sur le JSON de réponse ⇒ absent ;
      le flow quiz solo complet (categories → play → submit → XP) reste vert.
- [ ] RPC 173 (`recommend_quizzes_for_teen`) non régressée.
- [ ] `get_advisors` : aucune nouvelle trouvaille ; `tsc` + `lint` verts.

### J1 — Socle DB battles + games (mig 181)

Écrire et appliquer `181_battles_system.sql` : les 5 tables §3.1 (avec les colonnes
dénormalisées `creator_id`/`opponent_id` sur `battle_participants` et `answers` sur
`game_sessions`), index, RLS, publication Realtime, REVOKE anon.

**Done :**
- [ ] `to_regclass` renvoie non-null pour les 5 tables (garde V11).
- [ ] `SELECT` sur `battles` par un teen non-participant ⇒ 0 ligne ; par un participant ⇒ 1 ligne
      (test SQL `set_config('request.jwt.claims', …)` + RAISE-rollback, pattern smoke-test V6).
- [ ] Les policies SELECT de `battles`/`battle_participants` ne contiennent AUCUNE sous-requête
      (inspection `pg_policies.qual` — contrainte Realtime §3.1).
- [ ] `INSERT battles` direct en `authenticated` ⇒ erreur RLS.
- [ ] `battles` et `battle_participants` présents dans `pg_publication_tables`
      (`pubname='supabase_realtime'`) ; `battle_rounds` et `battle_answers` ABSENTS.
- [ ] `drift-lint` CI vert ; `get_advisors` : aucune nouvelle trouvaille sécurité.

### J2 — RPCs autorité serveur + garde XP (mig 182)

`create_battle`, `accept_battle`, `decline_battle`, `set_battle_ready`, `start_battle`,
`battle_round_seen`, `submit_battle_answer`, `advance_battle_round`, `claim_forfeit`,
`battle_heartbeat`, `resolve_battle` (interne), `create_game_session_v2`, `submit_game_answer`,
`complete_game_session` — toutes SECURITY DEFINER, search_path épinglé, grants §3.4-6.
Mig `182_xp_game_sources_guard.sql` (§6.2-1/6.3).

**Done (smoke-test SQL transactionnel, RAISE-rollback) :**
- [ ] `create_battle` vers un non-ami ⇒ erreur (y compris co-crew sans amitié `accepted` —
      périmètre §5.1-1) ; vers un bloqué ⇒ erreur ; 2e battle non résolue même paire ⇒ erreur ;
      3e création du jour même paire ⇒ erreur ; ré-invitation < 24 h après un `decline` ⇒ erreur.
- [ ] `create_battle`/`accept_battle` avec un uuid sans ligne `teens(id=auth.uid())` ⇒ erreur
      explicite `battle_identity_unsupported` (invariant §3.5, teens legacy).
- [ ] Bonne réponse absente de `current_payload` (assert jsonb).
- [ ] `submit_battle_answer` : après `LEAST(deadline+3s, round_seen_at+15s)` ⇒ rejet ; avec
      `round_seen_at` posé tard ⇒ fenêtre étendue de 3 s MAX ; double submit ⇒ pas de double
      ligne ni double score.
- [ ] `submit_battle_answer` ne modifie NI `score` NI `correct_count` sur
      `battle_participants` (assert : inchangés jusqu'à `advance_battle_round` — §3.4-4b).
- [ ] Battle complète scriptée (5 rounds, 2 joueurs) ⇒ `resolved`, scores serveur corrects,
      `xp_transactions` : 1 ligne +30 / 1 ligne +10 ; **re-appel `resolve_battle` ⇒ zéro crédit
      supplémentaire**.
- [ ] 6e battle du jour ⇒ `xp_awarded=0` les deux ; 3e battle créditée même paire ⇒ 0.
- [ ] Anti-TOCTOU §6.2-2 : les RPC de crédit contiennent `pg_advisory_xact_lock` avant les
      COUNT (inspection source) ; test concurrent si outillable, sinon revue de code explicite.
- [ ] Prédicat « jour » en `Africa/Casablanca` dans tous les COUNT de plafond (grep).
- [ ] `claim_forfeit` avec heartbeat adverse < 30 s ⇒ erreur ; > 30 s ⇒ resolved/forfeit, XP 15/0.
- [ ] Aucune référence à `user_coins`/`spend_coins`/`top_up_teen` dans les nouvelles RPC (grep).
- [ ] `update_crew_stats` appelé ⇒ `crew_members.challenges_won` et `crews.total_challenges_won`
      incrémentés (teen avec crew) ; pas d'erreur pour teen sans crew.

### J3 — Routes API + cron sweeper + notifications

`app/api/teen/battles/route.ts` (POST create, GET liste mes battles),
`[id]/{accept,decline,ready,start,seen,answer,advance,forfeit,heartbeat,react}/route.ts`
(`react` = rate-limit serveur ≤ 3/round et ≤ 10/battle + incrément `reactions_count` +
broadcast serveur — §3.2/§5.1-3) ;
cron `app/api/cron/battle-sweeper/route.ts` + `vercel.json` (`*/10 * * * *`) ;
inserts `user_notifications` (invitation, résultat) dans create/resolve.

**Done :**
- [ ] Chaque route : 401 sans session, 403 rôle non-teen, `logDbError` sur échec, zod sur body.
- [ ] `react` : 4e réaction du même round ⇒ 429 ; 11e de la battle ⇒ 429 ;
      `reactions_count` incrémenté en base.
- [ ] Sweeper (clé cron, pattern des crons existants) : battle `invited` créée avec
      `expires_at` passé ⇒ `expired` après appel ; `active` figée > 15 min ⇒ `expired`, 0 XP.
- [ ] Invitation ⇒ ligne `user_notifications` chez l'opponent (visible via le hook realtime
      existant sans modification).
- [ ] `tsc` + `lint` verts.

### J4 — UI battle 1v1

`/teen/games/battle/[id]/page.tsx` + client : fiche invitation (accepter/refuser), lobby
(présence + ready), écran de jeu (question, chrono §3.2, score live via `postgres_changes`,
réactions emoji si retenues), écran résultat (XP, bouton revanche = `create_battle`, bouton
Signaler §5.3). Entrée : bouton « Défier » sur `/teen/games` (picker limité aux amis
`accepted` — §5.1-1) + CTA depuis le profil d'un ami.

**Done :**
- [ ] **Pré-check latence Realtime (red-team #11, AVANT de finir l'UI)** : mesurer le délai
      UPDATE→événement `postgres_changes` sur `battles`/`battle_participants` avec les policies
      RLS réelles (2 clients, 20 rounds). Si p95 > 1,5 s, basculer le miroir sur broadcast
      émis serveur (les lignes Postgres restent l'autorité) et le documenter ici même.
- [ ] Parcours manuel 2 navigateurs (2 comptes teens amis) : invite → accept → lobby → 5 rounds
      → résultat, scores identiques des deux côtés, latence perçue < 1 s.
- [ ] Le score adverse ne bouge qu'à la clôture du round (observation UI, §3.4-4b).
- [ ] Bouton « couper les réactions » : les broadcasts reçus ne s'affichent plus (mute local).
- [ ] Fermer un onglet en plein round : l'autre voit « adversaire déconnecté » puis peut
      réclamer le forfait après 30 s.
- [ ] Un 3e compte (non participant) sur l'URL ⇒ redirection/404, et aucun événement realtime.
- [ ] Animations gated `useReducedMotion` (canon §9) ; responsive mobile 375px ; pas de texte
      libre nulle part.
- [ ] i18n : nouvelles clés `teen.games.battle.*` dans `messages/fr.json`.

### J5 — Mini-jeu Quiz Rush + catalogue honnête

Socle client mini-jeux (`/teen/games/[slug]`), Quiz Rush complet (§7.1), mise à jour du
catalogue `mini_game_types` (§7.4, mig 183 ou script admin).

**Done :**
- [ ] Session : création serveur (seed invisible), 10 questions SANS réponse dans le payload,
      correction par appel serveur, XP crédité une fois (`source_type='mini_game'`), 4e session
      du jour ⇒ `xp_awarded=0` affiché honnêtement (« entraînement »).
- [ ] `/teen/games` n'affiche plus AUCUN CTA disabled : tout ce qui est visible se joue.
- [ ] Stats de la page (`getUserGameStats`) reflètent les nouvelles sessions (adapter la lecture
      vers `game_sessions` — remplacer la lecture `weekly_game_leaderboard`).

### J6 — Mini-jeux Memory (+ Vrai/Faux si retenu)

§7.2 (+ §7.3). Réutilise intégralement le socle J5.

**Done :**
- [ ] Memory jouable E2E, XP plafonné, garde plausibilité (coups ≥ minimum, durée ≥ 10 s) testée
      en soumettant une complétion instantanée ⇒ XP=0 + session `completed` quand même.
- [ ] Vrai/Faux : correction serveur, mêmes asserts que Quiz Rush.

### J7 — Leaderboard & crew ladder UI

Onglet classement sur `/teen/games` : « Mes amis » et « Mon crew » (victoires battles + scores
mini-jeux hebdo), lecture `battle_participants`/`game_sessions` agrégés ou vue dédiée ;
carte crew : victoires du crew (`crews.total_challenges_won`).

**Done :**
- [ ] Aucun classement global public : les requêtes filtrent sur amis/crew (vérifié par test :
      un teen hors graphe n'apparaît jamais).
- [ ] Identités via le pattern mig 148 (`COALESCE(teens.pseudo, profiles.full_name)`), jamais
      `user_profiles`.

### J8 — Durcissement, détection différée & extinction du legacy

Étendre `app/api/teen/report/route.ts` (`resource_type='battle'`) + bouton Signaler (fait en J4,
vérifié ici E2E jusqu'à `moderation_queue`) ; `audit_log` M8 ; **détection différée anti-triche
(red-team #2/#4)** : job (cron quotidien ou requête à la résolution) qui écrit dans `audit_log` :
(a) `battle.suspect_pattern` — teen avec ≥ 10 battles, justesse ≥ 95 % ET variance `response_ms`
anormalement faible (bot calibré) ; (b) `battle.suspect_collusion` — paire avec ≥ 5 battles,
victoires unilatérales ≥ 90 % ET réponses du perdant systématiquement fausses (throw) ; surface
admin de revue (liste lisant `audit_log`, pattern `app/admin/defis-sportifs/`) ; mig 184 :
`REVOKE EXECUTE … FROM authenticated` sur `create_game_session`, `join_game_session`,
`start_game_session`, `submit_game_score` (mig 011) + `COMMENT ON … 'DEPRECATED G4'` (on ne
DROP pas — canon « mention dead code, don't delete » pour les tables ; les RPC d'écriture
dangereuses, elles, sont révoquées).

**Done :**
- [ ] 3 signalements d'une même battle ⇒ ligne `moderation_queue` visible dans
      `app/admin/moderation/`.
- [ ] Détection différée : jeu de données synthétique (bot 100 % juste à vitesse constante ;
      paire 6 battles throw) ⇒ 2 lignes `audit_log` attendues ; un duo légitime (justesse ~60 %,
      variance normale) ⇒ 0 ligne.
- [ ] `supabase.rpc('submit_game_score', …)` en authenticated ⇒ permission denied.
- [ ] `get_advisors` sécurité : pas de régression ; grep repo : aucun appel restant aux RPC
      révoquées (`gamification-system/features/mini-games/actions.ts:90-307` réécrit vers le
      socle v2 ou supprimé de la surface).
- [ ] `next build` + `tsc` + `lint` + garde charte + drift-lint verts (gate de fin de vague).

---

## 9. Décisions PO ouvertes

> Défauts appliqués si non tranchés avant J2 (barème XP) / J4 (UX). Aucune ne bloque J1.

| # | Décision | Options | Recommandation | Défaut si non tranché |
|---|---|---|---|---|
| P1 | Barème XP battles (win/lose/draw/forfeit) | libres | 30/10/15/15-0 (§6.1) — sous le quiz solo pour garder l'école en tête | 30/10/15/15-0 |
| P2 | Plafonds quotidiens | libres | 5 battles + 3 sessions/jeu + 2/paire (§6.2) | idem reco |
| P3 | Périmètre adversaires v1 | amis `accepted` seulement · amis+crew (avec opt-in « battles crew ») · matchmaking public | **amis `accepted` seulement** — le co-crew n'est PAS un consentement mutuel (`crews.is_public DEFAULT true`, membres jamais acceptés bilatéralement — red-team #7) ; le réintroduire exige un opt-in dédié + invariant identité §3.5 (crew_members → profiles). Jamais de public pour des mineurs | amis `accepted` seulement |
| P4 | Réactions emoji pendant la battle | oui (set fermé de 6, rate-limité + compté) · non (zéro interaction) | oui — seul « liant » social, sans texte ; le rate-limit serveur + compteur persisté + mute local (§5.1-3) bornent le spam moqueur | oui, set fermé rate-limité |
| P5 | Vrai/Faux Sprint en v1 | v1 · v1.1 | v1 si le planning tient après J5, sinon glisser | inclus (J6) |
| P6 | Rounds/durée d'une battle | libres | 5 rounds × 15 s (~2 min) | 5 × 15 s |
| P7 | Nombre de mini-jeux quotidiens XP (cooldowns) | libres | garder `cooldown_minutes` du catalogue + plafonds §6.2 | idem |
| P8 | Visibilité leaderboard | amis+crew · global anonymisé · global | **amis+crew uniquement** (privacy mineurs) | amis+crew |
| P9 | Battles crew-vs-crew (N joueurs) | v1 · v2 | **v2** — le 1v1 doit prouver la rétention d'abord ; le copy « Affronte ton crew » reste au futur ou est adouci | v2 (hors périmètre) |
| P10 | Quiet hours / limite de temps | aucune · plage bloquée · visible parent | aucune en v1 ; instrumenter (sessions/jour en analytics) pour décider en connaissance | aucune v1 |
| P11 | Sort des tables legacy mig 011 (`mini_game_sessions`…) | drop · conserver révoquées | conserver + révoquer les RPC d'écriture (J8), drop dans un ménage ultérieur | conserver révoquées |
| P12 | Revanche immédiate (bouton « Rejouer ») | oui · non | oui, mais elle compte dans les plafonds §6.2 (dont 2/paire) | oui |

---

## 10. Risques & hors-périmètre v1

### Risques

| Risque | Sévérité | Mitigation |
|---|---|---|
| Latence Realtime (3G marocaine) rend le « synchrone » frustrant | Moyenne | Deadline personnelle ancrée sur `round_seen_at` (extension plafonnée +3 s, §3.4-2) ; `response_ms` mesuré depuis la réception, pas depuis l'émission ; bonus vitesse plafonné (50 pts) ; UI optimiste sur SA propre réponse uniquement. **Iniquité résiduelle assumée** : le payload peut être lu quelques instants avant l'ack (gain ≤ 3 s, visible dans les données) |
| `postgres_changes` + RLS à l'échelle : la policy est réévaluée par événement et par abonné, une publication sur table globale est le goulot connu à l'échelle (red-team #11) | **Moyenne** (pas « Faible » : le premier pic peut dégrader tous les matchs en cours) | Policies SELECT SANS sous-requête (dénormalisation §3.1, vérifiée en J1) ; pré-check de latence mesuré en J4 AVANT de finir l'UI, bascule broadcast-émis-serveur documentée si p95 > 1,5 s ; channels par battle, désabonnement à la résolution ; surveiller le dashboard Supabase |
| Pas de ticker serveur (stack sans worker) : un round peut « rester ouvert » si les 2 clients partent | Moyenne | `advance_battle_round` idempotent appelable par n'importe quel participant + sweeper 10 min en filet (§3.3) |
| **Collusion « throw » non bloquée en ligne** : un binôme complice peut se garantir ~150 XP/jour (5 victoires plafonnées) sans compétence — les plafonds bornent, ne détectent pas (red-team #4) | Moyenne (résidu assumé) | XP faible, non transférable, jamais convertible (canon) ; détection différée J8 (`battle.suspect_collusion`) + revue humaine ; pas de sanction automatique v1 |
| **Pseudos non modérés a priori** : un pseudo injurieux peut être affiché à un mineur pendant/après une battle avant tout signalement (red-team #9) | Moyenne | Hors périmètre G4 (chantier transverse profil) : ajouter un filtre liste noire fr/darija à la création/renommage de pseudo — À TRACER comme issue séparée hors milestone ; en attendant, canal réactif §5.3 (signalement → modération profil) |
| Le plafond par paire (M7) frustre deux vrais amis assidus | Faible | le jeu reste possible (XP=0 affiché « entraînement ») — même politique produit que le rejeu quiz |
| Banque de quiz : 104 quiz suffisent-ils pour battles + Quiz Rush + quiz solo sans lassitude ? | Moyenne | la RPC 173 espace les répétitions ; le pipeline G3 (seed inactif → modération humaine) permet d'étendre la banque sans code |
| Décalage horloge client → chrono affiché faux de ± qq 100 ms | Faible | cosmétique uniquement (validité = serveur) ; offset estimé §3.2 |
| Multi-comptes pour se battre soi-même | Faible | coût élevé (validation parentale V11) ; plafonds/paire limitent le gain ; accepté v1 (M13) |
| Teens legacy (`teens.id ≠ auth.uid()`, mig 000) exclus de fait des battles | Faible (population résiduelle) | Erreur explicite `battle_identity_unsupported` (§3.5), jamais d'échec silencieux ; migration d'identité = chantier séparé déjà tracé (drift schéma) |

### Hors-périmètre v1 (explicite)

- **Battles crew-vs-crew / N > 2** (P9) — le modèle de données le permet plus tard
  (table `battle_participants` séparée), mais rien n'est construit.
- **Matchmaking public / adversaires inconnus** — interdit v1 (mineurs).
- **Chat, texte libre, vocal, images** dans battles et mini-jeux — interdit (pas « reporté »).
- **Spectateurs** de battle.
- **Récompenses en coins, lootboxes, roue** (`gamification-system/features/wheel/` reste
  débranché) — contraire au canon économique.
- **Jeux nécessitant de l'audio** (blindtest, music_quiz) — pas d'assets, désactivés au
  catalogue (§7.4).
- **Tournois, saisons, classement global** — attendre les données de rétention v1.
- **Branchement des battles sur `user_challenges`** (« Gagne 1 battle » comme quête
  quotidienne) — hook naturel post-v1, noté pour le moteur unique, non câblé en v1.
- **Notifications push natives** dédiées battles au-delà du fan-out `user_notifications`
  existant.

---

## 11. Journal red-team (passe du 2026-07-12)

Un red-team indépendant a attaqué cette spec sur 4 axes (triche, mineurs, faisabilité, canon).
18 trouvailles, toutes traitées ci-dessous. Statut : **intégré** = la spec a été corrigée ;
**résidu assumé** = documenté en §10, pas de contre-mesure v1.

| # | Sévérité | Trouvaille | Réponse de la spec |
|---|---|---|---|
| 1 | HAUTE | La clé de réponses (`educational_quizzes.questions.correct`) est lisible par tout ado via la RLS 022 (+ routes solo categories/daily qui renvoient `questions`) — M2 était du théâtre | **Intégré** : nouveau jalon **J0 bloquant** + mig `180_quiz_answer_key_lockdown` (privilèges par colonne, RPC `get_quiz_questions_stripped`, correction des 2 routes) — §2.3, §3.0, §4 M2, §8 J0 |
| 2 | HAUTE | Plancher anti-bot 250 ms trivialement esquivable (bot « à allure humaine ») et non cumulé entre battles | **Intégré** : détection cross-battle J8 (`battle.suspect_pattern` : justesse ≥ 95 % + variance `response_ms` faible sur 10 battles → file admin) ; le plancher par-battle reste comme 1re couche — §4 M8, §8 J8 |
| 3 | MOYENNE | TOCTOU sur les plafonds quotidiens/par-paire (2 `resolve_battle` simultanés lisent COUNT=4 et créditent tous deux) | **Intégré** : `pg_advisory_xact_lock` par teen AVANT tout COUNT de plafond, locks pris en ordre lexicographique pour les 2 teens d'une battle — §6.2-2, done J2 |
| 4 | MOYENNE | Collusion « throw » : les plafonds bornent la quantité, rien ne détecte le perdant volontaire (150 XP/jour garantis) | **Intégré (détection) + résidu assumé (pas de blocage en ligne)** : détection différée J8 (`battle.suspect_collusion`), revue humaine, résidu explicite — §4 M7, §8 J8, §10 |
| 5 | BASSE | Fuite mi-round : l'incrément `correct_count` adverse révèle que la bonne réponse a été trouvée | **Intégré** : `score`/`correct_count` publiés uniquement à la clôture du round par `advance_battle_round` ; mi-round, seul `answered_current` bouge — §3.2, §3.4-4b, done J2/J4 |
| 6 | HAUTE→MOY. | Quota d'invitations global (10/jour) concentrable sur UNE victime + ré-invitation immédiate après refus | **Intégré** : plafond par paire (≤ 2 créations/jour) + cooldown 24 h après `decline`, AVANT le plafond global — §3.3, §4 M9, §5.1-2, done J2 |
| 7 | MOYENNE | « co-crew » ≠ consentement mutuel (`crews.is_public DEFAULT true`) : porte dérobée du « jamais d'inconnu » | **Intégré** : périmètre v1 réduit aux amis `accepted` uniquement ; co-crew repoussé derrière un opt-in dédié (P3) — §3.3, §5.1-1, §9 P3 |
| 8 | MOYENNE | Réactions emoji ni limitées ni tracées ⇒ spam moqueur non-auditable | **Intégré** : route `react` rate-limitée serveur (3/round, 10/battle), `reactions_count` + tally persistés, mute local — §3.2, §5.1-3, §5.3, §8 J3/J4 |
| 9 | BASSE→MOY. | Pseudos non modérés a priori, vus par l'adversaire | **Résidu assumé + chantier hors périmètre** : limite documentée §5.1-4, risque §10 (filtre pseudo = issue transverse séparée) ; canal réactif §5.3 |
| 10 | HAUTE | Collision de numéros de migration (179 déjà pris par `179_parental_limits_caps.sql`) | **Intégré** : train renuméroté 180-184 + consigne de re-vérifier le plus haut numéro à chaque jalon — encart §3, §8 |
| 11 | MOY.→HAUTE | RLS jointe sur `battle_participants` + limites connues de `postgres_changes` (policy réévaluée par événement/abonné) | **Intégré** : dénormalisation `creator_id`/`opponent_id` (RLS = comparaison simple, vérifiée dans `pg_policies` en J1), `battle_rounds` hors publication, pré-check latence J4 avec bascule broadcast-serveur documentée, sévérité §10 relevée à Moyenne — §3.1, §8 J1/J4, §10 |
| 12 | MOYENNE | Dualité d'identité `teens.id` vs `auth.uid()` (teens legacy mig 000) jamais traitée : battles cassées silencieusement pour eux | **Intégré** : §3.5 « Invariant identité » (garde explicite `battle_identity_unsupported`, périmètre amis-only qui neutralise le cas crew, helper mig 148/`resolveTeenIdentities`), risque §10 — done J2 |
| 13 | MOYENNE | Pas de stockage serveur autoritaire des réponses solo (§7.1 contredisait la DDL) | **Intégré** : colonne `game_sessions.answers` (append-only, écrite exclusivement par la nouvelle RPC `submit_game_answer`) ; `complete_game_session` ne dérive le score QUE de ce champ — §3.1, §7.1, §8 J2 |
| 14 | MOYENNE | Latence asymétrique 3G : deadline unique figée = moins de temps réel + `response_ms` gonflé pour la connexion lente | **Intégré** : accusé de réception `battle_round_seen`, deadline personnelle `LEAST(deadline+3s, seen+15s)`, `response_ms` depuis la réception, extension plafonnée +3 s ; iniquité résiduelle documentée — §3.2, §3.4-2, §4 M3, §10 |
| 15 | BASSE | Colonne fantôme `battles.updated_at` dans le calcul d'offset §3.2 | **Intégré** : offset calculé sur `accepted_at`/`battle_rounds.started_at` (colonnes réelles) — §3.2 |
| 16 | BASSE | Memory (plausibilité client) viole la lettre de M1 sans le dire | **Intégré** : exception explicite et bornée (≤ 15 XP, 3/jour) listée dans M1 et §7.2 |
| 17 | BASSE | Arithmétique du plafond global fausse (375 au lieu de 315) | **Intégré** : corrigé à 315 avec le détail du calcul — §6.2-7 |
| 18 | BASSE | « Jour » des plafonds = `current_date` UTC (reset 01:00 heure marocaine) | **Intégré** : jour défini en `Africa/Casablanca` dans tous les prédicats de plafond — §6.2-3, done J2 |

Verrous confirmés sans reproche par le red-team (inchangés) : aucune RPC ne touche
`user_coins` ; garde d'idempotence 169 généralisable par `(teen, source_type, source_id)` ;
révocation J8 de `submit_game_score` justifiée (confiance `p_score` + écrit `user_profiles`
morte, `011:461`) ; CTA `disabled` et lectures `getMiniGameTypes`/`getUserGameStats`/
`weekly_game_leaderboard` exacts.

---

*Fin de spec. Toute déviation de §1 (canon) est un bug ; toute déviation de §3-§7 se discute
en PR avec mise à jour de ce document dans le même commit (règle des docs canon).*
