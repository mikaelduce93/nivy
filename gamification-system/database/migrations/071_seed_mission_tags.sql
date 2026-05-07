-- ============================================================
-- Migration 071: Seed mission_templates.tags from interest_taxonomy
-- ============================================================
-- Purpose: Backfill tags on the 30 mission_templates so the
--   `assign-missions` cron + recommender (recommend_for_teen) have
--   a personalization signal. Currently tags=[] on all 30 rows,
--   making collab/affinity scoring impossible.
--
-- Scope:
--   - mission_templates ONLY (TICKET-002).
--   - educational_quizzes (TICKET-001) and physical_challenges
--     (TICKET-003) are owned by other agents — DO NOT touch.
--
-- Source of truth for tags: `interest_taxonomy` (50-tag closed set,
--   Appendix A of docs/vision/personalization-engine.md).
--
-- Idempotency: every UPDATE is keyed by mission name + category
--   (the natural key for templates) and overwrites only if the
--   incoming tag set is non-equal to the existing one. Re-running
--   the migration is a no-op once applied. We also gate every
--   UPDATE on tag values existing in interest_taxonomy so we cannot
--   drift outside the closed set.
--
-- Acceptance: 30/30 active rows tagged with >= 2 canonical tags.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Helper: a temp table holding (name, category, tags[]) tuples.
-- We use name+category as natural key (mission template names
-- happen to be unique within a category in the seeded data).
-- ------------------------------------------------------------
CREATE TEMP TABLE _mission_tag_map (
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  tags        TEXT[] NOT NULL,
  PRIMARY KEY (name, category)
) ON COMMIT DROP;

-- ------------------------------------------------------------
-- Mapping logic (per mission)
-- ------------------------------------------------------------
-- challenge: discipline + competition → fitness/wellness/leadership
INSERT INTO _mission_tag_map (name, category, tags) VALUES
  ('Challenge Master',     'challenge',     ARRAY['lifestyle_fitness','social_leadership','lifestyle_wellness']),
  ('Défi Quotidien',       'challenge',     ARRAY['lifestyle_wellness','lifestyle_fitness','social_leadership']),
  ('Perfectionniste',      'challenge',     ARRAY['lifestyle_wellness','social_leadership','academic_math']),
  ('Ultra Challenger',     'challenge',     ARRAY['lifestyle_fitness','social_leadership','lifestyle_wellness','sport_running']),

-- event (seasonal cultural/festive) → community + theme-specific
  ('Holiday Spirit',       'event',         ARRAY['social_volunteering','cinema','music_pop','social_leadership']),
  ('Nouvel An 2026',       'event',         ARRAY['social_volunteering','music_pop','cinema','social_leadership']),
  ('Ramadan Kareem',       'event',         ARRAY['food_traditional','music_traditional','social_volunteering','social_leadership']),
  ('Trick or Treat',       'event',         ARRAY['cinema','social_volunteering','art_drawing','music_pop']),

-- exploration: curiosity + onboarding → reading + leadership + tech
  ('Explorateur',          'exploration',   ARRAY['reading_nonfiction','social_leadership','travel','tech_gaming']),
  ('Maître des Features',  'exploration',   ARRAY['tech_gaming','reading_nonfiction','social_leadership']),

