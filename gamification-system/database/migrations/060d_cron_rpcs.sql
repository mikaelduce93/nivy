-- Migration 060d — Cron RPCs (evolve_all_teens + assign_missions_for_teen)
-- Date: 2026-04 (live-applied via MCP); committed to repo 2026-05-07 per Wave B.6
--
-- These two RPCs back vercel.json crons (/api/cron/evolve-teen-profiles and
-- /api/cron/assign-missions). Source: gamification-system + personalization
-- specs. Dumped from live to make `db reset` reproduce production.

BEGIN;

CREATE OR REPLACE FUNCTION public.evolve_all_teens()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_teen          record;
  v_rows          integer;
  v_total_rows    integer := 0;
  v_teens_count   integer := 0;
BEGIN
  FOR v_teen IN
    SELECT t.id
    FROM public.teens t
    JOIN auth.users u ON u.id = t.id
    WHERE u.last_sign_in_at > NOW() - INTERVAL '90 days'
  LOOP
    v_rows := public.update_affinity_scores(v_teen.id);
    v_total_rows  := v_total_rows + COALESCE(v_rows, 0);
    v_teens_count := v_teens_count + 1;
  END LOOP;

  RETURN json_build_object(
    'teens_processed',      v_teens_count,
    'total_rows_upserted',  v_total_rows
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.assign_missions_for_teen(p_teen_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_inserted integer := 0;
  v_now      timestamptz := now();
  v_today    date := (v_now AT TIME ZONE 'Africa/Casablanca')::date;
  v_d_start  date := v_today;
  v_d_end    date := v_today + INTERVAL '1 day';
  v_w_start  date := (date_trunc('week', v_today::timestamp))::date;
  v_w_end    date := ((date_trunc('week', v_today::timestamp))::date + INTERVAL '7 days')::date;
  v_m_start  date := (date_trunc('month', v_today::timestamp))::date;
  v_m_end    date := ((date_trunc('month', v_today::timestamp))::date + INTERVAL '1 month')::date;
  v_q_start  date := (date_trunc('quarter', v_today::timestamp))::date;
  v_q_end    date := ((date_trunc('quarter', v_today::timestamp))::date + INTERVAL '3 months')::date;
  v_count    integer;
  v_target   integer;
  v_to_add   integer;
  r          record;
BEGIN
  -- DAILY: target 3
  v_target := 3;
  SELECT COUNT(*) INTO v_count
  FROM user_missions um
  JOIN mission_templates mt ON mt.id = um.mission_id
  WHERE um.teen_id = p_teen_id AND mt.mission_type = 'daily'
    AND um.status = 'active' AND um.period_end > v_today;
  v_to_add := GREATEST(0, v_target - v_count);
  IF v_to_add > 0 THEN
    FOR r IN
      SELECT id FROM mission_templates
      WHERE is_active = true AND mission_type = 'daily'
        AND id NOT IN (
          SELECT mission_id FROM user_missions
          WHERE teen_id = p_teen_id AND status = 'active' AND period_end > v_today
        )
      ORDER BY random() LIMIT v_to_add
    LOOP
      INSERT INTO user_missions (teen_id, mission_id, status, period_start, period_end)
      VALUES (p_teen_id, r.id, 'active', v_d_start, v_d_end)
      ON CONFLICT (teen_id, mission_id, period_start) DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;
  END IF;

  -- WEEKLY: target 3
  v_target := 3;
  SELECT COUNT(*) INTO v_count
  FROM user_missions um JOIN mission_templates mt ON mt.id = um.mission_id
  WHERE um.teen_id = p_teen_id AND mt.mission_type = 'weekly'
    AND um.status = 'active' AND um.period_end > v_today;
  v_to_add := GREATEST(0, v_target - v_count);
  IF v_to_add > 0 THEN
    FOR r IN
      SELECT id FROM mission_templates
      WHERE is_active = true AND mission_type = 'weekly'
        AND id NOT IN (
          SELECT mission_id FROM user_missions
          WHERE teen_id = p_teen_id AND status = 'active' AND period_end > v_today
        )
      ORDER BY random() LIMIT v_to_add
    LOOP
      INSERT INTO user_missions (teen_id, mission_id, status, period_start, period_end)
      VALUES (p_teen_id, r.id, 'active', v_w_start, v_w_end)
      ON CONFLICT (teen_id, mission_id, period_start) DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;
  END IF;

  -- MONTHLY: target 3
  v_target := 3;
  SELECT COUNT(*) INTO v_count
  FROM user_missions um JOIN mission_templates mt ON mt.id = um.mission_id
  WHERE um.teen_id = p_teen_id AND mt.mission_type = 'monthly'
    AND um.status = 'active' AND um.period_end > v_today;
  v_to_add := GREATEST(0, v_target - v_count);
  IF v_to_add > 0 THEN
    FOR r IN
      SELECT id FROM mission_templates
      WHERE is_active = true AND mission_type = 'monthly'
        AND id NOT IN (
          SELECT mission_id FROM user_missions
          WHERE teen_id = p_teen_id AND status = 'active' AND period_end > v_today
        )
      ORDER BY random() LIMIT v_to_add
    LOOP
      INSERT INTO user_missions (teen_id, mission_id, status, period_start, period_end)
      VALUES (p_teen_id, r.id, 'active', v_m_start, v_m_end)
      ON CONFLICT (teen_id, mission_id, period_start) DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;
  END IF;

  -- SEASONAL: target 1
  v_target := 1;
  SELECT COUNT(*) INTO v_count
  FROM user_missions um JOIN mission_templates mt ON mt.id = um.mission_id
  WHERE um.teen_id = p_teen_id AND mt.mission_type = 'seasonal'
    AND um.status = 'active' AND um.period_end > v_today;
  v_to_add := GREATEST(0, v_target - v_count);
  IF v_to_add > 0 THEN
    FOR r IN
      SELECT id,
        CASE WHEN valid_from IS NOT NULL AND valid_until IS NOT NULL
              AND valid_from <= v_today AND valid_until > v_today
             THEN valid_from ELSE v_q_start END AS p_start,
        CASE WHEN valid_from IS NOT NULL AND valid_until IS NOT NULL
              AND valid_from <= v_today AND valid_until > v_today
             THEN valid_until ELSE v_q_end END AS p_end,
        CASE WHEN valid_from IS NOT NULL AND valid_until IS NOT NULL
              AND valid_from <= v_today AND valid_until > v_today
             THEN 0 ELSE 1 END AS sort_pref
      FROM mission_templates
      WHERE is_active = true AND mission_type = 'seasonal'
        AND id NOT IN (
          SELECT mission_id FROM user_missions
          WHERE teen_id = p_teen_id AND status = 'active' AND period_end > v_today
        )
      ORDER BY sort_pref, random() LIMIT v_to_add
    LOOP
      INSERT INTO user_missions (teen_id, mission_id, status, period_start, period_end)
      VALUES (p_teen_id, r.id, 'active', r.p_start, r.p_end)
      ON CONFLICT (teen_id, mission_id, period_start) DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;
  END IF;

  RETURN v_inserted;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.evolve_all_teens() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_missions_for_teen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evolve_all_teens() TO service_role;
GRANT EXECUTE ON FUNCTION public.assign_missions_for_teen(uuid) TO service_role, authenticated;

COMMIT;
