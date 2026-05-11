-- ════════════════════════════════════════════════════════════════════════════
-- SESSION → APPOINTMENT + CPC TICKET LINK
-- Adds appointment_id and cpc_ticket_id to inspection_sessions so every
-- session can be traced back to its originating appointment and CP ticket.
-- pipeline_lead_id was added in migration 009.
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE inspection_sessions
  ADD COLUMN IF NOT EXISTS appointment_id UUID,
  ADD COLUMN IF NOT EXISTS cpc_ticket_id  TEXT;

CREATE INDEX IF NOT EXISTS idx_inspection_sessions_appointment_id
  ON inspection_sessions(appointment_id);

CREATE INDEX IF NOT EXISTS idx_inspection_sessions_cpc_ticket_id
  ON inspection_sessions(cpc_ticket_id);
