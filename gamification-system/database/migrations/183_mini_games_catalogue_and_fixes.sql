-- ============================================================================
-- Migration 183 — G4-complétion-B : catalogue honnête mini-jeux (§7.4, J5),
--                  fix Vrai/Faux (verdict réel, plus jamais aléatoire — §7.3),
--                  garde plausibilité Memory (§7.2, J6) et fix action_url
--                  des notifications battles (/teen/battles/…)
-- ============================================================================
-- ⚠️ À APPLIQUER — fichier écrit le 2026-07-12, PAS encore appliqué à la base
-- (mission G4-complétion-B : fichiers de migration seulement, aucune
-- application).
-- Dépend de : 181_battles_schema.sql (tables) + 182_battles_rpcs.sql (RPC
-- remplacées ici). Appliquer STRICTEMENT APRÈS 182 — cette migration
-- re-CREATE create_game_session_v2 / submit_game_answer / create_battle /
-- resolve_battle et REMPLACE la signature de complete_game_session
-- (DROP (uuid) → CREATE (uuid, jsonb DEFAULT NULL)). Appliquer 182
-- par-dessus 183 réintroduirait le bug Vrai/Faux et casserait la signature.
--
-- Autorité : docs/specs/SPEC-G4-BATTLES-MINIJEUX.md §7.2 (Memory,
-- plausibilité bornée), §7.3 (Vrai/Faux Sprint), §7.4 (catalogue honnête),
-- §8 J5/J6.
--
-- Contenu :
--   A) Catalogue mini_game_types (§7.4) : UPSERT quiz_rush (base_xp 20) et
--      vrai_faux (base_xp 15) ; memory base_xp → 15 ; is_active=false pour
--      music_quiz / predictions / blindtest / emoji_guess / daily_quiz
--      (non construits). Colonnes vérifiées contre la SEULE migration
--      créatrice (011_mini_games.sql:13-29 — aucun ALTER ultérieur dans le
--      repo) : slug, name, description, icon, color, rules, min_players,
--      max_players, base_xp, time_limit_seconds, cooldown_minutes, is_daily,
--      is_active. UPSERT robuste aux DEUX états (ligne présente/absente,
--      seed 011 appliqué ou non) : UPDATE puis INSERT … WHERE NOT EXISTS —
--      aucune dépendance à la contrainte UNIQUE(slug).
--   B) FIX Vrai/Faux — le verdict était ALÉATOIRE : le client envoie 0=Faux /
--      1=Vrai mais submit_game_answer (182:1639-1647) comparait cet index au
--      `correct` QCM (0..3) de la question. Corrigé : create_game_session_v2
--      dérive de vraies affirmations (question + UNE option tirée, ~50/50
--      correcte/incorrecte, `option_index` persisté dans le seed serveur) et
--      submit_game_answer compare la réponse 0/1 à la vérité DÉRIVÉE en
--      DEFINER (option_index = index correct relu dans educational_quizzes).
--      NB sécurité (invariant 181) : le flag de vérité n'est PAS matérialisé
--      dans le seed — game_sessions est SELECT self-only mais lisible par son
--      propriétaire (RLS 181), un flag stocké en clair serait la clé de
--      réponses de sa propre partie (même classe de fuite que J0). Le seed
--      stocke option_index (illisible en clair : la colonne
--      educational_quizzes.questions est révoquée pour authenticated depuis
--      la mig 180), la vérité est recalculée serveur à CHAQUE soumission.
--      Payload client : {question, proposition} — jamais le flag.
--   C) Garde plausibilité Memory (§7.2, J6) : complete_game_session prend
--      `p_client_stats jsonb DEFAULT NULL`, exploité UNIQUEMENT pour memory
--      (exception M1 explicitement bornée) : cartes retournées ≥ 16 (minimum
--      théorique 8 paires → 16) ET durée ≥ 10 s ⇒ XP ≤ 15 plafonné ;
--      implausible/absent ⇒ XP=0 mais session 'completed' quand même.
--   D) FIX action_url notifications battles : create_battle et resolve_battle
--      recopiées À L'IDENTIQUE de la 182 SAUF l'action_url des
--      user_notifications : '/teen/battles/' || id (la page réelle,
--      app/teen/battles/[id]/page.tsx) au lieu de '/teen/games/battle/' || id
--      (route inexistante — 182:378 et 182:1328).
--
-- Principes transverses inchangés (182) : SECURITY DEFINER + search_path
-- épinglé, revérification auth.uid() interne (M10), REVOKE PUBLIC/anon,
-- erreurs métier jsonb {success:false, error:'code'}, jamais de coins.
-- Idempotent : re-CREATE OR REPLACE, UPDATE/INSERT-WHERE-NOT-EXISTS,
-- DROP FUNCTION IF EXISTS.
-- ============================================================================

BEGIN;

-- Garde (pattern V11/180) : prérequis — tables 181 + catalogue 011 + banque.
DO $$
BEGIN
  IF to_regclass('public.mini_game_types') IS NULL THEN
    RAISE EXCEPTION 'mini_game_types absente — appliquer 011_mini_games.sql d''abord';
  END IF;
  IF to_regclass('public.game_sessions') IS NULL
     OR to_regclass('public.battles') IS NULL
     OR to_regclass('public.battle_participants') IS NULL THEN
    RAISE EXCEPTION 'tables battles/games absentes — appliquer 181_battles_schema.sql d''abord';
  END IF;
  IF to_regclass('public.educational_quizzes') IS NULL THEN
    RAISE EXCEPTION 'educational_quizzes absente — appliquer 022_pillars_system.sql d''abord';
  END IF;
  -- Colonnes réellement écrites par la section A (défense anti-drift : échec
  -- explicite plutôt qu'un 42703 cryptique si la base vivante diverge de 011).
  IF (SELECT COUNT(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'mini_game_types'
        AND column_name IN ('slug','name','description','icon','color','rules',
                            'min_players','max_players','base_xp',
                            'time_limit_seconds','cooldown_minutes','is_daily',
                            'is_active')) < 13 THEN
    RAISE EXCEPTION 'mini_game_types : colonnes attendues (011) manquantes — vérifier le schéma vivant avant d''adapter cette migration';
  END IF;
END $$;

-- ============================================================================
-- A) CATALOGUE HONNÊTE (§7.4, J5) — la page /teen/games n'affiche QUE du
--    jouable ; les jeux non construits (audio/événements indisponibles)
--    passent is_active=false, le seed legacy music_quiz_questions (011, pop
--    occidentale non modérée) n'est donc jamais servi (§5.2).
-- ============================================================================

-- quiz_rush (§7.1) — nouveau row, base_xp 20. UPSERT robuste aux deux états.
UPDATE public.mini_game_types SET
  name               = 'Quiz Rush',
  description        = '10 questions de la banque, 10 secondes chacune. Vitesse et précision.',
  icon               = 'Zap',
  color              = '#F59E0B',
  rules              = '10 questions tirées de la banque modérée, 10 s par question. Réponds vite et juste : le score est calculé par le serveur.',
  min_players        = 1,
  max_players        = 1,
  base_xp            = 20,
  time_limit_seconds = 10,
  cooldown_minutes   = 0,
  is_daily           = false,
  is_active          = true
WHERE slug = 'quiz_rush';

INSERT INTO public.mini_game_types
  (slug, name, description, icon, color, rules, min_players, max_players,
   base_xp, time_limit_seconds, cooldown_minutes, is_daily, is_active)
SELECT
  'quiz_rush', 'Quiz Rush',
  '10 questions de la banque, 10 secondes chacune. Vitesse et précision.',
  'Zap', '#F59E0B',
  '10 questions tirées de la banque modérée, 10 s par question. Réponds vite et juste : le score est calculé par le serveur.',
  1, 1, 20, 10, 0, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.mini_game_types WHERE slug = 'quiz_rush');

