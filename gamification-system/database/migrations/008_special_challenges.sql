-- ============================================================================
-- TEENS PARTY MOROCCO - Special Challenges Migration
-- ============================================================================
-- Description: Défis spéciaux (photo, quiz, géolocalisation, flash)
-- Version: 008
-- ============================================================================

-- ============================================================================
-- TABLE: special_challenge_types
-- ============================================================================
-- Types de défis spéciaux disponibles

CREATE TABLE IF NOT EXISTS special_challenge_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informations de base
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#06b6d4',

    -- Type de défi
    challenge_category VARCHAR(30) NOT NULL CHECK (challenge_category IN (
        'photo', 'quiz', 'geolocation', 'flash', 'social', 'creative'
    )),

    -- Configuration
    duration_minutes INTEGER DEFAULT 60, -- Durée par défaut
    max_participants INTEGER DEFAULT 100,
    min_level_required INTEGER DEFAULT 1,

    -- Récompenses
    base_xp_reward INTEGER DEFAULT 100,
    winner_bonus_xp INTEGER DEFAULT 200,
    participation_xp INTEGER DEFAULT 25,

    -- Validation
    requires_validation BOOLEAN DEFAULT false, -- Validation manuelle requise
    auto_validate BOOLEAN DEFAULT true, -- Validation automatique

    -- Statut
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_special_challenge_types_category
    ON special_challenge_types(challenge_category);
CREATE INDEX IF NOT EXISTS idx_special_challenge_types_active
    ON special_challenge_types(is_active) WHERE is_active = true;

-- ============================================================================
-- TABLE: special_challenges
-- ============================================================================
-- Instances de défis spéciaux

CREATE TABLE IF NOT EXISTS special_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_type_id UUID NOT NULL REFERENCES special_challenge_types(id) ON DELETE CASCADE,

    -- Informations
    title VARCHAR(200) NOT NULL,
    description TEXT,
    instructions TEXT, -- Instructions détaillées

    -- Configuration spécifique
    config JSONB DEFAULT '{}', -- Configuration selon le type (questions quiz, coordonnées GPS, etc.)

    -- Timing
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_flash BOOLEAN DEFAULT false, -- Défi flash (notification push)

    -- Lien avec événement (optionnel)
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,

    -- Statut
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'active', 'voting', 'completed', 'cancelled'
    )),

    -- Résultats
    winner_id UUID REFERENCES profiles(id),
    total_participants INTEGER DEFAULT 0,

    -- Créateur
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_special_challenges_type ON special_challenges(challenge_type_id);
CREATE INDEX IF NOT EXISTS idx_special_challenges_status ON special_challenges(status);
CREATE INDEX IF NOT EXISTS idx_special_challenges_starts ON special_challenges(starts_at);
CREATE INDEX IF NOT EXISTS idx_special_challenges_event ON special_challenges(event_id);

-- ============================================================================
-- TABLE: special_challenge_submissions
-- ============================================================================
-- Soumissions des participants

CREATE TABLE IF NOT EXISTS special_challenge_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES special_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Contenu de la soumission
    submission_type VARCHAR(30) NOT NULL, -- photo, answer, location, text
    content JSONB NOT NULL, -- Contenu selon le type

    -- Pour les photos
    image_url TEXT,
    thumbnail_url TEXT,

    -- Pour les quiz
    answers JSONB, -- Réponses aux questions
    score INTEGER DEFAULT 0, -- Score obtenu

    -- Pour la géolocalisation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy_meters DECIMAL(8, 2),

    -- Validation
    is_validated BOOLEAN DEFAULT false,
    validated_at TIMESTAMPTZ,
    validated_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,

    -- Votes (pour les défis photo/créatifs)
    vote_count INTEGER DEFAULT 0,

    -- Timing
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    time_taken_seconds INTEGER, -- Temps de réponse (pour quiz)

    -- XP attribué
    xp_awarded INTEGER DEFAULT 0,

    UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge ON special_challenge_submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_user ON special_challenge_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_votes ON special_challenge_submissions(vote_count DESC);

-- ============================================================================
-- TABLE: challenge_votes
-- ============================================================================
-- Votes des utilisateurs sur les soumissions

