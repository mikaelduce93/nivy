-- =========================================================================
-- Migration 124 — Unified wallet ledger + idempotent coin spend (#206)
-- Date: 2026-06-01
-- Source: GitHub #206 "Wallet v2 + règle devise tranchée (XP ≠ argent)"
--
-- ─────────────────────────────────────────────────────────────────────────
-- Why
-- ─────────────────────────────────────────────────────────────────────────
-- #206 asks for "un seul pipeline débit/crédit (service spendCoins() idempotent)
-- + un registre unique wallet_ledger reliant food/rides/events/boutique".
--
-- That pipeline already EXISTS: public.spend_teen_coins (mig 061) is the single
-- FOR UPDATE-locked, spendable-aware coin debit (paired coin_transactions +
-- escrow_ledger + cashback XP), and public.coin_transactions is the de-facto
-- coin ledger linking every spend by source_type ('ride'|'food'|'reward'|
-- 'partner'|...). This migration closes the two remaining gaps WITHOUT a
-- greenfield rebuild (CLAUDE.md — surgical, no speculative tables):
--
--   1. Idempotency: spend_teen_coins had no dedupe, so a double-tap / retry on
--      /api/teen/spend could debit twice. We add a nullable client_idempotency_key
--      (UNIQUE when present) on coin_transactions, and a p_idempotency_key arg on
--      spend_teen_coins that returns the prior result instead of debiting again.
--   2. wallet_ledger NAME: expose the canonical ledger under the literal name the
--      issue asks for, as a thin security_invoker VIEW over coin_transactions
--      (no data migration; inherits coin_transactions RLS per the querying teen).
--
-- Idempotent migration: CREATE OR REPLACE / IF NOT EXISTS throughout. The 4-arg
-- spend_teen_coins is dropped and recreated with the extra DEFAULT NULL arg; no
-- DB object calls it (verified: the only references are comments), and the sole
-- runtime caller (/api/teen/spend) uses named args, so the default applies.
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. Idempotency key on the coin ledger
-- =========================================================================
ALTER TABLE public.coin_transactions
  ADD COLUMN IF NOT EXISTS client_idempotency_key uuid;

-- Partial UNIQUE — multiple NULLs allowed (legacy rows + non-idempotent spends),
-- but a given key can be committed at most once → no double-debit on retry.
CREATE UNIQUE INDEX IF NOT EXISTS uq_coin_transactions_idempotency_key
  ON public.coin_transactions (client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;

-- =========================================================================
-- 2. spend_teen_coins — add p_idempotency_key (replay-safe)
-- =========================================================================
DROP FUNCTION IF EXISTS public.spend_teen_coins(uuid, integer, uuid, uuid);

CREATE OR REPLACE FUNCTION public.spend_teen_coins(
  p_teen_id uuid,
  p_amount_coins integer,
  p_partner_id uuid DEFAULT NULL::uuid,
  p_reward_id uuid DEFAULT NULL::uuid,
  p_idempotency_key uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_balance integer;
  v_locked integer;
  v_spendable integer;
  v_new_balance integer;
  v_cashback_pct numeric;
  v_cashback_xp integer;
  v_parent_id uuid;
  v_xp_result jsonb;
  v_coin_tx_id uuid;
  v_existing_id uuid;
  v_existing_balance integer;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_teen_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF p_amount_coins IS NULL OR p_amount_coins <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  -- Idempotency fast path: a prior committed spend with the same key replays
  -- its stored result instead of debiting again.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
      FROM coin_transactions
     WHERE client_idempotency_key = p_idempotency_key
     LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'status', 'succeeded',
        'new_balance', v_existing_balance, 'spend_id', v_existing_id,
        'idempotent_replay', true);
    END IF;
  END IF;

  SELECT balance INTO v_balance FROM user_coins WHERE teen_id = p_teen_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_wallet');
  END IF;

  SELECT COALESCE(SUM(current_saved_coins), 0)::int INTO v_locked
    FROM savings_goals
   WHERE teen_id = p_teen_id AND status = 'active';

  v_spendable := v_balance - v_locked;
  IF v_spendable < p_amount_coins THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance',
      'balance', v_balance, 'locked', v_locked, 'spendable', v_spendable);
  END IF;

  SELECT cashback_pct INTO v_cashback_pct
  FROM cashback_rules
  WHERE is_active = true
    AND (partner_id IS NULL OR partner_id = p_partner_id)
    AND (active_from IS NULL OR active_from <= NOW())
    AND (active_until IS NULL OR active_until > NOW())
  ORDER BY partner_id NULLS LAST
  LIMIT 1;

  IF v_cashback_pct IS NULL THEN
    SELECT (setting_value)::text::numeric INTO v_cashback_pct
    FROM xp_payment_settings
    WHERE setting_key = 'default_cashback_pct'
    LIMIT 1;
  END IF;
  v_cashback_pct := COALESCE(v_cashback_pct, 10);

  v_cashback_xp := FLOOR(p_amount_coins * v_cashback_pct / 100)::integer;

  UPDATE user_coins
  SET balance = balance - p_amount_coins,
      lifetime_spent = COALESCE(lifetime_spent, 0) + p_amount_coins,
      updated_at = NOW()
  WHERE teen_id = p_teen_id
  RETURNING balance INTO v_new_balance;

  -- Capture coin_transactions.id so we can wire escrow_ledger.related_spend_id
  INSERT INTO coin_transactions (
    teen_id, amount, transaction_type, source_type, source_id,
    description, balance_after, client_idempotency_key
  ) VALUES (
    p_teen_id, -p_amount_coins, 'spend',
    CASE WHEN p_partner_id IS NOT NULL THEN 'partner' ELSE 'reward' END,
    COALESCE(p_partner_id, p_reward_id),
    format('Dépense de %s coins (cashback %s%% = %s XP)', p_amount_coins, v_cashback_pct, v_cashback_xp),
    v_new_balance, p_idempotency_key
  ) RETURNING id INTO v_coin_tx_id;

  SELECT parent_id INTO v_parent_id
  FROM parent_teen_links
  WHERE teen_id = p_teen_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_parent_id IS NOT NULL THEN
    INSERT INTO escrow_ledger (
      parent_id, teen_id, direction, amount_dh, amount_coins,
      related_spend_id, reason, created_by
    ) VALUES (
      v_parent_id, p_teen_id, 'spend',
      p_amount_coins / 100.0, p_amount_coins,
      v_coin_tx_id,
      format('Spend (partner=%s reward=%s)', COALESCE(p_partner_id::text, '-'), COALESCE(p_reward_id::text, '-')),
      p_teen_id
    );
  END IF;

  IF v_cashback_xp > 0 THEN
    v_xp_result := add_xp_to_user(
      p_teen_id, v_cashback_xp,
      'cashback'::varchar, 'spend'::varchar,
      v_coin_tx_id,
      format('Cashback %s%% sur dépense de %s coins', v_cashback_pct, p_amount_coins)
    );
  END IF;

  IF p_partner_id IS NOT NULL THEN
    INSERT INTO partner_transactions (
      partner_id, teen_id, reward_id, amount_dh, amount_coins,
      cashback_xp, status
    ) VALUES (
      p_partner_id, p_teen_id, p_reward_id,
      p_amount_coins / 100.0, p_amount_coins,
      v_cashback_xp, 'succeeded'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'status', 'succeeded',
    'new_balance', v_new_balance,
    'spendable', v_new_balance - v_locked,
    'xp_earned', v_cashback_xp,
    'cashback_pct', v_cashback_pct,
    'spend_id', v_coin_tx_id
  );
EXCEPTION
  WHEN unique_violation THEN
    -- A concurrent request with the same idempotency key already committed.
    -- The function's writes rolled back to its savepoint; replay the prior row.
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
      FROM coin_transactions
     WHERE client_idempotency_key = p_idempotency_key
     LIMIT 1;
    RETURN jsonb_build_object('success', true, 'status', 'succeeded',
      'new_balance', v_existing_balance, 'spend_id', v_existing_id,
      'idempotent_replay', true);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.spend_teen_coins(uuid, integer, uuid, uuid, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.spend_teen_coins(uuid, integer, uuid, uuid, uuid) IS
  '#206: single coin spend pipeline (FOR UPDATE, spendable-aware, paired ledger + cashback). p_idempotency_key dedupes retries.';

-- =========================================================================
-- 3. wallet_ledger — canonical ledger name as a security_invoker view
-- =========================================================================
-- Thin alias over coin_transactions (the de-facto coin ledger). security_invoker
-- so a teen sees only their own rows via coin_transactions' existing RLS policy.
CREATE OR REPLACE VIEW public.wallet_ledger
  WITH (security_invoker = true) AS
  SELECT
    id,
    teen_id,
    amount,
    transaction_type AS direction,
    source_type,
    source_id,
    description,
    balance_after,
    client_idempotency_key,
    created_at
  FROM public.coin_transactions;

GRANT SELECT ON public.wallet_ledger TO authenticated, service_role;

COMMENT ON VIEW public.wallet_ledger IS
  '#206: canonical coin ledger (alias over coin_transactions). security_invoker → respects per-teen RLS.';

COMMIT;
