-- =============================================================================
-- MIGRATION 172a_seed_quiz_bank_academique
-- ⚠️  A APPLIQUER — seed banque de quiz G3-A, contenu INACTIF en attente de
--     moderation humaine (is_active=false + prefixe DAILY_ => file d'attente
--     /admin/content/review, app/admin/content/review/page.tsx:79).
-- =============================================================================
-- Groupe : matieres academiques (maths, francais, anglais, arabe)
-- Format questions jsonb = contrat runner {question, options[4], correct, explanation}
--   (lib/quiz/schema.ts:11-17 ; scoring app/api/teen/quiz/submit/route.ts:70).
-- difficulty mappee sur le CHECK (easy|normal|hard|expert) : medium -> normal.
-- Idempotent : ON CONFLICT (code) DO NOTHING.
--
-- Stats de ce fichier :
--   - maths: 13 quiz / 65 questions
--   - francais: 13 quiz / 65 questions
--   - anglais: 13 quiz / 65 questions
--   - arabe: 13 quiz / 65 questions
-- Stats globales banque G3-A (172a+172b) : 104 quiz / 520 questions
--   rejetes: 0 ; questions dedupliquees: 0
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------
-- Matiere: maths (source g3a-maths.json)
-- ---------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_MATHS_01',
  'Calcul express au souk',
  'Des calculs rapides du quotidien : prix, additions et multiplications sans calculatrice.',
  'maths',
  'easy',
  NULL,
  '[{"question":"Combien font 7 × 8 ?","options":["54","56","63","48"],"correct":1,"explanation":"7 × 8 = 56, une table à connaître par cœur pour calculer vite au souk comme en classe."},{"question":"Combien font 3 + 4 × 2 ?","options":["14","10","11","24"],"correct":2,"explanation":"La multiplication passe avant l''addition : 4 × 2 = 8, puis 3 + 8 = 11."},{"question":"Ahmed achète 3 pains à 1,20 DH chacun. Combien paie-t-il en tout ?","options":["3,60 DH","4,20 DH","3,20 DH","2,40 DH"],"correct":0,"explanation":"3 × 1,20 = 3,60 DH : on multiplie le prix unitaire par la quantité."},{"question":"Combien font 100 − 37 ?","options":["67","73","53","63"],"correct":3,"explanation":"100 − 37 = 63 ; astuce : 37 + 63 = 100, penser aux compléments à 100 rend le calcul mental facile."},{"question":"Quel est le double de 45 ?","options":["80","90","95","100"],"correct":1,"explanation":"Doubler, c''est multiplier par 2 : 45 × 2 = 90."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_MATHS_02',
  'Fractions sans stress',
  'Additionner, comparer et prendre une fraction d''un nombre : les bases pour dominer les fractions.',
  'maths',
  'easy',
  NULL,
  '[{"question":"Combien font 1/2 + 1/4 ?","options":["2/6","3/4","1/6","2/4"],"correct":1,"explanation":"On met au même dénominateur : 1/2 = 2/4, donc 2/4 + 1/4 = 3/4."},{"question":"Quelle est la moitié de 3/4 ?","options":["3/8","1/4","3/2","6/4"],"correct":0,"explanation":"Prendre la moitié revient à multiplier par 1/2 : 3/4 × 1/2 = 3/8."},{"question":"Quelle fraction est égale à 2/4 ?","options":["1/3","2/3","1/2","3/4"],"correct":2,"explanation":"En divisant le numérateur et le dénominateur par 2, on trouve 2/4 = 1/2."},{"question":"Combien vaut 3/5 de 20 ?","options":["15","10","8","12"],"correct":3,"explanation":"On calcule 20 ÷ 5 = 4, puis 4 × 3 = 12 : prendre une fraction d''un nombre, c''est diviser puis multiplier."},{"question":"Laquelle de ces deux fractions est la plus grande : 2/3 ou 3/4 ?","options":["2/3","3/4","Elles sont égales","On ne peut pas les comparer"],"correct":1,"explanation":"Au même dénominateur 12 : 2/3 = 8/12 et 3/4 = 9/12, donc 3/4 est plus grande."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_MATHS_03',
  'Pourcentages malins',
  'Soldes, réductions et calculs de pourcentages : deviens imbattable sur les prix.',
  'maths',
  'easy',
  NULL,
  '[{"question":"Combien font 50 % de 80 DH ?","options":["30 DH","45 DH","40 DH","50 DH"],"correct":2,"explanation":"50 %, c''est la moitié : 80 ÷ 2 = 40 DH."},{"question":"Combien font 10 % de 250 ?","options":["25","20","30","2,5"],"correct":0,"explanation":"Pour 10 %, on divise par 10 : 250 ÷ 10 = 25."},{"question":"Un maillot coûte 200 DH. Pendant les soldes à Casablanca, il est à −25 %. Quel est le nouveau prix ?","options":["175 DH","150 DH","160 DH","125 DH"],"correct":1,"explanation":"25 % de 200 = 50 DH de réduction, donc 200 − 50 = 150 DH."},{"question":"Combien font 20 % de 60 ?","options":["10","15","20","12"],"correct":3,"explanation":"20 % = 1/5, donc 60 ÷ 5 = 12."},{"question":"Comment s''écrit la fraction 15/100 en pourcentage ?","options":["1,5 %","150 %","15 %","0,15 %"],"correct":2,"explanation":"Un pourcentage est une fraction de dénominateur 100 : 15/100 = 15 %."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_MATHS_04',
  'Géométrie : les bases',
  'Périmètres, aires et figures : les indispensables de la géométrie du collège.',
  'maths',
  'easy',
  NULL,
  '[{"question":"Quel est le périmètre d''un carré de côté 5 cm ?","options":["25 cm","20 cm","10 cm","15 cm"],"correct":1,"explanation":"Le périmètre d''un carré vaut 4 × côté : 4 × 5 = 20 cm."},{"question":"Quelle est l''aire d''un rectangle de longueur 6 cm et de largeur 4 cm ?","options":["24 cm²","20 cm²","10 cm²","12 cm²"],"correct":0,"explanation":"L''aire d''un rectangle vaut longueur × largeur : 6 × 4 = 24 cm²."},{"question":"Quelle est la somme des angles d''un triangle ?","options":["90°","360°","270°","180°"],"correct":3,"explanation":"Dans n''importe quel triangle, les trois angles font toujours 180° au total."},{"question":"Comment s''appelle un triangle dont les 3 côtés ont la même longueur ?","options":["Isocèle","Rectangle","Équilatéral","Scalène"],"correct":2,"explanation":"Un triangle équilatéral a 3 côtés égaux et 3 angles de 60°."},{"question":"Combien de côtés possède un hexagone ?","options":["5","6","7","8"],"correct":1,"explanation":"« Hexa » signifie six en grec : un hexagone a 6 côtés, comme les alvéoles des abeilles."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_MATHS_05',
  'Nombres : divisible ou pas ?',
  'Nombres premiers, pairs, puissances et divisions : muscle ton calcul mental.',
  'maths',
  'easy',
  NULL,
  '[{"question":"Lequel de ces nombres est divisible par 3 ?","options":["85","88","84","86"],"correct":2,"explanation":"Un nombre est divisible par 3 si la somme de ses chiffres l''est : 8 + 4 = 12, donc 84 est divisible par 3."},{"question":"Quel est le plus petit nombre premier ?","options":["1","2","3","0"],"correct":1,"explanation":"2 est le plus petit nombre premier et le seul qui soit pair ; 1 n''est pas premier."},{"question":"Lequel de ces nombres est pair ?","options":["735","733","731","738"],"correct":3,"explanation":"Un nombre pair se termine par 0, 2, 4, 6 ou 8 : 738 finit par 8, il est donc pair."},{"question":"Combien vaut 5³ (5 puissance 3) ?","options":["125","15","55","555"],"correct":0,"explanation":"5³ = 5 × 5 × 5 = 125 : la puissance indique combien de fois on multiplie le nombre par lui-même."},{"question":"Quel est le reste de la division de 17 par 5 ?","options":["3","2","1","4"],"correct":1,"explanation":"17 = 5 × 3 + 2, donc le reste est 2 : c''est la division euclidienne."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_MATHS_06',
  'Équations niveau 1',
  'Trouve la valeur de x : les techniques de base pour résoudre une équation.',
  'maths',
  'normal',
  NULL,
  '[{"question":"Si x + 7 = 15, combien vaut x ?","options":["22","7","8","9"],"correct":2,"explanation":"On soustrait 7 des deux côtés : x = 15 − 7 = 8."},{"question":"Si 3x = 21, combien vaut x ?","options":["7","63","18","6"],"correct":0,"explanation":"On divise les deux côtés par 3 : x = 21 ÷ 3 = 7."},{"question":"Si 2x + 5 = 17, combien vaut x ?","options":["11","5","8","6"],"correct":3,"explanation":"On enlève 5 (2x = 12) puis on divise par 2 : x = 6."},{"question":"Si x/4 = 9, combien vaut x ?","options":["13","36","32","2,25"],"correct":1,"explanation":"On multiplie les deux côtés par 4 : x = 9 × 4 = 36."},{"question":"Si 5x − 3 = 2x + 9, combien vaut x ?","options":["4","3","6","2"],"correct":0,"explanation":"On regroupe les x d''un côté : 3x = 12, donc x = 4."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_MATHS_07',
  'Proportionnalité au quotidien',
  'Prix au kilo, vitesses, recettes et échelles : la proportionnalité sert partout.',
  'maths',
  'normal',
  NULL,
  '[{"question":"3 kg d''oranges coûtent 21 DH au marché de Marrakech. Combien coûtent 5 kg ?","options":["30 DH","32 DH","35 DH","40 DH"],"correct":2,"explanation":"Le prix d''un kilo est 21 ÷ 3 = 7 DH, donc 5 kg coûtent 5 × 7 = 35 DH."},{"question":"Un bus roule à 90 km/h entre Casablanca et une autre ville. Quelle distance parcourt-il en 2 heures ?","options":["180 km","120 km","90 km","200 km"],"correct":0,"explanation":"Distance = vitesse × temps : 90 × 2 = 180 km."},{"question":"Une recette de msemen pour 4 personnes demande 200 g de farine. Quelle quantité pour 10 personnes ?","options":["400 g","450 g","600 g","500 g"],"correct":3,"explanation":"Il faut 50 g par personne (200 ÷ 4), donc 10 × 50 = 500 g."},{"question":"Sur une carte à l''échelle 1/100 000, deux villes sont séparées de 3 cm. Quelle est la distance réelle ?","options":["300 m","3 km","30 km","300 km"],"correct":1,"explanation":"3 cm × 100 000 = 300 000 cm = 3 km : l''échelle indique par combien multiplier la distance sur la carte."},{"question":"8 cahiers coûtent 48 DH. Combien coûtent 3 cahiers ?","options":["16 DH","24 DH","18 DH","12 DH"],"correct":2,"explanation":"Un cahier coûte 48 ÷ 8 = 6 DH, donc 3 cahiers coûtent 18 DH : c''est le retour à l''unité."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_MATHS_08',
  'Fractions niveau 2',
  'Multiplier, diviser et simplifier des fractions : passe au niveau supérieur.',
  'maths',
  'normal',
  NULL,
  '[{"question":"Combien font 2/3 + 1/6 ?","options":["3/9","5/6","3/6","1/2"],"correct":1,"explanation":"On met au dénominateur 6 : 2/3 = 4/6, puis 4/6 + 1/6 = 5/6."},{"question":"Combien font 3/4 × 2/5 ?","options":["3/10","5/9","6/9","15/8"],"correct":0,"explanation":"On multiplie les numérateurs et les dénominateurs : 6/20, qui se simplifie en 3/10."},{"question":"Combien font 1/2 ÷ 1/4 ?","options":["1/8","1/2","4","2"],"correct":3,"explanation":"Diviser par une fraction revient à multiplier par son inverse : 1/2 × 4 = 2."},{"question":"Quelle est la forme irréductible de 18/24 ?","options":["2/3","4/5","3/4","6/8"],"correct":2,"explanation":"On divise le haut et le bas par 6 (leur PGCD) : 18/24 = 3/4 ; 6/8 n''est pas complètement simplifiée."},{"question":"Amina a mangé 2/5 d''une pizza et son frère 1/5. Quelle fraction de la pizza reste-t-il ?","options":["3/5","1/5","4/5","2/5"],"correct":3,"explanation":"Ils ont mangé 3/5 en tout, il reste donc 1 − 3/5 = 2/5."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_MATHS_09',
  'Géométrie niveau 2',
  'Pythagore, cercles et angles : les outils qui font de toi un pro de la géométrie.',
  'maths',
  'normal',
  NULL,
  '[{"question":"Un triangle rectangle a des côtés de 3 cm et 4 cm autour de l''angle droit. Combien mesure l''hypoténuse ?","options":["5 cm","6 cm","7 cm","12 cm"],"correct":0,"explanation":"D''après Pythagore : 3² + 4² = 9 + 16 = 25, et √25 = 5 cm."},{"question":"Quelle est l''aire d''un triangle de base 10 cm et de hauteur 6 cm ?","options":["60 cm²","30 cm²","16 cm²","25 cm²"],"correct":1,"explanation":"Aire d''un triangle = (base × hauteur) ÷ 2 : (10 × 6) ÷ 2 = 30 cm²."},{"question":"Quel est le périmètre d''un cercle de rayon 5 cm (avec π ≈ 3,14) ?","options":["15,7 cm","78,5 cm","31,4 cm","25 cm"],"correct":2,"explanation":"Le périmètre d''un cercle vaut 2 × π × rayon : 2 × 3,14 × 5 = 31,4 cm."},{"question":"Deux angles complémentaires ont une somme de 90°. Si l''un mesure 35°, combien mesure l''autre ?","options":["65°","145°","45°","55°"],"correct":3,"explanation":"90 − 35 = 55° ; à ne pas confondre avec les angles supplémentaires dont la somme fait 180°."},{"question":"Quelle est l''aire d''un disque de rayon 3 cm (avec π ≈ 3,14) ?","options":["28,3 cm²","18,8 cm²","9,4 cm²","56,5 cm²"],"correct":0,"explanation":"Aire d''un disque = π × rayon² : 3,14 × 9 ≈ 28,3 cm² ; 18,8 cm serait son périmètre."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_MATHS_10',
  'Stats : décode les chiffres',
  'Moyenne, médiane, étendue et fréquences : apprends à lire les données comme un data analyst.',
  'maths',
  'normal',
  NULL,
  '[{"question":"Quelle est la moyenne de 12, 15 et 18 ?","options":["14","16","15","45"],"correct":2,"explanation":"On additionne (45) puis on divise par le nombre de valeurs (3) : 45 ÷ 3 = 15."},{"question":"Quelle est la médiane de la série 3, 7, 9, 12, 15 ?","options":["9","7","12","9,2"],"correct":0,"explanation":"La médiane est la valeur du milieu quand la série est rangée : ici c''est 9, la 3e valeur sur 5."},{"question":"Omar a eu 10, 12, 14 et 16 en maths ce semestre. Quelle est sa moyenne ?","options":["12","14","12,5","13"],"correct":3,"explanation":"10 + 12 + 14 + 16 = 52, et 52 ÷ 4 = 13."},{"question":"Quelle est l''étendue de la série 5, 8, 12, 20 ?","options":["25","15","12","5"],"correct":1,"explanation":"L''étendue est l''écart entre la plus grande et la plus petite valeur : 20 − 5 = 15."},{"question":"Dans une classe de 30 élèves à Fès, 18 sont des filles. Quelle est la fréquence des filles en pourcentage ?","options":["50 %","55 %","60 %","65 %"],"correct":2,"explanation":"La fréquence vaut 18/30 = 0,6, soit 60 % : on divise l''effectif par le total."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_MATHS_11',
  'Équations : boss level',
  'Équations avec parenthèses et problèmes concrets : le niveau qui fait la différence au contrôle.',
  'maths',
  'hard',
  NULL,
  '[{"question":"Si 4(x − 2) = 2x + 6, combien vaut x ?","options":["5","6","7","8"],"correct":2,"explanation":"On développe : 4x − 8 = 2x + 6, donc 2x = 14 et x = 7."},{"question":"Le triple d''un nombre augmenté de 5 égale 26. Quel est ce nombre ?","options":["7","9","6","8"],"correct":0,"explanation":"On traduit en équation : 3x + 5 = 26, donc 3x = 21 et x = 7."},{"question":"Yassine a 3 ans de plus que Salma et, ensemble, ils ont 27 ans. Quel est l''âge de Salma ?","options":["15 ans","13 ans","14 ans","12 ans"],"correct":3,"explanation":"Si Salma a x ans, alors x + (x + 3) = 27, donc 2x = 24 et x = 12."},{"question":"Si x/3 + 2 = x/2, combien vaut x ?","options":["6","12","4","10"],"correct":1,"explanation":"On multiplie tout par 6 : 2x + 12 = 3x, donc x = 12."},{"question":"Au cinéma, la place coûte 40 DH pour un adulte et 25 DH pour un ado. Une famille paie 155 DH pour 2 adultes et des ados. Combien y a-t-il d''ados ?","options":["2","4","3","5"],"correct":2,"explanation":"Les adultes paient 80 DH, il reste 75 DH pour les ados : 75 ÷ 25 = 3 ados."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_MATHS_12',
  'Géométrie : mode expert',
  'Thalès, volumes et Pythagore réciproque : la géométrie version champion.',
  'maths',
  'hard',
  NULL,
  '[{"question":"Dans un triangle ABC, M est sur [AB] et N sur [AC] avec (MN) parallèle à (BC). Si AM = 2 cm, AB = 6 cm et BC = 9 cm, combien mesure MN ?","options":["3 cm","4,5 cm","6 cm","2 cm"],"correct":0,"explanation":"D''après le théorème de Thalès : MN = BC × AM/AB = 9 × 2/6 = 3 cm."},{"question":"Quel est le volume d''un pavé droit de dimensions 5 cm × 4 cm × 3 cm ?","options":["12 cm³","47 cm³","60 cm³","120 cm³"],"correct":2,"explanation":"Volume d''un pavé = longueur × largeur × hauteur : 5 × 4 × 3 = 60 cm³."},{"question":"Quel est le volume d''un cylindre de rayon 2 cm et de hauteur 10 cm (avec π ≈ 3,14) ?","options":["62,8 cm³","251,2 cm³","40 cm³","125,6 cm³"],"correct":3,"explanation":"Volume d''un cylindre = π × rayon² × hauteur : 3,14 × 4 × 10 = 125,6 cm³."},{"question":"Un triangle a des côtés de 6 cm, 8 cm et 10 cm. Que peut-on affirmer ?","options":["Il est équilatéral","Il est rectangle","Il ne peut pas exister","Il est isocèle"],"correct":1,"explanation":"Comme 6² + 8² = 36 + 64 = 100 = 10², la réciproque de Pythagore prouve qu''il est rectangle."},{"question":"Un carré a une aire de 144 cm². Quel est son périmètre ?","options":["48 cm","36 cm","24 cm","144 cm"],"correct":0,"explanation":"Le côté vaut √144 = 12 cm, donc le périmètre vaut 4 × 12 = 48 cm."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_MATHS_13',
  'Le défi ultime',
  'Puissances, relatifs, racines et réductions en chaîne : 5 questions pour prouver ton niveau.',
  'maths',
  'hard',
  NULL,
  '[{"question":"Combien vaut 2⁵ (2 puissance 5) ?","options":["10","25","64","32"],"correct":3,"explanation":"2⁵ = 2 × 2 × 2 × 2 × 2 = 32 ; chaque puissance de 2 double la précédente."},{"question":"Combien font (−3) × (−4) + (−2) × 5 ?","options":["2","−2","22","−22"],"correct":0,"explanation":"(−3) × (−4) = 12 car moins par moins donne plus, et (−2) × 5 = −10, donc 12 − 10 = 2."},{"question":"Un article coûte 200 DH. Il subit deux réductions successives de 10 %. Quel est le prix final ?","options":["160 DH","162 DH","158 DH","165 DH"],"correct":1,"explanation":"200 → 180 après la première réduction, puis 180 − 18 = 162 DH : deux fois −10 % ne font pas −20 % !"},{"question":"Combien font √81 + √16 ?","options":["12","97","13","11"],"correct":2,"explanation":"√81 = 9 et √16 = 4, donc 9 + 4 = 13 ; attention, la racine d''une somme n''est pas la somme des racines."},{"question":"Un réservoir se remplit aux 3/8 en 15 minutes, à débit constant. Combien de temps faut-il pour le remplir entièrement ?","options":["35 min","45 min","50 min","40 min"],"correct":3,"explanation":"1/8 du réservoir se remplit en 15 ÷ 3 = 5 minutes, donc 8/8 en 8 × 5 = 40 minutes."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;


