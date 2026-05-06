-- ============================================================================
-- MIGRATION 024: FRIENDS SYSTEM (Système d'Amis)
-- ============================================================================
-- Système complet de gestion des amis pour les teens
-- ============================================================================

-- ============================================================================
-- FRIENDSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The two users in the friendship (user1_id < user2_id for consistency)
  user1_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),

  -- Who initiated the request (for pending status)
  initiated_by UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Friendship metadata
  friendship_level INTEGER DEFAULT 1, -- Increases with interactions
  interaction_count INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,

  -- Special tags
  is_best_friend BOOLEAN DEFAULT false, -- User can mark best friends
  is_favorite BOOLEAN DEFAULT false,
  nickname VARCHAR(50), -- Custom nickname for the friend

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure user1_id < user2_id for uniqueness
  CONSTRAINT friendship_order CHECK (user1_id < user2_id),
  UNIQUE(user1_id, user2_id)
);

-- ============================================================================
-- FRIEND REQUESTS TABLE (for detailed tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sender and receiver
  sender_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Request message
  message TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),

  -- Seen tracking
  seen_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  UNIQUE(sender_id, receiver_id)
);

-- ============================================================================
-- BLOCKED USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(blocker_id, blocked_id)
);

-- ============================================================================
-- FRIEND SUGGESTIONS TABLE (cached suggestions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS friend_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  suggested_teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Why suggested
  reason VARCHAR(50), -- 'mutual_friends', 'same_school', 'same_clubs', 'same_interests'
  score DECIMAL(5,2) DEFAULT 0, -- Suggestion score

  -- Tracking
  shown_count INTEGER DEFAULT 0,
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, suggested_teen_id)
);

-- ============================================================================
-- FRIEND ACTIVITY FEED (for friend-specific activities)
-- ============================================================================

CREATE TABLE IF NOT EXISTS friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Activity type
  activity_type VARCHAR(50) NOT NULL, -- 'level_up', 'achievement', 'new_record', 'challenge_complete', 'creation', etc.

  -- Activity details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),

  -- Related content
  related_type VARCHAR(50), -- 'achievement', 'record', 'creation', 'challenge', etc.
  related_id UUID,

  -- Privacy
  visibility VARCHAR(20) DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'private')),

  -- Engagement
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ACTIVITY LIKES
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES friend_activities(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(activity_id, teen_id)
);

