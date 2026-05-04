-- =============================================
-- MIGRATION 027: Premium Subscription System
-- =============================================
-- Systeme d'abonnements premium avec paiement hybride
-- Adapte au marche marocain (cash, vouchers, online)
-- =============================================

-- Table des forfaits disponibles
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identification
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100), -- Nom en arabe
    description TEXT,
    description_ar TEXT,

    -- Type de forfait
    plan_type VARCHAR(30) NOT NULL CHECK (plan_type IN (
        'free',         -- Gratuit avec limitations
        'starter',      -- Basique
        'pro',          -- Pro/Standard
        'elite',        -- Elite/Premium
        'family',       -- Familial (jusqu'a 5 membres)
        'school',       -- Scolaire (pour etablissements)
        'lifetime'      -- Acces a vie
    )),

    -- Tarification
    price_monthly DECIMAL(10,2) DEFAULT 0,
    price_quarterly DECIMAL(10,2) DEFAULT 0,
    price_yearly DECIMAL(10,2) DEFAULT 0,
    price_lifetime DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'MAD',

    -- Réductions
    discount_quarterly_percent INTEGER DEFAULT 0,
    discount_yearly_percent INTEGER DEFAULT 0,

    -- Limites et fonctionnalités
    features JSONB DEFAULT '{}'::jsonb,
    -- Exemple: {
    --   "max_circles": 10,
    --   "max_circle_members": 50,
    --   "daily_challenges": 10,
    --   "cloud_storage_mb": 1000,
    --   "ad_free": true,
    --   "priority_support": true,
    --   "exclusive_badges": true,
    --   "xp_multiplier": 1.5,
    --   "custom_themes": true,
    --   "analytics_dashboard": true
    -- }

    -- Visuel
    icon_url TEXT,
    color VARCHAR(20) DEFAULT '#00d4ff',
    badge_label VARCHAR(50), -- Ex: "POPULAIRE", "MEILLEUR RAPPORT"

    -- Configuration
    trial_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure legacy tables have new columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'code'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN code VARCHAR(50) UNIQUE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'name'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN name VARCHAR(100);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'name_ar'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN name_ar VARCHAR(100);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'description'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN plan_type VARCHAR(30);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'price_monthly'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN price_monthly DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'price_quarterly'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN price_quarterly DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'price_yearly'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN price_yearly DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'discount_quarterly_percent'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN discount_quarterly_percent INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'discount_yearly_percent'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN discount_yearly_percent INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'features'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN features JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'color'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN color VARCHAR(20) DEFAULT '#00d4ff';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'badge_label'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN badge_label VARCHAR(50);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'trial_days'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN trial_days INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'is_featured'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN is_featured BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'tier'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN tier VARCHAR(50);
    END IF;
    -- Ensure tier has a default to avoid NOT NULL violations on legacy schemas
    BEGIN
        ALTER TABLE public.subscription_plans ALTER COLUMN tier SET DEFAULT 'free';
    EXCEPTION WHEN undefined_column THEN
        -- no-op if column truly doesn't exist
        NULL;
    END;
    -- Avoid duplicate tier unique constraint if schema already enforces uniqueness
    UPDATE public.subscription_plans
      SET tier = 'free'::subscription_tier
    WHERE tier IS NULL
      AND NOT EXISTS (
          SELECT 1 FROM public.subscription_plans
          WHERE tier = 'free'::subscription_tier
      );
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'subscription_plans'
          AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE public.subscription_plans ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
END $$;

CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active, sort_order);

-- Table des abonnements utilisateurs
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL,

    -- Statut
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active',       -- Abonnement actif
        'trial',        -- Période d'essai
        'past_due',     -- Paiement en retard
        'cancelled',    -- Annulé (actif jusqu'à fin période)
        'expired',      -- Expiré
        'suspended',    -- Suspendu (problème paiement)
        'paused'        -- Mis en pause par l'utilisateur
    )),

    -- Période
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN (
        'monthly', 'quarterly', 'yearly', 'lifetime', 'trial'
    )),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,

    -- Paiement
    payment_method VARCHAR(30),
    last_payment_date TIMESTAMPTZ,
    next_payment_date TIMESTAMPTZ,
    amount_paid DECIMAL(10,2),

    -- Renouvellement
    auto_renew BOOLEAN DEFAULT true,
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Un seul abonnement actif par utilisateur
    CONSTRAINT unique_active_subscription UNIQUE (user_id, status)
        DEFERRABLE INITIALLY DEFERRED
);

