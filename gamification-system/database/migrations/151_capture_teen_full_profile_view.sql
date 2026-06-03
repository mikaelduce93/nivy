-- 151_capture_teen_full_profile_view.sql
--
-- REPRODUCTIBILITÉ: la vue public.teen_full_profile existe en live mais sa définition
-- n'était dans AUCUN fichier de migration du repo (gap découvert pendant l'audit V7).
-- Elle est pourtant la source canonique du profil teen agrégé (pseudo/level/total_xp/
-- coins_balance), consommée par lib/server/teen-dashboard.ts, lib/ai/context-engine.ts, etc.
-- Un rebuild repo-only la perdait.
--
-- Cette migration capture la définition LIVE à l'identique (security_invoker=true pour que
-- la RLS des tables sources s'applique au rôle appelant — cf. 110_realityfix_pii_views_invoker).
-- Idempotent: CREATE OR REPLACE VIEW (colonnes identiques à l'existant).
--
-- Sources: teens (identité) + user_xp (level/total_xp) + user_coins (balance).

CREATE OR REPLACE VIEW public.teen_full_profile
WITH (security_invoker = true) AS
 SELECT t.id,
    t.parent_id AS primary_parent_id,
    t.first_name,
    t.last_name,
    t.pseudo,
    t.avatar_url,
    COALESCE(x.current_level, 1) AS level,
        CASE COALESCE(x.current_level, 1)
            WHEN 1 THEN 'Rookie'::text
            WHEN 2 THEN 'Explorateur'::text
            WHEN 3 THEN 'Aventurier'::text
            ELSE 'Champion'::text
        END AS title,
    '🌱'::text AS title_icon,
    COALESCE(c.balance, 0) AS coins_balance,
    COALESCE(x.total_xp, 0) AS total_xp
   FROM teens t
     LEFT JOIN user_xp x ON x.teen_id = t.id
     LEFT JOIN user_coins c ON c.teen_id = t.id;
