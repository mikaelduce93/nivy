-- 179_parental_limits_caps.sql
-- ---------------------------------------------------------------------------
-- F6 + F49 (canon economy-payments §9.3/§9.4) — Plafonds monétaires.
--
-- F6 (réglementaire, BAM Circular 6/W/2017 palier faiblement KYC) :
--   - 200 DH max par recharge (défaut, override post-KYC via parental_limits),
--   - 500 DH/mois max par parent (défaut, override post-KYC),
--   - 5 000 DH/mois agrégés max par ado (global, non-overridable par ligne).
--   Enforcés dans les DEUX overloads de top_up_teen (3-arg et 5-arg) via le
--   helper _check_topup_caps. Mois calendaire local Africa/Casablanca.
--
-- F49 (contrôle parental) :
--   - parental_limits.max_monthly_spend_dh : plafond mensuel de dépense de
--     l'ado, configuré par le parent (NULL = pas de plafond). Enforcé dans
--     _debit_teen_coins (chemin central : spend_teen_coins +
--     split_group_purchase = tous les rails V6). Règle la plus restrictive
--     parmi les parents liés actifs.
--   Restant assumé (pas de théâtre) : la whitelist par catégorie
--   (allowed_categories) attend qu'une catégorie transite dans le pipeline de
--   dépense ; les débiteurs directs legacy (buy_listing, complete_ride,
--   spend_tokens/transfer_tokens) sont déjà flaggés RED/deprecated au canon §7
--   et seront couverts par leur réécriture.
--
-- Écritures parental_limits : service_role uniquement (le relèvement d'un
-- plafond F6 exige le process post-KYC ; un parent ne peut pas s'auto-relever).
-- Idempotent : CREATE IF NOT EXISTS, seeds gardés, CREATE OR REPLACE.
-- ---------------------------------------------------------------------------

-- 1) Défauts globaux (lus par _check_topup_caps).
INSERT INTO public.xp_payment_settings (setting_key, setting_value, description)
SELECT 'max_single_topup_dh', '200', 'F6: plafond DH par recharge (BAM lightly-KYC)'
WHERE NOT EXISTS (SELECT 1 FROM public.xp_payment_settings WHERE setting_key = 'max_single_topup_dh');

INSERT INTO public.xp_payment_settings (setting_key, setting_value, description)
SELECT 'parent_monthly_topup_cap_dh', '500', 'F6: plafond DH de recharge par parent et par mois calendaire (Africa/Casablanca)'
WHERE NOT EXISTS (SELECT 1 FROM public.xp_payment_settings WHERE setting_key = 'parent_monthly_topup_cap_dh');

INSERT INTO public.xp_payment_settings (setting_key, setting_value, description)
SELECT 'teen_monthly_topup_aggregate_dh', '5000', 'F6: plafond DH agrégé reçu par ado et par mois calendaire (tous parents confondus)'
WHERE NOT EXISTS (SELECT 1 FROM public.xp_payment_settings WHERE setting_key = 'teen_monthly_topup_aggregate_dh');

-- 2) Table des overrides par parent(-ado).
CREATE TABLE IF NOT EXISTS public.parental_limits (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  teen_id              uuid REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL = tous les ados de ce parent
  max_single_topup_dh  numeric(10,2) CHECK (max_single_topup_dh  IS NULL OR max_single_topup_dh  > 0),
  max_monthly_topup_dh numeric(10,2) CHECK (max_monthly_topup_dh IS NULL OR max_monthly_topup_dh > 0),
  max_monthly_spend_dh numeric(10,2) CHECK (max_monthly_spend_dh IS NULL OR max_monthly_spend_dh >= 0),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by           uuid,
  CONSTRAINT parental_limits_pair_uniq UNIQUE NULLS NOT DISTINCT (parent_id, teen_id)
);
COMMENT ON TABLE public.parental_limits IS
  'F6/F49: overrides de plafonds par (parent, ado). Colonnes NULL = défaut global xp_payment_settings. Écritures service_role only (relèvement F6 = post-KYC).';

CREATE INDEX IF NOT EXISTS idx_parental_limits_teen ON public.parental_limits(teen_id);

ALTER TABLE public.parental_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS parental_limits_parent_read ON public.parental_limits;
CREATE POLICY parental_limits_parent_read ON public.parental_limits
  FOR SELECT TO authenticated USING (parent_id = auth.uid());
-- Pas de policy INSERT/UPDATE/DELETE : deny-default, service_role bypass.