-- Ensure plan_id type matches subscription_plans.id and add FK safely
DO $$
DECLARE
    v_plan_id_type TEXT;
BEGIN
    SELECT data_type
    INTO v_plan_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscription_plans'
      AND column_name = 'id';

    -- Drop FK if it exists (type mismatch scenarios)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'user_subscriptions'
          AND constraint_name = 'user_subscriptions_plan_id_fkey'
    ) THEN
        ALTER TABLE public.user_subscriptions DROP CONSTRAINT user_subscriptions_plan_id_fkey;
    END IF;

    IF v_plan_id_type = 'integer' THEN
        -- If existing values are UUIDs, integer cast will fail; null them before casting
        ALTER TABLE public.user_subscriptions ALTER COLUMN plan_id DROP DEFAULT;
        UPDATE public.user_subscriptions SET plan_id = NULL;
        ALTER TABLE public.user_subscriptions
            ALTER COLUMN plan_id TYPE INTEGER USING NULL;
        ALTER TABLE public.user_subscriptions
            ADD CONSTRAINT user_subscriptions_plan_id_fkey
            FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);
    ELSE
        -- Default to UUID
        ALTER TABLE public.user_subscriptions
            ALTER COLUMN plan_id TYPE UUID USING plan_id::uuid;
        ALTER TABLE public.user_subscriptions
            ADD CONSTRAINT user_subscriptions_plan_id_fkey
            FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);
    END IF;
END $$;

CREATE INDEX idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_expiry ON user_subscriptions(current_period_end)
    WHERE status IN ('active', 'trial');

-- Table des paiements
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL,

    -- Montant
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MAD',
    discount_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,

    -- Méthode de paiement
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN (
        'card',             -- Carte bancaire (CMI, etc.)
        'cash',             -- Espèces (point de vente)
        'voucher',          -- Code promo/voucher
        'mobile_money',     -- Paiement mobile (Orange Money, etc.)
        'bank_transfer',    -- Virement bancaire
        'paypal',           -- PayPal
        'crypto',           -- Crypto (optionnel)
        'parent_approval',  -- Approbation parentale
        'school'            -- Via établissement scolaire
    )),

    -- Statut
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'processing',
        'completed',
        'failed',
        'refunded',
        'cancelled'
    )),

    -- Référence paiement externe
    external_reference VARCHAR(100),
    gateway_response JSONB,

    -- Période couverte
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,

    -- Facture
    invoice_number VARCHAR(50),
    invoice_url TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_subscription_payments_user ON subscription_payments(user_id, created_at DESC);
CREATE INDEX idx_subscription_payments_status ON subscription_payments(status);

-- Table des codes promo/vouchers
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,

    -- Type de réduction
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN (
        'percentage',   -- Pourcentage
        'fixed',        -- Montant fixe
        'trial_days',   -- Jours d'essai gratuit
        'free_months'   -- Mois gratuits
    )),
    discount_value DECIMAL(10,2) NOT NULL,

    -- Applicabilité
    applicable_plans UUID[], -- NULL = tous les plans
    applicable_cycles VARCHAR(20)[], -- NULL = tous les cycles

    -- Limites
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    max_uses_per_user INTEGER DEFAULT 1,

    -- Validité
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    -- Parrain (si code de parrainage)
    referrer_id UUID REFERENCES auth.users(id),
    referrer_reward_xp INTEGER DEFAULT 0,
    referrer_reward_tokens INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure legacy tables have new columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'promo_codes'
          AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.promo_codes ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code) WHERE is_active = true;

-- Table d'utilisation des codes promo
CREATE TABLE IF NOT EXISTS promo_code_uses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    payment_id UUID REFERENCES subscription_payments(id),

    discount_applied DECIMAL(10,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(promo_code_id, user_id)
);

-- Table des fonctionnalités premium
CREATE TABLE IF NOT EXISTS premium_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Catégorie
    category VARCHAR(30) CHECK (category IN (
        'social',       -- Fonctionnalités sociales
        'content',      -- Contenu exclusif
        'customization',-- Personnalisation
        'analytics',    -- Statistiques avancées
        'support',      -- Support prioritaire
        'rewards',      -- Récompenses bonus
        'storage',      -- Stockage cloud
        'ads'           -- Sans publicités
    )),

    -- Valeur par défaut pour gratuit
    free_limit INTEGER DEFAULT 0,

    -- Icône/visuel
    icon VARCHAR(50),

    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table de liaison features-plans
