-- WARNING: this file shares its numeric prefix or filename with another migration.
-- See gamification-system/database/MIGRATION_ORDER.md for the collision matrix
-- and the renumbering plan. Do not add new migrations until the collisions
-- have been resolved with the deployed Supabase instance.

-- ============================================================================
-- TEENS PARTY MOROCCO - Social Sharing System
-- ============================================================================
-- Migration: 019_social_sharing.sql
-- Description: Système de partage sur réseaux sociaux
-- ============================================================================

-- ============================================================================
-- CLEANUP - Supprimer les anciennes tables si elles existent avec mauvaise structure
-- ============================================================================

-- Supprimer les index d'abord
DROP INDEX IF EXISTS idx_user_shares_user;
DROP INDEX IF EXISTS idx_user_shares_platform;
DROP INDEX IF EXISTS idx_user_shares_code;
DROP INDEX IF EXISTS idx_user_sharing_achievements_user;
DROP INDEX IF EXISTS idx_referral_codes_code;
DROP INDEX IF EXISTS idx_referral_uses_code;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS create_share(UUID, VARCHAR, VARCHAR, UUID, VARCHAR, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS check_sharing_achievements(UUID) CASCADE;
DROP FUNCTION IF EXISTS track_share_click(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_or_create_referral_code(UUID) CASCADE;
DROP FUNCTION IF EXISTS use_referral_code(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS complete_referral(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_sharing_updated_at() CASCADE;

-- Supprimer les tables dans le bon ordre (dépendances)
DROP TABLE IF EXISTS referral_uses CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;
DROP TABLE IF EXISTS user_sharing_stats CASCADE;
DROP TABLE IF EXISTS user_sharing_achievements CASCADE;
DROP TABLE IF EXISTS sharing_achievements CASCADE;
DROP TABLE IF EXISTS user_shares CASCADE;
DROP TABLE IF EXISTS share_image_templates CASCADE;
DROP TABLE IF EXISTS share_templates CASCADE;
DROP TABLE IF EXISTS sharing_platforms CASCADE;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Table des plateformes de partage
CREATE TABLE IF NOT EXISTS sharing_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(50),
    base_share_url TEXT,
    url_params JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des templates de partage
CREATE TABLE IF NOT EXISTS share_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL, -- 'badge', 'level_up', 'event', 'achievement', 'challenge', 'stats'

    -- Templates par plateforme
    title_template TEXT NOT NULL,
    description_template TEXT,
    hashtags TEXT[], -- Hashtags par défaut

    -- Image/Media
    default_image_url TEXT,
    generate_image BOOLEAN DEFAULT false,
    image_template_id UUID,

    -- Récompenses
    xp_reward INTEGER DEFAULT 0,
    coins_reward INTEGER DEFAULT 0,
    first_share_bonus INTEGER DEFAULT 0, -- Bonus pour premier partage

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des partages effectués
CREATE TABLE IF NOT EXISTS user_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES share_templates(id),
    platform_id UUID NOT NULL REFERENCES sharing_platforms(id),

    -- Contenu partagé
    content_type VARCHAR(50) NOT NULL,
    content_id UUID, -- ID de l'élément partagé (badge, event, etc.)
    shared_title TEXT NOT NULL,
    shared_description TEXT,
    shared_url TEXT,
    shared_image_url TEXT,

    -- Tracking
    share_code VARCHAR(50) UNIQUE, -- Code unique pour tracking
    click_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0, -- Inscriptions via ce partage

    -- Récompenses
    xp_earned INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    rewards_claimed BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des templates d'images générées
CREATE TABLE IF NOT EXISTS share_image_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,

    -- Dimensions
    width INTEGER DEFAULT 1200,
    height INTEGER DEFAULT 630,

    -- Style
    background_type VARCHAR(50) DEFAULT 'gradient', -- 'gradient', 'image', 'solid'
    background_value TEXT, -- Gradient CSS ou URL ou couleur

    -- Layout JSON
    layout JSONB NOT NULL DEFAULT '{}',
    -- Ex: {"elements": [{"type": "text", "x": 50, "y": 50, "template": "{{username}}"}]}

    -- Fonts
    fonts JSONB DEFAULT '[]',

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des achievements de partage
CREATE TABLE IF NOT EXISTS sharing_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(50),

    -- Conditions
    condition_type VARCHAR(50) NOT NULL, -- 'total_shares', 'platform_shares', 'viral', 'first_share'
    condition_value INTEGER DEFAULT 1,
    condition_platform_id UUID REFERENCES sharing_platforms(id),

    -- Récompenses
    xp_reward INTEGER DEFAULT 0,
    coins_reward INTEGER DEFAULT 0,
    badge_id UUID,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des achievements débloqués
CREATE TABLE IF NOT EXISTS user_sharing_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES sharing_achievements(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, achievement_id)
);

-- Table des statistiques de partage
CREATE TABLE IF NOT EXISTS user_sharing_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Compteurs globaux
    total_shares INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,

    -- Par plateforme (JSONB)
    shares_by_platform JSONB DEFAULT '{}',

    -- Par type de contenu
    shares_by_type JSONB DEFAULT '{}',

    -- Streaks
    current_share_streak INTEGER DEFAULT 0,
    longest_share_streak INTEGER DEFAULT 0,
    last_share_date DATE,

    -- Récompenses totales
    total_xp_earned INTEGER DEFAULT 0,
    total_coins_earned INTEGER DEFAULT 0,

    -- Timestamps
    first_share_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des referrals (invitations)
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,

    -- Récompenses configurées
    referrer_xp_reward INTEGER DEFAULT 100,
    referrer_coins_reward INTEGER DEFAULT 50,
    referee_xp_reward INTEGER DEFAULT 50,
    referee_coins_reward INTEGER DEFAULT 25,

    -- Stats
    total_uses INTEGER DEFAULT 0,
    successful_conversions INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des utilisations de referral
CREATE TABLE IF NOT EXISTS referral_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
    referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'rewarded'

    -- Récompenses
    referrer_rewarded BOOLEAN DEFAULT false,
    referee_rewarded BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    UNIQUE(referred_user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_shares_user ON user_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shares_platform ON user_shares(platform_id);
CREATE INDEX IF NOT EXISTS idx_user_shares_code ON user_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_user_sharing_achievements_user ON user_sharing_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_uses_code ON referral_uses(referral_code_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour créer un partage
CREATE OR REPLACE FUNCTION create_share(
    p_user_id UUID,
    p_platform_slug VARCHAR(50),
    p_content_type VARCHAR(50),
    p_content_id UUID DEFAULT NULL,
    p_template_slug VARCHAR(100) DEFAULT NULL,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_platform sharing_platforms%ROWTYPE;
    v_template share_templates%ROWTYPE;
    v_share_code VARCHAR(50);
    v_share_id UUID;
    v_xp_reward INTEGER := 0;
    v_coins_reward INTEGER := 0;
    v_is_first_share BOOLEAN := false;
    v_stats user_sharing_stats%ROWTYPE;
BEGIN
    -- Récupérer la plateforme
    SELECT * INTO v_platform
    FROM sharing_platforms
    WHERE slug = p_platform_slug AND is_active = true;

    IF v_platform.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Plateforme non trouvée');
    END IF;

    -- Récupérer le template si spécifié
    IF p_template_slug IS NOT NULL THEN
        SELECT * INTO v_template
        FROM share_templates
        WHERE slug = p_template_slug AND is_active = true;
    END IF;

    -- Générer un code de partage unique
    v_share_code := 'TPM' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

    -- Vérifier si c'est le premier partage
    SELECT * INTO v_stats FROM user_sharing_stats WHERE user_id = p_user_id;
    v_is_first_share := (v_stats.total_shares IS NULL OR v_stats.total_shares = 0);

    -- Calculer les récompenses
    IF v_template.id IS NOT NULL THEN
        v_xp_reward := v_template.xp_reward;
        v_coins_reward := v_template.coins_reward;

        IF v_is_first_share THEN
            v_xp_reward := v_xp_reward + COALESCE(v_template.first_share_bonus, 0);
        END IF;
    ELSE
        -- Récompenses par défaut
        v_xp_reward := 10;
        v_coins_reward := 5;

        IF v_is_first_share THEN
            v_xp_reward := v_xp_reward + 25;
            v_coins_reward := v_coins_reward + 10;
        END IF;
    END IF;

    -- Créer le partage
    INSERT INTO user_shares (
        user_id,
        template_id,
        platform_id,
        content_type,
        content_id,
        shared_title,
        shared_description,
        shared_image_url,
        share_code,
        xp_earned,
        coins_earned
    ) VALUES (
        p_user_id,
        v_template.id,
        v_platform.id,
        p_content_type,
        p_content_id,
        COALESCE(p_title, v_template.title_template, 'Partage Teens Party Morocco'),
        COALESCE(p_description, v_template.description_template),
        COALESCE(p_image_url, v_template.default_image_url),
        v_share_code,
        v_xp_reward,
        v_coins_reward
    )
    RETURNING id INTO v_share_id;

    -- Mettre à jour les stats
    INSERT INTO user_sharing_stats (user_id, total_shares, first_share_at)
    VALUES (p_user_id, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        total_shares = user_sharing_stats.total_shares + 1,
        shares_by_platform = jsonb_set(
            COALESCE(user_sharing_stats.shares_by_platform, '{}'),
            ARRAY[v_platform.slug],
            to_jsonb(COALESCE((user_sharing_stats.shares_by_platform->>v_platform.slug)::INTEGER, 0) + 1)
        ),
        shares_by_type = jsonb_set(
            COALESCE(user_sharing_stats.shares_by_type, '{}'),
            ARRAY[p_content_type],
            to_jsonb(COALESCE((user_sharing_stats.shares_by_type->>p_content_type)::INTEGER, 0) + 1)
        ),
        current_share_streak = CASE
            WHEN user_sharing_stats.last_share_date = CURRENT_DATE - INTERVAL '1 day'
            THEN user_sharing_stats.current_share_streak + 1
            WHEN user_sharing_stats.last_share_date = CURRENT_DATE
            THEN user_sharing_stats.current_share_streak
            ELSE 1
        END,
        longest_share_streak = GREATEST(
            user_sharing_stats.longest_share_streak,
            CASE
                WHEN user_sharing_stats.last_share_date = CURRENT_DATE - INTERVAL '1 day'
                THEN user_sharing_stats.current_share_streak + 1
                ELSE user_sharing_stats.current_share_streak
            END
        ),
        last_share_date = CURRENT_DATE,
        total_xp_earned = user_sharing_stats.total_xp_earned + v_xp_reward,
        total_coins_earned = user_sharing_stats.total_coins_earned + v_coins_reward,
        first_share_at = COALESCE(user_sharing_stats.first_share_at, NOW()),
        updated_at = NOW();

    -- Vérifier les achievements
    PERFORM check_sharing_achievements(p_user_id);

    RETURN jsonb_build_object(
        'success', true,
        'share_id', v_share_id,
        'share_code', v_share_code,
        'xp_earned', v_xp_reward,
        'coins_earned', v_coins_reward,
        'is_first_share', v_is_first_share,
        'platform', v_platform.slug
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier les achievements de partage
CREATE OR REPLACE FUNCTION check_sharing_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_achievement sharing_achievements%ROWTYPE;
    v_stats user_sharing_stats%ROWTYPE;
    v_platform_shares INTEGER;
BEGIN
    -- Récupérer les stats
    SELECT * INTO v_stats FROM user_sharing_stats WHERE user_id = p_user_id;

    -- Parcourir les achievements non débloqués
    FOR v_achievement IN
        SELECT sa.*
        FROM sharing_achievements sa
        WHERE sa.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM user_sharing_achievements usa
            WHERE usa.user_id = p_user_id AND usa.achievement_id = sa.id
        )
    LOOP
        -- Vérifier la condition
        CASE v_achievement.condition_type
            WHEN 'total_shares' THEN
                IF v_stats.total_shares >= v_achievement.condition_value THEN
                    INSERT INTO user_sharing_achievements (user_id, achievement_id)
                    VALUES (p_user_id, v_achievement.id);
                END IF;

            WHEN 'platform_shares' THEN
                IF v_achievement.condition_platform_id IS NOT NULL THEN
                    SELECT (v_stats.shares_by_platform->>sp.slug)::INTEGER
                    INTO v_platform_shares
                    FROM sharing_platforms sp
                    WHERE sp.id = v_achievement.condition_platform_id;

                    IF COALESCE(v_platform_shares, 0) >= v_achievement.condition_value THEN
                        INSERT INTO user_sharing_achievements (user_id, achievement_id)
                        VALUES (p_user_id, v_achievement.id);
                    END IF;
                END IF;

            WHEN 'first_share' THEN
                IF v_stats.total_shares >= 1 THEN
                    INSERT INTO user_sharing_achievements (user_id, achievement_id)
                    VALUES (p_user_id, v_achievement.id);
                END IF;

            WHEN 'viral' THEN
                IF v_stats.total_conversions >= v_achievement.condition_value THEN
                    INSERT INTO user_sharing_achievements (user_id, achievement_id)
                    VALUES (p_user_id, v_achievement.id);
                END IF;
        END CASE;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour tracker un clic sur un partage
CREATE OR REPLACE FUNCTION track_share_click(p_share_code VARCHAR(50))
RETURNS JSONB AS $$
DECLARE
    v_share user_shares%ROWTYPE;
BEGIN
    -- Trouver le partage
    SELECT * INTO v_share FROM user_shares WHERE share_code = p_share_code;

    IF v_share.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Partage non trouvé');
    END IF;

    -- Incrémenter le compteur de clics
    UPDATE user_shares
    SET click_count = click_count + 1
    WHERE id = v_share.id;

    -- Mettre à jour les stats utilisateur
    UPDATE user_sharing_stats
    SET total_clicks = total_clicks + 1,
        updated_at = NOW()
    WHERE user_id = v_share.user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_share.user_id,
        'content_type', v_share.content_type,
        'content_id', v_share.content_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour générer/récupérer le code referral d'un utilisateur
CREATE OR REPLACE FUNCTION get_or_create_referral_code(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_referral referral_codes%ROWTYPE;
    v_code VARCHAR(20);
BEGIN
    -- Chercher le code existant
    SELECT * INTO v_referral FROM referral_codes WHERE user_id = p_user_id;

    IF v_referral.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'code', v_referral.code,
            'total_uses', v_referral.total_uses,
            'successful_conversions', v_referral.successful_conversions
        );
    END IF;

    -- Générer un nouveau code
    v_code := 'TPM' || UPPER(SUBSTRING(MD5(p_user_id::TEXT || NOW()::TEXT) FROM 1 FOR 6));

    INSERT INTO referral_codes (user_id, code)
    VALUES (p_user_id, v_code)
    RETURNING * INTO v_referral;

    RETURN jsonb_build_object(
        'success', true,
        'code', v_referral.code,
        'total_uses', 0,
        'successful_conversions', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour utiliser un code referral
CREATE OR REPLACE FUNCTION use_referral_code(
    p_user_id UUID,
    p_code VARCHAR(20)
)
RETURNS JSONB AS $$
DECLARE
    v_referral referral_codes%ROWTYPE;
BEGIN
    -- Vérifier que l'utilisateur n'a pas déjà utilisé un code
    IF EXISTS (SELECT 1 FROM referral_uses WHERE referred_user_id = p_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Vous avez déjà utilisé un code de parrainage');
    END IF;

    -- Trouver le code
    SELECT * INTO v_referral
    FROM referral_codes
    WHERE code = UPPER(p_code) AND is_active = true;

    IF v_referral.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Code invalide');
    END IF;

    -- Vérifier que ce n'est pas son propre code
    IF v_referral.user_id = p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Vous ne pouvez pas utiliser votre propre code');
    END IF;

    -- Enregistrer l'utilisation
    INSERT INTO referral_uses (referral_code_id, referred_user_id, status)
    VALUES (v_referral.id, p_user_id, 'pending');

    -- Incrémenter le compteur
    UPDATE referral_codes
    SET total_uses = total_uses + 1
    WHERE id = v_referral.id;

    RETURN jsonb_build_object(
        'success', true,
        'referrer_id', v_referral.user_id,
        'referee_xp_reward', v_referral.referee_xp_reward,
        'referee_coins_reward', v_referral.referee_coins_reward
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour compléter un referral (après conditions remplies)
CREATE OR REPLACE FUNCTION complete_referral(p_referred_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_use referral_uses%ROWTYPE;
    v_referral referral_codes%ROWTYPE;
BEGIN
    -- Trouver l'utilisation
    SELECT ru.*, rc.*
    INTO v_use
    FROM referral_uses ru
    JOIN referral_codes rc ON ru.referral_code_id = rc.id
    WHERE ru.referred_user_id = p_referred_user_id
    AND ru.status = 'pending';

    IF v_use.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Referral non trouvé');
    END IF;

    -- Récupérer les infos du code
    SELECT * INTO v_referral FROM referral_codes WHERE id = v_use.referral_code_id;

    -- Mettre à jour le statut
    UPDATE referral_uses
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = v_use.id;

    -- Incrémenter les conversions réussies
    UPDATE referral_codes
    SET successful_conversions = successful_conversions + 1
    WHERE id = v_referral.id;

    -- Mettre à jour les stats du parrain
    UPDATE user_sharing_stats
    SET total_conversions = total_conversions + 1,
        updated_at = NOW()
    WHERE user_id = v_referral.user_id;

    RETURN jsonb_build_object(
        'success', true,
        'referrer_id', v_referral.user_id,
        'referrer_xp_reward', v_referral.referrer_xp_reward,
        'referrer_coins_reward', v_referral.referrer_coins_reward,
        'referee_xp_reward', v_referral.referee_xp_reward,
        'referee_coins_reward', v_referral.referee_coins_reward
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE sharing_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_image_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sharing_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sharing_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;

-- Plateformes: lecture publique
CREATE POLICY "Platforms are viewable by all" ON sharing_platforms
    FOR SELECT USING (is_active = true);

-- Templates: lecture publique
CREATE POLICY "Templates are viewable by all" ON share_templates
    FOR SELECT USING (is_active = true);

-- Image templates: lecture publique
CREATE POLICY "Image templates are viewable by all" ON share_image_templates
    FOR SELECT USING (is_active = true);

-- Achievements: lecture publique
CREATE POLICY "Sharing achievements are viewable by all" ON sharing_achievements
    FOR SELECT USING (is_active = true);

-- User shares: utilisateur voit les siens
CREATE POLICY "Users can view own shares" ON user_shares
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shares" ON user_shares
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User achievements: utilisateur voit les siens
CREATE POLICY "Users can view own sharing achievements" ON user_sharing_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- User stats: utilisateur voit les siennes
CREATE POLICY "Users can view own sharing stats" ON user_sharing_stats
    FOR SELECT USING (auth.uid() = user_id);

-- Referral codes: utilisateur voit le sien
CREATE POLICY "Users can view own referral code" ON referral_codes
    FOR SELECT USING (auth.uid() = user_id);

-- Referral uses: utilisateur voit les siennes
CREATE POLICY "Users can view own referral uses" ON referral_uses
    FOR SELECT USING (auth.uid() = referred_user_id);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Plateformes de partage
INSERT INTO sharing_platforms (slug, name, icon, color, base_share_url, url_params, sort_order) VALUES
    ('instagram', 'Instagram', 'Instagram', '#E4405F', NULL, '{}', 1),
    ('tiktok', 'TikTok', 'Music2', '#000000', NULL, '{}', 2),
    ('snapchat', 'Snapchat', 'Ghost', '#FFFC00', NULL, '{}', 3),
    ('whatsapp', 'WhatsApp', 'MessageCircle', '#25D366', 'https://wa.me/?text=', '{"encode": true}', 4),
    ('facebook', 'Facebook', 'Facebook', '#1877F2', 'https://www.facebook.com/sharer/sharer.php?u=', '{}', 5),
    ('twitter', 'X (Twitter)', 'Twitter', '#1DA1F2', 'https://twitter.com/intent/tweet?text=', '{"encode": true}', 6),
    ('copy_link', 'Copier le lien', 'Link', '#6366F1', NULL, '{}', 7)
ON CONFLICT (slug) DO NOTHING;

-- Templates de partage
INSERT INTO share_templates (slug, name, description, content_type, title_template, description_template, hashtags, xp_reward, coins_reward, first_share_bonus) VALUES
    ('badge_earned', 'Badge débloqué', 'Partager un badge gagné', 'badge',
     'Je viens de débloquer le badge {{badge_name}} sur Teens Party Morocco !',
     '{{badge_description}}',
     ARRAY['TeensPartyMorocco', 'TPM', 'Badge', 'Achievement'],
     15, 10, 25),

    ('level_up', 'Montée de niveau', 'Partager une montée de niveau', 'level_up',
     'Je viens d''atteindre le niveau {{level}} sur Teens Party Morocco !',
     'Rejoins-moi pour vivre des soirées incroyables !',
     ARRAY['TeensPartyMorocco', 'TPM', 'LevelUp'],
     15, 10, 25),

    ('event_attended', 'Événement', 'Partager une participation à un événement', 'event',
     'J''étais à {{event_name}} avec Teens Party Morocco !',
     '{{event_description}}',
     ARRAY['TeensPartyMorocco', 'TPM', 'Party', 'Event'],
     20, 15, 30),

    ('challenge_completed', 'Défi terminé', 'Partager un défi complété', 'challenge',
     'J''ai relevé le défi {{challenge_name}} sur Teens Party Morocco !',
     NULL,
     ARRAY['TeensPartyMorocco', 'TPM', 'Challenge'],
     15, 10, 25),

    ('vip_tier_up', 'Nouveau statut VIP', 'Partager un nouveau tier VIP', 'vip',
     'Je suis maintenant {{tier_name}} sur Teens Party Morocco !',
     'Les avantages VIP sont incroyables !',
     ARRAY['TeensPartyMorocco', 'TPM', 'VIP'],
     25, 20, 50),

    ('stats_wrapped', 'Statistiques annuelles', 'Partager son wrapped annuel', 'stats',
     'Mon année 2024 sur Teens Party Morocco : {{events_count}} événements, {{xp_total}} XP !',
     'Et toi, c''était comment ton année ?',
     ARRAY['TeensPartyMorocco', 'TPM', 'Wrapped', 'YearInReview'],
     30, 25, 50),

    ('invite_friend', 'Inviter un ami', 'Inviter quelqu''un à rejoindre', 'referral',
     'Rejoins-moi sur Teens Party Morocco avec mon code {{referral_code}} !',
     'La meilleure app pour les soirées au Maroc !',
     ARRAY['TeensPartyMorocco', 'TPM', 'Join'],
     10, 5, 20),

    ('collection_completed', 'Collection complétée', 'Partager une collection terminée', 'collection',
     'J''ai complété la collection {{collection_name}} sur Teens Party Morocco !',
     NULL,
     ARRAY['TeensPartyMorocco', 'TPM', 'Collection', 'Complete'],
     20, 15, 30)
ON CONFLICT (slug) DO NOTHING;

-- Achievements de partage
INSERT INTO sharing_achievements (slug, name, description, icon, condition_type, condition_value, xp_reward, coins_reward) VALUES
    ('first_share', 'Premier partage', 'Faire votre premier partage', 'Share2', 'first_share', 1, 50, 25),
    ('social_butterfly', 'Papillon social', 'Partager 10 fois', 'Share2', 'total_shares', 10, 100, 50),
    ('influencer', 'Influenceur', 'Partager 50 fois', 'Megaphone', 'total_shares', 50, 250, 100),
    ('viral_star', 'Star virale', 'Avoir 5 conversions via vos partages', 'Star', 'viral', 5, 300, 150),
    ('super_viral', 'Super viral', 'Avoir 25 conversions via vos partages', 'Sparkles', 'viral', 25, 500, 250)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_sharing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_share_templates_updated_at ON share_templates;
CREATE TRIGGER update_share_templates_updated_at
    BEFORE UPDATE ON share_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_sharing_updated_at();

DROP TRIGGER IF EXISTS update_share_image_templates_updated_at ON share_image_templates;
CREATE TRIGGER update_share_image_templates_updated_at
    BEFORE UPDATE ON share_image_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_sharing_updated_at();

DROP TRIGGER IF EXISTS update_user_sharing_stats_updated_at ON user_sharing_stats;
CREATE TRIGGER update_user_sharing_stats_updated_at
    BEFORE UPDATE ON user_sharing_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_sharing_updated_at();
