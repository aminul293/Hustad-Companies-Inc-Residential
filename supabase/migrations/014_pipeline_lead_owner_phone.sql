-- Add owner_phone to pipeline_leads so reps can store a homeowner contact
-- number when CenterPoint's raw data doesn't include one.
ALTER TABLE pipeline_leads ADD COLUMN IF NOT EXISTS owner_phone TEXT;
