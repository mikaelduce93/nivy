-- #211 Coach Niv — purge de rétention élargie (mineurs / minimisation données).
-- 120 est pris (120_seed_physical_challenges.sql) → prochain numéro libre = 121.
--
-- La 119 ne purgeait que coach_conversation_summaries + avatar_messages dismissed.
-- On élargit la même fonction (CREATE OR REPLACE, idempotent) pour couvrir aussi
-- les faits et les objectifs clos au-delà de p_days. On NE purge PAS coach_profile
-- (résumé durable) ni les coach_goals encore "active".
-- SECURITY DEFINER + EXECUTE révoqué de public : appelée par le cron service-role.

create or replace function public.purge_coach_data(p_days integer default 90)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.coach_conversation_summaries
    where created_at < now() - make_interval(days => p_days);

  delete from public.coach_facts
    where created_at < now() - make_interval(days => p_days);

  delete from public.coach_goals
    where status in ('done', 'dropped')
      and coalesce(completed_at, created_at) < now() - make_interval(days => p_days);

  delete from public.avatar_messages
    where dismissed_at is not null
      and dismissed_at < now() - make_interval(days => p_days);
end;
$$;

revoke all on function public.purge_coach_data(integer) from public;
