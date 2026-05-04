-- ============================================================================
-- TEENS PARTY MOROCCO - Mini Games System
-- ============================================================================
-- Migration: 011_mini_games.sql
-- Description: Système de mini-jeux (Quiz Musical, Memory, Prédictions)
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Types de mini-jeux
CREATE TABLE IF NOT EXISTS mini_game_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#ffffff',
    rules TEXT,
    min_players INTEGER DEFAULT 1,
    max_players INTEGER DEFAULT 1,
    base_xp INTEGER DEFAULT 10,
    time_limit_seconds INTEGER, -- NULL = pas de limite
    cooldown_minutes INTEGER DEFAULT 0,
    is_daily BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions de jeu
CREATE TABLE IF NOT EXISTS mini_game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_type_id UUID REFERENCES mini_game_types(id),
    event_id UUID, -- Optionnel - si lié à un événement
    host_user_id UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'in_progress', 'completed', 'cancelled'
    game_data JSONB DEFAULT '{}', -- Données spécifiques au jeu
    settings JSONB DEFAULT '{}', -- Paramètres de la session
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    winner_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants aux sessions
CREATE TABLE IF NOT EXISTS mini_game_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES mini_game_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    rank INTEGER,
    game_state JSONB DEFAULT '{}', -- État du joueur dans le jeu
    xp_earned INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    UNIQUE(session_id, user_id)
);

-- Quiz Musical - Questions
CREATE TABLE IF NOT EXISTS music_quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_title VARCHAR(200) NOT NULL,
    artist VARCHAR(200) NOT NULL,
    audio_preview_url TEXT, -- Extrait audio
    album_art_url TEXT,
    release_year INTEGER,
    genre VARCHAR(50),
    difficulty VARCHAR(20) DEFAULT 'medium', -- 'easy', 'medium', 'hard'
    question_type VARCHAR(50) DEFAULT 'guess_song', -- 'guess_song', 'guess_artist', 'guess_year', 'lyrics'
    options JSONB, -- Options de réponse pour QCM
    correct_answer TEXT NOT NULL,
    hint TEXT,
    points INTEGER DEFAULT 100,
    play_count INTEGER DEFAULT 0,
    success_rate NUMERIC(5,2) DEFAULT 50.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory Game - Paires
CREATE TABLE IF NOT EXISTS memory_game_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_set VARCHAR(50) NOT NULL, -- 'artists', 'albums', 'events', 'emojis'
    image_url TEXT NOT NULL,
    label VARCHAR(100),
    pair_id VARCHAR(50) NOT NULL, -- Pour matcher les paires
    difficulty VARCHAR(20) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prédictions - Questions
CREATE TABLE IF NOT EXISTS prediction_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID, -- Événement lié
    question TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'dj', 'attendance', 'music', 'vibe', 'special'
    options JSONB NOT NULL, -- Options de réponse
    correct_option_index INTEGER, -- NULL jusqu'à la résolution
    resolution_time TIMESTAMPTZ, -- Quand la réponse sera révélée
    points_for_correct INTEGER DEFAULT 100,
    bonus_points INTEGER DEFAULT 50, -- Pour les premiers à répondre
    max_bonus_slots INTEGER DEFAULT 10, -- Combien de personnes peuvent avoir le bonus
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed', 'resolved'
    total_predictions INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prédictions des utilisateurs
CREATE TABLE IF NOT EXISTS user_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prediction_question_id UUID REFERENCES prediction_questions(id) ON DELETE CASCADE,
    selected_option_index INTEGER NOT NULL,
    confidence INTEGER DEFAULT 50, -- 0-100, influence les points
    prediction_time TIMESTAMPTZ DEFAULT NOW(),
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    bonus_earned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, prediction_question_id)
);

-- Scores quotidiens
CREATE TABLE IF NOT EXISTS daily_game_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type_id UUID REFERENCES mini_game_types(id),
    score_date DATE DEFAULT CURRENT_DATE,
    best_score INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    total_xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_type_id, score_date)
);

-- Leaderboard hebdomadaire
CREATE TABLE IF NOT EXISTS weekly_game_leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type_id UUID REFERENCES mini_game_types(id),
    week_start DATE NOT NULL,
    total_score INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    win_count INTEGER DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_type_id, week_start)
);

