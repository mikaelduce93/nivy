-- 145_seed_v6_demo_content.sql
-- ---------------------------------------------------------------------------
-- V6 — Seed démo (beta) pour rendre les surfaces collectives non-vides :
--   - venue_slots (#238) pour un partenaire type='venue',
--   - marketplace_sellers + marketplace_listing partenaire-vendeur (#241),
--   - partner_offer achetable en coins (#232, les offres existantes ont price_coins NULL).
-- Idempotent (guards NOT EXISTS / ON CONFLICT). Données de démonstration.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_venue uuid;
  v_partner uuid;
  v_seller uuid;
BEGIN
  SELECT id INTO v_venue FROM partners WHERE partner_type = 'venue' AND status IN ('active','approved') LIMIT 1;
  SELECT id INTO v_partner FROM partners WHERE status IN ('active','approved') LIMIT 1;

  -- #238 — créneaux venue
  IF v_venue IS NOT NULL THEN
    INSERT INTO venue_slots (partner_id, title, starts_at, ends_at, capacity, price_coins)
    SELECT v_venue, 'Soirée privée — samedi', now() + interval '6 days', now() + interval '6 days' + interval '4 hours', 12, 800
    WHERE NOT EXISTS (SELECT 1 FROM venue_slots WHERE partner_id = v_venue AND title = 'Soirée privée — samedi');
    INSERT INTO venue_slots (partner_id, title, starts_at, ends_at, capacity, price_coins)
    SELECT v_venue, 'Après-midi gaming', now() + interval '9 days', now() + interval '9 days' + interval '3 hours', 8, 500
    WHERE NOT EXISTS (SELECT 1 FROM venue_slots WHERE partner_id = v_venue AND title = 'Après-midi gaming');
  END IF;

  -- #241 — vendeur marketplace + annonce
  IF v_partner IS NOT NULL THEN
    INSERT INTO marketplace_sellers (partner_id, display_name, commission_pct, payout_method)
    VALUES (v_partner, 'Boutique partenaire (démo)', public.get_partner_commission_pct(v_partner), 'bank')
    ON CONFLICT (partner_id) DO NOTHING;
    SELECT id INTO v_seller FROM marketplace_sellers WHERE partner_id = v_partner;

    INSERT INTO marketplace_listings (seller_user_id, seller_id, category, title, description, price_coins, status)
    SELECT (SELECT id FROM teens LIMIT 1), v_seller, 'gaming', 'Manette pro (neuve, démo)', 'Annonce de démonstration partenaire-vendeur.', 1200, 'active'
    WHERE NOT EXISTS (SELECT 1 FROM marketplace_listings WHERE seller_id = v_seller AND title = 'Manette pro (neuve, démo)');

    -- #232 — offre partenaire achetable en coins (status approved)
    INSERT INTO partner_offers (partner_id, title, description, offer_type, price_coins, is_active, status, max_uses_per_user)
    SELECT v_partner, 'Bon -50 coins (démo)', 'Offre de démonstration achetable in-app.', 'discount', 300, true, 'approved', 3
    WHERE NOT EXISTS (SELECT 1 FROM partner_offers WHERE partner_id = v_partner AND title = 'Bon -50 coins (démo)');
  END IF;
END $$;
