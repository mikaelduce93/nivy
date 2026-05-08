-- ============================================================================
-- Migration 097 — Wave 2A — Social Safety + Feed Truth
-- ============================================================================
-- Source of truth:
--   docs/canon/social-feed.locked.md §1 (feed cursor + user-state)
--   docs/canon/social-feed.locked.md §2 (comments depth 2, length 500)
--   docs/canon/social-feed.locked.md §3 (friend requests 7 days, mutual block)
--   docs/canon/social-feed.locked.md §4 (DM realtime, block enforcement, DM attachments)
--   docs/canon/social-feed.locked.md §7 (canonical report sink = user_reports)
--   docs/canon/INDEX.locked.md cross-cutting #5 (user_notifications, no `notifications`)
--
-- Goals:
--   A. Tighten user_reports schema (CHECK constraints + idempotency unique).
--   B. Auto-moderation trigger: 3+ reports on same target → moderation_queue.
--   C. blocked_users mutual block helper RPCs + indexes.
--   D. friend_requests 7-day expiry default (canon §3) + cron-style purge RPC.
--   E. DM safety: attachment columns + private bucket + storage RLS.
--   F. Feed cursor RPC: get_feed_cursor_page (featured DESC, created_at DESC, id DESC) page=20.
--   G. feed_comments: depth normalization helper + 500 char check.
--   H. user_reports RLS: reporter SELECT own; admin SELECT all; INSERT auth users.
-- ============================================================================

-- ============================================================================
-- A. user_reports — tighten schema
-- ============================================================================
DO $$
BEGIN
  -- Enforce target_type whitelist (idempotent re-creation).
  IF EXISTS (SELECT 1 FROM information_schema.check_constraints
             WHERE constraint_name='user_reports_target_type_check') THEN
    ALTER TABLE public.user_reports DROP CONSTRAINT user_reports_target_type_check;
  END IF;
  ALTER TABLE public.user_reports
    ADD CONSTRAINT user_reports_target_type_check
    CHECK (target_type IN (
      'feed_post','feed_comment','direct_message','circle_message',
      'marketplace_listing','user_profile','partner_offer'
    ));

  -- Enforce reason whitelist.
  IF EXISTS (SELECT 1 FROM information_schema.check_constraints
             WHERE constraint_name='user_reports_reason_check') THEN
    ALTER TABLE public.user_reports DROP CONSTRAINT user_reports_reason_check;
  END IF;
  ALTER TABLE public.user_reports
    ADD CONSTRAINT user_reports_reason_check
    CHECK (reason IN (
      'spam','harassment','sexual_content','violence','self_harm',
      'underage','impersonation','illegal','inappropriate','hate_speech',
      'personal_info','other'
    ));

  -- Enforce status whitelist (live default is 'open').
  IF EXISTS (SELECT 1 FROM information_schema.check_constraints
             WHERE constraint_name='user_reports_status_check') THEN
    ALTER TABLE public.user_reports DROP CONSTRAINT user_reports_status_check;
  END IF;
  ALTER TABLE public.user_reports
    ADD CONSTRAINT user_reports_status_check
    CHECK (status IN ('open','pending','reviewed','dismissed','actioned','resolved'));

  -- Idempotency: one report per (reporter, target) pair.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='user_reports_unique_reporter_target'
  ) THEN
    -- Drop dupes first if any exist (keep oldest).
    DELETE FROM public.user_reports a USING public.user_reports b
      WHERE a.id > b.id
        AND a.reporter_user_id = b.reporter_user_id
        AND a.target_type = b.target_type
        AND a.target_id = b.target_id;
    ALTER TABLE public.user_reports
      ADD CONSTRAINT user_reports_unique_reporter_target
      UNIQUE (reporter_user_id, target_type, target_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_reports_target
  ON public.user_reports(target_type, target_id, status);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter
  ON public.user_reports(reporter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_open_status
  ON public.user_reports(target_type, target_id) WHERE status IN ('open','pending');

-- RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_reports_insert_self ON public.user_reports;
CREATE POLICY user_reports_insert_self ON public.user_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS user_reports_select_own ON public.user_reports;
CREATE POLICY user_reports_select_own ON public.user_reports
  FOR SELECT TO authenticated
  USING (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS user_reports_admin_select ON public.user_reports;
CREATE POLICY user_reports_admin_select ON public.user_reports
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS user_reports_admin_update ON public.user_reports;
CREATE POLICY user_reports_admin_update ON public.user_reports
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============================================================================
-- B. Auto-moderation trigger: ≥3 open reports on same target → enqueue
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_reports_auto_moderation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  v_already_queued BOOLEAN;
BEGIN
  -- Only on INSERT or status flip back to open/pending.
  SELECT COUNT(*) INTO v_count
    FROM public.user_reports
    WHERE target_type = NEW.target_type
      AND target_id = NEW.target_id
      AND status IN ('open','pending');

  IF v_count >= 3 THEN
    -- Enqueue once per target if moderation_queue exists.
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name='moderation_queue') THEN
      SELECT EXISTS (
        SELECT 1 FROM public.moderation_queue
          WHERE content_type = NEW.target_type
            AND content_id = NEW.target_id
            AND status = 'pending'
      ) INTO v_already_queued;

      IF NOT v_already_queued THEN
        INSERT INTO public.moderation_queue (
          content_type, content_id, status, reason, payload
        ) VALUES (
          NEW.target_type, NEW.target_id, 'pending',
          'auto_threshold_3_reports',
          jsonb_build_object('report_count', v_count, 'last_reporter', NEW.reporter_user_id)
        );
      END IF;
    END IF;

    -- Always audit_log the threshold trip.
    INSERT INTO public.audit_log (
      actor_id, actor_role, action, resource_type, resource_id, metadata
    ) VALUES (
      NEW.reporter_user_id, 'system', 'auto_moderation_threshold',
      NEW.target_type, NEW.target_id::text,
      jsonb_build_object('report_count', v_count)
    );

    -- Auto-hide for feed_post / feed_comment / circle_message.
    IF NEW.target_type = 'feed_post' THEN
      UPDATE public.feed_posts SET is_hidden = true WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'feed_comment' THEN
      UPDATE public.feed_comments SET is_hidden = true WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'circle_message' THEN
      UPDATE public.circle_messages SET is_deleted = true WHERE id = NEW.target_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_reports_auto_moderation_trg ON public.user_reports;
CREATE TRIGGER user_reports_auto_moderation_trg
  AFTER INSERT ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.user_reports_auto_moderation();

-- ============================================================================
-- C. blocked_users — indexes + mutual-block helper
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker
  ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked
  ON public.blocked_users(blocked_id);

-- Self-block guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='blocked_users_no_self'
  ) THEN
    ALTER TABLE public.blocked_users
      ADD CONSTRAINT blocked_users_no_self
      CHECK (blocker_id != blocked_id);
  END IF;
END $$;

-- RLS
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS blocked_users_self ON public.blocked_users;
CREATE POLICY blocked_users_self ON public.blocked_users
  FOR ALL TO authenticated
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS blocked_users_admin_select ON public.blocked_users;
CREATE POLICY blocked_users_admin_select ON public.blocked_users
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- is_blocked: returns true if either party blocks the other.
CREATE OR REPLACE FUNCTION public.is_blocked_either(p_a UUID, p_b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = p_a AND blocked_id = p_b)
         OR (blocker_id = p_b AND blocked_id = p_a)
  );
