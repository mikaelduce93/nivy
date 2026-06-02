-- 148_realityfix_game_challenge_rpc_profiles_drift.sql
--
-- BUG (Postgres 42703 / 42P01): trois RPC de lecture cassées par le drift profiles.
--   * get_user_challenges  -> sous-requête participants `JOIN profiles p` lit p.pseudo
--     (absent de profiles) -> 42703, inconditionnel (résolu au plan, même 0 défi).
--   * end_game_session      -> `JOIN user_profiles up` : relation user_profiles INEXISTANTE
--     -> 42P01.
--   * get_game_leaderboard  -> `JOIN user_profiles up` dans les 3 branches (daily/weekly/all)
--     -> 42P01, leaderboard jeux 100% cassé.
--
-- Cause: pseudo/avatar des autres utilisateurs ont migré vers teens (fallback profiles.full_name)
-- ; la relation user_profiles n'existe plus.
--
-- Fix: remplacer `JOIN profiles`/`JOIN user_profiles` par LEFT JOIN teens + LEFT JOIN profiles
-- avec COALESCE(teens.pseudo, profiles.full_name) / COALESCE(teens.avatar_url, profiles.avatar_url).
-- LEFT JOIN pour ne perdre aucune ligne. search_path et SECURITY DEFINER inchangés (fix chirurgical).
-- Idempotent: CREATE OR REPLACE FUNCTION.

-- ── get_user_challenges ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_challenges(p_user_id uuid, p_status character varying DEFAULT NULL::character varying)
 RETURNS TABLE(challenge_id uuid, challenge_name character varying, challenge_type_slug character varying, challenge_type_name character varying, mode character varying, icon character varying, color character varying, target_value integer, stake_xp integer, status character varying, starts_at timestamp with time zone, ends_at timestamp with time zone, is_creator boolean, user_score integer, user_team character varying, participants jsonb, winner_id uuid, winning_team character varying, is_draw boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        fc.id as challenge_id,
        fc.name as challenge_name,
        ct.slug as challenge_type_slug,
        ct.name as challenge_type_name,
        ct.mode,
        ct.icon,
        ct.color,
        fc.target_value,
        fc.stake_xp,
        fc.status,
        fc.starts_at,
        fc.ends_at,
        (fc.creator_id = p_user_id) as is_creator,
        cp_user.current_score as user_score,
        cp_user.team as user_team,
        (
            SELECT jsonb_agg(jsonb_build_object(
                'user_id', cp.user_id,
                'pseudo', COALESCE(t.pseudo, pr.full_name),
                'avatar_url', COALESCE(t.avatar_url, pr.avatar_url),
                'team', cp.team,
                'status', cp.status,
                'score', cp.current_score,
                'is_winner', cp.is_winner
            ) ORDER BY cp.current_score DESC)
            FROM challenge_participants cp
            LEFT JOIN teens t ON cp.user_id = t.id
            LEFT JOIN profiles pr ON cp.user_id = pr.id
            WHERE cp.challenge_id = fc.id
        ) as participants,
        fc.winner_id,
        fc.winning_team,
        fc.is_draw
    FROM friend_challenges fc
    JOIN challenge_types ct ON fc.challenge_type_id = ct.id
    JOIN challenge_participants cp_user ON fc.id = cp_user.challenge_id AND cp_user.user_id = p_user_id
    WHERE (p_status IS NULL OR fc.status = p_status)
    ORDER BY
        CASE fc.status
            WHEN 'active' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'completed' THEN 3
            ELSE 4
        END,
        fc.ends_at ASC;
END;
$function$;

-- ── end_game_session ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.end_game_session(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_winner RECORD;
    v_participants JSONB;
BEGIN
    SELECT user_id, score INTO v_winner
    FROM mini_game_participants
    WHERE session_id = p_session_id
    ORDER BY score DESC
    LIMIT 1;

    WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) as rank
        FROM mini_game_participants
        WHERE session_id = p_session_id
    )
    UPDATE mini_game_participants p
    SET rank = r.rank
    FROM ranked r
    WHERE p.id = r.id;

    UPDATE mini_game_sessions
    SET status = 'completed',
        ended_at = NOW(),
        winner_user_id = v_winner.user_id
    WHERE id = p_session_id;

    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', p.user_id,
            'pseudo', COALESCE(t.pseudo, pr.full_name),
            'avatar_url', COALESCE(t.avatar_url, pr.avatar_url),
            'score', p.score,
            'rank', p.rank,
            'xp_earned', p.xp_earned
        ) ORDER BY p.rank
    )
    INTO v_participants
    FROM mini_game_participants p
    LEFT JOIN teens t ON t.id = p.user_id
    LEFT JOIN profiles pr ON pr.id = p.user_id
    WHERE p.session_id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'winner_id', v_winner.user_id,
        'winner_score', v_winner.score,
        'results', v_participants
    );
