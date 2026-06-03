-- 160_parent_teen_links_unique.sql  (V11 #301, Pilier B)
--
-- La cascade de liaison factorisée (lib/teens/link-cascade.ts, réutilisée par
-- B3 scan parent et B5 consommation ado) a besoin d'un upsert ATOMIQUE
-- pending→active sur (parent_id, teen_id). Aujourd'hui parent_teen_links n'a
-- qu'une PK sur id : le check-then-insert est sujet aux courses (double ligne).
-- On ajoute un index UNIQUE (parent_id, teen_id) -> ON CONFLICT atomique.
-- Vérifié : 0 doublon (parent_id, teen_id) en base avant création.

CREATE UNIQUE INDEX IF NOT EXISTS parent_teen_links_parent_teen_uniq
  ON public.parent_teen_links (parent_id, teen_id);
