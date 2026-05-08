-- Add owner column to centerpoint_jobs for storing the residential client name
-- This column is populated during sync from the CenterPoint companies endpoint
ALTER TABLE centerpoint_jobs ADD COLUMN IF NOT EXISTS owner TEXT;
