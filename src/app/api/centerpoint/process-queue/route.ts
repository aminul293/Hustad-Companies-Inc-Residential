import { NextResponse, NextRequest } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { CP_BASE, getCpToken } from "@/lib/centerpoint/client";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

  const results = [];

  for (const item of queueItems) {
    try {
      console.log(`[WORKER] Processing item ${item.id} for ${item.target_system}`);

      if (item.target_system === "centerpoint" && item.action === "update_status") {
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

