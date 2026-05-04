-- ============================================================================
-- TEENS PARTY MOROCCO - User Stats Dashboard
-- ============================================================================
-- Migration: 012_user_stats_dashboard.sql
-- Description: Tables et fonctions pour le dashboard de statistiques personnelles
-- ============================================================================

-- ============================================================================
-- USER ACTIVITY TRACKING
-- ============================================================================

-- Table pour suivre l'activité quotidienne des utilisateurs
CREATE TABLE IF NOT EXISTS user_daily_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Temps passé (en minutes)
    time_spent_minutes INTEGER DEFAULT 0,

    -- Actions
    events_attended INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    friends_made INTEGER DEFAULT 0,
    photos_uploaded INTEGER DEFAULT 0,
    reviews_written INTEGER DEFAULT 0,
    predictions_made INTEGER DEFAULT 0,

    -- Points/XP gagnés ce jour
    xp_earned INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,

    -- Badges débloqués ce jour
    badges_unlocked INTEGER DEFAULT 0,

    -- Streaks
    login_streak INTEGER DEFAULT 1,
    event_streak INTEGER DEFAULT 0,
    challenge_streak INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, activity_date)
);

-- Index pour les requêtes par utilisateur et date
CREATE INDEX IF NOT EXISTS idx_user_daily_activity_user_date
ON user_daily_activity(user_id, activity_date DESC);

-- ============================================================================
-- USER LIFETIME STATS
-- ============================================================================

-- Statistiques agrégées à vie
CREATE TABLE IF NOT EXISTS user_lifetime_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Totaux généraux
    total_xp BIGINT DEFAULT 0,
    total_coins_earned BIGINT DEFAULT 0,
    total_coins_spent BIGINT DEFAULT 0,

    -- Événements
    total_events_attended INTEGER DEFAULT 0,
    total_event_hours DECIMAL(10,2) DEFAULT 0,
    favorite_event_type VARCHAR(100),
    favorite_day_of_week INTEGER, -- 0=Dimanche, 6=Samedi
    average_stay_duration_minutes INTEGER DEFAULT 0,
    earliest_arrival_time TIME,
    latest_departure_time TIME,

    -- Défis
    total_challenges_completed INTEGER DEFAULT 0,
    total_challenges_failed INTEGER DEFAULT 0,
    challenge_completion_rate DECIMAL(5,2) DEFAULT 0,
    favorite_challenge_type VARCHAR(100),
    longest_challenge_streak INTEGER DEFAULT 0,
    current_challenge_streak INTEGER DEFAULT 0,

    -- Mini-jeux
    total_games_played INTEGER DEFAULT 0,
    total_game_wins INTEGER DEFAULT 0,
    game_win_rate DECIMAL(5,2) DEFAULT 0,
    favorite_game VARCHAR(100),
    highest_quiz_score INTEGER DEFAULT 0,
    best_memory_time_seconds INTEGER,
    predictions_correct INTEGER DEFAULT 0,
    predictions_total INTEGER DEFAULT 0,
    prediction_accuracy DECIMAL(5,2) DEFAULT 0,

    -- Social
    total_friends INTEGER DEFAULT 0,
    total_friend_requests_sent INTEGER DEFAULT 0,
    total_friend_requests_received INTEGER DEFAULT 0,
    total_crews_joined INTEGER DEFAULT 0,
    total_duels_played INTEGER DEFAULT 0,
    total_duels_won INTEGER DEFAULT 0,

    -- Contenu
    total_photos_uploaded INTEGER DEFAULT 0,
    total_photos_liked INTEGER DEFAULT 0,
    total_reviews_written INTEGER DEFAULT 0,
    average_review_rating DECIMAL(3,2),
    total_comments_posted INTEGER DEFAULT 0,

    -- Badges
    total_badges_earned INTEGER DEFAULT 0,
    rarest_badge_id UUID,

    -- Boutique
    total_purchases INTEGER DEFAULT 0,
    total_items_owned INTEGER DEFAULT 0,

    -- Streaks records
    longest_login_streak INTEGER DEFAULT 0,
    longest_event_streak INTEGER DEFAULT 0,
    current_login_streak INTEGER DEFAULT 0,
    current_event_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    last_event_date DATE,

    -- Timestamps
    first_activity_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER MONTHLY STATS
