-- ============================================================================
-- TEENS PARTY MOROCCO - Annual Wrapped
-- ============================================================================
-- Migration: 013_annual_wrapped.sql
-- Description: Tables et fonctions pour le récapitulatif annuel style Spotify Wrapped
-- ============================================================================

-- ============================================================================
-- USER ANNUAL WRAPPED
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_annual_wrapped (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,

    -- Status de génération
    status VARCHAR(20) DEFAULT 'pending', -- pending, generating, ready, viewed
    generated_at TIMESTAMPTZ,
    first_viewed_at TIMESTAMPTZ,

    -- Données du wrapped (stockées en JSON pour flexibilité)
    wrapped_data JSONB NOT NULL DEFAULT '{}',

    -- Partage
    share_token VARCHAR(100) UNIQUE,
    share_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_user_annual_wrapped_user_year
ON user_annual_wrapped(user_id, year DESC);

CREATE INDEX IF NOT EXISTS idx_user_annual_wrapped_share_token
ON user_annual_wrapped(share_token) WHERE share_token IS NOT NULL;

-- ============================================================================
-- WRAPPED HIGHLIGHTS (moments forts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wrapped_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wrapped_id UUID NOT NULL REFERENCES user_annual_wrapped(id) ON DELETE CASCADE,

    highlight_type VARCHAR(50) NOT NULL,
    -- Types: top_event, most_xp_day, longest_streak, biggest_achievement,
    --        best_game_performance, favorite_friend, top_crew, memorable_moment

    title VARCHAR(200) NOT NULL,
    description TEXT,
    value DECIMAL(15,2),
    unit VARCHAR(50),
    rank INTEGER, -- pour ordonner les slides

    -- Données additionnelles
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wrapped_highlights_wrapped
ON wrapped_highlights(wrapped_id, rank);

-- ============================================================================
-- WRAPPED COMPARISONS (comparaisons fun)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wrapped_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wrapped_id UUID NOT NULL REFERENCES user_annual_wrapped(id) ON DELETE CASCADE,

    comparison_type VARCHAR(50) NOT NULL,
    -- Types: vs_average, vs_last_year, fun_fact, percentile

    title VARCHAR(200) NOT NULL,
    user_value DECIMAL(15,2),
    comparison_value DECIMAL(15,2),
    percentage_diff DECIMAL(10,2),
    fun_text TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- WRAPPED ACHIEVEMENTS (badges spéciaux du wrapped)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wrapped_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wrapped_id UUID NOT NULL REFERENCES user_annual_wrapped(id) ON DELETE CASCADE,

    achievement_slug VARCHAR(50) NOT NULL,
    -- Slugs: party_animal, early_bird, night_owl, social_butterfly, game_master,
    --        challenge_champion, loyal_member, rising_star, top_predictor, memory_king

    title VARCHAR(100) NOT NULL,
    description TEXT,
    emoji VARCHAR(10),
    rarity VARCHAR(20) DEFAULT 'common', -- common, rare, epic, legendary

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour générer le wrapped d'un utilisateur
CREATE OR REPLACE FUNCTION generate_user_wrapped(
    p_user_id UUID,
    p_year INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wrapped_id UUID;
    v_wrapped_data JSONB;
    v_total_xp BIGINT;
    v_total_events INTEGER;
    v_total_challenges INTEGER;
    v_total_games INTEGER;
    v_total_friends INTEGER;
    v_top_month TEXT;
    v_top_day TEXT;
    v_longest_streak INTEGER;
    v_favorite_game TEXT;
    v_total_time_hours DECIMAL;
BEGIN
    -- Vérifier si le wrapped existe déjà
    SELECT id INTO v_wrapped_id
    FROM user_annual_wrapped
    WHERE user_id = p_user_id AND year = p_year;

    IF v_wrapped_id IS NOT NULL THEN
        -- Mettre à jour le statut
        UPDATE user_annual_wrapped
        SET status = 'generating', updated_at = NOW()
        WHERE id = v_wrapped_id;
    ELSE
        -- Créer le wrapped
        INSERT INTO user_annual_wrapped (user_id, year, status)
        VALUES (p_user_id, p_year, 'generating')
        RETURNING id INTO v_wrapped_id;
    END IF;

    -- Calculer les statistiques de l'année
    -- Total XP
    SELECT COALESCE(SUM(xp_earned), 0) INTO v_total_xp
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

    -- Total événements
    SELECT COALESCE(SUM(events_attended), 0) INTO v_total_events
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

    -- Total défis
    SELECT COALESCE(SUM(challenges_completed), 0) INTO v_total_challenges
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

    -- Total jeux
    SELECT COALESCE(SUM(games_played), 0) INTO v_total_games
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

    -- Total temps (en heures)
    SELECT COALESCE(SUM(time_spent_minutes) / 60.0, 0) INTO v_total_time_hours
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

    -- Meilleur mois
    SELECT TO_CHAR(activity_date, 'Month') INTO v_top_month
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year
    GROUP BY EXTRACT(MONTH FROM activity_date), TO_CHAR(activity_date, 'Month')
    ORDER BY SUM(xp_earned) DESC
    LIMIT 1;

    -- Meilleur jour de la semaine
    SELECT TO_CHAR(activity_date, 'Day') INTO v_top_day
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year
    GROUP BY EXTRACT(DOW FROM activity_date), TO_CHAR(activity_date, 'Day')
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    -- Plus longue série
    SELECT COALESCE(MAX(login_streak), 0) INTO v_longest_streak
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

    -- Jeu favori
    SELECT favorite_game INTO v_favorite_game
    FROM user_lifetime_stats
    WHERE user_id = p_user_id;

    -- Construire les données du wrapped
    v_wrapped_data := jsonb_build_object(
        'summary', jsonb_build_object(
            'total_xp', v_total_xp,
            'total_events', v_total_events,
            'total_challenges', v_total_challenges,
            'total_games', v_total_games,
            'total_time_hours', ROUND(v_total_time_hours::numeric, 1),
            'longest_streak', v_longest_streak
        ),
        'favorites', jsonb_build_object(
            'top_month', TRIM(v_top_month),
            'top_day', TRIM(v_top_day),
            'favorite_game', v_favorite_game
        ),
        'percentiles', jsonb_build_object(
            'xp_percentile', (
                SELECT ROUND((1 - COUNT(*)::DECIMAL / NULLIF((
                    SELECT COUNT(*) FROM user_lifetime_stats
                ), 0)) * 100)
                FROM user_lifetime_stats
                WHERE total_xp > v_total_xp
            ),
            'events_percentile', (
                SELECT ROUND((1 - COUNT(*)::DECIMAL / NULLIF((
                    SELECT COUNT(*) FROM user_lifetime_stats
                ), 0)) * 100)
                FROM user_lifetime_stats
                WHERE total_events_attended > v_total_events
            )
        )
    );

    -- Mettre à jour le wrapped avec les données
    UPDATE user_annual_wrapped
    SET wrapped_data = v_wrapped_data,
        status = 'ready',
        generated_at = NOW(),
        share_token = encode(gen_random_bytes(16), 'hex'),
        updated_at = NOW()
    WHERE id = v_wrapped_id;

    -- Générer les highlights
    PERFORM generate_wrapped_highlights(v_wrapped_id, p_user_id, p_year);

    -- Générer les achievements spéciaux
    PERFORM generate_wrapped_achievements(v_wrapped_id, p_user_id, p_year, v_wrapped_data);

    RETURN v_wrapped_id;
END;
$$;

-- Fonction pour générer les highlights
CREATE OR REPLACE FUNCTION generate_wrapped_highlights(
    p_wrapped_id UUID,
    p_user_id UUID,
    p_year INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rank INTEGER := 1;
    v_best_day RECORD;
    v_best_event RECORD;
BEGIN
    -- Supprimer les anciens highlights
    DELETE FROM wrapped_highlights WHERE wrapped_id = p_wrapped_id;

    -- Highlight 1: Jour avec le plus d'XP
    SELECT activity_date, xp_earned INTO v_best_day
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year
    ORDER BY xp_earned DESC
    LIMIT 1;

    IF v_best_day IS NOT NULL THEN
        INSERT INTO wrapped_highlights (wrapped_id, highlight_type, title, description, value, unit, rank, metadata)
        VALUES (
            p_wrapped_id,
            'most_xp_day',
            'Ta journée la plus folle',
            'Le ' || TO_CHAR(v_best_day.activity_date, 'DD Month') || ', tu as explosé tous les compteurs !',
            v_best_day.xp_earned,
            'XP',
            v_rank,
            jsonb_build_object('date', v_best_day.activity_date)
        );
        v_rank := v_rank + 1;
    END IF;

    -- Highlight 2: Total XP avec comparaison fun
    INSERT INTO wrapped_highlights (wrapped_id, highlight_type, title, description, value, unit, rank, metadata)
    SELECT
        p_wrapped_id,
        'total_xp',
        'XP accumulés cette année',
        CASE
            WHEN SUM(xp_earned) > 50000 THEN 'Tu es une vraie machine à XP !'
            WHEN SUM(xp_earned) > 20000 THEN 'Impressionnant, continue comme ça !'
            WHEN SUM(xp_earned) > 5000 THEN 'Beau parcours cette année !'
            ELSE 'L''année prochaine sera encore meilleure !'
        END,
        SUM(xp_earned),
        'XP',
        v_rank,
        '{}'::jsonb
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;
    v_rank := v_rank + 1;

    -- Highlight 3: Nombre d'événements
    INSERT INTO wrapped_highlights (wrapped_id, highlight_type, title, description, value, unit, rank, metadata)
    SELECT
        p_wrapped_id,
        'total_events',
        'Événements cette année',
        CASE
            WHEN SUM(events_attended) > 50 THEN 'Tu es partout ! Un vrai party animal 🎉'
            WHEN SUM(events_attended) > 20 THEN 'Tu ne manques jamais une occasion de faire la fête !'
            WHEN SUM(events_attended) > 10 THEN 'De belles soirées en perspective !'
            ELSE 'Chaque événement compte !'
        END,
        SUM(events_attended),
        'événements',
        v_rank,
        '{}'::jsonb
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;
    v_rank := v_rank + 1;

    -- Highlight 4: Série la plus longue
    INSERT INTO wrapped_highlights (wrapped_id, highlight_type, title, description, value, unit, rank, metadata)
    SELECT
        p_wrapped_id,
        'longest_streak',
        'Ta plus longue série',
        CASE
            WHEN MAX(login_streak) > 30 THEN 'Un mois entier sans manquer un jour ! Légendaire !'
            WHEN MAX(login_streak) > 14 THEN 'Deux semaines de suite, quelle motivation !'
            WHEN MAX(login_streak) > 7 THEN 'Une semaine complète, bravo !'
            ELSE 'Chaque jour compte !'
        END,
        MAX(login_streak),
        'jours',
        v_rank,
        '{}'::jsonb
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;
    v_rank := v_rank + 1;

    -- Highlight 5: Défis complétés
    INSERT INTO wrapped_highlights (wrapped_id, highlight_type, title, description, value, unit, rank, metadata)
    SELECT
        p_wrapped_id,
        'challenges_completed',
        'Défis relevés',
        'Tu n''as pas eu peur des challenges cette année !',
        SUM(challenges_completed),
        'défis',
        v_rank,
        '{}'::jsonb
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;
    v_rank := v_rank + 1;

    -- Highlight 6: Parties jouées
    INSERT INTO wrapped_highlights (wrapped_id, highlight_type, title, description, value, unit, rank, metadata)
    SELECT
        p_wrapped_id,
        'games_played',
        'Parties jouées',
        'Les mini-jeux n''ont plus de secrets pour toi !',
        SUM(games_played),
        'parties',
        v_rank,
        '{}'::jsonb
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

END;
$$;

-- Fonction pour générer les achievements du wrapped
CREATE OR REPLACE FUNCTION generate_wrapped_achievements(
    p_wrapped_id UUID,
    p_user_id UUID,
    p_year INTEGER,
    p_data JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_events INTEGER;
    v_total_games INTEGER;
    v_total_challenges INTEGER;
    v_longest_streak INTEGER;
BEGIN
    -- Supprimer les anciens achievements
    DELETE FROM wrapped_achievements WHERE wrapped_id = p_wrapped_id;

    v_total_events := (p_data->'summary'->>'total_events')::INTEGER;
    v_total_games := (p_data->'summary'->>'total_games')::INTEGER;
    v_total_challenges := (p_data->'summary'->>'total_challenges')::INTEGER;
    v_longest_streak := (p_data->'summary'->>'longest_streak')::INTEGER;

    -- Party Animal (beaucoup d'événements)
    IF v_total_events >= 50 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'party_animal', 'Party Animal', 'Tu as participé à plus de 50 événements !', '🎉', 'legendary');
    ELSIF v_total_events >= 25 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'party_lover', 'Party Lover', 'Plus de 25 événements cette année !', '🥳', 'epic');
    ELSIF v_total_events >= 10 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'party_goer', 'Party Goer', 'Tu as participé à 10+ événements', '🎊', 'rare');
    END IF;

    -- Game Master (beaucoup de jeux)
    IF v_total_games >= 100 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'game_master', 'Game Master', 'Plus de 100 parties jouées !', '🎮', 'legendary');
    ELSIF v_total_games >= 50 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'gamer', 'Gamer', '50+ parties jouées cette année', '🕹️', 'epic');
    END IF;

    -- Challenge Champion
    IF v_total_challenges >= 100 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'challenge_champion', 'Challenge Champion', 'Plus de 100 défis relevés !', '🏆', 'legendary');
    ELSIF v_total_challenges >= 50 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'challenger', 'Challenger', '50+ défis complétés', '🎯', 'epic');
    END IF;

    -- Streak Master
    IF v_longest_streak >= 30 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'streak_master', 'Streak Master', 'Série de 30 jours ou plus !', '🔥', 'legendary');
    ELSIF v_longest_streak >= 14 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'streak_keeper', 'Streak Keeper', 'Série de 2 semaines', '⚡', 'epic');
    ELSIF v_longest_streak >= 7 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'consistent', 'Consistent', 'Série d''une semaine', '✨', 'rare');
    END IF;

    -- Rising Star (pour les nouveaux membres actifs)
    -- Loyal Member (pour les anciens membres)
    -- Ces achievements nécessiteraient des données supplémentaires

