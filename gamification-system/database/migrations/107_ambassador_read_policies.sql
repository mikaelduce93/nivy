-- 107: Ambassador read policies for attribution + commissions (issue #33)
-- ---------------------------------------------------------------------------
-- referral_attribution and ambassador_commissions had RLS enabled with NO
-- policies, so an ambassador's own dashboard (user-session client) could not
-- read its referrals/commissions → KPIs stuck at zero. Writes happen via the
-- service-role client (sign-up callback) and the SECURITY DEFINER commission
-- trigger, both of which bypass RLS — so we only need SELECT policies here,
-- scoped to the owning ambassador (ambassadors.user_id = auth.uid()).

drop policy if exists referral_attribution_ambassador_read on public.referral_attribution;
create policy referral_attribution_ambassador_read on public.referral_attribution
  for select to authenticated
  using (
    ambassador_id in (
      select a.id from public.ambassadors a where a.user_id = (select auth.uid())
    )
  );

drop policy if exists ambassador_commissions_ambassador_read on public.ambassador_commissions;
create policy ambassador_commissions_ambassador_read on public.ambassador_commissions
  for select to authenticated
  using (
    ambassador_id in (
      select a.id from public.ambassadors a where a.user_id = (select auth.uid())
    )
  );
