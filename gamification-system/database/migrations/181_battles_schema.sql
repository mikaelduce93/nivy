-- ============================================================================
-- Migration 181 — G4-B1 : socle DB des battles 1v1 synchrones + sessions
--                  mini-jeux solo (5 tables, RLS, Realtime, index)
-- ============================================================================
-- ⚠️ À APPLIQUER — fichier écrit le 2026-07-12, PAS encore appliqué à la base
-- (mission G4-B1 : fichiers de migration seulement, aucune application).
--
-- Autorité : docs/specs/SPEC-G4-BATTLES-MINIJEUX.md §3.1 (DDL), §3.2
-- (protocole), §4 (menaces M1-M13), §11 (journal red-team). Défauts PO
-- P1-P12 adoptés (5 rounds × 15 s, plafonds 5/j + 2/paire/j, amis
-- `accepted` uniquement, jour anti-farm Africa/Casablanca).
--
-- Décisions structurantes reprises de la spec :
--   * Nouvelles tables dédiées — on ne ressuscite PAS mini_game_sessions
--     (mig 011 : RPC d'écriture qui fait confiance au client, RLS publique,
--     pas de rounds). Le catalogue mini_game_types est conservé en lecture.
--   * [red-team #11] battle_participants dénormalise creator_id/opponent_id
--     pour que la RLS SELECT soit une comparaison simple SANS sous-requête :
--     postgres_changes réévalue la policy par événement et par abonné.
--   * Publication Realtime : battles + battle_participants UNIQUEMENT.
--     battle_rounds et battle_answers n'y sont PAS (leur policy peut joindre).
--   * [red-team #5] score/correct_count ne bougent qu'à la CLÔTURE du round
--     (écrits par advance_battle_round, mig 182) — jamais au submit.
--   * [red-team #13] game_sessions.answers = stockage AUTORITAIRE des
--     réponses solo, append-only, écrit exclusivement par submit_game_answer.
--
-- Écarts assumés vs le DDL « esquissé » §3.1 (la spec précise que J1 écrit
-- le DDL en entier) — justifiés dans les COMMENT ON :
--   * battles.declined_at : nécessaire au cooldown 24 h post-refus (§4 M9) —
--     sans marqueur, un decline serait indistinguable d'un cancel créateur.
--   * battle_participants.reactions_tally : §5.1-3/§5.3 exigent le tally PAR
--     emoji persisté (auditabilité du spam moqueur), en plus du compteur.
--   * FK composite battle_answers→battle_rounds en ON DELETE CASCADE, pour
--     que la chaîne teens → battles → battle_rounds → battle_answers casse
--     proprement.
--
-- Idempotent : CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS,
-- CREATE INDEX IF NOT EXISTS, DO-blocks gardés pour la publication.
-- ============================================================================

BEGIN;

-- Garde (pattern V11/180) : prérequis FK — ne rien créer sur une base
-- incomplète, échec explicite plutôt qu'une erreur FK cryptique.
DO $$
BEGIN
  IF to_regclass('public.teens') IS NULL
     OR to_regclass('public.educational_quizzes') IS NULL
     OR to_regclass('public.xp_transactions') IS NULL THEN
    RAISE EXCEPTION 'prérequis manquants (teens / educational_quizzes / xp_transactions) — appliquer les migrations de base d''abord';
  END IF;
END $$;

-- ============================================================================
-- 1) TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- battles — une ligne par battle 1v1 (état + question courante strippée)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.battles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            varchar(30) NOT NULL DEFAULT 'quiz_battle'
                  CHECK (kind IN ('quiz_battle')),          -- v1 : un seul mode
  status          varchar(20) NOT NULL DEFAULT 'invited'
                  CHECK (status IN ('invited','lobby','active','resolved','cancelled','expired')),
  creator_id      uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  opponent_id     uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  quiz_id         uuid NOT NULL REFERENCES public.educational_quizzes(id),
  rounds_total    integer NOT NULL DEFAULT 5 CHECK (rounds_total BETWEEN 3 AND 10), -- PO P6 : 5 rounds
  current_round   integer NOT NULL DEFAULT 0,
  round_deadline  timestamptz,           -- deadline serveur du round courant
  -- [M2] current_payload est construit par les RPC (mig 182) en WHITELIST
  -- (question + options uniquement) : les champs correct/explanation du JSONB
  -- educational_quizzes.questions n'y entrent JAMAIS. Combiné au lockdown J0
  -- (mig 180 : colonne questions illisible pour authenticated), la bonne
  -- réponse n'est lisible par AUCUN chemin client pendant la battle.
  current_payload jsonb,                 -- question du round courant SANS la bonne réponse
  winner_id       uuid REFERENCES public.teens(id),
  is_draw         boolean NOT NULL DEFAULT false,
  resolution      varchar(20) CHECK (resolution IN ('score','forfeit','expired')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  accepted_at     timestamptz,
  started_at      timestamptz,
  resolved_at     timestamptz,
  declined_at     timestamptz,           -- posé par decline_battle (base du cooldown 24 h, §4 M9)
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '24 hours', -- TTL invitation
  CONSTRAINT battles_distinct_players CHECK (creator_id <> opponent_id)
);

COMMENT ON TABLE public.battles IS
  'G4 (spec SPEC-G4-BATTLES-MINIJEUX §3.1) : battles 1v1 synchrones. Toutes les écritures passent par les RPC SECURITY DEFINER de la mig 182 — aucune policy d''écriture authenticated. Publiée en Realtime (postgres_changes), RLS SELECT = comparaison simple sans sous-requête.';
COMMENT ON COLUMN public.battles.current_payload IS
  '[M2] Question du round courant strippée (whitelist question+options, jamais correct/explanation). Construite serveur par start_battle/advance_battle_round.';
COMMENT ON COLUMN public.battles.round_deadline IS
  'Deadline serveur COMMUNE du round courant (started_at + 15 s). La validité d''une réponse est tranchée par la deadline PERSONNELLE LEAST(deadline+3s, round_seen_at+15s) dans submit_battle_answer (§3.4-2).';
COMMENT ON COLUMN public.battles.declined_at IS
  'Écart assumé vs DDL esquissé §3.1 : marqueur du refus par l''opponent, requis par la garde cooldown 24 h post-decline de create_battle (§4 M9). Un cancel créateur ne le pose PAS.';
COMMENT ON COLUMN public.battles.expires_at IS
  'TTL de l''invitation (24 h). Le sweeper (sweep_battles, service_role) passe invited/lobby/active figées en expired — 0 XP.';

-- ----------------------------------------------------------------------------
-- battle_participants — 2 lignes par battle (état par joueur, scores publiés
-- à la clôture du round seulement)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.battle_participants (
  battle_id        uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  teen_id          uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  -- Dénormalisation VOLONTAIRE (red-team #11) : la RLS SELECT de cette table
  -- doit être une comparaison simple (auth.uid() = creator_id OR auth.uid() =
  -- opponent_id) SANS sous-requête jointe vers battles — postgres_changes
  -- réévalue la policy par événement et par abonné, les policies jointes y
  -- sont le cas le plus lent/fragile. Colonnes posées par create_battle,
  -- jamais modifiées ensuite.
  creator_id       uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  opponent_id      uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  score            integer NOT NULL DEFAULT 0,      -- mis à jour à la CLÔTURE du round (§3.4-4b), pas au submit
  correct_count    integer NOT NULL DEFAULT 0,      -- idem : jamais mi-round (fuite d'info, red-team #5)
  answered_current boolean NOT NULL DEFAULT false,  -- flag "a répondu au round courant" (seul signal mi-round)
  round_seen_at    timestamptz,                     -- accusé de réception de la question courante (§3.4-2, équité 3G)
  is_ready         boolean NOT NULL DEFAULT false,  -- lobby
  last_seen_at     timestamptz,                     -- heartbeat (détection abandon, forfait §3.3)
  reactions_count  integer NOT NULL DEFAULT 0,      -- compteur persisté pour revue abus (§5.1-3)
  reactions_tally  jsonb NOT NULL DEFAULT '{}'::jsonb, -- tally par emoji (§5.1-3/§5.3 : le spam moqueur est auditable)
  xp_awarded       integer NOT NULL DEFAULT 0,
  PRIMARY KEY (battle_id, teen_id)
);

COMMENT ON TABLE public.battle_participants IS
  'G4 §3.1 : état par joueur d''une battle. creator_id/opponent_id dénormalisés (red-team #11) pour une RLS Realtime sans sous-requête. score/correct_count écrits UNIQUEMENT par advance_battle_round à la clôture du round (red-team #5).';
COMMENT ON COLUMN public.battle_participants.round_seen_at IS
  'Accusé de réception de la question courante (battle_round_seen). Base de la deadline personnelle LEAST(deadline+3s, seen+15s) et du response_ms (§3.4-2, équité 3G).';
COMMENT ON COLUMN public.battle_participants.reactions_tally IS
  'Écart assumé vs DDL esquissé §3.1 : répartition par emoji des réactions envoyées par CE participant, exigée persistée par §5.1-3/§5.3 (signalement « il m''a spammé de 😂 » vérifiable). Alimentée par la route react (J3), set fermé de 6 emojis, rate-limit serveur.';

-- ----------------------------------------------------------------------------
-- battle_rounds — un round = une question tirée du quiz (autorité chrono)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.battle_rounds (
  battle_id      uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  round_no       integer NOT NULL,
  question_index integer NOT NULL,       -- index dans educational_quizzes.questions
  started_at     timestamptz NOT NULL,
  deadline       timestamptz NOT NULL,
  PRIMARY KEY (battle_id, round_no)
);

COMMENT ON TABLE public.battle_rounds IS
  'G4 §3.1 : chrono serveur par round. PAS publiée en Realtime — sa policy SELECT peut donc joindre battles. question_index seul ne fuit rien : la colonne educational_quizzes.questions est illisible pour authenticated depuis J0 (mig 180).';

-- ----------------------------------------------------------------------------
-- battle_answers — réponses corrigées SERVEUR (self-only en lecture)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.battle_answers (
  battle_id    uuid NOT NULL,
  round_no     integer NOT NULL,
  teen_id      uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  answer_index integer NOT NULL,
  is_correct   boolean NOT NULL,
  response_ms  integer NOT NULL,         -- calculé SERVEUR : now() - GREATEST(round.started_at, round_seen_at) (§3.4-2)
  submitted_at timestamptz NOT NULL DEFAULT now(),
  -- [M4] la PK rend le double-submit/replay structurellement inoffensif :
  -- la RPC submit_battle_answer fait ON CONFLICT DO NOTHING et renvoie
  -- l'état sans rien recréditer.
  PRIMARY KEY (battle_id, round_no, teen_id),
  FOREIGN KEY (battle_id, round_no)
    REFERENCES public.battle_rounds(battle_id, round_no) ON DELETE CASCADE
);

COMMENT ON TABLE public.battle_answers IS
  'G4 §3.1 : réponses corrigées serveur. [M4] PK (battle_id, round_no, teen_id) = anti double-submit. RLS SELECT self-only : on ne voit JAMAIS la ligne de l''adversaire (le score adverse arrive agrégé via battle_participants à la clôture du round).';
COMMENT ON COLUMN public.battle_answers.response_ms IS
  '[M5] Calculé exclusivement par submit_battle_answer à partir de now() serveur — l''horloge client n''entre dans aucun calcul de validité ni de vitesse.';

-- ----------------------------------------------------------------------------
-- game_sessions — sessions mini-jeux solo (remplace l'usage écriture de
-- mini_game_sessions, mig 011, abandonné)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id      uuid NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  game_slug    varchar(50) NOT NULL,     -- FK logique vers mini_game_types.slug
  -- [M11] seed choisi PAR LE SERVEUR à la création (create_game_session_v2) :
  -- ids de questions, layout memory. SELECT self-only ⇒ impossible de deviner
  -- le contenu d'un mini-jeu avant de jouer ; pour Quiz Rush les réponses
  -- sont corrigées en RPC exactement comme M2.
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

COMMENT ON TABLE public.game_sessions IS
  'G4 §3.1 : sessions mini-jeux solo. [M11] seed serveur self-only. [M1/red-team #13] answers = stockage autoritaire append-only écrit par submit_game_answer ; complete_game_session dérive le score de CE champ uniquement, jamais d''un paramètre client.';
COMMENT ON COLUMN public.game_sessions.answers IS
  '[M1] Verdicts par question, append-only, écrits exclusivement par submit_game_answer (correction serveur). Seule source du score final.';

-- ============================================================================
-- 2) PUBLICATION REALTIME — battles + battle_participants UNIQUEMENT
--    (battle_rounds et battle_answers restent HORS publication — §3.1)
-- ============================================================================
-- Realtime : les clients s'abonnent aux changements de CES DEUX tables
-- uniquement. postgres_changes respecte la RLS — seuls les deux participants
-- reçoivent les événements de leur battle.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'battles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'battle_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_participants;
  END IF;
END $$;

-- ============================================================================
-- 3) RLS — lecture participants-only, ZÉRO policy d'écriture authenticated
-- ============================================================================
-- [M10] Écriture directe des tables (contournement RPC) : aucune policy
-- INSERT/UPDATE/DELETE pour authenticated sur les 5 tables — RLS deny-default,
-- toutes les écritures passent par les RPC SECURITY DEFINER de la mig 182 qui
-- revérifient auth.uid() en interne (pattern _debit_teen_coins, V6). Les
-- REVOKE de la section 4 doublent la ceinture au niveau des privilèges.

ALTER TABLE public.battles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_rounds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_answers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions       ENABLE ROW LEVEL SECURITY;

-- battles : SELECT participants only. COMPARAISON SIMPLE sur colonnes locales,
-- AUCUNE sous-requête (contrainte Realtime, red-team #11 — vérifiable dans
-- pg_policies.qual).
DROP POLICY IF EXISTS battles_participant_read ON public.battles;
CREATE POLICY battles_participant_read ON public.battles
  FOR SELECT TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

-- battle_participants : idem — les colonnes dénormalisées creator_id/
-- opponent_id existent précisément pour éviter toute jointure ici
-- (red-team #11).
DROP POLICY IF EXISTS battle_participants_participant_read ON public.battle_participants;
CREATE POLICY battle_participants_participant_read ON public.battle_participants
  FOR SELECT TO authenticated
  USING (auth.uid() = creator_id OR auth.uid() = opponent_id);

-- battle_rounds : PAS publiée en Realtime ⇒ sa policy peut joindre battles.
DROP POLICY IF EXISTS battle_rounds_participant_read ON public.battle_rounds;
CREATE POLICY battle_rounds_participant_read ON public.battle_rounds
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.battles b
      WHERE b.id = battle_rounds.battle_id
        AND (auth.uid() = b.creator_id OR auth.uid() = b.opponent_id)
    )
  );

-- [M2] battle_answers : SELECT ses PROPRES lignes seulement — on ne voit
-- jamais la réponse (ni la justesse) de l'adversaire en cours de round ;
-- le score adverse arrive agrégé via battle_participants à la clôture du
-- round (red-team #5).
DROP POLICY IF EXISTS battle_answers_self_read ON public.battle_answers;
CREATE POLICY battle_answers_self_read ON public.battle_answers
  FOR SELECT TO authenticated
  USING (teen_id = auth.uid());

-- [M11] game_sessions : SELECT self-only (le seed d'un autre teen est
-- invisible ; le sien ne contient jamais les bonnes réponses — juste des
-- références quiz_id/question_index, illisibles depuis J0).
DROP POLICY IF EXISTS game_sessions_self_read ON public.game_sessions;
CREATE POLICY game_sessions_self_read ON public.game_sessions
  FOR SELECT TO authenticated
  USING (teen_id = auth.uid());

-- ============================================================================
-- 4) PRIVILÈGES — REVOKE anon (canon V8 : zéro surface pré-auth) + ceinture
--    écriture authenticated
-- ============================================================================
REVOKE ALL ON public.battles             FROM anon;
REVOKE ALL ON public.battle_participants FROM anon;
REVOKE ALL ON public.battle_rounds       FROM anon;
REVOKE ALL ON public.battle_answers      FROM anon;
REVOKE ALL ON public.game_sessions       FROM anon;

-- [M10] double ceinture : même si une policy d'écriture apparaissait un jour
-- par erreur, authenticated n'a plus le privilège table pour écrire.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.battles             FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.battle_participants FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.battle_rounds       FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.battle_answers      FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.game_sessions       FROM authenticated;

GRANT SELECT ON public.battles             TO authenticated;
GRANT SELECT ON public.battle_participants TO authenticated;
GRANT SELECT ON public.battle_rounds       TO authenticated;
GRANT SELECT ON public.battle_answers      TO authenticated;
GRANT SELECT ON public.game_sessions       TO authenticated;

-- ============================================================================
-- 5) INDEX
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_battles_creator  ON public.battles (creator_id, status);
CREATE INDEX IF NOT EXISTS idx_battles_opponent ON public.battles (opponent_id, status);
CREATE INDEX IF NOT EXISTS idx_battles_sweeper  ON public.battles (status, expires_at)
  WHERE status IN ('invited','lobby','active');
