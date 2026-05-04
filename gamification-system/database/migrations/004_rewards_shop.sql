-- ============================================================================
-- TEENS PARTY MOROCCO - Rewards Shop System
-- Migration: 004_rewards_shop.sql
-- Description: Système de boutique de récompenses (XP → Avantages)
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Table des catégories de récompenses
CREATE TABLE IF NOT EXISTS reward_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT 'gift',
    color VARCHAR(50) NOT NULL DEFAULT 'cyan',
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des récompenses disponibles
CREATE TABLE IF NOT EXISTS shop_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES reward_categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(255),
    image_url TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT 'gift',

    -- Pricing
    xp_cost INT NOT NULL CHECK (xp_cost >= 0),
    original_xp_cost INT, -- Pour afficher les promos

    -- Availability
    stock_type VARCHAR(20) NOT NULL DEFAULT 'unlimited' CHECK (stock_type IN ('unlimited', 'limited', 'unique')),
    stock_quantity INT DEFAULT NULL,
    stock_remaining INT DEFAULT NULL,

    -- Requirements
    min_level INT DEFAULT 1,
    required_badge_id UUID REFERENCES achievements(id),
    vip_only BOOLEAN NOT NULL DEFAULT FALSE,
    min_vip_tier VARCHAR(20),

    -- Limits
    purchase_limit_per_user INT DEFAULT NULL, -- NULL = illimité
    purchase_limit_period VARCHAR(20) DEFAULT NULL CHECK (purchase_limit_period IN ('daily', 'weekly', 'monthly', 'lifetime')),

    -- Timing
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,

    -- Reward details
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN (
        'discount', 'free_entry', 'skip_queue', 'exclusive_access',
        'physical_item', 'digital_item', 'experience', 'lottery_ticket',
        'xp_multiplier', 'profile_customization', 'mystery_box'
    )),
    reward_value JSONB NOT NULL DEFAULT '{}',

    -- Metadata
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_new BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des achats utilisateurs
CREATE TABLE IF NOT EXISTS user_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES shop_rewards(id) ON DELETE CASCADE,

    -- Purchase details
    xp_spent INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'used', 'expired', 'refunded')),

    -- Usage tracking
    used_at TIMESTAMPTZ,
    used_at_event_id UUID,
    expires_at TIMESTAMPTZ,

    -- Metadata
    purchase_metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des codes promo
CREATE TABLE IF NOT EXISTS shop_promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,

    -- Discount type
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_xp')),
    discount_value INT NOT NULL,

    -- Restrictions
    applicable_reward_ids UUID[] DEFAULT NULL, -- NULL = tous les produits
    applicable_category_ids UUID[] DEFAULT NULL,
    min_xp_cost INT DEFAULT 0,

    -- Limits
    max_uses INT DEFAULT NULL,
    max_uses_per_user INT DEFAULT 1,
    current_uses INT NOT NULL DEFAULT 0,

    -- Timing
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table d'utilisation des codes promo
CREATE TABLE IF NOT EXISTS promo_code_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID NOT NULL REFERENCES shop_promo_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES user_purchases(id) ON DELETE SET NULL,
    xp_saved INT NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(promo_code_id, user_id, purchase_id)
);

-- Table des wishlists
CREATE TABLE IF NOT EXISTS user_wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES shop_rewards(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notify_on_sale BOOLEAN NOT NULL DEFAULT TRUE,

    UNIQUE(user_id, reward_id)
);

-- ============================================================================
-- INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shop_rewards_category ON shop_rewards(category_id);
CREATE INDEX IF NOT EXISTS idx_shop_rewards_active ON shop_rewards(is_active, available_from, available_until);
CREATE INDEX IF NOT EXISTS idx_shop_rewards_featured ON shop_rewards(is_featured, is_active);
CREATE INDEX IF NOT EXISTS idx_shop_rewards_type ON shop_rewards(reward_type);

CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_reward ON user_purchases(reward_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_status ON user_purchases(status);

CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_user ON user_wishlists(user_id);

-- ============================================================================
-- SEED DATA - CATEGORIES
-- ============================================================================

INSERT INTO reward_categories (name, slug, description, icon, color, display_order) VALUES
    ('Entrées & Accès', 'entries', 'Billets gratuits et accès VIP', 'ticket', 'cyan', 1),
    ('Avantages Events', 'event-perks', 'Skip queue, accès backstage...', 'star', 'yellow', 2),
    ('Réductions', 'discounts', 'Réductions sur les prochains events', 'percent', 'green', 3),
    ('Goodies', 'goodies', 'Produits dérivés exclusifs', 'gift', 'purple', 4),
    ('Expériences', 'experiences', 'Meet & Greet, sessions DJ...', 'sparkles', 'pink', 5),
    ('Personnalisation', 'customization', 'Cadres, titres, couleurs profil', 'palette', 'orange', 6),
    ('Mystery Box', 'mystery', 'Boîtes surprises avec récompenses aléatoires', 'box', 'red', 7)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEED DATA - REWARDS
-- ============================================================================

-- Entrées & Accès
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, min_level, reward_type, reward_value, is_featured, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'entries'),
        'Entrée Gratuite',
        'Une entrée gratuite pour n''importe quel événement Teen''s Party Morocco. Valable 3 mois.',
        'Entrée gratuite (valable 3 mois)',
        'ticket',
        5000, 'unlimited', 5,
        'free_entry',
        '{"valid_days": 90, "event_type": "any"}',
        TRUE, 1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'entries'),
        'Pass VIP Event',
        'Accès VIP pour un événement : entrée prioritaire, zone VIP, et boisson offerte.',
        'Pass VIP complet pour un event',
        'crown',
        12000, 'limited', 15,
        'exclusive_access',
        '{"access_type": "vip", "includes": ["priority_entry", "vip_zone", "free_drink"]}',
        TRUE, 2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'entries'),
        'Entrée + 1 Ami',
        'Une entrée pour toi et un ami gratuitement. Parce que c''est mieux à deux !',
        'Entrée duo gratuite',
        'users',
        8000, 'unlimited', 10,
        'free_entry',
        '{"valid_days": 60, "quantity": 2}',
        FALSE, 3
    )
ON CONFLICT DO NOTHING;

-- Avantages Events
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, min_level, reward_type, reward_value, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'event-perks'),
        'Skip Queue',
        'Coupe-file garanti pour ton prochain événement. Fini les longues files d''attente !',
        'Coupe-file pour un event',
        'zap',
        2000, 'unlimited', 3,
        'skip_queue',
        '{"valid_events": 1}',
        1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'event-perks'),
        'Accès Backstage',
        'Découvre les coulisses ! Visite exclusive backstage pendant un event.',
        'Visite backstage exclusive',
        'door-open',
        8000, 'limited', 20,
        'exclusive_access',
        '{"access_type": "backstage", "duration_minutes": 30}',
        2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'event-perks'),
        'Table Réservée',
        'Une table réservée pour toi et 3 amis dans la zone premium.',
        'Table VIP pour 4 personnes',
        'armchair',
        15000, 'limited', 25,
        'exclusive_access',
        '{"access_type": "reserved_table", "capacity": 4}',
        3
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'event-perks'),
        'Photo avec DJ',
        'Session photo exclusive avec le DJ de la soirée. Immortalise le moment !',
        'Photo avec l''artiste',
        'camera',
        6000, 'limited', 15,
        'experience',
        '{"experience_type": "photo_session", "with": "dj"}',
        4
    )
ON CONFLICT DO NOTHING;