END;
$$;

-- Fonction pour obtenir le wrapped d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_wrapped(
    p_user_id UUID,
    p_year INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wrapped RECORD;
    v_highlights JSON;
    v_achievements JSON;
    v_comparisons JSON;
BEGIN
    -- Récupérer le wrapped
    SELECT * INTO v_wrapped
    FROM user_annual_wrapped
    WHERE user_id = p_user_id AND year = p_year;

    IF v_wrapped IS NULL THEN
        RETURN NULL;
    END IF;

    -- Récupérer les highlights
    SELECT json_agg(
        json_build_object(
            'type', highlight_type,
            'title', title,
            'description', description,
            'value', value,
            'unit', unit,
            'metadata', metadata
        ) ORDER BY rank
    ) INTO v_highlights
    FROM wrapped_highlights
    WHERE wrapped_id = v_wrapped.id;

    -- Récupérer les achievements
    SELECT json_agg(
        json_build_object(
            'slug', achievement_slug,
            'title', title,
            'description', description,
            'emoji', emoji,
            'rarity', rarity
        )
    ) INTO v_achievements
    FROM wrapped_achievements
    WHERE wrapped_id = v_wrapped.id;

    -- Récupérer les comparisons
    SELECT json_agg(
        json_build_object(
            'type', comparison_type,
            'title', title,
            'user_value', user_value,
            'comparison_value', comparison_value,
            'percentage_diff', percentage_diff,
            'fun_text', fun_text
        )
    ) INTO v_comparisons
    FROM wrapped_comparisons
    WHERE wrapped_id = v_wrapped.id;

    -- Marquer comme vu si première vue
    IF v_wrapped.first_viewed_at IS NULL THEN
        UPDATE user_annual_wrapped
        SET first_viewed_at = NOW(), status = 'viewed'
        WHERE id = v_wrapped.id;
    END IF;

    RETURN json_build_object(
        'id', v_wrapped.id,
        'year', v_wrapped.year,
        'status', v_wrapped.status,
        'data', v_wrapped.wrapped_data,
        'highlights', COALESCE(v_highlights, '[]'::json),
        'achievements', COALESCE(v_achievements, '[]'::json),
        'comparisons', COALESCE(v_comparisons, '[]'::json),
        'share_token', v_wrapped.share_token,
        'is_public', v_wrapped.is_public,
        'generated_at', v_wrapped.generated_at
    );
END;
$$;

-- Fonction pour obtenir un wrapped public via token
CREATE OR REPLACE FUNCTION get_public_wrapped(p_share_token VARCHAR(100))
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wrapped RECORD;
BEGIN
    SELECT * INTO v_wrapped
    FROM user_annual_wrapped
    WHERE share_token = p_share_token AND is_public = true;

    IF v_wrapped IS NULL THEN
        RETURN NULL;
    END IF;

    -- Incrémenter le compteur de partage
    UPDATE user_annual_wrapped
    SET share_count = share_count + 1
    WHERE id = v_wrapped.id;

    RETURN get_user_wrapped(v_wrapped.user_id, v_wrapped.year);
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_annual_wrapped ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrapped_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrapped_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrapped_achievements ENABLE ROW LEVEL SECURITY;

-- Policies pour user_annual_wrapped
CREATE POLICY "Users can view their own wrapped"
ON user_annual_wrapped FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can update their own wrapped"
ON user_annual_wrapped FOR UPDATE
USING (auth.uid() = user_id);

-- Policies pour les sous-tables (lecture via le wrapped parent)
CREATE POLICY "Users can view their wrapped highlights"
ON wrapped_highlights FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_annual_wrapped
        WHERE id = wrapped_highlights.wrapped_id
        AND (user_id = auth.uid() OR is_public = true)
    )
);

CREATE POLICY "Users can view their wrapped achievements"
ON wrapped_achievements FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_annual_wrapped
        WHERE id = wrapped_achievements.wrapped_id
        AND (user_id = auth.uid() OR is_public = true)
    )
);

CREATE POLICY "Users can view their wrapped comparisons"
ON wrapped_comparisons FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_annual_wrapped
        WHERE id = wrapped_comparisons.wrapped_id
        AND (user_id = auth.uid() OR is_public = true)
    )
);

COMMIT;
