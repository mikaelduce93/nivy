-- ============================================================================
-- TEENS PARTY MOROCCO - Seasonal Challenges & Advent Calendar
-- ============================================================================
-- Migration: 010_seasonal_challenges.sql
-- Description: Système de défis saisonniers et calendrier de l'Avent
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Table des saisons
CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    theme_color VARCHAR(7) DEFAULT '#ffffff',
    icon VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des défis saisonniers
CREATE TABLE IF NOT EXISTS seasonal_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'seasonal', 'special'
    category VARCHAR(50) NOT NULL, -- 'social', 'event', 'engagement', 'creative', 'collection'
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#ffffff',
    xp_reward INTEGER NOT NULL DEFAULT 50,
    bonus_xp INTEGER DEFAULT 0,
    target_count INTEGER DEFAULT 1,
    start_date DATE,
    end_date DATE,
    day_number INTEGER, -- Pour le calendrier de l'Avent (1-31)
    unlock_condition JSONB, -- Conditions pour débloquer
    reward_type VARCHAR(50), -- 'xp', 'badge', 'item', 'coins', 'mystery_box'
    reward_data JSONB, -- Détails de la récompense
    is_premium BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progression des défis saisonniers
CREATE TABLE IF NOT EXISTS user_seasonal_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seasonal_challenge_id UUID REFERENCES seasonal_challenges(id) ON DELETE CASCADE,
    current_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'locked', -- 'locked', 'available', 'in_progress', 'completed', 'claimed'
    unlocked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, seasonal_challenge_id)
);

-- Calendrier de l'Avent
CREATE TABLE IF NOT EXISTS advent_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    theme VARCHAR(50) DEFAULT 'christmas',
    start_date DATE NOT NULL, -- Généralement 1er décembre
    end_date DATE NOT NULL, -- 24 ou 25 décembre
    total_days INTEGER DEFAULT 24,
    bonus_reward_day INTEGER DEFAULT 24, -- Jour du bonus final
    bonus_reward JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, theme)
);

-- Cases du calendrier de l'Avent
CREATE TABLE IF NOT EXISTS advent_calendar_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advent_calendar_id UUID REFERENCES advent_calendars(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title VARCHAR(200),
    description TEXT,
    reward_type VARCHAR(50) NOT NULL, -- 'xp', 'badge', 'item', 'coins', 'mystery_box', 'special'
    reward_amount INTEGER DEFAULT 0,
    reward_data JSONB, -- Détails supplémentaires
    challenge_id UUID REFERENCES seasonal_challenges(id), -- Challenge optionnel à compléter
    icon VARCHAR(50),
    is_premium BOOLEAN DEFAULT false,
    is_bonus BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(advent_calendar_id, day_number)
);

-- Ouvertures du calendrier de l'Avent par utilisateur
CREATE TABLE IF NOT EXISTS user_advent_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    advent_calendar_id UUID REFERENCES advent_calendars(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    reward_claimed BOOLEAN DEFAULT true,
    challenge_completed BOOLEAN DEFAULT false,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, advent_calendar_id, day_number)
);

-- Récompenses saisonnières spéciales
CREATE TABLE IF NOT EXISTS seasonal_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    reward_type VARCHAR(50) NOT NULL,
    reward_data JSONB,
    required_challenges INTEGER DEFAULT 0, -- Nombre de défis à compléter
    required_points INTEGER DEFAULT 0, -- Points saisonniers requis
    icon VARCHAR(50),
    rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    is_limited BOOLEAN DEFAULT true,
    max_claims INTEGER, -- NULL = illimité
    current_claims INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Réclamations de récompenses saisonnières
CREATE TABLE IF NOT EXISTS user_seasonal_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seasonal_reward_id UUID REFERENCES seasonal_rewards(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, seasonal_reward_id)
);

