-- WARNING: this file shares its numeric prefix or filename with another migration.
-- See gamification-system/database/MIGRATION_ORDER.md for the collision matrix
-- and the renumbering plan. Do not add new migrations until the collisions
-- have been resolved with the deployed Supabase instance.

-- ============================================================================
-- TEENS PARTY MOROCCO - Content Generation System
-- ============================================================================
-- Migration: 023_content_generation_system.sql
-- Description: Système de génération automatique de contenu (quiz, quêtes, défis)
-- basé sur le profil utilisateur et intégration avec outils externes (IA)
-- ============================================================================

-- ============================================================================
-- CONTENT GENERATION TRACKING
-- ============================================================================

-- Table pour tracker les générations de contenu
CREATE TABLE IF NOT EXISTS public.content_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type de contenu généré
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN (
    'quiz', 'mission', 'challenge', 'daily_challenge', 'quest'
  )),
  
  -- Cible (profil ou global)
  target_type VARCHAR(30) NOT NULL CHECK (target_type IN (
    'global', 'profile_based', 'grade_level', 'interest_based', 'custom'
  )),
  
  -- Paramètres de génération
  generation_params JSONB NOT NULL DEFAULT '{}', -- {grade_level, interests, profiles, etc.}
  
  -- Résultat
  generated_content_id UUID, -- ID du contenu généré (quiz_id, mission_id, etc.)
  generated_content_type VARCHAR(50), -- Type de la table cible
  
  -- Métadonnées
  ai_provider VARCHAR(50), -- 'openai', 'claude', 'manual'
  ai_model VARCHAR(100), -- 'gpt-4', 'claude-3-sonnet', etc.
  generation_time_ms INTEGER,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10, 6),
  
  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'generating', 'completed', 'failed', 'reviewed'
  )),
  error_message TEXT,
  
  -- Review (pour validation manuelle si nécessaire)
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_content_gen_type ON public.content_generation_logs(content_type);
CREATE INDEX IF NOT EXISTS idx_content_gen_status ON public.content_generation_logs(status);
CREATE INDEX IF NOT EXISTS idx_content_gen_date ON public.content_generation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_gen_target ON public.content_generation_logs(target_type);

-- ============================================================================
-- AI GENERATION TEMPLATES
-- ============================================================================

-- Templates pour guider la génération IA
CREATE TABLE IF NOT EXISTS public.ai_generation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type de contenu
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN (
    'quiz', 'mission', 'challenge', 'daily_challenge', 'quest'
  )),
  
  -- Catégorie/Contexte
  category VARCHAR(50), -- 'school', 'sport', 'crea', 'culture', etc.
  grade_level VARCHAR(20), -- '6eme', '5eme', etc.
  difficulty VARCHAR(20), -- 'easy', 'normal', 'hard', 'expert'
  
  -- Template de prompt
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  
  -- Paramètres de génération
  generation_config JSONB DEFAULT '{
    "temperature": 0.7,
    "max_tokens": 2000,
    "top_p": 1.0
  }'::jsonb,
  
  -- Validation rules
  validation_rules JSONB DEFAULT '{}', -- Règles pour valider le contenu généré
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Priorité d'utilisation
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 0.0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_templates_type ON public.ai_generation_templates(content_type, category);
CREATE INDEX IF NOT EXISTS idx_ai_templates_active ON public.ai_generation_templates(is_active) WHERE is_active = true;

-- ============================================================================
-- PERSONALIZED CONTENT ASSIGNMENTS
-- ============================================================================

