-- ============================================================================
-- TEENS PARTY MOROCCO - Event Challenges Migration
-- ============================================================================
-- Description: Défis liés aux événements (check-in, stay late, reviewer)
-- Version: 009
-- ============================================================================

-- ============================================================================
-- TABLE: event_challenge_types
-- ============================================================================
-- Types de défis événementiels

CREATE TABLE IF NOT EXISTS event_challenge_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informations de base
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#ec4899',

    -- Catégorie de défi
    challenge_type VARCHAR(30) NOT NULL CHECK (challenge_type IN (
        'check_in',        -- Arriver à l'event
        'early_bird',      -- Arriver dans les premiers
        'stay_late',       -- Rester jusqu'à la fin
        'full_night',      -- Rester toute la soirée
        'reviewer',        -- Laisser un avis
        'photo_poster',    -- Poster une photo
        'social_share',    -- Partager sur les réseaux
        'vip_access',      -- Accéder à la zone VIP
        'dance_floor',     -- Temps sur la piste de danse
        'bar_regular',     -- Commander au bar
        'meet_staff',      -- Rencontrer le staff/DJ
        'comeback',        -- Revenir à un event
        'streak_event',    -- Enchaîner plusieurs events
        'group_check_in',  -- Check-in en groupe
        'refer_friend'     -- Amener un ami
    )),

    -- Configuration
    xp_reward INTEGER DEFAULT 50,
    bonus_xp INTEGER DEFAULT 0, -- XP bonus si conditions spéciales
    is_recurring BOOLEAN DEFAULT true, -- Peut être complété à chaque event

    -- Conditions
    condition_type VARCHAR(30), -- time, count, group, etc.
    condition_value INTEGER, -- Valeur de la condition

    -- Disponibilité
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_challenge_types_type ON event_challenge_types(challenge_type);
CREATE INDEX IF NOT EXISTS idx_event_challenge_types_active ON event_challenge_types(is_active);

-- ============================================================================
-- TABLE: event_challenges
-- ============================================================================
-- Défis associés à un événement spécifique

CREATE TABLE IF NOT EXISTS event_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL, -- La table events peut ne pas exister
    challenge_type_id UUID NOT NULL REFERENCES event_challenge_types(id) ON DELETE CASCADE,

    -- Personnalisation pour cet event
    custom_name VARCHAR(100),
    custom_description TEXT,
    custom_xp_reward INTEGER,

    -- Conditions spécifiques à l'event
    specific_conditions JSONB DEFAULT '{}',

    -- Timing
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,

    -- Limites
    max_completions INTEGER, -- Nombre max de participants qui peuvent compléter

    -- Stats
    completions_count INTEGER DEFAULT 0,

    -- Statut
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(event_id, challenge_type_id)
);

CREATE INDEX IF NOT EXISTS idx_event_challenges_event ON event_challenges(event_id);
CREATE INDEX IF NOT EXISTS idx_event_challenges_type ON event_challenges(challenge_type_id);
CREATE INDEX IF NOT EXISTS idx_event_challenges_active ON event_challenges(is_active);

-- ============================================================================
-- TABLE: user_event_challenge_progress
-- ============================================================================
-- Progression des utilisateurs sur les défis événementiels

