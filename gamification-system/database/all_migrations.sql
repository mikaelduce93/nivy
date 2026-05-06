-- ============================================================================
-- NIVY - All gamification migrations concatenated for fresh Supabase install
-- Generated: 2026-05-06T05:26:45Z
-- Apply once on a fresh project (Supabase SQL Editor: paste + Run).
-- ============================================================================


-- ============================================================================
-- 000_base_tables.sql
-- ============================================================================
-- =============================================
-- MIGRATION 000: TABLES DE BASE POUR LA GAMIFICATION
-- =============================================
-- Doit être exécutée EN PREMIER avant toutes les autres migrations
-- Crée les tables et fonctions de base nécessaires
-- =============================================

-- ==========================================
-- PARTIE 1: EXTENSIONS
-- ==========================================

-- Extension pour les UUIDs (utiliser gen_random_uuid() natif PG 13+)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- PARTIE 2: TABLE TEENS (vérification et ajout colonnes manquantes)
-- ==========================================

-- La table teens existe probablement déjà dans l'application principale
-- On s'assure juste que les colonnes nécessaires pour la gamification existent
DO $$
BEGIN
  -- Si la table teens n'existe pas, la créer
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teens') THEN
    CREATE TABLE public.teens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      pseudo VARCHAR(50),
      avatar_url TEXT,
      date_of_birth DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_teens_parent ON public.teens(parent_id);

    ALTER TABLE public.teens ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view all teens"
      ON public.teens FOR SELECT
      USING (true);

    CREATE POLICY "Users can manage own teens"
      ON public.teens FOR ALL
      USING (parent_id = auth.uid());
  END IF;

  -- Ajouter pseudo si n'existe pas (pour compatibilité)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teens' AND column_name = 'pseudo') THEN
    ALTER TABLE public.teens ADD COLUMN pseudo VARCHAR(50);
  END IF;

  -- Ajouter avatar_url si n'existe pas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'teens' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.teens ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- ==========================================
-- PARTIE 3: TABLE USER_XP (Progression XP)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL UNIQUE,

  -- XP et Niveau
  total_xp INTEGER DEFAULT 0 CHECK (total_xp >= 0),
  current_level INTEGER DEFAULT 1 CHECK (current_level >= 1),
  xp_to_next_level INTEGER DEFAULT 100,

  -- Multiplicateurs
  xp_multiplier DECIMAL(3,2) DEFAULT 1.00,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter les colonnes si elles n'existent pas (cas de table existante)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'current_level') THEN
    ALTER TABLE public.user_xp ADD COLUMN current_level INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'xp_to_next_level') THEN
    ALTER TABLE public.user_xp ADD COLUMN xp_to_next_level INTEGER DEFAULT 100;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'xp_multiplier') THEN
    ALTER TABLE public.user_xp ADD COLUMN xp_multiplier DECIMAL(3,2) DEFAULT 1.00;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'total_xp') THEN
    ALTER TABLE public.user_xp ADD COLUMN total_xp INTEGER DEFAULT 0;
  END IF;
END $$;

-- Index
CREATE INDEX IF NOT EXISTS idx_user_xp_teen ON public.user_xp(teen_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_level ON public.user_xp(current_level DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_total ON public.user_xp(total_xp DESC);

-- Ajouter la foreign key si la table teens existe
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teens') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'user_xp_teen_id_fkey'
    ) THEN
      ALTER TABLE public.user_xp
        ADD CONSTRAINT user_xp_teen_id_fkey
        FOREIGN KEY (teen_id) REFERENCES public.teens(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ==========================================
-- PARTIE 4: TABLE USER_STREAKS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL UNIQUE,

  -- Streak actuel
  current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0),

  -- Dates
  last_activity_date DATE,
  streak_started_at DATE,

  -- Protection streak (items consommables)
  streak_freezes INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter les colonnes si elles n'existent pas (cas de table existante)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_streaks' AND column_name = 'current_streak') THEN
    ALTER TABLE public.user_streaks ADD COLUMN current_streak INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_streaks' AND column_name = 'longest_streak') THEN
    ALTER TABLE public.user_streaks ADD COLUMN longest_streak INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_streaks' AND column_name = 'last_activity_date') THEN
    ALTER TABLE public.user_streaks ADD COLUMN last_activity_date DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_streaks' AND column_name = 'streak_started_at') THEN
    ALTER TABLE public.user_streaks ADD COLUMN streak_started_at DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_streaks' AND column_name = 'streak_freezes') THEN
    ALTER TABLE public.user_streaks ADD COLUMN streak_freezes INTEGER DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_streaks_teen ON public.user_streaks(teen_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_current ON public.user_streaks(current_streak DESC);

-- ==========================================
-- PARTIE 5: TABLE USER_COINS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL UNIQUE,

  -- Solde
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER DEFAULT 0,
  lifetime_spent INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_coins_teen ON public.user_coins(teen_id);

-- ==========================================
-- PARTIE 6: TABLE XP_TRANSACTIONS (Historique)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL,

  -- Transaction
  amount INTEGER NOT NULL,
  source_type VARCHAR(50) NOT NULL, -- 'achievement', 'mission', 'challenge', 'event', 'game', etc.
  source_id UUID,
  description TEXT,

  -- Métadonnées
  multiplier_applied DECIMAL(3,2) DEFAULT 1.00,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_teen ON public.xp_transactions(teen_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_date ON public.xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_source ON public.xp_transactions(source_type);

-- ==========================================
-- PARTIE 7: TABLE COIN_TRANSACTIONS (Historique)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL,

  -- Transaction
  amount INTEGER NOT NULL, -- positif = gain, négatif = dépense
  transaction_type VARCHAR(50) NOT NULL, -- 'earn', 'spend', 'bonus', 'refund'
  source_type VARCHAR(50) NOT NULL, -- 'shop', 'mission', 'wheel', 'challenge', etc.
  source_id UUID,
  description TEXT,

  -- Balance après transaction
  balance_after INTEGER NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_teen ON public.coin_transactions(teen_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_date ON public.coin_transactions(created_at DESC);

-- ==========================================
-- PARTIE 8: TABLE USER_PROGRESSION (Vue consolidée)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_progression (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,

  -- XP et Niveau
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,

  -- Coins
  coins INTEGER DEFAULT 0,

  -- Stats
  events_attended INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  achievements_unlocked INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ajouter les colonnes si elles n'existent pas (cas de table existante)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progression' AND column_name = 'current_level') THEN
    ALTER TABLE public.user_progression ADD COLUMN current_level INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progression' AND column_name = 'total_xp') THEN
    ALTER TABLE public.user_progression ADD COLUMN total_xp INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progression' AND column_name = 'coins') THEN
    ALTER TABLE public.user_progression ADD COLUMN coins INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progression' AND column_name = 'events_attended') THEN
    ALTER TABLE public.user_progression ADD COLUMN events_attended INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progression' AND column_name = 'challenges_completed') THEN
    ALTER TABLE public.user_progression ADD COLUMN challenges_completed INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progression' AND column_name = 'achievements_unlocked') THEN
    ALTER TABLE public.user_progression ADD COLUMN achievements_unlocked INTEGER DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_progression_user ON public.user_progression(user_id);

-- ==========================================
-- PARTIE 9: FONCTION ADD_XP_TO_USER
-- ==========================================

-- Supprimer TOUTES les versions de la fonction (toutes signatures possibles)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'add_xp_to_user'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION add_xp_to_user(
  p_teen_id UUID,
  p_xp_amount INTEGER,
  p_source_type VARCHAR(50),
  p_source_category VARCHAR(50) DEFAULT NULL,
  p_source_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_xp INTEGER;
  v_current_level INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_xp_multiplier DECIMAL(3,2);
  v_final_xp INTEGER;
  v_xp_for_level INTEGER;
  v_leveled_up BOOLEAN := false;
  v_levels_gained INTEGER := 0;
BEGIN
  -- Récupérer ou créer l'entrée XP
  INSERT INTO public.user_xp (teen_id, total_xp, current_level)
  VALUES (p_teen_id, 0, 1)
  ON CONFLICT (teen_id) DO NOTHING;

  -- Récupérer les valeurs actuelles
  SELECT total_xp, current_level, xp_multiplier
  INTO v_current_xp, v_current_level, v_xp_multiplier
  FROM public.user_xp
  WHERE teen_id = p_teen_id;

  -- Appliquer le multiplicateur
  v_final_xp := FLOOR(p_xp_amount * COALESCE(v_xp_multiplier, 1.00));
  v_new_xp := v_current_xp + v_final_xp;

  -- Calculer le nouveau niveau (formule: niveau N nécessite N * 100 XP total)
  -- Niveau 1: 0-99 XP, Niveau 2: 100-299 XP, etc.
  v_new_level := v_current_level;
  LOOP
    v_xp_for_level := v_new_level * 100; -- XP nécessaire pour le niveau suivant
    IF v_new_xp >= (v_new_level * (v_new_level + 1) / 2) * 100 THEN
      v_new_level := v_new_level + 1;
      v_leveled_up := true;
      v_levels_gained := v_levels_gained + 1;
    ELSE
      EXIT;
    END IF;

    -- Sécurité: max niveau 100
    IF v_new_level >= 100 THEN
      v_new_level := 100;
      EXIT;
    END IF;
  END LOOP;

  -- Mettre à jour l'XP
  UPDATE public.user_xp
  SET
    total_xp = v_new_xp,
    current_level = v_new_level,
    xp_to_next_level = ((v_new_level * (v_new_level + 1) / 2) * 100) - v_new_xp,
    updated_at = NOW()
  WHERE teen_id = p_teen_id;

  -- Enregistrer la transaction
  INSERT INTO public.xp_transactions (teen_id, amount, source_type, source_id, description, multiplier_applied)
  VALUES (p_teen_id, v_final_xp, p_source_type, p_source_id, p_description, v_xp_multiplier);

  -- Mettre à jour user_progression si existe
  UPDATE public.user_progression
  SET total_xp = v_new_xp, current_level = v_new_level, updated_at = NOW()
  WHERE user_id = p_teen_id;

  RETURN jsonb_build_object(
    'success', true,
    'xp_gained', v_final_xp,
    'multiplier', v_xp_multiplier,
    'total_xp', v_new_xp,
    'previous_level', v_current_level,
    'new_level', v_new_level,
    'leveled_up', v_leveled_up,
    'levels_gained', v_levels_gained
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_xp_to_user IS 'Ajoute de l XP à un utilisateur avec gestion automatique du niveau';

-- ==========================================
-- PARTIE 10: FONCTION ADD_COINS_TO_USER
-- ==========================================

-- Supprimer TOUTES les versions de la fonction (toutes signatures possibles)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'add_coins_to_user'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION add_coins_to_user(
  p_teen_id UUID,
  p_amount INTEGER,
  p_transaction_type VARCHAR(50),
  p_source_type VARCHAR(50),
  p_source_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Récupérer ou créer l'entrée Coins
  INSERT INTO public.user_coins (teen_id, balance)
  VALUES (p_teen_id, 0)
  ON CONFLICT (teen_id) DO NOTHING;

  -- Récupérer le solde actuel
  SELECT balance INTO v_current_balance
  FROM public.user_coins
  WHERE teen_id = p_teen_id;

  -- Calculer le nouveau solde
  v_new_balance := v_current_balance + p_amount;

  -- Vérifier si le solde est suffisant pour les dépenses
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Solde insuffisant',
      'current_balance', v_current_balance,
      'required', ABS(p_amount)
    );
  END IF;

  -- Mettre à jour le solde
  UPDATE public.user_coins
  SET
    balance = v_new_balance,
    lifetime_earned = CASE WHEN p_amount > 0 THEN lifetime_earned + p_amount ELSE lifetime_earned END,
    lifetime_spent = CASE WHEN p_amount < 0 THEN lifetime_spent + ABS(p_amount) ELSE lifetime_spent END,
    updated_at = NOW()
  WHERE teen_id = p_teen_id;

  -- Enregistrer la transaction
  INSERT INTO public.coin_transactions (teen_id, amount, transaction_type, source_type, source_id, description, balance_after)
  VALUES (p_teen_id, p_amount, p_transaction_type, p_source_type, p_source_id, p_description, v_new_balance);

  -- Mettre à jour user_progression si existe
  UPDATE public.user_progression
  SET coins = v_new_balance, updated_at = NOW()
  WHERE user_id = p_teen_id;

  RETURN jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'previous_balance', v_current_balance,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_coins_to_user IS 'Ajoute ou retire des coins à un utilisateur';

-- ==========================================
-- PARTIE 11: FONCTION UPDATE_STREAK
-- ==========================================

-- Supprimer TOUTES les versions de la fonction
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'update_user_streak'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION update_user_streak(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_today DATE := CURRENT_DATE;
  v_streak_broken BOOLEAN := false;
  v_streak_extended BOOLEAN := false;
BEGIN
  -- Récupérer ou créer l'entrée streak
  INSERT INTO public.user_streaks (teen_id, current_streak, longest_streak, last_activity_date)
  VALUES (p_teen_id, 0, 0, NULL)
  ON CONFLICT (teen_id) DO NOTHING;

  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM public.user_streaks
  WHERE teen_id = p_teen_id;

  -- Logique de streak
  IF v_last_date IS NULL THEN
    -- Premier jour
    v_current_streak := 1;
    v_streak_extended := true;
  ELSIF v_last_date = v_today THEN
    -- Déjà actif aujourd'hui, ne rien faire
    NULL;
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    -- Jour consécutif
    v_current_streak := v_current_streak + 1;
    v_streak_extended := true;
  ELSE
    -- Streak cassé
    v_streak_broken := true;
    v_current_streak := 1;
    v_streak_extended := true;
  END IF;

  -- Mettre à jour le record
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  -- Sauvegarder
  UPDATE public.user_streaks
  SET
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_activity_date = v_today,
    streak_started_at = CASE WHEN v_streak_extended AND v_current_streak = 1 THEN v_today ELSE streak_started_at END,
    updated_at = NOW()
  WHERE teen_id = p_teen_id;

  RETURN jsonb_build_object(
    'success', true,
    'current_streak', v_current_streak,
    'longest_streak', v_longest_streak,
    'streak_extended', v_streak_extended,
    'streak_broken', v_streak_broken
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_user_streak IS 'Met à jour le streak quotidien d un utilisateur';

-- ==========================================
-- PARTIE 12: FONCTION INIT_USER_GAMIFICATION
-- ==========================================

-- Supprimer TOUTES les versions de la fonction
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'init_user_gamification'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION init_user_gamification(p_teen_id UUID)
RETURNS void AS $$
BEGIN
  -- Initialiser XP
  INSERT INTO public.user_xp (teen_id, total_xp, current_level)
  VALUES (p_teen_id, 0, 1)
  ON CONFLICT (teen_id) DO NOTHING;

  -- Initialiser Coins
  INSERT INTO public.user_coins (teen_id, balance)
  VALUES (p_teen_id, 100) -- Bonus de départ
  ON CONFLICT (teen_id) DO NOTHING;

  -- Initialiser Streak
  INSERT INTO public.user_streaks (teen_id, current_streak)
  VALUES (p_teen_id, 0)
  ON CONFLICT (teen_id) DO NOTHING;

  -- Initialiser Progression
  INSERT INTO public.user_progression (user_id, total_xp, current_level, coins)
  VALUES (p_teen_id, 0, 1, 100)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION init_user_gamification IS 'Initialise toutes les tables de gamification pour un nouvel utilisateur';

-- ==========================================
-- PARTIE 13: TRIGGER AUTO-INIT SUR TEENS
-- ==========================================

-- Supprimer TOUTES les versions de la fonction trigger
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'trigger_init_gamification_on_teen_create'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION trigger_init_gamification_on_teen_create()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM init_user_gamification(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_teen_created_init_gamification ON public.teens;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'teens') THEN
    CREATE TRIGGER on_teen_created_init_gamification
      AFTER INSERT ON public.teens
      FOR EACH ROW
      EXECUTE FUNCTION trigger_init_gamification_on_teen_create();
  END IF;
END $$;

-- ==========================================
-- PARTIE 14: RLS POLICIES
-- ==========================================

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progression ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view own xp" ON public.user_xp;
DROP POLICY IF EXISTS "Users can view own streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can view own coins" ON public.user_coins;
DROP POLICY IF EXISTS "Users can view own xp transactions" ON public.xp_transactions;
DROP POLICY IF EXISTS "Users can view own coin transactions" ON public.coin_transactions;
DROP POLICY IF EXISTS "Users can view own progression" ON public.user_progression;

-- Policies user_xp
CREATE POLICY "Users can view own xp" ON public.user_xp FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = user_xp.teen_id AND parent_id = auth.uid()));

-- Policies user_streaks
CREATE POLICY "Users can view own streaks" ON public.user_streaks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = user_streaks.teen_id AND parent_id = auth.uid()));

-- Policies user_coins
CREATE POLICY "Users can view own coins" ON public.user_coins FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = user_coins.teen_id AND parent_id = auth.uid()));

-- Policies xp_transactions
CREATE POLICY "Users can view own xp transactions" ON public.xp_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = xp_transactions.teen_id AND parent_id = auth.uid()));

-- Policies coin_transactions
CREATE POLICY "Users can view own coin transactions" ON public.coin_transactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = coin_transactions.teen_id AND parent_id = auth.uid()));

-- Policies user_progression
CREATE POLICY "Users can view own progression" ON public.user_progression FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.teens WHERE id = user_progression.user_id AND parent_id = auth.uid()));

-- ==========================================
-- PARTIE 15: VUE PROFILES (compatibilité)
-- ==========================================

-- Si "profiles" existe déjà comme TABLE, on ne crée pas la vue
-- Sinon, on crée une vue pour compatibilité avec les migrations
DO $$
BEGIN
  -- Vérifier si profiles existe comme TABLE
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND table_type = 'BASE TABLE'
  ) THEN
    RAISE NOTICE 'La table profiles existe déjà, pas de création de vue';
  ELSE
    -- Supprimer la vue si elle existe
    DROP VIEW IF EXISTS public.profiles;

    -- Créer la vue
    CREATE VIEW public.profiles AS
    SELECT
      t.parent_id AS id,
      t.id AS teen_id,
      t.first_name,
      t.last_name,
      t.pseudo,
      t.avatar_url,
      t.date_of_birth,
      COALESCE(ux.total_xp, 0) AS total_xp,
      COALESCE(ux.current_level, 1) AS level,
      COALESCE(uc.balance, 0) AS coins,
      COALESCE(us.current_streak, 0) AS current_streak,
      COALESCE(us.longest_streak, 0) AS longest_streak,
      t.created_at,
      t.updated_at
    FROM public.teens t
    LEFT JOIN public.user_xp ux ON ux.teen_id = t.id
    LEFT JOIN public.user_coins uc ON uc.teen_id = t.id
    LEFT JOIN public.user_streaks us ON us.teen_id = t.id;

    RAISE NOTICE 'Vue profiles créée avec succès';
  END IF;
END $$;

-- Fonction helper pour obtenir le teen_id depuis un user_id (auth.users)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_teen_id_for_user'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION get_teen_id_for_user(p_user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM public.teens WHERE parent_id = p_user_id LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_teen_id_for_user IS 'Retourne le teen_id associé à un user_id (auth.users)';

-- ==========================================
-- PARTIE 16: VÉRIFICATION
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 000 - Tables de base terminée';
  RAISE NOTICE 'Tables créées: user_xp, user_streaks, user_coins, user_progression';
  RAISE NOTICE 'Tables créées: xp_transactions, coin_transactions';
  RAISE NOTICE 'Vue créée: profiles (compatibilité)';
  RAISE NOTICE 'Fonctions: add_xp_to_user, add_coins_to_user, update_user_streak';
  RAISE NOTICE 'Fonctions: init_user_gamification';
  RAISE NOTICE 'IMPORTANT: Exécuter cette migration AVANT toutes les autres!';
END $$;


-- ============================================================================
-- 001_achievements_system.sql
-- ============================================================================
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


-- ============================================================================
-- 002_leaderboard_system.sql
-- ============================================================================
-- =============================================
-- MIGRATION 002: SYSTÈME DE LEADERBOARD COMPLET
-- =============================================
-- Crée les tables, vues et fonctions pour les classements
-- hebdomadaires, mensuels, all-time, entre amis et par ville
-- =============================================

-- ==========================================
-- PARTIE 1: TABLES
-- ==========================================

-- 1. TABLE LEADERBOARD_SNAPSHOTS (Historique des classements)
-- =============================================

CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type de classement
  leaderboard_type VARCHAR(20) NOT NULL CHECK (leaderboard_type IN (
    'weekly', 'monthly', 'all_time', 'seasonal'
  )),

  -- Période
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_label VARCHAR(50), -- "Semaine 51", "Décembre 2025", etc.

  -- Données du classement
  rankings JSONB NOT NULL DEFAULT '[]',

  -- Métadonnées
  total_participants INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.leaderboard_snapshots IS 'Historique des classements pour consultation';

CREATE INDEX IF NOT EXISTS idx_leaderboard_type ON public.leaderboard_snapshots(leaderboard_type);
CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON public.leaderboard_snapshots(period_start, period_end);

-- 2. TABLE FRIEND_CONNECTIONS (Relations d'amitié)
-- =============================================

CREATE TABLE IF NOT EXISTS public.friend_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Les deux teens
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  friend_teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'blocked'
  )),

  -- Qui a initié
  initiated_by UUID NOT NULL REFERENCES public.teens(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  UNIQUE(teen_id, friend_teen_id),
  CHECK (teen_id != friend_teen_id)
);

COMMENT ON TABLE public.friend_connections IS 'Relations d amitié entre teens';

CREATE INDEX IF NOT EXISTS idx_friend_teen ON public.friend_connections(teen_id);
CREATE INDEX IF NOT EXISTS idx_friend_friend ON public.friend_connections(friend_teen_id);
CREATE INDEX IF NOT EXISTS idx_friend_status ON public.friend_connections(status);

-- 3. TABLE XP_WEEKLY (Agrégation XP hebdomadaire)
-- =============================================

CREATE TABLE IF NOT EXISTS public.xp_weekly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,

  -- Stats
  xp_earned INTEGER DEFAULT 0 CHECK (xp_earned >= 0),
  challenges_completed INTEGER DEFAULT 0,
  events_attended INTEGER DEFAULT 0,
  streak_max INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, week_start)
);

COMMENT ON TABLE public.xp_weekly IS 'Agrégation hebdomadaire des XP par teen';

CREATE INDEX IF NOT EXISTS idx_xp_weekly_teen ON public.xp_weekly(teen_id);
CREATE INDEX IF NOT EXISTS idx_xp_weekly_week ON public.xp_weekly(week_start);
CREATE INDEX IF NOT EXISTS idx_xp_weekly_ranking ON public.xp_weekly(week_start, xp_earned DESC);

-- 4. TABLE XP_MONTHLY (Agrégation XP mensuelle)
-- =============================================

CREATE TABLE IF NOT EXISTS public.xp_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,

  -- Stats
  xp_earned INTEGER DEFAULT 0 CHECK (xp_earned >= 0),
  challenges_completed INTEGER DEFAULT 0,
  events_attended INTEGER DEFAULT 0,
  streak_max INTEGER DEFAULT 0,
  best_weekly_rank INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, month, year)
);

COMMENT ON TABLE public.xp_monthly IS 'Agrégation mensuelle des XP par teen';

CREATE INDEX IF NOT EXISTS idx_xp_monthly_teen ON public.xp_monthly(teen_id);
CREATE INDEX IF NOT EXISTS idx_xp_monthly_period ON public.xp_monthly(year, month);
CREATE INDEX IF NOT EXISTS idx_xp_monthly_ranking ON public.xp_monthly(year, month, xp_earned DESC);

-- ==========================================
-- PARTIE 2: VUES
-- ==========================================

-- Ensure required columns exist on user_xp (legacy safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_xp'
      AND column_name = 'current_level'
  ) THEN
    ALTER TABLE public.user_xp ADD COLUMN current_level INTEGER DEFAULT 1;
  END IF;
END $$;

-- Supprimer les anciennes vues si elles existent
DROP VIEW IF EXISTS public.v_leaderboard_all_time CASCADE;
DROP VIEW IF EXISTS public.v_leaderboard_weekly CASCADE;
DROP VIEW IF EXISTS public.v_leaderboard_monthly CASCADE;

-- 1. VUE: Leaderboard temps réel (All-Time)
-- =============================================

CREATE OR REPLACE VIEW public.v_leaderboard_all_time AS
SELECT
  ux.teen_id,
  t.pseudo,
  t.avatar_url,
  NULL::VARCHAR as city,
  ux.total_xp,
  ux.current_level as level,
  us.current_streak,
  us.longest_streak,
  RANK() OVER (ORDER BY ux.total_xp DESC) as rank,
  PERCENT_RANK() OVER (ORDER BY ux.total_xp DESC) * 100 as percentile
FROM public.user_xp ux
JOIN public.teens t ON t.id = ux.teen_id
LEFT JOIN public.user_streaks us ON us.teen_id = ux.teen_id
WHERE ux.total_xp > 0
ORDER BY ux.total_xp DESC;

COMMENT ON VIEW public.v_leaderboard_all_time IS 'Classement global temps réel par XP total';

-- 2. VUE: Leaderboard hebdomadaire
-- =============================================

CREATE OR REPLACE VIEW public.v_leaderboard_weekly AS
WITH current_week AS (
  SELECT
    DATE_TRUNC('week', CURRENT_DATE)::date as week_start,
    (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::date as week_end
)
SELECT
  xw.teen_id,
  t.pseudo,
  t.avatar_url,
  NULL::VARCHAR as city,
  xw.xp_earned,
  xw.challenges_completed,
  xw.events_attended,
  xw.streak_max,
  ux.current_level as level,
  RANK() OVER (ORDER BY xw.xp_earned DESC) as rank,
  cw.week_start,
  cw.week_end
FROM public.xp_weekly xw
JOIN public.teens t ON t.id = xw.teen_id
JOIN public.user_xp ux ON ux.teen_id = xw.teen_id
CROSS JOIN current_week cw
WHERE xw.week_start = cw.week_start
  AND xw.xp_earned > 0
ORDER BY xw.xp_earned DESC;

COMMENT ON VIEW public.v_leaderboard_weekly IS 'Classement de la semaine en cours';

-- 3. VUE: Leaderboard mensuel
-- =============================================

CREATE OR REPLACE VIEW public.v_leaderboard_monthly AS
SELECT
  xm.teen_id,
  t.pseudo,
  t.avatar_url,
  NULL::VARCHAR as city,
  xm.xp_earned,
  xm.challenges_completed,
  xm.events_attended,
  xm.streak_max,
  xm.best_weekly_rank,
  ux.current_level as level,
  RANK() OVER (ORDER BY xm.xp_earned DESC) as rank,
  xm.month,
  xm.year
FROM public.xp_monthly xm
JOIN public.teens t ON t.id = xm.teen_id
JOIN public.user_xp ux ON ux.teen_id = xm.teen_id
WHERE xm.month = EXTRACT(MONTH FROM CURRENT_DATE)
  AND xm.year = EXTRACT(YEAR FROM CURRENT_DATE)
  AND xm.xp_earned > 0
ORDER BY xm.xp_earned DESC;

COMMENT ON VIEW public.v_leaderboard_monthly IS 'Classement du mois en cours';

-- ==========================================
-- PARTIE 3: FONCTIONS
-- ==========================================

-- Supprimer les anciennes fonctions si elles existent
DO $$
DECLARE
  func_names TEXT[] := ARRAY['get_leaderboard', 'get_friends_leaderboard', 'get_city_leaderboard',
                              'get_user_rank', 'update_weekly_stats', 'update_monthly_stats',
                              'send_friend_request', 'accept_friend_request', 'get_friends_list',
                              'trigger_update_leaderboard_stats'];
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

-- 1. FONCTION: Obtenir le leaderboard temps réel
-- =============================================

CREATE OR REPLACE FUNCTION get_leaderboard(
  p_type VARCHAR(20) DEFAULT 'all_time',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  teen_id UUID,
  pseudo VARCHAR,
  avatar_url TEXT,
  city VARCHAR,
  xp INTEGER,
  level INTEGER,
  current_streak INTEGER,
  rank BIGINT,
  percentile NUMERIC
) AS $$
BEGIN
  IF p_type = 'all_time' THEN
    RETURN QUERY
    SELECT
      v.teen_id, v.pseudo, v.avatar_url, v.city,
      v.total_xp as xp, v.level, v.current_streak,
      v.rank, v.percentile::numeric
    FROM public.v_leaderboard_all_time v
    ORDER BY v.rank
    LIMIT p_limit OFFSET p_offset;

  ELSIF p_type = 'weekly' THEN
    RETURN QUERY
    SELECT
      v.teen_id, v.pseudo, v.avatar_url, v.city,
      v.xp_earned as xp, v.level, 0 as current_streak,
      v.rank, 0::numeric as percentile
    FROM public.v_leaderboard_weekly v
    ORDER BY v.rank
    LIMIT p_limit OFFSET p_offset;

  ELSIF p_type = 'monthly' THEN
    RETURN QUERY
    SELECT
      v.teen_id, v.pseudo, v.avatar_url, v.city,
      v.xp_earned as xp, v.level, 0 as current_streak,
      v.rank, 0::numeric as percentile
    FROM public.v_leaderboard_monthly v
    ORDER BY v.rank
    LIMIT p_limit OFFSET p_offset;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_leaderboard IS 'Récupère le classement selon le type demandé';

-- 2. FONCTION: Leaderboard entre amis
-- =============================================

CREATE OR REPLACE FUNCTION get_friends_leaderboard(
  p_teen_id UUID,
  p_type VARCHAR(20) DEFAULT 'all_time',
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  teen_id UUID,
  pseudo VARCHAR,
  avatar_url TEXT,
  xp INTEGER,
  level INTEGER,
  rank BIGINT,
  is_current_user BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH friends AS (
    SELECT
      CASE
        WHEN fc.teen_id = p_teen_id THEN fc.friend_teen_id
        ELSE fc.teen_id
      END as friend_id
    FROM public.friend_connections fc
    WHERE (fc.teen_id = p_teen_id OR fc.friend_teen_id = p_teen_id)
      AND fc.status = 'accepted'
  ),
  all_participants AS (
    SELECT p_teen_id as participant_id
    UNION
    SELECT friend_id FROM friends
  )
  SELECT
    t.id as teen_id,
    t.pseudo,
    t.avatar_url,
    CASE
      WHEN p_type = 'all_time' THEN ux.total_xp
      WHEN p_type = 'weekly' THEN COALESCE(xw.xp_earned, 0)
      WHEN p_type = 'monthly' THEN COALESCE(xm.xp_earned, 0)
      ELSE ux.total_xp
    END as xp,
    ux.current_level as level,
    RANK() OVER (ORDER BY
      CASE
        WHEN p_type = 'all_time' THEN ux.total_xp
        WHEN p_type = 'weekly' THEN COALESCE(xw.xp_earned, 0)
        WHEN p_type = 'monthly' THEN COALESCE(xm.xp_earned, 0)
        ELSE ux.total_xp
      END DESC
    ) as rank,
    t.id = p_teen_id as is_current_user
  FROM all_participants ap
  JOIN public.teens t ON t.id = ap.participant_id
  JOIN public.user_xp ux ON ux.teen_id = t.id
  LEFT JOIN public.xp_weekly xw ON xw.teen_id = t.id
    AND xw.week_start = DATE_TRUNC('week', CURRENT_DATE)::date
  LEFT JOIN public.xp_monthly xm ON xm.teen_id = t.id
    AND xm.month = EXTRACT(MONTH FROM CURRENT_DATE)
    AND xm.year = EXTRACT(YEAR FROM CURRENT_DATE)
  ORDER BY xp DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_friends_leaderboard IS 'Classement entre amis d un utilisateur';

-- 3. FONCTION: Leaderboard par ville
-- =============================================

-- Note: get_city_leaderboard désactivé car la colonne 'city' n'existe pas dans teens
-- Cette fonction pourra être activée si la colonne city est ajoutée plus tard
/*
CREATE OR REPLACE FUNCTION get_city_leaderboard(
  p_city VARCHAR,
  p_type VARCHAR(20) DEFAULT 'all_time',
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  teen_id UUID,
  pseudo VARCHAR,
  avatar_url TEXT,
  xp INTEGER,
  level INTEGER,
  rank BIGINT
) AS $$
BEGIN
  -- La colonne city n'existe pas dans teens, cette fonction est désactivée
  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;
*/

-- 4. FONCTION: Obtenir le rang d'un user
-- =============================================

CREATE OR REPLACE FUNCTION get_user_rank(
  p_teen_id UUID,
  p_type VARCHAR(20) DEFAULT 'all_time'
)
RETURNS JSONB AS $$
DECLARE
  v_rank BIGINT;
  v_total BIGINT;
  v_xp INTEGER;
  v_percentile NUMERIC;
BEGIN
  IF p_type = 'all_time' THEN
    SELECT rank, total_xp, percentile INTO v_rank, v_xp, v_percentile
    FROM public.v_leaderboard_all_time
    WHERE teen_id = p_teen_id;

    SELECT COUNT(*) INTO v_total FROM public.v_leaderboard_all_time;

  ELSIF p_type = 'weekly' THEN
    SELECT rank, xp_earned INTO v_rank, v_xp
    FROM public.v_leaderboard_weekly
    WHERE teen_id = p_teen_id;

    SELECT COUNT(*) INTO v_total FROM public.v_leaderboard_weekly;
    v_percentile := CASE WHEN v_total > 0 THEN ((v_total - v_rank)::numeric / v_total::numeric) * 100 ELSE 0 END;

  ELSIF p_type = 'monthly' THEN
    SELECT rank, xp_earned INTO v_rank, v_xp
    FROM public.v_leaderboard_monthly
    WHERE teen_id = p_teen_id;

    SELECT COUNT(*) INTO v_total FROM public.v_leaderboard_monthly;
    v_percentile := CASE WHEN v_total > 0 THEN ((v_total - v_rank)::numeric / v_total::numeric) * 100 ELSE 0 END;
  END IF;

  RETURN jsonb_build_object(
    'rank', COALESCE(v_rank, 0),
    'total_participants', COALESCE(v_total, 0),
    'xp', COALESCE(v_xp, 0),
    'percentile', COALESCE(ROUND(v_percentile, 1), 0),
    'type', p_type
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_rank IS 'Récupère le rang d un utilisateur';

-- 5. FONCTION: Mettre à jour les stats hebdomadaires
-- =============================================

CREATE OR REPLACE FUNCTION update_weekly_stats(p_teen_id UUID, p_xp_amount INTEGER)
RETURNS void AS $$
DECLARE
  v_week_start DATE := DATE_TRUNC('week', CURRENT_DATE)::date;
  v_week_end DATE := (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::date;
  v_week_number INTEGER := EXTRACT(WEEK FROM CURRENT_DATE);
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  INSERT INTO public.xp_weekly (
    teen_id, week_start, week_end, week_number, year, xp_earned
  ) VALUES (
    p_teen_id, v_week_start, v_week_end, v_week_number, v_year, p_xp_amount
  )
  ON CONFLICT (teen_id, week_start) DO UPDATE
  SET
    xp_earned = xp_weekly.xp_earned + p_xp_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. FONCTION: Mettre à jour les stats mensuelles
-- =============================================

CREATE OR REPLACE FUNCTION update_monthly_stats(p_teen_id UUID, p_xp_amount INTEGER)
RETURNS void AS $$
DECLARE
  v_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  INSERT INTO public.xp_monthly (
    teen_id, month, year, xp_earned
  ) VALUES (
    p_teen_id, v_month, v_year, p_xp_amount
  )
  ON CONFLICT (teen_id, month, year) DO UPDATE
  SET
    xp_earned = xp_monthly.xp_earned + p_xp_amount,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 7. FONCTION: Gérer les amis
-- =============================================

CREATE OR REPLACE FUNCTION send_friend_request(
  p_from_teen_id UUID,
  p_to_teen_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- Vérifier si une connexion existe déjà
  SELECT * INTO v_existing
  FROM public.friend_connections
  WHERE (teen_id = p_from_teen_id AND friend_teen_id = p_to_teen_id)
     OR (teen_id = p_to_teen_id AND friend_teen_id = p_from_teen_id);

  IF FOUND THEN
    IF v_existing.status = 'blocked' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Connexion bloquée');
    ELSIF v_existing.status = 'accepted' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Déjà amis');
    ELSIF v_existing.status = 'pending' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Demande en attente');
    END IF;
  END IF;

  -- Créer la demande
  INSERT INTO public.friend_connections (teen_id, friend_teen_id, status, initiated_by)
  VALUES (p_from_teen_id, p_to_teen_id, 'pending', p_from_teen_id);

  RETURN jsonb_build_object('success', true, 'message', 'Demande envoyée');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION accept_friend_request(
  p_connection_id UUID,
  p_teen_id UUID
)
RETURNS JSONB AS $$
BEGIN
  UPDATE public.friend_connections
  SET status = 'accepted', accepted_at = NOW(), updated_at = NOW()
  WHERE id = p_connection_id
    AND friend_teen_id = p_teen_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Demande non trouvée');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Ami ajouté');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_friends_list(p_teen_id UUID)
RETURNS TABLE (
  friend_id UUID,
  pseudo VARCHAR,
  avatar_url TEXT,
  level INTEGER,
  total_xp INTEGER,
  friendship_since TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN fc.teen_id = p_teen_id THEN fc.friend_teen_id
      ELSE fc.teen_id
    END as friend_id,
    t.pseudo,
    t.avatar_url,
    ux.current_level as level,
    ux.total_xp,
    fc.accepted_at as friendship_since
  FROM public.friend_connections fc
  JOIN public.teens t ON t.id = CASE
    WHEN fc.teen_id = p_teen_id THEN fc.friend_teen_id
    ELSE fc.teen_id
  END
  LEFT JOIN public.user_xp ux ON ux.teen_id = t.id
  WHERE (fc.teen_id = p_teen_id OR fc.friend_teen_id = p_teen_id)
    AND fc.status = 'accepted'
  ORDER BY ux.total_xp DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================
-- PARTIE 4: TRIGGERS
-- ==========================================

-- Trigger pour mettre à jour les stats hebdo/mensuelles quand XP est ajouté
CREATE OR REPLACE FUNCTION trigger_update_leaderboard_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour les stats si XP a changé
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.total_xp > OLD.total_xp) THEN
    DECLARE
      v_xp_diff INTEGER := CASE
        WHEN TG_OP = 'INSERT' THEN NEW.total_xp
        ELSE NEW.total_xp - OLD.total_xp
      END;
    BEGIN
      PERFORM update_weekly_stats(NEW.teen_id, v_xp_diff);
      PERFORM update_monthly_stats(NEW.teen_id, v_xp_diff);
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_xp_change_update_leaderboard ON public.user_xp;
CREATE TRIGGER on_xp_change_update_leaderboard
  AFTER INSERT OR UPDATE ON public.user_xp
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_leaderboard_stats();

-- ==========================================
-- PARTIE 5: RLS POLICIES
-- ==========================================

ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_monthly ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Everyone can view leaderboard snapshots" ON public.leaderboard_snapshots;
DROP POLICY IF EXISTS "Users can view own friend connections" ON public.friend_connections;
DROP POLICY IF EXISTS "Users can create friend connections" ON public.friend_connections;
DROP POLICY IF EXISTS "Users can update own friend connections" ON public.friend_connections;
DROP POLICY IF EXISTS "Everyone can view xp_weekly" ON public.xp_weekly;
DROP POLICY IF EXISTS "Everyone can view xp_monthly" ON public.xp_monthly;

-- Leaderboard snapshots: lecture publique
CREATE POLICY "Everyone can view leaderboard snapshots"
  ON public.leaderboard_snapshots FOR SELECT
  USING (true);

-- Friend connections: propres connexions
CREATE POLICY "Users can view own friend connections"
  ON public.friend_connections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teens t
      WHERE (t.id = friend_connections.teen_id OR t.id = friend_connections.friend_teen_id)
      AND t.parent_id = auth.uid()
    )
  );

CREATE POLICY "Users can create friend connections"
  ON public.friend_connections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teens t
      WHERE t.id = friend_connections.teen_id
      AND t.parent_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own friend connections"
  ON public.friend_connections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teens t
      WHERE t.id = friend_connections.friend_teen_id
      AND t.parent_id = auth.uid()
    )
  );

-- XP Weekly/Monthly: lecture publique pour classements
CREATE POLICY "Everyone can view xp_weekly"
  ON public.xp_weekly FOR SELECT
  USING (true);

CREATE POLICY "Everyone can view xp_monthly"
  ON public.xp_monthly FOR SELECT
  USING (true);

-- ==========================================
-- PARTIE 6: VÉRIFICATION
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 002 - Système de Leaderboard terminée';
  RAISE NOTICE 'Tables créées: leaderboard_snapshots, friend_connections, xp_weekly, xp_monthly';
  RAISE NOTICE 'Vues: v_leaderboard_all_time, v_leaderboard_weekly, v_leaderboard_monthly';
  RAISE NOTICE 'Fonctions: get_leaderboard, get_friends_leaderboard, get_city_leaderboard';
  RAISE NOTICE 'Fonctions: get_user_rank, send_friend_request, accept_friend_request';
END $$;


-- ============================================================================
-- 003_missions_system.sql
-- ============================================================================
-- =============================================
-- MIGRATION 003: SYSTÈME DE MISSIONS/QUÊTES
-- =============================================
-- Crée les tables et fonctions pour les missions
-- quotidiennes, hebdomadaires, mensuelles et saisonnières
-- =============================================

-- ==========================================
-- PARTIE 1: TABLES
-- ==========================================

-- 1. TABLE MISSION_TEMPLATES (Définitions des missions)
-- =============================================

CREATE TABLE IF NOT EXISTS public.mission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,

  -- Type et périodicité
  mission_type VARCHAR(20) NOT NULL CHECK (mission_type IN (
    'daily', 'weekly', 'monthly', 'seasonal', 'special'
  )),

  -- Catégorie
  category VARCHAR(30) CHECK (category IN (
    'participation', 'social', 'challenge', 'exploration', 'loyalty', 'event'
  )),

  -- Récompenses
  xp_reward INTEGER NOT NULL DEFAULT 50 CHECK (xp_reward >= 0),
  bonus_rewards JSONB DEFAULT '{}',

  -- Objectif
  objective_type VARCHAR(30) NOT NULL CHECK (objective_type IN (
    'count', 'streak', 'cumulative', 'unique', 'time_limited', 'combo'
  )),
  objective_target INTEGER NOT NULL DEFAULT 1,
  objective_config JSONB DEFAULT '{}',

  -- Période (pour saisonnières)
  season VARCHAR(20) CHECK (season IN ('spring', 'summer', 'autumn', 'winter', 'ramadan', 'christmas', 'halloween', 'new_year')),
  valid_from DATE,
  valid_until DATE,

  -- Métadonnées
  icon VARCHAR(50) DEFAULT 'target',
  color VARCHAR(20) DEFAULT 'cyan',
  difficulty VARCHAR(20) DEFAULT 'normal' CHECK (difficulty IN ('easy', 'normal', 'hard', 'extreme')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_repeatable BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.mission_templates IS 'Templates des missions/quêtes du système';

CREATE INDEX IF NOT EXISTS idx_mission_type ON public.mission_templates(mission_type);
CREATE INDEX IF NOT EXISTS idx_mission_category ON public.mission_templates(category);
CREATE INDEX IF NOT EXISTS idx_mission_active ON public.mission_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mission_seasonal ON public.mission_templates(season, valid_from, valid_until);

-- 2. TABLE USER_MISSIONS (Missions en cours/complétées)
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.mission_templates(id) ON DELETE CASCADE,

  -- Progression
  progress INTEGER DEFAULT 0,
  progress_data JSONB DEFAULT '{}',

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'completed', 'expired', 'claimed'
  )),

  -- Période
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Complétion
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  xp_earned INTEGER DEFAULT 0,
  rewards_claimed JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  UNIQUE(teen_id, mission_id, period_start)
);

COMMENT ON TABLE public.user_missions IS 'Missions assignées et progression par utilisateur';

CREATE INDEX IF NOT EXISTS idx_user_missions_teen ON public.user_missions(teen_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_status ON public.user_missions(teen_id, status);
CREATE INDEX IF NOT EXISTS idx_user_missions_period ON public.user_missions(period_start, period_end);

-- 3. TABLE MISSION_PROGRESS_LOG (Historique de progression)
-- =============================================

CREATE TABLE IF NOT EXISTS public.mission_progress_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_mission_id UUID NOT NULL REFERENCES public.user_missions(id) ON DELETE CASCADE,

  -- Action
  action_type VARCHAR(50) NOT NULL,
  progress_increment INTEGER NOT NULL,
  progress_after INTEGER NOT NULL,

  -- Détails
  action_data JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.mission_progress_log IS 'Log de progression des missions';

CREATE INDEX IF NOT EXISTS idx_mission_progress_user_mission ON public.mission_progress_log(user_mission_id);

-- ==========================================
-- PARTIE 2: SEED MISSIONS
-- ==========================================

-- MISSIONS QUOTIDIENNES
INSERT INTO public.mission_templates (code, name, description, mission_type, category, xp_reward, objective_type, objective_target, icon, difficulty, is_repeatable) VALUES
('daily_login', 'Connexion du Jour', 'Connecte-toi à l''app', 'daily', 'loyalty', 10, 'count', 1, 'log-in', 'easy', true),
('daily_challenge', 'Défi Quotidien', 'Complète au moins 1 défi aujourd''hui', 'daily', 'challenge', 25, 'count', 1, 'target', 'easy', true),
('daily_challenges_all', 'Perfectionniste', 'Complète tous tes défis du jour', 'daily', 'challenge', 50, 'count', 3, 'check-circle', 'normal', true),
('daily_xp_50', 'Grind XP', 'Gagne 50 XP aujourd''hui', 'daily', 'loyalty', 30, 'cumulative', 50, 'zap', 'normal', true)

ON CONFLICT (code) DO NOTHING;

-- MISSIONS HEBDOMADAIRES
INSERT INTO public.mission_templates (code, name, description, mission_type, category, xp_reward, objective_type, objective_target, icon, difficulty, is_repeatable) VALUES
('weekly_streak_5', 'Flame Guardian', 'Maintiens un streak de 5 jours cette semaine', 'weekly', 'loyalty', 100, 'streak', 5, 'flame', 'normal', true),
('weekly_challenges_15', 'Challenge Master', 'Complète 15 défis cette semaine', 'weekly', 'challenge', 150, 'cumulative', 15, 'award', 'normal', true),
('weekly_event', 'Party Animal', 'Participe à au moins 1 événement cette semaine', 'weekly', 'participation', 200, 'count', 1, 'party-popper', 'normal', true),
('weekly_xp_500', 'XP Hunter', 'Gagne 500 XP cette semaine', 'weekly', 'loyalty', 100, 'cumulative', 500, 'trending-up', 'normal', true),
('weekly_invite', 'Recruteur', 'Invite un ami cette semaine', 'weekly', 'social', 150, 'count', 1, 'user-plus', 'normal', true),
('weekly_perfect', 'Semaine Parfaite', 'Connecte-toi chaque jour de la semaine', 'weekly', 'loyalty', 200, 'streak', 7, 'calendar-check', 'hard', true)

ON CONFLICT (code) DO NOTHING;

-- MISSIONS MENSUELLES
INSERT INTO public.mission_templates (code, name, description, mission_type, category, xp_reward, objective_type, objective_target, icon, difficulty, is_repeatable) VALUES
('monthly_events_3', 'Festivalier', 'Participe à 3 événements ce mois', 'monthly', 'participation', 500, 'count', 3, 'calendar', 'normal', true),
('monthly_challenges_50', 'Ultra Challenger', 'Complète 50 défis ce mois', 'monthly', 'challenge', 400, 'cumulative', 50, 'target', 'hard', true),
('monthly_xp_2000', 'XP Legend', 'Gagne 2000 XP ce mois', 'monthly', 'loyalty', 300, 'cumulative', 2000, 'zap', 'hard', true),
('monthly_streak_15', 'Streak Master', 'Atteins un streak de 15 jours', 'monthly', 'loyalty', 350, 'streak', 15, 'flame', 'hard', true),
('monthly_leaderboard_10', 'Top 10', 'Atteins le top 10 du classement mensuel', 'monthly', 'loyalty', 600, 'count', 1, 'trophy', 'extreme', true),
('monthly_variety', 'Explorateur', 'Participe à 3 types d''événements différents', 'monthly', 'exploration', 450, 'unique', 3, 'compass', 'normal', true)

ON CONFLICT (code) DO NOTHING;

-- MISSIONS SAISONNIÈRES - ÉTÉ
INSERT INTO public.mission_templates (code, name, description, mission_type, category, xp_reward, objective_type, objective_target, icon, season, valid_from, valid_until, difficulty, is_repeatable) VALUES
('summer_2025_events', 'Summer Vibes', 'Participe à 5 événements d''été', 'seasonal', 'participation', 750, 'count', 5, 'sun', 'summer', '2025-06-21', '2025-09-22', 'normal', false),
('summer_2025_streak', 'Summer Streak', 'Maintiens un streak de 30 jours cet été', 'seasonal', 'loyalty', 1000, 'streak', 30, 'flame', 'summer', '2025-06-21', '2025-09-22', 'hard', false),
('summer_2025_xp', 'Summer Champion', 'Gagne 10000 XP cet été', 'seasonal', 'loyalty', 800, 'cumulative', 10000, 'trophy', 'summer', '2025-06-21', '2025-09-22', 'hard', false)

ON CONFLICT (code) DO NOTHING;

-- MISSIONS SAISONNIÈRES - RAMADAN
INSERT INTO public.mission_templates (code, name, description, mission_type, category, xp_reward, objective_type, objective_target, icon, season, valid_from, valid_until, difficulty, is_repeatable) VALUES
('ramadan_2025_events', 'Ramadan Kareem', 'Participe à 3 événements spéciaux Ramadan', 'seasonal', 'event', 600, 'count', 3, 'moon', 'ramadan', '2025-02-28', '2025-03-30', 'normal', false),
('ramadan_2025_streak', 'Ramadan Streak', 'Garde un streak pendant tout le Ramadan', 'seasonal', 'loyalty', 1500, 'streak', 30, 'flame', 'ramadan', '2025-02-28', '2025-03-30', 'extreme', false)

ON CONFLICT (code) DO NOTHING;

-- MISSIONS SAISONNIÈRES - HALLOWEEN
INSERT INTO public.mission_templates (code, name, description, mission_type, category, xp_reward, objective_type, objective_target, icon, season, valid_from, valid_until, difficulty, is_repeatable) VALUES
('halloween_2025', 'Trick or Treat', 'Participe à 2 événements Halloween', 'seasonal', 'event', 500, 'count', 2, 'ghost', 'halloween', '2025-10-15', '2025-11-01', 'normal', false)

ON CONFLICT (code) DO NOTHING;

-- MISSIONS SAISONNIÈRES - NOËL
INSERT INTO public.mission_templates (code, name, description, mission_type, category, xp_reward, objective_type, objective_target, icon, season, valid_from, valid_until, difficulty, is_repeatable) VALUES
('christmas_2025', 'Holiday Spirit', 'Participe aux événements de fin d''année', 'seasonal', 'event', 600, 'count', 3, 'sparkles', 'christmas', '2025-12-01', '2025-12-31', 'normal', false),
('new_year_2026', 'Nouvel An 2026', 'Célèbre le nouvel an avec nous !', 'seasonal', 'event', 300, 'count', 1, 'party-popper', 'new_year', '2025-12-31', '2026-01-02', 'easy', false)

ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- PARTIE 3: FONCTIONS
-- ==========================================

-- 1. FONCTION: Assigner les missions d'une période
-- =============================================

CREATE OR REPLACE FUNCTION assign_missions_for_period(
  p_teen_id UUID,
  p_mission_type VARCHAR(20),
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_mission RECORD;
  v_assigned INTEGER := 0;
BEGIN
  -- Calculer la période selon le type
  CASE p_mission_type
    WHEN 'daily' THEN
      v_period_start := p_date;
      v_period_end := p_date;
    WHEN 'weekly' THEN
      v_period_start := DATE_TRUNC('week', p_date)::date;
      v_period_end := (DATE_TRUNC('week', p_date) + INTERVAL '6 days')::date;
    WHEN 'monthly' THEN
      v_period_start := DATE_TRUNC('month', p_date)::date;
      v_period_end := (DATE_TRUNC('month', p_date) + INTERVAL '1 month' - INTERVAL '1 day')::date;
    WHEN 'seasonal' THEN
      -- Les missions saisonnières ont leurs propres dates
      v_period_start := p_date;
      v_period_end := p_date + INTERVAL '90 days';
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Type de mission invalide');
  END CASE;

  -- Assigner chaque mission active du type
  FOR v_mission IN
    SELECT * FROM public.mission_templates
    WHERE mission_type = p_mission_type
      AND is_active = true
      AND (p_mission_type != 'seasonal' OR (
        (valid_from IS NULL OR valid_from <= p_date)
        AND (valid_until IS NULL OR valid_until >= p_date)
      ))
  LOOP
    -- Vérifier si déjà assignée pour cette période
    IF NOT EXISTS (
      SELECT 1 FROM public.user_missions
      WHERE teen_id = p_teen_id
        AND mission_id = v_mission.id
        AND period_start = CASE WHEN p_mission_type = 'seasonal' THEN COALESCE(v_mission.valid_from, v_period_start) ELSE v_period_start END
    ) THEN
      -- Assigner la mission
      INSERT INTO public.user_missions (
        teen_id, mission_id, progress, status,
        period_start, period_end
      ) VALUES (
        p_teen_id, v_mission.id, 0, 'active',
        CASE WHEN p_mission_type = 'seasonal' THEN COALESCE(v_mission.valid_from, v_period_start) ELSE v_period_start END,
        CASE WHEN p_mission_type = 'seasonal' THEN COALESCE(v_mission.valid_until, v_period_end) ELSE v_period_end END
      );

      v_assigned := v_assigned + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'assigned_count', v_assigned,
    'period_start', v_period_start,
    'period_end', v_period_end
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION assign_missions_for_period IS 'Assigne les missions d une période à un utilisateur';

-- 2. FONCTION: Mettre à jour la progression d'une mission
-- =============================================

CREATE OR REPLACE FUNCTION update_mission_progress(
  p_teen_id UUID,
  p_mission_code VARCHAR(50),
  p_increment INTEGER DEFAULT 1,
  p_action_type VARCHAR(50) DEFAULT 'manual',
  p_action_data JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_mission RECORD;
  v_user_mission RECORD;
  v_new_progress INTEGER;
  v_completed BOOLEAN := false;
  v_xp_earned INTEGER := 0;
BEGIN
  -- Récupérer le template
  SELECT * INTO v_mission
  FROM public.mission_templates
  WHERE code = p_mission_code AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission non trouvée');
  END IF;

  -- Récupérer la mission utilisateur active
  SELECT * INTO v_user_mission
  FROM public.user_missions
  WHERE teen_id = p_teen_id
    AND mission_id = v_mission.id
    AND status = 'active'
    AND period_end >= CURRENT_DATE
  ORDER BY period_start DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Aucune mission active');
  END IF;

  -- Calculer nouvelle progression
  v_new_progress := v_user_mission.progress + p_increment;

  -- Vérifier si complétée
  IF v_new_progress >= v_mission.objective_target THEN
    v_completed := true;
    v_xp_earned := v_mission.xp_reward;
  END IF;

  -- Mettre à jour
  UPDATE public.user_missions
  SET
    progress = LEAST(v_new_progress, v_mission.objective_target),
    status = CASE WHEN v_completed THEN 'completed' ELSE 'active' END,
    completed_at = CASE WHEN v_completed THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = v_user_mission.id;

  -- Logger la progression
  INSERT INTO public.mission_progress_log (
    user_mission_id, action_type, progress_increment, progress_after, action_data
  ) VALUES (
    v_user_mission.id, p_action_type, p_increment, LEAST(v_new_progress, v_mission.objective_target), p_action_data
  );

  RETURN jsonb_build_object(
    'success', true,
    'mission_id', v_mission.id,
    'mission_code', v_mission.code,
    'progress', LEAST(v_new_progress, v_mission.objective_target),
    'target', v_mission.objective_target,
    'completed', v_completed,
    'xp_reward', CASE WHEN v_completed THEN v_xp_earned ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_mission_progress IS 'Met à jour la progression d une mission';

-- 3. FONCTION: Réclamer les récompenses d'une mission
-- =============================================

CREATE OR REPLACE FUNCTION claim_mission_rewards(
  p_teen_id UUID,
  p_user_mission_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_user_mission RECORD;
  v_mission RECORD;
  v_xp_result JSONB;
BEGIN
  -- Récupérer la mission utilisateur
  SELECT um.*, mt.xp_reward, mt.bonus_rewards, mt.name
  INTO v_user_mission
  FROM public.user_missions um
  JOIN public.mission_templates mt ON mt.id = um.mission_id
  WHERE um.id = p_user_mission_id
    AND um.teen_id = p_teen_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission non trouvée');
  END IF;

  IF v_user_mission.status != 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission non complétée');
  END IF;

  IF v_user_mission.status = 'claimed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Récompenses déjà réclamées');
  END IF;

  -- Donner les XP
  v_xp_result := add_xp_to_user(
    p_teen_id,
    v_user_mission.xp_reward,
    'mission_complete',
    'mission',
    v_user_mission.mission_id
  );

  -- Marquer comme réclamé
  UPDATE public.user_missions
  SET
    status = 'claimed',
    claimed_at = NOW(),
    xp_earned = v_user_mission.xp_reward,
    rewards_claimed = v_user_mission.bonus_rewards,
    updated_at = NOW()
  WHERE id = p_user_mission_id;

  RETURN jsonb_build_object(
    'success', true,
    'mission_name', v_user_mission.name,
    'xp_earned', v_user_mission.xp_reward,
    'bonus_rewards', v_user_mission.bonus_rewards,
    'xp_result', v_xp_result
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION claim_mission_rewards IS 'Réclame les récompenses d une mission complétée';

-- 4. FONCTION: Obtenir les missions d'un utilisateur
-- =============================================

CREATE OR REPLACE FUNCTION get_user_missions(
  p_teen_id UUID,
  p_mission_type VARCHAR(20) DEFAULT NULL,
  p_status VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  mission_id UUID,
  code VARCHAR(50),
  name VARCHAR(100),
  description TEXT,
  mission_type VARCHAR(20),
  category VARCHAR(30),
  xp_reward INTEGER,
  icon VARCHAR(50),
  color VARCHAR(20),
  difficulty VARCHAR(20),
  objective_target INTEGER,
  progress INTEGER,
  status VARCHAR(20),
  period_start DATE,
  period_end DATE,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  percentage_complete NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    um.id,
    mt.id as mission_id,
    mt.code,
    mt.name,
    mt.description,
    mt.mission_type,
    mt.category,
    mt.xp_reward,
    mt.icon,
    mt.color,
    mt.difficulty,
    mt.objective_target,
    um.progress,
    um.status,
    um.period_start,
    um.period_end,
    um.completed_at,
    um.claimed_at,
    LEAST(100, (um.progress::numeric / mt.objective_target::numeric) * 100) as percentage_complete
  FROM public.user_missions um
  JOIN public.mission_templates mt ON mt.id = um.mission_id
  WHERE um.teen_id = p_teen_id
    AND (p_mission_type IS NULL OR mt.mission_type = p_mission_type)
    AND (p_status IS NULL OR um.status = p_status)
    AND um.period_end >= CURRENT_DATE - INTERVAL '7 days' -- Inclure les récentes
  ORDER BY
    CASE um.status
      WHEN 'active' THEN 1
      WHEN 'completed' THEN 2
      WHEN 'claimed' THEN 3
      ELSE 4
    END,
    um.period_end ASC,
    mt.sort_order;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_missions IS 'Récupère les missions d un utilisateur';

-- 5. FONCTION: Expirer les missions passées
-- =============================================

CREATE OR REPLACE FUNCTION expire_old_missions()
RETURNS INTEGER AS $$
DECLARE
  v_expired INTEGER;
BEGIN
  UPDATE public.user_missions
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active'
    AND period_end < CURRENT_DATE;

  GET DIAGNOSTICS v_expired = ROW_COUNT;
  RETURN v_expired;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_old_missions IS 'Expire les missions dont la période est passée';

-- 6. FONCTION: Stats des missions
-- =============================================

CREATE OR REPLACE FUNCTION get_mission_stats(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_completed', COUNT(*) FILTER (WHERE status IN ('completed', 'claimed')),
    'total_claimed', COUNT(*) FILTER (WHERE status = 'claimed'),
    'total_xp_earned', COALESCE(SUM(xp_earned) FILTER (WHERE status = 'claimed'), 0),
    'active_daily', COUNT(*) FILTER (WHERE status = 'active' AND mission_type = 'daily'),
    'active_weekly', COUNT(*) FILTER (WHERE status = 'active' AND mission_type = 'weekly'),
    'active_monthly', COUNT(*) FILTER (WHERE status = 'active' AND mission_type = 'monthly'),
    'active_seasonal', COUNT(*) FILTER (WHERE status = 'active' AND mission_type = 'seasonal'),
    'completed_today', COUNT(*) FILTER (WHERE status IN ('completed', 'claimed') AND completed_at::date = CURRENT_DATE),
    'completed_this_week', COUNT(*) FILTER (WHERE status IN ('completed', 'claimed') AND completed_at >= DATE_TRUNC('week', CURRENT_DATE))
  ) INTO v_stats
  FROM public.user_missions um
  JOIN public.mission_templates mt ON mt.id = um.mission_id
  WHERE um.teen_id = p_teen_id;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_mission_stats IS 'Statistiques des missions d un utilisateur';

-- ==========================================
-- PARTIE 4: TRIGGERS
-- ==========================================

-- Trigger pour mettre à jour les missions quand un challenge est complété
CREATE OR REPLACE FUNCTION trigger_update_missions_on_challenge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Mettre à jour les missions liées aux défis
    PERFORM update_mission_progress(NEW.teen_id, 'daily_challenge', 1, 'challenge_complete');
    PERFORM update_mission_progress(NEW.teen_id, 'daily_challenges_all', 1, 'challenge_complete');
    PERFORM update_mission_progress(NEW.teen_id, 'weekly_challenges_15', 1, 'challenge_complete');
    PERFORM update_mission_progress(NEW.teen_id, 'monthly_challenges_50', 1, 'challenge_complete');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_challenge_complete_update_missions ON public.user_challenges;
CREATE TRIGGER on_challenge_complete_update_missions
  AFTER INSERT OR UPDATE ON public.user_challenges
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_missions_on_challenge();

-- Trigger pour mettre à jour les missions quand XP est gagné
CREATE OR REPLACE FUNCTION trigger_update_missions_on_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_xp_diff INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_xp_diff := NEW.total_xp;
  ELSE
    v_xp_diff := NEW.total_xp - OLD.total_xp;
  END IF;

  IF v_xp_diff > 0 THEN
    PERFORM update_mission_progress(NEW.teen_id, 'daily_xp_50', v_xp_diff, 'xp_gain');
    PERFORM update_mission_progress(NEW.teen_id, 'weekly_xp_500', v_xp_diff, 'xp_gain');
    PERFORM update_mission_progress(NEW.teen_id, 'monthly_xp_2000', v_xp_diff, 'xp_gain');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_xp_update_missions ON public.user_xp;
CREATE TRIGGER on_xp_update_missions
  AFTER INSERT OR UPDATE ON public.user_xp
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_missions_on_xp();

-- ==========================================
-- PARTIE 5: RLS POLICIES
-- ==========================================

ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_progress_log ENABLE ROW LEVEL SECURITY;

-- Templates: lecture publique pour actifs
CREATE POLICY "Everyone can view active missions"
  ON public.mission_templates FOR SELECT
  USING (is_active = true);

-- User missions: propres missions
CREATE POLICY "Users can view own missions"
  ON public.user_missions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teens
      WHERE id = user_missions.teen_id
      AND parent_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own missions"
  ON public.user_missions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teens
      WHERE id = user_missions.teen_id
      AND parent_id = auth.uid()
    )
  );

-- Progress log: lecture seule
CREATE POLICY "Users can view own mission progress"
  ON public.mission_progress_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_missions um
      JOIN public.teens t ON t.id = um.teen_id
      WHERE um.id = mission_progress_log.user_mission_id
      AND t.parent_id = auth.uid()
    )
  );

-- ==========================================
-- PARTIE 6: VÉRIFICATION
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 003 - Système de Missions terminée';
  RAISE NOTICE 'Tables: mission_templates, user_missions, mission_progress_log';
  RAISE NOTICE 'Missions seedées: 4 daily, 6 weekly, 6 monthly, 7 seasonal';
  RAISE NOTICE 'Fonctions: assign_missions_for_period, update_mission_progress';
  RAISE NOTICE 'Fonctions: claim_mission_rewards, get_user_missions, get_mission_stats';
END $$;


-- ============================================================================
-- 004_rewards_shop.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Rewards Shop System
-- Migration: 004_rewards_shop.sql
-- Description: Système de boutique de récompenses (XP → Avantages)
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Table des catégories de récompenses
CREATE TABLE IF NOT EXISTS reward_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT 'gift',
    color VARCHAR(50) NOT NULL DEFAULT 'cyan',
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des récompenses disponibles
CREATE TABLE IF NOT EXISTS shop_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES reward_categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    short_description VARCHAR(255),
    image_url TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT 'gift',

    -- Pricing
    xp_cost INT NOT NULL CHECK (xp_cost >= 0),
    original_xp_cost INT, -- Pour afficher les promos

    -- Availability
    stock_type VARCHAR(20) NOT NULL DEFAULT 'unlimited' CHECK (stock_type IN ('unlimited', 'limited', 'unique')),
    stock_quantity INT DEFAULT NULL,
    stock_remaining INT DEFAULT NULL,

    -- Requirements
    min_level INT DEFAULT 1,
    required_badge_id UUID REFERENCES achievements(id),
    vip_only BOOLEAN NOT NULL DEFAULT FALSE,
    min_vip_tier VARCHAR(20),

    -- Limits
    purchase_limit_per_user INT DEFAULT NULL, -- NULL = illimité
    purchase_limit_period VARCHAR(20) DEFAULT NULL CHECK (purchase_limit_period IN ('daily', 'weekly', 'monthly', 'lifetime')),

    -- Timing
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,

    -- Reward details
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN (
        'discount', 'free_entry', 'skip_queue', 'exclusive_access',
        'physical_item', 'digital_item', 'experience', 'lottery_ticket',
        'xp_multiplier', 'profile_customization', 'mystery_box'
    )),
    reward_value JSONB NOT NULL DEFAULT '{}',

    -- Metadata
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_new BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des achats utilisateurs
CREATE TABLE IF NOT EXISTS user_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES shop_rewards(id) ON DELETE CASCADE,

    -- Purchase details
    xp_spent INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'used', 'expired', 'refunded')),

    -- Usage tracking
    used_at TIMESTAMPTZ,
    used_at_event_id UUID,
    expires_at TIMESTAMPTZ,

    -- Metadata
    purchase_metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des codes promo
CREATE TABLE IF NOT EXISTS shop_promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,

    -- Discount type
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_xp')),
    discount_value INT NOT NULL,

    -- Restrictions
    applicable_reward_ids UUID[] DEFAULT NULL, -- NULL = tous les produits
    applicable_category_ids UUID[] DEFAULT NULL,
    min_xp_cost INT DEFAULT 0,

    -- Limits
    max_uses INT DEFAULT NULL,
    max_uses_per_user INT DEFAULT 1,
    current_uses INT NOT NULL DEFAULT 0,

    -- Timing
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table d'utilisation des codes promo
CREATE TABLE IF NOT EXISTS promo_code_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID NOT NULL REFERENCES shop_promo_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES user_purchases(id) ON DELETE SET NULL,
    xp_saved INT NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(promo_code_id, user_id, purchase_id)
);

-- Table des wishlists
CREATE TABLE IF NOT EXISTS user_wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES shop_rewards(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notify_on_sale BOOLEAN NOT NULL DEFAULT TRUE,

    UNIQUE(user_id, reward_id)
);

-- ============================================================================
-- INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shop_rewards_category ON shop_rewards(category_id);
CREATE INDEX IF NOT EXISTS idx_shop_rewards_active ON shop_rewards(is_active, available_from, available_until);
CREATE INDEX IF NOT EXISTS idx_shop_rewards_featured ON shop_rewards(is_featured, is_active);
CREATE INDEX IF NOT EXISTS idx_shop_rewards_type ON shop_rewards(reward_type);

CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_reward ON user_purchases(reward_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_status ON user_purchases(status);

CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_user ON user_wishlists(user_id);

-- ============================================================================
-- SEED DATA - CATEGORIES
-- ============================================================================

INSERT INTO reward_categories (name, slug, description, icon, color, display_order) VALUES
    ('Entrées & Accès', 'entries', 'Billets gratuits et accès VIP', 'ticket', 'cyan', 1),
    ('Avantages Events', 'event-perks', 'Skip queue, accès backstage...', 'star', 'yellow', 2),
    ('Réductions', 'discounts', 'Réductions sur les prochains events', 'percent', 'green', 3),
    ('Goodies', 'goodies', 'Produits dérivés exclusifs', 'gift', 'purple', 4),
    ('Expériences', 'experiences', 'Meet & Greet, sessions DJ...', 'sparkles', 'pink', 5),
    ('Personnalisation', 'customization', 'Cadres, titres, couleurs profil', 'palette', 'orange', 6),
    ('Mystery Box', 'mystery', 'Boîtes surprises avec récompenses aléatoires', 'box', 'red', 7)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEED DATA - REWARDS
-- ============================================================================

-- Entrées & Accès
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, min_level, reward_type, reward_value, is_featured, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'entries'),
        'Entrée Gratuite',
        'Une entrée gratuite pour n''importe quel événement Teen''s Party Morocco. Valable 3 mois.',
        'Entrée gratuite (valable 3 mois)',
        'ticket',
        5000, 'unlimited', 5,
        'free_entry',
        '{"valid_days": 90, "event_type": "any"}',
        TRUE, 1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'entries'),
        'Pass VIP Event',
        'Accès VIP pour un événement : entrée prioritaire, zone VIP, et boisson offerte.',
        'Pass VIP complet pour un event',
        'crown',
        12000, 'limited', 15,
        'exclusive_access',
        '{"access_type": "vip", "includes": ["priority_entry", "vip_zone", "free_drink"]}',
        TRUE, 2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'entries'),
        'Entrée + 1 Ami',
        'Une entrée pour toi et un ami gratuitement. Parce que c''est mieux à deux !',
        'Entrée duo gratuite',
        'users',
        8000, 'unlimited', 10,
        'free_entry',
        '{"valid_days": 60, "quantity": 2}',
        FALSE, 3
    )
ON CONFLICT DO NOTHING;

-- Avantages Events
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, min_level, reward_type, reward_value, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'event-perks'),
        'Skip Queue',
        'Coupe-file garanti pour ton prochain événement. Fini les longues files d''attente !',
        'Coupe-file pour un event',
        'zap',
        2000, 'unlimited', 3,
        'skip_queue',
        '{"valid_events": 1}',
        1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'event-perks'),
        'Accès Backstage',
        'Découvre les coulisses ! Visite exclusive backstage pendant un event.',
        'Visite backstage exclusive',
        'door-open',
        8000, 'limited', 20,
        'exclusive_access',
        '{"access_type": "backstage", "duration_minutes": 30}',
        2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'event-perks'),
        'Table Réservée',
        'Une table réservée pour toi et 3 amis dans la zone premium.',
        'Table VIP pour 4 personnes',
        'armchair',
        15000, 'limited', 25,
        'exclusive_access',
        '{"access_type": "reserved_table", "capacity": 4}',
        3
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'event-perks'),
        'Photo avec DJ',
        'Session photo exclusive avec le DJ de la soirée. Immortalise le moment !',
        'Photo avec l''artiste',
        'camera',
        6000, 'limited', 15,
        'experience',
        '{"experience_type": "photo_session", "with": "dj"}',
        4
    )
ON CONFLICT DO NOTHING;

-- Réductions
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, min_level, reward_type, reward_value, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'discounts'),
        '-20% sur l''entrée',
        'Réduction de 20% sur ta prochaine entrée. Cumulable avec d''autres offres.',
        '20% de réduction',
        'percent',
        1000, 'unlimited', 1,
        'discount',
        '{"discount_percent": 20, "applies_to": "entry"}',
        1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'discounts'),
        '-50% sur l''entrée',
        'Grosse réduction de 50% sur une entrée. Offre limitée !',
        '50% de réduction',
        'badge-percent',
        3000, 'unlimited', 10,
        'discount',
        '{"discount_percent": 50, "applies_to": "entry"}',
        2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'discounts'),
        '-30% au Bar',
        'Réduction de 30% sur toutes les boissons pendant un event.',
        '30% sur les boissons',
        'glass-water',
        2500, 'unlimited', 8,
        'discount',
        '{"discount_percent": 30, "applies_to": "bar"}',
        3
    )
ON CONFLICT DO NOTHING;

-- Goodies
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, stock_quantity, stock_remaining, min_level, reward_type, reward_value, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'goodies'),
        'T-Shirt Teen''s Party',
        'T-shirt officiel Teen''s Party Morocco. Design exclusif, 100% coton.',
        'T-shirt officiel exclusif',
        'shirt',
        7000, 'limited', 100, 100, 10,
        'physical_item',
        '{"item_type": "tshirt", "sizes": ["S", "M", "L", "XL"]}',
        1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'goodies'),
        'Casquette Teen''s Party',
        'Casquette snapback officielle avec logo brodé.',
        'Casquette officielle',
        'hard-hat',
        4500, 'limited', 50, 50, 8,
        'physical_item',
        '{"item_type": "cap"}',
        2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'goodies'),
        'Bracelet LED',
        'Bracelet lumineux LED connecté aux beats du DJ.',
        'Bracelet LED interactif',
        'watch',
        3000, 'limited', 200, 200, 5,
        'physical_item',
        '{"item_type": "led_bracelet"}',
        3
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'goodies'),
        'Sticker Pack',
        'Pack de 10 stickers holographiques Teen''s Party.',
        'Pack 10 stickers holo',
        'sticker',
        1500, 'unlimited', NULL, NULL, 1,
        'physical_item',
        '{"item_type": "stickers", "quantity": 10}',
        4
    )
ON CONFLICT DO NOTHING;

-- Expériences
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, stock_quantity, stock_remaining, min_level, vip_only, reward_type, reward_value, is_featured, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'experiences'),
        'Meet & Greet Artiste',
        'Rencontre exclusive avec l''artiste principal de la soirée. Durée : 15 minutes.',
        'Rencontre VIP avec l''artiste',
        'handshake',
        25000, 'limited', 5, 5, 30, TRUE,
        'experience',
        '{"experience_type": "meet_greet", "duration_minutes": 15}',
        TRUE, 1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'experiences'),
        'Mini Session DJ',
        'Apprends les bases du mix avec notre DJ résident pendant 30 minutes.',
        'Initiation DJ (30 min)',
        'disc',
        18000, 'limited', 10, 10, 25, FALSE,
        'experience',
        '{"experience_type": "dj_session", "duration_minutes": 30}',
        FALSE, 2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'experiences'),
        'Anniversaire VIP',
        'Célèbre ton anniversaire en VIP : annonce micro, gâteau, et zone réservée.',
        'Pack Anniversaire VIP',
        'cake',
        20000, 'limited', 20, 20, 15, FALSE,
        'experience',
        '{"experience_type": "birthday_vip", "includes": ["announcement", "cake", "reserved_zone"]}',
        TRUE, 3
    )
ON CONFLICT DO NOTHING;

-- Personnalisation
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, min_level, reward_type, reward_value, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'customization'),
        'Cadre Avatar Gold',
        'Cadre doré animé pour ton avatar. Montre ton statut !',
        'Cadre doré animé',
        'frame',
        2000, 'unlimited', 5,
        'profile_customization',
        '{"type": "avatar_frame", "frame_id": "gold_animated"}',
        1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'customization'),
        'Titre "Party Legend"',
        'Titre spécial affiché sous ton pseudo.',
        'Titre exclusif',
        'badge',
        3500, 'unique', 10,
        'profile_customization',
        '{"type": "title", "title": "Party Legend"}',
        2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'customization'),
        'Couleur Pseudo Rainbow',
        'Ton pseudo en dégradé arc-en-ciel animé.',
        'Pseudo multicolore animé',
        'palette',
        5000, 'unlimited', 20,
        'profile_customization',
        '{"type": "name_color", "color_id": "rainbow_animated"}',
        3
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'customization'),
        'Badge Vérifié',
        'Badge de vérification à côté de ton pseudo. Le vrai flex.',
        'Badge ✓ vérifié',
        'badge-check',
        10000, 'unique', 30,
        'profile_customization',
        '{"type": "verified_badge"}',
        4
    )
ON CONFLICT DO NOTHING;

-- Mystery Box
INSERT INTO shop_rewards (
    category_id, name, description, short_description, icon,
    xp_cost, stock_type, min_level, reward_type, reward_value, is_new, display_order
) VALUES
    (
        (SELECT id FROM reward_categories WHERE slug = 'mystery'),
        'Mystery Box Bronze',
        'Boîte mystère avec récompense aléatoire. Peut contenir : réductions, XP bonus, goodies...',
        'Boîte surprise (petite)',
        'box',
        1500, 'unlimited', 1,
        'mystery_box',
        '{"tier": "bronze", "possible_rewards": ["discount_10", "xp_500", "sticker"]}',
        TRUE, 1
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'mystery'),
        'Mystery Box Silver',
        'Boîte mystère premium. Chances de gagner une entrée gratuite ou des goodies rares !',
        'Boîte surprise (moyenne)',
        'box',
        4000, 'unlimited', 10,
        'mystery_box',
        '{"tier": "silver", "possible_rewards": ["discount_30", "xp_2000", "free_entry", "cap"]}',
        TRUE, 2
    ),
    (
        (SELECT id FROM reward_categories WHERE slug = 'mystery'),
        'Mystery Box Gold',
        'La boîte ultime ! Récompenses exclusives garanties. Peut contenir des expériences VIP !',
        'Boîte surprise (grande)',
        'crown',
        10000, 'unlimited', 25,
        'mystery_box',
        '{"tier": "gold", "possible_rewards": ["vip_pass", "meet_greet", "tshirt", "xp_5000"]}',
        TRUE, 3
    )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour récupérer les récompenses disponibles
CREATE OR REPLACE FUNCTION get_shop_rewards(
    p_user_id UUID,
    p_category_slug VARCHAR DEFAULT NULL,
    p_only_affordable BOOLEAN DEFAULT FALSE,
    p_only_available BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
    reward_id UUID,
    category_id UUID,
    category_name VARCHAR,
    category_slug VARCHAR,
    name VARCHAR,
    description TEXT,
    short_description VARCHAR,
    image_url TEXT,
    icon VARCHAR,
    xp_cost INT,
    original_xp_cost INT,
    stock_type VARCHAR,
    stock_remaining INT,
    min_level INT,
    required_badge_id UUID,
    vip_only BOOLEAN,
    reward_type VARCHAR,
    reward_value JSONB,
    is_featured BOOLEAN,
    is_new BOOLEAN,
    can_purchase BOOLEAN,
    user_purchase_count INT,
    purchase_limit INT,
    is_in_wishlist BOOLEAN
) AS $$
DECLARE
    v_user_level INT;
    v_user_xp INT;
    v_user_vip_tier VARCHAR;
BEGIN
    -- Get user info
    SELECT level, total_xp INTO v_user_level, v_user_xp
    FROM profiles WHERE id = p_user_id;

    v_user_level := COALESCE(v_user_level, 1);
    v_user_xp := COALESCE(v_user_xp, 0);

    RETURN QUERY
    SELECT
        sr.id as reward_id,
        sr.category_id,
        rc.name as category_name,
        rc.slug as category_slug,
        sr.name,
        sr.description,
        sr.short_description,
        sr.image_url,
        sr.icon,
        sr.xp_cost,
        sr.original_xp_cost,
        sr.stock_type,
        sr.stock_remaining,
        sr.min_level,
        sr.required_badge_id,
        sr.vip_only,
        sr.reward_type,
        sr.reward_value,
        sr.is_featured,
        sr.is_new,
        -- Can purchase check
        (
            sr.is_active
            AND v_user_level >= sr.min_level
            AND v_user_xp >= sr.xp_cost
            AND (sr.stock_type = 'unlimited' OR COALESCE(sr.stock_remaining, 0) > 0)
            AND (sr.available_from IS NULL OR sr.available_from <= NOW())
            AND (sr.available_until IS NULL OR sr.available_until >= NOW())
            AND (
                sr.purchase_limit_per_user IS NULL
                OR (
                    SELECT COUNT(*) FROM user_purchases up
                    WHERE up.user_id = p_user_id
                    AND up.reward_id = sr.id
                    AND up.status != 'refunded'
                ) < sr.purchase_limit_per_user
            )
        ) as can_purchase,
        -- User purchase count
        (
            SELECT COUNT(*)::INT FROM user_purchases up
            WHERE up.user_id = p_user_id
            AND up.reward_id = sr.id
            AND up.status != 'refunded'
        ) as user_purchase_count,
        sr.purchase_limit_per_user as purchase_limit,
        -- Is in wishlist
        EXISTS(
            SELECT 1 FROM user_wishlists uw
            WHERE uw.user_id = p_user_id AND uw.reward_id = sr.id
        ) as is_in_wishlist
    FROM shop_rewards sr
    LEFT JOIN reward_categories rc ON sr.category_id = rc.id
    WHERE sr.is_active = TRUE
        AND (p_category_slug IS NULL OR rc.slug = p_category_slug)
        AND (NOT p_only_available OR (
            (sr.available_from IS NULL OR sr.available_from <= NOW())
            AND (sr.available_until IS NULL OR sr.available_until >= NOW())
        ))
        AND (NOT p_only_affordable OR v_user_xp >= sr.xp_cost)
    ORDER BY sr.is_featured DESC, rc.display_order, sr.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour acheter une récompense
CREATE OR REPLACE FUNCTION purchase_reward(
    p_user_id UUID,
    p_reward_id UUID,
    p_promo_code VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_reward shop_rewards%ROWTYPE;
    v_user_xp INT;
    v_user_level INT;
    v_final_cost INT;
    v_discount INT := 0;
    v_promo_id UUID;
    v_purchase_id UUID;
    v_purchase_count INT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Lock the reward row
    SELECT * INTO v_reward FROM shop_rewards WHERE id = p_reward_id FOR UPDATE;

    IF v_reward IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense non trouvée');
    END IF;

    IF NOT v_reward.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense non disponible');
    END IF;

    -- Check availability dates
    IF v_reward.available_from IS NOT NULL AND v_reward.available_from > NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense pas encore disponible');
    END IF;

    IF v_reward.available_until IS NOT NULL AND v_reward.available_until < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense expirée');
    END IF;

    -- Check stock
    IF v_reward.stock_type != 'unlimited' AND COALESCE(v_reward.stock_remaining, 0) <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rupture de stock');
    END IF;

    -- Get user info
    SELECT total_xp, level INTO v_user_xp, v_user_level
    FROM profiles WHERE id = p_user_id;

    -- Check level requirement
    IF COALESCE(v_user_level, 1) < v_reward.min_level THEN
        RETURN jsonb_build_object('success', false, 'error', 'Niveau insuffisant');
    END IF;

    -- Check purchase limit
    IF v_reward.purchase_limit_per_user IS NOT NULL THEN
        SELECT COUNT(*) INTO v_purchase_count
        FROM user_purchases
        WHERE user_id = p_user_id
        AND reward_id = p_reward_id
        AND status != 'refunded';

        IF v_purchase_count >= v_reward.purchase_limit_per_user THEN
            RETURN jsonb_build_object('success', false, 'error', 'Limite d''achat atteinte');
        END IF;
    END IF;

    -- Apply promo code if provided
    v_final_cost := v_reward.xp_cost;

    IF p_promo_code IS NOT NULL THEN
        SELECT id INTO v_promo_id
        FROM shop_promo_codes
        WHERE code = UPPER(p_promo_code)
            AND is_active = TRUE
            AND valid_from <= NOW()
            AND (valid_until IS NULL OR valid_until >= NOW())
            AND (max_uses IS NULL OR current_uses < max_uses)
            AND (
                applicable_reward_ids IS NULL
                OR p_reward_id = ANY(applicable_reward_ids)
            )
            AND (
                applicable_category_ids IS NULL
                OR v_reward.category_id = ANY(applicable_category_ids)
            );

        IF v_promo_id IS NOT NULL THEN
            -- Check user usage
            IF NOT EXISTS (
                SELECT 1 FROM promo_code_uses
                WHERE promo_code_id = v_promo_id AND user_id = p_user_id
                HAVING COUNT(*) >= (SELECT max_uses_per_user FROM shop_promo_codes WHERE id = v_promo_id)
            ) THEN
                SELECT
                    CASE
                        WHEN discount_type = 'percentage' THEN v_reward.xp_cost * discount_value / 100
                        ELSE discount_value
                    END INTO v_discount
                FROM shop_promo_codes WHERE id = v_promo_id;

                v_final_cost := GREATEST(0, v_reward.xp_cost - v_discount);
            END IF;
        END IF;
    END IF;

    -- Check XP
    IF COALESCE(v_user_xp, 0) < v_final_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'XP insuffisants');
    END IF;

    -- Calculate expiry for certain reward types
    IF v_reward.reward_type IN ('free_entry', 'discount', 'skip_queue') THEN
        v_expires_at := NOW() + INTERVAL '90 days';
    ELSIF v_reward.reward_type = 'xp_multiplier' THEN
        v_expires_at := NOW() + INTERVAL '24 hours';
    END IF;

    -- Deduct XP
    UPDATE profiles
    SET total_xp = total_xp - v_final_cost
    WHERE id = p_user_id;

    -- Update stock
    IF v_reward.stock_type != 'unlimited' THEN
        UPDATE shop_rewards
        SET stock_remaining = stock_remaining - 1
        WHERE id = p_reward_id;
    END IF;

    -- Create purchase record
    INSERT INTO user_purchases (user_id, reward_id, xp_spent, expires_at)
    VALUES (p_user_id, p_reward_id, v_final_cost, v_expires_at)
    RETURNING id INTO v_purchase_id;

    -- Record promo code use
    IF v_promo_id IS NOT NULL AND v_discount > 0 THEN
        INSERT INTO promo_code_uses (promo_code_id, user_id, purchase_id, xp_saved)
        VALUES (v_promo_id, p_user_id, v_purchase_id, v_discount);

        UPDATE shop_promo_codes
        SET current_uses = current_uses + 1
        WHERE id = v_promo_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', v_purchase_id,
        'xp_spent', v_final_cost,
        'discount_applied', v_discount,
        'reward_name', v_reward.name,
        'reward_type', v_reward.reward_type,
        'reward_value', v_reward.reward_value,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour récupérer les achats d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_purchases(
    p_user_id UUID,
    p_status VARCHAR DEFAULT NULL,
    p_include_expired BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    purchase_id UUID,
    reward_id UUID,
    reward_name VARCHAR,
    reward_description TEXT,
    reward_icon VARCHAR,
    reward_type VARCHAR,
    reward_value JSONB,
    xp_spent INT,
    status VARCHAR,
    purchased_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_expired BOOLEAN,
    is_usable BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        up.id as purchase_id,
        sr.id as reward_id,
        sr.name as reward_name,
        sr.description as reward_description,
        sr.icon as reward_icon,
        sr.reward_type,
        sr.reward_value,
        up.xp_spent,
        up.status,
        up.created_at as purchased_at,
        up.used_at,
        up.expires_at,
        (up.expires_at IS NOT NULL AND up.expires_at < NOW()) as is_expired,
        (up.status = 'completed' AND (up.expires_at IS NULL OR up.expires_at >= NOW())) as is_usable
    FROM user_purchases up
    JOIN shop_rewards sr ON up.reward_id = sr.id
    WHERE up.user_id = p_user_id
        AND (p_status IS NULL OR up.status = p_status)
        AND (p_include_expired OR up.expires_at IS NULL OR up.expires_at >= NOW() OR up.status != 'completed')
    ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour utiliser une récompense
CREATE OR REPLACE FUNCTION use_reward(
    p_user_id UUID,
    p_purchase_id UUID,
    p_event_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_purchase user_purchases%ROWTYPE;
    v_reward shop_rewards%ROWTYPE;
BEGIN
    SELECT * INTO v_purchase FROM user_purchases
    WHERE id = p_purchase_id AND user_id = p_user_id FOR UPDATE;

    IF v_purchase IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Achat non trouvé');
    END IF;

    IF v_purchase.status != 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense déjà utilisée ou expirée');
    END IF;

    IF v_purchase.expires_at IS NOT NULL AND v_purchase.expires_at < NOW() THEN
        UPDATE user_purchases SET status = 'expired' WHERE id = p_purchase_id;
        RETURN jsonb_build_object('success', false, 'error', 'Récompense expirée');
    END IF;

    SELECT * INTO v_reward FROM shop_rewards WHERE id = v_purchase.reward_id;

    UPDATE user_purchases
    SET status = 'used', used_at = NOW(), used_at_event_id = p_event_id
    WHERE id = p_purchase_id;

    RETURN jsonb_build_object(
        'success', true,
        'reward_type', v_reward.reward_type,
        'reward_value', v_reward.reward_value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour ajouter/retirer de la wishlist
CREATE OR REPLACE FUNCTION toggle_wishlist(
    p_user_id UUID,
    p_reward_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM user_wishlists
        WHERE user_id = p_user_id AND reward_id = p_reward_id
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM user_wishlists
        WHERE user_id = p_user_id AND reward_id = p_reward_id;
        RETURN jsonb_build_object('success', true, 'action', 'removed');
    ELSE
        INSERT INTO user_wishlists (user_id, reward_id)
        VALUES (p_user_id, p_reward_id);
        RETURN jsonb_build_object('success', true, 'action', 'added');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE reward_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wishlists ENABLE ROW LEVEL SECURITY;

-- Categories: everyone can read
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON reward_categories;
CREATE POLICY "Categories are viewable by everyone" ON reward_categories
    FOR SELECT USING (is_active = TRUE);

-- Rewards: everyone can read active ones
DROP POLICY IF EXISTS "Active rewards are viewable by everyone" ON shop_rewards;
CREATE POLICY "Active rewards are viewable by everyone" ON shop_rewards
    FOR SELECT USING (is_active = TRUE);

-- Purchases: users can only see their own
DROP POLICY IF EXISTS "Users can view own purchases" ON user_purchases;
CREATE POLICY "Users can view own purchases" ON user_purchases
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own purchases" ON user_purchases;
CREATE POLICY "Users can insert own purchases" ON user_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Promo codes: read only for validation
DROP POLICY IF EXISTS "Promo codes are readable for validation" ON shop_promo_codes;
CREATE POLICY "Promo codes are readable for validation" ON shop_promo_codes
    FOR SELECT USING (is_active = TRUE);

-- Promo uses: users see their own
DROP POLICY IF EXISTS "Users can view own promo uses" ON promo_code_uses;
CREATE POLICY "Users can view own promo uses" ON promo_code_uses
    FOR SELECT USING (auth.uid() = user_id);

-- Wishlists: users manage their own
DROP POLICY IF EXISTS "Users can manage own wishlist" ON user_wishlists;
CREATE POLICY "Users can manage own wishlist" ON user_wishlists
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_shop_reward_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shop_rewards_updated_at ON shop_rewards;
CREATE TRIGGER shop_rewards_updated_at
    BEFORE UPDATE ON shop_rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_shop_reward_timestamp();


-- ============================================================================
-- 005_fortune_wheel.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Fortune Wheel System
-- Migration: 005_fortune_wheel.sql
-- Description: Système de Roue de la Fortune quotidienne
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Table des segments de la roue
CREATE TABLE IF NOT EXISTS wheel_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_index INT NOT NULL UNIQUE, -- Position sur la roue (0-11)
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(50) NOT NULL, -- Couleur du segment
    icon VARCHAR(50) NOT NULL DEFAULT 'gift',

    -- Reward configuration
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN (
        'xp', 'xp_multiplier', 'shop_discount', 'free_spin',
        'badge', 'mystery_box', 'nothing', 'jackpot'
    )),
    reward_value JSONB NOT NULL DEFAULT '{}',

    -- Probability (sur 1000 pour plus de précision)
    probability INT NOT NULL CHECK (probability >= 0 AND probability <= 1000),

    -- Availability
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    min_level INT DEFAULT 1,
    vip_only BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des spins utilisateurs
CREATE TABLE IF NOT EXISTS user_wheel_spins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    segment_id UUID NOT NULL REFERENCES wheel_segments(id),

    -- Result
    reward_type VARCHAR(50) NOT NULL,
    reward_value JSONB NOT NULL,
    xp_earned INT DEFAULT 0,

    -- Metadata
    spin_type VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (spin_type IN ('daily', 'bonus', 'purchased', 'reward')),
    spin_date DATE NOT NULL DEFAULT CURRENT_DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des spins bonus (extra spins gagnés ou achetés)
CREATE TABLE IF NOT EXISTS user_bonus_spins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    spins_remaining INT NOT NULL DEFAULT 0,
    source VARCHAR(50) NOT NULL, -- 'purchase', 'reward', 'achievement', 'mission', 'streak'
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table pour les streaks de roue (spins consécutifs)
CREATE TABLE IF NOT EXISTS wheel_streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INT NOT NULL DEFAULT 0,
    best_streak INT NOT NULL DEFAULT 0,
    last_spin_date DATE,
    streak_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des jackpots
CREATE TABLE IF NOT EXISTS wheel_jackpots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    current_pool INT NOT NULL DEFAULT 0, -- XP accumulés dans le jackpot
    contribution_percent INT NOT NULL DEFAULT 5, -- % de chaque gain ajouté au pot
    min_pool INT NOT NULL DEFAULT 10000, -- Minimum avant qu'il soit gagnable
    winner_id UUID REFERENCES auth.users(id),
    won_at TIMESTAMPTZ,
    won_amount INT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_wheel_spins_user ON user_wheel_spins(user_id);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_date ON user_wheel_spins(spin_date);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_user_date ON user_wheel_spins(user_id, spin_date);
CREATE INDEX IF NOT EXISTS idx_bonus_spins_user ON user_bonus_spins(user_id);

-- ============================================================================
-- SEED DATA - SEGMENTS
-- ============================================================================

-- Roue de 12 segments avec probabilités variées
INSERT INTO wheel_segments (segment_index, name, description, color, icon, reward_type, reward_value, probability) VALUES
    -- XP rewards (60% total)
    (0, '50 XP', 'Petit boost d''XP', '#22c55e', 'zap', 'xp', '{"amount": 50}', 200),
    (1, '100 XP', 'Bon gain d''XP', '#16a34a', 'zap', 'xp', '{"amount": 100}', 150),
    (2, '200 XP', 'Gros gain d''XP', '#15803d', 'zap', 'xp', '{"amount": 200}', 100),
    (3, '500 XP', 'Jackpot XP!', '#166534', 'zap', 'xp', '{"amount": 500}', 50),

    -- Multipliers (15% total)
    (4, '×2 XP (1h)', 'Double XP pendant 1 heure', '#f59e0b', 'trending-up', 'xp_multiplier', '{"multiplier": 2, "duration_minutes": 60}', 100),
    (5, '×3 XP (30min)', 'Triple XP pendant 30 minutes', '#d97706', 'trending-up', 'xp_multiplier', '{"multiplier": 3, "duration_minutes": 30}', 50),

    -- Shop discounts (10% total)
    (6, '-10% Boutique', 'Réduction sur un achat', '#06b6d4', 'percent', 'shop_discount', '{"percent": 10, "valid_hours": 24}', 70),
    (7, '-25% Boutique', 'Grosse réduction boutique', '#0891b2', 'percent', 'shop_discount', '{"percent": 25, "valid_hours": 12}', 30),

    -- Special rewards (10% total)
    (8, 'Mystery Box', 'Boîte mystère surprise', '#8b5cf6', 'box', 'mystery_box', '{"tier": "bronze"}', 60),
    (9, 'Spin Bonus', 'Un tour gratuit en plus!', '#ec4899', 'rotate-cw', 'free_spin', '{"spins": 1}', 40),

    -- Nothing / Jackpot (5% total)
    (10, 'Presque...', 'Pas de chance cette fois', '#64748b', 'x', 'nothing', '{}', 45),
    (11, 'JACKPOT!', 'Remporte la cagnotte!', '#eab308', 'crown', 'jackpot', '{}', 5)
ON CONFLICT (segment_index) DO NOTHING;

-- Créer le jackpot initial
INSERT INTO wheel_jackpots (name, current_pool, contribution_percent, min_pool)
VALUES ('Jackpot Principal', 5000, 5, 10000)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Initialiser le streak pour un nouvel utilisateur
CREATE OR REPLACE FUNCTION init_wheel_streak()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wheel_streaks (user_id, current_streak, best_streak, streak_multiplier)
    VALUES (NEW.id, 0, 0, 1.0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour initialiser le streak
DROP TRIGGER IF EXISTS init_wheel_streak_trigger ON auth.users;
CREATE TRIGGER init_wheel_streak_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION init_wheel_streak();

-- Vérifier si l'utilisateur peut tourner
CREATE OR REPLACE FUNCTION can_spin_wheel(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_last_daily_spin DATE;
    v_bonus_spins INT;
    v_streak INT;
    v_streak_multiplier DECIMAL;
BEGIN
    -- Vérifier le dernier spin quotidien
    SELECT spin_date INTO v_last_daily_spin
    FROM user_wheel_spins
    WHERE user_id = p_user_id AND spin_type = 'daily'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Compter les spins bonus disponibles
    SELECT COALESCE(SUM(spins_remaining), 0) INTO v_bonus_spins
    FROM user_bonus_spins
    WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > NOW())
    AND spins_remaining > 0;

    -- Récupérer le streak
    SELECT current_streak, streak_multiplier INTO v_streak, v_streak_multiplier
    FROM wheel_streaks WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'can_spin_daily', v_last_daily_spin IS NULL OR v_last_daily_spin < CURRENT_DATE,
        'bonus_spins', COALESCE(v_bonus_spins, 0),
        'current_streak', COALESCE(v_streak, 0),
        'streak_multiplier', COALESCE(v_streak_multiplier, 1.0),
        'next_spin_at', CASE
            WHEN v_last_daily_spin IS NULL OR v_last_daily_spin < CURRENT_DATE THEN NULL
            ELSE (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMPTZ
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tourner la roue
CREATE OR REPLACE FUNCTION spin_wheel(p_user_id UUID, p_spin_type VARCHAR DEFAULT 'daily')
RETURNS JSONB AS $$
DECLARE
    v_can_spin JSONB;
    v_random INT;
    v_cumulative INT := 0;
    v_segment wheel_segments%ROWTYPE;
    v_streak_record wheel_streaks%ROWTYPE;
    v_final_xp INT := 0;
    v_spin_id UUID;
    v_jackpot_amount INT;
    v_reward_result JSONB;
BEGIN
    -- Vérifier si peut tourner
    v_can_spin := can_spin_wheel(p_user_id);

    IF p_spin_type = 'daily' AND NOT (v_can_spin->>'can_spin_daily')::BOOLEAN THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu as déjà tourné aujourd''hui');
    END IF;

    IF p_spin_type = 'bonus' AND (v_can_spin->>'bonus_spins')::INT <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pas de spin bonus disponible');
    END IF;

    -- Récupérer le streak
    SELECT * INTO v_streak_record FROM wheel_streaks WHERE user_id = p_user_id;

    -- Générer un nombre aléatoire (0-999)
    v_random := floor(random() * 1000);

    -- Sélectionner le segment basé sur la probabilité
    FOR v_segment IN
        SELECT * FROM wheel_segments
        WHERE is_active = TRUE
        ORDER BY segment_index
    LOOP
        v_cumulative := v_cumulative + v_segment.probability;
        IF v_random < v_cumulative THEN
            EXIT;
        END IF;
    END LOOP;

    -- Calculer la récompense
    v_reward_result := v_segment.reward_value;

    CASE v_segment.reward_type
        WHEN 'xp' THEN
            -- Appliquer le multiplicateur de streak
            v_final_xp := ((v_segment.reward_value->>'amount')::INT *
                          COALESCE(v_streak_record.streak_multiplier, 1.0))::INT;
            v_reward_result := jsonb_set(v_reward_result, '{amount}', to_jsonb(v_final_xp));

            -- Ajouter les XP au profil
            UPDATE profiles SET total_xp = total_xp + v_final_xp WHERE id = p_user_id;

            -- Contribuer au jackpot
            UPDATE wheel_jackpots
            SET current_pool = current_pool + (v_final_xp * contribution_percent / 100)
            WHERE is_active = TRUE AND winner_id IS NULL;

        WHEN 'xp_multiplier' THEN
            -- Créer un bonus XP temporaire (à gérer dans l'application)
            v_reward_result := v_segment.reward_value;

        WHEN 'shop_discount' THEN
            -- Créer un code promo temporaire
            INSERT INTO shop_promo_codes (
                code, description, discount_type, discount_value,
                max_uses, max_uses_per_user, valid_until
            ) VALUES (
                'WHEEL' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
                'Réduction Roue de la Fortune',
                'percentage',
                (v_segment.reward_value->>'percent')::INT,
                1, 1,
                NOW() + ((v_segment.reward_value->>'valid_hours')::INT || ' hours')::INTERVAL
            );

        WHEN 'free_spin' THEN
            -- Ajouter un spin bonus
            INSERT INTO user_bonus_spins (user_id, spins_remaining, source, expires_at)
            VALUES (p_user_id, (v_segment.reward_value->>'spins')::INT, 'wheel', NOW() + INTERVAL '7 days');

        WHEN 'mystery_box' THEN
            -- Donner une mystery box (à implémenter côté application)
            v_reward_result := v_segment.reward_value;

        WHEN 'jackpot' THEN
            -- Vérifier si le jackpot est gagnable
            SELECT current_pool INTO v_jackpot_amount
            FROM wheel_jackpots
            WHERE is_active = TRUE AND winner_id IS NULL AND current_pool >= min_pool
            LIMIT 1;

            IF v_jackpot_amount IS NOT NULL THEN
                -- Jackpot gagné!
                v_final_xp := v_jackpot_amount;
                UPDATE profiles SET total_xp = total_xp + v_jackpot_amount WHERE id = p_user_id;

                UPDATE wheel_jackpots
                SET winner_id = p_user_id, won_at = NOW(), won_amount = v_jackpot_amount, is_active = FALSE
                WHERE is_active = TRUE AND winner_id IS NULL;

                -- Créer un nouveau jackpot
                INSERT INTO wheel_jackpots (name, current_pool, contribution_percent, min_pool)
                VALUES ('Jackpot Principal', 5000, 5, 10000);

                v_reward_result := jsonb_build_object('jackpot_won', true, 'amount', v_jackpot_amount);
            ELSE
                -- Jackpot pas encore assez gros, donner 500 XP de consolation
                v_final_xp := 500;
                UPDATE profiles SET total_xp = total_xp + 500 WHERE id = p_user_id;
                v_reward_result := jsonb_build_object('jackpot_won', false, 'consolation_xp', 500);
            END IF;

        WHEN 'nothing' THEN
            v_reward_result := jsonb_build_object('message', 'Pas de chance cette fois!');
    END CASE;

    -- Enregistrer le spin
    INSERT INTO user_wheel_spins (user_id, segment_id, reward_type, reward_value, xp_earned, spin_type)
    VALUES (p_user_id, v_segment.id, v_segment.reward_type, v_reward_result, v_final_xp, p_spin_type)
    RETURNING id INTO v_spin_id;

    -- Décrémenter un spin bonus si utilisé
    IF p_spin_type = 'bonus' THEN
        UPDATE user_bonus_spins
        SET spins_remaining = spins_remaining - 1
        WHERE id = (
            SELECT id FROM user_bonus_spins
            WHERE user_id = p_user_id AND spins_remaining > 0
            AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY created_at
            LIMIT 1
        );
    END IF;

    -- Mettre à jour le streak
    IF p_spin_type = 'daily' THEN
        IF v_streak_record.last_spin_date = CURRENT_DATE - 1 THEN
            -- Streak continue
            UPDATE wheel_streaks
            SET current_streak = current_streak + 1,
                best_streak = GREATEST(best_streak, current_streak + 1),
                last_spin_date = CURRENT_DATE,
                streak_multiplier = LEAST(2.0, 1.0 + (current_streak + 1) * 0.05),
                updated_at = NOW()
            WHERE user_id = p_user_id;
        ELSIF v_streak_record.last_spin_date IS NULL OR v_streak_record.last_spin_date < CURRENT_DATE - 1 THEN
            -- Nouveau streak ou streak cassé
            UPDATE wheel_streaks
            SET current_streak = 1,
                last_spin_date = CURRENT_DATE,
                streak_multiplier = 1.05,
                updated_at = NOW()
            WHERE user_id = p_user_id;

            -- Insérer si n'existe pas
            IF NOT FOUND THEN
                INSERT INTO wheel_streaks (user_id, current_streak, best_streak, last_spin_date, streak_multiplier)
                VALUES (p_user_id, 1, 1, CURRENT_DATE, 1.05);
            END IF;
        END IF;
    END IF;

    -- Récupérer le nouveau streak
    SELECT current_streak, streak_multiplier INTO v_streak_record.current_streak, v_streak_record.streak_multiplier
    FROM wheel_streaks WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'spin_id', v_spin_id,
        'segment_index', v_segment.segment_index,
        'segment_name', v_segment.name,
        'segment_color', v_segment.color,
        'segment_icon', v_segment.icon,
        'reward_type', v_segment.reward_type,
        'reward_value', v_reward_result,
        'xp_earned', v_final_xp,
        'current_streak', COALESCE(v_streak_record.current_streak, 1),
        'streak_multiplier', COALESCE(v_streak_record.streak_multiplier, 1.05)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Récupérer l'historique des spins
CREATE OR REPLACE FUNCTION get_wheel_history(
    p_user_id UUID,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    spin_id UUID,
    segment_name VARCHAR,
    segment_color VARCHAR,
    segment_icon VARCHAR,
    reward_type VARCHAR,
    reward_value JSONB,
    xp_earned INT,
    spin_type VARCHAR,
    spun_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        uws.id as spin_id,
        ws.name as segment_name,
        ws.color as segment_color,
        ws.icon as segment_icon,
        uws.reward_type,
        uws.reward_value,
        uws.xp_earned,
        uws.spin_type,
        uws.created_at as spun_at
    FROM user_wheel_spins uws
    JOIN wheel_segments ws ON uws.segment_id = ws.id
    WHERE uws.user_id = p_user_id
    ORDER BY uws.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Récupérer les stats de la roue
CREATE OR REPLACE FUNCTION get_wheel_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_spins INT;
    v_total_xp INT;
    v_jackpots_won INT;
    v_best_reward JSONB;
    v_streak_record wheel_streaks%ROWTYPE;
    v_current_jackpot INT;
BEGIN
    -- Stats globales
    SELECT
        COUNT(*),
        COALESCE(SUM(xp_earned), 0)
    INTO v_total_spins, v_total_xp
    FROM user_wheel_spins WHERE user_id = p_user_id;

    -- Jackpots gagnés
    SELECT COUNT(*) INTO v_jackpots_won
    FROM wheel_jackpots WHERE winner_id = p_user_id;

    -- Meilleur gain
    SELECT jsonb_build_object(
        'reward_type', uws.reward_type,
        'xp_earned', uws.xp_earned,
        'date', uws.created_at
    ) INTO v_best_reward
    FROM user_wheel_spins uws
    WHERE user_id = p_user_id
    ORDER BY xp_earned DESC
    LIMIT 1;

    -- Streak
    SELECT * INTO v_streak_record FROM wheel_streaks WHERE user_id = p_user_id;

    -- Jackpot actuel
    SELECT current_pool INTO v_current_jackpot
    FROM wheel_jackpots WHERE is_active = TRUE AND winner_id IS NULL
    LIMIT 1;

    RETURN jsonb_build_object(
        'total_spins', COALESCE(v_total_spins, 0),
        'total_xp_earned', COALESCE(v_total_xp, 0),
        'jackpots_won', COALESCE(v_jackpots_won, 0),
        'best_reward', v_best_reward,
        'current_streak', COALESCE(v_streak_record.current_streak, 0),
        'best_streak', COALESCE(v_streak_record.best_streak, 0),
        'streak_multiplier', COALESCE(v_streak_record.streak_multiplier, 1.0),
        'current_jackpot', COALESCE(v_current_jackpot, 5000)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE wheel_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wheel_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bonus_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_jackpots ENABLE ROW LEVEL SECURITY;

-- Segments: readable by all
CREATE POLICY "Segments are readable by all" ON wheel_segments
    FOR SELECT USING (is_active = TRUE);

-- Spins: users see their own
CREATE POLICY "Users can view own spins" ON user_wheel_spins
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spins" ON user_wheel_spins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bonus spins: users see their own
CREATE POLICY "Users can view own bonus spins" ON user_bonus_spins
    FOR SELECT USING (auth.uid() = user_id);

-- Streaks: users see their own
CREATE POLICY "Users can view own streak" ON wheel_streaks
    FOR SELECT USING (auth.uid() = user_id);

-- Jackpots: readable by all
CREATE POLICY "Jackpots are readable by all" ON wheel_jackpots
    FOR SELECT USING (TRUE);


-- ============================================================================
-- 006_friend_challenges.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Friend Challenges System
-- Migration: 006_friend_challenges.sql
-- Description: Système de défis entre amis (duels et équipes)
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Types de défis entre amis
CREATE TABLE IF NOT EXISTS challenge_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT 'swords',
    color VARCHAR(50) NOT NULL DEFAULT 'cyan',

    -- Challenge configuration
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('duel', 'team', 'race', 'coop')),
    min_participants INT NOT NULL DEFAULT 2,
    max_participants INT NOT NULL DEFAULT 2,

    -- Objective
    objective_type VARCHAR(50) NOT NULL CHECK (objective_type IN (
        'xp_total', 'xp_daily', 'challenges_completed', 'events_attended',
        'streak_days', 'missions_completed', 'first_to_target', 'highest_score'
    )),
    default_target INT,
    default_duration_hours INT NOT NULL DEFAULT 168, -- 1 semaine par défaut

    -- Rewards
    winner_xp INT NOT NULL DEFAULT 500,
    participant_xp INT NOT NULL DEFAULT 100,
    draw_xp INT DEFAULT 250,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Défis entre amis
CREATE TABLE IF NOT EXISTS friend_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_type_id UUID REFERENCES challenge_types(id),

    -- Creator
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Configuration
    name VARCHAR(200),
    target_value INT,
    stake_xp INT DEFAULT 0, -- XP misé (optionnel)

    -- Timing
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'active', 'completed', 'cancelled', 'expired'
    )),

    -- Results
    winner_id UUID REFERENCES auth.users(id),
    winning_team VARCHAR(10),
    is_draw BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Participants aux défis
CREATE TABLE IF NOT EXISTS challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES friend_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Team (pour les défis en équipe)
    team VARCHAR(10) DEFAULT 'a' CHECK (team IN ('a', 'b')),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'declined', 'left'
    )),

    -- Progress
    current_score INT NOT NULL DEFAULT 0,
    start_score INT DEFAULT 0, -- Score au début du défi

    -- Rewards
    xp_earned INT DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,

    joined_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(challenge_id, user_id)
);

-- Historique de progression
CREATE TABLE IF NOT EXISTS challenge_progress_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES friend_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score_change INT NOT NULL,
    new_total INT NOT NULL,
    source VARCHAR(50), -- 'challenge', 'event', 'mission', etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages/Chat du défi
CREATE TABLE IF NOT EXISTS challenge_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES friend_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN (
        'text', 'taunt', 'cheer', 'milestone', 'system'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_friend_challenges_creator ON friend_challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_friend_challenges_status ON friend_challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_challenge ON challenge_progress_log(challenge_id);

-- ============================================================================
-- SEED DATA - CHALLENGE TYPES
-- ============================================================================

INSERT INTO challenge_types (slug, name, description, icon, color, mode, min_participants, max_participants, objective_type, default_target, default_duration_hours, winner_xp, participant_xp) VALUES
    -- Duels classiques
    ('xp_duel', 'Duel XP', 'Qui gagnera le plus d''XP pendant la période ?', 'swords', 'cyan', 'duel', 2, 2, 'xp_total', NULL, 168, 500, 100),
    ('daily_xp_duel', 'Sprint Quotidien', 'Duel XP sur 24 heures !', 'zap', 'yellow', 'duel', 2, 2, 'xp_daily', NULL, 24, 200, 50),
    ('challenge_race', 'Course aux Défis', 'Premier à compléter X défis gagne !', 'target', 'green', 'duel', 2, 2, 'challenges_completed', 10, 168, 400, 100),
    ('event_race', 'Parcours Events', 'Qui ira au plus d''events ?', 'calendar', 'pink', 'duel', 2, 2, 'events_attended', 3, 336, 600, 150),
    ('streak_challenge', 'Défi Streak', 'Qui tiendra le plus longtemps ?', 'flame', 'orange', 'duel', 2, 2, 'streak_days', 7, 168, 350, 100),

    -- Courses (plusieurs participants)
    ('xp_race', 'Course XP', 'Premier à atteindre l''objectif !', 'trophy', 'purple', 'race', 2, 8, 'first_to_target', 1000, 168, 800, 100),
    ('mission_race', 'Marathon Missions', 'Premier à finir X missions !', 'flag', 'blue', 'race', 2, 8, 'missions_completed', 15, 168, 600, 100),

    -- Défis en équipe
    ('team_xp_battle', 'Bataille d''Équipes', 'Équipe A vs Équipe B !', 'users', 'red', 'team', 4, 10, 'xp_total', NULL, 168, 400, 150),
    ('team_challenge_battle', 'Guerre des Défis', 'Quelle équipe relèvera le plus de défis ?', 'shield', 'emerald', 'team', 4, 10, 'challenges_completed', NULL, 168, 500, 150),

    -- Coopératif
    ('coop_xp_goal', 'Objectif Commun', 'Atteignez ensemble l''objectif XP !', 'heart', 'rose', 'coop', 2, 5, 'xp_total', 5000, 168, 300, 300)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Créer un nouveau défi
CREATE OR REPLACE FUNCTION create_friend_challenge(
    p_creator_id UUID,
    p_challenge_type_slug VARCHAR,
    p_invited_user_ids UUID[],
    p_name VARCHAR DEFAULT NULL,
    p_target_value INT DEFAULT NULL,
    p_duration_hours INT DEFAULT NULL,
    p_stake_xp INT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    v_challenge_type challenge_types%ROWTYPE;
    v_challenge_id UUID;
    v_invited_id UUID;
    v_ends_at TIMESTAMPTZ;
    v_creator_xp INT;
BEGIN
    -- Récupérer le type de défi
    SELECT * INTO v_challenge_type FROM challenge_types
    WHERE slug = p_challenge_type_slug AND is_active = TRUE;

    IF v_challenge_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Type de défi non trouvé');
    END IF;

    -- Vérifier le nombre de participants
    IF array_length(p_invited_user_ids, 1) < v_challenge_type.min_participants - 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pas assez de participants');
    END IF;

    IF array_length(p_invited_user_ids, 1) > v_challenge_type.max_participants - 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Trop de participants');
    END IF;

    -- Vérifier si le créateur peut miser
    IF p_stake_xp > 0 THEN
        SELECT total_xp INTO v_creator_xp FROM profiles WHERE id = p_creator_id;
        IF COALESCE(v_creator_xp, 0) < p_stake_xp THEN
            RETURN jsonb_build_object('success', false, 'error', 'XP insuffisants pour la mise');
        END IF;
    END IF;

    -- Calculer la date de fin
    v_ends_at := NOW() + (COALESCE(p_duration_hours, v_challenge_type.default_duration_hours) || ' hours')::INTERVAL;

    -- Créer le défi
    INSERT INTO friend_challenges (
        challenge_type_id, creator_id, name, target_value, stake_xp, ends_at
    ) VALUES (
        v_challenge_type.id,
        p_creator_id,
        COALESCE(p_name, v_challenge_type.name),
        COALESCE(p_target_value, v_challenge_type.default_target),
        p_stake_xp,
        v_ends_at
    )
    RETURNING id INTO v_challenge_id;

    -- Ajouter le créateur comme participant (auto-accepté)
    INSERT INTO challenge_participants (challenge_id, user_id, team, status, joined_at)
    VALUES (v_challenge_id, p_creator_id, 'a', 'accepted', NOW());

    -- Déduire la mise du créateur
    IF p_stake_xp > 0 THEN
        UPDATE profiles SET total_xp = total_xp - p_stake_xp WHERE id = p_creator_id;
    END IF;

    -- Inviter les autres participants
    FOREACH v_invited_id IN ARRAY p_invited_user_ids
    LOOP
        IF v_invited_id != p_creator_id THEN
            INSERT INTO challenge_participants (challenge_id, user_id, status)
            VALUES (v_challenge_id, v_invited_id, 'pending')
            ON CONFLICT (challenge_id, user_id) DO NOTHING;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'challenge_id', v_challenge_id,
        'ends_at', v_ends_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Répondre à une invitation
CREATE OR REPLACE FUNCTION respond_to_challenge(
    p_user_id UUID,
    p_challenge_id UUID,
    p_accept BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_challenge friend_challenges%ROWTYPE;
    v_participant challenge_participants%ROWTYPE;
    v_accepted_count INT;
    v_challenge_type challenge_types%ROWTYPE;
    v_user_xp INT;
BEGIN
    -- Récupérer le défi et le participant
    SELECT * INTO v_challenge FROM friend_challenges WHERE id = p_challenge_id;
    SELECT * INTO v_participant FROM challenge_participants
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id;

    IF v_challenge IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi non trouvé');
    END IF;

    IF v_participant IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu n''es pas invité à ce défi');
    END IF;

    IF v_participant.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu as déjà répondu');
    END IF;

    IF v_challenge.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le défi n''est plus en attente');
    END IF;

    -- Vérifier la mise si le défi a un stake
    IF p_accept AND v_challenge.stake_xp > 0 THEN
        SELECT total_xp INTO v_user_xp FROM profiles WHERE id = p_user_id;
        IF COALESCE(v_user_xp, 0) < v_challenge.stake_xp THEN
            RETURN jsonb_build_object('success', false, 'error', 'XP insuffisants pour la mise');
        END IF;

        -- Déduire la mise
        UPDATE profiles SET total_xp = total_xp - v_challenge.stake_xp WHERE id = p_user_id;
    END IF;

    -- Mettre à jour le statut du participant
    UPDATE challenge_participants
    SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
        joined_at = CASE WHEN p_accept THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE challenge_id = p_challenge_id AND user_id = p_user_id;

    -- Vérifier si on peut démarrer le défi
    IF p_accept THEN
        SELECT * INTO v_challenge_type FROM challenge_types WHERE id = v_challenge.challenge_type_id;

        SELECT COUNT(*) INTO v_accepted_count
        FROM challenge_participants
        WHERE challenge_id = p_challenge_id AND status = 'accepted';

        IF v_accepted_count >= v_challenge_type.min_participants THEN
            -- Démarrer le défi
            PERFORM start_challenge(p_challenge_id);
        END IF;
    END IF;

    RETURN jsonb_build_object('success', true, 'accepted', p_accept);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Démarrer un défi
CREATE OR REPLACE FUNCTION start_challenge(p_challenge_id UUID)
RETURNS VOID AS $$
DECLARE
    v_participant RECORD;
    v_challenge friend_challenges%ROWTYPE;
    v_challenge_type challenge_types%ROWTYPE;
    v_start_score INT;
BEGIN
    SELECT * INTO v_challenge FROM friend_challenges WHERE id = p_challenge_id;
    SELECT * INTO v_challenge_type FROM challenge_types WHERE id = v_challenge.challenge_type_id;

    -- Mettre à jour le statut
    UPDATE friend_challenges SET status = 'active', starts_at = NOW(), updated_at = NOW()
    WHERE id = p_challenge_id;

    -- Enregistrer les scores de départ pour chaque participant
    FOR v_participant IN
        SELECT cp.user_id FROM challenge_participants cp
        WHERE cp.challenge_id = p_challenge_id AND cp.status = 'accepted'
    LOOP
        -- Récupérer le score de départ selon le type d'objectif
        CASE v_challenge_type.objective_type
            WHEN 'xp_total', 'xp_daily' THEN
                SELECT COALESCE(ux.total_xp, 0) INTO v_start_score
                FROM teens t
                LEFT JOIN user_xp ux ON ux.teen_id = t.id
                WHERE t.parent_id = v_participant.user_id
                LIMIT 1;
            WHEN 'challenges_completed' THEN
                SELECT COUNT(*) INTO v_start_score
                FROM challenge_participants cp2
                WHERE cp2.user_id = v_participant.user_id AND cp2.status = 'completed';
            WHEN 'events_attended' THEN
                SELECT COALESCE(up.events_attended, 0) INTO v_start_score
                FROM user_progression up
                WHERE up.user_id = v_participant.user_id;
            WHEN 'streak_days' THEN
                SELECT COALESCE(us.current_streak, 0) INTO v_start_score
                FROM teens t
                LEFT JOIN user_streaks us ON us.teen_id = t.id
                WHERE t.parent_id = v_participant.user_id
                LIMIT 1;
            WHEN 'missions_completed' THEN
                SELECT COUNT(*) INTO v_start_score
                FROM user_missions um
                JOIN teens t ON t.id = um.teen_id
                WHERE t.parent_id = v_participant.user_id AND um.status = 'claimed';
            ELSE
                v_start_score := 0;
        END CASE;

        UPDATE challenge_participants
        SET start_score = COALESCE(v_start_score, 0), current_score = 0
        WHERE challenge_id = p_challenge_id AND user_id = v_participant.user_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour la progression d'un participant
CREATE OR REPLACE FUNCTION update_challenge_progress(
    p_user_id UUID,
    p_source VARCHAR DEFAULT 'manual'
)
RETURNS INT AS $$
DECLARE
    v_challenge RECORD;
    v_challenge_type challenge_types%ROWTYPE;
    v_current_value INT;
    v_new_score INT;
    v_updated_count INT := 0;
BEGIN
    -- Parcourir tous les défis actifs de l'utilisateur
    FOR v_challenge IN
        SELECT fc.*, cp.start_score, cp.current_score, cp.id as participant_id
        FROM friend_challenges fc
        JOIN challenge_participants cp ON fc.id = cp.challenge_id
        WHERE cp.user_id = p_user_id
        AND fc.status = 'active'
        AND cp.status = 'accepted'
    LOOP
        SELECT * INTO v_challenge_type FROM challenge_types WHERE id = v_challenge.challenge_type_id;

        -- Calculer la valeur actuelle selon le type
        CASE v_challenge_type.objective_type
            WHEN 'xp_total', 'xp_daily' THEN
                SELECT COALESCE(ux.total_xp, 0) INTO v_current_value
                FROM teens t
                LEFT JOIN user_xp ux ON ux.teen_id = t.id
                WHERE t.parent_id = p_user_id
                LIMIT 1;
            WHEN 'challenges_completed' THEN
                SELECT COUNT(*) INTO v_current_value
                FROM challenge_participants cp2
                WHERE cp2.user_id = p_user_id AND cp2.status = 'completed';
            WHEN 'events_attended' THEN
                SELECT COALESCE(up.events_attended, 0) INTO v_current_value
                FROM user_progression up
                WHERE up.user_id = p_user_id;
            WHEN 'streak_days' THEN
                SELECT COALESCE(us.current_streak, 0) INTO v_current_value
                FROM teens t
                LEFT JOIN user_streaks us ON us.teen_id = t.id
                WHERE t.parent_id = p_user_id
                LIMIT 1;
            WHEN 'missions_completed' THEN
                SELECT COUNT(*) INTO v_current_value
                FROM user_missions um
                JOIN teens t ON t.id = um.teen_id
                WHERE t.parent_id = p_user_id AND um.status = 'claimed';
            ELSE
                v_current_value := 0;
        END CASE;

        -- Calculer le nouveau score (différence depuis le début)
        v_new_score := COALESCE(v_current_value, 0) - COALESCE(v_challenge.start_score, 0);

        -- Mettre à jour si le score a changé
        IF v_new_score != v_challenge.current_score THEN
            UPDATE challenge_participants
            SET current_score = v_new_score, updated_at = NOW()
            WHERE id = v_challenge.participant_id;

            -- Logger la progression
            INSERT INTO challenge_progress_log (challenge_id, user_id, score_change, new_total, source)
            VALUES (v_challenge.id, p_user_id, v_new_score - v_challenge.current_score, v_new_score, p_source);

            v_updated_count := v_updated_count + 1;

            -- Vérifier si quelqu'un a atteint l'objectif (pour first_to_target)
            IF v_challenge_type.objective_type = 'first_to_target'
               AND v_challenge.target_value IS NOT NULL
               AND v_new_score >= v_challenge.target_value THEN
                PERFORM complete_challenge(v_challenge.id, p_user_id);
            END IF;
        END IF;
    END LOOP;

    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Terminer un défi
CREATE OR REPLACE FUNCTION complete_challenge(
    p_challenge_id UUID,
    p_winner_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_challenge friend_challenges%ROWTYPE;
    v_challenge_type challenge_types%ROWTYPE;
    v_winner_id UUID;
    v_winning_team VARCHAR(10);
    v_is_draw BOOLEAN := FALSE;
    v_participant RECORD;
    v_max_score INT;
    v_total_stake INT;
    v_team_a_score INT;
    v_team_b_score INT;
BEGIN
    SELECT * INTO v_challenge FROM friend_challenges WHERE id = p_challenge_id FOR UPDATE;

    IF v_challenge.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi déjà terminé');
    END IF;

    SELECT * INTO v_challenge_type FROM challenge_types WHERE id = v_challenge.challenge_type_id;

    -- Déterminer le gagnant selon le mode
    IF p_winner_id IS NOT NULL THEN
        v_winner_id := p_winner_id;
    ELSIF v_challenge_type.mode = 'team' THEN
        -- Calculer les scores par équipe
        SELECT COALESCE(SUM(current_score), 0) INTO v_team_a_score
        FROM challenge_participants
        WHERE challenge_id = p_challenge_id AND team = 'a' AND status = 'accepted';

        SELECT COALESCE(SUM(current_score), 0) INTO v_team_b_score
        FROM challenge_participants
        WHERE challenge_id = p_challenge_id AND team = 'b' AND status = 'accepted';

        IF v_team_a_score > v_team_b_score THEN
            v_winning_team := 'a';
        ELSIF v_team_b_score > v_team_a_score THEN
            v_winning_team := 'b';
        ELSE
            v_is_draw := TRUE;
        END IF;
    ELSIF v_challenge_type.mode = 'coop' THEN
        -- Mode coop: tout le monde gagne si l'objectif est atteint
        SELECT SUM(current_score) INTO v_max_score
        FROM challenge_participants
        WHERE challenge_id = p_challenge_id AND status = 'accepted';

        v_is_draw := v_max_score >= v_challenge.target_value;
    ELSE
        -- Duel ou race: le plus haut score gagne
        SELECT user_id, current_score INTO v_winner_id, v_max_score
        FROM challenge_participants
        WHERE challenge_id = p_challenge_id AND status = 'accepted'
        ORDER BY current_score DESC
        LIMIT 1;

        -- Vérifier les égalités
        IF (SELECT COUNT(*) FROM challenge_participants
            WHERE challenge_id = p_challenge_id AND status = 'accepted' AND current_score = v_max_score) > 1 THEN
            v_is_draw := TRUE;
            v_winner_id := NULL;
        END IF;
    END IF;

    -- Mettre à jour le défi
    UPDATE friend_challenges
    SET status = 'completed',
        winner_id = v_winner_id,
        winning_team = v_winning_team,
        is_draw = v_is_draw,
        updated_at = NOW()
    WHERE id = p_challenge_id;

    -- Calculer le pot total (mise)
    SELECT COALESCE(SUM(1), 0) * v_challenge.stake_xp INTO v_total_stake
    FROM challenge_participants
    WHERE challenge_id = p_challenge_id AND status = 'accepted';

    -- Distribuer les récompenses
    FOR v_participant IN
        SELECT * FROM challenge_participants
        WHERE challenge_id = p_challenge_id AND status = 'accepted'
    LOOP
        DECLARE
            v_xp_reward INT;
            v_is_winner BOOLEAN := FALSE;
        BEGIN
            IF v_is_draw THEN
                v_xp_reward := COALESCE(v_challenge_type.draw_xp, v_challenge_type.participant_xp);
                -- Rembourser la mise en cas d'égalité
                IF v_challenge.stake_xp > 0 THEN
                    v_xp_reward := v_xp_reward + v_challenge.stake_xp;
                END IF;
            ELSIF v_winning_team IS NOT NULL THEN
                IF v_participant.team = v_winning_team THEN
                    v_is_winner := TRUE;
                    v_xp_reward := v_challenge_type.winner_xp;
                    -- Partager la mise entre les gagnants
                    IF v_challenge.stake_xp > 0 THEN
                        v_xp_reward := v_xp_reward + (v_total_stake / (
                            SELECT COUNT(*) FROM challenge_participants
                            WHERE challenge_id = p_challenge_id AND team = v_winning_team AND status = 'accepted'
                        ));
                    END IF;
                ELSE
                    v_xp_reward := v_challenge_type.participant_xp;
                END IF;
            ELSIF v_participant.user_id = v_winner_id THEN
                v_is_winner := TRUE;
                v_xp_reward := v_challenge_type.winner_xp + v_total_stake;
            ELSE
                v_xp_reward := v_challenge_type.participant_xp;
            END IF;

            -- Mettre à jour le participant
            UPDATE challenge_participants
            SET xp_earned = v_xp_reward, is_winner = v_is_winner, updated_at = NOW()
            WHERE id = v_participant.id;

            -- Ajouter les XP via la fonction add_xp_to_user
            DECLARE
                v_teen_id UUID;
            BEGIN
                SELECT t.id INTO v_teen_id FROM teens t WHERE t.parent_id = v_participant.user_id LIMIT 1;
                IF v_teen_id IS NOT NULL THEN
                    PERFORM add_xp_to_user(v_teen_id, v_xp_reward, 'challenge', 'challenge', p_challenge_id, 'Challenge reward');
                END IF;
            END;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'winner_id', v_winner_id,
        'winning_team', v_winning_team,
        'is_draw', v_is_draw
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Récupérer les défis d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_challenges(
    p_user_id UUID,
    p_status VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    challenge_id UUID,
    challenge_name VARCHAR,
    challenge_type_slug VARCHAR,
    challenge_type_name VARCHAR,
    mode VARCHAR,
    icon VARCHAR,
    color VARCHAR,
    target_value INT,
    stake_xp INT,
    status VARCHAR,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    is_creator BOOLEAN,
    user_score INT,
    user_team VARCHAR,
    participants JSONB,
    winner_id UUID,
    winning_team VARCHAR,
    is_draw BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fc.id as challenge_id,
        fc.name as challenge_name,
        ct.slug as challenge_type_slug,
        ct.name as challenge_type_name,
        ct.mode,
        ct.icon,
        ct.color,
        fc.target_value,
        fc.stake_xp,
        fc.status,
        fc.starts_at,
        fc.ends_at,
        (fc.creator_id = p_user_id) as is_creator,
        cp_user.current_score as user_score,
        cp_user.team as user_team,
        (
            SELECT jsonb_agg(jsonb_build_object(
                'user_id', cp.user_id,
                'pseudo', p.pseudo,
                'avatar_url', p.avatar_url,
                'team', cp.team,
                'status', cp.status,
                'score', cp.current_score,
                'is_winner', cp.is_winner
            ) ORDER BY cp.current_score DESC)
            FROM challenge_participants cp
            JOIN profiles p ON cp.user_id = p.id
            WHERE cp.challenge_id = fc.id
        ) as participants,
        fc.winner_id,
        fc.winning_team,
        fc.is_draw
    FROM friend_challenges fc
    JOIN challenge_types ct ON fc.challenge_type_id = ct.id
    JOIN challenge_participants cp_user ON fc.id = cp_user.challenge_id AND cp_user.user_id = p_user_id
    WHERE (p_status IS NULL OR fc.status = p_status)
    ORDER BY
        CASE fc.status
            WHEN 'active' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'completed' THEN 3
            ELSE 4
        END,
        fc.ends_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Job pour terminer les défis expirés
CREATE OR REPLACE FUNCTION check_expired_challenges()
RETURNS INT AS $$
DECLARE
    v_challenge RECORD;
    v_count INT := 0;
BEGIN
    FOR v_challenge IN
        SELECT id FROM friend_challenges
        WHERE status = 'active' AND ends_at <= NOW()
    LOOP
        PERFORM complete_challenge(v_challenge.id);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE challenge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_messages ENABLE ROW LEVEL SECURITY;

-- Types: readable by all
CREATE POLICY "Challenge types are readable by all" ON challenge_types
    FOR SELECT USING (is_active = TRUE);

-- Challenges: participants can view
CREATE POLICY "Participants can view challenges" ON friend_challenges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM challenge_participants
            WHERE challenge_id = friend_challenges.id AND user_id = auth.uid()
        )
    );

-- Participants: can view challenges they're in
CREATE POLICY "Users can view challenge participants" ON challenge_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM challenge_participants cp
            WHERE cp.challenge_id = challenge_participants.challenge_id AND cp.user_id = auth.uid()
        )
    );

-- Progress: participants can view
CREATE POLICY "Users can view challenge progress" ON challenge_progress_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM challenge_participants
            WHERE challenge_id = challenge_progress_log.challenge_id AND user_id = auth.uid()
        )
    );

-- Messages: participants can view and insert
CREATE POLICY "Participants can view messages" ON challenge_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM challenge_participants
            WHERE challenge_id = challenge_messages.challenge_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can send messages" ON challenge_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM challenge_participants
            WHERE challenge_id = challenge_messages.challenge_id AND user_id = auth.uid() AND status = 'accepted'
        )
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_challenge_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER friend_challenges_updated_at
    BEFORE UPDATE ON friend_challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_timestamp();

CREATE TRIGGER challenge_participants_updated_at
    BEFORE UPDATE ON challenge_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_timestamp();

-- Trigger pour vérifier les achievements quand un challenge est complété
-- Utilise la fonction définie dans 001_achievements_system.sql
DROP TRIGGER IF EXISTS on_challenge_complete_check_achievements ON challenge_participants;
CREATE TRIGGER on_challenge_complete_check_achievements
    AFTER UPDATE ON challenge_participants
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION trigger_check_achievements_on_challenge_participant();


-- ============================================================================
-- 007_crews_system.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Crews/Groups System Migration
-- ============================================================================
-- Description: Système de crews (groupes d'amis) avec classements et défis
-- Version: 007
-- ============================================================================

-- ============================================================================
-- TABLE: crews
-- ============================================================================
-- Représente un crew (groupe d'amis)

CREATE TABLE IF NOT EXISTS crews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informations de base
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    motto VARCHAR(100), -- Devise du crew

    -- Personnalisation
    avatar_url TEXT,
    banner_url TEXT,
    color VARCHAR(7) DEFAULT '#06b6d4', -- Couleur principale (hex)
    badge_icon VARCHAR(50) DEFAULT 'users',

    -- Statistiques agrégées
    total_xp BIGINT DEFAULT 0,
    total_events_attended INTEGER DEFAULT 0,
    total_challenges_won INTEGER DEFAULT 0,
    average_level DECIMAL(5,2) DEFAULT 1.0,

    -- Configuration
    max_members INTEGER DEFAULT 10,
    is_public BOOLEAN DEFAULT true, -- Visible dans la recherche
    requires_approval BOOLEAN DEFAULT true, -- Demande d'adhésion requise
    min_level_required INTEGER DEFAULT 1, -- Niveau minimum pour rejoindre

    -- Propriétaire
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche et classement
CREATE INDEX IF NOT EXISTS idx_crews_slug ON crews(slug);
CREATE INDEX IF NOT EXISTS idx_crews_total_xp ON crews(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_crews_owner ON crews(owner_id);
CREATE INDEX IF NOT EXISTS idx_crews_public ON crews(is_public) WHERE is_public = true;

-- ============================================================================
-- TABLE: crew_members
-- ============================================================================
-- Membres d'un crew avec leurs rôles

CREATE TABLE IF NOT EXISTS crew_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Rôle dans le crew
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),

    -- Contribution au crew
    xp_contributed BIGINT DEFAULT 0,
    events_attended INTEGER DEFAULT 0,
    challenges_won INTEGER DEFAULT 0,

    -- Statut
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'banned')),

    -- Métadonnées
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(crew_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_members_crew ON crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user ON crew_members(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_status ON crew_members(status);
CREATE INDEX IF NOT EXISTS idx_crew_members_xp ON crew_members(xp_contributed DESC);

-- ============================================================================
-- TABLE: crew_invitations
-- ============================================================================
-- Invitations à rejoindre un crew

CREATE TABLE IF NOT EXISTS crew_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,

    -- Invitation
    inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invitee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Message personnalisé
    message TEXT,

    -- Statut
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

    UNIQUE(crew_id, invitee_id, status) -- Une seule invitation pending par personne
);

CREATE INDEX IF NOT EXISTS idx_crew_invitations_invitee ON crew_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_crew_invitations_crew ON crew_invitations(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_invitations_status ON crew_invitations(status);

-- ============================================================================
-- TABLE: crew_join_requests
-- ============================================================================
-- Demandes d'adhésion à un crew

CREATE TABLE IF NOT EXISTS crew_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Message de motivation
    message TEXT,

    -- Statut
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),

    -- Réponse
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(crew_id, user_id, status)
);

CREATE INDEX IF NOT EXISTS idx_crew_join_requests_crew ON crew_join_requests(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_join_requests_user ON crew_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_crew_join_requests_status ON crew_join_requests(status);

-- ============================================================================
-- TABLE: crew_achievements
-- ============================================================================
-- Badges/achievements spécifiques aux crews

CREATE TABLE IF NOT EXISTS crew_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informations
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#fbbf24',

    -- Conditions
    condition_type VARCHAR(50) NOT NULL, -- total_xp, members_count, events_attended, etc.
    condition_value INTEGER NOT NULL,

    -- Récompenses
    xp_reward INTEGER DEFAULT 0,

    -- Rareté
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),

    -- Métadonnées
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: crew_unlocked_achievements
-- ============================================================================
-- Achievements débloqués par les crews

CREATE TABLE IF NOT EXISTS crew_unlocked_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES crew_achievements(id) ON DELETE CASCADE,

    unlocked_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(crew_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_unlocked_achievements_crew ON crew_unlocked_achievements(crew_id);

-- ============================================================================
-- TABLE: crew_activity_log
-- ============================================================================
-- Journal d'activité du crew

CREATE TABLE IF NOT EXISTS crew_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

    -- Type d'activité
    activity_type VARCHAR(50) NOT NULL, -- member_joined, xp_gained, challenge_won, event_attended, etc.

    -- Détails
    description TEXT,
    metadata JSONB DEFAULT '{}',
    xp_amount INTEGER DEFAULT 0,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crew_activity_crew ON crew_activity_log(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_activity_created ON crew_activity_log(created_at DESC);

-- ============================================================================
-- TABLE: crew_weekly_stats
-- ============================================================================
-- Statistiques hebdomadaires pour le classement

CREATE TABLE IF NOT EXISTS crew_weekly_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,

    -- Période
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,

    -- Stats de la semaine
    xp_earned BIGINT DEFAULT 0,
    events_attended INTEGER DEFAULT 0,
    challenges_won INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,

    -- Classement de la semaine
    rank INTEGER,
    previous_rank INTEGER,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(crew_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_crew_weekly_stats_week ON crew_weekly_stats(week_start);
CREATE INDEX IF NOT EXISTS idx_crew_weekly_stats_rank ON crew_weekly_stats(rank);

-- ============================================================================
-- SEED: Crew Achievements
-- ============================================================================

INSERT INTO crew_achievements (name, slug, description, icon, color, condition_type, condition_value, xp_reward, rarity) VALUES
-- Membres
('Première recrue', 'first-recruit', 'Recrutez votre premier membre', 'user-plus', '#22c55e', 'members_count', 2, 100, 'common'),
('Escouade', 'squad', 'Atteignez 5 membres dans votre crew', 'users', '#22c55e', 'members_count', 5, 250, 'common'),
('Équipe complète', 'full-team', 'Atteignez 10 membres dans votre crew', 'users', '#3b82f6', 'members_count', 10, 500, 'rare'),

-- XP
('Premiers pas', 'first-steps', 'Cumulez 1 000 XP en crew', 'zap', '#fbbf24', 'total_xp', 1000, 100, 'common'),
('En progression', 'progressing', 'Cumulez 10 000 XP en crew', 'trending-up', '#fbbf24', 'total_xp', 10000, 300, 'common'),
('Crew puissant', 'powerful-crew', 'Cumulez 50 000 XP en crew', 'flame', '#f97316', 'total_xp', 50000, 750, 'rare'),
('Élite', 'elite-crew', 'Cumulez 100 000 XP en crew', 'crown', '#a855f7', 'total_xp', 100000, 1500, 'epic'),
('Légendes', 'legendary-crew', 'Cumulez 500 000 XP en crew', 'star', '#ec4899', 'total_xp', 500000, 5000, 'legendary'),

-- Events
('Première sortie', 'first-outing', 'Participez à votre premier event en crew', 'calendar', '#06b6d4', 'events_attended', 1, 150, 'common'),
('Habitués', 'regulars', 'Participez à 10 events en crew', 'calendar-check', '#06b6d4', 'events_attended', 10, 400, 'rare'),
('Piliers de la fête', 'party-pillars', 'Participez à 50 events en crew', 'party-popper', '#a855f7', 'events_attended', 50, 1000, 'epic'),

-- Défis
('Premiers vainqueurs', 'first-victory', 'Gagnez votre premier défi en crew', 'trophy', '#fbbf24', 'challenges_won', 1, 200, 'common'),
('Compétiteurs', 'competitors', 'Gagnez 10 défis en crew', 'swords', '#f97316', 'challenges_won', 10, 500, 'rare'),
('Champions', 'champions', 'Gagnez 50 défis en crew', 'medal', '#a855f7', 'challenges_won', 50, 1500, 'epic'),

-- Activité
('Crew actif', 'active-crew', 'Tous les membres actifs dans la même semaine', 'activity', '#22c55e', 'weekly_active_all', 1, 300, 'rare'),
('Semaine parfaite', 'perfect-week', 'Top 3 du classement hebdomadaire', 'award', '#fbbf24', 'weekly_top3', 1, 500, 'epic')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- FUNCTION: create_crew
-- ============================================================================

CREATE OR REPLACE FUNCTION create_crew(
    p_owner_id UUID,
    p_name VARCHAR(50),
    p_description TEXT DEFAULT NULL,
    p_motto VARCHAR(100) DEFAULT NULL,
    p_color VARCHAR(7) DEFAULT '#06b6d4',
    p_is_public BOOLEAN DEFAULT true,
    p_requires_approval BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
    v_crew_id UUID;
    v_slug VARCHAR(50);
    v_existing_crew_count INTEGER;
BEGIN
    -- Vérifier si l'utilisateur est déjà owner d'un crew
    SELECT COUNT(*) INTO v_existing_crew_count
    FROM crews WHERE owner_id = p_owner_id;

    IF v_existing_crew_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu possèdes déjà un crew');
    END IF;

    -- Générer le slug
    v_slug := LOWER(REGEXP_REPLACE(p_name, '[^a-zA-Z0-9]', '-', 'g'));
    v_slug := REGEXP_REPLACE(v_slug, '-+', '-', 'g');
    v_slug := TRIM(BOTH '-' FROM v_slug);

    -- Vérifier l'unicité du slug
    IF EXISTS (SELECT 1 FROM crews WHERE slug = v_slug) THEN
        v_slug := v_slug || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 4);
    END IF;

    -- Créer le crew
    INSERT INTO crews (
        name, slug, description, motto, color,
        is_public, requires_approval, owner_id
    ) VALUES (
        p_name, v_slug, p_description, p_motto, p_color,
        p_is_public, p_requires_approval, p_owner_id
    ) RETURNING id INTO v_crew_id;

    -- Ajouter le créateur comme owner
    INSERT INTO crew_members (crew_id, user_id, role, status)
    VALUES (v_crew_id, p_owner_id, 'owner', 'active');

    -- Logger l'activité
    INSERT INTO crew_activity_log (crew_id, user_id, activity_type, description)
    VALUES (v_crew_id, p_owner_id, 'crew_created', 'Crew créé');

    RETURN jsonb_build_object(
        'success', true,
        'crew_id', v_crew_id,
        'slug', v_slug
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: invite_to_crew
-- ============================================================================

CREATE OR REPLACE FUNCTION invite_to_crew(
    p_crew_id UUID,
    p_inviter_id UUID,
    p_invitee_id UUID,
    p_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_crew RECORD;
    v_inviter_member RECORD;
    v_member_count INTEGER;
BEGIN
    -- Vérifier le crew
    SELECT * INTO v_crew FROM crews WHERE id = p_crew_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Crew introuvable');
    END IF;

    -- Vérifier que l'inviteur est admin ou owner
    SELECT * INTO v_inviter_member
    FROM crew_members
    WHERE crew_id = p_crew_id AND user_id = p_inviter_id AND status = 'active';

    IF NOT FOUND OR v_inviter_member.role = 'member' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission refusée');
    END IF;

    -- Vérifier que l'invité n'est pas déjà membre
    IF EXISTS (SELECT 1 FROM crew_members WHERE crew_id = p_crew_id AND user_id = p_invitee_id AND status = 'active') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cet utilisateur est déjà membre');
    END IF;

    -- Vérifier le nombre de membres
    SELECT COUNT(*) INTO v_member_count FROM crew_members WHERE crew_id = p_crew_id AND status = 'active';
    IF v_member_count >= v_crew.max_members THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le crew est complet');
    END IF;

    -- Vérifier qu'il n'y a pas déjà une invitation pending
    IF EXISTS (SELECT 1 FROM crew_invitations WHERE crew_id = p_crew_id AND invitee_id = p_invitee_id AND status = 'pending') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Une invitation est déjà en attente');
    END IF;

    -- Créer l'invitation
    INSERT INTO crew_invitations (crew_id, inviter_id, invitee_id, message)
    VALUES (p_crew_id, p_inviter_id, p_invitee_id, p_message);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: respond_to_crew_invitation
-- ============================================================================

CREATE OR REPLACE FUNCTION respond_to_crew_invitation(
    p_invitation_id UUID,
    p_user_id UUID,
    p_accept BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_invitation RECORD;
    v_crew RECORD;
    v_member_count INTEGER;
BEGIN
    -- Vérifier l'invitation
    SELECT * INTO v_invitation
    FROM crew_invitations
    WHERE id = p_invitation_id AND invitee_id = p_user_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation introuvable ou expirée');
    END IF;

    IF p_accept THEN
        -- Vérifier le crew
        SELECT * INTO v_crew FROM crews WHERE id = v_invitation.crew_id;

        -- Vérifier le nombre de membres
        SELECT COUNT(*) INTO v_member_count
        FROM crew_members
        WHERE crew_id = v_invitation.crew_id AND status = 'active';

        IF v_member_count >= v_crew.max_members THEN
            -- Mettre à jour l'invitation comme expirée
            UPDATE crew_invitations SET status = 'expired' WHERE id = p_invitation_id;
            RETURN jsonb_build_object('success', false, 'error', 'Le crew est complet');
        END IF;

        -- Ajouter comme membre
        INSERT INTO crew_members (crew_id, user_id, role, status)
        VALUES (v_invitation.crew_id, p_user_id, 'member', 'active')
        ON CONFLICT (crew_id, user_id)
        DO UPDATE SET status = 'active', joined_at = NOW();

        -- Logger l'activité
        INSERT INTO crew_activity_log (crew_id, user_id, activity_type, description)
        VALUES (v_invitation.crew_id, p_user_id, 'member_joined', 'A rejoint le crew via invitation');

        -- Mettre à jour l'invitation
        UPDATE crew_invitations
        SET status = 'accepted', responded_at = NOW()
        WHERE id = p_invitation_id;

        -- Mettre à jour les stats du crew
        PERFORM update_crew_stats(v_invitation.crew_id);
    ELSE
        -- Refuser l'invitation
        UPDATE crew_invitations
        SET status = 'declined', responded_at = NOW()
        WHERE id = p_invitation_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: request_to_join_crew
-- ============================================================================

CREATE OR REPLACE FUNCTION request_to_join_crew(
    p_crew_id UUID,
    p_user_id UUID,
    p_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_crew RECORD;
    v_user_level INTEGER;
    v_member_count INTEGER;
BEGIN
    -- Vérifier le crew
    SELECT * INTO v_crew FROM crews WHERE id = p_crew_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Crew introuvable');
    END IF;

    -- Vérifier si public
    IF NOT v_crew.is_public THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ce crew est privé');
    END IF;

    -- Vérifier le niveau
    SELECT level INTO v_user_level FROM profiles WHERE id = p_user_id;
    IF v_user_level < v_crew.min_level_required THEN
        RETURN jsonb_build_object('success', false, 'error', 'Niveau minimum requis: ' || v_crew.min_level_required);
    END IF;

    -- Vérifier si déjà membre
    IF EXISTS (SELECT 1 FROM crew_members WHERE crew_id = p_crew_id AND user_id = p_user_id AND status = 'active') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu es déjà membre de ce crew');
    END IF;

    -- Vérifier le nombre de membres
    SELECT COUNT(*) INTO v_member_count FROM crew_members WHERE crew_id = p_crew_id AND status = 'active';
    IF v_member_count >= v_crew.max_members THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le crew est complet');
    END IF;

    -- Vérifier s'il y a déjà une demande pending
    IF EXISTS (SELECT 1 FROM crew_join_requests WHERE crew_id = p_crew_id AND user_id = p_user_id AND status = 'pending') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Une demande est déjà en attente');
    END IF;

    -- Si pas besoin d'approbation, rejoindre directement
    IF NOT v_crew.requires_approval THEN
        INSERT INTO crew_members (crew_id, user_id, role, status)
        VALUES (p_crew_id, p_user_id, 'member', 'active')
        ON CONFLICT (crew_id, user_id)
        DO UPDATE SET status = 'active', joined_at = NOW();

        INSERT INTO crew_activity_log (crew_id, user_id, activity_type, description)
        VALUES (p_crew_id, p_user_id, 'member_joined', 'A rejoint le crew');

        PERFORM update_crew_stats(p_crew_id);

        RETURN jsonb_build_object('success', true, 'joined', true);
    END IF;

    -- Créer la demande
    INSERT INTO crew_join_requests (crew_id, user_id, message)
    VALUES (p_crew_id, p_user_id, p_message);

    RETURN jsonb_build_object('success', true, 'joined', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: handle_join_request
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_join_request(
    p_request_id UUID,
    p_reviewer_id UUID,
    p_approve BOOLEAN,
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request RECORD;
    v_reviewer_member RECORD;
    v_member_count INTEGER;
    v_crew RECORD;
BEGIN
    -- Vérifier la demande
    SELECT * INTO v_request FROM crew_join_requests WHERE id = p_request_id AND status = 'pending';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Demande introuvable');
    END IF;

    -- Vérifier que le reviewer est admin ou owner
    SELECT * INTO v_reviewer_member
    FROM crew_members
    WHERE crew_id = v_request.crew_id AND user_id = p_reviewer_id AND status = 'active';

    IF NOT FOUND OR v_reviewer_member.role = 'member' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission refusée');
    END IF;

    IF p_approve THEN
        -- Vérifier le nombre de membres
        SELECT * INTO v_crew FROM crews WHERE id = v_request.crew_id;
        SELECT COUNT(*) INTO v_member_count FROM crew_members WHERE crew_id = v_request.crew_id AND status = 'active';

        IF v_member_count >= v_crew.max_members THEN
            UPDATE crew_join_requests
            SET status = 'rejected', reviewed_by = p_reviewer_id, reviewed_at = NOW(), rejection_reason = 'Crew complet'
            WHERE id = p_request_id;
            RETURN jsonb_build_object('success', false, 'error', 'Le crew est complet');
        END IF;

        -- Ajouter comme membre
        INSERT INTO crew_members (crew_id, user_id, role, status)
        VALUES (v_request.crew_id, v_request.user_id, 'member', 'active')
        ON CONFLICT (crew_id, user_id)
        DO UPDATE SET status = 'active', joined_at = NOW();

        INSERT INTO crew_activity_log (crew_id, user_id, activity_type, description)
        VALUES (v_request.crew_id, v_request.user_id, 'member_joined', 'Demande acceptée');

        UPDATE crew_join_requests
        SET status = 'approved', reviewed_by = p_reviewer_id, reviewed_at = NOW()
        WHERE id = p_request_id;

        PERFORM update_crew_stats(v_request.crew_id);
    ELSE
        UPDATE crew_join_requests
        SET status = 'rejected', reviewed_by = p_reviewer_id, reviewed_at = NOW(), rejection_reason = p_rejection_reason
        WHERE id = p_request_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: leave_crew
-- ============================================================================

CREATE OR REPLACE FUNCTION leave_crew(
    p_crew_id UUID,
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_member RECORD;
    v_crew RECORD;
    v_admin_count INTEGER;
BEGIN
    -- Vérifier le membre
    SELECT * INTO v_member
    FROM crew_members
    WHERE crew_id = p_crew_id AND user_id = p_user_id AND status = 'active';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu n''es pas membre de ce crew');
    END IF;

    -- Si owner, ne peut pas quitter
    IF v_member.role = 'owner' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le propriétaire ne peut pas quitter. Transfère la propriété d''abord.');
    END IF;

    -- Supprimer le membre
    DELETE FROM crew_members WHERE crew_id = p_crew_id AND user_id = p_user_id;

    -- Logger
    INSERT INTO crew_activity_log (crew_id, user_id, activity_type, description)
    VALUES (p_crew_id, p_user_id, 'member_left', 'A quitté le crew');

    -- Mettre à jour les stats
    PERFORM update_crew_stats(p_crew_id);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: update_crew_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION update_crew_stats(p_crew_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_xp BIGINT;
    v_avg_level DECIMAL(5,2);
    v_member_count INTEGER;
BEGIN
    -- Calculer les stats agrégées
    SELECT
        COALESCE(SUM(p.total_xp), 0),
        COALESCE(AVG(p.level), 1),
        COUNT(*)
    INTO v_total_xp, v_avg_level, v_member_count
    FROM crew_members cm
    JOIN profiles p ON cm.user_id = p.id
    WHERE cm.crew_id = p_crew_id AND cm.status = 'active';

    -- Mettre à jour le crew
    UPDATE crews
    SET
        total_xp = v_total_xp,
        average_level = v_avg_level,
        updated_at = NOW()
    WHERE id = p_crew_id;

    -- Vérifier les achievements
    PERFORM check_crew_achievements(p_crew_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: check_crew_achievements
-- ============================================================================

CREATE OR REPLACE FUNCTION check_crew_achievements(p_crew_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_crew RECORD;
    v_achievement RECORD;
    v_unlocked_count INTEGER := 0;
    v_member_count INTEGER;
    v_condition_met BOOLEAN;
BEGIN
    SELECT * INTO v_crew FROM crews WHERE id = p_crew_id;
    SELECT COUNT(*) INTO v_member_count FROM crew_members WHERE crew_id = p_crew_id AND status = 'active';

    FOR v_achievement IN SELECT * FROM crew_achievements WHERE is_active = true LOOP
        -- Vérifier si déjà débloqué
        CONTINUE WHEN EXISTS (
            SELECT 1 FROM crew_unlocked_achievements
            WHERE crew_id = p_crew_id AND achievement_id = v_achievement.id
        );

        -- Vérifier la condition
        v_condition_met := false;

        CASE v_achievement.condition_type
            WHEN 'members_count' THEN
                v_condition_met := v_member_count >= v_achievement.condition_value;
            WHEN 'total_xp' THEN
                v_condition_met := v_crew.total_xp >= v_achievement.condition_value;
            WHEN 'events_attended' THEN
                v_condition_met := v_crew.total_events_attended >= v_achievement.condition_value;
            WHEN 'challenges_won' THEN
                v_condition_met := v_crew.total_challenges_won >= v_achievement.condition_value;
            ELSE
                v_condition_met := false;
        END CASE;

        IF v_condition_met THEN
            INSERT INTO crew_unlocked_achievements (crew_id, achievement_id)
            VALUES (p_crew_id, v_achievement.id);

            INSERT INTO crew_activity_log (crew_id, activity_type, description, xp_amount)
            VALUES (p_crew_id, 'achievement_unlocked', 'Badge débloqué: ' || v_achievement.name, v_achievement.xp_reward);

            v_unlocked_count := v_unlocked_count + 1;
        END IF;
    END LOOP;

    RETURN v_unlocked_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_crew_leaderboard
-- ============================================================================

CREATE OR REPLACE FUNCTION get_crew_leaderboard(
    p_period VARCHAR(20) DEFAULT 'all_time', -- all_time, weekly, monthly
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    rank BIGINT,
    crew_id UUID,
    name VARCHAR(50),
    slug VARCHAR(50),
    avatar_url TEXT,
    color VARCHAR(7),
    total_xp BIGINT,
    member_count BIGINT,
    average_level DECIMAL(5,2),
    owner_pseudo VARCHAR(50)
) AS $$
BEGIN
    IF p_period = 'weekly' THEN
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY cws.xp_earned DESC) as rank,
            c.id as crew_id,
            c.name,
            c.slug,
            c.avatar_url,
            c.color,
            cws.xp_earned as total_xp,
            (SELECT COUNT(*) FROM crew_members WHERE crew_id = c.id AND status = 'active') as member_count,
            c.average_level,
            p.pseudo as owner_pseudo
        FROM crews c
        JOIN profiles p ON c.owner_id = p.id
        LEFT JOIN crew_weekly_stats cws ON c.id = cws.crew_id
            AND cws.week_start = DATE_TRUNC('week', CURRENT_DATE)::DATE
        ORDER BY cws.xp_earned DESC NULLS LAST
        LIMIT p_limit;
    ELSE
        RETURN QUERY
        SELECT
            ROW_NUMBER() OVER (ORDER BY c.total_xp DESC) as rank,
            c.id as crew_id,
            c.name,
            c.slug,
            c.avatar_url,
            c.color,
            c.total_xp,
            (SELECT COUNT(*) FROM crew_members WHERE crew_id = c.id AND status = 'active') as member_count,
            c.average_level,
            p.pseudo as owner_pseudo
        FROM crews c
        JOIN profiles p ON c.owner_id = p.id
        ORDER BY c.total_xp DESC
        LIMIT p_limit;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_user_crew
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_crew(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_crew RECORD;
    v_member RECORD;
    v_members JSONB;
    v_achievements JSONB;
BEGIN
    -- Trouver le crew de l'utilisateur
    SELECT cm.*, c.*
    INTO v_member
    FROM crew_members cm
    JOIN crews c ON cm.crew_id = c.id
    WHERE cm.user_id = p_user_id AND cm.status = 'active'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('has_crew', false);
    END IF;

    -- Récupérer les membres
    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', cm.user_id,
            'pseudo', p.pseudo,
            'avatar_url', p.avatar_url,
            'level', p.level,
            'role', cm.role,
            'xp_contributed', cm.xp_contributed,
            'joined_at', cm.joined_at
        ) ORDER BY
            CASE cm.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
            cm.xp_contributed DESC
    )
    INTO v_members
    FROM crew_members cm
    JOIN profiles p ON cm.user_id = p.id
    WHERE cm.crew_id = v_member.crew_id AND cm.status = 'active';

    -- Récupérer les achievements
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', ca.id,
            'name', ca.name,
            'description', ca.description,
            'icon', ca.icon,
            'color', ca.color,
            'rarity', ca.rarity,
            'unlocked_at', cua.unlocked_at
        )
    )
    INTO v_achievements
    FROM crew_unlocked_achievements cua
    JOIN crew_achievements ca ON cua.achievement_id = ca.id
    WHERE cua.crew_id = v_member.crew_id;

    RETURN jsonb_build_object(
        'has_crew', true,
        'crew', jsonb_build_object(
            'id', v_member.crew_id,
            'name', v_member.name,
            'slug', v_member.slug,
            'description', v_member.description,
            'motto', v_member.motto,
            'avatar_url', v_member.avatar_url,
            'banner_url', v_member.banner_url,
            'color', v_member.color,
            'total_xp', v_member.total_xp,
            'average_level', v_member.average_level,
            'total_events_attended', v_member.total_events_attended,
            'total_challenges_won', v_member.total_challenges_won,
            'max_members', v_member.max_members,
            'is_public', v_member.is_public,
            'requires_approval', v_member.requires_approval,
            'created_at', v_member.created_at
        ),
        'user_role', v_member.role,
        'members', COALESCE(v_members, '[]'::jsonb),
        'achievements', COALESCE(v_achievements, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_unlocked_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_weekly_stats ENABLE ROW LEVEL SECURITY;

-- Crews: Public read, write for authenticated
CREATE POLICY "crews_public_read" ON crews FOR SELECT USING (is_public = true);
CREATE POLICY "crews_member_read" ON crews FOR SELECT USING (
    EXISTS (SELECT 1 FROM crew_members WHERE crew_id = id AND user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "crews_owner_write" ON crews FOR ALL USING (owner_id = auth.uid());

-- Members: Visible aux membres, modifiable par admins
CREATE POLICY "crew_members_read" ON crew_members FOR SELECT USING (
    EXISTS (SELECT 1 FROM crew_members cm WHERE cm.crew_id = crew_members.crew_id AND cm.user_id = auth.uid() AND cm.status = 'active')
);
CREATE POLICY "crew_members_write" ON crew_members FOR ALL USING (
    EXISTS (
        SELECT 1 FROM crew_members cm
        WHERE cm.crew_id = crew_members.crew_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.status = 'active'
    )
);

-- Invitations
CREATE POLICY "crew_invitations_invitee" ON crew_invitations FOR SELECT USING (invitee_id = auth.uid());
CREATE POLICY "crew_invitations_crew_admin" ON crew_invitations FOR ALL USING (
    EXISTS (
        SELECT 1 FROM crew_members cm
        WHERE cm.crew_id = crew_invitations.crew_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.status = 'active'
    )
);

-- Join requests
CREATE POLICY "crew_join_requests_user" ON crew_join_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "crew_join_requests_admin" ON crew_join_requests FOR ALL USING (
    EXISTS (
        SELECT 1 FROM crew_members cm
        WHERE cm.crew_id = crew_join_requests.crew_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.status = 'active'
    )
);

-- Achievements: Public read
CREATE POLICY "crew_achievements_read" ON crew_achievements FOR SELECT USING (true);

-- Unlocked achievements: Visible aux membres
CREATE POLICY "crew_unlocked_achievements_read" ON crew_unlocked_achievements FOR SELECT USING (
    EXISTS (SELECT 1 FROM crew_members WHERE crew_id = crew_unlocked_achievements.crew_id AND user_id = auth.uid() AND status = 'active')
);

-- Activity log: Visible aux membres
CREATE POLICY "crew_activity_log_read" ON crew_activity_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM crew_members WHERE crew_id = crew_activity_log.crew_id AND user_id = auth.uid() AND status = 'active')
);

-- Weekly stats: Public read
CREATE POLICY "crew_weekly_stats_read" ON crew_weekly_stats FOR SELECT USING (true);

-- ============================================================================
-- TRIGGER: Auto-update crew stats on member XP change
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_crew_member_contribution()
RETURNS TRIGGER AS $$
BEGIN
    -- Si XP a changé, mettre à jour la contribution
    IF TG_OP = 'UPDATE' AND OLD.total_xp IS DISTINCT FROM NEW.total_xp THEN
        UPDATE crew_members
        SET xp_contributed = xp_contributed + (NEW.total_xp - COALESCE(OLD.total_xp, 0)),
            last_active_at = NOW()
        WHERE user_id = NEW.id AND status = 'active';

        -- Mettre à jour les stats de tous les crews où l'utilisateur est membre
        PERFORM update_crew_stats(crew_id)
        FROM crew_members
        WHERE user_id = NEW.id AND status = 'active';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur profiles pour tracker l'XP
DROP TRIGGER IF EXISTS on_profile_xp_change ON profiles;
CREATE TRIGGER on_profile_xp_change
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_crew_member_contribution();


-- ============================================================================
-- 008_special_challenges.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Special Challenges Migration
-- ============================================================================
-- Description: Défis spéciaux (photo, quiz, géolocalisation, flash)
-- Version: 008
-- ============================================================================

-- ============================================================================
-- TABLE: special_challenge_types
-- ============================================================================
-- Types de défis spéciaux disponibles

CREATE TABLE IF NOT EXISTS special_challenge_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informations de base
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#06b6d4',

    -- Type de défi
    challenge_category VARCHAR(30) NOT NULL CHECK (challenge_category IN (
        'photo', 'quiz', 'geolocation', 'flash', 'social', 'creative'
    )),

    -- Configuration
    duration_minutes INTEGER DEFAULT 60, -- Durée par défaut
    max_participants INTEGER DEFAULT 100,
    min_level_required INTEGER DEFAULT 1,

    -- Récompenses
    base_xp_reward INTEGER DEFAULT 100,
    winner_bonus_xp INTEGER DEFAULT 200,
    participation_xp INTEGER DEFAULT 25,

    -- Validation
    requires_validation BOOLEAN DEFAULT false, -- Validation manuelle requise
    auto_validate BOOLEAN DEFAULT true, -- Validation automatique

    -- Statut
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_special_challenge_types_category
    ON special_challenge_types(challenge_category);
CREATE INDEX IF NOT EXISTS idx_special_challenge_types_active
    ON special_challenge_types(is_active) WHERE is_active = true;

-- ============================================================================
-- TABLE: special_challenges
-- ============================================================================
-- Instances de défis spéciaux

CREATE TABLE IF NOT EXISTS special_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_type_id UUID NOT NULL REFERENCES special_challenge_types(id) ON DELETE CASCADE,

    -- Informations
    title VARCHAR(200) NOT NULL,
    description TEXT,
    instructions TEXT, -- Instructions détaillées

    -- Configuration spécifique
    config JSONB DEFAULT '{}', -- Configuration selon le type (questions quiz, coordonnées GPS, etc.)

    -- Timing
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_flash BOOLEAN DEFAULT false, -- Défi flash (notification push)

    -- Lien avec événement (optionnel)
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,

    -- Statut
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'active', 'voting', 'completed', 'cancelled'
    )),

    -- Résultats
    winner_id UUID REFERENCES profiles(id),
    total_participants INTEGER DEFAULT 0,

    -- Créateur
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_special_challenges_type ON special_challenges(challenge_type_id);
CREATE INDEX IF NOT EXISTS idx_special_challenges_status ON special_challenges(status);
CREATE INDEX IF NOT EXISTS idx_special_challenges_starts ON special_challenges(starts_at);
CREATE INDEX IF NOT EXISTS idx_special_challenges_event ON special_challenges(event_id);

-- ============================================================================
-- TABLE: special_challenge_submissions
-- ============================================================================
-- Soumissions des participants

CREATE TABLE IF NOT EXISTS special_challenge_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES special_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Contenu de la soumission
    submission_type VARCHAR(30) NOT NULL, -- photo, answer, location, text
    content JSONB NOT NULL, -- Contenu selon le type

    -- Pour les photos
    image_url TEXT,
    thumbnail_url TEXT,

    -- Pour les quiz
    answers JSONB, -- Réponses aux questions
    score INTEGER DEFAULT 0, -- Score obtenu

    -- Pour la géolocalisation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    accuracy_meters DECIMAL(8, 2),

    -- Validation
    is_validated BOOLEAN DEFAULT false,
    validated_at TIMESTAMPTZ,
    validated_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,

    -- Votes (pour les défis photo/créatifs)
    vote_count INTEGER DEFAULT 0,

    -- Timing
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    time_taken_seconds INTEGER, -- Temps de réponse (pour quiz)

    -- XP attribué
    xp_awarded INTEGER DEFAULT 0,

    UNIQUE(challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge ON special_challenge_submissions(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_user ON special_challenge_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_votes ON special_challenge_submissions(vote_count DESC);

-- ============================================================================
-- TABLE: challenge_votes
-- ============================================================================
-- Votes des utilisateurs sur les soumissions

CREATE TABLE IF NOT EXISTS challenge_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES special_challenge_submissions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    vote_value INTEGER DEFAULT 1 CHECK (vote_value IN (-1, 1)), -- -1 ou +1

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(submission_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_votes_submission ON challenge_votes(submission_id);

-- ============================================================================
-- TABLE: quiz_questions
-- ============================================================================
-- Questions pour les défis quiz

CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Catégorie
    category VARCHAR(50) NOT NULL, -- music, culture, events, general, party
    difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),

    -- Question
    question TEXT NOT NULL,
    question_type VARCHAR(30) DEFAULT 'multiple_choice' CHECK (question_type IN (
        'multiple_choice', 'true_false', 'image_choice', 'audio_choice'
    )),

    -- Réponses
    options JSONB NOT NULL, -- [{text: "...", is_correct: bool, image_url?: "..."}]
    correct_answer_index INTEGER NOT NULL,

    -- Médias
    image_url TEXT,
    audio_url TEXT,

    -- Points
    points INTEGER DEFAULT 10,
    time_limit_seconds INTEGER DEFAULT 30,

    -- Métadonnées
    is_active BOOLEAN DEFAULT true,
    times_shown INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_category ON quiz_questions(category);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_difficulty ON quiz_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_active ON quiz_questions(is_active) WHERE is_active = true;

-- ============================================================================
-- TABLE: geolocation_zones
-- ============================================================================
-- Zones géographiques pour les défis de géolocalisation

CREATE TABLE IF NOT EXISTS geolocation_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informations
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Coordonnées du centre
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,

    -- Rayon en mètres
    radius_meters INTEGER DEFAULT 100,

    -- Type de zone
    zone_type VARCHAR(30) DEFAULT 'checkpoint' CHECK (zone_type IN (
        'checkpoint', 'venue', 'area', 'secret'
    )),

    -- Lien avec événement/lieu
    event_id UUID REFERENCES events(id),
    venue_id UUID,

    -- XP pour la découverte
    discovery_xp INTEGER DEFAULT 50,

    -- Statut
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geolocation_zones_coords
    ON geolocation_zones(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_geolocation_zones_event
    ON geolocation_zones(event_id);

-- ============================================================================
-- SEED: Special Challenge Types
-- ============================================================================

INSERT INTO special_challenge_types (
    slug, name, description, icon, color, challenge_category,
    duration_minutes, base_xp_reward, winner_bonus_xp, participation_xp,
    requires_validation
) VALUES
-- Photo Challenges
('best-outfit', 'Meilleur Outfit', 'Montre ton plus beau look de la soirée', 'shirt', '#ec4899', 'photo',
 120, 150, 300, 30, false),
('party-moment', 'Moment Party', 'Capture le meilleur moment de la soirée', 'camera', '#f97316', 'photo',
 180, 150, 300, 30, false),
('selfie-crew', 'Selfie Crew', 'Selfie avec le plus d''amis possible', 'users', '#8b5cf6', 'photo',
 90, 100, 200, 25, false),
('creative-shot', 'Shot Créatif', 'Photo la plus créative/artistique', 'sparkles', '#06b6d4', 'photo',
 120, 200, 400, 40, false),

-- Quiz Challenges
('music-quiz', 'Quiz Musical', 'Teste tes connaissances musicales', 'music', '#22c55e', 'quiz',
 15, 100, 250, 20, false),
('party-trivia', 'Party Trivia', 'Questions sur la culture party', 'help-circle', '#eab308', 'quiz',
 10, 100, 250, 20, false),
('speed-quiz', 'Speed Quiz', 'Réponds le plus vite possible', 'zap', '#ef4444', 'quiz',
 5, 150, 300, 25, false),

-- Geolocation Challenges
('treasure-hunt', 'Chasse au Trésor', 'Trouve tous les checkpoints', 'map-pin', '#3b82f6', 'geolocation',
 60, 200, 500, 50, false),
('secret-spot', 'Spot Secret', 'Découvre le lieu mystère', 'map', '#a855f7', 'geolocation',
 30, 150, 300, 40, false),
('venue-explorer', 'Explorateur', 'Visite toutes les zones du lieu', 'compass', '#14b8a6', 'geolocation',
 45, 100, 200, 30, false),

-- Flash Challenges
('flash-dance', 'Flash Dance', 'Défi dance de 5 minutes', 'music-2', '#f43f5e', 'flash',
 5, 100, 200, 30, false),
('flash-photo', 'Flash Photo', 'Photo thématique en 3 minutes', 'camera-off', '#fb923c', 'flash',
 3, 100, 200, 30, false),
('flash-quiz', 'Flash Quiz', 'Quiz éclair de 2 minutes', 'brain', '#84cc16', 'flash',
 2, 100, 200, 30, false),

-- Social Challenges
('new-friends', 'Nouveaux Amis', 'Fais-toi 3 nouveaux amis ce soir', 'user-plus', '#06b6d4', 'social',
 240, 150, 300, 50, true),
('conversation-starter', 'Ice Breaker', 'Lance une conversation avec un inconnu', 'message-circle', '#8b5cf6', 'social',
 60, 100, 200, 30, true),

-- Creative Challenges
('best-story', 'Best Story', 'Story la plus créative de l''event', 'film', '#ec4899', 'creative',
 180, 150, 350, 40, false),
('meme-master', 'Meme Master', 'Crée le meilleur meme de la soirée', 'smile', '#fbbf24', 'creative',
 120, 150, 300, 35, false)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEED: Quiz Questions (Sample)
-- ============================================================================

INSERT INTO quiz_questions (category, difficulty, question, question_type, options, correct_answer_index, points, time_limit_seconds) VALUES
-- Music Questions
('music', 'easy', 'Qui chante "Blinding Lights" ?', 'multiple_choice',
 '[{"text": "The Weeknd", "is_correct": true}, {"text": "Drake", "is_correct": false}, {"text": "Post Malone", "is_correct": false}, {"text": "Ed Sheeran", "is_correct": false}]',
 0, 10, 20),
('music', 'medium', 'En quelle année est sorti "Get Lucky" de Daft Punk ?', 'multiple_choice',
 '[{"text": "2011", "is_correct": false}, {"text": "2013", "is_correct": true}, {"text": "2015", "is_correct": false}, {"text": "2017", "is_correct": false}]',
 1, 15, 25),
('music', 'hard', 'Quel DJ a produit "Titanium" avec Sia ?', 'multiple_choice',
 '[{"text": "Calvin Harris", "is_correct": false}, {"text": "Avicii", "is_correct": false}, {"text": "David Guetta", "is_correct": true}, {"text": "Martin Garrix", "is_correct": false}]',
 2, 20, 30),

-- Culture Questions
('culture', 'easy', 'Quelle est la capitale du Maroc ?', 'multiple_choice',
 '[{"text": "Casablanca", "is_correct": false}, {"text": "Rabat", "is_correct": true}, {"text": "Marrakech", "is_correct": false}, {"text": "Fès", "is_correct": false}]',
 1, 10, 20),
('culture', 'medium', 'Quel plat marocain est traditionnellement servi le vendredi ?', 'multiple_choice',
 '[{"text": "Tajine", "is_correct": false}, {"text": "Couscous", "is_correct": true}, {"text": "Pastilla", "is_correct": false}, {"text": "Harira", "is_correct": false}]',
 1, 15, 25),

-- Party Questions
('party', 'easy', 'Que signifie "DJ" ?', 'multiple_choice',
 '[{"text": "Disc Jockey", "is_correct": true}, {"text": "Dance Jammer", "is_correct": false}, {"text": "Digital Jukebox", "is_correct": false}, {"text": "Disco Jumper", "is_correct": false}]',
 0, 10, 20),
('party', 'medium', 'Quel est le nom du mouvement de danse qui consiste à bouger les épaules ?', 'multiple_choice',
 '[{"text": "Floss", "is_correct": false}, {"text": "Dab", "is_correct": false}, {"text": "Woah", "is_correct": false}, {"text": "Shoulder Roll", "is_correct": true}]',
 3, 15, 25)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCTION: create_special_challenge
-- ============================================================================

CREATE OR REPLACE FUNCTION create_special_challenge(
    p_type_slug VARCHAR(50),
    p_title VARCHAR(200),
    p_description TEXT,
    p_instructions TEXT,
    p_starts_at TIMESTAMPTZ,
    p_ends_at TIMESTAMPTZ,
    p_is_flash BOOLEAN DEFAULT false,
    p_event_id UUID DEFAULT NULL,
    p_config JSONB DEFAULT '{}',
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_type RECORD;
    v_challenge_id UUID;
BEGIN
    -- Récupérer le type
    SELECT * INTO v_type FROM special_challenge_types WHERE slug = p_type_slug AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Type de défi introuvable');
    END IF;

    -- Valider les dates
    IF p_starts_at >= p_ends_at THEN
        RETURN jsonb_build_object('success', false, 'error', 'La date de fin doit être après la date de début');
    END IF;

    -- Créer le défi
    INSERT INTO special_challenges (
        challenge_type_id, title, description, instructions,
        starts_at, ends_at, is_flash, event_id, config,
        status, created_by
    ) VALUES (
        v_type.id, p_title, p_description, p_instructions,
        p_starts_at, p_ends_at, p_is_flash, p_event_id, p_config,
        CASE WHEN p_starts_at <= NOW() THEN 'active' ELSE 'scheduled' END,
        p_created_by
    ) RETURNING id INTO v_challenge_id;

    RETURN jsonb_build_object(
        'success', true,
        'challenge_id', v_challenge_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: submit_challenge_entry
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_challenge_entry(
    p_challenge_id UUID,
    p_user_id UUID,
    p_submission_type VARCHAR(30),
    p_content JSONB,
    p_image_url TEXT DEFAULT NULL,
    p_answers JSONB DEFAULT NULL,
    p_latitude DECIMAL(10, 8) DEFAULT NULL,
    p_longitude DECIMAL(11, 8) DEFAULT NULL,
    p_time_taken INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_challenge RECORD;
    v_type RECORD;
    v_submission_id UUID;
    v_score INTEGER := 0;
    v_xp INTEGER := 0;
BEGIN
    -- Vérifier le défi
    SELECT sc.*, sct.challenge_category, sct.base_xp_reward, sct.participation_xp
    INTO v_challenge
    FROM special_challenges sc
    JOIN special_challenge_types sct ON sc.challenge_type_id = sct.id
    WHERE sc.id = p_challenge_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi introuvable');
    END IF;

    -- Vérifier que le défi est actif
    IF v_challenge.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ce défi n''est pas actif');
    END IF;

    -- Vérifier si l'utilisateur a déjà participé
    IF EXISTS (SELECT 1 FROM special_challenge_submissions WHERE challenge_id = p_challenge_id AND user_id = p_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu as déjà participé à ce défi');
    END IF;

    -- Calculer le score pour les quiz
    IF v_challenge.challenge_category = 'quiz' AND p_answers IS NOT NULL THEN
        SELECT COALESCE(SUM(
            CASE WHEN q.correct_answer_index = (a->>'answer_index')::INTEGER THEN q.points ELSE 0 END
        ), 0)
        INTO v_score
        FROM jsonb_array_elements(p_answers) AS a
        JOIN quiz_questions q ON q.id = (a->>'question_id')::UUID;

        v_xp := v_challenge.participation_xp + (v_score / 10);
    ELSE
        v_xp := v_challenge.participation_xp;
    END IF;

    -- Créer la soumission
    INSERT INTO special_challenge_submissions (
        challenge_id, user_id, submission_type, content,
        image_url, answers, score, latitude, longitude,
        time_taken_seconds, xp_awarded, is_validated
    ) VALUES (
        p_challenge_id, p_user_id, p_submission_type, p_content,
        p_image_url, p_answers, v_score, p_latitude, p_longitude,
        p_time_taken, v_xp,
        CASE WHEN v_challenge.challenge_category IN ('quiz', 'geolocation') THEN true ELSE false END
    ) RETURNING id INTO v_submission_id;

    -- Mettre à jour le compteur de participants
    UPDATE special_challenges
    SET total_participants = total_participants + 1
    WHERE id = p_challenge_id;

    -- Attribuer l'XP
    UPDATE profiles
    SET total_xp = total_xp + v_xp
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'submission_id', v_submission_id,
        'score', v_score,
        'xp_awarded', v_xp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: vote_on_submission
-- ============================================================================

CREATE OR REPLACE FUNCTION vote_on_submission(
    p_submission_id UUID,
    p_user_id UUID,
    p_vote INTEGER -- 1 ou -1
)
RETURNS JSONB AS $$
DECLARE
    v_submission RECORD;
    v_existing_vote INTEGER;
BEGIN
    -- Vérifier la soumission
    SELECT * INTO v_submission FROM special_challenge_submissions WHERE id = p_submission_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Soumission introuvable');
    END IF;

    -- On ne peut pas voter pour soi-même
    IF v_submission.user_id = p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu ne peux pas voter pour toi-même');
    END IF;

    -- Vérifier si déjà voté
    SELECT vote_value INTO v_existing_vote
    FROM challenge_votes
    WHERE submission_id = p_submission_id AND user_id = p_user_id;

    IF v_existing_vote IS NOT NULL THEN
        IF v_existing_vote = p_vote THEN
            -- Retirer le vote
            DELETE FROM challenge_votes WHERE submission_id = p_submission_id AND user_id = p_user_id;
            UPDATE special_challenge_submissions
            SET vote_count = vote_count - p_vote
            WHERE id = p_submission_id;
        ELSE
            -- Changer le vote
            UPDATE challenge_votes
            SET vote_value = p_vote
            WHERE submission_id = p_submission_id AND user_id = p_user_id;
            UPDATE special_challenge_submissions
            SET vote_count = vote_count + (p_vote * 2)
            WHERE id = p_submission_id;
        END IF;
    ELSE
        -- Nouveau vote
        INSERT INTO challenge_votes (submission_id, user_id, vote_value)
        VALUES (p_submission_id, p_user_id, p_vote);
        UPDATE special_challenge_submissions
        SET vote_count = vote_count + p_vote
        WHERE id = p_submission_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: complete_challenge
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_special_challenge(p_challenge_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_challenge RECORD;
    v_winner_id UUID;
    v_type RECORD;
BEGIN
    -- Récupérer le défi
    SELECT sc.*, sct.challenge_category, sct.winner_bonus_xp
    INTO v_challenge
    FROM special_challenges sc
    JOIN special_challenge_types sct ON sc.challenge_type_id = sct.id
    WHERE sc.id = p_challenge_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi introuvable');
    END IF;

    -- Déterminer le gagnant selon le type
    IF v_challenge.challenge_category IN ('photo', 'creative') THEN
        -- Le plus de votes
        SELECT user_id INTO v_winner_id
        FROM special_challenge_submissions
        WHERE challenge_id = p_challenge_id AND is_validated = true
        ORDER BY vote_count DESC, submitted_at ASC
        LIMIT 1;
    ELSIF v_challenge.challenge_category = 'quiz' THEN
        -- Meilleur score, puis temps le plus court
        SELECT user_id INTO v_winner_id
        FROM special_challenge_submissions
        WHERE challenge_id = p_challenge_id
        ORDER BY score DESC, time_taken_seconds ASC
        LIMIT 1;
    ELSIF v_challenge.challenge_category = 'geolocation' THEN
        -- Premier à valider
        SELECT user_id INTO v_winner_id
        FROM special_challenge_submissions
        WHERE challenge_id = p_challenge_id AND is_validated = true
        ORDER BY submitted_at ASC
        LIMIT 1;
    ELSE
        -- Premier soumis validé
        SELECT user_id INTO v_winner_id
        FROM special_challenge_submissions
        WHERE challenge_id = p_challenge_id AND is_validated = true
        ORDER BY submitted_at ASC
        LIMIT 1;
    END IF;

    -- Mettre à jour le défi
    UPDATE special_challenges
    SET status = 'completed', winner_id = v_winner_id
    WHERE id = p_challenge_id;

    -- Attribuer le bonus XP au gagnant
    IF v_winner_id IS NOT NULL THEN
        UPDATE profiles
        SET total_xp = total_xp + v_challenge.winner_bonus_xp
        WHERE id = v_winner_id;

        -- Marquer la soumission gagnante
        UPDATE special_challenge_submissions
        SET xp_awarded = xp_awarded + v_challenge.winner_bonus_xp
        WHERE challenge_id = p_challenge_id AND user_id = v_winner_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'winner_id', v_winner_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: get_active_special_challenges
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_special_challenges(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    challenge_id UUID,
    type_slug VARCHAR(50),
    type_name VARCHAR(100),
    category VARCHAR(30),
    icon VARCHAR(50),
    color VARCHAR(7),
    title VARCHAR(200),
    description TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    is_flash BOOLEAN,
    total_participants INTEGER,
    base_xp INTEGER,
    winner_xp INTEGER,
    has_participated BOOLEAN,
    time_remaining_seconds INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.id as challenge_id,
        sct.slug as type_slug,
        sct.name as type_name,
        sct.challenge_category as category,
        sct.icon,
        sct.color,
        sc.title,
        sc.description,
        sc.starts_at,
        sc.ends_at,
        sc.is_flash,
        sc.total_participants,
        sct.base_xp_reward as base_xp,
        sct.winner_bonus_xp as winner_xp,
        CASE WHEN p_user_id IS NOT NULL THEN
            EXISTS (SELECT 1 FROM special_challenge_submissions WHERE challenge_id = sc.id AND user_id = p_user_id)
        ELSE false END as has_participated,
        EXTRACT(EPOCH FROM (sc.ends_at - NOW()))::INTEGER as time_remaining_seconds
    FROM special_challenges sc
    JOIN special_challenge_types sct ON sc.challenge_type_id = sct.id
    WHERE sc.status = 'active'
    AND sc.ends_at > NOW()
    ORDER BY sc.is_flash DESC, sc.ends_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_quiz_questions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_quiz_questions(
    p_count INTEGER DEFAULT 10,
    p_category VARCHAR(50) DEFAULT NULL,
    p_difficulty VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
    question_id UUID,
    category VARCHAR(50),
    difficulty VARCHAR(20),
    question TEXT,
    question_type VARCHAR(30),
    options JSONB,
    points INTEGER,
    time_limit INTEGER,
    image_url TEXT,
    audio_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        qq.id as question_id,
        qq.category,
        qq.difficulty,
        qq.question,
        qq.question_type,
        -- Mélanger les options et retirer is_correct
        (
            SELECT jsonb_agg(
                jsonb_build_object('text', opt->>'text', 'image_url', opt->>'image_url')
                ORDER BY random()
            )
            FROM jsonb_array_elements(qq.options) AS opt
        ) as options,
        qq.points,
        qq.time_limit_seconds as time_limit,
        qq.image_url,
        qq.audio_url
    FROM quiz_questions qq
    WHERE qq.is_active = true
    AND (p_category IS NULL OR qq.category = p_category)
    AND (p_difficulty IS NULL OR qq.difficulty = p_difficulty)
    ORDER BY random()
    LIMIT p_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE special_challenge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE geolocation_zones ENABLE ROW LEVEL SECURITY;

-- Types: Public read
CREATE POLICY "special_challenge_types_read" ON special_challenge_types
    FOR SELECT USING (true);

-- Challenges: Public read for active
CREATE POLICY "special_challenges_read" ON special_challenges
    FOR SELECT USING (status IN ('active', 'voting', 'completed'));

-- Submissions: User can see own, all can see in completed challenges
CREATE POLICY "submissions_own_read" ON special_challenge_submissions
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "submissions_public_read" ON special_challenge_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM special_challenges
            WHERE id = challenge_id AND status IN ('voting', 'completed')
        )
    );
CREATE POLICY "submissions_insert" ON special_challenge_submissions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Votes: User can manage own
CREATE POLICY "votes_manage" ON challenge_votes
    FOR ALL USING (user_id = auth.uid());
CREATE POLICY "votes_read" ON challenge_votes
    FOR SELECT USING (true);

-- Quiz: Public read
CREATE POLICY "quiz_questions_read" ON quiz_questions
    FOR SELECT USING (is_active = true);

-- Zones: Public read
CREATE POLICY "geolocation_zones_read" ON geolocation_zones
    FOR SELECT USING (is_active = true);

-- ============================================================================
-- CRON JOB: Auto-start and complete challenges
-- ============================================================================

-- Cette fonction devrait être appelée régulièrement (ex: toutes les minutes)
CREATE OR REPLACE FUNCTION process_special_challenges()
RETURNS void AS $$
BEGIN
    -- Activer les défis schedulés
    UPDATE special_challenges
    SET status = 'active'
    WHERE status = 'scheduled' AND starts_at <= NOW();

    -- Passer en voting les défis photo/créatifs terminés
    UPDATE special_challenges
    SET status = 'voting'
    WHERE status = 'active'
    AND ends_at <= NOW()
    AND challenge_type_id IN (
        SELECT id FROM special_challenge_types
        WHERE challenge_category IN ('photo', 'creative')
    );

    -- Terminer les autres défis
    UPDATE special_challenges
    SET status = 'completed'
    WHERE status = 'active'
    AND ends_at <= NOW()
    AND challenge_type_id NOT IN (
        SELECT id FROM special_challenge_types
        WHERE challenge_category IN ('photo', 'creative')
    );

    -- Terminer la période de vote (24h après la fin)
    -- et déterminer les gagnants
    PERFORM complete_special_challenge(id)
    FROM special_challenges
    WHERE status = 'voting'
    AND ends_at + INTERVAL '24 hours' <= NOW();
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 009_event_challenges.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Event Challenges Migration
-- ============================================================================
-- Description: Défis liés aux événements (check-in, stay late, reviewer)
-- Version: 009
-- ============================================================================

-- ============================================================================
-- TABLE: event_challenge_types
-- ============================================================================
-- Types de défis événementiels

CREATE TABLE IF NOT EXISTS event_challenge_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informations de base
    slug VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#ec4899',

    -- Catégorie de défi
    challenge_type VARCHAR(30) NOT NULL CHECK (challenge_type IN (
        'check_in',        -- Arriver à l'event
        'early_bird',      -- Arriver dans les premiers
        'stay_late',       -- Rester jusqu'à la fin
        'full_night',      -- Rester toute la soirée
        'reviewer',        -- Laisser un avis
        'photo_poster',    -- Poster une photo
        'social_share',    -- Partager sur les réseaux
        'vip_access',      -- Accéder à la zone VIP
        'dance_floor',     -- Temps sur la piste de danse
        'bar_regular',     -- Commander au bar
        'meet_staff',      -- Rencontrer le staff/DJ
        'comeback',        -- Revenir à un event
        'streak_event',    -- Enchaîner plusieurs events
        'group_check_in',  -- Check-in en groupe
        'refer_friend'     -- Amener un ami
    )),

    -- Configuration
    xp_reward INTEGER DEFAULT 50,
    bonus_xp INTEGER DEFAULT 0, -- XP bonus si conditions spéciales
    is_recurring BOOLEAN DEFAULT true, -- Peut être complété à chaque event

    -- Conditions
    condition_type VARCHAR(30), -- time, count, group, etc.
    condition_value INTEGER, -- Valeur de la condition

    -- Disponibilité
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_challenge_types_type ON event_challenge_types(challenge_type);
CREATE INDEX IF NOT EXISTS idx_event_challenge_types_active ON event_challenge_types(is_active);

-- ============================================================================
-- TABLE: event_challenges
-- ============================================================================
-- Défis associés à un événement spécifique

CREATE TABLE IF NOT EXISTS event_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL, -- La table events peut ne pas exister
    challenge_type_id UUID NOT NULL REFERENCES event_challenge_types(id) ON DELETE CASCADE,

    -- Personnalisation pour cet event
    custom_name VARCHAR(100),
    custom_description TEXT,
    custom_xp_reward INTEGER,

    -- Conditions spécifiques à l'event
    specific_conditions JSONB DEFAULT '{}',

    -- Timing
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,

    -- Limites
    max_completions INTEGER, -- Nombre max de participants qui peuvent compléter

    -- Stats
    completions_count INTEGER DEFAULT 0,

    -- Statut
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(event_id, challenge_type_id)
);

CREATE INDEX IF NOT EXISTS idx_event_challenges_event ON event_challenges(event_id);
CREATE INDEX IF NOT EXISTS idx_event_challenges_type ON event_challenges(challenge_type_id);
CREATE INDEX IF NOT EXISTS idx_event_challenges_active ON event_challenges(is_active);

-- ============================================================================
-- TABLE: user_event_challenge_progress
-- ============================================================================
-- Progression des utilisateurs sur les défis événementiels

CREATE TABLE IF NOT EXISTS user_event_challenge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
    event_challenge_id UUID NOT NULL REFERENCES event_challenges(id) ON DELETE CASCADE,

    -- Progression
    status VARCHAR(20) DEFAULT 'started' CHECK (status IN (
        'started', 'in_progress', 'completed', 'failed', 'expired'
    )),
    progress_value INTEGER DEFAULT 0,
    progress_data JSONB DEFAULT '{}', -- Données supplémentaires

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Récompenses
    xp_awarded INTEGER DEFAULT 0,

    UNIQUE(teen_id, event_challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_event_progress_teen ON user_event_challenge_progress(teen_id);
CREATE INDEX IF NOT EXISTS idx_user_event_progress_challenge ON user_event_challenge_progress(event_challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_event_progress_status ON user_event_challenge_progress(status);

-- ============================================================================
-- TABLE: event_check_ins
-- ============================================================================
-- Enregistrements des check-ins aux événements

CREATE TABLE IF NOT EXISTS event_check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL, -- La table events peut ne pas exister
    teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

    -- Timing
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    checked_out_at TIMESTAMPTZ,

    -- Localisation (optionnel)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Méthode de check-in
    check_in_method VARCHAR(30) DEFAULT 'manual' CHECK (check_in_method IN (
        'manual', 'qr_code', 'nfc', 'geolocation', 'staff_verified'
    )),

    -- Données supplémentaires
    device_info JSONB DEFAULT '{}',

    -- XP attribué
    xp_awarded INTEGER DEFAULT 0,

    UNIQUE(event_id, teen_id)
);

CREATE INDEX IF NOT EXISTS idx_event_check_ins_event ON event_check_ins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_check_ins_teen ON event_check_ins(teen_id);
CREATE INDEX IF NOT EXISTS idx_event_check_ins_time ON event_check_ins(checked_in_at);

-- ============================================================================
-- TABLE: event_reviews
-- ============================================================================
-- Avis laissés sur les événements

CREATE TABLE IF NOT EXISTS event_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL, -- La table events peut ne pas exister
    teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

    -- Évaluation
    overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    ambiance_rating INTEGER CHECK (ambiance_rating BETWEEN 1 AND 5),
    music_rating INTEGER CHECK (music_rating BETWEEN 1 AND 5),
    staff_rating INTEGER CHECK (staff_rating BETWEEN 1 AND 5),
    value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),

    -- Commentaire
    comment TEXT,
    pros TEXT[], -- Points positifs
    cons TEXT[], -- Points à améliorer

    -- Photos de l'avis
    photo_urls TEXT[],

    -- Modération
    is_verified BOOLEAN DEFAULT false, -- Vérifié via check-in
    is_visible BOOLEAN DEFAULT true,
    moderated_at TIMESTAMPTZ,

    -- Interactions
    helpful_count INTEGER DEFAULT 0,

    -- XP
    xp_awarded INTEGER DEFAULT 0,

    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(event_id, teen_id)
);

CREATE INDEX IF NOT EXISTS idx_event_reviews_event ON event_reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_teen ON event_reviews(teen_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_rating ON event_reviews(overall_rating);
CREATE INDEX IF NOT EXISTS idx_event_reviews_visible ON event_reviews(is_visible);

-- ============================================================================
-- SEED: Event Challenge Types
-- ============================================================================

INSERT INTO event_challenge_types (
    slug, name, description, icon, color, challenge_type,
    xp_reward, bonus_xp, condition_type, condition_value
) VALUES
-- Check-in Challenges
('check-in', 'Check-in', 'Arrive à l''event et fais ton check-in', 'map-pin', '#22c55e', 'check_in',
 50, 0, NULL, NULL),
('early-bird', 'Early Bird', 'Arrive dans les 30 premières minutes', 'sunrise', '#fbbf24', 'early_bird',
 75, 25, 'time', 30),
('first-50', 'Top 50', 'Sois parmi les 50 premiers arrivés', 'medal', '#f97316', 'early_bird',
 100, 50, 'count', 50),

-- Stay Challenges
('stay-late', 'Night Owl', 'Reste jusqu''à 3h du matin', 'moon', '#8b5cf6', 'stay_late',
 100, 0, 'time', 180), -- 3h en minutes après minuit
('full-night', 'Full Night', 'Reste toute la soirée (arrivée → fermeture)', 'star', '#ec4899', 'full_night',
 150, 50, NULL, NULL),
('last-standing', 'Last Standing', 'Sois parmi les 10 derniers à partir', 'trophy', '#ef4444', 'stay_late',
 125, 25, 'count', 10),

-- Social Challenges
('reviewer', 'Reviewer', 'Laisse un avis détaillé sur l''event', 'message-square', '#06b6d4', 'reviewer',
 75, 0, NULL, NULL),
('detailed-review', 'Critique Expert', 'Laisse un avis avec 3+ critères et commentaire', 'award', '#3b82f6', 'reviewer',
 125, 50, 'count', 3),
('photo-poster', 'Photo Star', 'Poste une photo de l''event', 'camera', '#ec4899', 'photo_poster',
 50, 0, NULL, NULL),
('social-share', 'Social Butterfly', 'Partage l''event sur les réseaux', 'share-2', '#1d9bf0', 'social_share',
 60, 0, NULL, NULL),

-- Experience Challenges
('vip-access', 'VIP Experience', 'Accède à la zone VIP', 'crown', '#fbbf24', 'vip_access',
 100, 0, NULL, NULL),
('dance-king', 'Dance King', 'Passe 1h sur la piste de danse', 'music-2', '#a855f7', 'dance_floor',
 75, 0, 'time', 60),
('bar-regular', 'Bar Regular', 'Commande 3 fois au bar', 'coffee', '#f97316', 'bar_regular',
 50, 0, 'count', 3),
('meet-dj', 'Meet the DJ', 'Rencontre le DJ ou un membre du staff', 'users', '#06b6d4', 'meet_staff',
 100, 0, NULL, NULL),

-- Loyalty Challenges
('comeback', 'Comeback Kid', 'Reviens à un event du même lieu', 'repeat', '#22c55e', 'comeback',
 75, 25, NULL, NULL),
('event-streak', 'Streak Master', 'Participe à 3 events d''affilée', 'flame', '#ef4444', 'streak_event',
 200, 100, 'count', 3),
('weekly-regular', 'Weekly Regular', 'Participe à un event chaque semaine pendant 1 mois', 'calendar', '#8b5cf6', 'streak_event',
 500, 200, 'count', 4),

-- Group Challenges
('group-check-in', 'Squad Goals', 'Check-in avec 3+ amis', 'users', '#ec4899', 'group_check_in',
 100, 0, 'count', 3),
('big-squad', 'Big Squad', 'Check-in avec 5+ amis', 'users', '#a855f7', 'group_check_in',
 150, 50, 'count', 5),
('refer-friend', 'Ambassadeur', 'Amène un ami qui n''a jamais participé', 'user-plus', '#22c55e', 'refer_friend',
 100, 0, NULL, NULL)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- FUNCTION: check_in_to_event
-- ============================================================================

CREATE OR REPLACE FUNCTION check_in_to_event(
    p_event_id UUID,
    p_teen_id UUID,
    p_method VARCHAR(30) DEFAULT 'manual',
    p_latitude DECIMAL(10, 8) DEFAULT NULL,
    p_longitude DECIMAL(11, 8) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_event RECORD;
    v_check_in_id UUID;
    v_xp_earned INTEGER := 0;
    v_challenges_completed JSONB := '[]';
    v_early_bird_count INTEGER;
    v_event_start TIMESTAMPTZ;
BEGIN
    -- Vérifier l'événement
    SELECT * INTO v_event FROM events WHERE id = p_event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Événement introuvable');
    END IF;

    -- Vérifier si déjà check-in
    IF EXISTS (SELECT 1 FROM event_check_ins WHERE event_id = p_event_id AND teen_id = p_teen_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu as déjà fait ton check-in');
    END IF;

    -- Créer le check-in
    INSERT INTO event_check_ins (event_id, teen_id, check_in_method, latitude, longitude)
    VALUES (p_event_id, p_teen_id, p_method, p_latitude, p_longitude)
    RETURNING id INTO v_check_in_id;

    -- XP de base pour le check-in
    v_xp_earned := 50;

    -- Vérifier les défis de check-in
    -- 1. Check-in basique
    PERFORM complete_event_challenge(p_event_id, p_teen_id, 'check-in');
    v_challenges_completed := v_challenges_completed || '["check-in"]'::jsonb;

    -- 2. Early bird (30 premières minutes)
    v_event_start := v_event.starts_at;
    IF NOW() <= v_event_start + INTERVAL '30 minutes' THEN
        PERFORM complete_event_challenge(p_event_id, p_teen_id, 'early-bird');
        v_challenges_completed := v_challenges_completed || '["early-bird"]'::jsonb;
        v_xp_earned := v_xp_earned + 25;
    END IF;

    -- 3. Top 50
    SELECT COUNT(*) INTO v_early_bird_count
    FROM event_check_ins WHERE event_id = p_event_id;

    IF v_early_bird_count <= 50 THEN
        PERFORM complete_event_challenge(p_event_id, p_teen_id, 'first-50');
        v_challenges_completed := v_challenges_completed || '["first-50"]'::jsonb;
        v_xp_earned := v_xp_earned + 50;
    END IF;

    -- Mettre à jour l'XP du check-in
    UPDATE event_check_ins SET xp_awarded = v_xp_earned WHERE id = v_check_in_id;

    -- Attribuer l'XP
    PERFORM add_xp_to_user(p_teen_id, v_xp_earned, 'event_challenge', 'event');

    RETURN jsonb_build_object(
        'success', true,
        'check_in_id', v_check_in_id,
        'xp_earned', v_xp_earned,
        'challenges_completed', v_challenges_completed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: check_out_from_event
-- ============================================================================

CREATE OR REPLACE FUNCTION check_out_from_event(
    p_event_id UUID,
    p_teen_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_check_in RECORD;
    v_event RECORD;
    v_xp_earned INTEGER := 0;
    v_challenges_completed JSONB := '[]';
    v_stay_duration INTERVAL;
    v_remaining_count INTEGER;
BEGIN
    -- Vérifier le check-in
    SELECT * INTO v_check_in
    FROM event_check_ins
    WHERE event_id = p_event_id AND teen_id = p_teen_id AND checked_out_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Check-in non trouvé ou déjà check-out');
    END IF;

    -- Récupérer l'event
    SELECT * INTO v_event FROM events WHERE id = p_event_id;

    -- Mettre à jour le check-out
    UPDATE event_check_ins
    SET checked_out_at = NOW()
    WHERE id = v_check_in.id;

    -- Calculer la durée de séjour
    v_stay_duration := NOW() - v_check_in.checked_in_at;

    -- Vérifier les défis de stay
    -- 1. Stay late (après 3h du matin)
    IF EXTRACT(HOUR FROM NOW()) >= 3 OR EXTRACT(HOUR FROM NOW()) < 6 THEN
        PERFORM complete_event_challenge(p_event_id, p_teen_id, 'stay-late');
        v_challenges_completed := v_challenges_completed || '["stay-late"]'::jsonb;
        v_xp_earned := v_xp_earned + 100;
    END IF;

    -- 2. Full night (si arrivé dans les 30 min du début et reste jusqu'à la fin)
    IF v_check_in.checked_in_at <= v_event.starts_at + INTERVAL '30 minutes'
       AND NOW() >= v_event.ends_at - INTERVAL '30 minutes' THEN
        PERFORM complete_event_challenge(p_event_id, p_teen_id, 'full-night');
        v_challenges_completed := v_challenges_completed || '["full-night"]'::jsonb;
        v_xp_earned := v_xp_earned + 150;
    END IF;

    -- 3. Last standing (parmi les 10 derniers)
    SELECT COUNT(*) INTO v_remaining_count
    FROM event_check_ins
    WHERE event_id = p_event_id AND checked_out_at IS NULL;

    IF v_remaining_count <= 10 THEN
        PERFORM complete_event_challenge(p_event_id, p_teen_id, 'last-standing');
        v_challenges_completed := v_challenges_completed || '["last-standing"]'::jsonb;
        v_xp_earned := v_xp_earned + 125;
    END IF;

    -- Attribuer l'XP bonus
    IF v_xp_earned > 0 THEN
        PERFORM add_xp_to_user(p_teen_id, v_xp_earned, 'event_challenge', 'event');
        UPDATE event_check_ins
        SET xp_awarded = xp_awarded + v_xp_earned
        WHERE id = v_check_in.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'stay_duration_minutes', EXTRACT(EPOCH FROM v_stay_duration) / 60,
        'xp_earned', v_xp_earned,
        'challenges_completed', v_challenges_completed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: complete_event_challenge
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_event_challenge(
    p_event_id UUID,
    p_teen_id UUID,
    p_challenge_slug VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_challenge_type RECORD;
    v_event_challenge RECORD;
    v_existing RECORD;
BEGIN
    -- Trouver le type de défi
    SELECT * INTO v_challenge_type FROM event_challenge_types WHERE slug = p_challenge_slug;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Trouver ou créer le défi pour cet event
    SELECT * INTO v_event_challenge
    FROM event_challenges
    WHERE event_id = p_event_id AND challenge_type_id = v_challenge_type.id;

    IF NOT FOUND THEN
        -- Créer le défi pour cet event
        INSERT INTO event_challenges (event_id, challenge_type_id)
        VALUES (p_event_id, v_challenge_type.id)
        RETURNING * INTO v_event_challenge;
    END IF;

    -- Vérifier si déjà complété
    SELECT * INTO v_existing
    FROM user_event_challenge_progress
    WHERE teen_id = p_teen_id AND event_challenge_id = v_event_challenge.id;

    IF v_existing IS NOT NULL AND v_existing.status = 'completed' THEN
        RETURN false; -- Déjà complété
    END IF;

    -- Créer ou mettre à jour la progression
    INSERT INTO user_event_challenge_progress (
        teen_id, event_challenge_id, status, completed_at, xp_awarded
    ) VALUES (
        p_teen_id, v_event_challenge.id, 'completed', NOW(),
        COALESCE(v_event_challenge.custom_xp_reward, v_challenge_type.xp_reward)
    )
    ON CONFLICT (teen_id, event_challenge_id)
    DO UPDATE SET
        status = 'completed',
        completed_at = NOW(),
        xp_awarded = COALESCE(v_event_challenge.custom_xp_reward, v_challenge_type.xp_reward);

    -- Mettre à jour le compteur
    UPDATE event_challenges
    SET completions_count = completions_count + 1
    WHERE id = v_event_challenge.id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: submit_event_review
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_event_review(
    p_event_id UUID,
    p_teen_id UUID,
    p_overall_rating INTEGER,
    p_ambiance_rating INTEGER DEFAULT NULL,
    p_music_rating INTEGER DEFAULT NULL,
    p_staff_rating INTEGER DEFAULT NULL,
    p_value_rating INTEGER DEFAULT NULL,
    p_comment TEXT DEFAULT NULL,
    p_pros TEXT[] DEFAULT NULL,
    p_cons TEXT[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_has_checked_in BOOLEAN;
    v_review_id UUID;
    v_xp_earned INTEGER := 75;
    v_challenges_completed JSONB := '[]';
    v_detail_count INTEGER := 0;
BEGIN
    -- Vérifier si l'utilisateur a participé à l'event
    SELECT EXISTS (SELECT 1 FROM event_check_ins WHERE event_id = p_event_id AND teen_id = p_teen_id)
    INTO v_has_checked_in;

    -- Vérifier s'il y a déjà un avis
    IF EXISTS (SELECT 1 FROM event_reviews WHERE event_id = p_event_id AND teen_id = p_teen_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tu as déjà laissé un avis');
    END IF;

    -- Créer l'avis
    INSERT INTO event_reviews (
        event_id, teen_id, overall_rating, ambiance_rating, music_rating,
        staff_rating, value_rating, comment, pros, cons, is_verified, xp_awarded
    ) VALUES (
        p_event_id, p_teen_id, p_overall_rating, p_ambiance_rating, p_music_rating,
        p_staff_rating, p_value_rating, p_comment, p_pros, p_cons, v_has_checked_in, v_xp_earned
    ) RETURNING id INTO v_review_id;

    -- Compléter le défi reviewer
    PERFORM complete_event_challenge(p_event_id, p_teen_id, 'reviewer');
    v_challenges_completed := v_challenges_completed || '["reviewer"]'::jsonb;

    -- Vérifier si avis détaillé (3+ critères + commentaire)
    IF p_ambiance_rating IS NOT NULL THEN v_detail_count := v_detail_count + 1; END IF;
    IF p_music_rating IS NOT NULL THEN v_detail_count := v_detail_count + 1; END IF;
    IF p_staff_rating IS NOT NULL THEN v_detail_count := v_detail_count + 1; END IF;
    IF p_value_rating IS NOT NULL THEN v_detail_count := v_detail_count + 1; END IF;

    IF v_detail_count >= 3 AND p_comment IS NOT NULL AND LENGTH(p_comment) >= 20 THEN
        PERFORM complete_event_challenge(p_event_id, p_teen_id, 'detailed-review');
        v_challenges_completed := v_challenges_completed || '["detailed-review"]'::jsonb;
        v_xp_earned := v_xp_earned + 50;

        UPDATE event_reviews SET xp_awarded = v_xp_earned WHERE id = v_review_id;
    END IF;

    -- Attribuer l'XP
    PERFORM add_xp_to_user(p_teen_id, v_xp_earned, 'event_challenge', 'event');

    RETURN jsonb_build_object(
        'success', true,
        'review_id', v_review_id,
        'xp_earned', v_xp_earned,
        'is_verified', v_has_checked_in,
        'challenges_completed', v_challenges_completed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: get_event_challenges
-- ============================================================================

CREATE OR REPLACE FUNCTION get_event_challenges(
    p_event_id UUID,
    p_teen_id UUID DEFAULT NULL
)
RETURNS TABLE (
    challenge_id UUID,
    slug VARCHAR(50),
    name VARCHAR(100),
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    challenge_type VARCHAR(30),
    xp_reward INTEGER,
    completions_count INTEGER,
    user_status VARCHAR(20),
    user_completed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.id as challenge_id,
        ect.slug,
        COALESCE(ec.custom_name, ect.name) as name,
        COALESCE(ec.custom_description, ect.description) as description,
        ect.icon,
        ect.color,
        ect.challenge_type,
        COALESCE(ec.custom_xp_reward, ect.xp_reward) as xp_reward,
        ec.completions_count,
        COALESCE(uecp.status, 'not_started') as user_status,
        uecp.completed_at as user_completed_at
    FROM event_challenges ec
    JOIN event_challenge_types ect ON ec.challenge_type_id = ect.id
    LEFT JOIN user_event_challenge_progress uecp
        ON uecp.event_challenge_id = ec.id AND uecp.teen_id = p_teen_id
    WHERE ec.event_id = p_event_id AND ec.is_active = true
    ORDER BY ect.xp_reward DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_user_event_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_event_stats(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_events_attended', (
            SELECT COUNT(DISTINCT event_id) FROM event_check_ins WHERE teen_id = p_teen_id
        ),
        'total_reviews', (
            SELECT COUNT(*) FROM event_reviews WHERE teen_id = p_teen_id
        ),
        'average_rating_given', (
            SELECT ROUND(AVG(overall_rating), 1) FROM event_reviews WHERE teen_id = p_teen_id
        ),
        'challenges_completed', (
            SELECT COUNT(*) FROM user_event_challenge_progress
            WHERE teen_id = p_teen_id AND status = 'completed'
        ),
        'total_xp_from_events', (
            SELECT COALESCE(SUM(xp_awarded), 0) FROM event_check_ins WHERE teen_id = p_teen_id
        ) + (
            SELECT COALESCE(SUM(xp_awarded), 0) FROM event_reviews WHERE teen_id = p_teen_id
        ) + (
            SELECT COALESCE(SUM(xp_awarded), 0) FROM user_event_challenge_progress WHERE teen_id = p_teen_id
        ),
        'early_bird_count', (
            SELECT COUNT(*) FROM user_event_challenge_progress uecp
            JOIN event_challenges ec ON uecp.event_challenge_id = ec.id
            JOIN event_challenge_types ect ON ec.challenge_type_id = ect.id
            WHERE uecp.teen_id = p_teen_id AND ect.challenge_type = 'early_bird' AND uecp.status = 'completed'
        ),
        'stay_late_count', (
            SELECT COUNT(*) FROM user_event_challenge_progress uecp
            JOIN event_challenges ec ON uecp.event_challenge_id = ec.id
            JOIN event_challenge_types ect ON ec.challenge_type_id = ect.id
            WHERE uecp.teen_id = p_teen_id AND ect.challenge_type IN ('stay_late', 'full_night') AND uecp.status = 'completed'
        ),
        'current_event_streak', (
            SELECT COALESCE(streak_count, 0) FROM user_streaks WHERE teen_id = p_teen_id AND streak_type = 'events'
        )
    ) INTO v_stats;

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE event_challenge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "event_challenge_types_read" ON event_challenge_types;
DROP POLICY IF EXISTS "event_challenges_read" ON event_challenges;
DROP POLICY IF EXISTS "user_event_progress_own" ON user_event_challenge_progress;
DROP POLICY IF EXISTS "event_check_ins_own" ON event_check_ins;
DROP POLICY IF EXISTS "event_check_ins_read" ON event_check_ins;
DROP POLICY IF EXISTS "event_reviews_own" ON event_reviews;
DROP POLICY IF EXISTS "event_reviews_read" ON event_reviews;

-- Types: Public read
CREATE POLICY "event_challenge_types_read" ON event_challenge_types
    FOR SELECT USING (true);

-- Event challenges: Public read
CREATE POLICY "event_challenges_read" ON event_challenges
    FOR SELECT USING (true);

-- User progress: Own read/write (via teens.parent_id)
CREATE POLICY "user_event_progress_own" ON user_event_challenge_progress
    FOR ALL USING (
        EXISTS (SELECT 1 FROM teens WHERE id = user_event_challenge_progress.teen_id AND parent_id = auth.uid())
    );

-- Check-ins: Own manage, public read
CREATE POLICY "event_check_ins_own" ON event_check_ins
    FOR ALL USING (
        EXISTS (SELECT 1 FROM teens WHERE id = event_check_ins.teen_id AND parent_id = auth.uid())
    );
CREATE POLICY "event_check_ins_read" ON event_check_ins
    FOR SELECT USING (true);

-- Reviews: Own manage, public read visible
CREATE POLICY "event_reviews_own" ON event_reviews
    FOR ALL USING (
        EXISTS (SELECT 1 FROM teens WHERE id = event_reviews.teen_id AND parent_id = auth.uid())
    );
CREATE POLICY "event_reviews_read" ON event_reviews
    FOR SELECT USING (is_visible = true);


-- ============================================================================
-- 010_seasonal_challenges.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Seasonal Challenges & Advent Calendar
-- ============================================================================
-- Migration: 010_seasonal_challenges.sql
-- Description: Système de défis saisonniers et calendrier de l'Avent
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Table des saisons
CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    theme_color VARCHAR(7) DEFAULT '#ffffff',
    icon VARCHAR(50),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des défis saisonniers
CREATE TABLE IF NOT EXISTS seasonal_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'seasonal', 'special'
    category VARCHAR(50) NOT NULL, -- 'social', 'event', 'engagement', 'creative', 'collection'
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#ffffff',
    xp_reward INTEGER NOT NULL DEFAULT 50,
    bonus_xp INTEGER DEFAULT 0,
    target_count INTEGER DEFAULT 1,
    start_date DATE,
    end_date DATE,
    day_number INTEGER, -- Pour le calendrier de l'Avent (1-31)
    unlock_condition JSONB, -- Conditions pour débloquer
    reward_type VARCHAR(50), -- 'xp', 'badge', 'item', 'coins', 'mystery_box'
    reward_data JSONB, -- Détails de la récompense
    is_premium BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progression des défis saisonniers
CREATE TABLE IF NOT EXISTS user_seasonal_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seasonal_challenge_id UUID REFERENCES seasonal_challenges(id) ON DELETE CASCADE,
    current_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'locked', -- 'locked', 'available', 'in_progress', 'completed', 'claimed'
    unlocked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, seasonal_challenge_id)
);

-- Calendrier de l'Avent
CREATE TABLE IF NOT EXISTS advent_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    theme VARCHAR(50) DEFAULT 'christmas',
    start_date DATE NOT NULL, -- Généralement 1er décembre
    end_date DATE NOT NULL, -- 24 ou 25 décembre
    total_days INTEGER DEFAULT 24,
    bonus_reward_day INTEGER DEFAULT 24, -- Jour du bonus final
    bonus_reward JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, theme)
);

-- Cases du calendrier de l'Avent
CREATE TABLE IF NOT EXISTS advent_calendar_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advent_calendar_id UUID REFERENCES advent_calendars(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title VARCHAR(200),
    description TEXT,
    reward_type VARCHAR(50) NOT NULL, -- 'xp', 'badge', 'item', 'coins', 'mystery_box', 'special'
    reward_amount INTEGER DEFAULT 0,
    reward_data JSONB, -- Détails supplémentaires
    challenge_id UUID REFERENCES seasonal_challenges(id), -- Challenge optionnel à compléter
    icon VARCHAR(50),
    is_premium BOOLEAN DEFAULT false,
    is_bonus BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(advent_calendar_id, day_number)
);

-- Ouvertures du calendrier de l'Avent par utilisateur
CREATE TABLE IF NOT EXISTS user_advent_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    advent_calendar_id UUID REFERENCES advent_calendars(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    reward_claimed BOOLEAN DEFAULT true,
    challenge_completed BOOLEAN DEFAULT false,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, advent_calendar_id, day_number)
);

-- Récompenses saisonnières spéciales
CREATE TABLE IF NOT EXISTS seasonal_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    reward_type VARCHAR(50) NOT NULL,
    reward_data JSONB,
    required_challenges INTEGER DEFAULT 0, -- Nombre de défis à compléter
    required_points INTEGER DEFAULT 0, -- Points saisonniers requis
    icon VARCHAR(50),
    rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    is_limited BOOLEAN DEFAULT true,
    max_claims INTEGER, -- NULL = illimité
    current_claims INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Réclamations de récompenses saisonnières
CREATE TABLE IF NOT EXISTS user_seasonal_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    seasonal_reward_id UUID REFERENCES seasonal_rewards(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, seasonal_reward_id)
);

-- ============================================================================
-- INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_seasons_dates ON seasons(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_seasons_active ON seasons(is_active);

CREATE INDEX IF NOT EXISTS idx_seasonal_challenges_season ON seasonal_challenges(season_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_challenges_type ON seasonal_challenges(challenge_type);
CREATE INDEX IF NOT EXISTS idx_seasonal_challenges_dates ON seasonal_challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_seasonal_challenges_day ON seasonal_challenges(day_number);

CREATE INDEX IF NOT EXISTS idx_user_seasonal_progress_user ON user_seasonal_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_seasonal_progress_challenge ON user_seasonal_progress(seasonal_challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_seasonal_progress_status ON user_seasonal_progress(status);

CREATE INDEX IF NOT EXISTS idx_advent_calendars_year ON advent_calendars(year);
CREATE INDEX IF NOT EXISTS idx_advent_calendar_days_calendar ON advent_calendar_days(advent_calendar_id);
CREATE INDEX IF NOT EXISTS idx_user_advent_progress_user ON user_advent_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_seasonal_rewards_season ON seasonal_rewards(season_id);

-- ============================================================================
-- DONNÉES INITIALES - SAISONS
-- ============================================================================

INSERT INTO seasons (slug, name, description, theme_color, icon, start_date, end_date) VALUES
-- Hiver
('winter_2024', 'Hiver 2024', 'Saison hivernale avec défis festifs', '#60A5FA', 'Snowflake', '2024-12-01', '2025-02-28'),
-- Printemps
('spring_2025', 'Printemps 2025', 'Renouveau et nouveaux défis', '#34D399', 'Flower', '2025-03-01', '2025-05-31'),
-- Été
('summer_2025', 'Été 2025', 'Saison estivale et soirées enflammées', '#FBBF24', 'Sun', '2025-06-01', '2025-08-31'),
-- Automne
('fall_2025', 'Automne 2025', 'Rentrée et nouvelles aventures', '#F97316', 'Leaf', '2025-09-01', '2025-11-30')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- DONNÉES INITIALES - CALENDRIER DE L'AVENT 2024
-- ============================================================================

INSERT INTO advent_calendars (year, title, description, theme, start_date, end_date, total_days, bonus_reward_day, bonus_reward)
VALUES (
    2024,
    'Calendrier de l''Avent 2024',
    'Ouvre une case chaque jour et découvre des surprises exclusives !',
    'christmas',
    '2024-12-01',
    '2024-12-24',
    24,
    24,
    '{"type": "mystery_box", "name": "Coffre du Père Noël", "xp": 500, "badge_id": "santa_helper"}'
)
ON CONFLICT (year, theme) DO NOTHING;

-- Cases du calendrier (exemple pour les 24 jours)
DO $$
DECLARE
    calendar_id UUID;
    rewards TEXT[][] := ARRAY[
        -- [reward_type, amount, title, description, icon]
        ['xp', '50', 'Bonus XP', 'Un petit boost pour commencer', 'Zap'],
        ['coins', '100', 'Pièces d''Or', 'Des pièces pour la boutique', 'Coins'],
        ['xp', '75', 'XP Surprise', 'Plus de points bonus', 'Gift'],
        ['mystery_box', '1', 'Boîte Mystère', 'Qu''y a-t-il dedans ?', 'Box'],
        ['xp', '100', 'Gros Bonus XP', 'Tu progresses vite !', 'Zap'],
        ['badge', '1', 'Badge Exclusif', 'Badge de la première semaine', 'Award'],
        ['coins', '150', 'Jackpot Pièces', 'Plein de pièces !', 'Coins'],
        ['xp', '80', 'XP du Weekend', 'Pour bien finir la semaine', 'Calendar'],
        ['item', '1', 'Cadre de Profil', 'Un nouveau cadre festif', 'Frame'],
        ['xp', '100', 'Bonus Mi-Parcours', 'Tu es à mi-chemin !', 'Target'],
        ['coins', '200', 'Trésor Caché', 'Un trésor pour toi', 'Gem'],
        ['mystery_box', '1', 'Super Boîte', 'Surprise de mi-décembre', 'Box'],
        ['xp', '120', 'Vendredi 13 Lucky', 'La chance est avec toi', 'Clover'],
        ['badge', '1', 'Badge Mi-Décembre', 'Tu es persévérant !', 'Medal'],
        ['coins', '175', 'Bonus Weekend', 'Pour tes achats', 'ShoppingBag'],
        ['xp', '90', 'Dimanche XP', 'Repos et récompenses', 'Coffee'],
        ['item', '1', 'Titre Exclusif', 'Un nouveau titre rare', 'Crown'],
        ['xp', '150', 'Sprint Final', 'Plus que quelques jours !', 'Rocket'],
        ['coins', '250', 'Avant-Dernière Semaine', 'Presque là !', 'Star'],
        ['mystery_box', '1', 'Méga Boîte', 'Grosse surprise !', 'Package'],
        ['xp', '200', 'Samedi de Fête', 'La fête commence', 'PartyPopper'],
        ['badge', '1', 'Badge Avant-Veille', 'Plus que 2 jours', 'Bell'],
        ['item', '1', 'Avatar Exclusif', 'Look de Noël', 'User'],
        ['special', '1', 'Coffre Légendaire', 'Le grand jour !', 'Crown']
    ];
    i INTEGER;
BEGIN
    -- Récupérer l'ID du calendrier
    SELECT id INTO calendar_id FROM advent_calendars WHERE year = 2024 AND theme = 'christmas';

    IF calendar_id IS NOT NULL THEN
        FOR i IN 1..24 LOOP
            INSERT INTO advent_calendar_days (
                advent_calendar_id,
                day_number,
                title,
                description,
                reward_type,
                reward_amount,
                icon,
                is_bonus
            ) VALUES (
                calendar_id,
                i,
                rewards[i][3],
                rewards[i][4],
                rewards[i][1],
                rewards[i][2]::INTEGER,
                rewards[i][5],
                i = 24
            )
            ON CONFLICT (advent_calendar_id, day_number) DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- ============================================================================
-- DONNÉES INITIALES - DÉFIS SAISONNIERS HIVER
-- ============================================================================

DO $$
DECLARE
    winter_id UUID;
BEGIN
    SELECT id INTO winter_id FROM seasons WHERE slug = 'winter_2024';

    IF winter_id IS NOT NULL THEN
        INSERT INTO seasonal_challenges (season_id, title, description, challenge_type, category, icon, color, xp_reward, target_count, reward_type) VALUES
        -- Défis quotidiens
        (winter_id, 'Check-in Hivernal', 'Fais un check-in à un événement', 'daily', 'event', 'MapPin', '#60A5FA', 30, 1, 'xp'),
        (winter_id, 'Social du Jour', 'Connecte-toi avec un nouvel ami', 'daily', 'social', 'UserPlus', '#34D399', 25, 1, 'xp'),
        (winter_id, 'Story Givrée', 'Partage une story depuis un événement', 'daily', 'engagement', 'Camera', '#F472B6', 35, 1, 'xp'),

        -- Défis hebdomadaires
        (winter_id, 'Semaine Active', 'Participe à 3 événements cette semaine', 'weekly', 'event', 'Calendar', '#8B5CF6', 150, 3, 'xp'),
        (winter_id, 'Crew Spirit', 'Fais gagner 500 XP à ton crew', 'weekly', 'social', 'Users', '#EC4899', 200, 500, 'xp'),
        (winter_id, 'Reviewer Hivernal', 'Laisse 5 avis cette semaine', 'weekly', 'engagement', 'Star', '#FBBF24', 175, 5, 'xp'),
        (winter_id, 'Night Owl d''Hiver', 'Reste jusqu''à la fermeture 2 fois', 'weekly', 'event', 'Moon', '#6366F1', 225, 2, 'xp'),

        -- Défis saisonniers
        (winter_id, 'Maître de l''Hiver', 'Complète 50 défis cet hiver', 'seasonal', 'engagement', 'Trophy', '#FFD700', 1000, 50, 'badge'),
        (winter_id, 'Roi des Soirées', 'Participe à 20 événements', 'seasonal', 'event', 'Crown', '#FFD700', 800, 20, 'badge'),
        (winter_id, 'Influenceur Hivernal', 'Invite 10 amis qui s''inscrivent', 'seasonal', 'social', 'Share2', '#10B981', 600, 10, 'item'),
        (winter_id, 'Collection Complète', 'Obtiens tous les badges d''hiver', 'seasonal', 'collection', 'Collection', '#F59E0B', 1500, 10, 'badge'),

        -- Défis spéciaux
        (winter_id, 'Nouvel An Party', 'Sois présent à minuit le 31 décembre', 'special', 'event', 'PartyPopper', '#FFD700', 500, 1, 'badge'),
        (winter_id, 'First of the Year', 'Premier check-in de 2025', 'special', 'event', 'Rocket', '#EF4444', 300, 1, 'item')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- FONCTIONS
-- ============================================================================

-- Fonction pour obtenir le calendrier de l'Avent actif
CREATE OR REPLACE FUNCTION get_active_advent_calendar(p_user_id UUID)
RETURNS TABLE (
    calendar JSONB,
    days JSONB,
    user_progress JSONB,
    stats JSONB
) AS $$
DECLARE
    v_calendar JSONB;
    v_days JSONB;
    v_progress JSONB;
    v_stats JSONB;
    v_calendar_id UUID;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Récupérer le calendrier actif
    SELECT
        jsonb_build_object(
            'id', ac.id,
            'year', ac.year,
            'title', ac.title,
            'description', ac.description,
            'theme', ac.theme,
            'start_date', ac.start_date,
            'end_date', ac.end_date,
            'total_days', ac.total_days,
            'bonus_reward_day', ac.bonus_reward_day,
            'bonus_reward', ac.bonus_reward,
            'current_day', LEAST(
                GREATEST(1, EXTRACT(DAY FROM v_today - ac.start_date)::INTEGER + 1),
                ac.total_days
            )
        ),
        ac.id
    INTO v_calendar, v_calendar_id
    FROM advent_calendars ac
    WHERE ac.is_active = true
      AND ac.start_date <= v_today
      AND ac.end_date >= v_today
    ORDER BY ac.year DESC
    LIMIT 1;

    IF v_calendar_id IS NULL THEN
        RETURN QUERY SELECT NULL::JSONB, NULL::JSONB, NULL::JSONB, NULL::JSONB;
        RETURN;
    END IF;

    -- Récupérer les cases
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', acd.id,
            'day_number', acd.day_number,
            'title', acd.title,
            'description', acd.description,
            'reward_type', acd.reward_type,
            'reward_amount', acd.reward_amount,
            'reward_data', acd.reward_data,
            'icon', acd.icon,
            'is_premium', acd.is_premium,
            'is_bonus', acd.is_bonus,
            'is_unlocked', acd.day_number <= EXTRACT(DAY FROM v_today - (SELECT start_date FROM advent_calendars WHERE id = v_calendar_id))::INTEGER + 1
        ) ORDER BY acd.day_number
    )
    INTO v_days
    FROM advent_calendar_days acd
    WHERE acd.advent_calendar_id = v_calendar_id;

    -- Récupérer la progression utilisateur
    SELECT jsonb_agg(
        jsonb_build_object(
            'day_number', uap.day_number,
            'opened_at', uap.opened_at,
            'reward_claimed', uap.reward_claimed,
            'challenge_completed', uap.challenge_completed,
            'xp_earned', uap.xp_earned
        )
    )
    INTO v_progress
    FROM user_advent_progress uap
    WHERE uap.user_id = p_user_id
      AND uap.advent_calendar_id = v_calendar_id;

    -- Calculer les stats
    SELECT jsonb_build_object(
        'days_opened', COALESCE((
            SELECT COUNT(*) FROM user_advent_progress
            WHERE user_id = p_user_id AND advent_calendar_id = v_calendar_id
        ), 0),
        'total_xp_earned', COALESCE((
            SELECT SUM(xp_earned) FROM user_advent_progress
            WHERE user_id = p_user_id AND advent_calendar_id = v_calendar_id
        ), 0),
        'current_streak', COALESCE((
            -- Calcul de la série actuelle
            SELECT COUNT(*) FROM (
                SELECT day_number,
                       day_number - ROW_NUMBER() OVER (ORDER BY day_number) AS grp
                FROM user_advent_progress
                WHERE user_id = p_user_id AND advent_calendar_id = v_calendar_id
            ) sub
            WHERE grp = (
                SELECT day_number - ROW_NUMBER() OVER (ORDER BY day_number)
                FROM user_advent_progress
                WHERE user_id = p_user_id AND advent_calendar_id = v_calendar_id
                ORDER BY day_number DESC
                LIMIT 1
            )
        ), 0),
        'completion_percentage', ROUND(
            COALESCE((
                SELECT COUNT(*)::NUMERIC / 24 * 100
                FROM user_advent_progress
                WHERE user_id = p_user_id AND advent_calendar_id = v_calendar_id
            ), 0)
        )
    )
    INTO v_stats;

    RETURN QUERY SELECT v_calendar, v_days, v_progress, v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour ouvrir une case du calendrier
CREATE OR REPLACE FUNCTION open_advent_day(
    p_user_id UUID,
    p_day_number INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_calendar_id UUID;
    v_calendar_start DATE;
    v_today DATE := CURRENT_DATE;
    v_day_data RECORD;
    v_xp_earned INTEGER := 0;
    v_reward JSONB;
    v_already_opened BOOLEAN;
BEGIN
    -- Récupérer le calendrier actif
    SELECT id, start_date INTO v_calendar_id, v_calendar_start
    FROM advent_calendars
    WHERE is_active = true
      AND start_date <= v_today
      AND end_date >= v_today
    LIMIT 1;

    IF v_calendar_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pas de calendrier actif');
    END IF;

    -- Vérifier si le jour est débloqué
    IF p_day_number > (v_today - v_calendar_start)::INTEGER + 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ce jour n''est pas encore disponible');
    END IF;

    -- Vérifier si déjà ouvert
    SELECT EXISTS (
        SELECT 1 FROM user_advent_progress
        WHERE user_id = p_user_id
          AND advent_calendar_id = v_calendar_id
          AND day_number = p_day_number
    ) INTO v_already_opened;

    IF v_already_opened THEN
        RETURN jsonb_build_object('success', false, 'error', 'Case déjà ouverte');
    END IF;

    -- Récupérer les données de la case
    SELECT * INTO v_day_data
    FROM advent_calendar_days
    WHERE advent_calendar_id = v_calendar_id
      AND day_number = p_day_number;

    IF v_day_data IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Case non trouvée');
    END IF;

    -- Calculer les XP
    CASE v_day_data.reward_type
        WHEN 'xp' THEN
            v_xp_earned := v_day_data.reward_amount;
        WHEN 'coins' THEN
            v_xp_earned := 10; -- Petit bonus XP pour les pièces
        WHEN 'mystery_box' THEN
            v_xp_earned := 25;
        WHEN 'badge' THEN
            v_xp_earned := 50;
        WHEN 'item' THEN
            v_xp_earned := 30;
        WHEN 'special' THEN
            v_xp_earned := 100;
        ELSE
            v_xp_earned := 10;
    END CASE;

    -- Enregistrer l'ouverture
    INSERT INTO user_advent_progress (
        user_id,
        advent_calendar_id,
        day_number,
        xp_earned
    ) VALUES (
        p_user_id,
        v_calendar_id,
        p_day_number,
        v_xp_earned
    );

    -- Ajouter les XP au profil utilisateur
    UPDATE user_profiles
    SET xp = xp + v_xp_earned,
        total_xp = total_xp + v_xp_earned
    WHERE id = p_user_id;

    -- Construire la récompense
    v_reward := jsonb_build_object(
        'type', v_day_data.reward_type,
        'amount', v_day_data.reward_amount,
        'title', v_day_data.title,
        'description', v_day_data.description,
        'icon', v_day_data.icon,
        'data', v_day_data.reward_data
    );

    RETURN jsonb_build_object(
        'success', true,
        'day_number', p_day_number,
        'reward', v_reward,
        'xp_earned', v_xp_earned
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour récupérer les défis saisonniers
CREATE OR REPLACE FUNCTION get_seasonal_challenges(
    p_user_id UUID,
    p_season_slug VARCHAR DEFAULT NULL,
    p_challenge_type VARCHAR DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
    v_season_id UUID;
BEGIN
    -- Déterminer la saison (actuelle si non spécifiée)
    IF p_season_slug IS NOT NULL THEN
        SELECT id INTO v_season_id FROM seasons WHERE slug = p_season_slug;
    ELSE
        SELECT id INTO v_season_id FROM seasons
        WHERE is_active = true
          AND start_date <= CURRENT_DATE
          AND end_date >= CURRENT_DATE
        LIMIT 1;
    END IF;

    IF v_season_id IS NULL THEN
        RETURN jsonb_build_object('challenges', '[]'::JSONB, 'season', NULL);
    END IF;

    -- Récupérer les défis avec progression
    SELECT jsonb_build_object(
        'season', (
            SELECT jsonb_build_object(
                'id', s.id,
                'slug', s.slug,
                'name', s.name,
                'description', s.description,
                'theme_color', s.theme_color,
                'icon', s.icon,
                'start_date', s.start_date,
                'end_date', s.end_date,
                'days_remaining', (s.end_date - CURRENT_DATE)
            )
            FROM seasons s WHERE s.id = v_season_id
        ),
        'challenges', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', sc.id,
                    'title', sc.title,
                    'description', sc.description,
                    'challenge_type', sc.challenge_type,
                    'category', sc.category,
                    'icon', sc.icon,
                    'color', sc.color,
                    'xp_reward', sc.xp_reward,
                    'bonus_xp', sc.bonus_xp,
                    'target_count', sc.target_count,
                    'reward_type', sc.reward_type,
                    'reward_data', sc.reward_data,
                    'is_premium', sc.is_premium,
                    'start_date', sc.start_date,
                    'end_date', sc.end_date,
                    'user_progress', COALESCE((
                        SELECT jsonb_build_object(
                            'status', usp.status,
                            'current_count', usp.current_count,
                            'completed_at', usp.completed_at,
                            'claimed_at', usp.claimed_at,
                            'xp_earned', usp.xp_earned
                        )
                        FROM user_seasonal_progress usp
                        WHERE usp.user_id = p_user_id
                          AND usp.seasonal_challenge_id = sc.id
                    ), jsonb_build_object(
                        'status', 'available',
                        'current_count', 0,
                        'completed_at', NULL,
                        'claimed_at', NULL,
                        'xp_earned', 0
                    ))
                ) ORDER BY sc.sort_order, sc.xp_reward DESC
            )
            FROM seasonal_challenges sc
            WHERE sc.season_id = v_season_id
              AND sc.is_active = true
              AND (p_challenge_type IS NULL OR sc.challenge_type = p_challenge_type)
              AND (sc.start_date IS NULL OR sc.start_date <= CURRENT_DATE)
              AND (sc.end_date IS NULL OR sc.end_date >= CURRENT_DATE)
        ), '[]'::JSONB),
        'stats', jsonb_build_object(
            'total_challenges', (
                SELECT COUNT(*) FROM seasonal_challenges
                WHERE season_id = v_season_id AND is_active = true
            ),
            'completed', (
                SELECT COUNT(*) FROM user_seasonal_progress usp
                JOIN seasonal_challenges sc ON sc.id = usp.seasonal_challenge_id
                WHERE usp.user_id = p_user_id
                  AND sc.season_id = v_season_id
                  AND usp.status IN ('completed', 'claimed')
            ),
            'total_xp_earned', COALESCE((
                SELECT SUM(usp.xp_earned) FROM user_seasonal_progress usp
                JOIN seasonal_challenges sc ON sc.id = usp.seasonal_challenge_id
                WHERE usp.user_id = p_user_id AND sc.season_id = v_season_id
            ), 0)
        )
    )
    INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour compléter un défi saisonnier
CREATE OR REPLACE FUNCTION complete_seasonal_challenge(
    p_user_id UUID,
    p_challenge_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_challenge RECORD;
    v_progress RECORD;
    v_xp_earned INTEGER;
    v_reward JSONB;
BEGIN
    -- Récupérer le défi
    SELECT * INTO v_challenge
    FROM seasonal_challenges
    WHERE id = p_challenge_id AND is_active = true;

    IF v_challenge IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi non trouvé');
    END IF;

    -- Récupérer ou créer la progression
    INSERT INTO user_seasonal_progress (user_id, seasonal_challenge_id, status, current_count)
    VALUES (p_user_id, p_challenge_id, 'in_progress', 0)
    ON CONFLICT (user_id, seasonal_challenge_id) DO NOTHING;

    SELECT * INTO v_progress
    FROM user_seasonal_progress
    WHERE user_id = p_user_id AND seasonal_challenge_id = p_challenge_id;

    -- Vérifier si déjà complété
    IF v_progress.status IN ('completed', 'claimed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi déjà complété');
    END IF;

    -- Vérifier si la cible est atteinte
    IF v_progress.current_count < v_challenge.target_count THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Objectif non atteint',
            'current', v_progress.current_count,
            'target', v_challenge.target_count
        );
    END IF;

    -- Calculer les XP
    v_xp_earned := v_challenge.xp_reward + COALESCE(v_challenge.bonus_xp, 0);

    -- Mettre à jour la progression
    UPDATE user_seasonal_progress
    SET status = 'completed',
        completed_at = NOW(),
        xp_earned = v_xp_earned,
        updated_at = NOW()
    WHERE id = v_progress.id;

    -- Ajouter les XP
    UPDATE user_profiles
    SET xp = xp + v_xp_earned,
        total_xp = total_xp + v_xp_earned
    WHERE id = p_user_id;

    -- Construire la récompense
    v_reward := jsonb_build_object(
        'type', v_challenge.reward_type,
        'data', v_challenge.reward_data
    );

    RETURN jsonb_build_object(
        'success', true,
        'challenge_id', p_challenge_id,
        'xp_earned', v_xp_earned,
        'reward', v_reward
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour mettre à jour la progression d'un défi saisonnier
CREATE OR REPLACE FUNCTION update_seasonal_progress(
    p_user_id UUID,
    p_challenge_id UUID,
    p_increment INTEGER DEFAULT 1
) RETURNS JSONB AS $$
DECLARE
    v_challenge RECORD;
    v_progress RECORD;
    v_new_count INTEGER;
    v_completed BOOLEAN := false;
BEGIN
    -- Récupérer le défi
    SELECT * INTO v_challenge
    FROM seasonal_challenges
    WHERE id = p_challenge_id AND is_active = true;

    IF v_challenge IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Défi non trouvé');
    END IF;

    -- Créer ou mettre à jour la progression
    INSERT INTO user_seasonal_progress (user_id, seasonal_challenge_id, status, current_count)
    VALUES (p_user_id, p_challenge_id, 'in_progress', p_increment)
    ON CONFLICT (user_id, seasonal_challenge_id)
    DO UPDATE SET
        current_count = user_seasonal_progress.current_count + p_increment,
        status = CASE
            WHEN user_seasonal_progress.status = 'available' THEN 'in_progress'
            ELSE user_seasonal_progress.status
        END,
        updated_at = NOW()
    RETURNING * INTO v_progress;

    v_new_count := v_progress.current_count;

    -- Vérifier si complété
    IF v_new_count >= v_challenge.target_count AND v_progress.status NOT IN ('completed', 'claimed') THEN
        v_completed := true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'challenge_id', p_challenge_id,
        'current_count', v_new_count,
        'target_count', v_challenge.target_count,
        'completed', v_completed,
        'percentage', ROUND((v_new_count::NUMERIC / v_challenge.target_count) * 100)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_seasonal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_advent_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_seasonal_rewards ENABLE ROW LEVEL SECURITY;

-- Policies pour user_seasonal_progress
CREATE POLICY "Users can view own seasonal progress"
    ON user_seasonal_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seasonal progress"
    ON user_seasonal_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own seasonal progress"
    ON user_seasonal_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- Policies pour user_advent_progress
CREATE POLICY "Users can view own advent progress"
    ON user_advent_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own advent progress"
    ON user_advent_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies pour user_seasonal_rewards
CREATE POLICY "Users can view own seasonal rewards"
    ON user_seasonal_rewards FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seasonal rewards"
    ON user_seasonal_rewards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policies publiques pour les données de référence
CREATE POLICY "Anyone can view seasons"
    ON seasons FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view seasonal challenges"
    ON seasonal_challenges FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view advent calendars"
    ON advent_calendars FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view advent calendar days"
    ON advent_calendar_days FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view seasonal rewards"
    ON seasonal_rewards FOR SELECT
    USING (true);


-- ============================================================================
-- 011_mini_games.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Mini Games System
-- ============================================================================
-- Migration: 011_mini_games.sql
-- Description: Système de mini-jeux (Quiz Musical, Memory, Prédictions)
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- Types de mini-jeux
CREATE TABLE IF NOT EXISTS mini_game_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#ffffff',
    rules TEXT,
    min_players INTEGER DEFAULT 1,
    max_players INTEGER DEFAULT 1,
    base_xp INTEGER DEFAULT 10,
    time_limit_seconds INTEGER, -- NULL = pas de limite
    cooldown_minutes INTEGER DEFAULT 0,
    is_daily BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions de jeu
CREATE TABLE IF NOT EXISTS mini_game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_type_id UUID REFERENCES mini_game_types(id),
    event_id UUID, -- Optionnel - si lié à un événement
    host_user_id UUID REFERENCES auth.users(id),
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'in_progress', 'completed', 'cancelled'
    game_data JSONB DEFAULT '{}', -- Données spécifiques au jeu
    settings JSONB DEFAULT '{}', -- Paramètres de la session
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    winner_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participants aux sessions
CREATE TABLE IF NOT EXISTS mini_game_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES mini_game_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    rank INTEGER,
    game_state JSONB DEFAULT '{}', -- État du joueur dans le jeu
    xp_earned INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    UNIQUE(session_id, user_id)
);

-- Quiz Musical - Questions
CREATE TABLE IF NOT EXISTS music_quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    song_title VARCHAR(200) NOT NULL,
    artist VARCHAR(200) NOT NULL,
    audio_preview_url TEXT, -- Extrait audio
    album_art_url TEXT,
    release_year INTEGER,
    genre VARCHAR(50),
    difficulty VARCHAR(20) DEFAULT 'medium', -- 'easy', 'medium', 'hard'
    question_type VARCHAR(50) DEFAULT 'guess_song', -- 'guess_song', 'guess_artist', 'guess_year', 'lyrics'
    options JSONB, -- Options de réponse pour QCM
    correct_answer TEXT NOT NULL,
    hint TEXT,
    points INTEGER DEFAULT 100,
    play_count INTEGER DEFAULT 0,
    success_rate NUMERIC(5,2) DEFAULT 50.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory Game - Paires
CREATE TABLE IF NOT EXISTS memory_game_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_set VARCHAR(50) NOT NULL, -- 'artists', 'albums', 'events', 'emojis'
    image_url TEXT NOT NULL,
    label VARCHAR(100),
    pair_id VARCHAR(50) NOT NULL, -- Pour matcher les paires
    difficulty VARCHAR(20) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prédictions - Questions
CREATE TABLE IF NOT EXISTS prediction_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID, -- Événement lié
    question TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'dj', 'attendance', 'music', 'vibe', 'special'
    options JSONB NOT NULL, -- Options de réponse
    correct_option_index INTEGER, -- NULL jusqu'à la résolution
    resolution_time TIMESTAMPTZ, -- Quand la réponse sera révélée
    points_for_correct INTEGER DEFAULT 100,
    bonus_points INTEGER DEFAULT 50, -- Pour les premiers à répondre
    max_bonus_slots INTEGER DEFAULT 10, -- Combien de personnes peuvent avoir le bonus
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'closed', 'resolved'
    total_predictions INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prédictions des utilisateurs
CREATE TABLE IF NOT EXISTS user_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prediction_question_id UUID REFERENCES prediction_questions(id) ON DELETE CASCADE,
    selected_option_index INTEGER NOT NULL,
    confidence INTEGER DEFAULT 50, -- 0-100, influence les points
    prediction_time TIMESTAMPTZ DEFAULT NOW(),
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    bonus_earned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, prediction_question_id)
);

-- Scores quotidiens
CREATE TABLE IF NOT EXISTS daily_game_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type_id UUID REFERENCES mini_game_types(id),
    score_date DATE DEFAULT CURRENT_DATE,
    best_score INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    total_xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_type_id, score_date)
);

-- Leaderboard hebdomadaire
CREATE TABLE IF NOT EXISTS weekly_game_leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type_id UUID REFERENCES mini_game_types(id),
    week_start DATE NOT NULL,
    total_score INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    win_count INTEGER DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_type_id, week_start)
);

-- ============================================================================
-- INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_mini_game_sessions_type ON mini_game_sessions(game_type_id);
CREATE INDEX IF NOT EXISTS idx_mini_game_sessions_status ON mini_game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mini_game_sessions_host ON mini_game_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_mini_game_participants_session ON mini_game_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_mini_game_participants_user ON mini_game_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_music_quiz_difficulty ON music_quiz_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_music_quiz_type ON music_quiz_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_music_quiz_genre ON music_quiz_questions(genre);

CREATE INDEX IF NOT EXISTS idx_memory_cards_set ON memory_game_cards(card_set);
CREATE INDEX IF NOT EXISTS idx_prediction_questions_event ON prediction_questions(event_id);
CREATE INDEX IF NOT EXISTS idx_prediction_questions_status ON prediction_questions(status);
CREATE INDEX IF NOT EXISTS idx_user_predictions_user ON user_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_predictions_question ON user_predictions(prediction_question_id);

CREATE INDEX IF NOT EXISTS idx_daily_scores_user ON daily_game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_scores_date ON daily_game_scores(score_date);
CREATE INDEX IF NOT EXISTS idx_weekly_leaderboard_week ON weekly_game_leaderboard(week_start);

-- ============================================================================
-- DONNÉES INITIALES
-- ============================================================================

-- Types de mini-jeux
INSERT INTO mini_game_types (slug, name, description, icon, color, rules, min_players, max_players, base_xp, time_limit_seconds, cooldown_minutes, is_daily) VALUES
('music_quiz', 'Quiz Musical', 'Devine les chansons et les artistes !', 'Music', '#EC4899',
 'Écoute l''extrait et devine le titre ou l''artiste. Plus tu réponds vite, plus tu gagnes de points !',
 1, 8, 50, 15, 0, false),

('memory', 'Memory', 'Trouve les paires le plus vite possible !', 'Grid', '#8B5CF6',
 'Retourne les cartes pour trouver les paires. Moins de coups = plus de points !',
 1, 4, 30, 120, 5, false),

('predictions', 'Prédictions', 'Prédis ce qui va se passer à la soirée !', 'TrendingUp', '#10B981',
 'Fais tes prédictions avant l''événement. Si tu as raison, tu gagnes des points !',
 1, 999, 100, NULL, 0, false),

('daily_quiz', 'Quiz du Jour', 'Le quiz quotidien sur la musique et la culture !', 'Calendar', '#F59E0B',
 '5 questions par jour. Bats ton record et grimpe dans le classement !',
 1, 1, 75, 30, 1440, true),

('blindtest', 'Blindtest', 'Qui sera le plus rapide à reconnaître les sons ?', 'Headphones', '#EF4444',
 'Écoute les extraits et sois le premier à buzzer avec la bonne réponse !',
 2, 10, 100, 10, 0, false),

('emoji_guess', 'Devine l''Emoji', 'Devine le titre avec les emojis !', 'Smile', '#FBBF24',
 'Des emojis représentent un titre de chanson ou un artiste. Trouve la réponse !',
 1, 8, 40, 30, 0, false)
ON CONFLICT (slug) DO NOTHING;

-- Questions de quiz musical (exemples)
INSERT INTO music_quiz_questions (song_title, artist, genre, difficulty, question_type, options, correct_answer, points) VALUES
('Blinding Lights', 'The Weeknd', 'pop', 'easy', 'guess_artist',
 '["The Weeknd", "Drake", "Post Malone", "Bruno Mars"]', 'The Weeknd', 100),

('Bad Guy', 'Billie Eilish', 'pop', 'easy', 'guess_song',
 '["Bad Guy", "Ocean Eyes", "Lovely", "Bury a Friend"]', 'Bad Guy', 100),

('Bohemian Rhapsody', 'Queen', 'rock', 'medium', 'guess_artist',
 '["Queen", "Led Zeppelin", "The Beatles", "Pink Floyd"]', 'Queen', 150),

('Shape of You', 'Ed Sheeran', 'pop', 'easy', 'guess_song',
 '["Shape of You", "Perfect", "Photograph", "Castle on the Hill"]', 'Shape of You', 100),

('Uptown Funk', 'Bruno Mars', 'funk', 'easy', 'guess_artist',
 '["Bruno Mars", "The Weeknd", "Pharrell", "Jason Derulo"]', 'Bruno Mars', 100),

('Thriller', 'Michael Jackson', 'pop', 'medium', 'guess_year',
 '["1980", "1982", "1984", "1986"]', '1982', 150),

('Lose Yourself', 'Eminem', 'hip-hop', 'medium', 'guess_song',
 '["Lose Yourself", "Stan", "Not Afraid", "Love the Way You Lie"]', 'Lose Yourself', 150),

('Rolling in the Deep', 'Adele', 'soul', 'easy', 'guess_artist',
 '["Adele", "Amy Winehouse", "Beyoncé", "Rihanna"]', 'Adele', 100),

('Smells Like Teen Spirit', 'Nirvana', 'rock', 'hard', 'guess_year',
 '["1989", "1991", "1993", "1995"]', '1991', 200),

('Get Lucky', 'Daft Punk', 'electronic', 'medium', 'guess_artist',
 '["Daft Punk", "Calvin Harris", "David Guetta", "Deadmau5"]', 'Daft Punk', 150)
ON CONFLICT DO NOTHING;

-- Cartes Memory (exemples)
INSERT INTO memory_game_cards (card_set, image_url, label, pair_id, difficulty) VALUES
-- Set Artistes
('artists', '/images/memory/drake.jpg', 'Drake', 'drake_1', 'easy'),
('artists', '/images/memory/drake.jpg', 'Drake', 'drake_1', 'easy'),
('artists', '/images/memory/rihanna.jpg', 'Rihanna', 'rihanna_1', 'easy'),
('artists', '/images/memory/rihanna.jpg', 'Rihanna', 'rihanna_1', 'easy'),
('artists', '/images/memory/weeknd.jpg', 'The Weeknd', 'weeknd_1', 'easy'),
('artists', '/images/memory/weeknd.jpg', 'The Weeknd', 'weeknd_1', 'easy'),
('artists', '/images/memory/billie.jpg', 'Billie Eilish', 'billie_1', 'easy'),
('artists', '/images/memory/billie.jpg', 'Billie Eilish', 'billie_1', 'easy'),

-- Set Emojis
('emojis', '🎤', 'Micro', 'micro_1', 'easy'),
('emojis', '🎤', 'Micro', 'micro_1', 'easy'),
('emojis', '🎸', 'Guitare', 'guitar_1', 'easy'),
('emojis', '🎸', 'Guitare', 'guitar_1', 'easy'),
('emojis', '🥁', 'Batterie', 'drums_1', 'easy'),
('emojis', '🥁', 'Batterie', 'drums_1', 'easy'),
('emojis', '🎹', 'Piano', 'piano_1', 'easy'),
('emojis', '🎹', 'Piano', 'piano_1', 'easy')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FONCTIONS
-- ============================================================================

-- Créer une session de jeu
CREATE OR REPLACE FUNCTION create_game_session(
    p_user_id UUID,
    p_game_type_slug VARCHAR,
    p_settings JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_game_type RECORD;
    v_session_id UUID;
    v_cooldown_check TIMESTAMPTZ;
BEGIN
    -- Récupérer le type de jeu
    SELECT * INTO v_game_type
    FROM mini_game_types
    WHERE slug = p_game_type_slug AND is_active = true;

    IF v_game_type IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Type de jeu non trouvé');
    END IF;

    -- Vérifier le cooldown
    IF v_game_type.cooldown_minutes > 0 THEN
        SELECT MAX(created_at) INTO v_cooldown_check
        FROM mini_game_sessions s
        JOIN mini_game_participants p ON p.session_id = s.id
        WHERE p.user_id = p_user_id
          AND s.game_type_id = v_game_type.id
          AND s.status IN ('completed', 'in_progress');

        IF v_cooldown_check IS NOT NULL AND
           v_cooldown_check > NOW() - (v_game_type.cooldown_minutes || ' minutes')::INTERVAL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Cooldown actif',
                'retry_after', EXTRACT(EPOCH FROM (v_cooldown_check + (v_game_type.cooldown_minutes || ' minutes')::INTERVAL - NOW()))
            );
        END IF;
    END IF;

    -- Créer la session
    INSERT INTO mini_game_sessions (game_type_id, host_user_id, settings, status)
    VALUES (v_game_type.id, p_user_id, p_settings, 'waiting')
    RETURNING id INTO v_session_id;

    -- Ajouter l'hôte comme participant
    INSERT INTO mini_game_participants (session_id, user_id)
    VALUES (v_session_id, p_user_id);

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'game_type', row_to_json(v_game_type)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rejoindre une session
CREATE OR REPLACE FUNCTION join_game_session(
    p_user_id UUID,
    p_session_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
    v_participant_count INTEGER;
    v_game_type RECORD;
BEGIN
    -- Récupérer la session
    SELECT s.*, gt.max_players, gt.name as game_name
    INTO v_session
    FROM mini_game_sessions s
    JOIN mini_game_types gt ON gt.id = s.game_type_id
    WHERE s.id = p_session_id;

    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session non trouvée');
    END IF;

    IF v_session.status != 'waiting' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session déjà commencée ou terminée');
    END IF;

    -- Compter les participants
    SELECT COUNT(*) INTO v_participant_count
    FROM mini_game_participants
    WHERE session_id = p_session_id;

    IF v_participant_count >= v_session.max_players THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session complète');
    END IF;

    -- Ajouter le participant
    INSERT INTO mini_game_participants (session_id, user_id)
    VALUES (p_session_id, p_user_id)
    ON CONFLICT (session_id, user_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'participant_count', v_participant_count + 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Démarrer une session
CREATE OR REPLACE FUNCTION start_game_session(
    p_user_id UUID,
    p_session_id UUID,
    p_game_data JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
BEGIN
    SELECT * INTO v_session
    FROM mini_game_sessions
    WHERE id = p_session_id AND host_user_id = p_user_id;

    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session non trouvée ou non autorisé');
    END IF;

    IF v_session.status != 'waiting' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session déjà démarrée');
    END IF;

    UPDATE mini_game_sessions
    SET status = 'in_progress',
        started_at = NOW(),
        game_data = p_game_data
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'session_id', p_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Soumettre un score
CREATE OR REPLACE FUNCTION submit_game_score(
    p_user_id UUID,
    p_session_id UUID,
    p_score INTEGER,
    p_game_state JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    v_session RECORD;
    v_game_type RECORD;
    v_xp_earned INTEGER;
    v_rank INTEGER;
BEGIN
    -- Récupérer la session et le type de jeu
    SELECT s.*, gt.base_xp, gt.slug as game_slug
    INTO v_session
    FROM mini_game_sessions s
    JOIN mini_game_types gt ON gt.id = s.game_type_id
    WHERE s.id = p_session_id;

    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session non trouvée');
    END IF;

    -- Calculer les XP (base + bonus score)
    v_xp_earned := v_session.base_xp + LEAST(p_score / 10, 50);

    -- Mettre à jour le participant
    UPDATE mini_game_participants
    SET score = p_score,
        game_state = p_game_state,
        xp_earned = v_xp_earned,
        finished_at = NOW()
    WHERE session_id = p_session_id AND user_id = p_user_id;

    -- Mettre à jour le score quotidien
    INSERT INTO daily_game_scores (user_id, game_type_id, score_date, best_score, games_played, total_xp_earned)
    VALUES (p_user_id, v_session.game_type_id, CURRENT_DATE, p_score, 1, v_xp_earned)
    ON CONFLICT (user_id, game_type_id, score_date)
    DO UPDATE SET
        best_score = GREATEST(daily_game_scores.best_score, p_score),
        games_played = daily_game_scores.games_played + 1,
        total_xp_earned = daily_game_scores.total_xp_earned + v_xp_earned,
        updated_at = NOW();

    -- Mettre à jour le leaderboard hebdomadaire
    INSERT INTO weekly_game_leaderboard (user_id, game_type_id, week_start, total_score, games_played, best_score)
    VALUES (p_user_id, v_session.game_type_id, date_trunc('week', CURRENT_DATE)::DATE, p_score, 1, p_score)
    ON CONFLICT (user_id, game_type_id, week_start)
    DO UPDATE SET
        total_score = weekly_game_leaderboard.total_score + p_score,
        games_played = weekly_game_leaderboard.games_played + 1,
        best_score = GREATEST(weekly_game_leaderboard.best_score, p_score),
        updated_at = NOW();

    -- Ajouter les XP au profil
    UPDATE user_profiles
    SET xp = xp + v_xp_earned,
        total_xp = total_xp + v_xp_earned
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'score', p_score,
        'xp_earned', v_xp_earned
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Terminer une session et déterminer le gagnant
CREATE OR REPLACE FUNCTION end_game_session(
    p_session_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_winner RECORD;
    v_participants JSONB;
BEGIN
    -- Trouver le gagnant
    SELECT user_id, score INTO v_winner
    FROM mini_game_participants
    WHERE session_id = p_session_id
    ORDER BY score DESC
    LIMIT 1;

    -- Mettre à jour les rangs
    WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) as rank
        FROM mini_game_participants
        WHERE session_id = p_session_id
    )
    UPDATE mini_game_participants p
    SET rank = r.rank
    FROM ranked r
    WHERE p.id = r.id;

    -- Mettre à jour la session
    UPDATE mini_game_sessions
    SET status = 'completed',
        ended_at = NOW(),
        winner_user_id = v_winner.user_id
    WHERE id = p_session_id;

    -- Récupérer les résultats
    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', p.user_id,
            'pseudo', up.pseudo,
            'avatar_url', up.avatar_url,
            'score', p.score,
            'rank', p.rank,
            'xp_earned', p.xp_earned
        ) ORDER BY p.rank
    )
    INTO v_participants
    FROM mini_game_participants p
    JOIN user_profiles up ON up.id = p.user_id
    WHERE p.session_id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'winner_id', v_winner.user_id,
        'winner_score', v_winner.score,
        'results', v_participants
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Faire une prédiction
CREATE OR REPLACE FUNCTION make_prediction(
    p_user_id UUID,
    p_question_id UUID,
    p_option_index INTEGER,
    p_confidence INTEGER DEFAULT 50
) RETURNS JSONB AS $$
DECLARE
    v_question RECORD;
    v_prediction_count INTEGER;
    v_is_bonus BOOLEAN := false;
BEGIN
    -- Récupérer la question
    SELECT * INTO v_question
    FROM prediction_questions
    WHERE id = p_question_id;

    IF v_question IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Question non trouvée');
    END IF;

    IF v_question.status != 'open' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Les prédictions sont fermées');
    END IF;

    -- Vérifier si éligible au bonus
    SELECT COUNT(*) INTO v_prediction_count
    FROM user_predictions
    WHERE prediction_question_id = p_question_id;

    IF v_prediction_count < v_question.max_bonus_slots THEN
        v_is_bonus := true;
    END IF;

    -- Enregistrer la prédiction
    INSERT INTO user_predictions (user_id, prediction_question_id, selected_option_index, confidence, bonus_earned)
    VALUES (p_user_id, p_question_id, p_option_index, p_confidence, v_is_bonus)
    ON CONFLICT (user_id, prediction_question_id)
    DO UPDATE SET
        selected_option_index = p_option_index,
        confidence = p_confidence,
        prediction_time = NOW();

    -- Incrémenter le compteur
    UPDATE prediction_questions
    SET total_predictions = total_predictions + 1
    WHERE id = p_question_id;

    RETURN jsonb_build_object(
        'success', true,
        'bonus_earned', v_is_bonus,
        'prediction_rank', v_prediction_count + 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Résoudre une prédiction
CREATE OR REPLACE FUNCTION resolve_prediction(
    p_question_id UUID,
    p_correct_option_index INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_question RECORD;
    v_updated_count INTEGER := 0;
BEGIN
    -- Récupérer la question
    SELECT * INTO v_question
    FROM prediction_questions
    WHERE id = p_question_id;

    IF v_question IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Question non trouvée');
    END IF;

    -- Marquer la bonne réponse
    UPDATE prediction_questions
    SET correct_option_index = p_correct_option_index,
        status = 'resolved',
        resolution_time = NOW()
    WHERE id = p_question_id;

    -- Mettre à jour les prédictions
    UPDATE user_predictions up
    SET is_correct = (selected_option_index = p_correct_option_index),
        points_earned = CASE
            WHEN selected_option_index = p_correct_option_index THEN
                ROUND(v_question.points_for_correct * (confidence::NUMERIC / 100)) +
                CASE WHEN bonus_earned THEN v_question.bonus_points ELSE 0 END
            ELSE 0
        END
    WHERE prediction_question_id = p_question_id;

    -- Ajouter les XP aux gagnants
    UPDATE user_profiles up
    SET xp = xp + pred.points_earned,
        total_xp = total_xp + pred.points_earned
    FROM user_predictions pred
    WHERE pred.user_id = up.id
      AND pred.prediction_question_id = p_question_id
      AND pred.is_correct = true;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'correct_option', p_correct_option_index,
        'winners_count', v_updated_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtenir les questions de quiz aléatoires
CREATE OR REPLACE FUNCTION get_random_quiz_questions(
    p_count INTEGER DEFAULT 5,
    p_difficulty VARCHAR DEFAULT NULL,
    p_genre VARCHAR DEFAULT NULL
) RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(q)
        FROM (
            SELECT id, song_title, artist, genre, difficulty, question_type, options, points, hint
            FROM music_quiz_questions
            WHERE is_active = true
              AND (p_difficulty IS NULL OR difficulty = p_difficulty)
              AND (p_genre IS NULL OR genre = p_genre)
            ORDER BY RANDOM()
            LIMIT p_count
        ) q
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Obtenir le leaderboard d'un jeu
CREATE OR REPLACE FUNCTION get_game_leaderboard(
    p_game_type_slug VARCHAR,
    p_period VARCHAR DEFAULT 'weekly', -- 'daily', 'weekly', 'all_time'
    p_limit INTEGER DEFAULT 20
) RETURNS JSONB AS $$
DECLARE
    v_game_type_id UUID;
BEGIN
    SELECT id INTO v_game_type_id FROM mini_game_types WHERE slug = p_game_type_slug;

    IF p_period = 'daily' THEN
        RETURN (
            SELECT jsonb_agg(r)
            FROM (
                SELECT
                    ROW_NUMBER() OVER (ORDER BY best_score DESC) as rank,
                    d.user_id,
                    up.pseudo,
                    up.avatar_url,
                    d.best_score as score,
                    d.games_played,
                    d.total_xp_earned
                FROM daily_game_scores d
                JOIN user_profiles up ON up.id = d.user_id
                WHERE d.game_type_id = v_game_type_id
                  AND d.score_date = CURRENT_DATE
                ORDER BY d.best_score DESC
                LIMIT p_limit
            ) r
        );
    ELSIF p_period = 'weekly' THEN
        RETURN (
            SELECT jsonb_agg(r)
            FROM (
                SELECT
                    ROW_NUMBER() OVER (ORDER BY total_score DESC) as rank,
                    w.user_id,
                    up.pseudo,
                    up.avatar_url,
                    w.total_score as score,
                    w.games_played,
                    w.best_score
                FROM weekly_game_leaderboard w
                JOIN user_profiles up ON up.id = w.user_id
                WHERE w.game_type_id = v_game_type_id
                  AND w.week_start = date_trunc('week', CURRENT_DATE)::DATE
                ORDER BY w.total_score DESC
                LIMIT p_limit
            ) r
        );
    ELSE
        RETURN (
            SELECT jsonb_agg(r)
            FROM (
                SELECT
                    ROW_NUMBER() OVER (ORDER BY SUM(total_score) DESC) as rank,
                    w.user_id,
                    up.pseudo,
                    up.avatar_url,
                    SUM(w.total_score) as score,
                    SUM(w.games_played) as games_played,
                    MAX(w.best_score) as best_score
                FROM weekly_game_leaderboard w
                JOIN user_profiles up ON up.id = w.user_id
                WHERE w.game_type_id = v_game_type_id
                GROUP BY w.user_id, up.pseudo, up.avatar_url
                ORDER BY SUM(w.total_score) DESC
                LIMIT p_limit
            ) r
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE mini_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_game_leaderboard ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view game sessions"
    ON mini_game_sessions FOR SELECT USING (true);

CREATE POLICY "Users can create sessions"
    ON mini_game_sessions FOR INSERT
    WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their sessions"
    ON mini_game_sessions FOR UPDATE
    USING (auth.uid() = host_user_id);

CREATE POLICY "Anyone can view participants"
    ON mini_game_participants FOR SELECT USING (true);

CREATE POLICY "Users can join sessions"
    ON mini_game_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
    ON mini_game_participants FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own predictions"
    ON user_predictions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can make predictions"
    ON user_predictions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own predictions"
    ON user_predictions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view daily scores"
    ON daily_game_scores FOR SELECT USING (true);

CREATE POLICY "Anyone can view weekly leaderboard"
    ON weekly_game_leaderboard FOR SELECT USING (true);

-- Public data
CREATE POLICY "Anyone can view game types"
    ON mini_game_types FOR SELECT USING (true);

CREATE POLICY "Anyone can view quiz questions"
    ON music_quiz_questions FOR SELECT USING (true);

CREATE POLICY "Anyone can view memory cards"
    ON memory_game_cards FOR SELECT USING (true);

CREATE POLICY "Anyone can view prediction questions"
    ON prediction_questions FOR SELECT USING (true);


-- ============================================================================
-- 012_user_stats_dashboard.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - User Stats Dashboard
-- ============================================================================
-- Migration: 012_user_stats_dashboard.sql
-- Description: Tables et fonctions pour le dashboard de statistiques personnelles
-- ============================================================================

-- ============================================================================
-- USER ACTIVITY TRACKING
-- ============================================================================

-- Table pour suivre l'activité quotidienne des utilisateurs
CREATE TABLE IF NOT EXISTS user_daily_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Temps passé (en minutes)
    time_spent_minutes INTEGER DEFAULT 0,

    -- Actions
    events_attended INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    friends_made INTEGER DEFAULT 0,
    photos_uploaded INTEGER DEFAULT 0,
    reviews_written INTEGER DEFAULT 0,
    predictions_made INTEGER DEFAULT 0,

    -- Points/XP gagnés ce jour
    xp_earned INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,

    -- Badges débloqués ce jour
    badges_unlocked INTEGER DEFAULT 0,

    -- Streaks
    login_streak INTEGER DEFAULT 1,
    event_streak INTEGER DEFAULT 0,
    challenge_streak INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, activity_date)
);

-- Index pour les requêtes par utilisateur et date
CREATE INDEX IF NOT EXISTS idx_user_daily_activity_user_date
ON user_daily_activity(user_id, activity_date DESC);

-- ============================================================================
-- USER LIFETIME STATS
-- ============================================================================

-- Statistiques agrégées à vie
CREATE TABLE IF NOT EXISTS user_lifetime_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Totaux généraux
    total_xp BIGINT DEFAULT 0,
    total_coins_earned BIGINT DEFAULT 0,
    total_coins_spent BIGINT DEFAULT 0,

    -- Événements
    total_events_attended INTEGER DEFAULT 0,
    total_event_hours DECIMAL(10,2) DEFAULT 0,
    favorite_event_type VARCHAR(100),
    favorite_day_of_week INTEGER, -- 0=Dimanche, 6=Samedi
    average_stay_duration_minutes INTEGER DEFAULT 0,
    earliest_arrival_time TIME,
    latest_departure_time TIME,

    -- Défis
    total_challenges_completed INTEGER DEFAULT 0,
    total_challenges_failed INTEGER DEFAULT 0,
    challenge_completion_rate DECIMAL(5,2) DEFAULT 0,
    favorite_challenge_type VARCHAR(100),
    longest_challenge_streak INTEGER DEFAULT 0,
    current_challenge_streak INTEGER DEFAULT 0,

    -- Mini-jeux
    total_games_played INTEGER DEFAULT 0,
    total_game_wins INTEGER DEFAULT 0,
    game_win_rate DECIMAL(5,2) DEFAULT 0,
    favorite_game VARCHAR(100),
    highest_quiz_score INTEGER DEFAULT 0,
    best_memory_time_seconds INTEGER,
    predictions_correct INTEGER DEFAULT 0,
    predictions_total INTEGER DEFAULT 0,
    prediction_accuracy DECIMAL(5,2) DEFAULT 0,

    -- Social
    total_friends INTEGER DEFAULT 0,
    total_friend_requests_sent INTEGER DEFAULT 0,
    total_friend_requests_received INTEGER DEFAULT 0,
    total_crews_joined INTEGER DEFAULT 0,
    total_duels_played INTEGER DEFAULT 0,
    total_duels_won INTEGER DEFAULT 0,

    -- Contenu
    total_photos_uploaded INTEGER DEFAULT 0,
    total_photos_liked INTEGER DEFAULT 0,
    total_reviews_written INTEGER DEFAULT 0,
    average_review_rating DECIMAL(3,2),
    total_comments_posted INTEGER DEFAULT 0,

    -- Badges
    total_badges_earned INTEGER DEFAULT 0,
    rarest_badge_id UUID,

    -- Boutique
    total_purchases INTEGER DEFAULT 0,
    total_items_owned INTEGER DEFAULT 0,

    -- Streaks records
    longest_login_streak INTEGER DEFAULT 0,
    longest_event_streak INTEGER DEFAULT 0,
    current_login_streak INTEGER DEFAULT 0,
    current_event_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    last_event_date DATE,

    -- Timestamps
    first_activity_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER MONTHLY STATS
-- ============================================================================

-- Statistiques mensuelles pour comparaisons
CREATE TABLE IF NOT EXISTS user_monthly_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_year DATE NOT NULL, -- Premier jour du mois

    -- Totaux du mois
    xp_earned INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    events_attended INTEGER DEFAULT 0,
    challenges_completed INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    badges_earned INTEGER DEFAULT 0,

    -- Classements du mois
    monthly_rank INTEGER,
    percentile DECIMAL(5,2),

    -- Progression vs mois précédent
    xp_change_percent DECIMAL(5,2),
    activity_change_percent DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_user_monthly_stats_user
ON user_monthly_stats(user_id, month_year DESC);

-- ============================================================================
-- ACHIEVEMENT MILESTONES
-- ============================================================================

-- Jalons personnels atteints
CREATE TABLE IF NOT EXISTS user_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    milestone_type VARCHAR(50) NOT NULL,
    -- Types: first_event, 10_events, 50_events, 100_events,
    --        first_badge, 10_badges, all_badges,
    --        first_friend, 10_friends, 50_friends,
    --        first_win, 10_wins, 100_wins,
    --        level_10, level_25, level_50, level_100,
    --        1000_xp, 10000_xp, 100000_xp,
    --        1_month_member, 6_month_member, 1_year_member

    milestone_value INTEGER,
    achieved_at TIMESTAMPTZ DEFAULT NOW(),

    -- Récompense associée
    xp_reward INTEGER DEFAULT 0,
    coins_reward INTEGER DEFAULT 0,
    badge_id UUID,

    UNIQUE(user_id, milestone_type)
);

CREATE INDEX IF NOT EXISTS idx_user_milestones_user
ON user_milestones(user_id, achieved_at DESC);

-- ============================================================================
-- USER COMPARISONS (pour "vs average" stats)
-- ============================================================================

-- Moyennes globales de la plateforme (mise à jour périodique)
CREATE TABLE IF NOT EXISTS platform_averages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    period VARCHAR(20) DEFAULT 'all_time', -- all_time, monthly, weekly

    -- Moyennes
    avg_xp_per_user DECIMAL(10,2),
    avg_events_per_user DECIMAL(10,2),
    avg_challenges_per_user DECIMAL(10,2),
    avg_games_per_user DECIMAL(10,2),
    avg_badges_per_user DECIMAL(10,2),
    avg_friends_per_user DECIMAL(10,2),
    avg_login_streak DECIMAL(10,2),
    avg_event_streak DECIMAL(10,2),

    -- Distributions (pour percentiles)
    total_users INTEGER,
    active_users_7d INTEGER,
    active_users_30d INTEGER
);

-- ============================================================================
-- PERSONAL RECORDS
-- ============================================================================

-- Records personnels de l'utilisateur
CREATE TABLE IF NOT EXISTS user_personal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    record_type VARCHAR(50) NOT NULL,
    -- Types: highest_daily_xp, most_events_in_week, most_events_in_month,
    --        longest_event_stay, most_challenges_in_day, highest_game_score,
    --        fastest_memory_game, best_quiz_streak, most_predictions_correct

    record_value DECIMAL(15,2) NOT NULL,
    previous_record DECIMAL(15,2),
    achieved_at TIMESTAMPTZ DEFAULT NOW(),

    -- Contexte du record
    context_data JSONB,

    UNIQUE(user_id, record_type)
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour mettre à jour l'activité quotidienne
CREATE OR REPLACE FUNCTION update_daily_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_amount INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_daily_activity (user_id, activity_date)
    VALUES (p_user_id, CURRENT_DATE)
    ON CONFLICT (user_id, activity_date) DO NOTHING;

    -- Mise à jour selon le type d'activité
    CASE p_activity_type
        WHEN 'event' THEN
            UPDATE user_daily_activity
            SET events_attended = events_attended + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'challenge' THEN
            UPDATE user_daily_activity
            SET challenges_completed = challenges_completed + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'game' THEN
            UPDATE user_daily_activity
            SET games_played = games_played + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'xp' THEN
            UPDATE user_daily_activity
            SET xp_earned = xp_earned + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'coins' THEN
            UPDATE user_daily_activity
            SET coins_earned = coins_earned + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'badge' THEN
            UPDATE user_daily_activity
            SET badges_unlocked = badges_unlocked + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'friend' THEN
            UPDATE user_daily_activity
            SET friends_made = friends_made + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'photo' THEN
            UPDATE user_daily_activity
            SET photos_uploaded = photos_uploaded + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'review' THEN
            UPDATE user_daily_activity
            SET reviews_written = reviews_written + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'prediction' THEN
            UPDATE user_daily_activity
            SET predictions_made = predictions_made + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        WHEN 'time' THEN
            UPDATE user_daily_activity
            SET time_spent_minutes = time_spent_minutes + p_amount,
                updated_at = NOW()
            WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
        ELSE
            NULL;
    END CASE;
END;
$$;

-- Fonction pour obtenir les stats complètes d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lifetime_stats JSON;
    v_recent_activity JSON;
    v_monthly_comparison JSON;
    v_records JSON;
    v_milestones JSON;
    v_rank_info JSON;
BEGIN
    -- Stats à vie
    SELECT row_to_json(uls) INTO v_lifetime_stats
    FROM user_lifetime_stats uls
    WHERE uls.user_id = p_user_id;

    -- Activité des 7 derniers jours
    SELECT json_agg(
        json_build_object(
            'date', activity_date,
            'xp', xp_earned,
            'events', events_attended,
            'challenges', challenges_completed,
            'games', games_played
        ) ORDER BY activity_date DESC
    ) INTO v_recent_activity
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND activity_date >= CURRENT_DATE - INTERVAL '7 days';

    -- Comparaison mensuelle
    SELECT json_agg(
        json_build_object(
            'month', month_year,
            'xp', xp_earned,
            'events', events_attended,
            'rank', monthly_rank,
            'percentile', percentile
        ) ORDER BY month_year DESC
    ) INTO v_monthly_comparison
    FROM user_monthly_stats
    WHERE user_id = p_user_id
    LIMIT 6;

    -- Records personnels
    SELECT json_agg(
        json_build_object(
            'type', record_type,
            'value', record_value,
            'achieved_at', achieved_at
        )
    ) INTO v_records
    FROM user_personal_records
    WHERE user_id = p_user_id;

    -- Jalons atteints
    SELECT json_agg(
        json_build_object(
            'type', milestone_type,
            'value', milestone_value,
            'achieved_at', achieved_at
        ) ORDER BY achieved_at DESC
    ) INTO v_milestones
    FROM user_milestones
    WHERE user_id = p_user_id
    LIMIT 10;

    -- Infos de classement
    SELECT json_build_object(
        'global_rank', (
            SELECT COUNT(*) + 1 FROM user_lifetime_stats
            WHERE total_xp > COALESCE((SELECT total_xp FROM user_lifetime_stats WHERE user_id = p_user_id), 0)
        ),
        'total_users', (SELECT COUNT(*) FROM user_lifetime_stats),
        'percentile', (
            SELECT ROUND(
                (1 - (COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM user_lifetime_stats), 0))) * 100,
                1
            )
            FROM user_lifetime_stats
            WHERE total_xp > COALESCE((SELECT total_xp FROM user_lifetime_stats WHERE user_id = p_user_id), 0)
        )
    ) INTO v_rank_info;

    RETURN json_build_object(
        'lifetime', v_lifetime_stats,
        'recent_activity', COALESCE(v_recent_activity, '[]'::json),
        'monthly', COALESCE(v_monthly_comparison, '[]'::json),
        'records', COALESCE(v_records, '[]'::json),
        'milestones', COALESCE(v_milestones, '[]'::json),
        'rank', v_rank_info
    );
END;
$$;

-- Fonction pour mettre à jour les stats lifetime
CREATE OR REPLACE FUNCTION update_lifetime_stats(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_lifetime_stats (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Mise à jour des totaux depuis l'activité quotidienne
    UPDATE user_lifetime_stats SET
        total_xp = COALESCE((
            SELECT SUM(xp_earned) FROM user_daily_activity WHERE user_id = p_user_id
        ), 0),
        total_events_attended = COALESCE((
            SELECT SUM(events_attended) FROM user_daily_activity WHERE user_id = p_user_id
        ), 0),
        total_challenges_completed = COALESCE((
            SELECT SUM(challenges_completed) FROM user_daily_activity WHERE user_id = p_user_id
        ), 0),
        total_games_played = COALESCE((
            SELECT SUM(games_played) FROM user_daily_activity WHERE user_id = p_user_id
        ), 0),
        total_badges_earned = COALESCE((
            SELECT SUM(badges_unlocked) FROM user_daily_activity WHERE user_id = p_user_id
        ), 0),
        last_activity_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$;

-- Fonction pour vérifier et attribuer les jalons
CREATE OR REPLACE FUNCTION check_user_milestones(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats RECORD;
    v_new_milestones JSON;
    v_milestone_type VARCHAR(50);
    v_milestone_value INTEGER;
BEGIN
    -- Récupérer les stats actuelles
    SELECT * INTO v_stats FROM user_lifetime_stats WHERE user_id = p_user_id;

    IF v_stats IS NULL THEN
        RETURN '[]'::json;
    END IF;

    -- Vérifier les jalons d'événements
    IF v_stats.total_events_attended >= 1 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, 'first_event', 1, 50)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    IF v_stats.total_events_attended >= 10 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '10_events', 10, 200)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    IF v_stats.total_events_attended >= 50 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '50_events', 50, 500)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    IF v_stats.total_events_attended >= 100 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '100_events', 100, 1000)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    -- Vérifier les jalons d'XP
    IF v_stats.total_xp >= 1000 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '1000_xp', 1000, 100)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    IF v_stats.total_xp >= 10000 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '10000_xp', 10000, 500)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    IF v_stats.total_xp >= 100000 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '100000_xp', 100000, 2000)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    -- Vérifier les jalons de badges
    IF v_stats.total_badges_earned >= 1 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, 'first_badge', 1, 50)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    IF v_stats.total_badges_earned >= 10 THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, xp_reward)
        VALUES (p_user_id, '10_badges', 10, 300)
        ON CONFLICT (user_id, milestone_type) DO NOTHING;
    END IF;

    -- Retourner les nouveaux jalons atteints
    SELECT json_agg(json_build_object(
        'type', milestone_type,
        'value', milestone_value,
        'xp_reward', xp_reward,
        'achieved_at', achieved_at
    )) INTO v_new_milestones
    FROM user_milestones
    WHERE user_id = p_user_id
    AND achieved_at >= NOW() - INTERVAL '1 minute';

    RETURN COALESCE(v_new_milestones, '[]'::json);
END;
$$;

-- Fonction pour obtenir les stats d'activité sur une période
CREATE OR REPLACE FUNCTION get_activity_stats(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_xp', COALESCE(SUM(xp_earned), 0),
        'total_events', COALESCE(SUM(events_attended), 0),
        'total_challenges', COALESCE(SUM(challenges_completed), 0),
        'total_games', COALESCE(SUM(games_played), 0),
        'total_time_minutes', COALESCE(SUM(time_spent_minutes), 0),
        'active_days', COUNT(*),
        'avg_xp_per_day', ROUND(COALESCE(AVG(xp_earned), 0)::numeric, 1),
        'best_day', (
            SELECT json_build_object(
                'date', activity_date,
                'xp', xp_earned
            )
            FROM user_daily_activity
            WHERE user_id = p_user_id
            AND activity_date >= CURRENT_DATE - (p_days || ' days')::interval
            ORDER BY xp_earned DESC
            LIMIT 1
        ),
        'daily_breakdown', (
            SELECT json_agg(
                json_build_object(
                    'date', activity_date,
                    'xp', xp_earned,
                    'events', events_attended,
                    'challenges', challenges_completed,
                    'games', games_played
                ) ORDER BY activity_date
            )
            FROM user_daily_activity
            WHERE user_id = p_user_id
            AND activity_date >= CURRENT_DATE - (p_days || ' days')::interval
        )
    ) INTO v_result
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND activity_date >= CURRENT_DATE - (p_days || ' days')::interval;

    RETURN v_result;
END;
$$;

-- Fonction pour mettre à jour un record personnel
CREATE OR REPLACE FUNCTION update_personal_record(
    p_user_id UUID,
    p_record_type VARCHAR(50),
    p_new_value DECIMAL(15,2),
    p_context JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_record DECIMAL(15,2);
    v_is_new_record BOOLEAN := FALSE;
BEGIN
    -- Récupérer le record actuel
    SELECT record_value INTO v_current_record
    FROM user_personal_records
    WHERE user_id = p_user_id AND record_type = p_record_type;

    -- Vérifier si c'est un nouveau record
    IF v_current_record IS NULL OR p_new_value > v_current_record THEN
        INSERT INTO user_personal_records (user_id, record_type, record_value, previous_record, context_data)
        VALUES (p_user_id, p_record_type, p_new_value, v_current_record, p_context)
        ON CONFLICT (user_id, record_type) DO UPDATE SET
            previous_record = user_personal_records.record_value,
            record_value = p_new_value,
            achieved_at = NOW(),
            context_data = p_context;

        v_is_new_record := TRUE;
    END IF;

    RETURN v_is_new_record;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_daily_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_lifetime_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_monthly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_averages ENABLE ROW LEVEL SECURITY;

-- Policies pour user_daily_activity
CREATE POLICY "Users can view their own daily activity"
ON user_daily_activity FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert daily activity"
ON user_daily_activity FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update daily activity"
ON user_daily_activity FOR UPDATE
USING (auth.uid() = user_id);

-- Policies pour user_lifetime_stats
CREATE POLICY "Users can view their own lifetime stats"
ON user_lifetime_stats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage lifetime stats"
ON user_lifetime_stats FOR ALL
USING (auth.uid() = user_id);

-- Policies pour user_monthly_stats
CREATE POLICY "Users can view their own monthly stats"
ON user_monthly_stats FOR SELECT
USING (auth.uid() = user_id);

-- Policies pour user_milestones
CREATE POLICY "Users can view their own milestones"
ON user_milestones FOR SELECT
USING (auth.uid() = user_id);

-- Policies pour user_personal_records
CREATE POLICY "Users can view their own records"
ON user_personal_records FOR SELECT
USING (auth.uid() = user_id);

-- Platform averages are readable by all authenticated users
CREATE POLICY "Anyone can view platform averages"
ON platform_averages FOR SELECT
USING (auth.role() = 'authenticated');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger pour mettre à jour les stats lifetime après modification daily
CREATE OR REPLACE FUNCTION trigger_update_lifetime_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM update_lifetime_stats(NEW.user_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER after_daily_activity_change
AFTER INSERT OR UPDATE ON user_daily_activity
FOR EACH ROW
EXECUTE FUNCTION trigger_update_lifetime_stats();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insérer les moyennes initiales de la plateforme
INSERT INTO platform_averages (period, avg_xp_per_user, avg_events_per_user, avg_challenges_per_user, avg_games_per_user, avg_badges_per_user, avg_friends_per_user, avg_login_streak, avg_event_streak, total_users, active_users_7d, active_users_30d)
VALUES
('all_time', 5000, 10, 25, 15, 8, 12, 7, 3, 1000, 300, 600),
('monthly', 800, 2, 5, 3, 1, 2, 5, 2, 1000, 300, 600),
('weekly', 200, 0.5, 1.5, 1, 0.3, 0.5, 3, 1, 1000, 300, 600);

COMMIT;


-- ============================================================================
-- 013_annual_wrapped.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Annual Wrapped
-- ============================================================================
-- Migration: 013_annual_wrapped.sql
-- Description: Tables et fonctions pour le récapitulatif annuel style Spotify Wrapped
-- ============================================================================

-- ============================================================================
-- USER ANNUAL WRAPPED
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_annual_wrapped (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,

    -- Status de génération
    status VARCHAR(20) DEFAULT 'pending', -- pending, generating, ready, viewed
    generated_at TIMESTAMPTZ,
    first_viewed_at TIMESTAMPTZ,

    -- Données du wrapped (stockées en JSON pour flexibilité)
    wrapped_data JSONB NOT NULL DEFAULT '{}',

    -- Partage
    share_token VARCHAR(100) UNIQUE,
    share_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_user_annual_wrapped_user_year
ON user_annual_wrapped(user_id, year DESC);

CREATE INDEX IF NOT EXISTS idx_user_annual_wrapped_share_token
ON user_annual_wrapped(share_token) WHERE share_token IS NOT NULL;

-- ============================================================================
-- WRAPPED HIGHLIGHTS (moments forts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wrapped_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wrapped_id UUID NOT NULL REFERENCES user_annual_wrapped(id) ON DELETE CASCADE,

    highlight_type VARCHAR(50) NOT NULL,
    -- Types: top_event, most_xp_day, longest_streak, biggest_achievement,
    --        best_game_performance, favorite_friend, top_crew, memorable_moment

    title VARCHAR(200) NOT NULL,
    description TEXT,
    value DECIMAL(15,2),
    unit VARCHAR(50),
    rank INTEGER, -- pour ordonner les slides

    -- Données additionnelles
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wrapped_highlights_wrapped
ON wrapped_highlights(wrapped_id, rank);

-- ============================================================================
-- WRAPPED COMPARISONS (comparaisons fun)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wrapped_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wrapped_id UUID NOT NULL REFERENCES user_annual_wrapped(id) ON DELETE CASCADE,

    comparison_type VARCHAR(50) NOT NULL,
    -- Types: vs_average, vs_last_year, fun_fact, percentile

    title VARCHAR(200) NOT NULL,
    user_value DECIMAL(15,2),
    comparison_value DECIMAL(15,2),
    percentage_diff DECIMAL(10,2),
    fun_text TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- WRAPPED ACHIEVEMENTS (badges spéciaux du wrapped)
-- ============================================================================

CREATE TABLE IF NOT EXISTS wrapped_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wrapped_id UUID NOT NULL REFERENCES user_annual_wrapped(id) ON DELETE CASCADE,

    achievement_slug VARCHAR(50) NOT NULL,
    -- Slugs: party_animal, early_bird, night_owl, social_butterfly, game_master,
    --        challenge_champion, loyal_member, rising_star, top_predictor, memory_king

    title VARCHAR(100) NOT NULL,
    description TEXT,
    emoji VARCHAR(10),
    rarity VARCHAR(20) DEFAULT 'common', -- common, rare, epic, legendary

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour générer le wrapped d'un utilisateur
CREATE OR REPLACE FUNCTION generate_user_wrapped(
    p_user_id UUID,
    p_year INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wrapped_id UUID;
    v_wrapped_data JSONB;
    v_total_xp BIGINT;
    v_total_events INTEGER;
    v_total_challenges INTEGER;
    v_total_games INTEGER;
    v_total_friends INTEGER;
    v_top_month TEXT;
    v_top_day TEXT;
    v_longest_streak INTEGER;
    v_favorite_game TEXT;
    v_total_time_hours DECIMAL;
BEGIN
    -- Vérifier si le wrapped existe déjà
    SELECT id INTO v_wrapped_id
    FROM user_annual_wrapped
    WHERE user_id = p_user_id AND year = p_year;

    IF v_wrapped_id IS NOT NULL THEN
        -- Mettre à jour le statut
        UPDATE user_annual_wrapped
        SET status = 'generating', updated_at = NOW()
        WHERE id = v_wrapped_id;
    ELSE
        -- Créer le wrapped
        INSERT INTO user_annual_wrapped (user_id, year, status)
        VALUES (p_user_id, p_year, 'generating')
        RETURNING id INTO v_wrapped_id;
    END IF;

    -- Calculer les statistiques de l'année
    -- Total XP
    SELECT COALESCE(SUM(xp_earned), 0) INTO v_total_xp
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

    -- Total événements
    SELECT COALESCE(SUM(events_attended), 0) INTO v_total_events
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

    -- Total défis
    SELECT COALESCE(SUM(challenges_completed), 0) INTO v_total_challenges
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

    -- Total jeux
    SELECT COALESCE(SUM(games_played), 0) INTO v_total_games
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

    -- Total temps (en heures)
    SELECT COALESCE(SUM(time_spent_minutes) / 60.0, 0) INTO v_total_time_hours
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

    -- Meilleur mois
    SELECT TO_CHAR(activity_date, 'Month') INTO v_top_month
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year
    GROUP BY EXTRACT(MONTH FROM activity_date), TO_CHAR(activity_date, 'Month')
    ORDER BY SUM(xp_earned) DESC
    LIMIT 1;

    -- Meilleur jour de la semaine
    SELECT TO_CHAR(activity_date, 'Day') INTO v_top_day
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year
    GROUP BY EXTRACT(DOW FROM activity_date), TO_CHAR(activity_date, 'Day')
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    -- Plus longue série
    SELECT COALESCE(MAX(login_streak), 0) INTO v_longest_streak
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

    -- Jeu favori
    SELECT favorite_game INTO v_favorite_game
    FROM user_lifetime_stats
    WHERE user_id = p_user_id;

    -- Construire les données du wrapped
    v_wrapped_data := jsonb_build_object(
        'summary', jsonb_build_object(
            'total_xp', v_total_xp,
            'total_events', v_total_events,
            'total_challenges', v_total_challenges,
            'total_games', v_total_games,
            'total_time_hours', ROUND(v_total_time_hours::numeric, 1),
            'longest_streak', v_longest_streak
        ),
        'favorites', jsonb_build_object(
            'top_month', TRIM(v_top_month),
            'top_day', TRIM(v_top_day),
            'favorite_game', v_favorite_game
        ),
        'percentiles', jsonb_build_object(
            'xp_percentile', (
                SELECT ROUND((1 - COUNT(*)::DECIMAL / NULLIF((
                    SELECT COUNT(*) FROM user_lifetime_stats
                ), 0)) * 100)
                FROM user_lifetime_stats
                WHERE total_xp > v_total_xp
            ),
            'events_percentile', (
                SELECT ROUND((1 - COUNT(*)::DECIMAL / NULLIF((
                    SELECT COUNT(*) FROM user_lifetime_stats
                ), 0)) * 100)
                FROM user_lifetime_stats
                WHERE total_events_attended > v_total_events
            )
        )
    );

    -- Mettre à jour le wrapped avec les données
    UPDATE user_annual_wrapped
    SET wrapped_data = v_wrapped_data,
        status = 'ready',
        generated_at = NOW(),
        share_token = encode(gen_random_bytes(16), 'hex'),
        updated_at = NOW()
    WHERE id = v_wrapped_id;

    -- Générer les highlights
    PERFORM generate_wrapped_highlights(v_wrapped_id, p_user_id, p_year);

    -- Générer les achievements spéciaux
    PERFORM generate_wrapped_achievements(v_wrapped_id, p_user_id, p_year, v_wrapped_data);

    RETURN v_wrapped_id;
END;
$$;

-- Fonction pour générer les highlights
CREATE OR REPLACE FUNCTION generate_wrapped_highlights(
    p_wrapped_id UUID,
    p_user_id UUID,
    p_year INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rank INTEGER := 1;
    v_best_day RECORD;
    v_best_event RECORD;
BEGIN
    -- Supprimer les anciens highlights
    DELETE FROM wrapped_highlights WHERE wrapped_id = p_wrapped_id;

    -- Highlight 1: Jour avec le plus d'XP
    SELECT activity_date, xp_earned INTO v_best_day
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year
    ORDER BY xp_earned DESC
    LIMIT 1;

    IF v_best_day IS NOT NULL THEN
        INSERT INTO wrapped_highlights (wrapped_id, highlight_type, title, description, value, unit, rank, metadata)
        VALUES (
            p_wrapped_id,
            'most_xp_day',
            'Ta journée la plus folle',
            'Le ' || TO_CHAR(v_best_day.activity_date, 'DD Month') || ', tu as explosé tous les compteurs !',
            v_best_day.xp_earned,
            'XP',
            v_rank,
            jsonb_build_object('date', v_best_day.activity_date)
        );
        v_rank := v_rank + 1;
    END IF;

    -- Highlight 2: Total XP avec comparaison fun
    INSERT INTO wrapped_highlights (wrapped_id, highlight_type, title, description, value, unit, rank, metadata)
    SELECT
        p_wrapped_id,
        'total_xp',
        'XP accumulés cette année',
        CASE
            WHEN SUM(xp_earned) > 50000 THEN 'Tu es une vraie machine à XP !'
            WHEN SUM(xp_earned) > 20000 THEN 'Impressionnant, continue comme ça !'
            WHEN SUM(xp_earned) > 5000 THEN 'Beau parcours cette année !'
            ELSE 'L''année prochaine sera encore meilleure !'
        END,
        SUM(xp_earned),
        'XP',
        v_rank,
        '{}'::jsonb
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;
    v_rank := v_rank + 1;

    -- Highlight 3: Nombre d'événements
    INSERT INTO wrapped_highlights (wrapped_id, highlight_type, title, description, value, unit, rank, metadata)
    SELECT
        p_wrapped_id,
        'total_events',
        'Événements cette année',
        CASE
            WHEN SUM(events_attended) > 50 THEN 'Tu es partout ! Un vrai party animal 🎉'
            WHEN SUM(events_attended) > 20 THEN 'Tu ne manques jamais une occasion de faire la fête !'
            WHEN SUM(events_attended) > 10 THEN 'De belles soirées en perspective !'
            ELSE 'Chaque événement compte !'
        END,
        SUM(events_attended),
        'événements',
        v_rank,
        '{}'::jsonb
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;
    v_rank := v_rank + 1;

    -- Highlight 4: Série la plus longue
    INSERT INTO wrapped_highlights (wrapped_id, highlight_type, title, description, value, unit, rank, metadata)
    SELECT
        p_wrapped_id,
        'longest_streak',
        'Ta plus longue série',
        CASE
            WHEN MAX(login_streak) > 30 THEN 'Un mois entier sans manquer un jour ! Légendaire !'
            WHEN MAX(login_streak) > 14 THEN 'Deux semaines de suite, quelle motivation !'
            WHEN MAX(login_streak) > 7 THEN 'Une semaine complète, bravo !'
            ELSE 'Chaque jour compte !'
        END,
        MAX(login_streak),
        'jours',
        v_rank,
        '{}'::jsonb
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;
    v_rank := v_rank + 1;

    -- Highlight 5: Défis complétés
    INSERT INTO wrapped_highlights (wrapped_id, highlight_type, title, description, value, unit, rank, metadata)
    SELECT
        p_wrapped_id,
        'challenges_completed',
        'Défis relevés',
        'Tu n''as pas eu peur des challenges cette année !',
        SUM(challenges_completed),
        'défis',
        v_rank,
        '{}'::jsonb
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;
    v_rank := v_rank + 1;

    -- Highlight 6: Parties jouées
    INSERT INTO wrapped_highlights (wrapped_id, highlight_type, title, description, value, unit, rank, metadata)
    SELECT
        p_wrapped_id,
        'games_played',
        'Parties jouées',
        'Les mini-jeux n''ont plus de secrets pour toi !',
        SUM(games_played),
        'parties',
        v_rank,
        '{}'::jsonb
    FROM user_daily_activity
    WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM activity_date) = p_year;

END;
$$;

-- Fonction pour générer les achievements du wrapped
CREATE OR REPLACE FUNCTION generate_wrapped_achievements(
    p_wrapped_id UUID,
    p_user_id UUID,
    p_year INTEGER,
    p_data JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_events INTEGER;
    v_total_games INTEGER;
    v_total_challenges INTEGER;
    v_longest_streak INTEGER;
BEGIN
    -- Supprimer les anciens achievements
    DELETE FROM wrapped_achievements WHERE wrapped_id = p_wrapped_id;

    v_total_events := (p_data->'summary'->>'total_events')::INTEGER;
    v_total_games := (p_data->'summary'->>'total_games')::INTEGER;
    v_total_challenges := (p_data->'summary'->>'total_challenges')::INTEGER;
    v_longest_streak := (p_data->'summary'->>'longest_streak')::INTEGER;

    -- Party Animal (beaucoup d'événements)
    IF v_total_events >= 50 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'party_animal', 'Party Animal', 'Tu as participé à plus de 50 événements !', '🎉', 'legendary');
    ELSIF v_total_events >= 25 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'party_lover', 'Party Lover', 'Plus de 25 événements cette année !', '🥳', 'epic');
    ELSIF v_total_events >= 10 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'party_goer', 'Party Goer', 'Tu as participé à 10+ événements', '🎊', 'rare');
    END IF;

    -- Game Master (beaucoup de jeux)
    IF v_total_games >= 100 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'game_master', 'Game Master', 'Plus de 100 parties jouées !', '🎮', 'legendary');
    ELSIF v_total_games >= 50 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'gamer', 'Gamer', '50+ parties jouées cette année', '🕹️', 'epic');
    END IF;

    -- Challenge Champion
    IF v_total_challenges >= 100 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'challenge_champion', 'Challenge Champion', 'Plus de 100 défis relevés !', '🏆', 'legendary');
    ELSIF v_total_challenges >= 50 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'challenger', 'Challenger', '50+ défis complétés', '🎯', 'epic');
    END IF;

    -- Streak Master
    IF v_longest_streak >= 30 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'streak_master', 'Streak Master', 'Série de 30 jours ou plus !', '🔥', 'legendary');
    ELSIF v_longest_streak >= 14 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'streak_keeper', 'Streak Keeper', 'Série de 2 semaines', '⚡', 'epic');
    ELSIF v_longest_streak >= 7 THEN
        INSERT INTO wrapped_achievements (wrapped_id, achievement_slug, title, description, emoji, rarity)
        VALUES (p_wrapped_id, 'consistent', 'Consistent', 'Série d''une semaine', '✨', 'rare');
    END IF;

    -- Rising Star (pour les nouveaux membres actifs)
    -- Loyal Member (pour les anciens membres)
    -- Ces achievements nécessiteraient des données supplémentaires

END;
$$;

-- Fonction pour obtenir le wrapped d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_wrapped(
    p_user_id UUID,
    p_year INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wrapped RECORD;
    v_highlights JSON;
    v_achievements JSON;
    v_comparisons JSON;
BEGIN
    -- Récupérer le wrapped
    SELECT * INTO v_wrapped
    FROM user_annual_wrapped
    WHERE user_id = p_user_id AND year = p_year;

    IF v_wrapped IS NULL THEN
        RETURN NULL;
    END IF;

    -- Récupérer les highlights
    SELECT json_agg(
        json_build_object(
            'type', highlight_type,
            'title', title,
            'description', description,
            'value', value,
            'unit', unit,
            'metadata', metadata
        ) ORDER BY rank
    ) INTO v_highlights
    FROM wrapped_highlights
    WHERE wrapped_id = v_wrapped.id;

    -- Récupérer les achievements
    SELECT json_agg(
        json_build_object(
            'slug', achievement_slug,
            'title', title,
            'description', description,
            'emoji', emoji,
            'rarity', rarity
        )
    ) INTO v_achievements
    FROM wrapped_achievements
    WHERE wrapped_id = v_wrapped.id;

    -- Récupérer les comparisons
    SELECT json_agg(
        json_build_object(
            'type', comparison_type,
            'title', title,
            'user_value', user_value,
            'comparison_value', comparison_value,
            'percentage_diff', percentage_diff,
            'fun_text', fun_text
        )
    ) INTO v_comparisons
    FROM wrapped_comparisons
    WHERE wrapped_id = v_wrapped.id;

    -- Marquer comme vu si première vue
    IF v_wrapped.first_viewed_at IS NULL THEN
        UPDATE user_annual_wrapped
        SET first_viewed_at = NOW(), status = 'viewed'
        WHERE id = v_wrapped.id;
    END IF;

    RETURN json_build_object(
        'id', v_wrapped.id,
        'year', v_wrapped.year,
        'status', v_wrapped.status,
        'data', v_wrapped.wrapped_data,
        'highlights', COALESCE(v_highlights, '[]'::json),
        'achievements', COALESCE(v_achievements, '[]'::json),
        'comparisons', COALESCE(v_comparisons, '[]'::json),
        'share_token', v_wrapped.share_token,
        'is_public', v_wrapped.is_public,
        'generated_at', v_wrapped.generated_at
    );
END;
$$;

-- Fonction pour obtenir un wrapped public via token
CREATE OR REPLACE FUNCTION get_public_wrapped(p_share_token VARCHAR(100))
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wrapped RECORD;
BEGIN
    SELECT * INTO v_wrapped
    FROM user_annual_wrapped
    WHERE share_token = p_share_token AND is_public = true;

    IF v_wrapped IS NULL THEN
        RETURN NULL;
    END IF;

    -- Incrémenter le compteur de partage
    UPDATE user_annual_wrapped
    SET share_count = share_count + 1
    WHERE id = v_wrapped.id;

    RETURN get_user_wrapped(v_wrapped.user_id, v_wrapped.year);
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_annual_wrapped ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrapped_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrapped_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrapped_achievements ENABLE ROW LEVEL SECURITY;

-- Policies pour user_annual_wrapped
CREATE POLICY "Users can view their own wrapped"
ON user_annual_wrapped FOR SELECT
USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can update their own wrapped"
ON user_annual_wrapped FOR UPDATE
USING (auth.uid() = user_id);

-- Policies pour les sous-tables (lecture via le wrapped parent)
CREATE POLICY "Users can view their wrapped highlights"
ON wrapped_highlights FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_annual_wrapped
        WHERE id = wrapped_highlights.wrapped_id
        AND (user_id = auth.uid() OR is_public = true)
    )
);

CREATE POLICY "Users can view their wrapped achievements"
ON wrapped_achievements FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_annual_wrapped
        WHERE id = wrapped_achievements.wrapped_id
        AND (user_id = auth.uid() OR is_public = true)
    )
);

CREATE POLICY "Users can view their wrapped comparisons"
ON wrapped_comparisons FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_annual_wrapped
        WHERE id = wrapped_comparisons.wrapped_id
        AND (user_id = auth.uid() OR is_public = true)
    )
);

COMMIT;


-- ============================================================================
-- 014_profile_customization.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Profile Customization
-- ============================================================================
-- Migration: 014_profile_customization.sql
-- Description: Tables pour la personnalisation de profil (cadres, titres, couleurs)
-- ============================================================================

-- ============================================================================
-- PROFILE FRAMES (cadres d'avatar)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Visuel
    frame_type VARCHAR(30) NOT NULL, -- circle, square, hexagon, animated
    border_style VARCHAR(200), -- CSS border style
    gradient_colors TEXT[], -- Couleurs du dégradé
    animation_class VARCHAR(50), -- Classe CSS pour animation
    image_url TEXT, -- URL de l'image du cadre (si custom)

    -- Conditions d'obtention
    unlock_type VARCHAR(30) NOT NULL, -- free, level, achievement, purchase, event, vip
    unlock_requirement JSONB DEFAULT '{}',
    -- Ex: {"level": 10} ou {"achievement_id": "xxx"} ou {"coins": 500}

    -- Rareté
    rarity VARCHAR(20) DEFAULT 'common', -- common, uncommon, rare, epic, legendary

    -- Disponibilité
    is_active BOOLEAN DEFAULT true,
    is_limited BOOLEAN DEFAULT false,
    available_until TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROFILE TITLES (titres affichables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Affichage
    display_text VARCHAR(100) NOT NULL, -- Le texte affiché
    color VARCHAR(20), -- Couleur du titre
    gradient TEXT, -- Gradient CSS
    icon VARCHAR(50), -- Icône optionnelle
    emoji VARCHAR(10), -- Emoji optionnel

    -- Conditions d'obtention
    unlock_type VARCHAR(30) NOT NULL,
    unlock_requirement JSONB DEFAULT '{}',

    -- Rareté
    rarity VARCHAR(20) DEFAULT 'common',

    -- Catégorie
    category VARCHAR(30), -- achievement, event, social, game, special

    -- Disponibilité
    is_active BOOLEAN DEFAULT true,
    is_limited BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROFILE COLORS (thèmes de couleur)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Couleurs du thème
    primary_color VARCHAR(20) NOT NULL,
    secondary_color VARCHAR(20),
    accent_color VARCHAR(20),
    background_gradient TEXT, -- CSS gradient pour le fond du profil
    text_color VARCHAR(20) DEFAULT '#FFFFFF',

    -- Conditions d'obtention
    unlock_type VARCHAR(30) NOT NULL,
    unlock_requirement JSONB DEFAULT '{}',

    -- Rareté
    rarity VARCHAR(20) DEFAULT 'common',

    -- Disponibilité
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PROFILE BACKGROUNDS (fonds de profil)
-- ============================================================================

CREATE TABLE IF NOT EXISTS profile_backgrounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Visuel
    background_type VARCHAR(30) NOT NULL, -- gradient, image, pattern, animated
    background_value TEXT NOT NULL, -- CSS gradient, URL, ou pattern name
    overlay_opacity DECIMAL(3,2) DEFAULT 0.5,

    -- Conditions d'obtention
    unlock_type VARCHAR(30) NOT NULL,
    unlock_requirement JSONB DEFAULT '{}',

    -- Rareté
    rarity VARCHAR(20) DEFAULT 'common',

    -- Disponibilité
    is_active BOOLEAN DEFAULT true,
    is_limited BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER PROFILE CUSTOMIZATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profile_customization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Éléments équipés
    equipped_frame_id UUID REFERENCES profile_frames(id),
    equipped_title_id UUID REFERENCES profile_titles(id),
    equipped_color_id UUID REFERENCES profile_colors(id),
    equipped_background_id UUID REFERENCES profile_backgrounds(id),

    -- Badge showcase (badges mis en avant, max 3)
    showcase_badge_ids UUID[] DEFAULT '{}',

    -- Bio personnalisée
    custom_bio TEXT,
    bio_emoji VARCHAR(10),

    -- Préférences
    show_level BOOLEAN DEFAULT true,
    show_xp BOOLEAN DEFAULT true,
    show_badges_count BOOLEAN DEFAULT true,
    show_events_count BOOLEAN DEFAULT true,
    show_friends_count BOOLEAN DEFAULT true,
    show_crew BOOLEAN DEFAULT true,

    -- Statut personnalisé
    custom_status VARCHAR(100),
    status_emoji VARCHAR(10),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER UNLOCKED ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_unlocked_frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    frame_id UUID NOT NULL REFERENCES profile_frames(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_source VARCHAR(50), -- achievement, purchase, event, gift

    UNIQUE(user_id, frame_id)
);

CREATE TABLE IF NOT EXISTS user_unlocked_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title_id UUID NOT NULL REFERENCES profile_titles(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_source VARCHAR(50),

    UNIQUE(user_id, title_id)
);

CREATE TABLE IF NOT EXISTS user_unlocked_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    color_id UUID NOT NULL REFERENCES profile_colors(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_source VARCHAR(50),

    UNIQUE(user_id, color_id)
);

CREATE TABLE IF NOT EXISTS user_unlocked_backgrounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    background_id UUID NOT NULL REFERENCES profile_backgrounds(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_source VARCHAR(50),

    UNIQUE(user_id, background_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_unlocked_frames_user ON user_unlocked_frames(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_titles_user ON user_unlocked_titles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_colors_user ON user_unlocked_colors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_backgrounds_user ON user_unlocked_backgrounds(user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour obtenir les items débloqués d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_customization_items(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_frames JSON;
    v_titles JSON;
    v_colors JSON;
    v_backgrounds JSON;
    v_equipped JSON;
BEGIN
    -- Frames débloqués
    SELECT json_agg(
        json_build_object(
            'id', f.id,
            'slug', f.slug,
            'name', f.name,
            'description', f.description,
            'frame_type', f.frame_type,
            'border_style', f.border_style,
            'gradient_colors', f.gradient_colors,
            'animation_class', f.animation_class,
            'rarity', f.rarity,
            'unlocked_at', uf.unlocked_at
        )
    ) INTO v_frames
    FROM user_unlocked_frames uf
    JOIN profile_frames f ON f.id = uf.frame_id
    WHERE uf.user_id = p_user_id;

    -- Titles débloqués
    SELECT json_agg(
        json_build_object(
            'id', t.id,
            'slug', t.slug,
            'name', t.name,
            'display_text', t.display_text,
            'color', t.color,
            'gradient', t.gradient,
            'emoji', t.emoji,
            'rarity', t.rarity,
            'category', t.category,
            'unlocked_at', ut.unlocked_at
        )
    ) INTO v_titles
    FROM user_unlocked_titles ut
    JOIN profile_titles t ON t.id = ut.title_id
    WHERE ut.user_id = p_user_id;

    -- Colors débloqués
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'slug', c.slug,
            'name', c.name,
            'primary_color', c.primary_color,
            'secondary_color', c.secondary_color,
            'accent_color', c.accent_color,
            'background_gradient', c.background_gradient,
            'rarity', c.rarity,
            'unlocked_at', uc.unlocked_at
        )
    ) INTO v_colors
    FROM user_unlocked_colors uc
    JOIN profile_colors c ON c.id = uc.color_id
    WHERE uc.user_id = p_user_id;

    -- Backgrounds débloqués
    SELECT json_agg(
        json_build_object(
            'id', b.id,
            'slug', b.slug,
            'name', b.name,
            'background_type', b.background_type,
            'background_value', b.background_value,
            'rarity', b.rarity,
            'unlocked_at', ub.unlocked_at
        )
    ) INTO v_backgrounds
    FROM user_unlocked_backgrounds ub
    JOIN profile_backgrounds b ON b.id = ub.background_id
    WHERE ub.user_id = p_user_id;

    -- Items équipés
    SELECT json_build_object(
        'frame', (SELECT row_to_json(f) FROM profile_frames f WHERE f.id = upc.equipped_frame_id),
        'title', (SELECT row_to_json(t) FROM profile_titles t WHERE t.id = upc.equipped_title_id),
        'color', (SELECT row_to_json(c) FROM profile_colors c WHERE c.id = upc.equipped_color_id),
        'background', (SELECT row_to_json(b) FROM profile_backgrounds b WHERE b.id = upc.equipped_background_id),
        'showcase_badges', upc.showcase_badge_ids,
        'custom_bio', upc.custom_bio,
        'custom_status', upc.custom_status,
        'preferences', json_build_object(
            'show_level', upc.show_level,
            'show_xp', upc.show_xp,
            'show_badges_count', upc.show_badges_count,
            'show_events_count', upc.show_events_count,
            'show_friends_count', upc.show_friends_count,
            'show_crew', upc.show_crew
        )
    ) INTO v_equipped
    FROM user_profile_customization upc
    WHERE upc.user_id = p_user_id;

    RETURN json_build_object(
        'frames', COALESCE(v_frames, '[]'::json),
        'titles', COALESCE(v_titles, '[]'::json),
        'colors', COALESCE(v_colors, '[]'::json),
        'backgrounds', COALESCE(v_backgrounds, '[]'::json),
        'equipped', v_equipped
    );
END;
$$;

-- Fonction pour équiper un item
CREATE OR REPLACE FUNCTION equip_profile_item(
    p_user_id UUID,
    p_item_type VARCHAR(20),
    p_item_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_owns_item BOOLEAN := FALSE;
BEGIN
    -- Vérifier que l'utilisateur possède l'item
    CASE p_item_type
        WHEN 'frame' THEN
            SELECT EXISTS(SELECT 1 FROM user_unlocked_frames WHERE user_id = p_user_id AND frame_id = p_item_id) INTO v_owns_item;
        WHEN 'title' THEN
            SELECT EXISTS(SELECT 1 FROM user_unlocked_titles WHERE user_id = p_user_id AND title_id = p_item_id) INTO v_owns_item;
        WHEN 'color' THEN
            SELECT EXISTS(SELECT 1 FROM user_unlocked_colors WHERE user_id = p_user_id AND color_id = p_item_id) INTO v_owns_item;
        WHEN 'background' THEN
            SELECT EXISTS(SELECT 1 FROM user_unlocked_backgrounds WHERE user_id = p_user_id AND background_id = p_item_id) INTO v_owns_item;
    END CASE;

    IF NOT v_owns_item THEN
        RETURN FALSE;
    END IF;

    -- Créer l'entrée de customization si elle n'existe pas
    INSERT INTO user_profile_customization (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    -- Équiper l'item
    CASE p_item_type
        WHEN 'frame' THEN
            UPDATE user_profile_customization SET equipped_frame_id = p_item_id, updated_at = NOW() WHERE user_id = p_user_id;
        WHEN 'title' THEN
            UPDATE user_profile_customization SET equipped_title_id = p_item_id, updated_at = NOW() WHERE user_id = p_user_id;
        WHEN 'color' THEN
            UPDATE user_profile_customization SET equipped_color_id = p_item_id, updated_at = NOW() WHERE user_id = p_user_id;
        WHEN 'background' THEN
            UPDATE user_profile_customization SET equipped_background_id = p_item_id, updated_at = NOW() WHERE user_id = p_user_id;
    END CASE;

    RETURN TRUE;
END;
$$;

-- Fonction pour débloquer un item pour un utilisateur
CREATE OR REPLACE FUNCTION unlock_profile_item(
    p_user_id UUID,
    p_item_type VARCHAR(20),
    p_item_id UUID,
    p_source VARCHAR(50) DEFAULT 'system'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    CASE p_item_type
        WHEN 'frame' THEN
            INSERT INTO user_unlocked_frames (user_id, frame_id, unlock_source)
            VALUES (p_user_id, p_item_id, p_source)
            ON CONFLICT (user_id, frame_id) DO NOTHING;
        WHEN 'title' THEN
            INSERT INTO user_unlocked_titles (user_id, title_id, unlock_source)
            VALUES (p_user_id, p_item_id, p_source)
            ON CONFLICT (user_id, title_id) DO NOTHING;
        WHEN 'color' THEN
            INSERT INTO user_unlocked_colors (user_id, color_id, unlock_source)
            VALUES (p_user_id, p_item_id, p_source)
            ON CONFLICT (user_id, color_id) DO NOTHING;
        WHEN 'background' THEN
            INSERT INTO user_unlocked_backgrounds (user_id, background_id, unlock_source)
            VALUES (p_user_id, p_item_id, p_source)
            ON CONFLICT (user_id, background_id) DO NOTHING;
    END CASE;

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profile_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile_customization ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocked_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocked_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocked_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unlocked_backgrounds ENABLE ROW LEVEL SECURITY;

-- Items de base lisibles par tous
CREATE POLICY "Anyone can view active profile items"
ON profile_frames FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active titles"
ON profile_titles FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active colors"
ON profile_colors FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active backgrounds"
ON profile_backgrounds FOR SELECT USING (is_active = true);

-- Customization utilisateur
CREATE POLICY "Users can view any profile customization"
ON user_profile_customization FOR SELECT
USING (true);

CREATE POLICY "Users can update their own customization"
ON user_profile_customization FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customization"
ON user_profile_customization FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Items débloqués
CREATE POLICY "Users can view their unlocked frames"
ON user_unlocked_frames FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their unlocked titles"
ON user_unlocked_titles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their unlocked colors"
ON user_unlocked_colors FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their unlocked backgrounds"
ON user_unlocked_backgrounds FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Frames par défaut
INSERT INTO profile_frames (slug, name, description, frame_type, border_style, gradient_colors, unlock_type, rarity) VALUES
('default', 'Classique', 'Le cadre par défaut', 'circle', '3px solid #71717a', NULL, 'free', 'common'),
('cyan_glow', 'Lueur Cyan', 'Un cadre avec une lueur cyan', 'circle', '3px solid #06b6d4', ARRAY['#06b6d4', '#0891b2'], 'level', 'uncommon'),
('purple_ring', 'Anneau Violet', 'Un élégant anneau violet', 'circle', '4px solid #a855f7', ARRAY['#a855f7', '#7c3aed'], 'level', 'uncommon'),
('gold_frame', 'Cadre Doré', 'Un cadre prestigieux doré', 'circle', '4px solid #f59e0b', ARRAY['#f59e0b', '#d97706'], 'level', 'rare'),
('rainbow', 'Arc-en-ciel', 'Un cadre aux couleurs de l''arc-en-ciel', 'circle', '4px solid transparent', ARRAY['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'], 'achievement', 'epic'),
('animated_fire', 'Flammes', 'Un cadre animé avec des flammes', 'animated', NULL, ARRAY['#ef4444', '#f97316', '#fbbf24'], 'achievement', 'legendary'),
('diamond', 'Diamant', 'Le cadre ultime en diamant', 'hexagon', '5px solid #67e8f9', ARRAY['#67e8f9', '#22d3ee', '#06b6d4'], 'vip', 'legendary')
ON CONFLICT (slug) DO NOTHING;

-- Titres par défaut
INSERT INTO profile_titles (slug, name, description, display_text, color, emoji, unlock_type, rarity, category) VALUES
('newcomer', 'Nouveau', 'Pour les nouveaux membres', 'Nouveau', '#71717a', '🌱', 'free', 'common', 'achievement'),
('regular', 'Habitué', 'Membre régulier', 'Habitué', '#06b6d4', '⭐', 'level', 'common', 'achievement'),
('party_animal', 'Party Animal', 'Toujours présent aux events', 'Party Animal', '#a855f7', '🎉', 'achievement', 'rare', 'event'),
('game_master', 'Game Master', 'Expert des mini-jeux', 'Game Master', '#22c55e', '🎮', 'achievement', 'rare', 'game'),
('social_butterfly', 'Social Butterfly', 'Super sociable', 'Social Butterfly', '#ec4899', '🦋', 'achievement', 'rare', 'social'),
('legend', 'Légende', 'Un membre légendaire', 'Légende', '#f59e0b', '👑', 'achievement', 'legendary', 'special'),
('og', 'OG Member', 'Membre depuis le début', 'OG', '#ef4444', '💎', 'achievement', 'legendary', 'special'),
('streaker', 'Streaker', 'Maître des séries', 'Streaker', '#f97316', '🔥', 'achievement', 'epic', 'achievement'),
('predictor', 'Oracle', 'Expert en prédictions', 'Oracle', '#8b5cf6', '🔮', 'achievement', 'epic', 'game')
ON CONFLICT (slug) DO NOTHING;

-- Couleurs par défaut
INSERT INTO profile_colors (slug, name, description, primary_color, secondary_color, accent_color, background_gradient, unlock_type, rarity) VALUES
('default', 'Classique', 'Thème par défaut', '#71717a', '#52525b', '#06b6d4', 'linear-gradient(135deg, #18181b 0%, #27272a 100%)', 'free', 'common'),
('ocean', 'Océan', 'Bleu profond', '#06b6d4', '#0891b2', '#22d3ee', 'linear-gradient(135deg, #164e63 0%, #0e7490 100%)', 'level', 'uncommon'),
('sunset', 'Coucher de soleil', 'Orange chaud', '#f97316', '#ea580c', '#fb923c', 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)', 'level', 'uncommon'),
('forest', 'Forêt', 'Vert nature', '#22c55e', '#16a34a', '#4ade80', 'linear-gradient(135deg, #14532d 0%, #166534 100%)', 'level', 'uncommon'),
('galaxy', 'Galaxie', 'Violet spatial', '#8b5cf6', '#7c3aed', '#a78bfa', 'linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)', 'achievement', 'rare'),
('neon', 'Néon', 'Rose fluo', '#ec4899', '#db2777', '#f472b6', 'linear-gradient(135deg, #500724 0%, #831843 100%)', 'achievement', 'rare'),
('gold', 'Or', 'Prestige doré', '#f59e0b', '#d97706', '#fbbf24', 'linear-gradient(135deg, #451a03 0%, #78350f 100%)', 'vip', 'epic'),
('holographic', 'Holographique', 'Effet holographique', '#67e8f9', '#a78bfa', '#f472b6', 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #581c87 100%)', 'vip', 'legendary')
ON CONFLICT (slug) DO NOTHING;

-- Backgrounds par défaut
INSERT INTO profile_backgrounds (slug, name, description, background_type, background_value, unlock_type, rarity) VALUES
('default', 'Classique', 'Fond par défaut', 'gradient', 'linear-gradient(135deg, #18181b 0%, #27272a 100%)', 'free', 'common'),
('stars', 'Étoiles', 'Ciel étoilé', 'pattern', 'stars', 'level', 'uncommon'),
('geometric', 'Géométrique', 'Motifs géométriques', 'pattern', 'geometric', 'level', 'uncommon'),
('waves', 'Vagues', 'Vagues abstraites', 'animated', 'waves', 'achievement', 'rare'),
('particles', 'Particules', 'Particules flottantes', 'animated', 'particles', 'achievement', 'rare'),
('aurora', 'Aurore', 'Aurore boréale', 'animated', 'aurora', 'vip', 'epic'),
('matrix', 'Matrix', 'Code qui défile', 'animated', 'matrix', 'achievement', 'legendary')
ON CONFLICT (slug) DO NOTHING;

COMMIT;


-- ============================================================================
-- 015_collections.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Collections System
-- ============================================================================
-- Migration: 015_collections.sql
-- Description: Système de collections (cartes, stickers)
-- ============================================================================

-- ============================================================================
-- COLLECTION SETS (ensembles de cartes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS collection_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Visuel
    cover_image_url TEXT,
    theme_color VARCHAR(20),
    theme_gradient TEXT,

    -- Configuration
    total_items INTEGER NOT NULL DEFAULT 0,
    set_type VARCHAR(30) NOT NULL, -- cards, stickers, photos, moments

    -- Récompenses pour complétion
    completion_xp INTEGER DEFAULT 500,
    completion_coins INTEGER DEFAULT 200,
    completion_badge_id UUID,
    completion_title_id UUID,

    -- Disponibilité
    is_active BOOLEAN DEFAULT true,
    is_limited BOOLEAN DEFAULT false,
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    season VARCHAR(50), -- summer_2024, winter_2024, etc.

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COLLECTIBLE ITEMS (cartes/stickers individuels)
-- ============================================================================

CREATE TABLE IF NOT EXISTS collectible_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID NOT NULL REFERENCES collection_sets(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Visuel
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    animation_type VARCHAR(30), -- none, shimmer, holographic, animated

    -- Position dans le set
    item_number INTEGER NOT NULL,

    -- Rareté et drop rate
    rarity VARCHAR(20) NOT NULL DEFAULT 'common', -- common, uncommon, rare, epic, legendary
    drop_rate DECIMAL(5,4) DEFAULT 0.3, -- 30% par défaut

    -- Sources d'obtention
    obtainable_from VARCHAR(30)[], -- event, game, challenge, shop, gift
    event_exclusive BOOLEAN DEFAULT false,
    event_id UUID,

    -- Prix si achetable
    coin_price INTEGER,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(set_id, item_number)
);

CREATE INDEX IF NOT EXISTS idx_collectible_items_set ON collectible_items(set_id);
CREATE INDEX IF NOT EXISTS idx_collectible_items_rarity ON collectible_items(rarity);

-- ============================================================================
-- USER COLLECTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_collectibles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES collectible_items(id) ON DELETE CASCADE,

    -- Acquisition
    obtained_at TIMESTAMPTZ DEFAULT NOW(),
    obtained_from VARCHAR(50), -- event, game, challenge, shop, gift, trade

    -- Quantité (pour les doublons)
    quantity INTEGER DEFAULT 1,

    -- État
    is_new BOOLEAN DEFAULT true, -- Pour animation "nouveau"
    is_favorite BOOLEAN DEFAULT false,

    -- Contexte d'obtention
    source_event_id UUID,
    source_game_id UUID,
    gifted_by_user_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_collectibles_user ON user_collectibles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collectibles_item ON user_collectibles(item_id);

-- ============================================================================
-- USER COLLECTION PROGRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_collection_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    set_id UUID NOT NULL REFERENCES collection_sets(id) ON DELETE CASCADE,

    items_collected INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0,

    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    rewards_claimed BOOLEAN DEFAULT false,
    rewards_claimed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, set_id)
);

-- ============================================================================
-- COLLECTION TRADES (échanges entre joueurs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS collection_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Initiateur
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_item_ids UUID[] NOT NULL,

    -- Destinataire
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_item_ids UUID[] NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected, cancelled, completed

    -- Messages
    sender_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_collection_trades_sender ON collection_trades(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_collection_trades_receiver ON collection_trades(receiver_id, status);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour ajouter un collectible à un utilisateur
CREATE OR REPLACE FUNCTION add_collectible_to_user(
    p_user_id UUID,
    p_item_id UUID,
    p_source VARCHAR(50) DEFAULT 'system',
    p_source_event_id UUID DEFAULT NULL,
    p_gifted_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_set RECORD;
    v_is_new BOOLEAN := TRUE;
    v_new_quantity INTEGER := 1;
    v_progress RECORD;
BEGIN
    -- Récupérer l'item
    SELECT ci.*, cs.total_items as set_total
    INTO v_item
    FROM collectible_items ci
    JOIN collection_sets cs ON cs.id = ci.set_id
    WHERE ci.id = p_item_id;

    IF v_item IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Item not found');
    END IF;

    -- Ajouter ou mettre à jour le collectible
    INSERT INTO user_collectibles (user_id, item_id, obtained_from, source_event_id, gifted_by_user_id)
    VALUES (p_user_id, p_item_id, p_source, p_source_event_id, p_gifted_by)
    ON CONFLICT (user_id, item_id) DO UPDATE SET
        quantity = user_collectibles.quantity + 1,
        is_new = false,
        updated_at = NOW()
    RETURNING quantity, is_new = true INTO v_new_quantity, v_is_new;

    -- Mettre à jour la progression
    INSERT INTO user_collection_progress (user_id, set_id, total_items)
    VALUES (p_user_id, v_item.set_id, v_item.set_total)
    ON CONFLICT (user_id, set_id) DO NOTHING;

    -- Recalculer la progression
    UPDATE user_collection_progress SET
        items_collected = (
            SELECT COUNT(DISTINCT uc.item_id)
            FROM user_collectibles uc
            JOIN collectible_items ci ON ci.id = uc.item_id
            WHERE uc.user_id = p_user_id AND ci.set_id = v_item.set_id
        ),
        completion_percentage = (
            SELECT ROUND(COUNT(DISTINCT uc.item_id)::DECIMAL / v_item.set_total * 100, 2)
            FROM user_collectibles uc
            JOIN collectible_items ci ON ci.id = uc.item_id
            WHERE uc.user_id = p_user_id AND ci.set_id = v_item.set_id
        ),
        updated_at = NOW()
    WHERE user_id = p_user_id AND set_id = v_item.set_id
    RETURNING * INTO v_progress;

    -- Vérifier si le set est complété
    IF v_progress.items_collected >= v_item.set_total AND NOT v_progress.is_completed THEN
        UPDATE user_collection_progress SET
            is_completed = true,
            completed_at = NOW()
        WHERE user_id = p_user_id AND set_id = v_item.set_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'is_new_item', v_is_new,
        'quantity', v_new_quantity,
        'item', row_to_json(v_item),
        'progress', json_build_object(
            'items_collected', v_progress.items_collected,
            'total_items', v_progress.total_items,
            'percentage', v_progress.completion_percentage,
            'is_completed', v_progress.items_collected >= v_item.set_total
        )
    );
END;
$$;

-- Fonction pour obtenir un item aléatoire basé sur les drop rates
CREATE OR REPLACE FUNCTION get_random_collectible(
    p_set_id UUID DEFAULT NULL,
    p_rarity VARCHAR(20) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item_id UUID;
BEGIN
    -- Sélection pondérée par drop_rate
    SELECT id INTO v_item_id
    FROM collectible_items
    WHERE is_active = true
    AND (p_set_id IS NULL OR set_id = p_set_id)
    AND (p_rarity IS NULL OR rarity = p_rarity)
    ORDER BY random() * (1.0 / NULLIF(drop_rate, 0))
    LIMIT 1;

    RETURN v_item_id;
END;
$$;

-- Fonction pour obtenir les collections d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_collections(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sets JSON;
    v_recent JSON;
    v_stats JSON;
BEGIN
    -- Sets avec progression
    SELECT json_agg(
        json_build_object(
            'set', row_to_json(cs),
            'progress', row_to_json(ucp),
            'collected_items', (
                SELECT json_agg(ci.id)
                FROM user_collectibles uc
                JOIN collectible_items ci ON ci.id = uc.item_id
                WHERE uc.user_id = p_user_id AND ci.set_id = cs.id
            )
        )
    ) INTO v_sets
    FROM collection_sets cs
    LEFT JOIN user_collection_progress ucp ON ucp.set_id = cs.id AND ucp.user_id = p_user_id
    WHERE cs.is_active = true;

    -- Items récents
    SELECT json_agg(
        json_build_object(
            'item', row_to_json(ci),
            'obtained_at', uc.obtained_at,
            'is_new', uc.is_new
        ) ORDER BY uc.obtained_at DESC
    ) INTO v_recent
    FROM user_collectibles uc
    JOIN collectible_items ci ON ci.id = uc.item_id
    WHERE uc.user_id = p_user_id
    LIMIT 10;

    -- Stats globales
    SELECT json_build_object(
        'total_items', COUNT(DISTINCT uc.item_id),
        'total_duplicates', COALESCE(SUM(uc.quantity) - COUNT(DISTINCT uc.item_id), 0),
        'sets_completed', (
            SELECT COUNT(*) FROM user_collection_progress WHERE user_id = p_user_id AND is_completed = true
        ),
        'rarity_breakdown', (
            SELECT json_object_agg(ci.rarity, count)
            FROM (
                SELECT ci.rarity, COUNT(DISTINCT uc.item_id) as count
                FROM user_collectibles uc
                JOIN collectible_items ci ON ci.id = uc.item_id
                WHERE uc.user_id = p_user_id
                GROUP BY ci.rarity
            ) ci
        )
    ) INTO v_stats
    FROM user_collectibles uc
    WHERE uc.user_id = p_user_id;

    RETURN json_build_object(
        'sets', COALESCE(v_sets, '[]'::json),
        'recent', COALESCE(v_recent, '[]'::json),
        'stats', v_stats
    );
END;
$$;

-- Fonction pour réclamer les récompenses d'un set complété
CREATE OR REPLACE FUNCTION claim_set_completion_rewards(
    p_user_id UUID,
    p_set_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_progress RECORD;
    v_set RECORD;
BEGIN
    -- Vérifier la progression
    SELECT * INTO v_progress
    FROM user_collection_progress
    WHERE user_id = p_user_id AND set_id = p_set_id;

    IF v_progress IS NULL OR NOT v_progress.is_completed THEN
        RETURN json_build_object('success', false, 'error', 'Set not completed');
    END IF;

    IF v_progress.rewards_claimed THEN
        RETURN json_build_object('success', false, 'error', 'Rewards already claimed');
    END IF;

    -- Récupérer les infos du set
    SELECT * INTO v_set FROM collection_sets WHERE id = p_set_id;

    -- Marquer comme réclamé
    UPDATE user_collection_progress SET
        rewards_claimed = true,
        rewards_claimed_at = NOW()
    WHERE user_id = p_user_id AND set_id = p_set_id;

    -- Les récompenses XP/coins seront ajoutées via une autre fonction
    -- Ici on retourne juste ce qui doit être ajouté

    RETURN json_build_object(
        'success', true,
        'rewards', json_build_object(
            'xp', v_set.completion_xp,
            'coins', v_set.completion_coins,
            'badge_id', v_set.completion_badge_id,
            'title_id', v_set.completion_title_id
        )
    );
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE collection_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectible_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collectibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collection_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_trades ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view active collection sets"
ON collection_sets FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active collectible items"
ON collectible_items FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their collectibles"
ON user_collectibles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their collection progress"
ON user_collection_progress FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their trades"
ON collection_trades FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create trades"
ON collection_trades FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their trades"
ON collection_trades FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Set de base: Cartes des Événements
INSERT INTO collection_sets (slug, name, description, set_type, total_items, theme_color, completion_xp, completion_coins)
VALUES
('event_memories', 'Souvenirs d''Événements', 'Collectionne les cartes des meilleurs moments de nos soirées', 'cards', 20, '#8b5cf6', 1000, 500),
('dj_legends', 'Légendes DJ', 'Les meilleurs DJs qui ont enflammé nos soirées', 'cards', 10, '#f59e0b', 750, 300),
('party_stickers', 'Stickers Party', 'Stickers fun pour personnaliser ton profil', 'stickers', 30, '#ec4899', 500, 200),
('rare_moments', 'Moments Rares', 'Les moments les plus iconiques capturés', 'moments', 12, '#06b6d4', 1500, 750)
ON CONFLICT (slug) DO NOTHING;

-- Items exemples pour event_memories
INSERT INTO collectible_items (set_id, slug, name, description, image_url, item_number, rarity, drop_rate, obtainable_from)
SELECT
    (SELECT id FROM collection_sets WHERE slug = 'event_memories'),
    'em_' || n,
    'Souvenir #' || n,
    'Un moment inoubliable',
    '/collections/event_memories/' || n || '.png',
    n,
    CASE
        WHEN n <= 10 THEN 'common'
        WHEN n <= 15 THEN 'uncommon'
        WHEN n <= 18 THEN 'rare'
        WHEN n <= 19 THEN 'epic'
        ELSE 'legendary'
    END,
    CASE
        WHEN n <= 10 THEN 0.40
        WHEN n <= 15 THEN 0.25
        WHEN n <= 18 THEN 0.10
        WHEN n <= 19 THEN 0.04
        ELSE 0.01
    END,
    ARRAY['event', 'game', 'challenge']
FROM generate_series(1, 20) AS n
ON CONFLICT DO NOTHING;

COMMIT;


-- ============================================================================
-- 016_gamified_notifications.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Gamified Notifications System
-- ============================================================================
-- Migration: 016_gamified_notifications.sql
-- Description: Système de notifications gamifiées intelligentes
-- ============================================================================

-- ============================================================================
-- NOTIFICATION TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- achievement, social, event, challenge, reward, system

    -- Contenu
    title_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    icon VARCHAR(50),
    emoji VARCHAR(10),

    -- Style
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    color VARCHAR(20),
    animation VARCHAR(50), -- confetti, glow, shake, bounce
    sound VARCHAR(50), -- success, achievement, social, alert

    -- Gamification
    xp_reward INTEGER DEFAULT 0,
    coin_reward INTEGER DEFAULT 0,

    -- Configuration
    is_pushable BOOLEAN DEFAULT true,
    is_dismissable BOOLEAN DEFAULT true,
    auto_dismiss_seconds INTEGER,
    requires_action BOOLEAN DEFAULT false,
    action_url TEXT,
    action_label VARCHAR(50),

    -- Grouping
    group_key VARCHAR(50), -- Pour grouper les notifs similaires
    max_group_size INTEGER DEFAULT 5,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES notification_templates(id),

    -- Contenu personnalisé
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon VARCHAR(50),
    emoji VARCHAR(10),
    image_url TEXT,

    -- Données additionnelles
    data JSONB DEFAULT '{}',

    -- Style hérité ou personnalisé
    priority VARCHAR(20) DEFAULT 'normal',
    color VARCHAR(20),
    animation VARCHAR(50),

    -- Récompenses
    xp_reward INTEGER DEFAULT 0,
    coin_reward INTEGER DEFAULT 0,
    rewards_claimed BOOLEAN DEFAULT false,

    -- Action
    action_url TEXT,
    action_label VARCHAR(50),

    -- État
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    is_clicked BOOLEAN DEFAULT false,
    clicked_at TIMESTAMPTZ,
    is_dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMPTZ,

    -- Grouping
    group_key VARCHAR(50),
    group_count INTEGER DEFAULT 1,

    -- Push notification
    push_sent BOOLEAN DEFAULT false,
    push_sent_at TIMESTAMPTZ,
    push_clicked BOOLEAN DEFAULT false,

    -- Scheduling
    scheduled_for TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_scheduled ON user_notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_notifications_group ON user_notifications(user_id, group_key) WHERE group_key IS NOT NULL;

-- ============================================================================
-- NOTIFICATION PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Canaux
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,

    -- Catégories
    achievements_enabled BOOLEAN DEFAULT true,
    social_enabled BOOLEAN DEFAULT true,
    events_enabled BOOLEAN DEFAULT true,
    challenges_enabled BOOLEAN DEFAULT true,
    rewards_enabled BOOLEAN DEFAULT true,
    system_enabled BOOLEAN DEFAULT true,

    -- Horaires (ne pas déranger)
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME,
    quiet_hours_end TIME,

    -- Fréquence
    digest_enabled BOOLEAN DEFAULT false, -- Recevoir un résumé quotidien
    digest_time TIME DEFAULT '18:00',
    max_daily_push INTEGER DEFAULT 10,

    -- Sons
    sounds_enabled BOOLEAN DEFAULT true,
    vibration_enabled BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- ============================================================================
-- NOTIFICATION TRIGGERS (règles automatiques)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Événement déclencheur
    trigger_event VARCHAR(100) NOT NULL, -- level_up, badge_earned, friend_request, etc.
    trigger_conditions JSONB DEFAULT '{}', -- Conditions additionnelles

    -- Template à utiliser
    template_id UUID REFERENCES notification_templates(id),

    -- Délai
    delay_minutes INTEGER DEFAULT 0,

    -- Limites
    cooldown_minutes INTEGER, -- Temps minimum entre deux notifs du même trigger
    max_per_day INTEGER,
    max_per_week INTEGER,

    -- Smart timing
    use_smart_timing BOOLEAN DEFAULT false, -- Envoyer au meilleur moment

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATION HISTORY (pour analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES notification_templates(id),

    -- Métriques journalières
    date DATE NOT NULL,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    dismissed_count INTEGER DEFAULT 0,

    -- Récompenses
    total_xp_awarded INTEGER DEFAULT 0,
    total_coins_awarded INTEGER DEFAULT 0,

    -- Engagement
    avg_time_to_read_seconds INTEGER,
    avg_time_to_click_seconds INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(template_id, date)
);

-- ============================================================================
-- PUSH SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Web Push
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,

    -- Device info
    device_type VARCHAR(20), -- web, android, ios
    device_name VARCHAR(100),
    browser VARCHAR(50),

    -- État
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, endpoint)
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Créer une notification à partir d'un template
CREATE OR REPLACE FUNCTION create_notification_from_template(
    p_user_id UUID,
    p_template_slug VARCHAR(100),
    p_data JSONB DEFAULT '{}',
    p_scheduled_for TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template RECORD;
    v_notification_id UUID;
    v_title TEXT;
    v_body TEXT;
    v_prefs RECORD;
    v_key TEXT;
    v_value TEXT;
    v_rec RECORD;
BEGIN
    -- Récupérer le template
    SELECT * INTO v_template
    FROM notification_templates
    WHERE slug = p_template_slug AND is_active = true;

    IF v_template IS NULL THEN
        RETURN NULL;
    END IF;

    -- Vérifier les préférences utilisateur
    SELECT * INTO v_prefs
    FROM notification_preferences
    WHERE user_id = p_user_id;

    -- Vérifier si la catégorie est activée
    IF v_prefs IS NOT NULL THEN
        IF (v_template.category = 'achievement' AND NOT v_prefs.achievements_enabled) OR
           (v_template.category = 'social' AND NOT v_prefs.social_enabled) OR
           (v_template.category = 'event' AND NOT v_prefs.events_enabled) OR
           (v_template.category = 'challenge' AND NOT v_prefs.challenges_enabled) OR
           (v_template.category = 'reward' AND NOT v_prefs.rewards_enabled) OR
           (v_template.category = 'system' AND NOT v_prefs.system_enabled) THEN
            RETURN NULL;
        END IF;
    END IF;

    -- Remplacer les variables dans le titre et le corps
    v_title := v_template.title_template;
    v_body := v_template.body_template;

    -- Remplacer les placeholders avec les données
    FOR v_rec IN SELECT * FROM jsonb_each_text(p_data)
    LOOP
        v_title := REPLACE(v_title, '{{' || v_rec.key || '}}', v_rec.value);
        v_body := REPLACE(v_body, '{{' || v_rec.key || '}}', v_rec.value);
    END LOOP;

    -- Créer la notification
    INSERT INTO user_notifications (
        user_id, template_id, title, body, icon, emoji,
        priority, color, animation,
        xp_reward, coin_reward,
        action_url, action_label,
        group_key, data,
        scheduled_for
    )
    VALUES (
        p_user_id, v_template.id, v_title, v_body, v_template.icon, v_template.emoji,
        v_template.priority, v_template.color, v_template.animation,
        v_template.xp_reward, v_template.coin_reward,
        REPLACE(v_template.action_url, '{{id}}', COALESCE(p_data->>'id', '')), v_template.action_label,
        v_template.group_key, p_data,
        p_scheduled_for
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

-- Envoyer une notification personnalisée
CREATE OR REPLACE FUNCTION send_custom_notification(
    p_user_id UUID,
    p_title TEXT,
    p_body TEXT,
    p_category VARCHAR(50) DEFAULT 'system',
    p_icon VARCHAR(50) DEFAULT NULL,
    p_emoji VARCHAR(10) DEFAULT NULL,
    p_priority VARCHAR(20) DEFAULT 'normal',
    p_color VARCHAR(20) DEFAULT NULL,
    p_animation VARCHAR(50) DEFAULT NULL,
    p_xp_reward INTEGER DEFAULT 0,
    p_coin_reward INTEGER DEFAULT 0,
    p_action_url TEXT DEFAULT NULL,
    p_action_label VARCHAR(50) DEFAULT NULL,
    p_data JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO user_notifications (
        user_id, title, body, icon, emoji,
        priority, color, animation,
        xp_reward, coin_reward,
        action_url, action_label, data
    )
    VALUES (
        p_user_id, p_title, p_body, p_icon, p_emoji,
        p_priority, p_color, p_animation,
        p_xp_reward, p_coin_reward,
        p_action_url, p_action_label, p_data
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$;

-- Marquer les notifications comme lues
CREATE OR REPLACE FUNCTION mark_notifications_read(
    p_user_id UUID,
    p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        -- Marquer toutes les notifications non lues
        UPDATE user_notifications SET
            is_read = true,
            read_at = NOW()
        WHERE user_id = p_user_id AND is_read = false;
    ELSE
        -- Marquer les notifications spécifiées
        UPDATE user_notifications SET
            is_read = true,
            read_at = NOW()
        WHERE user_id = p_user_id AND id = ANY(p_notification_ids) AND is_read = false;
    END IF;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Récupérer les notifications d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notifications JSON;
    v_unread_count INTEGER;
    v_total_count INTEGER;
BEGIN
    -- Compter les non lues
    SELECT COUNT(*) INTO v_unread_count
    FROM user_notifications
    WHERE user_id = p_user_id AND is_read = false AND is_dismissed = false
    AND (scheduled_for IS NULL OR scheduled_for <= NOW())
    AND (expires_at IS NULL OR expires_at > NOW());

    -- Récupérer les notifications
    SELECT json_agg(n ORDER BY n.created_at DESC) INTO v_notifications
    FROM (
        SELECT
            id, title, body, icon, emoji, image_url,
            priority, color, animation,
            xp_reward, coin_reward, rewards_claimed,
            action_url, action_label,
            is_read, read_at,
            group_key, group_count,
            data, created_at
        FROM user_notifications
        WHERE user_id = p_user_id
        AND is_dismissed = false
        AND (scheduled_for IS NULL OR scheduled_for <= NOW())
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (NOT p_unread_only OR is_read = false)
        ORDER BY created_at DESC
        LIMIT p_limit OFFSET p_offset
    ) n;

    -- Compter le total
    SELECT COUNT(*) INTO v_total_count
    FROM user_notifications
    WHERE user_id = p_user_id AND is_dismissed = false
    AND (scheduled_for IS NULL OR scheduled_for <= NOW())
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (NOT p_unread_only OR is_read = false);

    RETURN json_build_object(
        'notifications', COALESCE(v_notifications, '[]'::json),
        'unread_count', v_unread_count,
        'total_count', v_total_count
    );
END;
$$;

-- Réclamer les récompenses d'une notification
CREATE OR REPLACE FUNCTION claim_notification_rewards(
    p_user_id UUID,
    p_notification_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification RECORD;
BEGIN
    -- Récupérer la notification
    SELECT * INTO v_notification
    FROM user_notifications
    WHERE id = p_notification_id AND user_id = p_user_id;

    IF v_notification IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Notification not found');
    END IF;

    IF v_notification.rewards_claimed THEN
        RETURN json_build_object('success', false, 'error', 'Rewards already claimed');
    END IF;

    IF v_notification.xp_reward = 0 AND v_notification.coin_reward = 0 THEN
        RETURN json_build_object('success', false, 'error', 'No rewards to claim');
    END IF;

    -- Marquer comme réclamé
    UPDATE user_notifications SET
        rewards_claimed = true,
        is_read = true,
        read_at = COALESCE(read_at, NOW())
    WHERE id = p_notification_id;

    -- Les récompenses XP/coins seront ajoutées via les actions côté serveur

    RETURN json_build_object(
        'success', true,
        'xp', v_notification.xp_reward,
        'coins', v_notification.coin_reward
    );
END;
$$;

-- Grouper les notifications similaires
CREATE OR REPLACE FUNCTION group_similar_notifications(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Pour chaque groupe, garder la plus récente et mettre à jour le count
    WITH grouped AS (
        SELECT
            group_key,
            MAX(id) as keep_id,
            COUNT(*) as total_count
        FROM user_notifications
        WHERE user_id = p_user_id
        AND group_key IS NOT NULL
        AND is_read = false
        AND is_dismissed = false
        GROUP BY group_key
        HAVING COUNT(*) > 1
    )
    UPDATE user_notifications n SET
        group_count = g.total_count
    FROM grouped g
    WHERE n.id = g.keep_id;

    -- Marquer les autres comme dismissed
    WITH grouped AS (
        SELECT
            group_key,
            MAX(id) as keep_id
        FROM user_notifications
        WHERE user_id = p_user_id
        AND group_key IS NOT NULL
        AND is_read = false
        AND is_dismissed = false
        GROUP BY group_key
        HAVING COUNT(*) > 1
    )
    UPDATE user_notifications n SET
        is_dismissed = true,
        dismissed_at = NOW()
    FROM grouped g
    WHERE n.group_key = g.group_key
    AND n.id != g.keep_id
    AND n.user_id = p_user_id
    AND n.is_dismissed = false;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view notification templates"
ON notification_templates FOR SELECT USING (is_active = true);

CREATE POLICY "Users can view their notifications"
ON user_notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications"
ON user_notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their preferences"
ON notification_preferences FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their preferences"
ON notification_preferences FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their preferences"
ON notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their push subscriptions"
ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- INITIAL DATA - Notification Templates
-- ============================================================================

INSERT INTO notification_templates (slug, category, title_template, body_template, icon, emoji, priority, color, animation, xp_reward, sound, action_url) VALUES

-- Achievements
('level_up', 'achievement', 'Niveau {{level}} atteint ! 🎉', 'Félicitations ! Tu as atteint le niveau {{level}}. Continue comme ça !', 'TrendingUp', '🎉', 'high', '#06b6d4', 'confetti', 50, 'achievement', '/profile'),
('badge_earned', 'achievement', 'Nouveau badge débloqué !', 'Tu as obtenu le badge "{{badge_name}}" ! {{badge_description}}', 'Award', '🏆', 'high', '#f59e0b', 'glow', 25, 'achievement', '/profile/badges'),
('streak_milestone', 'achievement', '{{days}} jours de streak ! 🔥', 'Tu es en feu ! Maintiens ta série pour débloquer des récompenses.', 'Flame', '🔥', 'normal', '#ef4444', 'shake', 10, 'success', '/profile'),

-- Social
('friend_request', 'social', 'Nouvelle demande d''ami', '{{username}} veut t''ajouter en ami !', 'UserPlus', '👋', 'normal', '#8b5cf6', 'bounce', 0, 'social', '/friends/requests'),
('friend_accepted', 'social', 'Demande acceptée !', '{{username}} a accepté ta demande d''ami. Vous êtes maintenant connectés !', 'Users', '🤝', 'normal', '#22c55e', NULL, 5, 'success', '/friends'),
('crew_invite', 'social', 'Invitation à rejoindre un crew', '{{inviter}} t''invite à rejoindre le crew "{{crew_name}}" !', 'Users', '👥', 'normal', '#ec4899', 'bounce', 0, 'social', '/crews/invites'),

-- Events
('event_reminder', 'event', 'Événement bientôt !', '{{event_name}} commence dans {{time_until}}. N''oublie pas !', 'Calendar', '📅', 'high', '#f97316', NULL, 0, 'alert', '/events/{{event_id}}'),
('event_live', 'event', 'C''est parti ! 🎉', '{{event_name}} vient de commencer. Rejoins-nous !', 'Zap', '🎊', 'urgent', '#ef4444', 'shake', 0, 'alert', '/events/{{event_id}}'),
('event_checkin_bonus', 'event', 'Bonus de check-in !', 'Tu as gagné {{xp}} XP et {{coins}} coins pour ton check-in !', 'MapPin', '📍', 'normal', '#22c55e', 'confetti', 0, 'success', NULL),

-- Challenges
('challenge_new', 'challenge', 'Nouveau défi disponible !', '{{challenge_name}} - Relève le défi et gagne des récompenses !', 'Target', '🎯', 'normal', '#3b82f6', NULL, 0, 'success', '/challenges'),
('challenge_completed', 'challenge', 'Défi réussi ! 🏆', 'Tu as complété "{{challenge_name}}" et gagné {{xp}} XP !', 'CheckCircle', '✅', 'high', '#22c55e', 'confetti', 0, 'achievement', '/challenges'),
('duel_received', 'challenge', '{{opponent}} te défie !', 'Tu as reçu un défi de {{opponent}}. Acceptes-tu ?', 'Swords', '⚔️', 'high', '#ef4444', 'shake', 0, 'alert', '/challenges/duels'),
('duel_result', 'challenge', 'Résultat du duel', '{{result_message}}', 'Trophy', '🏅', 'normal', '#f59e0b', NULL, 0, 'success', '/challenges/duels'),

-- Rewards
('daily_reward', 'reward', 'Récompense quotidienne !', 'Connecte-toi chaque jour pour des récompenses croissantes !', 'Gift', '🎁', 'normal', '#8b5cf6', 'bounce', 0, 'success', '/rewards'),
('wheel_available', 'reward', 'Roue de la Fortune disponible !', 'Ta rotation quotidienne t''attend. Tente ta chance !', 'Circle', '🎡', 'normal', '#f59e0b', 'bounce', 0, 'success', '/fortune-wheel'),
('shop_item_available', 'reward', 'Nouvel article disponible !', '"{{item_name}}" est maintenant disponible dans la boutique.', 'ShoppingBag', '🛍️', 'low', '#ec4899', NULL, 0, 'success', '/shop'),

-- System
('weekly_recap', 'system', 'Ton récap de la semaine', 'Tu as gagné {{xp}} XP cette semaine. {{message}}', 'BarChart', '📊', 'low', '#6b7280', NULL, 0, NULL, '/stats'),
('inactivity_reminder', 'system', 'Tu nous manques !', 'Ça fait {{days}} jours qu''on ne t''a pas vu. Reviens vite !', 'Heart', '💔', 'normal', '#ef4444', NULL, 10, 'social', '/'),
('new_feature', 'system', 'Nouvelle fonctionnalité !', '{{feature_name}} est maintenant disponible. Découvre-le !', 'Sparkles', '✨', 'normal', '#8b5cf6', 'glow', 0, 'success', '{{feature_url}}')

ON CONFLICT (slug) DO UPDATE SET
    title_template = EXCLUDED.title_template,
    body_template = EXCLUDED.body_template,
    icon = EXCLUDED.icon,
    emoji = EXCLUDED.emoji,
    priority = EXCLUDED.priority,
    color = EXCLUDED.color,
    animation = EXCLUDED.animation,
    xp_reward = EXCLUDED.xp_reward,
    sound = EXCLUDED.sound,
    action_url = EXCLUDED.action_url;

-- ============================================================================
-- NOTIFICATION TRIGGERS
-- ============================================================================

INSERT INTO notification_triggers (slug, name, description, trigger_event, template_id, delay_minutes, cooldown_minutes, use_smart_timing)
SELECT
    'trigger_' || slug,
    'Trigger for ' || slug,
    'Automatic trigger for ' || category || ' notifications',
    slug,
    id,
    0,
    CASE
        WHEN category = 'achievement' THEN 0
        WHEN category = 'social' THEN 5
        WHEN category = 'event' THEN 0
        ELSE 30
    END,
    CASE WHEN category IN ('reward', 'system') THEN true ELSE false END
FROM notification_templates
WHERE category != 'system'
ON CONFLICT (slug) DO NOTHING;

COMMIT;


-- ============================================================================
-- 017_vip_system.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Gamified VIP System
-- ============================================================================
-- Migration: 017_vip_system.sql
-- Description: Système VIP gamifié avec tiers progressifs
-- ============================================================================

-- ============================================================================
-- VIP TIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vip_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Niveau requis
    tier_level INTEGER UNIQUE NOT NULL, -- 0=Standard, 1=Bronze, 2=Silver, 3=Gold, 4=Platinum, 5=Diamond, 6=Legendary
    min_lifetime_xp INTEGER NOT NULL DEFAULT 0,
    min_events_attended INTEGER DEFAULT 0,
    min_months_active INTEGER DEFAULT 0,

    -- Style visuel
    color VARCHAR(20) NOT NULL,
    gradient TEXT,
    badge_url TEXT,
    frame_url TEXT,
    icon VARCHAR(50),
    emoji VARCHAR(10),

    -- Multiplicateurs
    xp_multiplier DECIMAL(3,2) DEFAULT 1.00,
    coin_multiplier DECIMAL(3,2) DEFAULT 1.00,
    drop_rate_bonus DECIMAL(3,2) DEFAULT 0.00, -- % bonus sur les drops

    -- Avantages
    max_daily_wheel_spins INTEGER DEFAULT 1,
    max_daily_packs INTEGER DEFAULT 0,
    priority_queue BOOLEAN DEFAULT false,
    early_access_hours INTEGER DEFAULT 0, -- Heures d'accès anticipé aux événements
    exclusive_events BOOLEAN DEFAULT false,
    custom_frame BOOLEAN DEFAULT false,
    custom_title BOOLEAN DEFAULT false,
    discount_percentage INTEGER DEFAULT 0,
    free_monthly_coins INTEGER DEFAULT 0,
    dedicated_support BOOLEAN DEFAULT false,

    -- Fonctionnalités spéciales
    can_create_crew BOOLEAN DEFAULT false,
    max_crew_size INTEGER DEFAULT 0,
    can_host_private_events BOOLEAN DEFAULT false,
    profile_highlight BOOLEAN DEFAULT false,
    leaderboard_highlight BOOLEAN DEFAULT false,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- VIP PERKS (avantages détaillés)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vip_perks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_id UUID NOT NULL REFERENCES vip_tiers(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    category VARCHAR(50), -- events, rewards, social, shop, customization
    is_highlighted BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tier_id, slug)
);

-- ============================================================================
-- USER VIP STATUS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_vip_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    current_tier_id UUID NOT NULL REFERENCES vip_tiers(id),

    -- Progression
    lifetime_xp INTEGER DEFAULT 0,
    current_period_xp INTEGER DEFAULT 0, -- XP du mois/saison en cours
    events_attended INTEGER DEFAULT 0,
    months_active INTEGER DEFAULT 0,
    first_event_date TIMESTAMPTZ,

    -- Prochain tier
    next_tier_id UUID REFERENCES vip_tiers(id),
    xp_to_next_tier INTEGER DEFAULT 0,
    progress_percentage DECIMAL(5,2) DEFAULT 0,

    -- Historique
    tier_achieved_at TIMESTAMPTZ DEFAULT NOW(),
    highest_tier_achieved_id UUID REFERENCES vip_tiers(id),
    tier_history JSONB DEFAULT '[]', -- [{tier_id, achieved_at, lost_at}]

    -- Récompenses mensuelles
    monthly_coins_claimed BOOLEAN DEFAULT false,
    monthly_coins_claimed_at TIMESTAMPTZ,
    last_month_processed VARCHAR(7), -- YYYY-MM

    -- Stats du tier actuel
    benefits_used_count INTEGER DEFAULT 0,
    total_savings INTEGER DEFAULT 0, -- Économies grâce aux réductions

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_vip_status_tier ON user_vip_status(current_tier_id);
CREATE INDEX IF NOT EXISTS idx_user_vip_status_lifetime_xp ON user_vip_status(lifetime_xp DESC);

-- ============================================================================
-- VIP BENEFITS LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS vip_benefits_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES vip_tiers(id),
    benefit_type VARCHAR(50) NOT NULL, -- xp_bonus, coin_bonus, free_pack, discount, etc.
    benefit_value INTEGER, -- Valeur du bénéfice
    context TEXT, -- Description du contexte
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vip_benefits_log_user ON vip_benefits_log(user_id, created_at DESC);

-- ============================================================================
-- VIP EXCLUSIVE ITEMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vip_exclusive_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    min_tier_id UUID NOT NULL REFERENCES vip_tiers(id),
    item_type VARCHAR(50) NOT NULL, -- frame, title, badge, collectible, shop_item
    item_id UUID NOT NULL, -- ID de l'item dans sa table respective
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Calculer et mettre à jour le tier VIP d'un utilisateur
CREATE OR REPLACE FUNCTION calculate_vip_tier(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status RECORD;
    v_new_tier RECORD;
    v_old_tier_id UUID;
    v_tier_changed BOOLEAN := FALSE;
BEGIN
    -- Récupérer le status actuel
    SELECT * INTO v_status
    FROM user_vip_status
    WHERE user_id = p_user_id;

    -- Si pas de status, créer avec le tier de base
    IF v_status IS NULL THEN
        INSERT INTO user_vip_status (
            user_id,
            current_tier_id,
            lifetime_xp
        )
        SELECT
            p_user_id,
            id,
            COALESCE((SELECT total_xp FROM user_progression WHERE user_id = p_user_id), 0)
        FROM vip_tiers
        WHERE tier_level = 0
        RETURNING * INTO v_status;
    END IF;

    v_old_tier_id := v_status.current_tier_id;

    -- Trouver le tier approprié basé sur l'XP
    SELECT * INTO v_new_tier
    FROM vip_tiers
    WHERE min_lifetime_xp <= v_status.lifetime_xp
    AND is_active = true
    ORDER BY tier_level DESC
    LIMIT 1;

    -- Mettre à jour si le tier a changé
    IF v_new_tier.id != v_old_tier_id THEN
        v_tier_changed := TRUE;

        -- Trouver le prochain tier
        UPDATE user_vip_status SET
            current_tier_id = v_new_tier.id,
            tier_achieved_at = NOW(),
            highest_tier_achieved_id = CASE
                WHEN v_new_tier.tier_level > COALESCE((
                    SELECT tier_level FROM vip_tiers WHERE id = v_status.highest_tier_achieved_id
                ), 0)
                THEN v_new_tier.id
                ELSE v_status.highest_tier_achieved_id
            END,
            tier_history = v_status.tier_history || jsonb_build_object(
                'tier_id', v_new_tier.id,
                'achieved_at', NOW()
            ),
            next_tier_id = (
                SELECT id FROM vip_tiers
                WHERE tier_level = v_new_tier.tier_level + 1
                AND is_active = true
            ),
            xp_to_next_tier = COALESCE((
                SELECT min_lifetime_xp - v_status.lifetime_xp
                FROM vip_tiers
                WHERE tier_level = v_new_tier.tier_level + 1
                AND is_active = true
            ), 0),
            progress_percentage = CASE
                WHEN (
                    SELECT min_lifetime_xp FROM vip_tiers
                    WHERE tier_level = v_new_tier.tier_level + 1
                ) IS NOT NULL
                THEN ROUND(
                    (v_status.lifetime_xp - v_new_tier.min_lifetime_xp)::DECIMAL /
                    ((SELECT min_lifetime_xp FROM vip_tiers WHERE tier_level = v_new_tier.tier_level + 1) - v_new_tier.min_lifetime_xp) * 100,
                    2
                )
                ELSE 100
            END,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSE
        -- Juste mettre à jour la progression
        UPDATE user_vip_status SET
            xp_to_next_tier = COALESCE((
                SELECT min_lifetime_xp - v_status.lifetime_xp
                FROM vip_tiers
                WHERE tier_level = v_new_tier.tier_level + 1
                AND is_active = true
            ), 0),
            progress_percentage = CASE
                WHEN (
                    SELECT min_lifetime_xp FROM vip_tiers
                    WHERE tier_level = v_new_tier.tier_level + 1
                ) IS NOT NULL
                THEN ROUND(
                    (v_status.lifetime_xp - v_new_tier.min_lifetime_xp)::DECIMAL /
                    NULLIF((SELECT min_lifetime_xp FROM vip_tiers WHERE tier_level = v_new_tier.tier_level + 1) - v_new_tier.min_lifetime_xp, 0) * 100,
                    2
                )
                ELSE 100
            END,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'tier_changed', v_tier_changed,
        'old_tier_id', v_old_tier_id,
        'new_tier_id', v_new_tier.id,
        'tier_name', v_new_tier.name,
        'tier_level', v_new_tier.tier_level
    );
END;
$$;

-- Ajouter de l'XP et recalculer le tier
CREATE OR REPLACE FUNCTION add_vip_xp(
    p_user_id UUID,
    p_xp INTEGER,
    p_source VARCHAR(50) DEFAULT 'system'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_multiplier DECIMAL(3,2);
    v_final_xp INTEGER;
    v_result JSON;
BEGIN
    -- Récupérer le multiplicateur du tier actuel
    SELECT COALESCE(vt.xp_multiplier, 1.00) INTO v_multiplier
    FROM user_vip_status uvs
    JOIN vip_tiers vt ON vt.id = uvs.current_tier_id
    WHERE uvs.user_id = p_user_id;

    v_final_xp := ROUND(p_xp * COALESCE(v_multiplier, 1.00));

    -- Mettre à jour l'XP
    UPDATE user_vip_status SET
        lifetime_xp = lifetime_xp + v_final_xp,
        current_period_xp = current_period_xp + v_final_xp,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Logger le bonus si applicable
    IF v_multiplier > 1.00 THEN
        INSERT INTO vip_benefits_log (user_id, tier_id, benefit_type, benefit_value, context)
        SELECT
            p_user_id,
            current_tier_id,
            'xp_bonus',
            v_final_xp - p_xp,
            'XP multiplier from ' || p_source
        FROM user_vip_status WHERE user_id = p_user_id;
    END IF;

    -- Recalculer le tier
    v_result := calculate_vip_tier(p_user_id);

    RETURN json_build_object(
        'success', true,
        'base_xp', p_xp,
        'multiplier', v_multiplier,
        'final_xp', v_final_xp,
        'bonus_xp', v_final_xp - p_xp,
        'tier_result', v_result
    );
END;
$$;

-- Récupérer le statut VIP complet d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_vip_status(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status RECORD;
    v_tier RECORD;
    v_next_tier RECORD;
    v_perks JSON;
BEGIN
    -- Récupérer le status
    SELECT * INTO v_status
    FROM user_vip_status
    WHERE user_id = p_user_id;

    IF v_status IS NULL THEN
        -- Initialiser le status
        PERFORM calculate_vip_tier(p_user_id);
        SELECT * INTO v_status FROM user_vip_status WHERE user_id = p_user_id;
    END IF;

    -- Récupérer le tier actuel
    SELECT * INTO v_tier
    FROM vip_tiers
    WHERE id = v_status.current_tier_id;

    -- Récupérer le prochain tier
    SELECT * INTO v_next_tier
    FROM vip_tiers
    WHERE id = v_status.next_tier_id;

    -- Récupérer les perks
    SELECT json_agg(
        json_build_object(
            'name', name,
            'description', description,
            'icon', icon,
            'category', category,
            'is_highlighted', is_highlighted
        ) ORDER BY sort_order
    ) INTO v_perks
    FROM vip_perks
    WHERE tier_id = v_tier.id;

    RETURN json_build_object(
        'status', row_to_json(v_status),
        'current_tier', row_to_json(v_tier),
        'next_tier', CASE WHEN v_next_tier IS NOT NULL THEN row_to_json(v_next_tier) ELSE NULL END,
        'perks', COALESCE(v_perks, '[]'::json),
        'progress', json_build_object(
            'current_xp', v_status.lifetime_xp,
            'xp_to_next', v_status.xp_to_next_tier,
            'percentage', v_status.progress_percentage,
            'events_attended', v_status.events_attended,
            'months_active', v_status.months_active
        )
    );
END;
$$;

-- Réclamer les coins mensuels
CREATE OR REPLACE FUNCTION claim_monthly_vip_coins(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status RECORD;
    v_tier RECORD;
    v_current_month VARCHAR(7);
BEGIN
    v_current_month := TO_CHAR(NOW(), 'YYYY-MM');

    SELECT * INTO v_status FROM user_vip_status WHERE user_id = p_user_id;

    IF v_status IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'VIP status not found');
    END IF;

    IF v_status.last_month_processed = v_current_month AND v_status.monthly_coins_claimed THEN
        RETURN json_build_object('success', false, 'error', 'Already claimed this month');
    END IF;

    SELECT * INTO v_tier FROM vip_tiers WHERE id = v_status.current_tier_id;

    IF v_tier.free_monthly_coins = 0 THEN
        RETURN json_build_object('success', false, 'error', 'Your tier does not include monthly coins');
    END IF;

    -- Marquer comme réclamé
    UPDATE user_vip_status SET
        monthly_coins_claimed = true,
        monthly_coins_claimed_at = NOW(),
        last_month_processed = v_current_month
    WHERE user_id = p_user_id;

    -- Logger
    INSERT INTO vip_benefits_log (user_id, tier_id, benefit_type, benefit_value, context)
    VALUES (p_user_id, v_tier.id, 'monthly_coins', v_tier.free_monthly_coins, 'Monthly VIP reward');

    RETURN json_build_object(
        'success', true,
        'coins', v_tier.free_monthly_coins
    );
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE vip_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vip_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_benefits_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_exclusive_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view VIP tiers" ON vip_tiers FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view VIP perks" ON vip_perks FOR SELECT USING (true);
CREATE POLICY "Users can view their VIP status" ON user_vip_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their benefits log" ON vip_benefits_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view VIP exclusive items" ON vip_exclusive_items FOR SELECT USING (is_active = true);

-- ============================================================================
-- INITIAL DATA - VIP Tiers
-- ============================================================================

INSERT INTO vip_tiers (slug, name, description, tier_level, min_lifetime_xp, color, gradient, icon, emoji, xp_multiplier, coin_multiplier, drop_rate_bonus, max_daily_wheel_spins, max_daily_packs, early_access_hours, discount_percentage, free_monthly_coins, can_create_crew, max_crew_size, profile_highlight, leaderboard_highlight) VALUES

('standard', 'Standard', 'Membre régulier de la communauté', 0, 0, '#71717a', 'from-zinc-500 to-zinc-600', 'User', '👤', 1.00, 1.00, 0.00, 1, 0, 0, 0, 0, false, 0, false, false),

('bronze', 'Bronze', 'Tu commences à briller !', 1, 1000, '#cd7f32', 'from-amber-600 to-orange-700', 'Award', '🥉', 1.05, 1.05, 0.02, 1, 1, 0, 5, 50, true, 5, false, false),

('silver', 'Argent', 'Un vrai habitué des soirées', 2, 5000, '#c0c0c0', 'from-gray-300 to-gray-500', 'Medal', '🥈', 1.10, 1.10, 0.05, 2, 2, 6, 10, 150, true, 10, false, false),

('gold', 'Or', 'Une légende en devenir', 3, 15000, '#ffd700', 'from-yellow-400 to-amber-500', 'Trophy', '🥇', 1.20, 1.15, 0.10, 3, 3, 12, 15, 300, true, 15, true, false),

('platinum', 'Platine', 'L''élite de la communauté', 4, 35000, '#e5e4e2', 'from-gray-200 to-gray-400', 'Crown', '👑', 1.30, 1.25, 0.15, 5, 5, 24, 20, 500, true, 25, true, true),

('diamond', 'Diamant', 'Rare et précieux', 5, 75000, '#b9f2ff', 'from-cyan-300 to-blue-400', 'Gem', '💎', 1.50, 1.40, 0.20, 7, 7, 48, 25, 1000, true, 50, true, true),

('legendary', 'Légendaire', 'Le sommet de la pyramide', 6, 150000, '#ff6b35', 'from-orange-500 to-red-600', 'Flame', '🔥', 2.00, 1.75, 0.30, 10, 10, 72, 30, 2500, true, 100, true, true)

ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    min_lifetime_xp = EXCLUDED.min_lifetime_xp,
    color = EXCLUDED.color,
    gradient = EXCLUDED.gradient,
    xp_multiplier = EXCLUDED.xp_multiplier,
    coin_multiplier = EXCLUDED.coin_multiplier,
    drop_rate_bonus = EXCLUDED.drop_rate_bonus,
    max_daily_wheel_spins = EXCLUDED.max_daily_wheel_spins,
    max_daily_packs = EXCLUDED.max_daily_packs,
    early_access_hours = EXCLUDED.early_access_hours,
    discount_percentage = EXCLUDED.discount_percentage,
    free_monthly_coins = EXCLUDED.free_monthly_coins;

-- ============================================================================
-- VIP PERKS DATA
-- ============================================================================

-- Bronze perks
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, is_highlighted, sort_order)
SELECT id, 'bronze_xp', 'Bonus XP +5%', 'Gagne 5% d''XP en plus sur toutes tes actions', 'TrendingUp', 'rewards', true, 1 FROM vip_tiers WHERE slug = 'bronze'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'bronze_coins', 'Bonus Coins +5%', 'Gagne 5% de coins en plus', 'Coins', 'rewards', 2 FROM vip_tiers WHERE slug = 'bronze'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'bronze_pack', '1 Pack gratuit/jour', 'Ouvre un pack de cartes gratuit chaque jour', 'Gift', 'rewards', 3 FROM vip_tiers WHERE slug = 'bronze'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'bronze_crew', 'Créer un Crew', 'Crée ton propre groupe d''amis (5 max)', 'Users', 'social', 4 FROM vip_tiers WHERE slug = 'bronze'
ON CONFLICT DO NOTHING;

-- Silver perks
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, is_highlighted, sort_order)
SELECT id, 'silver_xp', 'Bonus XP +10%', 'Gagne 10% d''XP en plus sur toutes tes actions', 'TrendingUp', 'rewards', true, 1 FROM vip_tiers WHERE slug = 'silver'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'silver_wheel', '2 Spins/jour', 'Tourne la roue 2 fois par jour', 'Circle', 'rewards', 2 FROM vip_tiers WHERE slug = 'silver'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'silver_early', 'Accès anticipé 6h', 'Réserve tes places 6h avant tout le monde', 'Clock', 'events', 3 FROM vip_tiers WHERE slug = 'silver'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'silver_discount', '-10% Boutique', 'Réduction sur tous les articles de la boutique', 'Tag', 'shop', 4 FROM vip_tiers WHERE slug = 'silver'
ON CONFLICT DO NOTHING;

-- Gold perks
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, is_highlighted, sort_order)
SELECT id, 'gold_xp', 'Bonus XP +20%', 'Gagne 20% d''XP en plus sur toutes tes actions', 'TrendingUp', 'rewards', true, 1 FROM vip_tiers WHERE slug = 'gold'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'gold_wheel', '3 Spins/jour', 'Tourne la roue 3 fois par jour', 'Circle', 'rewards', 2 FROM vip_tiers WHERE slug = 'gold'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'gold_early', 'Accès anticipé 12h', 'Réserve tes places 12h avant tout le monde', 'Clock', 'events', 3 FROM vip_tiers WHERE slug = 'gold'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'gold_highlight', 'Profil mis en avant', 'Ton profil est mis en évidence dans les recherches', 'Star', 'social', 4 FROM vip_tiers WHERE slug = 'gold'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'gold_monthly', '300 Coins/mois', 'Reçois 300 coins gratuits chaque mois', 'Coins', 'rewards', 5 FROM vip_tiers WHERE slug = 'gold'
ON CONFLICT DO NOTHING;

-- Platinum perks
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, is_highlighted, sort_order)
SELECT id, 'platinum_xp', 'Bonus XP +30%', 'Gagne 30% d''XP en plus sur toutes tes actions', 'TrendingUp', 'rewards', true, 1 FROM vip_tiers WHERE slug = 'platinum'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'platinum_wheel', '5 Spins/jour', 'Tourne la roue 5 fois par jour', 'Circle', 'rewards', 2 FROM vip_tiers WHERE slug = 'platinum'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'platinum_early', 'Accès anticipé 24h', 'Réserve tes places 24h avant tout le monde', 'Clock', 'events', 3 FROM vip_tiers WHERE slug = 'platinum'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'platinum_leaderboard', 'Badge Leaderboard', 'Badge spécial affiché dans les classements', 'Award', 'social', 4 FROM vip_tiers WHERE slug = 'platinum'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'platinum_crew', 'Grand Crew (25)', 'Invite jusqu''à 25 membres dans ton crew', 'Users', 'social', 5 FROM vip_tiers WHERE slug = 'platinum'
ON CONFLICT DO NOTHING;

-- Diamond perks
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, is_highlighted, sort_order)
SELECT id, 'diamond_xp', 'Bonus XP +50%', 'Gagne 50% d''XP en plus sur toutes tes actions', 'TrendingUp', 'rewards', true, 1 FROM vip_tiers WHERE slug = 'diamond'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'diamond_wheel', '7 Spins/jour', 'Tourne la roue 7 fois par jour', 'Circle', 'rewards', 2 FROM vip_tiers WHERE slug = 'diamond'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'diamond_early', 'Accès anticipé 48h', 'Réserve tes places 48h avant tout le monde', 'Clock', 'events', 3 FROM vip_tiers WHERE slug = 'diamond'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'diamond_monthly', '1000 Coins/mois', 'Reçois 1000 coins gratuits chaque mois', 'Coins', 'rewards', 4 FROM vip_tiers WHERE slug = 'diamond'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'diamond_drops', '+20% Drop Rate', '20% de chances en plus d''obtenir des items rares', 'Sparkles', 'rewards', 5 FROM vip_tiers WHERE slug = 'diamond'
ON CONFLICT DO NOTHING;

-- Legendary perks
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, is_highlighted, sort_order)
SELECT id, 'legendary_xp', 'Bonus XP x2', 'Double ton XP sur toutes tes actions !', 'Zap', 'rewards', true, 1 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'legendary_wheel', '10 Spins/jour', 'Tourne la roue 10 fois par jour', 'Circle', 'rewards', 2 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'legendary_early', 'Accès anticipé 72h', 'Réserve tes places 72h avant tout le monde', 'Clock', 'events', 3 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'legendary_monthly', '2500 Coins/mois', 'Reçois 2500 coins gratuits chaque mois', 'Coins', 'rewards', 4 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'legendary_exclusive', 'Événements exclusifs', 'Accès aux événements VIP only', 'Star', 'events', 5 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'legendary_crew', 'Mega Crew (100)', 'Invite jusqu''à 100 membres dans ton crew', 'Users', 'social', 6 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;
INSERT INTO vip_perks (tier_id, slug, name, description, icon, category, sort_order)
SELECT id, 'legendary_support', 'Support dédié', 'Accès à un support prioritaire', 'Headphones', 'support', 7 FROM vip_tiers WHERE slug = 'legendary'
ON CONFLICT DO NOTHING;

COMMIT;


-- ============================================================================
-- 018_activity_feed.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Social Activity Feed
-- ============================================================================
-- Migration: 018_activity_feed.sql
-- Description: Fil d'activité social des amis
-- ============================================================================

-- ============================================================================
-- ACTIVITY TYPES
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    emoji VARCHAR(10),
    color VARCHAR(20),
    category VARCHAR(50) NOT NULL, -- achievement, social, event, game, collection, milestone
    is_public_by_default BOOLEAN DEFAULT true,
    points INTEGER DEFAULT 0, -- Points de visibilité dans le feed
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USER ACTIVITIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type_id UUID NOT NULL REFERENCES activity_types(id),

    -- Contenu
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,

    -- Données additionnelles
    data JSONB DEFAULT '{}', -- Données spécifiques au type d'activité
    target_id UUID, -- ID de l'objet concerné (badge, event, etc.)
    target_type VARCHAR(50), -- Type de l'objet

    -- Interactions
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,

    -- Visibilité
    visibility VARCHAR(20) DEFAULT 'friends', -- public, friends, private
    is_pinned BOOLEAN DEFAULT false,
    is_highlighted BOOLEAN DEFAULT false, -- Pour les achievements importants

    -- Modération
    is_hidden BOOLEAN DEFAULT false,
    hidden_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_visibility ON user_activities(visibility, created_at DESC);

-- ============================================================================
-- ACTIVITY LIKES
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES user_activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) DEFAULT 'like', -- like, love, fire, party, congrats
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(activity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_likes_activity ON activity_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_user ON activity_likes(user_id);

-- ============================================================================
-- ACTIVITY COMMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES user_activities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE, -- Pour les réponses
    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON activity_comments(activity_id, created_at);

-- ============================================================================
-- ACTIVITY FEED PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_feed_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

    -- Qui voir
    show_friends_activities BOOLEAN DEFAULT true,
    show_crew_activities BOOLEAN DEFAULT true,
    show_following_activities BOOLEAN DEFAULT true,

    -- Types à voir
    show_achievements BOOLEAN DEFAULT true,
    show_level_ups BOOLEAN DEFAULT true,
    show_events BOOLEAN DEFAULT true,
    show_games BOOLEAN DEFAULT true,
    show_collections BOOLEAN DEFAULT true,
    show_social BOOLEAN DEFAULT true,

    -- Notifications feed
    notify_likes BOOLEAN DEFAULT true,
    notify_comments BOOLEAN DEFAULT true,
    notify_mentions BOOLEAN DEFAULT true,

    -- Ordre
    feed_order VARCHAR(20) DEFAULT 'recent', -- recent, popular, relevance

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ACTIVITY VISIBILITY SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_visibility_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

    -- Paramètres de publication automatique
    auto_publish_badges BOOLEAN DEFAULT true,
    auto_publish_level_ups BOOLEAN DEFAULT true,
    auto_publish_event_attendance BOOLEAN DEFAULT true,
    auto_publish_challenges BOOLEAN DEFAULT true,
    auto_publish_collections BOOLEAN DEFAULT true,
    auto_publish_crew_joins BOOLEAN DEFAULT false,

    -- Visibilité par défaut
    default_visibility VARCHAR(20) DEFAULT 'friends', -- public, friends, private

    -- Contrôle
    allow_comments BOOLEAN DEFAULT true,
    allow_likes BOOLEAN DEFAULT true,
    allow_shares BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Créer une activité
CREATE OR REPLACE FUNCTION create_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_title TEXT,
    p_description TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}',
    p_target_id UUID DEFAULT NULL,
    p_target_type VARCHAR(50) DEFAULT NULL,
    p_visibility VARCHAR(20) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_type RECORD;
    v_visibility_settings RECORD;
    v_activity_id UUID;
    v_final_visibility VARCHAR(20);
BEGIN
    -- Récupérer le type d'activité
    SELECT * INTO v_type
    FROM activity_types
    WHERE slug = p_activity_type AND is_active = true;

    IF v_type IS NULL THEN
        RETURN NULL;
    END IF;

    -- Récupérer les préférences de visibilité de l'utilisateur
    SELECT * INTO v_visibility_settings
    FROM activity_visibility_settings
    WHERE user_id = p_user_id;

    -- Déterminer la visibilité
    IF p_visibility IS NOT NULL THEN
        v_final_visibility := p_visibility;
    ELSIF v_visibility_settings IS NOT NULL THEN
        v_final_visibility := v_visibility_settings.default_visibility;
    ELSE
        v_final_visibility := CASE WHEN v_type.is_public_by_default THEN 'public' ELSE 'friends' END;
    END IF;

    -- Créer l'activité
    INSERT INTO user_activities (
        user_id, activity_type_id, title, description, image_url,
        data, target_id, target_type, visibility
    )
    VALUES (
        p_user_id, v_type.id, p_title, p_description, p_image_url,
        p_data, p_target_id, p_target_type, v_final_visibility
    )
    RETURNING id INTO v_activity_id;

    RETURN v_activity_id;
END;
$$;

-- Récupérer le feed d'un utilisateur
CREATE OR REPLACE FUNCTION get_activity_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_feed_type VARCHAR(20) DEFAULT 'friends' -- friends, public, personal
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_activities JSON;
    v_prefs RECORD;
BEGIN
    -- Récupérer les préférences
    SELECT * INTO v_prefs
    FROM activity_feed_preferences
    WHERE user_id = p_user_id;

    -- Récupérer les activités selon le type de feed
    IF p_feed_type = 'personal' THEN
        -- Mes propres activités
        SELECT json_agg(activity ORDER BY activity.created_at DESC) INTO v_activities
        FROM (
            SELECT
                ua.id,
                ua.user_id,
                ua.title,
                ua.description,
                ua.image_url,
                ua.data,
                ua.target_id,
                ua.target_type,
                ua.likes_count,
                ua.comments_count,
                ua.shares_count,
                ua.visibility,
                ua.is_pinned,
                ua.is_highlighted,
                ua.created_at,
                at.slug as activity_type,
                at.icon,
                at.emoji,
                at.color,
                at.category,
                EXISTS(SELECT 1 FROM activity_likes WHERE activity_id = ua.id AND user_id = p_user_id) as liked_by_me
            FROM user_activities ua
            JOIN activity_types at ON at.id = ua.activity_type_id
            WHERE ua.user_id = p_user_id
            AND ua.is_hidden = false
            ORDER BY ua.is_pinned DESC, ua.created_at DESC
            LIMIT p_limit OFFSET p_offset
        ) activity;
    ELSIF p_feed_type = 'public' THEN
        -- Activités publiques de tout le monde
        SELECT json_agg(activity ORDER BY activity.created_at DESC) INTO v_activities
        FROM (
            SELECT
                ua.id,
                ua.user_id,
                ua.title,
                ua.description,
                ua.image_url,
                ua.data,
                ua.likes_count,
                ua.comments_count,
                ua.visibility,
                ua.is_highlighted,
                ua.created_at,
                at.slug as activity_type,
                at.icon,
                at.emoji,
                at.color,
                at.category,
                EXISTS(SELECT 1 FROM activity_likes WHERE activity_id = ua.id AND user_id = p_user_id) as liked_by_me
            FROM user_activities ua
            JOIN activity_types at ON at.id = ua.activity_type_id
            WHERE ua.visibility = 'public'
            AND ua.is_hidden = false
            ORDER BY ua.created_at DESC
            LIMIT p_limit OFFSET p_offset
        ) activity;
    ELSE
        -- Activités des amis
        SELECT json_agg(activity ORDER BY activity.created_at DESC) INTO v_activities
        FROM (
            SELECT
                ua.id,
                ua.user_id,
                ua.title,
                ua.description,
                ua.image_url,
                ua.data,
                ua.likes_count,
                ua.comments_count,
                ua.visibility,
                ua.is_highlighted,
                ua.created_at,
                at.slug as activity_type,
                at.icon,
                at.emoji,
                at.color,
                at.category,
                EXISTS(SELECT 1 FROM activity_likes WHERE activity_id = ua.id AND user_id = p_user_id) as liked_by_me
            FROM user_activities ua
            JOIN activity_types at ON at.id = ua.activity_type_id
            WHERE (
                -- Mes propres activités
                ua.user_id = p_user_id
                OR
                -- Activités des amis (visibilité friends ou public)
                (
                    ua.user_id IN (
                        SELECT t.id FROM friend_connections fc
                        JOIN teens t ON t.id = fc.friend_teen_id
                        WHERE fc.teen_id = (SELECT id FROM teens WHERE parent_id = p_user_id LIMIT 1) AND fc.status = 'accepted'
                        UNION
                        SELECT t.id FROM friend_connections fc
                        JOIN teens t ON t.id = fc.teen_id
                        WHERE fc.friend_teen_id = (SELECT id FROM teens WHERE parent_id = p_user_id LIMIT 1) AND fc.status = 'accepted'
                    )
                    AND ua.visibility IN ('public', 'friends')
                )
            )
            AND ua.is_hidden = false
            -- Filtrer par catégories selon les préférences
            AND (
                v_prefs IS NULL
                OR (at.category = 'achievement' AND COALESCE(v_prefs.show_achievements, true))
                OR (at.category = 'social' AND COALESCE(v_prefs.show_social, true))
                OR (at.category = 'event' AND COALESCE(v_prefs.show_events, true))
                OR (at.category = 'game' AND COALESCE(v_prefs.show_games, true))
                OR (at.category = 'collection' AND COALESCE(v_prefs.show_collections, true))
                OR (at.category = 'milestone' AND COALESCE(v_prefs.show_level_ups, true))
            )
            ORDER BY ua.created_at DESC
            LIMIT p_limit OFFSET p_offset
        ) activity;
    END IF;

    RETURN json_build_object(
        'activities', COALESCE(v_activities, '[]'::json),
        'has_more', (SELECT COUNT(*) > p_limit + p_offset FROM user_activities WHERE user_id = p_user_id)
    );
END;
$$;

-- Liker/Unliker une activité
CREATE OR REPLACE FUNCTION toggle_activity_like(
    p_user_id UUID,
    p_activity_id UUID,
    p_reaction_type VARCHAR(20) DEFAULT 'like'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing RECORD;
    v_new_count INTEGER;
BEGIN
    -- Vérifier si déjà liké
    SELECT * INTO v_existing
    FROM activity_likes
    WHERE activity_id = p_activity_id AND user_id = p_user_id;

    IF v_existing IS NOT NULL THEN
        -- Unlike
        DELETE FROM activity_likes WHERE id = v_existing.id;
        UPDATE user_activities SET likes_count = GREATEST(0, likes_count - 1) WHERE id = p_activity_id
        RETURNING likes_count INTO v_new_count;
        RETURN json_build_object('liked', false, 'count', v_new_count);
    ELSE
        -- Like
        INSERT INTO activity_likes (activity_id, user_id, reaction_type)
        VALUES (p_activity_id, p_user_id, p_reaction_type);
        UPDATE user_activities SET likes_count = likes_count + 1 WHERE id = p_activity_id
        RETURNING likes_count INTO v_new_count;
        RETURN json_build_object('liked', true, 'count', v_new_count);
    END IF;
END;
$$;

-- Ajouter un commentaire
CREATE OR REPLACE FUNCTION add_activity_comment(
    p_user_id UUID,
    p_activity_id UUID,
    p_content TEXT,
    p_parent_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_comment_id UUID;
    v_new_count INTEGER;
BEGIN
    INSERT INTO activity_comments (activity_id, user_id, content, parent_id)
    VALUES (p_activity_id, p_user_id, p_content, p_parent_id)
    RETURNING id INTO v_comment_id;

    UPDATE user_activities SET comments_count = comments_count + 1 WHERE id = p_activity_id
    RETURNING comments_count INTO v_new_count;

    RETURN json_build_object(
        'comment_id', v_comment_id,
        'count', v_new_count
    );
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE activity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_visibility_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone can view activity types" ON activity_types;
CREATE POLICY "Anyone can view activity types" ON activity_types FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can view visible activities" ON user_activities;
CREATE POLICY "Users can view visible activities" ON user_activities FOR SELECT USING (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (
        visibility = 'friends'
        AND user_id IN (
            SELECT t2.parent_id FROM friend_connections fc
            JOIN teens t1 ON t1.id = fc.friend_teen_id
            JOIN teens t2 ON t2.id = fc.teen_id
            WHERE t1.parent_id = auth.uid() AND fc.status = 'accepted'
            UNION
            SELECT t2.parent_id FROM friend_connections fc
            JOIN teens t1 ON t1.id = fc.teen_id
            JOIN teens t2 ON t2.id = fc.friend_teen_id
            WHERE t1.parent_id = auth.uid() AND fc.status = 'accepted'
        )
    )
);

DROP POLICY IF EXISTS "Users can manage their activities" ON user_activities;
CREATE POLICY "Users can manage their activities" ON user_activities
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their likes" ON activity_likes;
CREATE POLICY "Users can manage their likes" ON activity_likes
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view comments on visible activities" ON activity_comments;
CREATE POLICY "Users can view comments on visible activities" ON activity_comments
FOR SELECT USING (
    activity_id IN (
        SELECT id FROM user_activities WHERE
            visibility = 'public'
            OR user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can manage their comments" ON activity_comments;
CREATE POLICY "Users can manage their comments" ON activity_comments
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their feed preferences" ON activity_feed_preferences;
CREATE POLICY "Users can manage their feed preferences" ON activity_feed_preferences
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their visibility settings" ON activity_visibility_settings;
CREATE POLICY "Users can manage their visibility settings" ON activity_visibility_settings
FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- INITIAL DATA - Activity Types
-- ============================================================================

INSERT INTO activity_types (slug, name, description, icon, emoji, color, category, is_public_by_default, points) VALUES

-- Achievements
('badge_earned', 'Badge obtenu', 'A débloqué un nouveau badge', 'Award', '🏆', '#f59e0b', 'achievement', true, 10),
('level_up', 'Level up', 'A atteint un nouveau niveau', 'TrendingUp', '⬆️', '#06b6d4', 'milestone', true, 8),
('milestone_reached', 'Milestone atteint', 'A atteint un objectif important', 'Target', '🎯', '#8b5cf6', 'milestone', true, 10),
('streak_achieved', 'Streak atteint', 'A maintenu une série', 'Flame', '🔥', '#ef4444', 'achievement', true, 5),
('vip_tier_up', 'Tier VIP augmenté', 'A atteint un nouveau tier VIP', 'Crown', '👑', '#ffd700', 'milestone', true, 15),

-- Social
('friend_added', 'Nouvel ami', 'Est devenu ami avec quelqu''un', 'UserPlus', '👋', '#22c55e', 'social', false, 3),
('crew_joined', 'Crew rejoint', 'A rejoint un crew', 'Users', '👥', '#3b82f6', 'social', true, 5),
('crew_created', 'Crew créé', 'A créé un nouveau crew', 'Users', '🎉', '#ec4899', 'social', true, 8),

-- Events
('event_attended', 'Événement assisté', 'A assisté à un événement', 'Calendar', '📅', '#f97316', 'event', true, 10),
('event_checkin', 'Check-in événement', 'A fait un check-in à un événement', 'MapPin', '📍', '#22c55e', 'event', true, 5),
('event_review', 'Avis événement', 'A laissé un avis sur un événement', 'Star', '⭐', '#f59e0b', 'event', true, 7),

-- Games
('game_won', 'Partie gagnée', 'A gagné une partie', 'Trophy', '🏅', '#ffd700', 'game', true, 8),
('game_high_score', 'Nouveau record', 'A établi un nouveau record', 'Zap', '⚡', '#8b5cf6', 'game', true, 10),
('duel_won', 'Duel gagné', 'A remporté un duel', 'Swords', '⚔️', '#ef4444', 'game', true, 8),
('challenge_completed', 'Défi complété', 'A terminé un défi', 'CheckCircle', '✅', '#22c55e', 'game', true, 7),

-- Collections
('rare_item_collected', 'Item rare obtenu', 'A obtenu un item rare', 'Gem', '💎', '#06b6d4', 'collection', true, 10),
('collection_completed', 'Collection complétée', 'A complété une collection', 'Layers', '🃏', '#8b5cf6', 'collection', true, 15),
('pack_opened', 'Pack ouvert', 'A ouvert un pack de cartes', 'Package', '📦', '#f59e0b', 'collection', false, 2),

-- Misc
('profile_updated', 'Profil mis à jour', 'A personnalisé son profil', 'User', '✨', '#ec4899', 'social', false, 2),
('first_login', 'Première connexion', 'A rejoint la communauté', 'Sparkles', '🌟', '#06b6d4', 'milestone', true, 5)

ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    emoji = EXCLUDED.emoji,
    color = EXCLUDED.color,
    category = EXCLUDED.category;

COMMIT;


-- ============================================================================
-- 019_social_sharing.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Social Sharing System
-- ============================================================================
-- Migration: 019_social_sharing.sql
-- Description: Système de partage sur réseaux sociaux
-- ============================================================================

-- ============================================================================
-- CLEANUP - Supprimer les anciennes tables si elles existent avec mauvaise structure
-- ============================================================================

-- Supprimer les index d'abord
DROP INDEX IF EXISTS idx_user_shares_user;
DROP INDEX IF EXISTS idx_user_shares_platform;
DROP INDEX IF EXISTS idx_user_shares_code;
DROP INDEX IF EXISTS idx_user_sharing_achievements_user;
DROP INDEX IF EXISTS idx_referral_codes_code;
DROP INDEX IF EXISTS idx_referral_uses_code;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS create_share(UUID, VARCHAR, VARCHAR, UUID, VARCHAR, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS check_sharing_achievements(UUID) CASCADE;
DROP FUNCTION IF EXISTS track_share_click(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_or_create_referral_code(UUID) CASCADE;
DROP FUNCTION IF EXISTS use_referral_code(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS complete_referral(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_sharing_updated_at() CASCADE;

-- Supprimer les tables dans le bon ordre (dépendances)
DROP TABLE IF EXISTS referral_uses CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;
DROP TABLE IF EXISTS user_sharing_stats CASCADE;
DROP TABLE IF EXISTS user_sharing_achievements CASCADE;
DROP TABLE IF EXISTS sharing_achievements CASCADE;
DROP TABLE IF EXISTS user_shares CASCADE;
DROP TABLE IF EXISTS share_image_templates CASCADE;
DROP TABLE IF EXISTS share_templates CASCADE;
DROP TABLE IF EXISTS sharing_platforms CASCADE;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Table des plateformes de partage
CREATE TABLE IF NOT EXISTS sharing_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(50),
    base_share_url TEXT,
    url_params JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des templates de partage
CREATE TABLE IF NOT EXISTS share_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL, -- 'badge', 'level_up', 'event', 'achievement', 'challenge', 'stats'

    -- Templates par plateforme
    title_template TEXT NOT NULL,
    description_template TEXT,
    hashtags TEXT[], -- Hashtags par défaut

    -- Image/Media
    default_image_url TEXT,
    generate_image BOOLEAN DEFAULT false,
    image_template_id UUID,

    -- Récompenses
    xp_reward INTEGER DEFAULT 0,
    coins_reward INTEGER DEFAULT 0,
    first_share_bonus INTEGER DEFAULT 0, -- Bonus pour premier partage

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des partages effectués
CREATE TABLE IF NOT EXISTS user_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES share_templates(id),
    platform_id UUID NOT NULL REFERENCES sharing_platforms(id),

    -- Contenu partagé
    content_type VARCHAR(50) NOT NULL,
    content_id UUID, -- ID de l'élément partagé (badge, event, etc.)
    shared_title TEXT NOT NULL,
    shared_description TEXT,
    shared_url TEXT,
    shared_image_url TEXT,

    -- Tracking
    share_code VARCHAR(50) UNIQUE, -- Code unique pour tracking
    click_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0, -- Inscriptions via ce partage

    -- Récompenses
    xp_earned INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    rewards_claimed BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des templates d'images générées
CREATE TABLE IF NOT EXISTS share_image_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,

    -- Dimensions
    width INTEGER DEFAULT 1200,
    height INTEGER DEFAULT 630,

    -- Style
    background_type VARCHAR(50) DEFAULT 'gradient', -- 'gradient', 'image', 'solid'
    background_value TEXT, -- Gradient CSS ou URL ou couleur

    -- Layout JSON
    layout JSONB NOT NULL DEFAULT '{}',
    -- Ex: {"elements": [{"type": "text", "x": 50, "y": 50, "template": "{{username}}"}]}

    -- Fonts
    fonts JSONB DEFAULT '[]',

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des achievements de partage
CREATE TABLE IF NOT EXISTS sharing_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(50),

    -- Conditions
    condition_type VARCHAR(50) NOT NULL, -- 'total_shares', 'platform_shares', 'viral', 'first_share'
    condition_value INTEGER DEFAULT 1,
    condition_platform_id UUID REFERENCES sharing_platforms(id),

    -- Récompenses
    xp_reward INTEGER DEFAULT 0,
    coins_reward INTEGER DEFAULT 0,
    badge_id UUID,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des achievements débloqués
CREATE TABLE IF NOT EXISTS user_sharing_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES sharing_achievements(id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, achievement_id)
);

-- Table des statistiques de partage
CREATE TABLE IF NOT EXISTS user_sharing_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Compteurs globaux
    total_shares INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,

    -- Par plateforme (JSONB)
    shares_by_platform JSONB DEFAULT '{}',

    -- Par type de contenu
    shares_by_type JSONB DEFAULT '{}',

    -- Streaks
    current_share_streak INTEGER DEFAULT 0,
    longest_share_streak INTEGER DEFAULT 0,
    last_share_date DATE,

    -- Récompenses totales
    total_xp_earned INTEGER DEFAULT 0,
    total_coins_earned INTEGER DEFAULT 0,

    -- Timestamps
    first_share_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des referrals (invitations)
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,

    -- Récompenses configurées
    referrer_xp_reward INTEGER DEFAULT 100,
    referrer_coins_reward INTEGER DEFAULT 50,
    referee_xp_reward INTEGER DEFAULT 50,
    referee_coins_reward INTEGER DEFAULT 25,

    -- Stats
    total_uses INTEGER DEFAULT 0,
    successful_conversions INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des utilisations de referral
CREATE TABLE IF NOT EXISTS referral_uses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
    referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'rewarded'

    -- Récompenses
    referrer_rewarded BOOLEAN DEFAULT false,
    referee_rewarded BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    UNIQUE(referred_user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_shares_user ON user_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shares_platform ON user_shares(platform_id);
CREATE INDEX IF NOT EXISTS idx_user_shares_code ON user_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_user_sharing_achievements_user ON user_sharing_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_uses_code ON referral_uses(referral_code_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour créer un partage
CREATE OR REPLACE FUNCTION create_share(
    p_user_id UUID,
    p_platform_slug VARCHAR(50),
    p_content_type VARCHAR(50),
    p_content_id UUID DEFAULT NULL,
    p_template_slug VARCHAR(100) DEFAULT NULL,
    p_title TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_platform sharing_platforms%ROWTYPE;
    v_template share_templates%ROWTYPE;
    v_share_code VARCHAR(50);
    v_share_id UUID;
    v_xp_reward INTEGER := 0;
    v_coins_reward INTEGER := 0;
    v_is_first_share BOOLEAN := false;
    v_stats user_sharing_stats%ROWTYPE;
BEGIN
    -- Récupérer la plateforme
    SELECT * INTO v_platform
    FROM sharing_platforms
    WHERE slug = p_platform_slug AND is_active = true;

    IF v_platform.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Plateforme non trouvée');
    END IF;

    -- Récupérer le template si spécifié
    IF p_template_slug IS NOT NULL THEN
        SELECT * INTO v_template
        FROM share_templates
        WHERE slug = p_template_slug AND is_active = true;
    END IF;

    -- Générer un code de partage unique
    v_share_code := 'TPM' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

    -- Vérifier si c'est le premier partage
    SELECT * INTO v_stats FROM user_sharing_stats WHERE user_id = p_user_id;
    v_is_first_share := (v_stats.total_shares IS NULL OR v_stats.total_shares = 0);

    -- Calculer les récompenses
    IF v_template.id IS NOT NULL THEN
        v_xp_reward := v_template.xp_reward;
        v_coins_reward := v_template.coins_reward;

        IF v_is_first_share THEN
            v_xp_reward := v_xp_reward + COALESCE(v_template.first_share_bonus, 0);
        END IF;
    ELSE
        -- Récompenses par défaut
        v_xp_reward := 10;
        v_coins_reward := 5;

        IF v_is_first_share THEN
            v_xp_reward := v_xp_reward + 25;
            v_coins_reward := v_coins_reward + 10;
        END IF;
    END IF;

    -- Créer le partage
    INSERT INTO user_shares (
        user_id,
        template_id,
        platform_id,
        content_type,
        content_id,
        shared_title,
        shared_description,
        shared_image_url,
        share_code,
        xp_earned,
        coins_earned
    ) VALUES (
        p_user_id,
        v_template.id,
        v_platform.id,
        p_content_type,
        p_content_id,
        COALESCE(p_title, v_template.title_template, 'Partage Teens Party Morocco'),
        COALESCE(p_description, v_template.description_template),
        COALESCE(p_image_url, v_template.default_image_url),
        v_share_code,
        v_xp_reward,
        v_coins_reward
    )
    RETURNING id INTO v_share_id;

    -- Mettre à jour les stats
    INSERT INTO user_sharing_stats (user_id, total_shares, first_share_at)
    VALUES (p_user_id, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        total_shares = user_sharing_stats.total_shares + 1,
        shares_by_platform = jsonb_set(
            COALESCE(user_sharing_stats.shares_by_platform, '{}'),
            ARRAY[v_platform.slug],
            to_jsonb(COALESCE((user_sharing_stats.shares_by_platform->>v_platform.slug)::INTEGER, 0) + 1)
        ),
        shares_by_type = jsonb_set(
            COALESCE(user_sharing_stats.shares_by_type, '{}'),
            ARRAY[p_content_type],
            to_jsonb(COALESCE((user_sharing_stats.shares_by_type->>p_content_type)::INTEGER, 0) + 1)
        ),
        current_share_streak = CASE
            WHEN user_sharing_stats.last_share_date = CURRENT_DATE - INTERVAL '1 day'
            THEN user_sharing_stats.current_share_streak + 1
            WHEN user_sharing_stats.last_share_date = CURRENT_DATE
            THEN user_sharing_stats.current_share_streak
            ELSE 1
        END,
        longest_share_streak = GREATEST(
            user_sharing_stats.longest_share_streak,
            CASE
                WHEN user_sharing_stats.last_share_date = CURRENT_DATE - INTERVAL '1 day'
                THEN user_sharing_stats.current_share_streak + 1
                ELSE user_sharing_stats.current_share_streak
            END
        ),
        last_share_date = CURRENT_DATE,
        total_xp_earned = user_sharing_stats.total_xp_earned + v_xp_reward,
        total_coins_earned = user_sharing_stats.total_coins_earned + v_coins_reward,
        first_share_at = COALESCE(user_sharing_stats.first_share_at, NOW()),
        updated_at = NOW();

    -- Vérifier les achievements
    PERFORM check_sharing_achievements(p_user_id);

    RETURN jsonb_build_object(
        'success', true,
        'share_id', v_share_id,
        'share_code', v_share_code,
        'xp_earned', v_xp_reward,
        'coins_earned', v_coins_reward,
        'is_first_share', v_is_first_share,
        'platform', v_platform.slug
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier les achievements de partage
CREATE OR REPLACE FUNCTION check_sharing_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_achievement sharing_achievements%ROWTYPE;
    v_stats user_sharing_stats%ROWTYPE;
    v_platform_shares INTEGER;
BEGIN
    -- Récupérer les stats
    SELECT * INTO v_stats FROM user_sharing_stats WHERE user_id = p_user_id;

    -- Parcourir les achievements non débloqués
    FOR v_achievement IN
        SELECT sa.*
        FROM sharing_achievements sa
        WHERE sa.is_active = true
        AND NOT EXISTS (
            SELECT 1 FROM user_sharing_achievements usa
            WHERE usa.user_id = p_user_id AND usa.achievement_id = sa.id
        )
    LOOP
        -- Vérifier la condition
        CASE v_achievement.condition_type
            WHEN 'total_shares' THEN
                IF v_stats.total_shares >= v_achievement.condition_value THEN
                    INSERT INTO user_sharing_achievements (user_id, achievement_id)
                    VALUES (p_user_id, v_achievement.id);
                END IF;

            WHEN 'platform_shares' THEN
                IF v_achievement.condition_platform_id IS NOT NULL THEN
                    SELECT (v_stats.shares_by_platform->>sp.slug)::INTEGER
                    INTO v_platform_shares
                    FROM sharing_platforms sp
                    WHERE sp.id = v_achievement.condition_platform_id;

                    IF COALESCE(v_platform_shares, 0) >= v_achievement.condition_value THEN
                        INSERT INTO user_sharing_achievements (user_id, achievement_id)
                        VALUES (p_user_id, v_achievement.id);
                    END IF;
                END IF;

            WHEN 'first_share' THEN
                IF v_stats.total_shares >= 1 THEN
                    INSERT INTO user_sharing_achievements (user_id, achievement_id)
                    VALUES (p_user_id, v_achievement.id);
                END IF;

            WHEN 'viral' THEN
                IF v_stats.total_conversions >= v_achievement.condition_value THEN
                    INSERT INTO user_sharing_achievements (user_id, achievement_id)
                    VALUES (p_user_id, v_achievement.id);
                END IF;
        END CASE;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour tracker un clic sur un partage
CREATE OR REPLACE FUNCTION track_share_click(p_share_code VARCHAR(50))
RETURNS JSONB AS $$
DECLARE
    v_share user_shares%ROWTYPE;
BEGIN
    -- Trouver le partage
    SELECT * INTO v_share FROM user_shares WHERE share_code = p_share_code;

    IF v_share.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Partage non trouvé');
    END IF;

    -- Incrémenter le compteur de clics
    UPDATE user_shares
    SET click_count = click_count + 1
    WHERE id = v_share.id;

    -- Mettre à jour les stats utilisateur
    UPDATE user_sharing_stats
    SET total_clicks = total_clicks + 1,
        updated_at = NOW()
    WHERE user_id = v_share.user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_share.user_id,
        'content_type', v_share.content_type,
        'content_id', v_share.content_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour générer/récupérer le code referral d'un utilisateur
CREATE OR REPLACE FUNCTION get_or_create_referral_code(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_referral referral_codes%ROWTYPE;
    v_code VARCHAR(20);
BEGIN
    -- Chercher le code existant
    SELECT * INTO v_referral FROM referral_codes WHERE user_id = p_user_id;

    IF v_referral.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'code', v_referral.code,
            'total_uses', v_referral.total_uses,
            'successful_conversions', v_referral.successful_conversions
        );
    END IF;

    -- Générer un nouveau code
    v_code := 'TPM' || UPPER(SUBSTRING(MD5(p_user_id::TEXT || NOW()::TEXT) FROM 1 FOR 6));

    INSERT INTO referral_codes (user_id, code)
    VALUES (p_user_id, v_code)
    RETURNING * INTO v_referral;

    RETURN jsonb_build_object(
        'success', true,
        'code', v_referral.code,
        'total_uses', 0,
        'successful_conversions', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour utiliser un code referral
CREATE OR REPLACE FUNCTION use_referral_code(
    p_user_id UUID,
    p_code VARCHAR(20)
)
RETURNS JSONB AS $$
DECLARE
    v_referral referral_codes%ROWTYPE;
BEGIN
    -- Vérifier que l'utilisateur n'a pas déjà utilisé un code
    IF EXISTS (SELECT 1 FROM referral_uses WHERE referred_user_id = p_user_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Vous avez déjà utilisé un code de parrainage');
    END IF;

    -- Trouver le code
    SELECT * INTO v_referral
    FROM referral_codes
    WHERE code = UPPER(p_code) AND is_active = true;

    IF v_referral.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Code invalide');
    END IF;

    -- Vérifier que ce n'est pas son propre code
    IF v_referral.user_id = p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Vous ne pouvez pas utiliser votre propre code');
    END IF;

    -- Enregistrer l'utilisation
    INSERT INTO referral_uses (referral_code_id, referred_user_id, status)
    VALUES (v_referral.id, p_user_id, 'pending');

    -- Incrémenter le compteur
    UPDATE referral_codes
    SET total_uses = total_uses + 1
    WHERE id = v_referral.id;

    RETURN jsonb_build_object(
        'success', true,
        'referrer_id', v_referral.user_id,
        'referee_xp_reward', v_referral.referee_xp_reward,
        'referee_coins_reward', v_referral.referee_coins_reward
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour compléter un referral (après conditions remplies)
CREATE OR REPLACE FUNCTION complete_referral(p_referred_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_use referral_uses%ROWTYPE;
    v_referral referral_codes%ROWTYPE;
BEGIN
    -- Trouver l'utilisation
    SELECT ru.*, rc.*
    INTO v_use
    FROM referral_uses ru
    JOIN referral_codes rc ON ru.referral_code_id = rc.id
    WHERE ru.referred_user_id = p_referred_user_id
    AND ru.status = 'pending';

    IF v_use.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Referral non trouvé');
    END IF;

    -- Récupérer les infos du code
    SELECT * INTO v_referral FROM referral_codes WHERE id = v_use.referral_code_id;

    -- Mettre à jour le statut
    UPDATE referral_uses
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = v_use.id;

    -- Incrémenter les conversions réussies
    UPDATE referral_codes
    SET successful_conversions = successful_conversions + 1
    WHERE id = v_referral.id;

    -- Mettre à jour les stats du parrain
    UPDATE user_sharing_stats
    SET total_conversions = total_conversions + 1,
        updated_at = NOW()
    WHERE user_id = v_referral.user_id;

    RETURN jsonb_build_object(
        'success', true,
        'referrer_id', v_referral.user_id,
        'referrer_xp_reward', v_referral.referrer_xp_reward,
        'referrer_coins_reward', v_referral.referrer_coins_reward,
        'referee_xp_reward', v_referral.referee_xp_reward,
        'referee_coins_reward', v_referral.referee_coins_reward
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE sharing_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_image_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sharing_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sharing_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;

-- Plateformes: lecture publique
CREATE POLICY "Platforms are viewable by all" ON sharing_platforms
    FOR SELECT USING (is_active = true);

-- Templates: lecture publique
CREATE POLICY "Templates are viewable by all" ON share_templates
    FOR SELECT USING (is_active = true);

-- Image templates: lecture publique
CREATE POLICY "Image templates are viewable by all" ON share_image_templates
    FOR SELECT USING (is_active = true);

-- Achievements: lecture publique
CREATE POLICY "Sharing achievements are viewable by all" ON sharing_achievements
    FOR SELECT USING (is_active = true);

-- User shares: utilisateur voit les siens
CREATE POLICY "Users can view own shares" ON user_shares
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shares" ON user_shares
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User achievements: utilisateur voit les siens
CREATE POLICY "Users can view own sharing achievements" ON user_sharing_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- User stats: utilisateur voit les siennes
CREATE POLICY "Users can view own sharing stats" ON user_sharing_stats
    FOR SELECT USING (auth.uid() = user_id);

-- Referral codes: utilisateur voit le sien
CREATE POLICY "Users can view own referral code" ON referral_codes
    FOR SELECT USING (auth.uid() = user_id);

-- Referral uses: utilisateur voit les siennes
CREATE POLICY "Users can view own referral uses" ON referral_uses
    FOR SELECT USING (auth.uid() = referred_user_id);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Plateformes de partage
INSERT INTO sharing_platforms (slug, name, icon, color, base_share_url, url_params, sort_order) VALUES
    ('instagram', 'Instagram', 'Instagram', '#E4405F', NULL, '{}', 1),
    ('tiktok', 'TikTok', 'Music2', '#000000', NULL, '{}', 2),
    ('snapchat', 'Snapchat', 'Ghost', '#FFFC00', NULL, '{}', 3),
    ('whatsapp', 'WhatsApp', 'MessageCircle', '#25D366', 'https://wa.me/?text=', '{"encode": true}', 4),
    ('facebook', 'Facebook', 'Facebook', '#1877F2', 'https://www.facebook.com/sharer/sharer.php?u=', '{}', 5),
    ('twitter', 'X (Twitter)', 'Twitter', '#1DA1F2', 'https://twitter.com/intent/tweet?text=', '{"encode": true}', 6),
    ('copy_link', 'Copier le lien', 'Link', '#6366F1', NULL, '{}', 7)
ON CONFLICT (slug) DO NOTHING;

-- Templates de partage
INSERT INTO share_templates (slug, name, description, content_type, title_template, description_template, hashtags, xp_reward, coins_reward, first_share_bonus) VALUES
    ('badge_earned', 'Badge débloqué', 'Partager un badge gagné', 'badge',
     'Je viens de débloquer le badge {{badge_name}} sur Teens Party Morocco !',
     '{{badge_description}}',
     ARRAY['TeensPartyMorocco', 'TPM', 'Badge', 'Achievement'],
     15, 10, 25),

    ('level_up', 'Montée de niveau', 'Partager une montée de niveau', 'level_up',
     'Je viens d''atteindre le niveau {{level}} sur Teens Party Morocco !',
     'Rejoins-moi pour vivre des soirées incroyables !',
     ARRAY['TeensPartyMorocco', 'TPM', 'LevelUp'],
     15, 10, 25),

    ('event_attended', 'Événement', 'Partager une participation à un événement', 'event',
     'J''étais à {{event_name}} avec Teens Party Morocco !',
     '{{event_description}}',
     ARRAY['TeensPartyMorocco', 'TPM', 'Party', 'Event'],
     20, 15, 30),

    ('challenge_completed', 'Défi terminé', 'Partager un défi complété', 'challenge',
     'J''ai relevé le défi {{challenge_name}} sur Teens Party Morocco !',
     NULL,
     ARRAY['TeensPartyMorocco', 'TPM', 'Challenge'],
     15, 10, 25),

    ('vip_tier_up', 'Nouveau statut VIP', 'Partager un nouveau tier VIP', 'vip',
     'Je suis maintenant {{tier_name}} sur Teens Party Morocco !',
     'Les avantages VIP sont incroyables !',
     ARRAY['TeensPartyMorocco', 'TPM', 'VIP'],
     25, 20, 50),

    ('stats_wrapped', 'Statistiques annuelles', 'Partager son wrapped annuel', 'stats',
     'Mon année 2024 sur Teens Party Morocco : {{events_count}} événements, {{xp_total}} XP !',
     'Et toi, c''était comment ton année ?',
     ARRAY['TeensPartyMorocco', 'TPM', 'Wrapped', 'YearInReview'],
     30, 25, 50),

    ('invite_friend', 'Inviter un ami', 'Inviter quelqu''un à rejoindre', 'referral',
     'Rejoins-moi sur Teens Party Morocco avec mon code {{referral_code}} !',
     'La meilleure app pour les soirées au Maroc !',
     ARRAY['TeensPartyMorocco', 'TPM', 'Join'],
     10, 5, 20),

    ('collection_completed', 'Collection complétée', 'Partager une collection terminée', 'collection',
     'J''ai complété la collection {{collection_name}} sur Teens Party Morocco !',
     NULL,
     ARRAY['TeensPartyMorocco', 'TPM', 'Collection', 'Complete'],
     20, 15, 30)
ON CONFLICT (slug) DO NOTHING;

-- Achievements de partage
INSERT INTO sharing_achievements (slug, name, description, icon, condition_type, condition_value, xp_reward, coins_reward) VALUES
    ('first_share', 'Premier partage', 'Faire votre premier partage', 'Share2', 'first_share', 1, 50, 25),
    ('social_butterfly', 'Papillon social', 'Partager 10 fois', 'Share2', 'total_shares', 10, 100, 50),
    ('influencer', 'Influenceur', 'Partager 50 fois', 'Megaphone', 'total_shares', 50, 250, 100),
    ('viral_star', 'Star virale', 'Avoir 5 conversions via vos partages', 'Star', 'viral', 5, 300, 150),
    ('super_viral', 'Super viral', 'Avoir 25 conversions via vos partages', 'Sparkles', 'viral', 25, 500, 250)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_sharing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_share_templates_updated_at ON share_templates;
CREATE TRIGGER update_share_templates_updated_at
    BEFORE UPDATE ON share_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_sharing_updated_at();

DROP TRIGGER IF EXISTS update_share_image_templates_updated_at ON share_image_templates;
CREATE TRIGGER update_share_image_templates_updated_at
    BEFORE UPDATE ON share_image_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_sharing_updated_at();

DROP TRIGGER IF EXISTS update_user_sharing_stats_updated_at ON user_sharing_stats;
CREATE TRIGGER update_user_sharing_stats_updated_at
    BEFORE UPDATE ON user_sharing_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_sharing_updated_at();


-- ============================================================================
-- 020_onboarding_gamification.sql
-- ============================================================================
-- =============================================
-- MIGRATION 020: ONBOARDING GAMIFIÉ
-- =============================================
-- Ajoute le système de gamification pour l'onboarding:
-- - Table de tracking pré-inscription
-- - Missions d'onboarding
-- - Achievements d'onboarding
-- - Fonction de synchronisation post-inscription
-- =============================================

-- ==========================================
-- PARTIE 1: TABLE ONBOARDING_PROGRESS
-- ==========================================

-- Table pour tracker la progression avant création de compte
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiant temporaire (généré côté client avant inscription)
  temp_user_id UUID UNIQUE NOT NULL,

  -- Completion des étapes
  welcome_completed BOOLEAN DEFAULT false,
  welcome_completed_at TIMESTAMPTZ,
  showcase_completed BOOLEAN DEFAULT false,
  showcase_completed_at TIMESTAMPTZ,
  profile_type_completed BOOLEAN DEFAULT false,
  profile_type_completed_at TIMESTAMPTZ,
  setup_completed BOOLEAN DEFAULT false,
  setup_completed_at TIMESTAMPTZ,
  features_completed BOOLEAN DEFAULT false,
  features_completed_at TIMESTAMPTZ,
  completion_completed BOOLEAN DEFAULT false,
  completion_completed_at TIMESTAMPTZ,

  -- XP accumulé pendant l'onboarding
  accumulated_xp INTEGER DEFAULT 0,

  -- Badges gagnés (codes)
  earned_badges TEXT[] DEFAULT '{}',

  -- Coins bonus
  bonus_coins INTEGER DEFAULT 0,

  -- Type d'utilisateur sélectionné
  user_type VARCHAR(10) CHECK (user_type IN ('parent', 'teen')),

  -- Timing (pour badge speedrunner)
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Données formulaire (optionnel, pour reprise)
  form_data JSONB DEFAULT '{}',

  -- Synced vers un vrai compte?
  synced_to_teen_id UUID REFERENCES public.teens(id),
  synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.onboarding_progress IS 'Tracking de progression onboarding avant création de compte';

-- Index pour recherche rapide
CREATE INDEX idx_onboarding_temp_user ON public.onboarding_progress(temp_user_id);
CREATE INDEX idx_onboarding_not_synced ON public.onboarding_progress(synced_to_teen_id) WHERE synced_to_teen_id IS NULL;

-- ==========================================
-- PARTIE 2: EXTENSION MISSION_TEMPLATES
-- ==========================================

-- Ajouter 'onboarding' comme type de mission valide
-- Note: Si la contrainte existe déjà, on la supprime et recrée
ALTER TABLE public.mission_templates
  DROP CONSTRAINT IF EXISTS mission_templates_mission_type_check;

ALTER TABLE public.mission_templates
  ADD CONSTRAINT mission_templates_mission_type_check
  CHECK (mission_type IN ('daily', 'weekly', 'monthly', 'seasonal', 'special', 'onboarding'));

-- ==========================================
-- PARTIE 3: MISSIONS D'ONBOARDING
-- ==========================================

INSERT INTO public.mission_templates (
  code, name, description, mission_type, category,
  xp_reward, objective_type, objective_target,
  icon, difficulty, is_repeatable, bonus_rewards, sort_order
) VALUES
-- Étape 1: Welcome
(
  'onboarding_welcome',
  'Premier Contact',
  'Commence ton aventure Teen Club!',
  'onboarding',
  'loyalty',
  10,
  'count',
  1,
  'hand-wave',
  'easy',
  false,
  '{}',
  1
),
-- Étape 2: Showcase
(
  'onboarding_discover',
  'Explorateur',
  'Découvre les activités Teen Club',
  'onboarding',
  'exploration',
  15,
  'count',
  1,
  'compass',
  'easy',
  false,
  '{}',
  2
),
-- Étape 3: Profile Type
(
  'onboarding_choose_path',
  'Choix du Destin',
  'Choisis ton type de compte',
  'onboarding',
  'participation',
  20,
  'count',
  1,
  'git-branch',
  'easy',
  false,
  '{}',
  3
),
-- Étape 4: Setup
(
  'onboarding_setup',
  'Profil Créé',
  'Configure ton profil Teen Club',
  'onboarding',
  'participation',
  30,
  'count',
  1,
  'user-check',
  'normal',
  false,
  '{}',
  4
),
-- Étape 5: Features
(
  'onboarding_features',
  'Maître des Features',
  'Explore toutes les fonctionnalités',
  'onboarding',
  'exploration',
  25,
  'count',
  1,
  'sparkles',
  'easy',
  false,
  '{}',
  5
),
-- Étape 6: Completion
(
  'onboarding_complete',
  'Bienvenue dans la Famille!',
  'Termine ton onboarding et rejoins la communauté',
  'onboarding',
  'loyalty',
  50,
  'count',
  1,
  'party-popper',
  'normal',
  false,
  '{"coins": 50}',
  6
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  bonus_rewards = EXCLUDED.bonus_rewards,
  updated_at = NOW();

-- ==========================================
-- PARTIE 4: ACHIEVEMENTS D'ONBOARDING
-- ==========================================

-- Ajouter updated_at si manquant
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

INSERT INTO public.achievements (
  code, name, description, category, rarity,
  points, xp_reward, icon, color_gradient,
  requirement_type, requirement_value, requirement_data,
  is_active, is_secret
) VALUES
-- Badge principal: Nouveau Membre
(
  'onboarding_starter',
  'Nouveau Membre',
  'Bienvenue dans la famille Teen Club!',
  'special',
  'common',
  25,
  50,
  'baby',
  'from-cyan-400 to-blue-500',
  'first_action',
  1,
  '{"trigger": "onboarding_complete"}',
  true,
  false
),
-- Badge explorateur: Curieux
(
  'onboarding_curious',
  'Curieux',
  'Tu as exploré toutes les fonctionnalités',
  'special',
  'common',
  30,
  50,
  'search',
  'from-purple-400 to-pink-500',
  'first_action',
  1,
  '{"trigger": "features_explored"}',
  true,
  false
),
-- Badge caché: Speed Runner
(
  'onboarding_speedrunner',
  'Speed Runner',
  'Onboarding complété en moins de 3 minutes!',
  'special',
  'rare',
  75,
  100,
  'timer',
  'from-yellow-400 to-orange-500',
  'time_based',
  180,
  '{"max_seconds": 180, "trigger": "onboarding_fast"}',
  true,
  true  -- Badge secret!
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  xp_reward = EXCLUDED.xp_reward,
  requirement_data = EXCLUDED.requirement_data,
  updated_at = NOW();

-- ==========================================
-- PARTIE 5: FONCTIONS
-- ==========================================

-- Fonction pour initialiser le tracking onboarding
CREATE OR REPLACE FUNCTION init_onboarding_progress(
  p_temp_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress RECORD;
BEGIN
  -- Vérifier si déjà existant
  SELECT * INTO v_progress
  FROM public.onboarding_progress
  WHERE temp_user_id = p_temp_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'resumed',
      'progress', row_to_json(v_progress)
    );
  END IF;

  -- Créer nouveau
  INSERT INTO public.onboarding_progress (temp_user_id, started_at)
  VALUES (p_temp_user_id, NOW())
  RETURNING * INTO v_progress;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'created',
    'progress', row_to_json(v_progress)
  );
END;
$$;

-- Fonction pour enregistrer la completion d'une étape
CREATE OR REPLACE FUNCTION record_onboarding_step(
  p_temp_user_id UUID,
  p_step VARCHAR(50),
  p_xp INTEGER DEFAULT 0,
  p_user_type VARCHAR(10) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress RECORD;
  v_update_sql TEXT;
BEGIN
  -- Construire la mise à jour dynamique selon l'étape
  CASE p_step
    WHEN 'welcome' THEN
      UPDATE public.onboarding_progress
      SET
        welcome_completed = true,
        welcome_completed_at = NOW(),
        accumulated_xp = accumulated_xp + p_xp,
        updated_at = NOW()
      WHERE temp_user_id = p_temp_user_id
      RETURNING * INTO v_progress;

    WHEN 'showcase' THEN
      UPDATE public.onboarding_progress
      SET
        showcase_completed = true,
        showcase_completed_at = NOW(),
        accumulated_xp = accumulated_xp + p_xp,
        updated_at = NOW()
      WHERE temp_user_id = p_temp_user_id
      RETURNING * INTO v_progress;

    WHEN 'profile-type' THEN
      UPDATE public.onboarding_progress
      SET
        profile_type_completed = true,
        profile_type_completed_at = NOW(),
        accumulated_xp = accumulated_xp + p_xp,
        user_type = COALESCE(p_user_type, user_type),
        updated_at = NOW()
      WHERE temp_user_id = p_temp_user_id
      RETURNING * INTO v_progress;

    WHEN 'setup', 'parent-setup', 'teen-setup' THEN
      UPDATE public.onboarding_progress
      SET
        setup_completed = true,
        setup_completed_at = NOW(),
        accumulated_xp = accumulated_xp + p_xp,
        updated_at = NOW()
      WHERE temp_user_id = p_temp_user_id
      RETURNING * INTO v_progress;

    WHEN 'features' THEN
      UPDATE public.onboarding_progress
      SET
        features_completed = true,
        features_completed_at = NOW(),
        accumulated_xp = accumulated_xp + p_xp,
        earned_badges = array_append(earned_badges, 'onboarding_curious'),
        updated_at = NOW()
      WHERE temp_user_id = p_temp_user_id
      RETURNING * INTO v_progress;

    WHEN 'completion' THEN
      UPDATE public.onboarding_progress
      SET
        completion_completed = true,
        completion_completed_at = NOW(),
        completed_at = NOW(),
        accumulated_xp = accumulated_xp + p_xp,
        bonus_coins = 50,
        earned_badges = array_append(earned_badges, 'onboarding_starter'),
        updated_at = NOW()
      WHERE temp_user_id = p_temp_user_id
      RETURNING * INTO v_progress;

    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Unknown step: ' || p_step);
  END CASE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Onboarding progress not found');
  END IF;

  -- Vérifier badge speedrunner si c'est la completion
  IF p_step = 'completion' THEN
    DECLARE
      v_duration_seconds INTEGER;
    BEGIN
      v_duration_seconds := EXTRACT(EPOCH FROM (v_progress.completed_at - v_progress.started_at));

      IF v_duration_seconds <= 180 THEN
        UPDATE public.onboarding_progress
        SET
          earned_badges = array_append(earned_badges, 'onboarding_speedrunner'),
          accumulated_xp = accumulated_xp + 100
        WHERE temp_user_id = p_temp_user_id
        RETURNING * INTO v_progress;
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'step', p_step,
    'xp_gained', p_xp,
    'total_xp', v_progress.accumulated_xp,
    'earned_badges', v_progress.earned_badges,
    'bonus_coins', v_progress.bonus_coins
  );
END;
$$;

-- Fonction pour synchroniser vers un compte utilisateur
CREATE OR REPLACE FUNCTION sync_onboarding_to_user(
  p_temp_user_id UUID,
  p_teen_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress RECORD;
  v_badge TEXT;
  v_xp_result JSONB;
BEGIN
  -- Récupérer la progression
  SELECT * INTO v_progress
  FROM public.onboarding_progress
  WHERE temp_user_id = p_temp_user_id
    AND synced_to_teen_id IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Onboarding progress not found or already synced'
    );
  END IF;

  -- Vérifier que l'onboarding est complété
  IF NOT v_progress.completion_completed THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Onboarding not completed'
    );
  END IF;

  -- Ajouter l'XP accumulé
  IF v_progress.accumulated_xp > 0 THEN
    SELECT add_xp_to_user(
      p_teen_id,
      v_progress.accumulated_xp,
      'onboarding',
      'onboarding',
      v_progress.id,
      'XP gagné pendant l''onboarding'
    ) INTO v_xp_result;
  END IF;

  -- Ajouter les coins bonus
  IF v_progress.bonus_coins > 0 THEN
    PERFORM add_coins_to_user(
      p_teen_id,
      v_progress.bonus_coins,
      'onboarding_bonus',
      'Bonus de bienvenue'
    );
  END IF;

  -- Débloquer les badges gagnés
  FOREACH v_badge IN ARRAY v_progress.earned_badges
  LOOP
    PERFORM unlock_achievement(p_teen_id, v_badge);
  END LOOP;

  -- Marquer comme synchronisé
  UPDATE public.onboarding_progress
  SET
    synced_to_teen_id = p_teen_id,
    synced_at = NOW(),
    updated_at = NOW()
  WHERE temp_user_id = p_temp_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'teen_id', p_teen_id,
    'xp_synced', v_progress.accumulated_xp,
    'coins_synced', v_progress.bonus_coins,
    'badges_synced', v_progress.earned_badges
  );
END;
$$;

-- Fonction pour récupérer la progression
CREATE OR REPLACE FUNCTION get_onboarding_progress(
  p_temp_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress RECORD;
BEGIN
  SELECT * INTO v_progress
  FROM public.onboarding_progress
  WHERE temp_user_id = p_temp_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'progress', jsonb_build_object(
      'temp_user_id', v_progress.temp_user_id,
      'steps', jsonb_build_object(
        'welcome', v_progress.welcome_completed,
        'showcase', v_progress.showcase_completed,
        'profile_type', v_progress.profile_type_completed,
        'setup', v_progress.setup_completed,
        'features', v_progress.features_completed,
        'completion', v_progress.completion_completed
      ),
      'accumulated_xp', v_progress.accumulated_xp,
      'earned_badges', v_progress.earned_badges,
      'bonus_coins', v_progress.bonus_coins,
      'user_type', v_progress.user_type,
      'started_at', v_progress.started_at,
      'completed_at', v_progress.completed_at,
      'is_synced', v_progress.synced_to_teen_id IS NOT NULL
    )
  );
END;
$$;

-- ==========================================
-- PARTIE 6: RLS POLICIES
-- ==========================================

-- Activer RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre l'accès anonyme basé sur temp_user_id
-- (l'utilisateur doit connaître son temp_user_id pour accéder)
CREATE POLICY "Allow anonymous onboarding access"
  ON public.onboarding_progress
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: En production, on pourrait restreindre davantage avec un token JWT anon

-- ==========================================
-- PARTIE 7: CLEANUP (optionnel)
-- ==========================================

-- Fonction pour nettoyer les anciennes progressions non sync (30 jours)
CREATE OR REPLACE FUNCTION cleanup_old_onboarding_progress()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.onboarding_progress
  WHERE synced_to_teen_id IS NULL
    AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- ==========================================
-- COMMENTAIRES
-- ==========================================

COMMENT ON FUNCTION init_onboarding_progress IS 'Initialise ou reprend le tracking onboarding pour un utilisateur temporaire';
COMMENT ON FUNCTION record_onboarding_step IS 'Enregistre la completion d''une étape et ajoute les XP correspondants';
COMMENT ON FUNCTION sync_onboarding_to_user IS 'Synchronise tout le progrès onboarding vers un compte utilisateur créé';
COMMENT ON FUNCTION get_onboarding_progress IS 'Récupère la progression onboarding d''un utilisateur temporaire';
COMMENT ON FUNCTION cleanup_old_onboarding_progress IS 'Nettoie les progressions non sync de plus de 30 jours';


-- ============================================================================
-- 021_xp_payment_system.sql
-- ============================================================================
-- =====================================================
-- Migration 021: XP Payment System
-- =====================================================
-- Enables hybrid payment with XP + DH (Dirhams)
-- =====================================================

-- Add XP payment columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS xp_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_after_xp DECIMAL(10,2);

-- Update amount_after_xp to match total_amount by default
UPDATE bookings
SET amount_after_xp = total_amount
WHERE amount_after_xp IS NULL;

-- Add XP payment columns to anniv_orders table
ALTER TABLE anniv_orders
ADD COLUMN IF NOT EXISTS xp_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_after_xp DECIMAL(10,2);

-- Update amount_after_xp for anniv_orders
UPDATE anniv_orders
SET amount_after_xp = total_price
WHERE amount_after_xp IS NULL;

-- Create XP transactions table for audit trail
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positive for gains, negative for spending
    type VARCHAR(50) NOT NULL, -- 'earn', 'payment', 'refund', 'bonus', 'penalty'
    description TEXT,
    reference_type VARCHAR(50), -- 'booking', 'anniv_order', 'challenge', 'achievement', etc.
    reference_id UUID,
    balance_before INTEGER,
    balance_after INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_type CHECK (type IN ('earn', 'payment', 'refund', 'bonus', 'penalty', 'transfer'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_xp_transactions_teen_id ON xp_transactions(teen_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_type ON xp_transactions(type);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_reference ON xp_transactions(reference_type, reference_id);

-- Create XP payment settings table
CREATE TABLE IF NOT EXISTS xp_payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Insert default XP payment settings
INSERT INTO xp_payment_settings (setting_key, setting_value, description) VALUES
('xp_to_dh_rate', '100', 'XP required for 1 DH'),
('max_xp_payment_percentage', '0.5', 'Maximum percentage of payment that can be XP (0.5 = 50%)'),
('min_xp_for_payment', '500', 'Minimum XP required to use XP payment'),
('xp_payment_enabled', 'true', 'Whether XP payment is globally enabled')
ON CONFLICT (setting_key) DO NOTHING;

-- Create function to record XP transaction with balance tracking
CREATE OR REPLACE FUNCTION record_xp_transaction(
    p_teen_id UUID,
    p_amount INTEGER,
    p_type VARCHAR(50),
    p_description TEXT DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_balance_before INTEGER;
    v_balance_after INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Get current balance
    SELECT COALESCE(total_xp, 0) INTO v_balance_before
    FROM user_xp
    WHERE teen_id = p_teen_id;

    -- Calculate new balance
    v_balance_after := GREATEST(0, COALESCE(v_balance_before, 0) + p_amount);

    -- Insert transaction record
    INSERT INTO xp_transactions (
        teen_id, amount, type, description,
        reference_type, reference_id,
        balance_before, balance_after
    ) VALUES (
        p_teen_id, p_amount, p_type, p_description,
        p_reference_type, p_reference_id,
        v_balance_before, v_balance_after
    )
    RETURNING id INTO v_transaction_id;

    -- Update user XP balance
    INSERT INTO user_xp (teen_id, total_xp)
    VALUES (p_teen_id, v_balance_after)
    ON CONFLICT (teen_id)
    DO UPDATE SET total_xp = v_balance_after;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to refund XP from booking
CREATE OR REPLACE FUNCTION refund_booking_xp(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_booking RECORD;
    v_teen_id UUID;
BEGIN
    -- Get booking with XP info
    SELECT b.*, bt.child_id
    INTO v_booking
    FROM bookings b
    LEFT JOIN booking_tickets bt ON bt.booking_id = b.id
    WHERE b.id = p_booking_id
    LIMIT 1;

    IF NOT FOUND OR v_booking.xp_used IS NULL OR v_booking.xp_used = 0 THEN
        RETURN FALSE;
    END IF;

    v_teen_id := v_booking.child_id;

    -- Record refund transaction
    PERFORM record_xp_transaction(
        v_teen_id,
        v_booking.xp_used, -- Positive amount for refund
        'refund',
        'Remboursement réservation ' || v_booking.booking_reference,
        'booking',
        p_booking_id
    );

    -- Clear XP from booking
    UPDATE bookings
    SET xp_used = 0, xp_value = 0, amount_after_xp = total_amount
    WHERE id = p_booking_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on xp_transactions
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for xp_transactions
CREATE POLICY "Users can view their own XP transactions"
ON xp_transactions FOR SELECT
TO authenticated
USING (
    teen_id = auth.uid() OR
    teen_id IN (
        SELECT teen_id FROM parent_teen_links WHERE parent_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all XP transactions"
ON xp_transactions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_roles
        WHERE profile_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Enable RLS on xp_payment_settings
ALTER TABLE xp_payment_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for xp_payment_settings
CREATE POLICY "Anyone can read XP payment settings"
ON xp_payment_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can update XP payment settings"
ON xp_payment_settings FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_roles
        WHERE profile_id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Add comments
COMMENT ON TABLE xp_transactions IS 'Audit trail for all XP transactions (earnings, payments, refunds)';
COMMENT ON TABLE xp_payment_settings IS 'Configuration settings for XP payment system';
COMMENT ON FUNCTION record_xp_transaction IS 'Records an XP transaction and updates user balance atomically';
COMMENT ON FUNCTION refund_booking_xp IS 'Refunds XP used for a booking and clears XP payment info';


-- ============================================================================
-- 022_pillars_system.sql
-- ============================================================================
-- =============================================
-- MIGRATION 022: SYSTEME DES PILIERS (ECOLE/SPORT/CREA)
-- =============================================
-- Ajoute le suivi des 3 piliers d'equilibre:
-- - Ecole: Notes, Quiz, Tutoriels educatifs
-- - Sport: Presence clubs, Defis physiques, Records
-- - Crea: Tutoriels passion, Creations, Likes
-- Bonus equilibre si tous les piliers > seuils
-- =============================================

-- ==========================================
-- PARTIE 1: EXTENSION TABLE USER_XP AVEC PILIERS
-- ==========================================

-- Ajouter les colonnes de score par pilier
DO $$
BEGIN
  -- Score Ecole (0-100)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'school_score'
  ) THEN
    ALTER TABLE public.user_xp ADD COLUMN school_score INTEGER DEFAULT 50 CHECK (school_score >= 0 AND school_score <= 100);
  END IF;

  -- Score Sport (0-100)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'sport_score'
  ) THEN
    ALTER TABLE public.user_xp ADD COLUMN sport_score INTEGER DEFAULT 50 CHECK (sport_score >= 0 AND sport_score <= 100);
  END IF;

  -- Score Crea (0-100)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'crea_score'
  ) THEN
    ALTER TABLE public.user_xp ADD COLUMN crea_score INTEGER DEFAULT 50 CHECK (crea_score >= 0 AND crea_score <= 100);
  END IF;

  -- Multiplicateur equilibre
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'balance_multiplier'
  ) THEN
    ALTER TABLE public.user_xp ADD COLUMN balance_multiplier DECIMAL(3,2) DEFAULT 1.00 CHECK (balance_multiplier >= 1.00 AND balance_multiplier <= 2.00);
  END IF;

  -- Dernier calcul bonus equilibre
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_xp' AND column_name = 'last_balance_check'
  ) THEN
    ALTER TABLE public.user_xp ADD COLUMN last_balance_check DATE;
  END IF;
END $$;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_user_xp_school ON public.user_xp(school_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_sport ON public.user_xp(sport_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_crea ON public.user_xp(crea_score DESC);

-- ==========================================
-- PARTIE 2: TABLES POUR LE PILIER ECOLE
-- ==========================================

-- 2.1 Table des notes scolaires
CREATE TABLE IF NOT EXISTS public.teen_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,

  -- Matiere
  subject VARCHAR(50) NOT NULL, -- 'math', 'french', 'physics', 'english', 'history', 'science', etc.
  subject_label VARCHAR(100) NOT NULL,

  -- Note
  grade DECIMAL(5,2) NOT NULL CHECK (grade >= 0),
  max_grade DECIMAL(5,2) NOT NULL DEFAULT 20 CHECK (max_grade > 0),
  grade_type VARCHAR(30) DEFAULT 'exam' CHECK (grade_type IN ('exam', 'homework', 'quiz', 'project', 'oral')),

  -- Validation
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  validated_by UUID, -- Parent qui a valide
  validated_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Periode
  term VARCHAR(20), -- 'T1', 'T2', 'T3', 'S1', 'S2'
  school_year VARCHAR(10), -- '2025-2026'

  -- XP
  xp_awarded INTEGER DEFAULT 0,

  -- Timestamps
  grade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teen_grades_teen ON public.teen_grades(teen_id);
CREATE INDEX IF NOT EXISTS idx_teen_grades_subject ON public.teen_grades(teen_id, subject);
CREATE INDEX IF NOT EXISTS idx_teen_grades_status ON public.teen_grades(status);
CREATE INDEX IF NOT EXISTS idx_teen_grades_date ON public.teen_grades(grade_date DESC);

-- 2.2 Table des quiz educatifs
CREATE TABLE IF NOT EXISTS public.educational_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Categorie
  subject VARCHAR(50) NOT NULL,
  difficulty VARCHAR(20) DEFAULT 'normal' CHECK (difficulty IN ('easy', 'normal', 'hard', 'expert')),
  grade_level VARCHAR(20), -- '6eme', '5eme', '4eme', '3eme', '2nde', '1ere', 'terminale'

  -- Configuration
  questions JSONB NOT NULL DEFAULT '[]', -- Array de questions avec reponses
  time_limit_minutes INTEGER DEFAULT 15,
  passing_score INTEGER DEFAULT 60, -- Pourcentage minimum pour reussir

  -- Recompenses
  xp_reward INTEGER DEFAULT 50,

  -- Metadata
  icon VARCHAR(50) DEFAULT 'book-open',
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edu_quizzes_subject ON public.educational_quizzes(subject);
CREATE INDEX IF NOT EXISTS idx_edu_quizzes_active ON public.educational_quizzes(is_active) WHERE is_active = true;

-- 2.3 Table des tentatives de quiz
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.educational_quizzes(id) ON DELETE CASCADE,

  -- Resultats
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  answers JSONB DEFAULT '{}', -- Reponses donnees
  correct_count INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,

  -- Temps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,

  -- Reussite
  passed BOOLEAN GENERATED ALWAYS AS (score >= 60) STORED,
  xp_earned INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_teen ON public.quiz_attempts(teen_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_passed ON public.quiz_attempts(teen_id, passed) WHERE passed = true;

-- 2.4 Table des tutoriels educatifs
CREATE TABLE IF NOT EXISTS public.educational_tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Contenu
  subject VARCHAR(50) NOT NULL,
  video_url TEXT, -- YouTube, Vimeo, etc.
  video_duration_minutes INTEGER,
  content_type VARCHAR(30) DEFAULT 'video' CHECK (content_type IN ('video', 'article', 'interactive')),

  -- Niveau
  difficulty VARCHAR(20) DEFAULT 'normal',
  grade_level VARCHAR(20),

  -- Recompenses
  xp_reward INTEGER DEFAULT 30,
  completion_threshold INTEGER DEFAULT 80, -- Pourcentage a regarder

  -- Metadata
  thumbnail_url TEXT,
  icon VARCHAR(50) DEFAULT 'play-circle',
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edu_tutorials_subject ON public.educational_tutorials(subject);

-- 2.5 Table de progression tutoriels educatifs
CREATE TABLE IF NOT EXISTS public.educational_tutorial_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  tutorial_id UUID NOT NULL REFERENCES public.educational_tutorials(id) ON DELETE CASCADE,

  -- Progression
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  watch_time_seconds INTEGER DEFAULT 0,

  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_earned INTEGER DEFAULT 0,

  -- Timestamps
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, tutorial_id)
);

CREATE INDEX IF NOT EXISTS idx_edu_tutorial_progress_teen ON public.educational_tutorial_progress(teen_id);

-- ==========================================
-- PARTIE 3: TABLES POUR LE PILIER SPORT
-- ==========================================

-- 3.1 Table des clubs sportifs
CREATE TABLE IF NOT EXISTS public.sport_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  name VARCHAR(100) NOT NULL,
  sport_type VARCHAR(50) NOT NULL, -- 'football', 'basketball', 'swimming', 'dance', 'martial_arts', etc.

  -- Localisation
  city VARCHAR(100),
  address TEXT,

  -- Contact
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),

  -- Metadata
  logo_url TEXT,
  is_partner BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sport_clubs_type ON public.sport_clubs(sport_type);
CREATE INDEX IF NOT EXISTS idx_sport_clubs_active ON public.sport_clubs(is_active) WHERE is_active = true;

-- 3.2 Table des inscriptions aux clubs
CREATE TABLE IF NOT EXISTS public.teen_club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.sport_clubs(id) ON DELETE CASCADE,

  -- Dates
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  left_at DATE,

  -- Statut
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, club_id)
);

CREATE INDEX IF NOT EXISTS idx_club_memberships_teen ON public.teen_club_memberships(teen_id);

-- 3.3 Table des presences au club
CREATE TABLE IF NOT EXISTS public.club_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.sport_clubs(id) ON DELETE CASCADE,

  -- Presence
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIME,
  check_out_time TIME,
  duration_minutes INTEGER,

  -- Validation
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verification_method VARCHAR(30) DEFAULT 'manual' CHECK (verification_method IN ('manual', 'qr_code', 'geolocation', 'coach')),

  -- XP
  xp_awarded INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, club_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_club_attendance_teen ON public.club_attendance(teen_id);
CREATE INDEX IF NOT EXISTS idx_club_attendance_date ON public.club_attendance(attendance_date DESC);

-- 3.4 Table des defis physiques
CREATE TABLE IF NOT EXISTS public.physical_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Type
  challenge_type VARCHAR(30) NOT NULL CHECK (challenge_type IN (
    'daily', 'weekly', 'monthly', 'special'
  )),
  sport_category VARCHAR(50) DEFAULT 'general', -- 'cardio', 'strength', 'flexibility', 'endurance'

  -- Objectif
  objective_type VARCHAR(30) NOT NULL CHECK (objective_type IN (
    'count', 'duration', 'distance', 'weight'
  )),
  objective_value INTEGER NOT NULL,
  objective_unit VARCHAR(20), -- 'reps', 'minutes', 'km', 'kg'

  -- Recompenses
  xp_reward INTEGER DEFAULT 50,

  -- Periode
  valid_from DATE,
  valid_until DATE,

  -- Metadata
  icon VARCHAR(50) DEFAULT 'dumbbell',
  difficulty VARCHAR(20) DEFAULT 'normal',
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_physical_challenges_type ON public.physical_challenges(challenge_type);
CREATE INDEX IF NOT EXISTS idx_physical_challenges_active ON public.physical_challenges(is_active) WHERE is_active = true;

-- 3.5 Table de progression defis physiques
CREATE TABLE IF NOT EXISTS public.teen_physical_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.physical_challenges(id) ON DELETE CASCADE,

  -- Progression
  current_value INTEGER DEFAULT 0,
  progress_percent INTEGER GENERATED ALWAYS AS (
    LEAST(100, (current_value * 100 / NULLIF(objective_value, 0)))
  ) STORED,

  -- Validation
  proof_type VARCHAR(30), -- 'photo', 'video', 'screenshot', 'manual'
  proof_url TEXT,
  validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,

  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_earned INTEGER DEFAULT 0,

  -- Metadata
  objective_value INTEGER NOT NULL, -- Copie de l'objectif au moment de l'inscription

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_physical_progress_teen ON public.teen_physical_challenge_progress(teen_id);

-- 3.6 Table des records personnels
CREATE TABLE IF NOT EXISTS public.teen_personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,

  -- Type de record
  record_type VARCHAR(50) NOT NULL, -- 'pushups', 'plank', 'run_5k', 'squats', etc.
  record_category VARCHAR(30) DEFAULT 'general', -- 'strength', 'cardio', 'flexibility'

  -- Valeur
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL, -- 'reps', 'seconds', 'minutes', 'km', 'kg'

  -- Record precedent
  previous_value DECIMAL(10,2),
  improvement_percent DECIMAL(5,2),

  -- Validation
  proof_url TEXT,
  verified BOOLEAN DEFAULT false,

  -- XP
  xp_awarded INTEGER DEFAULT 0,

  -- Timestamps
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, record_type)
);

CREATE INDEX IF NOT EXISTS idx_personal_records_teen ON public.teen_personal_records(teen_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_type ON public.teen_personal_records(record_type);

-- ==========================================
-- PARTIE 4: TABLES POUR LE PILIER CREA
-- ==========================================

-- 4.1 Table des parcours passion
CREATE TABLE IF NOT EXISTS public.passion_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Categorie
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'dance', 'music', 'art', 'tech', 'writing', 'photography', 'video', 'fashion', 'cooking', 'diy'
  )),

  -- Structure
  total_levels INTEGER DEFAULT 5,

  -- Recompenses
  xp_per_level INTEGER DEFAULT 100,
  completion_badge_id UUID,

  -- Metadata
  icon VARCHAR(50) DEFAULT 'sparkles',
  color VARCHAR(20) DEFAULT 'purple',
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passion_paths_category ON public.passion_paths(category);
CREATE INDEX IF NOT EXISTS idx_passion_paths_active ON public.passion_paths(is_active) WHERE is_active = true;

-- 4.2 Table des niveaux de parcours
CREATE TABLE IF NOT EXISTS public.passion_path_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES public.passion_paths(id) ON DELETE CASCADE,

  -- Niveau
  level_number INTEGER NOT NULL CHECK (level_number >= 1),
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Contenu
  tutorials JSONB DEFAULT '[]', -- Array de tutorial IDs
  exercises JSONB DEFAULT '[]', -- Array d'exercices

  -- Prerequis
  prerequisites JSONB DEFAULT '[]', -- Niveaux requis

  -- Validation
  validation_type VARCHAR(30) DEFAULT 'tutorial' CHECK (validation_type IN (
    'tutorial', 'quiz', 'creation', 'coach_review'
  )),
  validation_config JSONB DEFAULT '{}',

  -- Recompenses
  xp_reward INTEGER DEFAULT 100,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(path_id, level_number)
);

CREATE INDEX IF NOT EXISTS idx_path_levels_path ON public.passion_path_levels(path_id);

-- 4.3 Table de progression parcours passion
CREATE TABLE IF NOT EXISTS public.teen_passion_path_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  path_id UUID NOT NULL REFERENCES public.passion_paths(id) ON DELETE CASCADE,

  -- Progression
  current_level INTEGER DEFAULT 1,
  level_progress_percent INTEGER DEFAULT 0 CHECK (level_progress_percent >= 0 AND level_progress_percent <= 100),
  tutorials_completed JSONB DEFAULT '[]',
  exercises_completed JSONB DEFAULT '[]',

  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  total_xp_earned INTEGER DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, path_id)
);

CREATE INDEX IF NOT EXISTS idx_passion_progress_teen ON public.teen_passion_path_progress(teen_id);

-- 4.4 Table des tutoriels passion (creativite)
CREATE TABLE IF NOT EXISTS public.passion_tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identifiants
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,

  -- Categorie
  category VARCHAR(50) NOT NULL,
  path_id UUID REFERENCES public.passion_paths(id) ON DELETE SET NULL,
  level_required INTEGER DEFAULT 1,

  -- Contenu
  video_url TEXT,
  video_duration_minutes INTEGER,
  content JSONB DEFAULT '{}', -- Etapes, materiels, etc.

  -- Recompenses
  xp_reward INTEGER DEFAULT 40,
  completion_threshold INTEGER DEFAULT 80,

  -- Metadata
  thumbnail_url TEXT,
  difficulty VARCHAR(20) DEFAULT 'normal',
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passion_tutorials_category ON public.passion_tutorials(category);
CREATE INDEX IF NOT EXISTS idx_passion_tutorials_path ON public.passion_tutorials(path_id);

-- 4.5 Table de progression tutoriels passion
CREATE TABLE IF NOT EXISTS public.passion_tutorial_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  tutorial_id UUID NOT NULL REFERENCES public.passion_tutorials(id) ON DELETE CASCADE,

  -- Progression
  progress_percent INTEGER DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0,

  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_earned INTEGER DEFAULT 0,

  -- Timestamps
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, tutorial_id)
);

CREATE INDEX IF NOT EXISTS idx_passion_tutorial_progress_teen ON public.passion_tutorial_progress(teen_id);

-- 4.6 Table des creations
CREATE TABLE IF NOT EXISTS public.teen_creations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,

  -- Contenu
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,

  -- Media
  media_type VARCHAR(30) NOT NULL CHECK (media_type IN ('image', 'video', 'audio', 'document', 'link')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Tags
  tags JSONB DEFAULT '[]',

  -- Parcours associe
  path_id UUID REFERENCES public.passion_paths(id) ON DELETE SET NULL,
  tutorial_id UUID REFERENCES public.passion_tutorials(id) ON DELETE SET NULL,

  -- Visibilite
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public')),
  is_featured BOOLEAN DEFAULT false,

  -- Stats
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,

  -- XP
  xp_awarded INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teen_creations_teen ON public.teen_creations(teen_id);
CREATE INDEX IF NOT EXISTS idx_teen_creations_category ON public.teen_creations(category);
CREATE INDEX IF NOT EXISTS idx_teen_creations_visibility ON public.teen_creations(visibility);
CREATE INDEX IF NOT EXISTS idx_teen_creations_featured ON public.teen_creations(is_featured) WHERE is_featured = true;

-- 4.7 Table des likes sur creations
CREATE TABLE IF NOT EXISTS public.creation_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creation_id UUID NOT NULL REFERENCES public.teen_creations(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(creation_id, teen_id)
);

CREATE INDEX IF NOT EXISTS idx_creation_likes_creation ON public.creation_likes(creation_id);
CREATE INDEX IF NOT EXISTS idx_creation_likes_teen ON public.creation_likes(teen_id);

-- ==========================================
-- PARTIE 5: FONCTIONS DE CALCUL DES SCORES
-- ==========================================

-- 5.1 Fonction calcul score Ecole
-- Formule: notes (40%) + quiz (30%) + tutos (30%)
-- =============================================

CREATE OR REPLACE FUNCTION calculate_school_score(p_teen_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_notes_score DECIMAL := 0;
  v_quiz_score DECIMAL := 0;
  v_tutos_score DECIMAL := 0;
  v_final_score INTEGER;
  v_avg_grade DECIMAL;
  v_quiz_pass_rate DECIMAL;
  v_tuto_completion_rate DECIMAL;
  v_recent_grades_count INTEGER;
  v_recent_quizzes_count INTEGER;
  v_recent_tutos_count INTEGER;
BEGIN
  -- 1. Score Notes (40%)
  -- Moyenne des notes des 3 derniers mois, normalisee sur 100
  SELECT
    AVG((grade / max_grade) * 100),
    COUNT(*)
  INTO v_avg_grade, v_recent_grades_count
  FROM public.teen_grades
  WHERE teen_id = p_teen_id
    AND status = 'approved'
    AND grade_date >= CURRENT_DATE - INTERVAL '3 months';

  IF v_recent_grades_count > 0 AND v_avg_grade IS NOT NULL THEN
    v_notes_score := v_avg_grade;
  ELSE
    v_notes_score := 50; -- Score par defaut si pas de notes
  END IF;

  -- 2. Score Quiz (30%)
  -- Taux de reussite des quiz des 3 derniers mois
  SELECT
    (COUNT(*) FILTER (WHERE passed = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    COUNT(*)
  INTO v_quiz_pass_rate, v_recent_quizzes_count
  FROM public.quiz_attempts
  WHERE teen_id = p_teen_id
    AND created_at >= CURRENT_DATE - INTERVAL '3 months';

  IF v_recent_quizzes_count > 0 AND v_quiz_pass_rate IS NOT NULL THEN
    v_quiz_score := v_quiz_pass_rate;
  ELSE
    v_quiz_score := 50; -- Score par defaut
  END IF;

  -- 3. Score Tutos educatifs (30%)
  -- Taux de completion des tutoriels educatifs
  SELECT
    (COUNT(*) FILTER (WHERE completed = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    COUNT(*)
  INTO v_tuto_completion_rate, v_recent_tutos_count
  FROM public.educational_tutorial_progress
  WHERE teen_id = p_teen_id
    AND updated_at >= CURRENT_DATE - INTERVAL '3 months';

  IF v_recent_tutos_count > 0 AND v_tuto_completion_rate IS NOT NULL THEN
    v_tutos_score := v_tuto_completion_rate;
  ELSE
    v_tutos_score := 50; -- Score par defaut
  END IF;

  -- Calcul final: notes (40%) + quiz (30%) + tutos (30%)
  v_final_score := ROUND(
    (v_notes_score * 0.40) +
    (v_quiz_score * 0.30) +
    (v_tutos_score * 0.30)
  );

  -- Contraindre entre 0 et 100
  v_final_score := GREATEST(0, LEAST(100, v_final_score));

  RETURN v_final_score;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_school_score IS 'Calcule le score du pilier Ecole: notes (40%) + quiz (30%) + tutos (30%)';

-- 5.2 Fonction calcul score Sport
-- Formule: presence clubs (40%) + defis (40%) + records (20%)
-- =============================================

CREATE OR REPLACE FUNCTION calculate_sport_score(p_teen_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_presence_score DECIMAL := 0;
  v_defis_score DECIMAL := 0;
  v_records_score DECIMAL := 0;
  v_final_score INTEGER;
  v_attendance_rate DECIMAL;
  v_expected_sessions INTEGER;
  v_actual_sessions INTEGER;
  v_challenges_completed INTEGER;
  v_challenges_total INTEGER;
  v_records_count INTEGER;
  v_records_improved INTEGER;
BEGIN
  -- 1. Score Presence Clubs (40%)
  -- Taux de presence aux seances du dernier mois
  -- On estime 8 seances par mois par club
  SELECT COUNT(DISTINCT club_id) * 8
  INTO v_expected_sessions
  FROM public.teen_club_memberships
  WHERE teen_id = p_teen_id AND status = 'active';

  SELECT COUNT(*)
  INTO v_actual_sessions
  FROM public.club_attendance
  WHERE teen_id = p_teen_id
    AND attendance_date >= CURRENT_DATE - INTERVAL '1 month';

  IF v_expected_sessions > 0 THEN
    v_attendance_rate := LEAST(100, (v_actual_sessions::DECIMAL / v_expected_sessions) * 100);
    v_presence_score := v_attendance_rate;
  ELSE
    -- Pas de club inscrit, on regarde les defis physiques comme indicateur
    v_presence_score := 50;
  END IF;

  -- 2. Score Defis Physiques (40%)
  -- Taux de completion des defis des 3 derniers mois
  SELECT
    COUNT(*) FILTER (WHERE completed = true),
    COUNT(*)
  INTO v_challenges_completed, v_challenges_total
  FROM public.teen_physical_challenge_progress
  WHERE teen_id = p_teen_id
    AND started_at >= CURRENT_DATE - INTERVAL '3 months';

  IF v_challenges_total > 0 THEN
    v_defis_score := (v_challenges_completed::DECIMAL / v_challenges_total) * 100;
  ELSE
    v_defis_score := 50;
  END IF;

  -- 3. Score Records (20%)
  -- Nombre de records ameliores recemment + bonus si beaucoup de records
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE improvement_percent > 0 AND achieved_at >= CURRENT_DATE - INTERVAL '3 months')
  INTO v_records_count, v_records_improved
  FROM public.teen_personal_records
  WHERE teen_id = p_teen_id;

  IF v_records_count > 0 THEN
    -- Base: 50 + bonus pour records + bonus pour ameliorations
    v_records_score := 50 + LEAST(25, v_records_count * 5) + LEAST(25, v_records_improved * 10);
    v_records_score := LEAST(100, v_records_score);
  ELSE
    v_records_score := 50;
  END IF;

  -- Calcul final: presence (40%) + defis (40%) + records (20%)
  v_final_score := ROUND(
    (v_presence_score * 0.40) +
    (v_defis_score * 0.40) +
    (v_records_score * 0.20)
  );

  -- Contraindre entre 0 et 100
  v_final_score := GREATEST(0, LEAST(100, v_final_score));

  RETURN v_final_score;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_sport_score IS 'Calcule le score du pilier Sport: presence clubs (40%) + defis (40%) + records (20%)';

-- 5.3 Fonction calcul score Crea
-- Formule: tutos completes (40%) + creations (40%) + likes (20%)
-- =============================================

CREATE OR REPLACE FUNCTION calculate_crea_score(p_teen_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_tutos_score DECIMAL := 0;
  v_creations_score DECIMAL := 0;
  v_likes_score DECIMAL := 0;
  v_final_score INTEGER;
  v_tutos_completed INTEGER;
  v_tutos_started INTEGER;
  v_creations_count INTEGER;
  v_total_likes INTEGER;
  v_path_progress DECIMAL;
BEGIN
  -- 1. Score Tutos Passion completes (40%)
  -- Taux de completion + bonus pour parcours avances
  SELECT
    COUNT(*) FILTER (WHERE completed = true),
    COUNT(*)
  INTO v_tutos_completed, v_tutos_started
  FROM public.passion_tutorial_progress
  WHERE teen_id = p_teen_id;

  -- Bonus pour progression dans les parcours
  SELECT COALESCE(AVG(level_progress_percent), 0)
  INTO v_path_progress
  FROM public.teen_passion_path_progress
  WHERE teen_id = p_teen_id;

  IF v_tutos_started > 0 THEN
    v_tutos_score := (v_tutos_completed::DECIMAL / v_tutos_started) * 80 + (v_path_progress * 0.20);
    v_tutos_score := LEAST(100, v_tutos_score);
  ELSE
    v_tutos_score := 50;
  END IF;

  -- 2. Score Creations (40%)
  -- Nombre de creations + bonus visibilite publique
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE visibility = 'public')
  INTO v_creations_count, v_creations_count
  FROM public.teen_creations
  WHERE teen_id = p_teen_id
    AND created_at >= CURRENT_DATE - INTERVAL '6 months';

  IF v_creations_count > 0 THEN
    -- Base 50 + 5 points par creation (max 50 points bonus)
    v_creations_score := 50 + LEAST(50, v_creations_count * 5);
  ELSE
    v_creations_score := 50;
  END IF;

  -- 3. Score Likes recus (20%)
  -- Total des likes sur creations publiques
  SELECT COALESCE(SUM(likes_count), 0)
  INTO v_total_likes
  FROM public.teen_creations
  WHERE teen_id = p_teen_id
    AND visibility IN ('public', 'friends');

  IF v_total_likes > 0 THEN
    -- Base 50 + 2 points par like (max 50 points bonus)
    v_likes_score := 50 + LEAST(50, v_total_likes * 2);
  ELSE
    v_likes_score := 50;
  END IF;

  -- Calcul final: tutos (40%) + creations (40%) + likes (20%)
  v_final_score := ROUND(
    (v_tutos_score * 0.40) +
    (v_creations_score * 0.40) +
    (v_likes_score * 0.20)
  );

  -- Contraindre entre 0 et 100
  v_final_score := GREATEST(0, LEAST(100, v_final_score));

  RETURN v_final_score;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_crea_score IS 'Calcule le score du pilier Crea: tutos passion (40%) + creations (40%) + likes (20%)';

-- ==========================================
-- PARTIE 6: FONCTION BONUS EQUILIBRE
-- ==========================================

-- Fonction qui calcule et attribue le bonus equilibre
-- Si tous piliers > 50: +500 XP + multiplicateur x1.10
-- Si tous piliers > 70: +1,000 XP + multiplicateur x1.25
-- Si tous piliers > 85: +2,000 XP + badge special

CREATE OR REPLACE FUNCTION calculate_balance_bonus(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_school_score INTEGER;
  v_sport_score INTEGER;
  v_crea_score INTEGER;
  v_min_score INTEGER;
  v_bonus_xp INTEGER := 0;
  v_multiplier DECIMAL(3,2) := 1.00;
  v_balance_tier VARCHAR(20) := 'none';
  v_xp_result JSONB;
  v_achievement_unlocked BOOLEAN := false;
  v_last_check DATE;
BEGIN
  -- Verifier si deja calcule ce mois
  SELECT last_balance_check INTO v_last_check
  FROM public.user_xp
  WHERE teen_id = p_teen_id;

  IF v_last_check IS NOT NULL AND
     DATE_TRUNC('month', v_last_check) = DATE_TRUNC('month', CURRENT_DATE) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Bonus equilibre deja calcule ce mois',
      'last_check', v_last_check
    );
  END IF;

  -- Calculer les scores actuels
  v_school_score := calculate_school_score(p_teen_id);
  v_sport_score := calculate_sport_score(p_teen_id);
  v_crea_score := calculate_crea_score(p_teen_id);

  -- Trouver le score minimum
  v_min_score := LEAST(v_school_score, v_sport_score, v_crea_score);

  -- Determiner le tier de bonus
  IF v_min_score >= 85 THEN
    v_balance_tier := 'legendary';
    v_bonus_xp := 2000;
    v_multiplier := 1.50;
    v_achievement_unlocked := true;
  ELSIF v_min_score >= 70 THEN
    v_balance_tier := 'gold';
    v_bonus_xp := 1000;
    v_multiplier := 1.25;
  ELSIF v_min_score >= 50 THEN
    v_balance_tier := 'silver';
    v_bonus_xp := 500;
    v_multiplier := 1.10;
  ELSE
    v_balance_tier := 'none';
    v_bonus_xp := 0;
    v_multiplier := 1.00;
  END IF;

  -- Mettre a jour les scores et le multiplicateur
  UPDATE public.user_xp
  SET
    school_score = v_school_score,
    sport_score = v_sport_score,
    crea_score = v_crea_score,
    balance_multiplier = v_multiplier,
    last_balance_check = CURRENT_DATE,
    updated_at = NOW()
  WHERE teen_id = p_teen_id;

  -- Attribuer le bonus XP si applicable
  IF v_bonus_xp > 0 THEN
    v_xp_result := add_xp_to_user(
      p_teen_id,
      v_bonus_xp,
      'balance_bonus',
      'pillar',
      NULL,
      'Bonus equilibre mensuel - Tier: ' || v_balance_tier
    );
  END IF;

  -- Debloquer l'achievement si tier legendary (a implementer via le systeme d'achievements existant)
  -- TODO: Appeler unlock_achievement si le badge existe

  RETURN jsonb_build_object(
    'success', true,
    'school_score', v_school_score,
    'sport_score', v_sport_score,
    'crea_score', v_crea_score,
    'min_score', v_min_score,
    'balance_tier', v_balance_tier,
    'bonus_xp', v_bonus_xp,
    'multiplier', v_multiplier,
    'achievement_unlocked', v_achievement_unlocked,
    'xp_result', v_xp_result
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_balance_bonus IS 'Calcule et attribue le bonus equilibre mensuel basé sur les 3 piliers';

-- ==========================================
-- PARTIE 7: FONCTIONS HELPER
-- ==========================================

-- Fonction pour obtenir les scores piliers d'un teen
CREATE OR REPLACE FUNCTION get_pillar_scores(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'school_score', COALESCE(school_score, 50),
    'sport_score', COALESCE(sport_score, 50),
    'crea_score', COALESCE(crea_score, 50),
    'balance_multiplier', COALESCE(balance_multiplier, 1.00),
    'last_balance_check', last_balance_check,
    'average_score', ROUND((COALESCE(school_score, 50) + COALESCE(sport_score, 50) + COALESCE(crea_score, 50))::DECIMAL / 3)
  ) INTO v_result
  FROM public.user_xp
  WHERE teen_id = p_teen_id;

  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'school_score', 50,
      'sport_score', 50,
      'crea_score', 50,
      'balance_multiplier', 1.00,
      'last_balance_check', NULL,
      'average_score', 50
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Fonction pour mettre a jour un score pilier specifique
CREATE OR REPLACE FUNCTION update_pillar_score(
  p_teen_id UUID,
  p_pillar VARCHAR(10) -- 'school', 'sport', 'crea'
)
RETURNS INTEGER AS $$
DECLARE
  v_new_score INTEGER;
BEGIN
  CASE p_pillar
    WHEN 'school' THEN
      v_new_score := calculate_school_score(p_teen_id);
      UPDATE public.user_xp SET school_score = v_new_score, updated_at = NOW() WHERE teen_id = p_teen_id;
    WHEN 'sport' THEN
      v_new_score := calculate_sport_score(p_teen_id);
      UPDATE public.user_xp SET sport_score = v_new_score, updated_at = NOW() WHERE teen_id = p_teen_id;
    WHEN 'crea' THEN
      v_new_score := calculate_crea_score(p_teen_id);
      UPDATE public.user_xp SET crea_score = v_new_score, updated_at = NOW() WHERE teen_id = p_teen_id;
    ELSE
      RAISE EXCEPTION 'Pilier invalide: %', p_pillar;
  END CASE;

  RETURN v_new_score;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour recalculer tous les scores
CREATE OR REPLACE FUNCTION recalculate_all_pillar_scores(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_school INTEGER;
  v_sport INTEGER;
  v_crea INTEGER;
BEGIN
  v_school := calculate_school_score(p_teen_id);
  v_sport := calculate_sport_score(p_teen_id);
  v_crea := calculate_crea_score(p_teen_id);

  UPDATE public.user_xp
  SET
    school_score = v_school,
    sport_score = v_sport,
    crea_score = v_crea,
    updated_at = NOW()
  WHERE teen_id = p_teen_id;

  RETURN jsonb_build_object(
    'school_score', v_school,
    'sport_score', v_sport,
    'crea_score', v_crea
  );
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PARTIE 8: TRIGGERS AUTO-UPDATE
-- ==========================================

-- Trigger apres validation d'une note
CREATE OR REPLACE FUNCTION trigger_update_school_score_on_grade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    PERFORM update_pillar_score(NEW.teen_id, 'school');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_grade_approved_update_school ON public.teen_grades;
CREATE TRIGGER on_grade_approved_update_school
  AFTER INSERT OR UPDATE ON public.teen_grades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_school_score_on_grade();

-- Trigger apres completion d'un quiz
CREATE OR REPLACE FUNCTION trigger_update_school_score_on_quiz()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_pillar_score(NEW.teen_id, 'school');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_quiz_complete_update_school ON public.quiz_attempts;
CREATE TRIGGER on_quiz_complete_update_school
  AFTER INSERT ON public.quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_school_score_on_quiz();

-- Trigger apres completion d'un tuto educatif
CREATE OR REPLACE FUNCTION trigger_update_school_score_on_edu_tutorial()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    PERFORM update_pillar_score(NEW.teen_id, 'school');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_edu_tutorial_complete_update_school ON public.educational_tutorial_progress;
CREATE TRIGGER on_edu_tutorial_complete_update_school
  AFTER INSERT OR UPDATE ON public.educational_tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_school_score_on_edu_tutorial();

-- Trigger apres presence club
CREATE OR REPLACE FUNCTION trigger_update_sport_score_on_attendance()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_pillar_score(NEW.teen_id, 'sport');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_club_attendance_update_sport ON public.club_attendance;
CREATE TRIGGER on_club_attendance_update_sport
  AFTER INSERT ON public.club_attendance
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_sport_score_on_attendance();

-- Trigger apres completion defi physique
CREATE OR REPLACE FUNCTION trigger_update_sport_score_on_challenge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    PERFORM update_pillar_score(NEW.teen_id, 'sport');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_physical_challenge_complete_update_sport ON public.teen_physical_challenge_progress;
CREATE TRIGGER on_physical_challenge_complete_update_sport
  AFTER INSERT OR UPDATE ON public.teen_physical_challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_sport_score_on_challenge();

-- Trigger apres nouveau record
CREATE OR REPLACE FUNCTION trigger_update_sport_score_on_record()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_pillar_score(NEW.teen_id, 'sport');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_record_update_sport ON public.teen_personal_records;
CREATE TRIGGER on_record_update_sport
  AFTER INSERT OR UPDATE ON public.teen_personal_records
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_sport_score_on_record();

-- Trigger apres completion tuto passion
CREATE OR REPLACE FUNCTION trigger_update_crea_score_on_passion_tutorial()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    PERFORM update_pillar_score(NEW.teen_id, 'crea');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_passion_tutorial_complete_update_crea ON public.passion_tutorial_progress;
CREATE TRIGGER on_passion_tutorial_complete_update_crea
  AFTER INSERT OR UPDATE ON public.passion_tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_crea_score_on_passion_tutorial();

-- Trigger apres nouvelle creation
CREATE OR REPLACE FUNCTION trigger_update_crea_score_on_creation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_pillar_score(NEW.teen_id, 'crea');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_creation_update_crea ON public.teen_creations;
CREATE TRIGGER on_creation_update_crea
  AFTER INSERT ON public.teen_creations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_crea_score_on_creation();

-- Trigger apres like sur creation
CREATE OR REPLACE FUNCTION trigger_update_crea_score_on_like()
RETURNS TRIGGER AS $$
DECLARE
  v_creator_id UUID;
BEGIN
  -- Obtenir l'ID du createur
  SELECT teen_id INTO v_creator_id
  FROM public.teen_creations
  WHERE id = NEW.creation_id;

  IF v_creator_id IS NOT NULL THEN
    -- Mettre a jour le compteur de likes
    UPDATE public.teen_creations
    SET likes_count = likes_count + 1
    WHERE id = NEW.creation_id;

    -- Recalculer le score crea du createur
    PERFORM update_pillar_score(v_creator_id, 'crea');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_like_update_crea ON public.creation_likes;
CREATE TRIGGER on_like_update_crea
  AFTER INSERT ON public.creation_likes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_crea_score_on_like();

-- ==========================================
-- PARTIE 9: RLS POLICIES
-- ==========================================

-- teen_grades
ALTER TABLE public.teen_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can view own grades" ON public.teen_grades FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_grades.teen_id AND parent_id = auth.uid()));

CREATE POLICY "Teens can insert own grades" ON public.teen_grades FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_grades.teen_id AND parent_id = auth.uid()));

CREATE POLICY "Parents can validate grades" ON public.teen_grades FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_grades.teen_id AND parent_id = auth.uid()));

-- educational_quizzes (lecture publique)
ALTER TABLE public.educational_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active quizzes" ON public.educational_quizzes FOR SELECT
  USING (is_active = true);

-- quiz_attempts
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can view own quiz attempts" ON public.quiz_attempts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = quiz_attempts.teen_id AND parent_id = auth.uid()));

CREATE POLICY "Teens can create quiz attempts" ON public.quiz_attempts FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.teens WHERE id = quiz_attempts.teen_id AND parent_id = auth.uid()));

-- educational_tutorials (lecture publique)
ALTER TABLE public.educational_tutorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active tutorials" ON public.educational_tutorials FOR SELECT
  USING (is_active = true);

-- educational_tutorial_progress
ALTER TABLE public.educational_tutorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own tutorial progress" ON public.educational_tutorial_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = educational_tutorial_progress.teen_id AND parent_id = auth.uid()));

-- sport_clubs (lecture publique)
ALTER TABLE public.sport_clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active clubs" ON public.sport_clubs FOR SELECT
  USING (is_active = true);

-- teen_club_memberships
ALTER TABLE public.teen_club_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own memberships" ON public.teen_club_memberships FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_club_memberships.teen_id AND parent_id = auth.uid()));

-- club_attendance
ALTER TABLE public.club_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own attendance" ON public.club_attendance FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = club_attendance.teen_id AND parent_id = auth.uid()));

-- physical_challenges (lecture publique)
ALTER TABLE public.physical_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active challenges" ON public.physical_challenges FOR SELECT
  USING (is_active = true);

-- teen_physical_challenge_progress
ALTER TABLE public.teen_physical_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own challenge progress" ON public.teen_physical_challenge_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_physical_challenge_progress.teen_id AND parent_id = auth.uid()));

-- teen_personal_records
ALTER TABLE public.teen_personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own records" ON public.teen_personal_records FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_personal_records.teen_id AND parent_id = auth.uid()));

-- passion_paths (lecture publique)
ALTER TABLE public.passion_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active paths" ON public.passion_paths FOR SELECT
  USING (is_active = true);

-- passion_path_levels (lecture publique)
ALTER TABLE public.passion_path_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view path levels" ON public.passion_path_levels FOR SELECT
  USING (true);

-- teen_passion_path_progress
ALTER TABLE public.teen_passion_path_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own path progress" ON public.teen_passion_path_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_passion_path_progress.teen_id AND parent_id = auth.uid()));

-- passion_tutorials (lecture publique)
ALTER TABLE public.passion_tutorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active passion tutorials" ON public.passion_tutorials FOR SELECT
  USING (is_active = true);

-- passion_tutorial_progress
ALTER TABLE public.passion_tutorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own passion tutorial progress" ON public.passion_tutorial_progress FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = passion_tutorial_progress.teen_id AND parent_id = auth.uid()));

-- teen_creations
ALTER TABLE public.teen_creations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own creations" ON public.teen_creations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = teen_creations.teen_id AND parent_id = auth.uid()));

CREATE POLICY "Everyone can view public creations" ON public.teen_creations FOR SELECT
  USING (visibility = 'public');

-- creation_likes
ALTER TABLE public.creation_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teens can manage own likes" ON public.creation_likes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teens WHERE id = creation_likes.teen_id AND parent_id = auth.uid()));

CREATE POLICY "Everyone can view likes on public creations" ON public.creation_likes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.teen_creations WHERE id = creation_likes.creation_id AND visibility = 'public'));

-- ==========================================
-- PARTIE 10: SEED DATA
-- ==========================================

-- Quelques quiz educatifs de base
INSERT INTO public.educational_quizzes (code, title, description, subject, difficulty, grade_level, questions, xp_reward) VALUES
('math_fractions', 'Les Fractions', 'Teste tes connaissances sur les fractions', 'math', 'easy', '6eme',
  '[{"question": "Combien fait 1/2 + 1/2 ?", "options": ["1", "2", "1/4", "1/2"], "correct": 0},
    {"question": "Quelle fraction est equivalente a 2/4 ?", "options": ["1/3", "1/2", "3/4", "2/3"], "correct": 1},
    {"question": "Combien fait 3/4 - 1/4 ?", "options": ["1/2", "2/4", "1/4", "3/4"], "correct": 0}]'::jsonb, 30),
('french_conjugaison', 'Conjugaison Present', 'Teste tes connaissances en conjugaison', 'french', 'easy', '6eme',
  '[{"question": "Je (aller) au marche. Quel est le bon verbe ?", "options": ["va", "vais", "vas", "allons"], "correct": 1},
    {"question": "Nous (etre) en vacances.", "options": ["sommes", "sont", "etes", "suis"], "correct": 0}]'::jsonb, 25),
('english_basics', 'English Basics', 'Basic English vocabulary', 'english', 'easy', '6eme',
  '[{"question": "How do you say \"chat\" in English?", "options": ["dog", "cat", "bird", "fish"], "correct": 1},
    {"question": "What color is the sky?", "options": ["green", "red", "blue", "yellow"], "correct": 2}]'::jsonb, 25)
ON CONFLICT (code) DO NOTHING;

-- Quelques defis physiques
INSERT INTO public.physical_challenges (code, name, description, challenge_type, sport_category, objective_type, objective_value, objective_unit, xp_reward, difficulty) VALUES
('daily_pushups_10', '10 Pompes', 'Fais 10 pompes aujourd''hui', 'daily', 'strength', 'count', 10, 'reps', 20, 'easy'),
('daily_plank_60', 'Planche 60s', 'Tiens la planche pendant 60 secondes', 'daily', 'strength', 'duration', 60, 'seconds', 25, 'normal'),
('weekly_run_5k', 'Course 5km', 'Cours 5 kilometres cette semaine', 'weekly', 'cardio', 'distance', 5, 'km', 100, 'normal'),
('weekly_pushups_100', '100 Pompes', 'Fais 100 pompes cette semaine', 'weekly', 'strength', 'count', 100, 'reps', 75, 'normal'),
('monthly_marathon_42', 'Marathon Mensuel', 'Cours 42 km ce mois', 'monthly', 'cardio', 'distance', 42, 'km', 500, 'hard')
ON CONFLICT (code) DO NOTHING;

-- Quelques parcours passion
INSERT INTO public.passion_paths (code, name, description, category, total_levels, xp_per_level, icon, color) VALUES
('dance_hiphop', 'Hip-Hop Basics', 'Apprends les bases du Hip-Hop', 'dance', 5, 100, 'music', 'purple'),
('music_guitar', 'Guitare Debutant', 'Apprends a jouer de la guitare', 'music', 5, 100, 'guitar', 'orange'),
('art_drawing', 'Dessin Manga', 'Apprends a dessiner des mangas', 'art', 5, 100, 'pencil', 'pink'),
('tech_coding', 'Initiation au Code', 'Apprends les bases de la programmation', 'tech', 5, 100, 'code', 'cyan'),
('photo_basics', 'Photographie', 'Apprends les bases de la photo', 'photography', 5, 100, 'camera', 'yellow')
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- PARTIE 11: VERIFICATION
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE '  Migration 022 - Systeme des Piliers terminee';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'COLONNES AJOUTEES A user_xp:';
  RAISE NOTICE '  - school_score (0-100)';
  RAISE NOTICE '  - sport_score (0-100)';
  RAISE NOTICE '  - crea_score (0-100)';
  RAISE NOTICE '  - balance_multiplier (1.00-2.00)';
  RAISE NOTICE '  - last_balance_check (date)';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLES PILIER ECOLE:';
  RAISE NOTICE '  - teen_grades (notes scolaires)';
  RAISE NOTICE '  - educational_quizzes (quiz)';
  RAISE NOTICE '  - quiz_attempts (tentatives)';
  RAISE NOTICE '  - educational_tutorials (tutos)';
  RAISE NOTICE '  - educational_tutorial_progress';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLES PILIER SPORT:';
  RAISE NOTICE '  - sport_clubs';
  RAISE NOTICE '  - teen_club_memberships';
  RAISE NOTICE '  - club_attendance';
  RAISE NOTICE '  - physical_challenges';
  RAISE NOTICE '  - teen_physical_challenge_progress';
  RAISE NOTICE '  - teen_personal_records';
  RAISE NOTICE '';
  RAISE NOTICE 'TABLES PILIER CREA:';
  RAISE NOTICE '  - passion_paths';
  RAISE NOTICE '  - passion_path_levels';
  RAISE NOTICE '  - teen_passion_path_progress';
  RAISE NOTICE '  - passion_tutorials';
  RAISE NOTICE '  - passion_tutorial_progress';
  RAISE NOTICE '  - teen_creations';
  RAISE NOTICE '  - creation_likes';
  RAISE NOTICE '';
  RAISE NOTICE 'FONCTIONS:';
  RAISE NOTICE '  - calculate_school_score(teen_id)';
  RAISE NOTICE '  - calculate_sport_score(teen_id)';
  RAISE NOTICE '  - calculate_crea_score(teen_id)';
  RAISE NOTICE '  - calculate_balance_bonus(teen_id)';
  RAISE NOTICE '  - get_pillar_scores(teen_id)';
  RAISE NOTICE '  - update_pillar_score(teen_id, pillar)';
  RAISE NOTICE '  - recalculate_all_pillar_scores(teen_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'TRIGGERS: Auto-update scores apres chaque action';
  RAISE NOTICE 'RLS: Toutes les policies configurees';
  RAISE NOTICE '================================================';
END $$;


-- ============================================================================
-- 023_circles_system.sql
-- ============================================================================
-- ============================================================================
-- MIGRATION 023: CIRCLES SYSTEM (Cercles d'Amis)
-- ============================================================================
-- Systeme de groupes/cercles pour les teens avec chat et activites partagees
-- ============================================================================

-- ============================================================================
-- CIRCLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  cover_url TEXT,

  -- Circle settings
  circle_type VARCHAR(20) DEFAULT 'private' CHECK (circle_type IN ('private', 'public', 'secret')),
  max_members INTEGER DEFAULT 20,

  -- Creator/owner
  created_by UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Theme/customization
  theme_color VARCHAR(20) DEFAULT 'cyan',
  emoji VARCHAR(10),

  -- Activity tracking
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CIRCLE MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Role in circle
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),

  -- Member settings
  nickname VARCHAR(50),
  notifications_enabled BOOLEAN DEFAULT true,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'muted', 'left', 'kicked', 'banned')),

  -- Activity
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  messages_sent INTEGER DEFAULT 0,

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(circle_id, teen_id)
);

-- ============================================================================
-- CIRCLE INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,

  -- Inviter and invitee
  invited_by UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  invited_teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Invitation message
  message TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),

  -- Expiration
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  UNIQUE(circle_id, invited_teen_id, status)
);

-- ============================================================================
-- CIRCLE MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Message content
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'system', 'poll', 'challenge')),

  -- Media attachments
  media_url TEXT,
  media_type VARCHAR(50),

  -- Reply/thread
  reply_to_id UUID REFERENCES circle_messages(id) ON DELETE SET NULL,

  -- Reactions (stored as JSONB)
  reactions JSONB DEFAULT '{}',

  -- Metadata for special message types
  metadata JSONB DEFAULT '{}',

  -- Edit/delete tracking
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,

  -- Pinned messages
  is_pinned BOOLEAN DEFAULT false,
  pinned_by UUID REFERENCES teens(id),
  pinned_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CIRCLE MESSAGE READS (for unread tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES circle_messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(circle_id, teen_id)
);

-- ============================================================================
-- CIRCLE CHALLENGES (shared challenges within circle)
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Challenge info
  title VARCHAR(200) NOT NULL,
  description TEXT,
  challenge_type VARCHAR(20) DEFAULT 'custom' CHECK (challenge_type IN ('custom', 'physical', 'creative', 'educational')),

  -- Objective
  objective_type VARCHAR(20) DEFAULT 'completion' CHECK (objective_type IN ('completion', 'count', 'time', 'score')),
  objective_value INTEGER,
  objective_unit VARCHAR(50),

  -- Rewards
  xp_reward INTEGER DEFAULT 50,

  -- Duration
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CIRCLE CHALLENGE PARTICIPANTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES circle_challenges(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Progress
  current_value INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Proof
  proof_url TEXT,
  proof_type VARCHAR(20),

  -- XP earned
  xp_earned INTEGER DEFAULT 0,

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(challenge_id, teen_id)
);

-- ============================================================================
-- CIRCLE POLLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  message_id UUID REFERENCES circle_messages(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Poll content
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of {id, text, votes: []}

  -- Settings
  allow_multiple BOOLEAN DEFAULT false,
  anonymous BOOLEAN DEFAULT false,

  -- Duration
  ends_at TIMESTAMPTZ,

  -- Status
  is_closed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CIRCLE POLL VOTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS circle_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES circle_polls(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  option_ids JSONB NOT NULL, -- Array of selected option IDs

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(poll_id, teen_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_circles_created_by ON circles(created_by);
CREATE INDEX IF NOT EXISTS idx_circles_type ON circles(circle_type);
CREATE INDEX IF NOT EXISTS idx_circles_active ON circles(is_active);
CREATE INDEX IF NOT EXISTS idx_circles_last_activity ON circles(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_circle_members_circle ON circle_members(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_teen ON circle_members(teen_id);
CREATE INDEX IF NOT EXISTS idx_circle_members_role ON circle_members(role);
CREATE INDEX IF NOT EXISTS idx_circle_members_status ON circle_members(status);

CREATE INDEX IF NOT EXISTS idx_circle_invitations_circle ON circle_invitations(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_invitee ON circle_invitations(invited_teen_id);
CREATE INDEX IF NOT EXISTS idx_circle_invitations_status ON circle_invitations(status);

CREATE INDEX IF NOT EXISTS idx_circle_messages_circle ON circle_messages(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_messages_sender ON circle_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_circle_messages_created ON circle_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_circle_messages_reply ON circle_messages(reply_to_id);

CREATE INDEX IF NOT EXISTS idx_circle_challenges_circle ON circle_challenges(circle_id);
CREATE INDEX IF NOT EXISTS idx_circle_challenges_status ON circle_challenges(status);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get circle with member count and unread messages
CREATE OR REPLACE FUNCTION get_circle_with_stats(p_circle_id UUID, p_teen_id UUID)
RETURNS TABLE (
  circle_id UUID,
  name VARCHAR,
  description TEXT,
  avatar_url TEXT,
  theme_color VARCHAR,
  emoji VARCHAR,
  circle_type VARCHAR,
  member_count BIGINT,
  unread_count BIGINT,
  last_message JSONB,
  user_role VARCHAR,
  is_muted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS circle_id,
    c.name,
    c.description,
    c.avatar_url,
    c.theme_color,
    c.emoji,
    c.circle_type,
    (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id AND status = 'active') AS member_count,
    (
      SELECT COUNT(*)
      FROM circle_messages cm
      WHERE cm.circle_id = c.id
      AND cm.created_at > COALESCE(
        (SELECT last_read_at FROM circle_message_reads WHERE circle_id = c.id AND teen_id = p_teen_id),
        (SELECT joined_at FROM circle_members WHERE circle_id = c.id AND teen_id = p_teen_id)
      )
      AND cm.is_deleted = false
    ) AS unread_count,
    (
      SELECT jsonb_build_object(
        'id', cm.id,
        'content', cm.content,
        'sender_id', cm.sender_id,
        'created_at', cm.created_at
      )
      FROM circle_messages cm
      WHERE cm.circle_id = c.id AND cm.is_deleted = false
      ORDER BY cm.created_at DESC
      LIMIT 1
    ) AS last_message,
    (SELECT role FROM circle_members WHERE circle_id = c.id AND teen_id = p_teen_id) AS user_role,
    (SELECT status = 'muted' FROM circle_members WHERE circle_id = c.id AND teen_id = p_teen_id) AS is_muted
  FROM circles c
  WHERE c.id = p_circle_id AND c.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to send a message and update circle stats
CREATE OR REPLACE FUNCTION send_circle_message(
  p_circle_id UUID,
  p_sender_id UUID,
  p_content TEXT,
  p_message_type VARCHAR DEFAULT 'text',
  p_media_url TEXT DEFAULT NULL,
  p_reply_to_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Insert message
  INSERT INTO circle_messages (circle_id, sender_id, content, message_type, media_url, reply_to_id, metadata)
  VALUES (p_circle_id, p_sender_id, p_content, p_message_type, p_media_url, p_reply_to_id, p_metadata)
  RETURNING id INTO v_message_id;

  -- Update circle stats
  UPDATE circles
  SET
    last_activity_at = NOW(),
    message_count = message_count + 1,
    updated_at = NOW()
  WHERE id = p_circle_id;

  -- Update member stats
  UPDATE circle_members
  SET
    messages_sent = messages_sent + 1,
    updated_at = NOW()
  WHERE circle_id = p_circle_id AND teen_id = p_sender_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add reaction to message
CREATE OR REPLACE FUNCTION add_message_reaction(
  p_message_id UUID,
  p_teen_id UUID,
  p_emoji VARCHAR
) RETURNS JSONB AS $$
DECLARE
  v_reactions JSONB;
  v_emoji_reactions JSONB;
BEGIN
  SELECT reactions INTO v_reactions FROM circle_messages WHERE id = p_message_id;

  -- Get current reactions for this emoji
  v_emoji_reactions := COALESCE(v_reactions->p_emoji, '[]'::jsonb);

  -- Check if user already reacted with this emoji
  IF NOT (v_emoji_reactions ? p_teen_id::text) THEN
    v_emoji_reactions := v_emoji_reactions || to_jsonb(p_teen_id::text);
  END IF;

  -- Update reactions
  v_reactions := jsonb_set(COALESCE(v_reactions, '{}'::jsonb), ARRAY[p_emoji], v_emoji_reactions);

  UPDATE circle_messages SET reactions = v_reactions WHERE id = p_message_id;

  RETURN v_reactions;
END;
$$ LANGUAGE plpgsql;

-- Function to remove reaction from message
CREATE OR REPLACE FUNCTION remove_message_reaction(
  p_message_id UUID,
  p_teen_id UUID,
  p_emoji VARCHAR
) RETURNS JSONB AS $$
DECLARE
  v_reactions JSONB;
  v_emoji_reactions JSONB;
BEGIN
  SELECT reactions INTO v_reactions FROM circle_messages WHERE id = p_message_id;

  -- Get current reactions for this emoji
  v_emoji_reactions := COALESCE(v_reactions->p_emoji, '[]'::jsonb);

  -- Remove user from reactions
  v_emoji_reactions := (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(v_emoji_reactions) elem
    WHERE elem::text != ('"' || p_teen_id::text || '"')
  );

  -- Update or remove emoji key
  IF v_emoji_reactions IS NULL OR jsonb_array_length(v_emoji_reactions) = 0 THEN
    v_reactions := v_reactions - p_emoji;
  ELSE
    v_reactions := jsonb_set(v_reactions, ARRAY[p_emoji], v_emoji_reactions);
  END IF;

  UPDATE circle_messages SET reactions = v_reactions WHERE id = p_message_id;

  RETURN v_reactions;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_challenges ENABLE ROW LEVEL SECURITY;

-- Circles: viewable by members, public circles visible to all
CREATE POLICY circles_select ON circles FOR SELECT USING (
  is_active = true AND (
    circle_type = 'public' OR
    EXISTS (SELECT 1 FROM circle_members WHERE circle_id = id AND teen_id = auth.uid() AND status = 'active')
  )
);

CREATE POLICY circles_insert ON circles FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY circles_update ON circles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM circle_members WHERE circle_id = id AND teen_id = auth.uid() AND role IN ('owner', 'admin'))
);

-- Circle members: viewable by other members
CREATE POLICY circle_members_select ON circle_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM circle_members cm WHERE cm.circle_id = circle_id AND cm.teen_id = auth.uid() AND cm.status = 'active')
);

-- Messages: viewable by circle members
CREATE POLICY circle_messages_select ON circle_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM circle_members WHERE circle_id = circle_messages.circle_id AND teen_id = auth.uid() AND status = 'active')
);

CREATE POLICY circle_messages_insert ON circle_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (SELECT 1 FROM circle_members WHERE circle_id = circle_messages.circle_id AND teen_id = auth.uid() AND status = 'active')
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-add creator as owner member
CREATE OR REPLACE FUNCTION auto_add_circle_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO circle_members (circle_id, teen_id, role, status)
  VALUES (NEW.id, NEW.created_by, 'owner', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_add_circle_owner
AFTER INSERT ON circles
FOR EACH ROW
EXECUTE FUNCTION auto_add_circle_owner();

-- Award XP when joining a circle
CREATE OR REPLACE FUNCTION award_circle_join_xp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
    PERFORM add_xp_to_user(
      NEW.teen_id,
      10,
      'circle_join',
      NEW.circle_id,
      'Rejoint un cercle'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_circle_join_xp
AFTER INSERT OR UPDATE ON circle_members
FOR EACH ROW
EXECUTE FUNCTION award_circle_join_xp();

COMMENT ON TABLE circles IS 'Cercles/groupes de teens pour communiquer et partager des activites';
COMMENT ON TABLE circle_members IS 'Membres des cercles avec roles et parametres';
COMMENT ON TABLE circle_messages IS 'Messages dans les cercles avec support media et reactions';
COMMENT ON TABLE circle_challenges IS 'Defis partages au sein des cercles';


-- ============================================================================
-- 024_friends_system.sql
-- ============================================================================
-- ============================================================================
-- MIGRATION 024: FRIENDS SYSTEM (Système d'Amis)
-- ============================================================================
-- Système complet de gestion des amis pour les teens
-- ============================================================================

-- ============================================================================
-- FRIENDSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The two users in the friendship (user1_id < user2_id for consistency)
  user1_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),

  -- Who initiated the request (for pending status)
  initiated_by UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Friendship metadata
  friendship_level INTEGER DEFAULT 1, -- Increases with interactions
  interaction_count INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,

  -- Special tags
  is_best_friend BOOLEAN DEFAULT false, -- User can mark best friends
  is_favorite BOOLEAN DEFAULT false,
  nickname VARCHAR(50), -- Custom nickname for the friend

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure user1_id < user2_id for uniqueness
  CONSTRAINT friendship_order CHECK (user1_id < user2_id),
  UNIQUE(user1_id, user2_id)
);

-- ============================================================================
-- FRIEND REQUESTS TABLE (for detailed tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sender and receiver
  sender_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Request message
  message TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),

  -- Seen tracking
  seen_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  UNIQUE(sender_id, receiver_id)
);

-- ============================================================================
-- BLOCKED USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(blocker_id, blocked_id)
);

-- ============================================================================
-- FRIEND SUGGESTIONS TABLE (cached suggestions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS friend_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  suggested_teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Why suggested
  reason VARCHAR(50), -- 'mutual_friends', 'same_school', 'same_clubs', 'same_interests'
  score DECIMAL(5,2) DEFAULT 0, -- Suggestion score

  -- Tracking
  shown_count INTEGER DEFAULT 0,
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(teen_id, suggested_teen_id)
);

-- ============================================================================
-- FRIEND ACTIVITY FEED (for friend-specific activities)
-- ============================================================================

CREATE TABLE IF NOT EXISTS friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,

  -- Activity type
  activity_type VARCHAR(50) NOT NULL, -- 'level_up', 'achievement', 'new_record', 'challenge_complete', 'creation', etc.

  -- Activity details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),

  -- Related content
  related_type VARCHAR(50), -- 'achievement', 'record', 'creation', 'challenge', etc.
  related_id UUID,

  -- Privacy
  visibility VARCHAR(20) DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'private')),

  -- Engagement
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ACTIVITY LIKES
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES friend_activities(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(activity_id, teen_id)
);

-- ============================================================================
-- ACTIVITY COMMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES friend_activities(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES teens(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_initiated ON friendships(initiated_by);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

CREATE INDEX IF NOT EXISTS idx_friend_suggestions_teen ON friend_suggestions(teen_id);
CREATE INDEX IF NOT EXISTS idx_friend_suggestions_score ON friend_suggestions(score DESC);

CREATE INDEX IF NOT EXISTS idx_friend_activities_teen ON friend_activities(teen_id);
CREATE INDEX IF NOT EXISTS idx_friend_activities_created ON friend_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_activities_type ON friend_activities(activity_type);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get all friends of a teen
CREATE OR REPLACE FUNCTION get_friends(p_teen_id UUID)
RETURNS TABLE (
  friend_id UUID,
  friendship_id UUID,
  status VARCHAR,
  friendship_level INTEGER,
  is_best_friend BOOLEAN,
  is_favorite BOOLEAN,
  nickname VARCHAR,
  accepted_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN f.user1_id = p_teen_id THEN f.user2_id
      ELSE f.user1_id
    END AS friend_id,
    f.id AS friendship_id,
    f.status,
    f.friendship_level,
    f.is_best_friend,
    f.is_favorite,
    f.nickname,
    f.accepted_at,
    f.last_interaction_at
  FROM friendships f
  WHERE (f.user1_id = p_teen_id OR f.user2_id = p_teen_id)
    AND f.status = 'accepted';
END;
$$ LANGUAGE plpgsql;

-- Function to check if two users are friends
CREATE OR REPLACE FUNCTION are_friends(p_user1 UUID, p_user2 UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user1 UUID;
  v_user2 UUID;
BEGIN
  -- Order the IDs
  IF p_user1 < p_user2 THEN
    v_user1 := p_user1;
    v_user2 := p_user2;
  ELSE
    v_user1 := p_user2;
    v_user2 := p_user1;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE user1_id = v_user1
      AND user2_id = v_user2
      AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get mutual friends count
CREATE OR REPLACE FUNCTION get_mutual_friends_count(p_user1 UUID, p_user2 UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH user1_friends AS (
    SELECT
      CASE WHEN user1_id = p_user1 THEN user2_id ELSE user1_id END AS friend_id
    FROM friendships
    WHERE (user1_id = p_user1 OR user2_id = p_user1)
      AND status = 'accepted'
  ),
  user2_friends AS (
    SELECT
      CASE WHEN user1_id = p_user2 THEN user2_id ELSE user1_id END AS friend_id
    FROM friendships
    WHERE (user1_id = p_user2 OR user2_id = p_user2)
      AND status = 'accepted'
  )
  SELECT COUNT(*) INTO v_count
  FROM user1_friends u1
  INNER JOIN user2_friends u2 ON u1.friend_id = u2.friend_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to send friend request
CREATE OR REPLACE FUNCTION send_friend_request(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_user1 UUID;
  v_user2 UUID;
BEGIN
  -- Check if already friends or request exists
  IF p_sender_id < p_receiver_id THEN
    v_user1 := p_sender_id;
    v_user2 := p_receiver_id;
  ELSE
    v_user1 := p_receiver_id;
    v_user2 := p_sender_id;
  END IF;

  -- Check for existing friendship
  IF EXISTS (SELECT 1 FROM friendships WHERE user1_id = v_user1 AND user2_id = v_user2) THEN
    RAISE EXCEPTION 'Friendship already exists';
  END IF;

  -- Check if blocked
  IF EXISTS (SELECT 1 FROM blocked_users WHERE blocker_id = p_receiver_id AND blocked_id = p_sender_id) THEN
    RAISE EXCEPTION 'Cannot send request to this user';
  END IF;

  -- Check for existing pending request
  IF EXISTS (SELECT 1 FROM friend_requests WHERE sender_id = p_sender_id AND receiver_id = p_receiver_id AND status = 'pending') THEN
    RAISE EXCEPTION 'Request already sent';
  END IF;

  -- Create request
  INSERT INTO friend_requests (sender_id, receiver_id, message, status)
  VALUES (p_sender_id, p_receiver_id, p_message, 'pending')
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

-- Function to accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(p_request_id UUID, p_receiver_id UUID)
RETURNS UUID AS $$
DECLARE
  v_request RECORD;
  v_friendship_id UUID;
  v_user1 UUID;
  v_user2 UUID;
BEGIN
  -- Get request
  SELECT * INTO v_request FROM friend_requests WHERE id = p_request_id AND receiver_id = p_receiver_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not pending';
  END IF;

  -- Update request
  UPDATE friend_requests SET status = 'accepted', responded_at = NOW() WHERE id = p_request_id;

  -- Order IDs
  IF v_request.sender_id < v_request.receiver_id THEN
    v_user1 := v_request.sender_id;
    v_user2 := v_request.receiver_id;
  ELSE
    v_user1 := v_request.receiver_id;
    v_user2 := v_request.sender_id;
  END IF;

  -- Create friendship
  INSERT INTO friendships (user1_id, user2_id, status, initiated_by, accepted_at)
  VALUES (v_user1, v_user2, 'accepted', v_request.sender_id, NOW())
  RETURNING id INTO v_friendship_id;

  -- Award XP to both users
  PERFORM add_xp_to_user(v_request.sender_id, 15, 'friend_accepted', v_friendship_id, 'Nouvel ami');
  PERFORM add_xp_to_user(v_request.receiver_id, 15, 'friend_accepted', v_friendship_id, 'Nouvel ami');

  RETURN v_friendship_id;
END;
$$ LANGUAGE plpgsql;

-- Function to increase friendship level based on interactions
CREATE OR REPLACE FUNCTION increase_friendship_interaction(p_user1 UUID, p_user2 UUID)
RETURNS INTEGER AS $$
DECLARE
  v_u1 UUID;
  v_u2 UUID;
  v_new_level INTEGER;
  v_interaction_count INTEGER;
BEGIN
  -- Order IDs
  IF p_user1 < p_user2 THEN
    v_u1 := p_user1;
    v_u2 := p_user2;
  ELSE
    v_u1 := p_user2;
    v_u2 := p_user1;
  END IF;

  -- Update and get new values
  UPDATE friendships
  SET
    interaction_count = interaction_count + 1,
    last_interaction_at = NOW(),
    friendship_level = LEAST(10, 1 + FLOOR((interaction_count + 1) / 10)), -- Level up every 10 interactions, max 10
    updated_at = NOW()
  WHERE user1_id = v_u1 AND user2_id = v_u2 AND status = 'accepted'
  RETURNING friendship_level INTO v_new_level;

  RETURN COALESCE(v_new_level, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to generate friend suggestions
CREATE OR REPLACE FUNCTION generate_friend_suggestions(p_teen_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS VOID AS $$
BEGIN
  -- Clear old suggestions (keep dismissed ones)
  DELETE FROM friend_suggestions
  WHERE teen_id = p_teen_id AND dismissed = false;

  -- Insert new suggestions based on mutual friends
  INSERT INTO friend_suggestions (teen_id, suggested_teen_id, reason, score)
  SELECT DISTINCT
    p_teen_id,
    potential_friend,
    'mutual_friends',
    mutual_count * 10 -- Score based on mutual friends
  FROM (
    -- Find friends of friends
    SELECT
      CASE WHEN f2.user1_id = my_friends.friend_id THEN f2.user2_id ELSE f2.user1_id END AS potential_friend,
      COUNT(*) AS mutual_count
    FROM (
      SELECT
        CASE WHEN user1_id = p_teen_id THEN user2_id ELSE user1_id END AS friend_id
      FROM friendships
      WHERE (user1_id = p_teen_id OR user2_id = p_teen_id) AND status = 'accepted'
    ) my_friends
    INNER JOIN friendships f2 ON (
      f2.user1_id = my_friends.friend_id OR f2.user2_id = my_friends.friend_id
    ) AND f2.status = 'accepted'
    WHERE
      -- Not the original user
      CASE WHEN f2.user1_id = my_friends.friend_id THEN f2.user2_id ELSE f2.user1_id END != p_teen_id
      -- Not already a friend
      AND NOT EXISTS (
        SELECT 1 FROM friendships
        WHERE status = 'accepted'
          AND (
            (user1_id = p_teen_id AND user2_id = CASE WHEN f2.user1_id = my_friends.friend_id THEN f2.user2_id ELSE f2.user1_id END)
            OR (user2_id = p_teen_id AND user1_id = CASE WHEN f2.user1_id = my_friends.friend_id THEN f2.user2_id ELSE f2.user1_id END)
          )
      )
      -- Not blocked
      AND NOT EXISTS (
        SELECT 1 FROM blocked_users
        WHERE blocker_id = p_teen_id
          AND blocked_id = CASE WHEN f2.user1_id = my_friends.friend_id THEN f2.user2_id ELSE f2.user1_id END
      )
      -- Not already suggested and dismissed
      AND NOT EXISTS (
        SELECT 1 FROM friend_suggestions
        WHERE teen_id = p_teen_id
          AND suggested_teen_id = CASE WHEN f2.user1_id = my_friends.friend_id THEN f2.user2_id ELSE f2.user1_id END
          AND dismissed = true
      )
    GROUP BY potential_friend
  ) suggestions
  ORDER BY mutual_count DESC
  LIMIT p_limit
  ON CONFLICT (teen_id, suggested_teen_id) DO UPDATE
  SET score = EXCLUDED.score, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_activities ENABLE ROW LEVEL SECURITY;

-- Friendships: users can see their own friendships
CREATE POLICY friendships_select ON friendships FOR SELECT USING (
  user1_id = auth.uid() OR user2_id = auth.uid()
);

-- Friend requests: users can see requests they sent or received
CREATE POLICY friend_requests_select ON friend_requests FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);

-- Blocked users: only blocker can see
CREATE POLICY blocked_users_select ON blocked_users FOR SELECT USING (
  blocker_id = auth.uid()
);

-- Friend activities: based on visibility
CREATE POLICY friend_activities_select ON friend_activities FOR SELECT USING (
  teen_id = auth.uid()
  OR visibility = 'public'
  OR (visibility = 'friends' AND are_friends(teen_id, auth.uid()))
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to create activity when friendship level increases
CREATE OR REPLACE FUNCTION notify_friendship_level_up()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.friendship_level > OLD.friendship_level THEN
    -- Create activity for both users
    INSERT INTO friend_activities (teen_id, activity_type, title, description, icon, color, related_type, related_id)
    VALUES
      (NEW.user1_id, 'friendship_level', 'Amitie renforcee!', 'Niveau ' || NEW.friendship_level || ' atteint', 'heart', 'pink', 'friendship', NEW.id),
      (NEW.user2_id, 'friendship_level', 'Amitie renforcee!', 'Niveau ' || NEW.friendship_level || ' atteint', 'heart', 'pink', 'friendship', NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_friendship_level_up
AFTER UPDATE ON friendships
FOR EACH ROW
WHEN (NEW.friendship_level > OLD.friendship_level)
EXECUTE FUNCTION notify_friendship_level_up();

COMMENT ON TABLE friendships IS 'Relations d amitie entre teens';
COMMENT ON TABLE friend_requests IS 'Demandes d amitie en attente';
COMMENT ON TABLE blocked_users IS 'Utilisateurs bloques';
COMMENT ON TABLE friend_suggestions IS 'Suggestions d amis basees sur les amis mutuels';
COMMENT ON TABLE friend_activities IS 'Activites visibles par les amis';


-- ============================================================================
-- 027_premium_subscriptions.sql
-- ============================================================================
-- =============================================
-- MIGRATION 027: Premium Subscription System
-- =============================================
-- Systeme d'abonnements premium avec paiement hybride
-- Adapte au marche marocain (cash, vouchers, online)
-- =============================================

-- Table des forfaits disponibles
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identification
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100), -- Nom en arabe
    description TEXT,
    description_ar TEXT,

    -- Type de forfait
    plan_type VARCHAR(30) NOT NULL CHECK (plan_type IN (
        'free',         -- Gratuit avec limitations
        'starter',      -- Basique
        'pro',          -- Pro/Standard
        'elite',        -- Elite/Premium
        'family',       -- Familial (jusqu'a 5 membres)
        'school',       -- Scolaire (pour etablissements)
        'lifetime'      -- Acces a vie
    )),

    -- Tarification
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_quarterly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    price_lifetime DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'MAD',

    -- Réductions
    discount_quarterly_percent INTEGER DEFAULT 0,
    discount_yearly_percent INTEGER DEFAULT 0,

    -- Limites et fonctionnalités
    features JSONB DEFAULT '{}'::jsonb,
    -- Exemple: {
    --   "max_circles": 10,
    --   "max_circle_members": 50,
    --   "daily_challenges": 10,
    --   "cloud_storage_mb": 1000,
    --   "ad_free": true,
    --   "priority_support": true,
    --   "exclusive_badges": true,
    --   "xp_multiplier": 1.5,
    --   "custom_themes": true,
    --   "analytics_dashboard": true
    -- }

    -- Visuel
    icon_url TEXT,
    color VARCHAR(20) DEFAULT '#00d4ff',
    badge_label VARCHAR(50), -- Ex: "POPULAIRE", "MEILLEUR RAPPORT"

    -- Configuration
    trial_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure legacy tables have new columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'code'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN code VARCHAR(50) UNIQUE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'name'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN name VARCHAR(100);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'name_ar'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN name_ar VARCHAR(100);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'description'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN plan_type VARCHAR(30);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'price_monthly'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN price_monthly DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'price_quarterly'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN price_quarterly DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'price_yearly'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN price_yearly DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'discount_quarterly_percent'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN discount_quarterly_percent INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'discount_yearly_percent'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN discount_yearly_percent INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'features'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN features JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'color'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN color VARCHAR(20) DEFAULT '#00d4ff';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'badge_label'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN badge_label VARCHAR(50);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'trial_days'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN trial_days INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'is_featured'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'tier'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN tier VARCHAR(50);
    END IF;
    -- Ensure tier has a default to avoid NOT NULL violations on legacy schemas
    BEGIN
        ALTER TABLE public.subscription_plans ALTER COLUMN tier SET DEFAULT 'free';
    EXCEPTION WHEN undefined_column THEN
        -- no-op if column truly doesn't exist
        NULL;
    END;
    -- Avoid duplicate tier unique constraint if schema already enforces uniqueness
    UPDATE public.subscription_plans
      SET tier = 'free'::subscription_tier
    WHERE tier IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM public.subscription_plans
          WHERE tier = 'free'::subscription_tier
      );
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
END $$;

CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active, sort_order);

-- Table des abonnements utilisateurs
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL,

    -- Statut
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active',       -- Abonnement actif
        'trial',        -- Période d'essai
        'past_due',     -- Paiement en retard
        'cancelled',    -- Annulé (actif jusqu'à fin période)
        'expired',      -- Expiré
        'suspended',    -- Suspendu (problème paiement)
        'paused'        -- Mis en pause par l'utilisateur
    )),

    -- Période
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN (
        'monthly', 'quarterly', 'yearly', 'lifetime', 'trial'
    )),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,

    -- Paiement
    payment_method VARCHAR(30),
    last_payment_date TIMESTAMPTZ,
    next_payment_date TIMESTAMPTZ,
    amount_paid DECIMAL(10,2),

    -- Renouvellement
    auto_renew BOOLEAN DEFAULT true,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Un seul abonnement actif par utilisateur
    CONSTRAINT unique_active_subscription UNIQUE (user_id, status)
        DEFERRABLE INITIALLY DEFERRED
);

-- Ensure plan_id type matches subscription_plans.id and add FK safely
DO $$
DECLARE
    v_plan_id_type TEXT;
BEGIN
    SELECT data_type
    INTO v_plan_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscription_plans'
      AND column_name = 'id';

    -- Drop FK if it exists (type mismatch scenarios)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'user_subscriptions'
          AND constraint_name = 'user_subscriptions_plan_id_fkey'
    ) THEN
        ALTER TABLE public.user_subscriptions DROP CONSTRAINT user_subscriptions_plan_id_fkey;
    END IF;

    IF v_plan_id_type = 'integer' THEN
        -- If existing values are UUIDs, integer cast will fail; null them before casting
        ALTER TABLE public.user_subscriptions ALTER COLUMN plan_id DROP DEFAULT;
        UPDATE public.user_subscriptions SET plan_id = NULL;
        ALTER TABLE public.user_subscriptions
            ALTER COLUMN plan_id TYPE INTEGER USING NULL;
        ALTER TABLE public.user_subscriptions
            ADD CONSTRAINT user_subscriptions_plan_id_fkey
            FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);
    ELSE
        -- Default to UUID
        ALTER TABLE public.user_subscriptions
            ALTER COLUMN plan_id TYPE UUID USING plan_id::uuid;
        ALTER TABLE public.user_subscriptions
            ADD CONSTRAINT user_subscriptions_plan_id_fkey
            FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);
    END IF;
END $$;

CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_expiry ON user_subscriptions(current_period_end)
    WHERE status IN ('active', 'trial');

-- Table des paiements
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL,

    -- Montant
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MAD',
    discount_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,

    -- Méthode de paiement
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN (
        'card',             -- Carte bancaire (CMI, etc.)
        'cash',             -- Espèces (point de vente)
        'voucher',          -- Code promo/voucher
        'mobile_money',     -- Paiement mobile (Orange Money, etc.)
        'bank_transfer',    -- Virement bancaire
        'paypal',           -- PayPal
        'crypto',           -- Crypto (optionnel)
        'parent_approval',  -- Approbation parentale
        'school'            -- Via établissement scolaire
    )),

    -- Statut
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'processing',
        'completed',
        'failed',
        'refunded',
        'cancelled'
    )),

    -- Référence paiement externe
    external_reference VARCHAR(100),
    gateway_response JSONB,

    -- Période couverte
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,

    -- Facture
    invoice_number VARCHAR(50),
    invoice_url TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_subscription_payments_user ON subscription_payments(user_id, created_at DESC);
CREATE INDEX idx_subscription_payments_status ON subscription_payments(status);

-- Table des codes promo/vouchers
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,

    -- Type de réduction
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN (
        'percentage',   -- Pourcentage
        'fixed',        -- Montant fixe
        'trial_days',   -- Jours d'essai gratuit
        'free_months'   -- Mois gratuits
    )),
    discount_value DECIMAL(10,2) NOT NULL,

    -- Applicabilité
    applicable_plans UUID[], -- NULL = tous les plans
    applicable_cycles VARCHAR(20)[], -- NULL = tous les cycles

    -- Limites
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    max_uses_per_user INTEGER DEFAULT 1,

    -- Validité
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    -- Parrain (si code de parrainage)
    referrer_id UUID REFERENCES auth.users(id),
    referrer_reward_xp INTEGER DEFAULT 0,
    referrer_reward_tokens INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure legacy tables have new columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'promo_codes'
          AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.promo_codes ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code) WHERE is_active = true;

-- Table d'utilisation des codes promo
CREATE TABLE IF NOT EXISTS promo_code_uses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    payment_id UUID REFERENCES subscription_payments(id),

    discount_applied DECIMAL(10,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(promo_code_id, user_id)
);

-- Table des fonctionnalités premium
CREATE TABLE IF NOT EXISTS premium_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Catégorie
    category VARCHAR(30) CHECK (category IN (
        'social',       -- Fonctionnalités sociales
        'content',      -- Contenu exclusif
        'customization',-- Personnalisation
        'analytics',    -- Statistiques avancées
        'support',      -- Support prioritaire
        'rewards',      -- Récompenses bonus
        'storage',      -- Stockage cloud
        'ads'           -- Sans publicités
    )),

    -- Valeur par défaut pour gratuit
    free_limit INTEGER DEFAULT 0,

    -- Icône/visuel
    icon VARCHAR(50),

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table de liaison features-plans
CREATE TABLE IF NOT EXISTS plan_features (
    plan_id UUID NOT NULL,
    feature_id UUID NOT NULL REFERENCES premium_features(id) ON DELETE CASCADE,

    -- Valeur pour ce plan (NULL = illimité)
    limit_value INTEGER,
    is_enabled BOOLEAN DEFAULT true,

    PRIMARY KEY (plan_id, feature_id)
);

-- Table des demandes de paiement cash/parent
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL,

    -- Type de demande
    request_type VARCHAR(30) NOT NULL CHECK (request_type IN (
        'cash_payment',     -- Paiement en espèces
        'parent_approval',  -- Demande aux parents
        'school_payment',   -- Via école
        'gift'              -- Cadeau/don
    )),

    -- Montant
    amount DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,

    -- Statut
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'rejected',
        'expired',
        'completed'
    )),

    -- Approbateur (parent/admin)
    approver_email VARCHAR(255),
    approver_phone VARCHAR(20),
    approval_token VARCHAR(100),
    approved_by UUID,
    approved_at TIMESTAMPTZ,

    -- Point de vente (pour cash)
    pos_location VARCHAR(255),
    pos_reference VARCHAR(100),

    -- Expiration
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure plan_id type matches subscription_plans.id for dependent tables and add FKs safely
DO $$
DECLARE
    v_plan_id_type TEXT;
    v_nulls INTEGER;
BEGIN
    SELECT data_type
    INTO v_plan_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscription_plans'
      AND column_name = 'id';

    -- subscription_payments.plan_id
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'subscription_payments'
          AND constraint_name = 'subscription_payments_plan_id_fkey'
    ) THEN
        ALTER TABLE public.subscription_payments DROP CONSTRAINT subscription_payments_plan_id_fkey;
    END IF;

    IF v_plan_id_type = 'integer' THEN
        ALTER TABLE public.subscription_payments ALTER COLUMN plan_id DROP NOT NULL;
        ALTER TABLE public.subscription_payments ALTER COLUMN plan_id TYPE INTEGER USING NULL;
        SELECT COUNT(*) INTO v_nulls FROM public.subscription_payments WHERE plan_id IS NULL;
        IF v_nulls = 0 THEN
            ALTER TABLE public.subscription_payments ALTER COLUMN plan_id SET NOT NULL;
        END IF;
    ELSE
        ALTER TABLE public.subscription_payments ALTER COLUMN plan_id TYPE UUID USING plan_id::uuid;
    END IF;
    ALTER TABLE public.subscription_payments
        ADD CONSTRAINT subscription_payments_plan_id_fkey
        FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);

    -- plan_features.plan_id
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'plan_features'
          AND constraint_name = 'plan_features_plan_id_fkey'
    ) THEN
        ALTER TABLE public.plan_features DROP CONSTRAINT plan_features_plan_id_fkey;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'plan_features'
          AND constraint_name = 'plan_features_pkey'
    ) THEN
        ALTER TABLE public.plan_features DROP CONSTRAINT plan_features_pkey;
    END IF;

    IF v_plan_id_type = 'integer' THEN
        ALTER TABLE public.plan_features ALTER COLUMN plan_id DROP NOT NULL;
        ALTER TABLE public.plan_features ALTER COLUMN plan_id TYPE INTEGER USING NULL;
        SELECT COUNT(*) INTO v_nulls FROM public.plan_features WHERE plan_id IS NULL;
        IF v_nulls = 0 THEN
            ALTER TABLE public.plan_features ALTER COLUMN plan_id SET NOT NULL;
        END IF;
    ELSE
        ALTER TABLE public.plan_features ALTER COLUMN plan_id TYPE UUID USING plan_id::uuid;
    END IF;

    -- Recreate PK and FK for plan_features
    ALTER TABLE public.plan_features
        ADD CONSTRAINT plan_features_pkey PRIMARY KEY (plan_id, feature_id);
    ALTER TABLE public.plan_features
        ADD CONSTRAINT plan_features_plan_id_fkey
        FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;

    -- payment_requests.plan_id
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'payment_requests'
          AND constraint_name = 'payment_requests_plan_id_fkey'
    ) THEN
        ALTER TABLE public.payment_requests DROP CONSTRAINT payment_requests_plan_id_fkey;
    END IF;

    IF v_plan_id_type = 'integer' THEN
        ALTER TABLE public.payment_requests ALTER COLUMN plan_id DROP NOT NULL;
        ALTER TABLE public.payment_requests ALTER COLUMN plan_id TYPE INTEGER USING NULL;
        SELECT COUNT(*) INTO v_nulls FROM public.payment_requests WHERE plan_id IS NULL;
        IF v_nulls = 0 THEN
            ALTER TABLE public.payment_requests ALTER COLUMN plan_id SET NOT NULL;
        END IF;
    ELSE
        ALTER TABLE public.payment_requests ALTER COLUMN plan_id TYPE UUID USING plan_id::uuid;
    END IF;

    ALTER TABLE public.payment_requests
        ADD CONSTRAINT payment_requests_plan_id_fkey
        FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);
END $$;

CREATE INDEX idx_payment_requests_user ON payment_requests(user_id, status);
CREATE INDEX idx_payment_requests_token ON payment_requests(approval_token)
    WHERE status = 'pending';

-- Table des abonnements familiaux
CREATE TABLE IF NOT EXISTS family_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,

    -- Propriétaire de la famille
    owner_id UUID NOT NULL REFERENCES auth.users(id),

    -- Configuration
    max_members INTEGER DEFAULT 5,
    family_name VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membres de la famille
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES family_subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Rôle
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),

    -- Invitation
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,

    -- Statut
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'active', 'removed'
    )),

    UNIQUE(family_id, user_id)
);

-- =============================================
-- FONCTIONS
-- =============================================

-- Fonction pour vérifier si un utilisateur a un abonnement actif
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_subscriptions
        WHERE user_id = p_user_id
        AND status IN ('active', 'trial')
        AND (current_period_end IS NULL OR current_period_end > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir le plan actuel d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_id UUID,
    plan_code VARCHAR,
    plan_name VARCHAR,
    plan_type VARCHAR,
    status VARCHAR,
    current_period_end TIMESTAMPTZ,
    features JSONB,
    is_family_member BOOLEAN
) AS $$
BEGIN
    -- Vérifier d'abord un abonnement direct
    RETURN QUERY
    SELECT
        us.id as subscription_id,
        sp.id as plan_id,
        sp.code::VARCHAR as plan_code,
        sp.name::VARCHAR as plan_name,
        sp.plan_type::VARCHAR,
        us.status::VARCHAR,
        us.current_period_end,
        sp.features,
        false as is_family_member
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trial')
    AND (us.current_period_end IS NULL OR us.current_period_end > NOW())
    LIMIT 1;

    -- Si pas d'abonnement direct, vérifier famille
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            us.id as subscription_id,
            sp.id as plan_id,
            sp.code::VARCHAR as plan_code,
            sp.name::VARCHAR as plan_name,
            sp.plan_type::VARCHAR,
            us.status::VARCHAR,
            us.current_period_end,
            sp.features,
            true as is_family_member
        FROM family_members fm
        JOIN family_subscriptions fs ON fm.family_id = fs.id
        JOIN user_subscriptions us ON fs.subscription_id = us.id
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE fm.user_id = p_user_id
        AND fm.status = 'active'
        AND us.status IN ('active', 'trial')
        AND (us.current_period_end IS NULL OR us.current_period_end > NOW())
        LIMIT 1;
    END IF;

    -- Si toujours pas trouvé, retourner le plan gratuit
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            NULL::UUID as subscription_id,
            sp.id as plan_id,
            sp.code::VARCHAR as plan_code,
            sp.name::VARCHAR as plan_name,
            sp.plan_type::VARCHAR,
            'active'::VARCHAR as status,
            NULL::TIMESTAMPTZ as current_period_end,
            sp.features,
            false as is_family_member
        FROM subscription_plans sp
        WHERE sp.plan_type = 'free'
        AND sp.is_active = true
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer un abonnement
CREATE OR REPLACE FUNCTION create_subscription(
    p_user_id UUID,
    p_plan_id UUID,
    p_billing_cycle VARCHAR,
    p_payment_method VARCHAR,
    p_promo_code VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_plan subscription_plans%ROWTYPE;
    v_subscription_id UUID;
    v_amount DECIMAL(10,2);
    v_discount DECIMAL(10,2) := 0;
    v_promo promo_codes%ROWTYPE;
    v_period_end TIMESTAMPTZ;
    v_trial_end TIMESTAMPTZ;
BEGIN
    -- Récupérer le plan
    SELECT * INTO v_plan FROM subscription_plans WHERE id = p_plan_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
    END IF;

    -- Calculer le montant
    CASE p_billing_cycle
        WHEN 'monthly' THEN
            v_amount := v_plan.price_monthly;
            v_period_end := NOW() + INTERVAL '1 month';
        WHEN 'quarterly' THEN
            v_amount := v_plan.price_quarterly;
            v_period_end := NOW() + INTERVAL '3 months';
        WHEN 'yearly' THEN
            v_amount := v_plan.price_yearly;
            v_period_end := NOW() + INTERVAL '1 year';
        WHEN 'lifetime' THEN
            v_amount := v_plan.price_lifetime;
            v_period_end := NULL;
        WHEN 'trial' THEN
            v_amount := 0;
            v_period_end := NOW() + (v_plan.trial_days || ' days')::INTERVAL;
            v_trial_end := v_period_end;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Invalid billing cycle');
    END CASE;

    -- Appliquer le code promo si fourni
    IF p_promo_code IS NOT NULL THEN
        SELECT * INTO v_promo
        FROM promo_codes
        WHERE code = p_promo_code
        AND is_active = true
        AND (valid_until IS NULL OR valid_until > NOW())
        AND (max_uses IS NULL OR current_uses < max_uses);

        IF FOUND THEN
            -- Vérifier si déjà utilisé par cet utilisateur
            IF NOT EXISTS (SELECT 1 FROM promo_code_uses WHERE promo_code_id = v_promo.id AND user_id = p_user_id) THEN
                CASE v_promo.discount_type
                    WHEN 'percentage' THEN
                        v_discount := v_amount * (v_promo.discount_value / 100);
                    WHEN 'fixed' THEN
                        v_discount := LEAST(v_promo.discount_value, v_amount);
                    WHEN 'trial_days' THEN
                        v_trial_end := NOW() + (v_promo.discount_value || ' days')::INTERVAL;
                        v_period_end := v_trial_end;
                    WHEN 'free_months' THEN
                        v_period_end := v_period_end + (v_promo.discount_value || ' months')::INTERVAL;
                END CASE;

                -- Enregistrer l'utilisation
                INSERT INTO promo_code_uses (promo_code_id, user_id, discount_applied)
                VALUES (v_promo.id, p_user_id, v_discount);

                UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo.id;

                -- Récompenser le parrain si applicable
                IF v_promo.referrer_id IS NOT NULL THEN
                    UPDATE auth.users SET
                        xp = xp + v_promo.referrer_reward_xp
                    WHERE id = v_promo.referrer_id;
                END IF;
            END IF;
        END IF;
    END IF;

    -- Annuler les anciens abonnements actifs
    UPDATE user_subscriptions
    SET status = 'expired', updated_at = NOW()
    WHERE user_id = p_user_id AND status IN ('active', 'trial');

    -- Créer l'abonnement
    INSERT INTO user_subscriptions (
        user_id, plan_id, status, billing_cycle,
        current_period_start, current_period_end, trial_end,
        payment_method, amount_paid
    )
    VALUES (
        p_user_id, p_plan_id,
        CASE WHEN v_trial_end IS NOT NULL THEN 'trial' ELSE 'active' END,
        p_billing_cycle,
        NOW(), v_period_end, v_trial_end,
        p_payment_method, v_amount - v_discount
    )
    RETURNING id INTO v_subscription_id;

    -- Mettre à jour l'utilisateur
    UPDATE auth.users SET
        is_premium = true,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Notification
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        p_user_id,
        'subscription',
        'Bienvenue en Premium!',
        'Ton abonnement ' || v_plan.name || ' est maintenant actif.',
        jsonb_build_object('subscription_id', v_subscription_id, 'plan', v_plan.name)
    );

    RETURN jsonb_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'amount', v_amount - v_discount,
        'discount', v_discount,
        'period_end', v_period_end,
        'is_trial', v_trial_end IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour annuler un abonnement
CREATE OR REPLACE FUNCTION cancel_subscription(
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_immediate BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_subscription user_subscriptions%ROWTYPE;
BEGIN
    SELECT * INTO v_subscription
    FROM user_subscriptions
    WHERE user_id = p_user_id AND status IN ('active', 'trial')
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active subscription');
    END IF;

    IF p_immediate THEN
        UPDATE user_subscriptions SET
            status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = p_reason,
            updated_at = NOW()
        WHERE id = v_subscription.id;

        UPDATE auth.users SET is_premium = false WHERE id = p_user_id;
    ELSE
        UPDATE user_subscriptions SET
            cancel_at_period_end = true,
            cancelled_at = NOW(),
            cancellation_reason = p_reason,
            auto_renew = false,
            updated_at = NOW()
        WHERE id = v_subscription.id;
    END IF;

    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        p_user_id,
        'subscription',
        'Abonnement annulé',
        CASE WHEN p_immediate
            THEN 'Ton abonnement a été annulé immédiatement.'
            ELSE 'Ton abonnement sera actif jusqu''au ' || to_char(v_subscription.current_period_end, 'DD/MM/YYYY')
        END,
        jsonb_build_object('subscription_id', v_subscription.id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'effective_date', CASE WHEN p_immediate THEN NOW() ELSE v_subscription.current_period_end END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier l'accès à une fonctionnalité
CREATE OR REPLACE FUNCTION check_feature_access(
    p_user_id UUID,
    p_feature_code VARCHAR
)
RETURNS JSONB AS $$
DECLARE
    v_plan RECORD;
    v_feature premium_features%ROWTYPE;
    v_limit INTEGER;
BEGIN
    -- Récupérer le plan de l'utilisateur
    SELECT * INTO v_plan FROM get_user_plan(p_user_id);

    -- Récupérer la fonctionnalité
    SELECT * INTO v_feature FROM premium_features WHERE code = p_feature_code;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('has_access', false, 'error', 'Feature not found');
    END IF;

    -- Vérifier dans les features du plan
    IF v_plan.features ? p_feature_code THEN
        v_limit := (v_plan.features->>p_feature_code)::INTEGER;

        IF v_limit IS NULL OR v_limit = -1 THEN
            RETURN jsonb_build_object('has_access', true, 'unlimited', true);
        ELSE
            RETURN jsonb_build_object('has_access', true, 'limit', v_limit);
        END IF;
    END IF;

    -- Utiliser la limite gratuite par défaut
    RETURN jsonb_build_object(
        'has_access', v_feature.free_limit > 0,
        'limit', v_feature.free_limit,
        'is_free_tier', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DONNÉES INITIALES
-- =============================================

-- Plans par défaut (adaptation selon enum subscription_tier)
DO $$
DECLARE
    has_tier_type BOOLEAN;
    has_starter BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier')
    INTO has_tier_type;

    IF has_tier_type THEN
        SELECT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'subscription_tier' AND e.enumlabel = 'starter'
        ) INTO has_starter;

        IF has_starter THEN
            INSERT INTO subscription_plans (code, name, name_ar, description, tier, plan_type, price_monthly, price_quarterly, price_yearly, discount_quarterly_percent, discount_yearly_percent, features, color, badge_label, trial_days, is_featured, sort_order)
            VALUES
                ('free', 'Gratuit', 'مجاني', 'Accès de base à TeensParty', 'free'::subscription_tier, 'free', 0, 0, 0, 0, 0,
                 '{"max_circles": 2, "max_circle_members": 10, "daily_challenges": 3, "cloud_storage_mb": 100, "ad_free": false, "xp_multiplier": 1.0}'::jsonb,
                 '#6b7280', NULL, 0, false, 0),

                ('starter', 'Starter', 'ستارتر', 'Pour bien commencer', 'starter'::subscription_tier, 'starter', 29, 79, 290, 10, 17,
                 '{"max_circles": 5, "max_circle_members": 25, "daily_challenges": 5, "cloud_storage_mb": 500, "ad_free": true, "xp_multiplier": 1.2, "custom_avatar": true}'::jsonb,
                 '#3b82f6', NULL, 7, false, 1),

                ('pro', 'Pro', 'برو', 'Le plus populaire', 'pro'::subscription_tier, 'pro', 49, 129, 490, 12, 17,
                 '{"max_circles": 10, "max_circle_members": 50, "daily_challenges": 10, "cloud_storage_mb": 2000, "ad_free": true, "xp_multiplier": 1.5, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "analytics_dashboard": true}'::jsonb,
                 '#8b5cf6', 'POPULAIRE', 7, true, 2),

                ('elite', 'Elite', 'إيليت', 'Pour les champions', 'elite'::subscription_tier, 'elite', 99, 269, 990, 10, 17,
                 '{"max_circles": -1, "max_circle_members": 100, "daily_challenges": -1, "cloud_storage_mb": 10000, "ad_free": true, "xp_multiplier": 2.0, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "analytics_dashboard": true, "custom_themes": true, "early_access": true, "vip_events": true}'::jsonb,
                 '#f59e0b', 'ELITE', 14, false, 3),

                ('family', 'Famille', 'عائلة', 'Jusqu''à 5 membres', 'family'::subscription_tier, 'family', 79, 219, 790, 8, 17,
                 '{"max_circles": 10, "max_circle_members": 50, "daily_challenges": 10, "cloud_storage_mb": 5000, "ad_free": true, "xp_multiplier": 1.5, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "max_family_members": 5}'::jsonb,
                 '#ec4899', 'FAMILLE', 7, false, 4)
            ON CONFLICT DO NOTHING;
        ELSE
            INSERT INTO subscription_plans (code, name, name_ar, description, tier, plan_type, price_monthly, price_quarterly, price_yearly, discount_quarterly_percent, discount_yearly_percent, features, color, badge_label, trial_days, is_featured, sort_order)
            VALUES
                ('free', 'Gratuit', 'مجاني', 'Accès de base à TeensParty', 'free'::subscription_tier, 'free', 0, 0, 0, 0, 0,
                 '{"max_circles": 2, "max_circle_members": 10, "daily_challenges": 3, "cloud_storage_mb": 100, "ad_free": false, "xp_multiplier": 1.0}'::jsonb,
                 '#6b7280', NULL, 0, false, 0),

                ('starter', 'Starter', 'ستارتر', 'Pour bien commencer', 'silver'::subscription_tier, 'starter', 29, 79, 290, 10, 17,
                 '{"max_circles": 5, "max_circle_members": 25, "daily_challenges": 5, "cloud_storage_mb": 500, "ad_free": true, "xp_multiplier": 1.2, "custom_avatar": true}'::jsonb,
                 '#3b82f6', NULL, 7, false, 1),

                ('pro', 'Pro', 'برو', 'Le plus populaire', 'gold'::subscription_tier, 'pro', 49, 129, 490, 12, 17,
                 '{"max_circles": 10, "max_circle_members": 50, "daily_challenges": 10, "cloud_storage_mb": 2000, "ad_free": true, "xp_multiplier": 1.5, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "analytics_dashboard": true}'::jsonb,
                 '#8b5cf6', 'POPULAIRE', 7, true, 2),

                ('elite', 'Elite', 'إيليت', 'Pour les champions', 'platinum'::subscription_tier, 'elite', 99, 269, 990, 10, 17,
                 '{"max_circles": -1, "max_circle_members": 100, "daily_challenges": -1, "cloud_storage_mb": 10000, "ad_free": true, "xp_multiplier": 2.0, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "analytics_dashboard": true, "custom_themes": true, "early_access": true, "vip_events": true}'::jsonb,
                 '#f59e0b', 'ELITE', 14, false, 3),

                ('family', 'Famille', 'عائلة', 'Jusqu''à 5 membres', 'gold'::subscription_tier, 'family', 79, 219, 790, 8, 17,
                 '{"max_circles": 10, "max_circle_members": 50, "daily_challenges": 10, "cloud_storage_mb": 5000, "ad_free": true, "xp_multiplier": 1.5, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "max_family_members": 5}'::jsonb,
                 '#ec4899', 'FAMILLE', 7, false, 4)
            ON CONFLICT DO NOTHING;
        END IF;
    ELSE
        INSERT INTO subscription_plans (code, name, name_ar, description, tier, plan_type, price_monthly, price_quarterly, price_yearly, discount_quarterly_percent, discount_yearly_percent, features, color, badge_label, trial_days, is_featured, sort_order)
        VALUES
            ('free', 'Gratuit', 'مجاني', 'Accès de base à TeensParty', 'free', 'free', 0, 0, 0, 0, 0,
             '{"max_circles": 2, "max_circle_members": 10, "daily_challenges": 3, "cloud_storage_mb": 100, "ad_free": false, "xp_multiplier": 1.0}'::jsonb,
             '#6b7280', NULL, 0, false, 0),

            ('starter', 'Starter', 'ستارتر', 'Pour bien commencer', 'starter', 'starter', 29, 79, 290, 10, 17,
             '{"max_circles": 5, "max_circle_members": 25, "daily_challenges": 5, "cloud_storage_mb": 500, "ad_free": true, "xp_multiplier": 1.2, "custom_avatar": true}'::jsonb,
             '#3b82f6', NULL, 7, false, 1),

            ('pro', 'Pro', 'برو', 'Le plus populaire', 'pro', 'pro', 49, 129, 490, 12, 17,
             '{"max_circles": 10, "max_circle_members": 50, "daily_challenges": 10, "cloud_storage_mb": 2000, "ad_free": true, "xp_multiplier": 1.5, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "analytics_dashboard": true}'::jsonb,
             '#8b5cf6', 'POPULAIRE', 7, true, 2),

            ('elite', 'Elite', 'إيليت', 'Pour les champions', 'elite', 'elite', 99, 269, 990, 10, 17,
             '{"max_circles": -1, "max_circle_members": 100, "daily_challenges": -1, "cloud_storage_mb": 10000, "ad_free": true, "xp_multiplier": 2.0, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "analytics_dashboard": true, "custom_themes": true, "early_access": true, "vip_events": true}'::jsonb,
             '#f59e0b', 'ELITE', 14, false, 3),

            ('family', 'Famille', 'عائلة', 'Jusqu''à 5 membres', 'family', 'family', 79, 219, 790, 8, 17,
             '{"max_circles": 10, "max_circle_members": 50, "daily_challenges": 10, "cloud_storage_mb": 5000, "ad_free": true, "xp_multiplier": 1.5, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "max_family_members": 5}'::jsonb,
             '#ec4899', 'FAMILLE', 7, false, 4)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Fonctionnalités premium
INSERT INTO premium_features (code, name, description, category, free_limit, icon)
VALUES
    ('max_circles', 'Cercles d''amis', 'Nombre max de cercles', 'social', 2, 'users'),
    ('daily_challenges', 'Défis quotidiens', 'Défis par jour', 'content', 3, 'target'),
    ('cloud_storage_mb', 'Stockage cloud', 'Espace de stockage en MB', 'storage', 100, 'cloud'),
    ('xp_multiplier', 'Multiplicateur XP', 'Bonus d''XP', 'rewards', 0, 'zap'),
    ('ad_free', 'Sans publicités', 'Navigation sans pubs', 'ads', 0, 'eye-off'),
    ('custom_avatar', 'Avatar personnalisé', 'Avatars exclusifs', 'customization', 0, 'user'),
    ('priority_support', 'Support prioritaire', 'Assistance rapide', 'support', 0, 'headphones'),
    ('exclusive_badges', 'Badges exclusifs', 'Badges premium', 'rewards', 0, 'award'),
    ('analytics_dashboard', 'Tableau de bord', 'Stats avancées', 'analytics', 0, 'bar-chart'),
    ('custom_themes', 'Thèmes personnalisés', 'Thèmes exclusifs', 'customization', 0, 'palette')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their subscriptions" ON user_subscriptions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their payments" ON subscription_payments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their promo uses" ON promo_code_uses
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their payment requests" ON payment_requests
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view their family membership" ON family_members
    FOR SELECT USING (user_id = auth.uid());

-- Plans visibles par tous
CREATE POLICY "Anyone can view active plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

-- Features visibles par tous
CREATE POLICY "Anyone can view features" ON premium_features
    FOR SELECT USING (is_active = true);

-- =============================================
-- TRIGGER POUR EXPIRATION
-- =============================================

CREATE OR REPLACE FUNCTION check_subscription_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Marquer comme expiré si la période est terminée
    IF NEW.current_period_end IS NOT NULL AND NEW.current_period_end < NOW() THEN
        IF NEW.cancel_at_period_end OR NOT NEW.auto_renew THEN
            NEW.status := 'expired';
            -- Retirer le statut premium
            UPDATE auth.users SET is_premium = false WHERE id = NEW.user_id;
        ELSE
            NEW.status := 'past_due';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_subscription_expiry
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION check_subscription_expiry();


-- ============================================================================
-- 028_tokens_rewards_system.sql
-- ============================================================================
-- =============================================
-- MIGRATION 028: Tokens & Rewards System
-- =============================================
-- Système d'économie virtuelle avec tokens échangeables
-- Compatible avec user_coins, user_xp, shop_rewards existants
-- =============================================

-- =============================================
-- PARTIE 1: EXTENSION DE LA TABLE USER_COINS
-- =============================================

-- Ajouter de nouvelles colonnes à user_coins existante
DO $$
BEGIN
    -- Tokens premium (gagnés via abonnement, events spéciaux)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_coins' AND column_name = 'premium_tokens') THEN
        ALTER TABLE public.user_coins ADD COLUMN premium_tokens INTEGER DEFAULT 0;
    END IF;

    -- Tokens saisonniers (events, promotions limitées)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_coins' AND column_name = 'seasonal_tokens') THEN
        ALTER TABLE public.user_coins ADD COLUMN seasonal_tokens INTEGER DEFAULT 0;
    END IF;

    -- Tokens en attente (pending from activities)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_coins' AND column_name = 'pending_tokens') THEN
        ALTER TABLE public.user_coins ADD COLUMN pending_tokens INTEGER DEFAULT 0;
    END IF;

    -- Multiplicateur de tokens (from premium)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_coins' AND column_name = 'token_multiplier') THEN
        ALTER TABLE public.user_coins ADD COLUMN token_multiplier DECIMAL(3,2) DEFAULT 1.00;
    END IF;

    -- Total lifetime (tous types confondus)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_coins' AND column_name = 'total_lifetime_tokens') THEN
        ALTER TABLE public.user_coins ADD COLUMN total_lifetime_tokens INTEGER DEFAULT 0;
    END IF;
END $$;

-- =============================================
-- PARTIE 2: TABLE TOKEN_TYPES (Types de tokens)
-- =============================================

CREATE TABLE IF NOT EXISTS token_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    icon VARCHAR(50) DEFAULT 'coins',
    color VARCHAR(20) DEFAULT '#FFD700',

    -- Valeur relative (1 premium = X regular)
    exchange_rate DECIMAL(5,2) DEFAULT 1.00,

    -- Expiration (pour tokens saisonniers)
    expires_days INTEGER, -- NULL = jamais

    -- Disponibilité
    is_tradeable BOOLEAN DEFAULT true,
    is_purchasable BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure category constraint matches current allowed values
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'token_rewards'
          AND constraint_name = 'token_rewards_category_check'
    ) THEN
        ALTER TABLE public.token_rewards DROP CONSTRAINT token_rewards_category_check;
    END IF;
    ALTER TABLE public.token_rewards ADD CONSTRAINT token_rewards_category_check CHECK (category IN (
        'digital',
        'physical',
        'experience',
        'discount',
        'premium',
        'donation',
        'raffle'
    ));
END $$;

-- Tokens par défaut
INSERT INTO token_types (code, name, description, icon, color, exchange_rate, is_tradeable)
VALUES
    ('regular', 'Tokens', 'Tokens standards gagnés par activités', 'coins', '#FFD700', 1.00, true),
    ('premium', 'Tokens Premium', 'Tokens premium pour récompenses exclusives', 'gem', '#9333EA', 5.00, true),
    ('seasonal', 'Tokens Saison', 'Tokens limités de la saison actuelle', 'sparkles', '#EC4899', 2.00, false),
    ('gift', 'Tokens Cadeau', 'Tokens reçus en cadeau', 'gift', '#10B981', 1.00, false)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- PARTIE 3: TABLE TOKEN_SOURCES (Comment gagner)
-- =============================================

CREATE TABLE IF NOT EXISTS token_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Récompense
    token_type VARCHAR(50) DEFAULT 'regular' REFERENCES token_types(code),
    base_amount INTEGER NOT NULL,

    -- Limites
    daily_limit INTEGER, -- NULL = illimité
    weekly_limit INTEGER,
    monthly_limit INTEGER,

    -- Bonus premium
    premium_multiplier DECIMAL(3,2) DEFAULT 1.00,

    -- Cooldown (minutes)
    cooldown_minutes INTEGER DEFAULT 0,

    -- Conditions
    min_level INTEGER DEFAULT 1,
    required_subscription VARCHAR(30), -- NULL = tous

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure legacy tables have new columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'token_sources'
          AND column_name = 'premium_multiplier'
    ) THEN
        ALTER TABLE public.token_sources ADD COLUMN premium_multiplier DECIMAL(3,2) DEFAULT 1.00;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'token_sources'
          AND column_name = 'cooldown_minutes'
    ) THEN
        ALTER TABLE public.token_sources ADD COLUMN cooldown_minutes INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'token_sources'
          AND column_name = 'min_level'
    ) THEN
        ALTER TABLE public.token_sources ADD COLUMN min_level INTEGER DEFAULT 1;
    END IF;
END $$;

-- Sources de tokens
INSERT INTO token_sources (code, name, description, base_amount, daily_limit, premium_multiplier, cooldown_minutes, min_level)
VALUES
    ('daily_login', 'Connexion quotidienne', 'Bonus de connexion journalier', 10, 1, 2.0, 1440, 1),
    ('streak_bonus', 'Bonus série', 'Bonus pour maintenir une série', 5, 1, 2.0, 1440, 1),
    ('challenge_complete', 'Défi complété', 'Récompense pour compléter un défi', 25, 10, 1.5, 0, 1),
    ('achievement_unlock', 'Badge débloqué', 'Récompense pour un nouveau badge', 50, NULL, 1.5, 0, 1),
    ('level_up', 'Montée de niveau', 'Bonus par niveau gagné', 100, NULL, 2.0, 0, 1),
    ('creation_shared', 'Création partagée', 'Partager une création', 15, 5, 1.5, 60, 3),
    ('post_liked', 'Post aimé', 'Quand ton post reçoit un like', 2, 50, 1.0, 0, 1),
    ('comment_received', 'Commentaire reçu', 'Quand ton post reçoit un commentaire', 3, 30, 1.0, 0, 1),
    ('friend_referral', 'Parrainage ami', 'Quand un ami rejoint via ton lien', 200, 5, 2.0, 0, 5),
    ('event_participation', 'Participation event', 'Participer à un événement', 75, 3, 1.5, 0, 1),
    ('quiz_correct', 'Quiz réussi', 'Bonne réponse au quiz', 5, 20, 1.0, 0, 1),
    ('homework_help', 'Aide devoir', 'Aider un ami avec ses devoirs', 30, 5, 1.5, 30, 5),
    ('sport_activity', 'Activité sportive', 'Compléter une activité sportive', 20, 5, 1.5, 0, 1),
    ('weekly_bonus', 'Bonus hebdomadaire', 'Bonus de connexion 7 jours', 100, NULL, 2.0, 10080, 1),
    ('monthly_bonus', 'Bonus mensuel', 'Bonus de connexion 30 jours', 500, NULL, 2.0, 43200, 1)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- PARTIE 4: TABLE TOKEN_TRANSACTIONS (Historique)
-- =============================================

CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teen_id UUID NOT NULL,

    -- Type de transaction
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
        'earn',         -- Gagné via activité
        'spend',        -- Dépensé en boutique
        'transfer_in',  -- Reçu d'un autre utilisateur
        'transfer_out', -- Envoyé à un autre utilisateur
        'exchange',     -- Échangé (conversion type)
        'purchase',     -- Acheté (real money)
        'bonus',        -- Bonus système
        'refund',       -- Remboursement
        'expire'        -- Expiration tokens saisonniers
    )),

    -- Montant et type
    token_type VARCHAR(50) DEFAULT 'regular',
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,

    -- Source
    source_code VARCHAR(50),
    source_id UUID,
    description TEXT,

    -- Multiplicateur appliqué
    multiplier_applied DECIMAL(3,2) DEFAULT 1.00,

    -- Référence autre utilisateur (pour transferts)
    related_user_id UUID,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_transactions_teen ON token_transactions(teen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_source ON token_transactions(source_code);

-- =============================================
-- PARTIE 5: TABLE TOKEN_LIMITS_TRACKING
-- =============================================

CREATE TABLE IF NOT EXISTS token_limits_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teen_id UUID NOT NULL,
    source_code VARCHAR(50) NOT NULL,

    -- Compteurs
    daily_count INTEGER DEFAULT 0,
    weekly_count INTEGER DEFAULT 0,
    monthly_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,

    -- Dernière utilisation
    last_used_at TIMESTAMPTZ,

    -- Reset dates
    daily_reset_at DATE DEFAULT CURRENT_DATE,
    weekly_reset_at DATE DEFAULT date_trunc('week', CURRENT_DATE)::DATE,
    monthly_reset_at DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,

    UNIQUE(teen_id, source_code)
);

-- =============================================
-- PARTIE 6: TABLE TOKEN_REWARDS (Récompenses échangeables)
-- =============================================

CREATE TABLE IF NOT EXISTS token_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    description TEXT,
    image_url TEXT,
    icon VARCHAR(50) DEFAULT 'gift',

    -- Coût
    token_cost INTEGER NOT NULL,
    token_type VARCHAR(50) DEFAULT 'regular',

    -- Catégorie
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'digital',      -- Items numériques (avatars, thèmes)
        'physical',     -- Goodies physiques
        'experience',   -- Expériences
        'discount',     -- Réductions
        'premium',      -- Accès premium
        'donation',     -- Don à une cause
        'raffle'        -- Participation tirage
    )),

    -- Stock
    stock_type VARCHAR(20) DEFAULT 'unlimited' CHECK (stock_type IN ('unlimited', 'limited', 'unique')),
    stock_quantity INTEGER,
    stock_remaining INTEGER,

    -- Restrictions
    min_level INTEGER DEFAULT 1,
    premium_only BOOLEAN DEFAULT false,
    max_per_user INTEGER, -- NULL = illimité

    -- Disponibilité
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Livraison (pour physiques)
    requires_shipping BOOLEAN DEFAULT false,
    shipping_zones TEXT[], -- ['MA', 'FR', 'ES']

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_rewards_category ON token_rewards(category, is_active);
CREATE INDEX IF NOT EXISTS idx_token_rewards_featured ON token_rewards(is_featured) WHERE is_active = true;

-- =============================================
-- PARTIE 7: TABLE TOKEN_REDEMPTIONS (Échanges)
-- =============================================

CREATE TABLE IF NOT EXISTS token_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teen_id UUID NOT NULL,
    reward_id UUID NOT NULL REFERENCES token_rewards(id),

    -- Coût payé
    tokens_spent INTEGER NOT NULL,
    token_type VARCHAR(50),

    -- Statut
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- En attente de traitement
        'processing',   -- En cours
        'shipped',      -- Expédié (physique)
        'completed',    -- Terminé
        'cancelled',    -- Annulé
        'refunded'      -- Remboursé
    )),

    -- Livraison (si applicable)
    shipping_address JSONB,
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    -- Code/Voucher (si numérique)
    redemption_code VARCHAR(100),
    expires_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_token_redemptions_teen ON token_redemptions(teen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_redemptions_status ON token_redemptions(status);

-- =============================================
-- PARTIE 8: TABLE TOKEN_TRANSFERS (Transferts)
-- =============================================

CREATE TABLE IF NOT EXISTS token_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,

    -- Montant
    token_type VARCHAR(50) DEFAULT 'regular',
    amount INTEGER NOT NULL,

    -- Message optionnel
    message TEXT,

    -- Statut
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN (
        'pending', 'completed', 'cancelled', 'refunded'
    )),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT different_users CHECK (sender_id != receiver_id)
);

CREATE INDEX idx_token_transfers_sender ON token_transfers(sender_id, created_at DESC);
CREATE INDEX idx_token_transfers_receiver ON token_transfers(receiver_id, created_at DESC);

-- =============================================
-- PARTIE 9: TABLE DAILY_BONUSES
-- =============================================

CREATE TABLE IF NOT EXISTS daily_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teen_id UUID NOT NULL UNIQUE,

    -- Streak de connexion
    login_streak INTEGER DEFAULT 0,
    last_login_date DATE,

    -- Bonus collectés ce mois
    monthly_bonuses_claimed INTEGER DEFAULT 0,
    monthly_reset_at DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,

    -- Roue de la fortune (1 spin gratuit/jour)
    last_free_spin DATE,
    paid_spins_today INTEGER DEFAULT 0,

    -- Bonus hebdo collecté
    weekly_bonus_claimed_at DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PARTIE 10: FONCTIONS
-- =============================================

-- Fonction pour ajouter des tokens (intégrée avec existant)
CREATE OR REPLACE FUNCTION add_tokens_to_user(
    p_teen_id UUID,
    p_amount INTEGER,
    p_source_code VARCHAR(50),
    p_token_type VARCHAR(50) DEFAULT 'regular',
    p_source_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_force_no_limit BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_source token_sources%ROWTYPE;
    v_tracking token_limits_tracking%ROWTYPE;
    v_user_coins user_coins%ROWTYPE;
    v_final_amount INTEGER;
    v_multiplier DECIMAL(3,2) := 1.00;
    v_is_premium BOOLEAN := false;
    v_new_balance INTEGER;
    v_limit_reached BOOLEAN := false;
BEGIN
    -- Vérifier si source existe
    SELECT * INTO v_source FROM token_sources WHERE code = p_source_code AND is_active = true;

    -- Récupérer/créer user_coins
    INSERT INTO user_coins (teen_id, balance, premium_tokens, seasonal_tokens)
    VALUES (p_teen_id, 0, 0, 0)
    ON CONFLICT (teen_id) DO NOTHING;

    SELECT * INTO v_user_coins FROM user_coins WHERE teen_id = p_teen_id;

    -- Vérifier si premium (via user_subscriptions)
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = p_teen_id
        AND us.status IN ('active', 'trial')
        AND sp.plan_type != 'free'
    ) INTO v_is_premium;

    -- Calculer multiplicateur
    v_multiplier := COALESCE(v_user_coins.token_multiplier, 1.00);
    IF v_is_premium AND v_source.premium_multiplier IS NOT NULL THEN
        v_multiplier := v_multiplier * v_source.premium_multiplier;
    END IF;

    -- Vérifier les limites (sauf si forcé)
    IF v_source.id IS NOT NULL AND NOT p_force_no_limit THEN
        -- Récupérer/créer tracking
        INSERT INTO token_limits_tracking (teen_id, source_code)
        VALUES (p_teen_id, p_source_code)
        ON CONFLICT (teen_id, source_code) DO UPDATE SET
            daily_count = CASE
                WHEN token_limits_tracking.daily_reset_at < CURRENT_DATE THEN 0
                ELSE token_limits_tracking.daily_count
            END,
            daily_reset_at = CURRENT_DATE,
            weekly_count = CASE
                WHEN token_limits_tracking.weekly_reset_at < date_trunc('week', CURRENT_DATE)::DATE THEN 0
                ELSE token_limits_tracking.weekly_count
            END,
            weekly_reset_at = date_trunc('week', CURRENT_DATE)::DATE,
            monthly_count = CASE
                WHEN token_limits_tracking.monthly_reset_at < date_trunc('month', CURRENT_DATE)::DATE THEN 0
                ELSE token_limits_tracking.monthly_count
            END,
            monthly_reset_at = date_trunc('month', CURRENT_DATE)::DATE;

        SELECT * INTO v_tracking FROM token_limits_tracking
        WHERE teen_id = p_teen_id AND source_code = p_source_code;

        -- Vérifier limites
        IF v_source.daily_limit IS NOT NULL AND v_tracking.daily_count >= v_source.daily_limit THEN
            v_limit_reached := true;
        END IF;
        IF v_source.weekly_limit IS NOT NULL AND v_tracking.weekly_count >= v_source.weekly_limit THEN
            v_limit_reached := true;
        END IF;
        IF v_source.monthly_limit IS NOT NULL AND v_tracking.monthly_count >= v_source.monthly_limit THEN
            v_limit_reached := true;
        END IF;

        -- Vérifier cooldown
        IF v_source.cooldown_minutes > 0 AND v_tracking.last_used_at IS NOT NULL THEN
            IF v_tracking.last_used_at + (v_source.cooldown_minutes || ' minutes')::INTERVAL > NOW() THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'cooldown_active',
                    'cooldown_remaining', EXTRACT(EPOCH FROM (v_tracking.last_used_at + (v_source.cooldown_minutes || ' minutes')::INTERVAL - NOW()))::INTEGER
                );
            END IF;
        END IF;

        IF v_limit_reached THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'limit_reached',
                'daily_count', v_tracking.daily_count,
                'daily_limit', v_source.daily_limit
            );
        END IF;
    END IF;

    -- Calculer montant final
    v_final_amount := FLOOR(COALESCE(
        CASE WHEN v_source.id IS NOT NULL THEN v_source.base_amount ELSE p_amount END,
        p_amount
    ) * v_multiplier);

    -- Mettre à jour le solde selon le type
    CASE p_token_type
        WHEN 'premium' THEN
            UPDATE user_coins SET
                premium_tokens = premium_tokens + v_final_amount,
                total_lifetime_tokens = total_lifetime_tokens + v_final_amount,
                updated_at = NOW()
            WHERE teen_id = p_teen_id
            RETURNING premium_tokens INTO v_new_balance;

        WHEN 'seasonal' THEN
            UPDATE user_coins SET
                seasonal_tokens = seasonal_tokens + v_final_amount,
                total_lifetime_tokens = total_lifetime_tokens + v_final_amount,
                updated_at = NOW()
            WHERE teen_id = p_teen_id
            RETURNING seasonal_tokens INTO v_new_balance;

        ELSE -- regular
            UPDATE user_coins SET
                balance = balance + v_final_amount,
                lifetime_earned = lifetime_earned + v_final_amount,
                total_lifetime_tokens = total_lifetime_tokens + v_final_amount,
                updated_at = NOW()
            WHERE teen_id = p_teen_id
            RETURNING balance INTO v_new_balance;
    END CASE;

    -- Enregistrer la transaction
    INSERT INTO token_transactions (
        teen_id, transaction_type, token_type, amount, balance_after,
        source_code, source_id, description, multiplier_applied
    )
    VALUES (
        p_teen_id, 'earn', p_token_type, v_final_amount, v_new_balance,
        p_source_code, p_source_id, p_description, v_multiplier
    );

    -- Mettre à jour le tracking
    IF v_source.id IS NOT NULL THEN
        UPDATE token_limits_tracking SET
            daily_count = daily_count + 1,
            weekly_count = weekly_count + 1,
            monthly_count = monthly_count + 1,
            total_count = total_count + 1,
            last_used_at = NOW()
        WHERE teen_id = p_teen_id AND source_code = p_source_code;
    END IF;

    -- Aussi ajouter à coin_transactions pour compatibilité
    INSERT INTO coin_transactions (
        teen_id, amount, transaction_type, source_type, source_id, description, balance_after
    )
    VALUES (
        p_teen_id, v_final_amount, 'earn', p_source_code, p_source_id, p_description, v_new_balance
    );

    RETURN jsonb_build_object(
        'success', true,
        'tokens_earned', v_final_amount,
        'multiplier', v_multiplier,
        'token_type', p_token_type,
        'new_balance', v_new_balance,
        'is_premium', v_is_premium
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour dépenser des tokens
CREATE OR REPLACE FUNCTION spend_tokens(
    p_teen_id UUID,
    p_amount INTEGER,
    p_token_type VARCHAR(50) DEFAULT 'regular',
    p_reason TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Récupérer le solde actuel
    SELECT
        CASE p_token_type
            WHEN 'premium' THEN premium_tokens
            WHEN 'seasonal' THEN seasonal_tokens
            ELSE balance
        END INTO v_current_balance
    FROM user_coins WHERE teen_id = p_teen_id;

    IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'insufficient_balance',
            'current_balance', COALESCE(v_current_balance, 0),
            'required', p_amount
        );
    END IF;

    -- Déduire les tokens
    CASE p_token_type
        WHEN 'premium' THEN
            UPDATE user_coins SET
                premium_tokens = premium_tokens - p_amount,
                lifetime_spent = lifetime_spent + p_amount,
                updated_at = NOW()
            WHERE teen_id = p_teen_id
            RETURNING premium_tokens INTO v_new_balance;

        WHEN 'seasonal' THEN
            UPDATE user_coins SET
                seasonal_tokens = seasonal_tokens - p_amount,
                lifetime_spent = lifetime_spent + p_amount,
                updated_at = NOW()
            WHERE teen_id = p_teen_id
            RETURNING seasonal_tokens INTO v_new_balance;

        ELSE
            UPDATE user_coins SET
                balance = balance - p_amount,
                lifetime_spent = lifetime_spent + p_amount,
                updated_at = NOW()
            WHERE teen_id = p_teen_id
            RETURNING balance INTO v_new_balance;
    END CASE;

    -- Enregistrer la transaction
    INSERT INTO token_transactions (
        teen_id, transaction_type, token_type, amount, balance_after,
        source_id, description
    )
    VALUES (
        p_teen_id, 'spend', p_token_type, -p_amount, v_new_balance,
        p_reference_id, p_reason
    );

    RETURN jsonb_build_object(
        'success', true,
        'tokens_spent', p_amount,
        'token_type', p_token_type,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour transférer des tokens
CREATE OR REPLACE FUNCTION transfer_tokens(
    p_sender_id UUID,
    p_receiver_id UUID,
    p_amount INTEGER,
    p_token_type VARCHAR(50) DEFAULT 'regular',
    p_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_sender_balance INTEGER;
    v_sender_new_balance INTEGER;
    v_receiver_new_balance INTEGER;
    v_transfer_id UUID;
    v_token_info token_types%ROWTYPE;
BEGIN
    -- Vérifier que le type est transférable
    SELECT * INTO v_token_info FROM token_types WHERE code = p_token_type;
    IF NOT v_token_info.is_tradeable THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'token_not_tradeable'
        );
    END IF;

    -- Vérifier le solde de l'envoyeur
    SELECT
        CASE p_token_type
            WHEN 'premium' THEN premium_tokens
            ELSE balance
        END INTO v_sender_balance
    FROM user_coins WHERE teen_id = p_sender_id;

    IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'insufficient_balance',
            'current_balance', COALESCE(v_sender_balance, 0)
        );
    END IF;

    -- Déduire du sender
    IF p_token_type = 'premium' THEN
        UPDATE user_coins SET premium_tokens = premium_tokens - p_amount
        WHERE teen_id = p_sender_id
        RETURNING premium_tokens INTO v_sender_new_balance;
    ELSE
        UPDATE user_coins SET balance = balance - p_amount
        WHERE teen_id = p_sender_id
        RETURNING balance INTO v_sender_new_balance;
    END IF;

    -- Ajouter au receiver
    INSERT INTO user_coins (teen_id, balance, premium_tokens)
    VALUES (p_receiver_id, 0, 0)
    ON CONFLICT (teen_id) DO NOTHING;

    IF p_token_type = 'premium' THEN
        UPDATE user_coins SET premium_tokens = premium_tokens + p_amount
        WHERE teen_id = p_receiver_id
        RETURNING premium_tokens INTO v_receiver_new_balance;
    ELSE
        UPDATE user_coins SET balance = balance + p_amount
        WHERE teen_id = p_receiver_id
        RETURNING balance INTO v_receiver_new_balance;
    END IF;

    -- Créer l'enregistrement de transfert
    INSERT INTO token_transfers (sender_id, receiver_id, token_type, amount, message)
    VALUES (p_sender_id, p_receiver_id, p_token_type, p_amount, p_message)
    RETURNING id INTO v_transfer_id;

    -- Transactions pour les deux utilisateurs
    INSERT INTO token_transactions (teen_id, transaction_type, token_type, amount, balance_after, related_user_id, description)
    VALUES
        (p_sender_id, 'transfer_out', p_token_type, -p_amount, v_sender_new_balance, p_receiver_id, p_message),
        (p_receiver_id, 'transfer_in', p_token_type, p_amount, v_receiver_new_balance, p_sender_id, p_message);

    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', v_transfer_id,
        'amount', p_amount,
        'sender_new_balance', v_sender_new_balance,
        'receiver_new_balance', v_receiver_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour réclamer le bonus quotidien
CREATE OR REPLACE FUNCTION claim_daily_bonus(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_bonus daily_bonuses%ROWTYPE;
    v_tokens_earned INTEGER;
    v_streak_bonus INTEGER := 0;
    v_is_new_day BOOLEAN := false;
BEGIN
    -- Créer ou récupérer l'entrée
    INSERT INTO daily_bonuses (teen_id, last_login_date, login_streak)
    VALUES (p_teen_id, NULL, 0)
    ON CONFLICT (teen_id) DO NOTHING;

    SELECT * INTO v_bonus FROM daily_bonuses WHERE teen_id = p_teen_id FOR UPDATE;

    -- Vérifier si déjà réclamé aujourd'hui
    IF v_bonus.last_login_date = CURRENT_DATE THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'already_claimed',
            'current_streak', v_bonus.login_streak
        );
    END IF;

    v_is_new_day := true;

    -- Calculer le streak
    IF v_bonus.last_login_date = CURRENT_DATE - 1 THEN
        -- Jour consécutif
        v_bonus.login_streak := v_bonus.login_streak + 1;
    ELSIF v_bonus.last_login_date IS NULL THEN
        -- Premier jour
        v_bonus.login_streak := 1;
    ELSE
        -- Streak cassé
        v_bonus.login_streak := 1;
    END IF;

    -- Calculer le bonus de streak (bonus tous les 7 jours)
    IF v_bonus.login_streak % 7 = 0 THEN
        v_streak_bonus := v_bonus.login_streak * 10; -- 70 tokens au jour 7, 140 au jour 14, etc.
    END IF;

    -- Mettre à jour
    UPDATE daily_bonuses SET
        last_login_date = CURRENT_DATE,
        login_streak = v_bonus.login_streak,
        updated_at = NOW()
    WHERE teen_id = p_teen_id;

    -- Donner les tokens du bonus quotidien
    PERFORM add_tokens_to_user(p_teen_id, 10, 'daily_login', 'regular', NULL, 'Bonus de connexion quotidien');

    -- Donner le bonus de streak si applicable
    IF v_streak_bonus > 0 THEN
        PERFORM add_tokens_to_user(p_teen_id, v_streak_bonus, 'streak_bonus', 'regular', NULL,
            'Bonus série de ' || v_bonus.login_streak || ' jours');
    END IF;

    -- Mettre à jour le streak dans user_streaks aussi
    PERFORM update_user_streak(p_teen_id);

    RETURN jsonb_build_object(
        'success', true,
        'tokens_earned', 10 + v_streak_bonus,
        'current_streak', v_bonus.login_streak,
        'streak_bonus', v_streak_bonus,
        'next_streak_bonus_at', 7 - (v_bonus.login_streak % 7)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir le wallet complet
CREATE OR REPLACE FUNCTION get_user_wallet(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_coins user_coins%ROWTYPE;
    v_daily daily_bonuses%ROWTYPE;
    v_recent_transactions JSONB;
BEGIN
    SELECT * INTO v_coins FROM user_coins WHERE teen_id = p_teen_id;
    SELECT * INTO v_daily FROM daily_bonuses WHERE teen_id = p_teen_id;

    -- Transactions récentes
    SELECT jsonb_agg(t) INTO v_recent_transactions
    FROM (
        SELECT transaction_type, token_type, amount, description, created_at
        FROM token_transactions
        WHERE teen_id = p_teen_id
        ORDER BY created_at DESC
        LIMIT 10
    ) t;

    RETURN jsonb_build_object(
        'balances', jsonb_build_object(
            'regular', COALESCE(v_coins.balance, 0),
            'premium', COALESCE(v_coins.premium_tokens, 0),
            'seasonal', COALESCE(v_coins.seasonal_tokens, 0),
            'total', COALESCE(v_coins.balance, 0) + COALESCE(v_coins.premium_tokens, 0) * 5 + COALESCE(v_coins.seasonal_tokens, 0) * 2
        ),
        'stats', jsonb_build_object(
            'lifetime_earned', COALESCE(v_coins.lifetime_earned, 0),
            'lifetime_spent', COALESCE(v_coins.lifetime_spent, 0),
            'total_lifetime', COALESCE(v_coins.total_lifetime_tokens, 0),
            'multiplier', COALESCE(v_coins.token_multiplier, 1.00)
        ),
        'daily', jsonb_build_object(
            'streak', COALESCE(v_daily.login_streak, 0),
            'claimed_today', v_daily.last_login_date = CURRENT_DATE,
            'last_claim', v_daily.last_login_date
        ),
        'recent_transactions', COALESCE(v_recent_transactions, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PARTIE 11: DONNÉES INITIALES REWARDS
-- =============================================

INSERT INTO token_rewards (name, description, token_cost, token_type, category, stock_type, icon, is_featured)
VALUES
    -- Digital
    ('Avatar Premium', 'Avatar exclusif animé', 500, 'regular', 'digital', 'unlimited', 'user-circle', false),
    ('Thème Néon', 'Thème de profil néon', 750, 'regular', 'digital', 'unlimited', 'palette', false),
    ('Badge Vérifié', 'Badge de vérification', 2000, 'regular', 'digital', 'unique', 'badge-check', true),
    ('Cadre Doré', 'Cadre doré pour avatar', 1000, 'regular', 'digital', 'unlimited', 'frame', false),

    -- Premium
    ('1 Semaine Pro', 'Abonnement Pro 7 jours', 1500, 'regular', 'premium', 'unlimited', 'crown', true),
    ('Boost XP 24h', 'Double XP pendant 24h', 300, 'regular', 'premium', 'unlimited', 'zap', false),

    -- Physical
    ('Stickers Pack', 'Pack de 10 stickers TeensParty', 800, 'regular', 'physical', 'limited', 'sticker', false),
    ('T-Shirt Exclusif', 'T-shirt officiel TeensParty', 5000, 'premium', 'physical', 'limited', 'shirt', true),

    -- Experience
    ('Meet & Greet', 'Rencontre exclusive', 10000, 'premium', 'experience', 'limited', 'handshake', true),

    -- Raffle
    ('Ticket Tombola', 'Participation au tirage mensuel', 100, 'regular', 'raffle', 'unlimited', 'ticket', false),

    -- Donation
    ('Don Solidaire', 'Don à une association', 500, 'regular', 'donation', 'unlimited', 'heart', false)
ON CONFLICT DO NOTHING;

-- =============================================
-- PARTIE 12: RLS POLICIES
-- =============================================

ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_limits_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_bonuses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own token transactions" ON token_transactions
    FOR SELECT USING (teen_id = auth.uid() OR EXISTS (
        SELECT 1 FROM teens WHERE id = token_transactions.teen_id AND parent_id = auth.uid()
    ));

CREATE POLICY "Users can view own limits" ON token_limits_tracking
    FOR SELECT USING (teen_id = auth.uid() OR EXISTS (
        SELECT 1 FROM teens WHERE id = token_limits_tracking.teen_id AND parent_id = auth.uid()
    ));

CREATE POLICY "Users can view own redemptions" ON token_redemptions
    FOR SELECT USING (teen_id = auth.uid() OR EXISTS (
        SELECT 1 FROM teens WHERE id = token_redemptions.teen_id AND parent_id = auth.uid()
    ));

CREATE POLICY "Users can view own transfers" ON token_transfers
    FOR SELECT USING (
        sender_id = auth.uid() OR receiver_id = auth.uid()
        OR EXISTS (SELECT 1 FROM teens WHERE id IN (sender_id, receiver_id) AND parent_id = auth.uid())
    );

CREATE POLICY "Users can view own daily bonus" ON daily_bonuses
    FOR SELECT USING (teen_id = auth.uid() OR EXISTS (
        SELECT 1 FROM teens WHERE id = daily_bonuses.teen_id AND parent_id = auth.uid()
    ));

-- Public read pour token_types et token_rewards
ALTER TABLE token_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view token types" ON token_types FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view token rewards" ON token_rewards FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view token sources" ON token_sources FOR SELECT USING (is_active = true);

-- =============================================
-- PARTIE 13: TRIGGER PREMIUM MULTIPLIER
-- =============================================

-- Mettre à jour le multiplicateur quand l'abonnement change
CREATE OR REPLACE FUNCTION update_token_multiplier_from_subscription()
RETURNS TRIGGER AS $$
DECLARE
    v_multiplier DECIMAL(3,2) := 1.00;
    v_features JSONB;
BEGIN
    -- Récupérer le multiplicateur du plan
    SELECT sp.features INTO v_features
    FROM subscription_plans sp
    WHERE sp.id = NEW.plan_id;

    IF v_features ? 'xp_multiplier' THEN
        v_multiplier := (v_features->>'xp_multiplier')::DECIMAL(3,2);
    END IF;

    -- Mettre à jour user_coins
    UPDATE user_coins SET
        token_multiplier = v_multiplier,
        updated_at = NOW()
    WHERE teen_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_token_multiplier ON user_subscriptions;
CREATE TRIGGER trigger_update_token_multiplier
    AFTER INSERT OR UPDATE ON user_subscriptions
    FOR EACH ROW
    WHEN (NEW.status IN ('active', 'trial'))
    EXECUTE FUNCTION update_token_multiplier_from_subscription();


-- ============================================================================
-- 029_presence_system.sql
-- ============================================================================
-- ============================================================================
-- MIGRATION 029: PRESENCE SYSTEM (Système de Présence Temps Réel)
-- ============================================================================
-- Real-time presence tracking for social pulse functionality
-- ============================================================================

-- ============================================================================
-- USER PRESENCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Presence status
  status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'away', 'playing', 'busy', 'offline')),
  
  -- Activity context
  current_activity VARCHAR(100), -- e.g., 'browsing_shop', 'doing_mission', 'in_crew_battle'
  current_page VARCHAR(255), -- Current page/route in the app
  
  -- Device info (for multi-device support)
  device_id VARCHAR(100),
  device_type VARCHAR(20) CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  
  -- Timestamps
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  session_started_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint per user (one presence record per user)
  UNIQUE(user_id)
);

-- ============================================================================
-- PRESENCE HISTORY TABLE (for analytics and "recently online" features)
-- ============================================================================

CREATE TABLE IF NOT EXISTS presence_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session info
  session_id UUID,
  status VARCHAR(20) NOT NULL,
  activity VARCHAR(100),
  
  -- Duration tracking
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Fast lookup by user_id
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);

-- Fast lookup for online users
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status) WHERE status != 'offline';

-- For "last seen" queries
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen_at DESC);

-- For heartbeat cleanup
CREATE INDEX IF NOT EXISTS idx_user_presence_heartbeat ON user_presence(last_heartbeat_at);

-- History indexes
CREATE INDEX IF NOT EXISTS idx_presence_history_user ON presence_history(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_presence_history_session ON presence_history(session_id);

-- ============================================================================
-- ENABLE REALTIME FOR PRESENCE TABLE
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_history ENABLE ROW LEVEL SECURITY;

-- Users can read presence of their friends
CREATE POLICY "Users can view friends presence" ON user_presence
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
      AND (
        (f.user1_id = auth.uid() AND f.user2_id = user_presence.user_id)
        OR (f.user2_id = auth.uid() AND f.user1_id = user_presence.user_id)
      )
    )
  );

-- Users can only update their own presence
CREATE POLICY "Users can update own presence" ON user_presence
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can insert their own presence
CREATE POLICY "Users can insert own presence" ON user_presence
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own presence
CREATE POLICY "Users can delete own presence" ON user_presence
  FOR DELETE
  USING (user_id = auth.uid());

-- History: Users can only view their own history
CREATE POLICY "Users can view own presence history" ON presence_history
  FOR SELECT
  USING (user_id = auth.uid());

-- History: System can insert (via trigger)
CREATE POLICY "System can insert presence history" ON presence_history
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update presence (upsert)
CREATE OR REPLACE FUNCTION update_user_presence(
  p_status VARCHAR DEFAULT 'online',
  p_activity VARCHAR DEFAULT NULL,
  p_page VARCHAR DEFAULT NULL,
  p_device_id VARCHAR DEFAULT NULL,
  p_device_type VARCHAR DEFAULT 'unknown'
)
RETURNS user_presence
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result user_presence;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO user_presence (
    user_id, status, current_activity, current_page, 
    device_id, device_type, last_seen_at, last_heartbeat_at, updated_at
  )
  VALUES (
    v_user_id, p_status, p_activity, p_page,
    p_device_id, p_device_type, NOW(), NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = EXCLUDED.status,
    current_activity = COALESCE(EXCLUDED.current_activity, user_presence.current_activity),
    current_page = COALESCE(EXCLUDED.current_page, user_presence.current_page),
    device_id = COALESCE(EXCLUDED.device_id, user_presence.device_id),
    device_type = COALESCE(EXCLUDED.device_type, user_presence.device_type),
    last_seen_at = NOW(),
    last_heartbeat_at = NOW(),
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to get friends presence
CREATE OR REPLACE FUNCTION get_friends_presence(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  status VARCHAR,
  current_activity VARCHAR,
  last_seen_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := COALESCE(p_user_id, auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.full_name,
    p.avatar_url,
    COALESCE(up.status, 'offline')::VARCHAR AS status,
    up.current_activity,
    up.last_seen_at
  FROM friendships f
  JOIN profiles p ON (
    CASE 
      WHEN f.user1_id = v_user_id THEN f.user2_id = p.id
      ELSE f.user1_id = p.id
    END
  )
  LEFT JOIN user_presence up ON up.user_id = p.id
  WHERE f.status = 'accepted'
    AND (f.user1_id = v_user_id OR f.user2_id = v_user_id)
  ORDER BY 
    CASE WHEN up.status = 'online' THEN 0
         WHEN up.status = 'playing' THEN 1
         WHEN up.status = 'away' THEN 2
         WHEN up.status = 'busy' THEN 3
         ELSE 4
    END,
    up.last_seen_at DESC NULLS LAST;
END;
$$;

-- Function to mark user offline (called on logout or session end)
CREATE OR REPLACE FUNCTION mark_user_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_old_record user_presence;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- Get current presence for history
  SELECT * INTO v_old_record FROM user_presence WHERE user_id = v_user_id;

  IF v_old_record IS NOT NULL AND v_old_record.status != 'offline' THEN
    -- Insert into history
    INSERT INTO presence_history (
      user_id, session_id, status, activity, 
      started_at, ended_at, duration_seconds
    )
    VALUES (
      v_user_id, 
      gen_random_uuid(),
      v_old_record.status,
      v_old_record.current_activity,
      v_old_record.session_started_at,
      NOW(),
      EXTRACT(EPOCH FROM (NOW() - v_old_record.session_started_at))::INTEGER
    );
  END IF;

  -- Update presence to offline
  UPDATE user_presence 
  SET status = 'offline', 
      current_activity = NULL,
      last_seen_at = NOW(),
      updated_at = NOW()
  WHERE user_id = v_user_id;
END;
$$;

-- Function to cleanup stale presence (for cron job)
CREATE OR REPLACE FUNCTION cleanup_stale_presence(p_timeout_minutes INTEGER DEFAULT 5)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Mark as offline anyone who hasn't sent a heartbeat in timeout period
  WITH updated AS (
    UPDATE user_presence
    SET status = 'offline',
        current_activity = NULL,
        updated_at = NOW()
    WHERE status != 'offline'
      AND last_heartbeat_at < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL
    RETURNING *
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_presence_timestamp
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_presence_timestamp();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION update_user_presence TO authenticated;
GRANT EXECUTE ON FUNCTION get_friends_presence TO authenticated;
GRANT EXECUTE ON FUNCTION mark_user_offline TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stale_presence TO service_role;


-- ============================================================================
-- 030_xp_shop.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - XP Shop (Boutique XP minimaliste)
-- Migration: 030_xp_shop.sql
-- Description: Table simple `xp_shop_items` pour la page /xp-shop.
--              Complete les `shop_rewards` riches existants (migration 004)
--              avec un catalogue allege type "vitrine" facile a consommer
--              cote front (audit AUDIT_LEVEL_UP_ET_DEFIS Phase 1.3).
-- ============================================================================

-- Extension UUID au cas ou elle n'aurait pas ete activee
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS xp_shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    xp_cost INTEGER NOT NULL CHECK (xp_cost >= 0),
    image_url TEXT,
    category TEXT,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_shop_items_available
    ON xp_shop_items (available)
    WHERE available IS TRUE;

CREATE INDEX IF NOT EXISTS idx_xp_shop_items_category
    ON xp_shop_items (category)
    WHERE category IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Pattern utilise par le projet: RLS enabled + policy de lecture publique
-- pour les tables vitrine. Ecritures reservees aux admins via service role.

ALTER TABLE xp_shop_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'xp_shop_items'
          AND policyname = 'xp_shop_items_public_read'
    ) THEN
        CREATE POLICY xp_shop_items_public_read
            ON xp_shop_items
            FOR SELECT
            USING (available IS TRUE);
    END IF;
END $$;

-- ============================================================================
-- SEED DATA (items demo)
-- ============================================================================
INSERT INTO xp_shop_items (name, description, xp_cost, category)
VALUES
    ('Booster XP 24h', 'Gagne +50% XP pendant 24 heures.', 500, 'booster'),
    ('Protection Streak', 'Protege ton streak en cas d''oubli (1 jour).', 100, 'booster'),
    ('Frame Or', 'Frame doree exclusive pour ton avatar.', 1000, 'cosmetic'),
    ('Sticker Exclusif', 'Sticker collector limite.', 300, 'collectible'),
    ('Casquette Teens Party', 'Casquette officielle (a retirer en physique).', 3000, 'real_item')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 031_quiz_question_types.sql
-- ============================================================================
-- ============================================================================
-- MIGRATION 031: QUIZ QUESTION TYPES (Phase 4.1 - Audit Generation Quiz)
-- ============================================================================
-- Ajoute le support de plusieurs types de questions pour varier les quiz
-- generes par l'IA: mcq | true_false | fill_blank | image | audio | matching.
--
-- Deux tables potentielles co-existent dans le projet:
--   * public.quiz_questions      (questions par-ligne, ex. defis quiz)
--   * public.educational_quizzes (questions JSONB embarquees)
--
-- Pour la table educational_quizzes le type vit deja DANS le JSONB
-- (champ "type" sur chaque question). On ajoute donc seulement une colonne
-- au niveau quiz pour indiquer la "tendance" / mix de types autorises, et
-- une colonne explicite sur quiz_questions pour les questions par-ligne.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Table quiz_questions (questions par-ligne) - colonne question_type
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'quiz_questions'
  ) THEN
    -- Ajout de la colonne si absente
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'quiz_questions'
        AND column_name = 'question_type'
    ) THEN
      ALTER TABLE public.quiz_questions
        ADD COLUMN question_type TEXT NOT NULL DEFAULT 'mcq';
    END IF;

    -- Contrainte de valeurs autorisees
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'quiz_questions'
        AND constraint_name = 'quiz_questions_question_type_check'
    ) THEN
      ALTER TABLE public.quiz_questions
        ADD CONSTRAINT quiz_questions_question_type_check
        CHECK (question_type IN (
          'mcq',
          'true_false',
          'fill_blank',
          'image',
          'audio',
          'matching'
        ));
    END IF;

    -- Index pour filtrer rapidement par type
    CREATE INDEX IF NOT EXISTS idx_quiz_questions_question_type
      ON public.quiz_questions(question_type);

    COMMENT ON COLUMN public.quiz_questions.question_type IS
      'Type de question pour la generation IA (Phase 4.1 audit quiz). Defaut mcq.';
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 2) Table educational_quizzes - colonne question_type_mix (JSON optionnel)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'educational_quizzes'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'educational_quizzes'
        AND column_name = 'question_type_mix'
    ) THEN
      ALTER TABLE public.educational_quizzes
        ADD COLUMN question_type_mix JSONB DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'educational_quizzes'
        AND column_name = 'quality_score'
    ) THEN
      ALTER TABLE public.educational_quizzes
        ADD COLUMN quality_score INT DEFAULT NULL;
    END IF;

    COMMENT ON COLUMN public.educational_quizzes.question_type_mix IS
      'Distribution des types de questions ex: {"mcq":0.6,"true_false":0.3,"fill_blank":0.1}';
    COMMENT ON COLUMN public.educational_quizzes.quality_score IS
      'Score qualite global 0-100 calcule par lib/ai/quality-scoring.ts';
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 3) Documentation - aucune table cible: insertion exemple commentee
-- ----------------------------------------------------------------------------
-- Si aucune des deux tables n'existe encore, le code applicatif (orchestrateur
-- IA) doit gerer le champ "type" dans le JSON de chaque question.
-- Exemple d'insert:
-- INSERT INTO public.educational_quizzes (title, questions, question_type_mix)
-- VALUES (
--   'Quiz Geographie du Maroc',
--   '[{"type":"mcq","question":"...","options":[...],"correct":0}]',
--   '{"mcq":0.6,"true_false":0.3,"fill_blank":0.1}'
-- );


-- ============================================================================
-- 032_content_generation_system.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Content Generation System
-- ============================================================================
-- Migration: 023_content_generation_system.sql
-- Description: Système de génération automatique de contenu (quiz, quêtes, défis)
-- basé sur le profil utilisateur et intégration avec outils externes (IA)
-- ============================================================================

-- ============================================================================
-- CONTENT GENERATION TRACKING
-- ============================================================================

-- Table pour tracker les générations de contenu
CREATE TABLE IF NOT EXISTS public.content_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type de contenu généré
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN (
    'quiz', 'mission', 'challenge', 'daily_challenge', 'quest'
  )),
  
  -- Cible (profil ou global)
  target_type VARCHAR(30) NOT NULL CHECK (target_type IN (
    'global', 'profile_based', 'grade_level', 'interest_based', 'custom'
  )),
  
  -- Paramètres de génération
  generation_params JSONB NOT NULL DEFAULT '{}', -- {grade_level, interests, profiles, etc.}
  
  -- Résultat
  generated_content_id UUID, -- ID du contenu généré (quiz_id, mission_id, etc.)
  generated_content_type VARCHAR(50), -- Type de la table cible
  
  -- Métadonnées
  ai_provider VARCHAR(50), -- 'openai', 'claude', 'manual'
  ai_model VARCHAR(100), -- 'gpt-4', 'claude-3-sonnet', etc.
  generation_time_ms INTEGER,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10, 6),
  
  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'generating', 'completed', 'failed', 'reviewed'
  )),
  error_message TEXT,
  
  -- Review (pour validation manuelle si nécessaire)
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_content_gen_type ON public.content_generation_logs(content_type);
CREATE INDEX IF NOT EXISTS idx_content_gen_status ON public.content_generation_logs(status);
CREATE INDEX IF NOT EXISTS idx_content_gen_date ON public.content_generation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_gen_target ON public.content_generation_logs(target_type);

-- ============================================================================
-- AI GENERATION TEMPLATES
-- ============================================================================

-- Templates pour guider la génération IA
CREATE TABLE IF NOT EXISTS public.ai_generation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type de contenu
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN (
    'quiz', 'mission', 'challenge', 'daily_challenge', 'quest'
  )),
  
  -- Catégorie/Contexte
  category VARCHAR(50), -- 'school', 'sport', 'crea', 'culture', etc.
  grade_level VARCHAR(20), -- '6eme', '5eme', etc.
  difficulty VARCHAR(20), -- 'easy', 'normal', 'hard', 'expert'
  
  -- Template de prompt
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  
  -- Paramètres de génération
  generation_config JSONB DEFAULT '{
    "temperature": 0.7,
    "max_tokens": 2000,
    "top_p": 1.0
  }'::jsonb,
  
  -- Validation rules
  validation_rules JSONB DEFAULT '{}', -- Règles pour valider le contenu généré
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Priorité d'utilisation
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 0.0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_templates_type ON public.ai_generation_templates(content_type, category);
CREATE INDEX IF NOT EXISTS idx_ai_templates_active ON public.ai_generation_templates(is_active) WHERE is_active = true;

-- ============================================================================
-- PERSONALIZED CONTENT ASSIGNMENTS
-- ============================================================================

-- Table pour assigner du contenu personnalisé aux utilisateurs
CREATE TABLE IF NOT EXISTS public.personalized_content_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Utilisateur
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  
  -- Contenu assigné
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  
  -- Raison de l'assignation
  assignment_reason VARCHAR(100), -- 'profile_match', 'grade_level', 'interest', 'recommendation'
  match_score DECIMAL(5, 2), -- Score de correspondance (0-100)
  
  -- Paramètres de match
  match_criteria JSONB DEFAULT '{}', -- {grade_level, interests, profiles, etc.}
  
  -- Statut
  status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN (
    'assigned', 'viewed', 'started', 'completed', 'skipped', 'expired'
  )),
  
  -- Dates
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Feedback
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  user_feedback TEXT,
  
  UNIQUE(teen_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_personalized_teen ON public.personalized_content_assignments(teen_id);
CREATE INDEX IF NOT EXISTS idx_personalized_status ON public.personalized_content_assignments(status);
CREATE INDEX IF NOT EXISTS idx_personalized_expires ON public.personalized_content_assignments(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- DAILY CONTENT GENERATION SCHEDULE
-- ============================================================================

-- Planning de génération quotidienne
CREATE TABLE IF NOT EXISTS public.daily_content_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Date cible
  target_date DATE NOT NULL UNIQUE,
  
  -- Contenu à générer
  content_plan JSONB NOT NULL DEFAULT '{
    "quizzes": {"count": 5, "subjects": []},
    "missions": {"count": 3, "categories": []},
    "challenges": {"count": 2, "types": []}
  }'::jsonb,
  
  -- Statut
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'generating', 'completed', 'failed', 'partial'
  )),
  
  -- Résultats
  generated_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  generation_log JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_daily_schedule_date ON public.daily_content_schedule(target_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_status ON public.daily_content_schedule(status);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour obtenir les paramètres de profil pour génération
CREATE OR REPLACE FUNCTION get_teen_generation_params(p_teen_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_params JSONB;
BEGIN
  SELECT jsonb_build_object(
    'grade_level', t.grade_level,
    'interests', t.interests,
    'profiles', t.profiles,
    'school', t.school,
    'age', EXTRACT(YEAR FROM AGE(t.date_of_birth))
  ) INTO v_params
  FROM public.teens t
  WHERE t.id = p_teen_id;
  
  RETURN COALESCE(v_params, '{}'::jsonb);
END;
$$;

-- Fonction pour calculer le score de correspondance
CREATE OR REPLACE FUNCTION calculate_content_match_score(
  p_teen_id UUID,
  p_content_params JSONB
)
RETURNS DECIMAL(5, 2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teen_params JSONB;
  v_score DECIMAL(5, 2) := 0.0;
  v_grade_match BOOLEAN := false;
  v_interest_match BOOLEAN := false;
  v_profile_match BOOLEAN := false;
BEGIN
  -- Récupérer les paramètres du teen
  v_teen_params := get_teen_generation_params(p_teen_id);
  
  -- Vérifier correspondance niveau scolaire
  IF p_content_params->>'grade_level' IS NOT NULL THEN
    v_grade_match := (v_teen_params->>'grade_level' = p_content_params->>'grade_level');
    IF v_grade_match THEN v_score := v_score + 30.0; END IF;
  END IF;
  
  -- Vérifier correspondance intérêts
  IF p_content_params->'interests' IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM jsonb_array_elements_text(p_content_params->'interests') AS interest
      WHERE interest = ANY(
        SELECT jsonb_array_elements_text(v_teen_params->'interests')
      )
    ) INTO v_interest_match;
    IF v_interest_match THEN v_score := v_score + 40.0; END IF;
  END IF;
  
  -- Vérifier correspondance profils (School/Sport/Créa)
  IF p_content_params->'profiles' IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM jsonb_array_elements_text(p_content_params->'profiles') AS profile
      WHERE profile = ANY(
        SELECT jsonb_array_elements_text(v_teen_params->'profiles')
      )
    ) INTO v_profile_match;
    IF v_profile_match THEN v_score := v_score + 30.0; END IF;
  END IF;
  
  RETURN LEAST(100.0, v_score);
END;
$$;

COMMENT ON TABLE public.content_generation_logs IS 'Logs de génération automatique de contenu';
COMMENT ON TABLE public.ai_generation_templates IS 'Templates pour guider la génération IA';
COMMENT ON TABLE public.personalized_content_assignments IS 'Assignations de contenu personnalisé aux utilisateurs';
COMMENT ON TABLE public.daily_content_schedule IS 'Planning de génération quotidienne de contenu';




-- ============================================================================
-- 033_content_validation_system.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Content Validation & Moderation System
-- ============================================================================
-- Migration: 024_content_validation_system.sql
-- Description: Système de validation, modération et vérification du contenu généré
-- ============================================================================

-- ============================================================================
-- CONTENT VALIDATION & MODERATION
-- ============================================================================

-- Table pour la validation automatique et manuelle du contenu
CREATE TABLE IF NOT EXISTS public.content_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence au contenu
  content_type VARCHAR(50) NOT NULL, -- 'quiz', 'mission', 'challenge'
  content_id UUID NOT NULL,
  
  -- Statut de validation
  validation_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (validation_status IN (
    'pending',           -- En attente de validation
    'auto_validated',    -- Validé automatiquement
    'auto_rejected',     -- Rejeté automatiquement
    'manual_review',     -- Nécessite une revue manuelle
    'approved',          -- Approuvé manuellement
    'rejected',          -- Rejeté manuellement
    'needs_revision'     -- Nécessite des révisions
  )),
  
  -- Validation automatique
  auto_validation_score DECIMAL(5, 2), -- Score de qualité (0-100)
  auto_validation_checks JSONB DEFAULT '{}', -- Résultats des checks automatiques
  auto_validated_at TIMESTAMPTZ,
  
  -- Validation manuelle
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Métriques de qualité
  quality_metrics JSONB DEFAULT '{}', -- {accuracy, completeness, appropriateness, etc.}
  
  -- Flags
  has_errors BOOLEAN DEFAULT false,
  has_warnings BOOLEAN DEFAULT false,
  error_details JSONB DEFAULT '[]', -- Liste des erreurs détectées
  warning_details JSONB DEFAULT '[]', -- Liste des avertissements
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_content_validations_status ON public.content_validations(validation_status);
CREATE INDEX IF NOT EXISTS idx_content_validations_content ON public.content_validations(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_validations_pending ON public.content_validations(validation_status) WHERE validation_status IN ('pending', 'manual_review');

-- ============================================================================
-- CONTENT QUALITY RULES
-- ============================================================================

-- Règles de qualité pour valider le contenu
CREATE TABLE IF NOT EXISTS public.content_quality_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type de contenu
  content_type VARCHAR(50) NOT NULL,
  category VARCHAR(50), -- Optionnel, pour règles spécifiques
  
  -- Règles de validation
  validation_rules JSONB NOT NULL DEFAULT '{}', -- Règles spécifiques
  quality_threshold DECIMAL(5, 2) DEFAULT 70.0, -- Score minimum pour auto-approbation
  
  -- Exemples de règles:
  -- Pour quiz: min_questions, max_questions, required_fields, answer_format
  -- Pour missions: min_description_length, required_objectives
  -- Pour défis: safety_checks, age_appropriateness
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_rules_type ON public.content_quality_rules(content_type, category);
CREATE INDEX IF NOT EXISTS idx_quality_rules_active ON public.content_quality_rules(is_active) WHERE is_active = true;

-- ============================================================================
-- CURATED CONTENT LIBRARY (Fallback)
-- ============================================================================

-- Bibliothèque de contenu pré-curated et validé manuellement
CREATE TABLE IF NOT EXISTS public.curated_content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Type de contenu
  content_type VARCHAR(50) NOT NULL,
  category VARCHAR(50),
  
  -- Contenu
  content_data JSONB NOT NULL, -- Le contenu complet (quiz, mission, etc.)
  
  -- Métadonnées
  title VARCHAR(200),
  description TEXT,
  grade_level VARCHAR(20),
  difficulty VARCHAR(20),
  subject VARCHAR(50), -- Pour les quiz
  
  -- Tags pour recherche
  tags TEXT[],
  
  -- Validation
  validated_by UUID REFERENCES public.profiles(id),
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  validation_notes TEXT,
  
  -- Usage
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- Contenu partagé entre tous
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curated_content_type ON public.curated_content_library(content_type, category);
CREATE INDEX IF NOT EXISTS idx_curated_content_active ON public.curated_content_library(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_curated_content_tags ON public.curated_content_library USING GIN(tags);

-- ============================================================================
-- CONTENT GENERATION WORKFLOW
-- ============================================================================

-- Workflow de génération avec étapes de validation
ALTER TABLE public.content_generation_logs
ADD COLUMN IF NOT EXISTS validation_status VARCHAR(30) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validation_id UUID REFERENCES public.content_validations(id),
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour valider automatiquement un quiz
CREATE OR REPLACE FUNCTION validate_quiz_content(p_quiz_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz RECORD;
  v_validation JSONB := '{"checks": {}, "errors": [], "warnings": [], "score": 0}'::jsonb;
  v_score DECIMAL(5, 2) := 0.0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_warnings TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Récupérer le quiz
  SELECT * INTO v_quiz
  FROM public.educational_quizzes
  WHERE id = p_quiz_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Quiz not found');
  END IF;
  
  -- Vérifier le titre
  IF v_quiz.title IS NULL OR LENGTH(TRIM(v_quiz.title)) < 5 THEN
    v_errors := array_append(v_errors, 'Titre trop court ou manquant');
  ELSE
    v_score := v_score + 10.0;
  END IF;
  
  -- Vérifier les questions
  IF v_quiz.questions IS NULL OR jsonb_array_length(v_quiz.questions) = 0 THEN
    v_errors := array_append(v_errors, 'Aucune question dans le quiz');
  ELSE
    DECLARE
      v_question_count INTEGER := jsonb_array_length(v_quiz.questions);
      v_valid_questions INTEGER := 0;
      v_question JSONB;
    BEGIN
      -- Vérifier chaque question
      FOR v_question IN SELECT * FROM jsonb_array_elements(v_quiz.questions)
      LOOP
        -- Vérifier que la question a un texte
        IF v_question->>'question' IS NULL OR LENGTH(TRIM(v_question->>'question')) < 10 THEN
          v_warnings := array_append(v_warnings, 'Question avec texte trop court');
        ELSE
          v_valid_questions := v_valid_questions + 1;
        END IF;
        
        -- Vérifier les options
        IF v_question->'options' IS NULL OR jsonb_array_length(v_question->'options') < 2 THEN
          v_errors := array_append(v_errors, 'Question sans options valides');
        END IF;
        
        -- Vérifier la réponse correcte
        IF v_question->>'correct' IS NULL THEN
          v_errors := array_append(v_errors, 'Question sans réponse correcte');
        END IF;
      END LOOP;
      
      -- Score basé sur le nombre de questions valides
      IF v_question_count >= 5 AND v_question_count <= 15 THEN
        v_score := v_score + 30.0;
      ELSIF v_question_count < 5 THEN
        v_warnings := array_append(v_warnings, 'Trop peu de questions (minimum 5 recommandé)');
      ELSE
        v_warnings := array_append(v_warnings, 'Trop de questions (maximum 15 recommandé)');
      END IF;
      
      IF v_valid_questions = v_question_count THEN
        v_score := v_score + 20.0;
      END IF;
    END;
  END IF;
  
  -- Vérifier la matière
  IF v_quiz.subject IS NULL OR LENGTH(TRIM(v_quiz.subject)) = 0 THEN
    v_warnings := array_append(v_warnings, 'Matière non spécifiée');
  ELSE
    v_score := v_score + 10.0;
  END IF;
  
  -- Vérifier le niveau scolaire
  IF v_quiz.grade_level IS NULL THEN
    v_warnings := array_append(v_warnings, 'Niveau scolaire non spécifié');
  ELSE
    v_score := v_score + 10.0;
  END IF;
  
  -- Vérifier la difficulté
  IF v_quiz.difficulty IS NULL THEN
    v_warnings := array_append(v_warnings, 'Difficulté non spécifiée');
  ELSE
    v_score := v_score + 10.0;
  END IF;
  
  -- Vérifier la description
  IF v_quiz.description IS NULL OR LENGTH(TRIM(v_quiz.description)) < 20 THEN
    v_warnings := array_append(v_warnings, 'Description trop courte');
  ELSE
    v_score := v_score + 10.0;
  END IF;
  
  -- Construire le résultat
  v_validation := jsonb_build_object(
    'checks', jsonb_build_object(
      'has_title', v_quiz.title IS NOT NULL,
      'has_questions', v_quiz.questions IS NOT NULL AND jsonb_array_length(v_quiz.questions) > 0,
      'has_subject', v_quiz.subject IS NOT NULL,
      'has_grade_level', v_quiz.grade_level IS NOT NULL,
      'has_difficulty', v_quiz.difficulty IS NOT NULL,
      'has_description', v_quiz.description IS NOT NULL
    ),
    'errors', to_jsonb(v_errors),
    'warnings', to_jsonb(v_warnings),
    'score', v_score
  );
  
  RETURN v_validation;
END;
$$;

-- Fonction pour obtenir du contenu curated en fallback
CREATE OR REPLACE FUNCTION get_curated_content_fallback(
  p_content_type VARCHAR(50),
  p_category VARCHAR(50) DEFAULT NULL,
  p_grade_level VARCHAR(20) DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content_type VARCHAR(50),
  content_data JSONB,
  title VARCHAR(200),
  match_score DECIMAL(5, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content_type,
    c.content_data,
    c.title,
    CASE
      WHEN c.grade_level = p_grade_level THEN 100.0
      WHEN c.category = p_category THEN 80.0
      ELSE 50.0
    END as match_score
  FROM public.curated_content_library c
  WHERE c.content_type = p_content_type
    AND c.is_active = true
    AND (p_category IS NULL OR c.category = p_category)
    AND (p_grade_level IS NULL OR c.grade_level = p_grade_level)
  ORDER BY match_score DESC, c.usage_count DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON TABLE public.content_validations IS 'Validation et modération du contenu généré';
COMMENT ON TABLE public.content_quality_rules IS 'Règles de qualité pour valider le contenu';
COMMENT ON TABLE public.curated_content_library IS 'Bibliothèque de contenu pré-curated et validé';




-- ============================================================================
-- 034_intelligent_content_system.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - Intelligent Content Generation System
-- ============================================================================
-- Migration: 025_intelligent_content_system.sql
-- Description: Système intelligent de génération basé sur profilage avancé,
-- algorithme ML, vérification factuelle et adaptation dynamique
-- ============================================================================

-- ============================================================================
-- TEEN BEHAVIORAL PROFILE (Profil Comportemental Avancé)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.teen_behavioral_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL UNIQUE REFERENCES public.teens(id) ON DELETE CASCADE,
  
  -- Profil d'apprentissage
  learning_style VARCHAR(50), -- 'visual', 'auditory', 'kinesthetic', 'reading'
  attention_span_minutes INTEGER DEFAULT 15,
  preferred_difficulty VARCHAR(20) DEFAULT 'normal', -- Calculé dynamiquement
  optimal_quiz_length INTEGER DEFAULT 10, -- Nombre optimal de questions
  
  -- Patterns de performance
  average_quiz_score DECIMAL(5,2) DEFAULT 0.0,
  best_subject VARCHAR(50),
  struggling_subject VARCHAR(50),
  improvement_rate DECIMAL(5,2) DEFAULT 0.0, -- % d'amélioration mensuel
  
  -- Patterns temporels
  most_active_hour INTEGER, -- Heure de la journée (0-23)
  most_active_day VARCHAR(10), -- Jour de la semaine
  average_session_duration_minutes INTEGER DEFAULT 20,
  
  -- Préférences de contenu
  preferred_content_types TEXT[] DEFAULT '{}', -- ['quiz', 'video', 'interactive']
  preferred_subjects TEXT[] DEFAULT '{}',
  avoided_subjects TEXT[] DEFAULT '{}',
  
  -- Engagement
  engagement_score DECIMAL(5,2) DEFAULT 50.0, -- 0-100
  completion_rate DECIMAL(5,2) DEFAULT 0.0, -- % de complétion
  abandonment_rate DECIMAL(5,2) DEFAULT 0.0, -- % d'abandon
  
  -- Métadonnées
  last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  analysis_version INTEGER DEFAULT 1,
  confidence_score DECIMAL(5,2) DEFAULT 0.0, -- Confiance dans le profil (0-100)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behavioral_profile_teen ON public.teen_behavioral_profile(teen_id);
CREATE INDEX IF NOT EXISTS idx_behavioral_profile_engagement ON public.teen_behavioral_profile(engagement_score DESC);

-- ============================================================================
-- CONTENT PERFORMANCE TRACKING (Suivi des Performances du Contenu)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence au contenu
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  
  -- Métriques d'engagement
  total_attempts INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0.0,
  average_score DECIMAL(5,2) DEFAULT 0.0,
  average_time_seconds INTEGER DEFAULT 0,
  
  -- Métriques de qualité
  user_satisfaction_score DECIMAL(5,2) DEFAULT 0.0, -- Basé sur feedback
  error_report_count INTEGER DEFAULT 0,
  accuracy_score DECIMAL(5,2) DEFAULT 100.0, -- % de réponses correctes (pour quiz)
  
  -- Métriques par profil
  performance_by_grade_level JSONB DEFAULT '{}', -- {grade_level: {avg_score, attempts}}
  performance_by_difficulty JSONB DEFAULT '{}',
  
  -- Détection de problèmes
  flagged_issues TEXT[] DEFAULT '{}', -- ['incorrect_answer', 'too_hard', 'too_easy']
  last_issue_detected_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_content_perf_type ON public.content_performance_metrics(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_perf_accuracy ON public.content_performance_metrics(accuracy_score) WHERE accuracy_score < 95;

-- ============================================================================
-- FACTUAL VERIFICATION (Vérification Factuelle)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_factual_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence au contenu
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  
  -- Vérification
  verification_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (verification_status IN (
    'pending', 'verified', 'partially_verified', 'failed', 'needs_review'
  )),
  
  -- Sources de vérification
  verification_sources JSONB DEFAULT '[]', -- [{source: 'wikipedia', url: '...', verified: true}]
  verification_method VARCHAR(50), -- 'manual', 'api', 'cross_reference', 'expert_review'
  
  -- Résultats
  facts_verified INTEGER DEFAULT 0,
  facts_total INTEGER DEFAULT 0,
  verification_score DECIMAL(5,2) DEFAULT 0.0, -- % de faits vérifiés
  
  -- Expert review
  reviewed_by_expert BOOLEAN DEFAULT false,
  expert_id UUID REFERENCES public.profiles(id),
  expert_notes TEXT,
  
  -- Timestamps
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_factual_verification_status ON public.content_factual_verification(verification_status);
CREATE INDEX IF NOT EXISTS idx_factual_verification_score ON public.content_factual_verification(verification_score) WHERE verification_score < 100;

-- ============================================================================
-- RECOMMENDATION ENGINE (Moteur de Recommandation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  
  -- Contenu recommandé
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  
  -- Score de recommandation
  recommendation_score DECIMAL(5,2) NOT NULL, -- 0-100
  confidence_level DECIMAL(5,2) DEFAULT 0.0, -- Confiance dans la recommandation
  
  -- Facteurs de recommandation
  recommendation_factors JSONB DEFAULT '{}', -- {
  --   behavioral_match: 30,
  --   performance_based: 25,
  --   difficulty_match: 20,
  --   subject_preference: 15,
  --   novelty: 10
  -- }
  
  -- Statut
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'shown', 'accepted', 'rejected', 'completed', 'expired'
  )),
  
  -- Feedback
  user_feedback VARCHAR(20), -- 'liked', 'disliked', 'too_easy', 'too_hard'
  actual_performance DECIMAL(5,2), -- Score réel obtenu
  
  -- Timestamps
  recommended_at TIMESTAMPTZ DEFAULT NOW(),
  shown_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  UNIQUE(teen_id, content_type, content_id, recommended_at::DATE)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_teen ON public.content_recommendations(teen_id, status);
CREATE INDEX IF NOT EXISTS idx_recommendations_score ON public.content_recommendations(recommendation_score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_pending ON public.content_recommendations(status) WHERE status = 'pending';

-- ============================================================================
-- ADAPTIVE LEARNING TRACKER (Suivi d'Apprentissage Adaptatif)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.adaptive_learning_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  
  -- État d'apprentissage actuel
  current_skill_level JSONB DEFAULT '{}', -- {subject: {level, confidence}}
  learning_path JSONB DEFAULT '[]', -- Chemin d'apprentissage recommandé
  next_recommended_content JSONB DEFAULT '{}',
  
  -- Adaptation
  difficulty_adjustment DECIMAL(5,2) DEFAULT 0.0, -- Ajustement de difficulté (-50 à +50)
  pace_adjustment DECIMAL(5,2) DEFAULT 0.0, -- Ajustement du rythme
  
  -- Progression
  mastery_topics TEXT[] DEFAULT '{}', -- Sujets maîtrisés
  struggling_topics TEXT[] DEFAULT '{}', -- Sujets en difficulté
  next_focus_areas TEXT[] DEFAULT '{}', -- Zones à travailler
  
  -- Métadonnées
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  algorithm_version VARCHAR(20) DEFAULT 'v1.0',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(teen_id)
);

CREATE INDEX IF NOT EXISTS idx_adaptive_learning_teen ON public.adaptive_learning_tracker(teen_id);

-- ============================================================================
-- CONTENT RELIABILITY SCORE (Score de Fiabilité du Contenu)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.content_reliability_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence au contenu
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  
  -- Score global de fiabilité (0-100)
  reliability_score DECIMAL(5,2) DEFAULT 0.0,
  
  -- Composantes du score
  factual_accuracy DECIMAL(5,2) DEFAULT 0.0, -- Vérification factuelle
  user_accuracy DECIMAL(5,2) DEFAULT 0.0, -- Précision basée sur utilisateurs
  expert_validation DECIMAL(5,2) DEFAULT 0.0, -- Validation experte
  performance_consistency DECIMAL(5,2) DEFAULT 0.0, -- Cohérence des performances
  
  -- Métadonnées
  calculation_method VARCHAR(50) DEFAULT 'weighted_average',
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  confidence_interval DECIMAL(5,2) DEFAULT 0.0, -- Intervalle de confiance
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_reliability_score ON public.content_reliability_scores(reliability_score DESC);
CREATE INDEX IF NOT EXISTS idx_reliability_low ON public.content_reliability_scores(reliability_score) WHERE reliability_score < 70;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour calculer le profil comportemental d'un teen
CREATE OR REPLACE FUNCTION calculate_teen_behavioral_profile(p_teen_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile JSONB;
  v_avg_score DECIMAL(5,2);
  v_completion_rate DECIMAL(5,2);
  v_best_subject VARCHAR(50);
  v_struggling_subject VARCHAR(50);
  v_total_attempts INTEGER;
  v_total_completions INTEGER;
BEGIN
  -- Calculer moyenne des scores de quiz
  SELECT 
    COALESCE(AVG(score), 0),
    COUNT(*) FILTER (WHERE passed = true),
    COUNT(*)
  INTO v_avg_score, v_total_completions, v_total_attempts
  FROM public.quiz_attempts
  WHERE teen_id = p_teen_id;
  
  v_completion_rate := CASE 
    WHEN v_total_attempts > 0 THEN (v_total_completions::DECIMAL / v_total_attempts * 100)
    ELSE 0
  END;
  
  -- Trouver meilleure et pire matière
  SELECT subject INTO v_best_subject
  FROM public.quiz_attempts qa
  JOIN public.educational_quizzes eq ON qa.quiz_id = eq.id
  WHERE qa.teen_id = p_teen_id
  GROUP BY subject
  ORDER BY AVG(qa.score) DESC
  LIMIT 1;
  
  SELECT subject INTO v_struggling_subject
  FROM public.quiz_attempts qa
  JOIN public.educational_quizzes eq ON qa.quiz_id = eq.id
  WHERE qa.teen_id = p_teen_id
  GROUP BY subject
  ORDER BY AVG(qa.score) ASC
  LIMIT 1;
  
  -- Construire le profil
  v_profile := jsonb_build_object(
    'average_score', v_avg_score,
    'completion_rate', v_completion_rate,
    'best_subject', v_best_subject,
    'struggling_subject', v_struggling_subject,
    'total_attempts', v_total_attempts,
    'total_completions', v_total_completions
  );
  
  RETURN v_profile;
END;
$$;

-- Fonction pour calculer le score de fiabilité d'un contenu
CREATE OR REPLACE FUNCTION calculate_content_reliability(
  p_content_type VARCHAR(50),
  p_content_id UUID
)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_factual_score DECIMAL(5,2) := 0.0;
  v_user_accuracy DECIMAL(5,2) := 0.0;
  v_expert_validation DECIMAL(5,2) := 0.0;
  v_performance_consistency DECIMAL(5,2) := 0.0;
  v_reliability_score DECIMAL(5,2) := 0.0;
BEGIN
  -- Score factuel (vérification factuelle)
  SELECT COALESCE(verification_score, 0) INTO v_factual_score
  FROM public.content_factual_verification
  WHERE content_type = p_content_type AND content_id = p_content_id;
  
  -- Score utilisateur (précision basée sur les résultats)
  SELECT COALESCE(accuracy_score, 0) INTO v_user_accuracy
  FROM public.content_performance_metrics
  WHERE content_type = p_content_type AND content_id = p_content_id;
  
  -- Score expert (validation experte)
  SELECT CASE 
    WHEN reviewed_by_expert = true THEN 100.0
    ELSE 0.0
  END INTO v_expert_validation
  FROM public.content_factual_verification
  WHERE content_type = p_content_type AND content_id = p_content_id;
  
  -- Score de cohérence (écart-type des performances)
  SELECT CASE
    WHEN COUNT(*) > 10 THEN 
      100.0 - LEAST(50.0, STDDEV(score) * 2)
    ELSE 50.0
  END INTO v_performance_consistency
  FROM public.quiz_attempts qa
  JOIN public.educational_quizzes eq ON qa.quiz_id = eq.id
  WHERE eq.id = p_content_id
  GROUP BY eq.id;
  
  -- Score global (moyenne pondérée)
  v_reliability_score := (
    v_factual_score * 0.35 +
    v_user_accuracy * 0.30 +
    v_expert_validation * 0.20 +
    v_performance_consistency * 0.15
  );
  
  RETURN LEAST(100.0, GREATEST(0.0, v_reliability_score));
END;
$$;

COMMENT ON TABLE public.teen_behavioral_profile IS 'Profil comportemental avancé de l''adolescent pour personnalisation intelligente';
COMMENT ON TABLE public.content_performance_metrics IS 'Métriques de performance du contenu pour amélioration continue';
COMMENT ON TABLE public.content_factual_verification IS 'Vérification factuelle du contenu généré';
COMMENT ON TABLE public.content_recommendations IS 'Recommandations intelligentes basées sur ML';
COMMENT ON TABLE public.adaptive_learning_tracker IS 'Suivi d''apprentissage adaptatif';
COMMENT ON TABLE public.content_reliability_scores IS 'Scores de fiabilité du contenu';




-- ============================================================================
-- 035_social_feed.sql
-- ============================================================================
-- =============================================
-- MIGRATION 025: Activity Feed System
-- =============================================
-- Systeme de fil d'actualites pour amis et cercles
-- =============================================

-- Table des posts du feed
CREATE TABLE IF NOT EXISTS feed_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Type de post
    post_type VARCHAR(50) NOT NULL CHECK (post_type IN (
        'status',           -- Statut texte simple
        'achievement',      -- Badge/achievement unlocked
        'level_up',         -- Montee de niveau
        'challenge_complete', -- Defi complete
        'creation',         -- Nouvelle creation partagee
        'record',           -- Nouveau record personnel
        'streak',           -- Milestone de streak
        'club_join',        -- Rejoindre un club
        'circle_create',    -- Creation de cercle
        'friendship',       -- Nouvelle amitie
        'poll',             -- Sondage
        'event',            -- Evenement
        'photo',            -- Photo partagee
        'video',            -- Video partagee
        'milestone'         -- Milestone generique
    )),

    -- Contenu
    content TEXT,
    media_urls JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Reference optionnelle a une entite
    reference_type VARCHAR(50),
    reference_id UUID,

    -- Visibilite
    visibility VARCHAR(20) DEFAULT 'friends' CHECK (visibility IN (
        'public',    -- Visible par tous
        'friends',   -- Amis seulement
        'circle',    -- Cercle specifique
        'private'    -- Soi-meme seulement
    )),
    circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,

    -- Stats
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,

    -- Moderation
    is_pinned BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    reported_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour le feed
CREATE INDEX idx_feed_posts_user ON feed_posts(user_id, created_at DESC);
CREATE INDEX idx_feed_posts_type ON feed_posts(post_type);
CREATE INDEX idx_feed_posts_visibility ON feed_posts(visibility);
CREATE INDEX idx_feed_posts_circle ON feed_posts(circle_id) WHERE circle_id IS NOT NULL;
CREATE INDEX idx_feed_posts_created ON feed_posts(created_at DESC);

-- Table des likes sur les posts
CREATE TABLE IF NOT EXISTS feed_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Type de reaction
    reaction_type VARCHAR(20) DEFAULT 'like' CHECK (reaction_type IN (
        'like',     -- Coeur classique
        'love',     -- Super like
        'haha',     -- Drole
        'wow',      -- Impressionnant
        'sad',      -- Triste
        'fire',     -- En feu
        'clap'      -- Bravo
    )),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_feed_likes_post ON feed_likes(post_id);
CREATE INDEX idx_feed_likes_user ON feed_likes(user_id);

-- Table des commentaires
CREATE TABLE IF NOT EXISTS feed_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE,

    content TEXT NOT NULL,
    media_url TEXT,

    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,

    is_edited BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feed_comments_post ON feed_comments(post_id, created_at);
CREATE INDEX idx_feed_comments_user ON feed_comments(user_id);
CREATE INDEX idx_feed_comments_parent ON feed_comments(parent_id) WHERE parent_id IS NOT NULL;

-- Table des likes sur commentaires
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES feed_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(comment_id, user_id)
);

-- Table des partages
CREATE TABLE IF NOT EXISTS feed_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_post_id UUID REFERENCES feed_posts(id) ON DELETE SET NULL,

    comment TEXT,
    share_type VARCHAR(20) DEFAULT 'repost' CHECK (share_type IN (
        'repost',   -- Simple repartage
        'quote',    -- Avec commentaire
        'story'     -- En story
    )),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feed_shares_original ON feed_shares(original_post_id);
CREATE INDEX idx_feed_shares_user ON feed_shares(shared_by);

-- Table des vues de posts
CREATE TABLE IF NOT EXISTS feed_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    view_duration INTEGER DEFAULT 0, -- en secondes
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(post_id, user_id)
);

-- Table des bookmarks/saves
CREATE TABLE IF NOT EXISTS feed_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection VARCHAR(100) DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(post_id, user_id)
);

CREATE INDEX idx_feed_bookmarks_user ON feed_bookmarks(user_id, created_at DESC);

-- Table des mentions
CREATE TABLE IF NOT EXISTS feed_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES feed_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES feed_comments(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentioned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL)
);

CREATE INDEX idx_feed_mentions_user ON feed_mentions(mentioned_user_id, is_read);

-- Table des hashtags
CREATE TABLE IF NOT EXISTS hashtags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag VARCHAR(100) NOT NULL UNIQUE,
    posts_count INTEGER DEFAULT 0,
    trending_score FLOAT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hashtags_tag ON hashtags(tag);
CREATE INDEX idx_hashtags_trending ON hashtags(trending_score DESC);

-- Table de liaison posts-hashtags
CREATE TABLE IF NOT EXISTS post_hashtags (
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, hashtag_id)
);

-- Table des posts masques par l'utilisateur
CREATE TABLE IF NOT EXISTS hidden_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    reason VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, post_id)
);

-- Table des utilisateurs mutes dans le feed
CREATE TABLE IF NOT EXISTS feed_muted_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    muted_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mute_until TIMESTAMPTZ, -- NULL = permanent
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, muted_user_id)
);

-- =============================================
-- FONCTIONS
-- =============================================

-- Fonction pour obtenir le feed personnalise
CREATE OR REPLACE FUNCTION get_personalized_feed(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_filter VARCHAR DEFAULT 'all'
)
RETURNS TABLE (
    post_id UUID,
    post_type VARCHAR,
    content TEXT,
    media_urls JSONB,
    metadata JSONB,
    visibility VARCHAR,
    likes_count INTEGER,
    comments_count INTEGER,
    shares_count INTEGER,
    is_pinned BOOLEAN,
    created_at TIMESTAMPTZ,
    author_id UUID,
    author_username VARCHAR,
    author_display_name VARCHAR,
    author_avatar_url TEXT,
    author_level INTEGER,
    user_reaction VARCHAR,
    is_bookmarked BOOLEAN,
    circle_id UUID,
    circle_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH friend_ids AS (
        SELECT
            CASE
                WHEN user1_id = p_user_id THEN user2_id
                ELSE user1_id
            END as friend_id
        FROM friendships
        WHERE (user1_id = p_user_id OR user2_id = p_user_id)
        AND status = 'accepted'
    ),
    circle_ids AS (
        SELECT circle_id FROM circle_members
        WHERE user_id = p_user_id AND status = 'active'
    ),
    muted_ids AS (
        SELECT muted_user_id FROM feed_muted_users
        WHERE user_id = p_user_id
        AND (mute_until IS NULL OR mute_until > NOW())
    ),
    hidden_ids AS (
        SELECT post_id FROM hidden_posts WHERE user_id = p_user_id
    )
    SELECT
        fp.id as post_id,
        fp.post_type::VARCHAR,
        fp.content,
        fp.media_urls,
        fp.metadata,
        fp.visibility::VARCHAR,
        fp.likes_count,
        fp.comments_count,
        fp.shares_count,
        fp.is_pinned,
        fp.created_at,
        u.id as author_id,
        u.username::VARCHAR,
        u.display_name::VARCHAR,
        u.avatar_url,
        u.level,
        fl.reaction_type::VARCHAR as user_reaction,
        (fb.id IS NOT NULL) as is_bookmarked,
        fp.circle_id,
        c.name::VARCHAR as circle_name
    FROM feed_posts fp
    JOIN users u ON fp.user_id = u.id
    LEFT JOIN feed_likes fl ON fp.id = fl.post_id AND fl.user_id = p_user_id
    LEFT JOIN feed_bookmarks fb ON fp.id = fb.post_id AND fb.user_id = p_user_id
    LEFT JOIN circles c ON fp.circle_id = c.id
    WHERE fp.is_hidden = false
    AND fp.user_id NOT IN (SELECT muted_user_id FROM muted_ids)
    AND fp.id NOT IN (SELECT post_id FROM hidden_ids)
    AND (
        -- Ses propres posts
        fp.user_id = p_user_id
        -- Posts publics
        OR fp.visibility = 'public'
        -- Posts d'amis
        OR (fp.visibility = 'friends' AND fp.user_id IN (SELECT friend_id FROM friend_ids))
        -- Posts de cercles
        OR (fp.visibility = 'circle' AND fp.circle_id IN (SELECT circle_id FROM circle_ids))
    )
    AND (
        p_filter = 'all'
        OR (p_filter = 'friends' AND fp.user_id IN (SELECT friend_id FROM friend_ids))
        OR (p_filter = 'achievements' AND fp.post_type IN ('achievement', 'level_up', 'milestone'))
        OR (p_filter = 'challenges' AND fp.post_type IN ('challenge_complete', 'record'))
        OR (p_filter = 'creations' AND fp.post_type IN ('creation', 'photo', 'video'))
        OR (p_filter = 'circles' AND fp.circle_id IS NOT NULL)
    )
    ORDER BY fp.is_pinned DESC, fp.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour creer un post
CREATE OR REPLACE FUNCTION create_feed_post(
    p_user_id UUID,
    p_post_type VARCHAR,
    p_content TEXT DEFAULT NULL,
    p_media_urls JSONB DEFAULT '[]'::jsonb,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_visibility VARCHAR DEFAULT 'friends',
    p_circle_id UUID DEFAULT NULL,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_post_id UUID;
    v_hashtag TEXT;
    v_hashtag_id UUID;
BEGIN
    -- Creer le post
    INSERT INTO feed_posts (
        user_id, post_type, content, media_urls, metadata,
        visibility, circle_id, reference_type, reference_id
    )
    VALUES (
        p_user_id, p_post_type, p_content, p_media_urls, p_metadata,
        p_visibility, p_circle_id, p_reference_type, p_reference_id
    )
    RETURNING id INTO v_post_id;

    -- Extraire et enregistrer les hashtags
    IF p_content IS NOT NULL THEN
        FOR v_hashtag IN
            SELECT DISTINCT lower(substring(word from 2))
            FROM regexp_split_to_table(p_content, '\s+') AS word
            WHERE word ~ '^#[a-zA-Z0-9_]+'
        LOOP
            -- Inserer ou recuperer le hashtag
            INSERT INTO hashtags (tag)
            VALUES (v_hashtag)
            ON CONFLICT (tag) DO UPDATE SET
                posts_count = hashtags.posts_count + 1,
                updated_at = NOW()
            RETURNING id INTO v_hashtag_id;

            -- Lier au post
            INSERT INTO post_hashtags (post_id, hashtag_id)
            VALUES (v_post_id, v_hashtag_id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    -- XP pour poster
    UPDATE users SET xp = xp + 5 WHERE id = p_user_id;

    RETURN v_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour liker un post
CREATE OR REPLACE FUNCTION toggle_post_like(
    p_user_id UUID,
    p_post_id UUID,
    p_reaction_type VARCHAR DEFAULT 'like'
)
RETURNS JSONB AS $$
DECLARE
    v_existing_like UUID;
    v_post_author UUID;
    v_result JSONB;
BEGIN
    -- Verifier si deja like
    SELECT id INTO v_existing_like
    FROM feed_likes
    WHERE post_id = p_post_id AND user_id = p_user_id;

    SELECT user_id INTO v_post_author FROM feed_posts WHERE id = p_post_id;

    IF v_existing_like IS NOT NULL THEN
        -- Supprimer le like
        DELETE FROM feed_likes WHERE id = v_existing_like;

        UPDATE feed_posts SET likes_count = likes_count - 1 WHERE id = p_post_id;

        v_result := jsonb_build_object('action', 'unliked', 'likes_count',
            (SELECT likes_count FROM feed_posts WHERE id = p_post_id));
    ELSE
        -- Ajouter le like
        INSERT INTO feed_likes (post_id, user_id, reaction_type)
        VALUES (p_post_id, p_user_id, p_reaction_type);

        UPDATE feed_posts SET likes_count = likes_count + 1 WHERE id = p_post_id;

        -- XP pour l'auteur
        IF v_post_author != p_user_id THEN
            UPDATE users SET xp = xp + 2 WHERE id = v_post_author;

            -- Notification
            INSERT INTO notifications (user_id, type, title, message, data)
            VALUES (
                v_post_author,
                'like',
                'Nouveau like',
                (SELECT display_name FROM users WHERE id = p_user_id) || ' a aime votre post',
                jsonb_build_object('post_id', p_post_id, 'liker_id', p_user_id, 'reaction', p_reaction_type)
            );
        END IF;

        v_result := jsonb_build_object('action', 'liked', 'likes_count',
            (SELECT likes_count FROM feed_posts WHERE id = p_post_id));
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour ajouter un commentaire
CREATE OR REPLACE FUNCTION add_feed_comment(
    p_user_id UUID,
    p_post_id UUID,
    p_content TEXT,
    p_parent_id UUID DEFAULT NULL,
    p_media_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_comment_id UUID;
    v_post_author UUID;
    v_parent_author UUID;
    v_mentioned_user UUID;
BEGIN
    -- Creer le commentaire
    INSERT INTO feed_comments (post_id, user_id, parent_id, content, media_url)
    VALUES (p_post_id, p_user_id, p_parent_id, p_content, p_media_url)
    RETURNING id INTO v_comment_id;

    -- Mettre a jour les compteurs
    UPDATE feed_posts SET comments_count = comments_count + 1 WHERE id = p_post_id;

    IF p_parent_id IS NOT NULL THEN
        UPDATE feed_comments SET replies_count = replies_count + 1 WHERE id = p_parent_id;
    END IF;

    -- Notifications
    SELECT user_id INTO v_post_author FROM feed_posts WHERE id = p_post_id;

    IF v_post_author != p_user_id THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            v_post_author,
            'comment',
            'Nouveau commentaire',
            (SELECT display_name FROM users WHERE id = p_user_id) || ' a commente votre post',
            jsonb_build_object('post_id', p_post_id, 'comment_id', v_comment_id)
        );

        -- XP pour l'auteur du post
        UPDATE users SET xp = xp + 3 WHERE id = v_post_author;
    END IF;

    -- Notification au parent si reponse
    IF p_parent_id IS NOT NULL THEN
        SELECT user_id INTO v_parent_author FROM feed_comments WHERE id = p_parent_id;

        IF v_parent_author != p_user_id AND v_parent_author != v_post_author THEN
            INSERT INTO notifications (user_id, type, title, message, data)
            VALUES (
                v_parent_author,
                'reply',
                'Nouvelle reponse',
                (SELECT display_name FROM users WHERE id = p_user_id) || ' a repondu a votre commentaire',
                jsonb_build_object('post_id', p_post_id, 'comment_id', v_comment_id)
            );
        END IF;
    END IF;

    -- Extraire les mentions @username
    FOR v_mentioned_user IN
        SELECT DISTINCT u.id
        FROM regexp_matches(p_content, '@([a-zA-Z0-9_]+)', 'g') AS m(username)
        JOIN users u ON lower(u.username) = lower(m.username[1])
        WHERE u.id != p_user_id
    LOOP
        INSERT INTO feed_mentions (comment_id, mentioned_user_id, mentioned_by)
        VALUES (v_comment_id, v_mentioned_user, p_user_id);

        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            v_mentioned_user,
            'mention',
            'Vous avez ete mentionne',
            (SELECT display_name FROM users WHERE id = p_user_id) || ' vous a mentionne',
            jsonb_build_object('post_id', p_post_id, 'comment_id', v_comment_id)
        );
    END LOOP;

    -- XP pour commenter
    UPDATE users SET xp = xp + 2 WHERE id = p_user_id;

    RETURN v_comment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les commentaires d'un post
CREATE OR REPLACE FUNCTION get_post_comments(
    p_user_id UUID,
    p_post_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    comment_id UUID,
    content TEXT,
    media_url TEXT,
    likes_count INTEGER,
    replies_count INTEGER,
    is_edited BOOLEAN,
    created_at TIMESTAMPTZ,
    parent_id UUID,
    author_id UUID,
    author_username VARCHAR,
    author_display_name VARCHAR,
    author_avatar_url TEXT,
    user_liked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fc.id as comment_id,
        fc.content,
        fc.media_url,
        fc.likes_count,
        fc.replies_count,
        fc.is_edited,
        fc.created_at,
        fc.parent_id,
        u.id as author_id,
        u.username::VARCHAR,
        u.display_name::VARCHAR,
        u.avatar_url,
        EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = fc.id AND cl.user_id = p_user_id) as user_liked
    FROM feed_comments fc
    JOIN users u ON fc.user_id = u.id
    WHERE fc.post_id = p_post_id
    AND fc.is_hidden = false
    AND fc.parent_id IS NULL
    ORDER BY fc.created_at ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour les hashtags tendance
CREATE OR REPLACE FUNCTION get_trending_hashtags(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    hashtag_id UUID,
    tag VARCHAR,
    posts_count INTEGER,
    trending_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.id as hashtag_id,
        h.tag::VARCHAR,
        h.posts_count,
        h.trending_score
    FROM hashtags h
    WHERE h.updated_at > NOW() - INTERVAL '7 days'
    ORDER BY h.trending_score DESC, h.posts_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre a jour le score tendance des hashtags
CREATE OR REPLACE FUNCTION update_hashtag_trending()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE hashtags h
    SET trending_score = (
        SELECT COUNT(*) *
            CASE
                WHEN ph.post_id IN (SELECT id FROM feed_posts WHERE created_at > NOW() - INTERVAL '1 hour') THEN 10
                WHEN ph.post_id IN (SELECT id FROM feed_posts WHERE created_at > NOW() - INTERVAL '6 hours') THEN 5
                WHEN ph.post_id IN (SELECT id FROM feed_posts WHERE created_at > NOW() - INTERVAL '24 hours') THEN 2
                ELSE 1
            END
        FROM post_hashtags ph
        WHERE ph.hashtag_id = h.id
    )
    WHERE h.id IN (SELECT hashtag_id FROM post_hashtags WHERE post_id = NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hashtag_trending
    AFTER INSERT ON post_hashtags
    FOR EACH ROW
    EXECUTE FUNCTION update_hashtag_trending();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_muted_users ENABLE ROW LEVEL SECURITY;

-- Policies pour feed_posts
CREATE POLICY "Users can view accessible posts" ON feed_posts
    FOR SELECT USING (
        visibility = 'public'
        OR user_id = auth.uid()
        OR (visibility = 'friends' AND user_id IN (
            SELECT CASE WHEN user1_id = auth.uid() THEN user2_id ELSE user1_id END
            FROM friendships WHERE (user1_id = auth.uid() OR user2_id = auth.uid()) AND status = 'accepted'
        ))
        OR (visibility = 'circle' AND circle_id IN (
            SELECT circle_id FROM circle_members WHERE user_id = auth.uid() AND status = 'active'
        ))
    );

CREATE POLICY "Users can create their own posts" ON feed_posts
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own posts" ON feed_posts
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts" ON feed_posts
    FOR DELETE USING (user_id = auth.uid());

-- Policies pour feed_likes
CREATE POLICY "Users can view likes" ON feed_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their likes" ON feed_likes
    FOR ALL USING (user_id = auth.uid());

-- Policies pour feed_comments
CREATE POLICY "Users can view comments" ON feed_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON feed_comments
    FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their comments" ON feed_comments
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their comments" ON feed_comments
    FOR DELETE USING (user_id = auth.uid());

-- Policies pour comment_likes
CREATE POLICY "Users can view comment likes" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can manage their comment likes" ON comment_likes
    FOR ALL USING (user_id = auth.uid());

-- Policies pour feed_bookmarks
CREATE POLICY "Users can manage their bookmarks" ON feed_bookmarks
    FOR ALL USING (user_id = auth.uid());

-- Policies pour feed_mentions
CREATE POLICY "Users can view their mentions" ON feed_mentions
    FOR SELECT USING (mentioned_user_id = auth.uid() OR mentioned_by = auth.uid());

-- Policies pour hidden_posts
CREATE POLICY "Users can manage their hidden posts" ON hidden_posts
    FOR ALL USING (user_id = auth.uid());

-- Policies pour feed_muted_users
CREATE POLICY "Users can manage their muted users" ON feed_muted_users
    FOR ALL USING (user_id = auth.uid());

-- =============================================
-- INDEXES ADDITIONNELS POUR PERFORMANCE
-- =============================================

CREATE INDEX idx_feed_posts_trending ON feed_posts(likes_count DESC, comments_count DESC, created_at DESC)
    WHERE is_hidden = false AND created_at > NOW() - INTERVAL '7 days';

CREATE INDEX idx_feed_comments_recent ON feed_comments(post_id, created_at DESC)
    WHERE is_hidden = false;


-- ============================================================================
-- 036_international_schools_support.sql
-- ============================================================================
-- ============================================================================
-- TEENS PARTY MOROCCO - International Schools Support
-- ============================================================================
-- Migration: 026_international_schools_support.sql
-- Description: Support pour écoles privées internationales au Maroc
-- (Écoles françaises, américaines, britanniques, IB, etc.)
-- ============================================================================

-- ============================================================================
-- SCHOOL TYPE DETECTION
-- ============================================================================

-- Ajouter colonne pour type d'école dans teens
ALTER TABLE public.teens
ADD COLUMN IF NOT EXISTS school_type VARCHAR(50) CHECK (school_type IN (
  'french', 'american', 'british', 'ib', 'other', 'unknown'
));

-- Ajouter colonne pour curriculum
ALTER TABLE public.teens
ADD COLUMN IF NOT EXISTS curriculum VARCHAR(100);

-- Ajouter colonne pour langue d'enseignement principale
ALTER TABLE public.teens
ADD COLUMN IF NOT EXISTS primary_language VARCHAR(20) DEFAULT 'french';

-- Index pour recherche par type d'école
CREATE INDEX IF NOT EXISTS idx_teens_school_type ON public.teens(school_type);
CREATE INDEX IF NOT EXISTS idx_teens_curriculum ON public.teens(curriculum);

COMMENT ON COLUMN public.teens.school_type IS 'Type d''école : french, american, british, ib, other, unknown';
COMMENT ON COLUMN public.teens.curriculum IS 'Nom du curriculum (ex: Programme Français, American Curriculum)';
COMMENT ON COLUMN public.teens.primary_language IS 'Langue d''enseignement principale';

-- ============================================================================
-- CONTENT CURRICULUM MAPPING
-- ============================================================================

-- Table pour mapper le contenu au curriculum
CREATE TABLE IF NOT EXISTS public.content_curriculum_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence au contenu
  content_type VARCHAR(50) NOT NULL,
  content_id UUID NOT NULL,
  
  -- Curriculum
  school_type VARCHAR(50) NOT NULL,
  curriculum VARCHAR(100) NOT NULL,
  
  -- Adaptation
  adapted_title TEXT,
  adapted_description TEXT,
  language VARCHAR(20) DEFAULT 'french',
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_type, content_id, school_type)
);

CREATE INDEX IF NOT EXISTS idx_content_curriculum_type ON public.content_curriculum_mapping(school_type, curriculum);
CREATE INDEX IF NOT EXISTS idx_content_curriculum_content ON public.content_curriculum_mapping(content_type, content_id);

-- ============================================================================
-- SUBJECT MAPPING BY CURRICULUM
-- ============================================================================

-- Table pour mapper les matières selon le curriculum
CREATE TABLE IF NOT EXISTS public.curriculum_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Curriculum
  school_type VARCHAR(50) NOT NULL,
  curriculum VARCHAR(100) NOT NULL,
  
  -- Matière
  subject_id VARCHAR(50) NOT NULL,
  subject_label_fr VARCHAR(100),
  subject_label_en VARCHAR(100),
  subject_label_ar VARCHAR(100),
  
  -- Niveaux disponibles
  available_grade_levels TEXT[],
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(school_type, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_subjects_type ON public.curriculum_subjects(school_type);
CREATE INDEX IF NOT EXISTS idx_curriculum_subjects_active ON public.curriculum_subjects(is_active) WHERE is_active = true;

-- ============================================================================
-- SEED DATA: SUBJECTS BY CURRICULUM
-- ============================================================================

-- Programme Français
INSERT INTO public.curriculum_subjects (school_type, curriculum, subject_id, subject_label_fr, available_grade_levels) VALUES
('french', 'Programme Français', 'math', 'Mathématiques', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'french', 'Français', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'english', 'Anglais', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'spanish', 'Espagnol', ARRAY['4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'physics', 'Physique-Chimie', ARRAY['4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'svt', 'SVT', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'history', 'Histoire-Géographie', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'philosophy', 'Philosophie', ARRAY['Terminale']),
('french', 'Programme Français', 'economics', 'SES', ARRAY['2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'art', 'Arts Plastiques', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale']),
('french', 'Programme Français', 'music', 'Éducation Musicale', ARRAY['6ème', '5ème', '4ème', '3ème']),
('french', 'Programme Français', 'sport', 'EPS', ARRAY['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'])
ON CONFLICT (school_type, subject_id) DO NOTHING;

-- Programme Américain
INSERT INTO public.curriculum_subjects (school_type, curriculum, subject_id, subject_label_fr, subject_label_en, available_grade_levels) VALUES
('american', 'American Curriculum', 'math', 'Mathématiques', 'Mathematics', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'english', 'Anglais', 'English Language Arts', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'science', 'Sciences', 'Science', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']),
('american', 'American Curriculum', 'biology', 'Biologie', 'Biology', ARRAY['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'chemistry', 'Chimie', 'Chemistry', ARRAY['Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'physics', 'Physique', 'Physics', ARRAY['Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'history', 'Histoire', 'History', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'social_studies', 'Sciences Sociales', 'Social Studies', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']),
('american', 'American Curriculum', 'french', 'Français', 'French', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'spanish', 'Espagnol', 'Spanish', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'art', 'Arts', 'Art', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'music', 'Musique', 'Music', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'pe', 'Éducation Physique', 'Physical Education', ARRAY['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']),
('american', 'American Curriculum', 'computer_science', 'Informatique', 'Computer Science', ARRAY['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'])
ON CONFLICT (school_type, subject_id) DO NOTHING;

-- Programme Britannique
INSERT INTO public.curriculum_subjects (school_type, curriculum, subject_id, subject_label_fr, subject_label_en, available_grade_levels) VALUES
('british', 'British Curriculum', 'math', 'Mathématiques', 'Mathematics', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'english', 'Anglais', 'English', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'science', 'Sciences', 'Science', ARRAY['Year 7', 'Year 8', 'Year 9']),
('british', 'British Curriculum', 'biology', 'Biologie', 'Biology', ARRAY['Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'chemistry', 'Chimie', 'Chemistry', ARRAY['Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'physics', 'Physique', 'Physics', ARRAY['Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'history', 'Histoire', 'History', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'geography', 'Géographie', 'Geography', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'french', 'Français', 'French', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'spanish', 'Espagnol', 'Spanish', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'art', 'Arts', 'Art & Design', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'music', 'Musique', 'Music', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13']),
('british', 'British Curriculum', 'pe', 'Éducation Physique', 'Physical Education', ARRAY['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12', 'Year 13'])
ON CONFLICT (school_type, subject_id) DO NOTHING;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Fonction pour détecter automatiquement le type d'école
CREATE OR REPLACE FUNCTION detect_school_type(p_school_name TEXT)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_name TEXT := LOWER(COALESCE(p_school_name, ''));
BEGIN
  -- Écoles françaises
  IF v_name LIKE '%lycée%' OR v_name LIKE '%lycee%' OR 
     v_name LIKE '%collège%' OR v_name LIKE '%college%' OR
     v_name LIKE '%école française%' OR v_name LIKE '%ecole francaise%' OR
     v_name LIKE '%french school%' OR v_name LIKE '%lycée français%' OR
     v_name LIKE '%lycee francais%' THEN
    RETURN 'french';
  END IF;
  
  -- Écoles américaines
  IF v_name LIKE '%american school%' OR v_name LIKE '%academy%' OR
     v_name LIKE '%high school%' OR v_name LIKE '%middle school%' OR
     v_name LIKE '%elementary%' OR v_name LIKE '%grade school%' THEN
    RETURN 'american';
  END IF;
  
  -- Écoles britanniques
  IF v_name LIKE '%british school%' OR v_name LIKE '%british international%' THEN
    RETURN 'british';
  END IF;
  
  -- IB
  IF v_name LIKE '%ib school%' OR v_name LIKE '%international baccalaureate%' OR
     v_name LIKE '%myp%' OR v_name LIKE '%dp%' THEN
    RETURN 'ib';
  END IF;
  
  RETURN 'unknown';
END;
$$;

-- Fonction pour obtenir le curriculum
CREATE OR REPLACE FUNCTION get_curriculum_name(p_school_type VARCHAR(50))
RETURNS VARCHAR(100)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_school_type
    WHEN 'french' THEN RETURN 'Programme Français';
    WHEN 'american' THEN RETURN 'American Curriculum';
    WHEN 'british' THEN RETURN 'British Curriculum';
    WHEN 'ib' THEN RETURN 'International Baccalaureate';
    ELSE RETURN 'Autre Programme';
  END CASE;
END;
$$;

COMMENT ON TABLE public.content_curriculum_mapping IS 'Mapping du contenu selon le curriculum';
COMMENT ON TABLE public.curriculum_subjects IS 'Matières disponibles par curriculum';




-- ============================================================================
-- 037_social_shares.sql
-- ============================================================================
-- =============================================
-- MIGRATION 026: Social Sharing System
-- =============================================
-- Systeme de partage vers reseaux sociaux externes
-- et generation de cartes partageables
-- =============================================

-- Table des partages sociaux
CREATE TABLE IF NOT EXISTS social_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Type de contenu partagé
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN (
        'achievement',      -- Badge debloque
        'level_up',         -- Montee de niveau
        'challenge',        -- Defi complete
        'creation',         -- Creation artistique
        'record',           -- Record personnel
        'streak',           -- Serie maintenue
        'profile',          -- Profil public
        'leaderboard',      -- Position classement
        'certificate',      -- Certificat/diplome
        'event',            -- Participation evenement
        'milestone',        -- Objectif atteint
        'custom'            -- Contenu personnalise
    )),
    content_id UUID,

    -- Plateforme de partage
    platform VARCHAR(30) NOT NULL CHECK (platform IN (
        'facebook',
        'twitter',
        'instagram',
        'whatsapp',
        'telegram',
        'tiktok',
        'snapchat',
        'linkedin',
        'copy_link',
        'download',
        'email'
    )),

    -- Données du partage
    share_url TEXT,
    share_image_url TEXT,
    share_title VARCHAR(200),
    share_description TEXT,
    share_hashtags TEXT[],

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Tracking
    click_count INTEGER DEFAULT 0,
    was_completed BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_social_shares_user ON social_shares(user_id, created_at DESC);
CREATE INDEX idx_social_shares_content ON social_shares(content_type, content_id);
CREATE INDEX idx_social_shares_platform ON social_shares(platform);

-- Table des templates de cartes partageables
CREATE TABLE IF NOT EXISTS share_card_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Type de contenu supporté
    content_type VARCHAR(50) NOT NULL,

    -- Design
    template_url TEXT NOT NULL,
    thumbnail_url TEXT,

    -- Configuration
    config JSONB DEFAULT '{}'::jsonb,
    -- Exemple: {
    --   "width": 1200,
    --   "height": 630,
    --   "background_color": "#1a1a2e",
    --   "text_color": "#ffffff",
    --   "accent_color": "#00d4ff",
    --   "font": "Inter",
    --   "elements": [...]
    -- }

    -- Disponibilité
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Stats
    usage_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_templates_type ON share_card_templates(content_type, is_active);

-- Table des cartes générées
CREATE TABLE IF NOT EXISTS generated_share_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES share_card_templates(id) ON DELETE SET NULL,

    -- Contenu
    content_type VARCHAR(50) NOT NULL,
    content_id UUID,
    content_data JSONB NOT NULL,

    -- Image générée
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,

    -- Dimensions
    width INTEGER DEFAULT 1200,
    height INTEGER DEFAULT 630,

    -- Stats
    share_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,

    -- Expiration (optionnel pour les URLs signées)
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generated_cards_user ON generated_share_cards(user_id, created_at DESC);
CREATE INDEX idx_generated_cards_content ON generated_share_cards(content_type, content_id);

-- Table des liens de partage avec tracking
CREATE TABLE IF NOT EXISTS share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Code court unique
    short_code VARCHAR(20) NOT NULL UNIQUE,

    -- Destination
    target_type VARCHAR(50) NOT NULL,
    target_id UUID,
    target_url TEXT NOT NULL,

    -- Metadata pour OG tags
    og_title VARCHAR(200),
    og_description TEXT,
    og_image TEXT,

    -- Stats
    click_count INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,

    -- Expiration
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_links_code ON share_links(short_code) WHERE is_active = true;
CREATE INDEX idx_share_links_user ON share_links(user_id, created_at DESC);

-- Table des clics sur liens de partage
CREATE TABLE IF NOT EXISTS share_link_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,

    -- Info visiteur (anonymisé)
    visitor_hash VARCHAR(64), -- Hash de l'IP pour comptage unique
    referrer TEXT,
    platform VARCHAR(50),
    country VARCHAR(2),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_share_clicks_link ON share_link_clicks(link_id, created_at DESC);

-- Table des récompenses de partage
CREATE TABLE IF NOT EXISTS share_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Configuration
    platform VARCHAR(30) NOT NULL,
    content_type VARCHAR(50),

    -- Récompenses
    xp_reward INTEGER DEFAULT 10,
    tokens_reward INTEGER DEFAULT 0,

    -- Limites
    daily_limit INTEGER DEFAULT 5,
    weekly_limit INTEGER DEFAULT 20,

    -- Bonus pour viralité
    click_milestone INTEGER DEFAULT 10,
    click_bonus_xp INTEGER DEFAULT 50,

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des statistiques de partage par utilisateur
CREATE TABLE IF NOT EXISTS user_share_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Compteurs globaux
    total_shares INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_xp_earned INTEGER DEFAULT 0,

    -- Par plateforme
    shares_by_platform JSONB DEFAULT '{}'::jsonb,

    -- Par type de contenu
    shares_by_type JSONB DEFAULT '{}'::jsonb,

    -- Compteurs journaliers (reset quotidien)
    daily_shares INTEGER DEFAULT 0,
    daily_reset_at DATE DEFAULT CURRENT_DATE,

    -- Meilleur partage
    best_share_id UUID REFERENCES social_shares(id),
    best_share_clicks INTEGER DEFAULT 0,

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- =============================================
-- FONCTIONS
-- =============================================

-- Fonction pour générer un code court unique
CREATE OR REPLACE FUNCTION generate_short_code(length INTEGER DEFAULT 8)
RETURNS VARCHAR AS $$
DECLARE
    chars VARCHAR := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR := '';
    i INTEGER;
BEGIN
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer un lien de partage
CREATE OR REPLACE FUNCTION create_share_link(
    p_user_id UUID,
    p_target_type VARCHAR,
    p_target_id UUID,
    p_target_url TEXT,
    p_og_title VARCHAR DEFAULT NULL,
    p_og_description TEXT DEFAULT NULL,
    p_og_image TEXT DEFAULT NULL,
    p_expires_days INTEGER DEFAULT NULL
)
RETURNS TABLE (
    link_id UUID,
    short_code VARCHAR,
    full_url TEXT
) AS $$
DECLARE
    v_link_id UUID;
    v_short_code VARCHAR;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Générer un code unique
    LOOP
        v_short_code := generate_short_code(8);
        EXIT WHEN NOT EXISTS (SELECT 1 FROM share_links WHERE short_code = v_short_code);
    END LOOP;

    -- Calculer expiration
    IF p_expires_days IS NOT NULL THEN
        v_expires_at := NOW() + (p_expires_days || ' days')::INTERVAL;
    END IF;

    -- Créer le lien
    INSERT INTO share_links (
        user_id, short_code, target_type, target_id, target_url,
        og_title, og_description, og_image, expires_at
    )
    VALUES (
        p_user_id, v_short_code, p_target_type, p_target_id, p_target_url,
        p_og_title, p_og_description, p_og_image, v_expires_at
    )
    RETURNING id INTO v_link_id;

    RETURN QUERY SELECT
        v_link_id,
        v_short_code,
        'https://teensparty.ma/s/' || v_short_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour enregistrer un partage
CREATE OR REPLACE FUNCTION record_social_share(
    p_user_id UUID,
    p_content_type VARCHAR,
    p_content_id UUID,
    p_platform VARCHAR,
    p_share_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_share_id UUID;
    v_reward_xp INTEGER;
    v_stats user_share_stats%ROWTYPE;
    v_daily_limit INTEGER;
    v_result JSONB;
BEGIN
    -- Récupérer ou créer les stats utilisateur
    INSERT INTO user_share_stats (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO UPDATE SET
        daily_shares = CASE
            WHEN user_share_stats.daily_reset_at < CURRENT_DATE THEN 0
            ELSE user_share_stats.daily_shares
        END,
        daily_reset_at = CURRENT_DATE
    RETURNING * INTO v_stats;

    -- Vérifier la limite journalière
    SELECT COALESCE(daily_limit, 5) INTO v_daily_limit
    FROM share_rewards
    WHERE platform = p_platform AND is_active = true
    LIMIT 1;

    IF v_stats.daily_shares >= v_daily_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'daily_limit_reached',
            'message', 'Limite de partages journaliers atteinte'
        );
    END IF;

    -- Créer l'enregistrement de partage
    INSERT INTO social_shares (
        user_id, content_type, content_id, platform,
        share_title, share_description, share_hashtags, metadata
    )
    VALUES (
        p_user_id, p_content_type, p_content_id, p_platform,
        p_share_data->>'title',
        p_share_data->>'description',
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_share_data->'hashtags', '[]'::jsonb))),
        p_share_data
    )
    RETURNING id INTO v_share_id;

    -- Récupérer la récompense
    SELECT COALESCE(xp_reward, 10) INTO v_reward_xp
    FROM share_rewards
    WHERE platform = p_platform
    AND (content_type IS NULL OR content_type = p_content_type)
    AND is_active = true
    LIMIT 1;

    IF v_reward_xp IS NULL THEN
        v_reward_xp := 10; -- Défaut
    END IF;

    -- Attribuer l'XP
    UPDATE users SET xp = xp + v_reward_xp WHERE id = p_user_id;

    -- Mettre à jour les stats
    UPDATE user_share_stats SET
        total_shares = total_shares + 1,
        total_xp_earned = total_xp_earned + v_reward_xp,
        daily_shares = daily_shares + 1,
        shares_by_platform = jsonb_set(
            COALESCE(shares_by_platform, '{}'::jsonb),
            ARRAY[p_platform],
            to_jsonb(COALESCE((shares_by_platform->>p_platform)::int, 0) + 1)
        ),
        shares_by_type = jsonb_set(
            COALESCE(shares_by_type, '{}'::jsonb),
            ARRAY[p_content_type],
            to_jsonb(COALESCE((shares_by_type->>p_content_type)::int, 0) + 1)
        ),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Notification
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        p_user_id,
        'share_reward',
        'Partage récompensé !',
        'Tu as gagné ' || v_reward_xp || ' XP pour ton partage',
        jsonb_build_object('share_id', v_share_id, 'xp', v_reward_xp, 'platform', p_platform)
    );

    RETURN jsonb_build_object(
        'success', true,
        'share_id', v_share_id,
        'xp_earned', v_reward_xp,
        'daily_shares', v_stats.daily_shares + 1,
        'daily_limit', v_daily_limit
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour enregistrer un clic sur lien
CREATE OR REPLACE FUNCTION record_link_click(
    p_short_code VARCHAR,
    p_visitor_hash VARCHAR DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL,
    p_platform VARCHAR DEFAULT NULL,
    p_country VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_link share_links%ROWTYPE;
    v_is_unique BOOLEAN;
    v_owner_id UUID;
BEGIN
    -- Récupérer le lien
    SELECT * INTO v_link
    FROM share_links
    WHERE short_code = p_short_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());

    IF v_link IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'link_not_found');
    END IF;

    -- Vérifier si visiteur unique
    v_is_unique := NOT EXISTS (
        SELECT 1 FROM share_link_clicks
        WHERE link_id = v_link.id AND visitor_hash = p_visitor_hash
    );

    -- Enregistrer le clic
    INSERT INTO share_link_clicks (link_id, visitor_hash, referrer, platform, country)
    VALUES (v_link.id, p_visitor_hash, p_referrer, p_platform, p_country);

    -- Mettre à jour les compteurs
    UPDATE share_links SET
        click_count = click_count + 1,
        unique_visitors = unique_visitors + CASE WHEN v_is_unique THEN 1 ELSE 0 END
    WHERE id = v_link.id;

    -- Mettre à jour les stats utilisateur
    UPDATE user_share_stats SET
        total_clicks = total_clicks + 1,
        updated_at = NOW()
    WHERE user_id = v_link.user_id;

    -- Vérifier les milestones de clics pour bonus XP
    IF v_link.click_count % 10 = 0 THEN
        UPDATE users SET xp = xp + 50 WHERE id = v_link.user_id;

        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            v_link.user_id,
            'share_milestone',
            'Ton partage cartonne !',
            'Ton lien a atteint ' || v_link.click_count || ' clics ! +50 XP',
            jsonb_build_object('link_id', v_link.id, 'clicks', v_link.click_count)
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'target_url', v_link.target_url,
        'og_title', v_link.og_title,
        'og_description', v_link.og_description,
        'og_image', v_link.og_image
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les stats de partage
CREATE OR REPLACE FUNCTION get_share_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_stats user_share_stats%ROWTYPE;
    v_recent_shares JSONB;
    v_top_shares JSONB;
BEGIN
    SELECT * INTO v_stats
    FROM user_share_stats
    WHERE user_id = p_user_id;

    IF v_stats IS NULL THEN
        RETURN jsonb_build_object(
            'total_shares', 0,
            'total_clicks', 0,
            'total_xp_earned', 0,
            'shares_by_platform', '{}'::jsonb,
            'shares_by_type', '{}'::jsonb,
            'recent_shares', '[]'::jsonb,
            'top_shares', '[]'::jsonb
        );
    END IF;

    -- Partages récents
    SELECT jsonb_agg(row_to_json(s)) INTO v_recent_shares
    FROM (
        SELECT id, content_type, platform, click_count, created_at
        FROM social_shares
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
        LIMIT 5
    ) s;

    -- Meilleurs partages
    SELECT jsonb_agg(row_to_json(s)) INTO v_top_shares
    FROM (
        SELECT id, content_type, platform, click_count, created_at
        FROM social_shares
        WHERE user_id = p_user_id
        ORDER BY click_count DESC
        LIMIT 5
    ) s;

    RETURN jsonb_build_object(
        'total_shares', v_stats.total_shares,
        'total_clicks', v_stats.total_clicks,
        'total_xp_earned', v_stats.total_xp_earned,
        'shares_by_platform', v_stats.shares_by_platform,
        'shares_by_type', v_stats.shares_by_type,
        'daily_shares', v_stats.daily_shares,
        'recent_shares', COALESCE(v_recent_shares, '[]'::jsonb),
        'top_shares', COALESCE(v_top_shares, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DONNÉES INITIALES
-- =============================================

-- Templates de cartes par défaut
INSERT INTO share_card_templates (name, description, content_type, template_url, config, is_premium)
VALUES
    ('Achievement Classic', 'Carte classique pour badges', 'achievement', '/templates/achievement-classic.svg',
     '{"width": 1200, "height": 630, "style": "classic"}', false),
    ('Achievement Neon', 'Carte néon pour badges', 'achievement', '/templates/achievement-neon.svg',
     '{"width": 1200, "height": 630, "style": "neon"}', true),
    ('Level Up Burst', 'Carte explosive niveau', 'level_up', '/templates/levelup-burst.svg',
     '{"width": 1200, "height": 630, "style": "burst"}', false),
    ('Challenge Victory', 'Carte victoire défi', 'challenge', '/templates/challenge-victory.svg',
     '{"width": 1200, "height": 630, "style": "victory"}', false),
    ('Creation Showcase', 'Carte création artistique', 'creation', '/templates/creation-showcase.svg',
     '{"width": 1200, "height": 630, "style": "showcase"}', false),
    ('Streak Fire', 'Carte série en feu', 'streak', '/templates/streak-fire.svg',
     '{"width": 1200, "height": 630, "style": "fire"}', false),
    ('Profile Card', 'Carte de profil', 'profile', '/templates/profile-card.svg',
     '{"width": 1200, "height": 630, "style": "profile"}', false),
    ('Leaderboard Rank', 'Carte classement', 'leaderboard', '/templates/leaderboard-rank.svg',
     '{"width": 1200, "height": 630, "style": "rank"}', true)
ON CONFLICT DO NOTHING;

-- Récompenses par plateforme
INSERT INTO share_rewards (platform, xp_reward, tokens_reward, daily_limit, click_milestone, click_bonus_xp)
VALUES
    ('facebook', 15, 1, 5, 10, 50),
    ('twitter', 15, 1, 5, 10, 50),
    ('instagram', 20, 2, 3, 15, 75),
    ('whatsapp', 10, 0, 10, 5, 25),
    ('telegram', 10, 0, 10, 5, 25),
    ('tiktok', 25, 3, 3, 20, 100),
    ('snapchat', 15, 1, 5, 10, 50),
    ('linkedin', 10, 1, 3, 10, 50),
    ('copy_link', 5, 0, 20, 10, 25),
    ('download', 5, 0, 10, 0, 0),
    ('email', 10, 0, 5, 5, 25)
ON CONFLICT DO NOTHING;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE social_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_share_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_share_stats ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their shares" ON social_shares
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create shares" ON social_shares
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their cards" ON generated_share_cards
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create cards" ON generated_share_cards
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their links" ON share_links
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create links" ON share_links
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their stats" ON user_share_stats
    FOR SELECT USING (user_id = auth.uid());

-- Templates visibles par tous
CREATE POLICY "Anyone can view active templates" ON share_card_templates
    FOR SELECT USING (is_active = true);

