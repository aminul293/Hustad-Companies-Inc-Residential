import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { CP_BASE, cpJsonHeaders } from "@/lib/centerpoint/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(req);
  } catch (e: any) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  let cpHeaders;
  try {
    cpHeaders = cpJsonHeaders();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // Push to CenterPoint
  const res = await fetch(`${CP_BASE}/services/${id}`, {
    method: "PATCH",
    headers: cpHeaders,
    body: JSON.stringify({
      data: { type: "services", id, attributes: attrs },
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json({ error: data }, { status: res.status });
  }

  // Mirror the status update in Supabase so the UI stays consistent
  const supabase = getServiceClient();
  const { error: dbError } = await supabase
    .from("centerpoint_jobs")
    .update({
      status,
      display_status: data?.data?.attributes?.displayStatus ?? status,
      stage_transitioned_at: new Date().toISOString(),
      synced_at: new Date().toISOString(),
    })
    .eq("cp_id", id);

  if (dbError) {
    console.warn(`[PATCH_CP_JOB] Failed to mirror CP status back to centerpoint_jobs: ${dbError.message}`);
  }

  return NextResponse.json(data);
}
