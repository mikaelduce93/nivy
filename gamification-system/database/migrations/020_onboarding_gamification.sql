-- =============================================
-- MIGRATION 020: ONBOARDING GAMIFIÉ
-- =============================================
-- Ajoute le système de gamification pour l'onboarding:
-- - Table de tracking pré-inscription
-- - Missions d'onboarding
-- - Achievements d'onboarding
-- - Fonction de synchronisation post-inscription
-- =============================================

-- ==========================================
-- PARTIE 1: TABLE ONBOARDING_PROGRESS
-- ==========================================

-- Table pour tracker la progression avant création de compte
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiant temporaire (généré côté client avant inscription)
  temp_user_id UUID UNIQUE NOT NULL,

  -- Completion des étapes
  welcome_completed BOOLEAN DEFAULT false,
  welcome_completed_at TIMESTAMPTZ,
  showcase_completed BOOLEAN DEFAULT false,
  showcase_completed_at TIMESTAMPTZ,
  profile_type_completed BOOLEAN DEFAULT false,
  profile_type_completed_at TIMESTAMPTZ,
  setup_completed BOOLEAN DEFAULT false,
  setup_completed_at TIMESTAMPTZ,
  features_completed BOOLEAN DEFAULT false,
  features_completed_at TIMESTAMPTZ,
  completion_completed BOOLEAN DEFAULT false,
  completion_completed_at TIMESTAMPTZ,

  -- XP accumulé pendant l'onboarding
  accumulated_xp INTEGER DEFAULT 0,

  -- Badges gagnés (codes)
  earned_badges TEXT[] DEFAULT '{}',

  -- Coins bonus
  bonus_coins INTEGER DEFAULT 0,

  -- Type d'utilisateur sélectionné
  user_type VARCHAR(10) CHECK (user_type IN ('parent', 'teen')),

  -- Timing (pour badge speedrunner)
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Données formulaire (optionnel, pour reprise)
  form_data JSONB DEFAULT '{}',

  -- Synced vers un vrai compte?
  synced_to_teen_id UUID REFERENCES public.teens(id),
  synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.onboarding_progress IS 'Tracking de progression onboarding avant création de compte';

-- Index pour recherche rapide
CREATE INDEX idx_onboarding_temp_user ON public.onboarding_progress(temp_user_id);
CREATE INDEX idx_onboarding_not_synced ON public.onboarding_progress(synced_to_teen_id) WHERE synced_to_teen_id IS NULL;

-- ==========================================
-- PARTIE 2: EXTENSION MISSION_TEMPLATES
-- ==========================================

-- Ajouter 'onboarding' comme type de mission valide
-- Note: Si la contrainte existe déjà, on la supprime et recrée
ALTER TABLE public.mission_templates
  DROP CONSTRAINT IF EXISTS mission_templates_mission_type_check;

ALTER TABLE public.mission_templates
  ADD CONSTRAINT mission_templates_mission_type_check
  CHECK (mission_type IN ('daily', 'weekly', 'monthly', 'seasonal', 'special', 'onboarding'));

-- ==========================================
-- PARTIE 3: MISSIONS D'ONBOARDING
-- ==========================================

