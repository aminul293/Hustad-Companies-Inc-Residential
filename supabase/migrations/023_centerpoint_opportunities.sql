-- ════════════════════════════════════════════════════════════════════════════
-- CENTERPOINT OPPORTUNITIES — session-created Sales opportunities cache
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS centerpoint_opportunities (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cp_id                       TEXT UNIQUE NOT NULL,        -- CenterPoint production ID
  name                        TEXT NOT NULL DEFAULT '',     -- CP job number (matches centerpoint_jobs.name)
  opportunity_type            TEXT,                         -- Service | Hail/Wind Claim | Roof Replacement
  domain                      TEXT DEFAULT 'Sales',
  status                      TEXT NOT NULL DEFAULT '',     -- lead_opened | lead_pending | lead_quoted | lead_sold | lead_dead
  display_status              TEXT NOT NULL DEFAULT '',     -- human label from CP
  description                 TEXT,
  billed_company_id           BIGINT,
  price                       NUMERIC NOT NULL DEFAULT 0,
  cp_created_at               TIMESTAMPTZ,
  cp_updated_at               TIMESTAMPTZ,
  latest_stage_transitioned_at TIMESTAMPTZ,
  synced_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_opps_name       ON centerpoint_opportunities(name);
CREATE INDEX IF NOT EXISTS idx_cp_opps_status     ON centerpoint_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_cp_opps_cp_updated ON centerpoint_opportunities(cp_updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_cp_opps_synced     ON centerpoint_opportunities(synced_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE centerpoint_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON centerpoint_opportunities
  FOR ALL USING (true) WITH CHECK (true);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────────────────────
CREATE TRIGGER cp_opps_updated_at
  BEFORE UPDATE ON centerpoint_opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
