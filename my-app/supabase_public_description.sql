-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add public_description to characters table
-- Run this in your Supabase SQL Editor (once)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add the new column (TEXT, nullable — existing characters won't have it)
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS public_description TEXT;

-- 2. (Optional) Add a comment for clarity
COMMENT ON COLUMN characters.public_description IS
  'AI-generated 100-200 word second-person public profile description. Generated once at creation, saved permanently.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Done! Now new characters will get their engaging public_description stored.
-- Old characters will show their persona text as fallback (no change needed).
-- ─────────────────────────────────────────────────────────────────────────────
