-- ===========================================================================
-- Migration 197 — Create escrow_ledger + payment_transactions (DDL backfill)
-- Date: 2026-07-13
-- Source: docs/vision/db-architect.md §2 (D2 Economy) + lines 219-228
--         (the planned 042_missing_economy_tables.sql was never committed).
--
-- WHY THIS MIGRATION EXISTS
-- ─────────────────────────
-- The tables `escrow_ledger` and `payment_transactions` were created directly
-- in the live Supabase project early on (pre-migration-tracking) and are
-- referenced by 8+ migrations + the generated types/supabase.ts — but NO
-- migration in VCS ever contained their `CREATE TABLE`. This is documented as
-- a TODO in docs/vision/db-architect.md:222-223 ("CREATE TABLE escrow_ledger"
-- / "CREATE TABLE payment_transactions" under the unimplemented 042 plan).
--
-- A fresh database replayed against the migration set would FAIL at 061/095
-- (which ALTER / index these tables) with `relation "..." does not exist`.
--
-- Column list confirmed against the LIVE DB via the PostgREST OpenAPI spec
-- (GET /rest/v1/ with the service role key → definitions.escrow_ledger +
-- definitions.payment_transactions). Nullability below matches the live
-- schema exactly. See the VALIDATION notes inline.
--
-- IDEMPOTENT: CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS make
-- this a no-op on the prod DB that already has both tables, while fixing the
-- fresh-install gap. CHECK/RLS statements use DROP ... IF EXISTS guards.
-- ===========================================================================

BEGIN;

-- ===========================================================================
-- 1. payment_transactions
-- ---------------------------------------------------------------------------
-- Columns validated live (PostgREST OpenAPI). Nullability matches prod:
--   parent_id      NOT NULL
--   teen_id        NULL     (FK teens.id)
--   amount_dh      NOT NULL
--   amount_coins   NOT NULL
--   status         NOT NULL  DEFAULT 'pending'
--   psp_provider   NULL
--   psp_reference  NULL
--   failure_reason NULL
--   succeeded_at   NULL
--   refunded_at    NULL
--   client_idempotency_key NULL  (added by mig 095; partial UNIQUE there)
--   created_at     NOT NULL DEFAULT now()
--
-- status enum confirmed by usage in 061/091/093/179: pending, succeeded,
-- refunded, failed. 'cancelled' kept in the CHECK for forward-compat (used
-- by adjacent payment-domain tables; never rejected in prod today).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teen_id                UUID REFERENCES public.teens(id) ON DELETE CASCADE,
  amount_dh              NUMERIC(10,2) NOT NULL CHECK (amount_dh >= 0),
  amount_coins           INTEGER NOT NULL CHECK (amount_coins >= 0),
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','succeeded','failed','refunded','cancelled')),
  psp_provider           TEXT,
  psp_reference          TEXT,
  failure_reason         TEXT,
  succeeded_at           TIMESTAMPTZ,
  refunded_at            TIMESTAMPTZ,
  client_idempotency_key UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.payment_transactions IS
  'Money-truth ledger for real-DH top-ups (manual + PSP). P7 service-role-only '
  '(see db-architect.md §4). Each row pairs with an escrow_ledger top_up entry '
  'via escrow_ledger.related_payment_id. Canon: economy-payments.locked.md.';