-- ============================================================================
-- INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mini_game_sessions_type ON mini_game_sessions(game_type_id);
CREATE INDEX IF NOT EXISTS idx_mini_game_sessions_status ON mini_game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mini_game_sessions_host ON mini_game_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_mini_game_participants_session ON mini_game_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_mini_game_participants_user ON mini_game_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_music_quiz_difficulty ON music_quiz_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_music_quiz_type ON music_quiz_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_music_quiz_genre ON music_quiz_questions(genre);

CREATE INDEX IF NOT EXISTS idx_memory_cards_set ON memory_game_cards(card_set);
CREATE INDEX IF NOT EXISTS idx_prediction_questions_event ON prediction_questions(event_id);
CREATE INDEX IF NOT EXISTS idx_prediction_questions_status ON prediction_questions(status);
CREATE INDEX IF NOT EXISTS idx_user_predictions_user ON user_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_question ON user_predictions(prediction_question_id);

CREATE INDEX IF NOT EXISTS idx_daily_scores_user ON daily_game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_scores_date ON daily_game_scores(score_date);
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_week ON weekly_game_leaderboard(week_start);

-- ============================================================================
-- DONNÉES INITIALES
-- ============================================================================

-- Types de mini-jeux
INSERT INTO mini_game_types (slug, name, description, icon, color, rules, min_players, max_players, base_xp, time_limit_seconds, cooldown_minutes, is_daily) VALUES
('music_quiz', 'Quiz Musical', 'Devine les chansons et les artistes !', 'Music', '#EC4899',
 'Écoute l''extrait et devine le titre ou l''artiste. Plus tu réponds vite, plus tu gagnes de points !',
 1, 8, 50, 15, 0, false),

('memory', 'Memory', 'Trouve les paires le plus vite possible !', 'Grid', '#8B5CF6',
 'Retourne les cartes pour trouver les paires. Moins de coups = plus de points !',
 1, 4, 30, 120, 5, false),

('predictions', 'Prédictions', 'Prédis ce qui va se passer à la soirée !', 'TrendingUp', '#10B981',
 'Fais tes prédictions avant l''événement. Si tu as raison, tu gagnes des points !',
 1, 999, 100, NULL, 0, false),

('daily_quiz', 'Quiz du Jour', 'Le quiz quotidien sur la musique et la culture !', 'Calendar', '#F59E0B',
 '5 questions par jour. Bats ton record et grimpe dans le classement !',
 1, 1, 75, 30, 1440, true),

('blindtest', 'Blindtest', 'Qui sera le plus rapide à reconnaître les sons ?', 'Headphones', '#EF4444',
 'Écoute les extraits et sois le premier à buzzer avec la bonne réponse !',
 2, 10, 100, 10, 0, false),

('emoji_guess', 'Devine l''Emoji', 'Devine le titre avec les emojis !', 'Smile', '#FBBF24',
 'Des emojis représentent un titre de chanson ou un artiste. Trouve la réponse !',
 1, 8, 40, 30, 0, false)
ON CONFLICT (slug) DO NOTHING;

-- Questions de quiz musical (exemples)
INSERT INTO music_quiz_questions (song_title, artist, genre, difficulty, question_type, options, correct_answer, points) VALUES
('Blinding Lights', 'The Weeknd', 'pop', 'easy', 'guess_artist',
 '["The Weeknd", "Drake", "Post Malone", "Bruno Mars"]', 'The Weeknd', 100),

('Bad Guy', 'Billie Eilish', 'pop', 'easy', 'guess_song',
 '["Bad Guy", "Ocean Eyes", "Lovely", "Bury a Friend"]', 'Bad Guy', 100),

('Bohemian Rhapsody', 'Queen', 'rock', 'medium', 'guess_artist',
 '["Queen", "Led Zeppelin", "The Beatles", "Pink Floyd"]', 'Queen', 150),

('Shape of You', 'Ed Sheeran', 'pop', 'easy', 'guess_song',
 '["Shape of You", "Perfect", "Photograph", "Castle on the Hill"]', 'Shape of You', 100),

('Uptown Funk', 'Bruno Mars', 'funk', 'easy', 'guess_artist',
 '["Bruno Mars", "The Weeknd", "Pharrell", "Jason Derulo"]', 'Bruno Mars', 100),

('Thriller', 'Michael Jackson', 'pop', 'medium', 'guess_year',
 '["1980", "1982", "1984", "1986"]', '1982', 150),

