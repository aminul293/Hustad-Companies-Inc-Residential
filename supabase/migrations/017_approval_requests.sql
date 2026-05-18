-- ════════════════════════════════════════════════════════════════════════════
-- APPROVAL REQUESTS
-- Stores every company + ticket creation request submitted by reps.
-- Status lifecycle:
--   pending_company_approval → approved | rejected | failed
--   company_created          (intermediate: company done, ticket pending)
--
-- The approval_token is a 256-bit random hex value sent to the service
-- manager via email. It is the sole credential required to approve or reject.
-- Tokens expire after 48 hours.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approval_requests (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_token          TEXT        UNIQUE NOT NULL,
  status                  TEXT        NOT NULL DEFAULT 'pending_company_approval',

  -- Company details submitted by the rep
  company_name            TEXT        NOT NULL,
  sales_status            TEXT,
  street_address          TEXT,
  locality                TEXT,
  region                  TEXT,
  postal_code             TEXT,
  timezone                TEXT,
  manager_id              TEXT,

  -- Rep identity
  requested_by            TEXT        NOT NULL,
  requested_by_email      TEXT        NOT NULL,

  -- CenterPoint results (populated after approval)
  centerpoint_company_id  TEXT,
  centerpoint_ticket_id   TEXT,
  company_created         BOOLEAN     NOT NULL DEFAULT false,
  ticket_created          BOOLEAN     NOT NULL DEFAULT false,

  -- Email tracking
  approval_email_sent     BOOLEAN     NOT NULL DEFAULT false,

  -- Manager decision
  approved_by             TEXT,
  approved_at             TIMESTAMPTZ,
  rejected_at             TIMESTAMPTZ,

  -- Token expiry — set to 48 hours from creation
  expires_at              TIMESTAMPTZ NOT NULL,

  -- Full form payload for audit trail
  request_payload         JSONB,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access approval_requests" ON approval_requests
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_approval_requests_token
  ON approval_requests(approval_token);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status
  ON approval_requests(status);

CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by_email
  ON approval_requests(requested_by_email);

CREATE INDEX IF NOT EXISTS idx_approval_requests_expires_at
  ON approval_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at
  ON approval_requests(created_at DESC);
