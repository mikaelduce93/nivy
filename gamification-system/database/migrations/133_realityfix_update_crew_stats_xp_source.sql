-- 133_realityfix_update_crew_stats_xp_source.sql
-- ---------------------------------------------------------------------------
-- #228 (socle, realityfix) — Débloque les dépenses de coins des membres de crew.
--
-- BUG pré-existant : update_crew_stats() agrège les XP d'un crew via
--   JOIN profiles p ON cm.user_id = p.id ... SUM(p.total_xp), AVG(p.level)
-- mais `profiles` n'a NI total_xp NI level (ils vivent sur `user_xp` :
-- total_xp + current_level). La fonction lève donc « column p.total_xp does not
-- exist » à chaque exécution.
--
-- Elle est appelée par le trigger on_user_xp_update_crew_contribution (sur
-- user_xp). Conséquence : DÈS qu'un membre de crew gagne/dépense des coins
-- (le cashback met à jour user_xp → trigger → update_crew_stats → ERREUR),
-- TOUTE la dépense est annulée. spend_teen_coins ET split_group_purchase
-- échouaient pour tout ado appartenant à un crew. Découvert au smoke-test #228.
--
-- FIX : ré-orienter l'agrégation vers user_xp (source réelle des XP), en
-- gardant la sémantique (SUM total_xp, AVG niveau, COUNT membres actifs).
--   crew_members.user_id = profiles.id = teens.id = user_xp.teen_id.
-- Idempotent (CREATE OR REPLACE).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_crew_stats(p_crew_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_total_xp BIGINT;
    v_avg_level DECIMAL(5,2);
    v_member_count INTEGER;
BEGIN
    -- Stats agrégées du crew, lues sur user_xp (source réelle des XP/niveau).
    SELECT
        COALESCE(SUM(ux.total_xp), 0),
        COALESCE(AVG(ux.current_level), 1),
        COUNT(*)
    INTO v_total_xp, v_avg_level, v_member_count
    FROM crew_members cm
    JOIN user_xp ux ON ux.teen_id = cm.user_id
    WHERE cm.crew_id = p_crew_id AND cm.status = 'active';

    UPDATE crews
    SET
        total_xp = v_total_xp,
        average_level = v_avg_level,
        updated_at = NOW()
    WHERE id = p_crew_id;

    PERFORM check_crew_achievements(p_crew_id);
END;
$function$;

COMMENT ON FUNCTION public.update_crew_stats(uuid) IS
  '#228 realityfix: agrège les XP du crew via user_xp (total_xp/current_level), plus profiles (qui ne porte pas ces colonnes).';
