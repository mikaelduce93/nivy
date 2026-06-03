-- 108: Create vip_cards (canonical) + discount_usage (issue #27, pillar B)
-- ---------------------------------------------------------------------------
-- The teen↔partner VIP redemption was dead: vip_cards and discount_usage
-- didn't exist, so the scanner pre-check returned card_not_found and the
-- apply_partner_offer RPC threw on a missing table.
--
-- Decision (Option A): the canonical vip_cards schema is the one the
-- subscription path already writes (features/pass/actions.ts) —
-- card_type/issue_date/expiry_date/discount_percentage/benefits/... The
-- scanner is realigned onto these columns (tier→card_type, start_date→
-- issue_date, end_date→expiry_date) in the route code.

create table if not exists public.vip_cards (
  id                          uuid primary key default gen_random_uuid(),
  profile_id                  uuid not null references public.profiles(id) on delete cascade,
  card_number                 text not null unique,
  card_type                   text not null,
  issue_date                  date not null default current_date,
  expiry_date                 date not null,
  status                      text not null default 'active'
                                check (status in ('active', 'expired', 'cancelled', 'suspended')),
  discount_percentage         numeric default 0,
  monthly_events_included     integer default 0,
  monthly_clubs_included      integer default 0,
  partner_discount_percentage numeric default 0,
  priority_booking_hours      integer default 0,
  benefits                    jsonb,
  auto_renew                  boolean not null default false,
  stripe_subscription_id      text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists vip_cards_profile_active_idx
  on public.vip_cards (profile_id) where status = 'active';

-- Per-user usage cap ledger for partner offers, written by the
-- apply_partner_offer RPC (migration 099). Columns match that RPC.
create table if not exists public.discount_usage (
  id              uuid primary key default gen_random_uuid(),
  discount_id     uuid,
  profile_id      uuid references public.profiles(id) on delete set null,
  partner_id      uuid references public.partners(id) on delete set null,
  purchase_amount numeric,
  discount_amount numeric,
  final_amount    numeric,
  notes           text,
  used_at         timestamptz not null default now()
);

create index if not exists discount_usage_profile_idx on public.discount_usage (profile_id);
create index if not exists discount_usage_discount_idx on public.discount_usage (discount_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- A teen reads their own card. The scanner endpoints run with the service-role
-- client (which bypasses RLS), so no partner-facing policy is needed here.
alter table public.vip_cards enable row level security;
drop policy if exists vip_cards_self_read on public.vip_cards;
create policy vip_cards_self_read on public.vip_cards
  for select to authenticated using (profile_id = (select auth.uid()));

-- discount_usage is written/read only by the SECURITY DEFINER RPC and
-- service-role; no public policy.
alter table public.discount_usage enable row level security;