-- ---------------------------------------------------------------
-- Matiere: francais (source g3a-francais.json)
-- ---------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_FRANCAIS_01',
  'Le présent, easy game',
  'Conjugue les verbes du quotidien au présent sans te tromper.',
  'francais',
  'easy',
  NULL,
  '[{"question":"Complète : « Je ___ au collège à Casablanca. »","options":["va","vais","allons","vas"],"correct":1,"explanation":"Le verbe aller au présent se conjugue « je vais », une forme irrégulière à connaître par cœur."},{"question":"Complète : « Nous ___ le couscous chaque vendredi. »","options":["mangons","mangeont","mangeons","mange"],"correct":2,"explanation":"Les verbes en -ger gardent un « e » avant -ons pour conserver le son [j] : nous mangeons."},{"question":"Complète : « Tu ___ tes devoirs avant de sortir. »","options":["finis","finit","finies","fini"],"correct":0,"explanation":"À la 2e personne du singulier, les verbes du 2e groupe prennent -is : tu finis."},{"question":"Complète : « Ils ___ au foot sur le terrain du quartier. »","options":["joue","joues","jouons","jouent"],"correct":3,"explanation":"Avec « ils », les verbes en -er prennent la terminaison -ent : ils jouent."},{"question":"Complète : « Elle ___ un thé à la menthe à la terrasse. »","options":["prends","prend","prenne","prendre"],"correct":1,"explanation":"Avec il ou elle, « prendre » s''écrit « prend » sans s : le s est réservé à je et tu."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_FRANCAIS_02',
  'Pluriels sans fautes',
  'Journaux, gâteaux, yeux... maîtrise les pluriels qui piègent tout le monde.',
  'francais',
  'easy',
  NULL,
  '[{"question":"Quel est le pluriel de « journal » ?","options":["journals","journaux","journeaux","journales"],"correct":1,"explanation":"Les noms en -al font généralement leur pluriel en -aux : un journal, des journaux."},{"question":"Quel est le pluriel de « gâteau » ?","options":["gâteaus","gâteauxs","gâteaux","gâteau"],"correct":2,"explanation":"Les noms en -eau prennent un x au pluriel : des gâteaux, des bateaux, des cadeaux."},{"question":"Quel est le pluriel de « œil » ?","options":["œils","œilles","œux","yeux"],"correct":3,"explanation":"« Œil » a un pluriel totalement irrégulier : un œil, des yeux."},{"question":"Quel est le pluriel de « pneu » ?","options":["pneus","pneux","pneues","pneu"],"correct":0,"explanation":"« Pneu » et « bleu » sont des exceptions : ils prennent un s au pluriel, pas un x."},{"question":"« Des chevaux » est le pluriel de quel mot ?","options":["chevau","cheval","chevalle","chevel"],"correct":1,"explanation":"« Cheval » suit la règle des mots en -al qui deviennent -aux au pluriel."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_FRANCAIS_03',
  'Synonymes & contraires express',
  'Enrichis ton vocabulaire en trouvant le bon mot du premier coup.',
  'francais',
  'easy',
  NULL,
  '[{"question":"Quel mot est un synonyme de « content » ?","options":["triste","joyeux","fâché","fatigué"],"correct":1,"explanation":"Un synonyme a presque le même sens : content et joyeux expriment tous les deux la bonne humeur."},{"question":"Quel mot est le contraire de « rapide » ?","options":["vite","pressé","lent","agile"],"correct":2,"explanation":"Le contraire (ou antonyme) de rapide est lent ; « vite » est au contraire un mot de la même famille d''idées."},{"question":"Quel mot est un synonyme de « maison » ?","options":["demeure","école","rue","jardin"],"correct":0,"explanation":"« Demeure » est un synonyme plus soutenu de « maison », utile pour varier son style à l''écrit."},{"question":"Quel mot est le contraire de « monter » ?","options":["grimper","escalader","avancer","descendre"],"correct":3,"explanation":"Descendre est l''antonyme de monter ; grimper et escalader en sont au contraire des synonymes."},{"question":"Quel mot est un synonyme de « peur » ?","options":["courage","colère","crainte","surprise"],"correct":2,"explanation":"« Crainte » est un synonyme de « peur », souvent utilisé dans un registre plus soutenu."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_FRANCAIS_04',
  'Masculin ou féminin ?',
  'Le genre des mots, avec les pièges classiques qui font rater les dictées.',
  'francais',
  'easy',
  NULL,
  '[{"question":"Comment dit-on correctement ?","options":["un orange","une orange","des orange","le orange"],"correct":1,"explanation":"Le fruit « orange » est un nom féminin : on dit une orange."},{"question":"Quel est le féminin de « acteur » ?","options":["acteuse","acteure","actrice","actresse"],"correct":2,"explanation":"Les noms en -teur font souvent leur féminin en -trice : acteur, actrice."},{"question":"Quel est le féminin de « lion » ?","options":["lionne","lione","lionette","liona"],"correct":0,"explanation":"On double le n avant le e final : lion devient lionne, comme chien devient chienne."},{"question":"Quel est le féminin de « chanteur » ?","options":["chanteuse","chantrice","chanteure","chantesse"],"correct":0,"explanation":"Les noms en -eur font souvent leur féminin en -euse : chanteur, chanteuse."},{"question":"Lequel de ces mots est féminin ?","options":["pétale","autoroute","tentacule","éloge"],"correct":1,"explanation":"« Autoroute » est féminin (une autoroute), alors que pétale, tentacule et éloge sont masculins malgré les apparences."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_FRANCAIS_05',
  'Les mots du quotidien',
  'Le vocabulaire de tous les jours, du souk à la médina.',
  'francais',
  'easy',
  NULL,
  '[{"question":"Que signifie l''expression « faire ses courses » ?","options":["Courir un marathon","Acheter ce dont on a besoin","Faire du sport","Aller à l''école"],"correct":1,"explanation":"« Faire ses courses » signifie acheter ce dont on a besoin, même si le mot « course » évoque aussi la vitesse."},{"question":"En français, un « souk » désigne...","options":["un marché traditionnel","une école","un stade","une gare"],"correct":0,"explanation":"Le mot « souk », entré dans le dictionnaire français, désigne un marché traditionnel des pays du Maghreb et du Moyen-Orient."},{"question":"Le mot « médina » désigne...","options":["un désert","une plage","la vieille ville","une montagne"],"correct":2,"explanation":"La médina est la partie ancienne d''une ville, comme la médina de Fès, l''une des plus grandes du monde."},{"question":"Un article coûte 25 dirhams et tu paies avec un billet de 50 dirhams. Le vendeur te « rend la monnaie » : cela veut dire...","options":["qu''il garde tout","qu''il te fait un cadeau","qu''il baisse le prix","qu''il te redonne la différence"],"correct":3,"explanation":"« Rendre la monnaie » signifie redonner la différence, ici 25 dirhams."},{"question":"Que signifie le verbe « flâner » ?","options":["se promener sans but précis","courir très vite","dormir profondément","travailler dur"],"correct":0,"explanation":"Flâner, c''est se promener tranquillement sans but précis, par exemple dans les ruelles d''une médina."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_FRANCAIS_06',
  'Homophones : déjoue les pièges',
  'a/à, est/et, ses/ces, où/ou... les jumeaux sonores n''auront plus de secret.',
  'francais',
  'normal',
  NULL,
  '[{"question":"Complète : « Il ___ parti ___ Rabat ce matin. »","options":["et / a","est / à","est / a","et / à"],"correct":1,"explanation":"« Est » est le verbe être (on peut dire « était ») et « à » avec accent indique le lieu."},{"question":"Complète : « ___ frères ___ au lycée Mohammed-V. »","options":["Ces / son","Ses / son","Ces / sont","Ses / sont"],"correct":3,"explanation":"« Ses » indique la possession (les siens) et « sont » est le verbe être (on peut dire « étaient »)."},{"question":"Complète : « Je ne sais pas ___ tu habites : à Fès ___ à Meknès ? »","options":["ou / où","où / ou","où / où","ou / ou"],"correct":1,"explanation":"« Où » avec accent indique le lieu ; « ou » sans accent exprime un choix (on peut le remplacer par « ou bien »)."},{"question":"Complète : « Il ___ blessé pendant le match. »","options":["c''est","sait","s''est","ces"],"correct":2,"explanation":"Devant un participe passé avec un sujet qui fait l''action sur lui-même, on écrit « s''est » : il s''est blessé."},{"question":"Complète : « Pose ton sac ___, il ___ oublié hier. »","options":["la / la","la / l''a","là / la","là / l''a"],"correct":3,"explanation":"« Là » avec accent indique un lieu, et « l''a » = le + a (verbe avoir), qu''on peut remplacer par « l''avait »."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_FRANCAIS_07',
  'Passé composé vs imparfait',
  'Raconter le passé sans se mélanger : action ponctuelle ou habitude ?',
  'francais',
  'normal',
  NULL,
  '[{"question":"Complète : « Elle ___ allée au hammam avec sa mère. »","options":["a","est","était","avait"],"correct":1,"explanation":"Le verbe aller se conjugue avec l''auxiliaire être au passé composé : elle est allée."},{"question":"Complète : « Quand j''étais petit, j''___ chaque été à la plage d''Agadir. »","options":["suis allé","irai","allais","vais"],"correct":2,"explanation":"L''imparfait exprime une habitude dans le passé, signalée ici par « chaque été »."},{"question":"Complète : « Hier soir, nous ___ un match incroyable. »","options":["regardions","regardons","regarderons","avons regardé"],"correct":3,"explanation":"Le passé composé exprime une action terminée et datée, ici par « hier soir »."},{"question":"Quelle est la forme correcte de « être » à l''imparfait avec « nous » ?","options":["étions","sommes","serions","étaient"],"correct":0,"explanation":"À l''imparfait, être se conjugue « nous étions » ; « sommes » est le présent et « serions » le conditionnel."},{"question":"Complète : « Je lisais tranquillement quand le téléphone ___. »","options":["sonnait","a sonné","sonne","sonnerait"],"correct":1,"explanation":"Une action ponctuelle qui interrompt une action en cours (à l''imparfait) se met au passé composé."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_FRANCAIS_08',
  'C''est quoi ce mot ?',
  'Nom, verbe, adjectif, adverbe... apprends à identifier la nature des mots.',
  'francais',
  'normal',
  NULL,
  '[{"question":"Dans la phrase « Le chat dort », le mot « chat » est...","options":["un verbe","un adjectif","un nom","un adverbe"],"correct":2,"explanation":"« Chat » désigne un être vivant : c''est un nom commun, précédé ici de l''article « le »."},{"question":"Le mot « rapidement » est...","options":["un adverbe","un adjectif","un nom","une préposition"],"correct":0,"explanation":"Les mots en -ment qui précisent un verbe sont des adverbes : ils sont invariables."},{"question":"Dans « une ville magnifique », le mot « magnifique » est...","options":["un nom","un adjectif","un verbe","un pronom"],"correct":1,"explanation":"« Magnifique » qualifie le nom « ville » : c''est un adjectif qualificatif."},{"question":"Dans « Il va à Marrakech », le mot « à » est...","options":["un article","un adverbe","une conjonction","une préposition"],"correct":3,"explanation":"« À » introduit un complément de lieu : c''est une préposition, comme « de », « pour » ou « chez »."},{"question":"Dans « Je pense que tu as raison », le mot « que » est...","options":["un pronom relatif","une conjonction de subordination","un adverbe","une préposition"],"correct":1,"explanation":"Ici « que » relie la proposition principale à une subordonnée complétive : c''est une conjonction de subordination."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_FRANCAIS_09',
  'Cap sur le futur',
  'Futur simple ou conditionnel ? Projette-toi sans faute de conjugaison.',
  'francais',
  'normal',
  NULL,
  '[{"question":"Complète : « Demain, je ___ mes devoirs avant de sortir. »","options":["ferais","fais","faisais","ferai"],"correct":3,"explanation":"Une action certaine dans l''avenir se met au futur simple : je ferai, sans s final."},{"question":"Complète : « Si j''avais de l''argent, j''___ un nouveau téléphone. »","options":["achèterai","achetais","achèterais","achète"],"correct":2,"explanation":"Après « si + imparfait », on utilise le conditionnel présent : j''achèterais, avec un s."},{"question":"Quelle est la forme correcte de « être » au futur avec « tu » ?","options":["sera","seras","serais","serai"],"correct":1,"explanation":"Au futur simple, « tu » prend toujours un s : tu seras ; « serais » est du conditionnel."},{"question":"Complète : « Nous ___ le bus de 8 h pour ne pas être en retard. »","options":["prendrons","prendrions","prenons","prendront"],"correct":0,"explanation":"Au futur simple avec « nous », la terminaison est -ons : nous prendrons."},{"question":"Complète poliment : « ___-vous m''indiquer la gare de Casa-Voyageurs, s''il vous plaît ? »","options":["Pouvez","Pourrez","Pourriez","Pouviez"],"correct":2,"explanation":"Le conditionnel de politesse (« pourriez-vous ») rend une demande plus courtoise que le présent."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_FRANCAIS_10',
  'Lis entre les lignes',
  'Petits textes, grandes idées : entraîne ta compréhension de lecture.',
  'francais',
  'normal',
  NULL,
  '[{"question":"« Yassine se lève à 6 h 30, prend son petit-déjeuner et attrape le bus scolaire à 7 h 15. » À quelle heure prend-il le bus ?","options":["6 h 30","7 h","7 h 15","8 h"],"correct":2,"explanation":"L''information est donnée directement dans le texte : le bus est à 7 h 15, l''heure du lever est un piège."},{"question":"« Malgré la pluie, Salma est sortie courir. » Cette phrase signifie que...","options":["elle n''a pas couru à cause de la pluie","elle a couru même s''il pleuvait","elle attend la fin de la pluie","elle déteste courir"],"correct":1,"explanation":"« Malgré » exprime l''opposition : l''obstacle (la pluie) n''a pas empêché l''action (courir)."},{"question":"« Le magasin ouvre tous les jours sauf le dimanche. » Le magasin est fermé...","options":["le lundi","le vendredi","jamais","le dimanche"],"correct":3,"explanation":"« Sauf » signifie « à l''exception de » : le seul jour de fermeture est donc le dimanche."},{"question":"« Le thé à la menthe n''est pas seulement une boisson au Maroc : c''est un signe d''hospitalité que l''on offre aux invités. » Quelle est l''idée principale ?","options":["Le thé est un symbole d''hospitalité","Le thé coûte cher","Le thé se boit froid","Les invités n''aiment pas le thé"],"correct":0,"explanation":"L''idée principale est ce que le texte veut montrer globalement : ici, la valeur d''accueil du thé, pas un détail."},{"question":"« Karim regarde le ciel gris, prend son parapluie et sort. » Que peut-on déduire ?","options":["Il fait très chaud","Il va à la plage","Il pense qu''il va pleuvoir","Il a oublié son parapluie"],"correct":2,"explanation":"Déduire, c''est comprendre ce qui n''est pas écrit : ciel gris + parapluie = il s''attend à la pluie."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_FRANCAIS_11',
  'Le subjonctif, tranquille',
  'Il faut que tu réussisses ce quiz... et c''est déjà du subjonctif.',
  'francais',
  'hard',
  NULL,
  '[{"question":"Complète : « Il faut que tu ___ tes devoirs ce soir. »","options":["fais","fasses","feras","faisais"],"correct":1,"explanation":"« Il faut que » est toujours suivi du subjonctif : que tu fasses."},{"question":"Complète : « Je veux que vous ___ à l''heure au rendez-vous. »","options":["êtes","serez","soyez","étiez"],"correct":2,"explanation":"Les verbes de volonté comme « vouloir que » entraînent le subjonctif : que vous soyez."},{"question":"Quelle est la forme correcte du verbe « avoir » au subjonctif présent avec « il » ?","options":["qu''il a","qu''il aura","qu''il aie","qu''il ait"],"correct":3,"explanation":"Au subjonctif présent, avoir donne « qu''il ait » ; « que j''aie » est réservé à la première personne."},{"question":"Laquelle de ces expressions est toujours suivie du subjonctif ?","options":["parce que","bien que","pendant que","puisque"],"correct":1,"explanation":"« Bien que » exprime la concession et exige le subjonctif, alors que les trois autres appellent l''indicatif."},{"question":"Complète : « Bien qu''il ___ fatigué, il continue de s''entraîner. »","options":["soit","est","sera","était"],"correct":0,"explanation":"Après « bien que », le verbe être se met au subjonctif : qu''il soit."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_FRANCAIS_12',
  'Figures de style : mode boss',
  'Métaphore, hyperbole, litote... repère les effets de style comme un pro.',
  'francais',
  'hard',
  NULL,
  '[{"question":"« Il est fort comme un lion » est...","options":["une métaphore","une comparaison","une hyperbole","une personnification"],"correct":1,"explanation":"La présence de l''outil de comparaison « comme » en fait une comparaison et non une métaphore."},{"question":"« Cette fille est un rayon de soleil » est...","options":["une comparaison","une hyperbole","une métaphore","une antithèse"],"correct":2,"explanation":"Sans mot de comparaison (« comme »), l''image directe est une métaphore."},{"question":"« Je meurs de faim ! » est...","options":["une hyperbole","une litote","une métaphore","une comparaison"],"correct":0,"explanation":"L''hyperbole est une exagération volontaire : on ne meurt pas vraiment, on a juste très faim."},{"question":"« Le vent chante dans les arbres » est...","options":["une hyperbole","une comparaison","une antithèse","une personnification"],"correct":3,"explanation":"Attribuer une action humaine (chanter) à un élément non humain (le vent) est une personnification."},{"question":"Dans Le Cid de Corneille, « Va, je ne te hais point » est...","options":["une litote","une hyperbole","une métaphore","une personnification"],"correct":0,"explanation":"La litote dit moins pour suggérer plus : « je ne te hais point » signifie en réalité « je t''aime »."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_FRANCAIS_13',
  'Participe passé : le boss final',
  'L''accord du participe passé, la règle qui départage les vrais champions de l''orthographe.',
  'francais',
  'hard',
  NULL,
  '[{"question":"Complète : « Les filles sont ___ au cinéma samedi. »","options":["allé","allés","allée","allées"],"correct":3,"explanation":"Avec l''auxiliaire être, le participe passé s''accorde avec le sujet : les filles sont allées."},{"question":"Complète : « Elles ont ___ leurs devoirs avant le dîner. »","options":["fini","finies","finis","finie"],"correct":0,"explanation":"Avec l''auxiliaire avoir, pas d''accord avec le sujet : le COD « leurs devoirs » est placé après le verbe."},{"question":"Complète : « Les oranges que j''ai ___ au souk étaient délicieuses. »","options":["acheté","achetés","achetées","achetée"],"correct":2,"explanation":"Avec avoir, le participe s''accorde avec le COD placé avant : « que » reprend « les oranges », féminin pluriel."},{"question":"Complète : « Elle s''est ___ les mains avant de manger. »","options":["lavée","lavé","lavés","lavées"],"correct":1,"explanation":"Le COD « les mains » est placé après le verbe, donc pas d''accord : elle s''est lavé les mains."},{"question":"Complète : « Ils se sont ___ hier soir pour organiser la sortie. » (verbe téléphoner)","options":["téléphonés","téléphonées","téléphoné","téléphonée"],"correct":2,"explanation":"On téléphone À quelqu''un : « se » est un COI, donc le participe reste invariable."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;