-- ============================================================================

-- Statistiques mensuelles pour comparaisons
CREATE TABLE IF NOT EXISTS user_monthly_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_year DATE NOT NULL, -- Premier jour du mois

    -- Totaux du mois
    xp_earned INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    events_attended INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    badges_earned INTEGER DEFAULT 0,

    -- Classements du mois
    monthly_rank INTEGER,
    percentile DECIMAL(5,2),

    -- Progression vs mois précédent
    xp_change_percent DECIMAL(5,2),
    activity_change_percent DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_user_monthly_stats_user
ON user_monthly_stats(user_id, month_year DESC);

-- ============================================================================
-- ACHIEVEMENT MILESTONES
-- ============================================================================

-- Jalons personnels atteints
CREATE TABLE IF NOT EXISTS user_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    milestone_type VARCHAR(50) NOT NULL,
    -- Types: first_event, 10_events, 50_events, 100_events,
    --        first_badge, 10_badges, all_badges,
    --        first_friend, 10_friends, 50_friends,
    --        first_win, 10_wins, 100_wins,
    --        level_10, level_25, level_50, level_100,
    --        1000_xp, 10000_xp, 100000_xp,
    --        1_month_member, 6_month_member, 1_year_member

    milestone_value INTEGER,
    achieved_at TIMESTAMPTZ DEFAULT NOW(),

    -- Récompense associée
    xp_reward INTEGER DEFAULT 0,
    coins_reward INTEGER DEFAULT 0,
    badge_id UUID,

    UNIQUE(user_id, milestone_type)
);

CREATE INDEX IF NOT EXISTS idx_user_milestones_user
ON user_milestones(user_id, achieved_at DESC);

-- ============================================================================
-- USER COMPARISONS (pour "vs average" stats)
-- ============================================================================

-- Moyennes globales de la plateforme (mise à jour périodique)
CREATE TABLE IF NOT EXISTS platform_averages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    period VARCHAR(20) DEFAULT 'all_time', -- all_time, monthly, weekly

    -- Moyennes
    avg_xp_per_user DECIMAL(10,2),
    avg_events_per_user DECIMAL(10,2),
    avg_challenges_per_user DECIMAL(10,2),
    avg_games_per_user DECIMAL(10,2),
    avg_badges_per_user DECIMAL(10,2),
    avg_friends_per_user DECIMAL(10,2),
    avg_login_streak DECIMAL(10,2),
    avg_event_streak DECIMAL(10,2),

    -- Distributions (pour percentiles)
    total_users INTEGER,
    active_users_7d INTEGER,
    active_users_30d INTEGER
);

-- ============================================================================
-- PERSONAL RECORDS
-- ============================================================================

