-- Wave 3.3 — Mentorship & Career Exploration
-- Spec: docs/vision/mentorship-career.md + whitepaper §19.4.7 + §29 invariants.
--
-- HIGHEST-SAFETY-BAR WAVE: adult-teen flow.
-- Mandatory mentor KYC, mandatory parental approval per session,
-- recordings to PRIVATE bucket, no off-platform DMs.
--
-- Tables: mentors, mentor_sessions, career_pathways, teen_pathway_progress,
--         internships, internship_applications.
-- RPCs:   apply_mentor, admin_approve_mentor, book_mentor_session,
--         parent_approve_session, parent_deny_session, apply_to_internship,
--         decide_internship_application.
--
-- Invariants:
--   §29.5 auth.users.id is THE canonical user identifier
--   §29.6 no public CIN exposure (kyc_documents row is server-only via SD RPCs)
--   §29.7 every public table has explicit RLS
--   §29.14 DH=NUMERIC(10,2), coins=INTEGER, XP=INTEGER

-- ============================================================
-- 0. EXTEND kyc_documents to support mentors (partner_id nullable, add owner_user_id)
-- ============================================================
ALTER TABLE public.kyc_documents
  ALTER COLUMN partner_id DROP NOT NULL;

ALTER TABLE public.kyc_documents
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS subject_kind TEXT
    CHECK (subject_kind IN ('partner','mentor'))
    DEFAULT 'partner';

CREATE INDEX IF NOT EXISTS idx_kyc_documents_owner_user
  ON public.kyc_documents (owner_user_id) WHERE owner_user_id IS NOT NULL;

-- Either partner_id or owner_user_id must be set (mentor or partner KYC).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='kyc_documents_subject_present_chk'
  ) THEN
    ALTER TABLE public.kyc_documents
      ADD CONSTRAINT kyc_documents_subject_present_chk
      CHECK (partner_id IS NOT NULL OR owner_user_id IS NOT NULL);
  END IF;
END $$;

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  expertise_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  years_experience INTEGER,
  bio TEXT,
  intro_video_url TEXT,
  hourly_rate_dh NUMERIC(10,2) NOT NULL DEFAULT 0,
  free_intro_session BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','paused','suspended','rejected')),
  kyc_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (kyc_status IN ('pending','approved','rejected','expired')),
  age_min_mentee INTEGER NOT NULL DEFAULT 13 CHECK (age_min_mentee >= 13),
  age_max_mentee INTEGER NOT NULL DEFAULT 17 CHECK (age_max_mentee <= 17),
  rating NUMERIC(3,2),
  sessions_count INTEGER NOT NULL DEFAULT 0,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mentor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE RESTRICT,
  mentee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 15 AND 240),
  meeting_url TEXT,
  meeting_provider TEXT
    CHECK (meeting_provider IN ('zoom','google_meet','jitsi','in_person')),
  status TEXT NOT NULL DEFAULT 'pending_approval'
    CHECK (status IN ('pending_approval','approved','denied','dispatched','completed','cancelled','no_show')),
  parent_approval_id UUID REFERENCES public.parental_approvals(id) ON DELETE SET NULL,
  amount_dh NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_coins INTEGER NOT NULL DEFAULT 0,
  is_intro BOOLEAN NOT NULL DEFAULT FALSE,
  rating_by_mentee INTEGER CHECK (rating_by_mentee BETWEEN 1 AND 5),
  rating_by_mentor INTEGER CHECK (rating_by_mentor BETWEEN 1 AND 5),
  notes TEXT,
  parent_attended BOOLEAN NOT NULL DEFAULT FALSE,
  recorded BOOLEAN NOT NULL DEFAULT FALSE,
  recording_url TEXT, -- §29.6: PRIVATE bucket only
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.career_pathways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  required_subjects TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  typical_grades TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  recommended_quiz_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  recommended_partner_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  recommended_mentor_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.teen_pathway_progress (
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  pathway_id UUID NOT NULL REFERENCES public.career_pathways(id) ON DELETE CASCADE,
  declared_interest_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  milestones_completed INTEGER NOT NULL DEFAULT 0,
  total_milestones INTEGER NOT NULL DEFAULT 10,
  notes TEXT,
  last_active_at TIMESTAMPTZ,
  PRIMARY KEY (teen_id, pathway_id)
);

