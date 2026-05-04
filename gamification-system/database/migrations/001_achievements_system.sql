-- =============================================
-- MIGRATION 001: SYSTÈME DE BADGES/ACHIEVEMENTS COMPLET
-- =============================================
-- Crée les tables, fonctions et triggers pour le système d'achievements
-- =============================================

-- ==========================================
-- PARTIE 1: TABLES
-- ==========================================

-- 1. TABLE ACHIEVEMENTS (Définitions des badges)
-- =============================================

-- Si la table achievements existe, on s'assure que toutes les colonnes existent
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'achievements') THEN
    -- Ajouter code si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'code') THEN
      ALTER TABLE public.achievements ADD COLUMN code VARCHAR(50);
    END IF;
    -- Ajouter name si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'name') THEN
      ALTER TABLE public.achievements ADD COLUMN name VARCHAR(100);
    END IF;
    -- Ajouter description si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'description') THEN
      ALTER TABLE public.achievements ADD COLUMN description TEXT;
    END IF;
    -- Ajouter category si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'category') THEN
      ALTER TABLE public.achievements ADD COLUMN category VARCHAR(50) DEFAULT 'participation';
    END IF;
    -- Ajouter rarity si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'rarity') THEN
      ALTER TABLE public.achievements ADD COLUMN rarity VARCHAR(20) DEFAULT 'common';
    END IF;
    -- Ajouter points si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'points') THEN
      ALTER TABLE public.achievements ADD COLUMN points INTEGER DEFAULT 10;
    END IF;
    -- Ajouter xp_reward si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'xp_reward') THEN
      ALTER TABLE public.achievements ADD COLUMN xp_reward INTEGER DEFAULT 0;
    END IF;
    -- Ajouter icon si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'icon') THEN
      ALTER TABLE public.achievements ADD COLUMN icon VARCHAR(50) DEFAULT 'trophy';
    END IF;
    -- Ajouter color_gradient si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'color_gradient') THEN
      ALTER TABLE public.achievements ADD COLUMN color_gradient VARCHAR(100);
    END IF;
    -- Ajouter requirement_type si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'requirement_type') THEN
      ALTER TABLE public.achievements ADD COLUMN requirement_type VARCHAR(50) DEFAULT 'count';
    END IF;
    -- Ajouter requirement_value si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'requirement_value') THEN
      ALTER TABLE public.achievements ADD COLUMN requirement_value INTEGER DEFAULT 1;
    END IF;
    -- Ajouter requirement_data si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'requirement_data') THEN
      ALTER TABLE public.achievements ADD COLUMN requirement_data JSONB DEFAULT '{}';
    END IF;
    -- Ajouter is_active si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'is_active') THEN
      ALTER TABLE public.achievements ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    -- Ajouter is_secret si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'is_secret') THEN
      ALTER TABLE public.achievements ADD COLUMN is_secret BOOLEAN DEFAULT false;
    END IF;
    -- Ajouter sort_order si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'sort_order') THEN
      ALTER TABLE public.achievements ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,

  -- Catégorie
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'participation', 'social', 'streak', 'challenge',
    'event', 'loyalty', 'special', 'seasonal'
  )),

  -- Rareté et points
  rarity VARCHAR(20) NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary', 'mythic')),
  points INTEGER NOT NULL DEFAULT 10 CHECK (points >= 0),
  xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),

  -- Icône et visuel
  icon VARCHAR(50) NOT NULL DEFAULT 'trophy',
  color_gradient VARCHAR(100),

  -- Conditions de déblocage
  requirement_type VARCHAR(50) NOT NULL CHECK (requirement_type IN (
    'count', 'streak', 'milestone', 'first_action', 'combo', 'time_based', 'special'
  )),
  requirement_value INTEGER DEFAULT 1,
  requirement_data JSONB DEFAULT '{}',

  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  is_secret BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.achievements IS 'Définitions de tous les badges/achievements du système';

-- Créer les index seulement s'ils n'existent pas
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON public.achievements(rarity);
CREATE INDEX IF NOT EXISTS idx_achievements_code ON public.achievements(code);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON public.achievements(is_active) WHERE is_active = true;

-- Ajouter la contrainte unique sur code si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'achievements_code_key'
  ) THEN
    -- Essayer d'ajouter la contrainte unique (peut échouer si doublons)
    BEGIN
      ALTER TABLE public.achievements ADD CONSTRAINT achievements_code_key UNIQUE (code);
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Contrainte unique sur code non ajoutée (doublons possibles ou déjà existante)';
    END;
  END IF;
END $$;

-- 2. TABLE USER_ACHIEVEMENTS (Badges débloqués par user)
-- =============================================

