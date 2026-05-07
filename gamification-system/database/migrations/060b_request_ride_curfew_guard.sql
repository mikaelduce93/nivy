-- Migration 060b — A.6 request_ride curfew defense-in-depth
-- Date: 2026-05-07
-- Source: docs/vision/audit-prelaunch/PRE_LAUNCH_AUDIT.md (Wave A.6)
--
-- Whitepaper §29.2 + transport-mobility.md: rides scheduled past 22:00 local
-- (Africa/Casablanca) must carry an explicit curfew_override flag granted by
-- the parent. The daily curfew cron is a backstop; this RPC blocks at request
-- time. We also drop the old 13-arg signature so all callers are forced
-- through the curfew-aware path.

DROP FUNCTION IF EXISTS public.request_ride(
  uuid, text, text, timestamptz, uuid, text, text, numeric, numeric, numeric, numeric, numeric, uuid
);

CREATE OR REPLACE FUNCTION public.request_ride(
  p_teen_id uuid,
  p_pickup_address text,
  p_dropoff_address text,
  p_scheduled_for timestamp with time zone,
  p_event_id uuid DEFAULT NULL::uuid,
  p_provider text DEFAULT 'nivy_partner'::text,
  p_payment_method text DEFAULT 'coins'::text,
  p_pickup_lat numeric DEFAULT NULL::numeric,
  p_pickup_lng numeric DEFAULT NULL::numeric,
  p_dropoff_lat numeric DEFAULT NULL::numeric,
  p_dropoff_lng numeric DEFAULT NULL::numeric,
  p_estimated_dh numeric DEFAULT NULL::numeric,
  p_caller_id uuid DEFAULT NULL::uuid,
  p_curfew_override boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller UUID;
  v_parent_id UUID;
  v_is_parent BOOLEAN := FALSE;
  v_ride_id UUID;
  v_approval_id UUID;
  v_parents UUID[];
  v_p UUID;
  v_local_hour INTEGER;
BEGIN
  v_caller := COALESCE(p_caller_id, auth.uid());
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  v_local_hour := EXTRACT(HOUR FROM (p_scheduled_for AT TIME ZONE 'Africa/Casablanca'))::INT;
  IF v_local_hour >= 22 OR v_local_hour < 5 THEN
    IF NOT p_curfew_override THEN
      RAISE EXCEPTION 'curfew_violation' USING HINT = 'rides between 22:00 and 05:00 local require parental curfew_override';
    END IF;
  END IF;

  SELECT parent_id INTO v_parent_id FROM public.teens WHERE id = p_teen_id;
  IF v_parent_id IS NULL THEN
    SELECT parent_id INTO v_parent_id
      FROM public.parent_teen_links
      WHERE teen_id = p_teen_id
      ORDER BY created_at ASC
      LIMIT 1;
  END IF;
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'no_parent_linked';
  END IF;

  IF v_caller = p_teen_id THEN
    NULL;
  ELSIF v_caller = v_parent_id THEN
    v_is_parent := TRUE;
  ELSIF EXISTS (
    SELECT 1 FROM public.parent_teen_links
    WHERE teen_id = p_teen_id AND parent_id = v_caller
  ) THEN
    v_is_parent := TRUE;
  ELSE
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_curfew_override AND NOT v_is_parent THEN
    RAISE EXCEPTION 'curfew_override_requires_parent';
  END IF;

  INSERT INTO public.ride_bookings (
    teen_id, parent_id, event_id,
    pickup_address, pickup_lat, pickup_lng,
    dropoff_address, dropoff_lat, dropoff_lng,
    scheduled_for, provider, payment_method,
    estimated_dh, status, curfew_override
  ) VALUES (
    p_teen_id, v_parent_id, p_event_id,
    p_pickup_address, p_pickup_lat, p_pickup_lng,
    p_dropoff_address, p_dropoff_lat, p_dropoff_lng,
    p_scheduled_for, p_provider, p_payment_method,
    p_estimated_dh, 'requested', COALESCE(p_curfew_override, false)
  ) RETURNING id INTO v_ride_id;

  INSERT INTO public.parental_approvals (
    parent_id, teen_id, action_type, resource_type, resource_id, amount, details, status
  ) VALUES (
    v_parent_id, p_teen_id, 'booking', 'ride', v_ride_id,
    COALESCE(p_estimated_dh, 0),
    jsonb_build_object(
      'ride_id', v_ride_id,
      'pickup', p_pickup_address,
      'dropoff', p_dropoff_address,
      'scheduled_for', p_scheduled_for,
      'event_id', p_event_id,
      'provider', p_provider,
      'payment_method', p_payment_method,
      'curfew_override', COALESCE(p_curfew_override, false)
    ),
    'pending'
  ) RETURNING id INTO v_approval_id;

  UPDATE public.ride_bookings SET parent_approval_id = v_approval_id WHERE id = v_ride_id;

  SELECT ARRAY(
    SELECT DISTINCT parent_id FROM (
      SELECT v_parent_id AS parent_id
      UNION
      SELECT parent_id FROM public.parent_teen_links WHERE teen_id = p_teen_id
    ) p WHERE parent_id IS NOT NULL
  ) INTO v_parents;

  FOREACH v_p IN ARRAY v_parents LOOP
    BEGIN
      INSERT INTO public.user_notifications (
        user_id, title, body, priority, data, action_url
      ) VALUES (
        v_p,
        'Demande de transport',
        'Votre ado demande un trajet pour ' || p_pickup_address || ' → ' || p_dropoff_address,
        'high',
        jsonb_build_object('ride_id', v_ride_id, 'approval_id', v_approval_id, 'type', 'ride_request'),
        '/parent/rides/' || v_ride_id::TEXT
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', TRUE,
    'ride_id', v_ride_id,
    'parent_approval_id', v_approval_id,
    'status', 'requested'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.request_ride(uuid, text, text, timestamptz, uuid, text, text, numeric, numeric, numeric, numeric, numeric, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_ride(uuid, text, text, timestamptz, uuid, text, text, numeric, numeric, numeric, numeric, numeric, uuid, boolean) TO service_role, authenticated;
