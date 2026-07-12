-- =============================================================================
-- MIGRATION 172b_seed_quiz_bank_decouverte
-- ⚠️  A APPLIQUER — seed banque de quiz G3-A, contenu INACTIF en attente de
--     moderation humaine (is_active=false + prefixe DAILY_ => file d'attente
--     /admin/content/review, app/admin/content/review/page.tsx:79).
-- =============================================================================
-- Groupe : sciences & culture (svt-pc, histoire-geo, culture-maroc, life-skills)
-- Format questions jsonb = contrat runner {question, options[4], correct, explanation}
--   (lib/quiz/schema.ts:11-17 ; scoring app/api/teen/quiz/submit/route.ts:70).
-- difficulty mappee sur le CHECK (easy|normal|hard|expert) : medium -> normal.
-- Idempotent : ON CONFLICT (code) DO NOTHING.
--
-- Stats de ce fichier :
--   - svt-pc: 13 quiz / 65 questions
--   - histoire-geo: 13 quiz / 65 questions
--   - culture-maroc: 13 quiz / 65 questions
--   - life-skills: 13 quiz / 65 questions
-- Stats globales banque G3-A (172a+172b) : 104 quiz / 520 questions
--   rejetes: 0 ; questions dedupliquees: 0
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------
-- Matiere: svt-pc (source g3a-svt-pc.json)
-- ---------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_SVT_PC_01',
  'Le voyage de la nourriture',
  'Suis un repas de la bouche jusqu''aux cellules de ton corps.',
  'svt-pc',
  'easy',
  NULL,
  '[{"question":"Où commence la digestion des aliments ?","options":["L''estomac","Le foie","La bouche","L''intestin"],"correct":2,"explanation":"La digestion commence dans la bouche, où les dents broient les aliments et la salive commence à les décomposer."},{"question":"Quel liquide de la bouche aide à ramollir les aliments ?","options":["La salive","Le sang","La bile","L''urine"],"correct":0,"explanation":"La salive humidifie les aliments et contient des enzymes qui commencent à digérer l''amidon."},{"question":"Quel organe absorbe la plupart des nutriments vers le sang ?","options":["L''estomac","Le gros intestin","L''œsophage","L''intestin grêle"],"correct":3,"explanation":"L''intestin grêle, très long, absorbe la majorité des nutriments qui passent ensuite dans le sang."},{"question":"Quel organe produit la bile qui aide à digérer les graisses ?","options":["Les reins","Le foie","Le cœur","La rate"],"correct":1,"explanation":"Le foie produit la bile, stockée dans la vésicule biliaire, qui casse les grosses gouttes de graisse."},{"question":"Les enzymes qui accélèrent la digestion sont surtout des...","options":["Sucres","Protéines","Lipides","Vitamines"],"correct":1,"explanation":"Les enzymes sont des protéines particulières qui accélèrent les réactions chimiques de la digestion."}]'::jsonb,
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
  'DAILY_SEED_SVT_PC_02',
  'Os & muscles : la machine',
  'Ce qui te tient debout et te fait bouger.',
  'svt-pc',
  'easy',
  NULL,
  '[{"question":"Combien d''os compte environ le squelette d''un adulte ?","options":["106","206","306","406"],"correct":1,"explanation":"Le squelette d''un adulte compte environ 206 os, un peu moins que celui d''un bébé."},{"question":"Quel organe la boîte crânienne protège-t-elle ?","options":["Le cœur","Les poumons","Le foie","Le cerveau"],"correct":3,"explanation":"Les os du crâne forment une boîte solide qui protège le cerveau des chocs."},{"question":"Comment s''appelle l''endroit où deux os se rejoignent ?","options":["Un tendon","Un ligament","Une articulation","Un muscle"],"correct":2,"explanation":"Une articulation, comme le genou ou le coude, permet le mouvement entre deux os."},{"question":"Qu''est-ce qui relie un muscle à un os ?","options":["Un tendon","Un nerf","Une veine","Un cartilage"],"correct":0,"explanation":"Les tendons attachent les muscles aux os pour transmettre la force et créer le mouvement."},{"question":"Les muscles marchent souvent par paires : quand l''un se contracte, l''autre...","options":["Se contracte aussi","Se relâche","Disparaît","Grossit"],"correct":1,"explanation":"Les muscles antagonistes travaillent en opposition, comme le biceps et le triceps du bras."}]'::jsonb,
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
  'DAILY_SEED_SVT_PC_03',
  'Souffle & battements',
  'Comment l''air et le sang gardent ton corps en vie.',
  'svt-pc',
  'normal',
  NULL,
  '[{"question":"Quel organe permet de respirer ?","options":["Le foie","L''estomac","Les reins","Les poumons"],"correct":3,"explanation":"Les poumons captent l''oxygène de l''air et rejettent le dioxyde de carbone."},{"question":"Quel gaz notre corps prélève-t-il dans l''air que l''on respire ?","options":["L''azote","L''hélium","L''oxygène","Le dioxyde de carbone"],"correct":2,"explanation":"L''oxygène est nécessaire à nos cellules pour produire de l''énergie."},{"question":"Quel organe pompe le sang dans tout le corps ?","options":["Le cœur","Le cerveau","Le foie","Les poumons"],"correct":0,"explanation":"Le cœur est un muscle qui se contracte sans arrêt pour faire circuler le sang."},{"question":"Quels vaisseaux ramènent le sang vers le cœur ?","options":["Les artères","Les veines","Les nerfs","Les tendons"],"correct":1,"explanation":"Les veines ramènent le sang vers le cœur, tandis que les artères l''éloignent du cœur."},{"question":"Quelles cellules du sang transportent l''oxygène ?","options":["Les globules blancs","Les plaquettes","Les neurones","Les globules rouges"],"correct":3,"explanation":"Les globules rouges contiennent l''hémoglobine, qui fixe l''oxygène et le transporte."}]'::jsonb,
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
  'DAILY_SEED_SVT_PC_04',
  'Cerveau aux commandes',
  'Tes 5 sens et le chef d''orchestre qui gère tout.',
  'svt-pc',
  'normal',
  NULL,
  '[{"question":"Quel organe contrôle nos pensées et nos mouvements ?","options":["Le cœur","Le cerveau","L''estomac","Le foie"],"correct":1,"explanation":"Le cerveau est le centre de commande du système nerveux."},{"question":"Combien de sens principaux possède l''être humain ?","options":["3","7","10","5"],"correct":3,"explanation":"Les cinq sens sont la vue, l''ouïe, l''odorat, le goût et le toucher."},{"question":"Quel organe détecte les sons ?","options":["L''oreille","Le nez","L''œil","La langue"],"correct":0,"explanation":"L''oreille capte les vibrations sonores et les transforme en signaux envoyés au cerveau."},{"question":"Quelles cellules transmettent les messages dans le système nerveux ?","options":["Les globules rouges","Les os","Les neurones","Les muscles"],"correct":2,"explanation":"Les neurones transmettent les signaux électriques entre le cerveau et le reste du corps."},{"question":"Laquelle de ces sensations n''est PAS une saveur de base de la langue ?","options":["Sucré","Salé","Amer","Le piquant"],"correct":3,"explanation":"Le piquant est une sensation de chaleur/douleur, pas une saveur comme le sucré, le salé, l''acide et l''amer."}]'::jsonb,
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
  'DAILY_SEED_SVT_PC_05',
  'Solide, liquide, gaz',
  'L''eau, la glace, la vapeur... et tout ce qui change d''état.',
  'svt-pc',
  'easy',
  NULL,
  '[{"question":"Quels sont les trois états principaux de la matière ?","options":["Solide, liquide et gazeux","Chaud, froid et tiède","Grand, moyen et petit","Dur, mou et cassant"],"correct":0,"explanation":"La matière existe surtout sous trois états : solide, liquide et gazeux."},{"question":"À quelle température l''eau bout-elle au niveau de la mer ?","options":["50°C","200°C","0°C","100°C"],"correct":3,"explanation":"L''eau pure se transforme en vapeur à 100°C au niveau de la mer."},{"question":"Comment s''appelle le passage de l''état liquide à l''état gazeux ?","options":["La fusion","La solidification","La vaporisation","La condensation"],"correct":2,"explanation":"La vaporisation transforme un liquide en gaz, comme l''eau d''une flaque qui s''évapore au soleil."},{"question":"À quelle température l''eau pure gèle-t-elle ?","options":["10°C","0°C","-10°C","5°C"],"correct":1,"explanation":"L''eau pure se solidifie en glace à 0°C."},{"question":"Comment s''appelle le passage direct de l''état solide à l''état gazeux ?","options":["La fusion","La sublimation","La condensation","L''évaporation"],"correct":1,"explanation":"La sublimation fait passer un solide directement en gaz, sans passer par le liquide."}]'::jsonb,
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
  'DAILY_SEED_SVT_PC_06',
  'Zoom sur l''invisible',
  'Les briques minuscules qui composent tout autour de toi.',
  'svt-pc',
  'normal',
  NULL,
  '[{"question":"De quoi est faite toute la matière ?","options":["De cellules","D''atomes","D''étoiles","De couleurs"],"correct":1,"explanation":"Toute la matière est composée d''atomes, bien trop petits pour être vus à l''œil nu."},{"question":"Quelle est la formule chimique de l''eau ?","options":["CO2","O2","H2O","NaCl"],"correct":2,"explanation":"Une molécule d''eau (H2O) contient deux atomes d''hydrogène et un atome d''oxygène."},{"question":"Quel gaz les plantes absorbent-elles pour faire la photosynthèse ?","options":["L''oxygène","L''azote","L''hydrogène","Le dioxyde de carbone"],"correct":3,"explanation":"Les plantes absorbent le dioxyde de carbone et rejettent de l''oxygène grâce à la lumière."},{"question":"Le sel de cuisine est composé de sodium et de...","options":["Chlore","Fer","Or","Calcium"],"correct":0,"explanation":"Le sel de table est le chlorure de sodium, de formule NaCl."},{"question":"Quelle particule de l''atome porte une charge négative ?","options":["Le proton","Le neutron","Le noyau","L''électron"],"correct":3,"explanation":"Les électrons, chargés négativement, gravitent autour du noyau de l''atome."}]'::jsonb,
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
  'DAILY_SEED_SVT_PC_07',
  'Sous tension',
  'Volts, ampères et conducteurs expliqués simplement.',
  'svt-pc',
  'easy',
  NULL,
  '[{"question":"Quelle unité mesure la tension électrique ?","options":["Le mètre","Le volt","Le litre","Le gramme"],"correct":1,"explanation":"La tension électrique se mesure en volts (V) ; une prise domestique au Maroc fournit 220 V."},{"question":"Quel matériau conduit bien l''électricité ?","options":["Le plastique","Le bois","Le verre","Le cuivre"],"correct":3,"explanation":"Le cuivre est un bon conducteur, c''est pourquoi on l''utilise dans les fils électriques."},{"question":"Qu''est-ce qui coupe le passage du courant dans un circuit ?","options":["Un interrupteur ouvert","Une pile","Une lampe","Un fil"],"correct":0,"explanation":"Un interrupteur ouvert crée une coupure : le courant ne peut plus circuler."},{"question":"Quelle unité mesure l''intensité du courant électrique ?","options":["Le watt","Le volt","L''ampère","Le joule"],"correct":2,"explanation":"L''intensité du courant se mesure en ampères (A)."},{"question":"Comment appelle-t-on un matériau qui ne laisse pas passer le courant ?","options":["Un conducteur","Un isolant","Un générateur","Un récepteur"],"correct":1,"explanation":"Un isolant, comme le plastique, empêche le passage du courant et protège de l''électrocution."}]'::jsonb,
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
  'DAILY_SEED_SVT_PC_08',
  'Fais briller la lampe',
  'Monte des circuits et évite le court-circuit.',
  'svt-pc',
  'hard',
  NULL,
  '[{"question":"Que faut-il pour qu''une lampe s''allume dans un circuit ?","options":["Un circuit fermé","Un circuit ouvert","Aucune pile","Un fil coupé"],"correct":0,"explanation":"Le courant ne circule que dans un circuit fermé, c''est-à-dire sans aucune coupure."},{"question":"Quel composant fournit l''énergie dans un circuit simple ?","options":["La lampe","L''interrupteur","La pile","Le fil"],"correct":2,"explanation":"La pile est le générateur : elle fournit l''énergie électrique au circuit."},{"question":"Dans un circuit en série, si une lampe grille, les autres lampes...","options":["Brillent plus fort","Ne changent pas","Explosent","S''éteignent aussi"],"correct":3,"explanation":"En série, une seule coupure arrête tout le circuit : toutes les lampes s''éteignent."},{"question":"Comment appelle-t-on un contact accidentel qui laisse passer un courant trop fort ?","options":["Un circuit ouvert","Un court-circuit","Une résistance","Un interrupteur"],"correct":1,"explanation":"Un court-circuit fait passer un courant très fort et peut provoquer une surchauffe ou un incendie."},{"question":"Dans un montage en dérivation (parallèle), si une lampe grille, les autres...","options":["S''éteignent","Explosent","Continuent de briller","Changent de couleur"],"correct":2,"explanation":"En dérivation, chaque lampe a son propre chemin, donc les autres restent allumées."}]'::jsonb,
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
  'DAILY_SEED_SVT_PC_09',
  'L''eau fait le tour',
  'De l''océan aux nuages, et pourquoi on l''économise au Maroc.',
  'svt-pc',
  'normal',
  NULL,
  '[{"question":"Quel phénomène transforme l''eau des océans en vapeur ?","options":["La condensation","L''évaporation","Les précipitations","La fonte"],"correct":1,"explanation":"La chaleur du soleil fait s''évaporer l''eau des mers, des lacs et des rivières."},{"question":"Comment appelle-t-on la pluie, la neige et la grêle ?","options":["L''évaporation","La condensation","Le ruissellement","Les précipitations"],"correct":3,"explanation":"Les précipitations sont l''eau qui retombe au sol sous forme liquide ou solide."},{"question":"Lequel de ces cours d''eau est l''un des plus longs fleuves du Maroc ?","options":["Le Nil","La Seine","L''Oum Er-Rbia","L''Amazone"],"correct":2,"explanation":"L''Oum Er-Rbia est l''un des plus longs fleuves du Maroc, alimenté par l''Atlas."},{"question":"Pourquoi économiser l''eau est-il très important au Maroc ?","options":["Le climat est souvent sec","Il pleut trop","L''eau est gratuite","Il n''y a aucun barrage"],"correct":0,"explanation":"Le Maroc a un climat semi-aride : l''eau y est une ressource précieuse à ne pas gaspiller."},{"question":"Comment appelle-t-on un grand ouvrage qui retient l''eau pour l''irrigation et l''électricité ?","options":["Un puits","Une fontaine","Un canal","Un barrage"],"correct":3,"explanation":"Les barrages, nombreux au Maroc, stockent l''eau et produisent de l''électricité hydraulique."}]'::jsonb,
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
  'DAILY_SEED_SVT_PC_10',
  'Terrain marocain',
  'Sahara, Atlas, arganiers : la nature de chez toi.',
  'svt-pc',
  'easy',
  NULL,
  '[{"question":"Quel grand désert se trouve au sud du Maroc ?","options":["Le Kalahari","Le Gobi","Le Sahara","L''Atacama"],"correct":2,"explanation":"Le Sahara, le plus grand désert chaud du monde, s''étend au sud du Maroc."},{"question":"Quel arbre emblématique pousse surtout dans le sud-ouest du Maroc ?","options":["Le sapin","L''arganier","Le baobab","Le cocotier"],"correct":1,"explanation":"L''arganier est un arbre endémique du Maroc, dont on tire la célèbre huile d''argan."},{"question":"Quelle chaîne de montagnes traverse le Maroc ?","options":["L''Atlas","Les Alpes","L''Himalaya","Les Andes"],"correct":0,"explanation":"L''Atlas traverse le Maroc et abrite une faune et une flore très variées."},{"question":"Quel animal, un macaque, vit dans les forêts du Moyen Atlas ?","options":["Le gorille","Le chimpanzé","Le lémurien","Le singe magot"],"correct":3,"explanation":"Le singe magot (macaque de Barbarie) vit dans les forêts de cèdres du Moyen Atlas."},{"question":"Quel grand arbre résineux forme des forêts célèbres près d''Ifrane et Azrou ?","options":["Le palmier","Le cèdre de l''Atlas","L''olivier","Le chêne-liège"],"correct":1,"explanation":"Le cèdre de l''Atlas forme de vastes forêts dans le Moyen Atlas marocain."}]'::jsonb,
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
  'DAILY_SEED_SVT_PC_11',
  'Qui mange qui ?',
  'Producteurs, herbivores et décomposeurs en action.',
  'svt-pc',
  'normal',
  NULL,
  '[{"question":"Quel oiseau rose fréquente les zones humides marocaines comme la Merja Zerga ?","options":["Le pingouin","L''aigle","Le hibou","Le flamant rose"],"correct":3,"explanation":"Les flamants roses viennent se nourrir dans les lagunes et zones humides du Maroc."},{"question":"Comment appelle-t-on un animal qui se nourrit uniquement de plantes ?","options":["Un carnivore","Un herbivore","Un omnivore","Un insectivore"],"correct":1,"explanation":"Un herbivore, comme le mouton, se nourrit exclusivement de végétaux."},{"question":"Dans une chaîne alimentaire, les plantes vertes sont des...","options":["Consommateurs","Prédateurs","Producteurs","Décomposeurs"],"correct":2,"explanation":"Les plantes sont des producteurs : elles fabriquent leur propre matière grâce à la lumière du soleil."},{"question":"Qui recycle les feuilles mortes et les cadavres dans le sol ?","options":["Les décomposeurs","Les producteurs","Les prédateurs","Les herbivores"],"correct":0,"explanation":"Les champignons et bactéries décomposeurs transforment la matière morte en éléments réutilisables."},{"question":"Comment appelle-t-on une espèce qui ne vit naturellement que dans une seule région ?","options":["Migratrice","Domestique","Invasive","Endémique"],"correct":3,"explanation":"Une espèce endémique, comme l''arganier, ne se trouve naturellement que dans une zone précise."}]'::jsonb,
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
  'DAILY_SEED_SVT_PC_12',
  'Zéro déchet, ou presque',
  'Recyclage, compost et gestes malins pour la planète.',
  'svt-pc',
  'normal',
  NULL,
  '[{"question":"Que faut-il faire des déchets plastiques pour protéger l''environnement ?","options":["Les brûler","Les recycler","Les jeter en mer","Les enterrer partout"],"correct":1,"explanation":"Recycler le plastique réduit la pollution et économise les ressources naturelles."},{"question":"Quel geste permet d''économiser l''électricité à la maison ?","options":["Éteindre les appareils inutilisés","Laisser les lumières allumées","Ouvrir le frigo souvent","Chauffer fenêtres ouvertes"],"correct":0,"explanation":"Éteindre les appareils qui ne servent pas réduit la consommation d''énergie et la facture."},{"question":"Combien de temps un sac plastique met-il environ à se dégrader dans la nature ?","options":["Quelques jours","Une heure","Quelques semaines","Des centaines d''années"],"correct":3,"explanation":"Un sac plastique peut mettre des centaines d''années à se décomposer, d''où l''importance de le réduire."},{"question":"Qu''est-ce que le compost ?","options":["Un plastique recyclé","Un métal","Un engrais fait de déchets organiques","Un gaz polluant"],"correct":2,"explanation":"Le compost transforme les déchets organiques (épluchures, feuilles) en engrais naturel pour les plantes."},{"question":"Quel gaz, produit par les voitures et les usines, contribue au réchauffement climatique ?","options":["L''oxygène","Le dioxyde de carbone","L''azote","L''hélium"],"correct":1,"explanation":"Le dioxyde de carbone (CO2) est un gaz à effet de serre qui réchauffe l''atmosphère."}]'::jsonb,
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
  'DAILY_SEED_SVT_PC_13',
  'L''énergie du futur',
  'Solaire, éolien et Noor : le Maroc branché sur le renouvelable.',
  'svt-pc',
  'hard',
  NULL,
  '[{"question":"Quelle énergie provient directement du soleil ?","options":["L''énergie solaire","L''énergie nucléaire","Le charbon","Le pétrole"],"correct":0,"explanation":"L''énergie solaire est captée par des panneaux, un atout pour un Maroc très ensoleillé."},{"question":"Comment appelle-t-on l''énergie produite par le vent ?","options":["L''énergie solaire","L''énergie hydraulique","L''énergie éolienne","Le gaz naturel"],"correct":2,"explanation":"L''énergie éolienne utilise des éoliennes, comme celles du grand parc de Tarfaya."},{"question":"La grande centrale solaire Noor se trouve près de quelle ville marocaine ?","options":["Tanger","Ouarzazate","Oujda","Nador"],"correct":1,"explanation":"La centrale solaire Noor, près de Ouarzazate, est l''une des plus grandes du monde."},{"question":"Une énergie renouvelable est une énergie qui...","options":["S''épuise très vite","Pollue toujours beaucoup","Coûte forcément très cher","Se renouvelle naturellement"],"correct":3,"explanation":"Les énergies renouvelables, comme le solaire et l''éolien, se reconstituent naturellement et ne s''épuisent pas."},{"question":"Laquelle de ces sources d''énergie n''est PAS renouvelable ?","options":["Le soleil","Le vent","Le pétrole","L''eau des barrages"],"correct":2,"explanation":"Le pétrole est une énergie fossile : il s''épuise et met des millions d''années à se former."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;