-- ============================================================================
-- ACTIVITY COMMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES friend_activities(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_initiated ON friendships(initiated_by);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

CREATE INDEX IF NOT EXISTS idx_friend_suggestions_teen ON friend_suggestions(teen_id);
CREATE INDEX IF NOT EXISTS idx_friend_suggestions_score ON friend_suggestions(score DESC);

CREATE INDEX IF NOT EXISTS idx_friend_activities_teen ON friend_activities(teen_id);
CREATE INDEX IF NOT EXISTS idx_friend_activities_created ON friend_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_activities_type ON friend_activities(activity_type);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get all friends of a teen
CREATE OR REPLACE FUNCTION get_friends(p_teen_id UUID)
RETURNS TABLE (
  friend_id UUID,
  friendship_id UUID,
  status VARCHAR,
  friendship_level INTEGER,
  is_best_friend BOOLEAN,
  is_favorite BOOLEAN,
  nickname VARCHAR,
  accepted_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN f.user1_id = p_teen_id THEN f.user2_id
      ELSE f.user1_id
    END AS friend_id,
    f.id AS friendship_id,
    f.status,
    f.friendship_level,
    f.is_best_friend,
    f.is_favorite,
    f.nickname,
    f.accepted_at,
    f.last_interaction_at
  FROM friendships f
  WHERE (f.user1_id = p_teen_id OR f.user2_id = p_teen_id)
    AND f.status = 'accepted';
END;
$$ LANGUAGE plpgsql;

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(p_user1 UUID, p_user2 UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user1 UUID;
  v_user2 UUID;
BEGIN
  -- Order the IDs
  IF p_user1 < p_user2 THEN
    v_user1 := p_user1;
    v_user2 := p_user2;
  ELSE
    v_user1 := p_user2;
    v_user2 := p_user1;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE user1_id = v_user1
      AND user2_id = v_user2
      AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get mutual friends count
CREATE OR REPLACE FUNCTION get_mutual_friends_count(p_user1 UUID, p_user2 UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH user1_friends AS (
    SELECT
      CASE WHEN user1_id = p_user1 THEN user2_id ELSE user1_id END AS friend_id
    FROM friendships
    WHERE (user1_id = p_user1 OR user2_id = p_user1)
      AND status = 'accepted'
  ),
  user2_friends AS (
    SELECT
      CASE WHEN user1_id = p_user2 THEN user2_id ELSE user1_id END AS friend_id
    FROM friendships
    WHERE (user1_id = p_user2 OR user2_id = p_user2)
      AND status = 'accepted'
  )
  SELECT COUNT(*) INTO v_count
  FROM user1_friends u1
  INNER JOIN user2_friends u2 ON u1.friend_id = u2.friend_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to send friend request
CREATE OR REPLACE FUNCTION send_friend_request(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_user1 UUID;
  v_user2 UUID;
BEGIN
  -- Check if already friends or request exists
  IF p_sender_id < p_receiver_id THEN
    v_user1 := p_sender_id;
    v_user2 := p_receiver_id;
  ELSE
    v_user1 := p_receiver_id;
    v_user2 := p_sender_id;
  END IF;

  -- Check for existing friendship
  IF EXISTS (SELECT 1 FROM friendships WHERE user1_id = v_user1 AND user2_id = v_user2) THEN
    RAISE EXCEPTION 'Friendship already exists';
  END IF;

  -- Check if blocked
  IF EXISTS (SELECT 1 FROM blocked_users WHERE blocker_id = p_receiver_id AND blocked_id = p_sender_id) THEN
    RAISE EXCEPTION 'Cannot send request to this user';
  END IF;

  -- Check for existing pending request
  IF EXISTS (SELECT 1 FROM friend_requests WHERE sender_id = p_sender_id AND receiver_id = p_receiver_id AND status = 'pending') THEN
    RAISE EXCEPTION 'Request already sent';
  END IF;

  -- Create request
  INSERT INTO friend_requests (sender_id, receiver_id, message, status)
  VALUES (p_sender_id, p_receiver_id, p_message, 'pending')
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

-- Function to accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(p_request_id UUID, p_receiver_id UUID)
RETURNS UUID AS $$
DECLARE
  v_request RECORD;
  v_friendship_id UUID;
  v_user1 UUID;
  v_user2 UUID;
BEGIN
  -- Get request
  SELECT * INTO v_request FROM friend_requests WHERE id = p_request_id AND receiver_id = p_receiver_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not pending';
  END IF;

  -- Update request
  UPDATE friend_requests SET status = 'accepted', responded_at = NOW() WHERE id = p_request_id;

  -- Order IDs
  IF v_request.sender_id < v_request.receiver_id THEN
    v_user1 := v_request.sender_id;
    v_user2 := v_request.receiver_id;
  ELSE
    v_user1 := v_request.receiver_id;
    v_user2 := v_request.sender_id;
  END IF;

  -- Create friendship
  INSERT INTO friendships (user1_id, user2_id, status, initiated_by, accepted_at)
  VALUES (v_user1, v_user2, 'accepted', v_request.sender_id, NOW())
  RETURNING id INTO v_friendship_id;

  -- Award XP to both users
  PERFORM add_xp_to_user(v_request.sender_id, 15, 'friend_accepted', v_friendship_id, 'Nouvel ami');
  PERFORM add_xp_to_user(v_request.receiver_id, 15, 'friend_accepted', v_friendship_id, 'Nouvel ami');

  RETURN v_friendship_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increase friendship level based on interactions
CREATE OR REPLACE FUNCTION increase_friendship_interaction(p_user1 UUID, p_user2 UUID)
RETURNS INTEGER AS $$
DECLARE
  v_u1 UUID;
  v_u2 UUID;
  v_new_level INTEGER;
  v_interaction_count INTEGER;
BEGIN
  -- Order IDs
  IF p_user1 < p_user2 THEN
    v_u1 := p_user1;
    v_u2 := p_user2;
  ELSE
    v_u1 := p_user2;
    v_u2 := p_user1;
  END IF;

  -- Update and get new values
  UPDATE friendships
  SET
    interaction_count = interaction_count + 1,
    last_interaction_at = NOW(),
    friendship_level = LEAST(10, 1 + FLOOR((interaction_count + 1) / 10)), -- Level up every 10 interactions, max 10
    updated_at = NOW()
  WHERE user1_id = v_u1 AND user2_id = v_u2 AND status = 'accepted'
  RETURNING friendship_level INTO v_new_level;

  RETURN COALESCE(v_new_level, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to generate friend suggestions
CREATE OR REPLACE FUNCTION generate_friend_suggestions(p_teen_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS VOID AS $$
BEGIN
  -- Clear old suggestions (keep dismissed ones)
  DELETE FROM friend_suggestions
  WHERE teen_id = p_teen_id AND dismissed = false;

  -- Insert new suggestions based on mutual friends
  INSERT INTO friend_suggestions (teen_id, suggested_teen_id, reason, score)
  SELECT DISTINCT
    p_teen_id,
    potential_friend,
    'mutual_friends',
    mutual_count * 10 -- Score based on mutual friends
  FROM (
    -- Find friends of friends
    SELECT
      CASE WHEN f2.user1_id = my_friends.friend_id THEN f2.user2_id ELSE f2.user1_id END AS potential_friend,
      COUNT(*) AS mutual_count
    FROM (
      SELECT
        CASE WHEN user1_id = p_teen_id THEN user2_id ELSE user1_id END AS friend_id
      FROM friendships
      WHERE (user1_id = p_teen_id OR user2_id = p_teen_id) AND status = 'accepted'
    ) my_friends
    INNER JOIN friendships f2 ON (
      f2.user1_id = my_friends.friend_id OR f2.user2_id = my_friends.friend_id
    ) AND f2.status = 'accepted'
    WHERE
      -- Not the original user
      CASE WHEN f2.user1_id = my_friends.friend_id THEN f2.user2_id ELSE f2.user1_id END != p_teen_id
      -- Not already a friend
      AND NOT EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
          AND (
            (user1_id = p_teen_id AND user2_id = CASE WHEN f2.user1_id = my_friends.friend_id THEN f2.user2_id ELSE f2.user1_id END)
            OR (user2_id = p_teen_id AND user1_id = CASE WHEN f2.user1_id = my_friends.friend_id THEN f2.user2_id ELSE f2.user1_id END)
          )
      )
      -- Not blocked
      AND NOT EXISTS (
        SELECT 1 FROM blocked_users
        WHERE blocker_id = p_teen_id
          AND blocked_id = CASE WHEN f2.user1_id = my_friends.friend_id THEN f2.user2_id ELSE f2.user1_id END
      )
      -- Not already suggested and dismissed
      AND NOT EXISTS (
        SELECT 1 FROM friend_suggestions
        WHERE teen_id = p_teen_id
          AND suggested_teen_id = CASE WHEN f2.user1_id = my_friends.friend_id THEN f2.user2_id ELSE f2.user1_id END
          AND dismissed = true
      )
    GROUP BY potential_friend
  ) suggestions
  ORDER BY mutual_count DESC
  LIMIT p_limit
  ON CONFLICT (teen_id, suggested_teen_id) DO UPDATE
  SET score = EXCLUDED.score, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_activities ENABLE ROW LEVEL SECURITY;

-- Friendships: users can see their own friendships
CREATE POLICY friendships_select ON friendships FOR SELECT USING (
  user1_id = auth.uid() OR user2_id = auth.uid()
);

-- Friend requests: users can see requests they sent or received
CREATE POLICY friend_requests_select ON friend_requests FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);

-- Blocked users: only blocker can see
CREATE POLICY blocked_users_select ON blocked_users FOR SELECT USING (
  blocker_id = auth.uid()
);

-- Friend activities: based on visibility
CREATE POLICY friend_activities_select ON friend_activities FOR SELECT USING (
  teen_id = auth.uid()
  OR visibility = 'public'
  OR (visibility = 'friends' AND are_friends(teen_id, auth.uid()))
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to create activity when friendship level increases
CREATE OR REPLACE FUNCTION notify_friendship_level_up()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.friendship_level > OLD.friendship_level THEN
    -- Create activity for both users
    INSERT INTO friend_activities (teen_id, activity_type, title, description, icon, color, related_type, related_id)
    VALUES
      (NEW.user1_id, 'friendship_level', 'Amitie renforcee!', 'Niveau ' || NEW.friendship_level || ' atteint', 'heart', 'pink', 'friendship', NEW.id),
      (NEW.user2_id, 'friendship_level', 'Amitie renforcee!', 'Niveau ' || NEW.friendship_level || ' atteint', 'heart', 'pink', 'friendship', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_friendship_level_up
AFTER UPDATE ON friendships
FOR EACH ROW
WHEN (NEW.friendship_level > OLD.friendship_level)
EXECUTE FUNCTION notify_friendship_level_up();

COMMENT ON TABLE friendships IS 'Relations d amitie entre teens';
COMMENT ON TABLE friend_requests IS 'Demandes d amitie en attente';
COMMENT ON TABLE blocked_users IS 'Utilisateurs bloques';
COMMENT ON TABLE friend_suggestions IS 'Suggestions d amis basees sur les amis mutuels';
COMMENT ON TABLE friend_activities IS 'Activites visibles par les amis';
