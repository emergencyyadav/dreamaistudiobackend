-- ════════════════════════════════════════════════════════════
-- Supabase Migration: Set Default Coin Balance to 10
-- ════════════════════════════════════════════════════════════
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- 1. Fix all existing accounts that currently have a "null" balance
--    This sets them to the intended 10 starting tokens.
UPDATE users 
SET coin_balance = 10 
WHERE coin_balance IS NULL;

-- 2. Modify the database schema so that EVERY new user 
--    created in the future automatically receives 10 tokens 
--    directly on the database level, no "nulls" allowed!
ALTER TABLE users 
ALTER COLUMN coin_balance SET DEFAULT 10;
