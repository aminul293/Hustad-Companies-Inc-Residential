-- Add workflow_stage_name column to store the actual CenterPoint workflow stage
-- (e.g. "Pending", "Accepted") which is separate from the lead status field.
ALTER TABLE centerpoint_opportunities
  ADD COLUMN IF NOT EXISTS workflow_stage_name TEXT;