('Lose Yourself', 'Eminem', 'hip-hop', 'medium', 'guess_song',
 '["Lose Yourself", "Stan", "Not Afraid", "Love the Way You Lie"]', 'Lose Yourself', 150),

('Rolling in the Deep', 'Adele', 'soul', 'easy', 'guess_artist',
 '["Adele", "Amy Winehouse", "Beyoncé", "Rihanna"]', 'Adele', 100),

('Smells Like Teen Spirit', 'Nirvana', 'rock', 'hard', 'guess_year',
 '["1989", "1991", "1993", "1995"]', '1991', 200),

('Get Lucky', 'Daft Punk', 'electronic', 'medium', 'guess_artist',
 '["Daft Punk", "Calvin Harris", "David Guetta", "Deadmau5"]', 'Daft Punk', 150)
ON CONFLICT DO NOTHING;

-- Cartes Memory (exemples)
INSERT INTO memory_game_cards (card_set, image_url, label, pair_id, difficulty) VALUES
-- Set Artistes
('artists', '/images/memory/drake.jpg', 'Drake', 'drake_1', 'easy'),
('artists', '/images/memory/drake.jpg', 'Drake', 'drake_1', 'easy'),
('artists', '/images/memory/rihanna.jpg', 'Rihanna', 'rihanna_1', 'easy'),
('artists', '/images/memory/rihanna.jpg', 'Rihanna', 'rihanna_1', 'easy'),
('artists', '/images/memory/weeknd.jpg', 'The Weeknd', 'weeknd_1', 'easy'),
('artists', '/images/memory/weeknd.jpg', 'The Weeknd', 'weeknd_1', 'easy'),
('artists', '/images/memory/billie.jpg', 'Billie Eilish', 'billie_1', 'easy'),
('artists', '/images/memory/billie.jpg', 'Billie Eilish', 'billie_1', 'easy'),

-- Set Emojis
('emojis', '🎤', 'Micro', 'micro_1', 'easy'),
('emojis', '🎤', 'Micro', 'micro_1', 'easy'),
('emojis', '🎸', 'Guitare', 'guitar_1', 'easy'),
('emojis', '🎸', 'Guitare', 'guitar_1', 'easy'),
('emojis', '🥁', 'Batterie', 'drums_1', 'easy'),
('emojis', '🥁', 'Batterie', 'drums_1', 'easy'),
('emojis', '🎹', 'Piano', 'piano_1', 'easy'),
('emojis', '🎹', 'Piano', 'piano_1', 'easy')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FONCTIONS
-- ============================================================================

