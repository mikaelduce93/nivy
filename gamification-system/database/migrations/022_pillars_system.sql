-- =============================================
-- MIGRATION 022: SYSTEME DES PILIERS (ECOLE/SPORT/CREA)
-- =============================================
-- Ajoute le suivi des 3 piliers d'equilibre:
-- - Ecole: Notes, Quiz, Tutoriels educatifs
-- - Sport: Presence clubs, Defis physiques, Records
-- - Crea: Tutoriels passion, Creations, Likes
-- Bonus equilibre si tous les piliers > seuils
-- =============================================

-- ==========================================
-- PARTIE 1: EXTENSION TABLE USER_XP AVEC PILIERS
-- ==========================================

-- Ajouter les colonnes de score par pilier
DO $$
BEGIN
  -- Score Ecole (0-100)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'school_score'
  ) THEN
    ALTER TABLE public.user_xp ADD COLUMN school_score INTEGER DEFAULT 50 CHECK (school_score >= 0 AND school_score <= 100);
  END IF;

  -- Score Sport (0-100)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'sport_score'
  ) THEN
    ALTER TABLE public.user_xp ADD COLUMN sport_score INTEGER DEFAULT 50 CHECK (sport_score >= 0 AND sport_score <= 100);
  END IF;

  -- Score Crea (0-100)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'crea_score'
  ) THEN
    ALTER TABLE public.user_xp ADD COLUMN crea_score INTEGER DEFAULT 50 CHECK (crea_score >= 0 AND crea_score <= 100);
  END IF;

  -- Multiplicateur equilibre
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'balance_multiplier'
  ) THEN
    ALTER TABLE public.user_xp ADD COLUMN balance_multiplier DECIMAL(3,2) DEFAULT 1.00 CHECK (balance_multiplier >= 1.00 AND balance_multiplier <= 2.00);
  END IF;

  -- Dernier calcul bonus equilibre
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'last_balance_check'
  ) THEN
    ALTER TABLE public.user_xp ADD COLUMN last_balance_check DATE;
  END IF;
END $$;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_user_xp_school ON public.user_xp(school_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_sport ON public.user_xp(sport_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_crea ON public.user_xp(crea_score DESC);

-- ==========================================
-- PARTIE 2: TABLES POUR LE PILIER ECOLE
-- ==========================================

-- 2.1 Table des notes scolaires
CREATE TABLE IF NOT EXISTS public.teen_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,

  -- Matiere
  subject VARCHAR(50) NOT NULL, -- 'math', 'french', 'physics', 'english', 'history', 'science', etc.
  subject_label VARCHAR(100) NOT NULL,

  -- Note
  grade DECIMAL(5,2) NOT NULL CHECK (grade >= 0),
  max_grade DECIMAL(5,2) NOT NULL DEFAULT 20 CHECK (max_grade > 0),
  grade_type VARCHAR(30) DEFAULT 'exam' CHECK (grade_type IN ('exam', 'homework', 'quiz', 'project', 'oral')),

  -- Validation
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  validated_by UUID, -- Parent qui a valide
  validated_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Periode
  term VARCHAR(20), -- 'T1', 'T2', 'T3', 'S1', 'S2'
  school_year VARCHAR(10), -- '2025-2026'

  -- XP
  xp_awarded INTEGER DEFAULT 0,

  -- Timestamps
  grade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teen_grades_teen ON public.teen_grades(teen_id);
CREATE INDEX IF NOT EXISTS idx_teen_grades_subject ON public.teen_grades(teen_id, subject);
CREATE INDEX IF NOT EXISTS idx_teen_grades_status ON public.teen_grades(status);
CREATE INDEX IF NOT EXISTS idx_teen_grades_date ON public.teen_grades(grade_date DESC);

-- 2.2 Table des quiz educatifs
CREATE TABLE IF NOT EXISTS public.educational_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Categorie
  subject VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'normal' CHECK (difficulty IN ('easy', 'normal', 'hard', 'expert')),
  grade_level VARCHAR(20), -- '6eme', '5eme', '4eme', '3eme', '2nde', '1ere', 'terminale'

  -- Configuration
  questions JSONB NOT NULL DEFAULT '[]', -- Array de questions avec reponses
  time_limit_minutes INTEGER DEFAULT 15,
  passing_score INTEGER DEFAULT 60, -- Pourcentage minimum pour reussir

  -- Recompenses
  xp_reward INTEGER DEFAULT 50,

  -- Metadata
  icon VARCHAR(50) DEFAULT 'book-open',
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edu_quizzes_subject ON public.educational_quizzes(subject);
CREATE INDEX IF NOT EXISTS idx_edu_quizzes_active ON public.educational_quizzes(is_active) WHERE is_active = true;

-- 2.3 Table des tentatives de quiz
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.educational_quizzes(id) ON DELETE CASCADE,

  -- Resultats
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  answers JSONB DEFAULT '{}', -- Reponses donnees
  correct_count INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,

  -- Temps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,

  -- Reussite
  passed BOOLEAN GENERATED ALWAYS AS (score >= 60) STORED,
  xp_earned INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_teen ON public.quiz_attempts(teen_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_passed ON public.quiz_attempts(teen_id, passed) WHERE passed = true;

-- 2.4 Table des tutoriels educatifs
CREATE TABLE IF NOT EXISTS public.educational_tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Contenu
  subject VARCHAR(50) NOT NULL,
  video_url TEXT, -- YouTube, Vimeo, etc.
  video_duration_minutes INTEGER,
  content_type VARCHAR(30) DEFAULT 'video' CHECK (content_type IN ('video', 'article', 'interactive')),

  -- Niveau
  difficulty VARCHAR(20) DEFAULT 'normal',
  grade_level VARCHAR(20),

  -- Recompenses
  xp_reward INTEGER DEFAULT 30,
  completion_threshold INTEGER DEFAULT 80, -- Pourcentage a regarder

  -- Metadata
  thumbnail_url TEXT,
  icon VARCHAR(50) DEFAULT 'play-circle',
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edu_tutorials_subject ON public.educational_tutorials(subject);

-- 2.5 Table de progression tutoriels educatifs
CREATE TABLE IF NOT EXISTS public.educational_tutorial_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  tutorial_id UUID NOT NULL REFERENCES public.educational_tutorials(id) ON DELETE CASCADE,

  -- Progression
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  watch_time_seconds INTEGER DEFAULT 0,

  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_earned INTEGER DEFAULT 0,

  -- Timestamps
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, tutorial_id)
);

CREATE INDEX IF NOT EXISTS idx_edu_tutorial_progress_teen ON public.educational_tutorial_progress(teen_id);

-- ==========================================
-- PARTIE 3: TABLES POUR LE PILIER SPORT
-- ==========================================

-- 3.1 Table des clubs sportifs
CREATE TABLE IF NOT EXISTS public.sport_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  name VARCHAR(100) NOT NULL,
  sport_type VARCHAR(50) NOT NULL, -- 'football', 'basketball', 'swimming', 'dance', 'martial_arts', etc.

  -- Localisation
  city VARCHAR(100),
  address TEXT,

  -- Contact
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),

  -- Metadata
  logo_url TEXT,
  is_partner BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sport_clubs_type ON public.sport_clubs(sport_type);
