-- 178_refresh_seasonal_missions.sql
-- ---------------------------------------------------------------------------
-- #357 (tokenomics-coherence) — Rafraîchir les missions saisonnières.
--
-- Les seeds de 003_missions_system.sql utilisent des fenêtres 2025
-- (valid_from/valid_until) → hors fenêtre en 2026, donc inactives. On décale
-- chaque template saisonnier PASSÉ d'un nombre entier d'années vers l'avenir,
-- jusqu'à ce que sa fenêtre soit à venir. Stratégie de récurrence retenue :
-- décalage annuel jusqu'à la prochaine occurrence (à ré-exécuter chaque année,
-- ou à remplacer par une génération dynamique côté cron plus tard).
--
-- Idempotent : ne touche que les templates dont valid_until est déjà passé ;
-- après décalage, valid_until >= CURRENT_DATE → non re-sélectionné.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r RECORD;
  v_years int;
BEGIN
  FOR r IN
    SELECT code, valid_until
    FROM public.mission_templates
    WHERE mission_type = 'seasonal'
      AND valid_until IS NOT NULL
      AND valid_until < CURRENT_DATE
  LOOP
    -- Nombre d'années à ajouter pour repasser la fenêtre dans le futur.
    v_years := FLOOR(EXTRACT(YEAR FROM age(CURRENT_DATE, r.valid_until)))::int + 1;
    UPDATE public.mission_templates
    SET valid_from  = valid_from  + make_interval(years => v_years),
        valid_until = valid_until + make_interval(years => v_years)
    WHERE code = r.code;
  END LOOP;
END $$;
