-- ============================================================================
-- TEENS PARTY MOROCCO - Fortune Wheel System
-- Migration: 005_fortune_wheel.sql
-- Description: Système de Roue de la Fortune quotidienne
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Table des segments de la roue
CREATE TABLE IF NOT EXISTS wheel_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_index INT NOT NULL UNIQUE, -- Position sur la roue (0-11)
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(50) NOT NULL, -- Couleur du segment
    icon VARCHAR(50) NOT NULL DEFAULT 'gift',

    -- Reward configuration
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN (
        'xp', 'xp_multiplier', 'shop_discount', 'free_spin',
        'badge', 'mystery_box', 'nothing', 'jackpot'
    )),
    reward_value JSONB NOT NULL DEFAULT '{}',

    -- Probability (sur 1000 pour plus de précision)
    probability INT NOT NULL CHECK (probability >= 0 AND probability <= 1000),

    -- Availability
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    min_level INT DEFAULT 1,
    vip_only BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des spins utilisateurs
CREATE TABLE IF NOT EXISTS user_wheel_spins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    segment_id UUID NOT NULL REFERENCES wheel_segments(id),

    -- Result
    reward_type VARCHAR(50) NOT NULL,
    reward_value JSONB NOT NULL,
    xp_earned INT DEFAULT 0,

    -- Metadata
    spin_type VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (spin_type IN ('daily', 'bonus', 'purchased', 'reward')),
    spin_date DATE NOT NULL DEFAULT CURRENT_DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des spins bonus (extra spins gagnés ou achetés)
CREATE TABLE IF NOT EXISTS user_bonus_spins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    spins_remaining INT NOT NULL DEFAULT 0,
    source VARCHAR(50) NOT NULL, -- 'purchase', 'reward', 'achievement', 'mission', 'streak'
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table pour les streaks de roue (spins consécutifs)
CREATE TABLE IF NOT EXISTS wheel_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INT NOT NULL DEFAULT 0,
    best_streak INT NOT NULL DEFAULT 0,
    last_spin_date DATE,
    streak_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des jackpots
CREATE TABLE IF NOT EXISTS wheel_jackpots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    current_pool INT NOT NULL DEFAULT 0, -- XP accumulés dans le jackpot
    contribution_percent INT NOT NULL DEFAULT 5, -- % de chaque gain ajouté au pot
    min_pool INT NOT NULL DEFAULT 10000, -- Minimum avant qu'il soit gagnable
    winner_id UUID REFERENCES auth.users(id),
    won_at TIMESTAMPTZ,
    won_amount INT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wheel_spins_user ON user_wheel_spins(user_id);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_date ON user_wheel_spins(spin_date);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_user_date ON user_wheel_spins(user_id, spin_date);
CREATE INDEX IF NOT EXISTS idx_bonus_spins_user ON user_bonus_spins(user_id);

-- ============================================================================
-- SEED DATA - SEGMENTS
-- ============================================================================

-- Roue de 12 segments avec probabilités variées
INSERT INTO wheel_segments (segment_index, name, description, color, icon, reward_type, reward_value, probability) VALUES
    -- XP rewards (60% total)
    (0, '50 XP', 'Petit boost d''XP', '#22c55e', 'zap', 'xp', '{"amount": 50}', 200),
    (1, '100 XP', 'Bon gain d''XP', '#16a34a', 'zap', 'xp', '{"amount": 100}', 150),
    (2, '200 XP', 'Gros gain d''XP', '#15803d', 'zap', 'xp', '{"amount": 200}', 100),
    (3, '500 XP', 'Jackpot XP!', '#166534', 'zap', 'xp', '{"amount": 500}', 50),

    -- Multipliers (15% total)
    (4, '×2 XP (1h)', 'Double XP pendant 1 heure', '#f59e0b', 'trending-up', 'xp_multiplier', '{"multiplier": 2, "duration_minutes": 60}', 100),
    (5, '×3 XP (30min)', 'Triple XP pendant 30 minutes', '#d97706', 'trending-up', 'xp_multiplier', '{"multiplier": 3, "duration_minutes": 30}', 50),

    -- Shop discounts (10% total)
    (6, '-10% Boutique', 'Réduction sur un achat', '#06b6d4', 'percent', 'shop_discount', '{"percent": 10, "valid_hours": 24}', 70),
    (7, '-25% Boutique', 'Grosse réduction boutique', '#0891b2', 'percent', 'shop_discount', '{"percent": 25, "valid_hours": 12}', 30),

    -- Special rewards (10% total)
    (8, 'Mystery Box', 'Boîte mystère surprise', '#8b5cf6', 'box', 'mystery_box', '{"tier": "bronze"}', 60),
    (9, 'Spin Bonus', 'Un tour gratuit en plus!', '#ec4899', 'rotate-cw', 'free_spin', '{"spins": 1}', 40),

    -- Nothing / Jackpot (5% total)
    (10, 'Presque...', 'Pas de chance cette fois', '#64748b', 'x', 'nothing', '{}', 45),
    (11, 'JACKPOT!', 'Remporte la cagnotte!', '#eab308', 'crown', 'jackpot', '{}', 5)
