-- =========================================================================
-- Migration 073 — Friend Challenges v2 schema (Wave 1 / TICKET-018)
-- Date: 2026-05-08
-- Source: docs/vision/audit-content-personalization/TICKETS.md (TICKET-018)
--         docs/vision/gamification.md
--
-- ─────────────────────────────────────────────────────────────────────────
-- Context
-- ─────────────────────────────────────────────────────────────────────────
-- The v1 friend_challenges table (migration 006) has 0 production rows,
-- no API routes, no UI surface. The Wave-1 audit ranked the surface RED.
-- Wave-2 (FD1-FD5) will build the API + UI on top of this v2 schema.
--
-- Design choices:
--   * Extend the existing public.friend_challenges table in-place rather
--     than creating a v2 sibling — production data is empty, so a column
--     superset is safe and avoids breaking the legacy v1 RPCs that still
--     reference the table (006_friend_challenges.sql defines
--     create_friend_challenge / respond_to_challenge / complete_challenge
--     etc. which we leave untouched).
--   * Add the precise columns required by TICKET-018 acceptance criteria:
--       opponent_id UUID
--       acceptance_status TEXT  -- pending|accepted|declined|expired
--       progress_creator INT
--       progress_opponent INT
--       evidence_url TEXT
--       xp_pot INT
--   * Add v2-only convenience columns the audit and FD1-FD5 plan require:
--       challenge_kind TEXT  -- quiz_battle|mission_race|physical_count|streak_race|xp_duel
--       rules JSONB          -- per-kind config (target, duration, etc.)
--       accepted_at / completed_at TIMESTAMPTZ
--       expires_at TIMESTAMPTZ -- explicit invitation expiry distinct from ends_at
--   * Add a v2-only progress table public.friend_challenge_progress,
--     leaving the v1 challenge_progress_log untouched. The v2 progress
--     table records per-participant scores and the last signal timestamp
--     so FD4's resolution cron can pick winners deterministically.
--   * Add RLS policies enforcing creator + opponent self-read AND admin
--     read-all; writes service-role only (FD1 will implement them via
--     SECURITY DEFINER RPCs in a follow-up migration).
--   * Add indexes to support the FD4 cron sweeps and FD2 list-by-status.
--
-- Idempotency:
--   Every CREATE / ALTER / INDEX / POLICY uses IF [NOT] EXISTS or
--   DROP-then-CREATE. Re-running the migration is a no-op.
--
-- Out of scope (handled by other Wave-1/2 tickets):
--   * API routes  → FD1 (TICKET-019)
--   * UI surface  → FD2 (TICKET-020)
--   * Opponent picker RPC recommend_friends → TICKET-021 / TICKET-036
--   * Resolution cron (winner determination) → FD4 (TICKET-022)
--   * Notification templates → FD5 (TICKET-023)
-- =========================================================================

BEGIN;

-- =========================================================================
-- 1. Extend friend_challenges with v2 columns
-- =========================================================================

ALTER TABLE public.friend_challenges
  ADD COLUMN IF NOT EXISTS opponent_id UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.friend_challenges
  ADD COLUMN IF NOT EXISTS acceptance_status TEXT NOT NULL DEFAULT 'pending';

-- Add CHECK only if absent (re-runs safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'friend_challenges_acceptance_status_check'
       AND conrelid = 'public.friend_challenges'::regclass
  ) THEN
    ALTER TABLE public.friend_challenges
      ADD CONSTRAINT friend_challenges_acceptance_status_check
      CHECK (acceptance_status IN ('pending','accepted','declined','expired'));
  END IF;
END$$;

ALTER TABLE public.friend_challenges
  ADD COLUMN IF NOT EXISTS progress_creator INT NOT NULL DEFAULT 0;

ALTER TABLE public.friend_challenges
  ADD COLUMN IF NOT EXISTS progress_opponent INT NOT NULL DEFAULT 0;

ALTER TABLE public.friend_challenges
  ADD COLUMN IF NOT EXISTS evidence_url TEXT;

ALTER TABLE public.friend_challenges
  ADD COLUMN IF NOT EXISTS xp_pot INT NOT NULL DEFAULT 0;

-- v2 convenience columns
ALTER TABLE public.friend_challenges
  ADD COLUMN IF NOT EXISTS challenge_kind TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'friend_challenges_challenge_kind_check'
       AND conrelid = 'public.friend_challenges'::regclass
  ) THEN
    ALTER TABLE public.friend_challenges
      ADD CONSTRAINT friend_challenges_challenge_kind_check
      CHECK (
        challenge_kind IS NULL
        OR challenge_kind IN (
          'quiz_battle','mission_race','physical_count',
          'streak_race','xp_duel','custom'
        )
      );
  END IF;
