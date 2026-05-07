-- Migration 059 RPCs — Mentorship / Career
-- Date: 2026-04 (live-applied via MCP); committed to repo 2026-05-07 per Wave B.6
-- Source: docs/vision/mentorship-career.md
--
-- Tables + helper (mentor_is_admin) live in 059_mentorship_career.sql.

BEGIN;

CREATE OR REPLACE FUNCTION public.book_mentor_session(
  p_mentor_id uuid,
  p_mentee_user_id uuid,
  p_scheduled_for timestamp with time zone,
  p_duration_minutes integer DEFAULT 30
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
    v_amount_coins := FLOOR(v_amount_dh * 100)::INT; -- 1 DH = 100 coins
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
      'amount_coins', v_amount_coins
    )
  ) RETURNING id INTO v_approval_id;

  INSERT INTO public.mentor_sessions (
    mentor_id, mentee_user_id, scheduled_for, duration_minutes,
    status, parent_approval_id, amount_dh, amount_coins, is_intro
  ) VALUES (
    p_mentor_id, p_mentee_user_id, p_scheduled_for, p_duration_minutes,
    'pending_approval', v_approval_id, v_amount_dh, v_amount_coins, v_is_intro
  ) RETURNING id INTO v_session_id;

  UPDATE public.parental_approvals SET resource_id = v_session_id WHERE id = v_approval_id;

  RETURN jsonb_build_object('success', true, 'session_id', v_session_id,
    'parent_approval_id', v_approval_id, 'is_intro', v_is_intro,
    'amount_dh', v_amount_dh, 'amount_coins', v_amount_coins);
END;
$function$;

CREATE OR REPLACE FUNCTION public.parent_approve_session(
  p_session_id uuid,
  p_parent_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_session RECORD;
  v_balance INT;
  v_new_balance INT;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  SELECT s.* INTO v_session FROM public.mentor_sessions s WHERE s.id = p_session_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'session_not_found'); END IF;
  IF v_session.status <> 'pending_approval' THEN
    RETURN jsonb_build_object('success', false, 'error', 'session_not_pending');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.parent_teen_links
    WHERE parent_id = p_parent_id AND teen_id = v_session.mentee_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_linked_parent');
  END IF;

  UPDATE public.parental_approvals
    SET status='approved', decided_at=NOW(), decided_by=p_parent_id
    WHERE id = v_session.parent_approval_id;

  UPDATE public.mentor_sessions SET status='approved' WHERE id = p_session_id;

  IF v_session.amount_coins > 0 THEN
    SELECT balance INTO v_balance FROM public.user_coins
      WHERE teen_id = v_session.mentee_user_id FOR UPDATE;
    IF v_balance IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'no_wallet');
    END IF;
    IF v_balance < v_session.amount_coins THEN
      UPDATE public.parental_approvals
        SET status='denied', decided_at=NOW(), decided_by=p_parent_id,
            details = COALESCE(details,'{}'::jsonb) || jsonb_build_object('error','insufficient_balance')
        WHERE id = v_session.parent_approval_id;
      UPDATE public.mentor_sessions SET status='denied' WHERE id = p_session_id;
      RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
    END IF;

    UPDATE public.user_coins
      SET balance = balance - v_session.amount_coins,
          lifetime_spent = COALESCE(lifetime_spent,0) + v_session.amount_coins,
          updated_at = NOW()
      WHERE teen_id = v_session.mentee_user_id
      RETURNING balance INTO v_new_balance;

    INSERT INTO public.coin_transactions (
      teen_id, amount, transaction_type, source_type, source_id,
      description, balance_after
    ) VALUES (
      v_session.mentee_user_id, -v_session.amount_coins, 'spend', 'mentor_session', p_session_id,
      format('Mentor session payment (%s coins)', v_session.amount_coins),
      v_new_balance
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'session_id', p_session_id, 'amount_coins_debited', v_session.amount_coins);
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_to_internship(
  p_internship_id uuid,
  p_applicant_id uuid,
  p_cover_letter text,
  p_portfolio_urls text[] DEFAULT ARRAY[]::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_intern RECORD;
  v_dob DATE;
  v_age INTEGER;
  v_parent UUID;
  v_app_id UUID;
  v_approval_id UUID;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_applicant_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  SELECT i.* INTO v_intern FROM public.internships i WHERE i.id = p_internship_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'internship_not_found'); END IF;
  IF v_intern.status <> 'open' THEN RETURN jsonb_build_object('success', false, 'error', 'internship_not_open'); END IF;
  IF v_intern.spots_taken >= v_intern.spots_total THEN
    RETURN jsonb_build_object('success', false, 'error', 'internship_full');
  END IF;

  SELECT date_of_birth INTO v_dob FROM public.teens WHERE id = p_applicant_id;
  IF v_dob IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'applicant_dob_missing'); END IF;
  v_age := EXTRACT(YEAR FROM AGE(NOW(), v_dob))::INT;
  IF v_age < v_intern.age_min OR v_age > v_intern.age_max THEN
    RETURN jsonb_build_object('success', false, 'error', 'applicant_age_out_of_range',
      'applicant_age', v_age, 'min', v_intern.age_min, 'max', v_intern.age_max);
  END IF;

  SELECT parent_id INTO v_parent FROM public.parent_teen_links
    WHERE teen_id = p_applicant_id ORDER BY created_at ASC NULLS LAST LIMIT 1;
  IF v_parent IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'no_parent_link'); END IF;

  IF EXISTS (
    SELECT 1 FROM public.internship_applications
    WHERE internship_id = p_internship_id
      AND applicant_user_id = p_applicant_id
      AND status NOT IN ('rejected','withdrawn')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_applied');
  END IF;

  INSERT INTO public.parental_approvals (
    parent_id, teen_id, action_type, resource_type, amount, status,
    requested_at, expires_at, details
  ) VALUES (
    v_parent, p_applicant_id, 'coach_meeting', 'internship_application',
    NULL, 'pending', NOW(), NOW() + INTERVAL '14 days',
    jsonb_build_object('internship_id', p_internship_id, 'applicant_age', v_age)
  ) RETURNING id INTO v_approval_id;

  INSERT INTO public.internship_applications (
    internship_id, applicant_user_id, cover_letter, portfolio_urls,
    parental_approval_id, status
  ) VALUES (
    p_internship_id, p_applicant_id, p_cover_letter, COALESCE(p_portfolio_urls, ARRAY[]::TEXT[]),
    v_approval_id, 'pending'
  ) RETURNING id INTO v_app_id;

  UPDATE public.parental_approvals SET resource_id = v_app_id WHERE id = v_approval_id;

  RETURN jsonb_build_object('success', true,
    'application_id', v_app_id, 'parental_approval_id', v_approval_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.book_mentor_session(uuid, uuid, timestamptz, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.parent_approve_session(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apply_to_internship(uuid, uuid, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_mentor_session(uuid, uuid, timestamptz, integer) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.parent_approve_session(uuid, uuid) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_to_internship(uuid, uuid, text, text[]) TO service_role, authenticated;

COMMIT;
