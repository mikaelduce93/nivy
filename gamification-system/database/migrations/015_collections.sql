-- ============================================================================
-- TEENS PARTY MOROCCO - Collections System
-- ============================================================================
-- Migration: 015_collections.sql
-- Description: Système de collections (cartes, stickers)
-- ============================================================================

-- ============================================================================
-- COLLECTION SETS (ensembles de cartes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS collection_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Visuel
    cover_image_url TEXT,
    theme_color VARCHAR(20),
    theme_gradient TEXT,

    -- Configuration
    total_items INTEGER NOT NULL DEFAULT 0,
    set_type VARCHAR(30) NOT NULL, -- cards, stickers, photos, moments

    -- Récompenses pour complétion
    completion_xp INTEGER DEFAULT 500,
    completion_coins INTEGER DEFAULT 200,
    completion_badge_id UUID,
    completion_title_id UUID,

    -- Disponibilité
    is_active BOOLEAN DEFAULT true,
    is_limited BOOLEAN DEFAULT false,
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    season VARCHAR(50), -- summer_2024, winter_2024, etc.

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COLLECTIBLE ITEMS (cartes/stickers individuels)
-- ============================================================================

CREATE TABLE IF NOT EXISTS collectible_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID NOT NULL REFERENCES collection_sets(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Visuel
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    animation_type VARCHAR(30), -- none, shimmer, holographic, animated

    -- Position dans le set
    item_number INTEGER NOT NULL,

    -- Rareté et drop rate
    rarity VARCHAR(20) NOT NULL DEFAULT 'common', -- common, uncommon, rare, epic, legendary
    drop_rate DECIMAL(5,4) DEFAULT 0.3, -- 30% par défaut

    -- Sources d'obtention
    obtainable_from VARCHAR(30)[], -- event, game, challenge, shop, gift
    event_exclusive BOOLEAN DEFAULT false,
    event_id UUID,

    -- Prix si achetable
    coin_price INTEGER,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(set_id, item_number)
);

CREATE INDEX IF NOT EXISTS idx_collectible_items_set ON collectible_items(set_id);
CREATE INDEX IF NOT EXISTS idx_collectible_items_rarity ON collectible_items(rarity);

-- ============================================================================
-- USER COLLECTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_collectibles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES collectible_items(id) ON DELETE CASCADE,

    -- Acquisition
    obtained_at TIMESTAMPTZ DEFAULT NOW(),
    obtained_from VARCHAR(50), -- event, game, challenge, shop, gift, trade

    -- Quantité (pour les doublons)
    quantity INTEGER DEFAULT 1,

    -- État
    is_new BOOLEAN DEFAULT true, -- Pour animation "nouveau"
    is_favorite BOOLEAN DEFAULT false,

    -- Contexte d'obtention
    source_event_id UUID,
    source_game_id UUID,
    gifted_by_user_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_collectibles_user ON user_collectibles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collectibles_item ON user_collectibles(item_id);

-- ============================================================================
-- USER COLLECTION PROGRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_collection_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    set_id UUID NOT NULL REFERENCES collection_sets(id) ON DELETE CASCADE,

    items_collected INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0,

    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    rewards_claimed BOOLEAN DEFAULT false,
    rewards_claimed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, set_id)
);

