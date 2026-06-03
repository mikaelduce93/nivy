-- 131_group_actions_primitive.sql
-- ---------------------------------------------------------------------------
-- #227 (V6 socle, P0) — Primitive transverse « action de groupe ».
--
-- UN seul schéma organisateur+membres+invitations, réutilisé par tous les
-- services (ride, food, event, venue, club, anniv, achat partenaire) au lieu
-- de recoder l'invitation/RSVP 5 fois. L'organisateur est temporel (par action,
-- ≠ owner d'un crew) : tout ado peut organiser.
--
--   group_actions          : organizer_id + action_type + resource_id (polymorphe)
--                            + status (draft/forming/confirmed/completed/cancelled)
--                            + deadline RSVP + max_size + total_coins
--   group_action_invites   : 1 ligne par participant (l'organisateur inclus,
--                            status='accepted' d'office) + share_coins +
--                            parent_approval_id par membre (patron ride_group_members)
--
-- RPCs : create_group_action (organisateur), respond_to_group_invite (invité).
-- RLS  : organisateur = full read ; participant = read ; parent lié = read.
--        Écritures via RPC SECURITY DEFINER uniquement (default-deny direct).
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. Tables
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.group_actions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id  uuid NOT NULL,                       -- teens.id (= auth.uid())
  action_type   text NOT NULL CHECK (action_type IN (
                  'ride','food','event','venue_booking','club','anniv',
                  'partner_purchase','generic')),
  resource_id   uuid,                                -- ref polymorphe (NULL avant finalize)
  title         text,
  status        text NOT NULL DEFAULT 'forming' CHECK (status IN (
                  'draft','forming','confirmed','completed','cancelled')),
  max_size      integer CHECK (max_size IS NULL OR max_size > 0),
  total_coins   integer NOT NULL DEFAULT 0 CHECK (total_coins >= 0),
  deadline      timestamptz,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_actions_organizer ON public.group_actions(organizer_id);
CREATE INDEX IF NOT EXISTS idx_group_actions_type_status ON public.group_actions(action_type, status);
CREATE INDEX IF NOT EXISTS idx_group_actions_resource ON public.group_actions(resource_id);

CREATE TABLE IF NOT EXISTS public.group_action_invites (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_action_id  uuid NOT NULL REFERENCES public.group_actions(id) ON DELETE CASCADE,
  teen_id          uuid NOT NULL,                    -- invité (teens.id)
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN (
                     'pending','accepted','declined','expired')),
  is_organizer     boolean NOT NULL DEFAULT false,
  share_coins      integer CHECK (share_coins IS NULL OR share_coins >= 0),
  parent_approval_id uuid,                            -- opposition parentale par membre (#230)
  responded_at     timestamptz,
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_action_id, teen_id)
);

CREATE INDEX IF NOT EXISTS idx_group_invites_action ON public.group_action_invites(group_action_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_teen ON public.group_action_invites(teen_id, status);

-- ===========================================================================
-- 2. RLS
-- ===========================================================================
ALTER TABLE public.group_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_action_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS group_actions_read ON public.group_actions;
CREATE POLICY group_actions_read ON public.group_actions FOR SELECT
  USING (
    organizer_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.group_action_invites i
               WHERE i.group_action_id = group_actions.id
                 AND i.teen_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM public.parent_teen_links l
               WHERE l.parent_id = (SELECT auth.uid())
                 AND l.teen_id = group_actions.organizer_id)
  );

DROP POLICY IF EXISTS group_action_invites_read ON public.group_action_invites;
CREATE POLICY group_action_invites_read ON public.group_action_invites FOR SELECT
  USING (
    teen_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.group_actions ga
               WHERE ga.id = group_action_invites.group_action_id
                 AND ga.organizer_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM public.parent_teen_links l
               WHERE l.parent_id = (SELECT auth.uid())
                 AND l.teen_id = group_action_invites.teen_id)
  );

