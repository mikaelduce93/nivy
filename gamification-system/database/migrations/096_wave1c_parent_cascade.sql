-- ============================================================================
-- Migration 096 — Wave 1C — Parent Approval Cascade + Audit Compatibility
-- ============================================================================
-- Source of truth:
--   docs/canon/parent-control.locked.md §5 (Approvals queue + cascade)
--   docs/canon/parent-control.locked.md §10 FORBIDDEN #1 (no flip-only)
--   docs/canon/parent-control.locked.md §11 MISSING #11 (parent_approve_*)
--   docs/canon/admin-moderation.locked.md §4 (audit_log singular)
--   docs/canon/admin-moderation.locked.md §10 FORBIDDEN #8 (`admin_audit_logs`
--     non-canonical) + §10 FORBIDDEN #9 (no swallowed audit failure)
--   docs/canon/admin-moderation.locked.md §12.D3 (SQL runner ring-fence)
--
-- Goals:
--   A. Defensive: ensure `audit_log` carries the canonical 11 columns.
--   B. Replace the legacy `admin_audit_logs` TABLE with a backwards-compatible
--      VIEW projecting `audit_log`. Existing readers (admin dashboards, CSV
--      exports) continue to work; new writers MUST target `audit_log`.
--   C. Add the 5 canonical parent-approval cascade RPCs and their deny
--      counterparts. Each is SECURITY DEFINER, idempotent on the approval id,
--      validates link + ownership, performs the business side effect, and
--      writes user_notifications + audit_log.
--   D. Backfill any existing `admin_audit_logs` rows into `audit_log` so the
--      VIEW projection is lossless.
--
-- Apply order:
--   1. (A) audit_log column closure
--   2. (D) backfill admin_audit_logs → audit_log
--   3. (B) drop admin_audit_logs table, create VIEW
--   4. (C) parent_approve_* + parent_deny_* RPCs
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. audit_log canonical columns (idempotent / defensive).
--    Wave 1A migration 094 created the table with the 12 columns we need.
--    Re-assert here so the migration can be re-run on a fresh install where
--    094 hasn't run yet, or where columns drifted.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='audit_log'
  ) THEN
    CREATE TABLE public.audit_log (
      id              BIGSERIAL PRIMARY KEY,
      actor_id        UUID,
      actor_role      TEXT,
      action          TEXT NOT NULL,
      resource_type   TEXT,
      resource_id     TEXT,
      target_user_id  UUID,
      description     TEXT,
      metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip_address      TEXT,
      user_agent      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;

  -- Defensive ADD COLUMN IF NOT EXISTS for each canonical column.
  ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS actor_id UUID;
  ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS actor_role TEXT;
  ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS resource_type TEXT;
  ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS resource_id TEXT;
  ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS target_user_id UUID;
  ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS ip_address TEXT;
  ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS user_agent TEXT;

  CREATE INDEX IF NOT EXISTS audit_log_actor_idx     ON public.audit_log (actor_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS audit_log_target_idx    ON public.audit_log (target_user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS audit_log_resource_idx  ON public.audit_log (resource_type, resource_id);

  -- RLS: service_role writes; super_admin reads all; admin reads own.
  ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
END$$;

-- RLS policies (idempotent: drop + recreate).
DROP POLICY IF EXISTS audit_log_super_admin_read ON public.audit_log;
DROP POLICY IF EXISTS audit_log_admin_read_own  ON public.audit_log;

CREATE POLICY audit_log_super_admin_read ON public.audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.profile_id = auth.uid()
        AND ar.role = 'super_admin'
    )
  );

CREATE POLICY audit_log_admin_read_own ON public.audit_log
  FOR SELECT
  USING (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.profile_id = auth.uid()
        AND ar.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- D. Backfill admin_audit_logs → audit_log (run BEFORE we drop the table).
--    Map: admin_id → actor_id, target_type → resource_type, target_id →
--    resource_id (text), payload → metadata.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='admin_audit_logs'
      AND table_type = 'BASE TABLE'
  ) THEN
    INSERT INTO public.audit_log (
      actor_id, action, resource_type, resource_id, metadata, ip_address, created_at
    )
    SELECT
      aal.user_id,
      aal.action,
      aal.target_type,
      CASE WHEN aal.target_id IS NULL THEN NULL ELSE aal.target_id::text END,
      COALESCE(aal.payload, '{}'::jsonb)
        || jsonb_build_object('legacy_admin_audit_logs_id', aal.id),
      aal.ip_address::text,
      aal.created_at
    FROM public.admin_audit_logs aal
    WHERE NOT EXISTS (
      SELECT 1 FROM public.audit_log al
      WHERE (al.metadata->>'legacy_admin_audit_logs_id')::text = aal.id::text
    );

    RAISE NOTICE '096_wave1c: backfilled admin_audit_logs → audit_log';
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- B. Drop admin_audit_logs TABLE, replace with VIEW projecting audit_log.
--    The view exposes the legacy column names so dashboards / exports keep
--    working. App code MUST stop writing to admin_audit_logs (lint rule
--    CANON-AUDIT-001/002 enforces this).
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='admin_audit_logs'
      AND table_type = 'BASE TABLE'
  ) THEN
    DROP TABLE public.admin_audit_logs CASCADE;
  END IF;
