-- ════════════════════════════════════════════════════════════════════════════
-- PRODUCTION HARDENING FIXES
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Update status check constraint on outbound_queue to include 'processing'
ALTER TABLE outbound_queue DROP CONSTRAINT IF EXISTS outbound_queue_status_check;
ALTER TABLE outbound_queue ADD CONSTRAINT outbound_queue_status_check
  CHECK (status IN ('pending', 'processing', 'synced', 'failed'));

-- 2. Add updated_at tracking to outbound_queue
ALTER TABLE outbound_queue ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS outbound_queue_updated_at ON outbound_queue;
CREATE TRIGGER outbound_queue_updated_at
  BEFORE UPDATE ON outbound_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Add unique constraint on hustad_tickets(cp_job_id) to prevent double promotion
ALTER TABLE hustad_tickets ADD CONSTRAINT uq_ht_cp_job_id UNIQUE (cp_job_id);

-- 4. Create missing indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_cp_jobs_inbox_status
  ON centerpoint_jobs(inbox_status)
  WHERE inbox_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_centerpoint_job
  ON pipeline_leads(centerpoint_job_id);

CREATE INDEX IF NOT EXISTS idx_oq_status_created
  ON outbound_queue(status, created_at ASC)
  WHERE status = 'pending';

-- 5. RPC to claim queue items using SELECT FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION claim_queue_items(batch_size INT DEFAULT 5)
RETURNS SETOF outbound_queue AS $$
DECLARE
  claimed_ids UUID[];
BEGIN
  SELECT array_agg(id) INTO claimed_ids
  FROM (
    SELECT id FROM outbound_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  ) t;

  IF claimed_ids IS NOT NULL THEN
    RETURN QUERY
    UPDATE outbound_queue
    SET status = 'processing', updated_at = now()
    WHERE id = ANY(claimed_ids)
    RETURNING *;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. RPC to atomically promote a CenterPoint job to a ticket
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
  v_existing_id UUID;
  v_ticket hustad_tickets;
BEGIN
  -- Guard: check if already promoted
  IF p_cp_job_id IS NOT NULL THEN
    SELECT id INTO v_existing_id FROM hustad_tickets WHERE cp_job_id = p_cp_job_id;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('error', 'This job has already been promoted', 'ticket_id', v_existing_id);
    END IF;
  END IF;

  -- Insert ticket atomically
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
  ) RETURNING * INTO v_ticket;

  -- Mark the CP job as promoted
  IF p_cp_job_id IS NOT NULL THEN
    UPDATE centerpoint_jobs
    SET promoted_at = now(), promoted_ticket_id = v_ticket.id
    WHERE cp_id = p_cp_job_id;
  END IF;

  RETURN to_jsonb(v_ticket);
END;
$$ LANGUAGE plpgsql;

-- 7. RPC to atomically import a CenterPoint job to the pipeline
CREATE OR REPLACE FUNCTION import_job_to_pipeline(
  p_cp_job_id UUID,
  p_cpc_ticket_id TEXT,
  p_original_status TEXT
) RETURNS JSONB AS $$
DECLARE
  v_existing_id UUID;
  v_pipeline_status TEXT;
  v_lead pipeline_leads;
  v_notes TEXT;
BEGIN
  -- Check for existing lead by cpc_ticket_id
  SELECT id, pipeline_status INTO v_existing_id, v_pipeline_status 
  FROM pipeline_leads 
  WHERE cpc_ticket_id = p_cpc_ticket_id;

  IF v_existing_id IS NOT NULL THEN
    IF v_pipeline_status <> 'new_lead' THEN
      v_notes := '(Re-imported) Update attempted from Inbox.';
    ELSE
      v_notes := 'Imported from CenterPoint Inbox. Original Status: ' || COALESCE(p_original_status, '');
    END IF;

    UPDATE pipeline_leads
    SET lead_notes = v_notes,
        centerpoint_job_id = p_cp_job_id
    WHERE id = v_existing_id
    RETURNING * INTO v_lead;
  ELSE
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
    ) RETURNING * INTO v_lead;
  END IF;

  -- Update centerpoint_jobs inbox_status to prevent re-import
  UPDATE centerpoint_jobs
  SET inbox_status = 'imported_to_pipeline'
  WHERE id = p_cp_job_id;

  RETURN to_jsonb(v_lead);
END;
$$ LANGUAGE plpgsql;
