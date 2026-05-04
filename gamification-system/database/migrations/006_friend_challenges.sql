-- ============================================================================
-- TEENS PARTY MOROCCO - Friend Challenges System
-- Migration: 006_friend_challenges.sql
-- Description: Système de défis entre amis (duels et équipes)
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Types de défis entre amis
CREATE TABLE IF NOT EXISTS challenge_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT 'swords',
    color VARCHAR(50) NOT NULL DEFAULT 'cyan',

    -- Challenge configuration
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('duel', 'team', 'race', 'coop')),
    min_participants INT NOT NULL DEFAULT 2,
    max_participants INT NOT NULL DEFAULT 2,

    -- Objective
    objective_type VARCHAR(50) NOT NULL CHECK (objective_type IN (
        'xp_total', 'xp_daily', 'challenges_completed', 'events_attended',
        'streak_days', 'missions_completed', 'first_to_target', 'highest_score'
    )),
    default_target INT,
    default_duration_hours INT NOT NULL DEFAULT 168, -- 1 semaine par défaut

    -- Rewards
    winner_xp INT NOT NULL DEFAULT 500,
    participant_xp INT NOT NULL DEFAULT 100,
    draw_xp INT DEFAULT 250,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Défis entre amis
CREATE TABLE IF NOT EXISTS friend_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_type_id UUID REFERENCES challenge_types(id),

    -- Creator
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Configuration
    name VARCHAR(200),
    target_value INT,
    stake_xp INT DEFAULT 0, -- XP misé (optionnel)

    -- Timing
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'active', 'completed', 'cancelled', 'expired'
    )),

    -- Results
    winner_id UUID REFERENCES auth.users(id),
    winning_team VARCHAR(10),
    is_draw BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Participants aux défis
CREATE TABLE IF NOT EXISTS challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES friend_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Team (pour les défis en équipe)
    team VARCHAR(10) DEFAULT 'a' CHECK (team IN ('a', 'b')),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'declined', 'left'
    )),

    -- Progress
    current_score INT NOT NULL DEFAULT 0,
    start_score INT DEFAULT 0, -- Score au début du défi

    -- Rewards
    xp_earned INT DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,

    joined_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(challenge_id, user_id)
);

-- Historique de progression
CREATE TABLE IF NOT EXISTS challenge_progress_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES friend_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score_change INT NOT NULL,
    new_total INT NOT NULL,
    source VARCHAR(50), -- 'challenge', 'event', 'mission', etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages/Chat du défi
