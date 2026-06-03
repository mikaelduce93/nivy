-- =========================================================================
-- Migration 123 — Friend défis: end XP staking/transfer (#206, milestone V4)
-- Date: 2026-06-01
-- Source: docs/audits/audit-2026-05-31/AUDIT-FEATURES-TEEN.md §2.2 / §3.3
--         GitHub #206 "Wallet v2 + règle devise tranchée (XP ≠ argent)"
--
-- ─────────────────────────────────────────────────────────────────────────
-- Why
-- ─────────────────────────────────────────────────────────────────────────
-- The product rule (charte/whitepaper §5) is: XP = mérite/statut, it NEVER
-- converts and is NEVER transferred between teens. The v2 friend-challenge
-- RPCs (mig 078) violated this directly: create/accept ESCROWED each side's
-- XP (debited user_xp + negative xp_transactions), and resolve AWARDED the
-- full pot (2× stake) to the winner — i.e. the loser's XP became the winner's.
--
-- This migration makes friend défis pure bragging-rights:
--   * CREATE OR REPLACE the 4 v2 mutation RPCs so they NEVER touch user_xp /
--     xp_transactions (no escrow on create/accept, no refund on decline, no
--     pot award on resolve). xp_pot is forced to 0 on new challenges.
--   * winner_id / is_draw are still recorded (for the "couronne" / bragging UI).
--   * One-shot REFUND of any in-flight escrow still owed (precise, ledger-based
--     so it also catches expired-pending invites the cron never refunded).
--
-- Signatures are unchanged (CREATE OR REPLACE cannot change them); p_xp_stake
-- is kept for back-compat but ignored. Idempotent: re-running is safe (the
-- refund loop nets to 0 after the first run; the RPC bodies no longer escrow).
-- The friend_challenges.xp_pot / stake_xp columns become dead (left in place).
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. create_friend_challenge_v2 — no escrow, xp_pot forced to 0
-- =========================================================================
CREATE OR REPLACE FUNCTION public.create_friend_challenge_v2(
  p_opponent_id     UUID,
  p_challenge_kind  TEXT,
  p_rules           JSONB DEFAULT '{}'::jsonb,
  p_name            TEXT  DEFAULT NULL,
  p_target_value    INT   DEFAULT NULL,
  p_duration_hours  INT   DEFAULT 168,
  p_xp_stake        INT   DEFAULT 0,
  p_expires_in_hours INT  DEFAULT 48
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller       UUID := auth.uid();
  v_challenge_id UUID;
  v_ends_at      TIMESTAMPTZ;
  v_expires_at   TIMESTAMPTZ;
  v_duration     INT;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  IF p_opponent_id IS NULL OR p_opponent_id = v_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_opponent');
  END IF;

  IF p_challenge_kind IS NULL
     OR p_challenge_kind NOT IN ('quiz_battle','mission_race','physical_count','streak_race','xp_duel','custom') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_challenge_kind');
  END IF;

  -- #206 — p_xp_stake is ignored: friend défis no longer transfer XP.
  v_duration := GREATEST(1, LEAST(COALESCE(p_duration_hours, 168), 720));
  v_ends_at := NOW() + (v_duration || ' hours')::INTERVAL;
  v_expires_at := NOW() + (GREATEST(1, LEAST(COALESCE(p_expires_in_hours, 48), 168)) || ' hours')::INTERVAL;

  INSERT INTO public.friend_challenges (
    creator_id, opponent_id, name, target_value,
    starts_at, ends_at, status, acceptance_status,
    challenge_kind, rules, xp_pot, expires_at,
    progress_creator, progress_opponent
  ) VALUES (
    v_caller, p_opponent_id, p_name, p_target_value,
    NOW(), v_ends_at, 'pending', 'pending',
    p_challenge_kind, COALESCE(p_rules, '{}'::jsonb), 0, v_expires_at,
    0, 0
  )
  RETURNING id INTO v_challenge_id;

  RETURN jsonb_build_object(
    'success', true,
    'challenge_id', v_challenge_id,
    'ends_at', v_ends_at,
    'expires_at', v_expires_at,
    'xp_pot', 0
  );
END;
$$;

COMMENT ON FUNCTION public.create_friend_challenge_v2 IS
  '#206: create a v2 friend challenge (bragging-rights only). No XP stake/escrow; xp_pot=0.';

-- =========================================================================
-- 2. accept_friend_challenge_v2 — no escrow
-- =========================================================================
CREATE OR REPLACE FUNCTION public.accept_friend_challenge_v2(
  p_challenge_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_chal   public.friend_challenges%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  SELECT * INTO v_chal FROM public.friend_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF v_chal.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'challenge_not_found');
  END IF;
  IF v_chal.opponent_id IS NULL OR v_chal.opponent_id <> v_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_opponent');
  END IF;
  IF v_chal.acceptance_status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_responded',
      'acceptance_status', v_chal.acceptance_status);
  END IF;
  IF v_chal.expires_at IS NOT NULL AND v_chal.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'invitation_expired');
  END IF;

  UPDATE public.friend_challenges
     SET acceptance_status = 'accepted',
         status = 'active',
         accepted_at = NOW(),
         starts_at = NOW(),
         updated_at = NOW()
   WHERE id = p_challenge_id;

  -- Seed both progress rows (no XP escrow — #206).
  INSERT INTO public.friend_challenge_progress (challenge_id, participant_id, role, score)
  VALUES
    (p_challenge_id, v_chal.creator_id, 'creator', 0),
    (p_challenge_id, v_caller,         'opponent', 0)
  ON CONFLICT (challenge_id, participant_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'challenge_id', p_challenge_id,
    'status', 'active',
    'xp_pot', 0
  );
END;
$$;

COMMENT ON FUNCTION public.accept_friend_challenge_v2 IS
  '#206: opponent accepts (activates the challenge). No XP escrow.';

-- =========================================================================
-- 3. decline_friend_challenge_v2 — no refund needed (nothing escrowed)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.decline_friend_challenge_v2(
  p_challenge_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_chal   public.friend_challenges%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  SELECT * INTO v_chal FROM public.friend_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF v_chal.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'challenge_not_found');
  END IF;
  IF v_chal.opponent_id IS NULL OR v_chal.opponent_id <> v_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_opponent');
  END IF;
  IF v_chal.acceptance_status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_responded',
      'acceptance_status', v_chal.acceptance_status);
  END IF;

  UPDATE public.friend_challenges
     SET acceptance_status = 'declined',
         status = 'cancelled',
         updated_at = NOW()
   WHERE id = p_challenge_id;

  RETURN jsonb_build_object('success', true, 'challenge_id', p_challenge_id,
                            'acceptance_status', 'declined');
