-- 174_drop_dead_xp_to_dh_rate.sql
-- ---------------------------------------------------------------------------
-- #349 (tokenomics-coherence) — Supprimer la config morte `xp_to_dh_rate`.
--
-- Le taux XP→DH d'AFFICHAGE (10 XP = 1 DH) a une source de vérité unique :
-- lib/payments/xp-converter.ts (XP_TO_DH_RATE = 0.10). La ligne DB
-- xp_payment_settings('xp_to_dh_rate' = '100') n'a AUCUN lecteur dans le code
-- et contredit la constante TS par 10× (elle impliquerait 100 XP = 1 DH).
-- On la supprime pour retirer la 3e représentation contradictoire.
--
-- Idempotent : DELETE d'une ligne absente est un no-op.
-- ---------------------------------------------------------------------------

DELETE FROM public.xp_payment_settings WHERE setting_key = 'xp_to_dh_rate';
