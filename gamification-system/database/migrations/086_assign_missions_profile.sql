-- Migration 086 — Profile-aware mission assignment (TICKET-037, Wave 3 P1)
--
-- Replaces v1 of `assign_missions_for_teen` (060d) with a profile-aware
-- variant that ranks candidate `mission_templates` by overlap between their
-- `tags` array and the teen's `affinity_scores` top tags. Behaviour:
--   * If the teen has ≥1 affinity_scores row, pick missions with the
--     highest summed affinity over their tags (tiebreaker: random()).
--     Each row inserted into `user_missions` is tagged
--     `assigned_via = 'profile'`.
--   * If the teen has zero affinity_scores rows (cold start) or the chosen
--     candidate has no overlapping tags, fall back to ORDER BY random()
--     and tag the row `assigned_via = 'fallback'`.
--   * Manual overrides (e.g. admin / future UI) should set
--     `assigned_via = 'manual'`.
--
-- Quotas (3 daily / 3 weekly / 3 monthly / 1 seasonal) and dedup behaviour
-- are unchanged — only the candidate ordering changes. The seasonal slot
-- still prefers currently-valid templates (`valid_from <= today < valid_until`)
-- before applying tag-based ranking.

BEGIN;

-- 1) Add `assigned_via` column to user_missions ------------------------------
ALTER TABLE public.user_missions
  ADD COLUMN IF NOT EXISTS assigned_via TEXT
    NOT NULL DEFAULT 'random'
    CHECK (assigned_via IN ('random','profile','fallback','manual'));

COMMENT ON COLUMN public.user_missions.assigned_via IS
  'How this mission was selected: random (legacy), profile (tag-affinity match), fallback (cold start / no overlap), manual (admin/override).';