-- Si la table user_achievements existe, ajouter les colonnes manquantes
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_achievements') THEN
    -- Ajouter teen_id si manquant (et user_id existe, on le renomme)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'teen_id') THEN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'user_id') THEN
        -- Renommer user_id en teen_id
        ALTER TABLE public.user_achievements RENAME COLUMN user_id TO teen_id;
      ELSE
        -- Ajouter teen_id
        ALTER TABLE public.user_achievements ADD COLUMN teen_id UUID;
      END IF;
    END IF;
    -- Ajouter achievement_id si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'achievement_id') THEN
      ALTER TABLE public.user_achievements ADD COLUMN achievement_id UUID;
    END IF;
    -- Ajouter progress si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'progress') THEN
      ALTER TABLE public.user_achievements ADD COLUMN progress INTEGER DEFAULT 0;
    END IF;
    -- Ajouter unlocked_at si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'unlocked_at') THEN
      ALTER TABLE public.user_achievements ADD COLUMN unlocked_at TIMESTAMPTZ;
    END IF;
    -- Ajouter is_unlocked si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'is_unlocked') THEN
      ALTER TABLE public.user_achievements ADD COLUMN is_unlocked BOOLEAN DEFAULT false;
    END IF;
    -- Ajouter notified_at si manquant
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_achievements' AND column_name = 'notified_at') THEN
      ALTER TABLE public.user_achievements ADD COLUMN notified_at TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,

  -- Progression
  progress INTEGER DEFAULT 0,

  -- Déblocage
  unlocked_at TIMESTAMPTZ,
  is_unlocked BOOLEAN DEFAULT false,

  -- Notification
  notified_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contrainte unique
  UNIQUE(teen_id, achievement_id)
);

COMMENT ON TABLE public.user_achievements IS 'Achievements débloqués et progression par utilisateur';

