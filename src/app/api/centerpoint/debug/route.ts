import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("centerpoint_jobs")
    .select("cp_id, name, property_name, status, display_status, cp_updated_at, synced_at")
    .order("property_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flag duplicates by property_name
  const byProp = new Map<string, any[]>();
  (data ?? []).forEach(r => {
    const key = r.property_name || r.name;
    const arr = byProp.get(key) ?? [];
    arr.push(r);
    byProp.set(key, arr);
  });

  const duplicates = Array.from(byProp.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([prop, rows]) => ({ property: prop, records: rows }));

  return NextResponse.json({ total: data?.length ?? 0, duplicates, all: data });
}
