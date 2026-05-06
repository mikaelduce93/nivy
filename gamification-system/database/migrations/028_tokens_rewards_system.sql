-- =============================================
-- MIGRATION 028: Tokens & Rewards System
-- =============================================
-- Système d'économie virtuelle avec tokens échangeables
-- Compatible avec user_coins, user_xp, shop_rewards existants
-- =============================================

-- =============================================
-- PARTIE 1: EXTENSION DE LA TABLE USER_COINS
-- =============================================

-- Ajouter de nouvelles colonnes à user_coins existante
DO $$
BEGIN
    -- Tokens premium (gagnés via abonnement, events spéciaux)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_coins' AND column_name = 'premium_tokens') THEN
        ALTER TABLE public.user_coins ADD COLUMN premium_tokens INTEGER DEFAULT 0;
    END IF;

    -- Tokens saisonniers (events, promotions limitées)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_coins' AND column_name = 'seasonal_tokens') THEN
        ALTER TABLE public.user_coins ADD COLUMN seasonal_tokens INTEGER DEFAULT 0;
    END IF;

    -- Tokens en attente (pending from activities)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_coins' AND column_name = 'pending_tokens') THEN
        ALTER TABLE public.user_coins ADD COLUMN pending_tokens INTEGER DEFAULT 0;
    END IF;

    -- Multiplicateur de tokens (from premium)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_coins' AND column_name = 'token_multiplier') THEN
        ALTER TABLE public.user_coins ADD COLUMN token_multiplier DECIMAL(3,2) DEFAULT 1.00;
    END IF;

    -- Total lifetime (tous types confondus)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_coins' AND column_name = 'total_lifetime_tokens') THEN
        ALTER TABLE public.user_coins ADD COLUMN total_lifetime_tokens INTEGER DEFAULT 0;
    END IF;
END $$;

-- =============================================
-- PARTIE 2: TABLE TOKEN_TYPES (Types de tokens)
-- =============================================

CREATE TABLE IF NOT EXISTS token_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    description TEXT,
    icon VARCHAR(50) DEFAULT 'coins',
    color VARCHAR(20) DEFAULT '#FFD700',

    -- Valeur relative (1 premium = X regular)
    exchange_rate DECIMAL(5,2) DEFAULT 1.00,

    -- Expiration (pour tokens saisonniers)
    expires_days INTEGER, -- NULL = jamais

    -- Disponibilité
    is_tradeable BOOLEAN DEFAULT true,
    is_purchasable BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure category constraint matches current allowed values when an older
-- token_rewards table already exists. On a fresh install the table is
-- created later in this same migration with the constraint embedded.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'token_rewards') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_schema = 'public'
              AND table_name = 'token_rewards'
              AND constraint_name = 'token_rewards_category_check'
        ) THEN
            ALTER TABLE public.token_rewards DROP CONSTRAINT token_rewards_category_check;
        END IF;
        ALTER TABLE public.token_rewards ADD CONSTRAINT token_rewards_category_check CHECK (category IN (
            'digital', 'physical', 'experience', 'discount', 'premium', 'donation', 'raffle'
        ));
    END IF;
END $$;

-- Tokens par défaut
INSERT INTO token_types (code, name, description, icon, color, exchange_rate, is_tradeable)
VALUES
    ('regular', 'Tokens', 'Tokens standards gagnés par activités', 'coins', '#FFD700', 1.00, true),
    ('premium', 'Tokens Premium', 'Tokens premium pour récompenses exclusives', 'gem', '#9333EA', 5.00, true),
    ('seasonal', 'Tokens Saison', 'Tokens limités de la saison actuelle', 'sparkles', '#EC4899', 2.00, false),
    ('gift', 'Tokens Cadeau', 'Tokens reçus en cadeau', 'gift', '#10B981', 1.00, false)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- PARTIE 3: TABLE TOKEN_SOURCES (Comment gagner)
-- =============================================

