-- 149_realityfix_xp_credit_rpc_user_profiles.sql
--
-- BUG (Postgres 42P01): quatre RPC créditent l'XP via `UPDATE user_profiles SET xp=…,
-- total_xp=…`. La relation user_profiles N'EXISTE PAS -> 42P01. Sans EXCEPTION interne,
-- toute la transaction RPC rollback : ni XP crédité, ni état persisté (défi 'completed',
-- case advent ouverte, prédiction résolue, score soumis).
--   * complete_seasonal_challenge, open_advent_day, submit_game_score : UPDATE simple par id.
--   * resolve_prediction : UPDATE … FROM user_predictions.
--
-- Cause: l'XP vit sur user_xp(teen_id, total_xp). `xp` est aussi un fantôme (aucune table
-- réelle n'a de colonne xp) — on ne garde que total_xp.
--
-- Fix: `UPDATE user_xp SET total_xp = total_xp + v WHERE teen_id = p_user_id` ; pour
-- resolve_prediction, jointure sur user_xp.teen_id. Reste des fonctions inchangé (chirurgical),
-- search_path/SECURITY DEFINER conservés. Idempotent: CREATE OR REPLACE.

-- ── complete_seasonal_challenge ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.complete_seasonal_challenge(p_user_id uuid, p_challenge_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_challenge RECORD;
    v_progress RECORD;
    v_xp_earned INTEGER;
    v_reward JSONB;
BEGIN
    SELECT * INTO v_challenge FROM seasonal_challenges WHERE id = p_challenge_id AND is_active = true;
    IF v_challenge IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi non trouvé');
    END IF;

    INSERT INTO user_seasonal_progress (user_id, seasonal_challenge_id, status, current_count)
    VALUES (p_user_id, p_challenge_id, 'in_progress', 0)
    ON CONFLICT (user_id, seasonal_challenge_id) DO NOTHING;

    SELECT * INTO v_progress FROM user_seasonal_progress
    WHERE user_id = p_user_id AND seasonal_challenge_id = p_challenge_id;

    IF v_progress.status IN ('completed', 'claimed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi déjà complété');
    END IF;

    IF v_progress.current_count < v_challenge.target_count THEN
        RETURN jsonb_build_object('success', false, 'error', 'Objectif non atteint',
            'current', v_progress.current_count, 'target', v_challenge.target_count);
    END IF;

    v_xp_earned := v_challenge.xp_reward + COALESCE(v_challenge.bonus_xp, 0);

    UPDATE user_seasonal_progress
    SET status = 'completed', completed_at = NOW(), xp_earned = v_xp_earned, updated_at = NOW()
    WHERE id = v_progress.id;

    -- realityfix: crédit XP sur user_xp (était user_profiles inexistant)
    UPDATE user_xp SET total_xp = total_xp + v_xp_earned WHERE teen_id = p_user_id;

    v_reward := jsonb_build_object('type', v_challenge.reward_type, 'data', v_challenge.reward_data);

    RETURN jsonb_build_object('success', true, 'challenge_id', p_challenge_id,
        'xp_earned', v_xp_earned, 'reward', v_reward);
END;
$function$;

-- ── open_advent_day ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.open_advent_day(p_user_id uuid, p_day_number integer)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_calendar_id UUID;
    v_calendar_start DATE;
    v_today DATE := CURRENT_DATE;
    v_day_data RECORD;
    v_xp_earned INTEGER := 0;
    v_reward JSONB;
    v_already_opened BOOLEAN;
BEGIN
    SELECT id, start_date INTO v_calendar_id, v_calendar_start
    FROM advent_calendars
    WHERE is_active = true AND start_date <= v_today AND end_date >= v_today
    LIMIT 1;

    IF v_calendar_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pas de calendrier actif');
    END IF;

    IF p_day_number > (v_today - v_calendar_start)::INTEGER + 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ce jour n''est pas encore disponible');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM user_advent_progress
        WHERE user_id = p_user_id AND advent_calendar_id = v_calendar_id AND day_number = p_day_number
    ) INTO v_already_opened;

    IF v_already_opened THEN
        RETURN jsonb_build_object('success', false, 'error', 'Case déjà ouverte');
    END IF;

    SELECT * INTO v_day_data FROM advent_calendar_days
    WHERE advent_calendar_id = v_calendar_id AND day_number = p_day_number;

    IF v_day_data IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Case non trouvée');
    END IF;

    CASE v_day_data.reward_type
        WHEN 'xp' THEN v_xp_earned := v_day_data.reward_amount;
        WHEN 'coins' THEN v_xp_earned := 10;
        WHEN 'mystery_box' THEN v_xp_earned := 25;
        WHEN 'badge' THEN v_xp_earned := 50;
        WHEN 'item' THEN v_xp_earned := 30;
        WHEN 'special' THEN v_xp_earned := 100;
        ELSE v_xp_earned := 10;
    END CASE;

    INSERT INTO user_advent_progress (user_id, advent_calendar_id, day_number, xp_earned)
    VALUES (p_user_id, v_calendar_id, p_day_number, v_xp_earned);

    -- realityfix: crédit XP sur user_xp (était user_profiles inexistant)
    UPDATE user_xp SET total_xp = total_xp + v_xp_earned WHERE teen_id = p_user_id;

    v_reward := jsonb_build_object('type', v_day_data.reward_type, 'amount', v_day_data.reward_amount,
        'title', v_day_data.title, 'description', v_day_data.description,
        'icon', v_day_data.icon, 'data', v_day_data.reward_data);

    RETURN jsonb_build_object('success', true, 'day_number', p_day_number,
        'reward', v_reward, 'xp_earned', v_xp_earned);
END;
$function$;

-- ── resolve_prediction ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_prediction(p_question_id uuid, p_correct_option_index integer)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_question RECORD;
    v_updated_count INTEGER := 0;
BEGIN
    SELECT * INTO v_question FROM prediction_questions WHERE id = p_question_id;
    IF v_question IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Question non trouvée');
    END IF;

    UPDATE prediction_questions
    SET correct_option_index = p_correct_option_index, status = 'resolved', resolution_time = NOW()
    WHERE id = p_question_id;

    UPDATE user_predictions up
    SET is_correct = (selected_option_index = p_correct_option_index),
        points_earned = CASE
            WHEN selected_option_index = p_correct_option_index THEN
                ROUND(v_question.points_for_correct * (confidence::NUMERIC / 100)) +
                CASE WHEN bonus_earned THEN v_question.bonus_points ELSE 0 END
            ELSE 0
        END
    WHERE prediction_question_id = p_question_id;

    -- realityfix: crédit XP sur user_xp (était user_profiles inexistant)
    UPDATE user_xp ux
    SET total_xp = total_xp + pred.points_earned
    FROM user_predictions pred
    WHERE pred.user_id = ux.teen_id
      AND pred.prediction_question_id = p_question_id
      AND pred.is_correct = true;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'correct_option', p_correct_option_index,
        'winners_count', v_updated_count);
END;
$function$;

-- ── submit_game_score ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_game_score(p_user_id uuid, p_session_id uuid, p_score integer, p_game_state jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_session RECORD;
    v_xp_earned INTEGER;
BEGIN
    SELECT s.*, gt.base_xp, gt.slug as game_slug INTO v_session
    FROM mini_game_sessions s
    JOIN mini_game_types gt ON gt.id = s.game_type_id
    WHERE s.id = p_session_id;

    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session non trouvée');
    END IF;

    v_xp_earned := v_session.base_xp + LEAST(p_score / 10, 50);

    UPDATE mini_game_participants
    SET score = p_score, game_state = p_game_state, xp_earned = v_xp_earned, finished_at = NOW()
    WHERE session_id = p_session_id AND user_id = p_user_id;

    INSERT INTO daily_game_scores (user_id, game_type_id, score_date, best_score, games_played, total_xp_earned)
    VALUES (p_user_id, v_session.game_type_id, CURRENT_DATE, p_score, 1, v_xp_earned)
    ON CONFLICT (user_id, game_type_id, score_date) DO UPDATE SET
        best_score = GREATEST(daily_game_scores.best_score, p_score),
        games_played = daily_game_scores.games_played + 1,
        total_xp_earned = daily_game_scores.total_xp_earned + v_xp_earned,
        updated_at = NOW();

    INSERT INTO weekly_game_leaderboard (user_id, game_type_id, week_start, total_score, games_played, best_score)
    VALUES (p_user_id, v_session.game_type_id, date_trunc('week', CURRENT_DATE)::DATE, p_score, 1, p_score)
    ON CONFLICT (user_id, game_type_id, week_start) DO UPDATE SET
        total_score = weekly_game_leaderboard.total_score + p_score,
        games_played = weekly_game_leaderboard.games_played + 1,
        best_score = GREATEST(weekly_game_leaderboard.best_score, p_score),
        updated_at = NOW();

    -- realityfix: crédit XP sur user_xp (était user_profiles inexistant)
    UPDATE user_xp SET total_xp = total_xp + v_xp_earned WHERE teen_id = p_user_id;

    RETURN jsonb_build_object('success', true, 'score', p_score, 'xp_earned', v_xp_earned);
END;
$function$;
