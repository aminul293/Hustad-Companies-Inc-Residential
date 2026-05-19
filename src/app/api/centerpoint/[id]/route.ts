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

  const nowStr = new Date().toISOString();
  const attrs: Record<string, any> = { status };
  if (status === "completed") {
    attrs.completedAt = nowStr;
  } else if (status === "closed") {
    attrs.closedAt = nowStr;
    attrs.invoicedAt = nowStr;
  } else if (status === "started") {
    attrs.startedAt = nowStr;
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
      data: { type: "services", id, attributes: attrs },
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
