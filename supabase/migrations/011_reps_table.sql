-- Stores authenticated rep identities synced from Azure AD on login
CREATE TABLE IF NOT EXISTS reps (
  id           TEXT PRIMARY KEY,          -- Azure AD OID (token.sub)
  name         TEXT NOT NULL,
  email        TEXT,
  role         TEXT NOT NULL DEFAULT 'rep',
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reps_active ON reps(active);
CREATE INDEX IF NOT EXISTS idx_reps_email  ON reps(email);
