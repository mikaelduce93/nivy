-- ============================================================================
-- Migration 182 — G4-B1 : RPC cycle de vie des battles (§3.3), autorité
--                  serveur (§3.4), garde XP généralisée (§6.2/§6.3) et
--                  RPC mini-jeux solo (§7.1)
-- ============================================================================
-- ⚠️ À APPLIQUER — fichier écrit le 2026-07-12, PAS encore appliqué à la base
-- (mission G4-B1 : fichiers de migration seulement, aucune application).
-- Dépend de : 181_battles_schema.sql (tables) et 180_quiz_answer_key_lockdown
-- (J0 — sans lui, M2 est du théâtre : la clé de réponses serait lisible par
-- la RLS 022).
-- ORDRE vs 169 : appliquer STRICTEMENT APRÈS 169_quiz_xp_first_pass_only —
-- cette migration REMPLACE add_xp_to_user (version 169 reprise mot pour mot,
-- prédicat de garde élargi, §6.3) ; appliquer 169 par-dessus 182
-- rétrécirait la garde anti-farm à source_type='quiz' seulement.
--
-- Autorité : docs/specs/SPEC-G4-BATTLES-MINIJEUX.md §3.3 (cycle de vie),
-- §3.4 (autorité serveur), §3.5 (invariant identité), §4 (menaces M1-M13),
-- §6 (XP), §7.1 (Quiz Rush). Défauts PO P1-P12 : XP 30/10/15/15-0 ;
-- plafonds 5 battles créditées/j + 2 créditées/paire/j + cooldown 24 h
-- post-refus ; adversaires = amis friendships.status='accepted' UNIQUEMENT ;
-- 5 rounds × 15 s ; revanche autorisée (comptée dans les plafonds) ;
-- jour anti-farm en Africa/Casablanca.
--
-- Principes transverses (toutes les fonctions ci-dessous) :
--   * SECURITY DEFINER + search_path épinglé (public, pg_temp).
--   * [M10] Revérification auth.uid() EN INTERNE (pattern _debit_teen_coins,
--     V6) — les tables n'ont aucune policy d'écriture authenticated (181).
--   * REVOKE FROM PUBLIC, anon partout (canon V8) ; GRANT authenticated +
--     service_role, SAUF resolve_battle et sweep_battles (service_role only,
--     resolve étant aussi appelée en interne par les fonctions DEFINER).
--   * Erreurs métier = jsonb {success:false, error:'code'} (style maison
--     _debit_teen_coins/spend_teen_coins).
--   * Aucune référence à user_coins / spend_coins / top_up_teen : les battles
--     et mini-jeux ne touchent JAMAIS les coins (canon §1).
--
-- [M13] Multi-comptes : hors périmètre technique v1 — l'inscription exige la
-- validation parentale (V11), ce qui renchérit fortement le multi-compte ;
-- les plafonds par paire (M7/M9) bornent le gain résiduel. Consigné §10 de
-- la spec, aucune garde dédiée ici (résidu assumé).
-- ============================================================================

BEGIN;

-- Garde (pattern V11/180) : les tables de la 181 doivent exister.
DO $$
BEGIN
  IF to_regclass('public.battles') IS NULL
     OR to_regclass('public.battle_participants') IS NULL
     OR to_regclass('public.battle_rounds') IS NULL
     OR to_regclass('public.battle_answers') IS NULL
     OR to_regclass('public.game_sessions') IS NULL THEN
    RAISE EXCEPTION 'tables battles/games absentes — appliquer 181_battles_schema.sql d''abord';
  END IF;
END $$;

