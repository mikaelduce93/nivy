-- 132_split_group_purchase.sql
-- ---------------------------------------------------------------------------
-- #228 (V6 socle, P0) — Split paiement multi-payeur « chacun paie sa part ».
--
-- PROBLÈME : spend_teen_coins rejette si auth.uid() <> p_teen_id (un ado ne peut
-- débiter que SON wallet). auth.uid() est constant sous SECURITY DEFINER → un
-- orchestrateur de split ne peut donc PAS réutiliser spend_teen_coins pour
-- débiter les autres participants.
--
-- SOLUTION : on extrait le corps de spend_teen_coins dans un helper interne
-- _debit_teen_coins (MÊME logique : FOR UPDATE, spendable-aware, idempotent,
-- escrow + coin_transactions + cashback + partner_transactions) SANS le garde
-- auth.uid(). spend_teen_coins devient un wrapper mince (garde auth → helper).
-- Comportement IDENTIQUE pour tous les appelants existants.
--   - _debit_teen_coins : REVOKE de PUBLIC/authenticated (un client ne peut PAS
--     l'appeler pour débiter un autre ado).
--   - split_group_purchase : autorisation = CONSENTEMENT (chaque participant a
--     une invite 'accepted' sur le group_action) ; débite N ados ; échec
--     ATOMIQUE (RAISE) si un solde est insuffisant → tout est annulé.
--   - refund_group_split : recrédit appairé (escrow direction='refund').
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- 1. split_ledger
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.split_ledger (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_action_id  uuid NOT NULL REFERENCES public.group_actions(id) ON DELETE CASCADE,
  teen_id          uuid NOT NULL,
  share_coins      integer NOT NULL CHECK (share_coins > 0),
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','failed')),
  spend_id         uuid,            -- coin_transactions.id du débit
  refund_spend_id  uuid,            -- coin_transactions.id du recrédit
  partner_id       uuid,
  idempotency_key  uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  paid_at          timestamptz,
  refunded_at      timestamptz,
  UNIQUE (group_action_id, teen_id)
);
CREATE INDEX IF NOT EXISTS idx_split_ledger_action ON public.split_ledger(group_action_id);
CREATE INDEX IF NOT EXISTS idx_split_ledger_teen ON public.split_ledger(teen_id, status);

ALTER TABLE public.split_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS split_ledger_read ON public.split_ledger;
CREATE POLICY split_ledger_read ON public.split_ledger FOR SELECT
  USING (
    teen_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.group_actions ga
               WHERE ga.id = split_ledger.group_action_id
                 AND ga.organizer_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM public.parent_teen_links l
               WHERE l.parent_id = (SELECT auth.uid())
                 AND l.teen_id = split_ledger.teen_id)
  );