-- Records personnels de l'utilisateur
CREATE TABLE IF NOT EXISTS user_personal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    record_type VARCHAR(50) NOT NULL,
    -- Types: highest_daily_xp, most_events_in_week, most_events_in_month,
    --        longest_event_stay, most_challenges_in_day, highest_game_score,
    --        fastest_memory_game, best_quiz_streak, most_predictions_correct

    record_value DECIMAL(15,2) NOT NULL,
    previous_record DECIMAL(15,2),
    achieved_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contexte du record
    context_data JSONB,

    UNIQUE(user_id, record_type)
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour mettre à jour l'activité quotidienne
CREATE OR REPLACE FUNCTION update_daily_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_amount INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_daily_activity (user_id, activity_date)
    VALUES (p_user_id, CURRENT_DATE)
    ON CONFLICT (user_id, activity_date) DO NOTHING;

    -- Mise à jour selon le type d'activité
    CASE p_activity_type
        WHEN 'event' THEN
            UPDATE user_daily_activity
            SET events_attended = events_attended + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'challenge' THEN
            UPDATE user_daily_activity
            SET challenges_completed = challenges_completed + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'game' THEN
            UPDATE user_daily_activity
            SET games_played = games_played + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'xp' THEN
            UPDATE user_daily_activity
            SET xp_earned = xp_earned + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'coins' THEN
            UPDATE user_daily_activity
            SET coins_earned = coins_earned + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'badge' THEN
            UPDATE user_daily_activity
            SET badges_unlocked = badges_unlocked + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'friend' THEN
            UPDATE user_daily_activity
            SET friends_made = friends_made + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'photo' THEN
            UPDATE user_daily_activity
            SET photos_uploaded = photos_uploaded + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'review' THEN
            UPDATE user_daily_activity
            SET reviews_written = reviews_written + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'prediction' THEN
            UPDATE user_daily_activity
            SET predictions_made = predictions_made + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'time' THEN
            UPDATE user_daily_activity
            SET time_spent_minutes = time_spent_minutes + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        ELSE
            NULL;
    END CASE;
END;
$$;

-- Fonction pour obtenir les stats complètes d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lifetime_stats JSON;
    v_recent_activity JSON;
    v_monthly_comparison JSON;
    v_records JSON;
    v_milestones JSON;
    v_rank_info JSON;
BEGIN
    -- Stats à vie
    SELECT row_to_json(uls) INTO v_lifetime_stats
    FROM user_lifetime_stats uls
    WHERE uls.user_id = p_user_id;

    -- Activité des 7 derniers jours
    SELECT json_agg(
        json_build_object(
            'date', activity_date,
            'xp', xp_earned,
            'events', events_attended,
            'challenges', challenges_completed,
            'games', games_played
        ) ORDER BY activity_date DESC
    ) INTO v_recent_activity
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND activity_date >= CURRENT_DATE - INTERVAL '7 days';

    -- Comparaison mensuelle
    SELECT json_agg(
        json_build_object(
            'month', month_year,
            'xp', xp_earned,
            'events', events_attended,
            'rank', monthly_rank,
            'percentile', percentile
        ) ORDER BY month_year DESC
    ) INTO v_monthly_comparison
    FROM user_monthly_stats
    WHERE user_id = p_user_id
    LIMIT 6;

    -- Records personnels
    SELECT json_agg(
        json_build_object(
            'type', record_type,
            'value', record_value,
            'achieved_at', achieved_at
        )
    ) INTO v_records
    FROM user_personal_records
    WHERE user_id = p_user_id;

    -- Jalons atteints
    SELECT json_agg(
        json_build_object(
            'type', milestone_type,
            'value', milestone_value,
            'achieved_at', achieved_at
        ) ORDER BY achieved_at DESC
    ) INTO v_milestones
    FROM user_milestones
    WHERE user_id = p_user_id
    LIMIT 10;

    -- Infos de classement
    SELECT json_build_object(
        'global_rank', (
            SELECT COUNT(*) + 1 FROM user_lifetime_stats
            WHERE total_xp > COALESCE((SELECT total_xp FROM user_lifetime_stats WHERE user_id = p_user_id), 0)
        ),
        'total_users', (SELECT COUNT(*) FROM user_lifetime_stats),
        'percentile', (
            SELECT ROUND(
                (1 - (COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM user_lifetime_stats), 0))) * 100,
                1
            )
            FROM user_lifetime_stats
            WHERE total_xp > COALESCE((SELECT total_xp FROM user_lifetime_stats WHERE user_id = p_user_id), 0)
        )
    ) INTO v_rank_info;

    RETURN json_build_object(
        'lifetime', v_lifetime_stats,
        'recent_activity', COALESCE(v_recent_activity, '[]'::json),
        'monthly', COALESCE(v_monthly_comparison, '[]'::json),
        'records', COALESCE(v_records, '[]'::json),
        'milestones', COALESCE(v_milestones, '[]'::json),
        'rank', v_rank_info
    );