INSERT INTO public.mission_templates (
  code, name, description, mission_type, category,
  xp_reward, objective_type, objective_target,
  icon, difficulty, is_repeatable, bonus_rewards, sort_order
) VALUES
-- Étape 1: Welcome
(
  'onboarding_welcome',
  'Premier Contact',
  'Commence ton aventure Teen Club!',
  'onboarding',
  'loyalty',
  10,
  'count',
  1,
  'hand-wave',
  'easy',
  false,
  '{}',
  1
),
-- Étape 2: Showcase
(
  'onboarding_discover',
  'Explorateur',
  'Découvre les activités Teen Club',
  'onboarding',
  'exploration',
  15,
  'count',
  1,
  'compass',
  'easy',
  false,
  '{}',
  2
),
-- Étape 3: Profile Type
(
  'onboarding_choose_path',
  'Choix du Destin',
  'Choisis ton type de compte',
  'onboarding',
  'participation',
  20,
  'count',
  1,
  'git-branch',
  'easy',
  false,
  '{}',
  3
),
-- Étape 4: Setup
(
  'onboarding_setup',
  'Profil Créé',
  'Configure ton profil Teen Club',
  'onboarding',
  'participation',
  30,
  'count',
  1,
  'user-check',
  'normal',
  false,
  '{}',
  4
),
-- Étape 5: Features
(
  'onboarding_features',
  'Maître des Features',
  'Explore toutes les fonctionnalités',
  'onboarding',
  'exploration',
  25,
  'count',
  1,
  'sparkles',
  'easy',
  false,
  '{}',
  5
),
-- Étape 6: Completion
(
  'onboarding_complete',
  'Bienvenue dans la Famille!',
  'Termine ton onboarding et rejoins la communauté',
  'onboarding',
  'loyalty',
  50,
  'count',
  1,
  'party-popper',
  'normal',
  false,
  '{"coins": 50}',
  6
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  bonus_rewards = EXCLUDED.bonus_rewards,
  updated_at = NOW();

-- ==========================================
-- PARTIE 4: ACHIEVEMENTS D'ONBOARDING
-- ==========================================

-- Ajouter updated_at si manquant
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

INSERT INTO public.achievements (
  code, name, description, category, rarity,
  points, xp_reward, icon, color_gradient,
  requirement_type, requirement_value, requirement_data,
  is_active, is_secret
) VALUES
-- Badge principal: Nouveau Membre
(
  'onboarding_starter',
  'Nouveau Membre',
  'Bienvenue dans la famille Teen Club!',
  'special',
  'common',
  25,
  50,
  'baby',
  'from-cyan-400 to-blue-500',
  'first_action',
  1,
  '{"trigger": "onboarding_complete"}',
  true,
  false
),
-- Badge explorateur: Curieux
(
  'onboarding_curious',
  'Curieux',
  'Tu as exploré toutes les fonctionnalités',
  'special',
  'common',
  30,
  50,
  'search',
  'from-purple-400 to-pink-500',
  'first_action',
  1,
  '{"trigger": "features_explored"}',
  true,
  false
),
-- Badge caché: Speed Runner
(
  'onboarding_speedrunner',
  'Speed Runner',
  'Onboarding complété en moins de 3 minutes!',
  'special',
  'rare',
  75,
  100,
  'timer',
  'from-yellow-400 to-orange-500',
  'time_based',
  180,
  '{"max_seconds": 180, "trigger": "onboarding_fast"}',
  true,
  true  -- Badge secret!
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  requirement_data = EXCLUDED.requirement_data,
  updated_at = NOW();

-- ==========================================
-- PARTIE 5: FONCTIONS
-- ==========================================

-- Fonction pour initialiser le tracking onboarding
CREATE OR REPLACE FUNCTION init_onboarding_progress(
  p_temp_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress RECORD;
BEGIN
  -- Vérifier si déjà existant
  SELECT * INTO v_progress
  FROM public.onboarding_progress
  WHERE temp_user_id = p_temp_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'resumed',
      'progress', row_to_json(v_progress)
    );
  END IF;

  -- Créer nouveau
  INSERT INTO public.onboarding_progress (temp_user_id, started_at)
  VALUES (p_temp_user_id, NOW())
  RETURNING * INTO v_progress;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'created',
    'progress', row_to_json(v_progress)
  );
END;
$$;

-- Fonction pour enregistrer la completion d'une étape
CREATE OR REPLACE FUNCTION record_onboarding_step(
  p_temp_user_id UUID,
  p_step VARCHAR(50),
  p_xp INTEGER DEFAULT 0,
  p_user_type VARCHAR(10) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress RECORD;
  v_update_sql TEXT;
BEGIN
  -- Construire la mise à jour dynamique selon l'étape
  CASE p_step
    WHEN 'welcome' THEN
      UPDATE public.onboarding_progress
      SET
        welcome_completed = true,
        welcome_completed_at = NOW(),
        accumulated_xp = accumulated_xp + p_xp,
        updated_at = NOW()
      WHERE temp_user_id = p_temp_user_id
      RETURNING * INTO v_progress;

    WHEN 'showcase' THEN
      UPDATE public.onboarding_progress
      SET
        showcase_completed = true,
        showcase_completed_at = NOW(),
        accumulated_xp = accumulated_xp + p_xp,
        updated_at = NOW()
      WHERE temp_user_id = p_temp_user_id
      RETURNING * INTO v_progress;

    WHEN 'profile-type' THEN
      UPDATE public.onboarding_progress
      SET
        profile_type_completed = true,
        profile_type_completed_at = NOW(),
        accumulated_xp = accumulated_xp + p_xp,
        user_type = COALESCE(p_user_type, user_type),
        updated_at = NOW()
      WHERE temp_user_id = p_temp_user_id
      RETURNING * INTO v_progress;

    WHEN 'setup', 'parent-setup', 'teen-setup' THEN
      UPDATE public.onboarding_progress
      SET
        setup_completed = true,
        setup_completed_at = NOW(),
        accumulated_xp = accumulated_xp + p_xp,
        updated_at = NOW()
      WHERE temp_user_id = p_temp_user_id
      RETURNING * INTO v_progress;

    WHEN 'features' THEN
      UPDATE public.onboarding_progress
      SET
        features_completed = true,
        features_completed_at = NOW(),
        accumulated_xp = accumulated_xp + p_xp,
        earned_badges = array_append(earned_badges, 'onboarding_curious'),
        updated_at = NOW()
      WHERE temp_user_id = p_temp_user_id
      RETURNING * INTO v_progress;

    WHEN 'completion' THEN
      UPDATE public.onboarding_progress
      SET
        completion_completed = true,
        completion_completed_at = NOW(),
        completed_at = NOW(),
        accumulated_xp = accumulated_xp + p_xp,
        bonus_coins = 50,
        earned_badges = array_append(earned_badges, 'onboarding_starter'),
        updated_at = NOW()
      WHERE temp_user_id = p_temp_user_id
      RETURNING * INTO v_progress;

    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Unknown step: ' || p_step);
  END CASE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Onboarding progress not found');
  END IF;

  -- Vérifier badge speedrunner si c'est la completion
  IF p_step = 'completion' THEN
    DECLARE
      v_duration_seconds INTEGER;
    BEGIN
      v_duration_seconds := EXTRACT(EPOCH FROM (v_progress.completed_at - v_progress.started_at));

      IF v_duration_seconds <= 180 THEN
        UPDATE public.onboarding_progress
        SET
          earned_badges = array_append(earned_badges, 'onboarding_speedrunner'),
          accumulated_xp = accumulated_xp + 100
        WHERE temp_user_id = p_temp_user_id
        RETURNING * INTO v_progress;
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'step', p_step,
    'xp_gained', p_xp,
    'total_xp', v_progress.accumulated_xp,
    'earned_badges', v_progress.earned_badges,
    'bonus_coins', v_progress.bonus_coins
  );
END;
$$;

-- Fonction pour synchroniser vers un compte utilisateur
CREATE OR REPLACE FUNCTION sync_onboarding_to_user(
  p_temp_user_id UUID,
  p_teen_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress RECORD;
  v_badge TEXT;
  v_xp_result JSONB;
BEGIN
  -- Récupérer la progression
  SELECT * INTO v_progress
  FROM public.onboarding_progress
  WHERE temp_user_id = p_temp_user_id
    AND synced_to_teen_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Onboarding progress not found or already synced'
    );
  END IF;

  -- Vérifier que l'onboarding est complété
  IF NOT v_progress.completion_completed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Onboarding not completed'
    );
  END IF;

  -- Ajouter l'XP accumulé
  IF v_progress.accumulated_xp > 0 THEN
    SELECT add_xp_to_user(
      p_teen_id,
      v_progress.accumulated_xp,
      'onboarding',
      'onboarding',
      v_progress.id,
      'XP gagné pendant l''onboarding'
    ) INTO v_xp_result;
  END IF;

  -- Ajouter les coins bonus
  IF v_progress.bonus_coins > 0 THEN
    PERFORM add_coins_to_user(
      p_teen_id,
      v_progress.bonus_coins,
      'onboarding_bonus',
      'Bonus de bienvenue'
    );
  END IF;

  -- Débloquer les badges gagnés
  FOREACH v_badge IN ARRAY v_progress.earned_badges
  LOOP
    PERFORM unlock_achievement(p_teen_id, v_badge);
  END LOOP;

  -- Marquer comme synchronisé
  UPDATE public.onboarding_progress
  SET
    synced_to_teen_id = p_teen_id,
    synced_at = NOW(),
    updated_at = NOW()
  WHERE temp_user_id = p_temp_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'teen_id', p_teen_id,
    'xp_synced', v_progress.accumulated_xp,
    'coins_synced', v_progress.bonus_coins,
    'badges_synced', v_progress.earned_badges
  );