CREATE TABLE IF NOT EXISTS challenge_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES special_challenge_submissions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    vote_value INTEGER DEFAULT 1 CHECK (vote_value IN (-1, 1)), -- -1 ou +1

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(submission_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_votes_submission ON challenge_votes(submission_id);

-- ============================================================================
-- TABLE: quiz_questions
-- ============================================================================
-- Questions pour les défis quiz

CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Catégorie
    category VARCHAR(50) NOT NULL, -- music, culture, events, general, party
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),

    -- Question
    question TEXT NOT NULL,
    question_type VARCHAR(30) DEFAULT 'multiple_choice' CHECK (question_type IN (
        'multiple_choice', 'true_false', 'image_choice', 'audio_choice'
    )),

    -- Réponses
    options JSONB NOT NULL, -- [{text: "...", is_correct: bool, image_url?: "..."}]
    correct_answer_index INTEGER NOT NULL,

    -- Médias
    image_url TEXT,
    audio_url TEXT,

    -- Points
    points INTEGER DEFAULT 10,
    time_limit_seconds INTEGER DEFAULT 30,

    -- Métadonnées
    is_active BOOLEAN DEFAULT true,
    times_shown INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_category ON quiz_questions(category);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_difficulty ON quiz_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_active ON quiz_questions(is_active) WHERE is_active = true;

-- ============================================================================
-- TABLE: geolocation_zones
-- ============================================================================
-- Zones géographiques pour les défis de géolocalisation

