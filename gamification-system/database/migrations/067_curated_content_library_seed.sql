-- ============================================================================
-- Migration 067 — Seed curated_content_library (V1.2-D)
-- ============================================================================
--
-- Wave alpha D2 added a content safety filter; when a generated payload is
-- blocked, content-generator falls back to curated_content_library. The
-- table was empty in prod, so blocked payloads silently dropped.
--
-- This migration seeds 30 admin-vetted "safe by default" entries:
--   - 10 quizzes  (general / school / sport / civic / health-mindfulness)
--   - 10 missions (daily/weekly chore-style — read, hydrate, walk, ...)
--   - 10 challenges (low-stakes social/self-improvement)
--
-- All copy is French, age 13-17, halal-respectful, politically neutral.
-- These are the safety NET, not premium content.
--
-- Idempotent: gated on title uniqueness via NOT EXISTS.
-- RLS: authenticated read-only policy already exists (migration 033).
-- ============================================================================

-- -----------------------------------------------------------------------------
-- QUIZZES (10)
-- -----------------------------------------------------------------------------

INSERT INTO public.curated_content_library
  (content_type, category, title, description, grade_level, difficulty, subject, tags, content_data, validation_notes)
SELECT * FROM (VALUES
  -- 1. general / culture générale
  ('quiz', 'general', 'Culture générale — niveau découverte',
   'Quiz court de culture générale, accessible et factuel.',
   '4eme', 'normal', 'Français', ARRAY['culture','general','fr'],
   $${
     "title": "Culture générale — niveau découverte",
     "description": "Quiz court de culture générale, accessible et factuel.",
     "subject": "Français",
     "difficulty": "normal",
     "grade_level": "4eme",
     "questions": [
       {"question": "Combien y a-t-il de continents sur Terre ?", "options": ["5","6","7","8"], "correct": 2, "explanation": "On compte généralement 7 continents."},
       {"question": "Quelle est la capitale du Maroc ?", "options": ["Casablanca","Rabat","Marrakech","Fès"], "correct": 1, "explanation": "Rabat est la capitale administrative du Maroc."},
       {"question": "Combien de minutes y a-t-il dans une heure ?", "options": ["30","45","60","100"], "correct": 2, "explanation": "Une heure = 60 minutes."},
       {"question": "Quelle planète est la plus proche du Soleil ?", "options": ["Vénus","Mars","Mercure","Terre"], "correct": 2, "explanation": "Mercure est la planète la plus proche du Soleil."}
     ],
     "time_limit_minutes": 5,
     "passing_score": 70,
     "xp_reward": 30
   }$$::jsonb,
   'V1.2 fallback seed — neutre, halal-friendly.'),

  -- 2. school / mathématiques
  ('quiz', 'school', 'Maths — fractions de base',
   'Quiz révision sur les fractions, niveau collège.',
   '5eme', 'normal', 'Mathématiques', ARRAY['maths','fractions','school'],
   $${
     "title": "Maths — fractions de base",
     "description": "Quiz révision sur les fractions, niveau collège.",
     "subject": "Mathématiques",
     "difficulty": "normal",
     "grade_level": "5eme",
     "questions": [
       {"question": "Combien font 1/2 + 1/2 ?", "options": ["1/4","1","2","1/2"], "correct": 1, "explanation": "1/2 + 1/2 = 2/2 = 1."},
       {"question": "Quelle fraction est égale à 0,5 ?", "options": ["1/3","1/2","1/4","2/3"], "correct": 1, "explanation": "1/2 = 0,5."},
       {"question": "3/4 est plus grand que :", "options": ["7/8","2/3","5/6","4/4"], "correct": 1, "explanation": "3/4 = 0,75 et 2/3 ≈ 0,67."},
       {"question": "1/3 + 1/3 + 1/3 = ?", "options": ["1","2/3","3/9","1/9"], "correct": 0, "explanation": "Les trois tiers font une unité entière."}
     ],
     "time_limit_minutes": 6,
     "passing_score": 70,
     "xp_reward": 35
   }$$::jsonb,
   'V1.2 fallback seed.'),

  -- 3. school / français
  ('quiz', 'school', 'Français — accords du participe passé',
   'Révision rapide des accords avec être et avoir.',
   '4eme', 'normal', 'Français', ARRAY['francais','grammaire','school'],
   $${
     "title": "Français — accords du participe passé",
     "description": "Révision rapide des accords avec être et avoir.",
     "subject": "Français",
     "difficulty": "normal",
     "grade_level": "4eme",
     "questions": [
       {"question": "« Elles sont ____ au parc. » — partir.", "options": ["parti","partie","parties","partis"], "correct": 2, "explanation": "Avec être, le participe s'accorde avec le sujet (féminin pluriel)."},
       {"question": "« Les livres que j'ai ____. » — lire.", "options": ["lu","lus","lue","lues"], "correct": 1, "explanation": "Avec avoir, le participe s'accorde avec le COD placé avant (masculin pluriel)."},
       {"question": "« La pomme qu'elle a ____. » — manger.", "options": ["mangé","mangée","mangés","mangées"], "correct": 1, "explanation": "COD « la pomme » placé avant : féminin singulier."},
       {"question": "« Ils ont ____ leurs devoirs. » — finir.", "options": ["fini","finis","finie","finies"], "correct": 0, "explanation": "Le COD « leurs devoirs » est placé après, donc pas d'accord."}
     ],
     "time_limit_minutes": 6,
     "passing_score": 70,
     "xp_reward": 35
   }$$::jsonb,
   'V1.2 fallback seed.'),

  -- 4. sport / sciences du sport
  ('quiz', 'sport', 'Sport — bases de l''hydratation',
   'Quiz factuel sur l''hydratation pendant l''effort.',
   '4eme', 'normal', 'Sciences', ARRAY['sport','hydratation','sante'],
   $${
     "title": "Sport — bases de l'hydratation",
     "description": "Quiz factuel sur l'hydratation pendant l'effort.",
     "subject": "Sciences",
     "difficulty": "normal",
     "grade_level": "4eme",
     "questions": [
       {"question": "Avant un entraînement, il vaut mieux :", "options": ["Boire d'un coup 1L","Boire un grand verre 30 min avant","Ne rien boire","Boire seulement après"], "correct": 1, "explanation": "Hydrater progressivement avant évite les ballonnements et la déshydratation."},
       {"question": "Pendant un effort de plus d'une heure, on conseille :", "options": ["Eau seule","Eau + sodium","Soda sucré","Rien"], "correct": 1, "explanation": "Le sodium aide à compenser les pertes par la sueur."},
       {"question": "Un signe précoce de déshydratation est :", "options": ["Mal à la tête","Force accrue","Vision parfaite","Faim soudaine"], "correct": 0, "explanation": "Un mal de tête léger est un signe fréquent et précoce."},
       {"question": "Combien d'eau boire en moyenne par jour pour un ado actif ?", "options": ["0,5L","1 à 1,5L","2 à 2,5L","5L"], "correct": 2, "explanation": "Environ 2 à 2,5L par jour, à ajuster selon l'activité et la chaleur."}
     ],
     "time_limit_minutes": 5,
     "passing_score": 70,
     "xp_reward": 30
   }$$::jsonb,
   'V1.2 fallback seed — focus santé, pas de régime restrictif.'),

  -- 5. sport / règles du football
  ('quiz', 'sport', 'Sport — règles du football',
   'Connaissances de base sur les règles du football.',
   '5eme', 'normal', 'Sciences', ARRAY['sport','football','regles'],
   $${
     "title": "Sport — règles du football",
     "description": "Connaissances de base sur les règles du football.",
     "subject": "Sciences",
     "difficulty": "normal",
     "grade_level": "5eme",
     "questions": [
       {"question": "Combien de joueurs par équipe sur le terrain ?", "options": ["9","10","11","12"], "correct": 2, "explanation": "11 joueurs par équipe, gardien compris."},
       {"question": "Combien dure un match standard ?", "options": ["60 min","80 min","90 min","100 min"], "correct": 2, "explanation": "Deux mi-temps de 45 minutes."},
       {"question": "Un carton jaune signifie :", "options": ["Exclusion","Avertissement","Penalty","But annulé"], "correct": 1, "explanation": "C'est un avertissement officiel."},
       {"question": "Qui a remporté la CAN 1976 ?", "options": ["Algérie","Maroc","Égypte","Nigéria"], "correct": 1, "explanation": "Le Maroc a remporté la Coupe d'Afrique des Nations 1976."}
     ],
     "time_limit_minutes": 5,
     "passing_score": 70,
     "xp_reward": 30
   }$$::jsonb,
   'V1.2 fallback seed.'),

  -- 6. civic / éducation civique
  ('quiz', 'civic', 'Civisme — vivre ensemble',
   'Quiz sur les bases du vivre-ensemble et du respect.',
   '5eme', 'normal', 'Français', ARRAY['civic','citoyennete','respect'],
   $${
     "title": "Civisme — vivre ensemble",
     "description": "Quiz sur les bases du vivre-ensemble et du respect.",
     "subject": "Français",
     "difficulty": "normal",
     "grade_level": "5eme",
     "questions": [
       {"question": "Que faire si on voit un camarade isolé en récréation ?", "options": ["L'ignorer","Aller lui parler","Se moquer","Rien dire"], "correct": 1, "explanation": "Un geste simple peut beaucoup compter."},
       {"question": "Un comportement civique sur la route, c'est :", "options": ["Traverser n'importe où","Respecter les feux","Courir partout","Bousculer"], "correct": 1, "explanation": "Respecter le code protège tout le monde."},
       {"question": "À la maison, aider sans qu'on demande, ça s'appelle :", "options": ["De la corvée","De l'initiative","De la flemme","De la triche"], "correct": 1, "explanation": "Prendre l'initiative montre de la responsabilité."},
       {"question": "Un déchet par terre, on le :", "options": ["Laisse","Ramasse si possible","Cache","Pousse plus loin"], "correct": 1, "explanation": "Si on peut le faire en sécurité, c'est un bon réflexe."}
     ],
     "time_limit_minutes": 5,
     "passing_score": 70,
     "xp_reward": 30
   }$$::jsonb,
   'V1.2 fallback seed — civique neutre.'),

  -- 7. civic / environnement
  ('quiz', 'civic', 'Environnement — gestes du quotidien',
   'Quiz sur les éco-gestes simples à la maison.',
   '4eme', 'normal', 'Sciences', ARRAY['environnement','eco','quotidien'],
   $${
     "title": "Environnement — gestes du quotidien",
     "description": "Quiz sur les éco-gestes simples à la maison.",
     "subject": "Sciences",
     "difficulty": "normal",
     "grade_level": "4eme",
     "questions": [
       {"question": "Pour économiser l'eau pendant le brossage des dents :", "options": ["Laisser couler","Fermer le robinet","Augmenter le débit","Utiliser de l'eau chaude"], "correct": 1, "explanation": "Fermer le robinet économise plusieurs litres par jour."},
       {"question": "Un appareil en veille consomme :", "options": ["Rien","Un peu d'énergie","Plus qu'allumé","Que la nuit"], "correct": 1, "explanation": "Même en veille, il consomme — autant le débrancher."},
       {"question": "Le tri sélectif, c'est :", "options": ["Tout mélanger","Séparer par type","Brûler","Enterrer"], "correct": 1, "explanation": "Séparer permet de recycler ce qui peut l'être."},
       {"question": "Un trajet court (moins de 1 km), on peut :", "options": ["Prendre la voiture","Marcher","Rester chez soi","Commander un livreur"], "correct": 1, "explanation": "La marche est saine et n'émet rien."}
     ],
     "time_limit_minutes": 5,
     "passing_score": 70,
     "xp_reward": 30
   }$$::jsonb,
   'V1.2 fallback seed.'),

  -- 8. health-mindfulness / sommeil
  ('quiz', 'health', 'Santé — un bon sommeil',
   'Quiz sur les bases d''un sommeil réparateur pour ado.',
   '4eme', 'normal', 'Sciences', ARRAY['sante','sommeil','mindfulness'],
   $${
     "title": "Santé — un bon sommeil",
     "description": "Quiz sur les bases d'un sommeil réparateur pour ado.",
     "subject": "Sciences",
     "difficulty": "normal",
     "grade_level": "4eme",
     "questions": [
       {"question": "Combien d'heures de sommeil pour un ado de 14 ans ?", "options": ["5-6h","6-7h","8-10h","12-14h"], "correct": 2, "explanation": "Les ados ont besoin de 8 à 10h pour bien récupérer."},
       {"question": "L'écran avant de dormir :", "options": ["Aide à dormir","Retarde l'endormissement","N'a aucun effet","Réveille"], "correct": 1, "explanation": "La lumière bleue retarde la mélatonine."},
       {"question": "Une routine du soir efficace inclut :", "options": ["Sport intense","Lumière forte","Lecture calme","Boisson sucrée"], "correct": 2, "explanation": "Une activité calme aide le corps à se préparer."},
       {"question": "Se coucher à la même heure :", "options": ["Sans effet","Améliore le sommeil","Empêche de dormir","Fatigue plus"], "correct": 1, "explanation": "La régularité renforce le rythme biologique."}
     ],
     "time_limit_minutes": 5,
     "passing_score": 70,
     "xp_reward": 30
   }$$::jsonb,
   'V1.2 fallback seed.'),

  -- 9. health-mindfulness / respiration
  ('quiz', 'health', 'Mindfulness — respiration et calme',
   'Quiz sur les techniques simples de respiration.',
   '5eme', 'normal', 'Sciences', ARRAY['mindfulness','respiration','calme'],
   $${
     "title": "Mindfulness — respiration et calme",
     "description": "Quiz sur les techniques simples de respiration.",
     "subject": "Sciences",
     "difficulty": "normal",
     "grade_level": "5eme",
     "questions": [
       {"question": "La respiration en carré dure environ :", "options": ["4-4-4-4 secondes","30 secondes","1 minute","10 minutes"], "correct": 0, "explanation": "Inspirer 4s, retenir 4s, expirer 4s, retenir 4s."},
       {"question": "Avant un examen, respirer lentement aide à :", "options": ["Baisser le stress","Augmenter le stress","Rien faire","Dormir"], "correct": 0, "explanation": "Une expiration plus longue active le calme."},
       {"question": "Quand on est stressé, la respiration devient :", "options": ["Lente","Profonde","Courte et rapide","Inexistante"], "correct": 2, "explanation": "Le stress accélère le souffle — le ralentir aide à se calmer."},
       {"question": "Un bon endroit pour pratiquer 1 min de respiration :", "options": ["Dans le bus bondé","Une chambre calme","Au milieu d'une dispute","En courant"], "correct": 1, "explanation": "Un endroit calme aide à se concentrer sur la respiration."}
     ],
     "time_limit_minutes": 5,
     "passing_score": 70,
     "xp_reward": 30
   }$$::jsonb,
   'V1.2 fallback seed — santé mentale, pas thérapeutique.'),

  -- 10. general / sciences fun
  ('quiz', 'general', 'Sciences — le saviez-vous ?',
   'Quiz curieux sur des faits scientifiques accessibles.',
   '5eme', 'normal', 'Sciences', ARRAY['sciences','curiosite','general'],
   $${
     "title": "Sciences — le saviez-vous ?",
     "description": "Quiz curieux sur des faits scientifiques accessibles.",
     "subject": "Sciences",
     "difficulty": "normal",
     "grade_level": "5eme",
     "questions": [
       {"question": "Le son voyage le plus vite dans :", "options": ["L'air","L'eau","L'acier","Le vide"], "correct": 2, "explanation": "Plus le milieu est dense et rigide, plus le son est rapide."},
       {"question": "L'os le plus long du corps humain est :", "options": ["L'humérus","Le fémur","Le tibia","La colonne"], "correct": 1, "explanation": "Le fémur, dans la cuisse."},
       {"question": "L'eau bout à environ :", "options": ["50°C","75°C","100°C","150°C"], "correct": 2, "explanation": "Au niveau de la mer, à pression standard."},
       {"question": "Combien de couleurs dans un arc-en-ciel classique ?", "options": ["5","6","7","9"], "correct": 2, "explanation": "Sept : rouge, orange, jaune, vert, bleu, indigo, violet."}
     ],
     "time_limit_minutes": 5,
     "passing_score": 70,
     "xp_reward": 30
   }$$::jsonb,
   'V1.2 fallback seed.')
) AS v(content_type, category, title, description, grade_level, difficulty, subject, tags, content_data, validation_notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.curated_content_library
  WHERE curated_content_library.title = v.title AND curated_content_library.content_type = 'quiz'
);

