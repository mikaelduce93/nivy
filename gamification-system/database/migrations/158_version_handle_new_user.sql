-- 158_version_handle_new_user.sql  (V11 #293, Pilier A)
--
-- PLOMBERIE / REPRODUCTIBILITÉ : le trigger d'identité `handle_new_user` (et le
-- trigger `on_auth_user_created` qui l'invoque) existait en base live mais
-- n'était versionné dans AUCUNE migration du repo (audit 2026-06-03 §1). Le
-- repo seul ne reconstruisait donc pas la DB d'inscription, alors que
-- /api/auth/validate-teen et /api/parent/teens/create dépendent de ce trigger
-- pour matérialiser la ligne `profiles` (+ `teens` si role='teen') et garantir
-- l'invariant d'identité auth.users.id === profiles.id === teens.id.
--
-- Définition copiée à l'identique du live (pg_get_functiondef + pg_get_triggerdef).
-- Idempotente et rejouable : CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS.

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'fullName', NULL),
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent')
  )
  ON CONFLICT (id) DO NOTHING;

  -- If role is teen, also create the teens row (idempotent)
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'parent') = 'teen' THEN
    INSERT INTO public.teens (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
