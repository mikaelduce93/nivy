-- 127_seed_beta_social_content.sql
-- ---------------------------------------------------------------------------
-- Seed DÉMO social — IDEMPOTENT (réexécutable sans doublon).
-- Complète 125 : remplit les surfaces sociales encore vides (audit 2026-06-02).
--   • crews + crew_members → /teen/circles, /teen/social (section crew)
--   • feed_posts (published/public) → /teen/feed, /teen/social
--
-- Clés naturelles : crews.slug, feed_posts (user_id+content). owner_id /
-- user_id = ids d'ados de test (teens.id = profiles.id = auth.uid()).
-- Valeurs validées sur une ligne réelle : post_type='photo', status='published',
-- visibility='public'. Images Unsplash (hôte autorisé depuis le fix next.config).
-- ---------------------------------------------------------------------------

-- 1) CREWS -------------------------------------------------------------------
INSERT INTO public.crews (name, slug, description, motto, owner_id, is_public, requires_approval)
SELECT 'Les Lions de Casa', 'les-lions-de-casa',
       'Le crew le plus chaud de Casablanca. Events, défis et bonne ambiance.',
       'On rugit ensemble', '66eea9e9-b1cf-46e4-a386-fe812177607d', true, false
WHERE NOT EXISTS (SELECT 1 FROM public.crews WHERE slug = 'les-lions-de-casa');

INSERT INTO public.crews (name, slug, description, motto, owner_id, is_public, requires_approval)
SELECT 'Rabat Riders', 'rabat-riders',
       'Skate, musique et sorties à Rabat. Rejoins la team.',
       'Ride or nothing', '37ff4a09-25ca-44c2-a313-141ab6d7e1b9', true, false
WHERE NOT EXISTS (SELECT 1 FROM public.crews WHERE slug = 'rabat-riders');

-- 2) CREW_MEMBERS (role par défaut 'member' ; ownership porté par crews.owner_id)
INSERT INTO public.crew_members (crew_id, user_id)
SELECT c.id, m.user_id
FROM public.crews c
JOIN (VALUES
  ('les-lions-de-casa', '66eea9e9-b1cf-46e4-a386-fe812177607d'),
  ('les-lions-de-casa', '81d272cc-4ea3-457e-954c-c46deaf4f757'),
  ('les-lions-de-casa', 'aac7fda2-f324-4af2-961b-25c81a03e922'),
  ('rabat-riders',      '37ff4a09-25ca-44c2-a313-141ab6d7e1b9'),
  ('rabat-riders',      '503cac25-412f-439c-8d61-0f7b588cd849')
) AS m(slug, user_id) ON m.slug = c.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.crew_members cm WHERE cm.crew_id = c.id AND cm.user_id = m.user_id::uuid
);

-- 3) FEED_POSTS — déplacé dans la migration 128.
-- Le seed feed échouait ici : feed_posts.user_id pointait (à tort) vers
-- public.users au lieu de profiles. La migration 128 re-pointe la FK vers
-- profiles(id) PUIS seede les posts. Voir 128_fix_feed_posts_fk_and_seed.sql.