CREATE TABLE IF NOT EXISTS challenge_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES friend_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN (
        'text', 'taunt', 'cheer', 'milestone', 'system'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_friend_challenges_creator ON friend_challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_friend_challenges_status ON friend_challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge ON challenge_progress_log(challenge_id);

-- ============================================================================
-- SEED DATA - CHALLENGE TYPES
-- ============================================================================

INSERT INTO challenge_types (slug, name, description, icon, color, mode, min_participants, max_participants, objective_type, default_target, default_duration_hours, winner_xp, participant_xp) VALUES
    -- Duels classiques
    ('xp_duel', 'Duel XP', 'Qui gagnera le plus d''XP pendant la période ?', 'swords', 'cyan', 'duel', 2, 2, 'xp_total', NULL, 168, 500, 100),
    ('daily_xp_duel', 'Sprint Quotidien', 'Duel XP sur 24 heures !', 'zap', 'yellow', 'duel', 2, 2, 'xp_daily', NULL, 24, 200, 50),
    ('challenge_race', 'Course aux Défis', 'Premier à compléter X défis gagne !', 'target', 'green', 'duel', 2, 2, 'challenges_completed', 10, 168, 400, 100),
    ('event_race', 'Parcours Events', 'Qui ira au plus d''events ?', 'calendar', 'pink', 'duel', 2, 2, 'events_attended', 3, 336, 600, 150),
    ('streak_challenge', 'Défi Streak', 'Qui tiendra le plus longtemps ?', 'flame', 'orange', 'duel', 2, 2, 'streak_days', 7, 168, 350, 100),

    -- Courses (plusieurs participants)
    ('xp_race', 'Course XP', 'Premier à atteindre l''objectif !', 'trophy', 'purple', 'race', 2, 8, 'first_to_target', 1000, 168, 800, 100),
    ('mission_race', 'Marathon Missions', 'Premier à finir X missions !', 'flag', 'blue', 'race', 2, 8, 'missions_completed', 15, 168, 600, 100),

    -- Défis en équipe
    ('team_xp_battle', 'Bataille d''Équipes', 'Équipe A vs Équipe B !', 'users', 'red', 'team', 4, 10, 'xp_total', NULL, 168, 400, 150),
    ('team_challenge_battle', 'Guerre des Défis', 'Quelle équipe relèvera le plus de défis ?', 'shield', 'emerald', 'team', 4, 10, 'challenges_completed', NULL, 168, 500, 150),

    -- Coopératif
    ('coop_xp_goal', 'Objectif Commun', 'Atteignez ensemble l''objectif XP !', 'heart', 'rose', 'coop', 2, 5, 'xp_total', 5000, 168, 300, 300)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Créer un nouveau défi
CREATE OR REPLACE FUNCTION create_friend_challenge(
    p_creator_id UUID,
    p_challenge_type_slug VARCHAR,
    p_invited_user_ids UUID[],
    p_name VARCHAR DEFAULT NULL,
    p_target_value INT DEFAULT NULL,
    p_duration_hours INT DEFAULT NULL,
    p_stake_xp INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_challenge_type challenge_types%ROWTYPE;
    v_challenge_id UUID;
    v_invited_id UUID;
    v_ends_at TIMESTAMPTZ;
    v_creator_xp INT;
BEGIN
    -- Récupérer le type de défi
    SELECT * INTO v_challenge_type FROM challenge_types
    WHERE slug = p_challenge_type_slug AND is_active = TRUE;

    IF v_challenge_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Type de défi non trouvé');
    END IF;

    -- Vérifier le nombre de participants
    IF array_length(p_invited_user_ids, 1) < v_challenge_type.min_participants - 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pas assez de participants');
    END IF;

    IF array_length(p_invited_user_ids, 1) > v_challenge_type.max_participants - 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trop de participants');
    END IF;

    -- Vérifier si le créateur peut miser
    IF p_stake_xp > 0 THEN
        SELECT total_xp INTO v_creator_xp FROM profiles WHERE id = p_creator_id;
        IF COALESCE(v_creator_xp, 0) < p_stake_xp THEN
            RETURN jsonb_build_object('success', false, 'error', 'XP insuffisants pour la mise');
        END IF;
    END IF;

    -- Calculer la date de fin
    v_ends_at := NOW() + (COALESCE(p_duration_hours, v_challenge_type.default_duration_hours) || ' hours')::INTERVAL;

    -- Créer le défi
    INSERT INTO friend_challenges (
        challenge_type_id, creator_id, name, target_value, stake_xp, ends_at
    ) VALUES (
        v_challenge_type.id,
        p_creator_id,
        COALESCE(p_name, v_challenge_type.name),
        COALESCE(p_target_value, v_challenge_type.default_target),
        p_stake_xp,
        v_ends_at
    )
    RETURNING id INTO v_challenge_id;

    -- Ajouter le créateur comme participant (auto-accepté)
    INSERT INTO challenge_participants (challenge_id, user_id, team, status, joined_at)
    VALUES (v_challenge_id, p_creator_id, 'a', 'accepted', NOW());

    -- Déduire la mise du créateur
    IF p_stake_xp > 0 THEN
        UPDATE profiles SET total_xp = total_xp - p_stake_xp WHERE id = p_creator_id;
    END IF;

    -- Inviter les autres participants
    FOREACH v_invited_id IN ARRAY p_invited_user_ids
    LOOP
        IF v_invited_id != p_creator_id THEN
            INSERT INTO challenge_participants (challenge_id, user_id, status)
            VALUES (v_challenge_id, v_invited_id, 'pending')
            ON CONFLICT (challenge_id, user_id) DO NOTHING;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'challenge_id', v_challenge_id,
        'ends_at', v_ends_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Répondre à une invitation
CREATE OR REPLACE FUNCTION respond_to_challenge(
    p_user_id UUID,
    p_challenge_id UUID,
    p_accept BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_challenge friend_challenges%ROWTYPE;
    v_participant challenge_participants%ROWTYPE;
    v_accepted_count INT;
    v_challenge_type challenge_types%ROWTYPE;
    v_user_xp INT;
BEGIN
    -- Récupérer le défi et le participant
    SELECT * INTO v_challenge FROM friend_challenges WHERE id = p_challenge_id;
    SELECT * INTO v_participant FROM challenge_participants
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id;

    IF v_challenge IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi non trouvé');
    END IF;

    IF v_participant IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu n''es pas invité à ce défi');
    END IF;

    IF v_participant.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu as déjà répondu');
    END IF;

    IF v_challenge.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le défi n''est plus en attente');
    END IF;

    -- Vérifier la mise si le défi a un stake
    IF p_accept AND v_challenge.stake_xp > 0 THEN
        SELECT total_xp INTO v_user_xp FROM profiles WHERE id = p_user_id;
        IF COALESCE(v_user_xp, 0) < v_challenge.stake_xp THEN
            RETURN jsonb_build_object('success', false, 'error', 'XP insuffisants pour la mise');
        END IF;

        -- Déduire la mise
        UPDATE profiles SET total_xp = total_xp - v_challenge.stake_xp WHERE id = p_user_id;
    END IF;

    -- Mettre à jour le statut du participant
    UPDATE challenge_participants
    SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
        joined_at = CASE WHEN p_accept THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id;

    -- Vérifier si on peut démarrer le défi
    IF p_accept THEN
        SELECT * INTO v_challenge_type FROM challenge_types WHERE id = v_challenge.challenge_type_id;

        SELECT COUNT(*) INTO v_accepted_count
        FROM challenge_participants
        WHERE challenge_id = p_challenge_id AND status = 'accepted';

        IF v_accepted_count >= v_challenge_type.min_participants THEN
            -- Démarrer le défi
            PERFORM start_challenge(p_challenge_id);
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'accepted', p_accept);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Démarrer un défi
CREATE OR REPLACE FUNCTION start_challenge(p_challenge_id UUID)
RETURNS VOID AS $$
DECLARE
    v_participant RECORD;
    v_challenge friend_challenges%ROWTYPE;
    v_challenge_type challenge_types%ROWTYPE;
    v_start_score INT;
BEGIN
    SELECT * INTO v_challenge FROM friend_challenges WHERE id = p_challenge_id;
    SELECT * INTO v_challenge_type FROM challenge_types WHERE id = v_challenge.challenge_type_id;

    -- Mettre à jour le statut
    UPDATE friend_challenges SET status = 'active', starts_at = NOW(), updated_at = NOW()
    WHERE id = p_challenge_id;

    -- Enregistrer les scores de départ pour chaque participant
    FOR v_participant IN
        SELECT cp.user_id FROM challenge_participants cp
        WHERE cp.challenge_id = p_challenge_id AND cp.status = 'accepted'
    LOOP
        -- Récupérer le score de départ selon le type d'objectif
        CASE v_challenge_type.objective_type
            WHEN 'xp_total', 'xp_daily' THEN
                SELECT COALESCE(ux.total_xp, 0) INTO v_start_score
                FROM teens t
                LEFT JOIN user_xp ux ON ux.teen_id = t.id
                WHERE t.parent_id = v_participant.user_id
                LIMIT 1;
            WHEN 'challenges_completed' THEN
                SELECT COUNT(*) INTO v_start_score
                FROM challenge_participants cp2
                WHERE cp2.user_id = v_participant.user_id AND cp2.status = 'completed';
            WHEN 'events_attended' THEN
                SELECT COALESCE(up.events_attended, 0) INTO v_start_score
                FROM user_progression up
                WHERE up.user_id = v_participant.user_id;
            WHEN 'streak_days' THEN
                SELECT COALESCE(us.current_streak, 0) INTO v_start_score
                FROM teens t
                LEFT JOIN user_streaks us ON us.teen_id = t.id
                WHERE t.parent_id = v_participant.user_id
                LIMIT 1;
            WHEN 'missions_completed' THEN
                SELECT COUNT(*) INTO v_start_score
                FROM user_missions um
                JOIN teens t ON t.id = um.teen_id
                WHERE t.parent_id = v_participant.user_id AND um.status = 'claimed';
            ELSE
                v_start_score := 0;
        END CASE;

        UPDATE challenge_participants
        SET start_score = COALESCE(v_start_score, 0), current_score = 0
        WHERE challenge_id = p_challenge_id AND user_id = v_participant.user_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour la progression d'un participant
CREATE OR REPLACE FUNCTION update_challenge_progress(
    p_user_id UUID,
    p_source VARCHAR DEFAULT 'manual'
)
RETURNS INT AS $$
DECLARE
    v_challenge RECORD;
    v_challenge_type challenge_types%ROWTYPE;
    v_current_value INT;
    v_new_score INT;
    v_updated_count INT := 0;
BEGIN
    -- Parcourir tous les défis actifs de l'utilisateur
    FOR v_challenge IN
        SELECT fc.*, cp.start_score, cp.current_score, cp.id as participant_id
        FROM friend_challenges fc
        JOIN challenge_participants cp ON fc.id = cp.challenge_id
        WHERE cp.user_id = p_user_id
        AND fc.status = 'active'
        AND cp.status = 'accepted'
    LOOP
        SELECT * INTO v_challenge_type FROM challenge_types WHERE id = v_challenge.challenge_type_id;

        -- Calculer la valeur actuelle selon le type
        CASE v_challenge_type.objective_type
            WHEN 'xp_total', 'xp_daily' THEN
                SELECT COALESCE(ux.total_xp, 0) INTO v_current_value
                FROM teens t
                LEFT JOIN user_xp ux ON ux.teen_id = t.id
                WHERE t.parent_id = p_user_id
                LIMIT 1;
            WHEN 'challenges_completed' THEN
                SELECT COUNT(*) INTO v_current_value
                FROM challenge_participants cp2
                WHERE cp2.user_id = p_user_id AND cp2.status = 'completed';
            WHEN 'events_attended' THEN
                SELECT COALESCE(up.events_attended, 0) INTO v_current_value
                FROM user_progression up
                WHERE up.user_id = p_user_id;
            WHEN 'streak_days' THEN
                SELECT COALESCE(us.current_streak, 0) INTO v_current_value
                FROM teens t
                LEFT JOIN user_streaks us ON us.teen_id = t.id
                WHERE t.parent_id = p_user_id
                LIMIT 1;
            WHEN 'missions_completed' THEN
                SELECT COUNT(*) INTO v_current_value
                FROM user_missions um
                JOIN teens t ON t.id = um.teen_id
                WHERE t.parent_id = p_user_id AND um.status = 'claimed';
            ELSE
                v_current_value := 0;
        END CASE;

        -- Calculer le nouveau score (différence depuis le début)
        v_new_score := COALESCE(v_current_value, 0) - COALESCE(v_challenge.start_score, 0);

        -- Mettre à jour si le score a changé
        IF v_new_score != v_challenge.current_score THEN
            UPDATE challenge_participants
            SET current_score = v_new_score, updated_at = NOW()
            WHERE id = v_challenge.participant_id;

            -- Logger la progression
            INSERT INTO challenge_progress_log (challenge_id, user_id, score_change, new_total, source)
            VALUES (v_challenge.id, p_user_id, v_new_score - v_challenge.current_score, v_new_score, p_source);

            v_updated_count := v_updated_count + 1;

            -- Vérifier si quelqu'un a atteint l'objectif (pour first_to_target)
            IF v_challenge_type.objective_type = 'first_to_target'
               AND v_challenge.target_value IS NOT NULL
               AND v_new_score >= v_challenge.target_value THEN
                PERFORM complete_challenge(v_challenge.id, p_user_id);
            END IF;
        END IF;
    END LOOP;

    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Terminer un défi
CREATE OR REPLACE FUNCTION complete_challenge(
    p_challenge_id UUID,
    p_winner_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_challenge friend_challenges%ROWTYPE;
    v_challenge_type challenge_types%ROWTYPE;
    v_winner_id UUID;
    v_winning_team VARCHAR(10);
    v_is_draw BOOLEAN := FALSE;
    v_participant RECORD;
    v_max_score INT;
    v_total_stake INT;
    v_team_a_score INT;
    v_team_b_score INT;
BEGIN
    SELECT * INTO v_challenge FROM friend_challenges WHERE id = p_challenge_id FOR UPDATE;

    IF v_challenge.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi déjà terminé');
    END IF;

    SELECT * INTO v_challenge_type FROM challenge_types WHERE id = v_challenge.challenge_type_id;

    -- Déterminer le gagnant selon le mode
    IF p_winner_id IS NOT NULL THEN
        v_winner_id := p_winner_id;
    ELSIF v_challenge_type.mode = 'team' THEN
        -- Calculer les scores par équipe
        SELECT COALESCE(SUM(current_score), 0) INTO v_team_a_score
        FROM challenge_participants
        WHERE challenge_id = p_challenge_id AND team = 'a' AND status = 'accepted';

        SELECT COALESCE(SUM(current_score), 0) INTO v_team_b_score
        FROM challenge_participants
        WHERE challenge_id = p_challenge_id AND team = 'b' AND status = 'accepted';

        IF v_team_a_score > v_team_b_score THEN
            v_winning_team := 'a';
        ELSIF v_team_b_score > v_team_a_score THEN
            v_winning_team := 'b';
        ELSE
            v_is_draw := TRUE;
        END IF;
    ELSIF v_challenge_type.mode = 'coop' THEN
        -- Mode coop: tout le monde gagne si l'objectif est atteint
        SELECT SUM(current_score) INTO v_max_score
        FROM challenge_participants
        WHERE challenge_id = p_challenge_id AND status = 'accepted';

        v_is_draw := v_max_score >= v_challenge.target_value;
    ELSE
        -- Duel ou race: le plus haut score gagne
        SELECT user_id, current_score INTO v_winner_id, v_max_score
        FROM challenge_participants
        WHERE challenge_id = p_challenge_id AND status = 'accepted'
        ORDER BY current_score DESC
        LIMIT 1;

        -- Vérifier les égalités
        IF (SELECT COUNT(*) FROM challenge_participants
            WHERE challenge_id = p_challenge_id AND status = 'accepted' AND current_score = v_max_score) > 1 THEN
            v_is_draw := TRUE;
            v_winner_id := NULL;
        END IF;
    END IF;

    -- Mettre à jour le défi
    UPDATE friend_challenges
    SET status = 'completed',
        winner_id = v_winner_id,
        winning_team = v_winning_team,
        is_draw = v_is_draw,
        updated_at = NOW()
    WHERE id = p_challenge_id;

    -- Calculer le pot total (mise)
    SELECT COALESCE(SUM(1), 0) * v_challenge.stake_xp INTO v_total_stake
    FROM challenge_participants
    WHERE challenge_id = p_challenge_id AND status = 'accepted';

    -- Distribuer les récompenses
    FOR v_participant IN
        SELECT * FROM challenge_participants
        WHERE challenge_id = p_challenge_id AND status = 'accepted'
    LOOP
        DECLARE
            v_xp_reward INT;
            v_is_winner BOOLEAN := FALSE;
        BEGIN
            IF v_is_draw THEN
                v_xp_reward := COALESCE(v_challenge_type.draw_xp, v_challenge_type.participant_xp);
                -- Rembourser la mise en cas d'égalité
                IF v_challenge.stake_xp > 0 THEN
                    v_xp_reward := v_xp_reward + v_challenge.stake_xp;
                END IF;
            ELSIF v_winning_team IS NOT NULL THEN
                IF v_participant.team = v_winning_team THEN
                    v_is_winner := TRUE;
                    v_xp_reward := v_challenge_type.winner_xp;
                    -- Partager la mise entre les gagnants
                    IF v_challenge.stake_xp > 0 THEN
                        v_xp_reward := v_xp_reward + (v_total_stake / (
                            SELECT COUNT(*) FROM challenge_participants
                            WHERE challenge_id = p_challenge_id AND team = v_winning_team AND status = 'accepted'
                        ));
                    END IF;
                ELSE
                    v_xp_reward := v_challenge_type.participant_xp;
                END IF;
            ELSIF v_participant.user_id = v_winner_id THEN
                v_is_winner := TRUE;
                v_xp_reward := v_challenge_type.winner_xp + v_total_stake;
            ELSE
                v_xp_reward := v_challenge_type.participant_xp;
            END IF;

            -- Mettre à jour le participant
            UPDATE challenge_participants
            SET xp_earned = v_xp_reward, is_winner = v_is_winner, updated_at = NOW()
            WHERE id = v_participant.id;

            -- Ajouter les XP via la fonction add_xp_to_user
            DECLARE
                v_teen_id UUID;
            BEGIN
                SELECT t.id INTO v_teen_id FROM teens t WHERE t.parent_id = v_participant.user_id LIMIT 1;
                IF v_teen_id IS NOT NULL THEN
                    PERFORM add_xp_to_user(v_teen_id, v_xp_reward, 'challenge', 'challenge', p_challenge_id, 'Challenge reward');
                END IF;
            END;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'winner_id', v_winner_id,
        'winning_team', v_winning_team,
        'is_draw', v_is_draw
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Récupérer les défis d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_challenges(
    p_user_id UUID,
    p_status VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    challenge_id UUID,
    challenge_name VARCHAR,
    challenge_type_slug VARCHAR,
    challenge_type_name VARCHAR,
    mode VARCHAR,
    icon VARCHAR,
    color VARCHAR,
    target_value INT,
    stake_xp INT,
    status VARCHAR,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    is_creator BOOLEAN,
    user_score INT,
    user_team VARCHAR,
    participants JSONB,
    winner_id UUID,
    winning_team VARCHAR,
    is_draw BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fc.id as challenge_id,
        fc.name as challenge_name,
        ct.slug as challenge_type_slug,
        ct.name as challenge_type_name,
        ct.mode,
        ct.icon,
        ct.color,
        fc.target_value,
        fc.stake_xp,
        fc.status,
        fc.starts_at,
        fc.ends_at,
        (fc.creator_id = p_user_id) as is_creator,
        cp_user.current_score as user_score,
        cp_user.team as user_team,
        (
            SELECT jsonb_agg(jsonb_build_object(
                'user_id', cp.user_id,
                'pseudo', p.pseudo,
                'avatar_url', p.avatar_url,
                'team', cp.team,
                'status', cp.status,
                'score', cp.current_score,
                'is_winner', cp.is_winner
            ) ORDER BY cp.current_score DESC)
            FROM challenge_participants cp
            JOIN profiles p ON cp.user_id = p.id
            WHERE cp.challenge_id = fc.id
        ) as participants,
        fc.winner_id,
        fc.winning_team,
        fc.is_draw
    FROM friend_challenges fc
    JOIN challenge_types ct ON fc.challenge_type_id = ct.id
    JOIN challenge_participants cp_user ON fc.id = cp_user.challenge_id AND cp_user.user_id = p_user_id
    WHERE (p_status IS NULL OR fc.status = p_status)
    ORDER BY
        CASE fc.status
            WHEN 'active' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'completed' THEN 3
            ELSE 4
        END,
        fc.ends_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Job pour terminer les défis expirés
CREATE OR REPLACE FUNCTION check_expired_challenges()
RETURNS INT AS $$
DECLARE
    v_challenge RECORD;
    v_count INT := 0;
BEGIN
    FOR v_challenge IN
        SELECT id FROM friend_challenges
        WHERE status = 'active' AND ends_at <= NOW()
    LOOP
        PERFORM complete_challenge(v_challenge.id);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE challenge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_messages ENABLE ROW LEVEL SECURITY;

-- Types: readable by all
CREATE POLICY "Challenge types are readable by all" ON challenge_types
    FOR SELECT USING (is_active = TRUE);

-- Challenges: participants can view
CREATE POLICY "Participants can view challenges" ON friend_challenges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM challenge_participants
            WHERE challenge_id = friend_challenges.id AND user_id = auth.uid()
        )
    );

-- Participants: can view challenges they're in
CREATE POLICY "Users can view challenge participants" ON challenge_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM challenge_participants cp
            WHERE cp.challenge_id = challenge_participants.challenge_id AND cp.user_id = auth.uid()
        )
    );

-- Progress: participants can view
CREATE POLICY "Users can view challenge progress" ON challenge_progress_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM challenge_participants
            WHERE challenge_id = challenge_progress_log.challenge_id AND user_id = auth.uid()
        )
    );

-- Messages: participants can view and insert
CREATE POLICY "Participants can view messages" ON challenge_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM challenge_participants
            WHERE challenge_id = challenge_messages.challenge_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can send messages" ON challenge_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM challenge_participants
            WHERE challenge_id = challenge_messages.challenge_id AND user_id = auth.uid() AND status = 'accepted'
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_challenge_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friend_challenges_updated_at
    BEFORE UPDATE ON friend_challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_timestamp();

CREATE TRIGGER challenge_participants_updated_at
    BEFORE UPDATE ON challenge_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_timestamp();

-- Trigger pour vérifier les achievements quand un challenge est complété
-- Utilise la fonction définie dans 001_achievements_system.sql
DROP TRIGGER IF EXISTS on_challenge_complete_check_achievements ON challenge_participants;
CREATE TRIGGER on_challenge_complete_check_achievements
    AFTER UPDATE ON challenge_participants
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION trigger_check_achievements_on_challenge_participant();
