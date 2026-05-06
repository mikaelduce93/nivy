-- =============================================
-- MIGRATION 026: Social Sharing System
-- =============================================
-- Systeme de partage vers reseaux sociaux externes
-- et generation de cartes partageables
-- =============================================

-- Table des partages sociaux
CREATE TABLE IF NOT EXISTS social_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Type de contenu partagé
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN (
        'achievement',      -- Badge debloque
        'level_up',         -- Montee de niveau
        'challenge',        -- Defi complete
        'creation',         -- Creation artistique
        'record',           -- Record personnel
        'streak',           -- Serie maintenue
        'profile',          -- Profil public
        'leaderboard',      -- Position classement
        'certificate',      -- Certificat/diplome
        'event',            -- Participation evenement
        'milestone',        -- Objectif atteint
        'custom'            -- Contenu personnalise
    )),
    content_id UUID,

    -- Plateforme de partage
    platform VARCHAR(30) NOT NULL CHECK (platform IN (
        'facebook',
        'twitter',
        'instagram',
        'whatsapp',
        'telegram',
        'tiktok',
        'snapchat',
        'linkedin',
        'copy_link',
        'download',
        'email'
    )),

    -- Données du partage
    share_url TEXT,
    share_image_url TEXT,
    share_title VARCHAR(200),
    share_description TEXT,
    share_hashtags TEXT[],

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Tracking
    click_count INTEGER DEFAULT 0,
    was_completed BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_shares_user ON social_shares(user_id, created_at DESC);
CREATE INDEX idx_social_shares_content ON social_shares(content_type, content_id);
CREATE INDEX idx_social_shares_platform ON social_shares(platform);

-- Table des templates de cartes partageables
CREATE TABLE IF NOT EXISTS share_card_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Type de contenu supporté
    content_type VARCHAR(50) NOT NULL,

    -- Design
    template_url TEXT NOT NULL,
    thumbnail_url TEXT,

    -- Configuration
    config JSONB DEFAULT '{}'::jsonb,
    -- Exemple: {
    --   "width": 1200,
    --   "height": 630,
    --   "background_color": "#1a1a2e",
    --   "text_color": "#ffffff",
    --   "accent_color": "#00d4ff",
    --   "font": "Inter",
    --   "elements": [...]
    -- }

    -- Disponibilité
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Stats
    usage_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_templates_type ON share_card_templates(content_type, is_active);

-- Table des cartes générées
CREATE TABLE IF NOT EXISTS generated_share_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES share_card_templates(id) ON DELETE SET NULL,

    -- Contenu
    content_type VARCHAR(50) NOT NULL,
    content_id UUID,
    content_data JSONB NOT NULL,

    -- Image générée
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,

    -- Dimensions
    width INTEGER DEFAULT 1200,
    height INTEGER DEFAULT 630,

    -- Stats
    share_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,

    -- Expiration (optionnel pour les URLs signées)
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generated_cards_user ON generated_share_cards(user_id, created_at DESC);
CREATE INDEX idx_generated_cards_content ON generated_share_cards(content_type, content_id);

-- Table des liens de partage avec tracking
CREATE TABLE IF NOT EXISTS share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Code court unique
    short_code VARCHAR(20) NOT NULL UNIQUE,

    -- Destination
    target_type VARCHAR(50) NOT NULL,
    target_id UUID,
    target_url TEXT NOT NULL,

    -- Metadata pour OG tags
    og_title VARCHAR(200),
    og_description TEXT,
    og_image TEXT,

    -- Stats
    click_count INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,

    -- Expiration
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_links_code ON share_links(short_code) WHERE is_active = true;
CREATE INDEX idx_share_links_user ON share_links(user_id, created_at DESC);

-- Table des clics sur liens de partage
CREATE TABLE IF NOT EXISTS share_link_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,

    -- Info visiteur (anonymisé)
    visitor_hash VARCHAR(64), -- Hash de l'IP pour comptage unique
    referrer TEXT,
    platform VARCHAR(50),
    country VARCHAR(2),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_clicks_link ON share_link_clicks(link_id, created_at DESC);

