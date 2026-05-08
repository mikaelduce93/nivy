-- =========================================================================
-- Migration 078 — Friend Challenges v2 SECURITY DEFINER RPCs (Wave 2 / TICKET-019 / FD1)
-- Date: 2026-05-08
-- Source: docs/vision/audit-content-personalization/TICKETS.md (TICKET-019)
--         gamification-system/database/migrations/073_friend_challenges_v2.sql (FD1 hand-off footer)
--
-- ─────────────────────────────────────────────────────────────────────────
-- Context
-- ─────────────────────────────────────────────────────────────────────────
-- The v2 schema (mig 073) ships RLS that is SELECT-only for authenticated
-- users; all writes must go through SECURITY DEFINER RPCs. This migration
-- provides the five v2-only mutations consumed by /api/teen/friend-challenges.
--
-- Distinct from v1 RPCs in mig 006 (create_friend_challenge / respond_to_challenge
-- / complete_challenge) which are kept untouched for back-compat. The v1 RPCs
-- write challenge_participants; the v2 RPCs only touch friend_challenges +
-- friend_challenge_progress (the v2 surface).
--
-- Idempotency: every function uses CREATE OR REPLACE and is safe to re-run.
-- Out of scope: notifications (FD5/TICKET-023), resolution cron (FD4/TICKET-022).
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. create_friend_challenge_v2
-- =========================================================================
-- Caller (auth.uid()) must equal the challenger. Inserts a friend_challenges
-- row in acceptance_status='pending', status='pending'. Optionally escrows
-- xp_pot via xp_transactions (negative legs against creator). Opponent's leg
-- is recorded on accept_friend_challenge_v2.
--
-- p_xp_stake is per-side; xp_pot = 2 * p_xp_stake. ends_at is computed from
-- duration_hours (clamped 1..720). expires_at defaults to NOW() + 48h.

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
  v_creator_xp   INT;
  v_ends_at      TIMESTAMPTZ;
  v_expires_at   TIMESTAMPTZ;
  v_duration     INT;
  v_xp_pot       INT;
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

  IF p_xp_stake < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_xp_stake');
  END IF;

  v_duration := GREATEST(1, LEAST(COALESCE(p_duration_hours, 168), 720));
  v_ends_at := NOW() + (v_duration || ' hours')::INTERVAL;
  v_expires_at := NOW() + (GREATEST(1, LEAST(COALESCE(p_expires_in_hours, 48), 168)) || ' hours')::INTERVAL;
  v_xp_pot := p_xp_stake * 2;

  -- XP-stake escrow: debit creator now. Opponent leg is debited on accept.
  IF p_xp_stake > 0 THEN
    SELECT total_xp INTO v_creator_xp FROM public.user_xp WHERE teen_id = v_caller;
    IF COALESCE(v_creator_xp, 0) < p_xp_stake THEN
      RETURN jsonb_build_object('success', false, 'error', 'insufficient_xp');
    END IF;
  END IF;

  INSERT INTO public.friend_challenges (
    creator_id, opponent_id, name, target_value,
    starts_at, ends_at, status, acceptance_status,
    challenge_kind, rules, xp_pot, expires_at,
    progress_creator, progress_opponent
  ) VALUES (
    v_caller, p_opponent_id, p_name, p_target_value,
    NOW(), v_ends_at, 'pending', 'pending',
    p_challenge_kind, COALESCE(p_rules, '{}'::jsonb), v_xp_pot, v_expires_at,
    0, 0
  )
  RETURNING id INTO v_challenge_id;

  -- Escrow creator stake (deduct from user_xp + log negative xp_transactions)
  IF p_xp_stake > 0 THEN
    UPDATE public.user_xp
       SET total_xp = total_xp - p_xp_stake,
           updated_at = NOW()
     WHERE teen_id = v_caller;

    INSERT INTO public.xp_transactions (teen_id, amount, source_type, source_id, description)
    VALUES (
      v_caller, -p_xp_stake, 'friend_challenge_stake', v_challenge_id,
      'Mise défi ami (escrow)'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'challenge_id', v_challenge_id,
    'ends_at', v_ends_at,
    'expires_at', v_expires_at,
    'xp_pot', v_xp_pot
  );
