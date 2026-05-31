-- #211 Coach Niv — mémoire long terme.
-- Tables additives + RLS simple (teen_id = auth.uid(), AUCUN sous-select → pas de
-- récursion 42P17). Le service-role (route serveur) bypasse la RLS.
-- Appliquée au projet live `imchornjvmgmaovhypco` (migration 119_coach_memory).

create table if not exists public.coach_profile (
  teen_id uuid primary key references public.profiles(id) on delete cascade,
  tone_pref text,
  long_summary text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.coach_goals (
  id uuid primary key default gen_random_uuid(),
  teen_id uuid not null references public.profiles(id) on delete cascade,
  goal text not null,
  status text not null default 'active' check (status in ('active','done','dropped')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists coach_goals_teen_idx on public.coach_goals(teen_id, status);

create table if not exists public.coach_facts (
  id uuid primary key default gen_random_uuid(),
  teen_id uuid not null references public.profiles(id) on delete cascade,
  fact text not null,
  created_at timestamptz not null default now()
);
create index if not exists coach_facts_teen_idx on public.coach_facts(teen_id);

create table if not exists public.coach_conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  teen_id uuid not null references public.profiles(id) on delete cascade,
  summary text not null,
  created_at timestamptz not null default now()
);
create index if not exists coach_conv_sum_teen_idx on public.coach_conversation_summaries(teen_id, created_at desc);

alter table public.coach_profile enable row level security;
alter table public.coach_goals enable row level security;
alter table public.coach_facts enable row level security;
alter table public.coach_conversation_summaries enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='coach_profile' and policyname='coach_profile_self') then
    create policy coach_profile_self on public.coach_profile for all to authenticated using (teen_id = auth.uid()) with check (teen_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='coach_goals' and policyname='coach_goals_self') then
    create policy coach_goals_self on public.coach_goals for all to authenticated using (teen_id = auth.uid()) with check (teen_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='coach_facts' and policyname='coach_facts_self') then
    create policy coach_facts_self on public.coach_facts for all to authenticated using (teen_id = auth.uid()) with check (teen_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='coach_conversation_summaries' and policyname='coach_conv_sum_self') then
    create policy coach_conv_sum_self on public.coach_conversation_summaries for all to authenticated using (teen_id = auth.uid()) with check (teen_id = auth.uid());
  end if;
end $$;

-- Purge de rétention (mineurs) : supprime les résumés de conversation et les
-- avatar_messages "dismissed" plus vieux que p_days (défaut 90j). SECURITY DEFINER.
create or replace function public.purge_coach_data(p_days integer default 90)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.coach_conversation_summaries where created_at < now() - make_interval(days => p_days);
  delete from public.avatar_messages where dismissed_at is not null and dismissed_at < now() - make_interval(days => p_days);
end;
$$;

revoke all on function public.purge_coach_data(integer) from public;