CREATE INDEX IF NOT EXISTS idx_sport_clubs_active ON public.sport_clubs(is_active) WHERE is_active = true;

-- 3.2 Table des inscriptions aux clubs
CREATE TABLE IF NOT EXISTS public.teen_club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.sport_clubs(id) ON DELETE CASCADE,

  -- Dates
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  left_at DATE,

  -- Statut
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, club_id)
);

CREATE INDEX IF NOT EXISTS idx_club_memberships_teen ON public.teen_club_memberships(teen_id);

-- 3.3 Table des presences au club
CREATE TABLE IF NOT EXISTS public.club_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.sport_clubs(id) ON DELETE CASCADE,

  -- Presence
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIME,
  check_out_time TIME,
  duration_minutes INTEGER,

  -- Validation
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verification_method VARCHAR(30) DEFAULT 'manual' CHECK (verification_method IN ('manual', 'qr_code', 'geolocation', 'coach')),

  -- XP
  xp_awarded INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, club_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_club_attendance_teen ON public.club_attendance(teen_id);
CREATE INDEX IF NOT EXISTS idx_club_attendance_date ON public.club_attendance(attendance_date DESC);

-- 3.4 Table des defis physiques
CREATE TABLE IF NOT EXISTS public.physical_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Type
  challenge_type VARCHAR(30) NOT NULL CHECK (challenge_type IN (
    'daily', 'weekly', 'monthly', 'special'
  )),
  sport_category VARCHAR(50) DEFAULT 'general', -- 'cardio', 'strength', 'flexibility', 'endurance'

  -- Objectif
  objective_type VARCHAR(30) NOT NULL CHECK (objective_type IN (
    'count', 'duration', 'distance', 'weight'
  )),
  objective_value INTEGER NOT NULL,
  objective_unit VARCHAR(20), -- 'reps', 'minutes', 'km', 'kg'

  -- Recompenses
  xp_reward INTEGER DEFAULT 50,

  -- Periode
  valid_from DATE,
  valid_until DATE,

  -- Metadata
  icon VARCHAR(50) DEFAULT 'dumbbell',
  difficulty VARCHAR(20) DEFAULT 'normal',
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physical_challenges_type ON public.physical_challenges(challenge_type);
CREATE INDEX IF NOT EXISTS idx_physical_challenges_active ON public.physical_challenges(is_active) WHERE is_active = true;

-- 3.5 Table de progression defis physiques
CREATE TABLE IF NOT EXISTS public.teen_physical_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.physical_challenges(id) ON DELETE CASCADE,

  -- Progression
  current_value INTEGER DEFAULT 0,
  progress_percent INTEGER GENERATED ALWAYS AS (
    LEAST(100, (current_value * 100 / NULLIF(objective_value, 0)))
  ) STORED,

  -- Validation
  proof_type VARCHAR(30), -- 'photo', 'video', 'screenshot', 'manual'
  proof_url TEXT,
  validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,

  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_earned INTEGER DEFAULT 0,

  -- Metadata
  objective_value INTEGER NOT NULL, -- Copie de l'objectif au moment de l'inscription

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_physical_progress_teen ON public.teen_physical_challenge_progress(teen_id);

-- 3.6 Table des records personnels
CREATE TABLE IF NOT EXISTS public.teen_personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,

  -- Type de record
  record_type VARCHAR(50) NOT NULL, -- 'pushups', 'plank', 'run_5k', 'squats', etc.
  record_category VARCHAR(30) DEFAULT 'general', -- 'strength', 'cardio', 'flexibility'

  -- Valeur
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL, -- 'reps', 'seconds', 'minutes', 'km', 'kg'

  -- Record precedent
  previous_value DECIMAL(10,2),
  improvement_percent DECIMAL(5,2),

  -- Validation
  proof_url TEXT,
  verified BOOLEAN DEFAULT false,

  -- XP
  xp_awarded INTEGER DEFAULT 0,

  -- Timestamps
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, record_type)
);

CREATE INDEX IF NOT EXISTS idx_personal_records_teen ON public.teen_personal_records(teen_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_type ON public.teen_personal_records(record_type);

-- ==========================================
-- PARTIE 4: TABLES POUR LE PILIER CREA
-- ==========================================

-- 4.1 Table des parcours passion
CREATE TABLE IF NOT EXISTS public.passion_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Categorie
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'dance', 'music', 'art', 'tech', 'writing', 'photography', 'video', 'fashion', 'cooking', 'diy'
  )),

  -- Structure
  total_levels INTEGER DEFAULT 5,

  -- Recompenses
  xp_per_level INTEGER DEFAULT 100,
  completion_badge_id UUID,

  -- Metadata
  icon VARCHAR(50) DEFAULT 'sparkles',
  color VARCHAR(20) DEFAULT 'purple',
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passion_paths_category ON public.passion_paths(category);
CREATE INDEX IF NOT EXISTS idx_passion_paths_active ON public.passion_paths(is_active) WHERE is_active = true;