END$$;

ALTER TABLE public.friend_challenges
  ADD COLUMN IF NOT EXISTS rules JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.friend_challenges
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

ALTER TABLE public.friend_challenges
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Invitation-expiry distinct from gameplay ends_at; FD4 cron expires
-- pending invitations after this timestamp.
ALTER TABLE public.friend_challenges
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- =========================================================================
-- 2. Indexes for FD2 list views and FD4 cron sweeps
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_friend_challenges_creator_status_v2
  ON public.friend_challenges (creator_id, status);

CREATE INDEX IF NOT EXISTS idx_friend_challenges_opponent_status_v2
  ON public.friend_challenges (opponent_id, status)
  WHERE opponent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_friend_challenges_status_ends_at
  ON public.friend_challenges (status, ends_at)
  WHERE status IN ('pending','active');

CREATE INDEX IF NOT EXISTS idx_friend_challenges_status_expires_at
  ON public.friend_challenges (status, expires_at)
  WHERE expires_at IS NOT NULL AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_friend_challenges_kind
  ON public.friend_challenges (challenge_kind)
  WHERE challenge_kind IS NOT NULL;

-- =========================================================================
-- 3. friend_challenge_progress (v2 per-participant signal log)
-- =========================================================================
-- One row per (challenge, participant) — score is mutated by SECURITY
-- DEFINER RPCs (FD1). last_signal_at lets FD4 detect stalled challenges.