END;
$function$;

-- ── get_game_leaderboard (daily / weekly / all) ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_game_leaderboard(p_game_type_slug character varying, p_period character varying DEFAULT 'weekly'::character varying, p_limit integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_game_type_id UUID;
BEGIN
    SELECT id INTO v_game_type_id FROM mini_game_types WHERE slug = p_game_type_slug;

    IF p_period = 'daily' THEN
        RETURN (
            SELECT jsonb_agg(r)
            FROM (
                SELECT
                    ROW_NUMBER() OVER (ORDER BY best_score DESC) as rank,
                    d.user_id,
                    COALESCE(t.pseudo, pr.full_name) AS pseudo,
                    COALESCE(t.avatar_url, pr.avatar_url) AS avatar_url,
                    d.best_score as score,
                    d.games_played,
                    d.total_xp_earned
                FROM daily_game_scores d
                LEFT JOIN teens t ON t.id = d.user_id
                LEFT JOIN profiles pr ON pr.id = d.user_id
                WHERE d.game_type_id = v_game_type_id
                  AND d.score_date = CURRENT_DATE
                ORDER BY d.best_score DESC
                LIMIT p_limit
            ) r
        );
    ELSIF p_period = 'weekly' THEN
        RETURN (
            SELECT jsonb_agg(r)
            FROM (
                SELECT
                    ROW_NUMBER() OVER (ORDER BY total_score DESC) as rank,
                    w.user_id,
                    COALESCE(t.pseudo, pr.full_name) AS pseudo,
                    COALESCE(t.avatar_url, pr.avatar_url) AS avatar_url,
                    w.total_score as score,
                    w.games_played,
                    w.best_score
                FROM weekly_game_leaderboard w
                LEFT JOIN teens t ON t.id = w.user_id
                LEFT JOIN profiles pr ON pr.id = w.user_id
                WHERE w.game_type_id = v_game_type_id
                  AND w.week_start = date_trunc('week', CURRENT_DATE)::DATE
                ORDER BY w.total_score DESC
                LIMIT p_limit
            ) r
        );
    ELSE
        RETURN (
            SELECT jsonb_agg(r)
            FROM (
                SELECT
                    ROW_NUMBER() OVER (ORDER BY SUM(total_score) DESC) as rank,
                    w.user_id,
                    COALESCE(t.pseudo, pr.full_name) AS pseudo,
                    COALESCE(t.avatar_url, pr.avatar_url) AS avatar_url,
                    SUM(w.total_score) as score,
                    SUM(w.games_played) as games_played,
                    MAX(w.best_score) as best_score
                FROM weekly_game_leaderboard w
                LEFT JOIN teens t ON t.id = w.user_id
                LEFT JOIN profiles pr ON pr.id = w.user_id
                WHERE w.game_type_id = v_game_type_id
                GROUP BY w.user_id, t.pseudo, pr.full_name, t.avatar_url, pr.avatar_url
                ORDER BY SUM(w.total_score) DESC
                LIMIT p_limit
            ) r
        );
    END IF;
END;
$function$;
