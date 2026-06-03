-- 157_restrict_public_bucket_listing.sql  (V8 #263, C1)
--
-- SÉCURITÉ (advisor public_bucket_allows_listing, 4 buckets): les policies SELECT {public} sur
-- storage.objects laissaient anon LISTER les objets des buckets publics (avatar-assets,
-- event-images, partner-logos, physical-challenge-images).
--
-- Fix: passer ces policies SELECT à {authenticated}. La lecture par URL publique
-- (/storage/v1/object/public/<bucket>/<path>) ne passe PAS par la RLS pour un bucket public ->
-- l'affichage des avatars/logos/images reste inchangé ; seul le listing anonyme est coupé.
-- Vérifié: SET ROLE anon -> 0 objet listable sur ces 4 buckets. Idempotent.

DROP POLICY IF EXISTS "avatar_assets_public_read" ON storage.objects;
CREATE POLICY "avatar_assets_authenticated_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'avatar-assets');

DROP POLICY IF EXISTS "event_images_public_read" ON storage.objects;
CREATE POLICY "event_images_authenticated_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "partner_logos_public_read" ON storage.objects;
CREATE POLICY "partner_logos_authenticated_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'partner-logos');

DROP POLICY IF EXISTS "physical_challenge_images_public_read" ON storage.objects;
CREATE POLICY "physical_challenge_images_authenticated_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'physical-challenge-images');
