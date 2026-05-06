import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";

const CP_BASE = "https://api.centerpointconnect.io/centerpoint";
const CP_KEY = process.env.CENTERPOINT_API_KEY!;

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await req.json();
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  // Push to CenterPoint
  const res = await fetch(`${CP_BASE}/services/${id}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: CP_KEY,
    },
    body: JSON.stringify({
      data: { type: "productions", id, attributes: { status } },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data }, { status: res.status });
  }

  // Mirror the status update in Supabase so the UI stays consistent
  const supabase = getServiceClient();
  await supabase
    .from("centerpoint_jobs")
    .update({
      status,
      display_status: data?.data?.attributes?.displayStatus ?? status,
      stage_transitioned_at: new Date().toISOString(),
      synced_at: new Date().toISOString(),
    })
    .eq("cp_id", id);

  return NextResponse.json(data);
}
