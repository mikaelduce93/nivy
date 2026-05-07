-- Wave 2.3 — Content creator economy v1
-- Per docs/vision/content-creator-economy.md and whitepaper §19.4.6.
-- Live applied as Supabase migration `055_creator_economy` on 2026-05-07.
--
-- Extends feed_posts with creator-economy lifecycle columns, adds
-- creator_engagement ledger, monthly stats rollup, daily-cap status view, and
-- the three core RPCs:
--   - award_creator_xp(creator, signal, submission, viewer)
--   - feature_submission(submission, admin)
--   - refresh_creator_monthly_stats()
--
-- Daily caps (whitepaper §19.4.6):
--   post own:        +10 XP/day max (1/day)
--   like received:   +1 XP, cap 50 XP/day
--   comment received:+2 XP, cap 30 XP/day
--   share received:  +5 XP, cap 20 XP/day

-- 0. Extend moderation_queue.content_type to allow 'feed_post' -----------------
ALTER TABLE public.moderation_queue DROP CONSTRAINT IF EXISTS moderation_queue_content_type_check;
ALTER TABLE public.moderation_queue
  ADD CONSTRAINT moderation_queue_content_type_check
  CHECK (content_type = ANY (ARRAY[
    'quiz_generation','user_report','partner_offer','image_upload',
    'message','event','feed_post'
  ]));