END;
$$;

-- Fonction pour récupérer la progression
CREATE OR REPLACE FUNCTION get_onboarding_progress(
  p_temp_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress RECORD;
BEGIN
  SELECT * INTO v_progress
  FROM public.onboarding_progress
  WHERE temp_user_id = p_temp_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'progress', jsonb_build_object(
      'temp_user_id', v_progress.temp_user_id,
      'steps', jsonb_build_object(
        'welcome', v_progress.welcome_completed,
        'showcase', v_progress.showcase_completed,
        'profile_type', v_progress.profile_type_completed,
        'setup', v_progress.setup_completed,
        'features', v_progress.features_completed,
        'completion', v_progress.completion_completed
      ),
      'accumulated_xp', v_progress.accumulated_xp,
      'earned_badges', v_progress.earned_badges,
      'bonus_coins', v_progress.bonus_coins,
      'user_type', v_progress.user_type,
      'started_at', v_progress.started_at,
      'completed_at', v_progress.completed_at,
      'is_synced', v_progress.synced_to_teen_id IS NOT NULL
    )
  );
END;
$$;

-- ==========================================
-- PARTIE 6: RLS POLICIES
-- ==========================================

-- Activer RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre l'accès anonyme basé sur temp_user_id
-- (l'utilisateur doit connaître son temp_user_id pour accéder)
CREATE POLICY "Allow anonymous onboarding access"
  ON public.onboarding_progress
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: En production, on pourrait restreindre davantage avec un token JWT anon

-- ==========================================
-- PARTIE 7: CLEANUP (optionnel)
-- ==========================================

-- Fonction pour nettoyer les anciennes progressions non sync (30 jours)
CREATE OR REPLACE FUNCTION cleanup_old_onboarding_progress()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.onboarding_progress
  WHERE synced_to_teen_id IS NULL
    AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- ==========================================
-- COMMENTAIRES
-- ==========================================

COMMENT ON FUNCTION init_onboarding_progress IS 'Initialise ou reprend le tracking onboarding pour un utilisateur temporaire';
COMMENT ON FUNCTION record_onboarding_step IS 'Enregistre la completion d''une étape et ajoute les XP correspondants';
COMMENT ON FUNCTION sync_onboarding_to_user IS 'Synchronise tout le progrès onboarding vers un compte utilisateur créé';
COMMENT ON FUNCTION get_onboarding_progress IS 'Récupère la progression onboarding d''un utilisateur temporaire';
COMMENT ON FUNCTION cleanup_old_onboarding_progress IS 'Nettoie les progressions non sync de plus de 30 jours';
