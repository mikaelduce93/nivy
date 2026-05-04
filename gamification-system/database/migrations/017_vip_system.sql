-- ============================================================================
-- TEENS PARTY MOROCCO - Gamified VIP System
-- ============================================================================
-- Migration: 017_vip_system.sql
-- Description: Système VIP gamifié avec tiers progressifs
-- ============================================================================

-- ============================================================================
-- VIP TIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vip_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Niveau requis
    tier_level INTEGER UNIQUE NOT NULL, -- 0=Standard, 1=Bronze, 2=Silver, 3=Gold, 4=Platinum, 5=Diamond, 6=Legendary
    min_lifetime_xp INTEGER NOT NULL DEFAULT 0,
    min_events_attended INTEGER DEFAULT 0,
    min_months_active INTEGER DEFAULT 0,

    -- Style visuel
    color VARCHAR(20) NOT NULL,
    gradient TEXT,
    badge_url TEXT,
    frame_url TEXT,
    icon VARCHAR(50),
    emoji VARCHAR(10),

    -- Multiplicateurs
    xp_multiplier DECIMAL(3,2) DEFAULT 1.00,
    coin_multiplier DECIMAL(3,2) DEFAULT 1.00,
    drop_rate_bonus DECIMAL(3,2) DEFAULT 0.00, -- % bonus sur les drops

    -- Avantages
    max_daily_wheel_spins INTEGER DEFAULT 1,
    max_daily_packs INTEGER DEFAULT 0,
    priority_queue BOOLEAN DEFAULT false,
    early_access_hours INTEGER DEFAULT 0, -- Heures d'accès anticipé aux événements
    exclusive_events BOOLEAN DEFAULT false,
    custom_frame BOOLEAN DEFAULT false,
    custom_title BOOLEAN DEFAULT false,
    discount_percentage INTEGER DEFAULT 0,
    free_monthly_coins INTEGER DEFAULT 0,
    dedicated_support BOOLEAN DEFAULT false,

    -- Fonctionnalités spéciales
    can_create_crew BOOLEAN DEFAULT false,
    max_crew_size INTEGER DEFAULT 0,
    can_host_private_events BOOLEAN DEFAULT false,
    profile_highlight BOOLEAN DEFAULT false,
    leaderboard_highlight BOOLEAN DEFAULT false,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VIP PERKS (avantages détaillés)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vip_perks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_id UUID NOT NULL REFERENCES vip_tiers(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(50), -- events, rewards, social, shop, customization
    is_highlighted BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tier_id, slug)
);

-- ============================================================================
-- USER VIP STATUS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_vip_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    current_tier_id UUID NOT NULL REFERENCES vip_tiers(id),

    -- Progression
    lifetime_xp INTEGER DEFAULT 0,
    current_period_xp INTEGER DEFAULT 0, -- XP du mois/saison en cours
    events_attended INTEGER DEFAULT 0,
    months_active INTEGER DEFAULT 0,
    first_event_date TIMESTAMPTZ,

    -- Prochain tier
    next_tier_id UUID REFERENCES vip_tiers(id),
    xp_to_next_tier INTEGER DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0,

    -- Historique
    tier_achieved_at TIMESTAMPTZ DEFAULT NOW(),
    highest_tier_achieved_id UUID REFERENCES vip_tiers(id),
    tier_history JSONB DEFAULT '[]', -- [{tier_id, achieved_at, lost_at}]

    -- Récompenses mensuelles
    monthly_coins_claimed BOOLEAN DEFAULT false,
    monthly_coins_claimed_at TIMESTAMPTZ,
    last_month_processed VARCHAR(7), -- YYYY-MM

    -- Stats du tier actuel
    benefits_used_count INTEGER DEFAULT 0,
    total_savings INTEGER DEFAULT 0, -- Économies grâce aux réductions

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_vip_status_tier ON user_vip_status(current_tier_id);
CREATE INDEX IF NOT EXISTS idx_user_vip_status_lifetime_xp ON user_vip_status(lifetime_xp DESC);

