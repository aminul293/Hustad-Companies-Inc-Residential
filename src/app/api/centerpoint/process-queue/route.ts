import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = getServiceClient();

  // 1. Get pending items
  const { data: queueItems, error: fetchError } = await supabase
    .from("outbound_queue")
    .select("*")
    .eq("status", "pending")
    .limit(5);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!queueItems || queueItems.length === 0) {
    return NextResponse.json({ message: "No pending items in queue" });
  }

  const results = [];

  for (const item of queueItems) {
    try {
      console.log(`[WORKER] Processing item ${item.id} for ${item.target_system}`);

      if (item.target_system === "centerpoint" && item.action === "update_status") {
        // Call the CenterPoint PATCH route
        // In a real production environment, this would hit the CP API directly or use an internal function
        const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
        const CP_KEY = process.env.CENTERPOINT_API_KEY;

        const res = await fetch(`${CP_BASE}/services/${item.target_id}`, {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: CP_KEY!,
          },
          body: JSON.stringify({
            data: { type: "productions", id: item.target_id, attributes: { status: item.payload.status } },
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(`CenterPoint API error: ${JSON.stringify(errData)}`);
        }

        // Update item as synced
        await supabase
          .from("outbound_queue")
          .update({ 
            status: "synced", 
            synced_at: new Date().toISOString(),
            retry_count: item.retry_count + 1 
          })
          .eq("id", item.id);
        
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
