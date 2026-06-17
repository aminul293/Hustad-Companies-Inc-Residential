-- Fix: pipeline_leads.assigned_rep_id was UUID but reps.id is TEXT (Azure AD OID).
-- Azure AD OIDs are not always standard UUID format, causing insert failures.
-- Safe cast: UUID values are valid TEXT; no data loss.
ALTER TABLE pipeline_leads ALTER COLUMN assigned_rep_id TYPE TEXT;