-- Table des récompenses de partage
CREATE TABLE IF NOT EXISTS share_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Configuration
    platform VARCHAR(30) NOT NULL,
    content_type VARCHAR(50),

    -- Récompenses
    xp_reward INTEGER DEFAULT 10,
    tokens_reward INTEGER DEFAULT 0,

    -- Limites
    daily_limit INTEGER DEFAULT 5,
    weekly_limit INTEGER DEFAULT 20,

    -- Bonus pour viralité
    click_milestone INTEGER DEFAULT 10,
    click_bonus_xp INTEGER DEFAULT 50,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des statistiques de partage par utilisateur
CREATE TABLE IF NOT EXISTS user_share_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Compteurs globaux
    total_shares INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_xp_earned INTEGER DEFAULT 0,

    -- Par plateforme
    shares_by_platform JSONB DEFAULT '{}'::jsonb,

    -- Par type de contenu
    shares_by_type JSONB DEFAULT '{}'::jsonb,

    -- Compteurs journaliers (reset quotidien)
    daily_shares INTEGER DEFAULT 0,
    daily_reset_at DATE DEFAULT CURRENT_DATE,

    -- Meilleur partage
    best_share_id UUID REFERENCES social_shares(id),
    best_share_clicks INTEGER DEFAULT 0,

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- =============================================
-- FONCTIONS
-- =============================================

-- Fonction pour générer un code court unique
CREATE OR REPLACE FUNCTION generate_short_code(length INTEGER DEFAULT 8)
RETURNS VARCHAR AS $$
DECLARE
    chars VARCHAR := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer un lien de partage
CREATE OR REPLACE FUNCTION create_share_link(
    p_user_id UUID,
    p_target_type VARCHAR,
    p_target_id UUID,
    p_target_url TEXT,
    p_og_title VARCHAR DEFAULT NULL,
    p_og_description TEXT DEFAULT NULL,
    p_og_image TEXT DEFAULT NULL,
    p_expires_days INTEGER DEFAULT NULL
)
RETURNS TABLE (
    link_id UUID,
    short_code VARCHAR,
    full_url TEXT
) AS $$
DECLARE
    v_link_id UUID;
    v_short_code VARCHAR;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Générer un code unique
    LOOP
        v_short_code := generate_short_code(8);
        EXIT WHEN NOT EXISTS (SELECT 1 FROM share_links WHERE short_code = v_short_code);
    END LOOP;

    -- Calculer expiration
    IF p_expires_days IS NOT NULL THEN
        v_expires_at := NOW() + (p_expires_days || ' days')::INTERVAL;
    END IF;

    -- Créer le lien
    INSERT INTO share_links (
        user_id, short_code, target_type, target_id, target_url,
        og_title, og_description, og_image, expires_at
    )
    VALUES (
        p_user_id, v_short_code, p_target_type, p_target_id, p_target_url,
        p_og_title, p_og_description, p_og_image, v_expires_at
    )
    RETURNING id INTO v_link_id;

    RETURN QUERY SELECT
        v_link_id,
        v_short_code,
        'https://teensparty.ma/s/' || v_short_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour enregistrer un partage
