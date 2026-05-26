-- =====================
-- Migration 003: Allow all authenticated users to read memorization_progress
-- This enables the global leaderboard to display all users' progress
-- =====================

-- Drop the existing restrictive policy that blocks reads from other users
DROP POLICY IF EXISTS "Users can manage their own progress" ON memorization_progress;

-- Create separate policies for read vs write operations:

-- 1. SELECT: Any authenticated user can read all progress (needed for leaderboard)
CREATE POLICY "Authenticated users can read all progress" ON memorization_progress
  FOR SELECT USING (auth.role() = 'authenticated');

-- 2. INSERT: Users can only insert their own progress
CREATE POLICY "Users can insert their own progress" ON memorization_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Users can only update their own progress
CREATE POLICY "Users can update their own progress" ON memorization_progress
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. DELETE: Users can only delete their own progress
CREATE POLICY "Users can delete their own progress" ON memorization_progress
  FOR DELETE USING (auth.uid() = user_id);

-- =====================
-- Create profiles table for leaderboard display names/avatars
-- =====================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read profiles (for leaderboard)
CREATE POLICY "Authenticated users can read all profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =====================
-- Auto-create profile on user signup (trigger)
-- =====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
