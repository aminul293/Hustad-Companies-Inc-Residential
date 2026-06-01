import { NextResponse, NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { CP_BASE, getCpToken, advanceWorkflowToTarget } from "@/lib/centerpoint/client";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CP_STAGE_ORDER = [
  "new_service","opened","scheduled","started","completed","closed",
];

function cpStatusAdvances(current: string | null | undefined, next: string): boolean {
  if (!current) return true;
  const curIdx = CP_STAGE_ORDER.indexOf(current);
  const nextIdx = CP_STAGE_ORDER.indexOf(next);
  if (curIdx === -1 || nextIdx === -1) return true;
  return nextIdx > curIdx;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
  } catch (e: any) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Validate API key early
  let cpKey: string;
  try {
    cpKey = getCpToken();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // 1. Claim pending items atomically using SELECT FOR UPDATE SKIP LOCKED via RPC
  const { data: queueItems, error: fetchError } = await supabase
    .rpc("claim_queue_items", { batch_size: 5 });

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!queueItems || queueItems.length === 0) {
    return NextResponse.json({ message: "No pending items in queue" });
  }

  const results: any[] = [];

  // ── Batch deduplication by target_id ─────────────────────────────────────────
  // If this batch contains multiple update_status items for the same CP job
  // (rapid stage changes or duplicate entries), keep only the highest-stage item
  // per target and immediately mark the rest as synced. This prevents two items
  // for the same job racing to write to CP — even across concurrent workers the
  // SKIP LOCKED claim means each row is owned by exactly one worker, so the
  // winner within each batch is always the only one that writes.
  const byTarget = new Map<string, any>();
  const supersededIds: string[] = [];

  for (const item of queueItems) {
    if (item.target_system !== "centerpoint" || item.action !== "update_status") continue;
    const prev = byTarget.get(item.target_id);
    if (!prev) {
      byTarget.set(item.target_id, item);
    } else {
      const prevIdx = CP_STAGE_ORDER.indexOf(prev.payload?.status ?? "");
      const curIdx  = CP_STAGE_ORDER.indexOf(item.payload?.status ?? "");
      if (curIdx >= prevIdx) {
        supersededIds.push(prev.id);
        byTarget.set(item.target_id, item);
      } else {
        supersededIds.push(item.id);
      }
    }
  }

  if (supersededIds.length > 0) {
    await supabase
      .from("outbound_queue")
      .update({ status: "synced", synced_at: new Date().toISOString() })
      .in("id", supersededIds);
    supersededIds.forEach(id =>
      results.push({ id, success: true, skipped: true, reason: "superseded by higher-stage item in batch" })
    );
  }

  // Items to actually process: winners from update_status dedup + any non-status items
  const toProcess = [
    ...Array.from(byTarget.values()),
    ...queueItems.filter((i: any) => i.target_system !== "centerpoint" || i.action !== "update_status"),
  ];

  for (const item of toProcess) {
    try {
      console.log(`[WORKER] Processing item ${item.id} for ${item.target_system}`);

      if (item.target_system === "centerpoint" && item.action === "update_status") {
        // Guard: skip if cached CP status is already at or beyond the queued status
        const { data: cached } = await supabase
          .from("centerpoint_jobs")
          .select("status")
          .eq("cp_id", item.target_id)
          .maybeSingle();

        if (!cpStatusAdvances(cached?.status, item.payload.status)) {
          await supabase
            .from("outbound_queue")
            .update({ status: "synced", synced_at: new Date().toISOString() })
            .eq("id", item.id);
          results.push({ id: item.id, success: true, skipped: true, reason: `CP already at ${cached?.status}` });
          continue;
        }

        let attrs: Record<string, any>;
        
        if (item.payload.attrs) {
          attrs = item.payload.attrs;
        } else {
          const nowStr = new Date().toISOString();
          attrs = { status: item.payload.status };
          if (item.payload.startedAt)   attrs.startedAt   = item.payload.startedAt;
          if (item.payload.completedAt) attrs.completedAt = item.payload.completedAt;
          if (item.payload.closedAt)    attrs.closedAt    = item.payload.closedAt;
          if (item.payload.invoicedAt)  attrs.invoicedAt  = item.payload.invoicedAt;

          // Auto-populate dates if not provided but status demands them
          if (attrs.status === "completed" && !attrs.completedAt) {
            attrs.completedAt = nowStr;
          }
          if (attrs.status === "closed" && !attrs.closedAt) {
            attrs.closedAt = nowStr;
            if (!attrs.invoicedAt) attrs.invoicedAt = nowStr;
          }
          if (attrs.status === "started" && !attrs.startedAt) {
            attrs.startedAt = nowStr;
          }
        }

        const res = await fetch(`${CP_BASE}/services/${item.target_id}`, {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: cpKey,
          },
          body: JSON.stringify({
            data: { type: "services", id: item.target_id, attributes: attrs },
          }),
        });

        if (!res.ok) {
          if (res.status === 404) {
            console.warn(`[WORKER] Target ID ${item.target_id} returned 404 from CenterPoint. Skipping further retries.`);
            await supabase
              .from("outbound_queue")
              .update({ 
                status: "synced", 
                synced_at: new Date().toISOString(),
                error: `Skipped: Resource does not exist on CenterPoint Connect (status: 404)`,
                retry_count: item.retry_count + 1 
              })
              .eq("id", item.id);
            results.push({ id: item.id, success: true, skipped: true, reason: "Resource not found (404)" });
            continue;
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(`CenterPoint API error: ${JSON.stringify(errData)}`);
        }

        // Update item as synced
        const { error: queueUpdateError } = await supabase
          .from("outbound_queue")
          .update({ 
            status: "synced", 
            synced_at: new Date().toISOString(),
            retry_count: item.retry_count + 1 
          })
          .eq("id", item.id);
        
        if (queueUpdateError) throw queueUpdateError;

        // Mirror success update in centerpoint_jobs cache (Medium 1)
        const { error: cacheUpdateError } = await supabase
          .from("centerpoint_jobs")
          .update({ 
            status: attrs.status, 
            synced_at: new Date().toISOString() 
          })
          .eq("cp_id", item.target_id);

        if (cacheUpdateError) {
          console.warn(`[WORKER] Synced queue item ${item.id} but failed to update local cache: ${cacheUpdateError.message}`);
        }
        
        // Auto-advance stages to match status
        try {
          await advanceWorkflowToTarget(item.target_id, attrs.status, cpKey);
        } catch (e: any) {
          console.warn(`[WORKER] Failed to auto-advance workflow stages for cp_id=${item.target_id}:`, e.message);
        }
        
        results.push({ id: item.id, success: true });
      }
    } catch (e: any) {
      console.error(`[WORKER] Failed to process ${item.id}:`, e.message);
      await supabase
        .from("outbound_queue")
        .update({ 
          status: item.retry_count >= 5 ? "failed" : "pending", 
          error: e.message,
          retry_count: item.retry_count + 1 
        })
        .eq("id", item.id);
      
      results.push({ id: item.id, success: false, error: e.message });
    }
  }

  return NextResponse.json({ results });
}

