-- Migration 060c — A.8 Backfill orphan ride coin_transactions row
-- Date: 2026-05-07
-- Source: docs/vision/audit-prelaunch/03-money-pipeline.md
--
-- One-time data repair. The pre-Wave-A `complete_ride` RPC violated whitepaper
-- §29 (no escrow_ledger pair, no cashback XP, wrong coin/DH rate). One row
-- got through to production before the audit caught it; this migration pairs
-- the spend with an escrow_ledger row and credits the missed cashback XP.
--
-- The full rewrite of `complete_ride` happens in Wave B.

INSERT INTO public.escrow_ledger (
  parent_id, teen_id, direction, amount_dh, amount_coins,
  related_spend_id, reason, created_by, created_at
)
SELECT
  (SELECT primary_parent_id FROM public.teen_full_profile WHERE id = ct.teen_id),
  ct.teen_id,
  'spend',
  ABS(ct.amount)::numeric / 100,
  ABS(ct.amount),
  ct.id,
  'BACKFILL Wave-A.8: orphan ride spend pre-rewrite of complete_ride (audit 03)',
  '69a068cd-df5b-4165-98b8-33fb93e41117'::uuid,  -- canonical admin profile id
  ct.created_at
FROM public.coin_transactions ct
WHERE ct.id = '141b3cfb-f67e-4970-9850-3e0e79f2913d'
  AND NOT EXISTS (
    SELECT 1 FROM public.escrow_ledger e WHERE e.related_spend_id = ct.id
  );

-- Credit the missed 10% cashback XP (whitepaper §29 #3)
SELECT public.add_xp_to_user(
  p_teen_id := '37ff4a09-25ca-44c2-a313-141ab6d7e1b9'::uuid,
  p_xp_amount := 5,
  p_source_type := 'cashback',
  p_source_category := 'ride',
  p_source_id := '141b3cfb-f67e-4970-9850-3e0e79f2913d'::uuid,
  p_description := 'BACKFILL Wave-A.8: missed cashback on orphan ride spend'
);

INSERT INTO public.admin_audit_logs (user_id, action, target_type, target_id, payload)
VALUES (
  '69a068cd-df5b-4165-98b8-33fb93e41117'::uuid,
  'wave_a.backfill_orphan_ride',
  'coin_transactions',
  '141b3cfb-f67e-4970-9850-3e0e79f2913d',
  jsonb_build_object(
    'reason', 'orphan ride spend missing escrow_ledger pair + cashback XP',
    'repair', 'inserted escrow_ledger spend 48 coins / 0.48 DH + add_xp_to_user 5 XP cashback',
    'audit_ref', 'docs/vision/audit-prelaunch/03-money-pipeline.md',
    'wave', 'A.8'
  )
);
