-- 186_anniv_orders_lifecycle_columns.sql
-- ---------------------------------------------------------------------------
-- #360 / #359 — Réparer le cycle de vie des commandes anniversaire.
--
-- La table live `anniv_orders` est un stub (id, parent_id, teen_id, pack_id,
-- party_date, guest_count, total_dh, status, notes, created_at). Or DEUX
-- surfaces écrivent des colonnes de cycle de vie / paiement qui n'existent
-- pas :
--   - features/anniversaires/actions.ts : cancelAnnivOrder (cancelled_reason,
--     cancelled_at), updateAnnivPaymentStatus (payment_status, deposit_amount,
--     confirmed_at) ;
--   - app/api/admin/anniversaires/[id]/route.ts (PATCH admin) : confirmed_at,
--     confirmed_by, cancelled_at, cancelled_by, completed_at, payment_status,
--     paid_at, deposit_amount.
-- Ces UPDATE échouaient TOUJOURS au runtime (42703) — non capté par tsc car
-- l'`.update()` de supabase-js est permissif sur les colonnes en trop.
-- L'annulation, la confirmation et le suivi de paiement d'un anniversaire
-- étaient donc cassés côté ado (features) ET côté admin.
--
-- On matérialise le superset des colonnes attendues (additif, idempotent).
-- ---------------------------------------------------------------------------

ALTER TABLE public.anniv_orders
  ADD COLUMN IF NOT EXISTS confirmed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by       uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at       timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by       uuid,
  ADD COLUMN IF NOT EXISTS cancelled_reason   text,
  ADD COLUMN IF NOT EXISTS completed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS payment_status     text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at            timestamptz,
  ADD COLUMN IF NOT EXISTS deposit_amount     numeric(10,2);

COMMENT ON COLUMN public.anniv_orders.payment_status IS
  'pending | partial | paid | refunded — statut de paiement (écrit par updateAnnivPaymentStatus / PATCH admin).';
COMMENT ON COLUMN public.anniv_orders.deposit_amount IS 'Acompte versé en DH.';