-- ---------------------------------------------------------------
-- Matiere: anglais (source g3a-anglais.json)
-- ---------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ANGLAIS_01',
  'Hello! Présente-toi comme un pro',
  'Les bases pour te présenter en anglais sans stresser.',
  'anglais',
  'easy',
  NULL,
  '[{"question":"Comment dit-on « Bonjour » en anglais le matin ?","options":["Good night","Good morning","Good bye","Good luck"],"correct":1,"explanation":"« Good morning » s''utilise le matin, alors que « good night » veut dire « bonne nuit » quand on se quitte le soir."},{"question":"Que signifie « What''s your name? » ?","options":["Quel âge as-tu ?","Où habites-tu ?","Comment t''appelles-tu ?","Comment vas-tu ?"],"correct":2,"explanation":"« Name » signifie « nom », donc « What''s your name? » sert à demander comment quelqu''un s''appelle."},{"question":"Comment dit-on correctement « J''ai 14 ans » en anglais ?","options":["I have 14 years","I am 14 years old","I have 14 old","Me is 14 years"],"correct":1,"explanation":"En anglais, on utilise le verbe « to be » (être) pour l''âge, jamais « to have » comme en français."},{"question":"Que veut dire « I live in Casablanca » ?","options":["Je vais à Casablanca","Je viens de Casablanca","J''aime Casablanca","J''habite à Casablanca"],"correct":3,"explanation":"« To live » signifie « habiter/vivre », à ne pas confondre avec « to love » (aimer)."},{"question":"Quelle est la réponse la plus naturelle à « How are you? » ?","options":["I''m fine, thanks.","I''m 13.","My name is Yassine.","I''m from Rabat."],"correct":0,"explanation":"« How are you? » demande comment tu vas, donc on répond « I''m fine, thanks » (je vais bien, merci)."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ANGLAIS_02',
  'Family first : la famille en anglais',
  'Frère, sœur, grands-parents... sauras-tu tout nommer ?',
  'anglais',
  'easy',
  NULL,
  '[{"question":"Comment dit-on « frère » en anglais ?","options":["Sister","Uncle","Brother","Cousin"],"correct":2,"explanation":"« Brother » signifie frère, tandis que « sister » est la sœur et « uncle » l''oncle."},{"question":"Que signifie « my grandmother » ?","options":["Ma tante","Ma grand-mère","Ma mère","Ma grande sœur"],"correct":1,"explanation":"« Grand » + « mother » donne grand-mère ; le grand-père se dit « grandfather »."},{"question":"Quel mot anglais désigne « les parents » (père et mère) ?","options":["Parents","Relatives","Cousins","Families"],"correct":0,"explanation":"« Parents » se dit pareil qu''en français, alors que « relatives » désigne toute la famille élargie."},{"question":"Que signifie le mot « son » en anglais ?","options":["Le soleil","Le fils","Le son","Le sable"],"correct":1,"explanation":"« Son » veut dire fils ; attention, « sun » (le soleil) se prononce exactement pareil !"},{"question":"Comment dit-on « fille » quand on parle de la fille de ses parents ?","options":["Girl","Woman","Niece","Daughter"],"correct":3,"explanation":"« Daughter » désigne la fille de quelqu''un, alors que « girl » désigne une fille en général."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ANGLAIS_03',
  'Miam ! La bouffe en anglais',
  'Du souk au fast-food, commande sans te tromper.',
  'anglais',
  'easy',
  NULL,
  '[{"question":"Comment dit-on « poulet » en anglais ?","options":["Chicken","Kitchen","Cheese","Beef"],"correct":0,"explanation":"« Chicken » = poulet ; attention à ne pas le confondre avec « kitchen » qui veut dire cuisine !"},{"question":"Que désigne le mot « breakfast » ?","options":["Le déjeuner","Le dîner","Le petit-déjeuner","Le goûter"],"correct":2,"explanation":"« Breakfast » vient de « break » (casser) + « fast » (jeûne) : on casse le jeûne de la nuit."},{"question":"Au souk, tu achètes des « vegetables ». Ce sont :","options":["Des fruits","Des légumes","Des épices","Des olives"],"correct":1,"explanation":"« Vegetables » signifie légumes ; les fruits se disent simplement « fruit » en anglais."},{"question":"Que signifie « I''m thirsty » ?","options":["J''ai faim","J''ai sommeil","J''ai froid","J''ai soif"],"correct":3,"explanation":"« Thirsty » veut dire assoiffé ; « j''ai faim » se dit « I''m hungry »."},{"question":"Comment commander poliment un jus d''orange ?","options":["Give me orange juice!","An orange juice, please.","I orange juice.","You give juice orange."],"correct":1,"explanation":"En anglais, ajouter « please » à la fin d''une demande est indispensable pour être poli."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ANGLAIS_04',
  'Nombres et heures sans galérer',
  'Compte tes dirhams et lis l''heure en anglais.',
  'anglais',
  'easy',
  NULL,
  '[{"question":"Comment dit-on 15 en anglais ?","options":["Fifty","Five","Fifteen","Fivety"],"correct":2,"explanation":"« Fifteen » = 15 et « fifty » = 50 : les nombres en -teen vont de 13 à 19."},{"question":"Un t-shirt coûte « twenty dirhams ». Combien ça fait ?","options":["12 DH","20 DH","22 DH","200 DH"],"correct":1,"explanation":"« Twenty » signifie 20 ; ne pas le confondre avec « twelve » qui veut dire 12."},{"question":"« It''s half past seven » signifie qu''il est :","options":["7h15","6h30","7h30","7h45"],"correct":2,"explanation":"« Half past » veut dire « et demie », donc half past seven = 7h30."},{"question":"Quel jour vient juste après « Tuesday » ?","options":["Thursday","Monday","Sunday","Wednesday"],"correct":3,"explanation":"Tuesday = mardi, donc le jour suivant est Wednesday (mercredi), à ne pas confondre avec Thursday (jeudi)."},{"question":"Comment dit-on 100 en anglais ?","options":["One hundred","One thousand","Ten hundred","Hundred ten"],"correct":0,"explanation":"« One hundred » = 100 et « one thousand » = 1000 ; pratique pour négocier au souk !"}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ANGLAIS_05',
  'In the city : ta ville en anglais',
  'De la plage d''Agadir à la gare, trouve ton chemin.',
  'anglais',
  'easy',
  NULL,
  '[{"question":"Dans quel endroit achètes-tu des médicaments ?","options":["Bakery","Library","Pharmacy","Bookshop"],"correct":2,"explanation":"« Pharmacy » = pharmacie ; « bakery » est la boulangerie et « bookshop » la librairie."},{"question":"« The beach » à Agadir, c''est :","options":["La plage","La montagne","Le port","La piscine"],"correct":0,"explanation":"« Beach » signifie plage ; la piscine se dit « swimming pool »."},{"question":"Que signifie « turn left » ?","options":["Tourne à droite","Va tout droit","Arrête-toi","Tourne à gauche"],"correct":3,"explanation":"« Left » = gauche et « right » = droite : indispensable pour se repérer dans la médina."},{"question":"Une « library », c''est :","options":["Une librairie","Une bibliothèque","Un libraire","Une papeterie"],"correct":1,"explanation":"Faux ami classique : « library » = bibliothèque, alors que la librairie se dit « bookshop »."},{"question":"Comment demander poliment son chemin vers la gare ?","options":["Where station?","Excuse me, where is the train station?","You tell me the station!","Station is where?"],"correct":1,"explanation":"On commence par « Excuse me » pour aborder poliment quelqu''un, puis on pose sa question complète."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ANGLAIS_06',
  'Présent simple : dompte le -s',
  'He plays, she goes... le fameux -s de la 3e personne.',
  'anglais',
  'normal',
  NULL,
  '[{"question":"Complète : « She ___ to school every day. »","options":["go","goes","going","gos"],"correct":1,"explanation":"À la 3e personne du singulier, les verbes en -o prennent -es : go devient goes."},{"question":"Quelle est la forme négative correcte de « They play football » ?","options":["They don''t play football","They doesn''t play football","They not play football","They no play football"],"correct":0,"explanation":"Avec they, on utilise « don''t » + verbe ; « doesn''t » est réservé à he/she/it."},{"question":"Quelle réponse courte est correcte pour « Does he speak English? » ?","options":["Yes, he speaks.","Yes, he do.","Yes, he does.","Yes, he is."],"correct":2,"explanation":"On répond avec le même auxiliaire que la question : does dans la question, does dans la réponse."},{"question":"Complète : « My little sister ___ TV on Fridays. »","options":["watchs","watches","watch","watching"],"correct":1,"explanation":"Les verbes en -ch prennent -es à la 3e personne du singulier : watch devient watches."},{"question":"Quelle phrase est correcte ?","options":["He have a bike","He haves a bike","He is have a bike","He has a bike"],"correct":3,"explanation":"Le verbe « have » est irrégulier à la 3e personne : il devient « has », jamais « haves »."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ANGLAIS_07',
  'Questions : deviens un détective',
  'Where, when, why... pose les bonnes questions.',
  'anglais',
  'normal',
  NULL,
  '[{"question":"Complète : « ___ do you live? » — « In Marrakech. »","options":["What","When","Who","Where"],"correct":3,"explanation":"« Where » sert à demander un lieu, la réponse est donc un endroit comme Marrakech."},{"question":"Complète : « ___ old are you? »","options":["How","What","Which","Why"],"correct":0,"explanation":"L''âge se demande avec « How old », littéralement « à quel point vieux »."},{"question":"À la question « Why are you late? », la réponse logique commence par :","options":["Where...","Because...","Who...","When..."],"correct":1,"explanation":"« Why » (pourquoi) appelle une réponse avec « because » (parce que)."},{"question":"« How much is this? » sert à demander :","options":["L''heure","Le chemin","Le prix","La météo"],"correct":2,"explanation":"« How much? » demande le prix : très utile pour marchander au souk !"},{"question":"Comment demander à qui appartient un sac ?","options":["Whose bag is this?","Who''s bag is this?","Which bag it is?","What bag is?"],"correct":0,"explanation":"« Whose » exprime la possession ; « who''s » est la contraction de « who is » (qui est)."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ANGLAIS_08',
  'Le passé, c''est du passé (simple)',
  'Went, ate, visited... raconte ta journée d''hier.',
  'anglais',
  'normal',
  NULL,
  '[{"question":"Quel est le passé (prétérit) du verbe « go » ?","options":["goed","gone","went","goes"],"correct":2,"explanation":"« Go » est irrégulier : son prétérit est « went » et son participe passé « gone »."},{"question":"Complète : « Yesterday, I ___ my grandmother in Fès. »","options":["visit","visited","visits","visiting"],"correct":1,"explanation":"« Visit » est un verbe régulier : au passé, on ajoute simplement -ed."},{"question":"Complète la négation au passé : « She ___ come to the party. »","options":["don''t","doesn''t","not","didn''t"],"correct":3,"explanation":"Au passé, la négation se forme avec « didn''t » + verbe à la base, pour toutes les personnes."},{"question":"Quel est le passé du verbe « eat » ?","options":["ate","eated","eaten","eats"],"correct":0,"explanation":"« Eat » est irrégulier : ate au prétérit, eaten au participe passé."},{"question":"Quelle question au passé est correcte ?","options":["Did you saw the match?","Did you see the match?","Do you saw the match?","You did see the match?"],"correct":1,"explanation":"Après l''auxiliaire « did », le verbe reste toujours à la base verbale : did you see, pas did you saw."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ANGLAIS_09',
  'Comparaisons : bigger, better!',
  'Compare tout : villes, montagnes, prix au souk.',
  'anglais',
  'normal',
  NULL,
  '[{"question":"Quel est le comparatif de « big » ?","options":["more big","biger","bigger","most big"],"correct":2,"explanation":"Les adjectifs courts doublent souvent la consonne finale : big devient bigger."},{"question":"Complète : « Toubkal is ___ mountain in Morocco. »","options":["the higher","the highest","highest","more high"],"correct":1,"explanation":"Le superlatif se forme avec « the » + adjectif en -est : le Toubkal est bien la plus haute montagne du Maroc (4167 m)."},{"question":"Quel est le comparatif de « good » ?","options":["gooder","more good","best","better"],"correct":3,"explanation":"« Good » est irrégulier : better (meilleur) au comparatif, the best (le meilleur) au superlatif."},{"question":"Complète : « Casablanca is ___ than Essaouira. »","options":["big","bigger","biggest","more bigger"],"correct":1,"explanation":"Pour comparer deux éléments, on utilise le comparatif + « than » : bigger than."},{"question":"Quel est le contraire de « expensive » (cher) ?","options":["cheap","chip","poor","free"],"correct":0,"explanation":"« Cheap » signifie bon marché ; « free » veut dire gratuit, ce qui n''est pas pareil !"}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ANGLAIS_10',
  'In, on, at : le trio infernal',
  'Les prépositions qui piègent tout le monde.',
  'anglais',
  'normal',
  NULL,
  '[{"question":"Complète : « My birthday is ___ July. »","options":["at","on","in","by"],"correct":2,"explanation":"On utilise « in » devant les mois, les années et les saisons : in July, in 2026."},{"question":"Complète : « The match starts ___ 8 o''clock. »","options":["in","at","on","to"],"correct":1,"explanation":"On utilise « at » devant une heure précise : at 8 o''clock, at noon."},{"question":"Complète : « I was born ___ May 5th. »","options":["on","in","at","of"],"correct":0,"explanation":"On utilise « on » devant une date précise ou un jour : on May 5th, on Monday."},{"question":"Complète : « She is good ___ maths. »","options":["in","on","at","for"],"correct":2,"explanation":"L''expression figée est « to be good at » : être bon en quelque chose."},{"question":"Complète : « I go to school ___ bus. »","options":["on","with","in","by"],"correct":3,"explanation":"Pour les moyens de transport, on utilise « by » : by bus, by car, by train."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ANGLAIS_11',
  'Expressions et phrasal verbs de boss',
  'Wake up, give up... parle comme dans les séries.',
  'anglais',
  'hard',
  NULL,
  '[{"question":"Que signifie « It''s raining cats and dogs » ?","options":["Il pleut des chats et des chiens","Il pleut très fort","Il y a des animaux dehors","Le temps est bizarre"],"correct":1,"explanation":"C''est une expression idiomatique : il pleut des cordes, il ne faut jamais la traduire mot à mot."},{"question":"Que signifie le phrasal verb « wake up » ?","options":["Se coucher","Se dépêcher","Se réveiller","Se lever tard"],"correct":2,"explanation":"« Wake up » = se réveiller ; la particule « up » change souvent complètement le sens du verbe."},{"question":"Que veut dire « give up » ?","options":["Donner","Abandonner","Monter","Offrir"],"correct":1,"explanation":"« Give up » signifie abandonner : la particule transforme totalement le sens de « give » (donner)."},{"question":"On te dit « Break a leg! » avant un exposé. Ça veut dire :","options":["Menacer quelqu''un","Annoncer une blessure","Se moquer de toi","Te souhaiter bonne chance"],"correct":3,"explanation":"« Break a leg » est une façon amicale de souhaiter bonne chance, surtout avant un spectacle ou un examen."},{"question":"Que signifie « look for » ?","options":["Regarder","Chercher","Ressembler à","Trouver"],"correct":1,"explanation":"« Look for » = chercher, alors que « look at » = regarder et « look like » = ressembler à."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ANGLAIS_12',
  'Present perfect : le boss final',
  'Have been, has lived... la nuance qui fait la diff.',
  'anglais',
  'hard',
  NULL,
  '[{"question":"Complète : « I ___ never ___ to London. »","options":["did / go","have / been","has / been","am / go"],"correct":1,"explanation":"Avec « never » et une expérience de vie, on utilise le present perfect : have + participe passé."},{"question":"Quelle phrase est correcte ?","options":["I have seen him yesterday","I have see him yesterday","I saw him yesterday","I seen him yesterday"],"correct":2,"explanation":"Avec un moment passé précis comme « yesterday », on utilise le prétérit (saw), jamais le present perfect."},{"question":"Complète : « She has lived in Tangier ___ 2020. »","options":["for","during","from","since"],"correct":3,"explanation":"« Since » s''utilise avec un point de départ (since 2020), « for » avec une durée (for 6 years)."},{"question":"Quel est le participe passé de « write » ?","options":["wrote","writed","written","writing"],"correct":2,"explanation":"« Write » est irrégulier : wrote au prétérit, written au participe passé."},{"question":"Que signifie « I have just finished my homework » ?","options":["Je viens de finir mes devoirs","J''ai fini mes devoirs hier","Je finirai mes devoirs","Je finis toujours mes devoirs"],"correct":0,"explanation":"« Have just » + participe passé exprime une action qui vient tout juste de se terminer."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ANGLAIS_13',
  'Faux amis : déjoue les pièges',
  'Actually, library, coin... ces mots qui trahissent.',
  'anglais',
  'hard',
  NULL,
  '[{"question":"Que signifie « actually » en anglais ?","options":["Actuellement","En fait","Activement","Rapidement"],"correct":1,"explanation":"Faux ami célèbre : « actually » = en fait ; « actuellement » se dit « currently »."},{"question":"Que signifie « a coin » en anglais ?","options":["Un coin","Un angle","Une pièce de monnaie","Un morceau"],"correct":2,"explanation":"« A coin » est une pièce de monnaie (a five-dirham coin) ; le coin d''une rue se dit « corner »."},{"question":"Que veut dire le verbe « to attend » ?","options":["Attendre","Assister à","Faire attention","Espérer"],"correct":1,"explanation":"« To attend » = assister à (un cours, un match) ; « attendre » se dit « to wait »."},{"question":"Que signifie « sensible » en anglais ?","options":["Sensible","Sensationnel","Émotif","Sensé, raisonnable"],"correct":3,"explanation":"« Sensible » en anglais veut dire raisonnable ; pour dire sensible (émotif), on utilise « sensitive »."},{"question":"Que désigne « a journey » ?","options":["Une journée","Un journal","Un voyage","Un jour férié"],"correct":2,"explanation":"« A journey » est un voyage ou un trajet ; « une journée » se dit « a day »."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;