-- ============================================================================
-- INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_seasons_dates ON seasons(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_seasons_active ON seasons(is_active);

CREATE INDEX IF NOT EXISTS idx_seasonal_challenges_season ON seasonal_challenges(season_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_challenges_type ON seasonal_challenges(challenge_type);
CREATE INDEX IF NOT EXISTS idx_seasonal_challenges_dates ON seasonal_challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_seasonal_challenges_day ON seasonal_challenges(day_number);

CREATE INDEX IF NOT EXISTS idx_user_seasonal_progress_user ON user_seasonal_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_seasonal_progress_challenge ON user_seasonal_progress(seasonal_challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_seasonal_progress_status ON user_seasonal_progress(status);

CREATE INDEX IF NOT EXISTS idx_advent_calendars_year ON advent_calendars(year);
CREATE INDEX IF NOT EXISTS idx_advent_calendar_days_calendar ON advent_calendar_days(advent_calendar_id);
CREATE INDEX IF NOT EXISTS idx_user_advent_progress_user ON user_advent_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_seasonal_rewards_season ON seasonal_rewards(season_id);

-- ============================================================================
-- DONNÉES INITIALES - SAISONS
-- ============================================================================

INSERT INTO seasons (slug, name, description, theme_color, icon, start_date, end_date) VALUES
-- Hiver
('winter_2024', 'Hiver 2024', 'Saison hivernale avec défis festifs', '#60A5FA', 'Snowflake', '2024-12-01', '2025-02-28'),
-- Printemps
('spring_2025', 'Printemps 2025', 'Renouveau et nouveaux défis', '#34D399', 'Flower', '2025-03-01', '2025-05-31'),
-- Été
('summer_2025', 'Été 2025', 'Saison estivale et soirées enflammées', '#FBBF24', 'Sun', '2025-06-01', '2025-08-31'),
-- Automne
('fall_2025', 'Automne 2025', 'Rentrée et nouvelles aventures', '#F97316', 'Leaf', '2025-09-01', '2025-11-30')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- DONNÉES INITIALES - CALENDRIER DE L'AVENT 2024
-- ============================================================================

INSERT INTO advent_calendars (year, title, description, theme, start_date, end_date, total_days, bonus_reward_day, bonus_reward)
VALUES (
    2024,
    'Calendrier de l''Avent 2024',
    'Ouvre une case chaque jour et découvre des surprises exclusives !',
    'christmas',
    '2024-12-01',
    '2024-12-24',
    24,
    24,
    '{"type": "mystery_box", "name": "Coffre du Père Noël", "xp": 500, "badge_id": "santa_helper"}'
)
ON CONFLICT (year, theme) DO NOTHING;

-- Cases du calendrier (exemple pour les 24 jours)
DO $$
DECLARE
    calendar_id UUID;
    rewards TEXT[][] := ARRAY[
        -- [reward_type, amount, title, description, icon]
        ['xp', '50', 'Bonus XP', 'Un petit boost pour commencer', 'Zap'],
        ['coins', '100', 'Pièces d''Or', 'Des pièces pour la boutique', 'Coins'],
        ['xp', '75', 'XP Surprise', 'Plus de points bonus', 'Gift'],
        ['mystery_box', '1', 'Boîte Mystère', 'Qu''y a-t-il dedans ?', 'Box'],
        ['xp', '100', 'Gros Bonus XP', 'Tu progresses vite !', 'Zap'],
        ['badge', '1', 'Badge Exclusif', 'Badge de la première semaine', 'Award'],
        ['coins', '150', 'Jackpot Pièces', 'Plein de pièces !', 'Coins'],
        ['xp', '80', 'XP du Weekend', 'Pour bien finir la semaine', 'Calendar'],
        ['item', '1', 'Cadre de Profil', 'Un nouveau cadre festif', 'Frame'],
        ['xp', '100', 'Bonus Mi-Parcours', 'Tu es à mi-chemin !', 'Target'],
        ['coins', '200', 'Trésor Caché', 'Un trésor pour toi', 'Gem'],
        ['mystery_box', '1', 'Super Boîte', 'Surprise de mi-décembre', 'Box'],
        ['xp', '120', 'Vendredi 13 Lucky', 'La chance est avec toi', 'Clover'],
        ['badge', '1', 'Badge Mi-Décembre', 'Tu es persévérant !', 'Medal'],
        ['coins', '175', 'Bonus Weekend', 'Pour tes achats', 'ShoppingBag'],
        ['xp', '90', 'Dimanche XP', 'Repos et récompenses', 'Coffee'],
        ['item', '1', 'Titre Exclusif', 'Un nouveau titre rare', 'Crown'],
        ['xp', '150', 'Sprint Final', 'Plus que quelques jours !', 'Rocket'],
        ['coins', '250', 'Avant-Dernière Semaine', 'Presque là !', 'Star'],
        ['mystery_box', '1', 'Méga Boîte', 'Grosse surprise !', 'Package'],
        ['xp', '200', 'Samedi de Fête', 'La fête commence', 'PartyPopper'],
        ['badge', '1', 'Badge Avant-Veille', 'Plus que 2 jours', 'Bell'],
        ['item', '1', 'Avatar Exclusif', 'Look de Noël', 'User'],
        ['special', '1', 'Coffre Légendaire', 'Le grand jour !', 'Crown']
    ];
    i INTEGER;
BEGIN
    -- Récupérer l'ID du calendrier
    SELECT id INTO calendar_id FROM advent_calendars WHERE year = 2024 AND theme = 'christmas';

    IF calendar_id IS NOT NULL THEN
        FOR i IN 1..24 LOOP
            INSERT INTO advent_calendar_days (
                advent_calendar_id,
                day_number,
                title,
                description,
                reward_type,
                reward_amount,
                icon,
                is_bonus
            ) VALUES (
                calendar_id,
                i,
                rewards[i][3],
                rewards[i][4],
                rewards[i][1],
                rewards[i][2]::INTEGER,
                rewards[i][5],
                i = 24
            )
            ON CONFLICT (advent_calendar_id, day_number) DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- ============================================================================
-- DONNÉES INITIALES - DÉFIS SAISONNIERS HIVER
-- ============================================================================

DO $$
DECLARE
    winter_id UUID;
BEGIN
    SELECT id INTO winter_id FROM seasons WHERE slug = 'winter_2024';

    IF winter_id IS NOT NULL THEN
        INSERT INTO seasonal_challenges (season_id, title, description, challenge_type, category, icon, color, xp_reward, target_count, reward_type) VALUES
        -- Défis quotidiens
        (winter_id, 'Check-in Hivernal', 'Fais un check-in à un événement', 'daily', 'event', 'MapPin', '#60A5FA', 30, 1, 'xp'),
        (winter_id, 'Social du Jour', 'Connecte-toi avec un nouvel ami', 'daily', 'social', 'UserPlus', '#34D399', 25, 1, 'xp'),
        (winter_id, 'Story Givrée', 'Partage une story depuis un événement', 'daily', 'engagement', 'Camera', '#F472B6', 35, 1, 'xp'),

        -- Défis hebdomadaires
        (winter_id, 'Semaine Active', 'Participe à 3 événements cette semaine', 'weekly', 'event', 'Calendar', '#8B5CF6', 150, 3, 'xp'),
        (winter_id, 'Crew Spirit', 'Fais gagner 500 XP à ton crew', 'weekly', 'social', 'Users', '#EC4899', 200, 500, 'xp'),
        (winter_id, 'Reviewer Hivernal', 'Laisse 5 avis cette semaine', 'weekly', 'engagement', 'Star', '#FBBF24', 175, 5, 'xp'),
        (winter_id, 'Night Owl d''Hiver', 'Reste jusqu''à la fermeture 2 fois', 'weekly', 'event', 'Moon', '#6366F1', 225, 2, 'xp'),

        -- Défis saisonniers
        (winter_id, 'Maître de l''Hiver', 'Complète 50 défis cet hiver', 'seasonal', 'engagement', 'Trophy', '#FFD700', 1000, 50, 'badge'),
        (winter_id, 'Roi des Soirées', 'Participe à 20 événements', 'seasonal', 'event', 'Crown', '#FFD700', 800, 20, 'badge'),
        (winter_id, 'Influenceur Hivernal', 'Invite 10 amis qui s''inscrivent', 'seasonal', 'social', 'Share2', '#10B981', 600, 10, 'item'),
        (winter_id, 'Collection Complète', 'Obtiens tous les badges d''hiver', 'seasonal', 'collection', 'Collection', '#F59E0B', 1500, 10, 'badge'),

        -- Défis spéciaux
        (winter_id, 'Nouvel An Party', 'Sois présent à minuit le 31 décembre', 'special', 'event', 'PartyPopper', '#FFD700', 500, 1, 'badge'),
        (winter_id, 'First of the Year', 'Premier check-in de 2025', 'special', 'event', 'Rocket', '#EF4444', 300, 1, 'item')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- FONCTIONS
-- ============================================================================

-- Fonction pour obtenir le calendrier de l'Avent actif
CREATE OR REPLACE FUNCTION get_active_advent_calendar(p_user_id UUID)
RETURNS TABLE (
    calendar JSONB,
    days JSONB,
    user_progress JSONB,
    stats JSONB
) AS $$
DECLARE
    v_calendar JSONB;
    v_days JSONB;
    v_progress JSONB;
    v_stats JSONB;
    v_calendar_id UUID;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Récupérer le calendrier actif
    SELECT
        jsonb_build_object(
            'id', ac.id,
            'year', ac.year,
            'title', ac.title,
            'description', ac.description,
            'theme', ac.theme,
            'start_date', ac.start_date,
            'end_date', ac.end_date,
            'total_days', ac.total_days,
            'bonus_reward_day', ac.bonus_reward_day,
            'bonus_reward', ac.bonus_reward,
            'current_day', LEAST(
                GREATEST(1, EXTRACT(DAY FROM v_today - ac.start_date)::INTEGER + 1),
                ac.total_days
            )
        ),
        ac.id
    INTO v_calendar, v_calendar_id
    FROM advent_calendars ac
    WHERE ac.is_active = true
      AND ac.start_date <= v_today
      AND ac.end_date >= v_today
    ORDER BY ac.year DESC
    LIMIT 1;

    IF v_calendar_id IS NULL THEN
        RETURN QUERY SELECT NULL::JSONB, NULL::JSONB, NULL::JSONB, NULL::JSONB;
        RETURN;
    END IF;

    -- Récupérer les cases
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', acd.id,
            'day_number', acd.day_number,
            'title', acd.title,
            'description', acd.description,
            'reward_type', acd.reward_type,
            'reward_amount', acd.reward_amount,
            'reward_data', acd.reward_data,
            'icon', acd.icon,
            'is_premium', acd.is_premium,
            'is_bonus', acd.is_bonus,
            'is_unlocked', acd.day_number <= EXTRACT(DAY FROM v_today - (SELECT start_date FROM advent_calendars WHERE id = v_calendar_id))::INTEGER + 1
        ) ORDER BY acd.day_number
    )
    INTO v_days
    FROM advent_calendar_days acd
    WHERE acd.advent_calendar_id = v_calendar_id;

    -- Récupérer la progression utilisateur
    SELECT jsonb_agg(
        jsonb_build_object(
            'day_number', uap.day_number,
            'opened_at', uap.opened_at,
            'reward_claimed', uap.reward_claimed,
            'challenge_completed', uap.challenge_completed,
            'xp_earned', uap.xp_earned
        )
    )
    INTO v_progress
    FROM user_advent_progress uap
    WHERE uap.user_id = p_user_id
      AND uap.advent_calendar_id = v_calendar_id;

    -- Calculer les stats
    SELECT jsonb_build_object(
        'days_opened', COALESCE((
            SELECT COUNT(*) FROM user_advent_progress
            WHERE user_id = p_user_id AND advent_calendar_id = v_calendar_id
        ), 0),
        'total_xp_earned', COALESCE((
            SELECT SUM(xp_earned) FROM user_advent_progress
            WHERE user_id = p_user_id AND advent_calendar_id = v_calendar_id
        ), 0),
        'current_streak', COALESCE((
            -- Calcul de la série actuelle
            SELECT COUNT(*) FROM (
                SELECT day_number,
                       day_number - ROW_NUMBER() OVER (ORDER BY day_number) AS grp
                FROM user_advent_progress
                WHERE user_id = p_user_id AND advent_calendar_id = v_calendar_id
            ) sub
            WHERE grp = (
                SELECT day_number - ROW_NUMBER() OVER (ORDER BY day_number)
                FROM user_advent_progress
                WHERE user_id = p_user_id AND advent_calendar_id = v_calendar_id
                ORDER BY day_number DESC
                LIMIT 1
            )
        ), 0),
        'completion_percentage', ROUND(
            COALESCE((
                SELECT COUNT(*)::NUMERIC / 24 * 100
                FROM user_advent_progress
                WHERE user_id = p_user_id AND advent_calendar_id = v_calendar_id
            ), 0)
        )
    )
    INTO v_stats;

    RETURN QUERY SELECT v_calendar, v_days, v_progress, v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour ouvrir une case du calendrier
CREATE OR REPLACE FUNCTION open_advent_day(
    p_user_id UUID,
    p_day_number INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_calendar_id UUID;
    v_calendar_start DATE;
    v_today DATE := CURRENT_DATE;
    v_day_data RECORD;
    v_xp_earned INTEGER := 0;
    v_reward JSONB;
    v_already_opened BOOLEAN;
BEGIN
    -- Récupérer le calendrier actif
    SELECT id, start_date INTO v_calendar_id, v_calendar_start
    FROM advent_calendars
    WHERE is_active = true
      AND start_date <= v_today
      AND end_date >= v_today
    LIMIT 1;

    IF v_calendar_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pas de calendrier actif');
    END IF;

    -- Vérifier si le jour est débloqué
    IF p_day_number > (v_today - v_calendar_start)::INTEGER + 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ce jour n''est pas encore disponible');
    END IF;

    -- Vérifier si déjà ouvert
    SELECT EXISTS (
        SELECT 1 FROM user_advent_progress
        WHERE user_id = p_user_id
          AND advent_calendar_id = v_calendar_id
          AND day_number = p_day_number
    ) INTO v_already_opened;

    IF v_already_opened THEN
        RETURN jsonb_build_object('success', false, 'error', 'Case déjà ouverte');
    END IF;

    -- Récupérer les données de la case
    SELECT * INTO v_day_data
    FROM advent_calendar_days
    WHERE advent_calendar_id = v_calendar_id
      AND day_number = p_day_number;

    IF v_day_data IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Case non trouvée');
    END IF;

    -- Calculer les XP
    CASE v_day_data.reward_type
        WHEN 'xp' THEN
            v_xp_earned := v_day_data.reward_amount;
        WHEN 'coins' THEN
            v_xp_earned := 10; -- Petit bonus XP pour les pièces
        WHEN 'mystery_box' THEN
            v_xp_earned := 25;
        WHEN 'badge' THEN
            v_xp_earned := 50;
        WHEN 'item' THEN
            v_xp_earned := 30;
        WHEN 'special' THEN
            v_xp_earned := 100;
        ELSE
            v_xp_earned := 10;
    END CASE;

    -- Enregistrer l'ouverture
    INSERT INTO user_advent_progress (
        user_id,
        advent_calendar_id,
        day_number,
        xp_earned
    ) VALUES (
        p_user_id,
        v_calendar_id,
        p_day_number,
        v_xp_earned
    );

    -- Ajouter les XP au profil utilisateur
    UPDATE user_profiles
    SET xp = xp + v_xp_earned,
        total_xp = total_xp + v_xp_earned
    WHERE id = p_user_id;

    -- Construire la récompense
    v_reward := jsonb_build_object(
        'type', v_day_data.reward_type,
        'amount', v_day_data.reward_amount,
        'title', v_day_data.title,
        'description', v_day_data.description,
        'icon', v_day_data.icon,
        'data', v_day_data.reward_data
    );

    RETURN jsonb_build_object(
        'success', true,
        'day_number', p_day_number,
        'reward', v_reward,
        'xp_earned', v_xp_earned
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour récupérer les défis saisonniers
CREATE OR REPLACE FUNCTION get_seasonal_challenges(
    p_user_id UUID,
    p_season_slug VARCHAR DEFAULT NULL,
    p_challenge_type VARCHAR DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_season_id UUID;
BEGIN
    -- Déterminer la saison (actuelle si non spécifiée)
    IF p_season_slug IS NOT NULL THEN
        SELECT id INTO v_season_id FROM seasons WHERE slug = p_season_slug;
    ELSE
        SELECT id INTO v_season_id FROM seasons
        WHERE is_active = true
          AND start_date <= CURRENT_DATE
          AND end_date >= CURRENT_DATE
        LIMIT 1;
    END IF;

    IF v_season_id IS NULL THEN
        RETURN jsonb_build_object('challenges', '[]'::JSONB, 'season', NULL);
    END IF;

    -- Récupérer les défis avec progression
    SELECT jsonb_build_object(
        'season', (
            SELECT jsonb_build_object(
                'id', s.id,
                'slug', s.slug,
                'name', s.name,
                'description', s.description,
                'theme_color', s.theme_color,
                'icon', s.icon,
                'start_date', s.start_date,
                'end_date', s.end_date,
                'days_remaining', (s.end_date - CURRENT_DATE)
            )
            FROM seasons s WHERE s.id = v_season_id
        ),
        'challenges', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', sc.id,
                    'title', sc.title,
                    'description', sc.description,
                    'challenge_type', sc.challenge_type,
                    'category', sc.category,
                    'icon', sc.icon,
                    'color', sc.color,
                    'xp_reward', sc.xp_reward,
                    'bonus_xp', sc.bonus_xp,
                    'target_count', sc.target_count,
                    'reward_type', sc.reward_type,
                    'reward_data', sc.reward_data,
                    'is_premium', sc.is_premium,
                    'start_date', sc.start_date,
                    'end_date', sc.end_date,
                    'user_progress', COALESCE((
                        SELECT jsonb_build_object(
                            'status', usp.status,
                            'current_count', usp.current_count,
                            'completed_at', usp.completed_at,
                            'claimed_at', usp.claimed_at,
                            'xp_earned', usp.xp_earned
                        )
                        FROM user_seasonal_progress usp
                        WHERE usp.user_id = p_user_id
                          AND usp.seasonal_challenge_id = sc.id
                    ), jsonb_build_object(
                        'status', 'available',
                        'current_count', 0,
                        'completed_at', NULL,
                        'claimed_at', NULL,
                        'xp_earned', 0
                    ))
                ) ORDER BY sc.sort_order, sc.xp_reward DESC
            )
            FROM seasonal_challenges sc
            WHERE sc.season_id = v_season_id
              AND sc.is_active = true
              AND (p_challenge_type IS NULL OR sc.challenge_type = p_challenge_type)
              AND (sc.start_date IS NULL OR sc.start_date <= CURRENT_DATE)
              AND (sc.end_date IS NULL OR sc.end_date >= CURRENT_DATE)
        ), '[]'::JSONB),
        'stats', jsonb_build_object(
            'total_challenges', (
                SELECT COUNT(*) FROM seasonal_challenges
                WHERE season_id = v_season_id AND is_active = true
            ),
            'completed', (
                SELECT COUNT(*) FROM user_seasonal_progress usp
                JOIN seasonal_challenges sc ON sc.id = usp.seasonal_challenge_id
                WHERE usp.user_id = p_user_id
                  AND sc.season_id = v_season_id
                  AND usp.status IN ('completed', 'claimed')
            ),
            'total_xp_earned', COALESCE((
                SELECT SUM(usp.xp_earned) FROM user_seasonal_progress usp
                JOIN seasonal_challenges sc ON sc.id = usp.seasonal_challenge_id
                WHERE usp.user_id = p_user_id AND sc.season_id = v_season_id
            ), 0)
        )
    )
    INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour compléter un défi saisonnier
