-- Migration 060 — Wave A security hardening
-- Date: 2026-05-07
-- Source: docs/vision/audit-prelaunch/PRE_LAUNCH_AUDIT.md
--
-- A.3 REVOKE EXECUTE FROM PUBLIC/anon on money RPCs (disburse_allowance,
--     complete_ride, cancel_ride) — found PUBLIC-grantable in audit 03.
-- A.4 ENABLE RLS + self-read policies on creator_engagement and
--     creator_monthly_stats — found RLS-disabled in audit 01 (52+1 rows
--     readable via anon key).
-- A.5 Switch add_xp_to_user + add_coins_to_user to SECURITY DEFINER +
--     set search_path = public, pg_temp — were SECURITY INVOKER, RLS
--     silently dropped ~25% of cashback inserts under teen JWT.

BEGIN;

-- =========================================================================
-- A.3 — Revoke execute on money RPCs from PUBLIC/anon/authenticated
-- =========================================================================
-- These RPCs are called only from trusted server contexts (cron + admin
-- workflow) using the service role; PUBLIC/anon/authenticated have no
-- legitimate path to invoke them directly.

REVOKE EXECUTE ON FUNCTION public.disburse_allowance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_ride(uuid, numeric, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_ride(uuid, text, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.disburse_allowance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_ride(uuid, numeric, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_ride(uuid, text, uuid) TO service_role;

-- =========================================================================
-- A.4 — RLS + policies on creator_engagement + creator_monthly_stats
-- =========================================================================

ALTER TABLE public.creator_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_monthly_stats ENABLE ROW LEVEL SECURITY;

-- creator_engagement has creator_user_id + viewer_user_id directly, no join.
DROP POLICY IF EXISTS creator_engagement_self_read ON public.creator_engagement;
CREATE POLICY creator_engagement_self_read
  ON public.creator_engagement
  FOR SELECT
  TO authenticated
  USING (creator_user_id = auth.uid() OR viewer_user_id = auth.uid());

-- Admins read all (moderation surface).
DROP POLICY IF EXISTS creator_engagement_admin_read ON public.creator_engagement;
CREATE POLICY creator_engagement_admin_read
  ON public.creator_engagement
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles ar WHERE ar.profile_id = auth.uid())
  );

-- Writes only via service role / SECURITY DEFINER RPCs — no direct authenticated path.

-- creator_monthly_stats: same policy shape (teen reads own row, admin reads all).
DROP POLICY IF EXISTS creator_monthly_stats_self_read ON public.creator_monthly_stats;
CREATE POLICY creator_monthly_stats_self_read
  ON public.creator_monthly_stats
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS creator_monthly_stats_admin_read ON public.creator_monthly_stats;
CREATE POLICY creator_monthly_stats_admin_read
  ON public.creator_monthly_stats
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles ar WHERE ar.profile_id = auth.uid())
  );

-- =========================================================================
-- A.5 — SECURITY DEFINER + search_path on add_xp_to_user + add_coins_to_user
-- =========================================================================
-- The bodies are unchanged; we only flip SECURITY INVOKER → DEFINER and
-- pin search_path. These helpers are called from inside other DEFINER
-- RPCs (spend_teen_coins, payout_chore_reward, etc.) under teen JWT, where
-- INVOKER mode caused RLS on xp_transactions/coin_transactions to silently
-- drop the inner insert. DEFINER mode runs them as the function owner.

CREATE OR REPLACE FUNCTION public.add_coins_to_user(
  p_teen_id uuid,
  p_amount integer,
  p_transaction_type character varying,
  p_source_type character varying,
  p_source_id uuid DEFAULT NULL::uuid,
  p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  INSERT INTO public.user_coins (teen_id, balance)
  VALUES (p_teen_id, 0)
  ON CONFLICT (teen_id) DO NOTHING;

  SELECT balance INTO v_current_balance
  FROM public.user_coins
  WHERE teen_id = p_teen_id
  FOR UPDATE;

  v_new_balance := v_current_balance + p_amount;

  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solde insuffisant',
      'current_balance', v_current_balance,
      'required', ABS(p_amount)
    );
  END IF;

  UPDATE public.user_coins
  SET
    balance = v_new_balance,
    lifetime_earned = CASE WHEN p_amount > 0 THEN lifetime_earned + p_amount ELSE lifetime_earned END,
    lifetime_spent = CASE WHEN p_amount < 0 THEN lifetime_spent + ABS(p_amount) ELSE lifetime_spent END,
    updated_at = NOW()
  WHERE teen_id = p_teen_id;

  INSERT INTO public.coin_transactions (teen_id, amount, transaction_type, source_type, source_id, description, balance_after)
  VALUES (p_teen_id, p_amount, p_transaction_type, p_source_type, p_source_id, p_description, v_new_balance);

  UPDATE public.user_progression
  SET coins = v_new_balance, updated_at = NOW()
  WHERE user_id = p_teen_id;

  RETURN jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance
  );
END;
$function$;

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

-- Grant EXECUTE explicitly: service role + authenticated (so other DEFINER
-- RPCs can call them under any session). Anon stays revoked.
REVOKE EXECUTE ON FUNCTION public.add_coins_to_user(uuid, integer, character varying, character varying, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_xp_to_user(uuid, integer, character varying, character varying, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_coins_to_user(uuid, integer, character varying, character varying, uuid, text) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.add_xp_to_user(uuid, integer, character varying, character varying, uuid, text) TO service_role, authenticated;

COMMIT;