CREATE TABLE IF NOT EXISTS token_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Récompense
    token_type VARCHAR(50) DEFAULT 'regular' REFERENCES token_types(code),
    base_amount INTEGER NOT NULL,

    -- Limites
    daily_limit INTEGER, -- NULL = illimité
    weekly_limit INTEGER,
    monthly_limit INTEGER,

    -- Bonus premium
    premium_multiplier DECIMAL(3,2) DEFAULT 1.00,

    -- Cooldown (minutes)
    cooldown_minutes INTEGER DEFAULT 0,

    -- Conditions
    min_level INTEGER DEFAULT 1,
    required_subscription VARCHAR(30), -- NULL = tous

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure legacy tables have new columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'token_sources'
          AND column_name = 'premium_multiplier'
    ) THEN
        ALTER TABLE public.token_sources ADD COLUMN premium_multiplier DECIMAL(3,2) DEFAULT 1.00;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'token_sources'
          AND column_name = 'cooldown_minutes'
    ) THEN
        ALTER TABLE public.token_sources ADD COLUMN cooldown_minutes INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'token_sources'
          AND column_name = 'min_level'
    ) THEN
        ALTER TABLE public.token_sources ADD COLUMN min_level INTEGER DEFAULT 1;
    END IF;
END $$;

-- Sources de tokens
INSERT INTO token_sources (code, name, description, base_amount, daily_limit, premium_multiplier, cooldown_minutes, min_level)
VALUES
    ('daily_login', 'Connexion quotidienne', 'Bonus de connexion journalier', 10, 1, 2.0, 1440, 1),
    ('streak_bonus', 'Bonus série', 'Bonus pour maintenir une série', 5, 1, 2.0, 1440, 1),
    ('challenge_complete', 'Défi complété', 'Récompense pour compléter un défi', 25, 10, 1.5, 0, 1),
    ('achievement_unlock', 'Badge débloqué', 'Récompense pour un nouveau badge', 50, NULL, 1.5, 0, 1),
    ('level_up', 'Montée de niveau', 'Bonus par niveau gagné', 100, NULL, 2.0, 0, 1),
    ('creation_shared', 'Création partagée', 'Partager une création', 15, 5, 1.5, 60, 3),
    ('post_liked', 'Post aimé', 'Quand ton post reçoit un like', 2, 50, 1.0, 0, 1),
    ('comment_received', 'Commentaire reçu', 'Quand ton post reçoit un commentaire', 3, 30, 1.0, 0, 1),
    ('friend_referral', 'Parrainage ami', 'Quand un ami rejoint via ton lien', 200, 5, 2.0, 0, 5),
    ('event_participation', 'Participation event', 'Participer à un événement', 75, 3, 1.5, 0, 1),
    ('quiz_correct', 'Quiz réussi', 'Bonne réponse au quiz', 5, 20, 1.0, 0, 1),
    ('homework_help', 'Aide devoir', 'Aider un ami avec ses devoirs', 30, 5, 1.5, 30, 5),
    ('sport_activity', 'Activité sportive', 'Compléter une activité sportive', 20, 5, 1.5, 0, 1),
    ('weekly_bonus', 'Bonus hebdomadaire', 'Bonus de connexion 7 jours', 100, NULL, 2.0, 10080, 1),
    ('monthly_bonus', 'Bonus mensuel', 'Bonus de connexion 30 jours', 500, NULL, 2.0, 43200, 1)
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- PARTIE 4: TABLE TOKEN_TRANSACTIONS (Historique)
-- =============================================

CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teen_id UUID NOT NULL,

    -- Type de transaction
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
        'earn',         -- Gagné via activité
        'spend',        -- Dépensé en boutique
        'transfer_in',  -- Reçu d'un autre utilisateur
        'transfer_out', -- Envoyé à un autre utilisateur
        'exchange',     -- Échangé (conversion type)
        'purchase',     -- Acheté (real money)
        'bonus',        -- Bonus système
        'refund',       -- Remboursement
        'expire'        -- Expiration tokens saisonniers
    )),

    -- Montant et type
    token_type VARCHAR(50) DEFAULT 'regular',
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,

    -- Source
    source_code VARCHAR(50),
    source_id UUID,
    description TEXT,

    -- Multiplicateur appliqué
    multiplier_applied DECIMAL(3,2) DEFAULT 1.00,

    -- Référence autre utilisateur (pour transferts)
    related_user_id UUID,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_transactions_teen ON token_transactions(teen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_token_transactions_source ON token_transactions(source_code);

-- =============================================
-- PARTIE 5: TABLE TOKEN_LIMITS_TRACKING
-- =============================================

CREATE TABLE IF NOT EXISTS token_limits_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teen_id UUID NOT NULL,
    source_code VARCHAR(50) NOT NULL,

    -- Compteurs
    daily_count INTEGER DEFAULT 0,
    weekly_count INTEGER DEFAULT 0,
    monthly_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,

    -- Dernière utilisation
    last_used_at TIMESTAMPTZ,

    -- Reset dates
    daily_reset_at DATE DEFAULT CURRENT_DATE,
    weekly_reset_at DATE DEFAULT date_trunc('week', CURRENT_DATE)::DATE,
    monthly_reset_at DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,

    UNIQUE(teen_id, source_code)
);