CREATE INDEX IF NOT EXISTS idx_game_sessions_teen_day ON public.game_sessions (teen_id, game_slug, started_at);

-- [M6] Anti-farm : lookups ledger des gardes d'idempotence et des plafonds
-- quotidiens (§6.2) — pendant battle/mini_game de l'index partiel quiz posé
-- par la mig 169.
CREATE INDEX IF NOT EXISTS idx_xp_transactions_game_sources
  ON public.xp_transactions (teen_id, source_type, created_at)
  WHERE source_type IN ('battle','mini_game');

COMMIT;

-- ============================================================================
-- VÉRIFICATION (à exécuter À L'APPLICATION — critères de done J1, pattern
-- smoke-test set_config + RAISE-rollback V6). Ne fait PAS partie de la
-- migration.
-- ============================================================================
-- -- 1. Les 5 tables existent (garde V11) :
-- SELECT to_regclass('public.battles'), to_regclass('public.battle_participants'),
--        to_regclass('public.battle_rounds'), to_regclass('public.battle_answers'),
--        to_regclass('public.game_sessions');   -- attendu : 5 non-null
--
-- -- 2. Publication Realtime : battles + battle_participants PRÉSENTS,
-- --    battle_rounds + battle_answers + game_sessions ABSENTS :
-- SELECT tablename FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime'
--   AND tablename IN ('battles','battle_participants','battle_rounds',
--                     'battle_answers','game_sessions');
--
-- -- 3. Policies SELECT de battles/battle_participants SANS sous-requête
-- --    (contrainte Realtime §3.1, red-team #11) :
-- SELECT tablename, policyname, qual FROM pg_policies
-- WHERE tablename IN ('battles','battle_participants');
-- -- attendu : qual = comparaisons simples auth.uid() = col, aucun SELECT.
--
-- -- 4. RLS lecture + écriture directe (RAISE-rollback) :
-- -- BEGIN;
-- -- SELECT set_config('request.jwt.claims',
-- --        '{"sub":"<uuid_teen_non_participant>","role":"authenticated"}', true);
-- -- SET LOCAL ROLE authenticated;
-- -- SELECT count(*) FROM public.battles;              -- attendu : 0 ligne visible
-- -- INSERT INTO public.battles (creator_id, opponent_id, quiz_id)
-- --   VALUES ('<a>','<b>','<quiz>');                  -- attendu : 42501 permission denied
-- -- ROLLBACK;
-- ============================================================================