CREATE OR REPLACE FUNCTION record_social_share(
    p_user_id UUID,
    p_content_type VARCHAR,
    p_content_id UUID,
    p_platform VARCHAR,
    p_share_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_share_id UUID;
    v_reward_xp INTEGER;
    v_stats user_share_stats%ROWTYPE;
    v_daily_limit INTEGER;
    v_result JSONB;
BEGIN
    -- Récupérer ou créer les stats utilisateur
    INSERT INTO user_share_stats (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO UPDATE SET
        daily_shares = CASE
            WHEN user_share_stats.daily_reset_at < CURRENT_DATE THEN 0
            ELSE user_share_stats.daily_shares
        END,
        daily_reset_at = CURRENT_DATE
    RETURNING * INTO v_stats;

    -- Vérifier la limite journalière
    SELECT COALESCE(daily_limit, 5) INTO v_daily_limit
    FROM share_rewards
    WHERE platform = p_platform AND is_active = true
    LIMIT 1;

    IF v_stats.daily_shares >= v_daily_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'daily_limit_reached',
            'message', 'Limite de partages journaliers atteinte'
        );
    END IF;

    -- Créer l'enregistrement de partage
    INSERT INTO social_shares (
        user_id, content_type, content_id, platform,
        share_title, share_description, share_hashtags, metadata
    )
    VALUES (
        p_user_id, p_content_type, p_content_id, p_platform,
        p_share_data->>'title',
        p_share_data->>'description',
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_share_data->'hashtags', '[]'::jsonb))),
        p_share_data
    )
    RETURNING id INTO v_share_id;

    -- Récupérer la récompense
    SELECT COALESCE(xp_reward, 10) INTO v_reward_xp
    FROM share_rewards
    WHERE platform = p_platform
    AND (content_type IS NULL OR content_type = p_content_type)
    AND is_active = true
    LIMIT 1;

    IF v_reward_xp IS NULL THEN
        v_reward_xp := 10; -- Défaut
    END IF;

    -- Attribuer l'XP
    UPDATE users SET xp = xp + v_reward_xp WHERE id = p_user_id;

    -- Mettre à jour les stats
    UPDATE user_share_stats SET
        total_shares = total_shares + 1,
        total_xp_earned = total_xp_earned + v_reward_xp,
        daily_shares = daily_shares + 1,
        shares_by_platform = jsonb_set(
            COALESCE(shares_by_platform, '{}'::jsonb),
            ARRAY[p_platform],
            to_jsonb(COALESCE((shares_by_platform->>p_platform)::int, 0) + 1)
        ),
        shares_by_type = jsonb_set(
            COALESCE(shares_by_type, '{}'::jsonb),
            ARRAY[p_content_type],
            to_jsonb(COALESCE((shares_by_type->>p_content_type)::int, 0) + 1)
        ),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Notification
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        p_user_id,
        'share_reward',
        'Partage récompensé !',
        'Tu as gagné ' || v_reward_xp || ' XP pour ton partage',
        jsonb_build_object('share_id', v_share_id, 'xp', v_reward_xp, 'platform', p_platform)
    );

    RETURN jsonb_build_object(
        'success', true,
        'share_id', v_share_id,
        'xp_earned', v_reward_xp,
        'daily_shares', v_stats.daily_shares + 1,
        'daily_limit', v_daily_limit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour enregistrer un clic sur lien
CREATE OR REPLACE FUNCTION record_link_click(
    p_short_code VARCHAR,
    p_visitor_hash VARCHAR DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL,
    p_platform VARCHAR DEFAULT NULL,
    p_country VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_link share_links%ROWTYPE;
    v_is_unique BOOLEAN;
    v_owner_id UUID;
BEGIN
    -- Récupérer le lien
    SELECT * INTO v_link
    FROM share_links
    WHERE short_code = p_short_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());

    IF v_link IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'link_not_found');
    END IF;

    -- Vérifier si visiteur unique
    v_is_unique := NOT EXISTS (
        SELECT 1 FROM share_link_clicks
        WHERE link_id = v_link.id AND visitor_hash = p_visitor_hash
    );

    -- Enregistrer le clic
    INSERT INTO share_link_clicks (link_id, visitor_hash, referrer, platform, country)
    VALUES (v_link.id, p_visitor_hash, p_referrer, p_platform, p_country);

    -- Mettre à jour les compteurs
    UPDATE share_links SET
        click_count = click_count + 1,
        unique_visitors = unique_visitors + CASE WHEN v_is_unique THEN 1 ELSE 0 END
    WHERE id = v_link.id;

    -- Mettre à jour les stats utilisateur
    UPDATE user_share_stats SET
        total_clicks = total_clicks + 1,
        updated_at = NOW()
    WHERE user_id = v_link.user_id;

    -- Vérifier les milestones de clics pour bonus XP
    IF v_link.click_count % 10 = 0 THEN
        UPDATE users SET xp = xp + 50 WHERE id = v_link.user_id;

        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            v_link.user_id,
            'share_milestone',
            'Ton partage cartonne !',
            'Ton lien a atteint ' || v_link.click_count || ' clics ! +50 XP',
            jsonb_build_object('link_id', v_link.id, 'clicks', v_link.click_count)
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'target_url', v_link.target_url,
        'og_title', v_link.og_title,
        'og_description', v_link.og_description,
        'og_image', v_link.og_image
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les stats de partage
CREATE OR REPLACE FUNCTION get_share_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_stats user_share_stats%ROWTYPE;
    v_recent_shares JSONB;
    v_top_shares JSONB;
