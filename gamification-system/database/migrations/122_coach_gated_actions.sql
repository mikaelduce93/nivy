-- #212 Coach Niv — résolution parentale des actions gatées déclenchées par Niv.
-- Le coach crée une ligne parental_approvals 'pending' (action_type 'savings_goal'
-- ou 'event_booking') ; ces RPCs (appelées par le dispatcher parent existant,
-- app/api/parent/approvals/route.ts) effectuent l'écriture réelle à l'approbation.
--
-- Calquées sur parent_approve_food (helpers existants _parent_link_active /
-- _approval_finalize). SECURITY DEFINER, idempotentes, fail-closed.
-- AUCUNE conversion ni transfert XP <-> DH.
-- 121 pris (121_coach_retention_purge) → prochain numéro libre = 122.

-- ── savings_goal ───────────────────────────────────────────────────────────
create or replace function public.parent_approve_savings_goal(p_approval_id uuid, p_parent_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_caller uuid := auth.uid();
  v_appr record;
  v_goal_id uuid;
  v_title text;
  v_desc text;
  v_target int;
begin
  if v_caller is not null and v_caller <> p_parent_id then
    return jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  end if;
  select * into v_appr from public.parental_approvals where id = p_approval_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'approval_not_found'); end if;
  if v_appr.parent_id <> p_parent_id then return jsonb_build_object('success', false, 'error', 'not_owner'); end if;
  if v_appr.status in ('approved','denied') then return jsonb_build_object('success', true, 'idempotent', true, 'decision', v_appr.status); end if;
  if v_appr.status <> 'pending' then return jsonb_build_object('success', false, 'error', 'approval_not_pending'); end if;
  if not public._parent_link_active(p_parent_id, v_appr.teen_id) then return jsonb_build_object('success', false, 'error', 'not_linked_parent'); end if;
  if v_appr.action_type <> 'savings_goal' then return jsonb_build_object('success', false, 'error', 'wrong_action_type'); end if;

  v_title  := coalesce(v_appr.details->>'title', 'Objectif');
  v_desc   := v_appr.details->>'description';
  v_target := coalesce((v_appr.details->>'target_coins')::int, v_appr.amount::int, 0);
  if v_target <= 0 then return jsonb_build_object('success', false, 'error', 'invalid_target'); end if;

  insert into public.savings_goals (teen_id, parent_id, title, description, target_coins, status)
    values (v_appr.teen_id, p_parent_id, v_title, v_desc, v_target, 'active')
    returning id into v_goal_id;

  update public.parental_approvals set status='approved', decided_at=now(), decided_by=p_parent_id where id=p_approval_id;
  perform public._approval_finalize(p_approval_id, p_parent_id, v_appr.teen_id, 'approved', 'savings_goal', 'savings_goal', v_goal_id, null, jsonb_build_object('goal_id', v_goal_id));
  return jsonb_build_object('success', true, 'approval_id', p_approval_id, 'goal_id', v_goal_id, 'decision', 'approved');
end;
$$;

create or replace function public.parent_deny_savings_goal(p_approval_id uuid, p_parent_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare v_caller uuid := auth.uid(); v_appr record;
begin
  if v_caller is not null and v_caller <> p_parent_id then return jsonb_build_object('success', false, 'error', 'unauthorized_caller'); end if;
  select * into v_appr from public.parental_approvals where id = p_approval_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'approval_not_found'); end if;
  if v_appr.parent_id <> p_parent_id then return jsonb_build_object('success', false, 'error', 'not_owner'); end if;
  if v_appr.status in ('approved','denied') then return jsonb_build_object('success', true, 'idempotent', true, 'decision', v_appr.status); end if;
  if v_appr.status <> 'pending' then return jsonb_build_object('success', false, 'error', 'approval_not_pending'); end if;
  if v_appr.action_type <> 'savings_goal' then return jsonb_build_object('success', false, 'error', 'wrong_action_type'); end if;

  update public.parental_approvals set status='denied', decided_at=now(), decided_by=p_parent_id where id=p_approval_id;
  perform public._approval_finalize(p_approval_id, p_parent_id, v_appr.teen_id, 'denied', 'savings_goal', 'savings_goal', v_appr.resource_id, p_reason, '{}'::jsonb);
  return jsonb_build_object('success', true, 'approval_id', p_approval_id, 'decision', 'denied');
