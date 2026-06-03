-- 110_realityfix_pii_views_invoker.sql
--
-- #54 (Pilier J) — Secure the 10 SECURITY DEFINER views that also GRANT SELECT
-- to `anon`. A DEFINER view runs with its owner's (superuser) rights, bypassing
-- the RLS of the underlying tables, so any unauthenticated client holding the
-- public anon key could read minors' PII, balances and the audit log.
--
-- Fix: flip every view to SECURITY INVOKER (the caller's RLS applies), REVOKE
-- anon, GRANT authenticated. The underlying tables already carry the right
-- SELECT policies for the legitimate callers (parent via parent_teen_links,
-- admin/super_admin on audit_log, owner/teen elsewhere — verified live).
--
-- The 3 leaderboard views are special: they intentionally aggregate ALL teens'
-- ranking data, which RLS (self/parent-only on user_xp) would collapse to a
-- single row under INVOKER. Rather than open user_xp wholesale (which would
-- newly expose school_score / sport_score / crea_score — minors' pillar scores
-- — to every authenticated user), each leaderboard is backed by a
-- SECURITY DEFINER function that returns ONLY the leaderboard projection
-- (no score columns), wrapped in a SECURITY INVOKER view so PostgREST
-- `.from('v_leaderboard_*')` keeps working and the advisor no longer flags a
-- definer view. The function's EXECUTE is revoked from anon.
--
-- The 3 leaderboard views are DROP+recreated (not CREATE OR REPLACE) because
-- their `pseudo` column is varchar(50) while a function result column is
-- unbounded varchar — CREATE OR REPLACE cannot change a column's type. No
-- dependent objects exist (verified). Grants are restored explicitly.
--
-- Idempotent: ALTER ... SET, CREATE OR REPLACE FUNCTION, DROP VIEW IF EXISTS +
-- CREATE VIEW, REVOKE/GRANT are all re-runnable.

-- ───────────────────────────────────────────────────────────────────────────
-- 1) Single-entity views → SECURITY INVOKER. Underlying RLS already supports
--    the legitimate authenticated caller.
-- ───────────────────────────────────────────────────────────────────────────
ALTER VIEW public.parent_teens_overview     SET (security_invoker = true);
ALTER VIEW public.teen_full_profile         SET (security_invoker = true);
ALTER VIEW public.admin_audit_logs          SET (security_invoker = true);
ALTER VIEW public.user_coins_spendable      SET (security_invoker = true);
ALTER VIEW public.parent_subscription_view  SET (security_invoker = true);
ALTER VIEW public.creator_daily_caps_status SET (security_invoker = true);
ALTER VIEW public.partner_discounts         SET (security_invoker = true);