-- Créer une session de jeu
CREATE OR REPLACE FUNCTION create_game_session(
    p_user_id UUID,
    p_game_type_slug VARCHAR,
    p_settings JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_game_type RECORD;
    v_session_id UUID;
    v_cooldown_check TIMESTAMPTZ;
BEGIN
    -- Récupérer le type de jeu
    SELECT * INTO v_game_type
    FROM mini_game_types
    WHERE slug = p_game_type_slug AND is_active = true;

    IF v_game_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Type de jeu non trouvé');
    END IF;

    -- Vérifier le cooldown
    IF v_game_type.cooldown_minutes > 0 THEN
        SELECT MAX(created_at) INTO v_cooldown_check
        FROM mini_game_sessions s
        JOIN mini_game_participants p ON p.session_id = s.id
        WHERE p.user_id = p_user_id
          AND s.game_type_id = v_game_type.id
          AND s.status IN ('completed', 'in_progress');

        IF v_cooldown_check IS NOT NULL AND
           v_cooldown_check > NOW() - (v_game_type.cooldown_minutes || ' minutes')::INTERVAL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Cooldown actif',
                'retry_after', EXTRACT(EPOCH FROM (v_cooldown_check + (v_game_type.cooldown_minutes || ' minutes')::INTERVAL - NOW()))
            );
        END IF;
    END IF;

    -- Créer la session
    INSERT INTO mini_game_sessions (game_type_id, host_user_id, settings, status)
    VALUES (v_game_type.id, p_user_id, p_settings, 'waiting')
    RETURNING id INTO v_session_id;

    -- Ajouter l'hôte comme participant
    INSERT INTO mini_game_participants (session_id, user_id)
    VALUES (v_session_id, p_user_id);

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'game_type', row_to_json(v_game_type)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rejoindre une session
CREATE OR REPLACE FUNCTION join_game_session(
    p_user_id UUID,
    p_session_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
    v_participant_count INTEGER;
    v_game_type RECORD;
BEGIN
    -- Récupérer la session
    SELECT s.*, gt.max_players, gt.name as game_name
    INTO v_session
    FROM mini_game_sessions s
    JOIN mini_game_types gt ON gt.id = s.game_type_id
    WHERE s.id = p_session_id;

    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session non trouvée');
    END IF;

    IF v_session.status != 'waiting' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session déjà commencée ou terminée');
    END IF;

    -- Compter les participants
    SELECT COUNT(*) INTO v_participant_count
    FROM mini_game_participants
    WHERE session_id = p_session_id;

    IF v_participant_count >= v_session.max_players THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session complète');
    END IF;

    -- Ajouter le participant
    INSERT INTO mini_game_participants (session_id, user_id)
    VALUES (p_session_id, p_user_id)
    ON CONFLICT (session_id, user_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'participant_count', v_participant_count + 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Démarrer une session
CREATE OR REPLACE FUNCTION start_game_session(
    p_user_id UUID,
    p_session_id UUID,
    p_game_data JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
BEGIN
    SELECT * INTO v_session
    FROM mini_game_sessions
    WHERE id = p_session_id AND host_user_id = p_user_id;

    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session non trouvée ou non autorisé');
    END IF;

    IF v_session.status != 'waiting' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session déjà démarrée');
    END IF;

    UPDATE mini_game_sessions
    SET status = 'in_progress',
        started_at = NOW(),
        game_data = p_game_data
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'session_id', p_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Soumettre un score
CREATE OR REPLACE FUNCTION submit_game_score(
    p_user_id UUID,
    p_session_id UUID,
    p_score INTEGER,
    p_game_state JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
    v_game_type RECORD;
    v_xp_earned INTEGER;
    v_rank INTEGER;
BEGIN
    -- Récupérer la session et le type de jeu
    SELECT s.*, gt.base_xp, gt.slug as game_slug
    INTO v_session
    FROM mini_game_sessions s
    JOIN mini_game_types gt ON gt.id = s.game_type_id
    WHERE s.id = p_session_id;

    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session non trouvée');
    END IF;

    -- Calculer les XP (base + bonus score)
    v_xp_earned := v_session.base_xp + LEAST(p_score / 10, 50);

    -- Mettre à jour le participant
    UPDATE mini_game_participants
    SET score = p_score,
        game_state = p_game_state,
        xp_earned = v_xp_earned,
        finished_at = NOW()
    WHERE session_id = p_session_id AND user_id = p_user_id;

    -- Mettre à jour le score quotidien
    INSERT INTO daily_game_scores (user_id, game_type_id, score_date, best_score, games_played, total_xp_earned)
    VALUES (p_user_id, v_session.game_type_id, CURRENT_DATE, p_score, 1, v_xp_earned)
    ON CONFLICT (user_id, game_type_id, score_date)
    DO UPDATE SET
        best_score = GREATEST(daily_game_scores.best_score, p_score),
        games_played = daily_game_scores.games_played + 1,
        total_xp_earned = daily_game_scores.total_xp_earned + v_xp_earned,
        updated_at = NOW();

    -- Mettre à jour le leaderboard hebdomadaire
    INSERT INTO weekly_game_leaderboard (user_id, game_type_id, week_start, total_score, games_played, best_score)
    VALUES (p_user_id, v_session.game_type_id, date_trunc('week', CURRENT_DATE)::DATE, p_score, 1, p_score)
    ON CONFLICT (user_id, game_type_id, week_start)
    DO UPDATE SET
        total_score = weekly_game_leaderboard.total_score + p_score,
        games_played = weekly_game_leaderboard.games_played + 1,
        best_score = GREATEST(weekly_game_leaderboard.best_score, p_score),
        updated_at = NOW();

    -- Ajouter les XP au profil
    UPDATE user_profiles
    SET xp = xp + v_xp_earned,
        total_xp = total_xp + v_xp_earned
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'score', p_score,
        'xp_earned', v_xp_earned
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Terminer une session et déterminer le gagnant
CREATE OR REPLACE FUNCTION end_game_session(
    p_session_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_winner RECORD;
    v_participants JSONB;
BEGIN
    -- Trouver le gagnant
    SELECT user_id, score INTO v_winner
    FROM mini_game_participants
    WHERE session_id = p_session_id
    ORDER BY score DESC
    LIMIT 1;

    -- Mettre à jour les rangs
    WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) as rank
        FROM mini_game_participants
        WHERE session_id = p_session_id
    )
    UPDATE mini_game_participants p
    SET rank = r.rank
    FROM ranked r
    WHERE p.id = r.id;

    -- Mettre à jour la session
    UPDATE mini_game_sessions
    SET status = 'completed',
        ended_at = NOW(),
        winner_user_id = v_winner.user_id
    WHERE id = p_session_id;

    -- Récupérer les résultats
    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', p.user_id,
            'pseudo', up.pseudo,
            'avatar_url', up.avatar_url,
            'score', p.score,
            'rank', p.rank,
            'xp_earned', p.xp_earned
        ) ORDER BY p.rank
    )
    INTO v_participants
    FROM mini_game_participants p
    JOIN user_profiles up ON up.id = p.user_id
    WHERE p.session_id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'winner_id', v_winner.user_id,
        'winner_score', v_winner.score,
        'results', v_participants
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Faire une prédiction
CREATE OR REPLACE FUNCTION make_prediction(
    p_user_id UUID,
    p_question_id UUID,
    p_option_index INTEGER,
    p_confidence INTEGER DEFAULT 50
) RETURNS JSONB AS $$
DECLARE
    v_question RECORD;
    v_prediction_count INTEGER;
    v_is_bonus BOOLEAN := false;
BEGIN
    -- Récupérer la question
    SELECT * INTO v_question
    FROM prediction_questions
    WHERE id = p_question_id;

    IF v_question IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Question non trouvée');
    END IF;

    IF v_question.status != 'open' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Les prédictions sont fermées');
    END IF;

    -- Vérifier si éligible au bonus
    SELECT COUNT(*) INTO v_prediction_count
    FROM user_predictions
    WHERE prediction_question_id = p_question_id;

    IF v_prediction_count < v_question.max_bonus_slots THEN
        v_is_bonus := true;
    END IF;

    -- Enregistrer la prédiction
    INSERT INTO user_predictions (user_id, prediction_question_id, selected_option_index, confidence, bonus_earned)
    VALUES (p_user_id, p_question_id, p_option_index, p_confidence, v_is_bonus)
    ON CONFLICT (user_id, prediction_question_id)
    DO UPDATE SET
        selected_option_index = p_option_index,
        confidence = p_confidence,
        prediction_time = NOW();

    -- Incrémenter le compteur
    UPDATE prediction_questions
    SET total_predictions = total_predictions + 1
    WHERE id = p_question_id;

    RETURN jsonb_build_object(
        'success', true,
        'bonus_earned', v_is_bonus,
        'prediction_rank', v_prediction_count + 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Résoudre une prédiction
CREATE OR REPLACE FUNCTION resolve_prediction(
    p_question_id UUID,
    p_correct_option_index INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_question RECORD;
    v_updated_count INTEGER := 0;
BEGIN
    -- Récupérer la question
    SELECT * INTO v_question
    FROM prediction_questions
    WHERE id = p_question_id;

    IF v_question IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Question non trouvée');
    END IF;

    -- Marquer la bonne réponse
    UPDATE prediction_questions
    SET correct_option_index = p_correct_option_index,
        status = 'resolved',
        resolution_time = NOW()
    WHERE id = p_question_id;

    -- Mettre à jour les prédictions
    UPDATE user_predictions up
    SET is_correct = (selected_option_index = p_correct_option_index),
        points_earned = CASE
            WHEN selected_option_index = p_correct_option_index THEN
                ROUND(v_question.points_for_correct * (confidence::NUMERIC / 100)) +
                CASE WHEN bonus_earned THEN v_question.bonus_points ELSE 0 END
            ELSE 0
        END
    WHERE prediction_question_id = p_question_id;

    -- Ajouter les XP aux gagnants
    UPDATE user_profiles up
    SET xp = xp + pred.points_earned,
        total_xp = total_xp + pred.points_earned
    FROM user_predictions pred
    WHERE pred.user_id = up.id
      AND pred.prediction_question_id = p_question_id
      AND pred.is_correct = true;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'correct_option', p_correct_option_index,
        'winners_count', v_updated_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtenir les questions de quiz aléatoires
CREATE OR REPLACE FUNCTION get_random_quiz_questions(
    p_count INTEGER DEFAULT 5,
    p_difficulty VARCHAR DEFAULT NULL,
    p_genre VARCHAR DEFAULT NULL
) RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(q)
        FROM (
            SELECT id, song_title, artist, genre, difficulty, question_type, options, points, hint
            FROM music_quiz_questions
            WHERE is_active = true
              AND (p_difficulty IS NULL OR difficulty = p_difficulty)
              AND (p_genre IS NULL OR genre = p_genre)
            ORDER BY RANDOM()
            LIMIT p_count
        ) q
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtenir le leaderboard d'un jeu
CREATE OR REPLACE FUNCTION get_game_leaderboard(
    p_game_type_slug VARCHAR,
    p_period VARCHAR DEFAULT 'weekly', -- 'daily', 'weekly', 'all_time'
    p_limit INTEGER DEFAULT 20
) RETURNS JSONB AS $$
DECLARE
    v_game_type_id UUID;
BEGIN
    SELECT id INTO v_game_type_id FROM mini_game_types WHERE slug = p_game_type_slug;

    IF p_period = 'daily' THEN
        RETURN (
            SELECT jsonb_agg(r)
            FROM (
                SELECT
                    ROW_NUMBER() OVER (ORDER BY best_score DESC) as rank,
                    d.user_id,
                    up.pseudo,
                    up.avatar_url,
                    d.best_score as score,
                    d.games_played,
                    d.total_xp_earned
                FROM daily_game_scores d
                JOIN user_profiles up ON up.id = d.user_id
                WHERE d.game_type_id = v_game_type_id
                  AND d.score_date = CURRENT_DATE
                ORDER BY d.best_score DESC
                LIMIT p_limit
            ) r
        );
    ELSIF p_period = 'weekly' THEN
        RETURN (
            SELECT jsonb_agg(r)
            FROM (
                SELECT
                    ROW_NUMBER() OVER (ORDER BY total_score DESC) as rank,
                    w.user_id,
                    up.pseudo,
                    up.avatar_url,
                    w.total_score as score,
                    w.games_played,
                    w.best_score
                FROM weekly_game_leaderboard w
                JOIN user_profiles up ON up.id = w.user_id
                WHERE w.game_type_id = v_game_type_id
                  AND w.week_start = date_trunc('week', CURRENT_DATE)::DATE
                ORDER BY w.total_score DESC
                LIMIT p_limit
            ) r
        );
    ELSE
        RETURN (
            SELECT jsonb_agg(r)
            FROM (
                SELECT
                    ROW_NUMBER() OVER (ORDER BY SUM(total_score) DESC) as rank,
                    w.user_id,
                    up.pseudo,
                    up.avatar_url,
                    SUM(w.total_score) as score,
                    SUM(w.games_played) as games_played,
                    MAX(w.best_score) as best_score
                FROM weekly_game_leaderboard w
                JOIN user_profiles up ON up.id = w.user_id
                WHERE w.game_type_id = v_game_type_id
                GROUP BY w.user_id, up.pseudo, up.avatar_url
                ORDER BY SUM(w.total_score) DESC
                LIMIT p_limit
            ) r
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE mini_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_game_leaderboard ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view game sessions"
    ON mini_game_sessions FOR SELECT USING (true);

CREATE POLICY "Users can create sessions"
    ON mini_game_sessions FOR INSERT
    WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their sessions"
    ON mini_game_sessions FOR UPDATE
    USING (auth.uid() = host_user_id);

CREATE POLICY "Anyone can view participants"
    ON mini_game_participants FOR SELECT USING (true);

CREATE POLICY "Users can join sessions"
    ON mini_game_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
    ON mini_game_participants FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own predictions"
    ON user_predictions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can make predictions"
    ON user_predictions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own predictions"
    ON user_predictions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view daily scores"
    ON daily_game_scores FOR SELECT USING (true);

CREATE POLICY "Anyone can view weekly leaderboard"
    ON weekly_game_leaderboard FOR SELECT USING (true);

-- Public data
CREATE POLICY "Anyone can view game types"
    ON mini_game_types FOR SELECT USING (true);

CREATE POLICY "Anyone can view quiz questions"
    ON music_quiz_questions FOR SELECT USING (true);

CREATE POLICY "Anyone can view memory cards"
    ON memory_game_cards FOR SELECT USING (true);

CREATE POLICY "Anyone can view prediction questions"
    ON prediction_questions FOR SELECT USING (true);