-- =============================================
-- PARTIE 6: TABLE TOKEN_REWARDS (Récompenses échangeables)
-- =============================================

CREATE TABLE IF NOT EXISTS token_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(200) NOT NULL,
    name_ar VARCHAR(200),
    description TEXT,
    image_url TEXT,
    icon VARCHAR(50) DEFAULT 'gift',

    -- Coût
    token_cost INTEGER NOT NULL,
    token_type VARCHAR(50) DEFAULT 'regular',

    -- Catégorie
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'digital',      -- Items numériques (avatars, thèmes)
        'physical',     -- Goodies physiques
        'experience',   -- Expériences
        'discount',     -- Réductions
        'premium',      -- Accès premium
        'donation',     -- Don à une cause
        'raffle'        -- Participation tirage
    )),

    -- Stock
    stock_type VARCHAR(20) DEFAULT 'unlimited' CHECK (stock_type IN ('unlimited', 'limited', 'unique')),
    stock_quantity INTEGER,
    stock_remaining INTEGER,

    -- Restrictions
    min_level INTEGER DEFAULT 1,
    premium_only BOOLEAN DEFAULT false,
    max_per_user INTEGER, -- NULL = illimité

    -- Disponibilité
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Livraison (pour physiques)
    requires_shipping BOOLEAN DEFAULT false,
    shipping_zones TEXT[], -- ['MA', 'FR', 'ES']

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_rewards_category ON token_rewards(category, is_active);
CREATE INDEX IF NOT EXISTS idx_token_rewards_featured ON token_rewards(is_featured) WHERE is_active = true;

-- =============================================
-- PARTIE 7: TABLE TOKEN_REDEMPTIONS (Échanges)
-- =============================================

CREATE TABLE IF NOT EXISTS token_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teen_id UUID NOT NULL,
    reward_id UUID NOT NULL REFERENCES token_rewards(id),

    -- Coût payé
    tokens_spent INTEGER NOT NULL,
    token_type VARCHAR(50),

    -- Statut
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- En attente de traitement
        'processing',   -- En cours
        'shipped',      -- Expédié (physique)
        'completed',    -- Terminé
        'cancelled',    -- Annulé
        'refunded'      -- Remboursé
    )),

    -- Livraison (si applicable)
    shipping_address JSONB,
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    -- Code/Voucher (si numérique)
    redemption_code VARCHAR(100),
    expires_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_token_redemptions_teen ON token_redemptions(teen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_redemptions_status ON token_redemptions(status);

-- =============================================
-- PARTIE 8: TABLE TOKEN_TRANSFERS (Transferts)
-- =============================================

CREATE TABLE IF NOT EXISTS token_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sender_id UUID NOT NULL,
    receiver_id UUID NOT NULL,

    -- Montant
    token_type VARCHAR(50) DEFAULT 'regular',
    amount INTEGER NOT NULL,

    -- Message optionnel
    message TEXT,

    -- Statut
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN (
        'pending', 'completed', 'cancelled', 'refunded'
    )),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT different_users CHECK (sender_id != receiver_id)
);

CREATE INDEX idx_token_transfers_sender ON token_transfers(sender_id, created_at DESC);
CREATE INDEX idx_token_transfers_receiver ON token_transfers(receiver_id, created_at DESC);

-- =============================================
-- PARTIE 9: TABLE DAILY_BONUSES
-- =============================================

CREATE TABLE IF NOT EXISTS daily_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teen_id UUID NOT NULL UNIQUE,

    -- Streak de connexion
    login_streak INTEGER DEFAULT 0,
    last_login_date DATE,

    -- Bonus collectés ce mois
    monthly_bonuses_claimed INTEGER DEFAULT 0,
    monthly_reset_at DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,

    -- Roue de la fortune (1 spin gratuit/jour)
    last_free_spin DATE,
    paid_spins_today INTEGER DEFAULT 0,

    -- Bonus hebdo collecté
    weekly_bonus_claimed_at DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PARTIE 10: FONCTIONS