-- Table pour assigner du contenu personnalisé aux utilisateurs
CREATE TABLE IF NOT EXISTS public.personalized_content_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Utilisateur
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  
  -- Contenu assigné
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  
  -- Raison de l'assignation
  assignment_reason VARCHAR(100), -- 'profile_match', 'grade_level', 'interest', 'recommendation'
  match_score DECIMAL(5, 2), -- Score de correspondance (0-100)
  
  -- Paramètres de match
  match_criteria JSONB DEFAULT '{}', -- {grade_level, interests, profiles, etc.}
  
  -- Statut
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN (
    'assigned', 'viewed', 'started', 'completed', 'skipped', 'expired'
  )),
  
  -- Dates
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Feedback
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,
  
  UNIQUE(teen_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_personalized_teen ON public.personalized_content_assignments(teen_id);
CREATE INDEX IF NOT EXISTS idx_personalized_status ON public.personalized_content_assignments(status);
CREATE INDEX IF NOT EXISTS idx_personalized_expires ON public.personalized_content_assignments(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- DAILY CONTENT GENERATION SCHEDULE
-- ============================================================================

-- Planning de génération quotidienne
CREATE TABLE IF NOT EXISTS public.daily_content_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Date cible
  target_date DATE NOT NULL UNIQUE,
  
  -- Contenu à générer
  content_plan JSONB NOT NULL DEFAULT '{
    "quizzes": {"count": 5, "subjects": []},
    "missions": {"count": 3, "categories": []},
    "challenges": {"count": 2, "types": []}
  }'::jsonb,
  
  -- Statut
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'generating', 'completed', 'failed', 'partial'
  )),
  
  -- Résultats
  generated_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  generation_log JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_daily_schedule_date ON public.daily_content_schedule(target_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_status ON public.daily_content_schedule(status);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour obtenir les paramètres de profil pour génération
CREATE OR REPLACE FUNCTION get_teen_generation_params(p_teen_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_params JSONB;
BEGIN
  SELECT jsonb_build_object(
    'grade_level', t.grade_level,
    'interests', t.interests,
    'profiles', t.profiles,
    'school', t.school,
    'age', EXTRACT(YEAR FROM AGE(t.date_of_birth))
  ) INTO v_params
  FROM public.teens t
  WHERE t.id = p_teen_id;
  
  RETURN COALESCE(v_params, '{}'::jsonb);
END;
$$;

-- Fonction pour calculer le score de correspondance
CREATE OR REPLACE FUNCTION calculate_content_match_score(
  p_teen_id UUID,
  p_content_params JSONB
)
RETURNS DECIMAL(5, 2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teen_params JSONB;
  v_score DECIMAL(5, 2) := 0.0;
  v_grade_match BOOLEAN := false;
  v_interest_match BOOLEAN := false;
  v_profile_match BOOLEAN := false;
BEGIN
  -- Récupérer les paramètres du teen
  v_teen_params := get_teen_generation_params(p_teen_id);
  
  -- Vérifier correspondance niveau scolaire
  IF p_content_params->>'grade_level' IS NOT NULL THEN
    v_grade_match := (v_teen_params->>'grade_level' = p_content_params->>'grade_level');
    IF v_grade_match THEN v_score := v_score + 30.0; END IF;
  END IF;
  
  -- Vérifier correspondance intérêts
  IF p_content_params->'interests' IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM jsonb_array_elements_text(p_content_params->'interests') AS interest
      WHERE interest = ANY(
        SELECT jsonb_array_elements_text(v_teen_params->'interests')
      )
    ) INTO v_interest_match;
    IF v_interest_match THEN v_score := v_score + 40.0; END IF;
  END IF;
  
  -- Vérifier correspondance profils (School/Sport/Créa)
  IF p_content_params->'profiles' IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM jsonb_array_elements_text(p_content_params->'profiles') AS profile
      WHERE profile = ANY(
        SELECT jsonb_array_elements_text(v_teen_params->'profiles')
      )
    ) INTO v_profile_match;
    IF v_profile_match THEN v_score := v_score + 30.0; END IF;
  END IF;
  
  RETURN LEAST(100.0, v_score);
END;
$$;

COMMENT ON TABLE public.content_generation_logs IS 'Logs de génération automatique de contenu';
COMMENT ON TABLE public.ai_generation_templates IS 'Templates pour guider la génération IA';
COMMENT ON TABLE public.personalized_content_assignments IS 'Assignations de contenu personnalisé aux utilisateurs';
COMMENT ON TABLE public.daily_content_schedule IS 'Planning de génération quotidienne de contenu';