-- Réductions
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, min_level, reward_type, reward_value, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'discounts'),
        '-20% sur l''entrée',
        'Réduction de 20% sur ta prochaine entrée. Cumulable avec d''autres offres.',
        '20% de réduction',
        'percent',
        1000, 'unlimited', 1,
        'discount',
        '{"discount_percent": 20, "applies_to": "entry"}',
        1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'discounts'),
        '-50% sur l''entrée',
        'Grosse réduction de 50% sur une entrée. Offre limitée !',
        '50% de réduction',
        'badge-percent',
        3000, 'unlimited', 10,
        'discount',
        '{"discount_percent": 50, "applies_to": "entry"}',
        2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'discounts'),
        '-30% au Bar',
        'Réduction de 30% sur toutes les boissons pendant un event.',
        '30% sur les boissons',
        'glass-water',
        2500, 'unlimited', 8,
        'discount',
        '{"discount_percent": 30, "applies_to": "bar"}',
        3
    )
ON CONFLICT DO NOTHING;

-- Goodies
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, stock_quantity, stock_remaining, min_level, reward_type, reward_value, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'goodies'),
        'T-Shirt Teen''s Party',
        'T-shirt officiel Teen''s Party Morocco. Design exclusif, 100% coton.',
        'T-shirt officiel exclusif',
        'shirt',
        7000, 'limited', 100, 100, 10,
        'physical_item',
        '{"item_type": "tshirt", "sizes": ["S", "M", "L", "XL"]}',
        1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'goodies'),
        'Casquette Teen''s Party',
        'Casquette snapback officielle avec logo brodé.',
        'Casquette officielle',
        'hard-hat',
        4500, 'limited', 50, 50, 8,
        'physical_item',
        '{"item_type": "cap"}',
        2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'goodies'),
        'Bracelet LED',
        'Bracelet lumineux LED connecté aux beats du DJ.',
        'Bracelet LED interactif',
        'watch',
        3000, 'limited', 200, 200, 5,
        'physical_item',
        '{"item_type": "led_bracelet"}',
        3
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'goodies'),
        'Sticker Pack',
        'Pack de 10 stickers holographiques Teen''s Party.',
        'Pack 10 stickers holo',
        'sticker',
        1500, 'unlimited', NULL, NULL, 1,
        'physical_item',
        '{"item_type": "stickers", "quantity": 10}',
        4
    )
ON CONFLICT DO NOTHING;

-- Expériences
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, stock_quantity, stock_remaining, min_level, vip_only, reward_type, reward_value, is_featured, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'experiences'),
        'Meet & Greet Artiste',
        'Rencontre exclusive avec l''artiste principal de la soirée. Durée : 15 minutes.',
        'Rencontre VIP avec l''artiste',
        'handshake',
        25000, 'limited', 5, 5, 30, TRUE,
        'experience',
        '{"experience_type": "meet_greet", "duration_minutes": 15}',
        TRUE, 1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'experiences'),
        'Mini Session DJ',
        'Apprends les bases du mix avec notre DJ résident pendant 30 minutes.',
        'Initiation DJ (30 min)',
        'disc',
        18000, 'limited', 10, 10, 25, FALSE,
        'experience',
        '{"experience_type": "dj_session", "duration_minutes": 30}',
        FALSE, 2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'experiences'),
        'Anniversaire VIP',
        'Célèbre ton anniversaire en VIP : annonce micro, gâteau, et zone réservée.',
        'Pack Anniversaire VIP',
        'cake',
        20000, 'limited', 20, 20, 15, FALSE,
        'experience',
        '{"experience_type": "birthday_vip", "includes": ["announcement", "cake", "reserved_zone"]}',
        TRUE, 3
    )
ON CONFLICT DO NOTHING;