END;
$$;

COMMENT ON FUNCTION public.create_friend_challenge_v2 IS
  'Wave 2 / TICKET-019 (FD1): create a v2 friend challenge. Caller=challenger; escrows creator XP stake.';

-- =========================================================================
-- 2. accept_friend_challenge_v2
-- =========================================================================
-- Caller must be the opponent. Sets acceptance_status=accepted, status=active,
-- accepted_at=NOW(), and creates two friend_challenge_progress rows.
-- Escrows opponent's matching XP stake (xp_pot / 2).

CREATE OR REPLACE FUNCTION public.accept_friend_challenge_v2(
  p_challenge_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller     UUID := auth.uid();
  v_chal       public.friend_challenges%ROWTYPE;
  v_stake      INT;
  v_opp_xp     INT;
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

  v_stake := COALESCE(v_chal.xp_pot, 0) / 2;

  -- Verify opponent has the XP for the matching stake
  IF v_stake > 0 THEN
    SELECT total_xp INTO v_opp_xp FROM public.user_xp WHERE teen_id = v_caller;
    IF COALESCE(v_opp_xp, 0) < v_stake THEN
      RETURN jsonb_build_object('success', false, 'error', 'insufficient_xp');
    END IF;
  END IF;

  UPDATE public.friend_challenges
     SET acceptance_status = 'accepted',
         status = 'active',
         accepted_at = NOW(),
         starts_at = NOW(),
         updated_at = NOW()
   WHERE id = p_challenge_id;

  -- Seed both progress rows
  INSERT INTO public.friend_challenge_progress (challenge_id, participant_id, role, score)
  VALUES
    (p_challenge_id, v_chal.creator_id, 'creator', 0),
    (p_challenge_id, v_caller,         'opponent', 0)
  ON CONFLICT (challenge_id, participant_id) DO NOTHING;

  -- Opponent's escrow leg
  IF v_stake > 0 THEN
    UPDATE public.user_xp
       SET total_xp = total_xp - v_stake,
           updated_at = NOW()
     WHERE teen_id = v_caller;

    INSERT INTO public.xp_transactions (teen_id, amount, source_type, source_id, description)
    VALUES (
      v_caller, -v_stake, 'friend_challenge_stake', p_challenge_id,
      'Mise défi ami (escrow)'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'challenge_id', p_challenge_id,
    'status', 'active',
    'xp_pot', v_chal.xp_pot
  );
END;
$$;

COMMENT ON FUNCTION public.accept_friend_challenge_v2 IS
  'Wave 2 / TICKET-019 (FD1): opponent accepts. Activates the challenge + escrows opponent XP stake.';

-- =========================================================================
-- 3. decline_friend_challenge_v2
-- =========================================================================
-- Caller must be the opponent. Refunds creator's stake.

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
  v_refund INT;
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

  v_refund := COALESCE(v_chal.xp_pot, 0) / 2;

  UPDATE public.friend_challenges
     SET acceptance_status = 'declined',
         status = 'cancelled',
         updated_at = NOW()
   WHERE id = p_challenge_id;

  -- Refund creator's escrowed stake
  IF v_refund > 0 THEN
    UPDATE public.user_xp
       SET total_xp = total_xp + v_refund,
           updated_at = NOW()
     WHERE teen_id = v_chal.creator_id;

    INSERT INTO public.xp_transactions (teen_id, amount, source_type, source_id, description)
    VALUES (
      v_chal.creator_id, v_refund, 'friend_challenge_refund', p_challenge_id,
      'Refund défi ami (décliné)'
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'challenge_id', p_challenge_id,
                            'acceptance_status', 'declined');
END;
$$;

COMMENT ON FUNCTION public.decline_friend_challenge_v2 IS
  'Wave 2 / TICKET-019 (FD1): opponent declines. Refunds creator escrow.';

-- =========================================================================
-- 4. record_friend_challenge_progress_v2
-- =========================================================================
-- Caller must be creator or opponent of an active challenge. Increments
-- (or sets) the participant's score and mirrors into friend_challenges
-- progress_creator/progress_opponent so list views stay cheap.

CREATE OR REPLACE FUNCTION public.record_friend_challenge_progress_v2(
  p_challenge_id UUID,
  p_delta        INT DEFAULT 1,
  p_metadata     JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller     UUID := auth.uid();
  v_chal       public.friend_challenges%ROWTYPE;
  v_role       TEXT;
  v_new_score  INT;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthenticated');
  END IF;

  SELECT * INTO v_chal FROM public.friend_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF v_chal.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'challenge_not_found');
  END IF;

  IF v_chal.creator_id = v_caller THEN
    v_role := 'creator';
  ELSIF v_chal.opponent_id = v_caller THEN
    v_role := 'opponent';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'not_participant');
  END IF;

  IF v_chal.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_active', 'status', v_chal.status);
  END IF;

  IF v_chal.ends_at IS NOT NULL AND v_chal.ends_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'challenge_ended');
  END IF;

  -- Upsert friend_challenge_progress + capture new score
  INSERT INTO public.friend_challenge_progress (
    challenge_id, participant_id, role, score, last_signal_at, metadata
  ) VALUES (
    p_challenge_id, v_caller, v_role, GREATEST(COALESCE(p_delta, 0), 0),
    NOW(), COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (challenge_id, participant_id) DO UPDATE
    SET score = public.friend_challenge_progress.score + COALESCE(EXCLUDED.score, 0),
        last_signal_at = NOW(),
        metadata = COALESCE(EXCLUDED.metadata, public.friend_challenge_progress.metadata)
  RETURNING score INTO v_new_score;

  -- Mirror to denormalised columns
  IF v_role = 'creator' THEN
    UPDATE public.friend_challenges
       SET progress_creator = v_new_score,
           updated_at = NOW()
     WHERE id = p_challenge_id;
  ELSE
    UPDATE public.friend_challenges
       SET progress_opponent = v_new_score,
           updated_at = NOW()
     WHERE id = p_challenge_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'challenge_id', p_challenge_id,
    'role', v_role,
    'score', v_new_score
  );