CREATE TABLE IF NOT EXISTS plan_features (
    plan_id UUID NOT NULL,
    feature_id UUID NOT NULL REFERENCES premium_features(id) ON DELETE CASCADE,

    -- Valeur pour ce plan (NULL = illimité)
    limit_value INTEGER,
    is_enabled BOOLEAN DEFAULT true,

    PRIMARY KEY (plan_id, feature_id)
);

-- Table des demandes de paiement cash/parent
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL,

    -- Type de demande
    request_type VARCHAR(30) NOT NULL CHECK (request_type IN (
        'cash_payment',     -- Paiement en espèces
        'parent_approval',  -- Demande aux parents
        'school_payment',   -- Via école
        'gift'              -- Cadeau/don
    )),

    -- Montant
    amount DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,

    -- Statut
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'rejected',
        'expired',
        'completed'
    )),

    -- Approbateur (parent/admin)
    approver_email VARCHAR(255),
    approver_phone VARCHAR(20),
    approval_token VARCHAR(100),
    approved_by UUID,
    approved_at TIMESTAMPTZ,

    -- Point de vente (pour cash)
    pos_location VARCHAR(255),
    pos_reference VARCHAR(100),

    -- Expiration
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure plan_id type matches subscription_plans.id for dependent tables and add FKs safely
DO $$
DECLARE
    v_plan_id_type TEXT;
    v_nulls INTEGER;
BEGIN
    SELECT data_type
    INTO v_plan_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscription_plans'
      AND column_name = 'id';

    -- subscription_payments.plan_id
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'subscription_payments'
          AND constraint_name = 'subscription_payments_plan_id_fkey'
    ) THEN
        ALTER TABLE public.subscription_payments DROP CONSTRAINT subscription_payments_plan_id_fkey;
    END IF;

    IF v_plan_id_type = 'integer' THEN
        ALTER TABLE public.subscription_payments ALTER COLUMN plan_id DROP NOT NULL;
        ALTER TABLE public.subscription_payments ALTER COLUMN plan_id TYPE INTEGER USING NULL;
        SELECT COUNT(*) INTO v_nulls FROM public.subscription_payments WHERE plan_id IS NULL;
        IF v_nulls = 0 THEN
            ALTER TABLE public.subscription_payments ALTER COLUMN plan_id SET NOT NULL;
        END IF;
    ELSE
        ALTER TABLE public.subscription_payments ALTER COLUMN plan_id TYPE UUID USING plan_id::uuid;
    END IF;
    ALTER TABLE public.subscription_payments
        ADD CONSTRAINT subscription_payments_plan_id_fkey
        FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);

    -- plan_features.plan_id
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'plan_features'
          AND constraint_name = 'plan_features_plan_id_fkey'
    ) THEN
        ALTER TABLE public.plan_features DROP CONSTRAINT plan_features_plan_id_fkey;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'plan_features'
          AND constraint_name = 'plan_features_pkey'
    ) THEN
        ALTER TABLE public.plan_features DROP CONSTRAINT plan_features_pkey;
    END IF;

    IF v_plan_id_type = 'integer' THEN
        ALTER TABLE public.plan_features ALTER COLUMN plan_id DROP NOT NULL;
        ALTER TABLE public.plan_features ALTER COLUMN plan_id TYPE INTEGER USING NULL;
        SELECT COUNT(*) INTO v_nulls FROM public.plan_features WHERE plan_id IS NULL;
        IF v_nulls = 0 THEN
            ALTER TABLE public.plan_features ALTER COLUMN plan_id SET NOT NULL;
        END IF;
    ELSE
        ALTER TABLE public.plan_features ALTER COLUMN plan_id TYPE UUID USING plan_id::uuid;
    END IF;

    -- Recreate PK and FK for plan_features
    ALTER TABLE public.plan_features
        ADD CONSTRAINT plan_features_pkey PRIMARY KEY (plan_id, feature_id);
    ALTER TABLE public.plan_features
        ADD CONSTRAINT plan_features_plan_id_fkey
        FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;

    -- payment_requests.plan_id
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'payment_requests'
          AND constraint_name = 'payment_requests_plan_id_fkey'
    ) THEN
        ALTER TABLE public.payment_requests DROP CONSTRAINT payment_requests_plan_id_fkey;
    END IF;

    IF v_plan_id_type = 'integer' THEN
        ALTER TABLE public.payment_requests ALTER COLUMN plan_id DROP NOT NULL;
        ALTER TABLE public.payment_requests ALTER COLUMN plan_id TYPE INTEGER USING NULL;
        SELECT COUNT(*) INTO v_nulls FROM public.payment_requests WHERE plan_id IS NULL;
        IF v_nulls = 0 THEN
            ALTER TABLE public.payment_requests ALTER COLUMN plan_id SET NOT NULL;
        END IF;
    ELSE
        ALTER TABLE public.payment_requests ALTER COLUMN plan_id TYPE UUID USING plan_id::uuid;
    END IF;

    ALTER TABLE public.payment_requests
        ADD CONSTRAINT payment_requests_plan_id_fkey
        FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id);