-- ============================================================================
-- VIP BENEFITS LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS vip_benefits_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES vip_tiers(id),
    benefit_type VARCHAR(50) NOT NULL, -- xp_bonus, coin_bonus, free_pack, discount, etc.
    benefit_value INTEGER, -- Valeur du bénéfice
    context TEXT, -- Description du contexte
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vip_benefits_log_user ON vip_benefits_log(user_id, created_at DESC);

-- ============================================================================
-- VIP EXCLUSIVE ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vip_exclusive_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_tier_id UUID NOT NULL REFERENCES vip_tiers(id),
    item_type VARCHAR(50) NOT NULL, -- frame, title, badge, collectible, shop_item
    item_id UUID NOT NULL, -- ID de l'item dans sa table respective
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Calculer et mettre à jour le tier VIP d'un utilisateur
CREATE OR REPLACE FUNCTION calculate_vip_tier(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status RECORD;
    v_new_tier RECORD;
    v_old_tier_id UUID;
    v_tier_changed BOOLEAN := FALSE;
BEGIN
    -- Récupérer le status actuel
    SELECT * INTO v_status
    FROM user_vip_status
    WHERE user_id = p_user_id;

    -- Si pas de status, créer avec le tier de base
    IF v_status IS NULL THEN
        INSERT INTO user_vip_status (
            user_id,
            current_tier_id,
            lifetime_xp
        )
        SELECT
            p_user_id,
            id,
            COALESCE((SELECT total_xp FROM user_progression WHERE user_id = p_user_id), 0)
        FROM vip_tiers
        WHERE tier_level = 0
        RETURNING * INTO v_status;
    END IF;

    v_old_tier_id := v_status.current_tier_id;

    -- Trouver le tier approprié basé sur l'XP
    SELECT * INTO v_new_tier
    FROM vip_tiers
    WHERE min_lifetime_xp <= v_status.lifetime_xp
    AND is_active = true
    ORDER BY tier_level DESC
    LIMIT 1;

    -- Mettre à jour si le tier a changé
    IF v_new_tier.id != v_old_tier_id THEN
        v_tier_changed := TRUE;

        -- Trouver le prochain tier
        UPDATE user_vip_status SET
            current_tier_id = v_new_tier.id,
            tier_achieved_at = NOW(),
            highest_tier_achieved_id = CASE
                WHEN v_new_tier.tier_level > COALESCE((
                    SELECT tier_level FROM vip_tiers WHERE id = v_status.highest_tier_achieved_id
                ), 0)
                THEN v_new_tier.id
                ELSE v_status.highest_tier_achieved_id
            END,
            tier_history = v_status.tier_history || jsonb_build_object(
                'tier_id', v_new_tier.id,
                'achieved_at', NOW()
            ),
            next_tier_id = (
                SELECT id FROM vip_tiers
                WHERE tier_level = v_new_tier.tier_level + 1
                AND is_active = true
            ),
            xp_to_next_tier = COALESCE((
                SELECT min_lifetime_xp - v_status.lifetime_xp
                FROM vip_tiers
                WHERE tier_level = v_new_tier.tier_level + 1
                AND is_active = true
            ), 0),
            progress_percentage = CASE
                WHEN (
                    SELECT min_lifetime_xp FROM vip_tiers
                    WHERE tier_level = v_new_tier.tier_level + 1
                ) IS NOT NULL
                THEN ROUND(
                    (v_status.lifetime_xp - v_new_tier.min_lifetime_xp)::DECIMAL /
                    ((SELECT min_lifetime_xp FROM vip_tiers WHERE tier_level = v_new_tier.tier_level + 1) - v_new_tier.min_lifetime_xp) * 100,
                    2
                )
                ELSE 100
            END,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSE
        -- Juste mettre à jour la progression
        UPDATE user_vip_status SET
            xp_to_next_tier = COALESCE((
                SELECT min_lifetime_xp - v_status.lifetime_xp
                FROM vip_tiers
                WHERE tier_level = v_new_tier.tier_level + 1
                AND is_active = true
            ), 0),
            progress_percentage = CASE
                WHEN (
                    SELECT min_lifetime_xp FROM vip_tiers
                    WHERE tier_level = v_new_tier.tier_level + 1
                ) IS NOT NULL
                THEN ROUND(
                    (v_status.lifetime_xp - v_new_tier.min_lifetime_xp)::DECIMAL /
                    NULLIF((SELECT min_lifetime_xp FROM vip_tiers WHERE tier_level = v_new_tier.tier_level + 1) - v_new_tier.min_lifetime_xp, 0) * 100,
                    2
                )
                ELSE 100
            END,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'tier_changed', v_tier_changed,
        'old_tier_id', v_old_tier_id,
        'new_tier_id', v_new_tier.id,
        'tier_name', v_new_tier.name,
        'tier_level', v_new_tier.tier_level
    );
