-- ════════════════════════════════════════════════════════════════════════════
-- HUSTAD TICKETS — internal managed ticket system
-- ════════════════════════════════════════════════════════════════════════════

-- Track which CP jobs have been promoted
ALTER TABLE centerpoint_jobs
  ADD COLUMN IF NOT EXISTS promoted_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promoted_ticket_id UUID;

-- ── HUSTAD TICKETS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hustad_tickets (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Source (nullable — tickets can be created independently too)
  cp_job_id               TEXT,                       -- centerpoint_jobs.cp_id
  cp_job_name             TEXT,                       -- job number for display

  -- Property
  property_name           TEXT NOT NULL DEFAULT '',
  property_address        TEXT DEFAULT '',

  -- Client
  client_name             TEXT DEFAULT '',
  client_email            TEXT DEFAULT '',
  client_phone            TEXT DEFAULT '',

  -- Ownership
  assigned_rep_name       TEXT DEFAULT '',
  promoted_by             TEXT DEFAULT '',
  promoted_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Hustad pipeline stage
  stage                   TEXT NOT NULL DEFAULT 'new'
                          CHECK (stage IN (
                            'new','contacted','appointment_set','inspection_done',
                            'estimate_sent','follow_up','signed',
                            'job_scheduled','job_started','job_completed',
                            'invoiced','closed_won','closed_lost'
                          )),

  -- Content
  notes                   TEXT DEFAULT '',
  price                   NUMERIC DEFAULT 0,

  -- CenterPoint write-back tracking
  last_cp_writeback_stage TEXT,
  last_cp_writeback_at    TIMESTAMPTZ,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ht_stage      ON hustad_tickets(stage);
CREATE INDEX IF NOT EXISTS idx_ht_cp_job     ON hustad_tickets(cp_job_id);
CREATE INDEX IF NOT EXISTS idx_ht_updated    ON hustad_tickets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ht_rep        ON hustad_tickets(assigned_rep_name);

-- ── TICKET TOUCHES ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_touches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES hustad_tickets(id) ON DELETE CASCADE,
  rep_name    TEXT NOT NULL DEFAULT '',
  method      TEXT NOT NULL DEFAULT 'call'
              CHECK (method IN ('call','text','email','in_person','door_knock')),
  outcome     TEXT NOT NULL DEFAULT 'reached'
              CHECK (outcome IN ('reached','voicemail','no_answer','scheduled','not_interested','callback_requested')),
  notes       TEXT DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tt_ticket     ON ticket_touches(ticket_id);
CREATE INDEX IF NOT EXISTS idx_tt_occurred   ON ticket_touches(occurred_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE hustad_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_touches  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON hustad_tickets
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON ticket_touches
  FOR ALL USING (true) WITH CHECK (true);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────────────────────
CREATE TRIGGER hustad_tickets_updated_at
  BEFORE UPDATE ON hustad_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