END $$;

CREATE INDEX idx_payment_requests_user ON payment_requests(user_id, status);
CREATE INDEX idx_payment_requests_token ON payment_requests(approval_token)
    WHERE status = 'pending';

-- Table des abonnements familiaux
CREATE TABLE IF NOT EXISTS family_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,

    -- Propriétaire de la famille
    owner_id UUID NOT NULL REFERENCES auth.users(id),

    -- Configuration
    max_members INTEGER DEFAULT 5,
    family_name VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membres de la famille
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES family_subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Rôle
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),

    -- Invitation
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,

    -- Statut
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'active', 'removed'
    )),

    UNIQUE(family_id, user_id)
);

-- =============================================
-- FONCTIONS
-- =============================================

-- Fonction pour vérifier si un utilisateur a un abonnement actif
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_subscriptions
        WHERE user_id = p_user_id
        AND status IN ('active', 'trial')
        AND (current_period_end IS NULL OR current_period_end > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir le plan actuel d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    plan_id UUID,
    plan_code VARCHAR,
    plan_name VARCHAR,
    plan_type VARCHAR,
    status VARCHAR,
    current_period_end TIMESTAMPTZ,
    features JSONB,
    is_family_member BOOLEAN
) AS $$
BEGIN
    -- Vérifier d'abord un abonnement direct
    RETURN QUERY
    SELECT
        us.id as subscription_id,
        sp.id as plan_id,
        sp.code::VARCHAR as plan_code,
        sp.name::VARCHAR as plan_name,
        sp.plan_type::VARCHAR,
        us.status::VARCHAR,
        us.current_period_end,
        sp.features,
        false as is_family_member
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trial')
    AND (us.current_period_end IS NULL OR us.current_period_end > NOW())
    LIMIT 1;

    -- Si pas d'abonnement direct, vérifier famille
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            us.id as subscription_id,
            sp.id as plan_id,
            sp.code::VARCHAR as plan_code,
            sp.name::VARCHAR as plan_name,
            sp.plan_type::VARCHAR,
            us.status::VARCHAR,
            us.current_period_end,
            sp.features,
            true as is_family_member
        FROM family_members fm
        JOIN family_subscriptions fs ON fm.family_id = fs.id
        JOIN user_subscriptions us ON fs.subscription_id = us.id
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE fm.user_id = p_user_id
        AND fm.status = 'active'
        AND us.status IN ('active', 'trial')
        AND (us.current_period_end IS NULL OR us.current_period_end > NOW())
        LIMIT 1;
    END IF;

    -- Si toujours pas trouvé, retourner le plan gratuit
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            NULL::UUID as subscription_id,
            sp.id as plan_id,
            sp.code::VARCHAR as plan_code,
            sp.name::VARCHAR as plan_name,
            sp.plan_type::VARCHAR,
            'active'::VARCHAR as status,
            NULL::TIMESTAMPTZ as current_period_end,
            sp.features,
            false as is_family_member
        FROM subscription_plans sp
        WHERE sp.plan_type = 'free'
        AND sp.is_active = true
        LIMIT 1;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour créer un abonnement