END;
$$;

-- Ajouter de l'XP et recalculer le tier
CREATE OR REPLACE FUNCTION add_vip_xp(
    p_user_id UUID,
    p_xp INTEGER,
    p_source VARCHAR(50) DEFAULT 'system'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_multiplier DECIMAL(3,2);
    v_final_xp INTEGER;
    v_result JSON;
BEGIN
    -- Récupérer le multiplicateur du tier actuel
    SELECT COALESCE(vt.xp_multiplier, 1.00) INTO v_multiplier
    FROM user_vip_status uvs
    JOIN vip_tiers vt ON vt.id = uvs.current_tier_id
    WHERE uvs.user_id = p_user_id;

    v_final_xp := ROUND(p_xp * COALESCE(v_multiplier, 1.00));

    -- Mettre à jour l'XP
    UPDATE user_vip_status SET
        lifetime_xp = lifetime_xp + v_final_xp,
        current_period_xp = current_period_xp + v_final_xp,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Logger le bonus si applicable
    IF v_multiplier > 1.00 THEN
        INSERT INTO vip_benefits_log (user_id, tier_id, benefit_type, benefit_value, context)
        SELECT
            p_user_id,
            current_tier_id,
            'xp_bonus',
            v_final_xp - p_xp,
            'XP multiplier from ' || p_source
        FROM user_vip_status WHERE user_id = p_user_id;
    END IF;

    -- Recalculer le tier
    v_result := calculate_vip_tier(p_user_id);

    RETURN json_build_object(
        'success', true,
        'base_xp', p_xp,
        'multiplier', v_multiplier,
        'final_xp', v_final_xp,
        'bonus_xp', v_final_xp - p_xp,
        'tier_result', v_result
    );
END;
$$;

-- Récupérer le statut VIP complet d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_vip_status(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status RECORD;
    v_tier RECORD;
    v_next_tier RECORD;
    v_perks JSON;
BEGIN
    -- Récupérer le status
    SELECT * INTO v_status
    FROM user_vip_status
    WHERE user_id = p_user_id;

    IF v_status IS NULL THEN
        -- Initialiser le status
        PERFORM calculate_vip_tier(p_user_id);
        SELECT * INTO v_status FROM user_vip_status WHERE user_id = p_user_id;
    END IF;

    -- Récupérer le tier actuel
    SELECT * INTO v_tier
    FROM vip_tiers
    WHERE id = v_status.current_tier_id;

    -- Récupérer le prochain tier
    SELECT * INTO v_next_tier
    FROM vip_tiers
    WHERE id = v_status.next_tier_id;

    -- Récupérer les perks
    SELECT json_agg(
        json_build_object(
            'name', name,
            'description', description,
            'icon', icon,
            'category', category,
            'is_highlighted', is_highlighted
        ) ORDER BY sort_order
    ) INTO v_perks
    FROM vip_perks
    WHERE tier_id = v_tier.id;

    RETURN json_build_object(
        'status', row_to_json(v_status),
        'current_tier', row_to_json(v_tier),
        'next_tier', CASE WHEN v_next_tier IS NOT NULL THEN row_to_json(v_next_tier) ELSE NULL END,
        'perks', COALESCE(v_perks, '[]'::json),
        'progress', json_build_object(
            'current_xp', v_status.lifetime_xp,
            'xp_to_next', v_status.xp_to_next_tier,
            'percentage', v_status.progress_percentage,
            'events_attended', v_status.events_attended,
            'months_active', v_status.months_active
        )
    );
END;
$$;

-- Réclamer les coins mensuels
CREATE OR REPLACE FUNCTION claim_monthly_vip_coins(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status RECORD;
    v_tier RECORD;
    v_current_month VARCHAR(7);
BEGIN
    v_current_month := TO_CHAR(NOW(), 'YYYY-MM');

    SELECT * INTO v_status FROM user_vip_status WHERE user_id = p_user_id;

    IF v_status IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'VIP status not found');
    END IF;

    IF v_status.last_month_processed = v_current_month AND v_status.monthly_coins_claimed THEN
        RETURN json_build_object('success', false, 'error', 'Already claimed this month');
    END IF;

    SELECT * INTO v_tier FROM vip_tiers WHERE id = v_status.current_tier_id;

    IF v_tier.free_monthly_coins = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Your tier does not include monthly coins');
    END IF;

    -- Marquer comme réclamé
    UPDATE user_vip_status SET
        monthly_coins_claimed = true,
        monthly_coins_claimed_at = NOW(),
        last_month_processed = v_current_month
    WHERE user_id = p_user_id;

    -- Logger
    INSERT INTO vip_benefits_log (user_id, tier_id, benefit_type, benefit_value, context)
    VALUES (p_user_id, v_tier.id, 'monthly_coins', v_tier.free_monthly_coins, 'Monthly VIP reward');

    RETURN json_build_object(
        'success', true,
        'coins', v_tier.free_monthly_coins
    );
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE vip_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vip_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_benefits_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_exclusive_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view VIP tiers" ON vip_tiers FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view VIP perks" ON vip_perks FOR SELECT USING (true);
CREATE POLICY "Users can view their VIP status" ON user_vip_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their benefits log" ON vip_benefits_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view VIP exclusive items" ON vip_exclusive_items FOR SELECT USING (is_active = true);

-- ============================================================================
-- INITIAL DATA - VIP Tiers
-- ============================================================================

INSERT INTO vip_tiers (slug, name, description, tier_level, min_lifetime_xp, color, gradient, icon, emoji, xp_multiplier, coin_multiplier, drop_rate_bonus, max_daily_wheel_spins, max_daily_packs, early_access_hours, discount_percentage, free_monthly_coins, can_create_crew, max_crew_size, profile_highlight, leaderboard_highlight) VALUES

('standard', 'Standard', 'Membre régulier de la communauté', 0, 0, '#71717a', 'from-zinc-500 to-zinc-600', 'User', '👤', 1.00, 1.00, 0.00, 1, 0, 0, 0, 0, false, 0, false, false),

('bronze', 'Bronze', 'Tu commences à briller !', 1, 1000, '#cd7f32', 'from-amber-600 to-orange-700', 'Award', '🥉', 1.05, 1.05, 0.02, 1, 1, 0, 5, 50, true, 5, false, false),

('silver', 'Argent', 'Un vrai habitué des soirées', 2, 5000, '#c0c0c0', 'from-gray-300 to-gray-500', 'Medal', '🥈', 1.10, 1.10, 0.05, 2, 2, 6, 10, 150, true, 10, false, false),

('gold', 'Or', 'Une légende en devenir', 3, 15000, '#ffd700', 'from-yellow-400 to-amber-500', 'Trophy', '🥇', 1.20, 1.15, 0.10, 3, 3, 12, 15, 300, true, 15, true, false),

('platinum', 'Platine', 'L''élite de la communauté', 4, 35000, '#e5e4e2', 'from-gray-200 to-gray-400', 'Crown', '👑', 1.30, 1.25, 0.15, 5, 5, 24, 20, 500, true, 25, true, true),

('diamond', 'Diamant', 'Rare et précieux', 5, 75000, '#b9f2ff', 'from-cyan-300 to-blue-400', 'Gem', '💎', 1.50, 1.40, 0.20, 7, 7, 48, 25, 1000, true, 50, true, true),

('legendary', 'Légendaire', 'Le sommet de la pyramide', 6, 150000, '#ff6b35', 'from-orange-500 to-red-600', 'Flame', '🔥', 2.00, 1.75, 0.30, 10, 10, 72, 30, 2500, true, 100, true, true)

ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    min_lifetime_xp = EXCLUDED.min_lifetime_xp,
    color = EXCLUDED.color,
    gradient = EXCLUDED.gradient,
    xp_multiplier = EXCLUDED.xp_multiplier,
    coin_multiplier = EXCLUDED.coin_multiplier,
    drop_rate_bonus = EXCLUDED.drop_rate_bonus,
    max_daily_wheel_spins = EXCLUDED.max_daily_wheel_spins,
    max_daily_packs = EXCLUDED.max_daily_packs,
    early_access_hours = EXCLUDED.early_access_hours,
    discount_percentage = EXCLUDED.discount_percentage,
    free_monthly_coins = EXCLUDED.free_monthly_coins;

-- ============================================================================
-- VIP PERKS DATA
-- ============================================================================

-- Bronze perks
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, is_highlighted, sort_order)
SELECT id, 'bronze_xp', 'Bonus XP +5%', 'Gagne 5% d''XP en plus sur toutes tes actions', 'TrendingUp', 'rewards', true, 1 FROM vip_tiers WHERE slug = 'bronze'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'bronze_coins', 'Bonus Coins +5%', 'Gagne 5% de coins en plus', 'Coins', 'rewards', 2 FROM vip_tiers WHERE slug = 'bronze'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'bronze_pack', '1 Pack gratuit/jour', 'Ouvre un pack de cartes gratuit chaque jour', 'Gift', 'rewards', 3 FROM vip_tiers WHERE slug = 'bronze'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'bronze_crew', 'Créer un Crew', 'Crée ton propre groupe d''amis (5 max)', 'Users', 'social', 4 FROM vip_tiers WHERE slug = 'bronze'
ON CONFLICT DO NOTHING;

-- Silver perks
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, is_highlighted, sort_order)
SELECT id, 'silver_xp', 'Bonus XP +10%', 'Gagne 10% d''XP en plus sur toutes tes actions', 'TrendingUp', 'rewards', true, 1 FROM vip_tiers WHERE slug = 'silver'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'silver_wheel', '2 Spins/jour', 'Tourne la roue 2 fois par jour', 'Circle', 'rewards', 2 FROM vip_tiers WHERE slug = 'silver'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'silver_early', 'Accès anticipé 6h', 'Réserve tes places 6h avant tout le monde', 'Clock', 'events', 3 FROM vip_tiers WHERE slug = 'silver'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'silver_discount', '-10% Boutique', 'Réduction sur tous les articles de la boutique', 'Tag', 'shop', 4 FROM vip_tiers WHERE slug = 'silver'
ON CONFLICT DO NOTHING;

