-- ════════════════════════════════════════════════════════════════════════════
-- HUSTAD TICKETS — session dedup key
-- Allows tickets created from sessions that have no CP job to be deduped
-- by the inspection_session_id instead of cp_job_id.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE hustad_tickets
  ADD COLUMN IF NOT EXISTS inspection_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_ht_session_id ON hustad_tickets(inspection_session_id);