-- ---------------------------------------------------------------
-- Matiere: arabe (source g3a-arabe.json)
-- ---------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ARABE_01',
  'Lettres & sons : le kit de départ',
  'Alphabet, lettres solaires et lunaires, shadda : les bases pour lire sans stress.',
  'arabe',
  'easy',
  NULL,
  '[{"question":"Combien de lettres compte l''alphabet arabe ?","options":["26","28","30","32"],"correct":1,"explanation":"L''alphabet arabe compte 28 lettres, qui changent de forme selon leur position dans le mot."},{"question":"Dans quel sens s''écrit l''arabe ?","options":["De gauche à droite","De haut en bas","De droite à gauche","Ça dépend des mots"],"correct":2,"explanation":"L''arabe s''écrit et se lit de droite à gauche, contrairement au français."},{"question":"Devant une lettre solaire comme « ش », que devient le « ل » de l''article « ال » ?","options":["Il ne se prononce pas et la lettre suivante est doublée","Il se prononce normalement","Il se transforme en « ن »","Il disparaît aussi à l''écrit"],"correct":0,"explanation":"Devant une lettre solaire, le lâm s''assimile : on écrit الشمس mais on prononce « ach-chams »."},{"question":"Laquelle de ces lettres est une lettre lunaire (le « ل » de « ال » se prononce devant elle) ?","options":["ش","ت","ن","ق"],"correct":3,"explanation":"« ق » est lunaire : on prononce bien le lâm dans القمر (al-qamar), la lune qui a donné son nom à la règle."},{"question":"Que signifie le signe « شدّة » (shadda) placé sur une lettre ?","options":["La lettre est muette","La lettre est doublée","La voyelle est longue","C''est la fin du mot"],"correct":1,"explanation":"La shadda double la consonne : دَرَسَ (il a étudié) devient دَرَّسَ (il a enseigné), le sens change !"}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ARABE_02',
  'Vocab du quotidien : famille & maison',
  'Les mots que tu entends tous les jours à la maison, version arabe standard.',
  'arabe',
  'easy',
  NULL,
  '[{"question":"Que signifie « أُخْت » ?","options":["Frère","Sœur","Oncle","Cousine"],"correct":1,"explanation":"أُخْت signifie « sœur » ; le frère se dit أَخ."},{"question":"Comment dit-on « maison » en arabe standard ?","options":["بَيْت","كِتاب","باب","مَدْرَسة"],"correct":0,"explanation":"بَيْت signifie « maison » ; au Maroc on dit aussi دار, qu''on retrouve dans Dar el Beïda."},{"question":"Que signifie « جَدّ » ?","options":["Père","Fils","Grand-père","Voisin"],"correct":2,"explanation":"جَدّ signifie « grand-père » et جَدّة « grand-mère »."},{"question":"Quel mot désigne la « cuisine » ?","options":["مَكْتَب","مَطْبَخ","مَسْبَح","مَلْعَب"],"correct":1,"explanation":"مَطْبَخ vient du verbe طَبَخَ (cuisiner) : le schème مَفْعَل indique le lieu où se fait l''action."},{"question":"« عَمّ » et « خال » veulent tous les deux dire « oncle ». Quelle est la différence ?","options":["عمّ est plus poli que خال","عمّ = oncle âgé, خال = oncle jeune","Aucune, ce sont des synonymes","عمّ = oncle paternel, خال = oncle maternel"],"correct":3,"explanation":"L''arabe distingue le frère du père (عَمّ) du frère de la mère (خال), une précision que le français n''a pas."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ARABE_03',
  'La phrase nominale, c''est carré',
  'Mubtada'' + khabar : le duo de base de la jumla ismiyya.',
  'arabe',
  'normal',
  NULL,
  '[{"question":"De quels deux éléments se compose une phrase nominale (جملة اسمية) ?","options":["Un verbe et un sujet","Un nom et un adjectif","Un mubtada'' (مبتدأ) et un khabar (خبر)","Une particule et un verbe"],"correct":2,"explanation":"La phrase nominale commence par le mubtada'' (ce dont on parle) suivi du khabar (ce qu''on en dit)."},{"question":"Dans « البابُ مفتوحٌ » (la porte est ouverte), quel mot est le khabar ?","options":["البابُ","مفتوحٌ","Les deux","Aucun des deux"],"correct":1,"explanation":"مفتوحٌ est le khabar : c''est l''information donnée sur le mubtada'' البابُ."},{"question":"Quelle est la marque habituelle du mubtada'' à la fin du mot ?","options":["La damma (ــُ)","La fatha (ــَ)","La kasra (ــِ)","Le soukoun (ــْ)"],"correct":0,"explanation":"Le mubtada'' est au cas marfū'', marqué en général par la damma : الولدُ, البابُ."},{"question":"Que signifie la phrase « الجوُّ جميلٌ في أكادير » ?","options":["Il pleut à Agadir","La plage d''Agadir est grande","J''habite à Agadir","Le temps est beau à Agadir"],"correct":3,"explanation":"الجوّ = le temps (la météo) et جميل = beau : une phrase nominale toute simple."},{"question":"Une phrase nominale commence toujours par…","options":["Un nom (اسم)","Un verbe (فعل)","Une préposition","Un point d''interrogation"],"correct":0,"explanation":"C''est justement ce qui lui donne son nom : elle s''ouvre sur un ism, jamais sur un verbe."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ARABE_04',
  'La phrase verbale : action !',
  'Verbe, fā''il, maf''ūl bihi : qui fait quoi dans la jumla fi''liyya.',
  'arabe',
  'normal',
  NULL,
  '[{"question":"Une phrase verbale (جملة فعلية) commence par…","options":["Un nom","Un verbe","Un adjectif","Un pronom obligatoirement"],"correct":1,"explanation":"La jumla fi''liyya s''ouvre sur le verbe, suivi du sujet : كتبَ الولدُ (le garçon a écrit)."},{"question":"Dans « كتبَ التلميذُ الدرسَ », quel mot est le fā''il (le sujet) ?","options":["كتبَ","الدرسَ","التلميذُ","Il n''y a pas de sujet"],"correct":2,"explanation":"التلميذُ (l''élève) fait l''action d''écrire : c''est le fā''il, toujours au cas marfū'' avec damma."},{"question":"Dans la même phrase, quelle est la fonction de « الدرسَ » ?","options":["Complément d''objet direct (مفعول به)","Sujet (فاعل)","Khabar (خبر)","Complément de lieu"],"correct":0,"explanation":"الدرسَ subit l''action : c''est le maf''ūl bihi, reconnaissable à sa fatha finale."},{"question":"Quelle voyelle marque le maf''ūl bihi (COD) au singulier ?","options":["La damma (ــُ)","La kasra (ــِ)","Le soukoun (ــْ)","La fatha (ــَ)"],"correct":3,"explanation":"Le maf''ūl bihi est au cas mansūb, marqué par la fatha : قرأتُ الكتابَ."},{"question":"Que signifie « شربتْ فاطمةُ الشايَ » ?","options":["Fatima prépare le thé","Fatima a bu le thé","Fatima aime le thé","Fatima vend le thé"],"correct":1,"explanation":"شربتْ = elle a bu (le تْ final marque le féminin du passé), الشاي = le thé, star des tables marocaines."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ARABE_05',
  'Les pronoms sans prise de tête',
  'Ana, anta, huwa… maîtrise les damā''ir pour parler de tout le monde.',
  'arabe',
  'easy',
  NULL,
  '[{"question":"Que signifie le pronom « أنا » ?","options":["Je / moi","Tu","Il","Nous"],"correct":0,"explanation":"أنا est le pronom de la première personne du singulier : « je »."},{"question":"Quel pronom utilise-t-on pour dire « tu » à une fille ?","options":["أنتَ","أنتِ","هي","هم"],"correct":1,"explanation":"أنتِ (avec kasra) s''adresse à une fille, أنتَ (avec fatha) à un garçon : seule la voyelle change !"},{"question":"Que désigne le pronom « هم » ?","options":["Elle","Vous deux","Nous","Ils (plusieurs garçons ou groupe mixte)"],"correct":3,"explanation":"هم désigne « ils » au pluriel masculin ; pour un groupe de filles on dit هنّ."},{"question":"Que signifie « نحن » ?","options":["Vous","Ils","Nous","Elles"],"correct":2,"explanation":"نحن signifie « nous », qu''on soit deux ou toute une classe."},{"question":"Dans « كتابُهُ » (son livre), que représente le « ـهُ » final ?","options":["Un pronom suffixe qui signifie « à lui »","La marque du pluriel","Un article défini","Une voyelle décorative"],"correct":0,"explanation":"Les pronoms possessifs arabes se collent à la fin du mot : كتابي (mon livre), كتابُكَ (ton livre), كتابُهُ (son livre)."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ARABE_06',
  'Duel & pluriel : 1, 2, beaucoup',
  'Le muthannā et les pluriels : une spécialité de l''arabe à débloquer.',
  'arabe',
  'normal',
  NULL,
  '[{"question":"L''arabe a un nombre grammatical spécial pour « deux ». Comment s''appelle-t-il ?","options":["Le pluriel brisé","Le singulier double","Le duel (المثنى)","Le collectif"],"correct":2,"explanation":"Le muthannā désigne exactement deux choses : ولدان = deux garçons, ni un ni trois."},{"question":"Quel est le duel de « كتاب » (livre) au cas sujet ?","options":["كتابانِ","كتابينِ","كُتُب","كتابات"],"correct":0,"explanation":"Au cas marfū'' le duel prend ـانِ (kitābāni) ; aux cas nasb et jarr il devient كتابينِ."},{"question":"« مسلمون » est un exemple de…","options":["Pluriel brisé","Pluriel masculin régulier (جمع مذكر سالم)","Duel","Singulier"],"correct":1,"explanation":"Le pluriel masculin sain ajoute ـون au cas sujet sans casser le mot : مسلم → مسلمون."},{"question":"Quel est le pluriel de « مدرسة » (école) ?","options":["مدرستان","مدرسون","مُدرّسات","مدارس"],"correct":3,"explanation":"مدارس est un pluriel brisé (جمع تكسير) : la structure interne du mot change au lieu d''ajouter un suffixe."},{"question":"Comment forme-t-on le pluriel féminin régulier ?","options":["En ajoutant ـون","En doublant la dernière lettre","En ajoutant ـات","En ajoutant ـانِ"],"correct":2,"explanation":"Le jam'' mu''annath sālim ajoute ـات : طالبة (élève) → طالبات (élèves filles)."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ARABE_07',
  'Vocab : en ville au Maroc',
  'Souq, médina, taxi : le vocabulaire arabe de la vie urbaine marocaine.',
  'arabe',
  'easy',
  NULL,
  '[{"question":"Que signifie « مدينة » ?","options":["Village","Ville","Quartier","Pays"],"correct":1,"explanation":"مدينة signifie « ville » ; le mot français « médina » en vient directement."},{"question":"Comment dit-on « marché » en arabe ?","options":["سوق","شارع","مقهى","حديقة"],"correct":0,"explanation":"سوق a donné le mot « souk » : les souks de Marrakech ou de Fès sont connus dans le monde entier."},{"question":"« الدار البيضاء » est le nom arabe de quelle ville marocaine ?","options":["Rabat","Tanger","Casablanca","Agadir"],"correct":2,"explanation":"الدار البيضاء signifie littéralement « la maison blanche », soit Casablanca en espagnol/portugais."},{"question":"Que signifie « شارع » ?","options":["Immeuble","Pont","Gare","Rue / avenue"],"correct":3,"explanation":"شارع désigne une rue ou une avenue, comme le fameux شارع محمد الخامس présent dans presque chaque ville du Maroc."},{"question":"Le taxi t''annonce « عشرون درهماً ». Combien paies-tu ?","options":["10 dirhams","12 dirhams","20 dirhams","25 dirhams"],"correct":2,"explanation":"عشرون signifie « vingt » ; les dizaines arabes se terminent en ـون comme ثلاثون (30) et أربعون (40)."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ARABE_08',
  'I''rāb : le boss des cas',
  'Raf'', nasb, jarr : comprends enfin pourquoi les mots changent de voyelle finale.',
  'arabe',
  'hard',
  NULL,
  '[{"question":"Comment s''appelle l''analyse des terminaisons des mots selon leur fonction dans la phrase ?","options":["الإعراب","التشكيل","الترجمة","الإملاء"],"correct":0,"explanation":"L''i''rāb est le cœur de la grammaire arabe : la voyelle finale d''un mot révèle sa fonction."},{"question":"Quels sont les trois cas principaux du nom en arabe ?","options":["Passé, présent, futur","Singulier, duel, pluriel","Raf'' (رفع), nasb (نصب), jarr (جر)","Raf'', nasb, jazm"],"correct":2,"explanation":"Le nom connaît raf'', nasb et jarr ; le jazm (جزم), lui, ne concerne que les verbes."},{"question":"Après une préposition (حرف جر), le nom est au cas…","options":["Marfū'' (damma)","Majrūr (kasra)","Mansūb (fatha)","Majzūm (soukoun)"],"correct":1,"explanation":"La préposition entraîne le cas jarr : في البيتِ, من المدرسةِ, toujours avec kasra."},{"question":"Dans « إنّ الدرسَ سهلٌ », pourquoi « الدرسَ » porte-t-il une fatha ?","options":["C''est une erreur, il faudrait une damma","Parce que c''est un complément d''objet","Parce que la phrase est au passé","Parce que إنّ met son nom au cas nasb"],"correct":3,"explanation":"إنّ et ses sœurs (أنّ، لكنّ، لأنّ…) rendent leur nom mansūb tandis que le khabar reste marfū''."},{"question":"Dans « ذهبتُ إلى مدرسةٍ », que signale la terminaison « ـةٍ » (double kasra) ?","options":["Un nom indéfini au cas jarr","Un nom défini au cas raf''","Un verbe au passé","Un pluriel féminin"],"correct":0,"explanation":"Le tanwīn (voyelle doublée) marque l''indéfini, et la kasra vient de la préposition إلى : « vers une école »."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ARABE_09',
  'Le verbe : passé vs présent',
  'Māḍī, muḍāri'', impératif : conjugue sans te tromper d''époque.',
  'arabe',
  'normal',
  NULL,
  '[{"question":"Que désigne « الماضي » en conjugaison ?","options":["Le futur","L''impératif","Le passé","Le présent"],"correct":2,"explanation":"Al-māḍī est le temps du passé, l''action déjà accomplie : كتب = il a écrit."},{"question":"Quel préfixe marque le présent (المضارع) à la 3e personne du masculin singulier ?","options":["يـ","تـ","نـ","أ"],"correct":0,"explanation":"Le préfixe يـ donne يكتب (il écrit) ; تـ sert pour « elle » ou « tu », نـ pour « nous », أ pour « je »."},{"question":"« ذهبَ » signifie « il est allé ». Comment dit-on « il va » ?","options":["ذهبوا","يذهبُ","اذهبْ","ذهبتُ"],"correct":1,"explanation":"On passe au muḍāri'' en ajoutant le préfixe يـ : ذهب (passé) → يذهب (présent)."},{"question":"Comment dit-on « j''ai écrit » ?","options":["كتبَ","أكتبُ","كتبتْ","كتبتُ"],"correct":3,"explanation":"Le suffixe ـتُ (tu avec damma) marque « je » au passé : كتبتُ ; avec soukoun (كتبتْ) c''est « elle »."},{"question":"Que signifie le verbe à l''impératif « اُكتُبْ » ?","options":["Il écrira","Écris !","Il a écrit","N''écris pas"],"correct":1,"explanation":"L''amr (impératif) donne un ordre direct : اُكتُبْ = écris !, اِقرأْ = lis !"}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ARABE_10',
  'Les petites particules qui changent tout',
  'Fī, min, lam, inna : deux lettres suffisent à transformer une phrase.',
  'arabe',
  'normal',
  NULL,
  '[{"question":"Lequel de ces mots est une préposition (حرف جر) ?","options":["في","كتب","بيت","هو"],"correct":0,"explanation":"في (dans) fait partie des prépositions à connaître par cœur : من، إلى، عن، على، بـ، لـ، في."},{"question":"Que signifie « مِن » ?","options":["Vers","Sur","De / depuis (la provenance)","Avec"],"correct":2,"explanation":"مِن exprime l''origine : أنا من طنجة = je suis de Tanger."},{"question":"À quoi sert la particule « و » en début ou milieu de phrase ?","options":["À nier le verbe","À coordonner, comme « et »","À poser une question","À marquer le futur"],"correct":1,"explanation":"Le wāw de coordination relie mots ou phrases : الشايُ والنعناعُ = le thé et la menthe."},{"question":"Que signifie « لم أذهبْ » ?","options":["Je n''irai pas","Je veux y aller","J''y suis allé","Je ne suis pas allé"],"correct":3,"explanation":"لم + verbe au présent majzūm donne un sens de passé négatif : لم أذهب = je ne suis pas allé."},{"question":"À quoi sert « إنّ » en début de phrase, comme dans « إنّ العلمَ مفيدٌ » ?","options":["À renforcer et affirmer le propos (« certes »)","À poser une question","À exprimer un souhait","À nier la phrase"],"correct":0,"explanation":"إنّ appuie l''affirmation (« certes, vraiment ») et met son nom au cas nasb : العلمَ."}]'::jsonb,
  10,
  60,
  75,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ARABE_11',
  'Vocab : mode école',
  'Le lexique de ta journée au collège, du cartable à l''examen.',
  'arabe',
  'easy',
  NULL,
  '[{"question":"Que signifie « مدرسة » ?","options":["Bibliothèque","École","Classe","Université"],"correct":1,"explanation":"مدرسة (madrasa) vient du verbe درس (étudier) : c''est le lieu où l''on étudie."},{"question":"Comment dit-on « professeur » (au masculin) ?","options":["تلميذ","كتاب","أستاذ","قلم"],"correct":2,"explanation":"أستاذ signifie professeur ; تلميذ est l''élève, celui qui apprend."},{"question":"Que signifie « قلم » ?","options":["Stylo / crayon","Cahier","Règle","Gomme"],"correct":0,"explanation":"قلم désigne le stylo ou le crayon ; un قلم رصاص est un crayon à papier."},{"question":"Que désigne une « محفظة » pour un collégien ?","options":["Une trousse","Un tableau","Un bureau","Un cartable"],"correct":3,"explanation":"محفظة vient de حفظ (garder, conserver) : c''est le cartable qui garde tes affaires — la fameuse mhafda !"},{"question":"Que signifie « امتحان » ?","options":["Vacances","Examen","Récréation","Devoir de maison"],"correct":1,"explanation":"امتحان = examen, comme الامتحان الجهوي que les collégiens marocains passent en 3e année."}]'::jsonb,
  10,
  60,
  50,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ARABE_12',
  'Style & expression : parle comme un pro',
  'Synonymes, contraires, sens figuré : muscle ton expression écrite.',
  'arabe',
  'hard',
  NULL,
  '[{"question":"Quel est le contraire (ضدّ) de « كبير » (grand) ?","options":["طويل","جديد","صغير","قريب"],"correct":2,"explanation":"صغير (petit) est l''antonyme de كبير ; connaître les contraires double ton vocabulaire d''un coup."},{"question":"Lequel de ces mots est un synonyme (مرادف) de « جميل » (beau) ?","options":["قبيح","رائع","كثير","بعيد"],"correct":1,"explanation":"رائع (magnifique, superbe) est proche de جميل ; قبيح (laid) en est au contraire l''antonyme."},{"question":"Au Maroc, répondre « على رأسي » à une demande de service exprime…","options":["Qu''on accepte avec grand plaisir","Qu''on refuse poliment","Qu''on a mal à la tête","Qu''on demande de l''argent"],"correct":0,"explanation":"Littéralement « sur ma tête », cette expression signifie qu''on rend le service volontiers et avec honneur."},{"question":"Dans « العلمُ نورٌ » (le savoir est une lumière), le mot « نور » est employé au sens…","options":["Propre","Scientifique","Géographique","Figuré (métaphore)"],"correct":3,"explanation":"Le savoir n''éclaire pas vraiment une pièce : c''est une image, une استعارة (métaphore) très courante en arabe."},{"question":"Comment appelle-t-on un texte qui raconte des événements avec des personnages ?","options":["حوار (dialogue)","نص سردي (texte narratif)","وصف (description)","رسالة (lettre)"],"correct":1,"explanation":"Le naṣṣ sardī raconte une histoire avec des personnages, un lieu et des événements qui s''enchaînent."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_ARABE_13',
  'Négation & questions : niveau expert',
  'Hal, mādhā, lam, lan, laysa : nier et questionner comme un chef.',
  'arabe',
  'hard',
  NULL,
  '[{"question":"Par quelle particule commence-t-on une question fermée (réponse oui/non) ?","options":["هل","في","ثم","لن"],"correct":0,"explanation":"هل transforme une affirmation en question : هل فهمتَ الدرسَ؟ = as-tu compris la leçon ?"},{"question":"Que signifie le mot interrogatif « ماذا » ?","options":["Où","Quand","Pourquoi","Quoi / que"],"correct":3,"explanation":"ماذا demande « quoi » : ماذا تأكل؟ = que manges-tu ? ; « où » se dit أين et « quand » متى."},{"question":"Quel mot utilise-t-on pour nier une phrase nominale au présent ?","options":["لم","ليس","لن","ما ... إلا"],"correct":1,"explanation":"ليس nie la phrase nominale et rend son khabar mansūb : ليس الدرسُ صعباً = la leçon n''est pas difficile."},{"question":"Que signifie « لن أنسى » ?","options":["Je n''ai pas oublié","J''oublie souvent","Je n''oublierai pas","N''oublie pas !"],"correct":2,"explanation":"لن nie le futur et met le verbe au mansūb : لن أنسى = je n''oublierai jamais."},{"question":"Quelle est la différence entre « ما كتب » et « لا يكتب » ?","options":["ما كتب = il n''a pas écrit (passé), لا يكتب = il n''écrit pas (présent)","Aucune, les deux sont au présent","ما كتب = présent, لا يكتب = futur","Les deux expriment un ordre négatif"],"correct":0,"explanation":"ما nie le verbe au passé tandis que لا nie le présent : chaque particule de négation a son époque."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;


COMMIT;
