-- 125_seed_beta_demo_content.sql
-- ---------------------------------------------------------------------------
-- Seed de contenu DÉMO / beta — IDEMPOTENT (réexécutable sans doublon).
--
-- Contexte : audit 2026-06-02 (docs/audits/audit-2026-06-02). Les catalogues
-- de contenu cœur sont déjà seedés (quiz=9, défis=9, missions=30, badges=63,
-- boutique=26…). Restaient VRAIMENT vides quelques tables qui laissaient des
-- surfaces câblées sans rien afficher :
--   • events futurs      → pilier « Social » du hub Jouer + /teen/events
--                          (le dashboard lit events WHERE event_date >= now())
--   • passion_tutorials  → pilier « Créa » du hub Jouer + /teen/passions
--   • sport_clubs        → clubs côté /teen
--   • teen_interests     → ranking recommend_for_teen (/teen/offres)
--
-- Chaque INSERT est gardé par WHERE NOT EXISTS (clé naturelle) — relancer la
-- migration ne crée aucun doublon. Données 100 % fictives, supprimables.
-- ---------------------------------------------------------------------------

-- 1) EVENTS (futurs) ---------------------------------------------------------
INSERT INTO public.events (slug, title, description, event_date, status, category, city, price_coins, tags)
SELECT 'demo-skate-jam-casa', 'Skate Jam Casablanca',
       'Session skate ouverte + initiation pour tous les niveaux.',
       now() + interval '5 days', 'published', 'sport', 'Casablanca', 0, ARRAY['sport_skate']
WHERE NOT EXISTS (SELECT 1 FROM public.events WHERE slug = 'demo-skate-jam-casa');

INSERT INTO public.events (slug, title, description, event_date, status, category, city, price_coins, tags)
SELECT 'demo-coding-night-rabat', 'Coding Night Rabat',
       'Atelier code & jeux : crée ton premier mini-jeu en une soirée.',
       now() + interval '9 days', 'published', 'tech', 'Rabat', 0, ARRAY['tech_coding']
WHERE NOT EXISTS (SELECT 1 FROM public.events WHERE slug = 'demo-coding-night-rabat');

INSERT INTO public.events (slug, title, description, event_date, status, category, city, price_coins, tags)
SELECT 'demo-art-jam-marrakech', 'Art Jam Marrakech',
       'Mur d''expression libre : graff, manga, peinture.',
       now() + interval '14 days', 'published', 'art', 'Marrakech', 0, ARRAY['art_drawing']
WHERE NOT EXISTS (SELECT 1 FROM public.events WHERE slug = 'demo-art-jam-marrakech');

-- 2) PASSION_TUTORIALS (pilier Créa — liés aux passion_paths existants) -------
INSERT INTO public.passion_tutorials (code, title, description, category, path_id, level_required, xp_reward, difficulty, is_active)
SELECT 'tut_guitar_chords', 'Tes 4 premiers accords',
       'Apprends les accords de base et joue ta première chanson.', 'music', pp.id, 1, 50, 'easy', true
FROM public.passion_paths pp WHERE pp.code = 'music_guitar'
  AND NOT EXISTS (SELECT 1 FROM public.passion_tutorials t WHERE t.code = 'tut_guitar_chords');

INSERT INTO public.passion_tutorials (code, title, description, category, path_id, level_required, xp_reward, difficulty, is_active)
SELECT 'tut_manga_face', 'Dessiner un visage manga',
       'Les proportions et les yeux : ton premier portrait manga.', 'art', pp.id, 1, 50, 'easy', true
FROM public.passion_paths pp WHERE pp.code = 'art_drawing'
  AND NOT EXISTS (SELECT 1 FROM public.passion_tutorials t WHERE t.code = 'tut_manga_face');

INSERT INTO public.passion_tutorials (code, title, description, category, path_id, level_required, xp_reward, difficulty, is_active)
SELECT 'tut_first_game', 'Code ton premier mini-jeu',
       'De zéro à un jeu jouable dans le navigateur, étape par étape.', 'tech', pp.id, 1, 60, 'normal', true
FROM public.passion_paths pp WHERE pp.code = 'tech_coding'
  AND NOT EXISTS (SELECT 1 FROM public.passion_tutorials t WHERE t.code = 'tut_first_game');

INSERT INTO public.passion_tutorials (code, title, description, category, path_id, level_required, xp_reward, difficulty, is_active)
SELECT 'tut_hiphop_basics', 'Les bases du hip-hop',
       'Top rock, bounce et groove : ton premier enchaînement.', 'dance', pp.id, 1, 50, 'easy', true
FROM public.passion_paths pp WHERE pp.code = 'dance_hiphop'
  AND NOT EXISTS (SELECT 1 FROM public.passion_tutorials t WHERE t.code = 'tut_hiphop_basics');

INSERT INTO public.passion_tutorials (code, title, description, category, path_id, level_required, xp_reward, difficulty, is_active)
SELECT 'tut_phone_photo', 'Photo pro avec ton téléphone',
       'Cadrage, lumière et retouche : des photos qui claquent.', 'photography', pp.id, 1, 50, 'easy', true
FROM public.passion_paths pp WHERE pp.code = 'photo_basics'
  AND NOT EXISTS (SELECT 1 FROM public.passion_tutorials t WHERE t.code = 'tut_phone_photo');

-- 3) SPORT_CLUBS -------------------------------------------------------------
INSERT INTO public.sport_clubs (name, sport_type, city, is_active)
SELECT 'Club de Foot Anfa', 'football', 'Casablanca', true
WHERE NOT EXISTS (SELECT 1 FROM public.sport_clubs WHERE name = 'Club de Foot Anfa');

INSERT INTO public.sport_clubs (name, sport_type, city, is_active)
SELECT 'Dojo Karaté Agdal', 'karate', 'Rabat', true
WHERE NOT EXISTS (SELECT 1 FROM public.sport_clubs WHERE name = 'Dojo Karaté Agdal');

INSERT INTO public.sport_clubs (name, sport_type, city, is_active)
SELECT 'Basket Club Gueliz', 'basketball', 'Marrakech', true
WHERE NOT EXISTS (SELECT 1 FROM public.sport_clubs WHERE name = 'Basket Club Gueliz');

-- 4) TEEN_INTERESTS (ranking recommend_for_teen) — pour tous les ados ---------
INSERT INTO public.teen_interests (teen_id, tag, weight)
SELECT t.id, x.tag, 1.0
FROM public.teens t
CROSS JOIN (VALUES ('sport'), ('music'), ('tech'), ('art'), ('gaming')) AS x(tag)
WHERE NOT EXISTS (
  SELECT 1 FROM public.teen_interests ti WHERE ti.teen_id = t.id AND ti.tag = x.tag
);