-- ---------------------------------------------------------------
-- Matiere: histoire-geo (source g3a-histoire-geo.json)
-- ---------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_HISTOIRE_GEO_01',
  'Capitales du Maroc : le grand voyage',
  'De Fès à Rabat, découvre quelles villes ont dirigé le pays.',
  'histoire-geo',
  'easy',
  NULL,
  '[{"question":"Quelle est la capitale actuelle du Maroc ?","options":["Casablanca","Marrakech","Rabat","Fès"],"correct":2,"explanation":"Rabat est la capitale administrative du Maroc depuis 1912, même si Casablanca est plus peuplée."},{"question":"Quelle ville est surnommée la capitale économique du Maroc ?","options":["Casablanca","Tanger","Agadir","Rabat"],"correct":0,"explanation":"Casablanca concentre le plus grand port du pays et la majorité des sièges de grandes entreprises."},{"question":"Quelle dynastie a fondé la ville de Fès ?","options":["Les Almohades","Les Idrissides","Les Saadiens","Les Mérinides"],"correct":1,"explanation":"Fès a été fondée à la fin du VIIIe siècle par les Idrissides, la première dynastie musulmane du Maroc."},{"question":"Quelle ville a été fondée par les Almoravides vers 1070 ?","options":["Meknès","Oujda","Essaouira","Marrakech"],"correct":3,"explanation":"Marrakech, fondée par les Almoravides, a même donné son nom au Maroc dans plusieurs langues."},{"question":"Avant Rabat, quelle ville était la capitale du Maroc au début du XXe siècle ?","options":["Fès","Tétouan","Safi","El Jadida"],"correct":0,"explanation":"Fès a été capitale jusqu''en 1912, année où Rabat l''a remplacée."}]'::jsonb,
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
  'DAILY_SEED_HISTOIRE_GEO_02',
  'Dynasties : qui a bâti le Maroc ?',
  'Idrissides, Almohades, Saadiens... teste tes connaissances sur les bâtisseurs du royaume.',
  'histoire-geo',
  'normal',
  NULL,
  '[{"question":"Quelle est la première dynastie musulmane du Maroc ?","options":["Les Idrissides","Les Almoravides","Les Alaouites","Les Almohades"],"correct":0,"explanation":"Fondée par Idriss Ier en 788, la dynastie idrisside est la première dynastie musulmane du pays."},{"question":"Quelle dynastie a fait construire la Koutoubia à Marrakech et la Tour Hassan à Rabat ?","options":["Les Saadiens","Les Mérinides","Les Almohades","Les Wattassides"],"correct":2,"explanation":"Les Almohades ont bâti ces célèbres minarets au XIIe siècle, ainsi que la Giralda de Séville en Espagne."},{"question":"Quelle dynastie règne aujourd''hui sur le Maroc ?","options":["Les Saadiens","Les Alaouites","Les Idrissides","Les Mérinides"],"correct":1,"explanation":"La dynastie alaouite dirige le Maroc depuis le XVIIe siècle."},{"question":"Les Saadiens sont restés célèbres pour leur victoire à quelle bataille en 1578 ?","options":["La bataille de Zallaqa","La bataille des Trois Rois","La bataille de Las Navas de Tolosa","La bataille d''Anoual"],"correct":1,"explanation":"La bataille des Trois Rois, aussi appelée bataille d''Oued El Makhazine, a stoppé l''invasion portugaise du Maroc."},{"question":"Sous quelle dynastie les célèbres médersas de Fès, comme Bou Inania, ont-elles été construites ?","options":["Les Mérinides","Les Almoravides","Les Alaouites","Les Idrissides"],"correct":0,"explanation":"Les Mérinides ont fait de Fès leur capitale au XIVe siècle et y ont multiplié les écoles au décor raffiné."}]'::jsonb,
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
  'DAILY_SEED_HISTOIRE_GEO_03',
  '1956 : objectif indépendance',
  'Manifeste, exil, retour du sultan... revis les grandes étapes de l''indépendance.',
  'histoire-geo',
  'normal',
  NULL,
  '[{"question":"En quelle année le Maroc a-t-il retrouvé son indépendance ?","options":["1946","1962","1956","1975"],"correct":2,"explanation":"Le protectorat français a officiellement pris fin le 2 mars 1956."},{"question":"Quel traité a instauré le protectorat français au Maroc en 1912 ?","options":["Le traité de Fès","Le traité d''Algésiras","Le traité de Versailles","Le traité de Tanger"],"correct":0,"explanation":"Signé le 30 mars 1912 à Fès, ce traité plaçait le Maroc sous protectorat français."},{"question":"Quel document, signé le 11 janvier 1944, réclamait l''indépendance du Maroc ?","options":["La Charte de l''Atlas","Le Manifeste de l''Indépendance","La Déclaration de Rabat","Le Pacte national"],"correct":1,"explanation":"Le Manifeste de l''Indépendance est commémoré chaque 11 janvier, aujourd''hui jour férié au Maroc."},{"question":"Quel sultan a été exilé en 1953 avant de revenir triomphalement en 1955 ?","options":["Moulay Ismaïl","Hassan II","Mohammed V","Moulay Rachid"],"correct":2,"explanation":"Mohammed V, exilé en Corse puis à Madagascar, est rentré au Maroc le 16 novembre 1955, accueilli en héros."},{"question":"Quelle partie du Maroc était administrée par l''Espagne avant 1956 ?","options":["Le centre du pays","La région de Casablanca","La plaine du Gharb","Le nord du pays, autour de Tétouan"],"correct":3,"explanation":"L''Espagne administrait la zone nord avec Tétouan pour capitale, tandis que Tanger avait un statut international."}]'::jsonb,
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
  'DAILY_SEED_HISTOIRE_GEO_04',
  'Atlas, Rif & compagnie',
  'Montagnes, fleuves et océans : la géographie du Maroc en 5 questions.',
  'histoire-geo',
  'easy',
  NULL,
  '[{"question":"Quel est le plus haut sommet du Maroc ?","options":["Le mont Toubkal","Le Kilimandjaro","Le mont Sirwa","Le Jbel Ayachi"],"correct":0,"explanation":"Le Toubkal culmine à 4 167 m dans le Haut Atlas, un record pour toute l''Afrique du Nord."},{"question":"Quelle chaîne de montagnes se trouve tout au nord du Maroc ?","options":["Le Haut Atlas","Le Rif","L''Anti-Atlas","Le Moyen Atlas"],"correct":1,"explanation":"Le Rif longe la côte méditerranéenne, de la région de Tanger jusqu''à celle de Nador."},{"question":"Quels sont les deux espaces maritimes qui bordent le Maroc ?","options":["La mer Rouge et l''Atlantique","La Méditerranée et la mer Noire","L''Atlantique et la Méditerranée","L''océan Indien et la Méditerranée"],"correct":2,"explanation":"Le Maroc est le seul pays africain bordé à la fois par l''océan Atlantique et la mer Méditerranée."},{"question":"Quel détroit sépare le Maroc de l''Espagne ?","options":["Le détroit du Bosphore","Le détroit de Messine","Le détroit d''Ormuz","Le détroit de Gibraltar"],"correct":3,"explanation":"À peine 14 km séparent les deux rives du détroit de Gibraltar, entre l''Afrique et l''Europe."},{"question":"Quel est le plus long fleuve du Maroc ?","options":["Le Sebou","L''Oum Errabia","Le Draa","La Moulouya"],"correct":2,"explanation":"Le Draa s''étire sur environ 1 100 km, même si une grande partie de son lit est souvent à sec."}]'::jsonb,
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
  'DAILY_SEED_HISTOIRE_GEO_05',
  'Villes du Maroc : t''y étais ?',
  'Ville bleue, ville rouge, ville blanche... sauras-tu toutes les reconnaître ?',
  'histoire-geo',
  'easy',
  NULL,
  '[{"question":"Quelle ville marocaine est célèbre pour ses murs peints en bleu ?","options":["Chefchaouen","Ifrane","Essaouira","Ouarzazate"],"correct":0,"explanation":"Chefchaouen, dans le Rif, attire des visiteurs du monde entier grâce à sa médina toute bleue."},{"question":"Quelle ville est surnommée « la ville rouge » ?","options":["Fès","Marrakech","Meknès","Oujda"],"correct":1,"explanation":"Marrakech doit son surnom à la couleur ocre de ses remparts et de ses maisons."},{"question":"Quelle est la ville la plus peuplée du Maroc ?","options":["Rabat","Fès","Tanger","Casablanca"],"correct":3,"explanation":"Casablanca dépasse les 3 millions d''habitants, loin devant les autres villes du pays."},{"question":"Quelle ville marocaine a été entièrement reconstruite après un séisme en 1960 ?","options":["Agadir","Safi","Kénitra","Nador"],"correct":0,"explanation":"Le séisme du 29 février 1960 a détruit Agadir, rebâtie ensuite pour devenir une grande station balnéaire."},{"question":"Quel était l''ancien nom d''Essaouira ?","options":["Anfa","Mogador","Tingis","Volubilis"],"correct":1,"explanation":"Les Européens appelaient la ville Mogador ; Anfa est l''ancien nom de Casablanca et Tingis celui de Tanger."}]'::jsonb,
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
  'DAILY_SEED_HISTOIRE_GEO_06',
  'Capitales du monde express',
  '5 pays, 5 capitales : attention aux pièges classiques !',
  'histoire-geo',
  'easy',
  NULL,
  '[{"question":"Quelle est la capitale de l''Espagne ?","options":["Barcelone","Séville","Madrid","Valence"],"correct":2,"explanation":"Madrid, au centre du pays, est la capitale de l''Espagne, notre voisin de l''autre côté du détroit."},{"question":"Quelle est la capitale de l''Égypte ?","options":["Alexandrie","Le Caire","Louxor","Assouan"],"correct":1,"explanation":"Le Caire, traversé par le Nil, est l''une des villes les plus peuplées d''Afrique."},{"question":"Quelle est la capitale du Sénégal ?","options":["Abidjan","Bamako","Saint-Louis","Dakar"],"correct":3,"explanation":"Dakar se trouve sur la presqu''île du Cap-Vert, le point le plus à l''ouest du continent africain."},{"question":"Quelle est la capitale du Canada ?","options":["Toronto","Ottawa","Montréal","Vancouver"],"correct":1,"explanation":"Beaucoup pensent à Toronto ou Montréal, mais c''est bien Ottawa la capitale fédérale du Canada."},{"question":"Quelle est la capitale de la Turquie ?","options":["Istanbul","Izmir","Ankara","Antalya"],"correct":2,"explanation":"Istanbul est la plus grande ville du pays, mais Ankara est la capitale depuis 1923."}]'::jsonb,
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
  'DAILY_SEED_HISTOIRE_GEO_07',
  'Le Maroc, comment ça marche ?',
  'Parlement, Constitution, régions : les institutions du royaume sans prise de tête.',
  'histoire-geo',
  'normal',
  NULL,
  '[{"question":"Quel est le régime politique du Maroc ?","options":["Une république","Une monarchie constitutionnelle","Une fédération","Un empire"],"correct":1,"explanation":"Le Maroc est une monarchie constitutionnelle, avec un roi et un parlement élu par les citoyens."},{"question":"De combien de chambres se compose le Parlement marocain ?","options":["Une","Deux","Trois","Quatre"],"correct":1,"explanation":"Le Parlement réunit la Chambre des représentants et la Chambre des conseillers."},{"question":"En quelle année la Constitution actuellement en vigueur au Maroc a-t-elle été adoptée ?","options":["1996","2004","2011","2016"],"correct":2,"explanation":"La Constitution de 2011 a notamment fait de l''amazigh une langue officielle du pays."},{"question":"Combien de régions administratives compte le Maroc depuis 2015 ?","options":["16","10","14","12"],"correct":3,"explanation":"Le découpage de 2015 a réorganisé le pays en 12 régions, chacune avec son conseil élu."},{"question":"Quelles sont les langues officielles du Maroc ?","options":["L''arabe uniquement","L''arabe et le français","L''arabe et l''amazigh","Le français et l''amazigh"],"correct":2,"explanation":"Depuis 2011, l''amazigh est langue officielle aux côtés de l''arabe ; le français est très utilisé mais pas officiel."}]'::jsonb,
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
  'DAILY_SEED_HISTOIRE_GEO_08',
  'Maroc antique : mode archéologue',
  'Romains, Phéniciens, rois savants : plonge 2 000 ans en arrière.',
  'histoire-geo',
  'hard',
  NULL,
  '[{"question":"Quel célèbre site romain se trouve près de Meknès ?","options":["Volubilis","Carthage","Timgad","Leptis Magna"],"correct":0,"explanation":"Volubilis conserve de superbes mosaïques et fut l''une des grandes villes de la région à l''époque romaine."},{"question":"Quel était le nom antique de Tanger ?","options":["Anfa","Tingis","Lixus","Rusadir"],"correct":1,"explanation":"Tingis a donné son nom à toute la province romaine du nord du Maroc, la Maurétanie Tingitane."},{"question":"Quel roi savant a régné sur la Maurétanie à l''époque antique ?","options":["Hannibal","Massinissa","Juba II","Jugurtha"],"correct":2,"explanation":"Juba II, roi érudit marié à la fille de Cléopâtre, écrivait des ouvrages de géographie et d''histoire naturelle."},{"question":"Quel peuple de navigateurs a fondé des comptoirs comme Lixus sur les côtes marocaines ?","options":["Les Grecs","Les Vikings","Les Perses","Les Phéniciens"],"correct":3,"explanation":"Les Phéniciens, grands commerçants venus de Méditerranée orientale, ont installé des comptoirs dès l''Antiquité."},{"question":"Comment s''appelait la province romaine couvrant le nord du Maroc actuel ?","options":["La Numidie","La Maurétanie Tingitane","L''Afrique proconsulaire","La Bétique"],"correct":1,"explanation":"La Maurétanie Tingitane tirait son nom de Tingis, sa capitale, l''actuelle Tanger."}]'::jsonb,
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
  'DAILY_SEED_HISTOIRE_GEO_09',
  'Planète Terre : les basiques',
  'Océans, déserts, sommets : les records de la planète en mode rapide.',
  'histoire-geo',
  'easy',
  NULL,
  '[{"question":"Sur quel continent se trouve le Maroc ?","options":["L''Asie","L''Europe","L''Afrique","L''Océanie"],"correct":2,"explanation":"Le Maroc occupe la pointe nord-ouest de l''Afrique, à seulement 14 km de l''Europe."},{"question":"Quel est le plus grand océan du monde ?","options":["L''Atlantique","Le Pacifique","L''Indien","L''Arctique"],"correct":1,"explanation":"Le Pacifique couvre à lui seul près d''un tiers de la surface du globe."},{"question":"Quel est le plus grand désert chaud du monde ?","options":["Le Sahara","Le désert de Gobi","Le Kalahari","Le désert d''Atacama"],"correct":0,"explanation":"Le Sahara s''étend sur environ 9 millions de km², dont une partie au Maroc."},{"question":"Quel est le plus haut sommet du monde ?","options":["Le mont Blanc","Le K2","Le Kilimandjaro","L''Everest"],"correct":3,"explanation":"L''Everest culmine à 8 849 m dans la chaîne de l''Himalaya, entre le Népal et la Chine."},{"question":"Quel fleuve, le plus long d''Afrique, traverse l''Égypte ?","options":["Le Congo","Le Nil","Le Niger","Le Zambèze"],"correct":1,"explanation":"Le Nil parcourt plus de 6 600 km avant de se jeter dans la Méditerranée."}]'::jsonb,
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
  'DAILY_SEED_HISTOIRE_GEO_10',
  'Dates qui ont changé le monde',
  '1492, 1789, 1969... associe chaque date au bon événement.',
  'histoire-geo',
  'normal',
  NULL,
  '[{"question":"En quelle année Christophe Colomb a-t-il atteint l''Amérique ?","options":["1492","1515","1453","1620"],"correct":0,"explanation":"En 1492, ses trois caravelles ont traversé l''Atlantique alors qu''il pensait rejoindre les Indes."},{"question":"Quel événement majeur a débuté en France en 1789 ?","options":["La Première Guerre mondiale","La Renaissance","La Révolution française","La révolution industrielle"],"correct":2,"explanation":"La prise de la Bastille, le 14 juillet 1789, est restée le symbole de la Révolution française."},{"question":"Quelles années correspondent à la Première Guerre mondiale ?","options":["1939-1945","1914-1918","1904-1908","1929-1933"],"correct":1,"explanation":"La Première Guerre mondiale a duré de 1914 à 1918 ; 1939-1945 correspond à la Seconde."},{"question":"En quelle année l''être humain a-t-il marché sur la Lune pour la première fois ?","options":["1959","1975","1981","1969"],"correct":3,"explanation":"Neil Armstrong a posé le pied sur la Lune en juillet 1969 lors de la mission Apollo 11."},{"question":"Quel mur célèbre est tombé en 1989 ?","options":["Le mur d''Hadrien","La Grande Muraille","Le mur de Berlin","Le mur d''York"],"correct":2,"explanation":"La chute du mur de Berlin a marqué la fin de la division de l''Allemagne et annoncé la fin de la guerre froide."}]'::jsonb,
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
  'DAILY_SEED_HISTOIRE_GEO_11',
  'Cap au sud : Sahara et oasis',
  'Dunes, lagons et palmeraies : direction le grand sud marocain.',
  'histoire-geo',
  'normal',
  NULL,
  '[{"question":"Comment s''appelle la grande marche pacifique de 1975 vers le Sahara ?","options":["La Marche Verte","La Longue Marche","La Marche du Sel","La Marche Bleue"],"correct":0,"explanation":"Le 6 novembre 1975, environ 350 000 Marocains ont participé à la Marche Verte, commémorée chaque année."},{"question":"Quelle ville saharienne, construite sur une presqu''île, est réputée pour ses sports de glisse ?","options":["Tan-Tan","Guelmim","Dakhla","Tata"],"correct":2,"explanation":"Grâce à son immense lagon venté, Dakhla est devenue un spot mondial de kitesurf."},{"question":"Près de quel village se trouvent les grandes dunes de l''erg Chebbi ?","options":["Zagora","Merzouga","Tinghir","Midelt"],"correct":1,"explanation":"Les dunes de l''erg Chebbi, près de Merzouga, atteignent environ 150 m de haut."},{"question":"Quel arbre est la star des oasis marocaines ?","options":["L''olivier","Le cèdre","L''arganier","Le palmier dattier"],"correct":3,"explanation":"Le palmier dattier donne les dattes et son ombre permet de cultiver légumes et céréales dans l''oasis."},{"question":"Quelle est la principale ville du Sahara marocain ?","options":["Tarfaya","Laâyoune","Assa","Akka"],"correct":1,"explanation":"Laâyoune est la plus grande ville des provinces du sud du Maroc."}]'::jsonb,
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
  'DAILY_SEED_HISTOIRE_GEO_12',
  'Trésors classés du Maroc',
  'Médinas, ksour et places légendaires reconnus par l''UNESCO : niveau expert !',
  'histoire-geo',
  'hard',
  NULL,
  '[{"question":"Quelle médina marocaine a été la première inscrite au patrimoine mondial de l''UNESCO en 1981 ?","options":["La médina de Marrakech","La médina d''Essaouira","La médina de Fès","La médina de Tétouan"],"correct":2,"explanation":"La médina de Fès, l''une des plus grandes zones piétonnes du monde, a ouvert la voie en 1981."},{"question":"Quel ksar classé à l''UNESCO a servi de décor à de nombreux films près de Ouarzazate ?","options":["Aït-Ben-Haddou","Chellah","Sijilmassa","Taourirt"],"correct":0,"explanation":"Le ksar d''Aït-Ben-Haddou apparaît dans des films et séries célèbres comme Gladiator."},{"question":"Quelle place célèbre est reconnue par l''UNESCO pour ses conteurs et ses artistes de rue ?","options":["La place Mohammed V","La place Jemaa el-Fna","La place des Nations Unies","La place El Hedim"],"correct":1,"explanation":"La place Jemaa el-Fna de Marrakech est inscrite au patrimoine culturel immatériel de l''humanité."},{"question":"Quelle université marocaine est considérée comme la plus ancienne du monde encore en activité ?","options":["L''université Al Akhawayn","L''université Mohammed V","L''université Cadi Ayyad","L''université Al Quaraouiyine"],"correct":3,"explanation":"Fondée à Fès en 859, la Quaraouiyine accueille encore des étudiants aujourd''hui."},{"question":"Quelle ville abrite la « cité portugaise » classée à l''UNESCO ?","options":["Safi","Azemmour","El Jadida","Larache"],"correct":2,"explanation":"La cité portugaise d''El Jadida, avec sa célèbre citerne souterraine, est classée depuis 2004."}]'::jsonb,
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
  'DAILY_SEED_HISTOIRE_GEO_13',
  'Légendes made in Maroc',
  'Voyageurs, fondatrices et sultans : les personnages qui ont marqué l''histoire.',
  'histoire-geo',
  'hard',
  NULL,
  '[{"question":"Quel grand voyageur du XIVe siècle est né à Tanger ?","options":["Ibn Khaldoun","Marco Polo","Ibn Battouta","Vasco de Gama"],"correct":2,"explanation":"Ibn Battouta a parcouru environ 120 000 km, de l''Afrique à la Chine, pendant près de 30 ans."},{"question":"Qui a fondé l''université Al Quaraouiyine de Fès en 859 ?","options":["Fatima al-Fihri","Zaynab an-Nafzawiyya","Sayyida al-Hurra","Kenza al-Awrabiya"],"correct":0,"explanation":"Fatima al-Fihri a financé la construction de la mosquée-université grâce à son héritage."},{"question":"Quel sultan saadien était surnommé « Eddahbi », c''est-à-dire « le Doré » ?","options":["Moulay Ismaïl","Ahmed al-Mansour","Youssef Ibn Tachfine","Idriss II"],"correct":1,"explanation":"Ahmed al-Mansour doit ce surnom aux richesses tirées du commerce de l''or transsaharien."},{"question":"Quel chef almoravide, fondateur de Marrakech, a remporté la bataille de Zallaqa en 1086 ?","options":["Abd al-Moumen","Tarik Ibn Ziyad","Youssef Ibn Tachfine","Yacoub El Mansour"],"correct":2,"explanation":"Youssef Ibn Tachfine a mené les Almoravides à cette grande victoire en Andalousie."},{"question":"Le nom « Gibraltar » vient du nom de quel chef ayant traversé le détroit en 711 ?","options":["Tarik Ibn Ziyad","Oqba Ibn Nafi","Moussa Ibn Noussair","Abd al-Rahman"],"correct":0,"explanation":"Gibraltar vient de « Jabal Tarik », la montagne de Tarik, en souvenir de sa traversée depuis le Maroc."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;


