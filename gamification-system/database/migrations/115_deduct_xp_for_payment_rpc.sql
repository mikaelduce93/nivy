-- 115_deduct_xp_for_payment_rpc.sql
--
-- #47 — The XP payment routes (/api/payments/xp, /api/payments/hybrid) debited
-- user_xp.total_xp with a non-atomic read-then-write and NO WHERE guard, so two
-- concurrent requests (double-tap, retry, two tabs) both read the same balance
-- and last-write-wins → double-spend / negative balance. The manual "rollback"
-- restored total_xp to the pre-debit READ value, clobbering concurrent writes.
--
-- Fix (Option B, canon-aligned with purchase_reward's FOR UPDATE): a single
-- atomic SECURITY DEFINER RPC that locks the row, guards the balance, debits,
-- and writes the xp_transactions ledger row in one transaction. Granted to
-- service_role only (it takes p_teen_id as an argument — same escalation class
-- as the RPCs locked in #56; the routes call it via the service-role client
-- after validating booking ownership). Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.deduct_xp_for_payment(
  p_teen_id uuid,
  p_amount integer,
  p_booking_id uuid DEFAULT NULL,
  p_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_balance integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Montant XP invalide');
  END IF;

  -- Lock the XP row so concurrent debits serialize (no double-spend).
  SELECT total_xp INTO v_balance FROM public.user_xp WHERE teen_id = p_teen_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solde XP introuvable');
  END IF;
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solde XP insuffisant');
  END IF;

  UPDATE public.user_xp
  SET total_xp = total_xp - p_amount, updated_at = NOW()
  WHERE teen_id = p_teen_id;

  INSERT INTO public.xp_transactions (
    teen_id, amount, source_type, type, reference_type, reference_id,
    description, balance_before, balance_after
  ) VALUES (
    p_teen_id, -p_amount, 'payment', 'payment', 'booking', p_booking_id,
    COALESCE(p_reference, 'Paiement réservation'), v_balance, v_balance - p_amount
  );

  RETURN jsonb_build_object('success', true, 'xp_spent', p_amount, 'balance_after', v_balance - p_amount);
END;
$fn$;

REVOKE ALL ON FUNCTION public.deduct_xp_for_payment(uuid, integer, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_xp_for_payment(uuid, integer, uuid, text) TO service_role;
