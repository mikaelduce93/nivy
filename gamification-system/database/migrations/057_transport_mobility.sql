-- Migration 057 — Transport / Mobility schema
-- Date: 2026-04 (live-applied via MCP); committed to repo 2026-05-07 per Wave B.6
-- Source: docs/vision/transport-mobility.md
--
-- Reproducibility: this dump captures the current live shape so a fresh
-- `db reset` reproduces production. Companion file 057_transport_mobility_rpcs.sql
-- carries the dispatch_ride + cancel_ride RPCs. request_ride is in 060b
-- (curfew-aware version). complete_ride is in 061 (Wave B rewrite).

BEGIN;

CREATE TABLE IF NOT EXISTS public.nivy_drivers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  vehicle_make text,
  vehicle_model text,
  vehicle_plate text,
  kyc_status text NOT NULL DEFAULT 'pending'
    CHECK (kyc_status IN ('pending','approved','rejected','suspended')),
  kyc_documents_url text,
  is_active boolean NOT NULL DEFAULT false,
  rating numeric(3,2),
  service_cities text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.ride_bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teen_id uuid NOT NULL,
  parent_id uuid NOT NULL,
  event_id uuid,
  pickup_address text NOT NULL,
  pickup_lat numeric(10,7),
  pickup_lng numeric(10,7),
  dropoff_address text NOT NULL,
  dropoff_lat numeric(10,7),
  dropoff_lng numeric(10,7),
  scheduled_for timestamptz NOT NULL,
  return_scheduled_for timestamptz,
  group_size integer NOT NULL DEFAULT 1,
  group_leader_id uuid,
  group_id uuid,
  provider text NOT NULL DEFAULT 'nivy_partner'
    CHECK (provider IN ('nivy_partner','careem','heetch','public_transport')),
  external_booking_ref text,
  estimated_dh numeric(10,2),
  actual_dh numeric(10,2),
  payment_method text NOT NULL DEFAULT 'coins'
    CHECK (payment_method IN ('coins','dh','split_with_parent')),
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','approved','denied','dispatched','in_progress','completed','cancelled')),
  parent_approval_id uuid,
  driver_id uuid REFERENCES public.nivy_drivers(id) ON DELETE SET NULL,
  cancellation_reason text,
  rating_by_teen integer CHECK (rating_by_teen BETWEEN 1 AND 5),
  rating_by_driver integer CHECK (rating_by_driver BETWEEN 1 AND 5),
  curfew_override boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  dispatched_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.ride_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_id uuid NOT NULL,
  event_id uuid,
  scheduled_for timestamptz NOT NULL,
  pickup_address text,
  dropoff_address text,
  max_seats integer NOT NULL DEFAULT 4,
  seats_taken integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'forming'
    CHECK (status IN ('forming','full','dispatched','completed','cancelled')),
  ride_id uuid REFERENCES public.ride_bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ride_group_members (
  group_id uuid NOT NULL REFERENCES public.ride_groups(id) ON DELETE CASCADE,
  teen_id uuid NOT NULL,
  parent_approval_id uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, teen_id)
);

CREATE TABLE IF NOT EXISTS public.ride_tracks (
  id bigserial PRIMARY KEY,
  ride_id uuid NOT NULL REFERENCES public.ride_bookings(id) ON DELETE CASCADE,
  lat numeric(10,7) NOT NULL,
  lng numeric(10,7) NOT NULL,
  speed numeric,
  heading numeric,
  captured_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes (hot paths)
CREATE INDEX IF NOT EXISTS idx_ride_bookings_teen ON public.ride_bookings (teen_id, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_parent ON public.ride_bookings (parent_id, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_status ON public.ride_bookings (status) WHERE status IN ('requested','approved','dispatched');
CREATE INDEX IF NOT EXISTS idx_ride_tracks_ride ON public.ride_tracks (ride_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_nivy_drivers_user_id ON public.nivy_drivers (user_id);

-- RLS
ALTER TABLE public.nivy_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nivy_drivers_self_read ON public.nivy_drivers;
CREATE POLICY nivy_drivers_self_read ON public.nivy_drivers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_active = true);

DROP POLICY IF EXISTS ride_bookings_self_or_parent ON public.ride_bookings;
CREATE POLICY ride_bookings_self_or_parent ON public.ride_bookings FOR SELECT TO authenticated
  USING (teen_id = auth.uid() OR parent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.parent_teen_links pl WHERE pl.teen_id = ride_bookings.teen_id AND pl.parent_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.nivy_drivers d WHERE d.id = ride_bookings.driver_id AND d.user_id = auth.uid()));

DROP POLICY IF EXISTS ride_tracks_party_read ON public.ride_tracks;
CREATE POLICY ride_tracks_party_read ON public.ride_tracks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ride_bookings rb
    WHERE rb.id = ride_tracks.ride_id
      AND (rb.teen_id = auth.uid() OR rb.parent_id = auth.uid()
           OR EXISTS (SELECT 1 FROM public.nivy_drivers d WHERE d.id = rb.driver_id AND d.user_id = auth.uid()))
  ));

COMMIT;