-- loyalty: discipline + streak + XP grind → wellness + leadership;
--   seasonal loyalty inherits its season's flavor
  ('Bienvenue dans la Famille!','loyalty',  ARRAY['social_leadership','social_volunteering','lifestyle_wellness']),
  ('Connexion du Jour',    'loyalty',       ARRAY['lifestyle_wellness','social_leadership']),
  ('Flame Guardian',       'loyalty',       ARRAY['lifestyle_wellness','lifestyle_fitness','social_leadership']),
  ('Grind XP',             'loyalty',       ARRAY['lifestyle_fitness','social_leadership','tech_gaming']),
  ('Premier Contact',      'loyalty',       ARRAY['social_leadership','reading_nonfiction','lifestyle_wellness']),
  ('Ramadan Streak',       'loyalty',       ARRAY['food_traditional','music_traditional','social_volunteering','lifestyle_wellness']),
  ('Semaine Parfaite',     'loyalty',       ARRAY['lifestyle_wellness','social_leadership','lifestyle_fitness']),
  ('Streak Master',        'loyalty',       ARRAY['lifestyle_wellness','social_leadership','lifestyle_fitness']),
  ('Summer Champion',      'loyalty',       ARRAY['travel','sport_swimming','lifestyle_fitness','social_leadership']),
  ('Summer Streak',        'loyalty',       ARRAY['travel','lifestyle_fitness','sport_swimming','lifestyle_wellness']),
  ('Top 10',               'loyalty',       ARRAY['social_leadership','lifestyle_fitness','tech_gaming','social_debate']),
  ('XP Hunter',            'loyalty',       ARRAY['lifestyle_fitness','tech_gaming','social_leadership']),
  ('XP Legend',            'loyalty',       ARRAY['lifestyle_fitness','tech_gaming','social_leadership','lifestyle_wellness']),

-- participation: events + onboarding profile → social/community
  ('Choix du Destin',      'participation', ARRAY['social_leadership','reading_nonfiction']),
  ('Festivalier',          'participation', ARRAY['music_pop','social_volunteering','social_leadership','cinema']),
  ('Party Animal',         'participation', ARRAY['music_pop','social_volunteering','social_leadership']),
  ('Profil Créé',          'participation', ARRAY['social_leadership','lifestyle_fashion','art_drawing']),
  ('Summer Vibes',         'participation', ARRAY['travel','music_pop','social_volunteering','sport_swimming']),

-- social: friend recruit → debate/leadership/volunteering
  ('Recruteur',            'social',        ARRAY['social_leadership','social_debate','social_volunteering']);

-- ------------------------------------------------------------
-- Safety: every tag we want to assign MUST exist in interest_taxonomy.
-- Fail fast if the closed set has drifted.
-- ------------------------------------------------------------
DO $$
DECLARE
  bad_tags TEXT[];
BEGIN
  SELECT array_agg(DISTINCT t)
    INTO bad_tags
  FROM (
    SELECT unnest(tags) AS t FROM _mission_tag_map
  ) s
  WHERE t NOT IN (SELECT tag FROM interest_taxonomy);

  IF bad_tags IS NOT NULL AND array_length(bad_tags, 1) > 0 THEN
    RAISE EXCEPTION 'Migration 071: tags not in interest_taxonomy: %', bad_tags;
  END IF;
END $$;

-- ------------------------------------------------------------
-- Apply: idempotent UPDATE — only writes when incoming tags differ.
-- ------------------------------------------------------------
UPDATE mission_templates mt
SET tags = m.tags,
    updated_at = NOW()
FROM _mission_tag_map m
WHERE mt.name = m.name
  AND mt.category = m.category
  AND (mt.tags IS DISTINCT FROM m.tags);

-- ------------------------------------------------------------
-- Verify acceptance criterion: 30/30 active templates with >= 2 tags
-- ------------------------------------------------------------
DO $$
DECLARE
  total_active INT;
  tagged_active INT;
BEGIN
  SELECT COUNT(*) INTO total_active
    FROM mission_templates WHERE is_active = TRUE;

  SELECT COUNT(*) INTO tagged_active
    FROM mission_templates
   WHERE is_active = TRUE
     AND array_length(tags, 1) >= 2;

  RAISE NOTICE 'Migration 071: % / % active mission_templates have >=2 tags',
    tagged_active, total_active;

  IF tagged_active * 100 < total_active * 95 THEN
    RAISE EXCEPTION
      'Migration 071: coverage below 95%% (% / %)',
      tagged_active, total_active;
  END IF;
END $$;

COMMIT;