-- ============================================================================
-- COLLECTION TRADES (échanges entre joueurs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS collection_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Initiateur
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_item_ids UUID[] NOT NULL,

    -- Destinataire
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_item_ids UUID[] NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected, cancelled, completed

    -- Messages
    sender_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_collection_trades_sender ON collection_trades(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_collection_trades_receiver ON collection_trades(receiver_id, status);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour ajouter un collectible à un utilisateur
CREATE OR REPLACE FUNCTION add_collectible_to_user(
    p_user_id UUID,
    p_item_id UUID,
    p_source VARCHAR(50) DEFAULT 'system',
    p_source_event_id UUID DEFAULT NULL,
    p_gifted_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_set RECORD;
    v_is_new BOOLEAN := TRUE;
    v_new_quantity INTEGER := 1;
    v_progress RECORD;
BEGIN
    -- Récupérer l'item
    SELECT ci.*, cs.total_items as set_total
    INTO v_item
    FROM collectible_items ci
    JOIN collection_sets cs ON cs.id = ci.set_id
    WHERE ci.id = p_item_id;

    IF v_item IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;

    -- Ajouter ou mettre à jour le collectible
    INSERT INTO user_collectibles (user_id, item_id, obtained_from, source_event_id, gifted_by_user_id)
    VALUES (p_user_id, p_item_id, p_source, p_source_event_id, p_gifted_by)
    ON CONFLICT (user_id, item_id) DO UPDATE SET
        quantity = user_collectibles.quantity + 1,
        is_new = false,
        updated_at = NOW()
    RETURNING quantity, is_new = true INTO v_new_quantity, v_is_new;

    -- Mettre à jour la progression
    INSERT INTO user_collection_progress (user_id, set_id, total_items)
    VALUES (p_user_id, v_item.set_id, v_item.set_total)
    ON CONFLICT (user_id, set_id) DO NOTHING;

    -- Recalculer la progression
    UPDATE user_collection_progress SET
        items_collected = (
            SELECT COUNT(DISTINCT uc.item_id)
            FROM user_collectibles uc
            JOIN collectible_items ci ON ci.id = uc.item_id
            WHERE uc.user_id = p_user_id AND ci.set_id = v_item.set_id
        ),
        completion_percentage = (
            SELECT ROUND(COUNT(DISTINCT uc.item_id)::DECIMAL / v_item.set_total * 100, 2)
            FROM user_collectibles uc
            JOIN collectible_items ci ON ci.id = uc.item_id
            WHERE uc.user_id = p_user_id AND ci.set_id = v_item.set_id
        ),
        updated_at = NOW()
    WHERE user_id = p_user_id AND set_id = v_item.set_id
    RETURNING * INTO v_progress;

    -- Vérifier si le set est complété
    IF v_progress.items_collected >= v_item.set_total AND NOT v_progress.is_completed THEN
        UPDATE user_collection_progress SET
            is_completed = true,
            completed_at = NOW()
        WHERE user_id = p_user_id AND set_id = v_item.set_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'is_new_item', v_is_new,
        'quantity', v_new_quantity,
        'item', row_to_json(v_item),
        'progress', json_build_object(
            'items_collected', v_progress.items_collected,
            'total_items', v_progress.total_items,
            'percentage', v_progress.completion_percentage,
            'is_completed', v_progress.items_collected >= v_item.set_total
        )
    );
END;
$$;

-- Fonction pour obtenir un item aléatoire basé sur les drop rates
CREATE OR REPLACE FUNCTION get_random_collectible(
    p_set_id UUID DEFAULT NULL,
    p_rarity VARCHAR(20) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item_id UUID;
BEGIN
    -- Sélection pondérée par drop_rate
    SELECT id INTO v_item_id
    FROM collectible_items
    WHERE is_active = true
    AND (p_set_id IS NULL OR set_id = p_set_id)
    AND (p_rarity IS NULL OR rarity = p_rarity)
    ORDER BY random() * (1.0 / NULLIF(drop_rate, 0))
    LIMIT 1;

    RETURN v_item_id;
END;
$$;

-- Fonction pour obtenir les collections d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_collections(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sets JSON;
    v_recent JSON;
    v_stats JSON;
BEGIN
    -- Sets avec progression
    SELECT json_agg(
        json_build_object(
            'set', row_to_json(cs),
            'progress', row_to_json(ucp),
            'collected_items', (
                SELECT json_agg(ci.id)
                FROM user_collectibles uc
                JOIN collectible_items ci ON ci.id = uc.item_id
                WHERE uc.user_id = p_user_id AND ci.set_id = cs.id
            )
        )
    ) INTO v_sets
    FROM collection_sets cs
    LEFT JOIN user_collection_progress ucp ON ucp.set_id = cs.id AND ucp.user_id = p_user_id
    WHERE cs.is_active = true;

    -- Items récents
    SELECT json_agg(
        json_build_object(
            'item', row_to_json(ci),
            'obtained_at', uc.obtained_at,
            'is_new', uc.is_new
        ) ORDER BY uc.obtained_at DESC
    ) INTO v_recent
    FROM user_collectibles uc
    JOIN collectible_items ci ON ci.id = uc.item_id
    WHERE uc.user_id = p_user_id
    LIMIT 10;

    -- Stats globales
    SELECT json_build_object(
        'total_items', COUNT(DISTINCT uc.item_id),
        'total_duplicates', COALESCE(SUM(uc.quantity) - COUNT(DISTINCT uc.item_id), 0),
        'sets_completed', (
            SELECT COUNT(*) FROM user_collection_progress WHERE user_id = p_user_id AND is_completed = true
        ),
        'rarity_breakdown', (
            SELECT json_object_agg(ci.rarity, count)
            FROM (
                SELECT ci.rarity, COUNT(DISTINCT uc.item_id) as count
                FROM user_collectibles uc
                JOIN collectible_items ci ON ci.id = uc.item_id
                WHERE uc.user_id = p_user_id
                GROUP BY ci.rarity
            ) ci
        )
    ) INTO v_stats
    FROM user_collectibles uc
    WHERE uc.user_id = p_user_id;

    RETURN json_build_object(
        'sets', COALESCE(v_sets, '[]'::json),
        'recent', COALESCE(v_recent, '[]'::json),
        'stats', v_stats
    );
END;
$$;

-- Fonction pour réclamer les récompenses d'un set complété
CREATE OR REPLACE FUNCTION claim_set_completion_rewards(
    p_user_id UUID,
    p_set_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_progress RECORD;
    v_set RECORD;
BEGIN
    -- Vérifier la progression
    SELECT * INTO v_progress
    FROM user_collection_progress
    WHERE user_id = p_user_id AND set_id = p_set_id;

    IF v_progress IS NULL OR NOT v_progress.is_completed THEN
        RETURN json_build_object('success', false, 'error', 'Set not completed');
    END IF;

    IF v_progress.rewards_claimed THEN
        RETURN json_build_object('success', false, 'error', 'Rewards already claimed');
    END IF;

    -- Récupérer les infos du set
    SELECT * INTO v_set FROM collection_sets WHERE id = p_set_id;

    -- Marquer comme réclamé
    UPDATE user_collection_progress SET
        rewards_claimed = true,
        rewards_claimed_at = NOW()
    WHERE user_id = p_user_id AND set_id = p_set_id;

    -- Les récompenses XP/coins seront ajoutées via une autre fonction
    -- Ici on retourne juste ce qui doit être ajouté

    RETURN json_build_object(
        'success', true,
        'rewards', json_build_object(
            'xp', v_set.completion_xp,
            'coins', v_set.completion_coins,
            'badge_id', v_set.completion_badge_id,
            'title_id', v_set.completion_title_id
        )
    );
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE collection_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectible_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collectibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collection_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_trades ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active collection sets"
ON collection_sets FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active collectible items"
ON collectible_items FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their collectibles"
ON user_collectibles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their collection progress"
ON user_collection_progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their trades"
ON collection_trades FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create trades"
ON collection_trades FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their trades"
ON collection_trades FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Set de base: Cartes des Événements
INSERT INTO collection_sets (slug, name, description, set_type, total_items, theme_color, completion_xp, completion_coins)
VALUES
('event_memories', 'Souvenirs d''Événements', 'Collectionne les cartes des meilleurs moments de nos soirées', 'cards', 20, '#8b5cf6', 1000, 500),
('dj_legends', 'Légendes DJ', 'Les meilleurs DJs qui ont enflammé nos soirées', 'cards', 10, '#f59e0b', 750, 300),
('party_stickers', 'Stickers Party', 'Stickers fun pour personnaliser ton profil', 'stickers', 30, '#ec4899', 500, 200),
('rare_moments', 'Moments Rares', 'Les moments les plus iconiques capturés', 'moments', 12, '#06b6d4', 1500, 750)
ON CONFLICT (slug) DO NOTHING;

-- Items exemples pour event_memories
INSERT INTO collectible_items (set_id, slug, name, description, image_url, item_number, rarity, drop_rate, obtainable_from)
SELECT
    (SELECT id FROM collection_sets WHERE slug = 'event_memories'),
    'em_' || n,
    'Souvenir #' || n,
    'Un moment inoubliable',
    '/collections/event_memories/' || n || '.png',
    n,
    CASE
        WHEN n <= 10 THEN 'common'
        WHEN n <= 15 THEN 'uncommon'
        WHEN n <= 18 THEN 'rare'
        WHEN n <= 19 THEN 'epic'
        ELSE 'legendary'
    END,
    CASE
        WHEN n <= 10 THEN 0.40
        WHEN n <= 15 THEN 0.25
        WHEN n <= 18 THEN 0.10
        WHEN n <= 19 THEN 0.04
        ELSE 0.01
    END,
    ARRAY['event', 'game', 'challenge']
FROM generate_series(1, 20) AS n
ON CONFLICT DO NOTHING;

COMMIT;