END$$;

CREATE OR REPLACE VIEW public.admin_audit_logs AS
SELECT
  id,
  actor_id           AS user_id,
  actor_id           AS admin_id,
  action,
  resource_type      AS target_type,
  resource_id        AS target_id,
  metadata           AS payload,
  ip_address::text   AS ip_address,
  created_at
FROM public.audit_log;

COMMENT ON VIEW public.admin_audit_logs IS
  'DEPRECATED — back-compat projection of public.audit_log. New writes MUST target audit_log directly (canon: admin-moderation §4 + §10 FORBIDDEN #8).';

-- ----------------------------------------------------------------------------
-- C. Parent approval cascade RPCs.
--
-- Unified shape (LOCKED for Wave 1C):
--   parent_approve_<resource>(p_approval_id uuid, p_parent_id uuid)
--     RETURNS jsonb { success, ... }
--   parent_deny_<resource>(p_approval_id uuid, p_parent_id uuid, p_reason text)
--     RETURNS jsonb
--
-- Each function:
--   1. Resolves auth.uid(); if non-null, must equal p_parent_id (else
--      'unauthorized_caller').
--   2. Locks the parental_approvals row FOR UPDATE.
--   3. Validates parent_id, status='pending', parent_teen_links active.
--   4. If approve: performs the side effect (status flip on resource +
--      monetary debit/credit where applicable). For mentor sessions and
--      rides, delegates to the existing canonical RPCs
--      (parent_approve_session / approve_ride). For food/purchase/content,
--      flips status inline.
--   5. UPDATE parental_approvals SET status='approved'|'denied', decided_at,
--      decided_by.
--   6. INSERT user_notifications (teen receipt).
--   7. INSERT audit_log row.
--
-- Idempotency:
--   On re-call (status already approved/denied), the function returns
--   { success: true, idempotent: true, decision: <prior> } without re-running
--   the side effect.
-- ----------------------------------------------------------------------------

-- Internal helper: parent-teen link gate.
CREATE OR REPLACE FUNCTION public._parent_link_active(p_parent_id uuid, p_teen_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.parent_teen_links
    WHERE parent_id = p_parent_id
      AND teen_id   = p_teen_id
      AND status    = 'active'
  );
$$;