$$;

-- block_user: idempotent block; clears pending requests + active friendship.
CREATE OR REPLACE FUNCTION public.block_user_v2(
  p_blocker UUID, p_blocked UUID, p_reason TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_user1 UUID;
  v_user2 UUID;
BEGIN
  IF p_blocker IS NULL OR p_blocked IS NULL OR p_blocker = p_blocked THEN
    RAISE EXCEPTION 'invalid block pair';
  END IF;

  -- Cancel pending friend requests in both directions.
  UPDATE public.friend_requests
    SET status = 'cancelled', responded_at = NOW()
    WHERE status = 'pending'
      AND ((sender_id = p_blocker AND receiver_id = p_blocked)
        OR (sender_id = p_blocked AND receiver_id = p_blocker));

  -- Drop any existing friendship.
  IF p_blocker < p_blocked THEN
    v_user1 := p_blocker; v_user2 := p_blocked;
  ELSE
    v_user1 := p_blocked; v_user2 := p_blocker;
  END IF;
  DELETE FROM public.friendships
    WHERE user1_id = v_user1 AND user2_id = v_user2;

  -- Idempotent block insert.
  INSERT INTO public.blocked_users (blocker_id, blocked_id, reason)
    VALUES (p_blocker, p_blocked, p_reason)
    ON CONFLICT (blocker_id, blocked_id) DO UPDATE SET reason = EXCLUDED.reason
    RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.block_user_v2(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked_either(UUID, UUID) TO authenticated;

-- ============================================================================
-- D. friend_requests 7-day expiry default + purge helper
-- ============================================================================
ALTER TABLE public.friend_requests
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '7 days');

-- Backfill existing pending rows with 30d default to 7d (best-effort).
UPDATE public.friend_requests
  SET expires_at = LEAST(expires_at, created_at + INTERVAL '7 days')
  WHERE status = 'pending'
    AND expires_at > created_at + INTERVAL '7 days';

CREATE OR REPLACE FUNCTION public.expire_old_friend_requests()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.friend_requests
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.expire_old_friend_requests() TO authenticated;

-- ============================================================================
-- E. DM safety: attachment columns + private bucket + storage RLS
-- ============================================================================
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS attachment_path TEXT,
  ADD COLUMN IF NOT EXISTS attachment_mime TEXT,
  ADD COLUMN IF NOT EXISTS attachment_size_bytes INT;

-- Either content OR attachment must be present (loosen content-NOT-NULL post-fact).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='direct_messages'
               AND column_name='content' AND is_nullable='NO') THEN
    ALTER TABLE public.direct_messages ALTER COLUMN content DROP NOT NULL;
  END IF;
  -- Existing CHECK on content length (1..4000) blocks empty content. Replace.
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='direct_messages_content_check') THEN
    ALTER TABLE public.direct_messages DROP CONSTRAINT direct_messages_content_check;
  END IF;
  ALTER TABLE public.direct_messages
    ADD CONSTRAINT direct_messages_content_or_attachment_check
    CHECK (
      (content IS NOT NULL AND char_length(content) BETWEEN 1 AND 4000)
      OR attachment_path IS NOT NULL
    );
