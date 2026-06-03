-- 106: Ambassador commission trigger (issue #33, pillar G)
-- ---------------------------------------------------------------------------
-- Closes the referral→commission loop: when an attributed referred user makes
-- a partner purchase, the ambassador earns a commission. referral_attribution
-- is written at sign-up (app/auth/callback). Here we generate the commission
-- atomically on partner_transactions insert.
--
-- Idempotency: at most one commission per source_partner_transaction_id.
-- Multiple NULLs are allowed (rows sourced from a future `payments` flow use
-- source_payment_id instead).

create unique index if not exists ambassador_commissions_src_ptx_uq
  on public.ambassador_commissions (source_partner_transaction_id);

-- One ambassador per referred user (first attribution wins). Lets the sign-up
-- handler insert with `on conflict (referred_user_id) do nothing`.
create unique index if not exists referral_attribution_referred_uq
  on public.referral_attribution (referred_user_id);

create or replace function public.create_ambassador_commission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ambassador_id uuid;
  v_commission_pct numeric;
  v_ambassador_user_id uuid;
begin
  -- Only real purchases with a payer.
  if NEW.teen_id is null or coalesce(NEW.amount_dh, 0) <= 0 then
    return NEW;
  end if;

  -- Find a live (non-expired) attribution for this payer, on an active ambassador.
  select ra.ambassador_id, a.commission_pct, a.user_id
    into v_ambassador_id, v_commission_pct, v_ambassador_user_id
  from public.referral_attribution ra
  join public.ambassadors a on a.id = ra.ambassador_id
  where ra.referred_user_id = NEW.teen_id
    and (ra.expires_at is null or ra.expires_at > now())
    and a.status = 'active'
  order by ra.attributed_at desc
  limit 1;

  if v_ambassador_id is null then
    return NEW;            -- no attribution → no commission
  end if;

  -- Never pay an ambassador a commission on their own purchase.
  if v_ambassador_user_id = NEW.teen_id then
    return NEW;
  end if;

  insert into public.ambassador_commissions (
    ambassador_id, referred_user_id, source_partner_transaction_id,
    amount_dh, status, available_at, created_at
  ) values (
    v_ambassador_id, NEW.teen_id, NEW.id,
    round(NEW.amount_dh * coalesce(v_commission_pct, 0) / 100.0, 2),
    'pending', now() + interval '14 days', now()
  )
  on conflict (source_partner_transaction_id) do nothing;

  return NEW;
end;
$$;

drop trigger if exists trg_ambassador_commission on public.partner_transactions;
create trigger trg_ambassador_commission
  after insert on public.partner_transactions
  for each row execute function public.create_ambassador_commission();
