-- =========================================================================
-- 081_friend_challenge_notifs.sql
-- TICKET-023 [friend-defi] Notification templates seed
--
-- Sub-agent: FD5 (Wave 2)
--
-- Purpose: seed notification_templates rows consumed by friend-challenge
-- v2 lifecycle hooks (FD1 create/accept/decline RPCs + FD4 resolution
-- cron). This migration is data-only: no schema change, no RPC, no cron.
--
-- Slug convention: friend_challenge_{event}.
-- Placeholders ({{var}}) are substituted by create_notification() in
-- migration 016. Required vars per slug:
--   - friend_challenge_invited:   {{opponent_name}}
--   - friend_challenge_accepted:  {{opponent_name}}
--   - friend_challenge_declined:  {{opponent_name}}
--   - friend_challenge_won:       {{opponent_name}}, {{xp}}
--   - friend_challenge_lost:      {{opponent_name}}
--   - friend_challenge_expired:   {{opponent_name}}
--
-- Tone: neutral, factual, no FOMO. No urgency/shame copy.
-- Category 'challenge' aligns with notification_preferences gating in
-- create_notification().
--
-- Idempotent: ON CONFLICT (slug) DO UPDATE keeps copy authoritative here.
-- =========================================================================

INSERT INTO notification_templates (
  slug, category, title_template, body_template,
  icon, emoji, priority, color, animation, sound,
  xp_reward, coin_reward,
  is_pushable, requires_action,
  action_url, action_label,
  group_key, is_active
) VALUES
  -- Invitation received (creator -> opponent)
  ('friend_challenge_invited', 'challenge',
   '{{opponent_name}} t''a défié à un quiz',
   'Tu peux accepter ou décliner depuis tes défis.',
   'Swords', NULL, 'normal', '#3b82f6', NULL, 'social',
   0, 0,
   true, true,
   '/gamification/defis', 'Voir le défi',
   'friend_challenge', true),

  -- Accepted (opponent -> creator)
  ('friend_challenge_accepted', 'challenge',
   '{{opponent_name}} a accepté ton défi',
   'Le défi est lancé. Bonne chance.',
   'Check', NULL, 'normal', '#22c55e', NULL, 'success',
   0, 0,
   true, false,
   '/gamification/defis', 'Voir le défi',
   'friend_challenge', true),

  -- Declined (opponent -> creator)
  ('friend_challenge_declined', 'challenge',
   '{{opponent_name}} a décliné ton défi',
   'Tu peux en lancer un autre quand tu veux.',
   'X', NULL, 'low', '#94a3b8', NULL, NULL,
   0, 0,
   true, false,
   '/gamification/defis', NULL,
   'friend_challenge', true),

  -- Resolved win (cron -> winner)
  ('friend_challenge_won', 'challenge',
   'Tu as gagné le défi vs {{opponent_name}}',
   'Tu remportes {{xp}} XP.',
   'Trophy', NULL, 'normal', '#f59e0b', NULL, 'success',
   0, 0,
   true, false,
   '/gamification/defis', 'Voir le récap',
   'friend_challenge', true),

  -- Resolved loss (cron -> loser)
  ('friend_challenge_lost', 'challenge',
   'Tu as perdu le défi vs {{opponent_name}}',
   'Tu peux retenter ta chance plus tard.',
   'Trophy', NULL, 'low', '#94a3b8', NULL, NULL,
   0, 0,
   true, false,
   '/gamification/defis', 'Voir le récap',
   'friend_challenge', true),

  -- Expired pending (cron -> creator)
  ('friend_challenge_expired', 'challenge',
   'Le défi vs {{opponent_name}} a expiré',
   'L''invitation n''a pas été acceptée à temps.',
   'Clock', NULL, 'low', '#94a3b8', NULL, NULL,
   0, 0,
   true, false,
   '/gamification/defis', NULL,
   'friend_challenge', true)

ON CONFLICT (slug) DO UPDATE SET
  category       = EXCLUDED.category,
  title_template = EXCLUDED.title_template,
  body_template  = EXCLUDED.body_template,
  icon           = EXCLUDED.icon,
  emoji          = EXCLUDED.emoji,
  priority       = EXCLUDED.priority,
  color          = EXCLUDED.color,
  animation      = EXCLUDED.animation,
  sound          = EXCLUDED.sound,
  xp_reward      = EXCLUDED.xp_reward,
  coin_reward    = EXCLUDED.coin_reward,
  is_pushable    = EXCLUDED.is_pushable,
  requires_action = EXCLUDED.requires_action,
  action_url     = EXCLUDED.action_url,
  action_label   = EXCLUDED.action_label,
  group_key      = EXCLUDED.group_key,
  is_active      = EXCLUDED.is_active;

-- =========================================================================
-- Verification (informational; safe to leave in migration as a SELECT
-- inside DO block would not return; this is a no-op COMMENT on table).
-- =========================================================================
COMMENT ON TABLE notification_templates IS
  'Notification templates. Friend-challenge slugs (081): invited, accepted, declined, won, lost, expired.';
