-- ════════════════════════════════════════════════════════════════════════════
-- OPP ACTIVITY LOG + FOLLOW-UP SCHEDULING
-- Adds timestamped note log and follow-up datetime to opportunities.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE centerpoint_opportunities
  ADD COLUMN IF NOT EXISTS opp_notes   TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cp_opps_follow_up ON centerpoint_opportunities(follow_up_at ASC NULLS LAST)
  WHERE follow_up_at IS NOT NULL;
