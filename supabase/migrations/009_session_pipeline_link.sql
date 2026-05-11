-- ════════════════════════════════════════════════════════════════════════════
-- SESSION → PIPELINE LINK
-- Adds pipeline_lead_id to inspection_sessions so completed sessions can
-- be traced back to the originating pipeline lead and ticket.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE inspection_sessions
  ADD COLUMN IF NOT EXISTS pipeline_lead_id UUID REFERENCES pipeline_leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_pipeline_lead ON inspection_sessions(pipeline_lead_id);

-- Add updated_at trigger backfill (was missing from rename migration)
ALTER TABLE inspection_sessions
  ADD COLUMN IF NOT EXISTS outbound_log_id UUID;

-- ── outbound_log table for communication history ─────────────────────────────
CREATE TABLE IF NOT EXISTS outbound_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_lead_id UUID REFERENCES pipeline_leads(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL,
  direction       TEXT NOT NULL DEFAULT 'outbound',
  status          TEXT NOT NULL DEFAULT 'sent',
  body            TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE outbound_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access outbound_log" ON outbound_log
  FOR ALL USING (true) WITH CHECK (true);