END $$;

-- dm-attachments private bucket.
INSERT INTO storage.buckets (id, name, public)
  VALUES ('dm-attachments', 'dm-attachments', false)
  ON CONFLICT (id) DO UPDATE SET public = false;

-- Storage RLS for dm-attachments: only sender or recipient can read.
DROP POLICY IF EXISTS dm_attachments_read_participants ON storage.objects;
CREATE POLICY dm_attachments_read_participants ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'dm-attachments'
    AND EXISTS (
      SELECT 1 FROM public.direct_messages dm
        WHERE dm.attachment_path = storage.objects.name
          AND (dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid())
    )
  );

-- Insert: only authenticated user uploading to a path under their own user folder.
DROP POLICY IF EXISTS dm_attachments_upload_self ON storage.objects;
CREATE POLICY dm_attachments_upload_self ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dm-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- F. Feed cursor pagination RPC
-- ============================================================================
-- Returns posts paginated by (featured DESC, created_at DESC, id DESC) keyset.
-- Cursor = (last_featured BOOL, last_created_at TIMESTAMPTZ, last_id UUID).
-- Filters out posts whose author has blocked or is blocked by p_user_id.
-- Includes user_liked / user_saved / user_reported per row.
CREATE OR REPLACE FUNCTION public.get_feed_cursor_page(
  p_user_id UUID,
  p_limit INT DEFAULT 20,
  p_cursor_featured BOOLEAN DEFAULT NULL,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  type TEXT,
  category TEXT,
  content TEXT,
  media_urls JSONB,
  metadata JSONB,
  visibility TEXT,
  status TEXT,
  featured BOOLEAN,
  likes_count INT,
  comments_count INT,
  shares_count INT,
  created_at TIMESTAMPTZ,
  user_liked BOOLEAN,
  user_saved BOOLEAN,
  user_reported BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_limit INT;
BEGIN
  v_limit := LEAST(GREATEST(p_limit, 1), 20); -- hard cap 20
  RETURN QUERY
  WITH blocked AS (
    SELECT blocked_id AS uid FROM public.blocked_users WHERE blocker_id = p_user_id
    UNION
    SELECT blocker_id AS uid FROM public.blocked_users WHERE blocked_id = p_user_id
  )
  SELECT
    fp.id,
    fp.user_id,
    fp.type::TEXT,
    fp.category::TEXT,
    fp.content,
    fp.media_urls,
    fp.metadata,
    fp.visibility::TEXT,
    fp.status::TEXT,
    fp.featured,
    fp.likes_count,
    fp.comments_count,
    fp.shares_count,
    fp.created_at,
    EXISTS (SELECT 1 FROM public.feed_likes fl
              WHERE fl.post_id = fp.id AND fl.user_id = p_user_id) AS user_liked,
    EXISTS (SELECT 1 FROM public.feed_bookmarks fb
              WHERE fb.post_id = fp.id AND fb.user_id = p_user_id) AS user_saved,
    EXISTS (SELECT 1 FROM public.user_reports ur
              WHERE ur.target_type = 'feed_post' AND ur.target_id = fp.id
                AND ur.reporter_user_id = p_user_id) AS user_reported
  FROM public.feed_posts fp
  WHERE fp.status = 'published'
    AND COALESCE(fp.is_hidden, false) = false
    AND fp.user_id NOT IN (SELECT uid FROM blocked)
    AND (
      p_cursor_id IS NULL
      OR (fp.featured, fp.created_at, fp.id) < (
           COALESCE(p_cursor_featured, false), p_cursor_created_at, p_cursor_id
         )
    )
  ORDER BY fp.featured DESC, fp.created_at DESC, fp.id DESC
  LIMIT v_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_feed_cursor_page(UUID, INT, BOOLEAN, TIMESTAMPTZ, UUID)
  TO authenticated, anon;

-- Anonymous variant (no user-state, blocked-filter skipped).
CREATE OR REPLACE FUNCTION public.get_feed_cursor_page_anon(
  p_limit INT DEFAULT 20,
  p_cursor_featured BOOLEAN DEFAULT NULL,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  user_id UUID,
  type TEXT,
  category TEXT,
  content TEXT,
  media_urls JSONB,
  metadata JSONB,
  visibility TEXT,
  status TEXT,
  featured BOOLEAN,
  likes_count INT,
  comments_count INT,
  shares_count INT,
  created_at TIMESTAMPTZ,
  user_liked BOOLEAN,
  user_saved BOOLEAN,
  user_reported BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_limit INT;
BEGIN
  v_limit := LEAST(GREATEST(p_limit, 1), 20);
  RETURN QUERY
  SELECT
    fp.id, fp.user_id, fp.type::TEXT, fp.category::TEXT, fp.content,
    fp.media_urls, fp.metadata, fp.visibility::TEXT, fp.status::TEXT,
    fp.featured, fp.likes_count, fp.comments_count, fp.shares_count,
    fp.created_at,
    false AS user_liked, false AS user_saved, false AS user_reported
  FROM public.feed_posts fp
  WHERE fp.status = 'published'
    AND COALESCE(fp.is_hidden, false) = false
    AND fp.visibility = 'public'
    AND (
      p_cursor_id IS NULL
      OR (fp.featured, fp.created_at, fp.id) < (
           COALESCE(p_cursor_featured, false), p_cursor_created_at, p_cursor_id
         )
    )
  ORDER BY fp.featured DESC, fp.created_at DESC, fp.id DESC
  LIMIT v_limit;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_feed_cursor_page_anon(INT, BOOLEAN, TIMESTAMPTZ, UUID)
  TO authenticated, anon;

-- ============================================================================
-- G. feed_comments depth normalization + 500 char check
-- ============================================================================
DO $$
BEGIN
  -- Add 500-char check.
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='feed_comments_content_500_check') THEN
    ALTER TABLE public.feed_comments DROP CONSTRAINT feed_comments_content_500_check;
  END IF;
  ALTER TABLE public.feed_comments
    ADD CONSTRAINT feed_comments_content_500_check
    CHECK (char_length(content) <= 500);
END $$;

-- Soft-delete column.
ALTER TABLE public.feed_comments
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Depth-2 enforcement: parent_id of a reply must point at a root (parent_id IS NULL).
CREATE OR REPLACE FUNCTION public.feed_comments_normalize_depth()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_grandparent UUID;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT parent_id INTO v_grandparent FROM public.feed_comments WHERE id = NEW.parent_id;
    IF v_grandparent IS NOT NULL THEN
      -- Flatten: re-parent to the root.
      NEW.parent_id := v_grandparent;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feed_comments_normalize_depth_trg ON public.feed_comments;
CREATE TRIGGER feed_comments_normalize_depth_trg
  BEFORE INSERT ON public.feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.feed_comments_normalize_depth();

-- ============================================================================
-- H. mentor_can_dm_teen helper (used by DM POST). Permissive default — the
--    full mentor authorization graph is Wave 2B+. This stub returns TRUE so
--    teen↔teen DMs continue to work; adult↔teen path is not yet exposed.
-- ============================================================================
-- mentor_can_dm_teen already exists in live DB with signature
-- (p_mentor_id UUID, p_teen_id UUID). Application-layer code calls it via
-- supabase.rpc('mentor_can_dm_teen', { p_mentor_id, p_teen_id }).

-- ============================================================================
-- End of migration 097
-- ============================================================================