-- ---------------------------------------------------------------
-- Matiere: culture-maroc (source g3a-culture-maroc.json)
-- ---------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_CULTURE_MAROC_01',
  'Lions de l''Atlas, à toi de jouer !',
  'Le foot marocain n''a plus de secret pour toi ? Prouve-le !',
  'culture-maroc',
  'easy',
  NULL,
  '[{"question":"En quelle année le Maroc est-il devenu la première équipe africaine à atteindre les demi-finales d''une Coupe du monde ?","options":["2010","2018","2022","2014"],"correct":2,"explanation":"Au Mondial 2022 au Qatar, le Maroc a écrit l''histoire en devenant la première nation africaine demi-finaliste d''une Coupe du monde."},{"question":"Quel est le surnom de l''équipe nationale marocaine de football ?","options":["Les Lions de l''Atlas","Les Aigles du Sahara","Les Faucons du Rif","Les Panthères de l''Atlas"],"correct":0,"explanation":"Le surnom « Lions de l''Atlas » vient du lion de l''Atlas, un félin majestueux qui vivait autrefois dans les montagnes marocaines."},{"question":"Quel gardien marocain est devenu célèbre pour ses arrêts de penalty face à l''Espagne au Mondial 2022 ?","options":["Munir El Kajoui","Yassine Bounou","Ahmed Reda Tagnaouti","Anas Zniti"],"correct":1,"explanation":"Yassine Bounou, surnommé « Bono », a stoppé deux penaltys espagnols et permis au Maroc de se qualifier en quarts de finale."},{"question":"Quelle équipe le Maroc a-t-il battue 1-0 en quart de finale de la Coupe du monde 2022 ?","options":["La France","L''Espagne","La Croatie","Le Portugal"],"correct":3,"explanation":"Le Maroc a éliminé le Portugal de Cristiano Ronaldo en quart de finale, un exploit historique pour le football africain."},{"question":"Quel attaquant a marqué le but de la victoire contre le Portugal en quart de finale 2022 ?","options":["Hakim Ziyech","Achraf Hakimi","Youssef En-Nesyri","Sofiane Boufal"],"correct":2,"explanation":"Youssef En-Nesyri a inscrit ce but de la tête après un saut impressionnant mesuré à près de 2,78 m de hauteur."}]'::jsonb,
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
  'DAILY_SEED_CULTURE_MAROC_02',
  'Miam ! La cuisine marocaine',
  'Tajine, couscous, thé à la menthe... teste tes papilles !',
  'culture-maroc',
  'easy',
  NULL,
  '[{"question":"Quel plat marocain est traditionnellement préparé le vendredi dans de nombreuses familles ?","options":["La pastilla","Le couscous","Le méchoui","La rfissa"],"correct":1,"explanation":"Le couscous du vendredi est une tradition familiale forte au Maroc, souvent partagé après la prière de la mi-journée."},{"question":"Quelle boisson chaude est le symbole de l''hospitalité marocaine ?","options":["Le café noir","Le chocolat chaud","Le lait au safran","Le thé à la menthe"],"correct":3,"explanation":"Servi bien sucré et versé de haut pour faire de la mousse, le thé à la menthe est offert aux invités dans tout le Maroc."},{"question":"Dans quel plat en terre cuite au couvercle conique mijote le célèbre ragoût marocain ?","options":["Le tajine","La marmite","Le wok","La cocotte"],"correct":0,"explanation":"Le mot « tajine » désigne à la fois le plat en terre cuite et la recette qui mijote dedans, grâce à son couvercle qui garde la vapeur."},{"question":"Quelle soupe marocaine à base de tomates, lentilles et pois chiches est très consommée pendant le Ramadan ?","options":["La bissara","Le gaspacho","La harira","La chorba blanche"],"correct":2,"explanation":"La harira est la soupe star de la rupture du jeûne au Maroc, souvent accompagnée de dattes et de chebakia."},{"question":"La pastilla traditionnelle mélange sucré et salé. Avec quelle viande était-elle préparée à l''origine ?","options":["Le bœuf","Le pigeon","L''agneau","La dinde"],"correct":1,"explanation":"La pastilla était à l''origine préparée au pigeon, avant que le poulet ne devienne plus courant dans les familles."}]'::jsonb,
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
  'DAILY_SEED_CULTURE_MAROC_03',
  'Villes du Maroc : t''es cap ?',
  'De Tanger à Marrakech, montre que tu connais ton pays !',
  'culture-maroc',
  'easy',
  NULL,
  '[{"question":"Quelle est la capitale du Maroc ?","options":["Casablanca","Marrakech","Rabat","Fès"],"correct":2,"explanation":"Beaucoup pensent à Casablanca, mais la capitale administrative du Maroc est bien Rabat depuis 1912."},{"question":"Quelle ville marocaine est surnommée « la ville rouge » ?","options":["Marrakech","Agadir","Oujda","Tétouan"],"correct":0,"explanation":"Marrakech doit son surnom à la couleur ocre-rouge de ses remparts et de ses bâtiments en terre."},{"question":"Quelle ville du Rif est mondialement connue pour ses ruelles peintes en bleu ?","options":["Al Hoceïma","Nador","Ouezzane","Chefchaouen"],"correct":3,"explanation":"Chefchaouen, « la perle bleue », attire des visiteurs du monde entier venus photographier ses murs bleus."},{"question":"Quelle est la plus grande ville du Maroc par sa population ?","options":["Rabat","Casablanca","Fès","Tanger"],"correct":1,"explanation":"Casablanca compte plus de 3 millions d''habitants, ce qui en fait le poumon économique et la plus grande ville du pays."},{"question":"Quelle ville côtière aux remparts célèbres est un paradis du surf et du kitesurf grâce à son vent constant ?","options":["Kénitra","El Jadida","Essaouira","Dakhla"],"correct":2,"explanation":"Essaouira, surnommée « la ville du vent », accueille des surfeurs et kitesurfeurs du monde entier toute l''année."}]'::jsonb,
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
  'DAILY_SEED_CULTURE_MAROC_04',
  'Mains d''or : l''artisanat marocain',
  'Zellige, cuir, poterie... découvre les trésors des artisans !',
  'culture-maroc',
  'normal',
  NULL,
  '[{"question":"Comment s''appelle la mosaïque marocaine faite de petits morceaux de faïence colorée taillés à la main ?","options":["Le tadelakt","Le zellige","Le moucharabieh","Le stuc"],"correct":1,"explanation":"Le zellige est un art géométrique marocain : chaque petit carreau est taillé à la main puis assemblé en motifs complexes."},{"question":"Quelle ville marocaine est mondialement célèbre pour ses tanneries de cuir à ciel ouvert ?","options":["Fès","Agadir","Tanger","Laâyoune"],"correct":0,"explanation":"Les tanneries Chouara de Fès, avec leurs bassins de teinture colorés, fonctionnent quasiment de la même façon depuis le Moyen Âge."},{"question":"De quel arbre, qui pousse presque uniquement au Maroc, tire-t-on une huile précieuse utilisée en cuisine et en cosmétique ?","options":["L''olivier","Le palmier dattier","Le caroubier","L''arganier"],"correct":3,"explanation":"L''arganier pousse principalement dans le sud-ouest marocain, et son huile d''argan est exportée dans le monde entier."},{"question":"Comment s''appellent les chaussures traditionnelles marocaines en cuir, souvent de couleur jaune ?","options":["Les espadrilles","Les mocassins","Les babouches","Les sandales roumies"],"correct":2,"explanation":"La babouche, appelée « belgha » en darija, est fabriquée à la main par des maâlems, surtout à Fès et Marrakech."},{"question":"Quelle ville de la côte atlantique est considérée comme la capitale marocaine de la poterie ?","options":["Mohammedia","Safi","Asilah","Larache"],"correct":1,"explanation":"Safi est réputée depuis des siècles pour ses potiers et sa céramique colorée, exposée sur la colline des potiers."}]'::jsonb,
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
  'DAILY_SEED_CULTURE_MAROC_05',
  'Champions marocains',
  'Des pistes d''athlétisme aux podiums olympiques, connais-tu nos légendes ?',
  'culture-maroc',
  'normal',
  NULL,
  '[{"question":"Dans quel sport Hicham El Guerrouj est-il une légende mondiale ?","options":["La boxe","Le tennis","L''athlétisme","La natation"],"correct":2,"explanation":"Hicham El Guerrouj est l''un des plus grands coureurs de demi-fond de l''histoire, double champion olympique en 2004."},{"question":"Qui est la première Marocaine championne olympique, sacrée sur 400 m haies en 1984 ?","options":["Nawal El Moutawakel","Nezha Bidouane","Salima Souakri","Hasna Benhassi"],"correct":0,"explanation":"À Los Angeles en 1984, Nawal El Moutawakel est devenue la première femme d''un pays musulman championne olympique."},{"question":"Dans quelle discipline Soufiane El Bakkali a-t-il été champion olympique en 2021 puis en 2024 ?","options":["Le marathon","Le 110 m haies","Le saut en longueur","Le 3000 m steeple"],"correct":3,"explanation":"Soufiane El Bakkali a dominé le 3000 m steeple à Tokyo puis à Paris, mettant fin à des décennies de règne kényan."},{"question":"Hicham El Guerrouj détient toujours le record du monde d''une course mythique. Laquelle ?","options":["Le 800 m","Le 1500 m","Le 5000 m","Le 100 m"],"correct":1,"explanation":"Son record du monde du 1500 m (3 min 26 s), établi en 1998 à Rome, n''a toujours pas été battu."},{"question":"En quelle année le Maroc a-t-il remporté sa première Coupe d''Afrique des Nations de football ?","options":["1976","1988","2004","1998"],"correct":0,"explanation":"Le Maroc a soulevé la CAN en 1976 en Éthiopie, un titre historique pour les Lions de l''Atlas."}]'::jsonb,
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
  'DAILY_SEED_CULTURE_MAROC_06',
  'Fêtes et traditions du bled',
  'Henné, festivals, Yennayer... plonge dans nos traditions !',
  'culture-maroc',
  'easy',
  NULL,
  '[{"question":"Quelle fête marque la fin du mois de Ramadan ?","options":["Achoura","L''Aïd el-Fitr","L''Aïd el-Adha","Le Mouloud"],"correct":1,"explanation":"L''Aïd el-Fitr, fête de la rupture du jeûne, se célèbre en famille avec des gâteaux, des vêtements neufs et des visites."},{"question":"Comment s''appelle le nouvel an amazigh, célébré à la mi-janvier ?","options":["Achoura","Boujloud","Nowruz","Yennayer"],"correct":3,"explanation":"Yennayer, le nouvel an amazigh, est devenu un jour férié officiel au Maroc en 2024, célébré le 14 janvier."},{"question":"Quelle plante est utilisée pour dessiner des motifs sur les mains lors des mariages et des fêtes ?","options":["Le henné","La lavande","Le safran","La menthe"],"correct":0,"explanation":"Le henné, réduit en pâte, colore la peau en orange-brun et symbolise la joie et la protection lors des grandes occasions."},{"question":"Quel grand festival de musique international a lieu chaque année à Rabat ?","options":["Timitar","Jazzablanca","Mawazine","Tanjazz"],"correct":2,"explanation":"Mawazine est l''un des plus grands festivals de musique du monde, avec des millions de spectateurs chaque année à Rabat."},{"question":"Quelle ville accueille chaque année le Festival Gnaoua et Musiques du Monde ?","options":["Marrakech","Essaouira","Casablanca","Fès"],"correct":1,"explanation":"Depuis 1998, Essaouira vibre chaque été au rythme du Festival Gnaoua, qui mélange musique gnaouie, jazz et musiques du monde."}]'::jsonb,
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
  'DAILY_SEED_CULTURE_MAROC_07',
  'Inventions et grandes premières',
  'Des idées qui ont changé le monde, du papier au web !',
  'culture-maroc',
  'normal',
  NULL,
  '[{"question":"Quel inventeur américain a rendu l''ampoule électrique utilisable par tous à la fin du 19e siècle ?","options":["Nikola Tesla","Alexander Graham Bell","Thomas Edison","Benjamin Franklin"],"correct":2,"explanation":"Thomas Edison a perfectionné et commercialisé l''ampoule à incandescence, ce qui a fait entrer l''électricité dans les maisons."},{"question":"Quelle université, fondée à Fès en 859 par Fatima al-Fihri, est considérée comme la plus ancienne au monde encore en activité ?","options":["Al Quaraouiyine","Al-Azhar","La Sorbonne","Bologne"],"correct":0,"explanation":"L''université Al Quaraouiyine de Fès, fondée par une femme, Fatima al-Fihri, est reconnue comme la plus ancienne université encore en activité."},{"question":"Qui a inventé le World Wide Web en 1989 ?","options":["Bill Gates","Steve Jobs","Mark Zuckerberg","Tim Berners-Lee"],"correct":3,"explanation":"Tim Berners-Lee, chercheur au CERN, a inventé le web pour partager des documents entre scientifiques... et a changé nos vies."},{"question":"Quelle invention venue de Chine a révolutionné la transmission du savoir bien avant l''imprimerie ?","options":["Le stylo","Le papier","Le parchemin","L''encre invisible"],"correct":1,"explanation":"Le papier a été inventé en Chine il y a environ 2000 ans, avant de voyager vers le monde arabe puis l''Europe."},{"question":"Ibn Battouta, né à Tanger en 1304, est resté célèbre pour quel exploit ?","options":["Avoir inventé l''astrolabe","Avoir construit la première medersa","Avoir parcouru environ 120 000 km à travers le monde","Avoir traduit des textes grecs"],"correct":2,"explanation":"Le Tangérois Ibn Battouta a voyagé pendant près de 30 ans, de l''Afrique à la Chine, soit bien plus loin que Marco Polo."}]'::jsonb,
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
  'DAILY_SEED_CULTURE_MAROC_08',
  'Le Maroc des records',
  'Sommets, TGV, méga-centrale solaire : le Maroc voit grand !',
  'culture-maroc',
  'hard',
  NULL,
  '[{"question":"Quel est le point culminant du Maroc et de toute l''Afrique du Nord ?","options":["Le mont M''Goun","Le djebel Toubkal","Le djebel Ayachi","Le mont Tidighine"],"correct":1,"explanation":"Le djebel Toubkal, dans le Haut Atlas, culmine à 4167 m : c''est le toit de l''Afrique du Nord."},{"question":"Près de quelle ville se trouve Noor, l''un des plus grands complexes solaires du monde ?","options":["Ouarzazate","Errachidia","Guelmim","Béni Mellal"],"correct":0,"explanation":"Le complexe solaire Noor, près de Ouarzazate, s''étend sur des milliers d''hectares et alimente plus d''un million de foyers."},{"question":"Comment s''appelle le train à grande vitesse marocain, premier TGV d''Afrique inauguré en 2018 ?","options":["Al Atlas","Le Marrakech Express","Le Sahara Express","Al Boraq"],"correct":3,"explanation":"Al Boraq relie Tanger à Casablanca à 320 km/h, ce qui en fait le premier train à grande vitesse du continent africain."},{"question":"Quelle mosquée marocaine possède un minaret d''environ 200 m, parmi les plus hauts du monde ?","options":["La Koutoubia à Marrakech","La mosquée Al Quaraouiyine à Fès","La mosquée Hassan II à Casablanca","La Tour Hassan à Rabat"],"correct":2,"explanation":"Le minaret de la mosquée Hassan II à Casablanca s''élève à environ 200 m, en partie construite au-dessus de l''océan Atlantique."},{"question":"Dans sa partie la plus étroite, quelle distance sépare environ le Maroc de l''Espagne au niveau du détroit de Gibraltar ?","options":["50 km","14 km","100 km","30 km"],"correct":1,"explanation":"Seulement 14 km environ séparent les deux rives du détroit de Gibraltar : par temps clair, on voit l''Espagne depuis Tanger."}]'::jsonb,
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
  'DAILY_SEED_CULTURE_MAROC_09',
  'Langues et sons du Maroc',
  'Darija, tamazight, gnaoua... le Maroc parle et chante !',
  'culture-maroc',
  'easy',
  NULL,
  '[{"question":"Comment s''appelle l''arabe dialectal parlé au quotidien au Maroc ?","options":["La darija","Le hassani","Le fus''ha","Le tachelhit"],"correct":0,"explanation":"La darija est l''arabe marocain de tous les jours, avec ses mots venus de l''amazighe, du français et de l''espagnol."},{"question":"Quelle langue est officielle au Maroc aux côtés de l''arabe depuis la Constitution de 2011 ?","options":["Le français","L''espagnol","L''amazighe","L''anglais"],"correct":2,"explanation":"L''amazighe (tamazight) est devenue langue officielle du Maroc en 2011, une reconnaissance historique de la culture amazighe."},{"question":"Quel genre musical marocain, joué avec le guembri et les qraqeb, est inscrit au patrimoine immatériel de l''UNESCO ?","options":["Le chaâbi","Le gnaoua","Le raï","La aïta"],"correct":1,"explanation":"L''art gnaoua, avec ses rythmes envoûtants et son guembri à trois cordes, est inscrit à l''UNESCO depuis 2019."},{"question":"Comment s''appelle l''alphabet utilisé pour écrire la langue amazighe ?","options":["L''alphabet cyrillique","L''alphabet phénicien","L''alphabet copte","Le tifinagh"],"correct":3,"explanation":"Le tifinagh, avec ses lettres géométriques comme le fameux « yaz », est l''alphabet officiel de l''amazighe au Maroc."},{"question":"Quel style de musique urbaine, mélangeant souvent darija, français et anglais, cartonne chez les jeunes Marocains ?","options":["L''opéra","Le jazz manouche","La musique classique","Le rap"],"correct":3,"explanation":"Le rap marocain remplit les salles et cumule des millions de vues en ligne, souvent en mélangeant plusieurs langues dans un même morceau."}]'::jsonb,
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
  'DAILY_SEED_CULTURE_MAROC_10',
  'Géo express : le monde en 5 questions',
  'Déserts, fleuves, capitales pièges... fais le tour du monde !',
  'culture-maroc',
  'normal',
  NULL,
  '[{"question":"Quel est le plus grand désert chaud du monde, qui s''étend jusqu''au sud du Maroc ?","options":["Le désert de Gobi","Le désert d''Atacama","Le désert d''Arabie","Le Sahara"],"correct":3,"explanation":"Le Sahara couvre environ 9 millions de km², soit presque la taille de tout le continent européen."},{"question":"Quel est le plus long fleuve d''Afrique ?","options":["Le Congo","Le Nil","Le Niger","Le Zambèze"],"correct":1,"explanation":"Le Nil parcourt environ 6650 km du cœur de l''Afrique jusqu''à la mer Méditerranée, en traversant notamment l''Égypte."},{"question":"Quel pays est devenu le plus peuplé du monde en 2023 ?","options":["La Chine","Les États-Unis","L''Inde","L''Indonésie"],"correct":2,"explanation":"L''Inde a dépassé la Chine en 2023 avec plus de 1,4 milliard d''habitants."},{"question":"Quelle est la capitale de l''Australie ?","options":["Canberra","Sydney","Melbourne","Perth"],"correct":0,"explanation":"Piège classique : la capitale australienne n''est pas Sydney mais Canberra, une ville construite exprès pour ce rôle."},{"question":"Quel pays compte le plus de fuseaux horaires au monde ?","options":["La Russie","La France","Les États-Unis","La Chine"],"correct":1,"explanation":"Grâce à ses territoires d''outre-mer répartis sur tous les océans, la France couvre 12 fuseaux horaires, plus que la Russie."}]'::jsonb,
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
  'DAILY_SEED_CULTURE_MAROC_11',
  'Sciences : cerveau en fusion',
  'Planètes, Nobel, satellites... active ton mode génie !',
  'culture-maroc',
  'normal',
  NULL,
  '[{"question":"Quelle planète du système solaire est surnommée « la planète rouge » ?","options":["Vénus","Jupiter","Mars","Saturne"],"correct":2,"explanation":"Mars doit sa couleur rouge à l''oxyde de fer (la rouille) qui recouvre sa surface."},{"question":"Quel physicien a développé la théorie de la relativité ?","options":["Albert Einstein","Isaac Newton","Galilée","Stephen Hawking"],"correct":0,"explanation":"Albert Einstein a publié sa théorie de la relativité au début du 20e siècle, bouleversant notre vision du temps et de l''espace."},{"question":"Quelle scientifique est la seule personne à avoir reçu un prix Nobel en physique ET en chimie ?","options":["Rosalind Franklin","Ada Lovelace","Jane Goodall","Marie Curie"],"correct":3,"explanation":"Marie Curie a reçu le Nobel de physique en 1903 puis celui de chimie en 1911 pour ses travaux sur la radioactivité."},{"question":"Combien d''os compte environ le squelette d''un humain adulte ?","options":["106","206","306","506"],"correct":1,"explanation":"Un adulte possède 206 os, alors qu''un bébé en a environ 300 : certains os fusionnent en grandissant."},{"question":"Comment s''appelle le satellite marocain d''observation de la Terre lancé en 2017 ?","options":["Mohammed VI-A","Atlas-1","Maroc-Sat","Toubkal-1"],"correct":0,"explanation":"Le satellite Mohammed VI-A, lancé en novembre 2017, sert notamment à la cartographie, l''agriculture et la surveillance de l''environnement."}]'::jsonb,
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
  'DAILY_SEED_CULTURE_MAROC_12',
  'Maroc secret : niveau expert',
  'Ruines romaines, fossiles records... le Maroc que peu connaissent !',
  'culture-maroc',
  'hard',
  NULL,
  '[{"question":"Dans quelle ville se trouve le mausolée Mohammed V, face à la Tour Hassan ?","options":["Casablanca","Rabat","Meknès","Marrakech"],"correct":1,"explanation":"Le mausolée Mohammed V et la Tour Hassan forment l''un des sites les plus emblématiques de Rabat."},{"question":"Combien de villes impériales compte le Maroc ?","options":["2","3","4","5"],"correct":2,"explanation":"Les quatre villes impériales sont Fès, Marrakech, Meknès et Rabat : chacune a été capitale d''une dynastie."},{"question":"Quel site archéologique près de Meknès abrite des ruines romaines classées au patrimoine mondial de l''UNESCO ?","options":["Volubilis","Lixus","Chellah","Banasa"],"correct":0,"explanation":"Volubilis était une grande cité romaine d''Afrique du Nord : on y admire encore des mosaïques vieilles de presque 2000 ans."},{"question":"Quel film hollywoodien culte de 1942 porte le nom d''une ville marocaine ?","options":["Tanger","Agadir Nights","Marrakech Express","Casablanca"],"correct":3,"explanation":"« Casablanca », avec Humphrey Bogart, est considéré comme l''un des plus grands films de l''histoire du cinéma... mais il a été tourné en studio à Hollywood !"},{"question":"Où ont été découverts les plus anciens fossiles connus d''Homo sapiens, vieux d''environ 300 000 ans ?","options":["En Éthiopie","En Afrique du Sud","À Jebel Irhoud, au Maroc","En Tanzanie"],"correct":2,"explanation":"En 2017, des chercheurs ont annoncé que les fossiles de Jebel Irhoud, près de Safi, sont les plus anciens Homo sapiens connus : l''histoire de l''humanité passe par le Maroc !"}]'::jsonb,
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
  'DAILY_SEED_CULTURE_MAROC_13',
  'Sport planète : le grand quiz',
  'JO, Mondial 2030, records... prêt pour le niveau international ?',
  'culture-maroc',
  'hard',
  NULL,
  '[{"question":"Tous les combien d''années ont lieu les Jeux olympiques d''été ?","options":["4 ans","2 ans","5 ans","6 ans"],"correct":0,"explanation":"Les JO d''été reviennent tous les 4 ans, en alternance avec les JO d''hiver qui ont lieu 2 ans après."},{"question":"Quel pays a remporté le plus de Coupes du monde de football ?","options":["L''Allemagne","L''Argentine","L''Italie","Le Brésil"],"correct":3,"explanation":"Le Brésil compte 5 étoiles de champion du monde (1958, 1962, 1970, 1994, 2002), un record."},{"question":"Avec quels pays le Maroc co-organisera-t-il la Coupe du monde de football 2030 ?","options":["La France et l''Italie","L''Espagne et le Portugal","L''Égypte et la Tunisie","L''Algérie et le Sénégal"],"correct":1,"explanation":"Le Mondial 2030 sera organisé par le Maroc, l''Espagne et le Portugal : une première pour un tournoi à cheval sur deux continents."},{"question":"Quelle ville a accueilli les premiers Jeux olympiques modernes en 1896 ?","options":["Paris","Londres","Athènes","Rome"],"correct":2,"explanation":"Les premiers JO modernes ont eu lieu à Athènes en 1896, en hommage aux Jeux de la Grèce antique."},{"question":"Quel joueur détient le record de titres du Grand Chelem en tennis masculin ?","options":["Novak Djokovic","Roger Federer","Rafael Nadal","Pete Sampras"],"correct":0,"explanation":"Novak Djokovic a dépassé Nadal et Federer avec 24 titres du Grand Chelem, un record chez les hommes."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;