-- 1. Extend feed_posts ---------------------------------------------------------
ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS related_partner_id UUID,
  ADD COLUMN IF NOT EXISTS related_event_id UUID,
  ADD COLUMN IF NOT EXISTS related_quest_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_moderation',
  ADD COLUMN IF NOT EXISTS moderation_id UUID,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_by UUID,
  ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='feed_posts_type_check') THEN
    ALTER TABLE public.feed_posts
      ADD CONSTRAINT feed_posts_type_check
      CHECK (type IS NULL OR type IN ('photo','video','story','tutorial','review','live_event'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='feed_posts_status_check') THEN
    ALTER TABLE public.feed_posts
      ADD CONSTRAINT feed_posts_status_check
      CHECK (status IN ('draft','pending_moderation','published','rejected','removed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='feed_posts_visibility_check_v2') THEN
    BEGIN
      ALTER TABLE public.feed_posts
        ADD CONSTRAINT feed_posts_visibility_check_v2
        CHECK (visibility IN ('private','friends','crew','public'));
    EXCEPTION WHEN check_violation THEN NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS feed_posts_status_idx       ON public.feed_posts (status);
CREATE INDEX IF NOT EXISTS feed_posts_featured_idx     ON public.feed_posts (featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS feed_posts_category_idx     ON public.feed_posts (category);
CREATE INDEX IF NOT EXISTS feed_posts_user_created_idx ON public.feed_posts (user_id, created_at DESC);

-- 2. creator_engagement ledger -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID NOT NULL,
  viewer_user_id  UUID NOT NULL,
  submission_id   UUID NOT NULL REFERENCES public.feed_posts(id) ON DELETE CASCADE,
  action          TEXT NOT NULL CHECK (action IN ('view','like','comment','share','save')),
  xp_credited_to_creator INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS creator_engagement_creator_day_idx ON public.creator_engagement (creator_user_id, created_at);
CREATE INDEX IF NOT EXISTS creator_engagement_submission_idx  ON public.creator_engagement (submission_id);
CREATE INDEX IF NOT EXISTS creator_engagement_action_idx      ON public.creator_engagement (action);

-- 3. creator_monthly_stats -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_monthly_stats (
  user_id           UUID NOT NULL,
  month             DATE NOT NULL,
  category          TEXT,
  submissions_count INTEGER NOT NULL DEFAULT 0,
  total_likes       INTEGER NOT NULL DEFAULT 0,
  total_views       INTEGER NOT NULL DEFAULT 0,
  xp_earned         INTEGER NOT NULL DEFAULT 0,
  rank_overall      INTEGER,
  rank_category     INTEGER,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month)
);
CREATE INDEX IF NOT EXISTS creator_monthly_stats_month_idx        ON public.creator_monthly_stats (month);
CREATE INDEX IF NOT EXISTS creator_monthly_stats_rank_overall_idx ON public.creator_monthly_stats (month, rank_overall);

-- 4. creator_daily_caps_status view -------------------------------------------
CREATE OR REPLACE VIEW public.creator_daily_caps_status AS
WITH posts_today AS (
  SELECT user_id, COUNT(*) AS posts_today
  FROM public.feed_posts
  WHERE created_at >= date_trunc('day', now())
  GROUP BY user_id
),
likes_today AS (
  SELECT creator_user_id AS user_id, COALESCE(SUM(xp_credited_to_creator), 0) AS likes_xp_today
  FROM public.creator_engagement
  WHERE action = 'like' AND created_at >= date_trunc('day', now())
  GROUP BY creator_user_id
),
comments_today AS (
  SELECT creator_user_id AS user_id, COALESCE(SUM(xp_credited_to_creator), 0) AS comments_xp_today
  FROM public.creator_engagement
  WHERE action = 'comment' AND created_at >= date_trunc('day', now())
  GROUP BY creator_user_id
),
shares_today AS (
  SELECT creator_user_id AS user_id, COALESCE(SUM(xp_credited_to_creator), 0) AS shares_xp_today
  FROM public.creator_engagement
  WHERE action = 'share' AND created_at >= date_trunc('day', now())
  GROUP BY creator_user_id
),
all_users AS (
  SELECT user_id FROM posts_today
  UNION SELECT user_id FROM likes_today
  UNION SELECT user_id FROM comments_today
  UNION SELECT user_id FROM shares_today
)
SELECT
  u.user_id,
  (now() AT TIME ZONE 'UTC')::date AS day,
  COALESCE(p.posts_today, 0)       AS posts_today,
  COALESCE(l.likes_xp_today, 0)    AS likes_xp_today,
  COALESCE(c.comments_xp_today, 0) AS comments_xp_today,
  COALESCE(s.shares_xp_today, 0)   AS shares_xp_today
FROM all_users u
LEFT JOIN posts_today    p ON p.user_id = u.user_id
LEFT JOIN likes_today    l ON l.user_id = u.user_id
LEFT JOIN comments_today c ON c.user_id = u.user_id
LEFT JOIN shares_today   s ON s.user_id = u.user_id;

-- 5. award_creator_xp RPC ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_creator_xp(
  p_creator_user_id UUID,
  p_signal_type     TEXT,
  p_submission_id   UUID,
  p_viewer_user_id  UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit_xp           INTEGER := 0;
  v_daily_cap         INTEGER := 0;
  v_already_today_xp  INTEGER := 0;
  v_award_xp          INTEGER := 0;
  v_post_count_today  INTEGER := 0;
BEGIN
  IF p_signal_type NOT IN ('post','like','comment','share','view','save') THEN
    RETURN json_build_object('credited', 0, 'reason', 'invalid_signal_type');
  END IF;

  IF p_signal_type = 'post' THEN
    SELECT COUNT(*) INTO v_post_count_today
    FROM public.creator_engagement
    WHERE creator_user_id = p_creator_user_id
      AND viewer_user_id  = p_creator_user_id
      AND action = 'view'
      AND xp_credited_to_creator = 10
      AND created_at >= date_trunc('day', now());
    IF v_post_count_today >= 1 THEN
      RETURN json_build_object('credited', 0, 'reason', 'post_daily_cap_reached');
    END IF;

    INSERT INTO public.creator_engagement
      (creator_user_id, viewer_user_id, submission_id, action, xp_credited_to_creator)
    VALUES (p_creator_user_id, p_creator_user_id, p_submission_id, 'view', 10);

    PERFORM public.add_xp_to_user(
      p_creator_user_id, 10, 'creator_post', 'creator', p_submission_id,
      'Creator: post submitted'
    );
    UPDATE public.feed_posts SET xp_earned = COALESCE(xp_earned, 0) + 10 WHERE id = p_submission_id;
    RETURN json_build_object('credited', 10, 'reason', 'post_grant');
  END IF;

  IF p_signal_type = 'like' THEN
    v_unit_xp := 1; v_daily_cap := 50;
  ELSIF p_signal_type = 'comment' THEN
    v_unit_xp := 2; v_daily_cap := 30;
  ELSIF p_signal_type = 'share' THEN
    v_unit_xp := 5; v_daily_cap := 20;
  ELSE
    INSERT INTO public.creator_engagement
      (creator_user_id, viewer_user_id, submission_id, action, xp_credited_to_creator)
    VALUES (p_creator_user_id, COALESCE(p_viewer_user_id, p_creator_user_id), p_submission_id, p_signal_type, 0);
    RETURN json_build_object('credited', 0, 'reason', 'no_xp_for_signal');
  END IF;

  SELECT COALESCE(SUM(xp_credited_to_creator), 0) INTO v_already_today_xp
  FROM public.creator_engagement
  WHERE creator_user_id = p_creator_user_id
    AND action = p_signal_type
    AND created_at >= date_trunc('day', now())
    AND viewer_user_id <> p_creator_user_id;

  IF v_already_today_xp >= v_daily_cap THEN
    INSERT INTO public.creator_engagement
      (creator_user_id, viewer_user_id, submission_id, action, xp_credited_to_creator)
    VALUES (p_creator_user_id, COALESCE(p_viewer_user_id, p_creator_user_id), p_submission_id, p_signal_type, 0);
    RETURN json_build_object('credited', 0, 'reason', 'daily_cap_reached', 'cap', v_daily_cap);
  END IF;

  v_award_xp := LEAST(v_unit_xp, v_daily_cap - v_already_today_xp);

  INSERT INTO public.creator_engagement
    (creator_user_id, viewer_user_id, submission_id, action, xp_credited_to_creator)
  VALUES (p_creator_user_id, COALESCE(p_viewer_user_id, p_creator_user_id), p_submission_id, p_signal_type, v_award_xp);

  IF v_award_xp > 0 THEN
    PERFORM public.add_xp_to_user(
      p_creator_user_id, v_award_xp,
      'creator_engagement', p_signal_type, p_submission_id,
      'Creator: ' || p_signal_type || ' received'
    );
    UPDATE public.feed_posts SET xp_earned = COALESCE(xp_earned, 0) + v_award_xp WHERE id = p_submission_id;
  END IF;

  RETURN json_build_object(
    'credited', v_award_xp,
    'reason', CASE WHEN v_award_xp > 0 THEN 'awarded' ELSE 'cap_partial' END,
    'cap', v_daily_cap,
    'already_today_xp', v_already_today_xp
  );
END $$;

GRANT EXECUTE ON FUNCTION public.award_creator_xp(UUID, TEXT, UUID, UUID) TO authenticated, service_role;

-- 6. feature_submission RPC ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.feature_submission(
  p_submission_id UUID,
  p_admin_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin   BOOLEAN := FALSE;
  v_creator_id UUID;
  v_already_featured BOOLEAN;
  v_new_balance INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE profile_id = p_admin_user_id
      AND role IN ('admin','super_admin','moderator')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('ok', false, 'reason', 'not_admin');
  END IF;

  SELECT user_id, COALESCE(featured, FALSE) INTO v_creator_id, v_already_featured
  FROM public.feed_posts
  WHERE id = p_submission_id
  FOR UPDATE;

  IF v_creator_id IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'submission_not_found');
  END IF;
  IF v_already_featured THEN
    RETURN json_build_object('ok', false, 'reason', 'already_featured');
  END IF;

  UPDATE public.feed_posts
     SET featured = TRUE,
         featured_at = now(),
         featured_by = p_admin_user_id,
         status = CASE WHEN status IN ('pending_moderation','draft') THEN 'published' ELSE status END,
         xp_earned = COALESCE(xp_earned, 0) + 500
   WHERE id = p_submission_id;

  PERFORM public.add_xp_to_user(
    v_creator_id, 500, 'creator_featured', 'creator', p_submission_id,
    'Creator: featured by admin'
  );

  INSERT INTO public.user_coins (teen_id, balance, lifetime_earned)
  VALUES (v_creator_id, 200, 200)
  ON CONFLICT (teen_id) DO UPDATE
     SET balance = public.user_coins.balance + 200,
         lifetime_earned = public.user_coins.lifetime_earned + 200,
         updated_at = now()
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.coin_transactions
    (teen_id, amount, transaction_type, source_type, source_id, description, balance_after)
  VALUES
    (v_creator_id, 200, 'system_credit', 'creator_featured', p_submission_id,
     'Featured creator bonus', v_new_balance);

  INSERT INTO public.admin_audit_logs (user_id, action, target_type, target_id, payload)
  VALUES (
    p_admin_user_id, 'feature_submission', 'feed_post', p_submission_id,
    jsonb_build_object('creator_user_id', v_creator_id, 'xp_awarded', 500, 'coins_awarded', 200)
  );

  RETURN json_build_object(
    'ok', true,
    'creator_user_id', v_creator_id,
    'xp_awarded', 500,
    'coins_awarded', 200,
    'new_balance', v_new_balance
  );
END $$;

GRANT EXECUTE ON FUNCTION public.feature_submission(UUID, UUID) TO authenticated, service_role;

-- 7. refresh_creator_monthly_stats helper -------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_creator_monthly_stats()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INTEGER := 0;
BEGIN
  WITH agg AS (
    SELECT
      user_id,
      date_trunc('month', created_at)::date AS month,
      category,
      COUNT(*)                             AS submissions_count,
      COALESCE(SUM(likes_count), 0)        AS total_likes,
      COALESCE(SUM(views_count), 0)        AS total_views,
      COALESCE(SUM(xp_earned), 0)          AS xp_earned
    FROM public.feed_posts
    WHERE status = 'published'
      AND created_at >= date_trunc('month', now())
    GROUP BY user_id, date_trunc('month', created_at), category
  ),
  ranked AS (
    SELECT *,
      RANK() OVER (PARTITION BY month ORDER BY xp_earned DESC) AS rank_overall,
      RANK() OVER (PARTITION BY month, category ORDER BY xp_earned DESC) AS rank_category
    FROM agg
  )
  INSERT INTO public.creator_monthly_stats
    (user_id, month, category, submissions_count, total_likes, total_views,
     xp_earned, rank_overall, rank_category, updated_at)
  SELECT user_id, month, category, submissions_count, total_likes, total_views,
         xp_earned, rank_overall, rank_category, now()
  FROM ranked
  ON CONFLICT (user_id, month) DO UPDATE
     SET category          = EXCLUDED.category,
         submissions_count = EXCLUDED.submissions_count,
         total_likes       = EXCLUDED.total_likes,
         total_views       = EXCLUDED.total_views,
         xp_earned         = EXCLUDED.xp_earned,
         rank_overall      = EXCLUDED.rank_overall,
         rank_category     = EXCLUDED.rank_category,
         updated_at        = now();

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END $$;

GRANT EXECUTE ON FUNCTION public.refresh_creator_monthly_stats() TO authenticated, service_role;
