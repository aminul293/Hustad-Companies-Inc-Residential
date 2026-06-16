-- Add role and access control columns to reps table
ALTER TABLE reps ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'sales_rep'
  CHECK (role IN ('manager', 'sales_rep', 'viewer'));

-- Set manager role for the known admin email
UPDATE reps SET role = 'manager' WHERE email = 'aminul@hustadcompanies.com';

-- Index for fast role-based queries
CREATE INDEX IF NOT EXISTS idx_reps_role ON reps(role);
