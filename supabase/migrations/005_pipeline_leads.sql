-- ════════════════════════════════════════════════════════════════════════════
-- PIPELINE LEADS — CRM Layer for Reps before Inspection
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pipeline_leads (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  centerpoint_job_id     UUID REFERENCES centerpoint_jobs(id),
  cpc_ticket_id          TEXT UNIQUE NOT NULL,
  assigned_rep_id        UUID,
  pipeline_status        TEXT NOT NULL DEFAULT 'new_lead',
  contact_attempt_count  INT DEFAULT 0,
  last_contacted_at      TIMESTAMPTZ,
  next_follow_up_at      TIMESTAMPTZ,
  scheduled_start_at     TIMESTAMPTZ,
  scheduled_end_at       TIMESTAMPTZ,
  lead_notes             TEXT,
  dead_reason            TEXT,
  imported_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline_leads(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_pipeline_rep ON pipeline_leads(assigned_rep_id);

ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access pipeline_leads" ON pipeline_leads
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public read pipeline_leads" ON pipeline_leads
  FOR SELECT USING (true);
CREATE POLICY "Public insert pipeline_leads" ON pipeline_leads
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update pipeline_leads" ON pipeline_leads
  FOR UPDATE USING (true) WITH CHECK (true);

ALTER TABLE centerpoint_jobs ADD COLUMN IF NOT EXISTS inbox_status TEXT NOT NULL DEFAULT 'new';

CREATE TRIGGER pipeline_leads_updated_at
  BEFORE UPDATE ON pipeline_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