-- ============================================================================
-- 0) GARDE XP GÉNÉRALISÉE — add_xp_to_user (reprend MOT POUR MOT la version
--    canonique 169, comme 169 avait repris 060 ; seul le prédicat de la garde
--    anti-farm est élargi de 'quiz' à ('quiz','battle','mini_game') — §6.3)
-- ============================================================================
-- [M6] Farm XP en rejouant (battles ou mini-jeux en boucle) : idempotence
-- ledger par (teen, source_type, source_id) — un battle_id / une game_session
-- ne crédite qu'une fois, POUR TOUJOURS. L'index partiel de support
-- (idx_xp_transactions_game_sources) est posé par la mig 181. Les plafonds
-- quotidiens (2e volet de M6) vivent dans resolve_battle et
-- complete_game_session ci-dessous. L'alias déprécié add_user_xp (095)
-- forwarde vers cette fonction et hérite de la garde.
CREATE OR REPLACE FUNCTION public.add_xp_to_user(
  p_teen_id uuid,
  p_xp_amount integer,
  p_source_type character varying,
  p_source_category character varying DEFAULT NULL::character varying,
  p_source_id uuid DEFAULT NULL::uuid,
  p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_current_xp INTEGER;
  v_current_level INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_xp_multiplier DECIMAL(3,2);
  v_final_xp INTEGER;
  v_xp_for_level INTEGER;
  v_leveled_up BOOLEAN := false;
  v_levels_gained INTEGER := 0;
BEGIN
  INSERT INTO public.user_xp (teen_id, total_xp, current_level)
  VALUES (p_teen_id, 0, 1)
  ON CONFLICT (teen_id) DO NOTHING;

  SELECT total_xp, current_level, xp_multiplier
  INTO v_current_xp, v_current_level, v_xp_multiplier
  FROM public.user_xp
  WHERE teen_id = p_teen_id
  FOR UPDATE;

  -- --------------------------------------------------------------------
  -- [M6] Garde anti-farm par source (169 généralisée par G4/182) : l'XP
  -- d'un quiz, d'une battle ou d'une session de mini-jeu n'est crédité
  -- qu'UNE seule fois par (teen, source_type, source_id), en s'appuyant
  -- sur le grand livre xp_transactions (amount > 0). Placée après le
  -- FOR UPDATE : les appels concurrents du même teen se sérialisent, la
  -- seconde transaction revérifie et voit la ligne insérée par la
  -- première (READ COMMITTED).
  -- --------------------------------------------------------------------
  IF p_source_type IN ('quiz', 'battle', 'mini_game') AND p_source_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.xp_transactions xt
      WHERE xt.teen_id = p_teen_id
        AND xt.source_type = p_source_type
        AND xt.source_id = p_source_id
        AND xt.amount > 0
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'xp_already_awarded',
        'reason', 'source_already_rewarded',
        'xp_gained', 0
      );
    END IF;
  END IF;

  v_final_xp := FLOOR(p_xp_amount * COALESCE(v_xp_multiplier, 1.00));
  v_new_xp := v_current_xp + v_final_xp;

  v_new_level := v_current_level;
  LOOP
    v_xp_for_level := v_new_level * 100;
    IF v_new_xp >= (v_new_level * (v_new_level + 1) / 2) * 100 THEN
      v_new_level := v_new_level + 1;
      v_leveled_up := true;
      v_levels_gained := v_levels_gained + 1;
    ELSE
      EXIT;
    END IF;

    IF v_new_level >= 100 THEN
      v_new_level := 100;
      EXIT;
    END IF;
  END LOOP;

  UPDATE public.user_xp
  SET
    total_xp = v_new_xp,
    current_level = v_new_level,
    xp_to_next_level = ((v_new_level * (v_new_level + 1) / 2) * 100) - v_new_xp,
    updated_at = NOW()
  WHERE teen_id = p_teen_id;

  INSERT INTO public.xp_transactions (teen_id, amount, source_type, source_id, description, multiplier_applied)
  VALUES (p_teen_id, v_final_xp, p_source_type, p_source_id, p_description, v_xp_multiplier);

  UPDATE public.user_progression
  SET total_xp = v_new_xp, current_level = v_new_level, updated_at = NOW()
  WHERE user_id = p_teen_id;

  RETURN jsonb_build_object(
    'success', true,
    'xp_gained', v_final_xp,
    'multiplier', v_xp_multiplier,
    'total_xp', v_new_xp,
    'previous_level', v_current_level,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up,
    'levels_gained', v_levels_gained
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.add_xp_to_user(uuid, integer, character varying, character varying, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_xp_to_user(uuid, integer, character varying, character varying, uuid, text) TO service_role, authenticated;

COMMENT ON FUNCTION public.add_xp_to_user IS
  'Ajoute de l XP à un utilisateur avec gestion automatique du niveau. '
  'Depuis 169 : idempotent pour source_type=quiz ; depuis 182 (G4) : '
  'idempotent pour quiz, battle et mini_game — un même (teen, source_type, '
  'source_id) n''est crédité qu''une fois (anti-farm M6).';

-- ============================================================================
-- 1) create_battle — ∅ → invited
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
    '/teen/games/battle/' || v_battle_id,
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
  'G4 §3.3 : ∅→invited. Gardes M9 (amis accepted only, blocked 2 sens, ≤1 non résolue/paire, ≤2 créations/j/paire, cooldown 24h post-decline, ≤10/j global), invariant identité §3.5, quiz is_active obligatoire (§5.2).';

-- ============================================================================
-- 2) accept_battle — invited → lobby
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_battle(p_battle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_battle public.battles%ROWTYPE;
  v_accepted_at timestamptz;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Invariant identité §3.5 : l'acceptant doit être un teen self-auth.
  IF NOT EXISTS (SELECT 1 FROM public.teens t WHERE t.id = v_caller) THEN
    RETURN jsonb_build_object('success', false, 'error', 'battle_identity_unsupported');
  END IF;

  SELECT * INTO v_battle FROM public.battles WHERE id = p_battle_id FOR UPDATE;
  IF v_battle.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'battle_not_found');
  END IF;

  -- [M10] seul l'opponent invité peut accepter.
  IF v_battle.opponent_id <> v_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF v_battle.status <> 'invited' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_battle.status);
  END IF;

  -- TTL 24 h : une invitation expirée ne s'accepte pas (le sweeper la
  -- passera/l'a passée en expired).
  IF v_battle.expires_at <= now() THEN
    UPDATE public.battles
    SET status = 'expired', resolution = 'expired', resolved_at = now()
    WHERE id = p_battle_id;
    RETURN jsonb_build_object('success', false, 'error', 'battle_expired');
  END IF;

  -- [M9] blocked_users respecté dans les deux sens à l'ACCEPTATION aussi
  -- (§5.1 : un blocage posé après l'invitation doit tenir).
  IF EXISTS (
    SELECT 1 FROM public.blocked_users bu
    WHERE (bu.blocker_id = v_battle.creator_id AND bu.blocked_id = v_battle.opponent_id)
       OR (bu.blocker_id = v_battle.opponent_id AND bu.blocked_id = v_battle.creator_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'blocked');
  END IF;

  v_accepted_at := now();
  UPDATE public.battles
  SET status = 'lobby', accepted_at = v_accepted_at
  WHERE id = p_battle_id;

  -- accepted_at sert aussi d'ancre d'estimation d'offset horloge côté
  -- client (§3.2) — la VALIDITÉ, elle, ne dépend jamais de l'horloge client.
  RETURN jsonb_build_object('success', true, 'battle_id', p_battle_id, 'status', 'lobby', 'accepted_at', v_accepted_at);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.accept_battle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_battle(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.accept_battle(uuid) IS
  'G4 §3.3 : invited→lobby (opponent only, TTL 24h, blocked re-vérifié, invariant identité §3.5).';

-- ============================================================================
-- 3) decline_battle — invited → cancelled (pose declined_at ⇒ cooldown M9)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.decline_battle(p_battle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_battle public.battles%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_battle FROM public.battles WHERE id = p_battle_id FOR UPDATE;
  IF v_battle.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'battle_not_found');
  END IF;
  IF v_battle.opponent_id <> v_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  IF v_battle.status <> 'invited' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_battle.status);
  END IF;

  -- Refus silencieux (§5.1-2) : pas de justification demandée, pas de
  -- notification moqueuse — l'inviteur voit « refusée » via Realtime.
  -- [M9] declined_at déclenche le cooldown 24 h de create_battle : la même
  -- cible ne peut pas être ré-invitée après un refus.
  UPDATE public.battles
  SET status = 'cancelled', declined_at = now()
  WHERE id = p_battle_id;

  RETURN jsonb_build_object('success', true, 'battle_id', p_battle_id, 'status', 'cancelled');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.decline_battle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_battle(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.decline_battle(uuid) IS
  'G4 §3.3 : invited→cancelled par l''opponent. Pose declined_at (base du cooldown 24h anti-harcèlement M9).';

-- ============================================================================
-- 4) cancel_battle — invited → cancelled (créateur retire son invitation ;
--    ne pose PAS declined_at : pas de cooldown contre soi-même)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancel_battle(p_battle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_battle public.battles%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_battle FROM public.battles WHERE id = p_battle_id FOR UPDATE;
  IF v_battle.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'battle_not_found');
  END IF;
  IF v_battle.creator_id <> v_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  IF v_battle.status <> 'invited' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_battle.status);
  END IF;

  UPDATE public.battles SET status = 'cancelled' WHERE id = p_battle_id;

  RETURN jsonb_build_object('success', true, 'battle_id', p_battle_id, 'status', 'cancelled');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cancel_battle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_battle(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.cancel_battle(uuid) IS
  'G4 : invited→cancelled par le CRÉATEUR (retrait d''invitation). Ne pose pas declined_at.';

-- ============================================================================
-- 5) set_battle_ready — lobby : pose is_ready + last_seen_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_battle_ready(p_battle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_battle public.battles%ROWTYPE;
  v_both_ready boolean;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_battle FROM public.battles WHERE id = p_battle_id FOR UPDATE;
  IF v_battle.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'battle_not_found');
  END IF;
  IF v_caller NOT IN (v_battle.creator_id, v_battle.opponent_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  IF v_battle.status <> 'lobby' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_battle.status);
  END IF;

  UPDATE public.battle_participants
  SET is_ready = true, last_seen_at = now()
  WHERE battle_id = p_battle_id AND teen_id = v_caller;

  SELECT bool_and(bp.is_ready) INTO v_both_ready
  FROM public.battle_participants bp
  WHERE bp.battle_id = p_battle_id;

  RETURN jsonb_build_object('success', true, 'battle_id', p_battle_id, 'both_ready', COALESCE(v_both_ready, false));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_battle_ready(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_battle_ready(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.set_battle_ready(uuid) IS
  'G4 §3.3 : lobby — pose is_ready + last_seen_at du participant appelant.';

-- ============================================================================
-- 6) start_battle — lobby → active (crée le round 1)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.start_battle(p_battle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_battle public.battles%ROWTYPE;
  v_questions jsonb;
  v_qcount integer;
  v_qidx integer;
  v_q jsonb;
  v_payload jsonb;
  v_now timestamptz;
  v_deadline timestamptz;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_battle FROM public.battles WHERE id = p_battle_id FOR UPDATE;
  IF v_battle.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'battle_not_found');
  END IF;
  IF v_caller NOT IN (v_battle.creator_id, v_battle.opponent_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  -- Idempotence : si un appel concurrent a déjà démarré, renvoyer l'état.
  IF v_battle.status = 'active' THEN
    RETURN jsonb_build_object('success', true, 'battle_id', p_battle_id, 'status', 'active',
      'current_round', v_battle.current_round, 'round_deadline', v_battle.round_deadline,
      'current_payload', v_battle.current_payload);
  END IF;
  IF v_battle.status <> 'lobby' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_battle.status);
  END IF;

  -- Les 2 is_ready + présence (heartbeat < 30 s — §3.3 diagramme).
  IF EXISTS (
    SELECT 1 FROM public.battle_participants bp
    WHERE bp.battle_id = p_battle_id
      AND (bp.is_ready = false
        OR bp.last_seen_at IS NULL
        OR bp.last_seen_at < now() - interval '30 seconds')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'participants_not_ready');
  END IF;

  SELECT q.questions INTO v_questions
  FROM public.educational_quizzes q
  WHERE q.id = v_battle.quiz_id;
  v_qcount := COALESCE(jsonb_array_length(v_questions), 0);
  IF v_qcount < v_battle.rounds_total THEN
    RETURN jsonb_build_object('success', false, 'error', 'quiz_not_available');
  END IF;

  -- Question du round 1 : tirage aléatoire serveur dans le quiz.
  SELECT gs.idx INTO v_qidx
  FROM generate_series(0, v_qcount - 1) AS gs(idx)
  ORDER BY random()
  LIMIT 1;

  v_now := now();
  v_deadline := v_now + interval '15 seconds';  -- PO P6 : 15 s / round
  v_q := v_questions -> v_qidx;

  -- [M2] La bonne réponse ne quitte JAMAIS le serveur pendant la battle :
  -- current_payload est construit en WHITELIST (question + options) — les
  -- champs correct/explanation du JSONB n'y entrent jamais. Prérequis J0
  -- (mig 180) : la colonne questions elle-même est illisible pour
  -- authenticated, sinon ce strip serait du théâtre (red-team #1).
  v_payload := jsonb_build_object(
    'round_no', 1,
    'total_rounds', v_battle.rounds_total,
    'question', v_q -> 'question',
    'options', v_q -> 'options'
  );

  INSERT INTO public.battle_rounds (battle_id, round_no, question_index, started_at, deadline)
  VALUES (p_battle_id, 1, v_qidx, v_now, v_deadline);

  UPDATE public.battles
  SET status = 'active', started_at = v_now, current_round = 1,
      round_deadline = v_deadline, current_payload = v_payload
  WHERE id = p_battle_id;

  UPDATE public.battle_participants
  SET answered_current = false, round_seen_at = NULL, last_seen_at = now()
  WHERE battle_id = p_battle_id;

  RETURN jsonb_build_object('success', true, 'battle_id', p_battle_id, 'status', 'active',
    'current_round', 1, 'round_deadline', v_deadline, 'current_payload', v_payload);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.start_battle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_battle(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.start_battle(uuid) IS
  'G4 §3.3 : lobby→active (2× is_ready + présence). Crée le round 1 : question tirée serveur, payload whitelist SANS correct/explanation (M2).';

-- ============================================================================
-- 7) battle_round_seen — accusé de réception de la question (équité 3G)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.battle_round_seen(p_battle_id uuid, p_round_no integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_battle public.battles%ROWTYPE;
  v_seen timestamptz;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_battle FROM public.battles WHERE id = p_battle_id;
  IF v_battle.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'battle_not_found');
  END IF;
  IF v_caller NOT IN (v_battle.creator_id, v_battle.opponent_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  IF v_battle.status <> 'active' OR v_battle.current_round <> p_round_no THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_round', 'current_round', v_battle.current_round);
  END IF;

  -- [M3] round_seen_at = now() SERVEUR, posé UNE SEULE fois par round
  -- (COALESCE) : base de la deadline personnelle LEAST(deadline+3s,
  -- seen+15s) et du response_ms (§3.4-2). Retarder volontairement son ack
  -- rapporte au plus +3 s et reste visible dans les données (M8 :
  -- round_seen_at - started_at anormalement long).
  UPDATE public.battle_participants
  SET round_seen_at = COALESCE(round_seen_at, now()), last_seen_at = now()
  WHERE battle_id = p_battle_id AND teen_id = v_caller
  RETURNING round_seen_at INTO v_seen;

  RETURN jsonb_build_object('success', true, 'battle_id', p_battle_id, 'round_no', p_round_no, 'round_seen_at', v_seen);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.battle_round_seen(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.battle_round_seen(uuid, integer) TO authenticated, service_role;
COMMENT ON FUNCTION public.battle_round_seen(uuid, integer) IS
  'G4 §3.4-2 (red-team #14) : accusé de réception de la question courante. Pose round_seen_at (une fois) — base de la deadline personnelle et du response_ms.';

-- ============================================================================
-- 8) submit_battle_answer — correction et chrono 100 % serveur
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_battle_answer(
  p_battle_id uuid,
  p_round_no integer,
  p_answer_index integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_battle public.battles%ROWTYPE;
  v_round public.battle_rounds%ROWTYPE;
  v_part public.battle_participants%ROWTYPE;
  v_questions jsonb;
  v_correct_index integer;
  v_is_correct boolean;
  v_personal_start timestamptz;
  v_personal_deadline timestamptz;
  v_response_ms integer;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_answer_index IS NULL OR p_answer_index < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_answer');
  END IF;

  -- Concurrence §3.4-4 : FOR UPDATE sur la ligne battles — submit et
  -- advance se sérialisent sur ce verrou.
  SELECT * INTO v_battle FROM public.battles WHERE id = p_battle_id FOR UPDATE;
  IF v_battle.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'battle_not_found');
  END IF;
  IF v_caller NOT IN (v_battle.creator_id, v_battle.opponent_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  IF v_battle.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_battle.status);
  END IF;
  IF v_battle.current_round <> p_round_no THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_round', 'current_round', v_battle.current_round);
  END IF;

  SELECT * INTO v_round FROM public.battle_rounds
  WHERE battle_id = p_battle_id AND round_no = p_round_no;
  IF v_round.battle_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'round_not_found');
  END IF;

  SELECT * INTO v_part FROM public.battle_participants
  WHERE battle_id = p_battle_id AND teen_id = v_caller;

  -- --------------------------------------------------------------------
  -- [M3] Deadline PERSONNELLE (répondre après la deadline / lag simulé /
  -- pause devtools) : validité tranchée par now() SERVEUR contre
  -- LEAST(deadline + 3 s, round_seen_at + 15 s) — l'extension est
  -- plafonnée à +3 s. Sans accusé de réception : fallback deadline
  -- commune + tolérance 1 s (§3.4-2).
  -- [M5] L'horloge client n'entre dans AUCUN calcul : le client ne
  -- fournit jamais response_ms ni timestamp.
  -- --------------------------------------------------------------------
  IF v_part.round_seen_at IS NULL THEN
    v_personal_deadline := v_round.deadline + interval '1 second';
  ELSE
    v_personal_deadline := LEAST(v_round.deadline + interval '3 seconds',
                                 v_part.round_seen_at + interval '15 seconds');
  END IF;
  IF now() > v_personal_deadline THEN
    RETURN jsonb_build_object('success', false, 'error', 'answer_deadline_passed');
  END IF;

  -- --------------------------------------------------------------------
  -- [M2] Correction 100 % serveur : la RPC relit le JSONB complet en
  -- DEFINER (colonne questions illisible pour authenticated depuis J0,
  -- mig 180) et calcule is_correct elle-même. La bonne réponse n'est
  -- jamais renvoyée — seulement le verdict de SA propre réponse.
  -- --------------------------------------------------------------------
  SELECT q.questions INTO v_questions
  FROM public.educational_quizzes q
  WHERE q.id = v_battle.quiz_id;

  v_correct_index := (v_questions -> v_round.question_index ->> 'correct')::integer;
  IF v_correct_index IS NULL THEN
    -- Question sans champ `correct` (drift de format non attendu — la banque
    -- 022/038/172a/b utilise partout correct:int) : échec propre plutôt
    -- qu'une violation NOT NULL sur battle_answers.is_correct qui avorterait
    -- la transaction. Même garde que submit_game_answer.
    RETURN jsonb_build_object('success', false, 'error', 'question_unavailable');
  END IF;
  v_is_correct := (p_answer_index = v_correct_index);

  -- [M5] response_ms calculé SERVEUR : now() - GREATEST(started_at,
  -- round_seen_at) — mesuré depuis la RÉCEPTION de la question, pas depuis
  -- son émission (équité 3G, §3.4-2).
  v_personal_start := GREATEST(v_round.started_at, COALESCE(v_part.round_seen_at, v_round.started_at));
  v_response_ms := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - v_personal_start)) * 1000))::integer;

  -- [M4] Double soumission / replay : PK (battle_id, round_no, teen_id) —
  -- ON CONFLICT DO NOTHING, la seconde tentative renvoie l'état sans rien
  -- écrire ni recréditer.
  INSERT INTO public.battle_answers (battle_id, round_no, teen_id, answer_index, is_correct, response_ms)
  VALUES (p_battle_id, p_round_no, v_caller, p_answer_index, v_is_correct, v_response_ms)
  ON CONFLICT (battle_id, round_no, teen_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'already_answered', true);
  END IF;

  -- --------------------------------------------------------------------
  -- [red-team #5 / §3.4-4b] Publication différée des scores : mi-round on
  -- ne pousse QUE answered_current=true sur battle_participants (seul
  -- signal Realtime autorisé). score et correct_count sont recalculés et
  -- écrits par advance_battle_round à la CLÔTURE du round — sinon
  -- l'incrément correct_count adverse révélerait que la bonne réponse a
  -- été trouvée avant que j'aie répondu.
  -- --------------------------------------------------------------------
  UPDATE public.battle_participants
  SET answered_current = true, last_seen_at = now()
  WHERE battle_id = p_battle_id AND teen_id = v_caller;

  RETURN jsonb_build_object(
    'success', true,
    'battle_id', p_battle_id,
    'round_no', p_round_no,
    'is_correct', v_is_correct,
    'response_ms', v_response_ms
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.submit_battle_answer(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_battle_answer(uuid, integer, integer) TO authenticated, service_role;
COMMENT ON FUNCTION public.submit_battle_answer(uuid, integer, integer) IS
  'G4 §3.4 : correction serveur (M2), deadline personnelle LEAST(deadline+3s, seen+15s) (M3), response_ms serveur (M5), PK anti double-submit (M4), publication différée des scores (red-team #5).';

-- ============================================================================
-- 9) advance_battle_round — clôture du round (scores) puis round suivant ou
--    résolution ; idempotent, appelable par chaque participant
-- ============================================================================
CREATE OR REPLACE FUNCTION public.advance_battle_round(p_battle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_battle public.battles%ROWTYPE;
  v_round public.battle_rounds%ROWTYPE;
  v_answers_count integer;
  v_ans record;
  v_points integer;
  v_questions jsonb;
  v_qcount integer;
  v_qidx integer;
  v_q jsonb;
  v_payload jsonb;
  v_now timestamptz;
  v_deadline timestamptz;
  v_next_round integer;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Concurrence §3.4-4 : FOR UPDATE — deux advance concurrents se
  -- sérialisent ; le second voit le round déjà clos et no-op (idempotence).
  SELECT * INTO v_battle FROM public.battles WHERE id = p_battle_id FOR UPDATE;
  IF v_battle.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'battle_not_found');
  END IF;
  IF v_caller NOT IN (v_battle.creator_id, v_battle.opponent_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  -- Idempotence : battle déjà résolue/expirée ⇒ renvoyer l'état, ne rien
  -- recréditer (le crédit est de toute façon gardé par 169/182 — M6).
  IF v_battle.status IN ('resolved', 'expired') THEN
    RETURN jsonb_build_object('success', true, 'battle_id', p_battle_id, 'status', v_battle.status,
      'advanced', false, 'winner_id', v_battle.winner_id, 'is_draw', v_battle.is_draw);
  END IF;
  IF v_battle.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_battle.status);
  END IF;

  SELECT * INTO v_round FROM public.battle_rounds
  WHERE battle_id = p_battle_id AND round_no = v_battle.current_round;
  IF v_round.battle_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'round_not_found');
  END IF;

  SELECT COUNT(*) INTO v_answers_count
  FROM public.battle_answers ba
  WHERE ba.battle_id = p_battle_id AND ba.round_no = v_battle.current_round;

  -- Clôture si (2 réponses) OU (deadline commune + 3 s dépassée). Le +3 s
  -- = l'extension personnelle MAXIMALE de M3 : on ne tronque jamais la
  -- fenêtre d'un joueur lent qui a encore le droit de répondre (§3.4-2).
  IF NOT (v_answers_count >= 2 OR now() >= v_round.deadline + interval '3 seconds') THEN
    RETURN jsonb_build_object('success', true, 'advanced', false, 'reason', 'round_still_open',
      'current_round', v_battle.current_round, 'answers_count', v_answers_count);
  END IF;

  -- --------------------------------------------------------------------
  -- [M1] Le score est DÉRIVÉ, jamais soumis : barème serveur §3.4-3 —
  -- 100 points si correct + bonus vitesse floor(50 × restant/15 s) sur la
  -- fenêtre personnelle (response_ms mesuré depuis la réception) ; 0 si
  -- incorrect ou hors délai. Aucune RPC n'accepte de score client
  -- (contraste assumé avec le legacy submit_game_score, révoqué en J8).
  -- [red-team #5 / §3.4-4b] C'est ICI, à la clôture du round, que score
  -- et correct_count sont publiés sur battle_participants — jamais
  -- mi-round.
  -- --------------------------------------------------------------------
  FOR v_ans IN
    SELECT ba.teen_id, ba.is_correct, ba.response_ms
    FROM public.battle_answers ba
    WHERE ba.battle_id = p_battle_id AND ba.round_no = v_battle.current_round
  LOOP
    v_points := 0;
    IF v_ans.is_correct THEN
      v_points := 100 + FLOOR(50.0 * GREATEST(0, 15000 - v_ans.response_ms)::numeric / 15000.0)::integer;
    END IF;
    UPDATE public.battle_participants
    SET score = score + v_points,
        correct_count = correct_count + CASE WHEN v_ans.is_correct THEN 1 ELSE 0 END
    WHERE battle_id = p_battle_id AND teen_id = v_ans.teen_id;
  END LOOP;

  UPDATE public.battle_participants
  SET answered_current = false, round_seen_at = NULL
  WHERE battle_id = p_battle_id;

  -- Dernier round ⇒ résolution (XP, crew, notifications) dans la MÊME
  -- transaction (§3.4-5).
  IF v_battle.current_round >= v_battle.rounds_total THEN
    RETURN public.resolve_battle(p_battle_id, 'score', NULL);
  END IF;

  -- Round suivant : question ALÉATOIRE serveur jamais déjà servie dans
  -- cette battle.
  SELECT q.questions INTO v_questions
  FROM public.educational_quizzes q
  WHERE q.id = v_battle.quiz_id;
  v_qcount := COALESCE(jsonb_array_length(v_questions), 0);

  SELECT gs.idx INTO v_qidx
  FROM generate_series(0, v_qcount - 1) AS gs(idx)
  WHERE gs.idx NOT IN (
    SELECT br.question_index FROM public.battle_rounds br WHERE br.battle_id = p_battle_id
  )
  ORDER BY random()
  LIMIT 1;
  IF v_qidx IS NULL THEN
    -- Plus de question inédite (ne doit pas arriver : create_battle exige
    -- jsonb_array_length >= rounds_total) ⇒ résolution sur le score acquis.
    RETURN public.resolve_battle(p_battle_id, 'score', NULL);
  END IF;

  v_now := now();
  v_deadline := v_now + interval '15 seconds';
  v_next_round := v_battle.current_round + 1;
  v_q := v_questions -> v_qidx;

  -- [M2] Whitelist : jamais correct/explanation dans le payload.
  v_payload := jsonb_build_object(
    'round_no', v_next_round,
    'total_rounds', v_battle.rounds_total,
    'question', v_q -> 'question',
    'options', v_q -> 'options'
  );

  INSERT INTO public.battle_rounds (battle_id, round_no, question_index, started_at, deadline)
  VALUES (p_battle_id, v_next_round, v_qidx, v_now, v_deadline);

  UPDATE public.battles
  SET current_round = v_next_round, round_deadline = v_deadline, current_payload = v_payload
  WHERE id = p_battle_id;

  RETURN jsonb_build_object('success', true, 'advanced', true, 'battle_id', p_battle_id,
    'current_round', v_next_round, 'round_deadline', v_deadline, 'current_payload', v_payload);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.advance_battle_round(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.advance_battle_round(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.advance_battle_round(uuid) IS
  'G4 §3.3/§3.4 : clôture du round courant (scores dérivés serveur — M1, publiés ICI seulement — red-team #5), puis round suivant ou resolve_battle. Idempotent, appelable par chaque participant (filet : sweeper).';

-- ============================================================================
-- 10) claim_forfeit — active → resolved (forfait sur abandon/déconnexion)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.claim_forfeit(p_battle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_battle public.battles%ROWTYPE;
  v_other uuid;
  v_other_seen timestamptz;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_battle FROM public.battles WHERE id = p_battle_id FOR UPDATE;
  IF v_battle.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'battle_not_found');
  END IF;
  IF v_caller NOT IN (v_battle.creator_id, v_battle.opponent_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  IF v_battle.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'status', v_battle.status);
  END IF;

  v_other := CASE WHEN v_caller = v_battle.creator_id THEN v_battle.opponent_id ELSE v_battle.creator_id END;

  -- [M12] Abandon stratégique pour éviter la défaite : le forfait EST une
  -- défaite — heartbeat adverse absent > 30 s ⇒ resolution='forfeit',
  -- gagnant = celui qui est resté, l'abandonneur ne touche PAS l'XP de
  -- participation (15/0, §6.1).
  SELECT COALESCE(bp.last_seen_at, v_battle.started_at) INTO v_other_seen
  FROM public.battle_participants bp
  WHERE bp.battle_id = p_battle_id AND bp.teen_id = v_other;

  IF v_other_seen IS NULL OR v_other_seen > now() - interval '30 seconds' THEN
    RETURN jsonb_build_object('success', false, 'error', 'opponent_still_present');
  END IF;

  RETURN public.resolve_battle(p_battle_id, 'forfeit', v_caller);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_forfeit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_forfeit(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.claim_forfeit(uuid) IS
  'G4 §3.3 : active→resolved par forfait (M12) — heartbeat adverse absent > 30 s, gagnant = resté (XP 15/0).';

-- ============================================================================
-- 11) battle_heartbeat — présence (appelé ~toutes les 10 s par le client)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.battle_heartbeat(p_battle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  UPDATE public.battle_participants bp
  SET last_seen_at = now()
  FROM public.battles b
  WHERE bp.battle_id = p_battle_id
    AND bp.teen_id = v_caller
    AND b.id = bp.battle_id
    AND b.status IN ('lobby', 'active');
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'battle_not_found_or_inactive');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.battle_heartbeat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.battle_heartbeat(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.battle_heartbeat(uuid) IS
  'G4 §3.3 : heartbeat de présence (lobby/active) — base de la détection d''abandon (claim_forfeit, 30 s).';

-- ============================================================================
-- 12) resolve_battle — résolution + crédit XP + crew ladder + notifications
--     (INTERNE : appelée par advance_battle_round/claim_forfeit ; exposée
--      seulement à service_role — PAS à authenticated)
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
      '/teen/games/battle/' || p_battle_id,
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
  'G4 §3.4-5 (INTERNE/service_role) : résolution idempotente — XP barème P1 (30/10/15/15-0) via add_xp_to_user (M6), plafonds 5/j (M6) + 2/paire/j (M7) sous advisory locks (red-team #3), plancher anti-bot 250ms (M8), crew ladder mig 133, notifications.';

-- ============================================================================
-- 13) sweep_battles — filet cron (service_role UNIQUEMENT, §3.3)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sweep_battles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_expired_invited integer := 0;
  v_expired_lobby integer := 0;
  v_expired_active integer := 0;
BEGIN
  -- invited : TTL 24 h dépassé.
  UPDATE public.battles
  SET status = 'expired', resolution = 'expired', resolved_at = now(),
      current_payload = NULL, round_deadline = NULL
  WHERE status = 'invited' AND expires_at <= now();
  GET DIAGNOSTICS v_expired_invited = ROW_COUNT;

  -- lobby : inactif > 10 min (aucun heartbeat récent).
  UPDATE public.battles b
  SET status = 'expired', resolution = 'expired', resolved_at = now(),
      current_payload = NULL, round_deadline = NULL
  WHERE b.status = 'lobby'
    AND COALESCE(b.accepted_at, b.created_at) < now() - interval '10 minutes'
    AND NOT EXISTS (
      SELECT 1 FROM public.battle_participants bp
      WHERE bp.battle_id = b.id AND bp.last_seen_at > now() - interval '10 minutes'
    );
  GET DIAGNOSTICS v_expired_lobby = ROW_COUNT;

  -- active : bloquée > 15 min ⇒ expired, 0 XP (résolution 'expired', §3.3 —
  -- personne n'est crédité, le ledger reste vierge pour cette battle).
  UPDATE public.battles
  SET status = 'expired', resolution = 'expired', resolved_at = now(),
      current_payload = NULL, round_deadline = NULL
  WHERE status = 'active' AND started_at < now() - interval '15 minutes';
  GET DIAGNOSTICS v_expired_active = ROW_COUNT;

  RETURN jsonb_build_object('success', true,
    'expired_invited', v_expired_invited,
    'expired_lobby', v_expired_lobby,
    'expired_active', v_expired_active);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sweep_battles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_battles() TO service_role;
COMMENT ON FUNCTION public.sweep_battles() IS
  'G4 §3.3 (service_role, cron Vercel */10 min — J3) : invited TTL 24h / lobby inactif >10 min / active bloquée >15 min ⇒ expired, 0 XP.';

-- ============================================================================
-- 14) create_game_session_v2 — session mini-jeu solo, seed serveur (§7.1)
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
  IF p_game_slug IN ('quiz_rush', 'vrai_faux') THEN
    v_n := CASE p_game_slug WHEN 'vrai_faux' THEN 15 ELSE 10 END;

    BEGIN
      SELECT array_agg(r.quiz_id) INTO v_reco
      FROM public.recommend_quizzes_for_teen(v_caller, 5) r;
    EXCEPTION WHEN OTHERS THEN
      v_reco := NULL;
    END;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('quiz_id', s.qid, 'question_index', s.qidx)), '[]'::jsonb)
    INTO v_seed_questions
    FROM (
      SELECT q.id AS qid, gs.idx AS qidx
      FROM public.educational_quizzes q
      CROSS JOIN LATERAL generate_series(0, jsonb_array_length(q.questions) - 1) AS gs(idx)
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
        SELECT q.id AS qid, gs.idx AS qidx
        FROM public.educational_quizzes q
        CROSS JOIN LATERAL generate_series(0, jsonb_array_length(q.questions) - 1) AS gs(idx)
        WHERE q.is_active = true
        ORDER BY random()
        LIMIT v_n
      ) s;
    END IF;

    IF jsonb_array_length(v_seed_questions) = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'no_active_quiz');
    END IF;
  ELSE
    -- Jeux non-quiz (memory, J6) : seed minimal — le layout serveur/la
    -- plausibilité bornée (§7.2, exception M1 explicite ≤ 15 XP) seront
    -- câblés au jalon J6 sans changer ce socle.
    v_seed_questions := '[]'::jsonb;
  END IF;

  INSERT INTO public.game_sessions (teen_id, game_slug, seed)
  VALUES (v_caller, p_game_slug, jsonb_build_object('kind', p_game_slug, 'questions', v_seed_questions))
  RETURNING id, expires_at INTO v_session_id, v_expires_at;

  -- [M2] Énoncés renvoyés au client en WHITELIST (question + options) —
  -- jamais correct/explanation.
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
  'G4 §7.1 : crée une session mini-jeu solo — seed serveur (M11), banque modérée uniquement (§5.2), cooldown catalogue (M6), énoncés whitelist sans correct/explanation (M2).';

