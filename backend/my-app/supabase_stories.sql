-- ════════════════════════════════════════════════════════════
-- Supabase Migration: Story Generator Library
-- ════════════════════════════════════════════════════════════
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- 1. Create the stories table
CREATE TABLE IF NOT EXISTS stories (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid            UUID           NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
  title           TEXT           NOT NULL DEFAULT 'Untitled Narrative',
  text            TEXT           NOT NULL,
  time            TIMESTAMPTZ    DEFAULT NOW()
);

-- 2. Index for quick user lookup
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories (uuid);

-- 3. Enable Row Level Security
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- 4. Set up Policies
-- Allow users to see only their own stories
CREATE POLICY "Users can only view their own stories" ON stories
  FOR SELECT USING (auth.uid() = uuid);

-- Allow users to insert their own stories
CREATE POLICY "Users can only insert their own stories" ON stories
  FOR INSERT WITH CHECK (auth.uid() = uuid);

-- Allow users to update their own stories
CREATE POLICY "Users can only update their own stories" ON stories
  FOR UPDATE USING (auth.uid() = uuid);

-- Allow users to delete their own stories
CREATE POLICY "Users can only delete their own stories" ON stories
  FOR DELETE USING (auth.uid() = uuid);
