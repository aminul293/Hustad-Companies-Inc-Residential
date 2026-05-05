-- ════════════════════════════════════════════════════════════════════════════
-- HUSTAD RESIDENTIAL TABLET PLATFORM — MIGRATION 002
-- Add payload column for full state persistence
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}';

-- Allow NULL rep_id temporarily if needed for transitions, 
-- but ideally we should map it.
-- For robustness, we will make rep_id optional in the schema if it's not a real UUID yet.
ALTER TABLE sessions ALTER COLUMN rep_id DROP NOT NULL;
