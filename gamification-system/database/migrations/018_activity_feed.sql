-- ============================================================================
-- TEENS PARTY MOROCCO - Social Activity Feed
-- ============================================================================
-- Migration: 018_activity_feed.sql
-- Description: Fil d'activité social des amis
-- ============================================================================

-- ============================================================================
-- ACTIVITY TYPES
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    emoji VARCHAR(10),
    color VARCHAR(20),
    category VARCHAR(50) NOT NULL, -- achievement, social, event, game, collection, milestone
    is_public_by_default BOOLEAN DEFAULT true,
    points INTEGER DEFAULT 0, -- Points de visibilité dans le feed
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER ACTIVITIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type_id UUID NOT NULL REFERENCES activity_types(id),

    -- Contenu
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,

    -- Données additionnelles
    data JSONB DEFAULT '{}', -- Données spécifiques au type d'activité
    target_id UUID, -- ID de l'objet concerné (badge, event, etc.)
    target_type VARCHAR(50), -- Type de l'objet

    -- Interactions
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,

    -- Visibilité
    visibility VARCHAR(20) DEFAULT 'friends', -- public, friends, private
    is_pinned BOOLEAN DEFAULT false,
    is_highlighted BOOLEAN DEFAULT false, -- Pour les achievements importants

    -- Modération
    is_hidden BOOLEAN DEFAULT false,
    hidden_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_visibility ON user_activities(visibility, created_at DESC);

-- ============================================================================
-- ACTIVITY LIKES
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES user_activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) DEFAULT 'like', -- like, love, fire, party, congrats
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(activity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_likes_activity ON activity_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_user ON activity_likes(user_id);

-- ============================================================================
-- ACTIVITY COMMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES user_activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE, -- Pour les réponses
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON activity_comments(activity_id, created_at);

-- ============================================================================
-- ACTIVITY FEED PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_feed_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

    -- Qui voir
    show_friends_activities BOOLEAN DEFAULT true,
    show_crew_activities BOOLEAN DEFAULT true,
    show_following_activities BOOLEAN DEFAULT true,

    -- Types à voir
    show_achievements BOOLEAN DEFAULT true,
    show_level_ups BOOLEAN DEFAULT true,
    show_events BOOLEAN DEFAULT true,
    show_games BOOLEAN DEFAULT true,
    show_collections BOOLEAN DEFAULT true,
    show_social BOOLEAN DEFAULT true,

    -- Notifications feed
    notify_likes BOOLEAN DEFAULT true,
    notify_comments BOOLEAN DEFAULT true,
    notify_mentions BOOLEAN DEFAULT true,

    -- Ordre
    feed_order VARCHAR(20) DEFAULT 'recent', -- recent, popular, relevance

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ACTIVITY VISIBILITY SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_visibility_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

    -- Paramètres de publication automatique
    auto_publish_badges BOOLEAN DEFAULT true,
    auto_publish_level_ups BOOLEAN DEFAULT true,
    auto_publish_event_attendance BOOLEAN DEFAULT true,
    auto_publish_challenges BOOLEAN DEFAULT true,
    auto_publish_collections BOOLEAN DEFAULT true,
    auto_publish_crew_joins BOOLEAN DEFAULT false,

    -- Visibilité par défaut
    default_visibility VARCHAR(20) DEFAULT 'friends', -- public, friends, private

    -- Contrôle
    allow_comments BOOLEAN DEFAULT true,
    allow_likes BOOLEAN DEFAULT true,
    allow_shares BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Créer une activité
CREATE OR REPLACE FUNCTION create_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}',
    p_target_id UUID DEFAULT NULL,
    p_target_type VARCHAR(50) DEFAULT NULL,
    p_visibility VARCHAR(20) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_type RECORD;
    v_visibility_settings RECORD;
    v_activity_id UUID;
    v_final_visibility VARCHAR(20);
