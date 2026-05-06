-- WARNING: this file shares its numeric prefix or filename with another migration.
-- See gamification-system/database/MIGRATION_ORDER.md for the collision matrix
-- and the renumbering plan. Do not add new migrations until the collisions
-- have been resolved with the deployed Supabase instance.

-- ============================================================================
-- TEENS PARTY MOROCCO - Intelligent Content Generation System
-- ============================================================================
-- Migration: 025_intelligent_content_system.sql
-- Description: Système intelligent de génération basé sur profilage avancé,
-- algorithme ML, vérification factuelle et adaptation dynamique
-- ============================================================================

-- ============================================================================
-- TEEN BEHAVIORAL PROFILE (Profil Comportemental Avancé)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.teen_behavioral_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL UNIQUE REFERENCES public.teens(id) ON DELETE CASCADE,
  
  -- Profil d'apprentissage
  learning_style VARCHAR(50), -- 'visual', 'auditory', 'kinesthetic', 'reading'
  attention_span_minutes INTEGER DEFAULT 15,
  preferred_difficulty VARCHAR(20) DEFAULT 'normal', -- Calculé dynamiquement
  optimal_quiz_length INTEGER DEFAULT 10, -- Nombre optimal de questions
  
  -- Patterns de performance
  average_quiz_score DECIMAL(5,2) DEFAULT 0.0,
  best_subject VARCHAR(50),
  struggling_subject VARCHAR(50),
  improvement_rate DECIMAL(5,2) DEFAULT 0.0, -- % d'amélioration mensuel
  
  -- Patterns temporels
  most_active_hour INTEGER, -- Heure de la journée (0-23)
  most_active_day VARCHAR(10), -- Jour de la semaine
  average_session_duration_minutes INTEGER DEFAULT 20,
  
  -- Préférences de contenu
  preferred_content_types TEXT[] DEFAULT '{}', -- ['quiz', 'video', 'interactive']
  preferred_subjects TEXT[] DEFAULT '{}',
  avoided_subjects TEXT[] DEFAULT '{}',
  
  -- Engagement
  engagement_score DECIMAL(5,2) DEFAULT 50.0, -- 0-100
  completion_rate DECIMAL(5,2) DEFAULT 0.0, -- % de complétion
  abandonment_rate DECIMAL(5,2) DEFAULT 0.0, -- % d'abandon
  
  -- Métadonnées
  last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  analysis_version INTEGER DEFAULT 1,
  confidence_score DECIMAL(5,2) DEFAULT 0.0, -- Confiance dans le profil (0-100)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavioral_profile_teen ON public.teen_behavioral_profile(teen_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_profile_engagement ON public.teen_behavioral_profile(engagement_score DESC);

-- ============================================================================
-- CONTENT PERFORMANCE TRACKING (Suivi des Performances du Contenu)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence au contenu
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  
  -- Métriques d'engagement
  total_attempts INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0.0,
  average_score DECIMAL(5,2) DEFAULT 0.0,
  average_time_seconds INTEGER DEFAULT 0,
  
  -- Métriques de qualité
  user_satisfaction_score DECIMAL(5,2) DEFAULT 0.0, -- Basé sur feedback
  error_report_count INTEGER DEFAULT 0,
  accuracy_score DECIMAL(5,2) DEFAULT 100.0, -- % de réponses correctes (pour quiz)
  
  -- Métriques par profil
  performance_by_grade_level JSONB DEFAULT '{}', -- {grade_level: {avg_score, attempts}}
  performance_by_difficulty JSONB DEFAULT '{}',
  
  -- Détection de problèmes
  flagged_issues TEXT[] DEFAULT '{}', -- ['incorrect_answer', 'too_hard', 'too_easy']
  last_issue_detected_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_content_perf_type ON public.content_performance_metrics(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_perf_accuracy ON public.content_performance_metrics(accuracy_score) WHERE accuracy_score < 95;

-- ============================================================================
-- FACTUAL VERIFICATION (Vérification Factuelle)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_factual_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence au contenu
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  
  -- Vérification
  verification_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (verification_status IN (
    'pending', 'verified', 'partially_verified', 'failed', 'needs_review'
  )),
  
  -- Sources de vérification
  verification_sources JSONB DEFAULT '[]', -- [{source: 'wikipedia', url: '...', verified: true}]
  verification_method VARCHAR(50), -- 'manual', 'api', 'cross_reference', 'expert_review'
  
  -- Résultats
  facts_verified INTEGER DEFAULT 0,
  facts_total INTEGER DEFAULT 0,
  verification_score DECIMAL(5,2) DEFAULT 0.0, -- % de faits vérifiés
  
  -- Expert review
  reviewed_by_expert BOOLEAN DEFAULT false,
  expert_id UUID REFERENCES public.profiles(id),
  expert_notes TEXT,
  
  -- Timestamps
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_factual_verification_status ON public.content_factual_verification(verification_status);
CREATE INDEX IF NOT EXISTS idx_factual_verification_score ON public.content_factual_verification(verification_score) WHERE verification_score < 100;

-- ============================================================================
-- RECOMMENDATION ENGINE (Moteur de Recommandation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  
  -- Contenu recommandé
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  
  -- Score de recommandation
  recommendation_score DECIMAL(5,2) NOT NULL, -- 0-100
  confidence_level DECIMAL(5,2) DEFAULT 0.0, -- Confiance dans la recommandation
  
  -- Facteurs de recommandation
  recommendation_factors JSONB DEFAULT '{}', -- {
  --   behavioral_match: 30,
  --   performance_based: 25,
  --   difficulty_match: 20,
  --   subject_preference: 15,
  --   novelty: 10
  -- }
  
  -- Statut
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'shown', 'accepted', 'rejected', 'completed', 'expired'
  )),
  
  -- Feedback
  user_feedback VARCHAR(20), -- 'liked', 'disliked', 'too_easy', 'too_hard'
  actual_performance DECIMAL(5,2), -- Score réel obtenu
  
  -- Timestamps
  recommended_at TIMESTAMPTZ DEFAULT NOW(),
  shown_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  UNIQUE(teen_id, content_type, content_id, recommended_at::DATE)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_teen ON public.content_recommendations(teen_id, status);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON public.content_recommendations(recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_pending ON public.content_recommendations(status) WHERE status = 'pending';

-- ============================================================================
-- ADAPTIVE LEARNING TRACKER (Suivi d'Apprentissage Adaptatif)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.adaptive_learning_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  
  -- État d'apprentissage actuel
  current_skill_level JSONB DEFAULT '{}', -- {subject: {level, confidence}}
  learning_path JSONB DEFAULT '[]', -- Chemin d'apprentissage recommandé
  next_recommended_content JSONB DEFAULT '{}',
  
  -- Adaptation
  difficulty_adjustment DECIMAL(5,2) DEFAULT 0.0, -- Ajustement de difficulté (-50 à +50)
  pace_adjustment DECIMAL(5,2) DEFAULT 0.0, -- Ajustement du rythme
  
  -- Progression
  mastery_topics TEXT[] DEFAULT '{}', -- Sujets maîtrisés
  struggling_topics TEXT[] DEFAULT '{}', -- Sujets en difficulté
  next_focus_areas TEXT[] DEFAULT '{}', -- Zones à travailler
  
  -- Métadonnées
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  algorithm_version VARCHAR(20) DEFAULT 'v1.0',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(teen_id)
);

CREATE INDEX IF NOT EXISTS idx_adaptive_learning_teen ON public.adaptive_learning_tracker(teen_id);

-- ============================================================================
-- CONTENT RELIABILITY SCORE (Score de Fiabilité du Contenu)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_reliability_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence au contenu
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  
  -- Score global de fiabilité (0-100)
  reliability_score DECIMAL(5,2) DEFAULT 0.0,
  
  -- Composantes du score
  factual_accuracy DECIMAL(5,2) DEFAULT 0.0, -- Vérification factuelle
  user_accuracy DECIMAL(5,2) DEFAULT 0.0, -- Précision basée sur utilisateurs
  expert_validation DECIMAL(5,2) DEFAULT 0.0, -- Validation experte
  performance_consistency DECIMAL(5,2) DEFAULT 0.0, -- Cohérence des performances
  
  -- Métadonnées
  calculation_method VARCHAR(50) DEFAULT 'weighted_average',
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  confidence_interval DECIMAL(5,2) DEFAULT 0.0, -- Intervalle de confiance
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_reliability_score ON public.content_reliability_scores(reliability_score DESC);
CREATE INDEX IF NOT EXISTS idx_reliability_low ON public.content_reliability_scores(reliability_score) WHERE reliability_score < 70;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour calculer le profil comportemental d'un teen
CREATE OR REPLACE FUNCTION calculate_teen_behavioral_profile(p_teen_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile JSONB;
  v_avg_score DECIMAL(5,2);
  v_completion_rate DECIMAL(5,2);
  v_best_subject VARCHAR(50);
  v_struggling_subject VARCHAR(50);
  v_total_attempts INTEGER;
  v_total_completions INTEGER;
BEGIN
  -- Calculer moyenne des scores de quiz
  SELECT 
    COALESCE(AVG(score), 0),
    COUNT(*) FILTER (WHERE passed = true),
    COUNT(*)
  INTO v_avg_score, v_total_completions, v_total_attempts
  FROM public.quiz_attempts
  WHERE teen_id = p_teen_id;
  
  v_completion_rate := CASE 
    WHEN v_total_attempts > 0 THEN (v_total_completions::DECIMAL / v_total_attempts * 100)
    ELSE 0
  END;
  
  -- Trouver meilleure et pire matière
  SELECT subject INTO v_best_subject
  FROM public.quiz_attempts qa
  JOIN public.educational_quizzes eq ON qa.quiz_id = eq.id
  WHERE qa.teen_id = p_teen_id
  GROUP BY subject
  ORDER BY AVG(qa.score) DESC
  LIMIT 1;
  
  SELECT subject INTO v_struggling_subject
  FROM public.quiz_attempts qa
  JOIN public.educational_quizzes eq ON qa.quiz_id = eq.id
  WHERE qa.teen_id = p_teen_id
  GROUP BY subject
  ORDER BY AVG(qa.score) ASC
  LIMIT 1;
  
  -- Construire le profil
  v_profile := jsonb_build_object(
    'average_score', v_avg_score,
    'completion_rate', v_completion_rate,
    'best_subject', v_best_subject,
    'struggling_subject', v_struggling_subject,
    'total_attempts', v_total_attempts,
    'total_completions', v_total_completions
  );
  
  RETURN v_profile;
END;
$$;

-- Fonction pour calculer le score de fiabilité d'un contenu
CREATE OR REPLACE FUNCTION calculate_content_reliability(
  p_content_type VARCHAR(50),
  p_content_id UUID
)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_factual_score DECIMAL(5,2) := 0.0;
  v_user_accuracy DECIMAL(5,2) := 0.0;
  v_expert_validation DECIMAL(5,2) := 0.0;
  v_performance_consistency DECIMAL(5,2) := 0.0;
  v_reliability_score DECIMAL(5,2) := 0.0;
BEGIN
  -- Score factuel (vérification factuelle)
  SELECT COALESCE(verification_score, 0) INTO v_factual_score
  FROM public.content_factual_verification
  WHERE content_type = p_content_type AND content_id = p_content_id;
  
  -- Score utilisateur (précision basée sur les résultats)
  SELECT COALESCE(accuracy_score, 0) INTO v_user_accuracy
  FROM public.content_performance_metrics
  WHERE content_type = p_content_type AND content_id = p_content_id;
  
  -- Score expert (validation experte)
  SELECT CASE 
    WHEN reviewed_by_expert = true THEN 100.0
    ELSE 0.0
  END INTO v_expert_validation
  FROM public.content_factual_verification
  WHERE content_type = p_content_type AND content_id = p_content_id;
  
  -- Score de cohérence (écart-type des performances)
  SELECT CASE
    WHEN COUNT(*) > 10 THEN 
      100.0 - LEAST(50.0, STDDEV(score) * 2)
    ELSE 50.0
  END INTO v_performance_consistency
  FROM public.quiz_attempts qa
  JOIN public.educational_quizzes eq ON qa.quiz_id = eq.id
  WHERE eq.id = p_content_id
  GROUP BY eq.id;
  
  -- Score global (moyenne pondérée)
  v_reliability_score := (
    v_factual_score * 0.35 +
    v_user_accuracy * 0.30 +
    v_expert_validation * 0.20 +
    v_performance_consistency * 0.15
  );
  
  RETURN LEAST(100.0, GREATEST(0.0, v_reliability_score));
END;
$$;

COMMENT ON TABLE public.teen_behavioral_profile IS 'Profil comportemental avancé de l''adolescent pour personnalisation intelligente';
COMMENT ON TABLE public.content_performance_metrics IS 'Métriques de performance du contenu pour amélioration continue';
COMMENT ON TABLE public.content_factual_verification IS 'Vérification factuelle du contenu généré';
COMMENT ON TABLE public.content_recommendations IS 'Recommandations intelligentes basées sur ML';
COMMENT ON TABLE public.adaptive_learning_tracker IS 'Suivi d''apprentissage adaptatif';
COMMENT ON TABLE public.content_reliability_scores IS 'Scores de fiabilité du contenu';