-- Gold perks
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, is_highlighted, sort_order)
SELECT id, 'gold_xp', 'Bonus XP +20%', 'Gagne 20% d''XP en plus sur toutes tes actions', 'TrendingUp', 'rewards', true, 1 FROM vip_tiers WHERE slug = 'gold'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'gold_wheel', '3 Spins/jour', 'Tourne la roue 3 fois par jour', 'Circle', 'rewards', 2 FROM vip_tiers WHERE slug = 'gold'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'gold_early', 'Accès anticipé 12h', 'Réserve tes places 12h avant tout le monde', 'Clock', 'events', 3 FROM vip_tiers WHERE slug = 'gold'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'gold_highlight', 'Profil mis en avant', 'Ton profil est mis en évidence dans les recherches', 'Star', 'social', 4 FROM vip_tiers WHERE slug = 'gold'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'gold_monthly', '300 Coins/mois', 'Reçois 300 coins gratuits chaque mois', 'Coins', 'rewards', 5 FROM vip_tiers WHERE slug = 'gold'
ON CONFLICT DO NOTHING;

-- Platinum perks
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, is_highlighted, sort_order)
SELECT id, 'platinum_xp', 'Bonus XP +30%', 'Gagne 30% d''XP en plus sur toutes tes actions', 'TrendingUp', 'rewards', true, 1 FROM vip_tiers WHERE slug = 'platinum'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'platinum_wheel', '5 Spins/jour', 'Tourne la roue 5 fois par jour', 'Circle', 'rewards', 2 FROM vip_tiers WHERE slug = 'platinum'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'platinum_early', 'Accès anticipé 24h', 'Réserve tes places 24h avant tout le monde', 'Clock', 'events', 3 FROM vip_tiers WHERE slug = 'platinum'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'platinum_leaderboard', 'Badge Leaderboard', 'Badge spécial affiché dans les classements', 'Award', 'social', 4 FROM vip_tiers WHERE slug = 'platinum'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'platinum_crew', 'Grand Crew (25)', 'Invite jusqu''à 25 membres dans ton crew', 'Users', 'social', 5 FROM vip_tiers WHERE slug = 'platinum'
ON CONFLICT DO NOTHING;