-- ===========================================================================
-- 2. _debit_teen_coins — corps extrait de spend_teen_coins (SANS garde auth)
--    NE PAS exposer aux clients (REVOKE plus bas). Réutilisé par le wrapper
--    spend_teen_coins ET par split_group_purchase.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public._debit_teen_coins(
  p_teen_id uuid,
  p_amount_coins integer,
  p_partner_id uuid DEFAULT NULL::uuid,
  p_reward_id uuid DEFAULT NULL::uuid,
  p_idempotency_key uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    format('Dépense de %s coins (cashback %s%% = %s XP)', p_amount_coins, v_cashback_pct, v_cashback_xp),
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
      format('Cashback %s%% sur dépense de %s coins', v_cashback_pct, p_amount_coins)
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

-- Helper privilégié : JAMAIS exposé aux clients (sinon contournement du garde auth).
REVOKE ALL ON FUNCTION public._debit_teen_coins(uuid, integer, uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._debit_teen_coins(uuid, integer, uuid, uuid, uuid) FROM authenticated;
COMMENT ON FUNCTION public._debit_teen_coins(uuid, integer, uuid, uuid, uuid) IS
  '#228 INTERNE — débit coin sans garde auth (corps de spend_teen_coins). NE PAS GRANT à authenticated.';

-- ===========================================================================
-- 3. spend_teen_coins — wrapper mince (garde auth → helper). Comportement
--    identique à la 124. On supprime l'ancienne définition monolithique.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.spend_teen_coins(
  p_teen_id uuid,
  p_amount_coins integer,
  p_partner_id uuid DEFAULT NULL::uuid,
  p_reward_id uuid DEFAULT NULL::uuid,
  p_idempotency_key uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NOT NULL AND v_caller <> p_teen_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_caller');
  END IF;
  RETURN public._debit_teen_coins(p_teen_id, p_amount_coins, p_partner_id, p_reward_id, p_idempotency_key);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.spend_teen_coins(uuid, integer, uuid, uuid, uuid)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.spend_teen_coins(uuid, integer, uuid, uuid, uuid) IS
  '#206/#228: wrapper auth (auth.uid()=teen) au-dessus de _debit_teen_coins. p_idempotency_key déduplique les retries.';

-- ===========================================================================
-- 4. split_group_purchase — débite N participants atomiquement
--    p_participants = [{"teen_id":"…","share_coins":1200}, …]
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.split_group_purchase(
  p_group_action_id uuid,
  p_participants jsonb,
  p_partner_id uuid DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller    uuid := auth.uid();
  v_ga        group_actions%ROWTYPE;
  v_p         jsonb;
  v_teen      uuid;
  v_share     integer;
  v_idem      uuid;
  v_debit     jsonb;
  v_total     integer := 0;
  v_count     integer := 0;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_ga FROM group_actions WHERE id = p_group_action_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'group_action_not_found');
  END IF;
  IF v_ga.organizer_id <> v_caller THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_organizer');
  END IF;
  IF v_ga.status NOT IN ('forming','confirmed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_group_status', 'status', v_ga.status);
  END IF;
  IF p_participants IS NULL OR jsonb_array_length(p_participants) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_participants');
  END IF;

  -- Phase 1 : valider le consentement de CHAQUE participant (invite 'accepted')
  -- AVANT tout débit. Fail-fast.
  FOR v_p IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    v_teen  := (v_p->>'teen_id')::uuid;
    v_share := (v_p->>'share_coins')::integer;
    IF v_teen IS NULL OR v_share IS NULL OR v_share <= 0 THEN
      RAISE EXCEPTION 'invalid_participant:%', v_p::text;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM group_action_invites i
       WHERE i.group_action_id = p_group_action_id
         AND i.teen_id = v_teen
         AND i.status = 'accepted'
    ) THEN
      RAISE EXCEPTION 'participant_not_consented:%', v_teen;
    END IF;
  END LOOP;

  -- Phase 2 : débiter. Échec ATOMIQUE — un débit raté → RAISE → tout rollback.
  FOR v_p IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    v_teen  := (v_p->>'teen_id')::uuid;
    v_share := (v_p->>'share_coins')::integer;
    -- Clé idempotente déterministe (group × teen) : un retry post-commit rejoue
    -- au lieu de re-débiter ; un rollback efface la clé → re-débit propre.
    v_idem  := COALESCE(p_idempotency_key, md5(p_group_action_id::text || ':' || v_teen::text)::uuid);

    v_debit := public._debit_teen_coins(v_teen, v_share, p_partner_id, NULL, v_idem);

    IF (v_debit->>'success')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'split_failed:%:%', v_teen, COALESCE(v_debit->>'error','unknown');
    END IF;

    INSERT INTO split_ledger (group_action_id, teen_id, share_coins, status, spend_id, partner_id, idempotency_key, paid_at)
    VALUES (p_group_action_id, v_teen, v_share, 'paid', (v_debit->>'spend_id')::uuid, p_partner_id, v_idem, now())
    ON CONFLICT (group_action_id, teen_id) DO UPDATE
      SET status = 'paid', spend_id = EXCLUDED.spend_id, share_coins = EXCLUDED.share_coins,
          partner_id = EXCLUDED.partner_id, idempotency_key = EXCLUDED.idempotency_key, paid_at = now();

    v_total := v_total + v_share;
    v_count := v_count + 1;
  END LOOP;

  UPDATE group_actions
     SET status = 'confirmed', total_coins = v_total, updated_at = now()
   WHERE id = p_group_action_id;

  RETURN jsonb_build_object(
    'success', true,
    'group_action_id', p_group_action_id,
    'participant_count', v_count,
    'total_coins', v_total
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.split_group_purchase(uuid, jsonb, uuid, uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.split_group_purchase(uuid, jsonb, uuid, uuid) IS
  '#228: débit atomique N participants (consentement=invite accepted). Échec global si un solde insuffisant.';

-- ===========================================================================
-- 5. refund_group_split — recrédit appairé (escrow direction='refund')
--    p_teen_id NULL = rembourse tous les participants 'paid'.
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.refund_group_split(
  p_group_action_id uuid,
  p_teen_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_row        split_ledger%ROWTYPE;
  v_new_balance integer;
  v_parent_id  uuid;
  v_coin_tx_id uuid;
  v_count      integer := 0;
  v_total      integer := 0;
BEGIN
  FOR v_row IN
    SELECT * FROM split_ledger
     WHERE group_action_id = p_group_action_id
       AND status = 'paid'
       AND (p_teen_id IS NULL OR teen_id = p_teen_id)
     FOR UPDATE
  LOOP
    UPDATE user_coins
       SET balance = balance + v_row.share_coins,
           lifetime_spent = GREATEST(COALESCE(lifetime_spent,0) - v_row.share_coins, 0),
           updated_at = now()
     WHERE teen_id = v_row.teen_id
     RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NULL THEN
      CONTINUE;  -- pas de wallet : rien à recréditer
    END IF;

    INSERT INTO coin_transactions (teen_id, amount, transaction_type, source_type, source_id, description, balance_after)
    VALUES (v_row.teen_id, v_row.share_coins, 'refund', 'group_split', p_group_action_id,
            'Remboursement split de groupe', v_new_balance)
    RETURNING id INTO v_coin_tx_id;

    SELECT parent_id INTO v_parent_id FROM parent_teen_links
      WHERE teen_id = v_row.teen_id ORDER BY created_at ASC LIMIT 1;
    IF v_parent_id IS NOT NULL THEN
      INSERT INTO escrow_ledger (parent_id, teen_id, direction, amount_dh, amount_coins, related_spend_id, reason, created_by)
      VALUES (v_parent_id, v_row.teen_id, 'refund', v_row.share_coins / 100.0, v_row.share_coins,
              v_coin_tx_id, 'Refund split de groupe', v_row.teen_id);
    END IF;

    UPDATE split_ledger SET status = 'refunded', refund_spend_id = v_coin_tx_id, refunded_at = now()
     WHERE id = v_row.id;

    v_count := v_count + 1;
    v_total := v_total + v_row.share_coins;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'refunded_count', v_count, 'refunded_coins', v_total);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.refund_group_split(uuid, uuid) TO authenticated, service_role;
COMMENT ON FUNCTION public.refund_group_split(uuid, uuid) IS
  '#228: recrédit appairé d''un split (utilisé par l''opposition parentale #230).';

COMMENT ON TABLE public.split_ledger IS '#228: registre des parts d''un achat de groupe (pending/paid/refunded).';
