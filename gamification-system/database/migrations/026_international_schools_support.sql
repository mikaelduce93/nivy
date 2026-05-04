-- ============================================================================
-- TEENS PARTY MOROCCO - International Schools Support
-- ============================================================================
-- Migration: 026_international_schools_support.sql
-- Description: Support pour écoles privées internationales au Maroc
-- (Écoles françaises, américaines, britanniques, IB, etc.)
-- ============================================================================

-- ============================================================================
-- SCHOOL TYPE DETECTION
-- ============================================================================

-- Ajouter colonne pour type d'école dans teens
ALTER TABLE public.teens
ADD COLUMN IF NOT EXISTS school_type VARCHAR(50) CHECK (school_type IN (
  'french', 'american', 'british', 'ib', 'other', 'unknown'
));

-- Ajouter colonne pour curriculum
ALTER TABLE public.teens
ADD COLUMN IF NOT EXISTS curriculum VARCHAR(100);

-- Ajouter colonne pour langue d'enseignement principale
ALTER TABLE public.teens
ADD COLUMN IF NOT EXISTS primary_language VARCHAR(20) DEFAULT 'french';

-- Index pour recherche par type d'école
CREATE INDEX IF NOT EXISTS idx_teens_school_type ON public.teens(school_type);
CREATE INDEX IF NOT EXISTS idx_teens_curriculum ON public.teens(curriculum);

COMMENT ON COLUMN public.teens.school_type IS 'Type d''école : french, american, british, ib, other, unknown';
COMMENT ON COLUMN public.teens.curriculum IS 'Nom du curriculum (ex: Programme Français, American Curriculum)';
COMMENT ON COLUMN public.teens.primary_language IS 'Langue d''enseignement principale';

-- ============================================================================
-- CONTENT CURRICULUM MAPPING
-- ============================================================================

-- Table pour mapper le contenu au curriculum
CREATE TABLE IF NOT EXISTS public.content_curriculum_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence au contenu
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  
  -- Curriculum
  school_type VARCHAR(50) NOT NULL,
  curriculum VARCHAR(100) NOT NULL,
  
  -- Adaptation
  adapted_title TEXT,
  adapted_description TEXT,
  language VARCHAR(20) DEFAULT 'french',
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_type, content_id, school_type)
);

CREATE INDEX IF NOT EXISTS idx_content_curriculum_type ON public.content_curriculum_mapping(school_type, curriculum);
CREATE INDEX IF NOT EXISTS idx_content_curriculum_content ON public.content_curriculum_mapping(content_type, content_id);

-- ============================================================================
-- SUBJECT MAPPING BY CURRICULUM
-- ============================================================================