END;
$$;

COMMENT ON FUNCTION public.decline_friend_challenge_v2 IS
  '#206: opponent declines. No XP refund (nothing was escrowed).';

-- =========================================================================
-- 4. resolve_friend_challenge_v2 — pick winner, NO pot settlement
-- =========================================================================
CREATE OR REPLACE FUNCTION public.resolve_friend_challenge_v2(
  p_challenge_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller    UUID := auth.uid();
  v_chal      public.friend_challenges%ROWTYPE;
  v_winner_id UUID;
  v_target    INT;
  v_target_hit BOOLEAN := false;
BEGIN
  SELECT * INTO v_chal FROM public.friend_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF v_chal.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'challenge_not_found');
  END IF;

  -- Only participants (or service-role) may resolve.
  IF v_caller IS NOT NULL
     AND v_caller <> v_chal.creator_id
     AND v_caller <> v_chal.opponent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_participant');
  END IF;

  IF v_chal.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_completed',
      'winner_id', v_chal.winner_id);
  END IF;
  IF v_chal.status NOT IN ('active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_active', 'status', v_chal.status);
  END IF;

  -- Resolution gate: ends_at reached, or one side reached target_value.
  v_target := v_chal.target_value;
  IF v_target IS NOT NULL AND v_target > 0
     AND (COALESCE(v_chal.progress_creator, 0) >= v_target
       OR COALESCE(v_chal.progress_opponent, 0) >= v_target) THEN
    v_target_hit := true;
  END IF;

  IF NOT v_target_hit
     AND (v_chal.ends_at IS NULL OR v_chal.ends_at > NOW()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_early',
      'ends_at', v_chal.ends_at);
  END IF;

  -- Pick winner by score (bragging-rights only — NO XP pot settlement, #206).
  IF COALESCE(v_chal.progress_creator, 0) > COALESCE(v_chal.progress_opponent, 0) THEN
    v_winner_id := v_chal.creator_id;
  ELSIF COALESCE(v_chal.progress_opponent, 0) > COALESCE(v_chal.progress_creator, 0) THEN
    v_winner_id := v_chal.opponent_id;
  ELSE
    v_winner_id := NULL; -- draw
  END IF;

  UPDATE public.friend_challenges
     SET status = 'completed',
         completed_at = NOW(),
         winner_id = v_winner_id,
         is_draw = (v_winner_id IS NULL),
         updated_at = NOW()
   WHERE id = p_challenge_id;

  RETURN jsonb_build_object(
    'success', true,
    'challenge_id', p_challenge_id,
    'winner_id', v_winner_id,
    'is_draw', v_winner_id IS NULL,
    'xp_pot', 0,
    'progress_creator', v_chal.progress_creator,
    'progress_opponent', v_chal.progress_opponent
  );
END;
$$;

COMMENT ON FUNCTION public.resolve_friend_challenge_v2 IS
  '#206: resolve a v2 friend challenge — picks a winner for bragging only. No XP pot settlement.';

-- =========================================================================
-- 5. One-shot refund of any in-flight escrow still owed.
-- =========================================================================
-- Ledger-precise: credit back the NET escrowed amount (stakes − prior refunds)
-- for every NON-completed challenge that still has XP owed to a teen. This also
-- catches expired-pending invites the resolve/expire cron never refunded.
-- Compared as ::text to be agnostic to xp_transactions.source_id column type.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT t.teen_id,
           fc.id            AS challenge_id,
           -SUM(t.amount)   AS net_owed
    FROM public.xp_transactions t
    JOIN public.friend_challenges fc
      ON fc.id::text = t.source_id::text
    WHERE t.source_type IN ('friend_challenge_stake', 'friend_challenge_refund')
      AND fc.status <> 'completed'
    GROUP BY t.teen_id, fc.id
    HAVING SUM(t.amount) < 0
  LOOP
    UPDATE public.user_xp
       SET total_xp = total_xp + rec.net_owed,
           updated_at = NOW()
     WHERE teen_id = rec.teen_id;

    INSERT INTO public.xp_transactions (teen_id, amount, source_type, source_id, description)
    VALUES (
      rec.teen_id, rec.net_owed, 'friend_challenge_refund', rec.challenge_id,
      'Refund mise défi ami (#206 — fin des mises XP)'
    );
  END LOOP;
END;
$$;

COMMIT;
