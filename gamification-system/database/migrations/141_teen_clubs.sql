-- 141_teen_clubs.sql
-- ---------------------------------------------------------------------------
-- #239 (V6, P2) — Clubs auto-organisés par l'ado + cotisation + sessions.
--   teen_clubs / club_members / club_sessions.
--   create_teen_club, join_teen_club (cotisation = spend_teen_coins solo,
--   « chacun paie sa part »), add_club_session (owner).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.teen_clubs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text,
  owner_id        uuid NOT NULL,
  cotisation_coins integer NOT NULL DEFAULT 0 CHECK (cotisation_coins >= 0),
  max_members     integer CHECK (max_members IS NULL OR max_members > 0),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teen_clubs_owner ON public.teen_clubs(owner_id);

CREATE TABLE IF NOT EXISTS public.club_members (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id   uuid NOT NULL REFERENCES public.teen_clubs(id) ON DELETE CASCADE,
  teen_id   uuid NOT NULL,
  role      text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  status    text NOT NULL DEFAULT 'active' CHECK (status IN ('active','left')),
  cotisation_paid integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, teen_id)
);
CREATE INDEX IF NOT EXISTS idx_club_members_club ON public.club_members(club_id, status);

CREATE TABLE IF NOT EXISTS public.club_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    uuid NOT NULL REFERENCES public.teen_clubs(id) ON DELETE CASCADE,
  title      text NOT NULL,
  starts_at  timestamptz,
  location   text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_sessions_club ON public.club_sessions(club_id, starts_at);

ALTER TABLE public.teen_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teen_clubs_read ON public.teen_clubs;
CREATE POLICY teen_clubs_read ON public.teen_clubs FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS club_members_read ON public.club_members;
CREATE POLICY club_members_read ON public.club_members FOR SELECT
  USING (teen_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.teen_clubs c WHERE c.id = club_members.club_id AND c.owner_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS club_sessions_read ON public.club_sessions;
CREATE POLICY club_sessions_read ON public.club_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.club_members m
                 WHERE m.club_id = club_sessions.club_id AND m.teen_id = (SELECT auth.uid()) AND m.status = 'active'));

CREATE OR REPLACE FUNCTION public.create_teen_club(
  p_name text, p_description text DEFAULT NULL, p_cotisation_coins integer DEFAULT 0, p_max_members integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE v_caller uuid := auth.uid(); v_club uuid;
BEGIN
  IF v_caller IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM teens WHERE id = v_caller) THEN RETURN jsonb_build_object('success', false, 'error', 'owner_not_teen'); END IF;
  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'name_required'); END IF;
  INSERT INTO teen_clubs (name, description, owner_id, cotisation_coins, max_members)
  VALUES (p_name, p_description, v_caller, GREATEST(COALESCE(p_cotisation_coins,0),0), p_max_members)
  RETURNING id INTO v_club;
  INSERT INTO club_members (club_id, teen_id, role, status) VALUES (v_club, v_caller, 'owner', 'active');
  RETURN jsonb_build_object('success', true, 'club_id', v_club);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;
$function$;

CREATE OR REPLACE FUNCTION public.join_teen_club(p_club_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE v_caller uuid := auth.uid(); v_club teen_clubs%ROWTYPE; v_count integer; v_spend jsonb; v_paid integer := 0;
BEGIN
  IF v_caller IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO v_club FROM teen_clubs WHERE id = p_club_id FOR UPDATE;
  IF NOT FOUND OR v_club.is_active IS NOT TRUE THEN RETURN jsonb_build_object('success', false, 'error', 'club_unavailable'); END IF;
  IF EXISTS (SELECT 1 FROM club_members WHERE club_id = p_club_id AND teen_id = v_caller AND status = 'active') THEN
    RETURN jsonb_build_object('success', true, 'already_member', true);
  END IF;
  IF v_club.max_members IS NOT NULL THEN
    SELECT count(*) INTO v_count FROM club_members WHERE club_id = p_club_id AND status = 'active';
    IF v_count >= v_club.max_members THEN RETURN jsonb_build_object('success', false, 'error', 'club_full'); END IF;
  END IF;
  -- Cotisation : chacun paie sa part (débit solo sur SON wallet).
  IF v_club.cotisation_coins > 0 THEN
    v_spend := public.spend_teen_coins(v_caller, v_club.cotisation_coins, NULL, NULL, NULL);
    IF (v_spend->>'success')::boolean IS NOT TRUE THEN RETURN v_spend; END IF;
    v_paid := v_club.cotisation_coins;
  END IF;
  INSERT INTO club_members (club_id, teen_id, role, status, cotisation_paid)
  VALUES (p_club_id, v_caller, 'member', 'active', v_paid)
  ON CONFLICT (club_id, teen_id) DO UPDATE SET status = 'active', cotisation_paid = EXCLUDED.cotisation_paid;
  RETURN jsonb_build_object('success', true, 'cotisation_paid', v_paid);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;
$function$;

CREATE OR REPLACE FUNCTION public.add_club_session(p_club_id uuid, p_title text, p_starts_at timestamptz DEFAULT NULL, p_location text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE v_caller uuid := auth.uid(); v_session uuid;
BEGIN
  IF v_caller IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM teen_clubs WHERE id = p_club_id AND owner_id = v_caller) THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_club_owner');
  END IF;
  INSERT INTO club_sessions (club_id, title, starts_at, location, created_by)
  VALUES (p_club_id, p_title, p_starts_at, p_location, v_caller) RETURNING id INTO v_session;
  RETURN jsonb_build_object('success', true, 'session_id', v_session);
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM); END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_teen_club(text, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_teen_club(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_club_session(uuid, text, timestamptz, text) TO authenticated, service_role;
COMMENT ON TABLE public.teen_clubs IS '#239: clubs auto-organisés par l''ado (cotisation = chacun paie sa part).';
