-- ════════════════════════════════════════════════════════════════════════════
-- ATOMIC PROMOTIONS AND LEAD LINK
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Add promoted_ticket_id foreign key column to pipeline_leads
ALTER TABLE pipeline_leads 
  ADD COLUMN IF NOT EXISTS promoted_ticket_id UUID REFERENCES hustad_tickets(id);

-- 2. Redefine import_job_to_pipeline to be fully atomic (no TOCTOU race)
CREATE OR REPLACE FUNCTION import_job_to_pipeline(
  p_cp_job_id UUID,
  p_cpc_ticket_id TEXT,
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
      WHEN pipeline_leads.pipeline_status <> 'new_lead' THEN '(Re-imported) Update attempted from Inbox.'
      ELSE '(Re-imported) Imported from CenterPoint Inbox. Original Status: ' || COALESCE(p_original_status, '')
    END
  RETURNING * INTO v_lead;

  UPDATE centerpoint_jobs
  SET inbox_status = 'imported_to_pipeline'
  WHERE id = p_cp_job_id;

  RETURN to_jsonb(v_lead);
END;
$$ LANGUAGE plpgsql;

-- 3. Redefine promote_job_to_ticket to be fully atomic (no TOCTOU race) and close pipeline leads on promotion
CREATE OR REPLACE FUNCTION promote_job_to_ticket(
  p_cp_job_id TEXT,
  p_cp_job_name TEXT,
  p_property_name TEXT,
  p_property_address TEXT,
  p_client_name TEXT,
  p_client_email TEXT,
  p_client_phone TEXT,
  p_assigned_rep_name TEXT,
  p_promoted_by TEXT,
  p_price NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_ticket hustad_tickets;
  v_existing_id UUID;
BEGIN
  -- Insert ticket atomically. If it already exists, DO NOTHING
  INSERT INTO hustad_tickets (
    cp_job_id,
    cp_job_name,
    property_name,
    property_address,
    client_name,
    client_email,
    client_phone,
    assigned_rep_name,
    promoted_by,
    price,
    stage
  ) VALUES (
    p_cp_job_id,
    p_cp_job_name,
    p_property_name,
    COALESCE(p_property_address, ''),
    COALESCE(p_client_name, ''),
    COALESCE(p_client_email, ''),
    COALESCE(p_client_phone, ''),
    COALESCE(p_assigned_rep_name, ''),
    COALESCE(p_promoted_by, ''),
    COALESCE(p_price, 0),
    'new'
  )
  ON CONFLICT (cp_job_id) DO NOTHING
  RETURNING * INTO v_ticket;

  -- If insert did not happen (v_ticket.id is null), fetch the existing ticket and return error
  IF v_ticket.id IS NULL THEN
    SELECT id INTO v_existing_id FROM hustad_tickets WHERE cp_job_id = p_cp_job_id;
    RETURN jsonb_build_object('error', 'This job has already been promoted', 'ticket_id', v_existing_id);
  END IF;

  -- Mark the CP job as promoted
  IF p_cp_job_id IS NOT NULL THEN
    UPDATE centerpoint_jobs
    SET promoted_at = now(), promoted_ticket_id = v_ticket.id
    WHERE cp_id = p_cp_job_id;
  END IF;

  -- Close the pipeline lead on promotion and link the ticket
  IF p_cp_job_name IS NOT NULL THEN
    UPDATE pipeline_leads
    SET pipeline_status = 'closed', promoted_ticket_id = v_ticket.id
    WHERE cpc_ticket_id = p_cp_job_name
      AND pipeline_status NOT IN ('closed', 'dead_lead');
  END IF;

  RETURN to_jsonb(v_ticket);
END;
$$ LANGUAGE plpgsql;