END;
$$;

-- Fonction pour mettre à jour les stats lifetime
CREATE OR REPLACE FUNCTION update_lifetime_stats(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_lifetime_stats (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Mise à jour des totaux depuis l'activité quotidienne
    UPDATE user_lifetime_stats SET
        total_xp = COALESCE((
            SELECT SUM(xp_earned) FROM user_daily_activity WHERE user_id = p_user_id
        ), 0),
        total_events_attended = COALESCE((
            SELECT SUM(events_attended) FROM user_daily_activity WHERE user_id = p_user_id
        ), 0),
        total_challenges_completed = COALESCE((
            SELECT SUM(challenges_completed) FROM user_daily_activity WHERE user_id = p_user_id
        ), 0),
        total_games_played = COALESCE((
            SELECT SUM(games_played) FROM user_daily_activity WHERE user_id = p_user_id
        ), 0),
        total_badges_earned = COALESCE((
            SELECT SUM(badges_unlocked) FROM user_daily_activity WHERE user_id = p_user_id
        ), 0),
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$;

-- Fonction pour vérifier et attribuer les jalons
CREATE OR REPLACE FUNCTION check_user_milestones(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats RECORD;
    v_new_milestones JSON;
    v_milestone_type VARCHAR(50);
    v_milestone_value INTEGER;
BEGIN
    -- Récupérer les stats actuelles
    SELECT * INTO v_stats FROM user_lifetime_stats WHERE user_id = p_user_id;

    IF v_stats IS NULL THEN
        RETURN '[]'::json;
    END IF;

    -- Vérifier les jalons d'événements
    IF v_stats.total_events_attended >= 1 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, 'first_event', 1, 50)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    IF v_stats.total_events_attended >= 10 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '10_events', 10, 200)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    IF v_stats.total_events_attended >= 50 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '50_events', 50, 500)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    IF v_stats.total_events_attended >= 100 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '100_events', 100, 1000)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    -- Vérifier les jalons d'XP
    IF v_stats.total_xp >= 1000 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '1000_xp', 1000, 100)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    IF v_stats.total_xp >= 10000 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '10000_xp', 10000, 500)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    IF v_stats.total_xp >= 100000 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '100000_xp', 100000, 2000)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    -- Vérifier les jalons de badges
    IF v_stats.total_badges_earned >= 1 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, 'first_badge', 1, 50)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    IF v_stats.total_badges_earned >= 10 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '10_badges', 10, 300)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    -- Retourner les nouveaux jalons atteints
    SELECT json_agg(json_build_object(
        'type', milestone_type,
        'value', milestone_value,
        'xp_reward', xp_reward,
        'achieved_at', achieved_at
    )) INTO v_new_milestones
    FROM user_milestones
    WHERE user_id = p_user_id
    AND achieved_at >= NOW() - INTERVAL '1 minute';

    RETURN COALESCE(v_new_milestones, '[]'::json);
END;
$$;

-- Fonction pour obtenir les stats d'activité sur une période
CREATE OR REPLACE FUNCTION get_activity_stats(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_xp', COALESCE(SUM(xp_earned), 0),
        'total_events', COALESCE(SUM(events_attended), 0),
        'total_challenges', COALESCE(SUM(challenges_completed), 0),
        'total_games', COALESCE(SUM(games_played), 0),
        'total_time_minutes', COALESCE(SUM(time_spent_minutes), 0),
        'active_days', COUNT(*),
        'avg_xp_per_day', ROUND(COALESCE(AVG(xp_earned), 0)::numeric, 1),
        'best_day', (
            SELECT json_build_object(
                'date', activity_date,
                'xp', xp_earned
            )
            FROM user_daily_activity
            WHERE user_id = p_user_id
            AND activity_date >= CURRENT_DATE - (p_days || ' days')::interval
            ORDER BY xp_earned DESC
            LIMIT 1
        ),
        'daily_breakdown', (
            SELECT json_agg(
                json_build_object(
                    'date', activity_date,
                    'xp', xp_earned,
                    'events', events_attended,
                    'challenges', challenges_completed,
                    'games', games_played
                ) ORDER BY activity_date
            )
            FROM user_daily_activity
            WHERE user_id = p_user_id
            AND activity_date >= CURRENT_DATE - (p_days || ' days')::interval
        )
    ) INTO v_result
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND activity_date >= CURRENT_DATE - (p_days || ' days')::interval;

    RETURN v_result;
