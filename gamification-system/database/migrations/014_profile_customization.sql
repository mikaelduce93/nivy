-- ============================================================================
-- TEENS PARTY MOROCCO - Profile Customization
-- ============================================================================
-- Migration: 014_profile_customization.sql
-- Description: Tables pour la personnalisation de profil (cadres, titres, couleurs)
-- ============================================================================

-- ============================================================================
-- PROFILE FRAMES (cadres d'avatar)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Visuel
    frame_type VARCHAR(30) NOT NULL, -- circle, square, hexagon, animated
    border_style VARCHAR(200), -- CSS border style
    gradient_colors TEXT[], -- Couleurs du dégradé
    animation_class VARCHAR(50), -- Classe CSS pour animation
    image_url TEXT, -- URL de l'image du cadre (si custom)

    -- Conditions d'obtention
    unlock_type VARCHAR(30) NOT NULL, -- free, level, achievement, purchase, event, vip
    unlock_requirement JSONB DEFAULT '{}',
    -- Ex: {"level": 10} ou {"achievement_id": "xxx"} ou {"coins": 500}

    -- Rareté
    rarity VARCHAR(20) DEFAULT 'common', -- common, uncommon, rare, epic, legendary

    -- Disponibilité
    is_active BOOLEAN DEFAULT true,
    is_limited BOOLEAN DEFAULT false,
    available_until TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROFILE TITLES (titres affichables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Affichage
    display_text VARCHAR(100) NOT NULL, -- Le texte affiché
    color VARCHAR(20), -- Couleur du titre
    gradient TEXT, -- Gradient CSS
    icon VARCHAR(50), -- Icône optionnelle
    emoji VARCHAR(10), -- Emoji optionnel

    -- Conditions d'obtention
    unlock_type VARCHAR(30) NOT NULL,
    unlock_requirement JSONB DEFAULT '{}',

    -- Rareté
    rarity VARCHAR(20) DEFAULT 'common',

    -- Catégorie
    category VARCHAR(30), -- achievement, event, social, game, special

    -- Disponibilité
    is_active BOOLEAN DEFAULT true,
    is_limited BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROFILE COLORS (thèmes de couleur)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Couleurs du thème
    primary_color VARCHAR(20) NOT NULL,
    secondary_color VARCHAR(20),
    accent_color VARCHAR(20),
    background_gradient TEXT, -- CSS gradient pour le fond du profil
    text_color VARCHAR(20) DEFAULT '#FFFFFF',

    -- Conditions d'obtention
    unlock_type VARCHAR(30) NOT NULL,
    unlock_requirement JSONB DEFAULT '{}',

    -- Rareté
    rarity VARCHAR(20) DEFAULT 'common',

    -- Disponibilité
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROFILE BACKGROUNDS (fonds de profil)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_backgrounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Visuel
    background_type VARCHAR(30) NOT NULL, -- gradient, image, pattern, animated
    background_value TEXT NOT NULL, -- CSS gradient, URL, ou pattern name
    overlay_opacity DECIMAL(3,2) DEFAULT 0.5,

    -- Conditions d'obtention
    unlock_type VARCHAR(30) NOT NULL,
    unlock_requirement JSONB DEFAULT '{}',

    -- Rareté
    rarity VARCHAR(20) DEFAULT 'common',

    -- Disponibilité
    is_active BOOLEAN DEFAULT true,
    is_limited BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER PROFILE CUSTOMIZATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profile_customization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Éléments équipés
    equipped_frame_id UUID REFERENCES profile_frames(id),
    equipped_title_id UUID REFERENCES profile_titles(id),
    equipped_color_id UUID REFERENCES profile_colors(id),
    equipped_background_id UUID REFERENCES profile_backgrounds(id),

    -- Badge showcase (badges mis en avant, max 3)
    showcase_badge_ids UUID[] DEFAULT '{}',

    -- Bio personnalisée
    custom_bio TEXT,
    bio_emoji VARCHAR(10),

    -- Préférences
    show_level BOOLEAN DEFAULT true,
    show_xp BOOLEAN DEFAULT true,
    show_badges_count BOOLEAN DEFAULT true,
    show_events_count BOOLEAN DEFAULT true,
    show_friends_count BOOLEAN DEFAULT true,
    show_crew BOOLEAN DEFAULT true,

    -- Statut personnalisé
    custom_status VARCHAR(100),
    status_emoji VARCHAR(10),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER UNLOCKED ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_unlocked_frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    frame_id UUID NOT NULL REFERENCES profile_frames(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_source VARCHAR(50), -- achievement, purchase, event, gift

    UNIQUE(user_id, frame_id)
);

CREATE TABLE IF NOT EXISTS user_unlocked_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title_id UUID NOT NULL REFERENCES profile_titles(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_source VARCHAR(50),

    UNIQUE(user_id, title_id)
);

CREATE TABLE IF NOT EXISTS user_unlocked_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES profile_colors(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_source VARCHAR(50),

    UNIQUE(user_id, color_id)
);

CREATE TABLE IF NOT EXISTS user_unlocked_backgrounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    background_id UUID NOT NULL REFERENCES profile_backgrounds(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_source VARCHAR(50),

    UNIQUE(user_id, background_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_unlocked_frames_user ON user_unlocked_frames(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_titles_user ON user_unlocked_titles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_colors_user ON user_unlocked_colors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_backgrounds_user ON user_unlocked_backgrounds(user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour obtenir les items débloqués d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_customization_items(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_frames JSON;
    v_titles JSON;
    v_colors JSON;
    v_backgrounds JSON;
    v_equipped JSON;
BEGIN
    -- Frames débloqués
    SELECT json_agg(
        json_build_object(
            'id', f.id,
            'slug', f.slug,
            'name', f.name,
            'description', f.description,
            'frame_type', f.frame_type,
            'border_style', f.border_style,
            'gradient_colors', f.gradient_colors,
            'animation_class', f.animation_class,
            'rarity', f.rarity,
            'unlocked_at', uf.unlocked_at
        )
    ) INTO v_frames
    FROM user_unlocked_frames uf
    JOIN profile_frames f ON f.id = uf.frame_id
    WHERE uf.user_id = p_user_id;

    -- Titles débloqués
    SELECT json_agg(
        json_build_object(
            'id', t.id,
            'slug', t.slug,
            'name', t.name,
            'display_text', t.display_text,
            'color', t.color,
            'gradient', t.gradient,
            'emoji', t.emoji,
            'rarity', t.rarity,
            'category', t.category,
            'unlocked_at', ut.unlocked_at
        )
    ) INTO v_titles
    FROM user_unlocked_titles ut
    JOIN profile_titles t ON t.id = ut.title_id
    WHERE ut.user_id = p_user_id;

    -- Colors débloqués
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'slug', c.slug,
            'name', c.name,
            'primary_color', c.primary_color,
            'secondary_color', c.secondary_color,
            'accent_color', c.accent_color,
            'background_gradient', c.background_gradient,
            'rarity', c.rarity,
            'unlocked_at', uc.unlocked_at
        )
    ) INTO v_colors
    FROM user_unlocked_colors uc
    JOIN profile_colors c ON c.id = uc.color_id
    WHERE uc.user_id = p_user_id;

    -- Backgrounds débloqués
    SELECT json_agg(
        json_build_object(
            'id', b.id,
            'slug', b.slug,
            'name', b.name,
            'background_type', b.background_type,
            'background_value', b.background_value,
            'rarity', b.rarity,
            'unlocked_at', ub.unlocked_at
        )
    ) INTO v_backgrounds
    FROM user_unlocked_backgrounds ub
    JOIN profile_backgrounds b ON b.id = ub.background_id
    WHERE ub.user_id = p_user_id;

    -- Items équipés
    SELECT json_build_object(
        'frame', (SELECT row_to_json(f) FROM profile_frames f WHERE f.id = upc.equipped_frame_id),
        'title', (SELECT row_to_json(t) FROM profile_titles t WHERE t.id = upc.equipped_title_id),
        'color', (SELECT row_to_json(c) FROM profile_colors c WHERE c.id = upc.equipped_color_id),
        'background', (SELECT row_to_json(b) FROM profile_backgrounds b WHERE b.id = upc.equipped_background_id),
        'showcase_badges', upc.showcase_badge_ids,
        'custom_bio', upc.custom_bio,
        'custom_status', upc.custom_status,
        'preferences', json_build_object(
            'show_level', upc.show_level,
            'show_xp', upc.show_xp,
            'show_badges_count', upc.show_badges_count,
            'show_events_count', upc.show_events_count,
            'show_friends_count', upc.show_friends_count,
            'show_crew', upc.show_crew
        )
    ) INTO v_equipped
    FROM user_profile_customization upc
    WHERE upc.user_id = p_user_id;

    RETURN json_build_object(
        'frames', COALESCE(v_frames, '[]'::json),
        'titles', COALESCE(v_titles, '[]'::json),
        'colors', COALESCE(v_colors, '[]'::json),
        'backgrounds', COALESCE(v_backgrounds, '[]'::json),
        'equipped', v_equipped
    );
END;
$$;

-- Fonction pour équiper un item
CREATE OR REPLACE FUNCTION equip_profile_item(
    p_user_id UUID,
    p_item_type VARCHAR(20),
    p_item_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_owns_item BOOLEAN := FALSE;
BEGIN
    -- Vérifier que l'utilisateur possède l'item
    CASE p_item_type
        WHEN 'frame' THEN
            SELECT EXISTS(SELECT 1 FROM user_unlocked_frames WHERE user_id = p_user_id AND frame_id = p_item_id) INTO v_owns_item;
        WHEN 'title' THEN
            SELECT EXISTS(SELECT 1 FROM user_unlocked_titles WHERE user_id = p_user_id AND title_id = p_item_id) INTO v_owns_item;
        WHEN 'color' THEN
            SELECT EXISTS(SELECT 1 FROM user_unlocked_colors WHERE user_id = p_user_id AND color_id = p_item_id) INTO v_owns_item;
        WHEN 'background' THEN
            SELECT EXISTS(SELECT 1 FROM user_unlocked_backgrounds WHERE user_id = p_user_id AND background_id = p_item_id) INTO v_owns_item;
    END CASE;

    IF NOT v_owns_item THEN
        RETURN FALSE;
    END IF;

    -- Créer l'entrée de customization si elle n'existe pas
    INSERT INTO user_profile_customization (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Équiper l'item
    CASE p_item_type
        WHEN 'frame' THEN
            UPDATE user_profile_customization SET equipped_frame_id = p_item_id, updated_at = NOW() WHERE user_id = p_user_id;
        WHEN 'title' THEN
            UPDATE user_profile_customization SET equipped_title_id = p_item_id, updated_at = NOW() WHERE user_id = p_user_id;
        WHEN 'color' THEN
            UPDATE user_profile_customization SET equipped_color_id = p_item_id, updated_at = NOW() WHERE user_id = p_user_id;
        WHEN 'background' THEN
            UPDATE user_profile_customization SET equipped_background_id = p_item_id, updated_at = NOW() WHERE user_id = p_user_id;
    END CASE;

    RETURN TRUE;
END;
$$;

-- Fonction pour débloquer un item pour un utilisateur
CREATE OR REPLACE FUNCTION unlock_profile_item(
    p_user_id UUID,
    p_item_type VARCHAR(20),
    p_item_id UUID,
    p_source VARCHAR(50) DEFAULT 'system'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    CASE p_item_type
        WHEN 'frame' THEN
            INSERT INTO user_unlocked_frames (user_id, frame_id, unlock_source)
            VALUES (p_user_id, p_item_id, p_source)
            ON CONFLICT (user_id, frame_id) DO NOTHING;
        WHEN 'title' THEN
            INSERT INTO user_unlocked_titles (user_id, title_id, unlock_source)
            VALUES (p_user_id, p_item_id, p_source)
            ON CONFLICT (user_id, title_id) DO NOTHING;
        WHEN 'color' THEN
            INSERT INTO user_unlocked_colors (user_id, color_id, unlock_source)
            VALUES (p_user_id, p_item_id, p_source)
            ON CONFLICT (user_id, color_id) DO NOTHING;
        WHEN 'background' THEN
            INSERT INTO user_unlocked_backgrounds (user_id, background_id, unlock_source)
            VALUES (p_user_id, p_item_id, p_source)
            ON CONFLICT (user_id, background_id) DO NOTHING;
    END CASE;

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profile_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_customization ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocked_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocked_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocked_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocked_backgrounds ENABLE ROW LEVEL SECURITY;

-- Items de base lisibles par tous
CREATE POLICY "Anyone can view active profile items"
ON profile_frames FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active titles"
ON profile_titles FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active colors"
ON profile_colors FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active backgrounds"
ON profile_backgrounds FOR SELECT USING (is_active = true);

-- Customization utilisateur
CREATE POLICY "Users can view any profile customization"
ON user_profile_customization FOR SELECT
USING (true);

CREATE POLICY "Users can update their own customization"
ON user_profile_customization FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customization"
ON user_profile_customization FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Items débloqués
CREATE POLICY "Users can view their unlocked frames"
ON user_unlocked_frames FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their unlocked titles"
ON user_unlocked_titles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their unlocked colors"
ON user_unlocked_colors FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their unlocked backgrounds"
ON user_unlocked_backgrounds FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Frames par défaut
INSERT INTO profile_frames (slug, name, description, frame_type, border_style, gradient_colors, unlock_type, rarity) VALUES
('default', 'Classique', 'Le cadre par défaut', 'circle', '3px solid #71717a', NULL, 'free', 'common'),
('cyan_glow', 'Lueur Cyan', 'Un cadre avec une lueur cyan', 'circle', '3px solid #06b6d4', ARRAY['#06b6d4', '#0891b2'], 'level', 'uncommon'),
('purple_ring', 'Anneau Violet', 'Un élégant anneau violet', 'circle', '4px solid #a855f7', ARRAY['#a855f7', '#7c3aed'], 'level', 'uncommon'),
('gold_frame', 'Cadre Doré', 'Un cadre prestigieux doré', 'circle', '4px solid #f59e0b', ARRAY['#f59e0b', '#d97706'], 'level', 'rare'),
('rainbow', 'Arc-en-ciel', 'Un cadre aux couleurs de l''arc-en-ciel', 'circle', '4px solid transparent', ARRAY['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'], 'achievement', 'epic'),
('animated_fire', 'Flammes', 'Un cadre animé avec des flammes', 'animated', NULL, ARRAY['#ef4444', '#f97316', '#fbbf24'], 'achievement', 'legendary'),
('diamond', 'Diamant', 'Le cadre ultime en diamant', 'hexagon', '5px solid #67e8f9', ARRAY['#67e8f9', '#22d3ee', '#06b6d4'], 'vip', 'legendary')
ON CONFLICT (slug) DO NOTHING;

-- Titres par défaut
INSERT INTO profile_titles (slug, name, description, display_text, color, emoji, unlock_type, rarity, category) VALUES
('newcomer', 'Nouveau', 'Pour les nouveaux membres', 'Nouveau', '#71717a', '🌱', 'free', 'common', 'achievement'),
('regular', 'Habitué', 'Membre régulier', 'Habitué', '#06b6d4', '⭐', 'level', 'common', 'achievement'),
('party_animal', 'Party Animal', 'Toujours présent aux events', 'Party Animal', '#a855f7', '🎉', 'achievement', 'rare', 'event'),
('game_master', 'Game Master', 'Expert des mini-jeux', 'Game Master', '#22c55e', '🎮', 'achievement', 'rare', 'game'),
('social_butterfly', 'Social Butterfly', 'Super sociable', 'Social Butterfly', '#ec4899', '🦋', 'achievement', 'rare', 'social'),
('legend', 'Légende', 'Un membre légendaire', 'Légende', '#f59e0b', '👑', 'achievement', 'legendary', 'special'),
('og', 'OG Member', 'Membre depuis le début', 'OG', '#ef4444', '💎', 'achievement', 'legendary', 'special'),
('streaker', 'Streaker', 'Maître des séries', 'Streaker', '#f97316', '🔥', 'achievement', 'epic', 'achievement'),
('predictor', 'Oracle', 'Expert en prédictions', 'Oracle', '#8b5cf6', '🔮', 'achievement', 'epic', 'game')
ON CONFLICT (slug) DO NOTHING;

-- Couleurs par défaut
INSERT INTO profile_colors (slug, name, description, primary_color, secondary_color, accent_color, background_gradient, unlock_type, rarity) VALUES
('default', 'Classique', 'Thème par défaut', '#71717a', '#52525b', '#06b6d4', 'linear-gradient(135deg, #18181b 0%, #27272a 100%)', 'free', 'common'),
('ocean', 'Océan', 'Bleu profond', '#06b6d4', '#0891b2', '#22d3ee', 'linear-gradient(135deg, #164e63 0%, #0e7490 100%)', 'level', 'uncommon'),
('sunset', 'Coucher de soleil', 'Orange chaud', '#f97316', '#ea580c', '#fb923c', 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)', 'level', 'uncommon'),
('forest', 'Forêt', 'Vert nature', '#22c55e', '#16a34a', '#4ade80', 'linear-gradient(135deg, #14532d 0%, #166534 100%)', 'level', 'uncommon'),
('galaxy', 'Galaxie', 'Violet spatial', '#8b5cf6', '#7c3aed', '#a78bfa', 'linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)', 'achievement', 'rare'),
('neon', 'Néon', 'Rose fluo', '#ec4899', '#db2777', '#f472b6', 'linear-gradient(135deg, #500724 0%, #831843 100%)', 'achievement', 'rare'),
('gold', 'Or', 'Prestige doré', '#f59e0b', '#d97706', '#fbbf24', 'linear-gradient(135deg, #451a03 0%, #78350f 100%)', 'vip', 'epic'),
('holographic', 'Holographique', 'Effet holographique', '#67e8f9', '#a78bfa', '#f472b6', 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #581c87 100%)', 'vip', 'legendary')
ON CONFLICT (slug) DO NOTHING;

-- Backgrounds par défaut
INSERT INTO profile_backgrounds (slug, name, description, background_type, background_value, unlock_type, rarity) VALUES
('default', 'Classique', 'Fond par défaut', 'gradient', 'linear-gradient(135deg, #18181b 0%, #27272a 100%)', 'free', 'common'),
('stars', 'Étoiles', 'Ciel étoilé', 'pattern', 'stars', 'level', 'uncommon'),
('geometric', 'Géométrique', 'Motifs géométriques', 'pattern', 'geometric', 'level', 'uncommon'),
('waves', 'Vagues', 'Vagues abstraites', 'animated', 'waves', 'achievement', 'rare'),
('particles', 'Particules', 'Particules flottantes', 'animated', 'particles', 'achievement', 'rare'),
('aurora', 'Aurore', 'Aurore boréale', 'animated', 'aurora', 'vip', 'epic'),
('matrix', 'Matrix', 'Code qui défile', 'animated', 'matrix', 'achievement', 'legendary')
ON CONFLICT (slug) DO NOTHING;

COMMIT;