-- vrai_faux (§7.3) — nouveau row, base_xp 15.
UPDATE public.mini_game_types SET
  name               = 'Vrai/Faux Sprint',
  description        = '15 affirmations, 5 secondes pour trancher. Vrai ou faux ?',
  icon               = 'Target',
  color              = '#10B981',
  rules              = '15 affirmations dérivées de la banque modérée, 5 s chacune. Vrai ou faux ? La correction est faite par le serveur.',
  min_players        = 1,
  max_players        = 1,
  base_xp            = 15,
  time_limit_seconds = 5,
  cooldown_minutes   = 0,
  is_daily           = false,
  is_active          = true
WHERE slug = 'vrai_faux';

INSERT INTO public.mini_game_types
  (slug, name, description, icon, color, rules, min_players, max_players,
   base_xp, time_limit_seconds, cooldown_minutes, is_daily, is_active)
SELECT
  'vrai_faux', 'Vrai/Faux Sprint',
  '15 affirmations, 5 secondes pour trancher. Vrai ou faux ?',
  'Target', '#10B981',
  '15 affirmations dérivées de la banque modérée, 5 s chacune. Vrai ou faux ? La correction est faite par le serveur.',
  1, 1, 15, 5, 0, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.mini_game_types WHERE slug = 'vrai_faux');

