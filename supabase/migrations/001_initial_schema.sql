-- ════════════════════════════════════════════════════════════════════════════
-- HUSTAD RESIDENTIAL TABLET PLATFORM — DATABASE SCHEMA
-- Run this in Supabase SQL Editor or via migration
-- ════════════════════════════════════════════════════════════════════════════

-- ── EXTENSIONS ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── REPS (authentication) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pin_hash TEXT, -- bcrypt hash of 4-6 digit field PIN
  password_hash TEXT NOT NULL, -- bcrypt hash
  role TEXT NOT NULL DEFAULT 'rep' CHECK (role IN ('rep', 'manager', 'admin')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── SESSIONS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL, -- app-generated session_id (sess_xxx)
  rep_id UUID NOT NULL REFERENCES reps(id),
  
  -- Status
  session_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (session_status IN (
      'draft','phase_a_active','phase_a_complete','rep_review_pending',
      'summary_locked','authorization_pending','signed','deferred',
      'closed_no_damage','closed_monitor_only','closed_repair_only',
      'closed_claim_review','closed_restoration','sync_error','archived'
    )),
  current_screen TEXT NOT NULL DEFAULT 'P00_rep_launch',
  mode TEXT NOT NULL DEFAULT 'rep' CHECK (mode IN ('homeowner', 'rep')),
  phase_a_completed BOOLEAN NOT NULL DEFAULT false,
  
  -- Property context
  property_address TEXT NOT NULL DEFAULT '',
  property_city_state_zip TEXT NOT NULL DEFAULT 'Madison, WI',
  property_type TEXT NOT NULL DEFAULT 'single_family'
    CHECK (property_type IN ('single_family','condo','townhome','other')),
  homeowner_name TEXT DEFAULT '',
  homeowner_email TEXT DEFAULT '',
  homeowner_mobile TEXT DEFAULT '',
  insurer_name TEXT DEFAULT '',
  claim_number TEXT DEFAULT '',
  access_notes TEXT DEFAULT '',
  
  -- Buyer Phase A data
  buyer_priorities TEXT[] DEFAULT '{}',
  insurer_contact_status TEXT CHECK (insurer_contact_status IN ('not_yet','already_contacted','not_sure')),
  another_decision_maker_present BOOLEAN,
  decision_maker_relation TEXT DEFAULT '',
  decision_maker_name TEXT DEFAULT '',
  decision_maker_email TEXT DEFAULT '',
  decision_maker_mobile TEXT DEFAULT '',
  buyer_questions TEXT DEFAULT '',
  
  -- Findings
  outcome_type TEXT CHECK (outcome_type IN (
    'no_damage','monitor_only','repair_only',
    'claim_review_candidate','full_restoration_candidate'
  )),
  recommended_path TEXT CHECK (recommended_path IN ('direct_repair','claim_review','full_restoration')),
  selected_path TEXT CHECK (selected_path IN ('direct_repair','claim_review','full_restoration')),
  urgent_items_count INT NOT NULL DEFAULT 0,
  storm_related_items_count INT NOT NULL DEFAULT 0,
  monitor_items_count INT NOT NULL DEFAULT 0,
  summary_headline TEXT DEFAULT '',
  summary_body TEXT DEFAULT '',
  urgent_protection_recommended BOOLEAN NOT NULL DEFAULT false,
  urgent_protection_authorized BOOLEAN,
  internal_notes TEXT DEFAULT '',
  summary_locked_at TIMESTAMPTZ,
  summary_locked_by UUID REFERENCES reps(id),
  
  -- Path / system selection
  manufacturer_selected TEXT CHECK (manufacturer_selected IN ('GAF','OwensCorning','CertainTeed')),
  product_selected TEXT DEFAULT '',
  impact_upgrade_selected BOOLEAN NOT NULL DEFAULT false,
  warranty_option_selected TEXT DEFAULT '',
  claim_related_work BOOLEAN,
  agreement_acknowledged BOOLEAN NOT NULL DEFAULT false,
  
  -- Signature
  signer_name TEXT DEFAULT '',
  signer_email TEXT DEFAULT '',
  signer_mobile TEXT DEFAULT '',
  preferred_follow_up_method TEXT CHECK (preferred_follow_up_method IN ('email','text','both')),
  signature_data TEXT, -- base64 signature image or placeholder
  summary_send_recipient TEXT DEFAULT '',
  deferral_reason TEXT DEFAULT '',
  signed_at TIMESTAMPTZ,
  
  -- Sync
  sync_status TEXT NOT NULL DEFAULT 'synced'
    CHECK (sync_status IN ('local_only','queued','syncing','synced','error')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PHOTO ASSETS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS photo_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL, -- app-generated photo_xxx
  storage_path TEXT, -- Supabase storage path
  storage_url TEXT, -- public or signed URL
  caption TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('urgent','storm_related','monitor_only','general')),
  display_order INT NOT NULL DEFAULT 0,
  selected_for_summary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── FOLLOW-UP TASKS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  task_id TEXT NOT NULL, -- app-generated task_xxx
  owner_rep_id UUID REFERENCES reps(id),
  owner_name TEXT NOT NULL DEFAULT '',
  due_date DATE,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','scheduled','contacted','awaiting_buyer','completed','closed_lost')),
  recipient_name TEXT DEFAULT '',
  recipient_email TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── AUDIT EVENTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  actor_id TEXT NOT NULL, -- rep_id from the app
  actor_rep_id UUID REFERENCES reps(id),
  metadata JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_rep ON sessions(rep_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_sessions_address ON sessions(property_address);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_session ON photo_assets(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_events(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_event ON audit_events(event_name);
CREATE INDEX IF NOT EXISTS idx_tasks_session ON follow_up_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON follow_up_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON follow_up_tasks(due_date);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────────────────────
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE reps ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by API routes)
CREATE POLICY "Service role full access" ON sessions
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON photo_assets
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON follow_up_tasks
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON audit_events
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON reps
  FOR ALL USING (true) WITH CHECK (true);

-- ── STORAGE BUCKET ──────────────────────────────────────────────────────────
-- Run this separately in Supabase Dashboard > Storage, or:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-photos', 'inspection-photos', false);

-- ── UPDATED_AT TRIGGER ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON follow_up_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reps_updated_at
  BEFORE UPDATE ON reps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
