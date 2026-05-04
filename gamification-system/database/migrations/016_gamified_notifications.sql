-- ============================================================================
-- TEENS PARTY MOROCCO - Gamified Notifications System
-- ============================================================================
-- Migration: 016_gamified_notifications.sql
-- Description: Système de notifications gamifiées intelligentes
-- ============================================================================

-- ============================================================================
-- NOTIFICATION TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- achievement, social, event, challenge, reward, system

    -- Contenu
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    icon VARCHAR(50),
    emoji VARCHAR(10),

    -- Style
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    color VARCHAR(20),
    animation VARCHAR(50), -- confetti, glow, shake, bounce
    sound VARCHAR(50), -- success, achievement, social, alert

    -- Gamification
    xp_reward INTEGER DEFAULT 0,
    coin_reward INTEGER DEFAULT 0,

    -- Configuration
    is_pushable BOOLEAN DEFAULT true,
    is_dismissable BOOLEAN DEFAULT true,
    auto_dismiss_seconds INTEGER,
    requires_action BOOLEAN DEFAULT false,
    action_url TEXT,
    action_label VARCHAR(50),

    -- Grouping
    group_key VARCHAR(50), -- Pour grouper les notifs similaires
    max_group_size INTEGER DEFAULT 5,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES notification_templates(id),

    -- Contenu personnalisé
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon VARCHAR(50),
    emoji VARCHAR(10),
    image_url TEXT,

    -- Données additionnelles
    data JSONB DEFAULT '{}',

    -- Style hérité ou personnalisé
    priority VARCHAR(20) DEFAULT 'normal',
    color VARCHAR(20),
    animation VARCHAR(50),

    -- Récompenses
    xp_reward INTEGER DEFAULT 0,
    coin_reward INTEGER DEFAULT 0,
    rewards_claimed BOOLEAN DEFAULT false,

    -- Action
    action_url TEXT,
    action_label VARCHAR(50),

    -- État
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    is_clicked BOOLEAN DEFAULT false,
    clicked_at TIMESTAMPTZ,
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,

    -- Grouping
    group_key VARCHAR(50),
    group_count INTEGER DEFAULT 1,

    -- Push notification
    push_sent BOOLEAN DEFAULT false,
    push_sent_at TIMESTAMPTZ,
    push_clicked BOOLEAN DEFAULT false,

    -- Scheduling
    scheduled_for TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_scheduled ON user_notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_notifications_group ON user_notifications(user_id, group_key) WHERE group_key IS NOT NULL;

-- ============================================================================
-- NOTIFICATION PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Canaux
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,

    -- Catégories
    achievements_enabled BOOLEAN DEFAULT true,
    social_enabled BOOLEAN DEFAULT true,
    events_enabled BOOLEAN DEFAULT true,
    challenges_enabled BOOLEAN DEFAULT true,
    rewards_enabled BOOLEAN DEFAULT true,
    system_enabled BOOLEAN DEFAULT true,

    -- Horaires (ne pas déranger)
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,

    -- Fréquence
    digest_enabled BOOLEAN DEFAULT false, -- Recevoir un résumé quotidien
    digest_time TIME DEFAULT '18:00',
    max_daily_push INTEGER DEFAULT 10,

    -- Sons
    sounds_enabled BOOLEAN DEFAULT true,
    vibration_enabled BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- ============================================================================
-- NOTIFICATION TRIGGERS (règles automatiques)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Événement déclencheur
    trigger_event VARCHAR(100) NOT NULL, -- level_up, badge_earned, friend_request, etc.
    trigger_conditions JSONB DEFAULT '{}', -- Conditions additionnelles

    -- Template à utiliser
    template_id UUID REFERENCES notification_templates(id),

    -- Délai
    delay_minutes INTEGER DEFAULT 0,

    -- Limites
    cooldown_minutes INTEGER, -- Temps minimum entre deux notifs du même trigger
    max_per_day INTEGER,
    max_per_week INTEGER,

    -- Smart timing
    use_smart_timing BOOLEAN DEFAULT false, -- Envoyer au meilleur moment

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATION HISTORY (pour analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES notification_templates(id),

    -- Métriques journalières
    date DATE NOT NULL,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    dismissed_count INTEGER DEFAULT 0,

    -- Récompenses
    total_xp_awarded INTEGER DEFAULT 0,
    total_coins_awarded INTEGER DEFAULT 0,

    -- Engagement
    avg_time_to_read_seconds INTEGER,
    avg_time_to_click_seconds INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(template_id, date)
);

