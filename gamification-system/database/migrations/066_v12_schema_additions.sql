-- ============================================================================
-- Migration 066 — V1.2 schema additions (Wave γ + Wave β follow-ups)
-- ============================================================================
-- Adds three columns that V1.2 surfaces reference but were missing in 058/059:
--
--   1. internships.city          text NULL    — used by /teen/internships ?city=
--                                                and /admin/internships post form
--   2. internships.remote_ok     boolean      — toggle for remote-only filter
--                                                (defaults to false)
--   3. physical_challenges.image_url text NULL — cover image for DefiCard
--                                                (Wave β B3)
--
-- Also provisions a public storage bucket `physical-challenge-images` for the
-- cover artwork (admin-curated, no PII — same pattern as event-images /
-- partner-logos).
--
-- All operations are idempotent so this can be re-applied safely.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. internships.city  +  internships.remote_ok
-- ----------------------------------------------------------------------------

ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS remote_ok boolean NOT NULL DEFAULT false;

-- Soft length guard on city — free-text but keep it sane.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'internships_city_len_chk'
      AND conrelid = 'public.internships'::regclass
  ) THEN
    ALTER TABLE public.internships
      ADD CONSTRAINT internships_city_len_chk
      CHECK (city IS NULL OR char_length(city) <= 120);
  END IF;
END$$;

-- Helpful indexes for the new filter axes (partial: only open postings).
CREATE INDEX IF NOT EXISTS idx_internships_city_open
  ON public.internships (city)
  WHERE status = 'open' AND city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_internships_remote_open
  ON public.internships (remote_ok)
  WHERE status = 'open' AND remote_ok = true;

COMMENT ON COLUMN public.internships.city IS
  'Free-text city of the internship location (NULL when remote_ok). Soft-capped at 120 chars.';
COMMENT ON COLUMN public.internships.remote_ok IS
  'true if the internship can be done fully remotely. Defaults to false.';

-- ----------------------------------------------------------------------------
-- 2. physical_challenges.image_url
-- ----------------------------------------------------------------------------

ALTER TABLE public.physical_challenges
  ADD COLUMN IF NOT EXISTS image_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'physical_challenges_image_url_len_chk'
      AND conrelid = 'public.physical_challenges'::regclass
  ) THEN
    ALTER TABLE public.physical_challenges
      ADD CONSTRAINT physical_challenges_image_url_len_chk
      CHECK (image_url IS NULL OR char_length(image_url) <= 1024);
  END IF;
END$$;

COMMENT ON COLUMN public.physical_challenges.image_url IS
  'Public URL of the challenge cover image (admin-curated, served from physical-challenge-images bucket).';

-- ----------------------------------------------------------------------------
-- 3. Storage bucket for challenge cover images
--    Public bucket — same pattern as event-images / partner-logos.
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'physical-challenge-images',
  'physical-challenge-images',
  true,
  5 * 1024 * 1024,                       -- 5 MB cap, matches event-images
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read these covers (public bucket); writes require service-role.
DROP POLICY IF EXISTS physical_challenge_images_public_read ON storage.objects;
CREATE POLICY physical_challenge_images_public_read
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'physical-challenge-images');

COMMIT;