CREATE OR REPLACE FUNCTION complete_seasonal_challenge(
    p_user_id UUID,
    p_challenge_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_challenge RECORD;
    v_progress RECORD;
    v_xp_earned INTEGER;
    v_reward JSONB;
BEGIN
    -- Récupérer le défi
    SELECT * INTO v_challenge
    FROM seasonal_challenges
    WHERE id = p_challenge_id AND is_active = true;

    IF v_challenge IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi non trouvé');
    END IF;

    -- Récupérer ou créer la progression
    INSERT INTO user_seasonal_progress (user_id, seasonal_challenge_id, status, current_count)
    VALUES (p_user_id, p_challenge_id, 'in_progress', 0)
    ON CONFLICT (user_id, seasonal_challenge_id) DO NOTHING;

    SELECT * INTO v_progress
    FROM user_seasonal_progress
    WHERE user_id = p_user_id AND seasonal_challenge_id = p_challenge_id;

    -- Vérifier si déjà complété
    IF v_progress.status IN ('completed', 'claimed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi déjà complété');
    END IF;

    -- Vérifier si la cible est atteinte
    IF v_progress.current_count < v_challenge.target_count THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Objectif non atteint',
            'current', v_progress.current_count,
            'target', v_challenge.target_count
        );
    END IF;

    -- Calculer les XP
    v_xp_earned := v_challenge.xp_reward + COALESCE(v_challenge.bonus_xp, 0);

    -- Mettre à jour la progression
    UPDATE user_seasonal_progress
    SET status = 'completed',
        completed_at = NOW(),
        xp_earned = v_xp_earned,
        updated_at = NOW()
    WHERE id = v_progress.id;

    -- Ajouter les XP
    UPDATE user_profiles
    SET xp = xp + v_xp_earned,
        total_xp = total_xp + v_xp_earned
    WHERE id = p_user_id;

    -- Construire la récompense
    v_reward := jsonb_build_object(
        'type', v_challenge.reward_type,
        'data', v_challenge.reward_data
    );

    RETURN jsonb_build_object(
        'success', true,
        'challenge_id', p_challenge_id,
        'xp_earned', v_xp_earned,
        'reward', v_reward
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour mettre à jour la progression d'un défi saisonnier
CREATE OR REPLACE FUNCTION update_seasonal_progress(
    p_user_id UUID,
    p_challenge_id UUID,
    p_increment INTEGER DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
    v_challenge RECORD;
    v_progress RECORD;
    v_new_count INTEGER;
    v_completed BOOLEAN := false;
BEGIN
    -- Récupérer le défi
    SELECT * INTO v_challenge
    FROM seasonal_challenges
    WHERE id = p_challenge_id AND is_active = true;

    IF v_challenge IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi non trouvé');
    END IF;

    -- Créer ou mettre à jour la progression
    INSERT INTO user_seasonal_progress (user_id, seasonal_challenge_id, status, current_count)
    VALUES (p_user_id, p_challenge_id, 'in_progress', p_increment)
    ON CONFLICT (user_id, seasonal_challenge_id)
    DO UPDATE SET
        current_count = user_seasonal_progress.current_count + p_increment,
        status = CASE
            WHEN user_seasonal_progress.status = 'available' THEN 'in_progress'
            ELSE user_seasonal_progress.status
        END,
        updated_at = NOW()
    RETURNING * INTO v_progress;

    v_new_count := v_progress.current_count;

    -- Vérifier si complété
    IF v_new_count >= v_challenge.target_count AND v_progress.status NOT IN ('completed', 'claimed') THEN
        v_completed := true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'challenge_id', p_challenge_id,
        'current_count', v_new_count,
        'target_count', v_challenge.target_count,
        'completed', v_completed,
        'percentage', ROUND((v_new_count::NUMERIC / v_challenge.target_count) * 100)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_seasonal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_advent_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_seasonal_rewards ENABLE ROW LEVEL SECURITY;

-- Policies pour user_seasonal_progress
CREATE POLICY "Users can view own seasonal progress"
    ON user_seasonal_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seasonal progress"
    ON user_seasonal_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own seasonal progress"
    ON user_seasonal_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies pour user_advent_progress
CREATE POLICY "Users can view own advent progress"
    ON user_advent_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own advent progress"
    ON user_advent_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies pour user_seasonal_rewards
CREATE POLICY "Users can view own seasonal rewards"
    ON user_seasonal_rewards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seasonal rewards"
    ON user_seasonal_rewards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies publiques pour les données de référence
CREATE POLICY "Anyone can view seasons"
    ON seasons FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view seasonal challenges"
    ON seasonal_challenges FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view advent calendars"
    ON advent_calendars FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view advent calendar days"
    ON advent_calendar_days FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view seasonal rewards"
    ON seasonal_rewards FOR SELECT
    USING (true);
