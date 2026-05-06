-- ════════════════════════════════════════════════════════════════════════════
-- CENTERPOINT JOBS — sync cache from CenterPoint Connect API
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS centerpoint_jobs (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cp_id                  TEXT UNIQUE NOT NULL,          -- CenterPoint service ID
  name                   TEXT NOT NULL DEFAULT '',       -- job number (e.g. "HSR-1234")
  property_name          TEXT,
  opportunity_type       TEXT,
  work_type              TEXT,
  domain                 TEXT,
  status                 TEXT NOT NULL DEFAULT '',
  display_status         TEXT NOT NULL DEFAULT '',
  price                  NUMERIC NOT NULL DEFAULT 0,
  start_date             TIMESTAMPTZ,
  billed_company_id      TEXT,                          -- used to verify residential
  description            TEXT,
  service_type_hustad    TEXT,                          -- customWithLabels.serviceTypeHustad
  stage_transitioned_at  TIMESTAMPTZ,
  cp_created_at          TIMESTAMPTZ,
  cp_updated_at          TIMESTAMPTZ,
  raw                    JSONB DEFAULT '{}',            -- full attributes snapshot
  synced_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cp_jobs_status     ON centerpoint_jobs(status);
CREATE INDEX IF NOT EXISTS idx_cp_jobs_cp_updated ON centerpoint_jobs(cp_updated_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_cp_jobs_synced     ON centerpoint_jobs(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_cp_jobs_name       ON centerpoint_jobs(name);
CREATE INDEX IF NOT EXISTS idx_cp_jobs_property   ON centerpoint_jobs(property_name);

-- ── SYNC LOG ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cp_sync_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  jobs_upserted INT DEFAULT 0,
  jobs_scanned  INT DEFAULT 0,
  delta_since   TIMESTAMPTZ,   -- updatedAt cutoff used for this sync
  status        TEXT NOT NULL DEFAULT 'running'
                CHECK (status IN ('running','completed','failed')),
  error         TEXT
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE centerpoint_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cp_sync_log      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON centerpoint_jobs
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON cp_sync_log
  FOR ALL USING (true) WITH CHECK (true);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────────────────────
CREATE TRIGGER cp_jobs_updated_at
  BEFORE UPDATE ON centerpoint_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