-- ───────────────────────────────────────────────────────────────────────────
-- 2) Leaderboard projection functions (SECURITY DEFINER, safe columns only).
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leaderboard_all_time()
RETURNS TABLE(
  teen_id uuid, pseudo varchar, avatar_url text, city varchar,
  total_xp integer, level integer, current_streak integer, longest_streak integer,
  rank bigint, percentile double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $fn$
  SELECT ux.teen_id,
    t.pseudo,
    t.avatar_url,
    NULL::character varying AS city,
    ux.total_xp,
    ux.current_level AS level,
    us.current_streak,
    us.longest_streak,
    rank() OVER (ORDER BY ux.total_xp DESC) AS rank,
    percent_rank() OVER (ORDER BY ux.total_xp DESC) * 100::double precision AS percentile
  FROM public.user_xp ux
    JOIN public.teens t ON t.id = ux.teen_id
    LEFT JOIN public.user_streaks us ON us.teen_id = ux.teen_id
  WHERE ux.total_xp > 0
  ORDER BY ux.total_xp DESC;
$fn$;

CREATE OR REPLACE FUNCTION public.leaderboard_weekly()
RETURNS TABLE(
  teen_id uuid, pseudo varchar, avatar_url text, city varchar,
  xp_earned integer, challenges_completed integer, events_attended integer,
  streak_max integer, level integer, rank bigint, week_start date, week_end date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $fn$
  WITH current_week AS (
    SELECT date_trunc('week', CURRENT_DATE::timestamptz)::date AS week_start,
           (date_trunc('week', CURRENT_DATE::timestamptz) + interval '6 days')::date AS week_end
  )
  SELECT xw.teen_id,
    t.pseudo,
    t.avatar_url,
    NULL::character varying AS city,
    xw.xp_earned,
    xw.challenges_completed,
    xw.events_attended,
    xw.streak_max,
    ux.current_level AS level,
    rank() OVER (ORDER BY xw.xp_earned DESC) AS rank,
    cw.week_start,
    cw.week_end
  FROM public.xp_weekly xw
    JOIN public.teens t ON t.id = xw.teen_id
    JOIN public.user_xp ux ON ux.teen_id = xw.teen_id
    CROSS JOIN current_week cw
  WHERE xw.week_start = cw.week_start AND xw.xp_earned > 0
  ORDER BY xw.xp_earned DESC;
$fn$;

CREATE OR REPLACE FUNCTION public.leaderboard_monthly()
RETURNS TABLE(
  teen_id uuid, pseudo varchar, avatar_url text, city varchar,
  xp_earned integer, challenges_completed integer, events_attended integer,
  streak_max integer, best_weekly_rank integer, level integer,
  rank bigint, month integer, year integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $fn$
  SELECT xm.teen_id,
    t.pseudo,
    t.avatar_url,
    NULL::character varying AS city,
    xm.xp_earned,
    xm.challenges_completed,
    xm.events_attended,
    xm.streak_max,
    xm.best_weekly_rank,
    ux.current_level AS level,
    rank() OVER (ORDER BY xm.xp_earned DESC) AS rank,
    xm.month,
    xm.year
  FROM public.xp_monthly xm
    JOIN public.teens t ON t.id = xm.teen_id
    JOIN public.user_xp ux ON ux.teen_id = xm.teen_id
  WHERE xm.month::numeric = EXTRACT(month FROM CURRENT_DATE)
    AND xm.year::numeric = EXTRACT(year FROM CURRENT_DATE)
    AND xm.xp_earned > 0
  ORDER BY xm.xp_earned DESC;
$fn$;

REVOKE ALL ON FUNCTION public.leaderboard_all_time() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.leaderboard_weekly()   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.leaderboard_monthly()  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leaderboard_all_time() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard_weekly()   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.leaderboard_monthly()  TO authenticated, service_role;

-- Recreate the leaderboard views as INVOKER wrappers over the functions.
DROP VIEW IF EXISTS public.v_leaderboard_all_time;
CREATE VIEW public.v_leaderboard_all_time WITH (security_invoker = true) AS
  SELECT * FROM public.leaderboard_all_time();
GRANT SELECT ON public.v_leaderboard_all_time TO authenticated, service_role;

DROP VIEW IF EXISTS public.v_leaderboard_weekly;
CREATE VIEW public.v_leaderboard_weekly WITH (security_invoker = true) AS
  SELECT * FROM public.leaderboard_weekly();
GRANT SELECT ON public.v_leaderboard_weekly TO authenticated, service_role;

DROP VIEW IF EXISTS public.v_leaderboard_monthly;
CREATE VIEW public.v_leaderboard_monthly WITH (security_invoker = true) AS
  SELECT * FROM public.leaderboard_monthly();
GRANT SELECT ON public.v_leaderboard_monthly TO authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 3) Revoke anon, ensure authenticated read on all 10 views.
-- ───────────────────────────────────────────────────────────────────────────
DO $do$
DECLARE v text;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'parent_teens_overview','teen_full_profile','admin_audit_logs',
    'user_coins_spendable','parent_subscription_view','creator_daily_caps_status',
    'partner_discounts','v_leaderboard_all_time','v_leaderboard_weekly',
    'v_leaderboard_monthly'
  ]
  LOOP
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', v);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v);
  END LOOP;
END $do$;
