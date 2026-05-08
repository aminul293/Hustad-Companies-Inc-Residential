-- ════════════════════════════════════════════════════════════════════════════
-- PRODUCTION HARDENING — Outbound Queue & Inspection Sessions
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Rename sessions to inspection_sessions for clarity
ALTER TABLE IF EXISTS sessions RENAME TO inspection_sessions;

-- 2. Create Outbound Queue for retry-safe write-backs
CREATE TABLE IF NOT EXISTS outbound_queue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_system   TEXT NOT NULL,          -- e.g. 'centerpoint'
  target_id       TEXT NOT NULL,          -- e.g. cp_id
  action          TEXT NOT NULL,          -- e.g. 'update_status'
  payload         JSONB NOT NULL,         -- the data to send
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'synced', 'failed')),
  retry_count     INT DEFAULT 0,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_oq_status ON outbound_queue(status);
CREATE INDEX IF NOT EXISTS idx_oq_created ON outbound_queue(created_at);

-- 3. Update RLS for Outbound Queue
ALTER TABLE outbound_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access outbound_queue" ON outbound_queue
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Add follow-up and scheduling fields to pipeline_leads (if not exists)
ALTER TABLE pipeline_leads 
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end_at   TIMESTAMPTZ;