-- 4.2 Table des niveaux de parcours
CREATE TABLE IF NOT EXISTS public.passion_path_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.passion_paths(id) ON DELETE CASCADE,

  -- Niveau
  level_number INTEGER NOT NULL CHECK (level_number >= 1),
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Contenu
  tutorials JSONB DEFAULT '[]', -- Array de tutorial IDs
  exercises JSONB DEFAULT '[]', -- Array d'exercices

  -- Prerequis
  prerequisites JSONB DEFAULT '[]', -- Niveaux requis

  -- Validation
  validation_type VARCHAR(30) DEFAULT 'tutorial' CHECK (validation_type IN (
    'tutorial', 'quiz', 'creation', 'coach_review'
  )),
  validation_config JSONB DEFAULT '{}',

  -- Recompenses
  xp_reward INTEGER DEFAULT 100,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(path_id, level_number)
);

CREATE INDEX IF NOT EXISTS idx_path_levels_path ON public.passion_path_levels(path_id);

-- 4.3 Table de progression parcours passion
CREATE TABLE IF NOT EXISTS public.teen_passion_path_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES public.passion_paths(id) ON DELETE CASCADE,

  -- Progression
  current_level INTEGER DEFAULT 1,
  level_progress_percent INTEGER DEFAULT 0 CHECK (level_progress_percent >= 0 AND level_progress_percent <= 100),
  tutorials_completed JSONB DEFAULT '[]',
  exercises_completed JSONB DEFAULT '[]',

  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  total_xp_earned INTEGER DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, path_id)
);

CREATE INDEX IF NOT EXISTS idx_passion_progress_teen ON public.teen_passion_path_progress(teen_id);

-- 4.4 Table des tutoriels passion (creativite)
CREATE TABLE IF NOT EXISTS public.passion_tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Categorie
  category VARCHAR(50) NOT NULL,
  path_id UUID REFERENCES public.passion_paths(id) ON DELETE SET NULL,
  level_required INTEGER DEFAULT 1,

  -- Contenu
  video_url TEXT,
  video_duration_minutes INTEGER,
  content JSONB DEFAULT '{}', -- Etapes, materiels, etc.

  -- Recompenses
  xp_reward INTEGER DEFAULT 40,
  completion_threshold INTEGER DEFAULT 80,

  -- Metadata
  thumbnail_url TEXT,
  difficulty VARCHAR(20) DEFAULT 'normal',
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passion_tutorials_category ON public.passion_tutorials(category);
CREATE INDEX IF NOT EXISTS idx_passion_tutorials_path ON public.passion_tutorials(path_id);

-- 4.5 Table de progression tutoriels passion
CREATE TABLE IF NOT EXISTS public.passion_tutorial_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  tutorial_id UUID NOT NULL REFERENCES public.passion_tutorials(id) ON DELETE CASCADE,

  -- Progression
  progress_percent INTEGER DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0,

  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_earned INTEGER DEFAULT 0,

  -- Timestamps
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, tutorial_id)
);

CREATE INDEX IF NOT EXISTS idx_passion_tutorial_progress_teen ON public.passion_tutorial_progress(teen_id);