CREATE TABLE IF NOT EXISTS user_event_challenge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
    event_challenge_id UUID NOT NULL REFERENCES event_challenges(id) ON DELETE CASCADE,

    -- Progression
    status VARCHAR(20) DEFAULT 'started' CHECK (status IN (
        'started', 'in_progress', 'completed', 'failed', 'expired'
    )),
    progress_value INTEGER DEFAULT 0,
    progress_data JSONB DEFAULT '{}', -- Données supplémentaires

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Récompenses
    xp_awarded INTEGER DEFAULT 0,

    UNIQUE(teen_id, event_challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_event_progress_teen ON user_event_challenge_progress(teen_id);
CREATE INDEX IF NOT EXISTS idx_user_event_progress_challenge ON user_event_challenge_progress(event_challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_event_progress_status ON user_event_challenge_progress(status);

-- ============================================================================
-- TABLE: event_check_ins
-- ============================================================================
-- Enregistrements des check-ins aux événements

CREATE TABLE IF NOT EXISTS event_check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL, -- La table events peut ne pas exister
    teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

    -- Timing
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    checked_out_at TIMESTAMPTZ,

    -- Localisation (optionnel)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Méthode de check-in
    check_in_method VARCHAR(30) DEFAULT 'manual' CHECK (check_in_method IN (
        'manual', 'qr_code', 'nfc', 'geolocation', 'staff_verified'
    )),

    -- Données supplémentaires
    device_info JSONB DEFAULT '{}',

    -- XP attribué
    xp_awarded INTEGER DEFAULT 0,

    UNIQUE(event_id, teen_id)
);

CREATE INDEX IF NOT EXISTS idx_event_check_ins_event ON event_check_ins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_check_ins_teen ON event_check_ins(teen_id);
CREATE INDEX IF NOT EXISTS idx_event_check_ins_time ON event_check_ins(checked_in_at);

-- ============================================================================
-- TABLE: event_reviews
-- ============================================================================
-- Avis laissés sur les événements

CREATE TABLE IF NOT EXISTS event_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL, -- La table events peut ne pas exister
    teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

    -- Évaluation
    overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    ambiance_rating INTEGER CHECK (ambiance_rating BETWEEN 1 AND 5),
    music_rating INTEGER CHECK (music_rating BETWEEN 1 AND 5),
    staff_rating INTEGER CHECK (staff_rating BETWEEN 1 AND 5),
    value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),

    -- Commentaire
    comment TEXT,
    pros TEXT[], -- Points positifs
    cons TEXT[], -- Points à améliorer

    -- Photos de l'avis
    photo_urls TEXT[],

    -- Modération
    is_verified BOOLEAN DEFAULT false, -- Vérifié via check-in
    is_visible BOOLEAN DEFAULT true,
    moderated_at TIMESTAMPTZ,

    -- Interactions
    helpful_count INTEGER DEFAULT 0,

    -- XP
    xp_awarded INTEGER DEFAULT 0,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(event_id, teen_id)
);