-- 2) Replace assign_missions_for_teen ---------------------------------------
CREATE OR REPLACE FUNCTION public.assign_missions_for_teen(p_teen_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_inserted        integer := 0;
  v_now             timestamptz := now();
  v_today           date := (v_now AT TIME ZONE 'Africa/Casablanca')::date;
  v_d_start         date := v_today;
  v_d_end           date := v_today + INTERVAL '1 day';
  v_w_start         date := (date_trunc('week',  v_today::timestamp))::date;
  v_w_end           date := ((date_trunc('week',  v_today::timestamp))::date + INTERVAL '7 days')::date;
  v_m_start         date := (date_trunc('month', v_today::timestamp))::date;
  v_m_end           date := ((date_trunc('month', v_today::timestamp))::date + INTERVAL '1 month')::date;
  v_q_start         date := (date_trunc('quarter', v_today::timestamp))::date;
  v_q_end           date := ((date_trunc('quarter', v_today::timestamp))::date + INTERVAL '3 months')::date;
  v_count           integer;
  v_target          integer;
  v_to_add          integer;
  v_has_affinity    boolean;
  r                 record;
BEGIN
  -- Cold-start gate: does the teen have any affinity rows?
  SELECT EXISTS (
    SELECT 1 FROM affinity_scores WHERE teen_id = p_teen_id
  ) INTO v_has_affinity;

  ----------------------------------------------------------------------------
  -- DAILY: target 3
  ----------------------------------------------------------------------------
  v_target := 3;
  SELECT COUNT(*) INTO v_count
  FROM user_missions um
  JOIN mission_templates mt ON mt.id = um.mission_id
  WHERE um.teen_id = p_teen_id AND mt.mission_type = 'daily'
    AND um.status = 'active' AND um.period_end > v_today;
  v_to_add := GREATEST(0, v_target - v_count);
  IF v_to_add > 0 THEN
    FOR r IN
      WITH candidates AS (
        SELECT mt.id, mt.tags
        FROM mission_templates mt
        WHERE mt.is_active = true AND mt.mission_type = 'daily'
          AND mt.id NOT IN (
            SELECT mission_id FROM user_missions
            WHERE teen_id = p_teen_id AND status = 'active' AND period_end > v_today
          )
      ),
      scored AS (
        SELECT c.id,
               COALESCE((
                 SELECT SUM(a.score)
                 FROM affinity_scores a
                 WHERE a.teen_id = p_teen_id
                   AND a.tag = ANY(c.tags)
               ), 0)::numeric AS score
        FROM candidates c
      )
      SELECT id, score,
             CASE WHEN v_has_affinity AND score > 0 THEN 'profile' ELSE 'fallback' END AS via
      FROM scored
      ORDER BY
        CASE WHEN v_has_affinity THEN score ELSE 0 END DESC,
        random()
      LIMIT v_to_add
    LOOP
      INSERT INTO user_missions (teen_id, mission_id, status, period_start, period_end, assigned_via)
      VALUES (p_teen_id, r.id, 'active', v_d_start, v_d_end, r.via)
      ON CONFLICT (teen_id, mission_id, period_start) DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;
  END IF;

  ----------------------------------------------------------------------------
  -- WEEKLY: target 3
  ----------------------------------------------------------------------------
  v_target := 3;
  SELECT COUNT(*) INTO v_count
  FROM user_missions um JOIN mission_templates mt ON mt.id = um.mission_id
  WHERE um.teen_id = p_teen_id AND mt.mission_type = 'weekly'
    AND um.status = 'active' AND um.period_end > v_today;
  v_to_add := GREATEST(0, v_target - v_count);
  IF v_to_add > 0 THEN
    FOR r IN
      WITH candidates AS (
        SELECT mt.id, mt.tags
        FROM mission_templates mt
        WHERE mt.is_active = true AND mt.mission_type = 'weekly'
          AND mt.id NOT IN (
            SELECT mission_id FROM user_missions
            WHERE teen_id = p_teen_id AND status = 'active' AND period_end > v_today
          )
      ),
      scored AS (
        SELECT c.id,
               COALESCE((
                 SELECT SUM(a.score)
                 FROM affinity_scores a
                 WHERE a.teen_id = p_teen_id
                   AND a.tag = ANY(c.tags)
               ), 0)::numeric AS score
        FROM candidates c
      )
      SELECT id, score,
             CASE WHEN v_has_affinity AND score > 0 THEN 'profile' ELSE 'fallback' END AS via
      FROM scored
      ORDER BY
        CASE WHEN v_has_affinity THEN score ELSE 0 END DESC,
        random()
      LIMIT v_to_add
    LOOP
      INSERT INTO user_missions (teen_id, mission_id, status, period_start, period_end, assigned_via)
      VALUES (p_teen_id, r.id, 'active', v_w_start, v_w_end, r.via)
      ON CONFLICT (teen_id, mission_id, period_start) DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;
  END IF;

  ----------------------------------------------------------------------------
  -- MONTHLY: target 3
  ----------------------------------------------------------------------------
  v_target := 3;
  SELECT COUNT(*) INTO v_count
  FROM user_missions um JOIN mission_templates mt ON mt.id = um.mission_id
  WHERE um.teen_id = p_teen_id AND mt.mission_type = 'monthly'
    AND um.status = 'active' AND um.period_end > v_today;
  v_to_add := GREATEST(0, v_target - v_count);
  IF v_to_add > 0 THEN
    FOR r IN
      WITH candidates AS (
        SELECT mt.id, mt.tags
        FROM mission_templates mt
        WHERE mt.is_active = true AND mt.mission_type = 'monthly'
          AND mt.id NOT IN (
            SELECT mission_id FROM user_missions
            WHERE teen_id = p_teen_id AND status = 'active' AND period_end > v_today
          )
      ),
      scored AS (
        SELECT c.id,
               COALESCE((
                 SELECT SUM(a.score)
                 FROM affinity_scores a
                 WHERE a.teen_id = p_teen_id
                   AND a.tag = ANY(c.tags)
               ), 0)::numeric AS score
        FROM candidates c
      )
      SELECT id, score,
             CASE WHEN v_has_affinity AND score > 0 THEN 'profile' ELSE 'fallback' END AS via
      FROM scored
      ORDER BY
        CASE WHEN v_has_affinity THEN score ELSE 0 END DESC,
        random()
      LIMIT v_to_add
    LOOP
      INSERT INTO user_missions (teen_id, mission_id, status, period_start, period_end, assigned_via)
      VALUES (p_teen_id, r.id, 'active', v_m_start, v_m_end, r.via)
      ON CONFLICT (teen_id, mission_id, period_start) DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;
  END IF;

  ----------------------------------------------------------------------------
  -- SEASONAL: target 1 (still prefer currently-valid templates first)
  ----------------------------------------------------------------------------
  v_target := 1;
  SELECT COUNT(*) INTO v_count
  FROM user_missions um JOIN mission_templates mt ON mt.id = um.mission_id
  WHERE um.teen_id = p_teen_id AND mt.mission_type = 'seasonal'
    AND um.status = 'active' AND um.period_end > v_today;
  v_to_add := GREATEST(0, v_target - v_count);
  IF v_to_add > 0 THEN
    FOR r IN
      WITH candidates AS (
        SELECT mt.id, mt.tags, mt.valid_from, mt.valid_until,
          CASE WHEN mt.valid_from IS NOT NULL AND mt.valid_until IS NOT NULL
                AND mt.valid_from <= v_today AND mt.valid_until > v_today
               THEN mt.valid_from ELSE v_q_start END AS p_start,
          CASE WHEN mt.valid_from IS NOT NULL AND mt.valid_until IS NOT NULL
                AND mt.valid_from <= v_today AND mt.valid_until > v_today
               THEN mt.valid_until ELSE v_q_end END AS p_end,
          CASE WHEN mt.valid_from IS NOT NULL AND mt.valid_until IS NOT NULL
                AND mt.valid_from <= v_today AND mt.valid_until > v_today
               THEN 0 ELSE 1 END AS sort_pref
        FROM mission_templates mt
        WHERE mt.is_active = true AND mt.mission_type = 'seasonal'
          AND mt.id NOT IN (
            SELECT mission_id FROM user_missions
            WHERE teen_id = p_teen_id AND status = 'active' AND period_end > v_today
          )
      ),
      scored AS (
        SELECT c.id, c.p_start, c.p_end, c.sort_pref,
               COALESCE((
                 SELECT SUM(a.score)
                 FROM affinity_scores a
                 WHERE a.teen_id = p_teen_id
                   AND a.tag = ANY(c.tags)
               ), 0)::numeric AS score
        FROM candidates c
      )
      SELECT id, p_start, p_end, score,
             CASE WHEN v_has_affinity AND score > 0 THEN 'profile' ELSE 'fallback' END AS via
      FROM scored
      ORDER BY
        sort_pref,
        CASE WHEN v_has_affinity THEN score ELSE 0 END DESC,
        random()
      LIMIT v_to_add
    LOOP
      INSERT INTO user_missions (teen_id, mission_id, status, period_start, period_end, assigned_via)
      VALUES (p_teen_id, r.id, 'active', r.p_start, r.p_end, r.via)
      ON CONFLICT (teen_id, mission_id, period_start) DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;
  END IF;

  RETURN v_inserted;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.assign_missions_for_teen(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.assign_missions_for_teen(uuid) TO service_role, authenticated;

COMMENT ON FUNCTION public.assign_missions_for_teen(uuid) IS
  'v2 (TICKET-037): profile-aware mission selection. Ranks candidates by SUM(affinity_scores.score WHERE tag = ANY(mission.tags)) with random tiebreaker; falls back to random for cold-start teens. Tags rows with assigned_via = profile | fallback.';

COMMIT;