-- 3) Helper F6 : vérifie les trois plafonds de recharge.
CREATE OR REPLACE FUNCTION public._check_topup_caps(p_parent_id uuid, p_teen_id uuid, p_amount_dh numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_single_cap  numeric;
  v_parent_cap  numeric;
  v_teen_cap    numeric;
  v_parent_mtd  numeric;
  v_teen_mtd    numeric;
  v_month_start timestamp;
BEGIN
  -- Résolution par plafond : override ligne (ado-spécifique > parent-wide) → défaut global → dur.
  v_single_cap := COALESCE(
    (SELECT pl.max_single_topup_dh FROM parental_limits pl
      WHERE pl.parent_id = p_parent_id AND (pl.teen_id = p_teen_id OR pl.teen_id IS NULL)
        AND pl.max_single_topup_dh IS NOT NULL
      ORDER BY (pl.teen_id IS NOT NULL) DESC LIMIT 1),
    (SELECT (setting_value)::text::numeric FROM xp_payment_settings
      WHERE setting_key = 'max_single_topup_dh' LIMIT 1),
    200);

  v_parent_cap := COALESCE(
    (SELECT pl.max_monthly_topup_dh FROM parental_limits pl
      WHERE pl.parent_id = p_parent_id AND (pl.teen_id = p_teen_id OR pl.teen_id IS NULL)
        AND pl.max_monthly_topup_dh IS NOT NULL
      ORDER BY (pl.teen_id IS NOT NULL) DESC LIMIT 1),
    (SELECT (setting_value)::text::numeric FROM xp_payment_settings
      WHERE setting_key = 'parent_monthly_topup_cap_dh' LIMIT 1),
    500);

  v_teen_cap := COALESCE(
    (SELECT (setting_value)::text::numeric FROM xp_payment_settings
      WHERE setting_key = 'teen_monthly_topup_aggregate_dh' LIMIT 1),
    5000);

  IF p_amount_dh > v_single_cap THEN
    RETURN jsonb_build_object('ok', false, 'error', 'exceeds_single_topup_cap', 'cap_dh', v_single_cap);
  END IF;

  -- Mois calendaire local Africa/Casablanca (ancre canon lifestyle).
  v_month_start := date_trunc('month', (now() AT TIME ZONE 'Africa/Casablanca'));

  SELECT COALESCE(SUM(amount_dh), 0) INTO v_parent_mtd
    FROM payment_transactions
   WHERE parent_id = p_parent_id AND status = 'succeeded'
     AND (created_at AT TIME ZONE 'Africa/Casablanca') >= v_month_start;

  IF v_parent_mtd + p_amount_dh > v_parent_cap THEN
    RETURN jsonb_build_object('ok', false, 'error', 'exceeds_parent_monthly_cap',
      'cap_dh', v_parent_cap, 'mtd_dh', v_parent_mtd);
  END IF;

  SELECT COALESCE(SUM(amount_dh), 0) INTO v_teen_mtd
    FROM payment_transactions
   WHERE teen_id = p_teen_id AND status = 'succeeded'
     AND (created_at AT TIME ZONE 'Africa/Casablanca') >= v_month_start;

  IF v_teen_mtd + p_amount_dh > v_teen_cap THEN
    RETURN jsonb_build_object('ok', false, 'error', 'exceeds_teen_monthly_cap',
      'cap_dh', v_teen_cap, 'mtd_dh', v_teen_mtd);
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$function$;
GRANT EXECUTE ON FUNCTION public._check_topup_caps(uuid, uuid, numeric) TO service_role;
COMMENT ON FUNCTION public._check_topup_caps(uuid, uuid, numeric) IS
  'F6: plafonds de recharge (par op / mensuel parent / agrégat mensuel ado), overrides parental_limits, mois local Casablanca.';

-- 4) top_up_teen (3-arg) — corps live + insertion du check F6 après le gate e-signature.
CREATE OR REPLACE FUNCTION public.top_up_teen(p_parent_id uuid, p_teen_id uuid, p_amount_dh numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_amount_coins integer;
  v_payment_id uuid;
  v_signature_id uuid;
  v_link_id uuid;
  v_new_balance integer;
  v_caps jsonb;
BEGIN
  -- Identity check: when called from a user JWT, the caller must be the parent.
  -- Service-role calls (auth.uid() IS NULL) are trusted (server route already
  -- validated the role).
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF p_amount_dh IS NULL OR p_amount_dh <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  -- Locked rate per whitepaper §5: 100 coins per DH.
  v_amount_coins := (p_amount_dh * 100)::integer;

  -- Verify parent-teen link is active.
  SELECT id INTO v_link_id
  FROM parent_teen_links
  WHERE parent_id = p_parent_id AND teen_id = p_teen_id
  LIMIT 1;

  IF v_link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'teen_not_linked');
  END IF;

  -- Verify parent has signed CGU (e_signature gate). Whitepaper §10 invariant:
  -- "No coin debit happens without an active e_signatures.terms_accepted=true row."
  -- Top-ups also require this gate.
  SELECT id INTO v_signature_id
  FROM e_signatures
  WHERE parent_id = p_parent_id AND terms_accepted = true
  LIMIT 1;

  IF v_signature_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'requires_signature');
  END IF;

  -- F6 (mig 179): plafonds BAM — par opération, mensuel parent, agrégat ado.
  v_caps := public._check_topup_caps(p_parent_id, p_teen_id, p_amount_dh);
  IF NOT (v_caps->>'ok')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_caps->>'error',
      'cap_dh', v_caps->'cap_dh', 'mtd_dh', v_caps->'mtd_dh');
  END IF;

  -- 4. Create payment_transactions row (pending).
  INSERT INTO payment_transactions (
    parent_id, teen_id, amount_dh, amount_coins, status, psp_provider, psp_reference
  ) VALUES (
    p_parent_id, p_teen_id, p_amount_dh, v_amount_coins, 'pending', 'manual', NULL
  )
  RETURNING id INTO v_payment_id;

  -- 5. Mark succeeded (placeholder for PSP webhook in MVP).
  UPDATE payment_transactions
  SET status = 'succeeded', succeeded_at = NOW()
  WHERE id = v_payment_id;

  -- 6. Insert paired escrow_ledger row.
  INSERT INTO escrow_ledger (
    parent_id, teen_id, direction, amount_dh, amount_coins,
    related_payment_id, reason, created_by
  ) VALUES (
    p_parent_id, p_teen_id, 'top_up', p_amount_dh, v_amount_coins,
    v_payment_id, 'Parent top-up (manual MVP)', p_parent_id
  );

  -- 7. Upsert user_coins balance.
  INSERT INTO user_coins (teen_id, balance, lifetime_earned, updated_at)
  VALUES (p_teen_id, v_amount_coins, v_amount_coins, NOW())
  ON CONFLICT (teen_id) DO UPDATE
    SET balance = COALESCE(user_coins.balance, 0) + EXCLUDED.balance,
        lifetime_earned = COALESCE(user_coins.lifetime_earned, 0) + EXCLUDED.lifetime_earned,
        updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  -- 8. Insert coin_transactions ledger row.
  INSERT INTO coin_transactions (
    teen_id, amount, transaction_type, source_type, source_id,
    description, balance_after
  ) VALUES (
    p_teen_id, v_amount_coins, 'topup', 'parent_topup', v_payment_id,
    format('Recharge parentale de %s DH (%s coins)', p_amount_dh, v_amount_coins),
    v_new_balance
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'amount_coins', v_amount_coins,
    'new_balance', v_new_balance
  );
