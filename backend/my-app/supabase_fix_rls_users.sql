-- ════════════════════════════════════════════════════════════
-- Supabase Fix: Allow Users to Update Their Own Username
-- ════════════════════════════════════════════════════════════
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- The problem: RLS (Row Level Security) is blocking users from
-- updating their own row in the `users` table. This adds the
-- necessary policies.

-- 1. Make sure RLS is enabled (it probably already is)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Allow users to READ their own row
CREATE POLICY "Users can read own row"
ON users FOR SELECT
USING (auth.uid() = uuid);

-- 3. Allow users to UPDATE their own row (username, gender, etc.)
CREATE POLICY "Users can update own row"
ON users FOR UPDATE
USING (auth.uid() = uuid)
WITH CHECK (auth.uid() = uuid);

-- 4. Allow users to INSERT their own row (for new signups)
CREATE POLICY "Users can insert own row"
ON users FOR INSERT
WITH CHECK (auth.uid() = uuid);

-- 5. Allow ALL authenticated users to READ all rows (needed for
--    searching creators by @username, viewing profiles, etc.)
CREATE POLICY "Authenticated users can read all users"
ON users FOR SELECT
USING (auth.role() = 'authenticated');
