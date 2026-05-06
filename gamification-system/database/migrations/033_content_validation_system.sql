-- ============================================================================
-- TEENS PARTY MOROCCO - Content Validation & Moderation System
-- ============================================================================
-- Migration: 024_content_validation_system.sql
-- Description: Système de validation, modération et vérification du contenu généré
-- ============================================================================

-- ============================================================================
-- CONTENT VALIDATION & MODERATION
-- ============================================================================

-- Table pour la validation automatique et manuelle du contenu
CREATE TABLE IF NOT EXISTS public.content_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence au contenu
  content_type VARCHAR(50) NOT NULL, -- 'quiz', 'mission', 'challenge'
  content_id UUID NOT NULL,
  
  -- Statut de validation
  validation_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (validation_status IN (
    'pending',           -- En attente de validation
    'auto_validated',    -- Validé automatiquement
    'auto_rejected',     -- Rejeté automatiquement
    'manual_review',     -- Nécessite une revue manuelle
    'approved',          -- Approuvé manuellement
    'rejected',          -- Rejeté manuellement
    'needs_revision'     -- Nécessite des révisions
  )),
  
  -- Validation automatique
  auto_validation_score DECIMAL(5, 2), -- Score de qualité (0-100)
  auto_validation_checks JSONB DEFAULT '{}', -- Résultats des checks automatiques
  auto_validated_at TIMESTAMPTZ,
  
  -- Validation manuelle
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Métriques de qualité
  quality_metrics JSONB DEFAULT '{}', -- {accuracy, completeness, appropriateness, etc.}
  
  -- Flags
  has_errors BOOLEAN DEFAULT false,
  has_warnings BOOLEAN DEFAULT false,
  error_details JSONB DEFAULT '[]', -- Liste des erreurs détectées
  warning_details JSONB DEFAULT '[]', -- Liste des avertissements
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_content_validations_status ON public.content_validations(validation_status);
CREATE INDEX IF NOT EXISTS idx_content_validations_content ON public.content_validations(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_validations_pending ON public.content_validations(validation_status) WHERE validation_status IN ('pending', 'manual_review');

-- ============================================================================
-- CONTENT QUALITY RULES
-- ============================================================================

-- Règles de qualité pour valider le contenu
CREATE TABLE IF NOT EXISTS public.content_quality_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type de contenu
  content_type VARCHAR(50) NOT NULL,
  category VARCHAR(50), -- Optionnel, pour règles spécifiques
  
  -- Règles de validation
  validation_rules JSONB NOT NULL DEFAULT '{}', -- Règles spécifiques
  quality_threshold DECIMAL(5, 2) DEFAULT 70.0, -- Score minimum pour auto-approbation
  
  -- Exemples de règles:
  -- Pour quiz: min_questions, max_questions, required_fields, answer_format
  -- Pour missions: min_description_length, required_objectives
  -- Pour défis: safety_checks, age_appropriateness
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_rules_type ON public.content_quality_rules(content_type, category);
CREATE INDEX IF NOT EXISTS idx_quality_rules_active ON public.content_quality_rules(is_active) WHERE is_active = true;

-- ============================================================================
-- CURATED CONTENT LIBRARY (Fallback)
-- ============================================================================

-- Bibliothèque de contenu pré-curated et validé manuellement
CREATE TABLE IF NOT EXISTS public.curated_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type de contenu
  content_type VARCHAR(50) NOT NULL,
  category VARCHAR(50),
  
  -- Contenu
  content_data JSONB NOT NULL, -- Le contenu complet (quiz, mission, etc.)
  
  -- Métadonnées
  title VARCHAR(200),
  description TEXT,
  grade_level VARCHAR(20),
  difficulty VARCHAR(20),
  subject VARCHAR(50), -- Pour les quiz
  
  -- Tags pour recherche
  tags TEXT[],
  
  -- Validation
  validated_by UUID REFERENCES public.profiles(id),
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  validation_notes TEXT,
  
  -- Usage
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- Contenu partagé entre tous
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curated_content_type ON public.curated_content_library(content_type, category);
CREATE INDEX IF NOT EXISTS idx_curated_content_active ON public.curated_content_library(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_curated_content_tags ON public.curated_content_library USING GIN(tags);

-- ============================================================================
-- CONTENT GENERATION WORKFLOW
-- ============================================================================

-- Workflow de génération avec étapes de validation
ALTER TABLE public.content_generation_logs
ADD COLUMN IF NOT EXISTS validation_status VARCHAR(30) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validation_id UUID REFERENCES public.content_validations(id),
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour valider automatiquement un quiz
CREATE OR REPLACE FUNCTION validate_quiz_content(p_quiz_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz RECORD;
  v_validation JSONB := '{"checks": {}, "errors": [], "warnings": [], "score": 0}'::jsonb;
  v_score DECIMAL(5, 2) := 0.0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_warnings TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Récupérer le quiz
  SELECT * INTO v_quiz
  FROM public.educational_quizzes
  WHERE id = p_quiz_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Quiz not found');
  END IF;
  
  -- Vérifier le titre
  IF v_quiz.title IS NULL OR LENGTH(TRIM(v_quiz.title)) < 5 THEN
    v_errors := array_append(v_errors, 'Titre trop court ou manquant');
  ELSE
    v_score := v_score + 10.0;
  END IF;
  
  -- Vérifier les questions
  IF v_quiz.questions IS NULL OR jsonb_array_length(v_quiz.questions) = 0 THEN
    v_errors := array_append(v_errors, 'Aucune question dans le quiz');
  ELSE
    DECLARE
      v_question_count INTEGER := jsonb_array_length(v_quiz.questions);
      v_valid_questions INTEGER := 0;
      v_question JSONB;
    BEGIN
      -- Vérifier chaque question
      FOR v_question IN SELECT * FROM jsonb_array_elements(v_quiz.questions)
      LOOP
        -- Vérifier que la question a un texte
        IF v_question->>'question' IS NULL OR LENGTH(TRIM(v_question->>'question')) < 10 THEN
          v_warnings := array_append(v_warnings, 'Question avec texte trop court');
        ELSE
          v_valid_questions := v_valid_questions + 1;
        END IF;
        
        -- Vérifier les options
        IF v_question->'options' IS NULL OR jsonb_array_length(v_question->'options') < 2 THEN
          v_errors := array_append(v_errors, 'Question sans options valides');
        END IF;
        
        -- Vérifier la réponse correcte
        IF v_question->>'correct' IS NULL THEN
          v_errors := array_append(v_errors, 'Question sans réponse correcte');
        END IF;
      END LOOP;
      
      -- Score basé sur le nombre de questions valides
      IF v_question_count >= 5 AND v_question_count <= 15 THEN
        v_score := v_score + 30.0;
      ELSIF v_question_count < 5 THEN
        v_warnings := array_append(v_warnings, 'Trop peu de questions (minimum 5 recommandé)');
      ELSE
        v_warnings := array_append(v_warnings, 'Trop de questions (maximum 15 recommandé)');
      END IF;
      
      IF v_valid_questions = v_question_count THEN
        v_score := v_score + 20.0;
      END IF;
    END;
  END IF;
  
  -- Vérifier la matière
  IF v_quiz.subject IS NULL OR LENGTH(TRIM(v_quiz.subject)) = 0 THEN
    v_warnings := array_append(v_warnings, 'Matière non spécifiée');
  ELSE
    v_score := v_score + 10.0;
  END IF;
  
  -- Vérifier le niveau scolaire
  IF v_quiz.grade_level IS NULL THEN
    v_warnings := array_append(v_warnings, 'Niveau scolaire non spécifié');
  ELSE
    v_score := v_score + 10.0;
  END IF;
  
  -- Vérifier la difficulté
  IF v_quiz.difficulty IS NULL THEN
    v_warnings := array_append(v_warnings, 'Difficulté non spécifiée');
  ELSE
    v_score := v_score + 10.0;
  END IF;
  
  -- Vérifier la description
  IF v_quiz.description IS NULL OR LENGTH(TRIM(v_quiz.description)) < 20 THEN
    v_warnings := array_append(v_warnings, 'Description trop courte');
  ELSE
    v_score := v_score + 10.0;
  END IF;
  
  -- Construire le résultat
  v_validation := jsonb_build_object(
    'checks', jsonb_build_object(
      'has_title', v_quiz.title IS NOT NULL,
      'has_questions', v_quiz.questions IS NOT NULL AND jsonb_array_length(v_quiz.questions) > 0,
      'has_subject', v_quiz.subject IS NOT NULL,
      'has_grade_level', v_quiz.grade_level IS NOT NULL,
      'has_difficulty', v_quiz.difficulty IS NOT NULL,
      'has_description', v_quiz.description IS NOT NULL
    ),
    'errors', to_jsonb(v_errors),
    'warnings', to_jsonb(v_warnings),
    'score', v_score
  );
  
  RETURN v_validation;
END;
$$;

-- Fonction pour obtenir du contenu curated en fallback
CREATE OR REPLACE FUNCTION get_curated_content_fallback(
  p_content_type VARCHAR(50),
  p_category VARCHAR(50) DEFAULT NULL,
  p_grade_level VARCHAR(20) DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content_type VARCHAR(50),
  content_data JSONB,
  title VARCHAR(200),
  match_score DECIMAL(5, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content_type,
    c.content_data,
    c.title,
    CASE
      WHEN c.grade_level = p_grade_level THEN 100.0
      WHEN c.category = p_category THEN 80.0
      ELSE 50.0
    END as match_score
  FROM public.curated_content_library c
  WHERE c.content_type = p_content_type
    AND c.is_active = true
    AND (p_category IS NULL OR c.category = p_category)
    AND (p_grade_level IS NULL OR c.grade_level = p_grade_level)
  ORDER BY match_score DESC, c.usage_count DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON TABLE public.content_validations IS 'Validation et modération du contenu généré';
COMMENT ON TABLE public.content_quality_rules IS 'Règles de qualité pour valider le contenu';
COMMENT ON TABLE public.curated_content_library IS 'Bibliothèque de contenu pré-curated et validé';


