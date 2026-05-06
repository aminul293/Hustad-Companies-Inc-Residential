import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = getServiceClient();
  const { data, error, count } = await supabase
    .from("centerpoint_jobs")
    .select("id, cp_id, name, property_name, status, display_status, cp_updated_at, synced_at", { count: "exact" })
    .order("cp_updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Find duplicates by cp_id
  const byCpId = new Map<string, any[]>();
  const byName = new Map<string, any[]>();
  (data ?? []).forEach(r => {
    const c = byCpId.get(r.cp_id) ?? []; c.push(r); byCpId.set(r.cp_id, c);
    const n = byName.get(r.name) ?? []; n.push(r); byName.set(r.name, n);
  });

  const dupsByCpId = Array.from(byCpId.entries()).filter(([, rows]) => rows.length > 1).map(([id, rows]) => ({ cp_id: id, records: rows }));
  const dupsByName = Array.from(byName.entries()).filter(([, rows]) => rows.length > 1).map(([name, rows]) => ({ name, records: rows }));

  return NextResponse.json({ total: data?.length ?? 0, dbCount: count, dupsByCpId, dupsByName, all: data });
}
