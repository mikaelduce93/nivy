-- ============================================================================
-- Migration 169 — Quiz XP : crédit à la PREMIÈRE réussite uniquement
-- ============================================================================
-- ⚠️ À APPLIQUER — fichier écrit le 2026-07-11, PAS encore appliqué à la base
-- (pas d'accès MCP au moment de l'écriture). En attendant l'application, la
-- garde applicative (app/api/teen/quiz/submit/route.ts et
-- app/api/teen/education/quizzes/route.ts : check quiz_attempts.xp_earned > 0
-- avant tout crédit) suffit seule.
--
-- Contexte : audit 2026-07-11 gamification, trouvaille Q4 (P0 anti-triche) —
-- docs/audits/audit-2026-07-11-gamification/quiz.md. Rien n'empêchait un ado
-- de rejouer indéfiniment un quiz déjà réussi pour farmer l'XP :
--   * quiz_attempts n'a aucune contrainte UNIQUE(teen_id, quiz_id)
--     (022_pillars_system.sql:141-163)
--   * add_xp_to_user créditait à chaque appel, sans idempotence par source
--
-- Politique produit (PO) : rejouer un quiz reste possible (entraînement) et
-- CHAQUE tentative reste enregistrée dans quiz_attempts (historique, stats,
-- pilier École). On n'ajoute donc volontairement PAS de contrainte d'unicité
-- sur quiz_attempts — le rejeu doit rester enregistrable. La protection vit
-- dans la fonction qui crédite : add_xp_to_user refuse un second crédit de
-- source_type 'quiz' pour le même (teen, quiz), en s'appuyant sur le grand
-- livre xp_transactions (teen_id + source_type='quiz' + source_id + amount>0).
--
-- Base : reprend mot pour mot la dernière définition canonique de
-- add_xp_to_user (060_wave_a_security_hardening.sql:145-225 — SECURITY
-- DEFINER, search_path épinglé, grants service_role+authenticated). Seul
-- ajout : la garde anti-rejeu, placée APRÈS le SELECT ... FOR UPDATE sur
-- user_xp pour que deux soumissions concurrentes du même teen se sérialisent
-- sur le verrou et que la seconde voie la ligne de ledger de la première
-- (READ COMMITTED) — ce qui ferme aussi la course TOCTOU résiduelle de la
-- garde applicative. L'alias déprécié add_user_xp (095) forwarde vers cette
-- fonction et hérite donc de la garde.
-- ============================================================================

BEGIN;

-- Index partiel pour que la garde reste un lookup indexé sur le ledger.
CREATE INDEX IF NOT EXISTS idx_xp_transactions_quiz_source
  ON public.xp_transactions (teen_id, source_id)
  WHERE source_type = 'quiz';

CREATE OR REPLACE FUNCTION public.add_xp_to_user(
  p_teen_id uuid,
  p_xp_amount integer,
  p_source_type character varying,
  p_source_category character varying DEFAULT NULL::character varying,
  p_source_id uuid DEFAULT NULL::uuid,
  p_description text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
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
  INSERT INTO public.user_xp (teen_id, total_xp, current_level)
  VALUES (p_teen_id, 0, 1)
  ON CONFLICT (teen_id) DO NOTHING;

  SELECT total_xp, current_level, xp_multiplier
  INTO v_current_xp, v_current_level, v_xp_multiplier
  FROM public.user_xp
  WHERE teen_id = p_teen_id
  FOR UPDATE;

  -- --------------------------------------------------------------------
  -- Garde anti-farm quiz (audit 2026-07-11 Q4) : l'XP d'un quiz n'est
  -- crédité qu'UNE seule fois par (teen, quiz). Les rejeux restent
  -- enregistrés côté produit (quiz_attempts) mais ne repassent jamais
  -- par un crédit. Placée après le FOR UPDATE : les appels concurrents
  -- du même teen se sérialisent, la seconde transaction revérifie et
  -- voit la ligne insérée par la première.
  -- --------------------------------------------------------------------
  IF p_source_type = 'quiz' AND p_source_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.xp_transactions xt
      WHERE xt.teen_id = p_teen_id
        AND xt.source_type = 'quiz'
        AND xt.source_id = p_source_id
        AND xt.amount > 0
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'xp_already_awarded',
        'reason', 'quiz_already_rewarded',
        'xp_gained', 0
      );
    END IF;
  END IF;

  v_final_xp := FLOOR(p_xp_amount * COALESCE(v_xp_multiplier, 1.00));
  v_new_xp := v_current_xp + v_final_xp;

  v_new_level := v_current_level;
  LOOP
    v_xp_for_level := v_new_level * 100;
    IF v_new_xp >= (v_new_level * (v_new_level + 1) / 2) * 100 THEN
      v_new_level := v_new_level + 1;
      v_leveled_up := true;
      v_levels_gained := v_levels_gained + 1;
    ELSE
      EXIT;
    END IF;

    IF v_new_level >= 100 THEN
      v_new_level := 100;
      EXIT;
    END IF;
  END LOOP;

  UPDATE public.user_xp
  SET
    total_xp = v_new_xp,
    current_level = v_new_level,
    xp_to_next_level = ((v_new_level * (v_new_level + 1) / 2) * 100) - v_new_xp,
    updated_at = NOW()
  WHERE teen_id = p_teen_id;

  INSERT INTO public.xp_transactions (teen_id, amount, source_type, source_id, description, multiplier_applied)
  VALUES (p_teen_id, v_final_xp, p_source_type, p_source_id, p_description, v_xp_multiplier);

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
$function$;

-- CREATE OR REPLACE conserve owner + ACL ; on ré-affirme quand même les
-- grants canoniques posés par 060 par sécurité.
REVOKE EXECUTE ON FUNCTION public.add_xp_to_user(uuid, integer, character varying, character varying, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_xp_to_user(uuid, integer, character varying, character varying, uuid, text) TO service_role, authenticated;

COMMENT ON FUNCTION public.add_xp_to_user IS
  'Ajoute de l XP à un utilisateur avec gestion automatique du niveau. '
  'Depuis 169 : idempotent pour source_type=quiz — un même (teen, quiz) '
  'n''est crédité qu''une fois (anti-farm, audit 2026-07-11 Q4).';

COMMIT;
