-- 113_realityfix_circle_join_xp_signature.sql
--
-- #60 — The award_circle_join_xp() trigger (fires when a circle_members row
-- becomes active, including the auto_add_circle_owner path on circle creation)
-- calls add_xp_to_user with a non-existent 5-arg signature
-- (uuid, integer, text, uuid, text) — it passes circle_id where the function
-- expects p_source_category (text). The only real signature is 6-arg:
-- add_xp_to_user(p_teen_id, p_xp_amount, p_source_type, p_source_category,
-- p_source_id, p_description). As a result EVERY circle create/join errored
-- ("function add_xp_to_user(...) does not exist"), so the messaging backend
-- being mounted in #60 could never produce a member or a message.
--
-- Fix: call the canonical 6-arg signature with 'circle' as the source category
-- and circle_id as the source id. Idempotent (CREATE OR REPLACE). search_path
-- stays pinned (set by #56).

CREATE OR REPLACE FUNCTION public.award_circle_join_xp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
BEGIN
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
    PERFORM add_xp_to_user(
      NEW.teen_id,
      10,
      'circle_join',
      'circle',
      NEW.circle_id,
      'Rejoint un cercle'
    );
  END IF;
  RETURN NEW;
END;
$function$;