-- -----------------------------------------------------------------------------
-- MISSIONS (10)
-- -----------------------------------------------------------------------------

INSERT INTO public.curated_content_library
  (content_type, category, title, description, difficulty, tags, content_data, validation_notes)
SELECT * FROM (VALUES
  ('mission', 'school', 'Lecture du soir — 30 minutes',
   'Lis 30 minutes ce soir, n''importe quel livre qui te plaît.',
   'normal', ARRAY['lecture','daily','school'],
   $${
     "name": "Lecture du soir — 30 minutes",
     "description": "Lis 30 minutes ce soir, n'importe quel livre qui te plaît. Choisis un endroit calme et coupe les notifications.",
     "mission_type": "daily",
     "category": "school",
     "objective_type": "minutes",
     "objective_target": 30,
     "xp_reward": 30,
     "difficulty": "normal"
   }$$::jsonb,
   'V1.2 fallback seed — daily reading.'),

  ('mission', 'health', 'Hydratation — 2L d''eau aujourd''hui',
   'Bois 2 litres d''eau répartis dans la journée.',
   'normal', ARRAY['hydratation','daily','sante'],
   $${
     "name": "Hydratation — 2L d'eau aujourd'hui",
     "description": "Bois 2 litres d'eau répartis dans la journée. Garde une bouteille à portée de main et bois régulièrement.",
     "mission_type": "daily",
     "category": "health",
     "objective_type": "litres",
     "objective_target": 2,
     "xp_reward": 20,
     "difficulty": "normal"
   }$$::jsonb,
   'V1.2 fallback seed.'),

  ('mission', 'sport', 'Marche active — 5000 pas',
   'Atteins 5000 pas aujourd''hui.',
   'normal', ARRAY['sport','marche','daily'],
   $${
     "name": "Marche active — 5000 pas",
     "description": "Atteins 5000 pas aujourd'hui. Une promenade après les devoirs ou monter à pied au lieu de l'ascenseur, ça compte.",
     "mission_type": "daily",
     "category": "sport",
     "objective_type": "steps",
     "objective_target": 5000,
     "xp_reward": 25,
     "difficulty": "normal"
   }$$::jsonb,
   'V1.2 fallback seed — modéré, pas de défi extrême.'),

  ('mission', 'participation', 'Coup de main maison — 15 minutes',
   'Aide à la maison pendant 15 minutes.',
   'normal', ARRAY['participation','famille','daily'],
   $${
     "name": "Coup de main maison — 15 minutes",
     "description": "Aide à la maison pendant 15 minutes : ranger, mettre la table, plier du linge ou aider en cuisine. Demande à un parent ce qui aide le plus aujourd'hui.",
     "mission_type": "daily",
     "category": "participation",
     "objective_type": "minutes",
     "objective_target": 15,
     "xp_reward": 25,
     "difficulty": "normal"
   }$$::jsonb,
   'V1.2 fallback seed — chore famille.'),

  ('mission', 'school', 'Révision express — 20 minutes',
   'Révise une matière de ton choix pendant 20 minutes.',
   'normal', ARRAY['revision','school','daily'],
   $${
     "name": "Révision express — 20 minutes",
     "description": "Révise une matière de ton choix pendant 20 minutes sans téléphone. Active le mode silencieux et chronomètre.",
     "mission_type": "daily",
     "category": "school",
     "objective_type": "minutes",
     "objective_target": 20,
     "xp_reward": 30,
     "difficulty": "normal"
   }$$::jsonb,
   'V1.2 fallback seed.'),

  ('mission', 'health', 'Pause écran — 1 heure sans téléphone',
   'Reste 1 heure sans téléphone aujourd''hui.',
   'normal', ARRAY['ecrans','sante','daily'],
   $${
     "name": "Pause écran — 1 heure sans téléphone",
     "description": "Reste 1 heure sans téléphone aujourd'hui. Pose-le hors de portée pendant cette heure et fais autre chose : lecture, marche, dessin.",
     "mission_type": "daily",
     "category": "health",
     "objective_type": "minutes",
     "objective_target": 60,
     "xp_reward": 25,
     "difficulty": "normal"
   }$$::jsonb,
   'V1.2 fallback seed.'),

  ('mission', 'creativity', 'Page d''écriture libre — 10 minutes',
   'Écris pendant 10 minutes ce qui te passe par la tête.',
   'normal', ARRAY['creativite','ecriture','daily'],
   $${
     "name": "Page d'écriture libre — 10 minutes",
     "description": "Écris pendant 10 minutes ce qui te passe par la tête, sans te corriger. Personne ne lira si tu ne veux pas.",
     "mission_type": "daily",
     "category": "creativity",
     "objective_type": "minutes",
     "objective_target": 10,
     "xp_reward": 20,
     "difficulty": "normal"
   }$$::jsonb,
   'V1.2 fallback seed.'),

  ('mission', 'school', 'Sprint devoirs — semaine',
   'Termine tous tes devoirs de la semaine sans report.',
   'normal', ARRAY['devoirs','school','weekly'],
   $${
     "name": "Sprint devoirs — semaine",
     "description": "Termine tous tes devoirs de la semaine sans en reporter au week-end. Coche-les au fur et à mesure dans ton agenda.",
     "mission_type": "weekly",
     "category": "school",
     "objective_type": "count",
     "objective_target": 1,
     "xp_reward": 100,
     "difficulty": "normal"
   }$$::jsonb,
   'V1.2 fallback seed — weekly.'),

  ('mission', 'health', 'Sommeil régulier — 5 nuits',
   'Couche-toi à la même heure 5 nuits cette semaine.',
   'normal', ARRAY['sommeil','sante','weekly'],
   $${
     "name": "Sommeil régulier — 5 nuits",
     "description": "Couche-toi à la même heure 5 nuits cette semaine (à 30 minutes près). Note l'heure dans un carnet ou ton téléphone.",
     "mission_type": "weekly",
     "category": "health",
     "objective_type": "nights",
     "objective_target": 5,
     "xp_reward": 90,
     "difficulty": "normal"
   }$$::jsonb,
   'V1.2 fallback seed — weekly sleep regularity.'),

  ('mission', 'participation', 'Rangement chambre — semaine',
   'Range ta chambre 3 fois cette semaine.',
   'normal', ARRAY['rangement','famille','weekly'],
   $${
     "name": "Rangement chambre — semaine",
     "description": "Range ta chambre 3 fois cette semaine (lit fait, sol dégagé, bureau net). 10 minutes suffisent à chaque fois.",
     "mission_type": "weekly",
     "category": "participation",
     "objective_type": "count",
     "objective_target": 3,
     "xp_reward": 80,
     "difficulty": "normal"
   }$$::jsonb,
   'V1.2 fallback seed — weekly chore.')
) AS v(content_type, category, title, description, difficulty, tags, content_data, validation_notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.curated_content_library
  WHERE curated_content_library.title = v.title AND curated_content_library.content_type = 'mission'
);

