-- ════════════════════════════════════════════════════════════
-- Supabase Migration: Solana Payment & Premium Subscription
-- ════════════════════════════════════════════════════════════
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- 1. Add premium subscription tracking columns to users table
--    (crypto_addresses column already exists as per your schema)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS premium_plan        TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS premium_expires_at  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS premium_tx          TEXT        DEFAULT NULL;

-- Note: crypto_addresses column already exists in your users table.
-- The app will write the derived Solana address there on first use.
-- Make sure it's type TEXT:
--   ALTER TABLE users ADD COLUMN IF NOT EXISTS crypto_addresses TEXT DEFAULT NULL;

-- 2. Index for quick premium lookup
CREATE INDEX IF NOT EXISTS idx_users_premium_expires
  ON users (premium_expires_at)
  WHERE is_premium = TRUE;

-- 3. Index on crypto_addresses for server-side payment monitoring queries
CREATE INDEX IF NOT EXISTS idx_users_crypto_address
  ON users (crypto_addresses)
  WHERE crypto_addresses IS NOT NULL;

-- 4. (Optional) payment_logs table for auditing every confirmed payment
CREATE TABLE IF NOT EXISTS payment_logs (
  id              BIGSERIAL      PRIMARY KEY,
  user_uuid       UUID           NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  plan            TEXT           NOT NULL,              -- 'monthly' | 'yearly'
  amount_sol      NUMERIC(18,9)  NOT NULL,
  tx_signature    TEXT           UNIQUE NOT NULL,       -- Solana transaction hash
  sol_address     TEXT           NOT NULL,              -- the user's crypto_addresses value
  confirmed_at    TIMESTAMPTZ    DEFAULT NOW(),
  created_at      TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_user ON payment_logs (user_uuid);
CREATE INDEX IF NOT EXISTS idx_payment_logs_tx   ON payment_logs (tx_signature);

-- 5. RLS for payment_logs
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users read own payments" ON payment_logs
  FOR SELECT USING (auth.uid() = user_uuid);

CREATE POLICY IF NOT EXISTS "Authenticated users log payments" ON payment_logs
  FOR INSERT WITH CHECK (auth.uid() = user_uuid);

-- ════════════════════════════════════════════════════════════
-- HOW IT WORKS:
-- ─────────────────────────────────────────────────────────
-- 1. On login, the app reads users.crypto_addresses.
-- 2. If empty, it derives a unique Solana address from the
--    master BIP39 seed phrase (VITE_SOLANA_MASTER_SEED) using
--    path: m/44'/501'/{uuid_hash}'/0'
-- 3. That address is saved to users.crypto_addresses.
-- 4. User sends SOL to that address. The app polls Solana RPC
--    every 15 seconds for incoming transactions.
-- 5. On detection, the app sets:
--      is_premium = TRUE
--      premium_plan = 'monthly' | 'yearly'
--      premium_expires_at = now + 30/365 days
--      premium_tx = solana_tx_signature
-- ════════════════════════════════════════════════════════════

