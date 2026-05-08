-- 088_chore_targets.sql — Wave 3 PC5 / TICKET-016
--
-- Sibling fan-out for parent chores. A single chore can now target multiple
-- linked teens (siblings) via the new `chore_targets` junction table. The
-- existing `parent_chores.teen_id` column is preserved for backward compat
-- (it stores the "primary" / first-selected teen so legacy queries keep
-- working); the canonical multi-teen list lives in `chore_targets`.
--
-- Per-completion tracking (`parent_chore_completions.teen_id`) is unchanged:
-- each teen completes independently, so payouts and verification continue to
-- run per-teen on the same rails.
--
-- RLS:
--   * chore_targets — parent (owner of chore) can read/write, target teen
--     can read their own row.
--   * parent_chores — extend the read policy so a teen listed in
--     chore_targets can also read the chore (in addition to the legacy
--     teen_id = auth.uid() check).

-- ---------------------------------------------------------------------------
-- Junction table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.chore_targets (
  chore_id UUID NOT NULL REFERENCES public.parent_chores(id) ON DELETE CASCADE,
  teen_id  UUID NOT NULL REFERENCES public.profiles(id)      ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chore_id, teen_id)
);

CREATE INDEX IF NOT EXISTS idx_chore_targets_teen
  ON public.chore_targets(teen_id);

CREATE INDEX IF NOT EXISTS idx_chore_targets_chore
  ON public.chore_targets(chore_id);

ALTER TABLE public.chore_targets ENABLE ROW LEVEL SECURITY;

-- Parent owner of the chore controls writes; teen can read their own targets.
DROP POLICY IF EXISTS chore_targets_parent_write ON public.chore_targets;
CREATE POLICY chore_targets_parent_write ON public.chore_targets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_chores pc
      WHERE pc.id = chore_targets.chore_id
        AND pc.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parent_chores pc
      WHERE pc.id = chore_targets.chore_id
        AND pc.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chore_targets_teen_read ON public.chore_targets;
CREATE POLICY chore_targets_teen_read ON public.chore_targets
  FOR SELECT
  USING (teen_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Extend parent_chores read RLS so a teen referenced via chore_targets can
-- also see the chore (in addition to the legacy teen_id direct match).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS parent_chores_self_read ON public.parent_chores;
CREATE POLICY parent_chores_self_read ON public.parent_chores
  FOR SELECT
  USING (
    parent_id = auth.uid()
    OR teen_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chore_targets ct
      WHERE ct.chore_id = parent_chores.id
        AND ct.teen_id  = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Backfill: every existing parent_chore gets a self-target row so the new
-- code path (which reads from chore_targets) keeps working for legacy chores.
-- ---------------------------------------------------------------------------

INSERT INTO public.chore_targets (chore_id, teen_id)
SELECT id, teen_id
FROM public.parent_chores
WHERE teen_id IS NOT NULL
ON CONFLICT (chore_id, teen_id) DO NOTHING;
