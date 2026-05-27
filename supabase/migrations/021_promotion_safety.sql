-- ════════════════════════════════════════════════════════════════════════════
-- PROMOTION SAFETY — atomic import + promotion, pipeline closure
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Direct ticket link on pipeline_leads so we can find the ticket from a lead
--    and detect promotion without scanning hustad_tickets.
ALTER TABLE pipeline_leads
  ADD COLUMN IF NOT EXISTS promoted_ticket_id UUID REFERENCES hustad_tickets(id);

CREATE INDEX IF NOT EXISTS idx_pipeline_promoted
  ON pipeline_leads(promoted_ticket_id)
  WHERE promoted_ticket_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Atomic import — replace TOCTOU SELECT+INSERT with a single ON CONFLICT
--    statement.  Concurrent calls for the same cpc_ticket_id can never both
--    insert; the loser path updates the row and returns it.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION import_job_to_pipeline(
  p_cp_job_id      UUID,
  p_cpc_ticket_id  TEXT,
  p_original_status TEXT
) RETURNS JSONB AS $$
DECLARE
  v_lead pipeline_leads;
BEGIN
  INSERT INTO pipeline_leads (
    centerpoint_job_id,
    cpc_ticket_id,
    pipeline_status,
    imported_at,
    lead_notes
  ) VALUES (
    p_cp_job_id,
    p_cpc_ticket_id,
    'new_lead',
    now(),
    'Imported from CenterPoint Inbox. Original Status: ' || COALESCE(p_original_status, '')
  )
  ON CONFLICT (cpc_ticket_id) DO UPDATE SET
    centerpoint_job_id = EXCLUDED.centerpoint_job_id,
    lead_notes = CASE
      WHEN pipeline_leads.pipeline_status <> 'new_lead'
        THEN '(Re-imported) Update attempted from Inbox.'
      ELSE
        'Imported from CenterPoint Inbox. Original Status: ' || COALESCE(p_original_status, '')
    END
  RETURNING * INTO v_lead;

  -- Mark inbox as imported (idempotent)
  UPDATE centerpoint_jobs
  SET inbox_status = 'imported_to_pipeline'
  WHERE id = p_cp_job_id;

  RETURN to_jsonb(v_lead);
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Atomic promotion — INSERT ON CONFLICT DO NOTHING replaces the TOCTOU
--    SELECT+INSERT.  On conflict (already promoted) the RETURNING clause
--    returns no row, letting us detect and return the existing ticket gracefully.
--    Also closes the pipeline lead so write-backs stop firing for this job.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION promote_job_to_ticket(
  p_cp_job_id          TEXT,
  p_cp_job_name        TEXT,
  p_property_name      TEXT,
  p_property_address   TEXT,
  p_client_name        TEXT,
  p_client_email       TEXT,
  p_client_phone       TEXT,
  p_assigned_rep_name  TEXT,
  p_promoted_by        TEXT,
  p_price              NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_existing_id UUID;
  v_ticket      hustad_tickets;
BEGIN
  -- Single atomic insert; unique constraint on cp_job_id absorbs any race.
  INSERT INTO hustad_tickets (
    cp_job_id, cp_job_name, property_name, property_address,
    client_name, client_email, client_phone,
    assigned_rep_name, promoted_by, price, stage
  ) VALUES (
    p_cp_job_id,
    p_cp_job_name,
    p_property_name,
    COALESCE(p_property_address, ''),
    COALESCE(p_client_name,      ''),
    COALESCE(p_client_email,     ''),
    COALESCE(p_client_phone,     ''),
    COALESCE(p_assigned_rep_name,''),
    COALESCE(p_promoted_by,      ''),
    COALESCE(p_price,            0),
    'new'
  )
  ON CONFLICT (cp_job_id) DO NOTHING
  RETURNING * INTO v_ticket;

  -- If RETURNING came back empty the job was already promoted — return gracefully.
  IF v_ticket.id IS NULL THEN
    IF p_cp_job_id IS NOT NULL THEN
      SELECT id INTO v_existing_id FROM hustad_tickets WHERE cp_job_id = p_cp_job_id;
    END IF;
    RETURN jsonb_build_object(
      'error',     'This job has already been promoted',
      'ticket_id', v_existing_id
    );
  END IF;

  -- Stamp the CP job record
  IF p_cp_job_id IS NOT NULL THEN
    UPDATE centerpoint_jobs
    SET promoted_at       = now(),
        promoted_ticket_id = v_ticket.id
    WHERE cp_id = p_cp_job_id;
  END IF;

  -- Close the pipeline lead so no further write-backs fire for this job.
  -- pipeline_status = 'closed' is a BLOCKED_STATUS in the UI, preventing
  -- any further stage advances through the pipeline view.
  IF p_cp_job_id IS NOT NULL THEN
    UPDATE pipeline_leads
    SET pipeline_status    = 'closed',
        promoted_ticket_id = v_ticket.id
    WHERE cpc_ticket_id = p_cp_job_id
      AND pipeline_status NOT IN ('closed', 'dead_lead');
  END IF;

  RETURN to_jsonb(v_ticket);
END;
$$ LANGUAGE plpgsql;
