-- 154_pin_vip_rank_search_path.sql  (V8 #262, B2)
--
-- SÉCURITÉ (advisor function_search_path_mutable): la fonction public._vip_rank(text) n'avait
-- pas de search_path figé. C'est une fonction SQL pure IMMUTABLE (CASE sur un texte, aucune
-- relation) -> search_path='' sans risque.
--
-- NB: le 2e advisor de ce ticket, auth_leaked_password_protection, est une option de config
-- Supabase Auth (HaveIBeenPwned) qui n'est PAS modifiable en SQL -> à activer dans le dashboard
-- (Auth > Policies) ou via l'API Management. Action manuelle documentée.

ALTER FUNCTION public._vip_rank(text) SET search_path = '';