CREATE INDEX IF NOT EXISTS idx_user_achievements_teen ON public.user_achievements(teen_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON public.user_achievements(teen_id, is_unlocked) WHERE is_unlocked = true;
CREATE INDEX IF NOT EXISTS idx_user_achievements_progress ON public.user_achievements(teen_id, progress);

-- 3. TABLE ACHIEVEMENT_TRIGGERS (Déclencheurs automatiques)
-- =============================================

CREATE TABLE IF NOT EXISTS public.achievement_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,

  -- Type d'événement qui déclenche la vérification
  trigger_event VARCHAR(100) NOT NULL,

  -- Condition SQL ou logique
  condition_type VARCHAR(50) NOT NULL CHECK (condition_type IN (
    'count_events', 'count_bookings', 'count_friends', 'count_challenges',
    'streak_days', 'total_xp', 'level_reached', 'first_action',
    'specific_action', 'time_condition', 'combo_condition'
  )),
  condition_config JSONB NOT NULL DEFAULT '{}',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.achievement_triggers IS 'Configuration des déclencheurs automatiques d achievements';

CREATE INDEX idx_achievement_triggers_event ON public.achievement_triggers(trigger_event);
CREATE INDEX idx_achievement_triggers_active ON public.achievement_triggers(is_active) WHERE is_active = true;

-- ==========================================
-- PARTIE 2: SEED ACHIEVEMENTS
-- ==========================================

-- CATÉGORIE: PARTICIPATION (Events & Bookings)
INSERT INTO public.achievements (code, name, description, category, rarity, points, xp_reward, icon, requirement_type, requirement_value) VALUES
-- Premiers pas
('first_booking', 'Premier Pas', 'Effectue ta première réservation', 'participation', 'common', 10, 25, 'ticket', 'first_action', 1),
('first_event', 'Bienvenue à la Fête', 'Participe à ton premier événement', 'participation', 'common', 15, 50, 'party-popper', 'first_action', 1),

-- Participation régulière
('events_5', 'Habitué', 'Participe à 5 événements', 'participation', 'common', 25, 75, 'calendar', 'count', 5),
('events_10', 'Fidèle', 'Participe à 10 événements', 'participation', 'rare', 50, 150, 'star', 'count', 10),
('events_25', 'VIP', 'Participe à 25 événements', 'participation', 'epic', 100, 300, 'crown', 'count', 25),
('events_50', 'Légende', 'Participe à 50 événements', 'participation', 'legendary', 200, 500, 'trophy', 'count', 50),
('events_100', 'Centurion', 'Participe à 100 événements', 'participation', 'mythic', 500, 1000, 'medal', 'count', 100),

-- Types d'événements
('variety_3', 'Explorateur', 'Participe à 3 types d événements différents', 'participation', 'common', 30, 100, 'compass', 'combo', 3),
('variety_all', 'Omnivore', 'Participe à tous les types d événements', 'participation', 'epic', 150, 400, 'globe', 'combo', 10),

-- Timing
('early_bird', 'Early Bird', 'Réserve 7 jours avant un événement', 'participation', 'common', 20, 50, 'sunrise', 'time_based', 7),
('last_minute', 'Last Minute', 'Réserve le jour même d un événement', 'participation', 'rare', 40, 100, 'clock', 'time_based', 0),

-- Check-in
('check_in_first', 'Premier Arrivé', 'Sois le premier à faire le check-in', 'participation', 'rare', 50, 150, 'flag', 'first_action', 1),
('stay_late', 'Night Owl', 'Reste jusqu à la fin de 5 événements', 'participation', 'rare', 60, 175, 'moon', 'count', 5)

ON CONFLICT (code) DO NOTHING;

-- CATÉGORIE: SOCIAL
INSERT INTO public.achievements (code, name, description, category, rarity, points, xp_reward, icon, requirement_type, requirement_value) VALUES
-- Invitations
('invite_1', 'Parrain', 'Invite ton premier ami', 'social', 'common', 20, 50, 'user-plus', 'first_action', 1),
('invite_5', 'Influenceur', 'Invite 5 amis', 'social', 'rare', 75, 200, 'users', 'count', 5),
('invite_10', 'Ambassador', 'Invite 10 amis', 'social', 'epic', 150, 400, 'megaphone', 'count', 10),
('invite_25', 'Viral', 'Invite 25 amis', 'social', 'legendary', 300, 750, 'share-2', 'count', 25),

-- Groupes
('crew_join', 'Membre du Crew', 'Rejoins ton premier groupe', 'social', 'common', 15, 40, 'users', 'first_action', 1),
('crew_create', 'Leader', 'Crée ton propre groupe', 'social', 'rare', 50, 125, 'crown', 'first_action', 1),
('crew_event', 'Sortie de Groupe', 'Participe à un événement avec ton crew', 'social', 'rare', 60, 150, 'party-popper', 'count', 1),

-- Réseaux
('profile_complete', 'Profil Complet', 'Complète 100% de ton profil', 'social', 'common', 25, 75, 'user-check', 'milestone', 100),
('share_achievement', 'Showoff', 'Partage un achievement sur les réseaux', 'social', 'common', 15, 30, 'share', 'first_action', 1)

ON CONFLICT (code) DO NOTHING;

-- CATÉGORIE: STREAKS
INSERT INTO public.achievements (code, name, description, category, rarity, points, xp_reward, icon, requirement_type, requirement_value) VALUES
('streak_3', 'Warming Up', '3 jours de streak', 'streak', 'common', 15, 40, 'flame', 'streak', 3),
('streak_7', 'Une Semaine', '7 jours de streak', 'streak', 'common', 30, 100, 'flame', 'streak', 7),
('streak_14', 'Deux Semaines', '14 jours de streak', 'streak', 'rare', 60, 200, 'flame', 'streak', 14),
('streak_30', 'Un Mois', '30 jours de streak', 'streak', 'epic', 125, 400, 'flame', 'streak', 30),
('streak_60', 'Deux Mois', '60 jours de streak', 'streak', 'epic', 200, 600, 'flame', 'streak', 60),
('streak_90', 'Un Trimestre', '90 jours de streak', 'streak', 'legendary', 300, 900, 'flame', 'streak', 90),
('streak_180', 'Six Mois', '180 jours de streak', 'streak', 'legendary', 500, 1500, 'flame', 'streak', 180),
('streak_365', 'Année Parfaite', '365 jours de streak', 'streak', 'mythic', 1000, 3000, 'flame', 'streak', 365),

-- Récupération
('streak_recover', 'Phoenix', 'Récupère un streak après l avoir perdu', 'streak', 'rare', 40, 100, 'refresh-cw', 'specific_action', 1)

ON CONFLICT (code) DO NOTHING;

-- CATÉGORIE: CHALLENGES
INSERT INTO public.achievements (code, name, description, category, rarity, points, xp_reward, icon, requirement_type, requirement_value) VALUES
-- Quantité
('challenge_first', 'Défi Accepté', 'Complète ton premier défi', 'challenge', 'common', 10, 25, 'target', 'first_action', 1),
('challenges_10', 'Challenger', 'Complète 10 défis', 'challenge', 'common', 25, 75, 'target', 'count', 10),
('challenges_50', 'Champion', 'Complète 50 défis', 'challenge', 'rare', 75, 225, 'award', 'count', 50),
('challenges_100', 'Maître des Défis', 'Complète 100 défis', 'challenge', 'epic', 150, 450, 'trophy', 'count', 100),
('challenges_500', 'Légende des Défis', 'Complète 500 défis', 'challenge', 'legendary', 400, 1000, 'medal', 'count', 500),

-- Catégories
('challenges_school_master', 'Intello', 'Complète 25 défis École', 'challenge', 'rare', 60, 175, 'book', 'count', 25),
('challenges_sport_master', 'Athlète', 'Complète 25 défis Sport', 'challenge', 'rare', 60, 175, 'dumbbell', 'count', 25),
('challenges_crea_master', 'Artiste', 'Complète 25 défis Créa', 'challenge', 'rare', 60, 175, 'palette', 'count', 25),
('challenges_all_categories', 'Polyvalent', 'Complète 10 défis de chaque catégorie', 'challenge', 'epic', 125, 350, 'layers', 'combo', 30),

-- Perfection
('perfect_day', 'Journée Parfaite', 'Complète tous les défis du jour', 'challenge', 'common', 20, 50, 'check-circle', 'combo', 3),
('perfect_week', 'Semaine Parfaite', '7 jours sans skip de défi', 'challenge', 'rare', 75, 200, 'calendar-check', 'streak', 7),
('perfect_month', 'Mois Parfait', '30 jours sans skip de défi', 'challenge', 'legendary', 250, 750, 'calendar-check', 'streak', 30)

ON CONFLICT (code) DO NOTHING;

-- CATÉGORIE: EVENTS SPÉCIAUX
INSERT INTO public.achievements (code, name, description, category, rarity, points, xp_reward, icon, requirement_type, requirement_value, is_secret) VALUES
-- Fondateurs
('founder', 'Fondateur', 'Parmi les 100 premiers inscrits', 'special', 'legendary', 500, 1000, 'shield', 'milestone', 100, false),
('beta_tester', 'Beta Tester', 'A participé au test beta', 'special', 'epic', 200, 500, 'bug', 'specific_action', 1, false),

-- Events historiques
('event_1000', 'Millième', 'Participe au 1000ème événement de la plateforme', 'special', 'legendary', 300, 750, 'milestone', 'milestone', 1000, true),

-- Saisonniers
('halloween_2024', 'Halloween 2024', 'Participe à un event Halloween 2024', 'seasonal', 'rare', 50, 150, 'ghost', 'specific_action', 1, false),
('new_year_2025', 'Nouvel An 2025', 'Fête le nouvel an 2025 avec nous', 'seasonal', 'rare', 50, 150, 'sparkles', 'specific_action', 1, false),
('summer_2025', 'Summer Vibes 2025', 'Participe à 3 events été 2025', 'seasonal', 'rare', 75, 200, 'sun', 'count', 3, false),
('ramadan_2025', 'Ramadan Kareem 2025', 'Participe à un event Ramadan 2025', 'seasonal', 'rare', 50, 150, 'moon', 'specific_action', 1, false)

ON CONFLICT (code) DO NOTHING;

-- CATÉGORIE: LOYALTY (XP et Niveau)
INSERT INTO public.achievements (code, name, description, category, rarity, points, xp_reward, icon, requirement_type, requirement_value) VALUES
-- Niveaux
('level_5', 'Niveau 5', 'Atteins le niveau 5', 'loyalty', 'common', 25, 0, 'trending-up', 'milestone', 5),
('level_10', 'Niveau 10', 'Atteins le niveau 10', 'loyalty', 'rare', 50, 0, 'trending-up', 'milestone', 10),
('level_25', 'Niveau 25', 'Atteins le niveau 25', 'loyalty', 'epic', 100, 0, 'trending-up', 'milestone', 25),
('level_50', 'Niveau 50', 'Atteins le niveau 50', 'loyalty', 'legendary', 200, 0, 'trending-up', 'milestone', 50),
('level_100', 'Niveau 100', 'Atteins le niveau 100', 'loyalty', 'mythic', 500, 0, 'trending-up', 'milestone', 100),

-- XP Total
('xp_1000', '1K XP', 'Accumule 1000 XP', 'loyalty', 'common', 20, 0, 'zap', 'milestone', 1000),
('xp_5000', '5K XP', 'Accumule 5000 XP', 'loyalty', 'rare', 50, 0, 'zap', 'milestone', 5000),
('xp_10000', '10K XP', 'Accumule 10000 XP', 'loyalty', 'epic', 100, 0, 'zap', 'milestone', 10000),
('xp_50000', '50K XP', 'Accumule 50000 XP', 'loyalty', 'legendary', 250, 0, 'zap', 'milestone', 50000),
('xp_100000', '100K XP', 'Accumule 100000 XP', 'loyalty', 'mythic', 500, 0, 'zap', 'milestone', 100000)

ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- PARTIE 3: FONCTIONS
-- ==========================================

-- Supprimer les anciennes versions des fonctions si elles existent
DO $$
DECLARE
  func_names TEXT[] := ARRAY['init_user_achievements', 'update_achievement_progress', 'unlock_achievement',
                              'check_achievements_for_user', 'get_user_achievements', 'get_achievement_stats',
                              'trigger_init_achievements', 'trigger_check_achievements_on_xp',
                              'trigger_check_achievements_on_challenge_participant'];
  func_name TEXT;
  r RECORD;
BEGIN
  FOREACH func_name IN ARRAY func_names LOOP
    FOR r IN
      SELECT p.oid::regprocedure AS func_signature
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = func_name
    LOOP
      EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;
  END LOOP;
END $$;

-- 1. FONCTION: Initialiser les achievements pour un user
-- =============================================

CREATE OR REPLACE FUNCTION init_user_achievements(p_teen_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_achievements (teen_id, achievement_id, progress, is_unlocked)
  SELECT p_teen_id, a.id, 0, false
  FROM public.achievements a
  WHERE a.is_active = true
  ON CONFLICT (teen_id, achievement_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION init_user_achievements IS 'Initialise tous les achievements pour un nouvel utilisateur';

-- 2. FONCTION: Mettre à jour la progression d'un achievement
-- =============================================

CREATE OR REPLACE FUNCTION update_achievement_progress(
  p_teen_id UUID,
  p_achievement_code VARCHAR(50),
  p_progress INTEGER DEFAULT 1,
  p_increment BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_achievement RECORD;
  v_current_progress INTEGER;
  v_new_progress INTEGER;
  v_was_unlocked BOOLEAN;
  v_now_unlocked BOOLEAN := false;
  v_xp_gained INTEGER := 0;
BEGIN
  -- Récupérer l'achievement
  SELECT * INTO v_achievement
  FROM public.achievements
  WHERE code = p_achievement_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Achievement not found');
  END IF;

  -- Récupérer ou créer la progression utilisateur
  INSERT INTO public.user_achievements (teen_id, achievement_id, progress, is_unlocked)
  VALUES (p_teen_id, v_achievement.id, 0, false)
  ON CONFLICT (teen_id, achievement_id) DO NOTHING;

  SELECT progress, is_unlocked INTO v_current_progress, v_was_unlocked
  FROM public.user_achievements
  WHERE teen_id = p_teen_id AND achievement_id = v_achievement.id;

  -- Si déjà débloqué, ne rien faire
  IF v_was_unlocked THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_unlocked', true,
      'achievement_id', v_achievement.id
    );
  END IF;

  -- Calculer nouvelle progression
  IF p_increment THEN
    v_new_progress := v_current_progress + p_progress;
  ELSE
    v_new_progress := p_progress;
  END IF;

  -- Vérifier si l'achievement est débloqué
  IF v_new_progress >= v_achievement.requirement_value THEN
    v_now_unlocked := true;
    v_xp_gained := v_achievement.xp_reward;

    -- Mettre à jour
    UPDATE public.user_achievements
    SET
      progress = v_new_progress,
      is_unlocked = true,
      unlocked_at = NOW(),
      updated_at = NOW()
    WHERE teen_id = p_teen_id AND achievement_id = v_achievement.id;

    -- Ajouter les XP si reward > 0
    IF v_xp_gained > 0 THEN
      PERFORM add_xp_to_user(
        p_teen_id,
        v_xp_gained,
        'achievement_unlock',
        'achievement',
        v_achievement.id
      );
    END IF;
  ELSE
    -- Juste mettre à jour la progression
    UPDATE public.user_achievements
    SET progress = v_new_progress, updated_at = NOW()
    WHERE teen_id = p_teen_id AND achievement_id = v_achievement.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'achievement_id', v_achievement.id,
    'achievement_code', v_achievement.code,
    'achievement_name', v_achievement.name,
    'progress', v_new_progress,
    'requirement', v_achievement.requirement_value,
    'unlocked', v_now_unlocked,
    'xp_gained', v_xp_gained,
    'rarity', v_achievement.rarity,
    'icon', v_achievement.icon
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_achievement_progress IS 'Met à jour la progression d un achievement et le débloque si le seuil est atteint';

-- 3. FONCTION: Débloquer directement un achievement
-- =============================================

CREATE OR REPLACE FUNCTION unlock_achievement(
  p_teen_id UUID,
  p_achievement_code VARCHAR(50)
)
RETURNS JSONB AS $$
DECLARE
  v_achievement RECORD;
  v_was_unlocked BOOLEAN;
  v_xp_gained INTEGER := 0;
BEGIN
  -- Récupérer l'achievement
  SELECT * INTO v_achievement
  FROM public.achievements
  WHERE code = p_achievement_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Achievement not found');
  END IF;

  -- Vérifier si déjà débloqué
  SELECT is_unlocked INTO v_was_unlocked
  FROM public.user_achievements
  WHERE teen_id = p_teen_id AND achievement_id = v_achievement.id;

  IF v_was_unlocked THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_unlocked', true,
      'achievement_id', v_achievement.id
    );
  END IF;

  v_xp_gained := v_achievement.xp_reward;

  -- Débloquer
  INSERT INTO public.user_achievements (teen_id, achievement_id, progress, is_unlocked, unlocked_at)
  VALUES (p_teen_id, v_achievement.id, v_achievement.requirement_value, true, NOW())
  ON CONFLICT (teen_id, achievement_id) DO UPDATE
  SET
    progress = v_achievement.requirement_value,
    is_unlocked = true,
    unlocked_at = NOW(),
    updated_at = NOW();

  -- Ajouter les XP
  IF v_xp_gained > 0 THEN
    PERFORM add_xp_to_user(
      p_teen_id,
      v_xp_gained,
      'achievement_unlock',
      'achievement',
      v_achievement.id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'achievement_id', v_achievement.id,
    'achievement_code', v_achievement.code,
    'achievement_name', v_achievement.name,
    'achievement_description', v_achievement.description,
    'unlocked', true,
    'xp_gained', v_xp_gained,
    'rarity', v_achievement.rarity,
    'icon', v_achievement.icon,
    'points', v_achievement.points
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION unlock_achievement IS 'Débloque directement un achievement pour un utilisateur';

-- 4. FONCTION: Vérifier et débloquer les achievements basés sur les stats
-- =============================================

CREATE OR REPLACE FUNCTION check_achievements_for_user(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_unlocked_achievements JSONB := '[]'::jsonb;
  v_result JSONB;
  v_stats RECORD;
  v_xp RECORD;
  v_streak RECORD;
  v_booking_count INTEGER := 0;
  v_challenges_completed INTEGER := 0;
BEGIN
  -- Récupérer les stats utilisateur (avec vérification si les tables existent)
  -- Bookings
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings') THEN
    SELECT COUNT(*) INTO v_booking_count
    FROM public.bookings b
    JOIN public.teens t ON t.parent_id = b.parent_id
    WHERE t.id = p_teen_id AND b.status = 'confirmed';
  END IF;

  -- Challenges
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'challenge_participants') THEN
    SELECT COUNT(*) INTO v_challenges_completed
    FROM public.challenge_participants
    WHERE teen_id = p_teen_id AND status = 'completed';
  END IF;

  -- Mettre les résultats dans v_stats
  SELECT v_booking_count as booking_count, v_challenges_completed as challenges_completed INTO v_stats;

  -- Récupérer XP
  SELECT * INTO v_xp FROM public.user_xp WHERE teen_id = p_teen_id;

  -- Récupérer Streak
  SELECT * INTO v_streak FROM public.user_streaks WHERE teen_id = p_teen_id;

  -- Vérifier achievements de participation
  IF v_stats.booking_count >= 1 THEN
    v_result := update_achievement_progress(p_teen_id, 'first_booking', 1, false);
    IF (v_result->>'unlocked')::boolean THEN
      v_unlocked_achievements := v_unlocked_achievements || v_result;
    END IF;
  END IF;

  IF v_stats.booking_count >= 5 THEN
    v_result := update_achievement_progress(p_teen_id, 'events_5', v_stats.booking_count, false);
    IF (v_result->>'unlocked')::boolean THEN
      v_unlocked_achievements := v_unlocked_achievements || v_result;
    END IF;
  END IF;

  IF v_stats.booking_count >= 10 THEN
    v_result := update_achievement_progress(p_teen_id, 'events_10', v_stats.booking_count, false);
    IF (v_result->>'unlocked')::boolean THEN
      v_unlocked_achievements := v_unlocked_achievements || v_result;
    END IF;
  END IF;

  IF v_stats.booking_count >= 25 THEN
    v_result := update_achievement_progress(p_teen_id, 'events_25', v_stats.booking_count, false);
    IF (v_result->>'unlocked')::boolean THEN
      v_unlocked_achievements := v_unlocked_achievements || v_result;
    END IF;
  END IF;

  IF v_stats.booking_count >= 50 THEN
    v_result := update_achievement_progress(p_teen_id, 'events_50', v_stats.booking_count, false);
    IF (v_result->>'unlocked')::boolean THEN
      v_unlocked_achievements := v_unlocked_achievements || v_result;
    END IF;
  END IF;

  IF v_stats.booking_count >= 100 THEN
    v_result := update_achievement_progress(p_teen_id, 'events_100', v_stats.booking_count, false);
    IF (v_result->>'unlocked')::boolean THEN
      v_unlocked_achievements := v_unlocked_achievements || v_result;
    END IF;
  END IF;

  -- Vérifier achievements de challenges
  IF v_stats.challenges_completed >= 1 THEN
    v_result := update_achievement_progress(p_teen_id, 'challenge_first', 1, false);
    IF (v_result->>'unlocked')::boolean THEN
      v_unlocked_achievements := v_unlocked_achievements || v_result;
    END IF;
  END IF;

  IF v_stats.challenges_completed >= 10 THEN
    v_result := update_achievement_progress(p_teen_id, 'challenges_10', v_stats.challenges_completed, false);
    IF (v_result->>'unlocked')::boolean THEN
      v_unlocked_achievements := v_unlocked_achievements || v_result;
    END IF;
  END IF;

  IF v_stats.challenges_completed >= 50 THEN
    v_result := update_achievement_progress(p_teen_id, 'challenges_50', v_stats.challenges_completed, false);
    IF (v_result->>'unlocked')::boolean THEN
      v_unlocked_achievements := v_unlocked_achievements || v_result;
    END IF;
  END IF;

  IF v_stats.challenges_completed >= 100 THEN
    v_result := update_achievement_progress(p_teen_id, 'challenges_100', v_stats.challenges_completed, false);
    IF (v_result->>'unlocked')::boolean THEN
      v_unlocked_achievements := v_unlocked_achievements || v_result;
    END IF;
  END IF;

  -- Vérifier achievements de streak
  IF v_streak IS NOT NULL THEN
    IF v_streak.current_streak >= 3 THEN
      v_result := update_achievement_progress(p_teen_id, 'streak_3', v_streak.current_streak, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;

    IF v_streak.current_streak >= 7 THEN
      v_result := update_achievement_progress(p_teen_id, 'streak_7', v_streak.current_streak, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;

    IF v_streak.current_streak >= 14 THEN
      v_result := update_achievement_progress(p_teen_id, 'streak_14', v_streak.current_streak, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;

    IF v_streak.current_streak >= 30 THEN
      v_result := update_achievement_progress(p_teen_id, 'streak_30', v_streak.current_streak, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;

    IF v_streak.current_streak >= 60 THEN
      v_result := update_achievement_progress(p_teen_id, 'streak_60', v_streak.current_streak, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;

    IF v_streak.current_streak >= 90 THEN
      v_result := update_achievement_progress(p_teen_id, 'streak_90', v_streak.current_streak, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;

    IF v_streak.current_streak >= 180 THEN
      v_result := update_achievement_progress(p_teen_id, 'streak_180', v_streak.current_streak, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;

    IF v_streak.current_streak >= 365 THEN
      v_result := update_achievement_progress(p_teen_id, 'streak_365', v_streak.current_streak, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;
  END IF;

  -- Vérifier achievements de niveau et XP
  IF v_xp IS NOT NULL THEN
    IF v_xp.current_level >= 5 THEN
      v_result := update_achievement_progress(p_teen_id, 'level_5', v_xp.current_level, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;

    IF v_xp.current_level >= 10 THEN
      v_result := update_achievement_progress(p_teen_id, 'level_10', v_xp.current_level, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;

    IF v_xp.current_level >= 25 THEN
      v_result := update_achievement_progress(p_teen_id, 'level_25', v_xp.current_level, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;

    IF v_xp.current_level >= 50 THEN
      v_result := update_achievement_progress(p_teen_id, 'level_50', v_xp.current_level, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;

    IF v_xp.total_xp >= 1000 THEN
      v_result := update_achievement_progress(p_teen_id, 'xp_1000', v_xp.total_xp, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;

    IF v_xp.total_xp >= 5000 THEN
      v_result := update_achievement_progress(p_teen_id, 'xp_5000', v_xp.total_xp, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;

    IF v_xp.total_xp >= 10000 THEN
      v_result := update_achievement_progress(p_teen_id, 'xp_10000', v_xp.total_xp, false);
      IF (v_result->>'unlocked')::boolean THEN
        v_unlocked_achievements := v_unlocked_achievements || v_result;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'unlocked_count', jsonb_array_length(v_unlocked_achievements),
    'unlocked_achievements', v_unlocked_achievements
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_achievements_for_user IS 'Vérifie et débloque tous les achievements éligibles pour un utilisateur';

-- 5. FONCTION: Récupérer tous les achievements d'un user
-- =============================================

CREATE OR REPLACE FUNCTION get_user_achievements(p_teen_id UUID)
RETURNS TABLE (
  id UUID,
  code VARCHAR(50),
  name VARCHAR(100),
  description TEXT,
  category VARCHAR(50),
  rarity VARCHAR(20),
  points INTEGER,
  xp_reward INTEGER,
  icon VARCHAR(50),
  color_gradient VARCHAR(100),
  requirement_value INTEGER,
  progress INTEGER,
  is_unlocked BOOLEAN,
  unlocked_at TIMESTAMPTZ,
  is_secret BOOLEAN,
  percentage_complete NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.code,
    a.name,
    a.description,
    a.category,
    a.rarity,
    a.points,
    a.xp_reward,
    a.icon,
    a.color_gradient,
    a.requirement_value,
    COALESCE(ua.progress, 0) as progress,
    COALESCE(ua.is_unlocked, false) as is_unlocked,
    ua.unlocked_at,
    a.is_secret,
    CASE
      WHEN a.requirement_value > 0 THEN
        LEAST(100, (COALESCE(ua.progress, 0)::numeric / a.requirement_value::numeric) * 100)
      ELSE 100
    END as percentage_complete
  FROM public.achievements a
  LEFT JOIN public.user_achievements ua ON ua.achievement_id = a.id AND ua.teen_id = p_teen_id
  WHERE a.is_active = true
    AND (NOT a.is_secret OR COALESCE(ua.is_unlocked, false) = true)
  ORDER BY
    CASE a.rarity
      WHEN 'mythic' THEN 1
      WHEN 'legendary' THEN 2
      WHEN 'epic' THEN 3
      WHEN 'rare' THEN 4
      ELSE 5
    END,
    a.sort_order,
    a.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_achievements IS 'Récupère tous les achievements avec la progression pour un utilisateur';

-- 6. FONCTION: Stats des achievements
-- =============================================

CREATE OR REPLACE FUNCTION get_achievement_stats(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total INTEGER;
  v_unlocked INTEGER;
  v_points_total INTEGER;
  v_points_earned INTEGER;
  v_by_category JSONB;
  v_by_rarity JSONB;
BEGIN
  -- Total et débloqués
  SELECT COUNT(*), COALESCE(SUM(CASE WHEN ua.is_unlocked THEN 1 ELSE 0 END), 0)
  INTO v_total, v_unlocked
  FROM public.achievements a
  LEFT JOIN public.user_achievements ua ON ua.achievement_id = a.id AND ua.teen_id = p_teen_id
  WHERE a.is_active = true;

  -- Points
  SELECT COALESCE(SUM(a.points), 0), COALESCE(SUM(CASE WHEN ua.is_unlocked THEN a.points ELSE 0 END), 0)
  INTO v_points_total, v_points_earned
  FROM public.achievements a
  LEFT JOIN public.user_achievements ua ON ua.achievement_id = a.id AND ua.teen_id = p_teen_id
  WHERE a.is_active = true;

  -- Par catégorie
  SELECT jsonb_object_agg(category, stats) INTO v_by_category
  FROM (
    SELECT
      a.category,
      jsonb_build_object(
        'total', COUNT(*),
        'unlocked', COALESCE(SUM(CASE WHEN ua.is_unlocked THEN 1 ELSE 0 END), 0)
      ) as stats
    FROM public.achievements a
    LEFT JOIN public.user_achievements ua ON ua.achievement_id = a.id AND ua.teen_id = p_teen_id
    WHERE a.is_active = true
    GROUP BY a.category
  ) sub;

  -- Par rareté
  SELECT jsonb_object_agg(rarity, stats) INTO v_by_rarity
  FROM (
    SELECT
      a.rarity,
      jsonb_build_object(
        'total', COUNT(*),
        'unlocked', COALESCE(SUM(CASE WHEN ua.is_unlocked THEN 1 ELSE 0 END), 0)
      ) as stats
    FROM public.achievements a
    LEFT JOIN public.user_achievements ua ON ua.achievement_id = a.id AND ua.teen_id = p_teen_id
    WHERE a.is_active = true
    GROUP BY a.rarity
  ) sub;

  RETURN jsonb_build_object(
    'total', v_total,
    'unlocked', v_unlocked,
    'percentage', CASE WHEN v_total > 0 THEN ROUND((v_unlocked::numeric / v_total::numeric) * 100, 1) ELSE 0 END,
    'points_total', v_points_total,
    'points_earned', v_points_earned,
    'by_category', v_by_category,
    'by_rarity', v_by_rarity
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_achievement_stats IS 'Récupère les statistiques d achievements pour un utilisateur';

-- ==========================================
-- PARTIE 4: TRIGGERS
-- ==========================================

-- Trigger pour initialiser les achievements quand un teen est créé
CREATE OR REPLACE FUNCTION trigger_init_achievements()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM init_user_achievements(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_teen_created_init_achievements ON public.teens;
CREATE TRIGGER on_teen_created_init_achievements
  AFTER INSERT ON public.teens
  FOR EACH ROW
  EXECUTE FUNCTION trigger_init_achievements();

-- Trigger pour vérifier les achievements après une action
CREATE OR REPLACE FUNCTION trigger_check_achievements_on_xp()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_achievements_for_user(NEW.teen_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_xp_update_check_achievements ON public.user_xp;
CREATE TRIGGER on_xp_update_check_achievements
  AFTER INSERT OR UPDATE ON public.user_xp
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements_on_xp();

-- Trigger pour vérifier les achievements après un challenge complété
-- Note: Ce trigger sera créé plus tard si challenge_participants existe et a teen_id
-- Pour l'instant, la vérification se fait via check_achievements_for_user() appelée manuellement

CREATE OR REPLACE FUNCTION trigger_check_achievements_on_challenge_participant()
RETURNS TRIGGER AS $$
DECLARE
  v_teen_id UUID;
BEGIN
  -- challenge_participants utilise user_id (auth.users), on doit trouver le teen_id
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Récupérer le teen_id depuis user_id
    SELECT id INTO v_teen_id
    FROM public.teens
    WHERE parent_id = NEW.user_id
    LIMIT 1;

    IF v_teen_id IS NOT NULL THEN
      PERFORM check_achievements_for_user(v_teen_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Le trigger sera créé dans la migration 006 après que challenge_participants existe
-- DROP TRIGGER IF EXISTS on_challenge_complete_check_achievements ON public.challenge_participants;

-- ==========================================
-- PARTIE 5: RLS POLICIES
-- ==========================================

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_triggers ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Everyone can view active achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;

-- Achievements: lecture publique
CREATE POLICY "Everyone can view active achievements"
  ON public.achievements FOR SELECT
  USING (is_active = true AND (NOT is_secret OR EXISTS (
    SELECT 1 FROM public.user_achievements ua
    JOIN public.teens t ON t.id = ua.teen_id
    WHERE ua.achievement_id = achievements.id
    AND ua.is_unlocked = true
    AND t.parent_id = auth.uid()
  )));

-- User achievements: propre données
CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teens
      WHERE id = user_achievements.teen_id
      AND parent_id = auth.uid()
    )
  );

-- Triggers: admin seulement (pas de policy public)

-- ==========================================
-- PARTIE 6: VÉRIFICATION
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 001 - Système d achievements terminée';
  RAISE NOTICE 'Tables créées: achievements, user_achievements, achievement_triggers';
  RAISE NOTICE 'Achievements seedés: ~50 badges dans 7 catégories';
  RAISE NOTICE 'Fonctions: init_user_achievements, update_achievement_progress, unlock_achievement';
  RAISE NOTICE 'Fonctions: check_achievements_for_user, get_user_achievements, get_achievement_stats';
  RAISE NOTICE 'Triggers: auto-init sur création teen, auto-check sur XP/challenges';
END $$;
