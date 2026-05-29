-- 114_shop_xp_source_user_xp.sql
--
-- #65 — The shop RPCs read/write the OLD profiles.total_xp / profiles.level
-- columns, which no longer exist (Wave 1A/6C moved XP to user_xp, keyed on
-- teen_id; see mig 103). So get_shop_rewards and purchase_reward reference
-- non-existent columns and fail at runtime, and the affordability/debit don't
-- match the canonical balance (user_xp.total_xp) the rest of the shop reads.
--
-- Canon (economy-payments.locked.md §… ): XP source = user_xp.total_xp;
-- purchase_reward must debit user_xp.total_xp (FOR UPDATE) and write an
-- xp_transactions audit row.
--
-- Rewrite both RPCs onto user_xp (CREATE OR REPLACE; does not touch mig 004).
-- Idempotent. search_path stays pinned (set by #56). Bodies are unchanged
-- except the XP source reads/writes + the new audit row.

-- ── get_shop_rewards: read level/xp from user_xp ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_shop_rewards(
  p_user_id uuid,
  p_category_slug character varying DEFAULT NULL::character varying,
  p_only_affordable boolean DEFAULT false,
  p_only_available boolean DEFAULT true
)
RETURNS TABLE(reward_id uuid, category_id uuid, category_name character varying, category_slug character varying, name character varying, description text, short_description character varying, image_url text, icon character varying, xp_cost integer, original_xp_cost integer, stock_type character varying, stock_remaining integer, min_level integer, required_badge_id uuid, vip_only boolean, reward_type character varying, reward_value jsonb, is_featured boolean, is_new boolean, can_purchase boolean, user_purchase_count integer, purchase_limit integer, is_in_wishlist boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_user_level INT;
    v_user_xp INT;
BEGIN
    -- #65 — canonical XP source is user_xp.total_xp (keyed on teen_id).
    SELECT current_level, total_xp INTO v_user_level, v_user_xp
    FROM user_xp WHERE teen_id = p_user_id;

    v_user_level := COALESCE(v_user_level, 1);
    v_user_xp := COALESCE(v_user_xp, 0);

    RETURN QUERY
    SELECT
        sr.id as reward_id,
        sr.category_id,
        rc.name as category_name,
        rc.slug as category_slug,
        sr.name,
        sr.description,
        sr.short_description,
        sr.image_url,
        sr.icon,
        sr.xp_cost,
        sr.original_xp_cost,
        sr.stock_type,
        sr.stock_remaining,
        sr.min_level,
        sr.required_badge_id,
        sr.vip_only,
        sr.reward_type,
        sr.reward_value,
        sr.is_featured,
        sr.is_new,
        (
            sr.is_active
            AND v_user_level >= sr.min_level
            AND v_user_xp >= sr.xp_cost
            AND (sr.stock_type = 'unlimited' OR COALESCE(sr.stock_remaining, 0) > 0)
            AND (sr.available_from IS NULL OR sr.available_from <= NOW())
            AND (sr.available_until IS NULL OR sr.available_until >= NOW())
            AND (
                sr.purchase_limit_per_user IS NULL
                OR (
                    SELECT COUNT(*) FROM user_purchases up
                    WHERE up.user_id = p_user_id
                    AND up.reward_id = sr.id
                    AND up.status != 'refunded'
                ) < sr.purchase_limit_per_user
            )
        ) as can_purchase,
        (
            SELECT COUNT(*)::INT FROM user_purchases up
            WHERE up.user_id = p_user_id
            AND up.reward_id = sr.id
            AND up.status != 'refunded'
        ) as user_purchase_count,
        sr.purchase_limit_per_user as purchase_limit,
        EXISTS(
            SELECT 1 FROM user_wishlists uw
            WHERE uw.user_id = p_user_id AND uw.reward_id = sr.id
        ) as is_in_wishlist
    FROM shop_rewards sr
    LEFT JOIN reward_categories rc ON sr.category_id = rc.id
    WHERE sr.is_active = TRUE
        AND (p_category_slug IS NULL OR rc.slug = p_category_slug)
        AND (NOT p_only_available OR (
            (sr.available_from IS NULL OR sr.available_from <= NOW())
            AND (sr.available_until IS NULL OR sr.available_until >= NOW())
        ))
        AND (NOT p_only_affordable OR v_user_xp >= sr.xp_cost)
    ORDER BY sr.is_featured DESC, rc.display_order, sr.display_order;
END;
$function$;

-- ── purchase_reward: debit user_xp + write xp_transactions audit ────────────
CREATE OR REPLACE FUNCTION public.purchase_reward(
  p_user_id uuid,
  p_reward_id uuid,
  p_promo_code character varying DEFAULT NULL::character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_reward shop_rewards%ROWTYPE;
    v_user_xp INT;
    v_user_level INT;
    v_final_cost INT;
    v_discount INT := 0;
    v_promo_id UUID;
    v_purchase_id UUID;
    v_purchase_count INT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Lock the reward row
    SELECT * INTO v_reward FROM shop_rewards WHERE id = p_reward_id FOR UPDATE;

    IF v_reward IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense non trouvée');
    END IF;

    IF NOT v_reward.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense non disponible');
    END IF;

    IF v_reward.available_from IS NOT NULL AND v_reward.available_from > NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense pas encore disponible');
    END IF;

    IF v_reward.available_until IS NOT NULL AND v_reward.available_until < NOW() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Récompense expirée');
    END IF;

    IF v_reward.stock_type != 'unlimited' AND COALESCE(v_reward.stock_remaining, 0) <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rupture de stock');
    END IF;

    -- #65 — canonical XP source: user_xp.total_xp, locked FOR UPDATE (canon §6
    -- anti-pattern: no read-then-write outside an atomic lock).
    SELECT total_xp, current_level INTO v_user_xp, v_user_level
    FROM user_xp WHERE teen_id = p_user_id FOR UPDATE;

    IF COALESCE(v_user_level, 1) < v_reward.min_level THEN
        RETURN jsonb_build_object('success', false, 'error', 'Niveau insuffisant');
    END IF;

    IF v_reward.purchase_limit_per_user IS NOT NULL THEN
        SELECT COUNT(*) INTO v_purchase_count
        FROM user_purchases
        WHERE user_id = p_user_id
        AND reward_id = p_reward_id
        AND status != 'refunded';

        IF v_purchase_count >= v_reward.purchase_limit_per_user THEN
            RETURN jsonb_build_object('success', false, 'error', 'Limite d''achat atteinte');
        END IF;
    END IF;

    v_final_cost := v_reward.xp_cost;

    IF p_promo_code IS NOT NULL THEN
        SELECT id INTO v_promo_id
        FROM shop_promo_codes
        WHERE code = UPPER(p_promo_code)
            AND is_active = TRUE
            AND valid_from <= NOW()
            AND (valid_until IS NULL OR valid_until >= NOW())
            AND (max_uses IS NULL OR current_uses < max_uses)
            AND (
                applicable_reward_ids IS NULL
                OR p_reward_id = ANY(applicable_reward_ids)
            )
            AND (
                applicable_category_ids IS NULL
                OR v_reward.category_id = ANY(applicable_category_ids)
            );

        IF v_promo_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM promo_code_uses
                WHERE promo_code_id = v_promo_id AND user_id = p_user_id
                HAVING COUNT(*) >= (SELECT max_uses_per_user FROM shop_promo_codes WHERE id = v_promo_id)
            ) THEN
                SELECT
                    CASE
                        WHEN discount_type = 'percentage' THEN v_reward.xp_cost * discount_value / 100
                        ELSE discount_value
                    END INTO v_discount
                FROM shop_promo_codes WHERE id = v_promo_id;

                v_final_cost := GREATEST(0, v_reward.xp_cost - v_discount);
            END IF;
        END IF;
    END IF;

    -- Check XP against the canonical balance.
    IF COALESCE(v_user_xp, 0) < v_final_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'XP insuffisants');
    END IF;

    IF v_reward.reward_type IN ('free_entry', 'discount', 'skip_queue') THEN
        v_expires_at := NOW() + INTERVAL '90 days';
    ELSIF v_reward.reward_type = 'xp_multiplier' THEN
        v_expires_at := NOW() + INTERVAL '24 hours';
    END IF;

    -- #65 — debit the canonical XP balance.
    UPDATE user_xp
    SET total_xp = total_xp - v_final_cost, updated_at = NOW()
    WHERE teen_id = p_user_id;

    IF v_reward.stock_type != 'unlimited' THEN
        UPDATE shop_rewards
        SET stock_remaining = stock_remaining - 1
        WHERE id = p_reward_id;
    END IF;

    INSERT INTO user_purchases (user_id, reward_id, xp_spent, expires_at)
    VALUES (p_user_id, p_reward_id, v_final_cost, v_expires_at)
    RETURNING id INTO v_purchase_id;

    -- #65 — XP audit ledger (canon: source 'purchase', negative amount).
    INSERT INTO xp_transactions (teen_id, amount, source_type, source_id, type, description, balance_before, balance_after)
    VALUES (
        p_user_id, -v_final_cost, 'purchase', v_purchase_id, 'payment',
        'Achat boutique: ' || v_reward.name,
        COALESCE(v_user_xp, 0), COALESCE(v_user_xp, 0) - v_final_cost
    );

    IF v_promo_id IS NOT NULL AND v_discount > 0 THEN
        INSERT INTO promo_code_uses (promo_code_id, user_id, purchase_id, xp_saved)
        VALUES (v_promo_id, p_user_id, v_purchase_id, v_discount);

        UPDATE shop_promo_codes
        SET current_uses = current_uses + 1
        WHERE id = v_promo_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'purchase_id', v_purchase_id,
        'xp_spent', v_final_cost,
        'discount_applied', v_discount,
        'reward_name', v_reward.name,
        'reward_type', v_reward.reward_type,
        'reward_value', v_reward.reward_value,
        'expires_at', v_expires_at
    );
END;
$function$;