CREATE TABLE IF NOT EXISTS geolocation_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informations
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Coordonnées du centre
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,

    -- Rayon en mètres
    radius_meters INTEGER DEFAULT 100,

    -- Type de zone
    zone_type VARCHAR(30) DEFAULT 'checkpoint' CHECK (zone_type IN (
        'checkpoint', 'venue', 'area', 'secret'
    )),

    -- Lien avec événement/lieu
    event_id UUID REFERENCES events(id),
    venue_id UUID,

    -- XP pour la découverte
    discovery_xp INTEGER DEFAULT 50,

    -- Statut
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geolocation_zones_coords
    ON geolocation_zones(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_geolocation_zones_event
    ON geolocation_zones(event_id);

-- ============================================================================
-- SEED: Special Challenge Types
-- ============================================================================

INSERT INTO special_challenge_types (
    slug, name, description, icon, color, challenge_category,
    duration_minutes, base_xp_reward, winner_bonus_xp, participation_xp,
    requires_validation
) VALUES
-- Photo Challenges
('best-outfit', 'Meilleur Outfit', 'Montre ton plus beau look de la soirée', 'shirt', '#ec4899', 'photo',
 120, 150, 300, 30, false),
('party-moment', 'Moment Party', 'Capture le meilleur moment de la soirée', 'camera', '#f97316', 'photo',
 180, 150, 300, 30, false),
('selfie-crew', 'Selfie Crew', 'Selfie avec le plus d''amis possible', 'users', '#8b5cf6', 'photo',
 90, 100, 200, 25, false),
('creative-shot', 'Shot Créatif', 'Photo la plus créative/artistique', 'sparkles', '#06b6d4', 'photo',
 120, 200, 400, 40, false),

-- Quiz Challenges
('music-quiz', 'Quiz Musical', 'Teste tes connaissances musicales', 'music', '#22c55e', 'quiz',
 15, 100, 250, 20, false),
('party-trivia', 'Party Trivia', 'Questions sur la culture party', 'help-circle', '#eab308', 'quiz',
 10, 100, 250, 20, false),
('speed-quiz', 'Speed Quiz', 'Réponds le plus vite possible', 'zap', '#ef4444', 'quiz',
 5, 150, 300, 25, false),

-- Geolocation Challenges
('treasure-hunt', 'Chasse au Trésor', 'Trouve tous les checkpoints', 'map-pin', '#3b82f6', 'geolocation',
 60, 200, 500, 50, false),
('secret-spot', 'Spot Secret', 'Découvre le lieu mystère', 'map', '#a855f7', 'geolocation',
 30, 150, 300, 40, false),
('venue-explorer', 'Explorateur', 'Visite toutes les zones du lieu', 'compass', '#14b8a6', 'geolocation',
 45, 100, 200, 30, false),

-- Flash Challenges
('flash-dance', 'Flash Dance', 'Défi dance de 5 minutes', 'music-2', '#f43f5e', 'flash',
 5, 100, 200, 30, false),
('flash-photo', 'Flash Photo', 'Photo thématique en 3 minutes', 'camera-off', '#fb923c', 'flash',
 3, 100, 200, 30, false),
('flash-quiz', 'Flash Quiz', 'Quiz éclair de 2 minutes', 'brain', '#84cc16', 'flash',
 2, 100, 200, 30, false),

-- Social Challenges
('new-friends', 'Nouveaux Amis', 'Fais-toi 3 nouveaux amis ce soir', 'user-plus', '#06b6d4', 'social',
 240, 150, 300, 50, true),
('conversation-starter', 'Ice Breaker', 'Lance une conversation avec un inconnu', 'message-circle', '#8b5cf6', 'social',
 60, 100, 200, 30, true),

-- Creative Challenges
('best-story', 'Best Story', 'Story la plus créative de l''event', 'film', '#ec4899', 'creative',
 180, 150, 350, 40, false),
('meme-master', 'Meme Master', 'Crée le meilleur meme de la soirée', 'smile', '#fbbf24', 'creative',
 120, 150, 300, 35, false)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEED: Quiz Questions (Sample)
-- ============================================================================

INSERT INTO quiz_questions (category, difficulty, question, question_type, options, correct_answer_index, points, time_limit_seconds) VALUES
-- Music Questions
('music', 'easy', 'Qui chante "Blinding Lights" ?', 'multiple_choice',
 '[{"text": "The Weeknd", "is_correct": true}, {"text": "Drake", "is_correct": false}, {"text": "Post Malone", "is_correct": false}, {"text": "Ed Sheeran", "is_correct": false}]',
 0, 10, 20),
('music', 'medium', 'En quelle année est sorti "Get Lucky" de Daft Punk ?', 'multiple_choice',
 '[{"text": "2011", "is_correct": false}, {"text": "2013", "is_correct": true}, {"text": "2015", "is_correct": false}, {"text": "2017", "is_correct": false}]',
 1, 15, 25),
('music', 'hard', 'Quel DJ a produit "Titanium" avec Sia ?', 'multiple_choice',
 '[{"text": "Calvin Harris", "is_correct": false}, {"text": "Avicii", "is_correct": false}, {"text": "David Guetta", "is_correct": true}, {"text": "Martin Garrix", "is_correct": false}]',
 2, 20, 30),

-- Culture Questions
('culture', 'easy', 'Quelle est la capitale du Maroc ?', 'multiple_choice',
 '[{"text": "Casablanca", "is_correct": false}, {"text": "Rabat", "is_correct": true}, {"text": "Marrakech", "is_correct": false}, {"text": "Fès", "is_correct": false}]',
 1, 10, 20),
('culture', 'medium', 'Quel plat marocain est traditionnellement servi le vendredi ?', 'multiple_choice',
 '[{"text": "Tajine", "is_correct": false}, {"text": "Couscous", "is_correct": true}, {"text": "Pastilla", "is_correct": false}, {"text": "Harira", "is_correct": false}]',
 1, 15, 25),

-- Party Questions
('party', 'easy', 'Que signifie "DJ" ?', 'multiple_choice',
 '[{"text": "Disc Jockey", "is_correct": true}, {"text": "Dance Jammer", "is_correct": false}, {"text": "Digital Jukebox", "is_correct": false}, {"text": "Disco Jumper", "is_correct": false}]',
 0, 10, 20),
('party', 'medium', 'Quel est le nom du mouvement de danse qui consiste à bouger les épaules ?', 'multiple_choice',
 '[{"text": "Floss", "is_correct": false}, {"text": "Dab", "is_correct": false}, {"text": "Woah", "is_correct": false}, {"text": "Shoulder Roll", "is_correct": true}]',
 3, 15, 25)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCTION: create_special_challenge
-- ============================================================================

CREATE OR REPLACE FUNCTION create_special_challenge(
    p_type_slug VARCHAR(50),
    p_title VARCHAR(200),
    p_description TEXT,
    p_instructions TEXT,
    p_starts_at TIMESTAMPTZ,
    p_ends_at TIMESTAMPTZ,
    p_is_flash BOOLEAN DEFAULT false,
    p_event_id UUID DEFAULT NULL,
    p_config JSONB DEFAULT '{}',
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_type RECORD;
    v_challenge_id UUID;
BEGIN
    -- Récupérer le type
    SELECT * INTO v_type FROM special_challenge_types WHERE slug = p_type_slug AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Type de défi introuvable');
    END IF;

    -- Valider les dates
    IF p_starts_at >= p_ends_at THEN
        RETURN jsonb_build_object('success', false, 'error', 'La date de fin doit être après la date de début');
    END IF;

    -- Créer le défi
    INSERT INTO special_challenges (
        challenge_type_id, title, description, instructions,
        starts_at, ends_at, is_flash, event_id, config,
        status, created_by
    ) VALUES (
        v_type.id, p_title, p_description, p_instructions,
        p_starts_at, p_ends_at, p_is_flash, p_event_id, p_config,
        CASE WHEN p_starts_at <= NOW() THEN 'active' ELSE 'scheduled' END,
        p_created_by
    ) RETURNING id INTO v_challenge_id;

    RETURN jsonb_build_object(
        'success', true,
        'challenge_id', v_challenge_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: submit_challenge_entry
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_challenge_entry(
    p_challenge_id UUID,
    p_user_id UUID,
    p_submission_type VARCHAR(30),
    p_content JSONB,
    p_image_url TEXT DEFAULT NULL,
    p_answers JSONB DEFAULT NULL,
    p_latitude DECIMAL(10, 8) DEFAULT NULL,
    p_longitude DECIMAL(11, 8) DEFAULT NULL,
    p_time_taken INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_challenge RECORD;
    v_type RECORD;
    v_submission_id UUID;
    v_score INTEGER := 0;
    v_xp INTEGER := 0;
BEGIN
    -- Vérifier le défi
    SELECT sc.*, sct.challenge_category, sct.base_xp_reward, sct.participation_xp
    INTO v_challenge
    FROM special_challenges sc
    JOIN special_challenge_types sct ON sc.challenge_type_id = sct.id
    WHERE sc.id = p_challenge_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi introuvable');
    END IF;

    -- Vérifier que le défi est actif
    IF v_challenge.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ce défi n''est pas actif');
    END IF;

    -- Vérifier si l'utilisateur a déjà participé
    IF EXISTS (SELECT 1 FROM special_challenge_submissions WHERE challenge_id = p_challenge_id AND user_id = p_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu as déjà participé à ce défi');
    END IF;

    -- Calculer le score pour les quiz
    IF v_challenge.challenge_category = 'quiz' AND p_answers IS NOT NULL THEN
        SELECT COALESCE(SUM(
            CASE WHEN q.correct_answer_index = (a->>'answer_index')::INTEGER THEN q.points ELSE 0 END
        ), 0)
        INTO v_score
        FROM jsonb_array_elements(p_answers) AS a
        JOIN quiz_questions q ON q.id = (a->>'question_id')::UUID;

        v_xp := v_challenge.participation_xp + (v_score / 10);
    ELSE
        v_xp := v_challenge.participation_xp;
    END IF;

    -- Créer la soumission
    INSERT INTO special_challenge_submissions (
        challenge_id, user_id, submission_type, content,
        image_url, answers, score, latitude, longitude,
        time_taken_seconds, xp_awarded, is_validated
    ) VALUES (
        p_challenge_id, p_user_id, p_submission_type, p_content,
        p_image_url, p_answers, v_score, p_latitude, p_longitude,
        p_time_taken, v_xp,
        CASE WHEN v_challenge.challenge_category IN ('quiz', 'geolocation') THEN true ELSE false END
    ) RETURNING id INTO v_submission_id;

    -- Mettre à jour le compteur de participants
    UPDATE special_challenges
    SET total_participants = total_participants + 1
    WHERE id = p_challenge_id;

    -- Attribuer l'XP
    UPDATE profiles
    SET total_xp = total_xp + v_xp
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'submission_id', v_submission_id,
        'score', v_score,
        'xp_awarded', v_xp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: vote_on_submission
-- ============================================================================

CREATE OR REPLACE FUNCTION vote_on_submission(
    p_submission_id UUID,
    p_user_id UUID,
    p_vote INTEGER -- 1 ou -1
)
RETURNS JSONB AS $$
DECLARE
    v_submission RECORD;
    v_existing_vote INTEGER;
BEGIN
    -- Vérifier la soumission
    SELECT * INTO v_submission FROM special_challenge_submissions WHERE id = p_submission_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Soumission introuvable');
    END IF;

    -- On ne peut pas voter pour soi-même
    IF v_submission.user_id = p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu ne peux pas voter pour toi-même');
    END IF;

    -- Vérifier si déjà voté
    SELECT vote_value INTO v_existing_vote
    FROM challenge_votes
    WHERE submission_id = p_submission_id AND user_id = p_user_id;

    IF v_existing_vote IS NOT NULL THEN
        IF v_existing_vote = p_vote THEN
            -- Retirer le vote
            DELETE FROM challenge_votes WHERE submission_id = p_submission_id AND user_id = p_user_id;
            UPDATE special_challenge_submissions
            SET vote_count = vote_count - p_vote
            WHERE id = p_submission_id;
        ELSE
            -- Changer le vote
            UPDATE challenge_votes
            SET vote_value = p_vote
            WHERE submission_id = p_submission_id AND user_id = p_user_id;
            UPDATE special_challenge_submissions
            SET vote_count = vote_count + (p_vote * 2)
            WHERE id = p_submission_id;
        END IF;
    ELSE
        -- Nouveau vote
        INSERT INTO challenge_votes (submission_id, user_id, vote_value)
        VALUES (p_submission_id, p_user_id, p_vote);
        UPDATE special_challenge_submissions
        SET vote_count = vote_count + p_vote
        WHERE id = p_submission_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: complete_challenge
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_special_challenge(p_challenge_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_challenge RECORD;
    v_winner_id UUID;
    v_type RECORD;
BEGIN
    -- Récupérer le défi
    SELECT sc.*, sct.challenge_category, sct.winner_bonus_xp
    INTO v_challenge
    FROM special_challenges sc
    JOIN special_challenge_types sct ON sc.challenge_type_id = sct.id
    WHERE sc.id = p_challenge_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi introuvable');
    END IF;

    -- Déterminer le gagnant selon le type
    IF v_challenge.challenge_category IN ('photo', 'creative') THEN
        -- Le plus de votes
        SELECT user_id INTO v_winner_id
        FROM special_challenge_submissions
        WHERE challenge_id = p_challenge_id AND is_validated = true
        ORDER BY vote_count DESC, submitted_at ASC
        LIMIT 1;
    ELSIF v_challenge.challenge_category = 'quiz' THEN
        -- Meilleur score, puis temps le plus court
        SELECT user_id INTO v_winner_id
        FROM special_challenge_submissions
        WHERE challenge_id = p_challenge_id
        ORDER BY score DESC, time_taken_seconds ASC
        LIMIT 1;
    ELSIF v_challenge.challenge_category = 'geolocation' THEN
        -- Premier à valider
        SELECT user_id INTO v_winner_id
        FROM special_challenge_submissions
        WHERE challenge_id = p_challenge_id AND is_validated = true
        ORDER BY submitted_at ASC
        LIMIT 1;
    ELSE
        -- Premier soumis validé
        SELECT user_id INTO v_winner_id
        FROM special_challenge_submissions
        WHERE challenge_id = p_challenge_id AND is_validated = true
        ORDER BY submitted_at ASC
        LIMIT 1;
    END IF;

    -- Mettre à jour le défi
    UPDATE special_challenges
    SET status = 'completed', winner_id = v_winner_id
    WHERE id = p_challenge_id;

    -- Attribuer le bonus XP au gagnant
    IF v_winner_id IS NOT NULL THEN
        UPDATE profiles
        SET total_xp = total_xp + v_challenge.winner_bonus_xp
        WHERE id = v_winner_id;

        -- Marquer la soumission gagnante
        UPDATE special_challenge_submissions
        SET xp_awarded = xp_awarded + v_challenge.winner_bonus_xp
        WHERE challenge_id = p_challenge_id AND user_id = v_winner_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'winner_id', v_winner_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: get_active_special_challenges
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_special_challenges(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    challenge_id UUID,
    type_slug VARCHAR(50),
    type_name VARCHAR(100),
    category VARCHAR(30),
    icon VARCHAR(50),
    color VARCHAR(7),
    title VARCHAR(200),
    description TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    is_flash BOOLEAN,
    total_participants INTEGER,
    base_xp INTEGER,
    winner_xp INTEGER,
    has_participated BOOLEAN,
    time_remaining_seconds INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id as challenge_id,
        sct.slug as type_slug,
        sct.name as type_name,
        sct.challenge_category as category,
        sct.icon,
        sct.color,
        sc.title,
        sc.description,
        sc.starts_at,
        sc.ends_at,
        sc.is_flash,
        sc.total_participants,
        sct.base_xp_reward as base_xp,
        sct.winner_bonus_xp as winner_xp,
        CASE WHEN p_user_id IS NOT NULL THEN
            EXISTS (SELECT 1 FROM special_challenge_submissions WHERE challenge_id = sc.id AND user_id = p_user_id)
        ELSE false END as has_participated,
        EXTRACT(EPOCH FROM (sc.ends_at - NOW()))::INTEGER as time_remaining_seconds
    FROM special_challenges sc
    JOIN special_challenge_types sct ON sc.challenge_type_id = sct.id
    WHERE sc.status = 'active'
    AND sc.ends_at > NOW()
    ORDER BY sc.is_flash DESC, sc.ends_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_quiz_questions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_quiz_questions(
    p_count INTEGER DEFAULT 10,
    p_category VARCHAR(50) DEFAULT NULL,
    p_difficulty VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
    question_id UUID,
    category VARCHAR(50),
    difficulty VARCHAR(20),
    question TEXT,
    question_type VARCHAR(30),
    options JSONB,
    points INTEGER,
    time_limit INTEGER,
    image_url TEXT,
    audio_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        qq.id as question_id,
        qq.category,
        qq.difficulty,
        qq.question,
        qq.question_type,
        -- Mélanger les options et retirer is_correct
        (
            SELECT jsonb_agg(
                jsonb_build_object('text', opt->>'text', 'image_url', opt->>'image_url')
                ORDER BY random()
            )
            FROM jsonb_array_elements(qq.options) AS opt
        ) as options,
        qq.points,
        qq.time_limit_seconds as time_limit,
        qq.image_url,
        qq.audio_url
    FROM quiz_questions qq
    WHERE qq.is_active = true
    AND (p_category IS NULL OR qq.category = p_category)
    AND (p_difficulty IS NULL OR qq.difficulty = p_difficulty)
    ORDER BY random()
    LIMIT p_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE special_challenge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE geolocation_zones ENABLE ROW LEVEL SECURITY;

-- Types: Public read
CREATE POLICY "special_challenge_types_read" ON special_challenge_types
    FOR SELECT USING (true);

-- Challenges: Public read for active
CREATE POLICY "special_challenges_read" ON special_challenges
    FOR SELECT USING (status IN ('active', 'voting', 'completed'));

-- Submissions: User can see own, all can see in completed challenges
CREATE POLICY "submissions_own_read" ON special_challenge_submissions
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "submissions_public_read" ON special_challenge_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM special_challenges
            WHERE id = challenge_id AND status IN ('voting', 'completed')
        )
    );
CREATE POLICY "submissions_insert" ON special_challenge_submissions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Votes: User can manage own
CREATE POLICY "votes_manage" ON challenge_votes
    FOR ALL USING (user_id = auth.uid());
CREATE POLICY "votes_read" ON challenge_votes
    FOR SELECT USING (true);

-- Quiz: Public read
CREATE POLICY "quiz_questions_read" ON quiz_questions
    FOR SELECT USING (is_active = true);

-- Zones: Public read
CREATE POLICY "geolocation_zones_read" ON geolocation_zones
    FOR SELECT USING (is_active = true);

-- ============================================================================
-- CRON JOB: Auto-start and complete challenges
-- ============================================================================

-- Cette fonction devrait être appelée régulièrement (ex: toutes les minutes)
CREATE OR REPLACE FUNCTION process_special_challenges()
RETURNS void AS $$
BEGIN
    -- Activer les défis schedulés
    UPDATE special_challenges
    SET status = 'active'
    WHERE status = 'scheduled' AND starts_at <= NOW();

    -- Passer en voting les défis photo/créatifs terminés
    UPDATE special_challenges
    SET status = 'voting'
    WHERE status = 'active'
    AND ends_at <= NOW()
    AND challenge_type_id IN (
        SELECT id FROM special_challenge_types
        WHERE challenge_category IN ('photo', 'creative')
    );

    -- Terminer les autres défis
    UPDATE special_challenges
    SET status = 'completed'
    WHERE status = 'active'
    AND ends_at <= NOW()
    AND challenge_type_id NOT IN (
        SELECT id FROM special_challenge_types
        WHERE challenge_category IN ('photo', 'creative')
    );

    -- Terminer la période de vote (24h après la fin)
    -- et déterminer les gagnants
    PERFORM complete_special_challenge(id)
    FROM special_challenges
    WHERE status = 'voting'
    AND ends_at + INTERVAL '24 hours' <= NOW();
END;
$$ LANGUAGE plpgsql;