BEGIN
    -- Récupérer le type d'activité
    SELECT * INTO v_type
    FROM activity_types
    WHERE slug = p_activity_type AND is_active = true;

    IF v_type IS NULL THEN
        RETURN NULL;
    END IF;

    -- Récupérer les préférences de visibilité de l'utilisateur
    SELECT * INTO v_visibility_settings
    FROM activity_visibility_settings
    WHERE user_id = p_user_id;

    -- Déterminer la visibilité
    IF p_visibility IS NOT NULL THEN
        v_final_visibility := p_visibility;
    ELSIF v_visibility_settings IS NOT NULL THEN
        v_final_visibility := v_visibility_settings.default_visibility;
    ELSE
        v_final_visibility := CASE WHEN v_type.is_public_by_default THEN 'public' ELSE 'friends' END;
    END IF;

    -- Créer l'activité
    INSERT INTO user_activities (
        user_id, activity_type_id, title, description, image_url,
        data, target_id, target_type, visibility
    )
    VALUES (
        p_user_id, v_type.id, p_title, p_description, p_image_url,
        p_data, p_target_id, p_target_type, v_final_visibility
    )
    RETURNING id INTO v_activity_id;

    RETURN v_activity_id;
END;
$$;

-- Récupérer le feed d'un utilisateur
CREATE OR REPLACE FUNCTION get_activity_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_feed_type VARCHAR(20) DEFAULT 'friends' -- friends, public, personal
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_activities JSON;
    v_prefs RECORD;
BEGIN
    -- Récupérer les préférences
    SELECT * INTO v_prefs
    FROM activity_feed_preferences
    WHERE user_id = p_user_id;

    -- Récupérer les activités selon le type de feed
    IF p_feed_type = 'personal' THEN
        -- Mes propres activités
        SELECT json_agg(activity ORDER BY activity.created_at DESC) INTO v_activities
        FROM (
            SELECT
                ua.id,
                ua.user_id,
                ua.title,
                ua.description,
                ua.image_url,
                ua.data,
                ua.target_id,
                ua.target_type,
                ua.likes_count,
                ua.comments_count,
                ua.shares_count,
                ua.visibility,
                ua.is_pinned,
                ua.is_highlighted,
                ua.created_at,
                at.slug as activity_type,
                at.icon,
                at.emoji,
                at.color,
                at.category,
                EXISTS(SELECT 1 FROM activity_likes WHERE activity_id = ua.id AND user_id = p_user_id) as liked_by_me
            FROM user_activities ua
            JOIN activity_types at ON at.id = ua.activity_type_id
            WHERE ua.user_id = p_user_id
            AND ua.is_hidden = false
            ORDER BY ua.is_pinned DESC, ua.created_at DESC
            LIMIT p_limit OFFSET p_offset
        ) activity;
    ELSIF p_feed_type = 'public' THEN
        -- Activités publiques de tout le monde
        SELECT json_agg(activity ORDER BY activity.created_at DESC) INTO v_activities
        FROM (
            SELECT
                ua.id,
                ua.user_id,
                ua.title,
                ua.description,
                ua.image_url,
                ua.data,
                ua.likes_count,
                ua.comments_count,
                ua.visibility,
                ua.is_highlighted,
                ua.created_at,
                at.slug as activity_type,
                at.icon,
                at.emoji,
                at.color,
                at.category,
                EXISTS(SELECT 1 FROM activity_likes WHERE activity_id = ua.id AND user_id = p_user_id) as liked_by_me
            FROM user_activities ua
            JOIN activity_types at ON at.id = ua.activity_type_id
            WHERE ua.visibility = 'public'
            AND ua.is_hidden = false
            ORDER BY ua.created_at DESC
            LIMIT p_limit OFFSET p_offset
        ) activity;
    ELSE
        -- Activités des amis
        SELECT json_agg(activity ORDER BY activity.created_at DESC) INTO v_activities
        FROM (
            SELECT
                ua.id,
                ua.user_id,
                ua.title,
                ua.description,
                ua.image_url,
                ua.data,
                ua.likes_count,
                ua.comments_count,
                ua.visibility,
                ua.is_highlighted,
                ua.created_at,
                at.slug as activity_type,
                at.icon,
                at.emoji,
                at.color,
                at.category,
                EXISTS(SELECT 1 FROM activity_likes WHERE activity_id = ua.id AND user_id = p_user_id) as liked_by_me
            FROM user_activities ua
            JOIN activity_types at ON at.id = ua.activity_type_id
            WHERE (
                -- Mes propres activités
                ua.user_id = p_user_id
                OR
                -- Activités des amis (visibilité friends ou public)
                (
                    ua.user_id IN (
                        SELECT t.id FROM friend_connections fc
                        JOIN teens t ON t.id = fc.friend_teen_id
                        WHERE fc.teen_id = (SELECT id FROM teens WHERE parent_id = p_user_id LIMIT 1) AND fc.status = 'accepted'
                        UNION
                        SELECT t.id FROM friend_connections fc
                        JOIN teens t ON t.id = fc.teen_id
                        WHERE fc.friend_teen_id = (SELECT id FROM teens WHERE parent_id = p_user_id LIMIT 1) AND fc.status = 'accepted'
                    )
                    AND ua.visibility IN ('public', 'friends')
                )
            )
            AND ua.is_hidden = false
            -- Filtrer par catégories selon les préférences
            AND (
                v_prefs IS NULL
                OR (at.category = 'achievement' AND COALESCE(v_prefs.show_achievements, true))
                OR (at.category = 'social' AND COALESCE(v_prefs.show_social, true))
                OR (at.category = 'event' AND COALESCE(v_prefs.show_events, true))
                OR (at.category = 'game' AND COALESCE(v_prefs.show_games, true))
                OR (at.category = 'collection' AND COALESCE(v_prefs.show_collections, true))
                OR (at.category = 'milestone' AND COALESCE(v_prefs.show_level_ups, true))
            )
            ORDER BY ua.created_at DESC
            LIMIT p_limit OFFSET p_offset
        ) activity;
    END IF;

    RETURN json_build_object(
        'activities', COALESCE(v_activities, '[]'::json),
        'has_more', (SELECT COUNT(*) > p_limit + p_offset FROM user_activities WHERE user_id = p_user_id)
    );
