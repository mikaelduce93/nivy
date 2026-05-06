-- ============================================================================
-- TEENS PARTY MOROCCO - XP Shop (Boutique XP minimaliste)
-- Migration: 030_xp_shop.sql
-- Description: Table simple `xp_shop_items` pour la page /xp-shop.
--              Complete les `shop_rewards` riches existants (migration 004)
--              avec un catalogue allege type "vitrine" facile a consommer
--              cote front (audit AUDIT_LEVEL_UP_ET_DEFIS Phase 1.3).
-- ============================================================================

-- Extension UUID au cas ou elle n'aurait pas ete activee
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS xp_shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    xp_cost INTEGER NOT NULL CHECK (xp_cost >= 0),
    image_url TEXT,
    category TEXT,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_shop_items_available
    ON xp_shop_items (available)
    WHERE available IS TRUE;

CREATE INDEX IF NOT EXISTS idx_xp_shop_items_category
    ON xp_shop_items (category)
    WHERE category IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Pattern utilise par le projet: RLS enabled + policy de lecture publique
-- pour les tables vitrine. Ecritures reservees aux admins via service role.

ALTER TABLE xp_shop_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'xp_shop_items'
          AND policyname = 'xp_shop_items_public_read'
    ) THEN
        CREATE POLICY xp_shop_items_public_read
            ON xp_shop_items
            FOR SELECT
            USING (available IS TRUE);
    END IF;
END $$;

-- ============================================================================
-- SEED DATA (items demo)
-- ============================================================================
INSERT INTO xp_shop_items (name, description, xp_cost, category)
VALUES
    ('Booster XP 24h', 'Gagne +50% XP pendant 24 heures.', 500, 'booster'),
    ('Protection Streak', 'Protege ton streak en cas d''oubli (1 jour).', 100, 'booster'),
    ('Frame Or', 'Frame doree exclusive pour ton avatar.', 1000, 'cosmetic'),
    ('Sticker Exclusif', 'Sticker collector limite.', 300, 'collectible'),
    ('Casquette Teens Party', 'Casquette officielle (a retirer en physique).', 3000, 'real_item')
ON CONFLICT DO NOTHING;
