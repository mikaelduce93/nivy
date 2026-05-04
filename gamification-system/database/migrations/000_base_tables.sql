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