-- Personnalisation
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, min_level, reward_type, reward_value, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'customization'),
        'Cadre Avatar Gold',
        'Cadre doré animé pour ton avatar. Montre ton statut !',
        'Cadre doré animé',
        'frame',
        2000, 'unlimited', 5,
        'profile_customization',
        '{"type": "avatar_frame", "frame_id": "gold_animated"}',
        1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'customization'),
        'Titre "Party Legend"',
        'Titre spécial affiché sous ton pseudo.',
        'Titre exclusif',
        'badge',
        3500, 'unique', 10,
        'profile_customization',
        '{"type": "title", "title": "Party Legend"}',
        2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'customization'),
        'Couleur Pseudo Rainbow',
        'Ton pseudo en dégradé arc-en-ciel animé.',
        'Pseudo multicolore animé',
        'palette',
        5000, 'unlimited', 20,
        'profile_customization',
        '{"type": "name_color", "color_id": "rainbow_animated"}',
        3
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'customization'),
        'Badge Vérifié',
        'Badge de vérification à côté de ton pseudo. Le vrai flex.',
        'Badge ✓ vérifié',
        'badge-check',
        10000, 'unique', 30,
        'profile_customization',
        '{"type": "verified_badge"}',
        4
    )
ON CONFLICT DO NOTHING;

-- Mystery Box
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, min_level, reward_type, reward_value, is_new, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'mystery'),
        'Mystery Box Bronze',
        'Boîte mystère avec récompense aléatoire. Peut contenir : réductions, XP bonus, goodies...',
        'Boîte surprise (petite)',
        'box',
        1500, 'unlimited', 1,
        'mystery_box',
        '{"tier": "bronze", "possible_rewards": ["discount_10", "xp_500", "sticker"]}',
        TRUE, 1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'mystery'),
        'Mystery Box Silver',
        'Boîte mystère premium. Chances de gagner une entrée gratuite ou des goodies rares !',
        'Boîte surprise (moyenne)',
        'box',
        4000, 'unlimited', 10,
        'mystery_box',
        '{"tier": "silver", "possible_rewards": ["discount_30", "xp_2000", "free_entry", "cap"]}',
        TRUE, 2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'mystery'),
        'Mystery Box Gold',
        'La boîte ultime ! Récompenses exclusives garanties. Peut contenir des expériences VIP !',
        'Boîte surprise (grande)',
        'crown',
        10000, 'unlimited', 25,
        'mystery_box',
        '{"tier": "gold", "possible_rewards": ["vip_pass", "meet_greet", "tshirt", "xp_5000"]}',
        TRUE, 3
    )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour récupérer les récompenses disponibles
CREATE OR REPLACE FUNCTION get_shop_rewards(
    p_user_id UUID,
    p_category_slug VARCHAR DEFAULT NULL,
    p_only_affordable BOOLEAN DEFAULT FALSE,
    p_only_available BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    reward_id UUID,
    category_id UUID,
    category_name VARCHAR,
    category_slug VARCHAR,
    name VARCHAR,
    description TEXT,
    short_description VARCHAR,
    image_url TEXT,
    icon VARCHAR,
    xp_cost INT,
    original_xp_cost INT,
    stock_type VARCHAR,
    stock_remaining INT,
    min_level INT,
    required_badge_id UUID,
    vip_only BOOLEAN,
    reward_type VARCHAR,
    reward_value JSONB,
    is_featured BOOLEAN,
    is_new BOOLEAN,
    can_purchase BOOLEAN,
    user_purchase_count INT,
    purchase_limit INT,
    is_in_wishlist BOOLEAN
) AS $$
DECLARE
    v_user_level INT;
    v_user_xp INT;
    v_user_vip_tier VARCHAR;