EXCEPTION WHEN OTHERS THEN
  -- Whole transaction rolls back automatically.
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 5) top_up_teen (5-arg, chemin du route) — corps live + insertion du check F6.
CREATE OR REPLACE FUNCTION public.top_up_teen(p_parent_id uuid, p_teen_id uuid, p_amount_dh numeric, p_provider text, p_provider_ref text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller         UUID := auth.uid();
  v_amount_coins   INTEGER;
  v_payment_id     UUID;
  v_signature_id   UUID;
  v_link_id        UUID;
  v_new_balance    INTEGER;
  v_existing_id    UUID;
  v_caps           jsonb;
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_parent_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;

  IF p_amount_dh IS NULL OR p_amount_dh <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  IF p_provider IS NULL OR length(p_provider) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_provider');
  END IF;

  IF p_provider_ref IS NOT NULL AND length(p_provider_ref) > 0 THEN
    SELECT id INTO v_existing_id
    FROM payment_transactions
    WHERE psp_provider = p_provider AND psp_reference = p_provider_ref
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'payment_id', v_existing_id
      );
    END IF;
  END IF;

  v_amount_coins := (p_amount_dh * 100)::integer;

  SELECT id INTO v_link_id
  FROM parent_teen_links
  WHERE parent_id = p_parent_id AND teen_id = p_teen_id
  LIMIT 1;

  IF v_link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'teen_not_linked');
  END IF;

  SELECT id INTO v_signature_id
  FROM e_signatures
  WHERE parent_id = p_parent_id AND terms_accepted = true
  LIMIT 1;

  IF v_signature_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'requires_signature');
  END IF;

  -- F6 (mig 179): plafonds BAM — par opération, mensuel parent, agrégat ado.
  v_caps := public._check_topup_caps(p_parent_id, p_teen_id, p_amount_dh);
  IF NOT (v_caps->>'ok')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_caps->>'error',
      'cap_dh', v_caps->'cap_dh', 'mtd_dh', v_caps->'mtd_dh');
  END IF;

  INSERT INTO payment_transactions (
    parent_id, teen_id, amount_dh, amount_coins, status, psp_provider, psp_reference
  ) VALUES (
    p_parent_id, p_teen_id, p_amount_dh, v_amount_coins, 'pending', p_provider, p_provider_ref
  ) RETURNING id INTO v_payment_id;

  UPDATE payment_transactions
     SET status = 'succeeded', succeeded_at = NOW()
   WHERE id = v_payment_id;

  INSERT INTO escrow_ledger (
    parent_id, teen_id, direction, amount_dh, amount_coins,
    related_payment_id, reason, created_by
  ) VALUES (
    p_parent_id, p_teen_id, 'top_up', p_amount_dh, v_amount_coins,
    v_payment_id, format('Parent top-up via %s (ref=%s)', p_provider, COALESCE(p_provider_ref, 'n/a')),
    p_parent_id
  );

  INSERT INTO user_coins (teen_id, balance, lifetime_earned, updated_at)
  VALUES (p_teen_id, v_amount_coins, v_amount_coins, NOW())
  ON CONFLICT (teen_id) DO UPDATE
    SET balance = COALESCE(user_coins.balance, 0) + EXCLUDED.balance,
        lifetime_earned = COALESCE(user_coins.lifetime_earned, 0) + EXCLUDED.lifetime_earned,
        updated_at = NOW()
  RETURNING balance INTO v_new_balance;

  INSERT INTO coin_transactions (
    teen_id, amount, transaction_type, source_type, source_id,
    description, balance_after
  ) VALUES (
    p_teen_id, v_amount_coins, 'topup', 'parent_topup', v_payment_id,
    format('Recharge parentale %s DH via %s', p_amount_dh, p_provider),
    v_new_balance
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'amount_coins', v_amount_coins,
    'new_balance', v_new_balance,
    'provider', p_provider,
    'provider_ref', p_provider_ref
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 6) _debit_teen_coins — corps live + plafond mensuel de dépense (F49) après
--    le check de solde dépensable. Couvre spend_teen_coins + split_group_purchase.
CREATE OR REPLACE FUNCTION public._debit_teen_coins(p_teen_id uuid, p_amount_coins integer, p_partner_id uuid DEFAULT NULL::uuid, p_reward_id uuid DEFAULT NULL::uuid, p_idempotency_key uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_balance integer;
  v_locked integer;
  v_spendable integer;
  v_new_balance integer;
  v_cashback_pct numeric;
  v_cashback_xp integer;
  v_parent_id uuid;
  v_xp_result jsonb;
  v_coin_tx_id uuid;
  v_existing_id uuid;
  v_existing_balance integer;
  v_spend_cap_dh numeric;
  v_spent_mtd_dh numeric;
  v_month_start timestamp;
BEGIN
  IF p_amount_coins IS NULL OR p_amount_coins <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
      FROM coin_transactions
     WHERE client_idempotency_key = p_idempotency_key
     LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'status', 'succeeded',
        'new_balance', v_existing_balance, 'spend_id', v_existing_id,
        'idempotent_replay', true);
    END IF;
  END IF;

  SELECT balance INTO v_balance FROM user_coins WHERE teen_id = p_teen_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_wallet');
  END IF;

  SELECT COALESCE(SUM(current_saved_coins), 0)::int INTO v_locked
    FROM savings_goals
   WHERE teen_id = p_teen_id AND status = 'active';

  v_spendable := v_balance - v_locked;
  IF v_spendable < p_amount_coins THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance',
      'balance', v_balance, 'locked', v_locked, 'spendable', v_spendable);
  END IF;

  -- F49 (mig 179): plafond mensuel de dépense configuré par le(s) parent(s).
  -- Règle la plus restrictive parmi les parents liés actifs ; mois local
  -- Casablanca. Le MTD compte les 'spend' seuls (les refunds ne re-créditent
  -- pas le plafond — conservateur, donc plus protecteur).
  SELECT MIN(pl.max_monthly_spend_dh) INTO v_spend_cap_dh
    FROM parental_limits pl
    JOIN parent_teen_links ptl
      ON ptl.parent_id = pl.parent_id AND ptl.teen_id = p_teen_id AND ptl.status = 'active'
   WHERE (pl.teen_id = p_teen_id OR pl.teen_id IS NULL)
     AND pl.max_monthly_spend_dh IS NOT NULL;

  IF v_spend_cap_dh IS NOT NULL THEN
    v_month_start := date_trunc('month', (now() AT TIME ZONE 'Africa/Casablanca'));
    SELECT COALESCE(SUM(-amount), 0) / 100.0 INTO v_spent_mtd_dh
      FROM coin_transactions
     WHERE teen_id = p_teen_id
       AND transaction_type = 'spend'
       AND (created_at AT TIME ZONE 'Africa/Casablanca') >= v_month_start;
    IF v_spent_mtd_dh + (p_amount_coins / 100.0) > v_spend_cap_dh THEN
      RETURN jsonb_build_object('success', false, 'error', 'exceeds_monthly_spend_cap',
        'cap_dh', v_spend_cap_dh, 'spent_mtd_dh', v_spent_mtd_dh);
    END IF;
  END IF;

  SELECT cashback_pct INTO v_cashback_pct
  FROM cashback_rules
  WHERE is_active = true
    AND (partner_id IS NULL OR partner_id = p_partner_id)
    AND (active_from IS NULL OR active_from <= NOW())
    AND (active_until IS NULL OR active_until > NOW())
  ORDER BY partner_id NULLS LAST
  LIMIT 1;

  IF v_cashback_pct IS NULL THEN
    SELECT (setting_value)::text::numeric INTO v_cashback_pct
    FROM xp_payment_settings
    WHERE setting_key = 'default_cashback_pct'
    LIMIT 1;
  END IF;
  v_cashback_pct := COALESCE(v_cashback_pct, 10);

  v_cashback_xp := FLOOR(p_amount_coins * v_cashback_pct / 100)::integer;

  UPDATE user_coins
  SET balance = balance - p_amount_coins,
      lifetime_spent = COALESCE(lifetime_spent, 0) + p_amount_coins,
      updated_at = NOW()
  WHERE teen_id = p_teen_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO coin_transactions (
    teen_id, amount, transaction_type, source_type, source_id,
    description, balance_after, client_idempotency_key
  ) VALUES (
    p_teen_id, -p_amount_coins, 'spend',
    CASE WHEN p_partner_id IS NOT NULL THEN 'partner' ELSE 'reward' END,
    COALESCE(p_partner_id, p_reward_id),
    format('Depense de %s coins (cashback %s%% = %s XP)', p_amount_coins, v_cashback_pct, v_cashback_xp),
    v_new_balance, p_idempotency_key
  ) RETURNING id INTO v_coin_tx_id;

  SELECT parent_id INTO v_parent_id
  FROM parent_teen_links
  WHERE teen_id = p_teen_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_parent_id IS NOT NULL THEN
    INSERT INTO escrow_ledger (
      parent_id, teen_id, direction, amount_dh, amount_coins,
      related_spend_id, reason, created_by
    ) VALUES (
      v_parent_id, p_teen_id, 'spend',
      p_amount_coins / 100.0, p_amount_coins,
      v_coin_tx_id,
      format('Spend (partner=%s reward=%s)', COALESCE(p_partner_id::text, '-'), COALESCE(p_reward_id::text, '-')),
      p_teen_id
    );
  END IF;

  IF v_cashback_xp > 0 THEN
    v_xp_result := add_xp_to_user(
      p_teen_id, v_cashback_xp,
      'cashback'::varchar, 'spend'::varchar,
      v_coin_tx_id,
      format('Cashback %s%% sur depense de %s coins', v_cashback_pct, p_amount_coins)
    );
  END IF;

  IF p_partner_id IS NOT NULL THEN
    INSERT INTO partner_transactions (
      partner_id, teen_id, reward_id, amount_dh, amount_coins,
      cashback_xp, status
    ) VALUES (
      p_partner_id, p_teen_id, p_reward_id,
      p_amount_coins / 100.0, p_amount_coins,
      v_cashback_xp, 'succeeded'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'status', 'succeeded',
    'new_balance', v_new_balance,
    'spendable', v_new_balance - v_locked,
    'xp_earned', v_cashback_xp,
    'cashback_pct', v_cashback_pct,
    'spend_id', v_coin_tx_id
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT id, balance_after INTO v_existing_id, v_existing_balance
      FROM coin_transactions
     WHERE client_idempotency_key = p_idempotency_key
     LIMIT 1;
    RETURN jsonb_build_object('success', true, 'status', 'succeeded',
      'new_balance', v_existing_balance, 'spend_id', v_existing_id,
      'idempotent_replay', true);
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
