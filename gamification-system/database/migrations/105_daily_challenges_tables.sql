-- 105: Create challenges_templates + user_challenges (issue #38, pillar C)
-- ---------------------------------------------------------------------------
-- The daily-challenge flow (/daily) reads/writes these two tables but they
-- were never created → assignDailyChallenges/completeChallenge errored
-- ("relation does not exist") and teens never earned challenge XP.
--
-- Schemas match exactly the ChallengeTemplate / UserChallenge types in
-- features/gamification/schema.ts and the columns written by
-- features/gamification/actions.ts (incl. user_challenges.metadata).

create table if not exists public.challenges_templates (
  id              uuid primary key default gen_random_uuid(),
  category        text not null check (category in ('school', 'sport', 'crea')),
  title           text not null,
  description     text,
  xp_reward       integer not null default 0,
  validation_type text not null default 'self_report'
                    check (validation_type in ('timer', 'self_report', 'upload_photo', 'checklist')),
  validation_data jsonb,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.user_challenges (
  id              uuid primary key default gen_random_uuid(),
  teen_id         uuid not null references public.teens(id) on delete cascade,
  challenge_id    uuid not null references public.challenges_templates(id) on delete cascade,
  challenge_date  date not null default current_date,
  status          text not null default 'pending'
                    check (status in ('pending', 'completed', 'skipped')),
  completed_at    timestamptz,
  xp_earned       integer,
  validation_data jsonb,
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  -- One assignment per (teen, template, day). Drives the 23505-ignore in
  -- assignDailyChallenges so re-running the assigner is idempotent.
  unique (teen_id, challenge_id, challenge_date)
);

create index if not exists user_challenges_teen_date_idx
  on public.user_challenges (teen_id, challenge_date);
create index if not exists challenges_templates_active_cat_idx
  on public.challenges_templates (category) where is_active;

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Templates are non-sensitive reference data → readable by any authenticated
-- user. user_challenges follow the user_xp pattern: teen owner (teens.id ==
-- auth.uid()) or a linked parent.
alter table public.challenges_templates enable row level security;
alter table public.user_challenges enable row level security;

drop policy if exists challenges_templates_read on public.challenges_templates;
create policy challenges_templates_read on public.challenges_templates
  for select to authenticated using (true);

drop policy if exists user_challenges_owner_all on public.user_challenges;
create policy user_challenges_owner_all on public.user_challenges
  for all to authenticated
  using (
    teen_id = (select auth.uid())
    or exists (
      select 1 from public.parent_teen_links l
      where l.parent_id = (select auth.uid()) and l.teen_id = user_challenges.teen_id
    )
  )
  with check (
    teen_id = (select auth.uid())
    or exists (
      select 1 from public.parent_teen_links l
      where l.parent_id = (select auth.uid()) and l.teen_id = user_challenges.teen_id
    )
  );

-- ── Seed: a couple of active templates per category so the daily assigner
--    has something to pick (otherwise it returns an empty list). ────────────
insert into public.challenges_templates (category, title, description, xp_reward, validation_type)
values
  ('school', 'Révise 20 minutes', 'Passe 20 minutes à réviser une matière de ton choix.', 30, 'timer'),
  ('school', 'Fais tes devoirs', 'Termine au moins un devoir aujourd''hui.', 25, 'self_report'),
  ('sport',  'Bouge 30 minutes', 'Fais 30 minutes d''activité physique.', 30, 'timer'),
  ('sport',  '20 pompes', 'Fais 20 pompes (en plusieurs séries si besoin).', 20, 'self_report'),
  ('crea',   'Dessine quelque chose', 'Crée un dessin ou un croquis aujourd''hui.', 25, 'upload_photo'),
  ('crea',   'Écris 10 lignes', 'Écris 10 lignes sur un sujet qui t''inspire.', 20, 'self_report')
on conflict do nothing;
