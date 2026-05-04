-- ============================================================================
-- MIGRATION 023: CIRCLES SYSTEM (Cercles d'Amis)
-- ============================================================================
-- Systeme de groupes/cercles pour les teens avec chat et activites partagees
-- ============================================================================

-- ============================================================================
-- CIRCLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  cover_url TEXT,

  -- Circle settings
  circle_type VARCHAR(20) DEFAULT 'private' CHECK (circle_type IN ('private', 'public', 'secret')),
  max_members INTEGER DEFAULT 20,

  -- Creator/owner
  created_by UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Theme/customization
  theme_color VARCHAR(20) DEFAULT 'cyan',
  emoji VARCHAR(10),

  -- Activity tracking
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CIRCLE MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Role in circle
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),

  -- Member settings
  nickname VARCHAR(50),
  notifications_enabled BOOLEAN DEFAULT true,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'muted', 'left', 'kicked', 'banned')),

  -- Activity
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  messages_sent INTEGER DEFAULT 0,

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(circle_id, teen_id)
);

-- ============================================================================
-- CIRCLE INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,

  -- Inviter and invitee
  invited_by UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  invited_teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Invitation message
  message TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),

  -- Expiration
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  UNIQUE(circle_id, invited_teen_id, status)
);

-- ============================================================================
-- CIRCLE MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Message content
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'system', 'poll', 'challenge')),

  -- Media attachments
  media_url TEXT,
  media_type VARCHAR(50),

  -- Reply/thread
  reply_to_id UUID REFERENCES circle_messages(id) ON DELETE SET NULL,

  -- Reactions (stored as JSONB)
  reactions JSONB DEFAULT '{}',

  -- Metadata for special message types
  metadata JSONB DEFAULT '{}',

  -- Edit/delete tracking
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,

  -- Pinned messages
  is_pinned BOOLEAN DEFAULT false,
  pinned_by UUID REFERENCES teens(id),
  pinned_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CIRCLE MESSAGE READS (for unread tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES circle_messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(circle_id, teen_id)
);

-- ============================================================================
-- CIRCLE CHALLENGES (shared challenges within circle)
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Challenge info
  title VARCHAR(200) NOT NULL,
  description TEXT,
  challenge_type VARCHAR(20) DEFAULT 'custom' CHECK (challenge_type IN ('custom', 'physical', 'creative', 'educational')),

  -- Objective
  objective_type VARCHAR(20) DEFAULT 'completion' CHECK (objective_type IN ('completion', 'count', 'time', 'score')),
  objective_value INTEGER,
  objective_unit VARCHAR(50),

  -- Rewards
  xp_reward INTEGER DEFAULT 50,

  -- Duration
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CIRCLE CHALLENGE PARTICIPANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES circle_challenges(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Progress
  current_value INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Proof
  proof_url TEXT,
  proof_type VARCHAR(20),

  -- XP earned
  xp_earned INTEGER DEFAULT 0,

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(challenge_id, teen_id)
);