ON CONFLICT (segment_index) DO NOTHING;

-- Créer le jackpot initial
INSERT INTO wheel_jackpots (name, current_pool, contribution_percent, min_pool)
VALUES ('Jackpot Principal', 5000, 5, 10000)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Initialiser le streak pour un nouvel utilisateur
CREATE OR REPLACE FUNCTION init_wheel_streak()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wheel_streaks (user_id, current_streak, best_streak, streak_multiplier)
    VALUES (NEW.id, 0, 0, 1.0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour initialiser le streak
DROP TRIGGER IF EXISTS init_wheel_streak_trigger ON auth.users;
CREATE TRIGGER init_wheel_streak_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION init_wheel_streak();

-- Vérifier si l'utilisateur peut tourner
CREATE OR REPLACE FUNCTION can_spin_wheel(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_last_daily_spin DATE;
    v_bonus_spins INT;
    v_streak INT;
    v_streak_multiplier DECIMAL;
BEGIN
    -- Vérifier le dernier spin quotidien
    SELECT spin_date INTO v_last_daily_spin
    FROM user_wheel_spins
    WHERE user_id = p_user_id AND spin_type = 'daily'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Compter les spins bonus disponibles
    SELECT COALESCE(SUM(spins_remaining), 0) INTO v_bonus_spins
    FROM user_bonus_spins
    WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > NOW())
    AND spins_remaining > 0;

    -- Récupérer le streak
    SELECT current_streak, streak_multiplier INTO v_streak, v_streak_multiplier
    FROM wheel_streaks WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'can_spin_daily', v_last_daily_spin IS NULL OR v_last_daily_spin < CURRENT_DATE,
        'bonus_spins', COALESCE(v_bonus_spins, 0),
        'current_streak', COALESCE(v_streak, 0),
        'streak_multiplier', COALESCE(v_streak_multiplier, 1.0),
        'next_spin_at', CASE
            WHEN v_last_daily_spin IS NULL OR v_last_daily_spin < CURRENT_DATE THEN NULL
            ELSE (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tourner la roue
CREATE OR REPLACE FUNCTION spin_wheel(p_user_id UUID, p_spin_type VARCHAR DEFAULT 'daily')
RETURNS JSONB AS $$
DECLARE
    v_can_spin JSONB;
    v_random INT;
    v_cumulative INT := 0;
    v_segment wheel_segments%ROWTYPE;
    v_streak_record wheel_streaks%ROWTYPE;
    v_final_xp INT := 0;
    v_spin_id UUID;
    v_jackpot_amount INT;
    v_reward_result JSONB;
BEGIN
    -- Vérifier si peut tourner
    v_can_spin := can_spin_wheel(p_user_id);

    IF p_spin_type = 'daily' AND NOT (v_can_spin->>'can_spin_daily')::BOOLEAN THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu as déjà tourné aujourd''hui');
    END IF;

    IF p_spin_type = 'bonus' AND (v_can_spin->>'bonus_spins')::INT <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pas de spin bonus disponible');
    END IF;

    -- Récupérer le streak
    SELECT * INTO v_streak_record FROM wheel_streaks WHERE user_id = p_user_id;

    -- Générer un nombre aléatoire (0-999)
    v_random := floor(random() * 1000);

    -- Sélectionner le segment basé sur la probabilité
    FOR v_segment IN
        SELECT * FROM wheel_segments
        WHERE is_active = TRUE
        ORDER BY segment_index
    LOOP
        v_cumulative := v_cumulative + v_segment.probability;
        IF v_random < v_cumulative THEN
            EXIT;
        END IF;
    END LOOP;

    -- Calculer la récompense
    v_reward_result := v_segment.reward_value;

    CASE v_segment.reward_type
        WHEN 'xp' THEN
            -- Appliquer le multiplicateur de streak
            v_final_xp := ((v_segment.reward_value->>'amount')::INT *
                          COALESCE(v_streak_record.streak_multiplier, 1.0))::INT;
            v_reward_result := jsonb_set(v_reward_result, '{amount}', to_jsonb(v_final_xp));

            -- Ajouter les XP au profil
            UPDATE profiles SET total_xp = total_xp + v_final_xp WHERE id = p_user_id;

            -- Contribuer au jackpot
            UPDATE wheel_jackpots
            SET current_pool = current_pool + (v_final_xp * contribution_percent / 100)
            WHERE is_active = TRUE AND winner_id IS NULL;

        WHEN 'xp_multiplier' THEN
            -- Créer un bonus XP temporaire (à gérer dans l'application)
            v_reward_result := v_segment.reward_value;

        WHEN 'shop_discount' THEN
            -- Créer un code promo temporaire
            INSERT INTO shop_promo_codes (
                code, description, discount_type, discount_value,
                max_uses, max_uses_per_user, valid_until
            ) VALUES (
                'WHEEL' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
                'Réduction Roue de la Fortune',
                'percentage',
                (v_segment.reward_value->>'percent')::INT,
                1, 1,
                NOW() + ((v_segment.reward_value->>'valid_hours')::INT || ' hours')::INTERVAL
            );

        WHEN 'free_spin' THEN
            -- Ajouter un spin bonus
            INSERT INTO user_bonus_spins (user_id, spins_remaining, source, expires_at)
            VALUES (p_user_id, (v_segment.reward_value->>'spins')::INT, 'wheel', NOW() + INTERVAL '7 days');

        WHEN 'mystery_box' THEN
            -- Donner une mystery box (à implémenter côté application)
            v_reward_result := v_segment.reward_value;

        WHEN 'jackpot' THEN
            -- Vérifier si le jackpot est gagnable
            SELECT current_pool INTO v_jackpot_amount
            FROM wheel_jackpots
            WHERE is_active = TRUE AND winner_id IS NULL AND current_pool >= min_pool
            LIMIT 1;

            IF v_jackpot_amount IS NOT NULL THEN
                -- Jackpot gagné!
                v_final_xp := v_jackpot_amount;
                UPDATE profiles SET total_xp = total_xp + v_jackpot_amount WHERE id = p_user_id;

                UPDATE wheel_jackpots
                SET winner_id = p_user_id, won_at = NOW(), won_amount = v_jackpot_amount, is_active = FALSE
                WHERE is_active = TRUE AND winner_id IS NULL;

                -- Créer un nouveau jackpot
                INSERT INTO wheel_jackpots (name, current_pool, contribution_percent, min_pool)
                VALUES ('Jackpot Principal', 5000, 5, 10000);

                v_reward_result := jsonb_build_object('jackpot_won', true, 'amount', v_jackpot_amount);
            ELSE
                -- Jackpot pas encore assez gros, donner 500 XP de consolation
                v_final_xp := 500;
                UPDATE profiles SET total_xp = total_xp + 500 WHERE id = p_user_id;
                v_reward_result := jsonb_build_object('jackpot_won', false, 'consolation_xp', 500);
            END IF;

        WHEN 'nothing' THEN
            v_reward_result := jsonb_build_object('message', 'Pas de chance cette fois!');
    END CASE;

    -- Enregistrer le spin
    INSERT INTO user_wheel_spins (user_id, segment_id, reward_type, reward_value, xp_earned, spin_type)
    VALUES (p_user_id, v_segment.id, v_segment.reward_type, v_reward_result, v_final_xp, p_spin_type)
    RETURNING id INTO v_spin_id;

    -- Décrémenter un spin bonus si utilisé
    IF p_spin_type = 'bonus' THEN
        UPDATE user_bonus_spins
        SET spins_remaining = spins_remaining - 1
        WHERE id = (
            SELECT id FROM user_bonus_spins
            WHERE user_id = p_user_id AND spins_remaining > 0
            AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY created_at
            LIMIT 1
        );
    END IF;

    -- Mettre à jour le streak
    IF p_spin_type = 'daily' THEN
        IF v_streak_record.last_spin_date = CURRENT_DATE - 1 THEN
            -- Streak continue
            UPDATE wheel_streaks
            SET current_streak = current_streak + 1,
                best_streak = GREATEST(best_streak, current_streak + 1),
                last_spin_date = CURRENT_DATE,
                streak_multiplier = LEAST(2.0, 1.0 + (current_streak + 1) * 0.05),
                updated_at = NOW()
            WHERE user_id = p_user_id;
        ELSIF v_streak_record.last_spin_date IS NULL OR v_streak_record.last_spin_date < CURRENT_DATE - 1 THEN
            -- Nouveau streak ou streak cassé
            UPDATE wheel_streaks
            SET current_streak = 1,
                last_spin_date = CURRENT_DATE,
                streak_multiplier = 1.05,
                updated_at = NOW()
            WHERE user_id = p_user_id;

            -- Insérer si n'existe pas
            IF NOT FOUND THEN
                INSERT INTO wheel_streaks (user_id, current_streak, best_streak, last_spin_date, streak_multiplier)
                VALUES (p_user_id, 1, 1, CURRENT_DATE, 1.05);
            END IF;
        END IF;
    END IF;

    -- Récupérer le nouveau streak
    SELECT current_streak, streak_multiplier INTO v_streak_record.current_streak, v_streak_record.streak_multiplier
    FROM wheel_streaks WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'spin_id', v_spin_id,
        'segment_index', v_segment.segment_index,
        'segment_name', v_segment.name,
        'segment_color', v_segment.color,
        'segment_icon', v_segment.icon,
        'reward_type', v_segment.reward_type,
        'reward_value', v_reward_result,
        'xp_earned', v_final_xp,
        'current_streak', COALESCE(v_streak_record.current_streak, 1),
        'streak_multiplier', COALESCE(v_streak_record.streak_multiplier, 1.05)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Récupérer l'historique des spins
CREATE OR REPLACE FUNCTION get_wheel_history(
    p_user_id UUID,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    spin_id UUID,
    segment_name VARCHAR,
    segment_color VARCHAR,
    segment_icon VARCHAR,
    reward_type VARCHAR,
    reward_value JSONB,
    xp_earned INT,
    spin_type VARCHAR,
    spun_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        uws.id as spin_id,
        ws.name as segment_name,
        ws.color as segment_color,
        ws.icon as segment_icon,
        uws.reward_type,
        uws.reward_value,
        uws.xp_earned,
        uws.spin_type,
        uws.created_at as spun_at
    FROM user_wheel_spins uws
    JOIN wheel_segments ws ON uws.segment_id = ws.id
    WHERE uws.user_id = p_user_id
    ORDER BY uws.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Récupérer les stats de la roue
CREATE OR REPLACE FUNCTION get_wheel_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_spins INT;
    v_total_xp INT;
    v_jackpots_won INT;
    v_best_reward JSONB;
    v_streak_record wheel_streaks%ROWTYPE;
    v_current_jackpot INT;
BEGIN
    -- Stats globales
    SELECT
        COUNT(*),
        COALESCE(SUM(xp_earned), 0)
    INTO v_total_spins, v_total_xp
    FROM user_wheel_spins WHERE user_id = p_user_id;

    -- Jackpots gagnés
    SELECT COUNT(*) INTO v_jackpots_won
    FROM wheel_jackpots WHERE winner_id = p_user_id;

    -- Meilleur gain
    SELECT jsonb_build_object(
        'reward_type', uws.reward_type,
        'xp_earned', uws.xp_earned,
        'date', uws.created_at
    ) INTO v_best_reward
    FROM user_wheel_spins uws
    WHERE user_id = p_user_id
    ORDER BY xp_earned DESC
    LIMIT 1;

    -- Streak
    SELECT * INTO v_streak_record FROM wheel_streaks WHERE user_id = p_user_id;

    -- Jackpot actuel
    SELECT current_pool INTO v_current_jackpot
    FROM wheel_jackpots WHERE is_active = TRUE AND winner_id IS NULL
    LIMIT 1;

    RETURN jsonb_build_object(
        'total_spins', COALESCE(v_total_spins, 0),
        'total_xp_earned', COALESCE(v_total_xp, 0),
        'jackpots_won', COALESCE(v_jackpots_won, 0),
        'best_reward', v_best_reward,
        'current_streak', COALESCE(v_streak_record.current_streak, 0),
        'best_streak', COALESCE(v_streak_record.best_streak, 0),
        'streak_multiplier', COALESCE(v_streak_record.streak_multiplier, 1.0),
        'current_jackpot', COALESCE(v_current_jackpot, 5000)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE wheel_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wheel_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bonus_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_jackpots ENABLE ROW LEVEL SECURITY;

-- Segments: readable by all
CREATE POLICY "Segments are readable by all" ON wheel_segments
    FOR SELECT USING (is_active = TRUE);

-- Spins: users see their own
CREATE POLICY "Users can view own spins" ON user_wheel_spins
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spins" ON user_wheel_spins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bonus spins: users see their own
CREATE POLICY "Users can view own bonus spins" ON user_bonus_spins
    FOR SELECT USING (auth.uid() = user_id);

-- Streaks: users see their own
CREATE POLICY "Users can view own streak" ON wheel_streaks
    FOR SELECT USING (auth.uid() = user_id);

-- Jackpots: readable by all
CREATE POLICY "Jackpots are readable by all" ON wheel_jackpots
    FOR SELECT USING (TRUE);