END;
$$;

-- Liker/Unliker une activité
CREATE OR REPLACE FUNCTION toggle_activity_like(
    p_user_id UUID,
    p_activity_id UUID,
    p_reaction_type VARCHAR(20) DEFAULT 'like'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing RECORD;
    v_new_count INTEGER;
BEGIN
    -- Vérifier si déjà liké
    SELECT * INTO v_existing
    FROM activity_likes
    WHERE activity_id = p_activity_id AND user_id = p_user_id;

    IF v_existing IS NOT NULL THEN
        -- Unlike
        DELETE FROM activity_likes WHERE id = v_existing.id;
        UPDATE user_activities SET likes_count = GREATEST(0, likes_count - 1) WHERE id = p_activity_id
        RETURNING likes_count INTO v_new_count;
        RETURN json_build_object('liked', false, 'count', v_new_count);
    ELSE
        -- Like
        INSERT INTO activity_likes (activity_id, user_id, reaction_type)
        VALUES (p_activity_id, p_user_id, p_reaction_type);
        UPDATE user_activities SET likes_count = likes_count + 1 WHERE id = p_activity_id
        RETURNING likes_count INTO v_new_count;
        RETURN json_build_object('liked', true, 'count', v_new_count);
    END IF;
END;
$$;

-- Ajouter un commentaire
CREATE OR REPLACE FUNCTION add_activity_comment(
    p_user_id UUID,
    p_activity_id UUID,
    p_content TEXT,
    p_parent_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_comment_id UUID;
    v_new_count INTEGER;
BEGIN
    INSERT INTO activity_comments (activity_id, user_id, content, parent_id)
    VALUES (p_activity_id, p_user_id, p_content, p_parent_id)
    RETURNING id INTO v_comment_id;

    UPDATE user_activities SET comments_count = comments_count + 1 WHERE id = p_activity_id
    RETURNING comments_count INTO v_new_count;

    RETURN json_build_object(
        'comment_id', v_comment_id,
        'count', v_new_count
    );
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_visibility_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone can view activity types" ON activity_types;
CREATE POLICY "Anyone can view activity types" ON activity_types FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can view visible activities" ON user_activities;
CREATE POLICY "Users can view visible activities" ON user_activities FOR SELECT USING (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (
        visibility = 'friends'
        AND user_id IN (
            SELECT t2.parent_id FROM friend_connections fc
            JOIN teens t1 ON t1.id = fc.friend_teen_id
            JOIN teens t2 ON t2.id = fc.teen_id
            WHERE t1.parent_id = auth.uid() AND fc.status = 'accepted'
            UNION
            SELECT t2.parent_id FROM friend_connections fc
            JOIN teens t1 ON t1.id = fc.teen_id
            JOIN teens t2 ON t2.id = fc.friend_teen_id
            WHERE t1.parent_id = auth.uid() AND fc.status = 'accepted'
        )
    )
);

DROP POLICY IF EXISTS "Users can manage their activities" ON user_activities;
CREATE POLICY "Users can manage their activities" ON user_activities
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their likes" ON activity_likes;
CREATE POLICY "Users can manage their likes" ON activity_likes
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view comments on visible activities" ON activity_comments;
CREATE POLICY "Users can view comments on visible activities" ON activity_comments
FOR SELECT USING (
    activity_id IN (
        SELECT id FROM user_activities WHERE
            visibility = 'public'
            OR user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can manage their comments" ON activity_comments;
CREATE POLICY "Users can manage their comments" ON activity_comments
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their feed preferences" ON activity_feed_preferences;
CREATE POLICY "Users can manage their feed preferences" ON activity_feed_preferences
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their visibility settings" ON activity_visibility_settings;
CREATE POLICY "Users can manage their visibility settings" ON activity_visibility_settings
FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- INITIAL DATA - Activity Types
-- ============================================================================

INSERT INTO activity_types (slug, name, description, icon, emoji, color, category, is_public_by_default, points) VALUES

-- Achievements
('badge_earned', 'Badge obtenu', 'A débloqué un nouveau badge', 'Award', '🏆', '#f59e0b', 'achievement', true, 10),
('level_up', 'Level up', 'A atteint un nouveau niveau', 'TrendingUp', '⬆️', '#06b6d4', 'milestone', true, 8),
('milestone_reached', 'Milestone atteint', 'A atteint un objectif important', 'Target', '🎯', '#8b5cf6', 'milestone', true, 10),
('streak_achieved', 'Streak atteint', 'A maintenu une série', 'Flame', '🔥', '#ef4444', 'achievement', true, 5),
('vip_tier_up', 'Tier VIP augmenté', 'A atteint un nouveau tier VIP', 'Crown', '👑', '#ffd700', 'milestone', true, 15),

-- Social
('friend_added', 'Nouvel ami', 'Est devenu ami avec quelqu''un', 'UserPlus', '👋', '#22c55e', 'social', false, 3),
('crew_joined', 'Crew rejoint', 'A rejoint un crew', 'Users', '👥', '#3b82f6', 'social', true, 5),
('crew_created', 'Crew créé', 'A créé un nouveau crew', 'Users', '🎉', '#ec4899', 'social', true, 8),

-- Events
('event_attended', 'Événement assisté', 'A assisté à un événement', 'Calendar', '📅', '#f97316', 'event', true, 10),
('event_checkin', 'Check-in événement', 'A fait un check-in à un événement', 'MapPin', '📍', '#22c55e', 'event', true, 5),
('event_review', 'Avis événement', 'A laissé un avis sur un événement', 'Star', '⭐', '#f59e0b', 'event', true, 7),

-- Games
('game_won', 'Partie gagnée', 'A gagné une partie', 'Trophy', '🏅', '#ffd700', 'game', true, 8),
('game_high_score', 'Nouveau record', 'A établi un nouveau record', 'Zap', '⚡', '#8b5cf6', 'game', true, 10),
('duel_won', 'Duel gagné', 'A remporté un duel', 'Swords', '⚔️', '#ef4444', 'game', true, 8),
('challenge_completed', 'Défi complété', 'A terminé un défi', 'CheckCircle', '✅', '#22c55e', 'game', true, 7),

-- Collections
('rare_item_collected', 'Item rare obtenu', 'A obtenu un item rare', 'Gem', '💎', '#06b6d4', 'collection', true, 10),
('collection_completed', 'Collection complétée', 'A complété une collection', 'Layers', '🃏', '#8b5cf6', 'collection', true, 15),
('pack_opened', 'Pack ouvert', 'A ouvert un pack de cartes', 'Package', '📦', '#f59e0b', 'collection', false, 2),

-- Misc
('profile_updated', 'Profil mis à jour', 'A personnalisé son profil', 'User', '✨', '#ec4899', 'social', false, 2),
('first_login', 'Première connexion', 'A rejoint la communauté', 'Sparkles', '🌟', '#06b6d4', 'milestone', true, 5)

ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    emoji = EXCLUDED.emoji,
    color = EXCLUDED.color,
    category = EXCLUDED.category;

COMMIT;