-- ============================================================================
-- PUSH SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Web Push
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,

    -- Device info
    device_type VARCHAR(20), -- web, android, ios
    device_name VARCHAR(100),
    browser VARCHAR(50),

    -- État
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, endpoint)
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Créer une notification à partir d'un template
CREATE OR REPLACE FUNCTION create_notification_from_template(
    p_user_id UUID,
    p_template_slug VARCHAR(100),
    p_data JSONB DEFAULT '{}',
    p_scheduled_for TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template RECORD;
    v_notification_id UUID;
    v_title TEXT;
    v_body TEXT;
    v_prefs RECORD;
    v_key TEXT;
    v_value TEXT;
    v_rec RECORD;
BEGIN
    -- Récupérer le template
    SELECT * INTO v_template
    FROM notification_templates
    WHERE slug = p_template_slug AND is_active = true;

    IF v_template IS NULL THEN
        RETURN NULL;
    END IF;

    -- Vérifier les préférences utilisateur
    SELECT * INTO v_prefs
    FROM notification_preferences
    WHERE user_id = p_user_id;

    -- Vérifier si la catégorie est activée
    IF v_prefs IS NOT NULL THEN
        IF (v_template.category = 'achievement' AND NOT v_prefs.achievements_enabled) OR
           (v_template.category = 'social' AND NOT v_prefs.social_enabled) OR
           (v_template.category = 'event' AND NOT v_prefs.events_enabled) OR
           (v_template.category = 'challenge' AND NOT v_prefs.challenges_enabled) OR
           (v_template.category = 'reward' AND NOT v_prefs.rewards_enabled) OR
           (v_template.category = 'system' AND NOT v_prefs.system_enabled) THEN
            RETURN NULL;
        END IF;
    END IF;

    -- Remplacer les variables dans le titre et le corps
    v_title := v_template.title_template;
    v_body := v_template.body_template;

    -- Remplacer les placeholders avec les données
    FOR v_rec IN SELECT * FROM jsonb_each_text(p_data)
    LOOP
        v_title := REPLACE(v_title, '{{' || v_rec.key || '}}', v_rec.value);
        v_body := REPLACE(v_body, '{{' || v_rec.key || '}}', v_rec.value);
    END LOOP;

    -- Créer la notification
    INSERT INTO user_notifications (
        user_id, template_id, title, body, icon, emoji,
        priority, color, animation,
        xp_reward, coin_reward,
        action_url, action_label,
        group_key, data,
        scheduled_for
    )
    VALUES (
        p_user_id, v_template.id, v_title, v_body, v_template.icon, v_template.emoji,
        v_template.priority, v_template.color, v_template.animation,
        v_template.xp_reward, v_template.coin_reward,
        REPLACE(v_template.action_url, '{{id}}', COALESCE(p_data->>'id', '')), v_template.action_label,
        v_template.group_key, p_data,
        p_scheduled_for
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

-- Envoyer une notification personnalisée
CREATE OR REPLACE FUNCTION send_custom_notification(
    p_user_id UUID,
    p_title TEXT,
    p_body TEXT,
    p_category VARCHAR(50) DEFAULT 'system',
    p_icon VARCHAR(50) DEFAULT NULL,
    p_emoji VARCHAR(10) DEFAULT NULL,
    p_priority VARCHAR(20) DEFAULT 'normal',
    p_color VARCHAR(20) DEFAULT NULL,
    p_animation VARCHAR(50) DEFAULT NULL,
    p_xp_reward INTEGER DEFAULT 0,
    p_coin_reward INTEGER DEFAULT 0,
    p_action_url TEXT DEFAULT NULL,
    p_action_label VARCHAR(50) DEFAULT NULL,
    p_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO user_notifications (
        user_id, title, body, icon, emoji,
        priority, color, animation,
        xp_reward, coin_reward,
        action_url, action_label, data
    )
    VALUES (
        p_user_id, p_title, p_body, p_icon, p_emoji,
        p_priority, p_color, p_animation,
        p_xp_reward, p_coin_reward,
        p_action_url, p_action_label, p_data
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

-- Marquer les notifications comme lues
CREATE OR REPLACE FUNCTION mark_notifications_read(
    p_user_id UUID,
    p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        -- Marquer toutes les notifications non lues
        UPDATE user_notifications SET
            is_read = true,
            read_at = NOW()
        WHERE user_id = p_user_id AND is_read = false;
    ELSE
        -- Marquer les notifications spécifiées
        UPDATE user_notifications SET
            is_read = true,
            read_at = NOW()
        WHERE user_id = p_user_id AND id = ANY(p_notification_ids) AND is_read = false;
    END IF;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Récupérer les notifications d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notifications JSON;
    v_unread_count INTEGER;
    v_total_count INTEGER;
BEGIN
    -- Compter les non lues
    SELECT COUNT(*) INTO v_unread_count
    FROM user_notifications
    WHERE user_id = p_user_id AND is_read = false AND is_dismissed = false
    AND (scheduled_for IS NULL OR scheduled_for <= NOW())
    AND (expires_at IS NULL OR expires_at > NOW());

    -- Récupérer les notifications
    SELECT json_agg(n ORDER BY n.created_at DESC) INTO v_notifications
    FROM (
        SELECT
            id, title, body, icon, emoji, image_url,
            priority, color, animation,
            xp_reward, coin_reward, rewards_claimed,
            action_url, action_label,
            is_read, read_at,
            group_key, group_count,
            data, created_at
        FROM user_notifications
        WHERE user_id = p_user_id
        AND is_dismissed = false
        AND (scheduled_for IS NULL OR scheduled_for <= NOW())
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (NOT p_unread_only OR is_read = false)
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset
    ) n;

    -- Compter le total
    SELECT COUNT(*) INTO v_total_count
    FROM user_notifications
    WHERE user_id = p_user_id AND is_dismissed = false
    AND (scheduled_for IS NULL OR scheduled_for <= NOW())
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (NOT p_unread_only OR is_read = false);

    RETURN json_build_object(
        'notifications', COALESCE(v_notifications, '[]'::json),
        'unread_count', v_unread_count,
        'total_count', v_total_count
    );
END;
$$;

-- Réclamer les récompenses d'une notification
CREATE OR REPLACE FUNCTION claim_notification_rewards(
    p_user_id UUID,
    p_notification_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification RECORD;
BEGIN
    -- Récupérer la notification
    SELECT * INTO v_notification
    FROM user_notifications
    WHERE id = p_notification_id AND user_id = p_user_id;

    IF v_notification IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Notification not found');
    END IF;

    IF v_notification.rewards_claimed THEN
        RETURN json_build_object('success', false, 'error', 'Rewards already claimed');
    END IF;

    IF v_notification.xp_reward = 0 AND v_notification.coin_reward = 0 THEN
        RETURN json_build_object('success', false, 'error', 'No rewards to claim');
    END IF;

    -- Marquer comme réclamé
    UPDATE user_notifications SET
        rewards_claimed = true,
        is_read = true,
        read_at = COALESCE(read_at, NOW())
    WHERE id = p_notification_id;

    -- Les récompenses XP/coins seront ajoutées via les actions côté serveur

    RETURN json_build_object(
        'success', true,
        'xp', v_notification.xp_reward,
        'coins', v_notification.coin_reward
    );
END;
$$;

-- Grouper les notifications similaires
CREATE OR REPLACE FUNCTION group_similar_notifications(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Pour chaque groupe, garder la plus récente et mettre à jour le count
    WITH grouped AS (
        SELECT
            group_key,
            MAX(id) as keep_id,
            COUNT(*) as total_count
        FROM user_notifications
        WHERE user_id = p_user_id
        AND group_key IS NOT NULL
        AND is_read = false
        AND is_dismissed = false
        GROUP BY group_key
        HAVING COUNT(*) > 1
    )
    UPDATE user_notifications n SET
        group_count = g.total_count
    FROM grouped g
    WHERE n.id = g.keep_id;

    -- Marquer les autres comme dismissed
    WITH grouped AS (
        SELECT
            group_key,
            MAX(id) as keep_id
        FROM user_notifications
        WHERE user_id = p_user_id
        AND group_key IS NOT NULL
        AND is_read = false
        AND is_dismissed = false
        GROUP BY group_key
        HAVING COUNT(*) > 1
    )
    UPDATE user_notifications n SET
        is_dismissed = true,
        dismissed_at = NOW()
    FROM grouped g
    WHERE n.group_key = g.group_key
    AND n.id != g.keep_id
    AND n.user_id = p_user_id
    AND n.is_dismissed = false;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view notification templates"
ON notification_templates FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their notifications"
ON user_notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
ON user_notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their preferences"
ON notification_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their preferences"
ON notification_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their preferences"
ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their push subscriptions"
ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- INITIAL DATA - Notification Templates
-- ============================================================================

INSERT INTO notification_templates (slug, category, title_template, body_template, icon, emoji, priority, color, animation, xp_reward, sound, action_url) VALUES

-- Achievements
('level_up', 'achievement', 'Niveau {{level}} atteint ! 🎉', 'Félicitations ! Tu as atteint le niveau {{level}}. Continue comme ça !', 'TrendingUp', '🎉', 'high', '#06b6d4', 'confetti', 50, 'achievement', '/profile'),
('badge_earned', 'achievement', 'Nouveau badge débloqué !', 'Tu as obtenu le badge "{{badge_name}}" ! {{badge_description}}', 'Award', '🏆', 'high', '#f59e0b', 'glow', 25, 'achievement', '/profile/badges'),
('streak_milestone', 'achievement', '{{days}} jours de streak ! 🔥', 'Tu es en feu ! Maintiens ta série pour débloquer des récompenses.', 'Flame', '🔥', 'normal', '#ef4444', 'shake', 10, 'success', '/profile'),

-- Social
('friend_request', 'social', 'Nouvelle demande d''ami', '{{username}} veut t''ajouter en ami !', 'UserPlus', '👋', 'normal', '#8b5cf6', 'bounce', 0, 'social', '/friends/requests'),
('friend_accepted', 'social', 'Demande acceptée !', '{{username}} a accepté ta demande d''ami. Vous êtes maintenant connectés !', 'Users', '🤝', 'normal', '#22c55e', NULL, 5, 'success', '/friends'),
('crew_invite', 'social', 'Invitation à rejoindre un crew', '{{inviter}} t''invite à rejoindre le crew "{{crew_name}}" !', 'Users', '👥', 'normal', '#ec4899', 'bounce', 0, 'social', '/crews/invites'),

-- Events
('event_reminder', 'event', 'Événement bientôt !', '{{event_name}} commence dans {{time_until}}. N''oublie pas !', 'Calendar', '📅', 'high', '#f97316', NULL, 0, 'alert', '/events/{{event_id}}'),
('event_live', 'event', 'C''est parti ! 🎉', '{{event_name}} vient de commencer. Rejoins-nous !', 'Zap', '🎊', 'urgent', '#ef4444', 'shake', 0, 'alert', '/events/{{event_id}}'),
('event_checkin_bonus', 'event', 'Bonus de check-in !', 'Tu as gagné {{xp}} XP et {{coins}} coins pour ton check-in !', 'MapPin', '📍', 'normal', '#22c55e', 'confetti', 0, 'success', NULL),

-- Challenges
('challenge_new', 'challenge', 'Nouveau défi disponible !', '{{challenge_name}} - Relève le défi et gagne des récompenses !', 'Target', '🎯', 'normal', '#3b82f6', NULL, 0, 'success', '/challenges'),
('challenge_completed', 'challenge', 'Défi réussi ! 🏆', 'Tu as complété "{{challenge_name}}" et gagné {{xp}} XP !', 'CheckCircle', '✅', 'high', '#22c55e', 'confetti', 0, 'achievement', '/challenges'),
('duel_received', 'challenge', '{{opponent}} te défie !', 'Tu as reçu un défi de {{opponent}}. Acceptes-tu ?', 'Swords', '⚔️', 'high', '#ef4444', 'shake', 0, 'alert', '/challenges/duels'),
('duel_result', 'challenge', 'Résultat du duel', '{{result_message}}', 'Trophy', '🏅', 'normal', '#f59e0b', NULL, 0, 'success', '/challenges/duels'),

-- Rewards
('daily_reward', 'reward', 'Récompense quotidienne !', 'Connecte-toi chaque jour pour des récompenses croissantes !', 'Gift', '🎁', 'normal', '#8b5cf6', 'bounce', 0, 'success', '/rewards'),
('wheel_available', 'reward', 'Roue de la Fortune disponible !', 'Ta rotation quotidienne t''attend. Tente ta chance !', 'Circle', '🎡', 'normal', '#f59e0b', 'bounce', 0, 'success', '/fortune-wheel'),
('shop_item_available', 'reward', 'Nouvel article disponible !', '"{{item_name}}" est maintenant disponible dans la boutique.', 'ShoppingBag', '🛍️', 'low', '#ec4899', NULL, 0, 'success', '/shop'),

-- System
('weekly_recap', 'system', 'Ton récap de la semaine', 'Tu as gagné {{xp}} XP cette semaine. {{message}}', 'BarChart', '📊', 'low', '#6b7280', NULL, 0, NULL, '/stats'),
('inactivity_reminder', 'system', 'Tu nous manques !', 'Ça fait {{days}} jours qu''on ne t''a pas vu. Reviens vite !', 'Heart', '💔', 'normal', '#ef4444', NULL, 10, 'social', '/'),
('new_feature', 'system', 'Nouvelle fonctionnalité !', '{{feature_name}} est maintenant disponible. Découvre-le !', 'Sparkles', '✨', 'normal', '#8b5cf6', 'glow', 0, 'success', '{{feature_url}}')

ON CONFLICT (slug) DO UPDATE SET
    title_template = EXCLUDED.title_template,
    body_template = EXCLUDED.body_template,
    icon = EXCLUDED.icon,
    emoji = EXCLUDED.emoji,
    priority = EXCLUDED.priority,
    color = EXCLUDED.color,
    animation = EXCLUDED.animation,
    xp_reward = EXCLUDED.xp_reward,
    sound = EXCLUDED.sound,
    action_url = EXCLUDED.action_url;

-- ============================================================================
-- NOTIFICATION TRIGGERS
-- ============================================================================

INSERT INTO notification_triggers (slug, name, description, trigger_event, template_id, delay_minutes, cooldown_minutes, use_smart_timing)
SELECT
    'trigger_' || slug,
    'Trigger for ' || slug,
    'Automatic trigger for ' || category || ' notifications',
    slug,
    id,
    0,
    CASE
        WHEN category = 'achievement' THEN 0
        WHEN category = 'social' THEN 5
        WHEN category = 'event' THEN 0
        ELSE 30
    END,
    CASE WHEN category IN ('reward', 'system') THEN true ELSE false END
FROM notification_templates
WHERE category != 'system'
ON CONFLICT (slug) DO NOTHING;

COMMIT;
