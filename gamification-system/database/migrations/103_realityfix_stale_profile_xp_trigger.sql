-- Reality Fix P0 — drop stale profiles.total_xp trigger, recreate on user_xp.
--
-- Diagnostic
-- ----------
-- The crew system (migration 007) installed a trigger
--   on_profile_xp_change AFTER UPDATE ON profiles
--   EXECUTE FUNCTION trigger_update_crew_member_contribution()
-- whose body reads OLD.total_xp / NEW.total_xp. At the time, profiles
-- carried total_xp directly. Wave 1A / 6C moved XP to user_xp (canonical
-- column user_xp.total_xp keyed by user_xp.teen_id, with the
-- profiles.id == teens.id == user_xp.teen_id invariant).
--
-- The profiles.total_xp column was dropped but the trigger and its
-- function body were not. Result: every UPDATE on profiles fails with
--   "record \"old\" has no field \"total_xp\""
-- which means the seed-beta-pivots script can't even flip is_onboarded.
-- This was first surfaced by the Reality Fix P0 seed run on 2026-05-09.
--
-- Fix
-- ---
-- 1. Drop the broken trigger from profiles.
-- 2. Rewrite the function body to read NEW.teen_id (the canonical FK to
--    crew_members.user_id under the Wave 1A identity invariant) instead
--    of NEW.id (which on profiles was the user id, but on user_xp is
--    the row id).
-- 3. Recreate the trigger on user_xp where total_xp actually lives.
--
-- Idempotent: uses DROP IF EXISTS / CREATE OR REPLACE / DROP+CREATE.

DROP TRIGGER IF EXISTS on_profile_xp_change ON public.profiles;

CREATE OR REPLACE FUNCTION public.trigger_update_crew_member_contribution()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Wave 1A invariant: user_xp.teen_id = profiles.id = crew_members.user_id.
  -- Fires on user_xp UPDATE only — INSERT (initial 0-balance row) does
  -- not contribute anything to a crew.
  IF TG_OP = 'UPDATE' AND OLD.total_xp IS DISTINCT FROM NEW.total_xp THEN
    UPDATE crew_members
    SET xp_contributed = xp_contributed + (NEW.total_xp - COALESCE(OLD.total_xp, 0)),
        last_active_at = NOW()
    WHERE user_id = NEW.teen_id AND status = 'active';

    PERFORM update_crew_stats(crew_id)
    FROM crew_members
    WHERE user_id = NEW.teen_id AND status = 'active';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_user_xp_update_crew_contribution ON public.user_xp;
CREATE TRIGGER on_user_xp_update_crew_contribution
  AFTER UPDATE ON public.user_xp
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_crew_member_contribution();