-- ===========================================================================
-- 3. RPC create_group_action — l'organisateur crée + invite
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.create_group_action(
  p_action_type text,
  p_resource_id uuid DEFAULT NULL,
  p_invitee_ids uuid[] DEFAULT '{}',
  p_title text DEFAULT NULL,
  p_max_size integer DEFAULT NULL,
  p_deadline timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller   uuid := auth.uid();
  v_group_id uuid;
  v_invitee  uuid;
  v_invited  integer := 0;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM teens WHERE id = v_caller) THEN
    RETURN jsonb_build_object('success', false, 'error', 'organizer_not_teen');
  END IF;
  IF p_action_type NOT IN ('ride','food','event','venue_booking','club','anniv','partner_purchase','generic') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_action_type');
  END IF;

  INSERT INTO group_actions (organizer_id, action_type, resource_id, title, max_size, deadline)
  VALUES (v_caller, p_action_type, p_resource_id, p_title, p_max_size, p_deadline)
  RETURNING id INTO v_group_id;

  -- L'organisateur est membre d'office (accepted).
  INSERT INTO group_action_invites (group_action_id, teen_id, status, is_organizer, responded_at)
  VALUES (v_group_id, v_caller, 'accepted', true, now());

  -- Invitations (dédupliquées, jamais l'organisateur, uniquement des teens réels).
  FOREACH v_invitee IN ARRAY COALESCE(p_invitee_ids, '{}')
  LOOP
    CONTINUE WHEN v_invitee = v_caller;
    CONTINUE WHEN NOT EXISTS (SELECT 1 FROM teens WHERE id = v_invitee);

    INSERT INTO group_action_invites (group_action_id, teen_id, status)
    VALUES (v_group_id, v_invitee, 'pending')
    ON CONFLICT (group_action_id, teen_id) DO NOTHING;

    IF FOUND THEN
      v_invited := v_invited + 1;
      INSERT INTO user_notifications (user_id, title, body, data, action_url, priority, emoji)
      VALUES (
        v_invitee,
        'Invitation de groupe',
        COALESCE(p_title, 'Un ami t''invite à rejoindre une action de groupe'),
        jsonb_build_object('group_action_id', v_group_id, 'action_type', p_action_type),
        '/teen/groups/' || v_group_id::text,
        'normal',
        '👥'
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'group_action_id', v_group_id,
    'invited_count', v_invited,
    'status', 'forming'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ===========================================================================
-- 4. RPC respond_to_group_invite — l'invité accepte / décline
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.respond_to_group_invite(
  p_group_action_id uuid,
  p_response text                                    -- 'accept' | 'decline'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller    uuid := auth.uid();
  v_invite    group_action_invites%ROWTYPE;
  v_new_status text;
  v_organizer uuid;
  v_max       integer;
  v_accepted  integer;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;
  IF p_response NOT IN ('accept','decline') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_response');
  END IF;

  SELECT * INTO v_invite FROM group_action_invites
   WHERE group_action_id = p_group_action_id AND teen_id = v_caller
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invite_not_found');
  END IF;
  IF v_invite.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_responded', 'status', v_invite.status);
  END IF;
  IF v_invite.expires_at <= now() THEN
    UPDATE group_action_invites SET status = 'expired' WHERE id = v_invite.id;
    RETURN jsonb_build_object('success', false, 'error', 'invite_expired');
  END IF;

  v_new_status := CASE WHEN p_response = 'accept' THEN 'accepted' ELSE 'declined' END;

  -- Garde la taille max (organisateur + acceptés).
  IF v_new_status = 'accepted' THEN
    SELECT organizer_id, max_size INTO v_organizer, v_max FROM group_actions WHERE id = p_group_action_id;
    IF v_max IS NOT NULL THEN
      SELECT count(*) INTO v_accepted FROM group_action_invites
       WHERE group_action_id = p_group_action_id AND status = 'accepted';
      IF v_accepted >= v_max THEN
        RETURN jsonb_build_object('success', false, 'error', 'group_full');
      END IF;
    END IF;
  ELSE
    SELECT organizer_id INTO v_organizer FROM group_actions WHERE id = p_group_action_id;
  END IF;

  UPDATE group_action_invites
     SET status = v_new_status, responded_at = now()
   WHERE id = v_invite.id;

  -- Notifie l'organisateur.
  INSERT INTO user_notifications (user_id, title, body, data, action_url, priority, emoji)
  VALUES (
    v_organizer,
    CASE WHEN v_new_status = 'accepted' THEN 'Invitation acceptée' ELSE 'Invitation déclinée' END,
    'Un ami a répondu à ton action de groupe.',
    jsonb_build_object('group_action_id', p_group_action_id, 'responder', v_caller, 'response', v_new_status),
    '/teen/groups/' || p_group_action_id::text,
    'normal',
    CASE WHEN v_new_status = 'accepted' THEN '✅' ELSE '❌' END
  );

  RETURN jsonb_build_object('success', true, 'status', v_new_status);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group_action(text, uuid, uuid[], text, integer, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_group_invite(uuid, text) TO authenticated, service_role;

COMMENT ON TABLE public.group_actions IS '#227: primitive transverse organisateur+membres, réutilisée par tous les services collectifs.';
COMMENT ON TABLE public.group_action_invites IS '#227: roster d''une action de groupe (organisateur=is_organizer). parent_approval_id = opposition par membre.';
