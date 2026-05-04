-- =====================================================
-- Migration 021: XP Payment System
-- =====================================================
-- Enables hybrid payment with XP + DH (Dirhams)
-- =====================================================

-- Add XP payment columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS xp_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_after_xp DECIMAL(10,2);

-- Update amount_after_xp to match total_amount by default
UPDATE bookings
SET amount_after_xp = total_amount
WHERE amount_after_xp IS NULL;

-- Add XP payment columns to anniv_orders table
ALTER TABLE anniv_orders
ADD COLUMN IF NOT EXISTS xp_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_after_xp DECIMAL(10,2);

-- Update amount_after_xp for anniv_orders
UPDATE anniv_orders
SET amount_after_xp = total_price
WHERE amount_after_xp IS NULL;

-- Create XP transactions table for audit trail
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teen_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positive for gains, negative for spending
    type VARCHAR(50) NOT NULL, -- 'earn', 'payment', 'refund', 'bonus', 'penalty'
    description TEXT,
    reference_type VARCHAR(50), -- 'booking', 'anniv_order', 'challenge', 'achievement', etc.
    reference_id UUID,
    balance_before INTEGER,
    balance_after INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_type CHECK (type IN ('earn', 'payment', 'refund', 'bonus', 'penalty', 'transfer'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_xp_transactions_teen_id ON xp_transactions(teen_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_type ON xp_transactions(type);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_reference ON xp_transactions(reference_type, reference_id);

-- Create XP payment settings table
CREATE TABLE IF NOT EXISTS xp_payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES profiles(id)
);

-- Insert default XP payment settings
INSERT INTO xp_payment_settings (setting_key, setting_value, description) VALUES
('xp_to_dh_rate', '100', 'XP required for 1 DH'),
('max_xp_payment_percentage', '0.5', 'Maximum percentage of payment that can be XP (0.5 = 50%)'),
('min_xp_for_payment', '500', 'Minimum XP required to use XP payment'),
('xp_payment_enabled', 'true', 'Whether XP payment is globally enabled')
ON CONFLICT (setting_key) DO NOTHING;

-- Create function to record XP transaction with balance tracking
CREATE OR REPLACE FUNCTION record_xp_transaction(
    p_teen_id UUID,
    p_amount INTEGER,
    p_type VARCHAR(50),
    p_description TEXT DEFAULT NULL,
    p_reference_type VARCHAR(50) DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_balance_before INTEGER;
    v_balance_after INTEGER;
    v_transaction_id UUID;
BEGIN
    -- Get current balance
    SELECT COALESCE(total_xp, 0) INTO v_balance_before
    FROM user_xp
    WHERE teen_id = p_teen_id;

    -- Calculate new balance
    v_balance_after := GREATEST(0, COALESCE(v_balance_before, 0) + p_amount);

    -- Insert transaction record
    INSERT INTO xp_transactions (
        teen_id, amount, type, description,
        reference_type, reference_id,
        balance_before, balance_after
    ) VALUES (
        p_teen_id, p_amount, p_type, p_description,
        p_reference_type, p_reference_id,
        v_balance_before, v_balance_after
    )
    RETURNING id INTO v_transaction_id;

    -- Update user XP balance
    INSERT INTO user_xp (teen_id, total_xp)
    VALUES (p_teen_id, v_balance_after)
    ON CONFLICT (teen_id)
    DO UPDATE SET total_xp = v_balance_after;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to refund XP from booking
CREATE OR REPLACE FUNCTION refund_booking_xp(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_booking RECORD;
    v_teen_id UUID;
BEGIN
    -- Get booking with XP info
    SELECT b.*, bt.child_id
    INTO v_booking
    FROM bookings b
    LEFT JOIN booking_tickets bt ON bt.booking_id = b.id
    WHERE b.id = p_booking_id
    LIMIT 1;

    IF NOT FOUND OR v_booking.xp_used IS NULL OR v_booking.xp_used = 0 THEN
        RETURN FALSE;
    END IF;

    v_teen_id := v_booking.child_id;

    -- Record refund transaction
    PERFORM record_xp_transaction(
        v_teen_id,
        v_booking.xp_used, -- Positive amount for refund
        'refund',
        'Remboursement réservation ' || v_booking.booking_reference,
        'booking',
        p_booking_id
    );

    -- Clear XP from booking
    UPDATE bookings
    SET xp_used = 0, xp_value = 0, amount_after_xp = total_amount
    WHERE id = p_booking_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on xp_transactions
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for xp_transactions
CREATE POLICY "Users can view their own XP transactions"
ON xp_transactions FOR SELECT
TO authenticated
USING (
    teen_id = auth.uid() OR
    teen_id IN (
        SELECT teen_id FROM parent_teen_links WHERE parent_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all XP transactions"
ON xp_transactions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_roles
        WHERE profile_id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Enable RLS on xp_payment_settings
ALTER TABLE xp_payment_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for xp_payment_settings
CREATE POLICY "Anyone can read XP payment settings"
ON xp_payment_settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can update XP payment settings"
ON xp_payment_settings FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_roles
        WHERE profile_id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Add comments
COMMENT ON TABLE xp_transactions IS 'Audit trail for all XP transactions (earnings, payments, refunds)';
COMMENT ON TABLE xp_payment_settings IS 'Configuration settings for XP payment system';
COMMENT ON FUNCTION record_xp_transaction IS 'Records an XP transaction and updates user balance atomically';
COMMENT ON FUNCTION refund_booking_xp IS 'Refunds XP used for a booking and clears XP payment info';