CREATE INDEX IF NOT EXISTS idx_event_reviews_event ON event_reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_teen ON event_reviews(teen_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_rating ON event_reviews(overall_rating);
CREATE INDEX IF NOT EXISTS idx_event_reviews_visible ON event_reviews(is_visible);

-- ============================================================================
-- SEED: Event Challenge Types
-- ============================================================================

INSERT INTO event_challenge_types (
    slug, name, description, icon, color, challenge_type,
    xp_reward, bonus_xp, condition_type, condition_value
) VALUES
-- Check-in Challenges
('check-in', 'Check-in', 'Arrive à l''event et fais ton check-in', 'map-pin', '#22c55e', 'check_in',
 50, 0, NULL, NULL),
('early-bird', 'Early Bird', 'Arrive dans les 30 premières minutes', 'sunrise', '#fbbf24', 'early_bird',
 75, 25, 'time', 30),
('first-50', 'Top 50', 'Sois parmi les 50 premiers arrivés', 'medal', '#f97316', 'early_bird',
 100, 50, 'count', 50),

-- Stay Challenges
('stay-late', 'Night Owl', 'Reste jusqu''à 3h du matin', 'moon', '#8b5cf6', 'stay_late',
 100, 0, 'time', 180), -- 3h en minutes après minuit
('full-night', 'Full Night', 'Reste toute la soirée (arrivée → fermeture)', 'star', '#ec4899', 'full_night',
 150, 50, NULL, NULL),
('last-standing', 'Last Standing', 'Sois parmi les 10 derniers à partir', 'trophy', '#ef4444', 'stay_late',
 125, 25, 'count', 10),

-- Social Challenges
('reviewer', 'Reviewer', 'Laisse un avis détaillé sur l''event', 'message-square', '#06b6d4', 'reviewer',
 75, 0, NULL, NULL),
('detailed-review', 'Critique Expert', 'Laisse un avis avec 3+ critères et commentaire', 'award', '#3b82f6', 'reviewer',
 125, 50, 'count', 3),
('photo-poster', 'Photo Star', 'Poste une photo de l''event', 'camera', '#ec4899', 'photo_poster',
 50, 0, NULL, NULL),
('social-share', 'Social Butterfly', 'Partage l''event sur les réseaux', 'share-2', '#1d9bf0', 'social_share',
 60, 0, NULL, NULL),

-- Experience Challenges
('vip-access', 'VIP Experience', 'Accède à la zone VIP', 'crown', '#fbbf24', 'vip_access',
 100, 0, NULL, NULL),
('dance-king', 'Dance King', 'Passe 1h sur la piste de danse', 'music-2', '#a855f7', 'dance_floor',
 75, 0, 'time', 60),
('bar-regular', 'Bar Regular', 'Commande 3 fois au bar', 'coffee', '#f97316', 'bar_regular',
 50, 0, 'count', 3),
('meet-dj', 'Meet the DJ', 'Rencontre le DJ ou un membre du staff', 'users', '#06b6d4', 'meet_staff',
 100, 0, NULL, NULL),

-- Loyalty Challenges
('comeback', 'Comeback Kid', 'Reviens à un event du même lieu', 'repeat', '#22c55e', 'comeback',
 75, 25, NULL, NULL),
('event-streak', 'Streak Master', 'Participe à 3 events d''affilée', 'flame', '#ef4444', 'streak_event',
 200, 100, 'count', 3),
('weekly-regular', 'Weekly Regular', 'Participe à un event chaque semaine pendant 1 mois', 'calendar', '#8b5cf6', 'streak_event',
 500, 200, 'count', 4),

-- Group Challenges
('group-check-in', 'Squad Goals', 'Check-in avec 3+ amis', 'users', '#ec4899', 'group_check_in',
 100, 0, 'count', 3),
('big-squad', 'Big Squad', 'Check-in avec 5+ amis', 'users', '#a855f7', 'group_check_in',
 150, 50, 'count', 5),
('refer-friend', 'Ambassadeur', 'Amène un ami qui n''a jamais participé', 'user-plus', '#22c55e', 'refer_friend',
 100, 0, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- FUNCTION: check_in_to_event
-- ============================================================================

CREATE OR REPLACE FUNCTION check_in_to_event(
    p_event_id UUID,
    p_teen_id UUID,
    p_method VARCHAR(30) DEFAULT 'manual',
    p_latitude DECIMAL(10, 8) DEFAULT NULL,
    p_longitude DECIMAL(11, 8) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_event RECORD;
    v_check_in_id UUID;
    v_xp_earned INTEGER := 0;
    v_challenges_completed JSONB := '[]';
    v_early_bird_count INTEGER;
    v_event_start TIMESTAMPTZ;
BEGIN
    -- Vérifier l'événement
    SELECT * INTO v_event FROM events WHERE id = p_event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Événement introuvable');
    END IF;

    -- Vérifier si déjà check-in
    IF EXISTS (SELECT 1 FROM event_check_ins WHERE event_id = p_event_id AND teen_id = p_teen_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu as déjà fait ton check-in');
    END IF;

    -- Créer le check-in
    INSERT INTO event_check_ins (event_id, teen_id, check_in_method, latitude, longitude)
    VALUES (p_event_id, p_teen_id, p_method, p_latitude, p_longitude)
    RETURNING id INTO v_check_in_id;

    -- XP de base pour le check-in
    v_xp_earned := 50;

    -- Vérifier les défis de check-in
    -- 1. Check-in basique
    PERFORM complete_event_challenge(p_event_id, p_teen_id, 'check-in');
    v_challenges_completed := v_challenges_completed || '["check-in"]'::jsonb;

    -- 2. Early bird (30 premières minutes)
    v_event_start := v_event.starts_at;
    IF NOW() <= v_event_start + INTERVAL '30 minutes' THEN
        PERFORM complete_event_challenge(p_event_id, p_teen_id, 'early-bird');
        v_challenges_completed := v_challenges_completed || '["early-bird"]'::jsonb;
        v_xp_earned := v_xp_earned + 25;
    END IF;

    -- 3. Top 50
    SELECT COUNT(*) INTO v_early_bird_count
    FROM event_check_ins WHERE event_id = p_event_id;

    IF v_early_bird_count <= 50 THEN
        PERFORM complete_event_challenge(p_event_id, p_teen_id, 'first-50');
        v_challenges_completed := v_challenges_completed || '["first-50"]'::jsonb;
        v_xp_earned := v_xp_earned + 50;
    END IF;

    -- Mettre à jour l'XP du check-in
    UPDATE event_check_ins SET xp_awarded = v_xp_earned WHERE id = v_check_in_id;

    -- Attribuer l'XP
    PERFORM add_xp_to_user(p_teen_id, v_xp_earned, 'event_challenge', 'event');

    RETURN jsonb_build_object(
        'success', true,
        'check_in_id', v_check_in_id,
        'xp_earned', v_xp_earned,
        'challenges_completed', v_challenges_completed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: check_out_from_event
-- ============================================================================

CREATE OR REPLACE FUNCTION check_out_from_event(
    p_event_id UUID,
    p_teen_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_check_in RECORD;
    v_event RECORD;
    v_xp_earned INTEGER := 0;
    v_challenges_completed JSONB := '[]';
    v_stay_duration INTERVAL;
    v_remaining_count INTEGER;
BEGIN
    -- Vérifier le check-in
    SELECT * INTO v_check_in
    FROM event_check_ins
    WHERE event_id = p_event_id AND teen_id = p_teen_id AND checked_out_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Check-in non trouvé ou déjà check-out');
    END IF;

    -- Récupérer l'event
    SELECT * INTO v_event FROM events WHERE id = p_event_id;

    -- Mettre à jour le check-out
    UPDATE event_check_ins
    SET checked_out_at = NOW()
    WHERE id = v_check_in.id;

    -- Calculer la durée de séjour
    v_stay_duration := NOW() - v_check_in.checked_in_at;

    -- Vérifier les défis de stay
    -- 1. Stay late (après 3h du matin)
    IF EXTRACT(HOUR FROM NOW()) >= 3 OR EXTRACT(HOUR FROM NOW()) < 6 THEN
        PERFORM complete_event_challenge(p_event_id, p_teen_id, 'stay-late');
        v_challenges_completed := v_challenges_completed || '["stay-late"]'::jsonb;
        v_xp_earned := v_xp_earned + 100;
    END IF;

    -- 2. Full night (si arrivé dans les 30 min du début et reste jusqu'à la fin)
    IF v_check_in.checked_in_at <= v_event.starts_at + INTERVAL '30 minutes'
       AND NOW() >= v_event.ends_at - INTERVAL '30 minutes' THEN
        PERFORM complete_event_challenge(p_event_id, p_teen_id, 'full-night');
        v_challenges_completed := v_challenges_completed || '["full-night"]'::jsonb;
        v_xp_earned := v_xp_earned + 150;
    END IF;

    -- 3. Last standing (parmi les 10 derniers)
    SELECT COUNT(*) INTO v_remaining_count
    FROM event_check_ins
    WHERE event_id = p_event_id AND checked_out_at IS NULL;

    IF v_remaining_count <= 10 THEN
        PERFORM complete_event_challenge(p_event_id, p_teen_id, 'last-standing');
        v_challenges_completed := v_challenges_completed || '["last-standing"]'::jsonb;
        v_xp_earned := v_xp_earned + 125;
    END IF;

    -- Attribuer l'XP bonus
    IF v_xp_earned > 0 THEN
        PERFORM add_xp_to_user(p_teen_id, v_xp_earned, 'event_challenge', 'event');
        UPDATE event_check_ins
        SET xp_awarded = xp_awarded + v_xp_earned
        WHERE id = v_check_in.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'stay_duration_minutes', EXTRACT(EPOCH FROM v_stay_duration) / 60,
        'xp_earned', v_xp_earned,
        'challenges_completed', v_challenges_completed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: complete_event_challenge
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_event_challenge(
    p_event_id UUID,
    p_teen_id UUID,
    p_challenge_slug VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_challenge_type RECORD;
    v_event_challenge RECORD;
    v_existing RECORD;
BEGIN
    -- Trouver le type de défi
    SELECT * INTO v_challenge_type FROM event_challenge_types WHERE slug = p_challenge_slug;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Trouver ou créer le défi pour cet event
    SELECT * INTO v_event_challenge
    FROM event_challenges
    WHERE event_id = p_event_id AND challenge_type_id = v_challenge_type.id;

    IF NOT FOUND THEN
        -- Créer le défi pour cet event
        INSERT INTO event_challenges (event_id, challenge_type_id)
        VALUES (p_event_id, v_challenge_type.id)
        RETURNING * INTO v_event_challenge;
    END IF;

    -- Vérifier si déjà complété
    SELECT * INTO v_existing
    FROM user_event_challenge_progress
    WHERE teen_id = p_teen_id AND event_challenge_id = v_event_challenge.id;

    IF v_existing IS NOT NULL AND v_existing.status = 'completed' THEN
        RETURN false; -- Déjà complété
    END IF;

    -- Créer ou mettre à jour la progression
    INSERT INTO user_event_challenge_progress (
        teen_id, event_challenge_id, status, completed_at, xp_awarded
    ) VALUES (
        p_teen_id, v_event_challenge.id, 'completed', NOW(),
        COALESCE(v_event_challenge.custom_xp_reward, v_challenge_type.xp_reward)
    )
    ON CONFLICT (teen_id, event_challenge_id)
    DO UPDATE SET
        status = 'completed',
        completed_at = NOW(),
        xp_awarded = COALESCE(v_event_challenge.custom_xp_reward, v_challenge_type.xp_reward);

    -- Mettre à jour le compteur
    UPDATE event_challenges
    SET completions_count = completions_count + 1
    WHERE id = v_event_challenge.id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: submit_event_review
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_event_review(
    p_event_id UUID,
    p_teen_id UUID,
    p_overall_rating INTEGER,
    p_ambiance_rating INTEGER DEFAULT NULL,
    p_music_rating INTEGER DEFAULT NULL,
    p_staff_rating INTEGER DEFAULT NULL,
    p_value_rating INTEGER DEFAULT NULL,
    p_comment TEXT DEFAULT NULL,
    p_pros TEXT[] DEFAULT NULL,
    p_cons TEXT[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_has_checked_in BOOLEAN;
    v_review_id UUID;
    v_xp_earned INTEGER := 75;
    v_challenges_completed JSONB := '[]';
    v_detail_count INTEGER := 0;
BEGIN
    -- Vérifier si l'utilisateur a participé à l'event
    SELECT EXISTS (SELECT 1 FROM event_check_ins WHERE event_id = p_event_id AND teen_id = p_teen_id)
    INTO v_has_checked_in;

    -- Vérifier s'il y a déjà un avis
    IF EXISTS (SELECT 1 FROM event_reviews WHERE event_id = p_event_id AND teen_id = p_teen_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu as déjà laissé un avis');
    END IF;

    -- Créer l'avis
    INSERT INTO event_reviews (
        event_id, teen_id, overall_rating, ambiance_rating, music_rating,
        staff_rating, value_rating, comment, pros, cons, is_verified, xp_awarded
    ) VALUES (
        p_event_id, p_teen_id, p_overall_rating, p_ambiance_rating, p_music_rating,
        p_staff_rating, p_value_rating, p_comment, p_pros, p_cons, v_has_checked_in, v_xp_earned
    ) RETURNING id INTO v_review_id;

    -- Compléter le défi reviewer
    PERFORM complete_event_challenge(p_event_id, p_teen_id, 'reviewer');
    v_challenges_completed := v_challenges_completed || '["reviewer"]'::jsonb;

    -- Vérifier si avis détaillé (3+ critères + commentaire)
    IF p_ambiance_rating IS NOT NULL THEN v_detail_count := v_detail_count + 1; END IF;
    IF p_music_rating IS NOT NULL THEN v_detail_count := v_detail_count + 1; END IF;
    IF p_staff_rating IS NOT NULL THEN v_detail_count := v_detail_count + 1; END IF;
    IF p_value_rating IS NOT NULL THEN v_detail_count := v_detail_count + 1; END IF;

    IF v_detail_count >= 3 AND p_comment IS NOT NULL AND LENGTH(p_comment) >= 20 THEN
        PERFORM complete_event_challenge(p_event_id, p_teen_id, 'detailed-review');
        v_challenges_completed := v_challenges_completed || '["detailed-review"]'::jsonb;
        v_xp_earned := v_xp_earned + 50;

        UPDATE event_reviews SET xp_awarded = v_xp_earned WHERE id = v_review_id;
    END IF;

    -- Attribuer l'XP
    PERFORM add_xp_to_user(p_teen_id, v_xp_earned, 'event_challenge', 'event');

    RETURN jsonb_build_object(
        'success', true,
        'review_id', v_review_id,
        'xp_earned', v_xp_earned,
        'is_verified', v_has_checked_in,
        'challenges_completed', v_challenges_completed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: get_event_challenges
-- ============================================================================

CREATE OR REPLACE FUNCTION get_event_challenges(
    p_event_id UUID,
    p_teen_id UUID DEFAULT NULL
)
RETURNS TABLE (
    challenge_id UUID,
    slug VARCHAR(50),
    name VARCHAR(100),
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    challenge_type VARCHAR(30),
    xp_reward INTEGER,
    completions_count INTEGER,
    user_status VARCHAR(20),
    user_completed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.id as challenge_id,
        ect.slug,
        COALESCE(ec.custom_name, ect.name) as name,
        COALESCE(ec.custom_description, ect.description) as description,
        ect.icon,
        ect.color,
        ect.challenge_type,
        COALESCE(ec.custom_xp_reward, ect.xp_reward) as xp_reward,
        ec.completions_count,
        COALESCE(uecp.status, 'not_started') as user_status,
        uecp.completed_at as user_completed_at
    FROM event_challenges ec
    JOIN event_challenge_types ect ON ec.challenge_type_id = ect.id
    LEFT JOIN user_event_challenge_progress uecp
        ON uecp.event_challenge_id = ec.id AND uecp.teen_id = p_teen_id
    WHERE ec.event_id = p_event_id AND ec.is_active = true
    ORDER BY ect.xp_reward DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_user_event_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_event_stats(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_events_attended', (
            SELECT COUNT(DISTINCT event_id) FROM event_check_ins WHERE teen_id = p_teen_id
        ),
        'total_reviews', (
            SELECT COUNT(*) FROM event_reviews WHERE teen_id = p_teen_id
        ),
        'average_rating_given', (
            SELECT ROUND(AVG(overall_rating), 1) FROM event_reviews WHERE teen_id = p_teen_id
        ),
        'challenges_completed', (
            SELECT COUNT(*) FROM user_event_challenge_progress
            WHERE teen_id = p_teen_id AND status = 'completed'
        ),
        'total_xp_from_events', (
            SELECT COALESCE(SUM(xp_awarded), 0) FROM event_check_ins WHERE teen_id = p_teen_id
        ) + (
            SELECT COALESCE(SUM(xp_awarded), 0) FROM event_reviews WHERE teen_id = p_teen_id
        ) + (
            SELECT COALESCE(SUM(xp_awarded), 0) FROM user_event_challenge_progress WHERE teen_id = p_teen_id
        ),
        'early_bird_count', (
            SELECT COUNT(*) FROM user_event_challenge_progress uecp
            JOIN event_challenges ec ON uecp.event_challenge_id = ec.id
            JOIN event_challenge_types ect ON ec.challenge_type_id = ect.id
            WHERE uecp.teen_id = p_teen_id AND ect.challenge_type = 'early_bird' AND uecp.status = 'completed'
        ),
        'stay_late_count', (
            SELECT COUNT(*) FROM user_event_challenge_progress uecp
            JOIN event_challenges ec ON uecp.event_challenge_id = ec.id
            JOIN event_challenge_types ect ON ec.challenge_type_id = ect.id
            WHERE uecp.teen_id = p_teen_id AND ect.challenge_type IN ('stay_late', 'full_night') AND uecp.status = 'completed'
        ),
        'current_event_streak', (
            SELECT COALESCE(streak_count, 0) FROM user_streaks WHERE teen_id = p_teen_id AND streak_type = 'events'
        )
    ) INTO v_stats;

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE event_challenge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "event_challenge_types_read" ON event_challenge_types;
DROP POLICY IF EXISTS "event_challenges_read" ON event_challenges;
DROP POLICY IF EXISTS "user_event_progress_own" ON user_event_challenge_progress;
DROP POLICY IF EXISTS "event_check_ins_own" ON event_check_ins;
DROP POLICY IF EXISTS "event_check_ins_read" ON event_check_ins;
DROP POLICY IF EXISTS "event_reviews_own" ON event_reviews;
DROP POLICY IF EXISTS "event_reviews_read" ON event_reviews;

-- Types: Public read
CREATE POLICY "event_challenge_types_read" ON event_challenge_types
    FOR SELECT USING (true);

-- Event challenges: Public read
CREATE POLICY "event_challenges_read" ON event_challenges
    FOR SELECT USING (true);

-- User progress: Own read/write (via teens.parent_id)
CREATE POLICY "user_event_progress_own" ON user_event_challenge_progress
    FOR ALL USING (
        EXISTS (SELECT 1 FROM teens WHERE id = user_event_challenge_progress.teen_id AND parent_id = auth.uid())
    );

-- Check-ins: Own manage, public read
CREATE POLICY "event_check_ins_own" ON event_check_ins
    FOR ALL USING (
        EXISTS (SELECT 1 FROM teens WHERE id = event_check_ins.teen_id AND parent_id = auth.uid())
    );
CREATE POLICY "event_check_ins_read" ON event_check_ins
    FOR SELECT USING (true);

-- Reviews: Own manage, public read visible
CREATE POLICY "event_reviews_own" ON event_reviews
    FOR ALL USING (
        EXISTS (SELECT 1 FROM teens WHERE id = event_reviews.teen_id AND parent_id = auth.uid())
    );
CREATE POLICY "event_reviews_read" ON event_reviews
    FOR SELECT USING (is_visible = true);