-- ===========================================================================
-- 2. escrow_ledger
-- ---------------------------------------------------------------------------
-- Columns validated live. Nullability matches prod:
--   parent_id          NOT NULL  (live: NOT NULL; matches types Row)
--   teen_id            NOT NULL  (FK teens.id)
--   direction          NOT NULL  CHECK top_up|spend|refund
--   amount_dh          NOT NULL
--   amount_coins       NOT NULL
--   related_payment_id NULL      (FK payment_transactions.id)
--   related_spend_id   NULL      (→ coin_transactions.id; see FK note below)
--   reason             NULL
--   created_by         NULL      (→ profiles.id)
--   created_at         NOT NULL  DEFAULT now()
--
-- direction enum confirmed across 061/093/124/132/179: top_up, spend, refund.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.escrow_ledger (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teen_id             UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  direction           TEXT NOT NULL CHECK (direction IN ('top_up','spend','refund')),
  amount_dh           NUMERIC(10,2) NOT NULL,
  amount_coins        INTEGER NOT NULL,
  related_payment_id  UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  related_spend_id    UUID REFERENCES public.coin_transactions(id) ON DELETE SET NULL,
  reason              TEXT,
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.escrow_ledger IS
  'Paired DH/coin escrow ledger: one row per money movement (top_up via '
  'payment_transactions, spend via coin_transactions, refund). P7 pattern '
  '(db-architect.md §4) — service-role-only; authenticated blocked.';

-- ===========================================================================
-- 3. Indexes
-- ---------------------------------------------------------------------------
-- payment_transactions:
--   * (psp_provider, psp_reference) — used by top_up_teen RPC idempotency
--     replay lookup (WHERE psp_provider=.. AND psp_reference=.. LIMIT 1).
--   * client_idempotency_key — partial UNIQUE already created by mig 095;
--     recreate here idempotently so a fresh install matches prod. Name must
--     match the one 095 uses (idx_payment_transactions_client_idempotency_key).
--   * parent_id, teen_id, created_at DESC — dashboard / audit lookups.
--
-- escrow_ledger:
--   * idx_escrow_ledger_created_by / related_payment_id / related_spend_id
--     are created by mig 061 (B.8) — recreated here idempotently so a fresh
--     install has them even though 061 runs after this DDL backfill.
--   * parent_id, teen_id, created_at DESC — family / audit lookups.
-- ===========================================================================

-- payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_psp_lookup
  ON public.payment_transactions (psp_provider, psp_reference);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_client_idempotency_key
  ON public.payment_transactions (client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_parent_id
  ON public.payment_transactions (parent_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_teen_id
  ON public.payment_transactions (teen_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at
  ON public.payment_transactions (created_at DESC);

-- escrow_ledger (these three names are referenced by mig 061 B.8)
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_created_by
  ON public.escrow_ledger (created_by);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_related_payment_id
  ON public.escrow_ledger (related_payment_id);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_related_spend_id
  ON public.escrow_ledger (related_spend_id);

CREATE INDEX IF NOT EXISTS idx_escrow_ledger_parent_id
  ON public.escrow_ledger (parent_id);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_teen_id
  ON public.escrow_ledger (teen_id);
CREATE INDEX IF NOT EXISTS idx_escrow_ledger_created_at
  ON public.escrow_ledger (created_at DESC);

-- ===========================================================================
-- 4. RLS — P7 "service-role-only" (db-architect.md §4, line 190)
-- ---------------------------------------------------------------------------
-- Per the policy matrix: payment_transactions + escrow_ledger get
--   USING (false) FROM authenticated; service role bypasses RLS anyway.
-- This matches the intended design (sensitive money rows are never read by
-- the authenticated role directly — only via SECURITY DEFINER RPCs that run
-- as service_role / bypass RLS).
--
-- GRANTs: PostgREST needs at least a GRANT to even expose the table; we keep
-- the authenticated grant minimal (the USING(false) policy still blocks all
-- rows) and grant ALL to service_role for the RPC write paths.
-- ===========================================================================
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_ledger      ENABLE ROW LEVEL SECURITY;

-- payment_transactions policies
DROP POLICY IF EXISTS "payment_transactions_service_role_only" ON public.payment_transactions;
CREATE POLICY "payment_transactions_service_role_only"
  ON public.payment_transactions
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- escrow_ledger policies
DROP POLICY IF EXISTS "escrow_ledger_service_role_only" ON public.escrow_ledger;
CREATE POLICY "escrow_ledger_service_role_only"
  ON public.escrow_ledger
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- Grants (idempotent). authenticated gets the grant so PostgREST sees the
-- table, but the USING(false) policy blocks every row. service_role gets ALL
-- for the SECURITY DEFINER write paths.
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT SELECT ON public.escrow_ledger TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
GRANT ALL ON public.escrow_ledger      TO service_role;

COMMIT;