-- memory (§7.2) — row seedé par 011 (base_xp 30) : recalibré 15 (plafond dur
-- de l'exception M1), réactivé. Les autres champs 011 sont conservés.
UPDATE public.mini_game_types SET
  base_xp   = 15,
  is_active = true
WHERE slug = 'memory';

INSERT INTO public.mini_game_types
  (slug, name, description, icon, color, rules, min_players, max_players,
   base_xp, time_limit_seconds, cooldown_minutes, is_daily, is_active)
SELECT
  'memory', 'Memory',
  'Trouve les paires le plus vite possible !',
  'Grid', '#8B5CF6',
  'Retourne les cartes pour trouver les paires. Moins de coups = plus de points !',
  1, 1, 15, 120, 5, false, true
WHERE NOT EXISTS (SELECT 1 FROM public.mini_game_types WHERE slug = 'memory');

-- Jeux NON construits (§7.4) : fin du « théâtre » — is_active=false. Les rows
-- restent (catalogue conservé, canon « mention dead code, don't delete »).
UPDATE public.mini_game_types
SET is_active = false
WHERE slug IN ('music_quiz', 'predictions', 'blindtest', 'emoji_guess', 'daily_quiz');

COMMENT ON TABLE public.mini_game_types IS
  'Catalogue des mini-jeux (011, conservé par G4 §2.2). Depuis 183 (J5, §7.4) : seuls quiz_rush / memory / vrai_faux sont is_active=true — la page /teen/games n''affiche QUE du jouable. Le moteur legacy mini_game_sessions (011) est ABANDONNÉ : les sessions vivent dans game_sessions (181/182).';

-- ============================================================================
-- B1) create_game_session_v2 — remplace la version 182. SEUL changement de
--     fond : le seed vrai_faux porte désormais de vraies affirmations
--     (option_index tirée ~50/50 correcte/incorrecte) et le payload client
--     vrai_faux devient {question, proposition} sous la clé `statements`.
--     Les branches quiz_rush et memory sont inchangées (182).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_game_session_v2(p_game_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_game record;
  v_existing record;
  v_n integer;
  v_reco uuid[];
  v_seed_questions jsonb;
  v_session_id uuid;
  v_expires_at timestamptz;
  v_client_questions jsonb;
  v_client_statements jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.teens t WHERE t.id = v_caller) THEN
    RETURN jsonb_build_object('success', false, 'error', 'teen_not_found');
  END IF;

  SELECT id, slug, base_xp, cooldown_minutes, is_active INTO v_game
  FROM public.mini_game_types WHERE slug = p_game_slug;
  IF v_game.id IS NULL OR COALESCE(v_game.is_active, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'game_not_available');
  END IF;

  -- Reprise : une session active non expirée existe ⇒ on la renvoie au lieu
  -- d'en semer une nouvelle (le seed reste celui déjà tiré — M11).
  SELECT gs.id, gs.seed, gs.expires_at INTO v_existing
  FROM public.game_sessions gs
  WHERE gs.teen_id = v_caller AND gs.game_slug = p_game_slug
    AND gs.status = 'active' AND gs.expires_at > now()
  ORDER BY gs.started_at DESC
  LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    IF p_game_slug = 'vrai_faux' AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(v_existing.seed -> 'questions', '[]'::jsonb)) AS it(item)
      WHERE (it.item ->> 'option_index') IS NULL
    ) THEN
      -- Session semée AVANT ce fix (contrat 182, pas d'option_index) : le
      -- verdict n'y est pas reconstructible — on l'abandonne proprement et on
      -- ressème plus bas (jamais de verdict aléatoire, c'est le bug corrigé).
      UPDATE public.game_sessions SET status = 'abandoned' WHERE id = v_existing.id;
    ELSIF p_game_slug = 'vrai_faux' THEN
      SELECT jsonb_agg(jsonb_build_object(
               'index', t.ord - 1,
               'question', q.questions -> (t.item ->> 'question_index')::integer ->> 'question',
               'proposition', q.questions -> (t.item ->> 'question_index')::integer -> 'options'
                                ->> (t.item ->> 'option_index')::integer
             ) ORDER BY t.ord)
      INTO v_client_statements
      FROM jsonb_array_elements(COALESCE(v_existing.seed -> 'questions', '[]'::jsonb)) WITH ORDINALITY AS t(item, ord)
      JOIN public.educational_quizzes q ON q.id = (t.item ->> 'quiz_id')::uuid;
      RETURN jsonb_build_object('success', true, 'session_id', v_existing.id, 'resumed', true,
        'game_slug', p_game_slug, 'statements', COALESCE(v_client_statements, '[]'::jsonb),
        'expires_at', v_existing.expires_at);
    ELSE
      SELECT jsonb_agg(jsonb_build_object(
               'index', t.ord - 1,
               'question', q.questions -> (t.item ->> 'question_index')::integer -> 'question',
               'options',  q.questions -> (t.item ->> 'question_index')::integer -> 'options'
             ) ORDER BY t.ord)
      INTO v_client_questions
      FROM jsonb_array_elements(COALESCE(v_existing.seed -> 'questions', '[]'::jsonb)) WITH ORDINALITY AS t(item, ord)
      JOIN public.educational_quizzes q ON q.id = (t.item ->> 'quiz_id')::uuid;
      RETURN jsonb_build_object('success', true, 'session_id', v_existing.id, 'resumed', true,
        'game_slug', p_game_slug, 'questions', COALESCE(v_client_questions, '[]'::jsonb),
        'expires_at', v_existing.expires_at);
    END IF;
  END IF;

  -- [M6] cooldown_minutes du catalogue appliqué à la CRÉATION de session
  -- (§6.2-5), en plus du plafond quotidien de crédit (complete_game_session).
  IF COALESCE(v_game.cooldown_minutes, 0) > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.game_sessions gs
      WHERE gs.teen_id = v_caller AND gs.game_slug = p_game_slug
        AND gs.status <> 'active'
        AND gs.started_at > now() - make_interval(mins => v_game.cooldown_minutes)
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'cooldown_active');
    END IF;
  END IF;

  -- --------------------------------------------------------------------
  -- [M11] Le seed (contenu du jeu) est choisi PAR LE SERVEUR à la création
  -- et n'est lisible que par le teen lui-même (RLS self-only, mig 181) —
  -- impossible de deviner le contenu avant de jouer. Pour les jeux quiz
  -- (quiz_rush / vrai_faux) : questions tirées EXCLUSIVEMENT de la banque
  -- modérée is_active=true (§5.2), RPC 173 en mode léger (sujets faibles
  -- prioritaires), fallback tirage aléatoire.
  -- --------------------------------------------------------------------
  IF p_game_slug = 'quiz_rush' THEN
    v_n := 10;

    BEGIN
      SELECT array_agg(r.quiz_id) INTO v_reco
      FROM public.recommend_quizzes_for_teen(v_caller, 5) r;
    EXCEPTION WHEN OTHERS THEN
      v_reco := NULL;
    END;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('quiz_id', s.qid, 'question_index', s.qidx)), '[]'::jsonb)
    INTO v_seed_questions
    FROM (
      SELECT q.id AS qid, gsr.idx AS qidx
      FROM public.educational_quizzes q
      CROSS JOIN LATERAL generate_series(0, jsonb_array_length(q.questions) - 1) AS gsr(idx)
      WHERE q.is_active = true
        AND (v_reco IS NULL OR q.id = ANY (v_reco))
      ORDER BY random()
      LIMIT v_n
    ) s;

    -- Banque recommandée trop petite ⇒ retirage sur toute la banque active.
    IF jsonb_array_length(v_seed_questions) < v_n AND v_reco IS NOT NULL THEN
      SELECT COALESCE(jsonb_agg(jsonb_build_object('quiz_id', s.qid, 'question_index', s.qidx)), '[]'::jsonb)
      INTO v_seed_questions
      FROM (
        SELECT q.id AS qid, gsr.idx AS qidx
        FROM public.educational_quizzes q
        CROSS JOIN LATERAL generate_series(0, jsonb_array_length(q.questions) - 1) AS gsr(idx)
        WHERE q.is_active = true
        ORDER BY random()
        LIMIT v_n
      ) s;
    END IF;

    IF jsonb_array_length(v_seed_questions) = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'no_active_quiz');
    END IF;
  ELSIF p_game_slug = 'vrai_faux' THEN
    -- ------------------------------------------------------------------
    -- FIX 183 (§7.3) : chaque affirmation = question + UNE option tirée
    -- ~50/50 correcte (coin < 0.5 ⇒ option_index = correct) ou incorrecte
    -- (index aléatoire ≠ correct, astuce du décalage). La vérité n'est PAS
    -- stockée : elle est dérivée en DEFINER par submit_game_answer
    -- (option_index = correct relu) — le seed self-lisible (RLS 181) ne
    -- contient donc jamais la clé de réponses (invariant 181/J0).
    -- ------------------------------------------------------------------
    v_n := 15;

    BEGIN
      SELECT array_agg(r.quiz_id) INTO v_reco
      FROM public.recommend_quizzes_for_teen(v_caller, 5) r;
    EXCEPTION WHEN OTHERS THEN
      v_reco := NULL;
    END;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'quiz_id', s.qid, 'question_index', s.qidx, 'option_index', s.opt_idx)), '[]'::jsonb)
    INTO v_seed_questions
    FROM (
      SELECT b.qid, b.qidx,
             CASE
               WHEN b.coin < 0.5 THEN b.correct_idx
               WHEN floor(b.pick * (b.n_opts - 1))::integer >= b.correct_idx
                 THEN floor(b.pick * (b.n_opts - 1))::integer + 1
               ELSE floor(b.pick * (b.n_opts - 1))::integer
             END AS opt_idx
      FROM (
        SELECT q.id AS qid, gsr.idx AS qidx,
               (q.questions -> gsr.idx ->> 'correct')::integer AS correct_idx,
               jsonb_array_length(q.questions -> gsr.idx -> 'options') AS n_opts,
               random() AS coin,
               random() AS pick
        FROM public.educational_quizzes q
        CROSS JOIN LATERAL generate_series(0, jsonb_array_length(q.questions) - 1) AS gsr(idx)
        WHERE q.is_active = true
          AND (v_reco IS NULL OR q.id = ANY (v_reco))
          AND jsonb_typeof(q.questions -> gsr.idx -> 'options') = 'array'
          AND jsonb_array_length(q.questions -> gsr.idx -> 'options') >= 2
          AND (q.questions -> gsr.idx ->> 'correct') ~ '^[0-9]+$'
          AND (q.questions -> gsr.idx ->> 'correct')::integer
                < jsonb_array_length(q.questions -> gsr.idx -> 'options')
        ORDER BY random()
        LIMIT v_n
      ) b
    ) s;

    -- Banque recommandée trop petite ⇒ retirage sur toute la banque active.
    IF jsonb_array_length(v_seed_questions) < v_n AND v_reco IS NOT NULL THEN
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
               'quiz_id', s.qid, 'question_index', s.qidx, 'option_index', s.opt_idx)), '[]'::jsonb)
      INTO v_seed_questions
      FROM (
        SELECT b.qid, b.qidx,
               CASE
                 WHEN b.coin < 0.5 THEN b.correct_idx
                 WHEN floor(b.pick * (b.n_opts - 1))::integer >= b.correct_idx
                   THEN floor(b.pick * (b.n_opts - 1))::integer + 1
                 ELSE floor(b.pick * (b.n_opts - 1))::integer
               END AS opt_idx
        FROM (
          SELECT q.id AS qid, gsr.idx AS qidx,
                 (q.questions -> gsr.idx ->> 'correct')::integer AS correct_idx,
                 jsonb_array_length(q.questions -> gsr.idx -> 'options') AS n_opts,
                 random() AS coin,
                 random() AS pick
          FROM public.educational_quizzes q
          CROSS JOIN LATERAL generate_series(0, jsonb_array_length(q.questions) - 1) AS gsr(idx)
          WHERE q.is_active = true
            AND jsonb_typeof(q.questions -> gsr.idx -> 'options') = 'array'
            AND jsonb_array_length(q.questions -> gsr.idx -> 'options') >= 2
            AND (q.questions -> gsr.idx ->> 'correct') ~ '^[0-9]+$'
            AND (q.questions -> gsr.idx ->> 'correct')::integer
                  < jsonb_array_length(q.questions -> gsr.idx -> 'options')
          ORDER BY random()
          LIMIT v_n
        ) b
      ) s;
    END IF;

    IF jsonb_array_length(v_seed_questions) = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'no_active_quiz');
    END IF;
  ELSE
    -- Jeux non-quiz (memory) : seed minimal — la validation finale est une
    -- plausibilité bornée (§7.2, exception M1 explicite ≤ 15 XP), câblée
    -- dans complete_game_session (section C ci-dessous).
    v_seed_questions := '[]'::jsonb;
  END IF;

  INSERT INTO public.game_sessions (teen_id, game_slug, seed)
  VALUES (v_caller, p_game_slug, jsonb_build_object('kind', p_game_slug, 'questions', v_seed_questions))
  RETURNING id, expires_at INTO v_session_id, v_expires_at;

  -- [M2] Énoncés renvoyés au client en WHITELIST — jamais correct/explanation,
  -- jamais le flag de vérité vrai_faux.
  IF p_game_slug = 'vrai_faux' THEN
    SELECT jsonb_agg(jsonb_build_object(
             'index', t.ord - 1,
             'question', q.questions -> (t.item ->> 'question_index')::integer ->> 'question',
             'proposition', q.questions -> (t.item ->> 'question_index')::integer -> 'options'
                              ->> (t.item ->> 'option_index')::integer
           ) ORDER BY t.ord)
    INTO v_client_statements
    FROM jsonb_array_elements(v_seed_questions) WITH ORDINALITY AS t(item, ord)
    JOIN public.educational_quizzes q ON q.id = (t.item ->> 'quiz_id')::uuid;

    RETURN jsonb_build_object('success', true, 'session_id', v_session_id, 'resumed', false,
      'game_slug', p_game_slug, 'statements', COALESCE(v_client_statements, '[]'::jsonb),
      'expires_at', v_expires_at);
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
           'index', t.ord - 1,
           'question', q.questions -> (t.item ->> 'question_index')::integer -> 'question',
           'options',  q.questions -> (t.item ->> 'question_index')::integer -> 'options'
         ) ORDER BY t.ord)
  INTO v_client_questions
  FROM jsonb_array_elements(v_seed_questions) WITH ORDINALITY AS t(item, ord)
  JOIN public.educational_quizzes q ON q.id = (t.item ->> 'quiz_id')::uuid;

  RETURN jsonb_build_object('success', true, 'session_id', v_session_id, 'resumed', false,
    'game_slug', p_game_slug, 'questions', COALESCE(v_client_questions, '[]'::jsonb),
    'expires_at', v_expires_at);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_game_session_v2(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_game_session_v2(text) TO authenticated, service_role;
COMMENT ON FUNCTION public.create_game_session_v2(text) IS
  'G4 §7.1/§7.3 (183) : crée une session mini-jeu solo — seed serveur (M11), banque modérée uniquement (§5.2), cooldown catalogue (M6), payload whitelist sans correct/explanation (M2). vrai_faux : affirmations {question, proposition} sous la clé statements, option tirée ~50/50 correcte/incorrecte (option_index dans le seed, vérité dérivée en DEFINER — jamais stockée ni renvoyée).';

-- ============================================================================
-- B2) submit_game_answer — remplace la version 182. SEUL changement de fond :
--     pour les items vrai_faux (option_index présent), la réponse 0=Faux /
--     1=Vrai est comparée à la vérité dérivée (option_index = correct relu),
--     au lieu de la comparaison à l'index QCM qui rendait le verdict
--     ALÉATOIRE (182:1639-1647). QCM (quiz_rush) inchangé.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_game_answer(
  p_session_id uuid,
  p_question_index integer,
  p_answer_index integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_session public.game_sessions%ROWTYPE;
  v_item jsonb;
  v_kind text;
  v_correct_index integer;
  v_truth boolean;
  v_is_correct boolean;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_question_index IS NULL OR p_question_index < 0 OR p_answer_index IS NULL OR p_answer_index < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_answer');
  END IF;

  SELECT * INTO v_session FROM public.game_sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_not_found');
  END IF;
  -- [M10] revérification interne : seul le propriétaire répond.
  IF v_session.teen_id <> v_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  IF v_session.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_not_active', 'status', v_session.status);
  END IF;
  IF v_session.expires_at <= now() THEN
    UPDATE public.game_sessions SET status = 'expired' WHERE id = p_session_id;
    RETURN jsonb_build_object('success', false, 'error', 'session_expired');
  END IF;

  v_item := v_session.seed -> 'questions' -> p_question_index;
  IF v_item IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_question_index');
  END IF;

  -- [M4] Rejeu de la même question : answers est append-only avec au plus
  -- UNE entrée par question_index — la seconde tentative renvoie l'état
  -- sans réécrire (rien à recréditer, le score est dérivé une seule fois).
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_session.answers) a
    WHERE (a ->> 'question_index')::integer = p_question_index
  ) THEN
    RETURN jsonb_build_object('success', true, 'already_answered', true);
  END IF;

  -- [M2] Correction 100 % serveur (comme les battles) : relecture du JSONB
  -- complet en DEFINER — la colonne questions est illisible pour
  -- authenticated depuis J0 (mig 180) et le payload client n'a jamais
  -- contenu correct/explanation ni le flag de vérité vrai_faux.
  v_kind := COALESCE(v_session.seed ->> 'kind', v_session.game_slug);

  IF (v_item ->> 'option_index') IS NOT NULL THEN
    -- Vrai/Faux (contrat 183) : réponse client 0=Faux / 1=Vrai, comparée à la
    -- vérité DÉRIVÉE du seed serveur (option tirée = bonne option ?).
    IF p_answer_index NOT IN (0, 1) THEN
      RETURN jsonb_build_object('success', false, 'error', 'invalid_answer');
    END IF;

    SELECT (q.questions -> (v_item ->> 'question_index')::integer ->> 'correct')::integer
    INTO v_correct_index
    FROM public.educational_quizzes q
    WHERE q.id = (v_item ->> 'quiz_id')::uuid;
    IF v_correct_index IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'question_unavailable');
    END IF;

    v_truth := ((v_item ->> 'option_index')::integer = v_correct_index);
    v_is_correct := (p_answer_index = CASE WHEN v_truth THEN 1 ELSE 0 END);
  ELSIF v_kind = 'vrai_faux' THEN
    -- Session vrai_faux semée AVANT le fix (contrat 182, pas d'option_index) :
    -- refus explicite — on ne rend plus JAMAIS de verdict aléatoire.
    RETURN jsonb_build_object('success', false, 'error', 'question_unavailable');
  ELSE
    -- QCM (quiz_rush) : comparaison à l'index correct — identique 182.
    SELECT (q.questions -> (v_item ->> 'question_index')::integer ->> 'correct')::integer
    INTO v_correct_index
    FROM public.educational_quizzes q
    WHERE q.id = (v_item ->> 'quiz_id')::uuid;
    IF v_correct_index IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'question_unavailable');
    END IF;

    v_is_correct := (p_answer_index = v_correct_index);
  END IF;

  -- [M1 / red-team #13] Stockage AUTORITAIRE : le verdict est appendé dans
  -- game_sessions.answers EXCLUSIVEMENT par cette RPC (append-only) ;
  -- complete_game_session dérive le score de CE champ, jamais du client.
  UPDATE public.game_sessions
  SET answers = answers || jsonb_build_object(
        'question_index', p_question_index,
        'answer_index', p_answer_index,
        'is_correct', v_is_correct,
        'answered_at', now())
  WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'is_correct', v_is_correct,
    'answered_count', jsonb_array_length(v_session.answers) + 1);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.submit_game_answer(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_game_answer(uuid, integer, integer) TO authenticated, service_role;
COMMENT ON FUNCTION public.submit_game_answer(uuid, integer, integer) IS
  'G4 §7.1/§7.3 (183, red-team #13) : correction serveur question par question (M2), verdict appendé dans game_sessions.answers (stockage autoritaire, M1), idempotent par question (M4). vrai_faux : réponse 0=Faux/1=Vrai comparée à la vérité dérivée du seed (option_index = correct relu en DEFINER) — fix du verdict aléatoire 182.';

-- ============================================================================
-- C) complete_game_session — REMPLACE la signature 182 (uuid) par
--    (uuid, jsonb DEFAULT NULL). Le DROP est obligatoire : conserver les deux
--    surcharges rendrait l'appel PostgREST { p_session_id } AMBIGU.
--    p_client_stats est exploité UNIQUEMENT pour memory (§7.2, J6) —
--    exception M1 explicitement bornée (≤ 15 XP, 3 sessions/jour,
--    idempotente). Tout autre jeu l'IGNORE totalement.
-- ============================================================================
DROP FUNCTION IF EXISTS public.complete_game_session(uuid);