-- Diamond perks
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, is_highlighted, sort_order)
SELECT id, 'diamond_xp', 'Bonus XP +50%', 'Gagne 50% d''XP en plus sur toutes tes actions', 'TrendingUp', 'rewards', true, 1 FROM vip_tiers WHERE slug = 'diamond'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'diamond_wheel', '7 Spins/jour', 'Tourne la roue 7 fois par jour', 'Circle', 'rewards', 2 FROM vip_tiers WHERE slug = 'diamond'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'diamond_early', 'Accès anticipé 48h', 'Réserve tes places 48h avant tout le monde', 'Clock', 'events', 3 FROM vip_tiers WHERE slug = 'diamond'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'diamond_monthly', '1000 Coins/mois', 'Reçois 1000 coins gratuits chaque mois', 'Coins', 'rewards', 4 FROM vip_tiers WHERE slug = 'diamond'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'diamond_drops', '+20% Drop Rate', '20% de chances en plus d''obtenir des items rares', 'Sparkles', 'rewards', 5 FROM vip_tiers WHERE slug = 'diamond'
ON CONFLICT DO NOTHING;

-- Legendary perks
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, is_highlighted, sort_order)
SELECT id, 'legendary_xp', 'Bonus XP x2', 'Double ton XP sur toutes tes actions !', 'Zap', 'rewards', true, 1 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'legendary_wheel', '10 Spins/jour', 'Tourne la roue 10 fois par jour', 'Circle', 'rewards', 2 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'legendary_early', 'Accès anticipé 72h', 'Réserve tes places 72h avant tout le monde', 'Clock', 'events', 3 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'legendary_monthly', '2500 Coins/mois', 'Reçois 2500 coins gratuits chaque mois', 'Coins', 'rewards', 4 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'legendary_exclusive', 'Événements exclusifs', 'Accès aux événements VIP only', 'Star', 'events', 5 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'legendary_crew', 'Mega Crew (100)', 'Invite jusqu''à 100 membres dans ton crew', 'Users', 'social', 6 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'legendary_support', 'Support dédié', 'Accès à un support prioritaire', 'Headphones', 'support', 7 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;

COMMIT;
