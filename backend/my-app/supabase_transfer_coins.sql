-- ════════════════════════════════════════════════════════════
-- Supabase RPC: Secure Bolt Token Transfer (V2 - Fixes Null Balances)
-- ════════════════════════════════════════════════════════════
-- Run this in: Supabase Dashboard → SQL Editor → New Query

CREATE OR REPLACE FUNCTION transfer_bolt_tokens(
    receiver_uuid UUID,
    amount INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Ensures this bypasses standard RLS so it can update both user rows securely
AS $$
DECLARE
    sender_balance INT;
BEGIN
    -- 1. Ensure amount is strictly positive
    IF amount <= 0 THEN
        RAISE EXCEPTION 'Transfer amount must be positive.';
    END IF;

    -- 2. Prevent self-transfer
    IF auth.uid() = receiver_uuid THEN
        RAISE EXCEPTION 'Cannot transfer tokens to yourself.';
    END IF;

    -- 3. Check sender balance (using COALESCE to treat NULL as 0)
    SELECT COALESCE(coin_balance, 0) INTO sender_balance 
    FROM users 
    WHERE uuid = auth.uid();

    IF sender_balance < amount THEN
        RAISE EXCEPTION 'Insufficient tokens.';
    END IF;

    -- 4. Deduct from sender (using COALESCE)
    UPDATE users 
    SET coin_balance = COALESCE(coin_balance, 0) - amount 
    WHERE uuid = auth.uid();

    -- 5. Add to receiver (using COALESCE)
    UPDATE users 
    SET coin_balance = COALESCE(coin_balance, 0) + amount 
    WHERE uuid = receiver_uuid;

END;
$$;