end;
$$;

-- ── event_booking ──────────────────────────────────────────────────────────
create or replace function public.parent_approve_booking(p_approval_id uuid, p_parent_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare
  v_caller uuid := auth.uid();
  v_appr record;
  v_booking_id uuid;
  v_ref text;
begin
  if v_caller is not null and v_caller <> p_parent_id then return jsonb_build_object('success', false, 'error', 'unauthorized_caller'); end if;
  select * into v_appr from public.parental_approvals where id = p_approval_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'approval_not_found'); end if;
  if v_appr.parent_id <> p_parent_id then return jsonb_build_object('success', false, 'error', 'not_owner'); end if;
  if v_appr.status in ('approved','denied') then return jsonb_build_object('success', true, 'idempotent', true, 'decision', v_appr.status); end if;
  if v_appr.status <> 'pending' then return jsonb_build_object('success', false, 'error', 'approval_not_pending'); end if;
  if not public._parent_link_active(p_parent_id, v_appr.teen_id) then return jsonb_build_object('success', false, 'error', 'not_linked_parent'); end if;
  if v_appr.action_type <> 'event_booking' then return jsonb_build_object('success', false, 'error', 'wrong_action_type'); end if;

  v_ref := 'NIV' || upper(substr(replace(p_approval_id::text, '-', ''), 1, 10));
  insert into public.bookings (user_id, event_id, booking_reference, total_amount, status, payment_status)
    values (v_appr.teen_id, v_appr.resource_id, v_ref, coalesce(v_appr.amount, 0), 'pending_payment', 'pending')
    returning id into v_booking_id;

  update public.parental_approvals set status='approved', decided_at=now(), decided_by=p_parent_id where id=p_approval_id;
  perform public._approval_finalize(p_approval_id, p_parent_id, v_appr.teen_id, 'approved', 'event_booking', 'booking', v_booking_id, null, jsonb_build_object('booking_id', v_booking_id));
  return jsonb_build_object('success', true, 'approval_id', p_approval_id, 'booking_id', v_booking_id, 'decision', 'approved');
end;
$$;

create or replace function public.parent_deny_booking(p_approval_id uuid, p_parent_id uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare v_caller uuid := auth.uid(); v_appr record;
begin
  if v_caller is not null and v_caller <> p_parent_id then return jsonb_build_object('success', false, 'error', 'unauthorized_caller'); end if;
  select * into v_appr from public.parental_approvals where id = p_approval_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'approval_not_found'); end if;
  if v_appr.parent_id <> p_parent_id then return jsonb_build_object('success', false, 'error', 'not_owner'); end if;
  if v_appr.status in ('approved','denied') then return jsonb_build_object('success', true, 'idempotent', true, 'decision', v_appr.status); end if;
  if v_appr.status <> 'pending' then return jsonb_build_object('success', false, 'error', 'approval_not_pending'); end if;
  if v_appr.action_type <> 'event_booking' then return jsonb_build_object('success', false, 'error', 'wrong_action_type'); end if;

  update public.parental_approvals set status='denied', decided_at=now(), decided_by=p_parent_id where id=p_approval_id;
  perform public._approval_finalize(p_approval_id, p_parent_id, v_appr.teen_id, 'denied', 'event_booking', 'booking', v_appr.resource_id, p_reason, '{}'::jsonb);
  return jsonb_build_object('success', true, 'approval_id', p_approval_id, 'decision', 'denied');
end;
$$;

revoke all on function public.parent_approve_savings_goal(uuid, uuid) from public;
revoke all on function public.parent_deny_savings_goal(uuid, uuid, text) from public;
revoke all on function public.parent_approve_booking(uuid, uuid) from public;
revoke all on function public.parent_deny_booking(uuid, uuid, text) from public;
