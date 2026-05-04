-- ============================================================================
-- TEENS PARTY MOROCCO - Crews/Groups System Migration
-- ============================================================================
-- Description: Système de crews (groupes d'amis) avec classements et défis
-- Version: 007
-- ============================================================================

-- ============================================================================
-- TABLE: crews
-- ============================================================================
-- Représente un crew (groupe d'amis)

CREATE TABLE IF NOT EXISTS crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informations de base
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    motto VARCHAR(100), -- Devise du crew

    -- Personnalisation
    avatar_url TEXT,
    banner_url TEXT,
    color VARCHAR(7) DEFAULT '#06b6d4', -- Couleur principale (hex)
    badge_icon VARCHAR(50) DEFAULT 'users',

    -- Statistiques agrégées
    total_xp BIGINT DEFAULT 0,
    total_events_attended INTEGER DEFAULT 0,
    total_challenges_won INTEGER DEFAULT 0,
    average_level DECIMAL(5,2) DEFAULT 1.0,

    -- Configuration
    max_members INTEGER DEFAULT 10,
    is_public BOOLEAN DEFAULT true, -- Visible dans la recherche
    requires_approval BOOLEAN DEFAULT true, -- Demande d'adhésion requise
    min_level_required INTEGER DEFAULT 1, -- Niveau minimum pour rejoindre

    -- Propriétaire
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche et classement
CREATE INDEX IF NOT EXISTS idx_crews_slug ON crews(slug);
CREATE INDEX IF NOT EXISTS idx_crews_total_xp ON crews(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_crews_owner ON crews(owner_id);
CREATE INDEX IF NOT EXISTS idx_crews_public ON crews(is_public) WHERE is_public = true;

-- ============================================================================
-- TABLE: crew_members
-- ============================================================================
-- Membres d'un crew avec leurs rôles

CREATE TABLE IF NOT EXISTS crew_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Rôle dans le crew
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),

    -- Contribution au crew
    xp_contributed BIGINT DEFAULT 0,
    events_attended INTEGER DEFAULT 0,
    challenges_won INTEGER DEFAULT 0,

    -- Statut
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'banned')),

    -- Métadonnées
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(crew_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_members_crew ON crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user ON crew_members(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_status ON crew_members(status);
CREATE INDEX IF NOT EXISTS idx_crew_members_xp ON crew_members(xp_contributed DESC);

-- ============================================================================
-- TABLE: crew_invitations
-- ============================================================================
-- Invitations à rejoindre un crew

CREATE TABLE IF NOT EXISTS crew_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,

    -- Invitation
    inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Message personnalisé
    message TEXT,

    -- Statut
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

    UNIQUE(crew_id, invitee_id, status) -- Une seule invitation pending par personne
);

CREATE INDEX IF NOT EXISTS idx_crew_invitations_invitee ON crew_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_crew_invitations_crew ON crew_invitations(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_invitations_status ON crew_invitations(status);

-- ============================================================================
-- TABLE: crew_join_requests
-- ============================================================================
-- Demandes d'adhésion à un crew

CREATE TABLE IF NOT EXISTS crew_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Message de motivation
    message TEXT,

    -- Statut
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

    -- Réponse
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(crew_id, user_id, status)
);

CREATE INDEX IF NOT EXISTS idx_crew_join_requests_crew ON crew_join_requests(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_join_requests_user ON crew_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_join_requests_status ON crew_join_requests(status);

-- ============================================================================
-- TABLE: crew_achievements
-- ============================================================================
-- Badges/achievements spécifiques aux crews

CREATE TABLE IF NOT EXISTS crew_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informations
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#fbbf24',

    -- Conditions
    condition_type VARCHAR(50) NOT NULL, -- total_xp, members_count, events_attended, etc.
    condition_value INTEGER NOT NULL,

    -- Récompenses
    xp_reward INTEGER DEFAULT 0,

    -- Rareté
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),

    -- Métadonnées
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: crew_unlocked_achievements
-- ============================================================================
-- Achievements débloqués par les crews

CREATE TABLE IF NOT EXISTS crew_unlocked_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES crew_achievements(id) ON DELETE CASCADE,

    unlocked_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(crew_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_unlocked_achievements_crew ON crew_unlocked_achievements(crew_id);

-- ============================================================================
-- TABLE: crew_activity_log
-- ============================================================================
-- Journal d'activité du crew

CREATE TABLE IF NOT EXISTS crew_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- Type d'activité
    activity_type VARCHAR(50) NOT NULL, -- member_joined, xp_gained, challenge_won, event_attended, etc.

    -- Détails
    description TEXT,
    metadata JSONB DEFAULT '{}',
    xp_amount INTEGER DEFAULT 0,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crew_activity_crew ON crew_activity_log(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_activity_created ON crew_activity_log(created_at DESC);

-- ============================================================================
-- TABLE: crew_weekly_stats
-- ============================================================================
-- Statistiques hebdomadaires pour le classement

CREATE TABLE IF NOT EXISTS crew_weekly_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,

    -- Période
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,

    -- Stats de la semaine
    xp_earned BIGINT DEFAULT 0,
    events_attended INTEGER DEFAULT 0,
    challenges_won INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,

    -- Classement de la semaine
    rank INTEGER,
    previous_rank INTEGER,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(crew_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_crew_weekly_stats_week ON crew_weekly_stats(week_start);
CREATE INDEX IF NOT EXISTS idx_crew_weekly_stats_rank ON crew_weekly_stats(rank);

-- ============================================================================
-- SEED: Crew Achievements
-- ============================================================================

INSERT INTO crew_achievements (name, slug, description, icon, color, condition_type, condition_value, xp_reward, rarity) VALUES
-- Membres
('Première recrue', 'first-recruit', 'Recrutez votre premier membre', 'user-plus', '#22c55e', 'members_count', 2, 100, 'common'),
('Escouade', 'squad', 'Atteignez 5 membres dans votre crew', 'users', '#22c55e', 'members_count', 5, 250, 'common'),
('Équipe complète', 'full-team', 'Atteignez 10 membres dans votre crew', 'users', '#3b82f6', 'members_count', 10, 500, 'rare'),

-- XP
('Premiers pas', 'first-steps', 'Cumulez 1 000 XP en crew', 'zap', '#fbbf24', 'total_xp', 1000, 100, 'common'),
('En progression', 'progressing', 'Cumulez 10 000 XP en crew', 'trending-up', '#fbbf24', 'total_xp', 10000, 300, 'common'),
('Crew puissant', 'powerful-crew', 'Cumulez 50 000 XP en crew', 'flame', '#f97316', 'total_xp', 50000, 750, 'rare'),
('Élite', 'elite-crew', 'Cumulez 100 000 XP en crew', 'crown', '#a855f7', 'total_xp', 100000, 1500, 'epic'),
('Légendes', 'legendary-crew', 'Cumulez 500 000 XP en crew', 'star', '#ec4899', 'total_xp', 500000, 5000, 'legendary'),

-- Events
('Première sortie', 'first-outing', 'Participez à votre premier event en crew', 'calendar', '#06b6d4', 'events_attended', 1, 150, 'common'),
('Habitués', 'regulars', 'Participez à 10 events en crew', 'calendar-check', '#06b6d4', 'events_attended', 10, 400, 'rare'),
('Piliers de la fête', 'party-pillars', 'Participez à 50 events en crew', 'party-popper', '#a855f7', 'events_attended', 50, 1000, 'epic'),

-- Défis
('Premiers vainqueurs', 'first-victory', 'Gagnez votre premier défi en crew', 'trophy', '#fbbf24', 'challenges_won', 1, 200, 'common'),
('Compétiteurs', 'competitors', 'Gagnez 10 défis en crew', 'swords', '#f97316', 'challenges_won', 10, 500, 'rare'),
('Champions', 'champions', 'Gagnez 50 défis en crew', 'medal', '#a855f7', 'challenges_won', 50, 1500, 'epic'),

-- Activité
('Crew actif', 'active-crew', 'Tous les membres actifs dans la même semaine', 'activity', '#22c55e', 'weekly_active_all', 1, 300, 'rare'),
('Semaine parfaite', 'perfect-week', 'Top 3 du classement hebdomadaire', 'award', '#fbbf24', 'weekly_top3', 1, 500, 'epic')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- FUNCTION: create_crew
-- ============================================================================

CREATE OR REPLACE FUNCTION create_crew(
    p_owner_id UUID,
    p_name VARCHAR(50),
    p_description TEXT DEFAULT NULL,
    p_motto VARCHAR(100) DEFAULT NULL,
    p_color VARCHAR(7) DEFAULT '#06b6d4',
    p_is_public BOOLEAN DEFAULT true,
    p_requires_approval BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
    v_crew_id UUID;
    v_slug VARCHAR(50);
    v_existing_crew_count INTEGER;
BEGIN
    -- Vérifier si l'utilisateur est déjà owner d'un crew
    SELECT COUNT(*) INTO v_existing_crew_count
    FROM crews WHERE owner_id = p_owner_id;

    IF v_existing_crew_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu possèdes déjà un crew');
    END IF;

    -- Générer le slug
    v_slug := LOWER(REGEXP_REPLACE(p_name, '[^a-zA-Z0-9]', '-', 'g'));
    v_slug := REGEXP_REPLACE(v_slug, '-+', '-', 'g');
    v_slug := TRIM(BOTH '-' FROM v_slug);

    -- Vérifier l'unicité du slug
    IF EXISTS (SELECT 1 FROM crews WHERE slug = v_slug) THEN
        v_slug := v_slug || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 4);
    END IF;

    -- Créer le crew
    INSERT INTO crews (
        name, slug, description, motto, color,
        is_public, requires_approval, owner_id
    ) VALUES (
        p_name, v_slug, p_description, p_motto, p_color,
        p_is_public, p_requires_approval, p_owner_id
    ) RETURNING id INTO v_crew_id;

    -- Ajouter le créateur comme owner
    INSERT INTO crew_members (crew_id, user_id, role, status)
    VALUES (v_crew_id, p_owner_id, 'owner', 'active');

    -- Logger l'activité
    INSERT INTO crew_activity_log (crew_id, user_id, activity_type, description)
    VALUES (v_crew_id, p_owner_id, 'crew_created', 'Crew créé');

    RETURN jsonb_build_object(
        'success', true,
        'crew_id', v_crew_id,
        'slug', v_slug
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: invite_to_crew
-- ============================================================================

CREATE OR REPLACE FUNCTION invite_to_crew(
    p_crew_id UUID,
    p_inviter_id UUID,
    p_invitee_id UUID,
    p_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_crew RECORD;
    v_inviter_member RECORD;
    v_member_count INTEGER;
BEGIN
    -- Vérifier le crew
    SELECT * INTO v_crew FROM crews WHERE id = p_crew_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Crew introuvable');
    END IF;

    -- Vérifier que l'inviteur est admin ou owner
    SELECT * INTO v_inviter_member
    FROM crew_members
    WHERE crew_id = p_crew_id AND user_id = p_inviter_id AND status = 'active';

    IF NOT FOUND OR v_inviter_member.role = 'member' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission refusée');
    END IF;

    -- Vérifier que l'invité n'est pas déjà membre
    IF EXISTS (SELECT 1 FROM crew_members WHERE crew_id = p_crew_id AND user_id = p_invitee_id AND status = 'active') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cet utilisateur est déjà membre');
    END IF;

    -- Vérifier le nombre de membres
    SELECT COUNT(*) INTO v_member_count FROM crew_members WHERE crew_id = p_crew_id AND status = 'active';
    IF v_member_count >= v_crew.max_members THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le crew est complet');
    END IF;

    -- Vérifier qu'il n'y a pas déjà une invitation pending
    IF EXISTS (SELECT 1 FROM crew_invitations WHERE crew_id = p_crew_id AND invitee_id = p_invitee_id AND status = 'pending') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Une invitation est déjà en attente');
    END IF;

    -- Créer l'invitation
    INSERT INTO crew_invitations (crew_id, inviter_id, invitee_id, message)
    VALUES (p_crew_id, p_inviter_id, p_invitee_id, p_message);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: respond_to_crew_invitation
-- ============================================================================

CREATE OR REPLACE FUNCTION respond_to_crew_invitation(
    p_invitation_id UUID,
    p_user_id UUID,
    p_accept BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_invitation RECORD;
    v_crew RECORD;
    v_member_count INTEGER;
BEGIN
    -- Vérifier l'invitation
    SELECT * INTO v_invitation
    FROM crew_invitations
    WHERE id = p_invitation_id AND invitee_id = p_user_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation introuvable ou expirée');
    END IF;

    IF p_accept THEN
        -- Vérifier le crew
        SELECT * INTO v_crew FROM crews WHERE id = v_invitation.crew_id;

        -- Vérifier le nombre de membres
        SELECT COUNT(*) INTO v_member_count
        FROM crew_members
        WHERE crew_id = v_invitation.crew_id AND status = 'active';

        IF v_member_count >= v_crew.max_members THEN
            -- Mettre à jour l'invitation comme expirée
            UPDATE crew_invitations SET status = 'expired' WHERE id = p_invitation_id;
            RETURN jsonb_build_object('success', false, 'error', 'Le crew est complet');
        END IF;

        -- Ajouter comme membre
        INSERT INTO crew_members (crew_id, user_id, role, status)
        VALUES (v_invitation.crew_id, p_user_id, 'member', 'active')
        ON CONFLICT (crew_id, user_id)
        DO UPDATE SET status = 'active', joined_at = NOW();

        -- Logger l'activité
        INSERT INTO crew_activity_log (crew_id, user_id, activity_type, description)
        VALUES (v_invitation.crew_id, p_user_id, 'member_joined', 'A rejoint le crew via invitation');

        -- Mettre à jour l'invitation
        UPDATE crew_invitations
        SET status = 'accepted', responded_at = NOW()
        WHERE id = p_invitation_id;

        -- Mettre à jour les stats du crew
        PERFORM update_crew_stats(v_invitation.crew_id);
    ELSE
        -- Refuser l'invitation
        UPDATE crew_invitations
        SET status = 'declined', responded_at = NOW()
        WHERE id = p_invitation_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: request_to_join_crew
-- ============================================================================

CREATE OR REPLACE FUNCTION request_to_join_crew(
    p_crew_id UUID,
    p_user_id UUID,
    p_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_crew RECORD;
    v_user_level INTEGER;
    v_member_count INTEGER;
BEGIN
    -- Vérifier le crew
    SELECT * INTO v_crew FROM crews WHERE id = p_crew_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Crew introuvable');
    END IF;

    -- Vérifier si public
    IF NOT v_crew.is_public THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ce crew est privé');
    END IF;

    -- Vérifier le niveau
    SELECT level INTO v_user_level FROM profiles WHERE id = p_user_id;
    IF v_user_level < v_crew.min_level_required THEN
        RETURN jsonb_build_object('success', false, 'error', 'Niveau minimum requis: ' || v_crew.min_level_required);
    END IF;

    -- Vérifier si déjà membre
    IF EXISTS (SELECT 1 FROM crew_members WHERE crew_id = p_crew_id AND user_id = p_user_id AND status = 'active') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu es déjà membre de ce crew');
    END IF;

    -- Vérifier le nombre de membres
    SELECT COUNT(*) INTO v_member_count FROM crew_members WHERE crew_id = p_crew_id AND status = 'active';
    IF v_member_count >= v_crew.max_members THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le crew est complet');
    END IF;

    -- Vérifier s'il y a déjà une demande pending
    IF EXISTS (SELECT 1 FROM crew_join_requests WHERE crew_id = p_crew_id AND user_id = p_user_id AND status = 'pending') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Une demande est déjà en attente');
    END IF;

    -- Si pas besoin d'approbation, rejoindre directement
    IF NOT v_crew.requires_approval THEN
        INSERT INTO crew_members (crew_id, user_id, role, status)
        VALUES (p_crew_id, p_user_id, 'member', 'active')
        ON CONFLICT (crew_id, user_id)
        DO UPDATE SET status = 'active', joined_at = NOW();

        INSERT INTO crew_activity_log (crew_id, user_id, activity_type, description)
        VALUES (p_crew_id, p_user_id, 'member_joined', 'A rejoint le crew');

        PERFORM update_crew_stats(p_crew_id);

        RETURN jsonb_build_object('success', true, 'joined', true);
    END IF;

    -- Créer la demande
    INSERT INTO crew_join_requests (crew_id, user_id, message)
    VALUES (p_crew_id, p_user_id, p_message);

    RETURN jsonb_build_object('success', true, 'joined', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: handle_join_request
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_join_request(
    p_request_id UUID,
    p_reviewer_id UUID,
    p_approve BOOLEAN,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_reviewer_member RECORD;
    v_member_count INTEGER;
    v_crew RECORD;
BEGIN
    -- Vérifier la demande
    SELECT * INTO v_request FROM crew_join_requests WHERE id = p_request_id AND status = 'pending';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Demande introuvable');
    END IF;

    -- Vérifier que le reviewer est admin ou owner
    SELECT * INTO v_reviewer_member
    FROM crew_members
    WHERE crew_id = v_request.crew_id AND user_id = p_reviewer_id AND status = 'active';

    IF NOT FOUND OR v_reviewer_member.role = 'member' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission refusée');
    END IF;

    IF p_approve THEN
        -- Vérifier le nombre de membres
        SELECT * INTO v_crew FROM crews WHERE id = v_request.crew_id;
        SELECT COUNT(*) INTO v_member_count FROM crew_members WHERE crew_id = v_request.crew_id AND status = 'active';

        IF v_member_count >= v_crew.max_members THEN
            UPDATE crew_join_requests
            SET status = 'rejected', reviewed_by = p_reviewer_id, reviewed_at = NOW(), rejection_reason = 'Crew complet'
            WHERE id = p_request_id;
            RETURN jsonb_build_object('success', false, 'error', 'Le crew est complet');
        END IF;

        -- Ajouter comme membre
        INSERT INTO crew_members (crew_id, user_id, role, status)
        VALUES (v_request.crew_id, v_request.user_id, 'member', 'active')
        ON CONFLICT (crew_id, user_id)
        DO UPDATE SET status = 'active', joined_at = NOW();

        INSERT INTO crew_activity_log (crew_id, user_id, activity_type, description)
        VALUES (v_request.crew_id, v_request.user_id, 'member_joined', 'Demande acceptée');

        UPDATE crew_join_requests
        SET status = 'approved', reviewed_by = p_reviewer_id, reviewed_at = NOW()
        WHERE id = p_request_id;

        PERFORM update_crew_stats(v_request.crew_id);
    ELSE
        UPDATE crew_join_requests
        SET status = 'rejected', reviewed_by = p_reviewer_id, reviewed_at = NOW(), rejection_reason = p_rejection_reason
        WHERE id = p_request_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: leave_crew
-- ============================================================================

CREATE OR REPLACE FUNCTION leave_crew(
    p_crew_id UUID,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_member RECORD;
    v_crew RECORD;
    v_admin_count INTEGER;
BEGIN
    -- Vérifier le membre
    SELECT * INTO v_member
    FROM crew_members
    WHERE crew_id = p_crew_id AND user_id = p_user_id AND status = 'active';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu n''es pas membre de ce crew');
    END IF;

    -- Si owner, ne peut pas quitter
    IF v_member.role = 'owner' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le propriétaire ne peut pas quitter. Transfère la propriété d''abord.');
    END IF;

    -- Supprimer le membre
    DELETE FROM crew_members WHERE crew_id = p_crew_id AND user_id = p_user_id;

    -- Logger
    INSERT INTO crew_activity_log (crew_id, user_id, activity_type, description)
    VALUES (p_crew_id, p_user_id, 'member_left', 'A quitté le crew');

    -- Mettre à jour les stats
    PERFORM update_crew_stats(p_crew_id);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: update_crew_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION update_crew_stats(p_crew_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_xp BIGINT;
    v_avg_level DECIMAL(5,2);
    v_member_count INTEGER;
BEGIN
    -- Calculer les stats agrégées
    SELECT
        COALESCE(SUM(p.total_xp), 0),
        COALESCE(AVG(p.level), 1),
        COUNT(*)
    INTO v_total_xp, v_avg_level, v_member_count
    FROM crew_members cm
    JOIN profiles p ON cm.user_id = p.id
    WHERE cm.crew_id = p_crew_id AND cm.status = 'active';

    -- Mettre à jour le crew
    UPDATE crews
    SET
        total_xp = v_total_xp,
        average_level = v_avg_level,
        updated_at = NOW()
    WHERE id = p_crew_id;

    -- Vérifier les achievements
    PERFORM check_crew_achievements(p_crew_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: check_crew_achievements
-- ============================================================================

CREATE OR REPLACE FUNCTION check_crew_achievements(p_crew_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_crew RECORD;
    v_achievement RECORD;
    v_unlocked_count INTEGER := 0;
    v_member_count INTEGER;
    v_condition_met BOOLEAN;
BEGIN
    SELECT * INTO v_crew FROM crews WHERE id = p_crew_id;
    SELECT COUNT(*) INTO v_member_count FROM crew_members WHERE crew_id = p_crew_id AND status = 'active';

    FOR v_achievement IN SELECT * FROM crew_achievements WHERE is_active = true LOOP
        -- Vérifier si déjà débloqué
        CONTINUE WHEN EXISTS (
            SELECT 1 FROM crew_unlocked_achievements
            WHERE crew_id = p_crew_id AND achievement_id = v_achievement.id
        );

        -- Vérifier la condition
        v_condition_met := false;

        CASE v_achievement.condition_type
            WHEN 'members_count' THEN
                v_condition_met := v_member_count >= v_achievement.condition_value;
            WHEN 'total_xp' THEN
                v_condition_met := v_crew.total_xp >= v_achievement.condition_value;
            WHEN 'events_attended' THEN
                v_condition_met := v_crew.total_events_attended >= v_achievement.condition_value;
            WHEN 'challenges_won' THEN
                v_condition_met := v_crew.total_challenges_won >= v_achievement.condition_value;
            ELSE
                v_condition_met := false;
        END CASE;

        IF v_condition_met THEN
            INSERT INTO crew_unlocked_achievements (crew_id, achievement_id)
            VALUES (p_crew_id, v_achievement.id);

            INSERT INTO crew_activity_log (crew_id, activity_type, description, xp_amount)
            VALUES (p_crew_id, 'achievement_unlocked', 'Badge débloqué: ' || v_achievement.name, v_achievement.xp_reward);

            v_unlocked_count := v_unlocked_count + 1;
        END IF;
    END LOOP;

    RETURN v_unlocked_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_crew_leaderboard
-- ============================================================================

CREATE OR REPLACE FUNCTION get_crew_leaderboard(
    p_period VARCHAR(20) DEFAULT 'all_time', -- all_time, weekly, monthly
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank BIGINT,
    crew_id UUID,
    name VARCHAR(50),
    slug VARCHAR(50),
    avatar_url TEXT,
    color VARCHAR(7),
    total_xp BIGINT,
    member_count BIGINT,
    average_level DECIMAL(5,2),
    owner_pseudo VARCHAR(50)
) AS $$
BEGIN
    IF p_period = 'weekly' THEN
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY cws.xp_earned DESC) as rank,
            c.id as crew_id,
            c.name,
            c.slug,
            c.avatar_url,
            c.color,
            cws.xp_earned as total_xp,
            (SELECT COUNT(*) FROM crew_members WHERE crew_id = c.id AND status = 'active') as member_count,
            c.average_level,
            p.pseudo as owner_pseudo
        FROM crews c
        JOIN profiles p ON c.owner_id = p.id
        LEFT JOIN crew_weekly_stats cws ON c.id = cws.crew_id
            AND cws.week_start = DATE_TRUNC('week', CURRENT_DATE)::DATE
        ORDER BY cws.xp_earned DESC NULLS LAST
        LIMIT p_limit;
    ELSE
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY c.total_xp DESC) as rank,
            c.id as crew_id,
            c.name,
            c.slug,
            c.avatar_url,
            c.color,
            c.total_xp,
            (SELECT COUNT(*) FROM crew_members WHERE crew_id = c.id AND status = 'active') as member_count,
            c.average_level,
            p.pseudo as owner_pseudo
        FROM crews c
        JOIN profiles p ON c.owner_id = p.id
        ORDER BY c.total_xp DESC
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_user_crew
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_crew(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_crew RECORD;
    v_member RECORD;
    v_members JSONB;
    v_achievements JSONB;
BEGIN
    -- Trouver le crew de l'utilisateur
    SELECT cm.*, c.*
    INTO v_member
    FROM crew_members cm
    JOIN crews c ON cm.crew_id = c.id
    WHERE cm.user_id = p_user_id AND cm.status = 'active'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('has_crew', false);
    END IF;

    -- Récupérer les membres
    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', cm.user_id,
            'pseudo', p.pseudo,
            'avatar_url', p.avatar_url,
            'level', p.level,
            'role', cm.role,
            'xp_contributed', cm.xp_contributed,
            'joined_at', cm.joined_at
        ) ORDER BY
            CASE cm.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
            cm.xp_contributed DESC
    )
    INTO v_members
    FROM crew_members cm
    JOIN profiles p ON cm.user_id = p.id
    WHERE cm.crew_id = v_member.crew_id AND cm.status = 'active';

    -- Récupérer les achievements
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', ca.id,
            'name', ca.name,
            'description', ca.description,
            'icon', ca.icon,
            'color', ca.color,
            'rarity', ca.rarity,
            'unlocked_at', cua.unlocked_at
        )
    )
    INTO v_achievements
    FROM crew_unlocked_achievements cua
    JOIN crew_achievements ca ON cua.achievement_id = ca.id
    WHERE cua.crew_id = v_member.crew_id;

    RETURN jsonb_build_object(
        'has_crew', true,
        'crew', jsonb_build_object(
            'id', v_member.crew_id,
            'name', v_member.name,
            'slug', v_member.slug,
            'description', v_member.description,
            'motto', v_member.motto,
            'avatar_url', v_member.avatar_url,
            'banner_url', v_member.banner_url,
            'color', v_member.color,
            'total_xp', v_member.total_xp,
            'average_level', v_member.average_level,
            'total_events_attended', v_member.total_events_attended,
            'total_challenges_won', v_member.total_challenges_won,
            'max_members', v_member.max_members,
            'is_public', v_member.is_public,
            'requires_approval', v_member.requires_approval,
            'created_at', v_member.created_at
        ),
        'user_role', v_member.role,
        'members', COALESCE(v_members, '[]'::jsonb),
        'achievements', COALESCE(v_achievements, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_unlocked_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_weekly_stats ENABLE ROW LEVEL SECURITY;

-- Crews: Public read, write for authenticated
CREATE POLICY "crews_public_read" ON crews FOR SELECT USING (is_public = true);
CREATE POLICY "crews_member_read" ON crews FOR SELECT USING (
    EXISTS (SELECT 1 FROM crew_members WHERE crew_id = id AND user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "crews_owner_write" ON crews FOR ALL USING (owner_id = auth.uid());

-- Members: Visible aux membres, modifiable par admins
CREATE POLICY "crew_members_read" ON crew_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM crew_members cm WHERE cm.crew_id = crew_members.crew_id AND cm.user_id = auth.uid() AND cm.status = 'active')
);
CREATE POLICY "crew_members_write" ON crew_members FOR ALL USING (
    EXISTS (
        SELECT 1 FROM crew_members cm
        WHERE cm.crew_id = crew_members.crew_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.status = 'active'
    )
);

-- Invitations
CREATE POLICY "crew_invitations_invitee" ON crew_invitations FOR SELECT USING (invitee_id = auth.uid());
CREATE POLICY "crew_invitations_crew_admin" ON crew_invitations FOR ALL USING (
    EXISTS (
        SELECT 1 FROM crew_members cm
        WHERE cm.crew_id = crew_invitations.crew_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.status = 'active'
    )
);

-- Join requests
CREATE POLICY "crew_join_requests_user" ON crew_join_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "crew_join_requests_admin" ON crew_join_requests FOR ALL USING (
    EXISTS (
        SELECT 1 FROM crew_members cm
        WHERE cm.crew_id = crew_join_requests.crew_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.status = 'active'
    )
);

-- Achievements: Public read
CREATE POLICY "crew_achievements_read" ON crew_achievements FOR SELECT USING (true);

-- Unlocked achievements: Visible aux membres
CREATE POLICY "crew_unlocked_achievements_read" ON crew_unlocked_achievements FOR SELECT USING (
    EXISTS (SELECT 1 FROM crew_members WHERE crew_id = crew_unlocked_achievements.crew_id AND user_id = auth.uid() AND status = 'active')
);

-- Activity log: Visible aux membres
CREATE POLICY "crew_activity_log_read" ON crew_activity_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM crew_members WHERE crew_id = crew_activity_log.crew_id AND user_id = auth.uid() AND status = 'active')
);

-- Weekly stats: Public read
CREATE POLICY "crew_weekly_stats_read" ON crew_weekly_stats FOR SELECT USING (true);

-- ============================================================================
-- TRIGGER: Auto-update crew stats on member XP change
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_crew_member_contribution()
RETURNS TRIGGER AS $$
BEGIN
    -- Si XP a changé, mettre à jour la contribution
    IF TG_OP = 'UPDATE' AND OLD.total_xp IS DISTINCT FROM NEW.total_xp THEN
        UPDATE crew_members
        SET xp_contributed = xp_contributed + (NEW.total_xp - COALESCE(OLD.total_xp, 0)),
            last_active_at = NOW()
        WHERE user_id = NEW.id AND status = 'active';

        -- Mettre à jour les stats de tous les crews où l'utilisateur est membre
        PERFORM update_crew_stats(crew_id)
        FROM crew_members
        WHERE user_id = NEW.id AND status = 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur profiles pour tracker l'XP
DROP TRIGGER IF EXISTS on_profile_xp_change ON profiles;
CREATE TRIGGER on_profile_xp_change
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_crew_member_contribution();
