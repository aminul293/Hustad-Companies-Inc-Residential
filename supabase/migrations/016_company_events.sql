-- ════════════════════════════════════════════════════════════════════════════
-- COMPANY EVENTS LOG
-- Audit trail for residential company creation, updates, and integration
-- results (CenterPoint, Outlook, Azure Search).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_events (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id            TEXT,
  company_name          TEXT,
  company_type          TEXT NOT NULL DEFAULT 'Company',
  customer_type         TEXT NOT NULL DEFAULT 'Residential',
  sales_status          TEXT,
  created_by            TEXT,
  request_payload       JSONB,
  centerpoint_response  JSONB,
  email_status          TEXT,
  azure_search_status   TEXT,
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE company_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access company_events" ON company_events
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_company_events_company_id
  ON company_events(company_id);

CREATE INDEX IF NOT EXISTS idx_company_events_created_at
  ON company_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_events_created_by
  ON company_events(created_by);
