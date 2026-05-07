-- ============================================================
-- Migration 072 — Physical Challenges Polish (TICKET-003, V1.2 Wave 1)
-- ============================================================
-- Goal: ensure every active row in `physical_challenges` carries
--   1. tags TEXT[] populated with ≥1 canonical tag from
--      `interest_taxonomy` (closed set), and
--   2. image_url TEXT populated with a stable cover image URL so
--      the unified <DefiCard /> can render the visual.
--
-- Background:
-- - Migration 066 added both columns (`tags`, `image_url`) and the
--   public storage bucket `physical-challenge-images`. No values
--   were seeded, so the 5 default rows currently render without
--   covers and are invisible to the personalization engine
--   (recommend_for_teen scores tag overlap).
-- - Canonical tags (from `interest_taxonomy`):
--     lifestyle_fitness, lifestyle_wellness   (category=lifestyle)
--     sport_running, sport_basketball,
--     sport_football, sport_swimming,
--     sport_cycling, sport_martial_arts       (category=sport)
--
-- Idempotent: every UPDATE is guarded by a value check so re-running
-- on already-polished rows is a no-op.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Defensive ALTERs (no-op if migration 066 already applied)
-- ------------------------------------------------------------

ALTER TABLE public.physical_challenges
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

ALTER TABLE public.physical_challenges
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- GIN index on tags for fast taxonomy overlap queries
CREATE INDEX IF NOT EXISTS idx_physical_challenges_tags
  ON public.physical_challenges USING GIN (tags);

-- ------------------------------------------------------------
-- 2. Backfill tags from sport_category + name keywords
-- ------------------------------------------------------------
-- Strategy: every challenge gets `lifestyle_fitness` (universal),
-- plus a sport-specific tag derived from sport_category, plus
-- `lifestyle_wellness` for low-impact / strength rows.

UPDATE public.physical_challenges
SET tags = ARRAY['lifestyle_fitness', 'lifestyle_wellness']::TEXT[]
WHERE sport_category = 'strength'
  AND (tags IS NULL OR array_length(tags, 1) IS NULL OR array_length(tags, 1) = 0);

UPDATE public.physical_challenges
SET tags = ARRAY['lifestyle_fitness', 'sport_running']::TEXT[]
WHERE sport_category = 'cardio'
  AND (
    name ILIKE '%cours%' OR name ILIKE '%run%'
    OR name ILIKE '%marathon%' OR code ILIKE '%run%'
    OR code ILIKE '%marathon%'
  )
  AND (tags IS NULL OR array_length(tags, 1) IS NULL OR array_length(tags, 1) = 0);

UPDATE public.physical_challenges
SET tags = ARRAY['lifestyle_fitness']::TEXT[]
WHERE sport_category = 'cardio'
  AND (tags IS NULL OR array_length(tags, 1) IS NULL OR array_length(tags, 1) = 0);

UPDATE public.physical_challenges
SET tags = ARRAY['lifestyle_fitness', 'lifestyle_wellness']::TEXT[]
WHERE sport_category = 'core'
  AND (tags IS NULL OR array_length(tags, 1) IS NULL OR array_length(tags, 1) = 0);

-- Catch-all for any other sport_category (flexibility, mobility, …)
UPDATE public.physical_challenges
SET tags = ARRAY['lifestyle_fitness']::TEXT[]
WHERE (tags IS NULL OR array_length(tags, 1) IS NULL OR array_length(tags, 1) = 0);

-- ------------------------------------------------------------
-- 3. Backfill image_url with stable Unsplash covers
-- ------------------------------------------------------------
-- Each cover is a topical, royalty-free Unsplash photo served from
-- images.unsplash.com (SLA-backed CDN). When admin uploads custom
-- covers to the `physical-challenge-images` bucket the row's
-- image_url can be swapped via the admin tools.

-- Pushups (strength) — gym hands close-up
UPDATE public.physical_challenges
SET image_url = 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80&auto=format&fit=crop'
WHERE code IN ('daily_pushups_10', 'weekly_pushups_100')
  AND (image_url IS NULL OR image_url = '');

-- Plank (strength/core) — core exercise
UPDATE public.physical_challenges
SET image_url = 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80&auto=format&fit=crop'
WHERE code = 'daily_plank_60'
  AND (image_url IS NULL OR image_url = '');

-- Running 5k (cardio) — runner on track
UPDATE public.physical_challenges
SET image_url = 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80&auto=format&fit=crop'
WHERE code = 'weekly_run_5k'
  AND (image_url IS NULL OR image_url = '');

-- Marathon mensuel (cardio long) — distance running
UPDATE public.physical_challenges
SET image_url = 'https://images.unsplash.com/photo-1486218119243-13883505764c?w=800&q=80&auto=format&fit=crop'
WHERE code = 'monthly_marathon_42'
  AND (image_url IS NULL OR image_url = '');

-- Generic fallback by category for any rows without a code-specific
-- match (admin-added rows, future seeds).
UPDATE public.physical_challenges
SET image_url = 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80&auto=format&fit=crop'
WHERE sport_category = 'strength'
  AND (image_url IS NULL OR image_url = '');

UPDATE public.physical_challenges
SET image_url = 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80&auto=format&fit=crop'
WHERE sport_category = 'cardio'
  AND (image_url IS NULL OR image_url = '');

UPDATE public.physical_challenges
SET image_url = 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80&auto=format&fit=crop'
WHERE sport_category = 'core'
  AND (image_url IS NULL OR image_url = '');

-- Ultimate fallback for any remaining row
UPDATE public.physical_challenges
SET image_url = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80&auto=format&fit=crop'
WHERE image_url IS NULL OR image_url = '';

-- ------------------------------------------------------------
-- 4. Verification (DO block — fails the migration if not satisfied)
-- ------------------------------------------------------------

DO $$
DECLARE
  untagged_count INT;
  no_image_count INT;
  total_active INT;
BEGIN
  SELECT COUNT(*) INTO total_active
  FROM public.physical_challenges
  WHERE is_active = true;

  SELECT COUNT(*) INTO untagged_count
  FROM public.physical_challenges
  WHERE is_active = true
    AND (tags IS NULL OR array_length(tags, 1) IS NULL OR array_length(tags, 1) < 1);

  SELECT COUNT(*) INTO no_image_count
  FROM public.physical_challenges
  WHERE is_active = true
    AND (image_url IS NULL OR image_url = '');

  IF untagged_count > 0 THEN
    RAISE EXCEPTION
      'Migration 072 verification failed: % of % active physical_challenges still have no tags',
      untagged_count, total_active;
  END IF;

  IF no_image_count > 0 THEN
    RAISE EXCEPTION
      'Migration 072 verification failed: % of % active physical_challenges still have no image_url',
      no_image_count, total_active;
  END IF;

  RAISE NOTICE
    'Migration 072 OK — % active physical_challenges now have ≥1 tag and an image_url',
    total_active;
END $$;

COMMIT;