-- Table pour mapper les matières selon le curriculum
CREATE TABLE IF NOT EXISTS public.curriculum_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Curriculum
  school_type VARCHAR(50) NOT NULL,
  curriculum VARCHAR(100) NOT NULL,
  
  -- Matière
  subject_id VARCHAR(50) NOT NULL,
  subject_label_fr VARCHAR(100),
  subject_label_en VARCHAR(100),
  subject_label_ar VARCHAR(100),
  
  -- Niveaux disponibles
  available_grade_levels TEXT[],
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(school_type, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_subjects_type ON public.curriculum_subjects(school_type);
CREATE INDEX IF NOT EXISTS idx_curriculum_subjects_active ON public.curriculum_subjects(is_active) WHERE is_active = true;

-- ============================================================================
-- SEED DATA: SUBJECTS BY CURRICULUM
-- ============================================================================

-- Programme Français
INSERT INTO public.curriculum_subjects (school_type, curriculum, subject_id, subject_label_fr, available_grade_levels) VALUES
('french', 'Programme Français', 'math', 'Mathématiques', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'french', 'Français', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'english', 'Anglais', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'spanish', 'Espagnol', ARRAY['4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'physics', 'Physique-Chimie', ARRAY['4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'svt', 'SVT', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'history', 'Histoire-Géographie', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'philosophy', 'Philosophie', ARRAY['Terminale']),
('french', 'Programme Français', 'economics', 'SES', ARRAY['2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'art', 'Arts Plastiques', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'music', 'Éducation Musicale', ARRAY['6ème', '5ème', '4ème', '3ème']),
('french', 'Programme Français', 'sport', 'EPS', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'])
ON CONFLICT (school_type, subject_id) DO NOTHING;

-- Programme Américain
INSERT INTO public.curriculum_subjects (school_type, curriculum, subject_id, subject_label_fr, subject_label_en, available_grade_levels) VALUES
('american', 'American Curriculum', 'math', 'Mathématiques', 'Mathematics', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'english', 'Anglais', 'English Language Arts', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'science', 'Sciences', 'Science', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']),
('american', 'American Curriculum', 'biology', 'Biologie', 'Biology', ARRAY['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'chemistry', 'Chimie', 'Chemistry', ARRAY['Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'physics', 'Physique', 'Physics', ARRAY['Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'history', 'Histoire', 'History', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'social_studies', 'Sciences Sociales', 'Social Studies', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']),
('american', 'American Curriculum', 'french', 'Français', 'French', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'spanish', 'Espagnol', 'Spanish', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'art', 'Arts', 'Art', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'music', 'Musique', 'Music', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'pe', 'Éducation Physique', 'Physical Education', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'computer_science', 'Informatique', 'Computer Science', ARRAY['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'])
ON CONFLICT (school_type, subject_id) DO NOTHING;

-- Programme Britannique
INSERT INTO public.curriculum_subjects (school_type, curriculum, subject_id, subject_label_fr, subject_label_en, available_grade_levels) VALUES
('british', 'British Curriculum', 'math', 'Mathématiques', 'Mathematics', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'english', 'Anglais', 'English', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'science', 'Sciences', 'Science', ARRAY['Year 7', 'Year 8', 'Year 9']),
('british', 'British Curriculum', 'biology', 'Biologie', 'Biology', ARRAY['Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'chemistry', 'Chimie', 'Chemistry', ARRAY['Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'physics', 'Physique', 'Physics', ARRAY['Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'history', 'Histoire', 'History', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'geography', 'Géographie', 'Geography', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'french', 'Français', 'French', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'spanish', 'Espagnol', 'Spanish', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'art', 'Arts', 'Art & Design', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'music', 'Musique', 'Music', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'pe', 'Éducation Physique', 'Physical Education', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13'])
ON CONFLICT (school_type, subject_id) DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour détecter automatiquement le type d'école
CREATE OR REPLACE FUNCTION detect_school_type(p_school_name TEXT)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_name TEXT := LOWER(COALESCE(p_school_name, ''));
BEGIN
  -- Écoles françaises
  IF v_name LIKE '%lycée%' OR v_name LIKE '%lycee%' OR 
     v_name LIKE '%collège%' OR v_name LIKE '%college%' OR
     v_name LIKE '%école française%' OR v_name LIKE '%ecole francaise%' OR
     v_name LIKE '%french school%' OR v_name LIKE '%lycée français%' OR
     v_name LIKE '%lycee francais%' THEN
    RETURN 'french';
  END IF;
  
  -- Écoles américaines
  IF v_name LIKE '%american school%' OR v_name LIKE '%academy%' OR
     v_name LIKE '%high school%' OR v_name LIKE '%middle school%' OR
     v_name LIKE '%elementary%' OR v_name LIKE '%grade school%' THEN
    RETURN 'american';
  END IF;
  
  -- Écoles britanniques
  IF v_name LIKE '%british school%' OR v_name LIKE '%british international%' THEN
    RETURN 'british';
  END IF;
  
  -- IB
  IF v_name LIKE '%ib school%' OR v_name LIKE '%international baccalaureate%' OR
     v_name LIKE '%myp%' OR v_name LIKE '%dp%' THEN
    RETURN 'ib';
  END IF;
  
  RETURN 'unknown';
END;
$$;

-- Fonction pour obtenir le curriculum
CREATE OR REPLACE FUNCTION get_curriculum_name(p_school_type VARCHAR(50))
RETURNS VARCHAR(100)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_school_type
    WHEN 'french' THEN RETURN 'Programme Français';
    WHEN 'american' THEN RETURN 'American Curriculum';
    WHEN 'british' THEN RETURN 'British Curriculum';
    WHEN 'ib' THEN RETURN 'International Baccalaureate';
    ELSE RETURN 'Autre Programme';
  END CASE;
END;
$$;

COMMENT ON TABLE public.content_curriculum_mapping IS 'Mapping du contenu selon le curriculum';
COMMENT ON TABLE public.curriculum_subjects IS 'Matières disponibles par curriculum';


