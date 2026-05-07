-- Migration 057 RPCs — Transport / Mobility (dispatch_ride + cancel_ride)
-- Date: 2026-04 (live-applied via MCP); committed to repo 2026-05-07 per Wave B.6
-- Source: docs/vision/transport-mobility.md
--
-- request_ride is dumped in 060b (curfew-aware overload).
-- complete_ride is rewritten in 061 (Wave B: 100 coins/DH + escrow + cashback).

BEGIN;

CREATE OR REPLACE FUNCTION public.dispatch_ride(
  p_ride_id uuid,
  p_driver_id uuid,
  p_caller_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller UUID;
  v_driver public.nivy_drivers;
  v_ride public.ride_bookings;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  v_caller := COALESCE(p_caller_id, auth.uid());

  SELECT * INTO v_ride FROM public.ride_bookings WHERE id = p_ride_id;
  IF v_ride.id IS NULL THEN RAISE EXCEPTION 'ride_not_found'; END IF;

  SELECT * INTO v_driver FROM public.nivy_drivers WHERE id = p_driver_id;
  IF v_driver.id IS NULL THEN RAISE EXCEPTION 'driver_not_found'; END IF;

  IF v_driver.kyc_status <> 'approved' OR v_driver.is_active <> TRUE THEN
    RAISE EXCEPTION 'driver_not_kyc_approved';
  END IF;

  IF v_caller IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.admin_roles WHERE profile_id = v_caller) THEN
      v_is_admin := TRUE;
    END IF;
    IF NOT v_is_admin AND v_driver.user_id <> v_caller THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  IF v_ride.status <> 'approved' THEN
    RAISE EXCEPTION 'invalid_status:%', v_ride.status;
  END IF;

  UPDATE public.ride_bookings
    SET driver_id = p_driver_id,
        status = 'dispatched',
        dispatched_at = NOW()
    WHERE id = p_ride_id;

  BEGIN
    INSERT INTO public.user_notifications (user_id, title, body, priority, data, action_url)
    VALUES
      (v_ride.parent_id, 'Chauffeur en route',
       'Conducteur ' || v_driver.full_name || ' (' || COALESCE(v_driver.vehicle_plate,'?') || ') affecté',
       'high',
       jsonb_build_object('ride_id', p_ride_id, 'driver_id', p_driver_id, 'type', 'ride_dispatched'),
       '/parent/rides/' || p_ride_id::TEXT),
      (v_ride.teen_id, 'Chauffeur en route',
       'Votre chauffeur ' || v_driver.full_name || ' arrive',
       'high',
       jsonb_build_object('ride_id', p_ride_id, 'driver_id', p_driver_id, 'type', 'ride_dispatched'),
       '/teen/rides');
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object('success', TRUE, 'ride_id', p_ride_id, 'status', 'dispatched');
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_ride(
  p_ride_id uuid,
  p_reason text DEFAULT NULL::text,
  p_caller_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller UUID;
  v_ride public.ride_bookings;
  v_minutes_until INTEGER;
  v_refund_pct INTEGER;
BEGIN
  v_caller := COALESCE(p_caller_id, auth.uid());
  SELECT * INTO v_ride FROM public.ride_bookings WHERE id = p_ride_id;
  IF v_ride.id IS NULL THEN RAISE EXCEPTION 'ride_not_found'; END IF;

  IF v_caller IS NOT NULL AND v_ride.teen_id <> v_caller AND v_ride.parent_id <> v_caller THEN
    IF NOT EXISTS (SELECT 1 FROM public.parent_teen_links WHERE teen_id = v_ride.teen_id AND parent_id = v_caller) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  IF v_ride.status IN ('completed','cancelled','denied') THEN
    RAISE EXCEPTION 'invalid_status:%', v_ride.status;
  END IF;

  v_minutes_until := EXTRACT(EPOCH FROM (v_ride.scheduled_for - NOW())) / 60;
  IF v_minutes_until > 60 THEN v_refund_pct := 100; ELSE v_refund_pct := 50; END IF;

  UPDATE public.ride_bookings
    SET status = 'cancelled',
        cancellation_reason = p_reason,
        cancelled_at = NOW()
    WHERE id = p_ride_id;

  -- TODO Wave B follow-up: actual coin refund honoring v_refund_pct
  RETURN jsonb_build_object('success', TRUE, 'ride_id', p_ride_id, 'refund_pct', v_refund_pct);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.dispatch_ride(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_ride(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_ride(uuid, uuid, uuid) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_ride(uuid, text, uuid) TO service_role;

COMMIT;