BEGIN
    SELECT * INTO v_stats
    FROM user_share_stats
    WHERE user_id = p_user_id;

    IF v_stats IS NULL THEN
        RETURN jsonb_build_object(
            'total_shares', 0,
            'total_clicks', 0,
            'total_xp_earned', 0,
            'shares_by_platform', '{}'::jsonb,
            'shares_by_type', '{}'::jsonb,
            'recent_shares', '[]'::jsonb,
            'top_shares', '[]'::jsonb
        );
    END IF;

    -- Partages récents
    SELECT jsonb_agg(row_to_json(s)) INTO v_recent_shares
    FROM (
        SELECT id, content_type, platform, click_count, created_at
        FROM social_shares
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 5
    ) s;

    -- Meilleurs partages
    SELECT jsonb_agg(row_to_json(s)) INTO v_top_shares
    FROM (
        SELECT id, content_type, platform, click_count, created_at
        FROM social_shares
        WHERE user_id = p_user_id
        ORDER BY click_count DESC
        LIMIT 5
    ) s;

    RETURN jsonb_build_object(
        'total_shares', v_stats.total_shares,
        'total_clicks', v_stats.total_clicks,
        'total_xp_earned', v_stats.total_xp_earned,
        'shares_by_platform', v_stats.shares_by_platform,
        'shares_by_type', v_stats.shares_by_type,
        'daily_shares', v_stats.daily_shares,
        'recent_shares', COALESCE(v_recent_shares, '[]'::jsonb),
        'top_shares', COALESCE(v_top_shares, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DONNÉES INITIALES
-- =============================================

-- Templates de cartes par défaut
INSERT INTO share_card_templates (name, description, content_type, template_url, config, is_premium)
VALUES
    ('Achievement Classic', 'Carte classique pour badges', 'achievement', '/templates/achievement-classic.svg',
     '{"width": 1200, "height": 630, "style": "classic"}', false),
    ('Achievement Neon', 'Carte néon pour badges', 'achievement', '/templates/achievement-neon.svg',
     '{"width": 1200, "height": 630, "style": "neon"}', true),
    ('Level Up Burst', 'Carte explosive niveau', 'level_up', '/templates/levelup-burst.svg',
     '{"width": 1200, "height": 630, "style": "burst"}', false),
    ('Challenge Victory', 'Carte victoire défi', 'challenge', '/templates/challenge-victory.svg',
     '{"width": 1200, "height": 630, "style": "victory"}', false),
    ('Creation Showcase', 'Carte création artistique', 'creation', '/templates/creation-showcase.svg',
     '{"width": 1200, "height": 630, "style": "showcase"}', false),
    ('Streak Fire', 'Carte série en feu', 'streak', '/templates/streak-fire.svg',
     '{"width": 1200, "height": 630, "style": "fire"}', false),
    ('Profile Card', 'Carte de profil', 'profile', '/templates/profile-card.svg',
     '{"width": 1200, "height": 630, "style": "profile"}', false),
    ('Leaderboard Rank', 'Carte classement', 'leaderboard', '/templates/leaderboard-rank.svg',
     '{"width": 1200, "height": 630, "style": "rank"}', true)
ON CONFLICT DO NOTHING;

-- Récompenses par plateforme
INSERT INTO share_rewards (platform, xp_reward, tokens_reward, daily_limit, click_milestone, click_bonus_xp)
VALUES
    ('facebook', 15, 1, 5, 10, 50),
    ('twitter', 15, 1, 5, 10, 50),
    ('instagram', 20, 2, 3, 15, 75),
    ('whatsapp', 10, 0, 10, 5, 25),
    ('telegram', 10, 0, 10, 5, 25),
    ('tiktok', 25, 3, 3, 20, 100),
    ('snapchat', 15, 1, 5, 10, 50),
    ('linkedin', 10, 1, 3, 10, 50),
    ('copy_link', 5, 0, 20, 10, 25),
    ('download', 5, 0, 10, 0, 0),
    ('email', 10, 0, 5, 5, 25)
ON CONFLICT DO NOTHING;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_share_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_share_stats ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their shares" ON social_shares
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create shares" ON social_shares
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their cards" ON generated_share_cards
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create cards" ON generated_share_cards
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their links" ON share_links
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create links" ON share_links
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their stats" ON user_share_stats
    FOR SELECT USING (user_id = auth.uid());

-- Templates visibles par tous
CREATE POLICY "Anyone can view active templates" ON share_card_templates
    FOR SELECT USING (is_active = true);
