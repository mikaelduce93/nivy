-- 165_profiles_role_check.sql  (V11 #312, Pilier E)
--
-- profiles.role était un TEXT libre (drift, audit PLUMB-06). On le contraint aux
-- valeurs canoniques top-level définies par docs/canon/roles-permissions.locked.md §1
-- (les sous-rôles admin vivent dans admin_roles, hors de cet enum).
-- Valeurs live vérifiées (parent/teen/partner/admin/mentor/ambassador) ⊆ ce set.
-- Idempotent.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_chk
  CHECK (role IN ('parent','teen','ambassador','partner','mentor','driver','admin'));
