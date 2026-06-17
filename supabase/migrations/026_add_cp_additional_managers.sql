-- Store the CenterPoint "Additional Managers" field on each synced job.
-- Used to auto-assign the sales rep in pipeline_leads without manual intervention.
ALTER TABLE centerpoint_jobs ADD COLUMN IF NOT EXISTS cp_additional_managers TEXT;
