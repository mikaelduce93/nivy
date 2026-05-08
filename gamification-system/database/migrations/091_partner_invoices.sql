-- Wave Polish-D — partner_invoices table
--
-- Purpose: replace the derivative view at /partner/invoices that synthesises
-- "invoices" out of partner_payouts rows with a real, first-class invoice
-- table. Each succeeded payout auto-materialises a draft invoice via trigger.
-- Admins flip drafts to "issued" via the SECURITY DEFINER RPC
-- issue_partner_invoice, which stamps the canonical INV-YYYY-NNNN number.
--
-- Idempotent: every CREATE/ALTER/POLICY uses IF NOT EXISTS / DROP IF EXISTS.
--
-- Invariants preserved:
--   - partner_payouts remains the source of truth for cash movement.
--   - This file does not modify or drop partner_payouts.
--   - RLS: partner self-read via partner_staff.user_id (matches the rest of
--     the partner module — see migration 058 menu_items_partner_modify).

-- 1) Table -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  invoice_number  TEXT UNIQUE,
  payout_id       UUID REFERENCES public.partner_payouts(id) ON DELETE SET NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  gross_dh        NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_dh   NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_dh          NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_pct         NUMERIC(5,2)  NOT NULL DEFAULT 20.00,
  vat_dh          NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_dh        NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','issued','paid','cancelled')),
  issued_at       TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  pdf_url         TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Indexes -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_partner_invoices_partner_issued
  ON public.partner_invoices (partner_id, issued_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_status
  ON public.partner_invoices (status);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_invoice_number
  ON public.partner_invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_partner_invoices_payout
  ON public.partner_invoices (payout_id);

-- 3) updated_at trigger ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.partner_invoices_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_invoices_touch ON public.partner_invoices;
CREATE TRIGGER trg_partner_invoices_touch
  BEFORE UPDATE ON public.partner_invoices
  FOR EACH ROW EXECUTE FUNCTION public.partner_invoices_touch_updated_at();

-- 4) RLS ---------------------------------------------------------------------
ALTER TABLE public.partner_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_invoices_self_read ON public.partner_invoices;
CREATE POLICY partner_invoices_self_read ON public.partner_invoices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_staff s
      WHERE s.user_id = auth.uid()
        AND s.partner_id = partner_invoices.partner_id
        AND s.is_active = true
    )
  );

-- Admin-only writes: matches admin gating elsewhere via admin_roles.
DROP POLICY IF EXISTS partner_invoices_admin_write ON public.partner_invoices;
CREATE POLICY partner_invoices_admin_write ON public.partner_invoices
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles a
      WHERE a.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_roles a
      WHERE a.profile_id = auth.uid()
    )
  );

GRANT SELECT ON public.partner_invoices TO authenticated;
GRANT ALL    ON public.partner_invoices TO service_role;

-- 5) Auto-materialise draft on partner_payouts succeeded ---------------------
-- When a payout is inserted (or updated) into status='succeeded' (also
-- accepts 'paid' / 'completed' as eq. terminal states), create a draft
-- invoice. Reads gross/commission breakdown from the JSON in
-- partner_payouts.reference (written by app/api/cron/partner-payout-monthly).
CREATE OR REPLACE FUNCTION public.partner_payouts_materialise_invoice()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_breakdown   JSONB;
  v_gross       NUMERIC(12,2) := 0;
  v_commission  NUMERIC(12,2) := 0;
  v_net         NUMERIC(12,2) := 0;
  v_vat_pct     NUMERIC(5,2)  := 20.00;
  v_vat_dh      NUMERIC(12,2) := 0;
  v_total       NUMERIC(12,2) := 0;
BEGIN
  -- Only act on terminal "money has moved" states.
  IF NEW.status NOT IN ('succeeded','paid','completed') THEN
    RETURN NEW;
  END IF;

  -- Skip if an invoice already references this payout.
  IF EXISTS (SELECT 1 FROM public.partner_invoices WHERE payout_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Try to parse the JSON breakdown the cron stuffed into "reference".
  BEGIN
    v_breakdown := NEW.reference::jsonb;
    v_gross      := COALESCE((v_breakdown->>'gross_dh')::numeric, 0);
    v_commission := COALESCE((v_breakdown->>'commission_dh')::numeric, 0);
    v_net        := COALESCE((v_breakdown->>'net_dh')::numeric, NEW.total_dh);
  EXCEPTION WHEN OTHERS THEN
    -- reference wasn't JSON (e.g. external bank ref). Fall back to net only.
    v_gross      := NEW.total_dh;
    v_commission := 0;
    v_net        := NEW.total_dh;
  END;

  v_vat_dh := ROUND(v_net * v_vat_pct / 100.0, 2);
  v_total  := v_net + v_vat_dh;

  INSERT INTO public.partner_invoices (
    partner_id, payout_id, period_start, period_end,
    gross_dh, commission_dh, net_dh, vat_pct, vat_dh, total_dh,
    status
  ) VALUES (
    NEW.partner_id, NEW.id, NEW.period_start, NEW.period_end,
    v_gross, v_commission, v_net, v_vat_pct, v_vat_dh, v_total,
    'draft'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_payouts_materialise_invoice
  ON public.partner_payouts;
CREATE TRIGGER trg_partner_payouts_materialise_invoice
  AFTER INSERT OR UPDATE OF status ON public.partner_payouts
  FOR EACH ROW EXECUTE FUNCTION public.partner_payouts_materialise_invoice();

-- 6) issue_partner_invoice RPC ----------------------------------------------
-- Flips draft → issued, stamps issued_at, assigns the canonical
-- INV-YYYY-NNNN invoice number. NNNN is a 4-digit zero-padded counter that
-- restarts each calendar year (based on COUNT of invoices already issued in
-- that year + 1). Concurrency-safe via row-level lock + UNIQUE constraint.
CREATE OR REPLACE FUNCTION public.issue_partner_invoice(
  p_invoice_id UUID,
  p_admin_id   UUID
)
RETURNS public.partner_invoices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv        public.partner_invoices;
  v_year       INT;
  v_count      INT;
  v_number     TEXT;
  v_is_admin   BOOLEAN;
BEGIN
  -- Verify caller is admin.
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE profile_id = p_admin_id
  ) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'unauthorised: not an admin' USING ERRCODE = '42501';
  END IF;

  -- Lock the invoice row for update to serialise number assignment per year.
  SELECT * INTO v_inv FROM public.partner_invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invoice not found: %', p_invoice_id USING ERRCODE = 'P0002';
  END IF;

  IF v_inv.status <> 'draft' THEN
    RAISE EXCEPTION 'invoice % is not in draft status (current: %)',
      p_invoice_id, v_inv.status USING ERRCODE = '22023';
  END IF;

  v_year := EXTRACT(YEAR FROM NOW())::INT;

  -- Loop until we win the UNIQUE race (defensive — should resolve in 1 try).
  FOR i IN 1..10 LOOP
    SELECT COUNT(*) + 1 INTO v_count
      FROM public.partner_invoices
      WHERE invoice_number LIKE 'INV-' || v_year::text || '-%';
    v_number := 'INV-' || v_year::text || '-' || LPAD(v_count::text, 4, '0');

    BEGIN
      UPDATE public.partner_invoices
        SET status = 'issued',
            issued_at = NOW(),
            invoice_number = v_number
        WHERE id = p_invoice_id
        RETURNING * INTO v_inv;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- Another tx grabbed this number; retry with a fresh count.
      CONTINUE;
    END;
  END LOOP;

  RETURN v_inv;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_partner_invoice(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_partner_invoice(UUID, UUID) TO authenticated, service_role;
