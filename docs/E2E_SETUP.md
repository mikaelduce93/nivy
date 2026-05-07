# E2E test setup (Playwright)

After fresh schema apply on a new Supabase project, the test suite needs
infrastructure that the public migrations don't include. Apply once, then
`npx playwright test` runs end-to-end with seeded auth.

## Prerequisites

1. `gamification-system/database/all_migrations.sql` applied to the project
   (Dashboard → SQL Editor → paste → Run).
2. `.env.local` points at the project (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

## One-shot DB fixes (run via Dashboard SQL Editor)

The migrations create tables with RLS enabled but no policies and no
`GRANT` statements for the `authenticated` / `anon` roles. The auth flow
also references views (`teen_full_profile`, `parent_teens_overview`) and
a `partners` table that aren't in the public migrations. Apply the
following SQL once per project (idempotent):

```sql
-- 1. Drop the auth.users trigger that fails on a missing wheel_streaks
--    constraint (the function references the table without the public.
--    schema prefix, breaking the auth API).
DROP TRIGGER IF EXISTS init_wheel_streak_trigger ON auth.users;
ALTER TABLE public.wheel_streaks
  ADD CONSTRAINT wheel_streaks_user_id_unique UNIQUE (user_id);

-- 2. Grant base privileges (the migrations create tables but never grant
--    to the PostgREST roles, so anon/authenticated reads return 403).
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- 3. RLS policies for the tables the app reads while authenticated.
DROP POLICY IF EXISTS profiles_self_read ON public.profiles;
CREATE POLICY profiles_self_read ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS teens_self_read ON public.teens;
CREATE POLICY teens_self_read ON public.teens FOR SELECT TO authenticated USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.parent_teen_links l WHERE l.parent_id = auth.uid() AND l.teen_id = teens.id));
DROP POLICY IF EXISTS user_xp_self_read ON public.user_xp;
CREATE POLICY user_xp_self_read ON public.user_xp FOR SELECT TO authenticated USING (teen_id = auth.uid() OR EXISTS (SELECT 1 FROM public.parent_teen_links l WHERE l.parent_id = auth.uid() AND l.teen_id = user_xp.teen_id));
DROP POLICY IF EXISTS user_coins_self_read ON public.user_coins;
CREATE POLICY user_coins_self_read ON public.user_coins FOR SELECT TO authenticated USING (teen_id = auth.uid() OR EXISTS (SELECT 1 FROM public.parent_teen_links l WHERE l.parent_id = auth.uid() AND l.teen_id = user_coins.teen_id));
DROP POLICY IF EXISTS parent_teen_links_read ON public.parent_teen_links;
CREATE POLICY parent_teen_links_read ON public.parent_teen_links FOR SELECT TO authenticated USING (parent_id = auth.uid() OR teen_id = auth.uid());
DROP POLICY IF EXISTS educational_quizzes_authenticated_read ON public.educational_quizzes;
CREATE POLICY educational_quizzes_authenticated_read ON public.educational_quizzes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS shop_rewards_authenticated_read ON public.shop_rewards;
CREATE POLICY shop_rewards_authenticated_read ON public.shop_rewards FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS reward_categories_authenticated_read ON public.reward_categories;
CREATE POLICY reward_categories_authenticated_read ON public.reward_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS bookings_self_read ON public.bookings;
CREATE POLICY bookings_self_read ON public.bookings FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS quiz_attempts_self_read ON public.quiz_attempts;
CREATE POLICY quiz_attempts_self_read ON public.quiz_attempts FOR SELECT TO authenticated USING (teen_id = auth.uid());

-- 4. Missing partners table (referenced by app/partner/page.tsx but not
--    in any migration file).
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  partner_type TEXT NOT NULL DEFAULT 'venue',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.partner_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_until DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS partners_self_read ON public.partners;
CREATE POLICY partners_self_read ON public.partners FOR SELECT TO authenticated USING (email = auth.jwt()->>'email');

-- 5. Missing views referenced by getUserRole and the parent topup page.
CREATE OR REPLACE VIEW public.teen_full_profile AS
SELECT t.id, t.parent_id AS primary_parent_id, t.first_name, t.last_name, t.pseudo, t.avatar_url,
  COALESCE(x.current_level, 1) AS level,
  CASE COALESCE(x.current_level, 1) WHEN 1 THEN 'Rookie' WHEN 2 THEN 'Explorateur' WHEN 3 THEN 'Aventurier' ELSE 'Champion' END AS title,
  '🌱'::text AS title_icon, COALESCE(c.balance, 0) AS coins_balance, COALESCE(x.total_xp, 0) AS total_xp
FROM public.teens t
LEFT JOIN public.user_xp x ON x.teen_id = t.id
LEFT JOIN public.user_coins c ON c.teen_id = t.id;

CREATE OR REPLACE VIEW public.parent_teens_overview AS
SELECT l.parent_id, l.teen_id,
  COALESCE(t.first_name || ' ' || COALESCE(t.last_name, ''), p.full_name, p.email, 'Teen') AS teen_name,
  t.first_name, t.last_name, t.pseudo, t.avatar_url,
  COALESCE(x.total_xp, 0) AS total_xp, COALESCE(x.current_level, 1) AS level,
  COALESCE(c.balance, 0) AS coins, l.created_at AS linked_at
FROM public.parent_teen_links l
JOIN public.teens t ON t.id = l.teen_id
LEFT JOIN public.profiles p ON p.id = l.teen_id
LEFT JOIN public.user_xp x ON x.teen_id = l.teen_id
LEFT JOIN public.user_coins c ON c.teen_id = l.teen_id;

GRANT SELECT ON public.teen_full_profile, public.parent_teens_overview TO anon, authenticated, service_role;
```

## Seed test accounts + e2e data

```bash
npx tsx scripts/seed-test-accounts.ts    # parent.test + teen.amine
npx tsx scripts/seed-e2e-data.ts         # 6 quizzes + 2 rewards + booking + partner.pending

# The 2nd script also writes E2E_PENDING_BOOKING_ID +
# E2E_PARTNER_PENDING_EMAIL/PASSWORD into .env.local (idempotent).
```

If the seeder hits trigger-cascade errors on `teens` insert (achievement
function references missing columns), wrap the insert in
`SET session_replication_role = 'replica';` ... `RESET`.

## Run tests

Terminal 1:
```bash
npx next dev --webpack
```

Terminal 2:
```bash
E2E_USE_SEEDED_DEFAULTS=1 npx playwright test --workers=1 --timeout=120000
```

Expected: **13 passed / 0 failed / 4 skipped**. The 4 remaining skips are
runtime sub-skips (no daily-tagged quiz, no purchasable reward visible
for the seeded teen — both require additional content seeding).

## Helper scripts

- `scripts/seed-test-accounts.ts` — provisions parent.test + teen.amine.
- `scripts/seed-e2e-data.ts` — provisions quizzes / rewards / booking /
  partner-pending and writes the env vars back to `.env.local`.
- `scripts/check-schema.ts` — quick health check: lists the test-relevant
  tables and how many rows each has.