CREATE OR REPLACE FUNCTION create_subscription(
    p_user_id UUID,
    p_plan_id UUID,
    p_billing_cycle VARCHAR,
    p_payment_method VARCHAR,
    p_promo_code VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_plan subscription_plans%ROWTYPE;
    v_subscription_id UUID;
    v_amount DECIMAL(10,2);
    v_discount DECIMAL(10,2) := 0;
    v_promo promo_codes%ROWTYPE;
    v_period_end TIMESTAMPTZ;
    v_trial_end TIMESTAMPTZ;
BEGIN
    -- Récupérer le plan
    SELECT * INTO v_plan FROM subscription_plans WHERE id = p_plan_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Plan not found');
    END IF;

    -- Calculer le montant
    CASE p_billing_cycle
        WHEN 'monthly' THEN
            v_amount := v_plan.price_monthly;
            v_period_end := NOW() + INTERVAL '1 month';
        WHEN 'quarterly' THEN
            v_amount := v_plan.price_quarterly;
            v_period_end := NOW() + INTERVAL '3 months';
        WHEN 'yearly' THEN
            v_amount := v_plan.price_yearly;
            v_period_end := NOW() + INTERVAL '1 year';
        WHEN 'lifetime' THEN
            v_amount := v_plan.price_lifetime;
            v_period_end := NULL;
        WHEN 'trial' THEN
            v_amount := 0;
            v_period_end := NOW() + (v_plan.trial_days || ' days')::INTERVAL;
            v_trial_end := v_period_end;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Invalid billing cycle');
    END CASE;

    -- Appliquer le code promo si fourni
    IF p_promo_code IS NOT NULL THEN
        SELECT * INTO v_promo
        FROM promo_codes
        WHERE code = p_promo_code
        AND is_active = true
        AND (valid_until IS NULL OR valid_until > NOW())
        AND (max_uses IS NULL OR current_uses < max_uses);

        IF FOUND THEN
            -- Vérifier si déjà utilisé par cet utilisateur
            IF NOT EXISTS (SELECT 1 FROM promo_code_uses WHERE promo_code_id = v_promo.id AND user_id = p_user_id) THEN
                CASE v_promo.discount_type
                    WHEN 'percentage' THEN
                        v_discount := v_amount * (v_promo.discount_value / 100);
                    WHEN 'fixed' THEN
                        v_discount := LEAST(v_promo.discount_value, v_amount);
                    WHEN 'trial_days' THEN
                        v_trial_end := NOW() + (v_promo.discount_value || ' days')::INTERVAL;
                        v_period_end := v_trial_end;
                    WHEN 'free_months' THEN
                        v_period_end := v_period_end + (v_promo.discount_value || ' months')::INTERVAL;
                END CASE;

                -- Enregistrer l'utilisation
                INSERT INTO promo_code_uses (promo_code_id, user_id, discount_applied)
                VALUES (v_promo.id, p_user_id, v_discount);

                UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo.id;

                -- Récompenser le parrain si applicable
                IF v_promo.referrer_id IS NOT NULL THEN
                    UPDATE auth.users SET
                        xp = xp + v_promo.referrer_reward_xp
                    WHERE id = v_promo.referrer_id;
                END IF;
            END IF;
        END IF;
    END IF;

    -- Annuler les anciens abonnements actifs
    UPDATE user_subscriptions
    SET status = 'expired', updated_at = NOW()
    WHERE user_id = p_user_id AND status IN ('active', 'trial');

    -- Créer l'abonnement
    INSERT INTO user_subscriptions (
        user_id, plan_id, status, billing_cycle,
        current_period_start, current_period_end, trial_end,
        payment_method, amount_paid
    )
    VALUES (
        p_user_id, p_plan_id,
        CASE WHEN v_trial_end IS NOT NULL THEN 'trial' ELSE 'active' END,
        p_billing_cycle,
        NOW(), v_period_end, v_trial_end,
        p_payment_method, v_amount - v_discount
    )
    RETURNING id INTO v_subscription_id;

    -- Mettre à jour l'utilisateur
    UPDATE auth.users SET
        is_premium = true,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Notification
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        p_user_id,
        'subscription',
        'Bienvenue en Premium!',
        'Ton abonnement ' || v_plan.name || ' est maintenant actif.',
        jsonb_build_object('subscription_id', v_subscription_id, 'plan', v_plan.name)
    );

    RETURN jsonb_build_object(
        'success', true,
        'subscription_id', v_subscription_id,
        'amount', v_amount - v_discount,
        'discount', v_discount,
        'period_end', v_period_end,
        'is_trial', v_trial_end IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour annuler un abonnement
CREATE OR REPLACE FUNCTION cancel_subscription(
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_immediate BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_subscription user_subscriptions%ROWTYPE;
BEGIN
    SELECT * INTO v_subscription
    FROM user_subscriptions
    WHERE user_id = p_user_id AND status IN ('active', 'trial')
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active subscription');
    END IF;

    IF p_immediate THEN
        UPDATE user_subscriptions SET
            status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = p_reason,
            updated_at = NOW()
        WHERE id = v_subscription.id;

        UPDATE auth.users SET is_premium = false WHERE id = p_user_id;
    ELSE
        UPDATE user_subscriptions SET
            cancel_at_period_end = true,
            cancelled_at = NOW(),
            cancellation_reason = p_reason,
            auto_renew = false,
            updated_at = NOW()
        WHERE id = v_subscription.id;
    END IF;

    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
        p_user_id,
        'subscription',
        'Abonnement annulé',
        CASE WHEN p_immediate
            THEN 'Ton abonnement a été annulé immédiatement.'
            ELSE 'Ton abonnement sera actif jusqu''au ' || to_char(v_subscription.current_period_end, 'DD/MM/YYYY')
        END,
        jsonb_build_object('subscription_id', v_subscription.id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'effective_date', CASE WHEN p_immediate THEN NOW() ELSE v_subscription.current_period_end END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier l'accès à une fonctionnalité
CREATE OR REPLACE FUNCTION check_feature_access(
    p_user_id UUID,
    p_feature_code VARCHAR
)
RETURNS JSONB AS $$
DECLARE
    v_plan RECORD;
    v_feature premium_features%ROWTYPE;
    v_limit INTEGER;
BEGIN
    -- Récupérer le plan de l'utilisateur
    SELECT * INTO v_plan FROM get_user_plan(p_user_id);

    -- Récupérer la fonctionnalité
    SELECT * INTO v_feature FROM premium_features WHERE code = p_feature_code;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('has_access', false, 'error', 'Feature not found');
    END IF;

    -- Vérifier dans les features du plan
    IF v_plan.features ? p_feature_code THEN
        v_limit := (v_plan.features->>p_feature_code)::INTEGER;

        IF v_limit IS NULL OR v_limit = -1 THEN
            RETURN jsonb_build_object('has_access', true, 'unlimited', true);
        ELSE
            RETURN jsonb_build_object('has_access', true, 'limit', v_limit);
        END IF;
    END IF;

    -- Utiliser la limite gratuite par défaut
    RETURN jsonb_build_object(
        'has_access', v_feature.free_limit > 0,
        'limit', v_feature.free_limit,
        'is_free_tier', true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DONNÉES INITIALES
-- =============================================

-- Plans par défaut (adaptation selon enum subscription_tier)
DO $$
DECLARE
    has_tier_type BOOLEAN;
    has_starter BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier')
    INTO has_tier_type;

    IF has_tier_type THEN
        SELECT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'subscription_tier' AND e.enumlabel = 'starter'
        ) INTO has_starter;

        IF has_starter THEN
            INSERT INTO subscription_plans (code, name, name_ar, description, tier, plan_type, price_monthly, price_quarterly, price_yearly, discount_quarterly_percent, discount_yearly_percent, features, color, badge_label, trial_days, is_featured, sort_order)
            VALUES
                ('free', 'Gratuit', 'مجاني', 'Accès de base à TeensParty', 'free'::subscription_tier, 'free', 0, 0, 0, 0, 0,
                 '{"max_circles": 2, "max_circle_members": 10, "daily_challenges": 3, "cloud_storage_mb": 100, "ad_free": false, "xp_multiplier": 1.0}'::jsonb,
                 '#6b7280', NULL, 0, false, 0),

                ('starter', 'Starter', 'ستارتر', 'Pour bien commencer', 'starter'::subscription_tier, 'starter', 29, 79, 290, 10, 17,
                 '{"max_circles": 5, "max_circle_members": 25, "daily_challenges": 5, "cloud_storage_mb": 500, "ad_free": true, "xp_multiplier": 1.2, "custom_avatar": true}'::jsonb,
                 '#3b82f6', NULL, 7, false, 1),

                ('pro', 'Pro', 'برو', 'Le plus populaire', 'pro'::subscription_tier, 'pro', 49, 129, 490, 12, 17,
                 '{"max_circles": 10, "max_circle_members": 50, "daily_challenges": 10, "cloud_storage_mb": 2000, "ad_free": true, "xp_multiplier": 1.5, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "analytics_dashboard": true}'::jsonb,
                 '#8b5cf6', 'POPULAIRE', 7, true, 2),

                ('elite', 'Elite', 'إيليت', 'Pour les champions', 'elite'::subscription_tier, 'elite', 99, 269, 990, 10, 17,
                 '{"max_circles": -1, "max_circle_members": 100, "daily_challenges": -1, "cloud_storage_mb": 10000, "ad_free": true, "xp_multiplier": 2.0, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "analytics_dashboard": true, "custom_themes": true, "early_access": true, "vip_events": true}'::jsonb,
                 '#f59e0b', 'ELITE', 14, false, 3),

                ('family', 'Famille', 'عائلة', 'Jusqu''à 5 membres', 'family'::subscription_tier, 'family', 79, 219, 790, 8, 17,
                 '{"max_circles": 10, "max_circle_members": 50, "daily_challenges": 10, "cloud_storage_mb": 5000, "ad_free": true, "xp_multiplier": 1.5, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "max_family_members": 5}'::jsonb,
                 '#ec4899', 'FAMILLE', 7, false, 4)
            ON CONFLICT DO NOTHING;
        ELSE
            INSERT INTO subscription_plans (code, name, name_ar, description, tier, plan_type, price_monthly, price_quarterly, price_yearly, discount_quarterly_percent, discount_yearly_percent, features, color, badge_label, trial_days, is_featured, sort_order)
            VALUES
                ('free', 'Gratuit', 'مجاني', 'Accès de base à TeensParty', 'free'::subscription_tier, 'free', 0, 0, 0, 0, 0,
                 '{"max_circles": 2, "max_circle_members": 10, "daily_challenges": 3, "cloud_storage_mb": 100, "ad_free": false, "xp_multiplier": 1.0}'::jsonb,
                 '#6b7280', NULL, 0, false, 0),

                ('starter', 'Starter', 'ستارتر', 'Pour bien commencer', 'silver'::subscription_tier, 'starter', 29, 79, 290, 10, 17,
                 '{"max_circles": 5, "max_circle_members": 25, "daily_challenges": 5, "cloud_storage_mb": 500, "ad_free": true, "xp_multiplier": 1.2, "custom_avatar": true}'::jsonb,
                 '#3b82f6', NULL, 7, false, 1),

                ('pro', 'Pro', 'برو', 'Le plus populaire', 'gold'::subscription_tier, 'pro', 49, 129, 490, 12, 17,
                 '{"max_circles": 10, "max_circle_members": 50, "daily_challenges": 10, "cloud_storage_mb": 2000, "ad_free": true, "xp_multiplier": 1.5, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "analytics_dashboard": true}'::jsonb,
                 '#8b5cf6', 'POPULAIRE', 7, true, 2),

                ('elite', 'Elite', 'إيليت', 'Pour les champions', 'platinum'::subscription_tier, 'elite', 99, 269, 990, 10, 17,
                 '{"max_circles": -1, "max_circle_members": 100, "daily_challenges": -1, "cloud_storage_mb": 10000, "ad_free": true, "xp_multiplier": 2.0, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "analytics_dashboard": true, "custom_themes": true, "early_access": true, "vip_events": true}'::jsonb,
                 '#f59e0b', 'ELITE', 14, false, 3),

                ('family', 'Famille', 'عائلة', 'Jusqu''à 5 membres', 'gold'::subscription_tier, 'family', 79, 219, 790, 8, 17,
                 '{"max_circles": 10, "max_circle_members": 50, "daily_challenges": 10, "cloud_storage_mb": 5000, "ad_free": true, "xp_multiplier": 1.5, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "max_family_members": 5}'::jsonb,
                 '#ec4899', 'FAMILLE', 7, false, 4)
            ON CONFLICT DO NOTHING;
        END IF;
    ELSE
        INSERT INTO subscription_plans (code, name, name_ar, description, tier, plan_type, price_monthly, price_quarterly, price_yearly, discount_quarterly_percent, discount_yearly_percent, features, color, badge_label, trial_days, is_featured, sort_order)
        VALUES
            ('free', 'Gratuit', 'مجاني', 'Accès de base à TeensParty', 'free', 'free', 0, 0, 0, 0, 0,
             '{"max_circles": 2, "max_circle_members": 10, "daily_challenges": 3, "cloud_storage_mb": 100, "ad_free": false, "xp_multiplier": 1.0}'::jsonb,
             '#6b7280', NULL, 0, false, 0),

            ('starter', 'Starter', 'ستارتر', 'Pour bien commencer', 'starter', 'starter', 29, 79, 290, 10, 17,
             '{"max_circles": 5, "max_circle_members": 25, "daily_challenges": 5, "cloud_storage_mb": 500, "ad_free": true, "xp_multiplier": 1.2, "custom_avatar": true}'::jsonb,
             '#3b82f6', NULL, 7, false, 1),

            ('pro', 'Pro', 'برو', 'Le plus populaire', 'pro', 'pro', 49, 129, 490, 12, 17,
             '{"max_circles": 10, "max_circle_members": 50, "daily_challenges": 10, "cloud_storage_mb": 2000, "ad_free": true, "xp_multiplier": 1.5, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "analytics_dashboard": true}'::jsonb,
             '#8b5cf6', 'POPULAIRE', 7, true, 2),

            ('elite', 'Elite', 'إيليت', 'Pour les champions', 'elite', 'elite', 99, 269, 990, 10, 17,
             '{"max_circles": -1, "max_circle_members": 100, "daily_challenges": -1, "cloud_storage_mb": 10000, "ad_free": true, "xp_multiplier": 2.0, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "analytics_dashboard": true, "custom_themes": true, "early_access": true, "vip_events": true}'::jsonb,
             '#f59e0b', 'ELITE', 14, false, 3),

            ('family', 'Famille', 'عائلة', 'Jusqu''à 5 membres', 'family', 'family', 79, 219, 790, 8, 17,
             '{"max_circles": 10, "max_circle_members": 50, "daily_challenges": 10, "cloud_storage_mb": 5000, "ad_free": true, "xp_multiplier": 1.5, "custom_avatar": true, "priority_support": true, "exclusive_badges": true, "max_family_members": 5}'::jsonb,
             '#ec4899', 'FAMILLE', 7, false, 4)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Fonctionnalités premium
INSERT INTO premium_features (code, name, description, category, free_limit, icon)
VALUES
    ('max_circles', 'Cercles d''amis', 'Nombre max de cercles', 'social', 2, 'users'),
    ('daily_challenges', 'Défis quotidiens', 'Défis par jour', 'content', 3, 'target'),
    ('cloud_storage_mb', 'Stockage cloud', 'Espace de stockage en MB', 'storage', 100, 'cloud'),
    ('xp_multiplier', 'Multiplicateur XP', 'Bonus d''XP', 'rewards', 0, 'zap'),
    ('ad_free', 'Sans publicités', 'Navigation sans pubs', 'ads', 0, 'eye-off'),
    ('custom_avatar', 'Avatar personnalisé', 'Avatars exclusifs', 'customization', 0, 'user'),
    ('priority_support', 'Support prioritaire', 'Assistance rapide', 'support', 0, 'headphones'),
    ('exclusive_badges', 'Badges exclusifs', 'Badges premium', 'rewards', 0, 'award'),
    ('analytics_dashboard', 'Tableau de bord', 'Stats avancées', 'analytics', 0, 'bar-chart'),
    ('custom_themes', 'Thèmes personnalisés', 'Thèmes exclusifs', 'customization', 0, 'palette')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their subscriptions" ON user_subscriptions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their payments" ON subscription_payments
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view their promo uses" ON promo_code_uses
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their payment requests" ON payment_requests
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view their family membership" ON family_members
    FOR SELECT USING (user_id = auth.uid());

-- Plans visibles par tous
CREATE POLICY "Anyone can view active plans" ON subscription_plans
    FOR SELECT USING (is_active = true);

-- Features visibles par tous
CREATE POLICY "Anyone can view features" ON premium_features
    FOR SELECT USING (is_active = true);

-- =============================================
-- TRIGGER POUR EXPIRATION
-- =============================================

CREATE OR REPLACE FUNCTION check_subscription_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Marquer comme expiré si la période est terminée
    IF NEW.current_period_end IS NOT NULL AND NEW.current_period_end < NOW() THEN
        IF NEW.cancel_at_period_end OR NOT NEW.auto_renew THEN
            NEW.status := 'expired';
            -- Retirer le statut premium
            UPDATE auth.users SET is_premium = false WHERE id = NEW.user_id;
        ELSE
            NEW.status := 'past_due';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_subscription_expiry
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION check_subscription_expiry();