BEGIN
    -- Get user info
    SELECT level, total_xp INTO v_user_level, v_user_xp
    FROM profiles WHERE id = p_user_id;

    v_user_level := COALESCE(v_user_level, 1);
    v_user_xp := COALESCE(v_user_xp, 0);

    RETURN QUERY
    SELECT
        sr.id as reward_id,
        sr.category_id,
        rc.name as category_name,
        rc.slug as category_slug,
        sr.name,
        sr.description,
        sr.short_description,
        sr.image_url,
        sr.icon,
        sr.xp_cost,
        sr.original_xp_cost,
        sr.stock_type,
        sr.stock_remaining,
        sr.min_level,
        sr.required_badge_id,
        sr.vip_only,
        sr.reward_type,
        sr.reward_value,
        sr.is_featured,
        sr.is_new,
        -- Can purchase check
        (
            sr.is_active
            AND v_user_level >= sr.min_level
            AND v_user_xp >= sr.xp_cost
            AND (sr.stock_type = 'unlimited' OR COALESCE(sr.stock_remaining, 0) > 0)
            AND (sr.available_from IS NULL OR sr.available_from <= NOW())
            AND (sr.available_until IS NULL OR sr.available_until >= NOW())
            AND (
                sr.purchase_limit_per_user IS NULL
                OR (
                    SELECT COUNT(*) FROM user_purchases up
                    WHERE up.user_id = p_user_id
                    AND up.reward_id = sr.id
                    AND up.status != 'refunded'
                ) < sr.purchase_limit_per_user
            )
        ) as can_purchase,
        -- User purchase count
        (
            SELECT COUNT(*)::INT FROM user_purchases up
            WHERE up.user_id = p_user_id
            AND up.reward_id = sr.id
            AND up.status != 'refunded'
        ) as user_purchase_count,
        sr.purchase_limit_per_user as purchase_limit,
        -- Is in wishlist
        EXISTS(
            SELECT 1 FROM user_wishlists uw
            WHERE uw.user_id = p_user_id AND uw.reward_id = sr.id
        ) as is_in_wishlist
    FROM shop_rewards sr
    LEFT JOIN reward_categories rc ON sr.category_id = rc.id
    WHERE sr.is_active = TRUE
        AND (p_category_slug IS NULL OR rc.slug = p_category_slug)
        AND (NOT p_only_available OR (
            (sr.available_from IS NULL OR sr.available_from <= NOW())
            AND (sr.available_until IS NULL OR sr.available_until >= NOW())
        ))
        AND (NOT p_only_affordable OR v_user_xp >= sr.xp_cost)
    ORDER BY sr.is_featured DESC, rc.display_order, sr.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour acheter une récompense
