-- ════════════════════════════════════════════════════════════════════════════
-- APPOINTMENTS — scheduled inspection appointments linked to pipeline leads
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ikdptfvpkaikvbsoiczu/sql
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS appointments (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_lead_id       UUID REFERENCES pipeline_leads(id) ON DELETE CASCADE,
  assigned_rep_id        TEXT,                                 -- Azure AD user ID
  appointment_start_at   TIMESTAMPTZ NOT NULL,
  appointment_end_at     TIMESTAMPTZ NOT NULL,
  appointment_status     TEXT NOT NULL DEFAULT 'scheduled'
                         CHECK (appointment_status IN (
                           'scheduled','confirmed','rescheduled',
                           'cancelled','no_show','completed'
                         )),
  location               TEXT,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appt_rep        ON appointments(assigned_rep_id);
CREATE INDEX IF NOT EXISTS idx_appt_lead       ON appointments(pipeline_lead_id);
CREATE INDEX IF NOT EXISTS idx_appt_start      ON appointments(appointment_start_at);
CREATE INDEX IF NOT EXISTS idx_appt_status     ON appointments(appointment_status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON appointments
  FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
