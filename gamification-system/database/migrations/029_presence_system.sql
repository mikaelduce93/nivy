-- ============================================================================
-- MIGRATION 029: PRESENCE SYSTEM (Système de Présence Temps Réel)
-- ============================================================================
-- Real-time presence tracking for social pulse functionality
-- ============================================================================

-- ============================================================================
-- USER PRESENCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Presence status
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'away', 'playing', 'busy', 'offline')),
  
  -- Activity context
  current_activity VARCHAR(100), -- e.g., 'browsing_shop', 'doing_mission', 'in_crew_battle'
  current_page VARCHAR(255), -- Current page/route in the app
  
  -- Device info (for multi-device support)
  device_id VARCHAR(100),
  device_type VARCHAR(20) CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  
  -- Timestamps
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  session_started_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint per user (one presence record per user)
  UNIQUE(user_id)
);

-- ============================================================================
-- PRESENCE HISTORY TABLE (for analytics and "recently online" features)
-- ============================================================================

CREATE TABLE IF NOT EXISTS presence_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session info
  session_id UUID,
  status VARCHAR(20) NOT NULL,
  activity VARCHAR(100),
  
  -- Duration tracking
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);

-- Fast lookup for online users
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status) WHERE status != 'offline';

-- For "last seen" queries
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen_at DESC);

-- For heartbeat cleanup
CREATE INDEX IF NOT EXISTS idx_user_presence_heartbeat ON user_presence(last_heartbeat_at);

-- History indexes
CREATE INDEX IF NOT EXISTS idx_presence_history_user ON presence_history(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_presence_history_session ON presence_history(session_id);

-- ============================================================================
-- ENABLE REALTIME FOR PRESENCE TABLE
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_history ENABLE ROW LEVEL SECURITY;

-- Users can read presence of their friends
CREATE POLICY "Users can view friends presence" ON user_presence
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
      AND (
        (f.user1_id = auth.uid() AND f.user2_id = user_presence.user_id)
        OR (f.user2_id = auth.uid() AND f.user1_id = user_presence.user_id)
      )
    )
  );

-- Users can only update their own presence
CREATE POLICY "Users can update own presence" ON user_presence
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can insert their own presence
CREATE POLICY "Users can insert own presence" ON user_presence
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own presence
CREATE POLICY "Users can delete own presence" ON user_presence
  FOR DELETE
  USING (user_id = auth.uid());

-- History: Users can only view their own history
CREATE POLICY "Users can view own presence history" ON presence_history
  FOR SELECT
  USING (user_id = auth.uid());

-- History: System can insert (via trigger)
CREATE POLICY "System can insert presence history" ON presence_history
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update presence (upsert)
CREATE OR REPLACE FUNCTION update_user_presence(
  p_status VARCHAR DEFAULT 'online',
  p_activity VARCHAR DEFAULT NULL,
  p_page VARCHAR DEFAULT NULL,
  p_device_id VARCHAR DEFAULT NULL,
  p_device_type VARCHAR DEFAULT 'unknown'
)
RETURNS user_presence
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result user_presence;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO user_presence (
    user_id, status, current_activity, current_page, 
    device_id, device_type, last_seen_at, last_heartbeat_at, updated_at
  )
  VALUES (
    v_user_id, p_status, p_activity, p_page,
    p_device_id, p_device_type, NOW(), NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = EXCLUDED.status,
    current_activity = COALESCE(EXCLUDED.current_activity, user_presence.current_activity),
    current_page = COALESCE(EXCLUDED.current_page, user_presence.current_page),
    device_id = COALESCE(EXCLUDED.device_id, user_presence.device_id),
    device_type = COALESCE(EXCLUDED.device_type, user_presence.device_type),
    last_seen_at = NOW(),
    last_heartbeat_at = NOW(),
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to get friends presence
CREATE OR REPLACE FUNCTION get_friends_presence(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  status VARCHAR,
  current_activity VARCHAR,
  last_seen_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(up.status, 'offline')::VARCHAR AS status,
    up.current_activity,
    up.last_seen_at
  FROM friendships f
  JOIN profiles p ON (
    CASE 
      WHEN f.user1_id = v_user_id THEN f.user2_id = p.id
      ELSE f.user1_id = p.id
    END
  )
  LEFT JOIN user_presence up ON up.user_id = p.id
  WHERE f.status = 'accepted'
    AND (f.user1_id = v_user_id OR f.user2_id = v_user_id)
  ORDER BY 
    CASE WHEN up.status = 'online' THEN 0
         WHEN up.status = 'playing' THEN 1
         WHEN up.status = 'away' THEN 2
         WHEN up.status = 'busy' THEN 3
         ELSE 4
    END,
    up.last_seen_at DESC NULLS LAST;
END;
$$;

-- Function to mark user offline (called on logout or session end)
CREATE OR REPLACE FUNCTION mark_user_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_old_record user_presence;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Get current presence for history
  SELECT * INTO v_old_record FROM user_presence WHERE user_id = v_user_id;

  IF v_old_record IS NOT NULL AND v_old_record.status != 'offline' THEN
    -- Insert into history
    INSERT INTO presence_history (
      user_id, session_id, status, activity, 
      started_at, ended_at, duration_seconds
    )
    VALUES (
      v_user_id, 
      gen_random_uuid(),
      v_old_record.status,
      v_old_record.current_activity,
      v_old_record.session_started_at,
      NOW(),
      EXTRACT(EPOCH FROM (NOW() - v_old_record.session_started_at))::INTEGER
    );
  END IF;

  -- Update presence to offline
  UPDATE user_presence 
  SET status = 'offline', 
      current_activity = NULL,
      last_seen_at = NOW(),
      updated_at = NOW()
  WHERE user_id = v_user_id;
END;
$$;

-- Function to cleanup stale presence (for cron job)
CREATE OR REPLACE FUNCTION cleanup_stale_presence(p_timeout_minutes INTEGER DEFAULT 5)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Mark as offline anyone who hasn't sent a heartbeat in timeout period
  WITH updated AS (
    UPDATE user_presence
    SET status = 'offline',
        current_activity = NULL,
        updated_at = NOW()
    WHERE status != 'offline'
      AND last_heartbeat_at < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL
    RETURNING *
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_presence_timestamp
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_presence_timestamp();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION update_user_presence TO authenticated;
GRANT EXECUTE ON FUNCTION get_friends_presence TO authenticated;
GRANT EXECUTE ON FUNCTION mark_user_offline TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stale_presence TO service_role;