CREATE OR REPLACE FUNCTION purchase_reward(
    p_user_id UUID,
    p_reward_id UUID,
    p_promo_code VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_reward shop_rewards%ROWTYPE;
    v_user_xp INT;
    v_user_level INT;
    v_final_cost INT;
    v_discount INT := 0;
    v_promo_id UUID;
    v_purchase_id UUID;
    v_purchase_count INT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Lock the reward row
    SELECT * INTO v_reward FROM shop_rewards WHERE id = p_reward_id FOR UPDATE;

    IF v_reward IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense non trouvée');
    END IF;

    IF NOT v_reward.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense non disponible');
    END IF;

    -- Check availability dates
    IF v_reward.available_from IS NOT NULL AND v_reward.available_from > NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense pas encore disponible');
    END IF;

    IF v_reward.available_until IS NOT NULL AND v_reward.available_until < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense expirée');
    END IF;

    -- Check stock
    IF v_reward.stock_type != 'unlimited' AND COALESCE(v_reward.stock_remaining, 0) <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rupture de stock');
    END IF;

    -- Get user info
    SELECT total_xp, level INTO v_user_xp, v_user_level
    FROM profiles WHERE id = p_user_id;

    -- Check level requirement
    IF COALESCE(v_user_level, 1) < v_reward.min_level THEN
        RETURN jsonb_build_object('success', false, 'error', 'Niveau insuffisant');
    END IF;

    -- Check purchase limit
    IF v_reward.purchase_limit_per_user IS NOT NULL THEN
        SELECT COUNT(*) INTO v_purchase_count
        FROM user_purchases
        WHERE user_id = p_user_id
        AND reward_id = p_reward_id
        AND status != 'refunded';

        IF v_purchase_count >= v_reward.purchase_limit_per_user THEN
            RETURN jsonb_build_object('success', false, 'error', 'Limite d''achat atteinte');
        END IF;
    END IF;

    -- Apply promo code if provided
    v_final_cost := v_reward.xp_cost;

    IF p_promo_code IS NOT NULL THEN
        SELECT id INTO v_promo_id
        FROM shop_promo_codes
        WHERE code = UPPER(p_promo_code)
            AND is_active = TRUE
            AND valid_from <= NOW()
            AND (valid_until IS NULL OR valid_until >= NOW())
            AND (max_uses IS NULL OR current_uses < max_uses)
            AND (
                applicable_reward_ids IS NULL
                OR p_reward_id = ANY(applicable_reward_ids)
            )
            AND (
                applicable_category_ids IS NULL
                OR v_reward.category_id = ANY(applicable_category_ids)
            );

        IF v_promo_id IS NOT NULL THEN
            -- Check user usage
            IF NOT EXISTS (
                SELECT 1 FROM promo_code_uses
                WHERE promo_code_id = v_promo_id AND user_id = p_user_id
                HAVING COUNT(*) >= (SELECT max_uses_per_user FROM shop_promo_codes WHERE id = v_promo_id)
            ) THEN
                SELECT
                    CASE
                        WHEN discount_type = 'percentage' THEN v_reward.xp_cost * discount_value / 100
                        ELSE discount_value
                    END INTO v_discount
                FROM shop_promo_codes WHERE id = v_promo_id;

                v_final_cost := GREATEST(0, v_reward.xp_cost - v_discount);
            END IF;
        END IF;
    END IF;

    -- Check XP
    IF COALESCE(v_user_xp, 0) < v_final_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'XP insuffisants');
    END IF;

    -- Calculate expiry for certain reward types
    IF v_reward.reward_type IN ('free_entry', 'discount', 'skip_queue') THEN
        v_expires_at := NOW() + INTERVAL '90 days';
    ELSIF v_reward.reward_type = 'xp_multiplier' THEN
        v_expires_at := NOW() + INTERVAL '24 hours';
    END IF;

    -- Deduct XP
    UPDATE profiles
    SET total_xp = total_xp - v_final_cost
    WHERE id = p_user_id;

    -- Update stock
    IF v_reward.stock_type != 'unlimited' THEN
        UPDATE shop_rewards
        SET stock_remaining = stock_remaining - 1
        WHERE id = p_reward_id;
    END IF;

    -- Create purchase record
    INSERT INTO user_purchases (user_id, reward_id, xp_spent, expires_at)
    VALUES (p_user_id, p_reward_id, v_final_cost, v_expires_at)
    RETURNING id INTO v_purchase_id;

    -- Record promo code use
    IF v_promo_id IS NOT NULL AND v_discount > 0 THEN
        INSERT INTO promo_code_uses (promo_code_id, user_id, purchase_id, xp_saved)
        VALUES (v_promo_id, p_user_id, v_purchase_id, v_discount);

        UPDATE shop_promo_codes
        SET current_uses = current_uses + 1
        WHERE id = v_promo_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', v_purchase_id,
        'xp_spent', v_final_cost,
        'discount_applied', v_discount,
        'reward_name', v_reward.name,
        'reward_type', v_reward.reward_type,
        'reward_value', v_reward.reward_value,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour récupérer les achats d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_purchases(
    p_user_id UUID,
    p_status VARCHAR DEFAULT NULL,
    p_include_expired BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    purchase_id UUID,
    reward_id UUID,
    reward_name VARCHAR,
    reward_description TEXT,
    reward_icon VARCHAR,
    reward_type VARCHAR,
    reward_value JSONB,
    xp_spent INT,
    status VARCHAR,
    purchased_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_expired BOOLEAN,
    is_usable BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        up.id as purchase_id,
        sr.id as reward_id,
        sr.name as reward_name,
        sr.description as reward_description,
        sr.icon as reward_icon,
        sr.reward_type,
        sr.reward_value,
        up.xp_spent,
        up.status,
        up.created_at as purchased_at,
        up.used_at,
        up.expires_at,
        (up.expires_at IS NOT NULL AND up.expires_at < NOW()) as is_expired,
        (up.status = 'completed' AND (up.expires_at IS NULL OR up.expires_at >= NOW())) as is_usable
    FROM user_purchases up
    JOIN shop_rewards sr ON up.reward_id = sr.id
    WHERE up.user_id = p_user_id
        AND (p_status IS NULL OR up.status = p_status)
        AND (p_include_expired OR up.expires_at IS NULL OR up.expires_at >= NOW() OR up.status != 'completed')
    ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour utiliser une récompense
CREATE OR REPLACE FUNCTION use_reward(
    p_user_id UUID,
    p_purchase_id UUID,
    p_event_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_purchase user_purchases%ROWTYPE;
    v_reward shop_rewards%ROWTYPE;
BEGIN
    SELECT * INTO v_purchase FROM user_purchases
    WHERE id = p_purchase_id AND user_id = p_user_id FOR UPDATE;

    IF v_purchase IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Achat non trouvé');
    END IF;

    IF v_purchase.status != 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense déjà utilisée ou expirée');
    END IF;

    IF v_purchase.expires_at IS NOT NULL AND v_purchase.expires_at < NOW() THEN
        UPDATE user_purchases SET status = 'expired' WHERE id = p_purchase_id;
        RETURN jsonb_build_object('success', false, 'error', 'Récompense expirée');
    END IF;

    SELECT * INTO v_reward FROM shop_rewards WHERE id = v_purchase.reward_id;

    UPDATE user_purchases
    SET status = 'used', used_at = NOW(), used_at_event_id = p_event_id
    WHERE id = p_purchase_id;

    RETURN jsonb_build_object(
        'success', true,
        'reward_type', v_reward.reward_type,
        'reward_value', v_reward.reward_value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour ajouter/retirer de la wishlist
CREATE OR REPLACE FUNCTION toggle_wishlist(
    p_user_id UUID,
    p_reward_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_wishlists
        WHERE user_id = p_user_id AND reward_id = p_reward_id
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM user_wishlists
        WHERE user_id = p_user_id AND reward_id = p_reward_id;
        RETURN jsonb_build_object('success', true, 'action', 'removed');
    ELSE
        INSERT INTO user_wishlists (user_id, reward_id)
        VALUES (p_user_id, p_reward_id);
        RETURN jsonb_build_object('success', true, 'action', 'added');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE reward_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wishlists ENABLE ROW LEVEL SECURITY;

-- Categories: everyone can read
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON reward_categories;
CREATE POLICY "Categories are viewable by everyone" ON reward_categories
    FOR SELECT USING (is_active = TRUE);

-- Rewards: everyone can read active ones
DROP POLICY IF EXISTS "Active rewards are viewable by everyone" ON shop_rewards;
CREATE POLICY "Active rewards are viewable by everyone" ON shop_rewards
    FOR SELECT USING (is_active = TRUE);

-- Purchases: users can only see their own
DROP POLICY IF EXISTS "Users can view own purchases" ON user_purchases;
CREATE POLICY "Users can view own purchases" ON user_purchases
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own purchases" ON user_purchases;
CREATE POLICY "Users can insert own purchases" ON user_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Promo codes: read only for validation
DROP POLICY IF EXISTS "Promo codes are readable for validation" ON shop_promo_codes;
CREATE POLICY "Promo codes are readable for validation" ON shop_promo_codes
    FOR SELECT USING (is_active = TRUE);

-- Promo uses: users see their own
DROP POLICY IF EXISTS "Users can view own promo uses" ON promo_code_uses;
CREATE POLICY "Users can view own promo uses" ON promo_code_uses
    FOR SELECT USING (auth.uid() = user_id);

-- Wishlists: users manage their own
DROP POLICY IF EXISTS "Users can manage own wishlist" ON user_wishlists;
CREATE POLICY "Users can manage own wishlist" ON user_wishlists
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_shop_reward_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_rewards_updated_at ON shop_rewards;
CREATE TRIGGER shop_rewards_updated_at
    BEFORE UPDATE ON shop_rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_shop_reward_timestamp();