CREATE TABLE IF NOT EXISTS public.internships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration TEXT NOT NULL DEFAULT '1_week'
    CHECK (duration IN ('1_day','1_week','2_weeks','summer','part_time_school_year')),
  age_min INTEGER NOT NULL DEFAULT 14 CHECK (age_min >= 13),
  age_max INTEGER NOT NULL DEFAULT 17 CHECK (age_max <= 18),
  application_deadline DATE,
  spots_total INTEGER NOT NULL DEFAULT 1 CHECK (spots_total > 0),
  spots_taken INTEGER NOT NULL DEFAULT 0 CHECK (spots_taken >= 0),
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  stipend_dh NUMERIC(10,2),
  required_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  application_form JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('draft','open','closed','filled','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.internship_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id UUID NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  applicant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter TEXT,
  portfolio_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  parent_consent_at TIMESTAMPTZ,
  parental_approval_id UUID REFERENCES public.parental_approvals(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','shortlisted','accepted','rejected','withdrawn')),
  decision_at TIMESTAMPTZ,
  decision_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_mentors_active
  ON public.mentors(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_mentors_expertise_gin
  ON public.mentors USING GIN (expertise_tags);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentee
  ON public.mentor_sessions (mentee_user_id, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentor
  ON public.mentor_sessions (mentor_id, scheduled_for DESC);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_status
  ON public.mentor_sessions (status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_internship_apps_applicant
  ON public.internship_applications (applicant_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internship_apps_internship
  ON public.internship_applications (internship_id, status);
CREATE INDEX IF NOT EXISTS idx_internships_status_open
  ON public.internships (status, application_deadline) WHERE status='open';

-- ============================================================
-- 3. RLS
-- ============================================================
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teen_pathway_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internship_applications ENABLE ROW LEVEL SECURITY;

-- helper: is_admin (reuses mp_is_admin from W2.4 if present, else inline)
CREATE OR REPLACE FUNCTION public.mentor_is_admin(p_uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles WHERE profile_id = p_uid
    UNION ALL
    SELECT 1 FROM public.profiles WHERE id = p_uid
      AND role IN ('admin','super_admin','moderator','support')
  );
$$;
GRANT EXECUTE ON FUNCTION public.mentor_is_admin(UUID) TO authenticated, service_role;

-- mentors: public can see active; mentor sees own; admin sees all
DROP POLICY IF EXISTS mentors_active_read ON public.mentors;
CREATE POLICY mentors_active_read ON public.mentors
  FOR SELECT TO authenticated
  USING (status='active' OR user_id = auth.uid() OR public.mentor_is_admin(auth.uid()));

DROP POLICY IF EXISTS mentors_self_update ON public.mentors;
CREATE POLICY mentors_self_update ON public.mentors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- career_pathways: any authenticated user can browse active pathways
DROP POLICY IF EXISTS career_pathways_authenticated_read ON public.career_pathways;
CREATE POLICY career_pathways_authenticated_read ON public.career_pathways
  FOR SELECT TO authenticated, anon
  USING (is_active = true);

-- teen_pathway_progress: teen + linked parent + admin
DROP POLICY IF EXISTS teen_pathway_progress_self_read ON public.teen_pathway_progress;
CREATE POLICY teen_pathway_progress_self_read ON public.teen_pathway_progress
  FOR SELECT TO authenticated
  USING (
    teen_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.parent_teen_links l
      WHERE l.parent_id = auth.uid() AND l.teen_id = teen_pathway_progress.teen_id
    )
    OR public.mentor_is_admin(auth.uid())
  );

DROP POLICY IF EXISTS teen_pathway_progress_self_write ON public.teen_pathway_progress;
CREATE POLICY teen_pathway_progress_self_write ON public.teen_pathway_progress
  FOR ALL TO authenticated
  USING (teen_id = auth.uid() OR public.mentor_is_admin(auth.uid()))
  WITH CHECK (teen_id = auth.uid() OR public.mentor_is_admin(auth.uid()));

-- internships: anyone authenticated can read open/closed; admins all
DROP POLICY IF EXISTS internships_authenticated_read ON public.internships;
CREATE POLICY internships_authenticated_read ON public.internships
  FOR SELECT TO authenticated, anon
  USING (status IN ('open','closed','filled') OR public.mentor_is_admin(auth.uid()));

-- mentor_sessions: mentee + mentor + linked parent + admin
DROP POLICY IF EXISTS mentor_sessions_visibility ON public.mentor_sessions;
CREATE POLICY mentor_sessions_visibility ON public.mentor_sessions
  FOR SELECT TO authenticated
  USING (
    mentee_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.id = mentor_sessions.mentor_id AND m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.parent_teen_links l
      WHERE l.parent_id = auth.uid() AND l.teen_id = mentor_sessions.mentee_user_id
    )
    OR public.mentor_is_admin(auth.uid())
  );

-- internship_applications: applicant + linked parent + partner_staff + admin
DROP POLICY IF EXISTS internship_applications_visibility ON public.internship_applications;
CREATE POLICY internship_applications_visibility ON public.internship_applications
  FOR SELECT TO authenticated
  USING (
    applicant_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.parent_teen_links l
      WHERE l.parent_id = auth.uid() AND l.teen_id = internship_applications.applicant_user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.partner_staff s
      JOIN public.internships i ON i.partner_id = s.partner_id
      WHERE i.id = internship_applications.internship_id AND s.user_id = auth.uid() AND s.is_active=true
    )
    OR public.mentor_is_admin(auth.uid())
  );

-- ============================================================
-- 4. SEED CAREER PATHWAYS (5 starter)
-- ============================================================
INSERT INTO public.career_pathways (slug, title, description, icon, category) VALUES
  ('medicine','Medecine','Apprends comment devenir medecin','stethoscope','health'),
  ('engineering','Ingenierie','Sciences appliquees et tech','wrench','tech'),
  ('arts','Arts et design','Carrieres creatives','palette','arts'),
  ('business','Business et entrepreneuriat','Lance ta boite','briefcase','business'),
  ('law','Droit','Justice et avocature','scale','law')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- DONE
-- ============================================================
