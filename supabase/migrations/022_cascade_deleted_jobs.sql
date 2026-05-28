-- Update pipeline_leads foreign key to centerpoint_jobs to set NULL on deletion of the referenced job
ALTER TABLE pipeline_leads
DROP CONSTRAINT IF EXISTS pipeline_leads_centerpoint_job_id_fkey,
ADD CONSTRAINT pipeline_leads_centerpoint_job_id_fkey
  FOREIGN KEY (centerpoint_job_id)
  REFERENCES centerpoint_jobs(id)
  ON DELETE SET NULL;