CREATE TABLE IF NOT EXISTS public.friend_challenge_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id    UUID NOT NULL
                    REFERENCES public.friend_challenges(id) ON DELETE CASCADE,
  participant_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'opponent'
                    CHECK (role IN ('creator','opponent')),
  score           INT NOT NULL DEFAULT 0,
  last_signal_at  TIMESTAMPTZ,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (challenge_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_fcp_challenge
  ON public.friend_challenge_progress (challenge_id);

CREATE INDEX IF NOT EXISTS idx_fcp_participant
  ON public.friend_challenge_progress (participant_id);

CREATE INDEX IF NOT EXISTS idx_fcp_last_signal
  ON public.friend_challenge_progress (last_signal_at)
  WHERE last_signal_at IS NOT NULL;

-- updated_at trigger (reuses convention from elsewhere in the schema)
CREATE OR REPLACE FUNCTION public.friend_challenge_progress_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friend_challenge_progress_touch
  ON public.friend_challenge_progress;
CREATE TRIGGER friend_challenge_progress_touch
  BEFORE UPDATE ON public.friend_challenge_progress
  FOR EACH ROW EXECUTE FUNCTION public.friend_challenge_progress_touch();

-- =========================================================================
-- 4. RLS — friend_challenges
-- =========================================================================
-- TICKET-018 acceptance: "RLS enforcing creator/opponent read."
-- We additionally include admin read-all (consistent with the rest of the
-- platform's RLS shape). Writes are intentionally service-role only — FD1
-- will mediate all mutations through SECURITY DEFINER RPCs.

ALTER TABLE public.friend_challenges ENABLE ROW LEVEL SECURITY;

-- Drop the v1 SELECT policy that was scoped to challenge_participants (a
-- table the v2 API does not write to). Replaced with a creator/opponent
-- self-read + admin read-all policy below.
DROP POLICY IF EXISTS "Participants can view challenges"
  ON public.friend_challenges;
DROP POLICY IF EXISTS friend_challenges_participants_read_v1
  ON public.friend_challenges;
DROP POLICY IF EXISTS friend_challenges_self_read_v2
  ON public.friend_challenges;

CREATE POLICY friend_challenges_self_read_v2
  ON public.friend_challenges
  FOR SELECT TO authenticated
  USING (
    auth.uid() = creator_id
    OR auth.uid() = opponent_id
    -- back-compat: legacy v1 challenges still reachable for their
    -- challenge_participants until v1 RPCs are retired.
    OR EXISTS (
      SELECT 1 FROM public.challenge_participants cp
       WHERE cp.challenge_id = friend_challenges.id
         AND cp.user_id = auth.uid()
    )
    OR public.mentor_is_admin(auth.uid())
  );

-- (no INSERT/UPDATE/DELETE policy → service-role only via SECURITY DEFINER RPCs)

-- =========================================================================
-- 5. RLS — friend_challenge_progress
-- =========================================================================

ALTER TABLE public.friend_challenge_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS friend_challenge_progress_self_read
  ON public.friend_challenge_progress;

CREATE POLICY friend_challenge_progress_self_read
  ON public.friend_challenge_progress
  FOR SELECT TO authenticated
  USING (
    auth.uid() = participant_id
    OR EXISTS (
      SELECT 1 FROM public.friend_challenges fc
       WHERE fc.id = friend_challenge_progress.challenge_id
         AND (fc.creator_id = auth.uid() OR fc.opponent_id = auth.uid())
    )
    OR public.mentor_is_admin(auth.uid())
  );

-- (no INSERT/UPDATE/DELETE policy → service-role only)

-- =========================================================================
-- 6. Documentation hints (column comments)
-- =========================================================================

COMMENT ON COLUMN public.friend_challenges.opponent_id IS
  'v2: the user being challenged (1v1 model). Distinct from challenge_participants used by v1 multi-party flows.';
COMMENT ON COLUMN public.friend_challenges.acceptance_status IS
  'v2 invitation lifecycle: pending|accepted|declined|expired. Distinct from status (gameplay lifecycle).';
COMMENT ON COLUMN public.friend_challenges.progress_creator IS
  'v2 denormalised score for creator (mirrors friend_challenge_progress for fast list views).';
COMMENT ON COLUMN public.friend_challenges.progress_opponent IS
  'v2 denormalised score for opponent.';
COMMENT ON COLUMN public.friend_challenges.evidence_url IS
  'v2 optional photo/video evidence URL for physical_count / mission_race resolution.';
COMMENT ON COLUMN public.friend_challenges.xp_pot IS
  'v2 total XP at stake (sum of both sides). Settled by FD4 cron on completion.';
COMMENT ON COLUMN public.friend_challenges.challenge_kind IS
  'v2 challenge taxonomy: quiz_battle|mission_race|physical_count|streak_race|xp_duel|custom.';
COMMENT ON COLUMN public.friend_challenges.rules IS
  'v2 per-kind config (target, duration_hours, quiz_id, mission_template_id, etc.).';
COMMENT ON COLUMN public.friend_challenges.expires_at IS
  'v2 invitation-expiry timestamp. FD4 cron flips acceptance_status=expired past this time.';

COMMENT ON TABLE public.friend_challenge_progress IS
  'v2 per-participant scoreboard for friend_challenges. Mutated only via SECURITY DEFINER RPCs from FD1.';

COMMIT;

-- =========================================================================
-- Hand-off notes (FD1-FD5)
-- =========================================================================
-- FD1 (TICKET-019, API):
--   * Mutations should go through new SECURITY DEFINER RPCs (recommended:
--     create_friend_challenge_v2, accept_friend_challenge_v2,
--     decline_friend_challenge_v2, record_friend_challenge_progress_v2,
--     resolve_friend_challenge_v2). They MUST NOT use the v1 RPCs in
--     migration 006 — those write challenge_participants which the v2 RLS
--     does not depend on. Keep v1 RPCs untouched for back-compat.
--   * On accept: set acceptance_status='accepted', accepted_at=NOW(),
--     status='active'. Insert two friend_challenge_progress rows
--     (creator + opponent).
--   * XP-stake escrow: debit both sides' xp_transactions, credit xp_pot
--     into the row. FD4 settles on resolve.
--
-- FD2 (TICKET-020, UI): list by (creator_id|opponent_id, status). The
--   indexes idx_friend_challenges_creator_status_v2 +
--   idx_friend_challenges_opponent_status_v2 cover this.
--
-- FD3 (TICKET-021, opponent picker): consumes recommend_friends RPC built
--   in TICKET-036 — independent of this schema.
--
-- FD4 (TICKET-022, resolution cron):
--   * Sweep WHERE status='active' AND ends_at < NOW(): pick winner via
--     progress_creator vs progress_opponent (or NULL on tie). Set
--     status='completed', completed_at=NOW(), winner_id, distribute xp_pot.
--   * Sweep WHERE acceptance_status='pending' AND expires_at < NOW(): set
--     acceptance_status='expired', status='expired'. Refund any escrow.
--   * Index idx_friend_challenges_status_ends_at +
--     idx_friend_challenges_status_expires_at make both sweeps cheap.
--
-- FD5 (TICKET-023, notifications): hook into FD1 + FD4 RPCs and seed
--   notification_templates rows for invite/accept/ends-soon/resolved.
-- =========================================================================