CREATE OR REPLACE FUNCTION public.complete_game_session(
  p_session_id uuid,
  p_client_stats jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_session public.game_sessions%ROWTYPE;
  v_base_xp integer;
  v_total integer;
  v_correct integer;
  v_score integer;
  v_xp integer;
  v_day_count integer;
  v_xp_result jsonb;
  v_flips numeric;
  v_duration numeric;
  v_attempts numeric;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_session FROM public.game_sessions WHERE id = p_session_id FOR UPDATE;
  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_not_found');
  END IF;
  IF v_session.teen_id <> v_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  -- Idempotence : une session déjà complétée renvoie son état (le crédit
  -- est de toute façon gardé par (teen,'mini_game',session_id) — M6).
  IF v_session.status = 'completed' THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true,
      'score', v_session.score, 'xp_awarded', v_session.xp_awarded);
  END IF;
  IF v_session.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_not_active', 'status', v_session.status);
  END IF;

  IF v_session.game_slug = 'memory' THEN
    -- ------------------------------------------------------------------
    -- ⚠️ EXCEPTION EXPLICITE à M1 (§7.2, red-team #16) — garde de
    -- PLAUSIBILITÉ sur les stats soumises par le client, la SEULE surface
    -- G4 où un client peut influencer son crédit, bornée à ≤ 15 XP/session,
    -- 3 sessions/jour, idempotente. Seuils (J6) :
    --   * card_flips ≥ 16 — minimum théorique : 8 paires ⇒ 16 cartes
    --     retournées (l'UI compte des tentatives de 2 cartes ; la route
    --     complete convertit tentatives × 2 avant l'appel) ;
    --   * duration_seconds ≥ 10 — une vraie partie ne se finit pas en
    --     dessous de 10 s.
    -- Stats absentes ou implausibles ⇒ XP=0 MAIS session 'completed' quand
    -- même (on ne bloque pas le joueur, on ne crédite juste rien).
    -- Si l'enjeu XP de Memory montait, basculer sur la variante flip(i)
    -- serveur (§7.2).
    -- ------------------------------------------------------------------
    BEGIN
      v_flips    := (p_client_stats ->> 'card_flips')::numeric;
      v_duration := (p_client_stats ->> 'duration_seconds')::numeric;
    EXCEPTION WHEN OTHERS THEN
      v_flips := NULL;
      v_duration := NULL;
    END;

    IF v_flips IS NULL OR v_duration IS NULL
       OR v_flips < 16 OR v_duration < 10 THEN
      v_score := 0;
      v_xp := 0;
    ELSE
      v_attempts := v_flips / 2.0;
      -- Score d'efficacité : 8 tentatives (parfait) = 100.
      v_score := LEAST(100, ROUND(100.0 * 8 / v_attempts))::integer;
      SELECT COALESCE(mgt.base_xp, 15) INTO v_base_xp
      FROM public.mini_game_types mgt WHERE mgt.slug = 'memory';
      -- Plafond DUR 15 XP (§7.2) même si le catalogue remontait.
      v_base_xp := LEAST(COALESCE(v_base_xp, 15), 15);
      v_xp := LEAST(15, GREATEST(10, ROUND(v_base_xp * v_score / 100.0)::integer));
    END IF;
  ELSE
    -- ------------------------------------------------------------------
    -- [M1] Jeux quiz : le score est dérivé EXCLUSIVEMENT de
    -- game_sessions.answers (verdicts écrits par submit_game_answer) —
    -- p_client_stats est totalement IGNORÉ ici (red-team #13). Identique
    -- à la version 182.
    -- ------------------------------------------------------------------
    v_total := COALESCE(jsonb_array_length(v_session.seed -> 'questions'), 0);
    SELECT COUNT(*) FILTER (WHERE COALESCE((a ->> 'is_correct')::boolean, false))
    INTO v_correct
    FROM jsonb_array_elements(v_session.answers) a;

    IF v_total = 0 THEN
      v_score := 0;
      v_xp := 0;
    ELSE
      v_score := ROUND(100.0 * v_correct / v_total)::integer;
      SELECT COALESCE(mgt.base_xp, 20) INTO v_base_xp
      FROM public.mini_game_types mgt WHERE mgt.slug = v_session.game_slug;
      v_base_xp := COALESCE(v_base_xp, 20);
      -- Barème §6.1 : +10 à +25 XP selon base_xp et score, calcul serveur.
      IF v_correct = 0 THEN
        v_xp := 0;
      ELSE
        v_xp := LEAST(25, GREATEST(10, ROUND(v_base_xp * 1.25 * v_correct::numeric / v_total)::integer));
      END IF;
    END IF;
  END IF;

  -- [red-team #3] Advisory lock par teen AVANT le COUNT de plafond — deux
  -- complete_game_session simultanés ne peuvent pas lire chacun COUNT=2
  -- (<3) et créditer tous les deux.
  PERFORM pg_advisory_xact_lock(hashtext('g4_xp:' || v_caller::text));

  -- [M6] Plafond quotidien mini-jeux (§6.2-5) : XP sur les 3 PREMIÈRES
  -- sessions créditées par jeu et par jour (jour Africa/Casablanca,
  -- red-team #18). Au-delà : XP=0, l'UI l'annonce (« entraînement »).
  IF v_xp > 0 THEN
    SELECT COUNT(*) INTO v_day_count
    FROM public.xp_transactions xt
    JOIN public.game_sessions gs2 ON gs2.id = xt.source_id
    WHERE xt.teen_id = v_caller
      AND xt.source_type = 'mini_game'
      AND xt.amount > 0
      AND gs2.game_slug = v_session.game_slug
      AND (xt.created_at AT TIME ZONE 'Africa/Casablanca')::date = (now() AT TIME ZONE 'Africa/Casablanca')::date;
    IF v_day_count >= 3 THEN
      v_xp := 0;
    END IF;
  END IF;

  -- [M6] Crédit idempotent par (teen,'mini_game',session_id) via
  -- add_xp_to_user (garde 169 généralisée). Jamais de coins (canon §1).
  IF v_xp > 0 THEN
    v_xp_result := public.add_xp_to_user(
      v_caller, v_xp, 'mini_game', 'games', p_session_id,
      'Mini-jeu ' || v_session.game_slug || ' terminé');
    IF COALESCE((v_xp_result ->> 'success')::boolean, false) = false THEN
      v_xp := 0;
    END IF;
  END IF;

  UPDATE public.game_sessions
  SET status = 'completed', completed_at = now(), score = v_score, xp_awarded = v_xp
  WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'session_id', p_session_id,
    'score', v_score, 'correct_count', v_correct, 'total', v_total, 'xp_awarded', v_xp);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.complete_game_session(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_game_session(uuid, jsonb) TO authenticated, service_role;
COMMENT ON FUNCTION public.complete_game_session(uuid, jsonb) IS
  'G4 §7.1/§7.2 (183) : clôture de session — jeux quiz : score dérivé EXCLUSIVEMENT de answers (M1), p_client_stats ignoré. memory : garde plausibilité J6 sur p_client_stats {card_flips ≥ 16 (8 paires → 16 cartes), duration_seconds ≥ 10} ⇒ XP ≤ 15 plafonné ; implausible ⇒ XP=0 mais session completed (exception M1 bornée §7.2). Plafond 3 sessions créditées/jeu/jour Casablanca (M6) sous advisory lock (red-team #3), crédit idempotent add_xp_to_user.';

-- ============================================================================
-- D1) create_battle — copie À L'IDENTIQUE de la 182 §1. SEUL changement :
--     action_url de la notification d'invitation = '/teen/battles/' || id
--     (page réelle app/teen/battles/[id]) au lieu de '/teen/games/battle/'
--     (route inexistante — 182:378).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_battle(
  p_opponent_id uuid,
  p_quiz_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_rounds_total integer := 5;   -- PO P6 : 5 rounds × 15 s
  v_quiz_id uuid;
  v_battle_id uuid;
  v_expires_at timestamptz;
  v_pair_created_today integer;
  v_global_created_today integer;
  v_pseudo text;
BEGIN
  -- [M10] revérification interne de l'appelant (les routes gatent déjà le
  -- rôle, mais la RPC ne fait confiance à personne).
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF p_opponent_id IS NULL OR p_opponent_id = v_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_opponent');
  END IF;

  -- --------------------------------------------------------------------
  -- Invariant identité §3.5 (red-team #12) : toute la RLS et toutes les
  -- RPC battles s'appuient sur auth.uid() ⇒ les battles v1 exigent
  -- teens.id = auth.uid() (modèle V11 self-auth). Un teen legacy
  -- (mig 000 : id = gen_random_uuid() ≠ auth.uid()) ne peut NI créer NI
  -- recevoir de battle : échec PROPRE et explicite, jamais un
  -- comportement silencieusement cassé.
  -- --------------------------------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM public.teens t WHERE t.id = v_caller)
     OR NOT EXISTS (SELECT 1 FROM public.teens t WHERE t.id = p_opponent_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'battle_identity_unsupported');
  END IF;

  -- --------------------------------------------------------------------
  -- [M9] Périmètre social v1 (§5.1-1, red-team #7) : adversaire = ami
  -- friendships.status='accepted' UNIQUEMENT — relation bilatérale
  -- explicitement consentie. PAS de co-crew (crews.is_public + adhésion
  -- ≠ consentement mutuel), JAMAIS d'inconnu ni de matchmaking public
  -- pour des mineurs. Vérifié ICI, pas seulement dans l'UI.
  -- --------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.user1_id = v_caller AND f.user2_id = p_opponent_id)
        OR (f.user1_id = p_opponent_id AND f.user2_id = v_caller))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_friends');
  END IF;

  -- [M9] blocked_users respecté dans les DEUX sens à la création (§5.1).
  IF EXISTS (
    SELECT 1 FROM public.blocked_users bu
    WHERE (bu.blocker_id = v_caller AND bu.blocked_id = p_opponent_id)
       OR (bu.blocker_id = p_opponent_id AND bu.blocked_id = v_caller)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'blocked');
  END IF;

  -- --------------------------------------------------------------------
  -- Sérialisation des plafonds d'invitation (extension du principe
  -- red-team #3 aux compteurs de création) : verrous advisory par teen,
  -- pris en ordre lexicographique des uuid pour éviter le deadlock,
  -- AVANT tout COUNT — deux create_battle simultanés de la même paire ne
  -- peuvent pas lire chacun COUNT=1 (<2) et passer tous les deux.
  -- --------------------------------------------------------------------
  PERFORM pg_advisory_xact_lock(hashtext('g4_battle:' || LEAST(v_caller::text, p_opponent_id::text)));
  PERFORM pg_advisory_xact_lock(hashtext('g4_battle:' || GREATEST(v_caller::text, p_opponent_id::text)));

  -- --------------------------------------------------------------------
  -- [M9] Plafonds anti-harcèlement, DANS CET ORDRE (red-team #6 : le
  -- plafond global seul laissait concentrer 10 pings/jour sur UNE
  -- victime) : paire → cooldown post-refus → global.
  -- --------------------------------------------------------------------
  -- [M9] (a) ≤ 1 battle non résolue par paire.
  IF EXISTS (
    SELECT 1 FROM public.battles b
    WHERE b.status IN ('invited', 'lobby', 'active')
      AND ((b.creator_id = v_caller AND b.opponent_id = p_opponent_id)
        OR (b.creator_id = p_opponent_id AND b.opponent_id = v_caller))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'pair_battle_pending');
  END IF;

  -- [M9] (b) ≤ 2 créations / jour / même paire (jour Africa/Casablanca,
  -- red-team #18). La revanche (P12) est autorisée mais compte ici.
  SELECT COUNT(*) INTO v_pair_created_today
  FROM public.battles b
  WHERE ((b.creator_id = v_caller AND b.opponent_id = p_opponent_id)
      OR (b.creator_id = p_opponent_id AND b.opponent_id = v_caller))
    AND (b.created_at AT TIME ZONE 'Africa/Casablanca')::date = (now() AT TIME ZONE 'Africa/Casablanca')::date;
  IF v_pair_created_today >= 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'pair_daily_limit');
  END IF;

  -- [M9] (c) cooldown 24 h sur une cible après SON decline — un refus
  -- n'est pas une invitation à réessayer (§5.1-2).
  IF EXISTS (
    SELECT 1 FROM public.battles b
    WHERE b.creator_id = v_caller
      AND b.opponent_id = p_opponent_id
      AND b.declined_at IS NOT NULL
      AND b.declined_at > now() - interval '24 hours'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'declined_cooldown');
  END IF;

  -- [M9] (d) PUIS plafond global : ≤ 10 créations / jour / teen.
  SELECT COUNT(*) INTO v_global_created_today
  FROM public.battles b
  WHERE b.creator_id = v_caller
    AND (b.created_at AT TIME ZONE 'Africa/Casablanca')::date = (now() AT TIME ZONE 'Africa/Casablanca')::date;
  IF v_global_created_today >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'daily_invite_limit');
  END IF;

  -- --------------------------------------------------------------------
  -- Choix du quiz : is_active = true OBLIGATOIRE (§5.2 : les battles ne
  -- consomment QUE la banque passée en modération humaine — G3). Si NULL,
  -- choisi serveur via la RPC 173 (sélection adaptative), fallback tirage
  -- aléatoire dans la banque active.
  -- --------------------------------------------------------------------
  IF p_quiz_id IS NOT NULL THEN
    SELECT q.id INTO v_quiz_id
    FROM public.educational_quizzes q
    WHERE q.id = p_quiz_id
      AND q.is_active = true
      AND jsonb_array_length(q.questions) >= v_rounds_total;
    IF v_quiz_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'quiz_not_available');
    END IF;
  ELSE
    BEGIN
      SELECT r.quiz_id INTO v_quiz_id
      FROM public.recommend_quizzes_for_teen(v_caller, 5) r
      JOIN public.educational_quizzes q ON q.id = r.quiz_id
      WHERE q.is_active = true
        AND jsonb_array_length(q.questions) >= v_rounds_total
      ORDER BY r.score DESC   -- meilleure recommandation d'abord (173 : score NUMERIC)
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_quiz_id := NULL;  -- RPC 173 absente/erreur ⇒ fallback aléatoire
    END;
    IF v_quiz_id IS NULL THEN
      SELECT q.id INTO v_quiz_id
      FROM public.educational_quizzes q
      WHERE q.is_active = true
        AND jsonb_array_length(q.questions) >= v_rounds_total
      ORDER BY random()
      LIMIT 1;
    END IF;
    IF v_quiz_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'no_active_quiz');
    END IF;
  END IF;

  INSERT INTO public.battles (kind, status, creator_id, opponent_id, quiz_id, rounds_total)
  VALUES ('quiz_battle', 'invited', v_caller, p_opponent_id, v_quiz_id, v_rounds_total)
  RETURNING id, expires_at INTO v_battle_id, v_expires_at;

  -- Dénormalisation red-team #11 : posée UNE fois ici, jamais modifiée.
  INSERT INTO public.battle_participants (battle_id, teen_id, creator_id, opponent_id)
  VALUES
    (v_battle_id, v_caller,      v_caller, p_opponent_id),
    (v_battle_id, p_opponent_id, v_caller, p_opponent_id);

  -- Notification d'invitation (§3.2 battle.invite) — identité affichée via
  -- le pattern mig 148 (COALESCE(teens.pseudo, profiles.full_name)),
  -- jamais user_profiles (§3.5-3).
  SELECT COALESCE(t.pseudo, p.full_name, 'Un ami') INTO v_pseudo
  FROM public.teens t
  LEFT JOIN public.profiles p ON p.id = t.id
  WHERE t.id = v_caller;

  INSERT INTO public.user_notifications (user_id, title, body, emoji, data, action_url, action_label)
  VALUES (
    p_opponent_id,
    'Défi battle !',
    v_pseudo || ' te défie en battle quiz. Tu as 24 h pour accepter.',
    '⚔️',
    jsonb_build_object('type', 'battle.invite', 'battle_id', v_battle_id),
    '/teen/battles/' || v_battle_id,   -- FIX 183 : page réelle (182 pointait /teen/games/battle/, inexistante)
    'Voir le défi'
  );

  RETURN jsonb_build_object(
    'success', true,
    'battle_id', v_battle_id,
    'status', 'invited',
    'quiz_id', v_quiz_id,
    'rounds_total', v_rounds_total,
    'expires_at', v_expires_at
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_battle(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_battle(uuid, uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.create_battle(uuid, uuid) IS
  'G4 §3.3 : ∅→invited. Gardes M9 (amis accepted only, blocked 2 sens, ≤1 non résolue/paire, ≤2 créations/j/paire, cooldown 24h post-decline, ≤10/j global), invariant identité §3.5, quiz is_active obligatoire (§5.2). Depuis 183 : action_url notification = /teen/battles/{id}.';

-- ============================================================================
-- D2) resolve_battle — copie À L'IDENTIQUE de la 182 §12. SEUL changement :
--     action_url de la notification de résultat = '/teen/battles/' || id
--     (182:1328 pointait /teen/games/battle/, route inexistante).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.resolve_battle(
  p_battle_id uuid,
  p_resolution text,
  p_winner_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_battle public.battles%ROWTYPE;
  v_winner uuid;
  v_is_draw boolean := false;
  v_distinct_scores integer;
  v_part record;
  v_award integer;
  v_speed_count integer;
  v_day_count integer;
  v_pair_count integer;
  v_xp_result jsonb;
  v_awards jsonb := '{}'::jsonb;
  v_crew_id uuid;
  v_body text;
BEGIN
  IF p_resolution NOT IN ('score', 'forfeit') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_resolution');
  END IF;

  SELECT * INTO v_battle FROM public.battles WHERE id = p_battle_id FOR UPDATE;
  IF v_battle.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'battle_not_found');
  END IF;

  -- Idempotence (§3.4-5) : garde sur status='resolved' — un re-appel ne
  -- recrédite RIEN (doublée par la garde ledger M6 dans add_xp_to_user).
  IF v_battle.status = 'resolved' THEN
    RETURN jsonb_build_object('success', true, 'battle_id', p_battle_id, 'status', 'resolved',
      'winner_id', v_battle.winner_id, 'is_draw', v_battle.is_draw, 'already_resolved', true);
  END IF;
  IF v_battle.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_battle.status);
  END IF;

  -- Gagnant : plus haut score (égalité ⇒ is_draw) ou forfait désigné.
  IF p_resolution = 'forfeit' THEN
    IF p_winner_id IS NULL OR p_winner_id NOT IN (v_battle.creator_id, v_battle.opponent_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'invalid_winner');
    END IF;
    v_winner := p_winner_id;
  ELSE
    SELECT COUNT(DISTINCT bp.score) INTO v_distinct_scores
    FROM public.battle_participants bp WHERE bp.battle_id = p_battle_id;
    IF v_distinct_scores <= 1 THEN
      v_is_draw := true;
      v_winner := NULL;
    ELSE
      SELECT bp.teen_id INTO v_winner
      FROM public.battle_participants bp
      WHERE bp.battle_id = p_battle_id
      ORDER BY bp.score DESC
      LIMIT 1;
    END IF;
  END IF;

  -- --------------------------------------------------------------------
  -- [red-team #3] Sérialisation anti-TOCTOU des plafonds : le FOR UPDATE
  -- de la garde 169 ne sérialise que l'idempotence par source, PAS les
  -- COUNT de plafonds — deux resolve_battle du même teen quasi simultanés
  -- liraient chacun COUNT=4 (<5) et créditeraient tous les deux. Donc :
  -- pg_advisory_xact_lock par teen, pris pour les DEUX teens dans l'ordre
  -- lexicographique des uuid (anti-deadlock), AVANT tout COUNT de plafond.
  -- Verrous relâchés en fin de transaction.
  -- --------------------------------------------------------------------
  PERFORM pg_advisory_xact_lock(hashtext('g4_xp:' || LEAST(v_battle.creator_id::text, v_battle.opponent_id::text)));
  PERFORM pg_advisory_xact_lock(hashtext('g4_xp:' || GREATEST(v_battle.creator_id::text, v_battle.opponent_id::text)));

  FOR v_part IN
    SELECT bp.teen_id FROM public.battle_participants bp WHERE bp.battle_id = p_battle_id
  LOOP
    -- Barème PO P1 : 30 gagné / 10 perdu (joué jusqu'au bout) / 15 égalité /
    -- 15 gagnant par forfait, 0 forfaiteur ([M12] : l'abandonneur ne touche
    -- pas l'XP de participation).
    v_award := CASE
      WHEN v_is_draw THEN 15
      WHEN p_resolution = 'forfeit' AND v_part.teen_id = v_winner THEN 15
      WHEN p_resolution = 'forfeit' THEN 0
      WHEN v_part.teen_id = v_winner THEN 30
      ELSE 10
    END;

    -- ------------------------------------------------------------------
    -- [M8] Bot / réponses scriptées — couche (a), plancher par battle :
    -- >= 3 réponses < 250 ms dans la battle ⇒ XP=0 + audit_log
    -- ('battle.suspect_speed'). Trivialement esquivable seule (bot à
    -- allure humaine) : elle ne vaut que combinée à J0 (clé inaccessible)
    -- et à la détection cross-battle différée (couche (b), jalon J8 —
    -- battle.suspect_pattern).
    -- ------------------------------------------------------------------
    SELECT COUNT(*) INTO v_speed_count
    FROM public.battle_answers ba
    WHERE ba.battle_id = p_battle_id AND ba.teen_id = v_part.teen_id AND ba.response_ms < 250;
    IF v_speed_count >= 3 AND v_award > 0 THEN
      v_award := 0;
      INSERT INTO public.audit_log (actor_id, actor_role, action, resource_type, resource_id, target_user_id, description, metadata)
      VALUES (v_part.teen_id, 'system', 'battle.suspect_speed', 'battle', p_battle_id::text, v_part.teen_id,
        'G4 M8(a) : >= 3 réponses < 250 ms dans la battle — XP forcé à 0, à revoir en file admin (J8)',
        jsonb_build_object('battle_id', p_battle_id, 'fast_answers', v_speed_count));
    END IF;

    -- ------------------------------------------------------------------
    -- [M6] Plafond quotidien battles (§6.2-4) : seules les 5 PREMIÈRES
    -- battles résolues du jour créditent de l'XP — compté serveur sur le
    -- ledger, jour en Africa/Casablanca (red-team #18, sinon reset à
    -- 01:00 locale). Au-delà : on joue encore, XP=0 (« entraînement »).
    -- ------------------------------------------------------------------
    IF v_award > 0 THEN
      SELECT COUNT(*) INTO v_day_count
      FROM public.xp_transactions xt
      WHERE xt.teen_id = v_part.teen_id
        AND xt.source_type = 'battle'
        AND xt.amount > 0
        AND (xt.created_at AT TIME ZONE 'Africa/Casablanca')::date = (now() AT TIME ZONE 'Africa/Casablanca')::date;
      IF v_day_count >= 5 THEN
        v_award := 0;
      END IF;
    END IF;

    -- ------------------------------------------------------------------
    -- [M7] Collusion / win-trading (§6.2-6) : max 2 battles CRÉDITÉES /
    -- jour / même paire. Les plafonds BORNENT la quantité (résidu assumé :
    -- ~150 XP/jour pour un binôme complice), ils ne détectent pas le
    -- throw — la détection différée (battle.suspect_collusion) est au
    -- jalon J8, revue humaine, pas de sanction automatique v1.
    -- ------------------------------------------------------------------
    IF v_award > 0 THEN
      SELECT COUNT(DISTINCT b.id) INTO v_pair_count
      FROM public.xp_transactions xt
      JOIN public.battles b ON b.id = xt.source_id
      WHERE xt.teen_id = v_part.teen_id
        AND xt.source_type = 'battle'
        AND xt.amount > 0
        AND (xt.created_at AT TIME ZONE 'Africa/Casablanca')::date = (now() AT TIME ZONE 'Africa/Casablanca')::date
        AND ((b.creator_id = v_battle.creator_id AND b.opponent_id = v_battle.opponent_id)
          OR (b.creator_id = v_battle.opponent_id AND b.opponent_id = v_battle.creator_id));
      IF v_pair_count >= 2 THEN
        v_award := 0;
      END IF;
    END IF;

    -- [M6] Crédit via add_xp_to_user UNIQUEMENT (idempotence ledger par
    -- (teen,'battle',battle_id) — garde 169 généralisée ci-dessus). Jamais
    -- de coins (canon §1). Dans la MÊME transaction que la résolution.
    IF v_award > 0 THEN
      v_xp_result := public.add_xp_to_user(
        v_part.teen_id, v_award, 'battle', 'games', p_battle_id,
        CASE
          WHEN v_is_draw THEN 'Battle quiz — égalité'
          WHEN v_part.teen_id = v_winner AND p_resolution = 'forfeit' THEN 'Battle quiz — victoire par forfait'
          WHEN v_part.teen_id = v_winner THEN 'Battle quiz — victoire'
          ELSE 'Battle quiz — défaite (participation)'
        END
      );
      IF COALESCE((v_xp_result ->> 'success')::boolean, false) = false THEN
        v_award := 0;  -- déjà crédité (garde M6) ⇒ pas de double xp_awarded
      END IF;
    END IF;

    UPDATE public.battle_participants
    SET xp_awarded = v_award
    WHERE battle_id = p_battle_id AND teen_id = v_part.teen_id;

    v_awards := v_awards || jsonb_build_object(v_part.teen_id::text, v_award);

    -- Notification de résultat (§3.2 battle.result).
    v_body := CASE
      WHEN v_is_draw THEN 'Égalité ! Beau duel.'
      WHEN v_part.teen_id = v_winner THEN 'Tu as gagné la battle !'
      ELSE 'Battle terminée. Bien joué, la revanche t''attend.'
    END;
    INSERT INTO public.user_notifications (user_id, title, body, emoji, data, action_url, action_label)
    VALUES (
      v_part.teen_id,
      'Résultat de battle',
      v_body,
      CASE WHEN v_is_draw THEN '🤝' WHEN v_part.teen_id = v_winner THEN '🏆' ELSE '💪' END,
      jsonb_build_object('type', 'battle.result', 'battle_id', p_battle_id,
                         'winner_id', v_winner, 'is_draw', v_is_draw, 'xp_awarded', v_award),
      '/teen/battles/' || p_battle_id,   -- FIX 183 : page réelle (182 pointait /teen/games/battle/, inexistante)
      'Voir le résultat'
    );
  END LOOP;

  -- Crew ladder (§6.4) : incréments directs + refresh via la version
  -- CANONIQUE update_crew_stats (mig 133 — on ne réécrit pas de variante
  -- locale). Enveloppé : une erreur de stats crew ne doit JAMAIS annuler
  -- la résolution ni le crédit XP (leçon realityfix 133).
  IF v_winner IS NOT NULL THEN
    BEGIN
      SELECT cm.crew_id INTO v_crew_id
      FROM public.crew_members cm
      WHERE cm.user_id = v_winner AND cm.status = 'active'
      LIMIT 1;
      IF v_crew_id IS NOT NULL THEN
        UPDATE public.crew_members
        SET challenges_won = COALESCE(challenges_won, 0) + 1
        WHERE crew_id = v_crew_id AND user_id = v_winner;
        UPDATE public.crews
        SET total_challenges_won = COALESCE(total_challenges_won, 0) + 1, updated_at = now()
        WHERE id = v_crew_id;
        PERFORM public.update_crew_stats(v_crew_id);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  UPDATE public.battles
  SET status = 'resolved', resolved_at = now(), winner_id = v_winner,
      is_draw = v_is_draw, resolution = p_resolution,
      current_payload = NULL, round_deadline = NULL
  WHERE id = p_battle_id;

  RETURN jsonb_build_object('success', true, 'battle_id', p_battle_id, 'status', 'resolved',
    'resolution', p_resolution, 'winner_id', v_winner, 'is_draw', v_is_draw, 'xp_awards', v_awards);
END;
$function$;

-- [M10] resolve_battle n'est PAS exposée à authenticated : elle est appelée
-- en interne par advance_battle_round/claim_forfeit (DEFINER ⇒ droits du
-- owner) et par service_role. Un client ne peut pas désigner un gagnant.
REVOKE EXECUTE ON FUNCTION public.resolve_battle(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_battle(uuid, text, uuid) TO service_role;
COMMENT ON FUNCTION public.resolve_battle(uuid, text, uuid) IS
  'G4 §3.4-5 (INTERNE/service_role) : résolution idempotente — XP barème P1 (30/10/15/15-0) via add_xp_to_user (M6), plafonds 5/j (M6) + 2/paire/j (M7) sous advisory locks (red-team #3), plancher anti-bot 250ms (M8), crew ladder mig 133, notifications. Depuis 183 : action_url notification = /teen/battles/{id}.';

COMMIT;

-- ============================================================================
-- VÉRIFICATION (à exécuter À L'APPLICATION — critères de done J5/J6, pattern
-- smoke-test RAISE-rollback V6). Ne fait PAS partie de la migration.
-- ============================================================================
-- -- A) Catalogue honnête (§7.4) :
-- SELECT slug, base_xp, is_active FROM public.mini_game_types ORDER BY slug;
-- -- attendu : quiz_rush 20/true, vrai_faux 15/true, memory 15/true ;
-- --           music_quiz/predictions/blindtest/emoji_guess/daily_quiz false.
--
-- -- B) Vrai/Faux : create_game_session_v2('vrai_faux') en teen de test ⇒
-- --    retour avec clé 'statements' [{index, question, proposition}] ;
-- --    assert : retour::text NOT LIKE '%correct%' / '%explanation%' /
-- --    '%is_true%' ; seed en base : chaque item a option_index, PAS de flag.
-- --    submit_game_answer(session, 0, 0|1) ⇒ is_correct cohérent avec
-- --    (options[option_index] = options[correct]) relu en service_role ;
-- --    p_answer_index=2 ⇒ invalid_answer.
--
-- -- C) Memory (J6) : complete_game_session(session,
-- --    '{"card_flips":2,"duration_seconds":1}') ⇒ xp_awarded=0 ET
-- --    status='completed' ; ('{"card_flips":24,"duration_seconds":45}') ⇒
-- --    10 ≤ xp_awarded ≤ 15 ; sans stats (NULL) ⇒ xp_awarded=0, completed.
-- --    Ambiguïté : SELECT count(*) FROM pg_proc WHERE proname =
-- --    'complete_game_session' ⇒ 1 (l'ancienne signature (uuid) a été DROP).
--
-- -- D) action_url : créer + résoudre une battle de test ⇒
-- --    SELECT action_url FROM user_notifications WHERE data->>'type' IN
-- --    ('battle.invite','battle.result') ORDER BY created_at DESC LIMIT 2 ;
-- --    attendu : '/teen/battles/<uuid>' (jamais '/teen/games/battle/').
-- ============================================================================