-- 4.6 Table des creations
CREATE TABLE IF NOT EXISTS public.teen_creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,

  -- Contenu
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,

  -- Media
  media_type VARCHAR(30) NOT NULL CHECK (media_type IN ('image', 'video', 'audio', 'document', 'link')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Tags
  tags JSONB DEFAULT '[]',

  -- Parcours associe
  path_id UUID REFERENCES public.passion_paths(id) ON DELETE SET NULL,
  tutorial_id UUID REFERENCES public.passion_tutorials(id) ON DELETE SET NULL,

  -- Visibilite
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public')),
  is_featured BOOLEAN DEFAULT false,

  -- Stats
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,

  -- XP
  xp_awarded INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teen_creations_teen ON public.teen_creations(teen_id);
CREATE INDEX IF NOT EXISTS idx_teen_creations_category ON public.teen_creations(category);
CREATE INDEX IF NOT EXISTS idx_teen_creations_visibility ON public.teen_creations(visibility);
CREATE INDEX IF NOT EXISTS idx_teen_creations_featured ON public.teen_creations(is_featured) WHERE is_featured = true;

-- 4.7 Table des likes sur creations
CREATE TABLE IF NOT EXISTS public.creation_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creation_id UUID NOT NULL REFERENCES public.teen_creations(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(creation_id, teen_id)
);

CREATE INDEX IF NOT EXISTS idx_creation_likes_creation ON public.creation_likes(creation_id);
CREATE INDEX IF NOT EXISTS idx_creation_likes_teen ON public.creation_likes(teen_id);

-- ==========================================
-- PARTIE 5: FONCTIONS DE CALCUL DES SCORES
-- ==========================================

-- 5.1 Fonction calcul score Ecole
-- Formule: notes (40%) + quiz (30%) + tutos (30%)
-- =============================================

CREATE OR REPLACE FUNCTION calculate_school_score(p_teen_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_notes_score DECIMAL := 0;
  v_quiz_score DECIMAL := 0;
  v_tutos_score DECIMAL := 0;
  v_final_score INTEGER;
  v_avg_grade DECIMAL;
  v_quiz_pass_rate DECIMAL;
  v_tuto_completion_rate DECIMAL;
  v_recent_grades_count INTEGER;
  v_recent_quizzes_count INTEGER;
  v_recent_tutos_count INTEGER;
BEGIN
  -- 1. Score Notes (40%)
  -- Moyenne des notes des 3 derniers mois, normalisee sur 100
  SELECT
    AVG((grade / max_grade) * 100),
    COUNT(*)
  INTO v_avg_grade, v_recent_grades_count
  FROM public.teen_grades
  WHERE teen_id = p_teen_id
    AND status = 'approved'
    AND grade_date >= CURRENT_DATE - INTERVAL '3 months';

  IF v_recent_grades_count > 0 AND v_avg_grade IS NOT NULL THEN
    v_notes_score := v_avg_grade;
  ELSE
    v_notes_score := 50; -- Score par defaut si pas de notes
  END IF;

  -- 2. Score Quiz (30%)
  -- Taux de reussite des quiz des 3 derniers mois
  SELECT
    (COUNT(*) FILTER (WHERE passed = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    COUNT(*)
  INTO v_quiz_pass_rate, v_recent_quizzes_count
  FROM public.quiz_attempts
  WHERE teen_id = p_teen_id
    AND created_at >= CURRENT_DATE - INTERVAL '3 months';

  IF v_recent_quizzes_count > 0 AND v_quiz_pass_rate IS NOT NULL THEN
    v_quiz_score := v_quiz_pass_rate;
  ELSE
    v_quiz_score := 50; -- Score par defaut
  END IF;

  -- 3. Score Tutos educatifs (30%)
  -- Taux de completion des tutoriels educatifs
  SELECT
    (COUNT(*) FILTER (WHERE completed = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    COUNT(*)
  INTO v_tuto_completion_rate, v_recent_tutos_count
  FROM public.educational_tutorial_progress
  WHERE teen_id = p_teen_id
    AND updated_at >= CURRENT_DATE - INTERVAL '3 months';

  IF v_recent_tutos_count > 0 AND v_tuto_completion_rate IS NOT NULL THEN
    v_tutos_score := v_tuto_completion_rate;
  ELSE
    v_tutos_score := 50; -- Score par defaut
  END IF;

  -- Calcul final: notes (40%) + quiz (30%) + tutos (30%)
  v_final_score := ROUND(
    (v_notes_score * 0.40) +
    (v_quiz_score * 0.30) +
    (v_tutos_score * 0.30)
  );

  -- Contraindre entre 0 et 100
  v_final_score := GREATEST(0, LEAST(100, v_final_score));

  RETURN v_final_score;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_school_score IS 'Calcule le score du pilier Ecole: notes (40%) + quiz (30%) + tutos (30%)';

-- 5.2 Fonction calcul score Sport
-- Formule: presence clubs (40%) + defis (40%) + records (20%)
-- =============================================

CREATE OR REPLACE FUNCTION calculate_sport_score(p_teen_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_presence_score DECIMAL := 0;
  v_defis_score DECIMAL := 0;
  v_records_score DECIMAL := 0;
  v_final_score INTEGER;
  v_attendance_rate DECIMAL;
  v_expected_sessions INTEGER;
  v_actual_sessions INTEGER;
  v_challenges_completed INTEGER;
  v_challenges_total INTEGER;
  v_records_count INTEGER;
  v_records_improved INTEGER;
BEGIN
  -- 1. Score Presence Clubs (40%)
  -- Taux de presence aux seances du dernier mois
  -- On estime 8 seances par mois par club
  SELECT COUNT(DISTINCT club_id) * 8
  INTO v_expected_sessions
  FROM public.teen_club_memberships
  WHERE teen_id = p_teen_id AND status = 'active';

  SELECT COUNT(*)
  INTO v_actual_sessions
  FROM public.club_attendance
  WHERE teen_id = p_teen_id
    AND attendance_date >= CURRENT_DATE - INTERVAL '1 month';

  IF v_expected_sessions > 0 THEN
    v_attendance_rate := LEAST(100, (v_actual_sessions::DECIMAL / v_expected_sessions) * 100);
    v_presence_score := v_attendance_rate;
  ELSE
    -- Pas de club inscrit, on regarde les defis physiques comme indicateur
    v_presence_score := 50;
  END IF;

  -- 2. Score Defis Physiques (40%)
  -- Taux de completion des defis des 3 derniers mois
  SELECT
    COUNT(*) FILTER (WHERE completed = true),
    COUNT(*)
  INTO v_challenges_completed, v_challenges_total
  FROM public.teen_physical_challenge_progress
  WHERE teen_id = p_teen_id
    AND started_at >= CURRENT_DATE - INTERVAL '3 months';

  IF v_challenges_total > 0 THEN
    v_defis_score := (v_challenges_completed::DECIMAL / v_challenges_total) * 100;
  ELSE
    v_defis_score := 50;
  END IF;

  -- 3. Score Records (20%)
  -- Nombre de records ameliores recemment + bonus si beaucoup de records
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE improvement_percent > 0 AND achieved_at >= CURRENT_DATE - INTERVAL '3 months')
  INTO v_records_count, v_records_improved
  FROM public.teen_personal_records
  WHERE teen_id = p_teen_id;

  IF v_records_count > 0 THEN
    -- Base: 50 + bonus pour records + bonus pour ameliorations
    v_records_score := 50 + LEAST(25, v_records_count * 5) + LEAST(25, v_records_improved * 10);
    v_records_score := LEAST(100, v_records_score);
  ELSE
    v_records_score := 50;
  END IF;

  -- Calcul final: presence (40%) + defis (40%) + records (20%)
  v_final_score := ROUND(
    (v_presence_score * 0.40) +
    (v_defis_score * 0.40) +
    (v_records_score * 0.20)
  );

  -- Contraindre entre 0 et 100
  v_final_score := GREATEST(0, LEAST(100, v_final_score));

  RETURN v_final_score;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_sport_score IS 'Calcule le score du pilier Sport: presence clubs (40%) + defis (40%) + records (20%)';

-- 5.3 Fonction calcul score Crea
-- Formule: tutos completes (40%) + creations (40%) + likes (20%)
-- =============================================

CREATE OR REPLACE FUNCTION calculate_crea_score(p_teen_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_tutos_score DECIMAL := 0;
  v_creations_score DECIMAL := 0;
  v_likes_score DECIMAL := 0;
  v_final_score INTEGER;
  v_tutos_completed INTEGER;
  v_tutos_started INTEGER;
  v_creations_count INTEGER;
  v_total_likes INTEGER;
  v_path_progress DECIMAL;
BEGIN
  -- 1. Score Tutos Passion completes (40%)
  -- Taux de completion + bonus pour parcours avances
  SELECT
    COUNT(*) FILTER (WHERE completed = true),
    COUNT(*)
  INTO v_tutos_completed, v_tutos_started
  FROM public.passion_tutorial_progress
  WHERE teen_id = p_teen_id;

  -- Bonus pour progression dans les parcours
  SELECT COALESCE(AVG(level_progress_percent), 0)
  INTO v_path_progress
  FROM public.teen_passion_path_progress
  WHERE teen_id = p_teen_id;

  IF v_tutos_started > 0 THEN
    v_tutos_score := (v_tutos_completed::DECIMAL / v_tutos_started) * 80 + (v_path_progress * 0.20);
    v_tutos_score := LEAST(100, v_tutos_score);
  ELSE
    v_tutos_score := 50;
  END IF;

  -- 2. Score Creations (40%)
  -- Nombre de creations + bonus visibilite publique
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE visibility = 'public')
  INTO v_creations_count, v_creations_count
  FROM public.teen_creations
  WHERE teen_id = p_teen_id
    AND created_at >= CURRENT_DATE - INTERVAL '6 months';

  IF v_creations_count > 0 THEN
    -- Base 50 + 5 points par creation (max 50 points bonus)
    v_creations_score := 50 + LEAST(50, v_creations_count * 5);
  ELSE
    v_creations_score := 50;
  END IF;

  -- 3. Score Likes recus (20%)
  -- Total des likes sur creations publiques
  SELECT COALESCE(SUM(likes_count), 0)
  INTO v_total_likes
  FROM public.teen_creations
  WHERE teen_id = p_teen_id
    AND visibility IN ('public', 'friends');

  IF v_total_likes > 0 THEN
    -- Base 50 + 2 points par like (max 50 points bonus)
    v_likes_score := 50 + LEAST(50, v_total_likes * 2);
  ELSE
    v_likes_score := 50;
  END IF;

  -- Calcul final: tutos (40%) + creations (40%) + likes (20%)
  v_final_score := ROUND(
    (v_tutos_score * 0.40) +
    (v_creations_score * 0.40) +
    (v_likes_score * 0.20)
  );

  -- Contraindre entre 0 et 100
  v_final_score := GREATEST(0, LEAST(100, v_final_score));

  RETURN v_final_score;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_crea_score IS 'Calcule le score du pilier Crea: tutos passion (40%) + creations (40%) + likes (20%)';

-- ==========================================
-- PARTIE 6: FONCTION BONUS EQUILIBRE
-- ==========================================

-- Fonction qui calcule et attribue le bonus equilibre
-- Si tous piliers > 50: +500 XP + multiplicateur x1.10
-- Si tous piliers > 70: +1,000 XP + multiplicateur x1.25
-- Si tous piliers > 85: +2,000 XP + badge special

CREATE OR REPLACE FUNCTION calculate_balance_bonus(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_school_score INTEGER;
  v_sport_score INTEGER;
  v_crea_score INTEGER;
  v_min_score INTEGER;
  v_bonus_xp INTEGER := 0;
  v_multiplier DECIMAL(3,2) := 1.00;
  v_balance_tier VARCHAR(20) := 'none';
  v_xp_result JSONB;
  v_achievement_unlocked BOOLEAN := false;
  v_last_check DATE;
BEGIN
  -- Verifier si deja calcule ce mois
  SELECT last_balance_check INTO v_last_check
  FROM public.user_xp
  WHERE teen_id = p_teen_id;

  IF v_last_check IS NOT NULL AND
     DATE_TRUNC('month', v_last_check) = DATE_TRUNC('month', CURRENT_DATE) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Bonus equilibre deja calcule ce mois',
      'last_check', v_last_check
    );
  END IF;

  -- Calculer les scores actuels
  v_school_score := calculate_school_score(p_teen_id);
  v_sport_score := calculate_sport_score(p_teen_id);
  v_crea_score := calculate_crea_score(p_teen_id);

  -- Trouver le score minimum
  v_min_score := LEAST(v_school_score, v_sport_score, v_crea_score);

  -- Determiner le tier de bonus
  IF v_min_score >= 85 THEN
    v_balance_tier := 'legendary';
    v_bonus_xp := 2000;
    v_multiplier := 1.50;
    v_achievement_unlocked := true;
  ELSIF v_min_score >= 70 THEN
    v_balance_tier := 'gold';
    v_bonus_xp := 1000;
    v_multiplier := 1.25;
  ELSIF v_min_score >= 50 THEN
    v_balance_tier := 'silver';
    v_bonus_xp := 500;
    v_multiplier := 1.10;
  ELSE
    v_balance_tier := 'none';
    v_bonus_xp := 0;
    v_multiplier := 1.00;
  END IF;

  -- Mettre a jour les scores et le multiplicateur
  UPDATE public.user_xp
  SET
    school_score = v_school_score,
    sport_score = v_sport_score,
    crea_score = v_crea_score,
    balance_multiplier = v_multiplier,
    last_balance_check = CURRENT_DATE,
    updated_at = NOW()
  WHERE teen_id = p_teen_id;

  -- Attribuer le bonus XP si applicable
  IF v_bonus_xp > 0 THEN
    v_xp_result := add_xp_to_user(
      p_teen_id,
      v_bonus_xp,
      'balance_bonus',
      'pillar',
      NULL,
      'Bonus equilibre mensuel - Tier: ' || v_balance_tier
    );
  END IF;

  -- Debloquer l'achievement si tier legendary (a implementer via le systeme d'achievements existant)
  -- TODO: Appeler unlock_achievement si le badge existe

  RETURN jsonb_build_object(
    'success', true,
    'school_score', v_school_score,
    'sport_score', v_sport_score,
    'crea_score', v_crea_score,
    'min_score', v_min_score,
    'balance_tier', v_balance_tier,
    'bonus_xp', v_bonus_xp,
    'multiplier', v_multiplier,
    'achievement_unlocked', v_achievement_unlocked,
    'xp_result', v_xp_result
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_balance_bonus IS 'Calcule et attribue le bonus equilibre mensuel basé sur les 3 piliers';

-- ==========================================
-- PARTIE 7: FONCTIONS HELPER
-- ==========================================

-- Fonction pour obtenir les scores piliers d'un teen
CREATE OR REPLACE FUNCTION get_pillar_scores(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'school_score', COALESCE(school_score, 50),
    'sport_score', COALESCE(sport_score, 50),
    'crea_score', COALESCE(crea_score, 50),
    'balance_multiplier', COALESCE(balance_multiplier, 1.00),
    'last_balance_check', last_balance_check,
    'average_score', ROUND((COALESCE(school_score, 50) + COALESCE(sport_score, 50) + COALESCE(crea_score, 50))::DECIMAL / 3)
  ) INTO v_result
  FROM public.user_xp
  WHERE teen_id = p_teen_id;

  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'school_score', 50,
      'sport_score', 50,
      'crea_score', 50,
      'balance_multiplier', 1.00,
      'last_balance_check', NULL,
      'average_score', 50
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fonction pour mettre a jour un score pilier specifique
CREATE OR REPLACE FUNCTION update_pillar_score(
  p_teen_id UUID,
  p_pillar VARCHAR(10) -- 'school', 'sport', 'crea'
)
RETURNS INTEGER AS $$
DECLARE
  v_new_score INTEGER;
BEGIN
  CASE p_pillar
    WHEN 'school' THEN
      v_new_score := calculate_school_score(p_teen_id);
      UPDATE public.user_xp SET school_score = v_new_score, updated_at = NOW() WHERE teen_id = p_teen_id;
    WHEN 'sport' THEN
      v_new_score := calculate_sport_score(p_teen_id);
      UPDATE public.user_xp SET sport_score = v_new_score, updated_at = NOW() WHERE teen_id = p_teen_id;
    WHEN 'crea' THEN
      v_new_score := calculate_crea_score(p_teen_id);
      UPDATE public.user_xp SET crea_score = v_new_score, updated_at = NOW() WHERE teen_id = p_teen_id;
    ELSE
      RAISE EXCEPTION 'Pilier invalide: %', p_pillar;
  END CASE;

  RETURN v_new_score;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour recalculer tous les scores
CREATE OR REPLACE FUNCTION recalculate_all_pillar_scores(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_school INTEGER;
  v_sport INTEGER;
  v_crea INTEGER;
BEGIN
  v_school := calculate_school_score(p_teen_id);
  v_sport := calculate_sport_score(p_teen_id);
  v_crea := calculate_crea_score(p_teen_id);

  UPDATE public.user_xp
  SET
    school_score = v_school,
    sport_score = v_sport,
    crea_score = v_crea,
    updated_at = NOW()
  WHERE teen_id = p_teen_id;

  RETURN jsonb_build_object(
    'school_score', v_school,
    'sport_score', v_sport,
    'crea_score', v_crea
  );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PARTIE 8: TRIGGERS AUTO-UPDATE
-- ==========================================

-- Trigger apres validation d'une note
CREATE OR REPLACE FUNCTION trigger_update_school_score_on_grade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    PERFORM update_pillar_score(NEW.teen_id, 'school');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_grade_approved_update_school ON public.teen_grades;
CREATE TRIGGER on_grade_approved_update_school
  AFTER INSERT OR UPDATE ON public.teen_grades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_school_score_on_grade();

-- Trigger apres completion d'un quiz
CREATE OR REPLACE FUNCTION trigger_update_school_score_on_quiz()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_pillar_score(NEW.teen_id, 'school');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_quiz_complete_update_school ON public.quiz_attempts;
CREATE TRIGGER on_quiz_complete_update_school
  AFTER INSERT ON public.quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_school_score_on_quiz();

-- Trigger apres completion d'un tuto educatif
CREATE OR REPLACE FUNCTION trigger_update_school_score_on_edu_tutorial()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    PERFORM update_pillar_score(NEW.teen_id, 'school');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_edu_tutorial_complete_update_school ON public.educational_tutorial_progress;
CREATE TRIGGER on_edu_tutorial_complete_update_school
  AFTER INSERT OR UPDATE ON public.educational_tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_school_score_on_edu_tutorial();

-- Trigger apres presence club
CREATE OR REPLACE FUNCTION trigger_update_sport_score_on_attendance()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_pillar_score(NEW.teen_id, 'sport');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_club_attendance_update_sport ON public.club_attendance;
CREATE TRIGGER on_club_attendance_update_sport
  AFTER INSERT ON public.club_attendance
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_sport_score_on_attendance();

-- Trigger apres completion defi physique
CREATE OR REPLACE FUNCTION trigger_update_sport_score_on_challenge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    PERFORM update_pillar_score(NEW.teen_id, 'sport');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_physical_challenge_complete_update_sport ON public.teen_physical_challenge_progress;
CREATE TRIGGER on_physical_challenge_complete_update_sport
  AFTER INSERT OR UPDATE ON public.teen_physical_challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_sport_score_on_challenge();

-- Trigger apres nouveau record
CREATE OR REPLACE FUNCTION trigger_update_sport_score_on_record()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_pillar_score(NEW.teen_id, 'sport');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_record_update_sport ON public.teen_personal_records;
CREATE TRIGGER on_record_update_sport
  AFTER INSERT OR UPDATE ON public.teen_personal_records
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_sport_score_on_record();

-- Trigger apres completion tuto passion
CREATE OR REPLACE FUNCTION trigger_update_crea_score_on_passion_tutorial()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    PERFORM update_pillar_score(NEW.teen_id, 'crea');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_passion_tutorial_complete_update_crea ON public.passion_tutorial_progress;
CREATE TRIGGER on_passion_tutorial_complete_update_crea
  AFTER INSERT OR UPDATE ON public.passion_tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_crea_score_on_passion_tutorial();

-- Trigger apres nouvelle creation
CREATE OR REPLACE FUNCTION trigger_update_crea_score_on_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_pillar_score(NEW.teen_id, 'crea');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_creation_update_crea ON public.teen_creations;
CREATE TRIGGER on_creation_update_crea
  AFTER INSERT ON public.teen_creations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_crea_score_on_creation();

-- Trigger apres like sur creation
CREATE OR REPLACE FUNCTION trigger_update_crea_score_on_like()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  -- Obtenir l'ID du createur
  SELECT teen_id INTO v_creator_id
  FROM public.teen_creations
  WHERE id = NEW.creation_id;

  IF v_creator_id IS NOT NULL THEN
    -- Mettre a jour le compteur de likes
    UPDATE public.teen_creations
    SET likes_count = likes_count + 1
    WHERE id = NEW.creation_id;

    -- Recalculer le score crea du createur
    PERFORM update_pillar_score(v_creator_id, 'crea');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_like_update_crea ON public.creation_likes;
CREATE TRIGGER on_like_update_crea
  AFTER INSERT ON public.creation_likes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_crea_score_on_like();

-- ==========================================
-- PARTIE 9: RLS POLICIES
-- ==========================================

-- teen_grades
ALTER TABLE public.teen_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can view own grades" ON public.teen_grades FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_grades.teen_id AND parent_id = auth.uid()));

CREATE POLICY "Teens can insert own grades" ON public.teen_grades FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_grades.teen_id AND parent_id = auth.uid()));

CREATE POLICY "Parents can validate grades" ON public.teen_grades FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_grades.teen_id AND parent_id = auth.uid()));

-- educational_quizzes (lecture publique)
ALTER TABLE public.educational_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active quizzes" ON public.educational_quizzes FOR SELECT
  USING (is_active = true);

-- quiz_attempts
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can view own quiz attempts" ON public.quiz_attempts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = quiz_attempts.teen_id AND parent_id = auth.uid()));

CREATE POLICY "Teens can create quiz attempts" ON public.quiz_attempts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.teens WHERE id = quiz_attempts.teen_id AND parent_id = auth.uid()));

-- educational_tutorials (lecture publique)
ALTER TABLE public.educational_tutorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active tutorials" ON public.educational_tutorials FOR SELECT
  USING (is_active = true);

-- educational_tutorial_progress
ALTER TABLE public.educational_tutorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own tutorial progress" ON public.educational_tutorial_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = educational_tutorial_progress.teen_id AND parent_id = auth.uid()));

-- sport_clubs (lecture publique)
ALTER TABLE public.sport_clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active clubs" ON public.sport_clubs FOR SELECT
  USING (is_active = true);

-- teen_club_memberships
ALTER TABLE public.teen_club_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own memberships" ON public.teen_club_memberships FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_club_memberships.teen_id AND parent_id = auth.uid()));

-- club_attendance
ALTER TABLE public.club_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own attendance" ON public.club_attendance FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = club_attendance.teen_id AND parent_id = auth.uid()));

-- physical_challenges (lecture publique)
ALTER TABLE public.physical_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active challenges" ON public.physical_challenges FOR SELECT
  USING (is_active = true);

-- teen_physical_challenge_progress
ALTER TABLE public.teen_physical_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own challenge progress" ON public.teen_physical_challenge_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_physical_challenge_progress.teen_id AND parent_id = auth.uid()));

-- teen_personal_records
ALTER TABLE public.teen_personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own records" ON public.teen_personal_records FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_personal_records.teen_id AND parent_id = auth.uid()));

-- passion_paths (lecture publique)
ALTER TABLE public.passion_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active paths" ON public.passion_paths FOR SELECT
  USING (is_active = true);

-- passion_path_levels (lecture publique)
ALTER TABLE public.passion_path_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view path levels" ON public.passion_path_levels FOR SELECT
  USING (true);

-- teen_passion_path_progress
ALTER TABLE public.teen_passion_path_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own path progress" ON public.teen_passion_path_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_passion_path_progress.teen_id AND parent_id = auth.uid()));

-- passion_tutorials (lecture publique)
ALTER TABLE public.passion_tutorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active passion tutorials" ON public.passion_tutorials FOR SELECT
  USING (is_active = true);

-- passion_tutorial_progress
ALTER TABLE public.passion_tutorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own passion tutorial progress" ON public.passion_tutorial_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = passion_tutorial_progress.teen_id AND parent_id = auth.uid()));

-- teen_creations
ALTER TABLE public.teen_creations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own creations" ON public.teen_creations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_creations.teen_id AND parent_id = auth.uid()));

CREATE POLICY "Everyone can view public creations" ON public.teen_creations FOR SELECT
  USING (visibility = 'public');

-- creation_likes
ALTER TABLE public.creation_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own likes" ON public.creation_likes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = creation_likes.teen_id AND parent_id = auth.uid()));

CREATE POLICY "Everyone can view likes on public creations" ON public.creation_likes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.teen_creations WHERE id = creation_likes.creation_id AND visibility = 'public'));

