-- Wave 3B.1.1 — Partner taxonomy sanity check (founder override 2026-05-09).
--
-- Per founder ruling F2: driver = first-class profiles.role / auth.users.role.
-- Per canon §1 row 7 (mentor) treatment in /auth + /mentor: mentor is also a
-- first-class role, NOT a partners row.
--
-- Canon §3.1 originally allowed both in partners.partner_type for "KYC/payout
-- reuse" — that flexibility creates a real ambiguity (two source-of-truth
-- types for "what is a driver / mentor?"). The founder closed that loop:
-- driver and mentor live ONLY as first-class roles. The partners table is
-- reserved for partner-type entities (commerce, food, event_*, creator).
--
-- Backfill: zero rows currently use 'driver' or 'mentor' (verified via
-- execute_sql before this migration was applied). Drop is safe.

DO $$
DECLARE v_check_name text;
BEGIN
  FOR v_check_name IN
    SELECT con.conname FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'partners' AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%partner_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.partners DROP CONSTRAINT %I', v_check_name);
  END LOOP;

  ALTER TABLE public.partners
    ADD CONSTRAINT partners_partner_type_check
    CHECK (partner_type IN (
      'retail', 'venue', 'club', 'education',
      'food', 'event_talent', 'event_organizer', 'creator'
    ));
END
$$;

COMMENT ON CONSTRAINT partners_partner_type_check ON public.partners IS
  'Wave 3B.1.1 / founder override 2026-05-09: driver and mentor are first-class roles only, NOT partner_types. The partners table is reserved for commerce / food / event_* / creator entities. Modifying this CHECK requires a new founder ratification.';
