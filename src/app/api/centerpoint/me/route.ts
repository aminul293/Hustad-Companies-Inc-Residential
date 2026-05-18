import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { CP_BASE, cpReadHeaders } from "@/lib/centerpoint/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const authPayload = await requireAuth(req);
    const email = authPayload.email;

    if (!email) {
      return NextResponse.json({ employeeId: "" });
    }

    const url = `${CP_BASE}/employees?filter[email]=${encodeURIComponent(email)}`;
    const res = await fetch(url, { headers: cpReadHeaders() });
    
    if (!res.ok) {
      throw new Error(`CenterPoint error ${res.status}`);
    }

    const json = await res.json();
    const data = json.data ?? [];
    
    if (data.length > 0 && data[0].id) {
      return NextResponse.json({ employeeId: String(data[0].id) });
    }

    return NextResponse.json({ employeeId: "" });
  } catch (error: any) {
    console.error("[CENTERPOINT_ME_API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