-- ==========================================
-- PARTIE 10: SEED DATA
-- ==========================================

-- Quelques quiz educatifs de base
INSERT INTO public.educational_quizzes (code, title, description, subject, difficulty, grade_level, questions, xp_reward) VALUES
('math_fractions', 'Les Fractions', 'Teste tes connaissances sur les fractions', 'math', 'easy', '6eme',
  '[{"question": "Combien fait 1/2 + 1/2 ?", "options": ["1", "2", "1/4", "1/2"], "correct": 0},
    {"question": "Quelle fraction est equivalente a 2/4 ?", "options": ["1/3", "1/2", "3/4", "2/3"], "correct": 1},
    {"question": "Combien fait 3/4 - 1/4 ?", "options": ["1/2", "2/4", "1/4", "3/4"], "correct": 0}]'::jsonb, 30),
('french_conjugaison', 'Conjugaison Present', 'Teste tes connaissances en conjugaison', 'french', 'easy', '6eme',
  '[{"question": "Je (aller) au marche. Quel est le bon verbe ?", "options": ["va", "vais", "vas", "allons"], "correct": 1},
    {"question": "Nous (etre) en vacances.", "options": ["sommes", "sont", "etes", "suis"], "correct": 0}]'::jsonb, 25),
('english_basics', 'English Basics', 'Basic English vocabulary', 'english', 'easy', '6eme',
  '[{"question": "How do you say \"chat\" in English?", "options": ["dog", "cat", "bird", "fish"], "correct": 1},
    {"question": "What color is the sky?", "options": ["green", "red", "blue", "yellow"], "correct": 2}]'::jsonb, 25)
