-- 128_fix_feed_posts_fk_and_seed.sql
-- ---------------------------------------------------------------------------
-- Fix drift FK feed_posts + seed démo feed (IDEMPOTENT).
--
-- DRIFT (audit 2026-06-02) : feed_posts.user_id avait une FK vers public.users
-- (table vestigiale, 3 lignes, NE contient pas les ados) alors que TOUTES les
-- autres tables sociales (ex. crew_members.user_id) pointent vers profiles
-- (27 lignes, source canonique des comptes, contient les ados). Conséquence :
-- impossible de créer un post pour un ado → feed toujours vide (23503).
--
-- Le post feed existant a son user_id présent dans profiles (vérifié), donc
-- re-pointer la FK vers profiles n'orpheline rien. On préserve ON DELETE CASCADE.
-- ---------------------------------------------------------------------------

ALTER TABLE public.feed_posts DROP CONSTRAINT IF EXISTS feed_posts_user_id_fkey;
ALTER TABLE public.feed_posts
  ADD CONSTRAINT feed_posts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Seed démo feed (published + public → visibles sans relation d'amitié).
INSERT INTO public.feed_posts (user_id, post_type, content, media_urls, status, visibility, is_hidden)
SELECT '66eea9e9-b1cf-46e4-a386-fe812177607d', 'photo', 'Session skate ce weekend 🛹 qui est chaud ?',
       '["https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?w=800&q=80"]'::jsonb, 'published', 'public', false
WHERE NOT EXISTS (SELECT 1 FROM public.feed_posts WHERE user_id='66eea9e9-b1cf-46e4-a386-fe812177607d' AND content LIKE 'Session skate%');

INSERT INTO public.feed_posts (user_id, post_type, content, media_urls, status, visibility, is_hidden)
SELECT '81d272cc-4ea3-457e-954c-c46deaf4f757', 'photo', 'Nouveau record perso aux pompes 💪 +75 XP !',
       '["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80"]'::jsonb, 'published', 'public', false
WHERE NOT EXISTS (SELECT 1 FROM public.feed_posts WHERE user_id='81d272cc-4ea3-457e-954c-c46deaf4f757' AND content LIKE 'Nouveau record%');

INSERT INTO public.feed_posts (user_id, post_type, content, media_urls, status, visibility, is_hidden)
SELECT '37ff4a09-25ca-44c2-a313-141ab6d7e1b9', 'photo', 'Prêt pour l''Art Jam Marrakech 🎨',
       '["https://images.unsplash.com/photo-1499540633125-484965b60031?w=800&q=80"]'::jsonb, 'published', 'public', false
WHERE NOT EXISTS (SELECT 1 FROM public.feed_posts WHERE user_id='37ff4a09-25ca-44c2-a313-141ab6d7e1b9' AND content LIKE 'Prêt pour%');
