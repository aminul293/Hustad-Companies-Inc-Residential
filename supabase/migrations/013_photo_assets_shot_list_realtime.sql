-- ════════════════════════════════════════════════════════════════════════════
-- 013: photo_assets — relax category constraint, add shot metadata, enable realtime
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Drop the restrictive CHECK that only allows legacy category values.
--    The checklist now uses shot-list IDs (e.g. 'general_observations').
ALTER TABLE photo_assets
  DROP CONSTRAINT IF EXISTS photo_assets_category_check;

-- 2. Add shot-list metadata columns so real-time subscribers on the tablet
--    can display the correct section/label without a secondary lookup.
ALTER TABLE photo_assets
  ADD COLUMN IF NOT EXISTS shot_label   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS shot_section TEXT NOT NULL DEFAULT '';

-- 3. Enable Supabase real-time for this table so the tablet gets instant
--    INSERT notifications when the rep uploads from their phone.
ALTER PUBLICATION supabase_realtime ADD TABLE photo_assets;
