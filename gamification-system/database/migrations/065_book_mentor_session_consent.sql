-- =========================================================================
-- Migration 065 — book_mentor_session: add p_consent_recorded parameter
-- Date: 2026-05-07
-- Author: V1.2-A
--
-- Companion to migration 064 (mentorship safety pipeline). Decision #5 in
-- 064 sets mentor_session_recordings.consent_recorded default to FALSE so
-- recording cannot start until both parties opt in. This migration extends
-- public.book_mentor_session() with an optional `p_consent_recorded BOOLEAN
-- DEFAULT FALSE` parameter:
--
--   * When TRUE, the booking marks mentor_sessions.recorded=TRUE so the
--     parent approval surface shows the consent state and the runtime
--     can later create a mentor_session_recordings row.
--   * When FALSE (the default), the session is created with recorded=FALSE
--     and no recording will be made; this preserves the pre-V1.2 behaviour
--     and means existing callers (which do not pass p_consent_recorded)
--     are fully backward-compatible.
--
-- Backward-compat: keep the original 4-arg signature in place by using the
-- DEFAULT, so existing callers keep working without API changes. Older
-- explicit-arity GRANTs/REVOKEs remain valid because PG treats functions
-- with different argument counts as distinct only when arity differs — here
-- the new signature is `(uuid, uuid, timestamptz, integer, boolean)` while
-- the old `(uuid, uuid, timestamptz, integer)` is REPLACED via DROP+CREATE.
-- We DROP the old version first so PG doesn't end up with two overloads.
-- =========================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.book_mentor_session(uuid, uuid, timestamptz, integer);

CREATE OR REPLACE FUNCTION public.book_mentor_session(
  p_mentor_id uuid,
  p_mentee_user_id uuid,
  p_scheduled_for timestamp with time zone,
  p_duration_minutes integer DEFAULT 30,
  p_consent_recorded boolean DEFAULT FALSE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_mentor RECORD;
  v_dob DATE;
  v_mentee_age INTEGER;
  v_parent_id UUID;
  v_amount_dh NUMERIC(10,2) := 0;
  v_amount_coins INTEGER := 0;
  v_is_intro BOOLEAN := FALSE;
  v_session_id UUID;
  v_approval_id UUID;
  v_prior INTEGER;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_mentee_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  SELECT m.* INTO v_mentor FROM public.mentors m WHERE m.id = p_mentor_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'mentor_not_found');
  END IF;
  IF v_mentor.status <> 'active' OR v_mentor.kyc_status <> 'approved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'mentor_not_active_or_kyc_pending');
  END IF;

  SELECT date_of_birth INTO v_dob FROM public.teens WHERE id = p_mentee_user_id;
  IF v_dob IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'mentee_dob_missing');
  END IF;
  v_mentee_age := EXTRACT(YEAR FROM AGE(NOW(), v_dob))::INT;
  IF v_mentee_age < v_mentor.age_min_mentee OR v_mentee_age > v_mentor.age_max_mentee THEN
    RETURN jsonb_build_object('success', false, 'error', 'mentee_age_out_of_range',
      'mentee_age', v_mentee_age, 'min', v_mentor.age_min_mentee, 'max', v_mentor.age_max_mentee);
  END IF;

  SELECT parent_id INTO v_parent_id
    FROM public.parent_teen_links
    WHERE teen_id = p_mentee_user_id
    ORDER BY created_at ASC NULLS LAST LIMIT 1;
  IF v_parent_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_parent_link');
  END IF;

  SELECT COUNT(*)::INT INTO v_prior
    FROM public.mentor_sessions
    WHERE mentor_id = p_mentor_id AND mentee_user_id = p_mentee_user_id;
  IF v_prior = 0 AND v_mentor.free_intro_session THEN
    v_is_intro := TRUE;
  ELSE
    v_amount_dh := ROUND(v_mentor.hourly_rate_dh * (p_duration_minutes::numeric / 60.0), 2);
    v_amount_coins := FLOOR(v_amount_dh * 100)::INT;
  END IF;

  INSERT INTO public.parental_approvals (
    parent_id, teen_id, action_type, resource_type, amount, status,
    requested_at, expires_at, details
  ) VALUES (
    v_parent_id, p_mentee_user_id, 'coach_meeting', 'mentor_session',
    v_amount_dh, 'pending', NOW(), NOW() + INTERVAL '7 days',
    jsonb_build_object(
      'mentor_id', p_mentor_id,
      'scheduled_for', p_scheduled_for,
      'duration_minutes', p_duration_minutes,
      'is_intro', v_is_intro,
      'amount_dh', v_amount_dh,
      'amount_coins', v_amount_coins,
      'consent_recorded', COALESCE(p_consent_recorded, FALSE)
    )
  ) RETURNING id INTO v_approval_id;

  INSERT INTO public.mentor_sessions (
    mentor_id, mentee_user_id, scheduled_for, duration_minutes,
    status, parent_approval_id, amount_dh, amount_coins, is_intro, recorded
  ) VALUES (
    p_mentor_id, p_mentee_user_id, p_scheduled_for, p_duration_minutes,
    'pending_approval', v_approval_id, v_amount_dh, v_amount_coins, v_is_intro,
    COALESCE(p_consent_recorded, FALSE)
  ) RETURNING id INTO v_session_id;

  UPDATE public.parental_approvals SET resource_id = v_session_id WHERE id = v_approval_id;

  RETURN jsonb_build_object('success', true, 'session_id', v_session_id,
    'parent_approval_id', v_approval_id, 'is_intro', v_is_intro,
    'amount_dh', v_amount_dh, 'amount_coins', v_amount_coins,
    'consent_recorded', COALESCE(p_consent_recorded, FALSE));
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.book_mentor_session(uuid, uuid, timestamptz, integer, boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.book_mentor_session(uuid, uuid, timestamptz, integer, boolean) TO service_role, authenticated;

COMMIT;