-- Internal helper: write a teen-side notification + an audit_log row for an
-- approval decision. NEVER swallows on failure (canon: admin-moderation §10
-- FORBIDDEN #9 — silent audit failure forbidden).
CREATE OR REPLACE FUNCTION public._approval_finalize(
  p_approval_id uuid,
  p_parent_id   uuid,
  p_teen_id     uuid,
  p_decision    text,        -- 'approved' | 'denied'
  p_action_type text,        -- canonical parental_approvals.action_type
  p_resource_type text,
  p_resource_id uuid,
  p_reason      text DEFAULT NULL,
  p_extra_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_label TEXT;
  v_title TEXT;
  v_body  TEXT;
  v_url   TEXT;
BEGIN
  v_label := CASE p_action_type
    WHEN 'coach_meeting' THEN 'rendez-vous mentor'
    WHEN 'ride'          THEN 'trajet'
    WHEN 'food_order'    THEN 'commande restaurant'
    WHEN 'purchase_above_ceiling' THEN 'achat marketplace'
    WHEN 'content'       THEN 'contenu social'
    ELSE 'demande'
  END;

  v_title := CASE p_decision
    WHEN 'approved' THEN 'Demande approuvée'
    ELSE 'Demande refusée'
  END;

  v_body := CASE p_decision
    WHEN 'approved' THEN 'Votre ' || v_label || ' a été approuvé(e) par votre parent.'
    ELSE 'Votre ' || v_label || ' a été refusé(e)'
         || CASE WHEN p_reason IS NOT NULL AND p_reason <> ''
                 THEN ' (' || p_reason || ')' ELSE '' END
         || '.'
  END;

  v_url := CASE p_resource_type
    WHEN 'mentor_session'      THEN '/teen/mentor-sessions/' || p_resource_id::text
    WHEN 'ride'                THEN '/teen/rides'
    WHEN 'food_order'          THEN '/teen/food'
    WHEN 'marketplace_listing' THEN '/marketplace/listings/' || p_resource_id::text
    ELSE NULL
  END;

  INSERT INTO public.user_notifications (
    user_id, title, body, priority, data, action_url
  ) VALUES (
    p_teen_id,
    v_title,
    v_body,
    'high',
    jsonb_build_object(
      'type',          'parental_approval',
      'approval_id',   p_approval_id,
      'action_type',   p_action_type,
      'resource_type', p_resource_type,
      'resource_id',   p_resource_id,
      'decision',      p_decision
    ),
    v_url
  );

  INSERT INTO public.audit_log (
    actor_id, actor_role, action, resource_type, resource_id,
    target_user_id, description, metadata
  ) VALUES (
    p_parent_id,
    'parent',
    'parent_approval_' || p_decision,
    p_resource_type,
    p_resource_id::text,
    p_teen_id,
    'Parental approval ' || p_decision || ' for ' || p_action_type,
    jsonb_build_object('approval_id', p_approval_id, 'reason', p_reason)
      || COALESCE(p_extra_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public._approval_finalize(uuid, uuid, uuid, text, text, text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._approval_finalize(uuid, uuid, uuid, text, text, text, uuid, text, jsonb) TO service_role;

-- ----------------------------------------------------------------------------
-- C.1 parent_approve_ride / parent_deny_ride
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parent_approve_ride(
  p_approval_id uuid,
  p_parent_id   uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_appr     RECORD;
  v_ride_id  uuid;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  SELECT pa.* INTO v_appr
  FROM public.parental_approvals pa
  WHERE pa.id = p_approval_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'approval_not_found');
  END IF;
  IF v_appr.parent_id <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_owner');
  END IF;
  -- Idempotent replay.
  IF v_appr.status IN ('approved','denied') THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true,
                              'decision', v_appr.status,
                              'approval_id', p_approval_id);
  END IF;
  IF v_appr.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'approval_not_pending');
  END IF;
  IF NOT public._parent_link_active(p_parent_id, v_appr.teen_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_linked_parent');
  END IF;
  IF v_appr.action_type <> 'ride' THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_action_type');
  END IF;

  v_ride_id := v_appr.resource_id;

  -- Side effect: flip ride_bookings.status='approved' (this hooks into the
  -- existing dispatcher which picks up approved rides). Fail-fast on RLS or
  -- missing row — the cascade MUST surface as 5xx upstream, not a fake 200.
  UPDATE public.ride_bookings
     SET status = 'approved'
   WHERE id = v_ride_id
     AND status IN ('requested','pending_approval');

  IF NOT FOUND THEN
    -- Either the ride doesn't exist or it has already moved past requested.
    -- Don't flip the approval; surface as error.
    RETURN jsonb_build_object('success', false, 'error', 'ride_not_actionable');
  END IF;

  UPDATE public.parental_approvals
     SET status = 'approved', decided_at = now(), decided_by = p_parent_id
   WHERE id = p_approval_id;

  PERFORM public._approval_finalize(
    p_approval_id, p_parent_id, v_appr.teen_id,
    'approved', 'ride', 'ride', v_ride_id, NULL,
    jsonb_build_object('ride_id', v_ride_id)
  );

  RETURN jsonb_build_object('success', true, 'approval_id', p_approval_id,
                            'ride_id', v_ride_id, 'decision', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.parent_deny_ride(
  p_approval_id uuid,
  p_parent_id   uuid,
  p_reason      text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller  uuid := auth.uid();
  v_appr    RECORD;
  v_ride_id uuid;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  SELECT * INTO v_appr FROM public.parental_approvals WHERE id = p_approval_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_found'); END IF;
  IF v_appr.parent_id <> p_parent_id THEN RETURN jsonb_build_object('success', false, 'error', 'not_owner'); END IF;
  IF v_appr.status IN ('approved','denied') THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'decision', v_appr.status);
  END IF;
  IF v_appr.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_pending'); END IF;
  IF NOT public._parent_link_active(p_parent_id, v_appr.teen_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_linked_parent');
  END IF;

  v_ride_id := v_appr.resource_id;

  UPDATE public.ride_bookings SET status = 'denied' WHERE id = v_ride_id;

  UPDATE public.parental_approvals
     SET status = 'denied', decided_at = now(), decided_by = p_parent_id,
         details = COALESCE(details,'{}'::jsonb) || jsonb_build_object('rejection_reason', p_reason)
   WHERE id = p_approval_id;

  PERFORM public._approval_finalize(
    p_approval_id, p_parent_id, v_appr.teen_id,
    'denied', 'ride', 'ride', v_ride_id, p_reason,
    jsonb_build_object('ride_id', v_ride_id)
  );

  RETURN jsonb_build_object('success', true, 'approval_id', p_approval_id, 'decision', 'denied');
END;
$$;

-- ----------------------------------------------------------------------------
-- C.2 parent_approve_food / parent_deny_food
--
-- Food semantic: place_food_order pre-creates parental_approvals when the
-- order needs review (non-halal, challenge violation, over-budget). The food
-- order is created with status='pending'. On approve, we flip food_orders
-- to 'accepted' (partner picks up from there). On deny, food_orders → 'rejected'.
-- We do NOT debit coins here — place_food_order already handled the wallet
-- side. (Per canon §5: gate must run BEFORE the spend; place_food_order
-- already gates the spend on the parental_approvals existence.)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parent_approve_food(
  p_approval_id uuid,
  p_parent_id   uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_appr     RECORD;
  v_order_id uuid;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  SELECT * INTO v_appr FROM public.parental_approvals WHERE id = p_approval_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_found'); END IF;
  IF v_appr.parent_id <> p_parent_id THEN RETURN jsonb_build_object('success', false, 'error', 'not_owner'); END IF;
  IF v_appr.status IN ('approved','denied') THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'decision', v_appr.status);
  END IF;
  IF v_appr.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_pending'); END IF;
  IF NOT public._parent_link_active(p_parent_id, v_appr.teen_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_linked_parent');
  END IF;
  IF v_appr.action_type <> 'food_order' THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_action_type');
  END IF;

  v_order_id := v_appr.resource_id;
  UPDATE public.food_orders SET status='accepted' WHERE id=v_order_id AND status='pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_actionable');
  END IF;

  UPDATE public.parental_approvals
     SET status='approved', decided_at=now(), decided_by=p_parent_id
   WHERE id=p_approval_id;

  PERFORM public._approval_finalize(
    p_approval_id, p_parent_id, v_appr.teen_id,
    'approved', 'food_order', 'food_order', v_order_id, NULL,
    jsonb_build_object('order_id', v_order_id)
  );

  RETURN jsonb_build_object('success', true, 'approval_id', p_approval_id,
                            'order_id', v_order_id, 'decision', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.parent_deny_food(
  p_approval_id uuid,
  p_parent_id   uuid,
  p_reason      text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_appr     RECORD;
  v_order_id uuid;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  SELECT * INTO v_appr FROM public.parental_approvals WHERE id=p_approval_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_found'); END IF;
  IF v_appr.parent_id <> p_parent_id THEN RETURN jsonb_build_object('success', false, 'error', 'not_owner'); END IF;
  IF v_appr.status IN ('approved','denied') THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'decision', v_appr.status);
  END IF;
  IF v_appr.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_pending'); END IF;
  IF NOT public._parent_link_active(p_parent_id, v_appr.teen_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_linked_parent');
  END IF;

  v_order_id := v_appr.resource_id;
  UPDATE public.food_orders SET status='rejected' WHERE id=v_order_id;

  UPDATE public.parental_approvals
     SET status='denied', decided_at=now(), decided_by=p_parent_id,
         details = COALESCE(details,'{}'::jsonb) || jsonb_build_object('rejection_reason', p_reason)
   WHERE id=p_approval_id;

  PERFORM public._approval_finalize(
    p_approval_id, p_parent_id, v_appr.teen_id,
    'denied', 'food_order', 'food_order', v_order_id, p_reason,
    jsonb_build_object('order_id', v_order_id)
  );

  RETURN jsonb_build_object('success', true, 'approval_id', p_approval_id, 'decision', 'denied');
END;
$$;

-- ----------------------------------------------------------------------------
-- C.3 parent_approve_purchase / parent_deny_purchase
--
-- Purchase: marketplace listing above the ceiling. The teen's intent is held
-- in parental_approvals.details (buyer_teen_id, listing_id, meet_method).
-- On approve, we flip status only — the teen's UI must call buy_listing in
-- a follow-up; the gate has been satisfied. (We could call buy_listing
-- here, but the price/inventory may have shifted; the teen reconfirms.)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parent_approve_purchase(
  p_approval_id uuid,
  p_parent_id   uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller    uuid := auth.uid();
  v_appr      RECORD;
  v_listing_id uuid;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  SELECT * INTO v_appr FROM public.parental_approvals WHERE id=p_approval_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_found'); END IF;
  IF v_appr.parent_id <> p_parent_id THEN RETURN jsonb_build_object('success', false, 'error', 'not_owner'); END IF;
  IF v_appr.status IN ('approved','denied') THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'decision', v_appr.status);
  END IF;
  IF v_appr.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_pending'); END IF;
  IF NOT public._parent_link_active(p_parent_id, v_appr.teen_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_linked_parent');
  END IF;
  IF v_appr.action_type <> 'purchase_above_ceiling' THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_action_type');
  END IF;

  v_listing_id := v_appr.resource_id;

  UPDATE public.parental_approvals
     SET status='approved', decided_at=now(), decided_by=p_parent_id
   WHERE id=p_approval_id;

  PERFORM public._approval_finalize(
    p_approval_id, p_parent_id, v_appr.teen_id,
    'approved', 'purchase_above_ceiling', 'marketplace_listing', v_listing_id, NULL,
    jsonb_build_object('listing_id', v_listing_id)
  );

  RETURN jsonb_build_object('success', true, 'approval_id', p_approval_id,
                            'listing_id', v_listing_id, 'decision', 'approved',
                            'note', 'Teen must reconfirm via buy_listing.');
END;
$$;

CREATE OR REPLACE FUNCTION public.parent_deny_purchase(
  p_approval_id uuid,
  p_parent_id   uuid,
  p_reason      text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller    uuid := auth.uid();
  v_appr      RECORD;
  v_listing_id uuid;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  SELECT * INTO v_appr FROM public.parental_approvals WHERE id=p_approval_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_found'); END IF;
  IF v_appr.parent_id <> p_parent_id THEN RETURN jsonb_build_object('success', false, 'error', 'not_owner'); END IF;
  IF v_appr.status IN ('approved','denied') THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'decision', v_appr.status);
  END IF;
  IF v_appr.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_pending'); END IF;
  IF NOT public._parent_link_active(p_parent_id, v_appr.teen_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_linked_parent');
  END IF;

  v_listing_id := v_appr.resource_id;

  UPDATE public.parental_approvals
     SET status='denied', decided_at=now(), decided_by=p_parent_id,
         details = COALESCE(details,'{}'::jsonb) || jsonb_build_object('rejection_reason', p_reason)
   WHERE id=p_approval_id;

  PERFORM public._approval_finalize(
    p_approval_id, p_parent_id, v_appr.teen_id,
    'denied', 'purchase_above_ceiling', 'marketplace_listing', v_listing_id, p_reason,
    jsonb_build_object('listing_id', v_listing_id)
  );

  RETURN jsonb_build_object('success', true, 'approval_id', p_approval_id, 'decision', 'denied');
END;
$$;

-- ----------------------------------------------------------------------------
-- C.4 parent_approve_content / parent_deny_content
--
-- Content: photo / video consent on a feed_post or event_check_in. Approve
-- flips the source row's `consent_required = false` (or in feed_posts case,
-- moves status to 'published' if it was 'pending_consent'). Best-effort —
-- if the source row doesn't carry consent flags, we still write the
-- approval decision and notification.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parent_approve_content(
  p_approval_id uuid,
  p_parent_id   uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_appr     RECORD;
  v_content_id uuid;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  SELECT * INTO v_appr FROM public.parental_approvals WHERE id=p_approval_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_found'); END IF;
  IF v_appr.parent_id <> p_parent_id THEN RETURN jsonb_build_object('success', false, 'error', 'not_owner'); END IF;
  IF v_appr.status IN ('approved','denied') THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'decision', v_appr.status);
  END IF;
  IF v_appr.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_pending'); END IF;
  IF NOT public._parent_link_active(p_parent_id, v_appr.teen_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_linked_parent');
  END IF;
  IF v_appr.action_type <> 'content' THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_action_type');
  END IF;

  v_content_id := v_appr.resource_id;

  -- Best-effort source-row flip. Wrapped in a savepoint-like guard via dynamic
  -- existence check.
  IF v_appr.resource_type = 'feed_post' THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feed_posts') THEN
      UPDATE public.feed_posts SET status='published' WHERE id=v_content_id AND status IN ('pending_consent','pending');
    END IF;
  END IF;

  UPDATE public.parental_approvals
     SET status='approved', decided_at=now(), decided_by=p_parent_id
   WHERE id=p_approval_id;

  PERFORM public._approval_finalize(
    p_approval_id, p_parent_id, v_appr.teen_id,
    'approved', 'content', v_appr.resource_type, v_content_id, NULL,
    jsonb_build_object('content_id', v_content_id)
  );

  RETURN jsonb_build_object('success', true, 'approval_id', p_approval_id,
                            'content_id', v_content_id, 'decision', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.parent_deny_content(
  p_approval_id uuid,
  p_parent_id   uuid,
  p_reason      text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_appr     RECORD;
  v_content_id uuid;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  SELECT * INTO v_appr FROM public.parental_approvals WHERE id=p_approval_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_found'); END IF;
  IF v_appr.parent_id <> p_parent_id THEN RETURN jsonb_build_object('success', false, 'error', 'not_owner'); END IF;
  IF v_appr.status IN ('approved','denied') THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'decision', v_appr.status);
  END IF;
  IF v_appr.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_pending'); END IF;
  IF NOT public._parent_link_active(p_parent_id, v_appr.teen_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_linked_parent');
  END IF;

  v_content_id := v_appr.resource_id;

  IF v_appr.resource_type = 'feed_post' THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='feed_posts') THEN
      UPDATE public.feed_posts SET is_hidden=true, status='hidden' WHERE id=v_content_id;
    END IF;
  END IF;

  UPDATE public.parental_approvals
     SET status='denied', decided_at=now(), decided_by=p_parent_id,
         details = COALESCE(details,'{}'::jsonb) || jsonb_build_object('rejection_reason', p_reason)
   WHERE id=p_approval_id;

  PERFORM public._approval_finalize(
    p_approval_id, p_parent_id, v_appr.teen_id,
    'denied', 'content', v_appr.resource_type, v_content_id, p_reason,
    jsonb_build_object('content_id', v_content_id)
  );

  RETURN jsonb_build_object('success', true, 'approval_id', p_approval_id, 'decision', 'denied');
END;
$$;

-- ----------------------------------------------------------------------------
-- C.5 parent_approve_session_v2 / parent_deny_session_v2
--
-- Wave 1C unifies the dispatch interface around (p_approval_id, p_parent_id).
-- The Wave 3 RPC parent_approve_session(p_session_id, p_parent_id) stays in
-- place for backwards compat. The v2 wrapper lets the cascade dispatcher use
-- a single shape across all five resource types. It looks up the session id
-- from the approval and delegates to the original RPC, then writes the
-- audit_log row (the original doesn't write to audit_log).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parent_approve_session_v2(
  p_approval_id uuid,
  p_parent_id   uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_appr     RECORD;
  v_session_id uuid;
  v_inner    jsonb;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  SELECT * INTO v_appr FROM public.parental_approvals WHERE id=p_approval_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_found'); END IF;
  IF v_appr.parent_id <> p_parent_id THEN RETURN jsonb_build_object('success', false, 'error', 'not_owner'); END IF;
  IF v_appr.status IN ('approved','denied') THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'decision', v_appr.status);
  END IF;
  IF v_appr.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_pending'); END IF;
  IF NOT public._parent_link_active(p_parent_id, v_appr.teen_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_linked_parent');
  END IF;
  IF v_appr.action_type <> 'coach_meeting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'wrong_action_type');
  END IF;

  v_session_id := v_appr.resource_id;

  -- Delegate to the existing RPC (it does the coin debit + status flips).
  v_inner := public.parent_approve_session(v_session_id, p_parent_id);

  IF NOT COALESCE((v_inner->>'success')::boolean, false) THEN
    RETURN v_inner;
  END IF;

  -- Audit row (the inner RPC doesn't write one).
  PERFORM public._approval_finalize(
    p_approval_id, p_parent_id, v_appr.teen_id,
    'approved', 'coach_meeting', 'mentor_session', v_session_id, NULL,
    v_inner
  );

  RETURN jsonb_build_object('success', true, 'approval_id', p_approval_id,
                            'session_id', v_session_id, 'decision', 'approved',
                            'inner', v_inner);
END;
$$;

CREATE OR REPLACE FUNCTION public.parent_deny_session_v2(
  p_approval_id uuid,
  p_parent_id   uuid,
  p_reason      text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_appr     RECORD;
  v_session_id uuid;
  v_inner    jsonb;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  SELECT * INTO v_appr FROM public.parental_approvals WHERE id=p_approval_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_found'); END IF;
  IF v_appr.parent_id <> p_parent_id THEN RETURN jsonb_build_object('success', false, 'error', 'not_owner'); END IF;
  IF v_appr.status IN ('approved','denied') THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'decision', v_appr.status);
  END IF;
  IF v_appr.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'approval_not_pending'); END IF;
  IF NOT public._parent_link_active(p_parent_id, v_appr.teen_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_linked_parent');
  END IF;

  v_session_id := v_appr.resource_id;

  v_inner := public.parent_deny_session(v_session_id, p_parent_id, p_reason);

  PERFORM public._approval_finalize(
    p_approval_id, p_parent_id, v_appr.teen_id,
    'denied', 'coach_meeting', 'mentor_session', v_session_id, p_reason,
    v_inner
  );

  RETURN jsonb_build_object('success', true, 'approval_id', p_approval_id,
                            'session_id', v_session_id, 'decision', 'denied',
                            'inner', v_inner);
END;
$$;

-- ----------------------------------------------------------------------------
-- Grants — service_role + authenticated. anon never.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  fn TEXT;
BEGIN
  FOR fn IN SELECT unnest(ARRAY[
    'parent_approve_ride(uuid, uuid)',
    'parent_deny_ride(uuid, uuid, text)',
    'parent_approve_food(uuid, uuid)',
    'parent_deny_food(uuid, uuid, text)',
    'parent_approve_purchase(uuid, uuid)',
    'parent_deny_purchase(uuid, uuid, text)',
    'parent_approve_content(uuid, uuid)',
    'parent_deny_content(uuid, uuid, text)',
    'parent_approve_session_v2(uuid, uuid)',
    'parent_deny_session_v2(uuid, uuid, text)'
  ])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role, authenticated', fn);
  END LOOP;
END$$;

-- ============================================================================
-- END migration 096_wave1c_parent_cascade.sql
-- ============================================================================
