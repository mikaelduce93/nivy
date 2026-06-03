-- 104: Create public.pending_teen_registrations (issue #26, pillar B)
-- ---------------------------------------------------------------------------
-- Stores a teen self-registration request until a parent validates it via the
-- emailed token (see app/api/auth/register-teen + app/api/auth/validate-teen).
-- The table was referenced by code but never created → both routes errored
-- ("relation does not exist"), breaking teen self-signup at the first request.
--
-- Columns match exactly what the routes write/read.
--
-- RLS: enabled with NO policies. The validation_token is the secret; the
-- routes access this table exclusively through the service-role client
-- (lib/supabase/service-role), which bypasses RLS. anon/authenticated clients
-- have no access by design — no public read/write policy.

create table if not exists public.pending_teen_registrations (
  id                 uuid primary key default gen_random_uuid(),
  teen_first_name    text not null,
  teen_last_name     text not null,
  teen_email         text,
  teen_password_hash text,
  date_of_birth      date not null,
  parent_email       text not null,
  parent_phone       text not null,
  validation_token   text not null unique,
  token_expires_at   timestamptz not null,
  status             text not null default 'pending'
                       check (status in ('pending', 'validated', 'rejected')),
  existing_parent_id uuid references public.profiles(id) on delete set null,
  validated_by       uuid references public.profiles(id) on delete set null,
  created_teen_id    uuid references public.profiles(id) on delete set null,
  validated_at       timestamptz,
  created_at         timestamptz not null default now()
);

-- At most one *pending* request per parent email. Drives the 23505 unique
-- violation that register-teen maps to "Une demande est déjà en cours pour
-- cet email parent". A parent can re-register after a prior request is
-- validated/rejected.
create unique index if not exists pending_teen_reg_parent_pending_uq
  on public.pending_teen_registrations (parent_email)
  where status = 'pending';

create index if not exists pending_teen_reg_parent_email_idx
  on public.pending_teen_registrations (parent_email);

alter table public.pending_teen_registrations enable row level security;
