-- 109: Reservation / check-in cluster — missing tables (issues #25, #36)
-- ---------------------------------------------------------------------------
-- The reservation→payment→check-in flow read/wrote tables that don't exist.
-- This migration creates the three "CREATE" decisions from #25 and adds the
-- two missing event_check_ins columns. (The "REWIRE" decisions —
-- booking_approval_requests→parental_approvals, pass_subscriptions→
-- user_vip_status, payment_logs→payment_transactions — are code changes
-- handled separately.)

-- 1 reservation (bookings) → N tickets.
create table if not exists public.booking_tickets (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  child_id      uuid,                 -- teen id (teens.id == auth.users.id)
  ticket_type   text,
  price         numeric,
  qr_code       text,
  checked_in    boolean not null default false,
  checked_in_at timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists booking_tickets_booking_idx on public.booking_tickets (booking_id);

-- Parental authorization / consent record (read by check-in/exit, written by
-- /api/authorizations/create). Columns match the route's insert.
create table if not exists public.authorizations (
  id                          uuid primary key default gen_random_uuid(),
  parent_id                   uuid references public.profiles(id) on delete set null,
  child_id                    uuid,
  event_id                    uuid,
  authorization_type          text,
  authorized_person_name      text,
  authorized_person_phone     text,
  authorized_person_relation  text,
  photo_consent               boolean default false,
  medical_consent             boolean default false,
  pickup_consent              boolean default false,
  parent_signature_url        text,
  cin_front_url               text,
  cin_back_url                text,
  signature_hash              text,
  ip_address                  text,
  user_agent                  text,
  is_valid                    boolean not null default true,
  signed_at                   timestamptz,
  created_at                  timestamptz not null default now()
);
create index if not exists authorizations_child_event_idx on public.authorizations (child_id, event_id);

-- Idempotent webhook journal (CMI webhook gate).
create table if not exists public.webhook_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null,
  event_type   text,
  payload      jsonb,
  booking_id   uuid,
  processed    boolean not null default false,
  processed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists webhook_events_provider_idx on public.webhook_events (provider, created_at);

-- event_check_ins: the entry route writes booking_id + checked_in_by.
alter table public.event_check_ins add column if not exists booking_id uuid;
alter table public.event_check_ins add column if not exists checked_in_by uuid;

-- ── RLS ────────────────────────────────────────────────────────────────────
-- booking_tickets: readable by the booking owner (teen) or a linked parent.
alter table public.booking_tickets enable row level security;
drop policy if exists booking_tickets_owner on public.booking_tickets;
create policy booking_tickets_owner on public.booking_tickets
  for all to authenticated
  using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_tickets.booking_id
        and (
          b.user_id = (select auth.uid())
          or exists (
            select 1 from public.parent_teen_links l
            where l.parent_id = (select auth.uid()) and l.teen_id = b.user_id
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_tickets.booking_id
        and b.user_id = (select auth.uid())
    )
  );

-- authorizations: the parent who created it.
alter table public.authorizations enable row level security;
drop policy if exists authorizations_parent on public.authorizations;
create policy authorizations_parent on public.authorizations
  for all to authenticated
  using (parent_id = (select auth.uid()))
  with check (parent_id = (select auth.uid()));

-- webhook_events: service-role only (PSP webhooks use the service-role client).
alter table public.webhook_events enable row level security;
