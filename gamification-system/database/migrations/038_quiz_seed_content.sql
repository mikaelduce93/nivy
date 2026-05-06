-- ============================================================================
-- MIGRATION 038: QUIZ SEED CONTENT (quiz-end-to-end-builder agent)
-- ============================================================================
-- Adds enough seed quizzes in `educational_quizzes` to make the
-- `app/teen/quiz/*` UX usable: 6 categories x 5 questions each.
-- Existing seeds (math_fractions, french_conjugaison, english_basics) are kept.
--
-- IMPORTANT: this migration is OPT-IN. Per the quiz-end-to-end-builder agent
-- spec, DB changes are NOT applied automatically. Apply manually with:
--   psql $DATABASE_URL -f gamification-system/database/migrations/038_quiz_seed_content.sql
--
-- Idempotent: every INSERT uses ON CONFLICT (code) DO NOTHING.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Ensure unique constraint on `code` (already PK-like in spirit)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'educational_quizzes_code_key'
      AND conrelid = 'public.educational_quizzes'::regclass
  ) THEN
    ALTER TABLE public.educational_quizzes
      ADD CONSTRAINT educational_quizzes_code_key UNIQUE (code);
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- SEED: math
-- ----------------------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, is_active)
VALUES (
  'math_basics_v1',
  'Maths - Bases',
  'Cinq questions pour reviser les fondamentaux',
  'math', 'easy', '6eme',
  '[
    {"question":"Combien font 7 x 8 ?","options":["48","54","56","64"],"correct":2,"type":"mcq"},
    {"question":"Quelle est la racine carree de 81 ?","options":["7","8","9","11"],"correct":2,"type":"mcq"},
    {"question":"Combien font 15% de 200 ?","options":["20","25","30","35"],"correct":2,"type":"mcq"},
    {"question":"Si x + 5 = 12, x = ?","options":["5","6","7","8"],"correct":2,"type":"mcq"},
    {"question":"Combien y a-t-il de cotes dans un hexagone ?","options":["5","6","7","8"],"correct":1,"type":"mcq"}
  ]'::jsonb,
  10, 60, 50, 'calculator', true
)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- SEED: science
-- ----------------------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, is_active)
VALUES (
  'science_solar_system_v1',
  'Sciences - Systeme Solaire',
  'Decouvre les planetes du systeme solaire',
  'science', 'easy', '5eme',
  '[
    {"question":"Quelle est la planete la plus proche du Soleil ?","options":["Venus","Mercure","Mars","Terre"],"correct":1,"type":"mcq"},
    {"question":"Combien y a-t-il de planetes dans notre systeme solaire ?","options":["7","8","9","10"],"correct":1,"type":"mcq"},
    {"question":"Quelle planete est appelee la planete rouge ?","options":["Jupiter","Mars","Saturne","Venus"],"correct":1,"type":"mcq"},
    {"question":"Quel est le satellite naturel de la Terre ?","options":["Mars","Phobos","Lune","Europe"],"correct":2,"type":"mcq"},
    {"question":"Quelle est la plus grande planete du systeme solaire ?","options":["Saturne","Jupiter","Neptune","Uranus"],"correct":1,"type":"mcq"}
  ]'::jsonb,
  10, 60, 50, 'beaker', true
)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- SEED: history
-- ----------------------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, is_active)
VALUES (
  'history_morocco_independence_v1',
  'Histoire - Independance du Maroc',
  'Les grandes dates de l''histoire marocaine',
  'history', 'medium', '4eme',
  '[
    {"question":"En quelle annee le Maroc a-t-il obtenu son independance ?","options":["1944","1956","1960","1962"],"correct":1,"type":"mcq"},
    {"question":"Qui etait le premier roi du Maroc independant ?","options":["Hassan II","Mohammed V","Mohammed VI","Moulay Ismail"],"correct":1,"type":"mcq"},
    {"question":"Quelle puissance a etabli le Protectorat sur le Maroc en 1912 ?","options":["Espagne","Royaume-Uni","France","Allemagne"],"correct":2,"type":"mcq"},
    {"question":"Comment s''appelle la Marche organisee en 1975 pour le Sahara ?","options":["Marche Bleue","Marche Verte","Marche Rouge","Marche Royale"],"correct":1,"type":"mcq"},
    {"question":"Hassan II a regne de 1961 jusqu''en quelle annee ?","options":["1989","1995","1999","2003"],"correct":2,"type":"mcq"}
  ]'::jsonb,
  12, 60, 60, 'history', true
)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- SEED: geography
-- ----------------------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, is_active)
VALUES (
  'geography_morocco_v1',
  'Geographie - Le Maroc',
  'Connais-tu bien la geographie marocaine ?',
  'geography', 'easy', '6eme',
  '[
    {"question":"Quelle est la capitale du Maroc ?","options":["Casablanca","Rabat","Marrakech","Fes"],"correct":1,"type":"mcq"},
    {"question":"Quelle est la chaine de montagnes la plus haute du Maroc ?","options":["Le Rif","Le Haut Atlas","L''Anti-Atlas","Le Moyen Atlas"],"correct":1,"type":"mcq"},
    {"question":"Le Maroc est borde par quels deux ocean/mer ?","options":["Atlantique et Mediterranee","Atlantique et Mer Rouge","Pacifique et Mediterranee","Indien et Atlantique"],"correct":0,"type":"mcq"},
    {"question":"Quelle est la plus grande ville du Maroc ?","options":["Rabat","Marrakech","Casablanca","Tanger"],"correct":2,"type":"mcq"},
    {"question":"Quel desert se trouve dans le sud-est du Maroc ?","options":["Sahara","Kalahari","Gobi","Atacama"],"correct":0,"type":"mcq"}
  ]'::jsonb,
  10, 60, 50, 'globe', true
)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- SEED: french (extended)
-- ----------------------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, is_active)
VALUES (
  'french_grammaire_v1',
  'Francais - Grammaire',
  'Reviser les bases de la grammaire francaise',
  'french', 'medium', '4eme',
  '[
    {"question":"Quel est le pluriel de \"cheval\" ?","options":["chevals","chevaux","chevales","cheveaux"],"correct":1,"type":"mcq"},
    {"question":"Dans la phrase \"Je mange une pomme\", quel est le COD ?","options":["Je","mange","une pomme","aucun"],"correct":2,"type":"mcq"},
    {"question":"Quel temps : \"J''aurai mange\" ?","options":["Futur simple","Futur anterieur","Passe compose","Conditionnel"],"correct":1,"type":"mcq"},
    {"question":"Le contraire de \"genereux\" est :","options":["aimable","avare","gentil","simple"],"correct":1,"type":"mcq"},
    {"question":"Quel mot est un adverbe ?","options":["rapide","rapidement","rapidite","rapidi"],"correct":1,"type":"mcq"}
  ]'::jsonb,
  12, 60, 60, 'book-open', true
)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- SEED: culture (general culture)
-- ----------------------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, is_active)
VALUES (
  'culture_general_v1',
  'Culture Generale',
  'Cinq questions de culture generale',
  'culture', 'medium', '3eme',
  '[
    {"question":"Qui a peint la Joconde ?","options":["Picasso","Van Gogh","Leonard de Vinci","Monet"],"correct":2,"type":"mcq"},
    {"question":"Quelle est la langue officielle du Bresil ?","options":["Espagnol","Portugais","Anglais","Francais"],"correct":1,"type":"mcq"},
    {"question":"Combien de continents y a-t-il sur Terre ?","options":["5","6","7","8"],"correct":2,"type":"mcq"},
    {"question":"Quel element chimique a pour symbole \"Au\" ?","options":["Argent","Or","Aluminium","Aurium"],"correct":1,"type":"mcq"},
    {"question":"En quelle annee l''homme a-t-il marche sur la Lune pour la premiere fois ?","options":["1965","1969","1972","1975"],"correct":1,"type":"mcq"}
  ]'::jsonb,
  10, 60, 50, 'star', true
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- END MIGRATION 038
-- ============================================================================
