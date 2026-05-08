-- ============================================================================
-- MIGRATION 088: DIRECT MESSAGES (1:1 between accepted friends)
-- ============================================================================
-- TICKET-046 — Wave 3 U5 — back the /teen/messages surface with real tables.
--
-- Design:
--   * `direct_conversations` — one row per ordered pair of teens (user1<user2)
--   * `direct_messages`      — content rows referencing a conversation
--   * RLS gate: a row is visible / writable only if both participants are in
--     `friendships` with status = 'accepted'.
--
-- Both tables are *additive* — they coexist with `circle_messages` (groups)
-- and the orphan references to `teen_messages` / `teen_conversations` that
-- existed before this migration are migrated away in the application code.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- direct_conversations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS direct_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ordered pair of participants (user1_id < user2_id) for uniqueness.
  user1_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Cached preview values (kept up to date by the API on send).
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  last_sender_id UUID REFERENCES teens(id) ON DELETE SET NULL,

  -- Per-side unread counters. Incremented on send, zeroed on read.
  unread_count_user1 INTEGER NOT NULL DEFAULT 0,
  unread_count_user2 INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT direct_conversations_order CHECK (user1_id < user2_id),
  UNIQUE(user1_id, user2_id)
);

CREATE INDEX IF NOT EXISTS idx_direct_conversations_user1
  ON direct_conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_direct_conversations_user2
  ON direct_conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_direct_conversations_last_message_at
  ON direct_conversations(last_message_at DESC NULLS LAST);

-- ---------------------------------------------------------------------------
-- direct_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES direct_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),

  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_created
  ON direct_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_unread
  ON direct_messages(recipient_id, is_read)
  WHERE is_read = FALSE;

-- ---------------------------------------------------------------------------
-- Helper RPC — open or fetch the conversation between two accepted friends.
-- Returns NULL if the two teens are not currently friends.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ensure_direct_conversation(
  p_self UUID,
  p_other UUID
) RETURNS UUID AS $$
DECLARE
  v_u1 UUID;
  v_u2 UUID;
  v_id UUID;
BEGIN
  IF p_self = p_other THEN RETURN NULL; END IF;
  IF p_self < p_other THEN
    v_u1 := p_self; v_u2 := p_other;
  ELSE
    v_u1 := p_other; v_u2 := p_self;
  END IF;

  -- Friendship gate: accepted only.
  IF NOT EXISTS (
    SELECT 1 FROM friendships
    WHERE user1_id = v_u1 AND user2_id = v_u2 AND status = 'accepted'
  ) THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_id FROM direct_conversations
    WHERE user1_id = v_u1 AND user2_id = v_u2;

  IF v_id IS NULL THEN
    INSERT INTO direct_conversations (user1_id, user2_id)
      VALUES (v_u1, v_u2)
      RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Drop pre-existing policies (idempotent re-run).
DROP POLICY IF EXISTS direct_conversations_select ON direct_conversations;
DROP POLICY IF EXISTS direct_conversations_insert ON direct_conversations;
DROP POLICY IF EXISTS direct_conversations_update ON direct_conversations;
DROP POLICY IF EXISTS direct_messages_select ON direct_messages;
DROP POLICY IF EXISTS direct_messages_insert ON direct_messages;
DROP POLICY IF EXISTS direct_messages_update ON direct_messages;

-- A conversation is visible to its two participants only, and only if they
-- are still accepted friends (defence-in-depth — defriending hides the chat).
CREATE POLICY direct_conversations_select ON direct_conversations
  FOR SELECT USING (
    (auth.uid() = user1_id OR auth.uid() = user2_id)
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.user1_id = direct_conversations.user1_id
        AND f.user2_id = direct_conversations.user2_id
        AND f.status = 'accepted'
    )
  );

CREATE POLICY direct_conversations_insert ON direct_conversations
  FOR INSERT WITH CHECK (
    (auth.uid() = user1_id OR auth.uid() = user2_id)
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.user1_id = direct_conversations.user1_id
        AND f.user2_id = direct_conversations.user2_id
        AND f.status = 'accepted'
    )
  );

CREATE POLICY direct_conversations_update ON direct_conversations
  FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- A message is visible to sender + recipient only.
CREATE POLICY direct_messages_select ON direct_messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

-- Insert: sender must be auth.uid() AND sender/recipient must be accepted friends.
CREATE POLICY direct_messages_insert ON direct_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM friendships f
      WHERE (
        (f.user1_id = direct_messages.sender_id AND f.user2_id = direct_messages.recipient_id)
        OR
        (f.user1_id = direct_messages.recipient_id AND f.user2_id = direct_messages.sender_id)
      )
      AND f.status = 'accepted'
    )
  );

-- Update: only the recipient can flip `is_read` on a message addressed to them.
CREATE POLICY direct_messages_update ON direct_messages
  FOR UPDATE USING (auth.uid() = recipient_id);

COMMENT ON TABLE direct_conversations IS 'TICKET-046 — 1:1 chat threads between accepted friends.';
COMMENT ON TABLE direct_messages IS 'TICKET-046 — messages inside a direct_conversation; sender+recipient visibility only.';
COMMENT ON FUNCTION ensure_direct_conversation(UUID, UUID) IS 'Returns the conversation id between two accepted friends, creating it on demand. Returns NULL when the friendship gate fails.';