END;
$$;

-- Fonction pour mettre à jour un record personnel
CREATE OR REPLACE FUNCTION update_personal_record(
    p_user_id UUID,
    p_record_type VARCHAR(50),
    p_new_value DECIMAL(15,2),
    p_context JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_record DECIMAL(15,2);
    v_is_new_record BOOLEAN := FALSE;
BEGIN
    -- Récupérer le record actuel
    SELECT record_value INTO v_current_record
    FROM user_personal_records
    WHERE user_id = p_user_id AND record_type = p_record_type;

    -- Vérifier si c'est un nouveau record
    IF v_current_record IS NULL OR p_new_value > v_current_record THEN
        INSERT INTO user_personal_records (user_id, record_type, record_value, previous_record, context_data)
        VALUES (p_user_id, p_record_type, p_new_value, v_current_record, p_context)
        ON CONFLICT (user_id, record_type) DO UPDATE SET
            previous_record = user_personal_records.record_value,
            record_value = p_new_value,
            achieved_at = NOW(),
            context_data = p_context;

        v_is_new_record := TRUE;
    END IF;

    RETURN v_is_new_record;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lifetime_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_monthly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_averages ENABLE ROW LEVEL SECURITY;

-- Policies pour user_daily_activity
CREATE POLICY "Users can view their own daily activity"
ON user_daily_activity FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert daily activity"
ON user_daily_activity FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update daily activity"
ON user_daily_activity FOR UPDATE
USING (auth.uid() = user_id);

-- Policies pour user_lifetime_stats
CREATE POLICY "Users can view their own lifetime stats"
ON user_lifetime_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage lifetime stats"
ON user_lifetime_stats FOR ALL
USING (auth.uid() = user_id);

-- Policies pour user_monthly_stats
CREATE POLICY "Users can view their own monthly stats"
ON user_monthly_stats FOR SELECT
USING (auth.uid() = user_id);

-- Policies pour user_milestones
CREATE POLICY "Users can view their own milestones"
ON user_milestones FOR SELECT
USING (auth.uid() = user_id);

-- Policies pour user_personal_records
CREATE POLICY "Users can view their own records"
ON user_personal_records FOR SELECT
USING (auth.uid() = user_id);

-- Platform averages are readable by all authenticated users
CREATE POLICY "Anyone can view platform averages"
ON platform_averages FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger pour mettre à jour les stats lifetime après modification daily
CREATE OR REPLACE FUNCTION trigger_update_lifetime_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM update_lifetime_stats(NEW.user_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER after_daily_activity_change
AFTER INSERT OR UPDATE ON user_daily_activity
FOR EACH ROW
EXECUTE FUNCTION trigger_update_lifetime_stats();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insérer les moyennes initiales de la plateforme
INSERT INTO platform_averages (period, avg_xp_per_user, avg_events_per_user, avg_challenges_per_user, avg_games_per_user, avg_badges_per_user, avg_friends_per_user, avg_login_streak, avg_event_streak, total_users, active_users_7d, active_users_30d)
VALUES
('all_time', 5000, 10, 25, 15, 8, 12, 7, 3, 1000, 300, 600),
('monthly', 800, 2, 5, 3, 1, 2, 5, 2, 1000, 300, 600),
('weekly', 200, 0.5, 1.5, 1, 0.3, 0.5, 3, 1, 1000, 300, 600);

COMMIT;
