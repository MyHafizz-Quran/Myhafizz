-- =====================
-- Migration 002: Add whatsapp_number and avatar_url to study_profiles
-- =====================

ALTER TABLE study_profiles
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
