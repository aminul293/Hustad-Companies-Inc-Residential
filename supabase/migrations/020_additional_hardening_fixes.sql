-- ════════════════════════════════════════════════════════════════════════════
-- ADDITIONAL SYNC HARDENING FIXES
-- ════════════════════════════════════════════════════════════════════════════

-- Upgrade the claim_queue_items RPC to handle:
-- 1. Automatic recovery of processing items stuck on worker crash (10 min timeout)
-- 2. Automatic purging of synced queue items older than 30 days
-- 3. Exponential backoff for retry pacing
CREATE OR REPLACE FUNCTION claim_queue_items(batch_size INT DEFAULT 5)
RETURNS SETOF outbound_queue AS $$
DECLARE
  claimed_ids UUID[];
BEGIN
  -- 1. Reset stale 'processing' items stuck on worker crash
  UPDATE outbound_queue
  SET status = 'pending', 
      error = COALESCE(error, '') || ' [Presumed worker crash (reset)]',
      updated_at = now()
  WHERE status = 'processing'
    AND updated_at < now() - INTERVAL '10 minutes';

  -- 2. Clean up synced queue items older than 30 days
  DELETE FROM outbound_queue 
  WHERE status = 'synced' 
    AND synced_at < now() - INTERVAL '30 days';

  -- 3. Lock new pending items using SELECT FOR UPDATE SKIP LOCKED with exponential backoff
  SELECT array_agg(id) INTO claimed_ids
  FROM (
    SELECT id FROM outbound_queue
    WHERE status = 'pending'
      AND (retry_count = 0 OR updated_at < now() - INTERVAL '1 minute' * POWER(2, retry_count))
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
