-- Wave 3.2 — Food delivery & restaurants
-- Spec: docs/vision/food-delivery-restaurants.md + whitepaper §19.4.3 + §29 invariants.
--
-- Tables: menu_items, food_orders, food_order_items, nutrition_challenges
-- RPCs:   place_food_order, partner_accept_food_order, partner_reject_food_order
-- Halal-by-default: any non-halal item triggers parental_approvals.
-- Money invariants:
--   §29.2 paired coin_transactions on every coin debit (via spend_teen_coins)
--   §29.3 cashback XP on the same tx (via spend_teen_coins)
--   §29.5 auth.users.id is THE canonical user identifier
--   §29.7 every public table has explicit RLS

-- 1) Extend partners with sub_category for food
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS sub_category TEXT;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'partners_sub_category_check'
    ) THEN
      ALTER TABLE public.partners
        ADD CONSTRAINT partners_sub_category_check
        CHECK (sub_category IS NULL OR sub_category IN ('restaurant','cafe','bakery','catering','grocery','fast_food'));
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- 2) menu_items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  price_dh NUMERIC(10,2) NOT NULL CHECK (price_dh >= 0),
  price_coins INTEGER,
  image_url TEXT,
  calories INTEGER,
  nutrition_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  allergens TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_halal BOOLEAN NOT NULL DEFAULT TRUE,
  available_from TIME,
  available_until TIME,
  available_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7],
  prep_time_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) food_orders
CREATE TABLE IF NOT EXISTS public.food_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE RESTRICT,
  parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE RESTRICT,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('delivery','pickup','dine_in')),
  delivery_address TEXT,
  scheduled_for TIMESTAMPTZ,
  total_dh NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_coins INTEGER NOT NULL DEFAULT 0,
  cashback_xp INTEGER DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'coins' CHECK (payment_method IN ('coins','dh','split')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','accepted','preparing','ready','out_for_delivery','delivered','cancelled','rejected'
  )),
  parent_approval_id UUID REFERENCES public.parental_approvals(id) ON DELETE SET NULL,
  ride_booking_id UUID,
  challenge_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

-- 4) food_order_items
CREATE TABLE IF NOT EXISTS public.food_order_items (
  order_id UUID NOT NULL REFERENCES public.food_orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_price_dh NUMERIC(10,2) NOT NULL,
  unit_price_coins INTEGER,
  customizations JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (order_id, menu_item_id)
);

-- 5) nutrition_challenges
CREATE TABLE IF NOT EXISTS public.nutrition_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teen_id UUID NOT NULL REFERENCES public.teens(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  budget_coins INTEGER,
  nutrition_targets JSONB DEFAULT '{}'::jsonb,
  reward_xp INTEGER DEFAULT 0,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6) Indexes
CREATE INDEX IF NOT EXISTS idx_menu_items_partner_active ON public.menu_items(partner_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_food_orders_teen ON public.food_orders(teen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_orders_partner_status ON public.food_orders(partner_id, status);
CREATE INDEX IF NOT EXISTS idx_nutrition_challenges_active ON public.nutrition_challenges(teen_id) WHERE is_active = true;

-- 7) RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS menu_items_authenticated_read ON public.menu_items;
CREATE POLICY menu_items_authenticated_read ON public.menu_items
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS menu_items_partner_modify ON public.menu_items;
CREATE POLICY menu_items_partner_modify ON public.menu_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_staff s
      WHERE s.user_id = auth.uid() AND s.partner_id = menu_items.partner_id AND s.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_staff s
      WHERE s.user_id = auth.uid() AND s.partner_id = menu_items.partner_id AND s.is_active = true
    )
  );

DROP POLICY IF EXISTS food_orders_self_read ON public.food_orders;
CREATE POLICY food_orders_self_read ON public.food_orders
  FOR SELECT TO authenticated
  USING (
    teen_id = auth.uid()
    OR parent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.partner_staff s
      WHERE s.user_id = auth.uid() AND s.partner_id = food_orders.partner_id AND s.is_active = true
    )
  );

DROP POLICY IF EXISTS food_order_items_visibility ON public.food_order_items;
CREATE POLICY food_order_items_visibility ON public.food_order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.food_orders o
      WHERE o.id = food_order_items.order_id
        AND (
          o.teen_id = auth.uid()
          OR o.parent_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.partner_staff s
            WHERE s.user_id = auth.uid() AND s.partner_id = o.partner_id AND s.is_active = true
          )
        )
    )
  );

DROP POLICY IF EXISTS nutrition_challenges_visibility ON public.nutrition_challenges;
CREATE POLICY nutrition_challenges_visibility ON public.nutrition_challenges
  FOR SELECT TO authenticated
  USING (parent_id = auth.uid() OR teen_id = auth.uid());

DROP POLICY IF EXISTS nutrition_challenges_parent_modify ON public.nutrition_challenges;
CREATE POLICY nutrition_challenges_parent_modify ON public.nutrition_challenges
  FOR ALL TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT SELECT ON public.food_orders TO authenticated;
GRANT SELECT ON public.food_order_items TO authenticated;
GRANT SELECT ON public.nutrition_challenges TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
GRANT ALL ON public.food_orders TO service_role;
GRANT ALL ON public.food_order_items TO service_role;
GRANT ALL ON public.nutrition_challenges TO service_role;

-- See file 058_food_delivery_rpcs.sql for the place_food_order /
-- partner_accept_food_order / partner_reject_food_order definitions.
