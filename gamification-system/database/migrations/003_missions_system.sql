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

-- The user_challenges table is owned by a downstream migration that may not
-- have shipped yet; only attach the trigger when the table is present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_challenges') THEN
    DROP TRIGGER IF EXISTS on_challenge_complete_update_missions ON public.user_challenges;
    CREATE TRIGGER on_challenge_complete_update_missions
      AFTER INSERT OR UPDATE ON public.user_challenges
      FOR EACH ROW
      EXECUTE FUNCTION trigger_update_missions_on_challenge();
  END IF;
END $$;

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
