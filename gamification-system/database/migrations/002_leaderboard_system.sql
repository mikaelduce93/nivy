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
