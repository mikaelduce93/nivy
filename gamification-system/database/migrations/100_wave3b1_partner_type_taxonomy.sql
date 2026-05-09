-- Wave 3B.1 — extend partners.partner_type CHECK to the canon §3.1 enumeration:
--   retail | venue | club | education | food | driver | mentor
--   | event_talent | event_organizer | creator
--
-- Backfill: noop (only the legacy 4 values exist today). The new types are
-- accepted by /api/partners/wizard/submit per Wave 3B.1 funnel work.
-- driver and mentor stay first-class profiles.role values; their landings do
-- NOT post to the partner wizard. They are listed in this CHECK because a
-- small number of canon §1 row 6/row 7 archetypes also carry a partners row
-- for KYC + payout reuse (locked above as default).

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
      'food', 'driver', 'mentor', 'event_talent', 'event_organizer', 'creator'
    ));
END
$$;