-- ---------------------------------------------------------------
-- Matiere: life-skills (source g3a-life-skills.json)
-- ---------------------------------------------------------------
INSERT INTO public.educational_quizzes
  (code, title, description, subject, difficulty, grade_level, questions,
   time_limit_minutes, passing_score, xp_reward, icon, language, is_active)
VALUES (
  'DAILY_SEED_LIFE_SKILLS_01',
  'Ton argent de poche, ton pouvoir',
  'Les bases pour gérer tes dirhams comme un pro dès maintenant.',
  'life-skills',
  'easy',
  NULL,
  '[{"question":"Que veut dire « faire un budget » ?","options":["Dépenser tout son argent rapidement","Prévoir à l''avance ses dépenses et son épargne","Emprunter de l''argent à ses amis","Cacher son argent sous le matelas"],"correct":1,"explanation":"Un budget est un plan qui répartit ton argent entre dépenses et épargne avant même de commencer à le dépenser."},{"question":"Tu reçois 100 DH d''argent de poche. Quelle habitude est la plus intelligente ?","options":["Tout dépenser le premier jour","Tout prêter à un ami","Mettre une partie de côté avant de dépenser le reste","Acheter uniquement des snacks"],"correct":2,"explanation":"« Se payer en premier » signifie épargner dès qu''on reçoit l''argent, avant que les envies ne le fassent disparaître."},{"question":"Lequel de ces achats est un « besoin » et non une « envie » ?","options":["Le ticket de bus pour aller au collège","Un troisième maillot de foot","Des écouteurs de luxe","Un jeu vidéo en promo"],"correct":0,"explanation":"Un besoin est indispensable (transport, nourriture, fournitures), alors qu''une envie est un plaisir optionnel qui peut attendre."},{"question":"Quelle est la monnaie officielle du Maroc ?","options":["L''euro","Le franc","Le dinar","Le dirham"],"correct":3,"explanation":"Le dirham marocain (DH ou MAD) est la monnaie officielle du Maroc, divisée en 100 centimes."},{"question":"Tu veux des baskets à 300 DH et tu peux épargner 50 DH par semaine. Combien de semaines te faut-il ?","options":["4 semaines","6 semaines","10 semaines","3 semaines"],"correct":1,"explanation":"300 ÷ 50 = 6 : diviser le prix par ton épargne hebdomadaire te donne le temps nécessaire pour atteindre ton objectif."}]'::jsonb,
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
  'DAILY_SEED_LIFE_SKILLS_02',
  'Budget de boss',
  'Passe au niveau supérieur : règles, calculs et réflexes de gestion.',
  'life-skills',
  'normal',
  NULL,
  '[{"question":"Dans la règle « 50/30/20 » adaptée à ton argent de poche, à quoi servent les 20 % ?","options":["Aux sorties","Aux vêtements","À l''épargne","Aux jeux mobiles"],"correct":2,"explanation":"Dans la règle 50/30/20, 50 % couvre les besoins, 30 % les envies et 20 % part directement en épargne."},{"question":"Tu as 200 DH pour le mois et tu dépenses 80 DH la première semaine. Combien te reste-t-il en moyenne par semaine pour les 3 semaines restantes ?","options":["40 DH","60 DH","30 DH","50 DH"],"correct":0,"explanation":"200 − 80 = 120 DH restants, et 120 ÷ 3 = 40 DH par semaine : anticiper évite de finir le mois à sec."},{"question":"Qu''est-ce qu''une « dépense imprévue » ?","options":["Ton abonnement téléphonique mensuel","Une dépense planifiée depuis longtemps","Le pain acheté chaque jour au hanout","La réparation soudaine de ton vélo"],"correct":3,"explanation":"Une dépense imprévue arrive sans prévenir, c''est pourquoi garder un petit fonds de secours est très utile."},{"question":"Au souk, un sac affiché à 150 DH est négocié à 100 DH. Quel pourcentage de réduction a été obtenu ?","options":["25 %","Environ 33 %","50 %","15 %"],"correct":1,"explanation":"La remise est de 50 DH sur 150 DH, soit 50 ÷ 150 ≈ 33 % : savoir calculer un pourcentage aide à bien négocier."},{"question":"Pourquoi noter ses dépenses (carnet ou application) aide-t-il à gérer son argent ?","options":["Ça fait gagner de l''argent automatiquement","C''est obligatoire par la loi","Ça permet de voir où part ton argent et d''ajuster tes habitudes","Ça remplace le besoin d''épargner"],"correct":2,"explanation":"Suivre ses dépenses révèle les « fuites » d''argent invisibles, comme les petits achats quotidiens qui s''accumulent."}]'::jsonb,
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
  'DAILY_SEED_LIFE_SKILLS_03',
  'Mission épargne',
  'Objectifs, tirelire ou banque : apprends à faire grandir ton argent.',
  'life-skills',
  'normal',
  NULL,
  '[{"question":"Qu''est-ce qu''un bon objectif d''épargne ?","options":["Un objectif vague comme « avoir plus d''argent »","Un objectif précis, mesurable et avec une date limite","Un objectif impossible à atteindre","Un objectif secret qu''on oublie vite"],"correct":1,"explanation":"Un objectif précis comme « 400 DH pour un vélo d''ici juin » motive beaucoup plus qu''une idée floue."},{"question":"Quel est l''avantage principal d''un compte d''épargne en banque par rapport à une tirelire ?","options":["L''argent y est protégé et peut rapporter des intérêts","On peut le dépenser plus vite","La banque double ton argent chaque mois","Il n''y a aucun avantage"],"correct":0,"explanation":"Une banque protège ton argent contre la perte ou le vol, et un compte d''épargne peut générer des intérêts."},{"question":"Tu épargnes 30 DH par semaine pendant 8 semaines, puis tu dépenses 90 DH. Combien te reste-t-il ?","options":["240 DH","120 DH","150 DH","180 DH"],"correct":2,"explanation":"30 × 8 = 240 DH épargnés, moins 90 DH dépensés, il reste 150 DH."},{"question":"Qu''est-ce qu''un « fonds d''urgence » ?","options":["De l''argent pour acheter des jeux en promo","De l''argent prêté aux amis","De l''argent réservé aux sorties du week-end","De l''argent mis de côté uniquement pour les imprévus"],"correct":3,"explanation":"Un fonds d''urgence ne sert qu''aux vraies surprises (téléphone cassé, dépense de santé), jamais aux envies du moment."},{"question":"Pourquoi dit-on que « l''argent épargné tôt vaut plus » ?","options":["Parce que les billets anciens valent plus cher","Parce que plus tu épargnes tôt, plus les intérêts s''accumulent avec le temps","Parce que les prix baissent toujours","Parce que les banques offrent des cadeaux aux jeunes"],"correct":1,"explanation":"C''est l''effet des intérêts composés : les intérêts produisent eux-mêmes des intérêts année après année."}]'::jsonb,
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
  'DAILY_SEED_LIFE_SKILLS_04',
  'Pièges à cash : évite-les tous',
  'Achats impulsifs, fausses promos, arnaques : apprends à les repérer avant de perdre tes dirhams.',
  'life-skills',
  'hard',
  NULL,
  '[{"question":"Qu''est-ce qu''un « achat impulsif » ?","options":["Un achat réfléchi pendant des semaines","Un achat fait sur un coup de tête, sans réfléchir","Un achat obligatoire pour l''école","Un achat fait uniquement en ligne"],"correct":1,"explanation":"L''achat impulsif est déclenché par l''émotion du moment ; attendre 24 heures aide à vérifier si on en a vraiment envie."},{"question":"Un site affiche « −70 % seulement aujourd''hui ! » avec un compte à rebours. Quelle technique utilise-t-il ?","options":["La transparence des prix","Le paiement sécurisé","L''urgence artificielle pour te pousser à acheter vite","La fidélisation client"],"correct":2,"explanation":"Créer un faux sentiment d''urgence est une technique marketing conçue pour court-circuiter ta réflexion."},{"question":"Un ami te propose : « Donne-moi 100 DH, je te rends 200 DH la semaine prochaine grâce à un plan secret. » C''est probablement…","options":["Une arnaque du type « promesse de gain irréaliste »","Un bon investissement","Un service bancaire officiel","Une bourse d''études"],"correct":0,"explanation":"Promettre de doubler ton argent vite et sans risque est le signe classique d''une arnaque financière."},{"question":"Qu''est-ce qu''une « vente pyramidale » ?","options":["Une promotion dans un supermarché","Une méthode d''empilage des fruits au marché","Une vente aux enchères","Un système où l''on gagne surtout en recrutant d''autres personnes, voué à s''effondrer"],"correct":3,"explanation":"Dans une pyramide, l''argent des nouveaux membres paie les anciens : quand le recrutement s''arrête, la majorité perd tout."},{"question":"Un abonnement de jeu coûte 30 DH par mois. Sur une année complète, cela représente…","options":["360 DH","300 DH","120 DH","240 DH"],"correct":0,"explanation":"30 × 12 = 360 DH : les petits paiements mensuels deviennent de grosses sommes sur l''année."}]'::jsonb,
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
  'DAILY_SEED_LIFE_SKILLS_05',
  'Mots de passe blindés',
  'Protège tes comptes comme un coffre-fort en 5 questions.',
  'life-skills',
  'easy',
  NULL,
  '[{"question":"Lequel de ces mots de passe est le plus solide ?","options":["123456","azerty","Tigre!Bleu#2026","Ton prénom suivi de ta date de naissance"],"correct":2,"explanation":"Un bon mot de passe est long et mélange lettres, chiffres et symboles, sans aucune information personnelle."},{"question":"Un site te propose la « double authentification » (2FA). Que fais-tu ?","options":["Tu l''actives, car elle ajoute une deuxième barrière de sécurité","Tu la refuses, c''est inutile","Tu la partages avec tes amis","Tu la désactives pour te connecter plus vite"],"correct":0,"explanation":"La 2FA demande un code en plus du mot de passe, ce qui bloque la plupart des tentatives de piratage."},{"question":"À qui peux-tu donner ton mot de passe ?","options":["À ton meilleur ami","À personne, sauf éventuellement tes parents","À un « modérateur » de jeu qui le demande","À un inconnu sympa rencontré en ligne"],"correct":1,"explanation":"Un mot de passe est strictement personnel : aucun service sérieux ne te le demandera jamais par message."},{"question":"Pourquoi faut-il un mot de passe différent pour chaque compte ?","options":["Pour faire joli","Parce que c''est plus facile à retenir","Parce que tous les sites l''exigent","Pour éviter qu''un seul piratage ouvre tous tes comptes"],"correct":3,"explanation":"Si tu réutilises le même mot de passe partout, un pirate qui le vole accède à tous tes comptes d''un coup."},{"question":"Tu utilises un ordinateur partagé dans un cybercafé à Casablanca. Que fais-tu avant de partir ?","options":["Tu laisses ta session ouverte pour la prochaine fois","Tu te déconnectes de tous tes comptes","Tu enregistres ton mot de passe sur l''ordinateur","Tu notes ton mot de passe sur un papier laissé sur place"],"correct":1,"explanation":"Sur un ordinateur partagé, il faut toujours se déconnecter et ne jamais enregistrer ses mots de passe."}]'::jsonb,
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
  'DAILY_SEED_LIFE_SKILLS_06',
  'Arnaques en ligne : ne mords pas à l''hameçon',
  'SMS piégés, faux e-mails, faux amis : détecte les arnaques avant qu''elles te coûtent cher.',
  'life-skills',
  'normal',
  NULL,
  '[{"question":"Tu reçois un SMS : « Votre colis est bloqué, cliquez ici et payez 20 DH. » Tu n''attends aucun colis. Que fais-tu ?","options":["Tu cliques pour vérifier","Tu paies vite les 20 DH","Tu supprimes le message sans cliquer","Tu transfères le lien à tes amis"],"correct":2,"explanation":"C''est du « smishing » (hameçonnage par SMS) : on ne clique jamais sur un lien inattendu qui réclame de l''argent."},{"question":"Qu''est-ce que le « phishing » (hameçonnage) ?","options":["Un message qui imite un organisme connu pour voler tes informations","Un virus qui détruit ton téléphone","Une technique de pêche pratiquée sur la côte atlantique","Un jeu en ligne gratuit"],"correct":0,"explanation":"Le phishing se fait passer pour ta banque, ton opérateur ou un site connu afin que tu livres toi-même tes données."},{"question":"Quel indice trahit souvent un e-mail frauduleux ?","options":["Un logo en couleur","Une adresse d''expéditeur bizarre et des fautes d''orthographe","Une signature à la fin du message","Un objet court et clair"],"correct":1,"explanation":"Adresse louche, fautes, ton urgent et lien à cliquer sont les signaux classiques d''un e-mail piégé."},{"question":"Un « ami » t''écrit sur les réseaux pour te demander une recharge téléphonique en urgence. Que fais-tu d''abord ?","options":["Tu envoies la recharge immédiatement","Tu lui donnes ton code de carte bancaire","Tu bloques ton ami pour toujours sans vérifier","Tu vérifies son identité par un appel ou en vrai"],"correct":3,"explanation":"Les comptes piratés servent souvent à réclamer recharges ou argent : vérifie toujours par un autre canal avant d''agir."},{"question":"Sur un site de vente, quel signe indique que la connexion est chiffrée ?","options":["Le cadenas et « https:// » dans la barre d''adresse","Beaucoup de publicités colorées","Un compte à rebours de promotion","Des prix incroyablement bas"],"correct":0,"explanation":"Le « s » de https et le cadenas indiquent une connexion chiffrée, mais il faut aussi vérifier l''identité réelle du site."}]'::jsonb,
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
  'DAILY_SEED_LIFE_SKILLS_07',
  'Ta vie privée, tes règles',
  'Ce que tu partages en ligne peut te suivre longtemps : apprends à te protéger.',
  'life-skills',
  'easy',
  NULL,
  '[{"question":"Quelle information ne dois-tu jamais publier publiquement en ligne ?","options":["Ton plat préféré","Ton adresse de maison","Ton équipe de foot préférée","Ton animal préféré"],"correct":1,"explanation":"Adresse, nom de ton école, numéro de téléphone : ces informations permettent de te localiser et doivent rester privées."},{"question":"Un inconnu sympa te parle en ligne depuis une semaine et propose de vous rencontrer. Que fais-tu ?","options":["Tu y vas seul sans rien dire à personne","Tu lui donnes ton adresse pour qu''il vienne","Tu en parles à un adulte de confiance avant toute chose","Tu lui envoies des photos pour le convaincre"],"correct":2,"explanation":"En ligne, on ne sait jamais qui se cache vraiment derrière un profil : il faut toujours prévenir un adulte de confiance."},{"question":"Que signifie mettre son compte en « privé » ?","options":["Seules les personnes que tu acceptes voient tes publications","Ton compte est supprimé","Tout le monde voit tes publications","Ton compte devient payant"],"correct":0,"explanation":"Un compte privé limite tes contenus aux abonnés que tu approuves, un excellent réflexe quand on est mineur."},{"question":"Avant de publier une photo d''un ami, tu dois…","options":["Ajouter un filtre stylé","La publier vite avant qu''il change d''avis","Taguer un maximum de monde","Lui demander son accord"],"correct":3,"explanation":"L''image d''une personne lui appartient : publier sa photo sans son accord ne respecte pas son droit à l''image."},{"question":"Pourquoi désactiver la localisation sur les photos que tu publies ?","options":["Uniquement pour économiser la batterie","Pour éviter que des inconnus sachent où tu te trouves","Parce que les photos sont plus belles sans","Ça ne sert à rien"],"correct":1,"explanation":"Les données de localisation d''une photo peuvent révéler ton domicile ou ton école à n''importe qui."}]'::jsonb,
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
  'DAILY_SEED_LIFE_SKILLS_08',
  'Stop au cyberharcèlement',
  'Victime ou témoin, tu as le pouvoir d''agir : les bons réflexes en 5 questions.',
  'life-skills',
  'normal',
  NULL,
  '[{"question":"Tu reçois des messages méchants répétés d''un camarade. Quelle est la meilleure première réaction ?","options":["Répondre encore plus méchamment","Supprimer tous les messages tout de suite","Bloquer, garder les preuves et en parler à un adulte","Créer un faux compte pour te venger"],"correct":2,"explanation":"Bloquer te protège, les captures d''écran servent de preuves, et un adulte peut t''aider à faire cesser le harcèlement."},{"question":"Pourquoi garder des captures d''écran des messages de harcèlement ?","options":["Comme preuves si un signalement devient nécessaire","Pour les republier plus tard","Pour les montrer à toute la classe","Pour gagner des abonnés"],"correct":0,"explanation":"Les preuves permettent aux adultes, à l''école ou aux autorités d''agir concrètement contre le harceleur."},{"question":"Un groupe se moque d''un élève sur le groupe WhatsApp de la classe. Tu es témoin. Que fais-tu ?","options":["Tu ajoutes un emoji qui rit","Tu soutiens la victime et tu alertes un adulte","Tu partages la moquerie ailleurs","Tu quittes le groupe sans rien dire à personne"],"correct":1,"explanation":"Le silence des témoins encourage le harceleur ; soutenir la victime et alerter un adulte change vraiment la situation."},{"question":"Au Maroc, le harcèlement et les insultes en ligne…","options":["Sont autorisés si c''est « pour rire »","Ne concernent que les adultes","Sont impossibles à prouver","Peuvent être punis par la loi"],"correct":3,"explanation":"La loi marocaine sanctionne les injures, la diffamation et le harcèlement, y compris quand ils sont commis en ligne."},{"question":"Quelle est la différence entre une blague et du harcèlement ?","options":["Il n''y en a aucune","Le harcèlement est répété et fait du mal à la personne visée","Une blague se fait toujours en ligne","Le harcèlement ne peut venir que d''inconnus"],"correct":1,"explanation":"Quand c''est répété, non désiré et blessant, ce n''est plus une blague : c''est du harcèlement."}]'::jsonb,
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
  'DAILY_SEED_LIFE_SKILLS_09',
  'Citoyen du web',
  'Empreinte numérique, respect et sources : deviens un utilisateur que le web mérite.',
  'life-skills',
  'normal',
  NULL,
  '[{"question":"Qu''est-ce que « l''empreinte numérique » ?","options":["La marque de tes doigts sur l''écran","L''ensemble des traces que tu laisses en ligne","Le mot de passe de ton téléphone","La taille de ta galerie photos"],"correct":1,"explanation":"Publications, commentaires, likes : tout ce que tu fais en ligne laisse des traces durables qui forment ton image."},{"question":"Avant de partager une information choquante, la première question à se poser est…","options":["« Combien de likes ça va faire ? »","« Qui l''a déjà partagée ? »","« Est-ce que cette information est vérifiée et vraie ? »","« Quel filtre utiliser ? »"],"correct":2,"explanation":"Partager sans vérifier fait de toi un relais de fausses informations, même sans le vouloir."},{"question":"Copier un texte trouvé sur internet et le rendre comme ton devoir, c''est…","options":["Du plagiat","De la recherche documentaire","De la collaboration","Une citation"],"correct":0,"explanation":"Le plagiat consiste à s''approprier le travail d''un autre ; il faut toujours citer ses sources."},{"question":"Un contenu publié en ligne…","options":["Disparaît automatiquement après 24 heures partout","N''est visible que par tes amis, quoi qu''il arrive","Est toujours facile à supprimer définitivement","Peut être copié et rediffusé même si tu le supprimes"],"correct":3,"explanation":"Captures d''écran et partages font qu''un contenu peut survivre à sa suppression : réfléchis avant de publier."},{"question":"Que signifie respecter la « netiquette » ?","options":["Se comporter en ligne avec le même respect qu''en vrai","Utiliser le plus d''emojis possible","Écrire uniquement en majuscules","Répondre à tous les messages en moins d''une minute"],"correct":0,"explanation":"La netiquette est la politesse du web : derrière chaque écran se trouve une vraie personne."}]'::jsonb,
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
  'DAILY_SEED_LIFE_SKILLS_10',
  'Fake news : deviens détective',
  'Deepfakes, clickbait, bulles de filtre : muscle ton esprit critique face aux intox.',
  'life-skills',
  'hard',
  NULL,
  '[{"question":"Qu''est-ce qu''un « deepfake » ?","options":["Une photo floue","Une vidéo ou un audio truqué par intelligence artificielle","Un compte certifié","Un article très long"],"correct":1,"explanation":"L''IA peut fabriquer des vidéos très réalistes montrant des personnes dire des choses qu''elles n''ont jamais dites."},{"question":"Quelle méthode permet de vérifier l''origine d''une image virale ?","options":["Compter ses likes","Regarder si elle est en couleur","Faire une recherche d''image inversée","Demander à la personne qui l''a partagée"],"correct":2,"explanation":"La recherche d''image inversée (Google Images, TinEye) montre où et quand l''image a déjà été publiée auparavant."},{"question":"Qu''est-ce qu''une « bulle de filtre » sur les réseaux sociaux ?","options":["Un filtre beauté pour les photos","Une publicité qui revient souvent","Un groupe privé entre amis","Un algorithme qui ne te montre que des contenus proches de tes opinions"],"correct":3,"explanation":"Les algorithmes te montrent surtout ce que tu aimes déjà, ce qui peut t''enfermer dans une seule vision du monde."},{"question":"Un titre s''exclame : « INCROYABLE ! Les médecins le cachent !! ». C''est typiquement…","options":["Du « clickbait » (piège à clics), souvent lié à de fausses informations","Un article scientifique sérieux","Un communiqué officiel","Une preuve de fiabilité"],"correct":0,"explanation":"Les titres sensationnels pleins de majuscules et de points d''exclamation cherchent le clic, pas la vérité."},{"question":"Pour vérifier une information importante, le mieux est de…","options":["La croire si elle a beaucoup de partages","Croiser plusieurs sources fiables et indépendantes","Vérifier uniquement sur le compte qui l''a publiée","Attendre que quelqu''un la démente"],"correct":1,"explanation":"Le recoupement de plusieurs sources fiables (médias reconnus, sites officiels) est la base du fact-checking."}]'::jsonb,
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
  'DAILY_SEED_LIFE_SKILLS_11',
  'Ton corps, ta machine',
  'Sommeil, eau, sport, hygiène : les réglages de base pour être au top.',
  'life-skills',
  'easy',
  NULL,
  '[{"question":"Combien d''heures de sommeil par nuit sont recommandées pour un ado de 13 à 17 ans ?","options":["4 à 5 heures","6 heures maximum","8 à 10 heures","12 heures minimum"],"correct":2,"explanation":"Les experts recommandent 8 à 10 heures de sommeil par nuit pour les adolescents, essentielles à la mémoire et à l''humeur."},{"question":"Quelle boisson est la meilleure pour s''hydrater au quotidien ?","options":["L''eau","Les sodas","Les boissons énergisantes","Les jus industriels sucrés"],"correct":0,"explanation":"L''eau hydrate sans sucre ni calories, alors que sodas et boissons énergisantes en contiennent énormément."},{"question":"Combien de temps d''activité physique par jour est recommandé pour les ados ?","options":["5 minutes suffisent","10 minutes par semaine","3 heures obligatoires","Au moins 60 minutes"],"correct":3,"explanation":"L''OMS recommande au moins une heure d''activité physique modérée à intense par jour pour les 5-17 ans."},{"question":"Pourquoi le petit-déjeuner est-il important avant les cours ?","options":["Il fait grandir instantanément","Il donne au cerveau l''énergie nécessaire pour se concentrer","Il remplace le sommeil","Il est interdit de le sauter"],"correct":1,"explanation":"Après une nuit de jeûne, le cerveau a besoin de carburant pour mémoriser et rester concentré en classe."},{"question":"Se laver les mains au savon, c''est surtout utile pour…","options":["Sentir bon uniquement","Rendre les mains plus douces","Éviter de transmettre et d''attraper des microbes","Faire plaisir aux parents"],"correct":2,"explanation":"Le lavage des mains au savon est l''un des gestes les plus efficaces au monde contre les infections."}]'::jsonb,
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
  'DAILY_SEED_LIFE_SKILLS_12',
  'Écrans off, énergie on',
  'Reprends le contrôle de ton temps d''écran sans te priver de tout.',
  'life-skills',
  'easy',
  NULL,
  '[{"question":"Pourquoi éviter les écrans juste avant de dormir ?","options":["La lumière bleue retarde l''endormissement","Les écrans consomment trop d''électricité la nuit","Les applications ne fonctionnent pas le soir","Le wifi est plus lent la nuit"],"correct":0,"explanation":"La lumière bleue des écrans freine la mélatonine, l''hormone qui déclenche naturellement le sommeil."},{"question":"Quelle est une bonne habitude numérique le soir ?","options":["Dormir avec le téléphone sous l''oreiller","Regarder des vidéos jusqu''à 2 heures du matin","Poser le téléphone loin du lit ou en mode avion","Mettre le volume des notifications au maximum"],"correct":2,"explanation":"Éloigner le téléphone évite les notifications qui coupent le sommeil en pleine nuit."},{"question":"Tu passes 4 heures par jour sur les réseaux. Sur une semaine, cela fait…","options":["14 heures","28 heures","20 heures","40 heures"],"correct":1,"explanation":"4 × 7 = 28 heures, soit plus d''une journée entière passée sur les réseaux chaque semaine."},{"question":"Quel est un signe que tu passes peut-être trop de temps sur les écrans ?","options":["Tu dors bien et tu vois tes amis","Tu as de bonnes notes","Tu fais du sport régulièrement","Tu n''arrives plus à t''arrêter et tu délaisses sommeil ou amis"],"correct":3,"explanation":"Quand les écrans grignotent le sommeil, les études ou les amis, c''est le signal qu''il faut réduire."},{"question":"Que peux-tu faire pour réduire ton temps d''écran sans souffrir ?","options":["Tout supprimer d''un coup et t''ennuyer","Remplacer un moment d''écran par une activité que tu aimes (foot, dessin, sortie)","Regarder l''écran d''un ami à la place du tien","Rien, c''est impossible"],"correct":1,"explanation":"Remplacer vaut mieux qu''interdire : une activité plaisante rend la réduction du temps d''écran durable."}]'::jsonb,
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
  'DAILY_SEED_LIFE_SKILLS_13',
  'Santé niveau expert',
  'Sucre caché, caféine, horloge interne : des questions qui piquent pour les vrais connaisseurs.',
  'life-skills',
  'hard',
  NULL,
  '[{"question":"Une canette de soda de 33 cl contient environ 35 g de sucre. Si un morceau de sucre pèse 5 g, cela représente environ…","options":["3 morceaux","5 morceaux","7 morceaux","12 morceaux"],"correct":2,"explanation":"35 ÷ 5 = 7 morceaux de sucre dans une seule canette, d''où l''intérêt de limiter les sodas."},{"question":"Pourquoi les boissons énergisantes sont-elles déconseillées aux ados ?","options":["Leur forte dose de caféine perturbe le sommeil et le cœur","Elles ne contiennent que de l''eau","Elles rendent trop musclé","Elles sont réservées aux sportifs professionnels"],"correct":0,"explanation":"Riches en caféine et en sucre, elles peuvent provoquer palpitations, anxiété et troubles du sommeil chez les jeunes."},{"question":"Qu''est-ce que le « rythme circadien » ?","options":["Un style de musique","Un exercice de respiration","Une danse traditionnelle","L''horloge interne du corps réglée sur environ 24 heures"],"correct":3,"explanation":"Cette horloge biologique règle sommeil, faim et énergie ; la dérégler avec des nuits blanches fatigue tout l''organisme."},{"question":"Pendant un match par forte chaleur à Marrakech, la meilleure stratégie d''hydratation est…","options":["Boire seulement à la fin si tu as soif","Boire de l''eau régulièrement avant, pendant et après l''effort","Boire un soda glacé d''un coup","Ne rien boire pour s''endurcir"],"correct":1,"explanation":"La soif arrive en retard sur la déshydratation : boire régulièrement en petites quantités est plus efficace."},{"question":"Pourquoi le sommeil aide-t-il à mémoriser les cours ?","options":["Parce qu''on rêve des réponses exactes du contrôle","Parce que le cerveau s''éteint complètement la nuit","Parce que le cerveau consolide les souvenirs pendant le sommeil profond","Le sommeil n''a aucun lien avec la mémoire"],"correct":2,"explanation":"Pendant le sommeil, le cerveau rejoue et stocke ce qui a été appris : réviser puis bien dormir bat toujours la nuit blanche."}]'::jsonb,
  10,
  60,
  100,
  'book-open',
  'fr',
  false
)
ON CONFLICT (code) DO NOTHING;


COMMIT;
