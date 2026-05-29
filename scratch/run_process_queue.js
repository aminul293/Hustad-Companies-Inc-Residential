require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const key = process.env.CENTERPOINT_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!key || !supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CP_STAGE_ORDER = [
  "new_service","opened","scheduled","started","completed","closed",
];

function cpStatusAdvances(current, next) {
  if (!current) return true;
  const curIdx = CP_STAGE_ORDER.indexOf(current);
  const nextIdx = CP_STAGE_ORDER.indexOf(next);
  if (curIdx === -1 || nextIdx === -1) return true;
  return nextIdx > curIdx;
}

async function run() {
  console.log("Claiming queue items via RPC...");
  const { data: queueItems, error: fetchError } = await supabase
    .rpc("claim_queue_items", { batch_size: 10 });

  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }
  if (!queueItems || queueItems.length === 0) {
    console.log("No pending items in queue");
    return;
  }

  console.log(`Claimed ${queueItems.length} items. Deduplicating...`);

  const byTarget = new Map();
  const supersededIds = [];

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
    console.log(`Superseding ${supersededIds.length} queue items...`);
    await supabase
      .from("outbound_queue")
      .update({ status: "synced", synced_at: new Date().toISOString() })
      .in("id", supersededIds);
  }

  const toProcess = [
    ...Array.from(byTarget.values()),
    ...queueItems.filter((i) => i.target_system !== "centerpoint" || i.action !== "update_status"),
  ];

  console.log(`Processing ${toProcess.length} winner items...`);

  for (const item of toProcess) {
    try {
      console.log(`[WORKER] Processing item ${item.id} (status: ${item.payload.status}) for ${item.target_id}`);

      const { data: cached } = await supabase
        .from("centerpoint_jobs")
        .select("status")
        .eq("cp_id", item.target_id)
        .maybeSingle();

      // We skip checking if status advances when forcing closing from the script
      let attrs = item.payload.attrs;
      if (!attrs) {
        const nowStr = new Date().toISOString();
        attrs = { status: item.payload.status };
        if (item.payload.startedAt)   attrs.startedAt   = item.payload.startedAt;
        if (item.payload.completedAt) attrs.completedAt = item.payload.completedAt;
        if (item.payload.closedAt)    attrs.closedAt    = item.payload.closedAt;
        if (item.payload.invoicedAt)  attrs.invoicedAt  = item.payload.invoicedAt;

        if (attrs.status === "completed" && !attrs.completedAt) attrs.completedAt = nowStr;
        if (attrs.status === "closed" && !attrs.closedAt) {
          attrs.closedAt = nowStr;
          if (!attrs.invoicedAt) attrs.invoicedAt = nowStr;
        }
        if (attrs.status === "started" && !attrs.startedAt) attrs.startedAt = nowStr;
      }

      console.log(`PATCHing CenterPoint Connect for ${item.target_id} with attrs:`, attrs);

      const res = await fetch(`${CP_BASE}/services/${item.target_id}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: key,
        },
        body: JSON.stringify({
          data: { type: "services", id: item.target_id, attributes: attrs },
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`CenterPoint API error: ${JSON.stringify(errData)}`);
      }

      console.log(`PATCH successful for ${item.target_id}. Updating DB logs...`);

      // Update item as synced
      await supabase
        .from("outbound_queue")
        .update({ 
          status: "synced", 
          synced_at: new Date().toISOString(),
          retry_count: item.retry_count + 1 
        })
        .eq("id", item.id);

      // Mirror success update in centerpoint_jobs cache
      await supabase
        .from("centerpoint_jobs")
        .update({ 
          status: attrs.status, 
          synced_at: new Date().toISOString() 
        })
        .eq("cp_id", item.target_id);

      console.log(`Sync complete for ${item.target_id}`);

    } catch (e) {
      console.error(`[WORKER] Failed to process ${item.id}:`, e.message);
      await supabase
        .from("outbound_queue")
        .update({ 
          status: item.retry_count >= 5 ? "failed" : "pending", 
          error: e.message,
          retry_count: item.retry_count + 1 
        })
        .eq("id", item.id);
    }
  }
}

run().catch(console.error);