END;
$$;

COMMENT ON FUNCTION public.record_friend_challenge_progress_v2 IS
  'Wave 2 / TICKET-019 (FD1): creator or opponent records progress; mirrors denormalised columns.';

-- =========================================================================
-- 5. resolve_friend_challenge_v2
-- =========================================================================
-- Either participant or the FD4 cron may call this. Determines the winner by
-- comparing progress_creator vs progress_opponent and distributes xp_pot.
-- On tie: refund both sides (no winner). Idempotent — refuses to re-resolve.
--
-- Notes:
--   * For human callers, requires status='active' AND ends_at <= NOW() OR
--     both participants reached target_value (if set).
--   * For service-role (no auth.uid()), no caller check — used by FD4 cron.
--   * XP distribution uses add_xp_to_user so user_xp + xp_transactions stay
--     consistent. Refunds use direct UPDATE + xp_transactions to mark them
--     as escrow refunds (no level-up effect).

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
  v_loser_id  UUID;
  v_pot       INT;
  v_half      INT;
  v_target    INT;
  v_target_hit BOOLEAN := false;
BEGIN
  SELECT * INTO v_chal FROM public.friend_challenges WHERE id = p_challenge_id FOR UPDATE;
  IF v_chal.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'challenge_not_found');
  END IF;

  -- Only participants (or service-role) may resolve
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

  -- Resolution gate: ends_at reached, or one side reached target_value
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

  v_pot := COALESCE(v_chal.xp_pot, 0);
  v_half := v_pot / 2;

  -- Pick winner
  IF COALESCE(v_chal.progress_creator, 0) > COALESCE(v_chal.progress_opponent, 0) THEN
    v_winner_id := v_chal.creator_id;
    v_loser_id  := v_chal.opponent_id;
  ELSIF COALESCE(v_chal.progress_opponent, 0) > COALESCE(v_chal.progress_creator, 0) THEN
    v_winner_id := v_chal.opponent_id;
    v_loser_id  := v_chal.creator_id;
  ELSE
    v_winner_id := NULL; -- draw
    v_loser_id  := NULL;
  END IF;

  -- Settle XP pot
  IF v_winner_id IS NOT NULL THEN
    -- Award full pot to winner. Loser loses their escrowed half (already debited).
    IF v_pot > 0 THEN
      PERFORM public.add_xp_to_user(
        v_winner_id, v_pot,
        'friend_challenge_win', 'challenge', p_challenge_id,
        'Gain défi ami (pot)'
      );
    END IF;
  ELSE
    -- Draw: refund both halves (no level-up effect — direct user_xp update + log).
    IF v_half > 0 THEN
      UPDATE public.user_xp SET total_xp = total_xp + v_half, updated_at = NOW()
       WHERE teen_id = v_chal.creator_id;
      INSERT INTO public.xp_transactions (teen_id, amount, source_type, source_id, description)
      VALUES (v_chal.creator_id, v_half, 'friend_challenge_refund', p_challenge_id, 'Refund défi ami (égalité)');

      IF v_chal.opponent_id IS NOT NULL THEN
        UPDATE public.user_xp SET total_xp = total_xp + v_half, updated_at = NOW()
         WHERE teen_id = v_chal.opponent_id;
        INSERT INTO public.xp_transactions (teen_id, amount, source_type, source_id, description)
        VALUES (v_chal.opponent_id, v_half, 'friend_challenge_refund', p_challenge_id, 'Refund défi ami (égalité)');
      END IF;
    END IF;
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
    'xp_pot', v_pot,
    'progress_creator', v_chal.progress_creator,
    'progress_opponent', v_chal.progress_opponent
  );
