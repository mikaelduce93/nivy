-- 162_pending_teen_archetype.sql  (V11 #309, Pilier D)
--
-- L'étape « vibe de Niv » du funnel ado capture un archetype AVANT que le
-- compte n'existe (canon M11 : auth.users créé à la validation parentale). On
-- le persiste donc sur pending_teen_registrations (robuste, côté serveur,
-- survit au changement d'appareil) puis on le recopie sur teens.archetype à la
-- validation — où il est consommé par le coach Niv (#303).

ALTER TABLE public.pending_teen_registrations
  ADD COLUMN IF NOT EXISTS archetype TEXT;