-- =============================================

-- Fonction pour ajouter des tokens (intégrée avec existant)
CREATE OR REPLACE FUNCTION add_tokens_to_user(
    p_teen_id UUID,
    p_amount INTEGER,
    p_source_code VARCHAR(50),
    p_token_type VARCHAR(50) DEFAULT 'regular',
    p_source_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_force_no_limit BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_source token_sources%ROWTYPE;
    v_tracking token_limits_tracking%ROWTYPE;
    v_user_coins user_coins%ROWTYPE;
    v_final_amount INTEGER;
    v_multiplier DECIMAL(3,2) := 1.00;
    v_is_premium BOOLEAN := false;
    v_new_balance INTEGER;
    v_limit_reached BOOLEAN := false;
BEGIN
    -- Vérifier si source existe
    SELECT * INTO v_source FROM token_sources WHERE code = p_source_code AND is_active = true;

    -- Récupérer/créer user_coins
    INSERT INTO user_coins (teen_id, balance, premium_tokens, seasonal_tokens)
    VALUES (p_teen_id, 0, 0, 0)
    ON CONFLICT (teen_id) DO NOTHING;

    SELECT * INTO v_user_coins FROM user_coins WHERE teen_id = p_teen_id;

    -- Vérifier si premium (via user_subscriptions)
    SELECT EXISTS(
        SELECT 1 FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = p_teen_id
        AND us.status IN ('active', 'trial')
        AND sp.plan_type != 'free'
    ) INTO v_is_premium;

    -- Calculer multiplicateur
    v_multiplier := COALESCE(v_user_coins.token_multiplier, 1.00);
    IF v_is_premium AND v_source.premium_multiplier IS NOT NULL THEN
        v_multiplier := v_multiplier * v_source.premium_multiplier;
    END IF;

    -- Vérifier les limites (sauf si forcé)
    IF v_source.id IS NOT NULL AND NOT p_force_no_limit THEN
        -- Récupérer/créer tracking
        INSERT INTO token_limits_tracking (teen_id, source_code)
        VALUES (p_teen_id, p_source_code)
        ON CONFLICT (teen_id, source_code) DO UPDATE SET
            daily_count = CASE
                WHEN token_limits_tracking.daily_reset_at < CURRENT_DATE THEN 0
                ELSE token_limits_tracking.daily_count
            END,
            daily_reset_at = CURRENT_DATE,
            weekly_count = CASE
                WHEN token_limits_tracking.weekly_reset_at < date_trunc('week', CURRENT_DATE)::DATE THEN 0
                ELSE token_limits_tracking.weekly_count
            END,
            weekly_reset_at = date_trunc('week', CURRENT_DATE)::DATE,
            monthly_count = CASE
                WHEN token_limits_tracking.monthly_reset_at < date_trunc('month', CURRENT_DATE)::DATE THEN 0
                ELSE token_limits_tracking.monthly_count
            END,
            monthly_reset_at = date_trunc('month', CURRENT_DATE)::DATE;

        SELECT * INTO v_tracking FROM token_limits_tracking
        WHERE teen_id = p_teen_id AND source_code = p_source_code;

        -- Vérifier limites
        IF v_source.daily_limit IS NOT NULL AND v_tracking.daily_count >= v_source.daily_limit THEN
            v_limit_reached := true;
        END IF;
        IF v_source.weekly_limit IS NOT NULL AND v_tracking.weekly_count >= v_source.weekly_limit THEN
            v_limit_reached := true;
        END IF;
        IF v_source.monthly_limit IS NOT NULL AND v_tracking.monthly_count >= v_source.monthly_limit THEN
            v_limit_reached := true;
        END IF;

        -- Vérifier cooldown
        IF v_source.cooldown_minutes > 0 AND v_tracking.last_used_at IS NOT NULL THEN
            IF v_tracking.last_used_at + (v_source.cooldown_minutes || ' minutes')::INTERVAL > NOW() THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'cooldown_active',
                    'cooldown_remaining', EXTRACT(EPOCH FROM (v_tracking.last_used_at + (v_source.cooldown_minutes || ' minutes')::INTERVAL - NOW()))::INTEGER
                );
            END IF;
        END IF;

        IF v_limit_reached THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'limit_reached',
                'daily_count', v_tracking.daily_count,
                'daily_limit', v_source.daily_limit
            );
        END IF;
    END IF;

    -- Calculer montant final
    v_final_amount := FLOOR(COALESCE(
        CASE WHEN v_source.id IS NOT NULL THEN v_source.base_amount ELSE p_amount END,
        p_amount
    ) * v_multiplier);

    -- Mettre à jour le solde selon le type
    CASE p_token_type
        WHEN 'premium' THEN
            UPDATE user_coins SET
                premium_tokens = premium_tokens + v_final_amount,
                total_lifetime_tokens = total_lifetime_tokens + v_final_amount,
                updated_at = NOW()
            WHERE teen_id = p_teen_id
            RETURNING premium_tokens INTO v_new_balance;

        WHEN 'seasonal' THEN
            UPDATE user_coins SET
                seasonal_tokens = seasonal_tokens + v_final_amount,
                total_lifetime_tokens = total_lifetime_tokens + v_final_amount,
                updated_at = NOW()
            WHERE teen_id = p_teen_id
            RETURNING seasonal_tokens INTO v_new_balance;

        ELSE -- regular
            UPDATE user_coins SET
                balance = balance + v_final_amount,
                lifetime_earned = lifetime_earned + v_final_amount,
                total_lifetime_tokens = total_lifetime_tokens + v_final_amount,
                updated_at = NOW()
            WHERE teen_id = p_teen_id
            RETURNING balance INTO v_new_balance;
    END CASE;

    -- Enregistrer la transaction
    INSERT INTO token_transactions (
        teen_id, transaction_type, token_type, amount, balance_after,
        source_code, source_id, description, multiplier_applied
    )
    VALUES (
        p_teen_id, 'earn', p_token_type, v_final_amount, v_new_balance,
        p_source_code, p_source_id, p_description, v_multiplier
    );

    -- Mettre à jour le tracking
    IF v_source.id IS NOT NULL THEN
        UPDATE token_limits_tracking SET
            daily_count = daily_count + 1,
            weekly_count = weekly_count + 1,
            monthly_count = monthly_count + 1,
            total_count = total_count + 1,
            last_used_at = NOW()
        WHERE teen_id = p_teen_id AND source_code = p_source_code;
    END IF;

    -- Aussi ajouter à coin_transactions pour compatibilité
    INSERT INTO coin_transactions (
        teen_id, amount, transaction_type, source_type, source_id, description, balance_after
    )
    VALUES (
        p_teen_id, v_final_amount, 'earn', p_source_code, p_source_id, p_description, v_new_balance
    );

    RETURN jsonb_build_object(
        'success', true,
        'tokens_earned', v_final_amount,
        'multiplier', v_multiplier,
        'token_type', p_token_type,
        'new_balance', v_new_balance,
        'is_premium', v_is_premium
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour dépenser des tokens
CREATE OR REPLACE FUNCTION spend_tokens(
    p_teen_id UUID,
    p_amount INTEGER,
    p_token_type VARCHAR(50) DEFAULT 'regular',
    p_reason TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Récupérer le solde actuel
    SELECT
        CASE p_token_type
            WHEN 'premium' THEN premium_tokens
            WHEN 'seasonal' THEN seasonal_tokens
            ELSE balance
        END INTO v_current_balance
    FROM user_coins WHERE teen_id = p_teen_id;

    IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'insufficient_balance',
            'current_balance', COALESCE(v_current_balance, 0),
            'required', p_amount
        );
    END IF;

    -- Déduire les tokens
    CASE p_token_type
        WHEN 'premium' THEN
            UPDATE user_coins SET
                premium_tokens = premium_tokens - p_amount,
                lifetime_spent = lifetime_spent + p_amount,
                updated_at = NOW()
            WHERE teen_id = p_teen_id
            RETURNING premium_tokens INTO v_new_balance;

        WHEN 'seasonal' THEN
            UPDATE user_coins SET
                seasonal_tokens = seasonal_tokens - p_amount,
                lifetime_spent = lifetime_spent + p_amount,
                updated_at = NOW()
            WHERE teen_id = p_teen_id
            RETURNING seasonal_tokens INTO v_new_balance;

        ELSE
            UPDATE user_coins SET
                balance = balance - p_amount,
                lifetime_spent = lifetime_spent + p_amount,
                updated_at = NOW()
            WHERE teen_id = p_teen_id
            RETURNING balance INTO v_new_balance;
    END CASE;

    -- Enregistrer la transaction
    INSERT INTO token_transactions (
        teen_id, transaction_type, token_type, amount, balance_after,
        source_id, description
    )
    VALUES (
        p_teen_id, 'spend', p_token_type, -p_amount, v_new_balance,
        p_reference_id, p_reason
    );

    RETURN jsonb_build_object(
        'success', true,
        'tokens_spent', p_amount,
        'token_type', p_token_type,
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour transférer des tokens
CREATE OR REPLACE FUNCTION transfer_tokens(
    p_sender_id UUID,
    p_receiver_id UUID,
    p_amount INTEGER,
    p_token_type VARCHAR(50) DEFAULT 'regular',
    p_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_sender_balance INTEGER;
    v_sender_new_balance INTEGER;
    v_receiver_new_balance INTEGER;
    v_transfer_id UUID;
    v_token_info token_types%ROWTYPE;
BEGIN
    -- Vérifier que le type est transférable
    SELECT * INTO v_token_info FROM token_types WHERE code = p_token_type;
    IF NOT v_token_info.is_tradeable THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'token_not_tradeable'
        );
    END IF;

    -- Vérifier le solde de l'envoyeur
    SELECT
        CASE p_token_type
            WHEN 'premium' THEN premium_tokens
            ELSE balance
        END INTO v_sender_balance
    FROM user_coins WHERE teen_id = p_sender_id;

    IF v_sender_balance IS NULL OR v_sender_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'insufficient_balance',
            'current_balance', COALESCE(v_sender_balance, 0)
        );
    END IF;

    -- Déduire du sender
    IF p_token_type = 'premium' THEN
        UPDATE user_coins SET premium_tokens = premium_tokens - p_amount
        WHERE teen_id = p_sender_id
        RETURNING premium_tokens INTO v_sender_new_balance;
    ELSE
        UPDATE user_coins SET balance = balance - p_amount
        WHERE teen_id = p_sender_id
        RETURNING balance INTO v_sender_new_balance;
    END IF;

    -- Ajouter au receiver
    INSERT INTO user_coins (teen_id, balance, premium_tokens)
    VALUES (p_receiver_id, 0, 0)
    ON CONFLICT (teen_id) DO NOTHING;

    IF p_token_type = 'premium' THEN
        UPDATE user_coins SET premium_tokens = premium_tokens + p_amount
        WHERE teen_id = p_receiver_id
        RETURNING premium_tokens INTO v_receiver_new_balance;
    ELSE
        UPDATE user_coins SET balance = balance + p_amount
        WHERE teen_id = p_receiver_id
        RETURNING balance INTO v_receiver_new_balance;
    END IF;

    -- Créer l'enregistrement de transfert
    INSERT INTO token_transfers (sender_id, receiver_id, token_type, amount, message)
    VALUES (p_sender_id, p_receiver_id, p_token_type, p_amount, p_message)
    RETURNING id INTO v_transfer_id;

    -- Transactions pour les deux utilisateurs
    INSERT INTO token_transactions (teen_id, transaction_type, token_type, amount, balance_after, related_user_id, description)
    VALUES
        (p_sender_id, 'transfer_out', p_token_type, -p_amount, v_sender_new_balance, p_receiver_id, p_message),
        (p_receiver_id, 'transfer_in', p_token_type, p_amount, v_receiver_new_balance, p_sender_id, p_message);

    RETURN jsonb_build_object(
        'success', true,
        'transfer_id', v_transfer_id,
        'amount', p_amount,
        'sender_new_balance', v_sender_new_balance,
        'receiver_new_balance', v_receiver_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour réclamer le bonus quotidien
CREATE OR REPLACE FUNCTION claim_daily_bonus(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_bonus daily_bonuses%ROWTYPE;
    v_tokens_earned INTEGER;
    v_streak_bonus INTEGER := 0;
    v_is_new_day BOOLEAN := false;
BEGIN
    -- Créer ou récupérer l'entrée
    INSERT INTO daily_bonuses (teen_id, last_login_date, login_streak)
    VALUES (p_teen_id, NULL, 0)
    ON CONFLICT (teen_id) DO NOTHING;

    SELECT * INTO v_bonus FROM daily_bonuses WHERE teen_id = p_teen_id FOR UPDATE;

    -- Vérifier si déjà réclamé aujourd'hui
    IF v_bonus.last_login_date = CURRENT_DATE THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'already_claimed',
            'current_streak', v_bonus.login_streak
        );
    END IF;

    v_is_new_day := true;

    -- Calculer le streak
    IF v_bonus.last_login_date = CURRENT_DATE - 1 THEN
        -- Jour consécutif
        v_bonus.login_streak := v_bonus.login_streak + 1;
    ELSIF v_bonus.last_login_date IS NULL THEN
        -- Premier jour
        v_bonus.login_streak := 1;
    ELSE
        -- Streak cassé
        v_bonus.login_streak := 1;
    END IF;

    -- Calculer le bonus de streak (bonus tous les 7 jours)
    IF v_bonus.login_streak % 7 = 0 THEN
        v_streak_bonus := v_bonus.login_streak * 10; -- 70 tokens au jour 7, 140 au jour 14, etc.
    END IF;

    -- Mettre à jour
    UPDATE daily_bonuses SET
        last_login_date = CURRENT_DATE,
        login_streak = v_bonus.login_streak,
        updated_at = NOW()
    WHERE teen_id = p_teen_id;

    -- Donner les tokens du bonus quotidien
    PERFORM add_tokens_to_user(p_teen_id, 10, 'daily_login', 'regular', NULL, 'Bonus de connexion quotidien');

    -- Donner le bonus de streak si applicable
    IF v_streak_bonus > 0 THEN
        PERFORM add_tokens_to_user(p_teen_id, v_streak_bonus, 'streak_bonus', 'regular', NULL,
            'Bonus série de ' || v_bonus.login_streak || ' jours');
    END IF;

    -- Mettre à jour le streak dans user_streaks aussi
    PERFORM update_user_streak(p_teen_id);

    RETURN jsonb_build_object(
        'success', true,
        'tokens_earned', 10 + v_streak_bonus,
        'current_streak', v_bonus.login_streak,
        'streak_bonus', v_streak_bonus,
        'next_streak_bonus_at', 7 - (v_bonus.login_streak % 7)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir le wallet complet
CREATE OR REPLACE FUNCTION get_user_wallet(p_teen_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_coins user_coins%ROWTYPE;
    v_daily daily_bonuses%ROWTYPE;
    v_recent_transactions JSONB;
BEGIN
    SELECT * INTO v_coins FROM user_coins WHERE teen_id = p_teen_id;
    SELECT * INTO v_daily FROM daily_bonuses WHERE teen_id = p_teen_id;

    -- Transactions récentes
    SELECT jsonb_agg(t) INTO v_recent_transactions
    FROM (
        SELECT transaction_type, token_type, amount, description, created_at
        FROM token_transactions
        WHERE teen_id = p_teen_id
        ORDER BY created_at DESC
        LIMIT 10
    ) t;

    RETURN jsonb_build_object(
        'balances', jsonb_build_object(
            'regular', COALESCE(v_coins.balance, 0),
            'premium', COALESCE(v_coins.premium_tokens, 0),
            'seasonal', COALESCE(v_coins.seasonal_tokens, 0),
            'total', COALESCE(v_coins.balance, 0) + COALESCE(v_coins.premium_tokens, 0) * 5 + COALESCE(v_coins.seasonal_tokens, 0) * 2
        ),
        'stats', jsonb_build_object(
            'lifetime_earned', COALESCE(v_coins.lifetime_earned, 0),
            'lifetime_spent', COALESCE(v_coins.lifetime_spent, 0),
            'total_lifetime', COALESCE(v_coins.total_lifetime_tokens, 0),
            'multiplier', COALESCE(v_coins.token_multiplier, 1.00)
        ),
        'daily', jsonb_build_object(
            'streak', COALESCE(v_daily.login_streak, 0),
            'claimed_today', v_daily.last_login_date = CURRENT_DATE,
            'last_claim', v_daily.last_login_date
        ),
        'recent_transactions', COALESCE(v_recent_transactions, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- PARTIE 11: DONNÉES INITIALES REWARDS
-- =============================================

INSERT INTO token_rewards (name, description, token_cost, token_type, category, stock_type, icon, is_featured)
VALUES
    -- Digital
    ('Avatar Premium', 'Avatar exclusif animé', 500, 'regular', 'digital', 'unlimited', 'user-circle', false),
    ('Thème Néon', 'Thème de profil néon', 750, 'regular', 'digital', 'unlimited', 'palette', false),
    ('Badge Vérifié', 'Badge de vérification', 2000, 'regular', 'digital', 'unique', 'badge-check', true),
    ('Cadre Doré', 'Cadre doré pour avatar', 1000, 'regular', 'digital', 'unlimited', 'frame', false),

    -- Premium
    ('1 Semaine Pro', 'Abonnement Pro 7 jours', 1500, 'regular', 'premium', 'unlimited', 'crown', true),
    ('Boost XP 24h', 'Double XP pendant 24h', 300, 'regular', 'premium', 'unlimited', 'zap', false),

    -- Physical
    ('Stickers Pack', 'Pack de 10 stickers TeensParty', 800, 'regular', 'physical', 'limited', 'sticker', false),
    ('T-Shirt Exclusif', 'T-shirt officiel TeensParty', 5000, 'premium', 'physical', 'limited', 'shirt', true),

    -- Experience
    ('Meet & Greet', 'Rencontre exclusive', 10000, 'premium', 'experience', 'limited', 'handshake', true),

    -- Raffle
    ('Ticket Tombola', 'Participation au tirage mensuel', 100, 'regular', 'raffle', 'unlimited', 'ticket', false),

    -- Donation
    ('Don Solidaire', 'Don à une association', 500, 'regular', 'donation', 'unlimited', 'heart', false)
ON CONFLICT DO NOTHING;

-- =============================================
-- PARTIE 12: RLS POLICIES
-- =============================================

ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_limits_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_bonuses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own token transactions" ON token_transactions
    FOR SELECT USING (teen_id = auth.uid() OR EXISTS (
        SELECT 1 FROM teens WHERE id = token_transactions.teen_id AND parent_id = auth.uid()
    ));

CREATE POLICY "Users can view own limits" ON token_limits_tracking
    FOR SELECT USING (teen_id = auth.uid() OR EXISTS (
        SELECT 1 FROM teens WHERE id = token_limits_tracking.teen_id AND parent_id = auth.uid()
    ));

CREATE POLICY "Users can view own redemptions" ON token_redemptions
    FOR SELECT USING (teen_id = auth.uid() OR EXISTS (
        SELECT 1 FROM teens WHERE id = token_redemptions.teen_id AND parent_id = auth.uid()
    ));

CREATE POLICY "Users can view own transfers" ON token_transfers
    FOR SELECT USING (
        sender_id = auth.uid() OR receiver_id = auth.uid()
        OR EXISTS (SELECT 1 FROM teens WHERE id IN (sender_id, receiver_id) AND parent_id = auth.uid())
    );

CREATE POLICY "Users can view own daily bonus" ON daily_bonuses
    FOR SELECT USING (teen_id = auth.uid() OR EXISTS (
        SELECT 1 FROM teens WHERE id = daily_bonuses.teen_id AND parent_id = auth.uid()
    ));

-- Public read pour token_types et token_rewards
ALTER TABLE token_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view token types" ON token_types FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view token rewards" ON token_rewards FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view token sources" ON token_sources FOR SELECT USING (is_active = true);

-- =============================================
-- PARTIE 13: TRIGGER PREMIUM MULTIPLIER
-- =============================================

-- Mettre à jour le multiplicateur quand l'abonnement change
CREATE OR REPLACE FUNCTION update_token_multiplier_from_subscription()
RETURNS TRIGGER AS $$
DECLARE
    v_multiplier DECIMAL(3,2) := 1.00;
    v_features JSONB;
BEGIN
    -- Récupérer le multiplicateur du plan
    SELECT sp.features INTO v_features
    FROM subscription_plans sp
    WHERE sp.id = NEW.plan_id;

    IF v_features ? 'xp_multiplier' THEN
        v_multiplier := (v_features->>'xp_multiplier')::DECIMAL(3,2);
    END IF;

    -- Mettre à jour user_coins
    UPDATE user_coins SET
        token_multiplier = v_multiplier,
        updated_at = NOW()
    WHERE teen_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_token_multiplier ON user_subscriptions;
CREATE TRIGGER trigger_update_token_multiplier
    AFTER INSERT OR UPDATE ON user_subscriptions
    FOR EACH ROW
    WHEN (NEW.status IN ('active', 'trial'))
    EXECUTE FUNCTION update_token_multiplier_from_subscription();