ON CONFLICT (code) DO NOTHING;

-- Quelques defis physiques
INSERT INTO public.physical_challenges (code, name, description, challenge_type, sport_category, objective_type, objective_value, objective_unit, xp_reward, difficulty) VALUES
('daily_pushups_10', '10 Pompes', 'Fais 10 pompes aujourd''hui', 'daily', 'strength', 'count', 10, 'reps', 20, 'easy'),
('daily_plank_60', 'Planche 60s', 'Tiens la planche pendant 60 secondes', 'daily', 'strength', 'duration', 60, 'seconds', 25, 'normal'),
('weekly_run_5k', 'Course 5km', 'Cours 5 kilometres cette semaine', 'weekly', 'cardio', 'distance', 5, 'km', 100, 'normal'),
('weekly_pushups_100', '100 Pompes', 'Fais 100 pompes cette semaine', 'weekly', 'strength', 'count', 100, 'reps', 75, 'normal'),
('monthly_marathon_42', 'Marathon Mensuel', 'Cours 42 km ce mois', 'monthly', 'cardio', 'distance', 42, 'km', 500, 'hard')
ON CONFLICT (code) DO NOTHING;

-- Quelques parcours passion
INSERT INTO public.passion_paths (code, name, description, category, total_levels, xp_per_level, icon, color) VALUES
('dance_hiphop', 'Hip-Hop Basics', 'Apprends les bases du Hip-Hop', 'dance', 5, 100, 'music', 'purple'),
('music_guitar', 'Guitare Debutant', 'Apprends a jouer de la guitare', 'music', 5, 100, 'guitar', 'orange'),
('art_drawing', 'Dessin Manga', 'Apprends a dessiner des mangas', 'art', 5, 100, 'pencil', 'pink'),
('tech_coding', 'Initiation au Code', 'Apprends les bases de la programmation', 'tech', 5, 100, 'code', 'cyan'),
('photo_basics', 'Photographie', 'Apprends les bases de la photo', 'photography', 5, 100, 'camera', 'yellow')
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- PARTIE 11: VERIFICATION
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE '  Migration 022 - Systeme des Piliers terminee';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'COLONNES AJOUTEES A user_xp:';
  RAISE NOTICE '  - school_score (0-100)';
  RAISE NOTICE '  - sport_score (0-100)';
  RAISE NOTICE '  - crea_score (0-100)';
  RAISE NOTICE '  - balance_multiplier (1.00-2.00)';
  RAISE NOTICE '  - last_balance_check (date)';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLES PILIER ECOLE:';
  RAISE NOTICE '  - teen_grades (notes scolaires)';
  RAISE NOTICE '  - educational_quizzes (quiz)';
  RAISE NOTICE '  - quiz_attempts (tentatives)';
  RAISE NOTICE '  - educational_tutorials (tutos)';
  RAISE NOTICE '  - educational_tutorial_progress';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLES PILIER SPORT:';
  RAISE NOTICE '  - sport_clubs';
  RAISE NOTICE '  - teen_club_memberships';
  RAISE NOTICE '  - club_attendance';
  RAISE NOTICE '  - physical_challenges';
  RAISE NOTICE '  - teen_physical_challenge_progress';
  RAISE NOTICE '  - teen_personal_records';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLES PILIER CREA:';
  RAISE NOTICE '  - passion_paths';
  RAISE NOTICE '  - passion_path_levels';
  RAISE NOTICE '  - teen_passion_path_progress';
  RAISE NOTICE '  - passion_tutorials';
  RAISE NOTICE '  - passion_tutorial_progress';
  RAISE NOTICE '  - teen_creations';
  RAISE NOTICE '  - creation_likes';
  RAISE NOTICE '';
  RAISE NOTICE 'FONCTIONS:';
  RAISE NOTICE '  - calculate_school_score(teen_id)';
  RAISE NOTICE '  - calculate_sport_score(teen_id)';
  RAISE NOTICE '  - calculate_crea_score(teen_id)';
  RAISE NOTICE '  - calculate_balance_bonus(teen_id)';
  RAISE NOTICE '  - get_pillar_scores(teen_id)';
  RAISE NOTICE '  - update_pillar_score(teen_id, pillar)';
  RAISE NOTICE '  - recalculate_all_pillar_scores(teen_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'TRIGGERS: Auto-update scores apres chaque action';
  RAISE NOTICE 'RLS: Toutes les policies configurees';
  RAISE NOTICE '================================================';
END $$;
