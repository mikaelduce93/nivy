-- 104_partner_xp_awards.sql
-- Refonte V1.5 (#99) — attribution d'XP par coach/prof (teacher-coach-xp,
-- partner-ecosystem §3/§4.5). Table d'attribution + flag can_award_xp + RLS.
-- À appliquer via le pipeline de migration (non auto-appliqué).

-- 1) Flag d'autorisation (admin l'active pour club/education)
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS can_award_xp BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Ledger des attributions
CREATE TABLE IF NOT EXISTS public.partner_xp_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.partner_staff(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL,
  amount_xp INTEGER NOT NULL CHECK (amount_xp > 0 AND amount_xp <= 500),
  category TEXT NOT NULL CHECK (category IN ('school','sport','crea')),
  reason TEXT,
  evidence_url TEXT,                         -- bucket privé chore-evidence
  parent_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (parent_review_status IN ('pending','approved','rejected','auto_approved')),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  parent_reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_partner_xp_awards_teen_week
  ON public.partner_xp_awards (teen_id, awarded_at);
CREATE INDEX IF NOT EXISTS idx_partner_xp_awards_staff
  ON public.partner_xp_awards (staff_id, awarded_at);

-- 3) RLS — lecture/écriture limitées au staff actif du même partenaire
ALTER TABLE public.partner_xp_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_xp_awards_staff_rw ON public.partner_xp_awards;
CREATE POLICY partner_xp_awards_staff_rw ON public.partner_xp_awards
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_staff ps
      WHERE ps.id = partner_xp_awards.staff_id
        AND ps.user_id = (select auth.uid())
        AND ps.is_active = TRUE
        AND ps.role IN ('coach','teacher')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_staff ps
      JOIN public.partners p ON p.id = ps.partner_id
      WHERE ps.id = partner_xp_awards.staff_id
        AND ps.user_id = (select auth.uid())
        AND ps.is_active = TRUE
        AND ps.role IN ('coach','teacher')
        AND p.can_award_xp = TRUE
    )
  );

-- Cap par-ado-par-semaine (500 XP / awarder) + cap quotidien par staff : appliqués
-- côté RPC/route (POST /api/partner/awards/grant) de façon atomique.