-- -----------------------------------------------------------------------------
-- CHALLENGES (10)
-- -----------------------------------------------------------------------------

INSERT INTO public.curated_content_library
  (content_type, category, title, description, difficulty, tags, content_data, validation_notes)
SELECT * FROM (VALUES
  ('challenge', 'social', 'Message gentil à un ami',
   'Envoie un message gentil et sincère à un ami aujourd''hui.',
   'normal', ARRAY['social','amitie','daily'],
   $${
     "title": "Message gentil à un ami",
     "description": "Envoie un message gentil et sincère à un ami aujourd'hui. Pas de copier-coller, écris quelque chose qui lui correspond.",
     "category": "social",
     "challenge_type": "daily",
     "xp_reward": 25,
     "difficulty": "normal",
     "validation_type": "self_report"
   }$$::jsonb,
   'V1.2 fallback seed.'),

  ('challenge', 'school', 'Pose une question en cours',
   'Lève la main et pose une vraie question pendant un cours.',
   'normal', ARRAY['social','school','daily'],
   $${
     "title": "Pose une question en cours",
     "description": "Lève la main et pose une vraie question pendant un cours aujourd'hui. Pas besoin que ce soit complexe — une vraie curiosité suffit.",
     "category": "school",
     "challenge_type": "daily",
     "xp_reward": 30,
     "difficulty": "normal",
     "validation_type": "self_report"
   }$$::jsonb,
   'V1.2 fallback seed.'),

  ('challenge', 'social', 'Compliment sincère',
   'Fais un compliment sincère à quelqu''un de ta famille.',
   'normal', ARRAY['social','famille','daily'],
   $${
     "title": "Compliment sincère",
     "description": "Fais un compliment sincère à quelqu'un de ta famille aujourd'hui. Sois précis : ce que tu apprécies vraiment, et pourquoi.",
     "category": "social",
     "challenge_type": "daily",
     "xp_reward": 20,
     "difficulty": "normal",
     "validation_type": "self_report"
   }$$::jsonb,
   'V1.2 fallback seed.'),

  ('challenge', 'creativity', 'Trois idées en 5 minutes',
   'Note 3 idées originales sur un sujet de ton choix en 5 minutes.',
   'normal', ARRAY['creativite','idees','daily'],
   $${
     "title": "Trois idées en 5 minutes",
     "description": "Note 3 idées originales sur un sujet de ton choix en 5 minutes (un projet, une histoire, une invention). Garde-les dans un carnet.",
     "category": "creativity",
     "challenge_type": "daily",
     "xp_reward": 25,
     "difficulty": "normal",
     "validation_type": "self_report"
   }$$::jsonb,
   'V1.2 fallback seed.'),

  ('challenge', 'social', 'Écoute active — 5 minutes',
   'Écoute attentivement quelqu''un parler pendant 5 minutes sans l''interrompre.',
   'normal', ARRAY['social','ecoute','daily'],
   $${
     "title": "Écoute active — 5 minutes",
     "description": "Écoute attentivement quelqu'un parler pendant 5 minutes sans l'interrompre, et reformule ce que tu as compris à la fin.",
     "category": "social",
     "challenge_type": "daily",
     "xp_reward": 25,
     "difficulty": "normal",
     "validation_type": "self_report"
   }$$::jsonb,
   'V1.2 fallback seed.'),

  ('challenge', 'health', 'Repas sans écran',
   'Mange un repas aujourd''hui sans téléphone ni télé.',
   'normal', ARRAY['sante','ecrans','daily'],
   $${
     "title": "Repas sans écran",
     "description": "Mange un repas aujourd'hui sans téléphone ni télé. Pose ton téléphone dans une autre pièce et savoure ce que tu manges.",
     "category": "health",
     "challenge_type": "daily",
     "xp_reward": 20,
     "difficulty": "normal",
     "validation_type": "self_report"
   }$$::jsonb,
   'V1.2 fallback seed.'),

  ('challenge', 'school', 'Apprends un mot nouveau',
   'Apprends un mot nouveau aujourd''hui et utilise-le dans une phrase.',
   'normal', ARRAY['school','vocabulaire','daily'],
   $${
     "title": "Apprends un mot nouveau",
     "description": "Apprends un mot nouveau aujourd'hui (français, langue étrangère, technique...) et utilise-le dans une phrase à l'oral ou à l'écrit.",
     "category": "school",
     "challenge_type": "daily",
     "xp_reward": 20,
     "difficulty": "normal",
     "validation_type": "self_report"
   }$$::jsonb,
   'V1.2 fallback seed.'),

  ('challenge', 'social', 'Remercier quelqu''un',
   'Remercie quelqu''un en personne pour quelque chose de précis.',
   'normal', ARRAY['social','gratitude','daily'],
   $${
     "title": "Remercier quelqu'un",
     "description": "Remercie quelqu'un en personne aujourd'hui pour quelque chose de précis qu'il a fait pour toi (récent ou non). Sois précis sur le pourquoi.",
     "category": "social",
     "challenge_type": "daily",
     "xp_reward": 20,
     "difficulty": "normal",
     "validation_type": "self_report"
   }$$::jsonb,
   'V1.2 fallback seed.'),

  ('challenge', 'creativity', 'Dessin de 10 minutes',
   'Dessine ou griffonne pendant 10 minutes, sans objectif précis.',
   'normal', ARRAY['creativite','dessin','daily'],
   $${
     "title": "Dessin de 10 minutes",
     "description": "Dessine ou griffonne pendant 10 minutes, sans objectif précis. L'idée est juste de prendre le temps de créer quelque chose.",
     "category": "creativity",
     "challenge_type": "daily",
     "xp_reward": 20,
     "difficulty": "normal",
     "validation_type": "self_report"
   }$$::jsonb,
   'V1.2 fallback seed.'),

  ('challenge', 'health', 'Étirements — 5 minutes',
   'Fais 5 minutes d''étirements doux ce soir.',
   'normal', ARRAY['sante','etirements','daily'],
   $${
     "title": "Étirements — 5 minutes",
     "description": "Fais 5 minutes d'étirements doux ce soir avant de te coucher. Cou, épaules, dos, jambes — sans forcer, juste pour relâcher.",
     "category": "health",
     "challenge_type": "daily",
     "xp_reward": 20,
     "difficulty": "normal",
     "validation_type": "self_report"
   }$$::jsonb,
   'V1.2 fallback seed.')
) AS v(content_type, category, title, description, difficulty, tags, content_data, validation_notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.curated_content_library
  WHERE curated_content_library.title = v.title AND curated_content_library.content_type = 'challenge'
);

-- ============================================================================
-- COMMIT NOTE
-- ============================================================================
-- Total seeded: 30 entries (10 quiz + 10 mission + 10 challenge).
-- Fallback hooks (lib/ai/content-generator.ts -> getFallbackQuiz/Mission)
-- already query this table via validator.getCuratedFallback() ->
-- RPC get_curated_content_fallback. No code change required.