END;
$$;

COMMENT ON FUNCTION public.resolve_friend_challenge_v2 IS
  'Wave 2 / TICKET-019 (FD1): resolve a v2 friend challenge — picks winner, settles xp_pot. Idempotent.';

-- =========================================================================
-- 6. Grants — RPCs are SECURITY DEFINER so we expose them to authenticated.
-- =========================================================================

GRANT EXECUTE ON FUNCTION public.create_friend_challenge_v2(
  UUID, TEXT, JSONB, TEXT, INT, INT, INT, INT
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.accept_friend_challenge_v2(UUID)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.decline_friend_challenge_v2(UUID)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.record_friend_challenge_progress_v2(UUID, INT, JSONB)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.resolve_friend_challenge_v2(UUID)
  TO authenticated, service_role;

COMMIT;

-- =========================================================================
-- Hand-off notes (FD2-FD5)
-- =========================================================================
-- FD2 (UI): the API contract is stable — POST /api/teen/friend-challenges
--   for creation; the routes pass user identity via Supabase auth cookies and
--   service-role calls into these RPCs (auth.uid() comes from Authorization
--   header set by the route handler before calling each RPC).
-- FD4 (cron): may call resolve_friend_challenge_v2 with service-role; the
--   function tolerates auth.uid()=NULL. The "too_early" gate will fire for
--   v2 challenges still in their gameplay window unless target hit early.
-- FD5 (notifs): hook into rows in friend_challenges with newly-set
--   acceptance_status / completed_at columns, or call back into these RPCs
--   from notification triggers.
-- =========================================================================