-- ============================================================================
-- CIRCLE POLLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  message_id UUID REFERENCES circle_messages(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Poll content
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of {id, text, votes: []}

  -- Settings
  allow_multiple BOOLEAN DEFAULT false,
  anonymous BOOLEAN DEFAULT false,

  -- Duration
  ends_at TIMESTAMPTZ,

  -- Status
  is_closed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CIRCLE POLL VOTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES circle_polls(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  option_ids JSONB NOT NULL, -- Array of selected option IDs

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(poll_id, teen_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_circles_created_by ON circles(created_by);
CREATE INDEX IF NOT EXISTS idx_circles_type ON circles(circle_type);
CREATE INDEX IF NOT EXISTS idx_circles_active ON circles(is_active);
CREATE INDEX IF NOT EXISTS idx_circles_last_activity ON circles(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_teen ON circle_members(teen_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_role ON circle_members(role);
CREATE INDEX IF NOT EXISTS idx_circle_members_status ON circle_members(status);

CREATE INDEX IF NOT EXISTS idx_circle_invitations_circle ON circle_invitations(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_invitee ON circle_invitations(invited_teen_id);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_status ON circle_invitations(status);

CREATE INDEX IF NOT EXISTS idx_circle_messages_circle ON circle_messages(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_messages_sender ON circle_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_circle_messages_created ON circle_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_circle_messages_reply ON circle_messages(reply_to_id);

CREATE INDEX IF NOT EXISTS idx_circle_challenges_circle ON circle_challenges(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_challenges_status ON circle_challenges(status);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get circle with member count and unread messages
CREATE OR REPLACE FUNCTION get_circle_with_stats(p_circle_id UUID, p_teen_id UUID)
RETURNS TABLE (
  circle_id UUID,
  name VARCHAR,
  description TEXT,
  avatar_url TEXT,
  theme_color VARCHAR,
  emoji VARCHAR,
  circle_type VARCHAR,
  member_count BIGINT,
  unread_count BIGINT,
  last_message JSONB,
  user_role VARCHAR,
  is_muted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS circle_id,
    c.name,
    c.description,
    c.avatar_url,
    c.theme_color,
    c.emoji,
    c.circle_type,
    (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id AND status = 'active') AS member_count,
    (
      SELECT COUNT(*)
      FROM circle_messages cm
      WHERE cm.circle_id = c.id
      AND cm.created_at > COALESCE(
        (SELECT last_read_at FROM circle_message_reads WHERE circle_id = c.id AND teen_id = p_teen_id),
        (SELECT joined_at FROM circle_members WHERE circle_id = c.id AND teen_id = p_teen_id)
      )
      AND cm.is_deleted = false
    ) AS unread_count,
    (
      SELECT jsonb_build_object(
        'id', cm.id,
        'content', cm.content,
        'sender_id', cm.sender_id,
        'created_at', cm.created_at
      )
      FROM circle_messages cm
      WHERE cm.circle_id = c.id AND cm.is_deleted = false
      ORDER BY cm.created_at DESC
      LIMIT 1
    ) AS last_message,
    (SELECT role FROM circle_members WHERE circle_id = c.id AND teen_id = p_teen_id) AS user_role,
    (SELECT status = 'muted' FROM circle_members WHERE circle_id = c.id AND teen_id = p_teen_id) AS is_muted
  FROM circles c
  WHERE c.id = p_circle_id AND c.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to send a message and update circle stats
CREATE OR REPLACE FUNCTION send_circle_message(
  p_circle_id UUID,
  p_sender_id UUID,
  p_content TEXT,
  p_message_type VARCHAR DEFAULT 'text',
  p_media_url TEXT DEFAULT NULL,
  p_reply_to_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Insert message
  INSERT INTO circle_messages (circle_id, sender_id, content, message_type, media_url, reply_to_id, metadata)
  VALUES (p_circle_id, p_sender_id, p_content, p_message_type, p_media_url, p_reply_to_id, p_metadata)
  RETURNING id INTO v_message_id;

  -- Update circle stats
  UPDATE circles
  SET
    last_activity_at = NOW(),
    message_count = message_count + 1,
    updated_at = NOW()
  WHERE id = p_circle_id;

  -- Update member stats
  UPDATE circle_members
  SET
    messages_sent = messages_sent + 1,
    updated_at = NOW()
  WHERE circle_id = p_circle_id AND teen_id = p_sender_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add reaction to message
CREATE OR REPLACE FUNCTION add_message_reaction(
  p_message_id UUID,
  p_teen_id UUID,
  p_emoji VARCHAR
) RETURNS JSONB AS $$
DECLARE
  v_reactions JSONB;
  v_emoji_reactions JSONB;
BEGIN
  SELECT reactions INTO v_reactions FROM circle_messages WHERE id = p_message_id;

  -- Get current reactions for this emoji
  v_emoji_reactions := COALESCE(v_reactions->p_emoji, '[]'::jsonb);

  -- Check if user already reacted with this emoji
  IF NOT (v_emoji_reactions ? p_teen_id::text) THEN
    v_emoji_reactions := v_emoji_reactions || to_jsonb(p_teen_id::text);
  END IF;

  -- Update reactions
  v_reactions := jsonb_set(COALESCE(v_reactions, '{}'::jsonb), ARRAY[p_emoji], v_emoji_reactions);

  UPDATE circle_messages SET reactions = v_reactions WHERE id = p_message_id;

  RETURN v_reactions;
END;
$$ LANGUAGE plpgsql;

-- Function to remove reaction from message
CREATE OR REPLACE FUNCTION remove_message_reaction(
  p_message_id UUID,
  p_teen_id UUID,
  p_emoji VARCHAR
) RETURNS JSONB AS $$
DECLARE
  v_reactions JSONB;
  v_emoji_reactions JSONB;
BEGIN
  SELECT reactions INTO v_reactions FROM circle_messages WHERE id = p_message_id;

  -- Get current reactions for this emoji
  v_emoji_reactions := COALESCE(v_reactions->p_emoji, '[]'::jsonb);

  -- Remove user from reactions
  v_emoji_reactions := (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(v_emoji_reactions) elem
    WHERE elem::text != ('"' || p_teen_id::text || '"')
  );

  -- Update or remove emoji key
  IF v_emoji_reactions IS NULL OR jsonb_array_length(v_emoji_reactions) = 0 THEN
    v_reactions := v_reactions - p_emoji;
  ELSE
    v_reactions := jsonb_set(v_reactions, ARRAY[p_emoji], v_emoji_reactions);
  END IF;

  UPDATE circle_messages SET reactions = v_reactions WHERE id = p_message_id;

  RETURN v_reactions;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_challenges ENABLE ROW LEVEL SECURITY;

-- Circles: viewable by members, public circles visible to all
CREATE POLICY circles_select ON circles FOR SELECT USING (
  is_active = true AND (
    circle_type = 'public' OR
    EXISTS (SELECT 1 FROM circle_members WHERE circle_id = id AND teen_id = auth.uid() AND status = 'active')
  )
);

CREATE POLICY circles_insert ON circles FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY circles_update ON circles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM circle_members WHERE circle_id = id AND teen_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Circle members: viewable by other members
CREATE POLICY circle_members_select ON circle_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM circle_members cm WHERE cm.circle_id = circle_id AND cm.teen_id = auth.uid() AND cm.status = 'active')
);

-- Messages: viewable by circle members
CREATE POLICY circle_messages_select ON circle_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM circle_members WHERE circle_id = circle_messages.circle_id AND teen_id = auth.uid() AND status = 'active')
);

CREATE POLICY circle_messages_insert ON circle_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM circle_members WHERE circle_id = circle_messages.circle_id AND teen_id = auth.uid() AND status = 'active')
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-add creator as owner member
CREATE OR REPLACE FUNCTION auto_add_circle_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO circle_members (circle_id, teen_id, role, status)
  VALUES (NEW.id, NEW.created_by, 'owner', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_add_circle_owner
AFTER INSERT ON circles
FOR EACH ROW
EXECUTE FUNCTION auto_add_circle_owner();

-- Award XP when joining a circle
CREATE OR REPLACE FUNCTION award_circle_join_xp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
    PERFORM add_xp_to_user(
      NEW.teen_id,
      10,
      'circle_join',
      NEW.circle_id,
      'Rejoint un cercle'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_circle_join_xp
AFTER INSERT OR UPDATE ON circle_members
FOR EACH ROW
EXECUTE FUNCTION award_circle_join_xp();

COMMENT ON TABLE circles IS 'Cercles/groupes de teens pour communiquer et partager des activites';
COMMENT ON TABLE circle_members IS 'Membres des cercles avec roles et parametres';
COMMENT ON TABLE circle_messages IS 'Messages dans les cercles avec support media et reactions';
COMMENT ON TABLE circle_challenges IS 'Defis partages au sein des cercles';