-- ============================================================================
-- 15) submit_game_answer — correction serveur, append-only dans answers
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
  v_correct_index integer;
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
  -- contenu correct/explanation.
  SELECT (q.questions -> (v_item ->> 'question_index')::integer ->> 'correct')::integer
  INTO v_correct_index
  FROM public.educational_quizzes q
  WHERE q.id = (v_item ->> 'quiz_id')::uuid;
  IF v_correct_index IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'question_unavailable');
  END IF;

  v_is_correct := (p_answer_index = v_correct_index);

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
  'G4 §7.1 (red-team #13) : correction serveur question par question (M2), verdict appendé dans game_sessions.answers (stockage autoritaire, M1), idempotent par question (M4).';

-- ============================================================================
-- 16) complete_game_session — score dérivé de answers UNIQUEMENT + crédit XP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_game_session(p_session_id uuid)
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

  -- --------------------------------------------------------------------
  -- [M1] Le score est dérivé EXCLUSIVEMENT de game_sessions.answers
  -- (verdicts écrits par submit_game_answer) — aucun paramètre score/coups
  -- accepté du client (red-team #13). Contraste assumé avec le legacy
  -- submit_game_score (mig 011, confiance p_score) qui sera révoqué en J8.
  -- (L'unique exception au principe, la plausibilité Memory §7.2 bornée à
  -- 15 XP, arrive au jalon J6 et sera étiquetée comme telle.)
  -- --------------------------------------------------------------------
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

REVOKE EXECUTE ON FUNCTION public.complete_game_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_game_session(uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.complete_game_session(uuid) IS
  'G4 §7.1 : clôture de session — score dérivé EXCLUSIVEMENT de answers (M1), plafond 3 sessions créditées/jeu/jour Casablanca (M6) sous advisory lock (red-team #3), crédit idempotent add_xp_to_user.';

COMMIT;

-- ============================================================================
-- VÉRIFICATION (à exécuter À L'APPLICATION — critères de done J2, smoke-test
-- SQL transactionnel RAISE-rollback, spec §8 J2). Ne fait PAS partie de la
-- migration. Checklist (2 teens amis 'accepted' de test requis) :
-- ============================================================================
-- -- Gardes create_battle : non-ami ⇒ not_friends ; bloqué ⇒ blocked ;
-- --   2e battle non résolue même paire ⇒ pair_battle_pending ; 3e création
-- --   du jour même paire ⇒ pair_daily_limit ; ré-invitation < 24 h après un
-- --   decline ⇒ declined_cooldown ; 11e du jour ⇒ daily_invite_limit ;
-- --   uuid sans ligne teens(id=auth.uid()) ⇒ battle_identity_unsupported.
-- -- current_payload : SELECT current_payload FROM battles WHERE id=… ;
-- --   assert : payload::text NOT LIKE '%correct%' / '%explanation%'.
-- -- submit_battle_answer : après LEAST(deadline+3s, seen+15s) ⇒
-- --   answer_deadline_passed ; double submit ⇒ already_answered, pas de
-- --   double ligne ; score/correct_count INCHANGÉS sur battle_participants
-- --   jusqu'à advance_battle_round (§3.4-4b).
-- -- Battle complète scriptée (5 rounds, 2 joueurs) ⇒ resolved, scores
-- --   serveur ; xp_transactions : 1 ligne +30 / 1 ligne +10 ;
-- --   re-appel resolve_battle (service_role) ⇒ already_resolved, ZÉRO
-- --   crédit supplémentaire ; add_xp_to_user('battle', même id) direct ⇒
-- --   xp_already_awarded (§6.3).
-- -- Plafonds : 6e battle résolue du jour ⇒ xp_awarded=0 les deux ;
-- --   3e battle créditée même paire ⇒ 0.
-- -- Anti-TOCTOU : grep pg_advisory_xact_lock AVANT les COUNT (présent :
-- --   create_battle, resolve_battle, complete_game_session) ; prédicat jour
-- --   Africa/Casablanca dans TOUS les COUNT de plafond (grep : 5 sites).
-- -- claim_forfeit : heartbeat adverse < 30 s ⇒ opponent_still_present ;
-- --   > 30 s ⇒ resolved/forfeit, XP 15/0.
-- -- Canon coins : grep user_coins|spend_coins|top_up_teen sur ce fichier ⇒
-- --   uniquement des mentions en commentaire (aucun accès).
-- -- Crew ladder : resolve avec gagnant en crew actif ⇒ challenges_won +1,
-- --   total_challenges_won +1, update_crew_stats sans erreur ; teen sans
-- --   crew ⇒ pas d'erreur.
-- ============================================================================
