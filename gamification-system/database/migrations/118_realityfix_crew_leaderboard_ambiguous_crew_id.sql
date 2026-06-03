-- 118_realityfix_crew_leaderboard_ambiguous_crew_id.sql
--
-- BUG (Postgres 42702): "column reference \"crew_id\" is ambiguous" raised by
-- get_crew_leaderboard(), surfaced at runtime as `Error fetching crew
-- leaderboard` on /teen/circles. (Previously masked: the page errored earlier
-- on the crew_members / circles RLS recursion fixed in 116–117, so the RPC was
-- never reached.)
--
-- Cause: the function's RETURNS TABLE declares an output column named `crew_id`.
-- Inside the member-count subqueries the predicate `WHERE crew_id = c.id` is
-- ambiguous between that output column and crew_members.crew_id, so plpgsql
-- refuses to plan it.
--
-- Fix: qualify the column as crew_members.crew_id in both branches (weekly and
-- all_time). Also fixes a second latent bug exposed once the 42702 was cleared:
-- the function selected `p.pseudo` from profiles, but profiles has no `pseudo`
-- column (42703) — the owner display name lives in profiles.full_name. Signature
-- and search_path preserved.

CREATE OR REPLACE FUNCTION public.get_crew_leaderboard(
    p_period character varying DEFAULT 'all_time'::character varying,
    p_limit integer DEFAULT 50
)
RETURNS TABLE(
    rank bigint,
    crew_id uuid,
    name character varying,
    slug character varying,
    avatar_url text,
    color character varying,
    total_xp bigint,
    member_count bigint,
    average_level numeric,
    owner_pseudo character varying
)
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
    IF p_period = 'weekly' THEN
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY cws.xp_earned DESC) as rank,
            c.id as crew_id,
            c.name,
            c.slug,
            c.avatar_url,
            c.color,
            cws.xp_earned::bigint as total_xp,
            (SELECT COUNT(*) FROM crew_members WHERE crew_members.crew_id = c.id AND status = 'active') as member_count,
            c.average_level,
            p.full_name::varchar as owner_pseudo
        FROM crews c
        JOIN profiles p ON c.owner_id = p.id
        LEFT JOIN crew_weekly_stats cws ON c.id = cws.crew_id
            AND cws.week_start = DATE_TRUNC('week', CURRENT_DATE)::DATE
        ORDER BY cws.xp_earned DESC NULLS LAST
        LIMIT p_limit;
    ELSE
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY c.total_xp DESC) as rank,
            c.id as crew_id,
            c.name,
            c.slug,
            c.avatar_url,
            c.color,
            c.total_xp::bigint as total_xp,
            (SELECT COUNT(*) FROM crew_members WHERE crew_members.crew_id = c.id AND status = 'active') as member_count,
            c.average_level,
            p.full_name::varchar as owner_pseudo
        FROM crews c
        JOIN profiles p ON c.owner_id = p.id
        ORDER BY c.total_xp DESC
        LIMIT p_limit;
    END IF;
END;
$function$;
